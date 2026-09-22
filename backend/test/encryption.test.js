import test from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../src/utils/encryption.js';

test('encrypt -> decrypt roundtrip', () => {
  const secret = 'refresh_token_abc123';
  const payload = encrypt(secret);
  assert.notEqual(payload, secret);
  assert.match(payload, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(decrypt(payload), secret);
});

test('two encryptions of the same value differ (random IV)', () => {
  assert.notEqual(encrypt('same'), encrypt('same'));
});

test('decrypt(null) returns null', () => {
  assert.equal(decrypt(null), null);
  assert.equal(decrypt(undefined), null);
});

test('tampered ciphertext throws', () => {
  const payload = encrypt('token');
  const tampered = payload.slice(0, -2) + (payload.endsWith('00') ? '11' : '00');
  assert.throws(() => decrypt(tampered));
});