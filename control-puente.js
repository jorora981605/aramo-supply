// control-puente.js — el puente entre ARAMO y el Control (control.html). 2026-11-24.
// Le pasa al cierre semanal lo que ARAMO ya sabe, para que nadie lo vuelva a digitar:
//   · Compras  → de cada Cierre de compras terminado (los de este aparato y los de la nube), por tienda y forma de pago.
//   · Ventas   → de los cobros del Mostrador (pedidos de La Feria), por tienda y forma de pago.
// Lo que se escribe a mano en el Control siempre manda sobre lo que llega solo.
// Falta conectar (siguiente paso): las ventas del POS de cada tienda.
(function(){
'use strict';
const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';   // la llave pública de siempre (la misma de APP.html y aramo-nube.js)
const P={tienda:null,nube:[],sinTabla:false,cargado:false,v:0,memo:new Map()};
const dos=n=>String(n).padStart(2,'0');
const diaDe=t=>{const d=new Date(t);return isNaN(d)?'':d.getFullYear()+'-'+dos(d.getMonth()+1)+'-'+dos(d.getDate());};
const leer=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch(e){return d;}};
const avisar=()=>{P.v++;P.memo.clear();try{window.dispatchEvent(new Event('aramo-puente'));}catch(e){}};

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
function dia(fecha,tienda){
  tienda=tienda||P.tienda;const k=fecha+'|'+tienda;
  if(P.memo.has(k))return P.memo.get(k);
  const c=comprasDe(fecha,tienda),v=cobrosDe(fecha,tienda);
  const out={cash:v.efectivo,sinpe:v.sinpe,card:v.tarjeta,comprasEfectivo:c.efectivo,comprasSinpe:c.sinpe,comprasTarjeta:c.tarjeta,cierres:c.n,cobros:v.n};
  P.memo.set(k,out);return out;
}
// Resumen para el aviso de arriba: cuánto llegó solo en los últimos 30 días.
function resumen(tienda){
  tienda=tienda||P.tienda;const hace=Date.now()-30*864e5;
  const nc=cierres().filter(c=>+c.inicio>hace&&c.tiendas&&c.tiendas[tienda]&&(+c.tiendas[tienda].total||0)>0).length;
  let nv=0;try{nv=(window.AramoNube?.lista()||[]).filter(o=>o.cobro&&!o.prueba&&o.sucursal===tienda&&Date.parse(o.cobro.fecha)>hace).length;}catch(e){}
  return{cierres:nc,cobros:nv,sinTabla:P.sinTabla,cargado:P.cargado};
}
async function cargarNube(){
  try{
    const desde=diaDe(Date.now()-70*864e5);
    const r=await fetch(`${SUPA_URL}/rest/v1/aramo_cierres_compras?select=id,datos&fecha=gte.${desde}&order=fecha.desc&limit=400`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}});
    if(r.ok){const filas=await r.json();P.nube=(filas||[]).map(f=>f.datos).filter(Boolean);P.sinTabla=false;}
    else{const e=await r.json().catch(()=>({}));if(r.status===404||/PGRST205|42P01/.test(e.code||''))P.sinTabla=true;}
  }catch(e){/* sin internet: sigue con lo de este aparato */}
  P.cargado=true;avisar();
}
function pintarAviso(){
  const el=document.getElementById('ctlPuente');if(!el)return;
  const r=resumen();
  const partes=[r.cierres?`${r.cierres} cierre${r.cierres===1?'':'s'} de compras`:'',r.cobros?`${r.cobros} cobro${r.cobros===1?'':'s'} del Mostrador`:''].filter(Boolean);
  el.hidden=false;
  el.innerHTML=`<b>Conectado con ARAMO.</b> ${partes.length?'De los últimos 30 días '+(r.cierres+r.cobros===1?'llegó solo ':'llegaron solos ')+partes.join(' y ')+'. Se ven en las casillas moradas.':'Cuando haya un Cierre de compras o un cobro del Mostrador, sus montos llegan solos a esta hoja.'} Si escribís un número a mano, manda el tuyo.${r.sinTabla?' <span class="ctl-falta">Las compras hechas en otro teléfono todavía no llegan: falta un pegado en Supabase.</span>':''}`;
}
function empezar(tienda){
  P.tienda=tienda;
  try{const N=window.AramoNube;if(N){N.on&&N.on(()=>avisar());N.conectar&&N.conectar();}}catch(e){}
  window.addEventListener('storage',e=>{if(e.key==='aramo_cierres')avisar();});
  window.addEventListener('aramo-puente',pintarAviso);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)cargarNube();});
  setInterval(cargarNube,5*60e3);
  cargarNube();pintarAviso();
}
window.AramoPuente={dia,resumen,empezar,cargarNube,comprasDe,cobrosDe};
})();
