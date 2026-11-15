// 検証用の静的サーバー。本番と同じセキュリティヘッダーを付けて dist/ を配信する（外部には公開しない：127.0.0.1 のみ）。
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
export const CSP = "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests";
export const HEADERS = {
  "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Resource-Policy": "same-origin", "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8" };

export function start(port = 4173) {
  const server = http.createServer(async (req, res) => {
    const send = (code, body, type = "text/plain; charset=utf-8", extra = {}) => { res.writeHead(code, { ...HEADERS, "Content-Type": type, ...extra }); res.end(body); };
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "Method Not Allowed", undefined, { Allow: "GET, HEAD" });
    let p; try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(400, "Bad Request"); }
    if (p.includes("\0") || /(^|\/)\./.test(p)) return send(404, "Not Found");               // ドットファイルは配信しない
    const file = path.resolve(ROOT, "." + (p.endsWith("/") ? p + "index.html" : p));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return send(404, "Not Found");     // ディレクトリ外への到達を拒否
    try {
      if (!(await stat(file)).isFile()) return send(404, "Not Found");
      const type = TYPES[path.extname(file)]; if (!type) return send(404, "Not Found");       // 許可した拡張子だけ配信（.php などは存在しても返さない）
      send(200, req.method === "HEAD" ? "" : await readFile(file), type, { "Cache-Control": /assets\//.test(p) ? "public, max-age=31536000, immutable" : "no-cache" });
    } catch { send(404, "Not Found"); }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const s = await start(Number(process.argv[2]) || 4173); console.log("http://127.0.0.1:" + s.address().port); }
