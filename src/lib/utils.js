import { BLOCKS } from "../data/blocks.js";
import { AREA_CERTS } from "../data/areaCerts.js";

const fmt=(n)=>n?n.toLocaleString("ja-JP"):"—";
const blockOf=(id)=>BLOCKS.find(b=>b.id===id);
const tick=(h)=>h?Math.max(8,Math.min(42,h*0.095)):8;
const dotR=(g)=>g?Math.max(2.4,Math.min(7.5,Math.sqrt(g)/92)):2.4;
const TT={background:"#16161B",border:"1px solid #3A3A44",borderRadius:0,fontSize:12.5,color:"#F0EEE9"};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const areaCertsOf=(pid)=>AREA_CERTS.filter(a=>a.members.includes(pid));
const hasAnyCert=(p)=>(p.cert&&p.cert.length>0)||areaCertsOf(p.id).length>0;
const popIdx50=(b)=>+(b.pop[6]/b.pop[0]*100).toFixed(1);


export { fmt, blockOf, tick, dotR, TT, clamp, areaCertsOf, hasAnyCert, popIdx50 };
