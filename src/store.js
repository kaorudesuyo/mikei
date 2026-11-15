// 最小の外部ストア。時刻 t は毎フレーム変わるので、React 側は量子化したセレクタで購読する。
import { useSyncExternalStore } from "react";
import { NOW, T_MIN } from "./data/index.js";

const LENSES = ["time", "dev", "con", "cert"];
const fromHash = () => { const h = (typeof location !== "undefined" ? location.hash : "").slice(1); return LENSES.includes(h) ? h : "time"; };

const state = {
  t: T_MIN,            // 表示中の時刻（年小数）
  playing: false,
  lens: fromHash(),    // time | dev | con | cert
  block: null,         // 絞り込み中のエリア（ブロックID）
  company: null,       // 選択中の企業名（lens が dev / con のとき）
  sys: null,           // 選択中の認証制度コード
  sel: null,           // 詳細表示中の案件ID
  hover: null,         // ホバー中の案件ID
  intro: true,         // 起動演出中
  narrow: typeof matchMedia !== "undefined" && matchMedia("(max-width: 859px)").matches,   // スマホ幅のレイアウト
  sheet: 0,            // スマホ：下のシートの段階（0＝見出しだけ / 1＝半分 / 2＝全面）
  occ: 0,              // スマホ：画面下側でシート類が地図を隠している高さ(px)。カメラの寄せ先の計算に使う
  occD: 0,             // スマホ：案件詳細のシートが隠している高さ(px)
  cap: null,           // 再生中の字幕 { id, y, at }（その年に竣工する最大の案件）
};
const subs = new Set();
export const get = () => state;
export function set(patch) {
  let changed = false;
  for (const k in patch) if (state[k] !== patch[k]) { state[k] = patch[k]; changed = true; }
  if (changed) subs.forEach((f) => f());
}
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
export function setLens(lens) {
  if (!LENSES.includes(lens)) return;
  set({ lens, company: null, sys: null });
  try { history.replaceState(null, "", "#" + lens); } catch { /* 埋め込み環境では無視 */ }
}
// 画面の数字に使う時刻。0.1年刻みに丸めて再描画を抑える。ただし「いま」の近くは基準日ちょうどに合わせ、現況の件数がずれないようにする
export const tQ = (s) => (Math.abs(s.t - NOW) < 0.06 ? NOW : Math.round(s.t * 10) / 10);
if (typeof matchMedia !== "undefined") matchMedia("(max-width: 859px)").addEventListener("change", (e) => set({ narrow: e.matches, sheet: 0 }));
if (typeof window !== "undefined") window.addEventListener("hashchange", () => { const l = fromHash(); if (l !== state.lens) set({ lens: l, company: null, sys: null }); });
