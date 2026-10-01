import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { openApiDocument } from '../src/core/openapi.js';

const here = dirname(fileURLToPath(import.meta.url));
await writeFile(resolve(here, '../openapi.json'), `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
