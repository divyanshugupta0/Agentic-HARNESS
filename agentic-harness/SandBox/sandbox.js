/**
 * Agentic Harness - Docker Sandboxed Execution Environment
 * Executes untrusted agent code/commands in ephemeral, isolated Docker containers
 * with strict resource quotas, readonly root filesystem, and no network access.
 */

const Docker = require('dockerode');

const docker = new Docker();

/**
 * Demultiplex Docker raw log stream buffer.
 * Docker prefixes each output frame with an 8-byte header:
 * [stream_type (1 byte), 0, 0, 0, payload_size (4 bytes big-endian)]
 * stream_type: 1 = stdout, 2 = stderr, 0 = stdin
 *
 * @param {Buffer} buffer - Multiplexed Docker log buffer
 * @returns {{ stdout: string, stderr: string }}
 */
function demuxDockerStream(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    const text = String(buffer || '');
    return { stdout: text, stderr: '' };
  }

  let stdout = '';
  let stderr = '';
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const streamType = buffer.readUInt8(offset);
    const frameSize = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (offset + frameSize > buffer.length) {
      // Malformed or incomplete frame; read remaining as stdout
      stdout += buffer.subarray(offset).toString('utf8');
      break;
    }

    const payload = buffer.subarray(offset, offset + frameSize).toString('utf8');
    offset += frameSize;

    if (streamType === 2) {
      stderr += payload;
    } else {
      stdout += payload;
    }
  }

  // Fallback for non-multiplexed or TTY buffers
  if (stdout.length === 0 && stderr.length === 0 && buffer.length > 0) {
    stdout = buffer.toString('utf8');
  }

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim()
  };
}

/**
 * Checks whether the Docker daemon is accessible
 * @returns {Promise<boolean>}
 */
async function isDockerAvailable() {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a Docker image is present locally, pulling it if necessary
 * @param {string} imageName
 */
async function ensureImage(imageName) {
  try {
    const image = docker.getImage(imageName);
    await image.inspect();
  } catch (err) {
    if (err.statusCode === 404 || err.message?.includes('no such image')) {
      console.log(`[Sandbox] Pulling missing image: ${imageName}...`);
      const stream = await docker.pull(imageName);
      await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });
    } else {
      throw err;
    }
  }
}

/**
 * Executes a command inside an isolated Docker sandbox container.
 *
 * @param {string} command - Shell command or script to execute
 * @param {Object|number} [options] - Options or timeout in ms
 * @param {number} [options.timeoutMs=15000] - Execution timeout in ms
 * @param {string} [options.image='node:20-alpine'] - Base container image
 * @param {number} [options.memoryLimit=268435456] - Memory limit in bytes (256MB default)
 * @param {number} [options.nanoCpus=1000000000] - CPU limit in NanoCPUs (1 CPU default)
 * @param {number} [options.pidsLimit=50] - Maximum number of processes
 * @param {string} [options.networkMode='none'] - Network mode ('none' by default for isolation)
 * @param {Array<string>} [options.env=[]] - Environment variables
 * @param {string} [options.user='node'] - Non-root execution user
 * @param {string} [options.workingDir='/tmp'] - Container working directory
 * @param {boolean} [options.autoPull=true] - Auto-pull image if missing
 * @returns {Promise<string>} Clean execution output
 */
async function AgentSandbox(command, options = {}) {
  // Support passing timeoutMs directly as second argument for backwards compatibility
  const config = typeof options === 'number'
    ? { timeoutMs: options }
    : { ...options };

  const timeoutMs = config.timeoutMs || 15000;
  const image = config.image || 'node:20-alpine';
  const memoryLimit = config.memoryLimit || 256 * 1024 * 1024;
  const nanoCpus = config.nanoCpus || 1000000000;
  const pidsLimit = config.pidsLimit || 50;
  const networkMode = config.networkMode || 'none';
  const env = config.env || [];
  const user = config.user || 'node';
  const workingDir = config.workingDir || '/tmp';
  const autoPull = config.autoPull !== false;

  let container = null;
  let timeoutId = null;
  let didTimeout = false;

  try {
    // 1. Verify Docker daemon is reachable
    const available = await isDockerAvailable();
    if (!available) {
      throw new Error(
        'Sandbox Error: Docker daemon is not reachable. Ensure Docker Desktop / daemon is running.'
      );
    }

    // 2. Ensure execution image is present
    if (autoPull) {
      await ensureImage(image);
    }

    // 3. Create ephemeral hardened container
    container = await docker.createContainer({
      Image: image,
      Cmd: ['sh', '-c', command],
      Env: env,
      User: user,
      WorkingDir: workingDir,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        NetworkMode: networkMode,
        Memory: memoryLimit,
        NanoCpus: nanoCpus,
        PidsLimit: pidsLimit,
        CapDrop: ['ALL'],
        ReadonlyRootfs: true,
        // Correct Docker tmpfs options (64MB temporary writeable space)
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=64m'
        }
      }
    });

    // 4. Start container
    await container.start();

    // 5. Setup execution timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(async () => {
        didTimeout = true;
        try {
          console.warn(`[Sandbox Timeout] Agent exceeded ${timeoutMs}ms. Killing container...`);
          await container.kill();
        } catch {
          // Container might have already completed or exited
        }
        reject(new Error(`Security Exception: Agent execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // 6. Race execution completion against timeout
    const executionPromise = container.wait();
    const waitResult = await Promise.race([executionPromise, timeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // 7. Retrieve stdout/stderr logs and demux
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true
    });

    const { stdout, stderr } = demuxDockerStream(logsBuffer);
    const cleanOutput = (stdout || stderr).trim();

    // 8. Handle non-zero exit codes
    if (waitResult.StatusCode !== 0) {
      const errorMsg = stderr || stdout || `Process exited with code ${waitResult.StatusCode}`;
      const err = new Error(`Agent exited with non-zero status code (${waitResult.StatusCode}). Output: ${errorMsg}`);
      err.statusCode = waitResult.StatusCode;
      err.stdout = stdout;
      err.stderr = stderr;
      throw err;
    }

    return cleanOutput;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    throw error;
  } finally {
    // 9. Cleanup: Always delete ephemeral container to prevent host resource leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (removeError) {
        // Container already removed or missing
      }
    }
  }
}

/**
 * Object-oriented Sandbox Engine class for managing reusable sandbox configurations
 */
class DockerSandbox {
  constructor(defaultOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  async isReady() {
    return isDockerAvailable();
  }

  async run(command, overrideOptions = {}) {
    return AgentSandbox(command, {
      ...this.defaultOptions,
      ...overrideOptions
    });
  }
}

// Module exports supporting CommonJS and ES Module naming patterns
AgentSandbox.AgentSandbox = AgentSandbox;
AgentSandbox.runInSandbox = AgentSandbox;
AgentSandbox.DockerSandbox = DockerSandbox;
AgentSandbox.isDockerAvailable = isDockerAvailable;
AgentSandbox.demuxDockerStream = demuxDockerStream;

module.exports = AgentSandbox;
module.exports.AgentSandbox = AgentSandbox;
module.exports.runInSandbox = AgentSandbox;
module.exports.DockerSandbox = DockerSandbox;
module.exports.isDockerAvailable = isDockerAvailable;
module.exports.demuxDockerStream = demuxDockerStream;
