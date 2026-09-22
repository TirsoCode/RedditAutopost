import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { monitorJob } from '../controllers/redditController.js';
import { redactJob } from '../controllers/aiController.js';
import { publishJob } from './publishPosts.js';
import { trackStatsJob } from './trackStats.js';

export function startJobs() {
  if (!env.cronEnabled) {
    logger.info('[jobs] Cron disabled (CRON_ENABLED=false)');
    return;
  }

  // Job 1: monitor subreddits every 6 hours (pick up new posts)
  cron.schedule('17 */6 * * *', () => {
    logger.info('[jobs] run monitorSubreddits');
    monitorJob().catch((e) => logger.error('[jobs] monitor failed', e));
  });

  // Redact candidates into drafts every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    logger.info('[jobs] run redactPosts');
    redactJob().catch((e) => logger.error('[jobs] redact failed', e));
  });

  // Job 2: publish approved posts every hour (respecting daily cap)
  cron.schedule('23 * * * *', () => {
    logger.info('[jobs] run publishPosts');
    publishJob().catch((e) => logger.error('[jobs] publish failed', e));
  });

  // Job 3: track stats every hour
  cron.schedule('41 * * * *', () => {
    logger.info('[jobs] run trackStats');
    trackStatsJob().catch((e) => logger.error('[jobs] stats failed', e));
  });

  logger.info('[jobs] Cron jobs scheduled (monitor 6h, redact 15m, publish 1h, stats 1h)');
}