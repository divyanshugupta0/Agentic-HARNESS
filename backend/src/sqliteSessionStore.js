const session = require('express-session');

class SQLiteSessionStore extends session.Store {
  constructor(database, { ttlSeconds = 8 * 60 * 60 } = {}) {
    super();
    if (!database) {
      throw new Error('A SQLite database is required');
    }
    this.database = database;
    this.ttlSeconds = ttlSeconds;
    database.exec(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS auth_sessions_expires_at ON auth_sessions (expires_at);
    `);
    this.getStatement = database.prepare(
      'SELECT sess, expires_at FROM auth_sessions WHERE sid = ?'
    );
    this.setStatement = database.prepare(`
      INSERT INTO auth_sessions (sid, sess, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires_at = excluded.expires_at
    `);
    this.destroyStatement = database.prepare('DELETE FROM auth_sessions WHERE sid = ?');
    this.touchStatement = database.prepare(
      'UPDATE auth_sessions SET expires_at = ? WHERE sid = ?'
    );
    this.clearExpiredStatement = database.prepare(
      'DELETE FROM auth_sessions WHERE expires_at <= ?'
    );
  }

  get(sid, callback) {
    try {
      const row = this.getStatement.get(sid);
      if (!row || row.expires_at <= Date.now()) {
        if (row) this.destroyStatement.run(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.sess));
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + this.ttlSeconds * 1000;
      this.setStatement.run(sid, JSON.stringify(sessionData), expiresAt);
      this.clearExpiredStatement.run(Date.now());
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }

  touch(sid, sessionData, callback) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + this.ttlSeconds * 1000;
      this.touchStatement.run(expiresAt, sid);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }

  destroy(sid, callback) {
    try {
      this.destroyStatement.run(sid);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }
}

module.exports = { SQLiteSessionStore };
