import { useEffect, useState } from "react";
import MapStage from "./map/MapStage.jsx";
import Panel from "./ui/Panels.jsx";
import Detail from "./ui/Detail.jsx";
import { Header, Timeline, Dock, Caption, MapButtons, Intro, Hint, About, usePlayback } from "./ui/Chrome.jsx";
import { useStore } from "./store.js";

export default function App() {
  const [api, setApi] = useState(null), [about, setAbout] = useState(false);
  const sel = useStore((s) => s.sel), lens = useStore((s) => s.lens), narrow = useStore((s) => s.narrow), intro = useStore((s) => s.intro);
  usePlayback();
  useEffect(() => { document.documentElement.dataset.lens = lens; }, [lens]);
  // iOS Safari：地図の外でのピンチによる「ページ全体の拡大」を止める（地図の拡大は地図自身が受け持つ）
  useEffect(() => {
    const stop = (e) => e.preventDefault();
    document.addEventListener("gesturestart", stop); return () => document.removeEventListener("gesturestart", stop);
  }, []);
  return (
    <div className={"app" + (sel ? " has-sel" : "") + (narrow ? " narrow" : "") + (intro ? " booting" : "")}>
      <MapStage onReady={setApi} />
      <div className="veil" aria-hidden="true" />
      <Header onAbout={() => setAbout(true)} />
      <Caption />
      <Panel />
      <MapButtons api={api} />
      <Hint />
      {narrow ? <Dock /> : <Timeline />}
      <Detail />
      {about && <About onClose={() => setAbout(false)} />}
      <Intro />
    </div>
  );
}
