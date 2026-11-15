// 地図の上に重ねる 2D キャンバス。案件を「光の柱」として描き、ラベルと当たり判定も受け持つ。
// 基図（陸・境界・鉄道・人口の塗り）は MapLibre、案件の表現はここ、と役割を分けている。
import { projects, blocks, B, stateAt, lead, has, COLOR, bestCls, areaCerts, P, clamp, man } from "../data/index.js";

const IVORY = "#F0EEE9", GOLD = "#E0B25C", GREY = "#8E8C86", GREEN = "#57D6A4", SKY = "#6EA8FF";
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif';
const GOTHIC = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",system-ui,sans-serif';
const lerp = (a, b, t) => a + (b - a) * t;
function stops(z, s) {
  if (z <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) if (z <= s[i][0]) return lerp(s[i - 1][1], s[i][1], (z - s[i - 1][0]) / (s[i][0] - s[i - 1][0]));
  return s[s.length - 1][1];
}
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const byGfa = [...projects].sort((a, b) => (b.gfa || 0) - (a.gfa || 0));

export class Overlay {
  constructor(map, canvas, getState, geo) {
    this.map = map; this.cv = canvas; this.ctx = canvas.getContext("2d"); this.get = getState; this.geo = geo;
    this.beams = []; this.labelHits = []; this.w = 0; this.h = 0; this.wcache = new Map();
    this.rip = []; this.prevT = null;      // 竣工の瞬間の波紋（再生中のみ）
    this.reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.muniLabels = geo.muni.features.map((f) => ({ n: f.properties.s, ll: f.properties.c, a: f.properties.a })).sort((a, b) => b.a - a.a);
    this.resize();
  }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height; this.dpr = d;
    this.cv.width = Math.round(r.width * d); this.cv.height = Math.round(r.height * d);
    this.cv.style.width = r.width + "px"; this.cv.style.height = r.height + "px";
  }
  tw(text, font) {
    const k = font + "|" + text; let w = this.wcache.get(k);
    if (w == null) { this.ctx.font = font; w = this.ctx.measureText(text).width; this.wcache.set(k, w); }
    return w;
  }

  // 案件の見た目（色・不透明度）をレンズと選択状態から決める
  look(p, st, S) {
    let color = IVORY, a = 1, ghost = st.s === "plan" || st.s === "tbd";
    if (S.lens === "time") color = st.s === "done" ? IVORY : GOLD;
    else if (S.lens === "dev" || S.lens === "con") {
      if (S.company) { if (has(p, S.lens, S.company)) color = COLOR[S.lens][S.company] || SKY; else { color = GREY; a = 0.13; } }
      else { const l = lead(p, S.lens); if (!l) { color = GREY; a = 0.28; ghost = true; } else if (COLOR[S.lens][l]) color = COLOR[S.lens][l]; else { color = GREY; a = 0.5; } }
    } else if (S.lens === "cert") {
      const c = bestCls(p, S.sys);
      if (!c) { color = GREY; a = 0.14; } else { color = GREEN; if (c === "plan") ghost = true; else if (c === "pre") a = 0.72; }
    }
    if (S.block && p.b !== S.block) a *= 0.12;
    return { color, a, ghost };
  }

  draw(time) {
    const { ctx, map } = this, S = this.get(), W = this.w, H = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!map.loaded || !map.style) return;
    const z = map.getZoom(), pitch = (map.getPitch() * Math.PI) / 180;
    const pf = clamp(Math.sin(pitch) / Math.sin((50 * Math.PI) / 180), 0, 1.2), squash = Math.max(0.22, Math.cos(pitch));
    const hs = stops(z, [[8, 0.1], [10, 0.24], [12, 0.42], [14, 0.8], [16, 1.7]]) * pf;
    const ws = stops(z, [[8, 0.55], [10, 0.75], [12, 1.1], [14, 1.6], [16, 2.4]]);
    const pulse = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time / 420);
    const beams = [];
    for (const p of projects) {
      const q = map.project(p.ll);
      if (q.x < -60 || q.x > W + 60 || q.y < -20 || q.y > H + 400) continue;
      const st = stateAt(p, S.t), lk = this.look(p, st, S);
      const ds = pitch > 0.3 ? lerp(0.8, 1.12, clamp(q.y / H, 0, 1)) : 1;
      const full = Math.pow(p.h || 70, 0.92) * hs * ds;
      const w = (1.6 + Math.sqrt((p.gfa || 30000) / 1e6) * 6.5) * ws * ds;
      beams.push({ p, x: q.x, y: q.y, full, w, st, lk });
    }
    beams.sort((a, b) => a.y - b.y);
    this.beams = beams;
    // 再生中に竣工の時刻をまたいだ案件へ、波紋を1つ置く
    if (S.playing && this.prevT != null && S.t > this.prevT && S.t - this.prevT < 0.5 && !this.reduced) for (const b of beams) if (b.p.t1 != null && b.p.t1 > this.prevT && b.p.t1 <= S.t && b.lk.a > 0.3) this.rip.push({ id: b.p.id, at: time });
    this.prevT = S.t;

    // 街区一括の認証（認証レンズのみ）：対象案件の足元に二重の輪
    if (S.lens === "cert") {
      ctx.lineWidth = 1;
      for (const ac of areaCerts) {
        if (S.sys && ac.sys !== S.sys) continue;
        for (const id of ac.members) {
          const q = map.project(P[id].ll); const r = 15 * ws;
          ctx.strokeStyle = rgba(GREEN, 0.5); ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * squash, 0, 0, 7); ctx.stroke();
          ctx.strokeStyle = rgba(GREEN, 0.22); ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 1.45, r * 1.45 * squash, 0, 0, 7); ctx.stroke();
        }
      }
    }

    // --- 光のにじみ（加算合成）
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    for (const b of beams) {
      const { lk, st } = b; if (lk.a < 0.2) continue;
      const hgt = st.s === "done" ? b.full : st.s === "wip" ? b.full * st.k : 0;
      if (hgt < 0.5 && lk.ghost) continue;
      const g = ctx.createLinearGradient(0, b.y, 0, b.y - Math.max(hgt, 6));
      g.addColorStop(0, rgba(lk.color, 0.2 * lk.a)); g.addColorStop(1, rgba(lk.color, 0.02));
      ctx.strokeStyle = g; ctx.lineWidth = b.w * 2.6 + 3;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y - Math.max(hgt, 2)); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // --- 柱の本体
    for (const b of beams) {
      const { lk, st, p } = b, sel = S.sel === p.id, hov = S.hover === p.id;
      const a = sel || hov ? Math.max(lk.a, 0.95) : lk.a;
      const rx = b.w * 1.5 + 2, ry = Math.max(1.1, rx * squash);
      const solid = st.s === "done" ? b.full : st.s === "wip" ? b.full * st.k : 0;
      // 足元
      ctx.lineWidth = 1;
      if (st.s === "tbd") { ctx.setLineDash([1.5, 2.5]); ctx.strokeStyle = rgba(lk.color, 0.55 * a); ctx.beginPath(); ctx.ellipse(b.x, b.y, rx + 1.5, ry + 0.8, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      else if (solid > 0 && !lk.ghost) { ctx.fillStyle = rgba(lk.color, 0.3 * a); ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, 0, 7); ctx.fill(); }
      else { ctx.strokeStyle = rgba(lk.color, 0.6 * a); ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, 0, 7); ctx.stroke(); }
      if (b.full < 1.5) { // 真上から見たとき：点で示す
        if (st.s !== "tbd") { ctx.fillStyle = rgba(lk.color, (lk.ghost && solid === 0 ? 0.35 : 0.95) * a); ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(1.6, b.w * 0.7), 0, 7); ctx.fill(); }
        continue;
      }
      // 未着工・未定の高さ（計画上の姿）を破線で
      if (st.s !== "done" && st.s !== "tbd") {
        ctx.setLineDash([2, 3]); ctx.lineCap = "butt"; ctx.lineWidth = Math.max(1, b.w * 0.45);
        ctx.strokeStyle = rgba(lk.color, (st.s === "wip" ? 0.34 : 0.5) * a);
        ctx.beginPath(); ctx.moveTo(b.x, b.y - solid); ctx.lineTo(b.x, b.y - b.full); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = rgba(lk.color, 0.55 * a); ctx.fillRect(b.x - b.w * 0.5 - 1, b.y - b.full - 0.5, b.w + 2, 1);
      }
      if (st.s === "tbd") { ctx.setLineDash([1, 3]); ctx.lineWidth = 1; ctx.strokeStyle = rgba(lk.color, 0.4 * a); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y - b.full * 0.55); ctx.stroke(); ctx.setLineDash([]); }
      if (solid > 0) {
        const hollow = lk.ghost; // 例：認証が「取得予定」の竣工済ビルは輪郭だけ
        ctx.lineCap = "butt"; ctx.lineWidth = b.w;
        const g = ctx.createLinearGradient(0, b.y, 0, b.y - solid);
        g.addColorStop(0, rgba(lk.color, (hollow ? 0.3 : 0.62) * a)); g.addColorStop(1, rgba(lk.color, (hollow ? 0.45 : 1) * a));
        ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y - solid); ctx.stroke();
        if (st.s === "wip") { // 建設の先端：ゆっくり明滅
          ctx.fillStyle = rgba("#FFF3D6", (0.55 + 0.45 * pulse) * a); ctx.beginPath(); ctx.arc(b.x, b.y - solid, Math.max(1.6, b.w * 0.6) + pulse * 1.2, 0, 7); ctx.fill();
        } else { ctx.fillStyle = rgba("#FFFFFF", 0.9 * a); ctx.fillRect(b.x - b.w / 2, b.y - solid - 0.8, b.w, 1.6); }
      }
      if (sel) { ctx.strokeStyle = rgba(lk.color, 0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(b.x, b.y, rx + 6 + pulse * 2, (rx + 6 + pulse * 2) * squash, 0, 0, 7); ctx.stroke(); }
    }
    if (this.rip.length) {
      this.rip = this.rip.filter((r) => time - r.at < 1100);
      for (const r of this.rip) {
        const b = beams.find((x) => x.p.id === r.id); if (!b) continue; const k = (time - r.at) / 1100, e = 1 - Math.pow(1 - k, 3), rr = 4 + e * 24 * ws;
        ctx.strokeStyle = rgba("#FFFFFF", (1 - k) * 0.85); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(b.x, b.y - b.full, rr, Math.max(1.5, rr * squash), 0, 0, 7); ctx.stroke();
        ctx.fillStyle = rgba("#FFFFFF", (1 - k) * 0.95); ctx.beginPath(); ctx.arc(b.x, b.y - b.full, 1.5 + (1 - k) * 3.5, 0, 7); ctx.fill();
      }
    }
    this.labels(S, z, squash);
  }

  labels(S, z) {
    const { ctx, map } = this, W = this.w, H = this.h, placed = [], hits = [];
    const free = (x, y, w, h) => { for (const r of placed) if (x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]) return false; return true; };
    const put = (x, y, w, h) => placed.push([x - 3, y - 2, w + 6, h + 4]);
    ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const text = (t, x, y, font, color, halo = "rgba(8,8,10,.85)") => { ctx.font = font; ctx.lineWidth = 3; ctx.strokeStyle = halo; ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y); };
    const spaced = "letterSpacing" in ctx;

    // 選択・ホバー中の案件の吹き出し（最優先）
    const called = new Set();
    for (const id of [S.sel, S.hover, S.cap && S.playing ? S.cap.id : null]) {
      if (!id || called.has(id)) continue; called.add(id); const b = this.beams.find((x) => x.p.id === id); if (!b) continue;
      const f1 = `600 12.5px ${GOTHIC}`, f2 = `11px ${GOTHIC}`, t1 = b.p.sn, t2 = `${b.p.gfa ? "延床 " + man(b.p.gfa) + "㎡" : "延床 未公表"}・${b.p.y ? b.p.y + "年" : "時期未定"}`;
      const w = Math.max(this.tw(t1, f1), this.tw(t2, f2)) + 20, h = 42; let x = b.x + 12, y = b.y - Math.max(b.full, 10) - h / 2;
      if (x + w > W - 8) x = b.x - 12 - w; y = clamp(y, 8, H - h - 8);
      ctx.fillStyle = "rgba(17,17,22,.94)"; ctx.strokeStyle = id === S.sel ? "rgba(224,178,92,.9)" : "rgba(90,90,102,.9)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h); ctx.fill(); ctx.stroke();
      ctx.font = f1; ctx.fillStyle = IVORY; ctx.fillText(t1, x + 10, y + 14); ctx.font = f2; ctx.fillStyle = "#A19F97"; ctx.fillText(t2, x + 10, y + 30);
      put(x, y, w, h);
    }
    // エリア名（広域）
    if (z < 11.4) {
      if (spaced) ctx.letterSpacing = "1.6px";
      for (const bl of blocks) {
        const q = map.project(bl.ll); if (q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue;
        const on = S.block === bl.id, font = `${on ? 600 : 400} ${z < 9.4 ? 11.5 : 13}px ${MINCHO}`, w = this.tw(bl.short, font) + (spaced ? bl.short.length * 1.6 : 0), x = q.x - w / 2, y = q.y + 15;
        if (!free(x, y - 8, w, 16)) continue;
        text(bl.short, x, y, font, on ? GOLD : S.block ? "rgba(240,238,233,.45)" : "rgba(240,238,233,.9)"); put(x, y - 8, w, 16);
        hits.push({ x: x - 6, y: y - 12, w: w + 12, h: 24, block: bl.id });
      }
      if (spaced) ctx.letterSpacing = "0px";
    }
    // 案件名（寄ったとき。延床の大きい順に、重ならない範囲で）
    if (z >= 12.3) {
      const font = `11.5px ${GOTHIC}`; let n = 0;
      for (const p of byGfa) {
        if (n > 36) break; if (p.id === S.sel || p.id === S.hover) continue;
        const b = this.beams.find((x) => x.p === p); if (!b || b.lk.a < 0.3) continue;
        const w = this.tw(p.sn, font), x = b.x + b.w / 2 + 6, y = b.y - Math.max(b.full * (b.st.s === "wip" ? b.st.k : b.st.s === "done" ? 1 : 0.5), 4);
        if (x < 0 || x + w > W || y < 60 || y > H - 20 || !free(x, y - 7, w, 14)) continue;
        text(p.sn, x, y, font, rgba(b.lk.color === GREY ? "#CFCDC6" : "#F0EEE9", 0.92)); put(x, y - 7, w, 14); n++;
      }
    }
    // 駅名
    if (z >= 12.2) {
      const min = z >= 13.8 ? 1 : z >= 13 ? 2 : 4, font = `10.5px ${GOTHIC}`;
      for (const s of this.geo.stations) {
        if (s[3] < min) break;
        const q = map.project([s[1], s[2]]); if (q.x < 0 || q.x > W || q.y < 50 || q.y > H) continue;
        ctx.fillStyle = "rgba(207,205,198,.55)"; ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
        const w = this.tw(s[0], font); if (!free(q.x + 5, q.y - 6, w, 12)) continue;
        text(s[0], q.x + 5, q.y, font, "rgba(207,205,198,.66)"); put(q.x + 5, q.y - 6, w, 12);
      }
    }
    // 市区町村名
    if (z >= 10.3 && z < 14.2) {
      if (spaced) ctx.letterSpacing = "2px"; const font = `11px ${MINCHO}`;
      for (const m of this.muniLabels) {
        const q = map.project(m.ll); if (q.x < 0 || q.x > W || q.y < 50 || q.y > H) continue;
        const w = this.tw(m.n, font) + (spaced ? m.n.length * 2 : 0), x = q.x - w / 2; if (!free(x, q.y - 7, w, 14)) continue;
        text(m.n, x, q.y, font, "rgba(161,159,151,.5)", "rgba(8,8,10,.6)"); put(x, q.y - 7, w, 14);
      }
      if (spaced) ctx.letterSpacing = "0px";
    }
    this.labelHits = hits;
  }

  // 画面座標 → 案件 or エリア
  hit(x, y) {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]; if (b.lk.a < 0.1) continue;
      const top = b.y - Math.max(b.full, 6) - 7, half = Math.max(b.w / 2 + 6, 10);
      if (Math.abs(x - b.x) <= half && y >= top && y <= b.y + 9) return { project: b.p.id };
    }
    for (const r of this.labelHits) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { block: r.block };
    return null;
  }
}
export { B };
