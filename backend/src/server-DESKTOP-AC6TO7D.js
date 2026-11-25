const path = require('node:path');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo');
const { MongoClient } = require('mongodb');
const passport = require('passport');
const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { createDesktopAuthStore } = require('./desktopAuth');
const { configurePassport } = require('./passport');
const { createUserRepository } = require('./users');
const { createFirebaseAdmin } = require('./firebaseAdmin');
const { createProfileDatabase } = require('./profileDatabase');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const config = loadConfig();
const mongoClient = new MongoClient(config.mongoUri);
const firebaseAdmin = createFirebaseAdmin();
const profileDatabase = createProfileDatabase();

async function start() {
  await mongoClient.connect();
  const database = mongoClient.db();
  const users = createUserRepository(database.collection('users'));
  const desktopAuth = createDesktopAuthStore(database.collection('desktop_auth_handoffs'));
  await users.initialize();
  await database.collection('desktop_auth_handoffs').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  );
  configurePassport(passport, config, users);
  const sessionStore = MongoStore.create({
    clientPromise: Promise.resolve(mongoClient),
    dbName: database.databaseName,
    collectionName: 'sessions',
    ttl: 8 * 60 * 60
  });
  const app = createApp({
    config,
    passport,
    sessionStore,
    users,
    desktopAuth,
    firebaseAdmin,
    profileDatabase
  });

  const server = app.listen(config.port, () => {
    console.log(`Authentication service listening on port ${config.port}`);
  });
  const shutdown = async () => {
    server.close(async () => {
      await mongoClient.close();
      profileDatabase.close();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error('Authentication service failed to start:', error);
  await mongoClient.close();
  profileDatabase.close();
  process.exitCode = 1;
});
