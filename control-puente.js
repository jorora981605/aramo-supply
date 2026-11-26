// control-puente.js — el puente entre ARAMO y el Control (control.html). 2026-11-24.
// Le pasa al cierre semanal lo que ARAMO ya sabe, para que nadie lo vuelva a digitar:
//   · Compras  → de cada Cierre de compras terminado (los de este aparato y los de la nube), por tienda y forma de pago.
//   · Ventas   → de los cobros del Mostrador (pedidos de La Feria), por tienda y forma de pago.
// Lo que se escribe a mano en el Control siempre manda sobre lo que llega solo.
// El POS publica un resumen diario firmado por la clave del local; aquí solo se
// leen totales y referencias de venta, nunca la base completa del POS.
(function(){
'use strict';
const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';   // la llave pública de siempre (la misma de APP.html y aramo-nube.js)
const P={tienda:null,nube:[],posNube:[],posClave:'',posError:'',sinTabla:false,posSinTabla:false,cargado:false,v:0,memo:new Map()};
const dos=n=>String(n).padStart(2,'0');
const diaDe=t=>{const d=new Date(t);return isNaN(d)?'':d.getFullYear()+'-'+dos(d.getMonth()+1)+'-'+dos(d.getDate());};
const leer=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch(e){return d;}};
const avisar=()=>{P.v++;P.memo.clear();try{window.dispatchEvent(new Event('aramo-puente'));}catch(e){}};
const n=v=>Number(v)||0;
async function rpcRaw(fn,args){
  const r=await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify(args)});
  const body=await r.json().catch(()=>null);
  if(!r.ok){const e=new Error(body?.message||body?.hint||`RPC ${fn} (${r.status})`);e.status=r.status;e.code=body?.code;throw e;}
  return body;
}

// Cierres de compras terminados: los de la nube más los de este aparato, sin repetir.
function cierres(){
  const m=new Map();
  P.nube.forEach(c=>{if(c&&c.id)m.set(c.id,c);});
  (leer('aramo_cierres',[])||[]).forEach(c=>{if(c&&c.id&&!m.has(c.id))m.set(c.id,c);});
  return[...m.values()];
}
function comprasDe(dia,tienda){
  const r={efectivo:0,tarjeta:0,sinpe:0,n:0};
  cierres().forEach(c=>{
    if(diaDe(c.inicio)!==dia)return;
    const t=c.tiendas&&c.tiendas[tienda];if(!t||!t.pago)return;
    r.efectivo+=+t.pago.efectivo||0;r.tarjeta+=+t.pago.tarjeta||0;r.sinpe+=+t.pago.sinpe||0;r.n++;
  });
  return r;
}
// Cobros del Mostrador (pedidos de clientes ya cobrados). Los pedidos de prueba no cuentan.
function cobrosDe(dia,tienda){
  const r={efectivo:0,tarjeta:0,sinpe:0,n:0},N=window.AramoNube;
  if(!N||typeof N.lista!=='function')return r;
  let L=[];try{L=N.lista();}catch(e){}
  L.forEach(o=>{
    if(!o||!o.cobro||o.prueba||o.sucursal!==tienda||diaDe(o.cobro.fecha)!==dia)return;
    const k=o.cobro.metodo==='efectivo'?'efectivo':o.cobro.metodo==='sinpe'?'sinpe':'tarjeta';
    r[k]+=+o.cobro.total||0;r.n++;
  });
  return r;
}
// Lo que llega solo para un día y una tienda, con los nombres de las casillas del cierre semanal.
function posNormalizar(raw,origen,dia){
  const x=raw?.resumen||raw||{};
  if(!x||String(x.fecha||dia)!==dia)return null;
  return {fecha:dia,efectivo:n(x.efectivo),sinpe:n(x.sinpe),tarjeta:n(x.tarjeta),total:n(x.total),n:n(x.n||x.transacciones||x.ventasCount),ventas:Array.isArray(x.ventas)?x.ventas:(Array.isArray(x.movimientos)?x.movimientos:[]),actualizado:x.actualizado||x.generadoEn||raw?.actualizado||'',huella:x.huella||'',origen};
}
function posDe(dia,tienda){
  tienda=tienda||P.tienda;
  const local=posNormalizar(leer('aramo_pos_cierre_v1_'+tienda,null),'local',dia);
  const cloudRaw=(P.posNube||[]).find(x=>String(x.fecha||x.resumen?.fecha)===dia);
  const cloud=posNormalizar(cloudRaw,'nube',dia);
  if(!local)return cloud;
  if(!cloud)return local;
  return (Date.parse(cloud.actualizado)||0)>(Date.parse(local.actualizado)||0)?cloud:local;
}
function fuentesDia(fecha,tienda){
  tienda=tienda||P.tienda;
  const c=comprasDe(fecha,tienda),v=cobrosDe(fecha,tienda),p=posDe(fecha,tienda);
  return {pos:p||{efectivo:0,sinpe:0,tarjeta:0,n:0,ventas:[],origen:'pendiente'},mostrador:{...v,actualizado:'local'},compras:c,cierres:c.n,sinTabla:P.sinTabla,posSinTabla:P.posSinTabla};
}
function dia(fecha,tienda){
  tienda=tienda||P.tienda;const k=fecha+'|'+tienda;
  if(P.memo.has(k))return P.memo.get(k);
  const s=fuentesDia(fecha,tienda),c=s.compras,v=s.mostrador,p=s.pos;
  const out={cash:v.efectivo+n(p.efectivo),sinpe:v.sinpe+n(p.sinpe),card:v.tarjeta+n(p.tarjeta),comprasEfectivo:c.efectivo,comprasSinpe:c.sinpe,comprasTarjeta:c.tarjeta,cierres:c.n,cobros:v.n+n(p.n),posVentas:n(p.n),mostradorCobros:v.n,posFuente:p.origen,posActualizado:p.actualizado,posHuella:p.huella};
  P.memo.set(k,out);return out;
}
// Resumen para el aviso de arriba: cuánto llegó solo en los últimos 30 días.
function resumen(tienda){
  tienda=tienda||P.tienda;const hace=Date.now()-30*864e5;
  const nc=cierres().filter(c=>+c.inicio>hace&&c.tiendas&&c.tiendas[tienda]&&(+c.tiendas[tienda].total||0)>0).length;
  let nv=0;try{nv=(window.AramoNube?.lista()||[]).filter(o=>o.cobro&&!o.prueba&&o.sucursal===tienda&&Date.parse(o.cobro.fecha)>hace).length;}catch(e){}
  const cloudDates=new Set((P.posNube||[]).map(x=>String(x.fecha||x.resumen?.fecha||'')));
  const np=(P.posNube||[]).filter(x=>Date.parse(x.fecha||x.resumen?.fecha)>hace).reduce((t,x)=>t+n(x.resumen?.n??x.n??x.transacciones),0);
  const local=leer('aramo_pos_cierre_v1_'+tienda,null),localFecha=String(local?.fecha||'');
  const localN=localFecha&&!cloudDates.has(localFecha)&&Date.parse(localFecha)>hace?n(local?.n||local?.transacciones):0;
  return{cierres:nc,cobros:nv,posVentas:np+localN,sinTabla:P.sinTabla,posSinTabla:P.posSinTabla,posError:P.posError,posConectado:!!P.posClave&&!P.posError||!!local,cargado:P.cargado};
}
async function cargarPosNube(){
  const clave=leer('pos_clave_'+P.tienda,'')||P.posClave;
  P.posClave=clave||'';
  P.posError='';
  if(!P.posClave){P.posNube=[];P.posSinTabla=false;return;}
  try{
    const desde=diaDe(Date.now()-70*864e5),hasta=diaDe(Date.now());
    const r=await rpcRaw('pos_leer_cierres',{p_suc:P.tienda,p_clave:P.posClave,p_desde:desde,p_hasta:hasta});
    if(r?.ok===false){P.posNube=[];P.posError='La clave del POS no fue aceptada.';return;}
    P.posNube=Array.isArray(r)?r:(r?.cierres||[]);P.posSinTabla=false;
  }catch(e){
    P.posNube=[];
    P.posSinTabla=e.status===404||/PGRST202|42883|does not exist/i.test(e.message||'');
    if(!P.posSinTabla)P.posError='No se pudo verificar el POS; se conserva el resumen local.';
  }
}
async function cargarNube(){
  try{
    const desde=diaDe(Date.now()-70*864e5);
    const r=await fetch(`${SUPA_URL}/rest/v1/aramo_cierres_compras?select=id,datos&fecha=gte.${desde}&order=fecha.desc&limit=400`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}});
    if(r.ok){const filas=await r.json();P.nube=(filas||[]).map(f=>f.datos).filter(Boolean);P.sinTabla=false;}
    else{const e=await r.json().catch(()=>({}));if(r.status===404||/PGRST205|42P01/.test(e.code||''))P.sinTabla=true;}
  }catch(e){/* sin internet: sigue con lo de este aparato */}
  await cargarPosNube();
  P.cargado=true;avisar();
}
function pintarAviso(){
  const el=document.getElementById('ctlPuente');if(!el)return;
  const r=resumen();
  const partes=[r.cierres?`${r.cierres} cierre${r.cierres===1?'':'s'} de compras`:'',r.cobros?`${r.cobros} cobro${r.cobros===1?'':'s'} del Mostrador`:'',r.posVentas?`${r.posVentas} venta${r.posVentas===1?'':'s'} del POS`:'' ].filter(Boolean);
  const posMsg=r.posConectado?(r.posVentas?' El POS está conectado y sus ventas se concilian solas.':' El POS está conectado; todavía no hay ventas publicadas en los últimos 30 días.'):' El POS todavía no está conectado a este Control.';
  const posBtn=r.posConectado?'':' <button type="button" class="ctl-pos-connect" onclick="window.AramoPuente.conectarPOS()">Conectar POS</button>';
  el.hidden=false;
  el.innerHTML=`<b>Conectado con ARAMO.</b> ${partes.length?'De los últimos 30 días '+(r.cierres+r.cobros===1?'llegó solo ':'llegaron solos ')+partes.join(' y ')+'. Se ven en las casillas moradas.':'Cuando haya un Cierre de compras o un cobro del Mostrador, sus montos llegan solos a esta hoja.'} Si escribís un número a mano, manda el tuyo.${r.sinTabla?' <span class="ctl-falta">Las compras hechas en otro teléfono todavía no llegan: falta un pegado en Supabase.</span>':''}`;
}
// Versión extendida del aviso: incluye el estado del POS y el botón de conexión.
function pintarAviso(){
  const el=document.getElementById('ctlPuente');if(!el)return;
  const r=resumen();
  const partes=[r.cierres?`${r.cierres} cierre${r.cierres===1?'':'s'} de compras`:'',r.cobros?`${r.cobros} cobro${r.cobros===1?'':'s'} del Mostrador`:'',r.posVentas?`${r.posVentas} venta${r.posVentas===1?'':'s'} del POS`:'' ].filter(Boolean);
  const posMsg=r.posConectado?(r.posVentas?' El POS está conectado y sus ventas se concilian solas.':' El POS está conectado; todavía no hay ventas publicadas en los últimos 30 días.'):' El POS todavía no está conectado a este Control.';
  const posBtn=r.posConectado?'':' <button type="button" class="ctl-pos-connect" onclick="window.AramoPuente.conectarPOS()">Conectar POS</button>';
  el.hidden=false;
  el.innerHTML=`<b>Conectado con ARAMO.</b> ${partes.length?'De los últimos 30 días '+(partes.length===1?'llegó solo ':'llegaron solos ')+partes.join(' y ')+'. Se ven en las casillas moradas.':'Cuando haya un Cierre de compras, un cobro del Mostrador o una venta del POS, sus montos llegan solos a esta hoja.'} Si escribís un número a mano, manda el tuyo.${posMsg}${posBtn}${r.posError?` <span class="ctl-falta">${r.posError}</span>`:''}${r.sinTabla?' <span class="ctl-falta">Las compras hechas en otro teléfono todavía no llegan: falta un pegado en Supabase.</span>':''}${r.posSinTabla?' <span class="ctl-falta">Falta aplicar la migración del resumen POS en Supabase; mientras tanto el Control conserva el resumen local.</span>':''}`;
}
async function conectarPOS(){
  const actual=leer('pos_clave_'+P.tienda,'')||'';
  const clave=window.prompt('Escribí la clave del POS de '+(P.tienda==='moravia'?'Moravia':'Los Ángeles'),actual);
  if(!clave)return;
  try{localStorage.setItem('pos_clave_'+P.tienda,JSON.stringify(String(clave)));}catch(e){}
  P.posClave=String(clave);await cargarPosNube();
  if(P.posError==='La clave del POS no fue aceptada.'){
    try{localStorage.removeItem('pos_clave_'+P.tienda);}catch(e){}
    P.posClave='';window.alert('La clave del POS no fue aceptada.');
  }
  avisar();
}
function empezar(tienda){
  P.tienda=tienda;
  try{const N=window.AramoNube;if(N){N.on&&N.on(()=>avisar());N.conectar&&N.conectar();}}catch(e){}
  window.addEventListener('storage',e=>{if(e.key==='aramo_cierres'||e.key==='aramo_pos_cierre_v1_'+P.tienda)avisar();});
  window.addEventListener('aramo-puente',pintarAviso);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)cargarNube();});
  setInterval(cargarNube,5*60e3);
  cargarNube();pintarAviso();
}
window.AramoPuente={dia,resumen,empezar,cargarNube,comprasDe,cobrosDe,posDe,fuentesDia,conectarPOS};
})();
