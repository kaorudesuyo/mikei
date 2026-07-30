import React from "react";
import { CERT_SYS } from "../data/certSystems.js";

/* ================== アイコン（線画SVG・絵文字不使用） ================== */
const ico={width:16,height:16,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",
  strokeWidth:1.25,strokeLinecap:"round",strokeLinejoin:"round"};
const IconMap   =(p)=><svg {...ico} {...p}><path d="M1 4.2 5.6 2.2v9.6L1 13.8z"/><path d="M5.6 2.2 10.4 4.2v9.6L5.6 11.8z"/><path d="M10.4 4.2 15 2.2v9.6l-4.6 2z"/></svg>;
const IconTime  =(p)=><svg {...ico} {...p}><path d="M1.5 13.5h13"/><path d="M3.5 13.5V8"/><path d="M6.5 13.5V4"/><path d="M9.5 13.5V7"/><path d="M12.5 13.5V2.5"/></svg>;
const IconStock =(p)=><svg {...ico} {...p}><rect x="1.5" y="6.5" width="4" height="7"/><rect x="6" y="3.5" width="4" height="10"/><rect x="10.5" y="8.5" width="4" height="5"/><path d="M1.5 13.5h13"/></svg>;
const IconCert  =(p)=><svg {...ico} {...p}><circle cx="8" cy="6.2" r="4.2"/><path d="M5.6 9.8 4.6 14l3.4-1.7L11.4 14l-1-4.2"/></svg>;
const IconList  =(p)=><svg {...ico} {...p}><path d="M2 4h12M2 8h12M2 12h8"/></svg>;
const IconPop   =(p)=><svg {...ico} {...p}><path d="M1.5 12 5 7.5l3.2 2.6L14.5 3"/><path d="M11 3h3.5v3.5"/></svg>;
const IconSearch=(p)=><svg {...ico} {...p}><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14"/></svg>;
const IconClose =(p)=><svg {...ico} {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>;
const IconLink  =(p)=><svg {...ico} {...p}><path d="M9 3h4v4"/><path d="M13 3 7.5 8.5"/><path d="M12 9.5V13H3V4h3.5"/></svg>;
const IconAge   =(p)=><svg {...ico} {...p}><circle cx="8" cy="8" r="6.2"/><path d="M8 4.4V8l2.6 1.6"/></svg>;
const IconArea  =(p)=><svg {...ico} {...p}><rect x="2.2" y="2.2" width="11.6" height="11.6"/><path d="M2.2 6.1h11.6M6.1 2.2v11.6"/></svg>;
const IconPlus  =(p)=><svg {...ico} {...p}><path d="M8 3v10M3 8h10"/></svg>;
const IconMinus =(p)=><svg {...ico} {...p}><path d="M3 8h10"/></svg>;
const IconReset =(p)=><svg {...ico} {...p}><path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.75"/><path d="M13.4 2.6v3.2h-3.2"/></svg>;
const IconPin   =(p)=><svg {...ico} {...p}><path d="M8 14.5s4.6-4.2 4.6-7.6A4.6 4.6 0 0 0 3.4 6.9c0 3.4 4.6 7.6 4.6 7.6Z"/><circle cx="8" cy="6.8" r="1.6"/></svg>;
const IconUsers =(p)=><svg {...ico} {...p}><circle cx="5.6" cy="5.6" r="2.4"/><path d="M1.8 13.2c0-2.2 1.7-3.8 3.8-3.8s3.8 1.6 3.8 3.8"/><circle cx="11.4" cy="5.2" r="1.9"/><path d="M10.6 9.3c2 .1 3.6 1.6 3.6 3.6"/></svg>;
const IconLayer =(p)=><svg {...ico} {...p}><path d="M8 2.4 14.4 6 8 9.6 1.6 6Z"/><path d="M2.6 9.2 8 12.2l5.4-3"/></svg>;
const IconChevD =(p)=><svg {...ico} {...p}><path d="M3.5 6 8 10.5 12.5 6"/></svg>;
const IconBldg  =(p)=><svg {...ico} {...p}><rect x="4.2" y="2.2" width="7.6" height="11.6"/><path d="M2 13.8h12"/><path d="M6.4 5h1.2M8.8 5H10M6.4 7.4h1.2M8.8 7.4H10M6.4 9.8h1.2M8.8 9.8H10"/></svg>;

/* ================== ブランドアイコン「未景」 ==================
   地図のピン記法を紋章化したもの。縦棒＝建物、棒の長さ＝高さ、横線＝地表。
   左から右への伸びが 2020→2050 の時間軸とスカイラインを兼ねる。
   右端だけが金の破線＋頂部の点＝「まだ建っていない未来の一棟」。
   simple=true は32px以下用の簡略版（破線が潰れるため半透明の実線に置換）。 */
const MikeiMark=({size=40,simple=false,plate=true,rounded=true})=>(
  <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label="未景">
    {plate&&<rect width="96" height="96" rx={rounded?21:0} fill="#111116"/>}
    {simple?(<>
      <line x1="26" y1="70" x2="70" y2="70" stroke="#4A4A54" strokeWidth="5"/>
      <line x1="31" y1="70" x2="31" y2="52" stroke="#F0EEE9" strokeWidth="9" strokeLinecap="round"/>
      <line x1="48" y1="70" x2="48" y2="40" stroke="#F0EEE9" strokeWidth="9" strokeLinecap="round"/>
      <line x1="65" y1="70" x2="65" y2="28" stroke="#E0B25C" strokeWidth="9" strokeLinecap="round" opacity=".55"/>
      <circle cx="65" cy="16" r="8" fill="#E0B25C"/>
    </>):(<>
      <line x1="20" y1="70" x2="76" y2="70" stroke="#3A3A44" strokeWidth="1.5"/>
      <line x1="27" y1="70" x2="27" y2="54" stroke="#F0EEE9" strokeWidth="3.4" strokeLinecap="round"/>
      <line x1="39" y1="70" x2="39" y2="44" stroke="#F0EEE9" strokeWidth="3.4" strokeLinecap="round"/>
      <line x1="51" y1="70" x2="51" y2="35" stroke="#F0EEE9" strokeWidth="3.4" strokeLinecap="round"/>
      <line x1="65" y1="70" x2="65" y2="22" stroke="#E0B25C" strokeWidth="3.4"
            strokeLinecap="round" strokeDasharray="7 5.5"/>
      <circle cx="65" cy="18" r="3.6" fill="#E0B25C"/>
    </>)}
  </svg>
);

/* 認証シンボル（公式ロゴの配色・構図を想起させるオリジナルのシール型アイコン。
   商標であるロゴそのものの複製ではない） */
const CertGlyph=({sys,size=18})=>{
  const p={width:size,height:size,viewBox:"0 0 20 20",role:"img","aria-label":sys};
  switch(sys){
    case "LEED": return(<svg {...p}><circle cx="10" cy="10" r="9.2" fill="#5E9732"/><circle cx="10" cy="10" r="7.5" fill="none" stroke="#EAF5DF" strokeWidth="0.7" opacity="0.75"/><path d="M10 15.6V7.4" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round"/><path d="M10 9.6C10 6.7 11.9 5 14.7 5c0 2.9-1.8 4.9-4.7 4.4Z" fill="#FFFFFF"/><path d="M9.5 12.1C9.5 10 7.9 8.7 5.5 8.7c0 2.3 1.6 3.9 4 3.4Z" fill="#D7ECC2"/></svg>);
    case "WELL": return(<svg {...p}><circle cx="10" cy="10" r="9.2" fill="#17435F"/><circle cx="10" cy="10" r="7.6" fill="none" stroke="#9FC4D8" strokeWidth="0.7" opacity="0.9"/><path d="M4.7 6.9 7.1 13.3 10 7.5 12.9 13.3 15.3 6.9" fill="none" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    case "CASBEE": return(<svg {...p}><rect x="1" y="1" width="18" height="18" rx="3" fill="#F4F1E8"/><path d="M3.8 6.4C6.2 3.9 9.3 3.4 10 3.4" fill="none" stroke="#6FB53C" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 3.4c0.7 0 3.8 0.5 6.2 3" fill="none" stroke="#1B6FA8" strokeWidth="1.8" strokeLinecap="round"/><path d="M13.6 13.6a4.4 4.4 0 1 1 0-5.4" fill="none" stroke="#1B6FA8" strokeWidth="2" strokeLinecap="round"/></svg>);
    case "SWO": return(<svg {...p}><rect x="1" y="1" width="18" height="18" rx="3" fill="#F4F1E8"/><path d="M3.8 6.4C6.2 3.9 9.3 3.4 10 3.4" fill="none" stroke="#6FB53C" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 3.4c0.7 0 3.8 0.5 6.2 3" fill="none" stroke="#1B6FA8" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 16s-4.3-2.8-4.3-5.5c0-1.5 1.2-2.7 2.6-2.7 0.7 0 1.4 0.3 1.7 0.9 0.3-0.6 1-0.9 1.7-0.9 1.4 0 2.6 1.2 2.6 2.7C14.3 13.2 10 16 10 16Z" fill="#1B6FA8"/></svg>);
    case "ZEB": return(<svg {...p}><rect x="1" y="1" width="18" height="18" rx="3" fill="#EDF3F0"/><circle cx="15" cy="5" r="2.1" fill="#F5A11A"/><path d="M5 6.3h9.2L5.4 13.7h9.2" fill="none" stroke="#0E7A63" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.6 16.4h10.8" stroke="#0E7A63" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/></svg>);
    case "ZEH": return(<svg {...p}><rect x="1" y="1" width="18" height="18" rx="3" fill="#F6EFE2"/><circle cx="15.4" cy="4.8" r="1.7" fill="#F5A11A"/><path d="M3.4 9.8 10 4.2l6.6 5.6" fill="none" stroke="#C07A24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.4 9.6v6.6h9.2V9.6" fill="none" stroke="#C07A24" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7.6 13h4.8" stroke="#F5A11A" strokeWidth="1.8" strokeLinecap="round"/></svg>);
    case "BELS": return(<svg {...p}><rect x="1" y="1" width="18" height="18" rx="3" fill="#F2F1E7"/><path d="M10 2.9l1.7 3.4 3.8 0.6-2.8 2.7 0.7 3.7L10 11.6 6.6 13.3l0.7-3.7L4.5 6.9l3.8-0.6Z" fill="#F5A11A"/><path d="M4.6 15.9h10.8" stroke="#C9C6B8" strokeWidth="2" strokeLinecap="round"/><path d="M4.6 15.9h8" stroke="#3E7A46" strokeWidth="2" strokeLinecap="round"/></svg>);
    case "DBJ": return(<svg {...p}><path d="M10 1.6 17 4.2v6c0 3.7-3 6.2-7 8.2-4-2-7-4.5-7-8.2v-6Z" fill="#1E7A4C"/><path d="M10 4.6c0 2.9 1.7 4.6 4.4 4.6C14.4 6.3 12.7 4.6 10 4.6Z" fill="#9BD48F"/><path d="M10 8.6l1.2 2.4 2.7 0.4-2 1.9 0.5 2.7L10 14.7l-2.4 1.3 0.5-2.7-2-1.9 2.7-0.4Z" fill="#FFFFFF"/></svg>);
    case "SITES": return(<svg {...p}><circle cx="10" cy="10" r="9.2" fill="#5F7A26"/><path d="M2.9 13.2 6.6 8.6l2.6 2.8 3-3.8 4.9 5.6Z" fill="#9BB84C"/><path d="M2.9 13.2 6.6 8.6l2.6 2.8 3-3.8 4.9 5.6" fill="none" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16h12" stroke="#DDE9BF" strokeWidth="1.2" strokeLinecap="round"/></svg>);
    default: return(<svg {...p}><circle cx="10" cy="10" r="8.6" fill="#55554F"/></svg>);
  }
};


export { IconMap, IconTime, IconStock, IconCert, IconList, IconPop, IconSearch, IconClose, IconLink, IconAge, IconArea, IconPlus, IconMinus, IconReset, IconPin, IconUsers, IconLayer, IconChevD, IconBldg, CertGlyph, MikeiMark };
