/* pos-dia.js — resumen del día del ARAMO POS y reinicio a cero (2026-11-26).
   1) RESUMEN DEL DÍA → tabla `aramo_pos_dia (tienda, fecha, datos jsonb)`. El Control la lee para llenar solo los ingresos.
      · Se calcula desde la base del POS (ventas, cajas) y se guarda con upsert (on_conflict=tienda,fecha).
      · Cuándo: después de cada venta, anulación, devolución, apertura o cierre de caja; se espera unos segundos para juntar
        cambios. Se guarda la fila de HOY y, si el cambio fue en otro día (p. ej. anular un tiquete de ayer), también esa fecha.
      · Solo la caja activa (el aparato que cobra: dueno && !soloLectura) calcula y publica; los demás no escriben nada.
      · Copia local: localStorage `aramo_pos_dia` = { "<tienda>|<fecha>": datos } de los últimos 14 días.
      · Fecha y horas en hora de Costa Rica; montos en colones enteros; cada colón cuadra:
        ventas.total = suma de los tiquetes completados = efectivo + sinpe + tarjeta + fiado + otros.
      · Pago mixto: se reparte por método con lo guardado (tarjeta y SINPE tal cual; el efectivo es lo que falta para el total,
        o sea ya sin el vuelto). Fiado: va aparte y no es plata que entró. Desecho: no es venta; va en `desechos` al costo.
      · `tiquetes` trae SOLO ventas completadas (ni anuladas ni desechos). Cada tiquete lleva `ef` (lo que entró en efectivo) y,
        si es mixto, `p` con el reparto. Siempre: ventas.efectivo = Σ ef · ventas.total = Σ t · efectivo+sinpe+tarjeta+fiado+otros = total.
   2) REINICIO A CERO: aquí viven el borrado de ventas/cajas y la limpieza de localStorage; el orden (respaldo primero,
      subir, marca) lo maneja pos-web.js (revisarReinicio).
   3) Ayudas para el cobro con Fiado y Desecho (costo del carrito, nombres de clientes de fiado). */
window.PosDia=(function(){
'use strict';
const ESPERA=4000, ESPERA_MAX=15000, DIAS=14;
const CLAVE_LOCAL='aramo_pos_dia';
const LS={
  get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
  del(k){try{localStorage.removeItem(k);}catch(e){}},
};
const FECHA_CR=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'});
const hoyCR=()=>FECHA_CR.format(new Date());                       // 'YYYY-MM-DD' en Costa Rica
const rd=n=>Math.round(+n||0);
const sumarDias=(f,n)=>{const d=new Date(f+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const fechaDe=s=>String(s||'').slice(0,10);                         // 'YYYY-MM-DD HH:MM:SS' (hora local de la tienda) → fecha
const horaDe=s=>String(s||'').slice(11,16);
const isoCR=s=>s?String(s).slice(0,10)+'T'+(String(s).slice(11,19)||'00:00:00')+'-06:00':null;   // Costa Rica no tiene horario de verano
const numeroCorto=n=>String(n||'').replace(/^.*-/,'');

let ctx=null,pend=new Set(),ver=new Map(),tEspera=0,tMax=0,enviando=false,falloRed=0,tReintento=0;

// ── 1) Calcular ──
// Cómo se reparte un tiquete completado entre los métodos (en colones enteros, la suma da el total)
function partir(v){
  const t=rd(v.total),m=String(v.metodo_pago||'').toLowerCase(),r={efectivo:0,sinpe:0,tarjeta:0,fiado:0,otros:0};
  if(m==='mixto'){
    const tar=Math.min(t,Math.max(0,rd(v.pago_tarjeta))),sin=Math.min(t-tar,Math.max(0,rd(v.pago_sinpe)));
    r.tarjeta=tar;r.sinpe=sin;r.efectivo=t-tar-sin;
  }else if(m==='efectivo'||m==='sinpe'||m==='tarjeta'||m==='fiado')r[m]=t;
  else r.otros=t;
  return r;
}
// A quién se le hizo el SINPE: la lista del POS (configuracion.sinpe_destinos, que se arma en Ajustes del Mostrador) y el nombre de cada tiquete
function destinosConfig(POS){
  try{
    const f=POS.prepare("SELECT valor FROM configuracion WHERE clave = 'sinpe_destinos'").get(),a=JSON.parse((f&&f.valor)||'[]');
    return Array.isArray(a)?a.map(x=>({nombre:String(x&&x.nombre||'').replace(/\s+/g,' ').trim(),tel:String(x&&x.tel||'').trim()})).filter(x=>x.nombre||x.tel):[];
  }catch(e){return [];}
}
// `sinpe_destino` guarda «Nombre · número»; `sa` es SOLO el nombre, tal cual está en la lista. Sin destinatario escogido: el primero de la lista.
function nombreDestino(label,lista){
  const s=String(label||'').trim();
  if(s){
    const x=lista.find(d=>(d.tel?(d.nombre||'SINPE')+' · '+d.tel:d.nombre)===s);
    if(x)return x.nombre||'SINPE';
    const i=s.lastIndexOf(' · ');return (i>0?s.slice(0,i):s).trim()||'SINPE';
  }
  return lista.length?(lista[0].nombre||'SINPE'):'ARAMO';
}
function calcular(POS,tienda,fecha){
  const lista=destinosConfig(POS);
  const vs=POS.prepare(`SELECT v.id,v.numero,v.fecha,v.total,v.descuento_total,v.metodo_pago,v.estado,v.cliente_nombre,v.caja_id,
      v.pago_tarjeta,v.pago_sinpe,v.sinpe_destino,c.usuario AS cajero
    FROM ventas v LEFT JOIN cajas c ON c.id = v.caja_id WHERE substr(v.fecha,1,10) = ? ORDER BY v.fecha, v.id`).all([fecha]);
  const d={v:1,tienda,fecha,at:new Date().toISOString(),
    ventas:{efectivo:0,sinpe:0,tarjeta:0,fiado:0,otros:0,total:0,n:0},descuentos:0,anuladas:{n:0,total:0},desechos:0,tiquetes:[],fiados:[],cajas:[]};
  vs.forEach(v=>{
    if(v.estado==='completada'){
      const p=partir(v),t=rd(v.total),m=String(v.metodo_pago||'').toLowerCase(),ds=rd(v.descuento_total);
      ['efectivo','sinpe','tarjeta','fiado','otros'].forEach(k=>{d.ventas[k]+=p[k];});
      d.ventas.total+=t;d.ventas.n++;d.descuentos+=ds;
      const tq={n:numeroCorto(v.numero),h:horaDe(v.fecha),t,m:m||'efectivo',d:ds,c:v.cajero||'',caja:v.caja_id,ef:p.efectivo};   // ef = lo que entró en efectivo
      if(m==='mixto')tq.p={efectivo:p.efectivo,sinpe:p.sinpe,tarjeta:p.tarjeta};                                                  // y el reparto del pago mixto
      if(p.sinpe>0)tq.sa=nombreDestino(v.sinpe_destino,lista);                                                                     // a quién se le hizo el SINPE (solo el nombre; campo opcional)
      d.tiquetes.push(tq);
      if(m==='fiado')d.fiados.push({n:numeroCorto(v.numero),h:horaDe(v.fecha),cliente:v.cliente_nombre||'',t});
    }else if(v.estado==='anulada'&&v.metodo_pago!=='desecho'){d.anuladas.n++;d.anuladas.total+=rd(v.total);}
    else if(v.estado==='desecho')d.desechos+=rd(v.total);
  });
  // Cajas de ese día: las que abrieron o cerraron ese día, o que cobraron ese día
  const cajas=POS.prepare(`SELECT * FROM cajas WHERE substr(fecha_apertura,1,10) = ? OR substr(fecha_cierre,1,10) = ?
      OR id IN (SELECT caja_id FROM ventas WHERE substr(fecha,1,10) = ?) ORDER BY id`).all([fecha,fecha,fecha]);
  cajas.forEach(c=>{
    const cerrada=c.estado==='cerrada';
    let calculado=rd(c.monto_cierre_calculado);
    if(!cerrada){   // abierta (o cerrada a la fuerza): apertura + el efectivo que entró en ese turno
      let ef=0;POS.prepare(`SELECT total,metodo_pago,pago_tarjeta,pago_sinpe FROM ventas WHERE caja_id = ? AND estado = 'completada'`).all([c.id]).forEach(v=>{ef+=partir(v).efectivo;});
      calculado=rd(c.monto_apertura)+ef;
    }
    d.cajas.push({id:c.id,usuario:c.usuario||'',abre:isoCR(c.fecha_apertura),cierra:isoCR(c.fecha_cierre),
      apertura:rd(c.monto_apertura),calculado,real:cerrada?rd(c.monto_cierre_real):null,diferencia:cerrada?rd(c.diferencia):null,estado:c.estado});
  });
  return d;
}
const firma=d=>{const {at,...r}=d||{};return JSON.stringify(r);};
const vacio=d=>!d.ventas.n&&!d.anuladas.n&&!d.desechos&&!d.cajas.length;

// ── 2) Copia local y nube ──
function guardarLocal(d){
  const todo=LS.get(CLAVE_LOCAL,{}),corte=sumarDias(hoyCR(),-(DIAS-1));
  todo[d.tienda+'|'+d.fecha]=d;
  Object.keys(todo).forEach(k=>{const f=k.split('|')[1]||'';if(f<corte)delete todo[k];});
  LS.set(CLAVE_LOCAL,todo);
}
const claveEspera=()=>'aramo_pos_dia_pend_'+ctx.suc();
function guardarEspera(){LS.set(claveEspera(),[...pend]);}
const activa=()=>!!(ctx&&ctx.puede());
function marcar(fechas){
  if(!activa())return;
  fechas.forEach(f=>{if(/^\d{4}-\d\d-\d\d$/.test(f)){pend.add(f);ver.set(f,(ver.get(f)||0)+1);}});
  guardarEspera();
  const POS=ctx.POS(),tienda=ctx.suc();
  pend.forEach(f=>{try{guardarLocal(calcular(POS,tienda,f));}catch(e){}});   // la copia local queda al instante
  clearTimeout(tEspera);tEspera=setTimeout(()=>enviar(),ESPERA);               // la nube espera unos segundos a juntar cambios
  if(!tMax)tMax=setTimeout(()=>{tMax=0;enviar();},ESPERA_MAX);
}
async function post(filas){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);
  try{
    const r=await fetch(ctx.url+'/rest/v1/aramo_pos_dia?on_conflict=tienda,fecha',{method:'POST',keepalive:JSON.stringify(filas).length<60000,signal:c.signal,
      headers:{apikey:ctx.key,Authorization:'Bearer '+ctx.key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(filas)});
    if(!r.ok)throw new Error('nube '+r.status);
  }finally{clearTimeout(t);}
}
// Manda a la nube las fechas pendientes
async function enviar(){
  clearTimeout(tEspera);clearTimeout(tMax);tMax=0;
  if(!ctx||enviando||!pend.size)return false;
  if(!activa())return false;
  enviando=true;
  const fechas=[...pend],v0=new Map(fechas.map(f=>[f,ver.get(f)])),tienda=ctx.suc(),POS=ctx.POS();
  try{
    const filas=fechas.map(f=>{const d=calcular(POS,tienda,f);guardarLocal(d);return{tienda,fecha:f,datos:d,updated_at:new Date().toISOString()};});
    await post(filas);
    fechas.forEach(f=>{if(ver.get(f)===v0.get(f))pend.delete(f);});guardarEspera();falloRed=0;   // lo que cambió mientras se mandaba sigue pendiente
    return true;
  }catch(e){
    falloRed++;clearTimeout(tReintento);tReintento=setTimeout(()=>enviar(),Math.min(300000,15000*falloRed));   // sin internet o sin tabla: se reintenta
    return false;
  }finally{enviando=false;if(pend.size&&!falloRed){clearTimeout(tEspera);tEspera=setTimeout(()=>enviar(),ESPERA);}}
}
// Qué fechas toca un cambio: siempre HOY, y la fecha de lo que se tocó (un tiquete de ayer, una caja abierta desde ayer)
function cambio(cmd,args,res){
  if(!/^(ventas:(crear|anular|devolver_item)|caja:(abrir|cerrar))$/.test(cmd)||!activa())return;
  const POS=ctx.POS(),f=new Set([hoyCR()]);
  const q=(sql,a)=>{try{return POS.prepare(sql).get(a)||null;}catch(e){return null;}};
  try{
    if(cmd==='ventas:crear'){if(res&&res.fecha)f.add(fechaDe(res.fecha));}
    else if(cmd==='ventas:anular'||cmd==='ventas:devolver_item'){const v=q('SELECT fecha FROM ventas WHERE id = ?',[args[0]]);if(v)f.add(fechaDe(v.fecha));}
    else if(cmd==='caja:abrir'||cmd==='caja:cerrar'){
      const id=cmd==='caja:cerrar'?args[0]:(res&&res.id),c=q('SELECT fecha_apertura FROM cajas WHERE id = ?',[id]);
      if(c)f.add(fechaDe(c.fecha_apertura));
      // al abrir una caja se cierra a la fuerza la que siguiera abierta: también cambia el día en que abrió
      POS.prepare(`SELECT fecha_apertura FROM cajas WHERE substr(fecha_cierre,1,10) = ?`).all([hoyCR()]).forEach(x=>f.add(fechaDe(x.fecha_apertura)));
    }
  }catch(e){}
  marcar([...f]);
}
// Al abrir el POS: si quedó algo pendiente, o si lo de hoy cambió respecto a la última copia, se publica
function alIniciar(){
  if(!activa())return;
  const POS=ctx.POS(),tienda=ctx.suc(),hoy=hoyCR(),f=new Set(LS.get(claveEspera(),[]));
  try{
    const d=calcular(POS,tienda,hoy),l=(LS.get(CLAVE_LOCAL,{}))[tienda+'|'+hoy];
    if(l?firma(l)!==firma(d):!vacio(d))f.add(hoy);
  }catch(e){}
  if(f.size)marcar([...f]);
}
// Manda lo que esté pendiente ya, sin esperar (al ocultar o cerrar la página)
function vaciar(){if(pend.size&&activa())enviar();}

// ── 3) Reinicio a cero ──
// Fechas con algo en la base (ventas o cajas) y en la copia local: son las que se publican en cero
function fechasConDatos(POS,tienda){
  const s=new Set();
  try{
    POS.prepare(`SELECT DISTINCT substr(fecha,1,10) AS f FROM ventas`).all().forEach(r=>r.f&&s.add(r.f));
    POS.prepare(`SELECT DISTINCT substr(fecha_apertura,1,10) AS f FROM cajas`).all().forEach(r=>r.f&&s.add(r.f));
    POS.prepare(`SELECT DISTINCT substr(fecha_cierre,1,10) AS f FROM cajas WHERE fecha_cierre IS NOT NULL`).all().forEach(r=>r.f&&s.add(r.f));
  }catch(e){}
  Object.keys(LS.get(CLAVE_LOCAL,{})).forEach(k=>{const p=k.split('|');if(p[0]===tienda&&p[1])s.add(p[1]);});
  return [...s].sort().slice(-40);
}
// Borra ventas, sus items y las cajas con lo que cuelga de ellas. Se quedan productos, precios, categorías, stock, clientes,
// usuarios y ajustes. NO se toca la configuración: `siguiente_numero` arma el consecutivo de las facturas de Hacienda y no se repite.
function reiniciarDatos(POS){
  POS.transaction(()=>{
    ['DELETE FROM facturas_electronicas','DELETE FROM venta_items','DELETE FROM ventas','DELETE FROM arqueo_detalle','DELETE FROM cajas'].forEach(sql=>POS.prepare(sql).run());
  })();
}
// Lo que este aparato guarda de ventas de prueba, pedidos de La Feria, tiquetes y notas
function limpiarLocal(tienda){
  try{
    const claves=[];
    for(let i=0;i<localStorage.length;i++)claves.push(localStorage.key(i));
    claves.forEach(k=>{if(/^aramo_pos_cotizacion_/.test(k)||/^aramo_pos_venta_/.test(k))localStorage.removeItem(k);});
  }catch(e){}
  ['aramo_pos_feria_'+tienda,CLAVE_LOCAL,'aramo_pos_dia_pend_'+tienda,'pos_notas_precio_'+tienda,'aramo_pos_pend_'+tienda,'aramo_pos_marcar_'+tienda].forEach(k=>LS.del(k));
  pend=new Set();ver=new Map();clearTimeout(tEspera);clearTimeout(tMax);tMax=0;
}
// Publica el resumen de esas fechas (cuando la base ya está en cero salen en cero). Sin tocar la copia local.
async function publicarFechas(fechas){
  if(!ctx||!fechas.length)return false;
  const tienda=ctx.suc(),POS=ctx.POS();
  try{await post(fechas.map(f=>({tienda,fecha:f,datos:calcular(POS,tienda,f),updated_at:new Date().toISOString()})));return true;}
  catch(e){return false;}
}

// ── 4) Ayudas para el cobro ──
// Lo que cuesta lo que hay en el carrito (costo × cantidad): es lo que vale un desecho
function costoCarrito(items){
  if(!ctx)return 0;
  const POS=ctx.POS();let t=0;
  (items||[]).forEach(it=>{
    const id=it.productoId||it.producto_id;if(!id)return;
    try{const p=POS.prepare('SELECT costo FROM productos WHERE id = ?').get([id]);t+=Math.max(0,+(p&&p.costo)||0)*(+it.cantidad||0);}catch(e){}
  });
  return Math.round(t*100)/100;
}
// Los últimos clientes a los que se les fió (para escogerlos de un toque)
function clientesFiado(n){
  if(!ctx)return [];
  try{
    return ctx.POS().prepare(`SELECT cliente_nombre AS n, MAX(fecha) AS f FROM ventas WHERE metodo_pago = 'fiado' AND estado = 'completada' AND TRIM(cliente_nombre) <> ''
      GROUP BY lower(TRIM(cliente_nombre)) ORDER BY f DESC LIMIT ?`).all([n||6]).map(r=>String(r.n).trim());
  }catch(e){return [];}
}
window.posCostoCarrito=items=>costoCarrito(items);
window.posFiadoClientes=()=>clientesFiado(6);

function iniciar(o){
  ctx=o;
  pend=new Set(LS.get(claveEspera(),[]));
  window.addEventListener('online',()=>{if(pend.size){falloRed=0;enviar();}});
}
return{iniciar,cambio,alIniciar,vaciar,enviar,calcular,partir,firma,destinosConfig,nombreDestino,hoyCR,fechasConDatos,reiniciarDatos,limpiarLocal,publicarFechas,costoCarrito,clientesFiado,
  get pendientes(){return[...pend];}};
})();
