/* ══════════════════════════════════════════════════════════════════════
   ARAMO POS en la web (2026-10-15)
   Es el mismo ARAMO POS de Windows (mismas pantallas y mismas reglas: su
   main.js corre aquí tal cual, sobre sql.js), pero la base vive:
   • en este dispositivo (IndexedDB), para cobrar aunque se caiga el internet, y
   • en la nube de ARAMO, una por local (Moravia y LASR), con contraseña.
   Solo un dispositivo cobra a la vez en cada local ("caja activa"); los demás
   miran en modo lectura o toman la caja. Cada cambio sube solo a la nube.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48';
const SUCS={moravia:{n:'ARAMO',zona:'Moravia'},angeles:{n:'LASR',zona:'Los Ángeles'}};
const TROZO=256*1024, LATIDO=30000, VENCE=5*60000; // la caja se libera sola si su dispositivo no da señales en 5 min
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}},del(k){try{localStorage.removeItem(k);}catch{}}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nomSuc=k=>SUCS[k]?SUCS[k].n+' '+SUCS[k].zona:k;
const zona=k=>SUCS[k]?.zona||k;

// ── Este dispositivo ──
function nuevoId(){const a=new Uint8Array(8);crypto.getRandomValues(a);return 'd'+[...a].map(b=>b.toString(16).padStart(2,'0')).join('');}
function autoNombre(){
  const u=navigator.userAgent;
  const nav=/Edg\//.test(u)?'Edge':/OPR\//.test(u)?'Opera':/Firefox\//.test(u)?'Firefox':/Chrome\//.test(u)?'Chrome':/Safari\//.test(u)?'Safari':'Navegador';
  const so=/iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Android/.test(u)?'Android':/Windows/.test(u)?'Windows':/Mac OS/.test(u)?'Mac':/Linux/.test(u)?'Linux':'';
  return so?`${nav} · ${so}`:nav;
}
const DISP=LS.get('pos_disp')||(()=>{const d=nuevoId();LS.set('pos_disp',d);return d;})();
let NOMBRE=LS.get('pos_disp_nombre')||autoNombre();

// ── Estado ──
let SUC=null,CLAVE=null,supa=null,POS=null,SQLp=null,BYTES=null;
let version=0,sucio=false,dueno=false,soloLectura=true,info=null,cambios=0,subiendo=false,offline=false,falloRed=0,iniciando=false,nuevos=false,muerto=false;
let tLocal=0,tSubir=0,tMax=0;
let listoRes;const listo=new Promise(r=>{listoRes=r;});
const HANDLERS={},ESCUCHAS={};
const POS_CIERRE_KEY='aramo_pos_cierre_v1_';
const ESCRIBE=new Set(['productos:crear','productos:actualizar','productos:eliminar','productos:ajustar_stock','productos:crear_lote',
  'promociones:crear','promociones:actualizar','promociones:eliminar','caja:abrir','caja:cerrar','ventas:crear','ventas:anular','ventas:devolver_item',
  'config:guardar','facturas:crear','facturas:actualizar_estado','cajeros:crear','cajeros:actualizar','cajeros:eliminar','cajeros:guardarPermisos',
  'inventario:ajustar','inventario:entrada','backup:restaurar','backup:ejecutar','fiados:abonar','fiados:anular_pago']);

// ── Puente para las pantallas del POS (window.db llama aquí, como el preload de Windows) ──
window.POSWEB={
  async invoke(c,...a){
    await listo;
    if(muerto)throw new Error('Este POS se abrió en otra pestaña.');
    if(soloLectura&&ESCRIBE.has(c)&&COLA.lista&&!NO_COLA.has(c)){
      const res=await colaEncargar(c,a);
      return res;
    }
    if(soloLectura&&ESCRIBE.has(c)){
      aviso('👀 Solo lectura: la caja de '+zona(SUC)+' está abierta en '+(info?.dueno_nombre||'otro dispositivo')+'. Tocá el estado de arriba y «Usar la caja aquí».');
      throw new Error('Solo lectura: la caja está abierta en '+(info?.dueno_nombre||'otro dispositivo')+'.');
    }
    const fn=HANDLERS[c];
    if(!fn)throw new Error('Esta función no está disponible en la web: '+c);
    const result=await fn({sender:null},...a);
    if(ESCRIBE.has(c)&&window.PosDia){try{window.PosDia.cambio(c,a,result);}catch(e){console.warn('[pos] resumen del día',e);}}
    if(c==='ventas:crear'||c==='ventas:anular'||c==='ventas:devolver_item'||c==='fiados:abonar'||c==='fiados:anular_pago'){
      const fecha=result?.fecha?String(result.fecha).slice(0,10):posFechaISO();
      setTimeout(()=>{posPublicarResumen(fecha);},0);
    }
    return result;
  },
  send(c){if(c==='app:force-close')salirYa();},
  on(c,cb){(ESCUCHAS[c]=ESCUCHAS[c]||[]).push(cb);},
  off(c){delete ESCUCHAS[c];},
  estado:()=>({SUC,version,sucio,dueno,soloLectura,offline,info,DISP,NOMBRE,compartida:COLA.lista&&!dueno,cola:COLA.lista}),
  compartida:()=>COLA.lista&&!dueno,
  refrescar:()=>latido(),
  subir:()=>subir(),
  latido:()=>latido(),
  listo,
};

// ── SHA-256 síncrono (el POS guarda los PIN de cajeros así: sha256(pin + sal)) ──
const K256=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256hex(str){
  const b=new TextEncoder().encode(String(str)),l=b.length,n=((l+9+63)>>6)<<6,m=new Uint8Array(n);
  m.set(b);m[l]=0x80;const dv=new DataView(m.buffer),bits=l*8;
  dv.setUint32(n-4,bits>>>0);dv.setUint32(n-8,Math.floor(bits/4294967296));
  const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64);
  for(let i=0;i<n;i+=64){
    for(let t=0;t<16;t++)w[t]=dv.getUint32(i+t*4);
    for(let t=16;t<64;t++){const x=w[t-15],y=w[t-2];w[t]=(w[t-16]+((x>>>7|x<<25)^(x>>>18|x<<14)^(x>>>3))+w[t-7]+((y>>>17|y<<15)^(y>>>19|y<<13)^(y>>>10)))|0;}
    let [a,bb,c,d,e,f,g,h]=H;
    for(let t=0;t<64;t++){
      const t1=(h+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+((e&f)^(~e&g))+K256[t]+w[t])|0;
      const t2=(((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+((a&bb)^(a&c)^(bb&c)))|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=bb;bb=a;a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0;H[1]=(H[1]+bb)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
  }
  return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
window.POSWEB.sha256hex=sha256hex;

// ── Lo que el main.js de Windows necesita, en versión web ──
const H={
  electron:{
    app:{whenReady:()=>({then(){}}),on(){},getPath:()=>'',isPackaged:true,relaunch(){},exit(){},quit(){}},
    BrowserWindow:function(){},
    ipcMain:{handle:(c,fn)=>{HANDLERS[c]=fn;},on(){}},
    dialog:{showErrorBox(){},showOpenDialog:async()=>({canceled:true,filePaths:[]})},
    shell:{openPath(){}},
  },
  path:{join:(...a)=>a.join('/')},
  fs:{existsSync:()=>false,readFileSync(){throw new Error('sin disco');},writeFileSync(){},mkdirSync(){},copyFileSync(){},readdirSync:()=>[],statSync:()=>({size:0}),unlinkSync(){}},
  https:{get(){throw new Error('sin https');}},
  crypto:{
    randomBytes(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return{toString:()=>[...a].map(b=>b.toString(16).padStart(2,'0')).join('')};},
    createHash(){let d='';const o={update(s){d+=String(s);return o;},digest:()=>sha256hex(d)};return o;},
  },
  process:{env:{},platform:'web',resourcesPath:''},
  sql:()=>SQLp,
  bytes:()=>BYTES,
  cambio(){if(!iniciando)marcarCambio();},
};

// ── IndexedDB: la base de cada local en este dispositivo ──
function idb(){return new Promise((ok,mal)=>{const r=indexedDB.open('aramo-pos',1);r.onupgradeneeded=()=>{r.result.createObjectStore('bases');r.result.createObjectStore('conflictos');};r.onsuccess=()=>ok(r.result);r.onerror=()=>mal(r.error);});}
async function idbOp(store,modo,fn){const d=await idb();return new Promise((ok,mal)=>{const tx=d.transaction(store,modo),st=tx.objectStore(store);const r=fn(st);tx.oncomplete=()=>ok(r?.result);tx.onerror=()=>mal(tx.error);});}
const idbGet=k=>idbOp('bases','readonly',s=>s.get(k)).catch(()=>null);
const idbPut=(k,v)=>idbOp('bases','readwrite',s=>s.put(v,k)).catch(e=>console.warn('[pos] sin guardar local',e));
async function guardarConflicto(rec,motivo){
  if(!rec?.bytes)return;
  const clave=SUC+':'+new Date().toISOString();
  await idbOp('conflictos','readwrite',s=>s.put({...rec,motivo,suc:SUC,fecha:new Date().toISOString()},clave)).catch(()=>{});
  descargar(rec.bytes,`pos-${SUC}-copia-aparte-${new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')}.db`);
}

// ── Utilidades ──
function aB64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function deB64(b){const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
async function comprimir(u8){
  if(typeof CompressionStream==='undefined')return 'r:'+aB64(u8);
  const r=new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip')));
  return 'g:'+aB64(new Uint8Array(await r.arrayBuffer()));
}
async function descomprimir(t){
  if(t.startsWith('r:'))return deB64(t.slice(2));
  const r=new Response(new Blob([deB64(t.slice(2))]).stream().pipeThrough(new DecompressionStream('gzip')));
  return new Uint8Array(await r.arrayBuffer());
}
function descargar(datos,nombre){
  const url=URL.createObjectURL(datos instanceof Blob?datos:new Blob([datos],{type:'application/octet-stream'}));
  const a=document.createElement('a');a.href=url;a.download=nombre;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function rpc(fn,args){
  if(!supa)throw Object.assign(new Error('sin internet'),{red:true});
  const {data,error}=await supa.rpc(fn,args);
  if(error){const e=new Error(error.message||String(error));e.codigo=error.code;e.red=/fetch|network|Failed|timeout|ERR_/i.test(error.message||'');throw e;}
  return data;
}
// ── Catálogo de ARAMO: el POS tiene los mismos productos que Surtido y La Feria, y publica sus precios ──
async function conectarCatalogo(){
  if(!window.PosCatalogo||!window.ARAMO_CAT||!POS)return;
  if(!dueno||soloLectura)return;
  try{await Promise.race([window.ARAMO_CAT.cargar(),new Promise(r=>setTimeout(r,5000))]);}catch(e){}
  const r=window.PosCatalogo.sincronizar(POS);
  if(r.agregados||r.unidos)marcarCambio();
  if(r.agregados)aviso('🧺 '+r.agregados+' productos de ARAMO quedaron en el POS (en Inventario). El precio se pone la primera vez que se venden.');
  publicarCatalogo();
  iniciarPrecios();
}
// El costo que se pone en el Cierre de compras actualiza solo los precios de este POS (pos-precios.js)
let _preciosIniciado=false;
function iniciarPrecios(){
  if(_preciosIniciado||!window.PosPrecios||!POS||!SUC)return;
  _preciosIniciado=true;
  try{
    window.PosPrecios.iniciar({
      url:SUPA_URL,key:SUPA_KEY,POS:()=>POS,suc:()=>SUC,
      puede:()=>!!(POS&&dueno&&!soloLectura&&!muerto&&!iniciando),
      recargar:()=>{try{if(window.posRecargarProductos)window.posRecargarProductos();}catch(e){}},
      marcar:()=>{try{marcarCambio();}catch(e){}},   // guardar y subir: así el catálogo nuevo llega a La Feria y a Inventario
      aviso,
    });
  }catch(e){console.warn('[pos] precios',e);}
}
// ── Resumen del día (pos-dia.js): lo que se cobró hoy, para que el Control llene solo los ingresos ──
function iniciarDia(){
  if(!window.PosDia||!POS||!SUC)return;
  try{window.PosDia.iniciar({url:SUPA_URL,key:SUPA_KEY,POS:()=>POS,suc:()=>SUC,
    puede:()=>!!(POS&&dueno&&!soloLectura&&!muerto&&!iniciando)});}   // solo la caja activa calcula y publica
  catch(e){console.warn('[pos] resumen del día',e);}
}
// ── Cobros del Mostrador → ventas del POS, y la lista de a quién se le hizo el SINPE (pos-mostrador.js) ──
function iniciarMostrador(){
  if(!window.PosMostrador||!POS||!SUC)return;
  try{window.PosMostrador.iniciar({url:SUPA_URL,key:SUPA_KEY,POS:()=>POS,suc:()=>SUC,
    puede:()=>!!(POS&&dueno&&!soloLectura&&!muerto&&!iniciando&&!reiniciando),   // solo la caja activa registra
    invoke:(c,...a)=>window.POSWEB.invoke(c,...a),lineas:feriaLineas,aviso});}
  catch(e){console.warn('[pos] cobros del Mostrador',e);}
}
// ── Reinicio a cero (2026-11-26) ──
// El dueño deja "todo en cero, como recién instalada" desde la nube: la tabla aramo_reinicio (id general, columna at) la cambia
// solo su SQL. Aquí solo se LEE. Si `at` es más nuevo que la marca de este aparato (aramo_reinicio_visto_pos_<tienda>):
//   · la caja activa: respaldo completo PRIMERO (sube lo que haya y pos_respaldar + una copia en este equipo), luego borra ventas,
//     items y cajas (y lo que cuelga de ellas), sube la base en cero, limpia lo local, guarda la marca y avisa;
//   · un aparato que no es la caja activa: solo limpia lo local y guarda la marca (la base en cero le llega al bajarla).
// Con la misma marca no se repite. Una tabla que no existe (404) o vacía no hace nada.
const MSG_REINICIO='La caja quedó en cero para empezar a probar. Se guardó una copia.';
function avisoReinicio(){try{if(LS.get('aramo_reinicio_aviso_pos_'+SUC,false)){LS.del('aramo_reinicio_aviso_pos_'+SUC);aviso(MSG_REINICIO);}}catch(e){}}
let reiniciando=false;
async function leerReinicio(espera){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),espera);
  try{
    const r=await fetch(SUPA_URL+'/rest/v1/aramo_reinicio?select=at,que&id=eq.general',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},signal:c.signal});
    if(!r.ok)return null;                       // 404: todavía no existe la tabla
    const a=await r.json();
    return Array.isArray(a)&&a[0]&&a[0].at?a[0]:null;
  }catch(e){return null;}
  finally{clearTimeout(t);}
}
async function revisarReinicio(enApertura){
  if(reiniciando||!SUC||!POS||muerto||!window.PosDia)return false;
  const fila=await leerReinicio(enApertura?3500:9000);
  if(!fila)return false;
  const at=Date.parse(fila.at);if(!(at>0))return false;
  const marca='aramo_reinicio_visto_pos_'+SUC;
  let visto='';try{visto=String(localStorage.getItem(marca)||'').replace(/^"|"$/g,'');}catch(e){}
  if(!(at>(Date.parse(visto)||0)))return false;      // ya se hizo con esta marca
  const guardarMarca=()=>{try{localStorage.setItem(marca,String(fila.at));}catch(e){}};
  const Dia=window.PosDia;
  if(!(dueno&&!soloLectura)){                         // no es la caja activa: solo lo suyo
    Dia.limpiarLocal(SUC);guardarMarca();return true;
  }
  reiniciando=true;
  try{
    if(enApertura)pintarCapa('cargando','Guardando una copia antes de dejar la caja en cero…');
    // 1) PRIMERO el respaldo completo con lo que ya existe
    if(sucio){const ok=await subir();if(!ok&&sucio)throw new Error('sin subir');}
    const rp=await rpc('pos_respaldar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP});
    if(rp&&rp.ok===false&&rp.motivo!=='vacio')throw new Error('respaldo '+(rp.motivo||''));
    if(rp&&rp.ok!==false)info=rp;
    try{await idbOp('conflictos','readwrite',s=>s.put({bytes:POS.exportar(),version,suc:SUC,motivo:'antes de dejar la caja en cero',fecha:new Date().toISOString()},SUC+':reinicio:'+new Date().toISOString()));}catch(e){}
    const fechas=Dia.fechasConDatos(POS,SUC);
    // 2) después se borra: ventas, items, cajas y lo que cuelga de ellas
    if(enApertura)pintarCapa('cargando','Dejando la caja en cero…');
    Dia.reiniciarDatos(POS);
    marcarCambio();await guardarLocal();
    // 3) se sube como siempre, para que otros aparatos bajen la base en cero
    await subir();
    // 4) lo local de este aparato y la marca
    Dia.limpiarLocal(SUC);guardarMarca();
    Dia.publicarFechas(fechas);                       // el resumen de esos días queda en cero (sin esperar la respuesta)
    reiniciando=false;
    LS.set('aramo_reinicio_aviso_pos_'+SUC,true);   // el aviso sale cuando termina de abrir (así no lo pisa otro aviso)
    if(!enApertura){aviso(MSG_REINICIO);setTimeout(()=>location.reload(),1800);}
    return true;
  }catch(e){
    console.warn('[pos] reinicio',e);
    aviso('La caja todavía no se pudo dejar en cero (primero se guarda una copia y hace falta internet). Se intenta de nuevo al volver la conexión.');
    return false;
  }finally{reiniciando=false;}
}
let _pubando=false;
async function publicarCatalogo(){
  if(_pubando||!supa||!CLAVE||!SUC||!POS||!dueno||!window.PosCatalogo)return;
  const lista=window.PosCatalogo.lista(POS),f=window.PosCatalogo.firma(lista);
  if(f===LS.get('pos_cat_pub_'+SUC,''))return;
  _pubando=true;
  try{const r=await rpc('pos_publicar_catalogo',{p_suc:SUC,p_clave:CLAVE,p_productos:lista});if(r&&r.ok)LS.set('pos_cat_pub_'+SUC,f);}
  catch(e){/* sin la tabla todavía o sin internet: se vuelve a intentar en la próxima subida */}
  finally{_pubando=false;}
}
// La primera vez que se vende un producto sin precio, el precio que se escribe queda guardado
window.posPrecioRapido=(id,precio)=>{
  if(!POS||soloLectura||!(+precio>0))return false;
  POS.prepare("UPDATE productos SET precio = ?, fecha_modificacion = datetime('now','localtime') WHERE id = ?").run([+precio,id]);
  marcarCambio();return true;
};
const faltaNube=e=>e&&(e.codigo==='PGRST202'||e.codigo==='42883'||/Could not find the function|does not exist/i.test(e.message||''));
const vencido=i=>!i?.dueno||!i.dueno_visto||(Date.parse(i.ahora||new Date().toISOString())-Date.parse(i.dueno_visto))>VENCE;

// ── Bajar y subir la base del local ──
async function bajar(v,partes,silencio){
  let t='';
  for(let n=0;n<partes;n++){
    if(!silencio)pintarCapa('cargando',`Bajando el POS de ${zona(SUC)}… ${Math.round(n/partes*100)}%`);
    const r=await rpc('pos_bajar',{p_suc:SUC,p_clave:CLAVE,p_version:v,p_n:n});
    if(!r?.ok)throw Object.assign(new Error('No se pudo bajar la copia ('+(r?.motivo||'?')+')'),{motivo:r?.motivo});
    t+=r.datos;
  }
  return descomprimir(t);
}
function marcarCambio(){
  cambios++;sucio=true;
  clearTimeout(tLocal);tLocal=setTimeout(guardarLocal,400);
  programarSubida();pintarEstado();
}
function posFechaISO(value){
  const d=value?new Date(value):new Date();
  const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function posResumenDia(fecha){
  if(!POS||!SUC)return null;
  let rows=[];
  try{
    rows=POS.prepare(`SELECT v.id,v.numero,v.fecha,v.total,v.metodo_pago,v.estado,v.anulado_por,v.anulado_fecha,v.anulado_motivo,c.usuario AS cajero,v.pago_efectivo,v.pago_tarjeta,v.pago_sinpe
      FROM ventas v LEFT JOIN cajas c ON c.id=v.caja_id WHERE DATE(v.fecha)=? ORDER BY v.fecha,v.id`).all([fecha]);
  }catch(e){return null;}
  const ventas=rows.map(v=>{
    const split=(Number(v.pago_efectivo)||0)+(Number(v.pago_tarjeta)||0)+(Number(v.pago_sinpe)||0)>0;
    return {id:+v.id||0,numero:String(v.numero||''),fecha:v.fecha,total:+v.total||0,estado:String(v.estado||''),metodo:String(v.metodo_pago||''),efectivo:split?(+v.pago_efectivo||0):v.metodo_pago==='efectivo'?(+v.total||0):0,tarjeta:split?(+v.pago_tarjeta||0):v.metodo_pago==='tarjeta'?(+v.total||0):0,sinpe:split?(+v.pago_sinpe||0):v.metodo_pago==='sinpe'?(+v.total||0):0,cajero:String(v.cajero||''),anuladoPor:String(v.anulado_por||''),anuladoFecha:String(v.anulado_fecha||''),anuladoMotivo:String(v.anulado_motivo||'')};
  });
  const completadas=ventas.filter(v=>v.estado==='completada');
  // Bodega se calcula desde los productos vendidos, no se vuelve a digitar
  // en Control. La categoría Bodega/Bebidas es la fuente principal y el
  // nombre del producto funciona como respaldo para jugos, agua, café, etc.
  let bodegaRows=[];
  try{
    bodegaRows=POS.prepare(`SELECT v.id AS venta_id,v.fecha,vi.nombre,vi.cantidad,vi.subtotal,
      COALESCE(c.nombre,'Sin categoría') AS categoria
      FROM venta_items vi JOIN ventas v ON v.id=vi.venta_id
      LEFT JOIN productos p ON p.id=vi.producto_id
      LEFT JOIN categorias c ON c.id=p.categoria_id
      WHERE DATE(v.fecha)=? AND v.estado='completada' ORDER BY v.fecha,vi.id`).all([fecha]);
  }catch(e){bodegaRows=[];}
  const bodegagg=(name,category)=>{
    const s=String((category||'')+' '+(name||'')).toLocaleLowerCase('es-CR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return /\bbodega\b|bebida|jugo|agua|refresco|cafe|te\b|powerade|gatorade|kombucha|horchata|gaseosa|chubby|kern/.test(s);
  };
  const bodegaMap=new Map(),departamentoMap=new Map();
  bodegaRows.forEach(r=>{
    const amount=Number(r.subtotal)||0, category=String(r.categoria||'Sin categoría'), name=String(r.nombre||'Producto');
    if(!bodegagg(name,category))return;
    departamentoMap.set(category,(departamentoMap.get(category)||0)+amount);
    const key=category+' · '+name;
    const current=bodegaMap.get(key)||{categoria:category,nombre:name,cantidad:0,total:0};
    current.cantidad+=(Number(r.cantidad)||0);current.total+=amount;bodegaMap.set(key,current);
  });
  const bodegaDetalle=[...bodegaMap.values()].sort((a,b)=>b.total-a.total).slice(0,100);
  const resumen={v:1,sucursal:SUC,fecha,efectivo:completadas.reduce((t,v)=>t+v.efectivo,0),tarjeta:completadas.reduce((t,v)=>t+v.tarjeta,0),sinpe:completadas.reduce((t,v)=>t+v.sinpe,0),total:completadas.reduce((t,v)=>t+(+v.total||0),0),n:completadas.length,ventas,bodega:bodegaDetalle.reduce((t,v)=>t+v.total,0),bodegaDetalle,departamentos:[...departamentoMap.entries()].map(([nombre,total])=>({nombre,total})),generadoEn:new Date().toISOString()};
  try{const fi=HANDLERS['fiados:del_dia']&&HANDLERS['fiados:del_dia']({sender:null},fecha);if(fi){resumen.fiado=fi.fiado;resumen.fiados=fi.ventas;resumen.fiadoCobrado=fi.cobrado;resumen.fiadoPagos=fi.pagos;}}catch(e){}
  resumen.huella=sha256hex(JSON.stringify({fecha,ventas,bodegaDetalle,departamentos:resumen.departamentos}));
  return resumen;
}
async function posPublicarResumen(fecha){
  if(SUC!=='angeles')return null;   // el Control es solo de Los Ángeles (LASR): Moravia no le manda nada
  const resumen=posResumenDia(fecha);if(!resumen)return null;
  try{localStorage.setItem(POS_CIERRE_KEY+SUC,JSON.stringify(resumen));}catch(e){}
  if(!supa||!CLAVE)return resumen;
  try{await rpc('pos_publicar_cierre',{p_suc:SUC,p_clave:CLAVE,p_fecha:fecha,p_resumen:resumen});}
  catch(e){if(!faltaNube(e))console.warn('[pos] no se publicó el resumen diario',e);}
  return resumen;
}
async function guardarLocal(){
  clearTimeout(tLocal);
  if(!POS||!SUC)return;
  try{await idbPut(SUC,{bytes:POS.exportar(),version,sucio,guardado:Date.now()});}catch(e){console.warn('[pos]',e);}
}
function programarSubida(){
  clearTimeout(tSubir);tSubir=setTimeout(subir,COLA.lista?400:5000);
  if(!tMax)tMax=setTimeout(()=>{tMax=0;subir();},COLA.lista?4000:20000);
}
async function subir(){
  clearTimeout(tSubir);clearTimeout(tMax);tMax=0;
  if(!sucio||!dueno||subiendo||muerto||!POS)return false;
  if(!supa){offline=true;pintarEstado();return false;}
  subiendo=true;pintarEstado();
  const marca=cambios;
  try{
    const bytes=POS.exportar(),t=await comprimir(bytes),partes=[];
    for(let i=0;i<t.length;i+=TROZO)partes.push(t.slice(i,i+TROZO));
    for(let n=0;n<partes.length;n++){
      const r=await rpc('pos_subir',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_version:version+1,p_n:n,p_datos:partes[n]});
      if(!r?.ok)throw Object.assign(new Error(r?.motivo||'subir'),{motivo:r?.motivo});
    }
    const c=await rpc('pos_confirmar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_base:version,p_partes:partes.length,p_tamano:bytes.length});
    if(!c?.ok)throw Object.assign(new Error(c?.motivo||'confirmar'),{motivo:c?.motivo,estado:c?.estado});
    version=c.version;if(cambios===marca)sucio=false;
    offline=false;falloRed=0;publicarCatalogo();
    await guardarLocal();
    return true;
  }catch(e){
    if(e.motivo==='otro_dueno'||e.motivo==='version')await perderCaja(e.motivo);
    else if(e.motivo==='clave'){LS.del('pos_clave_'+SUC);aviso('La contraseña del POS cambió: volvé a entrar.');}
    else{offline=!!e.red||offline;falloRed++;clearTimeout(tSubir);tSubir=setTimeout(subir,Math.min(60000,5000*falloRed));}
    return false;
  }finally{
    subiendo=false;pintarEstado();
    if(sucio&&dueno&&!tSubir&&!muerto)programarSubida();
  }
}
// Otro dispositivo tomó la caja: lo que no se alcanzó a subir queda aparte (y se descarga)
async function perderCaja(motivo){
  const tenia=sucio;
  dueno=false;soloLectura=true;LS.set('pos_dueno_'+SUC,false);
  if(tenia){
    await guardarConflicto({bytes:POS.exportar(),version},motivo);
    sucio=false;
    alerta('⚠️ Otro dispositivo tomó la caja de '+zona(SUC)+'.','Los últimos cambios de este equipo no alcanzaron a subir: quedaron guardados aparte y se descargó una copia (.db). Esta pantalla pasa a solo lectura.');
  }else if(COLA.lista)aviso('🔗 La caja de '+zona(SUC)+' ahora la lleva '+(info?.dueno_nombre||'otro aparato')+'. Aquí se sigue cobrando igual.');
  else aviso('👀 La caja de '+zona(SUC)+' ahora está en '+(info?.dueno_nombre||'otro dispositivo')+'. Este queda en solo lectura.');
  emitir();
  await idbPut(SUC,{bytes:POS.exportar(),version,sucio:false,guardado:Date.now()});
  pintarEstado();
}
async function latido(){
  if(!SUC||!CLAVE||muerto)return;
  let r=null;
  try{r=await rpc('pos_latido',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP});}
  catch(e){offline=!!e.red||!supa;pintarEstado();return;}
  if(r?.ok===false){if(r.motivo==='clave'){LS.del('pos_clave_'+SUC);aviso('La contraseña del POS cambió.');}return;}
  offline=false;info=r;
  if(dueno&&r.dueno!==DISP)await perderCaja('otro_dueno');
  else if(dueno&&sucio)subir();
  nuevos=!dueno&&r.version>version;
  if(nuevos)refrescarBase(r);
  pintarEstado();
}

// ══════════════ Caja compartida: la compu y el celular cobran al mismo tiempo (2026-11-27) ══════════════
// La copia del POS sigue teniendo UN aparato que la guarda en la nube ("el que tiene la caja"). Los demás ya
// no quedan solo mirando: lo que escriben (una venta, un pago de fiado, anular…) va a una fila en la nube
// (pos_cola, supabase-pos-cola.sql); el que tiene la caja lo hace en su copia, la sube y devuelve el
// resultado. Cada cosa se hace UNA vez: lo hecho queda anotado en la misma copia (pos_cola_hecho).
// Si el que tiene la caja no da señales en 12 s, el aparato que espera la toma solo y lo hace él.
// Sin la fila en la nube todo sigue como antes (un aparato cobra y los demás miran).
const NO_COLA=new Set(['backup:restaurar','backup:ejecutar','inventario:ajustar','cajeros:crear','cajeros:actualizar','cajeros:eliminar','cajeros:guardarPermisos']);
const COLA={lista:false,probada:false,procesando:false,refrescando:false,ultimoLatido:0};
const QUIETO=12000;
const dormir=ms=>new Promise(r=>setTimeout(r,ms));
const sinDueno=i=>!i||!i.dueno||!i.dueno_visto||(Date.parse(i.ahora||new Date().toISOString())-Date.parse(i.dueno_visto))>QUIETO;
function emitir(){try{window.dispatchEvent(new CustomEvent('pos-estado'));}catch{}}
function emitirCambio(origen){try{window.dispatchEvent(new CustomEvent('pos-base-nueva',{detail:{origen:origen||''}}));}catch{}}
async function colaProbar(){
  COLA.lista=false;
  if(supa&&CLAVE){try{const r=await rpc('pos_cola_ver',{p_suc:SUC,p_clave:CLAVE,p_ids:[]});COLA.lista=!!(r&&r.ok===true&&Array.isArray(r.filas));}catch(e){COLA.lista=false;}}
  COLA.probada=true;pintarEstado();emitir();
  return COLA.lista;
}
// Este aparato no tiene la caja: lo manda y espera el resultado
async function colaEncargar(c,args){
  const id='q'+nuevoId().slice(1)+Date.now().toString(36);
  let r;
  try{r=await rpc('pos_cola_poner',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_nombre:NOMBRE,p_id:id,p_c:c,p_args:JSON.parse(JSON.stringify(args||[]))});}
  catch(e){throw new Error(e.red?'Sin internet: solo el aparato que tiene la caja puede cobrar sin conexión.':'No se pudo mandar a la caja: '+(e.message||e));}
  if(!r||r.ok===false)throw new Error(r?.motivo==='clave'?'La contraseña del POS cambió.':'No se pudo mandar a la caja.');
  if(r.estado)info={...(info||{}),...r.estado};
  const t0=Date.now();
  for(;;){
    let v=null;try{v=await rpc('pos_cola_ver',{p_suc:SUC,p_clave:CLAVE,p_ids:[id]});}catch{}
    if(v?.estado)info={...(info||{}),...v.estado};
    const fila=Array.isArray(v?.filas)?v.filas[0]:null;
    if(fila&&fila.estado==='hecho'){latidoPronto();return fila.res;}
    if(fila&&fila.estado==='error')throw new Error(fila.res?.error||'La caja no pudo hacerlo.');
    if(dueno){await colaProcesar();await dormir(150);continue;}       // la caja pasó a este aparato: lo hace él
    if(sinDueno(info)&&Date.now()-t0>1200){await tomarSolo();continue;}
    if(Date.now()-t0>45000){latidoPronto();return {pendiente:true,id};} // queda en la fila: se anota apenas haya caja
    await dormir(800);
  }
}
// Este aparato tiene la caja: hace lo que está en la fila
async function colaProcesar(){
  if(!dueno||!COLA.lista||COLA.procesando||muerto||!POS)return;
  COLA.procesando=true;
  try{
    let r;try{r=await rpc('pos_cola_pendientes',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP});}catch(e){offline=!!e.red||offline;return;}
    if(r?.ok===false){if(r.motivo==='otro_dueno'){info=r.estado||info;await perderCaja('otro_dueno');}return;}
    if(r?.estado)info={...(info||{}),...r.estado};
    const filas=Array.isArray(r?.filas)?r.filas:[];
    if(!filas.length)return;
    const hechos=[];let fechas=new Set();
    for(const fl of filas){
      const ya=POS.prepare('SELECT estado,res FROM pos_cola_hecho WHERE id=?').get([fl.id]);
      if(ya){let res=null;try{res=JSON.parse(ya.res||'null');}catch{}hechos.push({id:fl.id,estado:ya.estado,res});continue;}
      let estado='hecho',res=null;
      try{
        if(NO_COLA.has(fl.c)||!ESCRIBE.has(fl.c)||!HANDLERS[fl.c])throw new Error('Eso solo se hace en el aparato que tiene la caja.');
        res=await HANDLERS[fl.c]({sender:null},...(Array.isArray(fl.args)?fl.args:[]));
        if(/^ventas:|^fiados:/.test(fl.c))fechas.add(res?.fecha?String(res.fecha).slice(0,10):posFechaISO());
        if(window.PosDia){try{window.PosDia.cambio(fl.c,Array.isArray(fl.args)?fl.args:[],res);}catch(e){}}
      }catch(e){estado='error';res={error:String(e?.message||e)};}
      POS.prepare('INSERT OR REPLACE INTO pos_cola_hecho (id,c,estado,res,disp) VALUES (?,?,?,?,?)').run([fl.id,fl.c,estado,JSON.stringify(res??null),fl.disp||'']);
      hechos.push({id:fl.id,estado,res});
    }
    const ok=await asegurarSubida(15000);
    if(!ok)return; // se intenta otra vez en la próxima vuelta (no se repite: quedó en pos_cola_hecho)
    for(const h of hechos){try{await rpc('pos_cola_listo',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_id:h.id,p_estado:h.estado,p_res:h.res??null});}catch{}}
    fechas.forEach(fe=>posPublicarResumen(fe));
    emitirCambio('cola');
  }catch(e){console.warn('[pos] fila de la caja',e);}
  finally{COLA.procesando=false;}
}
// Sube ya lo que falta (espera si ya se está subiendo)
async function asegurarSubida(ms){
  const fin=Date.now()+(ms||8000);
  while(Date.now()<fin){
    if(!sucio)return true;
    if(!dueno||muerto)return false;
    if(subiendo){await dormir(120);continue;}
    const ok=await subir();
    if(ok&&!sucio)return true;
    if(!dueno)return false;
    await dormir(400);
  }
  return !sucio;
}
// Nadie tiene la caja (o el que la tenía no responde): este aparato la toma solo
async function tomarSolo(){
  if(dueno||!supa||muerto)return dueno;
  let t;try{t=await rpc('pos_tomar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_nombre:NOMBRE});}catch{return false;}
  if(!t||t.ok===false||t.dueno!==DISP)return false;
  info=t;
  if(+t.version>version&&!(await refrescarBase(t,true)))return false;
  dueno=true;soloLectura=false;nuevos=false;LS.set('pos_dueno_'+SUC,true);
  aviso('💳 La caja de '+zona(SUC)+' pasó a este aparato (el otro no respondía).');
  try{window.PosDia&&window.PosDia.alIniciar();}catch(e){}
  pintarEstado();emitir();
  return true;
}
// Trae la copia nueva de la nube sin recargar la página (para el que no tiene la caja)
async function refrescarBase(r,forzar){
  if(COLA.refrescando||!POS||!r||!(+r.version>version))return false;
  if(dueno&&!forzar)return false;
  if(sucio){if(!forzar)return false;await guardarConflicto({bytes:POS.exportar(),version},'antes de traer la copia nueva');}
  COLA.refrescando=true;
  try{
    const bytes=await bajar(+r.version,+r.partes||+(info&&info.version===r.version&&info.partes)||1,true);
    BYTES=bytes;iniciando=true;await POS.initDB();iniciando=false;
    version=+r.version;sucio=false;nuevos=false;
    await guardarLocal();
    pintarEstado();emitirCambio('nube');
    return true;
  }catch(e){iniciando=false;console.warn('[pos] no se pudo traer la copia nueva',e);return false;}
  finally{COLA.refrescando=false;}
}
let tPronto=0;
function latidoPronto(){clearTimeout(tPronto);tPronto=setTimeout(latido,250);}
// Cada 2 s: el que tiene la caja atiende la fila; el que no, se fija si hay algo nuevo (cada 4 s)
function colaVuelta(){
  if(muerto||!POS||!SUC)return;
  if(dueno){colaProcesar();return;}
  if(document.visibilityState!=='visible')return;
  if(Date.now()-COLA.ultimoLatido<4000)return;
  COLA.ultimoLatido=Date.now();latido();
}
window.POSWEB.colaProcesar=()=>colaProcesar();

// ── Lo que en Windows usaba disco, impresora y ventanas ──
function fechaNombre(iso){const d=new Date(iso||Date.now()),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;}
function sobreescribir(){
  HANDLERS['app:abrir_datos']=()=>{aviso('En la web, los datos de este POS están en la nube de ARAMO (local '+zona(SUC)+').');return true;};
  HANDLERS['backup:seleccionar_carpeta']=async()=>{aviso('En la web los respaldos ya se guardan solos en la nube.');return null;};
  HANDLERS['backup:listar']=async()=>{
    try{const r=await rpc('pos_latido',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP});if(r?.ok!==false)info=r;}catch{}
    return (info?.respaldos||[]).map(x=>({nombre:`nube_${fechaNombre(x.creado)}_v${x.version}`,tamano:+x.tamano||0}));
  };
  HANDLERS['backup:ejecutar']=async()=>{
    await subir();
    const nombre=`pos_${SUC}_${fechaNombre()}.db`;
    descargar(POS.exportar(),nombre);
    if(sucio||!supa)return{ok:true,nombre:nombre+' (en este equipo; sube a la nube cuando vuelva el internet)'};
    try{const r=await rpc('pos_respaldar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP});if(r?.ok!==false)info=r;}catch(e){}
    return{ok:true,nombre:nombre+' · también en la nube'};
  };
  HANDLERS['backup:restaurar']=async(_,nombre,pin)=>{
    if(!pinAdmin(pin))return{ok:false,error:'PIN de administrador incorrecto.'};
    const m=String(nombre).match(/_v(\d+)$/);if(!m)return{ok:false,error:'Respaldo no encontrado.'};
    const v=+m[1],r=(info?.respaldos||[]).find(x=>+x.version===v);
    if(!r)return{ok:false,error:'Ese respaldo ya no está en la nube.'};
    try{
      const tam=Math.ceil(r.tamano||0);// solo informativo
      const bytes=await bajarRespaldo(v);
      await reemplazarBase(bytes,'Restaurado el respaldo del '+String(r.fecha));
      return{ok:true,tamano:tam};
    }catch(e){return{ok:false,error:'No se pudo restaurar: '+(e.message||e)};}
  };
  HANDLERS['cabys:buscar']=async(_,termino)=>{
    if(!termino||String(termino).trim().length<2)return[];
    const res=await fetch(`https://api.hacienda.go.cr/fe/cabys?q=${encodeURIComponent(String(termino).trim())}&top=10`);
    if(!res.ok)throw new Error('La búsqueda CABYS de Hacienda no respondió');
    const data=await res.json(),items=Array.isArray(data)?data:(data.cabys||data.data||[]);
    return items.map(it=>({codigo:it.codigo||'',descripcion:it.descripcion||'',impuesto:typeof it.impuesto==='object'&&it.impuesto!==null?(it.impuesto.tarifa??it.impuesto.tasa??0):(it.impuesto??0)}));
  };
  HANDLERS['tiquete:imprimir']=(_,html)=>new Promise(ok=>{
    const f=document.createElement('iframe');
    f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    f.setAttribute('sandbox','allow-same-origin allow-modals'); // el tiquete se imprime, pero sin correr scripts
    f.srcdoc=html;
    f.onload=()=>{setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print();ok({ok:true,reason:''});}catch(e){ok({ok:false,reason:String(e.message||e)});}setTimeout(()=>f.remove(),60000);},150);};
    document.body.appendChild(f);
  });
  HANDLERS['tiquete:guardar']=(_,texto,numero)=>{
    const nombre=String(numero||'tiquete').replace(/[:/\\?*|"<>]/g,'-')+'.txt';
    descargar(new Blob([texto],{type:'text/plain;charset=utf-8'}),nombre);
    return{ok:true,archivo:nombre};
  };
}
function pinAdmin(pin){
  const admins=POS.prepare(`SELECT pin_hash, pin_salt FROM cajeros WHERE rol = 'administrador' AND estado = 'activo'`).all();
  return admins.some(a=>POS.pinHash(pin,a.pin_salt)===a.pin_hash);
}
async function bajarRespaldo(v){
  // los trozos del respaldo siguen en la nube con su número de versión
  let t='';
  for(let n=0;;n++){
    const r=await rpc('pos_bajar',{p_suc:SUC,p_clave:CLAVE,p_version:v,p_n:n});
    if(!r?.ok){if(n>0&&r?.motivo==='falta')break;throw new Error(r?.motivo||'respaldo');}
    t+=r.datos;
  }
  return descomprimir(t);
}
// Reemplaza la base del local (respaldo o POS de Windows) y la sube como versión nueva
async function reemplazarBase(bytes,motivo){
  if(!dueno)throw new Error('Solo la caja activa puede reemplazar la base. Tomá la caja primero.');
  const prueba=new (await SQLp).Database(bytes);
  try{prueba.exec('SELECT COUNT(*) FROM ventas');prueba.exec('SELECT COUNT(*) FROM productos');}
  catch(e){prueba.close();throw new Error('Ese archivo no es una base del ARAMO POS.');}
  prueba.close();
  BYTES=bytes;iniciando=true;await POS.initDB();iniciando=false;
  sucio=true;cambios++;
  await guardarLocal();
  pintarCapa('cargando','Subiendo a la nube…');
  const ok=await subir();
  aviso((ok?'✅ ':'💾 ')+motivo+(ok?' y subido a la nube.':' · se sube cuando vuelva el internet.'));
  setTimeout(()=>location.reload(),1200);
}

// ── Entrar ──
function elegirSucursal(){
  const q=new URLSearchParams(location.search).get('suc');
  if(q&&SUCS[q]){try{sessionStorage.setItem('pos_suc',q);}catch{}return q;}
  try{const s=sessionStorage.getItem('pos_suc');if(s&&SUCS[s])return s;}catch{}
  const l=LS.get('aramo_local',null);if(l&&SUCS[l])return l;
  return null;
}
function crearSupa(){
  try{return window.supabase?.createClient?window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'aramo-pos-auth'}}):null;}catch{return null;}
}
async function arrancar(){
  montarUI();
  SUC=elegirSucursal();
  if(!SUC)return pintarCapa('elegir');
  document.title='ARAMO POS · '+zona(SUC);
  if(!(await unaPestana()))return;
  pintarCapa('cargando','Abriendo el POS de '+zona(SUC)+'…');
  supa=crearSupa();
  SQLp=window.initSqlJs({locateFile:f=>'./sql/'+f});
  CLAVE=LS.get('pos_clave_'+SUC,null);
  const local=await idbGet(SUC);
  let r=null;
  if(CLAVE&&supa){
    try{r=await rpc('pos_entrar',{p_suc:SUC,p_clave:CLAVE});}
    catch(e){if(faltaNube(e))return pintarCapa('falta-nube');r=null;}
    if(r&&r.ok===false){
      if(r.motivo==='sin_local')return pintarCapa('falta-nube');
      const bloq=r.motivo==='bloqueado';
      LS.del('pos_clave_'+SUC);CLAVE=null;
      return pedirClave(bloq?'Demasiados intentos: esperá 15 minutos.':'La contraseña cambió: escribila de nuevo.');
    }
  }else if(!CLAVE){
    if(!supa)return pintarCapa('sin-internet');
    try{await rpc('pos_entrar',{p_suc:SUC,p_clave:''});}catch(e){if(faltaNube(e))return pintarCapa('falta-nube');}
    return pedirClave();
  }
  try{await abrir(r,local);}
  catch(e){console.error(e);pintarCapa('error',e.message||String(e));}
}
async function abrir(r,local){
  let bytes=null;
  if(r){
    info=r;offline=false;
    const V=+r.version||0;
    if(local&&local.sucio){
      if(+local.version===V&&(r.dueno===DISP||vencido(r))){bytes=local.bytes;version=V;sucio=true;}
      else{
        await guardarConflicto(local,'al abrir');
        alerta('⚠️ Había cambios sin subir en este equipo','Mientras tanto otro dispositivo usó la caja. Esos cambios quedaron aparte y se descargó una copia (.db). Se abre lo último de la nube.');
        bytes=V?await bajar(V,r.partes):null;version=V;sucio=false;
      }
    }else if(local&&+local.version===V&&V>0){bytes=local.bytes;version=V;}
    else if(V>0){bytes=await bajar(V,r.partes);version=V;}
    else{bytes=local?.bytes||null;version=0;sucio=true;}
    if(r.dueno===DISP||vencido(r)){
      try{const t=await rpc('pos_tomar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_nombre:NOMBRE});if(t?.ok!==false){info=t;dueno=t.dueno===DISP;}}catch{dueno=false;}
    }else dueno=false;
  }else{
    if(!local)return pintarCapa('sin-internet');
    bytes=local.bytes;version=+local.version||0;sucio=!!local.sucio;offline=true;
    dueno=!!LS.get('pos_dueno_'+SUC,false);
  }
  soloLectura=!dueno;LS.set('pos_dueno_'+SUC,dueno);
  BYTES=bytes;
  iniciando=true;
  POS=window.POS_MAIN(H);sobreescribir();
  await POS.initDB();
  iniciando=false;
  if(!bytes){sucio=true;cambios++;}
  await guardarLocal();
  iniciarDia();
  iniciarMostrador();
  try{await revisarReinicio(true);}catch(e){console.warn('[pos] reinicio',e);}
  pintarCapa(null);
  listoRes();
  try{if(window.PosDia)window.PosDia.alIniciar();}catch(e){}
  posPublicarResumen(posFechaISO());
  montarPedidoWeb();
  conectarCatalogo().catch(e=>console.warn('[pos] catálogo',e)).finally(avisoReinicio);
  pintarEstado();
  if(sucio&&dueno)programarSubida();
  colaProbar().then(si=>{if(!si&&!dueno&&info?.dueno)aviso('👀 La caja de '+zona(SUC)+' está abierta en '+(info.dueno_nombre||'otro dispositivo')+'. Aquí podés mirar; para cobrar, tocá el estado y «Usar la caja aquí».');});
  setInterval(latido,LATIDO);
  setInterval(colaVuelta,2000);
  window.addEventListener('online',()=>{if(!supa)supa=crearSupa();latido();setTimeout(()=>revisarReinicio(false).catch(()=>{}),1500);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){guardarLocal();subir();if(window.PosDia)window.PosDia.vaciar();}else latido();});
  window.addEventListener('pagehide',()=>{guardarLocal();subir();if(window.PosDia)window.PosDia.vaciar();});
}
async function pedirClave(msg){
  pintarCapa('clave',msg||'');
  const f=document.getElementById('pwClaveF'),inp=document.getElementById('pwClave');
  setTimeout(()=>inp?.focus(),60);
  f.onsubmit=async e=>{
    e.preventDefault();
    const c=inp.value;if(!c)return;
    const b=f.querySelector('button');b.disabled=true;b.textContent='Revisando…';
    let r=null;
    try{r=await rpc('pos_entrar',{p_suc:SUC,p_clave:c});}
    catch(err){b.disabled=false;b.textContent='Entrar';
      if(faltaNube(err))return pintarCapa('falta-nube');
      document.getElementById('pwClaveMsg').textContent=err.red?'Sin internet: la primera vez necesitás conexión.':'No se pudo entrar: '+err.message;return;}
    if(r?.ok===false){
      b.disabled=false;b.textContent='Entrar';
      if(r.motivo==='sin_local')return pintarCapa('falta-nube');
      document.getElementById('pwClaveMsg').textContent=r.motivo==='bloqueado'?'Demasiados intentos: esperá 15 minutos.':'Contraseña incorrecta.';
      inp.select();return;
    }
    CLAVE=c;LS.set('pos_clave_'+SUC,c);
    pintarCapa('cargando','Abriendo el POS de '+zona(SUC)+'…');
    try{await abrir(r,await idbGet(SUC));}catch(err){console.error(err);pintarCapa('error',err.message||String(err));}
  };
}
// Una sola pestaña del POS por local en este dispositivo
let canal=null;
function unaPestana(){
  return new Promise(ok=>{
    if(!('BroadcastChannel' in window))return ok(true);
    canal=new BroadcastChannel('aramo-pos-'+SUC);
    let otra=false;
    canal.onmessage=e=>{
      if(e.data==='hola'&&!muerto)canal.postMessage('aqui');
      if(e.data==='aqui')otra=true;
      if(e.data==='cedeme'&&!muerto){
        muerto=true;
        Promise.resolve(subir()).then(guardarLocal).finally(()=>{canal.postMessage('cedido');pintarCapa('otra-pestana-cerrada');});
      }
    };
    canal.postMessage('hola');
    setTimeout(()=>{
      if(!otra)return ok(true);
      pintarCapa('otra-pestana');
      document.getElementById('pwAquiIgual').onclick=()=>{
        pintarCapa('cargando','Pasando el POS a esta pestaña…');
        const fin=()=>{canal.removeEventListener('message',esp);ok(true);};
        const esp=e=>{if(e.data==='cedido')fin();};
        canal.addEventListener('message',esp);canal.postMessage('cedeme');setTimeout(fin,15000);
      };
    },350);
  });
}

// ── Salir al menú de ARAMO ──
// Volver al menú no cierra el turno (es como cambiar de app): guarda, sube, suelta la caja y va a ARAMO.
// El turno se cierra cuando quieran desde 💰 Caja del POS.
function salir(){salirYa();}
async function salirYa(){
  pintarCapa('cargando','Guardando el POS de '+(SUC?zona(SUC):'ARAMO')+'…');
  try{
    if(POS)await guardarLocal();
    if(sucio&&dueno)await Promise.race([subir(),new Promise(r=>setTimeout(r,15000))]);
    if(dueno&&!sucio&&supa)await Promise.race([rpc('pos_soltar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP}),new Promise(r=>setTimeout(r,4000))]).catch(()=>{});
  }catch{}
  // si el POS se abrió desde el menú en otra pestaña, se cierra y vuelve a esa
  try{if(window.opener&&!window.opener.closed&&window.opener.location.origin===location.origin){window.opener.focus();window.close();}}catch{}
  setTimeout(()=>{location.href='../APP.html';},250);
}
async function usarAqui(){
  pintarCapa('cargando','Tomando la caja de '+zona(SUC)+'…');
  try{
    const r=await rpc('pos_tomar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_nombre:NOMBRE});
    if(r?.ok===false)throw new Error(r.motivo);
    LS.set('pos_dueno_'+SUC,true);
    location.reload();
  }catch(e){pintarCapa(null);aviso('No se pudo tomar la caja: '+(e.red?'sin internet':e.message));}
}
function importarWindows(){
  if(!dueno){aviso('Primero tomá la caja en este dispositivo.');return;}
  const inp=document.createElement('input');inp.type='file';inp.accept='.db,.sqlite,application/octet-stream';
  inp.onchange=async()=>{
    const f=inp.files?.[0];if(!f)return;
    const ok=confirm(`¿Reemplazar el POS de ${nomSuc(SUC)} en la nube por «${f.name}»?\n\nTodo lo de este POS web se cambia por lo que tiene ese archivo (productos, ventas, cajas, cajeros…). Lo de ahora queda en el respaldo del día.`);
    if(!ok)return;
    try{pintarCapa('cargando','Leyendo '+f.name+'…');await reemplazarBase(new Uint8Array(await f.arrayBuffer()),'Importado «'+f.name+'»');}
    catch(e){pintarCapa(null);alerta('No se pudo importar',e.message||String(e));}
  };
  inp.click();
}

// ══════════════ Pantallas propias (entrar, estado y menú) ══════════════
function montarUI(){
  if(document.getElementById('pwCapa'))return;
  const capa=document.createElement('div');capa.id='pwCapa';capa.className='pw-capa';document.body.appendChild(capa);
  const pill=document.createElement('button');pill.type='button';pill.id='pwPill';pill.className='pw-pill';pill.hidden=true;document.body.appendChild(pill);
  const menu=document.createElement('div');menu.id='pwMenu';menu.className='pw-menu';menu.hidden=true;document.body.appendChild(menu);
  const t=document.createElement('div');t.id='pwToast';t.className='pw-toast';t.setAttribute('role','status');document.body.appendChild(t);
  pill.addEventListener('click',e=>{e.stopPropagation();pintarMenu();menu.hidden=!menu.hidden;});
  document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target))menu.hidden=true;});
  menu.addEventListener('click',e=>{
    const b=e.target.closest('[data-pw]');if(!b)return;menu.hidden=true;
    const a=b.dataset.pw;
    if(a==='salir')salir();
    if(a==='usar')usarAqui();
    if(a==='actualizar')location.reload();
    if(a==='subir'){subir().then(ok=>aviso(ok?'☁️ Todo subido a la nube':'Sin conexión: se sube apenas vuelva el internet'));}
    if(a==='importar')importarWindows();
    if(a==='copia'&&POS)descargar(POS.exportar(),`pos_${SUC}_${fechaNombre()}.db`);
    if(a==='nombre'){const n=prompt('Nombre de este dispositivo (así lo ven los demás):',NOMBRE);if(n&&n.trim()){NOMBRE=n.trim().slice(0,40);LS.set('pos_disp_nombre',NOMBRE);if(dueno)rpc('pos_tomar',{p_suc:SUC,p_clave:CLAVE,p_disp:DISP,p_nombre:NOMBRE}).then(r=>{if(r?.ok!==false)info=r;pintarEstado();}).catch(()=>{});aviso('Listo: «'+NOMBRE+'»');}}
    if(a==='olvidar'){if(confirm('¿Cerrar la sesión del POS de '+zona(SUC)+' en este dispositivo? Te va a pedir la contraseña otra vez.')){LS.del('pos_clave_'+SUC);salirYa();}}
  });
}
function pintarCapa(tipo,msg){
  const c=document.getElementById('pwCapa');if(!c)return;
  if(!tipo){c.hidden=true;c.innerHTML='';return;}
  c.hidden=false;
  const cab=`<div class="pw-logo">🧾</div><h1>ARAMO POS${SUC?` <span>${esc(zona(SUC))}</span>`:''}</h1>`;
  const volver='<a class="pw-link" href="../APP.html">‹ Volver al menú de ARAMO</a>';
  const html={
    cargando:`${cab}<div class="pw-spin"></div><p>${esc(msg||'Cargando…')}</p>`,
    elegir:`${cab}<p>¿De cuál local es este POS?</p><div class="pw-sucs">${Object.entries(SUCS).map(([k,s])=>`<a class="pw-btn" href="?suc=${k}">📍 ${esc(s.zona)}<small>Tienda ${esc(s.n)}</small></a>`).join('')}</div>${volver}`,
    clave:`${cab}<form id="pwClaveF" class="pw-form" autocomplete="off"><label>Contraseña del POS de ${esc(nomSuc(SUC))}<input id="pwClave" type="password" autocomplete="current-password" enterkeyhint="go"></label><button class="pw-btn" type="submit">Entrar</button><p id="pwClaveMsg" class="pw-err">${esc(msg||'')}</p></form><p class="pw-nota">Se pide una sola vez en cada dispositivo. Después entrás con tu PIN de cajero, como siempre.</p>${volver}`,
    'falta-nube':`${cab}<p><b>Falta preparar la nube del POS.</b></p><p class="pw-nota">En Supabase → SQL Editor, pegá el archivo <b>supabase-pos.sql</b> (con tus contraseñas) y dale Run. Después recargá esta página.</p><button class="pw-btn" onclick="location.reload()">Ya lo hice · Recargar</button>${/Windows/.test(navigator.userAgent)?'<a class="pw-link" href="aramo-pos://abrir">🖥️ Mientras tanto: abrir el POS de Windows</a><br>':''}${volver}`,
    'sin-internet':`${cab}<p><b>Sin internet.</b></p><p class="pw-nota">La primera vez que abrís el POS de un local en este dispositivo necesitás conexión. Después funciona aunque se caiga el internet.</p><button class="pw-btn" onclick="location.reload()">Reintentar</button>${volver}`,
    'otra-pestana':`${cab}<p><b>El POS ya está abierto en otra pestaña de este equipo.</b></p><p class="pw-nota">Para no cobrar dos veces, solo una pestaña puede tener la caja.</p><button class="pw-btn" id="pwAquiIgual">Usar esta pestaña</button>${volver}`,
    'otra-pestana-cerrada':`${cab}<p><b>El POS se pasó a otra pestaña.</b></p><p class="pw-nota">Todo quedó guardado. Podés cerrar esta.</p>${volver}`,
    error:`${cab}<p><b>No se pudo abrir el POS.</b></p><p class="pw-nota">${esc(msg||'')}</p><button class="pw-btn" onclick="location.reload()">Reintentar</button>${volver}`,
  }[tipo]||'';
  c.innerHTML=`<div class="pw-caja">${html}</div>`;
}
function pintarEstado(){
  const p=document.getElementById('pwPill');if(!p||!SUC||!POS)return;
  p.hidden=false;
  const [cls,ico,txt]=muerto?['mal','✖️','Cerrado']:soloLectura&&COLA.lista?['ok','🔗','Cobrando junto con '+(info?.dueno_nombre||'la caja')]:soloLectura?['lee','👀','Solo lectura']:offline?['off','📴','Sin internet · guardado aquí']:subiendo?['sube','⏳','Guardando…']:sucio?['sube','⏳','Por subir']:['ok','☁️','Guardado'];
  p.className='pw-pill '+cls+(nuevos?' nuevo':'');
  p.title=zona(SUC)+' · '+txt;
  p.innerHTML=`<b>${esc(zona(SUC))}</b><i>${ico}</i><span>${txt}</span>${nuevos?'<em>🔄 Hay datos nuevos</em>':''}`;
  if(!document.getElementById('pwMenu').hidden)pintarMenu();
}
function pintarMenu(){
  const m=document.getElementById('pwMenu');
  const d=info?.dueno&&info.dueno!==DISP?info.dueno_nombre||'otro dispositivo':null;
  m.innerHTML=`<p class="pw-m-t">🧾 POS de ${esc(nomSuc(SUC))}</p>
    <p class="pw-m-s">${dueno?`💳 La caja está en <b>este dispositivo</b> (${esc(NOMBRE)}).`:`👀 Solo lectura.${d?` La caja está en <b>${esc(d)}</b>.`:''}`}<br>${offline?'📴 Sin internet: todo queda guardado aquí y sube al volver.':sucio?'⏳ Hay cambios por subir.':'☁️ Todo está en la nube.'}${version?` · versión ${version}`:''}</p>
    ${nuevos?'<button type="button" data-pw="actualizar">🔄 Ver los datos nuevos</button>':''}
    ${!dueno?'<button type="button" data-pw="usar">💳 Usar la caja aquí</button>':''}
    ${dueno&&sucio?'<button type="button" data-pw="subir">☁️ Subir ahora</button>':''}
    <button type="button" data-pw="copia">💾 Descargar copia (.db)</button>
    ${dueno?'<button type="button" data-pw="importar">📥 Traer datos del POS de Windows</button>':''}
    <button type="button" data-pw="nombre">✏️ Nombre de este dispositivo</button>
    <button type="button" data-pw="olvidar">🔒 Cerrar sesión del local</button>
    <button type="button" data-pw="salir" class="pw-m-salir">⌂ Volver al menú de ARAMO</button>`;
}
// ── Pedidos de La Feria en el POS ──
// "Abrir este pedido en POS" (Mostrador) lo monta como un tiquete del POS con el nombre del cliente.
// "Guardar y volver al Mostrador" devuelve la cotización (aramo_pos_cotizacion_<id>) y cierra esta pestaña;
// el tiquete queda montado (aramo_pos_feria_<tienda>) para cobrarlo con F12 cuando el cliente confirme.
// Al cobrarlo, la venta lleva el nombre del cliente y el Mostrador ve el número (aramo_pos_venta_<id>).
const feriaClave=()=>'aramo_pos_feria_'+SUC;
const sinCanasta=s=>String(s||'').replace(/^🧺\s*/,'');
function feriaPendientes(){return (LS.get(feriaClave(),[])||[]).filter(x=>x&&x.id&&Date.now()-(+x.t||0)<4*864e5);}
function feriaGuardar(L){LS.set(feriaClave(),L.slice(-20));}
function feriaProducto(it){
  const cat=window.ARAMO_CAT;let cid='';
  try{const c=cat&&cat.deFeria?cat.deFeria(it.k):null;cid=c?c.id:(cat?cat.idDe(it.n):'');}catch(e){}
  const q=(sql,arg)=>{try{return POS.prepare(sql).get([arg])||null;}catch(e){return null;}};
  const campos=c=>`SELECT id,nombre,unidad,precio,tasa_impuesto${c?',cabys_codigo':''} FROM productos WHERE activo=1 AND `;
  const buscar=c=>(cid&&q(campos(c)+'catalogo_id=? LIMIT 1',cid))||q(campos(c)+'lower(nombre)=lower(?) LIMIT 1',String(it.n||''));
  return buscar(true)||buscar(false);
}
function feriaLineas(d){
  return (d.items||[]).filter(it=>it&&it.estado!=='nohay').map(it=>{
    // si el POS lo vende en otra unidad (kilo contra unidad), va como línea suelta con la unidad y el precio del pedido
    let pr=feriaProducto(it);const cant=(it.qr!=null&&it.qr!=='')?+it.qr:+it.q||0;
    if(pr&&((pr.unidad==='kg')!==(it.u==='kg')))pr=null;
    return{k:it.k,pid:pr?pr.id:null,nombre:pr?pr.nombre:it.n,precio:+it.p>0?+it.p:(pr?+pr.precio||0:0),cantidad:cant,
      unidad:pr?pr.unidad:(it.u==='kg'?'kg':'unidad'),tasa:pr?+pr.tasa_impuesto||0:0,cabys:(pr&&pr.cabys_codigo)||it.cabys||''};
  });
}
function feriaMontarPendientes(){
  if(!window.posTiquetes)return 0;let n=0;
  feriaPendientes().forEach(p=>{if(!window.posTiquetes.tiene(p.id)){window.posTiquetes.montar({id:p.id,ref:p.ref,nombre:p.nombre,lineas:p.lineas});n++;}});
  return n;
}
function montarPedidoWeb(){
  const id=new URLSearchParams(location.search).get('encargo'),d=LS.get('aramo_pos_encargo',null);
  let vueltas=0;
  const listo=()=>{
    if(!window.posTiquetes){if(++vueltas<80)setTimeout(listo,250);return;}
    const n=feriaMontarPendientes();
    if(id&&d&&d.id===id){
      window.posTiquetes.montar({id,ref:d.ref||'',nombre:'🧺 '+((d.cliente&&d.cliente.nombre)||'Cliente'),lineas:feriaLineas(d)});
      feriaBarra(d,id);
    }else if(n)aviso('🧺 '+(n===1?'Hay 1 pedido de La Feria listo':'Hay '+n+' pedidos de La Feria listos')+' para cobrar: elegí su tiquete y tocá F12.');
  };
  listo();
  // si otra pestaña deja un pedido listo, aparece aquí también
  window.addEventListener('storage',e=>{if(e.key===feriaClave()&&feriaMontarPendientes())aviso('🧺 Llegó un pedido de La Feria para cobrar: elegí su tiquete y tocá F12.');});
}
function feriaBarra(d,id){
  if(document.getElementById('pwPedidoWeb'))return;
  const box=document.createElement('aside');box.id='pwPedidoWeb';box.setAttribute('role','region');box.setAttribute('aria-label','Pedido de La Feria');
  Object.assign(box.style,{position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'14px',zIndex:1200,width:'min(640px,calc(100vw - 24px))',padding:'12px 14px',borderRadius:'16px',background:'#fff',color:'#18351f',boxShadow:'0 18px 50px rgba(0,0,0,.28)',border:'2px solid #2f8f5b',fontFamily:'system-ui,sans-serif',display:'flex',flexWrap:'wrap',alignItems:'center',gap:'10px'});
  box.innerHTML=`<div style="flex:1 1 260px;min-width:0"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#55765e;font-weight:800">🧺 Pedido de La Feria · ${esc(d.ref||'')}</div><div style="font-size:17px;font-weight:800;margin-top:2px">${esc((d.cliente&&d.cliente.nombre)||'Cliente')}</div><div style="font-size:13px;color:#46604c;margin-top:2px">Ya está en su tiquete. Revisá pesos y precios ahí y tocá Guardar.</div><div data-pw-msg style="font-size:13px;font-weight:700;margin-top:4px"></div></div>
    <button type="button" data-pw-save style="min-height:52px;padding:0 18px;border:0;border-radius:12px;background:#1f7a45;color:#fff;font-size:16px;font-weight:800;cursor:pointer">✅ Guardar y volver al Mostrador</button>
    <button type="button" data-pw-close aria-label="Cerrar este aviso" style="min-height:52px;min-width:52px;border:1px solid #cfe0d4;border-radius:12px;background:#fff;font-size:20px;cursor:pointer">✕</button>`;
  box.querySelector('[data-pw-close]').onclick=()=>box.remove();
  box.querySelector('[data-pw-save]').onclick=()=>{
    const t=window.posTiquetes&&window.posTiquetes.leer(id),m=box.querySelector('[data-pw-msg]');
    if(!t){if(m)m.textContent='⚠️ No encuentro el tiquete de este pedido.';return;}
    const cart=t.cart||[];
    const items=(d.items||[]).map(it=>{const c=cart.find(x=>x.feriaK===it.k);return c?{...it,q:+c.cantidad||0,p:+c.precio_cobrado||0,qr:null}:{...it,q:0,qr:null};});
    cart.filter(x=>!x.feriaK).forEach(x=>items.push({k:'pos_'+(x.productoId||x.cartId),n:x.nombre,e:'🧺',q:+x.cantidad||0,p:+x.precio_cobrado||0,u:x.unidad==='kg'?'kg':'unid',s:x.unidad==='kg'?.25:1,nuevo:1}));
    const total=items.reduce((s,it)=>s+(+it.q||0)*(+it.p||0),0);
    LS.set('aramo_pos_cotizacion_'+id,{id,items,total,at:new Date().toISOString()});
    feriaGuardar([...feriaPendientes().filter(x=>x.id!==id),{id,ref:d.ref||'',nombre:t.nombre,t:Date.now(),
      lineas:cart.map(c=>({k:c.feriaK||'',pid:c.productoId,nombre:c.nombre,precio:+c.precio_cobrado||0,cantidad:+c.cantidad||0,unidad:c.unidad,tasa:+c.tasa_impuesto||0,cabys:c.cabys_codigo||''}))}]);
    if(m)m.textContent='✅ Guardado. El tiquete queda listo para cobrar con F12. Volviendo al Mostrador…';
    setTimeout(()=>{try{window.close();}catch(e){}setTimeout(()=>{if(!document.hidden)location.href='../APP.html';},500);},900);
  };
  document.body.appendChild(box);
}
// La venta de un pedido de La Feria: el Mostrador la ve y el tiquete deja de estar pendiente.
window.posVentaHecha=(t,v,se)=>{
  if(!t||!t.encargo)return;
  const cli=sinCanasta(t.nombre);
  LS.set('aramo_pos_venta_'+t.encargo,{numero:(v&&v.numero)||'',total:+se.total||0,metodo:se.metodo_pago||'',sinpe:+se.pago_sinpe||0,efectivo:+se.pago_efectivo||0,tarjeta:+se.pago_tarjeta||0,at:new Date().toISOString(),cliente:cli});
  feriaGuardar(feriaPendientes().filter(x=>x.id!==t.encargo));
  aviso('🧺 Venta '+((v&&v.numero)||'')+' de '+cli+' registrada · La Feria');
};
window.posTiqueteDescartado=t=>{if(t&&t.encargo)feriaGuardar(feriaPendientes().filter(x=>x.id!==t.encargo));};
let _tt=0;
function aviso(m){const t=document.getElementById('pwToast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),5200);}
function alerta(t,m){setTimeout(()=>alert(t+'\n\n'+m),50);}

// el mismo service worker de ARAMO: así el POS abre aunque no haya internet
try{if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('../service-worker.js',{scope:'../'}).catch(()=>{});}catch{}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar);else arrancar();
})();
