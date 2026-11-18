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

function createUserRepository(collection) {
  return {
    async initialize() {
      await collection.createIndex({ provider: 1, providerId: 1 }, { unique: true });
      await collection.createIndex(
        { email: 1 },
        { unique: true, partialFilterExpression: { provider: 'password' } }
      );
    },

    async createPasswordUser({ name, email, password }) {
      const user = {
        id: randomUUID(),
        provider: 'password',
        providerId: email,
        name,
        email,
        avatar: null,
        passwordHash: await hashPassword(password),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await collection.insertOne(user);
      return publicUser(user);
    },

    async findPasswordUser(email) {
      return collection.findOne({ provider: 'password', email });
    },

    async upsertProviderUser(provider, profile) {
      const now = new Date();
      const user = await collection.findOneAndUpdate(
        { provider, providerId: String(profile.id) },
        {
          $set: {
            name: profile.name,
            email: profile.email || null,
            avatar: profile.avatar || null,
            updatedAt: now
          },
          $setOnInsert: {
            id: randomUUID(),
            provider,
            providerId: String(profile.id),
            createdAt: now
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
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
