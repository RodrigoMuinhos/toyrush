import http from "node:http";
const path = "/api/webhooks/mercadopago";
http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== path) { res.writeHead(404); res.end(); return; }
  if (req.method !== "POST") { res.writeHead(405); res.end(); return; }
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 65536) { res.writeHead(413); res.end(); return; }
      chunks.push(chunk);
    }
    const headers = { "Content-Type": "application/json" };
    for (const name of ["x-signature", "x-request-id"]) {
      if (typeof req.headers[name] === "string") headers[name] = req.headers[name];
    }
    const reply = await fetch(`http://127.0.0.1:8080${path}${url.search}`, {
      method: "POST", headers, body: Buffer.concat(chunks), signal: AbortSignal.timeout(20000), redirect: "error",
    });
    res.writeHead(reply.status, { "Content-Type": "application/json" });
    res.end(await reply.text());
  } catch { res.writeHead(502); res.end(); }
}).listen(18081, "127.0.0.1", () => console.log("Webhook proxy: 127.0.0.1:18081"));
