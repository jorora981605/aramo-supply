/* pos-pedidos.js — «Pedidos» (antes «Mostrador») DENTRO del ARAMO POS, en la computadora y en el celular (2026-11-28).
   El dueño: «que los pedidos siempre se abran dentro del mostrador… que no se abra en el POS y todo se rellene desde el mostrador,
   o mejor aún que el MOSTRADOR esté dentro del POS para que todo sea más ordenado y llegue al mismo lugar… para ambos ARAMO POS».
   · «🧺 Pedidos» abre Pedidos de esta tienda encima del POS (../APP.html?solo=pedidos&suc=… en un marco, lo hace puerta.js).
     Ahí se acepta, se pesa, se manda la cotización (el cliente confirma) y se cobra. La venta entra sola a este POS por
     aramo_pos_pendientes (pos-mostrador.js): nada se abre como tiquete.
   · «✕ Cerrar» de Pedidos avisa con postMessage {tipo:'aramo-pedidos-cerrar'} y se vuelve al POS donde estaba.
   · Pedidos manda cada 4 s {tipo:'aramo-pedidos-estado',nuevos,alistando,listos}: el número del botón. Sin Pedidos abierto,
     el número sale de los pedidos que ya conoce este aparato (aramo-nube.js).
   · PosPedidos.abrir(id) abre Pedidos directo en ese pedido (#ver=<id>). */
window.PosPedidos=(function(){
'use strict';
const D=document;
let capa=null,marco=null,boton=null,cargado=false,cuenta={nuevos:0,alistando:0,listos:0};
const subs=new Set();
const suc=()=>{try{const s=window.POSWEB&&window.POSWEB.estado().SUC;if(s)return s;}catch(e){}return new URLSearchParams(location.search).get('suc')||'';};
const url=id=>'../APP.html?solo=pedidos&suc='+encodeURIComponent(suc())+(id?'#ver='+encodeURIComponent(id):'');
function armar(){
  if(capa)return;
  capa=D.createElement('div');capa.className='pp-capa';capa.hidden=true;capa.setAttribute('role','dialog');capa.setAttribute('aria-label','Pedidos');
  marco=D.createElement('iframe');marco.className='pp-marco';marco.title='Pedidos';marco.setAttribute('allow','clipboard-write');
  capa.appendChild(marco);D.body.appendChild(capa);
}
function abrir(id){
  if(!suc())return false;
  armar();
  if(!cargado||id){marco.src=url(id);cargado=true;}   // la primera vez, o directo en un pedido
  capa.hidden=false;D.documentElement.classList.add('pp-abierto');
  pintar();return true;
}
function cerrar(){if(capa)capa.hidden=true;D.documentElement.classList.remove('pp-abierto');contar();pintar();try{marco&&marco.blur();}catch(e){}}
const abierto=()=>!!(capa&&!capa.hidden);
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!e.data||typeof e.data!=='object')return;
  if(!marco||e.source!==marco.contentWindow)return;
  if(e.data.tipo==='aramo-pedidos-cerrar')cerrar();
  else if(e.data.tipo==='aramo-pedidos-estado'){cuenta={nuevos:+e.data.nuevos||0,alistando:+e.data.alistando||0,listos:+e.data.listos||0};pintar();}
});
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&abierto())cerrar();});
// El número sin abrir Pedidos: los pedidos de esta tienda que ya conoce este aparato
function contar(){
  const N=window.AramoNube;if(!N||typeof N.lista!=='function')return;
  let L=[];try{L=N.lista()||[];}catch(e){}
  const s=suc(),hoy=Date.now()-3*864e5;
  L=L.filter(o=>o&&o.sucursal===s&&!o.prueba&&(Date.parse(o.created||0)||0)>hoy);
  cuenta={nuevos:L.filter(o=>o.estado==='nuevo').length,alistando:L.filter(o=>o.estado==='alistando').length,listos:L.filter(o=>o.estado==='listo'&&!o.cobro).length};
  pintar();
}
function texto(){const n=cuenta.nuevos;return n?(n===1?'1 nuevo':n+' nuevos'):cuenta.alistando?(cuenta.alistando===1?'1 alistando':cuenta.alistando+' alistando'):'';}
function pintar(){
  if(boton){
    const t=texto();
    boton.innerHTML=`<span aria-hidden="true">🧺</span><span>Pedidos</span>${t?`<b>${t}</b>`:''}`;
    boton.classList.toggle('hay',cuenta.nuevos>0);boton.hidden=abierto();
  }
  subs.forEach(f=>{try{f(cuenta);}catch(e){}});
}
// El botón flotante (en la compu); el celular lo pone en su propia pantalla con PosPedidos.on(…)
function ponerBoton(){
  if(boton||!suc())return;
  boton=D.createElement('button');boton.type='button';boton.className='pp-boton';boton.setAttribute('aria-label','Abrir Pedidos de La Feria');
  boton.addEventListener('click',()=>abrir());D.body.appendChild(boton);
  pintar();
}
function iniciar(o){
  o=o||{};
  if(o.boton)ponerBoton();
  const N=window.AramoNube;
  if(N){try{N.on(()=>{if(!abierto())contar();});if(o.conectar)N.conectar().then(contar).catch(()=>{});}catch(e){}}
  contar();setInterval(()=>{if(!abierto())contar();},15000);
}
return{abrir,cerrar,abierto,iniciar,contar,on:f=>{subs.add(f);return()=>subs.delete(f);},get cuenta(){return cuenta;}};
})();
