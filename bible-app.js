/* ============================================================
   HIRA+ — Baiboly sy Lohahevitra
   Miaraka amin'ny index.html (mampiasa ny fiasa sy endrika efa ao: $, ic, esc, norm, store, toast...).
   Angona: baiboly.js (window.BAIBOLY) sy lohahevitra.js (window.LOHAHEVITRA).
   ============================================================ */
(()=>{
'use strict';
const BKEY='hiraplus_bible_pos',BFAV='hiraplus_bfav';
const TH=Array.isArray(window.LOHAHEVITRA)?window.LOHAHEVITRA:[];
const inBible=()=>document.body.classList.contains('mode-bible');
const data=()=>window.BAIBOLY&&window.BAIBOLY.b;
const BV_TABS={bread:'read',bthemes:'themes',btheme:'themes',bfav:'fav',dict:'dict','dict-entry':'dict'};
let bfavs=[],pos={b:1,c:1},sel=new Set(),bview='bread',bPrev='bread',curB=1,curC=1,curTheme=-1,idx=null,loading=null,bsT;
try{bfavs=JSON.parse(store.get(BFAV,'[]'))}catch(e){bfavs=[]}
if(!Array.isArray(bfavs))bfavs=[];
try{const p=JSON.parse(store.get(BKEY,'null'));if(p&&p.b>=1&&p.b<=66&&p.c>=1)pos={b:p.b|0,c:p.c|0}}catch(e){}
OVS.push('bpick','bsheet');

/* ---------- Angona ---------- */
function loadBible(){
  if(data())return Promise.resolve();
  if(loading)return loading;
  loading=new Promise((res,rej)=>{
    const s=document.createElement('script');s.src='./baiboly.js';
    s.onload=res;s.onerror=()=>{loading=null;rej(new Error('load'))};
    document.head.appendChild(s);
  });
  return loading;
}
const bookName=b=>data()?data()[b-1][0]:'';
const nChap=b=>data()[b-1][3].length;
const jes=t=>t; /* Jesosy ihany */
const vText=(b,c,v)=>jes((data()[b-1][3][c-1]||[])[v-1]||'');
const key=(b,c,v)=>b+':'+c+':'+v;
const parseKey=k=>k.split(':').map(Number);
const saveFavs=()=>store.set(BFAV,JSON.stringify(bfavs));
function refStr(b,c,vs){
  vs=[...vs].sort((x,y)=>x-y);const parts=[];let s=vs[0],p=s;
  for(let i=1;i<=vs.length;i++){const v=vs[i];if(v===p+1){p=v;continue}parts.push(s===p?''+s:s+'-'+p);s=v;p=v}
  return bookName(b)+' '+c+':'+parts.join(', ');
}
function bhl(t,toks){
  const nt=norm(t);if(nt.length!==t.length)return esc(t);
  const mk=new Array(t.length).fill(false);
  for(const k of toks){if(!k)continue;let i=0,p;while((p=nt.indexOf(k,i))>-1){for(let j=p;j<p+k.length;j++)mk[j]=true;i=p+k.length}}
  let out='',open=false;
  for(let i=0;i<t.length;i++){
    if(mk[i]&&!open){out+='<mark>';open=true}else if(!mk[i]&&open){out+='</mark>';open=false}
    out+=esc(t[i]);
  }
  return out+(open?'</mark>':'');
}

/* ---------- Lohateny sy tabilao ---------- */
function setHeader(){
  const t=$('barTitle');
  const titles={bthemes:'Fizahandohateny',btheme:curTheme>=0&&TH[curTheme]?TH[curTheme][0]:'Fizahandohateny',bsearch:'Karohy',bfav:'Andininy tiako',dict:'Dikisionera','dict-entry':(window._dictWord||'Dikisionera')};
  t.textContent=bview==='bread'?(data()?bookName(curB)+' '+curC:'Baiboly'):titles[bview];
  t.classList.toggle('b-title-btn',bview==='bread'&&!!data());
  t.classList.remove('num-title','app-title');
  $('bBackBtn').classList.toggle('off',!(bview==='btheme'||bview==='bsearch'||bview==='dict-entry'));
  $('bSearchBtn').classList.toggle('off',bview==='bsearch');
  $('bGearBtn').classList.toggle('off',bview!=='bread');
}
function bShow(n){
  bview=n;
  document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active',e.id==='view-'+n));
  document.querySelectorAll('.bnav .tab').forEach(b=>b.classList.toggle('active',b.dataset.bt===BV_TABS[n]));
  if(n!=='bread')clearSel();
  setHeader();
  if(n!=='bread')window.scrollTo({top:0});
}
const isSub=()=>bview==='btheme'||bview==='bsearch'||bview==='dict-entry';
function pushSub(){history.pushState({bsub:1},'')}
function subBack(fromPop){
  if(!fromPop&&history.state&&history.state.bsub){history.back();return}
  if(bview==='btheme')bShow('bthemes');
  else if(bview==='dict-entry')bShow('dict');
  else bShow(bPrev||'bread');
}
$('bBackBtn').onclick=()=>subBack(false);
addEventListener('popstate',()=>{
  if(!inBible()||overlayOpen())return;
  if(history.state&&history.state.bsub)return;
  if(isSub())subBack(true);
});
$('barTitle').addEventListener('click',()=>{if(inBible()&&bview==='bread'&&data())openPicker()});

/* ---------- Fidirana / fivoahana ---------- */
async function enterBible(t){
  if(view==='reader')go(lastView,{scroll:false});
  if(overlayOpen())hideOverlays();
  document.body.classList.remove('fs');
  document.body.classList.add('mode-bible');
  const wantThemes=!!(t&&(t.themes||(t.theme!=null&&t.theme>=0)));
  const wantDict=!!(t&&t.dict);
  // Dikisionera: aseho avy hatrany (tsy mila Baiboly)
  if(wantDict){
    bview='dict';
    bShow('dict');
    try{renderDict()}catch(e){}
    return;
  }
  // Fizahandohateny: aseho avy hatrany ny lisitra (tsy Baiboly)
  if(wantThemes){
    bview='bthemes';
    bShow('bthemes');
    try{renderThemes()}catch(e){}
  }else{
    bview='bread';bShow('bread');
    if(!data()){$('bTesta').textContent='';$('bChTitle').textContent='Mamaky ny Baiboly…';$('bVerses').innerHTML='';$('bPager').classList.add('hidden')}
  }
  try{await loadBible()}catch(e){
    if(!wantThemes){toast('Tsy voasintona ny Baiboly. Mila Internet indray mandeha.');exitBible();return}
    toast('Tsy voasintona ny Baiboly — ny lohahevitra dia hita, fa tsy ny andininy.');
  }
  setTimeout(warmIdx,400);
  if(t&&t.theme!=null&&t.theme>=0){renderThemes();bShow('bthemes');if(data())openTheme(t.theme)}
  else if(t&&t.themes){renderThemes();bShow('bthemes')}
  else if(t&&t.b)openChapter(t.b,t.c,t.v);
  else if(!wantThemes)openChapter(pos.b,Math.min(pos.c,nChap(pos.b)));
}
function exitBible(){
  if(overlayOpen())hideOverlays();
  clearSel();
  document.body.classList.remove('mode-bible');
  $('barTitle').classList.remove('b-title-btn');
  go(lastView||'home',{scroll:false});
  window.scrollTo({top:0});
}
$('bibleBtn').onclick=()=>enterBible();
if($('drBible'))$('drBible').onclick=()=>{hideOverlays();enterBible()};
if($('drThemes'))$('drThemes').onclick=()=>{hideOverlays();enterBible({themes:1})};
if($('drDict'))$('drDict').onclick=()=>{hideOverlays();enterBible({dict:1})};
if($('drVerse'))$('drVerse').onclick=null;

if($('themeToHymn'))$('themeToHymn').onclick=()=>exitBible();
$('filterBible').onclick=()=>{const i=bThemeFor(F.cat);if(i>=0)enterBible({theme:i});else toast('Tsy misy lohahevitra mifanaraka.')};
document.querySelectorAll('.bnav .tab').forEach(b=>b.onclick=()=>{
  const t=b.dataset.bt;
  if(t==='hymn')return exitBible();
  // shortcut handled below
  if(t==='read'){if(bview!=='bread'&&data())openChapter(curB,curC,0,{keep:true});return}
  if(t==='themes'){renderThemes();bShow('bthemes');return}
  if(t==='fav'){renderFavs();bShow('bfav');return}
  if(t==='dict'){renderDict();bShow('dict');return}
});
$('bHashBtn').onclick=()=>{if(data())openPicker()};
$('bSearchBtn').onclick=()=>{
  if(bview!=='bsearch'){bPrev=bview;pushSub();bShow('bsearch');runSearch()}
  setTimeout(()=>$('bSearchIn').focus(),30);
};
$('bGearBtn').onclick=()=>{$('bsSize').textContent=fontSize;showOverlay($('bsheet'))};

/* ---------- Famakiana toko ---------- */
function renderVerses(){
  const arr=data()[curB-1][3][curC-1]||[];
  $('bVerses').innerHTML=arr.map((t,i)=>{const v=i+1;return `<p class="bv${bfavs.includes(key(curB,curC,v))?' fav':''}${sel.has(v)?' sel':''}" data-v="${v}"><span class="bn">${v}</span>${esc(jes(t))}</p>`}).join('');
}
function openChapter(b,c,v,{keep=false}={}){
  if(!data())return;
  b=Math.max(1,Math.min(66,b|0));c=Math.max(1,Math.min(nChap(b),c|0||1));
  curB=b;curC=c;pos={b,c};store.set(BKEY,JSON.stringify(pos));
  clearSel();
  $('bTesta').textContent=b<=39?'Testameta taloha':'Testameta vaovao';
  $('bChTitle').textContent=bookName(b)+' • Toko '+c;
  renderVerses();
  $('bPager').classList.remove('hidden');
  $('bPrev').disabled=b===1&&c===1;
  $('bNext').disabled=b===66&&c===nChap(66);
  bShow('bread');
  if(v){
    const el=$('bVerses').querySelector(`.bv[data-v="${v}"]`);
    if(el){el.classList.add('flash');requestAnimationFrame(()=>el.scrollIntoView({block:'center'}))}
  }else if(!keep)window.scrollTo({top:0});
}
function step(d){
  let b=curB,c=curC+d;
  if(c<1){b--;if(b<1)return toast('Efa ny voalohany.');c=nChap(b)}
  else if(c>nChap(b)){b++;if(b>66)return toast('Efa ny farany.');c=1}
  openChapter(b,c);
}
$('bPrev').onclick=()=>step(-1);
$('bNext').onclick=()=>step(1);
(()=>{let x0=null,y0=0;const r=$('view-bread');
  r.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  r.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
    if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*2)step(dx<0?1:-1)},{passive:true});
})();

/* ---------- Fisafidianana andininy sy asa ---------- */
function clearSel(){sel.clear();const a=$('bActions');if(a){a.classList.remove('show');document.querySelectorAll('#bVerses .bv.sel').forEach(e=>e.classList.remove('sel'))}}
function updateActions(){
  const n=sel.size;$('bActions').classList.toggle('show',n>0&&bview==='bread');
  if(!n)return;
  $('bCnt').textContent=n;$('bCnt').title=n+' andininy';
  const allFav=[...sel].every(v=>bfavs.includes(key(curB,curC,v)));
  $('bFav').innerHTML=ic('heart',allFav?'fill':'');$('bFav').classList.toggle('solid',allFav);
}
$('bVerses').addEventListener('click',e=>{
  const p=e.target.closest('.bv');if(!p)return;
  const v=+p.dataset.v;p.classList.remove('flash');
  if(sel.has(v)){sel.delete(v);p.classList.remove('sel')}else{sel.add(v);p.classList.add('sel')}
  updateActions();
});
function selText(){
  const vs=[...sel].sort((a,b)=>a-b);
  const body=vs.map(v=>(vs.length>1?v+' ':'')+vText(curB,curC,v)).join('\n');
  return refStr(curB,curC,vs)+'\n'+body+'\n— Baiboly sy fihirana Jesosy Mamonjy';
}
$('bCopy').onclick=async()=>{try{await navigator.clipboard.writeText(selText());toast('Voadika ny andininy.');clearSel()}catch(e){toast('Tsy afaka nandika.')}};
$('bShare').onclick=async()=>{
  const t=selText();
  if(navigator.share){try{await navigator.share({title:refStr(curB,curC,sel),text:t})}catch(e){}}
  else{try{await navigator.clipboard.writeText(t);toast('Voadika ny andininy.')}catch(e){toast('Tsy afaka nizara.')}}
};
$('bFav').onclick=()=>{
  const ks=[...sel].map(v=>key(curB,curC,v));
  const all=ks.every(k=>bfavs.includes(k));
  bfavs=all?bfavs.filter(k=>!ks.includes(k)):[...new Set([...bfavs,...ks])];
  saveFavs();renderVerses();sel.forEach(v=>$('bVerses').querySelector(`.bv[data-v="${v}"]`)?.classList.add('sel'));
  updateActions();toast(all?'Nesorina tamin\'ny andininy tiako.':'Nampidirina tamin\'ny andininy tiako.');
};
$('bClr').onclick=clearSel;

/* ---------- Mpisafidy boky / toko / andininy ---------- */
const pk={tab:'book',b:0,c:0};
function openPicker(){
  pk.tab='book';pk.b=curB;pk.c=curC;
  renderPicker();showOverlay($('bpick'));
}
function bookItems(q){
  const B=data();const out=[[],[]];
  B.forEach((bk,i)=>{
    if(q&&!norm(bk[0]+' '+bk[1]+' '+bk[2]).includes(q))return;
    out[i<39?0:1].push(`<button class="bp-item${i+1===curB?' cur':''}" data-b="${i+1}">${esc(bk[0])}</button>`);
  });
  return out;
}
function renderBookLists(){
  const q=norm(($('bpQ')||{}).value||'');const [a,b]=bookItems(q);
  $('bpA').innerHTML=a.join('')||'<span class="bp-none">—</span>';
  $('bpB').innerHTML=b.join('')||'<span class="bp-none">—</span>';
}
function renderPicker(){
  const t=pk.tab;
  document.querySelectorAll('#bpick .bp-tabs button').forEach(x=>{
    x.classList.toggle('active',x.dataset.t===t);
    x.disabled=(x.dataset.t==='chap'&&!pk.b)||(x.dataset.t==='verse'&&!(pk.b&&pk.c));
  });
  $('bpBack').disabled=t==='book';
  const body=$('bpBody');
  if(t==='book'){
    $('bpTitle').textContent='Fisafidianana boky';$('bpSub').textContent='';
    body.innerHTML=`<div class="sbox"><i data-ic="search"></i><input id="bpQ" placeholder="Anaran'ny boky karohana..." autocomplete="off"></div><div class="bp-cols"><div><h5>Testameta taloha</h5><div id="bpA"></div></div><div><h5>Testameta vaovao</h5><div id="bpB"></div></div></div>`;
    body.querySelectorAll('[data-ic]').forEach(e=>e.innerHTML=ic(e.dataset.ic));
    $('bpQ').oninput=renderBookLists;renderBookLists();
  }else if(t==='chap'){
    $('bpTitle').textContent='Fisafidianana toko';$('bpSub').textContent=bookName(pk.b);
    const n=nChap(pk.b);
    body.innerHTML='<div class="bp-grid">'+Array.from({length:n},(_,i)=>`<button class="bp-item${pk.b===curB&&i+1===curC?' cur':''}" data-c="${i+1}">${i+1}</button>`).join('')+'</div>';
  }else{
    $('bpTitle').textContent='Fisafidianana andininy';$('bpSub').textContent=bookName(pk.b)+' '+pk.c;
    const n=(data()[pk.b-1][3][pk.c-1]||[]).length;
    body.innerHTML=`<p class="bp-hint">Tsindrio ny andininy voalohany.</p><button class="btn bp-all" data-all="1">Toko manontolo (1–${n})</button><div class="bp-grid">`+Array.from({length:n},(_,i)=>`<button class="bp-item" data-v="${i+1}">${i+1}</button>`).join('')+'</div>';
  }
  body.scrollTop=0;
}
$('bpBody').addEventListener('click',e=>{
  const x=e.target.closest('button');if(!x)return;
  if(x.dataset.b){pk.b=+x.dataset.b;pk.c=0;pk.tab='chap';renderPicker()}
  else if(x.dataset.c){pk.c=+x.dataset.c;pk.tab='verse';renderPicker()}
  else if(x.dataset.v){hideOverlays(true);openChapter(pk.b,pk.c,+x.dataset.v)}
  else if(x.dataset.all){hideOverlays(true);openChapter(pk.b,pk.c)}
});
document.querySelectorAll('#bpick .bp-tabs button').forEach(b=>b.onclick=()=>{if(b.disabled)return;pk.tab=b.dataset.t;renderPicker()});
$('bpBack').onclick=()=>{if(pk.tab==='verse')pk.tab='chap';else if(pk.tab==='chap')pk.tab='book';renderPicker()};
$('bpClose').onclick=()=>hideOverlays(true);

/* ---------- Lohahevitra ---------- */
function renderThemes(){
  const q=norm($('bThemeQ').value.trim());
  const arr=TH.map((t,i)=>[t,i]).filter(([t])=>!q||norm(t[0]+' '+t[1]+' '+t[2]).includes(q));
  $('bThemeCount').textContent='';
  $('bThemeList').innerHTML=arr.length?arr.map(([t,i])=>`<div class="t-card" tabindex="0" role="button" data-t="${i}"><div class="info"><h4>${hl(t[0],q)}</h4><p>${esc([t[1],t[2]].filter(Boolean).join(' • '))}</p></div></div>`).join(''):emptyBox('grid','Tsy nahitana lohahevitra.','Andramo ny teny hafa.');
}
let tq;$('bThemeQ').addEventListener('input',()=>{clearTimeout(tq);tq=setTimeout(renderThemes,100)});
function openTheme(i){
  const t=TH[i];if(!t||!data())return;
  curTheme=i;
  $('bThemeInfo').textContent=t[3].length+' andininy'+([t[1],t[2]].filter(Boolean).length?' • '+[t[1],t[2]].filter(Boolean).join(' / '):'');
  const hymn=hymnCategoryFor(t[0]);
  $('bThemeHymn').classList.toggle('hidden',!hymn);$('bThemeHymn').dataset.cat=hymn||'';
  $('bThemeVerses').innerHTML=t[3].map(([b,c,v])=>`<div class="vcard" tabindex="0" role="button" data-b="${b}" data-c="${c}" data-v="${v}"><div class="vc-main"><span class="ref">${esc(bookName(b))} ${c}:${v}</span><p>${esc(vText(b,c,v))}</p></div></div>`).join('');
  if(bview!=='btheme'){bPrev='bthemes';pushSub()}
  bShow('btheme');
}
$('bThemeList').addEventListener('click',e=>{const c=e.target.closest('.t-card');if(c)openTheme(+c.dataset.t)});
$('bThemeList').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const c=e.target.closest('.t-card');if(c){e.preventDefault();openTheme(+c.dataset.t)}}});
$('bThemeHymn').onclick=()=>{
  const cat=$('bThemeHymn').dataset.cat;if(!cat)return;
  exitBible();F.book=F.year=F.letter='';F.cat=cat;renderDrawer();go('home');
};
function hymnCategoryFor(name){
  const n=norm(name);const s=(typeof songs!=='undefined'?songs:[]).find(x=>x.category&&norm(x.category)===n);
  return s?s.category:'';
}
window.bThemeFor=cat=>{const n=norm(cat);return TH.findIndex(t=>norm(t[0])===n)};

/* ---------- Fikarohana andininy ---------- */
/* Tondro fikarohana: atao isan-boky amin'ny fotoana malalaka, mba tsy hiala-tsiny ny efijery */
let ib=0;
function addBook(bi){const bk=data()[bi];if(!bk)return;bk[3].forEach((ch,ci)=>ch.forEach((t,vi)=>idx.push({b:bi+1,c:ci+1,v:vi+1,t,n:norm(t)})))}
function buildIdx(){if(!idx)idx=[];while(ib<66)addBook(ib++);return idx}
function warmIdx(){if(!data()||ib>=66)return;if(!idx)idx=[];addBook(ib++);setTimeout(warmIdx,30)}
function parseRef(q){
  const m=norm(q).match(/^(\d?\s*[a-z'’\-. ]+?)\s*(\d{1,3})(?:\s*[:.,v]\s*(\d{1,3}))?$/);
  if(!m)return null;
  const nm=m[1].replace(/[\s.'’-]/g,'');if(nm.length<2)return null;
  const B=data();
  for(let i=0;i<B.length;i++){
    if([B[i][0],B[i][1],B[i][2]].some(x=>norm(x).replace(/[\s.'’-]/g,'').startsWith(nm))){
      const c=+m[2],v=m[3]?+m[3]:0;
      if(c<1||c>B[i][3].length)return null;
      if(v&&v>(B[i][3][c-1]||[]).length)return null;
      return {b:i+1,c,v};
    }
  }
  return null;
}
function runSearch(){
  const raw=$('bSearchIn').value.trim();
  $('bClearSearch').classList.toggle('hidden',!raw);
  const out=$('bSearchList'),cnt=$('bSearchCount');
  if(!raw){cnt.textContent='';out.innerHTML=emptyBox('search','Karohy ny Baiboly.','Soraty ny teny na ny toerana, ohatra “fitiavana” na “Jaona 3:16”.');return}
  let html='';
  const r=parseRef(raw);
  if(r)html+=`<div class="vcard jump" tabindex="0" role="button" data-b="${r.b}" data-c="${r.c}" data-v="${r.v}"><div class="vc-main"><span class="ref">Mandeha any amin'ny ${esc(bookName(r.b))} ${r.c}${r.v?':'+r.v:''}</span>${r.v?`<p>${esc(vText(r.b,r.c,r.v))}</p>`:''}</div>${ic('right')}</div>`;
  const toks=norm(raw).split(/\s+/).filter(Boolean);
  const hits=toks.length?buildIdx().filter(o=>toks.every(k=>o.n.includes(k))):[];
  const shown=hits.slice(0,100);
  cnt.textContent=hits.length+(hits.length>1?' andininy hita':' andininy hita')+(hits.length>100?' • aseho ny 100 voalohany':'');
  html+=shown.map(o=>`<div class="vcard" tabindex="0" role="button" data-b="${o.b}" data-c="${o.c}" data-v="${o.v}"><div class="vc-main"><span class="ref">${esc(bookName(o.b))} ${o.c}:${o.v}</span><p>${bhl(jes(o.t),toks)}</p></div></div>`).join('');
  out.innerHTML=html||emptyBox('search','Tsy nahitana andininy.','Andramo ny teny hafa.');
}
let sT;$('bSearchIn').addEventListener('input',()=>{clearTimeout(sT);sT=setTimeout(runSearch,160)});
$('bClearSearch').onclick=()=>{$('bSearchIn').value='';runSearch();$('bSearchIn').focus()};

/* ---------- Andininy tiako ---------- */
function renderFavs(){
  const arr=bfavs.map(parseKey).filter(([b,c,v])=>data()&&data()[b-1]&&(data()[b-1][3][c-1]||[])[v-1]).sort((x,y)=>x[0]-y[0]||x[1]-y[1]||x[2]-y[2]);
  $('bFavCount').textContent=arr.length+' andininy tiako';
  $('bFavList').innerHTML=arr.length?arr.map(([b,c,v])=>`<div class="vcard" tabindex="0" role="button" data-b="${b}" data-c="${c}" data-v="${v}"><div class="vc-main"><span class="ref">${esc(bookName(b))} ${c}:${v}</span><p>${esc(vText(b,c,v))}</p></div><button class="ibtn on" data-unfav="${key(b,c,v)}" aria-label="Ahena">${ic('heart','fill')}</button></div>`).join(''):emptyBox('heart','Mbola tsy nisafidy andininy ianao.','Tsindrio ny andininy rehefa mamaky, dia safidio ny fo.');
}
$('bFavList').addEventListener('click',e=>{
  const u=e.target.closest('[data-unfav]');
  if(u){e.stopPropagation();bfavs=bfavs.filter(k=>k!==u.dataset.unfav);saveFavs();renderFavs();toast('Nesorina tamin\'ny andininy tiako.');return}
});
window.bibleFavs=()=>bfavs.slice();
window.bibleImportFavs=arr=>{const ok=arr.filter(k=>typeof k==='string'&&/^\d+:\d+:\d+$/.test(k));bfavs=[...new Set([...bfavs,...ok])];saveFavs();toast(ok.length+' andininy tiako no voaverina.')};

/* ---------- Fidirana amin'ny vokatra (andininy) ---------- */
document.addEventListener('click',e=>{
  if(!inBible())return;
  const c=e.target.closest('.vcard');
  if(c&&!e.target.closest('[data-unfav]')){openChapter(+c.dataset.b,+c.dataset.c,+c.dataset.v)}
});
document.addEventListener('keydown',e=>{
  if(!inBible())return;
  if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('vcard')){e.preventDefault();e.target.click();return}
  if(e.key==='Escape'&&overlayOpen()){hideOverlays(true);return}
  const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||overlayOpen()||bview!=='bread')return;
  if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1);
  else if(e.key==='+'||e.key==='=')changeFont(2);else if(e.key==='-')changeFont(-2);
  else if(e.key==='/'){e.preventDefault();$('bSearchBtn').click()}
});

/* ---------- Fikirana famakiana ---------- */
$('bsPlus').onclick=()=>{changeFont(2);$('bsSize').textContent=fontSize};
$('bsMinus').onclick=()=>{changeFont(-2);$('bsSize').textContent=fontSize};
$('bsReset').onclick=()=>{resetFont();$('bsSize').textContent=fontSize};
if(location.hash==='#baiboly')enterBible();

/* ---------- Dikisionera Baiboly ---------- */
const DICT=()=>Array.isArray(window.DIKISIONERA)?window.DIKISIONERA:[];
function renderDict(){
  const q=norm(($('dictQ')||{}).value||'').trim();
  const all=DICT();
  const arr=q?all.filter(e=>norm(e.w+' '+(e.g||'')+' '+(e.t||'')).includes(q)):all;
  const list=$('dictList');if(!list)return;
  list.innerHTML=arr.length?arr.map(e=>`<div class="t-card" tabindex="0" role="button" data-dict="${esc(e.id)}"><div class="info"><h4>${hl(e.w,q)}</h4><p>${esc((e.g||e.t||'').slice(0,90))}${(e.g||e.t||'').length>90?'…':''}</p></div></div>`).join(''):emptyBox('search','Tsy nahitana teny.','Andramo ny teny hafa.');
}
let dictT;
if($('dictQ'))$('dictQ').addEventListener('input',()=>{clearTimeout(dictT);dictT=setTimeout(renderDict,120)});
function openDictEntry(id){
  const e=DICT().find(x=>x.id===id);if(!e)return;
  window._dictWord=e.w;
  if($('dictWord'))$('dictWord').textContent=e.w;
  if($('dictGloss'))$('dictGloss').textContent=e.g||'';
  if($('dictBody'))$('dictBody').innerHTML=`<p style="margin:0;white-space:pre-line;font-family:var(--lyric-font);font-size:calc(var(--lyric-size) - 1px);line-height:1.55">${esc(e.t||'')}</p>`;
  const refs=Array.isArray(e.r)?e.r:[];
  if($('dictRefs'))$('dictRefs').innerHTML=refs.length?refs.map(r=>`<div class="vcard"><div class="vc-main"><span class="ref">${esc(r)}</span></div></div>`).join(''):'';
  if(bview!=='dict-entry'){bPrev='dict';pushSub()}
  bShow('dict-entry');
}
document.addEventListener('click',e=>{
  if(!inBible())return;
  const c=e.target.closest('[data-dict]');
  if(c)openDictEntry(c.dataset.dict);
});

})();