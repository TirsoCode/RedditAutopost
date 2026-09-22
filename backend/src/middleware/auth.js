import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const COOKIE = 'rap_session';

export function signSession(userId) {
  return jwt.sign({ sub: userId }, env.sessionSecret, { expiresIn: '30d' });
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.appUrl.startsWith('https://'),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE);
}

/** Express middleware — require a valid session cookie. */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const payload = jwt.verify(token, env.sessionSecret);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}