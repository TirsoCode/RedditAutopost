import { getUser, updateUser } from '../models/User.js';
import { listSubreddits } from '../models/Subreddit.js';
import { getAuth } from '../models/RedditAuth.js';

export async function get(req, res) {
  const user = await getUser();
  const subreddits = await listSubreddits(user.id);
  const auth = await getAuth(user.id);
  res.json({
    web_url: user.web_url,
    post_frequency: user.post_frequency,
    spam_threshold: user.spam_threshold,
    reddit_connected: Boolean(auth?.access_token && user.reddit_username),
    reddit_username: user.reddit_username,
    subreddits,
  });
}

export async function update(req, res) {
  const user = await getUser();
  const updated = await updateUser(user.id, {
    web_url: req.body?.web_url,
    post_frequency: req.body?.post_frequency,
    spam_threshold: req.body?.spam_threshold,
  });
  res.json({
    web_url: updated.web_url,
    post_frequency: updated.post_frequency,
    spam_threshold: updated.spam_threshold,
  });
}