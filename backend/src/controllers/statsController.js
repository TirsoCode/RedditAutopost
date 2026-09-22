import { getOverview as getOverviewStats, getTopSubreddits, getEngagementHistory } from '../models/Stats.js';

export async function getOverview(req, res) {
  const [overview, topSubreddits, history] = await Promise.all([
    getOverviewStats(req.userId),
    getTopSubreddits(req.userId),
    getEngagementHistory(req.userId, 7),
  ]);
  res.json({ ...overview, topSubreddits, history });
}