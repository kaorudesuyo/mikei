// 画面の枠まわり：ロゴ・レンズ切替・検索・時間の操作（PC＝タイムライン／スマホ＝ダイヤル）・字幕・起動演出・このアプリについて
import { useEffect, useMemo, useRef, useState } from "react";
import { get, set, setLens, subscribe, useStore, tQ } from "../store.js";
import { NOW, T_MIN, T_MAX, ASOF, YEARS, P, RANK, yearly, counts, inBlock, search, projects, blocks, clamp } from "../data/index.js";
import { haptic } from "./touch.js";

export const LENS = [
  { id: "time", label: "時間", lead: "いつ、どこに建つか。街の育ち方と人口の動きを時間で追う。" },
  { id: "dev", label: "施主", lead: "誰が街をつくっているか。デベロッパーの勢力図。" },
  { id: "con", label: "施工", lead: "誰が建てているか。建設会社と、施主との組み合わせ。" },
  { id: "cert", label: "環境認証", short: "認証", lead: "どの建物が、どの環境認証を取得した／取得していくか。" },
];

export const Icon = ({ d, size = 16, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
export const I = {
  play: "M7 4.5v15l12-7.5z", pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z", search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4", x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14", minus: "M5 12h14", home: "M4 11l8-7 8 7M6 10v9h12v-9", tilt: "M3 17l9-11 9 11zM12 6v11", info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  back: "M15 5l-7 7 7 7", ext: "M14 5h5v5M19 5l-8 8M11 7H6v11h11v-5", up: "M6 15l6-6 6 6",
};

export function Mark() {
  return (
    <svg className="mk" viewBox="0 0 96 96" aria-hidden="true">
      <line x1="20" y1="70" x2="76" y2="70" stroke="#3A3A44" strokeWidth="1.5" />
      {[[27, 54], [39, 44], [51, 35]].map(([x, y], i) => <line key={x} className={"mk-b b" + i} x1={x} y1="70" x2={x} y2={y} stroke="#F0EEE9" strokeWidth="3.4" strokeLinecap="round" />)}
      <line className="mk-b b3" x1="65" y1="70" x2="65" y2="22" stroke="#E0B25C" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="7 5.5" />
      <circle className="mk-d" cx="65" cy="18" r="3.6" fill="#E0B25C" />
    </svg>
  );
}

// ---- 時間を動かす共通の道具
let glideRaf = 0;
export function glideTo(to, dur = 520) {       // 指定の年へ、すっと滑らせる
  cancelAnimationFrame(glideRaf); const from = get().t, s = performance.now(); set({ playing: false });
  const f = (n) => { const k = Math.min(1, (n - s) / dur), e = 1 - Math.pow(1 - k, 3); set({ t: from + (to - from) * e }); if (k < 1) glideRaf = requestAnimationFrame(f); };
  glideRaf = requestAnimationFrame(f);
}
const togglePlay = () => { const S = get(); cancelAnimationFrame(glideRaf); if (S.intro) set({ intro: false }); if (!S.playing && S.t >= T_MAX - 0.05) set({ t: T_MIN }); set({ playing: !S.playing }); };
const phaseOf = (t) => (t < NOW - 0.3 ? "実績" : t <= NOW + 0.3 ? "現在" : "計画ベース");
const sliderKey = (e) => {
  const d = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1, PageDown: -5, PageUp: 5 }[e.key];
  if (d) { e.preventDefault(); set({ t: clamp(Math.round(get().t) + d * (e.shiftKey ? 5 : 1), T_MIN, T_MAX), playing: false }); }
  else if (e.key === "Home") set({ t: T_MIN, playing: false }); else if (e.key === "End") set({ t: T_MAX, playing: false }); else if (e.key === " ") { e.preventDefault(); togglePlay(); }
};
// 再生：1年を約1秒で進める。年が替わるたび、その年に竣工する最大の案件を字幕にする
export function usePlayback() {
  const playing = useStore((s) => s.playing);
  useEffect(() => {
    if (!playing) { const t = setTimeout(() => !get().playing && set({ cap: null }), 2600); return () => clearTimeout(t); }
    if (get().narrow && get().sheet > 0) set({ sheet: 0 });     // スマホでは街がよく見えるよう、シートを畳む
    let raf, last = performance.now(), yPrev = Math.floor(get().t);
    const step = (now) => {
      const dt = Math.min(64, now - last); last = now; const t = get().t + dt / 1050;
      if (t >= T_MAX) { set({ t: T_MAX, playing: false }); return; }
      const y = Math.floor(t);
      if (y !== yPrev) {
        yPrev = y; const due = inBlock(get().block).filter((p) => p.t1 != null && Math.floor(p.t1) === y);
        set({ t, cap: due.length ? { id: due.reduce((a, b) => ((b.gfa || 0) > (a.gfa || 0) ? b : a)).id, y, n: due.length, at: now } : get().cap });
      } else set({ t });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [playing]);
}
export function Caption() {
  const cap = useStore((s) => s.cap); if (!cap) return null; const p = P[cap.id];
  return (
    <button className="cap" key={cap.y} onClick={() => set({ playing: false, sel: p.id, cap: null })}>
      <b>{cap.y}</b><span>{p.sn}{cap.n > 1 && <i>ほか{cap.n - 1}件</i>}</span><em>竣工</em>
    </button>
  );
}

export function LensTabs() {
  const lens = useStore((s) => s.lens), narrow = useStore((s) => s.narrow);
  return (
    <nav className="lens" aria-label="見かたの切り替え">
      {LENS.map((l) => <button key={l.id} className={lens === l.id ? "on" : ""} aria-pressed={lens === l.id} onClick={() => { setLens(l.id); narrow && haptic(); }}>{narrow && l.short ? l.short : l.label}</button>)}
    </nav>
  );
}
export function Header({ onAbout }) {
  const narrow = useStore((s) => s.narrow);
  return (
    <header className="hd">
      <a className="brand" href="#time" onClick={(e) => { e.preventDefault(); setLens("time"); }} aria-label="未景 MIKEI"><Mark /><span className="brand-t"><b>未景</b><i>MIKEI</i></span></a>
      {!narrow && <LensTabs />}
      <div className="hd-r"><Search /><button className="ib" onClick={onAbout} aria-label="このアプリについて" title="このアプリについて"><Icon d={I.info} size={19} /></button></div>
    </header>
  );
}

// 何も入力していないときに出す近道（案件の多いエリアと、件数の多い施主）
const QUICK = [
  ...[...blocks].map((b) => ({ type: "エリア", label: b.name, sub: `${projects.filter((p) => p.b === b.id).length}件`, block: b.id, n: projects.filter((p) => p.b === b.id).length })).sort((a, b) => b.n - a.n).slice(0, 5),
  ...RANK.dev.slice(0, 4).map((e) => ({ type: "施主", label: e.name, sub: `${e.n}件`, name: e.name })),
];
function Search() {
  const [q, setQ] = useState(""), [open, setOpen] = useState(false), ref = useRef(null);
  const res = useMemo(() => (q ? search(q) : QUICK), [q]);
  const close = () => { setQ(""); setOpen(false); ref.current && ref.current.blur(); };
  const pick = (r) => {
    if (r.id) set({ sel: r.id }); else if (r.block) set({ block: r.block, company: null });
    else { setLens(r.type === "施主" ? "dev" : "con"); set({ company: r.name, block: null, sheet: get().narrow ? 1 : 0 }); }
    close();
  };
  useEffect(() => {
    const k = (e) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); setOpen(true); setTimeout(() => ref.current && ref.current.focus(), 0); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className={"sr" + (open ? " open" : "")}>
      <button className="ib sr-t" onClick={() => { setOpen(true); setTimeout(() => ref.current && ref.current.focus(), 30); }} aria-label="検索"><Icon d={I.search} size={19} /></button>
      <div className="sr-p">
        <div className="sr-row">
          <label className="sr-f"><Icon d={I.search} size={16} />
            <input id="q" ref={ref} value={q} maxLength={40} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" enterKeyHint="search" placeholder="案件・企業・エリアを探す" aria-label="案件・企業・エリアを探す"
              onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => !get().narrow && setOpen(false), 160)}
              onKeyDown={(e) => { if (e.key === "Enter" && q && res[0]) pick(res[0]); if (e.key === "Escape") close(); }} />
          </label>
          <button className="sr-x" onClick={close}>閉じる</button>
        </div>
        {open && (
          <ul className="sr-l" role="listbox">
            {!q && <li className="cap-l">よく見られているところ</li>}
            {q && res.length === 0 && <li className="none">見つかりませんでした</li>}
            {res.map((r, i) => <li key={i} role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)}><em>{r.type}</em><b>{r.label}</b><span>{r.sub}</span></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- PC：タイムライン（全期間を一望して、つかんで動かす）
export function Timeline() {
  const playing = useStore((s) => s.playing), block = useStore((s) => s.block), year = useStore((s) => Math.floor(s.t)), tq = useStore(tQ);
  const track = useRef(null), thumb = useRef(null), fill = useRef(null);
  const list = useMemo(() => inBlock(block), [block]);
  const bars = useMemo(() => { const a = yearly(list), m = Math.max(1, ...a.map((x) => x.gfa)); return a.map((x) => ({ ...x, k: x.gfa / m })); }, [list]);
  const c = useMemo(() => counts(list, tq), [list, tq]);
  const pos = (t) => ((t - T_MIN) / (T_MAX - T_MIN)) * 100;
  useEffect(() => {
    const paint = () => { const p = pos(get().t) + "%"; if (thumb.current) thumb.current.style.left = p; if (fill.current) fill.current.style.width = p; };
    paint(); return subscribe(paint);
  }, []);
  const seek = (e) => { const r = track.current.getBoundingClientRect(); cancelAnimationFrame(glideRaf); set({ t: T_MIN + clamp((e.clientX - r.left) / r.width, 0, 1) * (T_MAX - T_MIN), playing: false, intro: false }); };
  return (
    <footer className="tl">
      <button className="tl-play" onClick={togglePlay} aria-label={playing ? "一時停止" : "時間を進める"}><Icon d={playing ? I.pause : I.play} size={20} fill="currentColor" /></button>
      <div className="tl-y" aria-live="off"><b>{year}</b><span className={tq > NOW + 0.3 ? "fut" : ""}>{phaseOf(tq)}</span></div>
      <div className="tl-main">
        <div className="tl-track" ref={track} role="slider" tabIndex={0} aria-label="表示する年" aria-valuemin={T_MIN} aria-valuemax={T_MAX} aria-valuenow={year} aria-valuetext={`${year}年`}
          onKeyDown={sliderKey} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seek(e); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) seek(e); }}>
          <div className="tl-bars" aria-hidden="true">{bars.slice(0, -1).map((b) => <i key={b.y} className={b.y + 0.5 > NOW ? "f" : ""} style={{ left: pos(b.y) + "%", height: Math.max(b.gfa ? 6 : 0, b.k * 100) + "%" }} title={`${b.y}年 竣工 ${b.n}件`} />)}</div>
          <div className="tl-base"><div className="tl-fill" ref={fill} /></div>
          <div className="tl-now" style={{ left: pos(NOW) + "%" }}><span>今</span></div>
          <div className="tl-thumb" ref={thumb} />
          <div className="tl-ticks" aria-hidden="true">{YEARS.filter((y) => y % 5 === 0).map((y) => <span key={y} style={{ left: pos(y) + "%" }}>{y}</span>)}</div>
        </div>
      </div>
      <div className="tl-c" aria-label="この時点の内訳">
        <span><b>{c.done}</b>竣工済</span><span className="g"><b>{c.wip}</b>工事中</span><span className="g2"><b>{c.plan + c.tbd}</b>計画</span>
        <button className="tl-nowb" onClick={() => glideTo(NOW)} disabled={Math.abs(tq - NOW) < 0.3}>今に戻る</button>
      </div>
    </footer>
  );
}

// ---- スマホ：時間のダイヤル。目盛りを指で送る。年は中央の針で読む。慣性つき、年をまたぐたびに小さな手応え
const PX = 56; // 1年の幅(px)
function Dial() {
  const playing = useStore((s) => s.playing), block = useStore((s) => s.block), year = useStore((s) => Math.floor(s.t)), tq = useStore(tQ);
  const wrap = useRef(null), strip = useRef(null);
  const bars = useMemo(() => { const a = yearly(inBlock(block)), m = Math.max(1, ...a.map((x) => x.gfa)); return a.map((x) => ({ ...x, k: x.gfa / m })); }, [block]);
  useEffect(() => {
    const paint = () => { if (strip.current) strip.current.style.transform = `translate3d(${(-(get().t - T_MIN) * PX).toFixed(1)}px,0,0)`; };
    paint(); return subscribe(paint);
  }, []);
  useEffect(() => {
    const el = wrap.current; let drag = false, moved = false, x0 = 0, t0 = 0, lastX = 0, lastT = 0, v = 0, raf = 0, tick = Math.floor(get().t);
    const put = (t) => { const c = clamp(t, T_MIN, T_MAX), y = Math.floor(c + 0.5); if (y !== tick) { tick = y; haptic(); } set({ t: c }); };
    const down = (e) => { if (e.button) return; cancelAnimationFrame(raf); cancelAnimationFrame(glideRaf); drag = true; moved = false; x0 = lastX = e.clientX; lastT = e.timeStamp; v = 0; t0 = get().t; el.setPointerCapture(e.pointerId); set({ playing: false, intro: false }); };
    const move = (e) => {
      if (!drag) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; if (!moved) return;
      const dt = Math.max(1, e.timeStamp - lastT); v = v * 0.55 + ((lastX - e.clientX) / PX / dt) * 0.45; lastX = e.clientX; lastT = e.timeStamp; put(t0 - dx / PX);
    };
    const up = (e) => {
      if (!drag) return; drag = false;
      if (!moved) { const r = el.getBoundingClientRect(); glideTo(clamp(Math.round(get().t + (e.clientX - (r.left + r.width / 2)) / PX), T_MIN, T_MAX), 380); return; }   // 目盛りをタップ：その年へ
      if (e.timeStamp - lastT > 90) v = 0;
      let last = performance.now();
      const f = (n) => { const dt = Math.min(48, n - last); last = n; v *= Math.pow(0.95, dt / 16.7); const t = get().t + v * dt; put(t); if (t > T_MIN && t < T_MAX && Math.abs(v) > 0.00035) raf = requestAnimationFrame(f); };
      if (Math.abs(v) > 0.0006) raf = requestAnimationFrame(f);
    };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
  }, []);
  return (
    <div className="dial">
      <div className="dial-y" aria-live="off"><b>{year}</b><span className={tq > NOW + 0.3 ? "fut" : ""}>{phaseOf(tq)}</span></div>
      <div className="dial-r" ref={wrap} role="slider" tabIndex={0} aria-label="表示する年" aria-valuemin={T_MIN} aria-valuemax={T_MAX} aria-valuenow={year} aria-valuetext={`${year}年`} onKeyDown={sliderKey}>
        <div className="dial-s" ref={strip} aria-hidden="true">
          {bars.slice(0, -1).map((b) => <i key={b.y} className={b.y + 0.5 > NOW ? "f" : ""} style={{ left: (b.y - T_MIN) * PX + 3 + "px", height: Math.max(b.gfa ? 4 : 0, b.k * 26) + "px" }} />)}
          {YEARS.map((y) => <span key={y} className={y % 5 === 0 ? "maj" : ""} style={{ left: (y - T_MIN) * PX + "px" }}>{y % 5 === 0 ? y : ""}</span>)}
          <em style={{ left: (NOW - T_MIN) * PX + "px" }}>今</em>
        </div>
        <div className="dial-n" aria-hidden="true" />
      </div>
      <button className="dial-play" onClick={() => { togglePlay(); haptic(); }} aria-label={playing ? "一時停止" : "時間を進める"}><Icon d={playing ? I.pause : I.play} size={18} fill="currentColor" /></button>
      <button className="dial-now" onClick={() => { glideTo(NOW); haptic(); }} disabled={Math.abs(tq - NOW) < 0.3} aria-label="今に戻る">今</button>
    </div>
  );
}
// スマホの下端：時間のダイヤルと、見かたの切り替え（親指の届く位置にまとめる）
export function Dock() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current, apply = () => document.documentElement.style.setProperty("--dock", el.offsetHeight + "px");
    apply(); const ro = new ResizeObserver(apply); ro.observe(el); return () => ro.disconnect();
  }, []);
  return <footer className="dock" ref={ref}><Dial /><LensTabs /></footer>;
}

export function MapButtons({ api }) {
  const narrow = useStore((s) => s.narrow);
  if (!api) return null;
  return (
    <div className="mb">
      {!narrow && <button onClick={() => api.zoom(1)} aria-label="拡大"><Icon d={I.plus} /></button>}
      {!narrow && <button onClick={() => api.zoom(-1)} aria-label="縮小"><Icon d={I.minus} /></button>}
      <button onClick={api.north} aria-label="真上から／斜めから" title="真上から／斜めから"><Icon d={I.tilt} size={narrow ? 18 : 16} /></button>
      <button onClick={api.home} aria-label="全域に戻る" title="全域に戻る"><Icon d={I.home} size={narrow ? 18 : 16} /></button>
    </div>
  );
}

export function Intro() {
  const on = useStore((s) => s.intro), [gone, setGone] = useState(false);
  useEffect(() => { if (!on) { const t = setTimeout(() => setGone(true), 900); return () => clearTimeout(t); } }, [on]);
  if (gone) return null;
  return (
    <div className={"intro" + (on ? "" : " out")} onClick={() => set({ intro: false })} role="presentation">
      <div className="intro-c"><Mark /><h1>未景</h1><p className="rom">MIKEI</p><p className="tagline">まだない街を、見に行く。</p></div>
    </div>
  );
}

// 初回だけ出す、ひとことの手引き
export function Hint() {
  const intro = useStore((s) => s.intro), playing = useStore((s) => s.playing), narrow = useStore((s) => s.narrow), [show, setShow] = useState(false);
  useEffect(() => {
    if (intro) return; let seen = false; try { seen = localStorage.getItem("mikei.hint") === "1"; } catch { /* 保存できない環境 */ }
    if (seen) return; const a = setTimeout(() => setShow(true), 500), t = setTimeout(() => setShow(false), 12500); return () => { clearTimeout(a); clearTimeout(t); };
  }, [intro]);
  useEffect(() => {
    if (!show) return; const done = () => { setShow(false); try { localStorage.setItem("mikei.hint", "1"); } catch { /* 無視 */ } };
    if (playing) { done(); return; }
    const t = setTimeout(() => window.addEventListener("pointerdown", done, { once: true }), 900);   // 何か操作を始めたら引っ込める
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", done); };
  }, [playing, show]);
  if (!show) return null;
  return narrow
    ? <div className="hint" role="status"><b>目盛りを左右に送ると、時間が動きます。</b>▶ で2050年まで自動再生。光の柱をタップすると詳細。</div>
    : <div className="hint" role="status"><b>▶ を押すと、2050年まで街が育ちます。</b>年をつかんで動かすこともできます。柱をクリックすると案件の詳細。</div>;
}

export function About({ onClose }) {
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const n = projects.length;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="このアプリについて" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-c">
        <button className="ib close" onClick={onClose} aria-label="閉じる"><Icon d={I.x} size={18} /></button>
        <h2>未景 <i>MIKEI</i></h2>
        <p className="lead">首都圏の再開発 {n} 件を、時間の流れで読む地図です。東京・神奈川・埼玉・千葉の {blocks.length} エリアを対象に、オフィスまたは集合住宅を含む再開発を収録しています。</p>
        <h3>読みかた</h3>
        <ul>
          <li><b>光の柱</b>が1件の再開発です。高さは建物の高さ、太さは延床面積を表します。</li>
          <li><b>白</b>は竣工済、<b>金</b>はこれからの街（実線＝工事中、破線＝計画）。点線の輪は竣工時期が未定の計画です。</li>
          <li>地面の色は、エリアを代表する市区の人口の増減（2020年＝100）。暖色が増加、寒色が減少です。</li>
          <li>4つの見かた（時間・施主・施工・環境認証）で、同じ地図を違う角度から読めます。</li>
          <li>地図は1本指で移動、2本指でつまんで拡大、2本指を上下に動かすと傾き、ひねると向きが変わります。</li>
        </ul>
        <h3>データについて</h3>
        <ul>
          <li>基準日 {ASOF}。将来の竣工時期は事業者の公表予定で、変更されることがあります。</li>
          <li>案件ごとに確度（A＝一次資料／B＝専門メディア・専門データベース／C＝構想段階）と出典を示しています。重要な判断には一次資料をご確認ください。</li>
          <li>人口は国立社会保障・人口問題研究所「日本の地域別将来推計人口（令和5年推計）」。一部の市区は2020年と2050年の2時点を直線で結んでいます。</li>
          <li>企業の件数は、共同事業を各社に1件ずつ数えています。施主は企業グループ単位で束ねています。</li>
        </ul>
        <h3>基図の出典</h3>
        <ul className="cr">
          <li>行政区域：国土交通省 国土数値情報（行政区域データ）を、スマートニュース メディア研究所が加工したものを使用</li>
          <li>鉄道路線・駅：station_database（Seo-4d696b75）／CC BY-SA 4.0</li>
        </ul>
      </div>
    </div>
  );
}
