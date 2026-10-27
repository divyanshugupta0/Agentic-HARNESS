// Shell command tool (allowlisted)
const { exec } = require('child_process');

function runCommand(cmd, allowlist = []) {
  return new Promise((resolve, reject) => {
    if (!allowlist.includes(cmd.split(' ')[0])) {
      return reject(new Error('Command not allowed'));
    }
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

module.exports = { runCommand };
