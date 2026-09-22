import { api } from './api.js';

/**
 * Kick off the Reddit OAuth flow: get the authorize URL from the backend
 * and bounce the user to Reddit. They come back to /settings?reddit=... 
 * after the callback.
 */
export async function connectReddit() {
  const { url } = await api.connectReddit();
  window.location.href = url;
}

export async function disconnectReddit() {
  await api.disconnectReddit();
}