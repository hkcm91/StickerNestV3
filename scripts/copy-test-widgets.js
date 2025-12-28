import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const srcDir = path.join(rootDir, 'test-widgets');
const destDir = path.join(rootDir, 'public', 'test-widgets');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (!fs.existsSync(srcDir)) {
    console.log('test-widgets directory not found, skipping copy');
    process.exit(0);
  }
  copyDir(srcDir, destDir);
  console.log('Successfully copied test-widgets to public/test-widgets');
} catch (error) {
  console.error('Error copying test-widgets:', error);
  process.exit(1);
}

