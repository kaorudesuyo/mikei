import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Legend, ReferenceLine
} from "recharts";
import { S } from "../data/sources.js";
import { P } from "../data/projects.js";
import { BLOCKS, STOCK_TYPE } from "../data/blocks.js";
import { CERT_SYS, USE } from "../data/certSystems.js";
import { STOCK_KPI, STOCK_SPLIT, AGE_TREND, SUPPLY, REGIONAL } from "../data/stock.js";
import { blockOf, fmt, TT, areaCertsOf, hasAnyCert } from "../lib/utils.js";
import { CertGlyph, IconTime, IconStock, IconCert, IconLink, IconArea, IconAge } from "./icons.jsx";
import { RankBadge, A } from "./ui.jsx";

/* ============================ 年表・ストック・認証・一覧 ============================ */
function TimelineView({data,range}){
  return (<div className="pad">
    <div className="v-hd"><h3><IconTime width={17} height={17}/>竣工年別の供給量</h3>
      <span>棒＝延床面積（万㎡・都県別積み上げ）　{range[0]}–{range[1]}年</span></div>
    <ResponsiveContainer width="100%" height={310}>
      <BarChart data={data} margin={{top:8,right:16,bottom:0,left:0}}>
        <CartesianGrid stroke="#26262C" vertical={false}/>
        <XAxis dataKey="year" stroke="#8B8A82" tick={{fontSize:11,fill:"#A9A79F"}} interval="preserveStartEnd" minTickGap={18} tickLine={false} axisLine={{stroke:"#3A3A44"}}/>
        <YAxis stroke="#8B8A82" tick={{fontSize:12,fill:"#A9A79F"}} tickLine={false} axisLine={false} width={52} unit="万"/>
        <Tooltip contentStyle={TT} cursor={{fill:"#1A1A20"}} formatter={(v)=>v?`${Math.round(v)} 万㎡`:"—"}/>
        <Legend wrapperStyle={{fontSize:12,color:"#B6B4AD"}}/>
        <Bar dataKey="東京都" stackId="a" fill="#E0B25C"/><Bar dataKey="神奈川県" stackId="a" fill="#8FB8DC"/>
        <Bar dataKey="埼玉県" stackId="a" fill="#7FCBB4"/><Bar dataKey="千葉県" stackId="a" fill="#DE8C67"/>
      </BarChart>
    </ResponsiveContainer>
    <p className="note">
      延床面積が未公表の案件は棒に反映されない。2028年（Torch Tower）と2029年（新宿駅西口）に単年の山が立つ。
      2030年代以降は計画段階の案件が多く、実績値ではなく工程の目安として読むべき区間になる。
    </p>
  </div>);
}

function StockView(){
  return (<div className="pad">
    <div className="v-hd"><h3><IconStock width={17} height={17}/>既存ストックビル（東京23区）</h3>
      <span>調査時点 2025年12月／2026年末時点の予測値</span></div>
    <div className="kpis">
      {STOCK_KPI.map((k,i)=>(<div className="kpi" key={i}>
        <div className="kpi-k">{k.i==="area"?<IconArea width={13} height={13}/>:<IconAge width={13} height={13}/>}{k.k}</div>
        <div className="kpi-v">{k.v}<span>{k.u}</span></div>
        <div className="kpi-s">{k.s}</div></div>))}
    </div>
    <p className="note tight">
      対象は延床面積300坪以上・1946年以降竣工（予定含む）で主な用途が事務所のビル。大規模＝5,000坪以上、中小規模＝300坪以上5,000坪未満。
      出典：<A s={S.xymaxPyr}/>、<A s={S.xymaxDeep}/>、<A s={S.nikkeiStock}/>。
      都心5区（千代田・中央・港・新宿・渋谷）は賃貸面積983万坪（全体の74%）、6,781棟（同72%）を占める。
    </p>
    <div className="grid2">
      <div className="card"><h4>規模別のストック構成</h4>
        <ResponsiveContainer width="100%" height={175}>
          <BarChart data={STOCK_SPLIT} layout="vertical" margin={{top:4,right:26,bottom:0,left:0}}>
            <CartesianGrid stroke="#26262C" horizontal={false}/>
            <XAxis type="number" stroke="#8B8A82" tick={{fontSize:11,fill:"#A9A79F"}} tickLine={false} axisLine={{stroke:"#3A3A44"}} unit="万坪"/>
            <YAxis type="category" dataKey="name" width={92} tick={{fontSize:11,fill:"#A9A79F"}} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={TT} cursor={{fill:"#1A1A20"}} formatter={(v)=>`${v} 万坪`}/>
            <Bar dataKey="賃貸面積" fill="#E0B25C" barSize={26}/>
          </BarChart>
        </ResponsiveContainer>
        <div className="mini-rows">
          <div><span>中小規模ビル（300坪以上5,000坪未満）</span><b>596万坪 / 8,597棟</b></div>
          <div><span>大規模ビル（5,000坪以上）</span><b>727万坪 / 765棟</b></div>
        </div>
        <p className="note tight">棟数では中小規模が92%を占めるが、賃貸面積では大規模が55%。棟数と面積のどちらで見るかで市場像が反転する。</p>
      </div>
      <div className="card"><h4>平均築年数の推移（2000年 → 2026年）</h4>
        <ResponsiveContainer width="100%" height={175}>
          <BarChart data={AGE_TREND} margin={{top:4,right:16,bottom:0,left:0}}>
            <CartesianGrid stroke="#26262C" vertical={false}/>
            <XAxis dataKey="year" stroke="#8B8A82" tick={{fontSize:11,fill:"#A9A79F"}} tickLine={false} axisLine={{stroke:"#3A3A44"}}/>
            <YAxis stroke="#8B8A82" tick={{fontSize:11,fill:"#A9A79F"}} tickLine={false} axisLine={false} width={38} unit="年"/>
            <Tooltip contentStyle={TT} cursor={{fill:"#1A1A20"}} formatter={(v)=>`${v} 年`}/>
            <Legend wrapperStyle={{fontSize:11,color:"#B6B4AD"}}/>
            <Bar dataKey="棟数ベース" fill="#DE8C67" barSize={30}/>
            <Bar dataKey="賃貸面積ベース" fill="#8FB8DC" barSize={30}/>
          </BarChart>
        </ResponsiveContainer>
        <p className="note tight">棟数ベースでは26年間で18.5年上昇したのに対し、賃貸面積ベースの上昇は12.0年にとどまる。大規模ビルの供給が続くことで、面積で見た経年化が抑えられている構造を示す。</p>
      </div>
    </div>
    <div className="card"><h4>大規模オフィスの供給見通し（東京23区・万㎡／年）</h4>
      <div className="grid2b">
        <ResponsiveContainer width="100%" height={185}>
          <BarChart data={SUPPLY} margin={{top:4,right:16,bottom:0,left:0}}>
            <CartesianGrid stroke="#26262C" vertical={false}/>
            <XAxis dataKey="name" stroke="#8B8A82" tick={{fontSize:11,fill:"#A9A79F"}} tickLine={false} axisLine={{stroke:"#3A3A44"}}/>
            <YAxis stroke="#8B8A82" tick={{fontSize:11,fill:"#A9A79F"}} tickLine={false} axisLine={false} width={42} unit="万"/>
            <Tooltip contentStyle={TT} cursor={{fill:"#1A1A20"}} formatter={(v)=>`${v} 万㎡`}/>
            <Bar dataKey="v" fill="#E0B25C" barSize={46}/>
          </BarChart>
        </ResponsiveContainer>
        <ul className="facts">
          <li>今後5年の年平均供給量は87万㎡で、過去20年平均106万㎡の77%にとどまる。建築コスト高騰による工期長期化と計画見直しが背景にある。</li>
          <li>今後5年の総供給量412万㎡のうち、主要ビジネスエリアが300万㎡（73%）。都心5区の供給割合は91%で、過去10年平均85%を上回る。</li>
          <li>事務所延床10万㎡以上の物件が占める割合は2028年94%、2029年84%、2030年92%。オフィスの大規模化が一段と進む。</li>
          <li>都心3区の開発用地は「建替え」から「低・未利用地（再開発等）」へシフトし、その割合は2016–20年の3割から2026–30年は7割へ。</li>
        </ul>
      </div>
      <p className="note tight">出典：<A s={S.moriTrust}/>、<A s={S.moriBldg}/>。</p>
    </div>
    <div className="card"><h4>首都圏（東京23区外）の既存オフィス市況　── 横浜・川崎・さいたま・千葉</h4>
      <p className="note tight" style={{margin:"0 0 12px"}}>
        調査時点：{REGIONAL.asof}。東京23区の「オフィスピラミッド」に相当する棟数・面積の悉皆統計は23区外では公表されていないため、
        ここでは仲介大手の定点調査（空室率・平均募集賃料）で把握できる範囲を収録した。「—」は定点調査の対象外、
        または具体値が一般公開されていないことを示す。
      </p>
      <div className="tblwrap"><table className="tbl">
        <thead><tr><th>都市・地区</th><th className="r">平均空室率</th><th className="r">平均賃料（坪）</th><th>調査カバレッジ</th><th>市況メモ</th></tr></thead>
        <tbody>
          {REGIONAL.rows.map((r,i)=>(<tr key={i}>
            <td className="nm">{r.city}</td>
            <td className="r mono">{r.vac}</td>
            <td className="r mono">{r.rent}</td>
            <td className="dim">{r.cover}</td>
            <td className="dim">{r.note}</td></tr>))}
        </tbody>
      </table></div>
      <p className="note tight">
        出典：<A s={S.mikiYokohama}/>、<A s={S.shinyoko}/>、<A s={S.cbreQ1}/>、<A s={S.sankoData}/>。
        三鬼商事は募集ベース、CBRE・三幸エステートは現空ベースで空室率を算出しており、定義が異なるため相互比較には注意が必要。
      </p>
    </div>
    <div className="card"><h4>ブロック別のストック特性</h4>
      <div className="types">
        {["renew","aging","emerging"].map(k=>(
          <div key={k} className="type"><i style={{background:STOCK_TYPE[k].c}}/>
            <b>{STOCK_TYPE[k].label}</b><span>{STOCK_TYPE[k].desc}</span></div>))}
      </div>
      <div className="tblwrap"><table className="tbl">
        <thead><tr><th>ブロック</th><th>対応する区・市</th><th>ストック類型</th><th>供給面のポジション</th></tr></thead>
        <tbody>
          {BLOCKS.map(b=>(<tr key={b.id}>
            <td className="nm"><span className="mono dim">{b.id}</span> {b.short}</td>
            <td className="dim">{b.stockWard}</td>
            <td><span className="ttag" style={{color:STOCK_TYPE[b.stockType].c,borderColor:STOCK_TYPE[b.stockType].c+"66"}}>
              {STOCK_TYPE[b.stockType].label}</span></td>
            <td className="dim">{b.stockNote}</td></tr>))}
        </tbody>
      </table></div>
      <p className="note tight">
        ストック類型は<A s={S.xymaxDeep}/>による区分を本アプリのブロック区分に対応づけたもの。供給面の記述は<A s={S.moriTrust}/>の地区別集計に基づく。
        東京23区外のブロックはこれらの調査の対象外。
      </p>
    </div>
  </div>);
}

function CertView({data,setSel,visibleAreaCerts}){
  const bySys={};
  data.forEach(p=>(p.cert||[]).forEach(c=>{(bySys[c.sys] ||= []).push({p,c});}));
  const order=["LEED","WELL","CASBEE","SWO","ZEB","ZEH","BELS","DBJ","SITES"].filter(k=>bySys[k]);
  const bldgTotal=data.reduce((s,p)=>s+(p.cert?.length||0),0);
  return (<div className="pad">
    <div className="v-hd"><h3><IconCert width={17} height={17}/>環境認証の取得状況</h3>
      <span>棟単位 {bldgTotal} 件＋街区一括 {visibleAreaCerts.length} 件</span></div>
    <p className="note tight">
      集計ルール：(1) LEED ND等の街区一括認証は下の「街区・エリア一括」に1件として登録し、構成棟には重複計上しない。
      (2) 同一認証のPlan認証→本認証は段階の進行として1件に集約。(3) ZEBとBELSは同じ評価枠組みの別表示のため、
      ZEB区分が公表されている案件はZEB欄に集約する。(4) 対象範囲（棟／オフィス部分／街区）を必ず併記する。
      CASBEEの件数が少なく見えるのは制度構造による：主流のCASBEE-不動産評価認証は竣工後1年以上の既存ビルが対象で、
      工事中・竣工直後の案件は取得自体ができない（例：渋谷スクランブルスクエア東棟は2019年竣工で本マップの収録範囲外だが、
      2025年1月に最高位Sランク・87.9点を取得）。また東京都は独自の建築物環境計画書制度を用いるため自治体版CASBEEの
      届出対象外で、横浜市・川崎市等のCASBEE届出（自己評価）は第三者認証と別物としてここには載せない。
      ここに載らない案件が「環境配慮をしていない」ことを意味しない。
    </p>

    <div className="card area-card">
      <div className="cs-hd"><div className="cs-l"><CertGlyph sys="LEED" size={30}/>
        <div><div className="cs-n">街区・エリア一括の認証</div>
          <div className="cs-f">LEED ND（Neighborhood Development）ほか、街全体を対象とする認証</div></div></div></div>
      <div className="tblwrap"><table className="tbl">
        <thead><tr><th>エリア</th><th>スキーム・対象</th><th>ランク</th><th>段階の推移</th><th>対象案件</th></tr></thead>
        <tbody>
          {visibleAreaCerts.map(a=>(<tr key={a.id}>
            <td className="nm">{a.area}</td>
            <td className="dim"><span className="cs-inline"><CertGlyph sys={a.sys} size={15}/>{a.sys}　{a.scope}</span></td>
            <td><RankBadge sys={a.sys} rank={a.rank}/></td>
            <td className="dim">{a.stages.map(s=>`${s.st}${s.date!=="—"?` ${s.date}`:""}`).join(" → ")}</td>
            <td className="dim">{a.members.map(m=>{const p=P.find(x=>x.id===m);
              return <button key={m} className="linkbtn" onClick={()=>setSel(m)}>{p?p.n.split("（")[0]:m}</button>;})}</td>
          </tr>))}
          {!visibleAreaCerts.length&&<tr><td colSpan="5" className="dim">現在の絞り込みでは該当なし</td></tr>}
        </tbody>
      </table></div>
      <p className="note tight">段階の推移（Plan認証 → 本認証）は同一認証の進行であり、1件として数えている。</p>
    </div>

    {order.map(sys=>(
      <div className="card" key={sys}>
        <div className="cs-hd">
          <div className="cs-l"><CertGlyph sys={sys} size={30}/>
            <div><div className="cs-n">{sys==="SWO"?"CASBEE-SWO":sys}</div><div className="cs-f">{CERT_SYS[sys].full}</div></div></div>
          <div className="cs-r"><div className="cs-b">{CERT_SYS[sys].body}</div>
            <div className="cs-k">ランク：{CERT_SYS[sys].ranks}</div></div>
        </div>
        <p className="cs-note">{CERT_SYS[sys].note}
          {CERT_SYS[sys].url&&<> <a href={CERT_SYS[sys].url} target="_blank" rel="noreferrer">公式サイト<IconLink width={11} height={11}/></a></>}
        </p>
        <div className="tblwrap"><table className="tbl">
          <thead><tr><th>案件</th><th>対象範囲</th><th>ランク</th><th>段階</th><th>時点</th></tr></thead>
          <tbody>
            {bySys[sys].map(({p,c},i)=>(<tr key={i} onClick={()=>setSel(p.id)}>
              <td className="nm">{p.n}</td>
              <td className="dim">{c.scope}</td>
              <td><RankBadge sys={sys} rank={c.rank}/></td>
              <td className="dim">{c.stage}</td>
              <td className="dim mono">{c.date}</td></tr>))}
          </tbody>
        </table></div>
      </div>
    ))}
    {!order.length&&!visibleAreaCerts.length&&<div className="empty">現在の絞り込み条件では、環境認証を取得した案件がない。</div>}

    <div className="card"><h4>ランク体系の対照</h4>
      <div className="tblwrap"><table className="tbl">
        <thead><tr><th>スキーム</th><th>運営主体</th><th>ランク（上位から）</th><th>評価の主眼</th></tr></thead>
        <tbody>
          {Object.entries(CERT_SYS).map(([k,v])=>(<tr key={k}>
            <td className="nm"><span className="cs-inline"><CertGlyph sys={k} size={17}/>{k==="SWO"?"CASBEE-SWO":k}</span></td>
            <td className="dim">{v.body}</td>
            <td className="dim">{v.ranks}</td>
            <td className="dim">{v.note}</td></tr>))}
        </tbody>
      </table></div>
      <p className="note tight">
        登録内容の主な根拠：<A s={S.woonerf}/>、<A s={S.jreCert}/>、<A s={S.mfYaesu}/>、<A s={S.mfNihonbashi}/>、
        <A s={S.tateTower}/>、<A s={S.tateFront}/>、<A s={S.jreBlue}/>、<A s={S.tokyuCert}/>、<A s={S.jebl}/>、
        <A s={S.gbjTorch}/>、<A s={S.akasakaCert}/>。網羅的な確認には<A s={S.gbj}/>と<A s={S.ibecs}/>を参照。
      </p>
    </div>
  </div>);
}

function ListView({data,setSel,sel}){
  const [sort,setSort]=useState("y");
  const [dir,setDir]=useState("asc");        /* asc=昇順 / desc=降順 */
  const rows=useMemo(()=>{
    const base=[...data].sort((a,b)=>{
      if(sort==="y")return a.y-b.y;
      if(sort==="h")return (a.h||0)-(b.h||0);
      if(sort==="g")return (a.gfa||0)-(b.gfa||0);
      return a.blk.localeCompare(b.blk);
    });
    return dir==="asc"?base:base.reverse();
  },[data,sort,dir]);
  /* 同じキーを押したら方向を反転、別のキーなら既定方向にリセット
     （年・ブロックは昇順、高さ・延床は大きい順が自然） */
  const pick=(k)=>{
    if(k===sort){setDir(d=>d==="asc"?"desc":"asc");return;}
    setSort(k);setDir(k==="h"||k==="g"?"desc":"asc");
  };
  const dirLabel=sort==="y"?(dir==="asc"?"古い順":"新しい順")
    :sort==="b"?(dir==="asc"?"A→Z":"Z→A")
    :(dir==="asc"?"小さい順":"大きい順");
  return (<div className="pad">
    <div className="lst-hd">
      {[["y","竣工年"],["h","高さ"],["g","延床"],["b","ブロック"]].map(([k,l])=>(
        <button key={k} className={sort===k?"on":""} onClick={()=>pick(k)}
          aria-pressed={sort===k}>
          {l}{sort===k&&<i className={"arw "+dir} aria-hidden="true"/>}</button>))}
      <button className="dirbtn" onClick={()=>setDir(d=>d==="asc"?"desc":"asc")}
        aria-label={"並び順を反転（現在 "+dirLabel+"）"}>
        <i className={"arw "+dir} aria-hidden="true"/>{dirLabel}</button>
    </div>
    <div className="tblwrap"><table className="tbl zebra">
      <thead><tr><th>竣工</th><th>案件</th><th>事業主体</th><th>ブロック</th><th>用途</th>
        <th className="r">高さ</th><th className="r">延床</th><th>認証</th><th>確度</th></tr></thead>
      <tbody>
        {rows.map(p=>(<tr key={p.id} className={sel===p.id?"on":""} onClick={()=>setSel(p.id)}>
          <td className="mono">{p.y}</td>
          <td className="nm">{p.n}</td>
          <td className="dim">{(p.devs||[]).slice(0,2).join("・")}{(p.devs||[]).length>2?" ほか":""}</td>
          <td className="dim">{blockOf(p.blk).short}</td>
          <td><span className="ub" style={{color:USE[p.use].c}}>■</span>{USE[p.use].label}</td>
          <td className="r mono">{p.h?`${p.h} m`:"—"}</td>
          <td className="r mono">{p.gfa?`${fmt(p.gfa)} ㎡`:"—"}</td>
          <td>{hasAnyCert(p)?<span className="cwrap">
            {(p.cert||[]).map((c,i)=><span key={i} className="cmini" title={`${c.sys} ${c.rank} / ${c.scope}`}><CertGlyph sys={c.sys} size={15}/></span>)}
            {areaCertsOf(p.id).map((a,i)=><span key={"a"+i} className="cmini areamini" title={`${a.sys} ${a.rank}（${a.area}・エリア一括）`}><CertGlyph sys={a.sys} size={15}/></span>)}
          </span>:<span className="dim">—</span>}</td>
          <td><span className={"tier t"+p.tier}>{p.tier}</span></td></tr>))}
      </tbody>
    </table></div>
    {!rows.length&&<div className="empty">条件に合う案件がない。都県・用途・竣工年の絞り込みを緩めてほしい。</div>}
  </div>);
}


export { TimelineView, StockView, CertView, ListView };
