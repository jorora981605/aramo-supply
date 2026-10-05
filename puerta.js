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
const MODO_POS=POS||/[?&]pos=1/.test(location.search);
const $c=N.colones;
const T=()=>N.tienda();
const suc=k=>(T().sucursales||[]).find(s=>s.k===k);
const sucNom=k=>{const s=suc(k);return s?`${s.n} · ${s.zona}`:'';};
const fh=d=>new Date(d).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});
function fdia(d){const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);const n=Math.round((b-a)/864e5);return n===0?'hoy':n===1?'mañana':n===-1?'ayer':b.toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'});}
const esHoy=d=>fdia(d)==='hoy';
function fq(n){n=+n||0;if(Number.isInteger(n))return String(n);const w=Math.floor(n),f=+(n-w).toFixed(2),fr={.25:'¼',.5:'½',.75:'¾'}[f];return fr?(w||'')+fr:String(+n.toFixed(2));}
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
  // Abre la app de Uber con el destino del cliente ya puesto (universal link de Uber).
  const s=suc(o.sucursal),e=o.retiro.envio,q=['action=setPickup'];
  if(s?.lat&&s?.lng)q.push('pickup[latitude]='+s.lat,'pickup[longitude]='+s.lng,'pickup[nickname]='+encodeURIComponent(s.n+' '+s.zona));
  else q.push('pickup=my_location');
  q.push('dropoff[latitude]='+e.lat,'dropoff[longitude]='+e.lng,'dropoff[nickname]='+encodeURIComponent(o.cliente.nombre+' · '+o.ref));
  if(e.senas)q.push('dropoff[formatted_address]='+encodeURIComponent(e.senas));
  return 'https://m.uber.com/ul/?'+q.join('&');
}
function abrir(url){const w=window.open(url,'_blank','noopener');if(!w)location.href=url;}
let _tt=0;
function toast(m){let t=$('moToast');if(!t){t=document.createElement('div');t.id='moToast';t.className='mo-toast';t.setAttribute('role','status');document.body.appendChild(t);}t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2800);}
function campana(fuerte){
  if(!R.sonido)return;
  try{const a=new (window.AudioContext||window.webkitAudioContext)();(fuerte?[660,880,990,1320,990,1320]:[660,880,990]).forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;o.connect(g);g.connect(a.destination);const t=a.currentTime+i*.14;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.start(t);o.stop(t+.35);});}catch{}
}

// ══════════════ Receptor (este equipo) ══════════════
const R=Object.assign({suc:'todas',sonido:true,pantalla:false},LS.get('aramo_receptor',{}));
function guardarR(){LS.set('aramo_receptor',R);}
const paraMi=o=>R.suc==='todas'||o.sucursal===R.suc;
const receptorNom=()=>R.suc==='todas'?'Ambas tiendas':sucNom(R.suc);
let _wake=null;
async function pantallaEncendida(){
  try{
    if(!R.pantalla){if(_wake){await _wake.release();_wake=null;}return;}
    if(!_wake&&navigator.wakeLock&&document.visibilityState==='visible'){_wake=await navigator.wakeLock.request('screen');_wake.addEventListener('release',()=>{_wake=null;});}
  }catch{}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pantallaEncendida();});

// ══════════════ Datos vivos del Surtido ══════════════
function surtidoResumen(){
  let prods=0;const provs=new Set();
  try{
    Object.entries(S.pedidos||{}).forEach(([prov,p])=>{
      ['moravia','angeles'].forEach(side=>{
        Object.values(p?.qtys?.[side]||{}).forEach(v=>{if(+v?.qty>0){prods++;provs.add(prov);}});
        if((p?.extras?.[side]||[]).some(x=>x&&(x.name||x.n)))provs.add(prov);
      });
    });
  }catch{}
  return{prods,provs:provs.size};
}
function costoHoy(nombre){
  // Precio más bajo que ARAMO paga hoy por ese producto en Surtido.
  try{
    const exacto=nrm(nombre),key=exacto.split(' ')[0];let best=null;
    Object.entries(getAllProviders()).forEach(([prov,d])=>{
      if(d?.deleted)return;
      (d.products||[]).forEach(p=>{
        const pn=nrm(p.name);
        if(pn===exacto||pn.split(/\s+/)[0]===key){const pr=+getPrice(prov,p.id)||0;if(pr>0&&(!best||pr<best.pr))best={pr,prov,u:p.unit};}
      });
    });
    return best;
  }catch{return null;}
}
const precioAuto=(costo,margen)=>Math.ceil(costo*(1+(+margen||0)/100)/25)*25;
// Precio automático: si un producto está en 🤖, su precio sigue al costo de Surtido + margen.
let _autoT=0;
function autoPrecios(){
  clearTimeout(_autoT);
  _autoT=setTimeout(()=>{
    const t=T(),ed=t.prods||{},precios={...(t.precios||{})};let cambios=0;
    N.catalogo().forEach(p=>{
      if(!ed[p.k]?.auto)return;
      const c=costoHoy(p.n);if(!c)return;
      const v=precioAuto(c.pr,t.margen??35);
      if(+precios[p.k]!==v){precios[p.k]=v;cambios++;}
    });
    if(cambios){N.guardarTienda({precios});toast(`🤖 ${cambios} precio${cambios>1?'s':''} actualizado${cambios>1?'s':''} con el costo de hoy`);}
  },600);
}
if(typeof window.setPrice==='function'){const _sp=window.setPrice;window.setPrice=function(){const r=_sp.apply(this,arguments);autoPrecios();return r;};}

// ══════════════ Encargos ══════════════
const activos=()=>N.lista().filter(o=>!['entregado','cancelado'].includes(o.estado));
const cerradosHoy=()=>N.lista().filter(o=>['entregado','cancelado'].includes(o.estado)&&esHoy(o.updated));
function avance(o){const it=o.items||[],r=it.filter(x=>x.estado==='listo'||x.estado==='nohay').length;return{r,n:it.length};}
const urgente=o=>o.estado!=='listo'&&minsA(o.retiro.at)<=15;
const cobrado=o=>!!o.cobro||o.pago?.estado==='verificado';
const qReal=it=>it.qr!=null&&it.qr!==''?+it.qr:+it.q;
const precioIt=it=>it.pr!=null&&it.pr!==''?+it.pr:+it.p;
const nombres=o=>(o.items||[]).map(i=>i.n).join(', ');

// ══════════════ Estado de pantalla ══════════════
const M={tab:'nuevo',suc:R.suc,abierto:null,pin:'',vista:null,vq:'',vcat:'todos',edit:null,rec:null,cobro:null};
let primeraVez=true;
const sinAbrir=new Set(LS.get('aramo_sin_abrir',[]));
function guardarSinAbrir(){LS.set('aramo_sin_abrir',[...sinAbrir]);N.avisos.insignia(sinAbrir.size);}

// ══════════════ Montaje ══════════════
function montar(){
  const pu=document.createElement('div');
  pu.className='pu';pu.id='puerta';pu.setAttribute('role','dialog');pu.setAttribute('aria-label','ARAMO');
  pu.innerHTML=`<div class="pu-in">
    <div class="pu-head"><div><div class="pu-brand">ARAMO</div><div class="pu-date" id="puDate"></div></div><button type="button" class="pu-nube" id="puNube" data-pu="compartir"><i></i><span></span></button></div>
    <div id="puAlarma"></div>
    <h1 class="pu-h1" id="puH1">¿Qué abrimos?</h1><p class="pu-sub">Las dos caras de ARAMO: lo que pedimos y lo que nos piden.</p>
    <div class="pu-caras">
      <button type="button" class="pu-cara" data-pu="surtido" style="--c:var(--g)" aria-label="Abrir Surtido">
        <div class="pu-ventana"><div class="pu-barra"><i></i><i></i><i></i><span>Surtido</span></div><div class="pu-vista" id="puMiniS"></div><div class="pu-glow"><span class="pu-abrir">Abrir Surtido</span></div></div>
        <div class="pu-info"><b>🚚 Surtido</b><small>Lo que ARAMO le pide a sus proveedores</small><span class="pu-stat" id="puStatS"></span></div>
      </button>
      <button type="button" class="pu-cara" data-pu="canasta" style="--c:var(--o)" aria-label="Abrir Taller de pedidos">
        <div class="pu-ventana"><div class="pu-barra"><i></i><i></i><i></i><span>Taller de pedidos</span></div><div class="pu-vista" id="puMiniC"><iframe title="Vista del Taller" src="canasta.html?mini=1&tema=${document.documentElement.dataset.theme==='dark'?'dark':'light'}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></div><div class="pu-glow"><span class="pu-abrir">Abrir Taller</span></div></div>
        <div class="pu-info"><b>🧺 Taller</b><small>Donde los clientes arman su pedido, de punta a punta</small><span class="pu-stat o" id="puStatC"></span></div>
      </button>
    </div>
    <button type="button" class="pu-mostrador" data-pu="mostrador"><span class="ic">🛎️</span><span class="tx"><strong>Mostrador y Caja</strong><small id="puMoSub">Recibir, alistar, cobrar y entregar</small></span><span class="nn" id="puMoN" hidden></span><span style="font-size:22px;color:var(--m)">›</span></button>
    <div class="pu-flujo"><h3>Todo el ciclo, conectado</h3><div class="pu-cadena" id="puCadena"></div></div>
  </div>`;
  document.body.appendChild(pu);

  const mo=document.createElement('div');
  mo.className='mo';mo.id='mostrador';mo.setAttribute('role','dialog');mo.setAttribute('aria-label','Mostrador');
  mo.innerHTML=`<div class="mo-top"><button type="button" class="bk" data-mo="puerta" aria-label="Volver a ARAMO">‹</button><div class="mo-title"><small id="moSub">ARAMO · Taller</small><b>Mostrador</b></div><button type="button" class="mo-recep" id="moRecep" data-mo="receptor"></button><button type="button" class="pu-nube" id="moNube" data-mo="compartir"><i></i><span></span></button></div>
    <div class="mo-in"><div class="mo-cols"><div class="mo-main">
      <div id="moAlarma"></div><div id="moAvisos"></div><div id="moAhora"></div><div class="mo-tabs" id="moTabs"></div><div class="mo-lista" id="moLista"></div><div id="moFaltan"></div>
      <div class="mo-herr">
        <button type="button" data-mo="caja"><b>🧾</b>Caja de hoy</button>
        <button type="button" data-mo="vitrina"><b>🏷️</b>Precios y productos</button>
        <button type="button" data-mo="recetario"><b>📖</b>Recetario</button>
        <button type="button" data-mo="whatsapp"><b>📥</b>Pedido de WhatsApp</button>
        <button type="button" data-mo="ajustes"><b>⚙️</b>Pagos y horarios</button>
        <button type="button" data-mo="compartir"><b>📣</b>Compartir Taller</button>
        <button type="button" data-mo="receptor"><b>📡</b>Este receptor</button>
        <button type="button" data-mo="prueba"><b>🧪</b>Pedido de prueba</button>
      </div></div>
      <aside class="mo-caja" id="moCaja" aria-label="Caja"></aside></div></div>`;
  document.body.appendChild(mo);

  const bg=document.createElement('div');bg.className='mo-bg';bg.id='moBg';document.body.appendChild(bg);
  const sh=document.createElement('div');sh.className='mo-sheet';sh.id='moSheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');document.body.appendChild(sh);
  const pr=document.createElement('div');pr.id='moPrint';pr.setAttribute('aria-hidden','true');document.body.appendChild(pr);
  bg.addEventListener('click',cerrarHoja);

  const top=document.querySelector('.topbar');
  if(top&&!$('puHome')){const b=document.createElement('button');b.type='button';b.className='pu-home';b.id='puHome';b.setAttribute('aria-label','Volver a ARAMO');b.textContent='⌂';b.addEventListener('click',()=>abrirPuerta());top.insertBefore(b,top.firstChild);}
  window.addEventListener('resize',escalarMinis);

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
function pintarPuerta(){
  if(!$('puerta'))return;
  const h=new Date().getHours();
  $('puH1').textContent=(h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches')+', ¿qué abrimos?';
  const fd=new Date().toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'});$('puDate').textContent=fd.charAt(0).toUpperCase()+fd.slice(1);
  $('puAlarma').innerHTML=alarmaHtml().replace('data-mo="abrir"','data-pu="abrir"');
  const s=surtidoResumen();
  $('puStatS').textContent=s.prods?`🧺 ${s.prods} producto${s.prods===1?'':'s'} · ${s.provs} proveedor${s.provs===1?'':'es'}`:'Pedido de hoy vacío';
  const a=activos().filter(paraMi),nuevos=a.filter(o=>o.estado==='nuevo').length,listos=a.filter(o=>o.estado==='listo').length;
  $('puStatC').textContent=a.length?`🛎️ ${a.length} pedido${a.length>1?'s':''} en curso`:'Lista para recibir pedidos';
  $('puMoN').hidden=!nuevos;$('puMoN').textContent=nuevos;
  $('puMoSub').textContent=`📡 ${receptorNom()} · `+(a.length?`${nuevos} nuevos · ${a.filter(o=>o.estado==='alistando').length} alistando · ${listos} por entregar`:'recibir, alistar, cobrar y entregar');
  const cob=cerradosHoy().filter(o=>o.estado==='entregado'&&paraMi(o));
  const ventas=cob.reduce((t,o)=>t+N.totalDe(o),0);
  const pasos=[['🏪','Proveedores',s.provs||'—'],['🚚','Surtido',s.prods?s.prods+' prod.':'—'],['🏷️','Vitrina',N.catalogo().filter(p=>!p.oculto).length+' prod.'],['🧺','Taller',a.length+' en curso'],['🛎️','Mostrador',listos+' listos'],['🧾','Caja',cob.length?$c(ventas):'₡0 hoy']];
  $('puCadena').innerHTML=pasos.map((p,i)=>`${i?'<span class="pu-flecha">›</span>':''}<div class="pu-eslabon"><b>${p[0]}</b>${p[1]}<em>${esc(p[2])}</em></div>`).join('');
  pintarNube();
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
function abrirPuerta(){
  cerrarHoja();
  $('mostrador').classList.remove('open');
  $('puerta').classList.remove('zoom');$('puerta').classList.add('open');document.body.classList.add('pu-lock');
  $('puerta').scrollTop=0;
  pintarPuerta();clonarSurtido();autoPrecios();
  requestAnimationFrame(escalarMinis);
}
function cerrarPuerta(){$('puerta').classList.remove('open','zoom');document.body.classList.remove('pu-lock');}
function entrar(cara,el){
  const pu=$('puerta'),v=el?.querySelector('.pu-ventana');
  if(v){const r=v.getBoundingClientRect(),inn=pu.querySelector('.pu-in');inn.style.transformOrigin=`${r.left+r.width/2}px ${r.top+r.height/2+pu.scrollTop}px`;inn.style.transform='scale(2.4)';pu.classList.add('zoom');}
  buzz(12);
  setTimeout(()=>{
    pu.querySelector('.pu-in').style.transform='';
    if(cara==='surtido'){cerrarPuerta();if(primeraVez&&typeof openScopePicker==='function')openScopePicker();}
    else if(cara==='canasta'){location.href='canasta.html';return;}
    else if(cara==='mostrador'){cerrarPuerta();abrirMostrador();}
    primeraVez=false;
  },v?330:0);
}

// ══════════════ Mostrador ══════════════
function abrirMostrador(id){
  $('mostrador').classList.add('open');document.body.classList.add('pu-lock');
  pintarMostrador();autoPrecios();pantallaEncendida();
  if(id)abrirEncargo(id);
}
const filtrar=L=>L.filter(o=>M.suc==='todas'||o.sucursal===M.suc);
function pintarMostrador(){
  if(!$('mostrador')?.classList.contains('open'))return;
  pintarNube();
  $('moRecep').innerHTML=`📡 <span>${esc(receptorNom())}</span>`;
  $('moSub').textContent=POS?'ARAMO POS · Pedidos':'ARAMO · Taller';
  $('moAlarma').innerHTML=alarmaHtml();
  const perm=N.avisos.permiso();
  $('moAvisos').innerHTML=N.avisos.soportado()&&perm!=='granted'
    ?`<button type="button" class="mo-activar" data-mo="avisos-on"><span>🔔</span><span><b>Activá los avisos en este equipo</b><small>${perm==='denied'?'Están bloqueados en el navegador: permitilos en la configuración del sitio.':'Te suena y te llega una notificación con cada pedido nuevo.'}</small></span></button>`:'';
  const A=filtrar(activos()),H=filtrar(cerradosHoy());
  const grupos={nuevo:A.filter(o=>o.estado==='nuevo'),alistando:A.filter(o=>o.estado==='alistando'),listo:A.filter(o=>o.estado==='listo'),hecho:H};
  Object.values(grupos).forEach(L=>L.sort((a,b)=>Date.parse(a.retiro.at)-Date.parse(b.retiro.at)));
  const urg=[...grupos.nuevo,...grupos.alistando].find(urgente);
  const pagoRep=A.find(o=>o.pago?.estado==='reportado'&&!cobrado(o));
  let ah;
  if(urg)ah=['⏰','Se atrasa',`${urg.ref} · ${urg.cliente.nombre} ${urg.retiro.envio?'sale':'recoge'} ${falta(urg.retiro.at)}`,urg.id];
  else if(grupos.nuevo[0])ah=['📥','Aceptá el pedido',`${grupos.nuevo[0].ref} · ${grupos.nuevo[0].cliente.nombre} · ${grupos.nuevo[0].items.length} productos`,grupos.nuevo[0].id];
  else if(pagoRep)ah=['📲','Revisá el SINPE',`${pagoRep.ref} · ${$c(N.totalDe(pagoRep))}`,pagoRep.id];
  else if(grupos.listo[0])ah=['🛍️','Por entregar y cobrar',`${grupos.listo[0].ref} · ${grupos.listo[0].cliente.nombre} · ${falta(grupos.listo[0].retiro.at)}`,grupos.listo[0].id];
  $('moAhora').innerHTML=ah?`<button type="button" class="mo-ahora" data-mo="abrir" data-id="${ah[3]}"><span class="e">${ah[0]}</span><span class="t"><small>Ahora</small><strong>${esc(ah[1])}: ${esc(ah[2])}</strong></span><span class="go">Abrir</span></button>`
    :`<div class="mo-ahora calma"><span class="e">☕</span><span class="t"><small>Ahora · ${esc(receptorNom())}</small><strong>Todo al día. Los pedidos nuevos suenan y aparecen aquí solos.</strong></span></div>`;
  const tabs=[['nuevo','Nuevos'],['alistando','Alistando'],['listo','Listos'],['hecho','Hoy']];
  $('moTabs').innerHTML=tabs.map(([k,n])=>`<button type="button" class="mo-tab${M.tab===k?' on':''}" data-mo="tab" data-k="${k}"><b>${grupos[k].length}</b>${n}</button>`).join('');
  const L=grupos[M.tab];
  $('moLista').innerHTML=L.length?L.map(tarjeta).join(''):`<div class="mo-vacio"><b>${{nuevo:'📭',alistando:'🧺',listo:'✅',hecho:'🌙'}[M.tab]}</b>${{nuevo:'Sin pedidos nuevos.',alistando:'Nada alistándose ahora.',listo:'Nada esperando entrega.',hecho:'Todavía no se ha entregado nada hoy.'}[M.tab]}${M.tab==='nuevo'?'<br><br><button type="button" class="mo-btn" data-mo="prueba">🧪 Probar con un pedido de prueba</button>':''}</div>`;
  const falt=[...new Map(A.concat(H).flatMap(o=>(o.items||[]).filter(i=>i.estado==='nohay').map(i=>[i.k,i]))).values()];
  $('moFaltan').innerHTML=falt.length?`<div class="mo-faltan"><h4>🚚 No hubo hoy: pedirlo en Surtido</h4><div>${falt.map(i=>`<button type="button" class="mo-chip" data-mo="surtir" data-n="${esc(i.n)}">${i.e} ${esc(i.n)}</button>`).join('')}</div></div>`:'';
  pintarCaja();
}
function tarjeta(o){
  const s=suc(o.sucursal),{r,n}=avance(o),P=N.PAGOS[o.pago?.metodo]||{},tarde=minsA(o.retiro.at)<0&&o.estado!=='entregado';
  const pago=o.cobro?`<span class="mo-pill g">🧾 Cobrado ${esc(N.PAGOS[o.cobro.metodo]?.n||'')}</span>`:o.pago?.estado==='verificado'?'<span class="mo-pill g">✓ Pagado</span>':o.pago?.estado==='reportado'?'<span class="mo-pill o">📲 Dice que pagó</span>':`<span class="mo-pill">${P.e||''} ${esc(P.n||'')}</span>`;
  const arrastrable=!['entregado','cancelado'].includes(o.estado);
  return `<button type="button" class="mo-card${urgente(o)?' urg':''}${sinAbrir.has(o.id)?' nuevo-flash':''}" data-mo="abrir" data-id="${o.id}" ${arrastrable?'draggable="true"':''}>
    <div class="mo-card-h"><span class="mo-ref">${esc(o.ref)}</span>${o.prueba?'<span class="mo-pill">🧪 prueba</span>':''}${sinAbrir.has(o.id)?'<span class="mo-pill o">NUEVO</span>':''}<span class="mo-when${tarde?' tarde':''}">${o.estado==='entregado'?'✓ '+fh(o.updated):o.estado==='cancelado'?'Cancelado':'🕐 '+fh(o.retiro.at)+' · '+falta(o.retiro.at)}</span></div>
    <div class="mo-who">${esc(o.cliente.nombre)} <span style="color:var(--m);font-weight:700">· ${esc(fmtTel(o.cliente.tel))}</span></div>
    <div class="mo-meta">${esc(s?.n||'')} · ${o.retiro.envio?(o.retiro.envio.uber?'🛵 Uber en camino':'🛵 envío Uber'):o.retiro.carro?'🚗 al carro'+(o.retiro.placa?' ('+esc(o.retiro.placa)+')':''):'🚶 adentro'} · ${n} productos</div>
    <div class="mo-nombres">${o.items.map(i=>`<span>${i.e} ${esc(i.n)} <i>${esc(qtxt(qReal(i),i.u))}</i></span>`).join('')}</div>
    ${o.estado==='alistando'?`<div class="mo-bar"><i style="width:${n?r/n*100:0}%"></i></div>`:''}
    <div class="mo-foot">${pago}${o.sust==='avisar'?'':`<span class="mo-pill">${SUST[o.sust]}</span>`}<span class="mo-total">${N.esAprox(o)?'~':''}${$c(N.totalDe(o))}</span></div>
  </button>`;
}

// ── Caja (columna en computadora; hoja en el celular) ──
function cobrosHoy(){return N.lista().filter(o=>o.cobro&&esHoy(o.cobro.fecha)&&(M.suc==='todas'||o.sucursal===M.suc));}
function resumenCaja(){
  const L=cobrosHoy(),t={efectivo:0,tarjeta:0,sinpe:0,link:0};
  L.forEach(o=>{t[o.cobro.metodo]=(t[o.cobro.metodo]||0)+(+o.cobro.total||0);});
  return{L,t,total:L.reduce((s,o)=>s+(+o.cobro.total||0),0)};
}
function pintarCaja(){
  const el=$('moCaja');if(!el)return;
  const {L,t,total}=resumenCaja(),listos=filtrar(activos()).filter(o=>o.estado==='listo'&&!o.cobro);
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

// ══════════════ Hojas ══════════════
function abrirHoja(html){
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
  M.abierto=id;M.vista='encargo';M.pin='';
  if(sinAbrir.delete(id))guardarSinAbrir();
  pintarEncargo();pintarMostrador();pintarPuerta();
}
function msgCliente(o){
  const s=suc(o.sucursal),t=T(),tot=N.totalDe(o),link=N.enlace('canasta.html','e',o);
  const hola=`¡Hola ${o.cliente.nombre.split(' ')[0]}! 👋`;
  if(o.estado==='listo'){
    const pago=o.pago.metodo==='sinpe'&&!cobrado(o)
      ?`\n📲 Pagá ${$c(tot)} por SINPE Móvil${telDig(t.sinpe?.numero)?' al '+fmtTel(t.sinpe.numero)+(t.sinpe.nombre?' ('+t.sinpe.nombre+')':''):''} con la descripción ${o.ref}.`
      :o.pago.metodo==='link'&&t.linkTarjeta?`\n🔗 Pagá con tarjeta aquí: ${t.linkTarjeta}`:`\n💳 Total exacto: ${$c(tot)} (${(N.PAGOS[o.pago.metodo]?.n||'').toLowerCase()}).`;
    const sin=o.items.filter(i=>i.estado==='nohay');
    const donde=o.retiro.envio?(o.retiro.envio.uber?' y ya va en camino con Uber 🛵':'; ya pedimos el Uber a tu ubicación 🛵'):` en ${s?.n||'ARAMO'} (${s?.zona||''})`;
    return `${hola}\n✅ Tu canasta ${o.ref} está *lista*${donde}.\n⚖️ Ya pesamos todo: el total exacto es ${$c(tot)}.${o.retiro.envio&&+o.retiro.envio.costo?` (incluye envío de ${$c(o.retiro.envio.costo)})`:''}${pago}${sin.length?`\n⚠️ No hubo: ${sin.map(i=>i.n+(i.sub?' → '+i.sub:'')).join(', ')}.`:''}${o.retiro.envio?'':'\n🧾 Mostrá tu código de retiro al llegar.'}\n\nSeguí tu pedido aquí 👉 ${link}`;
  }
  if(o.estado==='alistando')return `${hola}\n🧑‍🌾 Ya estamos escogiendo tu canasta ${o.ref}. Te avisamos cuando esté lista.\n\nSeguila aquí 👉 ${link}`;
  if(o.estado==='entregado')return `${hola}\n🛍️ ¡Gracias por comprar en ${t.nombre||'ARAMO'}! Tu pedido ${o.ref} quedó entregado${o.cobro?` (pagado ${$c(o.cobro.total)})`:''}.`;
  if(o.estado==='cancelado')return `${hola}\nTu pedido ${o.ref} quedó cancelado${o.motivo?': '+o.motivo:''}. Cualquier cosa nos escribís.`;
  return `${hola}\n📥 Recibimos tu pedido ${o.ref}. Seguilo aquí 👉 ${link}`;
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
    <span class="t"><strong>${esc(it.n)}</strong><small>Pidió ${esc(qtxt(it.q,it.u))} · <button type="button" class="mo-precio" data-mo="precio-it" data-i="${i}" ${edit?'':'disabled'}>${$c(pr)}${kgU?'/kg':' c/u'}</button>${it.mad?' · '+esc(MAD[it.mad]||''):''}${it.nota?' · 📝 '+esc(it.nota):''}</small>${difTxt}${alerta}</span>
    ${edit?`<span class="mo-peso"><label><small>${kgU?'Pesó (kg)':'Cantidad'}</small><input type="number" inputmode="decimal" step="${kgU?'0.005':'1'}" min="0" value="${esc(pesado?q:'')}" placeholder="${esc(fq(it.q))}" data-mo-q="${i}" aria-label="${kgU?'Peso real':'Cantidad real'} de ${esc(it.n)}"></label><b>${it.estado==='nohay'?'—':$c(sub)}</b></span><button type="button" class="mo-ck${it.estado==='listo'?' on':''}" data-mo="it-ok" data-i="${i}" aria-label="Listo">✓</button><button type="button" class="mo-ck no${it.estado==='nohay'?' on':''}" data-mo="it-no" data-i="${i}" aria-label="No hay">✕</button>`
      :`<span class="mo-peso"><small>${it.estado==='nohay'?'No hubo':kgU&&pesado?'Pesó':'Lleva'}</small><b>${it.estado==='nohay'?'—':esc(kgU&&pesado?kg(q)+' kg':qtxt(q,it.u))}</b><em>${it.estado==='nohay'?'₡0':$c(sub)}</em></span>`}
    ${edit&&it.estado==='nohay'?`<input class="sub" type="text" placeholder="Cambio por… (opcional)" value="${esc(it.sub||'')}" data-mo-sub="${i}">`:''}
  </div>`;
}
function pintarEncargo(){
  const o=N.get(M.abierto);if(!o){cerrarHoja();return;}
  if(M.vista==='pin')return pintarPin(o);
  if(M.vista==='cobro')return pintarCobro(o);
  if(M.vista==='tiquete')return pintarTiquete(o);
  const s=suc(o.sucursal),{r,n}=avance(o),P=N.PAGOS[o.pago?.metodo]||{},tot=N.totalDe(o),edit=o.estado==='alistando';
  const estadoTxt={nuevo:'📥 Nuevo',alistando:'🧑‍🌾 Alistando',listo:'✅ Listo',entregado:'🛍️ Entregado',cancelado:'✖️ Cancelado'}[o.estado];
  const pesoR=o.items.reduce((t,i)=>t+(i.u==='kg'&&i.estado==='listo'?qReal(i):0),0);
  const est=N.redondear5(o.items.reduce((t,i)=>t+(+i.q)*(+i.p),0)),dif=tot-est-(+o.retiro?.envio?.costo||0);
  const verd={nuevo:['Nuevo','run'],alistando:[`Alistando ${r}/${n}`,'run'],listo:[o.cobro?'Cobrado':'Listo','ok'],entregado:['Entregado','ok'],cancelado:['Cancelado','bad']}[o.estado]||['',''];
  const holo=o.items.map(i=>`<div class="mo-hit ${i.estado==='listo'?'ok':i.estado==='nohay'?'no':o.estado==='alistando'?'wait':''}" title="${esc(i.n)}"><b>${i.e}</b><em>${esc(i.n)}</em><small>${esc(i.u==='kg'&&i.qr!=null&&i.qr!==''?kg(qReal(i))+' kg':qtxt(qReal(i),i.u))}</small></div>`).join('');
  let acc='';
  if(o.estado==='nuevo')acc=`<button type="button" class="mo-btn p w" data-mo="aceptar">🧑‍🌾 Aceptar y empezar a alistar</button><div class="mo-btns"><button type="button" class="mo-btn r" data-mo="rechazar">Rechazar</button><button type="button" class="mo-btn" data-mo="imprimir">🖨️ Lista para alistar</button></div>`;
  if(o.estado==='alistando')acc=`<button type="button" class="mo-btn p w" data-mo="listo" ${r<n?'disabled':''}>${r<n?(n-r===1?'Falta 1 producto por revisar':`Faltan ${n-r} productos por revisar`):'✅ Marcar lista y avisar al cliente'}</button><div class="mo-btns"><button type="button" class="mo-btn" data-mo="todo-ok">✓ Todo está</button><button type="button" class="mo-btn" data-mo="imprimir">🖨️ Lista para alistar</button></div>`;
  if(o.estado==='listo'){
    const env=o.retiro.envio;
    acc=`${o.pago.metodo==='sinpe'&&!cobrado(o)?`<button type="button" class="mo-btn o w" data-mo="pagado" style="margin-bottom:8px">📲 Confirmar SINPE de ${$c(tot)}${o.pago.estado==='reportado'?' (el cliente dice que pagó)':''}</button>`:''}
      ${env?(env.uber?'':'<button type="button" class="mo-btn o w" style="margin-bottom:8px" data-mo="uber">🚗 Pedir Uber</button>')+'<button type="button" class="mo-btn p w" data-mo="entregado-uber">🛍️ El cliente ya la recibió</button>'
        :`<button type="button" class="mo-btn p w" data-mo="entregar">🛍️ Entregar ${cobrado(o)?'':'y cobrar '}con código</button>`}
      <div class="mo-btns">${cobrado(o)?'<button type="button" class="mo-btn" data-mo="tiquete">🧾 Tiquete</button>':`<button type="button" class="mo-btn" data-mo="cobrar" data-id="${o.id}">🧾 Cobrar sin entregar</button>`}<button type="button" class="mo-btn" data-mo="volver-alistar">↩︎ Volver a alistar</button></div>`;
  }
  if(o.estado==='entregado')acc=`<div class="mo-btns">${o.cobro?'<button type="button" class="mo-btn" data-mo="tiquete">🧾 Tiquete</button>':''}<button type="button" class="mo-btn" data-mo="wa">💬 Escribirle</button></div>`;
  if(o.estado==='cancelado')acc=`<button type="button" class="mo-btn w" data-mo="wa">💬 Escribirle</button>`;
  abrirHoja(`<p class="mo-kick">Pedido · mesa de trabajo · ${esc(sucNom(o.sucursal))}</p><div class="mo-hrow"><div class="mo-h">${esc(o.ref)} ${o.prueba?'<span class="mo-pill">🧪 prueba</span>':''}</div><span class="mo-verd ${verd[1]}">${esc(verd[0])}</span></div><div class="mo-s">${estadoTxt} · sellado ${fdia(o.created)} ${fh(o.created)}</div>
    <div class="mo-stage${o.estado==='alistando'?' run':''}"><span class="mo-tag">Lo que ve el cliente · en vivo</span><div class="mo-scan"></div><div class="mo-holo">${holo}</div></div>
    <div class="mo-metrics"><div><span>Revisados</span><b>${r}/${n}</b></div><div><span>Peso real</span><b>${pesoR?kg(pesoR)+' kg':'—'}</b></div><div><span>${N.esAprox(o)?'Total aprox.':'Total exacto'}</span><b>${$c(tot)}</b></div></div>
    <div class="mo-blk"><h4>Productos · pesá cada uno · si algo no hay: ${SUST[o.sust]||''}</h4>${o.items.map((it,i)=>pesoHtml(it,i,edit)).join('')}
      ${Math.abs(dif)>=5&&o.estado!=='nuevo'?`<div class="mo-tot m"><span>Ajuste por peso real (vs. ${$c(est)} aprox.)</span><span>${dif>0?'+':'−'}${$c(Math.abs(dif))}</span></div>`:''}
      ${o.retiro.envio&&+o.retiro.envio.costo?`<div class="mo-tot m"><span>🛵 Envío Uber</span><span>${$c(o.retiro.envio.costo)}</span></div>`:''}
      <div class="mo-tot"><span>${N.esAprox(o)?'Total aproximado':'Total exacto'}</span><b>${$c(tot)}</b></div>${o.nota?`<div class="mo-s" style="margin-top:8px">📝 ${esc(o.nota)}</div>`:''}</div>
    <div style="margin-top:14px">${acc}</div>
    <div class="mo-blk"><h4>Cliente</h4><div class="mo-row"><span style="flex:1"><strong style="font-size:16px">${esc(o.cliente.nombre)}</strong><br><small style="color:var(--m)">${esc(fmtTel(o.cliente.tel))}</small></span><a class="mo-btn" href="tel:${esc(telDig(o.cliente.tel))}" aria-label="Llamar">📞</a><button type="button" class="mo-btn" data-mo="wa" aria-label="WhatsApp">💬</button></div></div>
    ${o.retiro.envio?envioHtml(o):`<div class="mo-blk"><h4>Retiro</h4><div style="font-weight:900">${esc(sucNom(o.sucursal))}</div><div class="mo-s">${fdia(o.retiro.at)} a las ${fh(o.retiro.at)} (${falta(o.retiro.at)}) · ${o.retiro.carro?'🚗 al carro'+(o.retiro.placa?': '+esc(o.retiro.placa):''):'🚶 adentro'}</div></div>`}
    <div class="mo-blk"><h4>Pago</h4><div style="font-weight:900">${P.e||''} ${esc(P.n||'')} ${o.cobro?`<span class="mo-pill g">🧾 cobrado ${$c(o.cobro.total)}${o.cobro.venta?' · '+esc(o.cobro.venta):''}</span>`:o.pago.estado==='verificado'?'<span class="mo-pill g">✓ pagado</span>':o.pago.estado==='reportado'?'<span class="mo-pill o">el cliente dice que pagó</span>':'<span class="mo-pill">pendiente</span>'}</div>${o.pago.conCuanto?`<div class="mo-s">Paga con ${$c(o.pago.conCuanto)} → vuelto ${$c(Math.max(0,o.pago.conCuanto-tot))}</div>`:''}</div>
    <details class="mo-blk"><summary style="font-weight:900;font-size:13px">🧾 Bitácora del pedido</summary><div class="mo-log" style="margin-top:8px">${(o.log||[]).map(l=>`${fdia(l.t)} ${fh(l.t)} · ${l.by==='cliente'?'👤':'🛎️'} ${esc(l.m||{nuevo:'Recibido',alistando:'Empezó a alistarse',listo:'Quedó lista',entregado:'Entregado',cancelado:'Cancelado'}[l.s]||l.s)}`).join('<br>')}</div></details>`);
  $('moSheet').querySelectorAll('[data-mo-q]').forEach(inp=>inp.addEventListener('change',()=>{
    const i=+inp.dataset.moQ,v=inp.value===''?null:Math.max(0,+String(inp.value).replace(',','.'));
    N.cambiar(o.id,x=>{const it=x.items[i];it.qr=v;if(v===0)it.estado='nohay';else if(v!=null&&it.estado!=='nohay')it.estado='listo';},'tienda').then(()=>{repintar(pintarEncargo);pintarMostrador();});
  }));
  $('moSheet').querySelectorAll('[data-mo-sub]').forEach(inp=>inp.addEventListener('change',()=>{const i=+inp.dataset.moSub;N.cambiar(o.id,x=>{x.items[i].sub=inp.value.trim();},'tienda');}));
  const ce=$('moEnvio');if(ce)ce.addEventListener('change',()=>{const v=Math.max(0,+ce.value||0);N.cambiar(o.id,x=>{if(x.retiro.envio)x.retiro.envio.costo=v;},'tienda','Envío Uber: '+$c(v)).then(()=>{repintar(pintarEncargo);pintarMostrador();});});
}
function envioHtml(o){
  const e=o.retiro.envio,s=suc(o.sucursal),d=.003;
  return `<div class="mo-blk"><h4>🛵 Envío con Uber</h4>
    <iframe class="mo-mapa" title="Ubicación del cliente" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${e.lng-d},${e.lat-d},${e.lng+d},${e.lat+d}&layer=mapnik&marker=${e.lat},${e.lng}"></iframe>
    <div class="mo-s" style="margin-top:8px">Sale de ${esc(s?.n||'')} ${fdia(o.retiro.at)} a las ${fh(o.retiro.at)} (${falta(o.retiro.at)})${e.acc?` · ubicación ±${e.acc} m`:''}</div>
    ${e.senas?`<div style="margin-top:6px;font-weight:800">📝 ${esc(e.senas)}</div>`:''}
    ${e.uber?`<div class="mo-s" style="margin-top:6px;color:var(--g);font-weight:900">✓ Uber pedido a las ${fh(e.uber)}</div>`:''}
    <button type="button" class="mo-btn p w" style="margin-top:10px" data-mo="uber">🚗 ${e.uber?'Abrir Uber de nuevo':'Pedir Uber a esta ubicación'}</button>
    <div class="mo-btns"><a class="mo-btn" href="${mapaUrl(e)}" target="_blank" rel="noopener">🗺️ Ver en mapa</a><button type="button" class="mo-btn" data-mo="copiar" data-v="${esc(mapaUrl(e)+(e.senas?' · '+e.senas:''))}">📋 Copiar dirección</button></div>
    <label class="mo-field">Costo del envío (se suma al total)<input type="number" inputmode="numeric" min="0" step="50" placeholder="Ej.: 1800" value="${+e.costo||''}" id="moEnvio"></label>
    ${s?.lat?'':'<div class="mo-s" style="margin-top:6px">💡 Uber toma como salida donde estás. Para fijar la tienda: ⚙️ Pagos y horarios → "Guardar ubicación de la tienda".</div>'}</div>`;
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
  const o=N.get(id);if(!o)return;
  if(o.estado==='nuevo'||o.estado==='alistando'){toast('Primero alistalo y pesalo: el cobro sale del peso real');abrirEncargo(id);return;}
  if(o.estado==='cancelado'){toast('Ese pedido está cancelado');return;}
  M.abierto=id;
  const ya=o.pago?.estado==='verificado'?o.pago.metodo:null;
  M.cobro={metodo:ya||o.pago?.metodo||'efectivo',recibido:o.pago?.conCuanto||0,entregar:opc.entregar??(opc.arrastre||o.estado==='listo'),codigo:'',desdePin:!!opc.desdePin};
  M.vista='cobro';pintarEncargo();
}
function pintarCobro(o){
  const c=M.cobro,tot=N.totalDe(o),vuelto=c.metodo==='efectivo'?Math.max(0,(+c.recibido||0)-tot):0;
  const billetes=[...new Set([tot,...[1000,2000,5000,10000,20000].map(b=>Math.ceil(tot/b)*b)])].filter(v=>v>=tot).sort((a,b)=>a-b).slice(0,5);
  const lineas=o.items.filter(i=>i.estado!=='nohay').map(i=>`<div class="l"><span>${i.e} ${esc(i.n)} · ${esc(i.u==='kg'?kg(qReal(i))+' kg':qtxt(qReal(i),i.u))} × ${$c(precioIt(i))}</span><span>${$c(qReal(i)*precioIt(i))}</span></div>`).join('');
  abrirHoja(`<p class="mo-kick">Caja${c.desdePin?' · paso 2 de 2':''}${POS?' · ARAMO POS':''}</p><div class="mo-h">Cobrar ${esc(o.ref)}</div><div class="mo-s">${esc(o.cliente.nombre)} · ${esc(sucNom(o.sucursal))}</div>
    <div class="mo-ticket">${lineas}${o.retiro.envio&&+o.retiro.envio.costo?`<div class="l"><span>🛵 Envío Uber</span><span>${$c(o.retiro.envio.costo)}</span></div>`:''}<hr><div class="l t"><span>TOTAL EXACTO</span><span>${$c(tot)}</span></div></div>
    <div class="mo-kick" style="margin-top:14px">¿Cómo paga?</div>
    <div class="mo-metodos">${[['efectivo','💵','Efectivo'],['tarjeta','💳','Tarjeta'],['sinpe','📲','SINPE']].map(([k,e,n])=>`<button type="button" class="${c.metodo===k?'on':''}" data-mo="metodo" data-k="${k}"><b>${e}</b>${n}</button>`).join('')}</div>
    ${c.metodo==='efectivo'?`<label class="mo-field">Recibido<input type="number" inputmode="numeric" id="moRecibido" min="0" step="50" value="${+c.recibido||''}" placeholder="${tot}"></label><div class="mo-chips" style="flex-wrap:wrap">${billetes.map(v=>`<button type="button" class="mo-chip${+c.recibido===v?' on':''}" data-mo="recibido" data-v="${v}">${v===tot?'Exacto':$c(v)}</button>`).join('')}</div><div class="mo-vuelto">Vuelto <b id="moVuelto">${$c(vuelto)}</b></div>`:''}
    ${c.metodo==='sinpe'?`<div class="mo-s" style="margin-top:8px">${o.pago.estado==='reportado'?'El cliente avisó que pagó. ':''}Revisá que te entró ${$c(tot)} con la descripción <b>${esc(o.ref)}</b>.</div>`:''}
    ${!c.desdePin&&!o.retiro.envio?`<label class="mo-field">Código del cliente (opcional, para entregar)<input type="text" inputmode="numeric" maxlength="4" id="moCodigo" value="${esc(c.codigo)}" placeholder="4 números"></label>`:''}
    <label class="mo-sw">Entregar ahora al cliente<input type="checkbox" id="moEntregar" ${c.entregar?'checked':''}></label>
    <button type="button" class="mo-btn p w big" style="margin-top:12px" data-mo="cobrar-ok">🧾 Cobrar ${$c(tot)}${c.metodo==='efectivo'&&vuelto?` · vuelto ${$c(vuelto)}`:''}</button>
    ${POS?'<div class="mo-s" style="margin-top:8px">🔌 Queda registrada como venta en ARAMO POS, con los nombres y el peso real.</div>':''}`);
  const rec=$('moRecibido');if(rec)rec.addEventListener('input',()=>{c.recibido=+rec.value||0;const v=Math.max(0,c.recibido-tot);$('moVuelto').textContent=$c(v);});
  const cod=$('moCodigo');if(cod)cod.addEventListener('input',()=>{c.codigo=cod.value.replace(/\D/g,'').slice(0,4);});
  const en=$('moEntregar');if(en)en.addEventListener('change',()=>{c.entregar=en.checked;});
}
async function cobrar(){
  const o=N.get(M.abierto),c=M.cobro;if(!o||!c)return;
  const tot=N.totalDe(o);
  if(c.metodo==='efectivo'&&c.recibido&&+c.recibido<tot){toast('Lo recibido es menos que el total');return;}
  if(c.codigo&&c.codigo.length===4&&c.codigo!==o.pin){toast('Ese código no coincide con el del pedido');buzz([60,40,60]);return;}
  let venta=null;
  if(POS){
    try{
      const caja=await POS.caja();
      if(!caja){toast('Abrí la caja en ARAMO POS para registrar la venta');return;}
      const prods=await POS.productos().catch(()=>[]);
      const buscar=n=>(prods||[]).find(p=>nrm(p.nombre)===nrm(n));
      const items=o.items.filter(i=>i.estado!=='nohay').map(i=>{const p=buscar(i.n),q=qReal(i),pr=precioIt(i);return{producto_id:p?.id||null,nombre:`${i.n}${i.u==='kg'?'':''}`,precio_unitario:pr,cantidad:+q.toFixed(3),unidad:i.u==='kg'?'kg':(i.u==='unid'?'unidad':i.u),subtotal:N.redondear5(q*pr),producto_generico:!p};});
      if(o.retiro.envio&&+o.retiro.envio.costo)items.push({producto_id:null,nombre:'Envío Uber',precio_unitario:+o.retiro.envio.costo,cantidad:1,unidad:'unidad',subtotal:+o.retiro.envio.costo,producto_generico:true});
      const rec=c.metodo==='efectivo'?(+c.recibido||tot):tot;
      const v=await POS.venta({subtotal:tot,total:tot,metodo_pago:c.metodo==='link'?'tarjeta':c.metodo,monto_recibido:rec,cambio:Math.max(0,rec-tot),cliente_nombre:o.cliente.nombre,notas:`Pedido web ${o.ref} · ${sucNom(o.sucursal)}`,pago_efectivo:c.metodo==='efectivo'?tot:0,pago_tarjeta:c.metodo==='tarjeta'||c.metodo==='link'?tot:0,pago_sinpe:c.metodo==='sinpe'?tot:0,items});
      venta=v?.numero||null;
    }catch(e){toast('ARAMO POS no pudo registrar la venta: '+(e?.message||e));return;}
  }
  const rec=c.metodo==='efectivo'?(+c.recibido||tot):tot;
  const entregar=c.entregar;
  await N.cambiar(o.id,x=>{
    x.cobro={metodo:c.metodo,total:tot,recibido:rec,vuelto:Math.max(0,rec-tot),fecha:new Date().toISOString(),venta,sucursal:x.sucursal};
    x.pago.estado='verificado';
    if(entregar){x.estado='entregado';x.entregado=new Date().toISOString();}
  },'tienda',`Cobrado ${$c(tot)} (${N.PAGOS[c.metodo]?.n||c.metodo})${venta?' · '+venta:''}${entregar?' · entregado':''}`);
  campana();buzz([40,40,80]);
  toast(`🧾 ${o.ref} cobrado ${$c(tot)}${venta?' · '+venta+' en ARAMO POS':''}`);
  M.vista='tiquete';pintarEncargo();pintarMostrador();pintarPuerta();
}
function tiqueteTexto(o){
  const t=T(),c=o.cobro||{};
  return [`${sucNom(o.sucursal)||t.nombre||'ARAMO'}`,`Pedido ${o.ref}${c.venta?' · '+c.venta:''}`,`${fdia(c.fecha||o.updated)} ${fh(c.fecha||o.updated)} · ${o.cliente.nombre}`,'',
    ...o.items.filter(i=>i.estado!=='nohay').map(i=>`${i.n} ${i.u==='kg'?kg(qReal(i))+' kg':qtxt(qReal(i),i.u)} x ${$c(precioIt(i))} = ${$c(qReal(i)*precioIt(i))}`),
    ...(o.retiro.envio&&+o.retiro.envio.costo?[`Envío Uber = ${$c(o.retiro.envio.costo)}`]:[]),
    '',`TOTAL ${$c(N.totalDe(o))}`,`${N.PAGOS[c.metodo]?.n||''}${c.metodo==='efectivo'?` · recibido ${$c(c.recibido)} · vuelto ${$c(c.vuelto)}`:''}`,'','¡Gracias por comprar en ARAMO!'].join('\n');
}
function pintarTiquete(o){
  const c=o.cobro||{};
  abrirHoja(`<p class="mo-kick">Tiquete${c.venta?' · '+esc(c.venta):''}</p><div class="mo-h">✅ ${esc(o.ref)} cobrado</div><div class="mo-s">${esc(o.cliente.nombre)} · ${N.PAGOS[c.metodo]?.e||''} ${esc(N.PAGOS[c.metodo]?.n||'')}${o.estado==='entregado'?' · entregado':''}</div>
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
    <table><thead><tr><th></th><th>Producto</th><th>Pidió</th><th>Pesó / lleva</th><th>Nota</th></tr></thead><tbody>${o.items.map(i=>`<tr><td>☐</td><td><b>${esc(i.n)}</b><br><small>${esc(N.catalogo().find(p=>p.k===i.k)?.d||'')}</small></td><td>${esc(qtxt(i.q,i.u))}</td><td>__________</td><td>${esc([i.mad?MAD[i.mad]:'',i.nota].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table>${o.nota?`<p>📝 ${esc(o.nota)}</p>`:''}`;
}

// ── Caja de hoy ──
function pintarCajaHoy(){
  const {L,t,total}=resumenCaja();
  abrirHoja(`<p class="mo-kick">Caja de hoy · ${esc(M.suc==='todas'?'Ambas tiendas':sucNom(M.suc))}</p><div class="mo-h">${$c(total)}</div><div class="mo-s">${L.length} pedido${L.length===1?'':'s'} cobrado${L.length===1?'':'s'} hoy${POS?' · también quedan en ARAMO POS':''}</div>
    <div class="mo-cuadre" style="margin-top:12px"><div><span>💵 Efectivo</span><b>${$c(t.efectivo)}</b></div><div><span>💳 Tarjeta</span><b>${$c((t.tarjeta||0)+(t.link||0))}</b></div><div><span>📲 SINPE</span><b>${$c(t.sinpe)}</b></div></div>
    <div class="mo-blk">${L.length?L.map(o=>`<button type="button" class="mo-cobrable" data-mo="ver-tiq" data-id="${o.id}"><span>${fh(o.cobro.fecha)} · <b>${esc(o.ref)}</b> ${esc(o.cliente.nombre)}</span><span>${N.PAGOS[o.cobro.metodo]?.e||''} ${$c(o.cobro.total)}</span></button>`).join(''):'<div class="mo-s">Todavía no hay cobros hoy.</div>'}</div>
    ${L.length?'<button type="button" class="mo-btn w" style="margin-top:10px" data-mo="imprimir-cierre">🖨️ Imprimir cierre del día</button>':''}`);
}

// ── Vitrina: precios, unidades, nombres y productos ──
function pintarVitrina(){
  const t=T(),cat=N.catalogo(),q=nrm(M.vq);
  const L=cat.filter(p=>(M.vcat==='todos'||p.c===M.vcat)&&(!q||nrm(p.n+' '+(p.d||'')).includes(q)));
  const margen=t.margen??35;
  abrirHoja(`<p class="mo-kick">Vitrina · lo que ven los clientes en el Taller</p><div class="mo-h">🏷️ Precios y productos</div><div class="mo-s">Todo se guarda solo y se ve al instante en el Taller y las recetas. Los pedidos ya sellados conservan su precio.</div>
    <div class="mo-dos" style="margin-top:10px"><label class="mo-field">Buscar<input type="search" id="moVitQ" value="${esc(M.vq)}" placeholder="Ej.: aguacate" autocomplete="off"></label><label class="mo-field">🤖 Margen automático<input type="number" id="moMargen" min="0" max="300" step="1" value="${margen}"></label></div>
    <div class="mo-chips" style="flex-wrap:nowrap;overflow-x:auto">${[{k:'todos',n:'Todos',e:'🧺'},...CFG.pasillos.filter(p=>p.k!=='top')].map(p=>`<button type="button" class="mo-chip${M.vcat===p.k?' on':''}" data-mo="vcat" data-k="${p.k}">${p.e} ${esc(p.n)}</button>`).join('')}</div>
    <button type="button" class="mo-btn p w" style="margin-top:10px" data-mo="prod-nuevo">＋ Producto nuevo</button>
    <div class="mo-blk" style="padding:4px 12px">${L.map(p=>{
      const auto=!!(t.prods||{})[p.k]?.auto,c=auto||M.vq?costoHoy(p.n):null;
      return `<div class="mo-vi${p.oculto?' oculto':''}"><button type="button" class="e" data-mo="prod-edit" data-k="${p.k}" aria-label="Editar ${esc(p.n)}">${p.e}</button>
        <button type="button" class="t" data-mo="prod-edit" data-k="${p.k}"><strong>${esc(p.n)}${p.propio?' <span class="mo-pill">nuevo</span>':''}</strong><small>${esc(p.d||'')}${p.d?' · ':''}por ${esc(UNI[p.u]||p.u)}${auto?` · 🤖 ${c?'costo '+$c(c.pr)+' + '+margen+'%':'sin costo en Surtido'}`:''}</small></button>
        <input type="number" inputmode="numeric" min="0" step="5" value="${p.p}" data-mo-pr="${p.k}" aria-label="Precio de ${esc(p.n)}" ${auto?'disabled':''}>
        <button type="button" class="tg${auto?' on':''}" data-mo="auto" data-k="${p.k}" aria-label="Precio automático" title="Precio automático con el costo de Surtido">🤖</button>
        <button type="button" class="tg${p.oculto?'':' on'}" data-mo="vis" data-k="${p.k}" aria-label="Mostrar">${p.oculto?'🙈':'👁'}</button>
        <button type="button" class="tg ag${p.agotado?' on':''}" data-mo="ago" data-k="${p.k}" aria-label="Agotado">🚫</button></div>`;}).join('')||'<div class="mo-vacio">Nada con ese nombre.</div>'}</div>`);
  const qi=$('moVitQ');qi.addEventListener('input',()=>{M.vq=qi.value;const pos=qi.selectionStart;repintar(pintarVitrina);const n=$('moVitQ');n.focus();n.setSelectionRange(pos,pos);});
  const mg=$('moMargen');mg.addEventListener('change',()=>{N.guardarTienda({margen:Math.max(0,+mg.value||0)});autoPrecios();toast('🤖 Margen '+mg.value+'% guardado');});
  $('moSheet').querySelectorAll('[data-mo-pr]').forEach(i=>i.addEventListener('change',()=>{
    const k=i.dataset.moPr,v=Math.max(0,Math.round(+i.value||0));
    const precios={...(T().precios||{})};if(v>0)precios[k]=v;else delete precios[k];
    N.guardarTienda({precios});toast('🏷️ Precio guardado · ya se ve en el Taller');
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
    <div class="mo-dos"><label class="mo-field">Se vende por<select id="peU">${UNIDADES.map(([v,n])=>`<option value="${v}"${e.u===v?' selected':''}>${n}</option>`).join('')}</select></label><label class="mo-field">De a cuánto<select id="peS">${(e.u==='kg'?[.25,.5,1]:[1,2,6,12]).map(v=>`<option value="${v}"${+e.s===v?' selected':''}>${fq(v)} ${UNI[e.u]||e.u}</option>`).join('')}</select></label></div>
    <div class="mo-dos"><label class="mo-field">Pasillo<select id="peC">${CFG.pasillos.filter(p=>p.k!=='top').map(p=>`<option value="${p.k}"${e.c===p.k?' selected':''}>${p.e} ${esc(p.n)}</option>`).join('')}</select></label><label class="mo-field">Precio ₡ por ${esc(UNI[e.u]||e.u)}<input id="peP" type="number" inputmode="numeric" min="0" step="5" value="${+e.p||''}" ${e.auto?'disabled':''}></label></div>
    <label class="mo-sw">🤖 Precio automático (costo de Surtido + ${t.margen??35}%)<input type="checkbox" id="peA" ${e.auto?'checked':''}></label>
    <div class="mo-s">${c?`Costo de hoy en Surtido: <b>${$c(c.pr)}</b> (${esc(c.prov)}) → precio automático <b>${$c(precioAuto(c.pr,t.margen??35))}</b>`:'No encontramos este producto en Surtido con ese nombre; el automático necesita un costo.'}</div>
    <button type="button" class="mo-btn p w big" style="margin-top:12px" data-mo="prod-ok">Guardar · se ve al instante en el Taller</button>
    ${e.nuevo?'':'<button type="button" class="mo-btn w" style="margin-top:8px" data-mo="vitrina">‹ Volver a la vitrina</button>'}`);
  const u=$('peU');u.addEventListener('change',()=>{M.edit={...leerProd(),u:u.value,s:u.value==='kg'?.5:1};repintar(pintarProd);});
  $('peA').addEventListener('change',()=>{M.edit={...leerProd()};repintar(pintarProd);});
}
function leerProd(){
  const e=M.edit,v=id=>$(id)?.value??'';
  return{...e,n:v('peN').trim(),e:v('peE').trim()||'🧺',d:v('peD').trim(),u:v('peU'),s:+v('peS')||(v('peU')==='kg'?.5:1),c:v('peC'),p:Math.round(+v('peP')||0),auto:$('peA').checked};
}
function guardarProd(){
  const e=leerProd();
  if(e.n.length<2){toast('Escribí el nombre del producto');return;}
  const t=T(),prods={...(t.prods||{})},precios={...(t.precios||{})},nuevos=[...(t.nuevos||[])];
  let k=e.k;
  if(e.nuevo){
    k=nrm(e.n).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||('p'+Date.now().toString(36));
    if(N.catalogo().some(p=>p.k===k))k+='_'+Date.now().toString(36).slice(-3);
    nuevos.push({k,n:e.n,d:e.d,e:e.e,c:e.c,u:e.u,s:e.s,p:e.p||0});
  }else prods[k]={...(prods[k]||{}),n:e.n,d:e.d,e:e.e,c:e.c,u:e.u,s:e.s,auto:e.auto};
  if(e.nuevo)prods[k]={...(prods[k]||{}),auto:e.auto};
  if(e.auto){const c=costoHoy(e.n);if(c)precios[k]=precioAuto(c.pr,t.margen??35);}
  else if(e.p>0)precios[k]=e.p;
  N.guardarTienda({prods,precios,nuevos});
  toast(`🏷️ ${e.n} guardado · ya se ve en el Taller`);
  M.vista='vitrina';pintarVitrina();
}

// ── Recetario editable ──
function pintarRecetario(){
  const t=T(),fuera=new Set(t.recetasOcultas||[]),todas=[...(CFG.recetas||[]),...(t.recetas||[])];
  abrirHoja(`<p class="mo-kick">Recetario del Taller · ${todas.length} recetas</p><div class="mo-h">📖 Recetario</div><div class="mo-s">El cliente elige una receta y las cantidades se escalan solas por personas. Creá las tuyas con lo que más vendés.</div>
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
    <button type="button" class="mo-btn p w big" style="margin-top:12px" data-mo="rec-ok">Guardar receta · aparece en el Taller</button>
    <button type="button" class="mo-btn w" style="margin-top:8px" data-mo="recetario">‹ Volver al recetario</button>`);
  const leer=()=>{const v=id=>$(id)?.value??'';Object.assign(r,{n:v('reN').trim(),e:v('reE').trim()||'🍲',c:v('reC'),desc:v('reD').trim()});};
  ['reN','reE','reC','reD'].forEach(id=>$(id).addEventListener('change',leer));
  $('moSheet').querySelectorAll('[data-re-q]').forEach(i=>i.addEventListener('change',()=>{r.items[+i.dataset.reQ][1]=Math.max(0,+i.value||0);}));
  const rq=$('reQ');rq.addEventListener('input',()=>{leer();M.rq=rq.value;const pos=rq.selectionStart;repintar(pintarReceta);const n=$('reQ');n.focus();n.setSelectionRange(pos,pos);});
}

// ── Ajustes ──
function pintarAjustes(){
  const t=T();
  abrirHoja(`<div class="mo-h">⚙️ Pagos y horarios</div><div class="mo-s">Esto es lo que ve el cliente al pagar y al elegir hora.</div>
    <div class="mo-blk"><h4>Tienda</h4>
      <label class="mo-field">Nombre<input id="ajNombre" value="${esc(t.nombre)}"></label>
      <label class="mo-field">WhatsApp general (si una tienda no tiene el suyo)<input id="ajWa" inputmode="tel" placeholder="8888-8888" value="${esc(fmtTel(t.whatsapp))}"></label>
      <label class="mo-field">Minutos para alistar un pedido<input id="ajMin" type="number" min="10" max="240" value="${+t.alistadoMin||40}"></label>
      <label class="mo-sw">Ofrecer "me la llevan al carro"<input type="checkbox" id="ajCarro" ${t.alCarro?'checked':''}></label>
      <label class="mo-sw">Ofrecer envío a domicilio con Uber<input type="checkbox" id="ajEnvio" ${t.envio!==false?'checked':''}></label></div>
    <div class="mo-blk"><h4>📲 SINPE Móvil</h4><div class="mo-dos"><label class="mo-field">Número<input id="ajSinpe" inputmode="tel" placeholder="8888-8888" value="${esc(fmtTel(t.sinpe?.numero))}"></label><label class="mo-field">A nombre de<input id="ajSinpeN" placeholder="Ej.: ARAMO S.A." value="${esc(t.sinpe?.nombre||'')}"></label></div></div>
    <div class="mo-blk"><h4>🔗 Tarjeta en línea (opcional)</h4><label class="mo-field">Link de pago (Tilopay, ONVO, BAC…)<input id="ajLink" type="url" placeholder="https://…" value="${esc(t.linkTarjeta||'')}"></label><div class="mo-s">Si lo dejás vacío, la tarjeta se cobra con datáfono al recoger.</div></div>
    ${(t.sucursales||[]).map(s=>`<div class="mo-blk"><h4>${esc(s.n)} · ${esc(s.zona)}</h4><label class="mo-sw">Recibe pedidos<input type="checkbox" data-aj-act="${s.k}" ${s.activa!==false?'checked':''}></label>
      <label class="mo-field">📱 WhatsApp que recibe los pedidos de esta tienda<input data-aj-wa="${s.k}" inputmode="tel" placeholder="8888-8888" value="${esc(fmtTel(s.whatsapp))}"></label>
      <div class="mo-dos"><label class="mo-field">Abre<input type="time" data-aj-abre="${s.k}" value="${esc(s.abre)}"></label><label class="mo-field">Cierra<input type="time" data-aj-cierra="${s.k}" value="${esc(s.cierra)}"></label></div>
      <button type="button" class="mo-btn w" style="margin-top:10px" data-mo="tienda-gps" data-k="${s.k}">📍 ${s.lat?'Ubicación guardada · actualizar':'Guardar ubicación de la tienda (estando aquí)'}</button></div>`).join('')}
    <button type="button" class="mo-btn p w" style="margin-top:12px" data-mo="aj-ok">Guardar</button>`);
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
function pintarWhatsapp(){
  abrirHoja(`<p class="mo-kick">Recibir un pedido</p><div class="mo-h">📥 Pedido de WhatsApp</div><div class="mo-s">Pegá aquí el mensaje que mandó el cliente (o solo el link "Abrir en Mostrador") y el pedido entra completo.</div>
    <textarea class="mo-area" id="moPega" placeholder="Pegá el mensaje de WhatsApp aquí…"></textarea>
    <button type="button" class="mo-btn p w" style="margin-top:10px" data-mo="pega-ok">Recibir pedido</button>`);
  setTimeout(()=>$('moPega')?.focus(),200);
}
function linkTaller(){return new URL('canasta.html',location.href).href.split('#')[0].split('?')[0];}
function pintarCompartir(){
  const url=linkTaller(),on=N.modo()==='nube';
  let qr='';
  if(window.qrcode){const q=window.qrcode(0,'M');q.addData(url);q.make();qr=q.createSvgTag({cellSize:4,margin:0,scalable:true});}
  abrirHoja(`<div class="mo-h">📣 Compartir el Taller</div><div class="mo-s">Pegá este QR en caja o mandá el link: tus clientes arman su pedido en el Taller y lo recogen listo o les llega a casa.</div>
    ${qr?`<div class="mo-qr">${qr}</div>`:''}<code class="mo-code">${esc(url)}</code>
    <div class="mo-btns"><button type="button" class="mo-btn" data-mo="copiar" data-v="${esc(url)}">📋 Copiar link</button><button type="button" class="mo-btn p" data-mo="wa-share">💬 Mandar por WhatsApp</button></div>
    <a class="mo-btn w" style="margin-top:8px" href="canasta.html">👀 Verlo como cliente</a>
    <div class="mo-blk" style="margin-top:16px"><h4>${on?'🟢 Pedidos en vivo':'🟠 Pedidos por WhatsApp'}</h4>
      ${on?'<div class="mo-s">Cada pedido nuevo aparece solo en los receptores de su tienda.</div>'
      :`<div class="mo-s">Ahora mismo ${esc(N.motivo())}. Todo funciona igual: el cliente manda el pedido al WhatsApp de su tienda con un link; lo tocás (o lo pegás en 📥) y entra aquí.</div>
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
  surtido(el){entrar('surtido',el);},canasta(el){entrar('canasta',el);},mostrador(el){entrar('mostrador',el);},
  puerta(){abrirPuerta();},
  compartir(){if(!$('mostrador').classList.contains('open')){cerrarPuerta();abrirMostrador();}M.vista='compartir';pintarCompartir();},
  tab(el){M.tab=el.dataset.k;pintarMostrador();},
  abrir(el){if(!$('mostrador').classList.contains('open')){cerrarPuerta();abrirMostrador();}abrirEncargo(el.dataset.id);},
  cerrar(){cerrarHoja();},
  prueba(){pedidoPrueba();},
  caja(){M.vista='caja';pintarCajaHoy();},
  vitrina(){M.vista='vitrina';pintarVitrina();},
  vcat(el){M.vcat=el.dataset.k;repintar(pintarVitrina);},
  'prod-nuevo'(){editarProd(null);},
  'prod-edit'(el){editarProd(el.dataset.k);},
  'prod-ok'(){guardarProd();},
  auto(el){
    const k=el.dataset.k,t=T(),prods={...(t.prods||{})},on=!prods[k]?.auto;
    prods[k]={...(prods[k]||{}),auto:on};
    const precios={...(t.precios||{})};
    if(on){const p=N.catalogo().find(x=>x.k===k),c=costoHoy(p.n);if(!c){toast('No hay costo de '+p.n+' en Surtido; queda el precio manual');return;}precios[k]=precioAuto(c.pr,t.margen??35);}
    N.guardarTienda({prods,precios});toast(on?'🤖 Precio automático: sigue al costo de Surtido':'Precio manual');repintar(pintarVitrina);
  },
  vis(el){const k=el.dataset.k,t=T(),s=new Set(t.ocultos||[]);s.has(k)?s.delete(k):s.add(k);N.guardarTienda({ocultos:[...s]});repintar(pintarVitrina);},
  ago(el){const k=el.dataset.k,t=T(),s=new Set(t.agotados||[]);s.has(k)?s.delete(k):s.add(k);N.guardarTienda({agotados:[...s]});toast(s.has(k)?'🚫 Agotado hoy':'De vuelta en la vitrina');repintar(pintarVitrina);},
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
    N.guardarTienda({recetas:lista});toast('📖 '+r.n+' ya está en el Taller');M.vista='recetario';pintarRecetario();
  },
  whatsapp(){M.vista='whatsapp';pintarWhatsapp();},
  'pega-ok'(){
    const txt=$('moPega')?.value||'',m=txt.match(/#encargo=([A-Za-z0-9_-]+)/);
    const o=m&&N.unpack(m[1]);
    if(!o?.id){toast('No encontramos un pedido en ese texto; pegá el mensaje completo');return;}
    N.importar(o);sinAbrir.delete(o.id);guardarSinAbrir();toast('🛎️ Pedido '+o.ref+' recibido');abrirEncargo(o.id);
  },
  ajustes(){M.vista='ajustes';pintarAjustes();},
  receptor(){M.vista='receptor';pintarReceptor();},
  'r-suc'(el){R.suc=el.dataset.k;M.suc=R.suc;guardarR();repintar(pintarReceptor);pintarMostrador();pintarPuerta();toast('📡 Este equipo recibe: '+receptorNom());},
  'avisos-on'(){N.avisos.pedir().then(r=>{toast(r==='granted'?'🔔 Avisos activados en este equipo':'El navegador no permitió los avisos');if(M.vista==='receptor')repintar(pintarReceptor);pintarMostrador();if(r==='granted')N.avisos.mostrar('🔔 Avisos de ARAMO activados','Aquí te va a llegar cada pedido nuevo de '+receptorNom()+'.',{tag:'aramo-prueba'});});},
  'probar-aviso'(){campana(true);N.avisos.mostrar('🛎️ Así suena un pedido nuevo','A-PRUEBA · Ana · 6 productos · '+receptorNom(),{tag:'aramo-prueba'});},
  surtir(el){
    cerrarHoja();$('mostrador').classList.remove('open');cerrarPuerta();
    try{switchView('proveedores');const i=$('pvSearch');if(i){i.value=el.dataset.n;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}}catch{}
    toast('🚚 Buscando '+el.dataset.n+' en Surtido');
  },
  aceptar(){N.cambiar(M.abierto,o=>{o.estado='alistando';},'tienda','La tienda aceptó y empezó a alistar').then(()=>{M.tab='alistando';pintarEncargo();pintarMostrador();toast('🧑‍🌾 A alistar: pesá cada producto');});},
  rechazar(){
    const o=N.get(M.abierto);const m=prompt('¿Por qué no se puede hacer? (se lo decimos al cliente)','No tenemos varios productos hoy');
    if(m===null)return;
    N.cambiar(o.id,x=>{x.estado='cancelado';x.motivo=m||'La tienda no pudo hacerlo';},'tienda','Rechazado: '+(m||'')).then(x=>{pintarEncargo();pintarMostrador();abrir(N.wa(x.cliente.tel,msgCliente(x)));});
  },
  'it-ok'(el){const i=+el.dataset.i;N.cambiar(M.abierto,o=>{const it=o.items[i];it.estado=it.estado==='listo'?'':'listo';if(it.estado==='listo'&&(it.qr==null||it.qr===''))it.qr=it.q;},'tienda').then(()=>{buzz(8);repintar(pintarEncargo);pintarMostrador();});},
  'it-no'(el){const i=+el.dataset.i;N.cambiar(M.abierto,o=>{const it=o.items[i];it.estado=it.estado==='nohay'?'':'nohay';},'tienda').then(()=>{buzz(8);repintar(pintarEncargo);pintarMostrador();});},
  'todo-ok'(){N.cambiar(M.abierto,o=>{o.items.forEach(it=>{if(it.estado!=='nohay'){it.estado='listo';if(it.qr==null||it.qr==='')it.qr=it.q;}});},'tienda').then(()=>{repintar(pintarEncargo);pintarMostrador();});},
  'precio-it'(el){
    const o=N.get(M.abierto),i=+el.dataset.i,it=o.items[i];
    const v=prompt(`Precio de ${it.n} para este pedido (₡ ${it.u==='kg'?'por kg':'c/u'})`,String(precioIt(it)));
    if(v===null)return;const n=Math.round(+String(v).replace(/[^\d.]/g,''));if(!(n>=0))return;
    N.cambiar(o.id,x=>{x.items[i].pr=n;},'tienda',`Precio de ${it.n}: ${$c(n)}`).then(()=>{repintar(pintarEncargo);pintarMostrador();});
  },
  listo(){
    N.cambiar(M.abierto,o=>{o.estado='listo';o.totalFinal=N.totalDe(o);},'tienda','Lista · total exacto '+$c(N.totalDe(N.get(M.abierto)))).then(o=>{
      M.tab='listo';pintarEncargo();pintarMostrador();campana();
      toast('✅ '+o.ref+' lista · avisando a '+o.cliente.nombre.split(' ')[0]);
      abrir(N.wa(o.cliente.tel,msgCliente(o)));
    });
  },
  'volver-alistar'(){N.cambiar(M.abierto,o=>{o.estado='alistando';},'tienda').then(()=>{M.tab='alistando';pintarEncargo();pintarMostrador();});},
  pagado(){const o=N.get(M.abierto);if(!confirm(`¿Te entró el SINPE de ${$c(N.totalDe(o))} con la descripción ${o.ref}?`))return;N.cambiar(o.id,x=>{x.pago.estado='verificado';},'tienda','Pago SINPE confirmado').then(()=>{pintarEncargo();pintarMostrador();toast('📲 Pago confirmado');});},
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
  tiquete(){M.vista='tiquete';pintarEncargo();},
  'ver-tiq'(el){M.abierto=el.dataset.id;M.vista='tiquete';pintarEncargo();},
  'imprimir-tiq'(){const o=N.get(M.abierto);imprimir(`<pre>${esc(tiqueteTexto(o))}</pre>`,'Tiquete '+o.ref);},
  'wa-tiq'(){const o=N.get(M.abierto);abrir(N.wa(o.cliente.tel,'🧾 Tu tiquete de ARAMO\n\n'+tiqueteTexto(o)));},
  imprimir(){const o=N.get(M.abierto);imprimir(listaAlistado(o),'Lista para alistar · '+o.ref);},
  'imprimir-cierre'(){const {L,t,total}=resumenCaja();imprimir(`<p>${esc(M.suc==='todas'?'Ambas tiendas':sucNom(M.suc))} · ${new Date().toLocaleDateString('es-CR')}</p><table><tbody>${L.map(o=>`<tr><td>${fh(o.cobro.fecha)}</td><td>${esc(o.ref)}</td><td>${esc(o.cliente.nombre)}</td><td>${esc(N.PAGOS[o.cobro.metodo]?.n||'')}</td><td>${$c(o.cobro.total)}</td></tr>`).join('')}</tbody></table><p>Efectivo ${$c(t.efectivo)} · Tarjeta ${$c((t.tarjeta||0)+(t.link||0))} · SINPE ${$c(t.sinpe)} · <b>Total ${$c(total)}</b></p>`,'Cierre de pedidos del día');},
  wa(){const o=N.get(M.abierto);if(o)abrir(N.wa(o.cliente.tel,msgCliente(o)));},
  uber(){
    const o=N.get(M.abierto);if(!o?.retiro?.envio)return;
    abrir(uberLink(o));
    if(!o.retiro.envio.uber)N.cambiar(o.id,x=>{x.retiro.envio.uber=new Date().toISOString();},'tienda','Uber pedido').then(()=>{pintarEncargo();pintarMostrador();});
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
      N.guardarTienda({sucursales:(t.sucursales||[]).map(s=>s.k===k?{...s,lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6)}:s)});
      toast('📍 Ubicación de la tienda guardada');pintarAjustes();
    },()=>toast('No se pudo tomar la ubicación'),{enableHighAccuracy:true,timeout:15000});
  },
  'aj-ok'(){
    const t=T(),v=id=>$(id)?.value.trim()||'',q=s=>document.querySelector(s);
    const sucs=(t.sucursales||[]).map(s=>({...s,activa:!!q(`[data-aj-act="${s.k}"]`)?.checked,whatsapp:telDig(q(`[data-aj-wa="${s.k}"]`)?.value),abre:q(`[data-aj-abre="${s.k}"]`)?.value||s.abre,cierra:q(`[data-aj-cierra="${s.k}"]`)?.value||s.cierra}));
    N.guardarTienda({nombre:v('ajNombre')||'ARAMO',whatsapp:telDig(v('ajWa')),alistadoMin:Math.max(10,+v('ajMin')||40),alCarro:$('ajCarro').checked,envio:$('ajEnvio').checked,sinpe:{numero:telDig(v('ajSinpe')),nombre:v('ajSinpeN')},linkTarjeta:v('ajLink'),sucursales:sucs});
    cerrarHoja();toast('⚙️ Guardado');
  },
  copiar(el){navigator.clipboard?.writeText(el.dataset.v).then(()=>toast('📋 Copiado'),()=>toast(el.dataset.v));},
  'wa-share'(){abrir(N.wa('',`🧺 ¡Ya podés pedir en ${T().nombre||'ARAMO'} desde el celular! Entrá al Taller, armá tu canasta de frutas y verduras y la recogés lista o te llega a casa 👉 ${linkTaller()}`));},
};
function codigoOk(o,como){
  pararCamara();
  if(cobrado(o))entregar(o,como);
  else{abrirCobro(o.id,{entregar:true,desdePin:true});toast('✓ Código correcto · ahora cobrá');}
}
async function entregar(o,como){
  await N.cambiar(o.id,x=>{x.estado='entregado';x.entregado=new Date().toISOString();if(x.pago.estado==='reportado')x.pago.estado='verificado';},'tienda',como);
  pararCamara();campana();buzz([40,40,80]);
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
  if(!el.closest('#puerta,#mostrador,#moSheet'))return;
  const f=ACT[el.dataset.pu||el.dataset.mo];if(!f)return;
  e.preventDefault();f(el);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('moSheet')?.classList.contains('open'))cerrarHoja();});

// ══════════════ En vivo: alarma de pedido nuevo ══════════════
let _vitT=0;
const vistos=new Map(N.lista().map(o=>[o.id,o.estado+'|'+(o.pago?.estado||'')]));
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
  let nuevos=0;
  N.lista().forEach(o=>{
    const k=o.estado+'|'+(o.pago?.estado||''),antes=vistos.get(o.id);vistos.set(o.id,k);
    if(antes===k)return;
    if(!antes&&o.estado==='nuevo'&&paraMi(o)){
      nuevos++;sinAbrir.add(o.id);
      N.avisos.mostrar(`🛎️ Pedido nuevo · ${o.ref}`,`${o.cliente.nombre} · ${o.items.length} productos · ${sucNom(o.sucursal)} · ${o.retiro.envio?'envío':'recoge'} ${fh(o.retiro.at)}`,{tag:'nuevo-'+o.id,fijo:true,url:new URL('APP.html#ver='+o.id,location.href).href});
    }
    else if(antes&&o.pago?.estado==='reportado'&&!antes.endsWith('reportado')&&paraMi(o)){toast(`📲 ${o.cliente.nombre} dice que pagó ${o.ref}`);campana();N.avisos.mostrar(`📲 ${o.cliente.nombre} pagó por SINPE`,`${o.ref} · ${$c(N.totalDe(o))} · revisalo`,{tag:'pago-'+o.id});}
    else if(antes&&o.estado==='cancelado'&&!antes.startsWith('cancelado')&&paraMi(o)){toast(`✖️ ${o.ref} fue cancelado`);sinAbrir.delete(o.id);}
  });
  if(nuevos){
    const o=[...sinAbrir].map(id=>N.get(id)).filter(Boolean)[0];
    toast(`🛎️ ${nuevos>1?nuevos+' pedidos nuevos':'Pedido nuevo '+o.ref+' · '+o.cliente.nombre}`);
    campana(true);buzz([120,60,120,60,240]);repetirAlarma();
  }
  guardarSinAbrir();
  const n=activos().filter(o=>o.estado==='nuevo'&&paraMi(o)).length;
  document.title=(n?`(${n}) `:'')+'ARAMO';
}
N.on(tipo=>{
  if(tipo==='encargo')vigilar();
  if(tipo==='tienda'){clearTimeout(_vitT);_vitT=setTimeout(()=>{if(['vitrina','recetario'].includes(M.vista)&&$('moSheet').classList.contains('open')&&!document.activeElement?.matches?.('#moSheet input,#moSheet textarea'))repintar(M.vista==='vitrina'?pintarVitrina:pintarRecetario);},350);}
  pintarPuerta();pintarMostrador();
  if(M.vista==='encargo'&&$('moSheet').classList.contains('open')&&!document.activeElement?.matches?.('#moSheet input'))repintar(pintarEncargo);
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
  if(enc){const o=N.unpack(enc[1]);if(o?.id){N.importar(o);sinAbrir.delete(o.id);guardarSinAbrir();cerrarPuerta();abrirMostrador(o.id);toast('🛎️ Pedido '+o.ref+' recibido por WhatsApp');return true;}}
  cerrarPuerta();abrirMostrador(ver?ver[1]:null);return true;
}
N.conectar();
if(!porHash()){
  if(MODO_POS){primeraVez=false;document.getElementById('scopePicker')?.classList.remove('open');document.body.classList.remove('scope-picker-open');abrirMostrador();}
  else abrirPuerta();
}
window.addEventListener('hashchange',porHash);
navigator.serviceWorker?.addEventListener?.('message',e=>{if(e.data?.tipo==='abrir'&&e.data.id){cerrarPuerta();abrirMostrador(e.data.id);}});
N.avisos.insignia(sinAbrir.size);
if(sinAbrir.size)repetirAlarma();
window.AramoPuerta={abrirPuerta,abrirMostrador,pintarMostrador,abrirCobro,autoPrecios,R};
})();
