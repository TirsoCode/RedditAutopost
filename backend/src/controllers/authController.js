import crypto from 'node:crypto';
import { getAuthorizeUrl, getTokens, refreshAccessToken, submitSelfPost } from '../utils/redditAPI.js';
import { getAuth, saveTokens, updateAccessToken } from '../models/RedditAuth.js';
import { getUser, updateUser, findOrCreateUser } from '../models/User.js';
import { getPost, markPublished, countPublishedToday } from '../models/Post.js';
import { decrypt, encrypt } from '../utils/encryption.js';

const STATE_TTL = 10 * 60 * 1000;
const pendingStates = new Map(); // state -> { userId, createdAt }  (MVP: in-memory)

/** Build the "Connect Reddit" URL. */
export function connect(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, { userId: req.userId, createdAt: Date.now() });
  res.json({ url: getAuthorizeUrl(state) });
}

/** OAuth callback — exchange code for tokens. */
export async function callback(req, res) {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?reddit=error`);
  const entry = pendingStates.get(state);
  if (!entry || (Date.now() - entry.createdAt) > STATE_TTL) {
    return res.status(400).json({ error: 'Estado OAuth inválido o expirado. Vuelve a intentarlo.' });
  }
  pendingStates.delete(state);

  try {
    const tokens = await getTokens(code);

    // The authorize endpoint is the only source of the refresh token, so save before encrypting.
    // Note: access_token comes back unencrypted here; only persist encrypted versions.
    const user = await findOrCreateUser();
    await saveTokens(user.id, {
      redditUsername: null, // filled right after via /api/v1/me
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    });

    // Grab the username via /api/v1/me
    const { getMe } = await import('../utils/redditAPI.js');
    const me = await getMe(tokens.access_token);
    await updateUser(user.id, { reddit_username: me.name });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?reddit=connected`);
  } catch (err) {
    console.error('OAuth callback failed', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?reddit=error`);
  }
}

export async function disconnect(req, res) {
  const user = await getUser();
  await updateUser(user.id, { reddit_username: null });
  // Tokens stay in reddit_auth; jobs simply skip until re-connected. (Revoke would need a scope we skip in MVP.)
  res.json({ ok: true });
}

/** Get a usable (fresh) decrypted access token for jobs/routes. */
export async function getAccessToken(userId) {
  const auth = await getAuth(userId);
  if (!auth?.access_token) return null;
  let accessToken = decrypt(auth.access_token);
  if (!accessToken) return null;

  if (auth.expires_at && new Date(auth.expires_at).getTime() - Date.now() < 60_000 && auth.refresh_token) {
    const refreshToken = decrypt(auth.refresh_token);
    const tokens = await refreshAccessToken(refreshToken);
    accessToken = tokens.access_token;
    await updateAccessToken(userId, encrypt(accessToken), new Date(Date.now() + tokens.expires_in * 1000));
  }
  return accessToken;
}

/** Publish an approved post to Reddit (also caps daily output). */
export async function publish(req, res) {
  const user = await getUser();
  const post = await getPost(req.userId, req.params.id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  if (post.status !== 'approved') {
    return res.status(400).json({ error: `Solo se pueden publicar posts aprobados (estado: ${post.status})` });
  }

  const today = await countPublishedToday(req.userId);
  if (today >= user.post_frequency) {
    return res.status(429).json({ error: `Límite diario alcanzado (${user.post_frequency} posts/día)` });
  }

  try {
    const accessToken = await getAccessToken(req.userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Reddit no está conectado. Configúralo en Ajustes.' });
    }
    const title = post.title_override || post.original_post_title || '¡Lo comparto!';
    const result = await submitSelfPost(accessToken, post.subreddit_name, title, post.drafted_content);
    const updated = await markPublished(post.id, {
      redditPostId: result.id,
      publishedUrl: result.url,
    });
    res.json(updated);
  } catch (err) {
    console.error('Publish failed', err);
    res.status(502).json({ error: `No se pudo publicar: ${err.message}` });
  }
}