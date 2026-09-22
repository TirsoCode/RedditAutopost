import { getUser } from '../models/User.js';
import { query } from '../config/db.js';
import { draftReply, analyzeSpamRisk } from '../utils/claudeAPI.js';
import { logger } from '../utils/logger.js';

/**
 * For every candidate without a draft: write the reply with Claude,
 * check spam risk, and promote the post to 'draft' for review.
 */
export async function redactJob() {
  const user = await getUser();
  if (!user) return logger.warn('[redact] No user yet');
  if (!user.web_url) return logger.warn('[redact] No web_url configured — skipping');

  const { rows: candidates } = await query(
    `SELECT id, subreddit_name, original_post_id, original_post_title, original_post_body
     FROM posts WHERE user_id = $1 AND status = 'candidate' LIMIT 50`,
    [user.id]
  );

  let drafted = 0;
  for (const post of candidates) {
    try {
      const content = await draftReply({ post, webUrl: user.web_url });
      const risk = await analyzeSpamRisk(content);

      if (risk && risk.nivel === 'alto') {
        logger.warn(`[redact] Skipping high-spam-risk draft for ${post.original_post_id}`);
        await query(`UPDATE posts SET spam_risk = 'alto', updated_at = now() WHERE id = $1`, [post.id]);
        continue;
      }

      await query(
        `UPDATE posts
         SET drafted_content = $2, spam_risk = $3, spam_suggestion = $4,
             status = 'draft', updated_at = now()
         WHERE id = $1`,
        [post.id, content, risk?.nivel ?? null, risk?.sugerencia ?? null]
      );
      drafted++;
    } catch (err) {
      logger.error(`[redact] Failed for ${post.original_post_id}: ${err.message}`);
    }
  }

  logger.info(`[redact] Drafted ${drafted}/${candidates.length} candidates`);
  return { candidates: candidates.length, drafted };
}