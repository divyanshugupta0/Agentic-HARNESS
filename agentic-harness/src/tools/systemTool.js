/**
 * Agentic Harness - System & Hardware Telemetry Tool
 * Gathers system hardware, memory, CPU, disk, and network state.
 */

const os = require('os');
const { execSync } = require('child_process');

/**
 * Get OS and platform info
 */
function getSystemInfo() {
  return {
    platform: process.platform,
    type: os.type(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptimeHours: Math.round((os.uptime() / 3600) * 10) / 10,
    nodeVersion: process.version
  };
}

/**
 * Get CPU hardware details
 */
function getCpuInfo() {
  const cpus = os.cpus();
  return {
    model: cpus[0]?.model || 'Unknown',
    cores: cpus.length,
    speedMHz: cpus[0]?.speed || 0,
    loadAverage: os.loadavg()
  };
}

/**
 * Get system memory telemetry
 */
function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalBytes: total,
    totalMB: Math.round(total / (1024 * 1024)),
    freeMB: Math.round(free / (1024 * 1024)),
    usedMB: Math.round(used / (1024 * 1024)),
    usedPercentage: Math.round((used / total) * 100)
  };
}

/**
 * Get disk space overview
 */
function getDiskInfo() {
  if (process.platform === 'win32') {
    try {
      const output = execSync('wmic logicaldisk get caption,freespace,size /format:csv', {
        encoding: 'utf8',
        windowsHide: true
      });
      const lines = output.trim().split('\r\n').filter(Boolean);
      const disks = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').filter(Boolean);
        if (parts.length >= 3) {
          const drive = parts[0];
          const free = parseInt(parts[1], 10);
          const size = parseInt(parts[2], 10);
          if (size > 0) {
            disks.push({
              drive,
              totalGB: Math.round(size / (1024 * 1024 * 1024)),
              freeGB: Math.round(free / (1024 * 1024 * 1024)),
              usedGB: Math.round((size - free) / (1024 * 1024 * 1024))
            });
          }
        }
      }
      return disks;
    } catch (_) {
      return [{ drive: 'C:', status: 'Available' }];
    }
  }

  return [];
}

/**
 * Get active network interfaces
 */
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const active = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        active.push({
          interface: name,
          address: addr.address,
          netmask: addr.netmask,
          mac: addr.mac
        });
      }
    }
  }

  return active;
}

module.exports = {
  getSystemInfo,
  getCpuInfo,
  getMemoryInfo,
  getDiskInfo,
  getNetworkInfo
};

