import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcRoot = path.resolve(__dirname, '..', 'src', 'assets');
const distRoot = path.resolve(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(srcRoot)) {
  process.exit(0);
}

fs.mkdirSync(distRoot, { recursive: true });
fs.cpSync(srcRoot, distRoot, { recursive: true });

