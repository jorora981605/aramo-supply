// control-compras.js — el módulo Compras del Control total (2026-11-28).
//   · Lo que llega del Cierre de compras de Inventario, completo: quién compró, el cuadre de la plata del viaje, lo que
//     no llegó, lo que quedó sin precio, los precios que cambiaron, y la foto de cada factura con su resumen.
//   · Las entregas en la tienda (un proveedor que trae la mercadería): con sus productos, quién las pagó, la factura
//     y, si se deben, cuándo vencen (cuentas por pagar con sus abonos).
//   · window.Compras: las cuentas (puras, probables solas) y lo que usa el módulo de Productos (costos).
// Guarda: data.entregas (cada entrega recibida) · data.facturas (la marca de la factura de un renglón que llegó solo; la
// foto vive en este aparato con la llave 'f:'+idRenglón) · data.provEntrega (los proveedores de entregas, para no
// escribirlos cada vez) · y en data.plata los pagos de lo que se debe: {t:'abono', entrega:<id>}.
// Cada entrega es un renglón del día para el motor (window.ControlFuentes): suma en las compras, en la ganancia y en la
// plata de los tres sin tocar nada más.
(function(){
'use strict';
if(typeof clComputeWeek!=='function'||!window.ControlFuentes)return;
const PL=window.Plata||null,PU=window.AramoPuente||null,CC=window.ControlCaja||null;
const ent=n=>Math.round(num(n));
const hoyISO=()=>clDateISO(new Date());
const listaEnt=()=>Array.isArray(data.entregas)?data.entregas:(data.entregas=[]);
const mapaFact=()=>(data.facturas&&typeof data.facturas==='object'&&!Array.isArray(data.facturas))?data.facturas:(data.facturas={});
data.entregas=listaEnt();data.facturas=mapaFact();if(!Array.isArray(data.provEntrega))data.provEntrega=[];
const qTxt=q=>(Math.round(num(q)*100)/100).toLocaleString('es-CR');

/* ---------- cuentas (puras: reciben datos y devuelven números) ---------- */
// a qué casilla de compras va una entrega: si se debe, "a crédito"; si no, según en qué se pagó (con la caja siempre es efectivo)
const campoDeEntrega=e=>e.pago==='credito'?'comprasCredito':({sinpe:'comprasSinpe',tarjeta:'comprasTarjeta'}[e.pago==='caja'?'efectivo':e.como]||'comprasEfectivo');
function lineaDeEntrega(e){
  return{id:'e:'+e.id,campo:campoDeEntrega(e),monto:ent(e.total),titulo:e.prov,origen:'Entrega en la tienda',hora:Date.parse(e.at)||0,firma:'',
    items:(e.items||[]).map(i=>({t:i.t,q:num(i.q),u:i.u||'',precio:num(i.precio),monto:ent(i.monto)})),pago:e.pago,foto:!!e.foto,fotoId:'e:'+e.id};
}
window.ControlFuentes.push(f=>{const L=listaEnt();const out=[];for(let i=0;i<L.length;i++){const e=L[i];if(e&&e.f===f&&ent(e.total)>0)out.push(lineaDeEntrega(e));}return out;});

const entregaPor=id=>listaEnt().find(e=>e&&e.id===id)||null;
const entregasDe=f=>listaEnt().filter(e=>e&&e.f===f).sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0));
const abonosDe=id=>(data.plata||[]).filter(m=>m&&m.t==='abono'&&m.entrega===id).sort((a,b)=>(a.f+(a.at||'')).localeCompare(b.f+(b.at||'')));
const pagadoDe=id=>abonosDe(id).reduce((t,m)=>t+ent(m.monto),0);
const saldoDe=e=>ent(e.total)-pagadoDe(e.id);
const diasEntre=(a,b)=>Math.round((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/864e5);
// lo que se debe: cada entrega "se debe" con lo que falta; dias = cuántos días faltan para que venza (negativo = ya venció)
function porPagar(){
  const h=hoyISO();
  return listaEnt().filter(e=>e&&e.pago==='credito'&&saldoDe(e)>0).map(e=>{
    const pagado=pagadoDe(e.id),dias=e.vence?diasEntre(h,e.vence):null;
    return{id:e.id,prov:e.prov,f:e.f,total:ent(e.total),pagado,saldo:ent(e.total)-pagado,vence:e.vence||'',dias,vencida:dias!=null&&dias<0};
  }).sort((a,b)=>(a.vence||'9999').localeCompare(b.vence||'9999')||a.f.localeCompare(b.f));
}
const debeTotal=()=>porPagar().reduce((t,x)=>t+x.saldo,0);
const textoVence=dias=>dias==null?'sin fecha de pago':dias<0?`venció hace ${-dias} día${dias===-1?'':'s'}`:dias===0?'vence hoy':dias===1?'vence mañana':`vence en ${dias} días`;
const textoHace=dias=>dias<=0?'hoy':dias===1?'ayer':`hace ${dias} días`;

// Todo lo que Los Ángeles compró en un rango, con detalle de producto (para saber cuánto cuesta cada cosa).
// Del Cierre de compras (lo que le tocó a esta tienda) y de las entregas; sin lo marcado "no contar".
function costos(desde,hasta){
  const out=[],fuera=data.autoFuera||{};
  let n=0;
  for(let f=desde;f<=hasta&&n<800;f=clDateAdd(f,1),n++){
    (PU&&PU.cierresDia?PU.cierresDia(f,TIENDA)||[]:[]).forEach(c=>{
      (c.provs||[]).forEach(p=>{
        if(fuera['c:'+c.id+':'+p.prov])return;
        (p.items||[]).forEach(it=>{const mo=ent(it.sa);if(!mo)return;out.push({f,prov:p.prov,t:it.t||'',u:it.u||'',q:num(it.qa),precio:num(it.precio),monto:mo,origen:'mercado'});});
        (p.mas||[]).forEach(it=>{const mo=ent(it.sa);if(!mo)return;const q=num(it.q);out.push({f,prov:p.prov,t:it.t||'Algo más',u:it.u||'',q:it.para==='mitad'?q/2:q,precio:num(it.precio),monto:mo,origen:'mercado'});});
      });
    });
    entregasDe(f).forEach(e=>{
      if(fuera['e:'+e.id])return;
      (e.items||[]).forEach(it=>{const mo=ent(it.monto);if(!mo)return;out.push({f,prov:e.prov,t:it.t||'',u:it.u||'',q:num(it.q),precio:num(it.precio),monto:mo,origen:'entrega'});});
    });
  }
  return out;
}
// lo comprado en un rango, tal cual lo suma el motor (la misma cuenta de la ganancia)
function total(desde,hasta){
  let t=0;
  for(let L=clMonday(desde);L<=hasta;L=clDateAdd(L,7))clComputeWeek(L).perDay.forEach(d=>{if(d.date>=desde&&d.date<=hasta)t+=num(d.comprasTotal);});
  return Math.round(t);
}
// lo comprado que todavía no tiene su lista de productos (entregas "solo el total", gastos del viaje, compras anotadas)
const sinDetalle=(desde,hasta)=>Math.max(0,total(desde,hasta)-costos(desde,hasta).reduce((t,x)=>t+x.monto,0));

// Lo que vale la pena avisar de un Cierre de compras, por proveedor (solo la parte de Los Ángeles)
function analizarCierre(c){
  const out={};
  (c.provs||[]).forEach(p=>{
    const noLlego=[],sinPrecio=[],cambios=[];
    (p.items||[]).forEach(it=>{
      const pa=num(it.pa),qa=num(it.qa);
      if(pa>0&&qa<pa)noLlego.push({t:it.t||'',u:it.u||'',pidio:pa,llego:qa});
      if(it.falta&&qa>0)sinPrecio.push(it.t||'');
      if(Math.abs(num(it.cambio))>=.1&&qa>0)cambios.push({t:it.t||'',pct:Math.round(Math.abs(num(it.cambio))*100),sube:num(it.cambio)>0,antes:num(it.ref)});
    });
    (p.mas||[]).forEach(it=>{if(it.falta&&it.para!=='moravia')sinPrecio.push(it.t||'Algo más');});
    out[p.prov]={noLlego,sinPrecio,cambios};
  });
  return out;
}
// El cuadre de la plata del viaje (es del viaje entero, las dos tiendas juntas)
function cuadreCierre(c){
  if(c.llevo==null)return{estado:'sin'};
  const llevo=ent(c.llevo),pagado=c.porPago&&c.porPago.efectivo!=null?ent(c.porPago.efectivo):llevo-ent(c.debe),debe=c.debe!=null?ent(c.debe):llevo-pagado;
  if(c.regreso==null)return{estado:'espera',llevo,pagado,debe};
  const regreso=ent(c.regreso),dif=c.dif!=null?ent(c.dif):regreso-debe;
  return{estado:dif===0?'cuadra':dif<0?'falta':'sobra',llevo,pagado,debe,regreso,dif};
}
// ¿lo que dice la factura calza con lo anotado? total = todo lo anotado con ese proveedor; propio = lo de Los Ángeles
function compararFactura(monto,total,propio){
  const m=ent(monto);if(!m)return{estado:'vacio'};
  if(m===ent(total))return{estado:'cuadra',dif:0};
  if(propio!=null&&ent(propio)!==ent(total)&&m===ent(propio))return{estado:'cuadra-propio',dif:0};
  return{estado:m>ent(total)?'mas':'menos',dif:m-ent(total)};
}
const hayFuera=(id)=>!!(data.autoFuera||{})[id];

/* ---------- la caja ---------- */
// ¿Una entrega pagada con la caja necesita su salida del cajón? Si la caja de ese día todavía resta las compras en
// efectivo por su cuenta (la plata de los tres sin empezar y sin las ventas exactas del POS), la entrega ya baja lo
// que debe haber en el cajón como compra en efectivo: poner también la salida lo restaría dos veces.
const necesitaSalida=f=>{let x=false;try{x=!!clIntocable(f)||clCajaTransactionsFor(f).length>0;}catch(e){x=true;}return x;};
function salidaEntrega(e){
  if(!CC)return;
  if(e.pago==='caja'&&necesitaSalida(e.f))CC.ponerSalida(e.f,{enlace:'e:'+e.id,monto:ent(e.total),motivo:'Entrega de '+e.prov,foto:false});
  else CC.quitarSalida('e:'+e.id);
}
function salidaAbono(m,prov){
  if(!CC)return;
  if(m.de==='caja')CC.ponerSalida(m.f,{enlace:'a:'+m.id,monto:ent(m.monto),motivo:'Pago a '+(prov||'un proveedor'),foto:false});
  else CC.quitarSalida('a:'+m.id);
}
// si la caja cambió de forma (llegaron las ventas exactas del POS, o empezó la plata de los tres), la salida de las
// entregas de los últimos días se acomoda sola
function cuadrarSalidas(){
  if(!CC)return false;
  let cambio=false;const desde=clDateAdd(hoyISO(),-3);
  listaEnt().forEach(e=>{
    if(!e||e.pago!=='caja'||e.f<desde)return;
    try{if(window.Cierres&&typeof Cierres.congelado==='function'&&Cierres.congelado(e.f))return;}catch(x){}
    const hay=!!CC.salidaDe('e:'+e.id),necesita=necesitaSalida(e.f);
    if(necesita&&!hay){salidaEntrega(e);cambio=true;}else if(!necesita&&hay){CC.quitarSalida('e:'+e.id);cambio=true;}
  });
  return cambio;
}
window.addEventListener('aramo-puente',()=>{try{if(cuadrarSalidas())save();}catch(e){console.error(e);}});

/* ---------- la factura: de un renglón del mercado o de una entrega ---------- */
const esEntrega=id=>/^e:/.test(id);
function facturaDe(id){
  if(esEntrega(id)){const e=entregaPor(id.slice(2));return{tiene:!!(e&&e.foto),foto:id,monto:e&&e.facturaMonto!=null?ent(e.facturaMonto):null};}
  const x=mapaFact()[id];
  return{tiene:!!x,foto:'f:'+id,monto:x&&x.monto!=null?ent(x.monto):null};
}
// lo anotado con ese proveedor, para ponerlo al lado del papel: cada producto con su cantidad, precio y monto
function esperadoFactura(id){
  if(esEntrega(id)){
    const e=entregaPor(id.slice(2));if(!e)return null;
    return{prov:e.prov,total:ent(e.total),propio:ent(e.total),
      lineas:(e.items||[]).map(i=>({t:i.t,q:num(i.q),u:i.u||'',precio:num(i.precio),monto:ent(i.monto),aqui:ent(i.monto)})),sinLista:!(e.items||[]).length};
  }
  let hallado=null;
  ((PU&&PU.cierres)?PU.cierres():[]).some(c=>(c.provs||[]).some(p=>{if('c:'+c.id+':'+p.prov===id){hallado={c,p};return true;}return false;}));
  if(hallado){
    const p=hallado.p,lineas=[];
    (p.items||[]).forEach(it=>{if(num(it.q)>0)lineas.push({t:it.t||'',q:num(it.q),u:it.u||'',precio:num(it.precio),monto:ent(it.sub),aqui:ent(it.sa),falta:!!it.falta});});
    (p.mas||[]).forEach(it=>{if(num(it.q)>0)lineas.push({t:it.t||'Algo más',q:num(it.q),u:it.u||'',precio:num(it.precio),monto:ent(it.sub),aqui:ent(it.sa),falta:!!it.falta});});
    return{prov:p.prov,total:ent(p.total),propio:ent(p.ta),lineas,sinLista:!lineas.length};
  }
  const l=(typeof clAutoLineas==='function'?clAutoLineas(hoyISO()):[]).find(x=>x.id===id);
  return l?{prov:l.titulo,total:ent(l.monto),propio:ent(l.monto),lineas:(l.items||[]).map(i=>({...i,aqui:ent(i.monto)})),sinLista:!(l.items||[]).length}:null;
}

window.Compras={
  campoDeEntrega,entregas:f=>entregasDe(f).map(e=>({...e})),entrega:id=>{const e=entregaPor(id);return e?{...e}:null;},
  abonos:abonosDe,pagado:id=>pagadoDe(id),saldo:id=>{const e=entregaPor(id);return e?saldoDe(e):0;},
  porPagar,debeTotal,costos,total,sinDetalle,analizarCierre,cuadreCierre,compararFactura,facturaDe,esperadoFactura,
  cuadrarSalidas,textoVence
};

/* =========================================================================================================
   La pantalla
   ========================================================================================================= */
(window.CX_MODULOS=window.CX_MODULOS||[]).push(u=>{
  if(u.alReiniciar)u.alReiniciar(()=>{data.entregas=[];data.facturas={};});
const {col,ic,N,sumar,hora}=u;
const E=u.estado;
const permiso=async f=>{try{return !(window.Cierres&&Cierres.permiso)||!!(await Cierres.permiso(f));}catch(e){return true;}};
const pagaTxt=p=>p==='caja'?'La caja':p==='bolsa'?'La bolsa':p==='credito'?'Se debe':N(p);
const fechaIn=(f,n)=>clDateAdd(f,n);

/* ----- las partes del día: la suma de los bloques da exacto lo que suma el motor ----- */
function partes(f,D,L){
  D=D||clComputeWeek(clMonday(f)).perDay.find(x=>x.date===f);
  L=L||u.renglones(f,'com');
  const raw=clDailyRaw(f),fuera=data.autoFuera||{};
  const cuenta=r=>!(r.tipo==='auto'&&(r.fuera||r.tapado));
  const mer=L.filter(r=>r.tipo==='auto'&&/^[cgr]:/.test(r.id));
  const otrosAuto=L.filter(r=>r.tipo==='auto'&&!/^[cgre]:/.test(r.id));
  const man=L.filter(r=>r.tipo==='mov'||r.tipo==='hoja');
  const ents=entregasDe(f).map(e=>{const fu=!!fuera['e:'+e.id],tapada=!!num(raw[campoDeEntrega(e)]);return{e,cuenta:!fu&&!tapada,fuera:fu,tapada};});
  const hojaCred=num(raw.comprasCredito);
  const cinco=['comprasEfectivo','comprasSinpe','comprasTarjeta','comprasUber','comprasCredito'];
  const viejas=Math.round((num(D.comprasTotal)-cinco.reduce((t,k)=>t+num(D.manual[k]),0))*100)/100;
  const m=sumar(mer.filter(cuenta),r=>r.monto),en=sumar(ents.filter(x=>x.cuenta),x=>ent(x.e.total));
  const ot=sumar(man,r=>r.monto)+sumar(otrosAuto.filter(cuenta),r=>r.monto)+hojaCred;
  return{mer,otrosAuto,man,ents,hojaCred,viejas,mercado:m,entregas:en,otras:ot,suma:m+en+ot+viejas,comprasTotal:num(D.comprasTotal)};
}
window.Compras.partes=partes;

/* ----- piezas ----- */
const aviso=(t,o)=>u.aviso(t,o);
// marca el error del campo y deja la ventanita abierta (guardar devuelve false)
const fallo=(c,t)=>{u.fallo(c,t);return false;};
const caja=(texto,clase)=>`<p class="cm-aviso ${clase||''}">${texto}</p>`;
function pagoMarca(e){
  if(e.pago==='credito'){const s=saldoDe(e);return s<=0?'<span class="cx-marca bien">Ya se pagó</span>':'<span class="cx-marca ojo">Se debe</span>';}
  return '';
}
function pagoLinea(e){
  const act=u.plataActiva(e.f);
  if(e.pago==='caja')return`${ic('caja',16)}<span>Pagó la caja</span>`;
  if(e.pago==='bolsa')return`${ic('bolsa',16)}<span>Pagó la bolsa${e.como==='sinpe'?' · SINPE':e.como==='tarjeta'?' · tarjeta':''}</span>`;
  if(e.pago==='credito'){
    const s=saldoDe(e),d=e.vence?diasEntre(hoyISO(),e.vence):null;
    if(s<=0)return`${ic('listo',16)}<span>Ya se pagó</span>`;
    return`${ic('reloj',16)}<span>Se debe: faltan ${fmt(s)}${e.vence?` · ${textoVence(d)}`:''}</span>`;
  }
  return`${ic('persona',16)}<span>Pagó ${esc(N(e.pago))}${e.como==='sinpe'?' · SINPE':e.como==='tarjeta'?' · tarjeta':e.como==='efectivo'?' · efectivo':''}${act?' · la bolsa se lo devuelve':''}</span>`;
}
function detalleItems(items,id){
  if(!items.length)return'';
  return`<div class="cx-detalle"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Monto</th></tr></thead><tbody>${items.map(i=>`<tr><td>${esc(i.t)}</td><td>${qTxt(i.q)}${i.u?' '+esc(i.u):''}</td><td>${fmt(i.precio)}</td><td>${fmt(i.monto)}</td></tr>`).join('')}</tbody></table></div>`;
}
// la tirita de la factura: si ya la tiene (con su mini foto) o si falta
function tiraFactura(id,apagada){
  if(apagada)return'';
  const fa=facturaDe(id);
  if(fa.tiene){
    const es=esperadoFactura(id),cmp=fa.monto!=null&&es?compararFactura(fa.monto,es.total,es.propio):null;
    const nota=cmp?(cmp.estado==='cuadra'?'<span class="cx-marca bien">Cuadra</span>':cmp.estado==='cuadra-propio'?'<span class="cx-marca bien">Cuadra con lo de esta tienda</span>':`<span class="cx-marca ojo">Dice ${fmt(Math.abs(cmp.dif))} ${cmp.dif>0?'más':'menos'}</span>`):'';
    return`<div class="cm-fact"><button type="button" class="cm-fact-b" data-cx="cm-factura" data-id="${esc(id)}" aria-label="Ver la factura y su resumen"><span class="cx-mini cm-mini"><img data-foto="${esc(fa.foto)}" alt=""></span><span class="cm-fact-t"><b>Con factura</b><small>Tocá para ver la foto y el resumen</small></span></button>${nota}</div>`;
  }
  return`<div class="cm-fact"><button type="button" class="cm-fact-b falta" data-cx="cm-factura" data-id="${esc(id)}"><span class="cm-fact-ico" aria-hidden="true">${ic('camara',22)}</span><span class="cm-fact-t"><b>Falta la factura</b><small>Sacale la foto y compará con lo anotado</small></span></button></div>`;
}

/* ----- bloque: lo que cuesta comprar en el día (pastillas de quién pagó) ----- */
function pastillas(f,P){
  const q={};
  if(u.plataActiva(f)&&PL)PL.compras(f).forEach(c=>{q[c.pago]=(q[c.pago]||0)+c.monto;});
  else P.ents.forEach(x=>{if(x.cuenta)q[x.e.pago]=(q[x.e.pago]||0)+ent(x.e.total);});
  const L=Object.entries(q).filter(x=>x[1]).sort((a,b)=>['caja','bolsa','jefes','roger','joseph','credito'].indexOf(a[0])-['caja','bolsa','jefes','roger','joseph','credito'].indexOf(b[0]));
  if(!L.length)return'';
  const cl=k=>k==='bolsa'?'':k==='caja'?' cm-caja':k==='credito'?' cm-debe':' bolsillo';
  return`<div class="cx-quien-pagos" aria-label="Cómo se pagaron las compras del día">${L.map(([k,v])=>`<span class="cx-quien-pago${cl(k)}">${esc(pagaTxt(k))} <b>${fmt(v)}</b></span>`).join('')}</div>
  ${u.plataActiva(f)?'':'<p class="cm-expl cm-expl-p">Aquí se cuentan las entregas. Cuando empiece la plata de los tres, también las demás compras.</p>'}`;
}
function medios(D){
  const L=[['Efectivo','comprasEfectivo'],['SINPE','comprasSinpe'],['Tarjeta','comprasTarjeta'],['Uber','comprasUber'],['A crédito','comprasCredito']].filter(([,k])=>Math.round(num(D.manual[k])));
  return L.length?`<p class="cm-medios"><span>En qué se pagó:</span> ${L.map(([t,k])=>`<b>${t}</b> ${fmt(D.manual[k])}`).join(' · ')}</p>`:'';
}

/* ----- bloque: del mercado ----- */
const esDelCierre=(id,cid)=>/^[cgr]:/.test(id)&&id.slice(2).startsWith(cid+':');
function avisosProv(a){
  if(!a)return'';
  let h='';
  if(a.noLlego.length)h+=caja(`<b>No llegó completo:</b> ${a.noLlego.map(x=>`${esc(x.t)} (pidieron ${qTxt(x.pidio)}${x.u?' '+esc(x.u):''}, ${x.llego>0?'llegaron '+qTxt(x.llego):'no llegó nada'})`).join(' · ')}.`,'ojo');
  if(a.sinPrecio.length)h+=caja(`<b>Sin precio:</b> ${a.sinPrecio.map(esc).join(', ')}. Ese renglón vale ₡0 por ahora y la compra queda corta. Ponele el precio en el Cierre de compras.`,'ojo');
  if(a.cambios.length)h+=caja(a.cambios.map(x=>`${esc(x.t)} ${x.sube?'subió':'bajó'} ${x.pct} % (antes ${fmt(x.antes)})`).join(' · ')+'.','info');
  return h;
}
function cuadreHTML(c){
  const q=cuadreCierre(c);
  if(q.estado==='sin')return`<p class="cm-cuadre info"><b>La plata del viaje</b>No se anotó cuánta plata se llevaron, así que no se puede revisar si cuadra.</p>`;
  const base=`Llevó ${fmt(q.llevo)} · pagó ${fmt(q.pagado)} en efectivo · tenía que volver con ${fmt(q.debe)}`;
  let fin,cl;
  if(q.estado==='espera'){fin='todavía no anotaron cuánto volvió';cl='ojo';}
  else if(q.estado==='cuadra'){fin=`volvió con ${fmt(q.regreso)} · cuadra`;cl='bien';}
  else if(q.estado==='falta'){fin=`volvió con ${fmt(q.regreso)} · faltaron ${fmt(-q.dif)}`;cl='mal';}
  else{fin=`volvió con ${fmt(q.regreso)} · sobraron ${fmt(q.dif)}`;cl='ojo';}
  return`<p class="cm-cuadre ${cl}"><b>La plata del viaje <i>(las dos tiendas juntas)</i></b>${base} · ${fin}</p>`;
}
function cardCierre(c,P,f,hayVarios){
  const lineas=P.mer.filter(r=>esDelCierre(r.id,c.id)),cuentan=lineas.filter(r=>!(r.fuera||r.tapado)),tot=sumar(cuentan,r=>r.monto);
  const todoFuera=lineas.length>0&&lineas.every(r=>r.fuera);
  const an=analizarCierre(c);
  const prov=r=>{
    const art=u.tarjetaRenglon(r,'com');
    if(!/^c:/.test(r.id))return art;
    const extra=avisosProv(an[r.titulo])+tiraFactura(r.id,r.fuera||r.tapado);
    return`<div class="cm-prov">${art}${extra?`<div class="cm-extra">${extra}</div>`:''}</div>`;
  };
  // un proveedor sin ningún monto para esta tienda pero con productos sin precio: que no se pierda el aviso
  const sueltos=(c.provs||[]).filter(p=>!lineas.some(r=>r.id==='c:'+c.id+':'+p.prov)&&an[p.prov]&&(an[p.prov].sinPrecio.length||an[p.prov].noLlego.length)).map(p=>`<div class="cm-prov"><article class="cx-renglon"><div class="cx-renglon-b"><span class="cx-ico" aria-hidden="true">${ic('camion',20)}</span><span class="cx-renglon-t"><b>${esc(p.prov)}</b><small>Todavía sin monto para esta tienda</small></span><span class="cx-renglon-m"><b>${fmt(0)}</b></span></div></article><div class="cm-extra">${avisosProv(an[p.prov])}</div></div>`).join('');
  return`<section class="cm-cierre" data-cierre="${esc(c.id)}">
    <header class="cm-cierre-h"><span class="cx-ico" aria-hidden="true">${ic('camion',20)}</span>
      <div class="cm-cierre-t"><b>Cierre de compras de las ${esc(hora(c.inicio)||'—')}</b><small>${c.firma?'Compró '+esc(c.firma)+' · ':''}lo de Los Ángeles</small></div>
      <b class="cm-cierre-m${todoFuera?' off':''}">${todoFuera?'<s>'+fmt(sumar(lineas,r=>r.monto))+'</s>':fmt(tot)}</b></header>
    ${cuadreHTML(c)}
    ${todoFuera?caja('Este cierre no se está contando.','ojo'):''}
    ${hayVarios?`<button type="button" class="cx-enlace cm-cierre-x" data-cx="cm-cierre-fuera" data-id="${esc(c.id)}">${todoFuera?'Volver a contar este cierre':'No contar este cierre'}</button>`:''}
    ${lineas.length||sueltos?`<div class="cx-lista cm-provs">${lineas.map(prov).join('')}${sueltos}</div>`:'<p class="cx-nota">Este cierre no trae compras para Los Ángeles.</p>'}
  </section>`;
}
function bMercado(f,P){
  const cierres=(PU&&PU.cierresDia?PU.cierresDia(f,TIENDA)||[]:[]).slice().sort((a,b)=>num(a.inicio)-num(b.inicio));
  if(!cierres.length&&!P.mer.length)return'';
  const usados=new Set();
  cierres.forEach(c=>P.mer.forEach(r=>{if(esDelCierre(r.id,c.id))usados.add(r.id);}));
  const restos=P.mer.filter(r=>!usados.has(r.id));
  return`<h2 class="cx-h2">Del mercado <span>${col(P.mercado)}</span></h2>
  <p class="cm-expl">Llega solo del Cierre de compras de Inventario. Es lo que le tocó a Los Ángeles: cada proveedor, con sus productos y su factura.</p>
  ${cierres.length>1?caja(`<b>Hay ${cierres.length} cierres de compras este día.</b> Si es la misma compra, dejá uno sin contar.`,'ojo cm-dup'):''}
  ${cierres.map(c=>cardCierre(c,P,f,cierres.length>1)).join('')}
  ${restos.length?`<div class="cx-lista">${restos.map(r=>u.tarjetaRenglon(r,'com')).join('')}</div>`:''}`;
}

/* ----- bloque: entregas en la tienda ----- */
function cardEntrega(x){
  const e=x.e,abierta=E.abiertos.has('e:'+e.id),n=(e.items||[]).length,apagada=!x.cuenta;
  const meta=[hora(e.at),n?`${n} producto${n===1?'':'s'}`:'Solo el total',e.recibio?'la recibió '+e.recibio:''].filter(Boolean).join(' · ');
  const sal=e.pago==='credito'?`<button type="button" class="cx-segundo cm-pagar" data-cx="cm-pagar" data-id="${esc(e.id)}">${ic('efectivo',18)} Pagar${saldoDe(e)>0?'':' (ya está pagada)'}</button>`:'';
  return`<div class="cm-prov">
    <article class="cx-renglon${apagada?' apagada':''}"><button type="button" class="cx-renglon-b" data-cx="cm-ent" data-id="${esc(e.id)}" aria-label="Corregir la entrega de ${esc(e.prov)}">
      <span class="cx-ico" aria-hidden="true">${ic('tienda',20)}</span>
      <span class="cx-renglon-t"><b>${esc(e.prov)}</b><small>${esc(meta)}</small>${e.nota?`<small>${esc(e.nota)}</small>`:''}</span>
      <span class="cx-renglon-m">${pagoMarca(e)}<b>${apagada?'<s>'+fmt(e.total)+'</s>':fmt(e.total)}</b></span></button></article>
    <div class="cm-extra">
      <span class="cm-pago ${e.pago==='credito'&&saldoDe(e)>0?(e.vence&&diasEntre(hoyISO(),e.vence)<0?'mal':'ojo'):''}">${pagoLinea(e)}</span>
      ${x.tapada?caja('No se está sumando: esa casilla tiene un número escrito en la hoja completa.','ojo'):''}
      ${n?`<button type="button" class="cx-enlace" data-cx="cm-ent-ver" data-id="${esc(e.id)}" aria-expanded="${abierta}">${abierta?'Ocultar los productos':'Ver '+n+' producto'+(n===1?'':'s')}</button>`:'<small class="cm-sin-lista">Sin lista de productos: con el detalle se sabe cuánto ganás con cada uno.</small>'}
      ${abierta?detalleItems(e.items||[]):''}
      ${tiraFactura('e:'+e.id,false)}
      ${sal}
    </div></div>`;
}
function bEntregas(f,P){
  return`<h2 class="cx-h2">Entregas en la tienda <span>${col(P.entregas)}</span></h2>
  <p class="cm-expl">Lo que un proveedor deja en la tienda, ya no en el mercado. Se anota aquí con su factura y quién lo pagó.</p>
  <div class="cx-lista">${P.ents.length?P.ents.map(cardEntrega).join(''):vacioEnt(f)}</div>`;
}
const vacioEnt=f=>u.vacio(f>hoyISO()?'Este día todavía no llega.':'Ninguna entrega este día. Cuando un proveedor traiga algo a la tienda, tocá «Recibir una entrega».');

/* ----- bloque: otras compras (anotadas a mano) ----- */
function bOtras(f,P){
  const hay=P.man.length||P.otrosAuto.length||P.hojaCred||Math.abs(P.viejas)>=1;
  if(!hay)return'';
  return`<h2 class="cx-h2">Otras compras <span>${col(P.otras+P.viejas)}</span></h2>
  <p class="cm-expl">Lo que se anotó a mano, con quién lo pagó y su foto.</p>
  <div class="cx-lista">${P.man.concat(P.otrosAuto).map(r=>u.tarjetaRenglon(r,'com')).join('')}
    ${P.hojaCred?`<article class="cx-renglon"><div class="cx-renglon-b"><span class="cx-ico" aria-hidden="true">${ic('hoja',20)}</span><span class="cx-renglon-t"><b>Anotado en la hoja (a crédito)</b><small>Se cambia en Más → Hoja completa</small></span><span class="cx-renglon-m"><b>${fmt(P.hojaCred)}</b></span></div></article>`:''}
    ${Math.abs(P.viejas)>=1?`<article class="cx-renglon"><div class="cx-renglon-b"><span class="cx-ico" aria-hidden="true">${ic('hoja',20)}</span><span class="cx-renglon-t"><b>Registros viejos</b><small>Se cambian en Más → Hoja completa</small></span><span class="cx-renglon-m"><b>${fmt(P.viejas)}</b></span></div></article>`:''}
  </div>`;
}

/* ----- bloque: por pagar (resumen) ----- */
function bPorPagar(){
  const L=porPagar();if(!L.length)return'';
  const t=L.reduce((s,x)=>s+x.saldo,0),p=L[0],venc=L.some(x=>x.vencida);
  return`<h2 class="cx-h2">Por pagar <span>${col(t)}</span></h2>
  <p class="cm-expl">Compras que ya llegaron y todavía no se han pagado. Contaron como compra el día que llegaron: pagarlas solo mueve plata.</p>
  <button type="button" class="cx-fila cm-deudas${venc?' vencida':''}" data-cx="cm-deudas"><span class="cx-ico" aria-hidden="true">${ic('reloj',20)}</span><span class="cx-fila-t"><b>${L.length===1?'Una cuenta por pagar':L.length+' cuentas por pagar'}</b><small>La próxima: ${esc(p.prov)}, ${esc(textoVence(p.dias))}</small></span><b>${fmt(t)}</b>${ic('siguiente',20)}</button>`;
}

/* ----- la pantalla ----- */
function vCompras(){
  const D=u.dia(),W=u.semana(),f=D.date,L=u.renglones(f,'com'),P=partes(f,D,L);
  const sem=sumar(W.perDay,d=>d.comprasTotal);
  const hayAlgo=P.mer.length||P.ents.length||P.man.length||P.otrosAuto.length||P.hojaCred||Math.abs(P.viejas)>=1||(PU&&PU.cierresDia&&PU.cierresDia(f,TIENDA).length);
  return u.barra()+u.tiraDias()+u.cabeza(u.diaLargo(f),'Compras',col(D.comprasTotal),`Semana: <b>${col(sem)}</b> · incluye lo que se debe`,'com')+`
  ${pastillas(f,P)}
  ${medios(D)}
  ${u.ranuraDe('compras:arriba')}
  ${hayAlgo?'':u.vacio('Ninguna compra este día. Las del Cierre de compras llegan solas; las que traen los proveedores se anotan con «Recibir una entrega»; las demás, con la foto de la factura y quién la pagó.')}
  ${bMercado(f,P)}
  ${bEntregas(f,P)}
  ${bOtras(f,P)}
  ${bPorPagar()}
  ${u.ranuraDe('compras:abajo')}
  <button type="button" class="cx-segundo ancho" data-cx="cm-otra">${ic('mas',18)} Anotar otra compra</button>
  <div class="cx-pie" data-ui-abajo><button type="button" class="cx-accion" data-cx="cm-recibir"><span>Recibir una entrega</span>${u.flecha('mas')}</button></div>`;
}
u.vista('compras',vCompras);

/* ----- por pagar: la lista completa ----- */
function vPagar(){
  const L=porPagar(),t=L.reduce((s,x)=>s+x.saldo,0),h=hoyISO();
  const pagadas=listaEnt().filter(e=>e&&e.pago==='credito'&&saldoDe(e)<=0).sort((a,b)=>b.f.localeCompare(a.f)).slice(0,8);
  const tarj=x=>{
    const e=entregaPor(x.id),ab=abonosDe(x.id);
    const marca=`<span class="cx-marca ${x.vencida?'mal':x.dias!=null&&x.dias<=2?'ojo':'info'}">${esc(textoVence(x.dias))}</span>`;
    return`<article class="cm-deuda${x.vencida?' vencida':''}">
      <div class="cm-deuda-c"><span class="cx-ico" aria-hidden="true">${ic('reloj',20)}</span>
        <span class="cx-renglon-t"><b>${esc(x.prov)}</b><small>Llegó ${esc(u.diaCorto(x.f))} (${textoHace(diasEntre(x.f,h))}) · total ${fmt(x.total)}${x.pagado?' · ya pagó '+fmt(x.pagado):''}</small></span>
        <span class="cx-renglon-m">${marca}<b>${fmt(x.saldo)}</b></span></div>
      <div class="cm-deuda-acc"><button type="button" class="cx-segundo" data-cx="cm-pagar" data-id="${esc(x.id)}">${ic('efectivo',18)} Pagar</button><button type="button" class="cx-enlace" data-cx="cm-ent" data-id="${esc(x.id)}">Ver la entrega</button></div>
      ${ab.length?`<div class="cm-abonos">${ab.map(m=>`<button type="button" class="cx-enlace" data-cx="cm-abono" data-id="${esc(m.id)}">Pagó ${fmt(m.monto)} el ${esc(u.diaCorto(m.f))} · ${esc(m.de==='caja'?'con la caja':m.de==='bolsa'?'con la bolsa':'lo pagó '+N(m.de))}</button>`).join('')}</div>`:''}
      ${e&&e.vence?`<small class="cm-vence">Para pagar el ${esc(u.diaCorto(e.vence))}</small>`:''}
    </article>`;
  };
  return u.barra()+`<div class="cx-cab"><button type="button" class="cx-pastilla" data-cx="ir" data-v="compras">${ic('atras',20)}<span>Compras</span></button>
    <p class="cx-sobre">Lo que se debe</p><h1 class="cx-tit">Por pagar</h1>
    <p class="cx-cifra cx-t-com">${col(t)}</p>
    <p class="cx-cab-pie">Compras que ya llegaron y todavía no se han pagado. Cada una contó como compra el día que llegó; pagarla solo mueve plata, no cambia la ganancia.</p></div>
  ${L.length?`<div class="cx-lista">${L.map(tarj).join('')}</div>`:u.vacio('Nada por pagar. Cuando recibás una entrega y escojás «Se debe», aparece aquí hasta que se pague.')}
  ${pagadas.length?`<h2 class="cx-h2">Ya pagadas <span>${pagadas.length}</span></h2><div class="cx-lista">${pagadas.map(e=>`<article class="cx-renglon"><button type="button" class="cx-renglon-b" data-cx="cm-ent" data-id="${esc(e.id)}"><span class="cx-ico" aria-hidden="true">${ic('listo',20)}</span><span class="cx-renglon-t"><b>${esc(e.prov)}</b><small>Llegó ${esc(u.diaCorto(e.f))}</small></span><span class="cx-renglon-m"><span class="cx-marca bien">Pagada</span><b>${fmt(e.total)}</b></span></button></article>`).join('')}</div>`:''}
  <button type="button" class="cx-segundo ancho" data-cx="ir" data-v="compras">${ic('atras',18)} Volver a Compras</button>`;
}
u.vista('compras-pagar',vPagar);

/* ----- el cuadro del Inicio y lo que falta ----- */
u.cuadro({id:'compras',orden:30,vista:'compras',tono:'com',icono:'camion',nombre:'Compras',dato:(D)=>{
  const L=porPagar(),t=L.reduce((s,x)=>s+x.saldo,0),venc=L.some(x=>x.vencida);
  return{num:col(D.comprasTotal),sub:'comprado '+u.cuando(D.date)+(t?` · debés ${fmt(t)}`:''),clase:venc?'alerta':''};
}});
u.pendiente(D=>{
  const h=hoyISO();if(D.date!==h)return[];
  return porPagar().filter(x=>x.vence&&x.vence<=h).map(x=>({a:'cm-pagar',id:x.id,q:`Hay que pagarle a ${x.prov}`,d:`${x.dias<0?'Venció '+textoVence(x.dias).replace('venció ',''):'Vence hoy'}: faltan ${fmt(x.saldo)}.`,b:'Pagar'}));
});

/* =========================================================================================================
   Ventanitas
   ========================================================================================================= */
const parseQ=v=>{const n=Number(String(v).replace(',','.').replace(/[^\d.]/g,''));return isFinite(n)?Math.round(n*1000)/1000:0;};
const dos=n=>String(n).padStart(2,'0');
const opsPago=(f,actual)=>{
  const o=[{v:'caja',t:'Con la caja',ic:'caja'}];
  if(u.plataActiva(f)||actual==='bolsa')o.push({v:'bolsa',t:'Con la bolsa',ic:'bolsa'});
  (PL?PL.IDS:[]).forEach(id=>o.push({v:id,t:'Lo pagó '+N(id),ic:'persona'}));
  return o;
};
function provConocidos(){
  const v=new Set(),out=[];
  const poner=n=>{n=String(n||'').trim();if(n&&!v.has(n.toLowerCase())){v.add(n.toLowerCase());out.push(n);}};
  (data.provEntrega||[]).forEach(x=>poner(x&&x.n));
  listaEnt().slice().reverse().forEach(e=>poner(e&&e.prov));
  return out;
}
function recordarProv(n){
  const L=(Array.isArray(data.provEntrega)?data.provEntrega:[]).filter(x=>x&&String(x.n).toLowerCase()!==n.toLowerCase());
  L.unshift({n});data.provEntrega=L.slice(0,40);
}
function nombresProductos(){
  const v=new Set(),out=[];
  listaEnt().forEach(e=>(e.items||[]).forEach(i=>{if(i.t&&!v.has(i.t.toLowerCase())){v.add(i.t.toLowerCase());out.push(i.t);}}));
  try{((window.ARAMO_CAT&&ARAMO_CAT.LISTA)||[]).forEach(p=>{if(p&&p.n&&!v.has(p.n.toLowerCase())){v.add(p.n.toLowerCase());out.push(p.n);}});}catch(e){}
  return out;
}
const unidadCat=n=>{try{const p=((window.ARAMO_CAT&&ARAMO_CAT.LISTA)||[]).find(x=>x.n&&x.n.toLowerCase()===n.toLowerCase());return p?(p.u==='unid'?'unidad':p.u):'';}catch(e){return'';}};
function ultimoPrecio(prov,t){
  const k=t.trim().toLowerCase();let r=null;
  listaEnt().forEach(e=>{if(!e||(prov&&String(e.prov).toLowerCase()!==prov.toLowerCase()))return;(e.items||[]).forEach(i=>{if(String(i.t).toLowerCase()===k)r={precio:num(i.precio),u:i.u};});});
  return r;
}
const unidades=x=>{const l=['kg','unidad','caja'];if(x&&!l.includes(x))l.push(x);return l;};
const filaProd=it=>`<div class="cm-prod">
  <label class="cm-f"><span class="cx-et">Producto</span><input class="ui-campo-in cm-p-t" type="text" list="cmCat" autocomplete="off" maxlength="60" placeholder="Ej.: Papa" value="${esc(it&&it.t||'')}"></label>
  <div class="cm-p-3">
    <label class="cm-f"><span class="cx-et">Cantidad</span><input class="ui-campo-in cm-p-q" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="${it&&it.q?esc(String(it.q).replace('.',',')):''}"></label>
    <label class="cm-f"><span class="cx-et">Unidad</span><select class="ui-campo-in cm-p-u">${unidades(it&&it.u).map(x=>`<option${((it&&it.u)||'kg')===x?' selected':''}>${esc(x)}</option>`).join('')}</select></label>
    <label class="cm-f"><span class="cx-et">Precio</span><span class="cx-monto cm-p-mo"><i aria-hidden="true">₡</i><input class="cm-p-pr" type="text" inputmode="numeric" autocomplete="off" placeholder="0" value="${it&&it.precio?Math.round(it.precio):''}"></span></label>
  </div>
  <div class="cm-p-pie"><span class="cm-p-m">Monto <b>₡0</b></span><button type="button" class="cx-enlace cm-p-x">Quitar</button></div>
  <span class="cx-error" role="alert"></span></div>`;

// Recibir (o corregir) una entrega
function recibirEntrega(o){
  o=o||{};const r=o.entrega||null,h0=hoyISO(),f=r?r.f:(E.dia>h0?h0:E.dia);
  const activa=u.plataActiva(f);
  let pago=r?r.pago:(activa?'bolsa':'caja'),como=r&&r.como?r.como:(pago==='caja'||pago==='bolsa'?'efectivo':'sinpe'),comoTocado=!!(r&&r.como);
  const tieneAbonos=r?abonosDe(r.id).length>0:false;
  const prevItems=r?(r.items||[]):[];
  let venceOp='8',venceFecha='';
  if(r&&r.vence){const d=diasEntre(r.f,r.vence);if(d===8||d===15)venceOp=String(d);else{venceOp='otra';venceFecha=r.vence;}}
  const conocidos=provConocidos().slice(0,8);
  const html=`
    <datalist id="cmCat">${nombresProductos().map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>
    ${conocidos.length?u.chips('provc','¿Quién entregó?',conocidos.map(n=>({v:n,t:n})),r?r.prov:null,''):''}
    <label class="cx-campo" data-campo-de="provt">${conocidos.length?'':'<span class="cx-et">¿Quién entregó?</span>'}<input id="cmProv" class="ui-campo-in" type="text" autocomplete="off" maxlength="60" placeholder="${conocidos.length?'O escribí un proveedor nuevo':'Nombre del proveedor'}" value="${esc(r?r.prov:'')}" ${conocidos.length?'aria-label="Proveedor nuevo"':''}><span class="cx-error" role="alert"></span></label>
    <div class="cx-campo cm-prods-c" data-campo-de="prods"><span class="cx-et">¿Qué trajo?</span>
      <span class="cx-ayuda">Con el detalle de cada producto se sabe cuánto se gana con él. Si no lo tenés a mano, escribí solo el total más abajo.</span>
      <div id="cmProds">${(prevItems.length?prevItems:[null]).map(filaProd).join('')}</div>
      <button type="button" class="cx-segundo cm-otro" id="cmAdd">${ic('mas',18)} Agregar otro producto</button></div>
    ${u.campoMonto('cmT','Total de la entrega',r?r.total:'','')}
    ${u.chips('pago','¿Cómo se pagó?',opsPago(f,pago).concat([{v:'credito',t:'Se debe',ic:'reloj'}]),pago,activa?'Si fue de su bolsillo, la bolsa se lo devuelve completo.':'')}
    <div class="cx-campo" data-campo-de="vence"><span class="cx-et">¿Para cuándo hay que pagarla?</span>
      <div class="cx-chips" role="group" aria-label="Para cuándo" data-grupo="venceop">${[['8','En 8 días'],['15','En 15 días'],['otra','Otra fecha']].map(([v,t])=>`<button type="button" class="cx-chip" data-op="${v}" aria-pressed="${v===venceOp}"><span>${t}</span></button>`).join('')}</div>
      <input id="cmVence" class="ui-campo-in cm-fecha" type="date" min="${f}" value="${esc(venceFecha)}" aria-label="Fecha para pagar" ${venceOp==='otra'?'':'hidden'}>
      <span class="cx-error" role="alert"></span></div>
    ${u.chips('como','¿En qué se pagó?',[{v:'efectivo',t:'Efectivo',ic:'efectivo'},{v:'sinpe',t:'SINPE',ic:'sinpe'},{v:'tarjeta',t:'Tarjeta',ic:'tarjeta'}],como,'')}
    <div class="cx-campo" data-campo-de="foto">${u.fotoHTML(r&&r.foto,'Foto de la factura')}<span class="cx-error" role="alert"></span></div>
    <details class="cm-mas"${r&&(r.factura||r.recibio||r.nota)?' open':''}><summary>Más datos (si querés)</summary>
      <label class="cx-campo"><span class="cx-et">Número de la factura</span><input id="cmNum" class="ui-campo-in" type="text" autocomplete="off" maxlength="30" value="${esc(r&&r.factura||'')}"></label>
      <label class="cx-campo"><span class="cx-et">¿Quién la recibió?</span><input id="cmRec" class="ui-campo-in" type="text" autocomplete="off" maxlength="40" value="${esc(r?r.recibio||'':(u.quien().n||''))}"></label>
      <label class="cx-campo"><span class="cx-et">Mensaje</span><input id="cmNota" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" value="${esc(r&&r.nota||'')}" placeholder="Ej.: faltó una caja de tomate"></label>
    </details>`;
  return u.ventana({titulo:r?'Corregir la entrega':'Recibir una entrega',sub:u.diaLargo(f),html,clase:'cm-hoja',si:'Guardar',
    borrar:r?()=>borrarEntrega(r):null,borrarTexto:'Borrar esta entrega',
    listo(cuerpo){
      const $=s=>cuerpo.querySelector(s),$$=s=>[...cuerpo.querySelectorAll(s)];
      const prov=$('#cmProv'),tot=$('#cmT'),lista=$('#cmProds'),st=u.atarFoto(cuerpo,r&&'e:'+r.id,r&&r.foto);
      let totalAuto=false;
      const filas=()=>$$('.cm-prod'),val=row=>({t:row.querySelector('.cm-p-t').value.trim(),q:parseQ(row.querySelector('.cm-p-q').value),u:row.querySelector('.cm-p-u').value,precio:u.leerMonto(row.querySelector('.cm-p-pr'))});
      const atar=row=>{u.atarMonto(row.querySelector('.cm-p-pr'));};
      tot.removeAttribute('data-ui-foco');
      const recalc=()=>{
        let suma=0,hay=false;
        filas().forEach(row=>{const v=val(row),m=v.q>0&&v.precio>0?Math.round(v.q*v.precio):0;row.querySelector('.cm-p-m b').textContent=fmt(m);if(m){suma+=m;hay=true;}});
        if(hay){tot.value=suma.toLocaleString('es-CR');tot.readOnly=true;totalAuto=true;tot.closest('.cx-campo').classList.add('cm-auto');}
        else{if(totalAuto){tot.value='';totalAuto=false;}tot.readOnly=false;tot.closest('.cx-campo').classList.remove('cm-auto');}
        const ay=tot.closest('.cx-campo').querySelector('.cx-ayuda');
        const txt=hay?'Es la suma de los productos de arriba.':'Sin lista de productos: escribí lo que dice la factura.';
        if(ay)ay.textContent=txt;else tot.closest('.cx-campo').querySelector('.cx-et').insertAdjacentHTML('afterend',`<span class="cx-ayuda">${txt}</span>`);
      };
      lista.addEventListener('input',e=>{if(e.target.closest('.cm-prod'))recalc();});
      lista.addEventListener('change',e=>{
        const row=e.target.closest('.cm-prod');if(!row||!e.target.matches('.cm-p-t'))return;
        const nombre=e.target.value.trim(),pr=row.querySelector('.cm-p-pr'),un=row.querySelector('.cm-p-u');
        if(!nombre)return;
        const ult=ultimoPrecio(prov.value.trim(),nombre);
        if(ult&&!u.leerMonto(pr)){pr.value=Math.round(ult.precio).toLocaleString('es-CR');}
        const uc=(ult&&ult.u)||unidadCat(nombre);
        if(uc&&!row.querySelector('.cm-p-q').value){if(![...un.options].some(x=>x.value===uc))un.add(new Option(uc,uc));un.value=uc;}
        recalc();
      });
      lista.addEventListener('click',e=>{
        const x=e.target.closest('.cm-p-x');if(!x)return;
        const row=x.closest('.cm-prod');
        if(filas().length>1)row.remove();else{row.querySelectorAll('input').forEach(i=>{i.value='';});row.querySelector('.cm-p-u').value='kg';}
        recalc();
      });
      $('#cmAdd').addEventListener('click',()=>{lista.insertAdjacentHTML('beforeend',filaProd(null));const row=filas().pop();atar(row);row.querySelector('.cm-p-t').focus();recalc();});
      // el proveedor: las fichas lo llenan, y si se escribe otro se sueltan
      prov.addEventListener('input',()=>{$$('[data-grupo="provc"] [data-op]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.op.toLowerCase()===prov.value.trim().toLowerCase())));});
      cuerpo.addEventListener('cambio',ev=>{
        const g=ev.target.dataset.grupo;
        if(g==='provc'){prov.value=ev.detail;}
        else if(g==='pago'){pago=ev.detail;pagoVista();}
        else if(g==='como'){como=ev.detail;comoTocado=true;}
        else if(g==='venceop'){venceOp=ev.detail;$('#cmVence').hidden=venceOp!=='otra';if(venceOp==='otra')$('#cmVence').focus();}
      });
      const pagoVista=()=>{
        $('[data-campo-de="vence"]').hidden=pago!=='credito';
        $('[data-campo-de="como"]').hidden=pago==='credito'||pago==='caja';
        if(pago==='caja'){como='efectivo';}
        else if(!comoTocado&&pago!=='credito'){como=pago==='bolsa'?'efectivo':'sinpe';$$('[data-grupo="como"] [data-op]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.op===como)));}
      };
      pagoVista();recalc();
      // guardar
      cuerpo.__guardar=async()=>{
        const nombre=prov.value.trim();
        if(!nombre)return fallo($('[data-campo-de="provt"]'),'Escribí quién entregó.');
        const items=[];
        for(const row of filas()){
          const v=val(row),vacia=!v.t&&!v.q&&!v.precio;if(vacia)continue;
          const er=row.querySelector('.cx-error');er.textContent='';
          if(!v.t){er.textContent='Falta el nombre del producto.';row.querySelector('.cm-p-t').focus();return false;}
          if(!(v.q>0)){er.textContent=`Falta la cantidad de ${v.t}.`;row.querySelector('.cm-p-q').focus();return false;}
          if(!(v.precio>0)){er.textContent=`Falta el precio de ${v.t}.`;row.querySelector('.cm-p-pr').focus();return false;}
          items.push({t:v.t,q:v.q,u:v.u,precio:v.precio,monto:Math.round(v.q*v.precio)});
        }
        const totalE=items.length?items.reduce((t,i)=>t+i.monto,0):u.leerMonto(tot);
        if(!(totalE>0))return fallo(tot.closest('.cx-campo'),'Escribí el total o los productos.');
        let vence='';
        if(pago==='credito'){
          if(venceOp==='otra'){vence=$('#cmVence').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(vence))return fallo($('[data-campo-de="vence"]'),'Escogé la fecha para pagar.');
            if(vence<f)return fallo($('[data-campo-de="vence"]'),'Esa fecha ya pasó.');}
          else vence=clDateAdd(f,Number(venceOp));
        }
        if(tieneAbonos&&r){
          if(pago!=='credito')return fallo($('[data-campo-de="pago"]'),'Ya tiene pagos anotados: borrá primero esos pagos para cambiar cómo se pagó.');
          if(totalE<pagadoDe(r.id))return fallo(tot.closest('.cx-campo'),`Ya se pagaron ${fmt(pagadoDe(r.id))}: el total no puede ser menor.`);
        }
        if(!(await permiso(f)))return false;
        const id=r?r.id:uid();
        const conFoto=await st.guardar('e:'+id);
        const e={id,f,prov:nombre,items,total:totalE,pago,como:pago==='credito'?'':(pago==='caja'?'efectivo':como),at:r?r.at:new Date().toISOString(),foto:!!conFoto,nota:$('#cmNota').value.trim()};
        if(vence)e.vence=vence;
        const num0=$('#cmNum').value.trim();if(num0)e.factura=num0;
        const rec=$('#cmRec').value.trim();if(rec)e.recibio=rec;
        if(r&&r.facturaMonto!=null)e.facturaMonto=r.facturaMonto;
        data.entregas=listaEnt().filter(x=>x.id!==id);data.entregas.push(e);
        recordarProv(nombre);salidaEntrega(e);
        save();
        aviso(`${r?'Corregido':'Anotado'}: entrega de ${nombre} por ${fmt(totalE)}${pago==='credito'?` · se debe, para el ${u.diaCorto(vence)}`:pago==='caja'?' · pagó la caja':pago==='bolsa'?' · pagó la bolsa':` · lo pagó ${N(pago)}`}.`);
      };
    },
    guardar:cuerpo=>cuerpo.__guardar()});
}
function borrarEntrega(e){
  (async()=>{
    if(!(await permiso(e.f)))return;
    const ab=abonosDe(e.id),fechas=[...new Set([e.f,...ab.map(m=>m.f)])];
    const antes={ent:JSON.stringify(listaEnt()),plata:JSON.stringify(data.plata||[]),dias:fechas.map(d=>[d,data.closureDaily&&data.closureDaily[d]?JSON.stringify(data.closureDaily[d]):null])};
    if(CC){CC.quitarSalida('e:'+e.id);ab.forEach(m=>CC.quitarSalida('a:'+m.id));}
    data.entregas=listaEnt().filter(x=>x.id!==e.id);
    data.plata=(data.plata||[]).filter(m=>!(m&&m.t==='abono'&&m.entrega===e.id));
    save();
    let deshecho=false;
    aviso(`Borrada: la entrega de ${e.prov} (${fmt(e.total)})${ab.length?` y ${ab.length===1?'su pago':'sus '+ab.length+' pagos'}`:''}.`,{deshacer(){
      deshecho=true;data.entregas=JSON.parse(antes.ent);data.plata=JSON.parse(antes.plata);data.closureDaily=data.closureDaily||{};
      antes.dias.forEach(([d,j])=>{if(j)data.closureDaily[d]=JSON.parse(j);else delete data.closureDaily[d];});save();}});
    setTimeout(()=>{if(!deshecho){if(e.foto)Fotos_borrar('e:'+e.id);ab.forEach(m=>{if(m.foto)Fotos_borrar(m.id);});}},9000);
  })();
}
const Fotos_borrar=id=>{try{u.Fotos.borrar(id);}catch(e){}};

// Pagar (o corregir un pago de) una entrega que se debía
function abonar(o){
  const r=o.abono||null,e=o.entrega||entregaPor(r.entrega);if(!e)return;
  const f=r?r.f:hoyISO(),activa=u.plataActiva(f);
  const saldo=saldoDe(e)+(r?ent(r.monto):0);
  if(saldo<=0&&!r)return aviso(`${e.prov} ya está pagado.`,{tipo:'info'});
  let de=r?r.de:(activa?'bolsa':'caja'),como=r&&r.como?r.como:'efectivo';
  const html=`
    ${u.campoMonto('cmM','¿Cuánto se pagó?',r?r.monto:saldo,`Faltan ${fmt(saldo)}. Se puede pagar una parte.`)}
    ${u.chips('de','¿Con qué se pagó?',opsPago(f,de),de,activa?'Si fue de su bolsillo, la bolsa se lo devuelve completo.':'')}
    ${u.chips('como','¿En qué?',[{v:'efectivo',t:'Efectivo',ic:'efectivo'},{v:'sinpe',t:'SINPE',ic:'sinpe'},{v:'tarjeta',t:'Tarjeta',ic:'tarjeta'}],como,'')}
    <label class="cx-campo"><span class="cx-et">Mensaje</span><input id="cmNota" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" value="${esc(r&&r.nota||'')}" placeholder="Ej.: pagó Roger por SINPE"></label>
    ${u.fotoHTML(r&&r.foto,'Foto del comprobante')}`;
  return u.ventana({titulo:r?'Corregir el pago':'Pagar a '+e.prov,sub:`${u.diaLargo(f)} · ${fmt(e.total)} en total`,html,clase:'cm-hoja',si:'Guardar',
    borrar:r?()=>borrarAbono(r,e):null,borrarTexto:'Borrar este pago',
    listo(cuerpo){
      const $=s=>cuerpo.querySelector(s),st=u.atarFoto(cuerpo,r&&r.id,r&&r.foto);
      const vista=()=>{$('[data-campo-de="como"]').hidden=de==='caja';};
      cuerpo.addEventListener('cambio',ev=>{const g=ev.target.dataset.grupo;if(g==='de'){de=ev.detail;vista();}else if(g==='como')como=ev.detail;});
      vista();cuerpo.__guardar=async()=>{
        const monto=u.leerMonto($('#cmM'));
        if(!(monto>0))return fallo($('#cmM').closest('.cx-campo'),'Escribí cuánto se pagó.');
        if(monto>saldo)return fallo($('#cmM').closest('.cx-campo'),`Solo faltan ${fmt(saldo)}.`);
        if(!(await permiso(f)))return false;
        const id=r?r.id:uid(),foto=await st.guardar(id);
        const m={id,f,t:'abono',de,como:de==='caja'?'efectivo':como,monto,entrega:e.id,nota:$('#cmNota').value.trim(),foto:!!foto,at:r?r.at:new Date().toISOString()};
        data.plata=(data.plata||[]).filter(x=>x.id!==id);data.plata.push(m);
        salidaAbono(m,e.prov);save();
        const falta=saldoDe(e);
        aviso(`Anotado: pagaste ${fmt(monto)} a ${e.prov}${falta>0?` · todavía faltan ${fmt(falta)}`:' · ya quedó pagado'}.`);
      };
    },guardar:cuerpo=>cuerpo.__guardar()});
}
async function borrarAbono(m,e){
  if(!(await permiso(m.f)))return;
  const antes={plata:JSON.stringify(data.plata||[]),dia:data.closureDaily&&data.closureDaily[m.f]?JSON.stringify(data.closureDaily[m.f]):null};
  if(CC)CC.quitarSalida('a:'+m.id);
  data.plata=(data.plata||[]).filter(x=>x.id!==m.id);save();
  let deshecho=false;
  aviso(`Borrado: el pago de ${fmt(m.monto)} a ${e.prov}.`,{deshacer(){deshecho=true;data.plata=JSON.parse(antes.plata);data.closureDaily=data.closureDaily||{};if(antes.dia)data.closureDaily[m.f]=JSON.parse(antes.dia);else delete data.closureDaily[m.f];save();}});
  if(m.foto)setTimeout(()=>{if(!deshecho)Fotos_borrar(m.id);},9000);
}

// La factura: la foto arriba y, debajo, lo anotado con ese proveedor para compararlo con el papel
function facturaVentana(id){
  const es=esperadoFactura(id);if(!es)return aviso('Ya no está ese renglón.',{tipo:'info'});
  const fa=facturaDe(id),ent0=esEntrega(id)?entregaPor(id.slice(2)):null;
  const filas=es.sinLista?`<p class="cx-nota">Esta compra se anotó sin lista de productos: solo se puede comparar el total.</p>`:
    `<div class="cm-res">${es.lineas.map(l=>`<div class="cm-res-f${l.falta?' falta':''}"><span><b>${esc(l.t)}</b><small>${qTxt(l.q)}${l.u?' '+esc(l.u):''} × ${l.falta?'sin precio':fmt(l.precio)}${es.total!==es.propio&&l.aqui!==l.monto?` · a esta tienda ${fmt(l.aqui)}`:''}</small></span><b>${fmt(l.monto)}</b></div>`).join('')}</div>`;
  const html=`
    <div class="cx-campo cm-fact-foto" data-campo-de="foto">${u.fotoHTML(fa.tiene,'Sacar la foto de la factura')}<span class="cx-error" role="alert"></span></div>
    <h3 class="cm-h3">Lo que se anotó con ${esc(es.prov)}</h3>
    ${filas}
    <div class="cm-res-t"><span>Total anotado</span><b>${fmt(es.total)}</b></div>
    ${es.total!==es.propio?`<p class="cx-nota">La factura es de todo lo que se le compró a ${esc(es.prov)} en el viaje (las dos tiendas). A Los Ángeles le tocan ${fmt(es.propio)}.</p>`:''}
    ${u.campoMonto('cmFM','¿Cuánto dice la factura?',fa.monto,'Si querés, escribí el total del papel y se compara solo.')}
    <p class="cm-compara" id="cmCmp" aria-live="polite"></p>`;
  return u.ventana({titulo:'Factura de '+es.prov,sub:fa.tiene?'Tocá la foto de abajo para cambiarla':'Sacale la foto y compará con lo anotado',html,clase:'cm-hoja cm-fact-hoja',si:'Guardar',
    borrar:fa.tiene?()=>quitarFactura(id,es.prov):null,borrarTexto:'Quitar la factura',
    listo(cuerpo){
      const $=s=>cuerpo.querySelector(s),st=u.atarFoto(cuerpo,fa.foto,fa.tiene),inp=$('#cmFM'),cmp=$('#cmCmp');
      inp.removeAttribute('data-ui-foco');
      const ver=()=>{
        const v=u.leerMonto(inp),c=compararFactura(v,es.total,es.propio);
        cmp.className='cm-compara'+(c.estado==='cuadra'||c.estado==='cuadra-propio'?' bien':c.estado==='vacio'?'':' ojo');
        cmp.textContent=c.estado==='vacio'?'':c.estado==='cuadra'?'Cuadra: la factura dice lo mismo que lo anotado.':c.estado==='cuadra-propio'?'Cuadra con lo de Los Ángeles: esta factura es solo de esta tienda.':c.dif>0?`La factura dice ${fmt(c.dif)} más que lo anotado.`:`La factura dice ${fmt(-c.dif)} menos que lo anotado.`;
      };
      inp.addEventListener('input',ver);ver();
      cuerpo.__guardar=async()=>{
        if(!st.nueva&&!(fa.tiene&&!st.fuera))return fallo($('[data-campo-de="foto"]'),'Sacale la foto a la factura primero.');
        const v=u.leerMonto(inp);
        const conFoto=await st.guardar(fa.foto);
        if(!conFoto)return fallo($('[data-campo-de="foto"]'),'No se pudo guardar la foto en este aparato. Probá otra vez.');
        if(ent0){const e=entregaPor(ent0.id);if(e){e.foto=true;if(v)e.facturaMonto=v;else delete e.facturaMonto;}}
        else{const x={at:fa.tiene?(mapaFact()[id]||{}).at||new Date().toISOString():new Date().toISOString()};if(v)x.monto=v;mapaFact()[id]=x;}
        save();
        const c=compararFactura(v,es.total,es.propio);
        aviso(c.estado==='vacio'?'Factura guardada.':c.estado==='cuadra'||c.estado==='cuadra-propio'?'Factura guardada: cuadra con lo anotado.':`Factura guardada: dice ${fmt(Math.abs(c.dif))} ${c.dif>0?'más':'menos'} que lo anotado.`,{tipo:c.estado==='mas'||c.estado==='menos'?'info':'ok'});
      };
    },guardar:cuerpo=>cuerpo.__guardar()});
}
function quitarFactura(id,prov){
  const fa=facturaDe(id),ent0=esEntrega(id)?entregaPor(id.slice(2)):null;
  const antes=ent0?{foto:ent0.foto,fm:ent0.facturaMonto}:{x:mapaFact()[id]};
  if(ent0){ent0.foto=false;delete ent0.facturaMonto;}else delete mapaFact()[id];
  save();let deshecho=false;
  aviso(`Se quitó la factura de ${prov}.`,{deshacer(){deshecho=true;
    if(ent0){const e=entregaPor(ent0.id);if(e){e.foto=antes.foto;if(antes.fm!=null)e.facturaMonto=antes.fm;}}else if(antes.x)mapaFact()[id]=antes.x;save();}});
  setTimeout(()=>{if(!deshecho)Fotos_borrar(fa.foto);},9000);
}

/* ----- las acciones ----- */
u.acciones({
  'cm-recibir':()=>recibirEntrega({}),
  'cm-otra':()=>u.anotar({grupo:'com'}),
  'cm-ent':d=>{const e=entregaPor(d.id);if(e)recibirEntrega({entrega:e});},
  'cm-ent-ver':d=>{const k='e:'+d.id;E.abiertos.has(k)?E.abiertos.delete(k):E.abiertos.add(k);u.pintar();},
  'cm-factura':d=>facturaVentana(d.id),
  'cm-pagar':d=>{const e=entregaPor(d.id);if(e)abonar({entrega:e});},
  'cm-abono':d=>{const m=(data.plata||[]).find(x=>x&&x.id===d.id);if(m)abonar({abono:m});},
  'cm-deudas':()=>u.ir('compras-pagar'),
  'cm-cierre-fuera':async d=>{
    const f=E.dia;if(!(await permiso(f)))return;
    const ids=u.renglones(f,'com').filter(r=>r.tipo==='auto'&&esDelCierre(r.id,d.id)).map(r=>r.id);
    if(!ids.length)return;
    data.autoFuera=data.autoFuera||{};
    const todos=ids.every(i=>data.autoFuera[i]);
    ids.forEach(i=>{if(todos)delete data.autoFuera[i];else data.autoFuera[i]=1;});
    save();aviso(todos?'Ese cierre vuelve a contarse.':'Ese cierre ya no se cuenta. Se puede volver a contar cuando quieras.',{deshacer(){ids.forEach(i=>{if(todos)data.autoFuera[i]=1;else delete data.autoFuera[i];});save();}});
  }
});
});
})();
