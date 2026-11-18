// Base agent definition
class BaseAgent {
  constructor(id, systemPrompt, tools = []) {
    this.id = id;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.state = 'idle';
  }

  async run(goal) {
    this.state = 'running';
    // TODO: implement agent loop (plan -> execute -> reflect)
    return { status: 'done', goal };
  }

  pause() { this.state = 'paused'; }
  resume() { this.state = 'running'; }
  stop() { this.state = 'stopped'; }
}

module.exports = { BaseAgent };
