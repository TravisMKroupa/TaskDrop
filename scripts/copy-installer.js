const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');
const downloadDir = path.join(__dirname, '..', 'deploy', 'download');

if (!fs.existsSync(releaseDir)) {
  console.error('No release folder found. Run npm run build first.');
  process.exit(1);
}

if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

const files = fs.readdirSync(releaseDir).filter((f) => f.endsWith('.exe'));
if (files.length === 0) {
  console.error('No .exe installer found in release/');
  process.exit(1);
}

const latest = files.sort().reverse()[0];
const src = path.join(releaseDir, latest);
const dest = path.join(downloadDir, 'TaskDrop-Setup.exe');

fs.copyFileSync(src, dest);
console.log(`Copied ${latest} -> deploy/download/TaskDrop-Setup.exe`);
