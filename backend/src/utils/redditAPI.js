import { env } from '../config/env.js';

// Thin fetch wrapper around the Reddit OAuth API (no heavy SDK dependency).
// Docs: https://github.com/reddit-archive/reddit/wiki/OAuth

const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_BASE = 'https://oauth.reddit.com';
const WWW_BASE = 'https://www.reddit.com';

/** Build the authorize URL for the "Connect Reddit" button. */
export function getAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: env.reddit.clientId,
    response_type: 'code',
    state,
    redirect_uri: env.reddit.redirectUri,
    duration: 'permanent',
    scope: 'submit edit read history identity',
  });
  return `https://www.reddit.com/api/v1/authorize?${params}`;
}

/** Exchange the OAuth code for tokens. */
export async function getTokens(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.reddit.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${env.reddit.clientId}:${env.reddit.clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': env.reddit.userAgent,
    },
    body,
  });
  if (!res.ok) throw new Error(`Reddit token exchange failed (${res.status})`);
  return res.json(); // { access_token, refresh_token, expires_in, scope }
}

/** Refresh an expired access token. */
export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${env.reddit.clientId}:${env.reddit.clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': env.reddit.userAgent,
    },
    body,
  });
  if (!res.ok) throw new Error(`Reddit token refresh failed (${res.status})`);
  return res.json();
}

function buildAuthHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'User-Agent': env.reddit.userAgent };
}

/** GET from the oauth API, keeping params per Reddit's conventions. */
export async function redditGet(accessToken, path, params = {}) {
  const qs = new URLSearchParams(params);
  const url = `${API_BASE}${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: buildAuthHeader(accessToken) });
  if (res.status === 401) throw Object.assign(new Error('Reddit token expired'), { code: 'TOKEN_EXPIRED' });
  if (!res.ok) throw new Error(`Reddit GET ${path} failed (${res.status})`);
  return res.json();
}

/** POST to the oauth API. */
export async function redditPost(accessToken, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...buildAuthHeader(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (res.status === 401) throw Object.assign(new Error('Reddit token expired'), { code: 'TOKEN_EXPIRED' });
  if (!res.ok) throw new Error(`Reddit POST ${path} failed (${res.status})`);
  return res.json();
}

/** Current user identity, e.g. /api/v1/me */
export function getMe(accessToken) {
  return redditGet(accessToken, '/api/v1/me');
}

/** New posts in a subreddit, e.g. /r/learnprogramming/new */
export function getNewPosts(accessToken, subreddit, limit = 50, after = null) {
  const params = { limit, raw_json: 1 };
  if (after) params.after = after;
  return redditGet(accessToken, `/r/${encodeURIComponent(subreddit)}/new`, params);
}

/** A single submission by id. */
export function getSubmission(accessToken, postId) {
  return redditGet(accessToken, `/comments/${postId}`, { raw_json: 1 });
}

/** Submit a self post. API expects `sr` (subreddit fullname) + `title` + `text`. */
export async function submitSelfPost(accessToken, subreddit, title, selftext) {
  const info = await redditGet(accessToken, `/r/${encodeURIComponent(subreddit)}/about`, { raw_json: 1 });
  const sr = info.data?.name; // e.g. t5_2qh1i
  const body = { sr, title, text: selftext, api_type: 'json', resubmit: false };
  const res = await redditPost(accessToken, '/api/submit', body);
  const j = res.json || {};
  if (j.errors?.length) {
    throw new Error(`Reddit submit error: ${j.errors.map((e) => e[1]).join('; ')}`);
  }
  const id = res.name || (j.data && (typeof j.data.id === 'string' ? `t3_${j.data.id}` : j.data.id)) || null;
  return {
    id: id ? String(id).replace('t3_', '') : null,
    url: `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/comments/${id ? String(id).replace('t3_', '') : ''}`,
  };
}