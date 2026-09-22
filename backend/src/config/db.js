import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { seedDemoData } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'db', 'schema.sql');

let pool = null;
let driver = 'postgres';
let initPromise = null;
let fallbackSeedApplied = false;

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * In-memory demo DB (pg-mem). Used automatically when no Postgres is
 * reachable, so `npm run dev` works out of the box on any machine.
 * Data resets on restart — it's for local dev only.
 */
async function createPgMemPool() {
  const { newDb, DataType } = await import('pg-mem');
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.registerExtension('pgcrypto', () => {});
  db.public.registerFunction({
    name: 'gen_random_uuid',
    args: [],
    returns: DataType.uuid,
    impure: true,
    implementation: randomUUID,
  });
  // pg-mem lacks round(); register the real-Postgres variants for the demo DB.
  const roundImp = (v, d) => (d ? Math.round(Number(v) * 10 ** d) / 10 ** d : Math.round(Number(v)));
  const roundOverloads = [
    [[DataType.float], DataType.float],
    [[DataType.float, DataType.decimal], DataType.float],
    [[DataType.decimal], DataType.decimal],
    [[DataType.decimal, DataType.decimal], DataType.decimal],
    [[DataType.bigint], DataType.decimal],
  ];
  for (const [args, returns] of roundOverloads) {
    db.public.registerFunction({ name: 'round', args, returns, implementation: roundImp });
  }
  const { Client } = db.adapters.createPg();
  const client = new Client();
  await client.connect();
  await client.query(readFileSync(SCHEMA_PATH, 'utf8'));
  await seedDemoData(client);
  fallbackSeedApplied = true;
  return {
    client,
    async query(text, params) {
      return client.query(text, params);
    },
    async end() {
      return client.end();
    },
  };
}

/** Lazily initialise the DB (real Postgres first, pg-mem as fallback). */
export async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (env.databaseUrl) {
      const candidate = new pg.Pool({
        connectionString: env.databaseUrl,
        max: 10,
        idleTimeoutMillis: 30_000,
      });
      try {
        await candidate.query('SELECT 1');
        pool = candidate;
        driver = 'postgres';
        logger.info('✅ Connected to PostgreSQL');
        return;
      } catch (err) {
        logger.warn(`PostgreSQL unreachable (${err.message}). Falling back to in-memory demo DB.`);
        await candidate.end().catch(() => {});
      }
    } else {
      logger.warn('DATABASE_URL not set — using in-memory demo DB (pg-mem). Data resets on restart.');
    }
    pool = await createPgMemPool();
    driver = 'pg-mem';
    logger.info('✅ In-memory demo DB ready (pg-mem)');
  })();
  return initPromise;
}

export function getDriver() {
  return { driver, fallbackSeedApplied };
}

export async function query(text, params) {
  await initDb();
  return pool.query(text, params);
}

export const poolShim = {
  async query(text, params) {
    await initDb();
    return pool.query(text, params);
  },
  async end() {
    await initDb();
    return pool.end();
  },
};

export { poolShim as pool };