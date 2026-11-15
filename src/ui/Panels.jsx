// 左のパネル：レンズごとの読み解き。地図と同じ絞り込み（エリア・時点）に連動する。
import { useMemo, useRef, useState } from "react";
import { get, set, setLens, useStore, tQ } from "../store.js";
import { useSheet } from "./touch.js";
import { projects, blocks, B, PREFS, T_MIN, T_MAX, NOW, YEARS, inBlock, counts, yearly, stateAt, ST_LABEL, popAt, popUnits, rank, RANK, COLOR, partners, topBlocks, has, groups,
  SYSTEMS, SYS, CLS, CLS_ORDER, certsOf, bestCls, areaCerts, fmt, man } from "../data/index.js";
import { Icon, I, LENS } from "./Chrome.jsx";

const useT = () => useStore(tQ);

function Scope() {
  const block = useStore((s) => s.block);
  return (
    <div className="scope">
      <label htmlFor="scope">エリア</label>
      <select id="scope" value={block || ""} onChange={(e) => set({ block: e.target.value || null, company: null })}>
        <option value="">首都圏 全域</option>
        {PREFS.map((pf) => <optgroup key={pf} label={pf}>{blocks.filter((b) => b.pref === pf).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>)}
      </select>
      {block && <button className="ib sm" onClick={() => set({ block: null })} aria-label="エリアの絞り込みを解除"><Icon d={I.x} size={14} /></button>}
    </div>
  );
}
const Dot = ({ s }) => <i className={"dot " + s} aria-hidden="true" />;
function Row({ p, t, right }) {
  const st = stateAt(p, t).s;
  return (
    <li><button className="prow" onClick={() => set({ sel: p.id })} onMouseEnter={() => set({ hover: p.id })} onMouseLeave={() => set({ hover: null })}>
      <Dot s={st} /><span className="n">{p.sn}</span><span className="m">{right || (p.y ? p.y : "未定")}</span>
    </button></li>
  );
}
const Bar = ({ k, color }) => <span className="bar"><i style={{ width: Math.max(2, k * 100) + "%", background: color }} /></span>;

// ============ 時間
function Spark({ pts, t, x0 = T_MIN, x1 = T_MAX, area, color = "#F0EEE9", h = 54 }) {
  const W = 300, ys = pts.map((p) => p[1]), lo = area ? 0 : Math.min(...ys), hi = Math.max(...ys, lo + 1), pad = 5;
  const X = (x) => ((x - x0) / (x1 - x0)) * W, Y = (y) => h - pad - ((y - lo) / (hi - lo)) * (h - pad * 2);
  const d = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {area && <path d={`${d} L${W} ${h} L0 ${h}Z`} fill={color} opacity=".1" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <line x1={X(NOW)} x2={X(NOW)} y1="0" y2={h} stroke="#5A5A66" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <line x1={X(t)} x2={X(t)} y1="0" y2={h} stroke="#E0B25C" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
function TimePanel() {
  const block = useStore((s) => s.block), t = useT(), year = Math.floor(t);
  const list = useMemo(() => inBlock(block), [block]);
  const c = counts(list, t);
  const cum = useMemo(() => { let s = 0; return [[T_MIN, 0], ...yearly(list).map((y) => [y.y + 1, (s += y.gfa)])]; }, [list]);
  const due = useMemo(() => list.filter((p) => p.t1 != null && Math.floor(p.t1) === year).sort((a, b) => (b.gfa || 0) - (a.gfa || 0)), [list, year]);
  const tbd = list.filter((p) => p.t1 == null).length;
  const b = block ? B[block] : null, u = b ? popUnits[b.unit] : null, pv = b ? popAt(b.unit, t) : null, base = u ? u.pts[0][1] : null;
  return (
    <>
      <div className="kpi">
        <div><b>{c.done}</b><span><Dot s="done" />竣工済</span></div>
        <div><b className="g">{c.wip}</b><span><Dot s="wip" />工事中</span></div>
        <div><b className="g">{c.plan + c.tbd}</b><span><Dot s="plan" />計画</span></div>
      </div>
      <section>
        <h3>竣工した延床面積の累計<em>{man(c.gfa)}㎡</em></h3>
        <Spark pts={cum} t={t} area />
        <p className="axis"><span>2020</span><span>2035</span><span>2050</span></p>
        {c.units > 0 && <p className="note">うち住宅 {fmt(c.units)} 戸（戸数が公表されている案件の合計）</p>}
      </section>
      <section>
        <h3>人口の動き{b && <em>{b.unit}</em>}</h3>
        {b ? (<>
          <p className="big">{fmt(pv)}<small>人</small><span className={pv >= base ? "up" : "down"}>{pv >= base ? "+" : ""}{((pv / base - 1) * 100).toFixed(1)}%<i>2020年比</i></span></p>
          <Spark pts={u.pts} t={t} color={u.pts[u.pts.length - 1][1] >= base ? "#D9A85A" : "#7C9BEA"} h={46} />
          <p className="note">{b.name}を代表する市区の将来推計人口。{u.pts.length < 7 && "この市区は2020年と2050年の2時点を直線で結んでいます。"}</p>
        </>) : (<>
          <div className="legend"><i /><p><span>減少</span><span>2020年と同じ</span><span>増加</span></p></div>
          <p className="note">地面の色は、各エリアを代表する市区の人口（2020年＝100）。エリアを選ぶと推移が見られます。</p>
        </>)}
      </section>
      <section>
        <h3>{year}年に竣工{due.length > 0 && <em>{due.length}件</em>}</h3>
        {due.length ? <ul className="plist">{due.slice(0, 8).map((p) => <Row key={p.id} p={p} t={t} right={p.gfa ? man(p.gfa) + "㎡" : "—"} />)}</ul> : <p className="note">この年に竣工する収録案件はありません。</p>}
        {due.length > 8 && <p className="note">ほか {due.length - 8} 件</p>}
        {tbd > 0 && <p className="note">竣工時期が未定の計画が {tbd} 件あります（地図では点線の輪）。</p>}
      </section>
      {b && <section><h3>このエリアの見立て</h3><p className="prose">{b.note}</p></section>}
    </>
  );
}

// ============ 施主・施工
function CompanyPanel({ kind }) {
  const block = useStore((s) => s.block), company = useStore((s) => s.company), t = useT(1), [all, setAll] = useState(false);
  const list = useMemo(() => inBlock(block), [block]);
  const rk = useMemo(() => rank(kind, list), [kind, list]);
  const none = list.filter((p) => !p[kind === "dev" ? "dg" : "cg"].length).length;
  const word = kind === "dev" ? "施主" : "施工会社";
  if (company) {
    const e = rank(kind, projects).find((x) => x.name === company); if (!e) return null;
    const ps = [...e.ps].filter((p) => !block || p.b === block).sort((a, b) => (a.t1 || 9999) - (b.t1 || 9999)), c = counts(ps, t), tb = topBlocks(e, 6), top = tb[0];
    const pt = partners(kind, company).slice(0, 6), share = Math.round((top.n / e.n) * 100), color = COLOR[kind][company] || "#6EA8FF";
    return (
      <>
        <button className="back" onClick={() => set({ company: null })}><Icon d={I.back} size={14} />{word}の一覧へ</button>
        <h2 className="co"><i style={{ background: color }} />{company}</h2>
        {groups[company] && groups[company].length > 1 && <p className="note">{groups[company].join("・")} を合算</p>}
        <p className="insight">{share >= 30 ? `${top.name}に${share}%（${top.n}件）が集中。` : `${Object.keys(e.byBlock).length}エリアに分散。最多は${top.name}の${top.n}件。`}関与する延床は合計 {man(e.gfa)}㎡。</p>
        <div className="kpi sm"><div><b>{c.done}</b><span><Dot s="done" />竣工済</span></div><div><b className="g">{c.wip}</b><span><Dot s="wip" />工事中</span></div><div><b className="g">{c.plan + c.tbd}</b><span><Dot s="plan" />計画</span></div></div>
        <section><h3>どのエリアに多いか</h3>
          <ul className="bars">{tb.map((x) => <li key={x.id}><button onClick={() => set({ block: x.id })}><span className="n">{x.name}</span><Bar k={x.n / top.n} color={color} /><span className="m">{x.n}件</span></button></li>)}</ul>
        </section>
        <section><h3>{kind === "dev" ? "施工を任せている会社" : "どの施主の仕事が多いか"}</h3>
          {pt.length ? <ul className="bars">{pt.map((x) => <li key={x.name}><button onClick={() => { setLens(kind === "dev" ? "con" : "dev"); set({ company: x.name }); }}><span className="n">{x.name}</span><Bar k={x.n / pt[0].n} color="#8E8C86" /><span className="m">{x.n}件</span></button></li>)}</ul>
            : <p className="note">組み合わせが分かる案件がまだありません。</p>}
          {kind === "dev" && <p className="note">施工会社が決まっている案件だけを数えています。</p>}
        </section>
        <section><h3>案件<em>{ps.length}件</em></h3><ul className="plist">{ps.map((p) => <Row key={p.id} p={p} t={t} />)}</ul></section>
      </>
    );
  }
  const max = rk.length ? rk[0].n : 1, shown = all ? rk : rk.slice(0, 10);
  return (
    <>
      <p className="note top">{kind === "dev" ? "柱の色は、その案件に参加する施主のうち件数が最も多い企業。上位8社に色を付けています。" : "柱の色は施工会社。上位8社に色を付けています。輪郭だけの柱は、施工会社が未定・未公表の案件です。"}</p>
      <ol className="rank">
        {shown.map((e, i) => {
          const tb = topBlocks(e, 2);
          return (
            <li key={e.name}><button onClick={() => set({ company: e.name, sheet: get().narrow ? 1 : 0 })}>
              <span className="r">{i + 1}</span><i className="chip" style={{ background: COLOR[kind][e.name] || "#4A4A54" }} />
              <span className="b"><span className="n">{e.name}</span><span className="s">{block ? `延床 ${man(e.gfa)}㎡` : tb.map((x) => `${x.name} ${x.n}`).join("・")}</span></span>
              <span className="v"><Bar k={e.n / max} color={COLOR[kind][e.name] || "#6B6A66"} /><b>{e.n}</b></span>
            </button></li>
          );
        })}
      </ol>
      {rk.length > 10 && <button className="more" onClick={() => setAll(!all)}>{all ? "上位10社に戻す" : `すべて表示（${rk.length}社）`}</button>}
      <p className="note">共同事業は各社に1件ずつ数えています。{none > 0 && `${word}が${kind === "dev" ? "公表されていない" : "未定・未公表の"}案件が ${none} 件あり、集計に含めていません。`}</p>
    </>
  );
}

// ============ 環境認証
function CertPanel() {
  const block = useStore((s) => s.block), sys = useStore((s) => s.sys), t = useT(1);
  const list = useMemo(() => inBlock(block), [block]);
  const rows = useMemo(() => SYSTEMS.map((s) => { const c = { got: 0, pre: 0, plan: 0 }; let n = 0; for (const p of list) { const b = bestCls(p, s.code); if (b) { c[b]++; n++; } } return { ...s, c, n }; }).filter((r) => r.n > 0).sort((a, b) => b.n - a.n), [list]);
  const tot = useMemo(() => { const c = { got: 0, pre: 0, plan: 0, any: 0 }; for (const p of list) { const b = bestCls(p); if (b) { c[b]++; c.any++; } } return c; }, [list]);
  const max = rows.length ? rows[0].n : 1;
  if (sys) {
    const ps = list.filter((p) => bestCls(p, sys)), s = SYS[sys];
    return (
      <>
        <button className="back" onClick={() => set({ sys: null })}><Icon d={I.back} size={14} />制度の一覧へ</button>
        <h2 className="co"><i style={{ background: "#57D6A4" }} />{s.name}</h2>
        <p className="insight">{s.desc}。</p>
        {CLS_ORDER.map((k) => { const g = ps.filter((p) => bestCls(p, sys) === k); if (!g.length) return null; return (
          <section key={k}><h3><i className={"st " + k} />{CLS[k]}<em>{g.length}件</em></h3>
            <ul className="plist">{g.map((p) => { const c = certsOf(p, sys).find((x) => x.cls === k); return <Row key={p.id} p={p} t={t} right={c && c.rank && c.rank !== "—" ? c.rank.replace(/（.*$/, "") : ""} />; })}</ul></section>); })}
      </>
    );
  }
  return (
    <>
      <div className="kpi"><div><b className="e">{tot.got}</b><span><i className="st got" />取得済</span></div><div><b className="e">{tot.pre}</b><span><i className="st pre" />予備認証</span></div><div><b className="e">{tot.plan}</b><span><i className="st plan" />取得予定</span></div></div>
      <p className="note top">認証のある案件は {tot.any} 件（{list.length} 件中）。緑の柱が認証取得済、輪郭だけの柱は取得予定です。足元の二重の輪は、街区まるごとの認証。</p>
      <ol className="rank cert">
        {rows.map((r) => (
          <li key={r.code}><button onClick={() => set({ sys: r.code, sheet: get().narrow ? 1 : 0 })}>
            <span className="b"><span className="n">{r.short || r.name}</span><span className="s">{r.desc}</span></span>
            <span className="v"><span className="sw"><span className="bar stack" style={{ width: Math.max(14, (r.n / max) * 100) + "%" }}>{CLS_ORDER.map((k) => r.c[k] > 0 && <i key={k} className={k} style={{ flex: r.c[k] }} />)}</span></span><b>{r.n}</b></span>
          </button></li>
        ))}
      </ol>
      {!block && <section><h3>街区まるごとの認証<em>{areaCerts.length}件</em></h3>
        <ul className="plist">{areaCerts.map((a) => <li key={a.id}><button className="prow" onClick={() => set({ sel: a.members[0] })}><i className="st got" /><span className="n">{a.area}</span><span className="m">{SYS[a.sys].short || SYS[a.sys].name}{a.rank !== "—" ? " " + a.rank : ""}</span></button></li>)}</ul></section>}
      <p className="note">棟ごとの認証と、街区一括の認証を分けて数えています。2026年11月に追加収録した案件は、認証の情報がまだ少なく、今後増える見込みです。</p>
    </>
  );
}

// スマホ：畳んだシートに出す1行の要約（いま見ている条件での答え）
const brief = (n) => n.replace(/グループ$|コーポレーション$/, "");
function Peek({ lens, open }) {
  const block = useStore((s) => s.block), company = useStore((s) => s.company), sys = useStore((s) => s.sys), t = useT();
  const list = useMemo(() => inBlock(block), [block]);
  let body;
  if (open) body = <span className="nm ttl">{LENS.find((l) => l.id === lens).label}</span>;      // 開いているあいだは見出しだけ（中身と重複させない）
  else if (lens === "time") { const c = counts(list, t); body = <><span><Dot s="done" /><b>{c.done}</b>竣工済</span><span><Dot s="wip" /><b className="g">{c.wip}</b>工事中</span><span><Dot s="plan" /><b className="g">{c.plan + c.tbd}</b>計画</span></>; }
  else if (lens === "cert") {
    const c = { got: 0, pre: 0, plan: 0 }; for (const p of list) { const k = bestCls(p, sys); if (k) c[k]++; }
    body = <>{sys && <span className="nm">{SYS[sys].short || SYS[sys].name}</span>}{CLS_ORDER.map((k) => <span key={k}><i className={"st " + k} /><b className="e">{c[k]}</b>{sys ? "" : CLS[k]}</span>)}</>;
  } else if (company) body = <span className="nm"><i className="chip" style={{ background: COLOR[lens][company] || "#6EA8FF" }} />{brief(company)}<b>{list.filter((p) => has(p, lens, company)).length}</b>件</span>;
  else body = rank(lens, list).slice(0, 2).map((e, i) => <span key={e.name} className="nm"><small>{i + 1}</small><i className="chip" style={{ background: COLOR[lens][e.name] || "#6B6A66" }} />{brief(e.name)}<b>{e.n}</b></span>);
  return <span className="peek">{block && <em>{B[block].short}</em>}{body}</span>;
}

export default function Panel() {
  const lens = useStore((s) => s.lens), sheet = useStore((s) => s.sheet), narrow = useStore((s) => s.narrow), L = LENS.find((l) => l.id === lens);
  const el = useRef(null), grip = useRef(null);
  useSheet({ el, handle: grip, enabled: narrow, index: sheet, onIndex: (i) => set({ sheet: i }), onVisible: (v) => set({ occ: v }),
    snaps: (H) => { const k = document.querySelector(".dock"), d = k ? k.offsetHeight : 0; return [d + 56, d + Math.round(Math.min(H - d, window.innerHeight * 0.5)), H]; } });
  return (
    <aside ref={el} className={"panel" + (narrow ? " sheet" : "")} aria-label={L.label}>
      {narrow && <button className="grip" ref={grip} aria-expanded={sheet > 0} aria-label="パネルを引き出す／畳む" onClick={(e) => e.detail === 0 && set({ sheet: sheet ? 0 : 1 })}><i /><Peek lens={lens} open={sheet > 0} /></button>}
      <div className="panel-h"><p className="lead">{L.lead}</p><Scope /></div>
      <div className="panel-b" key={lens}>{lens === "time" ? <TimePanel /> : lens === "cert" ? <CertPanel /> : <CompanyPanel kind={lens} key={lens} />}</div>
    </aside>
  );
}
export { ST_LABEL, has, RANK };
