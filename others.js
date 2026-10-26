/* Acadia 30: "The Other Peaks". Starts from every named summit on Mount Desert Island,
   removes the private and trailless ones, and offers the six with a public way up. */
(()=>{
const A=window.ACADIA30;if(!A)return;
const $=id=>document.getElementById(id);
const root=$("others");if(!root)return;
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt=n=>n.toLocaleString("en-US");
const SEEN="acadia30-others-seen",EXTKEY="acadia30-ext";

// Named summits not on either list (USGS GNIS positions and heights). Kind decides when they leave.
const OTHER=A.RESEARCH.peaks.filter(r=>r.status!=="extension").map(r=>[r.name,r.lat,r.lon,r.elev_ft,r.status==="not-eligible"?"private":"trailless"]);
const FULL=A.P.filter(p=>!p.ext);
const ALL=[
 ...FULL.map(p=>({id:p.id,name:p.n,kind:"full",c:A.POS[p.id],e:p.e})),
 ...A.EXT.map(p=>({id:p.id,name:p.n,kind:"ext",c:[p.lon,p.lat],e:p.e,note:p.note})),
 ...OTHER.map(([n,la,lo,e,k],i)=>({id:"o"+i,name:n,kind:k,c:[lo,la],e}))
];
const N_ALL=ALL.length,N_PRIV=ALL.filter(x=>x.kind==="private").length,N_NOTRAIL=ALL.filter(x=>x.kind==="trailless").length,N_EXT=A.EXT.length;
const WORD=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen"];
const word=n=>WORD[n]||String(n);

let idx=0,timers=[],raf=0,imap=null,ready=false,pending=null,lastFocus=null,shown=0,state={};
const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
function stopAll(){timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);if(imap)imap.stop()}

/* ---- map ---- */
const ISLAND=[[-68.44,44.235],[-68.155,44.44]];
function fc(){return{type:"FeatureCollection",features:ALL.filter(x=>(state[x.id]||"off")!=="off").map(x=>({type:"Feature",
  properties:{id:x.id,name:x.name,kind:x.kind,state:state[x.id]},geometry:{type:"Point",coordinates:x.c}}))}}
const push=()=>{if(imap&&ready&&imap.getSource("others"))imap.getSource("others").setData(fc())};
const setAll=(pred,st)=>{ALL.forEach(x=>{if(pred(x))state[x.id]=st})};
function ensureMap(){
  if(imap||!A.hasLibs)return;
  try{
    imap=new maplibregl.Map({container:"oMap",style:A.buildStyle(),bounds:ISLAND,fitBoundsOptions:{padding:30},interactive:false,attributionControl:false,fadeDuration:200});
    imap.addControl(new maplibregl.AttributionControl({compact:true}),"top-left");
    imap.on("styleimagemissing",e=>{const m=/^tri-([tdo])-([ld])$/.exec(e.id);if(m&&!imap.hasImage(e.id))imap.addImage(e.id,A.makeTri(m[1]),{pixelRatio:2})});
    imap.on("load",()=>{
      ["peaks","peak-sel","osm-peaks","route-w","route-e","trail-hit","trail-hover","trail-pin","trail-pin-case","contour-lbl"].forEach(l=>{if(imap.getLayer(l))imap.setLayoutProperty(l,"visibility","none")});
      const th=document.documentElement.dataset.theme==="dark"||(document.documentElement.dataset.theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)?"d":"l";
      const ink=getComputedStyle(document.documentElement).getPropertyValue("--ink").trim(),land=getComputedStyle(document.documentElement).getPropertyValue("--land").trim();
      imap.addSource("others",{type:"geojson",data:fc()});
      imap.addLayer({id:"o-ring",type:"circle",source:"others",filter:["in",["get","state"],["literal",["flag","hi"]]],
        paint:{"circle-radius":["case",["==",["get","state"],"hi"],17,13],"circle-color":"rgba(0,0,0,0)","circle-stroke-color":ink,"circle-stroke-width":["case",["==",["get","state"],"hi"],2.4,1.4],
          "circle-stroke-opacity":["case",["==",["get","state"],"hi"],1,.7]}});
      imap.addLayer({id:"o-peaks",type:"symbol",source:"others",
        layout:{"icon-image":["case",["==",["get","state"],"hi"],"tri-d-"+th,["in",["get","kind"],["literal",["full","ext"]]],"tri-t-"+th,"tri-o-"+th],
          "icon-size":["case",["in",["get","kind"],["literal",["full","ext"]]],.95,.8],"icon-allow-overlap":true,
          "text-field":["case",["in",["get","state"],["literal",["flag","hi"]]],["get","name"],""],"text-font":["Noto Sans Bold"],"text-size":12,
          "text-variable-anchor":["left","right","top","bottom"],"text-radial-offset":1.2,"text-optional":true},
        paint:{"icon-opacity":["match",["get","state"],"dim",.2,"fade",.08,1],"text-color":ink,"text-halo-color":land,"text-halo-width":1.8}});
      ready=true;push();if(pending){const f=pending;pending=null;f()}});
  }catch(e){imap=null}
}
const whenMap=fn=>{if(!imap)ensureMap();if(!imap)return;if(ready)fn();else pending=fn};
const cam=(o,ms)=>RM||!ms?imap.jumpTo(o):imap.easeTo({...o,duration:ms,essential:true});
const bounds=list=>list.reduce((b,x)=>b.extend(x.c),new maplibregl.LngLatBounds(list[0].c,list[0].c));

/* ---- the running count ---- */
function count(to,label,ms){
  const el=$("oCount"),from=shown,t0=performance.now(),D=RM?0:(ms||1200);
  const draw=n=>{el.innerHTML=`<b>${n}</b><span>${label}</span>`};
  if(!D){shown=to;draw(to);return}
  const step=now=>{const k=Math.min(1,(now-t0)/D),n=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));draw(n);if(k<1)raf=requestAnimationFrame(step);else shown=to};
  raf=requestAnimationFrame(step);
}

/* ---- scenes ---- */
const S=[
 {id:"all",dur:7600,eyebrow:"The Other Peaks",title:`${N_ALL} summits`,
  body:`The U.S. Geological Survey names ${N_ALL} summits on Mount Desert Island. Peakery's Full 30 covers fewer than half of them. Here's what happens to the rest.`,
  run(){shown=0;state={};push();whenMap(()=>{imap.jumpTo({bounds:ISLAND,padding:40});cam({pitch:30,bearing:-8},2500)});
    const order=[...ALL].sort((a,b)=>(b.e||0)-(a.e||0));
    if(RM){order.forEach(x=>state[x.id]="on");push();count(N_ALL,"named summits");return}
    order.forEach((x,i)=>later(()=>{state[x.id]="on";if(i%3===0||i===order.length-1)push()},500+i*55));
    later(()=>count(N_ALL,"named summits",order.length*55),500)}},
 {id:"private",dur:8600,eyebrow:"Step 1",title:"Private land",
  body:`${word(N_PRIV)} sit on private land, mostly small hills around Seal Cove, Tremont and Southwest Harbor, plus Youngs Mountain and the summit of Schooner Head. They're on the map, but they aren't open to hikers.`,
  run(){setAll(()=>true,"on");shown=N_ALL;count(N_ALL,"named summits",0);push();
    const priv=ALL.filter(x=>x.kind==="private");
    whenMap(()=>imap.fitBounds(bounds(priv),{padding:{top:80,bottom:innerHeight*.45,left:60,right:60},pitch:25,bearing:0,duration:RM?0:1600}));
    later(()=>{priv.forEach(x=>state[x.id]="flag");push()},RM?0:900);
    later(()=>{priv.forEach(x=>state[x.id]="fade");push();count(N_ALL-N_PRIV,"left on the list")},RM?0:4600);
    later(()=>{priv.forEach(x=>state[x.id]="off");push()},RM?0:5600)}},
 {id:"trailless",dur:9000,eyebrow:"Step 2",title:"No trail to the top",
  body:`${word(N_NOTRAIL)} more are on park or preserve land but have no maintained trail, including McFarland, The Whitecap, Enoch and Halfway. Reaching them means bushwhacking over thin summit soil and plants, so they stay off the list.`,
  run(){setAll(()=>true,"on");setAll(x=>x.kind==="private","off");shown=N_ALL-N_PRIV;count(shown,"left on the list",0);push();
    const nt=ALL.filter(x=>x.kind==="trailless");
    whenMap(()=>imap.fitBounds(bounds(nt),{padding:{top:80,bottom:innerHeight*.45,left:60,right:60},pitch:35,bearing:-10,duration:RM?0:1600}));
    later(()=>{nt.forEach(x=>state[x.id]="flag");push()},RM?0:900);
    later(()=>{nt.forEach(x=>state[x.id]="fade");push();count(N_ALL-N_PRIV-N_NOTRAIL,"left on the list")},RM?0:5000);
    later(()=>{nt.forEach(x=>state[x.id]="off");push()},RM?0:6000)}},
 {id:"full",dur:6800,eyebrow:"What's left",title:"The Full 30",
  body:"Peakery's thirty. Every one has a maintained trail to the top, and Cadillac has a road too.",
  run(){state={};ALL.forEach(x=>state[x.id]=x.kind==="full"?"on":x.kind==="ext"?"dim":"off");push();shown=N_ALL-N_PRIV-N_NOTRAIL;count(shown,`= 30 + ${N_EXT}`,0);
    whenMap(()=>imap.fitBounds(ISLAND,{padding:{top:60,bottom:innerHeight*.42,left:40,right:40},pitch:40,bearing:8,duration:RM?0:1800}))}},
 {id:"six",dur:N_EXT*1700+900,eyebrow:"Step 3",title:`${word(N_EXT)} more`,
  body:`These ${word(N_EXT).toLowerCase()} also have a public trail or carriage road to the top. They're the ones you could add.`,
  run(){state={};ALL.forEach(x=>state[x.id]=x.kind==="full"?"dim":x.kind==="ext"?"on":"off");push();count(N_EXT,"you could add",RM?0:700);
    const ext=ALL.filter(x=>x.kind==="ext");
    ext.forEach((x,k)=>later(()=>{ext.forEach(y=>state[y.id]=y===x?"hi":"on");push();
      const p=A.BY[x.id]||A.EXT.find(q=>q.id===x.id);
      $("oExtra").innerHTML=`<span class="intro-chip">${k+1} / ${ext.length}</span><b>${x.name}</b><span>${p?(p.est?"≈":"")+fmt(p.e)+" ft · "+p.t.join(", "):""}</span>`;
      whenMap(()=>imap.easeTo({center:x.c,zoom:13.2,pitch:50,bearing:-15+k*8,duration:RM?0:1300,padding:{top:0,bottom:innerHeight*.35,left:0,right:0}}))},RM?0:200+k*1700))}},
 {id:"choose",dur:0,eyebrow:"Your call",title:A.EXT_ON?`You're on Acadia ${30+N_EXT}`:"Add them?",
  body:A.EXT_ON?`The ${word(N_EXT).toLowerCase()} extra peaks are in your challenge. You can keep them or go back to the Full 30. Your checkmarks are kept either way.`
              :`Add the ${word(N_EXT).toLowerCase()} to your challenge and the whole site switches to Acadia ${30+N_EXT}: the chart, the map, the rankings and your progress ring. Your checkmarks are kept either way.`,
  run(){state={};ALL.forEach(x=>state[x.id]=x.kind==="full"||x.kind==="ext"?"on":"off");push();count(30+N_EXT,A.EXT_ON?"in your challenge":"if you add them",RM?0:600);
    whenMap(()=>imap.fitBounds(ISLAND,{padding:{top:60,bottom:innerHeight*.42,left:40,right:40},pitch:20,bearing:0,duration:RM?0:1500}));
    try{localStorage.setItem(SEEN,"1")}catch(e){}dispatchEvent(new Event("acadia30:otherssee"));
    $("oChoice").innerHTML=A.EXT_ON
      ?`<button class="ibtn primary" data-keep>Keep all ${30+N_EXT}</button><button class="ibtn" data-ext="0">Back to the Full 30</button>`
      :`<button class="ibtn primary" data-ext="1">Add the ${word(N_EXT).toLowerCase()} peaks</button><button class="ibtn" data-keep>Keep the Full 30</button>`;
    $("oChoice").hidden=false}}
];

function render(){
  stopAll();const s=S[idx];root.dataset.scene=s.id;root.classList.toggle("mapon",A.hasLibs);
  const cap=root.querySelector(".intro-cap");cap.classList.remove("in");void cap.offsetWidth;cap.classList.add("in");
  $("oEyebrow").textContent=s.eyebrow;$("oTitle").textContent=s.title;$("oBody").textContent=s.body;$("oExtra").innerHTML="";
  $("oChoice").hidden=true;$("oChoice").innerHTML="";
  const last=idx===S.length-1;$("oNext").hidden=last;$("oBack").disabled=idx===0;
  [...$("oDots").children].forEach((d,i)=>{d.classList.toggle("on",i===idx);d.classList.toggle("past",i<idx);d.style.setProperty("--d",(s.dur||1)+"ms");d.setAttribute("aria-current",i===idx?"step":"false")});
  s.run();
  if(s.dur&&!RM)later(next,s.dur);
  if(last)setTimeout(()=>{const b=$("oChoice").querySelector("button");if(b)b.focus({preventScroll:true})},60);
}
function next(){if(idx<S.length-1){idx++;render()}}
function back(){if(idx>0){idx--;render()}}
function open(){lastFocus=document.activeElement;root.hidden=false;document.documentElement.classList.add("intro-open");ensureMap();idx=0;render();
  setTimeout(()=>$("oNext").focus({preventScroll:true}),50)}
function close(){stopAll();root.classList.add("out");
  setTimeout(()=>{root.hidden=true;root.classList.remove("out","mapon");document.documentElement.classList.remove("intro-open");
    if(imap){imap.remove();imap=null;ready=false;pending=null}
    if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})},RM?0:450)}
function choose(on){
  try{localStorage.setItem(EXTKEY,on?"1":"0");sessionStorage.setItem("acadia30-toast",on?`Added ${N_EXT} peaks. You're now on Acadia ${30+N_EXT}.`:"Back to the Full 30.")}catch(e){}
  root.classList.add("out");setTimeout(()=>location.reload(),RM?0:400)}

$("oDots").innerHTML=S.map((s,i)=>`<button class="intro-dot" aria-label="Part ${i+1}: ${s.title}"><i></i></button>`).join("");
$("oDots").addEventListener("click",e=>{const b=e.target.closest(".intro-dot");if(!b)return;idx=[...b.parentNode.children].indexOf(b);render()});
$("oNext").onclick=next;$("oBack").onclick=back;$("oSkip").onclick=close;
$("oChoice").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.hasAttribute("data-keep"))close();else choose(b.dataset.ext==="1")});
root.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();close()}else if(e.key==="ArrowRight")next();else if(e.key==="ArrowLeft")back()});
document.addEventListener("click",e=>{if(e.target.closest("[data-others]"))open()});

// confirmation after switching presets
try{const t=sessionStorage.getItem("acadia30-toast");if(t){sessionStorage.removeItem("acadia30-toast");
  const d=document.createElement("div");d.className="toast";d.setAttribute("role","status");d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),5000)}}catch(e){}
})();
