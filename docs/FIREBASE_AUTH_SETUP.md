# Firebase authentication and SQLite profiles

The browser frontend and Electron desktop app use Firebase Authentication for identity and credentials. Firebase manages password hashing and salting; the app does not generate or store password hashes. After Firebase confirms a sign-in, the browser frontend sends its Firebase ID token to the Express API, while Electron sends it through a narrow IPC bridge. The API verifies the token with Firebase Admin SDK and synchronizes the verified profile to `backend/database/app.db`. Electron only enables its agent and filesystem IPC after this server-side verification. Passwords and Admin credentials are never stored in the application database or frontend.

The older Passport/MongoDB routes remain available for compatibility but are not used by the current Electron sign-in flow.

## 1. Firebase project configuration

1. Create or select a project in the [Firebase Console](https://console.firebase.google.com/).
2. In **Project settings → General → Your apps**, register a Web app and copy its Firebase web configuration into `frontend/.env` using `frontend/.env.example`.
3. In **Authentication → Sign-in method**, enable **Email/Password**, **Google**, **Microsoft**, and **GitHub** as desired.
4. In **Authentication → Settings → Authorized domains**, add the exact hostnames used by the app. Add `localhost` for local development and your production hostname when deploying.
5. In **Authentication → Templates → Password reset**, set the email action URL to the app's reset page: `http://localhost:5173/reset-password` for local development, and the HTTPS reset page URL for production. This app's reset page validates the `mode` and `oobCode` parameters Firebase adds to that link. Add the action URL's hostname to Authorized domains.
6. Enable email enumeration protection in Firebase Authentication / Identity Platform. The app always shows a generic reset-request response, but this Firebase setting is also required to prevent account-existence disclosure through the Identity Toolkit API.
7. In **Authentication → Settings → Password policy**, configure and enforce a minimum of 8 characters, uppercase, lowercase, numeric, and non-alphanumeric characters. The frontend gives immediate feedback; Firebase must enforce the same policy server-side.
8. For Google, Microsoft, and GitHub, create the corresponding OAuth application with that provider and use its client ID and client secret in the provider's Firebase configuration. Do not put provider client secrets in frontend environment variables.
9. Use Firebase's displayed OAuth redirect/callback URL (usually `https://<project-id>.firebaseapp.com/__/auth/handler`) as the provider's authorized redirect URI. Configure the provider's client ID and secret in Firebase Console, not in this app's browser code. For Microsoft, register a Web platform redirect URI; for GitHub, set the callback URL in the OAuth App. Follow the callback URL shown by Firebase if the Firebase project's auth domain differs from the default.

The Firebase SDK uses popup authentication. If a browser blocks or does not support a popup, the SDK falls back to redirect authentication.

## 2. Frontend environment

Create `frontend/.env` and set the Firebase web app configuration below. The same values are bundled into the Electron renderer during its frontend build:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_USER_API_URL=http://localhost:3001
VITE_AUTH_CONTINUE_URL=http://localhost:5173/
```

These are Firebase web-app configuration values, not Admin credentials. Set `VITE_AUTH_CONTINUE_URL` to the app's allowed HTTPS origin in production. For local development, use `http://localhost:5173/`. Restart Vite after changing them. The Electron main process uses `http://localhost:3001` for the profile API by default; set `USER_API_URL` in the Electron process environment when the API runs elsewhere.

## 3. Backend environment and Admin SDK

Create `backend/.env` from `backend/.env.example`. For the Firebase profile API used by both web and desktop, set `PORT=3001`, `FRONTEND_URL=http://localhost:5173`, and `FIREBASE_ADMIN_PROJECT_ID`. This API does not require MongoDB or a session secret. Only the legacy Passport service started with `npm run auth:dev` requires `MONGODB_URI` and `SESSION_SECRET`.

Configure Firebase Admin using one of:

- Application Default Credentials, with `FIREBASE_ADMIN_PROJECT_ID` set and `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON file kept outside source control; or
- `FIREBASE_ADMIN_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON`, containing the full service-account JSON. Keep this secret only in the backend environment.

Use the Firebase project ID that matches the frontend project. The server verifies ID tokens with Firebase Admin before reading or writing user profiles. The SQLite schema is created automatically at `backend/database/app.db` on server startup; the database file is git-ignored.

## 4. Run and verify locally

1. Install frontend and backend packages: `npm --prefix frontend install` and `npm --prefix backend install`.
2. Start the SQLite-only Firebase profile API using `npm run auth:sqlite`. This starts the Firebase token verification and SQLite profile endpoints; it does not require MongoDB. Configure `FIREBASE_ADMIN_PROJECT_ID` in `backend/.env` first.
3. Start the desktop app in another terminal using `npm run dev`, or start the browser frontend using `npm run frontend:dev`.
4. Register or sign in with email/password or an enabled provider. Firebase manages the credentials and returns an ID token. The backend verifies the token before saving the profile, and Electron keeps its verified session in main-process memory until the ID token expires.
5. Test password reset, sign out, restart the desktop app, and sign in again. Firebase restores its local auth state and Electron verifies the current ID token with the backend before enabling desktop features; refreshed tokens are reverified.
6. Requests to `/api/auth/me` and `/api/users/profile` require `Authorization: Bearer <Firebase ID token>`. Requests without a valid token are rejected. Electron's agent and filesystem IPC handlers also reject calls before backend token verification.

The forgot-password form deliberately returns the same confirmation for registered and unregistered addresses. The reset page verifies Firebase's `oobCode`, enforces the password policy, and removes action parameters from the browser address bar after reading them. Passwords and reset codes are held only in page memory and sent directly to Firebase over HTTPS; they are not sent to the profile API, logged, or stored in SQLite/localStorage.

The SQLite-only API needs `FIREBASE_ADMIN_PROJECT_ID` set to the Firebase project ID to verify ID tokens. A service-account key is not required for token verification or profile sync: the API verifies the signed Firebase ID token and stores the trusted identity claims in SQLite. The SQLite database defaults to `backend/database/app.db`; set `FIREBASE_PROFILE_DB_PATH` to choose another local path.

To inspect the local profile database, use a SQLite viewer or the `sqlite3` command-line tool. Do not use database contents as a substitute for Firebase authentication.

## API endpoints

- `POST /api/auth/sync-user` — verify token, then insert or update the SQLite profile.
- `GET /api/auth/me` — return the authenticated user's synchronized profile.
- `POST /api/auth/logout` — protected server-side logout endpoint (the client also signs out through Firebase).
- `GET /api/users/profile` — return the profile.
- `PUT /api/users/profile` — update the profile's full name and picture URL.
