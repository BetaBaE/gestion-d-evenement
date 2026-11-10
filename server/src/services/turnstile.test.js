import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurnstile, SITEVERIFY_URL } from './turnstile.js';

// The middleware module reads env.js on import: give it the minimum it requires.
process.env.CLIENT_URL ||= 'http://localhost:5173';
process.env.MONGODB_URI ||= 'mongodb://localhost/test';
process.env.JWT_SECRET ||= 'test';
const { createRequireTurnstile, CAPTCHA_INVALIDE, CAPTCHA_INDISPONIBLE } = await import('../middlewares/requireTurnstile.js');

const HOSTS = ['event.atner.ma', 'gestion-d-evenement.vercel.app', 'localhost'];

function fakeFetch(payload, { status = 200 } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return { status, json: async () => payload };
  };
  impl.calls = calls;
  return impl;
}

const verify = (fetchImpl, extra = {}) =>
  verifyTurnstile({ token: 'tok', remoteIp: '1.2.3.4', expectedAction: 'login', secret: 's3cret', allowedHostnames: HOSTS, fetchImpl, ...extra });

// ---------- service ----------

test('success: valid token, allowed hostname, right action', async () => {
  const fetchImpl = fakeFetch({ success: true, 'error-codes': [], hostname: 'event.atner.ma', action: 'login' });
  const r = await verify(fetchImpl);
  assert.equal(r.ok, true);
  assert.equal(r.hostname, 'event.atner.ma');
  assert.equal(r.action, 'login');
  const { url, init } = fetchImpl.calls[0];
  assert.equal(url, SITEVERIFY_URL);
  assert.equal(init.method, 'POST');
  assert.equal(init.body.get('secret'), 's3cret');
  assert.equal(init.body.get('response'), 'tok');
  assert.equal(init.body.get('remoteip'), '1.2.3.4');
});

test('success:false is refused with Cloudflare codes (e.g. reused token)', async () => {
  const r = await verify(fakeFetch({ success: false, 'error-codes': ['timeout-or-duplicate'] }));
  assert.equal(r.ok, false);
  assert.equal(r.unavailable, false);
  assert.deepEqual(r.codes, ['timeout-or-duplicate']);
});

test('wrong hostname is refused', async () => {
  const r = await verify(fakeFetch({ success: true, hostname: 'evil.example', action: 'login' }));
  assert.equal(r.ok, false);
  assert.deepEqual(r.codes, ['hostname-mismatch']);
});

test('wrong action is refused (a login token on the registration form)', async () => {
  const r = await verify(fakeFetch({ success: true, hostname: 'event.atner.ma', action: 'login' }), { expectedAction: 'inscription' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.codes, ['action-mismatch']);
});

test('Cloudflare test keys skip the hostname/action checks', async () => {
  const r = await verify(fakeFetch({ success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } }));
  assert.equal(r.ok, true);
});

test('timeout => unavailable', async () => {
  const hang = (url, init) =>
    new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
  // AbortSignal.timeout's timer doesn't keep Node alive on its own.
  const keepAlive = setTimeout(() => {}, 5000);
  const r = await verify(hang, { timeoutMs: 20 });
  clearTimeout(keepAlive);
  assert.equal(r.ok, false);
  assert.equal(r.unavailable, true);
  assert.deepEqual(r.codes, ['timeout']);
});

test('network error => unavailable', async () => {
  const r = await verify(async () => {
    throw new TypeError('fetch failed');
  });
  assert.equal(r.unavailable, true);
  assert.deepEqual(r.codes, ['network-error']);
});

test('Cloudflare 5xx or internal-error => unavailable', async () => {
  assert.equal((await verify(fakeFetch({}, { status: 502 }))).unavailable, true);
  assert.equal((await verify(fakeFetch({ success: false, 'error-codes': ['internal-error'] }))).unavailable, true);
});

test('missing token: refused without calling Cloudflare', async () => {
  const fetchImpl = fakeFetch({ success: true });
  for (const token of ['', undefined, null]) {
    const r = await verify(fetchImpl, { token });
    assert.equal(r.ok, false);
    assert.equal(r.unavailable, false);
  }
  assert.equal(fetchImpl.calls.length, 0);
});

// ---------- middleware ----------

const silent = { warn() {}, error() {} };
const baseConfig = { enabled: true, secretKey: 's3cret', allowedHostnames: HOSTS, loginFailOpen: false };

function run(middleware, { body = {}, headers = {} } = {}) {
  const req = { body, ip: '9.9.9.9', get: (h) => headers[h.toLowerCase()] };
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ next: false, status: this.statusCode, payload });
      },
    };
    middleware(req, res, () => resolve({ next: true }));
  });
}

test('middleware: valid token passes, token read from body or header, action and IP forwarded', async () => {
  const seen = [];
  const mw = createRequireTurnstile({ config: baseConfig, logger: silent, verify: async (args) => (seen.push(args), { ok: true }) });
  assert.deepEqual(await run(mw('login'), { body: { turnstileToken: 'a' } }), { next: true });
  assert.deepEqual(await run(mw('inscription'), { headers: { 'cf-turnstile-response': 'b' } }), { next: true });
  assert.equal(seen[0].token, 'a');
  assert.equal(seen[0].expectedAction, 'login');
  assert.equal(seen[0].remoteIp, '9.9.9.9');
  assert.equal(seen[1].token, 'b');
  assert.equal(seen[1].expectedAction, 'inscription');
});

test('middleware: invalid or missing token => 403 CAPTCHA_INVALIDE', async () => {
  const mw = createRequireTurnstile({ config: baseConfig, logger: silent, verify: async ({ token }) => ({ ok: false, unavailable: false, codes: [token ? 'invalid-input-response' : 'missing-input-response'] }) });
  for (const body of [{ turnstileToken: 'bad' }, {}]) {
    const r = await run(mw('login'), { body });
    assert.equal(r.status, 403);
    assert.deepEqual(r.payload, CAPTCHA_INVALIDE);
  }
});

test('middleware: Cloudflare unreachable => 503 CAPTCHA_INDISPONIBLE (fail closed)', async () => {
  const mw = createRequireTurnstile({ config: baseConfig, logger: silent, verify: async () => ({ ok: false, unavailable: true, codes: ['timeout'] }) });
  for (const action of ['login', 'inscription']) {
    const r = await run(mw(action), { body: { turnstileToken: 'x' } });
    assert.equal(r.status, 503);
    assert.deepEqual(r.payload, CAPTCHA_INDISPONIBLE);
  }
});

test('middleware: login fail-open lets an OUTAGE through on login only, never an invalid token', async () => {
  const config = { ...baseConfig, loginFailOpen: true };
  const down = createRequireTurnstile({ config, logger: silent, verify: async () => ({ ok: false, unavailable: true, codes: ['timeout'] }) });
  assert.deepEqual(await run(down('login'), { body: { turnstileToken: 'x' } }), { next: true });
  assert.equal((await run(down('inscription'), { body: { turnstileToken: 'x' } })).status, 503);
  const invalid = createRequireTurnstile({ config, logger: silent, verify: async () => ({ ok: false, unavailable: false, codes: ['invalid-input-response'] }) });
  assert.equal((await run(invalid('login'), { body: { turnstileToken: 'x' } })).status, 403);
});

test('middleware: disabled => no verification at all', async () => {
  let called = false;
  const mw = createRequireTurnstile({ config: { ...baseConfig, enabled: false }, logger: silent, verify: async () => ((called = true), { ok: false }) });
  assert.deepEqual(await run(mw('login')), { next: true });
  assert.equal(called, false);
});

test('middleware: a crash in verify fails closed', async () => {
  const mw = createRequireTurnstile({ config: baseConfig, logger: silent, verify: async () => { throw new Error('boom'); } });
  assert.equal((await run(mw('inscription'), { body: { turnstileToken: 'x' } })).status, 503);
});

test('middleware: the token never appears in the logs', async () => {
  const lines = [];
  const logger = { warn: (...a) => lines.push(a.join(' ')), error: (...a) => lines.push(a.join(' ')) };
  const secretToken = 'SECRET-TOKEN-0123456789';
  const bad = createRequireTurnstile({ config: baseConfig, logger, verify: async () => ({ ok: false, unavailable: false, codes: ['invalid-input-response'] }) });
  const down = createRequireTurnstile({ config: baseConfig, logger, verify: async () => ({ ok: false, unavailable: true, codes: ['timeout'] }) });
  await run(bad('login'), { body: { turnstileToken: secretToken } });
  await run(down('login'), { body: { turnstileToken: secretToken } });
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => !l.includes(secretToken)));
  assert.match(lines[0], /action=login ip=9\.9\.9\.9 codes=invalid-input-response/);
});
