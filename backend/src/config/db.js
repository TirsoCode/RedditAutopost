import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

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

/** Insert a small, realistic demo dataset so the UI has content to show. */
async function seedDemoData(client) {
  const escape = (s) => String(s).replace(/'/g, "''");
  const e = escape;
  const { rows: [user] } = await client.query(
    `INSERT INTO users (web_url, post_frequency, spam_threshold, reddit_username)
     VALUES ('https://midemo.dev', 2, 'medio', 'demo_user')
     RETURNING id`
  );
  const uid = user.id;

  for (const name of ['python', 'webdev', 'learnprogramming']) {
    await client.query(
      `INSERT INTO subreddits (user_id, subreddit_name, active) VALUES ('${uid}', '${name}', TRUE)`
    );
  }

  const drafts = [
    ['python', 'd1', 'How to learn FastAPI properly?', 'I keep hitting walls with async and dependencies. Any good path?', 'Yo empecé con FastAPI hace unos meses y lo que más me ayudó fue montar primero un CRUD simple sin auth y añadir capas de a poco. Uso https://midemo.dev para generar los esquemas base y me ahorra muchísimo tiempo. Prueba a separar routers y Pydantic schemas desde el día uno.', 'bajo'],
    ['webdev', 'd2', 'Best way to handle auth for a side project?', 'Session vs JWT vs OAuth providers. What do you recommend?', 'Para un side project yo iría con sesiones sobre cookies httpOnly + CSRF bien configurado: menos fricción que JWT y más fácil de hacer seguro. Si quieres mantener el stack simple, mi web https://midemo.dev te deja generar el flujo completo en minutos.', 'medio'],
  ];
  for (const [sub, pid, title, body, content, risk] of drafts) {
    await client.query(
      `INSERT INTO posts (user_id, subreddit_name, original_post_id, original_post_title, original_post_url, original_post_body, drafted_content, spam_risk, status, relevance_reason)
       VALUES ('${uid}', '${e(sub)}', '${e(pid)}', '${e(title)}', 'https://www.reddit.com/r/${sub}/comments/${pid}', '${e(body)}', '${e(content)}', '${risk}', 'draft', 'Encaja con el servicio del usuario')`
    );
  }

  const published = [
    ['python', 'p1', 'Should I learn Django or FastAPI in 2026?', 'Great question. If you already know Django ORM you will feel at home; if you want async and API-first, FastAPI shines. I use https://midemo.dev to scaffold the boilerplate and focus on the business logic. Whatever you pick, build a real project, not tutorials.', 'bajo', 42, 7, 5.5],
    ['webdev', 'p2', 'CSS frameworks are getting bloated', 'Honestly, for most projects vanilla CSS with custom properties is enough. I pair it with a tiny utility set from my own template (https://midemo.dev) and it is way lighter than pulling Tailwind for everything.', 'bajo', 28, 4, 3.1],
    ['learnprogramming', 'p3', 'Stuck in tutorial hell, how do I get out?', 'Pick one tiny project and finish it this weekend: a to-do API, a CLI, whatever. Ship it ugly. I made my own boilerplate site (https://midemo.dev) exactly to skip the setup paralysis and just build.', 'medio', 61, 12, 8.2],
  ];
  for (const [sub, pid, title, body, risk, up, co, eng] of published) {
    const { rows: [post] } = await client.query(
      `INSERT INTO posts (user_id, subreddit_name, original_post_id, original_post_title, original_post_url, original_post_body, drafted_content, spam_risk, status, upvotes, comments, engagement_score, published_at, reddit_post_id)
       VALUES ('${uid}', '${e(sub)}', '${e(pid)}', '${e(title)}', 'https://www.reddit.com/r/${sub}/comments/${pid}', '${e(body)}', '${e(body)}', '${risk}', 'published', ${up}, ${co}, ${eng}, now() - interval '3 days', 't3_${pid}')
       RETURNING id`
    );
    for (let i = 0; i < 7; i++) {
      await client.query(
        `INSERT INTO post_stats (post_id, upvotes, comments, awards, engagement_score, tracked_at)
         VALUES ('${post.id}', ${up - i}, ${co}, ${i % 3}, ${Math.max(0.5, eng - i * 0.4)}, now() - interval '${7 - i} days')`
      );
    }
  }
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