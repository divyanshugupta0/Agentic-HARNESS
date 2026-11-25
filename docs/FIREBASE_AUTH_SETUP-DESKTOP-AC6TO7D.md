# Firebase Authentication Setup

The web and Electron apps use Firebase Authentication for email/password and
social sign-in. Configure providers in Firebase Console; never put OAuth client
secrets in frontend environment files or source code.

## Facebook sign-in

In **Meta for Developers**, create an app and add the Facebook Login use case.
In the app's Facebook Login settings, add Firebase's OAuth redirect URI as a
valid OAuth redirect URI. Copy the Meta App ID and App Secret into
**Firebase Console → Authentication → Sign-in method → Facebook** and enable
the provider. Do not put the App Secret in frontend environment files or source
code.

For local testing, add `localhost` under **Authentication → Settings →
Authorized domains**. Add the app's production domain when deploying. After
changing Firebase provider settings, restart Vite and test Facebook sign-in.

## Local configuration

Copy `frontend/.env.example` to `frontend/.env` and set the Firebase web app's
public configuration values. Start the Firebase profile backend using
`backend/.env.example` as a reference. The backend verifies Firebase ID tokens.
