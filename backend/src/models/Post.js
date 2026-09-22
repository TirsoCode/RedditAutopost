import { query } from '../config/db.js';

const PUBLIC_FIELDS = `
  id, user_id, subreddit_name, original_post_id, original_post_title, original_post_url,
  original_post_body, relevance_reason, drafted_content, spam_risk, spam_suggestion,
  status, published_url, reddit_post_id, title_override, upvotes, comments,
  engagement_score, created_at, published_at, updated_at
`;

export async function listPosts(userId, { status, limit = 100 } = {}) {
  const where = ['user_id = $1'];
  const params = [userId];
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS} FROM posts
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ${Number(limit)}`,
    params
  );
  return rows;
}

export async function getPost(userId, postId) {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS} FROM posts WHERE id = $1 AND user_id = $2`,
    [postId, userId]
  );
  return rows[0] ?? null;
}

export async function postExists(userId, originalPostId) {
  const { rows } = await query(
    `SELECT id FROM posts WHERE user_id = $1 AND original_post_id = $2`,
    [userId, originalPostId]
  );
  return rows.length > 0;
}

/** Insert a candidate found by the monitor job. */
export async function insertCandidate(userId, data) {
  const { rows } = await query(
    `INSERT INTO posts
       (user_id, subreddit_name, original_post_id, original_post_title, original_post_url,
        original_post_body, relevance_reason, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'candidate')
     ON CONFLICT (user_id, original_post_id) DO NOTHING
     RETURNING ${PUBLIC_FIELDS}`,
    [userId, data.subreddit, data.postId, data.title, data.url, data.body, data.reason]
  );
  return rows[0] ?? null;
}

/** Fill in the drafted content + spam risk (the "redact" step). */
export async function updateDraft(postId, { content, spamRisk, spamSuggestion }) {
  const { rows } = await query(
    `UPDATE posts
     SET drafted_content = $2, spam_risk = $3, spam_suggestion = $4, status = 'draft', updated_at = now()
     WHERE id = $1
     RETURNING ${PUBLIC_FIELDS}`,
    [postId, content, spamRisk, spamSuggestion]
  );
  return rows[0] ?? null;
}

export async function setStatus(postId, status) {
  const { rows } = await query(
    `UPDATE posts
     SET status = $2,
         published_at = CASE WHEN $2 = 'published' THEN now() ELSE published_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING ${PUBLIC_FIELDS}`,
    [postId, status]
  );
  return rows[0] ?? null;
}

export async function markPublished(postId, { redditPostId, publishedUrl }) {
  const { rows } = await query(
    `UPDATE posts
     SET status = 'published', reddit_post_id = $2, published_url = $3,
         published_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING ${PUBLIC_FIELDS}`,
    [postId, redditPostId, publishedUrl]
  );
  return rows[0] ?? null;
}

export async function countPublishedToday(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n
     FROM posts
     WHERE user_id = $1 AND status = 'published' AND published_at::date = CURRENT_DATE`,
    [userId]
  );
  return rows[0]?.n ?? 0;
}

export async function listPublished() {
  const { rows } = await query(
    `SELECT id, user_id, reddit_post_id, subreddit_name, status FROM posts WHERE status = 'published'`
  );
  return rows;
}