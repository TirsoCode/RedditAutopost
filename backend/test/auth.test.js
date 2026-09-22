import test from 'node:test';
import assert from 'node:assert/strict';

const { signSession, requireAuth } = await import('../src/middleware/auth.js');
const jwt = (await import('jsonwebtoken')).default;

test('signSession returns a verifiable JWT', async () => {
  const token = signSession('user-id-1');
  const payload = jwt.decode(token);
  assert.equal(payload.sub, 'user-id-1');
});

test('requireAuth passes when a valid cookie exists', () => {
  const token = signSession('user-id-1');
  const req = { cookies: { rap_session: token } };
  const res = {};
  let nextCalled = false;
  requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(req.userId, 'user-id-1');
  assert.ok(nextCalled);
});

test('requireAuth rejects missing cookie', () => {
  const req = { cookies: {} };
  const res = { status: () => res, json: (b) => b };
  requireAuth(req, res, () => assert.fail('should not call next'));
});

test('requireAuth rejects invalid cookie', () => {
  const req = { cookies: { rap_session: 'garbage' } };
  const res = { status: (code) => { assert.equal(code, 401); return res; }, json: (b) => b };
  requireAuth(req, res, () => assert.fail('should not call next'));
});