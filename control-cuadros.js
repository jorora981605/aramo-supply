// control-cuadros.js — la cara nueva del Control (control.html), al estilo de TecniRuta. 2026-11-25 · 2026-11-26.
//   Inicio: la ganancia del día al centro (la de la semana es un botón aparte) y los CUADROS
//   (Caja · Bolsa · Ingresos · Compras · Gastos fijos · Administración) → sus tarjetas → una ventanita para anotar.
// No tiene cuentas propias: usa las de la app de siempre (clComputeWeek y compañía) y sus mismos datos,
// así los números son los mismos de la hoja. La hoja completa sigue en Más → Hoja completa.
// La plata de los tres (la bolsa, quién pagó, el reparto del lunes) la calcula control-socios.js (window.Plata).
// Las ventas llegan solas del POS por control-puente.js (window.AramoPuente).
// Lo que guarda esta cara: data.movs (cada monto con su mensaje y su foto), data.autoFuera (lo que llegó solo y se
// decidió no contar), data.cajaEntregas (el sobre de cada día), data.cajaConteos (cada conteo, por denominación),
// data.cajaCambios (cada corrección de la caja, para revisarla), data.cajaRevisado, data.faltantesPagados y
// data.fiadoCobrado. Las fotos viven en este aparato (IndexedDB), no en el respaldo.
(function(){
'use strict';
const raiz=document.getElementById('cx');
if(!raiz||typeof clComputeWeek!=='function')return;
const PL=window.Plata||null,PU=window.AramoPuente||null;

/* ---------- utilidades ---------- */
const P=window.ARAMO_ICONOS||{};
P.camara=P.camara||'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>';
P.reparto=P.reparto||'<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>';
P.puntos=P.puntos||'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>';
P.bolsa=P.bolsa||'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>';
P.pasar=P.pasar||'<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>';
P.sobre=P.sobre||'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>';
P.persona=P.persona||'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
const ic=(n,t)=>typeof icono==='function'?icono(n,{t:t||20}):'';
const hoy=()=>clDateISO(new Date());
const fecha=d=>new Date(d+'T12:00:00');
const col=n=>{n=Math.round(num(n));return(n<0?'−':'')+fmt(Math.abs(n));};
const diaLargo=d=>fecha(d).toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'});
const diaBonito=d=>{const x=fecha(d);return x.toLocaleDateString('es-CR',{weekday:'long'})+' '+x.getDate()+' de '+x.toLocaleDateString('es-CR',{month:'long'});};
const diaCorto=d=>fecha(d).toLocaleDateString('es-CR',{weekday:'short',day:'numeric'}).replace('.','');
const mes=d=>fecha(d).toLocaleDateString('es-CR',{month:'short'}).replace('.','');
const hora=t=>{const d=new Date(t);return isNaN(d)||!t?'':d.toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});};
const cuando=d=>d===hoy()?'hoy':diaCorto(d);
const aviso=(t,o)=>window.AramoUI?AramoUI.aviso(t,o):null;
const sumar=(L,f)=>L.reduce((t,x)=>t+num(f(x)),0);
const mil=n=>{n=Math.round(num(n));const a=Math.abs(n),s=n<0?'−':'';return a>=1000?s+Math.round(a/1000)+' mil':s+a.toLocaleString('es-CR');};
// quién es quién en la plata (los Jefes son dos: "los Jefes le deben")
const N=id=>PL?(PL.NOMBRE[id]||id):id;
const Suj=id=>id==='jefes'?'Los Jefes':N(id);
const aQ=id=>id==='jefes'?'a los Jefes':id==='bolsa'?'a la bolsa':'a '+N(id);
const deb=id=>id==='jefes'?'deben':'debe';
// La semana en curso se cuenta HASTA HOY: los gastos fijos y salarios de los días que faltan todavía no pasaron.
// (La hoja completa suma siempre los 7 días; el domingo los dos números son iguales.)
const vividos=()=>{const h=hoy();return W.perDay.filter(d=>d.date<=h);};
const enCurso=()=>{const h=hoy();return W.inicio<=h&&h<clDateAdd(W.inicio,6);};
const plataActiva=f=>!!(PL&&PL.activoEn(f));

const ING=[
  {k:'cash',t:'Efectivo',ic:'efectivo'},{k:'sinpe',t:'SINPE',ic:'sinpe'},{k:'card',t:'Tarjeta',ic:'tarjeta'},
  {k:'fiado',t:'Fiado',ic:'clientes'},{k:'bodega',t:'Bodega',ic:'tienda',viejo:true},{k:'desechos',t:'Desechos',ic:'borrar',resta:true,viejo:true}];
const COM=[
  {k:'comprasEfectivo',t:'Efectivo',ic:'efectivo'},{k:'comprasSinpe',t:'SINPE',ic:'sinpe'},
  {k:'comprasTarjeta',t:'Tarjeta',ic:'tarjeta'},{k:'comprasUber',t:'Uber',ic:'camion'}];
const GRUPO={ing:{campos:ING,nombre:'ingreso',titulo:'Ingresos'},com:{campos:COM,nombre:'compra',titulo:'Compras'}};
const campoDe=k=>ING.concat(COM).find(c=>c.k===k)||{k,t:k,ic:'nota'};
const VISTAS=['inicio','caja','bolsa','ingresos','compras','fijos','resultado','admin','ganancia','mas'];
const cadaT=p=>(window.Colones&&window.Colones.CADA&&window.Colones.CADA[p])||(p==='mes'?'al mes':'por semana');
// 2026-11-28 · Control total: las pantallas nuevas viven en sus propios archivos (control-gastos.js, control-compras.js,
// control-productos.js, control-cierre.js). Cada uno se apunta en window.CX_MODULOS y aquí se monta (ver "módulos" abajo).
const CUADROS=[];                        // cuadros del Inicio que pone un módulo: {id,orden,vista,tono,icono,nombre,dato()}
const RANURAS={};                        // trozos que un módulo le agrega a una pantalla que ya existe: {'compras:abajo':[fn]}
const PEND=[];                           // "lo que falta" según cada módulo: fn(D) → [{a,q,d,b,…}]
const GUARDAS=[];                        // antes de una acción: fn(nombre,datos) → false para no hacerla
const TODOS=new Set(['inicio','caja']);  // las pantallas que también ve quien no es socio
const REINICIOS=[];                      // al dejar todo en cero, cada módulo borra sus movimientos (sus ajustes se quedan)
const ranura=n=>(RANURAS[n]||[]).map(fn=>{try{return fn()||'';}catch(e){console.error(e);return'';}}).join('');

/* ---------- estado ---------- */
const E={dia:hoy(),vista:'inicio',abiertos:new Set(),hoja:false};
try{const g=JSON.parse(sessionStorage.getItem('aramo_cx')||'{}');if(g.el===hoy()&&g.dia)E.dia=g.dia;}catch(e){}
const recordar=()=>{try{sessionStorage.setItem('aramo_cx',JSON.stringify({dia:E.dia,el:hoy()}));}catch(e){}};
let W=null,D=null,_falt=null;   // la semana y el día calculados (se rehacen en cada pintada)
const diaActual=()=>D;
function calcular(){
  const ini=clMonday(E.dia);
  W=clComputeWeek(ini);W.inicio=ini;_falt=null;_fia=null;
  D=W.perDay.find(x=>x.date===E.dia)||W.perDay[0];
  // la app de siempre trabaja con la misma semana (Guardar cierre, CSV y la hoja completa)
  const inp=document.getElementById('clWeekStart');
  if(inp&&inp.value!==ini){inp.value=ini;try{clState={start:ini,end:clDateAdd(ini,6)};}catch(e){}}
}

/* ---------- quién está usando el Control ---------- */
// Los socios (Jefes, Roger, Joseph) ven todo. El resto del personal solo ve su caja. La persona se escoge en este
// aparato; si los socios ponen una clave (Más), hace falta para entrar como socio.
const LSQ='aramo_control_quien_'+TIENDA;
function personas(){
  const st=(data.staff||[]).filter(p=>p&&p.active!==false),out=[];
  (PL?PL.SOCIOS:[]).forEach(s=>{const p=st.find(x=>String(x.name||'').trim().toLowerCase()===s.n.toLowerCase());out.push({id:'s:'+s.id,n:s.n,admin:true,personId:p?p.id:null});});
  st.forEach(p=>{if(!out.some(o=>o.personId===p.id))out.push({id:'p:'+p.id,n:p.name,admin:false,personId:p.id});});
  return out;
}
function quien(){
  let g=null;try{g=JSON.parse(localStorage.getItem(LSQ));}catch(e){}
  return(g&&personas().find(x=>x.id===g.id))||{id:'',n:'',admin:true,personId:null};
}
const esSocio=()=>quien().admin;
async function huella(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('aramo-control|'+t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function cambiarQuien(){
  const L=personas(),q=quien();
  const v=await AramoUI.elegir({titulo:'¿Quién está usando el Control?',texto:'Cada persona ve lo suyo. Los socios ven todo.',opciones:L.map(p=>({v:p.id,t:p.n+(p.id===q.id?' (ahora)':''),sub:p.admin?'Socio: ve todo':'Solo ve su caja'}))});
  if(!v||v===q.id)return;
  const p=L.find(x=>x.id===v);
  if(p.admin&&data.settings.claveSocios&&!(q.id&&q.admin)){
    const c=await AramoUI.pedir({titulo:'Clave de los socios',texto:`Para entrar como ${p.n}.`,etiqueta:'Clave',tipo:'tel',si:'Entrar'});
    if(c==null)return;
    if(await huella(c)!==data.settings.claveSocios)return aviso('Esa no es la clave.',{tipo:'error'});
  }
  try{localStorage.setItem(LSQ,JSON.stringify({id:p.id}));}catch(e){}
  aviso(`Ahora está ${p.n}.`);E.vista='inicio';if(location.hash)history.replaceState(null,'',location.pathname+location.search);pintar();window.scrollTo(0,0);
}
async function cambiarClave(){
  const c=await AramoUI.pedir({titulo:'Clave de los socios',texto:'Con esta clave se entra como socio (Jefes, Roger o Joseph). Dejala vacía para quitarla.',etiqueta:'Clave nueva (4 números o más)',tipo:'tel',si:'Guardar',
    validar:x=>x===''||/^\d{4,}$/.test(x)?'':'Poné 4 números o más.'});
  if(c==null)return;
  if(c==='')delete data.settings.claveSocios;else data.settings.claveSocios=await huella(c);
  save();aviso(c===''?'Clave quitada.':'Clave guardada.');
}
// las partes de la caja que ve la persona: un socio, todas; los demás, solo sus turnos
const esMio=s=>{const q=quien();return q.admin||(!!q.personId&&(s.personId===q.personId||(s.personIds||[]).includes(q.personId)));};

/* ---------- fotos: en este aparato ---------- */
const Fotos=(()=>{
  let dbp=null;const urls=new Map();
  const abrir=()=>dbp||(dbp=new Promise((ok,no)=>{const r=indexedDB.open('aramo_control_fotos_'+TIENDA,1);
    r.onupgradeneeded=()=>r.result.createObjectStore('fotos');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);}));
  const tx=(modo,fn)=>abrir().then(db=>new Promise((ok,no)=>{const t=db.transaction('fotos',modo),q=fn(t.objectStore('fotos'));
    t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error);}));
  return{
    guardar(id,blob){urls.delete(id);return tx('readwrite',s=>s.put(blob,id));},
    borrar(id){urls.delete(id);return tx('readwrite',s=>s.delete(id)).catch(()=>{});},
    async url(id){if(urls.has(id))return urls.get(id);let b=null;try{b=await tx('readonly',s=>s.get(id));}catch(e){}
      if(!b)return'';const u=URL.createObjectURL(b);urls.set(id,u);return u;}
  };
})();
// la foto se guarda achicada (1400 px, JPG): unos 200 KB en vez de 4 MB
function achicar(archivo){
  return new Promise((ok,no)=>{
    const u=URL.createObjectURL(archivo),im=new Image();
    im.onload=()=>{const k=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
      c.toBlob(b=>b?ok(b):no(new Error('sin foto')),'image/jpeg',.72);};
    im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('No se pudo leer la foto'));};
    im.src=u;
  });
}
function ponerFotos(dentro){
  dentro.querySelectorAll('img[data-foto]').forEach(im=>{Fotos.url(im.dataset.foto).then(u=>{if(u)im.src=u;else im.closest('[data-cx="foto"]')?.setAttribute('hidden','');});});
}
function verFoto(id){
  Fotos.url(id).then(u=>{
    if(!u)return aviso('Esa foto no está en este aparato.',{tipo:'info'});
    const v=document.createElement('div');v.className='cx-visor';v.setAttribute('role','dialog');v.setAttribute('aria-label','Foto');
    v.innerHTML=`<img src="${u}" alt="Foto del comprobante"><button type="button" class="cx-visor-x" aria-label="Cerrar la foto">${ic('cerrar',24)}</button>`;
    const fuera=()=>{v.remove();document.removeEventListener('keydown',tecla,true);};
    const tecla=e=>{if(e.key==='Escape'){e.stopPropagation();fuera();}};
    v.addEventListener('click',fuera);document.addEventListener('keydown',tecla,true);
    document.body.appendChild(v);v.querySelector('button').focus();
  });
}
const miniFoto=id=>`<button type="button" class="cx-mini" data-cx="foto" data-id="${esc(id)}" aria-label="Ver la foto"><img data-foto="${esc(id)}" alt=""></button>`;

/* ---------- renglones: cada colón por separado ---------- */
// tipo: 'mov' (anotado aquí) · 'auto' (llegó solo de ARAMO o del POS) · 'fiado' · 'fiadoPos' · 'hoja' (escrito en la hoja completa)
function renglones(f,grupo){
  const campos=GRUPO[grupo].campos,es=new Set(campos.map(c=>c.k)),raw=clDailyRaw(f),fuera=data.autoFuera||{},out=[];
  campos.forEach(c=>{if(c.k==='fiado')return;const v=num(raw[c.k]);if(v)out.push({tipo:'hoja',id:'h:'+c.k,campo:c.k,monto:v,titulo:'Anotado en la hoja',at:0});});
  clAutoLineas(f).forEach(l=>{if(es.has(l.campo))out.push({tipo:'auto',id:l.id,campo:l.campo,monto:num(l.monto),titulo:l.titulo,origen:l.origen,firma:l.firma,items:l.items||[],at:l.hora,fuera:!!fuera[l.id],tapado:num(raw[l.campo])!==0,pos:/^p:/.test(l.id),fijo:l.pago||(l.campo==='comprasCredito'?'credito':undefined),foto:!!l.foto,fotoId:l.fotoId||'',abre:l.abre||''});});
  (data.movs||[]).forEach(m=>{if(m&&m.date===f&&es.has(m.campo))out.push({tipo:'mov',id:m.id,campo:m.campo,monto:num(m.monto),nota:m.nota||'',foto:!!m.foto,at:m.at,pago:m.pago});});
  if(grupo==='ing'){
    clReceivablesFor(f).forEach(r=>out.push({tipo:'fiado',id:r.id,campo:'fiado',monto:num(r.amount),nota:r.concept||'',foto:!!r.foto,cobrado:!!r.collected,vence:r.dueDate||'',at:r.at||0}));
    clAutoFiados(f).forEach(r=>out.push({tipo:'fiadoPos',id:r.id,campo:'fiado',monto:num(r.amount),nota:r.concept||'Cliente',cobrado:fiadoPagado(r.id),abonado:(fiadosPos()[r.id]||{}).abonado||0,solo:!(data.fiadoCobrado||{})[r.id]&&fiadoPagado(r.id),at:0}));
  }
  return out;
}
const valorDe=(d,k)=>k==='fiado'?d.cuentasPorCobrarTotal:num(d.manual[k]);
// 2026-11-28 · Los fiados del POS: lo que cada cliente ya pagó (según los pagos que anotó el POS) se le rebaja solo a
// lo más viejo que debe. Devuelve {idFiado:{debe,abonado}}. Lo marcado a mano ("ya pagó") sigue valiendo.
let _fia=null;
function fiadosPos(){
  if(_fia)return _fia;
  const o={},fuera=data.autoFuera||{},clave=n=>String(n||'').trim().toLowerCase().replace(/\s+/g,' '),pagado={};
  if(PU&&PU.fiadoPagosTodos)PU.fiadoPagosTodos(TIENDA).forEach(x=>{const k=clave(x.cliente);pagado[k]=(pagado[k]||0)+num(x.monto);});
  if(PU&&PU.fiadosTodos)PU.fiadosTodos(TIENDA).forEach(r=>{       // vienen del más viejo al más nuevo
    if(fuera[r.id])return;
    const k=clave(r.concept),total=num(r.amount),usa=Math.min(total,pagado[k]||0);
    if(usa>0)pagado[k]-=usa;
    o[r.id]={debe:total-usa,abonado:usa};
  });
  return(_fia=o);
}
const fiadoPagado=id=>!!(data.fiadoCobrado||{})[id]||((fiadosPos()[id]||{debe:1}).debe<=0);

function quitarRenglon(f,r){
  if(r.tipo==='mov')data.movs=(data.movs||[]).filter(m=>m.id!==r.id);
  else if(r.tipo==='fiado'){data.closureReceivables=data.closureReceivables||{};data.closureReceivables[f]=clReceivablesFor(f).filter(x=>x.id!==r.id);}
  else if(r.tipo==='hoja'){data.closureDaily=data.closureDaily||{};data.closureDaily[f]={...clDailyRaw(f),[r.campo]:0};}
}
function ponerRenglon(f,r){
  if(r.campo==='fiado'){
    data.closureReceivables=data.closureReceivables||{};
    data.closureReceivables[f]=[...clReceivablesFor(f),{id:r.id,concept:r.nota||'Cliente',amount:num(r.monto),dueDate:r.vence||'',collected:!!r.cobrado,foto:!!r.foto,at:r.at||new Date().toISOString()}];
  }else{
    const m={id:r.id,date:f,campo:r.campo,monto:num(r.monto),nota:r.nota||'',foto:!!r.foto,at:r.at||new Date().toISOString()};
    if(r.pago)m.pago=r.pago;
    data.movs=[...(data.movs||[]),m];
  }
}
// a quién se le ha comprado (para no escribirlo cada vez)
function proveedores(){
  const s=new Set(),h=hoy();
  for(let i=0;i<21;i++)clAutoLineas(clDateAdd(h,-i)).forEach(l=>{if(/^c:/.test(l.id)&&l.titulo)s.add(l.titulo);});
  (data.movs||[]).slice(-200).forEach(m=>{if(m&&/^compras/.test(m.campo)&&m.nota){const t=m.nota.split(/[·\-–,:]/)[0].trim();if(t&&t.length<=24)s.add(t);}});
  (data.provEntrega||[]).forEach(p=>{if(p&&p.n)s.add(p.n);});
  return[...s].slice(0,30);
}

/* ---------- ventanitas ---------- */
function atarMonto(inp){
  const f=()=>{const d=inp.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'');inp.value=d?Number(d).toLocaleString('es-CR'):'';};
  inp.addEventListener('input',f);f();
}
const leerMonto=inp=>Number(String(inp.value).replace(/\D/g,''))||0;
const campoMonto=(id,et,valor,ayuda)=>`<label class="cx-campo"><span class="cx-et">${esc(et)}</span>
  <span class="cx-monto"><i aria-hidden="true">₡</i><input id="${id}" type="text" inputmode="numeric" autocomplete="off" placeholder="0" value="${valor===''||valor==null?'':Math.round(num(valor))}" data-ui-foco></span>
  ${ayuda?`<span class="cx-ayuda">${ayuda}</span>`:''}<span class="cx-error" role="alert"></span></label>`;
function boton(txt,clase){const b=document.createElement('button');b.type='button';b.className='ui-btn '+clase;b.textContent=txt;return b;}
function fallo(campo,txt){const e=campo.querySelector('.cx-error');if(e)e.textContent=txt;campo.querySelector('input,textarea')?.focus();}
// chips para escoger una sola opción (quién, cómo…). El que está escogido lleva aria-pressed="true".
const chips=(grupo,et,ops,sel,ayuda)=>`<div class="cx-campo" data-campo-de="${grupo}"><span class="cx-et">${esc(et)}</span>
  <div class="cx-chips" role="group" aria-label="${esc(et)}" data-grupo="${grupo}">${ops.map(o=>`<button type="button" class="cx-chip" data-op="${esc(o.v)}" aria-pressed="${o.v===sel}">${o.ic?ic(o.ic,18):''}<span>${esc(o.t)}</span></button>`).join('')}</div>
  ${ayuda?`<span class="cx-ayuda">${ayuda}</span>`:''}<span class="cx-error" role="alert"></span></div>`;
const escogido=(cuerpo,grupo)=>cuerpo.querySelector(`[data-grupo="${grupo}"] [aria-pressed="true"]`)?.dataset.op||null;
document.addEventListener('click',e=>{
  const b=e.target.closest('.cx-hoja [data-grupo] [data-op]');if(!b)return;
  const g=b.parentNode;g.querySelectorAll('[data-op]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  g.dispatchEvent(new CustomEvent('cambio',{detail:b.dataset.op,bubbles:true}));
});
// el campo de la foto de una ventanita: guarda la foto nueva, o borra la que se quitó
const fotoHTML=(tiene,texto)=>`<div class="cx-foto-campo">
  <label class="cx-foto-btn">${ic('camara',22)}<span data-ft data-t="${esc(texto||'Agregar una foto')}">${tiene?'Cambiar la foto':esc(texto||'Agregar una foto')}</span><input data-fi type="file" accept="image/*" hidden></label>
  <div class="cx-foto-prev" data-fp hidden><img alt="Foto elegida"><button type="button" data-fx class="cx-foto-x" aria-label="Quitar la foto">${ic('cerrar',18)}</button></div></div>`;
function atarFoto(cuerpo,id,tiene){
  const st={nueva:null,fuera:false},prev=cuerpo.querySelector('[data-fp]'),ft=cuerpo.querySelector('[data-ft]');
  const ver=u=>{prev.hidden=!u;if(u)prev.querySelector('img').src=u;ft.textContent=u?'Cambiar la foto':ft.dataset.t;};
  if(tiene&&id)Fotos.url(id).then(u=>{if(u&&!st.nueva&&!st.fuera)ver(u);});
  cuerpo.querySelector('[data-fi]').addEventListener('change',async e=>{
    const a=e.target.files&&e.target.files[0];if(!a)return;
    try{st.nueva=await achicar(a);st.fuera=false;ver(URL.createObjectURL(st.nueva));}catch(err){aviso('No se pudo usar esa foto. Probá con otra.',{tipo:'error'});}
    e.target.value='';
  });
  cuerpo.querySelector('[data-fx]').addEventListener('click',()=>{st.nueva=null;st.fuera=true;ver('');});
  // devuelve si el renglón queda con foto
  st.guardar=async idFinal=>{
    if(st.nueva){try{await Fotos.guardar(idFinal,st.nueva);return true;}catch(e){aviso('Quedó anotado, pero la foto no se pudo guardar en este aparato.',{tipo:'error',ms:8000});return false;}}
    if(st.fuera&&tiene){Fotos.borrar(idFinal);return false;}
    return !!tiene;
  };
  return st;
}

// Un monto y nada más (un gasto fijo, un ajuste…)
function pedirMonto(o){
  return new Promise(res=>{
    let r=null;
    const h=AramoUI.hoja({titulo:o.titulo,sub:o.sub,clase:'ui-hoja--dialogo cx-hoja',alCerrar:()=>res(r)});
    h.cuerpo.innerHTML=(o.texto?`<p class="cx-hoja-texto">${o.texto}</p>`:'')+campoMonto('cxM',o.etiqueta||'Monto',o.valor,o.ayuda)+(o.extra||'');
    const inp=h.cuerpo.querySelector('#cxM');atarMonto(inp);
    const listo=()=>{
      if(inp.value.trim()===''&&!o.vacio)return fallo(inp.closest('.cx-campo'),'Escribí el monto.');
      r={monto:inp.value.trim()===''?null:leerMonto(inp),cuerpo:h.cuerpo};h.cerrar();
    };
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();listo();}});
    const no=boton('Cancelar','ui-btn--secundario ui-btn--l'),si=boton(o.si||'Guardar','ui-btn--primario ui-btn--l ui-crece');
    no.addEventListener('click',()=>h.cerrar());si.addEventListener('click',listo);
    h.pie.appendChild(no);h.pie.appendChild(si);
  });
}

// Una ventanita con Cancelar y Guardar (la usan los módulos).
//   o.html      el cuerpo (los campos de monto hechos con campoMonto quedan con formato solos)
//   o.listo     (cuerpo,h) al abrir, para atar lo que haga falta
//   o.guardar   (cuerpo,h) → false si falta algo (la ventanita se queda abierta); cualquier otra cosa la cierra
//   o.borrar    () si se puede borrar (sale el botón rojo "Borrar"); o.si / o.no: los textos de los botones
function ventana(o){
  const h=AramoUI.hoja({titulo:o.titulo,sub:o.sub,clase:'ui-hoja--dialogo cx-hoja'+(o.clase?' '+o.clase:''),alCerrar:o.alCerrar});
  h.cuerpo.innerHTML=(o.html||'')+(o.borrar?`<button type="button" class="cx-borrar" data-v-borrar>${ic('borrar',18)} ${esc(o.borrarTexto||'Borrar')}</button>`:'');
  h.cuerpo.querySelectorAll('.cx-monto input').forEach(atarMonto);
  let ocupado=false;
  const guardar=async()=>{
    if(ocupado||!o.guardar)return;ocupado=true;
    try{const r=await o.guardar(h.cuerpo,h);if(r!==false)h.cerrar();}
    catch(e){console.error(e);aviso('No se pudo guardar. Probá otra vez.',{tipo:'error'});}
    finally{ocupado=false;}
  };
  const no=boton(o.guardar?(o.no||'Cancelar'):(o.no||'Cerrar'),'ui-btn--secundario ui-btn--l'+(o.guardar?'':' ui-crece'));
  no.addEventListener('click',()=>h.cerrar());h.pie.appendChild(no);
  if(o.guardar){const si=boton(o.si||'Guardar','ui-btn--primario ui-btn--l ui-crece');si.addEventListener('click',guardar);h.pie.appendChild(si);}
  const b=h.cuerpo.querySelector('[data-v-borrar]');if(b)b.addEventListener('click',()=>{h.cerrar();o.borrar();});
  h.guardar=guardar;
  if(o.listo)o.listo(h.cuerpo,h);
  return h;
}

// Contar la plata por denominación: se pone cuántos hay de cada billete y moneda, y la suma sale sola
const DEN=[{v:20000,b:1},{v:10000,b:1},{v:5000,b:1},{v:2000,b:1},{v:1000,b:1},{v:500},{v:100},{v:50},{v:25},{v:10},{v:5}];
function contar(o){
  return new Promise(res=>{
    let r=null;const prev=o.den||{};
    const h=AramoUI.hoja({titulo:o.titulo,sub:o.sub,clase:'ui-hoja--dialogo cx-hoja cx-contar',alCerrar:()=>res(r),foco:'titulo'});
    const fila=d=>`<div class="cx-den${prev[d.v]?' con':''}" data-den="${d.v}"><span class="cx-den-v ${d.b?'billete':'moneda'}">${fmt(d.v)}</span>
      <button type="button" class="cx-den-b" data-paso="-1" aria-label="Uno menos de ${fmt(d.v)}">−</button>
      <input type="text" inputmode="numeric" autocomplete="off" aria-label="Cuántos de ${fmt(d.v)}" value="${prev[d.v]||''}" placeholder="0">
      <button type="button" class="cx-den-b" data-paso="1" aria-label="Uno más de ${fmt(d.v)}">+</button>
      <b class="cx-den-s">₡0</b></div>`;
    h.cuerpo.innerHTML=(o.texto?`<p class="cx-hoja-texto">${o.texto}</p>`:'')+
      `<p class="cx-den-t">Billetes</p>${DEN.filter(d=>d.b).map(fila).join('')}<p class="cx-den-t">Monedas</p>${DEN.filter(d=>!d.b).map(fila).join('')}
      <div class="cx-den-total"><span>Total contado</span><b id="cxDT">₡0</b><small id="cxDE"></small></div>
      ${o.quitar?`<button type="button" class="cx-borrar" data-quitar>${ic('borrar',18)} ${esc(o.quitar)}</button>`:''}`;
    const cuantos=f=>Number(f.querySelector('input').value.replace(/\D/g,''))||0;
    const total=()=>{
      let t=0;h.cuerpo.querySelectorAll('.cx-den').forEach(f=>{const n=cuantos(f),s=n*Number(f.dataset.den);f.querySelector('.cx-den-s').textContent=fmt(s);f.classList.toggle('con',n>0);t+=s;});
      h.cuerpo.querySelector('#cxDT').textContent=fmt(t);
      const e=h.cuerpo.querySelector('#cxDE');
      if(o.debe!=null){const d=t-Math.round(o.debe);e.textContent=d===0?'Cuadra exacto':d<0?`Faltan ${fmt(-d)} para ${fmt(o.debe)}`:`Hay ${fmt(d)} de más`;e.className=d===0?'bien':d<0?'mal':'ojo';}
      return t;
    };
    h.cuerpo.addEventListener('input',e=>{if(e.target.matches('.cx-den input')){e.target.value=e.target.value.replace(/\D/g,'').replace(/^0+/,'').slice(0,4);total();}});
    h.cuerpo.addEventListener('click',e=>{
      const b=e.target.closest('[data-paso]');
      if(b){const i=b.parentNode.querySelector('input');i.value=Math.max(0,(Number(i.value)||0)+Number(b.dataset.paso))||'';total();return;}
      if(e.target.closest('[data-quitar]')){r={monto:null,den:{}};h.cerrar();}
    });
    total();
    const listo=()=>{const den={};h.cuerpo.querySelectorAll('.cx-den').forEach(f=>{const n=cuantos(f);if(n)den[f.dataset.den]=n;});r={monto:total(),den};h.cerrar();};
    const no=boton('Cancelar','ui-btn--secundario ui-btn--l'),si=boton(o.si||'Guardar','ui-btn--primario ui-btn--l ui-crece');
    no.addEventListener('click',()=>h.cerrar());si.addEventListener('click',listo);
    h.pie.appendChild(no);h.pie.appendChild(si);
  });
}

// Anotar (o corregir) un ingreso, una compra o un retiro: tipo · monto · (quién pagó) · mensaje · foto
function anotar(o){
  const g=o.grupo?GRUPO[o.grupo]:null,r=o.renglon||null,f=o.fecha||E.dia;
  let campo=r?r.campo:(o.campo||(g?g.campos[0].k:'retiro')),fotoNueva=null,fotoFuera=false;
  const esRetiro=o.grupo==null,esCom=o.grupo==='com';
  // lo que se puede anotar a mano en Ingresos: Bodega y Desechos ya no (vienen del POS); solo se corrigen si existían
  const tipos=g?g.campos.filter(c=>!c.viejo||c.k===campo):[];
  // desde el arranque, cada compra dice quién la pagó (la bolsa o alguien de su bolsillo)
  const conPago=esCom&&plataActiva(f);
  let pago=conPago?(r?PL.pagoDe(f,r):(o.pago||PL.pagoDefecto(campo))):null,pagoTocado=!!(r||o.pago);
  const h=AramoUI.hoja({titulo:o.titulo||(r?'Corregir':(esRetiro?'Anotar un retiro':'Anotar '+(o.grupo==='ing'?'un ingreso':'una compra'))),sub:diaLargo(f),clase:'ui-hoja--dialogo cx-hoja'});
  const etNota=()=>campo==='fiado'?'¿A quién se le fió?':esRetiro?'¿Para qué se sacó?':esCom?'¿A quién se le compró y qué?':'Mensaje';
  const ejNota=()=>campo==='fiado'?'Nombre del cliente':esRetiro?'Ej.: bolsas y cinta':esCom?'Ej.: Alex · 2 cajas de papa':'Ej.: venta del día';
  const opsPago=()=>PL.PAGAN.map(p=>({v:p,t:p==='bolsa'?'La bolsa':N(p),ic:p==='bolsa'?'bolsa':''}));
  h.cuerpo.innerHTML=
    (g?`<div class="cx-chips" role="group" aria-label="Tipo">${tipos.map(c=>`<button type="button" class="cx-chip" data-campo="${c.k}" aria-pressed="${c.k===campo}">${ic(c.ic,18)}<span>${c.t}</span></button>`).join('')}</div>`:'')+
    campoMonto('cxM','Monto',r?r.monto:'')+
    (conPago?chips('pago','¿Quién pagó?',opsPago(),pago,'Si fue de su bolsillo, la bolsa se lo devuelve completo.'):'')+
    `<label class="cx-campo"><span class="cx-et" id="cxNE">${etNota()}</span><input id="cxN" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" value="${esc(r?r.nota||'':'')}" placeholder="${ejNota()}" ${esCom?'list="cxProv"':''}><span class="cx-error" role="alert"></span></label>
    ${esCom?`<datalist id="cxProv">${proveedores().map(p=>`<option value="${esc(p)}"></option>`).join('')}</datalist>`:''}
    <div class="cx-foto-campo">
      <label class="cx-foto-btn">${ic('camara',22)}<span id="cxFT">${r&&r.foto?'Cambiar la foto':esCom?'Foto de la factura':'Agregar una foto'}</span><input id="cxF" type="file" accept="image/*" hidden></label>
      <div class="cx-foto-prev" id="cxFP" hidden><img alt="Foto elegida"><button type="button" id="cxFX" class="cx-foto-x" aria-label="Quitar la foto">${ic('cerrar',18)}</button></div>
    </div>
    ${r?`<button type="button" class="cx-borrar" id="cxB">${ic('borrar',18)} Borrar este renglón</button>`:''}`;
  const $=s=>h.cuerpo.querySelector(s),inp=$('#cxM'),nota=$('#cxN'),prev=$('#cxFP');
  atarMonto(inp);
  const ponerPrev=u=>{prev.hidden=!u;if(u)prev.querySelector('img').src=u;$('#cxFT').textContent=u?'Cambiar la foto':esCom?'Foto de la factura':'Agregar una foto';};
  if(r&&r.foto)Fotos.url(r.id).then(u=>{if(u&&!fotoNueva&&!fotoFuera)ponerPrev(u);});
  h.cuerpo.addEventListener('click',e=>{
    const c=e.target.closest('[data-campo]');
    if(c){campo=c.dataset.campo;h.cuerpo.querySelectorAll('[data-campo]').forEach(b=>b.setAttribute('aria-pressed',String(b===c)));$('#cxNE').textContent=etNota();nota.placeholder=ejNota();
      if(conPago&&!pagoTocado){pago=PL.pagoDefecto(campo);h.cuerpo.querySelectorAll('[data-grupo="pago"] [data-op]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.op===pago)));}}
    if(e.target.closest('[data-grupo="pago"] [data-op]'))pagoTocado=true;
  });
  $('#cxF').addEventListener('change',async e=>{
    const a=e.target.files&&e.target.files[0];if(!a)return;
    try{fotoNueva=await achicar(a);fotoFuera=false;ponerPrev(URL.createObjectURL(fotoNueva));}
    catch(err){aviso('No se pudo usar esa foto. Probá con otra.',{tipo:'error'});}
    e.target.value='';
  });
  $('#cxFX').addEventListener('click',()=>{fotoNueva=null;fotoFuera=true;ponerPrev('');});
  const guardar=async()=>{
    const monto=leerMonto(inp),txt=nota.value.trim();
    if(!monto)return fallo(inp.closest('.cx-campo'),'Escribí el monto.');
    if((campo==='fiado'||esRetiro)&&!txt)return fallo(nota.closest('.cx-campo'),campo==='fiado'?'Poné a quién se le fió.':'Poné para qué se sacó.');
    if(conPago)pago=escogido(h.cuerpo,'pago')||pago;
    const id=r?r.id:uid();let conFoto=fotoNueva?true:(r&&r.foto&&!fotoFuera),sinFoto=false;
    if(fotoNueva){try{await Fotos.guardar(id,fotoNueva);}catch(err){conFoto=false;sinFoto=true;}}
    else if(fotoFuera&&r&&r.foto)Fotos.borrar(id);
    if(esRetiro){
      const e0=clDailyRaw(f),L=(e0.cajaRetiros||[]).filter(x=>x.id!==id);
      const viejo=(e0.cajaRetiros||[]).find(x=>x.id===id);
      L.push({id,amount:monto,concept:txt,at:viejo?viejo.at:new Date().toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'}),foto:!!conFoto});
      data.closureDaily=data.closureDaily||{};data.closureDaily[f]={...e0,cajaRetiros:L};
    }else{
      if(r)quitarRenglon(f,r);
      ponerRenglon(f,{id,campo,monto,nota:txt,foto:!!conFoto,at:r&&r.tipo!=='hoja'?r.at:null,cobrado:r&&r.cobrado,vence:r&&r.vence,pago:conPago?pago:undefined});
    }
    h.cerrar();save();
    const quienP=conPago&&pago!=='bolsa'?` · lo pagó ${N(pago)} y la bolsa se lo devuelve`:'';
    if(sinFoto)aviso(`Quedó anotado (${fmt(monto)}), pero la foto no se pudo guardar en este aparato.`,{tipo:'error',ms:8000});
    else aviso(`${r?'Corregido':'Anotado'}: ${fmt(monto)}${esRetiro?' de retiro':' en '+campoDe(campo).t}${quienP}.`);
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();nota.focus();}});
  nota.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guardar();}});
  const b=$('#cxB');
  if(b)b.addEventListener('click',()=>{h.cerrar();borrarRenglon(f,r,esRetiro);});
  const no=boton('Cancelar','ui-btn--secundario ui-btn--l'),si=boton('Guardar','ui-btn--primario ui-btn--l ui-crece');
  no.addEventListener('click',()=>h.cerrar());si.addEventListener('click',guardar);
  h.pie.appendChild(no);h.pie.appendChild(si);
}
function borrarRenglon(f,r,esRetiro){
  const antes=JSON.stringify({m:data.movs||[],c:(data.closureReceivables||{})[f]||[],d:clDailyRaw(f)});
  if(esRetiro){const e0=clDailyRaw(f);data.closureDaily=data.closureDaily||{};data.closureDaily[f]={...e0,cajaRetiros:(e0.cajaRetiros||[]).filter(x=>x.id!==r.id)};}
  else quitarRenglon(f,r);
  save();
  let deshecho=false;
  aviso(`Borrado: ${fmt(r.monto)}.`,{deshacer(){deshecho=true;const a=JSON.parse(antes);data.movs=a.m;data.closureReceivables=data.closureReceivables||{};data.closureReceivables[f]=a.c;
    data.closureDaily=data.closureDaily||{};const d0={...a.d};delete d0.compras;data.closureDaily[f]=d0;save();}});
  if(r.foto)setTimeout(()=>{if(!deshecho)Fotos.borrar(r.id);},9000);
}

/* ---------- piezas ---------- */
function barra(){
  const q=quien();
  return `<header class="cx-barra">
  <a class="cx-pastilla" href="APP.html" aria-label="Volver al Inicio de ARAMO">${ic('inicio',20)}<span>Inicio</span></a>
  <div class="cx-quien"><b>Control</b><small>${esc(TIENDA_NOMBRE)}</small></div>
  <button type="button" class="cx-pastilla cx-quien-b" data-cx="quien" aria-label="Cambiar de persona">${ic('persona',18)}<span>${esc(q.n||'Entrar')}</span></button>
</header>`;
}
// la semana y el día, en el puro centro; debajo, el botón de la ganancia de la semana (solo en el Inicio)
function tiraDias(conSemana){
  const h=hoy(),socio=esSocio();
  const gan=conSemana&&socio?sumar(vividos(),d=>d.ganancia):0;
  return `<div class="cx-semana" role="navigation" aria-label="Semana y día">
    <div class="cx-sem">
      <button type="button" class="cx-flecha" data-cx="sem" data-n="-1" aria-label="Semana anterior">${ic('atras',20)}</button>
      <div class="cx-sem-t"><b>Semana ${clWeekNumber(W.inicio)}</b><span class="cx-fecha">${E.dia===h?'Hoy · ':''}${esc(diaBonito(E.dia))}</span></div>
      <button type="button" class="cx-flecha" data-cx="sem" data-n="1" aria-label="Semana siguiente">${ic('siguiente',20)}</button>
    </div>
    ${(conSemana&&socio)||E.dia!==h?`<div class="cx-sem-b">
      ${E.dia!==h?`<button type="button" class="cx-hoy" data-cx="dia" data-d="${h}">Ir a hoy</button>`:''}
      ${conSemana&&socio?`<button type="button" class="cx-sem-gan${gan<0?' neg':''}" data-cx="ir" data-v="ganancia"><span>Ganancia de la semana</span><b>${col(gan)}</b>${ic('siguiente',16)}</button>`:''}
    </div>`:''}
    <div class="cx-dias">${W.perDay.map(d=>{
      const con=d.ventas||d.comprasTotal||d.cajaRetirosTotal,falta=(con||d.date===h)&&pendientes(d).length;
      return `<button type="button" class="cx-dia${d.date===E.dia?' on':''}${d.date===h?' hoy':''}${d.date>h?' futuro':''}" data-cx="dia" data-d="${d.date}" aria-pressed="${d.date===E.dia}" aria-label="${diaLargo(d.date)}${d.date===h?' (hoy)':''}">
        <small>${d.dayName.slice(0,3)}</small><b>${fecha(d.date).getDate()}</b><i class="${falta?'falta':con?'con':''}" aria-hidden="true"></i>${falta?'<span class="cx-solo-lector"> (falta algo)</span>':''}</button>`;}).join('')}
    </div>
  </div>`;
}
const cabeza=(sobre,titulo,cifra,pie,tono)=>`<div class="cx-cab">
  <button type="button" class="cx-pastilla" data-cx="ir" data-v="inicio">${ic('atras',20)}<span>Volver</span></button>
  <p class="cx-sobre">${sobre}</p>
  <h1 class="cx-tit">${titulo}</h1>
  ${cifra!=null?`<p class="cx-cifra cx-t-${tono||''}">${cifra}</p>`:''}
  ${pie?`<p class="cx-cab-pie">${pie}</p>`:''}
</div>`;
const vacio=(txt)=>`<p class="cx-vacio">${txt}</p>`;
const flecha=t=>`<i aria-hidden="true">${ic(t||'siguiente',20)}</i>`;

/* ---------- la caja: sobres, conteos, cambios y quién debe ---------- */
const sencillo=()=>num(((PL&&PL.cfg())||{}).sencillo);
const entregaDe=f=>(data.cajaEntregas||{})[f]||null;
const ultimoTurno=d=>{const s=(d.cajaSegments||[]);return s[s.length-1]||null;};
// lo que va en el sobre: lo contado al cerrar menos el sencillo que se queda
const sobreSugerido=d=>{const u=ultimoTurno(d);return u&&(u.turno||{}).cierre!==undefined?Math.max(0,num(u.turno.cierre)-sencillo()):0;};
const conteoDe=(f,k,campo)=>(data.cajaConteos||{})[f+'|'+k+'|'+campo]||null;
function guardarConteo(f,k,campo,den){data.cajaConteos=data.cajaConteos||{};if(den&&Object.keys(den).length)data.cajaConteos[f+'|'+k+'|'+campo]={den,at:new Date().toISOString(),quien:quien().n||''};else delete data.cajaConteos[f+'|'+k+'|'+campo];}
// cada corrección de la caja queda anotada (de cuánto a cuánto, cuándo y quién) para que un socio la revise
function anotarCambio(f,k,campo,de,a,persona){
  if(de===undefined||de===null||num(de)===num(a))return;
  data.cajaCambios=(data.cajaCambios||[]).slice(-300);
  data.cajaCambios.push({id:uid(),f,k,campo,de:num(de),a:a==null||a===''?null:num(a),at:new Date().toISOString(),quien:quien().n||'',persona:persona||''});
}
const cambiosDe=(f,k)=>(data.cajaCambios||[]).filter(c=>c.f===f&&c.k===k);
const textoCambio=c=>`${c.campo==='apertura'?'Con cuánto empezó':c.campo==='recibo'?'Lo que recibió':'El conteo del cierre'}: de ${fmt(c.de)} a ${c.a==null?'sin contar':fmt(c.a)}`;
// Quién debe plata de la caja (lo que faltó al cerrar su turno, o lo que el turno siguiente recibió de menos) y la
// plata de más (venta en efectivo que no se anotó). Mira las últimas 5 semanas.
function cuentasCaja(){
  if(_falt)return _falt;
  const deben=[],sobras=[],h=hoy(),pag=data.faltantesPagados||{},fin=clMonday(h);
  for(let L=clDateAdd(fin,-28);L<=fin;L=clDateAdd(L,7)){
    const Wk=L===W.inicio?W:clComputeWeek(L);
    Wk.perDay.forEach(d=>{if(d.date>h)return;const segs=d.cajaSegments||[];
      segs.forEach((s,i)=>{
        const dr=s.diff==null?0:Math.round(s.diff),g=s.handoffGap?Math.round(s.handoffGap):0;
        if(dr<0)deben.push({id:d.date+'|'+s.key+'|c',f:d.date,quien:s.personName,personId:s.personId,monto:-dr,por:`Al cerrar su turno (${s.start} a ${s.end}) había menos de lo que debía haber.`});
        if(dr>0)sobras.push({id:d.date+'|'+s.key+'|s',f:d.date,quien:s.personName,monto:dr});
        if(g>0)deben.push({id:d.date+'|'+s.key+'|r',f:d.date,quien:s.handoffFrom||'El turno anterior',personId:i>0?segs[i-1].personId:null,monto:g,por:`${s.personName} recibió la caja con ${fmt(g)} menos de lo que le dejaron anotado.`});
        if(g<0)sobras.push({id:d.date+'|'+s.key+'|t',f:d.date,quien:s.handoffFrom||'El turno anterior',monto:-g});
      });});
  }
  deben.forEach(x=>{x.pagado=pag[x.id]||null;});
  return _falt={deben,sobras};
}
// lo que un socio tiene que revisar: correcciones de la caja y plata de más
function porRevisar(){
  const rev=data.cajaRevisado||{},out=[];
  (data.cajaCambios||[]).forEach(c=>{if(!rev[c.id])out.push({id:c.id,f:c.f,t:'Hubo un cambio en la caja'+(c.persona?' de '+c.persona:''),d:`${textoCambio(c)}. Lo cambió ${c.quien||'alguien sin nombre'} el ${diaCorto(clDateISO(new Date(c.at)))} a las ${hora(c.at)}.`});});
  cuentasCaja().sobras.forEach(s=>{if(!rev[s.id])out.push({id:s.id,f:s.f,t:`Hay ${fmt(s.monto)} de más en la caja de ${s.quien}`,d:`${diaCorto(s.f)}: es venta en efectivo que no se anotó. Cuenta como venta de ese día, no como regalo.`});});
  return out;
}

/* ---------- lo que falta ---------- */
// qué falta en un día (una sola cosa grande, como "Lo urgente de hoy")
function pendientes(d){
  const D=d||diaActual(),out=[],h=hoy();if(D.date>h)return out;
  const pasado=D.date<h,ah=new Date(),min=ah.getHours()*60+ah.getMinutes(),socio=esSocio();
  (D.cajaSegments||[]).forEach(s=>{
    if(!esMio(s))return;
    if(!pasado&&min<timeMin(s.start))return;
    const termino=pasado||min>=timeMin(s.end),t=s.turno||{};
    if(s.needsEncargado)out.push({a:'caja-enc',k:s.key,q:`¿Quién cuenta la caja de ${s.start} a ${s.end}?`,d:'Hay dos personas a la vez en ese rato. Solo una responde por el cajón.',b:'Elegir'});
    else if(t.apertura===undefined&&!s.autoApertura)out.push({a:'caja-ap',k:s.key,q:`Contar con cuánto empieza la caja ${cuando(D.date)}`,d:`Es el primer día: ${s.personName} cuenta los billetes y las monedas antes de la primera venta.`,b:'Contar la caja'});
    else if(t.apertura===undefined)return;
    else if(s.autoApertura&&!t.confirmedAt)out.push({a:'caja-recibir',k:s.key,q:`${s.personName} recibe la caja con ${fmt(t.apertura)}`,d:`Es lo que dejó ${s.handoffFrom||'el turno anterior'}. Se cuenta para confirmar que está exacto.`,b:'Contar lo que recibió'});
    else if(t.cierre===undefined&&termino)out.push({a:'caja-cierre',k:s.key,q:`¿Contamos la caja de ${s.personName}?`,d:`Su turno terminó a las ${s.end}. Debe haber ${fmt(s.esperado)}.`,b:'Contar ahora'});
  });
  if(!socio)return out;
  // desde el arranque: contada la caja del último turno, se guarda el sobre del día y queda el sencillo
  const u=ultimoTurno(D);
  if(plataActiva(D.date)&&u&&(u.turno||{}).cierre!==undefined&&!entregaDe(D.date))
    out.push({a:'sobre',q:`Guardar el sobre ${D.date===h?'de hoy':'del '+diaCorto(D.date)}`,d:`Sacá ${fmt(sobreSugerido(D))} en un sobre y dejá ${fmt(sencillo())} de sencillo en el cajón.`,b:'Guardar el sobre'});
  if(!D.ventas&&(pasado||min>=12*60)){
    if(PU&&PU.posConectado&&PU.posConectado(TIENDA))out.push({a:'ir-ingresos',q:`No han llegado las ventas del POS ${cuando(D.date)==='hoy'?'de hoy':'del '+diaCorto(D.date)}`,d:'Llegan solas cuando el POS de la tienda tiene internet.',b:'Ver Ventas'});
    else out.push({a:'anotar',g:'ing',q:`¿Cuánto se vendió ${cuando(D.date)}?`,d:'Cuando el POS esté conectado llega solo. Mientras tanto se anota aquí.',b:'Anotar ventas'});
  }
  return out;
}
// lo que falta con la plata y con la caja de otros días (no es de un día: va con hoy)
function pendPlata(){
  const out=[],q=quien();
  cuentasCaja().deben.forEach(x=>{if(x.pagado)return;
    if(q.admin)out.push({a:'ir-caja',q:`${x.quien} debe ${fmt(x.monto)} de la caja`,d:`${diaCorto(x.f)}: ${x.por} Queda anotado hasta que lo pague.`,b:'Ver en Caja'});
    else if(q.n&&x.quien===q.n)out.push({a:'ir-caja',q:`Debés ${fmt(x.monto)} de la caja`,d:`${diaCorto(x.f)}: ${x.por}`,b:'Ver en Caja'});});
  if(!q.admin)return out;
  porRevisar().slice(0,1).forEach(x=>out.push({a:'ir-caja',q:x.t,d:x.d,b:'Revisar en Caja'}));
  if(!PL)return out;
  if(!PL.cfg())return out.concat([{a:'empezar',q:'La caja ya no se toca',d:'Las compras las pagan los tres, 20/40/40, y nadie le queda debiendo a nadie. Toma un minuto.',b:'Ver cómo funciona'}]);
  PL.pendientes().forEach(x=>{
    if(x.acc==='repartir')out.push({a:'repartir',L:x.L,q:`Repartir la semana ${clWeekNumber(x.L)}`,d:'Reponer la bolsa, apartar los gastos, devolver lo de bolsillo y repartir la ganancia.',b:'Ver el reparto'});
    else if(x.acc==='pasar')out.push({a:'pasar',de:x.de,para:x.para,monto:x.monto,q:`${Suj(x.de)} le ${deb(x.de)} ${fmt(x.monto)} ${aQ(x.para)}`,d:`Es su parte de la plata que ${N(x.para)} puso de más. Se paga en efectivo o por SINPE.`,b:x.de==='jefes'?'Ya se lo pasaron':'Ya se lo pasó'});
    else out.push({a:'devolver',para:x.para,monto:x.monto,q:`La bolsa le debe ${fmt(x.monto)} ${aQ(x.para)}`,d:'Lo pagó de su bolsillo. En la bolsa hay con qué devolvérselo.',b:'Ya se lo devolvió'});
  });
  return out;
}
function todoPendiente(){
  const out=pendientes();
  if(D.date===hoy())out.push(...pendPlata());
  if(esSocio())PEND.forEach(fn=>{try{(fn(D)||[]).forEach(x=>out.push({...x,mod:true}));}catch(e){console.error(e);}});
  return out;
}
function estadoCaja(){
  const segs=(D.cajaSegments||[]).filter(esMio),cont=segs.filter(s=>s.diff!=null).length;
  if(Math.round(D.cajaFaltante)>0)return{t:`Faltan ${fmt(D.cajaFaltante)}`,c:'mal'};
  if(Math.round(D.cajaSobrante)>0)return{t:`Hay ${fmt(D.cajaSobrante)} de más`,c:'ojo'};
  if(cont&&cont===segs.length)return{t:'Cuadra exacto',c:'bien'};
  if(cont)return{t:`${cont} de ${segs.length} turnos contados`,c:'info'};
  return{t:'Sin contar',c:'info'};
}

/* ---------- Inicio ---------- */
function cuadroBolsa(){
  const c=PL&&PL.cfg(),h=hoy();
  if(!c)return{num:'Sin empezar',sub:'La ponen los tres: 20 · 40 · 40',clase:'nuevo'};
  if(c.desde>h)return{num:'Lista',sub:'Empieza '+(c.desde===clDateAdd(h,1)?'mañana':'el '+diaCorto(c.desde))};
  const st=PL.estado(h),a=st.arreglos,dev=PL.IDS.filter(id=>st.debeBolsa[id]>0);
  return{num:col(st.bolsa),
    sub:a.length?a.map(x=>`${Suj(x.de)} ${deb(x.de)} ${fmt(x.monto)}`).join(' · '):dev.length?`Le debe ${dev.map(aQ).join(' y ')}`:'Todos al día',
    clase:a.length?'ojo':''};
}
function vInicio(){
  const pend=todoPendiente(),ec=estadoCaja(),socio=esSocio(),q=quien(),hoyEs=D.date===hoy();
  const cuadro=(v,tono,icn,nombre,num1,sub,clase)=>`<button type="button" class="cx-cuadro cx-t-${tono}${clase?' '+clase:''}" data-cx="ir" data-v="${v}">
      <span class="cx-ico" aria-hidden="true">${ic(icn,20)}</span><span class="cx-nom">${nombre}</span><span class="cx-flechita" aria-hidden="true">${ic('siguiente',16)}</span>
      <span class="cx-num"><b>${num1}</b><small>${sub}</small></span>
    </button>`;
  const p=pend[0],bo=PL?cuadroBolsa():null,en=entregaDe(D.date);
  const debenCaja=cuentasCaja().deben.filter(x=>!x.pagado&&(socio||x.quien===q.n));
  const cajaNum=D.cajaEsperada?col(D.cajaEsperada-(en?num(en.monto):0)):ec.t;
  const cajaSub=debenCaja.length?`${debenCaja[0].quien} debe ${fmt(debenCaja[0].monto)}`:D.cajaEsperada?ec.t+(en?' · sobre listo':''):cuando(D.date);
  const urgente=p?`<section class="cx-urgente" aria-label="Lo que falta">
      <p class="cx-sobre"><i aria-hidden="true"></i>Lo que falta ${cuando(D.date)}</p>
      <h2>${esc(p.q)}</h2><p>${esc(p.d)}</p>
      <button type="button" class="cx-accion" data-cx="pend" data-i="0"><span>${esc(p.b)}</span>${flecha()}</button>
      ${pend.length>1?`<p class="cx-urgente-mas">y ${pend.length-1} cosa${pend.length===2?'':'s'} más después de esta</p>`:''}
    </section>`
    :(D.date<=hoy()?`<section class="cx-calma"><span aria-hidden="true">${ic('listo',22)}</span><div><b>Todo al día</b><small>${diaLargo(D.date)}: no falta nada.</small></div></section>`:'');
  // quien no es socio solo ve su caja
  if(!socio)return barra()+tiraDias(false)+urgente+`
    <div class="cx-cuadros uno">${cuadro('caja','caja','caja','Mi caja',(D.cajaSegments||[]).some(esMio)?ec.t:'Sin turno',cuando(D.date),debenCaja.length?'alerta':'')}</div>`;
  return barra()+tiraDias(true)+`
  <button type="button" class="cx-heroe" data-cx="ir" data-v="resultado">
    <span class="cx-sobre">Ganancia ${hoyEs?'de hoy':'del '+esc(diaBonito(D.date))}</span>
    <span class="cx-heroe-cifra${D.ganancia<0?' neg':''}">${col(D.ganancia)}</span>
    <span class="cx-heroe-2">
      ${(()=>{let lb=null;try{lb=window.Cierres&&window.Cierres.libro?window.Cierres.libro([D]):null;}catch(e){}
        const entro=lb?lb.entroTotal:D.ingresoReal,seFue=lb?lb.seFueTotal:D.ingresoReal-D.ganancia;
        return `<span><small>Entró</small><b>${col(entro)}</b></span><span><small>Se fue</small><b>${col(seFue)}</b></span>`;})()}
    </span>
    <span class="cx-heroe-ver">Ver el detalle del día${ic('siguiente',16)}</span>
  </button>
  ${urgente}
  ${ranura('inicio:arriba')}
  <div class="cx-cuadros">${(()=>{
    // los cuadros de siempre; un módulo puede poner uno nuevo o cambiar uno de estos (mismo id)
    const L=[
      {id:'caja',orden:10,html:cuadro('caja','caja','caja','Caja',cajaNum,cajaSub,debenCaja.length||ec.c==='mal'?'alerta':'')},
      {id:'ingresos',orden:20,html:cuadro('ingresos','ing','efectivo','Ventas',col(D.ventas),'vendido '+cuando(D.date))},
      {id:'compras',orden:30,html:cuadro('compras','com','camion','Compras',col(D.comprasTotal),'comprado '+cuando(D.date))},
      {id:'fijos',orden:40,html:cuadro('fijos','fij','fecha','Gastos fijos',col(D.fixedTotal+D.salarioTotal),'por día')},
      {id:'bolsa',orden:70,html:bo?cuadro('bolsa','bol','bolsa','Bolsa',bo.num,bo.sub,bo.clase):''},
      {id:'admin',orden:80,html:cuadro('admin','adm','reparto','Cierre',col(sumar(vividos(),d=>d.ganancia)),'la semana y el reparto')}];
    CUADROS.forEach(c=>{
      let html='';
      try{if(!c.ver||c.ver()){const x=c.dato?c.dato(D,W)||{}:{};html=cuadro(c.vista||c.id,c.tono||c.id,c.icono||'nota',c.nombre||c.id,x.num==null?'':x.num,x.sub||'',x.clase||'');}}catch(e){console.error(e);}
      const i=L.findIndex(x=>x.id===c.id);
      if(c.quita){if(i>=0)L.splice(i,1);return;}
      if(i>=0)L[i]={id:c.id,orden:c.orden==null?L[i].orden:c.orden,html};else L.push({id:c.id,orden:c.orden==null?90:c.orden,html});
    });
    return L.filter(x=>x.html).sort((a,b)=>a.orden-b.orden).map(x=>x.html).join('');
  })()}
  </div>
  ${ranura('inicio:abajo')}
  <button type="button" class="cx-fila cx-mas" data-cx="ir" data-v="mas"><span class="cx-ico" aria-hidden="true">${ic('puntos',20)}</span><span class="cx-fila-t"><b>Más</b><small>Personal, horarios, hoja completa y respaldo</small></span>${ic('siguiente',20)}</button>`;
}

/* ---------- Ganancia de la semana, con todo el detalle ---------- */
// el recibo de varios días con los mismos números de "Cada colón" (control-cierre.js)
// el detalle de una fila grande, en colones enteros que suman exacto esa fila
const partesExactas=(total,L)=>{const P=window.Colones?window.Colones.partir(total,L.map(x=>Math.max(0,num(x.v)))):L.map(x=>Math.round(num(x.v)));return L.map((x,i)=>({...x,monto:P[i]})).filter(x=>x.monto);};
function detalleSemana(V,lb){
  const fila=k=>(lb.seFue.find(x=>x.k===k)||{monto:0}).monto,fij=new Map(),gente=new Map();
  V.forEach(d=>{
    const it=d.gastosDet&&d.gastosDet.items;
    if(it)it.forEach(x=>{const o=fij.get(x.id)||{t:x.label,v:0};o.v+=num(x.monto);fij.set(x.id,o);});
    // los salarios de un día cerrado son los de cuando se cerró (no los del horario de hoy)
    let sd=null;try{const z=window.Cierres&&window.Cierres.dia?window.Cierres.dia(d.date):null;sd=z&&z.salDet&&Object.keys(z.salDet).length?z.salDet:null;}catch(e){}
    Object.values(sd||clHourlyDetailForDay(d.dayName)||{}).forEach(x=>{const o=gente.get(x.name)||{t:'Salario · '+x.name,v:0,h:0};o.v+=num(x.pay);o.h+=num(x.hours);gente.set(x.name,o);});
  });
  let F=[...fij.values()];
  if(!F.length)F=W.fixedMonthly.map(f=>({t:f.label,v:num(f.daily)*V.length}));
  return{fijos:partesExactas(fila('fijos'),F),salarios:partesExactas(fila('salarios'),[...gente.values()]).map(x=>({...x,sub:hoursLabel(x.h)}))};
}
const reciboLibro=(lb,det)=>{
  const chico=x=>`<div class="cx-res-f sub"><span>${esc(x.t)}${x.sub?`<small>${esc(x.sub)}</small>`:''}</span><b>${fmt(x.monto)}</b></div>`;
  const fl0=x=>`<${x.ir?`button type="button" data-cx="ir" data-v="${x.ir}"`:'div'} class="cx-res-f"><span>${esc(x.t)}</span><b>${fmt(x.monto)}</b>${x.ir?ic('siguiente',16):''}</${x.ir?'button':'div'}>`;
  const fl=x=>fl0(x)+(det&&det[x.k]&&det[x.k].length>1?det[x.k].map(chico).join(''):'');
  return `<section class="cx-res"><h2><i class="mas" aria-hidden="true">+</i>Entró<b>${fmt(lb.entroTotal)}</b></h2>${lb.entro.map(fl).join('')||'<p class="cx-vacio">Todavía no entró nada.</p>'}</section>
  <section class="cx-res"><h2><i class="menos" aria-hidden="true">−</i>Se fue<b>${fmt(lb.seFueTotal)}</b></h2>${lb.seFue.map(fl).join('')}</section>
  <section class="cx-res cx-res-fin ${lb.quedo<0?'neg':''}"><h2><i aria-hidden="true">=</i>${lb.quedo<0?'Pérdida':'Quedó'}<b>${col(lb.quedo)}</b></h2></section>
  ${lb.cuadra?`<p class="cz-cuadra bien">${ic('ok',20)}<span>Cuadra: no falta ni un colón</span></p>`:`<p class="cz-cuadra mal">${ic('alerta',20)}<span>Hay ${fmt(Math.abs(lb.sinExplicar))} sin explicar</span></p>`}`;
};
function vGanancia(){
  let lb=null;try{lb=window.Cierres&&window.Cierres.libro?window.Cierres.libro(vividos()):null;}catch(e){console.error(e);}
  const V=vividos(),n=V.length,S=f=>sumar(V,f),gan=S(d=>d.ganancia),entro=S(d=>d.ingresoReal),ventas=S(d=>d.ventas),h=hoy();
  const prev=clComputeWeek(clDateAdd(W.inicio,-7)).perDay.slice(0,Math.max(1,n)),ganPrev=sumar(prev,d=>d.ganancia),dif=gan-ganPrev;
  const maxi=Math.max(1,...W.perDay.filter(d=>d.date<=h).map(d=>Math.abs(d.ganancia)));
  const barras=W.perDay.map(d=>{const fut=d.date>h,v=d.ganancia,alto=fut?0:Math.max(3,Math.round(Math.abs(v)/maxi*100));
    return `<button type="button" class="cx-barra-d${v<0?' neg':''}${fut?' fut':''}${d.date===E.dia?' on':''}" data-cx="dia-res" data-d="${d.date}" aria-label="${diaLargo(d.date)}: ${fut?'todavía no':col(v)}">
      <span class="cx-barra-v">${fut?'':mil(v)}</span><span class="cx-barra-c"><i style="height:${alto}%"></i></span><small>${d.dayName.slice(0,3)}</small></button>`;}).join('');
  const fila=(t,v,ir,sub,clase)=>Math.round(num(v))||ir==='siempre'?`<${ir&&ir!=='siempre'?`button type="button" data-cx="ir" data-v="${ir}"`:'div'} class="cx-res-f${clase?' '+clase:''}"><span>${t}${sub?`<small>${sub}</small>`:''}</span><b>${fmt(v)}</b>${ir&&ir!=='siempre'?ic('siguiente',16):''}</${ir&&ir!=='siempre'?'button':'div'}>`:'';
  // compras: con la bolsa o de bolsillo (desde el arranque)
  let porQuien='';
  if(PL&&V.some(d=>plataActiva(d.date))){const q={};V.forEach(d=>{if(plataActiva(d.date))PL.compras(d.date).forEach(c=>{q[c.pago]=(q[c.pago]||0)+c.monto;});});
    porQuien=Object.entries(q).filter(x=>x[1]).map(([k,v])=>k==='bolsa'?`con la bolsa ${fmt(v)}`:`${N(k)} de su bolsillo ${fmt(v)}`).join(' · ');}
  const gente={};V.forEach(d=>Object.values(clHourlyDetailForDay(d.dayName)).forEach(x=>{const g=gente[x.name]||(gente[x.name]={h:0,p:0});g.h+=num(x.hours);g.p+=num(x.pay);}));
  const tarjeta=S(d=>d.manual.card),neto=S(d=>d.datafonoNeto);
  // cómo se reparte (lo mismo que Administración)
  let rep;
  if(PL&&PL.cfg()&&clDateAdd(W.inicio,6)>=PL.cfg().desde){const r=PL.reparto(V);rep=PL.redondear({jefes:r.jefes,roger:r.roger,joseph:r.joseph});}
  else{const pt=(pct,sal,jo)=>sumar(V,d=>parteViejo(d,pct,sal,jo));rep={jefes:pt(.2,false,false),roger:pt(.4,true,false),joseph:pt(.4,true,true)};}
  return barra()+tiraDias()+cabeza(`Semana ${clWeekNumber(W.inicio)}${enCurso()?` · hasta hoy (${n} de 7 días)`:''}`,'Ganancia de la semana',col(gan),gan>=0?'Lo que entró menos lo que salió':'Pérdida: salió más de lo que entró',gan<0?'mal':'ing')+`
  <div class="cx-cajitas">
    <div class="cx-cajita"><small>Vendido</small><b>${col(ventas)}</b></div>
    <div class="cx-cajita"><small>Margen</small><b>${ventas?Math.round(gan/ventas*100)+' %':'—'}</b></div>
    <div class="cx-cajita"><small>Por día</small><b>${col(n?gan/n:0)}</b></div>
  </div>
  <section class="cx-tarjeta">
    <h2 class="cx-tarjeta-t">Día por día</h2>
    <div class="cx-barras">${barras}</div>
    <p class="cx-comparo">La semana pasada, en esos mismos ${n} día${n===1?'':'s'}: <b>${col(ganPrev)}</b> <span class="cx-marca ${dif>=0?'bien':'mal'}">${dif>=0?'+':'−'}${fmt(Math.abs(dif))}</span></p>
  </section>
  ${lb?reciboLibro(lb,detalleSemana(V,lb)):`<section class="cx-res">
    <h2><i class="mas" aria-hidden="true">+</i>Entró<b>${fmt(entro)}</b></h2>
    ${fila('Efectivo',S(d=>d.manual.cash),'ingresos')}
    ${fila('SINPE',S(d=>d.manual.sinpe),'ingresos')}
    ${fila('Tarjeta',neto,'ingresos',tarjeta?`${fmt(tarjeta)} menos ${W.cardFeePct}% de comisión`:'')}
    ${fila('Fiado',S(d=>d.cuentasPorCobrarTotal),'ingresos','Vendido, todavía por cobrar')}
    ${fila('Bodega',S(d=>d.manual.bodega),'ingresos','Mercadería que quedó')}
    ${fila('Efectivo de más en la caja',S(d=>d.cajaSobrante),'caja','Venta que no se anotó')}
    ${entro?'':'<p class="cx-vacio">Todavía no entró nada.</p>'}
  </section>
  <section class="cx-res">
    <h2><i class="menos" aria-hidden="true">−</i>Salió<b>${fmt(entro-gan)}</b></h2>
    ${fila('Compras',S(d=>d.comprasTotal),'compras',porQuien)}
    ${fila('Desechos',S(d=>d.manual.desechos),'ingresos')}
    ${W.fixedMonthly.map(f=>fila(f.label,f.daily*n,'fijos',`${fmt(f.raw)} ${cadaT(f.period)} · ${n} día${n===1?'':'s'}`,'sub')).join('')}
    ${Object.entries(gente).map(([nm,g])=>fila('Salario · '+esc(nm),g.p,'fijos',hoursLabel(g.h),'sub')).join('')}
    ${fila('Retiros de caja',S(d=>d.cajaRetirosTotal),'caja')}
    ${fila('Abonos de cuentas por pagar',S(d=>d.cuentaXpagarTotal))}
  </section>
  <section class="cx-res cx-res-fin ${gan<0?'neg':''}"><h2><i aria-hidden="true">=</i>${gan<0?'Pérdida':'Ganancia'}<b>${col(gan)}</b></h2></section>`}
  <h2 class="cx-h2">Cómo se reparte</h2>
  <button type="button" class="cx-reparto-mini" data-cx="ir" data-v="admin">
    ${PL?PL.SOCIOS.map(s=>`<span><small>${s.n} · ${s.pct}%</small><b class="${rep[s.id]<0?'cx-rojo':''}">${col(rep[s.id])}</b></span>`).join(''):''}
    <span class="cx-reparto-ver">Ver el reparto${ic('siguiente',16)}</span>
  </button>
  ${enCurso()?`<p class="cx-nota">Faltan ${7-n} día${7-n===1?'':'s'}: sus gastos fijos y salarios se cuentan cuando lleguen. Tocá un día de arriba para ver su cuenta.</p>`:'<p class="cx-nota">Tocá un día de arriba para ver su cuenta.</p>'}`;
}

/* ---------- Ingresos y Compras ---------- */
function tarjetaRenglon(r,grupo){
  const c=campoDe(r.campo),abierta=E.abiertos.has(r.id),esFiado=r.tipo==='fiado'||r.tipo==='fiadoPos';
  const marca=r.tipo==='auto'?`<span class="cx-marca auto">${r.pos?'Del POS':'Llegó solo'}</span>`:r.tipo==='hoja'?'<span class="cx-marca">De la hoja</span>':esFiado?`<span class="cx-marca ${r.cobrado?'bien':'ojo'}">${r.cobrado?'Ya pagó':'Debe'}</span>`:'';
  const titulo=r.tipo==='auto'?r.titulo:r.tipo==='hoja'?r.titulo:(r.nota||c.t);
  const meta=[r.tipo==='mov'&&!r.nota?'':c.t,r.tipo==='auto'?r.origen:'',r.tipo==='fiadoPos'?'Del POS':'',r.tipo==='fiadoPos'&&r.abonado&&!r.cobrado?'ya abonó '+fmt(r.abonado):'',hora(r.at),r.firma?'compró '+r.firma:''].filter(Boolean).join(' · ')||'Sin mensaje';
  const apagada=r.tipo==='auto'&&(r.fuera||r.tapado);
  const detalle=r.tipo==='auto'&&abierta?`<div class="cx-detalle">
      ${r.items.length?`<table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Monto</th></tr></thead><tbody>${r.items.map(i=>`<tr><td>${esc(i.t)}</td><td>${(Math.round(i.q*100)/100).toLocaleString('es-CR')}${i.u?' '+esc(i.u):''}</td><td>${fmt(i.precio)}</td><td>${fmt(i.monto)}</td></tr>`).join('')}</tbody></table>`:`<p>${r.pos?'Es la suma de las ventas del POS con esta forma de pago. Cada tiquete se ve en el POS.':'Este renglón llegó sin lista de productos.'}</p>`}
      ${r.tapado?'<p class="cx-nota">No se está sumando: esa casilla tiene un número escrito en la hoja completa.</p>':''}
      <button type="button" class="cx-enlace" data-cx="auto-fuera" data-id="${esc(r.id)}">${r.fuera?'Volver a contarlo':'No contar este renglón'}</button>
    </div>`:'';
  // desde el arranque: quién pagó esta compra (la bolsa, o alguien de su bolsillo)
  let pago='';
  if(grupo==='com'&&!apagada&&r.fijo)pago=`<span class="cx-pago fijo${r.fijo==='bolsa'?'':' bolsillo'}">${ic(r.fijo==='bolsa'?'bolsa':r.fijo==='caja'?'caja':r.fijo==='credito'?'reloj':'persona',16)}<span>${r.fijo==='credito'?'Se debe: todavía no se ha pagado':r.fijo==='caja'?'Pagó la caja':r.fijo==='bolsa'?'Pagó la bolsa':`Pagó ${N(r.fijo)} · la bolsa se lo devuelve`}</span></span>`;
  else if(grupo==='com'&&!apagada&&plataActiva(D.date)){const q=PL.pagoDe(D.date,r);
    pago=`<button type="button" class="cx-pago${q==='bolsa'?'':' bolsillo'}" data-cx="pago" data-id="${esc(r.id)}">${ic(q==='bolsa'?'bolsa':'persona',16)}<span>${q==='bolsa'?'Pagó la bolsa':`Pagó ${N(q)} · la bolsa se lo devuelve`}</span>${ic('editar',14)}</button>`;}
  const cuerpo=`<span class="cx-ico" aria-hidden="true">${ic(c.ic,20)}</span>
      <span class="cx-renglon-t"><b>${esc(titulo)}</b><small>${esc(meta)}</small>${r.tipo==='auto'?`<small class="cx-ver">${abierta?'Ocultar el detalle':(r.items.length?`Ver ${r.items.length} producto${r.items.length===1?'':'s'}`:'Ver el detalle')}</small>`:''}</span>
      <span class="cx-renglon-m">${marca}<b>${apagada?'<s>'+fmt(r.monto)+'</s>':(c.resta?'−':'')+fmt(r.monto)}</b></span>`;
  return `<article class="cx-renglon${apagada?' apagada':''}${c.resta?' resta':''}">
    ${r.tipo==='fiadoPos'?`<div class="cx-renglon-b">${cuerpo}</div>`:`<button type="button" class="cx-renglon-b" data-cx="renglon" data-g="${grupo}" data-id="${esc(r.id)}" ${r.tipo==='auto'?`aria-expanded="${abierta}"`:''}>${cuerpo}</button>`}
    ${r.foto?miniFoto(r.id):''}
    ${pago}
    ${esFiado&&r.solo?'<p class="cx-nota cx-cobro-solo">El POS anotó que ya lo pagó.</p>':esFiado?`<button type="button" class="cx-enlace cx-cobro" data-cx="fiado-cobro" data-id="${esc(r.id)}" data-f="${D.date}">${r.cobrado?'Marcar que todavía debe':'Marcar que ya pagó'}</button>`:''}
    ${detalle}
  </article>`;
}
function vGrupo(grupo){
  const g=GRUPO[grupo],esIng=grupo==='ing',ms=x=>typeof x.at==='number'?x.at:(Date.parse(x.at)||0),L=renglones(D.date,grupo).sort((a,b)=>ms(b)-ms(a));
  const total=esIng?D.ventas:D.comprasTotal,sem=sumar(W.perDay,d=>esIng?d.ventas:d.comprasTotal);
  const viejas=!esIng?D.compras+num(D.manual.grupoInversion)+(D.grupoInversion-sumar(COM,c=>D.manual[c.k])-num(D.manual.grupoInversion)):0;
  const deben=esIng?fiadosPendientes().filter(x=>x.date!==D.date):[];
  // lo que entró hoy de fiados: es plata de ventas de otros días (no es venta nueva)
  const fp=esIng&&PU&&PU.fiadoPagos?PU.fiadoPagos(D.date,TIENDA):[];
  const conPago=!esIng&&plataActiva(D.date);
  let porQuien='';
  if(conPago){const q={};PL.compras(D.date).forEach(c=>{q[c.pago]=(q[c.pago]||0)+c.monto;});
    porQuien=Object.entries(q).filter(x=>x[1]).map(([k,v])=>`<span class="cx-quien-pago${k==='bolsa'?'':' bolsillo'}">${k==='bolsa'?'La bolsa':N(k)} <b>${fmt(v)}</b></span>`).join('');}
  // Ingresos: lo que mandó el POS (o el aviso de que todavía no llega)
  let pos='',ps=null;
  if(esIng){
    ps=PU&&PU.pos?PU.pos(D.date,TIENDA):null;const manual=sumar(['cash','sinpe','card'],k=>num(clDailyRaw(D.date)[k])+num(((data.movs||[]).filter(m=>m.date===D.date&&m.campo===k)).reduce((t,m)=>t+num(m.monto),0)));
    if(ps){
      const suma=ps.efectivo+ps.sinpe+ps.tarjeta+ps.fiado+ps.otros,calza=Math.round(suma)===Math.round(ps.total);
      pos=`<section class="cx-pos ${calza?'bien':'mal'}"><span class="cx-ico" aria-hidden="true">${ic(calza?'listo':'alerta',20)}</span><div>
        <b>${calza?'Llegó solo del POS y cuadra':'El POS no cuadra'}: ${fmt(ps.total)} en ${ps.n} tiquete${ps.n===1?'':'s'}</b>
        <small>Efectivo ${fmt(ps.efectivo)} · SINPE ${fmt(ps.sinpe)} · Tarjeta ${fmt(ps.tarjeta)}${ps.fiado?' · Fiado '+fmt(ps.fiado):''}${calza?'':` = ${fmt(suma)}, y el POS dice ${fmt(ps.total)}`}</small>
        <small>${ps.descuentos?`Descuentos del día: ${fmt(ps.descuentos)} · `:''}${ps.anuladas&&ps.anuladas.n?`Anuladas: ${ps.anuladas.n} (${fmt(ps.anuladas.total)}) · `:''}Actualizado ${hora(ps.at)||'hace poco'}${ps.exacto?' · la caja de cada turno sale exacta':''}</small>
        ${ps.sinpePara?`<small>Los SINPE le llegaron a: ${Object.entries(ps.sinpePara).map(([k,x])=>`${esc(k)} ${fmt(x)}`).join(' · ')}</small>`:''}
        ${manual?`<small class="cx-ojo">Ojo: además hay ${fmt(manual)} anotados a mano este día. Si es lo mismo que mandó el POS, borrá lo de mano.</small>`:''}</div></section>`;
    }else if(D.date<=hoy())pos=`<section class="cx-pos espera"><span class="cx-ico" aria-hidden="true">${ic('nube',20)}</span><div><b>Las ventas llegan solas del POS</b><small>${PU&&PU.posConectado&&PU.posConectado(TIENDA)?'De este día todavía no ha llegado nada.':'El POS todavía no está conectado con el Control. Mientras tanto se pueden anotar aquí.'}</small></div></section>`;
  }
  const subs=g.campos.filter(c=>!c.viejo),soloPos=esIng&&!!ps;   // el día que el POS mandó las ventas, no se anota nada a mano
  const viejosIng=esIng?g.campos.filter(c=>c.viejo&&valorDe(D,c.k)):[];
  return barra()+tiraDias()+cabeza(diaLargo(D.date),esIng?'Ventas':'Compras <small>y Grupo Inversión</small>',col(total),`Semana: <b>${col(sem)}</b>${esIng?' en ventas':''}`,esIng?'ing':'com')+`
  ${pos}
  ${porQuien?`<div class="cx-quien-pagos" aria-label="Quién pagó las compras del día">${porQuien}</div>`:''}
  ${ranura((esIng?'ingresos':'compras')+':arriba')}
  <div class="cx-subs">${subs.map(c=>{const v=valorDe(D,c.k),n=L.filter(r=>r.campo===c.k&&!(r.tipo==='auto'&&(r.fuera||r.tapado))).length;
    if(soloPos)return `<div class="cx-sub${v?' con':''}"><span class="cx-ico" aria-hidden="true">${ic(c.ic,18)}</span><span class="cx-sub-t">${c.t}</span><b>${fmt(v)}</b><small>${v?'Del POS':'Nada hoy'}</small></div>`;
    return `<button type="button" class="cx-sub${v?' con':''}" data-cx="anotar" data-g="${grupo}" data-c="${c.k}" aria-label="Anotar ${c.t}: lleva ${fmt(v)}">
      <span class="cx-ico" aria-hidden="true">${ic(c.ic,18)}</span><span class="cx-sub-t">${c.t}</span>
      <b>${fmt(v)}</b><small>${n?n+(n===1?' renglón':' renglones'):'Tocá para anotar'}</small><i class="cx-sub-mas" aria-hidden="true">${ic('mas',16)}</i></button>`;}).join('')}
  </div>
  ${viejosIng.length?`<p class="cx-nota">${viejosIng.map(c=>`${c.t}: ${c.resta?'−':''}${fmt(valorDe(D,c.k))}`).join(' · ')} (de registros anteriores).</p>`:''}
  ${esIng&&num(D.manual.card)?`<p class="cx-nota">De la tarjeta quedan ${fmt(D.datafonoNeto)} después del ${D.cardFeePct}% de comisión del datáfono.</p>`:''}
  <h2 class="cx-h2">Renglón por renglón <span>${L.length}</span></h2>
  <div class="cx-lista">${L.length?L.map(r=>tarjetaRenglon(r,grupo)).join(''):vacio(esIng?'Nada este día todavía.':'Ninguna compra este día. Las del Cierre de compras llegan solas; las demás se anotan con la foto de la factura y quién la pagó.')}
    ${Math.abs(viejas)>=1?`<article class="cx-renglon"><div class="cx-renglon-b"><span class="cx-ico" aria-hidden="true">${ic('hoja',20)}</span><span class="cx-renglon-t"><b>Registros viejos</b><small>Se cambian en Más → Hoja completa</small></span><span class="cx-renglon-m"><b>${fmt(viejas)}</b></span></div></article>`:''}
  </div>
  ${deben.length?`<h2 class="cx-h2">Te deben de otros días <span>${fmt(sumar(deben,x=>x.amount))}</span></h2>
  <div class="cx-lista">${deben.map(x=>`<article class="cx-renglon"><div class="cx-renglon-b"><span class="cx-ico" aria-hidden="true">${ic('clientes',20)}</span><span class="cx-renglon-t"><b>${esc(x.concept||'Cliente')}</b><small>Fiado el ${diaCorto(x.date)} de ${mes(x.date)}${x.dueDate?' · paga el '+diaCorto(x.dueDate):''}${x.abonado?` · ya abonó ${fmt(x.abonado)} de ${fmt(x.original)}`:''}</small></span><span class="cx-renglon-m"><b>${fmt(x.amount)}</b></span></div>
      <button type="button" class="cx-enlace cx-cobro" data-cx="fiado-cobro" data-id="${esc(x.id)}" data-f="${x.date}">Marcar que ya pagó</button></article>`).join('')}</div>`:''}
  ${fp.length?`<h2 class="cx-h2">Pagaron fiados ${cuando(D.date)} <span>${fmt(sumar(fp,x=>x.monto))}</span></h2>
  <p class="cx-nota arriba">Es plata de ventas de otros días: entra ${cuando(D.date)}, pero no es venta nueva (ya se contó el día que se fió).</p>
  <div class="cx-lista">${fp.map(x=>`<article class="cx-renglon"><div class="cx-renglon-b"><span class="cx-ico" aria-hidden="true">${ic('clientes',20)}</span><span class="cx-renglon-t"><b>${esc(x.cliente||'Cliente')}</b><small>${x.metodo==='efectivo'?'En efectivo: entró al cajón':x.metodo==='sinpe'?'Por SINPE':'Con tarjeta'}${x.h?' · '+esc(x.h):''}</small></span><span class="cx-renglon-m"><span class="cx-marca bien">Pagó</span><b>${fmt(x.monto)}</b></span></div></article>`).join('')}</div>`:''}
  ${ranura((esIng?'ingresos':'compras')+':abajo')}
  ${soloPos?'':`<div class="cx-pie" data-ui-abajo><button type="button" class="cx-accion" data-cx="anotar" data-g="${grupo}"><span>${esIng?'Anotar un ingreso a mano':'Anotar una compra'}</span>${flecha('mas')}</button></div>`}`;
}
function fiadosPendientes(){
  const out=[],cob=data.fiadoCobrado||{},fuera=data.autoFuera||{};
  Object.entries(data.closureReceivables||{}).forEach(([f,L])=>(L||[]).forEach(r=>{if(!r.collected&&num(r.amount)>0)out.push({...r,date:f});}));
  if(PU&&PU.fiadosTodos){const est=fiadosPos();PU.fiadosTodos(TIENDA).forEach(r=>{
    if(cob[r.id]||fuera[r.id])return;const e=est[r.id]||{debe:num(r.amount),abonado:0};
    if(e.debe>0)out.push({...r,amount:e.debe,original:num(r.amount),abonado:e.abonado});});}
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}

/* ---------- Caja ---------- */
function vCaja(){
  const todos=D.cajaSegments||[],segs=todos.filter(esMio),ec=estadoCaja(),ret=clCajaRetiros(D.date),toc=plataActiva(D.date),u=ultimoTurno(D),en=entregaDe(D.date),socio=esSocio(),q=quien();
  const cc=cuentasCaja(),deben=cc.deben.filter(x=>(socio||x.quien===q.n)&&(!x.pagado||(x.f>=W.inicio&&x.f<=clDateAdd(W.inicio,6)))),rev=socio?porRevisar():[];
  const exacto=todos.some(s=>s.exact);
  const tarjeta=s=>{
    const t=s.turno||{},horas=hoursLabel((timeMin(s.end)-timeMin(s.start))/60),porConf=s.autoApertura&&t.apertura!==undefined&&!t.confirmedAt;
    let est,accion='';
    const k=esc(s.key),cam=cambiosDe(D.date,s.key);
    if(s.needsEncargado){est={t:'Falta elegir',c:'info'};accion=`<button type="button" class="cx-accion" data-cx="caja-enc" data-k="${k}"><span>Elegir quién cuenta</span>${flecha()}</button>`;}
    else if(t.apertura===undefined&&!s.autoApertura){est={t:'Falta contar',c:'info'};accion=`<button type="button" class="cx-accion" data-cx="caja-ap" data-k="${k}"><span>Contar con cuánto empieza</span>${flecha()}</button>`;}
    else if(t.apertura===undefined){est={t:'Esperando',c:'info'};accion=`<p class="cx-nota">Falta que ${esc(s.handoffFrom||'el turno anterior')} cuente su cierre.</p>`;}
    else if(porConf){est={t:'Falta recibirla',c:'ojo'};accion=`<button type="button" class="cx-accion" data-cx="caja-recibir" data-k="${k}"><span>Contar lo que recibió</span>${flecha()}</button>`;}
    else if(t.cierre===undefined){est={t:'Falta el cierre',c:'info'};accion=`<button type="button" class="cx-accion" data-cx="caja-cierre" data-k="${k}"><span>Contar la caja</span>${flecha()}</button>`;}
    else{const dr=Math.round(s.diff);est=dr===0?{t:'Cuadra exacto',c:'bien'}:dr<0?{t:`Faltan ${fmt(-dr)}`,c:'mal'}:{t:`Hay ${fmt(dr)} de más`,c:'ojo'};
      accion=`<button type="button" class="cx-enlace" data-cx="caja-cierre" data-k="${k}">Corregir el conteo</button>`;}
    const fila=(a,b,c)=>`<div class="cx-cuenta-f${c?' '+c:''}"><span>${a}</span><b>${b}</b></div>`;
    // el sobre del día va en la tarjeta del último turno, apenas se cuenta su caja
    let sobre='';
    if(toc&&socio&&s===u&&t.cierre!==undefined){
      sobre=en?`<div class="cx-sobre-dia listo"><span class="cx-ico" aria-hidden="true">${ic('sobre',20)}</span><div><b>Sobre del día: ${fmt(en.monto)}</b><small>Lo tiene ${esc(N(en.quien))} · en el cajón quedaron ${fmt(num(t.cierre)-num(en.monto))}</small></div>${en.foto?miniFoto('sobre:'+D.date):''}<button type="button" class="cx-enlace" data-cx="sobre">Corregir</button></div>`
        :`<div class="cx-sobre-dia"><p>En el cajón hay ${fmt(t.cierre)}. Se dejan ${fmt(sencillo())} de sencillo y lo demás va en el sobre.</p><button type="button" class="cx-accion" data-cx="sobre"><span>Guardar el sobre: ${fmt(sobreSugerido(D))}</span>${flecha('sobre')}</button></div>`;
    }
    const dr=s.diff==null?0:Math.round(s.diff);
    // de lo que entró al cajón en este turno, cuánto fue de fiados que pagaron (no es venta nueva)
    const iT=todos.indexOf(s),iniT=iT<=0?-1:timeMin(s.start),finT=iT<0||iT===todos.length-1?1e9:timeMin(todos[iT+1].start);
    const fia=s.exact?sumar(clCajaTransactionsFor(D.date).filter(x=>x&&x.fiado&&timeMin(x.time)>=iniT&&timeMin(x.time)<finT),x=>x.amount):0;
    return `<article class="cx-turno" style="--persona:${esc(s.color)}">
      <header><i class="cx-punto" aria-hidden="true"></i><div><b>${esc(s.personName)}</b><small>${s.start} a ${s.end} · ${horas}${s.overlap&&!s.needsEncargado?' · con '+esc((s.othersPresent||[]).join(', ')):''}</small></div><span class="cx-marca ${est.c}">${est.t}</span></header>
      ${s.needsEncargado?'':`<div class="cx-cuenta">
        ${fila(s.autoApertura?`Recibió${t.confirmedAt?' (contado)':''}`:'Empezó con',t.apertura===undefined?'—':fmt(t.apertura))}
        ${fila('+ Ventas en efectivo'+(s.exact?' (del POS)':''),fmt(s.segIn-fia))}
        ${fia>0?fila('+ Fiados que pagaron en efectivo',fmt(fia)):''}
        ${!toc||s.segOut>0?fila('− Compras en efectivo',fmt(s.segOut)):''}
        ${s.segRetiro>0?fila('− Lo que pagó el cajón',fmt(s.segRetiro)):''}
        ${fila('Debe haber',s.esperado==null?'—':fmt(s.esperado),'total')}
        ${t.cierre!==undefined?fila('Contó',fmt(t.cierre),'contado'):''}
      </div>`}
      ${s.handoffGap&&Math.round(s.handoffGap)?`<p class="cx-nota ${s.handoffGap>0?'mal':''}">Al recibir contó ${fmt(t.apertura)} y le habían dejado ${fmt(s.inheritedApertura)}: ${s.handoffGap>0?`faltaron ${fmt(s.handoffGap)}, y los debe ${esc(s.handoffFrom||'el turno anterior')}`:`había ${fmt(-s.handoffGap)} de más`}.</p>`:''}
      ${dr<0?`<p class="cx-nota mal">Faltan ${fmt(-dr)}: los debe ${esc(s.personName)}. Queda anotado abajo, en "Quién debe plata", hasta que los pague.</p>`:''}
      ${dr>0?`<p class="cx-nota ojo">Hay ${fmt(dr)} de más: es venta en efectivo que no se anotó. Cuenta como venta del día${socio?' y queda para revisar':''}.</p>`:''}
      ${cam.length?`<p class="cx-nota cambio">${ic('editar',14)} Hubo ${cam.length===1?'un cambio':cam.length+' cambios'}: ${cam.slice(-2).map(c=>`${esc(textoCambio(c))} (${esc(c.quien||'sin nombre')}, ${hora(c.at)})`).join(' · ')}</p>`:''}
      <div class="cx-turno-acc">${accion}${!s.autoApertura&&t.apertura!==undefined?`<button type="button" class="cx-enlace" data-cx="caja-ap" data-k="${k}">Corregir con cuánto empezó</button>`:''}${s.autoApertura&&t.confirmedAt?`<button type="button" class="cx-enlace" data-cx="caja-recibir" data-k="${k}">Volver a contar lo que recibió</button>`:''}</div>
      ${sobre}
    </article>`;
  };
  const sobres=socio&&(toc||W.perDay.some(d=>plataActiva(d.date)))?W.perDay.filter(d=>entregaDe(d.date)).map(d=>({d,e:entregaDe(d.date)})):[];
  const deDonde=r=>/^e:/.test(r.enlace)?{t:'Pagó una entrega',v:'compras',b:'Ver en Compras'}:/^a:/.test(r.enlace)?{t:'Pagó algo que se debía',v:'compras',b:'Ver en Compras'}:{t:'Pagó un gasto',v:'fijos',b:'Ver en Gastos'};
  const listaRetiros=ret.length?ret.map(r=>r.enlace?`<article class="cx-renglon resta"><div class="cx-renglon-b"><span class="cx-ico" aria-hidden="true">${ic('efectivo',20)}</span><span class="cx-renglon-t"><b>${esc(r.concept)}</b><small>${deDonde(r).t} · salió del cajón${r.at?' · '+esc(r.at):''}</small></span><span class="cx-renglon-m"><span class="cx-marca auto">Ya está anotado</span><b>−${fmt(r.amount)}</b></span></div>
      <button type="button" class="cx-enlace cx-cobro" data-cx="ir" data-v="${deDonde(r).v}">${deDonde(r).b}</button></article>`:`<article class="cx-renglon resta"><button type="button" class="cx-renglon-b" data-cx="retiro" data-id="${esc(r.id)}"><span class="cx-ico" aria-hidden="true">${ic('efectivo',20)}</span><span class="cx-renglon-t"><b>${esc(r.concept)}</b><small>Salió del cajón${r.at?' · '+esc(r.at):''}</small></span><span class="cx-renglon-m"><b>−${fmt(r.amount)}</b></span></button>
      ${r.foto?miniFoto(r.id):''}</article>`).join(''):'';
  const quedo=D.cajaEsperada?D.cajaEsperada-(en?num(en.monto):0):0;
  return barra()+tiraDias()+cabeza(diaLargo(D.date),socio?'Caja':'Mi caja',socio?(D.cajaEsperada?col(quedo):'—'):null,socio?`${en?`En el cajón, después del sobre de ${fmt(en.monto)}`:toc?(Math.round(D.cajaRetirosTotal)?`Entran las ventas · ${cuando(D.date)==='hoy'?'hoy':'ese día'} el cajón pagó ${fmt(D.cajaRetirosTotal)}`:'Solo entran ventas, no sale nada'):'Lo que debe haber en el cajón'} · <b class="cx-marca ${ec.c}">${ec.t}</b>`:(segs.length?'':'Hoy no tenés turno de caja.'),'caja')+`
  <div class="cx-lista">${segs.map(tarjeta).join('')}</div>
  ${socio&&todos.length>1?`<p class="cx-nota">${exacto?'Las ventas en efectivo de cada turno vienen del POS, con la hora de cada tiquete.':`El efectivo vendido${toc?'':' y lo comprado en efectivo'} se reparte entre los turnos según las horas de cada uno. Es un cálculo: cuando el POS mande cada venta con su hora, sale exacto.`}</p>`:''}
  ${deben.length?`<h2 class="cx-h2">Quién debe plata <span>${fmt(sumar(deben.filter(x=>!x.pagado),x=>x.monto))}</span></h2><div class="cx-lista">
    ${deben.map(x=>`<article class="cx-debe${x.pagado?' pagado':''}"><div class="cx-debe-t"><b>${esc(x.quien)}</b><span class="cx-marca ${x.pagado?'bien':'mal'}">${x.pagado?'Ya pagó':'Debe'}</span><b class="cx-debe-m">${fmt(x.monto)}</b></div>
      <p>${esc(diaBonito(x.f))}. ${esc(x.por)}</p>
      ${socio?(x.pagado?`<button type="button" class="cx-enlace" data-cx="falt-pago" data-id="${esc(x.id)}">Todavía no ha pagado</button>`:`<button type="button" class="cx-segundo ancho" data-cx="falt-pago" data-id="${esc(x.id)}">${ic('ok',18)} Ya lo pagó</button>`):''}</article>`).join('')}
  </div>`:''}
  ${rev.length?`<h2 class="cx-h2">Para revisar <span>${rev.length}</span></h2><div class="cx-lista">
    ${rev.map(x=>`<article class="cx-debe revisar"><div class="cx-debe-t"><b>${esc(x.t)}</b></div><p>${esc(x.d)}</p><button type="button" class="cx-segundo ancho" data-cx="revisado" data-id="${esc(x.id)}">${ic('ok',18)} Revisado</button></article>`).join('')}
  </div>`:''}
  ${!socio?'':toc?`<section class="cx-regla"><span class="cx-ico" aria-hidden="true">${ic('candado',20)}</span><div><b>La caja no se toca</b><small>Ni para compras, ni para mandados. Lo que haya que pagar sale de la bolsa, o se anota "Lo pagué yo" y la bolsa lo devuelve. Si un día igual hubo que pagar algo con el cajón (una entrega, por ejemplo), se anota en Compras o en Gastos como pagado «con la caja»: así la caja sigue cuadrando.</small></div></section>
    ${ret.length?`<h2 class="cx-h2">Salió del cajón <span>${fmt(D.cajaRetirosTotal)}</span></h2>
      ${ret.some(r=>r.enlace)?'<p class="cx-nota arriba">Lo que dice "Ya está anotado" pagó una entrega o un gasto: baja lo que debe haber en el cajón, y no se resta otra vez de la ganancia.</p>':''}
      <div class="cx-lista">${listaRetiros}</div>`:''}`
  :`<h2 class="cx-h2">Retiros de caja <span>${fmt(D.cajaRetirosTotal)}</span></h2>
  <div class="cx-lista">${listaRetiros||vacio('Sin retiros. Si se saca plata del cajón para pagar algo que no es una compra, se anota aquí con su motivo.')}</div>
  <button type="button" class="cx-segundo ancho" data-cx="retiro-nuevo">${ic('mas',18)} Anotar un retiro</button>`}
  ${sobres.length?`<h2 class="cx-h2">Sobres de la semana <span>${fmt(sumar(sobres,x=>x.e.monto))}</span></h2><div class="cx-lista">
    ${sobres.map(x=>`<article class="cx-renglon"><button type="button" class="cx-renglon-b" data-cx="dia" data-d="${x.d.date}"><span class="cx-ico" aria-hidden="true">${ic('sobre',20)}</span><span class="cx-renglon-t"><b>${esc(x.d.dayName)} ${fecha(x.d.date).getDate()}</b><small>Lo tiene ${esc(N(x.e.quien))}</small></span><span class="cx-renglon-m"><b>${fmt(x.e.monto)}</b></span></button>${x.e.foto?miniFoto('sobre:'+x.d.date):''}</article>`).join('')}
  </div><p class="cx-nota">Es lo vendido en efectivo. El lunes se junta con los SINPE y la tarjeta para el reparto.</p>`:''}
  ${socio?ranura('caja:abajo'):''}`;
}
const segDe=k=>(D.cajaSegments||[]).find(s=>s.key===k);
// El primer día (o cuando el día anterior no dejó cierre): se cuenta con cuánto empieza
async function cajaApertura(k){
  const s=segDe(k);if(!s)return;
  const sen=plataActiva(D.date)?sencillo():0,antes=(s.turno||{}).apertura,cn=conteoDe(D.date,k,'apertura');
  const r=await contar({titulo:'¿Con cuánto empieza la caja?',sub:`${s.personName} · ${diaLargo(D.date)}`,den:cn&&cn.den,debe:sen||null,
    texto:'Poné cuántos hay de cada billete y de cada moneda. La suma sale sola.'+(sen?` Debería ser el sencillo: <b>${fmt(sen)}</b>.`:''),quitar:antes!==undefined?'Quitar este conteo':''});
  if(!r)return;
  anotarCambio(D.date,k,'apertura',antes,r.monto,s.personName);guardarConteo(D.date,k,'apertura',r.den);
  clCajaSetTurno(D.date,k,'apertura',r.monto==null?'':r.monto);
  if(r.monto!=null)aviso(`Caja abierta con ${fmt(r.monto)}.`);
}
// Los demás días la apertura es automática: lo que dejó el turno anterior. Quien recibe la cuenta para confirmar que
// está exacto; si no calza, la diferencia queda a cuenta del turno anterior.
async function cajaRecibir(k){
  const s=segDe(k);if(!s)return;
  const dejaron=num(s.inheritedApertura),t=s.turno||{},cn=conteoDe(D.date,k,'recibo');
  const r=await contar({titulo:'Contar lo que recibió',sub:`${s.personName} · ${s.start} a ${s.end}`,den:cn&&cn.den,debe:dejaron,si:'Confirmar',
    texto:`${esc(s.handoffFrom||'El turno anterior')} dejó <b>${fmt(dejaron)}</b>. Contá los billetes y las monedas: tiene que dar exacto.`});
  if(!r||r.monto==null)return;
  if(t.confirmedAt)anotarCambio(D.date,k,'recibo',t.apertura,r.monto,s.personName);
  guardarConteo(D.date,k,'recibo',r.den);
  const dif=r.monto-Math.round(dejaron);
  if(dif===0){
    if(t.reportedApertura!==undefined){const e0=clDailyRaw(D.date),all={...(e0.cajaCounts||{})},cur={...(all[k]||{})};delete cur.reportedApertura;all[k]=cur;data.closureDaily[D.date]={...e0,cajaCounts:all};}
    clCajaConfirmTurno(D.date,k);aviso(`${s.personName} recibió ${fmt(r.monto)}: exacto.`);
  }else{
    clCajaReportApertura(D.date,k,r.monto);
    aviso(dif<0?`Faltan ${fmt(-dif)}. Los debe ${s.handoffFrom||'el turno anterior'}, no ${s.personName}.`:`Hay ${fmt(dif)} de más de lo que dejaron anotado.`,{tipo:dif<0?'error':'info',ms:8000});
  }
}
async function cajaCierre(k){
  const s=segDe(k);if(!s)return;
  const antes=(s.turno||{}).cierre,cn=conteoDe(D.date,k,'cierre');
  const r=await contar({titulo:'Contar la caja',sub:`${s.personName} · ${s.start} a ${s.end}`,den:cn&&cn.den,debe:s.esperado,
    texto:(s.esperado!=null?`Debe haber <b>${fmt(s.esperado)}</b>. `:'')+'Poné cuántos hay de cada billete y de cada moneda.',quitar:antes!==undefined?'Quitar este conteo':''});
  if(!r)return;
  anotarCambio(D.date,k,'cierre',antes,r.monto,s.personName);guardarConteo(D.date,k,'cierre',r.den);
  clCajaSetTurno(D.date,k,'cierre',r.monto==null?'':r.monto);
  if(r.monto==null||s.esperado==null)return;
  const dif=Math.round(r.monto-s.esperado);
  aviso(dif===0?'Cuadra exacto.':dif<0?`Faltan ${fmt(-dif)}. Los debe ${s.personName}.`:`Hay ${fmt(dif)} de más: es venta que no se anotó.`,{tipo:dif<0?'error':'ok',ms:7000});
}
async function cajaEncargado(k){
  const s=segDe(k);if(!s)return;
  const ops=(s.personIds||[]).map(id=>data.staff.find(p=>p.id===id)).filter(Boolean).map(p=>({v:p.id,t:p.name}));
  const v=await AramoUI.elegir({titulo:'¿Quién cuenta la caja?',texto:`De ${s.start} a ${s.end} están juntos. Solo una persona responde por el cajón.`,opciones:ops});
  if(v)clCajaSetEncargado(D.date,s.start,s.end,v);
}
async function faltantePago(id){
  const x=cuentasCaja().deben.find(d=>d.id===id);if(!x)return;
  data.faltantesPagados=data.faltantesPagados||{};
  if(x.pagado){delete data.faltantesPagados[id];save();return aviso(`${x.quien} vuelve a deber ${fmt(x.monto)}.`);}
  const ok=await AramoUI.confirmar({titulo:`¿${x.quien} ya pagó ${fmt(x.monto)}?`,texto:'Esa plata no se mete al cajón: se guarda con el sobre del día. Queda anotado quién lo recibió y cuándo.',si:'Sí, ya pagó'});
  if(!ok)return;
  data.faltantesPagados[id]={at:new Date().toISOString(),recibio:quien().n||''};save();aviso(`Anotado: ${x.quien} pagó ${fmt(x.monto)}.`);
}
// El sobre del día: lo vendido sale del cajón (con foto) y queda el sencillo para el turno siguiente
function guardarSobre(){
  const f=D.date,u=ultimoTurno(D);if(!u||(u.turno||{}).cierre===undefined)return aviso('Primero hay que contar la caja del último turno.',{tipo:'info'});
  const cierre=num(u.turno.cierre),en=entregaDe(f),id='sobre:'+f;
  const h=AramoUI.hoja({titulo:'El sobre del día',sub:diaLargo(f),clase:'ui-hoja--dialogo cx-hoja'});
  h.cuerpo.innerHTML=`<p class="cx-hoja-texto">En el cajón hay <b>${fmt(cierre)}</b>. Se dejan <b>${fmt(sencillo())}</b> de sencillo y lo demás va en el sobre.</p>`+
    campoMonto('cxM','Lo que va en el sobre',en?en.monto:sobreSugerido(D))+
    chips('quien','¿Quién se lo lleva?',PL.SOCIOS.map(s=>({v:s.id,t:s.n})),en?en.quien:'roger','Queda anotado quién tiene esa plata hasta el lunes.')+
    fotoHTML(en&&en.foto)+(en?`<button type="button" class="cx-borrar" data-borrar>${ic('borrar',18)} Quitar el sobre</button>`:'');
  const inp=h.cuerpo.querySelector('#cxM');atarMonto(inp);const ft=atarFoto(h.cuerpo,id,en&&en.foto);
  const guardar=async()=>{
    const monto=leerMonto(inp);
    if(monto>cierre)return fallo(inp.closest('.cx-campo'),`No puede ser más de lo que hay en el cajón (${fmt(cierre)}).`);
    const foto=await ft.guardar(id);
    data.cajaEntregas=data.cajaEntregas||{};
    data.cajaEntregas[f]={monto,quien:escogido(h.cuerpo,'quien')||'roger',foto,at:en?en.at:new Date().toISOString()};
    h.cerrar();save();aviso(`Sobre guardado: ${fmt(monto)}. En el cajón quedan ${fmt(cierre-monto)}.`);
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guardar();}});
  const b=h.cuerpo.querySelector('[data-borrar]');
  if(b)b.addEventListener('click',()=>{h.cerrar();delete data.cajaEntregas[f];save();aviso('Sobre quitado.');});
  const no=boton('Cancelar','ui-btn--secundario ui-btn--l'),si=boton('Guardar el sobre','ui-btn--primario ui-btn--l ui-crece');
  no.addEventListener('click',()=>h.cerrar());si.addEventListener('click',guardar);h.pie.appendChild(no);h.pie.appendChild(si);
}

/* ---------- Bolsa: la plata de los tres ---------- */
const regla=(icn,t,d)=>`<article class="cx-regla"><span class="cx-ico" aria-hidden="true">${ic(icn,20)}</span><div><b>${t}</b><small>${d}</small></div></article>`;
const GASTOS=[{k:'rent',t:'Alquiler'},{k:'electricity',t:'Luz'},{k:'terminal',t:'Datáfono'},{k:'taxes',t:'Impuesto'},{k:'insurance',t:'Seguro'},{k:'wifi',t:'Wifi'},{k:'salario',t:'Salario'},{k:'otro',t:'Otro'}];
const gastoT=k=>window.Gastos&&window.Gastos.nombre?(window.Gastos.nombre(k)||'Gasto'):(GASTOS.find(g=>g.k===k)||{t:'Gasto'}).t;
function vBolsa(){
  const c=PL&&PL.cfg(),h=hoy();
  if(!PL)return barra()+cabeza('La plata de los tres','Bolsa',null,'No se pudo cargar esta parte. Recargá la página.','bol');
  if(!c)return barra()+tiraDias()+cabeza('La plata de los tres','Bolsa',null,'Así funciona, desde el día que escojás:','bol')+`
    <div class="cx-lista">
      ${regla('candado','1 · La caja no se toca','Solo entran ventas. Al cerrar se guarda el sobre del día y en el cajón queda el sencillo.')}
      ${regla('bolsa','2 · La bolsa paga todo','Las compras y los gastos fijos. La ponen los tres: Jefes 20 %, Roger 40 %, Joseph 40 %. El sencillo de la caja también.')}
      ${regla('pasar','3 · Nadie le debe a nadie','Si alguien pone de más o paga de su bolsillo (el Uber, la tarjeta), el Control dice quién le pasa cuánto.')}
      ${regla('fecha','4 · El lunes, todo en cero','Las ventas reponen la bolsa, se aparta lo de los gastos y el ahorro, y se reparte la ganancia 20/40/40.')}
    </div>
    <div class="cx-pie" data-ui-abajo><button type="button" class="cx-accion" data-cx="ajustes-plata"><span>Empezar</span>${flecha()}</button></div>`;
  if(c.desde>h)return barra()+tiraDias()+cabeza('La plata de los tres','Bolsa',null,`Empieza el ${diaBonito(c.desde)}. Hasta entonces todo sigue como antes.`,'bol')+`
    <section class="cx-calma"><span aria-hidden="true">${ic('fecha',22)}</span><div><b>Todo listo</b><small>Desde el ${diaBonito(c.desde)} la caja no se toca y la plata la ponen los tres.</small></div></section>
    <button type="button" class="cx-segundo ancho" data-cx="ajustes-plata">${ic('ajustes',18)} Cambiar los ajustes</button>`;
  const st=PL.estado(h),pend=pendPlata().filter(x=>x.a==='pasar'||x.a==='devolver'),L=W.inicio,fin=clDateAdd(L,6);
  // los tres, cada uno con lo que puso y lo que le toca
  const socio=s=>{const cu=st.cuentas[s.id],puso=st.puso[s.id],le=st.le[s.id],db=st.debeBolsa[s.id],barraP=le>0?Math.min(100,Math.round(puso/le*100)):(puso>0?100:0);
    return `<article class="cx-socio2${cu<0?' debe':''}">
      <span class="cx-pct">${s.pct}%</span>
      <div class="cx-socio2-t">
        <div class="cx-socio2-cab"><b>${s.n}</b><span class="cx-marca ${cu<0?'ojo':cu>0?'info':'bien'}">${cu<0?(s.id==='jefes'?'Deben ':'Debe ')+fmt(-cu):cu>0?'Le deben '+fmt(cu):'Al día'}</span></div>
        <small>Puso ${fmt(puso)} · le toca ${fmt(le)}</small><span class="cx-progreso" aria-hidden="true"><i style="width:${barraP}%"></i></span>
        ${db?`<small class="cx-ojo">La bolsa le debe ${fmt(db)}: lo pagó de su bolsillo</small>`:''}</div>
    </article>`;};
  // los movimientos de la semana que se está viendo
  const movs=[];
  (data.plata||[]).forEach(m=>{if(m&&m.f>=L&&m.f<=fin&&m.f>=c.desde)movs.push({...m,k:'plata'});});
  st.virtual.forEach(v=>{if(v.f>=L&&v.f<=fin)movs.push({...v,k:'plata'});});
  for(let f=L;f<=fin&&f<=h;f=clDateAdd(f,1)){if(f<c.desde)continue;
    let b=0;PL.compras(f).forEach(x=>{if(x.pago==='bolsa')b+=x.monto;else movs.push({k:'bolsillo',f,de:x.pago,monto:x.monto,titulo:x.titulo,campo:x.campo,at:f+'T12:00'});});
    if(b)movs.push({k:'compras',f,monto:b,at:f+'T12:01'});}
  movs.sort((a,b)=>(b.f+(b.at||'')).localeCompare(a.f+(a.at||'')));
  const mov=m=>{
    let icn='bolsa',t='',sub=[],signo='',edita=false,marca='',accion='plata';
    if(m.k==='compras'){icn='camion';t='Compras pagadas con la bolsa';signo='−';}
    else if(m.k==='bolsillo'){icn='persona';t=`${N(m.de)} pagó de su bolsillo`;sub.push(m.titulo||campoDe(m.campo).t);marca=st.debeBolsa[m.de]>0?'<span class="cx-marca ojo">Se le devuelve</span>':'<span class="cx-marca bien">Devuelto</span>';}
    else if(m.virtual){icn='pasar';t=`${N(m.de)} adelantó lo que faltó`;sub.push('La bolsa no alcanzó');marca='<span class="cx-marca auto">Automático</span>';signo='+';}
    else if(m.t==='pone'){icn=m.a==='caja'?'caja':'bolsa';t=`${N(m.de)} puso ${m.a==='caja'?'el sencillo de la caja':'en la bolsa'}`;signo='+';edita=!m.sem;}
    else if(m.t==='paso'){icn='pasar';t=`${N(m.de)} le pasó ${aQ(m.a)}`;edita=!m.sem;}
    else if(m.t==='devuelve'){icn='bolsa';t=`La bolsa le devolvió ${aQ(m.a)}`;signo='−';edita=!m.sem;}
    else if(m.t==='repone'){icn='fecha';t=m.para==='fijos'?'Se apartó para gastos fijos y salarios':'Se repuso la bolsa con las ventas';signo='+';}
    else if(m.t==='abono'){icn='recibo';t=`Se pagó una compra que se debía${m.de==='bolsa'?' con la bolsa':m.de==='caja'?' con la caja':` · lo pagó ${N(m.de)}`}`;signo=m.de==='bolsa'?'−':'';}
    else if(m.t==='gasto'){icn='recibo';t=`Se pagó ${gastoT(m.concepto).toLowerCase()}${m.de==='bolsa'?' con la bolsa':` · lo pagó ${N(m.de)}`}`;signo=m.de==='bolsa'?'−':'';edita=true;accion='gasto';
      if(m.de!=='bolsa')marca=st.debeBolsa[m.de]>0?'<span class="cx-marca ojo">Se le devuelve</span>':'<span class="cx-marca bien">Devuelto</span>';}
    if(m.como==='sinpe')sub.push('SINPE');else if(m.como==='efectivo')sub.push('Efectivo');else if(m.como==='ganancia')sub.push('Con su parte de la ganancia');
    if(m.nota&&m.como!=='ganancia')sub.push(m.nota);
    if(m.sem)sub.push('Del reparto del lunes');
    const cuerpo=`<span class="cx-ico" aria-hidden="true">${ic(icn,20)}</span><span class="cx-renglon-t"><b>${esc(t)}</b><small>${esc([diaCorto(m.f)].concat(sub).join(' · '))}</small></span><span class="cx-renglon-m">${marca}<b>${signo}${fmt(m.monto)}</b></span>`;
    return `<article class="cx-renglon">${edita?`<button type="button" class="cx-renglon-b" data-cx="${accion}" data-id="${esc(m.id)}">${cuerpo}</button>`:`<div class="cx-renglon-b">${cuerpo}</div>`}${m.foto?miniFoto(m.id):''}</article>`;
  };
  const arreglo=p=>`<article class="cx-arreglo">
      <div class="cx-arreglo-q"><span class="cx-quien-c">${esc(p.a==='devolver'?'La bolsa':N(p.de))}</span>${ic('siguiente',18)}<span class="cx-quien-c">${esc(N(p.para))}</span><b>${fmt(p.monto)}</b></div>
      <p><b>${esc(p.q)}.</b> ${esc(p.d)}</p>
      <button type="button" class="cx-accion" data-cx="${p.a}" data-de="${p.de||''}" data-para="${p.para}" data-m="${p.monto}"><span>${esc(p.b)}</span>${flecha('ok')}</button>
    </article>`;
  return barra()+tiraDias()+cabeza('La plata del negocio','Bolsa',col(st.bolsa),`Debe haber en la bolsa hoy${st.reserva?` · de eso, <b>${fmt(st.reserva)}</b> está apartado para gastos fijos`:''}`,'bol')+`
  ${pend.length?`<h2 class="cx-h2">Para quedar en cero</h2><div class="cx-lista">${pend.map(arreglo).join('')}</div>`
    :`<section class="cx-calma"><span aria-hidden="true">${ic('listo',22)}</span><div><b>Nadie le debe a nadie</b><small>Cada uno tiene puesta su parte: 20/40/40.</small></div></section>`}
  <h2 class="cx-h2">Cada uno <span>${fmt(st.F)} entre los tres</span></h2>
  <div class="cx-lista">${PL.SOCIOS.map(socio).join('')}</div>
  <h2 class="cx-h2">Semana ${clWeekNumber(L)} <span>${movs.length} movimiento${movs.length===1?'':'s'}</span></h2>
  <div class="cx-lista">${movs.length?movs.map(mov).join(''):vacio(fin<c.desde?'Esta semana es de antes del arranque.':'Sin movimientos esta semana.')}</div>
  <button type="button" class="cx-enlace cx-ajustes" data-cx="ajustes-plata">${ic('ajustes',18)} Ajustes: desde cuándo, el sencillo y quién paga qué</button>
  <div class="cx-pie" data-ui-abajo><div class="cx-pie-2">
    <button type="button" class="cx-segundo" data-cx="pague">${ic('persona',18)} Lo pagué yo</button>
    <button type="button" class="cx-accion" data-cx="plata-nueva"><span>Anotar plata</span>${flecha('mas')}</button>
  </div></div>`;
}
// Anotar plata entre ellos: alguien puso en la bolsa, le pasó a otro, o la bolsa le devolvió
function anotarPlata(o){
  const m=o.mov||null,h0=hoy(),c=PL.cfg();
  let tipo=m?m.t:(o.tipo||'pone');
  const f=m?m.f:(E.dia>h0?h0:(E.dia<c.desde?h0:E.dia));
  const fijo=!!(m||o.fijo);
  const SO=PL.SOCIOS.map(s=>({v:s.id,t:s.n}));
  const h=AramoUI.hoja({titulo:o.titulo||(m?'Corregir':'Anotar plata'),sub:diaLargo(f),clase:'ui-hoja--dialogo cx-hoja'});
  h.cuerpo.innerHTML=
    (fijo?'':chips('tipo','¿Qué pasó?',[{v:'pone',t:'Puso en la bolsa',ic:'bolsa'},{v:'paso',t:'Le pasó a otro',ic:'pasar'},{v:'devuelve',t:'La bolsa devolvió',ic:'deshacer'}],tipo))+
    chips('de','¿Quién?',SO,m?m.de:(o.de||'joseph'))+
    chips('para','¿A quién?',SO,m?m.a:(o.para||'roger'))+
    campoMonto('cxM','Monto',m?m.monto:(o.monto||''))+
    chips('como','¿Cómo?',[{v:'efectivo',t:'Efectivo',ic:'efectivo'},{v:'sinpe',t:'SINPE',ic:'sinpe'}],m&&m.como?m.como:'sinpe')+
    `<label class="cx-campo"><span class="cx-et">Mensaje</span><input id="cxN" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" value="${esc(m&&m.nota||'')}" placeholder="Ej.: su parte de las compras del viernes"></label>`+
    fotoHTML(m&&m.foto,'Foto del comprobante')+(m?`<button type="button" class="cx-borrar" data-borrar>${ic('borrar',18)} Borrar este movimiento</button>`:'');
  const $=s=>h.cuerpo.querySelector(s),inp=$('#cxM'),nota=$('#cxN');atarMonto(inp);
  const ft=atarFoto(h.cuerpo,m&&m.id,m&&m.foto);
  const mostrar=()=>{
    $('[data-campo-de="de"]').hidden=tipo==='devuelve';
    $('[data-campo-de="para"]').hidden=tipo==='pone';
    $('[data-campo-de="de"] .cx-et').textContent=tipo==='paso'?'¿Quién le pasó?':'¿Quién puso?';
    $('[data-campo-de="para"] .cx-et').textContent=tipo==='devuelve'?'¿A quién le devolvió?':'¿A quién?';
  };
  mostrar();
  h.cuerpo.addEventListener('cambio',e=>{if(e.target.dataset.grupo==='tipo'){tipo=e.detail;mostrar();}});
  const guardar=async()=>{
    const monto=leerMonto(inp);if(!monto)return fallo(inp.closest('.cx-campo'),'Escribí el monto.');
    const de=tipo==='devuelve'?'bolsa':escogido(h.cuerpo,'de'),para=tipo==='pone'?(m&&m.a==='caja'?'caja':'bolsa'):escogido(h.cuerpo,'para');
    if(tipo==='paso'&&de===para)return fallo($('[data-campo-de="para"]'),'Tiene que ser otra persona.');
    const id=m?m.id:uid(),foto=await ft.guardar(id);
    const nuevo={id,f,t:tipo,de,a:para,monto,como:escogido(h.cuerpo,'como')||'sinpe',nota:nota.value.trim(),foto,at:m?m.at:new Date().toISOString()};
    data.plata=(data.plata||[]).filter(x=>x.id!==id);data.plata.push(nuevo);
    h.cerrar();save();
    aviso(tipo==='pone'?`Anotado: ${N(de)} puso ${fmt(monto)}.`:tipo==='paso'?`Anotado: ${N(de)} le pasó ${fmt(monto)} ${aQ(para)}.`:`Anotado: la bolsa le devolvió ${fmt(monto)} ${aQ(para)}.`);
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();nota.focus();}});
  nota.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guardar();}});
  const b=$('[data-borrar]');
  if(b)b.addEventListener('click',()=>{h.cerrar();borrarPlata(m);});
  const no=boton('Cancelar','ui-btn--secundario ui-btn--l'),si=boton('Guardar','ui-btn--primario ui-btn--l ui-crece');
  no.addEventListener('click',()=>h.cerrar());si.addEventListener('click',guardar);h.pie.appendChild(no);h.pie.appendChild(si);
}
function borrarPlata(m){
  const antes=(data.plata||[]).slice();data.plata=antes.filter(x=>x.id!==m.id);save();
  let deshecho=false;aviso(`Borrado: ${fmt(m.monto)}.`,{deshacer(){deshecho=true;data.plata=antes;save();}});
  if(m.foto)setTimeout(()=>{if(!deshecho)Fotos.borrar(m.id);},9000);
}
// Pagar un gasto fijo (alquiler, luz, un salario…): qué se pagó, cuánto, quién puso la plata y la foto del recibo
function anotarGasto(o){
  const m=o.mov||null,h0=hoy(),c=PL.cfg();
  const f=m?m.f:(E.dia>h0?h0:(E.dia<c.desde?h0:E.dia));
  const h=AramoUI.hoja({titulo:m?'Corregir el pago':'Pagar un gasto',sub:diaLargo(f),clase:'ui-hoja--dialogo cx-hoja'});
  h.cuerpo.innerHTML=
    chips('concepto','¿Qué se pagó?',GASTOS.map(g=>({v:g.k,t:g.t})),m?m.concepto:(o.concepto||'rent'))+
    campoMonto('cxM','Monto',m?m.monto:(o.monto||''))+
    chips('pago','¿Quién puso la plata?',PL.PAGAN.map(p=>({v:p,t:p==='bolsa'?'La bolsa':N(p),ic:p==='bolsa'?'bolsa':''})),m?m.de:'bolsa','Si fue de su bolsillo, la bolsa se lo devuelve completo.')+
    `<label class="cx-campo"><span class="cx-et">Mensaje</span><input id="cxN" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" value="${esc(m&&m.nota||'')}" placeholder="Ej.: alquiler de diciembre"></label>`+
    fotoHTML(m&&m.foto,'Foto del recibo')+(m?`<button type="button" class="cx-borrar" data-borrar>${ic('borrar',18)} Borrar este pago</button>`:'');
  const $=s=>h.cuerpo.querySelector(s),inp=$('#cxM'),nota=$('#cxN');atarMonto(inp);
  const ft=atarFoto(h.cuerpo,m&&m.id,m&&m.foto);
  const guardar=async()=>{
    const monto=leerMonto(inp);if(!monto)return fallo(inp.closest('.cx-campo'),'Escribí el monto.');
    const id=m?m.id:uid(),foto=await ft.guardar(id),de=escogido(h.cuerpo,'pago')||'bolsa',concepto=escogido(h.cuerpo,'concepto')||'otro';
    data.plata=(data.plata||[]).filter(x=>x.id!==id);
    data.plata.push({id,f,t:'gasto',de,a:'gasto',concepto,monto,nota:nota.value.trim(),foto,at:m?m.at:new Date().toISOString()});
    h.cerrar();save();
    aviso(`Anotado: ${gastoT(concepto).toLowerCase()} ${fmt(monto)}${de==='bolsa'?', con la bolsa':` · lo pagó ${N(de)} y la bolsa se lo devuelve`}.`);
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();nota.focus();}});
  nota.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guardar();}});
  const b=$('[data-borrar]');
  if(b)b.addEventListener('click',()=>{h.cerrar();borrarPlata(m);});
  const no=boton('Cancelar','ui-btn--secundario ui-btn--l'),si=boton('Guardar','ui-btn--primario ui-btn--l ui-crece');
  no.addEventListener('click',()=>h.cerrar());si.addEventListener('click',guardar);h.pie.appendChild(no);h.pie.appendChild(si);
}
// Ajustes de la plata (la primera vez: "Empezar")
function configurar(){
  const c=data.socios||{},nuevo=!c.activo,h=hoy(),man=clDateAdd(h,1),lun=clDateAdd(clMonday(h),7);
  const fechas=[{v:h,t:'Hoy'},{v:man,t:'Mañana'}];if(lun!==man)fechas.push({v:lun,t:'El lunes'});
  if(!nuevo&&c.desde&&!fechas.some(x=>x.v===c.desde))fechas.unshift({v:c.desde,t:diaCorto(c.desde)});
  const pagos=c.pagos||{};
  const SO=PL.SOCIOS.map(s=>({v:s.id,t:s.n}));
  const hj=AramoUI.hoja({titulo:nuevo?'Empezar con la plata de los tres':'Ajustes de la plata',sub:'Jefes 20 % · Roger 40 % · Joseph 40 %',clase:'ui-hoja--dialogo cx-hoja'});
  hj.cuerpo.innerHTML=
    chips('desde','¿Desde cuándo?',fechas,!nuevo&&c.desde?c.desde:man,'Desde ese día la caja no se toca. Lo de antes queda como estaba.')+
    campoMonto('cxS','Sencillo de la caja',c.sencillo!=null?c.sencillo:50000,'Lo que se queda en el cajón al cerrar, para dar vuelto.')+
    (nuevo?chips('sencilloDe','¿Quién puso ese sencillo?',[...SO,{v:'tres',t:'Los tres'},{v:'nadie',t:'Nadie aún'}],'roger','Si lo puso uno solo, los otros le pasan su parte.'):'')+
    `<details class="cx-mas-ajustes"><summary>Quién paga qué (ya viene listo)</summary>
      ${chips('sinpe','Las compras por SINPE las paga',[{v:'bolsa',t:'La bolsa'},...SO],pagos.sinpe||'roger','Si la bolsa tiene su propio SINPE, escogé "La bolsa".')}
      ${chips('tarjeta','Las compras con tarjeta y el Uber los paga',[{v:'bolsa',t:'Tarjeta del negocio'},...SO],pagos.tarjeta||'roger')}
      ${chips('adelanta','Si la bolsa no alcanza, lo que falta lo pone',SO,c.adelanta||'roger','Después los otros le pasan su parte.')}
    </details>`;
  atarMonto(hj.cuerpo.querySelector('#cxS'));
  const listo=()=>{
    const q=g=>escogido(hj.cuerpo,g),desde=q('desde')||man,sen=leerMonto(hj.cuerpo.querySelector('#cxS'));
    data.socios={...c,activo:true,desde,sencillo:sen,pagos:{sinpe:q('sinpe')||'roger',tarjeta:q('tarjeta')||'roger'},adelanta:q('adelanta')||'roger',repartidas:c.repartidas||{}};
    delete data.socios.deuda;
    if(nuevo&&sen>0){const quienS=q('sencilloDe'),at=new Date().toISOString();data.plata=data.plata||[];
      if(quienS==='tres'){const p=PL.partes(sen);PL.IDS.forEach(id=>{if(p[id])data.plata.push({id:uid(),f:desde,t:'pone',de:id,a:'caja',monto:p[id],como:'efectivo',nota:'Su parte del sencillo',at});});}
      else if(PL.IDS.includes(quienS))data.plata.push({id:uid(),f:desde,t:'pone',de:quienS,a:'caja',monto:sen,como:'efectivo',nota:'El sencillo de la caja',at});}
    hj.cerrar();save();
    aviso(nuevo?`Listo: desde ${desde===h?'hoy':desde===man?'mañana':'el '+diaBonito(desde)} la caja no se toca.`:'Ajustes guardados.',{ms:6000});
  };
  const no=boton('Cancelar','ui-btn--secundario ui-btn--l'),si=boton(nuevo?'Empezar':'Guardar','ui-btn--primario ui-btn--l ui-crece');
  no.addEventListener('click',()=>hj.cerrar());si.addEventListener('click',listo);hj.pie.appendChild(no);hj.pie.appendChild(si);
}

/* ---------- Gastos fijos ---------- */
function vFijos(){
  const semFijos=sumar(W.perDay,d=>d.fixedTotal),semSal=sumar(W.perDay,d=>d.salarioTotal),gente={};
  W.perDay.forEach(d=>Object.values(clHourlyDetailForDay(d.dayName)).forEach(x=>{const g=gente[x.name]||(gente[x.name]={h:0,p:0});g.h+=num(x.hours);g.p+=num(x.pay);}));
  const comision=sumar(W.perDay,d=>num(d.manual.card)-d.datafonoNeto),abonos=sumar(W.perDay,d=>d.cuentaXpagarTotal);
  const ICO={rent:'tienda',electricity:'sol',terminal:'tarjeta',taxes:'recibo',insurance:'candado',wifi:'nube',savings:'estrella'};
  // los pagos de verdad (desde el arranque): qué se pagó, quién puso la plata y la foto del recibo
  const c=PL&&PL.cfg(),act=c&&c.desde<=hoy(),st=act?PL.estado(hoy()):null,mesV=E.dia.slice(0,7);
  const pagos=act?(data.plata||[]).filter(m=>m&&m.t==='gasto'&&m.f>=c.desde&&m.f.slice(0,7)===mesV).sort((a,b)=>b.f.localeCompare(a.f)):[];
  return barra()+tiraDias()+cabeza(`Semana ${clWeekNumber(W.inicio)}`,'Gastos fijos',col(semFijos+semSal),`Lo que cuesta la semana entera. Por día: <b>${col(D.fixedTotal)}</b> de gastos${D.salarioTotal?` y <b>${col(D.salarioTotal)}</b> de salarios ${cuando(D.date)}`:''}.`,'fij')+`
  <div class="cx-lista">
    ${W.fixedMonthly.map(f=>`<button type="button" class="cx-fijo" data-cx="fijo" data-k="${f.key}">
      <span class="cx-ico" aria-hidden="true">${ic(ICO[f.key]||'recibo',20)}</span>
      <span class="cx-fijo-t"><b>${esc(f.label)}</b><small>${fmt(f.raw)} ${cadaT(f.period)}</small></span>
      <span class="cx-fijo-m"><b>${fmt(f.daily*7)}</b><small>esta semana</small></span>
      <span class="cx-lapiz" aria-hidden="true">${ic('editar',16)}</span>
    </button>`).join('')}
    <button type="button" class="cx-fijo" data-cx="hoja" data-p="schedule">
      <span class="cx-ico" aria-hidden="true">${ic('clientes',20)}</span>
      <span class="cx-fijo-t"><b>Salarios</b><small>${Object.keys(gente).length?Object.entries(gente).map(([n,g])=>`${esc(n)}: ${hoursLabel(g.h)} · ${fmt(g.p)}`).join('<br>'):'Nadie cobra por hora esta semana'}<br>Salen de Horarios</small></span>
      <span class="cx-fijo-m"><b>${fmt(semSal)}</b><small>esta semana</small></span>
      <span class="cx-lapiz" aria-hidden="true">${ic('siguiente',16)}</span>
    </button>
    <button type="button" class="cx-fijo" data-cx="comision">
      <span class="cx-ico" aria-hidden="true">${ic('tarjeta',20)}</span>
      <span class="cx-fijo-t"><b>Comisión del datáfono</b><small>${W.cardFeePct}% de lo cobrado con tarjeta<br>La tarjeta entra completa y esto va en lo que se fue</small></span>
      <span class="cx-fijo-m"><b>${fmt(comision)}</b><small>esta semana</small></span>
      <span class="cx-lapiz" aria-hidden="true">${ic('editar',16)}</span>
    </button>
    ${abonos?`<div class="cx-fijo"><span class="cx-ico" aria-hidden="true">${ic('recibo',20)}</span><span class="cx-fijo-t"><b>Abonos de cuentas por pagar</b><small>De registros viejos</small></span><span class="cx-fijo-m"><b>${fmt(abonos)}</b><small>esta semana</small></span></div>`:''}
  </div>
  <p class="cx-nota">Lo mensual se reparte entre los 30,44 días del mes y se cobra los 7 días. Tocá un gasto para cambiar su monto: cambia también en las semanas pasadas.</p>
  ${act?`<h2 class="cx-h2">Pagos de ${fecha(E.dia).toLocaleDateString('es-CR',{month:'long'})} <span>${fmt(sumar(pagos,m=>m.monto))}</span></h2>
  <p class="cx-nota arriba">Apartado en la bolsa para gastos: <b>${fmt(st.reserva)}</b>. Cada lunes, al repartir, se aparta lo de la semana.</p>
  <div class="cx-lista">${pagos.length?pagos.map(m=>`<article class="cx-renglon"><button type="button" class="cx-renglon-b" data-cx="gasto" data-id="${esc(m.id)}"><span class="cx-ico" aria-hidden="true">${ic('recibo',20)}</span>
      <span class="cx-renglon-t"><b>${esc(gastoT(m.concepto))}${m.nota?' · '+esc(m.nota):''}</b><small>${esc(diaCorto(m.f))} · ${m.de==='bolsa'?'Pagó la bolsa':`Pagó ${esc(N(m.de))}: la bolsa se lo devuelve`}</small></span>
      <span class="cx-renglon-m"><b>${fmt(m.monto)}</b></span></button>${m.foto?miniFoto(m.id):''}</article>`).join(''):vacio('Ningún pago anotado este mes. Cuando se pague el alquiler, la luz o un salario, se anota aquí con quién puso la plata y la foto del recibo.')}</div>
  <div class="cx-pie" data-ui-abajo><button type="button" class="cx-accion" data-cx="gasto-nuevo"><span>Pagar un gasto</span>${flecha('mas')}</button></div>`:''}`;
}
async function cambiarFijo(k){
  const f=W.fixedMonthly.find(x=>x.key===k);if(!f)return;
  const r=await pedirMonto({titulo:f.label,sub:f.period==='mes'?'Cuánto se paga al mes':'Cuánto se aparta por semana',etiqueta:f.period==='mes'?'Monto del mes':'Monto de la semana',valor:f.raw});
  if(!r||r.monto==null)return;data.settings[k]=r.monto;save();aviso(`${f.label}: ${fmt(r.monto)} ${cadaT(f.period)}.`);
}
async function cambiarComision(){
  const v=await AramoUI.pedir({titulo:'Comisión del datáfono',texto:'El porcentaje que cobra el banco por cada pago con tarjeta.',etiqueta:'Porcentaje',valor:String(num(data.settings.cardFee)).replace('.',','),tipo:'decimal',
    validar:x=>{const n=Number(String(x).replace(',','.'));return x!==''&&n>=0&&n<=30?'':'Escribí un número entre 0 y 30.';}});
  if(v==null)return;data.settings.cardFee=Number(v.replace(',','.'));save();
}

/* ---------- Resultado del día (se llega tocando la ganancia del Inicio, o un día de la semana) ---------- */
function vResultado(){
  const tarjeta=num(D.manual.card),neto=D.datafonoNeto,falt=D.cajaFaltante,gan=D.ganancia,entro=D.ingresoReal;
  const fila=(t,v,ir,sub)=>Math.round(num(v))?`<${ir?`button type="button" data-cx="ir" data-v="${ir}"`:'div'} class="cx-res-f"><span>${t}${sub?`<small>${sub}</small>`:''}</span><b>${fmt(v)}</b>${ir?ic('siguiente',16):''}</${ir?'button':'div'}>`:'';
  return barra()+tiraDias()+cabeza(diaLargo(D.date),'Ganancia del día',col(gan),gan>=0?'Lo que entró menos lo que salió':'Pérdida: salió más de lo que entró',gan<0?'mal':'res')+`
  <section class="cx-res">
    <h2><i class="mas" aria-hidden="true">+</i>Entró<b>${fmt(entro)}</b></h2>
    ${fila('Efectivo',D.manual.cash,'ingresos')}
    ${fila('SINPE',D.manual.sinpe,'ingresos')}
    ${fila('Tarjeta',neto,'ingresos',tarjeta?`${fmt(tarjeta)} menos ${W.cardFeePct}% de comisión`:'')}
    ${fila('Fiado',D.cuentasPorCobrarTotal,'ingresos','Vendido, todavía por cobrar')}
    ${fila('Bodega',D.manual.bodega,'ingresos')}
    ${fila('Efectivo de más en la caja',D.cajaSobrante,'caja','Venta que no se anotó')}
    ${Math.round(entro)?'':'<p class="cx-vacio">Todavía no entró nada.</p>'}
  </section>
  <section class="cx-res">
    <h2><i class="menos" aria-hidden="true">−</i>Salió<b>${fmt(entro-gan)}</b></h2>
    ${fila('Compras',D.comprasTotal,'compras')}
    ${fila('Desechos',D.manual.desechos,'ingresos')}
    ${fila('Gastos fijos',D.fixedTotal,'fijos','La parte de un día')}
    ${fila('Salarios',D.salarioTotal,'fijos')}
    ${fila('Retiros de caja',D.cajaRetirosTotal,'caja')}
    ${fila('Rebajos',D.rebajoTotal,'admin','De antes: ya no se hacen')}
    ${fila('Abonos de cuentas por pagar',D.cuentaXpagarTotal)}
  </section>
  <section class="cx-res cx-res-fin ${gan<0?'neg':''}"><h2><i aria-hidden="true">=</i>${gan<0?'Pérdida':'Ganancia'}<b>${col(gan)}</b></h2></section>
  ${Math.round(falt)?`<p class="cx-nota mal">Faltante de caja: ${fmt(falt)}. No baja la ganancia: lo debe quien cerró ese turno (está en Caja).</p>`:''}
  ${ranura('resultado:abajo')}
  <button type="button" class="cx-segundo ancho" data-cx="ir" data-v="ganancia">${ic('grafico',18)} Ver la semana completa</button>`;
}

/* ---------- Administración ---------- */
const parteViejo=(d,pct,pagaSalario,joseph)=>{const base=d.ganancia-d.cajaSobrante+d.salarioTotal;
  return base*pct+d.cajaSobrante/3-(pagaSalario?d.salarioTotal/2:0)-(joseph?num(d.manual.rebajoJoseph):0);};
function vAdmin(){
  const c=PL&&PL.cfg();
  if(c&&clDateAdd(W.inicio,6)>=c.desde)return vAdminPlata(c);
  const V=vividos(),gan=sumar(V,d=>d.ganancia),reb=sumar(V,d=>num(d.manual.rebajoJoseph));
  const socios=[['Jefes','20%',.2,false,false,'Sobre la ganancia antes de pagar salarios'],['Roger','40%',.4,true,false,'Menos la mitad de los salarios'],['Joseph','40%',.4,true,true,'Menos la mitad de los salarios'+(reb?' y el rebajo de antes':'')]];
  const total=sumar(socios,s=>sumar(V,d=>parteViejo(d,s[2],s[3],s[4])));
  return barra()+tiraDias()+cabeza(`Semana ${clWeekNumber(W.inicio)}${enCurso()?' · hasta hoy':''}`,'Cierre',col(gan),'La ganancia de la semana y cómo se reparte','adm')+`
  <div class="cx-lista">${socios.map(s=>{const v=sumar(V,d=>parteViejo(d,s[2],s[3],s[4]));
    return `<article class="cx-socio"><span class="cx-pct">${s[1]}</span><div><b>${s[0]}</b><small>${s[5]}</small><small>${D.date===hoy()?'Hoy':diaCorto(D.date)}: ${col(parteViejo(D,s[2],s[3],s[4]))}</small></div><b class="cx-socio-m${v<0?' cx-rojo':''}">${col(v)}</b></article>`;}).join('')}
  </div>
  <p class="cx-nota">Las tres partes suman ${col(total)}.${Math.abs(total-gan)>=1?` La ganancia es ${col(gan)}: la diferencia es el rebajo de Joseph de esa semana (ya no se hace).`:''} El sobrante de caja se reparte en tres partes iguales.</p>
  ${cierreSemana()}`;
}
function cierreSemana(){
  let guardado=null;try{guardado=(JSON.parse(localStorage.getItem(CLOSURES_KEY))||[]).find(x=>x.start===W.inicio);}catch(e){}
  const txt=guardado?'Volver a guardar el cierre':'Guardar el cierre de la semana';
  // si un módulo lleva el cierre (control-cierre.js: se cierra solo), aquí solo queda bajar la semana
  const auto=ranura('admin:cierre');
  if(auto)return auto+`<button type="button" class="cx-segundo ancho" data-cx="csv">${ic('descargar',18)} Bajar la semana para Excel</button>`;
  return `<h2 class="cx-h2">Cierre de la semana</h2>
  ${guardado?`<p class="cx-nota">Guardado el ${new Date(guardado.createdAt).toLocaleDateString('es-CR',{day:'numeric',month:'long'})}${guardado.notes?': «'+esc(guardado.notes)+'»':'.'}</p>`:''}
  ${PL&&PL.cfg()?`<button type="button" class="cx-segundo ancho" data-cx="guardar-cierre">${ic('ok',18)} ${txt}</button>`:`<button type="button" class="cx-accion" data-cx="guardar-cierre"><span>${txt}</span>${flecha('ok')}</button>`}
  <button type="button" class="cx-segundo ancho" data-cx="csv">${ic('descargar',18)} Bajar la semana para Excel</button>`;
}
// El reparto del lunes, en pasos, con la plata de los tres
function vAdminPlata(c){
  const h=hoy(),cerrada=clDateAdd(W.inicio,6)<h,dias=cerrada?W.perDay:vividos(),p=PL.plan(W.inicio,dias),n=clWeekNumber(W.inicio);
  const hecho=p.hecho,lunes=clDateAdd(W.inicio,7);
  const paso=(num1,t,v,d,clase)=>`<div class="cx-paso${clase?' '+clase:''}"><span class="cx-paso-n">${num1}</span><div><b>${t}</b>${d?`<small>${d}</small>`:''}</div><b class="cx-paso-m">${col(v)}</b></div>`;
  const devolver=PL.IDS.filter(id=>p.devolver[id]>0);
  const det={jefes:['20 % de la ganancia (no paga salarios)'],roger:['40 % menos la mitad de los salarios'],joseph:['40 % menos la mitad de los salarios']};
  if(p.rp.viejo>=1)det.joseph.push(`− ${fmt(p.rp.viejo)} del rebajo de antes`);
  p.ajustes.forEach(a=>{if(a.monto>0){det[a.de].push(`− ${fmt(a.monto)} que le ${deb(a.de)} ${aQ(a.para)}`);det[a.para].push(`+ ${fmt(a.monto)} que le ${deb(a.de)} ${a.de==='jefes'?'los Jefes':N(a.de)}`);}
    if(a.falta>0)det[a.de].push(`Todavía le ${deb(a.de)} ${fmt(a.falta)} ${aQ(a.para)}: no le alcanzó su parte`);});
  const suma=PL.IDS.reduce((t,id)=>t+p.final[id],0),dif=Math.round(p.ganancia)-suma;
  const a=PL.ahorroGuardado();
  return barra()+tiraDias()+cabeza(`Semana ${n}${enCurso()?' · hasta hoy':''}`,'Cierre',col(p.ganancia),cerrada?(hecho?`Repartida el ${diaBonito(clDateISO(new Date(hecho.at)))}`:'La semana cerró: lista para repartir'):`Así va el reparto. Se reparte el lunes ${fecha(lunes).getDate()}.`,'adm')+`
  ${hecho?`<section class="cx-calma"><span aria-hidden="true">${ic('listo',22)}</span><div><b>Semana repartida</b><small>La bolsa quedó repuesta y nadie le debe a nadie por esta semana.</small></div></section>`:''}
  <section class="cx-pasos" aria-label="El reparto del lunes">
    <h2 class="cx-tarjeta-t">El reparto del lunes, en orden</h2>
    ${paso(1,'Reponer la bolsa',p.reponer,'Lo que se compró vuelve a la bolsa, con la plata de las ventas.')}
    ${p.antes?paso('1b','A Roger, compras de antes del arranque',p.antes,`Las del ${diaCorto(W.inicio)} al ${diaCorto(clDateAdd(c.desde,-1))} las pagó él, como antes.`):''}
    ${devolver.length?devolver.map(id=>paso(2,`Devolverle ${aQ(id)}`,p.devolver[id],'Lo que pagó de su bolsillo.')).join(''):paso(2,'Devolver lo de bolsillo',0,'Nadie pagó de su bolsillo.','cero')}
    ${paso(3,'Apartar gastos fijos y salarios',p.apartar,'Queda en la bolsa para pagar el alquiler, la luz y los salarios.')}
    ${p.ahorro?paso('3b','Ahorro de los tres',p.ahorro,`A nombre de los tres: Jefes ${fmt(p.ahorroPartes.jefes)} · Roger ${fmt(p.ahorroPartes.roger)} · Joseph ${fmt(p.ahorroPartes.joseph)}.`):''}
    ${paso(4,'Ganancia para repartir',p.ganancia,'Jefes 20 % · Roger 40 % · Joseph 40 %','fin')}
  </section>
  <h2 class="cx-h2">A cada uno le toca</h2>
  <div class="cx-lista">${PL.SOCIOS.map(s=>`<article class="cx-socio cx-socio-r">
    <div class="cx-socio-cab"><span class="cx-pct">${s.pct}%</span><b class="cx-socio-n">${s.n}</b><b class="cx-socio-m${p.final[s.id]<0?' cx-rojo':''}">${col(p.final[s.id])}</b></div>
    <ul class="cx-socio-det">${det[s.id].map(x=>`<li class="${/^\+/.test(x)?'mas':/^−/.test(x)?'menos':/^Todavía/.test(x)?'falta':''}">${esc(x)}</li>`).join('')}</ul>
  </article>`).join('')}</div>
  <p class="cx-nota">Las tres partes suman ${col(suma)}${Math.abs(dif)>=1?`; la ganancia es ${col(p.ganancia)} (la diferencia es el rebajo de antes)`:', exacto la ganancia'}.</p>
  ${hecho&&Math.abs(Math.round(p.ganancia)-hecho.ganancia)>=1?`<p class="cx-nota mal">Ojo: después del reparto cambió algo de esta semana. Al repartir la ganancia era ${col(hecho.ganancia)}; ahora es ${col(p.ganancia)}.</p>`:''}
  ${cerrada&&!hecho?`<button type="button" class="cx-accion" data-cx="repartir" data-l="${W.inicio}"><span>Listo, ya repartimos</span>${flecha('ok')}</button>
    <p class="cx-nota">Al tocarlo queda anotado: la bolsa repuesta, lo apartado, lo devuelto y lo que alguien debía, pagado con su parte.</p>`:''}
  ${hecho?`<button type="button" class="cx-enlace" data-cx="deshacer-reparto" data-l="${W.inicio}">${ic('deshacer',16)} Deshacer el reparto</button>`:''}
  ${!cerrada?`<p class="cx-nota">El ${diaBonito(lunes)} aparece el botón para repartir.</p>`:''}
  <h2 class="cx-h2">Ahorro de los tres <span>${fmt(a.total)}</span></h2>
  <div class="cx-fila cx-ahorro"><span class="cx-ico" aria-hidden="true">${ic('estrella',20)}</span><span class="cx-fila-t"><b>${a.total?`Jefes ${fmt(a.partes.jefes)} · Roger ${fmt(a.partes.roger)} · Joseph ${fmt(a.partes.joseph)}`:'Todavía no se ha guardado nada'}</b><small>${a.total?`Lo apartado en ${a.semanas} lunes repartido${a.semanas===1?'':'s'}. Es de los tres, 20/40/40.`:'Cada lunes, al repartir, el ahorro de la semana queda a nombre de los tres: 20/40/40.'}</small></span></div>
  ${cierreSemana()}`;
}
async function guardarCierre(){
  let previo=null;try{previo=(JSON.parse(localStorage.getItem(CLOSURES_KEY))||[]).find(x=>x.start===W.inicio);}catch(e){}
  const notas=await AramoUI.pedir({titulo:'Guardar el cierre',texto:`Semana ${clWeekNumber(W.inicio)}. Queda anotada con sus ventas y su ganancia.`,etiqueta:'Notas de la semana (si hay)',valor:previo?previo.notes||'':'',largo:true,si:'Guardar'});
  if(notas==null)return;
  let todos=[];try{todos=JSON.parse(localStorage.getItem(CLOSURES_KEY)||'[]')||[];}catch(e){}
  const reg={start:W.inicio,end:clDateAdd(W.inicio,6),notes:notas,createdAt:new Date().toISOString(),totals:{sales:sumar(W.perDay,d=>d.ventas),profit:sumar(W.perDay,d=>d.ganancia)}};
  const i=todos.findIndex(x=>x.start===W.inicio);if(i>=0)todos[i]=reg;else todos.push(reg);
  localStorage.setItem(CLOSURES_KEY,JSON.stringify(todos));
  const n=document.getElementById('clNotes');if(n)n.value=notas;
  aviso('Cierre de la semana guardado.');pintar();
}
async function repartirSemana(L){
  const ok=await AramoUI.confirmar({titulo:`¿Ya repartieron la semana ${clWeekNumber(L)}?`,texto:'Queda anotado que la bolsa se repuso, que se apartó lo de los gastos, que se devolvió lo de bolsillo y que lo que alguien debía se pagó con su parte de la ganancia. Se puede deshacer.',si:'Sí, ya repartimos'});
  if(!ok)return;PL.repartir(L);aviso(`Semana ${clWeekNumber(L)} repartida. Todos en cero.`,{ms:6000});
}
async function deshacerReparto(L){
  const ok=await AramoUI.confirmar({titulo:'¿Deshacer el reparto?',texto:'Se borran los movimientos que anotó el reparto de esa semana (la bolsa repuesta, lo apartado, lo devuelto y lo pagado con la ganancia).',si:'Sí, deshacer',peligro:true});
  if(!ok)return;PL.deshacer(L);aviso('Reparto deshecho.');
}

/* ---------- dejar todo en cero (lo pide la marca aramo_reinicio de la nube) ---------- */
// Los datos del Control viven solo en este aparato: antes de borrar se guarda una copia completa aquí mismo.
const LSR='aramo_reinicio_visto_control_'+TIENDA,LSB='aramo_control_antes_del_reinicio_'+TIENDA;
function dejarEnCero(marca){
  try{localStorage.setItem(LSB,JSON.stringify({at:new Date().toISOString(),marca,data:JSON.parse(JSON.stringify(data)),cierres:localStorage.getItem(CLOSURES_KEY)}));}
  catch(e){aviso('No se pudo guardar la copia de antes, así que el Control NO se borró.',{tipo:'error',ms:10000});return false;}
  ['closureDaily','closureReceivables','autoFuera','pagoDe','cajaEntregas','cajaConteos','cajaRevisado','faltantesPagados','fiadoCobrado','closureInvoices'].forEach(k=>{data[k]={};});
  ['movs','plata','cajaCambios','closurePayables','daily','expenses'].forEach(k=>{if(k in data||k==='movs'||k==='plata')data[k]=[];});
  data.closureJosephRebate={amount:0,mode:'weekly-even',enabled:false};
  if(data.socios){data.socios.activo=false;data.socios.repartidas={};delete data.socios.deuda;}
  REINICIOS.forEach(fn=>{try{fn();}catch(e){console.error(e);}});   // lo de los módulos (entregas, desechos, cierres…)
  try{localStorage.removeItem(CLOSURES_KEY);localStorage.setItem(LSR,marca);}catch(e){}
  save();
  return true;
}
function revisarReinicio(){
  const marca=PU&&PU.reinicio?PU.reinicio():null;if(!marca)return;
  let visto='';try{visto=localStorage.getItem(LSR)||'';}catch(e){return;}
  if(marca<=visto)return;
  if(dejarEnCero(marca))aviso('El Control quedó en cero, como recién instalado. La copia de lo de antes está en Más.',{ms:10000});
}
async function restaurarCopia(){
  let c=null;try{c=JSON.parse(localStorage.getItem(LSB));}catch(e){}
  if(!c||!c.data)return aviso('No hay copia guardada.',{tipo:'info'});
  const ok=await AramoUI.confirmar({titulo:'¿Volver a lo de antes del reinicio?',texto:`Se pone otra vez todo lo que tenía el Control el ${diaBonito(clDateISO(new Date(c.at)))}. Lo anotado después de esa fecha se pierde.`,si:'Sí, restaurar',peligro:true});
  if(!ok)return;
  data=c.data;try{if(c.cierres)localStorage.setItem(CLOSURES_KEY,c.cierres);}catch(e){}
  save();aviso('Listo: el Control volvió a como estaba antes del reinicio.');
}
window.addEventListener('aramo-puente',()=>{try{revisarReinicio();}catch(e){console.error(e);}});

/* ---------- Más ---------- */
function vMas(){
  const fila=(p,icn,t,d)=>`<button type="button" class="cx-fila" data-cx="hoja" data-p="${p}"><span class="cx-ico" aria-hidden="true">${ic(icn,20)}</span><span class="cx-fila-t"><b>${t}</b><small>${d}</small></span>${ic('siguiente',20)}</button>`;
  let copia=null;try{copia=JSON.parse(localStorage.getItem(LSB));}catch(e){}
  return barra()+`<div class="cx-cab"><button type="button" class="cx-pastilla" data-cx="ir" data-v="inicio">${ic('atras',20)}<span>Volver</span></button><p class="cx-sobre">${esc(TIENDA_NOMBRE)}</p><h1 class="cx-tit">Más</h1></div>
  <div class="cx-lista">
    ${fila('staff','clientes','Personal','Quién trabaja y cuánto cobra por hora')}
    ${fila('schedule','reloj','Horarios','Los turnos de cada día: de ahí salen la caja y los salarios')}
    ${fila('closure','hoja','Hoja completa','La hoja de siempre, con toda la semana en una tabla')}
    ${fila('settings','ajustes','Ajustes y respaldo','Datos del negocio, exportar e importar una copia')}
    <button type="button" class="cx-fila" data-cx="clave"><span class="cx-ico" aria-hidden="true">${ic('candado',20)}</span><span class="cx-fila-t"><b>Clave de los socios</b><small>${data.settings.claveSocios?'Puesta: hace falta para entrar como socio':'Sin clave: cualquiera puede entrar como socio'}</small></span>${ic('siguiente',20)}</button>
    ${ranura('mas:lista')}
    ${copia&&copia.data?`<button type="button" class="cx-fila" data-cx="restaurar"><span class="cx-ico" aria-hidden="true">${ic('deshacer',20)}</span><span class="cx-fila-t"><b>Copia de antes del reinicio</b><small>Del ${diaBonito(clDateISO(new Date(copia.at)))}. Tocá para volver a como estaba.</small></span>${ic('siguiente',20)}</button>`:''}
  </div>
  <p class="cx-nota">Todo se guarda en este aparato. Las fotos también viven aquí y no van dentro del respaldo: conviene sacar un respaldo cada semana.</p>`;
}
function abrirHoja(p){
  E.hoja=true;document.documentElement.classList.remove('cx-on');
  if(location.hash!=='#hoja')history.pushState(null,'','#hoja');
  try{if(p==='closure')clLoad();page(p);}catch(e){console.error(e);}
  window.scrollTo(0,0);
}
function volver(){
  if(E.hoja&&location.hash==='#hoja')return history.back();   // el popstate de abajo hace el resto
  E.hoja=false;document.documentElement.classList.add('cx-on');
  if(location.hash&&location.hash!=='#')history.replaceState(null,'',location.pathname+location.search);
  E.vista='inicio';pintar();window.scrollTo(0,0);
}

/* ---------- pintar y navegar ---------- */
const PINTORES={inicio:vInicio,caja:vCaja,bolsa:vBolsa,ingresos:()=>vGrupo('ing'),compras:()=>vGrupo('com'),fijos:vFijos,resultado:vResultado,admin:vAdmin,ganancia:vGanancia,mas:vMas};
const permitida=v=>esSocio()||TODOS.has(v);   // quien no es socio solo ve su caja (y lo que un módulo deje ver a todos)
function pintar(){
  if(E.hoja)return;
  if(!permitida(E.vista))E.vista='inicio';
  const hacer=()=>{calcular();raiz.dataset.vista=E.vista;raiz.innerHTML=`<div class="cx-pagina">${PINTORES[E.vista]()}</div>`;ponerFotos(raiz);};
  try{PL?PL.conMemo(hacer):hacer();}
  catch(e){console.error(e);raiz.innerHTML=`<div class="cx-pagina">${barra()}<p class="cx-vacio">Algo no se pudo mostrar. La hoja de siempre sigue funcionando.</p><button type="button" class="cx-accion" data-cx="hoja" data-p="closure"><span>Abrir la hoja completa</span></button></div>`;}
}
function ir(v,sinHistoria){
  if(!VISTAS.includes(v)||!permitida(v))v='inicio';
  if(v===E.vista&&!E.hoja)return pintar();
  E.vista=v;E.abiertos.clear();
  if(!sinHistoria){const h=v==='inicio'?'':'#'+v;if(location.hash!==h)history.pushState(null,'',h||location.pathname+location.search);}
  pintar();window.scrollTo(0,0);
}
window.addEventListener('popstate',()=>{
  if(E.hoja){E.hoja=false;document.documentElement.classList.add('cx-on');E.vista='';}
  ir((location.hash||'').slice(1)||'inicio',true);
});

const ACC={
  ir:d=>ir(d.v),
  dia:d=>{E.dia=d.d;recordar();pintar();},
  'dia-res':d=>{E.dia=d.d;recordar();if(E.vista!=='resultado')ir('resultado');else{pintar();window.scrollTo(0,0);}},
  sem:d=>{E.dia=clDateAdd(E.dia,7*Number(d.n));recordar();pintar();},
  quien:()=>cambiarQuien(),
  clave:()=>cambiarClave(),
  restaurar:()=>restaurarCopia(),
  anotar:d=>anotar({grupo:d.g,campo:d.c}),
  renglon:d=>{
    const r=renglones(D.date,d.g).find(x=>x.id===d.id);if(!r)return;
    if(r.tipo==='auto'){E.abiertos.has(r.id)?E.abiertos.delete(r.id):E.abiertos.add(r.id);pintar();}
    else anotar({grupo:d.g,renglon:r});
  },
  'auto-fuera':d=>{data.autoFuera=data.autoFuera||{};if(data.autoFuera[d.id])delete data.autoFuera[d.id];else data.autoFuera[d.id]=1;save();},
  'fiado-cobro':d=>{
    if(/^pf:/.test(d.id)){data.fiadoCobrado=data.fiadoCobrado||{};if(data.fiadoCobrado[d.id])delete data.fiadoCobrado[d.id];else data.fiadoCobrado[d.id]=new Date().toISOString();return save();}
    clReceivableToggleCollected(d.f,d.id);
  },
  foto:d=>verFoto(d.id),
  retiro:d=>{const r=clCajaRetiros(D.date).find(x=>x.id===d.id);if(r)anotar({renglon:{id:r.id,campo:'retiro',monto:num(r.amount),nota:r.concept,foto:!!r.foto,tipo:'retiro'}});},
  'retiro-nuevo':()=>anotar({}),
  'caja-ap':d=>cajaApertura(d.k),
  'caja-recibir':d=>cajaRecibir(d.k),
  'caja-cierre':d=>cajaCierre(d.k),
  'caja-enc':d=>cajaEncargado(d.k),
  'falt-pago':d=>faltantePago(d.id),
  revisado:d=>{data.cajaRevisado=data.cajaRevisado||{};data.cajaRevisado[d.id]=new Date().toISOString();save();},
  sobre:()=>guardarSobre(),
  pago:async d=>{
    const r=renglones(D.date,'com').find(x=>x.id===d.id);if(!r)return;
    const v=await AramoUI.elegir({titulo:'¿Quién pagó esta compra?',texto:`${fmt(r.monto)} · ${r.titulo||r.nota||campoDe(r.campo).t}`,
      opciones:PL.PAGAN.map(p=>({v:p,t:p==='bolsa'?'La bolsa':N(p),sub:p==='bolsa'?'Salió de la plata de los tres':'De su bolsillo: la bolsa se lo devuelve'}))});
    if(v){PL.ponerPago(D.date,r,v);save();}
  },
  'plata-nueva':()=>anotarPlata({}),
  plata:d=>{const m=(data.plata||[]).find(x=>x.id===d.id);if(m)anotarPlata({mov:m});},
  'gasto-nuevo':()=>anotarGasto({}),
  gasto:d=>{const m=(data.plata||[]).find(x=>x.id===d.id);if(m)anotarGasto({mov:m});},
  pague:()=>anotar({grupo:'com',titulo:'Lo pagué de mi bolsillo',pago:'roger',campo:'comprasTarjeta'}),
  pasar:d=>anotarPlata({tipo:'paso',de:d.de,para:d.para,monto:Number(d.m),fijo:true,titulo:`${Suj(d.de)} le ${d.de==='jefes'?'pasan':'pasa'} ${aQ(d.para)}`}),
  devolver:d=>anotarPlata({tipo:'devuelve',para:d.para,monto:Number(d.m),fijo:true,titulo:`La bolsa le devuelve ${aQ(d.para)}`}),
  'ajustes-plata':()=>configurar(),
  repartir:d=>repartirSemana(d.l),
  'deshacer-reparto':d=>deshacerReparto(d.l),
  fijo:d=>cambiarFijo(d.k),
  comision:()=>cambiarComision(),
  'guardar-cierre':()=>guardarCierre(),
  csv:()=>{try{clExportCSV();}catch(e){console.error(e);aviso('No se pudo bajar el archivo.',{tipo:'error'});}},
  hoja:d=>abrirHoja(d.p),
  pend:d=>{
    const p=todoPendiente()[Number(d.i)];if(!p)return;
    if(p.mod)return ACC[p.a]?ACC[p.a](p):(p.ir?ir(p.ir):null);   // lo que falta según un módulo
    if(p.a==='anotar')return anotar({grupo:p.g});
    if(p.a==='ir-ingresos')return ir('ingresos');
    if(p.a==='ir-caja')return ir('caja');
    if(p.a==='sobre'){if(E.vista!=='caja')ir('caja');return guardarSobre();}
    if(p.a==='repartir'){E.dia=clDateAdd(p.L,6);recordar();return ir('admin');}
    if(p.a==='pasar')return ACC.pasar({de:p.de,para:p.para,m:p.monto});
    if(p.a==='devolver')return ACC.devolver({para:p.para,m:p.monto});
    if(p.a==='empezar')return ir('bolsa');
    if(E.vista!=='caja')ir('caja');ACC[p.a]({k:p.k});
  },
};
raiz.addEventListener('click',async e=>{
  const b=e.target.closest('[data-cx]');if(!b||!raiz.contains(b))return;
  const f=ACC[b.dataset.cx];if(!f)return;
  e.preventDefault();
  // una guarda puede frenar la acción (p. ej. cambiar algo de un día que ya se cerró pide el motivo)
  // "Lo que falta" lleva adentro otra acción (contar la caja, guardar el sobre…): la guarda mira esa
  let nombre=b.dataset.cx,datos=b.dataset;
  if(nombre==='pend'){const p=todoPendiente()[Number(b.dataset.i)];if(p&&!p.mod){nombre=p.a;datos={k:p.k,g:p.g,i:b.dataset.i};}}
  for(const g of GUARDAS){let r;try{r=g(nombre,datos);if(r&&typeof r.then==='function')r=await r;}catch(err){console.error(err);}if(r===false)return;}
  f(b.dataset);
});

// cada vez que la app de siempre guarda o le llega algo de ARAMO, la cara nueva se vuelve a pintar
const pintarTodo=renderAll;
renderAll=function(){pintarTodo.apply(this,arguments);pintar();};
// si cambia el día mientras la app está abierta (pasó la medianoche), se sigue en "hoy"
let ultimoHoy=hoy();
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;const h=hoy();if(h!==ultimoHoy){if(E.dia===ultimoHoy)E.dia=h;ultimoHoy=h;}pintar();});

/* ---------- módulos ---------- */
// Lo que un módulo puede usar y poner. Cada módulo: (window.CX_MODULOS=window.CX_MODULOS||[]).push(u=>{ … });
const API={
  // texto y fechas
  ic,hoy,fecha,col,mil,diaLargo,diaBonito,diaCorto,mes,hora,cuando,sumar,N,Suj,aQ,deb,aviso,
  // piezas de pantalla
  barra,tiraDias,cabeza,vacio,flecha,miniFoto,verFoto,tarjetaRenglon,ranuraDe:ranura,
  // ventanitas
  ventana,pedirMonto,campoMonto,atarMonto,leerMonto,chips,escogido,fotoHTML,atarFoto,boton,fallo,anotar,contar,
  // datos
  Fotos,quien,esSocio,plataActiva,vividos,enCurso,renglones,fiadosPendientes,cuentasCaja,estadoCaja,
  estado:E,semana:()=>W,dia:()=>D,
  // moverse
  pintar,ir,recordar,
  // poner cosas
  vista(id,pintor,o){if(!VISTAS.includes(id))VISTAS.push(id);PINTORES[id]=pintor;if(o&&o.todos)TODOS.add(id);},
  accion(nombre,fn){ACC[nombre]=fn;},
  acciones(o){Object.assign(ACC,o);},
  cuadro(def){const i=CUADROS.findIndex(c=>c.id===def.id);if(i>=0)CUADROS[i]=def;else CUADROS.push(def);},
  ranura(nombre,fn){(RANURAS[nombre]||(RANURAS[nombre]=[])).push(fn);},
  pendiente(fn){PEND.push(fn);},
  guarda(fn){GUARDAS.push(fn);},
  alReiniciar(fn){REINICIOS.push(fn);},
};
(window.CX_MODULOS||[]).forEach(m=>{try{m(API);}catch(e){console.error(e);}});

window.CX={volver,pintar,ir,estado:E,quien,dejarEnCero,cuentas:()=>{_falt=null;return cuentasCaja();},api:API};
E.vista=VISTAS.includes((location.hash||'').slice(1))?location.hash.slice(1):'inicio';
pintar();
})();
