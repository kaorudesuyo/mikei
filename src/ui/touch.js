// スマホの手触りに関わる小さな道具：触覚フィードバックと、引っ張って動かすシート。
import { useEffect, useRef } from "react";

// 触覚：Android は Vibration API。iOS（18 以降）は switch 型チェックボックスの切替に付く触覚を借りる。使えない環境では何も起きない。
let label = null;
export function haptic() {
  try {
    if (navigator.vibrate) { navigator.vibrate(5); return; }
    if (!label) {
      label = document.createElement("label"); label.setAttribute("aria-hidden", "true"); label.hidden = true;
      const input = document.createElement("input"); input.type = "checkbox"; input.setAttribute("switch", ""); input.tabIndex = -1;
      label.appendChild(input); document.body.appendChild(label);
    }
    label.click();
  } catch { /* 触覚が使えなくても支障なし */ }
}

// 下から引き出すシート。snaps() は「見えている高さ(px)」の配列（小さい順）。指を離した位置と速さから、最も近い段に吸着する。
export function useSheet({ el, handle, snaps, index, onIndex, onDismiss, onVisible, enabled }) {
  const st = useRef({ drag: false });
  useEffect(() => {
    const node = el.current, grip = handle.current; if (!enabled || !node || !grip) return;
    const vis = () => snaps(node.offsetHeight);
    const place = (v, animate = true) => {
      node.classList.toggle("dragging", !animate);
      node.style.setProperty("--y", Math.max(0, node.offsetHeight - v) + "px");
      onVisible && onVisible(v);
    };
    place(vis()[Math.min(index, vis().length - 1)]);
    let y0 = 0, v0 = 0, cur = 0, lastY = 0, lastT = 0, vel = 0, moved = false;
    const down = (e) => { if (e.button) return; st.current.drag = true; moved = false; y0 = lastY = e.clientY; lastT = e.timeStamp; vel = 0; v0 = cur = vis()[Math.min(index, vis().length - 1)]; grip.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (!st.current.drag) return; const dy = e.clientY - y0; if (Math.abs(dy) > 5) moved = true; if (!moved) return;
      const s = vis(), lo = onDismiss ? 0 : s[0], hi = s[s.length - 1]; let v = v0 - dy;
      if (v > hi) v = hi + (v - hi) * 0.25; if (v < lo) v = lo - (lo - v) * 0.35;          // 端ではゴムのように抵抗する
      const dt = Math.max(1, e.timeStamp - lastT); vel = vel * 0.6 + ((lastY - e.clientY) / dt) * 0.4; lastY = e.clientY; lastT = e.timeStamp;
      cur = v; place(v, false);
    };
    const up = () => {
      if (!st.current.drag) return; st.current.drag = false; const s = vis();
      if (!moved) { onIndex(index === 0 ? Math.min(1, s.length - 1) : index === s.length - 1 && s.length > 2 ? 1 : 0); place(s[Math.min(index, s.length - 1)]); return; }
      const target = cur + vel * 220;                                                       // 速さを少し先読みして行き先を決める
      if (onDismiss && target < s[0] * 0.55) { node.classList.remove("dragging"); node.style.setProperty("--y", node.offsetHeight + "px"); onVisible && onVisible(0); setTimeout(onDismiss, 220); return; }
      let best = 0; s.forEach((v, i) => { if (Math.abs(v - target) < Math.abs(s[best] - target)) best = i; });
      place(s[best]); if (best !== index) onIndex(best);
    };
    grip.addEventListener("pointerdown", down); grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up); grip.addEventListener("pointercancel", up);
    const onResize = () => place(vis()[Math.min(index, vis().length - 1)], false); window.addEventListener("resize", onResize);
    return () => { grip.removeEventListener("pointerdown", down); grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up); window.removeEventListener("resize", onResize); };
  }, [enabled, index, el, handle]);
}
