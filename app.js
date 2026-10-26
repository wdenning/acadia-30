/* Acadia 30: install-as-app, offline copy, data downloads */
(()=>{
const $=id=>document.getElementById(id);
const fmtMB=b=>(b/1048576).toFixed(b<10485760?1:0)+" MB";

/* dialogs */
document.addEventListener("click",e=>{
  const o=e.target.closest("[data-dialog]");if(o){const d=$(o.dataset.dialog);if(d){d.showModal();if(d.id==="dlgApp")renderOffline()}return}
  const c=e.target.closest("[data-close]");if(c)c.closest("dialog").close();
});
document.querySelectorAll("dialog.dlg").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));
const openFromHash=()=>{const h=location.hash.slice(1);if(h==="app"||h==="data"){const d=$(h==="app"?"dlgApp":"dlgData");if(!d.open){d.showModal();if(h==="app")renderOffline()}}};

/* install */
const ua=navigator.userAgent;
const plat=(/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1))?"ios"
  :/Android/.test(ua)?"android":/Firefox\//.test(ua)?"firefox":(/Safari\//.test(ua)&&!/Chrome|Chromium|Edg\//.test(ua))?"mac":"desktop";
const det=document.querySelector(`.howto details[data-plat="${plat}"]`);if(det){det.open=true;det.classList.add("you")}
const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
if(standalone)$("installedMsg").hidden=false;
let deferred=null;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;if(!standalone)$("installNow").hidden=false});
$("installBtn").onclick=async()=>{if(!deferred)return;deferred.prompt();const r=await deferred.userChoice.catch(()=>({}));deferred=null;$("installNow").hidden=true;if(r.outcome==="accepted")$("installedMsg").hidden=false};
addEventListener("appinstalled",()=>{$("installNow").hidden=true;$("installedMsg").hidden=false});

/* service worker */
const secure=location.protocol==="https:"||["localhost","127.0.0.1"].includes(location.hostname);
const swOK=secure&&"serviceWorker" in navigator&&"caches" in window;
if(swOK)navigator.serviceWorker.register("sw.js").catch(()=>{});

/* offline copy of the island */
const OFF="acadia30-offline-v1",META="acadia30-offline";
const OMT="https://tiles.openfreemap.org/planet";
const DEM="https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";
const FONTS=["Noto Sans Regular","Noto Sans Bold","Noto Sans Italic"],RANGES=["0-255","256-511","8192-8447"];
const BOX={s:44.19,n:44.47,w:-68.47,e:-68.12};
function tiles(tpl,z0,z1){const out=[];for(let z=z0;z<=z1;z++){const n=2**z;
  const tx=lon=>Math.floor((lon+180)/360*n),ty=lat=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)};
  for(let x=tx(BOX.w);x<=tx(BOX.e);x++)for(let y=ty(BOX.n);y<=ty(BOX.s);y++)out.push(tpl.replace("{z}",z).replace("{x}",x).replace("{y}",y))}return out}
async function fileList(){
  const shell=await fetch("sw.js",{cache:"no-store"}).then(r=>r.text()).then(t=>{const m=t.match(/SHELL_FILES=(\[[\s\S]*?\]);/);return m?JSON.parse(m[1]):["./"]}).catch(()=>["./"]);
  const tj=await fetch(OMT,{mode:"cors",cache:"no-store"}).then(r=>{if(!r.ok)throw 0;return r.json()});
  const list=[...shell.map(f=>new URL(f,location.href).href),OMT,...tiles(tj.tiles[0],9,14),...tiles(DEM,9,13)];
  for(const f of FONTS)for(const r of RANGES)list.push(`https://tiles.openfreemap.org/fonts/${encodeURIComponent(f)}/${r}.pbf`);
  return [...new Set(list)];
}
let busy=false;
const getMeta=()=>{try{return JSON.parse(localStorage.getItem(META)||"null")}catch(e){return null}};
async function renderOffline(){
  const st=$("offState"),save=$("offSave"),rm=$("offRemove");
  if(!swOK){save.disabled=true;rm.hidden=true;
    st.innerHTML=`<span>Offline saving works on the published site (an https:// address). It isn't available when the page is opened straight from a file.</span>`;return}
  if(busy)return;
  const m=getMeta();let usage="";
  try{const est=await navigator.storage.estimate();if(est&&est.usage)usage=` This site is using ${fmtMB(est.usage)} on this device.`}catch(e){}
  if(m){const d=new Date(m.date).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
    st.innerHTML=`<b>Saved for offline use</b><span>${d} · ${m.files} files · ${fmtMB(m.bytes)}${m.failed?` · ${m.failed} couldn't be saved`:""}.${usage}</span>${m.persist===false?`<span>Your browser may clear this if the device runs low on space.</span>`:""}`;
    save.textContent="Update offline copy";rm.hidden=false;$("offSize").textContent=fmtMB(m.bytes);
  }else{st.innerHTML=`<span>Not saved on this device yet.${usage}</span>`;save.textContent="Save offline copy";rm.hidden=true}
  save.disabled=false;
}
$("offSave").onclick=async()=>{
  if(busy||!swOK)return;busy=true;const st=$("offState"),prog=$("offProg"),save=$("offSave");
  save.disabled=true;$("offRemove").hidden=true;prog.hidden=false;prog.value=0;st.innerHTML="<span>Getting the list of map files…</span>";
  let list;
  try{list=await fileList()}catch(e){st.innerHTML="<span>Couldn't reach the map server. Check your connection and try again.</span>";prog.hidden=true;busy=false;save.disabled=false;return}
  const cache=await caches.open(OFF);let doneN=0,bytes=0,failed=0,i=0;
  const worker=async()=>{while(i<list.length){const url=list[i++];
    try{const r=await fetch(url,{mode:new URL(url).origin===location.origin?"same-origin":"cors",cache:"no-store"});
      if(r.ok){const b=await r.clone().arrayBuffer();bytes+=b.byteLength;await cache.put(url,r)}else if(r.status!==204&&r.status!==404)failed++}
    catch(e){failed++}
    doneN++;prog.value=doneN/list.length;st.innerHTML=`<span>Saving ${doneN} of ${list.length} files · ${fmtMB(bytes)}</span>`}};
  await Promise.all(Array.from({length:6},worker));
  let persist=null;try{persist=navigator.storage&&navigator.storage.persist?await navigator.storage.persist():null}catch(e){}
  try{localStorage.setItem(META,JSON.stringify({date:Date.now(),files:list.length-failed,bytes,failed,persist}))}catch(e){}
  prog.hidden=true;busy=false;renderOffline();
};
$("offRemove").onclick=async()=>{await caches.delete(OFF);await caches.delete("acadia30-runtime-v1");try{localStorage.removeItem(META)}catch(e){}renderOffline()};

/* data downloads */
function download(name,text){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
const q=v=>{v=v==null?"":String(v);return/[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v};
$("dlCsv").onclick=()=>{const{P,G}=window.ACADIA30;
  const rows=[["name","elevation_ft","prominence_ft","outing","former_name","lat","lon","peakery_url"],...[...P].sort((a,b)=>b.e-a.e).map(p=>[p.n,(p.est?"~":"")+p.e,p.p??"",G[p.g].n,p.o||"",p.lat,p.lon,p.pk?`https://peakery.com/${p.pk}/`:""])];
  download("acadia-30-peaks.csv",rows.map(r=>r.map(q).join(",")).join("\n"))};
$("dlProgress").onclick=()=>{const{P,getDone}=window.ACADIA30,d=getDone();
  const rows=[["name","elevation_ft","summited","date"],...[...P].sort((a,b)=>b.e-a.e).map(p=>[p.n,p.e,d[p.id]?"yes":"no",d[p.id]||""])];
  download("my-acadia-30.csv",rows.map(r=>r.map(q).join(",")).join("\n"))};

openFromHash();addEventListener("hashchange",openFromHash);
})();
