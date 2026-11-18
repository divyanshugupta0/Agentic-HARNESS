const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function createProfileDatabase(databasePath = path.resolve(__dirname, '..', 'database', 'app.db')) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firebase_uid TEXT UNIQUE NOT NULL,
      full_name TEXT,
      email TEXT UNIQUE NOT NULL,
      profile_picture TEXT,
      auth_provider TEXT,
      email_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const selectByUid = database.prepare('SELECT * FROM users WHERE firebase_uid = ?');
  const upsertUser = database.prepare(`
    INSERT INTO users (firebase_uid, full_name, email, profile_picture, auth_provider, email_verified)
    VALUES (@firebase_uid, @full_name, @email, @profile_picture, @auth_provider, @email_verified)
    ON CONFLICT(firebase_uid) DO UPDATE SET
      full_name = COALESCE(excluded.full_name, users.full_name),
      email = excluded.email,
      profile_picture = COALESCE(excluded.profile_picture, users.profile_picture),
      auth_provider = excluded.auth_provider,
      email_verified = excluded.email_verified,
      updated_at = CURRENT_TIMESTAMP
  `);

  return {
    close: () => database.close(),
    findByUid: (uid) => selectByUid.get(uid),
    syncUser(profile) {
      const transaction = database.transaction((user) => {
        upsertUser.run(user);
        return selectByUid.get(user.firebase_uid);
      });
      return transaction(profile);
    },
    updateProfile(uid, { fullName, profilePicture }) {
      const update = database.prepare(`
        UPDATE users
        SET full_name = ?, profile_picture = ?, updated_at = CURRENT_TIMESTAMP
        WHERE firebase_uid = ?
      `);
      update.run(fullName, profilePicture, uid);
      return selectByUid.get(uid);
    }
  };
}

module.exports = { createProfileDatabase };
