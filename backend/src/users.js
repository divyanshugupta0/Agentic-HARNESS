const {
  randomBytes,
  randomUUID,
  scrypt: scryptCallback,
  timingSafeEqual
} = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

function publicUser(user) {
  return {
    id: user.id,
    provider: user.provider,
    name: user.name,
    email: user.email || null,
    avatar: user.avatar || null
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, passwordHash) {
  const [saltHex, keyHex] = passwordHash.split(':');
  if (!/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{128}$/i.test(keyHex)) {
    throw new Error('Stored password hash has an invalid format');
  }
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), PASSWORD_KEY_LENGTH);
  return timingSafeEqual(expected, actual);
}

function createUserRepository(database) {
  if (!database) {
    throw new Error('A SQLite database is required');
  }

  return {
    async initialize() {
      database.exec(`
        CREATE TABLE IF NOT EXISTS auth_users (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL CHECK (provider IN ('password', 'google', 'github', 'microsoft')),
          provider_id TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          avatar TEXT,
          password_hash TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (provider, provider_id)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS auth_password_users_email_unique
          ON auth_users (email) WHERE provider = 'password';
      `);
    },

    async createPasswordUser({ name, email, password }) {
      const id = randomUUID();
      const passwordHash = await hashPassword(password);
      try {
        database.prepare(`
          INSERT INTO auth_users (id, provider, provider_id, name, email, password_hash)
          VALUES (?, 'password', ?, ?, ?, ?)
        `).run(id, email, name, email, passwordHash);
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE'
          && error.message.includes('auth_users.email')) {
          const duplicateError = new Error('An account with that email already exists');
          duplicateError.code = 'USER_EMAIL_TAKEN';
          throw duplicateError;
        }
        throw error;
      }
      return publicUser({ id, provider: 'password', name, email, avatar: null });
    },

    async findPasswordUser(email) {
      const user = database.prepare(`
        SELECT id, provider, provider_id, name, email, avatar, password_hash
        FROM auth_users WHERE provider = 'password' AND email = ?
      `).get(email);
      if (!user) return null;
      return {
        id: user.id,
        provider: user.provider,
        providerId: user.provider_id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        passwordHash: user.password_hash
      };
    },

    async upsertProviderUser(provider, profile) {
      if (!['google', 'github', 'microsoft'].includes(provider)) {
        throw new Error('Unsupported social sign-in provider');
      }
      const providerId = String(profile.id);
      const id = randomUUID();
      const upsert = database.prepare(`
        INSERT INTO auth_users (id, provider, provider_id, name, email, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, provider_id) DO UPDATE SET
          name = excluded.name,
          email = COALESCE(excluded.email, auth_users.email),
          avatar = COALESCE(excluded.avatar, auth_users.avatar),
          updated_at = CURRENT_TIMESTAMP
      `);
      upsert.run(id, provider, providerId, profile.name, profile.email || null, profile.avatar || null);
      const user = database.prepare(`
        SELECT id, provider, name, email, avatar
        FROM auth_users WHERE provider = ? AND provider_id = ?
      `).get(provider, providerId);
      if (!user) {
        throw new Error('Could not create or retrieve the social account');
      }
      return publicUser(user);
    }
  };
}

module.exports = {
  createUserRepository,
  hashPassword,
  publicUser,
  verifyPassword
};
