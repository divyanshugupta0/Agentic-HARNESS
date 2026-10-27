// Memory store (short-term + long-term vector)
class MemoryStore {
  constructor() {
    this.shortTerm = [];
  }

  addMessage(role, content) {
    this.shortTerm.push({ role, content, ts: Date.now() });
  }

  getHistory() {
    return this.shortTerm;
  }

  clear() {
    this.shortTerm = [];
  }
}

module.exports = { MemoryStore };
