// データベース（Excel）から tools/build_data.py が生成した db.json を読み、表示用の索引を作る。
import db from "./db.json";

export const NOW = db.meta.now;         // 基準日（年小数）
export const ASOF = db.meta.asof;
export const T_MIN = 2020, T_MAX = 2050;
export const projects = db.projects;
export const blocks = db.blocks;
export const areaCerts = db.areaCerts;
export const sources = db.sources;
export const groups = db.meta.groups;
export const P = Object.fromEntries(projects.map((p) => [p.id, p]));
export const B = Object.fromEntries(blocks.map((b) => [b.id, b]));
export const PREFS = ["東京都", "神奈川県", "埼玉県", "千葉県"];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmt = (n) => (n == null ? "—" : Math.round(n).toLocaleString("ja-JP"));
export const man = (n) => (n == null ? "—" : n >= 1e6 ? (n / 1e4).toLocaleString("ja-JP", { maximumFractionDigits: 0 }) + "万" : (n / 1e4).toFixed(1) + "万");

// ---- 時点 t での案件の状態
// done: 竣工済 / wip: 工事中（progress 0..1）/ plan: 着工前 / tbd: 竣工時期が未定（常に計画表示）
export function stateAt(p, t) {
  if (p.t1 == null) return { s: "tbd", k: 0 };
  if (t >= p.t1) return { s: "done", k: 1 };
  if (p.t0 != null && t >= p.t0) return { s: "wip", k: clamp((t - p.t0) / (p.t1 - p.t0), 0.02, 1) };
  return { s: "plan", k: 0 };
}
export const ST_LABEL = { done: "竣工済", wip: "工事中", plan: "計画", tbd: "時期未定" };

// ---- 人口（ブロックの代表市区）。5年ごとの推計を線形に補間する。中間年が無い市区は2020年と2050年を結ぶ。
const popByUnit = {};
for (const b of blocks) if (!popByUnit[b.unit]) popByUnit[b.unit] = { pop: b.pop, note: b.popNote, pts: b.pop.map((v, i) => [2020 + i * 5, v]).filter((x) => x[1] != null) };
export const popUnits = popByUnit;
export function popAt(unit, t) {
  const u = popByUnit[unit]; if (!u) return null;
  const pts = u.pts; const x = clamp(t, pts[0][0], pts[pts.length - 1][0]);
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}
export const popIndex = (unit, t) => { const v = popAt(unit, t); return v == null ? null : (v / popByUnit[unit].pts[0][1]) * 100; };

// ---- 企業の集計（施主＝企業グループ、施工＝施工会社）。共同事業は各社に1件ずつ計上する。
const keyOf = (kind) => (kind === "dev" ? "dg" : "cg");
export function rank(kind, list = projects) {
  const k = keyOf(kind), m = new Map();
  for (const p of list) for (const name of p[k]) {
    let e = m.get(name); if (!e) m.set(name, (e = { name, n: 0, gfa: 0, ps: [], byBlock: {} }));
    e.n++; e.gfa += p.gfa || 0; e.ps.push(p); e.byBlock[p.b] = (e.byBlock[p.b] || 0) + 1;
  }
  return [...m.values()].sort((a, b) => b.n - a.n || b.gfa - a.gfa);
}
export const RANK = { dev: rank("dev"), con: rank("con") };
// 地図の色分けに使う上位8社（全域の順位で固定。エリアを絞っても色は変わらない）
export const PALETTE = ["#6EA8FF", "#FF8A73", "#5FD6B3", "#B796FF", "#F58FC1", "#A6D85C", "#4FC7E8", "#E8C9A0"];
export const COLOR = { dev: {}, con: {} };
for (const kind of ["dev", "con"]) RANK[kind].slice(0, 8).forEach((e, i) => (COLOR[kind][e.name] = PALETTE[i]));
// 案件の「代表企業」＝参加企業のうち全域順位が最も高い企業（色分け用）
const order = { dev: Object.fromEntries(RANK.dev.map((e, i) => [e.name, i])), con: Object.fromEntries(RANK.con.map((e, i) => [e.name, i])) };
export function lead(p, kind) {
  const a = p[keyOf(kind)]; if (!a.length) return null;
  return a.reduce((x, y) => (order[kind][y] < order[kind][x] ? y : x));
}
export const has = (p, kind, name) => p[keyOf(kind)].includes(name);
// 相手方（施主→施工会社、施工会社→施主）の件数
export function partners(kind, name) {
  const other = kind === "dev" ? "con" : "dev", m = new Map();
  for (const p of projects) if (has(p, kind, name)) for (const o of p[keyOf(other)]) m.set(o, (m.get(o) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ name: n, n: c }));
}
export function topBlocks(e, n = 3) {
  return Object.entries(e.byBlock).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, c]) => ({ id, name: B[id].short, n: c }));
}

// ---- 環境認証
export const SYSTEMS = [
  { code: "LEED", name: "LEED", desc: "米国発の国際的な環境性能評価。プラチナが最高位" },
  { code: "WELL", name: "WELL", desc: "働く人・住む人の健康と快適さを評価する国際認証" },
  { code: "CASBEE", name: "CASBEE", desc: "日本の建築環境総合性能評価。Sランクが最高位" },
  { code: "SWO", name: "CASBEE-スマートウェルネスオフィス", short: "CASBEE-SWO", desc: "オフィスの健康性・知的生産性と環境性能をあわせて評価" },
  { code: "CASBEE-WO", name: "CASBEE-ウェルネスオフィス", short: "CASBEE-WO", desc: "オフィスで働く人の健康・快適性を評価" },
  { code: "ZEB", name: "ZEB", desc: "年間の一次エネルギー消費を大幅に削減した建築物（Ready／Oriented など）" },
  { code: "ZEH", name: "ZEH-M", desc: "集合住宅版のゼロ・エネルギー住宅" },
  { code: "BELS", name: "BELS", desc: "建築物の省エネルギー性能を星の数で表示する制度" },
  { code: "DBJ", name: "DBJ Green Building", short: "DBJ GB", desc: "日本政策投資銀行による、環境・社会への配慮がある不動産の認証" },
  { code: "SITES", name: "SITES", desc: "ランドスケープ（外構・緑地）の持続可能性を評価する国際認証" },
];
export const SYS = Object.fromEntries(SYSTEMS.map((s) => [s.code, s]));
export const CLS = { got: "取得済", pre: "予備認証", plan: "取得予定" };
export const CLS_ORDER = ["got", "pre", "plan"];
const AC = Object.fromEntries(areaCerts.map((a) => [a.id, a]));
export const ACERT = AC;
// 案件の認証一覧（棟単位＋街区一括）。sys を指定するとその制度だけ。
export function certsOf(p, sys) {
  const a = p.certs.map((c) => ({ ...c, area: false }));
  for (const id of p.ac) { const c = AC[id]; a.push({ sys: c.sys, scope: c.scope, rank: c.rank, stage: c.stages, cls: /本認証|認証取得|Built/.test(c.stages) ? "got" : "pre", area: true, areaName: c.area, id }); }
  return sys ? a.filter((c) => c.sys === sys) : a;
}
// 最も進んだ段階（got > pre > plan）
export function bestCls(p, sys) {
  const cs = certsOf(p, sys); if (!cs.length) return null;
  return CLS_ORDER.find((k) => cs.some((c) => c.cls === k));
}

// ---- 年ごとの竣工延床（タイムラインの背景）と累計
export const YEARS = Array.from({ length: T_MAX - T_MIN + 1 }, (_, i) => T_MIN + i);
export function yearly(list = projects) {
  const a = YEARS.map((y) => ({ y, gfa: 0, n: 0 }));
  for (const p of list) if (p.t1 != null) { const i = Math.floor(p.t1) - T_MIN; if (a[i]) { a[i].gfa += p.gfa || 0; a[i].n++; } }
  return a;
}
export function counts(list, t) {
  const c = { done: 0, wip: 0, plan: 0, tbd: 0, gfa: 0, units: 0 };
  for (const p of list) { const s = stateAt(p, t).s; c[s]++; if (s === "done") { c.gfa += p.gfa || 0; c.units += p.units || 0; } }
  return c;
}
export const inBlock = (block) => (block ? projects.filter((p) => p.b === block) : projects);

// ---- 検索
const norm = (s) => s.toLowerCase().replace(/[\s　・（）()]/g, "");
const INDEX = [
  ...projects.map((p) => ({ type: "案件", label: p.sn, sub: `${B[p.b].short}・${p.city}`, key: norm(p.n + p.city + p.devs.join("")), id: p.id })),
  ...RANK.dev.map((e) => ({ type: "施主", label: e.name, sub: `${e.n}件`, key: norm(e.name + (groups[e.name] || []).join("")), name: e.name })),
  ...RANK.con.map((e) => ({ type: "施工", label: e.name, sub: `${e.n}件`, key: norm(e.name), name: e.name })),
  ...blocks.map((b) => ({ type: "エリア", label: b.name, sub: b.pref, key: norm(b.name + b.area), block: b.id })),
];
export function search(q, limit = 12) {
  const k = norm(q.slice(0, 40)); if (!k) return [];
  const out = []; for (const e of INDEX) { if (e.key.includes(k)) out.push(e); if (out.length >= limit) break; }
  return out;
}
// 出典リンクは https のみ（生成時にも検査済み。描画時にも二重に確認する）
export const safeHref = (u) => (typeof u === "string" && /^https:\/\/[a-z0-9.-]+(\/|$)/i.test(u) ? u : null);
