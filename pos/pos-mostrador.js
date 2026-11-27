/* pos-mostrador.js — lo que se cobra en el Mostrador entra al ARAMO POS como una venta más (2026-11-26).
   1) COBROS DEL MOSTRADOR → VENTAS. El Mostrador deja una fila por cobro en la nube (`aramo_pos_pendientes`, id = pedido|fecha del cobro)
      y, si está en este mismo navegador, también en localStorage (`aramo_pos_pend_<tienda>`) para que llegue al instante.
      · Solo la caja activa (el aparato que cobra: dueno && !soloLectura) las registra, y solo las de SU tienda.
      · Se leen al abrir, cada minuto, al volver la conexión y cuando el Mostrador avisa por localStorage.
      · La venta se crea por el camino de siempre (`ventas:crear`): con el peso y el precio finales, el CABYS si lo hay, el nombre
        del cliente, la nota «La Feria F-XXXX», el método y los montos y a quién se le hizo el SINPE. Sale en Caja, en Reportes y en
        el resumen del día (pos-dia.js).
      · Nunca dos veces: la venta lleva `origen_id` (el id del cobro) y `ventas:crear` devuelve la que ya existe; además, si ese pedido
        ya se cobró en el POS (nota «La Feria F-XXXX») no se crea otra.
      · Hace falta una caja abierta: sin ella el cobro espera (y se avisa), porque una venta sin caja no entra al cierre.
      · Al registrar: se marca la fila en la nube (`registrado_at`, `venta`) y se deja `aramo_pos_venta_<pedido>` para el Mostrador del
        mismo navegador (así ve «En el POS: venta 0042»; en otros aparatos lo ve leyendo la nube).
   2) A QUIÉN SE LE HIZO EL SINPE. La lista (nombre y número) se arma en Ajustes del Mostrador (`tienda.sucursales[].sinpeDestinos`).
      Aquí se lee (de este navegador y de la nube) y se copia a la configuración del POS (`sinpe_destinos`), que es la que ya usan
      los botones de SINPE al cobrar y el reporte por destinatario. Sin lista en el Mostrador, el POS deja UNA: «ARAMO · 8584-8428».
      Solo se copia cuando la del Mostrador cambió (así lo que se edite en Configuración del POS no se pisa cada minuto). */
window.PosMostrador=(function(){
'use strict';
const CADA=60000;
const LS={
  get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
  del(k){try{localStorage.removeItem(k);}catch(e){}},
};
let ctx=null,ocupado=false,nubeTienda=null,avisoCaja=0;

const tel8=s=>{const d=String(s||'').replace(/\D/g,'');return d.length===8?d.slice(0,4)+'-'+d.slice(4):d;};
const nom=s=>String(s||'').replace(/\s+/g,' ').trim();
const etiqueta=d=>d.tel?(d.nombre||'SINPE')+' · '+d.tel:d.nombre;
const firmaLista=L=>JSON.stringify((L||[]).map(d=>[nom(d.nombre),String(d.tel||'').replace(/\D/g,'')]));

// ── Nube ──
async function rest(ruta,opc){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);
  try{
    return await fetch(ctx.url+'/rest/v1/'+ruta,{...(opc||{}),signal:c.signal,
      headers:{apikey:ctx.key,Authorization:'Bearer '+ctx.key,'Content-Type':'application/json',...((opc&&opc.headers)||{})}});
  }finally{clearTimeout(t);}
}

// ── 2) La lista de SINPE ──
async function leerTiendaNube(){
  try{
    const r=await rest('encargos?id=eq.__tienda__&select=data');
    if(!r.ok)return;
    const a=await r.json();
    if(Array.isArray(a)&&a[0]&&a[0].data&&typeof a[0].data==='object')nubeTienda=a[0].data;
  }catch(e){}
}
// La lista de ESTA tienda en los ajustes del Mostrador (la versión más nueva entre este navegador y la nube), o null si no hay
function listaDelMostrador(){
  let mejor=null;
  const probar=d=>{if(d&&typeof d==='object'&&(!mejor||String(d.updated||'')>String(mejor.updated||'')))mejor=d;};
  probar(LS.get('aramo_tienda_v1',null));probar(nubeTienda);
  if(!mejor)return null;
  const s=(mejor.sucursales||[]).find(x=>x&&x.k===ctx.suc())||{};
  const bruta=Array.isArray(s.sinpeDestinos)&&s.sinpeDestinos.length?s.sinpeDestinos:(Array.isArray(mejor.sinpeDestinos)?mejor.sinpeDestinos:[]);
  const L=bruta.map(d=>({nombre:nom(d&&d.nombre),tel:tel8(d&&d.numero)})).filter(d=>d.nombre||d.tel).map(d=>({...d,nombre:d.nombre||'SINPE'}));
  return L.length?L.slice(0,8):null;
}
async function sincronizarDestinos(){
  const suc=ctx.suc(),clave='pos_sinpe_firma_'+suc,POS=ctx.POS();
  const mia=window.PosDia?window.PosDia.destinosConfig(POS):[];
  const L=listaDelMostrador();
  let nueva=null;
  if(L){if(firmaLista(L)!==LS.get(clave,''))nueva=L;}                // la del Mostrador cambió: se copia
  else if(!mia.length)nueva=[{nombre:'ARAMO',tel:'8584-8428'}];       // sin nada en ningún lado: el SINPE de La Feria
  if(!nueva)return false;
  await ctx.invoke('config:guardar',{sinpe_destinos:JSON.stringify(nueva),sinpe_numero:nueva[0].tel||''});
  LS.set(clave,L?firmaLista(L):'');
  return true;
}

// ── 1) Cobros pendientes ──
const clavePend=()=>'aramo_pos_pend_'+ctx.suc();
const claveMarcar=()=>'aramo_pos_marcar_'+ctx.suc();
async function filasPendientes(){
  const L=(LS.get(clavePend(),[])||[]).filter(x=>x&&x.id&&x.datos);
  try{
    const r=await rest('aramo_pos_pendientes?tienda=eq.'+encodeURIComponent(ctx.suc())+'&registrado_at=is.null&select=id,datos,creado&order=creado.asc&limit=30');
    if(r.ok){(await r.json()).forEach(f=>{if(f&&f.id&&f.datos&&!L.some(x=>x.id===f.id))L.push(f);});}
  }catch(e){}
  return L;
}
function etiquetaDestino(sa){
  const n=nom(sa);if(!n)return '';
  const L=window.PosDia?window.PosDia.destinosConfig(ctx.POS()):[];
  const x=L.find(d=>nom(d.nombre)===n);
  return x?etiqueta(x):n;
}
function armar(f){
  const d=f.datos,c=d.cobro||{},tot=Math.round(+c.total||0),prem=Math.round(+d.premio||0);
  const lineas=ctx.lineas({items:(d.items||[]).map(i=>({k:i.k,n:i.n,u:i.u,q:+i.q||0,qr:null,p:+i.p||0,cabys:i.cabys||'',estado:''}))});
  const items=lineas.filter(l=>+l.cantidad>0).map(l=>({producto_id:l.pid||null,nombre:l.nombre,precio_unitario:l.precio,cantidad:l.cantidad,unidad:l.unidad,
    tasa_impuesto:l.tasa||0,descuento:0,subtotal:Math.round(l.precio*l.cantidad*100)/100,promocion_id:null,promocion_descripcion:'',desc_manual_pct:0,
    cabys_codigo:l.cabys||'',producto_generico:l.pid?0:1}));
  if(+d.envio>0)items.push({producto_id:null,nombre:'Envío Uber',precio_unitario:+d.envio,cantidad:1,unidad:'unidad',tasa_impuesto:0,descuento:0,subtotal:+d.envio,
    promocion_id:null,promocion_descripcion:'',desc_manual_pct:0,cabys_codigo:'',producto_generico:1});
  const m=c.metodo==='link'?'tarjeta':(c.metodo||'efectivo');
  const E=Math.max(0,Math.round(+c.efectivo||0)),T=Math.max(0,Math.round(+c.tarjeta||0)),S=Math.max(0,Math.round(+c.sinpe||0));
  let pe=0,pt=0,ps=0,rec=tot,cambio=0;
  if(m==='efectivo'){rec=Math.round(+c.recibido||tot);pe=rec;cambio=Math.max(0,rec-tot);}
  else if(m==='tarjeta'){pt=tot;}
  else if(m==='sinpe'){ps=tot;}
  else{pe=E;pt=T;ps=S;}
  return{subtotal:tot+prem,descuento_total:prem,impuesto:0,total:tot,metodo_pago:m,monto_recibido:rec,cambio,
    pago_efectivo:pe,pago_tarjeta:pt,pago_sinpe:ps,sinpe_destino:ps>0?etiquetaDestino(d.sa):'',
    cliente_nombre:nom(d.cliente).slice(0,60),notas:'La Feria '+(d.ref||''),desc_global_pct:0,desc_global_monto:0,origen_id:f.id,items};
}
async function marcarNube(id,numero){
  try{
    const r=await rest('aramo_pos_pendientes?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},
      body:JSON.stringify({registrado_at:new Date().toISOString(),venta:numero})});
    if(!r.ok)throw new Error('nube '+r.status);
    return true;
  }catch(e){
    const L=(LS.get(claveMarcar(),[])||[]).filter(x=>x.id!==id);L.push({id,venta:numero});LS.set(claveMarcar(),L.slice(-50));
    return false;
  }
}
async function reintentarMarcas(){
  const L=LS.get(claveMarcar(),[])||[];if(!L.length)return;
  LS.del(claveMarcar());
  for(const x of L)await marcarNube(x.id,x.venta);   // los que no suben vuelven a la cola
}
function quitarLocal(id){
  const L=(LS.get(clavePend(),[])||[]).filter(x=>x&&x.id!==id);
  if(L.length)LS.set(clavePend(),L);else LS.del(clavePend());
}
// Registra UN cobro. Devuelve 'ok' | 'ya' | 'sin-caja' | 'mala'
async function registrar(f){
  const d=f.datos||{},POS=ctx.POS();
  if(!d.cobro||!(+d.cobro.total>0)||!Array.isArray(d.items)){quitarLocal(f.id);return 'mala';}
  let ya=null;
  try{
    ya=POS.prepare('SELECT numero FROM ventas WHERE origen_id = ?').get([f.id])
      ||(d.ref?POS.prepare("SELECT numero FROM ventas WHERE notas = ? AND estado = 'completada' ORDER BY id LIMIT 1").get(['La Feria '+d.ref]):null);
  }catch(e){}
  let numero,estado='ya';
  if(ya)numero=ya.numero;
  else{
    const caja=POS.prepare("SELECT id FROM cajas WHERE estado = 'abierta' LIMIT 1").get();
    if(!caja)return 'sin-caja';
    const v=await ctx.invoke('ventas:crear',armar(f));
    numero=v&&v.numero;estado=v&&v.repetida?'ya':'ok';
  }
  if(!numero)return 'mala';
  const c=d.cobro,pedido=String(f.id).split('|')[0];
  LS.set('aramo_pos_venta_'+pedido,{numero,total:+c.total||0,metodo:c.metodo||'',sinpe:+c.sinpe||0,efectivo:+c.efectivo||0,tarjeta:+c.tarjeta||0,
    at:new Date().toISOString(),cliente:d.cliente||''});
  quitarLocal(f.id);
  await marcarNube(f.id,numero);
  if(estado==='ok')ctx.aviso('🧺 Cobro del Mostrador '+(d.ref||'')+' entró al POS · venta '+String(numero).replace(/^.*-/,''));
  return estado;
}
async function revisar(){
  if(!ctx||ocupado||!ctx.puede())return;
  ocupado=true;
  try{
    await leerTiendaNube();
    try{await sincronizarDestinos();}catch(e){console.warn('[pos] destinos de SINPE',e);}
    const filas=await filasPendientes();
    let esperando=0;
    for(const f of filas){
      let r='mala';
      try{r=await registrar(f);}catch(e){console.warn('[pos] cobro del Mostrador',e);r='error';}
      if(r==='sin-caja'){esperando=filas.length-filas.indexOf(f);break;}
    }
    if(esperando&&Date.now()-avisoCaja>10*60000){avisoCaja=Date.now();
      ctx.aviso('🧺 '+(esperando===1?'Hay 1 cobro':'Hay '+esperando+' cobros')+' del Mostrador esperando: abrí la caja y entran solos al POS.');}
    await reintentarMarcas();
  }catch(e){console.warn('[pos] cobros del Mostrador',e);}
  finally{ocupado=false;}
}
function iniciar(o){
  ctx=o;
  setTimeout(revisar,2500);
  setInterval(revisar,CADA);
  window.addEventListener('online',()=>setTimeout(revisar,800));
  window.addEventListener('storage',e=>{if(!e.key||e.key===clavePend()||e.key==='aramo_tienda_v1')setTimeout(revisar,200);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(revisar,500);});
}
return{iniciar,revisar,listaDelMostrador,armar,registrar};
})();
