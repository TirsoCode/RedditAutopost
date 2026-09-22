import { query } from '../config/db.js';

export async function listSubreddits(userId, { onlyActive = false } = {}) {
  const { rows } = await query(
    `SELECT id, subreddit_name, active, added_at
     FROM subreddits
     WHERE user_id = $1${onlyActive ? ' AND active = TRUE' : ''}
     ORDER BY added_at ASC`,
    [userId]
  );
  return rows;
}

export async function addSubreddit(userId, name) {
  const clean = String(name).replace(/^r\//i, '').trim();
  const { rows } = await query(
    `INSERT INTO subreddits (user_id, subreddit_name)
     VALUES ($1, $2)
     ON CONFLICT (user_id, subreddit_name) DO UPDATE SET active = TRUE, added_at = now()
     RETURNING *`,
    [userId, clean]
  );
  return rows[0];
}

export async function setActive(userId, name, active) {
  const clean = String(name).replace(/^r\//i, '').trim();
  const { rows } = await query(
    `UPDATE subreddits SET active = $3, added_at = now() WHERE user_id = $1 AND subreddit_name = $2 RETURNING *`,
    [userId, clean, active]
  );
  return rows[0] ?? null;
}

export async function removeSubreddit(userId, name) {
  const clean = String(name).replace(/^r\//i, '').trim();
  return query(`DELETE FROM subreddits WHERE user_id = $1 AND subreddit_name = $2`, [userId, clean]);
}