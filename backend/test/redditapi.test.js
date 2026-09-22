import test from 'node:test';
import assert from 'node:assert/strict';

// Set env BEFORE importing the module (env.js reads process.env at load).
process.env.REDDIT_CLIENT_ID = 'test_client';
process.env.REDDIT_CLIENT_SECRET = 'test_secret';
process.env.REDDIT_REDIRECT_URI = 'http://localhost:4000/api/auth/callback';
process.env.REDDIT_USER_AGENT = 'RedditAutoPost/test';
process.env.APP_URL = 'http://localhost:4000';

const { getAuthorizeUrl, getTokens, submitSelfPost } = await import('../src/utils/redditAPI.js');

test('getAuthorizeUrl includes client_id, scopes and redirection', () => {
  const url = getAuthorizeUrl('state123');
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://www.reddit.com');
  assert.equal(parsed.pathname, '/api/v1/authorize');
  assert.equal(parsed.searchParams.get('client_id'), 'test_client');
  assert.equal(parsed.searchParams.get('state'), 'state123');
  assert.equal(parsed.searchParams.get('redirect_uri'), 'http://localhost:4000/api/auth/callback');
  assert.equal(parsed.searchParams.get('response_type'), 'code');
  assert.equal(parsed.searchParams.get('duration'), 'permanent');
  const scopes = parsed.searchParams.get('scope').split(' ');
  for (const s of ['submit', 'edit', 'read', 'history']) assert.ok(scopes.includes(s));
});

test('getTokens posts an authorization_code grant with basic auth', async () => {
  // Stub global fetch so no real network call happens.
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const tokens = await getTokens('the-code');
    assert.equal(tokens.access_token, 'at');
    assert.equal(tokens.refresh_token, 'rt');
    const { url, opts } = calls[0];
    assert.equal(url, 'https://www.reddit.com/api/v1/access_token');
    const auth = opts.headers.Authorization;
    const expected = 'Basic ' + Buffer.from(`test_client:test_secret`).toString('base64');
    assert.equal(auth, expected);
    assert.match(String(opts.body), /grant_type=authorization_code/);
    assert.match(String(opts.body), /code=the-code/);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('submitSelfPost builds a reply post id from the json response', async () => {
  const origFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call++;
    if (call === 1) return new Response(JSON.stringify({ data: { name: 't5_2qh1i' } }), { status: 200 });
    return new Response(JSON.stringify({ json: { data: { id: 't3_abc123', url: 'https://reddit.com/r/x/comments/abc123' } }, name: 't3_abc123' }), { status: 200 });
  };
  try {
    const result = await submitSelfPost('tok', 'python', 'Title', 'Body');
    assert.equal(result.id, 'abc123');
    assert.match(result.url, /\/comments\/abc123/);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('submitSelfPost surfaces server-side errors', async () => {
  const origFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call++;
    if (call === 1) return new Response(JSON.stringify({ data: { name: 't5_x' } }), { status: 200 });
    return new Response(JSON.stringify({ json: { errors: [['BAD', 'please wait a minute', 'ratelimit']] } }), { status: 200 });
  };
  try {
    await assert.rejects(() => submitSelfPost('tok', 'python', 'Title', 'Body'), /ratelimit|please wait/);
  } finally {
    globalThis.fetch = origFetch;
  }
});