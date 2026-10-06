/* ══════════════════════════════════════════════════════════════════════
   ARAMO Taller de pedidos — mismo lenguaje que el Taller de GENOSIM.

   A la izquierda, el ciclo completo numerado (siempre visible):
     1 Armar canasta → 2 Entrega → 3 Pago → 4 Sellar pedido
     → 5 Alistamos → 6 Recogés / Te llega
   A la derecha (o debajo del paso activo en el celular), la mesa de
   trabajo de ese paso: veredicto, holograma en vivo, métricas, qué se
   confirma / qué falta, y la siguiente acción. Abajo, la bitácora de
   pedidos sellados.

   La lógica es la de siempre: catálogo de la vitrina, recetas que se
   escalan, lista escrita o dictada, retiro/carro/envío con Uber, pagos,
   AramoNube en vivo y WhatsApp como respaldo.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const CFG=window.ARAMO_CANASTA,N=window.AramoNube;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const buzz=p=>{try{if(navigator.userActivation?.hasBeenActive!==false)navigator.vibrate&&navigator.vibrate(p);}catch{}};
const MINI=/[?&]mini=1/.test(location.search);
const DESK=window.matchMedia('(min-width: 900px)');
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const $c=N.colones;

const C={
  paso:'armar',actual:null,pasillo:null,q:'',parse:null,verRecetas:false,recCat:'todas',ultimo:null,pulso:false,
  cesta:LS.get('cn_cesta',{}),
  retiro:Object.assign({suc:null,modo:'asap',dia:0,hora:null,carro:false,placa:'',entrega:'tienda',ubi:null,senas:'',visto:false},LS.get('cn_retiro',{})),
  perfil:Object.assign({nombre:'',tel:''},LS.get('cn_perfil',{})),
  pago:Object.assign({metodo:'sinpe',conCuanto:0},LS.get('cn_pago',{})),
  sust:LS.get('cn_sust','avisar'),
  nota:LS.get('cn_nota',''),
  mis:LS.get('cn_mis',[]),
  personas:LS.get('cn_personas',4),
  editPerfil:false,
};
if(C.retiro.carro&&C.retiro.entrega==='tienda')C.retiro.entrega='carro';
function guardar(){
  LS.set('cn_cesta',C.cesta);LS.set('cn_retiro',C.retiro);LS.set('cn_perfil',C.perfil);LS.set('cn_pago',C.pago);
  LS.set('cn_sust',C.sust);LS.set('cn_nota',C.nota);LS.set('cn_mis',C.mis);LS.set('cn_personas',C.personas);
}

// ══════════════ Vitrina ══════════════
const T=()=>N.tienda();
let _cat=null;
function cat(){return _cat||(_cat=N.catalogo().filter(p=>!p.oculto));}
const prod=k=>cat().find(p=>p.k===k);
const RECETAS=()=>N.recetas();
// Favoritos automáticos: lo que más ha pedido este cliente
function favoritos(){
  const n={};
  misPedidos().forEach(o=>(o.items||[]).forEach(i=>{if(i.estado!=='nohay')n[i.k]=(n[i.k]||0)+1;}));
  return Object.entries(n).sort((a,b)=>b[1]-a[1]).map(([k])=>prod(k)).filter(Boolean).slice(0,12);
}
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
  return fr?(w||'')+fr:String(+n.toFixed(2));
}
const UNI={kg:['kg','kg'],unid:['unid.','unid.'],rollo:['rollo','rollos'],paquete:['paquete','paquetes'],bolsita:['bolsita','bolsitas'],bolsa:['bolsa','bolsas'],'cartón':['cartón','cartones'],frasco:['frasco','frascos'],botella:['botella','botellas']};
const fu=(u,q)=>(UNI[u]||[u,u])[q===1?0:1];
const qtxt=(q,u)=>fq(q)+' '+fu(u,q);
const porU=p=>$c(p.p)+(p.u==='kg'?'/kg':p.u==='unid'?' c/u':'/'+fu(p.u,1));
const kg=n=>(Math.round((+n||0)*100)/100).toLocaleString('es-CR',{maximumFractionDigits:2});
const MAD={hoy:'Para comer hoy',semana:'Para la semana',verde:'Bien verde'};
const SUST={avisar:{e:'📞',n:'Avisame'},similar:{e:'🔁',n:'Algo parecido'},quitar:{e:'✖️',n:'Quitalo'}};

// ══════════════ Canasta ══════════════
function cestaItems(){
  return Object.entries(C.cesta).map(([k,v])=>{const p=prod(k);if(!p)return null;const q=Math.max(p.s,+(Math.round(v.q/p.s)*p.s).toFixed(2));return{k,p,...v,q};}).filter(x=>x&&x.q>0);
}
function cestaTotal(){return N.redondear5(cestaItems().reduce((t,x)=>t+x.q*x.p.p,0));}
const cestaN=()=>cestaItems().length;
const cestaPeso=()=>cestaItems().reduce((t,x)=>t+(x.p.u==='kg'?x.q:0),0);
function setQ(k,q){
  const p=prod(k);if(!p)return;
  q=+(Math.round(Math.max(0,q)/p.s)*p.s).toFixed(2);
  if(q<=0)delete C.cesta[k];else C.cesta[k]={...(C.cesta[k]||{}),q};
  guardar();
}
function sumar(k,q){C.cesta[k]={...(C.cesta[k]||{}),q:+((C.cesta[k]?.q||0)+q).toFixed(2)};}
function add(k,el){
  const p=prod(k);if(!p)return;
  if(p.agotado){toast(p.n+' está agotado hoy');return;}
  setQ(k,(C.cesta[k]?.q||0)+p.s);buzz(8);
  C.ultimo=k;C.pulso=true;
  if(el)volar(p.e,el);
  render();
}

// ══════════════ Pedidos del cliente ══════════════
const misPedidos=()=>C.mis.map(id=>N.get(id)).filter(Boolean);
const activo=()=>misPedidos().filter(o=>!['entregado','cancelado'].includes(o.estado))[0]||null;
const ultimoEntregado=()=>misPedidos().find(o=>o.estado==='entregado')||null;
const ultimoPedido=()=>misPedidos().find(o=>o.estado!=='cancelado')||null;
function avance(o){const it=o.items||[],r=it.filter(x=>x.estado==='listo'||x.estado==='nohay').length;return{r,n:it.length};}
const pesoReal=o=>(o.items||[]).reduce((t,i)=>t+(i.u==='kg'&&i.estado==='listo'?+(i.qr??i.q)||0:0),0);
const suc=k=>(T().sucursales||[]).find(s=>s.k===k);
const sucs=()=>(T().sucursales||[]).filter(s=>s.activa!==false);

// ══════════════ Horarios ══════════════
const hm=s=>{const [h,m]=String(s||'0:0').split(':').map(Number);return h*60+(m||0);};
const lead=()=>+T().alistadoMin||40;
const minsHoy=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
function aFecha(dia,min){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+dia);d.setMinutes(min);return d;}
function abierta(s){const m=minsHoy();return m>=hm(s.abre)&&m<hm(s.cierra);}
function asap(s){let m=Math.max(minsHoy(),hm(s.abre))+lead();m=Math.ceil(m/5)*5;return m>hm(s.cierra)?null:aFecha(0,m);}
function slots(s,dia){
  let m=hm(s.abre)+lead();
  if(dia===0)m=Math.max(m,minsHoy()+lead());
  m=Math.ceil(m/30)*30;
  const out=[];for(;m<=hm(s.cierra);m+=30)out.push(aFecha(dia,m));
  return out;
}
const fh=d=>new Date(d).toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});
function fdia(d){
  const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);
  const n=Math.round((b-a)/864e5);
  return n===0?'hoy':n===1?'mañana':n===-1?'ayer':b.toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'short'});
}
const cuando=d=>fdia(d)+' a las '+fh(d);
function asegurarRetiro(){
  const r=C.retiro;
  if(!suc(r.suc)||suc(r.suc).activa===false)r.suc=(sucs().find(abierta)||sucs()[0])?.k||null;
  const s=suc(r.suc);if(!s)return;
  if(r.modo==='asap'&&!asap(s))r.modo='prog';
  if(r.modo==='prog'){
    const h=r.hora?new Date(r.hora):null;
    if(!h||+h<Date.now()||!slots(s,r.dia).some(x=>+x===+h)){
      if(!slots(s,r.dia).length&&r.dia===0)r.dia=1;
      r.hora=(slots(s,r.dia)[0]||null)?.toISOString()||null;
    }
  }
  if(r.entrega==='carro'&&!T().alCarro)r.entrega='tienda';
  if(r.entrega==='envio'&&T().envio===false)r.entrega='tienda';
  r.carro=r.entrega==='carro';
}
function horaRetiro(){
  const s=suc(C.retiro.suc);if(!s)return null;
  if(C.retiro.modo==='asap')return asap(s);
  const h=C.retiro.hora?new Date(C.retiro.hora):null;
  return h&&+h>Date.now()?h:null;
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

// ══════════════ Qué falta (nunca un botón muerto sin explicación) ══════════════
const telDig=t=>String(t||'').replace(/\D/g,'').replace(/^506/,'');
const fmtTel=t=>{const d=telDig(t);return d.length===8?d.slice(0,4)+'-'+d.slice(4):d;};
const perfilOk=()=>C.perfil.nombre.trim().length>=2&&telDig(C.perfil.tel).length===8;
function faltaArmar(){return cestaN()?null:{m:'Agregá al menos un producto',p:'armar',f:'tlQ'};}
function faltaRetiro(){
  if(!suc(C.retiro.suc))return{m:'Elegí la tienda',p:'entrega'};
  if(!horaRetiro())return{m:'Elegí la hora',p:'entrega'};
  if(esEnvio()&&!C.retiro.ubi)return{m:'Falta tu ubicación para el envío',p:'entrega',f:'tlUbiBtn'};
  return null;
}
function faltaPago(){
  if(C.perfil.nombre.trim().length<2)return{m:'Escribí tu nombre',p:'pago',f:'tlNombre'};
  if(telDig(C.perfil.tel).length!==8)return{m:'El teléfono debe tener 8 números',p:'pago',f:'tlTel'};
  return null;
}
const faltaAlgo=()=>faltaArmar()||faltaRetiro()||faltaPago();
function avisarFalta(x){
  toast(x.m);buzz([40,40,40]);
  if(x.f==='tlNombre'||x.f==='tlTel')C.editPerfil=true;
  if(C.actual||C.paso!==x.p)ir(x.p);else render();
  setTimeout(()=>{const el=x.f&&$(x.f);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});if(el.tagName==='INPUT')el.focus({preventScroll:true});el.classList.add('falta');setTimeout(()=>el.classList.remove('falta'),1600);}},140);
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

// ══════════════ El ciclo ══════════════
const ARMANDO=['armar','entrega','pago','sellar'];
const NOMBRE={armar:'Canasta',entrega:'Entrega',pago:'Pago',sellar:'Sellar'};
const STEPS=[
  {n:'Armar canasta',d:'Escribí tu lista, elegí una receta o tocá productos.'},
  {n:'Entrega',d:'En la tienda, al carro o a tu casa con Uber.'},
  {n:'Pago',d:'SINPE, tarjeta o efectivo. Siempre el total exacto.'},
  {n:'Sellar pedido',d:'Revisás el comprobante y recibís tu código de retiro.'},
  {n:'Alistamos',d:'Escogemos y pesamos cada producto; lo ves en vivo.'},
  {n:'Recogés',d:'Te avisamos y lo recogés con tu código.'},
];
const pedidoVisto=()=>C.actual?N.get(C.actual):null;
function listoArmando(i){return [!faltaArmar(),C.retiro.visto&&!faltaRetiro(),!faltaPago(),false][i];}
function activoIdx(){
  const o=pedidoVisto();
  if(o)return ['listo','entregado'].includes(o.estado)?5:4;
  return ARMANDO.indexOf(C.paso);
}
function siguientePaso(){
  const a=ARMANDO.indexOf(C.paso);
  for(let j=a+1;j<3;j++)if(!listoArmando(j))return ARMANDO[j];
  return 'sellar';
}
function puedeIr(paso){
  const j=ARMANDO.indexOf(paso);
  if(j>=1){const f=faltaArmar();if(f)return f;}
  if(j>=2&&!(C.paso==='entrega'||C.retiro.visto)){return{m:'Primero elegí cómo la recibís',p:'entrega'};}
  if(j>=2){const f=faltaRetiro();if(f)return f;}
  if(j>=3){const f=faltaPago();if(f)return f;}
  return null;
}
function pasos(){
  const o=pedidoVisto(),envio=o?!!o.retiro?.envio:esEnvio(),a=activoIdx();
  return STEPS.map((s,i)=>{
    const r={...s,i};
    if(i===5&&envio){r.n='Te llega';r.d='Sale con Uber a tu ubicación y te avisamos.';}
    if(o){
      const E=o.estado;
      r.st=i<4?'done':i===4?(E==='cancelado'?'bad':E==='nuevo'||E==='alistando'?'on':'done'):(E==='listo'?'on':E==='entregado'?'done':'fut');
      r.sum=resumenPedido(o,i,r.d);r.nav=i===5&&['listo','entregado'].includes(E);
    }else{
      r.st=i===a?'on':(i<4&&listoArmando(i))?'done':'fut';
      r.sum=resumenArmando(i,r);r.nav=i<4&&i!==a;
    }
    return r;
  });
}
function emojis(items,n=7){const e=items.map(x=>x.e||x.p?.e).filter(Boolean);return e.slice(0,n).join('')+(e.length>n?'…':'');}
function resumenArmando(i,r){
  if(i===0&&cestaN())return `<b>${cestaN()} productos</b> · ${$c(cestaTotal())} aprox. <span class="emo">${emojis(cestaItems())}</span>`;
  if(i===1&&listoArmando(1)){const s=suc(C.retiro.suc),h=horaRetiro();return `${esc(entregaTxt(C.retiro))} · <b>${esc(s.n)}</b> · ${esc(cuando(h))}`;}
  if(i===2&&listoArmando(2))return `<b>${esc(C.perfil.nombre.trim())}</b> · ${esc(fmtTel(C.perfil.tel))} · ${esc(N.PAGOS[C.pago.metodo]?.n||'')}`;
  if(i===3&&r.st==='on')return 'Revisá el comprobante y sellalo.';
  return esc(r.d);
}
function resumenPedido(o,i,d){
  const s=suc(o.sucursal),{r,n}=avance(o);
  if(i===0)return `<b>${o.items.length} productos</b> <span class="emo">${emojis(o.items)}</span>`;
  if(i===1)return `${esc(entregaTxt(o.retiro))} · <b>${esc(s?.n||'')}</b> · ${esc(cuando(o.retiro.at))}`;
  if(i===2)return `<b>${esc(o.cliente.nombre)}</b> · ${esc(N.PAGOS[o.pago.metodo]?.n||'')}${o.pago.estado==='verificado'?' · <b>pagado</b>':''}`;
  if(i===3)return `Sellado ${esc(fdia(o.created))} ${esc(fh(o.created))} · <code>${esc(o.ref)}</code>`;
  if(i===4){
    if(o.estado==='cancelado')return `<b>Cancelado</b>${o.motivo?' · '+esc(o.motivo):''}`;
    if(o.estado==='nuevo'){
      if(N.modo()!=='nube'&&!o.avisado)return o.waPendiente?'<b>WhatsApp abierto</b> · confirmá el envío.':'<b>Falta avisar a la tienda</b> por WhatsApp.';
      return N.modo()!=='nube'&&o.avisado?'<b>Pendiente de aceptación</b> por la tienda.':'<b>Recibido</b> · pendiente de aceptación.';
    }
    if(o.estado==='alistando')return `<b>${r} de ${n}</b> escogidos`;
    const p=pesoReal(o);return `Escogido y pesado${p?` · ${kg(p)} kg`:''}`;
  }
  if(i===5&&o.estado==='alistando')return '<b>Esperando</b> · se habilita cuando la tienda marque el pedido como listo.';
  if(o.estado==='listo')return o.retiro.envio?(o.retiro.envio.uber?'<b>Va en camino</b> con Uber.':'<b>Lista</b> · pidiendo el Uber.'):`<b>Lista</b> · te espera en ${esc(s?.n||'')}.`;
  if(o.estado==='entregado')return `<b>Entregado</b> ${esc(fdia(o.entregado||o.updated))} ${esc(fh(o.entregado||o.updated))}`;
  return esc(d);
}

// ══════════════ Navegación ══════════════
function ir(paso){
  C.actual=null;C.paso=paso;
  if(paso==='entrega'){asegurarRetiro();C.retiro.visto=true;guardar();}
  empujar();render(true);arriba();
}
function ver(id){C.actual=id;empujar();render(true);arriba();}
function empujar(){if(!MINI)history.pushState({paso:C.paso,id:C.actual},'',location.pathname+location.search);}
function arriba(){
  if(MINI)return;
  requestAnimationFrame(()=>{
    const actual=document.querySelector('.step.on');
    actual?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    if(DESK.matches){window.scrollTo({top:0,behavior:'smooth'});return;}
    const li=actual;
    if(li)window.scrollTo({top:li.getBoundingClientRect().top+window.scrollY-10,behavior:'smooth'});
  });
}
window.addEventListener('popstate',e=>{
  if(H){cerrarHoja(true);return;}
  C.paso=e.state?.paso||'armar';C.actual=e.state?.id||null;
  render(true);
});

// ══════════════ Mesa de trabajo ══════════════
function cab(n,titulo,verdict,cls){return `<div class="mesa-h"><div><p class="kicker">Paso ${n} · Mesa de trabajo</p><h2>${titulo}</h2></div><span class="verdict ${cls||''}">${esc(verdict)}</span></div>`;}
function metric(l,v){return `<div class="metric"><span>${l}</span><b>${v}</b></div>`;}
function dual(a,b,c,d){return `<div class="dual"><div><h4>${a}</h4><p>${b}</p></div><div><h4 class="w">${c}</h4>${d}</div></div>`;}
function siguienteBtn(){
  const sig=siguientePaso();
  return `<button type="button" class="btn big${puedeIr(sig)?' apagado':''}" data-act="siguiente">Siguiente: ${NOMBRE[sig]} →</button>`;
}

function mesaArmar(){
  const it=cestaItems(),n=it.length,u=ultimoPedido();
  const todas=RECETAS(),cats=(CFG.categoriasRecetas||[]).filter(c=>todas.some(r=>r.c===c.k));
  const filtradas=C.recCat==='todas'?todas:todas.filter(r=>r.c===C.recCat);
  const recetas=C.verRecetas?filtradas:filtradas.slice(0,4);
  const presets=(u&&!n?`<button type="button" class="preset hi" data-act="repetir" data-id="${u.id}" data-express="1"><span class="e">⚡</span><span class="t">Repetir mi última canasta</span><small>${u.items.length} prod · ${$c(N.totalDe(u))}</small></button>`:'')
    +recetas.map(r=>`<button type="button" class="preset" data-act="receta" data-k="${r.k}"><span class="e">${r.e}</span><span class="t">${esc(r.n)}</span><small>${r.items.length} ingred. · ${$c(costoReceta(r,C.personas))}</small></button>`).join('');
  const sug=sugerencias();
  return cab(1,'¿Qué necesitás?',n?'Armando':'Vacía',n?'run':'')
  +`<div class="stage${C.pulso?' pulse':''}"><span class="tag">Tu canasta · en vivo</span><span class="tag r">Referencia</span><div class="scan"></div>
    ${n?`<div class="holo">${it.map(x=>`<button type="button" class="holo-it${x.k===C.ultimo?' nuevo':''}" data-act="info" data-k="${x.k}" aria-label="${esc(x.p.n)}"><b>${x.p.e}</b><em>${esc(x.p.n)}</em><small>${esc(qtxt(x.q,x.p.u))}</small></button>`).join('')}</div>`
      :`<div class="holo-vacio"><b>🧺</b>Tu canasta aparece aquí mientras la armás.</div>`}</div>
  <div class="metrics">${metric('Productos',n)}${metric('Peso aprox.',cestaPeso()?kg(cestaPeso())+' kg':'—')}${metric('Total aprox.',$c(cestaTotal()))}</div>
  ${sug.length?`<div class="sec"><p class="kicker">Para completar · suele ir con lo tuyo</p><div class="tgs">${sug.map(p=>`<button type="button" class="tg" data-act="sumar" data-k="${p.k}">＋ ${p.e} ${esc(p.n)} <small>${porU(p)}</small></button>`).join('')}</div></div>`:''}
  <div class="sec"><p class="kicker">Escribí o dictá tu lista</p>
    <form class="ask" id="tlAsk" autocomplete="off"><input id="tlQ" type="search" enterkeyhint="go" placeholder="Ej.: 2 kg de tomate" value="${esc(C.q)}" aria-label="Escribí tu lista o buscá un producto"><button type="button" class="mic" id="tlMic" aria-label="Dictar lista">🎙️</button><button type="submit" class="btn">Armar</button></form>
    <div id="tlParse">${parseHtml()}</div></div>
  <div class="sec"><p class="kicker">Recetario · ${todas.length} recetas para ${C.personas} ${C.personas===1?'persona':'personas'}</p>
    <div class="pasillos" style="margin-bottom:8px">${[{k:'todas',n:'Todas',e:'📖'},...cats].map(c=>`<button type="button" class="tg${C.recCat===c.k?' on':''}" data-act="rec-cat" data-k="${c.k}">${c.e} ${esc(c.n)}</button>`).join('')}</div>
    <div class="presets">${presets}</div>
    ${filtradas.length>4?`<p class="note"><button type="button" class="link" data-act="mas-recetas">${C.verRecetas?'Ver menos':'Ver las '+filtradas.length+' recetas'}</button></p>`:''}</div>
  <div class="sec"><p class="kicker" id="tlGridT">Pasillos</p><div class="pasillos" id="tlPasillos"></div><div class="prods" id="tlGrid"></div></div>
  ${dual('Se paga lo que pese','1 kg puede pesar 1,050 kg o 0,980 kg. Lo pesamos al alistar y pagás el monto exacto de lo que llevás.','Si algo no hay',`<div class="tgs">${Object.entries(SUST).map(([k,s])=>`<button type="button" class="tg${C.sust===k?' on':''}" data-act="sust" data-k="${k}">${s.e} ${s.n}</button>`).join('')}</div>`)}
  <div class="next">${siguienteBtn()}</div>`;
}
function parseHtml(){
  const P=C.parse;if(!P)return '';
  const ok=P.filter(x=>x.p&&x.on);
  return `<div class="parse fade"><p class="kicker" style="margin:0">Entendí esto · tocá para quitar o poner</p><div class="parse-l">${P.map((x,i)=>x.p?`<button type="button" class="tg${x.on?' on':''}" data-act="parse-t" data-i="${i}">${x.p.e} ${esc(qtxt(x.q,x.p.u))} ${esc(x.p.n)}${x.p.agotado?' <small>agotado</small>':''}</button>`:`<span class="tg bad">❓ “${esc(x.txt)}”</span>`).join('')}</div><div class="row"><button type="button" class="btn" data-act="parse-ok" ${ok.length?'':'disabled'}>Agregar ${ok.length} a la canasta</button><button type="button" class="btn ghost" data-act="parse-no">Cancelar</button></div></div>`;
}
function tile(p){
  const q=C.cesta[p.k]?.q||0;
  return `<div class="pt${q?' in':''}${p.agotado?' off':''}" role="button" tabindex="0" data-act="tile" data-k="${p.k}" aria-label="${esc(p.n)}">
    ${p.agotado?'<span class="pt-q r">AGOTADO</span>':q?`<span class="pt-q">${esc(qtxt(q,p.u))}</span>`:''}
    <span class="pt-e">${p.e}</span><span class="pt-n">${esc(p.n)}</span>${p.d?`<span class="pt-d">${esc(p.d)}</span>`:''}<span class="pt-p">${porU(p)}</span>
    ${q?`<div class="step-q"><button type="button" data-act="menos" data-k="${p.k}" aria-label="Menos">−</button><span>${$c(q*p.p)}</span><button type="button" data-act="mas" data-k="${p.k}" aria-label="Más">+</button></div>`:p.agotado?'':'<span class="pt-add">＋ AGREGAR</span>'}
  </div>`;
}
function pintarGrid(){
  const g=$('tlGrid');if(!g)return;
  const q=norm(C.q).replace(/[\d.,]+/g,' ').replace(/\b(kg|kilos?|unid\w*|rollos?)\b/g,' ').trim();
  const pas=$('tlPasillos');pas.hidden=!!q;
  const pasillos=(favoritos().length>=3?[{k:'fav',n:'Tus favoritos',e:'💚'}]:[]).concat(CFG.pasillos);
  pas.innerHTML=pasillos.map(p=>`<button type="button" class="tg${C.pasillo===p.k?' on':''}" data-act="pasillo" data-k="${p.k}">${p.e} ${esc(p.n)}</button>`).join('');
  let lista;
  if(q){
    const w=q.split(/\s+/).filter(t=>!VACIAS.has(t));
    lista=cat().filter(p=>{const n=norm(p.n);return w.every(t=>n.includes(t.replace(/(es|s)$/,'')));});
    $('tlGridT').textContent=`Resultados · ${lista.length}`;
  }else{
    const fav=favoritos();
    if(!C.pasillo)C.pasillo=fav.length>=3?'fav':'top';
    lista=C.pasillo==='fav'?fav:cat().filter(p=>C.pasillo==='top'?p.top:p.c===C.pasillo);
    $('tlGridT').textContent='Pasillos · '+(C.pasillo==='fav'?'Tus favoritos':CFG.pasillos.find(p=>p.k===C.pasillo)?.n||'');
  }
  g.innerHTML=lista.length?lista.map(tile).join(''):`<div class="vacio">No encontramos “${esc(C.q)}”. <button type="button" class="link" data-act="limpiar-q">Ver todos los pasillos</button></div>`;
}

function mesaEntrega(){
  asegurarRetiro();
  const r=C.retiro,s=suc(r.suc),t=T(),env=r.entrega==='envio',h=horaRetiro(),f=faltaRetiro();
  const modos=[['tienda','🚶','En la tienda'],...(t.alCarro?[['carro','🚗','Al carro']]:[]),...(t.envio!==false?[['envio','🛵','A mi casa']]:[])];
  const destino=env?['🛵','Tu casa',r.ubi?'ubicación lista':'falta ubicación']:r.entrega==='carro'?['🚗','Tu carro',r.placa||'te la llevamos']:['🚶','Mostrador','pasás adentro'];
  const opcSuc=sucs().map(x=>{
    const ab=abierta(x),a=asap(x);
    return `<button type="button" class="opt${r.suc===x.k?' on':''}" data-act="suc" data-k="${x.k}"><span class="oi">${x.k==='moravia'?'🏠':'📍'}</span><span class="ot"><strong>${esc(x.n)} · ${esc(x.zona)}</strong><small><span class="${ab?'abierto':'cerrado'}">${ab?'Abierto':'Cerrado'}</span> · ${ab?'cierra '+fh(aFecha(0,hm(x.cierra))):'abre '+fh(aFecha(0,hm(x.abre)))}${a?' · lista '+fh(a):''}</small></span><span class="ok">✓</span></button>`;
  }).join('');
  let horaH='';
  if(s){
    const a=asap(s);
    horaH=`<div class="opts">
      <button type="button" class="opt${r.modo==='asap'?' on':''}" data-act="cuando" data-v="asap" ${a?'':'disabled'}>${a?'<span class="star">RECOMENDADO</span>':''}<span class="oi">⚡</span><span class="ot"><strong>Lo antes posible</strong><small>${a?`Lista hoy a las ${fh(a)} · unos ${lead()} min`:'Hoy ya no da tiempo; programala'}</small></span><span class="ok">✓</span></button>
      <button type="button" class="opt${r.modo==='prog'?' on':''}" data-act="cuando" data-v="prog"><span class="oi">🗓️</span><span class="ot"><strong>Programar</strong><small>${r.modo==='prog'&&h?'Para '+cuando(h):'Elegí día y hora'}</small></span><span class="ok">✓</span></button>
    </div>
    ${r.modo==='prog'?`<div class="card2" style="margin-top:10px"><div class="tgs">${[0,1,2].map(d=>`<button type="button" class="tg${r.dia===d?' on':''}" data-act="dia" data-d="${d}">${d===0?'Hoy':d===1?'Mañana':aFecha(2,0).toLocaleDateString('es-CR',{weekday:'long'})}</button>`).join('')}</div><div class="slots">${slots(s,r.dia).map(x=>`<button type="button" class="tg${r.hora&&+new Date(r.hora)===+x?' on':''}" data-act="hora" data-h="${x.toISOString()}">${fh(x)}</button>`).join('')||'<span class="note">Ese día ya no hay horas. Probá otro.</span>'}</div></div>`:''}`;
  }
  const u=r.ubi;
  const ubiH=env?`<div class="card2">
      ${u?`<iframe class="ubi-mapa" title="Tu ubicación" src="${mapaEmbed(u)}" loading="lazy"></iframe><div class="ubi-ok"><span>📍 <b>Ubicación lista</b>${u.acc?` · ±${u.acc} m`:''}</span><button type="button" class="link" data-act="ubi-gps">Volver a tomar</button></div>`
        :`<button type="button" class="btn w" id="tlUbiBtn" data-act="ubi-gps">📍 Usar mi ubicación actual</button><input class="inp" id="tlUbiLink" style="margin-top:10px" placeholder="…o pegá un link de Google Maps" autocomplete="off">`}
      <input class="inp" id="tlSenas" style="margin-top:10px" placeholder="Señas: casa verde, portón negro…" value="${esc(r.senas||'')}" autocomplete="street-address"></div>`:'';
  return cab(2,env?'¿Cuándo y adónde te la enviamos?':'¿Dónde y cuándo la recogés?',f?'Falta '+f.m.replace(/^Elegí |^Falta /,'').replace(' para el envío',''):'Listo',f?'warn':'ok')
  +`<div class="stage${C.pulso?' pulse':''}"><span class="tag">Ruta del pedido</span><div class="scan"></div>
    <div class="ruta"><div class="n on"><b>🏪</b><strong>${esc(s?.n||'Tienda')}</strong>${esc(s?.zona||'')}</div><i></i>
      <div class="n${h?' on':''}"><b>🕐</b><strong>${h?esc(fh(h)):'—'}</strong>${h?esc(fdia(h)):'elegí hora'}</div><i></i>
      <div class="n${f?'':' on'}"><b>${destino[0]}</b><strong>${destino[1]}</strong>${esc(destino[2])}</div></div></div>
  <div class="sec"><p class="kicker">¿Cómo la recibís?</p><div class="seg" style="grid-template-columns:repeat(${modos.length},minmax(0,1fr))">${modos.map(([k,e,n])=>`<button type="button" class="${r.entrega===k?'on':''}" data-act="entrega" data-v="${k}">${k==='envio'?'<span class="star">UBER</span>':''}<b>${e}</b>${n}</button>`).join('')}</div>
    ${r.entrega==='carro'?`<input class="inp" id="tlPlaca" style="margin-top:10px" placeholder="Placa o color del carro (opcional)" value="${esc(r.placa)}" autocomplete="off">`:''}${ubiH}</div>
  <div class="sec"><p class="kicker">${env?'Sale desde':'Tienda'}</p><div class="opts">${opcSuc}</div></div>
  <div class="sec"><p class="kicker">${env?'Hora de salida':'Hora'}</p>${horaH}</div>
  ${dual('Te avisamos','Cuando esté lista te avisamos aquí mismo y por WhatsApp.',env?'Envío':'Si llegás antes',`<p>${env?'Uber cobra aparte según su tarifa; te confirmamos el monto antes de pagar.':'Te la terminamos ahí mismo, sin hacer fila.'}</p>`)}
  <div class="next"><button type="button" class="btn ghost" data-act="ir" data-p="armar">← Canasta</button>${siguienteBtn()}</div>`;
}

function mesaPago(){
  const P=C.perfil,t=T(),tot=cestaTotal(),f=faltaPago();
  const metodos=Object.entries(N.PAGOS).filter(([k])=>k!=='link'||t.linkTarjeta);
  if(!metodos.some(([k])=>k===C.pago.metodo))C.pago.metodo='sinpe';
  const M=N.PAGOS[C.pago.metodo];
  const quien=perfilOk()&&!C.editPerfil
    ?`<div class="yo"><span class="av">${esc(P.nombre.trim()[0]?.toUpperCase()||'·')}</span><div class="t"><strong>${esc(P.nombre)}</strong><small>${esc(fmtTel(P.tel))} · aquí te avisamos</small></div><button type="button" class="link" data-act="edit-perfil">Cambiar</button></div>`
    :`<div class="dos"><label><span class="vh">Nombre</span><input class="inp" id="tlNombre" placeholder="Tu nombre" autocomplete="given-name" value="${esc(P.nombre)}"></label><label><span class="vh">Teléfono</span><input class="inp" id="tlTel" placeholder="Teléfono" inputmode="tel" autocomplete="tel" maxlength="20" value="${esc(P.tel)}"></label></div><div class="err" id="tlPerfilErr"></div>`;
  const ef=C.pago.metodo==='efectivo'?`<div class="card2"><p class="kicker" style="margin-bottom:8px">¿Con cuánto pagás?</p><div class="tgs">${[0,...billetes(tot)].map(v=>`<button type="button" class="tg${(+C.pago.conCuanto||0)===v?' on':''}" data-act="con" data-v="${v}">${v?$c(v):'Exacto'}</button>`).join('')}</div></div>`:'';
  return cab(3,'¿A nombre de quién y cómo pagás?',f?'Faltan datos':'Listo',f?'warn':'ok')
  +`<div class="stage${C.pulso?' pulse':''}"><span class="tag">Así vas a pagar</span><div class="scan"></div>
    <div class="holo-vacio" style="color:var(--ink)"><b style="opacity:1;filter:none">${M.e}</b><span style="font-family:var(--display);font-size:20px;font-weight:600;letter-spacing:.03em">${$c(tot)} aprox.${esEnvio()?' + envío':''}</span><br><span style="color:var(--muted)">${esc(M.n)} · ${esc(M.txt)}</span></div></div>
  <div class="sec"><p class="kicker">A nombre de</p>${quien}</div>
  <div class="sec"><p class="kicker">Forma de pago</p><div class="opts">${metodos.map(([k,m])=>`<button type="button" class="opt${C.pago.metodo===k?' on':''}" data-act="metodo" data-k="${k}">${k==='sinpe'?'<span class="star">MÁS RÁPIDO</span>':''}<span class="oi">${m.e}</span><span class="ot"><strong>${m.n}</strong><small>${m.txt}</small></span><span class="ok">✓</span></button>`).join('')}</div>${ef}</div>
  ${dual('Total exacto','Pagás lo que pesó tu canasta, ni un colón más.','Nada por adelantado','<p>No pagás nada hasta que tu canasta esté lista.</p>')}
  <div class="next"><button type="button" class="btn ghost" data-act="ir" data-p="entrega">← Entrega</button>${siguienteBtn()}</div>`;
}
function billetes(t){
  const out=[];
  [5000,10000,20000,50000].forEach(b=>{const v=Math.ceil(t/b)*b;if(v>t&&!out.includes(v)&&out.length<3)out.push(v);});
  return out;
}

function mesaSellar(){
  const it=cestaItems(),s=suc(C.retiro.suc),h=horaRetiro(),f=faltaAlgo(),tot=cestaTotal(),M=N.PAGOS[C.pago.metodo];
  return cab(4,'Revisá y sellá tu pedido',f?'Falta: '+f.m.toLowerCase():'Listo para sellar',f?'warn':'ok')
  +`<div class="stage"><span class="tag">Comprobante</span><span class="tag r">Aproximado</span>
    <div class="ticket">${it.map(x=>`<div class="l"><span>${x.p.e} ${esc(qtxt(x.q,x.p.u))} ${esc(x.p.n)}${x.mad?' · '+esc(MAD[x.mad].toLowerCase()):''}</span><span>${$c(x.q*x.p.p)}</span></div>`).join('')||'<div class="l m"><span>Sin productos</span><span></span></div>'}
      <hr><div class="l m"><span>${esc(entregaTxt(C.retiro))} · ${esc(s?.n||'—')}</span><span>${h?esc(fh(h)):'—'}</span></div>
      <div class="l m"><span>${M.e} ${esc(M.n)}</span><span>${esc(C.perfil.nombre.trim()||'—')}</span></div>
      <div class="l m"><span>${SUST[C.sust].e} Si algo no hay: ${SUST[C.sust].n.toLowerCase()}</span><span></span></div>
      ${esEnvio()?'<div class="l m"><span>🛵 Envío Uber</span><span>se confirma</span></div>':''}
      <hr><div class="l t"><span>TOTAL APROX.</span><span>${$c(tot)}</span></div></div></div>
  <details class="sec"${C.nota?' open':''}><summary class="link">📝 Nota para quien alista (opcional)</summary><textarea class="inp" id="tlNota" style="margin-top:10px" placeholder="Ej.: los aguacates para el domingo, bolsas aparte…">${esc(C.nota)}</textarea></details>
  ${dual('Al sellar','La tienda lo recibe al instante y te damos tu código de retiro.','Podés cancelar','<p>Mientras no lo empiecen a alistar, sin costo.</p>')}
  ${N.modo()!=='nube'?'<p class="note">💬 Después de sellar te aparece un botón para avisarle a la tienda por WhatsApp.</p>':''}
  <div class="next"><button type="button" class="btn ghost" data-act="ir" data-p="pago">← Pago</button><button type="button" class="btn big${f?' apagado':''}" data-act="pedir" id="tlSellar">🔒 Sellar pedido · ${$c(tot)}</button></div>`;
}

function mesaPedido(o){
  const s=suc(o.sucursal),{r,n}=avance(o),t=T(),total=N.totalDe(o),aprox=N.esAprox(o),E=o.estado,env=o.retiro.envio;
  const fin=E==='entregado'||E==='cancelado',local=N.modo()!=='nube';
  const waPendiente=!!o.waPendiente&&!o.avisado;
  const V={nuevo:local&&!o.avisado?(waPendiente?['WhatsApp abierto','warn']:['Falta avisar','warn']):local&&o.avisado?['Pendiente de aceptación','run']:['Pendiente de aceptación','run'],alistando:[`Alistando ${r}/${n}`,'run'],listo:[env?(env.uber?'En camino':'Lista'):'Lista','ok'],entregado:['Entregado','ok'],cancelado:['Cancelado','bad']}[E]||['—',''];
  const titulo={nuevo:local&&!o.avisado?(waPendiente?'Confirmá el envío por WhatsApp':'Recibimos tu pedido'):local&&o.avisado?'Pedido enviado a la tienda':'Pedido recibido',alistando:'Estamos escogiendo tu canasta',listo:env?'Tu canasta va en camino':'¡Tu canasta está lista!',entregado:'¡Que la disfrutés!',cancelado:'Pedido cancelado'}[E]||'Tu pedido';
  const holo=o.items.map(i=>{
    const cls=i.estado==='listo'?'ok':i.estado==='nohay'?'no':E==='alistando'?'wait':'';
    const q=i.qr!=null&&i.qr!==''?+i.qr:i.q;
    return `<div class="holo-it ${cls}" title="${esc(i.n)}"><b>${i.e}</b><em>${esc(i.n)}</em><small>${esc(qtxt(q,i.u))}</small></div>`;
  }).join('');
  const ahora={nuevo:local&&!o.avisado?(waPendiente?'WhatsApp quedó abierto. Regresá aquí y confirmá únicamente después de tocar Enviar.':'Tu pedido está sellado en este teléfono; falta mandárselo a la tienda.'):(local?'La tienda recibió el WhatsApp y el pedido está pendiente de aceptación.':'La tienda recibió tu pedido y está pendiente de aceptarlo.'),alistando:'Están escogiendo y pesando cada producto. Los ✓ verdes ya están en tu canasta.',listo:env?'Tu canasta salió con Uber hacia tu ubicación.':`Te espera en ${esc(s?.n||'')} (${esc(s?.zona||'')}).`,entregado:'Tu pedido quedó entregado.',cancelado:esc(o.motivo||'El pedido no siguió.')}[E];
  const sigue={nuevo:'La tienda lo acepta y empieza a escoger.',alistando:'Cuando la tienda marque “Lista”, el paso 6 se desbloquea automáticamente.',listo:env?'Recibís tu canasta en tu casa.':`Pasá ${esc(cuando(o.retiro.at))} con tu código.`,entregado:'Calificá y repetila cuando querás.',cancelado:'Podés armar otro pedido cuando querás.'}[E];
  return cab(E==='listo'||E==='entregado'?6:5,titulo,V[0],V[1])
  +`<div class="stage${E==='alistando'?' running':''}"><span class="tag">Pedido ${esc(o.ref)} · en vivo desde la tienda</span><div class="scan"></div><div class="holo">${holo}</div></div>
  <div class="metrics">${metric('Escogidos',`${r}/${n}`)}${metric('Peso real',pesoReal(o)?kg(pesoReal(o))+' kg':'—')}${metric(aprox?'Total aprox.':'Total exacto',$c(total))}</div>
  ${detallePeso(o)}
  ${!fin&&N.avisos.soportado()&&N.avisos.permiso()==='default'?`<div class="card2"><h3>🔔 ¿Te avisamos en el teléfono?</h3><p>Te llega una notificación cuando tu canasta esté lista, aunque estés en otra app.</p><button type="button" class="btn ghost w" style="margin-top:10px" data-act="avisame">Avisarme cuando esté lista</button></div>`:''}
  ${E==='alistando'?`<div class="card2 t"><h3>⏳ Paso 5 en curso</h3><p>La tienda está escogiendo y pesando tu pedido. Cuando lo marque como listo, se habilita el paso 6.</p>${local?`<p>Este pedido se comparte por WhatsApp. Pedile a la tienda que te mande el enlace de seguimiento actualizado para abrir el paso 6.</p><button type="button" class="btn ghost w" style="margin-top:10px" data-act="wa-estado">💬 Pedir actualización a la tienda</button>`:`<button type="button" class="btn ghost w" style="margin-top:10px" data-act="actualizar-pedido">🔄 Revisar estado</button>`}</div>`:''}
  ${E==='listo'?`<div class="card2"><h3>✅ Paso 6 desbloqueado</h3><p>La tienda confirmó que tu pedido está listo. Continuá para ver tu código de retiro o los detalles de entrega.</p><button type="button" class="btn w" style="margin-top:10px" data-act="paso6">Continuar al paso 6 →</button></div>`:''}
  ${E==='nuevo'&&local&&!o.avisado?(waPendiente?`<div class="card2 t"><h3>💬 Confirmá el envío</h3><p>WhatsApp ya se abrió, pero ARAMO no puede saber si tocaste <b>Enviar</b>. Confirmalo solo después de verlo enviado.</p><div class="acciones"><button type="button" class="btn w" data-act="wa-enviar">Abrir WhatsApp de nuevo</button><button type="button" class="btn" data-act="wa-confirmar">✅ Ya lo envié</button></div></div>`:`<div class="card2 t"><h3>💬 Último paso: avisale a la tienda</h3><p>WhatsApp se abrirá con el pedido listo. Después regresá y confirmá el envío.</p><button type="button" class="btn w" style="margin-top:10px" data-act="wa-enviar">Abrir WhatsApp</button></div>`):''}
  ${!fin?`<div class="sello" id="tlStep6"><div class="qr" id="tlQR" aria-label="Código QR de retiro"></div><div><p class="kicker" style="margin:0">Código de retiro</p><div class="pin">${esc(o.pin)}</div><small>${env?'Dáselo al repartidor si te lo pide':'Mostralo al recoger'}${o.retiro.carro?' · te la llevamos al carro':''}</small><small class="mono">Pedido ${esc(o.ref)} · sellado ${esc(fh(o.created))}</small></div></div>`:''}
  ${pagoHtml(o,total,aprox)}
  ${env?`<div class="card2"><h3>🛵 Envío con Uber</h3><p>${env.uber?`Pedido a las ${esc(fh(env.uber))} · va en camino.`:'Lo pedimos apenas tu canasta esté lista.'}${+env.costo?` Envío: ${$c(env.costo)} (incluido en el total).`:''}</p></div>`:''}
  ${dual('Qué pasa ahora',ahora,'Qué sigue',`<p>${sigue}</p>`)}
  ${E==='entregado'?`<div class="card2" style="text-align:center"><h3>¿Qué tal estuvo todo?</h3><div class="caritas">${['😍','🙂','😐'].map((c,i)=>`<button type="button" class="${o.rating===3-i?'on':''}" data-act="rating" data-v="${3-i}" aria-label="Calificar ${3-i}">${c}</button>`).join('')}</div><button type="button" class="btn w" style="margin-top:12px" data-act="repetir" data-id="${o.id}">🔁 Repetir esta canasta</button></div>`:''}
  <div class="acciones">${s&&!env&&!fin?`<button type="button" class="btn ghost" data-act="mapa">🗺️ Cómo llegar</button>`:''}<button type="button" class="btn ghost" data-act="wa-tienda">💬 Escribir a la tienda</button>${E==='nuevo'?`<button type="button" class="btn bad" style="grid-column:1/-1" data-act="cancelar">Cancelar pedido</button>`:''}</div>
  <div class="next"><button type="button" class="btn${fin?'':' ghost'}" data-act="nuevo">＋ Nuevo pedido</button></div>`;
}
// Lista con nombres: lo que pediste contra lo que pesó (el monto final sale de aquí)
function detallePeso(o){
  if(o.estado==='nuevo'||o.estado==='cancelado')return '';
  let dif=0;
  const filas=o.items.map(i=>{
    const real=i.qr!=null&&i.qr!=='',q=real?+i.qr:+i.q,pr=i.pr!=null&&i.pr!==''?+i.pr:+i.p;
    if(i.estado==='nohay')return `<div class="l m"><span>${i.e} ${esc(i.n)} · no hubo</span><span>₡0</span></div>`;
    const d=real&&i.u==='kg'&&Math.abs(q-i.q)>1e-9?q-i.q:0;dif+=(q-i.q)*pr;
    return `<div class="l"><span>${i.e} ${esc(i.n)} · ${d?`pediste ${esc(qtxt(i.q,i.u))} → <b>pesó ${esc(kg(q))} kg</b>`:esc(qtxt(q,i.u))}</span><span>${$c(q*pr)}</span></div>`;
  }).join('');
  const env=+o.retiro?.envio?.costo||0;
  return `<div class="card2"><p class="kicker" style="margin-bottom:6px">Tu canasta · lo que pesó cada producto</p><div class="ticket">${filas}${env?`<div class="l m"><span>🛵 Envío Uber</span><span>${$c(env)}</span></div>`:''}<hr>${Math.abs(dif)>=1?`<div class="l m"><span>Ajuste por peso real</span><span>${dif>0?'+':'−'}${$c(Math.abs(dif))}</span></div>`:''}<div class="l t"><span>${N.esAprox(o)?'TOTAL APROX.':'TOTAL EXACTO'}</span><span>${$c(N.totalDe(o))}</span></div></div></div>`;
}
function pagoHtml(o,total,aprox){
  const t=T(),m=o.pago||{},M=N.PAGOS[m.metodo]||N.PAGOS.efectivo;
  if(o.estado==='cancelado')return '';
  if(m.estado==='verificado')return `<div class="card2"><h3>✅ Pago confirmado</h3><p>${M.n} · ${$c(total)}</p></div>`;
  if(m.metodo==='sinpe'){
    if(m.estado==='reportado')return `<div class="card2"><h3>📲 Pago enviado</h3><p>Le avisaste a la tienda que pagaste ${$c(total)}. Lo confirman al entregarte la canasta.</p></div>`;
    if(o.estado==='listo'){
      const num=telDig(t.sinpe?.numero);
      return `<div class="card2 w"><h3>📲 Pagá por SINPE Móvil</h3><div class="monto">${$c(total)}</div>
        ${num?`<div class="copia"><div><small>Número</small>${esc(fmtTel(num))}${t.sinpe?.nombre?` · ${esc(t.sinpe.nombre)}`:''}</div><button type="button" data-act="copiar" data-v="${num}">Copiar</button></div>`:'<p>La tienda te envía el número por WhatsApp.</p>'}
        <div class="copia"><div><small>Monto</small>${$c(total)}</div><button type="button" data-act="copiar" data-v="${Math.round(total)}">Copiar</button></div>
        <div class="copia"><div><small>Descripción</small>${esc(o.ref)}</div><button type="button" data-act="copiar" data-v="${esc(o.ref)}">Copiar</button></div>
        <div class="acciones"><button type="button" class="btn" data-act="ya-pague">Ya pagué</button><button type="button" class="btn ghost" data-act="comprobante">Enviar comprobante</button></div></div>`;
    }
    return `<div class="card2"><h3>📲 SINPE Móvil</h3><p>Cuando esté lista te mostramos aquí el monto exacto, ya pesado, para pagar en un toque.</p></div>`;
  }
  if(m.metodo==='link'&&o.estado==='listo'&&t.linkTarjeta)
    return `<div class="card2 w"><h3>🔗 Pagá con tarjeta</h3><div class="monto">${$c(total)}</div><button type="button" class="btn w" data-act="link-pago">Abrir pago seguro</button><p style="text-align:center;margin-top:8px"><button type="button" class="link" data-act="ya-pague">Ya pagué</button></p></div>`;
  const vuelto=m.metodo==='efectivo'&&+m.conCuanto>total?` Llevás ${$c(m.conCuanto)}: tu vuelto es ${$c(+m.conCuanto-total)}.`:'';
  return `<div class="card2"><h3>${M.e} ${M.n}</h3><p>${aprox?'Total aproximado':'Total'} ${$c(total)}.${vuelto}</p></div>`;
}

// ══════════════ Pintar ══════════════
function pintarChips(){
  const t=T(),en=N.modo()==='nube';
  $('tlChips').innerHTML=`<span class="chip warn">Precios de referencia · se pesa al alistar</span>${MINI?'':`<span class="chip${en?' ok':''}"><i></i>${en?'Tienda en vivo':'Conexión por WhatsApp'}</span>`}<span class="chip">SINPE · tarjeta · efectivo</span>${t.envio!==false?'<span class="chip">Tienda · carro · envío Uber</span>':''}`;
}
function pintarSpine(){
  const o=pedidoVisto(),a=activo(),L=pasos(),act=activoIdx();
  const banner=!o&&a?`<button type="button" class="encurso" data-act="ver" data-id="${a.id}"><span>🛎️</span><span><b>${esc(a.ref)}</b><small>${esc(resumenPedido(a,a.estado==='listo'?5:4,'').replace(/<[^>]+>/g,''))}</small></span><span>VER →</span></button>`:'';
  $('tlSpine').innerHTML=`<p class="kicker">${o?'Pedido '+esc(o.ref)+' · ciclo completo':'Tu pedido · ciclo completo'}</p>${banner}
     <ol class="steps">${L.map(r=>`<li class="step ${r.st}" data-i="${r.i}"><button type="button" class="step-h" data-act="paso" data-i="${r.i}" ${r.nav?'':'disabled'}><span class="dot">${r.st==='done'?'✓':r.st==='bad'?'✕':r.i+1}</span><span><h3>${esc(r.n)}</h3><p>${r.sum}</p></span>${r.nav?`<span class="go">${r.st==='done'?'editar':'ir'}</span>`:''}</button></li>`).join('')}</ol>
    <p class="note">${o?'Este pedido se actualiza solo, en vivo.':'Podés volver a cualquier paso sin perder nada.'}</p>`;
}
function pintarMesa(anim){
  const m=$('tlMesa'),o=pedidoVisto();
  m.innerHTML=C.actual&&!o?cab(5,'No encontramos ese pedido en este teléfono','—','')+'<div class="next"><button type="button" class="btn" data-act="nuevo">＋ Nuevo pedido</button></div>'
    :o?mesaPedido(o):{armar:mesaArmar,entrega:mesaEntrega,pago:mesaPago,sellar:mesaSellar}[C.paso]();
  if(anim){m.classList.remove('fade');void m.offsetWidth;m.classList.add('fade');}
  if(!o&&C.paso==='armar')pintarGrid();
  if(o)pintarQR(o);
  C.pulso=false;C.ultimo=null;
}
function colocarMesa(){
  const m=$('tlMesa'),grid=document.querySelector('.grid');
  if(m.parentElement!==grid)grid.appendChild(m);
}
function pintarBit(){
  const L=misPedidos();
  const nAct=L.filter(o=>!['entregado','cancelado'].includes(o.estado)).length;
  $('tlBitN').hidden=!nAct;$('tlBitN').textContent=nAct;
  const cls={nuevo:'run',alistando:'run',listo:'ok',entregado:'ok',cancelado:'bad'};
  const nom={nuevo:'Recibido',alistando:'Alistando',listo:'Lista',entregado:'Entregado',cancelado:'Cancelado'};
  $('tlBit').innerHTML=`<p class="kicker">Bitácora · pedidos sellados en este teléfono</p>
    ${L.length?`<div class="bit-l">${L.slice(0,20).map(o=>`<button type="button" class="bit-r" data-act="ver" data-id="${o.id}"><span class="t">${esc(fdia(o.created).replace(/^(\w)/,c=>c.toUpperCase()))} ${esc(fh(o.created))}</span><span class="r">${esc(o.ref)}</span><span class="e">${$c(N.totalDe(o))} · ${emojis(o.items,6)}</span><span class="s ${cls[o.estado]||''}">${nom[o.estado]||o.estado}</span></button>`).join('')}</div>`
      :'<p class="note">Cada pedido que sellés queda aquí con su hora, su código y su estado.</p>'}`;
}
function pintarBar(){
  const bar=$('tlBar'),inn=$('tlBarIn'),n=cestaN(),o=pedidoVisto();
  let h='';
  if(!o&&n&&!MINI){
    const btn=C.paso==='sellar'?`<button type="button" class="btn${faltaAlgo()?' apagado':''}" data-act="pedir">🔒 Sellar · ${$c(cestaTotal())}</button>`
      :`<button type="button" class="btn${puedeIr(siguientePaso())?' apagado':''}" data-act="siguiente">${NOMBRE[siguientePaso()]} →</button>`;
    h=`<button type="button" class="tk" data-act="ir" data-p="armar"><span class="tk-ico" id="tlTk">🧺<em>${n}</em></span><span class="tk-t"><small>Ticket · paso ${ARMANDO.indexOf(C.paso)+1} de 6</small><strong>${$c(cestaTotal())}</strong></span></button>${btn}`;
  }
  bar.classList.toggle('hide',!h);
  if(h)inn.innerHTML=h;
}
function pintarQR(o){
  const el=$('tlQR');if(!el)return;
  if(!window.qrcode){el.innerHTML='<div style="display:grid;place-items:center;height:100%;font-size:40px">🧺</div>';return;}
  const q=window.qrcode(0,'M');q.addData('ARAMO:'+o.ref+':'+o.pin);q.make();
  el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});
}
function render(anim){
  const y=window.scrollY,fa=document.activeElement,foco=fa&&fa.id&&fa.matches('input,textarea')?{id:fa.id,s:fa.selectionStart,e:fa.selectionEnd}:null;
  const grid=document.querySelector('.grid'),mesa=$('tlMesa');if(mesa.parentElement!==grid)grid.appendChild(mesa); // sacarla antes de repintar el ciclo
  pintarChips();pintarSpine();pintarMesa(anim);colocarMesa();pintarBit();pintarBar();ligar();
  if(!anim)window.scrollTo(0,y);
  if(foco){const el=$(foco.id);if(el){el.focus({preventScroll:true});try{el.setSelectionRange(foco.s,foco.e);}catch{}}}
}

// ══════════════ Hojas (producto y receta) ══════════════
let H=null;
function abrirHoja(h){
  H=h;pintarHoja();
  $('tlSheet').classList.add('open');$('tlSheetBg').classList.add('open');
  if(!MINI)history.pushState({paso:C.paso,id:C.actual,hoja:1},'',location.pathname+location.search);
}
function cerrarHoja(desdeHist){
  if(!H)return;H=null;
  $('tlSheet').classList.remove('open');$('tlSheetBg').classList.remove('open');
  if(!desdeHist&&!MINI)history.back();
}
function pintarHoja(){
  const el=$('tlSheet');if(!H)return;
  if(H.tipo==='prod'){
    const p=prod(H.k),en=!!C.cesta[H.k],rapidos=p.u==='kg'?[.5,1,2,3]:[1,2,3,6,12];
    el.innerHTML=`<div class="sheet-grip"></div><button type="button" class="sheet-x" data-act="h-x" aria-label="Cerrar">✕</button>
      <div class="rc-hero"><b>${p.e}</b><div><p class="kicker" style="margin:0">Producto</p><h2>${esc(p.n)}</h2><p class="sub mono">${porU(p)}</p></div></div>
      <div class="big-step"><button type="button" data-act="h-menos" aria-label="Menos">−</button><output>${esc(fq(H.q))}<small>${esc(fu(p.u,H.q))}</small></output><button type="button" data-act="h-mas" aria-label="Más">+</button></div>
      <div class="tgs" style="justify-content:center">${rapidos.map(v=>`<button type="button" class="tg${H.q===v?' on':''}" data-act="h-set" data-v="${v}">${esc(qtxt(v,p.u))}</button>`).join('')}</div>
      ${p.mad?`<span class="lbl">¿Para cuándo?</span><div class="tgs">${Object.entries(MAD).map(([k,n])=>`<button type="button" class="tg${H.mad===k?' on':''}" data-act="h-mad" data-v="${k}">${n}</button>`).join('')}</div>`:''}
      <span class="lbl">Nota (opcional)</span><input class="inp" id="tlHNota" placeholder="Ej.: grandes, bien rojos…" value="${esc(H.nota)}" autocomplete="off">
      <div style="display:flex;gap:8px;margin-top:18px">${en?`<button type="button" class="btn bad" data-act="h-quitar">Quitar</button>`:''}<button type="button" class="btn" style="flex:1" data-act="h-ok">${en?'Listo':'Agregar'} · ${$c(H.q*p.p)}</button></div>`;
    $('tlHNota').addEventListener('input',e=>{H.nota=e.target.value;});
  }else{
    const r=RECETAS().find(x=>x.k===H.k),L=ingredientes(r,H.personas,H.off),tot=N.redondear5(L.filter(x=>x.on).reduce((t,x)=>t+x.q*x.p.p,0));
    el.innerHTML=`<div class="sheet-grip"></div><button type="button" class="sheet-x" data-act="h-x" aria-label="Cerrar">✕</button>
      <div class="rc-hero"><b>${r.e}</b><div><p class="kicker" style="margin:0">Receta</p><h2>${esc(r.n)}</h2><p class="sub">${esc(r.desc)}</p></div></div>
      <span class="lbl">¿Para cuántas personas? · ${H.personas}</span>
      <div class="gente">${[1,2,3,4,5,6,7,8].map(i=>`<button type="button" class="${i<=H.personas?'on':''}" data-act="h-per" data-v="${i}" aria-label="${i} personas">🧑<small>${i}</small></button>`).join('')}</div>
      <span class="lbl">Ingredientes · se escalan solos</span>
      <div>${L.map(x=>`<button type="button" class="ing${x.on?' on':''}" data-act="h-ing" data-k="${x.p.k}" ${x.p.agotado?'disabled':''}><span class="ck">${x.on?'✓':''}</span><span class="e">${x.p.e}</span><span><strong>${esc(x.p.n)}</strong><small>${x.p.agotado?'Agotado hoy':esc(qtxt(x.q,x.p.u))}</small></span><span class="pz">${$c(x.q*x.p.p)}</span></button>`).join('')}</div>
      <button type="button" class="btn w big" style="margin-top:16px" data-act="h-receta" ${L.some(x=>x.on)?'':'disabled'}>Agregar a mi canasta · ${$c(tot)}</button>`;
  }
}
function abrirProd(k){const p=prod(k);if(!p)return;const c=C.cesta[k];abrirHoja({tipo:'prod',k,q:c?.q||p.s,mad:c?.mad||'',nota:c?.nota||''});}

// ══════════════ Sellar ══════════════
const estados={};
misPedidos().forEach(o=>{estados[o.id]=o.estado;});
function hacerPedido(){
  const falta=faltaAlgo();if(falta){avisarFalta(falta);return;}
  const s=suc(C.retiro.suc),h=horaRetiro();
  const items=cestaItems().filter(x=>!x.p.agotado);
  const o=N.crear({
    id:N.nuevoId(),ref:N.nuevoRef(),pin:N.nuevoPin(),estado:'nuevo',sucursal:s.k,
    cliente:{nombre:C.perfil.nombre.trim(),tel:telDig(C.perfil.tel)},
    retiro:{modo:C.retiro.modo,at:h.toISOString(),entrega:C.retiro.entrega,carro:C.retiro.entrega==='carro',placa:C.retiro.entrega==='carro'?C.retiro.placa.trim():'',envio:esEnvio()?{...C.retiro.ubi,senas:(C.retiro.senas||'').trim()}:null},
    pago:{metodo:C.pago.metodo,conCuanto:C.pago.metodo==='efectivo'?+C.pago.conCuanto||0:0,estado:'pendiente'},
    sust:C.sust,nota:C.nota.trim(),
    items:items.map(x=>({k:x.k,n:x.p.n,e:x.p.e,u:x.p.u,q:x.q,p:x.p.p,mad:x.mad||'',nota:x.nota||''})),
    totalEst:cestaTotal(),canal:N.modo(),
  });
  C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];C.cesta={};C.nota='';C.editPerfil=false;C.paso='armar';guardar();
  estados[o.id]=o.estado;
  fiesta(o.items.map(i=>i.e));buzz([30,40,30]);toast(N.modo()==='nube'?'🔔 Pedido '+o.ref+' enviado al Taller · aviso automático a la tienda':'🔒 Pedido '+o.ref+' sellado · falta avisar a la tienda');
  ver(o.id);
}
function msgTienda(o){
  const s=suc(o.sucursal),M=N.PAGOS[o.pago.metodo];
  return [
    `🧺 *Pedido ARAMO Taller · ${o.ref}*`,
    `👤 ${o.cliente.nombre} · ${fmtTel(o.cliente.tel)}`,
    `📍 ${s?.n||''} (${s?.zona||''}) · ${cuando(o.retiro.at)} · ${entregaTxt(o.retiro)}`,
    o.retiro.envio?`🗺️ Entregar en: ${mapaUrl(o.retiro.envio)}${o.retiro.envio.senas?' · '+o.retiro.envio.senas:''}`:'',
    `${M?.e||'💳'} ${M?.n||''}${o.pago.conCuanto?' · paga con '+$c(o.pago.conCuanto):''}`,
    '',
    ...o.items.map(i=>`• ${qtxt(i.q,i.u)} ${i.n}${i.mad?' · '+(MAD[i.mad]||'').toLowerCase():''}${i.nota?' · '+i.nota:''}`),
    '',
    `Total aprox.: ${$c(N.totalDe(o))}`,
    `Si algo no hay: ${SUST[o.sust]?.n.toLowerCase()}`,
    o.nota?`📝 ${o.nota}`:'',
    '',
    `Abrir en Mostrador 👉 ${N.enlace('APP.html','encargo',o)}`,
  ].filter((l,i,a)=>l!==''||a[i-1]!=='').join('\n');
}
function abrir(url){const w=window.open(url,'_blank','noopener');if(!w)location.href=url;}

// ══════════════ Avisos en vivo ══════════════
function vigilar(){
  misPedidos().forEach(o=>{
    const antes=estados[o.id];estados[o.id]=o.estado;
    if(!antes||antes===o.estado)return;
    if(o.estado==='listo'){toast('✅ ¡Tu canasta '+o.ref+' está lista!');buzz([90,60,90,60,160]);campana();N.avisos.mostrar('✅ Tu canasta '+o.ref+' está lista',o.retiro.envio?'Va en camino con Uber a tu ubicación.':'Te espera en '+(suc(o.sucursal)?.n||'ARAMO')+'. Total '+$c(N.totalDe(o))+'.',{tag:'pedido-'+o.id,url:location.href.split('#')[0]});}
    else if(o.estado==='alistando'){toast('🧑‍🌾 Ya están escogiendo tu canasta');N.avisos.mostrar('🧑‍🌾 Estamos escogiendo tu canasta','Pedido '+o.ref+' · te avisamos cuando esté lista.',{tag:'pedido-'+o.id});}
    else if(o.estado==='entregado')toast('🛍️ ¡Entregada! Gracias');
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
function toast(m){const t=$('tlToast');t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2600);}
function volar(emoji,desde){
  const a=desde.getBoundingClientRect();
  const s=document.createElement('span');s.className='vuelo';s.textContent=emoji;
  s.style.left=(a.left+a.width/2-14)+'px';s.style.top=(a.top+a.height/2-14)+'px';
  document.body.appendChild(s);
  requestAnimationFrame(()=>{
    const b=$('tlTk')?.getBoundingClientRect()||{left:innerWidth/2,top:innerHeight-60,width:0,height:0};
    s.style.transform=`translate(${b.left+b.width/2-(a.left+a.width/2)}px,${b.top+b.height/2-(a.top+a.height/2)}px) scale(.4)`;s.style.opacity='.2';
  });
  setTimeout(()=>{s.remove();const i=$('tlTk');if(i){i.classList.remove('bump');void i.offsetWidth;i.classList.add('bump');}},720);
}
function fiesta(emos){
  if(MINI)return;
  const f=document.createElement('div');f.className='fiesta';
  const set=emos?.length?emos:['🍅','🥑','🍌','🥕'];
  for(let i=0;i<24;i++){const s=document.createElement('span');s.textContent=set[i%set.length];s.style.left=Math.random()*100+'%';s.style.animationDelay=(Math.random()*.6)+'s';s.style.fontSize=(20+Math.random()*16)+'px';f.appendChild(s);}
  document.body.appendChild(f);setTimeout(()=>f.remove(),2600);
}
async function copiar(v){
  try{await navigator.clipboard.writeText(v);}catch{const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch{}t.remove();}
  toast('Copiado: '+v);buzz(10);
}

// ══════════════ Dictado ══════════════
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null;
function dictar(){
  if(!SR){toast('Usá el micrófono 🎤 de tu teclado para dictar');$('tlQ')?.focus();return;}
  if(rec){rec.stop();return;}
  rec=new SR();rec.lang='es-CR';rec.interimResults=false;rec.maxAlternatives=1;
  $('tlMic')?.classList.add('on');
  rec.onresult=e=>{const t=e.results[0][0].transcript;C.q=t;const q=$('tlQ');if(q)q.value=t;procesarLista();};
  rec.onend=()=>{rec=null;$('tlMic')?.classList.remove('on');};
  rec.onerror=()=>{toast('No te escuché bien, probá de nuevo');};
  try{rec.start();}catch{rec=null;$('tlMic')?.classList.remove('on');}
}
function procesarLista(){
  const L=leerLista(C.q);
  if(!L.length||!L.some(x=>x.p)){pintarGrid();return;}
  C.parse=L;const el=$('tlParse');if(el)el.innerHTML=parseHtml();
}

// ══════════════ Eventos ══════════════
let _qt=0;
function ligar(){
  const f=$('tlAsk'),q=$('tlQ');
  if(f&&q){
    f.addEventListener('submit',e=>{e.preventDefault();C.q=q.value;procesarLista();q.blur();});
    q.addEventListener('input',()=>{C.q=q.value;if(C.parse){C.parse=null;$('tlParse').innerHTML='';}clearTimeout(_qt);_qt=setTimeout(pintarGrid,160);});
    $('tlMic').addEventListener('click',dictar);
  }
  const on=(id,fn)=>{const el=$(id);if(el)el.addEventListener('input',()=>fn(el.value));};
  on('tlNota',v=>{C.nota=v;guardar();});
  on('tlSenas',v=>{C.retiro.senas=v;guardar();});
  on('tlPlaca',v=>{C.retiro.placa=v;guardar();});
  on('tlUbiLink',v=>{const c=leerCoords(v);if(c){C.retiro.ubi=c;guardar();toast('📍 Ubicación lista');C.pulso=true;render();}else if(v.length>12)toast('Ese link no trae la ubicación; usá el botón 📍');});
  const nom=$('tlNombre'),tel=$('tlTel');
  if(nom&&tel){
    const chk=()=>{C.perfil.nombre=nom.value;C.perfil.tel=tel.value;guardar();pintarBar();};
    nom.addEventListener('input',chk);tel.addEventListener('input',chk);
    tel.addEventListener('blur',()=>{const e=$('tlPerfilErr');if(e)e.textContent=tel.value&&telDig(tel.value).length!==8?'El teléfono debe tener 8 números (ej.: 8888-1234)':'';});
  }
}
const ACT={
  tile(el){const k=el.dataset.k;if(C.cesta[k])abrirProd(k);else add(k,el);},
  mas(el){const p=prod(el.dataset.k);setQ(p.k,(C.cesta[p.k]?.q||0)+p.s);buzz(6);render();},
  menos(el){const p=prod(el.dataset.k);setQ(p.k,(C.cesta[p.k]?.q||0)-p.s);buzz(6);render();},
  info(el){abrirProd(el.dataset.k);},
  pasillo(el){C.pasillo=el.dataset.k;pintarGrid();},
  receta(el){abrirHoja({tipo:'receta',k:el.dataset.k,personas:C.personas,off:new Set()});},
  'mas-recetas'(){C.verRecetas=!C.verRecetas;render();},
  'rec-cat'(el){C.recCat=el.dataset.k;C.verRecetas=false;render();},
  sumar(el){add(el.dataset.k,el);},
  avisame(){N.avisos.pedir().then(r=>{toast(r==='granted'?'🔔 Listo: te avisamos en el teléfono':'Tu navegador no permitió avisos; te avisamos por WhatsApp');render();});},
  'limpiar-q'(){C.q='';C.parse=null;const q=$('tlQ');if(q)q.value='';pintarGrid();},
  ir(el){ir(el.dataset.p);},
  paso(el){const i=+el.dataset.i;if(i===5&&C.actual&&['listo','entregado'].includes(pedidoVisto()?.estado)){ $('tlStep6')?.scrollIntoView({behavior:'smooth',block:'center'});return;}const p=ARMANDO[i];if(!p)return;const f=puedeIr(p);if(f){avisarFalta(f);return;}ir(p);},
  siguiente(){
    const a=C.paso,f=a==='armar'?faltaArmar():a==='entrega'?faltaRetiro():a==='pago'?faltaPago():null;
    if(f){avisarFalta(f);return;}
    const sig=siguientePaso(),g=puedeIr(sig);if(g){avisarFalta(g);return;}
    ir(sig);
  },
  ver(el){ver(el.dataset.id);},
  nuevo(){ir('armar');},
  repetir(el){
    const o=N.get(el.dataset.id);if(!o)return;let n=0;
    o.items.forEach(i=>{const p=prod(i.k);if(p&&!p.agotado&&i.estado!=='nohay'){C.cesta[i.k]={q:i.q,mad:i.mad||'',nota:i.nota||''};n++;}});
    guardar();C.pulso=true;
    // Exprés: si ya sabemos entrega y pago, va directo a revisar y sellar
    if(el.dataset.express&&!puedeIr('sellar')){toast('⚡ '+n+' productos · revisá y sellá');ir('sellar');}
    else{toast('🔁 '+n+' productos en tu canasta');ir('armar');}
  },
  'parse-t'(el){const x=C.parse[+el.dataset.i];if(x.p&&!x.p.agotado)x.on=!x.on;$('tlParse').innerHTML=parseHtml();},
  'parse-no'(){C.parse=null;$('tlParse').innerHTML='';},
  'parse-ok'(){
    const ok=C.parse.filter(x=>x.p&&x.on);
    ok.forEach(x=>sumar(x.p.k,x.q));
    guardar();C.parse=null;C.q='';C.pulso=true;
    toast('✨ '+ok.length+' productos agregados');fiesta(ok.map(x=>x.p.e));render();
  },
  sust(el){C.sust=el.dataset.k;guardar();render();},
  suc(el){C.retiro.suc=el.dataset.k;guardar();C.pulso=true;render();},
  cuando(el){C.retiro.modo=el.dataset.v;asegurarRetiro();guardar();C.pulso=true;render();},
  dia(el){C.retiro.dia=+el.dataset.d;C.retiro.hora=null;asegurarRetiro();guardar();render();},
  hora(el){C.retiro.hora=el.dataset.h;guardar();C.pulso=true;render();},
  entrega(el){C.retiro.entrega=el.dataset.v;C.retiro.carro=el.dataset.v==='carro';guardar();C.pulso=true;render();if(el.dataset.v==='envio'&&!C.retiro.ubi){setTimeout(()=>$('tlUbiBtn')?.scrollIntoView({block:'center',behavior:'smooth'}),80);tomarUbicacion();}},
  'ubi-gps'(){tomarUbicacion();},
  metodo(el){C.pago.metodo=el.dataset.k;guardar();C.pulso=true;render();},
  con(el){C.pago.conCuanto=+el.dataset.v;guardar();render();},
  'edit-perfil'(){C.editPerfil=true;render();$('tlNombre')?.focus();},
  pedir(){hacerPedido();},
  'wa-enviar'(){
    const o=pedidoVisto();if(!o)return;
    abrir(N.wa(N.waDe(o.sucursal),msgTienda(o)));
    N.cambiar(o.id,x=>{x.waPendiente=true;x.waAbiertoAt=new Date().toISOString();},'cliente','WhatsApp abierto; pendiente de confirmación').then(()=>{toast('WhatsApp abierto · confirmá el envío al regresar');render();});
  },
  'wa-confirmar'(){
    const o=pedidoVisto();if(!o)return;
    if(!confirm('¿Ya tocaste “Enviar” en WhatsApp para el pedido '+o.ref+'?'))return;
    N.cambiar(o.id,x=>{x.avisado=true;x.waPendiente=false;x.avisadoAt=new Date().toISOString();},'cliente','Cliente confirmó envío por WhatsApp').then(()=>{toast('✅ Confirmado · pendiente de aceptación de la tienda');render();});
  },
  'wa-tienda'(){const o=pedidoVisto();abrir(N.wa(N.waDe(o?.sucursal),`Hola, sobre mi pedido ${o?.ref||''} de ARAMO: `));},
  'wa-estado'(){const o=pedidoVisto();if(!o)return;abrir(N.wa(N.waDe(o.sucursal),`Hola, sobre mi pedido ${o.ref} de ARAMO: ¿me confirman cuando esté listo y me mandan el enlace actualizado para ver el paso 6?`));},
  comprobante(){const o=pedidoVisto();abrir(N.wa(N.waDe(o.sucursal),`📲 Comprobante SINPE del pedido ${o.ref} por ${$c(N.totalDe(o))} (adjunto la captura).`));},
  'ya-pague'(){N.cambiar(C.actual,o=>{o.pago.estado='reportado';o.pago.reportado=new Date().toISOString();},'cliente','El cliente avisó que pagó').then(()=>{toast('¡Gracias! La tienda lo confirma al entregarte');render();});},
  'actualizar-pedido'(){
    const o=pedidoVisto();if(!o)return;
    toast('🔄 Revisando el estado de tu pedido…');
    N.conectar({ids:C.mis}).then(()=>{
      const actualizado=N.get(o.id);
      render();
      if(actualizado?.estado==='listo')toast('✅ ¡La tienda ya lo marcó como listo!');
      else if(actualizado?.estado==='entregado')toast('🛍️ Tu pedido ya fue entregado');
      else if(N.modo()!=='nube')toast('📲 En modo WhatsApp, abrí el enlace de seguimiento que te mande la tienda');
      else toast('⏳ La tienda todavía lo está alistando');
    });
  },
  'paso6'(){
    $('tlStep6')?.scrollIntoView({behavior:'smooth',block:'center'});
  },
  'link-pago'(){abrir(T().linkTarjeta);},
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
  // hojas
  'h-x'(){cerrarHoja();},
  'h-mas'(){const p=prod(H.k);H.q=+(H.q+p.s).toFixed(2);pintarHoja();buzz(6);},
  'h-menos'(){const p=prod(H.k);H.q=Math.max(p.s,+(H.q-p.s).toFixed(2));pintarHoja();buzz(6);},
  'h-set'(el){H.q=+el.dataset.v;pintarHoja();},
  'h-mad'(el){H.mad=H.mad===el.dataset.v?'':el.dataset.v;pintarHoja();},
  'h-quitar'(){delete C.cesta[H.k];guardar();cerrarHoja();render();},
  'h-ok'(){const nuevo=!C.cesta[H.k];C.cesta[H.k]={q:H.q,mad:H.mad||'',nota:(H.nota||'').trim()};guardar();if(nuevo){C.ultimo=H.k;C.pulso=true;}cerrarHoja();render();if(nuevo)toast('Agregado a tu canasta');},
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
$('tlBitBtn').addEventListener('click',()=>$('tlBit').scrollIntoView({behavior:'smooth',block:'start'}));

// Tema (consola oscura por defecto, como el taller de GENOSIM)
function temaActual(){return document.documentElement.dataset.theme==='light'?'light':'dark';}
function pintarTema(){const d=temaActual()==='dark';$('tlTema').textContent=d?'☀️':'🌙';$('tlTema').setAttribute('aria-label',d?'Usar tema claro':'Usar tema oscuro');document.querySelector('meta[name="theme-color"]').content=d?'#06120d':'#eef4ef';}
$('tlTema').addEventListener('click',()=>{const t=temaActual()==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('cn_theme',t);}catch{}pintarTema();});
pintarTema();
DESK.addEventListener?.('change',()=>render());

// ══════════════ Arranque ══════════════
N.on(tipo=>{
  if(tipo==='tienda')_cat=null;
  if(tipo==='encargo'||tipo==='tienda'){vigilar();if(!H)render();else pintarBit();}
  if(tipo==='modo')pintarChips();
});
function importarHash(){
  const m=location.hash.match(/^#e=(.+)$/);if(!m)return false;
  const o=N.unpack(m[1]);if(!o?.id)return false;
  N.importar(o);C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];guardar();C.actual=o.id;
  if(!estados[o.id])estados[o.id]=N.get(o.id)?.estado;
  vigilar();
  return true;
}
if(!importarHash()){
  const a=activo();
  if(a&&!cestaN()&&!MINI)C.actual=a.id; // la mesa abre en lo que importa ahora
}
window.addEventListener('hashchange',()=>{if(importarHash()){history.replaceState({paso:C.paso,id:C.actual},'',location.pathname+location.search);render(true);arriba();}});
if(!MINI){
  history.replaceState({paso:C.paso,id:C.actual},'',location.pathname+location.search);
  N.conectar({ids:C.mis});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
render(true);
window.ARAMO_CANASTA_APP={C,leerLista,hacerPedido,ir,ver};
})();
