const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const passport = require('passport');
const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { createDesktopAuthStore } = require('./desktopAuth');
const { configurePassport } = require('./passport');
const { SQLiteSessionStore } = require('./sqliteSessionStore');
const { createUserRepository } = require('./users');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const config = loadConfig();

async function start() {
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  const database = new Database(config.databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  const users = createUserRepository(database);
  const desktopAuth = createDesktopAuthStore(database);
  await users.initialize();
  await desktopAuth.initialize();
  configurePassport(passport, config, users);
  const sessionStore = new SQLiteSessionStore(database);
  const app = createApp({ config, passport, sessionStore, users, desktopAuth });

  const server = app.listen(config.port, () => {
    console.log(`Authentication service listening on port ${config.port}`);
  });
  const shutdown = () => {
    server.close(async () => {
      database.close();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return database;
}

start().catch((error) => {
  console.error('Authentication service failed to start:', error);
  process.exitCode = 1;
});
