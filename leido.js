/* ════════════════════════════════════════════════════════════════════════
   ARAMO · "Leído" de los proveedores
   Al enviar un pedido por WhatsApp se agrega al final un enlace
   (ver-pedido.html?t=<código>). La foto de lo enviado se guarda en la nube con ese
   código; cuando el proveedor abre el enlace queda marcada la hora y acá se avisa.

   Necesita en la nube las funciones de proveedores-leido.sql (pedido_enlace_crear,
   pedido_enlace_ver y pedido_enlace_estado). Si todavía no están, no pasa nada raro:
   el WhatsApp sale como siempre, sin enlace, y la mitad "Leído" no se activa.

   Lo usan APP.html (sendWA, Config) y express.js (los dos botones de cada proveedor).
   El código de cada envío vive en las notas del pedido del proveedor (__link_<tienda>)
   para que todos los teléfonos lo vean. El interruptor de Config es por teléfono.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const NUBE='https://gtzkrdefkcbrjzwoehth.supabase.co';
const LLAVE='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';
const PAGINA='https://jorora981605.github.io/aramo-supply/ver-pedido.html';
const K_ACTIVO='aramo_leido_enlace',K_OK='aramo_leido_ok',K_PEND='aramo_leido_pend',K_CACHE='aramo_leido_cache',K_AVISADOS='aramo_leido_avisados',K_PERMISO='aramo_leido_permiso';
const LADOS=['moravia','angeles'];
const NOMBRE_LADO={moravia:'Moravia',angeles:'Los Ángeles'};

const leer=(k,def)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?def:v;}catch{return def;}};
const guardar=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const hora=ms=>new Date(ms).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});

// ── Interruptor de Config ──
function activo(){try{return localStorage.getItem(K_ACTIVO)!=='0';}catch{return true;}}
function ponerActivo(v){try{localStorage.setItem(K_ACTIVO,v?'1':'0');}catch{}}

// ── ¿Está instalado el SQL en la nube? (true / false / null = todavía no se sabe) ──
let ok=null,cache=leer(K_CACHE,{}),avisados=leer(K_AVISADOS,{}),sondeando=null;
(function(){
  const g=leer(K_OK,null),edad=g?Date.now()-g.t:Infinity;
  if(g&&g.ok===true&&edad<7*864e5)ok=true;
  else if(g&&g.ok===false&&edad<5*60e3)ok=false;
})();
function marcarOk(v){ok=v;guardar(K_OK,{ok:v,t:Date.now()});pintarConfig();}

async function rpc(fn,args){
  const ctl=typeof AbortController==='function'?new AbortController():null;
  const t=ctl?setTimeout(()=>ctl.abort(),9000):0;
  try{
    const r=await fetch(NUBE+'/rest/v1/rpc/'+fn,{method:'POST',signal:ctl?.signal,headers:{apikey:LLAVE,Authorization:'Bearer '+LLAVE,'Content-Type':'application/json'},body:JSON.stringify(args)});
    let cuerpo=null;try{cuerpo=await r.json();}catch{}
    return{ok:r.ok,status:r.status,cuerpo};
  }finally{clearTimeout(t);}
}
// La función "estado" con una lista vacía solo comprueba que el SQL esté pegado.
function sondear(){
  if(sondeando)return sondeando;
  sondeando=(async()=>{
    try{
      const r=await rpc('pedido_enlace_estado',{p_codigos:[]});
      if(r.ok)marcarOk(true);
      else if(r.status===404||r.cuerpo?.code==='PGRST202'||r.cuerpo?.code==='42883')marcarOk(false);
    }catch{/* sin internet: se vuelve a intentar más tarde */}
    finally{sondeando=null;}
    return ok;
  })();
  return sondeando;
}
function puedeEnlazar(){return activo()&&ok===true;}

// ── Foto de lo que se envía (lo mismo que dice el mensaje de WhatsApp) ──
function foto(prov,lados){
  const p=S.pedidos?.[prov];if(!p)return null;
  const prods=getAllProviders()[prov]?.products||[];
  const tiendas=lados.map(side=>{
    const lineas=[];
    prods.forEach(pr=>{
      const v=p.qtys?.[side]?.[pr.id];
      if(+v?.qty>0){const nota=String(getProductNote(p,pr.id,side)||'').trim();lineas.push({n:pr.name,q:+v.qty,u:v.unit||pr.unit||'',...(nota?{nota}:{})});}
    });
    (p.extras?.[side]||[]).forEach(e=>{if(String(e.name||'').trim()&&+e.qty>0)lineas.push({n:String(e.name).trim(),q:+e.qty,u:e.unit||'kg'});});
    return{k:side,n:'ARAMO '+NOMBRE_LADO[side],num:side==='moravia'?1:2,lineas,nota:String(getBranchNote(p,side)||'').trim()};
  }).filter(t=>t.lineas.length||t.nota);
  return tiendas.length?{v:1,prov,at:Date.now(),tiendas}:null;
}
function uuid(){
  if(crypto.randomUUID)return crypto.randomUUID();
  const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

// ── Al enviar: crea el código y guarda la foto (si no hay internet, queda pendiente) ──
// Devuelve {c,url,at} o null (interruptor apagado, SQL sin pegar o pedido vacío).
function preparar(prov,side='both'){
  try{
    if(!puedeEnlazar())return null;
    const lados=side==='both'?LADOS:[side];
    const datos=foto(prov,lados);if(!datos)return null;
    const c=uuid();
    const pend=leer(K_PEND,[]);pend.push({c,prov,datos,t:Date.now()});guardar(K_PEND,pend.slice(-40));
    enviarPendientes();
    return{c,url:PAGINA+'?t='+c,at:datos.at};
  }catch(e){console.warn('[leido] no se pudo preparar el enlace',e);return null;}
}
let subiendo=false;
async function enviarPendientes(){
  if(subiendo)return;subiendo=true;
  try{
    let pend=leer(K_PEND,[]);
    for(const it of pend.slice()){
      if(Date.now()-it.t>3*864e5){pend=pend.filter(x=>x.c!==it.c);continue;}
      try{
        const r=await rpc('pedido_enlace_crear',{p_codigo:it.c,p_proveedor:it.prov,p_datos:it.datos});
        if(r.ok)pend=pend.filter(x=>x.c!==it.c);
        else if(r.status>=400&&r.status<500)pend=pend.filter(x=>x.c!==it.c);   // la nube lo rechazó: no insistir
      }catch{break;}
    }
    guardar(K_PEND,pend);
  }finally{subiendo=false;}
}

// ── Qué se ve en los dos botones de cada proveedor ──
// Un grupo = las tiendas que se enviaron juntas (mismo código). Si no hubo enlace, se agrupan por hora.
function grupos(prov){
  const p=S.pedidos?.[prov];if(!p)return[];
  const fl=typeof sentFlags==='function'?sentFlags(p):{};
  const mapa=new Map();
  LADOS.forEach(side=>{
    const at=+p.notes?.['__sentAt_'+side]||0;if(!at||!fl[side])return;
    const L=p.notes?.['__link_'+side],c=L&&L.c&&+L.at===at?String(L.c):'';
    const k=c||('s'+at),g=mapa.get(k)||{sides:[],at,c,est:null};
    g.sides.push(side);mapa.set(k,g);
  });
  const lista=[...mapa.values()].sort((a,b)=>(a.sides[0]==='moravia'?0:1)-(b.sides[0]==='moravia'?0:1));
  lista.forEach(g=>{const e=g.c?cache[g.c]:null;g.est=e&&e.l?{l:e.l,n:e.n||1}:null;});
  return lista;
}
function codigosActivos(){
  const out=new Map();
  Object.entries(S.pedidos||{}).forEach(([prov,p])=>LADOS.forEach(side=>{const L=p?.notes?.['__link_'+side];if(L&&L.c)out.set(String(L.c),prov);}));
  return out;
}

// ── Preguntar a la nube cuáles ya se leyeron, y avisar ──
let revisando=null;
function tick(){
  if(revisando)return revisando;
  revisando=(async()=>{
    try{
      if(ok!==true)await sondear();
      if(ok!==true)return;
      await enviarPendientes();
      const cods=codigosActivos();if(!cods.size)return;
      const r=await rpc('pedido_enlace_estado',{p_codigos:[...cods.keys()].slice(-100)});
      if(!r.ok||!r.cuerpo||typeof r.cuerpo!=='object')return;
      let cambio=false;
      Object.entries(r.cuerpo).forEach(([c,e])=>{
        const antes=cache[c];
        if(!antes||antes.l!==e.l||antes.n!==e.n){cache[c]={l:e.l||0,n:e.n||0};cambio=true;}
        if(e.l&&!avisados[c]){
          avisados[c]=Date.now();cambio=true;
          if(Date.now()-e.l<6*3600e3)avisar(cods.get(c)||'El proveedor',e.l);   // lo viejo no se vuelve a anunciar
        }
      });
      if(cambio){
        const vivos=new Set(cods.keys());
        Object.keys(cache).forEach(c=>{if(!vivos.has(c))delete cache[c];});
        guardar(K_CACHE,cache);guardar(K_AVISADOS,Object.fromEntries(Object.entries(avisados).slice(-200)));
        window.xpRefresh?.();
      }
    }catch(e){/* sin internet o nube lenta: se intenta en la próxima vuelta */}
    finally{revisando=null;}
  })();
  return revisando;
}
function avisar(prov,at){
  const txt=`📖 ${prov} abrió el pedido (${hora(at)})`;
  try{window.toast?.(txt,'ok');}catch{}
  try{
    if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const op={body:txt,icon:'icon.png',badge:'icon.png',tag:'aramo-leido-'+prov};
    const plano=()=>{try{new Notification('ARAMO',op);}catch{}};
    // En el teléfono las notificaciones salen por el service worker; si no hay, la normal.
    if(navigator.serviceWorker?.getRegistration)navigator.serviceWorker.getRegistration().then(r=>r?r.showNotification('ARAMO',op):plano()).catch(plano);
    else plano();
  }catch{}
}
function pedirPermiso(){
  try{
    if(typeof Notification==='undefined'||Notification.permission!=='default')return;
    if(leer(K_PERMISO,0)>2)return;guardar(K_PERMISO,leer(K_PERMISO,0)+1);
    Notification.requestPermission();
  }catch{}
}

// ── Toque en la mitad "Leído" ──
async function tocar(prov){
  pedirPermiso();
  const g=grupos(prov);
  if(!g.length){window.toast?.('Primero enviá el pedido a '+prov,'');return;}
  if(!g.some(x=>x.c)){window.toast?.(activo()?'Este envío salió sin enlace de lectura':'El enlace de lectura está apagado en Config','');return;}
  window.toast?.('Revisando si '+prov+' ya lo abrió…','');
  await tick();
  const h=grupos(prov).filter(x=>x.est);
  if(h.length)window.toast?.(`📖 ${prov} abrió el pedido (${hora(Math.min(...h.map(x=>x.est.l)))})`,'ok');
  else window.toast?.(`${prov} todavía no abrió el pedido`,'');
}

// ── Interruptor en Config ──
function pintarConfig(){
  const sw=document.getElementById('leidoSwitch'),tx=document.getElementById('leidoEstado');
  if(sw)sw.checked=activo();
  if(!tx)return;
  tx.className='leido-estado '+(!activo()?'off':ok===true?'ok':ok===false?'falta':'');
  tx.textContent=!activo()?'Apagado: los pedidos salen sin enlace.'
    :ok===true?'Listo: los pedidos salen con enlace y te aviso cuando los abran.'
    :ok===false?'Todavía falta activarlo en la nube. Mientras tanto los pedidos salen sin enlace, como siempre.'
    :'Comprobando la conexión…';
}
function iniciar(){
  const sw=document.getElementById('leidoSwitch');
  if(sw&&!sw.dataset.listo){
    sw.dataset.listo='1';
    sw.addEventListener('change',()=>{ponerActivo(sw.checked);if(sw.checked){pedirPermiso();sondear().then(()=>tick());}pintarConfig();window.xpRefresh?.();});
  }
  pintarConfig();
  if(ok!==true)sondear();
  setTimeout(tick,4000);setTimeout(tick,14000);
  setInterval(()=>{if(document.visibilityState==='visible')tick();},60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick();});
  addEventListener('online',()=>tick());
}
window.AramoLeido={activo,puedeEnlazar,preparar,grupos,tick,tocar,sondear,hora,estadoOk:()=>ok};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
