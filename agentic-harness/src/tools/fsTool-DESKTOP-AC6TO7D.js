// File system tool
const fs = require('fs').promises;

async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf-8');
}

async function writeFile(filePath, content) {
  await fs.writeFile(filePath, content, 'utf-8');
  return { success: true };
}

module.exports = { readFile, writeFile };
