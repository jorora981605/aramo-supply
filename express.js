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
  _idx=[...map.values()].sort((a,b)=>ORDEN_ES(a.name,b.name));
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
    return ORDEN_ES(a.prov,b.prov);
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
// ✨ LO DE SIEMPRE PARA TODO EL PEDIDO — aprende del día de la semana
// ══════════════════════════════════════════
// Cada envío deja en la nube lo que se pidió de cada producto (historico_diario.detalle, ver
// pushHistoricoToSupabase). Con eso, más lo que guarda este teléfono (aramo_hist), se arma el pedido
// de hoy con lo que se suele pedir ESTE día de la semana: solo a los proveedores que se piden ese día
// y solo donde no hay nada escrito. Mientras no haya historia de ese día, propone lo de la última vez.
// La jornada empieza a las 6 a. m.: un pedido mandado a la 1 de la madrugada cuenta para la noche anterior.
const AU={nube:[],nubeT:0,cargando:null,cache:null};
// APAGADO (2026-11-26, pedido del dueño): "Lo de siempre" ya no sale en ninguna pantalla ni trabaja solo.
// El código y lo guardado (historial en la nube y en el teléfono) quedan intactos por si se vuelve a querer.
const AU_ACTIVO=false;
const AU_DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const auJornada=t=>new Date(+t-6*3600e3);
const auDiaTxt=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const auHoySem=()=>auJornada(Date.now()).getDay();
function auDeNube(r){
  const d=r?.detalle;if(!d||!(+d.t>0)||!d.q)return null;
  const qtys={moravia:{},angeles:{}};
  ['moravia','angeles'].forEach(s=>Object.entries(d.q[s]||{}).forEach(([pid,v])=>{if(Array.isArray(v)&&+v[0]>0)qtys[s][pid]={qty:+v[0],unit:v[1]||''};}));
  return{provider:r.proveedor,t:+d.t,qtys};
}
// Pide a la nube solo los días que sirven: el mismo día de la semana de las últimas 5 semanas y los
// últimos 4 días (la fecha de la nube va en hora UTC, así que también se pide el día siguiente).
function auCargar(){
  if(!AU_ACTIVO)return;   // apagado: tampoco pide el historial a la nube
  if(AU.cargando||Date.now()-AU.nubeT<20*60e3||typeof supa==='undefined')return AU.cargando;
  const hoy=auJornada(Date.now()),fechas=new Set(),agregar=(base,dias)=>{const d=new Date(base);d.setDate(d.getDate()+dias);fechas.add(auDiaTxt(d));};
  for(let w=1;w<=5;w++){agregar(hoy,-7*w);agregar(hoy,-7*w+1);}
  for(let k=0;k<=4;k++)agregar(hoy,-k+1);
  const antes=auPendientes().lista.length;
  AU.cargando=Promise.resolve().then(()=>supa.from('historico_diario').select('proveedor,detalle').in('fecha',[...fechas]).not('detalle','is',null).limit(1500))
    .then(({data,error})=>{if(error)throw error;AU.nube=(data||[]).map(auDeNube).filter(Boolean);AU.cache=null;})
    .catch(e=>console.warn('Lo de siempre: sin historial de la nube todavía',e?.message||e)) // sin la columna nueva sigue con lo del teléfono
    .finally(()=>{AU.nubeT=Date.now();AU.cargando=null;if(auPendientes().lista.length!==antes)sxRenderTablero();});
  return AU.cargando;
}
// Un pedido por proveedor y por jornada (el último que se mandó), del más nuevo al más viejo. Sin la jornada de hoy.
function auHistoria(){
  const hoy=auDiaTxt(auJornada(Date.now())),loc=histGet(),key=AU.nubeT+'|'+AU.nube.length+'|'+(loc[0]?.id||'')+'|'+loc.length+'|'+hoy;
  if(AU.cache?.key===key)return AU.cache.porProv;
  const mejor=new Map();
  const meter=e=>{
    if(!e?.provider||!(e.t>0))return;
    const j=auJornada(e.t),dia=auDiaTxt(j);if(dia===hoy)return;
    const k=e.provider+'|'+dia,y=mejor.get(k);
    if(!y||e.t>y.t)mejor.set(k,{provider:e.provider,t:e.t,qtys:e.qtys||{},sem:j.getDay()});
  };
  AU.nube.forEach(meter);
  loc.forEach(h=>meter({provider:h.provider,t:Date.parse(h.date),qtys:h.qtys}));
  const porProv={};
  mejor.forEach(e=>{(porProv[e.provider]=porProv[e.provider]||[]).push(e);});
  Object.values(porProv).forEach(a=>a.sort((x,y)=>y.t-x.t));
  AU.cache={key,porProv};
  return porProv;
}
// Lo de siempre de un proveedor: las últimas (hasta 4) veces que se le pidió este día de la semana.
// Un producto entra si salió en al menos la mitad de esas veces; la cantidad es la del medio.
function auSugerir(prov,hist){
  const sem=auHoySem(),hace=Date.now()-36*864e5;
  const veces=(hist[prov]||[]).filter(e=>e.sem===sem&&e.t>hace).slice(0,4);
  if(!veces.length)return null;
  const need=Math.max(1,Math.ceil(veces.length/2)),qtys={moravia:{},angeles:{}};let n=0;
  ['moravia','angeles'].forEach(s=>{
    const vals={};
    veces.forEach(e=>Object.entries(e.qtys?.[s]||{}).forEach(([pid,v])=>{if(+v?.qty>0)(vals[pid]=vals[pid]||[]).push({q:+v.qty,u:v.unit});}));
    Object.entries(vals).forEach(([pid,arr])=>{if(arr.length<need)return;const qs=arr.map(a=>a.q).sort((a,b)=>a-b);qtys[s][pid]={qty:qs[Math.floor(qs.length/2)],unit:arr[0].u};n++;});
  });
  return n?{qtys,veces:veces.length,t:veces[0].t}:null;
}
// Mientras no haya historia de este día de la semana: lo de la última vez (de los últimos 4 días).
function auUltimo(prov,hist){
  const e=(hist[prov]||[])[0];
  return e&&Date.now()-e.t<4*864e5?{qtys:e.qtys,veces:1,t:e.t}:null;
}
// Proveedores con algo que proponer en una tienda que todavía no tiene nada escrito.
function auPendientes(){
  const hist=auHistoria(),sides=activeOrderSides(),provs=getProvNames();
  const modo=provs.some(p=>auSugerir(p,hist))?'semana':'ultimo',lista=[];
  provs.forEach(prov=>{
    const sug=modo==='semana'?auSugerir(prov,hist):auUltimo(prov,hist);if(!sug)return;
    const ids=new Set((getAllProviders()[prov]?.products||[]).map(x=>x.id)),porLado={};let n=0;
    sides.forEach(s=>{
      if(pedidoTieneLado(S.pedidos[prov],s))return;   // lo que ya está escrito no se toca
      const pids=Object.keys(sug.qtys[s]||{}).filter(pid=>ids.has(pid));
      if(pids.length){porLado[s]=pids;n+=pids.length;}
    });
    if(n)lista.push({prov,sug,porLado,n});
  });
  return{modo,lista};
}
function auTextoDia(modo){return modo==='semana'?`lo que se suele pedir los ${AU_DIAS[auHoySem()]}`:'lo que pediste la última vez';}
function auBoton(vacio){
  if(!AU_ACTIVO)return'';
  auCargar();
  const r=auPendientes();if(!r.lista.length)return'';
  const k=r.lista.length,sub=`${plural(k,'proveedor','proveedores')} · ${auTextoDia(r.modo)}`;
  return `<button type="button" class="sx-pdf-btn au-btn${vacio?' grande':''}" data-sx-siempre><span class="sx-pdf-i">${ico('estrella')}</span><span class="sx-pdf-t"><b>${vacio?'Armar el pedido con lo de siempre':`Falta lo de siempre de ${plural(k,'proveedor','proveedores')}`}</b><small>${esc(vacio?sub:capital(auTextoDia(r.modo)))}</small></span><span class="sx-pdf-f" aria-hidden="true">›</span></button>`;
}
function auAbrir(){
  if(!AU_ACTIVO)return;
  const {modo,lista}=auPendientes();
  if(!lista.length){AramoUI.aviso('No hay nada que proponer: ya está todo escrito',{tipo:'info'});return;}
  const sides=activeOrderSides(),dos=sides.length>1;
  const h=AramoUI.hoja({titulo:'Lo de siempre',sub:capital(auTextoDia(modo)),clase:'au-hoja',foco:'titulo'});
  const nombres=(prov,pids)=>pids.map(pid=>niceName(xpProd(prov,pid)?.name||pid)).join(', ');
  const cuando=t=>new Date(t).toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'}).replace(',','');
  const dia=AU_DIAS[auHoySem()],dias=/s$/.test(dia)?dia:dia+'s';   // los lunes, los sábados
  const deDonde=s=>s.veces>1?`Sale de ${s.veces} ${dias} · el último fue el ${cuando(s.t)}`:capital(cuando(s.t));
  h.cuerpo.innerHTML=`<p class="au-ayuda">Se llena solo donde no hay nada escrito. Después lo revisás y lo enviás como siempre.</p>
    <ul class="au-lista">${lista.map((x,i)=>`<li><label class="au-fila" style="--c:${sxColor(x.prov)}">
      <input type="checkbox" checked data-au="${i}"><span class="ui-casilla-caja" aria-hidden="true">${ico('ok')}</span>
      <span class="sx-av" aria-hidden="true">${esc(x.prov.charAt(0).toUpperCase())}</span>
      <span class="au-t"><b>${esc(x.prov)}</b>${sides.filter(s=>x.porLado[s]).map(s=>`<small class="${s}">${dos?SIDE_ICO[s]+' ':''}${esc(nombres(x.prov,x.porLado[s]))}</small>`).join('')}<small class="au-cuando">${esc(deDonde(x.sug))}</small></span>
    </label></li>`).join('')}</ul>`;
  const no=document.createElement('button');no.type='button';no.className='ui-btn ui-btn--secundario ui-btn--l';no.textContent='Cancelar';
  const si=document.createElement('button');si.type='button';si.className='ui-btn ui-btn--primario ui-btn--l ui-crece';
  const contar=()=>{const k=h.cuerpo.querySelectorAll('[data-au]:checked').length;si.textContent=k?`Poner ${plural(k,'pedido','pedidos')}`:'Elegí al menos uno';si.disabled=!k;};
  h.cuerpo.addEventListener('change',contar);contar();
  no.addEventListener('click',()=>h.cerrar());
  si.addEventListener('click',()=>{const sel=[...h.cuerpo.querySelectorAll('[data-au]:checked')].map(c=>lista[+c.dataset.au]);h.cerrar();auPoner(sel);});
  h.pie.appendChild(no);h.pie.appendChild(si);
}
function auPoner(sel){
  const antes={},nuevos=[];let n=0;
  sel.forEach(({prov,sug,porLado})=>{
    const p=getPedido(prov),prods=new Map((getAllProviders()[prov]?.products||[]).map(x=>[x.id,x]));
    Object.entries(porLado).forEach(([s,pids])=>{
      if(pedidoTieneLado(p,s))return;
      let cambio=false;
      pids.forEach(pid=>{
        const prod=prods.get(pid),v=sug.qtys[s]?.[pid];if(!prod||!(+v?.qty>0))return;
        if(!antes[prov])antes[prov]=JSON.parse(JSON.stringify(p));
        if(!p.qtys[s])p.qtys[s]={};
        p.qtys[s][pid]={qty:String(+(+v.qty).toFixed(2)),unit:normUnit(v.unit||prod.unit)};
        S.createSelection=S.createSelection||{};
        if(!S.createSelection[pid]){S.createSelection[pid]={prov};nuevos.push(pid);}
        n++;cambio=true;
      });
      if(cambio)markUnsent(prov,s);
    });
  });
  const provs=Object.keys(antes);
  if(!provs.length){AramoUI.aviso('No había nada para poner',{tipo:'info'});return;}
  persist();xpRefresh();buzz(12);
  AramoUI.aviso(`✓ ${plural(provs.length,'pedido','pedidos')} con lo de siempre (${plural(n,'producto','productos')}). Revisalos antes de enviar.`,{ms:9000,deshacer:()=>{
    provs.forEach(prov=>{S.pedidos[prov]=antes[prov];markProvDirty(prov);});
    nuevos.forEach(pid=>{if(S.createSelection?.[pid])delete S.createSelection[pid];});
    persist();xpRefresh();AramoUI.aviso('Listo, quedó como estaba',{tipo:'info'});
  }});
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
  const tools=$('inventoryTools');if(tools)tools.hidden=false;
  const ciTop=$('ciTop');if(ciTop)ciTop.innerHTML=ciMostrar()?ciBarra():'';
  const history=$('surtidoHistory');if(history)history.innerHTML=xpHistoryHtml();
  const notice=$('inventoryResetNotice');
  if(notice)notice.innerHTML=XP.undo&&Date.now()-XP.undo.at<120000?`<div class="pd-undo">Pedido reiniciado. <button type="button" data-inventory-undo>Deshacer</button></div>`:'';
  const q=normalizeText($('pvSearch')?.value||'');
  const searching=!!q&&!XP.parsed.length;
  const names=getProvNames().filter(n=>!searching||normalizeText(n).includes(q));
  list.hidden=searching&&!names.length;
  list.innerHTML=(searching&&names.length?'<div class="pv-label">Proveedores</div>':'')+names.map(name=>{
    return `<div class="pv-item"><button type="button" class="pv-card" data-prov="${esc(name)}">
      <span class="pv-av">${esc(name.charAt(0).toUpperCase())}</span>
      <span class="pv-name">${esc(name)}</span>
    </button><button type="button" class="pv-edit" data-edit="${esc(name)}" aria-label="Editar ${esc(name)}" title="Editar nombre, WhatsApp y productos">✎</button></div>`;
  }).join('');
  sxMarcarBusqueda(); // también cuando el buscador se limpia solo
}
window.renderProveedoresNav=xpRenderProveedores;
// El buscador avisa con clases (en vez de :has(), que obliga a revisar estilos en cada cambio).
function sxMarcarBusqueda(){const i=$('pvSearch'),w=i?.closest('.pv-wrap');if(!w)return;const txt=!!i.value.trim();w.classList.toggle('sx-con-texto',txt);w.classList.toggle('sx-buscando',txt||document.activeElement===i);}
['input','focus','blur'].forEach(ev=>$('pvSearch')?.addEventListener(ev,sxMarcarBusqueda));

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
  XP.sheet={prov,pid,buf:{}};
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
          <input type="text" inputmode="decimal" value="${esc(q)}" placeholder="0" data-xs-q="${side}" aria-label="Cantidad ${SIDE_NAME[side]}" autocomplete="off">
          <button type="button" data-xs="inc" data-side="${side}" aria-label="Sumar">+</button>
        </div>
        <div class="xs-pad" role="group" aria-label="Teclado de cantidad">${['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>`<button type="button" data-xs="key" data-side="${side}" data-k="${k}"${k==='⌫'?' aria-label="Borrar"':''}>${k==='.'?',':k}</button>`).join('')}</div>
        <input class="xs-note" data-xs-note="${side}" placeholder="📝 Nota para ${SIDE_NAME[side]} (opcional)" value="${esc(getProductNote(p,pid,side))}">
      </div>`;}).join('')}
    <div class="xs-grid">
      <div class="xs-field wide"><span>Unidad</span><div class="seg-unit" role="group" aria-label="Unidad">${UNITS.map(u=>`<button type="button" data-xs="unit" data-u="${u}" class="${u===unit?'on':''}">${u==='unidad'?'Unidad':u==='caja'?'Caja':'Kg'}</button>`).join('')}</div></div>
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
  // Teclado: tocar 3 y luego 4 arma 34. El primer toque reemplaza lo que había.
  if(act==='key'){
    const k=b.dataset.k,buf=st.buf||(st.buf={});
    let v=buf[side]??'';
    if(k==='⌫')v=(buf[side]==null?String(xpQty(st.prov,st.pid,side)||''):v).slice(0,-1);
    else if(k==='.'){if(!v.includes('.'))v=(v||'0')+'.';}
    else if(v.replace('.','').length<5)v=(v==='0'?'':v)+k;
    buf[side]=v;
    xpSheetSetSide(side,parseFloat(v)||0);
    const inp=document.querySelector(`[data-xs-q="${side}"]`);if(inp)inp.value=v.replace('.',',');
    buzz(6);return;
  }
  if(act==='unit')return xpSetUnit(b.dataset.u);
  if(act==='inc'||act==='dec'){
    if(st.buf)st.buf[side]=null;
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
  if(t.dataset.xsQ){if(st.buf)st.buf[t.dataset.xsQ]=null;xpSet(st.prov,st.pid,t.dataset.xsQ,String(t.value).replace(',','.'));xpSheetTotals();return;}
  if(t.hasAttribute('data-xs-price')){setPrice(st.prov,st.pid,t.value);updateProvTotals();persist();xpSheetTotals();return;}
  if(t.dataset.xsNote){const prod=xpProd(st.prov,st.pid);if(prod)syncProductNote(st.prov,prod,t.dataset.xsNote,t.value);}
}
function xpSheetChange(e){
  const st=XP.sheet;if(!st)return;
  const t=e.target;
  if(t.hasAttribute('data-xs-offer')){const [prov,pid]=t.value.split('|');xpMoveTo(prov,pid);}
}
// Unidad del producto (kg, unidad o caja): un toque y queda.
function xpSetUnit(u){
  const st=XP.sheet;if(!st)return;
  const p=getPedido(st.prov);
  if(st.prov!=='Otros'){
    ensureCustomProv(st.prov);
    const prod=(S.customProviders[st.prov].products||[]).find(x=>x.id===st.pid);
    if(prod)prod.unit=u;
  }
  activeOrderSides().forEach(s=>{const q=+p.qtys[s]?.[st.pid]?.qty||0;if(q>0)xpSet(st.prov,st.pid,s,q,u);});
  persist();
  document.querySelectorAll('#xpSheetBody [data-xs="unit"]').forEach(x=>x.classList.toggle('on',x.dataset.u===u));
  buzz(6);
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
  XP.sheet={prov:newProv,pid:newPid,buf:{}};
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
  const last=xpHistFor(prov)[0];   // "Cargar lo de siempre" (xpSuggestion) apagado junto con el resto de Lo de siempre
  if(!last){el.innerHTML='';return;}
  el.innerHTML=`<div class="pp-suggest">
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
// Pedido de mañana: arriba un tablero con lo importante (total, productos, por enviar y cada
// tienda) y abajo una tarjeta por proveedor con sus productos en mosaicos chicos. Cada mosaico
// muestra las dos cantidades con el color de su tienda (verde Moravia, naranja Los Ángeles).
// Tocar un mosaico abre el producto para cambiar la cantidad; los botones hacen lo de siempre.
let _pdFiltro='todos',_pdEntrar=true,_pdNums={},_pdT=0;
const capital=s=>String(s||'').charAt(0).toUpperCase()+String(s||'').slice(1);
const plural=(n,a,b)=>n+' '+(n===1?a:b);
// Íconos dibujados (se ven nítidos en cualquier teléfono, a diferencia de los emojis en botones).
const PDX_ICO={
  enviar:'<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  mensaje:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  lista:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  lapiz:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  flecha:'<path d="M5 12h14M13 5l7 7-7 7"/>',
  listo:'<path d="M20 6 9 17l-5-5"/>',
  reloj:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  canasta:'<path d="M5 10h14l-1.5 9a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7z"/><path d="m9 10 3-6 3 6"/>',
  mover:'<path d="M17 4l3 3-3 3"/><path d="M20 7H8"/><path d="M7 20l-3-3 3-3"/><path d="M4 17h12"/>',
  reiniciar:'<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/>',
  hoja:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  bajar:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  recibo:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
};
// Un solo juego de íconos (iconos.js). Estos son los nombres de antes → los de ahora.
const PDX_A={lapiz:'editar',listo:'ok',hoja:'pdf',bajar:'descargar'};
const ico=(k,cls='')=>window.icono?window.icono(PDX_A[k]||k,{t:18,clase:'pdx-i'+(cls?' '+cls:'')}):`<svg class="pdx-i${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true">${PDX_ICO[k]}</svg>`;
const PDX_COLORES=['#0f766e','#7c3aed','#c2410c','#0369a1','#be185d','#4d7c0f','#a16207','#4338ca','#0e7490','#b91c1c'];
// Barra que muestra cuánto pide cada tienda (verde Moravia, naranja Los Ángeles).
function xpPartes(sides,valores){
  const tot=sides.reduce((t,s)=>t+(valores[s]||0),0)||1;
  return `<div class="pdx-split" aria-hidden="true">${sides.map(s=>`<i class="${s}" style="width:${Math.max(valores[s]?3:0,Math.round(valores[s]/tot*1000)/10)}%"></i>`).join('')}</div>`;
}
// ── Tarjeta sencilla de proveedor (la usan Proveedores y Pedido) ──
// Cada producto es una pastilla: fruta, nombre y las dos cantidades (verde Moravia, naranja
// Los Ángeles). Tocarla cambia la cantidad; mantenerla apretada y arrastrarla la pasa a otro
// proveedor (ver "Mover un producto" más abajo).
const UNI_CORTA={unidad:'u',unid:'u','unid.':'u',unidades:'u',kg:'kg',paquete:'paq',rollo:'rollo',bolsa:'bolsa',caja:'caja',docena:'doc'};
const uniCorta=u=>UNI_CORTA[String(u||'').toLowerCase()]||String(u||'');
function sxColor(prov){return PDX_COLORES[[...String(prov)].reduce((h,c)=>(h*31+c.charCodeAt(0))%997,7)%PDX_COLORES.length];}
// Dos botones en uno por proveedor: a la izquierda "Enviar a …" (se llena con la hora del envío) y a la derecha
// "Sin leer" / "Leído" (la hora en que el proveedor abrió el enlace; lo pone leido.js). Si las dos tiendas se
// enviaron en momentos distintos, cada hora lleva el nombre de su tienda.
function sxDos(d){
  const L=window.AramoLeido,gs=(L&&L.grupos(d.prov))||[];
  const sep=gs.length>1||(gs.length===1&&gs[0].sides.length<2);   // hay que decir de cuál tienda es cada hora
  const pre=g=>sep?`<em class="${g.sides.length===1?g.sides[0]:''}">${g.sides.map(s=>SIDE_NAME[s]).join(' y ')}</em> `:'';
  const h=ms=>esc(L?L.hora(ms):'');
  const izq=gs.length
    ?`<span class="sx-dos-t">${sep?gs.map(g=>`${pre(g)}<b>✓ ${h(g.at)}</b>`).join(''):`<b>✓ Enviado</b><small>${h(gs[0].at)}</small>`}</span>`
    :`<span class="sx-dos-t"><b>Enviar a ${esc(d.prov)}</b></span>`;
  const hayLink=gs.some(g=>g.c),n=gs.reduce((t,g)=>t+(g.est?g.est.n:0),0);
  let der,cls;
  if(!gs.length){der='<b>Sin leer</b>';cls='sin off';}
  else if(!hayLink){der='<b>Sin leer</b><small>sin enlace</small>';cls='sin off';}
  else if(gs.some(g=>g.est)){
    cls='leido';
    der=sep?gs.map(g=>g.c?(g.est?`${pre(g)}<b>📖 ${h(g.est.l)}</b>`:`${pre(g)}<b>Sin leer</b>`):'').join('')
      :`<b>📖 Leído</b><small>${h(gs.find(g=>g.est).est.l)}</small>`;
    if(n>1&&!sep)der+=`<small>${n} aperturas</small>`;
  }else{cls='sin';der=sep?gs.map(g=>g.c?`${pre(g)}<b>Sin leer</b>`:'').join(''):'<b>Sin leer</b><small>esperando</small>';}
  const aria=!gs.length?'Todavía no se envió, no hay nada que leer':hayLink?(cls==='leido'?`${d.prov} ya abrió el pedido. Tocá para revisar de nuevo`:`${d.prov} todavía no abrió el pedido. Tocá para revisar`):'Este envío salió sin enlace de lectura';
  const reenv=gs.length?'Reenviar':'Enviar';
  return `<div class="sx-dos"><button type="button" class="sx-env sx-dos-env${gs.length?' hecho':''}" data-pd="send" data-prov="${esc(d.prov)}" aria-label="${reenv} el pedido a ${esc(d.prov)}${gs.length?'. Ya se envió':''}" title="${reenv} por WhatsApp">${gs.length?'':ico('enviar')}${izq}</button>
    <button type="button" class="sx-dos-leido ${cls}" data-pd="leido" data-prov="${esc(d.prov)}"${gs.length?'':' disabled'} aria-label="${esc(aria)}"><span class="sx-dos-t">${der}</span></button></div>`;
}
function sxTarjeta(d,i,sides,modo){
  const p=S.pedidos[d.prov]||{};
  const cant=(q,s)=>`<b class="${s}${q>0?'':' cero'}">${q>0?fmtQ(q):'·'}</b>`;
  const notasProducto=sides.flatMap(s=>d.lines.filter(l=>l.q[s]>0).map(l=>{
    const nota=getProductNote(p,l.prod.id,s);
    return nota?{side:s,producto:niceName(l.prod.name),nota}:null;
  }).filter(Boolean));
  const notasProductoHTML=notasProducto.length
    ?`<div class="sx-prod-notas">${notasProducto.map(x=>`<p class="sx-nota sx-prod-nota"><b>${SIDE_NAME[x.side]} · ${esc(x.producto)}:</b> ${esc(x.nota)}</p>`).join('')}</div>`
    :'';
  const notas=sides.map(s=>{const n=String(p.notes?.['__note_'+s]||(s==='moravia'?p.note:'')||'').trim();return n?`<p class="sx-nota"><b>${SIDE_NAME[s]}:</b> ${esc(n)}</p>`:'';}).join('');
  const horas=sides.map(s=>sxHoraTag(sxHora(p,s),`Pedido de ${SIDE_NAME[s]} a ${d.prov} modificado`,'sx-hora '+s,SIDE_NAME[s]+' · ')).join('');
  return `<article class="sx-card${d.sent?' enviado':''}" data-sx-drop="${esc(d.prov)}" style="--i:${i};--c:${sxColor(d.prov)}">
    <header class="sx-card-h">
      <button type="button" class="sx-card-id" data-pd="open" data-prov="${esc(d.prov)}" title="Abrir ${esc(d.prov)}"><span class="sx-av">${esc(d.prov.charAt(0).toUpperCase())}</span><span class="sx-card-t"><b>${esc(d.prov)}</b><small><i></i>${d.sent?'Enviado':'Por enviar'} · ${plural(d.n,'producto','productos')}</small></span></button>
      ${d.tot?`<span class="sx-card-tot">₡${fmt(d.tot)}</span>`:''}
      ${modo==='pedido'&&scopeSide()==='both'?sxDos(d):''}
    </header>
    <div class="sx-chips">
      ${d.lines.map(l=>{const barato=Object.entries(sxPreciosDe(d.prov,l.prod).por).find(([,x])=>x.barato);return `<div class="sx-order-line"><button type="button" class="sx-chip" data-pd="line" data-prov="${esc(d.prov)}" data-pid="${esc(l.prod.id)}" aria-label="${esc(niceName(l.prod.name))}: ${sides.map(s=>SIDE_NAME[s]+' '+(l.q[s]||0)).join(', ')} ${esc(l.unit)}. Tocá para editar."><span class="sx-e">${smartEmoji(l.prod)}</span><span class="sx-n">${esc(niceName(l.prod.name))}</span><span class="sx-q">${sides.map(s=>cant(l.q[s],s)).join('')}<small>${esc(uniCorta(l.unit))}</small></span></button>${sides.filter(s=>l.q[s]>0).map(s=>`<button type="button" class="sx-line-del ${s}" data-pd="remove-line" data-prov="${esc(d.prov)}" data-pid="${esc(l.prod.id)}" data-side="${s}" aria-label="Quitar ${esc(niceName(l.prod.name))} del pedido de ${SIDE_NAME[s]}" title="Quitar de ${SIDE_NAME[s]}">×</button>`).join('')}${barato?`<small class="sx-best-price">Más barato en <b>${esc(barato[0])}</b> · ₡${fmt(barato[1].precio)}/${esc(barato[1].u)}</small>`:''}</div>`;}).join('')}
      ${d.extras.map(x=>`<span class="sx-chip extra"><span class="sx-e">➕</span><span class="sx-n">${esc(x.name||'Extra')}</span><span class="sx-q">${sides.map(s=>cant(s===x.side?+x.qty:0,s)).join('')}<small>${esc(uniCorta(x.unit||'kg'))}</small></span></span>`).join('')}
    </div>
    ${notasProductoHTML}
    ${modo==='pedido'?xpLateHtml(d.prov,sides):''}
    ${horas?`<div class="sx-horas">${horas}</div>`:''}
    ${notas}
  </article>`;
}
function sxDatos(){
  return xpTotals().provs.slice().sort((a,b)=>(isSent(a)-isSent(b))||ORDEN_ES(a,b))
    .map(prov=>{const {lines,extras}=xpProvLines(prov);return{prov,lines,extras,sent:isSent(prov),tot:sideTotal(prov),n:lines.length+extras.length};})
    .filter(d=>d.n>0);
}
// Proveedores: "Tu pedido de hoy" con las dos tiendas a la vista al mismo tiempo.
// Una franja por proveedor y, debajo, dos columnas: Moravia (verde) y Los Ángeles (naranja),
// cada una con lo que llenó esa tienda. Arriba queda fija la cabecera de las dos columnas.
// Tocar un producto cambia su cantidad. El botón ⇄ de cada fila lo pasa a otro proveedor de la
// misma tienda: tocarlo abre la lista de proveedores; arrastrarlo lo lleva hasta uno.
function sxLado(d,side){
  const p=S.pedidos[d.prov]||{},lines=d.lines.filter(l=>l.q[side]>0),extras=d.extras.filter(x=>x.side===side);
  const sent=!!sentFlags(p)[side];
  const nota=String(p.notes?.['__note_'+side]||(side==='moravia'?p.note:'')||'').trim();
  const filas=lines.map(l=>{
    const productNote=getProductNote(p,l.prod.id,side);
    return `<div class="sx-chip uno ${side}" style="display:flex;flex-wrap:wrap;width:100%;max-width:none;box-sizing:border-box" data-prov="${esc(d.prov)}" data-pid="${esc(l.prod.id)}" data-lado="${side}"><button type="button" class="sx-grip" data-sx-mover title="Pasar a otro proveedor: tocá para elegir o arrastrá" aria-label="Pasar ${esc(niceName(l.prod.name))} de ${SIDE_NAME[side]} a otro proveedor">${ico('mover')}</button><button type="button" class="sx-chip-b" data-sx-ed aria-label="${esc(niceName(l.prod.name))}: ${fmtQ(l.q[side])} ${esc(l.unit)} para ${SIDE_NAME[side]}. Tocá para cambiar la cantidad o pasarlo a otro proveedor."><span class="sx-e">${smartEmoji(l.prod)}</span><span class="sx-n">${esc(niceName(l.prod.name))}</span><span class="sx-uno">${fmtQ(l.q[side])}<small>${esc(uniCorta(l.unit))}</small></span></button>${productNote?`<small class="sx-item-nota" style="flex:0 0 100%;width:calc(100% - 40px);box-sizing:border-box">📝 ${esc(productNote)}</small>`:''}</div>`;
  }).join('')
    +extras.map(x=>`<div class="sx-chip uno extra ${side}"><button type="button" class="sx-chip-b" data-pd="open" data-prov="${esc(d.prov)}" aria-label="${esc(x.name||'Extra')}: se edita en el proveedor"><span class="sx-e">➕</span><span class="sx-n">${esc(x.name||'Extra')}</span><span class="sx-uno">${fmtQ(+x.qty)}<small>${esc(uniCorta(x.unit||'kg'))}</small></span></button></div>`).join('');
  return `<div class="sx-lado ${side}${sent?' enviado':''}${filas?'':' nada'}" style="display:flex;flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:4px;width:100%;box-sizing:border-box" data-lado="${side}" aria-label="${SIDE_NAME[side]}">
    ${sxHoraTag(sxHora(p,side),`Pedido de ${SIDE_NAME[side]} a ${d.prov} modificado`,'sx-hora')}<div class="sx-lado-items" style="display:flex;flex-direction:column;align-items:stretch;gap:5px;width:100%">${filas||'<span class="sx-nada" aria-label="Nada para '+SIDE_NAME[side]+'">—</span>'}</div>
    ${nota?`<p class="sx-nota">📝 ${esc(nota)}</p>`:''}
  </div>`;
}
// Hora en que se modificó por última vez un pedido en específico (una tienda a un proveedor):
// la deja markUnsent en notes.__upd_<tienda> solo cuando el pedido cambia. Un pedido vacío no
// muestra hora (por ejemplo, después de reiniciar).
function sxHora(p,side){return pedidoTieneLado(p,side)?+p?.notes?.['__upd_'+side]||0:0;}
// Cabecera de cada tienda: el último movimiento en cualquiera de sus pedidos, desde "Ambos" o desde
// la pestaña de la tienda. Cuenta aunque el pedido haya quedado vacío (quitar o pasar a otro
// proveedor su único producto también es un movimiento).
function sxUltimoCambio(side){return Object.values(S.pedidos||{}).reduce((m,p)=>Math.max(m,+p?.notes?.['__upd_'+side]||0),0);}
function sxCuando(t){
  const d=new Date(t),hoy=new Date(),ayer=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()-1);
  const dia=d.toDateString()===hoy.toDateString()?'Hoy':d.toDateString()===ayer.toDateString()?'Ayer':capital(d.toLocaleDateString('es-CR',{weekday:'short'}));
  const junto=s=>s.replace(/\s/g,' '); // solo corta renglón en el " · "
  return `${junto(dia+' '+d.toLocaleDateString('es-CR',{day:'numeric',month:'short'}))} · ${junto(d.toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'}))}`;
}
function sxHoraTag(t,titulo,cls,pre=''){
  if(!t)return'';
  const cuando=sxCuando(t);
  return `<time class="${cls}" datetime="${new Date(t).toISOString()}" title="${esc(titulo)}: ${cuando}" aria-label="${esc(pre)}Modificado ${cuando}">🕒 ${esc(pre)}${cuando}</time>`;
}
function sxActualizado(side){return sxHoraTag(sxUltimoCambio(side),'Último pedido modificado de '+SIDE_NAME[side],'sx-upd');}
function sxRenderTablero(){
  const box=$('sxTablero');if(!box)return;
  const bn=$('sxProvBarN');if(bn)bn.textContent=getProvNames().length;
  const sides=activeOrderSides(),datos=sxDatos();
  if(!datos.length){
    // Un cierre a medio llenar sigue a mano aunque ya se haya reiniciado el pedido.
    const st=sides.length>1?CI.st||ciLeer():null;
    box.innerHTML=`<div class="sx-vacio"><span>🧺</span><div><b>Todavía no hay productos</b><small>Buscá un producto arriba o abrí un proveedor abajo.</small></div></div>${auBoton(true)}${ciVigente(st)&&ciTieneDatos(st)?ciBarra():''}`;
    return;
  }
  const tienda=side=>{
    const ds=datos.filter(d=>d.lines.some(l=>l.q[side]>0)||d.extras.some(x=>x.side===side));
    const n=ds.reduce((k,d)=>k+d.lines.filter(l=>l.q[side]>0).length+d.extras.filter(x=>x.side===side).length,0);
    const tot=ds.reduce((t,d)=>t+calcSide(side,d.prov),0),pend=ds.filter(d=>!sentFlags(S.pedidos[d.prov]||{})[side]).length;
    return `<div class="${side}"><b>${SIDE_ICO[side]} ${SIDE_NAME[side]}</b>${sxActualizado(side)}<span>${plural(n,'producto','productos')}${tot?` · ₡${fmt(tot)}`:''}</span>${n?(pend?`<em>${pend} por enviar</em>`:`<em class="ok">✓ todo enviado</em>`):''}</div>`;
  };
  const estadoProveedor=d=>{
    const p=S.pedidos[d.prov]||{};
    const usados=sides.filter(s=>d.lines.some(l=>l.q[s]>0)||d.extras.some(x=>x.side===s));
    const enviados=usados.filter(s=>sentFlags(p)[s]);
    if(!enviados.length)return '';
    const texto=enviados.length===usados.length?'✓ Enviado':`✓ ${enviados.length}/${usados.length} enviado`;
    return `<span class="sx-prov-enviado${enviados.length<usados.length?' parcial':''}" title="${esc(enviados.map(s=>SIDE_NAME[s]).join(' y '))}: enviado">${texto}</span>`;
  };
  box.innerHTML=`<div class="sx-tablero-h"><h2>Tu pedido de hoy</h2><small class="sx-ayuda">Tocá un producto para cambiar la cantidad · <span class="sx-mover-demo" aria-hidden="true">${ico('mover')}</span> para pasarlo a otro proveedor</small></div>
    <button type="button" class="sx-pdf-btn" data-sx-pdf><span class="sx-pdf-i">${ico('hoja')}</span><span class="sx-pdf-t"><b>PDF del pedido</b><small>3 columnas · mandalo a tu WhatsApp</small></span><span class="sx-pdf-f" aria-hidden="true">›</span></button>
    ${sides.length>1?ciBarra():''}
    ${auBoton(false)}
    <div class="sx-tiendas n${sides.length}">${sides.map(tienda).join('')}</div>
    <div class="sx-lista">${datos.map((d,i)=>`<section class="sx-prov" data-sx-drop="${esc(d.prov)}" style="--i:${i};--c:${sxColor(d.prov)}">
      <button type="button" class="sx-prov-h" data-pd="open" data-prov="${esc(d.prov)}" title="Abrir ${esc(d.prov)}"><b>${esc(d.prov)}</b>${estadoProveedor(d)}${d.tot?`<span>₡${fmt(d.tot)}</span>`:''}<i aria-hidden="true">›</i></button>
      <div class="sx-par n${sides.length}" style="display:flex;flex-direction:column;align-items:stretch;gap:7px;width:100%">${sides.map(s=>sxLado(d,s)).join('')}</div>
    </section>`).join('')}</div>`;
  sxCabeceraFija();
  hojaPrecargar();
}
// La cabecera Moravia | Los Ángeles queda arriba mientras se recorre la lista. La página se
// desplaza entera (no la vista), así que "sticky" no sirve: se muestra una copia fija.
function sxCabeceraFija(){
  const box=$('sxTablero'),orig=box?.querySelector('.sx-tiendas');let f=$('sxTiendasFija');
  if(!orig||box.offsetParent===null){f?.classList.remove('open');return;}
  const r=orig.getBoundingClientRect(),t=box.getBoundingClientRect(),ver=r.bottom<4&&t.bottom>140;
  if(!f){f=document.createElement('div');f.id='sxTiendasFija';f.className='sx-tiendas sx-fija';f.setAttribute('aria-hidden','true');box.parentElement.appendChild(f);}
  if(ver){
    if(f._html!==orig.innerHTML){f.innerHTML=orig.innerHTML;f._html=orig.innerHTML;}
    f.className=orig.className+' sx-fija open';f.style.left=t.left+'px';f.style.width=t.width+'px';
  }else f.classList.remove('open');
}
let _sxFijaRaf=0;
const sxFijaLuego=()=>{if(!_sxFijaRaf)_sxFijaRaf=requestAnimationFrame(()=>{_sxFijaRaf=0;sxCabeceraFija();});};
addEventListener('scroll',sxFijaLuego,{passive:true,capture:true});
addEventListener('resize',sxFijaLuego,{passive:true});

// ══════════════════════════════════════════
// 📄 PDF DEL PEDIDO — la hoja de siempre
// ══════════════════════════════════════════
// Una hoja carta con tres columnas y los proveedores a los que se les pidió algo, cada uno
// siempre en su lugar, como en la hoja de papel: a la izquierda los de fruta, a la derecha los
// de verdura y en el centro el resto. Cada lugar acepta los nombres como estén escritos en la
// app; uno nuevo sin lugar va al centro, antes de CONSEGUIR, que se llena con "Otros".
// #1 = Moravia y #2 = Los Ángeles.
const HOJA_COLUMNAS=[
  [['alex'],['arturo'],['dani','danny'],['matias'],['yader'],['aleman'],['vega'],['juan carlos'],['anthony'],['salomon']],
  [['abner'],'FECHA',['luisa'],['walter'],['roger'],['fresh'],['jesus'],['vilma'],['elamos'],['susanavo'],'SUELTOS','CONSEGUIR','NOTA'],
  [['henry'],['mincho','nincho'],['barbas'],['pajaro'],['colas'],['perla'],['sandra'],['david'],['chiqui'],['edgardo'],['noe']],
];
const HOJA_NUM={moravia:1,angeles:2};
// Los tres encargados del pedido: el que lo hace se elige al sacar el PDF y va a la par de la fecha.
const HOJA_FIRMAS=['JRRL','JARL','JRRP'];
const HOJA_COLOR={verde:[134,239,172],rosa:[249,168,212],amarillo:[254,240,138],celeste:[103,232,249],tinta:[17,24,39],marca:[14,74,48],unidad:[110,110,110],suave:[120,128,124],raya:[222,227,224],borde:[206,215,210],sombra:[233,237,235],blanco:[255,255,255]};
const JSPDF_URL='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const hojaClave=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
// La letra del PDF solo trae los caracteres de Latin-1: ₡ pasa a ¢ y se quitan los emojis.
const hojaTxt=s=>String(s||'').replace(/₡/g,'¢').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[^\x20-\x7e\xa0-\xff]/g,'').replace(/\s+/g,' ').trim();
function hojaFecha(d=new Date()){return capital(d.toLocaleDateString('es-CR',{weekday:'long'}))+' '+d.toLocaleDateString('es-CR',{day:'2-digit',month:'2-digit',year:'numeric'});}
function hojaGrupos(prov){
  const p=S.pedidos[prov]||{},{lines,extras}=xpProvLines(prov);
  return activeOrderSides().map(s=>({
    n:HOJA_NUM[s],
    items:[...lines.filter(l=>l.q[s]>0).map(l=>({q:fmtQ(l.q[s]),u:uniCorta(l.unit),t:niceName(l.prod.name),nota:getProductNote(p,l.prod.id,s)})),
      ...extras.filter(x=>x.side===s).map(x=>({q:fmtQ(+x.qty),u:uniCorta(x.unit||'kg'),t:x.name||'Extra'}))],
    nota:getBranchNote(p,s),
  })).filter(g=>g.items.length||g.nota);
}
// Qué va en cada lugar de la hoja: solo los proveedores con pedido, cada uno en su lugar de siempre.
function hojaPlan(firma){
  const todos=getProvNames(),conPedido=new Set(todos.filter(hasData)),usados=new Set();
  const calza=(p,lugar)=>{const k=hojaClave(p);return lugar.some(a=>k===a||k.split(' ').includes(a));};
  const cols=HOJA_COLUMNAS.map(col=>col.map(lugar=>{
    if(typeof lugar==='string')return[{tipo:lugar,firma}];
    const m=todos.filter(p=>!usados.has(p)&&calza(p,lugar));
    m.forEach(p=>usados.add(p));
    return m.filter(p=>conPedido.has(p)).map(p=>({tipo:'prov',prov:p}));
  }));
  const otros=todos.filter(p=>!usados.has(p)&&hojaClave(p)==='otros');
  otros.forEach(p=>usados.add(p));
  const sueltos=todos.filter(p=>!usados.has(p)&&conPedido.has(p)).sort(ORDEN_ES).map(p=>({tipo:'prov',prov:p}));
  const filas=[];
  otros.filter(p=>conPedido.has(p)).forEach(prov=>{
    const {lines,extras}=xpProvLines(prov);
    lines.forEach(l=>filas.push({t:niceName(l.prod.name),u:uniCorta(l.unit),q:l.q}));
    extras.forEach(x=>filas.push({t:x.name||'Extra',u:uniCorta(x.unit||'kg'),q:{[x.side]:+x.qty}}));
  });
  return cols.map(col=>col.flat().flatMap(b=>b.tipo==='SUELTOS'?sueltos:b.tipo==='CONSEGUIR'?[{...b,filas}]:[b]));
}
// Dibuja el contenido de una tarjeta (o solo lo mide si dibujar=false) y devuelve su alto.
function hojaBloque(doc,b,f,x,y,w,dibujar,alto=0){
  const C=HOJA_COLOR,pad=Math.max(5,f*.72),lh=1.24;
  let cy=pad;
  const fuente=(sz,est)=>{doc.setFont('helvetica',est);doc.setFontSize(sz);};
  const ancho=(s,sz,est)=>{fuente(sz,est);return doc.getTextWidth(s);};
  const partir=(s,sz,est,max)=>{fuente(sz,est);return doc.splitTextToSize(s,max);};
  const texto=(s,xx,yy,sz,est,color,opt={})=>{fuente(sz,est);if(dibujar){doc.setTextColor(...color);doc.text(s,xx,yy,{baseline:'top',...opt});}};
  const marcar=(xx,yy,ww,hh,color,r=0)=>{if(dibujar){doc.setFillColor(...color);if(r)doc.roundedRect(xx,yy,ww,hh,r,r,'F');else doc.rect(xx,yy,ww,hh,'F');}};
  const raya=(x1,yy,x2)=>{if(dibujar){doc.setDrawColor(...C.raya);doc.setLineWidth(.6);doc.line(x1,yy,x2,yy);}};
  // Texto con el marcador de color detrás, como en la hoja de papel. Devuelve el ancho marcado.
  const etiqueta=(s,xx,sz,color,centrar=true)=>{
    const t=partir(s,sz,'bold',w-2*pad-12)[0]||'',tw=ancho(t,sz,'bold'),x0=centrar?xx-tw/2:xx;
    marcar(x0-6,y+cy-1.3,tw+12,sz*1.22,color,2.5);
    texto(t,x0,y+cy,sz,'bold',C.tinta);
    return tw+12;
  };
  const resaltadas=(s,sz,est,xx,ww)=>partir(s,sz,est,ww).forEach(ln=>{
    marcar(xx-2,y+cy-.6,ancho(ln,sz,est)+4,sz*1.18,C.amarillo,1.5);
    texto(ln,xx,y+cy,sz,est,C.tinta);cy+=sz*lh;
  });
  if(b.tipo==='prov'){
    etiqueta(hojaTxt(b.prov),x+w/2,f*1.32,C.verde);cy+=f*1.32*lh+5;
    const grupos=hojaGrupos(b.prov),todos=grupos.flatMap(g=>g.items);
    // Columnas fijas dentro de la tarjeta: cantidad (alineada a la derecha) | unidad | producto.
    const qW=Math.max(0,...todos.map(it=>ancho(hojaTxt(it.q),f,'bold'))),uW=Math.max(0,...todos.map(it=>ancho(hojaTxt(it.u),f*.9,'bold')));
    const xq=x+pad+5+qW,xu=xq+3.5,xn=xu+uW+(uW?5:1.5),wn=x+w-pad-xn;
    grupos.forEach((g,gi)=>{
      if(gi)cy+=f*.8; // #1 y #2 bien separados
      // #1 / #2 en rosado y una raya fina hasta el borde de la tarjeta.
      const sz=f*1.02,ew=etiqueta('#'+g.n,x+pad+6,sz,C.rosa,false);
      raya(x+pad+ew+3,y+cy+sz*.5,x+w-pad);cy+=sz*lh+4;
      g.items.forEach(it=>{
        texto(hojaTxt(it.q),xq,y+cy,f,'bold',C.tinta,{align:'right'});
        texto(hojaTxt(it.u),xu,y+cy+f*.08,f*.9,'bold',C.tinta); // cantidad y unidad en negrita: "30 u"
        partir(hojaTxt(it.t),f,'normal',wn).forEach(ln=>{texto(ln,xn,y+cy,f,'normal',C.tinta);cy+=f*lh;});
        if(it.nota)resaltadas('('+hojaTxt(it.nota)+')',f*.9,'italic',xn+2,wn-4);
        cy+=f*.14;
      });
      if(g.nota){cy+=f*.25;resaltadas('Nota: '+hojaTxt(g.nota),f*.92,'bold',x+pad+4,w-2*pad-8);}
    });
    return cy+pad;
  }
  if(b.tipo==='FECHA'){
    // La barra celeste con la fecha y el encargado, igual que en la hoja.
    const sz=f*1.12,h=sz*1.7;
    marcar(x,y,w,h,C.celeste,3);
    texto(hojaTxt(`${hojaFecha()}   ${b.firma||''}`),x+w/2,y+(h-sz)/2+sz*.05,sz,'bold',C.tinta,{align:'center'});
    return h;
  }
  if(b.tipo==='CONSEGUIR'){
    const qw=Math.max(34,f*4.4),x2=x+w-pad-2*qw,rh=f*1.7,n=Math.max(b.filas.length,3);
    // El título va en su propio renglón y #1 / #2 encima de su columna: nada se encima.
    etiqueta('CONSEGUIR',x+pad+6,f*1.1,C.verde,false);cy+=f*1.1*lh+6;
    ['#1','#2'].forEach((et,i)=>etiqueta(et,x2+qw*i+qw/2,f,C.rosa));cy+=f*lh+4;
    const y0=y+cy;
    if(dibujar){
      doc.setDrawColor(...C.raya);doc.setLineWidth(.6);
      for(let i=0;i<=n;i++)doc.line(x+pad,y0+i*rh,x+w-pad,y0+i*rh);
      doc.line(x2,y0,x2,y0+n*rh);doc.line(x2+qw,y0,x2+qw,y0+n*rh);
    }
    b.filas.forEach((r,i)=>{
      const yy=y0+i*rh+(rh-f)/2;
      texto(partir(hojaTxt(r.t),f,'normal',x2-x-pad-4)[0]||'',x+pad+3,yy,f,'normal',C.tinta);
      ['moravia','angeles'].forEach((s,j)=>{if(+r.q[s]>0)texto(`${fmtQ(r.q[s])} ${hojaTxt(r.u)}`,x2+qw*j+qw/2,yy,f,'bold',C.tinta,{align:'center'});});
    });
    return cy+n*rh+pad;
  }
  if(b.tipo==='NOTA'){
    // Renglones para escribir a mano; si sobra espacio en la hoja, llenan hasta abajo.
    etiqueta('Nota:',x+pad+6,f*1.1,C.rosa,false);cy+=f*1.1*lh+2;
    const rh=f*1.8,n=Math.max(3,Math.floor((alto-cy-pad)/rh));
    if(dibujar){doc.setDrawColor(...C.raya);doc.setLineWidth(.6);for(let i=1;i<=n;i++)doc.line(x+pad,y+cy+i*rh,x+w-pad,y+cy+i*rh);}
    return cy+n*rh+pad;
  }
  return 0;
}
function hojaDibujar(doc,firma){
  const C=HOJA_COLOR,W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
  const M=24,CAB=24,G=10,V=8,arriba=M+CAB,abajo=H-M,colW=(W-2*M-2*G)/3,disp=abajo-arriba;
  const cols=hojaPlan(firma);
  const altoCol=(col,f)=>col.reduce((t,b)=>t+hojaBloque(doc,b,f,0,0,colW,false),0)+V*Math.max(0,col.length-1);
  // La letra más grande con la que todo cabe en una sola hoja (si no cabe ni en 5,5, sigue en otra).
  let f=12.5;while(f>5.5&&Math.max(...cols.map(c=>altoCol(c,f)))>disp)f-=.25;
  const cabe=Math.max(...cols.map(c=>altoCol(c,f)))<=disp;
  // Encabezado fino: la marca a la izquierda y qué es #1 y #2 a la derecha.
  const cabecera=()=>{
    doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(...C.marca);doc.text('ARAMO',M,M,{baseline:'top'});
    const aw=doc.getTextWidth('ARAMO');
    doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...C.suave);doc.text('Pedido a proveedores',M+aw+7,M+2,{baseline:'top'});
    let xx=W-M;
    [['#2','Los Ángeles'],['#1','Moravia']].forEach(([n,t])=>{
      doc.setFont('helvetica','normal');doc.setFontSize(9.5);const tw=doc.getTextWidth(t);xx-=tw;
      doc.setTextColor(...C.suave);doc.text(t,xx,M+2,{baseline:'top'});
      doc.setFont('helvetica','bold');doc.setFontSize(9);const nw=doc.getTextWidth(n);xx-=nw+14;
      doc.setFillColor(...C.rosa);doc.roundedRect(xx,M,nw+10,13,2.5,2.5,'F');
      doc.setTextColor(...C.tinta);doc.text(n,xx+5,M+2.2,{baseline:'top'});xx-=12;
    });
    doc.setDrawColor(...C.borde);doc.setLineWidth(.8);doc.line(M,M+CAB-7,W-M,M+CAB-7);
  };
  // Tarjeta: sombra suave, fondo blanco y borde redondeado.
  const tarjeta=(x,y,h)=>{
    doc.setFillColor(...C.sombra);doc.roundedRect(x+1.2,y+1.6,colW,h,6,6,'F');
    doc.setFillColor(...C.blanco);doc.setDrawColor(...C.borde);doc.setLineWidth(.8);doc.roundedRect(x,y,colW,h,6,6,'FD');
  };
  let paginas=1;
  cabecera();
  cols.forEach((col,ci)=>{
    const x=M+ci*(colW+G),hs=col.map(b=>hojaBloque(doc,b,f,0,0,colW,false));
    // En una sola hoja, la Nota del centro llega hasta abajo.
    const sobra=cabe?disp-(hs.reduce((a,b)=>a+b,0)+V*Math.max(0,col.length-1)):0;
    let pag=1,y=arriba;
    col.forEach((b,i)=>{
      let h=hs[i];
      if(b.tipo==='NOTA'&&sobra>0)h+=sobra;
      if(!cabe&&y+h>abajo&&y>arriba){pag++;if(pag>paginas){doc.addPage('letter');paginas=pag;cabecera();}y=arriba;}
      doc.setPage(pag);
      if(b.tipo!=='FECHA')tarjeta(x,y,h);
      hojaBloque(doc,b,f,x,y,colW,true,h);
      y+=h+V;
    });
  });
  return{paginas,provs:cols.flat().filter(b=>b.tipo==='prov').length,letra:f};
}
let _jspdf=null,_hojaPrecarga=false;
function hojaCargarJsPDF(){
  if(window.jspdf?.jsPDF)return Promise.resolve();
  return _jspdf||(_jspdf=new Promise((ok,mal)=>{
    const s=document.createElement('script');s.src=JSPDF_URL;
    s.onload=()=>window.jspdf?.jsPDF?ok():mal(new Error('No se pudo preparar el PDF'));
    s.onerror=()=>{_jspdf=null;s.remove();mal(new Error('No se pudo cargar el PDF. Revisá el internet y probá otra vez.'));};
    document.head.appendChild(s);
  }));
}
// Se baja por detrás una sola vez, así al tocar el botón el PDF sale enseguida.
function hojaPrecargar(){if(_hojaPrecarga||window.jspdf)return;_hojaPrecarga=true;setTimeout(()=>hojaCargarJsPDF().catch(()=>{}),4000);}
async function hojaPdfHacer(firma){
  await hojaCargarJsPDF();
  const doc=new window.jspdf.jsPDF({unit:'pt',format:'letter'}),d=new Date();
  const info=hojaDibujar(doc,firma);
  const nombre=`Pedido ARAMO ${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}${firma?' '+firma:''}.pdf`;
  doc.setProperties({title:nombre.replace(/\.pdf$/,''),author:'ARAMO'});
  return{...info,file:new File([doc.output('blob')],nombre,{type:'application/pdf'})};
}
// ── Ventanita del PDF: descargar o mandarlo al WhatsApp propio ──
const hojaAuto=()=>LS.get('aramo_pdf_auto',false)===true;
const hojaFirma=()=>{const n=LS.get('aramo_pdf_firma','');return HOJA_FIRMAS.includes(n)?n:'';};
const hojaMiNumero=()=>LS.get('aramo_mi_wa','')||(S.pdfWa||[]).find(c=>(c?.tel||'').trim())?.tel||'';
const hojaEsCompu=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
// En el teléfono se comparte el archivo a WhatsApp. En la compu se descarga y se abre el chat
// propio directamente (el menú de compartir de Windows no siempre trae WhatsApp).
function hojaPuedeCompartir(){if(hojaEsCompu())return false;try{return !!navigator.canShare?.({files:[new File(['x'],'p.pdf',{type:'application/pdf'})]});}catch{return false;}}
// En Moravia o Los Ángeles el PDF solo se ABRE para verlo (sin ventana de envío, sin WhatsApp, sin
// compartir): la información ya llega sola a Ambos y desde Ambos se envía. Se abre la pestaña en el
// mismo toque (si no, el teléfono la bloquea) y se llena cuando el PDF está listo.
async function hojaPdfSoloVer(){
  const win=window.open('','_blank');
  toast('Armando el PDF…');
  try{
    const r=await hojaPdfHacer(hojaFirma());   // sin preguntar nada: acá solo se mira
    const u=URL.createObjectURL(r.file);
    if(win&&!win.closed)win.location.href=u;
    else if(!window.open(u,'_blank')){SX.pdf=r;hojaPdfBajar();}   // sin permiso para abrir otra pestaña: se descarga
    setTimeout(()=>URL.revokeObjectURL(u),300000);
  }catch(err){try{win?.close();}catch{}toast('No se pudo armar el PDF','err');}
}
function hojaPdfAbrir(){
  if(activeOrderSides().length<2)return hojaPdfSoloVer();
  let h=$('sxPdf');
  if(!h){
    h=document.createElement('div');h.id='sxPdf';h.className='sx-editor sx-pdf';document.body.appendChild(h);
    h.addEventListener('click',e=>{
      if(e.target===h)return hojaPdfCerrar();
      const fi=e.target.closest('[data-pdf-firma]');
      if(fi){if(fi.dataset.pdfFirma!==hojaFirma()||SX.pdf?.estado!=='listo'){LS.set('aramo_pdf_firma',fi.dataset.pdfFirma);hojaPdfArmar();}return;}
      const a=e.target.closest('[data-pdf]')?.dataset.pdf;
      if(a==='cerrar')hojaPdfCerrar();else if(a==='wa')hojaPdfWhatsApp();else if(a==='bajar')hojaPdfBajar();else if(a==='ver')hojaPdfVer();else if(a==='otra')hojaPdfArmar();
    });
    h.addEventListener('change',e=>{if(e.target.id==='sxPdfAuto')LS.set('aramo_pdf_auto',e.target.checked);});
    h.addEventListener('input',e=>{if(e.target.id==='sxPdfNum')LS.set('aramo_mi_wa',e.target.value.trim());});
  }
  requestAnimationFrame(()=>h.classList.add('open'));
  hojaPdfArmar();
}
// Arma el PDF con el encargado elegido; si en este teléfono todavía no se eligió, lo pregunta.
function hojaPdfArmar(){
  const firma=hojaFirma(),vez=SX.pdfVez=(SX.pdfVez||0)+1; // si se cierra antes de terminar, el resultado se descarta
  if(!firma){SX.pdf={estado:'firma'};hojaPdfPintar();return;}
  SX.pdf={estado:'armando'};hojaPdfPintar();
  hojaPdfHacer(firma).then(r=>{
    if(SX.pdfVez!==vez)return;
    SX.pdf={estado:'listo',...r};hojaPdfPintar();
    if(hojaAuto())hojaPdfWhatsApp(true);
  }).catch(err=>{if(SX.pdfVez!==vez)return;SX.pdf={estado:'error',msg:err?.message||'No se pudo hacer el PDF'};hojaPdfPintar();});
}
function hojaPdfCerrar(){SX.pdfVez=(SX.pdfVez||0)+1;$('sxPdf')?.classList.remove('open');}
function hojaPdfPintar(){
  const h=$('sxPdf');if(!h)return;
  const st=SX.pdf||{},listo=st.estado==='listo',dis=listo?'':' disabled',compartir=hojaPuedeCompartir(),compu=hojaEsCompu();
  const firma=hojaFirma();
  const estado=st.estado==='firma'?'Elegí quién hace el pedido para armar el PDF':st.estado==='armando'?'Armando el PDF…':st.estado==='error'?`⚠️ ${esc(st.msg)} <button type="button" data-pdf="otra">Probar otra vez</button>`:`✓ Listo: ${plural(st.provs,'proveedor','proveedores')} · ${plural(st.paginas,'hoja','hojas')}`;
  h.innerHTML=`<div class="sx-ed-in" role="dialog" aria-modal="true" aria-label="PDF del pedido">
    <div class="sx-ed-cab"><span class="sx-pdf-ico">${ico('hoja')}</span><div><h3>PDF del pedido</h3><p>${esc(hojaFecha())} · la hoja de 3 columnas</p></div><button type="button" class="sx-ed-x" data-pdf="cerrar" aria-label="Cerrar">✕</button></div>
    <div class="sx-pdf-firma"><span id="sxPdfFirmaT">¿Quién hace el pedido?</span><div role="radiogroup" aria-labelledby="sxPdfFirmaT">${HOJA_FIRMAS.map(n=>`<button type="button" role="radio" aria-checked="${n===firma}" class="${n===firma?'on':''}" data-pdf-firma="${n}">${n}</button>`).join('')}</div></div>
    <p class="sx-pdf-estado ${st.estado||''}" role="status">${estado}</p>
    <button type="button" class="sx-pdf-wa" data-pdf="wa"${dis}>${ico('mensaje')}Mandar a mi WhatsApp</button>
    <div class="sx-pdf-acc"><button type="button" data-pdf="bajar"${dis}>${ico('bajar')}Descargar</button>${compu?`<button type="button" data-pdf="ver"${dis}>${ico('hoja')}Ver</button>`:''}</div>
    ${compartir?'':`<label class="sx-pdf-num"><span>Mi número de WhatsApp</span><input id="sxPdfNum" type="tel" inputmode="tel" autocomplete="tel" placeholder="8888 8888" value="${esc(hojaMiNumero())}"></label>`}
    <label class="sx-pdf-auto"><input type="checkbox" id="sxPdfAuto"${hojaAuto()?' checked':''}><span>Mandármelo a WhatsApp cada vez que toco <b>PDF del pedido</b></span></label>
    <p class="sx-pdf-ayuda">${compartir?'Se abre WhatsApp con el PDF: elegí tu propio chat (sale como «Tú») y tocá enviar.':'Se descarga el PDF y se abre tu chat de WhatsApp: adjuntalo con el clip 📎 y enviá.'}</p>
  </div>`;
}
// WhatsApp no deja que una página mande un archivo sola: se abre con el PDF listo y se toca enviar.
async function hojaPdfWhatsApp(solo){
  const f=SX.pdf?.file;if(!f)return;
  const texto=`Pedido ARAMO · ${hojaFecha()}`;
  if(hojaPuedeCompartir()){
    try{await navigator.share({files:[f],title:f.name.replace(/\.pdf$/,''),text:texto});return;}
    catch(e){
      if(e?.name==='AbortError')return;
      if(solo){toast('Tocá «Mandar a mi WhatsApp» para enviarlo','ok');return;} // el permiso del toque ya venció
    }
  }
  hojaPdfBajar();
  const num=normalizeCostaRicaPhone(hojaMiNumero());
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto+'\n(adjunto el PDF que se descargó)')}`,'_blank');
}
function hojaPdfBajar(){
  const f=SX.pdf?.file;if(!f)return;
  const u=URL.createObjectURL(f),a=document.createElement('a');
  a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),60000);
  toast('⬇️ PDF descargado','ok');
}
function hojaPdfVer(){const f=SX.pdf?.file;if(!f)return;const u=URL.createObjectURL(f);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),300000);}
$('sxTablero')?.addEventListener('click',e=>{if(e.target.closest('[data-sx-pdf]'))hojaPdfAbrir();else if(e.target.closest('[data-sx-cierre]'))ciAbrir();else if(e.target.closest('[data-sx-siempre]'))auAbrir();});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if($('sxPdf')?.classList.contains('open'))hojaPdfCerrar();else if($('sxCierre')?.classList.contains('open'))ciCerrar();
});

// ══════════════════════════════════════════
// 🧾 CIERRE DE COMPRAS — lo que llegó, a cuánto y cómo se pagó
// ══════════════════════════════════════════
// Vive en la pestaña «Cierre de compras» de Ambos: ahí se empieza o se sigue el cierre de hoy y se ven
// los cierres guardados. Al volver de comprar se recorre un proveedor a la vez, en orden alfabético.
// Cada producto muestra, POR TIENDA (Moravia y Los Ángeles), cuánto llegó y cuánto es; el precio es uno
// solo por producto. Si llegó menos se baja con −. Al final, el cierre: cuánto se pagó en efectivo,
// tarjeta y SINPE, los gastos del viaje y si la plata que volvió cuadra con la que se llevó. Al terminar
// se guarda (aramo_cierres, y copia en la nube) y se manda como PDF al WhatsApp propio.
// El precio que se escribe queda como COSTO del producto con ese proveedor (tabla precios): de ahí el
// POS saca el precio de venta de cada tienda (costo + 40 %).
const CI_PAGOS=[['efectivo','💵','Efectivo'],['tarjeta','💳','Tarjeta'],['sinpe','📱','SINPE']];
const CI_PAGO_NOMBRE=Object.fromEntries(CI_PAGOS.map(([k,e,n])=>[k,e+' '+n]));
const CI_GASTOS=['Carretillero','Gasolina','Parqueo','Comida'];
const CI_TIENDAS=['moravia','angeles'];
const CI_PARA={mitad:'½ y ½',moravia:SIDE_ICO.moravia+' '+SIDE_NAME.moravia,angeles:SIDE_ICO.angeles+' '+SIDE_NAME.angeles};   // «mitad» solo existe en cierres viejos
const CI_VENCE=18*3600e3; // un cierre que nadie toca en 18 horas ya es de otra compra
// El cierre se escribe muchas veces mientras se teclea. Mantener el estado en
// memoria y agrupar el guardado evita bloquear el hilo principal con
// JSON.stringify + localStorage en cada tecla.
const CI={st:null,pintado:null,seguro:0,saveTimer:0,patchFrame:0,calc:null,calcSt:null,precios:null,bor:null,hecho:null,pdf:new Map()};
const ciPlata=v=>+String(v??'').replace(/\D/g,'')||0; // colones, solo dígitos: "4.500" = 4500
const ciCant=v=>{const n=parseFloat(String(v??'').replace(',','.'));return n>0?Math.round(n*100)/100:0;};
const ciNum=n=>String(+(+n||0).toFixed(2));
const ciId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const ciVacio=v=>String(v??'').trim()==='';
function ciNuevo(){return{inicio:Date.now(),toque:0,firma:hojaFirma(),paso:null,llevo:null,regreso:null,provs:{},gastos:[]};}
// Un producto "tocado" tiene algo escrito a mano: cantidad (de una tienda) o precio.
const ciTocado=it=>it.q!=null||it.precio!=null||it.qm!=null||it.qa!=null;
function ciTieneDatos(st){
  return st.llevo!=null||st.regreso!=null||st.gastos.length>0||Object.values(st.provs).some(cp=>cp.mas?.length||Object.values(cp.items).some(ciTocado));
}
function ciLeer(){const st=LS.get('aramo_cierre',null);return st?.provs&&Array.isArray(st.gastos)?st:null;}
const ciVigente=st=>!!st&&Date.now()-(st.toque||st.inicio)<=CI_VENCE;
function ciCargar(){
  let st=CI.st||ciLeer();
  if(st&&!ciVigente(st)){if(ciTieneDatos(st))ciArchivar(st);st=null;}
  CI.st=st||ciNuevo();
  ciSincronizar(CI.st);
  ciInvalidar();
  return CI.st;
}
function ciInvalidar(){CI.calc=null;CI.calcSt=null;}
function ciGuardarAhora(){
  if(CI.saveTimer){clearTimeout(CI.saveTimer);CI.saveTimer=0;}
  if(!CI.st)return;
  CI.st.toque=Date.now();
  LS.set('aramo_cierre',CI.st);
}
function ciGuardar(){
  if(!CI.st)return;
  ciInvalidar();
  CI.st.toque=Date.now();
  clearTimeout(CI.saveTimer);
  CI.saveTimer=setTimeout(()=>{CI.saveTimer=0;LS.set('aramo_cierre',CI.st);},220);
}
function ciProgramarPatch(){
  if(CI.patchFrame)return;
  CI.patchFrame=requestAnimationFrame(()=>{CI.patchFrame=0;ciPatch();});
}
function ciPrecios(){
  if(!CI.precios)CI.precios=LS.get('aramo_cierre_precios',{})||{};
  return CI.precios;
}
const ciPagoDe=prov=>{const k=LS.get('aramo_cierre_pagos',{})[prov];return CI_PAGO_NOMBRE[k]?k:'efectivo';};
function ciRecordarPago(prov,k){const m=LS.get('aramo_cierre_pagos',{});m[prov]=k;LS.set('aramo_cierre_pagos',m);}
// Lo que se le pidió a un proveedor, con Moravia (#1) y Los Ángeles (#2) por producto y unidad.
function ciLineas(prov){
  const p=S.pedidos[prov];if(!p)return[];
  const m=new Map();
  const sumar=(k,base,s,q)=>{const it=m.get(k)||{k,...base,pm:0,pa:0};it[s==='moravia'?'pm':'pa']+=q;m.set(k,it);};
  (getAllProviders()[prov]?.products||[]).forEach(prod=>['moravia','angeles'].forEach(s=>{
    const v=p.qtys?.[s]?.[prod.id],q=+v?.qty||0;if(!(q>0))return;
    const u=uniCorta(normUnit(v.unit||prod.unit));
    sumar('p:'+prod.id+'|'+u,{pid:prod.id,base:u===uniCorta(normUnit(prod.unit)),t:niceName(prod.name),e:smartEmoji(prod),u},s,q);
  }));
  ['moravia','angeles'].forEach(s=>(p.extras?.[s]||[]).forEach(x=>{
    const q=+x.qty||0;if(!(q>0))return;
    const u=uniCorta(x.unit||'kg');
    sumar('x:'+hojaClave(x.name||'extra')+'|'+u,{t:x.name||'Extra',e:'➕',u,uni:x.unit||'kg',lista:+x.price||0},s,q);
  }));
  return[...m.values()];
}
// Cuánto de lo que llegó es de cada tienda en un cierre de la versión vieja (una sola cantidad total):
// si llegó lo pedido, lo que pidió cada una; si llegó otra cantidad, se reparte según lo que pidió cada una.
function ciReparto(q,pm,pa,qm){
  const r2=n=>Math.round(n*100)/100;
  if(!(pa>0))return[q,0];
  if(!(pm>0))return[0,q];
  if(qm!=null){const m=Math.min(q,Math.max(0,qm));return[m,r2(q-m)];}
  if(r2(q)===r2(pm+pa))return[pm,pa];
  const x=q*pm/(pm+pa),m=[q,pm,pa].every(Number.isInteger)?Math.round(x):r2(x);
  return[m,r2(q-m)];
}
// Un cierre a medio llenar de la versión vieja traía UNA cantidad total (q); ahora cada tienda lleva la suya.
function ciMigrar(it){
  if(it.q!=null&&it.qa===undefined){const[m,a]=ciReparto(it.q,+it.pm||0,+it.pa||0,it.qm);it.qm=m;it.qa=a;}
  delete it.q;
  return it;
}
// Trae al cierre lo que hay pedido ahora. Lo que ya se llenó se respeta aunque el pedido cambie.
function ciSincronizar(st){
  const vistos=new Set();
  getProvNames().forEach(prov=>{
    const lineas=ciLineas(prov);if(!lineas.length)return;
    vistos.add(prov);
    const cp=st.provs[prov]||(st.provs[prov]={pago:ciPagoDe(prov),items:{},mas:[]}),nuevos={};
    Object.values(cp.items).forEach(ciMigrar);
    lineas.forEach(l=>{const v=cp.items[l.k]||{};nuevos[l.k]={...l,qm:v.qm??null,qa:v.qa??null,precio:v.precio??null,ref:v.ref??null};});
    Object.entries(cp.items).forEach(([k,it])=>{if(!nuevos[k]&&ciTocado(it))nuevos[k]={...it,fuera:true};});
    cp.items=nuevos;
  });
  Object.keys(st.provs).forEach(prov=>{
    if(vistos.has(prov))return;
    const cp=st.provs[prov];
    Object.entries(cp.items).forEach(([k,it])=>{ciMigrar(it);if(!ciTocado(it))delete cp.items[k];else it.fuera=true;});
    if(!Object.keys(cp.items).length&&!cp.mas?.length)delete st.provs[prov];
  });
}
// Precio que se propone mientras no se escriba el de hoy: el del producto (misma unidad) o el
// último que se pagó en un cierre.
function ciPrecioAntes(prov,it){
  const ult=+ciPrecios()[prov+'|'+it.k]||0;
  return(it.pid&&it.base?+getPrice(prov,it.pid)||0:0)||ult||+it.lista||0;
}
const ciTiendaVacia=()=>({compras:0,gastos:0,total:0,pago:{efectivo:0,tarjeta:0,sinpe:0}});
function ciCalc(st){
  if(CI.calcSt===st&&CI.calc)return CI.calc;
  const porPago={efectivo:0,tarjeta:0,sinpe:0},tiendas={moravia:ciTiendaVacia(),angeles:ciTiendaVacia()};
  const r2=n=>Math.round(n*100)/100;
  const provs=Object.keys(st.provs).sort(ORDEN_ES).map(prov=>{
    const cp=st.provs[prov];
    const items=Object.values(cp.items).map(it=>{
      // Cada tienda con su cantidad y su monto: lo que llegó (o, si no se tocó, lo que se pidió) × el precio.
      const pm=+it.pm||0,pa=+it.pa||0,pedido=r2(pm+pa),qm=it.qm??pm,qa=it.qa??pa,q=r2(qm+qa),antes=ciPrecioAntes(prov,it),precio=it.precio??antes;
      const sm=Math.round(qm*precio),sa=Math.round(qa*precio),sub=sm+sa;
      const ref=+it.ref||0,cambio=it.precio!=null&&ref>0&&precio>0?(precio-ref)/ref:0;
      return{k:it.k,t:it.t,e:it.e,u:it.u,pm,pa,pedido,q,qm,qa,ambas:pm>0&&pa>0,precio,antes:it.precio==null&&antes>0,sub,sm,sa,falta:q>0&&!(precio>0),fuera:!!it.fuera,ref,cambio};
    });
    const mas=(cp.mas||[]).map(x=>{
      const q=+x.q||0,precio=+x.precio||0,sub=Math.round(q*precio),para=CI_PARA[x.para]?x.para:'moravia';
      const sm=para==='moravia'?sub:para==='angeles'?0:Math.round(sub/2);
      return{id:x.id,t:x.t||'',q,u:x.u||'',precio,para,sub,sm,sa:sub-sm,falta:q>0&&!(precio>0)};
    });
    const todo=[...items,...mas],total=todo.reduce((t,i)=>t+i.sub,0),tm=todo.reduce((t,i)=>t+i.sm,0),faltan=todo.filter(i=>i.falta).length;
    const pago=CI_PAGO_NOMBRE[cp.pago]?cp.pago:'efectivo';
    porPago[pago]+=total;
    [['moravia',tm],['angeles',total-tm]].forEach(([s,v])=>{tiendas[s].compras+=v;tiendas[s].pago[pago]+=v;});
    return{prov,pago,visto:!!cp.visto,items,mas,total,tm,ta:total-tm,faltan};
  });
  // Los gastos del viaje se reparten según lo que compró cada tienda (mitad y mitad si no hay compras).
  const compras=provs.reduce((t,p)=>t+p.total,0),parteM=compras?tiendas.moravia.compras/compras:.5;
  const gastos=st.gastos.map(g=>{const monto=+g.monto||0,gm=Math.round(monto*parteM);return{id:g.id,t:g.t||'',monto,pago:CI_PAGO_NOMBRE[g.pago]?g.pago:'efectivo',gm,ga:monto-gm};});
  gastos.forEach(g=>{porPago[g.pago]+=g.monto;[['moravia',g.gm],['angeles',g.ga]].forEach(([s,v])=>{tiendas[s].gastos+=v;tiendas[s].pago[g.pago]+=v;});});
  CI_TIENDAS.forEach(s=>{tiendas[s].total=tiendas[s].compras+tiendas[s].gastos;});
  const gastado=gastos.reduce((t,g)=>t+g.monto,0);
  const debe=st.llevo!=null?st.llevo-porPago.efectivo:null,dif=debe!=null&&st.regreso!=null?st.regreso-debe:null;
  const salida={inicio:st.inicio,firma:st.firma,provs,gastos,porPago,tiendas,compras,gastado,total:compras+gastado,llevo:st.llevo,regreso:st.regreso,debe,dif};
  CI.calcSt=st;CI.calc=salida;
  return salida;
}
// Guarda el cierre terminado y devuelve lo guardado (para «Ver en PDF» y para mandarlo al WhatsApp).
function ciArchivar(st){
  const c=ciCalc(st),h=LS.get('aramo_cierres',[]);
  const ent={...c,id:ciId(),guardado:Date.now(),provs:c.provs.map(p=>({...p,items:p.items.map(({k,e,antes,fuera,...it})=>it)}))};
  h.unshift(ent);
  LS.set('aramo_cierres',h.slice(0,30));
  ciSubirNube();
  return ent;
}
// Copia en la nube de cada cierre TERMINADO (tabla aramo_cierres_compras), para que el Control lo vea
// desde cualquier aparato. Decisión del dueño (2026-11-24): "que todo se conecte entre sí"; antes el
// cierre vivía solo en el teléfono. Si la tabla todavía no existe, queda en el teléfono como siempre.
let _ciSinNube=false;
function ciSubirNube(){
  if(_ciSinNube||typeof supa==='undefined')return;
  const faltan=(LS.get('aramo_cierres',[])||[]).filter(x=>x&&x.id&&!x.nube).slice(0,10);
  if(!faltan.length)return;
  const filas=faltan.map(x=>({id:x.id,fecha:auDiaTxt(new Date(x.inicio)),firma:x.firma||null,total:+x.total||0,datos:x,updated_at:new Date().toISOString()}));
  Promise.resolve().then(()=>supa.from('aramo_cierres_compras').upsert(filas,{onConflict:'id'})).then(({error})=>{
    if(error){if(/aramo_cierres_compras|PGRST205|42P01/.test((error.code||'')+' '+(error.message||'')))_ciSinNube=true;console.warn('Cierre: sin copia en la nube todavía',error.message);return;}
    const ids=new Set(faltan.map(x=>x.id)),h2=LS.get('aramo_cierres',[])||[];
    h2.forEach(x=>{if(x&&ids.has(x.id))x.nube=true;});LS.set('aramo_cierres',h2);
  }).catch(e=>console.warn('Cierre: sin copia en la nube',e?.message||e));
}
// ── Costos: el precio que se escribe en el cierre queda como costo del producto con ese proveedor ──
// Va por el camino de siempre (setPrice → precios), de donde el POS saca el precio de venta. Si el producto
// no existe con ese proveedor se crea como en «Agregar producto» de un proveedor. Devuelve el producto.
function ciCosto(prov,nombre,uni,precio){
  const p=Math.round(+precio||0),nom=String(nombre||'').trim();
  if(!(p>0)||!nom||!getAllProviders()[prov])return null;
  const key=normalizeText(nom);
  let prod=(getAllProviders()[prov].products||[]).find(x=>normalizeText(x.name)===key);
  if(!prod){
    const cat=getKnownProductCatalog().find(x=>x.key===key);
    ensureCustomProv(prov);
    prod={agregado:Date.now(),id:'prod_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:cat?cat.name:titleCase(nom),emoji:cat?.emoji||'🌿',unit:normUnit(uni)};
    S.customProviders[prov].products.push(prod);
    persist();
  }
  // Un precio por kg no se guarda como precio por caja: solo si es la misma unidad del producto.
  if(normUnit(prod.unit)===normUnit(uni)&&String(p)!==String(getPrice(prov,prod.id)))setPrice(prov,prod.id,String(p));
  return prod;
}
// ── Textos que cambian mientras se escribe ──
const ciTxtSub=x=>x.q>0?(x.precio>0?'₡'+fmt(x.sub):'falta precio'):'';
const ciTxtPidio=(p,q)=>q!==p?`pediste ${fmtQ(p)}`:'';
const ciTxtMontoT=(it,s)=>{const m=s==='moravia',q=m?it.qm:it.qa;return !(q>0)?'No vino':it.precio>0?'₡'+fmt(m?it.sm:it.sa):'—';};
function ciTxtPed(it){return[it.fuera?'ya no está en el pedido':'',it.antes?'precio anterior':'',ciCambioTxt(it)].filter(Boolean).join(' · ');}
// Precio que cambió mucho contra el de la vez pasada (desde 10 %): se marca en la fila y en el cierre.
const CI_CAMBIO=.1;
const ciSaltoPrecio=it=>Math.abs(+it.cambio||0)>=CI_CAMBIO&&it.q>0;
const ciCambioPct=it=>Math.round(Math.abs(it.cambio)*100)+' %';
const ciCambioTxt=it=>ciSaltoPrecio(it)?`${it.cambio>0?'▲ subió':'▼ bajó'} ${ciCambioPct(it)} (antes ₡${fmt(it.ref)})`:'';
const ciCambios=c=>c.provs.flatMap(p=>p.items.filter(ciSaltoPrecio).map(it=>({...it,prov:p.prov})));
// Lo que no vino o vino de menos: se le puede avisar al proveedor por WhatsApp.
const ciFaltantes=p=>p.items.filter(it=>it.pedido>0&&it.q<it.pedido);
function ciReclamoMsg(p){
  const L=[`Buenas, ${p.prov}. Del pedido de hoy:`,''];
  ciFaltantes(p).forEach(it=>L.push(it.q>0?`• ${it.t}: vinieron ${fmtQ(it.q)} de ${fmtQ(it.pedido)} ${it.u}`:`• ${it.t}: no vino (pedí ${fmtQ(it.pedido)} ${it.u})`));
  L.push('','¿Me confirma, por favor? Gracias.');
  return L.join('\n');
}
function ciReclamar(p){
  if(!p||!ciFaltantes(p).length)return;
  const c=S.waContacts?.[p.prov],tel=(Array.isArray(c)?c:[c]).map(x=>x?normalizeCostaRicaPhone(x):'').find(Boolean)||'';
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(ciReclamoMsg(p))}`,'_blank');
  const cp=CI.st.provs[p.prov];if(cp){cp.avisado=Date.now();ciGuardar();ciPintar();}
}
const ciTxtReclamo=(p,cp)=>cp?.avisado?`Ya le avisaste a <b>${esc(p.prov)}</b> · mandar otra vez`:`Avisarle a <b>${esc(p.prov)}</b> lo que faltó`;
const ciTxtComp=t=>`Compras ₡${fmt(t.compras)}${t.gastos?` + gastos ₡${fmt(t.gastos)}`:''}`;
const ciTxtGastos=t=>t.gastos?`Gastos del viaje ₡${fmt(t.gastos)}`:'';
const ciTxtPagos=pg=>CI_PAGOS.filter(([k])=>pg[k]>0).map(([k,e])=>`${e} ₡${fmt(pg[k])}`).join(' · ')||'—';
const ciTxtFaltan=p=>`${plural(p.items.length+p.mas.length,'producto','productos')} · ${p.faltan?`falta${p.faltan===1?'':'n'} ${plural(p.faltan,'precio','precios')}`:'✓ todo con precio'}`;
const ciTxtDebe=c=>c.debe==null?'—':(c.debe<0?'− ₡':'₡')+fmt(Math.abs(c.debe));
function ciCuadre(c){
  if(c.llevo==null)return{cls:'',txt:'Escribí cuánto te llevaste'};
  if(c.regreso==null)return{cls:'',txt:`Tienen que volver ${ciTxtDebe(c)}`};
  if(c.dif===0)return{cls:'ok',txt:'✓ Cuadra perfecto'};
  return c.dif<0?{cls:'falta',txt:`Faltan ₡${fmt(-c.dif)}`}:{cls:'sobra',txt:`Sobran ₡${fmt(c.dif)}`};
}
const ciClaseProv=p=>!p.visto?'':p.faltan?'falta':'ok';
// El cierre ya no tiene botón en Pedido ni en Proveedores: tiene su propia pestaña en Ambos («Cierre de compras»).
function ciBarra(){return'';}
// ¿Hay algo que cerrar hoy? Pedido hecho, un cierre a medio llenar o algo enviado hoy (aunque se haya reiniciado el pedido).
function ciMostrar(){
  if(activeOrderSides().length<2)return false;
  const st=CI.st||ciLeer();
  if(ciVigente(st)&&ciTieneDatos(st))return true;
  if(xpTotals().items>0)return true;
  const ult=xpLatestSent(),hoy=new Date().toDateString();
  return !!ult&&new Date(ult.at).toDateString()===hoy;
}
const ciDia=(t,o={weekday:'long',day:'numeric',month:'long'})=>capital(new Date(t).toLocaleDateString('es-CR',o));

// ── Pestaña «Cierre de compras» (Ambos): seguir el cierre de hoy y los cierres guardados ──
function ciRenderTab(){
  const box=$('cierreBody');if(!box)return;
  const st=ciCargar(),c=ciCalc(st),curso=ciVigente(st)&&ciTieneDatos(st),hay=ciMostrar(),hist=LS.get('aramo_cierres',[])||[];
  const n=c.provs.length,listos=c.provs.filter(p=>p.visto&&!p.faltan).length;
  const hoyYa=!curso&&hist[0]&&new Date(hist[0].inicio).toDateString()===new Date().toDateString();   // ya se cerró una compra hoy
  const sub=curso?`${listos} de ${n} proveedores listos`:n?'Ya viene con lo que pidieron las dos tiendas':'Todavía no hay pedido para cerrar';
  const nProd=c.provs.reduce((k,p)=>k+p.items.length+p.mas.length,0);
  box.innerHTML=`<div class="cit">
    <section class="cit-hoy${hay?'':' vacio'}">
      <p class="cit-kick">${ico('recibo')}Cierre de compras</p>
      <h2 class="cit-fecha">${esc(ciDia(Date.now()))}</h2>
      ${n?`<div class="cit-chips${curso?'':' dos'}"><div><b>${n}</b><span>${n===1?'proveedor':'proveedores'}</span></div>${curso?`<div><b>${listos}</b><span>${listos===1?'listo':'listos'}</span></div><div><b>₡${fmt(c.total)}</b><span>hasta ahora</span></div>`:`<div><b>${nProd}</b><span>${nProd===1?'producto':'productos'}</span></div>`}</div>`:''}
      <button type="button" class="cit-cta" data-ci="abrir"${hay?'':' disabled'}><span class="cit-cta-i">${ico('recibo')}</span><span class="cit-cta-t"><b>${curso?'Seguir el cierre de hoy':hoyYa?'Empezar otro cierre':'Empezar el cierre de hoy'}</b><small>${esc(sub)}</small></span><span class="cit-cta-f">${ico('flecha')}</span></button>
    </section>
    <section class="cit-lista">
      <h3>Cierres guardados${hist.length?` <b>${hist.length}</b>`:''}</h3>
      ${hist.length?hist.map((x,j)=>ciTarjetaGuardado(x,j)).join(''):`<p class="cit-nada">Cuando termines un cierre, queda guardado acá con su PDF.</p>`}
    </section>
  </div>`;
  hojaPrecargar();
}
function ciTarjetaGuardado(x,j){
  const cu=ciCuadre(x),t=x.tiendas;
  return `<article class="cit-g">
    <div class="cit-g-t"><b>${esc(ciDia(x.inicio,{weekday:'long',day:'numeric',month:'short'}))}${x.firma?` <span>· ${esc(x.firma)}</span>`:''}</b>${x.llevo!=null?`<em class="${cu.cls}">${esc(cu.txt)}</em>`:''}</div>
    <div class="cit-g-n">${t?CI_TIENDAS.map(s=>`<div class="${s}"><small>${SIDE_NAME[s]}</small><b>₡${fmt(t[s].total)}</b></div>`).join(''):''}<div class="tot"><small>Total</small><b>₡${fmt(x.total)}</b></div></div>
    <div class="cit-g-b"><button type="button" class="pdf" data-ci="pdf-ver" data-ci-h="${j}">${ico('pdf')}Ver en PDF</button><button type="button" class="wa" data-ci="wa" data-ci-h="${j}">${ico('mensaje')}WhatsApp</button></div>
  </article>`;
}
$('cierreBody')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-ci]');if(!b||b.disabled)return;
  const a=b.dataset.ci;
  if(a==='abrir')return ciAbrir();
  const x=(LS.get('aramo_cierres',[])||[])[+b.dataset.ciH];if(!x)return;
  if(a==='pdf-ver')ciPdfVer(x);else if(a==='wa')ciPdfWhatsApp(x);
});

// ── Ventana del cierre ──
const ciPaso=(v,attr,label)=>`<span class="ci-q"><button type="button" data-ci="menos" tabindex="-1" aria-label="Uno menos">−</button><input ${attr} inputmode="decimal" enterkeyhint="next" autocomplete="off" value="${ciNum(v)}" aria-label="${label}"><button type="button" data-ci="mas1" tabindex="-1" aria-label="Uno más">+</button></span>`;
const ciPrecio=(v,attr,label,ph='precio',suf='')=>`<label class="ci-p"><span aria-hidden="true">₡</span><input ${attr} inputmode="numeric" enterkeyhint="next" autocomplete="off" value="${v>0?v:''}" placeholder="${ph}" aria-label="${label}">${suf?`<small aria-hidden="true">${suf}</small>`:''}</label>`;
// Un producto del pedido: el precio una sola vez y debajo UNA LÍNEA POR TIENDA con su cantidad y su monto.
function ciFila(it){
  return `<li class="ci-it${it.q>0?'':' cero'}${it.falta?' falta':''}${ciSaltoPrecio(it)?(it.cambio>0?' sube':' baja'):''}" data-ci-k="${esc(it.k)}">
    <div class="ci-it-n"><span class="ci-e" aria-hidden="true">${esc(it.e)}</span><b>${esc(it.t)}</b>${ciPrecio(it.precio,'data-ci-p',`Precio de ${esc(it.t)} por ${esc(it.u)}`,'precio','/ '+esc(it.u))}</div>
    <div class="ci-fs">${ciFilaTienda(it,'moravia')}${ciFilaTienda(it,'angeles')}</div>
    <small class="ci-ped" data-ci-v="ped">${esc(ciTxtPed(it))}</small>
  </li>`;
}
function ciFilaTienda(it,s){
  const m=s==='moravia',k=m?'m':'a',p=m?it.pm:it.pa,q=m?it.qm:it.qa;
  if(!(p>0))return'';
  return `<div class="ci-f ${s}"><span class="ci-fn"><b>${SIDE_NAME[s]}</b><small data-ci-v="pid${k}">${ciTxtPidio(p,q)}</small></span>${ciPaso(q,`data-ci-q${k}`,`${esc(it.u)} de ${esc(it.t)} para ${SIDE_NAME[s]}`)}<span class="ci-u">${esc(it.u)}</span><em data-ci-v="s${k}">${ciTxtMontoT(it,s)}</em></div>`;
}
// Los dos botones de tienda: en un producto que ya se agregó cambian de tienda; en el formulario nuevo
// guardan el producto de una vez.
const ciBotonesTienda=(sel,acc)=>`<div class="ci-dest" role="${sel===undefined?'group':'radiogroup'}" aria-label="Para qué tienda es">${CI_TIENDAS.map(s=>`<button type="button" class="${s}${sel===s?' on':''}"${sel===undefined?'':` role="radio" aria-checked="${sel===s}"`} data-ci="${acc}" data-ci-para="${s}">${SIDE_NAME[s]}</button>`).join('')}</div>`;
function ciFilaMas(x){
  return `<li class="ci-it mas${x.falta?' falta':''}" data-ci-mas="${esc(x.id)}">
    <div class="ci-it-n"><span class="ci-e" aria-hidden="true">🛒</span><input data-ci-mt value="${esc(x.t)}" placeholder="¿Qué compraste?" aria-label="Qué compraste" enterkeyhint="next" autocomplete="off"><button type="button" class="ci-del" data-ci="mas-del" aria-label="Quitar">✕</button></div>
    <div class="ci-it-c">${ciPaso(x.q,'data-ci-mq','Cantidad')}<span class="ci-u">${esc(uniCorta(x.u||''))}</span><span class="ci-por" aria-hidden="true">×</span>${ciPrecio(x.precio,'data-ci-mp','Precio')}</div>
    <div class="ci-masp"><span>Es de</span>${ciBotonesTienda(x.para,'mas-para')}<em data-ci-v="sub">${ciTxtSub(x)}</em></div>
  </li>`;
}
// «Algo que no estaba en el pedido»: nombre, cantidad y precio, y dos botones, uno por tienda. Tocar uno lo guarda en esa tienda.
function ciFormNuevo(){
  const b=CI.bor;
  return `<div class="ci-nuevo" data-ci-nuevo>
    <div class="ci-nuevo-h"><h5>Algo que no estaba en el pedido</h5><button type="button" class="ci-del" data-ci="mas-cancel" aria-label="Cancelar">✕</button></div>
    <input class="ci-nt" data-ci-bt value="${esc(b.t)}" placeholder="¿Qué compraste?" aria-label="Qué compraste" enterkeyhint="next" autocomplete="off">
    <div class="ci-it-c">${ciPaso(b.q,'data-ci-bq','Cantidad')}<span class="ci-un" role="group" aria-label="Unidad">${UNITS.map(u=>`<button type="button" data-ci="bu" data-ci-u="${u}" class="${u===b.u?'on':''}" aria-pressed="${u===b.u}">${u}</button>`).join('')}</span></div>
    <div class="ci-it-c">${ciPrecio(b.precio,'data-ci-bp','Precio','precio','por '+esc(b.u))}</div>
    <p class="ci-dest-t">¿Para cuál tienda es? <small>Tocá una y queda guardado</small></p>
    ${ciBotonesTienda(undefined,'mas-nueva')}
  </div>`;
}
function ciPasoProv(p){
  const cp=CI.st.provs[p.prov],form=CI.bor&&CI.bor.prov===p.prov;
  return `<section class="ci-prov" style="--c:${sxColor(p.prov)}">
    <div class="ci-prov-h"><span class="sx-av" aria-hidden="true">${esc(p.prov.charAt(0).toUpperCase())}</span><div><h4>${esc(p.prov)}</h4><small data-ci-v="pfaltan">${ciTxtFaltan(p)}</small></div><b class="ci-prov-tot" data-ci-v="ptot">₡${fmt(p.total)}</b></div>
    <div class="ci-prov-tiendas">${CI_TIENDAS.map(s=>`<span class="${s}"><i aria-hidden="true"></i><span>${SIDE_NAME[s]}</span><b data-ci-v="pt:${s}">₡${fmt(s==='moravia'?p.tm:p.ta)}</b></span>`).join('')}</div>
    <div class="ci-pago"><span id="ciPagoT">Le pagué con</span><div role="radiogroup" aria-labelledby="ciPagoT">${CI_PAGOS.map(([k,e,n])=>`<button type="button" role="radio" aria-checked="${k===p.pago}" class="${k}${k===p.pago?' on':''}" data-ci-pago="${k}"><span aria-hidden="true">${e}</span>${n}</button>`).join('')}</div></div>
    <ul class="ci-items">${p.items.map(ciFila).join('')}${p.mas.map(ciFilaMas).join('')}</ul>
    <button type="button" class="ci-reclamo${cp?.avisado?' hecho':''}" data-ci="reclamo"${ciFaltantes(p).length?'':' hidden'}>${ico('mensaje')}<span>${ciTxtReclamo(p,cp)}</span><em data-ci-v="nreclamo">${ciFaltantes(p).length}</em></button>
    ${form?ciFormNuevo():`<button type="button" class="ci-add" data-ci="mas-add">＋ Algo que no estaba en el pedido</button>`}
  </section>`;
}
const ciFilaGasto=g=>`<li class="ci-g" data-ci-g="${esc(g.id)}"><input data-ci-gt value="${esc(g.t)}" placeholder="¿Qué fue?" aria-label="Qué gasto fue" enterkeyhint="next" autocomplete="off">${ciPrecio(g.monto,'data-ci-gm','Cuánto fue','0')}<button type="button" class="ci-gp ${g.pago}" data-ci="g-pago" aria-label="Pagado con ${CI_PAGO_NOMBRE[g.pago]}; tocá para cambiar">${CI_PAGO_NOMBRE[g.pago]}</button><button type="button" class="ci-del" data-ci="g-del" aria-label="Quitar gasto">✕</button></li>`;
// Las dos tiendas, cada una con lo suyo (la usan el cierre y la pantalla de «guardado»).
const ciTiendasHtml=c=>`<div class="ci-tiendas">${CI_TIENDAS.map(s=>{const t=c.tiendas[s];return`<div class="ci-td ${s}"><span>${SIDE_NAME[s]}</span><strong data-ci-v="t:${s}">₡${fmt(t.total)}</strong><small data-ci-v="tc:${s}">Compras ₡${fmt(t.compras)}</small><small data-ci-v="tg:${s}">${ciTxtGastos(t)}</small><small class="ci-td-p" data-ci-v="tp:${s}">${ciTxtPagos(t.pago)}</small></div>`;}).join('')}</div>`;
function ciPasoCierre(c,st){
  const n=c.provs.length,cu=ciCuadre(c),faltan=c.provs.map((p,j)=>p.faltan?j:-1).filter(j=>j>=0);
  return `<section class="ci-fin">
    <div class="ci-hero">
      <small>Total de compras${c.gastado?' y gastos':''}</small><strong data-ci-v="total">₡${fmt(c.total)}</strong>
      <div class="ci-tres">${CI_PAGOS.map(([k,e,nm])=>`<div class="${k}"><span>${e} ${nm}</span><b data-ci-v="pp:${k}">₡${fmt(c.porPago[k])}</b></div>`).join('')}</div>
    </div>
    <div class="ci-tiendas-w">
      <h4>Lo que gastó cada tienda</h4>
      ${ciTiendasHtml(c)}
      ${c.gastos.length?'<p class="ci-nota">Los gastos del viaje se reparten según lo que compró cada tienda.</p>':''}
    </div>
    ${n?'':`<p class="ci-aviso">Todavía no hay pedido: el cierre sale de lo que pidieron las tiendas.</p>`}
    ${faltan.length?`<p class="ci-aviso">⚠️ Falta precio en ${faltan.map(j=>`<button type="button" data-ci-ir="${j}">${esc(c.provs[j].prov)}</button>`).join(' ')}</p>`:''}
    <div class="ci-caja">
      <h4>💵 Cuadre del efectivo</h4>
      <div class="ci-linea"><span>Me llevé</span>${ciPrecio(st.llevo,'data-ci-llevo','Cuánta plata en efectivo te llevaste','0')}</div>
      <div class="ci-linea"><span>Pagué en efectivo</span><b data-ci-v="ef">− ₡${fmt(c.porPago.efectivo)}</b></div>
      <div class="ci-linea total"><span>Tienen que volver</span><b data-ci-v="debe">${ciTxtDebe(c)}</b></div>
      <div class="ci-linea"><span>Regresé</span>${ciPrecio(st.regreso,'data-ci-regreso','Cuánta plata en efectivo regresaste','0')}</div>
      <p class="ci-res ${cu.cls}" data-ci-res role="status">${cu.txt}</p>
    </div>
    <div class="ci-gastos">
      <h4>🚚 Gastos del viaje <small>también entran en el cierre</small></h4>
      ${c.gastos.length?`<ul>${c.gastos.map(ciFilaGasto).join('')}</ul>`:''}
      <div class="ci-gchips">${CI_GASTOS.map(g=>`<button type="button" data-ci-gadd="${g}">＋ ${g}</button>`).join('')}<button type="button" data-ci-gadd="">＋ Otro</button></div>
    </div>
    ${(cambios=>cambios.length?`<div class="ci-cambios"><h4>📈 Precios que cambiaron <small>desde 10 % contra la vez pasada</small></h4><ul>${cambios.map(it=>`<li class="${it.cambio>0?'sube':'baja'}"><span class="ci-cb-n"><span aria-hidden="true">${esc(it.e)}</span> <b>${esc(it.t)}</b> <small>${esc(it.prov)}</small></span><span class="ci-cb-p">₡${fmt(it.ref)} → <b>₡${fmt(it.precio)}</b> <em>${it.cambio>0?'▲':'▼'} ${ciCambioPct(it)}</em></span></li>`).join('')}</ul></div>`:'')(ciCambios(c))}
    ${n?`<div class="ci-lista"><h4>Por proveedor</h4>${c.provs.map((p,j)=>`<button type="button" class="ci-lp${p.faltan?' falta':''}" data-ci-ir="${j}" style="--c:${sxColor(p.prov)}"><span class="sx-av" aria-hidden="true">${esc(p.prov.charAt(0).toUpperCase())}</span><span class="ci-lp-t"><b>${esc(p.prov)}</b><small>${CI_PAGO_NOMBRE[p.pago]}${p.faltan?' · falta precio':''}</small><span class="ci-lp-s"><i class="moravia">Moravia ₡${fmt(p.tm)}</i><i class="angeles">Los Ángeles ₡${fmt(p.ta)}</i></span></span><em>₡${fmt(p.total)}</em></button>`).join('')}</div>`:''}
    <div class="sx-pdf-firma ci-firma"><span id="ciFirmaT">¿Quién hizo las compras?</span><div role="radiogroup" aria-labelledby="ciFirmaT">${HOJA_FIRMAS.map(f=>`<button type="button" role="radio" aria-checked="${f===st.firma}" class="${f===st.firma?'on':''}" data-ci-firma="${f}">${f}</button>`).join('')}</div></div>
  </section>`;
}
// Después de «Terminar y guardar»: el cierre ya está guardado; se manda a WhatsApp como PDF o se ve.
function ciPasoHecho(e){
  return `<section class="ci-hecho">
    <div class="ci-hecho-ok" aria-hidden="true">${ico('listo')}</div>
    <h4>¡Cierre guardado!</h4>
    <p>${esc(ciDia(e.inicio))} · ₡${fmt(e.total)}</p>
    ${ciTiendasHtml(e)}
    <button type="button" class="sx-pdf-wa" data-ci="wa-hecho">${ico('mensaje')}Mandar el cierre a mi WhatsApp</button>
    <button type="button" class="ci-pdf-ver" data-ci="pdf-hecho">${ico('pdf')}Ver en PDF</button>
    ${hojaPuedeCompartir()?'':`<label class="sx-pdf-num ci-num"><span>Mi número de WhatsApp</span><input id="ciNum" type="tel" inputmode="tel" autocomplete="tel" placeholder="8888 8888" value="${esc(hojaMiNumero())}"></label>`}
    <p class="ci-hecho-ayuda">${hojaPuedeCompartir()?'Se abre WhatsApp con el PDF: elegí tu propio chat y tocá enviar.':'Se descarga el PDF y se abre tu WhatsApp: adjuntalo con el clip 📎 y enviá.'} Lo encontrás siempre en «Cierres guardados».</p>
  </section>`;
}
function ciIndice(c){const i=c.provs.findIndex(p=>p.prov===CI.st.paso);return i>=0?i:CI.st.paso===''||!c.provs.length?c.provs.length:0;}
function ciPintar(){
  const h=$('sxCierre');if(!h)return;
  if(CI.hecho){
    const e=CI.hecho;
    h.innerHTML=`<div class="ci-in" role="dialog" aria-modal="true" aria-labelledby="ciTit">
      <header class="ci-cab"><span class="ci-ico" aria-hidden="true">${ico('recibo')}</span><div class="ci-cab-t"><h3 id="ciTit">Cierre de compras</h3><p>${esc(ciDia(e.inicio))}</p></div><button type="button" class="sx-ed-x" data-ci="cerrar" aria-label="Cerrar">✕</button></header>
      <div class="ci-cuerpo">${ciPasoHecho(e)}</div>
      <footer class="ci-pie"><button type="button" class="ci-sig listo" data-ci="cerrar"><span><b>Listo</b></span></button></footer>
    </div>`;
    return;
  }
  const st=CI.st,c=ciCalc(st),n=c.provs.length,i=ciIndice(c),p=c.provs[i];
  st.paso=p?p.prov:'';
  const viejo=h.querySelector('.ci-cuerpo'),scroll=CI.pintado===st.paso&&viejo?viejo.scrollTop:0;
  h.innerHTML=`<div class="ci-in" role="dialog" aria-modal="true" aria-labelledby="ciTit">
    <header class="ci-cab">
      <span class="ci-ico" aria-hidden="true">${ico('recibo')}</span>
      <div class="ci-cab-t"><h3 id="ciTit">Cierre de compras</h3><p>${esc(ciDia(st.inicio))}</p></div>
      <div class="ci-cab-tot"><small>Compras</small><b data-ci-v="total">₡${fmt(c.total)}</b></div>
      <button type="button" class="sx-ed-x" data-ci="cerrar" aria-label="Cerrar">✕</button>
    </header>
    <nav class="ci-pasos" aria-label="Proveedores">${c.provs.map((q,j)=>`<button type="button" data-ci-ir="${j}" class="${ciClaseProv(q)}${j===i?' on':''}" style="--c:${sxColor(q.prov)}"${j===i?' aria-current="step"':''}><i aria-hidden="true"></i>${esc(q.prov)}</button>`).join('')}<button type="button" data-ci-ir="${n}" class="fin${i===n?' on':''}"${i===n?' aria-current="step"':''}>🧾 Cierre</button></nav>
    <form class="ci-cuerpo" novalidate>${p?ciPasoProv(p):ciPasoCierre(c,st)}</form>
    <footer class="ci-pie">
      <button type="button" class="ci-ant" data-ci="ant"${i?'':' disabled'} aria-label="Anterior">‹</button>
      ${p?`<button type="button" class="ci-sig" data-ci="sig"><span>${i<n-1?`Siguiente: <b>${esc(c.provs[i+1].prov)}</b>`:'<b>Ver el cierre</b>'}</span><i aria-hidden="true">›</i></button>`
        :`<button type="button" class="ci-sig guardar" data-ci="guardar"${n||c.gastos.length?'':' disabled'}><span><b>✓ Terminar y guardar</b></span></button>`}
    </footer>
  </div>`;
  CI.pintado=st.paso;CI.seguro=0;
  const cuerpo=h.querySelector('.ci-cuerpo');if(scroll)cuerpo.scrollTop=scroll;
  const on=h.querySelector('.ci-pasos .on'),nav=on?.parentElement;
  if(on)nav.scrollLeft=on.offsetLeft-(nav.clientWidth-on.offsetWidth)/2;
}
// Cambia solo los números (sin volver a dibujar) para no sacar el teclado mientras se escribe.
function ciPatch(){
  const h=$('sxCierre');if(!h||CI.hecho)return;
  const st=CI.st,c=ciCalc(st),p=c.provs.find(x=>x.prov===st.paso);
  const pon=(root,k,txt)=>root.querySelectorAll(`[data-ci-v="${k}"]`).forEach(el=>{if(el.textContent!==txt)el.textContent=txt;});
  pon(h,'total','₡'+fmt(c.total));
  CI_PAGOS.forEach(([k])=>pon(h,'pp:'+k,'₡'+fmt(c.porPago[k])));
  pon(h,'ef','− ₡'+fmt(c.porPago.efectivo));pon(h,'debe',ciTxtDebe(c));
  const r=h.querySelector('[data-ci-res]');if(r){const cu=ciCuadre(c);r.textContent=cu.txt;r.className='ci-res '+cu.cls;}
  CI_TIENDAS.forEach(s=>{const t=c.tiendas[s];pon(h,'t:'+s,'₡'+fmt(t.total));pon(h,'tc:'+s,'Compras ₡'+fmt(t.compras));pon(h,'tg:'+s,ciTxtGastos(t));pon(h,'tp:'+s,ciTxtPagos(t.pago));});
  if(p){
    pon(h,'ptot','₡'+fmt(p.total));pon(h,'pfaltan',ciTxtFaltan(p));pon(h,'pt:moravia','₡'+fmt(p.tm));pon(h,'pt:angeles','₡'+fmt(p.ta));
    p.items.forEach(it=>{
      const li=h.querySelector(`[data-ci-k="${CSS.escape(it.k)}"]`);if(!li)return;
      li.classList.toggle('cero',!(it.q>0));li.classList.toggle('falta',it.falta);pon(li,'ped',ciTxtPed(it));
      li.classList.toggle('sube',ciSaltoPrecio(it)&&it.cambio>0);li.classList.toggle('baja',ciSaltoPrecio(it)&&it.cambio<0);
      pon(li,'sm',ciTxtMontoT(it,'moravia'));pon(li,'sa',ciTxtMontoT(it,'angeles'));
      pon(li,'pidm',ciTxtPidio(it.pm,it.qm));pon(li,'pida',ciTxtPidio(it.pa,it.qa));
    });
    p.mas.forEach(x=>{const li=h.querySelector(`[data-ci-mas="${CSS.escape(x.id)}"]`);if(!li)return;li.classList.toggle('falta',x.falta);pon(li,'sub',ciTxtSub(x));});
    const rb=h.querySelector('[data-ci="reclamo"]');if(rb){const k=ciFaltantes(p).length;rb.hidden=!k;pon(rb,'nreclamo',String(k));}
  }
  c.provs.forEach((q,j)=>{const b=h.querySelector(`.ci-pasos [data-ci-ir="${j}"]`);if(b)b.className=ciClaseProv(q)+(q.prov===st.paso?' on':'');});
}
function ciAbrir(){
  ciCargar();
  ciSubirNube();   // sube los cierres viejos que todavía no tienen copia en la nube
  let h=$('sxCierre');
  if(!h){
    h=document.createElement('div');h.id='sxCierre';h.className='ci';document.body.appendChild(h);
    h.addEventListener('click',ciClick);
    h.addEventListener('input',e=>ciEntrada(e.target));
    h.addEventListener('change',ciCambio);
    h.addEventListener('keydown',ciTecla);
    h.addEventListener('submit',e=>e.preventDefault());
    // Al entrar a un número se marca entero: se escribe encima sin borrar.
    h.addEventListener('focusin',e=>{const t=e.target;if(t.matches?.('input[inputmode]'))setTimeout(()=>{try{if(document.activeElement===t)t.select();}catch{}},0);});
  }
  CI.hecho=null;CI.bor=null;CI.pintado=null;ciPintar();
  document.documentElement.classList.add('ci-abierto');
  requestAnimationFrame(()=>h.classList.add('open'));
  hojaPrecargar();
}
function ciCerrar(guardar=true){
  const h=$('sxCierre');if(!h)return;
  if(guardar&&!CI.hecho)ciGuardarAhora();
  if(h.contains(document.activeElement))document.activeElement.blur(); // guarda el precio que se estaba escribiendo
  h.classList.remove('open');document.documentElement.classList.remove('ci-abierto');
  CI.hecho=null;CI.bor=null;
  sxRenderTablero();xpRefresh();
  if($('view-cierre')?.classList.contains('active'))ciRenderTab();
}
function ciIr(j){
  const st=CI.st,c=ciCalc(st),n=c.provs.length;
  j=Math.max(0,Math.min(n,j));
  if(st.provs[st.paso])st.provs[st.paso].visto=true;
  st.paso=j<n?c.provs[j].prov:'';
  CI.bor=null;
  ciGuardar();ciPintar();
}
function ciClick(e){
  const h=$('sxCierre'),st=CI.st;
  if(e.target===h)return ciCerrar();
  if(CI.hecho){
    const a=e.target.closest('[data-ci]')?.dataset.ci;
    if(a==='cerrar')ciCerrar(false);else if(a==='wa-hecho')ciPdfWhatsApp(CI.hecho);else if(a==='pdf-hecho')ciPdfVer(CI.hecho);
    return;
  }
  const ir=e.target.closest('[data-ci-ir]');if(ir)return ciIr(+ir.dataset.ciIr);
  const pg=e.target.closest('[data-ci-pago]'),cp=st.provs[st.paso];
  if(pg&&cp){
    cp.pago=pg.dataset.ciPago;cp.visto=true;ciRecordarPago(st.paso,cp.pago);
    pg.parentElement.querySelectorAll('[data-ci-pago]').forEach(b=>{b.classList.toggle('on',b===pg);b.setAttribute('aria-checked',b===pg);});
    ciGuardar();ciPatch();buzz(8);return;
  }
  const ga=e.target.closest('[data-ci-gadd]');
  if(ga){
    const g={id:ciId(),t:ga.dataset.ciGadd,monto:null,pago:'efectivo'};
    st.gastos.push(g);ciGuardar();ciPintar();
    h.querySelector(`[data-ci-g="${g.id}"] ${g.t?'[data-ci-gm]':'[data-ci-gt]'}`)?.focus();return;
  }
  const fi=e.target.closest('[data-ci-firma]');
  if(fi){
    st.firma=fi.dataset.ciFirma;ciGuardar();
    h.querySelectorAll('[data-ci-firma]').forEach(b=>{b.classList.toggle('on',b===fi);b.setAttribute('aria-checked',b===fi);});return;
  }
  const bt=e.target.closest('[data-ci]'),a=bt?.dataset.ci;if(!a)return;
  const gid=e.target.closest('[data-ci-g]')?.dataset.ciG,g=st.gastos.find(x=>x.id===gid);
  if(a==='cerrar')ciCerrar();
  else if(a==='ant'||a==='sig')ciIr(ciIndice(ciCalc(st))+(a==='sig'?1:-1));
  else if(a==='menos'||a==='mas1'){
    const inp=e.target.closest('.ci-q')?.querySelector('input');if(!inp)return;
    inp.value=ciNum(Math.max(0,ciCant(inp.value)+(a==='mas1'?1:-1)));ciEntrada(inp);buzz(8);
  }else if(a==='mas-add'&&cp){
    CI.bor={prov:st.paso,t:'',q:1,u:'kg',precio:null};ciPintar();
    h.querySelector('[data-ci-bt]')?.focus();
    setTimeout(()=>h.querySelector('[data-ci-nuevo]')?.scrollIntoView({block:'center',behavior:'smooth'}),60);
  }else if(a==='mas-cancel'){CI.bor=null;ciPintar();}
  else if(a==='bu'){
    if(!CI.bor)return;CI.bor.u=bt.dataset.ciU;
    bt.parentElement.querySelectorAll('[data-ci="bu"]').forEach(b=>{const on=b===bt;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
    const sf=h.querySelector('[data-ci-nuevo] .ci-p small');if(sf)sf.textContent='por '+CI.bor.u;
  }
  else if(a==='mas-nueva'&&cp)ciMasGuardar(bt.dataset.ciPara);
  else if(a==='mas-del'&&cp){
    const id=e.target.closest('[data-ci-mas]')?.dataset.ciMas;cp.mas=cp.mas.filter(x=>x.id!==id);ciGuardar();ciPintar();
  }else if(a==='mas-para'&&cp){
    const x=cp.mas.find(m=>m.id===e.target.closest('[data-ci-mas]')?.dataset.ciMas);if(!x)return;
    x.para=bt.dataset.ciPara;ciGuardar();ciPintar();buzz(8);
  }else if(a==='g-del'){st.gastos=st.gastos.filter(x=>x.id!==gid);ciGuardar();ciPintar();}
  else if(a==='g-pago'&&g){const ks=CI_PAGOS.map(x=>x[0]);g.pago=ks[(ks.indexOf(g.pago)+1)%ks.length];ciGuardar();ciPintar();}
  else if(a==='guardar')ciTerminar(bt);
  else if(a==='reclamo')ciReclamar(ciCalc(st).provs.find(x=>x.prov===st.paso));
}
// Un toque en Moravia o en Los Ángeles guarda lo de «Algo que no estaba en el pedido» en esa tienda. Sin pasos de más.
function ciMasGuardar(para){
  const st=CI.st,cp=st.provs[st.paso],b=CI.bor,h=$('sxCierre');if(!cp||!b||!CI_TIENDAS.includes(para))return;
  const t=String(b.t||'').trim();
  if(!t){toast('Escribí qué compraste','err');h.querySelector('[data-ci-bt]')?.focus();return;}
  if(!(b.q>0)){toast('Poné cuántos compraste','err');return;}
  const x={id:ciId(),t,q:b.q,u:b.u,precio:b.precio>0?b.precio:null,para};
  const prod=ciCosto(st.paso,t,b.u,x.precio);   // el precio queda como costo de ese proveedor (se crea el producto si no estaba)
  if(prod){x.u=normUnit(prod.unit);x.t=prod.name;}   // con el nombre y la unidad del producto del proveedor
  cp.mas.push(x);cp.visto=true;CI.bor=null;
  ciInvalidar();ciGuardarAhora();ciPintar();buzz(12);
  h.querySelector(`[data-ci-mas="${x.id}"]`)?.scrollIntoView({block:'nearest'});
  toast(`✓ ${t} guardado para ${SIDE_NAME[para]}${prod?' · costo anotado':''}`,'ok');
}
function ciEntrada(t){
  if(t.id==='ciNum'){LS.set('aramo_mi_wa',t.value.trim());return;}   // el WhatsApp propio (compu): el mismo número del PDF del pedido
  const st=CI.st,cp=st.provs[st.paso],num=v=>ciVacio(v)?null:ciPlata(v);
  if(t.matches('[data-ci-bt],[data-ci-bq],[data-ci-bp]')){   // el formulario nuevo: todavía no cuenta en el cierre
    const b=CI.bor;if(!b)return;
    if(t.matches('[data-ci-bt]'))b.t=t.value;else if(t.matches('[data-ci-bq]'))b.q=ciCant(t.value);else b.precio=num(t.value);
    return;
  }
  if(t.matches('[data-ci-p],[data-ci-qm],[data-ci-qa]')){
    const it=cp?.items[t.closest('[data-ci-k]')?.dataset.ciK];if(!it)return;
    if(t.matches('[data-ci-p]')){
      // El precio de antes se guarda la primera vez que se escribe el de hoy (después el de hoy queda como precio del producto).
      if(it.precio==null&&it.ref==null){const r=ciPrecioAntes(st.paso,it);if(r>0)it.ref=r;}
      it.precio=num(t.value);
    }else it[t.matches('[data-ci-qm]')?'qm':'qa']=ciVacio(t.value)?null:ciCant(t.value);   // cada tienda con su cantidad
    cp.visto=true;
  }else if(t.matches('[data-ci-mt],[data-ci-mq],[data-ci-mp]')){
    const x=cp?.mas.find(m=>m.id===t.closest('[data-ci-mas]')?.dataset.ciMas);if(!x)return;
    if(t.matches('[data-ci-mt]'))x.t=t.value;else if(t.matches('[data-ci-mq]'))x.q=ciCant(t.value);else x.precio=num(t.value);
  }else if(t.matches('[data-ci-llevo]'))st.llevo=num(t.value);
  else if(t.matches('[data-ci-regreso]'))st.regreso=num(t.value);
  else if(t.matches('[data-ci-gt],[data-ci-gm]')){
    const g=st.gastos.find(x=>x.id===t.closest('[data-ci-g]')?.dataset.ciG);if(!g)return;
    if(t.matches('[data-ci-gt]'))g.t=t.value;else g.monto=num(t.value);
  }else return;
  ciGuardar();ciProgramarPatch();
}
// Al salir de un campo: el vacío vuelve a lo pedido / al precio anterior, y el precio de hoy queda
// guardado para el próximo cierre y como COSTO del producto con ese proveedor (si es la misma unidad;
// si el producto no existe con ese proveedor, se crea).
function ciCambio(e){
  const t=e.target,st=CI.st,prov=st.paso;
  if(t.matches('[data-ci-mt],[data-ci-mp]')){   // algo agregado: su precio también es costo
    const x=st.provs[prov]?.mas.find(m=>m.id===t.closest('[data-ci-mas]')?.dataset.ciMas);
    if(x?.precio>0&&String(x.t||'').trim()){const prod=ciCosto(prov,x.t,x.u||'kg',x.precio);if(prod)x.u=normUnit(prod.unit);ciGuardar();}
    return;
  }
  const k=t.closest('[data-ci-k]')?.dataset.ciK;
  if(!k||!t.matches('[data-ci-p],[data-ci-qm],[data-ci-qa]'))return;
  const it=st.provs[prov]?.items[k],calc=ciCalc(st).provs.find(p=>p.prov===prov)?.items.find(x=>x.k===k);if(!it||!calc)return;
  if(t.matches('[data-ci-qm],[data-ci-qa]')){t.value=ciNum(t.matches('[data-ci-qm]')?calc.qm:calc.qa);return;}
  t.value=calc.precio>0?calc.precio:'';
  if(!(it.precio>0))return;
  const m=ciPrecios();m[prov+'|'+k]=it.precio;LS.set('aramo_cierre_precios',m);
  if(it.pid){if(it.base&&String(it.precio)!==String(getPrice(prov,it.pid)))setPrice(prov,it.pid,String(it.precio));}
  else ciCosto(prov,it.t,it.uni||'kg',it.precio);   // algo que se pidió como «extra»: se vuelve producto del proveedor
}
// Enter salta al precio siguiente (o al campo siguiente): se llenan todos sin tocar la pantalla.
function ciTecla(e){
  const t=e.target;
  if(e.key!=='Enter'||t.tagName!=='INPUT')return;
  e.preventDefault();
  const todos=[...$('sxCierre').querySelectorAll('.ci-cuerpo input')],resto=todos.slice(todos.indexOf(t)+1);
  const sig=t.matches('[data-ci-p]')?resto.find(x=>x.matches('[data-ci-p]')):resto[0];
  if(sig){sig.focus();sig.scrollIntoView({block:'nearest'});}else t.blur();
}
function ciTerminar(btn){
  // Se toca dos veces para no cerrarlo sin querer.
  if(Date.now()-CI.seguro>4000){CI.seguro=Date.now();btn.classList.add('seguro');btn.innerHTML='<span><b>¿Terminar? Tocá otra vez</b></span>';buzz(12);return;}
  ciGuardarAhora();
  const e=ciArchivar(CI.st);
  CI.st=ciNuevo();LS.set('aramo_cierre',null);ciInvalidar();
  CI.hecho=e;ciPintar();
  ciPdfObtener(e).catch(()=>{});   // el PDF se arma ya, así «Mandar a mi WhatsApp» responde en el mismo toque
  buzz(16);toast('✓ Cierre guardado','ok');
}
// ── PDF del cierre: limpio y profesional (jsPDF, igual que el PDF del pedido) ──
// ARAMO arriba, la fecha, cada proveedor con sus productos POR TIENDA, los pagos por método, el total de cada
// tienda y el cuadre del efectivo. Se manda al WhatsApp propio como archivo.
const CI_PDF={marca:[14,74,48],tinta:[17,24,39],suave:[104,112,108],raya:[225,229,226],fondo:[246,248,246],blanco:[255,255,255],
  mor:[21,99,52],morF:[230,244,234],ang:[163,66,14],angF:[255,237,224],verde:[22,101,52],verdeF:[220,252,231],rojo:[185,28,28],rojoF:[254,226,226],azul:[30,64,175],azulF:[219,234,254],
  pago:{efectivo:[[22,101,52],[220,252,231]],tarjeta:[[30,64,175],[219,234,254]],sinpe:[[88,28,135],[243,232,255]]}};
const ciM=n=>hojaTxt('₡'+fmt(n));
const ciQU=(q,u)=>hojaTxt(fmtQ(q)+(u?' '+u:''));
function ciPdfDibujar(doc,c){
  const C=CI_PDF,W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=40,R=W-M,PIE=H-44;
  let y=M,pag=1;
  const fu=(sz,est='normal',col=C.tinta)=>{doc.setFont('helvetica',est);doc.setFontSize(sz);doc.setTextColor(...col);};
  const tx=(s,x,yy,o={})=>doc.text(hojaTxt(s),x,yy,{baseline:'top',...o});
  const caja=(x,yy,w,h,col,r=0)=>{doc.setFillColor(...col);if(r)doc.roundedRect(x,yy,w,h,r,r,'F');else doc.rect(x,yy,w,h,'F');};
  const raya=(yy,col=C.raya,x1=M,x2=R,g=.6)=>{doc.setDrawColor(...col);doc.setLineWidth(g);doc.line(x1,yy,x2,yy);};
  const ancho=(s,sz,est)=>{fu(sz,est);return doc.getTextWidth(hojaTxt(s));};
  const cortar=(s,sz,est,max)=>{fu(sz,est);return doc.splitTextToSize(hojaTxt(s),max)[0]||'';};
  const nueva=()=>{doc.addPage('letter');pag++;y=M;fu(9,'bold',C.marca);tx('ARAMO',M,y);fu(8.5,'normal',C.suave);tx('Cierre de compras · '+hojaFecha(new Date(c.inicio)),M+40,y+.7);raya(y+16,C.raya);y+=28;};
  const espacio=h=>{if(y+h>PIE)nueva();};
  const seccion=(t,extra=0)=>{espacio(34+extra);fu(9,'bold',C.marca);tx(t.toUpperCase(),M,y,{charSpace:.6});y+=15;};
  // Columnas (bordes derechos): precio | Moravia cant. y monto | Los Ángeles cant. y monto
  const X={pre:300,mc:364,mm:440,ac:504,am:R};
  // Encabezado de la primera página
  caja(M,y,30,30,C.marca,8);fu(19,'bold',C.blanco);tx('A',M+15,y+6,{align:'center'});
  fu(19,'bold',C.marca);tx('ARAMO',M+40,y+1);fu(9.5,'normal',C.suave);tx('Cierre de compras',M+40,y+22);
  fu(11,'bold',C.tinta);tx(hojaFecha(new Date(c.inicio)),R,y+3,{align:'right'});
  fu(9,'normal',C.suave);tx(c.firma?'Compras hechas por '+c.firma:'Cierre de las compras del día',R,y+19,{align:'right'});
  y+=40;raya(y,C.marca,M,R,1.2);y+=14;
  // Tres cifras grandes: total y cada tienda
  const cw=(R-M-16)/3,t=c.tiendas||{moravia:{total:0,compras:0,gastos:0},angeles:{total:0,compras:0,gastos:0}};
  [['Total de compras'+(c.gastado?' y gastos':''),c.total,C.fondo,C.tinta,'Compras '+ciM(c.compras)+(c.gastado?' + gastos '+ciM(c.gastado):'')],
   ['Moravia',t.moravia.total,C.morF,C.mor,'Compras '+ciM(t.moravia.compras)+(t.moravia.gastos?' + gastos '+ciM(t.moravia.gastos):'')],
   ['Los Ángeles',t.angeles.total,C.angF,C.ang,'Compras '+ciM(t.angeles.compras)+(t.angeles.gastos?' + gastos '+ciM(t.angeles.gastos):'')]].forEach(([l,v,f,col,s],i)=>{
    const x=M+i*(cw+8);caja(x,y,cw,62,f,8);
    fu(8,'bold',col);tx(l.toUpperCase(),x+10,y+9,{charSpace:.4});fu(18,'bold',col);tx(ciM(v),x+10,y+23);fu(7.5,'normal',C.suave);tx(cortar(s,7.5,'normal',cw-16),x+10,y+47);
  });
  y+=78;
  // Compras por proveedor
  if(c.provs.length){
    seccion('Compras por proveedor',80);
    c.provs.forEach(p=>{
      const filas=[...p.items.map(it=>({it})),...p.mas.filter(x=>x.q>0).map(x=>({x}))];
      espacio(22+26+16+18);
      // Encabezado del proveedor: nombre, cómo se pagó y total
      caja(M,y,R-M,22,C.fondo,6);fu(11,'bold',C.tinta);tx(p.prov,M+9,y+5.5);
      const pg=C.pago[p.pago]||C.pago.efectivo,pn=CI_PAGOS.find(z=>z[0]===p.pago)?.[2]||'',pw=ancho(pn,8,'bold')+14;
      fu(11,'bold',C.tinta);const tw=ancho(ciM(p.total),11,'bold');tx(ciM(p.total),R-9,y+5.5,{align:'right'});
      caja(R-9-tw-10-pw,y+5,pw,12,pg[1],6);fu(8,'bold',pg[0]);tx(pn,R-9-tw-10-pw/2,y+8,{align:'center'});
      y+=26;
      // Títulos de columnas, con la tienda arriba
      fu(7.5,'bold',C.mor);tx('MORAVIA',(X.mc+X.mm)/2+8,y,{align:'center',charSpace:.3});fu(7.5,'bold',C.ang);tx('LOS ÁNGELES',(X.ac+X.am)/2+8,y,{align:'center',charSpace:.3});
      y+=10;raya(y,C.mor,X.mc-44,X.mm,.8);raya(y,C.ang,X.ac-44,X.am,.8);y+=3;
      fu(7.5,'bold',C.suave);tx('Producto',M+4,y);tx('Precio',X.pre,y,{align:'right'});[['Cant.',X.mc],['Monto',X.mm],['Cant.',X.ac],['Monto',X.am]].forEach(([s,x])=>tx(s,x,y,{align:'right'}));
      y+=12;
      filas.forEach(({it,x},i)=>{
        espacio(16);
        if(i%2===0)caja(M,y-2.5,R-M,15,[250,251,250]);
        if(it){
          const no=!(it.q>0);fu(9,no?'italic':'normal',no?C.suave:C.tinta);tx(cortar(it.t,9,no?'italic':'normal',X.pre-M-62),M+4,y);
          if(no){fu(8.5,'italic',C.suave);tx('No vino (pediste '+ciQU(it.pedido,it.u)+')',X.am,y+.3,{align:'right'});}
          else{
            fu(9,'normal',C.suave);tx(it.precio>0?ciM(it.precio):'-',X.pre,y,{align:'right'});
            const una=(p,q,m,xc,xm,col)=>{if(p>0){fu(9,'normal',C.tinta);tx(ciQU(q,it.u),xc,y,{align:'right'});fu(9,'bold',col);tx(q>0&&it.precio>0?ciM(m):'-',xm,y,{align:'right'});}else{fu(9,'normal',[190,196,192]);tx('-',xm,y,{align:'right'});}};
            una(it.pm,it.qm,it.sm,X.mc,X.mm,C.mor);una(it.pa,it.qa,it.sa,X.ac,X.am,C.ang);
          }
        }else{
          fu(9,'normal',C.tinta);tx('+ '+cortar(x.t||'Otro',9,'normal',X.pre-M-96),M+4,y);fu(7,'italic',C.suave);tx('fuera del pedido',M+4+ancho('+ '+cortar(x.t||'Otro',9,'normal',X.pre-M-96),9,'normal')+5,y+1.6);
          fu(9,'normal',C.suave);tx(x.precio>0?ciM(x.precio):'-',X.pre,y,{align:'right'});
          const m=x.para==='moravia'||x.para==='mitad',a=x.para==='angeles'||x.para==='mitad',f=x.para==='mitad'?.5:1;
          if(m){fu(9,'normal',C.tinta);tx(ciQU(x.q*f,x.u),X.mc,y,{align:'right'});fu(9,'bold',C.mor);tx(x.precio>0?ciM(x.sm):'-',X.mm,y,{align:'right'});}
          if(a){fu(9,'normal',C.tinta);tx(ciQU(x.q*f,x.u),X.ac,y,{align:'right'});fu(9,'bold',C.ang);tx(x.precio>0?ciM(x.sa):'-',X.am,y,{align:'right'});}
        }
        y+=15;
      });
      espacio(22);raya(y,C.raya,M,R,.8);y+=5;
      fu(9,'bold',C.tinta);tx('Total '+p.prov,M+4,y);
      fu(9.5,'bold',C.mor);tx(ciM(p.tm),X.mm,y,{align:'right'});fu(9.5,'bold',C.ang);tx(ciM(p.ta),X.am,y,{align:'right'});
      y+=26;
    });
  }
  // Gastos del viaje
  if(c.gastos.length){
    seccion('Gastos del viaje',44);
    fu(7.5,'bold',C.suave);tx('Gasto',M+4,y);tx('Pagado con',200,y);tx('Total',X.pre,y,{align:'right'});tx('Moravia',X.mm,y,{align:'right'});tx('Los Ángeles',X.am,y,{align:'right'});y+=12;
    c.gastos.forEach((g,i)=>{
      espacio(16);if(i%2===0)caja(M,y-2.5,R-M,15,[250,251,250]);
      fu(9,'normal',C.tinta);tx(cortar(g.t||'Gasto',9,'normal',150),M+4,y);fu(9,'normal',C.suave);tx(CI_PAGOS.find(z=>z[0]===g.pago)?.[2]||'',200,y);
      fu(9,'bold',C.tinta);tx(ciM(g.monto),X.pre,y,{align:'right'});fu(9,'normal',C.mor);tx(ciM(g.gm),X.mm,y,{align:'right'});fu(9,'normal',C.ang);tx(ciM(g.ga),X.am,y,{align:'right'});
      y+=15;
    });
    y+=12;
  }
  // Pagos por método y total de cada tienda
  seccion('Pagos y total de cada tienda',78);
  const xs=[248,314,380,446,512,R];
  fu(7.5,'bold',C.suave);['Compras','Gastos','Total','Efectivo','Tarjeta','SINPE'].forEach((s,i)=>tx(s,xs[i],y,{align:'right'}));
  y+=12;
  const fila=(nom,tt,col1,bold)=>{
    espacio(20);
    if(bold){raya(y-3,C.tinta,M,R,.8);}
    fu(9.5,'bold',col1);tx(nom,M+4,y+1);
    [tt.compras,tt.gastos,tt.total,tt.pago.efectivo,tt.pago.tarjeta,tt.pago.sinpe].forEach((v,i)=>{fu(i===2?10:9,i===2||bold?'bold':'normal',i===2?col1:C.tinta);tx(v||i===2?ciM(v):'-',xs[i],y+(i===2?.5:1),{align:'right'});});
    y+=19;
  };
  fila('Moravia',t.moravia,C.mor);fila('Los Ángeles',t.angeles,C.ang);
  fila('Total',{compras:c.compras,gastos:c.gastado,total:c.total,pago:c.porPago},C.tinta,true);
  y+=10;
  // Cuadre del efectivo
  if(c.llevo!=null){
    seccion('Cuadre del efectivo',100);
    const cu=ciCuadre(c),bw=250,bx=M;
    caja(bx,y,bw,98,C.fondo,8);
    const l=(s,v,yy,b)=>{fu(9.5,b?'bold':'normal',C.tinta);tx(s,bx+12,yy);fu(9.5,'bold',C.tinta);tx(v,bx+bw-12,yy,{align:'right'});};
    l('Me llevé',ciM(c.llevo),y+9);l('Pagué en efectivo','- '+ciM(c.porPago.efectivo),y+26);
    raya(y+44,C.raya,bx+12,bx+bw-12);l('Tienen que volver',(c.debe<0?'- ':'')+ciM(Math.abs(c.debe)),y+51,true);
    if(c.regreso!=null)l('Regresé',ciM(c.regreso),y+69);
    const rc=c.regreso==null?[C.suave,C.fondo]:c.dif===0?[C.verde,C.verdeF]:c.dif<0?[C.rojo,C.rojoF]:[C.azul,C.azulF];
    caja(bx+bw+14,y,R-bx-bw-14,98,rc[1],8);fu(8,'bold',rc[0]);tx('RESULTADO',bx+bw+28,y+13,{charSpace:.5});
    fu(15,'bold',rc[0]);const rt=doc.splitTextToSize(hojaTxt(c.regreso==null?'Falta anotar lo que regresó':cu.txt.replace(/^✓\s*/,'')),R-bx-bw-42);doc.text(rt,bx+bw+28,y+34,{baseline:'top'});
    y+=116;
  }
  // Precios que cambiaron
  const cambios=ciCambios(c);
  if(cambios.length){
    seccion('Precios que cambiaron (desde 10 %)',34);
    cambios.forEach((it,i)=>{
      espacio(16);if(i%2===0)caja(M,y-2.5,R-M,15,[250,251,250]);
      fu(9,'normal',C.tinta);tx(cortar(it.t+' · '+it.prov,9,'normal',260),M+4,y);
      fu(9,'normal',C.suave);tx(ciM(it.ref)+'  >  ',X.mm-60,y,{align:'right'});fu(9,'bold',it.cambio>0?C.rojo:C.verde);tx(ciM(it.precio),X.mm-44,y,{align:'left'});
      tx((it.cambio>0?'Subió ':'Bajó ')+ciCambioPct(it),X.am,y,{align:'right'});
      y+=15;
    });
  }
  // Pie de cada página
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){
    doc.setPage(i);raya(H-34,C.raya);
    fu(7.5,'normal',C.suave);tx('ARAMO · Cierre de compras · '+hojaFecha(new Date(c.inicio)),M,H-28);tx(`Página ${i} de ${total}`,R,H-28,{align:'right'});
  }
  return{paginas:total};
}
async function ciPdfHacer(c){
  await hojaCargarJsPDF();
  const doc=new window.jspdf.jsPDF({unit:'pt',format:'letter'});
  const info=ciPdfDibujar(doc,c);
  const nombre=`Cierre ARAMO ${auDiaTxt(new Date(c.inicio))}${c.firma?' '+c.firma:''}.pdf`;
  doc.setProperties({title:nombre.replace(/\.pdf$/,''),author:'ARAMO'});
  return{...info,file:new File([doc.output('blob')],nombre,{type:'application/pdf'})};
}
// Un cierre guardado no cambia: su PDF se arma una vez y se reutiliza (así al tocar «WhatsApp» el teléfono todavía deja compartir).
function ciPdfObtener(c){
  const k=c.id||'ahora';
  if(!CI.pdf.has(k))CI.pdf.set(k,ciPdfHacer(c).catch(err=>{CI.pdf.delete(k);throw err;}));
  return CI.pdf.get(k);
}
function ciPdfBajar(f){
  const u=URL.createObjectURL(f),a=document.createElement('a');
  a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),60000);
}
// «Ver en PDF»: se abre la pestaña en el mismo toque (si no, el teléfono la bloquea) y se llena cuando el PDF está listo.
async function ciPdfVer(c){
  const win=window.open('','_blank');
  toast('Armando el PDF…');
  try{
    const r=await ciPdfObtener(c),u=URL.createObjectURL(r.file);
    if(win&&!win.closed)win.location.href=u;
    else if(!window.open(u,'_blank')){ciPdfBajar(r.file);toast('⬇️ PDF descargado','ok');}
    setTimeout(()=>URL.revokeObjectURL(u),300000);
  }catch(err){try{win?.close();}catch{}toast('No se pudo armar el PDF','err');}
}
// «Mandar el cierre a mi WhatsApp»: en el teléfono se comparte el ARCHIVO PDF (sale WhatsApp en la lista).
// En la compu se descarga el PDF y se abre el chat propio con una línea corta: se adjunta con el clip.
async function ciPdfWhatsApp(c){
  const linea=`Cierre de compras ARAMO · ${hojaFecha(new Date(c.inicio))} · Total ₡${fmt(c.total)}`;
  let r;
  try{toast('Armando el PDF…');r=await ciPdfObtener(c);}catch(err){toast('No se pudo armar el PDF','err');return;}
  if(hojaPuedeCompartir()){
    try{await navigator.share({files:[r.file],title:r.file.name.replace(/\.pdf$/,''),text:linea});return;}
    catch(e){
      if(e?.name==='AbortError')return;
      if(e?.name==='NotAllowedError'){toast('Listo el PDF · tocá otra vez para mandarlo','ok');return;}   // el toque ya venció: el PDF queda armado
    }
  }
  ciPdfBajar(r.file);
  window.open(`https://wa.me/${normalizeCostaRicaPhone(hojaMiNumero())}?text=${encodeURIComponent(linea+'\n(adjunto el PDF que se descargó)')}`,'_blank');
  toast('⬇️ PDF descargado · adjuntalo en WhatsApp','ok');
}
function xpRenderPedido(){
  const body=$('pedidoBody');if(!body)return;
  const sides=activeOrderSides(),dos=sides.length>1;
  const t=xpTotals(),all=calcScopedAllProvs();
  const provs=t.provs.slice().sort((a,b)=>(isSent(a)-isSent(b))||ORDEN_ES(a,b));
  const fecha=capital(new Date().toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'}).replace(',',''));
  const datos=provs.map(prov=>{const {lines,extras}=xpProvLines(prov);return{prov,lines,extras,sent:isSent(prov),tot:sideTotal(prov),n:lines.length+extras.length};});
  const enviados=datos.filter(d=>d.sent).length,porEnviar=datos.length-enviados;
  const nSide=s=>datos.reduce((k,d)=>k+d.lines.filter(l=>l.q[s]>0).length+d.extras.filter(x=>x.side===s).length,0);
  const lastSent=xpLatestSent(sides);
  if((_pdFiltro==='pend'&&!porEnviar)||(_pdFiltro==='env'&&!enviados))_pdFiltro='todos';
  let html=`<section class="pdx-hero${t.items?'':' vacio'}">
    <p class="pdx-kick">${ico('canasta')}Pedido de mañana</p>
    <h2 class="pdx-fecha">${esc(fecha)}</h2>
    <div class="pd-sent-time"><span>Último envío del pedido</span><strong>${lastSent?esc(new Date(lastSent.at).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'})):'Aún no enviado'}</strong><small>${lastSent?`${esc(SIDE_NAME[lastSent.side])} · ${esc(new Date(lastSent.at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}))}`:'La hora queda guardada y se comparte entre tiendas'}</small></div>`;
  if(!t.items){
    html+=`<div class="pdx-vacio"><b>Todavía no hay nada pedido</b><small>Entrá a un proveedor y tocá sus productos.</small><button type="button" class="pdx-cta" data-pd="go"><span class="pdx-cta-i">${ico('canasta')}</span><span class="pdx-cta-t"><b>Ir a proveedores</b></span><span class="pdx-cta-f">${ico('flecha')}</span></button></div></section>`;
  }else{
    html+=`<div class="pdx-cuerpo">
      <div class="pdx-col">
        <div class="pdx-total"><strong data-pdx-num="total" data-v="${all.total}">₡${fmt(all.total)}</strong><span>${dos?'total de las dos tiendas':'total del pedido'}</span></div>
        ${dos?`${xpPartes(sides,all)}<div class="pdx-ley">${sides.map(s=>`<div class="${s}"><span><i></i>${SIDE_NAME[s]}</span>${sxActualizado(s)}<b data-pdx-num="${s}" data-v="${all[s]}">₡${fmt(all[s])}</b><small>${plural(nSide(s),'producto','productos')}</small></div>`).join('')}</div>`:''}
      </div>
      <div class="pdx-col">
        <div class="pdx-chips">
          <div class="pdx-chip"><b data-pdx-num="items" data-v="${t.items}">${t.items}</b><span>${t.items===1?'producto':'productos'}</span></div>
          <div class="pdx-chip ${porEnviar?'urg':'ok'}"><b data-pdx-num="pend" data-v="${porEnviar}">${porEnviar}</b><span>${porEnviar?'por enviar':'todo enviado'}</span></div>
          <div class="pdx-chip"><b>${datos.length}</b><span>${datos.length===1?'proveedor':'proveedores'}</span></div>
        </div>
        <div class="pdx-envios" role="progressbar" aria-valuemin="0" aria-valuemax="${datos.length}" aria-valuenow="${enviados}" aria-label="Proveedores enviados">
          <span class="pdx-dots">${datos.map(d=>`<i class="${d.sent?'on':''}" title="${esc(d.prov)}"></i>`).join('')}</span>
          <small><b>${enviados}</b> de ${datos.length} enviados</small>
        </div>
        ${scopeSide()==='both'?(porEnviar?`<button type="button" class="pdx-cta" data-pd="chain"><span class="pdx-cta-i">${ico('enviar')}</span><span class="pdx-cta-t"><b>Enviar uno por uno</b><small>${plural(porEnviar,'proveedor','proveedores')} · te guío paso a paso</small></span><span class="pdx-cta-f">${ico('flecha')}</span></button>
          <div class="pdx-acc2"><button type="button" data-pd="allone">${ico('mensaje')}Todo en 1 mensaje</button><button type="button" data-pd="lista">${ico('lista')}Lista a contactos</button></div>`
          :`<div class="pdx-listo"><span>${ico('listo')}¡Todo enviado!</span><button type="button" data-pd="lista">${ico('lista')}Lista a contactos</button></div>`):`<div class="pd-solo-pedido">Podés revisar y completar esta tienda aquí. El envío oficial se hace desde <b>Ambos</b>.</div>`}
      </div>
    </div>
  </section>`;
  }
  if(dos&&ciMostrar())html+=ciBarra();
  html+=auBoton(!t.items);
  if(t.items)html+=`<button type="button" class="sx-pdf-btn" data-sx-pdf><span class="sx-pdf-i">${ico('hoja')}</span><span class="sx-pdf-t"><b>PDF del pedido</b><small>${dos?'Lista completa para revisar o compartir':'Se abre para verlo · el envío se hace desde Ambos'}</small></span><span class="sx-pdf-f" aria-hidden="true">›</span></button>`;
  if(t.items){
    html+=`<div class="pdx-barra-f"><h3>Proveedores</h3><div class="pdx-filtros" role="group" aria-label="Qué proveedores ver">${[['todos','Todos',datos.length],['pend','Por enviar',porEnviar],['env','Enviados',enviados]].map(([k,n,c])=>`<button type="button" class="${_pdFiltro===k?'on':''}" data-pdx-f="${k}"${c||k==='todos'?'':' disabled'} aria-pressed="${_pdFiltro===k}">${n} <b>${c}</b></button>`).join('')}</div></div>`;
    html+=`<div class="sx-grid">${datos.filter(d=>_pdFiltro==='todos'||(_pdFiltro==='pend'?!d.sent:d.sent)).map((d,i)=>sxTarjeta(d,i,sides,'pedido')).join('')}</div>`;
  }
  html+='<div id="resSemana" class="au-sem-w"></div>';   // esta semana contra la pasada (renderSemana, APP.html)
  // La entrada animada solo al abrir la pestaña (si no, cada cambio en vivo la repetiría).
  if(_pdEntrar){body.classList.add('pdx-entra');clearTimeout(_pdT);_pdT=setTimeout(()=>body.classList.remove('pdx-entra'),1600);_pdEntrar=false;}
  body.innerHTML=html;
  if(typeof renderSemana==='function')renderSemana();
  xpContarPedido(body);
}
function xpLatestSent(sides=activeOrderSides()){
  let best=null;
  Object.entries(S.pedidos||{}).forEach(([prov,p])=>sides.forEach(side=>{const at=+p?.notes?.['__sentAt_'+side]||0;if(at>0&&(!best||at>best.at))best={at,side,prov};}));
  Object.values(historicoCache||{}).forEach(row=>{const times=row?.detalle?.sentAt||{};sides.forEach(side=>{const at=+times[side]||0;if(at>0&&(!best||at>best.at))best={at,side,prov:row.proveedor};});});
  (LS.get('aramo_surtido_hist_v1',[])||[]).forEach(row=>{const at=+row?.sentAt||0;if(at>0&&sides.includes(row.side)&&(!best||at>best.at))best={at,side:row.side,prov:row.proveedor};});
  Object.entries(S.pedidos||{}).forEach(([prov,p])=>sides.forEach(side=>(p.notes?.['__archive_'+side]||[]).forEach(row=>{const at=+row.sentAt||0;if(at>0&&(!best||at>best.at))best={at,side,prov};})));
  return best;
}
// Los números suben solos hasta su valor cuando cambian (o al abrir la pestaña).
function xpContarPedido(body){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){body.querySelectorAll('[data-pdx-num]').forEach(el=>{_pdNums[el.dataset.pdxNum]=+el.dataset.v;});return;}
  body.querySelectorAll('[data-pdx-num]').forEach(el=>{
    const k=el.dataset.pdxNum,fin=+el.dataset.v||0,ini=_pdNums[k]??0,plata=/^₡/.test(el.textContent);_pdNums[k]=fin;
    if(ini===fin)return;
    const t0=performance.now(),dur=700;
    const paso=now=>{const x=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-x,3),v=Math.round(ini+(fin-ini)*e);el.textContent=(plata?'₡':'')+fmt(v);if(x<1&&el.isConnected)requestAnimationFrame(paso);};
    requestAnimationFrame(paso);
  });
}
// ══════════════════════════════════════════
// ⇄ MOVER un producto a otro proveedor y ✏️ EDITAR su cantidad
// En "Tu pedido de hoy" cada fila es de una tienda (Moravia o Los Ángeles):
// · El botón ⇄ de la fila: tocarlo abre la lista de proveedores para elegir; arrastrarlo lo
//   levanta apenas se mueve el dedo o el mouse.
// · Mantener apretado el resto de la fila también la levanta; con el mouse basta arrastrar.
// · Se suelta sobre otro proveedor o en la lista que sube desde abajo; cerca de los bordes la
//   pantalla se mueve sola. Soltar sin moverse abre la lista para elegir.
// · Un toque en el producto abre la ventanita: − y + grandes, cantidades rápidas, pasar a otro
//   proveedor, quitar.
// En Pedido (pastillas con las dos tiendas) pregunta qué tienda pasar. Siempre con "Deshacer".
// ══════════════════════════════════════════
const SX={pend:null,sinClick:0,elegir:null,resp:null,ed:null,edT:0};
const sxLinea=(prov,pid)=>xpProvLines(prov).lines.find(l=>l.prod.id===pid)||null;
// Lo que de verdad se desplaza: en la app es la página entera; la vista solo si es más alta que su caja.
const sxScroller=()=>{const s=document.querySelector('.view.active .scroll');return s&&s.scrollHeight>s.clientHeight+2?s:document.scrollingElement;};
const sxProd=(prov,pid)=>(getAllProviders()[prov]?.products||[]).find(x=>x.id===pid)||null;
// Precio que cada proveedor tiene para el mismo producto (mismo código o mismo nombre). El más
// barato se marca solo si es de la misma unidad y más barato que el proveedor de ahora.
function sxPreciosDe(desde,prod){
  const nom=normalizeText(niceName(prod.name)),u=normUnit(prod.unit),por={};
  const ahora=+getPrice(desde,prod.id)||0;let min=ahora||Infinity,mejor=null;
  getProvNames().forEach(n=>{
    if(n===desde)return;
    const otro=(getAllProviders()[n]?.products||[]).find(x=>x.id===prod.id)||(getAllProviders()[n]?.products||[]).find(x=>normalizeText(niceName(x.name))===nom);
    const precio=otro?+getPrice(n,otro.id)||0:0;if(!(precio>0))return;
    const uo=normUnit(otro.unit);por[n]={precio,u:uniCorta(uo)};
    if(uo===u&&precio<min){min=precio;mejor=n;}
  });
  if(mejor)por[mejor].barato=true;
  return{ahora,por};
}
function sxDock(desde,arrastrando,lado,prod){
  let dock=$('sxDock');
  if(!dock){
    dock=document.createElement('div');dock.id='sxDock';dock.className='sx-dock';dock.setAttribute('role','dialog');dock.setAttribute('aria-label','Pasar a otro proveedor');document.body.appendChild(dock);
    dock.addEventListener('click',e=>{
      const b=e.target.closest('[data-sx-drop]');
      if(b&&SX.elegir){const f=SX.elegir;SX.elegir=null;f(b.dataset.sxDrop);}
      else if(e.target.closest('[data-sx-cerrar]')){SX.elegir=null;sxCerrarDock();}
    });
  }
  dock.classList.toggle('elegir',!arrastrando);
  dock.dataset.lado=lado||'';
  const para=lado&&activeOrderSides().length>1?` <em class="${lado}">${SIDE_ICO[lado]} ${SIDE_NAME[lado]}</em>`:'';
  const pr=prod?sxPreciosDe(desde,prod):null;
  const ahora=pr?.ahora?` <small class="sx-dock-ahora">Con ${esc(desde)}: ₡${fmt(pr.ahora)}/${esc(uniCorta(normUnit(prod.unit)))}</small>`:'';
  dock.innerHTML=`<div class="sx-dock-h"><span>${ico('mover')}<b>${arrastrando?'Soltalo en el proveedor':prod?`¿A quién le pedís ${smartEmoji(prod)} ${esc(niceName(prod.name))}?`:'¿A quién se lo pedís?'}</b>${para}${ahora}</span>${arrastrando?'':'<button type="button" data-sx-cerrar>Cancelar</button>'}</div>
    <div class="sx-dock-grid">${getProvNames().filter(n=>n!==desde).map(n=>{const x=pr?.por[n];return`<button type="button" data-sx-drop="${esc(n)}" style="--c:${sxColor(n)}"${x?.barato?' class="barato"':''}><span class="sx-av">${esc(n.charAt(0).toUpperCase())}</span><span class="sx-dock-n">${esc(n)}${x?`<small class="sx-dock-p">₡${fmt(x.precio)}/${esc(x.u)}${x.barato?' · el más barato':''}</small>`:''}</span></button>`;}).join('')}</div>`;
  SX.dockT=Date.now();
  requestAnimationFrame(()=>dock.classList.add('open'));
}
// ⇄ tocado: la lista de proveedores para elegir a quién se le pide (solo esa tienda).
function sxElegirProveedor(prov,pid,lado){
  const prod=sxProd(prov,pid);if(!prod)return;
  sxDock(prov,false,lado,prod);SX.elegir=h=>{sxCerrarDock();sxHacerLado(prov,pid,h,lado);};
}
function sxCerrarDock(){$('sxDock')?.classList.remove('open');}
const sxValido=(st,t)=>!!t&&t.dataset.sxDrop!==st.chip.dataset.prov&&(!st.lado||!t.dataset.sxLado||t.dataset.sxLado===st.lado);
function sxLevantar(st,x,y){
  st.activo=true;buzz(14);
  st.lado=st.chip.dataset.lado||'';
  const r=st.chip.getBoundingClientRect();
  st.dx=Math.min(Math.max(x-r.left,12),r.width-12);st.dy=Math.min(Math.max(y-r.top,8),r.height-8);
  const g=st.chip.cloneNode(true);g.classList.add('sx-fantasma');g.classList.remove('levantado');g.removeAttribute('data-pid');g.setAttribute('aria-hidden','true');g.style.width=r.width+'px';
  document.body.appendChild(g);st.g=g;
  st.chip.classList.add('levantado');document.body.classList.add('sx-arrastrando');if(st.lado)document.body.dataset.sxLado=st.lado;
  document.querySelectorAll('#sxTablero [data-sx-drop],#pedidoBody [data-sx-drop]').forEach(t=>{if(sxValido(st,t))t.classList.add('sx-meta');});
  sxDock(st.chip.dataset.prov,true,st.lado);
  sxSeguir(st,x,y);
}
function sxSeguir(st,x,y){
  st.x=x;st.y=y;
  st.g.style.transform=`translate(${x-st.dx}px,${y-st.dy}px) rotate(-3deg) scale(1.06)`;
  st.g.style.visibility='hidden';const el=document.elementFromPoint(x,y);st.g.style.visibility='';
  const t=el?.closest?.('[data-sx-drop]'),destino=sxValido(st,t)?t:null;
  if(st.sobre!==destino){st.sobre?.classList.remove('sx-sobre');destino?.classList.add('sx-sobre');st.sobre=destino;if(destino)buzz(8);}
  // Cerca de arriba o de la lista de abajo, la pantalla se mueve sola.
  cancelAnimationFrame(st.raf);
  const dock=$('sxDock'),abajo=dock?.classList.contains('open')?dock.getBoundingClientRect().top:innerHeight;
  const vel=y<130?-Math.ceil((130-y)/7):(y>abajo-90&&y<abajo?Math.ceil((y-(abajo-90))/7):0);
  if(vel){const sc=sxScroller(),mueve=()=>{if(!st.activo)return;sc.scrollBy(0,vel);st.raf=requestAnimationFrame(mueve);};st.raf=requestAnimationFrame(mueve);}
}
function sxTerminar(st){
  st.activo=false;cancelAnimationFrame(st.raf);st.g?.remove();st.chip.classList.remove('levantado');st.sobre?.classList.remove('sx-sobre');
  document.querySelectorAll('.sx-meta').forEach(t=>t.classList.remove('sx-meta'));document.body.classList.remove('sx-arrastrando');delete document.body.dataset.sxLado;
}
function sxSoltar(st){
  const desde=st.chip.dataset.prov,pid=st.chip.dataset.pid,lado=st.lado,hacia=st.sobre?.dataset.sxDrop,quieto=Math.hypot(st.x-st.x0,st.y-st.y0)<12;
  sxTerminar(st);SX.sinClick=Date.now();
  const pasar=h=>lado?sxHacerLado(desde,pid,h,lado):sxPreguntar(desde,pid,h);
  if(hacia){sxCerrarDock();pasar(hacia);return;}
  if(quieto){sxDock(desde,false,lado);SX.elegir=h=>{sxCerrarDock();pasar(h);};return;}
  sxCerrarDock();
}
function sxHacerLado(desde,pid,hacia,lado){const l=sxLinea(desde,pid);if(l&&l.q[lado]>0)sxHacer(desde,pid,hacia,[lado],l);}
function sxPreguntar(desde,pid,hacia){
  const l=sxLinea(desde,pid);if(!l||desde===hacia)return;
  const lados=activeOrderSides().filter(s=>l.q[s]>0);
  if(lados.length<2){sxHacer(desde,pid,hacia,lados,l);return;}
  let m=$('sxPregunta');
  if(!m){
    m=document.createElement('div');m.id='sxPregunta';m.className='sx-pregunta';document.body.appendChild(m);
    m.addEventListener('click',e=>{
      const b=e.target.closest('[data-sx-lados]');
      if(b){const f=SX.resp;SX.resp=null;m.classList.remove('open');if(f&&b.dataset.sxLados)f(b.dataset.sxLados.split(','));}
      else if(e.target===m){SX.resp=null;m.classList.remove('open');}
    });
  }
  const nom=esc(niceName(l.prod.name)),u=esc(uniCorta(l.unit));
  m.innerHTML=`<div class="sx-preg-in" role="dialog" aria-modal="true" aria-label="Pasar ${nom} a ${esc(hacia)}">
    <div class="sx-preg-cab"><span class="sx-preg-e">${smartEmoji(l.prod)}</span><div><p>Pasar a <b>${esc(hacia)}</b></p><h3>${nom}</h3></div></div>
    <button type="button" class="sx-preg-b todo" data-sx-lados="${lados.join(',')}"><b>Las dos tiendas</b><small>${lados.map(s=>`${SIDE_NAME[s]} ${fmtQ(l.q[s])}`).join(' · ')} ${u}</small></button>
    ${lados.map(s=>`<button type="button" class="sx-preg-b ${s}" data-sx-lados="${s}"><b>Solo ${SIDE_NAME[s]}</b><small>${fmtQ(l.q[s])} ${u} · lo otro sigue con ${esc(desde)}</small></button>`).join('')}
    <button type="button" class="sx-preg-x" data-sx-lados="">Cancelar</button>
  </div>`;
  SX.resp=ls=>sxHacer(desde,pid,hacia,ls,l);
  requestAnimationFrame(()=>m.classList.add('open'));
}
// Pasa la cantidad de cada tienda elegida. Si el otro proveedor no tiene ese producto, se le
// agrega (con el precio del primero como punto de partida). Devuelve lo necesario para deshacer.
function sxMover(desde,pid,hacia,lados){
  const prodA=sxProd(desde,pid);if(!prodA||desde===hacia)return null;
  const key=normalizeText(prodA.name);
  let prodB=(getAllProviders()[hacia]?.products||[]).find(x=>normalizeText(x.name)===key);
  if(!prodB){
    ensureCustomProv(hacia);
    const nuevo={id:'mv_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:prodA.name,emoji:prodA.emoji||'',unit:prodA.unit,agregado:Date.now()};
    (S.customProviders[hacia].products=S.customProviders[hacia].products||[]).push(nuevo);
    invalidateProvidersCache();
    prodB=sxProd(hacia,nuevo.id)||nuevo;
    const precio=getPrice(desde,pid);if(precio&&!getPrice(hacia,prodB.id))setPrice(hacia,prodB.id,precio);
  }
  const pA=getPedido(desde),pB=getPedido(hacia),antes=[];
  lados.forEach(side=>{
    const v=pA.qtys?.[side]?.[pid];if(!v||!(+v.qty>0))return;
    const w=pB.qtys?.[side]?.[prodB.id];
    antes.push([desde,prodA,side,v.qty,v.unit],[hacia,prodB,side,w?.qty||'',w?.unit||prodB.unit]);
    syncQty(hacia,prodB,side,String(+((+w?.qty||0)+(+v.qty)).toFixed(3)),v.unit||w?.unit||prodB.unit);
    const nota=getProductNote(pA,pid,side);if(nota&&!getProductNote(pB,prodB.id,side))syncProductNote(hacia,prodB,side,nota);
    syncQty(desde,prodA,side,'',v.unit);
  });
  return antes;
}
function sxHacer(desde,pid,hacia,lados,l){
  const antes=sxMover(desde,pid,hacia,lados);if(!antes||!antes.length)return;
  xpRefresh();
  const solo=lados.length===1&&activeOrderSides().length>1?' de '+SIDE_NAME[lados[0]]:'';
  sxAviso(`${niceName(l.prod.name)}${solo} ahora se lo pedís a ${hacia}`,smartEmoji(l.prod),()=>{
    antes.forEach(([prov,prod,side,q,u])=>syncQty(prov,prod,side,q?String(q):'',u));xpRefresh();
  });
}
function sxAviso(txt,e,deshacer){
  // Un solo sistema de avisos (aramo-ui.js). Se conserva el id para lo que ya lo buscaba.
  AramoUI.aviso(txt,{id:'sxAviso',deshacer:deshacer||null});
}

// ── ✏️ Ventanita para cambiar la cantidad de una tienda ──
function sxEditar(prov,pid,lado){
  if(!sxProd(prov,pid))return;
  let ed=$('sxEditor');
  if(!ed){
    ed=document.createElement('div');ed.id='sxEditor';ed.className='sx-editor';document.body.appendChild(ed);
    ed.addEventListener('click',e=>{
      if(e.target===ed)return sxCerrarEditor();
      const b=e.target.closest('[data-sx-acc]');if(!b||!SX.ed)return;
      const a=b.dataset.sxAcc,{prov,pid,lado}=SX.ed,q=sxQ();
      if(a==='cerrar')return sxCerrarEditor();
      if(a==='menos')return sxPoner(Math.max(0,q-1),true);
      if(a==='mas')return sxPoner(q+1,true);
      if(a==='poner')return sxPoner(+b.dataset.n,true);
      if(a==='quitar'){const prod=sxProd(prov,pid),u=sxUnidad(),antes=q;sxPoner(0);sxCerrarEditor();sxAviso(`${niceName(prod.name)} quitado de ${SIDE_NAME[lado]}`,smartEmoji(prod),()=>{syncQty(prov,prod,lado,String(antes),u);xpRefresh();});return;}
      if(a==='mover'){sxCerrarEditor();sxElegirProveedor(prov,pid,lado);}
    });
    ed.addEventListener('input',e=>{
      if(e.target.id==='sxEdQ'){const v=parseFloat(String(e.target.value).replace(',','.'));sxPoner(isNaN(v)?0:Math.max(0,v),false);}
      else if(e.target.id==='sxEdNota'&&SX.ed){const prod=sxProd(SX.ed.prov,SX.ed.pid);if(prod)syncProductNote(SX.ed.prov,prod,SX.ed.lado,e.target.value);}
    });
    ed.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='sxEdQ'||e.target.id==='sxEdNota')){e.preventDefault();sxCerrarEditor();}});
  }
  SX.ed={prov,pid,lado};
  sxPintarEditor();
  requestAnimationFrame(()=>ed.classList.add('open'));
}
function sxQ(){const {prov,pid,lado}=SX.ed;return +getPedido(prov).qtys?.[lado]?.[pid]?.qty||0;}
function sxUnidad(){const {prov,pid,lado}=SX.ed;return getPedido(prov).qtys?.[lado]?.[pid]?.unit||sxProd(prov,pid)?.unit||'kg';}
function sxPintarEditor(){
  const ed=$('sxEditor');if(!ed||!SX.ed)return;
  const {prov,pid,lado}=SX.ed,prod=sxProd(prov,pid),q=sxQ(),nom=esc(niceName(prod.name));
  ed.innerHTML=`<div class="sx-ed-in ${lado}" role="dialog" aria-modal="true" aria-label="Cantidad de ${nom} para ${SIDE_NAME[lado]}">
    <div class="sx-ed-cab"><span class="sx-ed-e">${smartEmoji(prod)}</span><div><h3>${nom}</h3><p>${esc(prov)} · <b class="${lado}">${SIDE_ICO[lado]} ${SIDE_NAME[lado]}</b></p></div><button type="button" class="sx-ed-x" data-sx-acc="cerrar" aria-label="Cerrar">✕</button></div>
    <div class="sx-ed-paso"><button type="button" data-sx-acc="menos" aria-label="Uno menos">−</button><label><input id="sxEdQ" type="text" inputmode="decimal" autocomplete="off" value="${q?fmtQ(q):''}" placeholder="0" aria-label="Cantidad"><small>${esc(sxUnidad())}</small></label><button type="button" data-sx-acc="mas" aria-label="Uno más">+</button></div>
    <div class="sx-ed-rapido" role="group" aria-label="Cantidades rápidas">${[1,2,3,5,10,20].map(n=>`<button type="button" data-sx-acc="poner" data-n="${n}" class="${q===n?'on':''}">${n}</button>`).join('')}</div>
    <label class="sx-ed-nota"><span>📝 Nota para ${SIDE_NAME[lado]}</span><input id="sxEdNota" type="text" autocomplete="off" enterkeyhint="done" maxlength="120" value="${esc(getProductNote(getPedido(prov),pid,lado))}" placeholder="Ej.: bien verdes, maduros, grandes…"></label>
    <div class="sx-ed-acc"><button type="button" data-sx-acc="mover">${ico('mover')}Pasar a otro proveedor</button><button type="button" data-sx-acc="quitar" class="quitar">Quitar</button></div>
    <button type="button" class="sx-ed-ok" data-sx-acc="cerrar">Listo</button>
  </div>`;
}
function sxPoner(q,repintar){
  const {prov,pid,lado}=SX.ed,prod=sxProd(prov,pid);if(!prod)return;
  q=Math.round(q*1000)/1000;
  syncQty(prov,prod,lado,q>0?String(q):'',sxUnidad());
  if(repintar){sxPintarEditor();buzz(6);}
  clearTimeout(SX.edT);SX.edT=setTimeout(xpRefresh,220);
}
function sxCerrarEditor(){$('sxEditor')?.classList.remove('open');SX.ed=null;xpRefresh();}

// ── Toques y arrastres ──
document.addEventListener('pointerdown',e=>{
  const chip=e.target.closest?.('.sx-chip[data-pid]');if(!chip||(e.pointerType==='mouse'&&e.button!==0))return;
  const st={chip,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,id:e.pointerId,tipo:e.pointerType,activo:false};
  SX.pend=st;
  if(e.pointerType==='mouse')return;
  if(e.target.closest('.sx-grip'))st.boton=true; // ⇄: arrastra apenas se mueve; si no, es un toque
  else st.timer=setTimeout(()=>{if(SX.pend===st&&!st.activo)sxLevantar(st,st.x,st.y);},250);
},{passive:true});
document.addEventListener('pointermove',e=>{
  const st=SX.pend;if(!st||e.pointerId!==st.id)return;
  if(!st.activo){
    const d=Math.hypot(e.clientX-st.x0,e.clientY-st.y0);st.x=e.clientX;st.y=e.clientY;
    if(st.tipo==='mouse'||st.boton){if(d>5)sxLevantar(st,e.clientX,e.clientY);}
    else if(d>10){clearTimeout(st.timer);SX.pend=null;} // era para bajar la pantalla
    return;
  }
  sxSeguir(st,e.clientX,e.clientY);
});
// Mientras se arrastra, la pantalla no se mueve con el dedo.
document.addEventListener('touchmove',e=>{if(SX.pend?.activo)e.preventDefault();},{passive:false});
const sxFin=e=>{
  const st=SX.pend;if(!st||e.pointerId!==st.id)return;
  clearTimeout(st.timer);SX.pend=null;
  if(!st.activo)return;
  if(e.type==='pointercancel'){sxTerminar(st);sxCerrarDock();}else sxSoltar(st);
};
document.addEventListener('pointerup',sxFin);document.addEventListener('pointercancel',sxFin);
// Soltar después de arrastrar no cuenta como toque.
document.addEventListener('click',e=>{if(Date.now()-SX.sinClick<450&&e.target.closest?.('.sx-chip,.sx-card')){e.stopPropagation();e.preventDefault();}},true);
// Tocar fuera de la lista para elegir proveedor solo la cierra (no abre lo que está debajo).
document.addEventListener('click',e=>{const d=$('sxDock');if(SX.elegir&&d?.classList.contains('open')&&Date.now()-(SX.dockT||0)>350&&!d.contains(e.target)){e.stopPropagation();e.preventDefault();SX.elegir=null;sxCerrarDock();}},true);
document.addEventListener('contextmenu',e=>{if(e.target.closest?.('.sx-chip[data-pid]'))e.preventDefault();});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(SX.pend?.activo){const st=SX.pend;SX.pend=null;sxTerminar(st);}
  SX.elegir=SX.resp=null;sxCerrarDock();$('sxPregunta')?.classList.remove('open');if(SX.ed)sxCerrarEditor();
});
// En "Tu pedido de hoy": un toque abre la ventanita de cantidad.
$('sxTablero')?.addEventListener('click',e=>{
  const mv=e.target.closest('[data-sx-mover]');
  if(mv){const chip=mv.closest('.sx-chip');if(chip)sxElegirProveedor(chip.dataset.prov,chip.dataset.pid,chip.dataset.lado);return;}
  const b=e.target.closest('[data-sx-ed]');if(!b)return;
  const chip=b.closest('.sx-chip');if(chip)sxEditar(chip.dataset.prov,chip.dataset.pid,chip.dataset.lado);
});
function xpHistoryHtml(){
  const local=LS.get('aramo_surtido_hist_v1',[])||[];
  const shared=Object.entries(S.pedidos||{}).flatMap(([prov,p])=>['moravia','angeles'].flatMap(side=>(p.notes?.['__archive_'+side]||[]).map(row=>({...row,proveedor:prov,side}))));
  const archivedProviders=new Set([...local,...shared].map(row=>`${row.fecha}|${row.proveedor}`));
  const remote=Object.values(historicoCache||{}).filter(row=>!archivedProviders.has(`${row.fecha}|${row.proveedor}`));
  const byId=new Map();[...local,...shared,...remote].forEach((row,i)=>byId.set(row.id||`${row.fecha}_${row.proveedor}_${row.side||i}`,row));
  const rows=[...byId.values()].filter(row=>scopeSide()==='both'||!row.side||row.side===scopeSide());
  const days={};
  rows.forEach(row=>{if(!row?.fecha)return;(days[row.fecha]||(days[row.fecha]=[])).push(row);});
  const fechas=Object.keys(days).sort((a,b)=>b.localeCompare(a)).slice(0,30);
  if(!fechas.length)return'<details class="pd-hist"><summary>Historial de pedidos: 0 días</summary><p class="pd-hist-empty">Los pedidos reiniciados aparecen aquí.</p></details>';
  const fechaLabel=f=>new Date(f+'T12:00:00').toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'});
  const detalle=row=>{
    if(row.side&&Array.isArray(row.items))return row.items.length?row.items.map(x=>`${esc(x.name)}: ${fmtQ(x.qty)} ${esc(x.unit||'')}`).join('<br>'):'Pedido vacío en ese reinicio';
    const d=row.detalle||{},sideRows=['moravia','angeles'].filter(s=>activeOrderSides().includes(s)).map(side=>{
      const vals=Object.entries(d.q?.[side]||{}).map(([pid,v])=>{const prod=(getAllProviders()[row.proveedor]?.products||[]).find(x=>String(x.id)===String(pid));return `${esc(niceName(prod?.name||pid))}: ${fmtQ(+v?.[0]||0)} ${esc(v?.[1]||'')}`;});
      (d.x?.[side]||[]).forEach(x=>vals.push(`${esc(x[0])}: ${fmtQ(+x[1]||0)} ${esc(x[2]||'')}`));
      return vals.length?`<b>${SIDE_NAME[side]}</b><br>${vals.join('<br>')}`:'';
    }).filter(Boolean);
    return sideRows.join('<br>')||'Sin detalle de productos guardado';
  };
  return `<details class="pd-hist"><summary>📅 Pedidos guardados · ${fechas.length} días</summary>${fechas.map(f=>{
    const items=days[f]||[];
    return `<details class="pd-hist-day"><summary>${esc(fechaLabel(f))} · ${items.length} registro${items.length===1?'':'s'}</summary>${items.map(row=>{const times=row.detalle?.sentAt||(row.side?{[row.side]:row.sentAt}:{});const sent=Object.entries(times).filter(([,v])=>+v>0).map(([s,v])=>`${SIDE_NAME[s]}: ${new Date(+v).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'})}`).join(' · ');return `<div class="pd-hist-row"><b>${esc(row.proveedor||'Pedido')}</b>${row.side?`<small>${esc(SIDE_NAME[row.side])} · ₡${fmt(row.total||0)}</small>`:''}<small>${detalle(row)}</small>${sent?`<small>Enviado: ${esc(sent)}</small>`:''}</div>`;}).join('')}</details>`;
  }).join('')}</details>`;
}
function xpLateChanges(prov,side){
  const p=S.pedidos[prov],snap=p?.notes?.['__sentSnapshot_'+side];if(!snap)return[];
  const prodMap=new Map((getAllProviders()[prov]?.products||[]).map(x=>[String(x.id),x]));
  const before=snap.qtys||{},now=p.qtys?.[side]||{},ids=new Set([...Object.keys(before),...Object.keys(now)]),out=[];
  ids.forEach(id=>{const a=+before[id]?.qty||0,b=+now[id]?.qty||0;if(a===b&&String(before[id]?.unit||'')===String(now[id]?.unit||''))return;const name=niceName(prodMap.get(String(id))?.name||id),u=now[id]?.unit||before[id]?.unit||'';out.push(b>a?`${name}: agregar ${fmtQ(b-a)} ${u}`:b<a?`${name}: quitar ${fmtQ(a-b)} ${u}`:`${name}: cambiar a ${fmtQ(b)} ${u}`);});
  const key=x=>`${normalizeText(x?.name)}|${normUnit(x?.unit)}`,old=new Map((snap.extras||[]).map(x=>[key(x),+x.qty||0]));
  (p.extras?.[side]||[]).forEach(x=>{const k=key(x),a=old.get(k)||0,b=+x.qty||0;if(a!==b)out.push(b>a?`${x.name}: agregar ${fmtQ(b-a)} ${x.unit||''}`:`${x.name}: quitar ${fmtQ(a-b)} ${x.unit||''}`);old.delete(k);});
  old.forEach((q,k)=>{const name=k.split('|')[0];if(q)out.push(`${name}: quitar ${fmtQ(q)}`);});
  const note=getBranchNote(p,side);if(note&&p.notes?.['__late_'+side])out.push(`Instrucción de ${SIDE_NAME[side]}: ${note}`);
  return out;
}
function xpLateHtml(prov,sides){
  const p=S.pedidos[prov]||{};
  return sides.map(side=>{
    const at=+p.notes?.['__late_'+side]||0;if(!at)return'';
    const confirmed=+p.notes?.['__lateConfirmed_'+side]||0,delta=xpLateChanges(prov,side);
    if(confirmed)return `<div class="pd-late ${side} confirmed"><b>Complemento confirmado por ${SIDE_NAME[side]}</b><small>${esc(sxCuando(confirmed))}</small></div>`;
    return `<div class="pd-late ${side}"><b>Cambios después del envío · responsable: ${SIDE_NAME[side]}</b><small>${delta.map(esc).join('<br>')||'Revisá el complemento con el proveedor'}</small>${scopeSide()===side?`<div><button type="button" data-pd="copy-late" data-prov="${esc(prov)}" data-side="${side}">Copiar instrucciones</button><button type="button" data-pd="confirm-late" data-prov="${esc(prov)}" data-side="${side}">Ya lo envié al proveedor</button></div>`:`<small>Pendiente de confirmar el envío personal</small>`}</div>`;
  }).join('');
}
function xpOcultarProductoEnPOS(prod,side){
  try{
    const N=window.AramoNube;
    if(!prod||!['moravia','angeles'].includes(side)||!N?.catalogo||!N?.tienda||!N?.guardarTienda)return false;
    const key=normalizeText(prod.name),pos=N.catalogo(side).find(p=>normalizeText(p.n)===key);
    if(!pos)return false;
    const t=N.tienda(),branches=t.sucursales||[],base=branches.find(s=>s.k===side)||{},ocultos=new Set(base.ocultos||[]),visibles=new Set(base.visibles||[]);
    ocultos.add(pos.k);visibles.delete(pos.k);
    const next=branches.some(s=>s.k===side)?branches.map(s=>s.k===side?{...s,ocultos:[...ocultos],visibles:[...visibles]}:s):[...branches,{k:side,ocultos:[...ocultos],visibles:[...visibles]}];
    N.guardarTienda({sucursales:next});
    return true;
  }catch(error){console.warn('[surtido] no se pudo ocultar el producto en POS',error);return false;}
}
function xpPedidoClick(e){
  const b=e.target.closest('[data-pd]');if(!b)return;
  const act=b.dataset.pd,prov=b.dataset.prov;
  if(act==='go'){XP.verProv=true;try{return switchView('proveedores');}finally{XP.verProv=false;}}   // desde un Pedido vacío sí se puede ir a Proveedores
  if(act==='line')return xpOpenSheet(prov,b.dataset.pid);
  if(act==='open')return openProv(prov);
  if(act==='send'){if(scopeSide()!=='both'){toast('El envío está disponible en la vista Ambos','err');return;}if(!buildMsg(prov,'both')){toast('El pedido está vacío','err');return;}S.currentProv=prov;sendWA('both');setTimeout(xpRefresh,250);return;}
  if(act==='leido'){window.AramoLeido?.tocar(prov);return;}
  if(act==='chain')return xpStartChain();
  if(act==='allone'){sendAllPendingWA();setTimeout(xpRefresh,250);return;}
  if(act==='lista')return sendListaWA();
  if(act==='reset')return xpResetPedido(b.dataset.side);
  if(act==='undo')return xpUndoReset();
  if(act==='remove-line'){
    const prod=sxProd(prov,b.dataset.pid),side=b.dataset.side;
    if(!prod||!activeOrderSides().includes(side))return;
    syncQty(prov,prod,side,'',prod.unit);const oculto=xpOcultarProductoEnPOS(prod,side);xpRefresh();toast(oculto?`${niceName(prod.name)} quitado del pedido y ocultado del POS de ${SIDE_NAME[side]}`:`${niceName(prod.name)} quitado del pedido de ${SIDE_NAME[side]}; no coincidió por nombre en el POS`,'ok');return;
  }
  if(act==='copy-late'){
    const side=b.dataset.side,msg=[`Complemento del pedido enviado a ${prov} · ${SIDE_NAME[side]}`, ...xpLateChanges(prov,side).map(x=>'• '+x)].join('\n');
    (navigator.clipboard?.writeText(msg)||Promise.reject()).then(()=>toast('Instrucciones copiadas para enviar personalmente','ok')).catch(()=>{const ta=document.createElement('textarea');ta.value=msg;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Instrucciones copiadas para enviar personalmente','ok');});return;
  }
  if(act==='confirm-late'){
    const side=b.dataset.side;if(scopeSide()!==side)return;
    const p=getPedido(prov);if(!p.notes)p.notes={};p.notes['__lateConfirmed_'+side]=Date.now();markProvDirty(prov);persist();xpRefresh();toast('Confirmación compartida con Ambos','ok');return;
  }
}

function xpArchiveSide(side,fecha=aramoLocalDate(),unique=false){
  const old=LS.get('aramo_surtido_hist_v1',[])||[],added=[];
  Object.entries(S.pedidos||{}).forEach(([prov,p])=>{
    const items=(getAllProviders()[prov]?.products||[]).flatMap(prod=>{const v=p.qtys?.[side]?.[prod.id];return +v?.qty>0?[{name:niceName(prod.name),qty:+v.qty,unit:v.unit||prod.unit||''}]:[];});
    (p.extras?.[side]||[]).forEach(x=>{if(+x.qty>0)items.push({name:String(x.name||'Extra'),qty:+x.qty,unit:x.unit||''});});
    const sentAt=+p.notes?.['__sentAt_'+side]||0;
    if(!items.length&&!sentAt)return;
    const id=unique?`${fecha}_${side}_${Date.now()}_${Math.random().toString(36).slice(2,5)}`:`${fecha}_${side}_${prov}`;
    const row={id,fecha,proveedor:prov,side,total:calcSide(side,prov),items,sentAt};
    const key='__archive_'+side,archives=p.notes[key]||[];
    p.notes[key]=unique?[row,...archives].slice(0,60):[row,...archives.filter(x=>x.id!==id)].slice(0,60);
    markProvDirty(prov);
    added.push(row);
    pushHistoricoToSupabase(prov,'archive',calcSide('moravia',prov),calcSide('angeles',prov),fecha);
  });
  if(added.length){
    const ids=new Set(added.map(x=>x.id));
    const keep=unique?old:old.filter(x=>!ids.has(x.id));
    LS.set('aramo_surtido_hist_v1',[...added,...keep].slice(0,600));
  }
  return added.length;
}
function xpClearSide(side){
  Object.keys(S.pedidos||{}).forEach(prov=>{
    const p=getPedido(prov);
    p.qtys[side]={};p.extras[side]=[];
    Object.keys(p.notes||{}).forEach(k=>{
      if(!k.startsWith('__archive_')&&(k.endsWith('__'+side)||k==='__note_'+side))delete p.notes[k];
      else if(side==='moravia'&&!k.startsWith('__')&&!k.includes('__'))delete p.notes[k];
    });
    delete p.notes['__sentSnapshot_'+side];delete p.notes['__link_'+side];delete p.notes['__late_'+side];delete p.notes['__lateConfirmed_'+side];delete p.notes['__upd_'+side];
    if(side==='moravia')p.note='';
    if(!p.sentByBranch)p.sentByBranch={...sentFlags(p)};
    p.sentByBranch[side]=false;p.sent=!!p.sentByBranch.moravia&&!!p.sentByBranch.angeles;p.notes.__sentByBranch={...p.sentByBranch};
    markProvDirty(prov);
  });
}
async function xpResetPedido(side=scopeSide()){
  if(side==='both'){toast('Reiniciá una tienda a la vez','err');return;}
  if(!['moravia','angeles'].includes(side)||!activeOrderSides().includes(side)){toast('Elegí una tienda activa para reiniciar','err');return;}
  const ok=await AramoUI.confirmar({titulo:`¿Reiniciar el pedido de ${SIDE_NAME[side]}?`,texto:'Se guarda una copia del pedido para revisar la mercadería recibida. La otra tienda queda igual.',si:'Guardar y reiniciar',peligro:true});
  if(!ok)return;
  XP.undo={at:Date.now(),data:JSON.parse(JSON.stringify(S.pedidos)),sides:[side]};
  const n=xpArchiveSide(side,aramoLocalDate(),true);
  xpClearSide(side);S.createSelection={};persist();
  toast(n?`Pedido de ${SIDE_NAME[side]} guardado y reiniciado`:`Pedido de ${SIDE_NAME[side]} reiniciado`,'ok');xpRefresh();
}
window.xpDeshacerReinicio=()=>xpUndoReset();
function xpDailyRollover(){
  const today=aramoLocalDate(),last=LS.get('aramo_pedido_ultimo_dia','');
  if(!window._aramoPedidoListo)return false;
  if(!last){
    const stale=['moravia','angeles'].filter(side=>{
      const touched=Object.values(S.pedidos||{}).reduce((mx,p)=>Math.max(mx,+p?.notes?.['__upd_'+side]||0),0);
      return touched>0&&aramoLocalDate(new Date(touched))<today;
    });
    if(stale.length){stale.forEach(side=>{const touched=Math.max(0,...Object.values(S.pedidos||{}).map(p=>+p?.notes?.['__upd_'+side]||0));xpArchiveSide(side,aramoLocalDate(new Date(touched)),false);xpClearSide(side);});XP.undo=null;S.createSelection={};persist();xpRefresh();}
    LS.set('aramo_pedido_ultimo_dia',today);return !!stale.length;
  }
  if(last===today)return false;
  ['moravia','angeles'].forEach(side=>xpArchiveSide(side,last,false));
  ['moravia','angeles'].forEach(xpClearSide);
  XP.undo=null;S.createSelection={};LS.set('aramo_pedido_ultimo_dia',today);persist();xpRefresh();
  toast('Pedido nuevo para hoy. El anterior quedó guardado.','ok');return true;
}
window.xpDailyRollover=xpDailyRollover;
window.xpDailyReady=()=>{window._aramoPedidoListo=true;xpDailyRollover();};
setInterval(()=>xpDailyRollover(),30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')xpDailyRollover();});
// El «Deshacer» del reinicio también se ve en Pedido (en Ambos el reinicio se hace desde ahí).
function xpPedidoUndo(){
  const n=$('pedidoUndo');
  if(n)n.innerHTML=XP.undo&&Date.now()-XP.undo.at<120000?`<div class="pd-undo">Pedido reiniciado. <button type="button" data-inventory-undo>Deshacer</button></div>`:'';
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
  if(scopeSide()!=='both'){toast('El envío está disponible en la vista Ambos','err');return;}
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
    if($('view-pedido')?.classList.contains('active')){xpRenderPedido();xpPedidoUndo();}
    if($('view-cierre')?.classList.contains('active')&&!$('sxCierre')?.classList.contains('open'))ciRenderTab();
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
const VIEW_MAP={home:'proveedores',express:'proveedores',resumen:'pedido',mercado:'pedido',precios:'productos'};
const _switchView=window.switchView;
window.switchView=function(name){
  name=VIEW_MAP[name]||name;
  // En Ambos no hay pestaña «Proveedores» (los pedidos ya se hacen en cada tienda): se cae en Pedido. En una sola tienda no hay «Cierre de compras».
  if(name==='proveedores'&&scopeSide()==='both'&&!XP.verProv)name='pedido';
  if(name==='cierre'&&scopeSide()!=='both')name='proveedores';
  ['xpSheet','xpChain'].forEach(id=>{if($(id)?.classList.contains('open'))xpClose(id);});
  if(typeof cerrarEditorProv==='function')cerrarEditorProv();
  $('modalProvList')?.classList.remove('open');
  _switchView(name);
  // «↻ Reiniciar» (una tienda a la vez) sigue a mano en Ambos: como ya no hay Proveedores, sale arriba en Pedido.
  const tools=$('inventoryTools');if(tools)tools.hidden=!(name==='proveedores'||(name==='pedido'&&scopeSide()==='both'));
  const resetMenu=$('inventoryResetMenu'),resetBtn=$('inventoryResetBtn');if(resetMenu)resetMenu.hidden=true;if(resetBtn)resetBtn.setAttribute('aria-expanded','false');
  window.scrollTo(0,0);
  if(name==='pedido'){_pdEntrar=true;xpRenderPedido();xpPedidoUndo();}
  if(name==='cierre')ciRenderTab();
  if(name==='proveedores')xpRenderProveedores();
  xpRenderBadge();
};
wrap('renderHome',()=>xpRefresh());
wrap('chooseOrderScope',()=>{
  // Al cambiar de tienda desde la pestaña Cierre (solo de Ambos), se vuelve a Proveedores.
  if(scopeSide()!=='both'&&$('view-cierre')?.classList.contains('active'))switchView('proveedores');
  xpRefresh();
});
wrap('openProv',()=>xpRenderProvSuggest());

// ── Enlaces de eventos ──
$('providersNavList')?.addEventListener('click',e=>{
  const ed=e.target.closest('[data-edit]');if(ed){abrirEditorProv(ed.dataset.edit);return;}
  const c=e.target.closest('[data-prov]');if(c)openProv(c.dataset.prov);
});
$('inventoryTools')?.addEventListener('click',e=>{
  const side=e.target.closest('[data-inventory-reset-side]');
  if(side){$('inventoryResetMenu').hidden=true;$('inventoryResetBtn').setAttribute('aria-expanded','false');xpResetPedido(side.dataset.inventoryResetSide);return;}
  if(e.target.closest('#inventoryResetBtn')){
    if(scopeSide()!=='both'){xpResetPedido(scopeSide());return;}
    const menu=$('inventoryResetMenu'),open=menu.hidden;menu.hidden=!open;$('inventoryResetBtn').setAttribute('aria-expanded',String(open));
  }
});
$('inventoryResetNotice')?.addEventListener('click',e=>{if(e.target.closest('[data-inventory-undo]'))xpUndoReset();});
$('pedidoUndo')?.addEventListener('click',e=>{if(e.target.closest('[data-inventory-undo]'))xpUndoReset();});
document.addEventListener('click',e=>{if(e.target.closest('#inventoryTools'))return;const menu=$('inventoryResetMenu');if(menu&&!menu.hidden){menu.hidden=true;$('inventoryResetBtn')?.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const menu=$('inventoryResetMenu');if(menu&&!menu.hidden){menu.hidden=true;$('inventoryResetBtn')?.setAttribute('aria-expanded','false');$('inventoryResetBtn')?.focus();}});
// La altura del menú de abajo: las fichas se abren encima de él, así siempre se puede tocar.
function xpNavAltura(){const n=document.querySelector('.nav-bottom');if(n)document.documentElement.style.setProperty('--navh',n.offsetHeight+'px');}
xpNavAltura();addEventListener('resize',xpNavAltura);
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
$('pedidoBody')?.addEventListener('click',e=>{if(e.target.closest('[data-sx-pdf]'))hojaPdfAbrir();else if(e.target.closest('[data-sx-cierre]'))ciAbrir();else if(e.target.closest('[data-sx-siempre]'))auAbrir();});
$('sxTablero')?.addEventListener('click',xpPedidoClick);
$('ciTop')?.addEventListener('click',e=>{if(e.target.closest('[data-sx-cierre]'))ciAbrir();});
$('sxProvBar')?.addEventListener('click',()=>{const b=$('sxProvBar'),w=b.closest('.pv-wrap'),ab=!w.classList.contains('sx-abierto');w.classList.toggle('sx-abierto',ab);b.setAttribute('aria-expanded',String(ab));if(ab)setTimeout(()=>b.scrollIntoView({behavior:'smooth',block:'start'}),60);});
$('pedidoBody')?.addEventListener('click',e=>{const f=e.target.closest('[data-pdx-f]');if(!f||f.disabled)return;_pdFiltro=f.dataset.pdxF;xpRenderPedido();});

// Arranque
xpBuildOverlays();
const active=document.querySelector('.view.active')?.id?.replace('view-','');
if(!active||VIEW_MAP[active])switchView(VIEW_MAP[active]||'proveedores');
else{xpRenderProveedores();xpRenderBadge();}
})();
