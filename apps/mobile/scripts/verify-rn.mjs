#!/usr/bin/env node
/**
 * Fails fast when pnpm left a broken react-native link (Cannot find module .../cli.js).
 * Fix: from monorepo root run `pnpm install` (or delete apps/mobile/node_modules first).
 */
import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(root, '..');
const cli = path.join(mobileRoot, 'node_modules', 'react-native', 'cli.js');
try {
  accessSync(cli, constants.R_OK);
} catch {
  console.error(
    '\n[preandroid] Missing or broken react-native install.\n' +
      '  Run from repo root:  pnpm install\n' +
      '  Or:  rm -rf apps/mobile/node_modules && pnpm install\n',
  );
  process.exit(1);
}
const req = createRequire(path.join(mobileRoot, 'package.json'));
try {
  req.resolve('react-native/cli.js');
} catch {
  process.exit(1);
}
console.log('[preandroid] react-native CLI ok');
