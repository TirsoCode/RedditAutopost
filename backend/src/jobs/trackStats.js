import { getUser } from '../models/User.js';
import { saveStat } from '../models/Stats.js';
import { listPublished } from './helpers.js';
import { getAccessToken } from '../controllers/authController.js';
import { getSubmission } from '../utils/redditAPI.js';
import { logger } from '../utils/logger.js';

/** Job 3 (plan): track stats for published posts every hour. */
export async function trackStatsJob() {
  const user = await getUser();
  if (!user) return logger.warn('[stats] No user yet');

  const published = await listPublished(user.id);
  if (!published.length) return;

  const accessToken = await getAccessToken(user.id);
  if (!accessToken) return logger.warn('[stats] Reddit not connected');

  for (const post of published) {
    try {
      const [listing] = await getSubmission(accessToken, post.reddit_post_id);
      const sub = listing?.data?.children?.[0]?.data;
      if (!sub) continue;

      const hoursPosted = Math.max(1, (Date.now() - new Date(post.published_at).getTime()) / 3_600_000);
      const awards = (sub.all_awardings || []).length;
      const engagement = (sub.score + sub.num_comments * 2 + awards * 5) / hoursPosted;

      await saveStat(post.id, {
        upvotes: sub.score,
        comments: sub.num_comments,
        awards,
        engagementScore: Math.round(engagement * 100) / 100,
      });
      logger.debug(`[stats] Tracked ${post.reddit_post_id}: ${sub.score} up, ${sub.num_comments} comments`);
    } catch (err) {
      logger.error(`[stats] Failed for ${post.reddit_post_id}: ${err.message}`);
    }
  }
}