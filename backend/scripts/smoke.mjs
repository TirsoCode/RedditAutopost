// Smoke test for the DB layer using pg-mem (in-memory Postgres emulator).
// A real Postgres cannot boot in this container (proot lacks SysV shm), so
// this emulator validates schema.sql + representative model SQL.
//
// Usage: npm run smoke
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { newDb, DataType } from 'pg-mem';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

const db = newDb({ autoCreateForeignKeyIndices: true });
// pgcrypto as a whole isn't emulated; we register gen_random_uuid manually.
db.registerExtension('pgcrypto', () => {});
db.public.registerFunction({
  name: 'gen_random_uuid',
  args: [],
  returns: DataType.uuid,
  implementation: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }),
});

const { Client } = db.adapters.createPg();
const client = new Client();
await client.connect();

let failures = 0;
async function checkAsync(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ❌ ${label}\n     ${err.message.split('\n')[0]}`);
  }
}

console.log('Applying schema.sql (twice, for idempotency)…');
try {
  await client.query(schema);
  await client.query(schema);
  console.log('  ✅ schema.sql applied twice');
} catch (err) {
  console.error('  ❌ schema failed:', err.message.split('\n')[0]);
  console.log('SQL:', JSON.stringify(err.position ? err.message.replace(/[^]*?(\s*---)/, '') : ''));
  process.exit(1);
}

await checkAsync('user lifecycle (findOrCreate, update)', async () => {
  await client.query(`INSERT INTO users (web_url, post_frequency) SELECT NULL, 2 WHERE NOT EXISTS (SELECT 1 FROM users)`);
  await client.query(`INSERT INTO users (web_url, post_frequency) SELECT NULL, 2 WHERE NOT EXISTS (SELECT 1 FROM users)`);
  const { rows } = await client.query(`SELECT * FROM users LIMIT 1`);
  if (rows.length !== 1) throw new Error('expected exactly one user');
  await client.query(`UPDATE users SET web_url = 'https://example.com', updated_at = now() WHERE id = $1`, [rows[0].id]);
});

await checkAsync('post_frequency CHECK constraint', async () => {
  try {
    await client.query(`INSERT INTO users (post_frequency) VALUES (0)`);
  } catch { return; }
  throw new Error('expected CHECK violation');
});

await checkAsync('subreddits CRUD + unique', async () => {
  const { rows: [u] } = await client.query(`SELECT * FROM users LIMIT 1`);
  const { rows: [sub] } = await client.query(
    `INSERT INTO subreddits (user_id, subreddit_name) VALUES ($1,$2) ON CONFLICT (user_id, subreddit_name) DO UPDATE SET active = TRUE RETURNING *`,
    [u.id, 'python']
  );
  if (sub.subreddit_name !== 'python') throw new Error('bad insert');
  await client.query(`UPDATE subreddits SET active = FALSE WHERE user_id = $1 AND subreddit_name = 'python'`, [u.id]);
  const { rows } = await client.query(`SELECT * FROM subreddits WHERE user_id = $1 AND active = TRUE`, [u.id]);
  if (rows.length !== 0) throw new Error('toggle failed');
});

await checkAsync('posts: candidate -> draft -> approved -> published + dedupe', async () => {
  const { rows: [u] } = await client.query(`SELECT * FROM users LIMIT 1`);
  const insert = `INSERT INTO posts (user_id, subreddit_name, original_post_id, original_post_title, original_post_url, original_post_body, relevance_reason, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'candidate')
    ON CONFLICT (user_id, original_post_id) DO NOTHING RETURNING *`;
  await client.query(insert, [u.id, 'python', 'abc123', 'How to learn FastAPI?', 'https://reddit.com/x', 'body', 'relevant']);
  const dup = await client.query(insert, [u.id, 'python', 'abc123', 'How to learn FastAPI?', 'https://reddit.com/x', 'body', 'relevant']);
  if (dup.rows.length !== 0) throw new Error('ON CONFLICT DO NOTHING should return nothing');

  const { rows: [p] } = await client.query(`SELECT id, user_id FROM posts WHERE user_id = $1 AND status = 'candidate'`, [u.id]);
  if (!p) throw new Error('candidate insert failed');
  await client.query(
    `UPDATE posts SET drafted_content = 'texto', spam_risk = 'bajo', status = 'draft', updated_at = now() WHERE id = $1`,
    [p.id]);
  await client.query(`UPDATE posts SET status = 'approved', updated_at = now() WHERE id = $1`, [p.id]);
  await client.query(
    `UPDATE posts SET status = 'published', reddit_post_id = $2, published_url = $3, published_at = now(), updated_at = now() WHERE id = $1`,
    [p.id, 't3_xyz', 'https://reddit.com/r/python/comments/xyz']);
  const { rows: [pub] } = await client.query(`SELECT * FROM posts WHERE id = $1`, [p.id]);
  if (pub.status !== 'published' || pub.reddit_post_id !== 't3_xyz') throw new Error('publish failed');
});

await checkAsync('stats: snapshot + overview + top subreddits + history', async () => {
  const { rows: [u] } = await client.query(`SELECT * FROM users LIMIT 1`);
  const { rows: [p] } = await client.query(`SELECT id FROM posts WHERE user_id = $1 LIMIT 1`, [u.id]);
  await client.query(
    `INSERT INTO post_stats (post_id, upvotes, comments, awards, engagement_score) VALUES ($1, 42, 7, 1, 5.5)`, [p.id]);
  const { rows: [ov] } = await client.query(
    `SELECT COALESCE(AVG(upvotes) FILTER (WHERE status = 'published'), 0) AS avg_upvotes FROM posts WHERE user_id = $1`, [u.id]);
  if (Number(ov.avg_upvotes) !== 42) throw new Error(`overview avg wrong: ${ov.avg_upvotes}`);
  const top = await client.query(
    `SELECT subreddit_name, COUNT(*) AS n, ROUND(AVG(upvotes)) AS avg_upvotes
     FROM posts WHERE user_id = $1 AND status = 'published' GROUP BY subreddit_name ORDER BY avg_upvotes DESC LIMIT 5`, [u.id]);
  if (top.rows.length !== 1) throw new Error('top subreddits empty');
  await client.query(
    `SELECT date_trunc('day', ps.tracked_at)::date AS day, ROUND(AVG(ps.engagement_score), 2) AS engagement
     FROM post_stats ps JOIN posts p ON p.id = ps.post_id
     WHERE p.user_id = $1 AND ps.tracked_at >= now() - interval '7 days' GROUP BY day ORDER BY day`, [u.id]);
});

await client.end();
console.log(failures === 0 ? '\n🎉 All smoke checks passed' : `\n💥 ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);