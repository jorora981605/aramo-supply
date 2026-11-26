/* ══════════════════════════════════════════════════════════════════════
   ARAMO · Nube de encargos — una sola fuente de verdad para
   🧺 Canasta (clientes) y 🛎️ Mostrador (tienda).

   Con nube: tabla Supabase `encargos` (crearla con supabase-encargos.sql),
   en vivo entre todos los teléfonos.
   Sin nube: el encargo queda guardado en este dispositivo y se sube solo
   cuando la conexión vuelva. La tienda lo verá al conectarse.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';
const TABLE='encargos',TIENDA_ID='__tienda__';
const LKEY='aramo_encargos_v1',PKEY='aramo_encargos_pend',CKEY='aramo_encargos_changes',TKEY='aramo_tienda_v1';

const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const clone=o=>JSON.parse(JSON.stringify(o));
const now=()=>new Date().toISOString();

let store=read(LKEY,{}),pend=new Set(read(PKEY,[])),pendCambios=new Set(read(CKEY,[])),tiendaLocal=read(TKEY,null),tiendaNube=null;
let supa=null,modo='local',motivo='conectando…',solo=null,canal=null,reintento=0,conectando=null;
const envios=new Map();
let authUser=null,authSession=null,authHook=false,authCambio=0,authPersonal=false;
const subs=new Set();
// Este aparato (esta pestaña) y quién atiende: cada movimiento de un pedido queda con hora, quién y cuánto.
const DEV='d'+Math.random().toString(36).slice(2,9);let quienFn=null;
const bc=('BroadcastChannel' in window)?new BroadcastChannel('aramo-encargos'):null;

function persist(){write(LKEY,store);write(PKEY,[...pend]);write(CKEY,[...pendCambios]);}
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
function authTel(t){const d=String(t||'').replace(/\D/g,'').replace(/^506/,'');return d.length===8?'+506'+d:'';}
function authEmail(e){return String(e||'').trim().toLowerCase();}
// Una cuenta creada con confirmación de correo todavía no tiene sesión. No debe
// desbloquear pedidos ni esconder el formulario hasta que el cliente inicie sesión.
function authEstado(){return{user:authUser,session:authSession,email:authUser?.email||'',verificado:!!authUser&&!!authSession,personal:authPersonal,disponible:!!supa};}
async function refrescarAuth(){
  if(!supa?.auth)return authEstado();
  try{const r=await supa.auth.getSession();authSession=r.data?.session||null;authUser=r.data?.user||null;}catch{}
  authPersonal=false;if(authUser){try{const r=await supa.rpc('aramo_es_personal');authPersonal=r.data===true;}catch{}}
  return authEstado();
}
function validarCorreo(email,password){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail(email)))throw new Error('Escribí un correo válido');
  if(String(password||'').length<8)throw new Error('La contraseña debe tener al menos 8 caracteres');
}
async function aplicarSesion(data){
  authSession=data?.session||null;authUser=data?.user||null;authPersonal=false;
  if(authUser){try{const r=await supa.rpc('aramo_es_personal');authPersonal=r.data===true;}catch{} }
  authCambio++;emit('auth');
  if(authUser){conectando=null;conectar({ids:[]});}
  return authEstado();
}
async function registrarCorreo(email,password,meta={}){
  if(!supa?.auth)throw new Error('La nube todavía no está disponible');
  email=authEmail(email);validarCorreo(email,password);
  const r=await supa.auth.signUp({email,password,options:{data:meta||{}}});
  if(r.error)throw new Error(r.error.message);
  await aplicarSesion(r.data);
  return{...authEstado(),confirmacion:!!r.data?.user&&!r.data?.session};
}
async function entrarCorreo(email,password){
  if(!supa?.auth)throw new Error('La nube todavía no está disponible');
  email=authEmail(email);validarCorreo(email,password);
  const r=await supa.auth.signInWithPassword({email,password});
  if(r.error)throw new Error(r.error.message);
  return aplicarSesion(r.data);
}
async function recuperarCorreo(email){
  if(!supa?.auth)throw new Error('La nube todavía no está disponible');
  email=authEmail(email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Escribí un correo válido');
  const r=await supa.auth.resetPasswordForEmail(email,{redirectTo:location.href.split('#')[0]});
  if(r.error)throw new Error(r.error.message);return true;
}
async function enviarCodigo(tel){
  if(!supa?.auth)throw new Error('La nube todavía no está disponible');
  const phone=authTel(tel);if(!phone)throw new Error('El teléfono debe tener 8 números');
  const r=await supa.auth.signInWithOtp({phone,options:{shouldCreateUser:true}});
  if(r.error)throw new Error(r.error.message);return true;
}
async function verificarCodigo(tel,token){
  if(!supa?.auth)throw new Error('La nube todavía no está disponible');
  const phone=authTel(tel),code=String(token||'').replace(/\D/g,'');
  if(!phone||code.length<4)throw new Error('Escribí el código que recibiste');
  const r=await supa.auth.verifyOtp({phone,token:code,type:'sms'});
  if(r.error)throw new Error(r.error.message);
  authSession=r.data?.session||null;authUser=r.data?.user||null;authCambio++;
  emit('auth');conectando=null;conectar({ids:[]});return authEstado();
}
async function salir(){if(supa?.auth)await supa.auth.signOut();authUser=null;authSession=null;authPersonal=false;emit('auth');}
async function subir(o){
  if(modo!=='nube'||!supa){pend.add(o.id);persist();return false;}
  try{
    const r=await timeout(supa.rpc('aramo_guardar_encargo',{p_data:o}),9000);
    if(r.error)throw new Error(r.error.message);
    pend.delete(o.id);persist();return true;
  }catch(e){pend.add(o.id);persist();console.warn('[nube] no se pudo subir',o.id,e.message||e);return false;}
}
async function subirCambio(o){
  if(modo!=='nube'||!supa){pend.add(o.id);pendCambios.add(o.id);persist();return false;}
  try{
    const r=await timeout(supa.rpc('aramo_cambiar_encargo',{p_id:o.id,p_data:o}),9000);
    if(r.error)throw new Error(r.error.message);
    pend.delete(o.id);pendCambios.delete(o.id);persist();return true;
  }catch(e){pend.add(o.id);pendCambios.add(o.id);persist();console.warn('[nube] no se pudo enviar el cambio',o.id,e.message||e);return false;}
}
async function leerUno(id){
  if(modo!=='nube'||!supa)return null;
  try{
    if(!authUser||!authSession){
      const local=store[id];
      if(!local?.pin||!local?.cliente?.tel)return null;
      const r=await timeout(supa.rpc('aramo_leer_encargo',{p_id:id,p_pin:local.pin,p_phone:local.cliente.tel}),7000);
      return r.data||null;
    }
    if(!authPersonal&&solo&&!solo.has(id))return null;
    const r=await timeout(supa.from(TABLE).select('data').eq('id',id).maybeSingle(),7000);
    return r.data?.data||null;
  }catch{return null;}
}
async function refrescarPedido(id){
  const o=await leerUno(id);
  if(o){take(o);emit('encargo',id);return o;}
  return store[id]||null;
}
function onRealtime(p){
  const row=p.new&&p.new.id?p.new:null;
  if(!row)return;
  if(row.id===TIENDA_ID){tiendaNube=row.data;emit('tienda');return;}
  if(!authUser||!authSession)return;
  if(authUser&&!authPersonal&&row.owner_id&&row.owner_id!==authUser.id)return;
  if(authUser&&!authPersonal&&!row.owner_id)return;
  if(solo&&!solo.has(row.id))return; // un cliente solo sigue sus propios encargos
  take(row.data);
}
// Hora de la nube: si el reloj del teléfono está corrido más de un minuto, el Taller usa la de la
// nube para horarios y hora de retiro (canasta.js: ahora()). Sin aramo_ahora() en la nube, nada cambia.
let desfase=0;
async function medirHora(){
  try{const t0=Date.now(),r=await timeout(supa.rpc('aramo_ahora'),5000),t1=Date.now();
    if(!r.error&&r.data){const d=Date.parse(r.data)-(t0+t1)/2;desfase=Math.abs(d)>60000?d:0;}}catch{}
}
function conectar(opts){
  if(opts&&opts.ids)solo=new Set(opts.ids);
  if(conectando)return conectando;
  conectando=(async()=>{
    try{
      if(!window.supabase?.createClient)throw new Error('sin librería de nube');
      supa=supa||window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'aramo-nube-auth'}});
      if(!authHook){
        authHook=true;
        supa.auth.onAuthStateChange((_event,session)=>{authSession=session||null;authUser=session?.user||null;authCambio++;emit('auth');if(authUser)setTimeout(()=>{conectando=null;conectar({ids:[]});},0);});
      }
      await refrescarAuth();
      emit('auth');
      let q=supa.from(TABLE).select('id,data,owner_id');
      if(solo&&solo.size)q=q.in('id',[...solo,TIENDA_ID]);
      else if(authUser&&authSession&&!authPersonal)q=q.eq('owner_id',authUser.id);
      else if(authUser&&authSession)q=q.neq('id',TIENDA_ID);
      else q=q.eq('id',TIENDA_ID);
      const r=await timeout(q,9000);
      if(r.error)throw new Error(r.error.message);
      modo='nube';motivo='';
      medirHora();
      (r.data||[]).forEach(row=>{if(row.id===TIENDA_ID)tiendaNube=row.data;else take(row.data,true);});
      persist();
      for(const id of [...pend])if(store[id])await (pendCambios.has(id)?subirCambio(store[id]):subir(store[id]));
      if(tiendaLocal&&(!tiendaNube||ts(tiendaLocal)>ts(tiendaNube)))await subirTienda(tiendaLocal);
      if(!canal)canal=supa.channel('encargos-live').on('postgres_changes',{event:'*',schema:'public',table:TABLE},onRealtime).subscribe();
    }catch(e){
      modo='local';
      const m=String(e?.message||e);
      motivo=/permission denied.*aramo_es_personal/i.test(m)?'falta actualizar el permiso de aramo_es_personal (ejecutá la línea indicada en supabase-encargos.sql)':/fetch|network|resolve|no respondió|Failed/i.test(m)?'la nube está en pausa':/relation|does not exist|schema cache|not find/i.test(m)?'falta crear la tabla de encargos':m;
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
// Pedidos en vivo para todos: además del canal en vivo (que el cliente sin cuenta no tiene), cada pocos
// segundos se revisa lo que cambió. El Mostrador lee los últimos pedidos; el cliente, solo los suyos que siguen en curso.
let _sync=0;
async function sincronizar(forzar){
  if(modo!=='nube'||!supa||document.visibilityState!=='visible')return;
  if(!forzar&&Date.now()-_sync<8000)return;
  _sync=Date.now();
  try{
    if(authUser&&authSession&&authPersonal){
      const r=await timeout(supa.from(TABLE).select('id,data').neq('id',TIENDA_ID).order('updated_at',{ascending:false}).limit(80),9000);
      (r.data||[]).forEach(x=>{if(x.data?.id)take(x.data);});
    }else{
      const ids=Object.values(store).filter(o=>!o.borrado&&!['entregado','cancelado'].includes(o.estado)&&(!solo||solo.has(o.id))).slice(0,6).map(o=>o.id);
      for(const id of ids){const o=await leerUno(id);if(o)take(o);}
    }
  }catch{}
}
setInterval(()=>sincronizar(),12000);

// ── Encargos ──
function crear(o){
  const t=now();
  o={...o,fase:o.fase||'enviado',v:1,created:o.created||t,updated:t,log:[...(o.log||[]),{t,s:o.fase||'enviado',by:'cliente',m:'Pedido enviado'}]};
  take(o);avisar(o);
  const envio=subir(o);envios.set(o.id,envio);envio.finally(()=>envios.delete(o.id));
  if(solo)solo.add(o.id);
  return o;
}
async function esperarEnvio(id){const p=envios.get(id);if(p)await p;return modo==='nube'&&!pend.has(id);}
function estadoEnvio(id){return pend.has(id)?'pendiente':'enviado';}
async function cambiar(id,fn,quien,nota){
  const fresco=await leerUno(id);
  if(fresco)take(fresco,true);
  const cur=store[id];
  if(!cur||cur.borrado)return null;
  const o=clone(cur);
  const antes=o.estado;
  fn(o);
  // fn puede dejar o._ev={tipo,monto,metodo,q}: queda en la bitácora con la hora y quién lo hizo.
  const ev=o._ev;delete o._ev;
  o.v=(cur.v||0)+1;o.updated=now();
  if(nota||ev||o.estado!==antes||o.fase!==(cur.fase||'')){
    const l={t:o.updated,s:o.fase||o.estado,by:quien||'tienda',m:nota||'',dev:DEV};
    const q=(ev&&ev.q)||((quien||'tienda')==='tienda'&&quienFn?quienFn():'');
    if(q)l.q=q;
    if(ev)Object.keys(ev).forEach(k=>{if(k!=='q'&&ev[k]!=null&&ev[k]!=='')l[k]=ev[k];});
    (o.log=o.log||[]).push(l);
  }
  take(o);avisar(o);
  const envio=pend.has(id)&&!pendCambios.has(id)?subir(o):subirCambio(o);
  await envio;
  return o;
}
function importar(o){
  if(!o?.id)return false;
  const nuevo=take(o);
  if(nuevo){avisar(o);subirSiSigue(o);}
  if(solo)solo.add(o.id);
  return nuevo;
}

// Un link viejo de WhatsApp no revive un pedido que se borró al reiniciar el Mostrador.
async function subirSiSigue(o){
  const f=await leerUno(o.id);
  if(f&&f.borrado&&!isNewer(o,f)){take(f);return;}
  subir(o);
}
// Reiniciar: borra todos los encargos en este equipo y en la nube (los ajustes de la tienda no se tocan).
// La llave pública no puede borrar filas de la nube: cada una se vacía y queda marcada como borrada,
// con una versión tan alta que ningún equipo atrasado la puede revivir.
// borrarTodo() borra los pedidos de las dos tiendas; borrarTodo('moravia') o ('angeles') solo los de esa tienda (la otra queda igual).
async function borrarTodo(sucursal){
  if(modo==='nube'&&(!authUser||!authPersonal)){console.warn('[nube] reinicio requiere sesion de personal');return 0;}
  const t=now(),viejos={},de=o=>!sucursal||o?.sucursal===sucursal;
  Object.values(store).forEach(o=>{if(de(o))viejos[o.id]=o.v||0;});
  if(modo==='nube'&&supa){
    try{const r=await timeout(supa.from(TABLE).select('id,data').neq('id',TIENDA_ID),15000);(r.data||[]).forEach(x=>{if(de(x.data))viejos[x.id]=Math.max(viejos[x.id]||0,x.data?.v||0);});}catch(e){console.warn('[nube] reinicio sin leer la nube',e.message||e);}
  }
  delete viejos[TIENDA_ID];
  const tumbas=Object.keys(viejos).map(id=>({id,borrado:t,estado:'borrado',v:viejos[id]+1e9,created:t,updated:t}));
  tumbas.forEach(o=>{store[o.id]=o;pend.add(o.id);if(sucursal)pendCambios.add(o.id);avisar(o);});
  persist();emit('encargo');
  if(modo==='nube'&&supa){
    if(authUser&&authPersonal){
      if(sucursal){for(const o of tumbas){try{const r=await timeout(supa.rpc('aramo_cambiar_encargo',{p_id:o.id,p_data:o}),9000);if(r.error)throw new Error(r.error.message);pend.delete(o.id);pendCambios.delete(o.id);}catch(e){console.warn('[nube] reinicio de una tienda: no subió',o.id,e.message||e);}}}
      else{try{const r=await timeout(supa.rpc('aramo_borrar_pedidos'),15000);if(r.error)throw new Error(r.error.message);tumbas.forEach(o=>pend.delete(o.id));}catch(e){console.warn('[nube] reinicio seguro falló',e.message||e);}}
    }
    else console.warn('[nube] reinicio requiere sesión de personal');
    persist();
  }
  return tumbas.length;
}
function restaurar(lista){
  if(modo==='nube'&&!authPersonal){console.warn('[nube] restauracion requiere sesion de personal');return;}
  (lista||[]).forEach(o=>{if(!o?.id)return;const r={...clone(o),v:(o.v||0)+2e9,updated:now(),borrado:false};store[r.id]=r;avisar(r);if(modo==='nube'&&supa&&authUser&&authPersonal)supa.rpc('aramo_cambiar_encargo',{p_id:r.id,p_data:r});else subir(r);});
  persist();emit('encargo');
}

// ── Ajustes de la tienda ──
const ENVIO_DEF={activa:true,zona:'Moravia y alrededores',radioKm:8,tarifaBase:800,tarifaKm:380,uberMinimo:1800,factorCalle:1.35,minimo:0,repartoMin:10000,repartoPct:50,historial:[]};
function tienda(){
  const base=clone(window.ARAMO_CANASTA?.tienda||{});
  const usar=(tiendaLocal&&(!tiendaNube||ts(tiendaLocal)>=ts(tiendaNube)))?tiendaLocal:tiendaNube;
  if(!usar)return base;
  const t={...base,...usar,sinpe:{...base.sinpe,...(usar.sinpe||{})}};
  if(!String(t.sinpe.numero||'').replace(/\D/g,''))t.sinpe.numero=base.sinpe?.numero||''; // sin número guardado, vale el de fábrica
  t.envioConfig={...ENVIO_DEF,...(base.envioConfig||{}),...(usar.envioConfig||{})};
  t.sucursales=(base.sucursales||[]).map(s=>({...s,...((usar.sucursales||[]).find(x=>x.k===s.k)||{})}));
  if(!authPersonal&&modo==='nube')delete t.acceso; // nunca le entregamos al cliente hashes de acceso del Mostrador
  return t;
}
// ── Catálogo único: fábrica + productos nuevos de la tienda + cambios de la tienda ──
// Cambiar aquí precio, unidad o nombre se refleja solo en el Taller, las recetas,
// el Mostrador y la Caja. Los pedidos ya sellados conservan lo que se vendió.
function pasoDe(u){return u==='kg'?.5:1;}
function catalogo(sucursal){
  const t=tienda(),base=window.ARAMO_CANASTA?.productos||[],bs=(t.sucursales||[]).find(s=>s.k===sucursal)||{};
  const ed={...(t.prods||{}),...(bs.prods||{})},precios={...(t.precios||{}),...(bs.precios||{})},ocultos=new Set([...(t.ocultos||[]),...(bs.ocultos||[])]),agot=new Set([...(t.agotados||[]),...(bs.agotados||[])]);
  // Un producto oculto globalmente se puede volver a mostrar solo en una sucursal.
  (bs.visibles||[]).forEach(k=>ocultos.delete(k));
  const vistos=new Set();
  // ARAMO conectado (2026-11-25): además de La Feria de fábrica y lo que agregó la tienda, TODOS los productos
  // de ARAMO (Surtido y el POS de esta tienda) en su pasillo. Si el POS de esta tienda tiene precio, manda el POS.
  const CAT=window.ARAMO_CAT,pos=CAT&&sucursal?CAT.posDe(sucursal):{},conectados=[];
  if(CAT){
    const propios=[...base,...(t.nuevos||[])],ks=new Set(propios.map(p=>p&&p.k)),ids=new Set(propios.map(p=>p&&CAT.idDe(p.n)));
    CAT.todos(sucursal).forEach(x=>{const k=CAT.claveFeria(x.id);if(ks.has(k)||ids.has(x.id))return;conectados.push({k,n:x.n,d:'',e:x.e,c:x.c,u:x.u,s:pasoDe(x.u),p:0,conectado:1});});
  }
  const out=[...base,...(t.nuevos||[]),...conectados].filter(p=>p&&p.k&&!vistos.has(p.k)&&vistos.add(p.k)).map(p=>{
    const e=ed[p.k]||{};let u=e.u||p.u;
    let s=+e.s||(e.u&&e.u!==p.u?pasoDe(u):+p.s)||pasoDe(u),precio=+precios[p.k]||+e.p||+p.p||0;
    const q=pos[p.k],dePos=!!(q&&+q.p>0);
    if(dePos){precio=+q.p;if(q.u==='kg'&&u!=='kg'){u='kg';s=pasoDe('kg');}else if(q.u!=='kg'&&u==='kg'){u='unid';s=1;}}
    return{...p,...e,u,s,p:precio,pos:dePos,agotado:agot.has(p.k),oculto:ocultos.has(p.k),propio:!p.conectado&&!base.some(b=>b.k===p.k)};
  });
  return out.map((p,i)=>({...p,__orden:i})).sort((a,b)=>((+a.orden||999999)-(+b.orden||999999))||a.__orden-b.__orden).map(({__orden,...p})=>p);
}
function recetas(){
  const t=tienda(),fuera=new Set(t.recetasOcultas||[]);
  return [...(window.ARAMO_CANASTA?.recetas||[]),...(t.recetas||[])].filter(r=>r&&!fuera.has(r.k));
}
function waDe(k){const t=tienda(),s=(t.sucursales||[]).find(x=>x.k===k);return s?.whatsapp||t.whatsapp||'';}
// SINPE Móvil de cada local (si un local no tiene el suyo, se usa el de la tienda).
function sinpeDe(k){const t=tienda(),s=(t.sucursales||[]).find(x=>x.k===k);return s?.sinpe?.numero?s.sinpe:(t.sinpe||{});}
// A quién se le hizo el SINPE: la lista (nombre y número) que se arma en Ajustes → Pagos y SINPE. El POS de la tienda la lee.
// Sin lista guardada trae UNA entrada: «ARAMO · 8584-8428» (el SINPE que usa La Feria).
function sinpeDestinosDe(k){
  const t=tienda(),s=(t.sucursales||[]).find(x=>x.k===k)||{};
  const bruta=Array.isArray(s.sinpeDestinos)&&s.sinpeDestinos.length?s.sinpeDestinos:(Array.isArray(t.sinpeDestinos)?t.sinpeDestinos:[]);
  const L=bruta.map(d=>({nombre:String(d?.nombre||'').replace(/\s+/g,' ').trim(),numero:String(d?.numero||'').replace(/\D/g,'')})).filter(d=>d.nombre||d.numero).map(d=>({...d,nombre:d.nombre||'SINPE'}));
  return L.length?L:[{nombre:'ARAMO',numero:String(sinpeDe(k).numero||'').replace(/\D/g,'')||'85848428'}];
}

// ── Envío con Uber: estimado, reparto y aprendizaje del historial ──
// Todo se calcula en el aparato (sin mapas ni servicios externos). La Feria y el Mostrador usan lo mismo.
//   km por calle = km en línea recta × factorCalle
//   Uber aprox.  = máx(uberMinimo, tarifaBase + km por calle × tarifaKm), redondeado hacia arriba a ₡100
//   tarifaKm     = se mezcla con el promedio real de los últimos Ubers anotados (historial): con 5 o más, manda el real
//   Reparto      = pedido < repartoMin → el cliente paga todo el envío; si no, el cliente paga repartoPct % y ARAMO el resto
const envioCfg=()=>tienda().envioConfig;
const esNum=v=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(+v);
function distKm(a,b){
  if(!a||!b||!esNum(a.lat)||!esNum(a.lng)||!esNum(b.lat)||!esNum(b.lng))return null;
  const R=6371,rad=x=>x*Math.PI/180,da=rad(b.lat-a.lat),dl=rad(b.lng-a.lng);
  return 2*R*Math.asin(Math.sqrt(Math.sin(da/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dl/2)**2));
}
// La tienda: sus coordenadas y si son las exactas (guardadas estando ahí) o las aproximadas de fábrica
function ubiSuc(s){
  if(!s||!esNum(s.lat)||!esNum(s.lng))return{lat:null,lng:null,exacta:false};
  const f=(window.ARAMO_CANASTA?.tienda?.sucursales||[]).find(x=>x.k===s.k)||{};
  return{lat:+s.lat,lng:+s.lng,exacta:s.aprox===false||!(esNum(f.lat)&&+f.lat===+s.lat&&+f.lng===+s.lng)};
}
const sube100=x=>Math.ceil(Math.max(0,x)/100-1e-9)*100;
const sube5=x=>Math.ceil(Math.max(0,x)/5-1e-9)*5;
// ₡ por km que ya se aprendió de los Ubers reales (promedio de los últimos 10; con 5 o más, pesa todo)
function tarifaKmAprendida(c=envioCfg()){
  const f=Math.max(1,+c.factorCalle||1),H=(c.historial||[]).filter(h=>+h.km>=.3&&+h.costo>0).slice(-10);
  if(!H.length)return{tk:Math.max(0,+c.tarifaKm||0),n:0,real:null};
  const km=H.reduce((t,h)=>t+h.km*f,0),extra=H.reduce((t,h)=>t+Math.max(0,h.costo-(+c.tarifaBase||0)),0);
  const real=km>0?extra/km:null,w=Math.min(1,H.length/5);
  return{tk:real==null?Math.max(0,+c.tarifaKm||0):Math.max(0,(1-w)*(+c.tarifaKm||0)+w*real),n:H.length,real};
}
// Quién paga cuánto del Uber: pedido chico → todo el cliente; pedido grande → mitad y mitad (o el % que se ponga)
function repartoEnvio(productos,uber,c=envioCfg()){
  uber=Math.max(0,Math.round(+uber||0));
  const min=Math.max(0,+c.repartoMin||0),bajo=(+productos||0)<min;
  const pct=bajo?100:Math.min(100,Math.max(0,+c.repartoPct>=0?+c.repartoPct:50));
  const cliente=Math.min(uber,sube5(uber*pct/100)); // se redondea hacia arriba: ARAMO nunca pone de más
  return{uber,cliente,tienda:uber-cliente,pct,bajo,min};
}
function estimarEnvio(s,u,productos){
  const c=envioCfg(),a=ubiSuc(s),km=a.lat==null?null:distKm(a,u),ap=tarifaKmAprendida(c);
  const fuera=km!=null&&+c.radioKm>0&&km>+c.radioKm,kmCalle=km==null?null:km*Math.max(1,+c.factorCalle||1);
  const crudo=(+c.tarifaBase||0)+(kmCalle||0)*ap.tk;
  const uber=sube100(Math.max(+c.uberMinimo||0,crudo));
  return{km,kmCalle,fuera,aprendidos:ap.n,tarifaKm:ap.tk,exacta:a.exacta,...repartoEnvio(productos,uber,c)};
}
// Total de productos de un pedido (sin envío ni premio), con el peso real si ya se pesó
const productosDe=o=>redondear5((o?.items||[]).reduce((t,it)=>t+qtyItem(it)*(it.pr!=null&&it.pr!==''?+it.pr:+it.p||0),0));
// La tienda anota cuánto costó de verdad el Uber: se recalcula la parte del cliente con la misma regla y se guarda en el historial
async function costoRealUber(id,costo){
  costo=Math.max(0,Math.round(+costo||0));
  const o0=store[id];if(!o0?.retiro?.envio)return null;
  const c=envioCfg(),e0=o0.retiro.envio,s=(tienda().sucursales||[]).find(x=>x.k===o0.sucursal);
  const km=esNum(e0.km)?+e0.km:distKm(ubiSuc(s),e0);
  const r=await cambiar(id,x=>{
    const e=x.retiro.envio,rp=repartoEnvio(productosDe(x),costo,c);
    e.costoUber=costo;e.costo=rp.cliente;e.tienda=rp.tienda;e.pct=rp.pct;e.estimado=false;
    if(km!=null&&!esNum(e.km))e.km=+km.toFixed(2);
  },'tienda','Uber real: ₡'+costo);
  if(costo>0&&km!=null&&km>=.3){
    const hist=(c.historial||[]).filter(h=>h.id!==id);
    hist.push({id,km:+(+km).toFixed(2),costo,t:now(),s:o0.sucursal});
    await guardarTienda({envioConfig:{...(tienda().envioConfig||{}),historial:hist.slice(-30)}});
  }
  return r;
}

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
  async push(){
    try{
      const key=tienda().pushPublicKey;if(!key||!authUser||!supa||!navigator.serviceWorker||!window.PushManager)return false;
      const reg=await navigator.serviceWorker.ready;const raw=key.replace(/-/g,'+').replace(/_/g,'/'),b=atob(raw+'='.repeat((4-raw.length%4)%4));const appKey=Uint8Array.from([...b].map(c=>c.charCodeAt(0)));
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:appKey});
      const r=await supa.from('aramo_push_subscriptions').upsert({user_id:authUser.id,subscription:sub.toJSON(),updated_at:now()},{onConflict:'user_id,subscription'});return !r.error;
    }catch{return false;}
  },
  insignia(n){try{window.aramoPOS?.contador?.(n||0);if(navigator.setAppBadge){n?navigator.setAppBadge(n):navigator.clearAppBadge();}}catch{}},
};

async function subirTienda(d){
  if(modo!=='nube'||!supa||!authUser||!authPersonal)return false;
  try{
    const r=authUser?await timeout(supa.rpc('aramo_guardar_tienda',{p_data:d}),9000):await timeout(supa.from(TABLE).upsert({id:TIENDA_ID,data:d,estado:'tienda',updated_at:d.updated},{onConflict:'id'}),9000);
    if(r.error)throw new Error(r.error.message);tiendaNube=d;return true;
  }
  catch(e){console.warn('[nube] ajustes sin subir',e.message||e);return false;}
}
function guardarTienda(cambios){
  const d={...tienda(),...cambios,updated:now()};
  tiendaLocal=d;
  // Lista completa de precios de cada tienda: la nube cobra con estos precios y no con los
  // que mande el teléfono del cliente (supabase-taller-validaciones.sql).
  try{d.listas=Object.fromEntries((d.sucursales||[]).map(s=>[s.k,Object.fromEntries(catalogo(s.k).map(p=>[p.k,+p.p||0]))]));}catch{}
  write(TKEY,d);
  try{bc&&bc.postMessage({t:'tienda',d});}catch{}
  emit('tienda');
  return subirTienda(d);
}

// ── Cobros del Mostrador → ARAMO POS (tabla aramo_pos_pendientes) ──
// Cada cobro es una fila (id = pedido|fecha del cobro, así nunca se repite). La caja activa del POS de esa tienda la registra como
// una venta más y marca registrado_at y venta. Si el Mostrador y el POS están en el mismo navegador, además va al instante
// por localStorage (aramo_pos_pend_<tienda>). Sin internet se queda en una cola (aramo_pos_nube) y se reintenta.
const PPKEY='aramo_pos_pend_',PNKEY='aramo_pos_nube';
const posRest=(q,opc={})=>fetch(SUPA_URL+'/rest/v1/aramo_pos_pendientes'+q,{...opc,headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json',...(opc.headers||{})},signal:AbortSignal.timeout?AbortSignal.timeout(10000):undefined});
let _posVaciando=false;
async function posVaciar(){
  if(_posVaciando)return false;_posVaciando=true;
  try{
    for(const f of read(PNKEY,[])){
      try{
        const r=await posRest('?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({id:f.id,tienda:f.tienda,datos:f.datos})});
        if(!r.ok&&r.status!==409)throw new Error('nube '+r.status);
      }catch(e){break;}   // sin internet o sin la tabla: se reintenta más tarde
      write(PNKEY,read(PNKEY,[]).filter(x=>x.id!==f.id));
    }
  }finally{_posVaciando=false;}
  return read(PNKEY,[]).length===0;
}
function posEnviar(fila){
  const f={id:String(fila.id),tienda:fila.tienda,datos:fila.datos,creado:now()};
  const L=read(PPKEY+f.tienda,[]).filter(x=>x.id!==f.id);L.push(f);write(PPKEY+f.tienda,L.slice(-50));
  const Q=read(PNKEY,[]).filter(x=>x.id!==f.id);Q.push(f);write(PNKEY,Q.slice(-100));
  return posVaciar();
}
// Lo que el POS ya registró de esta tienda: [{id,venta,registrado_at}] (null si no hay internet o no existe la tabla)
async function posRegistradas(tienda){
  try{
    const r=await posRest('?tienda=eq.'+encodeURIComponent(tienda)+'&registrado_at=not.is.null&select=id,venta,registrado_at&order=registrado_at.desc&limit=60');
    if(!r.ok)return null;const a=await r.json();return Array.isArray(a)?a:null;
  }catch(e){return null;}
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
// 5 letras: 7,9 millones de números posibles (con 4 se repetían a los ~680 pedidos). La nube igual revisa que no se repita.
function nuevoRef(){return 'A-'+rnd(5).map(x=>ALFA[x%ALFA.length]).join('');}
function nuevoPin(){return rnd(4).map(x=>x%10).join('');}
function colones(n){return '₡'+Math.round(+n||0).toLocaleString('es-CR').replace(/[\s  ,]/g,'.');}
function redondear5(n){return Math.round((+n||0)/5)*5;}
function qtyItem(it){return it.estado==='nohay'?0:(it.qr!=null&&it.qr!==''?+it.qr:+it.q||0);}
// El premio canjeado con hojas 🍃 se descuenta del total (nunca baja de cero).
function totalDe(o){return redondear5(Math.max(0,(o?.items||[]).reduce((t,it)=>t+qtyItem(it)*(it.pr!=null&&it.pr!==''?+it.pr:+it.p||0),0)+(+o?.retiro?.envio?.costo||0)-(+o?.premio?.valor||0)));}
function esAprox(o){return !['listo','entregado'].includes(o?.estado)&&(o?.items||[]).some(it=>it.u==='kg'&&it.qr==null);}
function telCR(t){const d=String(t||'').replace(/\D/g,'');return d.length===8?'506'+d:d;}
function wa(tel,texto){const n=telCR(tel);return 'https://wa.me/'+(n||'')+'?text='+encodeURIComponent(texto);}

// ── Lealtad: hojas 🍃 ──
// Cada pedido entregado da 1 hoja por cada ₡ "porHoja" pagados (×2 si se hizo con "hojas dobles").
// Las hojas se canjean por premios (descuento en el próximo pedido). El nivel sube con las hojas ganadas.
const NIVELES=[
  {k:'semilla',n:'Semilla',e:'🌱',desde:0},
  {k:'brote',n:'Brote',e:'🌿',desde:25},
  {k:'arbol',n:'Árbol',e:'🌳',desde:100},
  {k:'cosecha',n:'Cosecha',e:'🧺',desde:250},
];
const LEALTAD_BASE={activa:true,porHoja:1000,dobles:false,premios:[
  {k:'p1',n:'₡2.500 de descuento',hojas:50,valor:2500},
  {k:'p2',n:'₡6.000 de descuento',hojas:100,valor:6000},
]};
function lealtad(){const l=tienda().lealtad||{};return{...LEALTAD_BASE,...l,porHoja:Math.max(1,+l.porHoja||LEALTAD_BASE.porHoja),premios:(Array.isArray(l.premios)?l.premios:LEALTAD_BASE.premios).filter(p=>p&&+p.hojas>0&&+p.valor>0)};}
function hojasDe(o,L=lealtad()){return L.activa?Math.floor(totalDe(o)/L.porHoja)*(+o?.hojasX||1):0;}
const telDe=o=>String(o?.cliente?.tel||'').replace(/\D/g,'').replace(/^506/,'');
// Cuenta de un cliente a partir de sus pedidos: hojas, nivel, consumo y lo que más lleva.
function cuentaCliente(pedidos){
  const L=lealtad();let ganadas=0,usadas=0,pendientes=0,gastado=0,ahorro=0,entregados=0,kilos=0;const prods={},meses={};let desde=null,ultima=null;
  (pedidos||[]).forEach(o=>{
    if(!o||o.borrado||o.estado==='cancelado')return;
    if(o.premio?.hojas){usadas+=+o.premio.hojas;ahorro+=+o.premio.valor||0;}
    const h=hojasDe(o,L);
    if(!desde||Date.parse(o.created)<Date.parse(desde))desde=o.created;
    if(!ultima||Date.parse(o.created)>Date.parse(ultima))ultima=o.created;
    if(o.estado!=='entregado'){pendientes+=h;return;}
    ganadas+=h;entregados++;const tot=totalDe(o);gastado+=tot;
    const m=String(o.entregado||o.updated||o.created).slice(0,7);meses[m]=(meses[m]||0)+tot;
    (o.items||[]).forEach(i=>{if(i.estado==='nohay')return;const q=qtyItem(i);if(i.u==='kg')kilos+=q;const x=prods[i.k]||(prods[i.k]={k:i.k,n:i.n,e:i.e,veces:0});x.veces++;});
  });
  const nivel=[...NIVELES].reverse().find(n=>ganadas>=n.desde)||NIVELES[0],sig=NIVELES[NIVELES.indexOf(nivel)+1]||null;
  return{ganadas,usadas,saldo:Math.max(0,ganadas-usadas),pendientes,gastado,ahorro,pedidos:entregados,kilos,desde,ultima,meses,
    top:Object.values(prods).sort((a,b)=>b.veces-a.veces).slice(0,5),nivel,sig,falta:sig?Math.max(0,sig.desde-ganadas):0,
    avance:sig?Math.min(1,(ganadas-nivel.desde)/(sig.desde-nivel.desde)):1};
}
// Todo el historial de pedidos (para la vista de Clientes): la nube completa, por tandas, más lo de este equipo.
async function historial(){
  if(modo==='nube'&&(!authUser||!authPersonal))return[];
  const m=new Map();
  if(modo==='nube'&&supa){
    for(let desde=0;desde<50000;desde+=1000){
      const r=await timeout(supa.from(TABLE).select('id,data').neq('id',TIENDA_ID).range(desde,desde+999),15000);
      if(r.error)throw new Error(r.error.message);
      (r.data||[]).forEach(x=>{if(x.data?.id)m.set(x.data.id,x.data);});
      if(!r.data||r.data.length<1000)break;
    }
  }
  Object.values(store).forEach(o=>{const c=m.get(o.id);if(!c||(o.v||0)>(c.v||0))m.set(o.id,o);});
  return [...m.values()].filter(o=>o&&!o.borrado&&o.cliente);
}

async function direcciones(){
  if(!supa||!authUser)return[];
  try{const r=await timeout(supa.from('aramo_direcciones').select('*').order('updated_at',{ascending:false}),7000);if(r.error)throw r.error;return r.data||[];}catch{return[];}
}
async function guardarDireccion(d){
  if(!supa||!authUser)return null;
  const r=await timeout(supa.rpc('aramo_guardar_direccion',{p_id:d.id||null,p_nombre:d.nombre,p_lat:d.lat,p_lng:d.lng,p_senas:d.senas||''}),7000);
  if(r.error)throw new Error(r.error.message);return r.data;
}
async function borrarDireccion(id){if(!supa||!authUser)return false;const r=await timeout(supa.from('aramo_direcciones').delete().eq('id',id),7000);if(r.error)throw new Error(r.error.message);return true;}
async function registrarEvento(tipo,data={},anonId=''){
  if(!supa)return false;
  try{const r=await timeout(supa.rpc('aramo_registrar_evento',{p_tipo:tipo,p_data:data,p_anon_id:anonId||localStorage.getItem('aramo_anon_id')||''}),5000);return !r.error;}catch{return false;}
}
async function metricas(){
  if(!supa||!authUser||!authPersonal)return[];
  try{const r=await timeout(supa.from('aramo_eventos').select('tipo,data,created_at').order('created_at',{ascending:false}).limit(500),8000);if(r.error)throw r.error;return r.data||[];}catch{return[];}
}
async function guardarSuscripcion(d){
  if(!supa||!authUser)throw new Error('Verificá tu cuenta primero');
  const r=await timeout(supa.rpc('aramo_guardar_suscripcion',{p_id:d.id||null,p_data:d}),7000);if(r.error)throw new Error(r.error.message);return r.data;
}
async function cupoHorario(sucursal,at,limite){
  if(!supa||!limite)return true;
  try{const r=await timeout(supa.rpc('aramo_cupo_horario',{p_sucursal:sucursal,p_at:new Date(at).toISOString(),p_limite:+limite}),6000);return r.error?true:r.data!==false;}catch{return true;}
}
// Foto del comprobante SINPE en chiquito (cabe dentro del pedido) para que la tienda la vea de una vez.
function reducirImagen(file,max=900){
  return new Promise(res=>{
    if(!/^image\//i.test(file?.type||'')){res(null);return;}
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{
      try{
        const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        let d=c.toDataURL('image/jpeg',.72);if(d.length>150000)d=c.toDataURL('image/jpeg',.5);
        res(d.length<=200000?d:null);
      }catch{res(null);}
      URL.revokeObjectURL(url);
    };
    im.onerror=()=>{URL.revokeObjectURL(url);res(null);};
    im.src=url;
  });
}
// "📷 Subir el SINPE": guarda la foto en el pedido (y, con cuenta, también el original en la nube) y avisa que ya pagó.
async function enviarComprobante(file,o){
  if(!file)throw new Error('Elegí la foto del comprobante');
  if(file.size>8*1024*1024)throw new Error('La foto pesa mucho (máximo 8 MB)');
  const img=await reducirImagen(file);
  let path=null;
  if(modo==='nube'&&supa&&authUser&&authSession&&/^image\/(jpeg|png|webp|heic|heif)$|^application\/pdf$/i.test(file.type||'')&&file.size<=5*1024*1024){
    try{
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
      path=authUser.id+'/'+o.id+'-'+Date.now()+'.'+ext;
      const up=await timeout(supa.storage.from('aramo-comprobantes').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'}),12000);
      if(up.error)throw new Error(up.error.message);
    }catch(e){path=null;if(!img)throw e;}
  }
  if(!img&&!path)throw new Error('Subí una foto JPG o PNG del comprobante');
  const d={nombre:String(file.name||'comprobante').slice(0,80),subido:now(),...(path?{path}:{}),...(img?{img}:{})};
  await cambiar(o.id,x=>{
    x.comprobante=d;
    if(x.pago&&x.pago.estado!=='verificado'){x.pago.estado='reportado';x.pago.reportado=now();}
    x._ev={tipo:'sinpe-reportado',monto:totalDe(x),metodo:'SINPE'};
  },'cliente','Subió el comprobante del SINPE');
  return d;
}
async function subirComprobante(file,o){
  if(!supa||!authUser)throw new Error('Verificá tu cuenta primero');
  if(!file||file.size>5*1024*1024)throw new Error('El comprobante debe pesar menos de 5 MB');
  if(!/^image\/(jpeg|png|webp|heic|heif)$|^application\/pdf$/i.test(file.type||''))throw new Error('Subí una imagen o un PDF del comprobante');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=authUser.id+'/'+o.id+'-'+Date.now()+'.'+ext;
  const up=await timeout(supa.storage.from('aramo-comprobantes').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'}),12000);
  if(up.error)throw new Error(up.error.message);
  const d={path,nombre:file.name,subido:now()};
  await cambiar(o.id,x=>{x.comprobante=d;},'cliente','Comprobante SINPE subido');
  return d;
}
async function comprobanteUrl(path){
  if(!supa||!authUser||!path)return null;
  try{const r=await supa.storage.from('aramo-comprobantes').createSignedUrl(path,3600);return r.data?.signedUrl||null;}catch{return null;}
}
async function subirFoto(file,k){
  if(!file||file.size>5*1024*1024)throw new Error('La foto debe pesar menos de 5 MB');
  if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type||''))throw new Error('Subí una foto JPG, PNG o WebP');
  if(modo==='local'){
    if(file.size>900*1024)throw new Error('En modo local la foto debe pesar menos de 900 KB');
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('No se pudo leer la foto'));r.readAsDataURL(file);});
    const t=tienda(),prods={...(t.prods||{})};prods[k]={...(prods[k]||{}),foto:data};guardarTienda({prods});return data;
  }
  if(!supa||!authUser||!authPersonal)throw new Error('Iniciá sesión de personal primero');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path='productos/'+String(k||'producto').replace(/[^a-z0-9_-]/gi,'')+'-'+Date.now()+'.'+ext;
  const up=await timeout(supa.storage.from('aramo-productos').upload(path,file,{upsert:false,contentType:file.type}),12000);
  if(up.error)throw new Error(up.error.message);
  const url=supa.storage.from('aramo-productos').getPublicUrl(path).data?.publicUrl;
  if(!url)throw new Error('No se pudo obtener la URL de la foto');
  const t=tienda(),prods={...(t.prods||{})};prods[k]={...(prods[k]||{}),foto:url};
  const guardada=await guardarTienda({prods});
  if(modo==='nube'&&!guardada)throw new Error('La foto subió, pero no se guardó en la ficha');
  return url;
}

const ESTADOS=[
  {k:'nuevo',n:'Pendiente de aceptación',e:'📥',txt:'La tienda recibió tu pedido y debe aceptarlo.'},
  {k:'alistando',n:'Alistando',e:'🧑‍🌾',txt:'Están escogiendo tus productos uno por uno.'},
  {k:'listo',n:'Listo',e:'✅',txt:'Tu canasta está lista para recoger.'},
  {k:'entregado',n:'Entregado',e:'🛍️',txt:'¡Gracias por comprar en ARAMO!'},
];
const FASES=[
  {k:'enviado',n:'Enviado',e:'📤',txt:'El pedido quedó enviado y visible para la tienda.'},
  {k:'recibido',n:'Recibido por la tienda',e:'📥',txt:'La tienda lo recibió y está pesando y revisando los productos.'},
  {k:'confirmacion',n:'Confirmación',e:'🧾',txt:'La tienda preparó la cotización final y espera tu confirmación.'},
  {k:'alistando',n:'Alistando',e:'🧑‍🌾',txt:'La tienda está terminando de armar tu pedido.'},
  {k:'entregado',n:'Entregado',e:'🛍️',txt:'¡Gracias por comprar en ARAMO!'},
];
// La línea de pasos que ve el cliente son 4: Enviado → Recibido → Alistando → Entregado.
// La confirmación de la cotización ya no es un paso: es un aviso dentro de Alistando.
const PASOS4=[
  {k:'enviado',n:'Enviado',e:'📤'},
  {k:'recibido',n:'Recibido por la tienda',e:'📥'},
  {k:'alistando',n:'Alistando',e:'🧑‍🌾'},
  {k:'entregado',n:'Entregado',e:'🛍️'},
];
function paso4De(o){const f=faseDe(o);return f==='confirmacion'?'alistando':f;}
// El total es "definitivo" solo cuando el cliente confirmó la cotización de la tienda (o ya se cobró / entregó).
function definitivo(o){return !!(o?.confirmacion?.at||o?.cobro||o?.estado==='entregado');}
// Qué cambió respecto a lo que pidió el cliente (cantidades, no hay, precios)
const q0De=it=>it.q0!=null?+it.q0:+it.q||0;
const p0De=it=>it.p0!=null?+it.p0:+it.p||0;
function cambiosDe(o){
  const out=[];
  (o?.items||[]).forEach(it=>{
    const a=q0De(it),b=qtyItem(it),pa=p0De(it),pb=it.pr!=null&&it.pr!==''?+it.pr:+it.p||0,nohay=it.estado==='nohay';
    if(nohay||Math.abs(a-b)>1e-9||Math.abs(pa-pb)>.5)out.push({k:it.k,n:it.n,e:it.e,u:it.u,antes:a,ahora:b,pAntes:pa,pAhora:pb,nohay,pide:it.pide||null});
  });
  return out;
}
function totalAntesDe(o){return redondear5(Math.max(0,(o?.items||[]).reduce((t,it)=>t+q0De(it)*p0De(it),0)+(+o?.retiro?.envio?.costo||0)-(+o?.premio?.valor||0)));}
function faseDe(o){
  if(o?.estado==='entregado')return 'entregado';
  const f=String(o?.fase||'');
  if(FASES.some(x=>x.k===f))return f;
  if(o?.estado==='nuevo')return 'enviado';
  if(o?.estado==='alistando')return 'recibido';
  if(o?.estado==='listo')return 'alistando';
  if(o?.estado==='entregado')return 'entregado';
  return 'enviado';
}
const PAGOS={
  sinpe:{n:'SINPE Móvil',e:'📲',txt:'Pagás con el total exacto cuando esté lista.'},
  tarjeta:{n:'Tarjeta al recoger',e:'💳',txt:'Pagás con datáfono en la tienda.'},
  efectivo:{n:'Efectivo al recoger',e:'💵',txt:'Pagás en caja cuando llegás.'},
  link:{n:'Tarjeta en línea',e:'🔗',txt:'Te llega el link de pago con el total exacto.'},
};

// La lista única de productos (catalogo-aramo.js): cuando llega lo nuevo de Surtido o del POS, se vuelve a pintar
try{if(window.ARAMO_CAT){window.addEventListener('aramo-catalogo',()=>emit('tienda'));const cargarCat=()=>window.ARAMO_CAT.cargar().catch(()=>{});setTimeout(cargarCat,300);setInterval(cargarCat,10*60e3);document.addEventListener('visibilitychange',()=>{if(!document.hidden)cargarCat();});}}catch(e){}
window.AramoNube={
  conectar,crear,cambiar,importar,borrarTodo,restaurar,
  get desfase(){return desfase;},
  lista:()=>Object.values(store).filter(o=>!o.borrado).sort((a,b)=>Date.parse(b.created||0)-Date.parse(a.created||0)),
  get:id=>store[id]&&!store[id].borrado?store[id]:null,
  modo:()=>modo,motivo:()=>motivo,pendientes:()=>pend.size,estadoEnvio,esperarEnvio,refrescarPedido,
  on:f=>{subs.add(f);return()=>subs.delete(f);},
  tienda,guardarTienda,catalogo,recetas,waDe,sinpeDe,sinpeDestinosDe,posEnviar,posVaciar,posRegistradas,avisos,
  pack,unpack,enlace,
  envioCfg,estimarEnvio,repartoEnvio,costoRealUber,productosDe,ubiSuc,tarifaKmAprendida,distKm,
  nuevoId,nuevoRef,nuevoPin,colones,redondear5,qtyItem,totalDe,esAprox,telCR,wa,
  ESTADOS,FASES,faseDe,PAGOS,NIVELES,lealtad,hojasDe,cuentaCliente,historial,telDe,
  FASES4:PASOS4,paso4De,definitivo,cambiosDe,totalAntesDe,sincronizar,enviarComprobante,DEV,setQuien:f=>{quienFn=f;},
  authEstado,actualizarCuenta:refrescarAuth,registrarCorreo,entrarCorreo,recuperarCorreo,enviarCodigo,verificarCodigo,salir,direcciones,guardarDireccion,borrarDireccion,
  registrarEvento,metricas,guardarSuscripcion,cupoHorario,subirComprobante,comprobanteUrl,subirFoto,
};
})();
