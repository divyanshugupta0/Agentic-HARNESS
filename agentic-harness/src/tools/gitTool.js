/**
 * Agentic Harness - Git Version Control Tool
 * Allows agents to inspect repositories, branch status, diffs, and history safely.
 */

const { exec } = require('child_process');

function runGit(args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(`git ${args}`, { cwd, windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr.trim() || err.message));
      resolve(stdout.trim());
    });
  });
}

/**
 * Get git status (porcelain or standard)
 */
async function gitStatus(cwd) {
  const output = await runGit('status -s', cwd);
  const lines = output.split('\n').filter(Boolean);
  return {
    clean: lines.length === 0,
    files: lines.map(line => ({
      status: line.slice(0, 2).trim(),
      file: line.slice(3).trim()
    }))
  };
}

/**
 * Get recent git commits
 * @param {number} [maxCount=10]
 * @param {string} [cwd]
 */
async function gitLog(maxCount = 10, cwd) {
  const output = await runGit(`log -n ${maxCount} --pretty=format:"%h|%an|%ar|%s"`, cwd);
  return output.split('\n').filter(Boolean).map(line => {
    const [hash, author, date, ...subject] = line.split('|');
    return {
      hash,
      author,
      date,
      subject: subject.join('|')
    };
  });
}

/**
 * Get git diff
 * @param {string} [filePath]
 * @param {string} [cwd]
 */
async function gitDiff(filePath = '', cwd) {
  return await runGit(`diff ${filePath}`, cwd);
}

/**
 * Get current branch and list of local branches
 */
async function gitBranch(cwd) {
  const output = await runGit('branch', cwd);
  const branches = output.split('\n').filter(Boolean);
  let current = '';
  const list = branches.map(b => {
    const isCurrent = b.startsWith('*');
    const name = b.replace('*', '').trim();
    if (isCurrent) current = name;
    return name;
  });

  return { current, branches: list };
}

/**
 * Stage files
 * @param {string} [files='.']
 * @param {string} [cwd]
 */
async function gitAdd(files = '.', cwd) {
  await runGit(`add ${files}`, cwd);
  return { success: true, staged: files };
}

/**
 * Commit staged changes
 * @param {string} message
 * @param {string} [cwd]
 */
async function gitCommit(message, cwd) {
  if (!message) throw new Error('Commit message is required');
  const safeMessage = message.replace(/"/g, '\\"');
  const output = await runGit(`commit -m "${safeMessage}"`, cwd);
  return { success: true, output };
}

module.exports = {
  gitStatus,
  gitLog,
  gitDiff,
  gitBranch,
  gitAdd,
  gitCommit
};

