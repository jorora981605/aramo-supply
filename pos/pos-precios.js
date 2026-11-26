/* pos-precios.js — el costo del Cierre de compras actualiza solo los precios de este ARAMO POS (2026-11-26).
   La regla es la misma en todo ARAMO (la fórmula vive en catalogo-aramo.js: ARAMO_CAT.precioMeta):
     precio meta = costo + 40 %, redondeado hacia arriba a ₡25.
   · De dónde sale el costo: la tabla `precios` de la nube (proveedor, producto_id, precio, updated_at), que llena el
     Cierre de compras. Se lee SOLO con GET. El nombre de cada producto sale de los proveedores de Inventario
     (app_config.custom_providers y supplier-base.js) y se une con el POS por catalogo_id (ARAMO_CAT.idDe).
   · Cuándo se aplica: cuando el costo de Inventario es distinto del `costo` que tiene el POS. Si alguien cambia el
     precio a mano y el costo no cambió, no se toca.
       – el precio queda por debajo de la meta → sube solo a la meta y queda una nota («Subió solo»);
       – la meta es más del doble del precio de hoy → no se toca: nota «Revisar» con botón «Subir a ₡X»;
       – el costo bajó y el precio está por encima de la meta → NUNCA baja solo: nota con el botón «Bajar a ₡X».
     Siempre se actualiza el `costo` del POS. Si un producto tiene varios proveedores, vale el costo más nuevo.
   · Cada local (Moravia / Los Ángeles) lo aplica a SUS precios con SU base; una tienda no toca a la otra.
   · Las notas quedan en localStorage (pos_notas_precio_<local>) y se ven en una franja tranquila arriba. */
window.PosPrecios=(function(){
'use strict';
const SALTO_MAX=2;               // si la meta es más del doble del precio de hoy, no se sube sola: se pide revisar
const CADA=5*60000, MIN_ENTRE=60000;
const C=()=>window.ARAMO_CAT;
const norm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const dinero=n=>'₡'+String(Math.round(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ALIAS_U={unidades:'unidad',cajas:'caja',bolsas:'caja',paquetes:'caja',rollos:'unidad',atados:'unidad',racimos:'unidad',litros:'unidad',gramos:'kg'};
const unidadInv=u=>{const x=String(u||'').trim().toLowerCase();return(x==='kg'||x==='unidad'||x==='caja')?x:(ALIAS_U[x]||'kg');}; // igual que normUnit de Inventario

// ── 1) De la nube a "costo por producto de ARAMO" ──
// Los productos vivos de un proveedor: igual que Inventario (lo que el proveedor tiene en la nube; si no está ahí, la base de fábrica).
function listaDe(prov,cp,base){
  const d=cp&&cp[prov];
  if(d){
    if(d.deleted)return[];
    const borr=(cp.Otros&&cp.Otros.borrados)||{},q=d.quitados||{};
    return[...(d.products||[]),...(d.masterProducts||[])].filter(p=>{
      const n=norm(p&&p.name);if(!n)return false;
      const a=+p.agregado||0,t=q[n];if(t&&!(a>t))return false;
      const b=borr[n];return !(b&&a<=b);
    });
  }
  const b=base&&base[prov];return b?(b.products||[]):[];
}
// filas = precios de la nube; devuelve {porId: Map(catalogo_id → [{costo,u,t,prov,pid,nombre}]), sinNombre:[...]}
function unir(filas,cp,base){
  const cat=C(),porId=new Map(),sinNombre=[],listas={};
  (filas||[]).forEach(f=>{
    const costo=+f.precio;if(!(costo>0)||!f.proveedor)return;
    const L=listas[f.proveedor]||(listas[f.proveedor]=new Map(listaDe(f.proveedor,cp,base).map(p=>[p.id,p])));
    const p=L.get(f.producto_id);
    if(!p||!p.name||cat.fuera(p.name)){sinNombre.push({prov:f.proveedor,pid:f.producto_id,costo});return;}
    const id=cat.idDe(p.name),x={costo,u:unidadInv(p.unit),t:Date.parse(f.updated_at)||0,prov:f.proveedor,pid:f.producto_id,nombre:p.name};
    (porId.get(id)||porId.set(id,[]).get(id)).push(x);
  });
  return{porId,sinNombre};
}
// El costo que vale para un producto del POS: el de la unidad que se vende (kilo ↔ kilo, unidad ↔ unidad) y, entre varios, el más nuevo.
function costoPara(lista,unidadPos){
  const kg=unidadPos==='kg';
  const ok=(lista||[]).filter(x=>x.u==='kg'?kg:x.u==='unidad'?!kg:false);
  if(!ok.length)return null;
  return ok.reduce((a,b)=>(b.t>a.t||(b.t===a.t&&b.costo<a.costo))?b:a);
}

// ── 2) La regla ──
// Qué hacer con un producto cuyo costo cambió. Devuelve {precio, nota|null}
function decidir(p,costoNuevo,margen){
  const cat=C(),precio=+p.precio||0,costoAntes=+p.costo||0,meta=cat.precioMeta(costoNuevo,margen);
  if(!(precio>0)||!meta)return{precio,meta,nota:null};            // sin precio todavía: se pone la primera vez que se vende
  if(precio<meta){
    if(meta>precio*SALTO_MAX)return{precio,meta,nota:{tipo:'revisar',antes:precio,sugerido:meta}};
    return{precio:meta,meta,nota:{tipo:'subio',antes:precio,ahora:meta}};
  }
  if(costoAntes>0&&costoNuevo<costoAntes&&precio>meta)return{precio,meta,nota:{tipo:'bajo',antes:precio,sugerido:meta}};
  return{precio,meta,nota:null};
}
// Aplica la regla a todos los productos activos del POS. `notas` (arreglo) se actualiza.
function aplicar(POS,porId,opc){
  opc=opc||{};const notas=opc.notas||[],margen=opc.margen;
  const res={cambiaron:0,costos:0,subio:0,bajo:0,revisar:0,sinUnidad:0,sinPOS:0};
  const prods=POS.prepare("SELECT id,nombre,precio,costo,unidad,catalogo_id FROM productos WHERE activo = 1 AND catalogo_id IS NOT NULL AND catalogo_id <> ''").all();
  const vistos=new Set();
  prods.forEach(p=>{
    const lista=porId.get(p.catalogo_id);if(!lista)return;
    vistos.add(p.catalogo_id);
    const c=costoPara(lista,p.unidad);if(!c){res.sinUnidad++;return;}
    if(Math.abs(c.costo-(+p.costo||0))<0.005)return;               // el costo no cambió: no se toca nada (ni un precio puesto a mano)
    const d=decidir(p,c.costo,margen);
    POS.prepare("UPDATE productos SET costo = ?, precio = ?, fecha_modificacion = datetime('now','localtime') WHERE id = ?").run([c.costo,d.precio,p.id]);
    res.costos++;
    if(d.nota){
      const prev=notas.findIndex(n=>n.pid===p.id);
      const n={pid:p.id,cid:p.catalogo_id,nombre:p.nombre,costo:c.costo,t:new Date().toISOString(),...d.nota};
      if(prev>=0)notas.splice(prev,1);notas.push(n);res[n.tipo]++;
    }
    if(d.precio!==(+p.precio||0))res.cambiaron++;
  });
  porId.forEach((_,id)=>{if(!vistos.has(id))res.sinPOS++;});
  return res;
}

// ── 3) Notas (localStorage) ──
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
let ctx=null,cargando=false,ultima=0,timer=0,diag=null;
const claveNotas=()=>'pos_notas_precio_'+ctx.suc();
const leerNotas=()=>LS.get(claveNotas(),[]).filter(n=>n&&n.pid);
const guardarNotas=L=>LS.set(claveNotas(),L.slice(-200));
// Solo se muestran las que siguen valiendo: si ya cambiaron el precio a mano, la nota sobra
function vigentes(){
  const POS=ctx&&ctx.POS();if(!POS)return[];
  const dia=14*864e5,out=[],todas=leerNotas();
  todas.forEach(n=>{
    let p=null;try{p=POS.prepare('SELECT id,nombre,precio,activo FROM productos WHERE id = ?').get([n.pid]);}catch(e){}
    if(!p||!p.activo)return;
    const pr=+p.precio||0;
    if(n.tipo==='bajo'&&!(pr>n.sugerido))return;
    if(n.tipo==='revisar'&&!(pr<n.sugerido))return;
    if(n.tipo==='subio'&&Date.now()-Date.parse(n.t)>dia)return;
    out.push({...n,hoy:pr,nombre:p.nombre||n.nombre});
  });
  if(out.length!==todas.length)guardarNotas(out.map(({hoy,...r})=>r));
  return out;
}
function quitar(pid){guardarNotas(leerNotas().filter(n=>n.pid!==pid));}
function ponerPrecio(pid,precio){
  const POS=ctx.POS();
  POS.prepare("UPDATE productos SET precio = ?, fecha_modificacion = datetime('now','localtime') WHERE id = ?").run([precio,pid]);
  if(ctx.recargar)ctx.recargar();
}

// ── 4) La franja y la lista ──
function franja(){
  let b=document.getElementById('pwNotas');
  if(!b){b=document.createElement('div');b.id='pwNotas';b.className='pw-notas';b.hidden=true;b.setAttribute('role','status');document.body.appendChild(b);
    b.addEventListener('click',e=>{if(e.target.closest('[data-pn=ver]'))abrirLista();});}
  return b;
}
function pintarFranja(){
  if(!ctx)return;
  const b=franja(),L=vigentes();
  if(!L.length){b.hidden=true;b.innerHTML='';if(!document.getElementById('pwNotasHoja')?.hidden)pintarLista();return;}
  const rev=L.filter(n=>n.tipo==='revisar'||n.tipo==='bajo').length;
  b.hidden=false;
  b.innerHTML=`<span class="pw-n-t"><b>💲 ${L.length===1?'1 precio cambió':L.length+' precios cambiaron'}</b><span class="pw-n-resto"> por el cierre${rev?` · <em>${rev===1?'1 para revisar':rev+' para revisar'}</em>`:''}</span></span><button type="button" data-pn="ver">Ver</button>`;
  if(!document.getElementById('pwNotasHoja')?.hidden)pintarLista();
}
function hoja(){
  let h=document.getElementById('pwNotasHoja');
  if(!h){
    h=document.createElement('div');h.id='pwNotasHoja';h.className='pw-nh';h.hidden=true;document.body.appendChild(h);
    h.addEventListener('click',e=>{
      if(e.target===h||e.target.closest('[data-pn=cerrar]')){cerrarLista();return;}
      const b=e.target.closest('[data-pn]');if(!b)return;
      const a=b.dataset.pn,pid=+b.dataset.pid;
      if(a==='todas')guardarNotas([]);
      else if(a==='ok')quitar(pid);
      else if(a==='precio'){const n=vigentes().find(x=>x.pid===pid);if(n){ponerPrecio(pid,+b.dataset.v);quitar(pid);if(ctx.aviso)ctx.aviso('✅ '+n.nombre+' quedó en '+dinero(+b.dataset.v));}}
      pintarFranja();pintarLista();
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!h.hidden)cerrarLista();});
  }
  return h;
}
function textoNota(n){
  if(n.tipo==='subio')return`<b>Subió solo:</b> ${dinero(n.antes)} → ${dinero(n.ahora)} <span>(costo ${dinero(n.costo)})</span>`;
  if(n.tipo==='bajo')return`<b>El costo bajó</b> a ${dinero(n.costo)}: podés bajarlo a ${dinero(n.sugerido)} <span>(hoy ${dinero(n.hoy)})</span>`;
  return`<b>Revisalo:</b> el costo subió a ${dinero(n.costo)} y el precio de ${dinero(n.hoy)} queda corto. Con 40 % serían ${dinero(n.sugerido)}`;
}
function pintarLista(){
  const h=hoja(),L=vigentes();
  const filas=L.map(n=>`<li class="pw-nf pw-nf-${n.tipo}"><div class="pw-nf-t"><strong>${esc(n.nombre)}</strong><p>${textoNota(n)}</p></div><div class="pw-nf-b">
      ${n.tipo==='bajo'?`<button type="button" class="pw-nb prim" data-pn="precio" data-pid="${n.pid}" data-v="${n.sugerido}">Bajar a ${dinero(n.sugerido)}</button>`:''}
      ${n.tipo==='revisar'?`<button type="button" class="pw-nb prim" data-pn="precio" data-pid="${n.pid}" data-v="${n.sugerido}">Subir a ${dinero(n.sugerido)}</button>`:''}
      ${n.tipo==='subio'?`<button type="button" class="pw-nb" data-pn="precio" data-pid="${n.pid}" data-v="${n.antes}">Dejar en ${dinero(n.antes)}</button>`:''}
      <button type="button" class="pw-nb${n.tipo==='subio'?' prim':''}" data-pn="ok" data-pid="${n.pid}">Entendido</button></div></li>`).join('');
  h.innerHTML=`<div class="pw-nh-c" role="dialog" aria-modal="true" aria-labelledby="pwNhT"><div class="pw-nh-cab"><h2 id="pwNhT">💲 Precios que cambiaron por el cierre</h2><button type="button" class="pw-nb" data-pn="cerrar">Cerrar</button></div>
    <p class="pw-nh-s">El costo sale del Cierre de compras. El precio nunca baja solo: si el costo bajó, vos decidís.</p>
    ${L.length?`<ul class="pw-nl">${filas}</ul><div class="pw-nh-pie"><button type="button" class="pw-nb" data-pn="todas">Entendido todas</button></div>`:'<p class="pw-nh-vacio">No hay nada pendiente. ✔️</p>'}</div>`;
}
function abrirLista(){const h=hoja();pintarLista();h.hidden=false;const b=h.querySelector('button.prim,button');if(b)b.focus();}
function cerrarLista(){const h=document.getElementById('pwNotasHoja');if(h)h.hidden=true;}

// ── 5) Leer la nube (solo GET) y aplicar ──
async function leer(ruta){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);
  try{
    const r=await fetch(ctx.url+'/rest/v1/'+ruta,{headers:{apikey:ctx.key,Authorization:'Bearer '+ctx.key},signal:c.signal});
    if(!r.ok)throw new Error('nube '+r.status);
    return await r.json();
  }finally{clearTimeout(t);}
}
async function filasPrecios(){
  const out=[];
  for(let o=0;o<20000;o+=1000){
    const f=await leer('precios?select=proveedor,producto_id,precio,updated_at&order=proveedor,producto_id&limit=1000&offset='+o);
    if(!Array.isArray(f))break;out.push(...f);if(f.length<1000)break;
  }
  return out;
}
async function revisar(forzar){
  if(!ctx||cargando)return null;
  if(!ctx.puede())return null;
  if(!forzar&&Date.now()-ultima<MIN_ENTRE)return null;
  cargando=true;ultima=Date.now();
  try{
    const [filas,cfg]=await Promise.all([filasPrecios(),leer('app_config?select=custom_providers&id=eq.main')]);
    const cp=(cfg&&cfg[0]&&cfg[0].custom_providers)||{},base=(window.ARAMO_SUPPLIER_BASE&&window.ARAMO_SUPPLIER_BASE.providers)||{};
    return aplicarFilas(filas,cp,base);
  }catch(e){return null;}   // sin internet o sin tabla: se vuelve a intentar en la próxima vuelta
  finally{cargando=false;}
}
function aplicarFilas(filas,cp,base){
  const POS=ctx.POS();if(!POS||!window.ARAMO_CAT)return null;
  const u=unir(filas,cp,base),notas=leerNotas(),res=aplicar(POS,u.porId,{notas,margen:C().MARGEN_MIN});
  res.sinNombre=u.sinNombre.length;res.filas=(filas||[]).length;
  diag={t:new Date().toISOString(),...res};LS.set('pos_precios_diag_'+ctx.suc(),diag);
  if(res.costos){guardarNotas(notas);if(ctx.recargar)ctx.recargar();}
  pintarFranja();
  return res;
}
function iniciar(o){
  ctx=o;
  window.addEventListener('online',()=>setTimeout(()=>revisar(),1500));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')revisar();});
  clearInterval(timer);timer=setInterval(()=>revisar(),CADA);
  pintarFranja();
  return revisar(true);
}
return{iniciar,revisar,unir,costoPara,decidir,aplicar,aplicarFilas,listaDe,vigentes,pintarFranja,abrirLista,dinero,unidadInv,get diag(){return diag;}};
})();
