/* ══════════════════════════════════════════════════════════════════════
   ARAMO Taller de pedidos — simple y ordenado (2026-10-10).
   La tienda es una sola lista ordenada por pasillo; confirmar es un
   formulario de filas iguales; el seguimiento, una lista que se llena de ✓.
   Un solo botón abajo dice siempre qué sigue ("Continuar" o "Sellar").

   Tres pantallas: 🧺 Comprar → ✅ Confirmar → 🛍️ Seguimiento.

   La lógica es la de siempre: catálogo de la vitrina, recetas que se
   escalan, lista escrita o dictada, retiro/carro/envío con Uber, pagos,
   AramoNube en vivo y WhatsApp como respaldo.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const CFG=window.ARAMO_CANASTA,N=window.AramoNube;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const buzz=p=>{try{if(navigator.userActivation?.hasBeenActive!==false)navigator.vibrate&&navigator.vibrate(p);}catch{}};
const MINI=/[?&]mini=1/.test(location.search);
const DESK=window.matchMedia('(min-width: 1000px)');
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const $c=N.colones;

const C={
  paso:'armar',actual:null,pasillo:null,q:'',parse:null,verRecetas:false,recCat:'todas',ultimo:null,pulso:false,
  cesta:LS.get('cn_cesta',{}),
  retiro:Object.assign({suc:null,modo:'asap',dia:0,hora:null,carro:false,placa:'',entrega:'tienda',ubi:null,senas:'',visto:false},LS.get('cn_retiro',{})),
  perfil:Object.assign({nombre:'',tel:''},LS.get('cn_perfil',{})),
  pago:Object.assign({metodo:'sinpe',conCuanto:0},LS.get('cn_pago',{})),
  sust:LS.get('cn_sust','avisar'),
  nota:LS.get('cn_nota',''),
  mis:LS.get('cn_mis',[]),
  personas:LS.get('cn_personas',4),
  editPerfil:false,animGrid:true,
};
if(C.retiro.carro&&C.retiro.entrega==='tienda')C.retiro.entrega='carro';
function guardar(){
  LS.set('cn_cesta',C.cesta);LS.set('cn_retiro',C.retiro);LS.set('cn_perfil',C.perfil);LS.set('cn_pago',C.pago);
  LS.set('cn_sust',C.sust);LS.set('cn_nota',C.nota);LS.set('cn_mis',C.mis);LS.set('cn_personas',C.personas);
}

// ══════════════ Vitrina ══════════════
const T=()=>N.tienda();
let _cat=null;
function cat(){return _cat||(_cat=N.catalogo().filter(p=>!p.oculto));}
const prod=k=>cat().find(p=>p.k===k);
const RECETAS=()=>N.recetas();
// Favoritos automáticos: lo que más ha pedido este cliente
function favoritos(){
  const n={};
  misPedidos().forEach(o=>(o.items||[]).forEach(i=>{if(i.estado!=='nohay')n[i.k]=(n[i.k]||0)+1;}));
  return Object.entries(n).sort((a,b)=>b[1]-a[1]).map(([k])=>prod(k)).filter(Boolean).slice(0,12);
}
// "Para completar": lo que suele ir con lo que ya está en la canasta (según el recetario)
function sugerencias(){
  const en=new Set(Object.keys(C.cesta));if(!en.size)return [];
  const puntos={};
  RECETAS().forEach(r=>{
    const ks=r.items.map(i=>i[0]),comun=ks.filter(k=>en.has(k)).length;
    if(!comun)return;
    ks.forEach(k=>{if(!en.has(k))puntos[k]=(puntos[k]||0)+comun;});
  });
  return Object.entries(puntos).sort((a,b)=>b[1]-a[1]).map(([k])=>prod(k)).filter(p=>p&&!p.agotado).slice(0,4);
}

// ══════════════ Cantidades y textos ══════════════
function fq(n){
  n=+n||0;
  if(Number.isInteger(n))return String(n);
  const w=Math.floor(n),f=+(n-w).toFixed(2),fr={.25:'¼',.5:'½',.75:'¾'}[f];
  return fr?(w||'')+fr:String(+n.toFixed(2));
}
const UNI={kg:['kg','kg'],unid:['unid.','unid.'],rollo:['rollo','rollos'],paquete:['paquete','paquetes'],bolsita:['bolsita','bolsitas'],bolsa:['bolsa','bolsas'],'cartón':['cartón','cartones'],frasco:['frasco','frascos'],botella:['botella','botellas']};
const fu=(u,q)=>(UNI[u]||[u,u])[q===1?0:1];
const qtxt=(q,u)=>fq(q)+' '+fu(u,q);
const porU=p=>$c(p.p)+(p.u==='kg'?'/kg':p.u==='unid'?' c/u':'/'+fu(p.u,1));
const kg=n=>(Math.round((+n||0)*100)/100).toLocaleString('es-CR',{maximumFractionDigits:2});
const MAD={hoy:'Para comer hoy',semana:'Para la semana',verde:'Bien verde'};
const SUST={avisar:{e:'📞',n:'Avisame'},similar:{e:'🔁',n:'Algo parecido'},quitar:{e:'✖️',n:'Quitalo'}};

// ══════════════ Canasta ══════════════
function cestaItems(){
  return Object.entries(C.cesta).map(([k,v])=>{const p=prod(k);if(!p)return null;const q=Math.max(p.s,+(Math.round(v.q/p.s)*p.s).toFixed(2));return{k,p,...v,q};}).filter(x=>x&&x.q>0);
}
function cestaTotal(){return N.redondear5(cestaItems().reduce((t,x)=>t+x.q*x.p.p,0));}
const cestaN=()=>cestaItems().length;
const cestaPeso=()=>cestaItems().reduce((t,x)=>t+(x.p.u==='kg'?x.q:0),0);
function setQ(k,q){
  const p=prod(k);if(!p)return;
  q=+(Math.round(Math.max(0,q)/p.s)*p.s).toFixed(2);
  if(q<=0)delete C.cesta[k];else C.cesta[k]={...(C.cesta[k]||{}),q};
  guardar();
}
function sumar(k,q){C.cesta[k]={...(C.cesta[k]||{}),q:+((C.cesta[k]?.q||0)+q).toFixed(2)};}
function add(k,el){
  const p=prod(k);if(!p)return;
  if(p.agotado){toast(p.n+' está agotado hoy');return;}
  setQ(k,(C.cesta[k]?.q||0)+p.s);buzz(8);
  C.ultimo=k;C.pulso=true;
  if(el)volar(p.e,el);
  render();
}

// ══════════════ Pedidos del cliente ══════════════
const misPedidos=()=>C.mis.map(id=>N.get(id)).filter(Boolean);
const activo=()=>misPedidos().filter(o=>!['entregado','cancelado'].includes(o.estado))[0]||null;
const ultimoEntregado=()=>misPedidos().find(o=>o.estado==='entregado')||null;
const ultimoPedido=()=>misPedidos().find(o=>o.estado!=='cancelado')||null;
function avance(o){const it=o.items||[],r=it.filter(x=>x.estado==='listo'||x.estado==='nohay').length;return{r,n:it.length};}
const pesoReal=o=>(o.items||[]).reduce((t,i)=>t+(i.u==='kg'&&i.estado==='listo'?+(i.qr??i.q)||0:0),0);
const suc=k=>(T().sucursales||[]).find(s=>s.k===k);
const sucs=()=>(T().sucursales||[]).filter(s=>s.activa!==false);

// ══════════════ Horarios ══════════════
const hm=s=>{const [h,m]=String(s||'0:0').split(':').map(Number);return h*60+(m||0);};
const lead=()=>+T().alistadoMin||40;
const minsHoy=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
function aFecha(dia,min){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+dia);d.setMinutes(min);return d;}
function abierta(s){const m=minsHoy();return m>=hm(s.abre)&&m<hm(s.cierra);}
function asap(s){let m=Math.max(minsHoy(),hm(s.abre))+lead();m=Math.ceil(m/5)*5;return m>hm(s.cierra)?null:aFecha(0,m);}
function slots(s,dia){
  let m=hm(s.abre)+lead();
  if(dia===0)m=Math.max(m,minsHoy()+lead());
  m=Math.ceil(m/30)*30;
  const out=[];for(;m<=hm(s.cierra);m+=30)out.push(aFecha(dia,m));
  return out;
}
const fh=d=>new Date(d).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});
function fdia(d){
  const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);
  const n=Math.round((b-a)/864e5);
  return n===0?'hoy':n===1?'mañana':n===-1?'ayer':b.toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'short'});
}
const cuando=d=>fdia(d)+' a las '+fh(d);
function asegurarRetiro(){
  const r=C.retiro;
  if(!suc(r.suc)||suc(r.suc).activa===false)r.suc=(sucs().find(abierta)||sucs()[0])?.k||null;
  const s=suc(r.suc);if(!s)return;
  if(r.modo==='asap'&&!asap(s))r.modo='prog';
  if(r.modo==='prog'){
    const h=r.hora?new Date(r.hora):null;
    if(!h||+h<Date.now()||!slots(s,r.dia).some(x=>+x===+h)){
      if(!slots(s,r.dia).length&&r.dia===0)r.dia=1;
      r.hora=(slots(s,r.dia)[0]||null)?.toISOString()||null;
    }
  }
  if(r.entrega==='carro'&&!T().alCarro)r.entrega='tienda';
  if(r.entrega==='envio'&&T().envio===false)r.entrega='tienda';
  r.carro=r.entrega==='carro';
}
function horaRetiro(){
  const s=suc(C.retiro.suc);if(!s)return null;
  if(C.retiro.modo==='asap')return asap(s);
  const h=C.retiro.hora?new Date(C.retiro.hora):null;
  return h&&+h>Date.now()?h:null;
}

// ══════════════ Entrega ══════════════
const esEnvio=()=>C.retiro.entrega==='envio';
function entregaTxt(r){return r?.envio||r?.entrega==='envio'?'🛵 Envío con Uber':r?.carro?'🚗 Al carro'+(r.placa?' ('+r.placa+')':''):'🚶 En la tienda';}
const mapaUrl=u=>'https://www.google.com/maps/search/?api=1&query='+u.lat+','+u.lng;
function mapaEmbed(u){const d=.0035;return `https://www.openstreetmap.org/export/embed.html?bbox=${u.lng-d},${u.lat-d},${u.lng+d},${u.lat+d}&layer=mapnik&marker=${u.lat},${u.lng}`;}
function leerCoords(txt){
  const m=String(txt||'').match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if(!m)return null;
  const lat=+m[1],lng=+m[2];
  return Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng,acc:null}:null;
}
function tomarUbicacion(){
  if(!navigator.geolocation){toast('Este teléfono no comparte ubicación; pegá un link de Google Maps');return;}
  toast('📍 Buscando tu ubicación…');
  navigator.geolocation.getCurrentPosition(p=>{
    C.retiro.ubi={lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy||0)};
    guardar();buzz(15);toast('📍 Ubicación lista');C.pulso=true;render();
  },e=>{toast(e.code===1?'Permití la ubicación en tu navegador o pegá un link de Google Maps':'No pudimos ubicarte; probá de nuevo o pegá un link');},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
}

// ══════════════ Qué falta (nunca un botón muerto sin explicación) ══════════════
const telDig=t=>String(t||'').replace(/\D/g,'').replace(/^506/,'');
const fmtTel=t=>{const d=telDig(t);return d.length===8?d.slice(0,4)+'-'+d.slice(4):d;};
const perfilOk=()=>C.perfil.nombre.trim().length>=2&&telDig(C.perfil.tel).length===8;
function faltaArmar(){return cestaN()?null:{m:'Agregá al menos un producto',p:'armar',f:'tlQ'};}
function faltaRetiro(){
  if(!suc(C.retiro.suc))return{m:'Elegí la tienda',p:'entrega',f:'tlSecEntrega'};
  if(!horaRetiro())return{m:'Elegí la hora',p:'entrega',f:'tlSecEntrega'};
  if(esEnvio()&&!C.retiro.ubi)return{m:'Falta tu ubicación para el envío',p:'entrega',f:'tlUbiBtn'};
  return null;
}
function faltaPago(){
  if(C.perfil.nombre.trim().length<2)return{m:'Escribí tu nombre',p:'pago',f:'tlNombre'};
  if(telDig(C.perfil.tel).length!==8)return{m:'El teléfono debe tener 8 números',p:'pago',f:'tlTel'};
  return null;
}
const faltaAlgo=()=>faltaArmar()||faltaRetiro()||faltaPago();
function avisarFalta(x){
  toast(x.m);buzz([40,40,40]);
  if(x.f==='tlNombre'||x.f==='tlTel')C.editPerfil=true;
  const dest=normPaso(x.p);
  if(C.actual||C.paso!==dest)ir(dest);else render();
  setTimeout(()=>{const el=x.f&&$(x.f);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});if(el.tagName==='INPUT')el.focus({preventScroll:true});el.classList.add('falta');setTimeout(()=>el.classList.remove('falta'),1600);}},160);
}

// ══════════════ Lista escrita o dictada ══════════════
const NUMW={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,veinte:20,treinta:30,media:.5,medio:.5,cuarto:.25};
const UNITW={kg:'kg',kgs:'kg',kilo:'kg',kilos:'kg',kilogramo:'kg',kilogramos:'kg',unidad:'unid',unidades:'unid',und:'unid',rollo:'rollo',rollos:'rollo',mazo:'rollo',mazos:'rollo',rollito:'rollo',rollitos:'rollo',paquete:'paquete',paquetes:'paquete',docena:'docena',docenas:'docena',carton:'cartón',cartones:'cartón',bolsa:'bolsa',bolsas:'bolsa',bolsita:'bolsita',bolsitas:'bolsita',frasco:'frasco',botella:'botella'};
const VACIAS=new Set(['de','del','la','las','el','los','y','con','para','por','favor','porfa','quiero','ocupo','necesito','me','manda','mandame','traeme','agrega','agregame','pone','poneme','tambien','mas','unos','unas','bien']);
function emparejar(nombre){
  const w=nombre.split(' ').map(t=>t.replace(/(es|s)$/,'')).filter(t=>t.length>1);
  if(!w.length)return null;
  let best=null,sc=0;
  cat().forEach(p=>{
    const pn=norm(p.n),pk=p.k.replace(/_/g,' ');
    let s=0;
    w.forEach(t=>{if(pn.split(/\s+/).some(x=>x.startsWith(t))||pk.includes(t))s+=t.length+2;else if(pn.includes(t))s+=t.length;});
    if(pn.startsWith(w[0]))s+=3;
    s-=pn.length/25;
    if(s>sc){sc=s;best=p;}
  });
  return sc>=4?best:null;
}
function leerLista(txt){
  const t=norm(txt)
    .replace(/(un |1 )?kilo y medio/g,'1.5 kg').replace(/medio kilo/g,'0.5 kg').replace(/(\d+) y medio/g,'$1.5')
    .replace(/(\d)\s*(kg|k)\b/g,'$1 kg');
  const segs=t.split(/[,;\n•]+|\s+y\s+(?=\d|un\b|una\b|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|media docena)|\s+(?=\d+(?:[.,]\d+)?\s)/);
  const out=[];
  segs.forEach(seg=>{
    seg=seg.trim();if(!seg)return;
    let q=null,u=null;const resto=[];
    seg.replace(/media docena/,'6 unidad').split(/\s+/).forEach(tok=>{
      if(/^\d+([.,]\d+)?$/.test(tok)){if(q==null)q=parseFloat(tok.replace(',','.'));}
      else if(NUMW[tok]!=null&&q==null)q=NUMW[tok];
      else if(UNITW[tok])u=UNITW[tok];
      else if(!VACIAS.has(tok))resto.push(tok);
    });
    const nombre=resto.join(' ');if(!nombre)return;
    const p=emparejar(nombre);
    if(u==='docena'){q=(q||1)*12;u=null;}
    if(q==null)q=1;
    out.push({txt:seg,p,q:p?Math.max(p.s,+(Math.round(q/p.s)*p.s).toFixed(2)):q,on:!!(p&&!p.agotado)});
  });
  return out;
}

// ══════════════ Recetas ══════════════
function escalar(p,q4,personas){
  const x=q4*personas/4;
  return p.u==='kg'?Math.max(p.s,Math.ceil(x/p.s-1e-9)*p.s):Math.max(1,Math.ceil(x-1e-9));
}
function ingredientes(r,personas,off){
  return r.items.map(([k,q4])=>{const p=prod(k);return p?{p,q:escalar(p,q4,personas),on:!p.agotado&&!off?.has(k)}:null;}).filter(Boolean);
}
const costoReceta=(r,per)=>N.redondear5(ingredientes(r,per).filter(x=>x.on).reduce((t,x)=>t+x.q*x.p.p,0));

// ══════════════ El recorrido: Canasta → Confirmar → Recogés ══════════════
// Entrega, datos, pago y sellar viven juntos en "Confirmar" (una sola página).
const normPaso=p=>p==='armar'?'armar':'confirmar';
const pedidoVisto=()=>C.actual?N.get(C.actual):null;
function puedeIr(paso){return normPaso(paso)==='confirmar'?faltaArmar():null;}
function emojis(items,n=7){const e=items.map(x=>x.e||x.p?.e).filter(Boolean);return e.slice(0,n).join('')+(e.length>n?'…':'');}
function resumenPedido(o){
  const {r,n}=avance(o),s=suc(o.sucursal);
  if(o.estado==='cancelado')return 'Cancelado';
  if(o.estado==='nuevo'){
    if(N.modo()!=='nube'&&!o.avisado)return o.waPendiente?'WhatsApp abierto · confirmá el envío':'Falta avisar a la tienda';
    return 'Recibido · pendiente de aceptación';
  }
  if(o.estado==='alistando')return `Escogiendo · ${r} de ${n}`;
  if(o.estado==='listo')return o.retiro.envio?(o.retiro.envio.uber?'Va en camino':'Lista · pidiendo el Uber'):`Lista · te espera en ${s?.n||'ARAMO'}`;
  if(o.estado==='entregado')return 'Entregado';
  return '';
}

// ══════════════ Navegación ══════════════
function ir(paso){
  C.actual=null;C.paso=normPaso(paso);C.animGrid=true;
  if(C.paso==='confirmar'){asegurarRetiro();C.retiro.visto=true;guardar();}
  empujar();render(true);arriba();
}
function ver(id){
  C.actual=id;
  if(H){cerrarHoja(true);if(!MINI)history.replaceState({paso:C.paso,id},'',location.pathname+location.search);}
  else empujar();
  render(true);arriba();
}
function empujar(){if(!MINI)history.pushState({paso:C.paso,id:C.actual},'',location.pathname+location.search);}
function arriba(){if(!MINI)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));}
window.addEventListener('popstate',e=>{
  if(H){cerrarHoja(true);return;}
  C.paso=normPaso(e.state?.paso||'armar');C.actual=e.state?.id||null;
  render(true);
});

// ══════════════ Pantallas ══════════════
// Todo es una lista ordenada: filas iguales, grupos con el mismo borde y un solo botón principal (abajo).
function saludo(){const nom=C.perfil.nombre.trim().split(/\s+/)[0],h=new Date().getHours();return nom?`${h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches'}, ${esc(nom)}`:'¡Pura vida!';}
function titulo(t,o={}){return `<div class="titulo">${o.volver?`<button type="button" class="volver" data-act="ir" data-p="${o.volver}" aria-label="Volver">‹</button>`:''}<h2>${t}</h2>${o.verdict?`<span class="verdict ${o.cls||''}">${esc(o.verdict)}</span>`:''}</div>`;}
function fila(e,t,s,act,attrs=''){return `<button type="button" class="fila-link" data-act="${act}" ${attrs}><span class="e">${e}</span><span class="t"><b>${t}</b>${s?`<small>${s}</small>`:''}</span><span class="go" aria-hidden="true">›</span></button>`;}
const seg=(botones,cls='')=>`<div class="segm ${cls}">${botones}</div>`;

// ── 1 · Comprar ──
function mesaArmar(){
  const n=cestaN(),u=ultimoPedido(),a=activo();
  return `<p class="hola">${saludo()} 👋<b>¿Qué llevamos hoy?</b></p>
  <div class="buscar" id="tlBuscar">
    <form class="ask" id="tlAsk" autocomplete="off" role="search"><span class="lupa" aria-hidden="true">🔎</span><input id="tlQ" type="search" enterkeyhint="search" placeholder="Buscá o dictá tu lista" value="${esc(C.q)}" aria-label="Buscá un producto o escribí tu lista"><button type="button" class="mic" id="tlMic" aria-label="Dictar lista"${C.q?' hidden':''}>🎙️</button><button type="button" class="limpiar" id="tlLimpiar" data-act="limpiar-q" aria-label="Borrar"${C.q?'':' hidden'}>✕</button></form>
    <nav class="tabs" id="tlPasillos" aria-label="Pasillos"></nav>
  </div>
  <div id="tlParse">${parseHtml()}</div>
  <div class="grupo atajos" id="tlAtajos">
    ${a?fila('🛎️',`Tu pedido ${esc(a.ref)}`,esc(resumenPedido(a)),'ver',`data-id="${a.id}"`):''}
    ${u&&!n?fila('⚡','Repetir mi última canasta',`${emojis(u.items,8)} · ${$c(N.totalDe(u))}`,'repetir',`data-id="${u.id}" data-express="1"`):''}
    ${fila('📖','Recetas',`Elegí un plato y te ponemos los ingredientes`,'recetas')}
  </div>
  <div class="lista" id="tlGrid"></div>`;
}
function parseHtml(){
  const P=C.parse;if(!P)return '';
  const ok=P.filter(x=>x.p&&x.on);
  return `<div class="parse fade"><p class="parse-h">✨ Entendí esto · tocá para quitar o poner</p><div class="chips">${P.map((x,i)=>x.p?`<button type="button" class="chip${x.on?' on':''}" data-act="parse-t" data-i="${i}">${x.p.e} ${esc(qtxt(x.q,x.p.u))} ${esc(x.p.n)}${x.p.agotado?' · agotado':''}</button>`:`<span class="chip no">❓ ${esc(x.txt)}</span>`).join('')}</div><div class="parse-a"><button type="button" class="btn" data-act="parse-ok" ${ok.length?'':'disabled'}>Agregar ${ok.length} a la canasta</button><button type="button" class="btn ghost" data-act="parse-no">Cancelar</button></div></div>`;
}
// Una fila por producto: emoji · nombre y precio · botón
function tile(p,i){
  const q=C.cesta[p.k]?.q||0;
  return `<div class="pt c-${esc(p.c||'')}${q?' in':''}${p.agotado?' off':''}${p.k===C.ultimo?' pop':''}" style="--i:${Math.min(i||0,14)}" role="button" tabindex="0" data-act="tile" data-k="${p.k}" aria-label="${esc(p.n)}">
    <span class="pt-e">${p.e}</span>
    <span class="pt-t"><span class="pt-n">${esc(p.n)}</span><span class="pt-s"><span class="pt-p">${porU(p)}</span>${p.d?` · <span class="pt-d">${esc(p.d)}</span>`:''}</span></span>
    ${p.agotado?'<span class="pt-agotado">Agotado</span>':q?`<span class="step-q"><button type="button" data-act="menos" data-k="${p.k}" aria-label="Menos ${esc(p.n)}">−</button><em>${esc(qtxt(q,p.u))}</em><button type="button" data-act="mas" data-k="${p.k}" aria-label="Más ${esc(p.n)}">+</button></span>`:'<span class="pt-add" aria-hidden="true">+</span>'}
  </div>`;
}
const NUM_RX=/\b(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|media|medio|kilo|kilos|docena)\b/;
const pareceLista=t=>/\d|,|;|\n/.test(t)||NUM_RX.test(norm(t));
// La tienda entera en una lista: secciones por pasillo y pestañas que saltan a cada una
function pintarGrid(){
  const g=$('tlGrid');if(!g)return;
  const modoLista=!!C.parse;
  const q=modoLista?'':norm(C.q).replace(/[\d.,]+/g,' ').replace(/\b(kg|kilos?|unid\w*|rollos?)\b/g,' ').trim();
  const secs=[];
  if(q){
    const w=q.split(/\s+/).filter(t=>!VACIAS.has(t));
    const res=cat().filter(p=>{const n=norm(p.n);return w.every(t=>n.includes(t.replace(/(es|s)$/,'')));});
    secs.push({k:'res',n:res.length?`${res.length} ${res.length===1?'resultado':'resultados'}`:'',L:res});
  }else if(!modoLista){
    const fav=favoritos();
    if(fav.length>=3)secs.push({k:'fav',n:'Tus favoritos',e:'💚',L:fav});
    secs.push({k:'top',n:'Lo más pedido',e:'⭐',L:cat().filter(p=>p.top)});
    (CFG.pasillos||[]).filter(p=>p.k!=='top').forEach(p=>{const L=cat().filter(x=>x.c===p.k);if(L.length)secs.push({k:p.k,n:p.n,e:p.e,L});});
  }
  const tabs=$('tlPasillos'),at=$('tlAtajos');
  if(tabs){tabs.hidden=!!q||modoLista;tabs.innerHTML=secs.map(s=>`<button type="button" class="tab" data-act="pasillo" data-k="${s.k}">${s.e||''} ${esc(s.n)}</button>`).join('');}
  if(at)at.hidden=!!q||modoLista;
  g.classList.toggle('entra',!!C.animGrid);C.animGrid=false;
  let i=0;
  g.innerHTML=q&&!secs[0].L.length
    ?`<div class="vacio">No encontramos “${esc(C.q)}”.<button type="button" class="link" data-act="limpiar-q">Ver toda la tienda</button></div>`
    :secs.map(s=>`<section class="sec" id="pas-${s.k}" data-k="${s.k}">${s.n?`<h3 class="sec-h">${s.e?s.e+' ':''}${esc(s.n)}</h3>`:''}<div class="grupo">${s.L.map(p=>tile(p,i++)).join('')}</div></section>`).join('');
  activarTab();
}
function activarTab(){
  const secs=document.querySelectorAll('#tlGrid .sec');if(!secs.length)return;
  const tope=($('tlBuscar')?.getBoundingClientRect().bottom||0)+24;
  let k=secs[0].dataset.k;
  secs.forEach(s=>{if(s.getBoundingClientRect().top<=tope)k=s.dataset.k;});
  marcarTab(k);
}
function marcarTab(k){
  const tabs=$('tlPasillos');if(!tabs)return;
  tabs.querySelectorAll('.tab').forEach(b=>{
    const on=b.dataset.k===k;if(on===b.classList.contains('on'))return;
    b.classList.toggle('on',on);
    if(on)tabs.scrollTo({left:b.offsetLeft-tabs.clientWidth/2+b.clientWidth/2,behavior:'smooth'});
  });
}
let _spy=0;
window.addEventListener('scroll',()=>{if(C.actual||C.paso!=='armar')return;cancelAnimationFrame(_spy);_spy=requestAnimationFrame(activarTab);},{passive:true});

// ── 2 · Confirmar ──
function mesaConfirmar(){
  asegurarRetiro();
  const it=cestaItems(),r=C.retiro,s=suc(r.suc),t=T(),env=r.entrega==='envio',tot=cestaTotal(),P=C.perfil,n=it.length;
  const modos=[['tienda','🚶','En tienda'],...(t.alCarro?[['carro','🚗','Al carro']]:[]),...(t.envio!==false?[['envio','🛵','A casa']]:[])];
  const metodos=Object.entries(N.PAGOS).filter(([k])=>k!=='link'||t.linkTarjeta);
  if(!metodos.some(([k])=>k===C.pago.metodo))C.pago.metodo='sinpe';
  const a=s?asap(s):null,sug=sugerencias(),u=r.ubi;
  const corto=m=>m.n.replace(' al recoger','').replace(' Móvil','').replace('Tarjeta en línea','Link');
  return titulo('Confirmá tu pedido',{volver:'armar'})
  +`<p class="grupo-h">Tu canasta · ${n} ${n===1?'producto':'productos'}<button type="button" class="link" data-act="ir" data-p="armar">＋ Agregar</button></p>
  <div class="grupo" id="tlSecCesta">${it.map(x=>`<div class="linea"><span class="e">${x.p.e}</span><span class="t"><b>${esc(x.p.n)}</b><small>${esc(porU(x.p))}</small></span><span class="step-q"><button type="button" data-act="menos" data-k="${x.k}" aria-label="Menos ${esc(x.p.n)}">−</button><em>${esc(qtxt(x.q,x.p.u))}</em><button type="button" data-act="mas" data-k="${x.k}" aria-label="Más ${esc(x.p.n)}">+</button></span><span class="pz">${$c(x.q*x.p.p)}</span></div>`).join('')}</div>
  ${sug.length?`<div class="sug"><span>¿Te falta algo?</span>${sug.map(p=>`<button type="button" class="chip" data-act="sumar" data-k="${p.k}">＋ ${p.e} ${esc(p.n)}</button>`).join('')}</div>`:''}
  <p class="grupo-h">Entrega</p>
  <div class="grupo" id="tlSecEntrega">
    <div class="g-fila">${seg(modos.map(([k,e,nm])=>`<button type="button" class="${r.entrega===k?'on':''}" data-act="entrega" data-v="${k}">${e} ${nm}</button>`).join(''))}</div>
    ${r.entrega==='carro'?`<label class="g-fila"><span class="g-l">Carro</span><input id="tlPlaca" placeholder="Placa o color (opcional)" value="${esc(r.placa)}" autocomplete="off"></label>`:''}
    ${env?(u?`<div class="g-fila col"><iframe class="ubi-mapa" title="Tu ubicación" src="${mapaEmbed(u)}" loading="lazy"></iframe><div class="ubi-ok"><span>📍 Ubicación lista${u.acc?` · ±${u.acc} m`:''}</span><button type="button" class="link" data-act="ubi-gps">Volver a tomar</button></div></div>`
      :`<div class="g-fila col"><button type="button" class="btn ghost w" id="tlUbiBtn" data-act="ubi-gps">📍 Usar mi ubicación</button><input id="tlUbiLink" class="inp" placeholder="…o pegá un link de Google Maps" autocomplete="off"></div>`)
      +`<label class="g-fila"><span class="g-l">Señas</span><input id="tlSenas" placeholder="Casa verde, portón negro…" value="${esc(r.senas||'')}" autocomplete="street-address"></label>`:''}
    ${sucs().length>1?`<div class="g-fila"><span class="g-l">${env?'Sale de':'Tienda'}</span>${seg(sucs().map(x=>`<button type="button" class="${r.suc===x.k?'on':''}" data-act="suc" data-k="${x.k}">${esc(x.n)}</button>`).join(''),'chico')}</div>`:''}
    ${s?`<div class="g-fila"><span class="g-l">Hora</span>${seg(`<button type="button" class="${r.modo==='asap'?'on':''}" data-act="cuando" data-v="asap" ${a?'':'disabled'}>${a?'⚡ '+fh(a):'Hoy no da'}</button><button type="button" class="${r.modo==='prog'?'on':''}" data-act="cuando" data-v="prog">🗓️ Otra hora</button>`,'chico')}</div>
      ${r.modo==='prog'?`<div class="g-fila col"><div class="chips">${[0,1,2].map(d=>`<button type="button" class="chip${r.dia===d?' on':''}" data-act="dia" data-d="${d}">${d===0?'Hoy':d===1?'Mañana':aFecha(2,0).toLocaleDateString('es-CR',{weekday:'long'})}</button>`).join('')}</div><div class="chips">${slots(s,r.dia).map(x=>`<button type="button" class="chip${r.hora&&+new Date(r.hora)===+x?' on':''}" data-act="hora" data-h="${x.toISOString()}">${fh(x)}</button>`).join('')||'<span class="nota">Ese día ya no hay horas. Probá otro.</span>'}</div></div>`:''}`:''}
  </div>
  <p class="grupo-h">A nombre de</p>
  <div class="grupo" id="tlSecDatos">${perfilOk()&&!C.editPerfil
    ?`<div class="g-fila"><span class="av">${esc(P.nombre.trim()[0]?.toUpperCase()||'·')}</span><span class="t"><b>${esc(P.nombre)}</b><small>${esc(fmtTel(P.tel))} · aquí te avisamos</small></span><button type="button" class="link" data-act="edit-perfil">Cambiar</button></div>`
    :`<label class="g-fila"><span class="g-l">Nombre</span><input id="tlNombre" placeholder="Tu nombre" autocomplete="given-name" value="${esc(P.nombre)}"></label><label class="g-fila"><span class="g-l">Teléfono</span><input id="tlTel" placeholder="8888-8888" inputmode="tel" autocomplete="tel" maxlength="20" value="${esc(P.tel)}"></label><div class="err" id="tlPerfilErr"></div>`}</div>
  <p class="grupo-h">Pago <small>nada hasta que esté lista</small></p>
  <div class="grupo" id="tlSecPago">
    <div class="g-fila">${seg(metodos.map(([k,m])=>`<button type="button" class="${C.pago.metodo===k?'on':''}" data-act="metodo" data-k="${k}">${m.e} ${esc(corto(m))}</button>`).join(''))}</div>
    ${C.pago.metodo==='efectivo'?`<div class="g-fila"><span class="g-l">Pagás con</span>${seg([0,...billetes(tot)].map(v=>`<button type="button" class="${(+C.pago.conCuanto||0)===v?'on':''}" data-act="con" data-v="${v}">${v?$c(v):'Exacto'}</button>`).join(''),'chico')}</div>`:''}
  </div>
  <p class="grupo-h">Si algo no hay</p>
  <div class="grupo"><div class="g-fila">${seg(Object.entries(SUST).map(([k,x])=>`<button type="button" class="${C.sust===k?'on':''}" data-act="sust" data-k="${k}">${x.e} ${{avisar:'Avisame',similar:'Parecido',quitar:'Quitalo'}[k]||x.n}</button>`).join(''),'chico')}</div>
    <label class="g-fila"><span class="g-l">Nota</span><input id="tlNota" placeholder="Opcional: bolsas aparte…" value="${esc(C.nota)}" autocomplete="off"></label></div>
  <p class="pie">Total aprox. <b>${$c(tot)}</b>${env?' + envío':''} · pagás lo que pese de verdad.<br>${N.modo()!=='nube'?'Al sellar, le avisás a la tienda por WhatsApp.':'Podés cancelarlo mientras no lo empiecen a alistar.'}</p>`;
}
function billetes(t){
  const out=[];
  [5000,10000,20000,50000].forEach(b=>{const v=Math.ceil(t/b)*b;if(v>t&&!out.includes(v)&&out.length<3)out.push(v);});
  return out;
}

// ── 3 · Seguimiento ──
const _okAntes={};
function mesaPedido(o){
  const s=suc(o.sucursal),{r,n}=avance(o),total=N.totalDe(o),aprox=N.esAprox(o),E=o.estado,env=o.retiro.envio;
  const fin=E==='entregado'||E==='cancelado',local=N.modo()!=='nube';
  const waPendiente=!!o.waPendiente&&!o.avisado;
  const V={nuevo:local&&!o.avisado?(waPendiente?['WhatsApp abierto','warn']:['Falta avisar','warn']):['Pendiente de aceptación','run'],alistando:[`Alistando ${r}/${n}`,'run'],listo:[env?(env.uber?'En camino':'Lista'):'Lista','ok'],entregado:['Entregado','ok'],cancelado:['Cancelado','bad']}[E]||['—',''];
  const tit={nuevo:local&&!o.avisado?(waPendiente?'Confirmá el envío':'Avisale a la tienda'):'¡Pedido recibido!',alistando:'Escogiendo tu canasta',listo:env?'¡Va en camino!':'¡Tu canasta está lista!',entregado:'¡Que la disfrutés!',cancelado:'Pedido cancelado'}[E]||'Tu pedido';
  const ahora={nuevo:local&&!o.avisado?(waPendiente?'Confirmá solo después de tocar Enviar en WhatsApp.':'Mandale el pedido a la tienda por WhatsApp.'):'La tienda lo acepta y empieza a escoger.',alistando:'Escogemos y pesamos cada producto.',listo:env?'Salió con Uber hacia tu ubicación.':`Te espera en ${esc(s?.n||'ARAMO')} · ${esc(cuando(o.retiro.at))}.`,entregado:'Gracias por comprar en ARAMO.',cancelado:esc(o.motivo||'El pedido no siguió.')}[E];
  const pct={nuevo:12,alistando:15+Math.round(70*(n?r/n:0)),listo:92,entregado:100,cancelado:0}[E]??0;
  const icoE={nuevo:'📥',alistando:'🧑‍🌾',listo:env?'🛵':'✅',entregado:'🛍️',cancelado:'✖️'}[E]||'🧺';
  const hora=k=>{const l=(o.log||[]).find(x=>x.s===k);return l?fh(l.t):'';};
  const idx=['nuevo','alistando','listo','entregado'].indexOf(E);
  const linea=E==='cancelado'?'':`<ol class="tr-line">${[['Recibido',o.created?fh(o.created):''],['Alistando',hora('alistando')],[env?'En camino':'Lista',hora('listo')],['Entregado',hora('entregado')]].map(([tt,h],i)=>`<li class="${i<idx||(i===idx&&E==='entregado')?'si':i===idx?'ya':''}">${tt}<small>${esc(h||'—')}</small></li>`).join('')}</ol>`;
  // la canasta: lo que se pidió, lo que pesó y si ya está lista (✓ al momento)
  const antes=_okAntes[o.id]||new Set(),ahoraOk=new Set();let dif=0;
  const items=o.items.map((i,j)=>{
    const real=i.qr!=null&&i.qr!=='',q=real?+i.qr:+i.q,pr=i.pr!=null&&i.pr!==''?+i.pr:+i.p;
    const st=i.estado==='listo'?'ok':i.estado==='nohay'?'no':E==='alistando'?'wait':'';
    if(st==='ok')ahoraOk.add(j);
    if(i.estado!=='nohay')dif+=(q-i.q)*pr;else dif-=i.q*pr;
    const pesoDistinto=real&&i.u==='kg'&&Math.abs(q-i.q)>1e-9;
    const det=i.estado==='nohay'?'no hubo':pesoDistinto?`pediste ${qtxt(i.q,i.u)} → pesó ${kg(q)} kg`:qtxt(q,i.u);
    return `<div class="it ${st}${st==='ok'&&!antes.has(j)&&_okAntes[o.id]?' recien':''}"><span class="e">${i.e}</span><span class="t"><b>${esc(i.n)}</b><small>${esc(det)}</small></span><span class="pz">${i.estado==='nohay'?'₡0':$c(q*pr)}</span><span class="ck" aria-hidden="true">${st==='ok'?'✓':st==='no'?'✕':''}</span></div>`;
  }).join('');
  _okAntes[o.id]=ahoraOk;
  const costoEnvio=+env?.costo||0,pesado=['listo','entregado'].includes(E)||o.items.some(i=>i.qr!=null&&i.qr!=='');
  const acc=[
    s&&!env&&!fin?fila('🗺️','Cómo llegar',esc(s.n),'mapa'):'',
    fila('💬','Escribir a la tienda','Por WhatsApp','wa-tienda'),
    E==='alistando'&&local?fila('🔄','Pedir el estado','Por WhatsApp','wa-estado'):'',
    E==='alistando'&&!local?fila('🔄','Revisar estado','','actualizar-pedido'):'',
    !fin&&N.avisos.soportado()&&N.avisos.permiso()==='default'?fila('🔔','Avisarme cuando esté lista','Notificación en el teléfono','avisame'):'',
    E==='nuevo'?`<button type="button" class="fila-link rojo" data-act="cancelar"><span class="e">✖️</span><span class="t"><b>Cancelar pedido</b></span></button>`:'',
  ].join('');
  return titulo(tit,{verdict:V[0],cls:V[1]})
  +`<div class="tracker est-${E}"><div class="tr-ring" style="--p:${pct}"><b>${icoE}</b>${E==='alistando'?`<span>${r}/${n}</span>`:''}</div><div class="tr-t"><strong>Pedido ${esc(o.ref)}</strong><p>${ahora}</p></div></div>${linea}
  ${E==='nuevo'&&local&&!o.avisado?(waPendiente
    ?`<div class="aviso"><b>💬 ¿Ya lo enviaste?</b><p>WhatsApp no le avisa a ARAMO si tocaste Enviar.</p><div class="dos-b"><button type="button" class="btn ghost" data-act="wa-enviar">Abrir de nuevo</button><button type="button" class="btn" data-act="wa-confirmar">✅ Ya lo envié</button></div></div>`
    :`<div class="aviso"><b>💬 Último paso</b><p>WhatsApp se abre con tu pedido listo para enviar.</p><button type="button" class="btn big w" data-act="wa-enviar">Avisar a la tienda por WhatsApp</button></div>`):''}
  ${!fin?`<div class="sello" id="tlStep6"><div class="qr" id="tlQR" aria-label="Código QR de retiro"></div><div><small>Código de retiro</small><div class="pin">${esc(o.pin)}</div><small>${env?'Dáselo al repartidor si te lo pide':'Mostralo al recoger'}${o.retiro.carro?' · te la llevamos al carro':''}</small></div></div>`:''}
  ${pagoHtml(o,total,aprox)}
  ${env&&!fin?`<div class="card2"><h3>🛵 Envío con Uber</h3><p>${env.uber?`Pedido a las ${esc(fh(env.uber))} · va en camino.`:'Lo pedimos apenas tu canasta esté lista.'}${costoEnvio?` Envío: ${$c(costoEnvio)} (incluido).`:''}</p></div>`:''}
  ${E!=='cancelado'?`<p class="grupo-h">Tu canasta${E==='alistando'?` · ${r} de ${n} listos`:''}</p>
  <div class="grupo items">${items}${costoEnvio?`<div class="it"><span class="e">🛵</span><span class="t"><b>Envío Uber</b></span><span class="pz">${$c(costoEnvio)}</span><span class="ck"></span></div>`:''}${pesado&&Math.abs(dif)>=1?`<div class="it ajuste"><span class="e">⚖️</span><span class="t"><b>Ajuste por peso real</b></span><span class="pz">${dif>0?'+':'−'}${$c(Math.abs(dif))}</span><span class="ck"></span></div>`:''}<div class="it total"><span class="e"></span><span class="t"><b>${aprox?'Total aprox.':'Total exacto'}</b></span><span class="pz">${$c(total)}</span><span class="ck"></span></div></div>`:''}
  ${E==='entregado'?`<div class="card2 centro"><h3>¿Qué tal estuvo todo?</h3><div class="caritas">${['😍','🙂','😐'].map((c,i)=>`<button type="button" class="${o.rating===3-i?'on':''}" data-act="rating" data-v="${3-i}" aria-label="Calificar ${3-i}">${c}</button>`).join('')}</div><button type="button" class="btn w" style="margin-top:12px" data-act="repetir" data-id="${o.id}">🔁 Repetir esta canasta</button></div>`:''}
  <div class="grupo acciones-l">${acc}</div>
  <button type="button" class="btn w ${fin?'big':'ghost'} nuevo" data-act="nuevo">＋ Nuevo pedido</button>`;
}
function pagoHtml(o,total,aprox){
  const t=T(),m=o.pago||{},M=N.PAGOS[m.metodo]||N.PAGOS.efectivo;
  if(o.estado==='cancelado')return '';
  if(m.estado==='verificado')return `<div class="card2"><h3>✅ Pago confirmado</h3><p>${M.n} · ${$c(total)}</p></div>`;
  if(m.metodo==='sinpe'){
    if(m.estado==='reportado')return `<div class="card2"><h3>📲 Pago enviado</h3><p>Le avisaste a la tienda que pagaste ${$c(total)}. Lo confirman al entregarte la canasta.</p></div>`;
    if(o.estado==='listo'){
      const sp=N.sinpeDe(o.sucursal),num=telDig(sp.numero);
      return `<div class="card2 w"><h3>📲 Pagá por SINPE Móvil</h3><div class="monto">${$c(total)}</div>
        ${num?`<div class="copia"><div><small>Número</small>${esc(fmtTel(num))}${sp.nombre?` · ${esc(sp.nombre)}`:''}</div><button type="button" data-act="copiar" data-v="${num}">Copiar</button></div>`:'<p>La tienda te envía el número por WhatsApp.</p>'}
        <div class="copia"><div><small>Monto</small>${$c(total)}</div><button type="button" data-act="copiar" data-v="${Math.round(total)}">Copiar</button></div>
        <div class="copia"><div><small>Descripción</small>${esc(o.ref)}</div><button type="button" data-act="copiar" data-v="${esc(o.ref)}">Copiar</button></div>
        <div class="dos-b" style="margin-top:12px"><button type="button" class="btn" data-act="ya-pague">Ya pagué</button><button type="button" class="btn ghost" data-act="comprobante">Enviar comprobante</button></div></div>`;
    }
    return `<div class="card2"><h3>📲 SINPE Móvil</h3><p>Cuando esté lista te mostramos aquí el monto exacto, ya pesado, para pagar en un toque.</p></div>`;
  }
  if(m.metodo==='link'&&o.estado==='listo'&&t.linkTarjeta)
    return `<div class="card2 w"><h3>🔗 Pagá con tarjeta</h3><div class="monto">${$c(total)}</div><button type="button" class="btn w" data-act="link-pago">Abrir pago seguro</button><p class="centro" style="margin-top:8px"><button type="button" class="link" data-act="ya-pague">Ya pagué</button></p></div>`;
  const vuelto=m.metodo==='efectivo'&&+m.conCuanto>total?` Llevás ${$c(m.conCuanto)}: tu vuelto es ${$c(+m.conCuanto-total)}.`:'';
  return `<div class="card2"><h3>${M.e} ${M.n}</h3><p>${aprox?'Total aproximado':'Total'} ${$c(total)}.${vuelto}</p></div>`;
}

// ══════════════ Pintar ══════════════
function pintarChips(){
  const v=$('tlVivo');if(!v)return;
  const en=N.modo()==='nube';v.classList.toggle('on',en);v.title=en?'Tienda en vivo':'Pedidos por WhatsApp';
}
function pintarMesa(anim){
  const m=$('tlMesa'),o=pedidoVisto();
  m.innerHTML=C.actual&&!o?titulo('No encontramos ese pedido en este teléfono',{volver:'armar'})
    :o?mesaPedido(o):C.paso==='confirmar'?mesaConfirmar():mesaArmar();
  document.body.dataset.pantalla=o?'pedido':C.paso;
  if(anim){m.classList.remove('fade');void m.offsetWidth;m.classList.add('fade');}
  if(!o&&C.paso==='armar')pintarGrid();
  if(o){pintarQR(o);animarAnillo(o.id);}
  C.pulso=false;C.ultimo=null;
}
// El anillo del seguimiento se llena desde donde estaba (no salta).
const _anillo={};
function animarAnillo(id){
  const el=document.querySelector('.tr-ring');if(!el)return;
  const meta=+getComputedStyle(el).getPropertyValue('--p')||0,antes=_anillo[id]??0;
  _anillo[id]=meta;if(antes===meta||MINI)return;
  el.style.setProperty('--p',antes);requestAnimationFrame(()=>requestAnimationFrame(()=>el.style.setProperty('--p',meta)));
}
function pintarBit(){
  const nAct=misPedidos().filter(o=>!['entregado','cancelado'].includes(o.estado)).length;
  $('tlBitN').hidden=!nAct;$('tlBitN').textContent=nAct;
  if(H?.tipo==='pedidos')pintarHoja();
}
// Abajo, siempre un solo botón: "Continuar" mientras comprás, "Sellar" al confirmar.
function pintarBar(){
  const bar=$('tlBar'),inn=$('tlBarIn'),n=cestaN(),o=pedidoVisto();
  let h='';
  if(!o&&n&&!MINI){
    const conf=C.paso==='confirmar';
    const btn=conf?`<button type="button" class="btn${faltaAlgo()?' apagado':''}" data-act="pedir" id="tlSellar">🔒 Sellar pedido</button>`
      :`<button type="button" class="btn" data-act="siguiente">Continuar →</button>`;
    h=`<button type="button" class="tk" data-act="ir" data-p="armar" aria-label="Ver la canasta"><span class="tk-ico" id="tlTk">🧺<em>${n}</em></span><span class="tk-t"><small>${conf?'Total aprox.':n===1?'1 producto':n+' productos'}</small><strong id="tlTot">${$c(_totBar)}</strong></span></button>${btn}`;
  }
  bar.classList.toggle('hide',!h);
  if(h){inn.innerHTML=h;contar($('tlTot'),_totBar,cestaTotal());_totBar=cestaTotal();}
}
// El total sube o baja contando, en vez de saltar.
let _totBar=0,_contar=0;
function contar(el,de,a){
  if(!el)return;cancelAnimationFrame(_contar);
  if(de===a||MINI||matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=$c(a);return;}
  const t0=performance.now(),d=480;
  const paso=t=>{const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);el.textContent=$c(Math.round(de+(a-de)*e));if(k<1)_contar=requestAnimationFrame(paso);};
  _contar=requestAnimationFrame(paso);
}
function pintarQR(o){
  const el=$('tlQR');if(!el)return;
  if(!window.qrcode){el.innerHTML='<div style="display:grid;place-items:center;height:100%;font-size:40px">🧺</div>';return;}
  const q=window.qrcode(0,'M');q.addData('ARAMO:'+o.ref+':'+o.pin);q.make();
  el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});
}
function render(anim){
  const y=window.scrollY,fa=document.activeElement,foco=fa&&fa.id&&fa.matches('input,textarea')?{id:fa.id,s:fa.selectionStart,e:fa.selectionEnd}:null;
  pintarChips();pintarMesa(anim);pintarBit();pintarBar();ligar();
  if(!anim)window.scrollTo(0,y);
  if(foco){const el=$(foco.id);if(el){el.focus({preventScroll:true});try{el.setSelectionRange(foco.s,foco.e);}catch{}}}
}

// ══════════════ Hojas (producto, receta, recetas y mis pedidos) ══════════════
let H=null;
function abrirHoja(h){
  const ya=!!H;H=h;pintarHoja();
  $('tlSheet').classList.add('open');$('tlSheetBg').classList.add('open');$('tlSheet').scrollTop=0;
  if(!MINI&&!ya)history.pushState({paso:C.paso,id:C.actual,hoja:1},'',location.pathname+location.search);
}
function cerrarHoja(desdeHist){
  if(!H)return;H=null;
  $('tlSheet').classList.remove('open');$('tlSheetBg').classList.remove('open');
  if(!desdeHist&&!MINI)history.back();
}
const CERRAR='<div class="sheet-grip"></div><button type="button" class="sheet-x" data-act="h-x" aria-label="Cerrar">✕</button>';
function filaReceta(r){return fila(r.e,esc(r.n),`${r.items.length} ingredientes · ${$c(costoReceta(r,C.personas))}`,'receta',`data-k="${r.k}"`);}
function pintarHoja(){
  const el=$('tlSheet');if(!H)return;
  if(H.tipo==='prod'){
    const p=prod(H.k),en=!!C.cesta[H.k],rapidos=p.u==='kg'?[.5,1,2,3]:[1,2,3,6,12];
    el.innerHTML=`${CERRAR}
      <div class="ficha c-${esc(p.c||'')}"><span class="ficha-e">${p.e}</span><h2>${esc(p.n)}</h2><p class="sub">${p.d?esc(p.d)+' · ':''}${porU(p)}</p></div>
      <div class="big-step"><button type="button" data-act="h-menos" aria-label="Menos">−</button><output>${esc(fq(H.q))}<small>${esc(fu(p.u,H.q))}</small></output><button type="button" data-act="h-mas" aria-label="Más">+</button></div>
      ${seg(rapidos.map(v=>`<button type="button" class="${H.q===v?'on':''}" data-act="h-set" data-v="${v}">${esc(qtxt(v,p.u))}</button>`).join(''),'chico')}
      ${p.mad?`<p class="grupo-h">¿Para cuándo?</p>${seg(Object.entries(MAD).map(([k,n])=>`<button type="button" class="${H.mad===k?'on':''}" data-act="h-mad" data-v="${k}">${n}</button>`).join(''),'chico')}`:''}
      <input class="inp" id="tlHNota" placeholder="Nota (opcional): grandes, bien rojos…" value="${esc(H.nota)}" autocomplete="off">
      <div class="hoja-a">${en?`<button type="button" class="btn ghost rojo" data-act="h-quitar">Quitar</button>`:''}<button type="button" class="btn" data-act="h-ok">${en?'Listo':'Agregar'} · ${$c(H.q*p.p)}</button></div>`;
    $('tlHNota').addEventListener('input',e=>{H.nota=e.target.value;});
  }else if(H.tipo==='receta'){
    const r=RECETAS().find(x=>x.k===H.k),L=ingredientes(r,H.personas,H.off),tot=N.redondear5(L.filter(x=>x.on).reduce((t,x)=>t+x.q*x.p.p,0));
    el.innerHTML=`${CERRAR}
      <div class="ficha"><span class="ficha-e">${r.e}</span><h2>${esc(r.n)}</h2><p class="sub">${esc(r.desc||'')}</p></div>
      <div class="grupo"><div class="g-fila"><span class="g-l">Personas</span><span class="relleno"></span><span class="step-q"><button type="button" data-act="h-per" data-v="${Math.max(1,H.personas-1)}" aria-label="Menos personas">−</button><em>${H.personas}</em><button type="button" data-act="h-per" data-v="${Math.min(12,H.personas+1)}" aria-label="Más personas">+</button></span></div></div>
      <p class="grupo-h">Ingredientes · tocá para quitar</p>
      <div class="grupo">${L.map(x=>`<button type="button" class="ing${x.on?' on':''}" data-act="h-ing" data-k="${x.p.k}" ${x.p.agotado?'disabled':''}><span class="ck">${x.on?'✓':''}</span><span class="e">${x.p.e}</span><span class="t"><b>${esc(x.p.n)}</b><small>${x.p.agotado?'Agotado hoy':esc(qtxt(x.q,x.p.u))}</small></span><span class="pz">${$c(x.q*x.p.p)}</span></button>`).join('')}</div>
      <button type="button" class="btn big w hoja-b" data-act="h-receta" ${L.some(x=>x.on)?'':'disabled'}>Agregar a mi canasta · ${$c(tot)}</button>`;
  }else if(H.tipo==='recetas'){
    const todas=RECETAS(),cats=(CFG.categoriasRecetas||[]).filter(c=>todas.some(r=>r.c===c.k)),otras=todas.filter(r=>!cats.some(c=>c.k===r.c));
    el.innerHTML=`${CERRAR}<h2 class="sheet-t">📖 Recetas</h2><p class="sub">Tocá una y elegís para cuántas personas.</p>
      ${cats.map(c=>`<p class="grupo-h">${c.e} ${esc(c.n)}</p><div class="grupo">${todas.filter(r=>r.c===c.k).map(filaReceta).join('')}</div>`).join('')}
      ${otras.length?`<p class="grupo-h">Más recetas</p><div class="grupo">${otras.map(filaReceta).join('')}</div>`:''}`;
  }else if(H.tipo==='pedidos'){
    const L=misPedidos(),dark=temaActual()==='dark';
    const cls={nuevo:'run',alistando:'run',listo:'ok',entregado:'ok',cancelado:'bad'},nom={nuevo:'Recibido',alistando:'Alistando',listo:'Lista',entregado:'Entregado',cancelado:'Cancelado'};
    el.innerHTML=`${CERRAR}<h2 class="sheet-t">🧾 Mis pedidos</h2>
      ${L.length?`<div class="grupo">${L.slice(0,20).map(o=>`<button type="button" class="bit-r" data-act="ver" data-id="${o.id}"><span class="e">${emojis(o.items,3)}</span><span class="t"><b>${esc(o.ref)} · ${$c(N.totalDe(o))}</b><small>${esc(fdia(o.created).replace(/^(\w)/,c=>c.toUpperCase()))} · ${esc(fh(o.created))}</small></span><span class="s ${cls[o.estado]||''}">${nom[o.estado]||o.estado}</span></button>`).join('')}</div>`
        :'<p class="vacio">Todavía no tenés pedidos. Los que sellés aparecen aquí con su estado.</p>'}
      <div class="grupo" style="margin-top:14px"><button type="button" class="fila-link" data-act="tema"><span class="e">${dark?'☀️':'🌙'}</span><span class="t"><b>${dark?'Usar tema claro':'Usar tema oscuro'}</b></span></button></div>`;
  }
}
function abrirProd(k){const p=prod(k);if(!p)return;const c=C.cesta[k];abrirHoja({tipo:'prod',k,q:c?.q||p.s,mad:c?.mad||'',nota:c?.nota||''});}

// ══════════════ Sellar ══════════════
const estados={};
misPedidos().forEach(o=>{estados[o.id]=o.estado;});
function hacerPedido(){
  const falta=faltaAlgo();if(falta){avisarFalta(falta);return;}
  const s=suc(C.retiro.suc),h=horaRetiro();
  const items=cestaItems().filter(x=>!x.p.agotado);
  const o=N.crear({
    id:N.nuevoId(),ref:N.nuevoRef(),pin:N.nuevoPin(),estado:'nuevo',sucursal:s.k,
    cliente:{nombre:C.perfil.nombre.trim(),tel:telDig(C.perfil.tel)},
    retiro:{modo:C.retiro.modo,at:h.toISOString(),entrega:C.retiro.entrega,carro:C.retiro.entrega==='carro',placa:C.retiro.entrega==='carro'?C.retiro.placa.trim():'',envio:esEnvio()?{...C.retiro.ubi,senas:(C.retiro.senas||'').trim()}:null},
    pago:{metodo:C.pago.metodo,conCuanto:C.pago.metodo==='efectivo'?+C.pago.conCuanto||0:0,estado:'pendiente'},
    sust:C.sust,nota:C.nota.trim(),
    items:items.map(x=>({k:x.k,n:x.p.n,e:x.p.e,u:x.p.u,q:x.q,p:x.p.p,mad:x.mad||'',nota:x.nota||''})),
    totalEst:cestaTotal(),canal:N.modo(),
  });
  C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];C.cesta={};C.nota='';C.editPerfil=false;C.paso='armar';guardar();
  estados[o.id]=o.estado;
  fiesta(o.items.map(i=>i.e));sellado(o.ref);buzz([30,40,30]);toast(N.modo()==='nube'?'🔔 Pedido '+o.ref+' enviado al Taller · aviso automático a la tienda':'🔒 Pedido '+o.ref+' sellado · falta avisar a la tienda');
  ver(o.id);
}
function msgTienda(o){
  const s=suc(o.sucursal),M=N.PAGOS[o.pago.metodo];
  return [
    `🧺 *Pedido ARAMO Taller · ${o.ref}*`,
    `👤 ${o.cliente.nombre} · ${fmtTel(o.cliente.tel)}`,
    `📍 ${s?.n||''} (${s?.zona||''}) · ${cuando(o.retiro.at)} · ${entregaTxt(o.retiro)}`,
    o.retiro.envio?`🗺️ Entregar en: ${mapaUrl(o.retiro.envio)}${o.retiro.envio.senas?' · '+o.retiro.envio.senas:''}`:'',
    `${M?.e||'💳'} ${M?.n||''}${o.pago.conCuanto?' · paga con '+$c(o.pago.conCuanto):''}`,
    '',
    ...o.items.map(i=>`• ${qtxt(i.q,i.u)} ${i.n}${i.mad?' · '+(MAD[i.mad]||'').toLowerCase():''}${i.nota?' · '+i.nota:''}`),
    '',
    `Total aprox.: ${$c(N.totalDe(o))}`,
    `Si algo no hay: ${SUST[o.sust]?.n.toLowerCase()}`,
    o.nota?`📝 ${o.nota}`:'',
    '',
    `Abrir en Mostrador 👉 ${N.enlace('APP.html','encargo',o)}`,
  ].filter((l,i,a)=>l!==''||a[i-1]!=='').join('\n');
}
function abrir(url){const w=window.open(url,'_blank','noopener');if(!w)location.href=url;}

// ══════════════ Avisos en vivo ══════════════
function vigilar(){
  misPedidos().forEach(o=>{
    const antes=estados[o.id];estados[o.id]=o.estado;
    if(!antes||antes===o.estado)return;
    if(o.estado==='listo'){toast('✅ ¡Tu canasta '+o.ref+' está lista!');buzz([90,60,90,60,160]);campana();N.avisos.mostrar('✅ Tu canasta '+o.ref+' está lista',o.retiro.envio?'Va en camino con Uber a tu ubicación.':'Te espera en '+(suc(o.sucursal)?.n||'ARAMO')+'. Total '+$c(N.totalDe(o))+'.',{tag:'pedido-'+o.id,url:location.href.split('#')[0]});}
    else if(o.estado==='alistando'){toast('🧑‍🌾 Ya están escogiendo tu canasta');N.avisos.mostrar('🧑‍🌾 Estamos escogiendo tu canasta','Pedido '+o.ref+' · te avisamos cuando esté lista.',{tag:'pedido-'+o.id});}
    else if(o.estado==='entregado')toast('🛍️ ¡Entregada! Gracias');
    else if(o.estado==='cancelado')toast('El pedido '+o.ref+' fue cancelado');
  });
}
function campana(){
  try{
    const a=new (window.AudioContext||window.webkitAudioContext)();
    [880,1175,1568].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;o.connect(g);g.connect(a.destination);const t=a.currentTime+i*.14;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.start(t);o.stop(t+.4);});
  }catch{}
}

// ══════════════ Efectos ══════════════
let _tt=0;
function toast(m){const t=$('tlToast');t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2600);}
function volar(emoji,desde){
  const a=desde.getBoundingClientRect();
  const s=document.createElement('span');s.className='vuelo';s.textContent=emoji;
  s.style.left=(a.left+a.width/2-14)+'px';s.style.top=(a.top+a.height/2-14)+'px';
  document.body.appendChild(s);
  requestAnimationFrame(()=>{
    const b=$('tlTk')?.getBoundingClientRect()||{left:innerWidth/2,top:innerHeight-60,width:0,height:0};
    s.style.transform=`translate(${b.left+b.width/2-(a.left+a.width/2)}px,${b.top+b.height/2-(a.top+a.height/2)}px) scale(.4)`;s.style.opacity='.2';
  });
  setTimeout(()=>{s.remove();const i=$('tlTk');if(i){i.classList.remove('bump');void i.offsetWidth;i.classList.add('bump');}},720);
}
function fiesta(emos){
  if(MINI)return;
  const f=document.createElement('div');f.className='fiesta';
  const set=emos?.length?emos:['🍅','🥑','🍌','🥕'];
  for(let i=0;i<24;i++){const s=document.createElement('span');s.textContent=set[i%set.length];s.style.left=Math.random()*100+'%';s.style.animationDelay=(Math.random()*.6)+'s';s.style.fontSize=(20+Math.random()*16)+'px';f.appendChild(s);}
  document.body.appendChild(f);setTimeout(()=>f.remove(),2600);
}
function sellado(ref){
  if(MINI)return;
  const f=document.createElement('div');f.className='sellado';f.setAttribute('aria-hidden','true');
  f.innerHTML=`<div><span><b>SELLADO</b><small>${esc(ref)}</small></span></div>`;
  document.body.appendChild(f);setTimeout(()=>f.remove(),1800);
}
async function copiar(v){
  try{await navigator.clipboard.writeText(v);}catch{const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch{}t.remove();}
  toast('Copiado: '+v);buzz(10);
}

// ══════════════ Dictado ══════════════
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null;
function dictar(){
  if(!SR){toast('Usá el micrófono 🎤 de tu teclado para dictar');$('tlQ')?.focus();return;}
  if(rec){rec.stop();return;}
  rec=new SR();rec.lang='es-CR';rec.interimResults=false;rec.maxAlternatives=1;
  $('tlMic')?.classList.add('on');
  rec.onresult=e=>{const t=e.results[0][0].transcript;C.q=t;const q=$('tlQ');if(q)q.value=t;procesarLista();};
  rec.onend=()=>{rec=null;$('tlMic')?.classList.remove('on');};
  rec.onerror=()=>{toast('No te escuché bien, probá de nuevo');};
  try{rec.start();}catch{rec=null;$('tlMic')?.classList.remove('on');}
}
function procesarLista(){
  marcarBusqueda();
  const L=leerLista(C.q);
  C.parse=L.length&&L.some(x=>x.p)?L:null;
  const el=$('tlParse');if(el)el.innerHTML=parseHtml();
  pintarGrid();
}

// ══════════════ Eventos ══════════════
let _qt=0;
// El micrófono se cambia por ✕ cuando hay algo escrito.
function marcarBusqueda(){const v=!!C.q;const m=$('tlMic'),x=$('tlLimpiar');if(m)m.hidden=v;if(x)x.hidden=!v;}
function limpiarBusqueda(){C.q='';C.parse=null;const q=$('tlQ');if(q)q.value='';marcarBusqueda();const el=$('tlParse');if(el)el.innerHTML='';pintarGrid();}
function ligar(){
  const f=$('tlAsk'),q=$('tlQ');
  if(f&&q){
    const buscar=()=>{C.q=q.value;marcarBusqueda();const L=pareceLista(C.q)?leerLista(C.q):null;C.parse=L&&L.some(x=>x.p)?L:null;$('tlParse').innerHTML=parseHtml();pintarGrid();};
    f.addEventListener('submit',e=>{e.preventDefault();clearTimeout(_qt);buscar();q.blur();});
    q.addEventListener('input',()=>{C.q=q.value;marcarBusqueda();clearTimeout(_qt);_qt=setTimeout(buscar,240);});
    $('tlMic').addEventListener('click',dictar);
  }
  const on=(id,fn)=>{const el=$(id);if(el)el.addEventListener('input',()=>fn(el.value));};
  on('tlNota',v=>{C.nota=v;guardar();});
  on('tlSenas',v=>{C.retiro.senas=v;guardar();});
  on('tlPlaca',v=>{C.retiro.placa=v;guardar();});
  on('tlUbiLink',v=>{const c=leerCoords(v);if(c){C.retiro.ubi=c;guardar();toast('📍 Ubicación lista');C.pulso=true;render();}else if(v.length>12)toast('Ese link no trae la ubicación; usá el botón 📍');});
  const nom=$('tlNombre'),tel=$('tlTel');
  if(nom&&tel){
    const chk=()=>{C.perfil.nombre=nom.value;C.perfil.tel=tel.value;guardar();pintarBar();};
    nom.addEventListener('input',chk);tel.addEventListener('input',chk);
    tel.addEventListener('blur',()=>{const e=$('tlPerfilErr');if(e)e.textContent=tel.value&&telDig(tel.value).length!==8?'El teléfono debe tener 8 números (ej.: 8888-1234)':'';});
  }
}
const ACT={
  tile(el){const k=el.dataset.k;if(C.cesta[k])abrirProd(k);else add(k,el);},
  mas(el){const p=prod(el.dataset.k);setQ(p.k,(C.cesta[p.k]?.q||0)+p.s);buzz(6);render();},
  menos(el){const p=prod(el.dataset.k);setQ(p.k,(C.cesta[p.k]?.q||0)-p.s);buzz(6);render();},
  info(el){abrirProd(el.dataset.k);},
  // la pestaña salta a su pasillo dentro de la lista
  pasillo(el){const sec=$('pas-'+el.dataset.k);if(!sec)return;const tope=$('tlBuscar')?.offsetHeight||0;window.scrollTo({top:sec.getBoundingClientRect().top+window.scrollY-tope-6,behavior:'smooth'});marcarTab(el.dataset.k);},
  recetas(){abrirHoja({tipo:'recetas'});},
  receta(el){abrirHoja({tipo:'receta',k:el.dataset.k,personas:C.personas,off:new Set()});},
  'mas-recetas'(){C.verRecetas=!C.verRecetas;render();},
  'rec-cat'(el){C.recCat=el.dataset.k;C.verRecetas=false;render();},
  sumar(el){add(el.dataset.k,el);},
  avisame(){N.avisos.pedir().then(r=>{toast(r==='granted'?'🔔 Listo: te avisamos en el teléfono':'Tu navegador no permitió avisos; te avisamos por WhatsApp');render();});},
  'limpiar-q'(){limpiarBusqueda();$('tlQ')?.focus();},
  ir(el){ir(el.dataset.p);},
  paso(el){
    const i=+el.dataset.i;
    if(pedidoVisto()){if(i===2)$('tlStep6')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(i===0)return ir('armar');
    const f=faltaArmar();if(f){avisarFalta(f);return;}
    ir('confirmar');
  },
  siguiente(){const f=faltaArmar();if(f){avisarFalta(f);return;}ir('confirmar');},
  tema(){const t=temaActual()==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('cn_theme',t);}catch{}pintarTema();pintarBit();},
  ver(el){ver(el.dataset.id);},
  nuevo(){C.pasillo=null;C.q='';ir('armar');},
  repetir(el){
    const o=N.get(el.dataset.id);if(!o)return;let n=0;
    o.items.forEach(i=>{const p=prod(i.k);if(p&&!p.agotado&&i.estado!=='nohay'){C.cesta[i.k]={q:i.q,mad:i.mad||'',nota:i.nota||''};n++;}});
    guardar();C.pulso=true;
    // Exprés: si ya sabemos entrega y pago, va directo a revisar y sellar
    const pr=n===1?'1 producto':n+' productos';
    if(el.dataset.express&&!puedeIr('sellar')){toast('⚡ '+pr+' · revisá y sellá');ir('sellar');}
    else{toast('🔁 '+pr+' en tu canasta');ir('armar');}
  },
  'parse-t'(el){const x=C.parse[+el.dataset.i];if(x.p&&!x.p.agotado)x.on=!x.on;$('tlParse').innerHTML=parseHtml();},
  'parse-no'(){limpiarBusqueda();},
  'parse-ok'(){
    const ok=C.parse.filter(x=>x.p&&x.on);
    ok.forEach(x=>sumar(x.p.k,x.q));
    guardar();C.parse=null;C.q='';C.pulso=true;
    toast('✨ '+ok.length+' productos agregados');fiesta(ok.map(x=>x.p.e));render();
  },
  sust(el){C.sust=el.dataset.k;guardar();render();},
  suc(el){C.retiro.suc=el.dataset.k;guardar();C.pulso=true;render();},
  cuando(el){C.retiro.modo=el.dataset.v;asegurarRetiro();guardar();C.pulso=true;render();},
  dia(el){C.retiro.dia=+el.dataset.d;C.retiro.hora=null;asegurarRetiro();guardar();render();},
  hora(el){C.retiro.hora=el.dataset.h;guardar();C.pulso=true;render();},
  entrega(el){C.retiro.entrega=el.dataset.v;C.retiro.carro=el.dataset.v==='carro';guardar();C.pulso=true;render();if(el.dataset.v==='envio'&&!C.retiro.ubi){setTimeout(()=>$('tlUbiBtn')?.scrollIntoView({block:'center',behavior:'smooth'}),80);tomarUbicacion();}},
  'ubi-gps'(){tomarUbicacion();},
  metodo(el){C.pago.metodo=el.dataset.k;guardar();C.pulso=true;render();},
  con(el){C.pago.conCuanto=+el.dataset.v;guardar();render();},
  'edit-perfil'(){C.editPerfil=true;render();$('tlNombre')?.focus();},
  pedir(){hacerPedido();},
  'wa-enviar'(){
    const o=pedidoVisto();if(!o)return;
    abrir(N.wa(N.waDe(o.sucursal),msgTienda(o)));
    N.cambiar(o.id,x=>{x.waPendiente=true;x.waAbiertoAt=new Date().toISOString();},'cliente','WhatsApp abierto; pendiente de confirmación').then(()=>{toast('WhatsApp abierto · confirmá el envío al regresar');render();});
  },
  'wa-confirmar'(){
    const o=pedidoVisto();if(!o)return;
    if(!confirm('¿Ya tocaste “Enviar” en WhatsApp para el pedido '+o.ref+'?'))return;
    N.cambiar(o.id,x=>{x.avisado=true;x.waPendiente=false;x.avisadoAt=new Date().toISOString();},'cliente','Cliente confirmó envío por WhatsApp').then(()=>{toast('✅ Confirmado · pendiente de aceptación de la tienda');render();});
  },
  'wa-tienda'(){const o=pedidoVisto();abrir(N.wa(N.waDe(o?.sucursal),`Hola, sobre mi pedido ${o?.ref||''} de ARAMO: `));},
  'wa-estado'(){const o=pedidoVisto();if(!o)return;abrir(N.wa(N.waDe(o.sucursal),`Hola, sobre mi pedido ${o.ref} de ARAMO: ¿me confirman cuando esté listo y me mandan el enlace actualizado para ver el paso 6?`));},
  comprobante(){const o=pedidoVisto();abrir(N.wa(N.waDe(o.sucursal),`📲 Comprobante SINPE del pedido ${o.ref} por ${$c(N.totalDe(o))} (adjunto la captura).`));},
  'ya-pague'(){N.cambiar(C.actual,o=>{o.pago.estado='reportado';o.pago.reportado=new Date().toISOString();},'cliente','El cliente avisó que pagó').then(()=>{toast('¡Gracias! La tienda lo confirma al entregarte');render();});},
  'actualizar-pedido'(){
    const o=pedidoVisto();if(!o)return;
    toast('🔄 Revisando el estado de tu pedido…');
    N.conectar({ids:C.mis}).then(()=>{
      const actualizado=N.get(o.id);
      render();
      if(actualizado?.estado==='listo')toast('✅ ¡La tienda ya lo marcó como listo!');
      else if(actualizado?.estado==='entregado')toast('🛍️ Tu pedido ya fue entregado');
      else if(N.modo()!=='nube')toast('📲 En modo WhatsApp, abrí el enlace de seguimiento que te mande la tienda');
      else toast('⏳ La tienda todavía lo está alistando');
    });
  },
  'paso6'(){
    $('tlStep6')?.scrollIntoView({behavior:'smooth',block:'center'});
  },
  'link-pago'(){abrir(T().linkTarjeta);},
  mapa(){const o=pedidoVisto(),s=suc(o?.sucursal);abrir('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s?.mapa||s?.n||'ARAMO'));},
  cancelar(){
    const o=pedidoVisto();if(!o||o.estado!=='nuevo')return;
    if(!confirm('¿Cancelar el pedido '+o.ref+'?'))return;
    N.cambiar(o.id,x=>{if(x.estado==='nuevo'){x.estado='cancelado';x.motivo='Lo canceló el cliente';}},'cliente').then(x=>{
      if(x?.estado!=='cancelado'){toast('Ya lo están alistando; escribile a la tienda');render();return;}
      if(N.modo()!=='nube'&&o.avisado)abrir(N.wa(N.waDe(o.sucursal),`Hola, cancelo mi pedido ${o.ref}. ¡Gracias!`));
      toast('Pedido cancelado');render();
    });
  },
  rating(el){N.cambiar(C.actual,o=>{o.rating=+el.dataset.v;},'cliente','Calificó con '+el.dataset.v).then(()=>{toast('¡Gracias por contarnos!');render();});},
  copiar(el){copiar(el.dataset.v);},
  // hojas
  'h-x'(){cerrarHoja();},
  'h-mas'(){const p=prod(H.k);H.q=+(H.q+p.s).toFixed(2);pintarHoja();buzz(6);},
  'h-menos'(){const p=prod(H.k);H.q=Math.max(p.s,+(H.q-p.s).toFixed(2));pintarHoja();buzz(6);},
  'h-set'(el){H.q=+el.dataset.v;pintarHoja();},
  'h-mad'(el){H.mad=H.mad===el.dataset.v?'':el.dataset.v;pintarHoja();},
  'h-quitar'(){delete C.cesta[H.k];guardar();cerrarHoja();render();},
  'h-ok'(){const nuevo=!C.cesta[H.k];C.cesta[H.k]={q:H.q,mad:H.mad||'',nota:(H.nota||'').trim()};guardar();if(nuevo){C.ultimo=H.k;C.pulso=true;}cerrarHoja();render();if(nuevo)toast('Agregado a tu canasta');},
  'h-per'(el){H.personas=+el.dataset.v;C.personas=H.personas;guardar();pintarHoja();buzz(5);},
  'h-ing'(el){const k=el.dataset.k;H.off.has(k)?H.off.delete(k):H.off.add(k);pintarHoja();},
  'h-receta'(){
    const r=RECETAS().find(x=>x.k===H.k),L=ingredientes(r,H.personas,H.off).filter(x=>x.on);
    L.forEach(x=>sumar(x.p.k,x.q));
    guardar();cerrarHoja();C.pulso=true;fiesta(L.map(x=>x.p.e));toast(`${r.e} ${r.n}: ${L.length} productos a tu canasta`);buzz([20,30,20]);
    if(C.actual||C.paso!=='armar')ir('armar');else render();
  },
};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
  const f=ACT[el.dataset.act];if(!f)return;
  e.preventDefault();e.stopPropagation();f(el);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&H){cerrarHoja();return;}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[role="button"][data-act]')){e.preventDefault();e.target.click();}
});
$('tlSheetBg').addEventListener('click',()=>cerrarHoja());
$('tlBitBtn').addEventListener('click',()=>abrirHoja({tipo:'pedidos'}));

// Tema: el del teléfono (claro u oscuro), o el que el cliente eligió
function temaActual(){return document.documentElement.dataset.theme==='light'?'light':'dark';}
function pintarTema(){const d=temaActual()==='dark';document.querySelector('meta[name="theme-color"]').content=d?'#060f0b':'#f5f3ea';}
pintarTema();
DESK.addEventListener?.('change',()=>render());

// ══════════════ Arranque ══════════════
N.on(tipo=>{
  if(tipo==='tienda')_cat=null;
  if(tipo==='encargo'||tipo==='tienda'){vigilar();if(!H)render();else pintarBit();}
  if(tipo==='modo')pintarChips();
});
function importarHash(){
  const m=location.hash.match(/^#e=(.+)$/);if(!m)return false;
  const o=N.unpack(m[1]);if(!o?.id)return false;
  N.importar(o);C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];guardar();C.actual=o.id;
  if(!estados[o.id])estados[o.id]=N.get(o.id)?.estado;
  vigilar();
  return true;
}
if(!importarHash()){
  const a=activo();
  if(a&&!cestaN()&&!MINI)C.actual=a.id; // la mesa abre en lo que importa ahora
}
window.addEventListener('hashchange',()=>{if(importarHash()){history.replaceState({paso:C.paso,id:C.actual},'',location.pathname+location.search);render(true);arriba();}});
// ══════════════ Equipo de la tienda ══════════════
// Si este teléfono atiende un local (se eligió al abrir ARAMO), el Taller también
// avisa de cada pedido nuevo de ese local y lleva directo al Mostrador.
const LOCAL_TIENDA=MINI?null:LS.get('aramo_local',null);
document.querySelector('.tl-back')?.toggleAttribute('hidden',!LOCAL_TIENDA);
const avisados=new Set();let tiendaLista=false;
function vigilarTienda(){
  if(!LOCAL_TIENDA)return;
  N.lista().forEach(o=>{
    if(o.estado!=='nuevo'||o.sucursal!==LOCAL_TIENDA||avisados.has(o.id)||C.mis.includes(o.id))return;
    avisados.add(o.id);
    if(!tiendaLista)return; // los que ya estaban al abrir no suenan otra vez
    toast('🛎️ Pedido nuevo '+o.ref+' · '+o.cliente.nombre);campana();buzz([120,60,120]);
    N.avisos.mostrar('🛎️ Pedido nuevo · '+o.ref,`${o.cliente.nombre} · ${o.items.length} productos`,{tag:'nuevo-'+o.id,fijo:true,url:new URL('APP.html#ver='+o.id,location.href).href});
    let a=$('tlTienda');if(!a){a=document.createElement('a');a.id='tlTienda';a.className='tl-tienda';document.body.appendChild(a);}
    a.href='APP.html#ver='+o.id;a.innerHTML=`🛎️ <b>${esc(o.ref)}</b> · pedido nuevo · Ir al Mostrador →`;
  });
}
N.on(t=>{if(t==='encargo')vigilarTienda();});
if(!MINI){
  history.replaceState({paso:C.paso,id:C.actual},'',location.pathname+location.search);
  if(LOCAL_TIENDA)N.conectar().then(()=>{vigilarTienda();tiendaLista=true;});
  else N.conectar({ids:C.mis});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
render(true);
window.ARAMO_CANASTA_APP={C,leerLista,hacerPedido,ir,ver};
})();
