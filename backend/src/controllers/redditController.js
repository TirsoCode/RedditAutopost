import { getUser } from '../models/User.js';
import { listSubreddits } from '../models/Subreddit.js';
import { getNewPosts } from '../utils/redditAPI.js';
import { checkRelevance } from '../utils/openrouterAPI.js';
import { insertCandidate, postExists } from '../models/Post.js';
import { getAccessToken } from './authController.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Crawl monitored subreddits, filter relevant posts with Claude,
 * and store them as candidates awaiting drafting.
 */
export async function runMonitor(user, accessToken) {
  const subs = await listSubreddits(user.id, { onlyActive: true });
  if (!subs.length) {
    logger.info('[monitor] No active subreddits configured');
    return { scanned: 0, candidates: 0 };
  }

  let candidates = 0;
  let scanned = 0;

  for (const sub of subs) {
    try {
      const data = await getNewPosts(accessToken, sub.subreddit_name, env.scanLimit);
      const posts = data?.data?.children ?? [];

      for (const child of posts) {
        const p = child?.data;
        if (!p || p.is_self === false && !p.selftext) continue; // prefer text posts
        scanned++;
        if (await postExists(user.id, p.id)) continue;

        const verdict = await checkRelevance({
          title: p.title,
          body: p.selftext,
          subreddit: sub.subreddit_name,
          webUrl: user.web_url || '(no configurado)',
        });

        if (verdict?.relevante) {
          const inserted = await insertCandidate(user.id, {
            subreddit: sub.subreddit_name,
            postId: p.id,
            title: p.title,
            url: `https://www.reddit.com${p.permalink}`,
            body: p.selftext,
            reason: verdict.razon ?? verdict.reason ?? null,
          });
          if (inserted) candidates++;
        }
      }
    } catch (err) {
      logger.error(`[monitor] Failed scanning r/${sub.subreddit_name}: ${err.message}`);
    }
  }

  logger.info(`[monitor] Scanned ${scanned} posts, ${candidates} new candidates`);
  return { scanned, candidates };
}

export async function monitorJob() {
  const user = await getUser();
  if (!user) return logger.warn('[monitor] No user yet');
  const accessToken = await getAccessToken(user.id);
  if (!accessToken) return logger.warn('[monitor] Reddit not connected');
  return runMonitor(user, accessToken);
}