import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Legend, ReferenceLine
} from "recharts";
import { PREFS, BLOCKS, POP_YEARS, AGE_NATION, AGE_PREF } from "./data/blocks.js";
import { USE, STATUS } from "./data/certSystems.js";
import { P } from "./data/projects.js";
import { S } from "./data/sources.js";
import { AREA_CERTS } from "./data/areaCerts.js";
import { blockOf, fmt, TT, hasAnyCert } from "./lib/utils.js";
import { CertGlyph, IconMap, IconTime, IconStock, IconCert, IconList, IconPop, IconSearch, IconLink, IconChevD, IconReset, IconClose, IconLayer, MikeiMark } from "./components/icons.jsx";
import { Label, Stat, Read, A } from "./components/ui.jsx";
import { MapView } from "./components/MapView.jsx";
import { DetailDrawer } from "./components/DetailDrawer.jsx";
import { TimelineView, StockView, CertView, ListView } from "./components/views.jsx";
import { BlockCard, Intro } from "./components/panels.jsx";

/* ============================ アプリ ============================ */
/* 情報設計（v5）
   概観（ホーム）→ 地図 → 案件詳細、という「全体像から掘る」動線を主軸に再編。
   ・ホーム＝はじめてのユーザー向けの入口。数字の全体像・3ステップの使い方・
     都県カード・注目案件・データへの導線のみを置く
   ・地図＝探索。フィルタは「絞り込み」パネルに格納し、既定では畳む
   ・データ＝年表／ストック／環境認証／人口動態をサブタブで分離
   ・一覧＝検索・並べ替えに特化
   情報量は削らず、画面あたりの同時表示だけを減らしている */

const DEFAULT_RANGE=[2020,2050];

/* 起動演出：アイコンが中央に現れ、こちらへ迫るように拡大してから本体へ抜ける。
   sessionStorage を使わず1マウント1回のみ。prefers-reduced-motion では即座に本体を表示する。 */
function Splash({onDone}){
  const [phase,setPhase]=useState("in");   /* in → zoom → gone */
  useEffect(()=>{
    const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduce){onDone();return;}
    const t1=setTimeout(()=>setPhase("zoom"),760);
    const t2=setTimeout(()=>{setPhase("gone");onDone();},1520);
    return ()=>{clearTimeout(t1);clearTimeout(t2);};
  },[onDone]);
  if(phase==="gone")return null;
  return (
    <div className={"splash "+phase} aria-hidden="true">
      <div className="splash-mark"><MikeiMark size={132} plate={false}/></div>
    </div>
  );
}

export default function App(){
  const [booted,setBooted]=useState(false);
  const onBooted=React.useCallback(()=>setBooted(true),[]);
  const [nav,setNav]=useState("home");            /* home | map | insight | list */
  const [insTab,setInsTab]=useState("timeline");  /* timeline | stock | cert | pop */
  const [filterOpen,setFilterOpen]=useState(false);
  const [guideOpen,setGuideOpen]=useState(false);   /* 読み方／ブロック情報パネル */
  const [tokyoScope,setTokyoScope]=useState("all"); /* all=東京都（全域）／ku23=東京都（23区） */

  const [prefs,setPrefs]=useState(PREFS.map(p=>p.name));
  const [blockSel,setBlockSel]=useState(null);
  const [range,setRange]=useState(DEFAULT_RANGE);
  const [uses,setUses]=useState(Object.keys(USE));
  const [sts,setSts]=useState(["done","wip","plan"]);
  const [q,setQ]=useState("");
  const [sel,setSel]=useState(null);

  const toggle=(arr,set,v)=>set(arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]);

  const filtered=useMemo(()=>P.filter(p=>{
    const b=blockOf(p.blk);
    if(!prefs.includes(b.pref))return false;
    if(b.pref==="東京都"&&tokyoScope==="ku23"&&!b.ku23)return false;
    if(blockSel&&p.blk!==blockSel)return false;
    if(p.y<range[0]||p.y>range[1])return false;
    if(!uses.includes(p.use))return false;
    if(!sts.includes(p.st))return false;
    if(q){const s=(p.n+p.own+p.des+p.con+p.mix+(p.devs||[]).join(" ")+b.name).toLowerCase();
      if(!s.includes(q.toLowerCase()))return false;}
    return true;
  }),[prefs,blockSel,range,uses,sts,q,tokyoScope]);

  const byBlock=useMemo(()=>{const m={};filtered.forEach(p=>{(m[p.blk] ||= []).push(p);});return m;},[filtered]);
  const totalGfa=filtered.reduce((s,p)=>s+(p.gfa||0),0);
  const certProjects=filtered.filter(hasAnyCert).length;
  const visibleAreaCerts=AREA_CERTS.filter(a=>a.members.some(m=>filtered.find(p=>p.id===m)));

  const timeline=useMemo(()=>{
    const m={};for(let y=2020;y<=2050;y++)m[y]={year:y,東京都:0,神奈川県:0,埼玉県:0,千葉県:0};
    filtered.forEach(p=>{m[p.y][blockOf(p.blk).pref]+=(p.gfa||0)/10000;});
    return Object.values(m);
  },[filtered]);

  const selP=sel?P.find(p=>p.id===sel):null;
  const selB=blockSel?blockOf(blockSel):null;
  const tkLabel=tokyoScope==="ku23"?"東京都（23区）":"東京都（全域）";
  const prefNames=prefs.map(n=>n==="東京都"?tkLabel:n);
  const scopeLabel=blockSel?`${selB.pref==="東京都"?tkLabel:selB.pref}／${selB.name}`
    :prefs.length===4?(tokyoScope==="ku23"?"1都3県（東京は23区）":"1都3県 全域"):prefNames.join("・");

  const activeN=(prefs.length<4?1:0)+(blockSel?1:0)
    +(uses.length<Object.keys(USE).length?1:0)+(sts.length<3?1:0)+(tokyoScope!=="all"?1:0)
    +((range[0]!==DEFAULT_RANGE[0]||range[1]!==DEFAULT_RANGE[1])?1:0)+(q?1:0);
  const resetAll=()=>{setPrefs(PREFS.map(p=>p.name));setBlockSel(null);setRange(DEFAULT_RANGE);
    setUses(Object.keys(USE));setSts(["done","wip","plan"]);setQ("");setTokyoScope("all");};
  const openMapFor=(pref)=>{resetAll();if(pref)setPrefs([pref]);setFilterOpen(false);setNav("map");};
  const goInsight=(t)=>{setInsTab(t);setFilterOpen(false);setNav("insight");};

  const NAVS=[["home","概観",IconLayer],["map","地図",IconMap],["insight","データ",IconStock],["list","一覧",IconList]];
  const filterProps={prefs,setPrefs,blockSel,setBlockSel,range,setRange,uses,setUses,
    sts,setSts,q,setQ,toggle,tokyoScope,setTokyoScope,onReset:resetAll,onClose:()=>setFilterOpen(false)};

  return (
    <div className="gk">
      <Splash onDone={onBooted}/>
      <div className={"app-body"+(booted?" on":"")}>

      <header className="hd2">
        <button className="brand" onClick={()=>{setNav("home");setFilterOpen(false);}} aria-label="ホームへ">
          <MikeiMark size={34}/>
          <span className="mark s">未景</span>
          <span className="brand-sub"><span className="rom">MIKEI</span>
            <span className="tag">首都圏 再開発マップ　2020–2050</span></span>
        </button>
        <nav className="nav" aria-label="主要ナビゲーション">
          {NAVS.map(([k,l,I])=>(
            <button key={k} className={"navbtn "+(nav===k?"on":"")}
              onClick={()=>{setNav(k);setFilterOpen(false);}}>
              <I width={14} height={14}/>{l}</button>))}
        </nav>
      </header>

      {nav==="home"&&<HomeView openMapFor={openMapFor} openProject={setSel} goInsight={goInsight}
        goList={()=>{setFilterOpen(false);setNav("list");}}/>}

      {nav!=="home"&&(
        <StatusBar nav={nav} insTab={insTab} count={filtered.length} gfa={totalGfa}
          certN={certProjects} scopeLabel={scopeLabel} activeN={activeN}
          filterOpen={filterOpen} onFilter={()=>setFilterOpen(o=>!o)} onReset={resetAll}
          guideOpen={guideOpen} onGuide={nav==="map"?()=>setGuideOpen(o=>!o):null}
          guideLabel={blockSel?"ブロック情報":"読み方"}/>)}
      {nav!=="home"&&filterOpen&&!(nav==="insight"&&(insTab==="stock"||insTab==="pop"))&&
        <FilterPanel {...filterProps}/>}

      {nav==="map"&&(
        <main className={"body"+(guideOpen?"":" solo")}>
          <div className="stage">
            <MapView data={filtered} byBlock={byBlock} sel={sel} setSel={setSel}
              blockSel={blockSel} setBlockSel={setBlockSel} prefs={prefs} scopeLabel={scopeLabel}
              tokyoScope={tokyoScope}/>
          </div>
          {guideOpen&&(
            <aside className="panel">
              <button className="panel-x" onClick={()=>setGuideOpen(false)}>
                <IconClose width={11} height={11}/>閉じる</button>
              {selB?<BlockCard b={selB} items={byBlock[selB.id]||[]} setSel={setSel}/>:<Intro/>}
            </aside>)}
        </main>
      )}

      {nav==="insight"&&(
        <section className="ins">
          <div className="instabs">
            {[["timeline","竣工年表",IconTime],["stock","既存ストック",IconStock],
              ["cert","環境認証",IconCert],["pop","人口動態",IconPop]].map(([k,l,I])=>(
              <button key={k} className={"instab "+(insTab===k?"on":"")} onClick={()=>{setInsTab(k);setFilterOpen(false);}}>
                <I width={13} height={13}/>{l}</button>))}
          </div>
          <div className="stage-full">
            {insTab==="timeline"&&<TimelineView data={timeline} range={range}/>}
            {insTab==="stock"&&<StockView/>}
            {insTab==="cert"&&<CertView data={filtered} setSel={setSel} visibleAreaCerts={visibleAreaCerts}/>}
            {insTab==="pop"&&<PopView prefs={prefs} blockSel={blockSel}/>}
          </div>
        </section>
      )}

      {nav==="list"&&(
        <section className="stage-full">
          <ListView data={filtered} setSel={setSel} sel={sel}/>
        </section>
      )}

      {selP&&<DetailDrawer p={selP} onClose={()=>setSel(null)}/>}

      <footer className="ft">
        <div className="ft-c one">
          <div><h4>主な参照先</h4>
            <ul className="ft-links">
              {[S.ipss,S.xymaxPyr,S.moriTrust,S.moriBldg,S.woonerf,S.gbj,S.ibecs,S.mikiYokohama,S.cbreQ1].map((s,i)=>(
                <li key={i}><a href={s.u} target="_blank" rel="noreferrer">{s.t}<IconLink width={11} height={11}/></a></li>))}
            </ul></div>
        </div>
        <div className="ft-b">未景 MIKEI ／ 首都圏 再開発マップ　最終更新 2026年7月</div>
      </footer>
      </div>
    </div>
  );
}

/* ---------- 概観（ホーム） ---------- */
function HomeView({openMapFor,openProject,goInsight,goList}){
  const totGfa=P.reduce((s,p)=>s+(p.gfa||0),0);
  const certN=P.filter(hasAnyCert).length;
  const hot=[...P].sort((a,b)=>(b.gfa||0)-(a.gfa||0)).slice(0,5);
  const prefAgg=PREFS.map(pr=>{
    const items=P.filter(p=>blockOf(p.blk).pref===pr.name);
    return {name:pr.name,n:items.length,
      gfa:items.reduce((s,p)=>s+(p.gfa||0),0),
      idx:+(pr.pop[6]/pr.pop[0]*100).toFixed(1),
      top:[...items].sort((a,b)=>(b.gfa||0)-(a.gfa||0)).slice(0,2)};
  });
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-mark"><MikeiMark size={64}/>
          <div className="hero-name"><span className="hn-ja">未景</span><span className="hn-en">MIKEI</span></div></div>
        <h1 className="hero-t">まだない街を、<br/>見に行く。</h1>
        <p className="hero-p">
          首都圏の再開発を巨視し、街がどう変わっていくかを時系列で追うための地図。
          東京・神奈川・埼玉・千葉で2020年から2050年にかけて動く主要な再開発 {P.length} 件を、
          事業者の公式リリースと専門メディアの突き合わせで収録。収録対象は、オフィス（事務所）または
          集合住宅を用途に含む再開発に限定しています。既存オフィスストック・環境認証・
          将来人口とあわせて、街の変化を「全体像」から「1案件の体制」まで掘り下げられます。
        </p>
        <div className="hero-kpis">
          <Stat k="収録案件" v={P.length} u="件"/>
          <Stat k="延床面積 合計" v={Math.round(totGfa/10000).toLocaleString()} u="万㎡"/>
          <Stat k="環境認証あり" v={certN} u="件"/>
          <Stat k="エリアブロック" v={BLOCKS.length} u="区分"/>
        </div>
        <div className="hero-cta">
          <button className="cta main" onClick={()=>openMapFor(null)}><IconMap width={15} height={15}/>地図から始める</button>
          <button className="cta" onClick={goList}><IconList width={14} height={14}/>一覧で探す</button>
        </div>
      </section>

      <section className="steps" aria-label="使い方 3ステップ">
        <div className="step"><span className="step-n">1</span>
          <b>広域から眺める</b>
          <p>地図はまず1都3県の全域。ブロックごとの丸いバブルが、再開発の集中度を件数で示します。</p></div>
        <div className="step"><span className="step-n">2</span>
          <b>ブロックへズーム</b>
          <p>バブルを押す（または「絞り込み」でブロックを選ぶ）と、その街区へ自動でズームし、個別のピンに切り替わります。</p></div>
        <div className="step"><span className="step-n">3</span>
          <b>案件を掘り下げる</b>
          <p>ピンを押すと詳細パネルが開き、事業主体・設計・施工・環境認証・出典まで確認できます。</p></div>
      </section>

      <h2 className="home-h">都県から入る</h2>
      <div className="prefcards">
        {prefAgg.map(a=>(
          <button key={a.name} className="prefcard" onClick={()=>openMapFor(a.name)}>
            <div className="pc-hd"><span className="pc-name">{a.name}</span>
              <span className={"pc-idx "+(a.idx>=100?"up":"dn")}>
                {a.idx>=100?"+":""}{(a.idx-100).toFixed(1)}%<i>2050年人口</i></span></div>
            <div className="pc-kv">
              <span>{a.n}<i>案件</i></span>
              <span>{Math.round(a.gfa/10000).toLocaleString()}<i>万㎡</i></span>
            </div>
            <div className="pc-top">{a.top.map(p=><span key={p.id}>{p.n.split("（")[0]}</span>)}</div>
            <div className="pc-go">地図で見る →</div>
          </button>))}
      </div>

      <h2 className="home-h">延床面積で見る注目案件</h2>
      <ul className="hot">
        {hot.map((p,i)=>(
          <li key={p.id} onClick={()=>openProject(p.id)} role="button" tabIndex={0}
            onKeyDown={e=>{if(e.key==="Enter")openProject(p.id);}}>
            <span className="hot-r mono">{String(i+1).padStart(2,"0")}</span>
            <span className="hot-n">{p.n}
              <i>{blockOf(p.blk).pref}／{blockOf(p.blk).short}　{(p.devs||[]).slice(0,2).join("・")}</i></span>
            <span className="hot-v mono">{Math.round((p.gfa||0)/10000).toLocaleString()}<i>万㎡</i></span>
            <span className="hot-y mono">{p.y}</span>
          </li>))}
      </ul>
      <p className="home-note">案件名を押すと詳細が開きます。全{P.length}件は「一覧」から。</p>

      <h2 className="home-h">データで深掘りする</h2>
      <div className="golinks">
        <button onClick={()=>goInsight("timeline")}><IconTime width={14} height={14}/>竣工年表<span>供給の山を年別・都県別に</span></button>
        <button onClick={()=>goInsight("stock")}><IconStock width={14} height={14}/>既存ストック<span>23区1,323万坪＋横浜等の市況</span></button>
        <button onClick={()=>goInsight("cert")}><IconCert width={14} height={14}/>環境認証<span>棟単位と街区一括を区別して集計</span></button>
        <button onClick={()=>goInsight("pop")}><IconPop width={14} height={14}/>人口動態<span>2050年までの将来推計</span></button>
      </div>
    </div>
  );
}

/* ---------- ステータスバー ---------- */
function StatusBar({nav,insTab,count,gfa,certN,scopeLabel,activeN,filterOpen,onFilter,onReset,
  guideOpen,onGuide,guideLabel}){
  const filterless=nav==="insight"&&(insTab==="stock"||insTab==="pop");
  const hint=nav==="map"?"バブル＝ブロックの件数。押すとその街区へズームします"
    :nav==="list"?"行を押すと詳細が開きます"
    :insTab==="timeline"?"絞り込みが年表に反映されます"
    :insTab==="cert"?"絞り込みが集計に反映されます":"";
  return (
    <div className="stbar">
      <div className="stbar-l">
        <span className="st-scope">表示範囲　<b>{scopeLabel}</b></span>
        {!filterless&&<>
          <span className="st-kv">{count}<i>件</i></span>
          <span className="st-kv">{Math.round(gfa/10000).toLocaleString()}<i>万㎡</i></span>
          <span className="st-kv">{certN}<i>認証あり</i></span></>}
        {filterless
          ?<span className="st-note">このタブは調査統計・公的推計のため、絞り込みの影響を受けません</span>
          :hint&&<span className="st-note">{hint}</span>}
      </div>
      {!filterless&&(
        <div className="stbar-r">
          {onGuide&&<button className={"fbtn"+(guideOpen?" on":"")} onClick={onGuide} aria-expanded={guideOpen}>
            <IconLayer width={13} height={13}/>{guideLabel}</button>}
          <button className={"fbtn"+(filterOpen?" on":"")} onClick={onFilter} aria-expanded={filterOpen}>
            <IconSearch width={13} height={13}/>絞り込み
            {activeN>0&&<span className="fbadge">{activeN}</span>}
            <IconChevD width={11} height={11} style={{transform:filterOpen?"rotate(180deg)":"none"}}/></button>
          {activeN>0&&<button className="fbtn ghost" onClick={onReset}>
            <IconReset width={12} height={12}/>リセット</button>}
        </div>)}
    </div>
  );
}

/* ---------- 絞り込みパネル（既定では畳まれている） ---------- */
function FilterPanel({prefs,setPrefs,blockSel,setBlockSel,range,setRange,uses,setUses,
  sts,setSts,q,setQ,toggle,tokyoScope,setTokyoScope,onReset,onClose}){
  return (
    <section className="ctrl fpanel" aria-label="絞り込み">
      <div className="ctrl-row fp-hd">
        <span className="fp-t"><IconSearch width={13} height={13}/>絞り込み</span>
        <div className="spacer"/>
        <button className="chip ghost" onClick={onReset}>すべてリセット</button>
        <button className="chip" onClick={onClose}><IconClose width={11} height={11}/>閉じる</button>
      </div>
      <div className="ctrl-row"><Label>都県</Label>
        <div className="chips">
          {PREFS.map(p=>(<button key={p.name} className={"chip "+(prefs.includes(p.name)?"on":"")}
            onClick={()=>{toggle(prefs,setPrefs,p.name);setBlockSel(null);}}>{p.name}</button>))}
          <button className="chip ghost" onClick={()=>{setPrefs(PREFS.map(p=>p.name));setBlockSel(null);}}>全域に戻す</button>
        </div>
      </div>
      <div className="ctrl-row"><Label>東京の範囲</Label>
        <div className="seg">
          <button className={tokyoScope==="all"?"on":""}
            onClick={()=>{setTokyoScope("all");}}>東京都（全域）</button>
          <button className={tokyoScope==="ku23"?"on":""}
            onClick={()=>{setTokyoScope("ku23");setBlockSel(b=>b==="T11"?null:b);}}>東京都（23区）</button>
        </div>
        <span className="seg-note">23区を選ぶと多摩（立川・八王子・調布）が除外される。オフィスストックの調査対象は23区。</span>
      </div>
      <div className="ctrl-row"><Label>ブロック</Label>
        <div className="chips scroll">
          <button className={"chip "+(!blockSel?"on":"")} onClick={()=>setBlockSel(null)}>すべて</button>
          {BLOCKS.filter(b=>prefs.includes(b.pref)).map(b=>(
            <button key={b.id} className={"chip "+(blockSel===b.id?"on":"")}
              onClick={()=>setBlockSel(blockSel===b.id?null:b.id)}>
              <span className="chip-id">{b.id}</span>{b.short}</button>))}
        </div>
      </div>
      <div className="ctrl-row"><Label>用途</Label>
        <div className="chips">
          {Object.entries(USE).map(([k,v])=>(
            <button key={k} className={"chip "+(uses.includes(k)?"on":"")} onClick={()=>toggle(uses,setUses,k)}>
              <i className="sw" style={{background:v.c}}/>{v.label}</button>))}
        </div>
      </div>
      <div className="ctrl-row"><Label>進捗</Label>
        <div className="chips">
          {Object.entries(STATUS).map(([k,v])=>(
            <button key={k} className={"chip "+(sts.includes(k)?"on":"")} onClick={()=>toggle(sts,setSts,k)}>{v.label}</button>))}
        </div>
        <div className="spacer"/>
        <div className="search-w"><IconSearch className="si" width={14} height={14}/>
          <input className="search" placeholder="案件名・事業主・設計・施工で検索" value={q} onChange={e=>setQ(e.target.value)}/></div>
      </div>
      <div className="ctrl-row yr"><Label>竣工年</Label>
        <div className="range"><span className="yv">{range[0]}</span>
          <div className="sliders">
            <input type="range" min="2020" max="2050" value={range[0]} aria-label="竣工年の下限"
              onChange={e=>setRange([Math.min(+e.target.value,range[1]),range[1]])}/>
            <input type="range" min="2020" max="2050" value={range[1]} aria-label="竣工年の上限"
              onChange={e=>setRange([range[0],Math.max(+e.target.value,range[0])])}/>
          </div><span className="yv">{range[1]}</span></div>
      </div>
    </section>
  );
}

/* ---------- 人口動態タブ ---------- */
function PopView({prefs,blockSel}){
  const [popMode,setPopMode]=useState("index");
  const [popScope,setPopScope]=useState("pref");
  const popData=useMemo(()=>{
    const rows=POP_YEARS.map(y=>({year:y}));
    const add=(name,arr)=>rows.forEach((r,i)=>{r[name]=popMode==="index"?+(arr[i]/arr[0]*100).toFixed(1):arr[i];});
    if(popScope==="pref"){PREFS.filter(p=>prefs.includes(p.name)).forEach(p=>add(p.name,p.pop));}
    else{const list=blockSel?BLOCKS.filter(b=>b.id===blockSel):BLOCKS.filter(b=>prefs.includes(b.pref)).slice(0,8);
      list.forEach(b=>add(`${b.short}（${b.unit}）`,b.pop));}
    return rows;
  },[popScope,popMode,prefs,blockSel]);
  const popKeys=popData.length?Object.keys(popData[0]).filter(k=>k!=="year"):[];
  const LINE_C=["#E0B25C","#8FB8DC","#7FCBB4","#DE8C67","#B3A5DE","#D0997A","#A2BFA2","#DDA0BC"];
  return (
    <section className="pop">
      <div className="sec-hd">
        <h2><IconPop width={18} height={18}/>人口動態　2020–2050</h2>
        <div className="sec-ctl">
          <div className="seg">
            <button className={popScope==="pref"?"on":""} onClick={()=>setPopScope("pref")}>都県別</button>
            <button className={popScope==="block"?"on":""} onClick={()=>setPopScope("block")}>ブロック別</button>
          </div>
          <div className="seg">
            <button className={popMode==="index"?"on":""} onClick={()=>setPopMode("index")}>指数（2020=100）</button>
            <button className={popMode==="abs"?"on":""} onClick={()=>setPopMode("abs")}>実数</button>
          </div>
        </div>
      </div>
      <p className="sec-note">
        出典：国立社会保障・人口問題研究所「日本の地域別将来推計人口（令和5(2023)年推計）」。2020年は国勢調査人口、
        2025年以降は5年ごとの推計値。ブロック別は各ブロックを代表する市区の値。地図の「人口」レイヤーでは、
        この2050年指数を面の色（増加=青緑／概ね横ばい=灰／減少=赤茶）と円の大きさ（人口規模）で表示している。
      </p>
      <div className="chart">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={popData} margin={{top:10,right:24,bottom:4,left:8}}>
            <CartesianGrid stroke="#26262C" vertical={false}/>
            <XAxis dataKey="year" stroke="#8B8A82" tick={{fontSize:12,fill:"#A9A79F"}} tickLine={false} axisLine={{stroke:"#3A3A44"}}/>
            <YAxis stroke="#8B8A82" tick={{fontSize:12,fill:"#A9A79F"}} tickLine={false} axisLine={false} width={66}
              tickFormatter={v=>popMode==="index"?v:(v/10000).toFixed(0)+"万"}/>
            <Tooltip contentStyle={TT} labelStyle={{color:"#F0EEE9"}} formatter={(v)=>popMode==="index"?v:fmt(v)+" 人"}/>
            <Legend wrapperStyle={{fontSize:12,color:"#B6B4AD",paddingTop:10}}/>
            {popMode==="index"&&<ReferenceLine y={100} stroke="#4A4A54" strokeDasharray="3 3"/>}
            {popKeys.map((k,i)=>(<Line key={k} type="monotone" dataKey={k} stroke={LINE_C[i%LINE_C.length]}
              strokeWidth={2} dot={{r:2.5}} activeDot={{r:5}}/>))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="agebox">
        <h3 className="age-h">年齢構成の変化</h3>
        <p className="age-lead">
          総数の増減だけでは、街に必要な用途は読めない。オフィス需要を支える生産年齢人口と、
          住宅・医療・生活サービスの需要を規定する高齢人口は、異なる方向へ動く。
        </p>
        <div className="tblwrap"><table className="tbl">
          <thead><tr><th>全国の年齢3区分</th><th className="r">2020年</th><th className="r">構成比</th>
            <th className="r">2050年</th><th className="r">構成比</th><th className="r">増減</th></tr></thead>
          <tbody>
            {AGE_NATION.map((a,i)=>(<tr key={i}>
              <td className="nm"><span className="ub" style={{color:a.c}}>■</span>{a.seg}</td>
              <td className="r mono">{fmt(a.y2020)}万人</td>
              <td className="r mono">{a.p2020}%</td>
              <td className="r mono">{fmt(a.y2050)}万人</td>
              <td className="r mono">{a.p2050}%</td>
              <td className="r mono" style={{color:a.y2050>=a.y2020?"#7FCBB4":"#DE8C67"}}>
                {a.y2050>=a.y2020?"+":""}{fmt(a.y2050-a.y2020)}万人</td></tr>))}
          </tbody>
        </table></div>
        <p className="note tight">
          生産年齢人口は30年で1,969万人（−26.2%）減る一方、高齢人口は285万人増える。高齢人口のピークは2043年の3,953万人。
          出典：<A s={S.mlitData}/>（社人研 令和5年推計に基づく国土交通省データ集）。
        </p>
        <div className="tblwrap" style={{marginTop:18}}><table className="tbl">
          <thead><tr><th>都県別の高齢化率</th><th className="r">直近（2024年）</th><th className="r">2050年</th>
            <th className="r">上昇幅</th><th className="r">65歳以上人口指数<br/>（2020=100）</th><th>読み方</th></tr></thead>
          <tbody>
            {AGE_PREF.map((a,i)=>(<tr key={i}>
              <td className="nm">{a.pref}</td>
              <td className="r mono">{a.cur!==null?a.cur+"%":"—"}</td>
              <td className="r mono" style={{color:a.y2050!==null?"#E0B25C":"var(--mu)"}}>
                {a.y2050!==null?a.y2050+"%":"—"}</td>
              <td className="r mono">{a.cur!==null&&a.y2050!==null?"+"+(a.y2050-a.cur).toFixed(1)+"pt":"—"}</td>
              <td className="r mono">{a.idx65!==null?a.idx65:"—"}</td>
              <td className="dim">{a.note}</td></tr>))}
          </tbody>
        </table></div>
        <p className="note tight">
          出典：<A s={S.kourei}/>、<A s={S.ipssGaiyo}/>。「—」は出典に個別記載がなく、確認できていない項目。
          総人口が増える東京でも高齢人口は33%増える点が、住宅・生活サービス系の再開発を後押しする構造になっている。
        </p>
      </div>

      <div className="reads">
        <Read t="東京都は2040年前後がピーク">
          都全体では2040年に約1,450万人で頂点を打ち、2050年でも2020年比＋2.5%を保つ。ただし増加分は都心区と湾岸に偏り、多摩は2030年代から減少に転じる。
        </Read>
        <Read t="開発の集中と人口の伸びは重なる">
          中央区（2050年 指数124.7）、港区（120.0）、千代田区（119.7）、江東区（113.0）はいずれも案件密度が高い。住宅を伴う大街区開発が推計人口を押し上げている。
        </Read>
        <Read t="県部は総量減の中での拠点集中">
          神奈川 −7.7%、埼玉 −9.7%、千葉 −9.5%（2020→2050年）。一方で流山市は＋20.9%と、開発余地のある沿線拠点に需要が集約する。
        </Read>
      </div>
    </section>
  );
}

