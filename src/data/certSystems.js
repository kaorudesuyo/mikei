/* ================== 環境認証スキーム ==================
   段階の用語整理（集計・表示の前提）
   ・Plan認証／プラン認証   … 計画・設計内容に対する認証（LEED ND Plan、DBJプラン等）
   ・予備認証／プレ認証     … 設計段階の暫定評価。竣工後の本認証で確定する（LEED予備、WELLプレ等）
   ・本認証                 … 竣工後（または運用実績）に対する確定認証
   ・棟単位／街区単位       … LEED BD+C・CASBEE・ZEB等は原則棟単位、LEED NDは街区単位。
                              街区単位の認証は AREA_CERTS に分離し、構成棟に重複計上しない  */
const CERT_SYS={
  LEED:{c:"#6FBE8E",full:"LEED（Leadership in Energy and Environmental Design）",
    body:"米国グリーンビルディング協会（USGBC）／GBCIが認証",ranks:"プラチナ ＞ ゴールド ＞ シルバー ＞ サーティファイド",
    note:"110点満点の加点方式で、必須項目を満たさないと認証されない。棟を対象とするBD+C: CS（コア＆シェル）と、街区を対象とするND（Neighborhood Development）は別カテゴリーの認証。",
    url:"https://www.usgbc.org/leed"},
  WELL:{c:"#DDA0BC",full:"WELL Building Standard",
    body:"International WELL Building Institute（GBCIが認証）",ranks:"プラチナ ＞ ゴールド ＞ シルバー ＞ ブロンズ",
    note:"人の健康とウェルネスへの影響を評価する国際基準。ビルオーナーが共用部等を対象に取得するWELL Coreが大規模オフィスでは主流。",
    url:"https://www.wellcertified.com/"},
  CASBEE:{c:"#E0B25C",full:"CASBEE-建築／不動産（建築環境総合性能評価システム）",
    body:"住宅・建築SDGs推進センター（IBECs）と認定認証機関",ranks:"S ＞ A ＞ B+ ＞ B− ＞ C",
    note:"環境品質（Q）を環境負荷（L）で除したBEE値で格付けする日本発の制度。新築時のCASBEE-建築、竣工後1年以上の既存ビルを対象とするCASBEE-不動産、街区対象のCASBEE-街区などの体系に分かれる。竣工前の案件は主流のCASBEE-不動産をそもそも取得できないため、開発中の案件リストでは実態より少なく見える。",
    url:"https://www.ibecs.or.jp/CASBEE/"},
  SWO:{c:"#E0B25C",full:"CASBEE-スマートウェルネスオフィス",
    body:"住宅・建築SDGs推進センター（IBECs）と認定認証機関",ranks:"S ＞ A ＞ B+ ＞ B− ＞ C",
    note:"CASBEEの派生制度。建物利用者の健康性・快適性、知的生産性、安全・安心の性能を評価する。環境性能のCASBEE-建築と併記で取得する例が多い。",
    url:"https://www.ibecs.or.jp/CASBEE/"},
  ZEB:{c:"#8FB8DC",full:"ZEB（ネット・ゼロ・エネルギー・ビル）",
    body:"経済産業省・環境省の定義に基づく第三者評価（BELSの枠組みで判定）",ranks:"『ZEB』 ＞ Nearly ZEB ＞ ZEB Ready ＞ ZEB Oriented",
    note:"一次エネルギー消費量の削減率で区分。ZEB Readyは再エネを除き50%以上削減、ZEB Orientedは大規模建築向けに40%以上（事務所）等。BELS★5と併記される場合、両者は同一評価の別表示であり2つの認証ではない。",url:""},
  ZEH:{c:"#C9B27E",full:"ZEH-M（集合住宅版 ネット・ゼロ・エネルギー・ハウス）",
    body:"経済産業省・環境省の定義に基づく第三者評価",ranks:"『ZEH-M』 ＞ Nearly ZEH-M ＞ ZEH-M Ready ＞ ZEH-M Oriented",
    note:"複合開発の住宅部分に適用される。オフィス部分のZEBと組み合わせて取得する例が増えている。",url:""},
  BELS:{c:"#A2BFA2",full:"BELS（建築物省エネルギー性能表示制度）",
    body:"登録建築物調査機関等の第三者評価機関",ranks:"★5 ＞ ★4 ＞ ★3 ＞ ★2 ＞ ★1",
    note:"省エネ性能を星の数で表示する制度。ZEB水準の判定はBELSの枠組みで行われるため、本アプリではZEB区分が公表されている案件はZEB欄に集約し、BELS欄には星のみ公表の案件を載せる。",url:""},
  DBJ:{c:"#92C6B4",full:"DBJ Green Building 認証",
    body:"日本政策投資銀行（DBJ）",ranks:"★5 ＞ ★4 ＞ ★3 ＞ ★2 ＞ ★1",
    note:"環境性能に加え、防災やコミュニティ配慮などステークホルダー対応を総合評価する国内制度。設計段階のプラン認証と竣工後の本認証がある。",
    url:"https://www.dbj.jp/service/program/g_building/index.html"},
  SITES:{c:"#B0C46E",full:"SITES（Sustainable SITES Initiative）",
    body:"GBCI",ranks:"プラチナ ＞ ゴールド ＞ シルバー ＞ サーティファイド",
    note:"建物ではなくランドスケープ・外部空間の持続可能性を評価する認証。国内の取得例はまだ少ない。",
    url:"https://www.sustainablesites.org/"},
};
const RANK_C=(r)=>{const s=String(r);
  if(s.includes("プラチナ")||s.includes("『ZEB』"))return "#E4E4EA";
  if(s.includes("ゴールド")||s.includes("★5")||s==="S"||s.includes("Sランク"))return "#E0B25C";
  if(s.includes("シルバー")||s.includes("★4"))return "#B4B4BC";
  if(s.includes("Ready"))return "#8FB8DC";
  if(s.includes("Oriented"))return "#9AA9B8";
  return "#B6B4AD";};

/* ================== 用途・進捗 ================== */
const USE={
  office :{label:"オフィス主体",     c:"#8FB8DC"},
  mixed  :{label:"複合（大街区）",   c:"#E0B25C"},
  resi   :{label:"住宅主体",         c:"#D0997A"},
  retail :{label:"商業・エンタメ",   c:"#DE8C67"},
  culture:{label:"文化・MICE・公共", c:"#7FCBB4"},
  infra  :{label:"交通・基盤",       c:"#A49FC4"},
};
const STATUS={done:{label:"竣工済"},wip:{label:"工事中"},plan:{label:"計画・準備中"}};


export { CERT_SYS, RANK_C, USE, STATUS };
