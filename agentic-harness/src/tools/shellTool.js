/**
 * Agentic Harness - Shell & Terminal Execution Tool
 * Executes CLI commands with allowlisting, Guardrails validation,
 * and optional Docker sandboxing.
 */

const { exec, spawn } = require('child_process');
const { validateCommand } = require('../../Guardrails/guardrails');
const { AgentSandbox, isDockerAvailable } = require('../../SandBox/sandbox');

const DEFAULT_ALLOWLIST = [
  'node', 'npm', 'git', 'echo', 'cat', 'ls', 'dir', 'type',
  'find', 'grep', 'where', 'which', 'whoami', 'pwd', 'mkdir'
];

/**
 * Execute a shell command with security validation
 * @param {string} cmd - Command string
 * @param {Object} [options]
 * @param {Array<string>} [options.allowlist] - Permitted binary allowlist
 * @param {number} [options.timeoutMs=30000] - Execution timeout
 * @param {string} [options.cwd] - Working directory
 * @param {boolean} [options.sandboxed=false] - Whether to force Docker sandbox
 * @param {boolean} [options.strictAllowlist=false] - Disallow commands not on allowlist
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, durationMs: number }>}
 */
async function runCommand(cmd, options = {}) {
  const allowlist = options.allowlist || DEFAULT_ALLOWLIST;
  const timeoutMs = options.timeoutMs || 30000;
  const cwd = options.cwd || process.cwd();
  const sandboxed = options.sandboxed === true;

  // 1. Guardrail validation
  validateCommand(cmd, options.strictAllowlist ? allowlist : null, { throwOnError: true });

  // 2. Sandboxed execution if requested
  if (sandboxed) {
    const dockerUp = await isDockerAvailable();
    if (dockerUp) {
      const output = await AgentSandbox(cmd, { timeoutMs });
      return {
        stdout: output,
        stderr: '',
        exitCode: 0,
        sandboxed: true
      };
    }
  }

  // 3. Local execution
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const child = exec(
      cmd,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      },
      (err, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        if (err && err.killed) {
          return reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: err ? (err.code || 1) : 0,
          durationMs
        });
      }
    );
  });
}

/**
 * List running processes on the system
 * @returns {Promise<Array<{ pid: number, name: string, memory: string }>>}
 */
async function listProcesses() {
  const isWin = process.platform === 'win32';
  const cmd = isWin
    ? 'tasklist /FO CSV /NH'
    : 'ps -eo pid,comm,%mem --sort=-%mem';

  const res = await runCommand(cmd, { strictAllowlist: false });
  const lines = res.stdout.split('\n').filter(Boolean);

  if (isWin) {
    return lines.slice(0, 50).map(line => {
      const parts = line.split('","').map(p => p.replace(/"/g, '').trim());
      return {
        name: parts[0] || 'unknown',
        pid: parseInt(parts[1], 10) || 0,
        session: parts[2] || '',
        memory: parts[4] || ''
      };
    });
  }

  return lines.slice(1, 51).map(line => {
    const parts = line.trim().split(/\s+/);
    return {
      pid: parseInt(parts[0], 10) || 0,
      name: parts[1] || 'unknown',
      memory: parts[2] ? `${parts[2]}%` : ''
    };
  });
}

/**
 * Terminate a process by PID
 * @param {number} pid
 * @param {boolean} [force=false]
 */
async function killProcess(pid, force = false) {
  if (!pid || typeof pid !== 'number') {
    throw new Error('Valid numeric PID is required');
  }

  // Self-termination protection: Prohibit killing host application process
  if (pid === process.pid || pid === process.ppid) {
    throw new Error(`Security Violation: Agent is strictly prohibited from terminating its own application process (PID: ${pid}).`);
  }

  const isWin = process.platform === 'win32';
  const cmd = isWin
    ? `taskkill ${force ? '/F' : ''} /PID ${pid}`
    : `kill ${force ? '-9' : '-15'} ${pid}`;

  return await runCommand(cmd, { strictAllowlist: false });
}

module.exports = {
  runCommand,
  listProcesses,
  killProcess,
  DEFAULT_ALLOWLIST
};
