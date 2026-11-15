// 右のドロワー：1件の再開発について、データベースの内容をそのまま読める形で見せる。
import { useEffect, useRef, useState } from "react";
import { useSheet } from "./touch.js";
import { set, setLens, useStore, tQ } from "../store.js";
import { P, B, sources, stateAt, ST_LABEL, certsOf, SYS, CLS, COLOR, fmt, man, safeHref } from "../data/index.js";
import { Icon, I } from "./Chrome.jsx";

const TIER = { A: "事業者・行政の一次資料で確認", B: "専門メディア・専門データベースに基づく", C: "構想段階で流動的、または情報が古い" };
const unknown = (s) => !s || s === "—" || /^(未定|未公表)/.test(s);
const Stat = ({ k, v, u, sub }) => <div className="stat"><span>{k}</span><b>{v}{u && v !== "—" && <small>{u}</small>}</b>{sub && <em>{sub}</em>}</div>;

export default function Detail() {
  const id = useStore((s) => s.sel), tq = useStore(tQ), narrow = useStore((s) => s.narrow), p = id ? P[id] : null;
  const el = useRef(null), grip = useRef(null), [snap, setSnap] = useState(0);
  useEffect(() => { const k = (e) => e.key === "Escape" && set({ sel: null }); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  useEffect(() => { if (!id) { setSnap(0); set({ occD: 0 }); } }, [id]);
  // スマホ：下から出るシート。半分の高さで開き、引き上げると全面、引き下げると閉じる
  useSheet({ el, handle: grip, enabled: narrow && !!p, index: snap, onIndex: setSnap, onDismiss: () => set({ sel: null }), onVisible: (v) => set({ occD: v }),
    snaps: (H) => [Math.round(Math.min(H, window.innerHeight * 0.5)), H] });
  if (!p) return null;
  const b = B[p.b], st = stateAt(p, tq), cs = certsOf(p);
  const go = (kind, name) => { setLens(kind); set({ company: name, sel: null, block: null }); };
  return (
    <aside ref={el} className={"detail" + (narrow ? " sheet" : "")} aria-label="案件の詳細">
      {narrow && <div className="grip" ref={grip} role="button" aria-label="引き上げて全体を見る／引き下げて閉じる"><i /></div>}
      <button className="ib close" onClick={() => set({ sel: null })} aria-label="閉じる"><Icon d={I.x} size={18} /></button>
      <div className="detail-s" key={p.id}>
        <button className="crumb" onClick={() => set({ block: p.b, sel: null })}>{b.pref}・{p.city}｜{b.short}</button>
        <h2>{p.n}</h2>
        <p className="status"><i className={"dot " + p.st} />{ST_LABEL[p.st]}<span>{p.stage}</span>{p.st !== st.s && <span className="at">表示中の時点では「{ST_LABEL[st.s]}」</span>}</p>
        <p className="ft">{p.ft}</p>
        <div className="stats">
          <Stat k="延床面積" v={p.gfa ? man(p.gfa) : "—"} u="㎡" sub={p.gfa ? fmt(p.gfa) + "㎡" : "公表を確認できず"} />
          <Stat k="最高高さ" v={p.h ? fmt(p.h) : "—"} u="m" />
          <Stat k="住宅" v={p.units ? fmt(p.units) : "—"} u="戸" />
        </div>
        {p.gs && p.gs !== "案件全体" && <p className="note">延床面積の範囲：{p.gs}</p>}
        <dl>
          <dt>竣工</dt><dd>{p.yl}{p.yc && p.st !== "done" && <span className="tag">{p.yc}</span>}</dd>
          <dt>着工</dt><dd>{p.s}</dd>
          <dt>規模</dt><dd>{p.fl}</dd>
          <dt>用途</dt><dd>{p.mix}</dd>
        </dl>
        <h3>つくる人</h3>
        <dl>
          <dt>施主</dt><dd>{p.dg.length ? <span className="chips">{p.dg.map((d) => <button key={d} onClick={() => go("dev", d)}><i style={{ background: COLOR.dev[d] || "#4A4A54" }} />{d}</button>)}</span> : "—"}<small>{p.own}</small></dd>
          <dt>設計</dt><dd className={unknown(p.des) ? "mu" : ""}>{p.des}</dd>
          <dt>施工</dt><dd className={unknown(p.con) ? "mu" : ""}>{p.cg.length > 0 && <span className="chips">{p.cg.map((d) => <button key={d} onClick={() => go("con", d)}><i style={{ background: COLOR.con[d] || "#4A4A54" }} />{d}</button>)}</span>}<small>{p.con}</small></dd>
        </dl>
        <h3>環境認証{cs.length > 0 && <em>{cs.length}件</em>}</h3>
        {cs.length ? <ul className="certs">{cs.map((c, i) => (
          <li key={i}><i className={"st " + c.cls} /><div><b>{SYS[c.sys].short || SYS[c.sys].name}{c.rank && c.rank !== "—" ? "　" + c.rank : ""}</b><span>{c.area ? `街区一括（${c.areaName}）` : c.scope}</span><em>{CLS[c.cls]}{c.area ? "｜" + c.stage : c.date && c.date !== "—" ? "｜" + c.date : ""}</em></div></li>
        ))}</ul> : <p className="note">収録している認証はありません。</p>}
        {p.bl.length > 0 && (<>
          <h3>棟・街区の内訳<em>{p.bl.length}</em></h3>
          <div className="tbl"><table><thead><tr><th>名称</th><th>階数</th><th>高さ</th><th>延床</th></tr></thead>
            <tbody>{p.bl.map((r, i) => <tr key={i}><td>{r[0]}<small>{r[5] && r[5] !== "—" ? r[5] : ""}{r[6] ? `・${fmt(r[6])}戸` : ""}</small></td><td>{r[1] ? `${r[1]}F` : "—"}{r[2] ? `/B${r[2]}` : ""}</td><td>{r[3] ? Math.round(r[3]) + "m" : "—"}</td><td>{r[4] ? man(r[4]) + "㎡" : "—"}</td></tr>)}</tbody></table></div>
        </>)}
        <h3>根拠</h3>
        <p className="tier"><b>確度 {p.tier}</b>{TIER[p.tier]}<span>{p.asof}</span></p>
        <ul className="srcs">{p.src.map((sid) => { const s = sources[sid]; if (!s) return null; const href = safeHref(s.u);
          return <li key={sid}>{href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{s.t}<Icon d={I.ext} size={12} /></a> : <span>{s.t}</span>}<em>{s.k}</em></li>; })}</ul>
        <p className="pid">{p.id}</p>
      </div>
    </aside>
  );
}
