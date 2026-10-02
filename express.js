/* ══════════════════════════════════════════════════════════════════════
   ARAMO — capa simple de pedidos.

   Tres pasos, nada más:  🏪 elegir proveedor → tocar producto → 🧺 enviar.

   No duplica procesos: todo pasa por las funciones de APP.html (getPedido,
   syncQty, setPrice, sendWA, buildMsg, sendAllPendingWA, sendListaWA…), así
   que los datos, la sincronización entre teléfonos, el histórico y los
   mensajes de WhatsApp son los mismos de siempre.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch{}};
const SIDE_NAME={moravia:'Moravia',angeles:'Los Ángeles'};
const SIDE_SHORT={moravia:'M',angeles:'LA'};
const SIDE_ICO={moravia:'🏠',angeles:'📍'};
const XP={parsed:[],sheet:null,chain:null,usage:null,undo:null,branch:'moravia'};

// ── Cantidades legibles: 0.5 → ½, 2.5 → 2½ ──
function fmtQ(n){
  n=+n||0;
  if(Number.isInteger(n))return String(n);
  if(Math.abs(n%1-.5)<1e-9)return (Math.floor(n)||'')+'½';
  return String(+n.toFixed(2));
}
function niceName(name){return isShouting(name)?titleCase(name):String(name||'');}

// ══════════════════════════════════════════
// ÍCONOS AUTOMÁTICOS — muchos productos vienen con 🧺 genérico
// ══════════════════════════════════════════
const EMOJI_RULES=[
  [/papaya/,'🧡'],[/pipa/,'🥥'],[/tomate/,'🍅'],[/cebolla/,'🧅'],[/\bpapa/,'🥔'],[/chile|pimiento/,'🫑'],
  [/\bajo/,'🧄'],[/limon/,'🍋'],[/zanahoria/,'🥕'],[/banano|platano|guineo/,'🍌'],[/pina/,'🍍'],
  [/sandia/,'🍉'],[/melon/,'🍈'],[/mango|manga/,'🥭'],[/naranja|mandarina/,'🍊'],[/fresa/,'🍓'],
  [/\buva/,'🍇'],[/manzana/,'🍎'],[/\bpera/,'🍐'],[/cereza/,'🍒'],[/kiwi/,'🥝'],[/durazno|melocoton/,'🍑'],
  [/arandano|\bmora/,'🫐'],[/\bcoco/,'🥥'],[/aguacate/,'🥑'],
  [/lechuga|repollo|espinaca|apio|acelga|bok|bak|arugula|berro|kale|mostaza/,'🥬'],
  [/brocoli|coliflor/,'🥦'],[/pepino|zucchini|zuquini|calabacin/,'🥒'],[/elote|maiz/,'🌽'],[/berenjena/,'🍆'],
  [/camote|yuca|tiquizque|malanga|nampi|\bname|arracache/,'🍠'],[/hongo|champi/,'🍄'],
  [/culantro|perejil|albahaca|hierbabuena|menta|romero|tomillo|oregano|eneldo|alfalfa|cebollino/,'🌿'],
  [/jengibre|curcuma/,'🫚'],[/vainica|arveja|arverja|guisante/,'🫛'],[/frijol/,'🫘'],[/huevo/,'🥚'],
  [/\bpan\b|bollo|bizcocho|galleta|tosta/,'🍞'],[/cafe/,'☕'],[/arroz/,'🍚'],[/queso/,'🧀'],[/miel/,'🍯'],
  [/leche/,'🥛'],[/mani|almendra|nuez|maranon|pistacho/,'🥜'],[/cacao|chocolate/,'🍫'],
  [/ayote|calabaza|zapallo/,'🎃'],[/chayote/,'🟢'],[/remolacha/,'🟣'],[/vinagre|aderezo|salsa/,'🫙'],
  [/agua/,'💧'],[/caimito|anona|guanabana|maracuya|granadilla|cas\b|guayaba|carambola|pitahaya/,'🍈'],
];
const GENERIC_EMOJI=new Set(['','🧺','🌿']);
function smartEmoji(prod){
  const own=String(prod?.emoji||'');
  if(!GENERIC_EMOJI.has(own))return own;
  const key=normalizeText(prod?.name||'');
  for(const [re,emoji] of EMOJI_RULES)if(re.test(key))return emoji;
  return own||'🧺';
}
window.smartEmoji=smartEmoji;

// ══════════════════════════════════════════
// ÍNDICE DE PRODUCTOS — el mismo producto en todos los proveedores
// ══════════════════════════════════════════
const STOP=new Set(['de','del','la','las','el','los','para','por','con','en','y','e','mas','porfa','favor','pedir','pedile','quiero','necesito','ocupo','traer','traeme','mandar','manda','mande','poner','pone','agregar','agrega','anadir','me','nos','le','les','al','a','o','que','pedido','hoy','manana','tambien','otro','otra','sucursal','buenas','buenos','dias','hola','gracias']);
function xpTokens(s){return normalizeText(String(s||'')).split(/[^a-z0-9]+/).filter(t=>t&&!STOP.has(t));}
function xpStem(w){
  if(w.length<=3)return w;
  w=w.replace(/(es|s)$/,'');
  if(w.length>3)w=w.replace(/[aeo]$/,'');
  return w;
}
function dice(a,b){
  if(a===b)return 1;
  if(a.length<2||b.length<2)return 0;
  const m=new Map();
  for(let i=0;i<a.length-1;i++){const g=a.substr(i,2);m.set(g,(m.get(g)||0)+1);}
  let inter=0;
  for(let i=0;i<b.length-1;i++){const g=b.substr(i,2),c=m.get(g);if(c){inter++;m.set(g,c-1);}}
  return 2*inter/(a.length+b.length-2);
}
function tokScore(q,p){
  if(q===p)return 1;
  const sq=xpStem(q),sp=xpStem(p);
  if(sq===sp)return .97;
  if(q.length>=3&&p.startsWith(q))return .9;
  if(p.length>=3&&q.startsWith(p))return .75;
  if(sq.length>=4&&sp.length>=4){const d=dice(sq,sp);if(d>=.66)return d*.85;}
  return 0;
}
function groupScore(qt,g){
  if(!qt.length||!g.tokens.length)return 0;
  let sum=0;const used=new Set();
  qt.forEach(q=>{
    let best=0,bi=-1;
    g.tokens.forEach((p,i)=>{if(used.has(i))return;const s=tokScore(q,p);if(s>best){best=s;bi=i;}});
    if(bi>-1)used.add(bi);
    sum+=best;
  });
  const cov=sum/qt.length;
  if(cov<.6)return 0;
  return cov-.06*(g.tokens.length-used.size)+(g.offers.some(o=>!o.otros)?.04:0)+(g.tokens[0]===qt[0]?.03:0);
}
let _idx=null,_idxSrc=null,_idxMap=new Map();
function xpIndex(){
  const provs=getAllProviders();
  if(_idx&&_idxSrc===provs)return _idx;
  const map=new Map();
  Object.entries(provs).forEach(([prov,data])=>(data?.products||[]).forEach(prod=>{
    if(!prod?.name||!prod.id)return;
    const key=normalizeText(prod.name);
    if(!key)return;
    let g=map.get(key);
    if(!g){g={key,name:niceName(prod.name),offers:[],tokens:xpTokens(key)};map.set(key,g);}
    g.offers.push({prov,prod,otros:prov==='Otros'});
  }));
  _idx=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  _idxSrc=provs;_idxMap=map;
  return _idx;
}
function xpGroupOf(name){xpIndex();return _idxMap.get(normalizeText(name||''));}
function xpProd(prov,pid){return (getAllProviders()[prov]?.products||[]).find(p=>p.id===pid)||null;}
function xpFind(words){
  const qt=xpTokens(words.join(' '));
  let best=null,bs=0;
  xpIndex().forEach(g=>{const s=groupScore(qt,g);if(s>bs){bs=s;best=g;}});
  return best?{group:best,score:bs}:null;
}
function xpUsage(){
  if(XP.usage)return XP.usage;
  const byOffer={};
  histGet().forEach(h=>{
    const seen=new Set();
    ['moravia','angeles'].forEach(side=>Object.entries(h.qtys?.[side]||{}).forEach(([pid,v])=>{
      if(!(+v?.qty>0)||seen.has(pid))return;
      seen.add(pid);
      byOffer[h.provider+'|'+pid]=(byOffer[h.provider+'|'+pid]||0)+1;
    }));
  });
  return XP.usage={byOffer};
}
function xpQty(prov,pid,side){return +S.pedidos[prov]?.qtys?.[side]?.[pid]?.qty||0;}
function xpHasQty(prov,pid){return activeOrderSides().some(s=>xpQty(prov,pid,s)>0);}
function xpPrice(o){return +getPrice(o.prov,o.prod.id)||0;}
// Proveedor recomendado: el que ya lo tiene en el pedido, el habitual o el más barato.
function xpTargetOffer(g){
  const withQty=g.offers.find(o=>xpHasQty(o.prov,o.prod.id));
  if(withQty)return withQty;
  const usage=xpUsage();
  return [...g.offers].sort((a,b)=>{
    if(a.otros!==b.otros)return a.otros?1:-1;
    const ua=usage.byOffer[a.prov+'|'+a.prod.id]||0,ub=usage.byOffer[b.prov+'|'+b.prod.id]||0;
    if(ua!==ub)return ub-ua;
    const pa=xpPrice(a)||Infinity,pb=xpPrice(b)||Infinity;
    if(pa!==pb)return pa-pb;
    return a.prov.localeCompare(b.prov,'es',{sensitivity:'base'});
  })[0];
}
function xpResolveSides(branch){
  const active=activeOrderSides();
  if(branch==='both')return active;
  return active.includes(branch)?[branch]:[active[0]];
}

// ══════════════════════════════════════════
// DICTADO — "10 kg tomate, 3 cajas aguacate para Los Ángeles"
// ══════════════════════════════════════════
const NUM={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,media:.5,medio:.5};
const UNIT_WORDS={kg:'kg',kgs:'kg',kilo:'kg',kilos:'kg',kilogramo:'kg',kilogramos:'kg',caja:'caja',cajas:'caja',cajita:'caja',cajitas:'caja',unidad:'unidad',unidades:'unidad',und:'unidad',unds:'unidad',unid:'unidad',pieza:'unidad',piezas:'unidad',docena:'docena',docenas:'docena'};
const BRANCH_WORDS={moravia:'moravia',aramo:'moravia',angeles:'angeles',lasr:'angeles',ambos:'both',ambas:'both'};
const NUM_ALT=Object.keys(NUM).filter(k=>k!=='media'&&k!=='medio').join('|');
function xpNum(t){
  if(/^\d+(\.\d+)?$/.test(t))return parseFloat(t);
  const f=t.match(/^(\d+)\/(\d+)$/);
  if(f&&+f[2])return +f[1]/+f[2];
  return Object.prototype.hasOwnProperty.call(NUM,t)?NUM[t]:null;
}
function xpParse(text,defBranch){
  let s=normalizeText(String(text||''));
  if(!s)return[];
  s=s
    .replace(/#\s*1\b/g,' moravia ').replace(/#\s*2\b/g,' angeles ')
    .replace(/\blos\s+angeles\b/g,' angeles ')
    .replace(/\b(?:las|los)\s+dos(?:\s+(?:sucursales|tiendas|locales))?\b/g,' ambos ')
    .replace(/(\d),(\d)/g,'$1.$2')
    .replace(/(\d)\s*(?:kgs?|k)\b/g,'$1 kg ')
    .replace(/(\d)\s*u\b/g,'$1 unidad ')
    .replace(new RegExp('\\b(veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\\s+y\\s+(uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\\b','g'),(m,a,b)=>' '+(NUM[a]+NUM[b])+' ')
    .replace(new RegExp('\\b(\\d+(?:\\.\\d+)?|'+NUM_ALT+')\\s+y\\s+medi[oa]\\b','g'),(m,a)=>' '+((NUM[a]??+a)+.5)+' ')
    .replace(/\b(kilo|caja|unidad)\s+y\s+medi[oa]\b/g,' 1.5 $1 ')
    .replace(/[•*·]+/g,' ')
    .replace(/\.(?!\d)/g,',')
    .replace(/[;\n\r]+/g,',')
    .replace(/:/g,' ')
    .replace(new RegExp('\\s+y\\s+(?=(\\d|(?:'+NUM_ALT+')\\b))','g'),', ');
  let branch=defBranch;
  const out=[];
  s.split(',').forEach(chunkRaw=>{
    let note='';
    const chunk=chunkRaw.replace(/\(([^)]*)\)/g,(m,inner)=>{
      const t=inner.trim();
      if(BRANCH_WORDS[t])return ' '+t+' ';
      if(t)note=(note?note+'; ':'')+t;
      return ' ';
    });
    const toks=chunk.split(/[^a-z0-9.\/]+/).map(t=>t.replace(/^\.+|\.+$/g,'')).filter(Boolean);
    let cur=null,leadBranch=null,sawContent=false;
    const items=[];
    const flush=()=>{if(cur&&(cur.words.length||cur.qty!=null))items.push(cur);cur=null;};
    const ensure=()=>cur||(cur={qty:null,words:[],unit:null,mult:1,branch:null});
    toks.forEach(t=>{
      if(BRANCH_WORDS[t]){if(!sawContent)leadBranch=BRANCH_WORDS[t];else ensure().branch=BRANCH_WORDS[t];return;}
      const num=xpNum(t);
      if(num!=null){sawContent=true;if(cur&&cur.qty!=null&&cur.words.length)flush();ensure().qty=num;return;}
      if(UNIT_WORDS[t]){sawContent=true;const c=ensure(),u=UNIT_WORDS[t];if(u==='docena'){c.mult=12;c.unit='unidad';}else c.unit=u;return;}
      if(STOP.has(t))return;
      sawContent=true;ensure().words.push(t);
    });
    flush();
    if(leadBranch)branch=leadBranch;
    items.forEach(it=>{
      const explicit=it.qty!=null;
      const qty=explicit?+(it.qty*it.mult).toFixed(2):(it.mult>1?it.mult:1);
      const m=it.words.length?xpFind(it.words):null;
      if(!m||(!explicit&&m.score<.85)){
        if(explicit&&it.words.length)out.push({raw:it.words.join(' '),qty,unit:it.unit,branch:it.branch||branch,group:null,note,explicit});
        return;
      }
      const off=xpTargetOffer(m.group);
      out.push({raw:it.words.join(' '),qty,unit:it.unit,branch:it.branch||branch,group:m.group,prov:off.prov,pid:off.prod.id,note,explicit});
    });
  });
  return out;
}

// ══════════════════════════════════════════
// ESCRITURA — siempre a través de syncQty (marca no-enviado, totales, nube)
// ══════════════════════════════════════════
function xpSet(prov,pid,side,val,unit){
  const prod=xpProd(prov,pid);
  if(!prod)return;
  const p=getPedido(prov);
  const u=normUnit(unit||p.qtys[side]?.[pid]?.unit||p.qtys[side==='moravia'?'angeles':'moravia']?.[pid]?.unit||prod.unit);
  const n=Math.max(0,+(+val||0).toFixed(2));
  syncQty(prov,prod,side,n?String(n):'',u);
}

// ══════════════════════════════════════════
// "LO DE SIEMPRE" — aprende de los pedidos enviados
// ══════════════════════════════════════════
function xpHistFor(prov){
  const seen=new Set(),list=[];
  for(const h of histGet()){
    if(h.provider!==prov)continue;
    const d=String(h.date||'').slice(0,10);
    if(seen.has(d))continue;
    seen.add(d);list.push(h);
    if(list.length>=4)break;
  }
  return list;
}
function xpSuggestion(prov){
  const list=xpHistFor(prov);
  if(!list.length)return null;
  const need=Math.max(1,Math.ceil(list.length/2));
  const qtys={moravia:{},angeles:{}};
  let count=0;
  ['moravia','angeles'].forEach(side=>{
    const vals={};
    list.forEach(h=>Object.entries(h.qtys?.[side]||{}).forEach(([pid,v])=>{if(+v?.qty>0)(vals[pid]=vals[pid]||[]).push({q:+v.qty,u:v.unit});}));
    Object.entries(vals).forEach(([pid,arr])=>{
      if(arr.length<need)return;
      const qs=arr.map(a=>a.q).sort((a,b)=>a-b);
      qtys[side][pid]={qty:qs[Math.floor(qs.length/2)],unit:arr[0].u};
      count++;
    });
  });
  return count?{days:list.length,qtys}:null;
}
function xpApplyQtys(prov,qtys){
  const prods=new Set((getAllProviders()[prov]?.products||[]).map(p=>p.id));
  let n=0;
  activeOrderSides().forEach(side=>Object.entries(qtys?.[side]||{}).forEach(([pid,v])=>{
    if(!prods.has(pid)||!(+v?.qty>0)||xpQty(prov,pid,side)>0)return;
    xpSet(prov,pid,side,+v.qty,v.unit);n++;
  }));
  return n;
}

// ══════════════════════════════════════════
// RESUMEN DEL PEDIDO
// ══════════════════════════════════════════
function xpProvLines(prov){
  const p=S.pedidos[prov];
  if(!p)return{lines:[],extras:[]};
  const sides=activeOrderSides(),lines=[],extras=[];
  (getAllProviders()[prov]?.products||[]).forEach(prod=>{
    const q={};let any=false;
    sides.forEach(s=>{const v=+p.qtys?.[s]?.[prod.id]?.qty||0;q[s]=v;if(v>0)any=true;});
    if(any)lines.push({prod,q,unit:normUnit(sides.map(s=>p.qtys[s]?.[prod.id]?.unit).find(Boolean)||prod.unit)});
  });
  sides.forEach(s=>(p.extras?.[s]||[]).forEach(e=>{if(+e.qty>0)extras.push({...e,side:s});}));
  return{lines,extras};
}
function xpCount(prov){const l=xpProvLines(prov);return l.lines.length+l.extras.length;}
function xpTotals(){
  const provs=getProvNames().filter(hasData);
  let items=0;
  provs.forEach(p=>items+=xpCount(p));
  return{provs,items,total:calcScopedAllProvs().total,pending:provs.filter(p=>!isSent(p)).length};
}
function sideTotal(prov){return activeOrderSides().reduce((t,s)=>t+calcSide(s,prov),0);}
function xpQtyLabel(q,unit){
  const sides=activeOrderSides();
  const parts=sides.filter(s=>q[s]>0).map(s=>`<b class="${s}">${sides.length>1?SIDE_SHORT[s]+' ':''}${fmtQ(q[s])}</b>`);
  return parts.join('<i>·</i>')+` <small>${esc(unit)}</small>`;
}

// ══════════════════════════════════════════
// 🏪 PROVEEDORES — pantalla principal
// ══════════════════════════════════════════
function xpRenderProveedores(){
  const list=$('providersNavList');
  if(!list)return;
  const t=xpTotals();
  const sum=$('pvSum');
  if(sum){
    sum.className='pv-sum'+(t.items?' has':'');
    sum.innerHTML=t.items
      ?`<span class="pv-sum-ico">🧺</span><span class="pv-sum-txt"><strong>${t.items} producto${t.items===1?'':'s'} · ₡${fmt(t.total)}</strong><small>${t.pending?`${t.pending} proveedor${t.pending===1?'':'es'} por enviar`:'Todo enviado ✓'}</small></span><span class="pv-sum-go">${t.pending?'Enviar':'Ver'} ›</span>`
      :`<span class="pv-sum-ico">👇</span><span class="pv-sum-txt"><strong>Elegí un proveedor</strong><small>y tocá los productos que necesitás</small></span>`;
  }
  const q=normalizeText($('pvSearch')?.value||'');
  const searching=!!q&&!XP.parsed.length;
  const names=getProvNames().filter(n=>!searching||normalizeText(n).includes(q));
  list.hidden=searching&&!names.length;
  list.innerHTML=(searching&&names.length?'<div class="pv-label">Proveedores</div>':'')+names.map(name=>{
    const n=hasData(name)?xpCount(name):0,sent=n&&isSent(name),tot=n?sideTotal(name):0;
    return `<button type="button" class="pv-card${n?(sent?' sent':' pending'):''}" data-prov="${esc(name)}">
      <span class="pv-av">${esc(name.charAt(0).toUpperCase())}</span>
      <span class="pv-name">${esc(name)}</span>
      <span class="pv-meta">${n?`${n} prod.${tot?' · ₡'+fmt(tot):''}`:'—'}</span>
      ${n?`<span class="pv-state">${sent?'✅ Enviado':'⚠️ Por enviar'}</span>`:''}
    </button>`;
  }).join('');
}
window.renderProveedoresNav=xpRenderProveedores;

// Búsqueda: productos de todos los proveedores. Si lo escrito trae
// cantidades ("10 tomate") se ofrece agregarlo directo al pedido.
function xpSearchRun(){
  const input=$('pvSearch');if(!input)return;
  const txt=input.value.trim();
  const res=$('pvResults');
  XP.parsed=[];
  if(!txt){res.innerHTML='';xpRenderParse();xpRenderProveedores();return;}
  const parsed=xpParse(txt,XP.branch);
  if(parsed.some(r=>r.explicit)){XP.parsed=parsed;res.innerHTML='';xpRenderParse();xpRenderProveedores();return;}
  xpRenderParse();
  const qt=xpTokens(txt),qn=normalizeText(txt);
  const groups=xpIndex().map(g=>({g,s:Math.max(groupScore(qt,g),g.key.includes(qn)?.5:0)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,15).map(x=>x.g);
  res.innerHTML=groups.length?`<div class="pv-label">Productos</div>`+groups.map(g=>{
    const offers=g.offers.slice().sort((a,b)=>(a.otros-b.otros)||((xpPrice(a)||Infinity)-(xpPrice(b)||Infinity)));
    return `<div class="pv-prod"><span class="pv-prod-e">${smartEmoji(offers[0].prod)}</span><span class="pv-prod-n">${esc(g.name)}</span>
      <span class="pv-offers">${offers.map(o=>{const pr=xpPrice(o),inq=xpHasQty(o.prov,o.prod.id);return `<button type="button" class="pv-offer${inq?' on':''}" data-prov="${esc(o.prov)}" data-pid="${esc(o.prod.id)}">${inq?'✓ ':''}${esc(o.prov)}${pr?` <small>₡${fmt(pr)}</small>`:''}</button>`;}).join('')}</span></div>`;
  }).join(''):'';
  xpRenderProveedores();
}
function xpRenderParse(){
  const el=$('pvParse');if(!el)return;
  const rows=XP.parsed;
  if(!rows.length){el.hidden=true;el.innerHTML='';return;}
  el.hidden=false;
  const ok=rows.filter(r=>r.group).length;
  const sides=activeOrderSides();
  el.innerHTML=`<div class="pv-parse-head">✨ Entendí <b>${ok}</b> producto${ok===1?'':'s'} — revisá y confirmá</div>
    ${rows.map((r,i)=>{
      if(!r.group)return `<div class="pv-pr bad"><span>❓</span><span class="pv-pr-n">“${esc(r.raw)}” <small>no está en el catálogo</small></span><button type="button" class="pv-pr-x" data-pa="rm" data-i="${i}" aria-label="Quitar">✕</button></div>`;
      const prod=xpProd(r.prov,r.pid)||r.group.offers[0].prod;
      const unit=normUnit(r.unit||prod.unit);
      const res=xpResolveSides(r.branch),bk=res.length>1?'both':res[0];
      return `<div class="pv-pr">
        <span>${smartEmoji(prod)}</span>
        <span class="pv-pr-n">${esc(r.group.name)}${r.note?` <small>📝 ${esc(r.note)}</small>`:''}</span>
        <input type="number" inputmode="decimal" min="0" step="0.5" value="${r.qty}" data-pf="qty" data-i="${i}" aria-label="Cantidad">
        <select data-pf="unit" data-i="${i}" aria-label="Unidad">${UNITS.map(u=>`<option${u===unit?' selected':''}>${u}</option>`).join('')}</select>
        ${sides.length>1?`<button type="button" class="pv-pr-b ${bk}" data-pa="branch" data-i="${i}">${bk==='both'?'Ambas':SIDE_NAME[bk]}</button>`:''}
        <select data-pf="prov" data-i="${i}" aria-label="Proveedor">${r.group.offers.map(o=>{const pr=xpPrice(o);return `<option value="${esc(o.prov)}|${esc(o.prod.id)}"${o.prov===r.prov?' selected':''}>${esc(o.prov)}${pr?' ₡'+fmt(pr):''}</option>`;}).join('')}</select>
        <button type="button" class="pv-pr-x" data-pa="rm" data-i="${i}" aria-label="Quitar">✕</button>
      </div>`;}).join('')}
    <div class="pv-parse-actions"><button type="button" class="pv-cancel" data-pa="clear">Cancelar</button>${ok?`<button type="button" class="pv-apply" data-pa="apply">✓ Agregar al pedido</button>`:''}</div>`;
}
function xpParseClick(e){
  const b=e.target.closest('[data-pa]');if(!b)return;
  const i=+b.dataset.i,act=b.dataset.pa;
  if(act==='clear'){$('pvSearch').value='';xpSearchRun();return;}
  if(act==='rm'){XP.parsed.splice(i,1);if(!XP.parsed.length){$('pvSearch').value='';xpSearchRun();}else xpRenderParse();return;}
  if(act==='branch'){
    const r=XP.parsed[i],order=['moravia','angeles','both'];
    const cur=xpResolveSides(r.branch),key=cur.length>1?'both':cur[0];
    r.branch=order[(order.indexOf(key)+1)%order.length];
    XP.branch=r.branch;
    xpRenderParse();return;
  }
  if(act==='apply'){
    const rows=XP.parsed.filter(r=>r.group&&r.qty>0);
    rows.forEach(r=>{
      const prod=xpProd(r.prov,r.pid);if(!prod)return;
      xpResolveSides(r.branch).forEach(side=>{
        xpSet(r.prov,r.pid,side,r.qty,normUnit(r.unit||prod.unit));
        if(r.note)syncProductNote(r.prov,prod,side,r.note);
      });
    });
    buzz([15,40,15]);
    toast(`✓ ${rows.length} producto${rows.length===1?'':'s'} agregado${rows.length===1?'':'s'} al pedido`,'ok');
    $('pvSearch').value='';xpSearchRun();xpRefresh();
  }
}
function xpParseChange(e){
  const f=e.target.closest('[data-pf]');if(!f)return;
  const r=XP.parsed[+f.dataset.i];if(!r)return;
  if(f.dataset.pf==='qty')r.qty=+f.value||0;
  if(f.dataset.pf==='unit')r.unit=f.value;
  if(f.dataset.pf==='prov'&&e.type==='change'){const [prov,pid]=f.value.split('|');r.prov=prov;r.pid=pid;}
}

// ── Dictado por voz ──
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let _rec=null;
function xpListen(){
  const input=$('pvSearch');
  if(!SR){toast('Este teléfono no permite dictar aquí: usá el 🎤 del teclado','err');input?.focus();return;}
  if(_rec){try{_rec.stop();}catch{}return;}
  const base=input.value.trim();
  const rec=new SR();
  rec.lang='es-CR';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;
  rec.onresult=e=>{
    let txt='';
    for(let i=0;i<e.results.length;i++)txt+=e.results[i][0].transcript;
    input.value=(base?base+', ':'')+txt;
  };
  rec.onerror=e=>{
    if(e.error==='not-allowed'||e.error==='service-not-allowed')toast('Permití el micrófono para poder dictar','err');
    else if(e.error==='no-speech')toast('No escuché nada, probá de nuevo','');
  };
  rec.onend=()=>{_rec=null;$('pvMic')?.classList.remove('rec');input.placeholder='Buscar producto o proveedor…';xpSearchRun();};
  try{rec.start();_rec=rec;$('pvMic')?.classList.add('rec');input.placeholder='🎙️ Escuchando… ej: “diez kilos de tomate”';buzz(20);}
  catch{_rec=null;}
}

// ══════════════════════════════════════════
// FICHA DEL PRODUCTO (se abre al tocar un producto)
// ══════════════════════════════════════════
function xpBuildOverlays(){
  if($('xpSheet'))return;
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="overlay xp-ov" id="xpSheet"><div class="modal xp-modal"><div class="modal-handle"></div><div id="xpSheetBody"></div></div></div>
    <div class="overlay xp-ov" id="xpChain"><div class="modal xp-modal"><div class="modal-handle"></div><div id="xpChainBody"></div></div></div>`;
  [...wrap.children].forEach(el=>document.body.appendChild(el));
  ['xpSheet','xpChain'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target.id===id&&Date.now()-($(id)._openedAt||0)>450)xpClose(id);}));
  $('xpSheetBody').addEventListener('click',xpSheetClick);
  $('xpSheetBody').addEventListener('input',xpSheetInput);
  $('xpSheetBody').addEventListener('change',xpSheetChange);
  $('xpChainBody').addEventListener('click',xpChainClick);
}
function xpSyncModalLock(){
  const open=!!document.querySelector('.overlay.open');
  document.documentElement.classList.toggle('modal-open',open);
  document.body.classList.toggle('modal-open',open);
}
function xpOpen(id){$(id)._openedAt=Date.now();$(id).classList.add('open');xpSyncModalLock();}
function xpClose(id){
  $(id).classList.remove('open');xpSyncModalLock();
  if(id==='xpSheet')XP.sheet=null;
  if(id==='xpChain')XP.chain=null;
  xpRefresh();
}
function xpLastQty(prov,pid){
  const h=xpHistFor(prov).find(e=>['moravia','angeles'].some(s=>+e.qtys?.[s]?.[pid]?.qty>0));
  if(!h)return'';
  const sides=activeOrderSides();
  const parts=sides.map(s=>+h.qtys?.[s]?.[pid]?.qty>0?`${sides.length>1?SIDE_SHORT[s]+' ':''}${fmtQ(+h.qtys[s][pid].qty)}`:'').filter(Boolean);
  const d=Math.round((Date.now()-new Date(h.date).getTime())/864e5);
  return parts.length?`${parts.join(' · ')} (${d<=0?'hoy':d===1?'ayer':'hace '+d+' días'})`:'';
}
function xpOpenSheet(prov,pid){
  if(!xpProd(prov,pid))return;
  xpBuildOverlays();
  XP.sheet={prov,pid};
  xpRenderSheet();
  xpOpen('xpSheet');
}
window.xpOpenSheet=xpOpenSheet;
// Tocar un producto en la pantalla del proveedor abre esta ficha.
window.openProdDetailModal=pid=>{if(S.currentProv)xpOpenSheet(S.currentProv,pid);};

function xpRenderSheet(){
  const st=XP.sheet;if(!st)return;
  const {prov,pid}=st;
  const prod=xpProd(prov,pid);
  if(!prod){xpClose('xpSheet');return;}
  const p=getPedido(prov),sides=activeOrderSides(),group=xpGroupOf(prod.name);
  const unit=normUnit(sides.map(s=>p.qtys[s]?.[pid]?.unit).find(Boolean)||prod.unit);
  const offers=(group?.offers||[{prov,prod}]).slice().sort((a,b)=>((a.otros?1:0)-(b.otros?1:0))||((xpPrice(a)||Infinity)-(xpPrice(b)||Infinity)));
  const prices=offers.map(xpPrice).filter(Boolean);
  const minP=prices.length>1?Math.min(...prices):0;
  const last=xpLastQty(prov,pid);
  const presets=unit==='kg'?[.5,1,2,3,5,10,15,20]:[1,2,3,4,5,6,10,12];
  $('xpSheetBody').innerHTML=`
    <div class="xs-head">
      <span class="xs-emoji">${smartEmoji(prod)}</span>
      <div class="xs-head-txt"><div class="xs-title">${esc(niceName(prod.name))}</div><div class="xs-sub">${esc(prov)}${last?' · Última vez: '+esc(last):''}</div></div>
      <button type="button" class="xs-x" data-xs="close" aria-label="Cerrar">✕</button>
    </div>
    ${sides.map(side=>{
      const q=p.qtys[side]?.[pid]?.qty||'';
      return `<div class="xs-side ${side}">
        <div class="xs-side-top"><span>${SIDE_ICO[side]} ${SIDE_NAME[side]}</span><small data-xs-sub="${side}"></small></div>
        <div class="xs-qty">
          <button type="button" data-xs="dec" data-side="${side}" aria-label="Restar">−</button>
          <input type="number" inputmode="decimal" min="0" step="0.5" value="${esc(q)}" placeholder="0" data-xs-q="${side}" aria-label="Cantidad ${SIDE_NAME[side]}">
          <button type="button" data-xs="inc" data-side="${side}" aria-label="Sumar">+</button>
        </div>
        <div class="xs-presets">${presets.map(v=>`<button type="button" data-xs="set" data-side="${side}" data-v="${v}">${fmtQ(v)}</button>`).join('')}</div>
        <input class="xs-note" data-xs-note="${side}" placeholder="📝 Nota para ${SIDE_NAME[side]} (opcional)" value="${esc(getProductNote(p,pid,side))}">
      </div>`;}).join('')}
    <div class="xs-grid">
      <label class="xs-field"><span>Unidad</span><select data-xs-unit>${UNITS.map(u=>`<option value="${u}"${u===unit?' selected':''}>${u}</option>`).join('')}</select></label>
      <label class="xs-field"><span>Precio ₡</span><input type="number" inputmode="decimal" min="0" data-xs-price value="${esc(getPrice(prov,pid))}" placeholder="0"></label>
      ${offers.length>1?`<label class="xs-field wide"><span>Pedírselo a</span><select data-xs-offer>${offers.map(o=>{const pr=xpPrice(o);return `<option value="${esc(o.prov)}|${esc(o.prod.id)}"${o.prov===prov&&o.prod.id===pid?' selected':''}>${esc(o.prov)}${pr?' · ₡'+fmt(pr):''}${minP&&pr===minP?' 💚 más barato':''}</option>`;}).join('')}</select></label>`:''}
    </div>
    <div class="xs-total" id="xsTotal"></div>
    <div class="xs-actions">
      ${sides.length>1?'<button type="button" data-xs="copy">⇄ Igual en ambas</button>':''}
      <button type="button" class="primary" data-xs="done">Listo ✓</button>
    </div>`;
  xpSheetTotals();
}
function xpSheetTotals(){
  const st=XP.sheet;if(!st)return;
  const price=+getPrice(st.prov,st.pid)||0;
  let total=0;
  activeOrderSides().forEach(side=>{
    const sub=xpQty(st.prov,st.pid,side)*price;total+=sub;
    const el=document.querySelector(`[data-xs-sub="${side}"]`);
    if(el)el.textContent=sub>0?'₡'+fmt(sub):'';
  });
  const el=$('xsTotal');
  if(el)el.innerHTML=total>0?`Subtotal <strong>₡${fmt(total)}</strong>`:'';
}
function xpSheetSetSide(side,val){
  const st=XP.sheet;
  xpSet(st.prov,st.pid,side,val);
  const inp=document.querySelector(`[data-xs-q="${side}"]`);
  const q=xpQty(st.prov,st.pid,side);
  if(inp)inp.value=q?String(q):'';
  xpSheetTotals();
}
function xpSheetClick(e){
  const b=e.target.closest('[data-xs]');if(!b||!XP.sheet)return;
  const st=XP.sheet,act=b.dataset.xs,side=b.dataset.side;
  if(act==='close'||act==='done'){xpClose('xpSheet');return;}
  if(act==='inc'||act==='dec'){
    const cur=xpQty(st.prov,st.pid,side);
    xpSheetSetSide(side,act==='inc'?(cur>0&&cur<1?1:cur+1):(cur>1?Math.ceil(cur)-1:0));
    buzz(8);return;
  }
  if(act==='set'){xpSheetSetSide(side,+b.dataset.v);buzz(8);return;}
  if(act==='copy'){xpSheetSetSide('angeles',xpQty(st.prov,st.pid,'moravia'));toast('Los Ángeles = Moravia','ok');}
}
function xpSheetInput(e){
  const st=XP.sheet;if(!st)return;
  const t=e.target;
  if(t.dataset.xsQ){xpSet(st.prov,st.pid,t.dataset.xsQ,t.value);xpSheetTotals();return;}
  if(t.hasAttribute('data-xs-price')){setPrice(st.prov,st.pid,t.value);updateProvTotals();persist();xpSheetTotals();return;}
  if(t.dataset.xsNote){const prod=xpProd(st.prov,st.pid);if(prod)syncProductNote(st.prov,prod,t.dataset.xsNote,t.value);}
}
function xpSheetChange(e){
  const st=XP.sheet;if(!st)return;
  const t=e.target;
  if(t.hasAttribute('data-xs-unit')){
    const u=t.value,p=getPedido(st.prov);
    if(st.prov!=='Otros'){
      ensureCustomProv(st.prov);
      const prod=(S.customProviders[st.prov].products||[]).find(x=>x.id===st.pid);
      if(prod)prod.unit=u;
    }
    activeOrderSides().forEach(s=>{const q=+p.qtys[s]?.[st.pid]?.qty||0;if(q>0)xpSet(st.prov,st.pid,s,q,u);});
    persist();
    return;
  }
  if(t.hasAttribute('data-xs-offer')){const [prov,pid]=t.value.split('|');xpMoveTo(prov,pid);}
}
// Pasa las cantidades (y notas) del producto a otro proveedor.
function xpMoveTo(newProv,newPid){
  const st=XP.sheet;
  if(!st||(st.prov===newProv&&st.pid===newPid))return;
  const fromProd=xpProd(st.prov,st.pid),toProd=xpProd(newProv,newPid);
  if(!fromProd||!toProd)return;
  const from=getPedido(st.prov);
  let moved=0;
  activeOrderSides().forEach(side=>{
    const v=from.qtys[side]?.[st.pid];
    const note=getProductNote(from,st.pid,side);
    if(v&&+v.qty>0){xpSet(newProv,newPid,side,+v.qty,v.unit);xpSet(st.prov,st.pid,side,0);moved++;}
    if(note){syncProductNote(newProv,toProd,side,note);syncProductNote(st.prov,fromProd,side,'');}
  });
  XP.sheet={prov:newProv,pid:newPid};
  xpRenderSheet();
  toast(moved?`↪ Ahora se lo pedís a ${newProv}`:`Proveedor: ${newProv}`,'ok');
}

// ══════════════════════════════════════════
// PANTALLA DEL PROVEEDOR — "lo de siempre"
// ══════════════════════════════════════════
function xpRenderProvSuggest(){
  const el=$('provSuggest');if(!el)return;
  const prov=S.currentProv;
  if(!prov||hasData(prov)){el.innerHTML='';return;}
  const sug=xpSuggestion(prov),last=xpHistFor(prov)[0];
  if(!sug&&!last){el.innerHTML='';return;}
  el.innerHTML=`<div class="pp-suggest">
    ${sug?`<button type="button" data-sug="sug">✨ Cargar lo de siempre</button>`:''}
    ${last?`<button type="button" data-sug="last">↺ Repetir último pedido <small>${new Date(last.date).toLocaleDateString('es-CR',{day:'numeric',month:'short'})}</small></button>`:''}
  </div>`;
}
function xpSugClick(e){
  const b=e.target.closest('[data-sug]');if(!b)return;
  const prov=S.currentProv;if(!prov)return;
  let n=0;
  if(b.dataset.sug==='last'){const last=xpHistFor(prov)[0];if(last)n=xpApplyQtys(prov,last.qtys);}
  else{const sug=xpSuggestion(prov);if(sug)n=xpApplyQtys(prov,sug.qtys);}
  toast(n?`✨ ${n} cantidad${n===1?'':'es'} cargada${n===1?'':'s'} — revisalas antes de enviar`:'No había nada para cargar',n?'ok':'');
  renderProdTable();updateProvTotals();updatePreview();renderProvStatus();xpRenderProvSuggest();
}

// ══════════════════════════════════════════
// 🧺 PEDIDO — revisar, enviar uno por uno, reiniciar e historial
// ══════════════════════════════════════════
function xpRenderPedido(){
  const body=$('pedidoBody');if(!body)return;
  const sides=activeOrderSides();
  const t=xpTotals(),all=calcScopedAllProvs();
  const provs=t.provs.slice().sort((a,b)=>(isSent(a)-isSent(b))||a.localeCompare(b,'es'));
  const fecha=new Date().toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'});
  let html=`<div class="pd-head"><h2>Pedido de mañana</h2><small>${esc(fecha)}${t.items?` · ${t.items} producto${t.items===1?'':'s'} · ${provs.length} proveedor${provs.length===1?'':'es'}`:''}</small></div>`;
  if(XP.undo&&Date.now()-XP.undo.at<120000){
    html+=`<div class="pd-undo">Pedido reiniciado. <button type="button" data-pd="undo">↩️ Deshacer</button></div>`;
  }
  if(!t.items){
    html+=`<div class="pd-empty"><div class="pd-empty-ico">🧺</div><strong>Todavía no hay nada pedido</strong><p>Entrá a un proveedor y tocá sus productos.</p><button type="button" class="pd-primary" data-pd="go">🏪 Ir a proveedores</button></div>`;
  }else{
    html+=`<div class="pd-totals">
      <div class="pd-total main"><span>Total</span><strong>₡${fmt(all.total)}</strong></div>
      ${sides.length>1?sides.map(s=>`<div class="pd-total ${s}"><span>${SIDE_NAME[s]}</span><strong>₡${fmt(all[s])}</strong></div>`).join(''):''}
    </div>`;
    html+=t.pending
      ?`<button type="button" class="pd-chain" data-pd="chain">⛓️ Enviar uno por uno <small>${t.pending} proveedor${t.pending===1?'':'es'} · te guío paso a paso</small></button>
        <div class="pd-row"><button type="button" data-pd="allone">📤 Todo en 1 mensaje</button><button type="button" data-pd="lista">📋 Lista a contactos</button></div>`
      :`<div class="pd-done">🎉 ¡Todo enviado! <button type="button" data-pd="lista">📋 Lista a contactos</button></div>`;
    html+=provs.map(prov=>{
      const {lines,extras}=xpProvLines(prov),sent=isSent(prov),tot=sideTotal(prov);
      return `<section class="pd-prov${sent?' sent':''}">
        <header data-pd="open" data-prov="${esc(prov)}"><span class="pv-av">${esc(prov.charAt(0).toUpperCase())}</span><div><strong>${esc(prov)}</strong><small>${sent?'✅ Enviado':'⚠️ Por enviar'} · ${lines.length+extras.length} producto${lines.length+extras.length===1?'':'s'}</small></div><b>${tot?'₡'+fmt(tot):''}</b></header>
        <div class="pd-lines">
          ${lines.map(l=>`<button type="button" class="pd-line" data-pd="line" data-prov="${esc(prov)}" data-pid="${esc(l.prod.id)}"><span class="e">${smartEmoji(l.prod)}</span><span class="n">${esc(niceName(l.prod.name))}</span><span class="q">${xpQtyLabel(l.q,l.unit)}</span></button>`).join('')}
          ${extras.map(x=>`<div class="pd-line"><span class="e">➕</span><span class="n">${esc(x.name||'Extra')}</span><span class="q"><b class="${x.side}">${sides.length>1?SIDE_SHORT[x.side]+' ':''}${fmtQ(+x.qty)}</b> <small>${esc(x.unit||'kg')}</small></span></div>`).join('')}
        </div>
        <footer>
          <button type="button" class="wa" data-pd="send" data-prov="${esc(prov)}">💬 ${sent?'Reenviar':'Enviar'}</button>
          <button type="button" data-pd="open" data-prov="${esc(prov)}">✏️ Editar</button>
        </footer>
      </section>`;}).join('');
  }
  if(t.items)html+=`<button type="button" class="pd-reset" data-pd="reset">🗑️ Reiniciar pedido${sides.length===1?' de '+SIDE_NAME[sides[0]]:''}</button>`;
  html+=xpHistoryHtml();
  body.innerHTML=html;
}
function xpHistoryHtml(){
  const today=new Date().toISOString().slice(0,10);
  const byDate={};
  Object.values(typeof historicoCache==='object'&&historicoCache?historicoCache:{}).forEach(row=>{
    if(!row?.fecha||row.fecha===today)return;
    const d=byDate[row.fecha]||(byDate[row.fecha]={fecha:row.fecha,moravia:0,angeles:0,total:0});
    d.moravia+=+row.total_moravia||0;d.angeles+=+row.total_angeles||0;d.total+=+row.total||0;
  });
  const days=Object.values(byDate).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,14);
  if(!days.length)return'';
  return `<details class="pd-hist"><summary>📅 Días anteriores</summary>${days.map(d=>`<div class="pd-hist-row"><span>${new Date(d.fecha+'T00:00:00').toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'})}</span><small>M ₡${fmt(d.moravia)} · LA ₡${fmt(d.angeles)}</small><b>₡${fmt(d.total)}</b></div>`).join('')}</details>`;
}
function xpPedidoClick(e){
  const b=e.target.closest('[data-pd]');if(!b)return;
  const act=b.dataset.pd,prov=b.dataset.prov;
  if(act==='go')return switchView('proveedores');
  if(act==='line')return xpOpenSheet(prov,b.dataset.pid);
  if(act==='open')return openProv(prov);
  if(act==='send'){if(!buildMsg(prov,'both')){toast('El pedido está vacío','err');return;}S.currentProv=prov;sendWA('both');setTimeout(xpRefresh,250);return;}
  if(act==='chain')return xpStartChain();
  if(act==='allone'){sendAllPendingWA();setTimeout(xpRefresh,250);return;}
  if(act==='lista')return sendListaWA();
  if(act==='reset')return xpResetPedido();
  if(act==='undo')return xpUndoReset();
}

// Reiniciar SOLO el pedido (cantidades, extras, notas y "enviado").
// Proveedores, productos, precios, teléfonos e histórico no se tocan.
function xpResetPedido(){
  const sides=activeOrderSides();
  const label=sides.length>1?'Moravia y Los Ángeles':SIDE_NAME[sides[0]];
  if(!confirm(`¿Reiniciar el pedido de ${label}?\n\nSe borran las cantidades de todos los proveedores en TODOS los teléfonos.\nProveedores, precios e historial no se tocan.`))return;
  XP.undo={at:Date.now(),data:JSON.parse(JSON.stringify(S.pedidos)),sides};
  Object.keys(S.pedidos).forEach(prov=>{
    const p=getPedido(prov);
    sides.forEach(side=>{
      p.qtys[side]={};p.extras[side]=[];
      Object.keys(p.notes).forEach(k=>{
        if(k.endsWith('__'+side)||k==='__note_'+side)delete p.notes[k];
        else if(side==='moravia'&&!k.startsWith('__')&&!k.includes('__'))delete p.notes[k];
      });
      if(side==='moravia')p.note='';
      markUnsent(prov,side);
    });
  });
  S.createSelection={};
  persist();
  toast('🗑️ Pedido reiniciado','ok');
  xpRefresh();
}
function xpUndoReset(){
  const u=XP.undo;if(!u)return;
  Object.entries(u.data).forEach(([prov,old])=>{
    const p=getPedido(prov);
    u.sides.forEach(side=>{p.qtys[side]=old.qtys?.[side]||{};p.extras[side]=old.extras?.[side]||[];});
    p.notes={...p.notes,...(old.notes||{})};
    if(u.sides.includes('moravia'))p.note=old.note||'';
    p.sentByBranch={...(old.sentByBranch||sentFlags(old))};
    p.sent=!!p.sentByBranch.moravia&&!!p.sentByBranch.angeles;
    p.notes.__sentByBranch={...p.sentByBranch};
    markProvDirty(prov);
  });
  XP.undo=null;
  persist();
  toast('↩️ Pedido recuperado','ok');
  xpRefresh();
}

// ── Enviar uno por uno ──
function xpStartChain(){
  const queue=getProvNames().filter(p=>hasData(p)&&!isSent(p));
  if(!queue.length){toast('No hay pedidos pendientes','err');return;}
  xpBuildOverlays();
  XP.chain={queue,i:0,sentNow:false,sentCount:0};
  xpRenderChain();
  xpOpen('xpChain');
}
function xpRenderChain(){
  const ch=XP.chain,body=$('xpChainBody');if(!ch||!body)return;
  if(ch.i>=ch.queue.length){
    body.innerHTML=`<div class="xc-finish"><div class="xc-big">🎉</div><strong>¡Listo! ${ch.sentCount} pedido${ch.sentCount===1?'':'s'} enviado${ch.sentCount===1?'':'s'}</strong><p>Quedaron marcados como enviados en todos los teléfonos.</p>
      <button type="button" class="pd-primary" data-xc="lista">📋 Mandar la lista del día a contactos</button>
      <button type="button" class="pd-ghost" data-xc="close">Cerrar</button></div>`;
    return;
  }
  const prov=ch.queue[ch.i];
  const contacts=(S.waContacts?.[prov]||[]).map(normalizeCostaRicaPhone).filter(Boolean);
  body.innerHTML=`
    <div class="xc-top"><span>Proveedor ${ch.i+1} de ${ch.queue.length}</span><button type="button" class="xs-x" data-xc="close" aria-label="Cerrar">✕</button></div>
    <div class="xc-dots">${ch.queue.map((p,i)=>`<span class="${i<ch.i?'done':i===ch.i?'cur':''}"></span>`).join('')}</div>
    <div class="xc-prov"><span class="pv-av big">${esc(prov.charAt(0).toUpperCase())}</span><div><strong>${esc(prov)}</strong><small>${contacts.length?contacts.length+' número'+(contacts.length===1?'':'s')+' de WhatsApp':'Sin número: elegís el chat en WhatsApp'} · ₡${fmt(sideTotal(prov))}</small></div></div>
    <pre class="xc-msg">${esc(buildMsg(prov,'both'))}</pre>
    ${ch.sentNow
      ?`<button type="button" class="xc-next" data-xc="next">✓ Enviado · Siguiente ›</button><button type="button" class="pd-ghost" data-xc="resend">Volver a abrir WhatsApp</button>`
      :`<button type="button" class="wa-btn" data-xc="send">💬 Enviar a ${esc(prov)}</button><div class="xc-row"><button type="button" data-xc="edit">✏️ Editar</button><button type="button" data-xc="skip">Saltar ›</button></div>`}`;
}
function xpChainClick(e){
  const b=e.target.closest('[data-xc]');if(!b||!XP.chain)return;
  const ch=XP.chain,act=b.dataset.xc,prov=ch.queue[ch.i];
  if(act==='close')return xpClose('xpChain');
  if(act==='send'||act==='resend'){
    S.currentProv=prov;sendWA('both');
    if(!ch.sentNow)ch.sentCount++;
    ch.sentNow=true;ch.awaitReturn=true;
    xpRenderChain();return;
  }
  if(act==='next'||act==='skip'){ch.i++;ch.sentNow=false;ch.awaitReturn=false;xpRenderChain();return;}
  if(act==='edit'){xpClose('xpChain');openProv(prov);return;}
  if(act==='lista')sendListaWA();
}
// Al volver de WhatsApp, pasa solo al siguiente proveedor.
document.addEventListener('visibilitychange',()=>{
  const ch=XP.chain;
  if(document.visibilityState!=='visible'||!ch||!ch.awaitReturn)return;
  ch.awaitReturn=false;
  setTimeout(()=>{if(XP.chain===ch&&ch.sentNow){ch.i++;ch.sentNow=false;xpRenderChain();buzz(15);}},450);
});

// ══════════════════════════════════════════
// REFRESCO Y NAVEGACIÓN
// ══════════════════════════════════════════
function xpRenderBadge(){
  const b=$('navPedidoBadge');if(!b)return;
  const n=getProvNames().filter(p=>hasData(p)&&!isSent(p)).length;
  b.hidden=!n;b.textContent=n;
}
let _refreshFrame=0;
function xpRefresh(){
  cancelAnimationFrame(_refreshFrame);
  _refreshFrame=requestAnimationFrame(()=>{
    XP.usage=null;
    xpRenderBadge();
    if($('view-proveedores')?.classList.contains('active')){
      if(XP.parsed.length)xpRenderParse();
      else if($('pvSearch')?.value.trim())xpSearchRun();
      else xpRenderProveedores();
    }
    if($('view-pedido')?.classList.contains('active'))xpRenderPedido();
    if($('view-prov')?.classList.contains('active')&&S.currentProv){renderProdTable();updateProvTotals();updatePreview();renderProvStatus();xpRenderProvSuggest();}
  });
}
window.xpRefresh=xpRefresh;

function wrap(name,after){
  const orig=window[name];
  if(typeof orig!=='function')return;
  window[name]=function(){const r=orig.apply(this,arguments);try{after.apply(this,arguments);}catch(err){console.warn('[aramo]',err);}return r;};
}
// Las pantallas viejas (Inicio, Hoy, Pedir) se unificaron en Proveedores y Pedido.
const VIEW_MAP={home:'proveedores',express:'proveedores',resumen:'pedido',mercado:'pedido'};
const _switchView=window.switchView;
window.switchView=function(name){
  name=VIEW_MAP[name]||name;
  _switchView(name);
  window.scrollTo(0,0);
  if(name==='pedido')xpRenderPedido();
  if(name==='proveedores')xpRenderProveedores();
  xpRenderBadge();
};
wrap('renderHome',()=>xpRefresh());
wrap('chooseOrderScope',()=>xpRefresh());
wrap('openProv',()=>xpRenderProvSuggest());

// ── Enlaces de eventos ──
$('pvSum')?.addEventListener('click',()=>{if(xpTotals().items)switchView('pedido');});
$('providersNavList')?.addEventListener('click',e=>{const c=e.target.closest('[data-prov]');if(c)openProv(c.dataset.prov);});
$('pvResults')?.addEventListener('click',e=>{const o=e.target.closest('.pv-offer');if(o)xpOpenSheet(o.dataset.prov,o.dataset.pid);});
let _st=0;
$('pvSearch')?.addEventListener('input',()=>{clearTimeout(_st);_st=setTimeout(xpSearchRun,220);});
$('pvSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(_st);xpSearchRun();e.target.blur();}});
$('pvMic')?.addEventListener('click',xpListen);
$('pvParse')?.addEventListener('click',xpParseClick);
$('pvParse')?.addEventListener('input',xpParseChange);
$('pvParse')?.addEventListener('change',xpParseChange);
$('provSuggest')?.addEventListener('click',xpSugClick);
$('pedidoBody')?.addEventListener('click',xpPedidoClick);

// Arranque
xpBuildOverlays();
const active=document.querySelector('.view.active')?.id?.replace('view-','');
if(!active||VIEW_MAP[active])switchView(VIEW_MAP[active]||'proveedores');
else{xpRenderProveedores();xpRenderBadge();}
})();
