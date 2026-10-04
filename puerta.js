/* ══════════════════════════════════════════════════════════════════════
   ARAMO · Puerta y Mostrador.

   Puerta: las 2 caras de ARAMO, cada una en su ventana con la app adentro
   vista de lejos:
     🚚 Surtido  — lo que ARAMO pide a sus proveedores (la app de siempre)
     🧺 Canasta  — lo que los clientes le piden a ARAMO (canasta.html)
   Mostrador: donde la tienda atiende cada encargo de Canasta, desde que
   entra hasta que el cliente se lo lleva: aceptar → alistar y pesar →
   listo y avisar → cobrar → entregar con código.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const N=window.AramoNube,CFG=window.ARAMO_CANASTA;
if(!N||!CFG)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const buzz=p=>{try{if(navigator.userActivation?.hasBeenActive!==false)navigator.vibrate&&navigator.vibrate(p);}catch{}};
const $c=N.colones;
const T=()=>N.tienda();
const suc=k=>(T().sucursales||[]).find(s=>s.k===k);
const fh=d=>new Date(d).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});
function fdia(d){const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);const n=Math.round((b-a)/864e5);return n===0?'hoy':n===1?'mañana':n===-1?'ayer':b.toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'});}
function fq(n){n=+n||0;if(Number.isInteger(n))return String(n);const w=Math.floor(n),f=+(n-w).toFixed(2),fr={.25:'¼',.5:'½',.75:'¾'}[f];return fr?(w||'')+fr:String(+n.toFixed(2));}
const UNI={kg:'kg',unid:'unid.',rollo:'rollo',paquete:'paq.',bolsita:'bolsita',bolsa:'bolsa','cartón':'cartón',frasco:'frasco',botella:'botella'};
const qtxt=(q,u)=>fq(q)+' '+(UNI[u]||u);
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
  const s=suc(o.sucursal),e=o.retiro.envio,q=[];
  q.push('action=setPickup');
  if(s?.lat&&s?.lng)q.push('pickup[latitude]='+s.lat,'pickup[longitude]='+s.lng,'pickup[nickname]='+encodeURIComponent(s.n+' '+s.zona));
  else q.push('pickup=my_location');
  q.push('dropoff[latitude]='+e.lat,'dropoff[longitude]='+e.lng,'dropoff[nickname]='+encodeURIComponent(o.cliente.nombre+' · '+o.ref));
  if(e.senas)q.push('dropoff[formatted_address]='+encodeURIComponent(e.senas));
  return 'https://m.uber.com/ul/?'+q.join('&');
}
function abrir(url){const w=window.open(url,'_blank','noopener');if(!w)location.href=url;}
let _tt=0;
function toast(m){let t=$('moToast');if(!t){t=document.createElement('div');t.id='moToast';t.className='mo-toast';t.setAttribute('role','status');document.body.appendChild(t);}t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2800);}
function campana(){try{const a=new (window.AudioContext||window.webkitAudioContext)();[660,880,990].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;o.connect(g);g.connect(a.destination);const t=a.currentTime+i*.13;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.2,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.start(t);o.stop(t+.35);});}catch{}}

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
    const key=nrm(nombre).split(' ')[0];let best=null;
    Object.entries(getAllProviders()).forEach(([prov,d])=>{
      if(d?.deleted)return;
      (d.products||[]).forEach(p=>{
        const pn=nrm(p.name);
        if(pn===nrm(nombre)||pn.split(/\s+/)[0]===key){const pr=+getPrice(prov,p.id)||0;if(pr>0&&(!best||pr<best.pr))best={pr,prov,u:p.unit};}
      });
    });
    return best;
  }catch{return null;}
}

// ══════════════ Encargos ══════════════
const activos=()=>N.lista().filter(o=>!['entregado','cancelado'].includes(o.estado));
const hoyEntregados=()=>N.lista().filter(o=>['entregado','cancelado'].includes(o.estado)&&fdia(o.updated)==='hoy');
function avance(o){const it=o.items||[],r=it.filter(x=>x.estado==='listo'||x.estado==='nohay').length;return{r,n:it.length};}
function urgente(o){return o.estado!=='listo'&&minsA(o.retiro.at)<=15;}

// ══════════════ PUERTA ══════════════
const M={tab:'nuevo',suc:'todas',abierto:null,pin:'',vista:null,vit:{q:'',precios:null,ocultos:null,agotados:null}};
let primeraVez=true;

function montar(){
  const pu=document.createElement('div');
  pu.className='pu';pu.id='puerta';pu.setAttribute('role','dialog');pu.setAttribute('aria-label','ARAMO');
  pu.innerHTML=`<div class="pu-in">
    <div class="pu-head"><div><div class="pu-brand">ARAMO</div><div class="pu-date" id="puDate"></div></div><button type="button" class="pu-nube" id="puNube" data-pu="compartir"><i></i><span></span></button></div>
    <h1 class="pu-h1" id="puH1">¿Qué abrimos?</h1><p class="pu-sub">Las dos caras de ARAMO: lo que pedimos y lo que nos piden.</p>
    <div class="pu-caras">
      <button type="button" class="pu-cara" data-pu="surtido" style="--c:var(--g)" aria-label="Abrir Surtido">
        <div class="pu-ventana"><div class="pu-barra"><i></i><i></i><i></i><span>Surtido</span></div><div class="pu-vista" id="puMiniS"></div><div class="pu-glow"><span class="pu-abrir">Abrir Surtido</span></div></div>
        <div class="pu-info"><b>🚚 Surtido</b><small>Lo que ARAMO le pide a sus proveedores</small><span class="pu-stat" id="puStatS"></span></div>
      </button>
      <button type="button" class="pu-cara" data-pu="canasta" style="--c:var(--o)" aria-label="Abrir Taller de pedidos">
        <div class="pu-ventana"><div class="pu-barra"><i></i><i></i><i></i><span>Taller de pedidos</span></div><div class="pu-vista" id="puMiniC"><iframe title="Vista de Canasta" src="canasta.html?mini=1&tema=${document.documentElement.dataset.theme==='dark'?'dark':'light'}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></div><div class="pu-glow"><span class="pu-abrir">Abrir Taller</span></div></div>
        <div class="pu-info"><b>🧺 Taller</b><small>Donde los clientes arman su pedido, de punta a punta</small><span class="pu-stat o" id="puStatC"></span></div>
      </button>
    </div>
    <button type="button" class="pu-mostrador" data-pu="mostrador"><span class="ic">🛎️</span><span class="tx"><strong>Mostrador</strong><small id="puMoSub">Encargos de clientes: alistar, cobrar y entregar</small></span><span class="nn" id="puMoN" hidden></span><span style="font-size:22px;color:var(--m)">›</span></button>
    <div class="pu-flujo"><h3>Todo el ciclo, conectado</h3><div class="pu-cadena" id="puCadena"></div></div>
  </div>`;
  document.body.appendChild(pu);

  const mo=document.createElement('div');
  mo.className='mo';mo.id='mostrador';mo.setAttribute('role','dialog');mo.setAttribute('aria-label','Mostrador');
  mo.innerHTML=`<div class="mo-top"><button type="button" class="bk" data-mo="puerta" aria-label="Volver a ARAMO">‹</button><div class="mo-title"><small>ARAMO · Taller</small><b>Mostrador</b></div><button type="button" class="pu-nube" id="moNube" data-mo="compartir"><i></i><span></span></button></div>
    <div class="mo-in"><div class="mo-chips" id="moSucs"></div><div id="moAhora"></div><div class="mo-tabs" id="moTabs"></div><div class="mo-lista" id="moLista"></div><div id="moFaltan"></div>
    <div class="mo-herr"><button type="button" data-mo="prueba"><b>🧪</b>Pedido de prueba</button><button type="button" data-mo="vitrina"><b>🏷️</b>Vitrina y precios</button><button type="button" data-mo="ajustes"><b>⚙️</b>Pagos y horarios</button><button type="button" data-mo="compartir"><b>📣</b>Compartir Taller</button></div></div>`;
  document.body.appendChild(mo);

  const bg=document.createElement('div');bg.className='mo-bg';bg.id='moBg';document.body.appendChild(bg);
  const sh=document.createElement('div');sh.className='mo-sheet';sh.id='moSheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');document.body.appendChild(sh);
  bg.addEventListener('click',cerrarHoja);

  // Botón ⌂ en Surtido para volver a la Puerta
  const top=document.querySelector('.topbar');
  if(top&&!$('puHome')){const b=document.createElement('button');b.type='button';b.className='pu-home';b.id='puHome';b.setAttribute('aria-label','Volver a ARAMO');b.textContent='⌂';b.addEventListener('click',()=>abrirPuerta());top.insertBefore(b,top.firstChild);}
  window.addEventListener('resize',escalarMinis);
}

function pintarNube(){
  const on=N.modo()==='nube';
  ['puNube','moNube'].forEach(id=>{const el=$(id);if(!el)return;el.classList.toggle('on',on);el.querySelector('span').textContent=on?'En vivo':'En este teléfono';el.title=on?'Los encargos se comparten en vivo entre teléfonos':'Nube: '+N.motivo();});
}
function pintarPuerta(){
  if(!$('puerta'))return;
  const h=new Date().getHours();
  $('puH1').textContent=(h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches')+', ¿qué abrimos?';
  const fd=new Date().toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'});$('puDate').textContent=fd.charAt(0).toUpperCase()+fd.slice(1);
  const s=surtidoResumen();
  $('puStatS').textContent=s.prods?`🧺 ${s.prods} producto${s.prods===1?'':'s'} · ${s.provs} proveedor${s.provs===1?'':'es'}`:'Pedido de hoy vacío';
  const a=activos(),nuevos=a.filter(o=>o.estado==='nuevo').length,listos=a.filter(o=>o.estado==='listo').length;
  $('puStatC').textContent=a.length?`🛎️ ${a.length} encargo${a.length>1?'s':''} en curso`:'Lista para recibir pedidos';
  $('puMoN').hidden=!nuevos;$('puMoN').textContent=nuevos;
  $('puMoSub').textContent=a.length?`${nuevos} nuevos · ${a.filter(o=>o.estado==='alistando').length} alistando · ${listos} por entregar`:'Encargos de clientes: alistar, cobrar y entregar';
  const ent=hoyEntregados().filter(o=>o.estado==='entregado');
  const ventas=ent.reduce((t,o)=>t+N.totalDe(o),0);
  const pasos=[['🏪','Proveedores',s.provs||'—'],['🚚','Surtido',s.prods?s.prods+' prod.':'—'],['🏷️','Vitrina',CFG.productos.length-(T().ocultos||[]).length+' prod.'],['🧺','Taller',a.length+' en curso'],['🛎️','Mostrador',listos+' listos'],['🛍️','Entregado',ent.length?$c(ventas):'0 hoy']];
  $('puCadena').innerHTML=pasos.map((p,i)=>`${i?'<span class="pu-flecha">›</span>':''}<div class="pu-eslabon"><b>${p[0]}</b>${p[1]}<em>${esc(p[2])}</em></div>`).join('');
  pintarNube();
}
function clonarSurtido(){
  const box=$('puMiniS');if(!box)return;
  const frag=document.createElement('div');
  frag.className='app';
  const top=document.querySelector('.topbar'),pv=document.querySelector('#view-proveedores .pv-wrap'),nav=document.querySelector('.nav-bottom');
  [top,pv,nav].forEach(el=>{if(!el)return;const c=el.cloneNode(true);c.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));c.removeAttribute('id');c.querySelector?.('.pu-home')?.remove();frag.appendChild(c);});
  box.replaceChildren(frag);
  escalarMinis();
}
function escalarMinis(){
  // Siempre "de lejos": la app se pinta más ancha que la ventana y se reduce.
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
  $('puerta').classList.remove('zoom');
  $('puerta').classList.add('open');document.body.classList.add('pu-lock');
  $('puerta').scrollTop=0;
  try{xpRefresh&&xpRefresh();}catch{}
  pintarPuerta();clonarSurtido();
  requestAnimationFrame(escalarMinis);
}
function cerrarPuerta(){$('puerta').classList.remove('open','zoom');document.body.classList.remove('pu-lock');}
function entrar(cara,el){
  const pu=$('puerta'),v=el?.querySelector('.pu-ventana');
  if(v){
    const r=v.getBoundingClientRect(),inn=pu.querySelector('.pu-in');
    inn.style.transformOrigin=`${r.left+r.width/2}px ${r.top+r.height/2+pu.scrollTop}px`;
    inn.style.transform='scale(2.4)';pu.classList.add('zoom');
  }
  buzz(12);
  setTimeout(()=>{
    const inn=pu.querySelector('.pu-in');inn.style.transform='';
    if(cara==='surtido'){
      cerrarPuerta();
      if(primeraVez&&typeof openScopePicker==='function')openScopePicker();
    }else if(cara==='canasta'){location.href='canasta.html';return;}
    else if(cara==='mostrador'){cerrarPuerta();abrirMostrador();}
    primeraVez=false;
  },v?330:0);
}

// ══════════════ MOSTRADOR ══════════════
function abrirMostrador(id){
  $('mostrador').classList.add('open');document.body.classList.add('pu-lock');
  pintarMostrador();
  if(id)abrirEncargo(id);
}
function filtrar(L){return M.suc==='todas'?L:L.filter(o=>o.sucursal===M.suc);}
function pintarMostrador(){
  if(!$('mostrador')?.classList.contains('open'))return;
  pintarNube();
  const suc=(T().sucursales||[]);
  $('moSucs').innerHTML=[['todas','Ambas tiendas'],...suc.map(s=>[s.k,`${s.n} · ${s.zona}`])].map(([k,n])=>`<button type="button" class="mo-chip${M.suc===k?' on':''}" data-mo="suc" data-k="${k}">${esc(n)}</button>`).join('');
  const A=filtrar(activos()),H=filtrar(hoyEntregados());
  const grupos={nuevo:A.filter(o=>o.estado==='nuevo'),alistando:A.filter(o=>o.estado==='alistando'),listo:A.filter(o=>o.estado==='listo'),hecho:H};
  const ord=L=>L.sort((a,b)=>Date.parse(a.retiro.at)-Date.parse(b.retiro.at));
  Object.values(grupos).forEach(ord);
  // AHORA: una sola acción, la más urgente
  const urg=[...grupos.nuevo,...grupos.alistando].find(urgente);
  const pagoRep=A.find(o=>o.pago?.estado==='reportado'&&o.estado==='listo');
  let ah;
  if(urg)ah=['⏰','Se atrasa',`${urg.ref} · ${urg.cliente.nombre} recoge ${falta(urg.retiro.at)}`,urg.id];
  else if(grupos.nuevo[0])ah=['📥','Nuevo encargo',`${grupos.nuevo[0].ref} · ${grupos.nuevo[0].cliente.nombre} · ${grupos.nuevo[0].items.length} productos`,grupos.nuevo[0].id];
  else if(pagoRep)ah=['📲','Pago SINPE por confirmar',`${pagoRep.ref} · ${$c(N.totalDe(pagoRep))}`,pagoRep.id];
  else if(grupos.listo[0])ah=['🛍️','Por entregar',`${grupos.listo[0].ref} · ${grupos.listo[0].cliente.nombre} · ${falta(grupos.listo[0].retiro.at)}`,grupos.listo[0].id];
  $('moAhora').innerHTML=ah?`<button type="button" class="mo-ahora" data-mo="abrir" data-id="${ah[3]}"><span class="e">${ah[0]}</span><span class="t"><small>Ahora</small><strong>${esc(ah[1])}: ${esc(ah[2])}</strong></span><span class="go">Abrir</span></button>`
    :`<div class="mo-ahora calma"><span class="e">☕</span><span class="t"><small>Ahora</small><strong>Todo al día. Los encargos nuevos aparecen aquí solos.</strong></span></div>`;
  const tabs=[['nuevo','Nuevos'],['alistando','Alistando'],['listo','Listos'],['hecho','Hoy']];
  $('moTabs').innerHTML=tabs.map(([k,n])=>`<button type="button" class="mo-tab${M.tab===k?' on':''}" data-mo="tab" data-k="${k}"><b>${grupos[k].length}</b>${n}</button>`).join('');
  const L=grupos[M.tab];
  $('moLista').innerHTML=L.length?L.map(tarjeta).join(''):`<div class="mo-vacio"><b>${{nuevo:'📭',alistando:'🧺',listo:'✅',hecho:'🌙'}[M.tab]}</b>${{nuevo:'Sin encargos nuevos.',alistando:'Nada alistándose ahora.',listo:'Nada esperando retiro.',hecho:'Todavía no se ha entregado nada hoy.'}[M.tab]}${M.tab==='nuevo'?'<br><br><button type="button" class="mo-btn" data-mo="prueba">🧪 Probar con un pedido de prueba</button>':''}</div>`;
  // faltantes de hoy → Surtido
  const falt=[...new Map(A.concat(H).flatMap(o=>(o.items||[]).filter(i=>i.estado==='nohay').map(i=>[i.k,i]))).values()];
  $('moFaltan').innerHTML=falt.length?`<div class="mo-faltan"><h4>🚚 No hubo hoy: pedirlo en Surtido</h4><div>${falt.map(i=>`<button type="button" class="mo-chip" data-mo="surtir" data-n="${esc(i.n)}">${i.e} ${esc(i.n)}</button>`).join('')}</div></div>`:'';
}
function tarjeta(o){
  const s=suc(o.sucursal),{r,n}=avance(o),M_=N.PAGOS[o.pago?.metodo]||{},tarde=minsA(o.retiro.at)<0&&o.estado!=='entregado';
  const pago=o.pago?.estado==='verificado'?'<span class="mo-pill g">✓ Pagado</span>':o.pago?.estado==='reportado'?'<span class="mo-pill o">📲 Dice que pagó</span>':`<span class="mo-pill">${M_.e||''} ${esc(M_.n||'')}</span>`;
  return `<button type="button" class="mo-card${urgente(o)?' urg':''}" data-mo="abrir" data-id="${o.id}">
    <div class="mo-card-h"><span class="mo-ref">${esc(o.ref)}</span>${o.prueba?'<span class="mo-pill">🧪 prueba</span>':''}<span class="mo-when${tarde?' tarde':''}">${o.estado==='entregado'?'✓ '+fh(o.updated):o.estado==='cancelado'?'Cancelado':'🕐 '+fh(o.retiro.at)+' · '+falta(o.retiro.at)}</span></div>
    <div class="mo-who">${esc(o.cliente.nombre)} <span style="color:var(--m);font-weight:700">· ${esc(fmtTel(o.cliente.tel))}</span></div>
    <div class="mo-meta">${esc(s?.n||'')} · ${o.retiro.envio?(o.retiro.envio.uber?'🛵 Uber en camino':'🛵 envío Uber'):o.retiro.carro?'🚗 al carro'+(o.retiro.placa?' ('+esc(o.retiro.placa)+')':''):'🚶 adentro'} · ${n} productos</div>
    <div class="mo-emos">${o.items.map(i=>i.e).join('')}</div>
    ${o.estado==='alistando'?`<div class="mo-bar"><i style="width:${n?r/n*100:0}%"></i></div>`:''}
    <div class="mo-foot">${pago}${o.sust==='avisar'?'':`<span class="mo-pill">${SUST[o.sust]}</span>`}<span class="mo-total">${N.esAprox(o)?'~':''}${$c(N.totalDe(o))}</span></div>
  </button>`;
}

// ── Hoja de un encargo ──
function abrirHoja(html){
  $('moSheet').innerHTML='<div class="mo-grip"></div><button type="button" class="mo-x" data-mo="cerrar" aria-label="Cerrar">✕</button>'+html;
  $('moSheet').classList.add('open');$('moBg').classList.add('open');
}
function cerrarHoja(){
  pararCamara();M.abierto=null;M.vista=null;
  $('moSheet')?.classList.remove('open');$('moBg')?.classList.remove('open');
}
function abrirEncargo(id){M.abierto=id;M.vista='encargo';M.pin='';pintarEncargo();}
function msgCliente(o){
  const s=suc(o.sucursal),t=T(),tot=N.totalDe(o),link=N.enlace('canasta.html','e',o);
  const hola=`¡Hola ${o.cliente.nombre.split(' ')[0]}! 👋`;
  if(o.estado==='listo'){
    const pago=o.pago.metodo==='sinpe'&&o.pago.estado!=='verificado'
      ?`\n📲 Pagá ${$c(tot)} por SINPE Móvil${telDig(t.sinpe?.numero)?' al '+fmtTel(t.sinpe.numero)+(t.sinpe.nombre?' ('+t.sinpe.nombre+')':''):''} con la descripción ${o.ref}.`
      :o.pago.metodo==='link'&&t.linkTarjeta?`\n🔗 Pagá con tarjeta aquí: ${t.linkTarjeta}`:`\n💳 Total: ${$c(tot)} (${(N.PAGOS[o.pago.metodo]?.n||'').toLowerCase()}).`;
    const sin=o.items.filter(i=>i.estado==='nohay');
    const donde=o.retiro.envio?(o.retiro.envio.uber?' y ya va en camino con Uber 🛵':'; ya pedimos el Uber a tu ubicación 🛵'):` en ${s?.n||'ARAMO'} (${s?.zona||''})`;
    return `${hola}\n✅ Tu canasta ${o.ref} está *lista*${donde}.${o.retiro.envio&&+o.retiro.envio.costo?`\n🛵 Envío: ${$c(o.retiro.envio.costo)} (incluido en el total).`:''}${pago}${sin.length?`\n⚠️ No hubo: ${sin.map(i=>i.n+(i.sub?' → '+i.sub:'')).join(', ')}.`:''}${o.retiro.envio?'':'\n🧾 Mostrá tu código de retiro al llegar.'}\n\nSeguí tu pedido aquí 👉 ${link}`;
  }
  if(o.estado==='alistando')return `${hola}\n🧑‍🌾 Ya estamos alistando tu canasta ${o.ref}. Te avisamos cuando esté lista.\n\nSeguila aquí 👉 ${link}`;
  if(o.estado==='entregado')return `${hola}\n🛍️ ¡Gracias por comprar en ${t.nombre||'ARAMO'}! Tu pedido ${o.ref} quedó entregado.`;
  if(o.estado==='cancelado')return `${hola}\nTu pedido ${o.ref} quedó cancelado${o.motivo?': '+o.motivo:''}. Cualquier cosa nos escribís.`;
  return `${hola}\n📥 Recibimos tu pedido ${o.ref}. Seguilo aquí 👉 ${link}`;
}
function pintarEncargo(){
  const o=N.get(M.abierto);if(!o){cerrarHoja();return;}
  if(M.vista==='pin')return pintarPin(o);
  const s=suc(o.sucursal),{r,n}=avance(o),P=N.PAGOS[o.pago?.metodo]||{},tot=N.totalDe(o),edit=o.estado==='alistando';
  const estadoTxt={nuevo:'📥 Nuevo',alistando:'🧑‍🌾 Alistando',listo:'✅ Listo para retirar',entregado:'🛍️ Entregado',cancelado:'✖️ Cancelado'}[o.estado];
  const items=o.items.map((it,i)=>{
    const cls=it.estado==='listo'?'ok':it.estado==='nohay'?'no':'';
    const q=it.qr!=null&&it.qr!==''?it.qr:it.q;
    return `<div class="mo-it ${cls}" style="flex-wrap:wrap"><span class="e">${it.e}</span><span class="t"><strong>${esc(it.n)}</strong><small>Pidió ${esc(qtxt(it.q,it.u))} · ${$c(it.p)}${it.u==='kg'?'/kg':' c/u'}${it.mad?' · '+esc(MAD[it.mad]||''):''}${it.nota?' · 📝 '+esc(it.nota):''}</small></span>
      ${edit?`<input type="number" inputmode="decimal" step="${it.u==='kg'?'0.05':'1'}" min="0" value="${esc(q)}" data-mo-q="${i}" aria-label="Cantidad real de ${esc(it.n)}"><button type="button" class="mo-ck${it.estado==='listo'?' on':''}" data-mo="it-ok" data-i="${i}" aria-label="Listo">✓</button><button type="button" class="mo-ck no${it.estado==='nohay'?' on':''}" data-mo="it-no" data-i="${i}" aria-label="No hay">✕</button>`
        :`<span style="font-weight:900;font-size:13.5px">${it.estado==='nohay'?'No hubo':esc(qtxt(q,it.u))}</span>`}
      ${edit&&it.estado==='nohay'&&o.sust==='similar'?`<input class="sub" type="text" placeholder="Cambio por… (opcional)" value="${esc(it.sub||'')}" data-mo-sub="${i}">`:''}
    </div>`;}).join('');
  let acc='';
  if(o.estado==='nuevo')acc=`<button type="button" class="mo-btn p w" data-mo="aceptar">🧑‍🌾 Aceptar y empezar a alistar</button><div class="mo-btns"><button type="button" class="mo-btn r" data-mo="rechazar">Rechazar</button><button type="button" class="mo-btn" data-mo="wa">💬 Escribirle</button></div>`;
  if(o.estado==='alistando')acc=`<button type="button" class="mo-btn p w" data-mo="listo" ${r<n?'disabled':''}>${r<n?(n-r===1?'Falta 1 producto por revisar':`Faltan ${n-r} productos por revisar`):'✅ Marcar lista y avisar'}</button><div class="mo-btns"><button type="button" class="mo-btn" data-mo="todo-ok">✓ Todo está</button><button type="button" class="mo-btn" data-mo="wa">💬 Avisarle</button></div>`;
  if(o.estado==='listo')acc=`${o.pago.metodo==='sinpe'&&o.pago.estado!=='verificado'?`<button type="button" class="mo-btn o w" data-mo="pagado" style="margin-bottom:8px">📲 Confirmar SINPE de ${$c(tot)}${o.pago.estado==='reportado'?' (el cliente dice que pagó)':''}</button>`:''}${o.retiro.envio?(o.retiro.envio.uber?'':'<button type="button" class="mo-btn o w" style="margin-bottom:8px" data-mo="uber">🚗 Pedir Uber</button>')+'<button type="button" class="mo-btn p w" data-mo="entregado-uber">🛍️ El cliente ya la recibió</button>':'<button type="button" class="mo-btn p w" data-mo="entregar">🛍️ Entregar con código</button>'}<div class="mo-btns"><button type="button" class="mo-btn" data-mo="wa">💬 Avisarle que está lista</button><button type="button" class="mo-btn" data-mo="volver-alistar">↩︎ Volver a alistar</button></div>`;
  if(o.estado==='entregado'||o.estado==='cancelado')acc=`<button type="button" class="mo-btn w" data-mo="wa">💬 Escribirle</button>`;
  const pesoR=o.items.reduce((t,i)=>t+(i.u==='kg'&&i.estado==='listo'?+(i.qr??i.q)||0:0),0);
  const verd={nuevo:['Nuevo','run'],alistando:[`Alistando ${r}/${n}`,'run'],listo:['Lista','ok'],entregado:['Entregado','ok'],cancelado:['Cancelado','bad']}[o.estado]||['',''];
  const holo=o.items.map(i=>{const q=i.qr!=null&&i.qr!==''?+i.qr:i.q;return `<div class="mo-hit ${i.estado==='listo'?'ok':i.estado==='nohay'?'no':o.estado==='alistando'?'wait':''}" title="${esc(i.n)}"><b>${i.e}</b><small>${esc(qtxt(q,i.u))}</small></div>`;}).join('');
  abrirHoja(`<p class="mo-kick">Encargo · mesa de trabajo</p><div class="mo-hrow"><div class="mo-h">${esc(o.ref)} ${o.prueba?'<span class="mo-pill">🧪 prueba</span>':''}</div><span class="mo-verd ${verd[1]}">${esc(verd[0])}</span></div><div class="mo-s">${estadoTxt} · sellado ${fdia(o.created)} ${fh(o.created)}</div>
    <div class="mo-stage${o.estado==='alistando'?' run':''}"><span class="mo-tag">Lo que ve el cliente · en vivo</span><div class="mo-scan"></div><div class="mo-holo">${holo}</div></div>
    <div class="mo-metrics"><div><span>Revisados</span><b>${r}/${n}</b></div><div><span>Peso real</span><b>${pesoR?(Math.round(pesoR*100)/100).toLocaleString('es-CR')+' kg':'—'}</b></div><div><span>${N.esAprox(o)?'Total aprox.':'Total'}</span><b>${$c(tot)}</b></div></div>
    <div class="mo-blk"><h4>Cliente</h4><div class="mo-row"><span style="flex:1"><strong style="font-size:16px">${esc(o.cliente.nombre)}</strong><br><small style="color:var(--m)">${esc(fmtTel(o.cliente.tel))}</small></span><a class="mo-btn" href="tel:${esc(telDig(o.cliente.tel))}">📞</a><button type="button" class="mo-btn" data-mo="wa">💬</button></div></div>
    ${o.retiro.envio?envioHtml(o):`<div class="mo-blk"><h4>Retiro</h4><div style="font-weight:900">${esc(s?.n||'')} · ${esc(s?.zona||'')}</div><div class="mo-s">${fdia(o.retiro.at)} a las ${fh(o.retiro.at)} (${falta(o.retiro.at)}) · ${o.retiro.carro?'🚗 al carro'+(o.retiro.placa?': '+esc(o.retiro.placa):''):'🚶 adentro'}</div></div>`}
    <div class="mo-blk"><h4>Pago</h4><div style="font-weight:900">${P.e||''} ${esc(P.n||'')} ${o.pago.estado==='verificado'?'<span class="mo-pill g">✓ cobrado</span>':o.pago.estado==='reportado'?'<span class="mo-pill o">el cliente dice que pagó</span>':'<span class="mo-pill">pendiente</span>'}</div>${o.pago.conCuanto?`<div class="mo-s">Paga con ${$c(o.pago.conCuanto)} → vuelto ${$c(Math.max(0,o.pago.conCuanto-tot))}</div>`:''}</div>
    <div class="mo-blk"><h4>Productos · si algo no hay: ${SUST[o.sust]||''}</h4>${items}
      <div class="mo-tot"><span>${N.esAprox(o)?'Total aproximado':'Total'}</span><b>${$c(tot)}</b></div>${o.nota?`<div class="mo-s" style="margin-top:8px">📝 ${esc(o.nota)}</div>`:''}</div>
    <div style="margin-top:14px">${acc}</div>
    <details class="mo-blk"><summary style="font-weight:900;font-size:13px">🧾 Bitácora del encargo</summary><div class="mo-log" style="margin-top:8px">${(o.log||[]).map(l=>`${fdia(l.t)} ${fh(l.t)} · ${l.by==='cliente'?'👤':'🛎️'} ${esc(l.m||{nuevo:'Recibido',alistando:'Empezó a alistarse',listo:'Quedó lista',entregado:'Entregado',cancelado:'Cancelado'}[l.s]||l.s)}`).join('<br>')}</div></details>`);
  $('moSheet').querySelectorAll('[data-mo-q]').forEach(inp=>inp.addEventListener('change',()=>{
    const i=+inp.dataset.moQ,v=inp.value===''?null:+inp.value;
    N.cambiar(o.id,x=>{x.items[i].qr=v;if(v===0)x.items[i].estado='nohay';else if(x.items[i].estado!=='nohay')x.items[i].estado='listo';},'tienda').then(pintarEncargo);
  }));
  const ce=$('moEnvio');if(ce)ce.addEventListener('change',()=>{const v=Math.max(0,+ce.value||0);N.cambiar(o.id,x=>{if(x.retiro.envio)x.retiro.envio.costo=v;},'tienda','Envío Uber: '+$c(v)).then(()=>{pintarEncargo();pintarMostrador();});});
  $('moSheet').querySelectorAll('[data-mo-sub]').forEach(inp=>inp.addEventListener('change',()=>{
    const i=+inp.dataset.moSub;N.cambiar(o.id,x=>{x.items[i].sub=inp.value.trim();},'tienda');
  }));
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
  abrirHoja(`<div class="mo-h">Entregar ${esc(o.ref)}</div><div class="mo-s">Pedile a ${esc(o.cliente.nombre.split(' ')[0])} su código de retiro (4 números) o escaneá su QR.</div>
    <div class="mo-pin" id="moPin">${d.map(c=>`<span class="${c!==' '?'f':''}">${c!==' '?c:''}</span>`).join('')}</div>
    <div class="mo-pad">${[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(k=>`<button type="button" data-mo="pin" data-k="${k}">${k}</button>`).join('')}</div>
    ${'BarcodeDetector' in window?'<button type="button" class="mo-btn w" style="margin-top:10px" data-mo="qr">📷 Escanear QR</button><video class="mo-video" id="moVideo" playsinline muted hidden></video>':''}
    <div class="mo-btns"><button type="button" class="mo-btn" data-mo="abrir" data-id="${o.id}">‹ Volver</button><button type="button" class="mo-btn" data-mo="sin-codigo">Entregar sin código</button></div>`);
}
async function entregar(o,como){
  const cobra=o.pago.metodo==='efectivo'||o.pago.metodo==='tarjeta';
  await N.cambiar(o.id,x=>{x.estado='entregado';x.entregado=new Date().toISOString();if(cobra||x.pago.estado==='reportado')x.pago.estado='verificado';},'tienda',como);
  pararCamara();campana();buzz([40,40,80]);
  toast(`🛍️ ${o.ref} entregado${cobra?' · cobrá '+$c(N.totalDe(o))+' '+(o.pago.metodo==='efectivo'?'en efectivo':'con tarjeta'):''}`);
  M.vista='encargo';pintarEncargo();pintarMostrador();
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
          if(m&&m[1]===o.ref&&m[2]===o.pin){entregar(o,'Entregado con QR');return;}
          toast('Ese QR no es de '+o.ref);}
      }catch{}
      _scan=setTimeout(loop,350);
    };loop();
  }catch{toast('No se pudo abrir la cámara; usá el código');}
}
function pararCamara(){clearTimeout(_scan);if(_stream){_stream.getTracks().forEach(t=>t.stop());_stream=null;}}

// ── Herramientas ──
function pedidoPrueba(){
  const nombres=['María Fernanda','Carlos','Ana Lucía','Don Rafa','Sofía','Luis Diego'];
  const pick=[...CFG.productos].sort(()=>Math.random()-.5).slice(0,5+Math.floor(Math.random()*4));
  const s=(T().sucursales||[]).filter(x=>x.activa!==false);
  const suc_=M.suc!=='todas'?M.suc:(s[Math.floor(Math.random()*s.length)]||s[0]).k;
  const met=['sinpe','efectivo','tarjeta'][Math.floor(Math.random()*3)];
  const items=pick.map(p=>({k:p.k,n:p.n,e:p.e,u:p.u,q:p.u==='kg'?[.5,1,1.5,2][Math.floor(Math.random()*4)]:1+Math.floor(Math.random()*5),p:+(T().precios||{})[p.k]||p.p,mad:p.mad&&Math.random()<.4?'hoy':'',nota:''}));
  const o=N.crear({id:N.nuevoId(),ref:N.nuevoRef(),pin:N.nuevoPin(),estado:'nuevo',sucursal:suc_,prueba:true,
    cliente:{nombre:nombres[Math.floor(Math.random()*nombres.length)]+' (prueba)',tel:'8'+String(Math.floor(Math.random()*1e7)).padStart(7,'0')},
    retiro:{modo:'asap',at:new Date(Date.now()+(T().alistadoMin||40)*6e4).toISOString(),carro:Math.random()<.3,placa:''},
    pago:{metodo:met,conCuanto:met==='efectivo'?20000:0,estado:'pendiente'},sust:['avisar','similar','quitar'][Math.floor(Math.random()*3)],nota:'',items,totalEst:0});
  M.tab='nuevo';pintarMostrador();toast('🧪 Pedido de prueba '+o.ref+' creado');
}
function pintarVitrina(){
  const t=T(),V=M.vit;
  if(!V.precios){V.precios={...(t.precios||{})};V.ocultos=new Set(t.ocultos||[]);V.agotados=new Set(t.agotados||[]);}
  const q=nrm(V.q);
  const L=CFG.productos.filter(p=>!q||nrm(p.n).includes(q));
  const margen=(typeof S!=='undefined'&&+S.margen)||35;
  abrirHoja(`<div class="mo-h">🏷️ Vitrina y precios</div><div class="mo-s">Lo que ven los clientes en Canasta. 👁 se muestra · 🚫 agotado hoy. Debajo de cada producto ves lo que te cuesta hoy en Surtido.</div>
    <label class="mo-field">Buscar<input type="search" id="moVitQ" value="${esc(V.q)}" placeholder="Ej.: aguacate" autocomplete="off"></label>
    <div class="mo-blk" style="padding:4px 12px">${L.map(p=>{
      const c=costoHoy(p.n),sug=c?N.redondear5(Math.ceil(c.pr*(1+margen/100)/25)*25):null,oc=V.ocultos.has(p.k);
      return `<div class="mo-vi${oc?' oculto':''}"><span class="e">${p.e}</span><span class="t"><strong>${esc(p.n)}</strong><small>${p.u==='kg'?'por kg':'por '+esc(UNI[p.u]||p.u)}${c?` · costo ${$c(c.pr)} (${esc(c.prov)})`:''}${sug?` · <button type="button" class="link" style="color:var(--g);font-weight:900;background:none;border:0;padding:0;font-size:11.5px" data-mo="sug" data-k="${p.k}" data-v="${sug}">usar ${$c(sug)}</button>`:''}</small></span>
        <input type="number" inputmode="numeric" min="0" step="5" value="${V.precios[p.k]||p.p}" data-mo-pr="${p.k}" aria-label="Precio de ${esc(p.n)}">
        <button type="button" class="tg${oc?'':' on'}" data-mo="vis" data-k="${p.k}" aria-label="Mostrar">${oc?'🙈':'👁'}</button><button type="button" class="tg ag${V.agotados.has(p.k)?' on':''}" data-mo="ago" data-k="${p.k}" aria-label="Agotado">🚫</button></div>`;}).join('')||'<div class="mo-vacio">Nada con ese nombre.</div>'}</div>
    <button type="button" class="mo-btn p w" style="margin-top:12px" data-mo="vit-ok">Guardar vitrina</button>`);
  const qi=$('moVitQ');qi.addEventListener('input',()=>{V.q=qi.value;const pos=qi.selectionStart;pintarVitrina();const n=$('moVitQ');n.focus();n.setSelectionRange(pos,pos);});
  $('moSheet').querySelectorAll('[data-mo-pr]').forEach(i=>i.addEventListener('input',()=>{const k=i.dataset.moPr,base=CFG.productos.find(p=>p.k===k)?.p;const v=+i.value;if(v>0&&v!==base)V.precios[k]=v;else delete V.precios[k];}));
}
function pintarAjustes(){
  const t=T();
  abrirHoja(`<div class="mo-h">⚙️ Pagos y horarios</div><div class="mo-s">Esto es lo que ve el cliente al pagar y al elegir hora.</div>
    <div class="mo-blk"><h4>Tienda</h4>
      <label class="mo-field">Nombre<input id="ajNombre" value="${esc(t.nombre)}"></label>
      <label class="mo-field">WhatsApp de la tienda (recibe pedidos y comprobantes)<input id="ajWa" inputmode="tel" placeholder="8888-8888" value="${esc(fmtTel(t.whatsapp))}"></label>
      <label class="mo-field">Minutos para alistar un pedido<input id="ajMin" type="number" min="10" max="240" value="${+t.alistadoMin||40}"></label>
      <label class="mo-sw">Ofrecer "me la llevan al carro"<input type="checkbox" id="ajCarro" ${t.alCarro?'checked':''}></label>
      <label class="mo-sw">Ofrecer envío a domicilio con Uber<input type="checkbox" id="ajEnvio" ${t.envio!==false?'checked':''}></label></div>
    <div class="mo-blk"><h4>📲 SINPE Móvil</h4><div class="mo-dos"><label class="mo-field">Número<input id="ajSinpe" inputmode="tel" placeholder="8888-8888" value="${esc(fmtTel(t.sinpe?.numero))}"></label><label class="mo-field">A nombre de<input id="ajSinpeN" placeholder="Ej.: ARAMO S.A." value="${esc(t.sinpe?.nombre||'')}"></label></div></div>
    <div class="mo-blk"><h4>🔗 Tarjeta en línea (opcional)</h4><label class="mo-field">Link de pago (Tilopay, ONVO, BAC…)<input id="ajLink" type="url" placeholder="https://…" value="${esc(t.linkTarjeta||'')}"></label><div class="mo-s">Si lo dejás vacío, la tarjeta se cobra con datáfono al recoger.</div></div>
    ${(t.sucursales||[]).map(s=>`<div class="mo-blk"><h4>${esc(s.n)} · ${esc(s.zona)}</h4><label class="mo-sw">Recibe pedidos<input type="checkbox" data-aj-act="${s.k}" ${s.activa!==false?'checked':''}></label><div class="mo-dos"><label class="mo-field">Abre<input type="time" data-aj-abre="${s.k}" value="${esc(s.abre)}"></label><label class="mo-field">Cierra<input type="time" data-aj-cierra="${s.k}" value="${esc(s.cierra)}"></label></div><button type="button" class="mo-btn w" style="margin-top:10px" data-mo="tienda-gps" data-k="${s.k}">📍 ${s.lat?'Ubicación guardada · actualizar':'Guardar ubicación de la tienda (estando aquí)'}</button></div>`).join('')}
    <button type="button" class="mo-btn p w" style="margin-top:12px" data-mo="aj-ok">Guardar</button>`);
}
function linkCanasta(){return new URL('canasta.html',location.href).href.split('#')[0].split('?')[0];}
function pintarCompartir(){
  const url=linkCanasta(),on=N.modo()==='nube';
  let qr='';
  if(window.qrcode){const q=window.qrcode(0,'M');q.addData(url);q.make();qr=q.createSvgTag({cellSize:4,margin:0,scalable:true});}
  abrirHoja(`<div class="mo-h">📣 Compartir el Taller</div><div class="mo-s">Pegá este QR en caja o mandá el link: tus clientes arman su pedido en el Taller y lo recogen listo o les llega a casa.</div>
    ${qr?`<div class="mo-qr">${qr}</div>`:''}
    <code class="mo-code">${esc(url)}</code>
    <div class="mo-btns"><button type="button" class="mo-btn" data-mo="copiar" data-v="${esc(url)}">📋 Copiar link</button><button type="button" class="mo-btn p" data-mo="wa-share">💬 Mandar por WhatsApp</button></div>
    <a class="mo-btn w" style="margin-top:8px" href="canasta.html">👀 Verla como cliente</a>
    <div class="mo-blk" style="margin-top:16px"><h4>${on?'🟢 Encargos en vivo':'🟠 Encargos en este teléfono'}</h4>
      ${on?'<div class="mo-s">Cada pedido nuevo aparece solo en todos los teléfonos de la tienda.</div>'
      :`<div class="mo-s">Ahora mismo ${esc(N.motivo())}. Todo funciona igual: el cliente te manda el pedido por WhatsApp con un link, lo tocás y entra aquí. Vos le avisás con otro link y su teléfono se actualiza.</div>
        <div class="mo-s" style="margin-top:8px"><b>Para que lleguen solos a todos los teléfonos:</b> entrá a supabase.com, reactivá el proyecto de ARAMO y pegá en <i>SQL Editor</i> el archivo <b>supabase-encargos.sql</b>. La app se conecta sola en menos de un minuto.</div>`}</div>`);
}

// ── Acciones ──
const ACT={
  surtido(el){entrar('surtido',el);},canasta(el){entrar('canasta',el);},mostrador(el){entrar('mostrador',el);},
  puerta(){abrirPuerta();},
  compartir(){if(!$('mostrador').classList.contains('open')){cerrarPuerta();abrirMostrador();}M.vista='compartir';pintarCompartir();},
  suc(el){M.suc=el.dataset.k;pintarMostrador();},
  tab(el){M.tab=el.dataset.k;pintarMostrador();},
  abrir(el){abrirEncargo(el.dataset.id);},
  cerrar(){cerrarHoja();},
  prueba(){pedidoPrueba();},
  vitrina(){M.vit={q:'',precios:null};M.vista='vitrina';pintarVitrina();},
  ajustes(){M.vista='ajustes';pintarAjustes();},
  surtir(el){
    cerrarHoja();$('mostrador').classList.remove('open');cerrarPuerta();
    try{switchView('proveedores');const i=$('pvSearch');if(i){i.value=el.dataset.n;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}}catch{}
    toast('🚚 Buscando '+el.dataset.n+' en Surtido');
  },
  aceptar(){N.cambiar(M.abierto,o=>{o.estado='alistando';},'tienda','La tienda aceptó y empezó a alistar').then(()=>{M.tab='alistando';pintarEncargo();pintarMostrador();toast('🧑‍🌾 A alistar');});},
  rechazar(){
    const o=N.get(M.abierto);const m=prompt('¿Por qué no se puede hacer? (se lo decimos al cliente)','No tenemos varios productos hoy');
    if(m===null)return;
    N.cambiar(o.id,x=>{x.estado='cancelado';x.motivo=m||'La tienda no pudo hacerlo';},'tienda','Rechazado: '+(m||'')).then(x=>{pintarEncargo();pintarMostrador();abrir(N.wa(x.cliente.tel,msgCliente(x)));});
  },
  'it-ok'(el){const i=+el.dataset.i;N.cambiar(M.abierto,o=>{const it=o.items[i];it.estado=it.estado==='listo'?'':'listo';if(it.estado==='listo'&&(it.qr==null||it.qr===''))it.qr=it.q;},'tienda').then(()=>{buzz(8);pintarEncargo();pintarMostrador();});},
  'it-no'(el){const i=+el.dataset.i;N.cambiar(M.abierto,o=>{const it=o.items[i];it.estado=it.estado==='nohay'?'':'nohay';},'tienda').then(()=>{buzz(8);pintarEncargo();pintarMostrador();});},
  'todo-ok'(){N.cambiar(M.abierto,o=>{o.items.forEach(it=>{if(it.estado!=='nohay'){it.estado='listo';if(it.qr==null||it.qr==='')it.qr=it.q;}});},'tienda').then(()=>{pintarEncargo();pintarMostrador();});},
  listo(){
    N.cambiar(M.abierto,o=>{o.estado='listo';o.totalFinal=N.totalDe(o);},'tienda','Lista para retirar · '+$c(N.totalDe(N.get(M.abierto)))).then(o=>{
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
      if(M.pin===o.pin){entregar(o,'Entregado con código');return;}
      pintarPin(o);$('moPin').classList.add('mal');buzz([60,40,60]);M.pin='';toast('Ese código no coincide');setTimeout(()=>{if(M.vista==='pin')pintarPin(o);},500);return;
    }
    pintarPin(o);
  },
  qr(){escanear(N.get(M.abierto));},
  uber(){
    const o=N.get(M.abierto);if(!o?.retiro?.envio)return;
    abrir(uberLink(o));
    if(!o.retiro.envio.uber)N.cambiar(o.id,x=>{x.retiro.envio.uber=new Date().toISOString();},'tienda','Uber pedido').then(()=>{pintarEncargo();pintarMostrador();});
  },
  'entregado-uber'(){const o=N.get(M.abierto);if(confirm(`¿${o.cliente.nombre} ya recibió ${o.ref}?`))entregar(o,'Entregado por Uber');},
  'tienda-gps'(el){
    if(!navigator.geolocation){toast('Este teléfono no comparte ubicación');return;}
    toast('📍 Tomando la ubicación de la tienda…');
    navigator.geolocation.getCurrentPosition(p=>{
      const t=T(),k=el.dataset.k;
      N.guardarTienda({sucursales:(t.sucursales||[]).map(s=>s.k===k?{...s,lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6)}:s)});
      toast('📍 Ubicación de la tienda guardada');pintarAjustes();
    },()=>toast('No se pudo tomar la ubicación'),{enableHighAccuracy:true,timeout:15000});
  },
  'sin-codigo'(){const o=N.get(M.abierto);if(confirm(`¿Entregar ${o.ref} a ${o.cliente.nombre} sin código? Revisá su nombre y teléfono.`))entregar(o,'Entregado sin código (verificado a mano)');},
  wa(){const o=N.get(M.abierto);if(o)abrir(N.wa(o.cliente.tel,msgCliente(o)));},
  vis(el){const V=M.vit,k=el.dataset.k;V.ocultos.has(k)?V.ocultos.delete(k):V.ocultos.add(k);guardarScroll(pintarVitrina);},
  ago(el){const V=M.vit,k=el.dataset.k;V.agotados.has(k)?V.agotados.delete(k):V.agotados.add(k);guardarScroll(pintarVitrina);},
  sug(el){M.vit.precios[el.dataset.k]=+el.dataset.v;guardarScroll(pintarVitrina);},
  'vit-ok'(){const V=M.vit;N.guardarTienda({precios:V.precios,ocultos:[...V.ocultos],agotados:[...V.agotados]});cerrarHoja();toast(N.modo()==='nube'?'🏷️ Vitrina publicada para todos':'🏷️ Vitrina guardada en este teléfono');pintarPuerta();},
  'aj-ok'(){
    const t=T(),v=id=>$(id)?.value.trim()||'';
    const sucs=(t.sucursales||[]).map(s=>({...s,activa:!!document.querySelector(`[data-aj-act="${s.k}"]`)?.checked,abre:document.querySelector(`[data-aj-abre="${s.k}"]`)?.value||s.abre,cierra:document.querySelector(`[data-aj-cierra="${s.k}"]`)?.value||s.cierra}));
    N.guardarTienda({nombre:v('ajNombre')||'ARAMO',whatsapp:telDig(v('ajWa')),alistadoMin:Math.max(10,+v('ajMin')||40),alCarro:$('ajCarro').checked,envio:$('ajEnvio').checked,sinpe:{numero:telDig(v('ajSinpe')),nombre:v('ajSinpeN')},linkTarjeta:v('ajLink'),sucursales:sucs});
    cerrarHoja();toast('⚙️ Guardado');
  },
  copiar(el){navigator.clipboard?.writeText(el.dataset.v).then(()=>toast('📋 Link copiado'),()=>toast(el.dataset.v));},
  'wa-share'(){abrir(N.wa('',`🧺 ¡Ya podés pedir en ${T().nombre||'ARAMO'} desde el celular! Entrá al Taller, armá tu canasta de frutas y verduras y la recogés lista o te llega a casa 👉 ${linkCanasta()}`));},
};
function guardarScroll(fn){const y=$('moSheet').scrollTop;fn();$('moSheet').scrollTop=y;}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-pu],[data-mo]');if(!el||el.disabled)return;
  if(!el.closest('#puerta,#mostrador,#moSheet'))return;
  const f=ACT[el.dataset.pu||el.dataset.mo];if(!f)return;
  e.preventDefault();f(el);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('moSheet')?.classList.contains('open'))cerrarHoja();});

// ══════════════ En vivo ══════════════
const vistos=new Map(N.lista().map(o=>[o.id,o.estado+'|'+(o.pago?.estado||'')]));
function vigilar(){
  N.lista().forEach(o=>{
    const k=o.estado+'|'+(o.pago?.estado||''),antes=vistos.get(o.id);vistos.set(o.id,k);
    if(antes===k)return;
    if(!antes&&o.estado==='nuevo'&&!o.prueba){toast(`🛎️ Nuevo encargo ${o.ref} · ${o.cliente.nombre}`);campana();buzz([80,50,80]);}
    else if(antes&&o.pago?.estado==='reportado'&&!antes.endsWith('reportado')){toast(`📲 ${o.cliente.nombre} dice que pagó ${o.ref}`);campana();}
    else if(antes&&o.estado==='cancelado'&&!antes.startsWith('cancelado'))toast(`✖️ ${o.ref} fue cancelado`);
  });
  const n=activos().filter(o=>o.estado==='nuevo').length;
  document.title=(n?`(${n}) `:'')+'ARAMO';
}
N.on(tipo=>{
  if(tipo==='encargo')vigilar();
  pintarPuerta();pintarMostrador();
  if(M.vista==='encargo'&&$('moSheet').classList.contains('open')&&!document.activeElement?.matches?.('#moSheet input'))pintarEncargo();
});
setInterval(()=>{if($('mostrador')?.classList.contains('open')&&!$('moSheet').classList.contains('open'))pintarMostrador();},30000);

// ══════════════ Arranque ══════════════
montar();
const enc=location.hash.match(/^#encargo=(.+)$/);
history.replaceState(null,'',location.pathname+location.search);
N.conectar();
if(enc){
  const o=N.unpack(enc[1]);
  if(o?.id){N.importar(o);primeraVez=false;document.getElementById('scopePicker')?.classList.remove('open');document.body.classList.remove('scope-picker-open');abrirMostrador(o.id);toast('🛎️ Encargo '+o.ref+' recibido por WhatsApp');}
  else abrirPuerta();
}else abrirPuerta();
window.addEventListener('hashchange',()=>{
  const m=location.hash.match(/^#encargo=(.+)$/);if(!m)return;
  const o=N.unpack(m[1]);history.replaceState(null,'',location.pathname+location.search);
  if(!o?.id)return;
  N.importar(o);cerrarPuerta();abrirMostrador(o.id);toast('🛎️ Encargo '+o.ref+' recibido por WhatsApp');
});
window.AramoPuerta={abrirPuerta,abrirMostrador,pintarMostrador};
})();
