import { query } from '../config/db.js';

/** The single MVP user (created lazily). */
export async function findOrCreateUser() {
  const { rows } = await query(
    `INSERT INTO users (web_url, post_frequency)
     SELECT NULL, 2
     WHERE NOT EXISTS (SELECT 1 FROM users)
     RETURNING *`
  );
  if (rows[0]) return rows[0];
  const res = await query(`SELECT * FROM users LIMIT 1`);
  return res.rows[0] ?? null;
}

export async function getUser() {
  const { rows } = await query(`SELECT * FROM users LIMIT 1`);
  return rows[0] ?? null;
}

export async function updateUser(id, fields) {
  const allowed = ['web_url', 'post_frequency', 'spam_threshold', 'reddit_username'];
  const entries = Object.entries(fields).filter(([k]) => allowed.includes(k) && fields[k] !== undefined);
  if (!entries.length) return getUser();
  const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = entries.map(([, v]) => v);
  const { rows } = await query(
    `UPDATE users SET ${sets}, updated_at = now() WHERE id = $${values.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0] ?? null;
}