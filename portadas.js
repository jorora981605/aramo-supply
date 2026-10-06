/* ══════════════════════════════════════════════════════════════════════
   ARAMO · Portadas — 5 formas de la pantalla principal (la Puerta).

   Reglas que comparten las 5:
   · Mismo orden siempre: 1 Surtido · 2 Taller · 3 ARAMO POS. Cambia el
     estilo, nunca el lugar: la mano aprende dónde tocar.
   · Una franja "Ahora" con lo más urgente (pedido nuevo, atrasos, SINPE,
     pedido a proveedores sin enviar…). Un toque y estás ahí.
   · Teclas 1 · 2 · 3 · M en la computadora.
   · Datos en vivo en cada puerta.

   puerta.js calcula los datos (D) y maneja los toques (data-pu); aquí solo
   vive el dibujo de cada portada.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};

const PUERTAS=[
  {k:'surtido',n:'Surtido',e:'🚚',d:'Lo que pedimos a proveedores',tecla:'1',c:'s',arte:['🍅','🥕','🥬','🧅'],dato:'s'},
  {k:'canasta',n:'Taller',e:'🧺',d:'Lo que nos piden los clientes',tecla:'2',c:'t',arte:['🥑','🍋','🌿','🍌'],dato:'t'},
  {k:'pos',n:'ARAMO POS',e:'🧾',d:'Ventas y caja del mostrador',tecla:'3',c:'p',arte:['💵','💳','📲','🧾'],dato:'p'},
];
const LISTA=[
  {n:1,t:'Ventanas vivas',d:'Cada app adentro de su ventana, vista de lejos: ves cómo está antes de entrar.'},
  {n:2,t:'Puestos del mercado',d:'Tres puestos gigantes con su toldo. Un toque y entrás: la más rápida con una mano.',rec:true},
  {n:3,t:'Mostrador grande',d:'El Mostrador en grande arriba (naranja si hay pedidos nuevos); las 3 puertas quedan abajo, al alcance del pulgar.'},
  {n:4,t:'Pizarra de la verdu',d:'Como la pizarra de precios: madera, tiza y la lista del día con sus números.'},
  {n:5,t:'Consola de taller',d:'Escribí lo que buscás (tomate, A-7KQ3, caja…) o usá 1·2·3. Para ir volando.'},
];
function actual(){
  // ?portada=N se usa una vez: se guarda y se quita de la dirección, así después manda lo que elijas.
  const q=location.search.match(/[?&]portada=([1-5])/);
  if(q){
    LS.set('aramo_portada',+q[1]);
    try{const u=new URL(location.href);u.searchParams.delete('portada');history.replaceState(history.state,'',u.pathname+(u.search||'')+u.hash);}catch{}
    return +q[1];
  }
  const v=+LS.get('aramo_portada',2);
  return v>=1&&v<=5?v:2;
}
function elegir(n){LS.set('aramo_portada',Math.min(5,Math.max(1,+n||2)));}

// ── Piezas comunes ──
const herramientas=()=>`<div class="po-tools"><button type="button" class="po-chip po-local" data-pu="local" aria-label="Cambiar de local" title="Cambiar de local"><span data-d="local"></span></button><button type="button" class="po-chip po-nube" data-pu="compartir" data-nube title="Compartir el Taller"><i></i><span data-d="nube"></span></button><button type="button" class="po-chip po-avisar" data-pu="avisos-on" data-dn="avisosTxt" title="Activar avisos de pedidos nuevos"></button><span class="po-ics"><button type="button" class="po-chip" data-pu="portada" aria-label="Cambiar portada" title="Cambiar portada">🎨 <span>Portada</span></button><button type="button" class="po-chip" data-pu="ajustes-app" aria-label="Ajustes" title="Ajustes">⚙️ <span>Ajustes</span></button></span></div>`;
const ahora=cls=>`<button type="button" class="po-ahora ${cls||''}" data-ahora><span class="po-ahora-e" data-d="ahora.e"></span><span class="po-ahora-t"><small data-d="ahora.k"></small><strong data-d="ahora.t"></strong><em data-d="ahora.s"></em></span><span class="po-ahora-go" data-d="ahora.cta"></span></button>`;
const badge=p=>`<span class="po-badge" data-dn="${p}"></span>`;

// ── 1 · Ventanas vivas ──
function v1(){
  const tema=document.documentElement.dataset.theme==='dark'?'dark':'light';
  return `<div class="pu-head"><div><div class="pu-brand">ARAMO</div><div class="pu-date" data-d="fecha"></div></div>${herramientas()}</div>
  <div data-dh="alarma"></div>
  <h1 class="pu-h1"><span data-d="saludo"></span>, ¿qué abrimos?</h1>
  ${ahora('po-ahora-v1')}
  <div class="pu-caras">
    <button type="button" class="pu-cara" data-pu="surtido" style="--c:var(--g)" aria-label="1 · Abrir Surtido">
      <div class="pu-ventana"><div class="pu-barra"><i></i><i></i><i></i><span>1 · Surtido</span></div><div class="pu-vista" id="puMiniS"></div><div class="pu-glow"><span class="pu-abrir">Abrir Surtido</span></div></div>
      <div class="pu-info"><b>🚚 Surtido</b><small>Lo que ARAMO le pide a sus proveedores</small><span class="pu-stat" data-d="s.txt"></span></div>
    </button>
    <button type="button" class="pu-cara" data-pu="canasta" style="--c:var(--o)" aria-label="2 · Abrir Taller de pedidos">
      <div class="pu-ventana"><div class="pu-barra"><i></i><i></i><i></i><span>2 · Taller de pedidos</span></div><div class="pu-vista" id="puMiniC"><iframe title="Vista del Taller" src="canasta.html?mini=1&tema=${tema}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></div><div class="pu-glow"><span class="pu-abrir">Abrir Taller</span></div></div>
      <div class="pu-info"><b>🧺 Taller</b><small>Donde los clientes arman su pedido, de punta a punta</small><span class="pu-stat o" data-d="t.txt"></span></div>
    </button>
    <button type="button" class="pu-cara pu-cara-pos" data-pu="pos" style="--c:#1b5e20" aria-label="3 · Abrir ARAMO POS">
      <div class="pu-ventana"><div class="pu-barra"><i></i><i></i><i></i><span>3 · ARAMO POS</span></div><img class="pu-foto" src="pos-vista.jpg" alt="" loading="lazy"><div class="pu-glow"><span class="pu-abrir">Abrir ARAMO POS</span></div></div>
      <div class="pu-info"><b>🧾 ARAMO POS</b><small>Ventas y caja del mostrador</small><span class="pu-stat" data-d="p.txt"></span></div>
    </button>
  </div>
  <div class="pu-flujo"><h3>Todo el ciclo, conectado</h3><div class="pu-cadena" data-dh="cadena"></div></div>`;
}

// ── 2 · Puestos del mercado ──
function v2(){
  return `<header class="po2-top"><div class="po2-marca"><b>ARAMO</b><span><span data-d="saludo"></span> · <span data-d="fecha"></span></span></div>${herramientas()}</header>
  <div data-dh="alarma"></div>
  ${ahora('po-ahora-v2')}
  <div class="po2-puestos">${PUERTAS.map(p=>`<div class="po2-puesto po2-${p.c}">
    <span class="po2-toldo" aria-hidden="true"></span>
    <button type="button" class="po2-main" data-pu="${p.k}" aria-label="${p.tecla} · Abrir ${esc(p.n)}">
      <span class="po2-num">${p.tecla}</span>
      <span class="po2-arte" aria-hidden="true">${p.arte.map((a,i)=>`<i style="--i:${i}">${a}</i>`).join('')}</span>
      <span class="po2-tx"><b>${p.e} ${esc(p.n)}</b><small>${esc(p.d)}</small><em data-d="${p.dato}.chip"></em></span>
      ${badge(p.dato+'.alerta')}<span class="po2-ir" aria-hidden="true">→</span>
    </button>
  </div>`).join('')}</div>
  <footer class="po-pie"><span>🧾 Caja web hoy <b data-d="caja.total"></b></span><span>🧺 <b data-d="t.activos"></b> en curso</span><span>🚚 <b data-d="s.prods"></b> por pedir</span></footer>`;
}

// ── 3 · Mostrador grande ──
function v3(){
  return `<header class="po3-top"><div><b class="po3-marca">ARAMO</b><span data-d="fecha"></span></div>${herramientas()}</header>
  <div data-dh="alarma"></div>
  <section class="po3-hero" data-ahora-tono data-pu="mostrador">
    <div class="po3-e" data-d="ahora.e"></div>
    <h1 data-d="ahora.t"></h1><p class="po3-s" data-d="ahora.s"></p>
    <button type="button" class="po3-cta" data-ahora><span data-d="ahora.cta"></span> →</button>
  </section>
  <p class="po3-o">O abrí</p>
  <div class="po3-puertas">${PUERTAS.map(p=>`<button type="button" class="po3-pu c-${p.c}" data-pu="${p.k}" aria-label="${p.tecla} · Abrir ${esc(p.n)}"><span class="po3-n">${p.tecla}</span><b>${p.e}</b><strong>${esc(p.n)}</strong><small data-d="${p.dato}.chip"></small>${badge(p.dato+'.alerta')}</button>`).join('')}</div>
  <div class="po3-dia"><div><span>Caja web</span><b data-d="caja.total"></b></div><div><span>En curso</span><b data-d="t.activos"></b></div><div><span>Por pedir</span><b data-d="s.prods"></b></div></div>`;
}

// ── 4 · Pizarra de la verdu ──
function v4(){
  return `<div class="po4-marco"><div class="po4-pizarra">
    <header class="po4-top"><div><p class="po4-k">ARAMO · frutas y verduras</p><h1>Hoy en ARAMO</h1><p class="po4-f"><span data-d="saludo"></span> · <span data-d="fecha"></span></p></div>${herramientas()}</header>
    <div data-dh="alarma"></div>
    <button type="button" class="po4-nota" data-ahora><span class="po4-estrella">★</span><span><small data-d="ahora.k"></small><strong data-d="ahora.t"></strong><em data-d="ahora.s"></em></span></button>
    <ol class="po4-lista">${PUERTAS.map(p=>`<li><button type="button" class="po4-linea" data-pu="${p.k}" aria-label="${p.tecla} · Abrir ${esc(p.n)}"><span class="po4-n">${p.tecla}</span><span class="po4-e">${p.e}</span><span class="po4-t"><b>${esc(p.n)}</b><small>${esc(p.d)}</small></span><span class="po4-puntos" aria-hidden="true"></span><span class="po4-v" data-d="${p.dato}.chip"></span>${badge(p.dato+'.alerta')}</button></li>`).join('')}</ol>
    <footer class="po4-pie"><span>Caja web hoy: <b data-d="caja.total"></b></span><span>Pedidos: <b data-d="t.activos"></b></span><span>Por pedir: <b data-d="s.prods"></b></span></footer>
  </div></div>`;
}

// ── 5 · Consola de taller ──
function v5(){
  return `<header class="po5-top"><div><h1>ARAMO <span>Consola</span></h1><p><span data-d="saludo"></span> · <span data-d="fecha"></span> · <span data-d="hora"></span></p></div>${herramientas()}</header>
  <div data-dh="alarma"></div>
  <form class="po5-cmd" id="poCmd" autocomplete="off"><span class="po5-prompt">›</span><input id="poCmdQ" type="search" enterkeyhint="go" placeholder="¿Qué abrimos? tomate · A-7KQ3 · caja · precios…" aria-label="Escribí qué querés abrir"><kbd>Enter</kbd></form>
  <div class="po5-sug" id="poCmdSug"></div>
  <button type="button" class="po5-ahora" data-ahora><span class="po5-verd" data-d="ahora.k"></span><span><strong data-d="ahora.t"></strong><em data-d="ahora.s"></em></span><span class="po5-go" data-d="ahora.cta"></span></button>
  <div class="po5-tiles">${PUERTAS.map(p=>`<button type="button" class="po5-tile c-${p.c}" data-pu="${p.k}" aria-label="${p.tecla} · Abrir ${esc(p.n)}"><span class="po5-kick">0${p.tecla} · ${esc(p.n.toUpperCase())}</span><b>${p.e}</b><strong>${esc(p.n)}</strong><small>${esc(p.d)}</small><span class="po5-dato" data-d="${p.dato}.chip"></span>${badge(p.dato+'.alerta')}<kbd>${p.tecla}</kbd></button>`).join('')}</div>
  <section class="po5-bit"><p class="po5-kick">Bitácora de hoy</p><div data-dh="bit"></div></section>
  <p class="po5-teclas"><kbd>1</kbd> Surtido <kbd>2</kbd> Taller <kbd>3</kbd> POS <kbd>M</kbd> Mostrador <kbd>/</kbd> buscar</p>`;
}
const V={1:v1,2:v2,3:v3,4:v4,5:v5};

function llenar(root,D){
  root.querySelectorAll('[data-d]').forEach(el=>{const v=get(D,el.dataset.d);el.textContent=v==null?'':String(v);});
  root.querySelectorAll('[data-dh]').forEach(el=>{const v=get(D,el.dataset.dh)||'';if(el.innerHTML!==v)el.innerHTML=v;});
  root.querySelectorAll('[data-dn]').forEach(el=>{const v=get(D,el.dataset.dn);el.hidden=!v;el.textContent=v?String(v):'';});
  root.querySelectorAll('[data-nube]').forEach(el=>el.classList.toggle('on',!!D.nubeOn));
  root.querySelectorAll('[data-ahora]').forEach(el=>{el.dataset.pu=D.ahora.act;if(D.ahora.id)el.dataset.id=D.ahora.id;else delete el.dataset.id;el.dataset.tono=D.ahora.tono;el.setAttribute('aria-label',D.ahora.k+': '+D.ahora.t);});
  root.querySelectorAll('[data-ahora-tono]').forEach(el=>{el.dataset.tono=D.ahora.tono;});
}
function pintar(root,D){
  const v=actual();
  if(+root.dataset.v!==v){
    root.dataset.v=v;root.className='pu-in po po'+v;
    root.innerHTML=V[v](D);
    document.getElementById('puerta')?.setAttribute('data-portada',v);
  }
  llenar(root,D);
  return v;
}

// ── Selector de portada (mini dibujos de cada una) ──
const mini={
  1:'<i class="m1a"></i><i class="m1a"></i><i class="m1a"></i><i class="m1b"></i>',
  2:'<i class="m2a"></i><i class="m2a o"></i><i class="m2a p"></i>',
  3:'<i class="m3a"></i><i class="m3b"></i><i class="m3b"></i><i class="m3b"></i>',
  4:'<i class="m4a"></i><i class="m4b"></i><i class="m4b"></i><i class="m4b"></i>',
  5:'<i class="m5a"></i><i class="m5b"></i><i class="m5b"></i><i class="m5b"></i>',
};
function selectorHtml(){
  const v=actual();
  return `<p class="mo-kick">Pantalla principal · elegí cómo la querés ver</p><div class="mo-h">🎨 Portada</div><div class="mo-s">Las 5 tienen el mismo orden: 1 Surtido · 2 Taller · 3 ARAMO POS, y la franja "Ahora". Cambia el estilo, nunca el lugar de las cosas.</div>
    <div class="po-sel">${LISTA.map(p=>`<button type="button" class="po-op${v===p.n?' on':''}" data-pu="portada-usar" data-v="${p.n}"><span class="po-mini po-mini${p.n}" aria-hidden="true">${mini[p.n]}</span><span class="po-op-t"><b>${p.n} · ${esc(p.t)}${p.rec?' <em>RECOMENDADA</em>':''}</b><small>${esc(p.d)}</small></span><span class="po-op-ok">${v===p.n?'✓':''}</span></button>`).join('')}</div>
    <div class="mo-s" style="margin-top:10px">Se guarda en este equipo. También podés abrir una directo: <code>APP.html?portada=3</code></div>`;
}

window.AramoPortadas={pintar,actual,elegir,selectorHtml,LISTA,PUERTAS};
})();
