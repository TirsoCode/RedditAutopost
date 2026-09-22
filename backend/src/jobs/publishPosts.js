import { monitorJob } from '../controllers/redditController.js';
import { redactJob } from '../controllers/aiController.js';
import { getUser } from '../models/User.js';
import { listPosts, markPublished, countPublishedToday } from '../models/Post.js';
import { getAccessToken } from '../controllers/authController.js';
import { submitSelfPost } from '../utils/redditAPI.js';
import { logger } from '../utils/logger.js';

/** Job 2 (plan): publish approved posts, respecting the daily frequency cap. */
export async function publishJob() {
  const user = await getUser();
  if (!user) return logger.warn('[publish] No user yet');

  const approved = await listPosts(user.id, { status: 'approved', limit: 10 });
  if (!approved.length) return;

  const today = await countPublishedToday(user.id);
  let remaining = Math.max(0, user.post_frequency - today);
  if (remaining <= 0) return logger.info('[publish] Daily cap reached');

  const accessToken = await getAccessToken(user.id);
  if (!accessToken) return logger.warn('[publish] Reddit not connected');

  for (const post of approved) {
    if (remaining-- <= 0) break;
    try {
      const title = post.title_override || post.original_post_title || '¡Lo comparto!';
      const result = await submitSelfPost(accessToken, post.subreddit_name, title, post.drafted_content);
      await markPublished(post.id, { redditPostId: result.id, publishedUrl: result.url });
      logger.info(`[publish] Published ${result.id} in r/${post.subreddit_name}`);
    } catch (err) {
      logger.error(`[publish] Failed for ${post.id}: ${err.message}`);
    }
  }
}