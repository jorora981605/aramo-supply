/* ════════════════════════════════════════════════════════════════════════
   ARAMO · Reinicio a cero de Inventario, Mostrador y La Feria (2026-11-26)

   El dueño deja "todo en cero, como recién instalada" corriendo ARAMO-REINICIAR-EN-CERO-….sql.
   Ese SQL cambia la fila 'general' de la tabla aramo_reinicio (columna `at`). Aquí solo se LEE
   (GET con la llave pública; nada se escribe en la nube). Cada app tiene su marca en ESTE aparato:
       aramo_reinicio_visto_inventario · aramo_reinicio_visto_mostrador · aramo_reinicio_visto_feria
   (las del POS y del Control no se tocan). Si `at` es más nuevo que la marca de esa app:
     1) se guarda una COPIA de lo que se va a borrar  (localStorage `aramo_respaldo_reinicio_<app>`,
        o IndexedDB `aramo-respaldo` si no cabe; la copia anterior pasa a `…_anterior`);
     2) se borran los MOVIMIENTOS de esa app en este aparato;
     3) se guarda la marca;
     4) se recarga la página UNA vez (solo si de verdad se borró algo);
     5) al volver sale el aviso "Quedó en cero para empezar a probar. Se guardó una copia."
   Sin tabla (404), sin fila, con la red caída o lenta (más de 4 s) NO se hace nada.
   Un aparato nuevo (sin marca) borra lo poco que tenga, guarda la marca y no recarga si no había nada.
   Si la copia no se pudo guardar, NO se borra nada (se intenta de nuevo en la próxima apertura).

   Dos cuidados mientras se decide (por lo general menos de un segundo):
     · las escrituras (POST/PATCH/DELETE) a *.supabase.co esperan el resultado, para que un aparato con
       datos viejos no los vuelva a subir a la nube ya en cero;
     · después de borrar y antes de recargar, la app no puede volver a escribir lo borrado desde su memoria.

   ── Qué es MOVIMIENTO (se borra) y qué se QUEDA ────────────────────────────────────────────────
   INVENTARIO  (APP.html + express.js + leido.js)
     SE BORRA
       aramo4 → SOLO el campo `pedidos` (cantidades, extras, notas, "enviado" y horas de envío de cada
                proveedor). El resto de aramo4 se queda: proveedores propios, orden, favoritos,
                teléfonos y contactos de WhatsApp, margen, presupuesto, destinatarios del PDF.
       aramo_hist               historial de pedidos guardado en el aparato
       aramo_syncbase           foto de lo ya sincronizado de esos pedidos
       aramo_cierre             estado del Cierre de compras en curso
       aramo_cierres            cierres ya hechos (historial) en este aparato
       aramo_surtido_hist_v1    historial de envíos de Inventario
       aramo_pedido_ultimo_dia  marca del cambio de día del pedido
       aramo_leido_pend / _cache / _avisados   enlaces "Leído" pendientes, su caché y lo ya avisado
     SE QUEDA
       aramo_prices (precios) · aramo_lp (último precio) · aramo_cierre_precios (precio del último cierre,
       sirve de referencia: son precios) · aramo_cierre_pagos (cómo se paga a cada proveedor, preferencia)
       aramo_supplier_base_version · aramo_order_scope (alcance del Inventario) · aramo_local y
       aramo_local_sesion (tienda escogida) · aramo_mi_wa (mi WhatsApp) · aramo_pdf_auto y aramo_pdf_firma
       (firma del PDF) · aramo_leido_enlace / _ok / _permiso (interruptor y estado del "Leído")
       aramo_theme · aramo_letras · aramo_portada · aramo_portada_foto · pwa_dismissed · pwaInstallBanner
       aramo_cat_nube (copia del catálogo) · aramo_tienda_v1 y aramo_tienda_nube_v1 (ajustes de la tienda) · aramo-nube-auth y
       sb-* (inicio de sesión) · aramo_anon_id · avisos activados (permiso del navegador, no se guarda aquí)

   MOSTRADOR  (APP.html + puerta.js + aramo-nube.js)
     SE BORRA
       aramo_encargos_v1        copia local de los pedidos de La Feria (vistos y no vistos)
       aramo_encargos_pend      pedidos por subir a la nube
       aramo_encargos_changes   cambios por subir (cambios pendientes)
       aramo_sin_abrir          pedidos "sin abrir" (de ahí sale la alarma y la insignia)
       aramo_cambios_sin_ver    cambios que el cliente hizo a un pedido y nadie ha visto
       aramo_borradores         borradores de pedidos a medio alistar (caja y ajustes de cada pedido)
       aramo_reinicio_respaldo  el "Deshacer reinicio" de pedidos (trae pedidos viejos)
       aramo_pos_encargo        pedido que se estaba pasando al POS
       aramo_pos_feria_*        tiquetes de La Feria que esperan en el POS
       aramo_pos_cotizacion_*   cotizaciones que vuelven del POS
       aramo_pos_venta_*        ventas del POS que vuelven al Mostrador
     SE QUEDA
       aramo_tienda_v1 y aramo_tienda_nube_v1 (ficha de la tienda: sucursales, horarios, envío, margen,
       SINPE; la segunda es la copia de la nube guardada en el teléfono) · aramo_receptor (sonido y qué tienda
       escucha) · aramo_atiende (quién atiende) · aramo_avisos_franja · aramo_vit_notas (notas de la
       vitrina de productos) · aramo_local / aramo_local_sesion · aramo_theme · aramo_portada_foto ·
       aramo_cat_nube · inicio de sesión del personal (aramo-nube-auth, sb-*)

   LA FERIA  (canasta.html + canasta.js)
     SE BORRA
       cn_cesta        la canasta
       cn_mis          la lista de "mis pedidos" de este aparato
       cn_nota         la nota del pedido en curso
       cn_cambio       el estado de "Cambiar mi pedido" / "Agregando a tu pedido" (trae la canasta anterior)
       cn_cot_vistas   las cotizaciones que el cliente ya había visto
       cn_premio       el premio escogido para el próximo pedido
       cn_pago         SOLO `conCuanto` (con cuánto paga); el método de pago preferido se queda
       cn_retiro       SOLO `hora` y `dia` (la hora que se había escogido); tienda, entrega, ubicación y
                       señas se quedan
       aramo_encargos_v1 / _pend / _changes   copia local de los pedidos (los avisos de estado) y los
                       cambios pendientes (es la MISMA copia que usa el Mostrador)
     SE QUEDA
       cn_perfil (nombre y teléfono) · cn_factura (datos de factura) · cn_consent (permiso de privacidad)
       cn_sust · cn_personas · cn_info_open · cn_theme · aramo_local (tienda preferida) · aramo_anon_id ·
       direcciones guardadas (viven en la nube) · cn_retiro.suc (tienda preferida) · aramo_cat_nube

   NO SE TOCA NUNCA (otras apps): aramo_reinicio_visto_pos_<tienda>, aramo_reinicio_aviso_pos_<tienda>,
   aramo_reinicio_visto_control_angeles y todo lo del POS y el Control.
   Ninguna de las tres apps usa IndexedDB ni sessionStorage para movimientos.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';
const ESPERA_MS=4000;
const MENSAJE='Quedó en cero para empezar a probar. Se guardó una copia.';

// Qué se borra por app. claves: se quitan enteras · prefijos: todas las que empiezan así ·
// parciales: { clave: { campo: valorEnCero } } → solo ese campo vuelve a su valor en cero.
const ENCARGOS=['aramo_encargos_v1','aramo_encargos_pend','aramo_encargos_changes'];
const DEFS={
  inventario:{
    claves:['aramo_hist','aramo_syncbase','aramo_cierre','aramo_cierres','aramo_surtido_hist_v1','aramo_pedido_ultimo_dia','aramo_leido_pend','aramo_leido_cache','aramo_leido_avisados'],
    prefijos:[],
    parciales:{aramo4:{pedidos:{}}}
  },
  mostrador:{
    // aramo_pos_nube y aramo_pos_pend_*: cobros del Mostrador que esperan entrar al POS (cola) → movimiento.
    // aramo_sinpe_ultimo_* (a quién se le hizo el último SINPE) es una preferencia: se queda.
    claves:[...ENCARGOS,'aramo_sin_abrir','aramo_cambios_sin_ver','aramo_borradores','aramo_reinicio_respaldo','aramo_pos_encargo','aramo_pos_nube'],
    prefijos:['aramo_pos_feria_','aramo_pos_cotizacion_','aramo_pos_venta_','aramo_pos_pend_'],
    parciales:{}
  },
  feria:{
    claves:[...ENCARGOS,'cn_cesta','cn_mis','cn_nota','cn_premio','cn_cambio','cn_cot_vistas'],
    prefijos:[],
    parciales:{cn_pago:{conCuanto:0},cn_retiro:{hora:null,dia:0}}
  }
};

// ── Qué apps vive en esta página ──
let APPS=['inventario','mostrador'];
try{
  const d=document.currentScript&&document.currentScript.getAttribute('data-apps');
  if(d)APPS=d.split(',').map(s=>s.trim()).filter(s=>DEFS[s]);
}catch(e){}
// Dentro de una vista previa (iframe o ?mini=1) no se hace nada: lo decide la página principal.
let enMarco=false;try{enMarco=window.top!==window||/[?&]mini=1/.test(location.search);}catch(e){enMarco=true;}

const _setItem=Storage.prototype.setItem;
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{_setItem.call(localStorage,k,v);return true;}catch(e){return false;}};
const lsDel=k=>{try{localStorage.removeItem(k);}catch(e){}};
const lsKeys=()=>{try{return Object.keys(localStorage);}catch(e){return [];}};
const esJSON=raw=>{try{return {ok:true,v:JSON.parse(raw)};}catch(e){return {ok:false};}};
const vacio=raw=>raw==null||/^\s*(\[\]|\{\}|null|""|false|0)?\s*$/.test(raw);

// ── Aviso al volver (la bandera la deja el reinicio justo antes de recargar) ──
function avisoPendiente(){
  let hay=false;
  APPS.forEach(a=>{const k='aramo_reinicio_aviso_'+a;if(lsGet(k)!=null){hay=true;lsDel(k);}});
  if(!hay)return;
  const propio=()=>{
    try{
      const d=document.createElement('div');d.setAttribute('role','status');d.textContent=MENSAJE;
      d.style.cssText='position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);transform:translateX(-50%);max-width:min(92vw,420px);padding:12px 16px;border-radius:14px;background:#1f2a24;color:#fff;font:600 14px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.28);z-index:2147483000';
      document.body.appendChild(d);setTimeout(()=>{try{d.remove();}catch(e){}},9000);
    }catch(e){}
  };
  const intentar=n=>{
    if(window.AramoUI&&typeof window.AramoUI.aviso==='function'){try{window.AramoUI.aviso(MENSAJE,{tipo:'ok',ms:9000});return;}catch(e){}}
    if(n<12)setTimeout(()=>intentar(n+1),250);else propio();
  };
  const arrancar=()=>setTimeout(()=>intentar(0),500);
  if(document.readyState==='complete')arrancar();else window.addEventListener('load',arrancar,{once:true});
}

// ── Escrituras a la nube: esperan a saber si hay reinicio ──
let estado='espera';                 // 'espera' → 'libre' (seguir normal) | 'reinicio' (se va a recargar)
let soltar;const decidido=new Promise(r=>{soltar=r;});
const fetchOriginal=window.fetch?window.fetch.bind(window):null;
if(fetchOriginal&&!enMarco){
  window.fetch=function(entrada,op){
    try{
      if(estado!=='libre'){
        const m=String((op&&op.method)||(entrada&&entrada.method)||'GET').toUpperCase();
        const u=typeof entrada==='string'?entrada:String((entrada&&entrada.url)||entrada||'');
        if(m!=='GET'&&m!=='HEAD'&&m!=='OPTIONS'&&/\.supabase\.co(\/|$)/.test(u)){
          return decidido.then(()=>estado==='libre'?fetchOriginal(entrada,op):new Promise(()=>{}));
        }
      }
    }catch(e){}
    return fetchOriginal(entrada,op);
  };
}
function liberar(){estado='libre';soltar();}

// ── Que la app no vuelva a escribir lo borrado desde su memoria mientras se recarga ──
function protegerEscritura(planes){
  const claves=new Set(),prefijos=[];
  planes.forEach(p=>{p.quitar.forEach(k=>claves.add(k));Object.keys(p.parciales).forEach(k=>claves.add(k));DEFS[p.app].claves.forEach(k=>claves.add(k));DEFS[p.app].prefijos.forEach(x=>prefijos.push(x));Object.keys(DEFS[p.app].parciales).forEach(k=>claves.add(k));});
  Storage.prototype.setItem=function(k,v){
    if(this===window.localStorage){const s=String(k);if(claves.has(s)||prefijos.some(x=>s.startsWith(x)))return;}
    return _setItem.call(this,k,v);
  };
}

// ── La marca en la nube (solo lectura) ──
async function leerMarca(){
  if(!fetchOriginal)return null;
  const c=typeof AbortController==='function'?new AbortController():null,t=c?setTimeout(()=>c.abort(),ESPERA_MS):0;
  try{
    const r=await fetchOriginal(SUPA_URL+'/rest/v1/aramo_reinicio?select=at&id=eq.general',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},signal:c?c.signal:undefined});
    if(!r.ok)return null;                      // 404: todavía no existe la tabla
    const a=await r.json();
    const at=Array.isArray(a)&&a[0]&&a[0].at;
    return at&&Date.parse(at)>0?String(at):null;
  }catch(e){return null;}
  finally{clearTimeout(t);}
}

// ── Qué hay que borrar de una app en este aparato ──
function planear(app){
  const d=DEFS[app],claves={},parciales={},quitar=[],escribir={};
  let hay=false;
  const claveVa=k=>{const raw=lsGet(k);if(raw==null)return;quitar.push(k);if(vacio(raw))return;hay=true;const j=esJSON(raw);claves[k]=j.ok?j.v:raw;};
  d.claves.forEach(claveVa);
  if(d.prefijos.length)lsKeys().filter(k=>d.prefijos.some(p=>k.startsWith(p))).forEach(claveVa);
  Object.keys(d.parciales).forEach(k=>{
    const raw=lsGet(k),j=raw==null?{ok:false}:esJSON(raw);
    if(!j.ok||!j.v||typeof j.v!=='object'||Array.isArray(j.v))return;
    const campos={};let cambia=false;
    Object.keys(d.parciales[k]).forEach(c=>{
      const cero=d.parciales[k][c];
      if(c in j.v&&JSON.stringify(j.v[c])!==JSON.stringify(cero)){campos[c]=j.v[c];cambia=true;}
    });
    if(!cambia)return;
    hay=true;parciales[k]=campos;escribir[k]=JSON.stringify(Object.assign({},j.v,d.parciales[k]));
  });
  return{app,claves,parciales,quitar,escribir,hay};
}

// ── La copia: localStorage, o IndexedDB si no cabe ──
function guardarIDB(clave,texto){
  return new Promise(res=>{
    try{
      const q=indexedDB.open('aramo-respaldo',1);
      q.onupgradeneeded=()=>{try{q.result.createObjectStore('respaldos');}catch(e){}};
      q.onerror=()=>res(false);
      q.onsuccess=()=>{
        try{
          const db=q.result,tx=db.transaction('respaldos','readwrite');
          tx.objectStore('respaldos').put(texto,clave);
          tx.oncomplete=()=>{db.close();res(true);};
          tx.onerror=tx.onabort=()=>{try{db.close();}catch(e){}res(false);};
        }catch(e){res(false);}
      };
    }catch(e){res(false);}
  });
}
async function respaldar(plan,at){
  const resp={version:1,app:plan.app,at,fecha:new Date().toISOString(),claves:plan.claves,parciales:plan.parciales};
  const texto=JSON.stringify(resp),k='aramo_respaldo_reinicio_'+plan.app,previo=lsGet(k);
  if(lsSet(k,texto)&&lsGet(k)===texto){
    if(previo!=null)lsSet(k+'_anterior',previo);   // la copia de antes no se pierde (si cabe)
    return 'localStorage';
  }
  if(previo!=null)lsSet(k,previo);                 // no dejar a medias
  return (await guardarIDB(k+'_'+at,texto))?'indexedDB':null;
}

async function revisar(){
  const planesIni=APPS.map(a=>({app:a,visto:lsGet('aramo_reinicio_visto_'+a)}));
  const at=await leerMarca();
  if(!at){liberar();return;}
  const atMs=Date.parse(at);
  const pendientes=planesIni.filter(p=>atMs>(Date.parse(String(p.visto||'').replace(/^"|"$/g,''))||0)).map(p=>p.app);
  if(!pendientes.length){liberar();return;}
  const planes=pendientes.map(planear);
  // 1) PRIMERO la copia. Si no se pudo, no se borra nada.
  for(const p of planes){
    if(!p.hay)continue;
    const donde=await respaldar(p,at);
    if(!donde){console.warn('[reinicio] no se pudo guardar la copia de '+p.app+'; no se borra nada por ahora');liberar();return;}
  }
  // 2) se borra (y la app ya no puede reescribirlo desde su memoria)
  estado='reinicio';
  protegerEscritura(planes);
  planes.forEach(p=>{p.quitar.forEach(lsDel);Object.keys(p.escribir).forEach(k=>_setItem.call(localStorage,k,p.escribir[k]));});
  // 3) la marca de cada app
  let marcaOk=true;
  planes.forEach(p=>{if(!lsSet('aramo_reinicio_visto_'+p.app,at)||lsGet('aramo_reinicio_visto_'+p.app)!==at)marcaOk=false;});
  const borro=planes.filter(p=>p.hay);
  if(!borro.length){Storage.prototype.setItem=_setItem;liberar();return;}   // aparato nuevo o ya vacío: sin recargar
  if(!marcaOk){console.warn('[reinicio] no se pudo guardar la marca; no se recarga');Storage.prototype.setItem=_setItem;liberar();return;}
  // 4) el aviso queda anotado y se recarga UNA vez
  borro.forEach(p=>lsSet('aramo_reinicio_aviso_'+p.app,'1'));
  soltar();
  try{location.reload();}catch(e){}
}

window.AramoReinicio={listo:null};
if(!enMarco){
  avisoPendiente();
  window.AramoReinicio.listo=revisar().catch(e=>{console.warn('[reinicio]',e);try{Storage.prototype.setItem=_setItem;}catch(x){}liberar();});
}else{liberar();}
})();
