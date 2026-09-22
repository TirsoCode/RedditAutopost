import { pool } from '../config/db.js';

/** Published posts belonging to a user. */
export async function listPublished(userId) {
  const { rows } = await pool.query(
    `SELECT id, reddit_post_id, subreddit_name, published_at
     FROM posts WHERE user_id = $1 AND status = 'published'`,
    [userId]
  );
  return rows;
}