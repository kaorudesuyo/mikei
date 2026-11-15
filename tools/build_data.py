#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""未景 MIKEI ── データベース（Excel）→ アプリ用 JSON 変換
使い方: python3 tools/build_data.py <mikei-redevelopment-database-vX.xlsx>
Excel を唯一の正とし、アプリはこのスクリプトが出力する src/data/db.json だけを読む。
アプリ側で付け足すのは「集計のための正規化」（企業グループ・施工会社名の名寄せ、時間軸の数値化）のみ。
"""
import json, re, sys, collections
from pathlib import Path
from openpyxl import load_workbook

SRC = sys.argv[1]
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "db.json"
NOW = 2026.87  # 基準日 2026-11-15 を年小数で表したもの

wb = load_workbook(SRC, data_only=True)
def rows(name):
    ws = wb[name]; H = [c.value for c in ws[1]]
    return [dict(zip(H, r)) for r in ws.iter_rows(min_row=2, values_only=True) if r[0] is not None]

# ---------- 名寄せ：施主（企業グループ）
GROUPS = {
 "三井不動産グループ": ["三井不動産", "三井不動産レジデンシャル"],
 "三菱地所グループ": ["三菱地所", "三菱地所レジデンス"],
 "東急グループ": ["東急", "東急不動産", "東急百貨店", "東急レクリエーション"],
 "JR東日本": ["JR東日本", "東日本旅客鉄道"],
 "大和ハウスグループ": ["大和ハウス工業", "大和ハウスリアルティマネジメント"],
 "小田急グループ": ["小田急電鉄", "小田急不動産"],
 "旭化成グループ": ["旭化成不動産レジデンス", "旭化成ホームズ"],
 "伊藤忠グループ": ["伊藤忠商事", "伊藤忠都市開発"],
 "トヨタグループ": ["トヨタ自動車", "トヨタ不動産"],
 "大成建設グループ": ["大成建設", "大成有楽不動産"],
 "京急": ["京浜急行電鉄"],
 "都市再生機構（UR）": ["都市再生機構"],
}
G_OF = {m: g for g, ms in GROUPS.items() for m in ms}
def dev_groups(raw):
    out = []
    for d in raw:
        if not d or d == "—" or d.startswith("ほか"): continue
        g = G_OF.get(d, d)
        if g not in out: out.append(g)
    return out

# ---------- 名寄せ：施工会社
CON = [("鹿島建設", ["鹿島"]), ("大成建設", ["大成"]), ("清水建設", ["清水"]), ("大林組", ["大林"]), ("竹中工務店", ["竹中"]),
       ("戸田建設", ["戸田"]), ("前田建設工業", ["前田"]), ("三井住友建設", ["三井住友建設"]), ("フジタ", ["フジタ"]), ("西松建設", ["西松"]),
       ("長谷工コーポレーション", ["長谷工"]), ("熊谷組", ["熊谷"]), ("東急建設", ["東急"]), ("佐藤工業", ["佐藤工業"]), ("五洋建設", ["五洋"]),
       ("大末建設", ["大末"]), ("銭高組", ["銭高"]), ("鉄建建設", ["鉄建"]), ("西武建設", ["西武建設"]), ("福田組", ["福田組"]),
       ("岩田地崎建設", ["岩田地崎"]), ("松井建設", ["松井建設"]), ("松永建設", ["松永建設"]), ("新日本建設", ["新日本"]),
       ("ファーストコーポレーション", ["ファーストコーポレーション"]), ("大和ハウス工業", ["大和ハウス"]), ("川木建設", ["川木"]),
       ("埼和興産", ["埼和"]), ("小谷組", ["小谷組"])]
UNK = re.compile(r"^(未定|未公表|—)")
def contractors(text):
    out = []
    for seg in re.split(r"[／]", text or ""):
        body = seg.split("：", 1)[1] if ("：" in seg and "（" not in seg.split("：", 1)[0]) else seg
        if UNK.match(body.strip()) or UNK.match(seg.strip()): continue
        for name, als in CON:
            if any(a in seg for a in als) and name not in out: out.append(name)
    return out

# ---------- 時間軸の数値化（年小数）
def ytime(text, fallback):
    """『2029年3月』『2029年度』などから年小数を得る。月があれば月央、年度は翌年3月末、年のみは年央。"""
    if not text: return fallback
    m = re.search(r"(\d{4})年(\d{1,2})月", text)
    if m: return int(m.group(1)) + (int(m.group(2)) - 0.5) / 12
    m = re.search(r"(\d{4})年度", text)
    if m: return int(m.group(1)) + 1.2
    m = re.search(r"(\d{4})年", text)
    if m: return int(m.group(1)) + 0.5
    return fallback
def start_text(s):
    """着工時期（詳細）から『着工』に係る箇所を優先して取り出す"""
    parts = re.split(r"[／]", s or "")
    for p in parts:
        if "着工" in p and "解体" not in p and re.search(r"\d{4}", p): return p
    for p in parts:
        if re.search(r"\d{4}", p): return p
    return ""

P, cert_rows, ac_members = rows("案件マスタ"), rows("環境認証_棟単位"), rows("街区認証_対象案件")
links, bl = rows("案件_出典"), rows("棟・街区内訳")
STK = {"竣工済": "done", "工事中": "wip", "計画・準備中": "plan"}
USEK = {"オフィス主体": "office", "複合（大街区）": "mixed", "住宅主体": "resi", "商業・エンタメ": "retail", "文化・MICE・公共": "culture", "交通・基盤": "infra"}
by = collections.defaultdict(list)
for c in cert_rows:
    by[("c", c["案件ID"])].append({"sys": c["制度コード"], "scope": c["対象範囲"], "rank": c["ランク"], "stage": c["取得段階（原表記）"],
                                   "cls": {"認証取得": "got", "予備・プラン認証": "pre", "取得予定・目標": "plan"}[c["段階区分"]], "date": c["時点"]})
for m in ac_members: by[("a", m["案件ID"])].append(m["街区認証ID"])
for l in links: by[("s", l["案件ID"])].append(l["出典ID"])
for b in bl:
    by[("b", b["案件ID"])].append([b["棟・街区名"], b["地上階"], b["地下階"], b["高さ_m"], b["延床面積_㎡"], b["用途"], b["住宅戸数"], b["設計"], b["施工"], b["着工"], b["竣工"]])

def short(n):
    s = re.sub(r"^[（(]仮称[）)]", "", n)
    s = re.split(r"（", s)[0].strip() or n
    return re.sub(r"(第一種|第二種)?市街地再開発事業$", "", s).strip() or s

projects = []
for r in P:
    st = STK[r["進捗"]]; y = r["竣工年"]
    t1 = ytime(r["竣工時期（詳細）"], None) if y else None
    if y and (t1 is None or abs(t1 - (y + 0.5)) > 1.6): t1 = y + 0.5        # 代表年と食い違う表記（複数期など）は代表年に合わせる
    t0 = ytime(start_text(r["着工時期（詳細）"]), None)
    if t1 is not None:
        if st == "done": t1 = min(t1, NOW - 0.02)
        else: t1 = max(t1, NOW + 0.12)
    if t0 is None: t0 = (t1 - 4.0) if t1 else None
    if t0 is not None:
        if st == "plan": t0 = max(t0, NOW + 0.3)
        else: t0 = min(t0, NOW - 0.05)
        if t1 is not None and t0 > t1 - 1.0: t0 = t1 - (3.0 if st != "plan" else 2.5)
        if st == "plan" and t0 < NOW + 0.3: t0 = NOW + 0.3
    raw_devs = [d.strip() for d in (r["事業主体（主要）"] or "").split("、") if d.strip() and d.strip() != "—"]
    projects.append({
        "id": r["案件ID"], "n": r["案件名"], "sn": short(r["案件名"]), "b": r["ブロックID"], "pref": r["都県"], "city": r["市区"],
        "use": USEK[r["主用途"]], "st": st, "stage": r["工程段階"], "y": y, "yc": r["竣工時期の確度"], "yl": r["竣工時期（詳細）"], "s": r["着工時期（詳細）"],
        "t0": None if t0 is None else round(t0, 2), "t1": None if t1 is None else round(t1, 2),
        "fl": r["階数・棟構成"], "h": r["最高高さ_m"], "gfa": r["延床面積_㎡"], "gs": r["延床面積の対象範囲"], "units": r["住宅戸数"], "mix": r["用途構成"],
        "devs": raw_devs, "dg": dev_groups(raw_devs), "own": r["事業者・施行者（詳細）"], "des": r["設計"], "con": r["施工"], "cg": contractors(r["施工"]),
        "ft": r["特徴"], "tier": r["確度"], "ll": [r["経度"], r["緯度"]], "asof": r["情報の時点"],
        "src": by[("s", r["案件ID"])], "certs": by[("c", r["案件ID"])], "ac": by[("a", r["案件ID"])], "bl": by[("b", r["案件ID"])],
    })

blocks = []
for b in rows("ブロックマスタ"):
    pop = [b[f"人口{y}"] for y in range(2020, 2051, 5)]
    blocks.append({"id": b["ブロックID"], "pref": b["都県"], "name": b["ブロック名"], "short": b["略称"], "kind": b["性格"], "area": b["対象エリア"],
                   "ll": [b["経度"], b["緯度"]], "unit": b["人口の代表市区"], "pop": pop, "popNote": b["人口データの区分"], "note": b["市場の見立て"]})
acs = [{"id": a["街区認証ID"], "area": a["エリア名"], "sys": a["制度コード"], "scope": a["対象範囲"], "rank": a["ランク"], "stages": a["段階の推移"],
        "note": a["注記"], "members": [m["案件ID"] for m in ac_members if m["街区認証ID"] == a["街区認証ID"]]} for a in rows("環境認証_街区")]
used = {s for p in projects for s in p["src"]}
def safe_url(u):  # 出典リンクは https のみ通す（javascript: などの混入を構造的に排除）
    return u if isinstance(u, str) and re.match(r"^https://[A-Za-z0-9.-]+(/|$)", u) else None
sources = {s["出典ID"]: {"t": s["タイトル"], "u": safe_url(s["URL"]), "k": s["種別"]} for s in rows("出典マスタ") if s["出典ID"] in used}
systems = {c["値"]: c["定義"] for c in rows("コード表") if c["コード種別"] == "認証制度"}

db = {"meta": {"asof": "2026-11-15", "now": NOW, "db": Path(SRC).name, "groups": GROUPS},
      "projects": projects, "blocks": blocks, "areaCerts": acs, "sources": sources, "systems": systems}
OUT.write_text(json.dumps(db, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
bad = [k for k, v in sources.items() if v["u"] is None]
print("projects", len(projects), "blocks", len(blocks), "sources", len(sources), "non-https sources", bad, "| size", OUT.stat().st_size)
print("no t1:", sum(p["t1"] is None for p in projects), "no cg:", sum(not p["cg"] for p in projects), "no dg:", sum(not p["dg"] for p in projects))
c = collections.Counter(g for p in projects for g in p["dg"]); print(c.most_common(14))
c = collections.Counter(g for p in projects for g in p["cg"]); print(c.most_common(14))
print([(p["id"], p["st"], p["t0"], p["t1"]) for p in projects if p["t0"] and p["t1"] and not (p["t0"] < p["t1"])])
print([(p["sn"], p["t0"], p["t1"]) for p in projects[:6]], [(p["sn"]) for p in projects[40:52]])
