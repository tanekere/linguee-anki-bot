const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

const SHARED_FILES = [
  'background.js',
  'content.js',
  'content.css'
];

const SHARED_DIRS = [
  'popup',
  'icons'
];

const TARGETS = {
  chrome: {
    manifestSrc: path.join(ROOT, 'manifests', 'chrome.json'),
    label: 'Chrome / Chromium'
  },
  firefox: {
    manifestSrc: path.join(ROOT, 'manifests', 'firefox.json'),
    label: 'Firefox'
  }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      copyFile(src, dest);
    }
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function buildTarget(name) {
  const target = TARGETS[name];
  if (!target) {
    console.error(`Unknown target: ${name}`);
    process.exit(1);
  }

  const outDir = path.join(DIST, name);
  console.log(`\nBuilding ${target.label}...`);

  cleanDir(outDir);
  ensureDir(outDir);

  for (const file of SHARED_FILES) {
    const src = path.join(ROOT, file);
    const dest = path.join(outDir, file);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
      console.log(`  ✓ ${file}`);
    } else {
      console.warn(`  ⚠ missing: ${file}`);
    }
  }

  for (const dir of SHARED_DIRS) {
    const src = path.join(ROOT, dir);
    const dest = path.join(outDir, dir);
    if (fs.existsSync(src)) {
      copyDir(src, dest);
      console.log(`  ✓ ${dir}/`);
    } else {
      console.warn(`  ⚠ missing: ${dir}/`);
    }
  }

  const manifestDest = path.join(outDir, 'manifest.json');
  if (fs.existsSync(target.manifestSrc)) {
    copyFile(target.manifestSrc, manifestDest);
    console.log(`  ✓ manifest.json (from manifests/${name}.json)`);
  } else {
    console.error(`  ✗ missing: manifests/${name}.json`);
    process.exit(1);
  }
}

const ICON_SIZES = [
  { name: 'icon-16.png', size: 16 },
  { name: 'icon-48.png', size: 48 },
  { name: 'icon-128.png', size: 128 }
];

const ICON_SRC = path.join(ROOT, 'icons', 'icon-og.png');
const ICON_DIR = path.join(ROOT, 'icons');

async function generateIcons() {
  if (!fs.existsSync(ICON_SRC)) {
    console.error(`  ✗ source icon not found: ${ICON_SRC}`);
    process.exit(1);
  }

  for (const { name, size } of ICON_SIZES) {
    const dest = path.join(ICON_DIR, name);
    await sharp(ICON_SRC).resize(size, size).toFile(dest);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  console.log('\nIcons generated successfully.');
}

function main() {
  const arg = process.argv[2];

  if (arg === '--icons') {
    console.log('Generating icons...\n');
    generateIcons().catch(err => {
      console.error('  ✗', err.message);
      process.exit(1);
    });
    return;
  }

  if (arg && TARGETS[arg]) {
    buildTarget(arg);
  } else if (arg) {
    console.error(`Unknown target "${arg}". Valid: chrome, firefox`);
    process.exit(1);
  } else {
    cleanDir(DIST);
    for (const name of Object.keys(TARGETS)) {
      buildTarget(name);
    }
  }

  console.log('\nBuild complete.');
  console.log(`  Chrome:  dist/chrome/  → load as unpacked extension`);
  console.log(`  Firefox: dist/firefox/ → about:debugging → Load Temporary Add-on\n`);
}

main();
