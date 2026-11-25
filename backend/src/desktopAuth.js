const { createHash, randomBytes } = require('node:crypto');

function hashTicket(ticket) {
  return createHash('sha256').update(ticket).digest('hex');
}

function createDesktopAuthStore(database) {
  if (!database) {
    throw new Error('A SQLite database is required');
  }

  return {
    async initialize() {
      database.exec(`
        CREATE TABLE IF NOT EXISTS auth_desktop_handoffs (
          ticket_hash TEXT PRIMARY KEY,
          status TEXT NOT NULL CHECK (status IN ('pending', 'complete')),
          user_json TEXT,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
          completed_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS auth_desktop_handoffs_expires_at
          ON auth_desktop_handoffs (expires_at);
      `);
    },

    async create(ttlSeconds = 300) {
      const ticket = randomBytes(32).toString('base64url');
      database.prepare(`
        INSERT INTO auth_desktop_handoffs (ticket_hash, status, expires_at)
        VALUES (?, 'pending', ?)
      `).run(hashTicket(ticket), Date.now() + ttlSeconds * 1000);
      return ticket;
    },

    async complete(ticket, user) {
      const result = database.prepare(`
        UPDATE auth_desktop_handoffs
        SET status = 'complete', user_json = ?, completed_at = ?
        WHERE ticket_hash = ? AND status = 'pending' AND expires_at > ?
      `).run(JSON.stringify(user), Date.now(), hashTicket(ticket), Date.now());
      return result.changes === 1;
    },

    async poll(ticket) {
      return database.transaction((ticketHash) => {
        const row = database.prepare(`
          SELECT status, user_json, expires_at
          FROM auth_desktop_handoffs WHERE ticket_hash = ?
        `).get(ticketHash);
        if (!row || row.expires_at <= Date.now()) {
          database.prepare('DELETE FROM auth_desktop_handoffs WHERE ticket_hash = ?').run(ticketHash);
          return { status: 'expired' };
        }
        if (row.status !== 'complete') {
          return { status: 'pending' };
        }
        database.prepare('DELETE FROM auth_desktop_handoffs WHERE ticket_hash = ?').run(ticketHash);
        return { status: 'complete', user: JSON.parse(row.user_json) };
      })(hashTicket(ticket));
    }
  };
}

module.exports = { createDesktopAuthStore };
