# Firebase Authentication Setup

The web and Electron apps use Firebase Authentication for email/password and
social sign-in. Configure providers in Firebase Console; never put OAuth client
secrets in frontend environment files or source code.

## Apple sign-in

Enable the Apple provider in **Firebase Console → Authentication → Sign-in
method**. In the Apple Developer portal, create a Services ID and configure the
Firebase callback URL as a return URL. Add the Apple team ID, Services ID
(client ID), and private key in Firebase Console, then ensure the app's web
domain is authorized under Firebase Authentication settings.

For local testing, also add `localhost` under **Authentication → Settings →
Authorized domains**. After changing Firebase provider settings, restart Vite
so the frontend reloads the provider configuration.

## Local configuration

Copy `frontend/.env.example` to `frontend/.env` and set the Firebase web app's
public configuration values. Start the Firebase profile backend using
`backend/.env.example` as a reference. The backend verifies Firebase ID tokens.
