// Load .env from monorepo root regardless of where the script was launched.
// Must be imported FIRST in any entrypoint (main.ts, migrate.ts, seed.ts).

import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// from backend/src/config/load-env.ts → ../../../.env
loadDotenv({ path: resolve(here, '../../../.env') });
