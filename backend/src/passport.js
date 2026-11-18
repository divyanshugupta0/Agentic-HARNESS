const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;

function userFromProfile(provider, profile) {
  const emailRecord = profile.emails?.find((entry) => entry.verified) || profile.emails?.[0];
  return {
    id: `${provider}:${profile.id}`,
    provider,
    name: profile.displayName || profile.username || 'User',
    email: emailRecord?.value || null,
    avatar: profile.photos?.[0]?.value || null
  };
}

function configurePassport(passport, config, users) {
  if (!users) {
    throw new Error('A user repository is required');
  }

  if (config.google.enabled !== false && config.google.clientID && config.google.clientSecret) {
    passport.use(new GoogleStrategy(
      { ...config.google, state: true },
      (_accessToken, _refreshToken, profile, done) => {
        users.upsertProviderUser('google', userFromProfile('google', profile))
          .then((user) => done(null, user), done);
      }
    ));
  }

  if (config.github.enabled !== false && config.github.clientID && config.github.clientSecret) {
    passport.use(new GitHubStrategy(
      { ...config.github, scope: ['user:email'], state: true },
      (_accessToken, _refreshToken, profile, done) => {
        users.upsertProviderUser('github', userFromProfile('github', profile))
          .then((user) => done(null, user), done);
      }
    ));
  }

  if (config.microsoft.enabled !== false
    && config.microsoft.clientID
    && config.microsoft.clientSecret) {
    passport.use(new MicrosoftStrategy(
      {
        clientID: config.microsoft.clientID,
        clientSecret: config.microsoft.clientSecret,
        callbackURL: config.microsoft.callbackURL,
        tenant: config.microsoft.tenant,
        scope: ['user.read'],
        addUPNAsEmail: true,
        state: true
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value
          || profile._json?.mail
          || profile._json?.userPrincipalName
          || null;
        users.upsertProviderUser('microsoft', {
          id: profile.id,
          name: profile.displayName || profile._json?.displayName || 'User',
          email,
          avatar: profile.photos?.[0]?.value || null
        }).then((user) => done(null, user), done);
      }
    ));
  }

  passport.serializeUser((user, done) => {
    done(null, {
      id: user.id,
      provider: user.provider,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    });
  });

  passport.deserializeUser((user, done) => {
    if (!user || typeof user.id !== 'string'
      || !['password', 'google', 'github', 'microsoft'].includes(user.provider)) {
      return done(new Error('Invalid authenticated user in session'));
    }
    return done(null, user);
  });
}

module.exports = { configurePassport, userFromProfile };
