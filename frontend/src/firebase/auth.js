import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GithubAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  confirmPasswordReset,
  linkWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  verifyPasswordResetCode,
  updateProfile
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from './firebaseConfig';

const providers = {
  facebook: new FacebookAuthProvider(),
  google: new GoogleAuthProvider(),
  microsoft: new OAuthProvider('microsoft.com'),
  github: new GithubAuthProvider()
};

providers.facebook.addScope('email');
providers.google.setCustomParameters({ prompt: 'select_account' });
providers.microsoft.setCustomParameters({
  prompt: 'select_account',
  tenant: 'common'
});
providers.github.addScope('read:user');
providers.github.addScope('user:email');

function requireFirebaseAuth() {
  if (!isFirebaseConfigured || !firebaseAuth) {
    throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* values from frontend/.env.example.');
  }
  return firebaseAuth;
}

export async function initializeFirebasePersistence() {
  const auth = requireFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}

export function subscribeToFirebaseAuth(callback, onError) {
  const auth = requireFirebaseAuth();
  return auth.onIdTokenChanged(callback, onError);
}

export function getFirebaseRedirectResult() {
  return getRedirectResult(requireFirebaseAuth());
}

export async function firebaseSignIn(email, password) {
  const auth = await initializeFirebasePersistence();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function firebaseSignUp(name, email, password) {
  const auth = await initializeFirebasePersistence();
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const displayName = name.trim();
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  return result;
}

export async function firebaseSocialSignIn(providerName) {
  const auth = await initializeFirebasePersistence();
  const provider = providers[providerName];
  if (!provider) {
    throw new Error('Unsupported sign-in provider');
  }
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(error.code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function firebaseLinkProviderWithPassword(providerName, email, password, signInError) {
  const expectedEmail = signInError?.customData?.email;
  if (typeof expectedEmail === 'string' && expectedEmail.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error(`The ${providerName} account email does not match the email in the sign-in form.`);
  }

  const providerClass = {
    facebook: FacebookAuthProvider,
    github: GithubAuthProvider
  }[providerName];
  const pendingCredential = providerClass?.credentialFromError(signInError);
  if (!pendingCredential) {
    throw new Error(`Unable to continue ${providerName} account linking. Please try sign-in again.`);
  }

  const auth = await initializeFirebasePersistence();
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  const result = await linkWithCredential(user, pendingCredential);
  await result.user.getIdToken(true);
  return result.user;
}

export async function firebaseLinkGithubWithPassword(email, password, signInError) {
  return firebaseLinkProviderWithPassword('github', email, password, signInError);
}

export async function firebasePasswordReset(email) {
  const auth = await initializeFirebasePersistence();
  const configuredContinueUrl = import.meta.env.VITE_AUTH_CONTINUE_URL;
  const continueUrl = configuredContinueUrl
    || (window.location.protocol === 'http:' || window.location.protocol === 'https:'
      ? window.location.origin
      : 'http://localhost:5173');
  return sendPasswordResetEmail(auth, email.trim(), {
    url: continueUrl,
    handleCodeInApp: false
  });
}

export async function firebaseVerifyPasswordResetCode(code) {
  return verifyPasswordResetCode(requireFirebaseAuth(), code);
}

export async function firebaseConfirmPasswordReset(code, newPassword) {
  return confirmPasswordReset(requireFirebaseAuth(), code, newPassword);
}

export async function firebaseSignOut() {
  return signOut(requireFirebaseAuth());
}

export function getProviderName(user) {
  const providerId = user?.providerData?.find((provider) => provider.providerId !== 'firebase')?.providerId
    || user?.providerData?.[0]?.providerId
    || 'password';
  return providerId;
}

export function getFirebaseAuthError(error, providerName) {
  const code = error?.code;
  const message = String(error?.message || '');
  const providerLabels = {
    facebook: 'Facebook',
    google: 'Google',
    github: 'GitHub',
    microsoft: 'Microsoft'
  };
  const providerLabel = providerLabels[providerName] || 'OAuth';
  if (providerName === 'facebook' && (code === 'auth/operation-not-allowed'
    || code === 'auth/invalid-oauth-client-id'
    || message.includes('facebook.com'))) {
    return 'Facebook sign-in is not fully configured in Firebase. Enable Facebook in Authentication → Sign-in method, add the Meta App ID and App Secret, configure the Firebase OAuth redirect URI in Meta, authorize localhost and your app domain, and save.';
  }
  if (code === 'auth/configuration-not-found') {
    return 'Firebase Authentication is not enabled for this project yet. In Firebase Console, open Authentication, click Get started, enable the sign-in provider you are using under Sign-in method, save, then reload the app.';
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/app-not-authorized') {
    return 'Firebase rejected this web app configuration. Check that the API key and app ID in frontend/.env are copied from the Web app registered in this same Firebase project, then restart Vite.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    if (['facebook', 'github'].includes(providerName)) {
      return `An account already exists for this email. Enter its email and password above, then try ${providerLabel} again to link it.`;
    }
    return 'An account already exists for this email with a different sign-in method. Sign in with that method first; accounts are not automatically linked.';
  }
  if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
    return 'This account is already registered. Sign in using its existing method.';
  }
  if (code === 'auth/popup-closed-by-user') return 'Sign-in was canceled before it finished.';
  if (code === 'auth/popup-blocked') return 'Your browser blocked the sign-in popup. Allow popups and try again.';
  if (code === 'auth/unauthorized-domain') return 'This domain is not authorized in Firebase Authentication settings.';
  if (code === 'auth/operation-not-allowed') return `${providerLabel} sign-in is not enabled in Firebase Console.`;
  if (code === 'auth/invalid-oauth-provider') return `${providerLabel} sign-in is not configured correctly in Firebase Console.`;
  if (code === 'auth/invalid-oauth-client-id') return `The ${providerLabel} OAuth client ID configured in Firebase Console is invalid.`;
  if (code === 'auth/invalid-tenant-id') return 'The Microsoft tenant ID configured in Firebase Console is invalid.';
  if (code === 'auth/missing-or-invalid-nonce') return `${providerLabel} sign-in returned an invalid authentication response. Retry sign-in and ensure popups are allowed.`;
  if (code === 'auth/network-request-failed') return 'Network error. Check your internet connection and try again.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'The email or password is incorrect.';
  }
  if (code === 'auth/weak-password') return 'Choose a stronger password with at least 10 characters.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  return error?.message || 'Authentication failed. Please try again.';
}
