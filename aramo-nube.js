/* ══════════════════════════════════════════════════════════════════════
   ARAMO · Nube de encargos — una sola fuente de verdad para
   🧺 Canasta (clientes) y 🛎️ Mostrador (tienda).

   Con nube: tabla Supabase `encargos` (crearla con supabase-encargos.sql),
   en vivo entre todos los teléfonos.
   Sin nube: el encargo vive en este dispositivo, se avisa en vivo entre
   pestañas y viaja por WhatsApp dentro de un enlace (#encargo=… / #e=…),
   así el ciclo completo funciona aunque Supabase esté en pausa.
   Cuando la nube vuelve, lo pendiente se sube solo.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';
const TABLE='encargos',TIENDA_ID='__tienda__';
const LKEY='aramo_encargos_v1',PKEY='aramo_encargos_pend',TKEY='aramo_tienda_v1';

const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const clone=o=>JSON.parse(JSON.stringify(o));
const now=()=>new Date().toISOString();

let store=read(LKEY,{}),pend=new Set(read(PKEY,[])),tiendaLocal=read(TKEY,null),tiendaNube=null;
let supa=null,modo='local',motivo='conectando…',solo=null,canal=null,reintento=0,conectando=null;
const subs=new Set();
const bc=('BroadcastChannel' in window)?new BroadcastChannel('aramo-encargos'):null;

function persist(){write(LKEY,store);write(PKEY,[...pend]);}
function emit(tipo,id){subs.forEach(f=>{try{f(tipo,id);}catch(e){console.warn('[nube]',e);}});}
function ts(o){return Date.parse(o?.updated||0)||0;}
function isNewer(a,b){if(!b)return true;if((a.v||0)!==(b.v||0))return (a.v||0)>(b.v||0);return ts(a)>ts(b);}
function take(o,quiet){
  if(!o?.id||o.id===TIENDA_ID)return false;
  if(!isNewer(o,store[o.id]))return false;
  store[o.id]=o;
  if(!quiet){persist();emit('encargo',o.id);}
  return true;
}
function prune(){
  const lim=Date.now()-45*864e5;
  Object.values(store).forEach(o=>{if(Date.parse(o.created||0)<lim&&!pend.has(o.id))delete store[o.id];});
}
prune();

// ── En vivo entre pestañas del mismo dispositivo ──
if(bc)bc.onmessage=e=>{
  const m=e.data||{};
  if(m.t==='encargo')take(m.o);
  if(m.t==='tienda'){tiendaLocal=m.d;write(TKEY,tiendaLocal);emit('tienda');}
};
else window.addEventListener('storage',e=>{
  if(e.key===LKEY){store=read(LKEY,{});emit('encargo');}
  if(e.key===TKEY){tiendaLocal=read(TKEY,null);emit('tienda');}
});
function avisar(o){try{bc&&bc.postMessage({t:'encargo',o});}catch{}}

// ── Nube (Supabase) ──
function timeout(p,ms){return Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('la nube no respondió')),ms))]);}
function rowOf(o){return{id:o.id,data:o,estado:o.estado||null,sucursal:o.sucursal||null,updated_at:o.updated||now()};}
async function subir(o){
  if(modo!=='nube'||!supa){pend.add(o.id);persist();return false;}
  try{
    const r=await timeout(supa.from(TABLE).upsert(rowOf(o),{onConflict:'id'}),9000);
    if(r.error)throw new Error(r.error.message);
    pend.delete(o.id);persist();return true;
  }catch(e){pend.add(o.id);persist();console.warn('[nube] no se pudo subir',o.id,e.message||e);return false;}
}
async function leerUno(id){
  if(modo!=='nube'||!supa)return null;
  try{
    const r=await timeout(supa.from(TABLE).select('data').eq('id',id).maybeSingle(),7000);
    return r.data?.data||null;
  }catch{return null;}
}
function onRealtime(p){
  const row=p.new&&p.new.id?p.new:null;
  if(!row)return;
  if(row.id===TIENDA_ID){tiendaNube=row.data;emit('tienda');return;}
  if(solo&&!solo.has(row.id))return; // un cliente solo sigue sus propios encargos
  take(row.data);
}
function conectar(opts){
  if(opts&&opts.ids)solo=new Set(opts.ids);
  if(conectando)return conectando;
  conectando=(async()=>{
    try{
      if(!window.supabase?.createClient)throw new Error('sin librería de nube');
      supa=supa||window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'aramo-nube-auth'}});
      let q=supa.from(TABLE).select('id,data');
      q=solo?q.in('id',[...solo,TIENDA_ID]):q.gte('updated_at',new Date(Date.now()-30*864e5).toISOString());
      const r=await timeout(q,9000);
      if(r.error)throw new Error(r.error.message);
      modo='nube';motivo='';
      (r.data||[]).forEach(row=>{if(row.id===TIENDA_ID)tiendaNube=row.data;else take(row.data,true);});
      persist();
      for(const id of [...pend])if(store[id])await subir(store[id]);
      if(tiendaLocal&&(!tiendaNube||ts(tiendaLocal)>ts(tiendaNube)))await subirTienda(tiendaLocal);
      if(!canal)canal=supa.channel('encargos-live').on('postgres_changes',{event:'*',schema:'public',table:TABLE},onRealtime).subscribe();
    }catch(e){
      modo='local';
      const m=String(e?.message||e);
      motivo=/fetch|network|resolve|no respondió|Failed/i.test(m)?'la nube está en pausa':/relation|does not exist|schema cache|not find/i.test(m)?'falta crear la tabla de encargos':m;
      clearTimeout(reintento);reintento=setTimeout(()=>{conectando=null;conectar();},60000);
    }
    conectando=null;
    emit('modo');emit('encargo');emit('tienda');
    return modo;
  })();
  return conectando;
}
window.addEventListener('online',()=>{if(modo!=='nube'){conectando=null;conectar();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&modo==='nube'&&solo)solo.forEach(async id=>{const o=await leerUno(id);if(o)take(o);});});

// ── Encargos ──
function crear(o){
  const t=now();
  o={...o,v:1,created:o.created||t,updated:t,log:[...(o.log||[]),{t,s:o.estado||'nuevo',by:'cliente',m:'Pedido hecho'}]};
  take(o);avisar(o);subir(o);
  if(solo)solo.add(o.id);
  return o;
}
async function cambiar(id,fn,quien,nota){
  const fresco=await leerUno(id);
  if(fresco)take(fresco,true);
  const cur=store[id];
  if(!cur)return null;
  const o=clone(cur);
  const antes=o.estado;
  fn(o);
  o.v=(cur.v||0)+1;o.updated=now();
  if(nota||o.estado!==antes)(o.log=o.log||[]).push({t:o.updated,s:o.estado,by:quien||'tienda',m:nota||''});
  take(o);avisar(o);subir(o);
  return o;
}
function importar(o){
  if(!o?.id)return false;
  const nuevo=take(o);
  if(nuevo){avisar(o);subir(o);}
  if(solo)solo.add(o.id);
  return nuevo;
}

// ── Ajustes de la tienda ──
function tienda(){
  const base=clone(window.ARAMO_CANASTA?.tienda||{});
  const usar=(tiendaLocal&&(!tiendaNube||ts(tiendaLocal)>=ts(tiendaNube)))?tiendaLocal:tiendaNube;
  if(!usar)return base;
  const t={...base,...usar,sinpe:{...base.sinpe,...(usar.sinpe||{})}};
  t.sucursales=(base.sucursales||[]).map(s=>({...s,...((usar.sucursales||[]).find(x=>x.k===s.k)||{})}));
  return t;
}
// ── Catálogo único: fábrica + productos nuevos de la tienda + cambios de la tienda ──
// Cambiar aquí precio, unidad o nombre se refleja solo en el Taller, las recetas,
// el Mostrador y la Caja. Los pedidos ya sellados conservan lo que se vendió.
function pasoDe(u){return u==='kg'?.5:1;}
function catalogo(){
  const t=tienda(),base=window.ARAMO_CANASTA?.productos||[];
  const ed=t.prods||{},precios=t.precios||{},ocultos=new Set(t.ocultos||[]),agot=new Set(t.agotados||[]);
  const vistos=new Set();
  return [...base,...(t.nuevos||[])].filter(p=>p&&p.k&&!vistos.has(p.k)&&vistos.add(p.k)).map(p=>{
    const e=ed[p.k]||{},u=e.u||p.u;
    const s=+e.s||(e.u&&e.u!==p.u?pasoDe(u):+p.s)||pasoDe(u);
    return{...p,...e,u,s,p:+precios[p.k]||+e.p||+p.p||0,agotado:agot.has(p.k),oculto:ocultos.has(p.k),propio:!base.some(b=>b.k===p.k)};
  });
}
function recetas(){
  const t=tienda(),fuera=new Set(t.recetasOcultas||[]);
  return [...(window.ARAMO_CANASTA?.recetas||[]),...(t.recetas||[])].filter(r=>r&&!fuera.has(r.k));
}
function waDe(k){const t=tienda(),s=(t.sucursales||[]).find(x=>x.k===k);return s?.whatsapp||t.whatsapp||'';}

// ── Avisos en el teléfono (notificación del sistema) ──
const avisos={
  soportado:()=>'Notification' in window,
  permiso:()=>('Notification' in window)?Notification.permission:'denied',
  async pedir(){if(!('Notification' in window))return 'denied';if(Notification.permission!=='default')return Notification.permission;try{return await Notification.requestPermission();}catch{return 'denied';}},
  async mostrar(titulo,cuerpo,o={}){
    try{
      if(window.aramoPOS?.avisar){window.aramoPOS.avisar(titulo,cuerpo);return true;} // dentro de ARAMO POS: aviso de Windows
      if(!('Notification' in window)||Notification.permission!=='granted')return false;
      const opts={body:cuerpo,tag:o.tag||'aramo',renotify:true,icon:new URL('icon.png',location.href).href,badge:new URL('icon.png',location.href).href,requireInteraction:!!o.fijo,vibrate:[160,80,160,80,240],data:{url:o.url||location.href}};
      const reg=navigator.serviceWorker&&await Promise.race([navigator.serviceWorker.getRegistration(),new Promise(r=>setTimeout(()=>r(null),1500))]);
      if(reg&&reg.showNotification){await reg.showNotification(titulo,opts);return true;}
      new Notification(titulo,opts);return true;
    }catch{return false;}
  },
  insignia(n){try{window.aramoPOS?.contador?.(n||0);if(navigator.setAppBadge){n?navigator.setAppBadge(n):navigator.clearAppBadge();}}catch{}},
};

async function subirTienda(d){
  if(modo!=='nube'||!supa)return false;
  try{const r=await timeout(supa.from(TABLE).upsert({id:TIENDA_ID,data:d,estado:'tienda',updated_at:d.updated},{onConflict:'id'}),9000);if(r.error)throw new Error(r.error.message);tiendaNube=d;return true;}
  catch(e){console.warn('[nube] ajustes sin subir',e.message||e);return false;}
}
function guardarTienda(cambios){
  const d={...tienda(),...cambios,updated:now()};
  tiendaLocal=d;write(TKEY,d);
  try{bc&&bc.postMessage({t:'tienda',d});}catch{}
  emit('tienda');
  return subirTienda(d);
}

// ── Enlaces que llevan el encargo adentro (para WhatsApp) ──
function pack(o){
  const bytes=new TextEncoder().encode(JSON.stringify(o));
  let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unpack(s){
  try{
    const b=atob(String(s).replace(/-/g,'+').replace(/_/g,'/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0))));
  }catch{return null;}
}
function enlace(pagina,clave,o){return new URL(pagina,location.href).href.split('#')[0]+'#'+clave+'='+pack(o);}

// ── Utilidades compartidas ──
const ALFA='ACDEFGHJKMNPQRTUVWXY3479';
const rnd=n=>{const a=new Uint32Array(n);crypto.getRandomValues(a);return [...a];};
function nuevoId(){return 'e'+Date.now().toString(36)+rnd(2).map(x=>x.toString(36)).join('').slice(0,8);}
function nuevoRef(){return 'A-'+rnd(4).map(x=>ALFA[x%ALFA.length]).join('');}
function nuevoPin(){return rnd(4).map(x=>x%10).join('');}
function colones(n){return '₡'+Math.round(+n||0).toLocaleString('es-CR').replace(/[\s  ,]/g,'.');}
function redondear5(n){return Math.round((+n||0)/5)*5;}
function qtyItem(it){return it.estado==='nohay'?0:(it.qr!=null&&it.qr!==''?+it.qr:+it.q||0);}
function totalDe(o){return redondear5((o?.items||[]).reduce((t,it)=>t+qtyItem(it)*(it.pr!=null&&it.pr!==''?+it.pr:+it.p||0),0)+(+o?.retiro?.envio?.costo||0));}
function esAprox(o){return !['listo','entregado'].includes(o?.estado)&&(o?.items||[]).some(it=>it.u==='kg'&&it.qr==null);}
function telCR(t){const d=String(t||'').replace(/\D/g,'');return d.length===8?'506'+d:d;}
function wa(tel,texto){const n=telCR(tel);return 'https://wa.me/'+(n||'')+'?text='+encodeURIComponent(texto);}

const ESTADOS=[
  {k:'nuevo',n:'Pendiente de aceptación',e:'📥',txt:'La tienda recibió tu pedido y debe aceptarlo.'},
  {k:'alistando',n:'Alistando',e:'🧑‍🌾',txt:'Están escogiendo tus productos uno por uno.'},
  {k:'listo',n:'Listo',e:'✅',txt:'Tu canasta está lista para recoger.'},
  {k:'entregado',n:'Entregado',e:'🛍️',txt:'¡Gracias por comprar en ARAMO!'},
];
const PAGOS={
  sinpe:{n:'SINPE Móvil',e:'📲',txt:'Pagás con el total exacto cuando esté lista.'},
  tarjeta:{n:'Tarjeta al recoger',e:'💳',txt:'Pagás con datáfono en la tienda.'},
  efectivo:{n:'Efectivo al recoger',e:'💵',txt:'Pagás en caja cuando llegás.'},
  link:{n:'Tarjeta en línea',e:'🔗',txt:'Te llega el link de pago con el total exacto.'},
};

window.AramoNube={
  conectar,crear,cambiar,importar,
  lista:()=>Object.values(store).sort((a,b)=>Date.parse(b.created||0)-Date.parse(a.created||0)),
  get:id=>store[id]||null,
  modo:()=>modo,motivo:()=>motivo,pendientes:()=>pend.size,
  on:f=>{subs.add(f);return()=>subs.delete(f);},
  tienda,guardarTienda,catalogo,recetas,waDe,avisos,
  pack,unpack,enlace,
  nuevoId,nuevoRef,nuevoPin,colones,redondear5,qtyItem,totalDe,esAprox,telCR,wa,
  ESTADOS,PAGOS,
};
})();
