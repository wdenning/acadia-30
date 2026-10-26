/* Acadia 30: animated introduction. Shows once; "Replay intro" in the footer brings it back. */
(()=>{
const A=window.ACADIA30;if(!A)return;
const $=id=>document.getElementById(id);
const root=$("intro");if(!root)return;
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const KEY="acadia30-intro-seen";
const fmt=n=>n.toLocaleString("en-US");
const byH=[...A.P].sort((a,b)=>b.e-a.e);
const gids=Object.keys(A.G).sort((a,b)=>Math.max(...A.P.filter(p=>p.g===b).map(p=>p.e))-Math.max(...A.P.filter(p=>p.g===a).map(p=>p.e)));
const sumFt=A.P.reduce((s,p)=>s+p.e,0);

const SCENES=[
 {id:"title",dur:5600,stage:"range",eyebrow:"Acadia National Park · Mount Desert Island, Maine",title:"Acadia 30",
  body:""},
 {id:"park",dur:8000,map:true,eyebrow:"The park",title:"Mount Desert Island",
  body:"Acadia covers most of this granite island on the coast of Maine. Glaciers wore its mountains down to smooth domes. It was the first national park east of the Mississippi, established in 1919 and named Acadia in 1929."},
 {id:"challenge",dur:7600,stage:"chart",eyebrow:"The challenge",title:"The Full 30",
  body:`Peakery's Full 30 Peak Challenge collects thirty named summits on the island, from Cadillac at 1,528 ft down to Flying Mountain at 271 ft. Together they add up to ${fmt(sumFt)} feet of summit.`},
 {id:"peaks",dur:8200,map:true,eyebrow:"Where they are",title:"Thirty peaks",
  body:"Cadillac is the highest point within 25 miles of the Atlantic coast between Nova Scotia and Mexico. The rest spread from the Beehive above Sand Beach to Bernard Mountain on the quiet side."},
 {id:"route",dur:15000,map:true,eyebrow:"One way to do it",title:"Acadirettissima",
  body:`A two-leg traverse links 26 of the peaks from west to east in about ${A.miles} miles.`},
 {id:"outings",dur:gids.length*1500+900,map:true,eyebrow:"Or take your time",title:"Nine outings",
  body:"The peaks fall into nine groups that each make a good day out."},
 {id:"go",dur:0,stage:"go",eyebrow:"Your turn",title:"Track every summit",
  body:"Tick peaks off as you climb them and log the date. Save the map for offline use before you go, because cell service is patchy on the island. Your progress stays on this device."}
];

let idx=0,timers=[],raf=0,imap=null,mapReady=false,pending=null,lastFocus=null;
const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
function stopAll(){timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);raf=0;if(imap)imap.stop()}

/* ---- stages built from the site's own silhouettes and chart ---- */
function rangeSVG(){
  const W=1200,H=360,G=330,L=60,R=1140,step=(R-L)/29,K=290/1528;
  const paths=byH.map((p,i)=>`<path class="rise" style="animation-delay:${RM?0:180+i*55}ms" d="${A.silD(p,W,G,1,K,L+i*step)}"/>`).join("");
  return `<svg class="intro-range" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <g class="sea">${[0,1,2].map(k=>`<path d="M40 ${G+8+k*7}H1160" style="opacity:${.5-k*.15}"/>`).join("")}</g>${paths}</svg>`;
}
function chartClone(){
  const src=document.getElementById("heights");if(!src)return"";
  const c=src.cloneNode(true);c.removeAttribute("id");c.classList.remove("still");c.classList.add("intro-chart");
  const step=(1100-150)/29;
  A.rankE.forEach((id,i)=>{const g=c.querySelector(`.mt[data-id="${id}"]`);if(g){g.style.transition="none";g.style.transform=`translate(${(150+i*step).toFixed(1)}px,0px)`;g.removeAttribute("tabindex");g.classList.remove("dim")}});
  c.querySelectorAll(".glabels").forEach(n=>n.classList.remove("on"));
  c.querySelectorAll("[id]").forEach(n=>n.id="i-"+n.id);
  c.innerHTML=c.innerHTML.replace(/url\(#/g,"url(#i-");
  const wrap=document.createElement("div");wrap.className="intro-chartwrap";wrap.appendChild(c);return wrap;
}
function goStage(){
  const d=A.getDone(),n=Object.keys(d).length;
  return `<div class="intro-go"><svg viewBox="0 0 30 36" aria-hidden="true"><path d="M15 1 L28 6 V20 C28 28 21 33 15 35 C9 33 2 28 2 20 V6 Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 25 L11 15 L14 19 L18 11 L25 25 Z" fill="currentColor"/><circle cx="21" cy="9" r="1.8" fill="currentColor"/></svg>
    <b>${n} <span>of 30</span></b><small>${n?"summited so far":"summits to go"}</small></div>`;
}

/* ---- the intro's own map, built from the site's map style ---- */
const peakFeats=(ids,dimFn)=>({type:"FeatureCollection",features:ids.map(id=>{const p=A.BY[id];return{type:"Feature",
  properties:{id,name:p.n,label:p.s,ft:p.e,done:!!A.getDone()[id],sel:false,dim:dimFn?dimFn(p):false},geometry:{type:"Point",coordinates:A.POS[id]}}})});
const routeAll=A.ROUTE.features.map(f=>f.geometry.coordinates);
const routeFC=(parts)=>({type:"FeatureCollection",features:parts.map((c,i)=>({type:"Feature",properties:{leg:i},geometry:{type:"LineString",coordinates:c.length>1?c:[c[0]||[0,0],c[0]||[0,0]]}}))});
/* The traverse as one west-to-east path, measured in metres, with a smoothed camera track. */
const metres=(a,b)=>{const k=Math.cos((a[1]+b[1])/2*Math.PI/180);return Math.hypot((a[0]-b[0])*111320*k,(a[1]-b[1])*110540)};
const ROUTE_PATH=(()=>{
  const legs=routeAll.map((c,i)=>({i,c})).filter(l=>l.c.length>1).sort((a,b)=>a.c[0][0]-b.c[0][0]);
  const pts=[];let d=0,prev=null;
  for(const l of legs){for(const c of l.c){if(prev)d+=metres(prev,c)*(pts.length&&pts[pts.length-1].leg!==l.i?.45:1);pts.push({c,d,leg:l.i});prev=c}}
  const total=d,N=260,W=650,cam=[];
  for(let k=0;k<=N;k++){const at=total*k/N;let sx=0,sy=0,sw=0;
    for(const p of pts){const dd=Math.abs(p.d-at);if(dd>W*2)continue;const w=Math.exp(-(dd*dd)/(2*W*W/2.2));sx+=p.c[0]*w;sy+=p.c[1]*w;sw+=w}
    cam.push(sw?[sx/sw,sy/sw]:cam[cam.length-1]||pts[0].c)}
  return{pts,total,cam,N,legs:legs.map(l=>l.i)};
})();
function camAt(d){const R=ROUTE_PATH,f=Math.max(0,Math.min(1,d/R.total))*R.N,i=Math.min(R.N-1,Math.floor(f)),u=f-i,a=R.cam[i],b=R.cam[i+1];
  return[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]}
function drawnTo(d){const parts=[[],[]],P=ROUTE_PATH.pts;
  for(let i=0;i<P.length&&P[i].d<=d;i++){parts[P[i].leg].push(P[i].c);
    const nx=P[i+1];if(nx&&nx.d>d&&nx.leg===P[i].leg){const u=(d-P[i].d)/(nx.d-P[i].d);parts[P[i].leg].push([P[i].c[0]+(nx.c[0]-P[i].c[0])*u,P[i].c[1]+(nx.c[1]-P[i].c[1])*u])}}
  return parts}
const ISLAND=[[-68.44,44.215],[-68.155,44.445]];
function ensureMap(){
  if(imap||!A.hasLibs)return;
  try{
    imap=new maplibregl.Map({container:"introMap",style:A.buildStyle(),bounds:ISLAND,interactive:false,attributionControl:false,fadeDuration:300,maxPitch:70});
    imap.addControl(new maplibregl.AttributionControl({compact:true}),"top-left");
    imap.on("styleimagemissing",e=>{const m=/^tri-([tdo])-([ld])$/.exec(e.id);if(m&&!imap.hasImage(e.id))imap.addImage(e.id,A.makeTri(m[1]),{pixelRatio:2})});
    imap.on("load",()=>{
      try{const d=imap.getStyle().sources.dem;if(d){imap.addSource("dem-3d",{type:"raster-dem",encoding:"terrarium",tiles:d.tiles,maxzoom:13,tileSize:256});imap.setTerrain({source:"dem-3d",exaggeration:1.7})}}catch(e){}
      ["trail-hit","trail-hover","trail-pin","trail-pin-case","peak-sel","osm-peaks","contour-lbl"].forEach(l=>{if(imap.getLayer(l))imap.setLayoutProperty(l,"visibility","none")});
      ["route-w","route-e"].forEach(l=>{if(imap.getLayer(l))imap.setLayoutProperty(l,"visibility","visible")});
      imap.getSource("peaks").setData(peakFeats([]));imap.getSource("route").setData(routeFC([[],[]]));
      mapReady=true;if(pending){const f=pending;pending=null;f()}});
  }catch(e){imap=null}
}
const whenMap=fn=>{if(!imap)ensureMap();if(!imap)return;if(mapReady)fn();else pending=fn};
const cam=(o,ms)=>RM||!ms?imap.jumpTo(o):imap.flyTo({...o,duration:ms,essential:true,curve:1.2});

const MAPSCENES={
  park(){whenMap(()=>{imap.getSource("peaks").setData(peakFeats([]));imap.getSource("route").setData(routeFC([[],[]]));
    if(!RM)imap.jumpTo({center:[-68.33,44.12],zoom:8.4,pitch:0,bearing:0});
    cam({center:[-68.29,44.32],zoom:10.7,pitch:58,bearing:-18},7200)})},
  peaks(){whenMap(()=>{imap.getSource("route").setData(routeFC([[],[]]));
    cam({center:[-68.27,44.33],zoom:11.1,pitch:42,bearing:8},2600);
    if(RM){imap.getSource("peaks").setData(peakFeats(A.rankE));return}
    A.rankE.forEach((id,i)=>later(()=>imap.getSource("peaks").setData(peakFeats(A.rankE.slice(0,i+1))),900+i*170))})},
  route(){whenMap(()=>{imap.getSource("peaks").setData(peakFeats(A.rankE));
    if(RM){imap.getSource("route").setData(routeFC(routeAll));imap.fitBounds(ISLAND,{padding:40,pitch:30});return}
    const R=ROUTE_PATH;imap.getSource("route").setData(routeFC([[],[]]));
    const s0=camAt(0);imap.jumpTo({center:s0,zoom:12.4,pitch:56,bearing:24});
    const T=SCENES.find(x=>x.id==="route").dur-1600,start=performance.now();let lastSet=-1e9;
    const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    const step=now=>{const t=Math.min(1,(now-start)/T),d=ease(t)*R.total;
      if(now-lastSet>70||t>=1){lastSet=now;imap.getSource("route").setData(routeFC(drawnTo(d)))}
      imap.jumpTo({center:camAt(d),bearing:24-44*ease(t),zoom:12.4-0.5*Math.sin(Math.PI*t),pitch:56});
      if(t<1)raf=requestAnimationFrame(step);else imap.fitBounds(ISLAND,{padding:40,pitch:35,bearing:0,duration:1400})};
    raf=requestAnimationFrame(step)})},
  outings(){whenMap(()=>{imap.getSource("route").setData(routeFC([[],[]]));
    const extra=$("introExtra");
    gids.forEach((g,k)=>later(()=>{const mem=A.P.filter(p=>p.g===g).sort((a,b)=>b.e-a.e);
      imap.getSource("peaks").setData(peakFeats(A.rankE,p=>p.g!==g));
      const pts=mem.map(p=>A.POS[p.id]),b=pts.reduce((bb,c)=>bb.extend(c),new maplibregl.LngLatBounds(pts[0],pts[0]));
      imap.fitBounds(b,{padding:{top:90,bottom:innerHeight*.42,left:80,right:80},maxZoom:13.4,pitch:45,bearing:-10+k*6,duration:RM?0:1300});
      extra.innerHTML=`<span class="intro-chip">${k+1} / ${gids.length}</span><b>${A.G[g].n}</b><span>${mem.map(p=>p.s).join(" · ")}</span>`},RM?0:k*1500))})}
};

/* ---- scene control ---- */
function render(){
  stopAll();const s=SCENES[idx];
  root.dataset.scene=s.id;root.classList.toggle("mapon",!!s.map&&A.hasLibs);
  const cap=root.querySelector(".intro-cap");cap.classList.remove("in");void cap.offsetWidth;cap.classList.add("in");
  $("introEyebrow").textContent=s.eyebrow;$("introTitle").textContent=s.title;$("introBody").textContent=s.body;$("introExtra").innerHTML="";
  const st=$("introStage");st.innerHTML="";st.className="intro-stage";
  if(s.stage==="range")st.innerHTML=rangeSVG();
  if(s.stage==="chart"){const c=chartClone();if(c)st.appendChild(c);st.classList.add("chart")}
  if(s.stage==="go")st.innerHTML=goStage();
  if(s.map)MAPSCENES[s.id]();
  const last=idx===SCENES.length-1;
  $("introNext").textContent=last?"Start exploring":"Next";
  $("introOffline").hidden=!last;$("introBack").disabled=idx===0;
  [...$("introDots").children].forEach((d,i)=>{d.classList.toggle("on",i===idx);d.classList.toggle("past",i<idx);d.style.setProperty("--d",(s.dur||1)+"ms");d.setAttribute("aria-current",i===idx?"step":"false")});
  if(s.dur&&!RM)later(next,s.dur);
}
function next(){if(idx<SCENES.length-1){idx++;render()}else close()}
function back(){if(idx>0){idx--;render()}}
function open(){
  lastFocus=document.activeElement;root.hidden=false;document.documentElement.classList.add("intro-open");
  idx=0;render();setTimeout(()=>$("introNext").focus({preventScroll:true}),50);
  clearTimeout(open.t);open.t=setTimeout(()=>{if(!root.hidden)(window.requestIdleCallback||setTimeout)(ensureMap)},2200);
}
function close(){
  stopAll();root.classList.add("out");
  try{localStorage.setItem(KEY,"1")}catch(e){}
  setTimeout(()=>{root.hidden=true;root.classList.remove("out","mapon");document.documentElement.classList.remove("intro-open");
    clearTimeout(open.t);if(imap){imap.remove();imap=null;mapReady=false;pending=null}
    dispatchEvent(new Event("acadia30:introclosed"));
    if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})},RM?0:450);
}
$("introDots").innerHTML=SCENES.map((s,i)=>`<button class="intro-dot" aria-label="Part ${i+1}: ${s.title}"><i></i></button>`).join("");
$("introDots").addEventListener("click",e=>{const b=e.target.closest(".intro-dot");if(!b)return;idx=[...b.parentNode.children].indexOf(b);render()});
$("introNext").onclick=next;$("introBack").onclick=back;$("introSkip").onclick=close;
$("introOffline").onclick=()=>{close();setTimeout(()=>{const d=$("dlgApp");if(d)d.showModal()},500)};
root.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();close()}else if(e.key==="ArrowRight")next();else if(e.key==="ArrowLeft")back()});
document.addEventListener("click",e=>{if(e.target.closest("[data-intro]"))open()});

let seen=false;try{seen=localStorage.getItem(KEY)==="1"}catch(e){seen=true}
if(!seen&&!/^#(app|data)$/.test(location.hash))open();
})();
