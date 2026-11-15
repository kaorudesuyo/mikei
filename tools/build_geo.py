#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""未景 MIKEI ── 基図データの生成（外部タイルに依存しない自前ホスト用）
入力（いずれもオープンデータ。出典・ライセンスは README の「基図データ」を参照）:
  1) 市区町村境界: smartnews-smri/japan-topography（国土交通省 国土数値情報〈行政区域〉を加工）
  2) 鉄道路線・駅: Seo-4d696b75/station_database（CC BY-SA 4.0）
使い方: python3 tools/build_geo.py <japan-topography のパス> <station_database のパス>
"""
import json, sys, math, re
from pathlib import Path
TOPO, STN = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "geo.json"
BB = (138.85, 34.85, 140.95, 36.4)   # 西, 南, 東, 北
db = json.loads((ROOT / "src" / "data" / "db.json").read_text(encoding="utf-8"))
units = {b["unit"] for b in db["blocks"]}

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy; md, mi = 0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L == 0: d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L)); d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > md: md, mi = d, i
        if md > tol * tol: keep[mi] = True; stack += [(a, mi), (mi, b)]
    return [p for p, k in zip(pts, keep) if k]
def rnd(ring, n): 
    out = []
    for x, y in ring:
        q = [round(x, n), round(y, n)]
        if not out or out[-1] != q: out.append(q)
    return out
def area_centroid(ring):
    a = cx = cy = 0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    if a == 0: return 0, ring[0]
    return abs(a / 2), [cx / (3 * a), cy / (3 * a)]
def polys(g): return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]

muni, ctx = [], []
for code in ("11", "12", "13", "14"):
    fc = json.loads((TOPO / f"data/municipality/geojson/s0010/N03-21_{code}_210101.json").read_text(encoding="utf-8"))
    merged = {}
    for f in fc["features"]:
        p = f["properties"]; cid = p["N03_007"]
        if not cid: continue
        ps = [[rnd(r, 4) for r in poly] for poly in polys(f["geometry"])]
        ps = [poly for poly in ps if len(poly[0]) >= 4 and max(y for _, y in poly[0]) > 35.0 - (0.2 if code != "13" else -0.25)]  # 東京都の島しょ部を除く
        if not ps: continue
        name = (p["N03_003"] or "") + (p["N03_004"] or "") if (p["N03_003"] or "").endswith("市") else (p["N03_004"] or p["N03_003"])
        m = merged.setdefault(cid, {"name": name, "pref": p["N03_001"], "city": p["N03_003"] if (p["N03_003"] or "").endswith("市") else None, "polys": []})
        m["polys"] += ps
    for cid, m in merged.items():
        best = max((area_centroid(poly[0]) for poly in m["polys"]), key=lambda t: t[0])
        unit = m["name"] if m["name"] in units else (f'{m["city"]}（全市）' if m["city"] and f'{m["city"]}（全市）' in units else None)
        muni.append({"type": "Feature", "id": int(cid), "properties": {"n": m["name"], "s": m["name"].replace(m["city"], "") if m["city"] else m["name"], "u": unit,
                     "c": [round(best[1][0], 4), round(best[1][1], 4)], "a": round(best[0] * 1e4, 1)},
                     "geometry": {"type": "MultiPolygon", "coordinates": m["polys"]}})
for code in ("08", "09", "10", "19", "22"):
    fc = json.loads((TOPO / f"data/municipality/geojson/s0010/N03-21_{code}_210101.json").read_text(encoding="utf-8"))
    for f in fc["features"]:
        for poly in polys(f["geometry"]):
            r = poly[0]
            if max(x for x, _ in r) < BB[0] - 0.6 or min(y for _, y in r) > BB[3] + 0.5 or max(y for _, y in r) < BB[1] - 0.2: continue
            r = rnd(dp(r, 0.004), 3)
            if len(r) >= 4: ctx.append([r])

# ---- 鉄道
lines = json.loads((STN / "out/main/line.json").read_text(encoding="utf-8"))
def cls(n):
    if "新幹線" in n: return "s"
    if any(k in n for k in ("メトロ", "地下鉄", "都営", "ブルーライン", "グリーンライン", "りんかい", "みなとみらい", "埼玉高速")): return "m"
    return "j" if n.startswith("JR") else "p"
rail = {"s": [], "j": [], "p": [], "m": []}
inb = lambda x, y: BB[0] <= x <= BB[2] and BB[1] <= y <= BB[3]
npts = 0
for l in lines:
    if l.get("closed"): continue
    f = STN / f'out/main/polyline/{l["code"]}.json'
    if not f.exists(): continue
    pl = json.loads(f.read_text(encoding="utf-8")); pr = pl.get("properties", {})
    if pr and (pr["east"] < BB[0] or pr["west"] > BB[2] or pr["north"] < BB[1] or pr["south"] > BB[3]): continue
    for ft in pl["features"]:
        seg = []
        for x, y in ft["geometry"]["coordinates"]:
            if inb(x, y): seg.append((x, y))
            else:
                if len(seg) > 1: rail[cls(l["name"])].append(rnd(dp(seg, 0.00007), 5)); 
                seg = []
        if len(seg) > 1: rail[cls(l["name"])].append(rnd(dp(seg, 0.00007), 5))
npts = sum(len(s) for v in rail.values() for s in v)

# ---- 駅（路線数の多い順。表示の優先度に使う）
st = [s for s in json.loads((STN / "out/main/station.json").read_text(encoding="utf-8")) if not s.get("closed") and s.get("prefecture") in (11, 12, 13, 14) and inb(s["lng"], s["lat"])]
st.sort(key=lambda s: -len(s["lines"]))
stations = [[re.sub(r"[(（].*?[)）]$", "", s["name"]), round(s["lng"], 5), round(s["lat"], 5), len(s["lines"])] for s in st]

geo = {"muni": {"type": "FeatureCollection", "features": muni},
       "ctx": {"type": "Feature", "properties": {}, "geometry": {"type": "MultiPolygon", "coordinates": ctx}},
       "rail": rail, "stations": stations}
OUT.write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("muni", len(muni), "with pop unit", sum(1 for m in muni if m["properties"]["u"]), "| ctx polys", len(ctx), "| rail segs", {k: len(v) for k, v in rail.items()}, "pts", npts,
      "| stations", len(stations), "| size", OUT.stat().st_size)
print(sorted({m["properties"]["u"] for m in muni if m["properties"]["u"]}), "missing:", units - {m["properties"]["u"] for m in muni})
print(stations[:8])
