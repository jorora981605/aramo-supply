/* ══════════════════════════════════════════════════════════════════════
   ARAMO · Puerta, Mostrador y Caja.

   Puerta: las 2 caras de ARAMO, cada una en su ventana con la app adentro
   vista de lejos:
     🚚 Surtido — lo que ARAMO pide a sus proveedores (la app de siempre)
     🧺 Taller  — lo que los clientes le piden a ARAMO (canasta.html)

   Mostrador: el receptor de pedidos de cada tienda (ARAMO Moravia o LASR
   Los Ángeles). Avisa con sonido y notificación del teléfono, y lleva cada
   encargo de punta a punta: aceptar → alistar y pesar (peso real) → lista y
   avisar → cobrar en la Caja (arrastrando el pedido) → entregar con código.
   Dentro de ARAMO POS (window.aramoPOS) la venta queda registrada en el POS.

   Vitrina, recetario y ajustes viven en la misma nube que lee el Taller:
   cambiar un precio o una unidad aquí se ve al instante del lado del cliente.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const N=window.AramoNube,CFG=window.ARAMO_CANASTA;
if(!N||!CFG)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const buzz=p=>{try{if(navigator.userActivation?.hasBeenActive!==false)navigator.vibrate&&navigator.vibrate(p);}catch{}};
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const POS=window.aramoPOS||null;           // presente solo dentro de ARAMO POS
// Pedidos dentro del ARAMO POS (computadora y celular): APP.html?solo=pedidos&suc=moravia|angeles[&volver=<página>]
// Abre directo en Pedidos de esa tienda, nunca el menú; «Cerrar» le avisa al POS (postMessage 'aramo-pedidos-cerrar')
// o, si no está dentro de otra página, vuelve a `volver` (o atrás).
const QS=new URLSearchParams(location.search);
const SOLO_PEDIDOS=QS.get('solo')==='pedidos';
const MODO_POS=POS||/[?&]pos=1/.test(location.search)||SOLO_PEDIDOS;
const $c=N.colones;
const T=()=>N.tienda();
const suc=k=>(T().sucursales||[]).find(s=>s.k===k);
const sucNom=k=>{const s=suc(k);return s?`${s.n} · ${s.zona}`:'';};
// Quién atiende en este equipo (para la bitácora de cada colón): ya no se pide. Sale solo de la cuenta de personal con la que entró;
// si no hay, queda «Mostrador <zona>». (Pronto será automático por usuario.)
const quienAtiende=()=>{const a=N.authEstado?.()||{},zona=suc(localK())?.zona||'';const who=a.personal&&a.email?String(a.email).split('@')[0]:'';return who?`${who} · ${zona}`:`Pedidos ${zona}`.trim();};
N.setQuien?.(()=>quienAtiende());
const fh=d=>new Date(d).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});
function fdia(d){const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);const n=Math.round((b-a)/864e5);return n===0?'hoy':n===1?'mañana':n===-1?'ayer':b.toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'});}
const esHoy=d=>fdia(d)==='hoy';
function fq(n){n=+n||0;if(Number.isInteger(n))return String(n);const w=Math.floor(n),f=+(n-w).toFixed(2),fr={.25:'¼',.5:'½',.75:'¾'}[f];return fr?(w||'')+fr:String(+n.toFixed(2)).replace('.',',');}
const UNIDADES=[['kg','kilo (kg)'],['unid','unidad'],['rollo','rollo / mazo'],['paquete','paquete'],['bolsa','bolsa'],['bolsita','bolsita'],['cartón','cartón'],['frasco','frasco'],['botella','botella']];
const UNI={kg:'kg',unid:'unid.',rollo:'rollo',paquete:'paq.',bolsita:'bolsita',bolsa:'bolsa','cartón':'cartón',frasco:'frasco',botella:'botella'};
const qtxt=(q,u)=>fq(q)+' '+(UNI[u]||u);
const kg=n=>(Math.round((+n||0)*1000)/1000).toLocaleString('es-CR',{maximumFractionDigits:3});
const telDig=t=>String(t||'').replace(/\D/g,'').replace(/^506/,'');
const fmtTel=t=>{const d=telDig(t);return d.length===8?d.slice(0,4)+'-'+d.slice(4):d;};
const MAD={hoy:'para comer hoy',semana:'para la semana',verde:'bien verde'};
const SUST={avisar:'📞 Avisarle',similar:'🔁 Algo parecido',quitar:'✖️ Quitarlo'};
function minsA(iso){return Math.round((Date.parse(iso)-Date.now())/6e4);}
function falta(iso){
  const m=minsA(iso);
  if(Math.abs(m)<1)return 'ahora';
  const a=Math.abs(m),t=a<60?a+' min':Math.floor(a/60)+' h'+(a%60?' '+(a%60)+' min':'');
  return m>0?'en '+t:'hace '+t;
}
const mapaUrl=u=>'https://www.google.com/maps/search/?api=1&query='+u.lat+','+u.lng;
function uberLink(o){
  // Abre la app de Uber con la recogida (la tienda) y el destino (la ubicación del cliente) ya puestos.
  // Si la tienda todavía no guardó su ubicación exacta, Uber toma como salida donde está este aparato (la tienda).
  const s=suc(o.sucursal),e=o.retiro.envio,ub=N.ubiSuc(s),q=['action=setPickup'];
  if(ub.exacta)q.push('pickup[latitude]='+ub.lat,'pickup[longitude]='+ub.lng,'pickup[nickname]='+encodeURIComponent(s.n+' '+s.zona),'pickup[formatted_address]='+encodeURIComponent(s.mapa||s.n));
  else q.push('pickup=my_location');
  const nick=encodeURIComponent(o.cliente.nombre+' · '+o.ref);
  if(Number.isFinite(+e.lat)&&Number.isFinite(+e.lng)&&e.lat!=null&&e.lng!=null)q.push('dropoff[latitude]='+e.lat,'dropoff[longitude]='+e.lng,'dropoff[nickname]='+nick);
  else q.push('dropoff[nickname]='+nick);
  if(e.senas)q.push('dropoff[formatted_address]='+encodeURIComponent(e.senas));
  return 'https://m.uber.com/ul/?'+q.join('&');
}
function abrir(url){const w=window.open(url,'_blank','noopener');if(!w)location.href=url;}
let _tt=0;
// Un solo sistema de avisos (aramo-ui.js). Arriba, como siempre: abajo taparía Pesar y Cobrar.
function toast(m){AramoUI.aviso(m,{id:'moToast',arriba:true,icono:false});}
// La campana suena SOLO cuando llega un pedido nuevo al Mostrador (y en "Probar").
function campana(fuerte){
  if(!R.sonido)return;
  try{const a=new (window.AudioContext||window.webkitAudioContext)();(fuerte?[660,880,990,1320,990,1320]:[660,880,990]).forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;o.connect(g);g.connect(a.destination);const t=a.currentTime+i*.14;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.start(t);o.stop(t+.35);});}catch{}
}

// ══════════════ Receptor (este equipo) ══════════════
const R=Object.assign({suc:'todas',sonido:true,pantalla:false},LS.get('aramo_receptor',{}));
function guardarR(){LS.set('aramo_receptor',R);}
const paraMi=o=>R.suc==='todas'||o.sucursal===R.suc;
const receptorNom=()=>R.suc==='todas'?'Ambas tiendas':sucNom(R.suc);
const localNom=k=>k==='todas'?'Ambos · Moravia y Los Ángeles':sucNom(k);
const localIcon=k=>k==='todas'?'🧺':k==='moravia'?'🏠':'📍';
let _wake=null;
async function pantallaEncendida(){
  try{
    if(!R.pantalla){if(_wake){await _wake.release();_wake=null;}return;}
    if(!_wake&&navigator.wakeLock&&document.visibilityState==='visible'){_wake=await navigator.wakeLock.request('screen');_wake.addEventListener('release',()=>{_wake=null;});}
  }catch{}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pantallaEncendida();});

// ══════════════ Local en uso (se elige al abrir la app) ══════════════
// Cada local tiene contraseña (de fábrica 12345). Por ahora está APAGADA:
// se activa en ⚙️ Ajustes de la pantalla principal.
const CLAVE_FABRICA='12345';
let LOCAL=null;
try{LOCAL=sessionStorage.getItem('aramo_local_sesion');}catch{}
if(SOLO_PEDIDOS&&['moravia','angeles'].includes(QS.get('suc'))){LOCAL=QS.get('suc');try{sessionStorage.setItem('aramo_local_sesion',LOCAL);}catch{}}
const localK=()=>LOCAL&&LOCAL!=='todas'?LOCAL:'moravia';
async function huella(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('aramo:'+t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
const acceso=()=>({activo:false,claves:{},...(T().acceso||{})});
async function claveOk(k,clave){const h=acceso().claves?.[k]||await huella(CLAVE_FABRICA);return (await huella(String(clave)))===h;}
function usarLocal(k){
  LOCAL=k;LS.set('aramo_local',k);try{sessionStorage.setItem('aramo_local_sesion',k);}catch{}
  R.suc=k;M.suc=k;guardarR();
  try{if(typeof chooseOrderScope==='function')chooseOrderScope(k==='todas'?'both':k==='moravia'?'moravia':'lasr');}catch{}
  document.getElementById('scopePicker')?.classList.remove('open');document.body.classList.remove('scope-picker-open');
}
let _trasLocal=null,_locCancelar=null;
// Elegir tienda (rediseño, Fase 2): una lista con las tres opciones; la última usada lleva "Último".
// Al arrancar elegir es obligatorio; desde el Inicio (o al salir de "Las dos") se puede cancelar.
// Teclas en la compu: 1 Moravia · 2 Los Ángeles · 3 Las dos · Esc cancelar.
function pedirLocal(despues,cancelar){
  _trasLocal=despues||null;_locCancelar=cancelar||null;M.locPend=null;M.clave='';
  const ultimo=LS.get('aramo_local',null),activo=acceso().activo;
  const el=$('loc');
  const opciones=[
    {k:'moravia',t:'1',ico:'moravia',n:suc('moravia')?.zona||'Moravia',sub:suc('moravia')?.n||'ARAMO'},
    {k:'angeles',t:'2',ico:'angeles',n:suc('angeles')?.zona||'Los Ángeles',sub:suc('angeles')?.n||'LASR'},
    {k:'todas',t:'3',n:'Las dos',sub:'Solo para Inventario'}
  ];
  el.innerHTML=`<div class="loc-in loc6">
    <div class="loc6-logo" aria-hidden="true">ARAMO${ICO('hoja',18)}</div>
    <h1 id="locTit">¿Dónde estás trabajando hoy?</h1>
    <p class="loc6-sub">Lo podés cambiar cuando querás.</p>
    <div class="loc-ops loc6-ops" role="group" aria-labelledby="locTit">${opciones.map(x=>`<button type="button" class="loc-op loc6-op ${x.k}${ultimo===x.k?' ult':''}" data-loc="${x.k}">
      <span class="loc6-ico${x.ico?'':' dos'}" aria-hidden="true">${x.ico?ICO(x.ico,24):'<i></i><i></i>'}</span>
      <span class="loc-t"><b>${esc(x.n)}</b><small>${esc(x.sub)}${ultimo===x.k?'<span class="loc6-ult">Último</span>':''}</small></span>
      <kbd aria-hidden="true">${x.t}</kbd>${ICO('siguiente',22)}</button>`).join('')}</div>
    <div id="locClave"></div>
    <p class="loc6-pie">${ICO('candado',16)}${activo?'Cada tienda pide su contraseña':'Entrada sin contraseña · se activa en Ajustes'}</p>
    ${_locCancelar?'<button type="button" class="ui-btn ui-btn--fantasma ui-btn--l loc6-cancelar" data-loc-cancelar>Cancelar</button>':''}
  </div>`;
  el.classList.add('open');document.body.classList.add('pu-lock');
  requestAnimationFrame(()=>el.querySelector('.loc-op.ult,.loc-op')?.focus({preventScroll:true}));
}
function cancelarLocal(){const f=_locCancelar;if(!f)return;_locCancelar=null;_trasLocal=null;M.locPend=null;M.clave='';cerrarLocal();f();}
function cerrarLocal(){$('loc').classList.remove('open');}
function entrarLocal(k){
  usarLocal(k);cerrarLocal();buzz(10);
  const sig=_trasLocal;_trasLocal=null;
  if(sig)sig();else if(k==='todas')abrirSurtidoAmbos();else abrirPuerta();
  toast(`${k==='moravia'?'🏠':k==='angeles'?'📍':'🧺'} ${k==='todas'?'Ambos · Moravia y Los Ángeles':sucNom(k)}`);
}
function pintarClave(k,mal){
  const d=(M.clave||'').padEnd(5,' ').split('');
  document.querySelectorAll('#loc .loc-op').forEach(b=>b.classList.toggle('elegida',b.dataset.loc===k));
  $('locClave').innerHTML=`<div class="loc-clave${mal?' mal':''}"><p>Contraseña de <b>${esc(localNom(k))}</b></p><div class="loc-dig">${d.map(c=>`<span class="${c!==' '?'f':''}">${c!==' '?'•':''}</span>`).join('')}</div>
    ${mal?`<p class="loc6-error" role="alert">${ICO('alerta',16)}Esa contraseña no es. Probá otra vez.</p>`:''}
    <div class="loc-pad">${[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(x=>`<button type="button" data-clave="${x}"${x==='⌫'?' aria-label="Borrar"':x==='✓'?' aria-label="Entrar"':''}>${x}</button>`).join('')}</div></div>`;
}
document.addEventListener('keydown',e=>{
  if(!$('loc')?.classList.contains('open')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Escape'&&_locCancelar){e.preventDefault();cancelarLocal();return;}
  if(M.locPend||e.target.matches?.('input,textarea'))return;
  const k={'1':'moravia','2':'angeles','3':'todas'}[e.key];
  if(k){e.preventDefault();$('loc').querySelector(`[data-loc="${k}"]`)?.click();}
});
document.addEventListener('click',async e=>{
  if(e.target.closest('[data-loc-cancelar]')){cancelarLocal();return;}
  const op=e.target.closest('[data-loc]');
  if(op){
    const k=op.dataset.loc;
    if(!acceso().activo){entrarLocal(k);return;}
    M.locPend=k;M.clave='';pintarClave(k);return;
  }
  const t=e.target.closest('[data-clave]');
  if(t&&M.locPend){
    const x=t.dataset.clave;
    if(x==='⌫')M.clave=M.clave.slice(0,-1);
    else if(x!=='✓'&&M.clave.length<5)M.clave+=x;
    if(M.clave.length===5||x==='✓'){
      if(await claveOk(M.locPend,M.clave)){const k=M.locPend;M.locPend=null;M.clave='';entrarLocal(k);return;}
      M.clave='';pintarClave(M.locPend,true);buzz([60,40,60]);return;
    }
    pintarClave(M.locPend);
  }
});

// ══════════════ Datos vivos del Surtido ══════════════
// Lo del pedido a proveedores que se ve en el Inicio: SOLO de la tienda de este aparato (las tiendas son aparte).
// En "Las dos" se cuentan las dos, separadas. "Por enviar" mira lo enviado de ESA tienda (no la marca general).
function surtidoResumen(){
  const lados=LOCAL==='moravia'?['moravia']:LOCAL==='angeles'?['angeles']:['moravia','angeles'];
  let prods=0;const provs=new Set(),sinEnviar=new Set(),porTienda={moravia:new Set(),angeles:new Set()};
  const enviado=(p,side)=>{const b=p?.sentByBranch||p?.notes?.__sentByBranch;return b&&typeof b==='object'&&side in b?!!b[side]:!!p?.sent;};
  try{
    Object.entries(S.pedidos||{}).forEach(([prov,p])=>{
      lados.forEach(side=>{
        let hay=false;
        Object.values(p?.qtys?.[side]||{}).forEach(v=>{if(+v?.qty>0){prods++;hay=true;}});
        (p?.extras?.[side]||[]).forEach(x=>{if(x&&(x.name||x.n)&&+(x.qty??1)>0){prods++;hay=true;}});
        if(!hay)return;
        provs.add(prov);
        if(!enviado(p,side)){sinEnviar.add(prov);porTienda[side].add(prov);}
      });
    });
  }catch{}
  return{prods,provs:provs.size,sinEnviar:sinEnviar.size,porTienda:{moravia:porTienda.moravia.size,angeles:porTienda.angeles.size},dos:lados.length>1};
}
// Cuándo se puso cada costo (precios.updated_at, solo lectura): si un producto lo trae más de un proveedor, vale el costo más nuevo.
const costoT={};let _costoTc=0;
function cargarCostoT(){
  try{
    if(typeof supa==='undefined'||!supa||Date.now()-_costoTc<120000)return;_costoTc=Date.now();
    supa.from('precios').select('proveedor,producto_id,updated_at').then(r=>{
      if(!r||r.error||!Array.isArray(r.data))return;
      r.data.forEach(f=>{costoT[f.proveedor+'|'+f.producto_id]=Date.parse(f.updated_at)||0;});
    },()=>{});
  }catch{}
}
function costoHoy(nombre){
  // El costo que ARAMO paga hoy por ese producto en Inventario: el que se puso más recién (si no se sabe cuándo, el más bajo).
  try{
    cargarCostoT();
    const exacto=nrm(nombre),key=exacto.split(' ')[0];let best=null;
    Object.entries(getAllProviders()).forEach(([prov,d])=>{
      if(d?.deleted)return;
      (d.products||[]).forEach(p=>{
        const pn=nrm(p.name);
        if(pn===exacto||pn.split(/\s+/)[0]===key){
          const pr=+getPrice(prov,p.id)||0,tt=costoT[prov+'|'+p.id]||0;
          if(pr>0&&(!best||tt>best.t||(tt===best.t&&pr<best.pr)))best={pr,prov,u:p.unit,t:tt};
        }
      });
    });
    return best;
  }catch{return null;}
}
// La regla única (catalogo-aramo.js): costo + 40 % (mínimo), redondeado hacia arriba a ₡25. Igual que en el POS.
const margenTienda=()=>{const C=window.ARAMO_CAT;return C&&C.margenDe?C.margenDe(T().margen):Math.max(40,+T().margen||0);};
const precioAuto=(costo,margen)=>{const C=window.ARAMO_CAT;return C&&C.precioMeta?C.precioMeta(costo,margen):Math.ceil((+costo||0)*(100+Math.max(40,+margen||0))/100/25-1e-9)*25;};
// Precio automático: si un producto está en 🤖, su precio sigue al costo del Cierre + margen.
//  · el costo sube y el precio queda corto → sube solo;
//  · el costo baja → el precio NO baja solo: queda una nota en la Vitrina («podés bajarlo a ₡X») con su botón.
const notasVit=()=>LS.get('aramo_vit_notas',{});
let _autoT=0;
function autoPrecios(){
  clearTimeout(_autoT);
  _autoT=setTimeout(()=>{
    const t=T(),ed=t.prods||{},precios={...(t.precios||{})},sucursales=(t.sucursales||[]).map(s=>({...s,precios:{...(s.precios||{})}})),notas={...notasVit()},mg=margenTienda();
    let subio=0,tocoSuc=false,tocoNotas=false;const nuevas=[];
    N.catalogo().forEach(p=>{
      if(!ed[p.k]?.auto)return;
      const c=costoHoy(p.n);if(!c)return;
      const v=precioAuto(c.pr,mg);let alto=0,subioEste=false;
      [{hoy:+precios[p.k]||0,g:1},...sucursales.filter(s=>s.precios[p.k]!=null).map(s=>({hoy:+s.precios[p.k]||0,s}))].forEach(l=>{
        if(l.hoy<v){if(l.g)precios[p.k]=v;else{l.s.precios[p.k]=v;tocoSuc=true;}subioEste=true;}
        else alto=Math.max(alto,l.hoy);
      });
      if(subioEste)subio++;
      if(alto>v){const n=notas[p.k];if(!n||n.sug!==v||n.hoy!==alto){notas[p.k]={sug:v,costo:c.pr,hoy:alto,t:Date.now()};nuevas.push(p.n);tocoNotas=true;}}
      else if(notas[p.k]){delete notas[p.k];tocoNotas=true;}
    });
    if(tocoNotas)LS.set('aramo_vit_notas',notas);
    if(subio){N.guardarTienda(tocoSuc?{precios,sucursales}:{precios});toast(`🤖 ${subio} precio${subio>1?'s':''} subió solo con el costo de hoy`);}
    else if(nuevas.length)toast(`💡 El costo bajó: ${nuevas.length>1?nuevas.length+' precios se pueden bajar':'podés bajar el precio de '+nuevas[0]} (Vitrina)`);
  },600);
}
if(typeof window.setPrice==='function'){const _sp=window.setPrice;window.setPrice=function(){const r=_sp.apply(this,arguments);try{costoT[arguments[0]+'|'+arguments[1]]=Date.now();}catch{}autoPrecios();return r;};}

// ══════════════ Encargos ══════════════
const activos=()=>N.lista().filter(o=>!o.archivado&&!['entregado','cancelado'].includes(o.estado));
const cerradosHoy=()=>N.lista().filter(o=>!o.archivado&&['entregado','cancelado'].includes(o.estado)&&esHoy(o.updated));
function avance(o){const it=o.items||[],r=it.filter(x=>x.estado==='listo'||x.estado==='nohay').length;return{r,n:it.length};}
// El Uber se pacta ANTES de pagar: con envío, la cotización no sale sin el costo real que la tienda ve en la app de Uber.
const sinUber=o=>!!o?.retiro?.envio&&!(+o.retiro.envio.costoUber>0);
function pedirUber(o){
  toast('🛵 Antes de mandar la cotización poné el costo del Uber (mirá el precio en la app de Uber)');
  if(M.abierto===o.id&&$('moSheet')?.classList.contains('open')){M.vista='encargo';repintar(pintarEncargo);}
  setTimeout(()=>{const i=$('moUberReal');if(i){i.scrollIntoView({block:'center',behavior:'smooth'});i.focus({preventScroll:true});}},120);
}
const urgente=o=>o.estado!=='listo'&&minsA(o.retiro.at)<=15;
const cobrado=o=>!!o.cobro||o.pago?.estado==='verificado';
const qReal=it=>it.qr!=null&&it.qr!==''?+it.qr:+it.q;
// Lo que pidió el cliente: si lo pidió en otra unidad (p. ej. 4 tomates), se muestra con su equivalente.
const pidio=i=>i.pide?`${qtxt(i.pide.q,i.pide.u)} (≈ ${i.u==='kg'?kg(i.q)+' kg':qtxt(i.q,i.u)})`:qtxt(i.q,i.u);
const precioIt=it=>it.pr!=null&&it.pr!==''?+it.pr:+it.p;
const nombres=o=>(o.items||[]).map(i=>i.n).join(', ');

// ══════════════ Estado de pantalla ══════════════
const M={tab:null,masD:false,suc:R.suc,abierto:null,pin:'',vista:null,vq:'',vcat:'todos',edit:null,rec:null,cobro:null,staffEmail:'',staffPass:''};
let primeraVez=true;
const sinAbrir=new Set(LS.get('aramo_sin_abrir',[]));
function guardarSinAbrir(){LS.set('aramo_sin_abrir',[...sinAbrir]);N.avisos.insignia(sinAbrir.size);}

// ══════════════ Montaje ══════════════
function montar(){
  const pu=document.createElement('div');
  pu.className='pu';pu.id='puerta';pu.setAttribute('role','dialog');pu.setAttribute('aria-label','ARAMO');
  pu.innerHTML='<div class="pu-in po" id="puIn"></div>';
  const lo=document.createElement('div');lo.className='loc';lo.id='loc';lo.setAttribute('role','dialog');lo.setAttribute('aria-label','Elegí el local');document.body.appendChild(lo);
  document.body.appendChild(pu);

  const mo=document.createElement('div');
  if(SOLO_PEDIDOS)document.body.classList.add('solo-pedidos');
  mo.className='mo';mo.id='mostrador';mo.setAttribute('role','dialog');mo.setAttribute('aria-label','Pedidos');
  mo.innerHTML=`<div class="mo-top"><button type="button" class="bk" data-mo="puerta" aria-label="Volver al menú principal" title="Volver al menú principal"><b aria-hidden="true">⌂</b> <span>Menú</span></button><button type="button" class="mo-lugar" id="moLugar" data-mo="receptor" aria-label="Elegir qué tienda recibe los pedidos en este equipo"></button><button type="button" class="pu-nube" id="moNube" data-mo="compartir"><i></i><span></span></button></div>
    <div class="mo-in"><div class="mo-cols"><div class="mo-main">
      <div id="moAlarma"></div><div id="moAvisos"></div><div class="mo-tabs" id="moTabs"></div><div id="moHoy"></div><div id="moAhora"></div><div class="mo-lista" id="moLista"></div><div id="moFaltan"></div>
      <div class="mo-herr">
        <button type="button" data-mo="caja"><b>🧾</b>Caja de hoy</button>
        <button type="button" data-mo="vitrina"><b>🏷️</b>Precios</button>
        <button type="button" data-mo="clientes"><b>👥</b>Clientes</button>
        <button type="button" data-mo="reiniciar"><b>🔄</b>Reiniciar</button>
        <button type="button" data-mo="mas" aria-expanded="false" id="moMasBtn"><b>⋯</b>Más</button>
      </div>
      <div class="mo-herr mo-mas" id="moMas" hidden>
        <button type="button" data-mo="recetario"><b>📖</b>Recetario</button>
        <button type="button" data-mo="ajustes"><b>💳</b>Pagos y horarios</button>
        <button type="button" data-mo="compartir"><b>📣</b>Compartir La Feria</button>
        <button type="button" data-mo="prueba"><b>🧪</b>Pedido de prueba</button>
      </div></div>
      <aside class="mo-caja" id="moCaja" aria-label="Caja"></aside></div></div>`;
  document.body.appendChild(mo);
  const extraTools=$('moMas');if(extraTools)extraTools.insertAdjacentHTML('beforeend','<button type="button" data-mo="promos"><b>✨</b>Ofertas y link</button><button type="button" data-mo="analitica"><b>📊</b>Métricas</button><button type="button" data-mo="personal"><b>🔐</b>Cuenta de personal</button>');

  const bg=document.createElement('div');bg.className='mo-bg';bg.id='moBg';document.body.appendChild(bg);
  if(SOLO_PEDIDOS){const b=mo.querySelector('[data-mo="puerta"]');if(b){b.innerHTML='<b aria-hidden="true">✕</b> <span>Cerrar</span>';b.setAttribute('aria-label','Cerrar Pedidos y volver al POS');b.title='Volver al POS';}setInterval(avisarPOS,4000);setTimeout(avisarPOS,1500);}
  const sh=document.createElement('div');sh.className='mo-sheet';sh.id='moSheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');document.body.appendChild(sh);
  const pr=document.createElement('div');pr.id='moPrint';pr.setAttribute('aria-hidden','true');document.body.appendChild(pr);
  bg.addEventListener('click',cerrarHoja);

  const top=document.querySelector('.topbar');
  if(top&&!$('puHome')){const b=document.createElement('button');b.type='button';b.className='pu-home';b.id='puHome';b.setAttribute('aria-label','Volver al menú principal');b.title='Volver al menú principal';b.innerHTML='<span aria-hidden="true">⌂</span><span class="pu-home-label">Menú</span>';b.addEventListener('click',()=>abrirPuerta());top.insertBefore(b,top.firstChild);}
  window.addEventListener('resize',escalarMinis);
  const home=$('puHome');if(home){const replacement=home.cloneNode(true);home.replaceWith(replacement);replacement.addEventListener('click',volverAlMenu);}

  // Arrastrar un pedido a la Caja
  document.addEventListener('dragstart',e=>{const c=e.target.closest?.('.mo-card[data-id]');if(!c)return;e.dataTransfer.setData('text/aramo-encargo',c.dataset.id);e.dataTransfer.effectAllowed='move';document.body.classList.add('mo-arrastrando');});
  document.addEventListener('dragend',()=>document.body.classList.remove('mo-arrastrando'));
}

// ══════════════ Puerta ══════════════
function pintarNube(){
  const on=N.modo()==='nube';
  ['puNube','moNube'].forEach(id=>{const el=$(id);if(!el)return;el.classList.toggle('on',on);el.querySelector('span').textContent=on?'En vivo':'En este equipo';el.title=on?'Los pedidos se comparten en vivo entre equipos':'Nube: '+N.motivo();});
}
function alarmaHtml(){
  const L=[...sinAbrir].map(id=>N.get(id)).filter(o=>o&&o.estado==='nuevo'&&paraMi(o));
  if(!L.length)return '';
  const o=L[0];
  return `<button type="button" class="mo-alarma" data-mo="abrir" data-id="${o.id}"><span class="e">🛎️</span><span class="t"><small>${L.length>1?L.length+' pedidos nuevos':'Pedido nuevo'} · ${esc(sucNom(o.sucursal))}</small><strong>${esc(o.ref)} · ${esc(o.cliente.nombre)} · ${o.items.length} productos</strong><em>${o.retiro.envio?'🛵 envío':'Recoge'} ${esc(fdia(o.retiro.at))} ${esc(fh(o.retiro.at))} · ${esc(nombres(o))}</em></span><span class="go">ABRIR</span></button>`;
}
// La barra de arriba de la portada es la entrada al Mostrador y solo dice "Mostrador".
// Se pone naranja cuando hay pedidos nuevos.
function ahoraMostrador(a){
  const nuevos=a.filter(o=>o.estado==='nuevo').length;
  return{e:'🛎️',k:'',t:'Pedidos',s:'',cta:'Entrar',act:'mostrador',tono:nuevos?'urg':a.length?'ok':'calma'};
}
function bitacoraHoy(){
  const ev=[];
  N.lista().forEach(o=>{
    if(!paraMi(o)||o.archivado)return;
    (o.log||[]).forEach(l=>{if(esHoy(l.t))ev.push({t:Date.parse(l.t),txt:`${o.ref} · ${l.m||({nuevo:'Pedido recibido',alistando:'Empezó a alistarse',listo:'Quedó listo',entregado:'Entregado',cancelado:'Cancelado'}[l.s]||l.s)}`});});
  });
  ev.sort((a,b)=>b.t-a.t);
  return ev.slice(0,7).map(e=>`<div class="po5-ev"><span>${fh(e.t)}</span><span>${esc(e.txt)}</span></div>`).join('')||'<div class="po5-ev"><span>—</span><span>Todavía no hay movimientos hoy.</span></div>';
}
function datosPuerta(){
  const h=new Date().getHours();
  const sr=surtidoResumen();
  const a=activos().filter(paraMi),nuevos=a.filter(o=>o.estado==='nuevo').length,alist=a.filter(o=>o.estado==='alistando').length,listos=a.filter(o=>o.estado==='listo').length;
  const cob=N.lista().filter(o=>o.cobro&&esHoy(o.cobro.fecha)&&paraMi(o)),total=cob.reduce((t,o)=>t+(+o.cobro.total||0),0);
  const fd=new Date().toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'});
  const pasos=[['🏪','Proveedores',sr.provs||'—'],['🚚','Inventario',sr.prods?sr.prods+' prod.':'—'],['🏷️','Vitrina',N.catalogo().filter(p=>!p.oculto).length+' prod.'],['🧺','La Feria',a.length+' en curso'],['🛎️','Pedidos',listos+' listos'],['🧾','Caja',cob.length?$c(total):'₡0 hoy']];
  return{
    saludo:h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches',
    fecha:fd.charAt(0).toUpperCase()+fd.slice(1),hora:fh(new Date()),
    nubeOn:N.modo()==='nube',nube:N.modo()==='nube'?'En vivo':'En este equipo',
    local:LOCAL?`${localIcon(LOCAL)} ${LOCAL==='todas'?'Moravia y Los Ángeles':suc(LOCAL)?.zona||''}`:'📍 Local',
    avisosTxt:N.avisos.soportado()&&N.avisos.permiso()!=='granted'?'🔔 Activar avisos':'',
    alarma:'', // en la portada, los pedidos nuevos se ven en la barra naranja del Mostrador
    ahora:ahoraMostrador(a),
    s:{prods:sr.prods,provs:sr.provs,txt:sr.prods?`🧺 ${sr.prods} producto${sr.prods===1?'':'s'} · ${sr.provs} proveedor${sr.provs===1?'':'es'}`:'Pedido de hoy vacío',
       chip:sr.prods?`${sr.prods} productos · ${sr.provs} prov.`:'Pedido de hoy vacío',alerta:sr.sinEnviar?`${sr.sinEnviar} sin enviar`:''},
    t:{activos:a.length,nuevos,txt:a.length?`🛎️ ${a.length} pedido${a.length>1?'s':''} en curso`:'Lista para recibir pedidos',
       chip:a.length?`${a.length} en curso · ${listos} listos`:'Lista para recibir pedidos',alerta:nuevos?`${nuevos} nuevo${nuevos>1?'s':''}`:'',
       mo:`📡 ${receptorNom()} · `+(a.length?`${nuevos} nuevo${nuevos===1?'':'s'} · ${alist} alistando · ${listos} por entregar`:'recibir, alistar, cobrar y entregar')},
    p:{txt:'☁️ POS de '+localNom(LOCAL||'moravia')+' en la nube',chip:'POS de '+localNom(LOCAL||'moravia'),alerta:''},
    caja:{total:$c(total),n:cob.length},
    cadena:pasos.map((p,i)=>`${i?'<span class="pu-flecha">›</span>':''}<div class="pu-eslabon"><b>${p[0]}</b>${p[1]}<em>${esc(p[2])}</em></div>`).join(''),
    bit:bitacoraHoy(),
    ...datosInicio(sr,a,{nuevos,alist,listos,total}),
  };
}
// ── Datos del Inicio nuevo (portada 6, rediseño 2026-11-23) ──
const ICO=(n,t)=>typeof window.icono==='function'?window.icono(n,{t:t||20}):'';
const hoyTxt=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
function datosInicio(sr,a,c){
  const k=LOCAL&&LOCAL!=='todas'?LOCAL:'moravia',zona=suc(k)?.zona||(k==='moravia'?'Moravia':'Los Ángeles');
  const pl=(n,s,p)=>n+' '+(n===1?s:p);
  // La franja de avisos sale solo si están apagados y no la cerraron hoy.
  const pedirAvisos=N.avisos.soportado()&&N.avisos.permiso()!=='granted'&&LS.get('aramo_avisos_franja','')!==hoyTxt();
  // Los últimos 3 pedidos (los nuevos primero), para la compu.
  const est={nuevo:o=>`hace ${Math.max(1,-minsA(o.created||o.updated))} min`,alistando:()=>'alistando',listo:()=>'listo',entregado:o=>'entregado '+fh(o.updated),cancelado:()=>'cancelado'};
  const ultimos=[...a.slice().sort((x,y)=>(y.estado==='nuevo')-(x.estado==='nuevo')||Date.parse(y.created||0)-Date.parse(x.created||0)),...cerradosHoy().filter(paraMi).sort((x,y)=>Date.parse(y.updated||0)-Date.parse(x.updated||0))].slice(0,3);
  return{
    tienda6:`<button type="button" class="ui-tienda ui-tienda--filtro ui-tienda--${k}" data-pu="local" aria-label="Tienda: ${esc(zona)}. Tocá para cambiar">${esc(zona)}${ICO('bajar',16)}</button>`,
    avisos6:pedirAvisos?`<div class="ui-franja">${ICO('aviso',18)}<span>Activá los avisos para oír los pedidos nuevos</span><button type="button" class="ui-btn ui-btn--s ui-btn--secundario" data-pu="avisos-on">Activar</button><button type="button" class="ui-btn-ico" data-pu="avisos-cerrar" aria-label="Ahora no" title="Ahora no">${ICO('cerrar',18)}</button></div>`:'',
    mo6:{
      tit:c.nuevos?pl(c.nuevos,'pedido nuevo','pedidos nuevos'):'Pedidos',
      sub:c.nuevos?`Pedidos · ${c.alist} alistando`:`${c.nuevos} nuevos · ${c.alist} alistando · Caja ${$c(c.total)}`,
      caja:`Caja de hoy ${$c(c.total)}`,
      lista:ultimos.length?ultimos.map(o=>`<div class="po6-ped"><b>${esc(o.ref)}</b><span>${esc(o.cliente?.nombre||'')}</span><em>${esc((est[o.estado]||(()=>''))(o))}</em></div>`).join(''):'<p class="po6-ped-vacio">Todavía no hay pedidos hoy.</p>',
    },
    s6:{sub:'Pedido a proveedores',
       ins:(sr.sinEnviar?(sr.dos?['moravia','angeles'].filter(k=>sr.porTienda[k]).map(k=>`<span class="ui-estado ui-estado--pendiente">${ICO('reloj',16)}${k==='moravia'?'Moravia':'Los Ángeles'}: ${sr.porTienda[k]} por enviar</span>`).join(''):`<span class="ui-estado ui-estado--pendiente">${ICO('reloj',16)}${sr.sinEnviar} por enviar</span>`):'')+`<span class="ui-estado">${sr.prods?pl(sr.prods,'producto','productos'):'Pedido vacío'}</span>`},
    t6:{sub:'Tienda en línea de los clientes',ins:a.length?`<span class="ui-estado ui-estado--pendiente">${ICO('reloj',16)}${a.length} en curso</span>`:''},
    p6:{sub:'Caja de '+zona},pos2:LOCAL==='moravia'||LOCAL==='angeles',   // las dos tiendas: POS de la compu y POS celular
    c6:{sub:'Los Ángeles · cierres y gastos'},
  };
}
let _portadaMontada=0,_fotoT=0;
// Vaciar el menú principal (en "Las dos" no se usa): se olvida también qué portada tenía, así al volver a una
// tienda se dibuja completo. Antes quedaba vacío y la pantalla en blanco no dejaba tocar nada.
function vaciarPortada(){const r=$('puIn');if(r){r.replaceChildren();delete r.dataset.v;}_portadaMontada=0;}
function pintarPuerta(){
  if(LOCAL==='todas'){
    $('puerta')?.classList.remove('open','zoom');
    vaciarPortada();
    document.body.classList.remove('pu-lock');
    return;
  }
  const raiz=$('puIn');if(!raiz||!window.AramoPortadas)return;
  const v=window.AramoPortadas.pintar(raiz,datosPuerta());
  // El Control es SOLO de Los Ángeles (LASR): su puerta sale únicamente si la tienda de este aparato es Los Ángeles
  // (en Moravia, o sin tienda escogida —que cuenta como Moravia—, no sale).
  const sinControl=localK()!=='angeles';
  raiz.querySelectorAll('[data-pu="control"]').forEach(b=>{b.hidden=sinControl;});
  raiz.querySelector('.po6-puertas')?.classList.toggle('sin-control',sinControl);
  if(v!==_portadaMontada){
    _portadaMontada=v;
    if(v===1){clonarSurtido();requestAnimationFrame(escalarMinis);}
    if(v===5)ligarConsola();
  }
  pintarNube();
  clearTimeout(_fotoT);_fotoT=setTimeout(()=>guardarFoto(raiz,v),600);
}
// Foto de la portada para el arranque al instante (ver el inicio de APP.html). Sin ids ni
// vistas en vivo; la portada 1 (ventanas con el Taller adentro) no se guarda.
function guardarFoto(raiz,v){
  if(!$('puerta')?.classList.contains('open'))return;
  if(v===1){try{localStorage.removeItem('aramo_portada_foto');}catch{}return;}
  LS.set('aramo_portada_foto',{v,cls:raiz.className,html:raiz.innerHTML.replace(/\sid="[^"]*"/g,'')});
}
// ── Consola: escribir qué abrir ──
function sugerencias(q){
  q=nrm(q);
  const L=[];
  const P=[
    {r:/^(1|surt|invent|pedir|provee|compra)/,e:'🚚',t:'Abrir Inventario',s:'Pedidos a proveedores',act:'surtido'},
    {r:/^(2|taller|client|canasta|tienda online)/,e:'🧺',t:'Abrir La Feria',s:'Lo que ven los clientes',act:'canasta'},
    {r:/^(3|pos|caja|vend|cobr|factur)/,e:'🧾',t:'Abrir ARAMO POS',s:'Ventas y caja del mostrador',act:'pos'},
    {r:/^(m$|mostr|pedidos|encarg|recib)/,e:'🛎️',t:'Abrir Pedidos y Caja',s:'Recibir, alistar, cobrar y entregar',act:'mostrador'},
    {r:/^(prec|vitrin|product)/,e:'🏷️',t:'Precios y productos',s:'Cambiar precio, unidad o nombre',act:'vitrina'},
    {r:/^(recet)/,e:'📖',t:'Recetario',s:'Recetas de La Feria',act:'recetario'},
    {r:/^(ajust|sinpe|horari|whats)/,e:'⚙️',t:'Pagos y horarios',s:'SINPE, WhatsApp de cada tienda, horarios',act:'ajustes'},
    {r:/^(cierre|hoy|cobrad)/,e:'🧾',t:'Caja de hoy',s:'Cobros del día por método',act:'caja'},
  ];
  if(!q)return[{e:'🚚',t:'1 · Inventario',s:'Pedidos a proveedores',act:'surtido'},{e:'🧺',t:'2 · La Feria',s:'Lo que ven los clientes',act:'canasta'},{e:'🧾',t:'3 · ARAMO POS',s:'Ventas y caja',act:'pos'},{e:'🛎️',t:'M · Pedidos',s:'Pedidos de clientes',act:'mostrador'}];
  P.forEach(x=>{if(x.r.test(q))L.push(x);});
  // pedidos por código o por nombre del cliente
  N.lista().filter(o=>!o.archivado&&(nrm(o.ref).replace('-','').includes(q.replace('-',''))||nrm(o.cliente?.nombre).includes(q))).slice(0,4)
    .forEach(o=>L.push({e:'🛎️',t:`${o.ref} · ${o.cliente.nombre}`,s:`${{nuevo:'Nuevo',alistando:'Alistando',listo:'Listo',entregado:'Entregado',cancelado:'Cancelado'}[o.estado]||''} · ${$c(N.totalDe(o))}`,act:'abrir',id:o.id}));
  // productos: buscarlos en Inventario
  if(q.length>=3){
    const prod=N.catalogo().find(p=>nrm(p.n).startsWith(q))||N.catalogo().find(p=>nrm(p.n).includes(q));
    if(prod)L.push({e:prod.e,t:`Buscar «${prod.n}» en Inventario`,s:'Ver quién lo vende y pedirlo',act:'surtir',n:prod.n});
    else L.push({e:'🔍',t:`Buscar «${q}» en Inventario`,s:'Entre todos los proveedores',act:'surtir',n:q});
  }
  return L.slice(0,6);
}
function ligarConsola(){
  const f=$('poCmd'),q=$('poCmdQ'),box=$('poCmdSug');if(!f||!q||!box)return;
  const pintar=()=>{if(!q.value.trim()&&document.activeElement!==q){box.innerHTML='';return;}const L=sugerencias(q.value);box.innerHTML=L.map((x,i)=>`<button type="button" class="po5-opc${i===0?' on':''}" data-pu="${x.act}"${x.id?` data-id="${esc(x.id)}"`:''}${x.n?` data-n="${esc(x.n)}"`:''}><span>${x.e}</span><span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span>${i===0?'<kbd>Enter</kbd>':''}</button>`).join('');};
  q.addEventListener('input',pintar);q.addEventListener('focus',pintar);
  q.addEventListener('blur',()=>setTimeout(()=>{if(!q.value.trim()&&document.activeElement!==q)box.innerHTML='';},180));
  f.addEventListener('submit',e=>{e.preventDefault();box.querySelector('.po5-opc')?.click();});
  pintar();
}
function clonarSurtido(){
  const box=$('puMiniS');if(!box)return;
  const frag=document.createElement('div');frag.className='app';
  const top=document.querySelector('.topbar'),pv=document.querySelector('#view-proveedores .pv-wrap'),nav=document.querySelector('.nav-bottom');
  [top,pv,nav].forEach(el=>{if(!el)return;const c=el.cloneNode(true);c.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));c.removeAttribute('id');c.querySelector?.('.pu-home')?.remove();frag.appendChild(c);});
  box.replaceChildren(frag);escalarMinis();
}
function escalarMinis(){
  document.querySelectorAll('.pu-vista').forEach(v=>{
    const box=v.parentElement,w=box.clientWidth,h=box.clientHeight-26;if(!w)return;
    const vw=Math.max(390,Math.round(w/.62)),k=w/vw,vh=Math.round(h/k);
    v.style.width=vw+'px';v.style.height=vh+'px';v.style.transform=`scale(${k})`;
    const f=v.querySelector('iframe');if(f){f.style.width=vw+'px';f.style.height=vh+'px';}
  });
}
function cerrarSolo(){
  try{if(window.parent&&window.parent!==window){window.parent.postMessage({tipo:'aramo-pedidos-cerrar'},location.origin);return;}}catch{}
  const v=QS.get('volver')||'';
  if(v&&!/^[a-z]+:|^\/\//i.test(v)){location.href=v;return;}            // solo páginas de ARAMO
  if(history.length>1)history.back();else location.href='pos/index.html?suc='+encodeURIComponent(localK());
}
// Cuántos pedidos hay, para que el POS ponga el numerito en su pestaña «Pedidos»
function avisarPOS(){
  if(!SOLO_PEDIDOS||window.parent===window)return;
  try{const L=N.lista().filter(o=>o.sucursal===localK()&&!o.borrado);
    window.parent.postMessage({tipo:'aramo-pedidos-estado',nuevos:L.filter(o=>o.estado==='nuevo').length,alistando:L.filter(o=>o.estado==='alistando').length,listos:L.filter(o=>o.estado==='listo').length},location.origin);}catch{}
}
function abrirPuerta(){
  if(SOLO_PEDIDOS){abrirMostrador();return;}   // dentro del POS no hay menú: siempre Pedidos
  cerrarHoja();
  $('mostrador').classList.remove('open');
  $('puerta').classList.remove('zoom');$('puerta').classList.add('open');document.body.classList.add('pu-lock');
  $('puerta').scrollTop=0;
  pintarPuerta();clonarSurtido();autoPrecios();
  requestAnimationFrame(escalarMinis);
}
// “Ambos” es un acceso directo al Inventario combinado. No muestra la portada,
// Mostrador ni POS porque esos módulos necesitan una sucursal específica.
function abrirSurtidoAmbos(){
  cerrarHoja();
  $('mostrador')?.classList.remove('open');
  $('puerta')?.classList.remove('open','zoom');
  vaciarPortada();
  document.body.classList.remove('pu-lock');
  try{switchView('proveedores');}catch(e){console.warn('No se pudo abrir Inventario combinado',e);}
  toast('🧺 Inventario combinado · Moravia + Los Ángeles');
}
// ARAMO POS en la nube: el POS del local elegido al entrar (Moravia o LASR), en cualquier dispositivo.
// En la compu se abre en otra pestaña (así el Mostrador sigue avisando); en el celular, aquí mismo.
function esCompu(){return /Windows|Macintosh|Linux/i.test(navigator.userAgent)&&!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);}
// modo 'celular' = ARAMO POS celular; 'compu' = POS completo. Ambos usan la misma caja.
function abrirPOS(modo){
  if(LOCAL==='todas'){toast('🧾 Para abrir el POS elegí Moravia o LASR en el selector de local');return;}
  const k=LOCAL||'moravia',cel=modo==='celular',u=(cel?'pos/cobrar.html':'pos/index.html')+'?suc='+encodeURIComponent(k);
  toast('🧾 Abriendo el POS '+(cel?'celular ':'')+'de '+localNom(k)+'…');
  if(!cel&&esCompu()){const w=window.open(u,'_blank');if(w)return;}
  location.href=u;
}
function cerrarPuerta(){$('puerta').classList.remove('open','zoom');document.body.classList.remove('pu-lock');}
function volverAlMenu(){
  if(LOCAL==='todas'){
    cerrarHoja();
    $('mostrador')?.classList.remove('open');
    cerrarPuerta();
    pedirLocal(null,()=>document.body.classList.remove('pu-lock'));   // Cancelar = seguir en el Surtido de las dos
    return;
  }
  abrirPuerta();
}
// Entrar es inmediato: sin animación de espera. Taller y POS ya están guardados en el
// teléfono (service-worker.js), así que abren al instante.
function entrar(cara){
  buzz(12);
  if(cara==='pos'||cara==='pos-compu'){abrirPOS('compu');return;}
  if(cara==='pos-celular'){abrirPOS('celular');return;}
  if(cara==='canasta'){
    // En la computadora el Taller abre en otra pestaña: ARAMO sigue escuchando pedidos y avisando.
    if(esCompu()){const w=window.open('canasta.html','aramo-taller');if(w)return;}
    location.href='canasta.html';return;
  }
  if(cara==='surtido'){if(LOCAL==='todas')abrirSurtidoAmbos();else cerrarPuerta();}
  else if(cara==='mostrador'){M.tab=null;cerrarPuerta();abrirMostrador();}
  primeraVez=false;
}
// ↻ Reiniciar: la app vuelve a arrancar desde cero, con lo último publicado. Borra solo lo
// guardado para abrir rápido (páginas, fotos, librerías); los pedidos, el Surtido, el local
// y los ajustes se quedan.
async function reiniciarApp(el){
  if(el?.classList.contains('girando'))return;
  el?.classList.add('girando');
  toast('↻ Reiniciando ARAMO…');
  try{window.flushPersist?.();}catch{}
  if(navigator.onLine===false){toast('Sin internet: se recarga lo guardado');setTimeout(()=>location.reload(),600);return;}
  try{
    const regs=await navigator.serviceWorker?.getRegistrations?.()||[];
    await Promise.all(regs.map(r=>r.unregister()));
    const ks=window.caches?await caches.keys():[];
    await Promise.all(ks.filter(k=>k.startsWith('aramo-')).map(k=>caches.delete(k)));
    // Renovar también la memoria del navegador para esta página y sus archivos.
    const urls=[location.href.split('#')[0],...[...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(e=>e.src||e.href).filter(u=>u.startsWith(location.origin))];
    await Promise.race([Promise.all(urls.map(u=>fetch(u,{cache:'reload'}).catch(()=>{}))),new Promise(r=>setTimeout(r,5000))]);
  }catch{}
  location.reload();
}

// ══════════════ Mostrador ══════════════
function abrirMostrador(id){
  $('mostrador').classList.add('open');document.body.classList.add('pu-lock');
  pintarMostrador();autoPrecios();pantallaEncendida();
  if(id)abrirEncargo(id);
}
// Desde afuera del Mostrador (portada, notificación, link de WhatsApp) el pedido NO se abre solo:
// queda marcado en su lista y se abre cuando lo tocás.
function mostrarEnLista(id){
  const o=id&&N.get(id);
  // Si estabas pesando, cobrando o viendo otro pedido, esa ventana se queda tal cual.
  const ocupado=$('mostrador').classList.contains('open')&&$('moSheet').classList.contains('open')&&M.abierto!==id;
  cerrarPuerta();if(!ocupado)cerrarHoja();
  if(o){
    M.tab=['nuevo','alistando','listo'].includes(o.estado)?o.estado:'hecho';
    M.marca={id:o.id,hasta:Date.now()+6000};
  }
  abrirMostrador();
  if(o&&M.suc!=='todas'&&o.sucursal!==M.suc)toast(`🛎️ ${o.ref} es de ${sucNom(o.sucursal)}: se atiende desde ese local`);
  else if(o&&ocupado)toast(`🛎️ ${o.ref} quedó marcado en la lista · tu ventana sigue igual`);
  if(o)requestAnimationFrame(()=>{const c=document.querySelector(`#moLista .mo-card[data-id="${CSS.escape(o.id)}"]`);if(c)c.scrollIntoView({block:'center',behavior:'smooth'});});
}
const filtrar=L=>L.filter(o=>M.suc==='todas'||o.sucursal===M.suc);
// Un pedido cancelado o entregado ya no queda montado como tiquete pendiente en el POS de esta tienda.
function limpiarTiquetesPOS(){try{['moravia','angeles'].forEach(k=>{const L=LS.get('aramo_pos_feria_'+k,null);if(!Array.isArray(L)||!L.length)return;const R=L.filter(p=>{const o=N.get(p.id);return !o||!(o.estado==='cancelado'||o.estado==='entregado'||(o.cobro&&!o.cobro.porPOS));});if(R.length!==L.length)LS.set('aramo_pos_feria_'+k,R);});}catch(e){}}
// ── Cuadros (2026-11-26): colores por estado, lo que urge, tarjetas sencillas ──
const COL={nuevo:'#c9621a',alistando:'#b07a0c',listo:'#2f8f5b',entregado:'#1f6b40',cancelado:'#8a978e'};
const COLBANDA={...COL,alistando:'#f2b33d'};          // el área pintada del estado (la letra va oscura)
const COLBOTON={...COL,cancelado:'#5f6d64'};          // el botón grande necesita más contraste
const FILAS=[['nuevo','Nuevos'],['alistando','Alistando'],['listo','Listos']];
const nProd=n=>`${n} producto${n===1?'':'s'}`;
const entregaTxt=o=>o.retiro.envio?'Uber':o.retiro.carro?'Al carro':'Recoge';
const cuandoTxt=o=>(esHoy(o.retiro.at)?'':fdia(o.retiro.at)+' ')+fh(o.retiro.at);
const cuandoDe=o=>o.estado==='entregado'?'Entregado '+fh(o.updated):o.estado==='cancelado'?'Cancelado':`${cuandoTxt(o)} · ${falta(o.retiro.at)}`;
const atrasado=o=>minsA(o.retiro.at)<0&&!['entregado','cancelado'].includes(o.estado);
// Lo que falta o está mal (lo único que va en rojo)
function faltas(o){
  const L=[],fase=N.faseDe?.(o)||'enviado';
  if(o.recibidoCliente&&!o.recibidoCliente.ok)L.push('Dice que NO lo recibió');
  if(o.recibidoCliente?.ok&&o.estado==='listo')L.push('Dice que ya lo recibió');
  if(o.recibidoTienda&&!o.recibidoCliente&&o.estado==='listo')L.push('Esperando que el cliente confirme');
  if(camSin.has(o.id))L.push('Cambió su pedido');
  if(o.rechazo?.por==='cliente')L.push('Lo rechazó el cliente');
  if(o.pago?.metodo==='sinpe'&&!o.comprobante&&!cobrado(o)&&fase!=='confirmacion'&&(o.estado==='listo'||(o.estado==='alistando'&&N.definitivo?.(o))))L.push('Falta el comprobante');
  return L;
}
// El siguiente paso de un pedido: lo usan «Lo que urge» y el botón grande de la hoja
function siguiente(o){
  const {r,n}=avance(o),fase=N.faseDe?.(o)||'enviado',nom=o.cliente.nombre.split(' ')[0],env=o.retiro.envio;
  if(o.estado==='nuevo')return{acc:'aceptar',txt:'Aceptar a '+nom};
  if(fase==='confirmacion'&&['alistando','listo'].includes(o.estado))return{acc:'abrir',txt:'Ver el pedido de '+nom,espera:true};
  if(o.estado==='alistando'){
    if(r<n)return{acc:'pesar',txt:r?'Seguir pesando':'Pesar el pedido'};
    if(fase==='recibido')return sinUber(o)?{acc:'costo-uber',txt:'Poné el costo del Uber'}:{acc:'listo',txt:'Enviar cotización a '+nom};
    if(N.porConfirmar?.(o))return{acc:'listo',txt:'Mandarle el total nuevo a '+nom};
    return{acc:'marcar-listo',txt:'Lista · avisar a '+nom};
  }
  if(o.estado==='listo'&&!o.cobro&&N.porConfirmar?.(o))return{acc:'listo',txt:'Mandarle el total nuevo a '+nom};
  if(o.estado==='listo'){
    if(env){
      if(o.recibidoCliente?.ok)return{acc:'confirmar-entrega',txt:'Confirmar entrega'};
      if(!env.uber)return{acc:'uber',txt:'Pedir Uber'};
      if(o.recibidoTienda&&!o.recibidoCliente)return{acc:'abrir',txt:'Ver el pedido de '+nom,espera:true};
      return{acc:'recibido-tienda',txt:'El viaje dice que ya lo recibió'};
    }
    return{acc:'entregar',txt:'Entregar a '+nom};
  }
  if(o.estado==='entregado'&&o.cobro)return{acc:'tiquete',txt:'Ver el tiquete'};
  return{acc:'cerrar',txt:'Cerrar'};
}
// El más urgente: el primer Nuevo; si no, el Alistando que más espera; si no, el Listo por entregar
function masUrgente(g){
  if(g.nuevo[0])return g.nuevo[0];
  const al=[...g.alistando].sort((a,b)=>((N.faseDe?.(a)==='confirmacion')-(N.faseDe?.(b)==='confirmacion'))||(Date.parse(a.created)-Date.parse(b.created)));
  if(al[0])return al[0];
  return g.listo.find(o=>N.faseDe?.(o)!=='confirmacion')||g.listo[0]||null;
}
function urgeHtml(o){
  const sg=siguiente(o),{n}=avance(o),F=faltas(o),s=suc(o.sucursal),nuevoSin=sinAbrir.has(o.id);
  return `<div class="mo-urge${nuevoSin?' nuevo-flash':''}" style="--c:${COLBOTON[o.estado]}"><span class="mo-urge-k">${nuevoSin?'Pedido nuevo':'Lo que urge'}</span>
    <button type="button" class="mo-urge-i" data-mo="abrir" data-id="${o.id}"><span class="mo-urge-n"><b>${esc(o.cliente.nombre)}</b><small>${nProd(n)} · ${entregaTxt(o)}${M.suc==='todas'?' · '+esc(s?.zona||''):''}</small><small class="${atrasado(o)?'tarde':''}">${esc(cuandoDe(o))}</small>${F.length?`<span class="mo-faltas">${F.map(x=>`<i class="mo-falta">${esc(x)}</i>`).join('')}</span>`:''}</span><span class="mo-urge-t">${N.esAprox(o)?'~':''}${$c(N.totalDe(o))}</span></button>
    <button type="button" class="mo-gran" data-mo="urge" data-id="${o.id}" data-acc="${sg.acc}">${esc(sg.txt)}</button></div>`;
}
function pintarMostrador(){limpiarTiquetesPOS();
  if(!$('mostrador')?.classList.contains('open'))return;
  pintarNube();
  const lg=$('moLugar');if(lg)lg.textContent='Pedidos · '+(R.suc==='todas'?'Ambas tiendas':(suc(R.suc)?.zona||suc(R.suc)?.n||''));
  const A=filtrar(activos()),H=filtrar(cerradosHoy());
  const grupos={nuevo:A.filter(o=>o.estado==='nuevo'),alistando:A.filter(o=>o.estado==='alistando'),listo:A.filter(o=>o.estado==='listo'),hecho:H};
  Object.values(grupos).forEach(L=>L.sort((a,b)=>Date.parse(a.retiro.at)-Date.parse(b.retiro.at)));
  const ur=masUrgente(grupos);
  // La franja de pedido nuevo se calla si «Lo que urge» ya muestra ese mismo pedido (ahí está su botón)
  const sin=[...sinAbrir].map(id=>N.get(id)).filter(o=>o&&o.estado==='nuevo'&&paraMi(o));
  const alarma=sin.length===1&&ur&&sin[0].id===ur.id?'':alarmaHtml();
  $('moAlarma').innerHTML=alarma;
  const perm=N.avisos.permiso();
  $('moAvisos').innerHTML=N.avisos.soportado()
    ?`<button type="button" class="mo-activar${R.sonido?'':' apagado'}" data-mo="${perm==='granted'?'avisos-toggle':'avisos-on'}"><span>${R.sonido?'🔔':'🔕'}</span><span><b>${perm==='denied'?'Avisos bloqueados: permitilos en el navegador':perm==='granted'?(R.sonido?'Avisos activos · silenciar':'Avisos silenciados · activar'):'Activá los avisos en este equipo'}</b></span></button>`:'';
  $('moTabs').innerHTML=FILAS.map(([k,n])=>`<button type="button" class="mo-fila f-${k}${M.tab===k?' on':''}" data-mo="tab" data-k="${k}" aria-pressed="${M.tab===k}"><span>${n}</span><b>${grupos[k].length}</b></button>`).join('');
  $('moHoy').innerHTML=`<button type="button" class="mo-hoy${M.tab==='hecho'?' on':''}" data-mo="tab" data-k="hecho" aria-pressed="${M.tab==='hecho'}">Entregados hoy: ${grupos.hecho.length} ${M.tab==='hecho'?'▾':'›'}</button>`;
  if(M.tab&&grupos[M.tab]){
    const L=grupos[M.tab],vacio={nuevo:'Sin pedidos nuevos.',alistando:'Nada alistándose ahora.',listo:'Nada esperando entrega.',hecho:'Todavía no se ha entregado nada hoy.'}[M.tab];
    $('moAhora').innerHTML='';
    $('moLista').innerHTML=(M.tab==='hecho'?'<h3 class="mo-lista-h">Entregados hoy</h3>':'')+(L.length?L.map(tarjeta).join(''):`<div class="mo-vacio">${vacio}${M.tab==='nuevo'?'<br><button type="button" class="mo-link" data-mo="prueba">Probar con un pedido de prueba</button>':''}</div>`);
  }else{
    $('moLista').innerHTML='';
    $('moAhora').innerHTML=ur?urgeHtml(ur):`<div class="mo-calma"><b class="ok">✓</b><strong>Todo al día</strong><small>No hay pedidos esperando.</small><button type="button" class="mo-link" data-mo="prueba">Probar con un pedido de prueba</button></div>`;
  }
  const falt=[...new Map(A.concat(H).flatMap(o=>(o.items||[]).filter(i=>i.estado==='nohay').map(i=>[i.k,i]))).values()];
  $('moFaltan').innerHTML=falt.length?`<div class="mo-faltan"><h4>🚚 No hubo hoy: pedirlo en Inventario</h4><div>${falt.map(i=>`<button type="button" class="mo-chip" data-mo="surtir" data-n="${esc(i.n)}">${i.e} ${esc(i.n)}</button>`).join('')}</div></div>`:'';
  pintarCaja();
}
function tarjeta(o){
  const s=suc(o.sucursal),{n}=avance(o),fase=N.faseDe?.(o)||'enviado',F=faltas(o);
  const arrastrable=!['entregado','cancelado'].includes(o.estado);
  const espera=fase==='confirmacion'&&['alistando','listo'].includes(o.estado);
  return `<button type="button" class="mo-card${urgente(o)?' urg':''}${sinAbrir.has(o.id)||camSin.has(o.id)?' nuevo-flash':''}${M.marca?.id===o.id&&Date.now()<M.marca.hasta?' marcado':''}" data-mo="abrir" data-id="${o.id}" ${arrastrable?'draggable="true"':''}>
    <span class="mo-card-i"><b class="nom">${esc(o.cliente.nombre)}${o.prueba?' <em class="mo-et">prueba</em>':''}${sinAbrir.has(o.id)?' <em class="mo-et n">nuevo</em>':''}${camSin.has(o.id)?' <em class="mo-et n">cambió</em>':''}</b>
      <small>${nProd(n)} · ${entregaTxt(o)}${M.suc==='todas'?' · '+esc(s?.zona||''):''}</small>
      <small class="${atrasado(o)?'tarde':''}">${esc(cuandoDe(o))} · ${esc(o.ref)}</small>
      ${espera?'<small>Esperando al cliente</small>':''}${enCelular(o)?'<small>📱 Se está cobrando en el POS celular</small>':''}
      ${F.length?`<span class="mo-faltas">${F.map(x=>`<i class="mo-falta">${esc(x)}</i>`).join('')}</span>`:''}
    </span><span class="mo-card-t">${N.esAprox(o)?'~':''}${$c(N.totalDe(o))}</span>
  </button>`;
}

// ── Caja (columna en computadora; hoja en el celular) ──
// Cómo se pagó un cobro, en colones: el mixto trae su reparto; la tarjeta en línea cuenta como tarjeta.
const PM=m=>m==='mixto'?{n:'Mixto',e:'🔀'}:(N.PAGOS[m]||{});
function partesCobro(c){
  c=c||{};const t=+c.total||0;
  if(c.metodo==='mixto'){const p=c.pagos||{};return{efectivo:Math.max(0,+p.efectivo||0),tarjeta:Math.max(0,+p.tarjeta||0),sinpe:Math.max(0,+p.sinpe||0)};}
  if(c.metodo==='tarjeta'||c.metodo==='link')return{efectivo:0,tarjeta:t,sinpe:0};
  if(c.metodo==='sinpe')return{efectivo:0,tarjeta:0,sinpe:t};
  return{efectivo:t,tarjeta:0,sinpe:0};
}
// A quién se le hizo el SINPE: los nombres que se arman en Ajustes → Pagos y SINPE (el POS lee la misma lista)
const sdDefecto=k=>{const L=N.sinpeDestinosDe(k),u=LS.get('aramo_sinpe_ultimo_'+k,'');return (L.find(d=>d.nombre===u)||L[0]).nombre;};
const sdEtiqueta=(k,n)=>{const d=N.sinpeDestinosDe(k).find(x=>x.nombre===n);return d&&d.numero?`${d.nombre} · ${fmtTel(d.numero)}`:(n||'');};
function sdHtml(o,c){
  const L=N.sinpeDestinosDe(o.sucursal);
  return `<div class="mo-sd"><div class="mo-kick" style="margin-top:14px">¿A quién se le hizo el SINPE?</div><div class="mo-sd-g">${L.map(d=>`<button type="button" class="mo-sd-b${c.sa===d.nombre?' on':''}" data-mo="sd" data-n="${esc(d.nombre)}" aria-pressed="${c.sa===d.nombre}"><b>${esc(d.nombre)}</b>${d.numero?`<small>${esc(fmtTel(d.numero))}</small>`:''}</button>`).join('')}</div></div>`;
}
function mixtoHtml(o,c,tot){
  const T=Math.max(0,+c.mxT||0),S=Math.max(0,+c.mxS||0),E=tot-T-S;
  return `<div class="mo-mx"><div class="mo-s" style="margin-top:8px">Escribí cuánto pagó con tarjeta y con SINPE. El resto es efectivo.</div>
    <div class="mo-mx-g"><label class="mo-field">💳 Tarjeta ₡<input type="number" inputmode="numeric" id="moMxT" min="0" step="50" value="${T||''}" placeholder="0"></label><label class="mo-field">📲 SINPE ₡<input type="number" inputmode="numeric" id="moMxS" min="0" step="50" value="${S||''}" placeholder="0"></label></div>
    <div class="mo-vuelto${E<0?' mal':''}" id="moMxEBox">💵 Efectivo (lo que falta) <b id="moMxE">${E<0?'se pasa del total':$c(E)}</b></div>
    <div id="moSdMx"${S>0?'':' hidden'}>${sdHtml(o,c)}</div></div>`;
}
// «En el POS: venta 0042» cuando el POS ya la registró; «Va camino al POS» mientras tanto
function enPOSHtml(o){
  if(o.posVenta?.numero)return `<div class="mo-s mo-enpos" style="margin-top:6px;color:var(--g);font-weight:900">🧾 En el POS: venta ${esc(String(o.posVenta.numero).replace(/^.*-/,''))} (${esc(({efectivo:'Efectivo',tarjeta:'Tarjeta',sinpe:'SINPE',mixto:'Mixto'}[o.posVenta.metodo])||o.posVenta.metodo||'')} ${$c(o.posVenta.total)})</div>`;
  if(o.cobro?.aPOS)return `<div class="mo-s mo-enpos" style="margin-top:6px">⏳ Va camino al POS de ${esc(suc(o.sucursal)?.zona||'la tienda')}: entra sola cuando la caja esté abierta.</div>`;
  return '';
}
function cobrosHoy(){return N.lista().filter(o=>o.cobro&&esHoy(o.cobro.fecha)&&(M.suc==='todas'||o.sucursal===M.suc));}
function resumenCaja(){
  const L=cobrosHoy(),t={efectivo:0,tarjeta:0,sinpe:0,link:0};
  L.forEach(o=>{const p=partesCobro(o.cobro);t.efectivo+=p.efectivo;t.tarjeta+=p.tarjeta;t.sinpe+=p.sinpe;});
  return{L,t,total:L.reduce((s,o)=>s+(+o.cobro.total||0),0)};
}
function pintarCaja(){
  const el=$('moCaja');if(!el)return;
  const {L,t,total}=resumenCaja(),listos=filtrar(activos()).filter(o=>o.estado==='listo'&&!o.cobro&&N.faseDe?.(o)!=='confirmacion'&&!N.porConfirmar?.(o));
  el.innerHTML=`<p class="mo-kick">Caja · ${esc(receptorNom())}${POS?' · conectada a ARAMO POS':''}</p>
    <div class="mo-drop" id="moDrop"><b>🧾</b><strong>Arrastrá un pedido aquí</strong><small>para cobrarlo con el peso real y entregarlo</small></div>
    ${listos.length?`<div class="mo-kick" style="margin-top:12px">Listos para cobrar</div>${listos.map(o=>`<button type="button" class="mo-cobrable" data-mo="cobrar" data-id="${o.id}" draggable="true" data-arr="${o.id}"><span><b>${esc(o.ref)}</b> ${esc(o.cliente.nombre)}</span><span>${$c(N.totalDe(o))}</span></button>`).join('')}`:''}
    <div class="mo-kick" style="margin-top:14px">Cobrado hoy</div>
    <div class="mo-cuadre"><div><span>💵 Efectivo</span><b>${$c(t.efectivo)}</b></div><div><span>💳 Tarjeta</span><b>${$c((t.tarjeta||0)+(t.link||0))}</b></div><div><span>📲 SINPE</span><b>${$c(t.sinpe)}</b></div><div class="tot"><span>Total · ${L.length} pedido${L.length===1?'':'s'}</span><b>${$c(total)}</b></div></div>
    <button type="button" class="mo-btn w" style="margin-top:10px" data-mo="caja">Ver cobros del día</button>`;
  const d=$('moDrop');
  d.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('text/aramo-encargo')){e.preventDefault();d.classList.add('sobre');}});
  d.addEventListener('dragleave',()=>d.classList.remove('sobre'));
  d.addEventListener('drop',e=>{e.preventDefault();d.classList.remove('sobre');const id=e.dataTransfer.getData('text/aramo-encargo');if(id)abrirCobro(id,{arrastre:true});});
  el.querySelectorAll('[data-arr]').forEach(b=>b.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/aramo-encargo',b.dataset.arr);}));
}

// Un pedido que se está pesando y cobrando en el ARAMO POS celular:
// aquí no se pesa ni se cobra para evitar cobros dobles.
const enCelular=o=>!!(o&&o.enCaja&&!o.cobro&&!['entregado','cancelado'].includes(o.estado));

// ══════════════ Hojas ══════════════
function abrirHoja(html){
  if(M.vista!=='pesar')$('moSheet').classList.remove('ancho');
  $('moSheet').classList.remove('banda','b-nuevo','b-alistando','b-listo','b-entregado','b-cancelado');
  $('moSheet').innerHTML='<div class="mo-grip"></div><button type="button" class="mo-x" data-mo="cerrar" aria-label="Cerrar">✕</button>'+html;
  $('moSheet').classList.add('open');$('moBg').classList.add('open');
}
function cerrarHoja(){
  pararCamara();M.abierto=null;M.vista=null;M.edit=null;M.rec=null;M.cobro=null;
  $('moSheet')?.classList.remove('open');$('moBg')?.classList.remove('open');
}
function repintar(fn){const y=$('moSheet').scrollTop;fn();$('moSheet').scrollTop=y;}

// ── Encargo: mesa de trabajo con peso real ──
function abrirEncargo(id){
  M.abierto=id;M.vista='encargo';M.pin='';M.masD=false;
  if(sinAbrir.delete(id))guardarSinAbrir();
  if(camSin.delete(id))guardarCamSin();
  pintarEncargo();pintarMostrador();pintarPuerta();
}
// WhatsApp es SOLO para mandar la cotización (si hace falta) o el total del sistema. Todo lo demás (aceptado, alistando, listo,
// recibido, cancelado…) el cliente lo ve solo dentro de La Feria, sin mensajes.
function msgCliente(o){
  const s=suc(o.sucursal),t=T(),tot=N.totalDe(o),link=N.enlace('canasta.html','e',o);
  const hola=`¡Hola ${o.cliente.nombre.split(' ')[0]}! 👋`,env=o.retiro.envio&&+o.retiro.envio.costo?` (incluye tu parte del envío con Uber: ${$c(o.retiro.envio.costo)})`:'';
  if(N.faseDe?.(o)==='confirmacion')return `${hola}\n🧾 La tienda ya pesó tu pedido ${o.ref}. La cotización es *${$c(tot)}*${env}. Abrí el pedido, revisala y confirmala o rechazala en La Feria: ya confirmado, pagás por SINPE.\n\nVer pedido y confirmar 👉 ${link}`;
  if(o.estado==='listo'||(o.estado==='alistando'&&N.definitivo?.(o))){
    const pago=o.pago.metodo==='sinpe'&&!cobrado(o)
      ?`\n📲 Pagá ${$c(tot)} por SINPE Móvil${(sp=>telDig(sp.numero)?' al '+fmtTel(sp.numero)+(sp.nombre?' ('+sp.nombre+')':''):'')(N.sinpeDe(o.sucursal))} con la descripción ${o.ref}.`
      :o.pago.metodo==='link'&&t.linkTarjeta?`\n🔗 Pagá con tarjeta aquí: ${t.linkTarjeta}`:'';
    return `${hola}\n⚖️ El total de tu pedido ${o.ref} es *${$c(tot)}*${env}.${pago}\n\nSeguí tu pedido aquí 👉 ${link}`;
  }
  return `${hola}\nTe escribimos de ${t.nombre||'ARAMO'} sobre tu pedido ${o.ref}.`;
}
function pesoHtml(it,i,edit){
  const q=qReal(it),pr=precioIt(it),kgU=it.u==='kg';
  const pesado=it.qr!=null&&it.qr!=='';
  const dif=pesado?q-it.q:0,pct=it.q?Math.abs(dif)/it.q:0;
  const difTxt=kgU&&pesado&&Math.abs(dif)>1e-9?`<span class="mo-dif ${dif>0?'mas':'menos'}">${dif>0?'+':'−'}${Math.round(Math.abs(dif)*1000)} g · ${dif>0?'+':'−'}${$c(Math.abs(dif)*pr)}</span>`:'';
  const alerta=kgU&&pesado&&pct>.15?`<span class="mo-dif alerta">⚠️ revisá: ${dif>0?'pesó bastante más':'pesó bastante menos'} de lo pedido</span>`:'';
  const cls=it.estado==='listo'?'ok':it.estado==='nohay'?'no':'';
  const sub=it.estado==='nohay'?0:q*pr;
  return `<div class="mo-it ${cls}">
    <span class="e">${it.e}</span>
    <span class="t"><strong>${esc(it.n)}${it.cambio==='nuevo'?' <em class="mo-et n">nuevo</em>':it.cambio==='cant'?` <em class="mo-et n">cambió${it.qAntes!=null?' · antes '+esc(qtxt(it.qAntes,it.u)):''}</em>`:''}</strong><small>Pidió ${esc(pidio(it))} · <button type="button" class="mo-precio" data-mo="precio-it" data-i="${i}" ${edit?'':'disabled'}>${+pr>0?$c(pr)+(kgU?'/kg':' c/u'):'⚠️ Poné el precio'}</button>${it.mad?' · '+esc(MAD[it.mad]||''):''}${it.nota?' · 📝 '+esc(it.nota):''}</small>${difTxt}${alerta}</span>
    ${edit?`<span class="mo-peso"><label><small>${kgU?'Pesó (kg)':'Cantidad'}</small><input type="number" inputmode="decimal" step="${kgU?'0.005':'1'}" min="0" value="${esc(pesado?q:'')}" placeholder="${esc(fq(it.q))}" data-mo-q="${i}" aria-label="${kgU?'Peso real':'Cantidad real'} de ${esc(it.n)}"></label><b>${it.estado==='nohay'?'—':$c(sub)}</b></span><button type="button" class="mo-ck${it.estado==='listo'?' on':''}" data-mo="it-ok" data-i="${i}" aria-label="Listo">✓</button><button type="button" class="mo-ck no${it.estado==='nohay'?' on':''}" data-mo="it-no" data-i="${i}" aria-label="No hay">✕</button>`
      :`<span class="mo-peso"><small>${it.estado==='nohay'?'No hubo':kgU&&pesado?'Pesó':'Lleva'}</small><b>${it.estado==='nohay'?'—':esc(kgU&&pesado?kg(q)+' kg':qtxt(q,it.u))}</b><em>${it.estado==='nohay'?'₡0':$c(sub)}</em></span>`}
    ${edit&&it.estado==='nohay'?`<input class="sub" type="text" placeholder="Cambio por… (opcional)" value="${esc(it.sub||'')}" data-mo-sub="${i}">`:''}
  </div>`;
}
// ── Cotización, comprobante, traslado y bitácora ──
// La cotización se manda al cliente y el pedido SIGUE en Alistando: nunca queda «Listo» hasta que el cliente confirma
// y todo está pesado (si no, parecería que ya salió).
function sellarCotizacion(x,origen){
  const t=N.totalDe(x);
  x.estado='alistando';x.fase='confirmacion';x.totalFinal=t;delete x.confirmacion;
  (x.items||[]).forEach(i=>{delete i.cambio;delete i.qAntes;});if(x.retiro?.envio)x.retiro.envio.fijo=true;
  x.cotizacion={at:new Date().toISOString(),total:t,totalAntes:N.totalAntesDe(x),por:quienAtiende(),...(origen?{origen}:{})};
  x._ev={tipo:'cot-enviada',monto:t};
}
// La contraoferta que vuelve del POS (localStorage) se aplica sola y se manda al cliente.
async function aplicarPOS(id,manual){
  const key='aramo_pos_cotizacion_'+id,d=LS.get(key,null),o=N.get(id);
  if(!o||!d?.items?.length||['entregado','cancelado'].includes(o.estado))return false;
  const x=await N.cambiar(id,y=>{
    y.items=y.items.map((it,i)=>{const n=d.items.find(v=>v.k===it.k)||d.items[i];if(!n)return it;const q=Math.max(0,+n.q||0),p=Math.max(0,+n.p||it.p);return {...it,q0:it.q0??it.q,p0:it.p0??it.p,q,p,qr:q,estado:q===0?'nohay':'listo'};});
    if(!sinUber(y))sellarCotizacion(y,'POS'); // con envío, la cotización sale cuando se anota el costo del Uber
  },'tienda','Cotización del POS aplicada · con envío falta el costo del Uber para mandarla');
  if(!x)return false;
  try{localStorage.removeItem(key);}catch{}
  if(sinUber(x))pedirUber(x);else toast(`🧾 Cotización del POS enviada a ${x.cliente.nombre.split(' ')[0]} · ${$c(N.totalDe(x))} · esperando su confirmación`);
  if(M.abierto===id&&M.vista==='encargo'&&$('moSheet')?.classList.contains('open'))repintar(pintarEncargo);
  pintarMostrador();
  return true;
}
const _posOcupado=new Set();
async function revisarPOS(){
  let keys=[];try{keys=Object.keys(localStorage);}catch{}
  for(const key of keys){
    if(_posOcupado.has(key))continue;
    let m=key.match(/^aramo_pos_cotizacion_(.+)$/);
    if(m){_posOcupado.add(key);try{await aplicarPOS(m[1]);}finally{_posOcupado.delete(key);}continue;}
    m=key.match(/^aramo_pos_venta_(.+)$/);
    if(m){
      const o=N.get(m[1]),d=LS.get(key,null);if(!o||!d)continue;
      _posOcupado.add(key);
      try{
        if(o.posVenta?.numero!==d.numero){
          const met=({efectivo:'Efectivo',tarjeta:'Tarjeta',sinpe:'SINPE'}[d.metodo])||d.metodo||'';
          await N.cambiar(o.id,x=>{x.posVenta={numero:d.numero,total:+d.total||0,metodo:d.metodo||'',at:d.at||new Date().toISOString()};if(!x.cobro){const mx=d.metodo==='mixto'?((+d.sinpe>=+d.efectivo&&+d.sinpe>=+d.tarjeta)?'sinpe':(+d.tarjeta>+d.efectivo?'tarjeta':'efectivo')):(d.metodo||'efectivo');x.cobro={metodo:mx,total:+d.total||0,recibido:+d.total||0,vuelto:0,fecha:d.at||new Date().toISOString(),venta:'POS '+(d.numero||''),sucursal:x.sucursal,porPOS:1};}x._ev={tipo:'pos-venta',monto:+d.total||0,metodo:met,numero:d.numero};},'tienda',`Venta #${d.numero} registrada en el POS (${met} ${$c(+d.total||0)})`);
        }
        try{localStorage.removeItem(key);}catch{}
      }finally{_posOcupado.delete(key);}
    }
  }
}
// Los cobros de este Mostrador que van al POS (aramo_pos_pendientes): se reintenta lo que no subió y se lee cuáles ya registró el POS
let _posSync=false;
async function sincronizarPOS(){
  if(_posSync||POS)return;_posSync=true;
  try{
    N.posVaciar?.();
    const esperando=N.lista().filter(o=>o.cobro?.aPOS&&!o.posVenta&&!o.cobro.porPOS);
    for(const t of [...new Set(esperando.map(o=>o.sucursal))]){
      const filas=await N.posRegistradas(t);if(!filas)continue;
      for(const o of esperando.filter(x=>x.sucursal===t)){
        const f=filas.find(r=>r.id===o.cobro.aPOS);if(!f||!f.venta)continue;
        await N.cambiar(o.id,x=>{x.posVenta={numero:f.venta,total:+x.cobro.total||0,metodo:x.cobro.metodo||'',at:f.registrado_at||new Date().toISOString()};x._ev={tipo:'pos-venta',monto:+x.cobro.total||0,metodo:PM(x.cobro.metodo).n||'',numero:f.venta};},'tienda','Venta '+String(f.venta).replace(/^.*-/,'')+' registrada en el POS');
      }
    }
  }catch(e){console.warn('[pos] sincronizar',e);}
  finally{_posSync=false;}
}
window.addEventListener('storage',e=>{if(!e.key||/^aramo_pos_(cotizacion|venta)_/.test(e.key))revisarPOS();});
window.addEventListener('online',()=>sincronizarPOS());
window.addEventListener('focus',()=>{revisarPOS();sincronizarPOS();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')revisarPOS();});
// Comprobante SINPE que subió el cliente: miniatura que se agranda al tocarla (arriba de «Confirmar SINPE»)
const compUrls={};
function comprobanteHtml(o){
  const c=o.comprobante;if(!c)return '';
  return `<button type="button" class="mo-comp" data-mo="ver-comp" aria-label="Agrandar el comprobante SINPE"><span class="mo-comp-img" id="moCompImg">${c.img?`<img src="${esc(c.img)}" alt="Comprobante SINPE">`:'📎'}</span><span class="mo-comp-t"><b>📎 Comprobante que subió el cliente</b><small>${esc(fh(c.subido||o.updated))} · tocalo para agrandarlo</small></span></button>`;
}
function cargarComprobante(o){
  const c=o.comprobante;if(!c||c.img||!c.path)return;
  const poner=url=>{const b=$('moCompImg');if(b&&url&&!/\.pdf(\?|$)/i.test(c.path))b.innerHTML=`<img src="${esc(url)}" alt="Comprobante SINPE">`;else if(b&&url)b.innerHTML='📄';};
  if(compUrls[c.path]){poner(compUrls[c.path]);return;}
  N.comprobanteUrl?.(c.path).then(url=>{if(!url)return;compUrls[c.path]=url;poner(url);});
}
// Enviar a la otra tienda (por la ubicación del cliente)
function distKm(a,b){const R=6371,rad=x=>x*Math.PI/180,da=rad(b.lat-a.lat),dl=rad(b.lng-a.lng);return 2*R*Math.asin(Math.sqrt(Math.sin(da/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dl/2)**2));}
function masCercana(o){
  const e=o.retiro?.envio;if(!e||!(+e.lat||+e.lng))return null;
  const L=(T().sucursales||[]).filter(s=>s.activa!==false).map(s=>({s,d:+s.lat&&+s.lng?distKm({lat:+s.lat,lng:+s.lng},{lat:+e.lat,lng:+e.lng}):null}));
  if(L.length<2||L.some(x=>x.d==null))return{falta:true,L};
  L.sort((a,b)=>a.d-b.d);return{k:L[0].s.k,L};
}
function trasladoAviso(o){const c=masCercana(o);return c&&!c.falta&&c.k!==o.sucursal?`<div class="mo-aviso">📍 Al cliente le queda más cerca ${esc(sucNom(c.k))}. Tocá «Más» para enviárselo.</div>`:'';}
function trasladoHtml(o){
  const otras=(T().sucursales||[]).filter(s=>s.k!==o.sucursal&&s.activa!==false);if(!otras.length)return '';
  const c=masCercana(o),km=k=>{const x=c?.L?.find(y=>y.s.k===k);return x&&x.d!=null?` · a ${x.d.toFixed(1).replace('.',',')} km del cliente`:'';};
  const rec=c&&!c.falta?c.k:'';
  const hint=c?(c.falta?'<div class="mo-s">📍 El cliente compartió su ubicación. Guardá la ubicación de cada tienda en Pagos y horarios y te digo cuál le queda más cerca.</div>'
    :rec!==o.sucursal?'':'<div class="mo-s">📍 Esta es la tienda más cercana al cliente.</div>')
    :'<div class="mo-s">Usalo si el pedido es de la zona de la otra tienda.</div>';
  return `<div class="mo-traslado">${otras.map(s=>`<button type="button" class="mo-btn w${rec===s.k?' o':''}" data-mo="enviar-a" data-k="${esc(s.k)}">🔀 Enviar a ${esc(s.n)} · ${esc(s.zona)}${rec===s.k?' ⭐ la más cercana':''}${esc(km(s.k))}</button>`).join('')}${hint}</div>`;
}
// Bitácora: cada movimiento con hora, quién, cuánto y cómo se pagó
function bitacoraHtml(o){
  const L=(o.log||[]).map(l=>{
    const quien=l.by==='cliente'?'Cliente':(l.q||'Tienda');
    const txt=l.m||({nuevo:'Recibido',alistando:'Empezó a alistarse',listo:'Quedó lista',entregado:'Entregado',cancelado:'Cancelado'}[l.s]||l.s);
    const extra=[l.monto!=null?`<b>${$c(l.monto)}</b>`:'',l.metodo?esc(l.metodo):''].filter(Boolean).join(' · ');
    return `<div class="mo-bit"><span class="h">${esc(fdia(l.t))} ${esc(fh(l.t))}</span><span class="q">${l.by==='cliente'?'👤':'🛎️'} ${esc(quien)}</span><span class="m">${esc(txt)}${extra?' · '+extra:''}</span></div>`;
  }).join('');
  return `<details class="mo-blk mo-bitacora" open><summary style="font-weight:900;font-size:13px">🧾 Bitácora · quién, cuándo y cuánto</summary><div class="mo-log" style="margin-top:8px">${L||'<div class="mo-s">Todavía no hay movimientos.</div>'}</div></details>`;
}
function pintarEncargo(){
  const o=N.get(M.abierto);if(!o){cerrarHoja();return;}
  guardarBorr();
  if(M.vista==='pin')return pintarPin(o);
  if(M.vista==='cobro')return pintarCobro(o);
  if(M.vista==='tiquete')return pintarTiquete(o);
  if(M.vista==='pesar')return pintarPesar(o);
  const s=suc(o.sucursal),{r,n}=avance(o),P=N.PAGOS[o.pago?.metodo]||{},tot=N.totalDe(o),edit=o.estado==='alistando'&&N.faseDe?.(o)!=='confirmacion',fase=N.faseDe?.(o)||'enviado';
  const listoE=o.estado==='listo'&&fase!=='confirmacion';
  const verd=o.estado==='cancelado'?[o.rechazo?.por==='cliente'?'Lo rechazó el cliente':'Cancelado','bad']:listoE?[o.cobro?'Cobrado':'Listo','ok']:({enviado:['Enviado','run'],recibido:['Recibido · pesar','run'],confirmacion:['Confirmación del cliente','run'],alistando:[`Alistando ${r}/${n}`,'run'],entregado:['Entregado','ok']}[fase]||({nuevo:[o.avisado?'Pendiente de aceptación':'Nuevo','run'],alistando:[`Alistando ${r}/${n}`,'run'],listo:[o.cobro?'Cobrado':'Listo','ok'],entregado:['Entregado','ok'],cancelado:['Cancelado','bad']}[o.estado]||['','']));
  const pesoR=o.items.reduce((t,i)=>t+(i.u==='kg'&&i.estado==='listo'?qReal(i):0),0);
  const est=N.redondear5(o.items.reduce((t,i)=>t+(+i.q)*(+i.p),0)),dif=tot+(+o.premio?.valor||0)-est-(+o.retiro?.envio?.costo||0);
  const holo=o.items.map(i=>`<div class="mo-hit ${i.estado==='listo'?'ok':i.estado==='nohay'?'no':o.estado==='alistando'?'wait':''}" title="${esc(i.n)}"><b>${i.e}</b><em>${esc(i.n)}</em><small>${esc(i.u==='kg'&&i.qr!=null&&i.qr!==''?kg(qReal(i))+' kg':qtxt(qReal(i),i.u))}</small></div>`).join('');
  const env=o.retiro.envio,nom1=o.cliente.nombre.split(' ')[0],F=faltas(o),sg=siguiente(o),activo=['nuevo','alistando','listo'].includes(o.estado);
  // ── Pedazos de la hoja ──
  const posDraft=LS.get('aramo_pos_cotizacion_'+o.id,null);
  // (dueño, 2026-11-28) Los pedidos se atienden SIEMPRE aquí, en Pedidos: se pesan, se cotizan, el cliente confirma y se cobran aquí.
  // La venta entra sola al ARAMO POS de la tienda (aramo_pos_pendientes). Ya no se abren como tiquete en el POS ni en el POS celular.
  const posBox='';
  const draftBox=posDraft?.items?.length?`<div class="mo-pos-link"><b>🧾 Hay una cotización devuelta desde POS</b><small>Revisá los cambios antes de enviarlos al cliente.</small><button type="button" class="mo-btn o w" data-mo="aplicar-pos">Aplicar cotización del POS</button></div>`:'';
  const recBox=o.recibidoCliente?(o.recibidoCliente.ok?`<div class="mo-acc-nota ok"><b>✅ El cliente dice que ya lo recibió</b><br>${esc(fh(o.recibidoCliente.at))} · confirmá la entrega o tocá «No, revisar».</div>`:`<div class="mo-acc-nota mal"><b>⚠️ El cliente dice que NO lo recibió</b><br>${esc(fh(o.recibidoCliente.at))} · escribile o llamalo ya.</div>`):'';
  const sinpeBox=o.pago?.metodo==='sinpe'&&!cobrado(o)&&(o.estado==='listo'||(o.estado==='alistando'&&N.definitivo(o)))&&fase!=='confirmacion'
    ?`${comprobanteHtml(o)}<button type="button" class="mo-btn o w" data-mo="pagado" style="margin-bottom:8px">📲 Confirmar SINPE de ${$c(tot)}${o.pago.estado==='reportado'?' (el cliente dice que pagó)':''}</button>`:'';
  const uc=o.ultimoCambio,hayCambio=!!uc&&['nuevo','alistando'].includes(o.estado)&&(!o.cotizacion||uc.at>o.cotizacion.at);
  const cambioBox=hayCambio?`<div class="mo-cambio" id="moCambio"><b>✏️ ${esc(nom1)} cambió su pedido · ${esc(fh(uc.at))}</b><ul>${(uc.lineas||[]).map(l=>`<li>${esc(l)}</li>`).join('')}</ul><small>Total ${$c(uc.totalAntes)} → ${$c(uc.total)}${uc.envioAntes!==uc.envio?` · envío del cliente ${$c(uc.envioAntes)} → ${$c(uc.envio)} (es el mismo Uber)`:''}. Pesá solo lo marcado: lo que no cambió guarda su peso.</small></div>`:'';
  const waBtn=txt=>`<button type="button" class="mo-btn w" data-mo="wa">💬 ${txt}</button>`;
  const tiendaBox=o.recibidoTienda&&!o.recibidoCliente&&o.estado==='listo'?`<div class="mo-acc-nota"><b>📍 Marcaste que ya lo recibió</b><br>Esperando que ${esc(nom1)} lo confirme en La Feria (Sí / No).</div>`:'';
  const gran=(acc,txt)=>`<button type="button" class="mo-gran" data-mo="${acc}">${txt}</button>`;
  const quiet=(acc,txt)=>`<button type="button" class="mo-q" data-mo="${acc}">${txt}</button>`;
  // Arriba del cuerpo: avisos de la situación. Abajo (fijo): UN botón grande con el siguiente paso. «Más» guarda lo demás.
  let notas='',pie='',qs='',mas='';
  if(o.estado==='nuevo'){
    notas=`${trasladoAviso(o)}`;
    pie=gran('aceptar','Aceptar a '+nom1);qs=quiet('rechazar','No puedo hacerlo');
    mas=trasladoHtml(o);
  }
  if(o.estado==='alistando'&&fase==='recibido'){
    notas=`<div class="mo-s mo-acc-nota">La cotización le llega al cliente al instante. El pedido sigue en Alistando hasta que el cliente la confirme.</div>`;
    pie=gran(sg.acc,esc(sg.txt));qs=r<n?quiet('todo-y-listo','✓ Todo como lo pidió · enviar cotización'):'';
  }
  if(o.estado==='alistando'&&fase==='alistando'){
    notas=N.porConfirmar?.(o)?`<div class="mo-acc-nota"><b>⚠️ Cambió el total después de que ${esc(nom1)} confirmó</b><br>Confirmó ${$c(+o.confirmacion?.total||0)} y ahora es ${$c(tot)}. Mandale el total nuevo: se cobra cuando lo confirme.</div>`
      :`<div class="mo-acc-nota ok"><b>✅ El cliente confirmó la cotización</b><br>Total definitivo ${$c(tot)}${o.confirmacion?.at?' · '+esc(fh(o.confirmacion.at)):''}. Terminá de alistar y avisale.</div>${sinpeBox}`;
    pie=gran(sg.acc,esc(sg.txt));
    mas=`<button type="button" class="mo-btn w" data-mo="corregir-cot">↩︎ Corregir y reenviar</button>`;
  }
  if(fase==='confirmacion'&&['alistando','listo'].includes(o.estado)){
    notas=`<div class="mo-acc-nota"><b>🧾 Cotización enviada al cliente</b><br>Está en Alistando: esperá su confirmación antes de cobrar o entregar. El total de la cotización es ${$c(tot)}.</div>`;
    pie=`<div class="mo-espera"><b>Esperando al cliente</b><small>${esc(nom1)} tiene que confirmar la cotización</small></div>`;qs=quiet('confirmar-tienda','📞 Ya aceptó por llamada o WhatsApp');
    mas=`${waBtn('Mandar la cotización por WhatsApp (si hace falta)')}<button type="button" class="mo-btn w" data-mo="corregir-cot">↩︎ Corregir y volver a pesar</button>`;
  }
  if(listoE){
    notas=`${recBox}${tiendaBox}${sinpeBox}`;
    pie=o.recibidoTienda&&!o.recibidoCliente&&env?.uber?`<div class="mo-espera"><b>Esperando al cliente</b><small>${esc(nom1)} tiene que confirmar en La Feria que lo recibió</small></div>`:gran(sg.acc,(sg.acc==='uber'?'🚗 ':['entregado-uber','confirmar-entrega','recibido-tienda'].includes(sg.acc)?'🛍️ ':'')+esc(sg.txt)+(sg.acc==='entregar'&&!cobrado(o)?' y cobrar':''));
    qs=!env?'':o.recibidoCliente?.ok?quiet('revisar-entrega','No, revisar'):o.recibidoCliente?quiet('revisar-entrega','🔎 Revisar la entrega'):(o.recibidoTienda&&!o.recibidoCliente)?quiet('revisar-entrega','Quitar el aviso'):env.uber?quiet('entregado-uber','🛍️ Entregar sin esperar al cliente'):quiet('entregado-uber','🛍️ El cliente ya la recibió');
    mas=`${o.pago?.metodo==='sinpe'&&!cobrado(o)?waBtn('Mandar el total por WhatsApp'):''}${cobrado(o)?'<button type="button" class="mo-btn w" data-mo="tiquete">🧾 Tiquete</button>':`<button type="button" class="mo-btn w" data-mo="cobrar" data-id="${o.id}">🧾 Cobrar sin entregar</button>`}<button type="button" class="mo-btn w" data-mo="volver-alistar">↩︎ Volver a alistar</button>`;
  }
  if(o.estado==='entregado'){
    pie=gran(sg.acc,esc(sg.txt));
    mas=sg.acc==='tiquete'?`<button type="button" class="mo-btn w" data-mo="wa">💬 Escribirle</button>`:'';
  }
  if(o.estado==='cancelado')pie=gran('cerrar',esc(sg.txt));
  if(o.estado==='alistando'&&fase!=='confirmacion'&&sg.acc!=='pesar')mas=`<button type="button" class="mo-btn w" data-mo="pesar">⚖️ Pesar en caja</button>`+mas;
  const enCel=enCelular(o);
  if(enCel){
    notas=`<div class="mo-acc-nota"><b>📱 Este pedido se está cobrando en el ARAMO POS celular</b><br>${esc(o.enCaja.n||'Un teléfono')} lo tomó a las ${fh(o.enCaja.at)}. Para no cobrarlo dos veces, aquí no se pesa ni se cobra.</div>`;
    pie=gran('soltar-celular','↩︎ Traerlo a Pedidos');qs='';mas=`<button type="button" class="mo-btn w" data-mo="wa">💬 Escribirle</button>`;
  }
  qs+=quiet('cerrar','Cerrar');
  const masD=`<details class="mo-mas-d"${M.masD?' open':''}><summary>Más</summary><div class="mo-mas-in">
    ${mas?`<div class="mo-mas-btns">${mas}</div>`:''}
    ${activo||enCel?'':posBox}
    <div class="mo-stage${o.estado==='alistando'?' run':''}"><span class="mo-tag">Lo que ve el cliente · en vivo</span><div class="mo-scan"></div><div class="mo-holo">${holo}</div></div>
    <div class="mo-metrics"><div><span>Revisados</span><b>${r}/${n}</b></div><div><span>Peso real</span><b>${pesoR?kg(pesoR)+' kg':'—'}</b></div><div><span>${N.esAprox(o)?'Total aprox.':'Total exacto'}</span><b>${$c(tot)}</b></div></div>
    ${o.factura?`<div class="mo-blk"><h4>🧾 Factura electrónica · solicitada</h4><div style="font-weight:900">${esc(o.factura.nombre||o.cliente.nombre)}</div><div class="mo-s">${esc(facTipo(o.factura))} · cédula ${esc(o.factura.cedula||'pendiente')}<br>${esc(o.factura.correo||'sin correo')}</div>${o.items.some(i=>i.cabys)?'':'<div class="mo-s" style="margin-top:6px">Ningún producto tiene código CABYS todavía: se llena en 🏷️ Vitrina → producto.</div>'}</div>`:''}
    ${bitacoraHtml(o)}
    <div class="mo-s" style="margin-top:10px">Pedido ${esc(o.ref)} · sellado ${fdia(o.created)} ${fh(o.created)} · ${esc(sucNom(o.sucursal))}</div>
  </div></details>`;
  const etq=o.estado==='nuevo'?'Nuevo':fase==='confirmacion'&&['alistando','listo'].includes(o.estado)?'Esperando al cliente':o.estado==='alistando'?(fase==='recibido'?'Pesando ':'Alistando ')+r+'/'+n:verd[0];
  const banda=`<div class="mo-banda" style="--c:${COLBANDA[o.estado]||COLBANDA.cancelado}"><small>${esc(etq)} · ${esc(o.ref)}${o.prueba?' · prueba':''}</small><h2>${esc(o.cliente.nombre)}</h2><p>${nProd(n)} · ${entregaTxt(o)} · ${esc(s?.zona||'')}</p><div class="mo-banda-t"><span>${esc(cuandoDe(o))}</span><b>${N.esAprox(o)?'~':''}${$c(tot)}</b></div></div>`;
  abrirHoja(`${banda}<div class="mo-cuerpo">
    ${F.length?`<div class="mo-faltas">${F.map(x=>`<i class="mo-falta">${esc(x)}</i>`).join('')}</div>`:''}
    ${cambioBox}${enCel?'':draftBox}${notas}${activo&&!enCel?posBox:''}
    <div class="mo-blk"><h4>Productos · ${r}/${n} revisados · si algo no hay: ${SUST[o.sust]||''}</h4>${o.items.map((it,i)=>pesoHtml(it,i,edit)).join('')}
      ${Math.abs(dif)>=5&&o.estado!=='nuevo'?`<div class="mo-tot m"><span>Ajuste por peso real (vs. ${$c(est)} aprox.)</span><span>${dif>0?'+':'−'}${$c(Math.abs(dif))}</span></div>`:''}
      ${o.retiro.envio&&+o.retiro.envio.costo?`<div class="mo-tot m"><span>🛵 Envío Uber · parte del cliente</span><span>${$c(o.retiro.envio.costo)}</span></div>`:''}
      ${o.premio?`<div class="mo-tot m o"><span>🎁 Premio con hojas (${+o.premio.hojas} 🍃)</span><span>−${$c(o.premio.valor)}</span></div>`:''}
      <div class="mo-tot"><span>${N.esAprox(o)?'Total aproximado':'Total exacto'}</span><b>${$c(tot)}</b></div>${o.nota?`<div class="mo-s" style="margin-top:8px">📝 ${esc(o.nota)}</div>`:''}</div>
    <div class="mo-blk"><h4>Cliente</h4><div class="mo-row"><span style="flex:1"><strong style="font-size:18px">${esc(o.cliente.nombre)}</strong><br><small style="color:var(--m)">${esc(fmtTel(o.cliente.tel))}${o.cliente.correo?`<br>${esc(o.cliente.correo)}`:''}</small></span><a class="mo-btn" href="tel:${esc(telDig(o.cliente.tel))}" aria-label="Llamar">📞</a><button type="button" class="mo-btn" data-mo="wa" aria-label="WhatsApp">💬</button></div>${lealtadHtml(o)}</div>
    ${o.retiro.envio?envioHtml(o):`<div class="mo-blk"><h4>Retiro</h4><div style="font-weight:900">${esc(sucNom(o.sucursal))}</div><div class="mo-s">${fdia(o.retiro.at)} a las ${fh(o.retiro.at)} (${falta(o.retiro.at)}) · ${o.retiro.carro?'🚗 al carro'+(o.retiro.placa?': '+esc(o.retiro.placa):''):'🚶 adentro'}</div></div>`}
    <div class="mo-blk"><h4>Pago</h4><div style="font-weight:900">${P.e||''} ${esc(P.n||'')} ${o.cobro?`<span class="mo-pill g">🧾 cobrado ${$c(o.cobro.total)}${o.cobro.venta?' · '+esc(o.cobro.venta):''}</span>`:o.pago.estado==='verificado'?'<span class="mo-pill g">✓ pagado</span>':o.pago.estado==='reportado'?'<span class="mo-pill o">el cliente dice que pagó</span>':'<span class="mo-pill">pendiente</span>'}</div>${o.pago.conCuanto?`<div class="mo-s">Paga con ${$c(o.pago.conCuanto)} → vuelto ${$c(Math.max(0,o.pago.conCuanto-tot))}</div>`:''}${o.comprobante&&!sinpeBox?comprobanteHtml(o):''}${o.cobro?.sinpeA?`<div class="mo-s">📲 SINPE a ${esc(o.cobro.sinpeA)}</div>`:''}${enPOSHtml(o)}</div>
    ${masD}
  </div><div class="mo-pie" style="--c:${COLBOTON[o.estado]||COLBOTON.cancelado}">${pie}<div class="mo-pie-q">${qs}</div></div>`);
  $('moSheet').classList.add('banda','b-'+o.estado);
  $('moSheet').querySelector('details.mo-mas-d')?.addEventListener('toggle',e=>{M.masD=e.target.open;});
  cargarComprobante(o);
  $('moSheet').querySelectorAll('[data-mo-q]').forEach(inp=>inp.addEventListener('change',()=>{
    const i=+inp.dataset.moQ,v=inp.value===''?null:Math.max(0,+String(inp.value).replace(',','.'));
    N.cambiar(o.id,x=>{const it=x.items[i];it.qr=v;if(v===0)it.estado='nohay';else if(v!=null&&it.estado!=='nohay')it.estado='listo';},'tienda').then(()=>{repintar(pintarEncargo);pintarMostrador();});
  }));
  $('moSheet').querySelectorAll('[data-mo-sub]').forEach(inp=>inp.addEventListener('change',()=>{const i=+inp.dataset.moSub;N.cambiar(o.id,x=>{x.items[i].sub=inp.value.trim();},'tienda');}));
  if(edit)$('moSheet').querySelectorAll('.mo-it.no').forEach((row,i)=>row.insertAdjacentHTML('beforeend',`<button type="button" class="mo-btn o" data-mo="sub-prop" data-i="${i}">🔁 Proponer cambio</button>`));
}
// ══════════════ ⚖️ Pesar en caja ══════════════
// Pantalla tipo POS: el pedido montado, un renglón por producto y un teclado
// grande. Escribís el peso que marca la balanza, Siguiente, y así de un solo.
// Borradores: lo que estás pesando o cobrando se guarda solo, aunque cierres la ventana,
// toques una notificación o se recargue la página.
const BORR=LS.get('aramo_borradores',{});
Object.keys(BORR).forEach(id=>{const o=N.get(id);if(!o||['entregado','cancelado'].includes(o.estado))delete BORR[id];});
function guardarBorr(){
  const id=M.abierto;if(!id)return;
  const b=BORR[id]||{};
  if(M.vista==='pesar'&&M.pk)b.pk={i:M.pk.i,buf:M.pk.buf||''};
  if(M.vista==='cobro'&&M.cobro)b.cobro={metodo:M.cobro.metodo,recibido:+M.cobro.recibido||0};
  if(Object.keys(b).length){BORR[id]=b;LS.set('aramo_borradores',BORR);}
}
function borrarBorr(id,k){
  if(!BORR[id])return;
  if(k)delete BORR[id][k];else delete BORR[id];
  if(BORR[id]&&!Object.keys(BORR[id]).length)delete BORR[id];
  LS.set('aramo_borradores',BORR);
}
function pkInicial(o){const b=BORR[o.id]?.pk;return b&&b.i<o.items.length?{i:b.i,buf:b.buf||''}:{i:primerPendiente(o),buf:''};}
function primerPendiente(o){const i=(o?.items||[]).findIndex(x=>x.estado!=='listo'&&x.estado!=='nohay');return i<0?0:i;}
function pintarPesar(o){
  const P=M.pk||{i:0,buf:''},it=o.items[P.i]||o.items[0],{r,n}=avance(o),tot=N.totalDe(o),kgU=it.u==='kg';
  const valor=P.buf!==''?P.buf:(it.qr!=null&&it.qr!==''?String(+it.qr):'');
  const num=valor===''?null:+valor.replace(',','.'),sub=num==null?null:num*precioIt(it);
  const dif=kgU&&num!=null?num-it.q:0;
  const filas=o.items.map((x,i)=>{const q=qReal(x),pes=x.qr!=null&&x.qr!=='';return `<button type="button" class="pk-fila${i===P.i?' on':''}${x.estado==='listo'?' ok':''}${x.estado==='nohay'?' no':''}" data-mo="pk-fila" data-i="${i}"><span class="e">${x.e}</span><span class="t"><b>${esc(x.n)}</b><small>Pidió ${esc(pidio(x))} · ${$c(precioIt(x))}${x.u==='kg'?'/kg':' c/u'}${x.mad?' · '+esc(MAD[x.mad]||''):''}${x.nota?' · 📝 '+esc(x.nota):''}</small></span><span class="v">${x.estado==='nohay'?'No hay':pes?esc(x.u==='kg'?kg(q)+' kg':qtxt(q,x.u)):'—'}</span><span class="s">${x.estado==='nohay'?'₡0':pes?$c(q*precioIt(x)):''}</span></button>`;}).join('');
  $('moSheet').classList.add('ancho');
  abrirHoja(`<p class="mo-kick">⚖️ Pesar en caja · ${esc(o.ref)} · ${esc(o.cliente.nombre)} · ${esc(sucNom(o.sucursal))}</p>
    <div class="pk">
      <div class="pk-lista">${filas}<div class="pk-pie">Si algo no hay: ${SUST[o.sust]||''}${o.nota?' · 📝 '+esc(o.nota):''}</div></div>
      <div class="pk-panel">
        <div class="pk-actual"><small>${it.e} ${esc(it.n)} · pidió ${esc(pidio(it))}</small>
          <div class="pk-pantalla${P.buf!==''?' escribiendo':''}">${valor===''?`<i>${esc(fq(it.q))}</i>`:esc(valor)}<span>${kgU?'kg':'unid.'}</span></div>
          <em>${sub!=null?$c(sub):'Escribí el '+(kgU?'peso de la balanza':'número de unidades')}${dif&&Math.abs(dif)>1e-9?` · ${dif>0?'+':'−'}${Math.round(Math.abs(dif)*1000)} g`:''}</em></div>
        <div class="pk-pad">${['7','8','9','4','5','6','1','2','3',kgU?'.':'',"0",'⌫'].map(k=>k?`<button type="button" data-mo="pk" data-k="${k}">${k}</button>`:'<span></span>').join('')}</div>
        <div class="pk-acc"><button type="button" class="mo-btn r" data-mo="pk-nohay">No hay</button><button type="button" class="mo-btn" data-mo="pk-igual">= Pedido</button><button type="button" class="mo-btn p" data-mo="pk-sig">Siguiente ↵</button></div>
        <div class="pk-total"><span>${N.esAprox(o)?'Total aprox.':'Total exacto'} · ${r} de ${n} listos</span><b>${$c(tot)}</b></div>
        <button type="button" class="mo-btn p w big" data-mo="pk-listo">✅ ${r<n?'Terminar':'Todo pesado'} · LISTA y avisar</button>
        <div class="mo-btns"><button type="button" class="mo-btn" data-mo="pk-volver">‹ Ver pedido</button><button type="button" class="mo-btn" data-mo="imprimir">🖨️ Imprimir lista</button></div>
      </div>
    </div>`);
  $('moSheet').querySelector('.pk-fila.on')?.scrollIntoView({block:'nearest'});
}
function teclaPeso(k){
  const P=M.pk;if(!P)return;
  if(k==='⌫')P.buf=P.buf.slice(0,-1);
  else if(k==='.'||k===','){if(!P.buf.includes('.'))P.buf=(P.buf||'0')+'.';}
  else if(/^\d$/.test(k)&&P.buf.replace('.','').length<6)P.buf+=k;
  repintar(pintarEncargo);
}
function confirmarPeso(forzar){
  const o=N.get(M.abierto),P=M.pk;if(!o||!P)return;
  const i=P.i,it=o.items[i];
  let v=forzar!=null?forzar:(P.buf!==''?+P.buf.replace(',','.'):(it.qr!=null&&it.qr!==''?+it.qr:+it.q));
  if(!(v>=0))v=+it.q;
  const sig=o.items.findIndex((x,j)=>j>i&&x.estado!=='listo'&&x.estado!=='nohay');
  const otro=sig>=0?sig:o.items.findIndex((x,j)=>j!==i&&x.estado!=='listo'&&x.estado!=='nohay');
  M.pk={i:otro>=0?otro:i,buf:''};
  buzz(8);
  N.cambiar(o.id,x=>{const t=x.items[i];t.qr=v;t.estado=v===0?'nohay':'listo';},'tienda').then(()=>{repintar(pintarEncargo);pintarMostrador();});
}
function terminarPesaje(){
  const o=N.get(M.abierto);if(!o)return;
  const faltan=o.items.filter(x=>x.estado!=='listo'&&x.estado!=='nohay').length;
  if(faltan&&!confirm(`Faltan ${faltan} producto${faltan>1?'s':''}: se marcan como lo pidió el cliente. ¿Seguimos?`))return;
  borrarBorr(o.id,'pk');
  const sinU=sinUber(o);
  N.cambiar(o.id,x=>{x.items.forEach(t=>{if(t.estado!=='listo'&&t.estado!=='nohay'){t.estado='listo';if(t.qr==null||t.qr==='')t.qr=t.q;}});if(!sinUber(x))sellarCotizacion(x);},'tienda',sinU?'Pesado en caja · falta el costo del Uber para mandar la cotización':'Pesado en caja · cotización enviada al cliente · esperando su confirmación').then(x=>{
    if(!x)return;
    M.tab='alistando';M.vista='encargo';pintarEncargo();pintarMostrador();
    if(sinU){pedirUber(x);return;}
    toast('🧾 '+x.ref+' · cotización '+$c(N.totalDe(x))+' enviada a '+x.cliente.nombre.split(' ')[0]+' · esperando su confirmación');
  });
}
document.addEventListener('keydown',e=>{
  if(M.vista!=='pesar'||!$('moSheet')?.classList.contains('open')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(/^[0-9]$/.test(e.key)){e.preventDefault();teclaPeso(e.key);}
  else if(e.key==='.'||e.key===','){e.preventDefault();teclaPeso('.');}
  else if(e.key==='Backspace'){e.preventDefault();teclaPeso('⌫');}
  else if(e.key==='Enter'){e.preventDefault();confirmarPeso();}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const o=N.get(M.abierto);M.pk={i:Math.max(0,Math.min(o.items.length-1,M.pk.i+(e.key==='ArrowDown'?1:-1))),buf:''};repintar(pintarEncargo);}
});
function envioHtml(o){
  const e=o.retiro.envio,s=suc(o.sucursal),d=.003,ub=N.ubiSuc(s),real=+e.costoUber>0,estU=+e.uberEst>0?+e.uberEst:0,cli=+e.costo||0;
  const totU=real?+e.costoUber:estU,tie=e.tienda!=null?+e.tienda:(totU?Math.max(0,totU-cli):null);
  // Después de que el cliente confirma el total o paga, el envío ya no cambia: lo que cobre el Uber de más lo pone la tienda
  const fijo=!!(o.confirmacion?.at||o.comprobante||o.cobro||['reportado','verificado'].includes(o.pago?.estado));
  const cuenta=totU||cli?`<div class="mo-tot m"><span>${real?'Uber cotizado':'Uber estimado'}</span><span>${$c(totU||cli)}</span></div><div class="mo-tot m"><span>Lo paga el cliente${e.pct&&e.pct<100?' ('+e.pct+' %)':''}</span><span>${$c(cli)}</span></div>${tie!=null?`<div class="mo-tot m o"><span>Lo pone ARAMO</span><span>${$c(tie)}</span></div>`:''}`:'';
  const dif=e.difTienda!=null&&e.uberPedido?`<div class="mo-tot m"><span>Uber al pedirlo</span><span>${$c(e.uberPedido)}</span></div><div class="mo-tot m o"><span>${+e.difTienda>=0?'Diferencia que pone la tienda':'Salió más barato que lo pactado'}</span><span>${$c(Math.abs(+e.difTienda))}</span></div>`:'';
  const costo=fijo
    ?`<div class="mo-uber-paso"><b>🔒 Envío pactado: ya no cambia</b><small>El cliente confirmó el total con el Uber en ${$c(totU)} (él paga ${$c(cli)}). Si al pedirlo sale distinto, anotalo: la diferencia la pone la tienda.</small>
      <label class="mo-field">¿Cuánto cobró el Uber al pedirlo? (₡)<input type="number" inputmode="numeric" min="0" step="50" placeholder="Pactado ${totU}" value="${e.uberPedido?+e.uberPedido:''}" id="moUberReal"></label>
      <button type="button" class="mo-btn o w" data-mo="uber-costo" style="margin-top:6px">Anotar lo que cobró</button>${dif}</div>`
    :`<div class="mo-uber-paso"><b>${real?'✅ Costo del Uber anotado':'1 · Poné el costo del Uber ANTES de mandar la cotización'}</b><small>El envío se pacta antes de que el cliente pague: la cotización lleva los productos más la parte del envío del cliente (menos de ${$c(N.envioCfg().repartoMin)} lo paga todo el cliente; desde ahí, mitad y mitad).${e.rango?` El cliente vio un rango de ${$c(e.rango.min)} a ${$c(e.rango.max)}.`:''}</small>
      <button type="button" class="mo-btn w" data-mo="uber-precio">👀 Ver el precio en Uber (sin pedirlo)</button>
      <label class="mo-field">Costo del Uber (₡) · lo que ves en la app de Uber<input type="number" inputmode="numeric" min="0" step="50" placeholder="${estU?'Estimado '+estU:'Ej.: 3500'}" value="${real?+e.costoUber:''}" id="moUberReal"></label>
      <button type="button" class="mo-btn o w" data-mo="uber-costo" style="margin-top:6px">${real?'Cambiar el costo del Uber':'Guardar el costo del Uber'}</button>
      <div class="mo-s" style="margin-top:6px">Queda en el historial que mejora el estimado.</div></div>`;
  const puedePedir=fijo||o.estado==='listo';
  return `<div class="mo-blk"><h4>🛵 Envío con Uber</h4>
    <iframe class="mo-mapa" title="Ubicación del cliente" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${e.lng-d},${e.lat-d},${e.lng+d},${e.lat+d}&layer=mapnik&marker=${e.lat},${e.lng}"></iframe>
    <div class="mo-s" style="margin-top:8px">Sale de ${esc(s?.n||'')} ${fdia(o.retiro.at)} a las ${fh(o.retiro.at)} (${falta(o.retiro.at)})${e.acc?` · ubicación ±${e.acc} m`:''}</div>
    ${e.senas?`<div style="margin-top:6px;font-weight:800">📝 ${esc(e.senas)}</div>`:''}
    ${e.uber?`<div class="mo-s" style="margin-top:6px;color:var(--g);font-weight:900">✓ Uber pedido a las ${fh(e.uber)}</div>`:''}
    ${cuenta}${costo}
    ${puedePedir?`<button type="button" class="mo-btn p w" style="margin-top:10px" data-mo="uber">🚗 ${e.uber?'Abrir Uber de nuevo':'Pedir Uber a esta ubicación'}</button>`:'<div class="mo-s" style="margin-top:10px">🔒 El Uber se pide después de que el cliente confirme el total y pague.</div>'}
    <div class="mo-btns"><a class="mo-btn" href="${mapaUrl(e)}" target="_blank" rel="noopener">🗺️ Ver en mapa</a><button type="button" class="mo-btn" data-mo="copiar" data-v="${esc(mapaUrl(e)+(e.senas?' · '+e.senas:''))}">📋 Copiar dirección</button></div>
    ${ub.exacta?'':'<div class="mo-s" style="margin-top:6px">💡 La tienda todavía no tiene su ubicación exacta: Uber toma como salida donde estás ahora. <button type="button" class="mo-btn" data-mo="tienda-gps" data-k="'+esc(o.sucursal)+'">📍 Guardar la ubicación de la tienda (estando aquí)</button></div>'}</div>`;
}
function pintarPin(o){
  const d=M.pin.padEnd(4,' ').split('');
  abrirHoja(`<p class="mo-kick">Entregar · paso 1 de 2</p><div class="mo-h">${esc(o.ref)} · ${esc(o.cliente.nombre)}</div><div class="mo-s">Pedile su código de retiro (4 números) o escaneá su QR.</div>
    <div class="mo-pin" id="moPin">${d.map(c=>`<span class="${c!==' '?'f':''}">${c!==' '?c:''}</span>`).join('')}</div>
    <div class="mo-pad">${[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(k=>`<button type="button" data-mo="pin" data-k="${k}">${k}</button>`).join('')}</div>
    ${'BarcodeDetector' in window?'<button type="button" class="mo-btn w" style="margin-top:10px" data-mo="qr">📷 Escanear QR</button><video class="mo-video" id="moVideo" playsinline muted hidden></video>':''}
    <div class="mo-btns"><button type="button" class="mo-btn" data-mo="abrir" data-id="${o.id}">‹ Volver</button><button type="button" class="mo-btn" data-mo="sin-codigo">Entregar sin código</button></div>`);
}

// ── Cobro (Caja) ──
function abrirCobro(id,opc={}){
  if(enCelular(N.get(id))){toast('📱 Este pedido se está cobrando en el POS celular');return;}
  const o=N.get(id);if(!o)return;
  if(N.faseDe?.(o)==='confirmacion'){toast('Primero esperá la confirmación del cliente');abrirEncargo(id);return;}
  if(N.porConfirmar?.(o)){toast('Cambió el total: mandale el total nuevo al cliente y se cobra cuando lo confirme');abrirEncargo(id);return;}
  if(o.estado==='nuevo'||o.estado==='alistando'){toast('Primero alistalo y pesalo: el cobro sale del peso real');abrirEncargo(id);return;}
  if(o.estado==='cancelado'){toast('Ese pedido está cancelado');return;}
  M.abierto=id;
  const ya=o.pago?.estado==='verificado'?o.pago.metodo:null;
  M.cobro={metodo:ya||o.pago?.metodo||'efectivo',recibido:o.pago?.conCuanto||0,entregar:opc.entregar??(opc.arrastre||o.estado==='listo'),codigo:'',desdePin:!!opc.desdePin,sa:sdDefecto(o.sucursal),mxT:0,mxS:0};
  const bc=BORR[id]?.cobro;if(bc&&!ya)Object.assign(M.cobro,{metodo:bc.metodo,recibido:bc.recibido});
  M.vista='cobro';pintarEncargo();
}
function pintarCobro(o){
  const c=M.cobro,tot=N.totalDe(o),vuelto=c.metodo==='efectivo'?Math.max(0,(+c.recibido||0)-tot):0;
  const billetes=[...new Set([tot,...[1000,2000,5000,10000,20000].map(b=>Math.ceil(tot/b)*b)])].filter(v=>v>=tot).sort((a,b)=>a-b).slice(0,5);
  const lineas=o.items.filter(i=>i.estado!=='nohay').map(i=>`<div class="l"><span>${i.e} ${esc(i.n)} · ${esc(i.u==='kg'?kg(qReal(i))+' kg':qtxt(qReal(i),i.u))} × ${$c(precioIt(i))}</span><span>${$c(qReal(i)*precioIt(i))}</span></div>`).join('');
  abrirHoja(`<p class="mo-kick">Caja${c.desdePin?' · paso 2 de 2':''}${POS?' · ARAMO POS':''}</p><div class="mo-h">Cobrar ${esc(o.ref)}</div><div class="mo-s">${esc(o.cliente.nombre)} · ${esc(sucNom(o.sucursal))}</div>
    <div class="mo-ticket">${lineas}${o.retiro.envio&&+o.retiro.envio.costo?`<div class="l"><span>🛵 Envío Uber</span><span>${$c(o.retiro.envio.costo)}</span></div>`:''}${o.premio?`<div class="l"><span>🎁 Premio con hojas (${+o.premio.hojas} 🍃)</span><span>−${$c(o.premio.valor)}</span></div>`:''}<hr><div class="l t"><span>TOTAL EXACTO</span><span>${$c(tot)}</span></div></div>
    <div class="mo-kick" style="margin-top:14px">¿Cómo paga?</div>
    <div class="mo-metodos c4">${[['efectivo','💵','Efectivo'],['tarjeta','💳','Tarjeta'],['sinpe','📲','SINPE'],['mixto','🔀','Mixto']].map(([k,e,n])=>`<button type="button" class="${c.metodo===k?'on':''}" data-mo="metodo" data-k="${k}"><b>${e}</b>${n}</button>`).join('')}</div>
    ${c.metodo==='efectivo'?`<label class="mo-field">Recibido<input type="number" inputmode="numeric" id="moRecibido" min="0" step="50" value="${+c.recibido||''}" placeholder="${tot}"></label><div class="mo-chips" style="flex-wrap:wrap">${billetes.map(v=>`<button type="button" class="mo-chip${+c.recibido===v?' on':''}" data-mo="recibido" data-v="${v}">${v===tot?'Exacto':$c(v)}</button>`).join('')}</div><div class="mo-vuelto">Vuelto <b id="moVuelto">${$c(vuelto)}</b></div>`:''}
    ${c.metodo==='sinpe'?`<div class="mo-s" style="margin-top:8px">${o.pago.estado==='reportado'?'El cliente avisó que pagó. ':''}Revisá que te entró ${$c(tot)} con la descripción <b>${esc(o.ref)}</b>.</div>${sdHtml(o,c)}`:''}
    ${c.metodo==='mixto'?mixtoHtml(o,c,tot):''}
    ${!c.desdePin&&!o.retiro.envio?`<label class="mo-field">Código del cliente (opcional, para entregar)<input type="text" inputmode="numeric" maxlength="4" id="moCodigo" value="${esc(c.codigo)}" placeholder="4 números"></label>`:''}
    <label class="mo-sw">Entregar ahora al cliente<input type="checkbox" id="moEntregar" ${c.entregar?'checked':''}></label>
    <button type="button" class="mo-btn p w big" style="margin-top:12px" data-mo="cobrar-ok">🧾 Cobrar ${$c(tot)}${c.metodo==='efectivo'&&vuelto?` · vuelto ${$c(vuelto)}`:''}</button>
    ${POS?'<div class="mo-s" style="margin-top:8px">🔌 Queda registrada como venta en ARAMO POS, con los nombres y el peso real.</div>':''}`);
  const rec=$('moRecibido');if(rec)rec.addEventListener('input',()=>{c.recibido=+rec.value||0;guardarBorr();const v=Math.max(0,c.recibido-tot);$('moVuelto').textContent=$c(v);});
  const mxT=$('moMxT'),mxS=$('moMxS'),mxA=()=>{c.mxT=+mxT.value||0;c.mxS=+mxS.value||0;const e=tot-c.mxT-c.mxS;$('moMxE').textContent=e<0?'se pasa del total':$c(e);$('moMxEBox').classList.toggle('mal',e<0);$('moSdMx').hidden=!(c.mxS>0);};
  if(mxT&&mxS){mxT.addEventListener('input',mxA);mxS.addEventListener('input',mxA);}
  const cod=$('moCodigo');if(cod)cod.addEventListener('input',()=>{c.codigo=cod.value.replace(/\D/g,'').slice(0,4);});
  const en=$('moEntregar');if(en)en.addEventListener('change',()=>{c.entregar=en.checked;});
}
async function cobrar(){
  const o=N.get(M.abierto),c=M.cobro;if(!o||!c)return;
  if(N.faseDe?.(o)==='confirmacion'){toast('Esperá a que el cliente confirme la cotización');return;}
  if(N.porConfirmar?.(o)){toast('Cambió el total: el cliente tiene que confirmarlo antes de cobrar');M.vista='encargo';pintarEncargo();return;}
  const tot=N.totalDe(o);
  if(c.metodo==='efectivo'&&c.recibido&&+c.recibido<tot){toast('Lo recibido es menos que el total');return;}
  if(c.codigo&&c.codigo.length===4&&c.codigo!==o.pin){toast('Ese código no coincide con el del pedido');buzz([60,40,60]);return;}
  // Mixto: tarjeta y SINPE como se escribieron; el efectivo es lo que falta (sin vuelto)
  let mx=null;
  if(c.metodo==='mixto'){
    const T=Math.max(0,Math.round(+c.mxT||0)),S=Math.max(0,Math.round(+c.mxS||0));
    if(T+S<=0){toast('Escribí cuánto pagó con tarjeta o con SINPE');return;}
    if(T+S>tot){toast('Tarjeta y SINPE se pasan del total');return;}
    mx={efectivo:tot-T-S,tarjeta:T,sinpe:S};
  }
  const parte=mx||(c.metodo==='efectivo'?{efectivo:tot,tarjeta:0,sinpe:0}:c.metodo==='sinpe'?{efectivo:0,tarjeta:0,sinpe:tot}:{efectivo:0,tarjeta:tot,sinpe:0});
  const sa=parte.sinpe>0?(N.sinpeDestinosDe(o.sucursal).find(d=>d.nombre===c.sa)||N.sinpeDestinosDe(o.sucursal)[0]).nombre:'';   // a quién se le hizo el SINPE
  if(sa)LS.set('aramo_sinpe_ultimo_'+o.sucursal,sa);
  const rec=c.metodo==='efectivo'?(+c.recibido||tot):tot;
  let venta=null;
  if(POS){
    try{
      const caja=await POS.caja();
      if(!caja){toast('Abrí la caja en ARAMO POS para registrar la venta');return;}
      const prods=await POS.productos().catch(()=>[]);
      const buscar=n=>(prods||[]).find(p=>nrm(p.nombre)===nrm(n));
      const items=o.items.filter(i=>i.estado!=='nohay').map(i=>{const p=buscar(i.n),q=qReal(i),pr=precioIt(i);return{producto_id:p?.id||null,nombre:`${i.n}${i.u==='kg'?'':''}`,precio_unitario:pr,cantidad:+q.toFixed(3),unidad:i.u==='kg'?'kg':(i.u==='unid'?'unidad':i.u),subtotal:N.redondear5(q*pr),producto_generico:!p};});
      if(o.retiro.envio&&+o.retiro.envio.costo)items.push({producto_id:null,nombre:'Envío Uber',precio_unitario:+o.retiro.envio.costo,cantidad:1,unidad:'unidad',subtotal:+o.retiro.envio.costo,producto_generico:true});
      const v=await POS.venta({subtotal:tot,total:tot,metodo_pago:c.metodo==='link'?'tarjeta':c.metodo,monto_recibido:rec,cambio:Math.max(0,rec-tot),cliente_nombre:o.cliente.nombre,notas:`Pedido web ${o.ref} · ${sucNom(o.sucursal)}`,pago_efectivo:parte.efectivo,pago_tarjeta:parte.tarjeta,pago_sinpe:parte.sinpe,sinpe_destino:sa?sdEtiqueta(o.sucursal,sa):'',items});
      venta=v?.numero||null;
    }catch(e){toast('ARAMO POS no pudo registrar la venta: '+(e?.message||e));return;}
  }
  const entregar=c.entregar,fecha=new Date().toISOString(),pid=o.id+'|'+fecha;
  // Lo que viaja al POS de esta tienda (la venta sale con el peso y el precio finales, y el CABYS si lo hay)
  const datosPOS=!POS&&!o.posVenta&&!o.cobro?.porPOS?{v:1,pedido:o.id,ref:o.ref,cliente:o.cliente.nombre,sucursal:o.sucursal,
    cobro:{metodo:c.metodo,total:tot,efectivo:parte.efectivo,tarjeta:parte.tarjeta,sinpe:parte.sinpe,recibido:rec,vuelto:Math.max(0,rec-tot),fecha},...(sa?{sa}:{}),
    items:o.items.filter(i=>i.estado!=='nohay').map(i=>({k:i.k,n:i.n,u:i.u,q:+qReal(i),p:+precioIt(i),cabys:String(i.cabys||'')})),
    envio:+o.retiro?.envio?.costo||0,premio:+o.premio?.valor||0}:null;
  borrarBorr(o.id);
  await N.cambiar(o.id,x=>{
    x.cobro={metodo:c.metodo,total:tot,recibido:rec,vuelto:Math.max(0,rec-tot),fecha,venta,sucursal:x.sucursal,...(mx?{pagos:mx}:{}),...(sa?{sinpeA:sa}:{}),...(datosPOS?{aPOS:pid}:{})};
    x.pago.estado='verificado';
    if(entregar){x.estado='entregado';x.fase='entregado';x.entregado=new Date().toISOString();}
    x._ev={tipo:entregar?'entregado':'cobro',monto:tot,metodo:PM(c.metodo).n||c.metodo};
  },'tienda',`Cobrado ${$c(tot)} (${PM(c.metodo).n||c.metodo}${sa?' a '+sa:''})${venta?' · '+venta:''}${entregar?' · entregado':''}`);
  if(datosPOS)N.posEnviar({id:pid,tienda:o.sucursal,datos:datosPOS});   // al POS de esa tienda, como una venta más
  buzz([40,40,80]);
  toast(`🧾 ${o.ref} cobrado ${$c(tot)}${venta?' · '+venta+' en ARAMO POS':''}`);
  M.vista='tiquete';pintarEncargo();pintarMostrador();pintarPuerta();
}
const facTipo=f=>({fisica:'Persona física',juridica:'Persona jurídica',dimex:'Extranjero (DIMEX)'}[f?.tipo]||'Persona física');
function tiqueteTexto(o){
  const t=T(),c=o.cobro||{};
  return [`${sucNom(o.sucursal)||t.nombre||'ARAMO'}`,`Pedido ${o.ref}${c.venta?' · '+c.venta:''}`,`${fdia(c.fecha||o.updated)} ${fh(c.fecha||o.updated)} · ${o.cliente.nombre}`,'',
    ...o.items.filter(i=>i.estado!=='nohay').map(i=>`${i.n} ${i.u==='kg'?kg(qReal(i))+' kg':qtxt(qReal(i),i.u)} x ${$c(precioIt(i))} = ${$c(qReal(i)*precioIt(i))}${o.factura&&i.cabys?'\n   CABYS '+i.cabys:''}`),
    ...(o.retiro.envio&&+o.retiro.envio.costo?[`Envío Uber = ${$c(o.retiro.envio.costo)}`]:[]),
    ...(o.premio?[`Premio con hojas (${o.premio.hojas}) = −${$c(o.premio.valor)}`]:[]),
    '',`TOTAL ${$c(N.totalDe(o))}`,`${PM(c.metodo).n||''}${c.metodo==='efectivo'?` · recibido ${$c(c.recibido)} · vuelto ${$c(c.vuelto)}`:''}${c.metodo==='mixto'?` · efectivo ${$c(partesCobro(c).efectivo)} · tarjeta ${$c(partesCobro(c).tarjeta)} · SINPE ${$c(partesCobro(c).sinpe)}`:''}`,
    ...(c.sinpeA?[`SINPE a ${c.sinpeA}`]:[]),
    ...(o.factura?['','FACTURA ELECTRÓNICA SOLICITADA',`${facTipo(o.factura)} · cédula ${o.factura.cedula||''}`,o.factura.nombre||o.cliente.nombre,o.factura.correo||'']:[]),
    '','¡Gracias por comprar en ARAMO!'].join('\n');
}
function pintarTiquete(o){
  const c=o.cobro||{};
  abrirHoja(`<p class="mo-kick">Tiquete${c.venta?' · '+esc(c.venta):''}</p><div class="mo-h">✅ ${esc(o.ref)} cobrado</div><div class="mo-s">${esc(o.cliente.nombre)} · ${PM(c.metodo).e||''} ${esc(PM(c.metodo).n||'')}${c.sinpeA?' · a '+esc(c.sinpeA):''}${o.estado==='entregado'?' · entregado':''}</div>${enPOSHtml(o)}
    <pre class="mo-tiq">${esc(tiqueteTexto(o))}</pre>
    <div class="mo-btns"><button type="button" class="mo-btn" data-mo="imprimir-tiq">🖨️ Imprimir</button><button type="button" class="mo-btn" data-mo="wa-tiq">💬 Enviar al cliente</button></div>
    ${o.estado!=='entregado'?`<button type="button" class="mo-btn p w" style="margin-top:8px" data-mo="entregar">🛍️ Entregar con código</button>`:''}
    <button type="button" class="mo-btn w" style="margin-top:8px" data-mo="cerrar">Listo</button>`);
}
function imprimir(html,titulo){
  const pr=$('moPrint');pr.innerHTML=`<div class="mo-print-in"><h1>${esc(titulo)}</h1>${html}</div>`;
  document.body.classList.add('mo-imprimiendo');
  const fin=()=>{document.body.classList.remove('mo-imprimiendo');window.removeEventListener('afterprint',fin);};
  window.addEventListener('afterprint',fin);
  setTimeout(()=>{try{window.print();}catch{}setTimeout(fin,1500);},50);
}
function listaAlistado(o){
  return `<p>${esc(sucNom(o.sucursal))} · ${esc(o.cliente.nombre)} · ${o.retiro.envio?'🛵 envío':'recoge'} ${esc(fdia(o.retiro.at))} ${esc(fh(o.retiro.at))} · si algo no hay: ${esc(SUST[o.sust]||'')}</p>
    <table><thead><tr><th></th><th>Producto</th><th>Pidió</th><th>Pesó / lleva</th><th>Nota</th></tr></thead><tbody>${o.items.map(i=>`<tr><td>☐</td><td><b>${esc(i.n)}</b><br><small>${esc(N.catalogo().find(p=>p.k===i.k)?.d||'')}</small></td><td>${esc(pidio(i))}</td><td>__________</td><td>${esc([i.mad?MAD[i.mad]:'',i.nota].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table>${o.nota?`<p>📝 ${esc(o.nota)}</p>`:''}`;
}

// ── Caja de hoy ──
function pintarCajaHoy(){
  const {L,t,total}=resumenCaja();
  abrirHoja(`<p class="mo-kick">Caja de hoy · ${esc(M.suc==='todas'?'Ambas tiendas':sucNom(M.suc))}</p><div class="mo-h">${$c(total)}</div><div class="mo-s">${L.length} pedido${L.length===1?'':'s'} cobrado${L.length===1?'':'s'} hoy${POS?' · también quedan en ARAMO POS':''}</div>
    <div class="mo-cuadre" style="margin-top:12px"><div><span>💵 Efectivo</span><b>${$c(t.efectivo)}</b></div><div><span>💳 Tarjeta</span><b>${$c((t.tarjeta||0)+(t.link||0))}</b></div><div><span>📲 SINPE</span><b>${$c(t.sinpe)}</b></div></div>
    <div class="mo-blk">${L.length?L.map(o=>`<button type="button" class="mo-cobrable" data-mo="ver-tiq" data-id="${o.id}"><span>${fh(o.cobro.fecha)} · <b>${esc(o.ref)}</b> ${esc(o.cliente.nombre)}</span><span>${PM(o.cobro.metodo).e||''} ${$c(o.cobro.total)}</span></button>`).join(''):'<div class="mo-s">Todavía no hay cobros hoy.</div>'}</div>
    ${L.length?'<button type="button" class="mo-btn w" style="margin-top:10px" data-mo="imprimir-cierre">🖨️ Imprimir cierre del día</button>':''}`);
}

// ── Vitrina: precios, unidades, nombres y productos ──
function pintarVitrina(){
  const t=T(),cat=N.catalogo(M.suc==='todas'?null:M.suc),q=nrm(M.vq);
  const L=cat.filter(p=>(M.vcat==='todos'||p.c===M.vcat)&&(!q||nrm(p.n+' '+(p.d||'')).includes(q)));
  const margen=margenTienda(),notas=notasVit();
  abrirHoja(`<p class="mo-kick">Vitrina · lo que ven los clientes en La Feria</p><div class="mo-h">🏷️ Precios y productos</div><div class="mo-s">Todo se guarda solo y se ve al instante en La Feria y las recetas. Los pedidos ya sellados conservan su precio.</div>
    <div class="mo-dos" style="margin-top:10px"><label class="mo-field">Buscar<input type="search" id="moVitQ" value="${esc(M.vq)}" placeholder="Ej.: aguacate" autocomplete="off"></label><label class="mo-field">🤖 Margen automático (mínimo 40 %)<input type="number" id="moMargen" min="40" max="300" step="1" value="${margen}"></label></div>
    <div class="mo-chips" style="flex-wrap:nowrap;overflow-x:auto">${[{k:'todos',n:'Todos',e:'🧺'},...CFG.pasillos.filter(p=>p.k!=='top')].map(p=>`<button type="button" class="mo-chip${M.vcat===p.k?' on':''}" data-mo="vcat" data-k="${p.k}">${p.e} ${esc(p.n)}</button>`).join('')}</div>
    <button type="button" class="mo-btn p w" style="margin-top:10px" data-mo="prod-nuevo">＋ Producto nuevo</button>
    <div class="mo-blk" style="padding:4px 12px">${L.map(p=>{
      const auto=!!(t.prods||{})[p.k]?.auto,c=auto||M.vq?costoHoy(p.n):null;
      return `<div class="mo-vi${p.oculto?' oculto':''}"><button type="button" class="e" data-mo="prod-edit" data-k="${p.k}" aria-label="Editar ${esc(p.n)}">${p.e}</button>
        <button type="button" class="t" data-mo="prod-edit" data-k="${p.k}"><strong>${esc(p.n)}${p.propio?' <span class="mo-pill">nuevo</span>':''}</strong><small>${auto&&notas[p.k]?'':esc(p.d||'')+(p.d?' · ':'')}por ${esc(UNI[p.u]||p.u)}${auto?(notas[p.k]?` · 💡 podés bajarlo a ${$c(notas[p.k].sug)}`:` · 🤖 ${c?'costo '+$c(c.pr)+' + '+margen+'%':'sin costo en Inventario'}`):''}</small></button>
        <input type="number" inputmode="numeric" min="0" step="5" value="${p.p}" data-mo-pr="${p.k}" aria-label="Precio de ${esc(p.n)}" ${auto?'disabled':''}>
        ${auto&&notas[p.k]?`<button type="button" class="tg on" data-mo="vit-bajar" data-k="${p.k}" aria-label="Bajar a ${$c(notas[p.k].sug)}" title="El costo bajó: bajar a ${$c(notas[p.k].sug)}">⬇</button>`:''}
        <button type="button" class="tg${auto?' on':''}" data-mo="auto" data-k="${p.k}" aria-label="Precio automático" title="Precio automático con el costo de Inventario">🤖</button>
        <button type="button" class="tg${p.oculto?'':' on'}" data-mo="vis" data-k="${p.k}" aria-label="Mostrar">${p.oculto?'🙈':'👁'}</button>
        <button type="button" class="tg ag${p.agotado?' on':''}" data-mo="ago" data-k="${p.k}" aria-label="Agotado">🚫</button></div>`;}).join('')||'<div class="mo-vacio">Nada con ese nombre.</div>'}</div>`);
  const qi=$('moVitQ');qi.addEventListener('input',()=>{M.vq=qi.value;const pos=qi.selectionStart;repintar(pintarVitrina);const n=$('moVitQ');n.focus();n.setSelectionRange(pos,pos);});
  const mg=$('moMargen');mg.addEventListener('change',()=>{const m=Math.max(40,+mg.value||0);mg.value=m;N.guardarTienda({margen:m});autoPrecios();toast('🤖 Margen '+m+'% guardado');});
  $('moSheet').querySelectorAll('[data-mo-pr]').forEach(i=>i.addEventListener('change',()=>{
    const k=i.dataset.moPr,v=Math.max(0,Math.round(+i.value||0));
    const precios={...(T().precios||{})};if(v>0)precios[k]=v;else delete precios[k];
    const t2=T(),kk=M.suc==='todas'?localK():M.suc,sucursales=(t2.sucursales||[]).map(s=>s.k===kk?{...s,precios:{...(s.precios||{}),...(v>0?{[k]:v}:{})}}:s);
    N.guardarTienda({precios,sucursales});toast('🏷️ Precio guardado · ya se ve en La Feria');
  }));
}
function editarProd(k){
  const p=k?N.catalogo().find(x=>x.k===k):null;
  M.edit=p?{...p,auto:!!(T().prods||{})[k]?.auto}:{k:'',n:'',d:'',e:'🧺',c:'verduras',u:'kg',s:.5,p:0,auto:false,nuevo:true};
  M.vista='prod';pintarProd();
}
function pintarProd(){
  const e=M.edit,c=e.n?costoHoy(e.n):null,t=T();
  abrirHoja(`<p class="mo-kick">${e.nuevo?'Producto nuevo':'Editar producto'} · se actualiza en todo lado</p><div class="mo-h">${esc(e.e)} ${esc(e.n||'Nuevo producto')}</div>
    <div class="mo-dos"><label class="mo-field">Nombre<input id="peN" value="${esc(e.n)}" placeholder="Ej.: Tomate cherry"></label><label class="mo-field">Ícono<input id="peE" value="${esc(e.e)}" maxlength="4"></label></div>
     <label class="mo-field">¿Qué es exactamente? (lo ve el cliente)<input id="peD" value="${esc(e.d||'')}" placeholder="Ej.: Bandeja de 250 g, rojos y dulces"></label>
     <label class="mo-field">Código CABYS (13 números, opcional · para la factura electrónica)<input id="peCabys" inputmode="numeric" maxlength="13" value="${esc(e.cabys||'')}" placeholder="Dejalo vacío hasta tenerlo"></label>
     <label class="mo-field">Orden en la vitrina (menor = primero)<input id="peOrden" type="number" min="1" step="1" value="${+e.orden||''}" placeholder="Dejalo vacío para el orden normal"></label>
    <div class="mo-dos"><label class="mo-field">Se vende por<select id="peU">${UNIDADES.map(([v,n])=>`<option value="${v}"${e.u===v?' selected':''}>${n}</option>`).join('')}</select></label><label class="mo-field">De a cuánto<select id="peS">${(e.u==='kg'?[.25,.5,1]:[1,2,6,12]).map(v=>`<option value="${v}"${+e.s===v?' selected':''}>${fq(v)} ${UNI[e.u]||e.u}</option>`).join('')}</select></label></div>
     <div class="mo-dos"><label class="mo-field">Pasillo<select id="peC">${CFG.pasillos.filter(p=>p.k!=='top').map(p=>`<option value="${p.k}"${e.c===p.k?' selected':''}>${p.e} ${esc(p.n)}</option>`).join('')}</select></label><label class="mo-field">Precio ₡ por ${esc(UNI[e.u]||e.u)}<input id="peP" type="number" inputmode="numeric" min="0" step="5" value="${+e.p||''}" ${e.auto?'disabled':''}></label></div>
     <label class="mo-field">Foto del producto<input id="peFoto" type="file" accept="image/jpeg,image/png,image/webp,image/heic"><small>JPG, PNG o WebP · máximo 5 MB. La foto se publica en el catálogo.</small></label>
     <label class="mo-field">URL de foto existente<input id="peFotoUrl" type="url" value="${esc(e.foto||'')}" placeholder="https://…"></label>
    <label class="mo-sw">🤖 Precio automático (costo del Cierre + ${margenTienda()}%)<input type="checkbox" id="peA" ${e.auto?'checked':''}></label>
    <div class="mo-s">${c?`Costo de hoy en Inventario: <b>${$c(c.pr)}</b> (${esc(c.prov)}) → precio automático <b>${$c(precioAuto(c.pr,margenTienda()))}</b>`:'No encontramos este producto en Inventario con ese nombre; el automático necesita un costo.'}</div>
    <button type="button" class="mo-btn p w big" style="margin-top:12px" data-mo="prod-ok">Guardar · se ve al instante en La Feria</button>
    ${e.nuevo?'':'<button type="button" class="mo-btn w" style="margin-top:8px" data-mo="vitrina">‹ Volver a la vitrina</button>'}`);
  const u=$('peU');u.addEventListener('change',()=>{M.edit={...leerProd(),u:u.value,s:u.value==='kg'?.5:1};repintar(pintarProd);});
  $('peFoto')?.addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;if(!e.k){toast('Guardá el producto primero y luego subí la foto');return;}try{toast('Subiendo foto…');const url=await N.subirFoto(file,e.k);M.edit={...M.edit,foto:url};const input=$('peFotoUrl');if(input)input.value=url;toast('📷 Foto guardada');}catch(err){toast(err.message||'No se pudo subir la foto');}});
  $('peA').addEventListener('change',()=>{M.edit={...leerProd()};repintar(pintarProd);});
}
function leerProd(){
  const e=M.edit,v=id=>$(id)?.value??'';
  return{...e,n:v('peN').trim(),e:v('peE').trim()||'🧺',d:v('peD').trim(),foto:v('peFotoUrl').trim(),orden:v('peOrden')===''?null:Math.max(1,+v('peOrden')||1),cabys:v('peCabys').replace(/\D/g,'').slice(0,13),u:v('peU'),s:+v('peS')||(v('peU')==='kg'?.5:1),c:v('peC'),p:Math.round(+v('peP')||0),auto:$('peA').checked};
}
function guardarProd(){
  const e=leerProd();
  if(e.n.length<2){toast('Escribí el nombre del producto');return;}
  if(e.cabys&&e.cabys.length!==13){toast('El código CABYS lleva 13 números (o dejalo vacío)');$('peCabys')?.focus();return;}
  const t=T(),prods={...(t.prods||{})},precios={...(t.precios||{})},nuevos=[...(t.nuevos||[])];
  let k=e.k;
  if(e.nuevo){
    k=nrm(e.n).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||('p'+Date.now().toString(36));
    if(N.catalogo().some(p=>p.k===k))k+='_'+Date.now().toString(36).slice(-3);
    nuevos.push({k,n:e.n,d:e.d,e:e.e,c:e.c,u:e.u,s:e.s,p:e.p||0,orden:e.orden});
  }else prods[k]={...(prods[k]||{}),n:e.n,d:e.d,e:e.e,c:e.c,u:e.u,s:e.s,foto:e.foto,orden:e.orden,auto:e.auto};
  if(e.nuevo)prods[k]={...(prods[k]||{}),foto:e.foto,orden:e.orden,auto:e.auto};
  prods[k]={...(prods[k]||{}),cabys:e.cabys||''}; // CABYS: vacío hasta que la tienda lo llene; viaja en cada línea del pedido
  if(e.auto){const c=costoHoy(e.n);if(c)precios[k]=precioAuto(c.pr,margenTienda());}
  else if(e.p>0)precios[k]=e.p;
  N.guardarTienda({prods,precios,nuevos});
  toast(`🏷️ ${e.n} guardado · ya se ve en La Feria`);
  M.vista='vitrina';pintarVitrina();
}

// ── Recetario editable ──
function pintarRecetario(){
  const t=T(),fuera=new Set(t.recetasOcultas||[]),todas=[...(CFG.recetas||[]),...(t.recetas||[])];
  abrirHoja(`<p class="mo-kick">Recetario de La Feria · ${todas.length} recetas</p><div class="mo-h">📖 Recetario</div><div class="mo-s">El cliente elige una receta y las cantidades se escalan solas por personas. Creá las tuyas con lo que más vendés.</div>
    <button type="button" class="mo-btn p w" style="margin-top:10px" data-mo="rec-nueva">＋ Receta nueva</button>
    <div class="mo-blk" style="padding:4px 12px">${todas.map(r=>{const propia=(t.recetas||[]).some(x=>x.k===r.k);return `<div class="mo-vi${fuera.has(r.k)?' oculto':''}"><span class="e">${r.e}</span><span class="t"><strong>${esc(r.n)}${propia?' <span class="mo-pill">tuya</span>':''}</strong><small>${esc((CFG.categoriasRecetas||[]).find(c=>c.k===r.c)?.n||'')} · ${r.items.map(([k])=>N.catalogo().find(p=>p.k===k)?.n||k).join(', ')}</small></span>${propia?`<button type="button" class="tg" data-mo="rec-edit" data-k="${r.k}" aria-label="Editar">✏️</button>`:''}<button type="button" class="tg${fuera.has(r.k)?'':' on'}" data-mo="rec-vis" data-k="${r.k}" aria-label="Mostrar">${fuera.has(r.k)?'🙈':'👁'}</button></div>`;}).join('')}</div>`);
}
function editarReceta(k){
  const r=k?(T().recetas||[]).find(x=>x.k===k):null;
  M.rec=r?JSON.parse(JSON.stringify(r)):{k:'',n:'',e:'🍲',c:'tico',desc:'',items:[]};M.rq='';
  M.vista='receta';pintarReceta();
}
function pintarReceta(){
  const r=M.rec,cat=N.catalogo().filter(p=>!p.oculto),q=nrm(M.rq||'');
  const sug=q?cat.filter(p=>nrm(p.n).includes(q)&&!r.items.some(([k])=>k===p.k)).slice(0,8):[];
  abrirHoja(`<p class="mo-kick">${r.k?'Editar receta':'Receta nueva'} · cantidades para 4 personas</p><div class="mo-h">${esc(r.e)} ${esc(r.n||'Nueva receta')}</div>
    <div class="mo-dos"><label class="mo-field">Nombre<input id="reN" value="${esc(r.n)}" placeholder="Ej.: Arroz con vegetales"></label><label class="mo-field">Ícono<input id="reE" value="${esc(r.e)}" maxlength="4"></label></div>
    <div class="mo-dos"><label class="mo-field">Categoría<select id="reC">${(CFG.categoriasRecetas||[]).map(c=>`<option value="${c.k}"${r.c===c.k?' selected':''}>${c.e} ${esc(c.n)}</option>`).join('')}</select></label><label class="mo-field">Frase corta<input id="reD" value="${esc(r.desc||'')}" placeholder="Ej.: Rendidor y fácil"></label></div>
    <div class="mo-kick" style="margin-top:12px">Ingredientes (para 4)</div>
    <div class="mo-blk" style="padding:4px 12px">${r.items.map(([k,q4],i)=>{const p=cat.find(x=>x.k===k);return `<div class="mo-vi"><span class="e">${p?.e||'🧺'}</span><span class="t"><strong>${esc(p?.n||k)}</strong><small>por ${esc(UNI[p?.u]||p?.u||'')}</small></span><input type="number" step="${p?.u==='kg'?'0.25':'1'}" min="0" value="${q4}" data-re-q="${i}" aria-label="Cantidad"><button type="button" class="tg" data-mo="re-quitar" data-i="${i}" aria-label="Quitar">✕</button></div>`;}).join('')||'<div class="mo-s">Buscá abajo y tocá para agregar.</div>'}</div>
    <label class="mo-field">Agregar ingrediente<input type="search" id="reQ" value="${esc(M.rq||'')}" placeholder="Buscá: tomate, culantro…" autocomplete="off"></label>
    <div class="mo-chips" style="flex-wrap:wrap">${sug.map(p=>`<button type="button" class="mo-chip" data-mo="re-add" data-k="${p.k}">${p.e} ${esc(p.n)}</button>`).join('')}</div>
    <button type="button" class="mo-btn p w big" style="margin-top:12px" data-mo="rec-ok">Guardar receta · aparece en La Feria</button>
    <button type="button" class="mo-btn w" style="margin-top:8px" data-mo="recetario">‹ Volver al recetario</button>`);
  const leer=()=>{const v=id=>$(id)?.value??'';Object.assign(r,{n:v('reN').trim(),e:v('reE').trim()||'🍲',c:v('reC'),desc:v('reD').trim()});};
  ['reN','reE','reC','reD'].forEach(id=>$(id).addEventListener('change',leer));
  $('moSheet').querySelectorAll('[data-re-q]').forEach(i=>i.addEventListener('change',()=>{r.items[+i.dataset.reQ][1]=Math.max(0,+i.value||0);}));
  const rq=$('reQ');rq.addEventListener('input',()=>{leer();M.rq=rq.value;const pos=rq.selectionStart;repintar(pintarReceta);const n=$('reQ');n.focus();n.setSelectionRange(pos,pos);});
}

// ── Clientes y lealtad (hojas 🍃) ──
// Los clientes se reconocen por teléfono. El historial completo se trae de la nube al abrir.
function todos(){const m=new Map((M.hist||[]).map(o=>[o.id,o]));N.lista().forEach(o=>{const c=m.get(o.id);if(!c||(o.v||0)>=(c.v||0))m.set(o.id,o);});return [...m.values()].filter(o=>o&&!o.borrado&&o.cliente);}
function cargarHist(){
  if(M.histT&&Date.now()-M.histT<60000)return;
  M.histT=Date.now();
  N.historial().then(L=>{M.hist=L;if(['clientes','cliente'].includes(M.vista)&&$('moSheet').classList.contains('open'))repintar(M.vista==='clientes'?pintarClientes:pintarCliente);}).catch(()=>{M.histT=0;});
}
function clientesDe(L){
  const m=new Map();
  L.forEach(o=>{if(o.prueba)return;const t=N.telDe(o);if(!t)return;let c=m.get(t);if(!c){c={tel:t,nombre:o.cliente.nombre,ult:o.created,peds:[]};m.set(t,c);}c.peds.push(o);if(Date.parse(o.created)>=Date.parse(c.ult)){c.ult=o.created;c.nombre=o.cliente.nombre;}});
  return [...m.values()].map(c=>({...c,cuenta:N.cuentaCliente(c.peds)})).sort((a,b)=>b.cuenta.gastado-a.cuenta.gastado||Date.parse(b.ult)-Date.parse(a.ult));
}
const cuentaDeTel=t=>N.cuentaCliente(todos().filter(o=>N.telDe(o)===t));
function lealtadHtml(o){
  const L=N.lealtad();if(!L.activa||o.prueba)return '';
  const t=N.telDe(o),c=cuentaDeTel(t),neto=c.ganadas-c.usadas;
  return `<button type="button" class="mo-leal n-${c.nivel.k}" data-mo="cliente" data-tel="${t}"><span class="b">${c.nivel.e} ${c.nivel.n}</span><span><b>${c.saldo}</b> 🍃</span><span>${c.pedidos} ${c.pedidos===1?'pedido':'pedidos'} · ${$c(c.gastado)}</span><span class="go">›</span></button>
    ${o.premio&&neto<0&&!['entregado','cancelado'].includes(o.estado)?`<div class="mo-aviso">⚠️ No le alcanzan las hojas para el premio (le faltan ${-neto} 🍃).<button type="button" class="mo-btn" data-mo="quitar-premio">Quitar premio</button></div>`:''}`;
}
function graficoMeses(meses){
  const hoy=new Date(),L=[...Array(6)].map((_,i)=>{const d=new Date(hoy.getFullYear(),hoy.getMonth()-5+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return{n:d.toLocaleDateString('es-CR',{month:'short'}).replace('.',''),v:meses[k]||0};});
  const max=Math.max(1,...L.map(m=>m.v));
  return `<div class="mo-graf">${L.map((m,i)=>`<div class="${i===5?'hoy':''}"><em>${m.v?$c(m.v).replace('₡',''):''}</em><i style="--h:${(m.v/max).toFixed(3)};--d:${i}"></i><small>${esc(m.n)}</small></div>`).join('')}</div>`;
}
function pintarClientes(){
  cargarHist();
  const L=clientesDe(todos()),q=nrm(M.cq||''),V=L.filter(c=>!q||nrm(c.nombre+' '+c.tel).includes(q)),Lz=N.lealtad();
  const vendido=L.reduce((t,c)=>t+c.cuenta.gastado,0),hojas=L.reduce((t,c)=>t+c.cuenta.saldo,0),mes=new Date().toISOString().slice(0,7);
  const delMes=L.reduce((t,c)=>t+(c.cuenta.meses[mes]||0),0);
  abrirHoja(`<p class="mo-kick">Clientes y lealtad${M.hist?'':' · trayendo todo el historial…'}</p><div class="mo-h">👥 Clientes</div><div class="mo-s">Cuánto compra cada cliente y sus hojas 🍃. Cuentan los pedidos entregados; se reconocen por teléfono.</div>
    <div class="mo-cuadre" style="margin-top:12px"><div><span>Clientes</span><b>${L.length}</b></div><div><span>Este mes</span><b>${$c(delMes)}</b></div><div><span>Hojas por canjear</span><b>${hojas} 🍃</b></div><div class="tot"><span>Vendido a clientes</span><b>${$c(vendido)}</b></div></div>
    <button type="button" class="mo-prog${Lz.activa?' on':''}" data-mo="programa"><span class="e">🍃</span><span class="t"><b>Programa de lealtad · ${Lz.activa?'activo':'apagado'}</b><small>${Lz.activa?`1 hoja por cada ${$c(Lz.porHoja)} · ${Lz.premios.length} ${Lz.premios.length===1?'premio':'premios'}${Lz.dobles?' · 🔥 hojas dobles':''}`:'Tocá para encenderlo'}</small></span><span class="go">›</span></button>
    <label class="mo-field">Buscar cliente<input type="search" id="moCliQ" value="${esc(M.cq||'')}" placeholder="Nombre o teléfono" autocomplete="off"></label>
    <div class="mo-blk mo-clis">${V.length?V.map((c,i)=>`<button type="button" class="mo-cli" data-mo="cliente" data-tel="${c.tel}"><span class="mo-av n-${c.cuenta.nivel.k}">${esc((c.nombre||'?').trim().charAt(0).toUpperCase()||'?')}</span><span class="t"><b>${!q&&i<3&&c.cuenta.gastado?['🥇','🥈','🥉'][i]+' ':''}${esc(c.nombre)}</b><small>${c.cuenta.nivel.e} ${c.cuenta.nivel.n} · ${c.cuenta.saldo} 🍃 · ${c.cuenta.pedidos} ${c.cuenta.pedidos===1?'pedido':'pedidos'} · ${esc(fdia(c.ult))}</small></span><span class="v">${$c(c.cuenta.gastado)}</span></button>`).join(''):`<div class="mo-vacio">${L.length?'Nadie con ese nombre o teléfono.':'Todavía no hay clientes: aparecen con su primer pedido.'}</div>`}</div>`);
  const qi=$('moCliQ');qi.addEventListener('input',()=>{M.cq=qi.value;const pos=qi.selectionStart;repintar(pintarClientes);const n=$('moCliQ');n.focus();n.setSelectionRange(pos,pos);});
}
function pintarCliente(){
  cargarHist();
  const c=clientesDe(todos()).find(x=>x.tel===M.ctel);if(!c){M.vista='clientes';pintarClientes();return;}
  const k=c.cuenta,peds=c.peds.slice().sort((a,b)=>Date.parse(b.created)-Date.parse(a.created)),prom=k.pedidos?k.gastado/k.pedidos:0;
  abrirHoja(`<p class="mo-kick">Cliente · ${esc(fmtTel(c.tel))}</p>
    <div class="mo-socio n-${k.nivel.k}"><div class="so-top"><span class="so-n">${esc(c.nombre)}</span><span class="so-nivel">${k.nivel.e} ${k.nivel.n}</span></div>
      <div class="so-h"><b>${k.saldo}</b> hojas 🍃</div><small>${k.ganadas} ganadas · ${k.usadas} canjeadas${k.pendientes?' · +'+k.pendientes+' en camino':''}</small>
      <div class="so-bar"><i style="--a:${k.avance.toFixed(3)}"></i></div><small class="so-sig">${k.sig?`Le faltan ${k.falta} 🍃 para ${k.sig.e} ${k.sig.n}`:'Nivel más alto 👑'}</small></div>
    <div class="mo-cuadre" style="margin-top:12px"><div><span>Comprado</span><b>${$c(k.gastado)}</b></div><div><span>Pedidos</span><b>${k.pedidos}</b></div><div><span>Promedio</span><b>${$c(prom)}</b></div><div><span>Kilos</span><b>${k.kilos?kg(k.kilos):'0'} kg</b></div><div><span>Ahorró</span><b>${$c(k.ahorro)}</b></div><div><span>Cliente desde</span><b>${k.desde?esc(new Date(k.desde).toLocaleDateString('es-CR',{month:'short',year:'numeric'})):'—'}</b></div></div>
    <div class="mo-blk"><h4>Consumo · últimos 6 meses</h4>${graficoMeses(k.meses)}</div>
    ${k.top.length?`<div class="mo-blk"><h4>Lo que más lleva</h4><div class="mo-chips" style="flex-wrap:wrap">${k.top.map(t=>`<span class="mo-chip">${t.e} ${esc(t.n)} · ${t.veces}</span>`).join('')}</div></div>`:''}
    <div class="mo-blk"><h4>Pedidos (${peds.length})</h4>${peds.slice(0,40).map(o=>`<button type="button" class="mo-cobrable" data-mo="abrir" data-id="${o.id}"><span>${esc(fdia(o.created))} · <b>${esc(o.ref)}</b> ${{nuevo:'📥',alistando:'🧑‍🌾',listo:'✅',entregado:'🛍️',cancelado:'✖️'}[o.estado]||''}${o.premio?' 🎁':''}</span><span>${$c(N.totalDe(o))}</span></button>`).join('')}</div>
    <div class="mo-btns"><button type="button" class="mo-btn" data-mo="cl-wa">💬 Escribirle</button><button type="button" class="mo-btn" data-mo="clientes">‹ Todos los clientes</button></div>`);
}
function pintarPrograma(){
  const L=M.prog||(M.prog=JSON.parse(JSON.stringify(N.lealtad())));
  abrirHoja(`<p class="mo-kick">Clientes y lealtad · los dos locales</p><div class="mo-h">🍃 Programa de lealtad</div><div class="mo-s">Tus clientes ganan hojas con cada pedido entregado y las canjean por descuentos al pedir en La Feria.</div>
    <div class="mo-blk"><label class="mo-sw">Programa activo<input type="checkbox" id="lgAct" ${L.activa?'checked':''}></label>
      <label class="mo-field">1 hoja 🍃 por cada ₡<input type="number" id="lgPor" min="100" step="100" inputmode="numeric" value="${+L.porHoja}"></label>
      <label class="mo-sw">🔥 Hojas dobles (promo: los pedidos nuevos valen el doble)<input type="checkbox" id="lgDob" ${L.dobles?'checked':''}></label></div>
    <div class="mo-blk"><h4>🎁 Premios para canjear</h4>${L.premios.map((p,i)=>`<div class="mo-prem"><label class="mo-field">Premio<input data-lg="n" data-i="${i}" value="${esc(p.n)}" placeholder="Ej.: ₡2.500 de descuento"></label><label class="mo-field">Hojas<input type="number" inputmode="numeric" data-lg="hojas" data-i="${i}" min="1" value="${+p.hojas||''}"></label><label class="mo-field">Descuento ₡<input type="number" inputmode="numeric" data-lg="valor" data-i="${i}" min="0" step="50" value="${+p.valor||''}"></label><button type="button" class="tg" data-mo="premio-del" data-i="${i}" aria-label="Quitar premio">✕</button></div>`).join('')||'<div class="mo-s">Sin premios todavía.</div>'}
      <button type="button" class="mo-btn w" style="margin-top:10px" data-mo="premio-add">＋ Agregar premio</button></div>
    <div class="mo-blk"><h4>Niveles</h4><div class="mo-niveles">${N.NIVELES.map(n=>`<span class="n-${n.k}"><b>${n.e}</b>${n.n}<small>desde ${n.desde} 🍃</small></span>`).join('')}</div><div class="mo-s" style="margin-top:8px">El nivel sube con las hojas que el cliente gana (canjear no lo baja).</div></div>
    <button type="button" class="mo-btn p w big" style="margin-top:12px" data-mo="lealtad-ok">Guardar programa</button>
    <button type="button" class="mo-btn w" style="margin-top:8px" data-mo="clientes">‹ Volver a clientes</button>`);
  $('moSheet').querySelectorAll('[data-lg]').forEach(i=>i.addEventListener('input',()=>{const p=L.premios[+i.dataset.i],f=i.dataset.lg;p[f]=f==='n'?i.value:+i.value||0;}));
  $('lgAct').addEventListener('change',e=>{L.activa=e.target.checked;});
  $('lgDob').addEventListener('change',e=>{L.dobles=e.target.checked;});
  $('lgPor').addEventListener('input',e=>{L.porHoja=+e.target.value||0;});
}

// ── Ajustes ──
function pintarAjustes(){
  const t=T(),k=localK(),s=(t.sucursales||[]).find(x=>x.k===k)||{k},sp=N.sinpeDe(k);
  abrirHoja(`<p class="mo-kick">Solo este local</p><div class="mo-h">💳 Pagos y horarios · ${esc(sucNom(k))}</div><div class="mo-s">Lo que ve el cliente de ${esc(sucNom(k))} al pagar y al elegir hora.</div>
    <div class="mo-blk"><h4>${k==='angeles'?'📍':'🏠'} ${esc(s.n||'')} · ${esc(s.zona||'')}</h4>
      <label class="mo-sw">Recibe pedidos<input type="checkbox" id="ajAct" ${s.activa!==false?'checked':''}></label>
      <label class="mo-field">📱 WhatsApp que recibe los pedidos<input id="ajWaSuc" inputmode="tel" placeholder="8888-8888" value="${esc(fmtTel(s.whatsapp))}"></label>
      <div class="mo-dos"><label class="mo-field">Abre<input type="time" id="ajAbre" value="${esc(s.abre||'')}"></label><label class="mo-field">Cierra<input type="time" id="ajCierra" value="${esc(s.cierra||'')}"></label></div>
      <button type="button" class="mo-btn w" style="margin-top:10px" data-mo="tienda-gps" data-k="${k}">📍 ${s.lat?'Ubicación guardada · actualizar':'Guardar ubicación de este local (estando aquí)'}</button></div>
    <div class="mo-blk"><h4>📲 SINPE Móvil de ${esc(sucNom(k))}</h4><div class="mo-dos"><label class="mo-field">Número<input id="ajSinpe" inputmode="tel" placeholder="8888-8888" value="${esc(fmtTel(sp.numero))}"></label><label class="mo-field">A nombre de<input id="ajSinpeN" placeholder="Ej.: ARAMO S.A." value="${esc(sp.nombre||'')}"></label></div></div>
    <details class="mo-blk mo-comun"><summary>Igual para los dos locales</summary>
      <label class="mo-field">Nombre de la tienda<input id="ajNombre" value="${esc(t.nombre)}"></label>
      <label class="mo-field">Minutos para alistar un pedido<input id="ajMin" type="number" min="10" max="240" value="${+t.alistadoMin||40}"></label>
      <label class="mo-sw">Ofrecer envío a domicilio con Uber<input type="checkbox" id="ajEnvio" ${t.envio!==false?'checked':''}></label>
      <label class="mo-field">🔗 Link de pago con tarjeta (opcional)<input id="ajLink" type="url" placeholder="https://…" value="${esc(t.linkTarjeta||'')}"></label>
      <div class="mo-s">Sin link, la tarjeta se cobra con datáfono al recoger.</div></details>
    <div class="mo-blk"><h4>🛵 Zona, tarifas y capacidad</h4>
      <label class="mo-field">Zona que cubrís<input id="ajZona" value="${esc(t.envioConfig?.zona||'')}" placeholder="Moravia y alrededores"></label>
      <div class="mo-dos"><label class="mo-field">Radio máximo (km)<input id="ajRadio" type="number" min="0" step="0.5" value="${+t.envioConfig?.radioKm||8}"></label><label class="mo-field">Tarifa base ₡<input id="ajTarifa" type="number" min="0" step="100" value="${+t.envioConfig?.tarifaBase||0}"></label></div>
      <div class="mo-dos"><label class="mo-field">Por km ₡<input id="ajKm" type="number" min="0" step="50" value="${+t.envioConfig?.tarifaKm||0}"></label><label class="mo-field">Pedido mínimo ₡<input id="ajMinimo" type="number" min="0" step="100" value="${+t.envioConfig?.minimo||0}"></label></div>
      <label class="mo-field">Máximo de pedidos por hora<input id="ajCapacidad" type="number" min="0" step="1" value="${+t.capacidadPorHora||20}"></label>
    </div>
    <div class="mo-blk"><h4>📣 Información pública</h4>
      <div class="mo-blk"><h4>📅 Días especiales</h4><label class="mo-field">Feriados (YYYY-MM-DD, separados por coma)<input id="ajFeriados" value="${esc((t.feriados||[]).join(', '))}" placeholder="2026-12-25, 2026-01-01"></label><label class="mo-field">Horario especial<textarea id="ajEspecial" rows="3" placeholder="YYYY-MM-DD | 07:00-15:00\nYYYY-MM-DD | cerrado">${esc(Object.entries(t.horariosEspeciales||{}).map(([d,x])=>`${d} | ${x.cerrada?'cerrado':`${x.abre||''}-${x.cierra||''}`}`).join('\n'))}</textarea></label></div>
      <label class="mo-field">Privacidad<textarea id="ajPriv" rows="3">${esc(t.privacidad||'')}</textarea></label>
      <label class="mo-field">Condiciones<textarea id="ajCond" rows="3">${esc(t.condiciones||'')}</textarea></label>
      <div class="mo-dos"><label class="mo-field">Título al compartir<input id="ajShareTitle" value="${esc(t.shareTitle||'')}" placeholder="Pedí en ARAMO"></label><label class="mo-field">Descripción al compartir<input id="ajShareDesc" value="${esc(t.shareDescription||'')}"></label></div>
       <label class="mo-field">Imagen para compartir (URL)<input id="ajShareImage" type="url" value="${esc(t.shareImage||'')}" placeholder="https://…"></label>
       <label class="mo-field">Clave pública VAPID para avisos cerrados<input id="ajPushKey" value="${esc(t.pushPublicKey||'')}" placeholder="BEl…"><small>Solo la clave pública. El servidor de avisos usa la privada.</small></label>
      <label class="mo-field">Preguntas frecuentes<textarea id="ajFaq" rows="4" placeholder="Una por línea: pregunta | respuesta">${esc((t.faq||[]).map(x=>`${x.q} | ${x.a}`).join('\n'))}</textarea></label>
    </div>
    <button type="button" class="mo-btn p w" style="margin-top:12px" data-mo="aj-ok">Guardar</button>`);
}

function pintarPromos(){
  const L=T().promos||[];
  abrirHoja(`<p class="mo-kick">Promociones y compartir</p><div class="mo-h">✨ Ofertas de la semana</div><div class="mo-s">Se muestran arriba del catálogo. También podés elegir un producto para que el botón lo abra directo.</div>
    <div class="mo-blk"><label class="mo-field">Título<input id="prT" placeholder="Ej.: Canasta de la semana"></label><label class="mo-field">Texto corto<input id="prD" placeholder="Ej.: 10% en frutas"></label><label class="mo-field">Producto (clave opcional)<input id="prK" placeholder="Ej.: frutas"></label><label class="mo-field">Válida hasta<input id="prH" type="date"></label><button type="button" class="mo-btn p w" data-mo="promo-add">Agregar oferta</button></div>
    <div class="mo-blk">${L.length?L.map((p,i)=>`<div class="mo-vi"><span class="e">✨</span><span class="t"><strong>${esc(p.titulo||p.nombre||'Oferta')}</strong><small>${esc(p.texto||'')}${p.hasta?' · hasta '+esc(p.hasta):''}</small></span><button type="button" class="tg" data-mo="promo-del" data-i="${i}">✕</button></div>`).join(''):'<div class="mo-s">Todavía no hay ofertas.</div>'}</div>`);
}
function pintarPersonal(){
  const a=N.authEstado?.()||{};
  abrirHoja(`<p class="mo-kick">Acceso protegido</p><div class="mo-h">🔐 Cuenta de personal</div><div class="mo-s">La contraseña local protege este equipo; la cuenta de personal protege la nube y los datos de todos los clientes.</div>${a.personal?`<div class="mo-blk"><p>Sesión activa ✅</p><p class="mo-s">Correo: <code>${esc(a.email||a.user?.email||'')}</code></p><p class="mo-s">UUID para autorizar: <code>${esc(a.user?.id||'')}</code></p><button type="button" class="mo-btn w" data-mo="personal-salir">Cerrar sesión</button></div>`:`<div class="mo-blk"><label class="mo-field">Correo del personal<input id="stEmail" type="email" autocomplete="email" value="${esc(M.staffEmail)}" placeholder="taller@correo.com"></label><label class="mo-field">Contraseña<input id="stPass" type="password" autocomplete="current-password" value="${esc(M.staffPass)}" placeholder="Mínimo 8 caracteres"></label><div class="mo-dos"><button type="button" class="mo-btn p w" data-mo="personal-entrar">Iniciar sesión</button><button type="button" class="mo-btn w" data-mo="personal-crear">Crear cuenta</button></div></div><div class="mo-s">Después del primer acceso, agregá el UUID a <code>public.aramo_staff</code> en Supabase para autorizarlo.</div>`}`);
  $('stEmail')?.addEventListener('input',e=>{M.staffEmail=e.target.value;});$('stPass')?.addEventListener('input',e=>{M.staffPass=e.target.value;});
}
async function pintarAnalitica(){
  abrirHoja('<p class="mo-kick">Métricas de La Feria</p><div class="mo-h">📊 Qué está pasando</div><div class="mo-s">Busquedas sin resultado, productos vistos, canastas abandonadas y errores registrados.</div><div class="mo-s">Cargando…</div>');
  const ev=await N.metricas();
  const count=(tipo)=>ev.filter(x=>x.tipo===tipo).length;
  const noEncontrado=ev.filter(x=>x.tipo==='search_empty').slice(0,12),errores=ev.filter(x=>x.tipo==='client_error').slice(0,12),vistas=ev.filter(x=>x.tipo==='product_view').slice(0,12);
  const referidos=ev.filter(x=>x.tipo==='referral_order').slice(0,12),refVisitas=count('referral_visit');
  abrirHoja(`<p class="mo-kick">Métricas de La Feria · últimos eventos</p><div class="mo-h">📊 Qué está pasando</div><div class="mo-cuadre"><div><span>Busquedas sin resultado</span><b>${count('search_empty')}</b></div><div><span>Canastas abandonadas</span><b>${count('cart_abandon')}</b></div><div><span>Productos vistos</span><b>${count('product_view')}</b></div><div><span>Errores</span><b>${count('client_error')}</b></div><div><span>Invitaciones abiertas</span><b>${refVisitas}</b></div><div><span>Referidos con pedido</span><b>${referidos.length}</b></div></div><div class="mo-blk"><h4>🤝 Referidos que compraron</h4>${referidos.length?referidos.map(x=>`<div class="mo-s">${esc(x.data?.ref||'Código compartido')} · ${x.data?.total?$c(x.data.total):'pedido'} · ${esc(fdia(x.created_at))}</div>`).join(''):'<div class="mo-s">Todavía no hay referidos convertidos.</div>'}</div><div class="mo-blk"><h4>🔎 No encontraron</h4>${noEncontrado.length?noEncontrado.map(x=>`<div class="mo-s">${esc(x.data?.q||'—')} · ${esc(fdia(x.created_at))}</div>`).join(''):'<div class="mo-s">Todavía no hay datos.</div>'}</div><div class="mo-blk"><h4>👀 Más vistos recientemente</h4>${vistas.length?vistas.map(x=>`<div class="mo-s">${esc(x.data?.nombre||x.data?.k||'Producto')} · ${esc(fdia(x.created_at))}</div>`).join(''):'<div class="mo-s">Todavía no hay datos.</div>'}</div><div class="mo-blk"><h4>🧯 Errores recientes</h4>${errores.length?errores.map(x=>`<div class="mo-s">${esc(x.data?.message||'Error')} · ${esc(fdia(x.created_at))}</div>`).join(''):'<div class="mo-s">No hay errores registrados.</div>'}</div>`);
}

// ── Ajustes (rediseño, Fase 2): uno solo, para el ⚙ del Inicio y para "Pagos y horarios" del Mostrador ──
// Lista agrupada: ESTE EQUIPO y LA TIENDA. Cada fila dice cómo está y abre su formulario con Guardar.
// OJO: 'aj-ok' guarda SOLO los campos que están en pantalla (un campo ausente nunca se guarda vacío).
const ajZona=k=>suc(k)?.zona||(k==='angeles'?'Los Ángeles':'Moravia');
const ajCampo=(id,et,val,o={})=>`<label class="ui-campo"><span class="ui-campo-et">${et}</span>${o.area?`<textarea class="ui-campo-in aj6-area" id="${id}" rows="${o.area}"${o.ph?` placeholder="${esc(o.ph)}"`:''}>${esc(val??'')}</textarea>`:`<input class="ui-campo-in" id="${id}" type="${o.tipo||'text'}"${o.modo?` inputmode="${o.modo}"`:''}${o.min!=null?` min="${o.min}"`:''}${o.paso?` step="${o.paso}"`:''} value="${esc(val??'')}"${o.ph?` placeholder="${esc(o.ph)}"`:''} autocomplete="off">`}${o.ayuda?`<span class="ui-campo-ayuda">${o.ayuda}</span>`:''}</label>`;
const ajSw=(id,et,on,sub,extra='')=>`<label class="aj6-sw"><span>${et}${sub?`<small>${sub}</small>`:''}</span><span class="ui-interruptor"><input type="checkbox" id="${id}"${on?' checked':''}${extra}><span></span></span></label>`;
const ajTema=()=>{const v=LS.get('aramo_theme',null)||localStorage.getItem('aramo_theme')||'light';return['light','dark','auto'].includes(v)?v:'light';};
function pintarAjustesApp(){
  M.vista='ajustes-app';
  const a=acceso(),perm=N.avisos.permiso(),t=T(),k=localK(),s=(t.sucursales||[]).find(x=>x.k===k)||{k},sp=N.sinpeDe(k);
  const fila=(sec,ico,tit,res,sub)=>`<button type="button" class="ui-lista-fila" data-mo="aj-sec" data-sec="${sec}">${ICO(ico,22)}<span>${tit}${sub?`<small>${sub}</small>`:''}</span>${res?`<em>${esc(res)}</em>`:''}${ICO('siguiente',20)}</button>`;
  const avisos=!N.avisos.soportado()?'Solo sonido':perm==='granted'?(R.sonido?'Activos':'Sin sonido'):perm==='denied'?'Bloqueados':'Apagados';
  const ver=document.querySelector('.app-version b')?.textContent||'';
  abrirHoja(`<div class="aj6"><h2 class="aj6-tit">Ajustes</h2>
    <h3 class="ui-grupo-tit">Este equipo</h3>
    <div class="ui-lista">
      ${fila('tienda','tienda','Tienda de este equipo',ajZona(k))}
      ${fila('tema','sol','Tema',{light:'Claro',dark:'Oscuro',auto:'Automático'}[ajTema()])}
      ${fila('avisos','aviso','Avisos de pedidos',avisos)}
      <label class="ui-lista-fila aj6-fila-sw">${ICO('pantalla',22)}<span>Pantalla siempre encendida<small>Para la tablet del mostrador</small></span><span class="ui-interruptor"><input type="checkbox" id="rPan"${R.pantalla?' checked':''}><span></span></span></label>
      ${fila('clave','candado','Contraseña de entrada',a.activo?'Activa':'Apagada')}
      ${fila('actualizar','actualizar','Actualizar la app','','No borra pedidos ni ajustes')}
    </div>
    <h3 class="ui-grupo-tit">La tienda · ${esc(ajZona(k))}</h3>
    <div class="ui-lista">
      ${fila('contacto','mensaje','Contacto y WhatsApp',s.whatsapp?fmtTel(s.whatsapp):'Sin número')}
      ${fila('horario','reloj','Horario y feriados',s.abre&&s.cierra?`${s.abre}–${s.cierra}`:'Sin horario')}
      ${fila('pagos','sinpe','Pagos y SINPE',sp.numero?fmtTel(sp.numero):'Sin SINPE')}
      ${fila('envio','camion','Envío a domicilio',t.envio===false?'Apagado':t.envioConfig?.tarifaBase?$c(t.envioConfig.tarifaBase):'Activo')}
      ${fila('programa','hoja','Programa de hojas',N.lealtad().activa?'Activo':'Apagado')}
      ${fila('compartir','qr','Compartir La Feria')}
      ${fila('legales','libro','Textos legales')}
      ${fila('avanzado','ajustes','Avanzado')}
    </div>
    ${ver?`<p class="aj6-ver">ARAMO · versión ${esc(ver)} · se actualiza sola</p>`:''}</div>`);
  $('rPan')?.addEventListener('change',e=>{R.pantalla=e.target.checked;guardarR();pantallaEncendida();AramoUI.aviso(R.pantalla?'La pantalla se queda encendida':'Pantalla normal',{icono:false});});
}
// Cada sección de Ajustes en su propia hoja, con "‹ Ajustes" arriba.
function leerSd(){const L=[];for(let i=0;$('ajSdN'+i);i++)L.push({nombre:$('ajSdN'+i).value,numero:$('ajSdT'+i)?.value||''});return L;}
function pintarAjSec(sec){
  const sdL=M.sdTmp||N.sinpeDestinosDe(localK());M.sdTmp=null;
  const t=T(),k=localK(),s=(t.sucursales||[]).find(x=>x.k===k)||{k},sp=N.sinpeDe(k),a=acceso(),perm=N.avisos.permiso(),ec=t.envioConfig||{};
  const guardar='<button type="button" class="ui-btn ui-btn--primario ui-btn--l aj6-guardar" data-mo="aj-ok">Guardar</button>';
  const S={
    tema:['Tema',`<div class="ui-opciones">${[['light','sol','Claro','Fondo claro, como el papel'],['dark','luna','Oscuro','Fondo oscuro, cansa menos de noche'],['auto','pantalla','Automático','Sigue al teléfono o la compu']].map(([v,i,n,d])=>`<button type="button" class="ui-opcion${ajTema()===v?' on':''}" data-mo="aj-tema-usar" data-v="${v}" aria-pressed="${ajTema()===v}">${ICO(i,22)}<span>${n}<small>${d}</small></span>${ajTema()===v?ICO('ok',20):''}</button>`).join('')}</div>`],
    avisos:['Avisos de pedidos',`<p class="aj6-txt">${!N.avisos.soportado()?'Este navegador no permite notificaciones: queda el sonido y el WhatsApp de la tienda.':perm==='granted'?'Activados: te llegan estés en Inventario, La Feria o el POS.':perm==='denied'?'Están bloqueados: permitilos en la configuración del sitio del navegador.':'Activalos para que te avise en cualquier pantalla.'}</p>
      ${N.avisos.soportado()&&perm!=='denied'?(perm==='granted'?`<button type="button" class="ui-btn ui-btn--secundario ui-btn--l" data-mo="probar-aviso">${ICO('probar',20)}Probar cómo suena</button>`:`<button type="button" class="ui-btn ui-btn--primario ui-btn--l" data-mo="avisos-on">${ICO('aviso',20)}Activar los avisos</button>`):''}
      ${ajSw('rSon','Sonido que se repite hasta abrir el pedido',R.sonido,'Solo suenan los pedidos nuevos')}`],
    clave:['Contraseña de entrada',`${ajSw('acSw','Pedir contraseña al abrir la app',a.activo,a.activo?'Activa: al abrir se pide la contraseña de la tienda.':'Apagada: se entra directo. La de fábrica es 12345.',' data-mo="acceso-sw"')}
      <h3 class="ui-grupo-tit">Cambiar la contraseña de ${esc(ajZona(k))}</h3>
      ${ajCampo('acActual','Contraseña actual','',{tipo:'password',modo:'numeric',ph:'12345'})}
      <div class="aj6-dos">${ajCampo('acNueva','Nueva (4 a 8 números)','',{tipo:'password',modo:'numeric'})}${ajCampo('acRepite','Repetila','',{tipo:'password',modo:'numeric'})}</div>
      <button type="button" class="ui-btn ui-btn--secundario ui-btn--l" data-mo="clave-ok">Cambiar contraseña</button>`],
    contacto:['Contacto y WhatsApp',`${ajSw('ajAct','Recibe pedidos',s.activa!==false,'Si lo apagás, los clientes no pueden pedirle a esta tienda.')}
      ${ajCampo('ajWaSuc','WhatsApp que recibe los pedidos',fmtTel(s.whatsapp),{tipo:'tel',modo:'tel',ph:'8888-8888'})}
      <button type="button" class="ui-btn ui-btn--secundario ui-btn--l" data-mo="tienda-gps" data-k="${k}">${ICO('tienda',20)}${s.lat?'Ubicación guardada · actualizar':'Guardar la ubicación de la tienda (estando aquí)'}</button>${guardar}`],
    horario:['Horario y feriados',`<div class="aj6-dos">${ajCampo('ajAbre','Abre',s.abre,{tipo:'time'})}${ajCampo('ajCierra','Cierra',s.cierra,{tipo:'time'})}</div>
      <div class="aj6-dos">${ajCampo('ajMin','Minutos para alistar un pedido',+t.alistadoMin||40,{tipo:'number',modo:'numeric',min:10})}${ajCampo('ajCapacidad','Pedidos por hora (máximo)',+t.capacidadPorHora||20,{tipo:'number',modo:'numeric',min:0})}</div>
      ${ajCampo('ajFeriados','Feriados',(t.feriados||[]).join(', '),{ph:'2026-12-25, 2027-01-01',ayuda:'Fechas así: año-mes-día, separadas por coma.'})}
      ${ajCampo('ajEspecial','Horario especial',Object.entries(t.horariosEspeciales||{}).map(([d,x])=>`${d} | ${x.cerrada?'cerrado':`${x.abre||''}-${x.cierra||''}`}`).join('\n'),{area:3,ph:'2026-12-24 | 07:00-15:00\n2026-12-25 | cerrado',ayuda:'Un día por renglón: fecha | hora-hora, o fecha | cerrado.'})}${guardar}`],
    pagos:['Pagos y SINPE',`<div class="aj6-dos">${ajCampo('ajSinpe','SINPE Móvil · número',fmtTel(sp.numero),{tipo:'tel',modo:'tel',ph:'8888-8888'})}${ajCampo('ajSinpeN','A nombre de',sp.nombre,{ph:'Ej.: ARAMO S.A.'})}</div>
      <h3 class="ui-grupo-tit">¿A quién se le hace el SINPE?</h3>
      <p class="aj6-txt">Al cobrar con SINPE salen estos nombres para tocar. El POS usa la misma lista${localK()==='angeles'?' y el Control de Los Ángeles los suma por nombre':''}.</p>
      <div id="ajSdLista">${sdL.map((d,i)=>`<div class="aj6-sd"><input class="ui-campo-in" id="ajSdN${i}" value="${esc(d.nombre)}" placeholder="Nombre (Roger, Joseph…)" maxlength="30" aria-label="Nombre"><input class="ui-campo-in" id="ajSdT${i}" type="tel" inputmode="tel" value="${esc(fmtTel(d.numero))}" placeholder="Número" aria-label="Número"><button type="button" class="ui-btn ui-btn--secundario aj6-sd-x" data-mo="sd-del" data-i="${i}" aria-label="Quitar a ${esc(d.nombre)}">✕</button></div>`).join('')}</div>
      <button type="button" class="ui-btn ui-btn--secundario ui-btn--l" data-mo="sd-add">+ Agregar a alguien</button>
      ${ajCampo('ajLink','Link de pago con tarjeta (opcional)',t.linkTarjeta,{tipo:'url',ph:'https://…',ayuda:'Preparado para más adelante: por ahora La Feria cobra solo por SINPE Móvil. Vale para las dos tiendas.'})}${guardar}`],
    envio:['Envío a domicilio',`${ajSw('ajEnvio','Ofrecer envío a domicilio',t.envio!==false,'Vale para las dos tiendas.')}
      ${ajCampo('ajZona','Zona que cubrís',ec.zona,{ph:'Moravia y alrededores'})}
      <div class="aj6-dos">${ajCampo('ajRadio','Distancia máxima (km)',+ec.radioKm||8,{tipo:'number',modo:'decimal',min:0,paso:'0.5'})}${ajCampo('ajTarifa','Tarifa base ₡',+ec.tarifaBase||0,{tipo:'number',modo:'numeric',min:0,paso:100})}</div>
      <div class="aj6-dos">${ajCampo('ajKm','Por cada km ₡',+ec.tarifaKm||0,{tipo:'number',modo:'numeric',min:0,paso:50})}${ajCampo('ajMinimo','Pedido mínimo ₡',+ec.minimo||0,{tipo:'number',modo:'numeric',min:0,paso:100})}</div>
      <div class="aj6-dos">${ajCampo('ajUberMin','Uber mínimo ₡',+ec.uberMinimo||0,{tipo:'number',modo:'numeric',min:0,paso:100})}${ajCampo('ajFactor','Calle vs. línea recta (×)',+ec.factorCalle||1.35,{tipo:'number',modo:'decimal',min:1,paso:'0.05'})}</div>
      <h3 class="ui-grupo-tit">Quién paga el envío</h3>
      <div class="aj6-dos">${ajCampo('ajRepMin','Pedido desde ₡',+ec.repartoMin||0,{tipo:'number',modo:'numeric',min:0,paso:500,ayuda:'Menos que esto: el cliente paga todo el Uber.'})}${ajCampo('ajRepPct','El cliente paga %',ec.repartoPct==null?50:+ec.repartoPct,{tipo:'number',modo:'numeric',min:0,paso:5,ayuda:'Desde ese monto. 50 = mitad y mitad.'})}</div>
      ${(ap=>`<p class="aj6-txt">${ap.n?`📈 Aprendido de ${ap.n} ${ap.n===1?'Uber real':'Ubers reales'}: ₡${Math.round(ap.tk)} por km (${ap.real!=null?'el real da ₡'+Math.round(ap.real):''}). Cada vez que anotás cuánto costó un Uber, el estimado se afina.`:'📈 Todavía no hay Ubers reales anotados. Cuando anotés cuánto costó cada Uber, el estimado aprende solo.'}</p>`)(N.tarifaKmAprendida(N.envioCfg()))}
      <h3 class="ui-grupo-tit">Ubicación de ${esc(ajZona(k))}</h3>
      <div class="aj6-dos">${ajCampo('ajLat','Latitud',s.lat??'',{tipo:'number',modo:'decimal',paso:'any'})}${ajCampo('ajLng','Longitud',s.lng??'',{tipo:'number',modo:'decimal',paso:'any'})}</div>
      <p class="aj6-txt">${N.ubiSuc(s).exacta?'Ubicación exacta guardada.':'Ahora son coordenadas aproximadas: sirven para el estimado, pero para que Uber recoja justo en la tienda tocá el botón estando ahí.'}</p>
      <button type="button" class="ui-btn ui-btn--secundario ui-btn--l" data-mo="tienda-gps" data-k="${k}">${ICO('tienda',20)}${N.ubiSuc(s).exacta?'Actualizar la ubicación (estando aquí)':'Guardar la ubicación de la tienda (estando aquí)'}</button>${guardar}`],
    legales:['Textos legales',`${ajCampo('ajPriv','Privacidad',t.privacidad,{area:4})}${ajCampo('ajCond','Condiciones',t.condiciones,{area:4})}
      ${ajCampo('ajFaq','Preguntas frecuentes',(t.faq||[]).map(x=>`${x.q} | ${x.a}`).join('\n'),{area:4,ayuda:'Una por renglón: pregunta | respuesta.'})}${guardar}`],
    avanzado:['Avanzado',`${ajCampo('ajNombre','Nombre de la tienda',t.nombre)}
      <div class="aj6-dos">${ajCampo('ajShareTitle','Título al compartir',t.shareTitle,{ph:'Pedí en ARAMO'})}${ajCampo('ajShareDesc','Descripción al compartir',t.shareDescription)}</div>
      ${ajCampo('ajShareImage','Imagen para compartir (dirección)',t.shareImage,{tipo:'url',ph:'https://…'})}
      ${ajCampo('ajPushKey','Clave pública VAPID (avisos con la app cerrada)',t.pushPublicKey,{ph:'BEl…',ayuda:'Solo la clave pública. El servidor de avisos usa la privada.'})}${guardar}`],
  };
  const x=S[sec];if(!x)return pintarAjustesApp();
  M.vista='aj-'+sec;
  abrirHoja(`<div class="aj6"><button type="button" class="aj6-volver" data-mo="ajustes-app">${ICO('atras',20)}Ajustes</button><h2 class="aj6-tit">${x[0]}</h2><div class="aj6-campos">${x[1]}</div></div>`);
  $('rSon')?.addEventListener('change',e=>{R.sonido=e.target.checked;guardarR();pintarPuerta();});
}

// ── Receptor ──
function pintarReceptor(){
  const perm=N.avisos.permiso();
  abrirHoja(`<p class="mo-kick">Este equipo</p><div class="mo-h">📡 Receptor de pedidos</div><div class="mo-s">Elegí qué tienda atiende este teléfono o computadora. Solo te suenan los pedidos de esa tienda.</div>
    <div class="mo-metodos" style="margin-top:12px">${[['moravia','🏠',sucNom('moravia')],['angeles','📍',sucNom('angeles')],['todas','🧺','Ambas']].map(([k,e,n])=>`<button type="button" class="${R.suc===k?'on':''}" data-mo="r-suc" data-k="${k}"><b>${e}</b>${esc(n)}</button>`).join('')}</div>
    <div class="mo-blk"><h4>Avisos</h4>
      <div class="mo-row"><span style="flex:1"><b>🔔 Notificación del teléfono</b><br><small style="color:var(--m)">${!N.avisos.soportado()?'Este navegador no las permite; queda el sonido y WhatsApp.':perm==='granted'?'Activadas ✓':perm==='denied'?'Bloqueadas: permitilas en la configuración del sitio.':'Te llega una notificación con cada pedido nuevo.'}</small></span>${perm==='granted'?'<button type="button" class="mo-btn" data-mo="probar-aviso">Probar</button>':'<button type="button" class="mo-btn p" data-mo="avisos-on">Activar</button>'}</div>
      <label class="mo-sw">🔊 Sonido de pedido nuevo (se repite hasta abrirlo)<input type="checkbox" id="rSon" ${R.sonido?'checked':''}></label>
      <label class="mo-sw">💡 Mantener la pantalla encendida (tablet de mostrador)<input type="checkbox" id="rPan" ${R.pantalla?'checked':''}></label></div>
    <div class="mo-s">💬 Además, cada pedido le llega al WhatsApp de su tienda (Pagos y horarios → WhatsApp de cada tienda): así suena aunque la app esté cerrada.</div>`);
  $('rSon').addEventListener('change',e=>{R.sonido=e.target.checked;guardarR();});
  $('rPan').addEventListener('change',e=>{R.pantalla=e.target.checked;guardarR();pantallaEncendida();toast(R.pantalla?'💡 La pantalla se queda encendida':'Pantalla normal');});
}
function linkTaller(){return new URL('canasta.html',location.href).href.split('#')[0].split('?')[0];}
function pintarCompartir(){
  const url=linkTaller(),on=N.modo()==='nube';
  let qr='';
  if(window.qrcode){const q=window.qrcode(0,'M');q.addData(url);q.make();qr=q.createSvgTag({cellSize:4,margin:0,scalable:true});}
  abrirHoja(`<div class="mo-h">📣 Compartir La Feria</div><div class="mo-s">Pegá este QR en caja o mandá el link: tus clientes arman su pedido en La Feria y lo recogen listo o les llega a casa.</div>
    ${qr?`<div class="mo-qr">${qr}</div>`:''}<code class="mo-code">${esc(url)}</code>
    <div class="mo-btns"><button type="button" class="mo-btn" data-mo="copiar" data-v="${esc(url)}">📋 Copiar link</button><button type="button" class="mo-btn p" data-mo="wa-share">💬 Mandar por WhatsApp</button></div>
    <a class="mo-btn w" style="margin-top:8px" href="canasta.html">👀 Verlo como cliente</a>
    <div class="mo-blk" style="margin-top:16px"><h4>${on?'🟢 Pedidos en vivo':'🟠 Pedidos por WhatsApp'}</h4>
      ${on?'<div class="mo-s">Cada pedido nuevo aparece solo en los receptores de su tienda.</div>'
      :`<div class="mo-s">Ahora mismo ${esc(N.motivo())}. Todo funciona igual: el cliente manda el pedido al WhatsApp de su tienda con un link; lo tocás y entra aquí.</div>
        <div class="mo-s" style="margin-top:8px"><b>Para que lleguen solos a todos los receptores:</b> entrá a supabase.com, reactivá el proyecto de ARAMO y pegá en <i>SQL Editor</i> el archivo <b>supabase-encargos.sql</b>. La app se conecta sola en menos de un minuto.</div>`}</div>`);
}

// ── Pedido de prueba ──
function pedidoPrueba(){
  const nombres=['María Fernanda','Carlos','Ana Lucía','Don Rafa','Sofía','Luis Diego'];
  const cat=N.catalogo().filter(p=>!p.oculto&&!p.agotado);
  const pick=[...cat].sort(()=>Math.random()-.5).slice(0,5+Math.floor(Math.random()*4));
  const s=(T().sucursales||[]).filter(x=>x.activa!==false);
  const suc_=R.suc!=='todas'?R.suc:M.suc!=='todas'?M.suc:(s[Math.floor(Math.random()*s.length)]||s[0]).k;
  const met=['sinpe','efectivo','tarjeta'][Math.floor(Math.random()*3)];
  const items=pick.map(p=>({k:p.k,n:p.n,e:p.e,u:p.u,q:p.u==='kg'?[.5,1,1.5,2][Math.floor(Math.random()*4)]:1+Math.floor(Math.random()*5),p:p.p,mad:p.mad&&Math.random()<.4?'hoy':'',nota:''}));
  N.crear({id:N.nuevoId(),ref:N.nuevoRef(),pin:N.nuevoPin(),estado:'nuevo',sucursal:suc_,prueba:true,
    cliente:{nombre:nombres[Math.floor(Math.random()*nombres.length)]+' (prueba)',tel:'8'+String(Math.floor(Math.random()*1e7)).padStart(7,'0')},
    retiro:{modo:'asap',at:new Date(Date.now()+(T().alistadoMin||40)*6e4).toISOString(),carro:Math.random()<.3,placa:''},
    pago:{metodo:met,conCuanto:met==='efectivo'?20000:0,estado:'pendiente'},sust:['avisar','similar','quitar'][Math.floor(Math.random()*3)],nota:'',items,totalEst:0});
  M.tab='nuevo';pintarMostrador();
}

// ══════════════ Acciones ══════════════
const ACT={
  surtido(el){entrar('surtido',el);},canasta(el){entrar('canasta',el);},mostrador(el){entrar('mostrador',el);},pos(el){entrar('pos',el);},'pos-compu'(el){entrar('pos-compu',el);},'pos-celular'(el){entrar('pos-celular',el);},
  puerta(){if(SOLO_PEDIDOS){cerrarSolo();return;}volverAlMenu();},
  // Control: la app de cierres del dueño, por tienda (control.html)
  control(){buzz(12);location.href='control.html?suc=angeles';}, // por ahora el Control es solo de Los Ángeles (LASR)
  portada(){M.vista='portada';abrirHoja(window.AramoPortadas.selectorHtml());},
  'portada-usar'(el){window.AramoPortadas.elegir(+el.dataset.v);cerrarHoja();_portadaMontada=0;const r=$('puIn');if(r)r.dataset.v='';pintarPuerta();$('puerta').scrollTop=0;toast('🎨 Portada '+el.dataset.v+' · '+(window.AramoPortadas.LISTA.find(x=>x.n===+el.dataset.v)?.t||''));},
  compartir(){M.vista='compartir';pintarCompartir();},
  local(){pedirLocal(()=>LOCAL==='todas'?abrirSurtidoAmbos():abrirPuerta(),()=>abrirPuerta());},
  'reiniciar-app'(el){reiniciarApp(el);},
  'avisos-cerrar'(){LS.set('aramo_avisos_franja',hoyTxt());pintarPuerta();},
  'ajustes-app'(){M.vista='ajustes-app';pintarAjustesApp();},
  mas(el){const m=$('moMas');m.hidden=!m.hidden;el.setAttribute('aria-expanded',String(!m.hidden));el.querySelector('b').textContent=m.hidden?'⋯':'✕';},
  'acceso-sw'(){
    const a=acceso(),otra=()=>repintar(()=>pintarAjSec('clave'));
    if(a.activo){
      AramoUI.pedir({titulo:'Apagar la contraseña',texto:'Para apagarla, escribí la contraseña de '+localNom(localK())+'.',etiqueta:'Contraseña',tipo:'decimal',si:'Apagar'}).then(c=>{
        if(c===null){otra();return;}
        claveOk(localK(),c).then(ok=>{if(!ok){toast('Esa contraseña no es');otra();return;}N.guardarTienda({acceso:{...a,activo:false}});toast('🔓 Entrada directa, sin contraseña');otra();});
      });
    }else{N.guardarTienda({acceso:{...a,activo:true}});toast('🔒 Cada local pide su contraseña al abrir');otra();}
  },
  'clave-ok'(){
    const k=localK(),act=$('acActual').value,n1=$('acNueva').value,n2=$('acRepite').value;
    if(!/^\d{4,8}$/.test(n1)){toast('La nueva contraseña: de 4 a 8 números');return;}
    if(n1!==n2){toast('Las contraseñas nuevas no coinciden');return;}
    claveOk(k,act).then(async ok=>{
      if(!ok){toast('La contraseña actual no es');return;}
      const a=acceso();N.guardarTienda({acceso:{...a,claves:{...(a.claves||{}),[k]:await huella(n1)}}});
      toast('🔒 Contraseña de '+localNom(k)+' cambiada');repintar(()=>pintarAjSec('clave'));
    });
  },
  pesar(){M.vista='pesar';M.pk=pkInicial(N.get(M.abierto));pintarEncargo();},
  'pk-fila'(el){M.pk={i:+el.dataset.i,buf:''};repintar(pintarEncargo);},
  pk(el){teclaPeso(el.dataset.k);},
  'pk-sig'(){confirmarPeso();},
  'pk-igual'(){const it=N.get(M.abierto).items[M.pk.i];M.pk.buf=String(it.q);confirmarPeso();},
  'pk-nohay'(){confirmarPeso(0);},
  'pk-listo'(){terminarPesaje();},
  'pk-volver'(){M.vista='encargo';pintarEncargo();},
  tab(el){M.tab=M.tab===el.dataset.k?null:el.dataset.k;pintarMostrador();},
  // El botón grande de «Lo que urge»: hace el siguiente paso de ESE pedido (las mismas acciones de la hoja)
  urge(el){
    const id=el.dataset.id,a=el.dataset.acc;if(!N.get(id))return;
    M.abierto=id;M.vista='encargo';M.pin='';M.masD=false;
    if(sinAbrir.delete(id))guardarSinAbrir();
    if(a==='abrir'||!ACT[a]){abrirEncargo(id);return;}
    ACT[a](el);
  },
  // 🔄 Reiniciar (a la vista, por tienda, como el del Inventario): borra los pedidos de ESA tienda y su Caja de hoy, en todos los equipos.
  // Precios, recetas y ajustes no se tocan. Este equipo guarda una copia por si hace falta. (Ya no hay «Deshacer reinicio».)
  async reiniciar(){
    const act=(T().sucursales||[]).filter(x=>x.activa!==false);
    const k=await AramoUI.elegir({titulo:'¿Cuál tienda reiniciás?',texto:'Se borran los pedidos y la Caja de hoy de esa tienda, en todos los equipos. La otra tienda queda igual.',
      opciones:act.map(x=>{const n=N.lista().filter(o=>o.sucursal===x.k).length;return{v:x.k,t:'Reiniciar '+x.zona,sub:n+' pedido'+(n===1?'':'s')+' · '+x.n};})});
    if(!k)return;
    const L=N.lista().filter(o=>o.sucursal===k),zona=suc(k)?.zona||k;
    const ok=await AramoUI.confirmar({titulo:'¿Reiniciar '+zona+'?',texto:`Se borra TODO lo de ${zona}: ${L.length} pedido${L.length===1?'':'s'}, su Caja de hoy y los avisos, en todos los equipos. No se tocan los precios, las recetas ni los ajustes ni la otra tienda. Este equipo guarda una copia.`,si:'Sí, reiniciar '+zona,peligro:true});
    if(!ok)return;
    LS.set('aramo_reinicio_respaldo',{t:Date.now(),suc:k,pedidos:L});
    L.forEach(o=>{sinAbrir.delete(o.id);delete BORR[o.id];});guardarSinAbrir();LS.set('aramo_borradores',BORR);
    if(!sinAbrir.size)clearInterval(_rep);
    M.marca=null;M.tab=null;cerrarHoja();
    const n=await N.borrarTodo(k);
    pintarMostrador();pintarPuerta();document.title='ARAMO';
    toast(`🔄 ${zona} reiniciado · ${n} pedido${n===1?'':'s'} borrado${n===1?'':'s'}`);
  },
  abrir(el){if(!$('mostrador').classList.contains('open')){cerrarPuerta();abrirMostrador();}abrirEncargo(el.dataset.id);},
  cerrar(){cerrarHoja();},
  prueba(){pedidoPrueba();},
  caja(){M.vista='caja';pintarCajaHoy();},
  vitrina(){M.vista='vitrina';pintarVitrina();},
  promos(){M.vista='promos';pintarPromos();},
  analitica(){M.vista='analitica';pintarAnalitica();},
  personal(){M.vista='personal';pintarPersonal();},
  'personal-entrar'(){N.entrarCorreo(M.staffEmail,M.staffPass).then(a=>{M.staffPass='';toast(a?.personal?'✅ Sesión de personal iniciada':'✅ Correo verificado · copiá el UUID a aramo_staff');pintarPersonal();}).catch(e=>toast(e.message||'No se pudo iniciar sesión'));},
  'personal-crear'(){N.registrarCorreo(M.staffEmail,M.staffPass,{role:'staff'}).then(a=>{M.staffPass='';toast(a?.confirmacion?'📧 Cuenta creada. Confirmá el correo y luego iniciá sesión':'✅ Cuenta creada · copiá el UUID a aramo_staff');pintarPersonal();}).catch(e=>toast(e.message||'No se pudo crear la cuenta'));},
  'personal-salir'(){N.salir().then(()=>{toast('Sesión cerrada');pintarPersonal();});},
  'promo-add'(){const t=T(),v=id=>$(id)?.value.trim()||'',p={k:'promo_'+Date.now().toString(36),titulo:v('prT'),texto:v('prD'),producto:v('prK'),hasta:v('prH')};if(!p.titulo){toast('Poné un título');return;}N.guardarTienda({promos:[...(t.promos||[]),p]});toast('✨ Oferta guardada');pintarPromos();},
  'promo-del'(el){const t=T(),promos=(t.promos||[]).filter((_,i)=>i!==+el.dataset.i);N.guardarTienda({promos});pintarPromos();},
  vcat(el){M.vcat=el.dataset.k;repintar(pintarVitrina);},
  'vit-bajar'(el){
    const k=el.dataset.k,notas={...notasVit()},n=notas[k];if(!n)return;
    const t=T(),precios={...(t.precios||{})},sucursales=(t.sucursales||[]).map(s=>(s.precios&&s.precios[k]!=null&&+s.precios[k]>n.sug)?{...s,precios:{...s.precios,[k]:n.sug}}:s);
    if(+precios[k]>n.sug)precios[k]=n.sug;
    delete notas[k];LS.set('aramo_vit_notas',notas);
    N.guardarTienda({precios,sucursales});toast('⬇ Bajó a '+$c(n.sug)+' · ya se ve en La Feria');repintar(pintarVitrina);
  },
  'prod-nuevo'(){editarProd(null);},
  'prod-edit'(el){editarProd(el.dataset.k);},
  'prod-ok'(){guardarProd();},
  auto(el){
    const k=el.dataset.k,t=T(),prods={...(t.prods||{})},on=!prods[k]?.auto;
    prods[k]={...(prods[k]||{}),auto:on};
    const precios={...(t.precios||{})};
    if(on){const p=N.catalogo(M.suc==='todas'?null:M.suc).find(x=>x.k===k),c=p&&costoHoy(p.n);if(!c){toast('No hay costo de '+(p?.n||k)+' en Inventario; queda el precio manual');return;}precios[k]=precioAuto(c.pr,margenTienda());}
    const sucursales=(t.sucursales||[]).map(s=>s.k===M.suc?{...s,precios:{...(s.precios||{}),...(on?{[k]:precios[k]}:{})}}:s);
    N.guardarTienda({prods,precios,sucursales});toast(on?'🤖 Precio automático: sigue al costo de Inventario':'Precio manual');repintar(pintarVitrina);
  },
  vis(el){const k=el.dataset.k,t=T();if(M.suc==='todas'){const ocultos=new Set(t.ocultos||[]);ocultos.has(k)?ocultos.delete(k):ocultos.add(k);N.guardarTienda({ocultos:[...ocultos]});}else{const branches=t.sucursales||[],base=branches.find(s=>s.k===M.suc)||{},global=new Set(t.ocultos||[]),ocultos=new Set(base.ocultos||[]),visibles=new Set(base.visibles||[]),estaOculto=(global.has(k)||ocultos.has(k))&&!visibles.has(k);if(estaOculto){if(global.has(k))visibles.add(k);else ocultos.delete(k);}else{if(global.has(k))visibles.delete(k);else ocultos.add(k);}const sucursales=branches.map(s=>s.k===M.suc?{...s,ocultos:[...ocultos],visibles:[...visibles]}:s);N.guardarTienda({sucursales});}repintar(pintarVitrina);},
  ago(el){const k=el.dataset.k,t=T(),base=(t.sucursales||[]).find(s=>s.k===M.suc)||{},s=new Set(base.agotados||t.agotados||[]);s.has(k)?s.delete(k):s.add(k);const sucursales=(t.sucursales||[]).map(x=>x.k===M.suc?{...x,agotados:[...s]}:x);N.guardarTienda({agotados:[...s],sucursales});toast(s.has(k)?'🚫 Agotado hoy':'De vuelta en la vitrina');repintar(pintarVitrina);},
  'vit-ok'(){cerrarHoja();},
  recetario(){M.vista='recetario';pintarRecetario();},
  'rec-nueva'(){editarReceta(null);},
  'rec-edit'(el){editarReceta(el.dataset.k);},
  'rec-vis'(el){const k=el.dataset.k,t=T(),s=new Set(t.recetasOcultas||[]);s.has(k)?s.delete(k):s.add(k);N.guardarTienda({recetasOcultas:[...s]});repintar(pintarRecetario);},
  're-add'(el){M.rec.items.push([el.dataset.k,N.catalogo().find(p=>p.k===el.dataset.k)?.u==='kg'?.5:1]);M.rq='';repintar(pintarReceta);},
  're-quitar'(el){M.rec.items.splice(+el.dataset.i,1);repintar(pintarReceta);},
  'rec-ok'(){
    const r=M.rec;['reN','reE','reC','reD'].forEach(id=>$(id)?.dispatchEvent(new Event('change')));
    if(r.n.length<2){toast('Ponele nombre a la receta');return;}
    if(!r.items.length){toast('Agregá al menos un ingrediente');return;}
    r.items=r.items.filter(([,q])=>q>0);
    if(!r.k)r.k='mi_'+nrm(r.n).replace(/[^a-z0-9]+/g,'_').slice(0,24)+'_'+Date.now().toString(36).slice(-3);
    const lista=[...(T().recetas||[])].filter(x=>x.k!==r.k);lista.push(r);
    N.guardarTienda({recetas:lista});toast('📖 '+r.n+' ya está en La Feria');M.vista='recetario';pintarRecetario();
  },
  ajustes(){pintarAjustesApp();},   // "Pagos y horarios" del Mostrador abre los Ajustes únicos (rediseño, Fase 2)
  'aj-sec'(el){
    const sec=el.dataset.sec;
    if(sec==='tienda'){cerrarHoja();ACT.local();return;}
    if(sec==='programa'){ACT.programa();return;}
    if(sec==='compartir'){ACT.compartir();return;}
    if(sec==='actualizar'){AramoUI.confirmar({titulo:'¿Actualizar la app?',texto:'Baja otra vez lo último que se publicó. No borra pedidos, el Inventario ni los ajustes.',si:'Actualizar'}).then(ok=>{if(ok)reiniciarApp();});return;}
    pintarAjSec(sec);
  },
  'aj-tema-usar'(el){
    const v=el.dataset.v;
    if(typeof window.applyTheme==='function')window.applyTheme(v);else{try{localStorage.setItem('aramo_theme',v);}catch{}}
    repintar(()=>pintarAjSec('tema'));
  },
  receptor(){M.vista='receptor';pintarReceptor();},
  'r-suc'(el){R.suc=el.dataset.k;M.suc=R.suc;guardarR();repintar(pintarReceptor);pintarMostrador();pintarPuerta();toast('📡 Este equipo recibe: '+receptorNom());},
  'avisos-on'(){N.avisos.pedir().then(r=>{toast(r==='granted'?'🔔 Avisos activados en este equipo':'El navegador no permitió los avisos');if(M.vista==='receptor')repintar(pintarReceptor);if(M.vista==='ajustes-app')repintar(pintarAjustesApp);if(M.vista==='aj-avisos')repintar(()=>pintarAjSec('avisos'));pintarMostrador();pintarPuerta();if(r==='granted')N.avisos.mostrar('🔔 Avisos de ARAMO activados','Aquí te va a llegar cada pedido nuevo de '+receptorNom()+'.',{tag:'aramo-prueba'});});},
  'avisos-toggle'(){R.sonido=!R.sonido;guardarR();toast(R.sonido?'🔔 Avisos activados':'🔕 Avisos silenciados · podés activarlos de nuevo aquí');pintarMostrador();pintarPuerta();},
  'probar-aviso'(){campana(true);N.avisos.mostrar('🛎️ Así suena un pedido nuevo','A-PRUEBA · Ana · 6 productos · '+receptorNom(),{tag:'aramo-prueba'});},
  surtir(el){
    primeraVez=false;document.getElementById('scopePicker')?.classList.remove('open');document.body.classList.remove('scope-picker-open');
    cerrarHoja();$('mostrador').classList.remove('open');cerrarPuerta();
    try{switchView('proveedores');const i=$('pvSearch');if(i){i.value=el.dataset.n;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}}catch{}
    toast('🚚 Buscando '+el.dataset.n+' en Inventario');
  },
  'pos-pedido'(){
    const o=N.get(M.abierto);if(!o)return;
    LS.set('aramo_pos_encargo',{id:o.id,ref:o.ref,sucursal:o.sucursal,cliente:o.cliente,retiro:o.retiro,pago:o.pago,items:o.items,total:N.totalDe(o),at:new Date().toISOString()});
    const k=LOCAL&&LOCAL!=='todas'?LOCAL:(o.sucursal||'moravia');
    const u='pos/index.html?suc='+encodeURIComponent(k)+'&encargo='+encodeURIComponent(o.id);
    toast('🧾 Abriendo POS con '+o.ref+'…');abrir(u);
  },
  'aplicar-pos'(){aplicarPOS(M.abierto,true).then(ok=>{if(!ok)toast('No hay cotización del POS para aplicar');});},
  aceptar(){N.cambiar(M.abierto,o=>{o.estado='alistando';o.fase='recibido';o._ev={tipo:'aceptado'};},'tienda','La tienda aceptó el pedido y empezó a pesar').then(o=>{M.tab='alistando';M.vista='pesar';M.pk=pkInicial(o);pintarEncargo();pintarMostrador();toast('⚖️ A pesar: tocá los números y Siguiente');});},
  rechazar(){
    const o=N.get(M.abierto);const m=prompt('¿Por qué no se puede hacer? (se lo decimos al cliente)','No tenemos varios productos hoy');
    if(m===null)return;
    N.cambiar(o.id,x=>{x.estado='cancelado';x.motivo=m||'La tienda no pudo hacerlo';x.rechazo={por:'tienda',at:new Date().toISOString(),motivo:m||''};x._ev={tipo:'rechazado'};},'tienda','Rechazado: '+(m||'')).then(x=>{pintarEncargo();pintarMostrador();toast('✖️ '+x.ref+' rechazado · el cliente lo ve en La Feria');});
  },
  // Enviar el pedido a la otra tienda: le aparece en su Mostrador y el cliente ve la tienda nueva
  'enviar-a'(el){
    const o=N.get(M.abierto),k=el.dataset.k,s=suc(k);if(!o||!s||o.estado!=='nuevo'||k===o.sucursal)return;
    if(!confirm(`¿Enviar ${o.ref} a ${s.n} ${s.zona}?\n\nLe va a aparecer en Pedidos de esa tienda y el cliente va a ver la tienda nueva.`))return;
    N.cambiar(o.id,x=>{const de=x.sucursal;x.sucursal=k;x.traspaso={de,a:k,at:new Date().toISOString(),por:quienAtiende()};x._ev={tipo:'traspaso',de,a:k};},'tienda',`Enviado de ${sucNom(o.sucursal)} a ${sucNom(k)}`).then(x=>{
      if(!x)return;
      sinAbrir.delete(x.id);guardarSinAbrir();cerrarHoja();pintarMostrador();pintarPuerta();
      toast(`🔀 ${x.ref} se envió a ${s.n} ${s.zona}`);
    });
  },
  'ver-comp'(){
    const o=N.get(M.abierto),c=o?.comprobante;if(!c)return;
    const src=c.img||compUrls[c.path];if(!src){toast('Todavía estoy cargando el comprobante…');return;}
    let el=$('moLight');if(!el){el=document.createElement('div');el.id='moLight';el.className='mo-light';el.setAttribute('data-mo','cerrar-comp');document.body.appendChild(el);}
    el.innerHTML=`<button type="button" class="mo-light-x" data-mo="cerrar-comp" aria-label="Cerrar">✕</button><img src="${esc(src)}" alt="Comprobante SINPE"><p>${esc(o.ref)} · ${$c(N.totalDe(o))} · tocá para cerrar</p>`;
    el.classList.add('open');
  },
  'cerrar-comp'(){$('moLight')?.classList.remove('open');},
  'confirmar-tienda'(){
    const o=N.get(M.abierto);if(!o||N.faseDe?.(o)!=='confirmacion')return;
    if(!confirm(`¿${o.cliente.nombre} ya aceptó la cotización de ${$c(N.totalDe(o))} por llamada o WhatsApp?`))return;
    N.cambiar(o.id,x=>{x.fase='alistando';x.confirmacion={at:new Date().toISOString(),por:'tienda',total:N.totalDe(x),quien:quienAtiende()};x._ev={tipo:'cot-ok-tienda',monto:N.totalDe(x)};},'tienda','Confirmó la cotización por el cliente (llamada o WhatsApp)').then(()=>{pintarEncargo();pintarMostrador();toast('✅ Cotización confirmada por el cliente (anotado)');});
  },
  'corregir-cot'(){N.cambiar(M.abierto,o=>{o.estado='alistando';o.fase='recibido';delete o.confirmacion;},'tienda','Volvió a pesar: se corrige la cotización').then(()=>{M.tab='alistando';pintarEncargo();pintarMostrador();});},
  'marcar-listo'(){
    if(N.porConfirmar?.(N.get(M.abierto))){toast('Cambió el total: primero se le manda al cliente para que lo confirme');return ACT.listo();}
    N.cambiar(M.abierto,o=>{if(o.estado!=='alistando')return;o.estado='listo';o.totalFinal=N.totalDe(o);o._ev={tipo:'listo',monto:o.totalFinal};},'tienda','Pedido listo para entregar').then(o=>{
      if(!o)return;M.tab='listo';pintarEncargo();pintarMostrador();
      toast('✅ '+o.ref+' lista · '+o.cliente.nombre.split(' ')[0]+' lo ve en La Feria');
    });
  },
  'it-ok'(el){const i=+el.dataset.i;N.cambiar(M.abierto,o=>{const it=o.items[i];it.estado=it.estado==='listo'?'':'listo';if(it.estado==='listo'&&(it.qr==null||it.qr===''))it.qr=it.q;},'tienda').then(()=>{buzz(8);repintar(pintarEncargo);pintarMostrador();});},
  'it-no'(el){const i=+el.dataset.i;N.cambiar(M.abierto,o=>{const it=o.items[i];it.estado=it.estado==='nohay'?'':'nohay';},'tienda').then(()=>{buzz(8);repintar(pintarEncargo);pintarMostrador();});},
  'sub-prop'(el){const o=N.get(M.abierto),i=+el.dataset.i;if(!o||o.sust!=='avisar')return toast('El cliente eligió otra opción para los faltantes');const it=o.items[i],nombre=prompt('¿Qué producto proponés en lugar de '+it.n+'?',N.catalogo().find(p=>p.k!==it.k&&!p.agotado)?.n||'');if(!nombre?.trim())return;const p=N.catalogo().find(x=>nrm(x.n)===nrm(nombre))||N.catalogo().find(x=>nrm(x.n).includes(nrm(nombre)));if(!p)return toast('No encontré ese producto en la vitrina');const precio=+prompt('Precio por '+(p.u==='kg'?'kg':'unidad'),String(p.p||0));if(!(precio>=0))return;N.cambiar(o.id,x=>{x.items[i].subPropuesta={k:p.k,n:p.n,e:p.e,u:p.u,q:x.items[i].q,p:precio};x.items[i].estado='nohay';},'tienda','Se propuso sustitución para '+it.n).then(()=>{repintar(pintarEncargo);pintarMostrador();toast('🔁 Propuesta enviada al cliente');});},
  'todo-ok'(){N.cambiar(M.abierto,o=>{o.items.forEach(it=>{if(it.estado!=='nohay'){it.estado='listo';if(it.qr==null||it.qr==='')it.qr=it.q;}});},'tienda').then(()=>{repintar(pintarEncargo);pintarMostrador();});},
  'todo-y-listo'(){
    const o0=N.get(M.abierto);if(sinUber(o0)){pedirUber(o0);return;}
    N.cambiar(M.abierto,o=>{o.items.forEach(it=>{if(it.estado!=='nohay'){it.estado='listo';if(it.qr==null||it.qr==='')it.qr=it.q;}});sellarCotizacion(o);},'tienda','Cotización final enviada al cliente para confirmación').then(o=>{
      if(!o)return;
      M.tab='alistando';pintarEncargo();pintarMostrador();
      toast('🧾 '+o.ref+' · cotización enviada a '+o.cliente.nombre.split(' ')[0]+' · esperando su confirmación');
    });
  },
  'precio-it'(el){
    const o=N.get(M.abierto),i=+el.dataset.i,it=o.items[i];
    const v=prompt(`Precio de ${it.n} para este pedido (₡ ${it.u==='kg'?'por kg':'c/u'})`,String(precioIt(it)));
    if(v===null)return;const n=Math.round(+String(v).replace(/[^\d.]/g,''));if(!(n>=0))return;
    N.cambiar(o.id,x=>{x.items[i].pr=n;},'tienda',`Precio de ${it.n}: ${$c(n)}`).then(()=>{repintar(pintarEncargo);pintarMostrador();});
  },
  listo(){
    const o0=N.get(M.abierto);if(sinUber(o0)){pedirUber(o0);return;}
    N.cambiar(M.abierto,o=>{sellarCotizacion(o);},'tienda','Cotización final enviada al cliente · esperando su confirmación').then(o=>{
      if(!o)return;
      M.tab='alistando';pintarEncargo();pintarMostrador();
      toast('🧾 '+o.ref+' · cotización enviada a '+o.cliente.nombre.split(' ')[0]+' · esperando su confirmación');
    });
  },
  'volver-alistar'(){N.cambiar(M.abierto,o=>{o.estado='alistando';o.fase=o.confirmacion?.at?'alistando':'recibido';},'tienda','Volvió a alistar').then(()=>{M.tab='alistando';pintarEncargo();pintarMostrador();});},
  pagado(){const o=N.get(M.abierto);if(!confirm(`¿Te entró el SINPE de ${$c(N.totalDe(o))} con la descripción ${o.ref}?`))return;N.cambiar(o.id,x=>{x.pago.estado='verificado';x.pago.verificado={at:new Date().toISOString(),por:quienAtiende(),monto:N.totalDe(x)};x._ev={tipo:'sinpe-ok',monto:N.totalDe(x),metodo:'SINPE'};},'tienda','Pago SINPE confirmado').then(()=>{pintarEncargo();pintarMostrador();toast('📲 Pago confirmado');});},
  'pedido-celular'(){
    const o=N.get(M.abierto);if(!o)return;
    const k=o.sucursal||(LOCAL&&LOCAL!=='todas'?LOCAL:'moravia'),u='pos/cobrar.html?suc='+encodeURIComponent(k)+'&pedido='+encodeURIComponent(o.id);
    toast('📱 Abriendo '+o.ref+' en el POS celular…');
    if(esCompu())abrir(u);else location.href=u;
  },
  'soltar-celular'(){N.cambiar(M.abierto,x=>{delete x.enCaja;},'tienda','El pedido volvió a Pedidos (ya no se cobra en el POS celular)').then(()=>{pintarEncargo();pintarMostrador();toast('↩︎ El pedido volvió a Pedidos');});},
  entregar(){M.vista='pin';M.pin='';pintarEncargo();},
  pin(el){
    const o=N.get(M.abierto),k=el.dataset.k;
    if(k==='⌫')M.pin=M.pin.slice(0,-1);
    else if(k==='✓'){if(M.pin.length<4)return;}
    else if(M.pin.length<4)M.pin+=k;
    if(M.pin.length===4){
      if(M.pin===o.pin){codigoOk(o,'Entregado con código');return;}
      pintarPin(o);$('moPin').classList.add('mal');buzz([60,40,60]);M.pin='';toast('Ese código no coincide');setTimeout(()=>{if(M.vista==='pin')pintarPin(o);},500);return;
    }
    pintarPin(o);
  },
  qr(){escanear(N.get(M.abierto));},
  'sin-codigo'(){const o=N.get(M.abierto);if(confirm(`¿Entregar ${o.ref} a ${o.cliente.nombre} sin código? Revisá su nombre y teléfono.`))codigoOk(o,'Entregado sin código (verificado a mano)');},
  cobrar(el){abrirCobro(el.dataset.id||M.abierto,{});},
  metodo(el){M.cobro.metodo=el.dataset.k;repintar(()=>pintarCobro(N.get(M.abierto)));},
  recibido(el){M.cobro.recibido=+el.dataset.v;repintar(()=>pintarCobro(N.get(M.abierto)));},
  'cobrar-ok'(){cobrar();},
  'sd-add'(){M.sdTmp=[...leerSd(),{nombre:'',numero:''}].slice(0,8);pintarAjSec('pagos');setTimeout(()=>{const L=leerSd();$('ajSdN'+(L.length-1))?.focus();},60);},
  'sd-del'(el){const L=leerSd();L.splice(+el.dataset.i,1);M.sdTmp=L;pintarAjSec('pagos');},
  sd(el){M.cobro.sa=el.dataset.n;$('moSheet').querySelectorAll('[data-mo="sd"]').forEach(b=>{const on=b.dataset.n===M.cobro.sa;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});},
  tiquete(){M.vista='tiquete';pintarEncargo();},
  'ver-tiq'(el){M.abierto=el.dataset.id;M.vista='tiquete';pintarEncargo();},
  'imprimir-tiq'(){const o=N.get(M.abierto);imprimir(`<pre>${esc(tiqueteTexto(o))}</pre>`,'Tiquete '+o.ref);},
  'wa-tiq'(){const o=N.get(M.abierto);abrir(N.wa(o.cliente.tel,'🧾 Tu tiquete de ARAMO\n\n'+tiqueteTexto(o)));},
  imprimir(){const o=N.get(M.abierto);imprimir(listaAlistado(o),'Lista para alistar · '+o.ref);},
  'imprimir-cierre'(){const {L,t,total}=resumenCaja();imprimir(`<p>${esc(M.suc==='todas'?'Ambas tiendas':sucNom(M.suc))} · ${new Date().toLocaleDateString('es-CR')}</p><table><tbody>${L.map(o=>`<tr><td>${fh(o.cobro.fecha)}</td><td>${esc(o.ref)}</td><td>${esc(o.cliente.nombre)}</td><td>${esc(PM(o.cobro.metodo).n||'')}${o.cobro.sinpeA?' · '+esc(o.cobro.sinpeA):''}</td><td>${$c(o.cobro.total)}</td></tr>`).join('')}</tbody></table><p>Efectivo ${$c(t.efectivo)} · Tarjeta ${$c((t.tarjeta||0)+(t.link||0))} · SINPE ${$c(t.sinpe)} · <b>Total ${$c(total)}</b></p>`,'Cierre de pedidos del día');},
  wa(){const o=N.get(M.abierto);if(o)abrir(N.wa(o.cliente.tel,msgCliente(o)));}, // el botón 💬: la cotización o el total, o un saludo
  'costo-uber'(){const o=N.get(M.abierto);if(o)pedirUber(o);},
  // Ver el precio del viaje en la app de Uber SIN pedirlo (así se pacta el envío antes de que el cliente pague)
  'uber-precio'(){const o=N.get(M.abierto);if(!o?.retiro?.envio)return;abrir(uberLink(o));toast('👀 Mirá cuánto cobra Uber y anotalo abajo; todavía no se pide');},
  uber(){
    const o=N.get(M.abierto);if(!o?.retiro?.envio)return;
    abrir(uberLink(o));
    if(!o.retiro.envio.uber)N.cambiar(o.id,x=>{x.retiro.envio.uber=new Date().toISOString();x._ev={tipo:'uber'};},'tienda','Uber pedido').then(()=>{pintarEncargo();pintarMostrador();toast('🚗 Cuando Uber te diga el precio, anotá cuánto costó');});
    else toast('🚗 Abriendo Uber con el punto del cliente');
  },
  // La tienda anota lo que Uber cobró de verdad: se recalcula lo del cliente con la misma regla y se guarda para aprender
  'uber-costo'(){
    const o=N.get(M.abierto);if(!o?.retiro?.envio)return;
    const v=Math.round(+String($('moUberReal')?.value||'').replace(',','.'));
    if(!(v>0)){toast('Escribí cuánto costó el Uber');$('moUberReal')?.focus();return;}
    N.costoRealUber(o.id,v).then(r=>{if(!r){toast('No se pudo guardar el costo');return;}repintar(pintarEncargo);pintarMostrador();const e=r.retiro.envio;toast(e.uberPedido===v&&e.difTienda!=null?`🛵 Uber ${$c(v)} · diferencia con lo pactado: ${$c(e.difTienda)} (la pone la tienda, el cliente no paga más)`:`🛵 Uber ${$c(v)} · el cliente paga ${$c(e.costo)} · ARAMO pone ${$c(e.tienda||0)}`);});
  },
  // El cliente dijo que ya lo recibió: la tienda confirma la entrega o pide revisar
  'confirmar-entrega'(){
    const o=N.get(M.abierto);if(!o)return;
    if(cobrado(o))entregar(o,'Entregado por Uber · el cliente confirmó que lo recibió');else abrirCobro(o.id,{entregar:true,desdePin:true});
  },
  'revisar-entrega'(){
    const o=N.get(M.abierto);if(!o)return;
    N.cambiar(o.id,x=>{delete x.recibidoCliente;delete x.recibidoTienda;x.revision={at:new Date().toISOString(),por:quienAtiende()};x._ev={tipo:'revision'};},'tienda','La tienda revisa la entrega: vuelve a En camino').then(()=>{pintarEncargo();pintarMostrador();toast('🔎 Vuelve a En camino con una nota para el cliente');});
  },
  // La tienda ve en el viaje de Uber que ya llegó: el cliente tiene que confirmarlo en La Feria (Sí / No)
  'recibido-tienda'(){
    const o=N.get(M.abierto);if(!o)return;
    N.cambiar(o.id,x=>{x.recibidoTienda={at:new Date().toISOString(),por:quienAtiende()};delete x.recibidoCliente;delete x.revision;x._ev={tipo:'recibido-tienda'};},'tienda','La tienda marcó que el cliente ya lo recibió (según el viaje de Uber): espera su confirmación').then(()=>{pintarEncargo();pintarMostrador();toast('📍 Le preguntamos al cliente en La Feria si ya lo recibió');});
  },
  'entregado-uber'(){
    const o=N.get(M.abierto);if(!confirm(`¿${o.cliente.nombre} ya recibió ${o.ref}?`))return;
    if(cobrado(o))entregar(o,'Entregado por Uber');else abrirCobro(o.id,{entregar:true,desdePin:true});
  },
  'tienda-gps'(el){
    if(!navigator.geolocation){toast('Este equipo no comparte ubicación');return;}
    toast('📍 Tomando la ubicación de la tienda…');
    navigator.geolocation.getCurrentPosition(p=>{
      const t=T(),k=el.dataset.k;
      N.guardarTienda({sucursales:(t.sucursales||[]).map(s=>s.k===k?{...s,lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),aprox:false}:s)});
      toast('📍 Ubicación de la tienda guardada');if(M.vista==='aj-contacto'||M.vista==='aj-envio')repintar(()=>pintarAjSec(M.vista.slice(3)));else if(M.vista==='encargo'&&M.abierto&&N.get(M.abierto))repintar(pintarEncargo);else pintarAjustes();
    },()=>toast('No se pudo tomar la ubicación'),{enableHighAccuracy:true,timeout:15000});
  },
  clientes(){M.vista='clientes';M.prog=null;pintarClientes();},
  cliente(el){M.vista='cliente';M.ctel=el.dataset.tel;pintarCliente();},
  'cl-wa'(){const c=clientesDe(todos()).find(x=>x.tel===M.ctel);if(!c)return;const k=c.cuenta;abrir(N.wa(c.tel,`¡Hola ${c.nombre.split(' ')[0]}! 👋 Te escribimos de ${T().nombre||'ARAMO'}.${N.lealtad().activa?` Tenés ${k.saldo} hojas 🍃 para canjear en tu próximo pedido.`:''}`));},
  programa(){M.vista='programa';M.prog=null;pintarPrograma();},
  'premio-add'(){M.prog.premios.push({k:'p'+Date.now().toString(36),n:'₡1.000 de descuento',hojas:20,valor:1000});repintar(pintarPrograma);},
  'premio-del'(el){M.prog.premios.splice(+el.dataset.i,1);repintar(pintarPrograma);},
  'lealtad-ok'(){
    const L=M.prog;if(!L)return;
    if(!(+L.porHoja>=1)){toast('Poné cuántos colones vale una hoja');return;}
    const premios=L.premios.map(p=>({k:p.k||'p'+Math.random().toString(36).slice(2,7),n:String(p.n||'').trim()||`${$c(p.valor)} de descuento`,hojas:Math.round(+p.hojas||0),valor:Math.round(+p.valor||0)}));
    if(premios.some(p=>p.hojas<1||p.valor<1)){toast('Cada premio necesita hojas y un descuento mayor que cero');return;}
    N.guardarTienda({lealtad:{activa:!!L.activa,porHoja:Math.round(+L.porHoja),dobles:!!L.dobles,premios}});
    M.prog=null;toast('🍃 Programa guardado · ya se ve en La Feria');M.vista='clientes';pintarClientes();
  },
  'quitar-premio'(){const o=N.get(M.abierto);if(!o?.premio)return;if(!confirm(`¿Quitar el premio de ${$c(o.premio.valor)} del pedido ${o.ref}?`))return;N.cambiar(o.id,x=>{delete x.premio;},'tienda','Premio quitado: no le alcanzaban las hojas').then(()=>{repintar(pintarEncargo);pintarMostrador();toast('Premio quitado');});},
  // Guarda SOLO lo que está en pantalla: Ajustes ahora va por secciones y un campo que no se ve nunca
  // se guarda vacío (así cambiar el horario no toca el SINPE ni lo demás en la nube).
  'aj-ok'(){
    const t=T(),k=localK(),hay=id=>!!$(id),v=id=>$(id)?.value.trim()||'',c={};
    if(['ajAct','ajWaSuc','ajAbre','ajCierra','ajSinpe','ajSinpeN','ajSdLista'].some(hay)){
      c.sucursales=(t.sucursales||[]).map(s=>{
        if(s.k!==k)return s;
        const n={...s};
        if(hay('ajAct'))n.activa=!!$('ajAct').checked;
        if(hay('ajWaSuc'))n.whatsapp=telDig(v('ajWaSuc'));
        if(hay('ajAbre'))n.abre=v('ajAbre')||s.abre;
        if(hay('ajCierra'))n.cierra=v('ajCierra')||s.cierra;
        if(hay('ajSinpe')||hay('ajSinpeN'))n.sinpe={...(s.sinpe||{}),...(hay('ajSinpe')?{numero:telDig(v('ajSinpe'))}:{}),...(hay('ajSinpeN')?{nombre:v('ajSinpeN')}:{})};
        if(hay('ajSdLista')){const vistos=new Set();n.sinpeDestinos=leerSd().map(d=>({nombre:String(d.nombre||'').replace(/\s+/g,' ').trim().slice(0,30),numero:telDig(d.numero)})).filter(d=>d.nombre||d.numero).map(d=>({...d,nombre:d.nombre||'SINPE'})).filter(d=>!vistos.has(d.nombre)&&vistos.add(d.nombre)).slice(0,8);}
        return n;
      });
    }
    if(hay('ajNombre'))c.nombre=v('ajNombre')||'ARAMO';
    if(hay('ajMin'))c.alistadoMin=Math.max(10,+v('ajMin')||40);
    if(hay('ajCapacidad'))c.capacidadPorHora=Math.max(0,+v('ajCapacidad')||0);
    if(hay('ajEnvio'))c.envio=$('ajEnvio').checked;
    if(hay('ajLink'))c.linkTarjeta=v('ajLink');
    if(hay('ajFeriados'))c.feriados=v('ajFeriados').split(',').map(x=>x.trim()).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x));
    if(hay('ajEspecial')){const horarios={};v('ajEspecial').split(/\n+/).forEach(line=>{const [f,raw]=line.split('|').map(x=>x.trim());if(!/^\d{4}-\d{2}-\d{2}$/.test(f)||!raw)return;if(raw.toLowerCase()==='cerrado')horarios[f]={cerrada:true};else{const [abre,cierra]=raw.split('-').map(x=>x.trim());if(abre&&cierra)horarios[f]={abre,cierra};}});c.horariosEspeciales=horarios;}
    if(['ajLat','ajLng'].some(hay)&&hay('ajLat')&&hay('ajLng')){
      const la=v('ajLat')===''?null:+v('ajLat'),lo=v('ajLng')===''?null:+v('ajLng'),antes=(t.sucursales||[]).find(x=>x.k===k)||{};
      if(la!=null&&lo!=null&&Math.abs(la)<=90&&Math.abs(lo)<=180&&(la!==+antes.lat||lo!==+antes.lng)){
        c.sucursales=(c.sucursales||t.sucursales||[]).map(s=>s.k===k?{...s,lat:la,lng:lo,aprox:false}:s);
      }
    }
    if(['ajZona','ajRadio','ajTarifa','ajKm','ajMinimo','ajUberMin','ajFactor','ajRepMin','ajRepPct'].some(hay)){
      const e={...(t.envioConfig||{})};
      if(hay('ajZona'))e.zona=v('ajZona');
      if(hay('ajRadio'))e.radioKm=Math.max(0,+v('ajRadio')||0);
      if(hay('ajTarifa'))e.tarifaBase=Math.max(0,+v('ajTarifa')||0);
      if(hay('ajKm'))e.tarifaKm=Math.max(0,+v('ajKm')||0);
      if(hay('ajMinimo'))e.minimo=Math.max(0,+v('ajMinimo')||0);
      if(hay('ajUberMin'))e.uberMinimo=Math.max(0,+v('ajUberMin')||0);
      if(hay('ajFactor'))e.factorCalle=Math.max(1,+v('ajFactor')||1.35);
      if(hay('ajRepMin'))e.repartoMin=Math.max(0,+v('ajRepMin')||0);
      if(hay('ajRepPct'))e.repartoPct=Math.min(100,Math.max(0,v('ajRepPct')===''?50:+v('ajRepPct')||0));
      c.envioConfig=e;
    }
    if(hay('ajPriv'))c.privacidad=v('ajPriv');
    if(hay('ajCond'))c.condiciones=v('ajCond');
    if(hay('ajFaq'))c.faq=v('ajFaq').split(/\n+/).map(x=>x.split('|')).filter(x=>x[0]?.trim()).map(x=>({q:x[0].trim(),a:(x.slice(1).join('|')||'').trim()}));
    if(hay('ajShareTitle'))c.shareTitle=v('ajShareTitle');
    if(hay('ajShareDesc'))c.shareDescription=v('ajShareDesc');
    if(hay('ajShareImage'))c.shareImage=v('ajShareImage');
    if(hay('ajPushKey'))c.pushPublicKey=v('ajPushKey');
    if(!Object.keys(c).length){pintarAjustesApp();return;}
    const remoto=N.modo()==='nube',enSeccion=String(M.vista||'').startsWith('aj-');
    Promise.resolve(N.guardarTienda(c)).then(ok=>{
      if(remoto&&ok===false){toast('No se guardó en la nube: iniciá sesión de personal');return;}
      if(enSeccion)pintarAjustesApp();else cerrarHoja();
      toast('⚙️ Guardado · '+sucNom(k));
    });
  },
  copiar(el){navigator.clipboard?.writeText(el.dataset.v).then(()=>toast('📋 Copiado'),()=>toast(el.dataset.v));},
  'wa-share'(){abrir(N.wa('',`🧺 ¡Ya podés pedir en ${T().nombre||'ARAMO'} desde el celular! Entrá a La Feria, armá tu canasta de frutas y verduras y la recogés lista o te llega a casa 👉 ${linkTaller()}`));},
};
function codigoOk(o,como){
  pararCamara();
  if(cobrado(o))entregar(o,como);
  else{abrirCobro(o.id,{entregar:true,desdePin:true});toast('✓ Código correcto · ahora cobrá');}
}
async function entregar(o,como){
  await N.cambiar(o.id,x=>{x.estado='entregado';x.fase='entregado';x.entregado=new Date().toISOString();if(x.pago.estado==='reportado')x.pago.estado='verificado';x._ev={tipo:'entregado',monto:N.totalDe(x),metodo:PM(x.cobro?.metodo||x.pago?.metodo).n||''};},'tienda',como);
  pararCamara();buzz([40,40,80]);
  toast(`🛍️ ${o.ref} entregado`);
  M.vista='encargo';pintarEncargo();pintarMostrador();pintarPuerta();
}
let _stream=null,_scan=0;
async function escanear(o){
  try{
    const det=new BarcodeDetector({formats:['qr_code']});
    _stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const v=$('moVideo');v.hidden=false;v.srcObject=_stream;await v.play();
    const loop=async()=>{
      if(!_stream)return;
      try{const c=await det.detect(v);const raw=c[0]?.rawValue||'';
        if(raw){const m=raw.match(/^ARAMO:([^:]+):(\d{4})$/);
          if(m&&m[1]===o.ref&&m[2]===o.pin){codigoOk(o,'Entregado con QR');return;}
          toast('Ese QR no es de '+o.ref);}
      }catch{}
      _scan=setTimeout(loop,350);
    };loop();
  }catch{toast('No se pudo abrir la cámara; usá el código');}
}
function pararCamara(){clearTimeout(_scan);if(_stream){_stream.getTracks().forEach(t=>t.stop());_stream=null;}}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-pu],[data-mo]');if(!el||el.disabled)return;
  if(!el.closest('#puerta,#mostrador,#moSheet,#moLight'))return;
  const f=ACT[el.dataset.pu||el.dataset.mo];if(!f)return;
  e.preventDefault();f(el);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('moSheet')?.classList.contains('open')){cerrarHoja();return;}
  // Teclas rápidas en la pantalla principal: 1 Surtido · 2 Taller · 3 POS · M Mostrador · / buscar
  if(!$('puerta')?.classList.contains('open')||$('moSheet')?.classList.contains('open'))return;
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches?.('input,textarea,select'))return;
  const mapa={'1':'surtido','2':'canasta','3':'pos','4':'control',m:'mostrador',M:'mostrador'};
  if(mapa[e.key]==='control'&&localK()!=='angeles')return; // el Control es solo de Los Ángeles
  if(mapa[e.key]){e.preventDefault();const el=document.querySelector(`#puIn [data-pu="${mapa[e.key]}"]`);ACT[mapa[e.key]](el);}
  else if(e.key==='/'&&$('poCmdQ')){e.preventDefault();$('poCmdQ').focus();}
});

// ══════════════ En vivo: alarma de pedido nuevo ══════════════
let _vitT=0;
const vistos=new Map(N.lista().map(o=>[o.id,o.estado+'|'+(o.pago?.estado||'')+'|'+o.sucursal]));
const logVisto=new Map(N.lista().map(o=>[o.id,(o.log||[]).length]));
let _rep=0;
function repetirAlarma(){
  clearInterval(_rep);
  _rep=setInterval(()=>{
    const pend=[...sinAbrir].map(id=>N.get(id)).filter(o=>o&&o.estado==='nuevo'&&paraMi(o));
    if(!pend.length){clearInterval(_rep);return;}
    campana(true);buzz([200,100,200]);
  },25000);
}
function vigilar(){
  let nuevos=0,traspasos=0;
  sinAbrir.forEach(id=>{if(!N.get(id))sinAbrir.delete(id);}); // borrados al reiniciar en otro equipo
  N.lista().forEach(o=>{
    const k=o.estado+'|'+(o.pago?.estado||'')+'|'+o.sucursal,antes=vistos.get(o.id);vistos.set(o.id,k);
    if(o.archivado){sinAbrir.delete(o.id);return;}
    if(antes===k)return;
    const [eA,,sA]=(antes||'').split('|');
    // un pedido que otra tienda le pasó a esta también suena como pedido nuevo
    const llegoTraspaso=!!antes&&sA!==o.sucursal&&o.estado==='nuevo'&&paraMi(o)&&R.suc!=='todas';
    if((!antes&&o.estado==='nuevo'&&paraMi(o))||llegoTraspaso){
      nuevos++;if(llegoTraspaso)traspasos++;sinAbrir.add(o.id);
      if(R.sonido)N.avisos.mostrar(`${llegoTraspaso?'🔀 Pedido pasado a tu tienda':'🛎️ Pedido nuevo'} · ${o.ref}`,`${o.cliente.nombre} · ${o.items.length} productos · ${sucNom(o.sucursal)} · ${o.retiro.envio?'envío':'recoge'} ${fh(o.retiro.at)}`,{tag:'nuevo-'+o.id,fijo:true,url:new URL('APP.html#ver='+o.id,location.href).href});
    }
    else if(antes&&o.estado==='cancelado'&&eA!=='cancelado'&&paraMi(o))sinAbrir.delete(o.id); // el aviso sale en la bitácora de eventos
  });
  if(nuevos){
    const o=[...sinAbrir].map(id=>N.get(id)).filter(Boolean)[0];
    toast(`${traspasos&&nuevos===traspasos?'🔀':'🛎️'} ${nuevos>1?nuevos+' pedidos nuevos':(traspasos?'Pedido pasado a tu tienda ':'Pedido nuevo ')+o.ref+' · '+o.cliente.nombre}`);
    campana(true);buzz([120,60,120,60,240]);repetirAlarma();
  }
  guardarSinAbrir();
  const n=activos().filter(o=>o.estado==='nuevo'&&paraMi(o)).length;
  document.title=(n?`(${n}) `:'')+'ARAMO';
}
// ── Avisos de cada movimiento (instante a instante): toast + notificación del sistema, sin sonido ──
const EVT={
  aceptado:['✅','Aceptado'],rechazado:['✖️','Rechazado por la tienda'],traspaso:['🔀','Pasó a otra tienda'],
  'cot-enviada':['🧾','Cotización enviada'],'cot-ok':['✅','El cliente confirmó la cotización'],'cot-no':['✖️','El cliente RECHAZÓ la cotización'],
  agregado:['➕','El cliente agregó productos'],cambiado:['✏️','El cliente cambió su pedido'],revision:['🔎','Revisando la entrega'],'recibido-tienda':['📍','Marcado como recibido por la tienda'],'uber-real':['🛵','Uber real anotado'],'sinpe-reportado':['📲','El cliente dice que pagó'],'sinpe-ok':['📲','SINPE confirmado'],
  cobro:['🧾','Cobrado'],entregado:['🛍️','Entregado'],listo:['✅','Pedido listo'],'recibido-ok':['✅','El cliente dice que ya lo recibió'],
  'recibido-no':['⚠️','El cliente dice que NO lo recibió'],'cancelado-cliente':['✖️','El cliente canceló el pedido'],
  'pos-venta':['🧾','Venta registrada en el POS'],uber:['🚗','Uber pedido'],
};
function avisoEvento(o,l){
  const [e,t]=EVT[l.tipo],quien=l.by==='cliente'?'el cliente':(l.q||'la tienda');
  const detalle=[o.cliente?.nombre,l.monto!=null?$c(l.monto):'',l.metodo||'',l.tipo==='traspaso'?'de '+sucNom(l.de)+' a '+sucNom(l.a):'','por '+quien].filter(Boolean).join(' · ');
  const nom1=String(o.cliente?.nombre||'').split(' ')[0];
  if(l.tipo==='cambiado'){
    toast(`✏️ ${nom1} cambió su pedido ${o.ref}${l.monto!=null?' · '+$c(l.monto):''}`);
    if(R.sonido)N.avisos.mostrar(`✏️ ${nom1} cambió su pedido ${o.ref}`,l.txt||detalle,{tag:'ev-'+o.id+'-cambiado',fijo:true,url:new URL('APP.html#ver='+o.id,location.href).href});
    camSin.add(o.id);guardarCamSin();campana(true);buzz([120,60,120,60,240]);return;
  }
  toast(`${e} ${o.ref} · ${t}${l.monto!=null?' · '+$c(l.monto):''}`);
  if(R.sonido)N.avisos.mostrar(`${e} ${o.ref} · ${t}`,detalle,{tag:'ev-'+o.id+'-'+l.tipo,url:new URL('APP.html#ver='+o.id,location.href).href});
  if(['cot-no','recibido-no'].includes(l.tipo))buzz([200,100,200]);
  if(['recibido-ok','recibido-no'].includes(l.tipo))campana(false);
}
// Lo que hace el cliente (confirmar o rechazar la cotización, subir el SINPE, "ya lo recibí", cancelar, agregar):
// se detecta mirando cómo cambió el pedido, así avisa igual aunque la nube no haya anotado el renglón en la bitácora.
const clVisto=new Map();
// Pedidos que el cliente cambió y la tienda todavía no abrió: se ven con la marca «cambió» hasta que se abren
const camSin=new Set(LS.get('aramo_cambios_sin_ver',[]));
function guardarCamSin(){LS.set('aramo_cambios_sin_ver',[...camSin].slice(-60));}
const instClie=o=>({conf:o.confirmacion?.por==='cliente'?o.confirmacion.at:'',rech:o.rechazo?.por==='cliente'?o.rechazo.at:'',rec:o.recibidoCliente?o.recibidoCliente.at+'|'+o.recibidoCliente.ok:'',rep:o.pago?.estado==='reportado'?(o.pago.reportado||'1'):'',comp:o.comprobante?(o.comprobante.subido||'1'):'',canc:o.estado==='cancelado'&&!o.rechazo&&/cliente/i.test(o.motivo||'')?'1':'',n:(o.items||[]).length,cam:o.ultimoCambio?.at||''});
N.lista().forEach(o=>clVisto.set(o.id,instClie(o)));
function vigilarCliente(){
  N.lista().forEach(o=>{
    const a=clVisto.get(o.id),b=instClie(o);clVisto.set(o.id,b);
    if(!a||o.archivado||!paraMi(o))return;
    const tot=N.totalDe(o),ev=[];
    if(b.conf&&b.conf!==a.conf)ev.push({tipo:'cot-ok',monto:tot});
    if(b.rech&&b.rech!==a.rech)ev.push({tipo:'cot-no',monto:+o.rechazo?.total||tot});
    if(b.rec&&b.rec!==a.rec)ev.push({tipo:o.recibidoCliente.ok?'recibido-ok':'recibido-no',monto:tot});
    if(b.canc&&b.canc!==a.canc)ev.push({tipo:'cancelado-cliente',monto:tot});
    if((b.rep&&b.rep!==a.rep)||(b.comp&&b.comp!==a.comp))ev.push({tipo:'sinpe-reportado',monto:tot,metodo:b.comp?'SINPE · con comprobante':(N.PAGOS[o.pago?.metodo]||{}).n||''});
    if(b.cam&&b.cam!==a.cam)ev.push({tipo:'cambiado',monto:tot,txt:o.ultimoCambio?.txt});
    else if(b.n>a.n&&o.estado==='nuevo')ev.push({tipo:'agregado',monto:tot});
    ev.forEach(l=>avisoEvento(o,{...l,by:'cliente'}));
  });
}
function vigilarLogs(){
  N.lista().forEach(o=>{
    const L=o.log||[],n=logVisto.get(o.id);logVisto.set(o.id,L.length);
    if(n==null||L.length<=n||o.archivado)return;
    L.slice(n).forEach(l=>{
      if(l.dev===N.DEV||l.by==='cliente'||!EVT[l.tipo])return; // lo del cliente se detecta por cómo cambió el pedido (vigilarCliente)
      const mio=paraMi(o)||(l.tipo==='traspaso'&&(R.suc==='todas'||l.de===R.suc));
      if(!mio)return;
      if(l.tipo==='traspaso'&&R.suc!=='todas'&&l.a===R.suc)return; // la tienda que lo recibe ya oye "pedido pasado a tu tienda"
      avisoEvento(o,l);
    });
  });
}
N.on(tipo=>{
  if(tipo==='encargo'){vigilar();vigilarLogs();vigilarCliente();revisarPOS();}
  if(tipo==='tienda'){clearTimeout(_vitT);_vitT=setTimeout(()=>{if(['vitrina','recetario'].includes(M.vista)&&$('moSheet').classList.contains('open')&&!document.activeElement?.matches?.('#moSheet input,#moSheet textarea'))repintar(M.vista==='vitrina'?pintarVitrina:pintarRecetario);},350);}
  pintarPuerta();pintarMostrador();
  if(M.vista==='encargo'&&$('moSheet').classList.contains('open')&&!document.activeElement?.matches?.('#moSheet input'))repintar(pintarEncargo);
  if(tipo==='encargo'&&['clientes','cliente'].includes(M.vista)&&$('moSheet').classList.contains('open')&&!document.activeElement?.matches?.('#moSheet input'))repintar(M.vista==='clientes'?pintarClientes:pintarCliente);
});
setInterval(()=>{if($('mostrador')?.classList.contains('open')&&!$('moSheet').classList.contains('open'))pintarMostrador();},30000);

// ══════════════ Arranque ══════════════
montar();
function porHash(){
  const h=location.hash;
  const enc=h.match(/^#encargo=(.+)$/),ver=h.match(/^#ver=(.+)$/);
  if(!enc&&!ver&&h!=='#mostrador')return false;
  history.replaceState(null,'',location.pathname+location.search);
  primeraVez=false;document.getElementById('scopePicker')?.classList.remove('open');document.body.classList.remove('scope-picker-open');
  if(enc){const o=N.unpack(enc[1]);if(o?.id){N.importar(o);sinAbrir.delete(o.id);guardarSinAbrir();mostrarEnLista(o.id);toast('🛎️ Pedido '+o.ref+' recibido por WhatsApp · tocalo para abrirlo');return true;}}
  if(ver){mostrarEnLista(ver[1]);return true;}
  cerrarPuerta();abrirMostrador();return true;
}
N.conectar();
document.getElementById('scopePicker')?.classList.remove('open');document.body.classList.remove('scope-picker-open');
primeraVez=false;
if(LOCAL){ // ya se eligió (y se validó) en esta sesión, por ejemplo al volver del Taller
  usarLocal(LOCAL);
  if(!porHash()){if(MODO_POS)abrirMostrador();else if(LOCAL==='todas')abrirSurtidoAmbos();else abrirPuerta();}
}
else{
  // Primero se elige el local; después sigue a donde iba (portada, pedido de WhatsApp o notificación).
  const h=location.hash;
  pedirLocal(()=>{if(h&&location.hash!==h)history.replaceState(null,'',location.pathname+location.search+h);if(!porHash()){if(MODO_POS)abrirMostrador();else if(LOCAL==='todas')abrirSurtidoAmbos();else abrirPuerta();}});
}
window.addEventListener('hashchange',porHash);
$('puFoto')?.remove(); // la foto del arranque ya no hace falta: la portada de verdad está lista
{const p=window.__puPend;delete window.__puPend;if(['surtido','canasta','pos','mostrador'].includes(p)&&$('puerta')?.classList.contains('open'))ACT[p]();}
navigator.serviceWorker?.addEventListener?.('message',e=>{if(e.data?.tipo==='abrir'&&e.data.id)mostrarEnLista(e.data.id);});
N.avisos.insignia(sinAbrir.size);
if(sinAbrir.size)repetirAlarma();
setTimeout(sincronizarPOS,3000);setInterval(sincronizarPOS,60000);
setTimeout(revisarPOS,1200); // una contraseña del POS que quedó guardada mientras la app estaba cerrada
window.AramoPuerta={abrirPuerta,abrirSurtidoAmbos,abrirMostrador,pintarMostrador,abrirCobro,autoPrecios,R};
})();
