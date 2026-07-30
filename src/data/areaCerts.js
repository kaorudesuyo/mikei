import { S } from "./sources.js";

/* ================== 街区・エリア一括の環境認証 ==================
   LEED ND等は「街区」に付与される認証であり、構成棟が個別に取得したものではない。
   v3までは構成棟それぞれに同じNDを記載していたため重複カウントが生じていた。
   v4では本テーブルに1件ずつ登録し、棟単位認証（各案件のcert）と区別して集計する。
   同一認証のPlan認証→本認証は「段階の進行」であり、stages配列にまとめ1件と数える。 */
const AREA_CERTS=[
 {id:"ac-toranomon",area:"虎ノ門ヒルズエリア",members:["t3-01","t3-02"],
  sys:"LEED",scope:"ND（街区・エリア一括）",rank:"プラチナ",
  stages:[{st:"Plan認証（予備）",date:"2021年"},{st:"本認証（Built Project）",date:"2025年11月"}],
  note:"エリア全体への認証。虎ノ門ヒルズ（森タワー・ビジネスタワー・レジデンシャルタワー・ステーションタワー等）を一括で評価したもので、都内初のNDプラチナ。",
  src:[S.woonerf]},
 {id:"ac-azabudai",area:"麻布台ヒルズ",members:["t3-03","t3-04"],
  sys:"LEED",scope:"ND（街区・エリア一括）",rank:"プラチナ",
  stages:[{st:"Plan認証",date:"2021年"},{st:"本認証（Built Project）",date:"2025年11月"}],
  note:"約8.1haの街区全体への認証。LEED NDとLEED BD+C（森JPタワー）の両方でプラチナを取得したのは国内初。",
  src:[S.woonerf]},
 {id:"ac-takanawa",area:"TAKANAWA GATEWAY CITY（街全体）",members:["t5-01"],
  sys:"LEED",scope:"ND v4（街区・エリア一括）",rank:"ゴールド",
  stages:[{st:"Plan認証",date:"2022年4月時点"}],
  note:"街全体でのPlan認証。複合棟Ⅰ・Ⅱの棟単位予備認証（BD+C: CS）とは別の認証。",
  src:[S.jreCert]},
 {id:"ac-kashiwanoha",area:"柏の葉スマートシティ",members:["c2-02"],
  sys:"LEED",scope:"ND（街区・エリア一括）",rank:"プラチナ",
  stages:[{st:"計画（Plan）認証",date:"—"}],
  note:"郊外型の街区として国内で数少ないNDプラチナ（計画認証）。虎ノ門ヒルズ・麻布台ヒルズと並ぶ3例のひとつと紹介される。",
  src:[S.mecyes]},
 {id:"ac-nihonbashi",area:"東京ミッドタウン日本橋（街区全体）",members:["t2-04"],
  sys:"DBJ",scope:"街区全体",rank:"—",
  stages:[{st:"PLAN認証",date:"2023年3月"}],
  note:"街区全体でのDBJ Green Building プラン認証。ランクの公表は確認できていない。",
  src:[S.mfNihonbashi]},
 {id:"ac-harumi-nd",area:"HARUMI FLAG（晴海五丁目西地区・街区全体）",members:["t9-01"],
  sys:"LEED",scope:"ND（街区・エリア一括）",rank:"ゴールド",
  stages:[{st:"計画（Plan）認証",date:"2018年11月"},{st:"本認証（Built Project）",date:"2026年3月"}],
  note:"LEED ND計画認証とSITES予備認証の同時取得は世界初とされる。竣工後の2026年3月に本認証（Built Project）へ移行した。",
  src:[S.nskHF]},
 {id:"ac-harumi-sites",area:"HARUMI FLAG（街区ランドスケープ）",members:["t9-01"],
  sys:"SITES",scope:"街区の外部空間一括",rank:"ゴールド",
  stages:[{st:"予備認証",date:"2018年11月"},{st:"本認証",date:"2026年3月"}],
  note:"ランドスケープの持続可能性を評価するSITESの国内先行事例。",
  src:[S.nskHF]},
 {id:"ac-harumi-casbee",area:"HARUMI FLAG（街区全体）",members:["t9-01"],
  sys:"CASBEE",scope:"CASBEE-街区（街区・エリア一括）",rank:"Sランク",
  stages:[{st:"認証取得",date:"2018年11月"}],
  note:"マンション開発を中心とする事業として国内初のSランク。生物多様性のABINC ADVANCE認証（第1号）も併せて取得。",
  src:[S.nskHF]},
];


export { AREA_CERTS };
