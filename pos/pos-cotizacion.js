/* pos-cotizacion.js — un pedido de La Feria que se pesa en el POS (celular o computadora) no se cobra a ciegas (2026-11-27).
   El dueño: «si llega un pedido y lo mando al POS y le modifico el peso o el precio, se registra como una venta de una vez;
   debería reenviarle la contraoferta al cliente antes de confirmar el monto total».
   La regla es la misma del Mostrador:
   · Si la cuenta tiene lo mismo que el cliente ya aceptó (lo que pidió, o la última cotización que confirmó) → se cobra.
   · Si cambió algo (peso, precio, un producto que no hay o uno de más) → primero «Mandarle el total nuevo»: el pedido queda
     en «Esperando tu confirmación» en La Feria (como la cotización del Mostrador) y el POS no deja cobrarlo.
   · Se puede cobrar cuando el cliente confirma en La Feria, o cuando la tienda marca «Ya me dijo que sí» (en persona,
     por llamada o por WhatsApp). Si el cliente la rechaza, el pedido queda cancelado (como siempre en La Feria).
   Líneas: [{k,n,q,p,u,pid,e}] — k = la clave del producto en el pedido (it.k||it.n); sin k = algo agregado en el POS.
   El envío no va en las líneas (es aparte, en retiro.envio). */
window.PosCotizacion=(function(){
'use strict';
const N=()=>window.AramoNube||null;
const precioIt=it=>it.pr!=null&&it.pr!==''?+it.pr||0:+it.p||0;
const qtyIt=it=>it.estado==='nohay'?0:(it.qr!=null&&it.qr!==''?+it.qr||0:+it.q||0);
const r3=n=>Math.round((+n||0)*1000)/1000;
const claveIt=it=>String(it.k||it.n||'');
const ACENTOS=new RegExp('['+String.fromCharCode(0x300)+'-'+String.fromCharCode(0x36f)+']','g');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(ACENTOS,'').replace(/ +/g,' ').trim();
const fase=o=>{const n=N();return n&&n.faseDe?n.faseDe(o):String(o&&o.fase||'');};

// Lo que el cliente ya aceptó: lo que pidió o, si la tienda ya le mandó una cotización, esa cotización.
function acordado(o){
  const cot=!!(o&&(o.cotizacion||o.confirmacion));
  return (o&&o.items||[]).map(it=>({k:claveIt(it),n:it.n,u:it.u,nuevo:!!it.nuevo,
    q:r3(cot?qtyIt(it):(it.q0!=null?+it.q0:+it.q||0)),p:cot?precioIt(it):(it.p0!=null?+it.p0:+it.p||0)}));
}
// Empareja cada producto del pedido con su línea: por clave y, lo agregado en el POS, por nombre.
function emparejar(o,lineas){
  const A=acordado(o),L=(lineas||[]).filter(l=>l&&r3(l.q)>0),usadas=new Set(),par=new Map();
  A.forEach(a=>{const l=L.find(x=>!usadas.has(x)&&x.k&&String(x.k)===a.k);if(l){usadas.add(l);par.set(a,l);}});
  A.forEach(a=>{if(par.has(a)||!a.nuevo)return;const l=L.find(x=>!usadas.has(x)&&!x.k&&norm(x.n)===norm(a.n));if(l){usadas.add(l);par.set(a,l);}});
  return{A,par,extra:L.filter(l=>!usadas.has(l))};
}
// Qué cambió respecto a lo que el cliente aceptó
function diferencias(o,lineas){
  const {A,par,extra}=emparejar(o,lineas),out=[];
  A.forEach(a=>{
    const l=par.get(a),q=l?r3(l.q):0,p=l?+l.p||0:a.p;
    if(Math.abs(a.q-q)>0.0005||(q>0&&Math.abs(a.p-p)>0.5))out.push({k:a.k,n:a.n,u:a.u,antes:a.q,ahora:q,pAntes:a.p,pAhora:p,nohay:q===0});
  });
  extra.forEach(l=>out.push({k:l.k||'',n:l.n,u:l.u,antes:0,ahora:r3(l.q),pAntes:0,pAhora:+l.p||0,nuevo:true}));
  return out;
}
// cobrar · mandar (cambió algo) · esperando (ya se le mandó y no ha confirmado) · cobrado · cancelado
function estado(o,lineas){
  if(!o)return 'cobrar';
  if(o.cobro)return 'cobrado';
  if(o.estado==='cancelado')return 'cancelado';
  if(diferencias(o,lineas).length)return 'mandar';
  if(fase(o)==='confirmacion')return 'esperando';
  const n=N();if(n&&n.porConfirmar&&n.porConfirmar(o))return 'mandar'; // cambió en otro lado (el Mostrador) después de que confirmó
  return 'cobrar';
}
const necesitaUber=o=>!!(o&&o.retiro&&o.retiro.envio)&&!(+o.retiro.envio.costoUber>0);

// Pone las líneas en el pedido (como hace la cotización del Mostrador: guarda lo que pidió en q0/p0)
function aplicar(y,lineas){
  const {A,par,extra}=emparejar(y,lineas);
  y.items=(y.items||[]).map((it,i)=>{
    const l=par.get(A[i]),q=l?r3(l.q):0,p=l?Math.max(0,+l.p||0):precioIt(it);
    const z={...it,q0:it.q0!=null?it.q0:it.q,p0:it.p0!=null?it.p0:it.p,q,qr:q,p,estado:q>0?'listo':'nohay'};
    delete z.pr;delete z.cambio;delete z.qAntes;return z;
  });
  const usadas=new Set(y.items.map(claveIt));
  extra.forEach((l,i)=>{
    let k=l.k&&!usadas.has(String(l.k))?String(l.k):'pos_'+Date.now().toString(36)+'_'+i;usadas.add(k);
    const kg=l.u==='kg';
    y.items.push({k,n:l.n||'Producto',e:l.e||'🧺',q:r3(l.q),qr:r3(l.q),p:Math.max(0,+l.p||0),q0:0,p0:Math.max(0,+l.p||0),u:kg?'kg':'unid',s:kg?.25:1,nuevo:1,estado:'listo'});
    l.k=k; // la línea queda unida a su producto nuevo del pedido
  });
  return y;
}
// El total que va a ver el cliente si se le manda esto (el mismo cálculo de La Feria)
function totalCon(o,lineas){
  const n=N();if(!n||!o)return 0;
  const y=aplicar(JSON.parse(JSON.stringify(o)),JSON.parse(JSON.stringify(lineas||[])));
  return n.totalDe(y);
}
async function mandar(id,lineas,origen,quien){
  const n=N();if(!n)throw new Error('Sin conexión con los pedidos');
  return n.cambiar(id,y=>{
    if(y.cobro||y.estado==='cancelado'||y.estado==='entregado')return;
    aplicar(y,lineas);
    const t=n.totalDe(y);
    y.estado='alistando';y.fase='confirmacion';y.totalFinal=t;delete y.confirmacion;
    if(y.retiro&&y.retiro.envio)y.retiro.envio.fijo=true;
    y.cotizacion={at:new Date().toISOString(),total:t,totalAntes:n.totalAntesDe?n.totalAntesDe(y):t,por:quien||origen,origen};
    y._ev={tipo:'cot-enviada',monto:t};
  },'tienda','Cotización final enviada al cliente desde el '+origen+' · esperando su confirmación');
}
// «Ya me dijo que sí»: el cliente aceptó en persona, por llamada o por WhatsApp
async function confirmarTienda(id,quien,origen){
  const n=N();if(!n)throw new Error('Sin conexión con los pedidos');
  return n.cambiar(id,x=>{
    if(fase(x)!=='confirmacion')return;
    const t=n.totalDe(x);x.fase='alistando';x.confirmacion={at:new Date().toISOString(),por:'tienda',total:t,quien:quien||''};x._ev={tipo:'cot-ok-tienda',monto:t};
  },'tienda','Confirmó la cotización por el cliente (en persona, llamada o WhatsApp)'+(origen?' · '+origen:''));
}
// Quién confirmó y cuánto (para decirlo en la pantalla)
function confirmado(o){const c=o&&o.confirmacion;return c&&c.at?{por:c.por==='cliente'?'cliente':'tienda',total:+c.total||0,at:c.at}:null;}
function qTxt(q,u){q=+q||0;if(u==='kg')return (q<1?Math.round(q*1000)+' g':(Math.round(q*1000)/1000).toLocaleString('es-CR')+' kg');return q.toLocaleString('es-CR')+(q===1?' unidad':' unidades');}
function cambioTxt(c,col){
  if(c.nuevo)return `${c.n}: se agregó ${qTxt(c.ahora,c.u)}`;
  if(c.nohay)return `${c.n}: no hay`;
  const partes=[];
  if(Math.abs(c.antes-c.ahora)>0.0005)partes.push(`${qTxt(c.antes,c.u)} → ${qTxt(c.ahora,c.u)}`);
  if(Math.abs(c.pAntes-c.pAhora)>0.5)partes.push(`precio ${col(c.pAntes)} → ${col(c.pAhora)}`);
  return `${c.n}: ${partes.join(' · ')}`;
}
// WhatsApp para el cliente: el total nuevo, qué cambió y el enlace para confirmarlo en La Feria
function waTexto(o,cambios){
  const n=N(),col=n.colones,tot=n.totalDe(o),nom=String(o.cliente&&o.cliente.nombre||'').trim().split(' ')[0];
  let link='';try{link=n.enlace(new URL('../canasta.html',location.href).href,'e',o);}catch(e){}
  const env=o.retiro&&o.retiro.envio&&+o.retiro.envio.costo?` (incluye tu parte del envío: ${col(o.retiro.envio.costo)})`:'';
  const L=(cambios||(n.cambiosDe?n.cambiosDe(o).map(c=>({...c,nuevo:!c.antes&&c.ahora>0,nohay:c.nohay})):[])).slice(0,10);
  const lista=L.length?'\n\nQué cambió:\n'+L.map(c=>'• '+cambioTxt(c,col)).join('\n'):'';
  return `¡Hola${nom?' '+nom:''}! 👋\n🧾 Ya pesamos tu pedido ${o.ref||''}. El total nuevo es *${col(tot)}*${env}.${lista}\n\nRevisalo y confirmalo en La Feria${link?' 👉 '+link:''}`;
}
return{acordado,diferencias,estado,necesitaUber,mandar,confirmarTienda,confirmado,totalCon,waTexto,cambioTxt,qTxt};
})();
