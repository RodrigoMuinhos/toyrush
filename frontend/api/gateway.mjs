import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = '__Host-toy-terminal';
const TTL = 30 * 24 * 60 * 60;
const equal = (a, b) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
const sign = (value, key) => createHmac('sha256', key).update(value).digest('hex');
const allowed = (method, path) => method === 'GET'
  ? /^(payments\/packages|machine\/balance|payments\/[a-f0-9-]{36}\/status)$/.test(path)
  : method === 'POST' && /^(payments\/pix|game-sessions|payments\/[a-f0-9-]{36}\/close|game-sessions\/[a-f0-9-]{36}\/complete)$/.test(path);

// Only activated terminals can use this server-side proxy. Never forward browser headers.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const fail = (status, message) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ message })); };
  const env = process.env;
  const key = env.TOY_MACHINE_KEY || '';
  const activation = env.TERMINAL_ACCESS_KEY || '';
  let target;
  try { target = new URL(env.PAYMENTS_API_TARGET); } catch { return fail(503, 'Configure PAYMENTS_API_TARGET no servidor Vercel.'); }
  if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/' || target.search || target.hash
    || key.length < 32 || activation.length < 32 || equal(key, activation)) return fail(503, 'Configuração do terminal incompleta no servidor Vercel.');
  const url = new URL(req.url, 'https://terminal.invalid');
  const route = req.query?.route ?? url.searchParams.get('route') ?? url.pathname.replace(/^\/api\//, '');
  if (typeof route !== 'string') return fail(400, 'Rota inválida');
  const path = route.replace(/^\//, '');
  const origins = (env.TERMINAL_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (req.method === 'POST' && (!origin || !origins.includes(origin) || new URL(origin).host !== req.headers.host)) return fail(403, 'Origem inválida');
  if (origin && !origins.includes(origin)) return fail(403, 'Origem inválida');

  if (path === 'terminal') {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'");
      // 'same-origin' (not 'no-referrer'): a strict no-referrer policy also makes the
      // browser send Origin: null on the same-origin POST this form submits, which then
      // always fails the origin check below. 'same-origin' keeps the request's real
      // Origin for this same-origin submit while still stripping it for cross-origin use.
      res.setHeader('Referrer-Policy', 'same-origin');
      res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ativar terminal</title><h1>Ativar terminal Toy Factory</h1><p>Uso exclusivo do atendimento. Informe a chave de ativação deste terminal.</p><form method="post" action="/api/terminal"><label>Chave de ativação <input name="key" type="password" required minlength="32" maxlength="256" autocomplete="off"></label><button>Ativar</button></form><p><a href="/">Voltar ao jogo</a></p></html>');
      return;
    }
    if (req.method !== 'POST') return fail(405, 'Método inválido');
    const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body;
    if (typeof body?.key !== 'string' || body.key.length > 256 || !equal(body.key, activation)) return fail(401, 'Chave de ativação inválida');
    const expires = String(Math.floor(Date.now() / 1000) + TTL);
    res.setHeader('Set-Cookie', `${COOKIE}=${expires}.${sign(expires + ':' + key, activation)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`);
    res.statusCode = 303; res.setHeader('Location', '/'); res.end(); return;
  }
  if (!allowed(req.method, path)) return fail(404, 'Rota não disponível no terminal');
  const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || '';
  const [expires, signature] = cookie.split('.');
  const now = Math.floor(Date.now() / 1000);
  if (!/^\d+$/.test(expires || '') || Number(expires) <= now || Number(expires) > now + TTL || !signature || !equal(signature, sign(expires + ':' + key, activation))) {
    return fail(401, 'Terminal não ativado. Procure o atendimento.');
  }
  if (req.method === 'POST' && !req.headers['content-type']?.startsWith('application/json')) return fail(415, 'JSON necessário');
  const body = req.method === 'POST' ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})) : undefined;
  if (body && Buffer.byteLength(body) > 16384) return fail(413, 'Solicitação muito grande');
  try {
    const upstream = await fetch(new URL('/api/' + path, target), {
      method: req.method, headers: { 'X-Machine-Key': key, 'Content-Type': 'application/json' },
      body, redirect: 'error', signal: AbortSignal.timeout(18000),
    });
    if (!upstream.headers.get('content-type')?.includes('application/json')) return fail(502, 'Backend de pagamentos não retornou JSON.');
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(await upstream.text());
  } catch { return fail(502, 'Servidor de pagamentos indisponível. Tente novamente.'); }
}
