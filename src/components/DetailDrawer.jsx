import React, { useEffect } from "react";
import { STATUS } from "../data/certSystems.js";
import { blockOf, areaCertsOf, fmt } from "../lib/utils.js";
import { CertGlyph, IconClose, IconLink, IconBldg } from "./icons.jsx";
import { RankBadge } from "./ui.jsx";

/* ============================ 詳細ドロワー（演出） ============================ */
function DetailDrawer({p,onClose}){
  const b=blockOf(p.blk);
  const acs=areaCertsOf(p.id);
  useEffect(()=>{
    const onKey=(e)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[onClose]);
  return (
    <div className="dw-root">
      <div className="dw-bg" onClick={onClose}/>
      <div className="dw" role="dialog" aria-modal="true" aria-label={p.n}>
        <div className="dw-grip" onClick={onClose}/>
        <div className="dw-head">
          <div className="dw-meta">
            <span className={"tier t"+p.tier}>確度 {p.tier}</span>
            <span className="dw-st">{STATUS[p.st].label}</span>
            <span className="dw-blk">{b.pref}　{b.name}</span>
          </div>
          <button className="x" onClick={onClose}><IconClose width={12} height={12}/>閉じる</button>
        </div>
        <h3 className="dw-n">{p.n}</h3>
        <div className="dw-devs">
          <span className="dw-devk"><IconBldg width={13} height={13}/>事業主体</span>
          {(p.devs||[]).map((d,i)=><span key={i} className="devchip">{d}</span>)}
        </div>

        <div className="dw-body">
          <div className="dr d1"><div className="dr-k">特徴</div><div className="dr-v">{p.ft}</div></div>
          <div className="dr d2"><div className="dr-k">工期</div><div className="dr-v">{p.s}<br/>{p.yl}</div></div>
          <div className="dr d3"><div className="dr-k">規模</div><div className="dr-v">{p.fl}
            {p.h?<><br/>最高高さ 約{p.h} m</>:null}
            {p.gfa?<><br/>延床面積 約{fmt(p.gfa)} ㎡</>:null}</div></div>
          <div className="dr d4"><div className="dr-k">建物用途の構成</div><div className="dr-v">{p.mix}</div></div>

          <div className="dr d5"><div className="dr-k">体制</div>
            <div className="dr-v">
              <table className="orgtbl"><tbody>
                <tr><th>事業主・オーナー</th><td>{p.own}</td></tr>
                <tr><th>設計</th><td>{p.des}</td></tr>
                <tr><th>施工</th><td>{p.con}</td></tr>
              </tbody></table>
            </div></div>

          <div className="dr d6"><div className="dr-k">環境認証（棟単位）</div>
            <div className="dr-v">
              {p.cert?.length?(<div className="certs">
                {p.cert.map((c,i)=>(<div className="cbox" key={i}>
                  <div className="cbox-h"><CertGlyph sys={c.sys} size={24}/>
                    <div><div className="cbox-n">{c.sys==="SWO"?"CASBEE-SWO":c.sys}</div>
                      <div className="cbox-s">{c.scope}</div></div></div>
                  <div className="cbox-b"><RankBadge sys={c.sys} rank={c.rank}/>
                    <span className="cbox-st">{c.stage}{c.date!=="—"?`　${c.date}`:""}</span></div>
                </div>))}
              </div>):"棟単位の認証は公表確認なし"}
            </div></div>

          {acs.length>0&&<div className="dr d7"><div className="dr-k">環境認証（街区・エリア一括）</div>
            <div className="dr-v"><div className="certs">
              {acs.map((a,i)=>(<div className="cbox area" key={i}>
                <div className="cbox-h"><CertGlyph sys={a.sys} size={24}/>
                  <div><div className="cbox-n">{a.sys}　<span className="areatag">エリア認証</span></div>
                    <div className="cbox-s">{a.area}　{a.scope}</div></div></div>
                <div className="cbox-b"><RankBadge sys={a.sys} rank={a.rank}/>
                  <span className="cbox-st">{a.stages.map(s=>`${s.st}${s.date!=="—"?` ${s.date}`:""}`).join(" → ")}</span></div>
                <div className="cbox-note">{a.note}</div>
              </div>))}
            </div></div></div>}

          <div className="dr d8"><div className="dr-k">出典</div>
            <div className="dr-v">
              {p.src?.length?(<ul className="src">{p.src.map((s,i)=>
                <li key={i}><a href={s.u} target="_blank" rel="noreferrer">{s.t}<IconLink width={11} height={11}/></a></li>)}</ul>)
                :"事業者公表資料および専門メディア報道による。個別URLは未収載。"}
            </div></div>
        </div>
      </div>
    </div>
  );
}

export { DetailDrawer };
