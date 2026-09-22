import { query } from '../config/db.js';

export async function saveTokens(userId, { redditUsername, accessToken, refreshToken, expiresAt, scope }) {
  return query(
    `INSERT INTO reddit_auth (user_id, reddit_username, access_token, refresh_token, expires_at, scope)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       reddit_username = EXCLUDED.reddit_username,
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, reddit_auth.refresh_token),
       expires_at = EXCLUDED.expires_at,
       scope = EXCLUDED.scope,
       updated_at = now()
     RETURNING *`,
    [userId, redditUsername, accessToken, refreshToken, expiresAt, scope]
  );
}

export async function getAuth(userId) {
  const { rows } = await query(`SELECT * FROM reddit_auth WHERE user_id = $1`, [userId]);
  return rows[0] ?? null;
}

export async function updateAccessToken(userId, accessToken, expiresAt) {
  return query(
    `UPDATE reddit_auth SET access_token = $2, expires_at = $3, updated_at = now() WHERE user_id = $1`,
    [userId, accessToken, expiresAt]
  );
}