export function mapFirebaseUser(firebaseUser, profile, signedInProviderId) {
  const providerProfile = firebaseUser.providerData?.find(
    (provider) => provider.providerId !== 'firebase'
  );
  const email = firebaseUser.email || providerProfile?.email || profile?.email || '';
  const providerId = signedInProviderId
    || providerProfile?.providerId
    || firebaseUser.providerData?.[0]?.providerId
    || profile?.authProvider
    || 'password';

  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName
      || providerProfile?.displayName
      || profile?.fullName
      || email.split('@')[0]
      || 'User',
    email,
    avatar: firebaseUser.photoURL
      || providerProfile?.photoURL
      || profile?.profilePicture
      || null,
    role: providerId,
    authProvider: providerId,
    createdAt: profile?.createdAt || null,
    emailVerified: profile?.emailVerified ?? firebaseUser.emailVerified,
    isAuthenticated: true
  };
}
