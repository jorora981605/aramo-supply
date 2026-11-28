/* precios-venta.js — el precio de VENTA de cada tienda, visto y cambiado desde Inventario («Productos y precios»). 2026-11-27
   · Qué precio se ve: el del ARAMO POS de esa tienda (su catálogo publicado, ARAMO_CAT.posDe). Si alguien lo cambió desde
     Inventario después de esa publicación, se ve el nuevo (con «⏳ llega a la caja» hasta que el POS lo pone).
   · En Ambos se ven y se cambian las dos tiendas; en Moravia o Los Ángeles, solo la suya. Una tienda no toca a la otra.
   · Cambiar = una fila en la tabla aramo_precio_venta (tienda, id de ARAMO). La caja activa del POS de esa tienda la lee
     (pos-precios.js, cada minuto), pone el precio y publica su catálogo: La Feria y Ambos ven el precio nuevo. */
(function(){
'use strict';
const TIENDAS=['moravia','angeles'];
const NOMBRE={moravia:'Moravia',angeles:'Los Ángeles'};
const LS_K='aramo_precio_venta_v1';
const C=()=>window.ARAMO_CAT;
let filas={};            // 'tienda|id' → fila de la nube (o puesta aquí mismo)
let cargado=0,_carga=null,sinTabla=false;
try{filas=JSON.parse(localStorage.getItem(LS_K)||'{}')||{};}catch(e){filas={};}
const guardarLocal=()=>{try{localStorage.setItem(LS_K,JSON.stringify(filas));}catch(e){}};
const cliente=()=>{try{return typeof supa!=='undefined'?supa:null;}catch(e){return null;}};

// ¿Qué tiendas se ven en la pantalla de ahora? Ambos → las dos; una tienda → solo esa.
function visibles(){
  let s='both';try{s=typeof scopeSide==='function'?scopeSide():'both';}catch(e){}
  return s==='moravia'?['moravia']:s==='angeles'?['angeles']:TIENDAS.slice();
}
function idDe(nombre){const c=C();return c?c.idDe(nombre):String(nombre||'').toLowerCase();}
const _idx={};   // por tienda: el catálogo del POS indexado por id (se rehace solo si el catálogo cambió)
function delPOS(suc,id){
  const c=C();if(!c||!c.posDe)return null;
  const L=c.posDe(suc)||{};
  let e=_idx[suc];
  if(!e||e.L!==L){const m=new Map();for(const k in L){const x=L[k];if(x&&x.id&&!m.has(x.id))m.set(x.id,x);}e=_idx[suc]={L,m};}
  return e.m.get(id)||null;
}
// {p, pend, origen:'pos'|'inventario', u} o null si esa tienda no tiene precio todavía
function precio(suc,nombre){
  const id=idDe(nombre),f=filas[suc+'|'+id],pos=delPOS(suc,id);
  const tPos=Date.parse(C()&&C().posFecha?C().posFecha(suc):'')||0;
  if(f&&+f.precio>0&&(Date.parse(f.at)||0)>tPos){
    const puesto=f.aplicado_at&&Date.parse(f.aplicado_at)>=Date.parse(f.at);
    return{p:+f.precio,pend:!puesto,origen:'inventario',u:f.unidad||(pos&&pos.u)||''};
  }
  if(pos&&+pos.p>0)return{p:+pos.p,pend:false,origen:'pos',u:pos.u||''};
  return null;
}
// Lee la tabla de la nube (solo GET). Sin el SQL todavía: queda lo de este aparato y avisa en la hoja.
function cargar(forzar){
  if(_carga)return _carga;
  if(!forzar&&Date.now()-cargado<45000)return Promise.resolve(filas);
  const s=cliente();
  _carga=(async()=>{
    try{if(C()&&C().cargar)await Promise.race([C().cargar(),new Promise(r=>setTimeout(r,6000))]);}catch(e){}
    if(!s)return filas;
    try{
      const r=await s.from('aramo_precio_venta').select('*');
      if(r.error){if(/aramo_precio_venta|PGRST205|42P01/.test((r.error.code||'')+' '+(r.error.message||'')))sinTabla=true;return filas;}
      sinTabla=false;const nuevo={};
      (r.data||[]).forEach(f=>{nuevo[f.tienda+'|'+f.id]=f;});
      // lo puesto aquí que todavía no subió no se pierde
      Object.entries(filas).forEach(([k,f])=>{if(f&&f._local&&(!nuevo[k]||Date.parse(nuevo[k].at)<Date.parse(f.at)))nuevo[k]=f;});
      filas=nuevo;guardarLocal();cargado=Date.now();
      try{window.dispatchEvent(new Event('aramo-precio-venta'));}catch(e){}
    }catch(e){}
    return filas;
  })().finally(()=>{_carga=null;});
  return _carga;
}
// Pone el precio de venta de UNA tienda. Devuelve {ok, motivo}
async function poner(suc,nombre,valor,unidad){
  const precio=Math.round(+valor*100)/100;
  if(!TIENDAS.includes(suc)||!(precio>0))return{ok:false,motivo:'datos'};
  let por='ambos';try{por=typeof scopeSide==='function'&&scopeSide()!=='both'?scopeSide():'ambos';}catch(e){}
  const id=idDe(nombre),fila={tienda:suc,id,nombre:String(nombre||'').slice(0,120),precio,unidad:unidad==='kg'?'kg':'unid',por,at:new Date().toISOString(),aplicado_at:null};
  filas[suc+'|'+id]={...fila,_local:true};guardarLocal();
  const s=cliente();if(!s)return{ok:false,motivo:'nube'};
  try{
    const r=await s.from('aramo_precio_venta').upsert(fila,{onConflict:'tienda,id'});
    if(r.error){
      if(/aramo_precio_venta|PGRST205|42P01/.test((r.error.code||'')+' '+(r.error.message||''))){sinTabla=true;return{ok:false,motivo:'sql'};}
      return{ok:false,motivo:'nube'};
    }
    delete filas[suc+'|'+id]._local;guardarLocal();sinTabla=false;
    return{ok:true};
  }catch(e){return{ok:false,motivo:'nube'};}
}
// Sugerido con la regla de ARAMO: costo + 40 %, redondeado hacia arriba a ₡25
function sugerido(costo){const c=C();return c&&c.precioMeta&&+costo>0?c.precioMeta(+costo):0;}
window.AramoVenta={TIENDAS,NOMBRE,visibles,precio,cargar,poner,sugerido,idDe,get sinTabla(){return sinTabla;}};
})();
