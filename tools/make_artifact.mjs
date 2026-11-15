// claude.ai のアーティファクト用ページを dist/ から作る（<head> を持たない本文だけの HTML ＋ assets/）
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), OUT = path.join(ROOT, "artifact");
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT); cpSync(path.join(ROOT, "dist/assets"), path.join(OUT, "assets"), { recursive: true });
const html = readFileSync(path.join(ROOT, "dist/index.html"), "utf8");
const tags = [...html.matchAll(/<(?:link|script)[^>]*(?:href|src)="\.\/assets\/[^"]+"[^>]*>(?:<\/script>)?/g)].map((m) => m[0].replace(/"\.\/assets\//g, '"assets/'));
const page = ['<title>未景 MIKEI</title>', '<meta name="claude:viewport-fit-sides" content="cover">', ...tags.filter((t) => t.startsWith("<link")), '<div id="root"></div>', ...tags.filter((t) => t.startsWith("<script"))].join("\n") + "\n";
writeFileSync(path.join(OUT, "mikei.html"), page);
console.log(page); console.log(readdirSync(path.join(OUT, "assets")).join("\n"));
