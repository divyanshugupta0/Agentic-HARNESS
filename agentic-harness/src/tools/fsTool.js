/**
 * Agentic Harness - File System Tool
 * Comprehensive sandboxed filesystem operations with safety checks.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { validateFilePath } = require('../../Guardrails/guardrails');

/**
 * Check if a file or directory exists
 * @param {string} targetPath
 * @returns {Promise<boolean>}
 */
async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read text content of a file
 * @param {string} filePath
 * @param {string} [encoding='utf-8']
 * @returns {Promise<string>}
 */
async function readFile(filePath, encoding = 'utf-8') {
  validateFilePath(filePath, null, { throwOnError: true });
  return await fs.readFile(filePath, encoding);
}

/**
 * Write or overwrite content to a file, automatically creating parent directories
 * @param {string} filePath
 * @param {string|Buffer} content
 * @param {string} [encoding='utf-8']
 * @returns {Promise<{ success: boolean, path: string, bytesWritten: number }>}
 */
async function writeFile(filePath, content, encoding = 'utf-8') {
  validateFilePath(filePath, null, { throwOnError: true });
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, encoding);
  const stats = await fs.stat(filePath);
  return { success: true, path: path.resolve(filePath), bytesWritten: stats.size };
}

/**
 * Append content to the end of a file
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<{ success: boolean }>}
 */
async function appendFile(filePath, content) {
  validateFilePath(filePath, null, { throwOnError: true });
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(filePath, content, 'utf-8');
  return { success: true };
}

/**
 * Delete a file
 * @param {string} filePath
 * @returns {Promise<{ success: boolean }>}
 */
async function deleteFile(filePath) {
  validateFilePath(filePath, null, { throwOnError: true });
  await fs.unlink(filePath);
  return { success: true };
}

/**
 * Create a directory recursively
 * @param {string} dirPath
 * @returns {Promise<{ success: boolean, path: string }>}
 */
async function createDirectory(dirPath) {
  validateFilePath(dirPath, null, { throwOnError: true });
  await fs.mkdir(dirPath, { recursive: true });
  return { success: true, path: path.resolve(dirPath) };
}

/**
 * Remove a directory and its contents
 * @param {string} dirPath
 * @param {boolean} [recursive=true]
 * @returns {Promise<{ success: boolean }>}
 */
async function deleteDirectory(dirPath, recursive = true) {
  validateFilePath(dirPath, null, { throwOnError: true });
  await fs.rm(dirPath, { recursive, force: true });
  return { success: true };
}

/**
 * List contents of a directory with metadata
 * @param {string} dirPath
 * @param {Object} [options] - { recursive: false, maxDepth: 2 }
 * @returns {Promise<Array<{ name: string, path: string, isDirectory: boolean, size: number, modified: Date }>>}
 */
async function listDirectory(dirPath = '.', options = {}) {
  validateFilePath(dirPath, null, { throwOnError: true });
  const resolved = path.resolve(dirPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });

  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(resolved, entry.name);
    let size = 0;
    let modified = null;

    try {
      const stats = await fs.stat(fullPath);
      size = stats.size;
      modified = stats.mtime;
    } catch (_) {}

    const item = {
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
      size,
      modified
    };
    results.push(item);

    if (options.recursive && entry.isDirectory() && (!options.maxDepth || options.maxDepth > 1)) {
      const subEntries = await listDirectory(fullPath, {
        ...options,
        maxDepth: options.maxDepth ? options.maxDepth - 1 : undefined
      });
      results.push(...subEntries);
    }
  }

  return results;
}

/**
 * Get detailed stats of a file or directory
 * @param {string} targetPath
 * @returns {Promise<Object>}
 */
async function getFileStats(targetPath) {
  validateFilePath(targetPath, null, { throwOnError: true });
  const stats = await fs.stat(targetPath);
  return {
    path: path.resolve(targetPath),
    size: stats.size,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    created: stats.birthtime,
    modified: stats.mtime
  };
}

/**
 * Copy file from source to destination
 * @param {string} src
 * @param {string} dest
 */
async function copyFile(src, dest) {
  validateFilePath(src, null, { throwOnError: true });
  validateFilePath(dest, null, { throwOnError: true });
  const destDir = path.dirname(dest);
  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(src, dest);
  return { success: true, src: path.resolve(src), dest: path.resolve(dest) };
}

/**
 * Search for files matching pattern in a directory
 * @param {string} dirPath
 * @param {string|RegExp} pattern
 * @param {boolean} [recursive=true]
 */
async function searchFiles(dirPath, pattern, recursive = true) {
  validateFilePath(dirPath, null, { throwOnError: true });
  const all = await listDirectory(dirPath, { recursive, maxDepth: 5 });
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  return all.filter(item => regex.test(item.name));
}

module.exports = {
  fileExists,
  readFile,
  writeFile,
  appendFile,
  deleteFile,
  createDirectory,
  deleteDirectory,
  listDirectory,
  getFileStats,
  copyFile,
  searchFiles
};
