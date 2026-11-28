// control-puente.js — el puente entre ARAMO y el Control (control.html). 2026-11-24.
// Le pasa al cierre semanal lo que ARAMO ya sabe, para que nadie lo vuelva a digitar:
//   · Compras  → de cada Cierre de compras terminado (los de este aparato y los de la nube), por tienda y forma de pago.
//   · Ventas   → de los cobros del Mostrador (pedidos de La Feria), por tienda y forma de pago.
// Lo que se escribe a mano en el Control siempre manda sobre lo que llega solo.
//   · POS      → el resumen de cada día que publica el POS de la tienda (2026-11-26): ventas por forma de pago, cada
//                tiquete con su hora (para la caja exacta de cada turno), los fiados y las cajas. Llega por la nube
//                (tabla aramo_pos_dia) o, si el POS corre en este mismo aparato, por localStorage 'aramo_pos_dia'.
//   · Reinicio → la marca de "dejar todo en cero" (tabla aramo_reinicio); el Control decide qué borra.
(function(){
'use strict';
const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';   // la llave pública de siempre (la misma de APP.html y aramo-nube.js)
const P={tienda:null,nube:[],pos:new Map(),sinTabla:false,sinPos:false,reinicio:null,cargado:false,v:0,memo:new Map()};
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
// Un cobro del Mostrador que ya entró al POS como venta (pos-mostrador.js lo registra con origen_id = cobro.aPOS) se cuenta
// una sola vez: con las ventas del POS. Si el resumen del POS todavía no lo trae, se cuenta como cobro del Mostrador.
function yaEnPOS(o,dia,tienda){
  const a=o&&o.cobro&&o.cobro.aPOS;if(!a)return false;
  const ps=posDia(dia,tienda);
  return !!(ps&&Array.isArray(ps.tiquetes)&&ps.tiquetes.some(t=>t&&t.o===a));
}
function cobrosDe(dia,tienda){
  const r={efectivo:0,tarjeta:0,sinpe:0,n:0},N=window.AramoNube;
  if(!N||typeof N.lista!=='function')return r;
  let L=[];try{L=N.lista();}catch(e){}
  L.forEach(o=>{
    if(!o||!o.cobro||o.cobro.porPOS||o.prueba||o.sucursal!==tienda||diaDe(o.cobro.fecha)!==dia||yaEnPOS(o,dia,tienda))return;
    const k=o.cobro.metodo==='efectivo'?'efectivo':o.cobro.metodo==='sinpe'?'sinpe':'tarjeta';
    r[k]+=+o.cobro.total||0;r.n++;
  });
  return r;
}
// ── El POS ──
// El resumen de un día: {v, tienda, fecha, at, ventas:{efectivo,sinpe,tarjeta,fiado,otros,total,n}, descuentos,
//   anuladas:{n,total}, desechos, tiquetes:[{n,h,t,m,ef,p,sa,d,c,caja}], fiados:[{n,h,cliente,t}], cajas:[…]}
// Cada tiquete es una venta completada. "ef" es lo que entró en EFECTIVO (igual a t si se pagó en efectivo; la parte
// en efectivo si fue mixto, con p:{efectivo,sinpe,tarjeta}; 0 en los demás). Regla: ventas.efectivo = suma de ef.
const efDe=t=>t&&t.ef!=null?(+t.ef||0):(t&&t.m==='efectivo'?(+t.t||0):0);
const parteDe=(t,mt)=>!t?0:mt==='efectivo'?efDe(t):t.m===mt?(+t.t||0):(t.m==='mixto'&&t.p?(+t.p[mt]||0):0);
function posDia(fecha,tienda){
  tienda=tienda||P.tienda;const k=tienda+'|'+fecha;
  const loc=(leer('aramo_pos_dia',{})||{})[k]||null,nub=P.pos.get(k)||null;
  if(loc&&nub)return(Date.parse(loc.at)||0)>=(Date.parse(nub.at)||0)?loc:nub;
  return loc||nub;
}
// lo que el Control muestra del POS de ese día
function pos(fecha,tienda){
  const p=posDia(fecha,tienda);if(!p)return null;const v=p.ventas||{},tq=Array.isArray(p.tiquetes)?p.tiquetes:[];
  // a quién le llegó cada SINPE (campo "sa" del tiquete, si el POS lo manda): así se sabe quién tiene esa plata
  const sp={};tq.forEach(t=>{const x=parteDe(t,'sinpe');if(x>0){const k=String(t.sa||'').trim()||'Sin anotar';sp[k]=(sp[k]||0)+x;}});
  return{sinpePara:tq.some(t=>t&&t.sa)?sp:null,at:p.at||'',n:+v.n||tq.length,total:+v.total||0,efectivo:+v.efectivo||0,sinpe:+v.sinpe||0,tarjeta:+v.tarjeta||0,fiado:+v.fiado||0,otros:+v.otros||0,
    descuentos:+p.descuentos||0,anuladas:p.anuladas||{n:0,total:0},desechos:+p.desechos||0,cajas:Array.isArray(p.cajas)?p.cajas:[],exacto:tq.length>0};
}
// cada venta en efectivo con su hora: con eso la caja de cada turno sale exacta
function cajaMovs(fecha,tienda){
  const p=posDia(fecha,tienda);if(!p||!Array.isArray(p.tiquetes)||!p.tiquetes.length)return null;
  return p.tiquetes.filter(t=>efDe(t)>0&&/^\d{1,2}:\d{2}/.test(t.h||'')).map(t=>({time:String(t.h).slice(0,5).padStart(5,'0'),amount:efDe(t),note:t.n||''}));
}
function fiados(fecha,tienda){
  const p=posDia(fecha,tienda);if(!p||!Array.isArray(p.fiados))return[];
  return p.fiados.filter(f=>f&&(+f.t||0)>0).map(f=>({id:'pf:'+fecha+':'+(f.n||f.cliente||''),concept:f.cliente||'Cliente',amount:+f.t,hora:f.h||'',n:f.n||'',date:fecha}));
}
// los fiados del POS de los últimos días (para "te deben")
function fiadosTodos(tienda){
  tienda=tienda||P.tienda;const fechas=new Set();
  [...P.pos.keys()].concat(Object.keys(leer('aramo_pos_dia',{})||{})).forEach(k=>{if(k.startsWith(tienda+'|'))fechas.add(k.slice(tienda.length+1));});
  return[...fechas].sort().flatMap(f=>fiados(f,tienda));
}
// ¿ya llegó algo del POS alguna vez? (para dejar de pedir las ventas a mano)
function posConectado(tienda){
  tienda=tienda||P.tienda;
  return[...P.pos.keys()].concat(Object.keys(leer('aramo_pos_dia',{})||{})).some(k=>k.startsWith(tienda+'|'));
}
// Lo que llega solo, RENGLÓN POR RENGLÓN (2026-11-25): cada compra con su proveedor, sus productos y sus
// precios, cada gasto del viaje y cada cobro del Mostrador. El Control nuevo los muestra como tarjetas
// separadas y cada una se puede dejar de contar. La suma de los renglones es la misma de comprasDe/cobrosDe.
//   {id, campo, monto, titulo, origen, hora, firma, items:[{t,q,u,precio,monto}]}
const CAMPO_COMPRA={efectivo:'comprasEfectivo',sinpe:'comprasSinpe',tarjeta:'comprasTarjeta'};
const CAMPO_VENTA={efectivo:'cash',sinpe:'sinpe',tarjeta:'card'};
function lineas(fecha,tienda){
  tienda=tienda||P.tienda;const k='L|'+fecha+'|'+tienda;
  if(P.memo.has(k))return P.memo.get(k);
  const out=[],m=tienda==='moravia';
  cierres().forEach(c=>{
    if(diaDe(c.inicio)!==fecha)return;
    const t=c.tiendas&&c.tiendas[tienda];if(!t||!t.pago)return;
    const suma={efectivo:0,tarjeta:0,sinpe:0};
    (c.provs||[]).forEach(p=>{
      const monto=+(m?p.tm:p.ta)||0;if(!monto)return;
      const pago=CAMPO_COMPRA[p.pago]?p.pago:'efectivo';
      const items=[];
      (p.items||[]).forEach(it=>{const mo=+(m?it.sm:it.sa)||0;if(mo)items.push({t:it.t||'',q:+(m?it.qm:it.qa)||0,u:it.u||'',precio:+it.precio||0,monto:mo});});
      (p.mas||[]).forEach(it=>{const mo=+(m?it.sm:it.sa)||0;if(!mo)return;const q=+it.q||0;items.push({t:it.t||'Algo más',q:it.para==='mitad'?q/2:q,u:'',precio:+it.precio||0,monto:mo});});
      out.push({id:'c:'+c.id+':'+p.prov,campo:CAMPO_COMPRA[pago],monto,titulo:p.prov,origen:'Cierre de compras',hora:c.inicio,firma:c.firma||'',items});
      suma[pago]+=monto;
    });
    (c.gastos||[]).forEach(g=>{
      const monto=+(m?g.gm:g.ga)||0;if(!monto)return;
      const pago=CAMPO_COMPRA[g.pago]?g.pago:'efectivo';
      out.push({id:'g:'+c.id+':'+g.id,campo:CAMPO_COMPRA[pago],monto,titulo:g.t||'Gasto del viaje',origen:'Gasto del viaje de compras',hora:c.inicio,firma:c.firma||'',items:[]});
      suma[pago]+=monto;
    });
    // un cierre sin detalle (o que no calza con su detalle): un renglón con lo que falta, para que no se pierda ni un colón
    Object.keys(suma).forEach(pago=>{
      const dif=(+t.pago[pago]||0)-suma[pago];
      if(Math.abs(dif)>=1)out.push({id:'r:'+c.id+':'+pago,campo:CAMPO_COMPRA[pago],monto:dif,titulo:'Compras del día',origen:'Cierre de compras',hora:c.inicio,firma:c.firma||'',items:[]});
    });
  });
  const N=window.AramoNube;let L=[];
  try{if(N&&typeof N.lista==='function')L=N.lista()||[];}catch(e){}
  L.forEach(o=>{
    if(!o||!o.cobro||o.cobro.porPOS||o.prueba||o.sucursal!==tienda||diaDe(o.cobro.fecha)!==fecha||yaEnPOS(o,fecha,tienda))return;
    const monto=+o.cobro.total||0;if(!monto)return;
    const pago=o.cobro.metodo==='efectivo'?'efectivo':o.cobro.metodo==='sinpe'?'sinpe':'tarjeta';
    out.push({id:'v:'+o.id,campo:CAMPO_VENTA[pago],monto,titulo:(o.cliente&&o.cliente.nombre)||'Pedido de La Feria',origen:'Cobro del Mostrador',hora:Date.parse(o.cobro.fecha)||0,firma:'',items:[]});
  });
  // las ventas del POS: un renglón por forma de pago (el detalle de cada tiquete vive en el POS)
  const ps=posDia(fecha,tienda);
  if(ps&&ps.ventas)['efectivo','sinpe','tarjeta'].forEach(mt=>{
    const monto=+ps.ventas[mt]||0;if(!monto)return;
    const n=(Array.isArray(ps.tiquetes)?ps.tiquetes:[]).filter(t=>parteDe(t,mt)>0).length;
    out.push({id:'p:'+fecha+':'+mt,campo:CAMPO_VENTA[mt],monto,titulo:'Ventas del POS',origen:'POS'+(n?' · '+n+' tiquete'+(n===1?'':'s'):''),hora:Date.parse(ps.at)||0,firma:'',items:[]});
  });
  P.memo.set(k,out);return out;
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
  let nv=0;try{nv=(window.AramoNube?.lista()||[]).filter(o=>o.cobro&&!o.cobro.porPOS&&!o.prueba&&o.sucursal===tienda&&Date.parse(o.cobro.fecha)>hace).length;}catch(e){}
  return{cierres:nc,cobros:nv,sinTabla:P.sinTabla,cargado:P.cargado};
}
async function cargarNube(){
  try{
    const desde=diaDe(Date.now()-70*864e5);
    const r=await fetch(`${SUPA_URL}/rest/v1/aramo_cierres_compras?select=id,datos&fecha=gte.${desde}&order=fecha.desc&limit=400`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}});
    if(r.ok){const filas=await r.json();P.nube=(filas||[]).map(f=>f.datos).filter(Boolean);P.sinTabla=false;}
    else{const e=await r.json().catch(()=>({}));if(r.status===404||/PGRST205|42P01/.test(e.code||''))P.sinTabla=true;}
  }catch(e){/* sin internet: sigue con lo de este aparato */}
  const H={headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}};
  try{   // el resumen de cada día del POS de esta tienda
    const desde=diaDe(Date.now()-70*864e5);
    const r=await fetch(`${SUPA_URL}/rest/v1/aramo_pos_dia?select=fecha,datos&tienda=eq.${P.tienda}&fecha=gte.${desde}&order=fecha.desc&limit=120`,H);
    if(r.ok){const filas=await r.json();P.pos=new Map((filas||[]).filter(f=>f&&f.datos).map(f=>[P.tienda+'|'+f.fecha,f.datos]));P.sinPos=false;}
    else{const e=await r.json().catch(()=>({}));if(r.status===404||/PGRST205|42P01/.test(e.code||''))P.sinPos=true;}
  }catch(e){}
  try{   // la marca de "dejar todo en cero"
    const r=await fetch(`${SUPA_URL}/rest/v1/aramo_reinicio?select=at&id=eq.general`,H);
    if(r.ok){const f=await r.json();P.reinicio=(f&&f[0]&&f[0].at)||null;}
  }catch(e){}
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
  window.addEventListener('storage',e=>{if(e.key==='aramo_cierres'||e.key==='aramo_pos_dia')avisar();});
  window.addEventListener('aramo-puente',pintarAviso);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)cargarNube();});
  setInterval(cargarNube,5*60e3);
  cargarNube();pintarAviso();
}
window.AramoPuente={dia,lineas,resumen,empezar,cargarNube,comprasDe,cobrosDe,pos,posDia,posConectado,cajaMovs,fiados,fiadosTodos,sinPos:()=>P.sinPos,reinicio:()=>P.reinicio};
})();
