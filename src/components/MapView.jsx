import React, { useState, useMemo, useRef, useEffect } from "react";
import { BLOCKS, PREFS } from "../data/blocks.js";
import { P } from "../data/projects.js";
import { USE } from "../data/certSystems.js";
import { LON0, LON1, LAT0, LAT1, MW, MH, bx, by, PX_PER_KM, COAST, BORDERS, RAILS, RAIL_LINES, METRO_LINES, MUNI, STATIONS, GEO_LABELS } from "../data/geo.js";
import { blockOf, clamp, hasAnyCert, popIdx50, tick, dotR } from "../lib/utils.js";
import { CertGlyph, IconPin, IconUsers, IconLayer, IconChevD, IconBldg, IconPlus, IconMinus, IconReset } from "./icons.jsx";

/* ============================ 地図 ============================ */
function MapView({data,byBlock,sel,setSel,blockSel,setBlockSel,prefs,scopeLabel}){
  const wrapRef=useRef(null);
  const [tip,setTip]=useState(null);
  const [layers,setLayers]=useState({pins:true,pop:false});
  const [lgOpen,setLgOpen]=useState(true);
  /* 端末幅→SVG座標系の変換係数。スマホの狭い画面でも文字・ピンが読める大きさになるよう
     フォントサイズ（CSS変数 --tscale 経由）と主要な半径をこの係数で拡大する */
  const [ts,setTs]=useState(1);
  useEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    const upd=()=>{const w=el.getBoundingClientRect().width;if(w)setTs(clamp(MW/w,1,2.6));};
    upd();window.addEventListener("resize",upd);
    return ()=>window.removeEventListener("resize",upd);
  },[]);
  const KMAX=40;
  /* クライアント座標→SVG座標。preserveAspectRatio(meet)のレターボックス余白を厳密に補正し、
     ズームの中心が指先・カーソル位置からずれないようにする（従来の近似式が感度悪化の主因） */
  const toMap=(cx,cy,rect)=>{
    const sc=Math.min(rect.width/MW,rect.height/MH);
    const offX=(rect.width-MW*sc)/2, offY=(rect.height-MH*sc)/2;
    return {mx:(cx-rect.left-offX)/sc, my:(cy-rect.top-offY)/sc};
  };


  const [fitTick,setFitTick]=useState(0);
  const target=useMemo(()=>{
    /* 絞り込みの粒度に応じてフィットの考え方を切り替える。
       ・ブロック選択 … そのブロックの案件が画面いっぱいに収まるまで寄る
       ・都県を限定   … 該当ブロック全体の外接範囲に合わせ、その県の広がりを見せる
       ・1都3県すべて … 全域だと余白が多いので、案件密度の高い側に重心を寄せ、
                        5〜95パーセンタイルでトリムした範囲にフィットする
       fitTickは「表示リセット」で同じターゲットへ再フィットさせるための番号 */
    const scoped=blockSel?[blockOf(blockSel)]:BLOCKS.filter(b=>prefs.includes(b.pref));
    const all=prefs.length>=PREFS.length&&!blockSel;
    const pts=[];
    const push=(lon,lat)=>pts.push([bx(lon),by(lat)]);
    scoped.forEach(b=>{
      const items=P.filter(p=>p.blk===b.id);
      items.forEach(p=>push(p.ll[0],p.ll[1]));
      /* 案件が無い／少ないブロックでも範囲が潰れないよう、ブロック中心も含める */
      if(items.length<2)push(b.ll[0],b.ll[1]);
    });
    if(!pts.length)return {cx:MW/2,cy:MH/2,k:1,tick:fitTick};

    const xs=pts.map(p=>p[0]).sort((a,b)=>a-b);
    const ys=pts.map(p=>p[1]).sort((a,b)=>a-b);
    const q=(arr,t)=>arr[Math.min(arr.length-1,Math.max(0,Math.round(t*(arr.length-1))))];
    /* 全域のときだけ外れ値をトリムし、絞り込み時は範囲を丸ごと収める */
    const x0=all?q(xs,0.05):xs[0], x1=all?q(xs,0.95):xs[xs.length-1];
    const y0=all?q(ys,0.05):ys[0], y1=all?q(ys,0.95):ys[ys.length-1];
    const w=Math.max(x1-x0,20),h=Math.max(y1-y0,20);
    const pad=blockSel?110:(all?96:76);
    const kMax=blockSel?14:(all?9:11);
    const k=clamp(Math.min((MW-pad*2)/w,(MH-pad*2)/h),1.05,kMax);
    let cx=(x0+x1)/2, cy=(y0+y1)/2;
    if(all){   /* 全域表示のみ、密度の高い側へ中心を寄せる */
      const gx=pts.reduce((a,p)=>a+p[0],0)/pts.length;
      const gy=pts.reduce((a,p)=>a+p[1],0)/pts.length;
      cx=cx*0.45+gx*0.55; cy=cy*0.45+gy*0.55;
    }
    return {cx,cy,k,tick:fitTick};
  },[blockSel,prefs,fitTick]);

  const [vp,setVp]=useState(target);
  const vpRef=useRef(vp); vpRef.current=vp;
  /* ── 写真アプリ級のジェスチャー描画 ──
     iPhoneの写真アプリは、ピンチ中は画像レイヤーをGPUのCSS変形だけで動かし、
     指を離した瞬間に高解像度で再描画する。同じ手法を採る：
     ジェスチャー中はReactを一切再レンダリングせず、全描画物を包む<g>のtransformを
     DOM直接更新（1フレーム1回）。指を離した瞬間に最終viewportをstateへコミットし、
     LOD・文字サイズ・ピン半径を新しい倍率で再計算する */
  const worldRef=useRef(null);
  const liveRef=useRef({...vp});
  useEffect(()=>{liveRef.current={...vp};},[vp]);
  const rafRef=useRef(0);
  const applyGesture=()=>{
    rafRef.current=0;
    const g=worldRef.current;if(!g)return;
    const v0=vpRef.current, v1=liveRef.current;
    const sc=v1.k/v0.k;
    const tx=MW/2*(1-sc)+(v0.cx-v1.cx)*v1.k;
    const ty=MH/2*(1-sc)+(v0.cy-v1.cy)*v1.k;
    g.setAttribute("transform",`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sc.toFixed(5)})`);
  };
  const rafApply=()=>{if(!rafRef.current)rafRef.current=requestAnimationFrame(applyGesture);};
  const commitGesture=()=>{
    if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=0;}
    const g=worldRef.current;if(g)g.removeAttribute("transform");
    setVp({...liveRef.current});
  };
  const wheelTimer=useRef(0);
  useEffect(()=>()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);
    if(wheelTimer.current)clearTimeout(wheelTimer.current);},[]);
  useEffect(()=>{
    const from={...vpRef.current},t0=performance.now(),dur=680;
    let raf;
    const step=(t)=>{
      const p=Math.min(1,(t-t0)/dur);
      const e=p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
      setVp({cx:from.cx+(target.cx-from.cx)*e,cy:from.cy+(target.cy-from.cy)*e,k:from.k+(target.k-from.k)*e});
      if(p<1)raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf);
  },[target]);

  /* 1本指＝パン／2本指＝ピンチズーム。参照はローカル変数に退避してnull競合を防ぐ */
  const drag=useRef(null);
  const pinch=useRef(null);
  const ptrs=useRef(new Map());
  const movedRef=useRef(false);
  const onPointerDown=(e)=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    /* ホイールの確定待ちが残っていたら先に確定してから新ジェスチャーへ */
    if(wheelTimer.current){clearTimeout(wheelTimer.current);wheelTimer.current=0;commitGesture();}
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{e.currentTarget.setPointerCapture?.(e.pointerId);}catch(_){/* no-op */}
    if(ptrs.current.size>=2){
      const ids=[...ptrs.current.keys()].slice(-2);
      const [a,b]=ids.map(id=>ptrs.current.get(id));
      pinch.current={d0:Math.hypot(a.x-b.x,a.y-b.y)||1,k0:liveRef.current.k,ids};
      drag.current=null;
      movedRef.current=true;
    }else{
      movedRef.current=false;
      drag.current={x:e.clientX,y:e.clientY,cx:liveRef.current.cx,cy:liveRef.current.cy};
    }
  };
  const onPointerMove=(e)=>{
    const el=wrapRef.current;if(!el)return;
    if(ptrs.current.has(e.pointerId))ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const rect=el.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    /* preserveAspectRatio="meet" の実効倍率。従来は幅基準の近似（MW/rect.width）を
       使っていたため、コンテナが高さ基準でフィットする形状のときパン量が縦横ともずれ、
       特に縦方向の追従が悪化していた */
    const sc=Math.min(rect.width/MW,rect.height/MH);
    const pz=pinch.current;
    if(pz&&ptrs.current.size>=2){
      /* 常に「直近のアクティブ2本」を基準にし、指の組が変わった瞬間に基準を取り直す。
         pointercancelや3本目の指が混ざっても倍率が飛ばない */
      const ids=[...ptrs.current.keys()].slice(-2);
      if(!pz.ids||pz.ids[0]!==ids[0]||pz.ids[1]!==ids[1]){
        const [na,nb]=ids.map(id=>ptrs.current.get(id));
        pz.ids=ids;pz.d0=Math.hypot(na.x-nb.x,na.y-nb.y)||1;pz.k0=liveRef.current.k;
      }
      const [a,b]=ids.map(id=>ptrs.current.get(id));
      const d=Math.hypot(a.x-b.x,a.y-b.y);
      if(!d)return;
      /* 「指の開き比＝倍率比」（開始時k0×(d/d0)）で指に完全追従。中点移動はそのままパン。
         描画はDOM transformのみで、Reactの再レンダリングは発生しない */
      const {mx,my}=toMap((a.x+b.x)/2,(a.y+b.y)/2,rect);
      const k2=clamp(pz.k0*(d/pz.d0),1,KMAX);
      const lv=liveRef.current;
      const wx=(mx-MW/2)/lv.k+lv.cx, wy=(my-MH/2)/lv.k+lv.cy;
      liveRef.current={k:k2,cx:wx-(mx-MW/2)/k2,cy:wy-(my-MH/2)/k2};
      rafApply();
      return;
    }
    const dctx=drag.current;
    if(!dctx)return;
    const k=liveRef.current.k||1;
    const dx=(e.clientX-dctx.x)/sc/k;
    const dy=(e.clientY-dctx.y)/sc/k;
    if(Math.abs(e.clientX-dctx.x)+Math.abs(e.clientY-dctx.y)>4)movedRef.current=true;
    liveRef.current={...liveRef.current,cx:dctx.cx-dx,cy:dctx.cy-dy};
    rafApply();
  };
  const endPointer=(e)=>{
    if(!ptrs.current.has(e.pointerId))return;
    ptrs.current.delete(e.pointerId);
    if(ptrs.current.size<2)pinch.current=null;
    if(ptrs.current.size===1){
      const [r]=[...ptrs.current.values()];
      drag.current={x:r.x,y:r.y,cx:liveRef.current.cx,cy:liveRef.current.cy};
    }else if(ptrs.current.size===0){
      drag.current=null;
      commitGesture();   /* 全指が離れた瞬間に確定し、LOD・文字を新倍率で再計算 */
    }
  };
  const wasDrag=()=>movedRef.current;

  /* ホイールで拡縮（カーソル位置基準） */
  useEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    const onWheel=(e)=>{
      e.preventDefault();
      const rect=el.getBoundingClientRect();
      if(!rect.width)return;
      /* トラックパッドの微小deltaからマウスホイールまで、指数スケールで一定の体感になる */
      const f=clamp(Math.exp(-e.deltaY*0.0026),0.8,1.25);
      const {mx,my}=toMap(e.clientX,e.clientY,rect);
      const lv=liveRef.current;
      const k2=clamp(lv.k*f,1,KMAX);
      const wx=(mx-MW/2)/lv.k+lv.cx, wy=(my-MH/2)/lv.k+lv.cy;
      liveRef.current={k:k2,cx:wx-(mx-MW/2)/k2,cy:wy-(my-MH/2)/k2};
      rafApply();
      if(wheelTimer.current)clearTimeout(wheelTimer.current);
      wheelTimer.current=setTimeout(()=>{wheelTimer.current=0;commitGesture();},140);
    };
    el.addEventListener("wheel",onWheel,{passive:false});
    return ()=>el.removeEventListener("wheel",onWheel);
  },[]);

  /* ── 一本指の上方向ドラッグがページスクロールに奪われる問題への根本対処 ──
     touch-action:none だけでは、iOS Safari など一部環境でスクロール連鎖が起きる。
     スクロールが始まるとブラウザは pointercancel を投げ、地図のジェスチャーは即座に
     打ち切られる。ページが最上部では下方向のスクロール余地がないため下だけ動く、という
     非対称が生じていた。非パッシブの touchmove で既定動作を止め、ジェスチャーを地図に固定する。 */
  useEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    /* touchstart は抑止しない：抑止するとiOSがclick合成イベントを生成せず、
       ピンのタップで詳細が開かなくなる。スクロール阻止に必要なのは touchmove のみ。 */
    const block=(e)=>{if(e.cancelable)e.preventDefault();};
    el.addEventListener("touchmove",block,{passive:false});
    return ()=>el.removeEventListener("touchmove",block);
  },[]);
  useEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    const stop=(e)=>e.preventDefault();
    el.addEventListener("gesturestart",stop,{passive:false});
    el.addEventListener("gesturechange",stop,{passive:false});
    el.addEventListener("gestureend",stop,{passive:false});
    return ()=>{el.removeEventListener("gesturestart",stop);
      el.removeEventListener("gesturechange",stop);el.removeEventListener("gestureend",stop);};
  },[]);

  const X=(lon)=>(bx(lon)-vp.cx)*vp.k+MW/2;
  const Y=(lat)=>(by(lat)-vp.cy)*vp.k+MH/2;
  const D=(pts)=>pts.map((p,i)=>`${i?"L":"M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");
  const zoomBy=(f)=>setVp(v=>({...v,k:clamp(v.k*f,1,KMAX)}));

  const show=(e,p)=>{const r=wrapRef.current.getBoundingClientRect();
    setTip({x:e.clientX-r.left,y:e.clientY-r.top,p});};

  /* 海岸線・県境・鉄道は基準座標で一度だけパス化し、グループのtransformで動かす。
     線幅はvector-effectで固定。ピンチ中の最重量処理だったパス再計算をゼロにする */
  const basePaths=useMemo(()=>{
    const Dw=(pts)=>pts.map((p,i)=>`${i?"L":"M"}${bx(p[0]).toFixed(1)},${by(p[1]).toFixed(1)}`).join(" ");
    const mk=(l)=>({d:Dw(l.pts),c:l.c,n:l.n,
      lx:bx(l.pts[Math.min(l.lp,l.pts.length-1)][0]),
      ly:by(l.pts[Math.min(l.lp,l.pts.length-1)][1])});
    return {coast:Dw(COAST),borders:BORDERS.map(Dw),
      rails:RAIL_LINES.map(mk),metros:METRO_LINES.map(mk),
      muni:MUNI.map(m=>({d:Dw(m.pts)+" Z",n:m.n,lx:bx(m.ll[0]),ly:by(m.ll[1])}))};
  },[]);
  const gT=`translate(${(MW/2-vp.cx*vp.k).toFixed(2)} ${(MH/2-vp.cy*vp.k).toFixed(2)}) scale(${vp.k.toFixed(4)})`;

  /* 縮尺バー：最大40倍まで見合う段階を用意し、1km未満はm表記に切り替える */
  const kmOpts=[100,50,20,10,5,2,1,0.5,0.2,0.1,0.05];
  const km=kmOpts.find(v=>PX_PER_KM*v*vp.k<=210)??0.05;
  const barLen=PX_PER_KM*km*vp.k;
  const kmLabel=km>=1?`${km} km`:`${Math.round(km*1000)} m`;
  const lod=vp.k<1.65?"blocks":"pins";       /* 広域はブロック集計、拡大で個別ピン */
  const showLabels=vp.k>=2.3;
  const msf=Math.min(ts,2.2);                 /* 半径・タップ領域のモバイル拡大係数 */
  const popColor=(b)=>{const i=popIdx50(b);return i>=105?"#7FCBB4":i<=95?"#DE8C67":"#8B8A82";};

  return (
    <div className="mapwrap">
      {/* レイヤー・ズーム操作（地図の外・上段） */}
      <div className="mapbar">
        <span className="scope"><b>{scopeLabel}</b>　×{vp.k.toFixed(1)}</span>
        <div className="zbtns">
          <button className={layers.pins?"on":""} onClick={()=>setLayers(l=>({...l,pins:!l.pins}))}>
            <IconPin width={12} height={12}/>案件</button>
          <button className={layers.pop?"on":""} onClick={()=>setLayers(l=>({...l,pop:!l.pop}))}>
            <IconUsers width={12} height={12}/>人口</button>
          <span className="zdiv"/>
          <button onClick={()=>zoomBy(1.5)} aria-label="拡大"><IconPlus width={13} height={13}/></button>
          <button onClick={()=>zoomBy(1/1.5)} aria-label="縮小"><IconMinus width={13} height={13}/></button>
          <button onClick={()=>setFitTick(t=>t+1)} aria-label="現在の範囲の初期表示に戻す"><IconReset width={13} height={13}/>表示リセット</button>
        </div>
      </div>

    <div className="map" ref={wrapRef} style={{"--tscale":ts}}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={endPointer} onPointerCancel={endPointer}
      onLostPointerCapture={endPointer}
      onDoubleClick={()=>zoomBy(1.6)}>
      <svg viewBox={`0 0 ${MW} ${MH}`} className="svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="0.7" fill="#212127"/></pattern>
          <clipPath id="frame"><rect x="0" y="0" width={MW} height={MH}/></clipPath>
        </defs>
        <rect x="0" y="0" width={MW} height={MH} fill="url(#grid)"/>
        <g clipPath="url(#frame)">
          <g ref={worldRef}>
          <g transform={gT}>
            {/* 市区町村界：細かい点線。鉄道と混同しないよう色相・線種を明確に分ける */}
            {vp.k>=1.6&&basePaths.muni.map((m,i)=>(
              <path key={"mu"+i} d={m.d} className="muni" vectorEffect="non-scaling-stroke"/>))}

            {/* 地下鉄・新交通：単色の細い実線 */}
            {vp.k>=1.8&&basePaths.metros.map((r,i)=>(
              <path key={"mt"+i} d={r.d} className="metro" stroke={r.c} vectorEffect="non-scaling-stroke"/>))}

            {/* JR・私鉄：色の下地＋白線＋暗色の破線を重ね、地図記号の「枕木」に見せる */}
            {basePaths.rails.map((r,i)=>(
              <path key={"rh"+i} d={r.d} className="rail-halo" stroke={r.c} vectorEffect="non-scaling-stroke"/>))}
            {basePaths.rails.map((r,i)=>(
              <path key={"rb"+i} d={r.d} className="rail-base" vectorEffect="non-scaling-stroke"/>))}
            {basePaths.rails.map((r,i)=>(
              <path key={"rt"+i} d={r.d} className="rail-tie" vectorEffect="non-scaling-stroke"/>))}
            {basePaths.borders.map((d,i)=><path key={i} d={d} className="border" vectorEffect="non-scaling-stroke"/>)}
            <path d={basePaths.coast} className="coast-glow" vectorEffect="non-scaling-stroke"/>
            <path d={basePaths.coast} className="coast" vectorEffect="non-scaling-stroke"/>
          </g>

          {vp.k<2.4&&GEO_LABELS.map((g,i)=>(
            <text key={"geo"+i} x={X(g.ll[0])} y={Y(g.ll[1])} className={"geo-l"+(g.sea?" sea":"")}>{g.t}</text>))}

          {/* 市区町村名：都県名（×2.4未満）と入れ替わる形で表示 */}
          {vp.k>=2.4&&basePaths.muni.map((m,i)=>{
            const x=(m.lx-vp.cx)*vp.k+MW/2, y=(m.ly-vp.cy)*vp.k+MH/2;
            if(x<-70||x>MW+70||y<-30||y>MH+30)return null;
            return <text key={"mul"+i} x={x} y={y} className="muni-l">{m.n}</text>;
          })}

          {/* 地下鉄の路線名 */}
          {vp.k>=2.6&&basePaths.metros.map((r,i)=>{
            const x=(r.lx-vp.cx)*vp.k+MW/2, y=(r.ly-vp.cy)*vp.k+MH/2;
            if(x<-60||x>MW+60||y<-30||y>MH+30)return null;
            return <text key={"mtl"+i} x={x} y={y+11} className="rail-l metro-l" fill={r.c}>{r.n}</text>;
          })}

          {/* 路線名：中ズーム以上で控えめに */}
          {vp.k>=2.0&&basePaths.rails.map((r,i)=>{
            const x=(r.lx-vp.cx)*vp.k+MW/2, y=(r.ly-vp.cy)*vp.k+MH/2;
            if(x<-60||x>MW+60||y<-30||y>MH+30)return null;
            return <text key={"rl"+i} x={x} y={y-6} className="rail-l" fill={r.c}>{r.n}</text>;
          })}

          {/* 駅：主要駅は中ズームから、その他は拡大時に表示 */}
          {vp.k>=1.9&&STATIONS.filter(st=>st.mj||vp.k>=3.2).map((st,i)=>{
            const x=X(st.ll[0]),y=Y(st.ll[1]);
            if(x<-40||x>MW+40||y<-24||y>MH+24)return null;
            return (<g key={"st"+i} className="stn">
              <circle cx={x} cy={y} r={2.6*Math.min(ts,1.8)} className="stn-d"/>
              <text x={x+5*Math.min(ts,1.8)} y={y+3.4} className="stn-l">{st.n}</text></g>);
          })}

          {/* 人口レイヤー：円の大きさ=代表市区の2020年人口、色=2050年指数 */}
          {layers.pop&&BLOCKS.filter(b=>prefs.includes(b.pref)).map(b=>{
            const r=(7+Math.sqrt(b.pop[0])/30)*Math.min(vp.k,2.4)/1.4;
            const idx=popIdx50(b);const c=popColor(b);
            return (<g key={"pop-"+b.id} className="popg">
              <circle cx={X(b.ll[0])} cy={Y(b.ll[1])} r={r} fill={c} opacity="0.14"/>
              <circle cx={X(b.ll[0])} cy={Y(b.ll[1])} r={r} fill="none" stroke={c} strokeWidth="1.1" opacity="0.65"/>
              {vp.k>=1.35&&<text x={X(b.ll[0])} y={Y(b.ll[1])+r+13} className="pop-l" fill={c}>
                {idx>=100?"+":""}{(idx-100).toFixed(1)}%</text>}
            </g>);
          })}

          {/* ブロック集計（広域LOD） */}
          {layers.pins&&lod==="blocks"&&BLOCKS.filter(b=>prefs.includes(b.pref)).map(b=>{
            const items=byBlock[b.id]||[];if(!items.length)return null;
            const gfa=items.reduce((s,p)=>s+(p.gfa||0),0);
            const r=(15+Math.min(34,Math.sqrt(gfa)/112)+items.length*1.1)*Math.min(ts,1.6);
            return (<g key={b.id} className="blk" onClick={()=>{if(wasDrag())return;setBlockSel(b.id);}}>
              <circle cx={X(b.ll[0])} cy={Y(b.ll[1])} r={r+3.5} className="blk-halo"/>
              <circle cx={X(b.ll[0])} cy={Y(b.ll[1])} r={r} className="blk-c"/>
              <text x={X(b.ll[0])} y={Y(b.ll[1])+1.5} className="blk-n">{items.length}</text>
              <text x={X(b.ll[0])} y={Y(b.ll[1])+11.5} className="blk-u">件</text>
              <text x={X(b.ll[0])} y={Y(b.ll[1])+r+17} className="blk-l">{b.short}</text></g>);
          })}

          {/* 個別ピン（拡大LOD）。中間ズームではブロック名を薄く残し現在地の手掛かりにする */}
          {layers.pins&&lod==="pins"&&vp.k<2.8&&BLOCKS.filter(b=>prefs.includes(b.pref)).map(b=>(
            <text key={"anch"+b.id} x={X(b.ll[0])} y={Y(b.ll[1])-34} className="blk-anchor">{b.short}</text>))}
          {layers.pins&&lod==="pins"&&data.map(p=>{
            const x=X(p.ll[0]),y=Y(p.ll[1]);
            if(x<-40||x>MW+40||y<-60||y>MH+40)return null;
            const t=tick(p.h),r=dotR(p.gfa),c=USE[p.use].c;
            const on=sel===p.id;
            return (<g key={p.id} className={"pin "+p.st+(on?" sel":"")}
              onClick={()=>{if(wasDrag())return;setSel(p.id);}}
              onMouseEnter={e=>show(e,p)} onMouseMove={e=>show(e,p)} onMouseLeave={()=>setTip(null)}>
              <line x1={x} y1={y} x2={x} y2={y-t} stroke={c} className="stem"/>
              {hasAnyCert(p)&&<circle cx={x} cy={y-t-5*msf} r={2.8*msf} className="certdot"/>}
              <circle cx={x} cy={y-t} r={(on?3.6:2.3)*msf} fill={c} className="cap"/>
              <circle cx={x} cy={y} r={r*msf} fill={c} className="base"/>
              <circle cx={x} cy={y-t/2} r={12*msf} fill="transparent"/>
              {on&&<circle cx={x} cy={y} r={r+8} className="ring pulse"/>}
              {(showLabels||on)&&<text x={x+8} y={y-t-6} className={"pin-l"+(on?" on":"")}>{p.n}</text>}
            </g>);
          })}
          </g>
        </g>

        <g className="scale">
          <line x1={MW-42-barLen} y1={MH-42} x2={MW-42} y2={MH-42}/>
          <line x1={MW-42-barLen} y1={MH-46} x2={MW-42-barLen} y2={MH-38}/>
          <line x1={MW-42} y1={MH-46} x2={MW-42} y2={MH-38}/>
          <text x={MW-42} y={MH-52} textAnchor="end">{kmLabel}</text>
        </g>
        <g className="north" transform={`translate(40,96)`}>
          <line x1="0" y1="15" x2="0" y2="-14"/><path d="M0,-17 L4.5,-8 L-4.5,-8 Z"/><text x="0" y="30">N</text></g>
      </svg>

      {tip&&(<div className="tip" style={{left:Math.min(tip.x+16,640),top:Math.max(tip.y-10,8)}}>
        <div className="tip-n">{tip.p.n}</div>
        <div className="tip-dev"><IconBldg width={11} height={11}/>{(tip.p.devs||[]).join("・")}</div>
        <div className="tip-m">{blockOf(tip.p.blk).short}　/　{tip.p.yl}{tip.p.h?`　/　${tip.p.h}m`:""}</div>
        {tip.p.cert?.length>0&&<div className="tip-c">
          {tip.p.cert.slice(0,4).map((c,i)=><span key={i}><CertGlyph sys={c.sys} size={13}/>{c.sys}{c.rank!=="—"?` ${c.rank}`:""}</span>)}
        </div>}
        <div className="tip-hint">クリックで詳細を開く</div>
      </div>)}

    </div>{/* /.map */}

      {/* 凡例（地図の外・下段） */}
      <div className={"legend"+(lgOpen?"":" closed")}>
        <button className="lg-toggle" onClick={()=>setLgOpen(!lgOpen)}>
          <IconLayer width={12} height={12}/>凡例<IconChevD width={11} height={11} style={{transform:lgOpen?"rotate(180deg)":"none"}}/></button>
        {lgOpen&&<>
          <div className="lg-row">
            {Object.entries(USE).map(([k,v])=>(<span key={k} className="lg"><i style={{background:v.c}}/>{v.label}</span>))}
          </div>
          <div className="lg-row">
            <span className="lg"><i style={{background:"#7FCBB4"}}/>人口 増加（2050年指数105以上）</span>
            <span className="lg"><i style={{background:"#8B8A82"}}/>横ばい</span>
            <span className="lg"><i style={{background:"#DE8C67"}}/>減少（95以下）</span>
          </div>
          <div className="lg-note">
            棒の高さ=建物高さ／根元の円=延床面積／破線=計画中／先端の白点=環境認証あり。
            1本指のドラッグで移動、2本指のピンチまたはホイールで拡縮、ダブルタップ・ダブルクリックで拡大。広域表示ではブロック集計、拡大すると個別ピンに切り替わる。
            鉄道は枕木状の破線（JR・私鉄）と単色の細実線（地下鉄・新交通）で描き分け、市区町村界は細かい点線で示す。
            主要駅は×1.9、路線名は×2.0、市区町村名は×2.4、地下鉄名は×2.6、全駅名は×3.2以上で表示。
            行政界と路線は位置関係を掴むための模式表現で、実測の線形・境界ではない。右下に縮尺、最大×40まで拡大できる。
          </div>
        </>}
      </div>
    </div>
  );
}


export { MapView };
