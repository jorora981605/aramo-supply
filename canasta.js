/* ══════════════════════════════════════════════════════════════════════
   ARAMO Taller — premium y simple (2026-10-10).
   Inicio: saludo, buscador (o lista dictada), todas las categorías a la
   vista y productos en tarjetas grandes; el + se abre en − cantidad +.
   El pedido en curso se ve arriba como tarjeta en vivo.
   Después, un paso a la vez: Tu canasta → Entrega → Datos → Pago, con un
   solo botón abajo. "↺ Reiniciar" vacía todo (con Deshacer).
   Tocar un producto abre su ventana: cantidad libre y unidad (kilo o unidad).
   Mi perfil: tarjeta de socio con hojas 🍃 y nivel, consumo y premios.
   Tu pedido: estado en vivo y siempre "‹ Volver a la tienda".

   La lógica es la de siempre: catálogo de la vitrina, recetas que se
   escalan, lista escrita o dictada, retiro/carro/envío con Uber, pagos,
   AramoNube en vivo y cola local para pedidos pendientes.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const CFG=window.ARAMO_CANASTA,N=window.AramoNube;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const buzz=p=>{try{if(navigator.userActivation?.hasBeenActive!==false)navigator.vibrate&&navigator.vibrate(p);}catch{}};
const MINI=/[?&]mini=1/.test(location.search);
const DESK=window.matchMedia('(min-width: 1000px)');
let _installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();_installPrompt=e;window.__aramoInstallPrompt=e;render?.();});
window.addEventListener('appinstalled',()=>{_installPrompt=null;window.__aramoInstallPrompt=null;});
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const ANON_ID=LS.get('aramo_anon_id',null)||('a'+Date.now().toString(36)+Math.random().toString(36).slice(2,9));LS.set('aramo_anon_id',ANON_ID);
const track=(tipo,data={})=>{try{N.registrarEvento?.(tipo,data,ANON_ID);}catch{}};
window.addEventListener('error',e=>track('client_error',{message:String(e.message||'Error').slice(0,240),file:String(e.filename||'').slice(-120),line:e.lineno||0}));
window.addEventListener('unhandledrejection',e=>track('client_error',{message:String(e.reason?.message||e.reason||'Promise rechazada').slice(0,240)}));
const $c=N.colones;
// Fotos reales de los productos (canasta-fotos.js); si un producto no tiene, se usa su emoji.
const FOTOS=window.ARAMO_FOTOS||{};
let FOTOS_EXTRA={};
function cargarFotosExtra(){try{FOTOS_EXTRA=Object.fromEntries(Object.entries(N.tienda().prods||{}).filter(([,p])=>p?.foto).map(([k,p])=>[k,{f:p.foto,t:'foto'}]));}catch{FOTOS_EXTRA={};}}
N.on?.(tipo=>{if(tipo==='tienda'){cargarFotosExtra();_cat=null;}});setTimeout(cargarFotosExtra,0);
// Las fotos ya están guardadas en el teléfono (service-worker.js): se cargan enseguida, sin esperar a verlas.
function foto(k,e,cls=''){const f=FOTOS_EXTRA[k]||FOTOS[k];return f?`<img class="ft ${f.t||'foto'}${cls?' '+cls:''}" src="${esc(f.f)}" alt="" draggable="false">`:`<span class="em${cls?' '+cls:''}">${e||'🧺'}</span>`;}

const C={
  paso:'armar',actual:null,pasillo:null,q:'',parse:null,verRecetas:false,recCat:'todas',ultimo:null,pulso:false,
  cesta:LS.get('cn_cesta',{}),
  retiro:Object.assign({suc:null,modo:'asap',dia:0,hora:null,carro:false,placa:'',entrega:'tienda',ubi:null,senas:'',visto:false},LS.get('cn_retiro',{})),
  perfil:Object.assign({nombre:'',tel:'',correo:''},LS.get('cn_perfil',{})),
  pago:Object.assign({metodo:'sinpe',conCuanto:0},LS.get('cn_pago',{})),infoOpen:!!LS.get('cn_info_open',false),
  factura:Object.assign({quiere:false,cedula:'',correo:''},LS.get('cn_factura',{})),consent:!!LS.get('cn_consent',false),
  sust:LS.get('cn_sust','avisar'),
  nota:LS.get('cn_nota',''),
  mis:LS.get('cn_mis',[]),
  personas:LS.get('cn_personas',4),
  premio:LS.get('cn_premio',null),
  editOrder:null,authEmail:'',authPassword:'',direcciones:[],installReady:false,
  animGrid:true,toque:null,
};
// "Al carro" es lo mismo que recoger en tienda: ya no es una opción aparte
if(C.retiro.entrega==='carro'){C.retiro.entrega='tienda';C.retiro.carro=false;}
function guardar(){
  LS.set('cn_cesta',C.cesta);LS.set('cn_retiro',C.retiro);LS.set('cn_perfil',C.perfil);LS.set('cn_pago',C.pago);
  LS.set('cn_sust',C.sust);LS.set('cn_nota',C.nota);LS.set('cn_mis',C.mis);LS.set('cn_personas',C.personas);LS.set('cn_premio',C.premio);
  LS.set('cn_factura',C.factura);
  LS.set('cn_consent',C.consent);
  LS.set('cn_info_open',C.infoOpen);
}

// ══════════════ Vitrina ══════════════
const T=()=>N.tienda();
let _cat=null;
function cat(){return _cat||(_cat=N.catalogo(C.retiro.suc).filter(p=>!p.oculto));}
const prod=k=>cat().find(p=>p.k===k);
const RECETAS=()=>N.recetas();
// "Para completar": lo que suele ir con lo que ya está en la canasta (según el recetario)
function sugerencias(){
  const en=new Set(Object.keys(C.cesta));if(!en.size)return [];
  const puntos={};
  RECETAS().forEach(r=>{
    const ks=r.items.map(i=>i[0]),comun=ks.filter(k=>en.has(k)).length;
    if(!comun)return;
    ks.forEach(k=>{if(!en.has(k))puntos[k]=(puntos[k]||0)+comun;});
  });
  return Object.entries(puntos).sort((a,b)=>b[1]-a[1]).map(([k])=>prod(k)).filter(p=>p&&!p.agotado).slice(0,4);
}

// ══════════════ Cantidades y textos ══════════════
function fq(n){
  n=+n||0;
  if(Number.isInteger(n))return String(n);
  const w=Math.floor(n),f=+(n-w).toFixed(2),fr={.25:'¼',.5:'½',.75:'¾'}[f];
  return fr?(w||'')+fr:String(+n.toFixed(2)).replace('.',',');
}
const UNI={kg:['kg','kg'],unid:['unid.','unid.'],rollo:['rollo','rollos'],paquete:['paquete','paquetes'],bolsita:['bolsita','bolsitas'],bolsa:['bolsa','bolsas'],'cartón':['cartón','cartones'],frasco:['frasco','frascos'],botella:['botella','botellas']};
const fu=(u,q)=>(UNI[u]||[u,u])[q===1?0:1];
const qtxt=(q,u)=>fq(q)+' '+fu(u,q);
const porU=p=>$c(p.p)+(p.u==='kg'?'/kg':p.u==='unid'?' c/u':'/'+fu(p.u,1));
const kg=n=>(Math.round((+n||0)*100)/100).toLocaleString('es-CR',{maximumFractionDigits:2});
const MAD={hoy:'Para comer hoy',semana:'Para la semana',verde:'Bien verde'};
const SUST={avisar:{e:'📞',n:'Avisame'},similar:{e:'🔁',n:'Algo parecido'},quitar:{e:'✖️',n:'Quitalo'}};

// ══════════════ Canasta ══════════════
// Cada producto se cobra en su unidad (p.u). Si tiene peso aproximado por unidad (pu, en kg),
// el cliente también puede pedirlo por kilo o por unidad: la tienda cobra lo que pese o cuente.
// En la canasta, q va en la unidad que eligió el cliente (u) y qb en la unidad de cobro.
const limpiaQ=(q,u)=>{q=+q||0;if(q<=0)return 0;q=Math.min(q,999);return u==='kg'?Math.max(.05,Math.round(q*100)/100):Math.max(1,Math.round(q));};
function unidadesDe(p){const L=[p.u];if(+p.pu>0&&(p.u==='kg'||p.u==='unid'))L.push(p.u==='kg'?'unid':'kg');return L;}
const unidadDe=(p,u)=>unidadesDe(p).includes(u)?u:p.u;
const pasoU=(p,u)=>u===p.u?p.s:(u==='kg'?.5:1);
function aBase(p,q,u){if(!u||u===p.u||!(+p.pu>0))return q;return limpiaQ(p.u==='kg'?q*p.pu:q/p.pu,p.u);}
function deBase(p,qb,u){if(!u||u===p.u||!(+p.pu>0))return qb;return limpiaQ(u==='unid'?qb/p.pu:qb*p.pu,u);}
function linea(k){const p=prod(k),v=C.cesta[k];if(!p||!v)return null;const u=unidadDe(p,v.u),q=limpiaQ(v.q,u);return q>0?{k,p,...v,u,q,qb:aBase(p,q,u)}:null;}
function cestaItems(){return Object.keys(C.cesta).map(linea).filter(Boolean);}
function cestaTotal(){return N.redondear5(disponibles().reduce((t,x)=>t+x.qb*x.p.p,0));}
// Lo que se agota puede seguir en la canasta, pero se ve como agotado, no se cobra ni va en el pedido.
const disponibles=()=>cestaItems().filter(x=>!x.p.agotado);
const agotadosEnCesta=()=>cestaItems().filter(x=>x.p.agotado);
function avisoAgotados(){const a=agotadosEnCesta();return a.length?`<p class="aviso-agotado" role="status">⚠️ Se agotó: <b>${a.map(x=>esc(x.p.n)).join(', ')}</b>. No va en tu pedido ni se cobra.</p>`:'';}
let _agot=null;
function avisarAgotados(){const a=agotadosEnCesta(),nuevos=_agot?a.filter(x=>!_agot.has(x.k)):[];_agot=new Set(a.map(x=>x.k));if(nuevos.length)toast('⚠️ Se agotó '+nuevos.map(x=>x.p.n).join(', ')+': no va en tu pedido');}
const cestaN=()=>cestaItems().length;
const cestaPeso=()=>cestaItems().reduce((t,x)=>t+(x.u==='kg'?x.q:x.p.u==='kg'?x.qb:0),0);
function setQ(k,q){
  const p=prod(k);if(!p)return;
  const c=C.cesta[k]||{};q=limpiaQ(q,unidadDe(p,c.u));
  if(q<=0)delete C.cesta[k];else C.cesta[k]={...c,q};
  guardar();
}
// suma en la unidad de cobro (recetas y listas) respetando la unidad que ya eligió el cliente
function sumar(k,qb){const p=prod(k);if(!p)return;const c=C.cesta[k]||{},u=unidadDe(p,c.u);C.cesta[k]={...c,q:limpiaQ((+c.q||0)+deBase(p,qb,u),u)};}

// ══════════════ Pedidos del cliente ══════════════
const misPedidos=()=>C.mis.map(id=>N.get(id)).filter(Boolean);
const pedidosVisibles=()=>misPedidos().filter(o=>o.estado!=='cancelado').sort((a,b)=>Date.parse(b.created||0)-Date.parse(a.created||0)).slice(0,5);
const activo=()=>misPedidos().filter(o=>!['entregado','cancelado'].includes(o.estado))[0]||null;
const ultimoEntregado=()=>misPedidos().find(o=>o.estado==='entregado')||null;
const ultimoPedido=()=>misPedidos().find(o=>o.estado!=='cancelado')||null;
function avance(o){const it=o.items||[],r=it.filter(x=>x.estado==='listo'||x.estado==='nohay').length;return{r,n:it.length};}
const pesoReal=o=>(o.items||[]).reduce((t,i)=>t+(i.u==='kg'&&i.estado==='listo'?+(i.qr??i.q)||0:0),0);
const suc=k=>(T().sucursales||[]).find(s=>s.k===k);
const sucs=()=>(T().sucursales||[]).filter(s=>s.activa!==false);

// Hora de Costa Rica (UTC−6 todo el año) aunque el teléfono esté en otra zona horaria, y
// corregida con la hora de la nube si el reloj del teléfono está corrido (N.desfase).
const ahora=()=>new Date(Date.now()+(+N.desfase||0));
const CR=d=>{const x=new Date(+new Date(d)-216e5);return{y:x.getUTCFullYear(),mo:x.getUTCMonth(),d:x.getUTCDate(),h:x.getUTCHours(),mi:x.getUTCMinutes()};};
const desdeCR=(y,mo,d,min)=>new Date(Date.UTC(y,mo,d,0,min)+216e5); // ese día y minuto en Costa Rica
const TZ={timeZone:'America/Costa_Rica'};
function fechaClave(d=ahora()){const p=CR(d);return p.y+'-'+String(p.mo+1).padStart(2,'0')+'-'+String(p.d).padStart(2,'0');}
function horarioDe(s,d=ahora()){
  if((T().feriados||[]).includes(fechaClave(d)))return null;
  const special=T().horariosEspeciales?.[fechaClave(d)];
  if(special?.cerrada)return null;
  return{abre:special?.abre||s?.abre,cierra:special?.cierra||s?.cierra};
}
function distKm(a,b){if(!a||!b)return null;const R=6371,rad=x=>x*Math.PI/180,da=rad(b.lat-a.lat),dl=rad(b.lng-a.lng);return 2*R*Math.asin(Math.sqrt(Math.sin(da/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dl/2)**2));}
function envioEstimado(s,u){
  const cfg={radioKm:8,tarifaBase:1500,tarifaKm:250,minimo:0,...(T().envioConfig||{})};
  const km=distKm(s,u),fuera=km!=null&&cfg.radioKm>0&&km>cfg.radioKm;
  const costo=km==null?+cfg.tarifaBase||0:Math.max(0,Math.round((+cfg.tarifaBase||0)+km*(+cfg.tarifaKm||0)));
  return{...cfg,km,costo,fuera};
}
const cumpleMinimo=()=>{const m=+T().envioConfig?.minimo||0;return cestaTotal()>=m;};

// ══════════════ Horarios ══════════════
const hm=s=>{const [h,m]=String(s||'0:0').split(':').map(Number);return h*60+(m||0);};
const lead=()=>+T().alistadoMin||40;
const minsHoy=()=>{const p=CR(ahora());return p.h*60+p.mi;};
function aFecha(dia,min){const p=CR(ahora());return desdeCR(p.y,p.mo,p.d+dia,min);}
function abierta(s,d=ahora()){const h=horarioDe(s,d);if(!h)return false;const p=CR(d),m=p.h*60+p.mi;return m>=hm(h.abre)&&m<hm(h.cierra);}
function asap(s){const h=horarioDe(s);if(!h)return null;let m=Math.max(minsHoy(),hm(h.abre))+lead();m=Math.ceil(m/5)*5;return m>hm(h.cierra)?null:aFecha(0,m);}
function slots(s,dia){
  const ref=aFecha(dia,0),h=horarioDe(s,ref);if(!h)return[];
  let m=hm(h.abre)+lead();
  if(dia===0)m=Math.max(m,minsHoy()+lead());
  m=Math.ceil(m/30)*30;
  const out=[];for(;m<=hm(h.cierra);m+=30){const at=aFecha(dia,m),lim=+T().capacidadPorHora||0;if(lim&&N.lista().filter(o=>o.sucursal===s.k&&!['cancelado','entregado'].includes(o.estado)&&Math.abs(Date.parse(o.retiro?.at||0)-+at)<3600000).length>=lim)continue;out.push(at);}
  return out;
}
const fh=d=>new Date(d).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit',...TZ});
function fdia(d){
  const dia=x=>Math.floor((+new Date(x)-216e5)/864e5),b=new Date(d);
  const n=dia(b)-dia(ahora());
  return n===0?'hoy':n===1?'mañana':n===-1?'ayer':b.toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'short',...TZ});
}
const cuando=d=>fdia(d)+' a las '+fh(d);
function asegurarRetiro(){
  const r=C.retiro;
  if(!suc(r.suc)||suc(r.suc).activa===false)r.suc=(sucs().find(x=>abierta(x))||sucs()[0])?.k||null;
  const s=suc(r.suc);if(!s)return;
  if(T().envioConfig?.activa===false&&r.entrega==='envio')r.entrega='tienda';
  if(r.modo==='asap'&&!asap(s))r.modo='prog';
  if(r.modo==='prog'){
    const h=r.hora?new Date(r.hora):null;
    if(!h||+h<+ahora()||!slots(s,r.dia).some(x=>+x===+h)){
      if(!slots(s,r.dia).length&&r.dia===0)r.dia=1;
      r.hora=(slots(s,r.dia)[0]||null)?.toISOString()||null;
    }
  }
  if(r.entrega==='carro')r.entrega='tienda';
  if(r.entrega==='envio'&&T().envio===false)r.entrega='tienda';
  r.carro=r.entrega==='carro';
}
function horaRetiro(){
  const s=suc(C.retiro.suc);if(!s)return null;
  if(C.retiro.modo==='asap')return asap(s);
  const h=C.retiro.hora?new Date(C.retiro.hora):null;
  return h&&+h>+ahora()?h:null;
}

// ══════════════ Entrega ══════════════
const esEnvio=()=>C.retiro.entrega==='envio';
function entregaTxt(r){return r?.envio||r?.entrega==='envio'?'🛵 Envío con Uber':r?.carro?'🚗 Al carro'+(r.placa?' ('+r.placa+')':''):'🚶 En la tienda';}
const mapaUrl=u=>'https://www.google.com/maps/search/?api=1&query='+u.lat+','+u.lng;
function mapaEmbed(u){const d=.0035;return `https://www.openstreetmap.org/export/embed.html?bbox=${u.lng-d},${u.lat-d},${u.lng+d},${u.lat+d}&layer=mapnik&marker=${u.lat},${u.lng}`;}
function leerCoords(txt){
  const m=String(txt||'').match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if(!m)return null;
  const lat=+m[1],lng=+m[2];
  return Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng,acc:null}:null;
}
function tomarUbicacion(){
  if(!navigator.geolocation){toast('Este teléfono no comparte ubicación; pegá un link de Google Maps');return;}
  toast('📍 Buscando tu ubicación…');
  navigator.geolocation.getCurrentPosition(p=>{
    C.retiro.ubi={lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy||0)};
    guardar();buzz(15);toast('📍 Ubicación lista');C.pulso=true;render();
  },e=>{toast(e.code===1?'Permití la ubicación en tu navegador o pegá un link de Google Maps':'No pudimos ubicarte; probá de nuevo o pegá un link');},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
}

function cargarDirecciones(){
  if(!N.authEstado?.().verificado)return;
  N.direcciones?.().then(r=>{C.direcciones=r||[];if(C.paso==='entrega'&&!C.actual)render();});
}
function guardarDireccionActual(){
  const u=C.retiro.ubi;if(!u)return;
  const nombre=prompt('¿Cómo querés llamar esta dirección?','Casa');if(!nombre?.trim())return;
  N.guardarDireccion({nombre:nombre.trim(),lat:u.lat,lng:u.lng,senas:C.retiro.senas||''}).then(()=>{toast('📍 Dirección guardada');cargarDirecciones();}).catch(e=>toast(e.message||'No se pudo guardar'));
}

// ══════════════ Qué falta (nunca un botón muerto sin explicación) ══════════════
const telDig=t=>String(t||'').replace(/\D/g,'').replace(/^506/,'');
const fmtTel=t=>{const d=telDig(t);return d.length===8?d.slice(0,4)+'-'+d.slice(4):d;};
function authMeta(){const a=N.authEstado?.()||{},m=a.user?.user_metadata||{};return{a,m};}
function sincronizarPerfilAuth(){
  const {a,m}=authMeta();if(!a.user)return;
  const n=String(m.full_name||m.name||'').trim(),t=telDig(m.phone||m.telefono||''),e=String(a.email||'').trim();let cambio=false;
  if(n&&!C.perfil.nombre){C.perfil.nombre=n;cambio=true;}
  if(t&&telDig(C.perfil.tel).length!==8){C.perfil.tel=t;cambio=true;}
  if(e&&!C.perfil.correo){C.perfil.correo=e;C.authEmail=e;cambio=true;}
  if(cambio)guardar();
}
const perfilNombre=()=>{sincronizarPerfilAuth();return String(C.perfil.nombre||'').trim();};
const perfilTelefono=()=>String(C.perfil.tel||'').trim();
const perfilCorreo=()=>String(C.perfil.correo||C.authEmail||N.authEstado?.().email||'').trim();
const perfilOk=()=>perfilNombre().length>=2&&telDig(perfilTelefono()).length===8;
function faltaArmar(){return disponibles().length?null:{m:cestaN()?'Lo de tu canasta se agotó: agregá otro producto':'Agregá al menos un producto',p:'armar',f:'tlQ'};}
function faltaRetiro(){
  if(!suc(C.retiro.suc))return{m:'Elegí la tienda',p:'entrega',f:'tlSecSuc'};
  if(!horaRetiro())return{m:'Elegí la hora',p:'entrega',f:'tlSecHora'};
  if(esEnvio()&&!C.retiro.ubi)return{m:'Falta tu ubicación para el envío',p:'entrega',f:'tlUbiBtn'};
  if(esEnvio()&&T().envioConfig?.activa===false)return{m:'El envío a domicilio no está disponible hoy',p:'entrega',f:'tlSecEntrega'};
  if(esEnvio()&&C.retiro.ubi){const e=envioEstimado(suc(C.retiro.suc),C.retiro.ubi);if(e.fuera)return{m:`Esta dirección queda fuera de la zona (${e.radioKm} km)`,p:'entrega',f:'tlSecUbi'};if(e.minimo>0&&!cumpleMinimo())return{m:`El pedido mínimo a domicilio es ${$c(e.minimo)}`,p:'canasta',f:'tlSecCesta'};}
  return null;
}
function faltaDatos(){
  if(perfilNombre().length<2)return{m:'Escribí el nombre de contacto',p:'datos',f:'tlDatosNom'};
  if(telDig(perfilTelefono()).length!==8)return{m:'Escribí un teléfono de contacto de 8 números',p:'datos',f:'tlDatosTel'};
  return null;
}
function faltaPago(){
  if(C.factura.quiere&&(!C.factura.cedula.trim()||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(C.factura.correo)))return{m:'Completá cédula y correo para la factura',p:'pago',f:'tlFactura'};
  if(!C.consent)return{m:'Aceptá el aviso de privacidad y las condiciones',p:'pago',f:'tlConsent'};
  return null;
}
const faltaAlgo=()=>faltaArmar()||faltaRetiro()||faltaDatos()||faltaPago();
function avisarFalta(x){
  toast(x.m);buzz([40,40,40]);
  const dest=normPaso(x.p);
  if(C.actual||C.paso!==dest)ir(dest);else render();
  setTimeout(()=>{const el=x.f&&$(x.f);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});if(el.tagName==='INPUT')el.focus({preventScroll:true});el.classList.add('falta');setTimeout(()=>el.classList.remove('falta'),1600);}},160);
}

// ══════════════ Lista escrita o dictada ══════════════
const NUMW={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,veinte:20,treinta:30,media:.5,medio:.5,cuarto:.25};
const UNITW={kg:'kg',kgs:'kg',kilo:'kg',kilos:'kg',kilogramo:'kg',kilogramos:'kg',unidad:'unid',unidades:'unid',und:'unid',rollo:'rollo',rollos:'rollo',mazo:'rollo',mazos:'rollo',rollito:'rollo',rollitos:'rollo',paquete:'paquete',paquetes:'paquete',docena:'docena',docenas:'docena',carton:'cartón',cartones:'cartón',bolsa:'bolsa',bolsas:'bolsa',bolsita:'bolsita',bolsitas:'bolsita',frasco:'frasco',botella:'botella'};
const VACIAS=new Set(['de','del','la','las','el','los','y','con','para','por','favor','porfa','quiero','ocupo','necesito','me','manda','mandame','traeme','agrega','agregame','pone','poneme','tambien','mas','unos','unas','bien']);
function emparejar(nombre){
  const w=nombre.split(' ').map(t=>t.replace(/(es|s)$/,'')).filter(t=>t.length>1);
  if(!w.length)return null;
  let best=null,sc=0;
  cat().forEach(p=>{
    const pn=norm(p.n),pk=p.k.replace(/_/g,' ');
    let s=0;
    w.forEach(t=>{if(pn.split(/\s+/).some(x=>x.startsWith(t))||pk.includes(t))s+=t.length+2;else if(pn.includes(t))s+=t.length;});
    if(pn.startsWith(w[0]))s+=3;
    s-=pn.length/25;
    if(s>sc){sc=s;best=p;}
  });
  return sc>=4?best:null;
}
function leerLista(txt){
  const t=norm(txt)
    .replace(/(un |1 )?kilo y medio/g,'1.5 kg').replace(/medio kilo/g,'0.5 kg').replace(/(\d+) y medio/g,'$1.5')
    .replace(/(\d)\s*(kg|k)\b/g,'$1 kg');
  const segs=t.split(/[,;\n•]+|\s+y\s+(?=\d|un\b|una\b|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|media docena)|\s+(?=\d+(?:[.,]\d+)?\s)/);
  const out=[];
  segs.forEach(seg=>{
    seg=seg.trim();if(!seg)return;
    let q=null,u=null;const resto=[];
    seg.replace(/media docena/,'6 unidad').split(/\s+/).forEach(tok=>{
      if(/^\d+([.,]\d+)?$/.test(tok)){if(q==null)q=parseFloat(tok.replace(',','.'));}
      else if(NUMW[tok]!=null&&q==null)q=NUMW[tok];
      else if(UNITW[tok])u=UNITW[tok];
      else if(!VACIAS.has(tok))resto.push(tok);
    });
    const nombre=resto.join(' ');if(!nombre)return;
    const p=emparejar(nombre);
    if(u==='docena'){q=(q||1)*12;u=null;}
    if(q==null)q=1;
    out.push({txt:seg,p,q:p?Math.max(p.s,+(Math.round(q/p.s)*p.s).toFixed(2)):q,on:!!(p&&!p.agotado)});
  });
  return out;
}

// ══════════════ Recetas ══════════════
function escalar(p,q4,personas){
  const x=q4*personas/4;
  return p.u==='kg'?Math.max(p.s,Math.ceil(x/p.s-1e-9)*p.s):Math.max(1,Math.ceil(x-1e-9));
}
function ingredientes(r,personas,off){
  return r.items.map(([k,q4])=>{const p=prod(k);return p?{p,q:escalar(p,q4,personas),on:!p.agotado&&!off?.has(k)}:null;}).filter(Boolean);
}
const costoReceta=(r,per)=>N.redondear5(ingredientes(r,per).filter(x=>x.on).reduce((t,x)=>t+x.q*x.p.p,0));

// ══════════════ El recorrido: Inicio → Canasta → Entrega → Datos → Pago → Tu pedido ══════════════
const PASOS=['armar','canasta','entrega','datos','pago'];
const normPaso=p=>({confirmar:'canasta',sellar:'pago'})[p]||(PASOS.includes(p)?p:'armar');
const pedidoVisto=()=>C.actual?N.get(C.actual):null;
function puedeIr(paso){const p=normPaso(paso);return p==='armar'?null:p==='pago'?faltaArmar()||faltaRetiro()||faltaDatos():p==='datos'?faltaArmar()||faltaRetiro():faltaArmar();}
function emojis(items,n=7){const e=items.map(x=>x.e||x.p?.e).filter(Boolean);return e.slice(0,n).join('')+(e.length>n?'…':'');}
function resumenPedido(o){
  const {r,n}=avance(o),s=suc(o.sucursal);
  if(o.estado==='cancelado')return 'Cancelado';
  if(o.estado==='nuevo'){
    if(N.estadoEnvio?.(o.id)==='pendiente')return 'Sincronizando con la tienda · guardado';
    return 'Recibido · pendiente de aceptación';
  }
  if(o.estado==='alistando')return `Escogiendo · ${r} de ${n}`;
  if(o.estado==='listo')return o.retiro.envio?(o.retiro.envio.uber?'Va en camino':'Lista · pidiendo el Uber'):`Lista · te espera en ${s?.n||'ARAMO'}`;
  if(o.estado==='entregado')return 'Entregado';
  return '';
}

// ══════════════ Navegación ══════════════
function ir(paso){
  C.actual=null;C.paso=normPaso(paso);C.animGrid=true;
  if(C.paso!=='armar'){asegurarRetiro();C.retiro.visto=true;guardar();}
  empujar();render(true);arriba();
}
function ver(id){
  C.actual=id;
  if(H){cerrarHoja(true);if(!MINI)history.replaceState({paso:C.paso,id},'',location.pathname+location.search);}
  else empujar();
  render(true);arriba();
}
function empujar(){if(!MINI)history.pushState({paso:C.paso,id:C.actual},'',location.pathname+location.search);}
function arriba(){if(!MINI)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));}
window.addEventListener('popstate',e=>{
  if(H){cerrarHoja(true);return;}
  C.paso=normPaso(e.state?.paso||'armar');C.actual=e.state?.id||null;
  render(true);
});

// ══════════════ Pantallas ══════════════
// Premium y simple: Inicio → Tu canasta → Entrega → Datos → Pago → Tu pedido.
// Un paso a la vez y un solo botón abajo. Siempre hay cómo volver: "‹" arriba,
// la línea de pasos, "Seguir comprando" y la marca ARAMO (lleva al inicio).
const CHIP={recetas:'📖',frutas:'🍎',verduras:'🥬',hierbas:'🌿',despensa:'🥚',raices:'🥔'};
// Orden de la barra de categorías (lo pidió el dueño): Recetas, Frutas, Verduras, Hierbas, Despensa y Raíces.
const ORDEN_CATS=['recetas','frutas','verduras','hierbas','despensa','raices'];
const PASO_N={canasta:0,entrega:1,datos:2,pago:3};
function saludo(){const nom=perfilNombre().split(/\s+/)[0],h=CR(ahora()).h;const s=h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';return nom?`${s}, ${esc(nom)}`:s;}
function titulo(t,o={}){return `${o.volver?`<button type="button" class="volver" data-act="ir" data-p="${o.volver}"><b aria-hidden="true">‹</b>${esc(o.volverTxt||'Volver')}</button>`:''}<div class="titulo"><h2>${t}</h2>${o.verdict?`<span class="verdict ${o.cls||''}">${esc(o.verdict)}</span>`:''}</div>`;}
function fila(e,t,s,act,attrs=''){return `<button type="button" class="fila-link" data-act="${act}" ${attrs}><span class="e">${e}</span><span class="t"><b>${t}</b>${s?`<small>${s}</small>`:''}</span><span class="go" aria-hidden="true">›</span></button>`;}
const seg=(botones,cls='')=>`<div class="segm ${cls}">${botones}</div>`;
const qcorto=(q,u)=>u==='kg'?fq(q)+' kg':fq(q);
const zona=s=>s?esc(s.zona||s.n):'';
const nombreSuc=s=>s?[s.n,s.zona].filter(Boolean).join(' '):'';
const fhm=hhmm=>fh(aFecha(0,hm(hhmm)));
// Estado de un pedido en palabras cortas, con su ícono y su avance (0-100)
function estadoDe(o){
  const {r,n}=avance(o),env=o.retiro?.envio,E=o.estado,f=N.faseDe?.(o)||({nuevo:'enviado',alistando:'recibido',listo:'alistando',entregado:'entregado'}[E]||'enviado');
  const t={enviado:'Enviado',recibido:'Recibido · la tienda pesa',confirmacion:'Confirmación pendiente',alistando:`Alistando · ${r} de ${n}`,entregado:'Entregado',cancelado:'Cancelado'}[f]||'';
  const e={enviado:'📤',recibido:'📥',confirmacion:'🧾',alistando:'🧑‍🌾',entregado:'🛍️',cancelado:'✖️'}[f]||'🧺';
  const p={enviado:12,recibido:32,confirmacion:55,alistando:75,entregado:100,cancelado:0}[f]??0;
  return {t,e,p,f};
}
// Encabezado de los pasos del pedido: volver y la línea Canasta · Entrega · Datos · Pago
let _p3=0;
function cabPaso(paso){
  const i=PASO_N[paso]??0,p=i/3,p0=_p3;_p3=p;
  const [atras,txt]={canasta:['armar','Seguir comprando'],entrega:['canasta','Tu canasta'],datos:['entrega','Entrega'],pago:['datos','Datos']}[paso];
  return `<button type="button" class="volver" data-act="ir" data-p="${atras}"><b aria-hidden="true">‹</b>${txt}</button>
  <ol class="pasos3" style="--p0:${p0};--p:${p}" aria-label="Pasos del pedido">${[['canasta','Canasta'],['entrega','Entrega'],['datos','Datos'],['pago','Pago']].map(([k,n],j)=>`<li class="${j<i?'si':j===i?'ya':''}"><button type="button" data-act="ir" data-p="${k}" ${j<i?'':'disabled'} aria-label="${n}"><i>${j<i?'✓':j+1}</i></button>${n}</li>`).join('')}</ol>`;
}

// ── Inicio ──
const ADORNO=['🍓','🥑','🍍','🥭','🍋'];
function mesaArmar(){
  const n=cestaN(),u=ultimoPedido(),a=activo(),pedidos=pedidosVisibles();
  const tarjetas=pedidos.map((o,i)=>{const ea=estadoDe(o),s=suc(o.sucursal),envio=N.estadoEnvio?.(o.id)==='pendiente';return `<button type="button" class="vivo-card est-${o.estado}${envio?' pendiente':''}" data-act="ver" data-id="${o.id}" style="--t:${i*.08}s"><span class="vc-e"><i>${ea.e}</i></span><span class="vc-t"><small>Pedido ${esc(o.ref)} · ${esc(s?.n||'ARAMO')}</small><b>${esc(ea.t)}</b><span class="vc-bar"><i style="width:${ea.p}%"></i></span></span><span class="go" aria-hidden="true">›</span></button>`;}).join('');
  return `<section class="hola"><i class="aura" aria-hidden="true"></i><span class="flota" aria-hidden="true">${ADORNO.map((e,i)=>`<i style="--k:${i}">${e}</i>`).join('')}</span><p>${saludo()} 👋</p><h2>¿Qué llevamos hoy?</h2></section>
  ${tarjetas?`<div class="vivo-list" aria-label="Mis pedidos">${tarjetas}</div>`:''}
  ${u&&!n&&!a?`<button type="button" class="repetir" data-act="repetir" data-id="${u.id}" data-express="1"><span class="rp-e">${emojis(u.items,3)}</span><span class="t"><b>Repetir mi último pedido</b><small>${u.items.length} ${u.items.length===1?'producto':'productos'} · ${$c(N.totalDe(u))}</small></span><span class="go" aria-hidden="true">›</span></button>`:''}
  <div class="buscar" id="tlBuscar">
    <form class="ask" id="tlAsk" autocomplete="off" role="search"><svg class="lupa" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="tlQ" type="search" enterkeyhint="search" placeholder="Buscar producto" value="${esc(C.q)}" aria-label="Buscar producto por nombre"><button type="button" class="limpiar" id="tlLimpiar" data-act="limpiar-q" aria-label="Borrar"${C.q?'':' hidden'}>✕</button></form>
    <nav class="mini-cats" id="tlMini" aria-label="Categorías"></nav>
  </div>
  <nav class="cats" id="tlPasillos" aria-label="Categorías"></nav>
  <div id="tlParse">${parseHtml()}</div>
  <div class="prods" id="tlGrid"></div>`;
}
function parseHtml(){
  const P=C.parse;if(!P)return '';
  const ok=P.filter(x=>x.p&&x.on);
  return `<div class="parse"><p class="parse-h">✨ Esto encontramos en tu lista</p><div class="chips">${P.map((x,i)=>x.p?`<button type="button" class="chip${x.on?' on':''}" data-act="parse-t" data-i="${i}">${x.p.e} ${esc(qtxt(x.q,x.p.u))} ${esc(x.p.n)}${x.p.agotado?' · agotado':''}</button>`:`<span class="chip no">❓ ${esc(x.txt)}</span>`).join('')}</div><div class="parse-a"><button type="button" class="btn" data-act="parse-ok" ${ok.length?'':'disabled'}>Agregar ${ok.length} a la canasta</button><button type="button" class="btn ghost" data-act="parse-no">Cancelar</button></div></div>`;
}
// Tarjeta de producto: el emoji en su plato, nombre y precio. El + flota y se abre en − cantidad +.
function tile(p,i){
  const x=linea(p.k),q=x?.q||0;
  return `<div class="pt c-${esc(p.c||'')}${FOTOS[p.k]?' con-foto f-'+(FOTOS[p.k].t||'foto'):''}${q?' in':''}${p.agotado?' off':''}${p.k===C.ultimo?' pop':''}${p.k===C.toque?' toque':''}" style="--i:${Math.min(i||0,18)}" role="button" tabindex="0" data-act="tile" data-k="${p.k}" aria-label="${esc(p.n)}">
    <span class="pt-plato">${FOTOS[p.k]?foto(p.k,p.e,'pt-f'):`<span class="pt-e">${p.e}</span>`}${p.agotado?'<span class="pt-ago">Agotado</span>':q?`<span class="step-q"><button type="button" data-act="menos" data-k="${p.k}" aria-label="Menos ${esc(p.n)}">−</button><em>${esc(qcorto(q,x?.u||p.u))}</em><button type="button" data-act="mas" data-k="${p.k}" aria-label="Más ${esc(p.n)}">+</button></span>`:'<span class="pt-add" aria-hidden="true">+</span>'}</span>
    <span class="pt-n">${esc(p.n)}</span><span class="pt-p">${porU(p)}</span>
  </div>`;
}
function receta(r,i){
  const ing=r.items.map(([k])=>prod(k)).filter(Boolean);
  return `<button type="button" class="receta rc-${esc(r.c||'')}" style="--i:${Math.min(i||0,18)}" data-act="receta" data-k="${r.k}"><span class="re-e">${r.e}</span><span class="re-n">${esc(r.n)}</span><span class="re-i">${ing.slice(0,5).map(p=>`<i>${foto(p.k,p.e)}</i>`).join('')}</span><span class="re-s">Para ${C.personas} · ${$c(costoReceta(r,C.personas))}</span></button>`;
}
const NUM_RX=/\b(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|media|medio|kilo|kilos|docena)\b/;
const pareceLista=t=>/\d|,|;|\n/.test(t)||NUM_RX.test(norm(t));
// Las categorías se ven todas a la vez; al bajar, una fila compacta se queda arriba.
function pintarGrid(){
  const g=$('tlGrid');if(!g)return;
  const modoLista=!!C.parse;
  const q=modoLista?'':norm(C.q).replace(/[\d.,]+/g,' ').replace(/\b(kg|kilos?|unid\w*|rollos?)\b/g,' ').trim();
  const cats=ORDEN_CATS.map(k=>({k,n:k==='recetas'?'Recetas':(CFG.pasillos||[]).find(p=>p.k===k)?.n||k}));
  if(!C.pasillo||!cats.some(f=>f.k===C.pasillo))C.pasillo='frutas';
  const tabs=$('tlPasillos'),mini=$('tlMini');
  if(tabs){tabs.hidden=!!q||modoLista;tabs.innerHTML=cats.map(f=>{const on=C.pasillo===f.k;return `<button type="button" class="tab c-${f.k}${on?' on'+(C.animGrid?' salta':''):''}" data-act="pasillo" data-k="${f.k}"><span class="cat-e">${CHIP[f.k]||'🧺'}</span><span class="cat-n">${esc(f.n)}</span></button>`;}).join('');}
  if(mini)mini.innerHTML=cats.map(f=>`<button type="button" class="mc c-${f.k}${C.pasillo===f.k?' on':''}" data-act="cat" data-c="${f.k}" aria-label="${esc(f.n)}" title="${esc(f.n)}"><span>${CHIP[f.k]||'🧺'}</span><small>${esc(f.n)}</small></button>`).join('');
  const recetas=!q&&!modoLista&&C.pasillo==='recetas';
  g.classList.toggle('entra',!!C.animGrid);C.animGrid=false;
  g.classList.toggle('con-recetas',recetas);
  g.dataset.cat=q?'res':C.pasillo;
  if(modoLista)g.innerHTML='';
  else if(recetas)g.innerHTML=RECETAS().map((r,i)=>receta(r,i)).join('');
  else{
    let lista;
    if(q){const w=q.split(/\s+/).filter(t=>!VACIAS.has(t));lista=cat().filter(p=>{const n=norm(p.n);return w.every(t=>n.includes(t.replace(/(es|s)$/,'')));});}
    else lista=cat().filter(p=>p.c===C.pasillo);
    g.innerHTML=lista.length?lista.map((p,i)=>tile(p,i)).join(''):`<div class="vacio"><b>🔍</b>No encontramos “${esc(C.q)}”.<button type="button" class="link" data-act="limpiar-q">Ver todo</button></div>`;
  }
  pegar();
}

// ── Paso 1 · Tu canasta ──
const BASURA='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
let _totHero=0;
function mesaCanasta(){
  const it=cestaItems(),n=it.length,tot=cestaTotal(),peso=cestaPeso(),sug=sugerencias();
  if(!n)return cabPaso('canasta')+`<div class="vacia"><span class="va-e">🧺</span><h2>Tu canasta está vacía</h2><p>Agregá frutas y verduras y aquí las vas a ver.</p><button type="button" class="btn big" data-act="nuevo">Ver productos</button></div>`;
  return cabPaso('canasta')+`<div class="titulo"><h2>Tu canasta</h2></div>${avisoAgotados()}
  <div class="cesta-hero"><span class="ch-deco" aria-hidden="true">🧺</span>
    <span class="ch-e">${it.slice(-4).reverse().map(x=>`<i>${foto(x.k,x.p.e)}</i>`).join('')}${n>4?`<i class="mas">+${n-4}</i>`:''}</span>
    <small>${n} ${n===1?'producto':'productos'}${peso?` · ≈ ${kg(peso)} kg`:''}</small>
    <b id="tlHeroTot">${$c(_totHero)}</b>
    <p>Total aproximado · pagás lo que pese de verdad</p></div>
  <div class="grupo cesta" id="tlSecCesta">${it.map(x=>{const ag=!!x.p.agotado,min=ag||x.q<=pasoU(x.p,x.u)+1e-9;return `<div class="linea c-${esc(x.p.c||'')}${ag?' agotada':''}${x.k===C.toque?' toque':''}${x.k===C.ultimo?' nueva':''}" role="button" tabindex="0" data-act="info" data-k="${x.k}" aria-label="${esc(x.p.n)}: detalles"><span class="li-e">${foto(x.k,x.p.e)}</span><span class="t"><b>${esc(x.p.n)}</b><small>${esc(porU(x.p))}${x.u!==x.p.u?' · ≈ '+esc(qtxt(x.qb,x.p.u)):''}</small>${x.mad||x.nota?`<span class="li-n">${[x.mad?MAD[x.mad]:'',x.nota||''].filter(Boolean).map(esc).join(' · ')}</span>`:''}</span><span class="pz">${ag?'Agotado':$c(x.qb*x.p.p)}</span><span class="step-q"><button type="button" class="${min?'quita':''}" data-act="menos" data-k="${x.k}" aria-label="${min?'Quitar':'Menos'} ${esc(x.p.n)}">${min?BASURA:'−'}</button><em>${esc(qtxt(x.q,x.u))}</em><button type="button" data-act="mas" data-k="${x.k}" aria-label="Más ${esc(x.p.n)}">+</button></span></div>`;}).join('')}
    <button type="button" class="agregar-mas" data-act="ir" data-p="armar">＋ Agregar más productos</button></div>
  ${sug.length?`<p class="grupo-h">¿Te falta algo?</p><div class="sug2">${sug.map(p=>`<button type="button" class="mini-p c-${esc(p.c||'')}" data-act="sumar" data-k="${p.k}"><span class="mp-e">${foto(p.k,p.e)}<i aria-hidden="true">+</i></span><b>${esc(p.n)}</b><small>${esc(porU(p))}</small></button>`).join('')}</div>`:''}`;
}

// ── Paso 2 · Entrega ──
const opcion=(on,act,attrs,e,b,sm,cls='')=>`<button type="button" class="opcion${on?' on':''}${cls?' '+cls:''}" data-act="${act}" ${attrs}>${e?`<span class="op-e">${e}</span>`:''}<span class="t"><b>${b}</b>${sm?`<small>${sm}</small>`:''}</span><i class="op-ck" aria-hidden="true"></i></button>`;
const sucursalCorta=x=>{const k=norm(`${x?.k||''} ${x?.zona||''} ${x?.n||''}`);return k.includes('angeles')||k.includes('lasr')?'Los Ángeles':'Moravia';};
function mesaEntrega(){
  asegurarRetiro();
  const r=C.retiro,s=suc(r.suc),t=T(),env=r.entrega==='envio',u=r.ubi,a=s?asap(s):null;
  const ei=env&&u&&s?envioEstimado(s,u):null,ec=t.envioConfig||{};
  const modos=[['tienda','🛍️','Recoger en tienda','Gratis · te la tenemos lista'],...(t.envio!==false&&t.envioConfig?.activa!==false?[['envio','🛵','Envío express','Con Uber · tarifa estimada antes de pedir']]:[])];
  return cabPaso('entrega')+`<div class="titulo"><h2>¿Cómo te la entregamos?</h2></div>
  <div class="opciones" id="tlSecEntrega">${modos.map(([k,e,b,sm])=>opcion(r.entrega===k,'entrega',`data-v="${k}"`,e,b,sm)).join('')}</div>
  ${sucs().length>1?`<p class="grupo-h">${env?'¿De cuál tienda sale?':'¿En cuál tienda la recogés?'}</p><div class="opciones tiendas" id="tlSecSuc">${sucs().map(x=>opcion(r.suc===x.k,'suc',`data-k="${x.k}"`,'📍',sucursalCorta(x),`${abierta(x)?'Abierta · cierra ':'Abre a las '}<span class="nw">${esc(fhm(abierta(x)?x.cierra:x.abre))}</span>`,'sucursal-opcion')).join('')}</div>`:''}
  ${s?`<p class="suc-ok" id="tlSucOk">📍 ${env?'Sale de':'La recogés en'} <b>${esc(sucursalCorta(s))}</b></p>`:''}
  ${env?`<p class="grupo-h">¿A dónde la llevamos?</p><div class="grupo" id="tlSecUbi">${u?`<div class="g-fila col"><iframe class="ubi-mapa" title="Tu ubicación" src="${mapaEmbed(u)}" loading="lazy"></iframe><div class="ubi-ok"><span>📍 Ubicación lista${u.acc?` · ±${u.acc} m`:''}</span><button type="button" class="link" data-act="ubi-gps">Volver a tomar</button></div></div>`
      :`<div class="g-fila col"><button type="button" class="btn ghost w" id="tlUbiBtn" data-act="ubi-gps">📍 Usar mi ubicación</button><input id="tlUbiLink" class="inp" placeholder="…o pegá un link de Google Maps" autocomplete="off"></div>`}
    <label class="g-fila"><span class="g-l">Señas</span><input id="tlSenas" placeholder="Casa verde, portón negro…" value="${esc(r.senas||'')}" autocomplete="street-address"></label></div>`:''}
  ${s?`<p class="grupo-h">¿Cuándo?</p><div class="opciones" id="tlSecHora">${opcion(r.modo==='asap','cuando','data-v="asap"'+(a?'':' disabled'),'⚡','Lo antes posible',a?(env?'Sale a las ':'Lista a las ')+fh(a):'Hoy ya no da')}${opcion(r.modo==='prog','cuando','data-v="prog"','🗓️','Programar','Elegí día y hora')}</div>
    ${r.modo==='prog'?`<div class="prog"><div class="chips">${[0,1,2].map(d=>`<button type="button" class="chip${r.dia===d?' on':''}" data-act="dia" data-d="${d}">${d===0?'Hoy':d===1?'Mañana':aFecha(2,0).toLocaleDateString('es-CR',{weekday:'long',...TZ})}</button>`).join('')}</div><div class="chips">${slots(s,r.dia).map(x=>`<button type="button" class="chip${r.hora&&+new Date(r.hora)===+x?' on':''}" data-act="hora" data-h="${x.toISOString()}">${fh(x)}</button>`).join('')||'<span class="nota">Ese día ya no hay horas. Probá otro.</span>'}</div></div>`:''}`:''}`;
}
function mejorarEntrega(){
  if(C.paso!=='entrega'||C.actual||!esEnvio())return;
  const box=$('tlSecUbi'),s=suc(C.retiro.suc),u=C.retiro.ubi;if(!box)return;
  const e=s&&u?envioEstimado(s,u):null;
  const saved=C.direcciones.length?`<div class="dir-guardadas"><small>Direcciones guardadas</small>${C.direcciones.map(d=>`<button type="button" class="dir-chip${u&&Math.abs(+u.lat-d.lat)<.00001&&Math.abs(+u.lng-d.lng)<.00001?' on':''}" data-act="direccion" data-id="${esc(d.id)}">📍 ${esc(d.nombre)}</button>`).join('')}</div>`:'';
  const extra=`${saved}<div class="envio-est">${e?`🛵 Zona cubierta · estimado ${$c(e.costo)}${e.minimo?` · mínimo ${$c(e.minimo)}`:''}<small>La tienda confirma el monto final del envío antes de salir.</small>`:`${esc(T().envioConfig?.zona||'Zona de entrega por confirmar')} · ${T().envioConfig?.radioKm?`hasta ${T().envioConfig.radioKm} km`:''}`}</div>${u&&N.authEstado?.().verificado?'<button type="button" class="link" data-act="guardar-direccion">Guardar esta dirección</button>':''}`;
  box.insertAdjacentHTML('afterbegin',extra);
}
function mesaDatos(){
  sincronizarPerfilAuth();
  const P=C.perfil,a=N.authEstado?.()||{};
  return cabPaso('datos')+`<div class="titulo"><h2>Datos de contacto</h2></div>
  <p class="sub paso-sub">Los usamos solo para atender este pedido y comunicarnos si hace falta coordinar algo.</p>
  <div class="grupo datos-contacto" id="tlSecDatos">
    <label class="g-fila"><span class="g-l">Nombre</span><input id="tlDatosNom" placeholder="Tu nombre" autocomplete="name" value="${esc(P.nombre)}"></label>
    <label class="g-fila"><span class="g-l">Teléfono *</span><input id="tlDatosTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="8888-8888" maxlength="20" value="${esc(P.tel)}"></label>
    <label class="g-fila"><span class="g-l">Correo <small>opcional</small></span><input id="tlDatosCorreo" type="email" autocomplete="email" placeholder="vos@correo.com" value="${esc(P.correo||perfilCorreo())}"></label>
  </div>
  ${a.verificado?`<div class="cuenta-segura"><b>🔐 Sesión iniciada</b><small>Estos datos vienen de tu perfil y se reutilizan automáticamente. Podés revisarlos o cambiarlos aquí para este pedido.</small></div>`:`<div class="cuenta-segura"><b>🧺 Pedido como invitado</b><small>No necesitás crear una cuenta para comprar. Si querés guardar tus hojas, pedidos y datos para futuros teléfonos, iniciá sesión o creá una cuenta desde el perfil.</small><button type="button" class="btn ghost" data-act="perfil">Iniciar sesión o crear cuenta <small>(opcional)</small></button></div>`}
  <div class="estimado-box nota-general"><b>ℹ️ Total estimado</b><p>El monto mostrado es estimado. ARAMO confirmará el total definitivo después de alistar y pesar los productos.</p></div>`;
}
function mejorarPago(){
  if(C.paso!=='pago'||C.actual)return;
  const destino=$('tlFacturacion');if(!destino)return;
  if(!C.factura.correo)C.factura.correo=perfilCorreo();
  const factura=`<p class="grupo-h">Factura electrónica <small>opcional</small></p><div class="factura-box" id="tlFactura"><label class="check-line"><input type="checkbox" id="tlFacturaOn" ${C.factura.quiere?'checked':''}> Quiero factura electrónica</label>${C.factura.quiere?`<div class="factura-fields"><input id="tlCedula" placeholder="Cédula" value="${esc(C.factura.cedula)}"><input id="tlCorreo" type="email" placeholder="Correo" value="${esc(C.factura.correo)}"></div>`:''}</div>`;
  const legal=`<label class="legal-check" id="tlConsent"><input type="checkbox" id="tlConsentOn" ${C.consent?'checked':''}> Acepto el <a href="privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a> y las <a href="condiciones.html" target="_blank" rel="noopener">condiciones</a>.</label>`;
  if(!$('tlFactura'))destino.innerHTML=factura+legal;
}
function mejorarHome(){
  if(C.paso!=='armar'||C.actual)return;
  const m=$('tlMesa');if(!m||$('tlHomeExtras'))return;
  const now=Date.now(),promos=(T().promos||[]).filter(p=>p&&(!p.hasta||Date.parse(p.hasta)>=now));
  const baseFaq=[
    {q:'¿Cuánto tarda?',a:'La app muestra la primera hora disponible de la tienda y también permite programar el pedido.'},
    {q:'¿Cómo pago?',a:'Podés pagar por SINPE, efectivo, tarjeta o link cuando la tienda lo tenga habilitado.'},
    {q:'¿Dónde entregan?',a:'La app valida la zona y muestra una tarifa estimada antes de confirmar el pedido.'}
  ];
  const faq=baseFaq.map(x=>(T().faq||[]).find(f=>norm(f.q)===norm(x.q))||x);
  const install=window.__aramoInstallPrompt?'<button type="button" class="fila-link" data-act="instalar"><span class="e">📲</span><span class="t"><b>Instalar ARAMO en tu inicio</b><small>Accedé más rápido desde tu teléfono.</small></span><span class="go">›</span></button>':'';
  const wa=T().whatsapp||T().sucursales?.[0]?.whatsapp||'',waHelp=wa?`<a class="wa-btn" href="${N.wa(wa,'Hola ARAMO, necesito ayuda con un pedido')}">💬 WhatsApp de ARAMO</a>`:'<p class="nota">💬 WhatsApp de ARAMO: pendiente de configurar por la tienda.</p>';
  const ayuda=`<details class="grupo ayuda" id="tlAyuda"><summary class="grupo-h">¿Necesitás ayuda?</summary><div class="ayuda-contenido">${faq.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}${waHelp}</div></details>`;
  const help=`<section class="home-extras" id="tlHomeExtras">${promos.length?`<div class="promo-strip"><p class="grupo-h">✨ Esta semana</p>${promos.map(p=>`<article class="promo-card"><b>${esc(p.titulo||p.nombre||'Oferta')}</b><small>${esc(p.texto||'')}</small>${p.k?`<button type="button" class="link" data-act="promo" data-k="${esc(p.k)}">Ver oferta</button>`:''}</article>`).join('')}</div>`:''}${ayuda}${install?`<div class="grupo">${install}</div>`:''}<p class="legal-foot"><a href="privacidad.html" target="_blank">Privacidad</a> · <a href="condiciones.html" target="_blank">Condiciones</a></p></section>`;
  m.insertAdjacentHTML('beforeend',help);
}
function mejorarPedido(o){
  if(!o||C.actual!==o.id)return;
  const root=$('tlMesa');if(!root)return;
  let extra='';
  const fase=N.faseDe?.(o)||'';
  if(o.estado==='nuevo')extra+=`<div class="pedido-extra"><button type="button" class="btn ghost w" data-act="agregar-pedido">➕ Agregar algo a este pedido</button><small>Se suma a ${esc(o.ref)} y la tienda revisa el cambio dentro del mismo pedido.</small></div>`;
  if(fase==='confirmacion')extra+=`<div class="pedido-extra confirmacion-pedido"><p><b>🧾 La tienda ya preparó tu cotización final.</b><small>Revisá el total en la tarjeta de pago y confirmalo para que termine de alistar tu pedido.</small></p></div>`;
  if(o.estado==='entregado')extra+=`<div class="pedido-extra"><button type="button" class="btn ghost w" data-act="suscribir">🔁 Repetir este pedido cada semana</button></div>`;
  const propuestas=(o.items||[]).map((it,i)=>it.subPropuesta&&!it.subAceptada?`<div class="sust-propuesta"><b>🔁 ${esc(it.n)} no está disponible</b><p>La tienda propone <strong>${esc(it.subPropuesta.n||it.subPropuesta.nombre||'otra opción')}</strong>${it.subPropuesta.p?` · ${$c(it.subPropuesta.p)}`:''}.</p><div class="dos-b"><button type="button" class="btn" data-act="sub-accept" data-i="${i}">Aceptar cambio</button><button type="button" class="btn ghost" data-act="sub-reject" data-i="${i}">No, gracias</button></div></div>`:'').join('');
  if(propuestas)extra+=`<div class="pedido-propuestas"><p class="grupo-h">La tienda necesita tu aprobación</p>${propuestas}</div>`;
  if(o.estado==='listo'&&o.pago?.metodo==='sinpe'&&!o.comprobante)extra+=`<div class="comprobante-box"><p><b>📎 Subí el comprobante de SINPE</b><small>Al elegir el archivo se sube de forma segura para que ARAMO lo revise junto con tu pedido.</small></p><input id="tlComprobante" type="file" accept="image/*,application/pdf"></div>`;
  if(extra)root.insertAdjacentHTML('beforeend',extra);
  const fi=$('tlComprobante');if(fi)fi.addEventListener('change',async()=>{const file=fi.files?.[0];if(!file)return;try{toast('Subiendo comprobante…');await N.subirComprobante(file,o);toast('✅ Comprobante enviado');render();}catch(e){toast(e.message||'No se pudo subir');}});
}

// ── Paso 4 · Pago (con "si algo no hay") ──
function mesaPago(){
  asegurarRetiro();
  const it=disponibles(),t=T(),s=suc(C.retiro.suc),env=esEnvio(),envio=env&&s&&C.retiro.ubi?envioEstimado(s,C.retiro.ubi):null,tot=cestaTotal(),n=it.length;
  const metodos=metodosPago();
  if(!metodos.some(([k])=>k===C.pago.metodo)){C.pago.metodo='sinpe';guardar();}
  const corto=m=>m.n.replace(' al recoger','').replace('Tarjeta en línea','Link de pago');
  const L=N.lealtad(),c=cuentaActiva()&&perfilOk()?miCuenta():null,ps=L.activa&&c?L.premios.filter(p=>c.saldo>=+p.hojas&&+p.valor<=tot):[];
  const pr=premioSel(),guardado=!pr&&C.premio&&L.premios.find(p=>p.k===C.premio);
  const filas=it.map(x=>`<div class="info-item"><span class="e">${foto(x.k,x.p.e)}</span><span class="t"><b>${esc(x.p.n)}</b><small>${esc(qtxt(x.q,x.u))}</small></span></div>`).join('');
  return cabPaso('pago')+`<div class="titulo"><h2>Pago</h2></div>${avisoAgotados()}
  <details class="info-pedido" id="tlInfoPedido" ${C.infoOpen?'open':''}>
    <summary><span>📦 Información del pedido</span><b>${n} ${n===1?'producto':'productos'}</b></summary>
    <div class="info-pedido-inner"><div class="pedido-items">${filas}</div></div>
  </details>
  <p class="grupo-h">Método de pago <small>el monto final se confirma al alistar</small></p>
  <div class="opciones tres" id="tlSecPago">${metodos.map(([k,m])=>`<button type="button" class="opcion pago${C.pago.metodo===k?' on':''}" data-act="metodo" data-k="${k}"><span class="op-e">${m.e}</span><b>${esc(corto(m))}</b><i class="op-ck" aria-hidden="true"></i></button>`).join('')}</div>
  ${env?'<p class="nota-pago">🛵 El envío tiene una tarifa estimada. ARAMO confirmará el monto definitivo antes de salir.</p>':''}
  ${C.pago.metodo==='sinpe'?sinpeInfo(s):C.pago.metodo==='tarjeta'?`<p class="nota-pago">💳 Pagás con tarjeta (datáfono) al recoger en ${esc(nombreSuc(s)||'la tienda')}.</p>`:''}
  ${guardado&&c&&c.saldo>=+guardado.hojas?`<p class="nota-pago">🎁 Tu premio "${esc(guardado.n)}" se usa en pedidos desde ${$c(guardado.valor)}.</p>`:''}
  ${ps.length?`<p class="grupo-h">🍃 Usá tus hojas <small>tenés ${c.saldo}</small></p><div class="opciones" id="tlSecPremio">${[{k:'',n:'',hojas:0},...ps].map(p=>opcion((pr?.k||'')===p.k,'premio',`data-k="${p.k}"`,p.k?'🎁':'🍃',p.k?esc(p.n):'Guardarlas para después',p.k?`Usa ${p.hojas} de tus ${c.saldo} hojas`:`Seguís juntando · tenés ${c.saldo} 🍃`,'premio-op')).join('')}</div>`:''}
  ${C.pago.metodo==='efectivo'?`<div class="grupo efectivo"><div class="g-fila col"><span class="g-l">¿Con cuánto pagás?</span>${seg([0,...billetes(totalPagar())].map(v=>`<button type="button" class="${(+C.pago.conCuanto||0)===v?'on':''}" data-act="con" data-v="${v}">${v?$c(v):'Exacto'}</button>`).join(''),'chico')}</div></div>`:''}
  <p class="grupo-h">Si algo no hay</p>
  <div class="grupo"><div class="g-fila">${seg(Object.entries(SUST).map(([k,x])=>`<button type="button" class="${C.sust===k?'on':''}" data-act="sust" data-k="${k}">${{avisar:'Avisame',similar:'Algo parecido',quitar:'Quitalo'}[k]||x.n}</button>`).join(''),'chico')}</div>
    <label class="g-fila"><span class="g-l">Nota</span><input id="tlNota" placeholder="Opcional: bolsas aparte…" value="${esc(C.nota)}" autocomplete="off"></label></div>
  <div id="tlFacturacion"></div>
  <div class="resumen"><div><span>Productos</span><b>${$c(tot)}</b></div>${env?`<div><span>Envío estimado</span><b>${envio?$c(envio.costo):'elegí ubicación'}</b></div>`:''}${pr?`<div class="desc"><span>🎁 ${esc(pr.n)}</span><b>−${$c(pr.valor)}</b></div>`:''}<div class="tot"><span>Total estimado</span><b>${$c(totalPagar())}</b></div>${L.activa&&c?`<div class="gana"><span>🍃 Con este pedido ganás</span><b>~${hojasEstimadas()} ${hojasEstimadas()===1?'hoja':'hojas'}${L.dobles?' 🔥':''}</b></div>`:''}<p>El monto mostrado es estimado. ARAMO confirmará el monto definitivo después de alistar y pesar los productos.</p></div>
  <div class="estimado-box"><b>ℹ️ Total estimado</b><p>El monto definitivo se confirma después de que la tienda termine de alistar y pesar los productos. Si elegís SINPE, esperá esa confirmación antes de transferir.</p></div>`;
}
function sinpeInfo(s){
  const sp=N.sinpeDe(s?.k),num=telDig(sp.numero);
  return `<div class="sinpe-info" id="tlSinpe"><span class="si-e">📲</span><div><b>${num?'SINPE Móvil '+esc(fmtTel(num)):'SINPE Móvil'}</b><small>${num?(sp.nombre?esc(sp.nombre)+' · ':'')+esc(nombreSuc(s)):'El número aparece cuando la tienda lo configure'}</small><small>Esperá el monto definitivo que ARAMO indique al terminar de alistar y pesar. Recibir la canasta no confirma el total ni significa que debás transferir todavía.</small></div></div>`;
}
function billetes(t){
  const out=[];
  [5000,10000,20000,50000].forEach(b=>{const v=Math.ceil(t/b)*b;if(v>t&&!out.includes(v)&&out.length<3)out.push(v);});
  return out;
}

// ── Tu pedido (seguimiento en vivo) ──
const _okAntes={},_pAntes={},_eAntes={};
function mesaPedido(o){
  const s=suc(o.sucursal),{r,n}=avance(o),total=N.totalDe(o),E=o.estado,env=o.retiro.envio,fase=N.faseDe?.(o)||'enviado';
  const pendiente=N.estadoEnvio?.(o.id)==='pendiente',aprox=!['confirmacion','alistando','entregado'].includes(fase)&&N.esAprox(o),fin=E==='entregado'||E==='cancelado',est=estadoDe(o);
  const V={enviado:['Enviado','run'],recibido:['Recibido · tienda pesa','run'],confirmacion:['Confirmación pendiente','run'],alistando:[`Alistando ${r}/${n}`,'run'],entregado:['Entregado','ok']}[fase]||['Cancelado','bad'];
  const tit={enviado:'¡Pedido enviado!',recibido:'La tienda ya lo está revisando',confirmacion:'Revisá tu cotización',alistando:'Estamos alistando tu pedido',entregado:'¡Que la disfrutés!',cancelado:'Pedido cancelado'}[fase]||'Tu pedido';
  const ahora={enviado:pendiente?'Guardado en este dispositivo; la nube aún no confirmó la recepción.':'El pedido fue enviado a la tienda.',recibido:'La tienda recibió el pedido y está pesando y revisando cada producto.',confirmacion:'La tienda terminó de pesar y dejó listo el total definitivo. Confirmalo antes de pagar.',alistando:env?'Tu pedido está confirmado y va a salir con Uber cuando esté listo.':'Tu pedido está confirmado y la tienda termina de alistarlo.',entregado:'Gracias por comprar en ARAMO.',cancelado:esc(o.motivo||'El pedido no siguió.')}[fase];
  const hora=k=>{const l=(o.log||[]).find(x=>x.s===k);return l?fh(l.t):'';};
  const idx=['enviado','recibido','confirmacion','alistando','entregado'].indexOf(fase);
  // la línea de avance se llena desde donde estaba la última vez
  const fr={enviado:.06,recibido:.28,confirmacion:.52,alistando:.76,entregado:1}[fase]??0,p0=_pAntes[o.id]??0;_pAntes[o.id]=fr;
  const cambio=!!_eAntes[o.id]&&_eAntes[o.id]!==E;_eAntes[o.id]=E;
  const pasos=E==='cancelado'?'':`<ol class="pasos4 pasos5" style="--p0:${p0.toFixed(3)};--p:${fr.toFixed(3)}">${[['Enviado',hora('enviado')|| (o.created?fh(o.created):'')],['Recibido · tienda',hora('recibido')],['Confirmación',hora('confirmacion')],['Alistando',hora('alistando')],['Entregado',hora('entregado')]].map(([tt,h],i)=>`<li class="${i<idx||(i===idx&&fase==='entregado')?'si':i===idx?'ya':''}"><i></i>${tt}<small>${esc(h||'')}</small></li>`).join('')}</ol>`;
  const antes=_okAntes[o.id],ahoraOk=new Set();let dif=0;
  const items=o.items.map((i,j)=>{
    const real=i.qr!=null&&i.qr!=='',q=real?+i.qr:+i.q,pr=i.pr!=null&&i.pr!==''?+i.pr:+i.p;
    const st=i.estado==='listo'?'ok':i.estado==='nohay'?'no':E==='alistando'?'wait':'';
    if(st==='ok')ahoraOk.add(j);
    if(i.estado!=='nohay')dif+=(q-i.q)*pr;else dif-=i.q*pr;
    const pesoDistinto=real&&i.u==='kg'&&Math.abs(q-i.q)>1e-9,pide=i.pide?qtxt(i.pide.q,i.pide.u):qtxt(i.q,i.u);
    const det=i.estado==='nohay'?'no hubo':real&&(pesoDistinto||i.pide)?`pediste ${pide} → ${i.u==='kg'?'pesó '+kg(q)+' kg':'son '+qtxt(q,i.u)}`:i.pide?`${pide} · ≈ ${qtxt(i.q,i.u)}`:qtxt(q,i.u);
    return `<div class="it ${st}${st==='ok'&&antes&&!antes.has(j)?' recien':''}"><span class="e">${foto(i.k,i.e)}</span><span class="t"><b>${esc(i.n)}</b><small>${esc(det)}</small></span><span class="pz">${i.estado==='nohay'?'₡0':$c(q*pr)}</span><span class="ck" aria-hidden="true">${st==='ok'?'✓':st==='no'?'✕':''}</span></div>`;
  }).join('');
  _okAntes[o.id]=ahoraOk;
  const costoEnvio=+env?.costo||0,pesado=['listo','entregado'].includes(E)||o.items.some(i=>i.qr!=null&&i.qr!=='');
  const acc=[
    s&&!env&&!fin?fila('🗺️','Cómo llegar',esc(s.n),'mapa'):'',
    fila('💬','Escribir a la tienda','Por WhatsApp','wa-tienda'),
    E==='alistando'&&N.modo()==='nube'?fila('🔄','Revisar estado','','actualizar-pedido'):'',
    !fin&&N.avisos.soportado()&&N.avisos.permiso()==='default'?fila('🔔','Avisarme cuando esté lista','Notificación en el teléfono','avisame'):'',
    E==='nuevo'?`<button type="button" class="fila-link rojo" data-act="cancelar"><span class="e">✖️</span><span class="t"><b>Cancelar pedido</b></span></button>`:'',
  ].join('');
  return titulo(tit,{volver:'armar',volverTxt:'Volver a la tienda',verdict:V[0],cls:V[1]})
  +`<div class="estado tracker est-${E}${cambio?' cambio':''}"><div class="es-ico"><span>${est.e}</span></div><p class="es-ref">Pedido ${esc(o.ref)}</p><p class="es-t">${ahora}</p>${pasos}</div>${comprobantePedido(o,total,aprox,s)}
  ${E==='nuevo'&&!pendiente?`<div class="aviso"><b>✅ Pedido enviado a ARAMO</b><p>La tienda ya lo puede ver en el Mostrador. El siguiente paso será <strong>Recibido por la tienda</strong>.</p></div>`:''}
  ${E==='nuevo'&&pendiente?`<div class="aviso"><b>⚠️ La nube aún no confirmó el envío</b><p>El pedido está protegido en este dispositivo y se reintentará. No se muestra como enviado hasta que Supabase confirme la recepción.</p></div>`:''}
  ${!fin?`<div class="sello" id="tlStep6"><div class="qr" id="tlQR" aria-label="Código QR de retiro"></div><div><small>Código de retiro</small><div class="pin">${esc(o.pin)}</div><small>${env?'Dáselo al repartidor si te lo pide':'Mostralo al recoger en '+esc(nombreSuc(s))}${o.retiro.carro?' · te la llevamos al carro':''}</small></div></div>`:''}
  ${pagoHtml(o,total,aprox)}
  ${env&&!fin?`<div class="card2"><h3>🛵 Envío con Uber</h3><p>${env.uber?`Pedido a las ${esc(fh(env.uber))} · va en camino.`:'Lo pedimos apenas tu canasta esté lista.'}${costoEnvio?` Envío: ${$c(costoEnvio)} (incluido).`:''}</p></div>`:''}
  ${E!=='cancelado'?`<p class="grupo-h">Tu canasta${E==='alistando'?` <small>${r} de ${n} listos</small>`:''}</p>
  <div class="grupo items">${items}${costoEnvio?`<div class="it"><span class="e">🛵</span><span class="t"><b>Envío Uber</b></span><span class="pz">${$c(costoEnvio)}</span><span class="ck"></span></div>`:''}${pesado&&Math.abs(dif)>=1?`<div class="it ajuste"><span class="e">⚖️</span><span class="t"><b>Ajuste por peso real</b></span><span class="pz">${dif>0?'+':'−'}${$c(Math.abs(dif))}</span><span class="ck"></span></div>`:''}${o.premio?`<div class="it premio"><span class="e">🎁</span><span class="t"><b>Premio con hojas</b><small>${+o.premio.hojas} 🍃</small></span><span class="pz">−${$c(o.premio.valor)}</span><span class="ck"></span></div>`:''}<div class="it total"><span class="e"></span><span class="t"><b>${aprox?'Total estimado':'Total definitivo'}</b></span><span class="pz">${$c(total)}</span><span class="ck"></span></div></div><p class="pedido-estimado">${aprox?'El monto mostrado es estimado. ARAMO confirma el total definitivo cuando termina de alistar y pesar los productos.':'Total definitivo confirmado por ARAMO.'}</p>`:''}
  ${E==='entregado'&&N.hojasDe(o)?`<div class="ganaste"><span>🍃</span><div><b>+${N.hojasDe(o)} hojas</b><small>Ganaste con este pedido · <button type="button" class="link" data-act="perfil">ver mi perfil</button></small></div></div>`:''}
  ${E==='entregado'?`<div class="card2 centro"><h3>¿Qué tal estuvo todo?</h3><div class="caritas">${['😍','🙂','😐'].map((c,i)=>`<button type="button" class="${o.rating===3-i?'on':''}" data-act="rating" data-v="${3-i}" aria-label="Calificar ${3-i}">${c}</button>`).join('')}</div><button type="button" class="btn w" style="margin-top:12px" data-act="repetir" data-id="${o.id}">🔁 Pedir lo mismo otra vez</button></div>`:''}
  <div class="grupo acciones-l">${acc}</div>
  <button type="button" class="btn w big ${fin?'':'ghost'} seguir" data-act="nuevo">🛒 Seguir comprando</button>`;
}
function pagoHtml(o,total,aprox){
  const t=T(),m=o.pago||{},M=N.PAGOS[m.metodo]||N.PAGOS.efectivo;
  if(o.estado==='cancelado')return '';
  if(N.faseDe?.(o)==='confirmacion')return `<div class="card2 w"><h3>🧾 Confirmá tu cotización</h3><div class="monto">${$c(total)}</div><p>Este es el monto definitivo después de alistar y pesar tu pedido. Todavía no transfirás ni se cobra: primero confirmá que estás de acuerdo.</p><button type="button" class="btn w" data-act="confirmar-cotizacion">✅ Confirmar y continuar</button></div>`;
  if(m.estado==='verificado')return `<div class="card2"><h3>✅ Pago confirmado</h3><p>${M.n} · ${$c(total)}</p></div>`;
  if(m.metodo==='sinpe'){
    if(m.estado==='reportado')return `<div class="card2"><h3>📲 Pago reportado</h3><p>Le avisaste a la tienda que pagaste ${$c(total)}. El pago y el total todavía deben ser confirmados por ARAMO.</p></div>`;
    if(o.estado==='listo'){
      const sp=N.sinpeDe(o.sucursal),num=telDig(sp.numero);
      return `<div class="card2 w"><h3>📲 Pagá por SINPE Móvil</h3><div class="monto">${$c(total)}</div>
        <p class="pedido-estimado"><b>Total definitivo confirmado por ARAMO.</b> Este es el monto que la tienda calculó después de alistar y pesar.</p>
        ${num?`<div class="copia"><div><small>Número</small>${esc(fmtTel(num))}${sp.nombre?` · ${esc(sp.nombre)}`:''}</div><button type="button" data-act="copiar" data-v="${num}">Copiar</button></div>`:'<p>El número SINPE todavía está pendiente de configurar por la tienda.</p>'}
        <div class="copia"><div><small>Monto</small>${$c(total)}</div><button type="button" data-act="copiar" data-v="${Math.round(total)}">Copiar</button></div>
        <div class="copia"><div><small>Descripción</small>${esc(o.ref)}</div><button type="button" data-act="copiar" data-v="${esc(o.ref)}">Copiar</button></div>
        <div class="dos-b" style="margin-top:12px"><button type="button" class="btn" data-act="ya-pague">Ya pagué</button></div><p>Después de transferir, adjuntá el comprobante abajo para que ARAMO lo revise.</p></div>`;
    }
    return `<div class="card2"><h3>📲 SINPE Móvil</h3><p>Esperá aquí el monto definitivo de ARAMO, calculado después de alistar y pesar. Todavía no transfirás: recibir la canasta no confirma el total.</p></div>`;
  }
  if(m.metodo==='link'&&o.estado==='listo'&&t.linkTarjeta)
    return `<div class="card2 w"><h3>🔗 Pagá con tarjeta</h3><div class="monto">${$c(total)}</div><button type="button" class="btn w" data-act="link-pago">Abrir pago seguro</button><p class="centro" style="margin-top:8px"><button type="button" class="link" data-act="ya-pague">Ya pagué</button></p></div>`;
  const vuelto=m.metodo==='efectivo'&&+m.conCuanto>total?` Llevás ${$c(m.conCuanto)}: tu vuelto es ${$c(+m.conCuanto-total)}.`:'';
  return `<div class="card2"><h3>${M.e} ${M.n}</h3><p>${aprox?'Total aproximado':'Total'} ${$c(total)}.${vuelto}</p></div>`;
}
function comprobantePedido(o,total,aprox,s){
  const P=N.PAGOS[o.pago?.metodo]||{},r=o.retiro||{},modalidad=r.envio?'Envío express':`Retiro en ${s?.n||'ARAMO'}`;
  return `<details class="card2 comprobante-pedido"><summary><b>🧾 Comprobante del pedido</b><span>Ver detalle</span></summary><div class="comprobante-grid"><div><small>Pedido</small><b>${esc(o.ref)}</b></div><div><small>Sucursal</small><b>${esc(s?.n||'ARAMO')}</b></div><div><small>Entrega</small><b>${esc(modalidad)}</b></div><div><small>Horario</small><b>${esc(cuando(r.at))}</b></div><div><small>Cliente</small><b>${esc(o.cliente?.nombre||'')}</b><small>${esc(fmtTel(o.cliente?.tel||''))}</small></div><div><small>Pago</small><b>${P.e||''} ${esc(P.n||'')}</b></div></div><p class="pedido-estimado">${aprox?'Total estimado':'Total definitivo'}: <strong>${$c(total)}</strong>. ${aprox?'La tienda lo confirma después de alistar y pesar.':'La tienda ya confirmó el monto definitivo.'}</p></details>`;
}

// ══════════════ Pintar ══════════════
function pintarChips(){
  const v=$('tlVivo');if(!v)return;
  const en=N.modo()==='nube';v.classList.toggle('on',en);v.title=en?'Tienda en vivo':'Esperando conexión con la tienda';
}
function actualizarMeta(){
  const t=T(),title=t.shareTitle||'Pedí frutas y verduras en ARAMO',desc=t.shareDescription||'Armá tu canasta, elegí tienda y recibila lista.';
  document.title=title;document.querySelector('meta[name="description"]')?.setAttribute('content',desc);document.querySelector('meta[property="og:title"]')?.setAttribute('content',title);document.querySelector('meta[property="og:description"]')?.setAttribute('content',desc);if(t.shareImage)document.querySelector('meta[property="og:image"]')?.setAttribute('content',t.shareImage);
}
// Las pantallas entran deslizándose (adelante desde la derecha, atrás desde la izquierda).
// --t mantiene la fase de las animaciones continuas aunque la pantalla se vuelva a pintar.
const VISTA_POS={armar:0,canasta:1,entrega:2,datos:3,pago:4,pedido:5};
let _pos=-1,_mt=0;
function vistaActual(){return C.actual?'pedido':C.paso==='armar'?'armar':!cestaN()?'canasta':C.paso;}
function pintarMesa(anim){
  const m=$('tlMesa'),o=pedidoVisto(),vista=vistaActual(),pos=VISTA_POS[vista]??0;
  if(vista==='armar'||vista==='pedido')_p3=0;
  m.style.setProperty('--t',-(performance.now()/1000%60).toFixed(3)+'s');
  // Un repintado por datos nuevos (sin animación) no repite la entrada: si no, todo se apaga y vuelve.
  if(!anim){clearTimeout(_mt);m.classList.remove('adelante','atras','fade');}
  m.innerHTML=C.actual&&!o?titulo('No encontramos ese pedido en este teléfono',{volver:'armar',volverTxt:'Volver a la tienda'})
    :o?mesaPedido(o):vista==='canasta'?mesaCanasta():vista==='entrega'?mesaEntrega():vista==='datos'?mesaDatos():vista==='pago'?mesaPago():mesaArmar();
  mejorarEntrega();
  mejorarPago();
  mejorarHome();
  mejorarPedido(o);
  document.body.dataset.pantalla=vista;
  if(anim&&!MINI){
    const dir=_pos<0||pos===_pos?'fade':pos>_pos?'adelante':'atras';
    m.classList.remove('adelante','atras','fade');void m.offsetWidth;m.classList.add(dir);
    clearTimeout(_mt);_mt=setTimeout(()=>m.classList.remove(dir),900);
  }
  _pos=pos;
  if(vista==='armar')pintarGrid();
  if(vista==='canasta'&&cestaN()){contar($('tlHeroTot'),_totHero,cestaTotal());_totHero=cestaTotal();}
  if(o)pintarQR(o);
  C.pulso=false;C.ultimo=null;C.toque=null;
}
function pintarBit(){
  sincronizarPerfilAuth();
  $('tlBitN').hidden=true; // el único contador es el de la canasta; los pedidos se ven en el perfil
  const ri=$('tlReini');if(ri)ri.hidden=MINI||!cestaN()||!!C.actual;
  const av=$('tlAvatar');if(av){const nom=perfilNombre(),ok=!!N.authEstado?.().verificado&&perfilOk();av.className=ok?'av-ini n-'+miCuenta().nivel.k:'';av.innerHTML=ok?esc(nom[0].toUpperCase()):PERSONA;}
  if(H?.tipo==='perfil'||H?.tipo==='pedidos')pintarHoja();
}
// Abajo, un solo botón: "Ver canasta" mientras comprás, "Continuar" en cada paso y "Hacer pedido" al final.
function pintarBar(){
  const bar=$('tlBar'),inn=$('tlBarIn'),n=cestaN(),o=pedidoVisto();
  let h='';
  if(!o&&!C.actual&&n&&!MINI){
    const P=C.paso,it=cestaItems();
    const ico=`<span class="tk-ico" id="tlTk">${it.slice(-3).map(x=>`<i>${foto(x.k,x.p.e)}</i>`).join('')}<em>${n}</em></span><span class="tk-t"><small>${P==='armar'?(n===1?'1 producto':n+' productos'):'Total estimado'}</small><strong id="tlTot">${$c(_totBar)}</strong></span>`;
    const tk=P==='armar'?`<button type="button" class="tk" data-act="siguiente" aria-label="Ver mi canasta">${ico}</button>`
      :P==='canasta'?`<div class="tk">${ico}</div>`:`<button type="button" class="tk" data-act="ir" data-p="canasta" aria-label="Ver mi canasta">${ico}</button>`;
    const btn=P==='pago'?`<button type="button" class="btn${faltaAlgo()?' apagado':''}" data-act="pedir" id="tlSellar">Hacer pedido</button>`
      :`<button type="button" class="btn" data-act="siguiente">${P==='armar'?'Ver canasta':'Continuar'} <b aria-hidden="true">→</b></button>`;
    h=tk+btn;
  }
  bar.classList.toggle('hide',!h);
  if(h){const tb=C.paso==='pago'?totalPagar():cestaTotal();inn.innerHTML=h;contar($('tlTot'),_totBar,tb);_totBar=tb;}
}
// Los números suben o bajan contando, en vez de saltar.
let _totBar=0;const _raf={};
function contar(el,de,a,fmt=$c){
  if(!el)return;cancelAnimationFrame(_raf[el.id]);
  if(de===a||MINI||matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=fmt(a);return;}
  const t0=performance.now(),d=de===0?900:480;
  const paso=t=>{const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);el.textContent=fmt(Math.round(de+(a-de)*e));if(k<1)_raf[el.id]=requestAnimationFrame(paso);};
  _raf[el.id]=requestAnimationFrame(paso);
}
// El buscador se "pega" arriba con fondo de vidrio al bajar; cuando las categorías
// quedan atrás, aparece debajo la fila compacta con todas.
function pegar(){
  const b=$('tlBuscar');if(!b)return;
  const r=b.getBoundingClientRect(),c=$('tlPasillos');
  b.classList.toggle('pegado',r.top<1);
  b.classList.toggle('mini',!!c&&!c.hidden&&c.getBoundingClientRect().bottom<r.bottom+2);
}
window.addEventListener('scroll',pegar,{passive:true});
function pintarQR(o){
  const el=$('tlQR');if(!el)return;
  if(!window.qrcode){el.innerHTML='<div style="display:grid;place-items:center;height:100%;font-size:40px">🧺</div>';return;}
  const q=window.qrcode(0,'M');q.addData('ARAMO:'+o.ref+':'+o.pin);q.make();
  el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});
}
function render(anim){
  const y=window.scrollY,fa=document.activeElement,foco=fa&&fa.id&&fa.matches('input,textarea')?{id:fa.id,s:fa.selectionStart,e:fa.selectionEnd}:null;
  pintarChips();pintarMesa(anim);pintarBit();pintarBar();ligar();
  if(!anim)window.scrollTo(0,y);
  pegar();
  if(foco){const el=$(foco.id);if(el){el.focus({preventScroll:true});try{el.setSelectionRange(foco.s,foco.e);}catch{}}}
}

// ══════════════ Hojas (producto, receta y mis pedidos) ══════════════
let H=null;
function abrirHoja(h){
  const ya=!!H;H=h;pintarHoja();
  $('tlSheet').classList.add('open');$('tlSheetBg').classList.add('open');$('tlSheet').scrollTop=0;
  if(!MINI&&!ya)history.pushState({paso:C.paso,id:C.actual,hoja:1},'',location.pathname+location.search);
}
function cerrarHoja(desdeHist){
  if(!H)return;H=null;
  $('tlSheet').classList.remove('open');$('tlSheetBg').classList.remove('open');
  if(!desdeHist&&!MINI)history.back();
}
const CERRAR='<div class="sheet-grip"></div><button type="button" class="sheet-x" data-act="h-x" aria-label="Cerrar">✕</button>';
function pintarHoja(){
  const el=$('tlSheet');if(!H)return;
  if(H.tipo==='prod'){
    const p=prod(H.k),en=!!C.cesta[H.k],us=unidadesDe(p),u=unidadDe(p,H.u);
    el.innerHTML=`${CERRAR}
      <div class="ficha c-${esc(p.c||'')}"><span class="ficha-e${FOTOS[p.k]?' con-foto':''}">${foto(p.k,p.e)}</span><h2>${esc(p.n)}</h2><p class="sub">${p.d?esc(p.d)+' · ':''}${porU(p)}</p></div>
      ${us.length>1?`<p class="grupo-h">¿Cómo lo querés?</p>${seg(us.map(x=>`<button type="button" class="${u===x?'on':''}" data-act="h-u" data-v="${x}">${x==='kg'?'⚖️ Por kilo':'🔢 Por unidad'}</button>`).join(''),'unid-sel')}`:''}
      <p class="grupo-h">¿Cuánto? <small>escribí el número</small></p>
      <div class="big-step"><button type="button" data-act="h-menos" aria-label="Menos">−</button><label class="cant"><input id="tlHQ" type="text" inputmode="${u==='kg'?'decimal':'numeric'}" enterkeyhint="done" autocomplete="off" maxlength="6" value="${esc(numTxt(H.q))}" aria-label="Cantidad"><small id="tlHU"></small></label><button type="button" data-act="h-mas" aria-label="Más">+</button></div>
      <p class="conv" id="tlHConv"></p>
      ${p.mad?`<p class="grupo-h">¿Para cuándo?</p>${seg(Object.entries(MAD).map(([k,n])=>`<button type="button" class="${H.mad===k?'on':''}" data-act="h-mad" data-v="${k}">${n}</button>`).join(''),'chico')}`:''}
      <input class="inp" id="tlHNota" placeholder="Nota (opcional): grandes, bien rojos…" value="${esc(H.nota)}" autocomplete="off">
      <div class="hoja-a">${en?`<button type="button" class="btn ghost rojo" data-act="h-quitar">Quitar</button>`:''}<button type="button" class="btn" data-act="h-ok" id="tlHOk"></button></div>`;
    refrescarProd();
    const qi=$('tlHQ');
    qi.addEventListener('focus',()=>setTimeout(()=>qi.select(),0));
    qi.addEventListener('input',()=>{H.q=+qi.value.replace(',','.').replace(/[^\d.]/g,'')||0;refrescarProd();});
    qi.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();qi.blur();ACT['h-ok']($('tlHOk'));}});
    $('tlHNota').addEventListener('input',e=>{H.nota=e.target.value;});
  }else if(H.tipo==='receta'){
    const r=RECETAS().find(x=>x.k===H.k),L=ingredientes(r,H.personas,H.off),tot=N.redondear5(L.filter(x=>x.on).reduce((t,x)=>t+x.q*x.p.p,0));
    el.innerHTML=`${CERRAR}
      <div class="ficha rc-${esc(r.c||'')}"><span class="ficha-e">${r.e}</span><h2>${esc(r.n)}</h2><p class="sub">${esc(r.desc||'')}</p></div>
      <p class="grupo-h">¿Para cuántas personas? <small>${H.personas}</small></p>
      <div class="gente">${[1,2,3,4,5,6,7,8].map(i=>`<button type="button" class="${i<=H.personas?'on':''}${i===H.personas?' ult':''}" data-act="h-per" data-v="${i}" aria-label="${i} ${i===1?'persona':'personas'}">🧑<small>${i}</small></button>`).join('')}</div>
      <p class="grupo-h">Ingredientes <small>tocá para quitar</small></p>
      <div class="grupo">${L.map(x=>`<button type="button" class="ing${x.on?' on':''}" data-act="h-ing" data-k="${x.p.k}" ${x.p.agotado?'disabled':''}><span class="ck">${x.on?'✓':''}</span><span class="e">${foto(x.p.k,x.p.e)}</span><span class="t"><b>${esc(x.p.n)}</b><small>${x.p.agotado?'Agotado hoy':esc(qtxt(x.q,x.p.u))}</small></span><span class="pz">${$c(x.q*x.p.p)}</span></button>`).join('')}</div>
      <button type="button" class="btn big w hoja-b" data-act="h-receta" ${L.some(x=>x.on)?'':'disabled'}>Agregar a mi canasta · ${$c(tot)}</button>`;
  }else if(H.tipo==='perfil'||H.tipo==='pedidos'){
    el.innerHTML=hojaPerfil();
    ligarPerfil();
    if(cuentaActiva()&&perfilOk()&&!H.editar){const c=miCuenta();contar($('tlHojas'),_hojasVis,c.saldo,String);_hojasVis=c.saldo;}
  }
}
// ══════════════ Mi perfil: hojas 🍃, nivel y consumo ══════════════
const miCuenta=()=>N.cuentaCliente(misPedidos());
const mesTxt=d=>new Date(d).toLocaleDateString('es-CR',{month:'long',year:'numeric'});
// El premio apartado se aplica si alcanzan las hojas y el pedido es al menos del valor del descuento
function cuentaActiva(){return!!N.authEstado?.().verificado;}
function premioSel(){const L=N.lealtad();if(!C.premio||!L.activa||!cuentaActiva()||!perfilOk())return null;const p=L.premios.find(x=>x.k===C.premio);return p&&miCuenta().saldo>=+p.hojas&&+p.valor<=cestaTotal()?p:null;}
function costoEnvioActual(){const s=suc(C.retiro.suc);return esEnvio()&&s&&C.retiro.ubi?envioEstimado(s,C.retiro.ubi).costo:0;}
const totalPagar=()=>Math.max(0,cestaTotal()-(+premioSel()?.valor||0)+costoEnvioActual());
function hojasEstimadas(){const L=N.lealtad();return L.activa&&cuentaActiva()?Math.floor(totalPagar()/L.porHoja)*(L.dobles?2:1):0;}
// A domicilio solo se paga por SINPE Móvil (o con el link de pago, si la tienda lo tiene)
function metodosPago(){const t=T(),env=esEnvio();return Object.entries(N.PAGOS).filter(([k])=>(k!=='link'||t.linkTarjeta)&&(!env||k==='sinpe'||k==='link'));}
const PERSONA='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
let _hojasVis=0;
function filaPedido(o){
  const cls={nuevo:'run',alistando:'run',listo:'ok',entregado:'ok',cancelado:'bad'},nom={nuevo:'Recibido',alistando:'Alistando',listo:'Lista',entregado:'Entregado',cancelado:'Cancelado'};
  return `<button type="button" class="bit-r" data-act="ver" data-id="${o.id}"><span class="e pila">${(o.items||[]).slice(0,3).map(i=>`<i>${foto(i.k,i.e)}</i>`).join('')}</span><span class="t"><b>${esc(o.ref)} · ${$c(N.totalDe(o))}</b><small>${esc(fdia(o.created).replace(/^(\w)/,c=>c.toUpperCase()))} · ${esc(fh(o.created))}</small></span><span class="s ${cls[o.estado]||''}">${nom[o.estado]||o.estado}</span></button>`;
}
function cuentaPerfilHtml(){
  const a=N.authEstado?.()||{},email=perfilCorreo(),pendiente=!!a.user&&!a.verificado;
  if(!a.disponible)return `<div class="cuenta-segura perfil-cuenta"><b>📱 Cuenta temporal</b><small>La conexión para iniciar sesión todavía no está disponible. Podés continuar como invitado y hacer el pedido con tus datos de contacto.</small></div>`;
  if(a.verificado)return `<div class="cuenta-segura perfil-cuenta"><b>🔐 Cuenta activa</b><small>${esc(email||'Correo asociado')} · tu historial y tus hojas están asociados a tu cuenta.</small><button type="button" class="btn ghost" data-act="perfil-salir">Cerrar sesión</button></div>`;
  return `<div class="cuenta-segura perfil-cuenta" id="tlCuentaPerfil"><b>${pendiente?'📧 Confirmá tu correo':'🔐 Iniciar sesión'}</b><small>${pendiente?'Revisá tu correo para confirmar la cuenta. Después iniciá sesión aquí para mantenerla abierta.':'Iniciá sesión para ver tus hojas, compras, pedidos, consumo, premios y datos. Si todavía no tenés cuenta, podés crearla con estos mismos datos.'}</small><label class="g-fila"><span class="g-l">Nombre <small>para crear cuenta</small></span><input id="tlPNom" autocomplete="name" placeholder="Tu nombre" value="${esc(C.perfil.nombre)}"></label><label class="g-fila"><span class="g-l">Teléfono <small>para crear cuenta</small></span><input id="tlPTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="8888-8888" value="${esc(C.perfil.tel)}"></label><label class="g-fila"><span class="g-l">Correo</span><input id="tlPEmail" type="email" autocomplete="email" placeholder="vos@correo.com" value="${esc(email)}"></label><label class="g-fila"><span class="g-l">Contraseña</span><input id="tlPPass" type="password" autocomplete="current-password" placeholder="Mínimo 8 caracteres"></label><div class="auth-line"><button type="button" class="btn" data-act="perfil-cuenta-entrar">Iniciar sesión</button><button type="button" class="btn ghost" data-act="perfil-cuenta-crear">Crear cuenta</button></div><button type="button" class="link" data-act="perfil-recuperar">Olvidé mi contraseña</button></div>`;
}
function ligarPerfil(){
  const on=(id,fn)=>{const el=$(id);if(el)el.addEventListener('input',()=>fn(el.value));};
  on('tlPNom',v=>{C.perfil.nombre=v;guardar();});
  on('tlPTel',v=>{C.perfil.tel=v;guardar();});
  on('tlPEmail',v=>{C.authEmail=v;C.perfil.correo=v;guardar();});
  on('tlPPass',v=>{C.authPassword=v;});
}
function hojaAcceso(){
  return `${CERRAR}<div class="perfil-acceso"><span class="pf-ico" aria-hidden="true">🔐</span><h2>Iniciar sesión</h2><p>Entrá para ver tus hojas 🍃, compras, pedidos, consumo, premios, pedidos anteriores y tus datos.</p>${cuentaPerfilHtml()}<div class="cuenta-segura invitado-aviso"><b>¿Querés comprar sin cuenta?</b><small>También podés continuar como invitado. En el pedido solo te pediremos el nombre y el teléfono necesarios para atenderte.</small></div></div>`;
}
function hojaPerfil(){
  sincronizarPerfilAuth();
  const P=C.perfil,L=N.lealtad(),a=N.authEstado?.()||{},email=perfilCorreo(),dark=temaActual()==='dark',ped=misPedidos();
  if(!a.verificado)return hojaAcceso();
  const lista=ped.length?`<div class="grupo">${ped.slice(0,20).map(filaPedido).join('')}</div>`:'<p class="vacio"><b>🧺</b>Todavía no tenés pedidos. Los que hagás aparecen aquí con su estado.</p>';
  const extras=`<div class="grupo" style="margin-top:14px">${perfilOk()&&!H.editar?`<button type="button" class="fila-link" data-act="perfil-editar"><span class="e">✏️</span><span class="t"><b>Cambiar mis datos</b><small>${esc(P.nombre)} · ${esc(fmtTel(P.tel))}</small></span><span class="go" aria-hidden="true">›</span></button>`:''}<button type="button" class="fila-link" data-act="tema"><span class="e">${dark?'☀️':'🌙'}</span><span class="t"><b>${dark?'Usar tema claro':'Usar tema oscuro'}</b></span></button></div>`;
  if(!perfilOk()||H.editar){
    const cuenta=a.verificado?`<div class="cuenta-segura perfil-cuenta"><b>🔐 Cuenta activa</b><small>${esc(email||'Correo asociado')}</small></div>`:a.disponible?`<div class="grupo"><label class="g-fila"><span class="g-l">Correo</span><input id="tlPEmail" type="email" autocomplete="email" placeholder="vos@correo.com" value="${esc(email)}"></label><label class="g-fila"><span class="g-l">Contraseña</span><input id="tlPPass" type="password" autocomplete="current-password" placeholder="Mínimo 8 caracteres"></label><small class="nota">La contraseña solo se usa para crear o iniciar sesión; no se muestra ni se guarda en este teléfono.</small></div>`:'<p class="nota">Podés crear el perfil en este teléfono. La cuenta con correo aparecerá aquí cuando la nube esté disponible.</p>';
    const accion=a.disponible&&!a.verificado?(H.editar?'Guardar y proteger cuenta':'Crear perfil y cuenta'):(H.editar?'Guardar mis datos':'Crear mi perfil');
    return `${CERRAR}<div class="pf-nuevo">
      <span class="pf-ico" aria-hidden="true">🍃</span>
      <h2>${H.editar?'Tus datos':'Creá tu perfil ARAMO'}</h2>
      <p>${H.editar?'Así te reconocemos en la tienda y te avisamos de tu pedido.':'Ganá <b>hojas 🍃</b> con cada compra, subí de nivel y canjealas por descuentos.'}</p>
      ${H.editar?'':`<div class="pf-pasos"><span>🛒<small>Comprás</small></span><i>→</i><span>🍃<small>Ganás hojas</small></span><i>→</i><span>🎁<small>Canjeás</small></span></div>`}
      <div class="grupo"><label class="g-fila"><span class="g-l">Nombre</span><input id="tlPNom" placeholder="Tu nombre" autocomplete="given-name" value="${esc(P.nombre)}"></label><label class="g-fila"><span class="g-l">Teléfono</span><input id="tlPTel" placeholder="8888-8888" inputmode="tel" autocomplete="tel" maxlength="20" value="${esc(P.tel)}"></label></div>
      ${cuenta}
      <button type="button" class="btn big w" data-act="perfil-crear">${accion}</button>
      ${H.editar?'<button type="button" class="btn ghost w" style="margin-top:8px" data-act="perfil-cancelar">Cancelar</button>':''}</div>
    ${ped.length?`<p class="grupo-h">Mis pedidos</p>${lista}`:''}${extras}`;
  }
  const c=miCuenta(),desde=P.desde||c.desde||new Date().toISOString(),fin=o=>['entregado','cancelado'].includes(o.estado);
  const activos=ped.filter(o=>!fin(o)),previos=ped.filter(fin);
  const hoy=new Date(),meses=[...Array(6)].map((_,i)=>{const d=new Date(hoy.getFullYear(),hoy.getMonth()-5+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return{k,n:d.toLocaleDateString('es-CR',{month:'short'}).replace('.',''),v:c.meses[k]||0};});
  const max=Math.max(1,...meses.map(m=>m.v));
  return `${CERRAR}
  <div class="socio n-${c.nivel.k}"><i class="so-brillo" aria-hidden="true"></i>
    <div class="so-top"><span class="so-marca">ARAMO<small>socio</small></span><span class="so-nivel">${c.nivel.e} ${c.nivel.n}</span></div>
    <div class="so-hojas"><b id="tlHojas">${_hojasVis}</b><span>hojas 🍃</span></div>
    <div class="so-bar"><i style="--a:${c.avance.toFixed(3)}"></i></div>
     <p class="so-sig">${c.sig?`Te faltan <b>${c.falta} 🍃</b> para ${c.sig.e} ${c.sig.n}`:'¡Llegaste al nivel más alto! 👑'}</p>
     <div class="so-pie"><span>${esc(perfilNombre())}</span><span>Socio desde ${esc(mesTxt(desde))}</span></div></div>
  ${cuentaPerfilHtml()}
  ${L.activa&&L.dobles?'<div class="dobles">🔥 <b>Hojas dobles</b> · cada pedido vale el doble</div>':''}
  ${c.pendientes?`<p class="en-camino">🍃 +${c.pendientes} hojas en camino · se suman cuando recibás tu pedido</p>`:''}
  ${activos.length?`<p class="grupo-h">Tu pedido en curso</p><div class="grupo en-curso">${activos.map(filaPedido).join('')}</div>`:''}
  <div class="stats"><div><b>${$c(c.gastado)}</b><span>Comprado</span></div><div><b>${c.pedidos}</b><span>${c.pedidos===1?'Pedido':'Pedidos'}</span></div><div><b>${c.kilos?kg(c.kilos)+' kg':'—'}</b><span>De frescura</span></div>${c.ahorro?`<div><b>${$c(c.ahorro)}</b><span>Ahorrado</span></div>`:''}</div>
  <p class="grupo-h">Tu consumo <small>últimos 6 meses</small></p>
  <div class="grafico">${meses.map((m,i)=>`<div class="gb${i===5?' hoy':''}"><em>${m.v?$c(m.v).replace('₡',''):''}</em><i style="--h:${(m.v/max).toFixed(3)};--d:${i}"></i><small>${esc(m.n)}</small></div>`).join('')}</div>
  ${c.top.length?`<p class="grupo-h">Lo que más llevás</p><div class="top">${c.top.slice(0,4).map((t,i)=>`<div class="tp" style="--i:${i}"><span class="tp-f">${foto(t.k,t.e)}</span><b>${esc(t.n)}</b><small>${t.veces} ${t.veces===1?'vez':'veces'}</small></div>`).join('')}</div>`:''}
  ${L.activa&&L.premios.length?`<p class="grupo-h">Tus premios <small>1 🍃 por cada ${$c(L.porHoja)}</small></p><div class="premios">${L.premios.map(p=>{const ok=c.saldo>=+p.hojas,usar=C.premio===p.k;return `<div class="prem${ok?' ok':''}${usar?' usar':''}"><span class="pr-e">🎁</span><span class="t"><b>${esc(p.n)}</b><small>${ok?(usar?'✓ Se descuenta en tu próximo pedido':'¡Ya lo podés canjear!'):`Te faltan ${+p.hojas-c.saldo} 🍃`}</small><span class="pr-bar"><i style="--a:${Math.min(1,c.saldo/+p.hojas).toFixed(3)}"></i></span></span><span class="pr-h">${+p.hojas}<small>🍃</small></span>${ok&&!usar?`<button type="button" class="btn" data-act="premio-usar" data-k="${esc(p.k)}">Usar</button>`:''}</div>`;}).join('')}</div>`:''}
  ${previos.length?`<p class="grupo-h">Pedidos anteriores</p><div class="grupo">${previos.slice(0,20).map(filaPedido).join('')}</div>`:''}${extras}`;
}
function abrirProd(k){
  track('product_view',{k,nombre:prod(k)?.n||k});
  const p=prod(k);if(!p)return;
  const c=C.cesta[k];if(p.agotado&&!c){toast(p.n+' está agotado hoy');return;}
  const u=unidadDe(p,c?.u);abrirHoja({tipo:'prod',k,u,q:c?limpiaQ(c.q,u)||p.s:p.s,mad:c?.mad||'',nota:c?.nota||''});
}
const numTxt=q=>+q>0?String(+(+q).toFixed(2)).replace('.',','):'';
function convTxt(p,u,q){
  const us=unidadesDe(p);
  if(us.length<2||!(q>0))return p.u==='kg'?'Se cobra lo que pese de verdad':'';
  const otra=us.find(x=>x!==u),v=deBase(p,aBase(p,q,u),otra);
  return `≈ ${qtxt(v,otra)}`+(p.u==='kg'?' · se cobra lo que pese':' · se cobra por unidad');
}
function refrescarProd(){
  if(H?.tipo!=='prod')return;
  const p=prod(H.k),u=unidadDe(p,H.u),q=limpiaQ(H.q,u),en=!!C.cesta[H.k],b=$('tlHOk');
  const un=$('tlHU');if(un)un.textContent=fu(u,q||1);
  const cv=$('tlHConv');if(cv)cv.textContent=convTxt(p,u,q);
  if(b){b.disabled=!q;b.textContent=q?`${en?'Listo':'Agregar'} · ${$c(N.redondear5(aBase(p,q,u)*p.p))}`:'Escribí cuánto querés';}
}

// ══════════════ Sellar ══════════════
const estados={};
misPedidos().forEach(o=>{estados[o.id]=o.estado+'|'+(N.faseDe?.(o)||'');});
async function hacerPedido(){
  const falta=faltaAlgo();if(falta){avisarFalta(falta);return;}
  if(!metodosPago().some(([k])=>k===C.pago.metodo))C.pago.metodo='sinpe';
  const s=suc(C.retiro.suc),h=horaRetiro(),pr=premioSel(),L=N.lealtad();
  if(s&&h&&T().capacidadPorHora){const hay=await N.cupoHorario?.(s.k,h,+T().capacidadPorHora);if(hay===false){toast('Esa hora ya se llenó. Elegí otra.');ir('entrega');return;}}
  const items=cestaItems().filter(x=>!x.p.agotado);
  const envio=esEnvio()&&C.retiro.ubi?{...C.retiro.ubi,senas:(C.retiro.senas||'').trim(),costo:envioEstimado(s,C.retiro.ubi).costo}:null;
  const itemData=items.map(x=>({k:x.k,n:x.p.n,e:x.p.e,u:x.p.u,q:x.qb,p:x.p.p,...(x.u!==x.p.u?{pide:{q:x.q,u:x.u}}:{}),mad:x.mad||'',nota:x.nota||''}));
  const pedidosHoy=misPedidos().filter(o=>o.estado!=='cancelado'&&fechaClave(new Date(o.created||0))===fechaClave()).length;
  if(!C.editOrder&&pedidosHoy>=5){toast('Ya llegaste al máximo de 5 pedidos por día.');return;}
  if(C.editOrder){
    const previo=N.get(C.editOrder);
    if(previo?.estado==='nuevo'){
      const actualizado=await N.cambiar(previo.id,x=>{
        const items=[...(x.items||[])];
        itemData.forEach(nuevo=>{
          const ix=items.findIndex(v=>v.k===nuevo.k&&v.u===nuevo.u&&JSON.stringify(v.pide||null)===JSON.stringify(nuevo.pide||null));
          if(ix<0){items.push(nuevo);return;}
          const viejo=items[ix];
          viejo.q=(+viejo.q||0)+(+nuevo.q||0);
          viejo.nota=[viejo.nota,nuevo.nota].filter(Boolean).join(' · ');
          if(!viejo.mad)viejo.mad=nuevo.mad||'';
        });
        x.items=items;
        x.totalEst=N.redondear5(items.reduce((z,i)=>z+(+i.q||0)*(+i.p||0),0)+(+x.retiro?.envio?.costo||0));
        x.subacciones={accion:'agregar',items:itemData.map(i=>({k:i.k,n:i.n,q:i.q,u:i.u}))};
      },'cliente','El cliente agregó productos al pedido para confirmación de la tienda');
      if(actualizado){
        C.mis=[actualizado.id,...C.mis.filter(x=>x!==actualizado.id)];C.cesta={};C.editOrder=null;C.paso='armar';guardar();
        const pendiente=N.estadoEnvio?.(actualizado.id)==='pendiente';
        toast(pendiente?'⏳ Agregamos productos a '+actualizado.ref+' · sincronizando con la tienda':'✅ Agregamos productos a '+actualizado.ref+' · la tienda recibió el cambio');
        ver(actualizado.id);return;
      }
    }
    C.editOrder=null;
  }
  const o=N.crear({
    id:N.nuevoId(),ref:N.nuevoRef(),pin:N.nuevoPin(),estado:'nuevo',sucursal:s.k,
    cliente:{nombre:C.perfil.nombre.trim(),tel:telDig(C.perfil.tel),correo:C.perfil.correo||N.authEstado?.().email||''},
    retiro:{modo:C.retiro.modo,at:h.toISOString(),entrega:C.retiro.entrega,carro:C.retiro.entrega==='carro',placa:C.retiro.entrega==='carro'?C.retiro.placa.trim():'',envio},
    pago:{metodo:C.pago.metodo,conCuanto:C.pago.metodo==='efectivo'?+C.pago.conCuanto||0:0,estado:'pendiente'},
    factura:C.factura.quiere?{cedula:C.factura.cedula.trim(),correo:C.factura.correo.trim()}:null,
    consentimiento:{at:new Date().toISOString(),version:'2026-10-18'},
    sust:C.sust,nota:C.nota.trim(),
    items:itemData,
    premio:pr?{k:pr.k,n:pr.n,hojas:+pr.hojas,valor:+pr.valor}:null,hojasX:L.activa&&L.dobles?2:1,
    totalEst:totalPagar(),canal:N.modo(),
  });
  if(!C.perfil.desde)C.perfil.desde=o.created;
  C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];C.cesta={};C.nota='';C.premio=null;C.paso='armar';guardar();
  try{navigator.storage?.persist?.();}catch{} // que el navegador no borre solo el perfil y los pedidos
  estados[o.id]=o.estado;
  const enviado=await N.esperarEnvio(o.id);
  if(enviado)fiesta(o.items.map(i=>i.e));sellado(o.ref,enviado?'¡Pedido enviado!':'Pedido guardado en este teléfono',enviado);buzz([30,40,30]);toast(enviado?'✅ Pedido '+o.ref+' enviado a ARAMO · la tienda ya lo recibió':'⏳ Pedido '+o.ref+' guardado · sincronizando con la tienda');
  ver(o.id);
}
function msgTienda(o){
  const s=suc(o.sucursal),M=N.PAGOS[o.pago.metodo];
  const enlaceTienda=N.modo()==='nube'?N.enlace('APP.html','encargo',{id:o.id,ref:o.ref,pin:o.pin}):N.enlace('APP.html','encargo',o);
  return [
    `🧺 *Pedido ARAMO Taller · ${o.ref}*`,
    `👤 ${o.cliente.nombre} · ${fmtTel(o.cliente.tel)}`,
    `📍 ${s?.n||''} (${s?.zona||''}) · ${cuando(o.retiro.at)} · ${entregaTxt(o.retiro)}`,
    o.retiro.envio?`🗺️ Entregar en: ${mapaUrl(o.retiro.envio)}${o.retiro.envio.senas?' · '+o.retiro.envio.senas:''}`:'',
    `${M?.e||'💳'} ${M?.n||''}${o.pago.conCuanto?' · paga con '+$c(o.pago.conCuanto):''}`,
    '',
    ...o.items.map(i=>`• ${i.pide?qtxt(i.pide.q,i.pide.u)+' (≈ '+qtxt(i.q,i.u)+')':qtxt(i.q,i.u)} ${i.n}${i.mad?' · '+(MAD[i.mad]||'').toLowerCase():''}${i.nota?' · '+i.nota:''}`),
    '',
    o.premio?`🎁 Premio con hojas: −${$c(o.premio.valor)} (${o.premio.hojas} 🍃)`:'',
    `Total estimado: ${$c(N.totalDe(o))}`,
    `Si algo no hay: ${SUST[o.sust]?.n.toLowerCase()}`,
    o.nota?`📝 ${o.nota}`:'',
    '',
    `Abrir en Mostrador 👉 ${enlaceTienda}`,
  ].filter((l,i,a)=>l!==''||a[i-1]!=='').join('\n');
}
function abrir(url){const w=window.open(url,'_blank','noopener');if(!w)location.href=url;}

// ══════════════ Avisos en vivo ══════════════
// En un equipo de la tienda el Taller no suena ni manda notificaciones: ahí solo avisa el
// Mostrador cuando llega un pedido nuevo. Al cliente sí le suena cuando su canasta está lista.
const silencio=()=>!MINI&&!!LS.get('aramo_local',null);
function vigilar(){
  const callado=silencio(),aviso=callado?{mostrar(){}}:N.avisos;
  misPedidos().forEach(o=>{
    const actual=o.estado+'|'+(N.faseDe?.(o)||''),antes=estados[o.id];estados[o.id]=actual;
    if(!antes||antes===actual)return;
    if(o.estado==='listo'&&N.faseDe?.(o)==='confirmacion'){toast('🧾 Revisá y confirmá la cotización de '+o.ref);if(!callado){buzz([90,60,90]);campana();}aviso.mostrar('🧾 Confirmá tu pedido '+o.ref,'La tienda ya pesó los productos. Revisá el total definitivo dentro de ARAMO.',{tag:'pedido-'+o.id,url:location.href.split('#')[0]});}
    else if(o.estado==='listo'){toast('✅ ¡Tu canasta '+o.ref+' está lista!');if(!callado){buzz([90,60,90,60,160]);campana();}aviso.mostrar('✅ Tu canasta '+o.ref+' está lista',o.retiro.envio?'Va en camino con Uber a tu ubicación.':'Te espera en '+(suc(o.sucursal)?.n||'ARAMO')+'. Total '+$c(N.totalDe(o))+'.',{tag:'pedido-'+o.id,url:location.href.split('#')[0]});}
    else if(o.estado==='alistando'){toast('🧑‍🌾 Ya están escogiendo tu canasta');aviso.mostrar('🧑‍🌾 Estamos escogiendo tu canasta','Pedido '+o.ref+' · te avisamos cuando esté lista.',{tag:'pedido-'+o.id});}
    else if(o.estado==='entregado'){const h=N.hojasDe(o);toast(h?`🛍️ ¡Entregada! Ganaste ${h} 🍃`:'🛍️ ¡Entregada! Gracias');if(h)fiesta(['🍃','🍃','🌿']);}
    else if(o.estado==='cancelado')toast('El pedido '+o.ref+' fue cancelado');
  });
}
function campana(){
  try{
    const a=new (window.AudioContext||window.webkitAudioContext)();
    [880,1175,1568].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;o.connect(g);g.connect(a.destination);const t=a.currentTime+i*.14;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.start(t);o.stop(t+.4);});
  }catch{}
}

// ══════════════ Efectos ══════════════
let _tt=0;
function toast(m,acc){
  const t=$('tlToast');t.textContent=m;
  if(acc){const b=document.createElement('button');b.type='button';b.textContent=acc.txt;b.addEventListener('click',()=>{t.classList.remove('show');acc.fn();});t.append(b);}
  t.classList.toggle('accion',!!acc);t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),acc?5500:2600);
}
function volar(p,desde){
  const a=desde.getBoundingClientRect();
  const s=document.createElement('span');s.className='vuelo';
  if(FOTOS[p.k]){s.classList.add('con-foto');s.innerHTML=foto(p.k,p.e);}else s.textContent=p.e;
  s.style.left=(a.left+a.width/2-14)+'px';s.style.top=(a.top+a.height/2-14)+'px';
  document.body.appendChild(s);
  requestAnimationFrame(()=>{
    const b=$('tlTk')?.getBoundingClientRect()||{left:24,top:innerHeight-66,width:40,height:40};
    const y=Math.min(b.top+b.height/2,innerHeight-46);
    s.style.transform=`translate(${b.left+b.width/2-(a.left+a.width/2)}px,${y-(a.top+a.height/2)}px) scale(.45)`;s.style.opacity='.25';
  });
  setTimeout(()=>{s.remove();const i=$('tlTk');if(i){i.classList.remove('bump');void i.offsetWidth;i.classList.add('bump');}},740);
}
function fiesta(emos){
  if(MINI)return;
  const f=document.createElement('div');f.className='fiesta';
  const set=emos?.length?emos:['🍅','🥑','🍌','🥕'];
  for(let i=0;i<24;i++){const s=document.createElement('span');s.textContent=set[i%set.length];s.style.left=Math.random()*100+'%';s.style.animationDelay=(Math.random()*.6)+'s';s.style.fontSize=(20+Math.random()*16)+'px';f.appendChild(s);}
  document.body.appendChild(f);setTimeout(()=>f.remove(),2600);
}
function sellado(ref,tit,ok=true){
  if(MINI)return;
  const f=document.createElement('div');f.className='sellado';f.setAttribute('aria-hidden','true');
  f.innerHTML=`<div class="${ok?'ok-c':'wait-c'}">${ok?'<svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-17"/></svg>':'<span>…</span>'}</div><b>${esc(tit||'¡Pedido enviado!')}</b><small>Pedido ${esc(ref)}</small>`;
  document.body.appendChild(f);setTimeout(()=>f.remove(),2400);
}
async function copiar(v){
  try{await navigator.clipboard.writeText(v);}catch{const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch{}t.remove();}
  toast('Copiado: '+v);buzz(10);
}

// ══════════════ Eventos ══════════════
let _qt=0;
function marcarBusqueda(){const v=!!C.q,x=$('tlLimpiar');if(x)x.hidden=!v;}
function limpiarBusqueda(){C.q='';C.parse=null;const q=$('tlQ');if(q)q.value='';marcarBusqueda();const el=$('tlParse');if(el)el.innerHTML='';pintarGrid();}
function ligar(){
  const f=$('tlAsk'),q=$('tlQ');
  if(f&&q){
    const buscar=()=>{C.q=q.value;marcarBusqueda();const L=pareceLista(C.q)?leerLista(C.q):null;C.parse=L&&L.some(x=>x.p)?L:null;if(C.q.trim()&&!cat().some(p=>norm(p.n).includes(norm(C.q))))track('search_empty',{q:C.q.trim().slice(0,80)});$('tlParse').innerHTML=parseHtml();pintarGrid();};
    f.addEventListener('submit',e=>{e.preventDefault();clearTimeout(_qt);buscar();q.blur();});
    q.addEventListener('input',()=>{C.q=q.value;marcarBusqueda();clearTimeout(_qt);_qt=setTimeout(buscar,240);});
  }
  const on=(id,fn)=>{const el=$(id);if(el)el.addEventListener('input',()=>fn(el.value));};
  on('tlDatosNom',v=>{C.perfil.nombre=v;guardar();});
  on('tlDatosTel',v=>{C.perfil.tel=v;guardar();});
  on('tlDatosCorreo',v=>{C.perfil.correo=v;C.factura.correo=v;guardar();});
  on('tlNota',v=>{C.nota=v;guardar();});
  on('tlSenas',v=>{C.retiro.senas=v;guardar();});
  on('tlPlaca',v=>{C.retiro.placa=v;guardar();});
  on('tlCedula',v=>{C.factura.cedula=v;guardar();});
  on('tlCorreo',v=>{C.factura.correo=v;guardar();});
  const fi=$('tlFacturaOn');if(fi)fi.addEventListener('change',e=>{C.factura.quiere=e.target.checked;guardar();render();});
  const co=$('tlConsentOn');if(co)co.addEventListener('change',e=>{C.consent=e.target.checked;guardar();});
  const info=$('tlInfoPedido');if(info)info.addEventListener('toggle',()=>{C.infoOpen=info.open;guardar();});
  on('tlUbiLink',v=>{const c=leerCoords(v);if(c){C.retiro.ubi=c;guardar();toast('📍 Ubicación lista');C.pulso=true;render();}else if(v.length>12)toast('Ese link no trae la ubicación; usá el botón 📍');});
}
const ACT={
  tile(el){abrirProd(el.dataset.k);},
  mas(el){const x=linea(el.dataset.k);if(!x)return;setQ(x.k,x.q+pasoU(x.p,x.u));C.toque=x.k;buzz(6);render();},
  // al llegar a cero se quita (con Deshacer); en "Tu canasta" la fila se va deslizando
  menos(el){
    const p=prod(el.dataset.k);if(!p)return;
    const x=linea(p.k),q=x?+(x.q-pasoU(p,x.u)).toFixed(2):0;
    if(q>0){setQ(p.k,q);C.toque=p.k;buzz(6);render();return;}
    const antes=C.cesta[p.k],pos=Object.keys(C.cesta).indexOf(p.k),fila=el.closest('.linea');
    const quitar=()=>{setQ(p.k,0);render();toast(`${p.e} ${p.n} quitado`,{txt:'Deshacer',fn:()=>{const L=Object.entries(C.cesta);L.splice(Math.max(0,pos),0,[p.k,antes]);C.cesta=Object.fromEntries(L);guardar();C.toque=p.k;render();}});};
    buzz(10);
    if(fila&&!MINI){fila.classList.add('sale');setTimeout(quitar,230);}else quitar();
  },
  // empezar de cero: vacía la canasta y vuelve al inicio (con Deshacer)
  reiniciar(){
    if(!cestaN())return;
    const antes={cesta:JSON.parse(JSON.stringify(C.cesta)),nota:C.nota,paso:C.paso};
    C.cesta={};C.nota='';C.parse=null;C.q='';C.pasillo=null;guardar();buzz([20,30,20]);
    ir('armar');
    toast('🧺 Empezamos de cero',{txt:'Deshacer',fn:()=>{C.cesta=antes.cesta;C.nota=antes.nota;guardar();ir(antes.paso==='armar'?'armar':'canasta');}});
  },
  info(el){abrirProd(el.dataset.k);},
  // si ya bajaste entre los productos, sube al inicio de la categoría (bajo el buscador y la fila compacta)
  pasillo(el){
    C.pasillo=el.dataset.k;C.animGrid=true;pintarGrid();
    const g=$('tlGrid'),bus=$('tlBuscar');if(g&&bus){const y=g.getBoundingClientRect().top+window.scrollY-bus.offsetHeight-($('tlMini')?.offsetHeight||0)-8;if(window.scrollY>y+2)window.scrollTo({top:y,behavior:'smooth'});}
  },
  cat(el){ACT.pasillo({dataset:{k:el.dataset.c}});},
  recetas(){C.pasillo='recetas';C.animGrid=true;limpiarBusqueda();},
  receta(el){abrirHoja({tipo:'receta',k:el.dataset.k,personas:C.personas,off:new Set()});},
  'mas-recetas'(){C.verRecetas=!C.verRecetas;render();},
  'rec-cat'(el){C.recCat=el.dataset.k;C.verRecetas=false;render();},
  sumar(el){abrirProd(el.dataset.k);},
  avisame(){N.avisos.pedir().then(async r=>{const push=r==='granted'?await N.avisos.push?.():false;toast(r==='granted'?(push?'🔔 Listo: te avisamos aunque cerrés la app':'🔔 Avisos activados en este teléfono'):'Tu navegador no permitió avisos; revisá el pedido desde la app');render();});},
  'limpiar-q'(){limpiarBusqueda();$('tlQ')?.focus();},
  ir(el){ir(el.dataset.p);},
  // un paso a la vez: Inicio → Canasta → Entrega → Datos → Pago (cada paso revisa lo suyo)
  siguiente(){
    const P={armar:'canasta',canasta:'entrega',entrega:'datos',datos:'pago'}[C.paso]||'canasta';
    const f=P==='pago'?faltaArmar()||faltaRetiro()||faltaDatos():P==='datos'?faltaArmar()||faltaRetiro():faltaArmar();
    if(f){avisarFalta(f);return;}
    ir(P);
  },
  tema(){const t=temaActual()==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('cn_theme',t);}catch{}pintarTema();pintarBit();},
  ver(el){ver(el.dataset.id);},
  nuevo(){C.pasillo=null;C.q='';ir('armar');},
  repetir(el){
    const o=N.get(el.dataset.id);if(!o)return;let n=0;
    o.items.forEach(i=>{const p=prod(i.k);if(p&&!p.agotado&&i.estado!=='nohay'){C.cesta[i.k]={q:i.pide?i.pide.q:i.q,...(i.pide?{u:i.pide.u}:{}),mad:i.mad||'',nota:i.nota||''};n++;}});
    guardar();C.pulso=true;
    // Exprés: si ya sabemos entrega y pago, va directo a revisar y sellar
    const pr=n===1?'1 producto':n+' productos';
    if(el.dataset.express&&!puedeIr('pago')){toast('⚡ '+pr+' · revisá y pedí');ir('pago');}
    else{toast('🔁 '+pr+' en tu canasta');ir('canasta');}
  },
  'parse-t'(el){const x=C.parse[+el.dataset.i];if(x.p&&!x.p.agotado)x.on=!x.on;$('tlParse').innerHTML=parseHtml();},
  'parse-no'(){limpiarBusqueda();},
  'parse-ok'(){
    const ok=C.parse.filter(x=>x.p&&x.on);
    ok.forEach(x=>sumar(x.p.k,x.q));
    guardar();C.parse=null;C.q='';C.pulso=true;
    toast('✨ '+ok.length+' productos agregados');fiesta(ok.map(x=>x.p.e));render();
  },
  sust(el){C.sust=el.dataset.k;guardar();render();},
  suc(el){C.retiro.suc=el.dataset.k;_cat=null;guardar();C.pulso=true;render();},
  cuando(el){C.retiro.modo=el.dataset.v;asegurarRetiro();guardar();C.pulso=true;render();},
  dia(el){C.retiro.dia=+el.dataset.d;C.retiro.hora=null;asegurarRetiro();guardar();render();},
  hora(el){C.retiro.hora=el.dataset.h;guardar();C.pulso=true;render();},
  entrega(el){C.retiro.entrega=el.dataset.v;C.retiro.carro=false;guardar();C.pulso=true;render();if(el.dataset.v==='envio'&&!C.retiro.ubi){setTimeout(()=>$('tlUbiBtn')?.scrollIntoView({block:'center',behavior:'smooth'}),80);tomarUbicacion();}},
  'ubi-gps'(){tomarUbicacion();},
  direccion(el){const d=C.direcciones.find(x=>x.id===el.dataset.id);if(!d)return;C.retiro.ubi={lat:+d.lat,lng:+d.lng,acc:null};C.retiro.senas=d.senas||'';guardar();render();},
  'guardar-direccion'(){guardarDireccionActual();},
  metodo(el){C.pago.metodo=el.dataset.k;guardar();C.pulso=true;render();},
  con(el){C.pago.conCuanto=+el.dataset.v;guardar();render();},
  'edit-perfil'(){abrirHoja({tipo:'perfil',editar:true});setTimeout(()=>$('tlPNom')?.focus(),60);},
  pedir(){hacerPedido();},
  'wa-tienda'(){const o=pedidoVisto();abrir(N.wa(N.waDe(o?.sucursal),`Hola, sobre mi pedido ${o?.ref||''} de ARAMO: `));},
  'ya-pague'(){N.cambiar(C.actual,o=>{o.pago.estado='reportado';o.pago.reportado=new Date().toISOString();},'cliente','El cliente avisó que pagó').then(()=>{toast('¡Gracias! La tienda lo confirma al entregarte');render();});},
  'actualizar-pedido'(){
    const o=pedidoVisto();if(!o)return;
    toast('🔄 Revisando el estado de tu pedido…');
    const refresco=N.refrescarPedido?N.refrescarPedido(o.id):N.conectar({ids:C.mis}).then(()=>N.get(o.id));
    Promise.resolve(refresco).then(()=>{
      const actualizado=N.get(o.id);
      render();
      if(actualizado?.estado==='listo')toast('✅ ¡La tienda ya lo marcó como listo!');
      else if(actualizado?.estado==='entregado')toast('🛍️ Tu pedido ya fue entregado');
      else if(N.modo()!=='nube')toast('⏳ Esperando conexión con la tienda');
      else toast('⏳ La tienda todavía lo está alistando');
    });
  },
  'paso6'(){
    $('tlStep6')?.scrollIntoView({behavior:'smooth',block:'center'});
  },
  'link-pago'(){abrir(T().linkTarjeta);},
  consent(el){C.consent=!!el.checked;guardar();},
  instalar(){if(!_installPrompt)return;_installPrompt.prompt();_installPrompt.userChoice.finally(()=>{_installPrompt=null;window.__aramoInstallPrompt=null;render();});},
  promo(el){const p=(T().promos||[]).find(x=>x.k===el.dataset.k);if(p?.producto)abrirProd(p.producto);},
  'agregar-pedido'(){const o=pedidoVisto();if(!o||o.estado!=='nuevo')return;C.cesta={};C.editOrder=o.id;guardar();toast('Agregá solo lo nuevo y lo sumamos a '+o.ref);ir('armar');},
  'confirmar-cotizacion'(){const o=pedidoVisto();if(!o||N.faseDe?.(o)!=='confirmacion')return;N.cambiar(o.id,x=>{x.fase='alistando';x.confirmacion={at:new Date().toISOString(),por:'cliente',total:N.totalDe(x)};},'cliente','Cliente confirmó la cotización final').then(()=>{toast('✅ Cotización confirmada · la tienda termina de alistar');render();});},
  suscribir(){const o=pedidoVisto();if(!o)return;const at=new Date(o.retiro?.at||Date.now()),next=new Date(Date.now()+7*864e5);N.guardarSuscripcion({sucursal:o.sucursal,weekday:at.getDay(),at_time:String(at.getHours()).padStart(2,'0')+':'+String(at.getMinutes()).padStart(2,'0'),next_run:next.toISOString().slice(0,10),data:{...o,id:null,estado:'nuevo',log:[]}}).then(()=>toast('✅ Pedido semanal activado')).catch(e=>toast(e.message||'Verificá tu cuenta para activarlo'));},
  'sub-accept'(el){const o=pedidoVisto(),i=+el.dataset.i;if(!o)return;N.cambiar(o.id,x=>{const it=x.items[i];if(it?.subPropuesta){Object.assign(it,it.subPropuesta);it.subAceptada=true;it.estado='';delete it.subPropuesta;x.subacciones={i,accion:'aceptar'};}},'cliente','Cliente aceptó una sustitución').then(()=>{toast('✅ Cambio aceptado');render();});},
  'sub-reject'(el){const o=pedidoVisto(),i=+el.dataset.i;if(!o)return;N.cambiar(o.id,x=>{const it=x.items[i];if(it){it.subAceptada=false;it.subRechazada=true;delete it.subPropuesta;x.subacciones={i,accion:'rechazar'};}},'cliente','Cliente rechazó una sustitución').then(()=>{toast('Anotado: no querés el cambio');render();});},
  mapa(){const o=pedidoVisto(),s=suc(o?.sucursal);abrir('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s?.mapa||s?.n||'ARAMO'));},
  cancelar(){
    const o=pedidoVisto();if(!o||o.estado!=='nuevo')return;
    if(!confirm('¿Cancelar el pedido '+o.ref+'?'))return;
    N.cambiar(o.id,x=>{if(x.estado==='nuevo'){x.estado='cancelado';x.motivo='Lo canceló el cliente';}},'cliente').then(x=>{
      if(x?.estado!=='cancelado'){toast('Ya lo están alistando; escribile a la tienda');render();return;}
      if(N.modo()!=='nube'&&o.avisado)abrir(N.wa(N.waDe(o.sucursal),`Hola, cancelo mi pedido ${o.ref}. ¡Gracias!`));
      toast('Pedido cancelado');render();
    });
  },
  rating(el){N.cambiar(C.actual,o=>{o.rating=+el.dataset.v;},'cliente','Calificó con '+el.dataset.v).then(()=>{toast('¡Gracias por contarnos!');render();});},
  copiar(el){copiar(el.dataset.v);},
  // perfil y lealtad
  perfil(){if(H){H.tipo='perfil';H.editar=false;pintarHoja();$('tlSheet').scrollTop=0;}else abrirHoja({tipo:'perfil'});},
  'perfil-editar'(){H.editar=true;pintarHoja();$('tlSheet').scrollTop=0;$('tlPNom')?.focus();},
  'perfil-cancelar'(){H.editar=false;pintarHoja();},
  'perfil-crear'(){
    const nm=$('tlPNom'),tl=$('tlPTel'),n=nm.value.trim(),t=tl.value,a=N.authEstado?.()||{};
    if(n.length<2){toast('Escribí tu nombre');nm.classList.add('falta');nm.focus();return;}
    if(telDig(t).length!==8){toast('El teléfono debe tener 8 números');tl.classList.add('falta');tl.focus();return;}
    const nuevo=!perfilOk(),regresaPago=C.paso==='pago';
    const email=String($('tlPEmail')?.value||C.perfil.correo||C.authEmail||'').trim(),pass=String($('tlPPass')?.value||C.authPassword||'');
    C.perfil={...C.perfil,nombre:n,tel:t,correo:email,desde:C.perfil.desde||new Date().toISOString()};C.authEmail=email;guardar();
    if(a.disponible&&!a.verificado){
      if(!email){toast('Escribí tu correo para crear la cuenta');$('tlPEmail')?.focus();return;}
      if(!pass){toast('Escribí una contraseña de al menos 8 caracteres');$('tlPPass')?.focus();return;}
      N.registrarCorreo(email,pass,{full_name:n,phone:telDig(t)}).then(async r=>{
        C.authPassword='';
        if(r.confirmacion){H.editar=false;render();toast('📧 Cuenta creada. Revisá tu correo y luego iniciá sesión aquí.');return;}
        cargarDirecciones();if(N.avisos.permiso?.()==='granted')await N.avisos.push?.();toast('✅ Cuenta creada: tus pedidos viajan con vos');
        if(C.paso==='pago'){cerrarHoja();render();}else{H.editar=false;render();}
      }).catch(e=>toast(e.message||'No se pudo crear la cuenta'));
      return;
    }
    if(regresaPago){cerrarHoja();render();}else{H.editar=false;render();$('tlSheet').scrollTop=0;}
    if(nuevo){fiesta(['🍃','🌱','🍃','✨']);buzz([20,40,20]);toast('🎉 ¡Listo, '+n.split(/\s+/)[0]+'! Ya sos socio ARAMO');}else toast('✅ Datos guardados');
  },
  'perfil-cuenta-entrar'(){
    const email=String($('tlPEmail')?.value||C.perfil.correo||C.authEmail||'').trim(),pass=String($('tlPPass')?.value||C.authPassword||'');
    C.authEmail=email;C.authPassword=pass;C.perfil.correo=email;guardar();
    N.entrarCorreo(email,pass).then(async()=>{C.authPassword='';cargarDirecciones();if(N.avisos.permiso?.()==='granted')await N.avisos.push?.();toast('✅ Sesión iniciada: tus pedidos y hojas están protegidos');if(['datos','pago'].includes(C.paso)){cerrarHoja();render();}else{pintarHoja();}}).catch(e=>toast(e.message||'No se pudo iniciar sesión'));
  },
  'perfil-cuenta-crear'(){
    const email=String($('tlPEmail')?.value||C.perfil.correo||C.authEmail||'').trim(),pass=String($('tlPPass')?.value||C.authPassword||'');
    const n=String($('tlPNom')?.value||C.perfil.nombre||'').trim(),t=String($('tlPTel')?.value||C.perfil.tel||'').trim();
    if(n.length<2){toast('Escribí tu nombre');$('tlPNom')?.focus();return;}
    if(telDig(t).length!==8){toast('Escribí un teléfono de 8 números');$('tlPTel')?.focus();return;}
    C.perfil={...C.perfil,nombre:n,tel:t};
    C.authEmail=email;C.authPassword=pass;C.perfil.correo=email;guardar();
    N.registrarCorreo(email,pass,{full_name:perfilNombre(),phone:telDig(perfilTelefono())}).then(async r=>{C.authPassword='';if(r.confirmacion){pintarHoja();toast('📧 Cuenta creada. Revisá tu correo y luego iniciá sesión aquí.');return;}cargarDirecciones();if(N.avisos.permiso?.()==='granted')await N.avisos.push?.();toast('✅ Cuenta creada: tus pedidos viajan con vos');if(['datos','pago'].includes(C.paso)){cerrarHoja();render();}else{pintarHoja();}}).catch(e=>toast(e.message||'No se pudo crear la cuenta'));
  },
  'perfil-recuperar'(){
    const email=String($('tlPEmail')?.value||C.perfil.correo||C.authEmail||'').trim();
    N.recuperarCorreo(email).then(()=>toast('📧 Si el correo existe, te llegará un enlace para cambiar la contraseña')).catch(e=>toast(e.message||'No se pudo enviar el enlace'));
  },
  'perfil-salir'(){N.salir().then(()=>{toast('Sesión cerrada en este teléfono');pintarHoja();});},
  'premio-usar'(el){C.premio=el.dataset.k;guardar();pintarHoja();buzz(10);toast('🎁 Listo: se descuenta en tu próximo pedido');},
  premio(el){C.premio=el.dataset.k||null;guardar();buzz(6);render();},
  // hojas
  'h-x'(){cerrarHoja();},
  'h-mas'(){const p=prod(H.k),u=unidadDe(p,H.u);H.q=limpiaQ((limpiaQ(H.q,u)||0)+pasoU(p,u),u);pintarHoja();buzz(6);},
  'h-menos'(){const p=prod(H.k),u=unidadDe(p,H.u),s=pasoU(p,u),q=limpiaQ(H.q,u);H.q=q-s>=s-1e-9?limpiaQ(q-s,u):(q>s?s:(q||s));pintarHoja();buzz(6);},
  // cambiar de kilo a unidad (o al revés) conserva más o menos la misma cantidad
  'h-u'(el){const p=prod(H.k),de=unidadDe(p,H.u),a=el.dataset.v;if(de===a)return;const q=limpiaQ(H.q,de);H.u=a;H.q=q?deBase(p,aBase(p,q,de),a):pasoU(p,a);pintarHoja();buzz(5);},
  'h-mad'(el){H.mad=H.mad===el.dataset.v?'':el.dataset.v;pintarHoja();},
  'h-quitar'(){delete C.cesta[H.k];guardar();cerrarHoja();render();},
  'h-ok'(el){
    const p=prod(H.k),u=unidadDe(p,H.u),q=limpiaQ(H.q,u);
    if(!q){toast('Escribí cuánto querés');$('tlHQ')?.focus();return;}
    const nuevo=!C.cesta[H.k],k=H.k;
    C.cesta[k]={q,...(u!==p.u?{u}:{}),mad:H.mad||'',nota:(H.nota||'').trim()};guardar();
    if(nuevo){C.ultimo=k;C.pulso=true;buzz(8);if(el&&!MINI)volar(p,el);}
    cerrarHoja();render();
    if(nuevo)toast(`${p.e} ${p.n}: ${qtxt(q,u)} a tu canasta`);
  },
  'h-per'(el){H.personas=+el.dataset.v;C.personas=H.personas;guardar();pintarHoja();buzz(5);},
  'h-ing'(el){const k=el.dataset.k;H.off.has(k)?H.off.delete(k):H.off.add(k);pintarHoja();},
  'h-receta'(){
    const r=RECETAS().find(x=>x.k===H.k),L=ingredientes(r,H.personas,H.off).filter(x=>x.on);
    L.forEach(x=>sumar(x.p.k,x.q));
    guardar();cerrarHoja();C.pulso=true;fiesta(L.map(x=>x.p.e));toast(`${r.e} ${r.n}: ${L.length} productos a tu canasta`);buzz([20,30,20]);
    if(C.actual||C.paso!=='armar')ir('armar');else render();
  },
};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
  const f=ACT[el.dataset.act];if(!f)return;
  e.preventDefault();e.stopPropagation();f(el);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&H){cerrarHoja();return;}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[role="button"][data-act]')){e.preventDefault();e.target.click();}
});
$('tlSheetBg').addEventListener('click',()=>cerrarHoja());
$('tlBitBtn').addEventListener('click',()=>abrirHoja({tipo:'perfil'}));

// Tema: el del teléfono (claro u oscuro), o el que el cliente eligió
function temaActual(){return document.documentElement.dataset.theme==='light'?'light':'dark';}
function pintarTema(){const d=temaActual()==='dark';document.querySelector('meta[name="theme-color"]').content=d?'#0b120e':'#f8f5ee';}
pintarTema();
DESK.addEventListener?.('change',()=>render());

// ══════════════ Arranque ══════════════
N.on(tipo=>{
  if(tipo==='tienda'){_cat=null;actualizarMeta();avisarAgotados();}
  if(tipo==='auth'){
    const a=N.authEstado?.()||{};
    sincronizarPerfilAuth();
    if(a.email){C.authEmail=a.email;C.perfil.correo=a.email;guardar();}
    if(a.verificado){cargarDirecciones();if(C.mis.length===0){C.mis=N.lista().map(o=>o.id);guardar();}}
    if(!H)render();else pintarHoja();
  }
  if(tipo==='encargo'||tipo==='tienda'){vigilar();if(!H)render();else pintarBit();}
  if(tipo==='modo')pintarChips();
});
function importarHash(){
  const m=location.hash.match(/^#e=(.+)$/);if(!m)return false;
  const o=N.unpack(m[1]);if(!o?.id)return false;
  N.importar(o);C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];guardar();C.actual=o.id;
  if(!estados[o.id]){const x=N.get(o.id);estados[o.id]=x?.estado+'|'+(N.faseDe?.(x)||'');}
  vigilar();
  return true;
}
// Siempre abre en el inicio: el pedido en curso se ve arriba en su tarjeta en vivo (un toque y entrás).
importarHash();
window.addEventListener('hashchange',()=>{if(importarHash()){history.replaceState({paso:C.paso,id:C.actual},'',location.pathname+location.search);render(true);arriba();}});
// ══════════════ Equipo de la tienda ══════════════
// En un equipo de la tienda solo aparece ⌂ para volver al menú. Los avisos de pedidos nuevos
// y el acceso al Mostrador viven únicamente en la app de la tienda (APP.html), nunca aquí.
const LOCAL_TIENDA=MINI?null:LS.get('aramo_local',null);
document.querySelector('.tl-back')?.toggleAttribute('hidden',!LOCAL_TIENDA);
// ⌂ vuelve al menú al instante. En la compu el Taller se abrió en otra pestaña desde el menú:
// se cierra esta y queda la del menú (que nunca se fue). En el celular abre el menú guardado.
document.querySelector('.tl-back')?.addEventListener('click',e=>{
  try{
    if(window.name==='aramo-taller'&&window.opener&&!window.opener.closed&&window.opener.location.origin===location.origin){
      e.preventDefault();window.opener.focus();window.close();
      setTimeout(()=>{location.href='APP.html';},300); // si el navegador no deja cerrarla
    }
  }catch{}
});
if(!MINI){
  history.replaceState({paso:C.paso,id:C.actual},'',location.pathname+location.search);
  N.conectar({ids:C.mis});
  if('serviceWorker' in navigator){
    // Versión nueva publicada: se recarga sola en cuanto el cliente está en el inicio sin nada
    // abierto, o cuando deja la app en segundo plano. Nunca a mitad de un pedido.
    const habia=!!navigator.serviceWorker.controller;let nueva=false;
    const recargar=()=>{if(nueva&&(document.visibilityState==='hidden'||(C.paso==='armar'&&!C.actual&&!H&&!C.q&&!C.parse)))location.reload();};
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(habia){nueva=true;recargar();}});
    document.addEventListener('visibilitychange',recargar);
    document.addEventListener('click',()=>setTimeout(recargar,0),true);
    navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>{
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});});
    }).catch(()=>{});
  }
}
window.addEventListener('beforeunload',()=>{if(cestaN())track('cart_abandon',{items:cestaN(),total:cestaTotal(),paso:C.paso});});
// El Taller solo se desplaza en vertical. Evita que un arrastre horizontal
// accidental active Atrás/Adelante del navegador en el teléfono.
let _touchX=0,_touchY=0;
document.addEventListener('touchstart',e=>{const t=e.touches?.[0];if(t){_touchX=t.clientX;_touchY=t.clientY;}},{passive:true});
document.addEventListener('touchmove',e=>{const t=e.touches?.[0];if(!t)return;const dx=t.clientX-_touchX,dy=t.clientY-_touchY;if(Math.abs(dx)>18&&Math.abs(dx)>Math.abs(dy)*1.15)e.preventDefault();},{passive:false});
render(true);
actualizarMeta();
window.ARAMO_CANASTA_APP={C,leerLista,hacerPedido,ir,ver};
})();
