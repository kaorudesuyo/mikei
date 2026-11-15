// 基図（MapLibre GL・自前ホストのデータのみ）と、その上の案件キャンバスをまとめる舞台。
import { useEffect, useRef, useState } from "react";
import { Map as GLMap, setWorkerUrl, LngLatBounds } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Overlay } from "./overlay.js";
import { get, set, subscribe } from "../store.js";
import { projects, P, B, popIndex, has, bestCls, NOW, T_MIN } from "../data/index.js";

setWorkerUrl(workerUrl); // ワーカーも同一オリジンのファイルから読む（blob: を使わないので CSP を厳格に保てる）

const HOME = { center: [139.76, 35.655], pitch: 54, bearing: -12 };
const HOME_M = { center: [139.752, 35.668], pitch: 60, bearing: -18 };        // スマホ：縦長の画面で奥行きが出るよう、やや深く傾ける
const isNarrow = () => get().narrow;
const homeZoom = () => (isNarrow() ? 9.35 : 10.05);
const TOP_M = 64;                                                              // スマホ上部のバーの高さ（概算）
// スマホ：バーとシートの間に残る「地図の見える範囲」の中心が、画面中央からどれだけ上にあるか
const lift = (occ) => Math.round((TOP_M + (window.innerHeight - occ)) / 2 - window.innerHeight / 2);
const pad = (S) => (isNarrow() ? { top: TOP_M + 56, bottom: Math.max(S.occ, 200) + 30, left: 34, right: 34 } : { top: 120, bottom: 170, left: 400, right: S.sel ? 450 : 70 });
const line = (segs) => ({ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: segs } });

// 人口の塗りは「時間」レンズで主役、他のレンズでは控えめに。寄るほど薄くして案件を立たせる
const popOpacity = (lens) => (lens === "time" ? ["interpolate", ["linear"], ["zoom"], 9.5, 0.95, 13.5, 0.55] : 0.22);
function style(geo) {
  const src = (data) => ({ type: "geojson", data, tolerance: 0.2, buffer: 8 });
  return {
    version: 8,
    // 傾けたときの遠景：地平線に向かって霞ませ、奥行きを出す
    sky: { "sky-color": "#05060A", "horizon-color": "#1A2032", "fog-color": "#0B0D14", "sky-horizon-blend": 0.9, "horizon-fog-blend": 0.8, "fog-ground-blend": 0.55, "atmosphere-blend": 0 },
    sources: { ctx: src(geo.ctx), muni: src(geo.muni), rs: src(line(geo.rail.s)), rj: src(line(geo.rail.j)), rp: src(line(geo.rail.p)), rm: src(line(geo.rail.m)) },
    layers: [
      { id: "sea", type: "background", paint: { "background-color": "#04060A" } },
      { id: "ctx", type: "fill", source: "ctx", paint: { "fill-color": "#0C0D11", "fill-antialias": false } },
      { id: "land", type: "fill", source: "muni", paint: { "fill-color": "#17181F", "fill-antialias": false } },
      // 人口：2020年=100 の指数。減少は寒色、増加は暖色。推計を収録した市区だけ色が付く
      { id: "pop", type: "fill", source: "muni", filter: ["has", "u"],
        paint: { "fill-antialias": false, "fill-opacity": popOpacity(get().lens), "fill-opacity-transition": { duration: 700 },
          "fill-color": ["interpolate", ["linear"], ["coalesce", ["feature-state", "i"], 100], 70, "#2C4A96", 90, "#1E2E58", 100, "#17181E", 108, "#40301B", 125, "#8A6026"] } },
      { id: "muni-line", type: "line", source: "muni", paint: { "line-color": "#30323E", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 12, 0.9, 15, 1.2], "line-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 13, 0.9, 15.5, 0.35] } },
      { id: "rs", type: "line", source: "rs", minzoom: 8.5, paint: { "line-color": "#3B4152", "line-width": 1.1, "line-dasharray": [6, 2] } },
      ...[["rj", "#4A4E5C", 1], ["rp", "#3C404C", 0.8], ["rm", "#3A4458", 0.8]].flatMap(([id, c, w]) => [
        { id, type: "line", source: id, minzoom: 9, paint: { "line-color": c, "line-width": ["interpolate", ["linear"], ["zoom"], 9, w * 0.5, 12, w * 1.2, 15, w * 2.6], "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.35, 11, 0.8] } },
        // 枕木のような細かい破線を重ねて「線路」に見せる（寄ったときだけ）
        { id: id + "-tie", type: "line", source: id, minzoom: 12.5, paint: { "line-color": "#0B0C10", "line-width": ["interpolate", ["linear"], ["zoom"], 12.5, 0.6, 15, 1.4], "line-dasharray": id === "rm" ? [1, 1.4] : [2.2, 2.2] } },
      ]),
    ],
  };
}

export default function MapStage({ onReady }) {
  const box = useRef(null), cvRef = useRef(null), [err, setErr] = useState(null);
  useEffect(() => {
    let map, ov, raf, dead = false, unsub = () => {}, lastPop = -1, drew = -1, frame = 0;
    (async () => {
      const geo = (await import("../data/geo.json")).default;
      if (dead) return;
      try {
        map = new GLMap({ container: box.current, style: style(geo), center: HOME.center, zoom: 7.6, pitch: 0, bearing: 0,
          minZoom: 7.2, maxZoom: 16.5, maxPitch: 68, maxBounds: [[138.2, 34.4], [141.6, 36.9]], attributionControl: false,
          dragRotate: true, pitchWithRotate: true, fadeDuration: 0, pixelRatio: Math.min(window.devicePixelRatio || 1, 2), renderWorldCopies: false, canvasContextAttributes: { antialias: true } });
      } catch (e) { setErr(String(e && e.message || e)); set({ intro: false }); return; }
      map.keyboard.enable(); map.touchZoomRotate.enable(); map.touchPitch.enable();
      ov = new Overlay(map, cvRef.current, get, geo);
      const units = geo.muni.features.filter((f) => f.properties.u).map((f) => [f.id, f.properties.u]);
      const paintPop = (t) => { lastPop = t; for (const [id, u] of units) map.setFeatureState({ source: "muni", id }, { i: Math.round(popIndex(u, t) * 5) / 5 }); };
      const draw = (time) => { if (drew === frame) return; drew = frame; ov.draw(time); };
      map.on("render", () => draw(performance.now()));
      // 何も変わっていないときは約12fps（工事中の明滅だけ）に落として、電池と発熱を抑える
      let sig = "", last = 0, prevTime = 0, touching = false;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.on("mousedown", () => (touching = true)); map.on("touchstart", () => (touching = true));
      window.addEventListener("pointerup", () => (touching = false)); map.on("mouseup", () => (touching = false)); map.on("touchend", () => (touching = false)); map.on("touchcancel", () => (touching = false));
      const loop = (time) => {
        frame++; const S = get();
        if (!document.hidden) {
          if (Math.abs(S.t - lastPop) > 0.08 && map.isStyleLoaded()) paintPop(S.t);
          const now = `${S.t}|${S.lens}|${S.block}|${S.company}|${S.sys}|${S.sel}|${S.hover}|${ov.rip.length}`;
          if (S.playing && !reduce && !map.isMoving() && !touching) map.setBearing(map.getBearing() + Math.min(64, time - prevTime) * 0.0011);
          prevTime = time;
          if (!map.isMoving() && (now !== sig || time - last > 80)) { sig = now; last = time; draw(time); }
        }
        raf = requestAnimationFrame(loop);
      };
      map.on("load", () => { paintPop(get().t); raf = requestAnimationFrame(loop); intro(); onReady && onReady(api); });
      const ro = new ResizeObserver(() => { map.resize(); ov.resize(); }); ro.observe(box.current);

      // ---- 操作
      const at = (e) => ov.hit(e.point.x, e.point.y);
      // タッチ操作のあとに届く疑似マウスイベントでは、ホバー表示を出さない
      let lastTouch = -1e9; map.on("touchstart", () => { lastTouch = performance.now(); if (get().hover) set({ hover: null }); });
      map.on("mousemove", (e) => { if (performance.now() - lastTouch < 1200) return; const h = at(e); map.getCanvas().style.cursor = h ? "pointer" : ""; const id = h && h.project ? h.project : null; if (get().hover !== id) set({ hover: id }); });
      map.on("mouseout", () => set({ hover: null }));
      map.on("click", (e) => {
        const h = at(e), S = get();
        if (h && h.project) set({ sel: h.project });
        else if (h && h.block) set({ block: S.block === h.block ? null : h.block, company: null });
        else if (S.sel) set({ sel: null });
      });

      map.on("dragstart", (e) => { const S = get(); if (e.originalEvent && S.narrow && S.sheet === 1 && !S.sel) set({ sheet: 0 }); });

      // ---- カメラ
      // 画面の空いている側（パネルの外）に対象が来るよう、中心をずらして寄せる。パディングは地図に残さない
      const hoff = () => (isNarrow() ? [0, lift(get().occ || 230) + 26] : [186, -22]);
      const hview = () => (isNarrow() ? HOME_M : HOME);
      const home = (duration = 1600) => map.easeTo({ ...hview(), zoom: homeZoom(), offset: hoff(), duration, essential: true });
      const fit = (list, maxZoom) => {
        if (!list.length) return; const b = new LngLatBounds(); list.forEach((p) => b.extend(p.ll));
        const cam = map.cameraForBounds(b, { padding: pad(get()), maxZoom, bearing: map.getBearing() });
        if (!cam || cam.zoom < homeZoom() - 0.1) return home(1300);     // 首都圏全体に散らばる対象は、全域の構図のまま見せる
        map.easeTo({ center: cam.center, zoom: Math.min(cam.zoom - 0.3, maxZoom), pitch: isNarrow() ? 58 : 55, bearing: map.getBearing(), duration: 1400, essential: true });
      };
      const api = { home: () => { set({ block: null, company: null, sys: null, sel: null }); home(); }, zoom: (d) => map.easeTo({ zoom: map.getZoom() + d, duration: 300 }),
        north: () => map.easeTo({ bearing: map.getPitch() < 10 ? hview().bearing : 0, pitch: map.getPitch() < 10 ? hview().pitch : 0, duration: 800 }) };
      let prev = { ...get() };
      unsub = subscribe(() => {
        const S = get();
        if (S.sel && S.sel !== prev.sel) { const p = P[S.sel]; map.easeTo({ center: p.ll, zoom: Math.max(map.getZoom(), 12.6), offset: isNarrow() ? [0, lift(window.innerHeight * 0.5) + 40] : [-28, 30], duration: 1100, essential: true }); }
        else if (S.block !== prev.block) { S.block ? fit(projects.filter((p) => p.b === S.block), 13.4) : home(1300); }
        else if (S.company !== prev.company && S.company) fit(projects.filter((p) => has(p, S.lens, S.company) && (!S.block || p.b === S.block)), 12.6);
        else if (S.sys !== prev.sys && S.sys) fit(projects.filter((p) => bestCls(p, S.sys)), 12.2);
        if (S.lens !== prev.lens && map.getLayer("pop")) map.setPaintProperty("pop", "fill-opacity", popOpacity(S.lens));
        prev = { ...S };
      });

      // ---- 起動演出：上空から降りながら、2020年→現在まで街を早送りする
      function intro() {
        if (reduce) { map.jumpTo({ ...hview(), zoom: homeZoom() }); map.panBy([-hoff()[0], -hoff()[1]], { animate: false }); set({ t: NOW, intro: false }); return; }
        const t0 = performance.now(), D = 3600; map.easeTo({ ...hview(), zoom: homeZoom(), offset: hoff(), duration: D, easing: (x) => 1 - Math.pow(1 - x, 3), essential: true });
        const step = (now) => {
          if (dead) return; const k = Math.min(1, (now - t0) / D), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          if (!get().intro) { set({ t: NOW }); return; }   // スキップされた
          set({ t: T_MIN + (NOW - T_MIN) * e }); if (k < 1) requestAnimationFrame(step); else set({ intro: false });
        };
        requestAnimationFrame(step);
      }
      MapStage._cleanup = () => { ro.disconnect(); };
    })();
    return () => { dead = true; cancelAnimationFrame(raf); unsub(); MapStage._cleanup && MapStage._cleanup(); map && map.remove(); };
  }, []);
  return (
    <div className="stage">
      <div ref={box} className="gl" aria-label="首都圏の再開発地図" role="application" />
      <canvas ref={cvRef} className="ov" aria-hidden="true" />
      {err && <div className="glerr"><b>地図を表示できませんでした</b><span>このブラウザでは WebGL が使えないようです。別のブラウザか、ハードウェアアクセラレーションを有効にしてお試しください。</span></div>}
    </div>
  );
}
export { B };
