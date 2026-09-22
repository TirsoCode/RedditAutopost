import { query } from '../config/db.js';

export async function saveStat(postId, { upvotes, comments, awards, engagementScore }) {
  return query(
    `INSERT INTO post_stats (post_id, upvotes, comments, awards, engagement_score)
     VALUES ($1, $2, $3, $4, $5)`,
    [postId, upvotes, comments, awards, engagementScore]
  );
}

export async function getOverview(userId) {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'draft')   AS pending_drafts,
       COUNT(*) FILTER (WHERE status = 'published') AS published,
       COALESCE(AVG(upvotes)  FILTER (WHERE status = 'published'), 0) AS avg_upvotes,
       COALESCE(AVG(comments) FILTER (WHERE status = 'published'), 0) AS avg_comments,
       COALESCE(AVG(engagement_score) FILTER (WHERE status = 'published'), 0) AS avg_engagement
     FROM posts WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

export async function getTopSubreddits(userId, limit = 5) {
  const { rows } = await query(
    `SELECT subreddit_name,
            COUNT(*) AS n,
            ROUND(AVG(upvotes)::numeric) AS avg_upvotes,
            ROUND(AVG(comments)::numeric) AS avg_comments,
            ROUND(AVG(engagement_score), 2) AS avg_engagement
     FROM posts
     WHERE user_id = $1 AND status = 'published'
     GROUP BY subreddit_name
     ORDER BY avg_upvotes DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function getEngagementHistory(userId, days = 7) {
  const { rows } = await query(
    `SELECT ps.tracked_at::date AS day,
            ROUND(AVG(ps.engagement_score), 2) AS engagement,
            SUM(ps.upvotes) AS upvotes,
            SUM(ps.comments) AS comments
     FROM post_stats ps
     JOIN posts p ON p.id = ps.post_id
     WHERE p.user_id = $1 AND ps.tracked_at >= now() - ($2 || ' days')::interval
     GROUP BY day
     ORDER BY day`,
    [userId, days]
  );
  return rows;
}