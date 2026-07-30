import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Legend, ReferenceLine
} from "recharts";
import { POP_YEARS, STOCK_TYPE } from "../data/blocks.js";
import { fmt, TT, hasAnyCert } from "../lib/utils.js";
import { Row } from "./ui.jsx";

/* ============================ ブロックカード・初期パネル・部品 ============================ */
function BlockCard({b,items,setSel}){
  const gfa=items.reduce((s,p)=>s+(p.gfa||0),0);
  const idx=b.pop.map(v=>+(v/b.pop[0]*100).toFixed(1));
  const d=POP_YEARS.map((y,i)=>({year:y,v:idx[i]}));
  const certN=items.filter(hasAnyCert).length;
  return (<div className="dt">
    <div className="dt-top"><span className="bid">{b.id}</span></div>
    <h3 className="dt-n">{b.name}</h3>
    <div className="dt-b">{b.pref}<span className="sep">/</span>該当 {items.length} 件
      <span className="sep">/</span>延床計 約{Math.round(gfa/10000)} 万㎡<span className="sep">/</span>認証あり {certN} 件</div>
    <Row k="市場の見立て">{b.note}</Row>
    <Row k="既存ストック">
      <span className="ttag" style={{color:STOCK_TYPE[b.stockType].c,borderColor:STOCK_TYPE[b.stockType].c+"66"}}>
        {STOCK_TYPE[b.stockType].label}</span>
      <div className="mini2">{b.stockWard}　{b.stockNote}</div>
    </Row>
    <Row k={`人口指数（${b.unit}・2020=100）`}>
      <div style={{height:140,marginTop:6}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d} margin={{top:6,right:8,bottom:0,left:-16}}>
            <CartesianGrid stroke="#26262C" vertical={false}/>
            <XAxis dataKey="year" stroke="#8B8A82" tick={{fontSize:10,fill:"#A9A79F"}} tickLine={false} axisLine={{stroke:"#3A3A44"}}/>
            <YAxis stroke="#8B8A82" tick={{fontSize:10,fill:"#A9A79F"}} tickLine={false} axisLine={false} domain={["auto","auto"]}/>
            <ReferenceLine y={100} stroke="#4A4A54" strokeDasharray="3 3"/>
            <Tooltip contentStyle={TT}/>
            <Line type="monotone" dataKey="v" stroke="#E0B25C" strokeWidth={2} dot={{r:2.5}} name="指数"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mini">2050年 {idx[6]}（実数 {fmt(b.pop[6])} 人）</div>
    </Row>
    <Row k="登録案件">
      <ul className="mini-list">
        {items.map(p=><li key={p.id} onClick={()=>setSel(p.id)} className="clickable">
          <span className="mono">{p.y}</span> {p.n}
          <span className="devsm">{(p.devs||[]).slice(0,2).join("・")}</span></li>)}
        {!items.length&&<li className="dim">現在の絞り込み条件では該当なし</li>}
      </ul>
    </Row>
  </div>);
}
function Intro(){
  return (<div className="dt intro">
    <h3 className="dt-n">読み方</h3>
    <Row k="ピン">
      縦棒は1件の再開発。棒の長さ=建物高さ、根元の円=延床面積、色=主用途。先端に白点が付く案件は環境認証あり。
      ピンをクリックすると詳細が開き、事業主体・設計・施工・認証・出典まで確認できる。
    </Row>
    <Row k="操作">
      ドラッグで移動、ホイールやピンチで拡縮、ダブルクリックで拡大。都県やブロックを絞ると、案件が密集する部分を
      中心に見やすい倍率へ自動フィットする。「表示リセット」を押すと、いま選んでいる範囲（全体・都県・ブロック）の
      初期表示に戻る。広域表示ではブロックごとの件数バブル、拡大すると個別ピンと案件名に切り替わる。
    </Row>
    <Row k="人口レイヤー">
      地図右下の「人口」を押すと、ブロック代表市区の人口を円で重ねる。円の大きさ=人口規模、色=2050年の増減
      （青緑=増加、灰=横ばい、赤茶=減少）。開発の集中と人の流れを一画面で見比べられる。
    </Row>
    <Row k="収録基準">
      オフィス（事務所）または集合住宅を用途に含む再開発を対象とする。商業単独・アリーナ単独・
      庁舎単独・交通インフラ単独の事業は収録しない。
    </Row>
    <Row k="認証の数え方">
      環境認証は棟単位と街区一括（LEED ND等）を分けて登録し、二重計上を排除した。詳しくは「環境認証」タブの集計ルールを参照。
    </Row>
  </div>);
}

export { BlockCard, Intro };
