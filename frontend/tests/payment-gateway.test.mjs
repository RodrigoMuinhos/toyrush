import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/gateway.mjs';
import { request } from '../src/shared/http.ts';

test('public gateway requires activation, protects secrets and forwards the authenticated payment flow', async t => {
  const env = { ...process.env };
  Object.assign(process.env, { PAYMENTS_API_TARGET: 'https://backend.example', TOY_MACHINE_KEY: 'machine-'.repeat(8), TERMINAL_ACCESS_KEY: 'activate-'.repeat(8), TERMINAL_ALLOWED_ORIGINS: 'https://toyfactory.dev.br' });
  t.after(() => { process.env = env; });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), ...options });
    return Response.json({ ready: true, packages: [{ credits: 2, amount: 5 }] });
  });
  async function call(route, method = 'GET', body, headers = {}) {
    const result = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(v = '') { this.body = v; } };
    await handler({ url: '/api/gateway', query: { route: '/' + route }, method, body, headers: { host: 'toyfactory.dev.br', ...headers } }, result);
    return result;
  }
  assert.equal((await call('payments/packages')).statusCode, 401);
  assert.equal(calls.length, 0);
  const form = await call('terminal');
  assert.equal(form.statusCode, 200);
  assert.ok(!form.body.includes(process.env.TOY_MACHINE_KEY));
  assert.ok(!form.body.includes(process.env.TERMINAL_ACCESS_KEY));
  assert.equal((await call('terminal', 'POST', { key: process.env.TERMINAL_ACCESS_KEY })).statusCode, 403);
  assert.equal((await call('terminal', 'POST', { key: 'wrong' }, { origin: 'https://toyfactory.dev.br' })).statusCode, 401);
  const login = await call('terminal', 'POST', { key: process.env.TERMINAL_ACCESS_KEY }, { origin: 'https://toyfactory.dev.br' });
  assert.equal(login.statusCode, 303);
  const cookie = login.headers['Set-Cookie'];
  for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(cookie.includes(attr));
  const headers = { cookie, origin: 'https://toyfactory.dev.br', 'content-type': 'application/json', 'X-Machine-Key': 'attacker' };
  for (const [route, method, body] of [
    ['payments/packages', 'GET'], ['machine/balance', 'GET'],
    ['payments/pix', 'POST', { requestId: '00000000-0000-4000-8000-000000000000', packageId: 'pkg-2-5' }],
    ['payments/00000000-0000-4000-8000-000000000000/status', 'GET'],
    ['payments/00000000-0000-4000-8000-000000000000/close', 'POST', {}],
    ['game-sessions', 'POST', { mode: '1p' }],
    ['game-sessions/00000000-0000-4000-8000-000000000000/complete', 'POST', {}],
  ]) {
    assert.equal((await call(route, method, body, headers)).statusCode, 200);
    assert.equal(calls.at(-1).url, 'https://backend.example/api/' + route);
    assert.equal(calls.at(-1).headers['X-Machine-Key'], process.env.TOY_MACHINE_KEY);
    assert.equal(calls.at(-1).headers.cookie, undefined);
  }
  assert.equal((await call('payments/pix', 'POST', {}, { ...headers, origin: 'https://evil.example' })).statusCode, 403);
  assert.equal((await call('webhooks/mercadopago', 'POST', {}, headers)).statusCode, 404);
  assert.equal((await call('../admin', 'GET', undefined, headers)).statusCode, 404);
  assert.equal((await call('payments/packages', 'GET', undefined, { cookie: cookie.replace(/=\d+/, '=1') })).statusCode, 401);
  process.env.TERMINAL_ACCESS_KEY = 'new-key-'.repeat(8);
  assert.equal((await call('payments/packages', 'GET', undefined, headers)).statusCode, 401);
});

test('HTML fallback is an API routing error, never a not-ready catalog', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } }));
  await assert.rejects(request('/payments/packages'), /não retornou JSON/);
});
