const { createHash, randomBytes } = require('node:crypto');

function hashTicket(ticket) {
  return createHash('sha256').update(ticket).digest('hex');
}

function createDesktopAuthStore(collection) {
  return {
    async create(ttlSeconds = 300) {
      const ticket = randomBytes(32).toString('base64url');
      await collection.insertOne({
        _id: hashTicket(ticket),
        status: 'pending',
        expiresAt: new Date(Date.now() + ttlSeconds * 1000)
      });
      return ticket;
    },

    async complete(ticket, user) {
      const result = await collection.updateOne(
        { _id: hashTicket(ticket), status: 'pending', expiresAt: { $gt: new Date() } },
        { $set: { status: 'complete', user, completedAt: new Date() } }
      );
      return result.modifiedCount === 1;
    },

    async poll(ticket) {
      const query = {
        _id: hashTicket(ticket),
        expiresAt: { $gt: new Date() }
      };
      const pending = await collection.findOne(query, { projection: { status: 1 } });
      if (!pending) {
        return { status: 'expired' };
      }
      if (pending.status !== 'complete') {
        return { status: 'pending' };
      }
      const result = await collection.findOneAndDelete(query);
      return result?.user
        ? { status: 'complete', user: result.user }
        : { status: 'expired' };
    }
  };
}

module.exports = { createDesktopAuthStore };
