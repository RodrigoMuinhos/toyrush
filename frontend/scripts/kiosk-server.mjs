import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Run on the kiosk. Authentication stays in this process, never in the browser bundle.
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const key = process.env.TOY_MACHINE_KEY || "";
const target = new URL(process.env.PAYMENTS_API_TARGET || "http://127.0.0.1:8080");
const port = Number(process.env.KIOSK_PORT || 8444);
if (key.length < 32) throw new Error("Configure TOY_MACHINE_KEY (mínimo 32 caracteres).");
if (target.protocol !== "https:" && !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) {
  throw new Error("Backend remoto exige HTTPS.");
}
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".wav": "audio/wav" };
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  const fail = (status, message) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify({ message })); };
  try {
    if (!["127.0.0.1", "localhost"].some(host => req.headers.host === `${host}:${port}`)) return fail(403, "Host inválido");
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      if (url.pathname.startsWith("/api/webhooks/")) return fail(404, "Rota não disponível no terminal");
      if (!["GET", "POST"].includes(req.method)) return fail(405, "Método inválido");
      if (req.headers.origin && req.headers.origin !== url.origin) return fail(403, "Origem inválida");
      if (req.method === "POST" && !req.headers["content-type"]?.startsWith("application/json")) return fail(415, "JSON necessário");
      let body = "";
      for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) return fail(413, "Solicitação muito grande"); }
      const upstream = await fetch(new URL(url.pathname + url.search, target), {
        method: req.method, headers: { "X-Machine-Key": key, "Content-Type": "application/json" },
        body: req.method === "POST" ? body : undefined, signal: AbortSignal.timeout(25000), redirect: "error",
      });
      res.writeHead(upstream.status, { "Content-Type": "application/json" });
      res.end(await upstream.text()); return;
    }
    if (!["GET", "HEAD"].includes(req.method)) return fail(405, "Método inválido");
    let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) return fail(403, "Caminho inválido");
    try { if (!(await stat(path)).isFile()) path = resolve(root, "index.html"); }
    catch { if (extname(path)) return fail(404, "Arquivo não encontrado"); path = resolve(root, "index.html"); }
    const bytes = await readFile(path);
    res.writeHead(200, { "Content-Type": mime[extname(path)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch { if (!res.headersSent) fail(502, "Servidor indisponível. Tente novamente."); else res.end(); }
});
server.listen(port, "127.0.0.1", () => console.log(`Toy Factory: http://127.0.0.1:${port}`));
