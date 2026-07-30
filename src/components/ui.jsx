import React from "react";
import { CertGlyph, IconLink } from "./icons.jsx";
import { RANK_C } from "../data/certSystems.js";

const RankBadge=({sys,rank})=>{
  if(!rank||rank==="—")return <span className="rk none">ランク未公表</span>;
  return <span className="rk" style={{color:RANK_C(rank),borderColor:RANK_C(rank)+"77"}}>
    <CertGlyph sys={sys} size={13}/>{rank}</span>;
};

const Row=({k,children})=>(<div className="row"><div className="row-k">{k}</div><div className="row-v">{children}</div></div>);
const A=({s})=><a href={s.u} target="_blank" rel="noreferrer">{s.t}<IconLink width={10} height={10}/></a>;
const Label=({children})=><div className="lbl">{children}</div>;
const Stat=({k,v,u})=>(<div className="stat"><div className="stat-k">{k}</div><div className="stat-v">{v}<span>{u}</span></div></div>);
const Read=({t,children})=>(<div className="read"><h4>{t}</h4><p>{children}</p></div>);


export { RankBadge, Row, A, Label, Stat, Read };
