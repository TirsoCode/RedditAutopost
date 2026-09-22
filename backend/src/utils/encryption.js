import crypto from 'node:crypto';
import { env } from '../config/env.js';

// AES-256-GCM encryption for stored Reddit OAuth tokens.
const key = Buffer.from(env.encryptionKey || '', 'hex');
if (!env.encryptionKey || key.length !== 32) {
  console.warn('⚠️ ENCRYPTION_KEY must be a 32-byte hex string. Generated keys will not persist across restarts.');
}

function currentKey() {
  const k = Buffer.from(env.encryptionKey || '', 'hex');
  return k.length === 32 ? k : crypto.createHash('sha256').update(env.encryptionKey || 'dev-fallback-key').digest();
}

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', currentKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(payload) {
  if (!payload) return null;
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', currentKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}