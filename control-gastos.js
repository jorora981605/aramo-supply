// control-gastos.js — los gastos del Control total, colón por colón. 2026-11-28.
// Qué hace:
//  · Un catálogo de gastos fijos que se puede cambiar (alquiler, luz, agua, impuestos, CCSS, patente, marchamo…), cada uno
//    "cada día / semana / mes / trimestre / año". Cada día se cobra su parte en colones enteros (Colones.delDia): sumando
//    el período da el monto exacto. Los 7 de siempre siguen guardando su monto en data.settings (la pantalla vieja de
//    Ajustes y el ahorro de control-socios.js los leen de ahí).
//  · Pagar un gasto: si lo calculado ya se viene cobrando día a día, el pago solo mete en la ganancia LA DIFERENCIA
//    (pagó más: baja; pagó menos: sube). Un gasto de una sola vez o un viaje entra completo.
//  · Viajes por kilómetro: "solo gasolina" (precio del litro ÷ lo que rinde el carro) o una tarifa por km acordada.
//  · window.Gastos: lo que usa el motor (clComputeWeek) y los otros módulos. Las cuentas son funciones aparte de la pantalla.
// Guarda: data.gastos = {v:1, lista:[…], viajes:{…}} (AJUSTES: se quedan al reiniciar; no se escribe hasta que el dueño
// cambia algo) y los pagos como movimientos de data.plata con t:'gasto' (MOVIMIENTOS: ya se borran con data.plata).
(function(){
'use strict';
if(typeof clComputeWeek!=='function'||!window.Colones)return;
const CO=window.Colones;
const ent=n=>Math.round(num(n));
const hoy=()=>clDateISO(new Date());
const DIAS_MES=typeof CLOSURE_DAYS_PER_MONTH==='number'?CLOSURE_DAYS_PER_MONTH:30.44;
const OLD6=['rent','electricity','terminal','taxes','insurance','wifi'];       // los que la cuenta de siempre repartía entre 30,44 días
const CADAS=['dia','semana','mes','trimestre','anio'];
const CAT=[
  {id:'local',n:'Local y servicios',ic:'tienda'},
  {id:'personal',n:'Personal',ic:'clientes'},
  {id:'impuestos',n:'Impuestos y permisos',ic:'recibo'},
  {id:'transporte',n:'Transporte',ic:'camion'},
  {id:'operacion',n:'Operación',ic:'caja'},
  {id:'otros',n:'Otros',ic:'nota'}];
const CATID=CAT.map(c=>c.id);
// los de siempre (id = la llave de data.settings; el monto vive allá)
const VIEJOS=[
  {id:'rent',n:'Alquiler',cat:'local'},{id:'electricity',n:'Luz',cat:'local'},{id:'water',n:'Agua',cat:'local'},
  {id:'wifi',n:'Wifi',cat:'local'},{id:'terminal',n:'Datáfono fijo',cat:'operacion'},{id:'taxes',n:'Impuesto',cat:'impuestos'},
  {id:'insurance',n:'Seguro Gene',cat:'personal'}];
// para que el dueño no tenga que acordarse
const SUGERIDOS=[
  {n:'Internet',cat:'local',cada:'mes'},{n:'Teléfono',cat:'local',cada:'mes'},
  {n:'Basura y servicios municipales',cat:'impuestos',cada:'trimestre'},{n:'Patente municipal',cat:'impuestos',cada:'trimestre'},
  {n:'Permiso de Salud',cat:'impuestos',cada:'anio'},{n:'CCSS, cargas sociales',cat:'personal',cada:'mes'},
  {n:'Póliza de riesgos del trabajo, INS',cat:'personal',cada:'anio'},{n:'Aguinaldo, se aparta cada mes',cat:'personal',cada:'mes'},
  {n:'Contador',cat:'operacion',cada:'mes'},{n:'Factura electrónica o programa',cat:'operacion',cada:'mes'},
  {n:'Alquiler del datáfono',cat:'operacion',cada:'mes'},{n:'Bolsas y empaque',cat:'operacion',cada:'semana'},
  {n:'Limpieza',cat:'operacion',cada:'semana'},{n:'Fumigación',cat:'local',cada:'trimestre'},
  {n:'Mantenimiento de cámaras y refrigeración',cat:'local',cada:'trimestre'},{n:'Calibrar las romanas',cat:'operacion',cada:'anio'},
  {n:'Marchamo',cat:'transporte',cada:'anio'},{n:'Riteve',cat:'transporte',cada:'anio'},{n:'Seguro del carro',cat:'transporte',cada:'anio'},
  {n:'Préstamo o intereses',cat:'otros',cada:'mes'},{n:'Publicidad',cat:'operacion',cada:'mes'}];

/* =====================================================================================================
   CUENTAS (sin pantalla). Todo se guarda en memoria y se rehace cuando cambia data (save() lo avisa).
   ===================================================================================================== */
let ver=0,C=null;
function invalidar(){ver++;C=null;}
const firmaAjustes=S=>[S.rent,S.electricity,S.water,S.taxes,S.terminal,S.insurance,S.wifi,S.savings].join('|');
function cache(){
  const S=data.settings||{},P=data.plata,R=(data.reglas||{}).desde;
  if(C&&C.data===data&&C.g===data.gastos&&C.plata===P&&C.np===(P||[]).length&&C.ver===ver&&C.R===R&&C.sig===firmaAjustes(S)&&C.Ci===window.Cierres)return C;
  C={data,g:data.gastos,plata:P,np:(P||[]).length,ver,R,sig:firmaAjustes(S),Ci:window.Cierres,lista:null,porId:null,dias:new Map(),cz:new Map(),E:new Map(),pagos:null};
  return C;
}
// que cada save() (el de la hoja, el de la cara, el que sea) avise que algo pudo cambiar
try{const s0=window.save;if(typeof s0==='function'&&!s0._gastos){const s1=function(){invalidar();return s0.apply(this,arguments);};s1._gastos=1;window.save=s1;}}catch(e){}

// El catálogo, con el monto de cada uno ya resuelto (los de siempre, desde data.settings). Solo lectura.
function lista(){
  const c=cache();if(c.lista)return c.lista;
  const G=data.gastos,S=data.settings||{};
  let base=G&&Array.isArray(G.lista)&&G.lista.length?G.lista.slice():null;
  if(!base)base=VIEJOS.map(v=>({id:v.id,n:v.n,cat:v.cat,cada:'mes',activo:true,viejo:v.id}));
  else VIEJOS.forEach(v=>{if(!base.some(g=>g&&g.id===v.id))base.push({id:v.id,n:v.n,cat:v.cat,cada:'mes',activo:true,viejo:v.id});});
  c.lista=base.filter(g=>g&&g.id).map(g=>{
    const r={...g};
    r.cada=g.viejo?'mes':(CADAS.includes(g.cada)?g.cada:'mes');
    r.cat=CATID.includes(g.cat)?g.cat:'otros';
    r.monto=g.viejo?num(S[g.viejo]):num(g.monto);
    r.activo=g.activo!==false;
    return r;
  });
  c.porId=new Map(c.lista.map(g=>[g.id,g]));
  return c.lista;
}
const porId=id=>{lista();return cache().porId.get(id)||null;};
// ¿ese gasto se cobra ese día? (desde: el primer día · hasta: el último, si se quitó)
function activoEn(g,f){
  if(g.desde&&f<g.desde)return false;
  if(!g.activo)return !!g.hasta&&f<=g.hasta;
  return !g.hasta||f<=g.hasta;
}
// un día que ya se cerró trae congelado lo que se calculó ese día (lo pone control-cierre.js)
function congelado(f){
  const c=cache();if(c.cz.has(f))return c.cz.get(f);
  let r=null;const Ci=window.Cierres;
  if(Ci&&typeof Ci.congelado==='function'){try{r=Ci.congelado(f)||null;}catch(e){r=null;}}
  c.cz.set(f,r);return r;
}
// Lo que ese gasto se cobró ese día. Antes de las reglas nuevas: la cuenta de siempre (el agua y lo nuevo, nada).
function cobrado(g,f){
  if(!clNuevo(f))return g.viejo&&OLD6.includes(g.viejo)?num((data.settings||{})[g.viejo])/DIAS_MES:0;
  const z=congelado(f);
  if(z&&z.fij&&z.fij[g.id]!=null)return num(z.fij[g.id]);
  return activoEn(g,f)?CO.delDia(g.monto,f,g.cada):0;
}
function cobradoAhorro(f){
  const S=data.settings||{};
  if(!clNuevo(f))return num(S.savings)/7;
  const z=congelado(f);
  if(z&&z.fij&&z.fij.savings!=null)return num(z.fij.savings);
  return CO.delDia(S.savings,f,'semana');
}
// Lo que de verdad se calculó para un período entero (día por día: la cuenta vieja, o Colones.delDia, o lo congelado)
function calculado(g,per){
  const c=cache(),k=g.id+'|'+per.id;
  if(c.E.has(k))return c.E.get(k);
  let t=0;for(let f=per.ini;f<=per.fin;f=clDateAdd(f,1))t+=cobrado(g,f);
  const r=Math.round(t);c.E.set(k,r);return r;
}
function periodoPorId(id,cada){
  let f=null,m;
  id=String(id||'');
  if(cada==='mes'&&/^\d{4}-\d{2}$/.test(id))f=id+'-01';
  else if(cada==='semana'&&/^S\d{4}-\d{2}-\d{2}$/.test(id))f=id.slice(1);
  else if(cada==='trimestre'&&(m=/^(\d{4})-T([1-4])$/.exec(id)))f=m[1]+'-'+String((+m[2]-1)*3+1).padStart(2,'0')+'-01';
  else if(cada==='anio'&&/^\d{4}$/.test(id))f=id+'-01-01';
  else if(cada==='dia'&&/^\d{4}-\d{2}-\d{2}$/.test(id))f=id;
  return f?CO.periodo(f,cada):null;
}
const periodoDe=(m,g)=>(m.periodo&&periodoPorId(m.periodo,g.cada))||CO.periodo(m.f,g.cada);
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
function nomPer(per,cada){
  const anio=per.ini.slice(0,4),extra=anio!==hoy().slice(0,4)?' '+anio:'';
  if(cada==='mes')return cap(MESES[+per.id.slice(5,7)-1])+extra;
  if(cada==='semana')return 'Semana '+clWeekNumber(per.ini)+extra;
  if(cada==='trimestre')return 'Trimestre '+per.id.slice(-1)+' de '+anio;
  if(cada==='anio')return 'Año '+per.id;
  return per.ini===hoy()?'Hoy':per.ini;
}
const colTxt=n=>{n=Math.round(num(n));return(n<0?'−':'')+fmt(Math.abs(n));};
function etiquetaSuelto(m){
  if(m.concepto==='viaje')return 'Viaje'+(m.ruta?' · '+m.ruta:'')+(m.km?' · '+decTxt(m.km)+' km':'');
  return m.nota||'Otro gasto';
}
const decTxt=n=>Number(n).toLocaleString('es-CR',{maximumFractionDigits:2});

// Todos los pagos (movimientos t:'gasto') ya repartidos: qué efecto tiene cada uno en la ganancia de su día.
//  · del catálogo: efecto = T_k − T_(k−1)   (T = lo pagado hasta ese pago − lo calculado; un abono no baja de 0)
//  · suelto (otro, viaje, o un gasto que ya no existe): entra completo
//  · salario: 0 (sale de Horarios) · de antes de las reglas nuevas: 0
function pagos(){
  const c=cache();if(c.pagos)return c.pagos;
  lista();
  const grupos=new Map(),efecto=new Map(),dias=new Map(),meta=new Map();
  const dia=f=>{let d=dias.get(f);if(!d){d={ajustes:[],sueltosDet:[]};dias.set(f,d);}return d;};
  const arr=(data.plata||[]).map((m,i)=>({m,i})).filter(x=>x.m&&x.m.t==='gasto'&&x.m.f);
  arr.sort((a,b)=>(a.m.f<b.m.f?-1:a.m.f>b.m.f?1:0)||String(a.m.at||'').localeCompare(String(b.m.at||''))||a.i-b.i);
  arr.forEach(({m})=>{
    const monto=ent(m.monto),cpt=m.concepto;
    if(!clNuevo(m.f)||cpt==='salario'){efecto.set(m.id,0);return;}
    const g=c.porId.get(cpt);
    if(!g){efecto.set(m.id,monto);if(monto)dia(m.f).sueltosDet.push({id:m.id,label:etiquetaSuelto(m),monto,pagoId:m.id,viaje:m.concepto==='viaje'});return;}
    const per=periodoDe(m,g),k=g.id+'|'+per.id;
    let G=grupos.get(k);
    if(!G){G={g,per,E:calculado(g,per),pagos:[],A:0,T:0};grupos.set(k,G);}
    G.A+=monto;
    const T=m.completo===false?Math.max(0,G.A-G.E):G.A-G.E,ef=T-G.T;G.T=T;
    G.pagos.push({m,monto,A:G.A,T,efecto:ef,completo:m.completo!==false});
    efecto.set(m.id,ef);meta.set(m.id,{g,per,E:G.E,A:G.A});
    if(ef)dia(m.f).ajustes.push({id:m.id,label:g.n+' · '+nomPer(per,g.cada),monto:ef,pagoId:m.id});
  });
  return c.pagos={grupos,efecto,dias,meta};
}
const efecto=id=>pagos().efecto.get(id)||0;
// lo que se calculó, lo que va pagado y cómo va un período de un gasto
function resumenPeriodo(g,per){
  const G=pagos().grupos.get(g.id+'|'+per.id),E=calculado(g,per);
  if(!G)return{per,E,A:0,n:0,pagos:[],completo:true};
  const u=G.pagos[G.pagos.length-1];
  return{per,E:G.E,A:G.A,n:G.pagos.length,pagos:G.pagos,completo:u.completo};
}
// "Noviembre: pagado" · "sin pagar" · "pagaste ₡6 500 más de lo calculado"
function estadoPeriodo(id,ref){
  const g=typeof id==='string'?porId(id):id;if(!g)return null;
  ref=ref||hoy();
  const per=CO.periodo(ref,g.cada),R=(data.reglas||{}).desde;
  if(R&&per.fin<R)return null;                        // un período que terminó antes de las reglas nuevas
  const r=resumenPeriodo(g,per),nom=nomPer(per,g.cada),dif=r.A-r.E;
  let t,cl;
  if(!r.n){t=nom+': sin pagar';cl=per.fin<hoy()?'mal':'info';}
  else if(dif===0){t=nom+': pagado';cl='bien';}
  else if(dif>0){t=nom+': pagaste '+colTxt(dif)+' más de lo calculado';cl='ojo';}
  else if(!r.completo){t=nom+': van '+colTxt(r.A)+' de '+colTxt(r.E);cl='ojo';}
  else{t=nom+': pagaste '+colTxt(-dif)+' menos de lo calculado';cl='ojo';}
  return{per,E:r.E,A:r.A,n:r.n,dif,texto:t,clase:cl};
}
function esSuelto(m){
  if(!m)return false;
  const c=m.concepto;
  if(c==='salario')return false;
  if(c==='otro'||c==='viaje')return true;
  return !porId(c);
}
function nombre(concepto){
  if(concepto==='salario')return 'Salario';
  if(concepto==='otro')return 'Otro gasto';
  if(concepto==='viaje')return 'Viaje';
  const g=porId(concepto);return g?g.n:'Gasto';
}

// El día, tal como lo lee clComputeWeek. Rápido: una sola cuenta por día mientras no cambie data.
function dia(f){
  const c=cache();
  let r=c.dias.get(f);if(r)return r;
  r=calcDia(f);c.dias.set(f,r);return r;
}
function calcDia(f){
  const S=data.settings||{};
  if(!clNuevo(f)){                 // la cuenta de siempre, sin cambiar ni un decimal (sin el agua, sin redondear)
    const fijos=(num(S.rent)+num(S.electricity)+num(S.terminal)+num(S.taxes)+num(S.insurance)+num(S.wifi))/DIAS_MES+num(S.savings)/7;
    const nom={rent:'Alquiler',electricity:'Luz',terminal:'Datáfono fijo',taxes:'Impuesto',insurance:'Seguro Gene',wifi:'Wifi'};
    const items=OLD6.filter(k=>num(S[k])).map(k=>({id:k,label:nom[k],monto:num(S[k])/DIAS_MES}));
    if(num(S.savings))items.push({id:'savings',label:'Ahorro',monto:num(S.savings)/7});
    return{fijos,ajuste:0,sueltos:0,viajes:0,items,ajustes:[],sueltosDet:[]};
  }
  let fijos=0;const items=[];
  lista().forEach(g=>{const m=cobrado(g,f);if(m){items.push({id:g.id,label:g.n,monto:m});fijos+=m;}});
  const ah=cobradoAhorro(f);if(ah){items.push({id:'savings',label:'Ahorro',monto:ah});fijos+=ah;}
  const d=pagos().dias.get(f),ajustes=d?d.ajustes:[],sueltosDet=d?d.sueltosDet:[];
  return{fijos,ajuste:ajustes.reduce((t,x)=>t+x.monto,0),sueltos:sueltosDet.reduce((t,x)=>t+x.monto,0),viajes:sueltosDet.reduce((t,x)=>t+(x.viaje?x.monto:0),0),items,ajustes,sueltosDet};
}
const PERIODO={dia:'dia',semana:'semana',mes:'mes',trimestre:'trimestre',anio:'anio'};
// Los gastos fijos de una semana (7 fechas), con lo que le tocó a cada uno EN PROMEDIO por día
function fijosSemana(fechas){
  const n=fechas.length||7,out=[],S=data.settings||{};
  lista().forEach(g=>{
    let suma=0,vive=false;
    fechas.forEach(f=>{suma+=cobrado(g,f);if(!clNuevo(f)||activoEn(g,f))vive=true;});
    if(!vive&&!suma)return;                           // se quitó antes de esta semana
    out.push({key:g.id,label:g.n,raw:g.monto,period:PERIODO[g.cada],daily:suma/n,id:g.id,cat:g.cat,cada:g.cada});
  });
  let ah=0;fechas.forEach(f=>{ah+=cobradoAhorro(f);});
  out.push({key:'savings',label:'Ahorro',raw:num(S.savings),period:'semana',daily:ah/n,id:'savings',cat:'ahorro',cada:'semana'});
  return out;
}

/* ---------- viajes por kilómetro ---------- */
function cfgViajes(){
  const G=data.gastos,v=(G&&G.viajes)||{};
  return{modo:v.modo==='tarifa'?'tarifa':v.modo==='gasolina'?'gasolina':null,rinde:num(v.rinde),
    litro:Array.isArray(v.litro)?v.litro.filter(x=>x&&x.f):[],tarifa:num(v.tarifa),
    rutas:Array.isArray(v.rutas)?v.rutas.filter(r=>r&&r.id):[],carro:v.carro||''};
}
// el precio del litro que valía ese día: el último con fecha ≤ la del viaje
function precioLitro(f,v){
  v=v||cfgViajes();let best=null;
  v.litro.forEach(x=>{if(x.f<=f&&num(x.p)>0&&(!best||x.f>=best.f))best=x;});
  return best?num(best.p):0;
}
// cuánto cuesta cada kilómetro ese día (null si falta algún dato)
function porKm(f,v){
  v=v||cfgViajes();f=f||hoy();
  if(v.modo==='tarifa')return v.tarifa>0?{modo:'tarifa',xkm:v.tarifa}:null;
  if(v.modo==='gasolina'){const p=precioLitro(f,v);return v.rinde>0&&p>0?{modo:'gasolina',xkm:p/v.rinde,precio:p,rinde:v.rinde}:null;}
  return null;
}
const cierresDe=f=>{try{return window.AramoPuente&&window.AramoPuente.cierresDia?window.AramoPuente.cierresDia(f,TIENDA)||[]:[];}catch(e){return[];}};
// Las dos tiendas se reparten el viaje según lo que compró cada una ese día en el Cierre de compras (la mitad si no hay)
function repartoViaje(f,para){
  if(para==='angeles')return{pesos:[1,0],parte:1,base:'solo'};
  let A=0,T=0;
  cierresDe(f).forEach(c=>{
    const t=c.tiendas||{},a=num(t.angeles&&t.angeles.compras),m=num(t.moravia&&t.moravia.compras);
    A+=a;T+=num(c.compras)||(a+m);
  });
  if(T>0){A=Math.min(A,T);return{pesos:[A,T-A],parte:Math.round(A/T*10000)/10000,base:'cierre'};}
  return{pesos:[1,1],parte:0.5,base:'mitad'};
}
// La cuenta completa de un viaje: {km, xkm, total, parte, monto (lo de Los Ángeles), otra, base…} o null si falta algo
function cuentaViaje(o){
  const km=num(o.km),k=o.k||porKm(o.f);
  if(!k||!(km>0))return null;
  const raw=k.modo==='gasolina'?km*k.precio/k.rinde:km*k.xkm,total=Math.round(raw+1e-9);
  const r=repartoViaje(o.f,o.para==='angeles'?'angeles':'dos'),p=CO.partir(total,r.pesos);
  return{km,xkm:k.xkm,modo:k.modo,precio:k.precio||0,rinde:k.rinde||0,total,parte:r.parte,monto:p[0],otra:p[1],base:r.base};
}
const viajeAnotado=f=>(data.plata||[]).some(m=>m&&m.t==='gasto'&&m.concepto==='viaje'&&m.f===f);
// ¿hubo Cierre de compras con compras de Los Ángeles y todavía no hay viaje anotado ese día?
function faltaViaje(f){
  if(viajeAnotado(f))return false;
  return cierresDe(f).some(c=>num(c.tiendas&&c.tiendas.angeles&&c.tiendas.angeles.compras)>0);
}
// la gasolina que ya trae el Cierre de compras ese día (para no contarla dos veces)
function gasolinaDelCierre(f){
  let L=[];try{L=window.AramoPuente&&window.AramoPuente.lineas?window.AramoPuente.lineas(f,TIENDA)||[]:[];}catch(e){}
  const fuera=data.autoFuera||{};
  return L.filter(l=>/^g:/.test(l.id)&&/gasolina/i.test(l.titulo||'')).map(l=>({id:l.id,monto:num(l.monto),fuera:!!fuera[l.id]}));
}

/* ---------- escribir (todo lo que cambia data pasa por aquí; después, save()) ---------- */
function asegurar(){
  if(!data.gastos||typeof data.gastos!=='object')data.gastos={v:1,lista:[],viajes:{}};
  const G=data.gastos;G.v=1;G.viajes=G.viajes&&typeof G.viajes==='object'?G.viajes:{};
  if(!Array.isArray(G.lista)||!G.lista.length)G.lista=VIEJOS.map(v=>({id:v.id,n:v.n,cat:v.cat,cada:'mes',activo:true,viejo:v.id}));
  else VIEJOS.forEach(v=>{if(!G.lista.some(g=>g&&g.id===v.id))G.lista.push({id:v.id,n:v.n,cat:v.cat,cada:'mes',activo:true,viejo:v.id});});
  return G;
}
// Cambia el monto de un gasto (los de siempre: en data.settings). No guarda.
function ponerMonto(id,monto){
  const M=Math.max(0,Math.round(num(monto)));
  if(id==='savings'){data.settings.savings=M;invalidar();return true;}
  const g=porId(id);if(!g)return false;
  if(g.viejo){data.settings[g.viejo]=M;}
  else{const G=asegurar(),x=G.lista.find(y=>y.id===id);if(!x)return false;x.monto=M;}
  invalidar();return true;
}
// Agrega un gasto nuevo. o={n,cat,cada,monto,desde?}. No guarda. Devuelve el gasto.
function agregarGasto(o){
  const G=asegurar();
  const g={id:'g'+uid(),n:String(o.n||'').trim(),cat:CATID.includes(o.cat)?o.cat:'otros',cada:CADAS.includes(o.cada)?o.cada:'mes',monto:Math.max(0,Math.round(num(o.monto))),activo:true,desde:o.desde||hoy()};
  G.lista.push(g);invalidar();return g;
}
// Quitar un gasto: deja de cobrarse desde "desde" (por defecto hoy); los días de antes siguen contando lo que contaron. No guarda.
function quitarGasto(id,desde){
  const G=asegurar(),x=G.lista.find(y=>y.id===id);if(!x)return false;
  x.activo=false;x.hasta=clDateAdd(desde||hoy(),-1);invalidar();return true;
}

window.Gastos={
  // lo que lee el motor
  lista,fijosSemana,dia,esSuelto,
  // cuentas
  porId,activoEn,cobrado,calculado,estadoPeriodo,resumenPeriodo,efecto,pagos,nombre,nomPer,periodoDe,
  cfgViajes,precioLitro,porKm,cuentaViaje,repartoViaje,faltaViaje,gasolinaDelCierre,
  // escribir
  asegurar,ponerMonto,agregarGasto,quitarGasto,invalidar,
  CAT,SUGERIDOS,
  // para que otros módulos (Cierre) sepan qué gastos pagó cada día
  items:f=>dia(f).items
};

/* =====================================================================================================
   PANTALLA
   ===================================================================================================== */
(window.CX_MODULOS=window.CX_MODULOS||[]).push(u=>{
  const ic=u.ic,col=u.col;
  const PL=window.Plata||null;
  const plataOn=()=>!!(PL&&PL.cfg());
  const plegadas=new Set();                                   // categorías cerradas (por defecto, todas abiertas)
  const E=u.estado;
  const CADA_T=CO.CADA;
  const dec=decTxt,colDec=n=>'₡'+decTxt(n);
  const refDia=()=>E.dia>u.hoy()?u.hoy():E.dia;               // el día de referencia (nunca un día que no llegó)
  const perm=async f=>{const Ci=window.Cierres;if(Ci&&Ci.permiso)return !!(await Ci.permiso(f));return true;};
  const noOk=(campo,txt)=>{u.fallo(campo,txt);return false;};
  const nomSocio=id=>PL?(PL.NOMBRE[id]||id):id;
  const ICO_ID={rent:'tienda',electricity:'sol',water:'nube',wifi:'nube',terminal:'tarjeta',taxes:'recibo',insurance:'candado',savings:'estrella'};
  const icoDe=g=>ICO_ID[g.id]||(CAT.find(c=>c.id===g.cat)||{}).ic||'recibo';
  const leerDec=el=>{const n=Number(String(el.value).replace(/\s/g,'').replace(',','.'));return isFinite(n)&&n>0?n:0;};
  const campoDec=(id,et,valor,ayuda,ph)=>`<label class="cx-campo"><span class="cx-et">${esc(et)}</span><input id="${id}" class="ui-campo-in cg-dec" type="text" inputmode="decimal" autocomplete="off" placeholder="${esc(ph||'')}" value="${valor?esc(String(valor).replace('.',',')):''}">${ayuda?`<span class="cx-ayuda">${ayuda}</span>`:''}<span class="cx-error" role="alert"></span></label>`;
  const campoTxt=(id,et,valor,ph,ayuda)=>`<label class="cx-campo"><span class="cx-et">${esc(et)}</span><input id="${id}" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" placeholder="${esc(ph||'')}" value="${esc(valor||'')}">${ayuda?`<span class="cx-ayuda">${ayuda}</span>`:''}<span class="cx-error" role="alert"></span></label>`;
  // quién puso la plata (sin la bolsa si todavía no empezó)
  const opsPago=()=>{
    const o=[];
    if(plataOn())o.push({v:'bolsa',t:'La bolsa',ic:'bolsa'});
    (PL?PL.IDS:['jefes','roger','joseph']).forEach(id=>o.push({v:id,t:nomSocio(id)}));
    o.push({v:'caja',t:'La caja',ic:'caja'});
    return o;
  };
  const pagoDef=()=>plataOn()?'bolsa':'caja';
  const quienTxt=(de,fin)=>de==='bolsa'?'Pagó la bolsa':de==='caja'?'Salió de la caja':'Pagó '+nomSocio(de)+(plataOn()&&fin!==false?': la bolsa se lo devuelve':'');
  const textoEfecto=m=>{
    if(!clNuevo(m.f)||m.concepto==='salario')return '';
    const e=efecto(m.id);
    if(esSuelto(m))return 'Baja la ganancia de ese día';
    return e>0?'Pagó '+col(e)+' más de lo calculado':e<0?'Pagó '+col(-e)+' menos de lo calculado':'Cuadra con lo calculado';
  };

  // dejar la caja y la foto en orden cuando se guarda o se borra un pago
  function ajustarCaja(m,etiqueta){
    if(!window.ControlCaja)return;
    if(m.de==='caja')ControlCaja.ponerSalida(m.f,{enlace:'g:'+m.id,monto:ent(m.monto),motivo:etiqueta,foto:!!m.foto});
    else ControlCaja.quitarSalida('g:'+m.id);
  }
  function ponerPago(m,etiqueta){
    data.plata=(data.plata||[]).filter(x=>x.id!==m.id);data.plata.push(m);
    ajustarCaja(m,etiqueta);
  }
  async function borrarPago(m){
    if(!(await perm(m.f)))return;
    const antes=(data.plata||[]).slice(),salida=window.ControlCaja?ControlCaja.salidaDe('g:'+m.id):null;
    data.plata=antes.filter(x=>x.id!==m.id);
    if(window.ControlCaja)ControlCaja.quitarSalida('g:'+m.id);
    save();
    let deshecho=false;
    u.aviso('Borrado: '+col(m.monto)+'.',{deshacer(){deshecho=true;data.plata=antes;if(salida)ControlCaja.ponerSalida(salida.fecha,{enlace:'g:'+m.id,monto:salida.amount,motivo:salida.concept,foto:salida.foto});save();}});
    if(m.foto)setTimeout(()=>{if(!deshecho)u.Fotos.borrar(m.id);},9000);
  }

  /* ---------- Pagar un gasto ---------- */
  function pagar(o){
    o=o||{};
    const m=o.mov||null,h0=u.hoy(),f=m?m.f:refDia();
    const activos=lista().filter(g=>g.activo||(m&&m.concepto===g.id));
    const conceptos=activos.map(g=>({v:g.id,t:g.n})).concat([{v:'salario',t:'Un salario'},{v:'otro',t:'Otro gasto'}]);
    let sel=m?(conceptos.some(c=>c.v===m.concepto)?m.concepto:'otro'):(o.concepto&&conceptos.some(c=>c.v===o.concepto)?o.concepto:(activos[0]?activos[0].id:'otro'));
    let perSel=null;                       // 'actual' | 'anterior' | un id de período
    if(m&&m.periodo)perSel=m.periodo;
    let completo=m?m.completo!==false:true;
    const gSel=()=>porId(sel);
    const perActual=g=>CO.periodo(f,g.cada),perAnterior=g=>{const a=perActual(g);return CO.periodo(clDateAdd(a.ini,-1),g.cada);};
    const perEscogido=g=>{
      const a=perActual(g);
      if(perSel==='anterior')return perAnterior(g);
      if(perSel&&perSel!=='actual'){const p=periodoPorId(perSel,g.cada);if(p)return p;}
      return a;
    };
    const h=u.ventana({titulo:m?'Corregir el pago':'Pagar un gasto',sub:u.diaLargo(f),clase:'cg-hoja',
      html:u.chips('concepto','¿Qué se pagó?',conceptos,sel)+
        '<div id="cgPer"></div><p class="cg-info" id="cgInfo"></p>'+
        u.campoMonto('cxM','Monto pagado',m?m.monto:(o.monto||''))+
        '<div id="cgComp"></div>'+
        u.chips('pago','¿Quién puso la plata?',opsPago(),m?(m.de||pagoDef()):pagoDef(),plataOn()?'Si fue de su bolsillo, la bolsa se lo devuelve completo.':'La caja: sale del cajón. Si fue de su bolsillo, escogé quién.')+
        `<label class="cx-campo"><span class="cx-et" id="cgNE">Mensaje</span><input id="cxN" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" value="${esc(m&&m.nota||'')}" placeholder="Ej.: luz de octubre"><span class="cx-error" role="alert"></span></label>`+
        u.fotoHTML(m&&m.foto,'Foto del recibo'),
      borrar:m?()=>borrarPago(m):null,borrarTexto:'Borrar este pago',
      listo(c){
        const $=s=>c.querySelector(s),inp=$('#cxM');
        const ft=u.atarFoto(c,m&&m.id,m&&m.foto);c._ft=ft;
        const pintar=()=>{
          const g=gSel(),cat=!!g;
          $('#cgNE').textContent=sel==='otro'?'¿Qué fue?':'Mensaje';
          $('#cxN').placeholder=sel==='otro'?'Ej.: arreglo del toldo':sel==='salario'?'Ej.: salario de Genesis':'Ej.: luz de octubre';
          // el período: el de hoy o el anterior ("es la luz de octubre")
          const P=$('#cgPer'),I=$('#cgInfo'),K=$('#cgComp');
          if(cat&&g.cada!=='dia'){
            const a=perActual(g),b=perAnterior(g),ops=[{v:'actual',t:nomPer(a,g.cada)+' (este)'},{v:'anterior',t:nomPer(b,g.cada)+' (el anterior)'}];
            let v=perSel==='anterior'?'anterior':'actual';
            if(perSel&&perSel!=='actual'&&perSel!=='anterior'){const p=periodoPorId(perSel,g.cada);if(p&&p.id===b.id)v='anterior';else if(p&&p.id!==a.id){ops.push({v:p.id,t:nomPer(p,g.cada)});v=p.id;}}
            P.innerHTML=u.chips('periodo','¿De cuál '+(g.cada==='mes'?'mes':g.cada==='semana'?'semana':g.cada==='trimestre'?'trimestre':'año')+' es?',ops,v);
          }else P.innerHTML='';
          if(cat){
            const per=perEscogido(g),r=resumenPeriodo(g,per);
            const propio=m&&m.concepto===g.id&&String(periodoDe(m,g).id)===per.id?ent(m.monto):0;   // lo que se está corrigiendo no cuenta dos veces
            const A=r.A-propio,falta=r.E-A;
            I.innerHTML=`Se había calculado <b>${col(r.E)}</b> para ${esc(nomPer(per,g.cada).toLowerCase())}. Ya van pagados <b>${col(A)}</b>.${falta>0?` Faltan <b>${col(falta)}</b>. <button type="button" class="cx-enlace cg-usar" data-usar="${falta}">Usar ${col(falta)}</button>`:''}`;
            I.hidden=false;
            K.innerHTML=u.chips('completo','¿Con esto queda pagado?',[{v:'si',t:'Sí, queda pagado'},{v:'no',t:'No, es un abono'}],completo?'si':'no','Si pagaste menos o más de lo calculado, la diferencia entra en la ganancia de ese día.');
          }else{
            I.innerHTML=sel==='salario'?'Los salarios salen de Horarios. Este pago solo mueve la plata: no cambia la ganancia.':'Es un gasto de una sola vez: baja la ganancia del día completo.';
            I.hidden=false;K.innerHTML='';
          }
        };
        pintar();
        c.addEventListener('cambio',e=>{
          const gr=e.target.dataset.grupo;
          if(gr==='concepto'){sel=e.detail;perSel=null;completo=true;pintar();}
          else if(gr==='periodo'){perSel=e.detail;pintar();}
          else if(gr==='completo'){completo=e.detail==='si';}
        });
        c.addEventListener('click',e=>{
          const b=e.target.closest('[data-usar]');
          if(b){inp.value=Number(b.dataset.usar).toLocaleString('es-CR');inp.focus();}
        });
        inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#cxN').focus();}});
        $('#cxN').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();h.guardar();}});
      },
      async guardar(c){
        const inp=c.querySelector('#cxM'),nota=c.querySelector('#cxN'),monto=u.leerMonto(inp);
        if(!monto)return noOk(inp.closest('.cx-campo'),'Escribí cuánto se pagó.');
        const txt=nota.value.trim();
        if(sel==='otro'&&!txt)return noOk(nota.closest('.cx-campo'),'Escribí qué fue, para acordarse.');
        if(!(await perm(f)))return false;
        const g=gSel(),de=u.escogido(c,'pago')||pagoDef(),id=m?m.id:uid(),foto=await c._ft.guardar(id);
        const mov={...(m||{}),id,f,t:'gasto',de,a:'gasto',concepto:sel,monto,nota:txt,foto,at:m?m.at:new Date().toISOString()};
        delete mov.periodo;delete mov.completo;
        if(g){
          const per=perEscogido(g);
          if(per.id!==perActual(g).id)mov.periodo=per.id;
          mov.completo=completo;
        }
        ponerPago(mov,g?g.n+(txt?' · '+txt:''):(sel==='salario'?'Salario':txt||'Gasto'));
        save();
        const e=efecto(id),nuevo=clNuevo(f);
        let q=de==='bolsa'?'':de==='caja'?' · salió de la caja':' · lo pagó '+nomSocio(de)+(plataOn()?' y la bolsa se lo devuelve':'');
        let r;
        if(!nuevo||sel==='salario')r='no cambia la ganancia';
        else if(!g)r='baja la ganancia de ese día';
        else r=e>0?'pagaste '+col(e)+' más de lo calculado: baja la ganancia':e<0?'pagaste '+col(-e)+' menos de lo calculado: sube la ganancia':'cuadra con lo calculado';
        u.aviso(`${m?'Corregido':'Anotado'}: ${nombre(sel).toLowerCase()} ${col(monto)}${q}. ${cap(r)}.`,{ms:7000});
      }});
  }

  /* ---------- Anotar un viaje ---------- */
  function viaje(o){
    o=o||{};
    const m=o.mov||null,h0=u.hoy(),f=m?m.f:(o.f||refDia());
    const V=cfgViajes();
    if(!m&&!porKm(f)){u.aviso(V.modo?'Falta un dato para contar los kilómetros. Revisalo aquí.':'Primero escogé cómo se cuentan los kilómetros.',{tipo:'info',ms:6000});return ajustesViajes();}
    const kfijo=m&&!porKm(f)&&m.xkm?{modo:m.modo||'tarifa',xkm:num(m.xkm),precio:0,rinde:0}:null;
    const K=()=>porKm(f)||kfijo;
    let ruta=m?(V.rutas.find(r=>r.n===m.ruta)?V.rutas.find(r=>r.n===m.ruta).id:'mano'):(V.rutas[0]?V.rutas[0].id:'mano');
    let para=m&&m.para?m.para:'dos';
    const carros=[];
    (PL?PL.IDS:['jefes','roger','joseph']).forEach(id=>carros.push({v:id,t:nomSocio(id)}));
    const carroDef=m&&carros.some(c=>c.v===m.de)?m.de:(carros.some(c=>c.v===V.carro)?V.carro:'');
    const rutaKm=()=>{const r=V.rutas.find(x=>x.id===ruta);return r?num(r.km):0;};
    const h=u.ventana({titulo:m?'Corregir el viaje':'Anotar un viaje',sub:u.diaLargo(f),clase:'cg-hoja',
      html:(V.rutas.length?u.chips('ruta','¿A dónde?',V.rutas.map(r=>({v:r.id,t:r.n+' · '+dec(num(r.km))+' km'})).concat([{v:'mano',t:'Otros kilómetros'}]),ruta):'')+
        campoDec('cgKm','Kilómetros del viaje',m?m.km:(ruta!=='mano'?rutaKm():''),'Ida y vuelta, todo junto.','Ej.: 28')+
        u.chips('carro','¿De quién es el carro?',carros,carroDef,plataOn()?'Los kilómetros se le pagan a él: la bolsa se lo devuelve.':'Los kilómetros se le pagan a él.')+
        u.chips('para','¿Para quién fue el viaje?',[{v:'dos',t:'Las dos tiendas'},{v:'angeles',t:'Solo Los Ángeles'}],para)+
        '<div class="cg-cuenta" id="cgCuenta" aria-live="polite"></div><div id="cgGas"></div>'+
        campoTxt('cxN','Mensaje',m&&m.nota,'Ej.: viaje al mercado del jueves')+u.fotoHTML(m&&m.foto,'Foto del recibo de la gasolina'),
      borrar:m?()=>borrarPago(m):null,borrarTexto:'Borrar este viaje',
      listo(c){
        const $=s=>c.querySelector(s),km=$('#cgKm');
        const ft=u.atarFoto(c,m&&m.id,m&&m.foto);c._ft=ft;
        const cuenta=()=>{
          const k=K(),box=$('#cgCuenta'),n=leerDec(km);
          if(!k){box.innerHTML='Falta el precio del litro para este día. Ponelo en «Ajustes de los viajes».';box.className='cg-cuenta mal';return null;}
          const r=cuentaViaje({km:n,f,para,k});
          const base=k.modo==='gasolina'?`Gasolina: ${colDec(k.precio)} el litro ÷ ${dec(k.rinde)} km por litro = ${colDec(k.xkm)} por km.`:`Tarifa de ${colDec(k.xkm)} por km: ya incluye gasolina, aceite, llantas y desgaste.`;
          if(!r){box.innerHTML=`${esc(base)}<br>Escribí los kilómetros para ver la cuenta.`;box.className='cg-cuenta';return null;}
          const reparto=para==='angeles'?`Todo es de Los Ángeles: <b>${col(r.monto)}</b>`:`A Los Ángeles le toca el <b>${Math.round(r.parte*100)} %</b>: <b>${col(r.monto)}</b>`;
          const nota=para==='angeles'?'':r.base==='cierre'?'Según lo que compró cada tienda ese día en el Cierre de compras.':'Ese día no hay Cierre de compras: se parte por la mitad.';
          box.innerHTML=`<b>${dec(n)} km × ${colDec(r.xkm)} = ${col(r.total)}</b><br>${reparto}${nota?`<small>${nota}</small>`:''}<small>${esc(base)}</small>`;
          box.className='cg-cuenta bien';return r;
        };
        // la gasolina que ya trae el Cierre de compras: que no se cuente dos veces
        const avisoGas=()=>{
          const G=gasolinaDelCierre(f),box=$('#cgGas');
          if(!G.length){box.innerHTML='';return;}
          const tot=G.reduce((t,x)=>t+x.monto,0),fuera=G.every(x=>x.fuera);
          box.innerHTML=fuera
            ?`<div class="cg-aviso"><b>La gasolina del cierre de compras (${col(tot)}) ya no se cuenta.</b> Este viaje la reemplaza.<button type="button" class="cx-segundo ancho" data-gas="volver">Volver a contarla</button></div>`
            :`<div class="cg-aviso"><b>En el cierre de compras ya anotaron ${col(tot)} de gasolina.</b> Si es este mismo viaje, se cuenta una sola vez.<button type="button" class="cx-segundo ancho" data-gas="fuera">Ese es este viaje: no contar la del cierre</button></div>`;
        };
        cuenta();avisoGas();
        c.addEventListener('cambio',e=>{
          const gr=e.target.dataset.grupo;
          if(gr==='ruta'){ruta=e.detail;if(ruta!=='mano'){km.value=String(rutaKm()).replace('.',',');}else{km.value='';km.focus();}cuenta();}
          else if(gr==='para'){para=e.detail;cuenta();}
        });
        km.addEventListener('input',()=>{
          const r=V.rutas.find(x=>x.id===ruta);
          if(r&&num(r.km)!==leerDec(km)){ruta='mano';c.querySelectorAll('[data-grupo="ruta"] [data-op]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.op==='mano')));}
          cuenta();
        });
        c.addEventListener('click',e=>{
          const b=e.target.closest('[data-gas]');if(!b)return;
          const G=gasolinaDelCierre(f);data.autoFuera=data.autoFuera||{};
          G.forEach(x=>{if(b.dataset.gas==='fuera')data.autoFuera[x.id]=1;else delete data.autoFuera[x.id];});
          save();avisoGas();
        });
        km.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#cxN').focus();}});
        $('#cxN').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();h.guardar();}});
      },
      async guardar(c){
        const $=s=>c.querySelector(s),kmEl=$('#cgKm'),n=leerDec(kmEl);
        if(!n)return noOk(kmEl.closest('.cx-campo'),'Escribí cuántos kilómetros fueron.');
        const k=K();if(!k)return noOk(kmEl.closest('.cx-campo'),'Falta el precio del litro de ese día.');
        const r=cuentaViaje({km:n,f,para,k});
        if(!r||r.monto<=0)return noOk(kmEl.closest('.cx-campo'),'A Los Ángeles no le toca nada de este viaje.');
        if(!(await perm(f)))return false;
        const de=u.escogido(c,'carro')||carroDef;
        if(!de)return noOk(c.querySelector('[data-campo-de="carro"]'),'Escogé de quién es el carro.');
        const id=m?m.id:uid(),foto=await c._ft.guardar(id),rt=V.rutas.find(x=>x.id===ruta);
        const mov={...(m||{}),id,f,t:'gasto',de,a:'gasto',concepto:'viaje',monto:r.monto,km:n,xkm:r.xkm,total:r.total,parte:r.parte,para,modo:r.modo,
          ruta:rt&&ruta!=='mano'?rt.n:'',nota:$('#cxN').value.trim(),foto,at:m?m.at:new Date().toISOString()};
        ponerPago(mov,'Viaje · '+dec(n)+' km');
        save();
        const q=de==='bolsa'||de==='caja'?'':' · se le paga a '+nomSocio(de)+(plataOn()?' y la bolsa se lo devuelve':'');
        u.aviso(`${m?'Corregido':'Anotado'}: viaje de ${dec(n)} km, ${col(r.total)}${para==='dos'?` (a Los Ángeles ${col(r.monto)})`:''}${q}.`,{ms:7000});
      }});
  }

  /* ---------- Ajustes de los viajes ---------- */
  function ajustesViajes(){
    const V=cfgViajes(),h0=u.hoy();
    let modo=V.modo||'gasolina';
    const rutas=V.rutas.map(r=>({...r}));
    const carros=(PL?PL.IDS:['jefes','roger','joseph']).map(id=>({v:id,t:nomSocio(id)}));
    const vigente=precioLitro(h0,V);
    const ult=V.litro.slice().sort((a,b)=>b.f.localeCompare(a.f)).slice(0,3);
    const hj=u.ventana({titulo:'Ajustes de los viajes',sub:'Cómo se cuenta cada kilómetro',clase:'cg-hoja',si:'Guardar',
      html:'<p class="cx-hoja-texto">Hay dos formas de contar un viaje. Escogé una: no se mezclan.</p>'+
        u.chips('modo','¿Cómo se cuenta?',[{v:'gasolina',t:'Solo gasolina'},{v:'tarifa',t:'Tarifa por kilómetro'}],modo)+
        '<p class="cg-info" id="cgModoT"></p>'+
        '<div id="cgGasol">'+
          campoDec('cgRinde','Kilómetros por litro (lo que rinde el carro)',V.rinde||'','Ej.: si con un litro anda 10 km, escribí 10.','Ej.: 10')+
          campoDec('cgLitro','Precio del litro hoy',vigente||'',ult.length?'Antes: '+ult.map(x=>colDec(x.p)+' desde el '+u.diaCorto(x.f)).join(' · ')+'.':'Ejemplo de hoy: la súper está a ₡805; la regular y el diésel, a ₡807.','Ej.: 805')+
          `<label class="cx-campo"><span class="cx-et">El precio vale desde</span><input id="cgLitroF" class="ui-campo-in" type="date" value="${h0}"><span class="cx-ayuda">Cada viaje usa el precio que valía ese día: si el precio cambia, los viajes de antes no se mueven.</span></label>`+
        '</div>'+
        '<div id="cgTarifa">'+campoDec('cgTar','Tarifa por kilómetro',V.tarifa||'','Lo acordaron los tres. Ya incluye gasolina, aceite, llantas y desgaste.','Ej.: 95')+'</div>'+
        u.chips('carro','¿De quién es el carro? (por defecto)',carros,carros.some(c=>c.v===V.carro)?V.carro:'', 'Se le paga a él cada viaje.')+
        '<h3 class="cg-sub">Rutas de siempre</h3><div id="cgRutas" class="cx-lista"></div>'+
        '<div class="cg-ruta-nueva"><input id="cgRN" class="ui-campo-in" type="text" maxlength="40" placeholder="Nombre: Mercado, ida y vuelta" aria-label="Nombre de la ruta"><input id="cgRK" class="ui-campo-in cg-km" type="text" inputmode="decimal" placeholder="km" aria-label="Kilómetros de la ruta"><button type="button" class="cx-segundo" id="cgRA">Agregar</button></div>'+
        '<span class="cx-error" id="cgRE" role="alert"></span>',
      listo(c){
        const $=s=>c.querySelector(s);
        const ver=()=>{
          $('#cgGasol').hidden=modo!=='gasolina';$('#cgTarifa').hidden=modo!=='tarifa';
          $('#cgModoT').innerHTML=modo==='gasolina'
            ?'<b>Solo gasolina:</b> cada kilómetro cuesta el precio del litro de ese día ÷ lo que rinde el carro. Ejemplo: ₡805 ÷ 10 km por litro = ₡80,5 por km.'
            :'<b>Tarifa por kilómetro:</b> un monto fijo por km que los tres acuerdan. Ya incluye gasolina, aceite, llantas y desgaste del carro.';
        };
        const pintRutas=()=>{
          $('#cgRutas').innerHTML=rutas.length?rutas.map((r,i)=>`<div class="cg-ruta"><span><b>${esc(r.n)}</b><small>${dec(num(r.km))} km</small></span><button type="button" class="cx-enlace" data-quitar="${i}" aria-label="Quitar la ruta ${esc(r.n)}">${ic('borrar',18)} Quitar</button></div>`).join('')
            :'<p class="cx-vacio">Sin rutas todavía. Agregá las de siempre (el mercado, la bodega) para anotar un viaje con un toque.</p>';
        };
        ver();pintRutas();
        c.addEventListener('cambio',e=>{if(e.target.dataset.grupo==='modo'){modo=e.detail;ver();}});
        const agregarRuta=()=>{
          const n=$('#cgRN').value.trim(),k=leerDec($('#cgRK'));
          if(!n&&!$('#cgRK').value.trim())return true;
          if(!n||!k){$('#cgRE').textContent='Para agregar una ruta escribí el nombre y los kilómetros.';return false;}
          $('#cgRE').textContent='';rutas.push({id:'r'+uid(),n,km:k});$('#cgRN').value='';$('#cgRK').value='';pintRutas();return true;
        };
        $('#cgRA').addEventListener('click',()=>{if(agregarRuta())$('#cgRN').focus();});
        c.addEventListener('click',e=>{const b=e.target.closest('[data-quitar]');if(b){rutas.splice(Number(b.dataset.quitar),1);pintRutas();}});
        c._agregarRuta=agregarRuta;
      },
      guardar(c){
        const $=s=>c.querySelector(s);
        if(!c._agregarRuta())return false;
        const v={modo,rinde:leerDec($('#cgRinde')),tarifa:leerDec($('#cgTar')),rutas};
        if(modo==='gasolina'){
          if(!v.rinde)return noOk($('#cgRinde').closest('.cx-campo'),'Escribí cuántos kilómetros anda el carro con un litro.');
        }else if(!v.tarifa)return noOk($('#cgTar').closest('.cx-campo'),'Escribí la tarifa por kilómetro.');
        const G=asegurar(),prev=cfgViajes(),p=leerDec($('#cgLitro')),pf=$('#cgLitroF').value||h0;
        let litro=prev.litro.slice();
        if(p>0&&(precioLitro(pf,prev)!==p||litro.some(x=>x.f===pf))){litro=litro.filter(x=>x.f!==pf);litro.push({f:pf,p});}
        else if(modo==='gasolina'&&!(p>0)&&!precioLitro(h0,prev))return noOk($('#cgLitro').closest('.cx-campo'),'Escribí el precio del litro.');
        litro.sort((a,b)=>a.f.localeCompare(b.f));
        const carro=u.escogido(c,'carro')||'';
        G.viajes={...G.viajes,modo,rinde:v.rinde||prev.rinde,tarifa:v.tarifa||prev.tarifa,litro,rutas:v.rutas,carro};
        invalidar();save();
        u.aviso(modo==='gasolina'?'Listo: los viajes se cuentan solo con la gasolina.':'Listo: los viajes se cuentan con la tarifa por kilómetro.');
      }});
  }

  /* ---------- Agregar un gasto ---------- */
  function agregar(){
    let cat='operacion',cada='mes',desdeSel='hoy';
    const h0=u.hoy();
    const textoCada=c=>({dia:'cada día',semana:'cada semana',mes:'cada mes',trimestre:'cada tres meses',anio:'cada año'})[c];
    const hj=u.ventana({titulo:'Agregar un gasto',sub:'Para que ni un colón se quede sin contar',clase:'cg-hoja',si:'Agregar',
      html:'<label class="cx-campo"><span class="cx-et">Escogé uno de la lista</span><select id="cgSug" class="ui-campo-in cg-sel"><option value="">Otro: escribo el nombre</option>'+SUGERIDOS.map((s,i)=>`<option value="${i}">${esc(s.n)}</option>`).join('')+'</select><span class="cx-ayuda">Se llena el nombre y cada cuánto se paga. Vos solo ponés el monto.</span></label>'+
        campoTxt('cgNom','Nombre del gasto','','Ej.: Patente municipal')+
        u.chips('cat','Tipo',CAT.map(x=>({v:x.id,t:x.n})),cat)+
        u.chips('cada','¿Cada cuánto se paga?',CADAS.map(x=>({v:x,t:({dia:'Cada día',semana:'Cada semana',mes:'Cada mes',trimestre:'Cada 3 meses',anio:'Cada año'})[x]})),cada)+
        u.campoMonto('cxM','Monto de cada pago','','')+
        '<div id="cgDesde"></div>',
      listo(c){
        const $=s=>c.querySelector(s);
        const ponerChips=(g,v)=>c.querySelectorAll(`[data-grupo="${g}"] [data-op]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.op===v)));
        const desde=()=>{
          const per=CO.periodo(h0,cada),nom=cada==='dia'?'':nomPer(per,cada).toLowerCase();
          $('#cgDesde').innerHTML=cada==='dia'?'':u.chips('desde','¿Desde cuándo cuenta?',[{v:'hoy',t:'Desde hoy'},{v:'inicio',t:'Desde el principio de '+(cada==='semana'?'esta semana':cada==='mes'?'este mes':cada==='trimestre'?'este trimestre':'este año')}],desdeSel,
            desdeSel==='hoy'?'Solo se cobra lo que falta de '+nom+'. Cada día suma su parte.':'También se cobran los días de '+nom+' que ya pasaron.');
          $('#cxM').closest('.cx-campo').querySelector('.cx-et').textContent='Monto '+(cada==='mes'?'de cada mes':cada==='semana'?'de cada semana':cada==='trimestre'?'de cada trimestre':cada==='anio'?'de cada año':'de cada día');
        };
        desde();
        $('#cgSug').addEventListener('change',e=>{
          const s=SUGERIDOS[Number(e.target.value)];
          if(!s){$('#cgNom').value='';$('#cgNom').focus();return;}
          $('#cgNom').value=s.n;cat=s.cat;cada=s.cada;ponerChips('cat',cat);ponerChips('cada',cada);desde();$('#cxM').focus();
        });
        c.addEventListener('cambio',e=>{
          const gr=e.target.dataset.grupo;
          if(gr==='cat')cat=e.detail;else if(gr==='cada'){cada=e.detail;desde();}else if(gr==='desde'){desdeSel=e.detail;desde();}
        });
      },
      async guardar(c){
        const $=s=>c.querySelector(s),nom=$('#cgNom').value.trim(),monto=u.leerMonto($('#cxM'));
        if(!nom)return noOk($('#cgNom').closest('.cx-campo'),'Escribí cómo se llama el gasto.');
        if(!monto)return noOk($('#cxM').closest('.cx-campo'),'Escribí el monto de cada pago.');
        if(lista().some(g=>g.activo&&g.n.toLowerCase()===nom.toLowerCase()))return noOk($('#cgNom').closest('.cx-campo'),'Ya tenés un gasto con ese nombre.');
        const per=CO.periodo(h0,cada),desde=cada!=='dia'&&desdeSel==='inicio'?per.ini:h0;
        if(desde<h0&&!(await perm(desde)))return false;
        agregarGasto({n:nom,cat,cada,monto,desde});save();
        u.aviso(`Listo: ${nom} ${col(monto)} ${textoCada(cada)}. Ya se cobra un poquito cada día.`,{ms:6000});
      }});
  }

  /* ---------- Cambiar o quitar un gasto ---------- */
  function editar(id){
    const esAh=id==='savings',g=esAh?{id:'savings',n:'Ahorro',cat:'ahorro',cada:'semana',viejo:'savings',monto:num((data.settings||{}).savings),activo:true}:porId(id);
    if(!g)return;
    let cada=g.cada;
    const per=CO.periodo(refDia(),g.cada),st=esAh?null:estadoPeriodo(g,refDia());
    const etMonto=c=>c==='semana'?'Monto de la semana':c==='mes'?'Monto del mes':c==='trimestre'?'Monto del trimestre':c==='anio'?'Monto del año':'Monto del día';
    u.ventana({titulo:g.n,sub:esAh?'Se guarda cada semana: no es un gasto, es plata de los tres':(CADA_T[g.cada]?cap(CADA_T[g.cada]):'')+' · '+(CAT.find(x=>x.id===g.cat)||{n:''}).n,clase:'cg-hoja',
      html:(g.viejo||esAh?'':campoTxt('cgNom','Nombre',g.n,'Ej.: Patente municipal'))+
        u.campoMonto('cxM',etMonto(cada),g.monto,esAh?'Se aparta cada semana y queda a nombre de los tres (20/40/40).':'')+
        (g.viejo||esAh?'':u.chips('cada','¿Cada cuánto se paga?',CADAS.map(x=>({v:x,t:({dia:'Cada día',semana:'Cada semana',mes:'Cada mes',trimestre:'Cada 3 meses',anio:'Cada año'})[x]})),cada))+
        (st?`<p class="cg-info">${esc(st.texto)}. Se había calculado <b>${col(st.E)}</b> y van pagados <b>${col(st.A)}</b>.</p><button type="button" class="cx-segundo ancho" data-pagar="${esc(g.id)}">${ic('recibo',18)} Pagar este gasto</button>`:'')+
        '<p class="cx-ayuda cg-aviso-cambio">Si cambiás el monto, también cambia lo que se calcula de los días que todavía no se cerraron.</p>',
      borrar:esAh?null:()=>quitar(g),borrarTexto:'Quitar este gasto',
      listo(c,hh){
        c.addEventListener('cambio',e=>{if(e.target.dataset.grupo==='cada'){cada=e.detail;c.querySelector('#cxM').closest('.cx-campo').querySelector('.cx-et').textContent=etMonto(cada);}});
        c.addEventListener('click',e=>{const b=e.target.closest('[data-pagar]');if(b){hh.cerrar();pagar({concepto:b.dataset.pagar});}});
      },
      async guardar(c){
        const inp=c.querySelector('#cxM'),monto=u.leerMonto(inp);
        if(!monto&&!g.viejo&&!esAh)return noOk(inp.closest('.cx-campo'),'Escribí el monto. Para dejar de cobrarlo usá «Quitar este gasto».');
        const nomEl=c.querySelector('#cgNom'),nom=nomEl?nomEl.value.trim():g.n;
        if(nomEl&&!nom)return noOk(nomEl.closest('.cx-campo'),'Escribí el nombre.');
        const igual=monto===ent(g.monto)&&cada===g.cada&&nom===g.n;
        if(igual)return;
        ponerMonto(g.id,monto);
        if(!g.viejo&&!esAh){const x=asegurar().lista.find(y=>y.id===g.id);if(x){x.n=nom;x.cada=cada;}}
        invalidar();save();
        u.aviso(`${nom}: ${col(monto)} ${CADA_T[cada]||''}.`);
      }});
  }
  async function quitar(g){
    const ok=await AramoUI.confirmar({titulo:'¿Quitar '+g.n+'?',texto:'Deja de cobrarse desde hoy. Los días de antes siguen contando lo que contaron, y los pagos que ya anotaste no se borran.',si:'Sí, quitar',peligro:true});
    if(!ok)return;
    const antes=JSON.stringify(data.gastos||null),existia=!!data.gastos;
    quitarGasto(g.id);save();
    u.aviso(g.n+' ya no se cobra desde hoy.',{ms:8000,deshacer(){data.gastos=existia?JSON.parse(antes):undefined;if(!existia)delete data.gastos;invalidar();save();}});
  }
  // volver a poner uno que se quitó: un gasto nuevo que cuenta desde hoy (los días de en medio no se tocan)
  function reponer(id){
    const g=porId(id);if(!g)return;
    const n=agregarGasto({n:g.n,cat:g.cat,cada:g.cada,monto:g.monto,desde:u.hoy()});
    save();u.aviso(g.n+' vuelve a cobrarse desde hoy.');return n;
  }

  /* ---------- la pantalla ---------- */
  const fila=(icn,t,sub,monto,k,extra)=>`<button type="button" class="cx-fila" data-cx="${k}"${extra||''}><span class="cx-ico" aria-hidden="true">${ic(icn,20)}</span><span class="cx-fila-t"><b>${t}</b><small>${sub}</small></span>${monto!=null?`<b>${monto}</b>`:''}${ic('siguiente',20)}</button>`;
  function renglonPago(m,conEfecto){
    const g=porId(m.concepto),viaje=m.concepto==='viaje',ef=conEfecto?textoEfecto(m):'';
    const per=g&&m.periodo?' · '+nomPer(periodoDe(m,g),g.cada).toLowerCase():'';
    const nt=m.nota?' · '+m.nota:'';
    const tit=viaje?etiquetaSuelto(m):g?g.n+per+nt:m.concepto==='salario'?'Salario'+nt:(m.nota||'Otro gasto');
    const det=[u.diaCorto(m.f),quienTxt(m.de)];
    if(viaje&&m.xkm)det.push(dec(num(m.km))+' km × '+colDec(m.xkm)+(m.para==='angeles'?' · solo Los Ángeles':' · a Los Ángeles '+Math.round(num(m.parte)*100)+' %'));
    if(ef)det.push(ef);
    return `<article class="cx-renglon"><button type="button" class="cx-renglon-b" data-cx="gasto" data-id="${esc(m.id)}"><span class="cx-ico" aria-hidden="true">${ic(viaje?'camion':'recibo',20)}</span>
      <span class="cx-renglon-t"><b>${esc(tit)}</b><small>${esc(det.join(' · '))}</small></span>
      <span class="cx-renglon-m"><b>${col(m.monto)}</b></span></button>${m.foto?u.miniFoto(m.id):''}</article>`;
  }
  function seccion(k,icn,t,sub,monto,cuerpo){
    const abierta=E.abiertos.has(k);
    return `<button type="button" class="cx-fila cg-sec" data-cx="g-abrir" data-k="${k}" aria-expanded="${abierta}"><span class="cx-ico" aria-hidden="true">${ic(icn,20)}</span><span class="cx-fila-t"><b>${t}</b><small>${sub}</small></span>${monto!=null?`<b>${monto}</b>`:''}<span class="cg-chev${abierta?' on':''}" aria-hidden="true">${ic('siguiente',20)}</span></button>${abierta?`<div class="cx-lista cg-abierta">${cuerpo}</div>`:''}`;
  }
  function vGastos(){
    const W=u.semana(),D=u.dia(),ref=refDia(),L=W.inicio,fin=clDateAdd(L,6);
    const filas=W.fixedMonthly.filter(f=>f.key!=='savings').map(f=>({f,g:porId(f.key),sem:Math.round(num(f.daily)*7)})).filter(x=>x.g);
    const ahF=W.fixedMonthly.find(f=>f.key==='savings'),ahSem=ahF?Math.round(num(ahF.daily)*7):0;
    const fijosSem=filas.reduce((t,x)=>t+x.sem,0)+ahSem;
    // salarios: salen de Horarios
    const gente={};
    W.perDay.forEach(d=>Object.values(clHourlyDetailForDay(d.dayName)).forEach(x=>{const g=gente[x.name]||(gente[x.name]={h:0,p:0});g.h+=num(x.hours);g.p+=num(x.pay);}));
    const salSem=Math.round(u.sumar(W.perDay,d=>d.salarioTotal)),comision=Math.round(u.sumar(W.perDay,d=>num(d.manual.card)-d.datafonoNeto));
    // lo de la semana: viajes, sueltos y lo pagado de más o de menos
    const movs=(data.plata||[]).filter(m=>m&&m.t==='gasto');
    const semana=movs.filter(m=>m.f>=L&&m.f<=fin).sort((a,b)=>(b.f+(b.at||'')).localeCompare(a.f+(a.at||'')));
    const viajes=semana.filter(m=>m.concepto==='viaje'),sueltos=semana.filter(m=>esSuelto(m)&&m.concepto!=='viaje');
    const ajustes=Math.round(u.sumar(W.perDay,d=>d.gastosAjuste)),variosViajes=Math.round(u.sumar(W.perDay,d=>d.gastosVarios))-ajustes;
    const otrosSem=ajustes+variosViajes,total=fijosSem+salSem+otrosSem;
    const hoyT=Math.round(D.fixedTotal+D.salarioTotal+D.gastosVarios);
    // los fijos, por tipo
    const grupos=CAT.map(c=>({c,L:filas.filter(x=>x.g.cat===c.id)})).filter(x=>x.L.length);
    const mesV=ref.slice(0,7),mesN=cap(MESES[+mesV.slice(5,7)-1]);
    const delMes=movs.filter(m=>m.f.slice(0,7)===mesV);
    const pagosMes=delMes.filter(m=>!esSuelto(m)&&m.concepto!=='salario').sort((a,b)=>(b.f+(b.at||'')).localeCompare(a.f+(a.at||'')));
    const salMes=delMes.filter(m=>m.concepto==='salario');
    const quitados=lista().filter(g=>!g.activo);
    const V=cfgViajes(),listoV=!!porKm(ref,V);
    const resumenV=!V.modo?'Sin configurar: escogé cómo se cuenta cada kilómetro':V.modo==='tarifa'?`Tarifa de ${colDec(V.tarifa)} por km`:`Solo gasolina${precioLitro(ref,V)?' · '+colDec(precioLitro(ref,V))+' el litro':''}${V.rinde?' · rinde '+dec(V.rinde)+' km':''}`;
    const est=g=>{const s=g.activo?estadoPeriodo(g,ref):null;return s?`<small class="cg-est ${s.clase}">${esc(s.texto)}</small>`:'';};
    return u.barra()+u.tiraDias()+u.cabeza('Semana '+clWeekNumber(L),'Gastos',col(total),
      `Lo que cuesta la semana: gastos fijos, salarios, viajes y lo demás. ${D.date===u.hoy()?'Hoy van':'El '+u.diaCorto(D.date)+' fueron'} <b>${col(hoyT)}</b>.`,'gas')+`
    <div class="cx-cajitas">
      <div class="cx-cajita"><small>Fijos</small><b>${col(fijosSem)}</b></div>
      <div class="cx-cajita"><small>Salarios</small><b>${col(salSem)}</b></div>
      <div class="cx-cajita"><small>Viajes y más</small><b>${col(otrosSem)}</b></div>
    </div>
    <p class="cx-nota arriba">Cada gasto fijo se cobra un poquito cada día. Cuando lo pagás, si fue más o menos de lo calculado, la diferencia entra ese día. Los fijos incluyen ${col(ahSem)} de ahorro: no se gasta, se guarda para los tres.</p>
    <h2 class="cx-h2">Gastos fijos <span>${col(fijosSem-ahSem)}</span></h2>
    ${grupos.map(({c,L:lst})=>{
      const cerrada=plegadas.has(c.id),sum=lst.reduce((t,x)=>t+x.sem,0);
      return `<button type="button" class="cg-cat" data-cx="g-cat" data-k="${c.id}" aria-expanded="${!cerrada}"><span class="cx-ico" aria-hidden="true">${ic(c.ic,18)}</span><b>${esc(c.n)}</b><span class="cg-cat-m">${col(sum)}</span><span class="cg-chev${cerrada?'':' on'}" aria-hidden="true">${ic('siguiente',18)}</span></button>
      ${cerrada?'':`<div class="cx-lista">${lst.map(({f,g,sem})=>`<button type="button" class="cx-fijo" data-cx="g-editar" data-k="${esc(g.id)}">
        <span class="cx-ico" aria-hidden="true">${ic(icoDe(g),20)}</span>
        <span class="cx-fijo-t"><b>${esc(g.n)}</b><small>${col(g.monto)} ${CADA_T[g.cada]}</small>${est(g)}</span>
        <span class="cx-fijo-m"><b>${col(sem)}</b><small>esta semana</small></span>
        <span class="cx-lapiz" aria-hidden="true">${ic('editar',16)}</span></button>`).join('')}</div>`}`;
    }).join('')}
    <h2 class="cx-h2">Ahorro <span>${col(ahSem)}</span></h2>
    <div class="cx-lista"><button type="button" class="cx-fijo" data-cx="g-editar" data-k="savings">
      <span class="cx-ico" aria-hidden="true">${ic('estrella',20)}</span>
      <span class="cx-fijo-t"><b>Ahorro</b><small>${col(num((data.settings||{}).savings))} por semana<br>No es un gasto: es plata que se guarda a nombre de los tres</small></span>
      <span class="cx-fijo-m"><b>${col(ahSem)}</b><small>esta semana</small></span>
      <span class="cx-lapiz" aria-hidden="true">${ic('editar',16)}</span></button></div>
    <h2 class="cx-h2">Salarios y datáfono <span>${col(salSem+comision)}</span></h2>
    <div class="cx-lista">
      <button type="button" class="cx-fijo" data-cx="hoja" data-p="schedule">
        <span class="cx-ico" aria-hidden="true">${ic('clientes',20)}</span>
        <span class="cx-fijo-t"><b>Salarios</b><small>${Object.keys(gente).length?Object.entries(gente).map(([n,g])=>`${esc(n)}: ${hoursLabel(g.h)} · ${col(g.p)}`).join('<br>'):'Nadie cobra por hora esta semana'}<br>Salen de Horarios</small></span>
        <span class="cx-fijo-m"><b>${col(salSem)}</b><small>esta semana</small></span>
        <span class="cx-lapiz" aria-hidden="true">${ic('siguiente',16)}</span></button>
      <button type="button" class="cx-fijo" data-cx="comision">
        <span class="cx-ico" aria-hidden="true">${ic('tarjeta',20)}</span>
        <span class="cx-fijo-t"><b>Comisión del datáfono</b><small>${W.cardFeePct}% de lo cobrado con tarjeta<br>La tarjeta entra completa en Ventas, y esto va en lo que se fue cada día</small></span>
        <span class="cx-fijo-m"><b>${col(comision)}</b><small>esta semana</small></span>
        <span class="cx-lapiz" aria-hidden="true">${ic('editar',16)}</span></button>
    </div>
    <h2 class="cx-h2">Lo de esta semana <span>${col(otrosSem)}</span></h2>
    <div class="cx-lista">
      ${seccion('g-viajes','camion','Viajes',viajes.length?`${viajes.length} viaje${viajes.length===1?'':'s'} · ${dec(viajes.reduce((t,m)=>t+num(m.km),0))} km`:'Ninguno esta semana',viajes.length?col(viajes.reduce((t,m)=>t+ent(m.monto),0)):null,
        viajes.length?viajes.map(m=>renglonPago(m,false)).join(''):u.vacio('Ningún viaje esta semana. Cuando vayan al mercado, tocá «Anotar un viaje»: se cuenta por kilómetro, justo para las dos tiendas.'))}
      ${seccion('g-sueltos','nota','Gastos sueltos',sueltos.length?`${sueltos.length} esta semana`:'Ninguno esta semana',sueltos.length?col(sueltos.reduce((t,m)=>t+ent(m.monto),0)):null,
        sueltos.length?sueltos.map(m=>renglonPago(m,false)).join(''):u.vacio('Ningún gasto suelto. Lo que se paga una sola vez (un arreglo, un trámite) se anota con «Pagar un gasto» → «Otro gasto».'))}
      ${ajustes?`<div class="cx-fila cg-ajuste"><span class="cx-ico" aria-hidden="true">${ic('recibo',20)}</span><span class="cx-fila-t"><b>Pagado de más o de menos</b><small>La diferencia entre lo pagado y lo que ya se había calculado</small></span><b>${col(ajustes)}</b></div>`:''}
    </div>
    <h2 class="cx-h2">Pagos <span>${mesN}</span></h2>
    <div class="cx-lista">
      ${seccion('g-pagos','recibo','Pagos de '+mesN.toLowerCase(),pagosMes.length?`${pagosMes.length} pago${pagosMes.length===1?'':'s'} con su recibo`:'Ninguno todavía',pagosMes.length?col(pagosMes.reduce((t,m)=>t+ent(m.monto),0)):null,
        pagosMes.length?pagosMes.map(m=>renglonPago(m,true)).join(''):u.vacio('Ningún gasto pagado este mes. Cuando paguen la luz, se anota aquí con la foto del recibo.'))}
      ${salMes.length?seccion('g-sal','clientes','Pagos de salarios',`${salMes.length} en ${mesN.toLowerCase()}`,col(salMes.reduce((t,m)=>t+ent(m.monto),0)),salMes.map(m=>renglonPago(m,false)).join('')):''}
    </div>
    <h2 class="cx-h2">Más</h2>
    <div class="cx-lista">
      ${fila('camion','Anotar un viaje',listoV?'Kilómetros × lo que cuesta cada uno':'Primero escogé cómo se cuentan los kilómetros',null,'g-viaje')}
      ${fila('mas','Agregar un gasto','Patente, CCSS, contador, marchamo y más',null,'g-agregar')}
      ${fila('ajustes','Ajustes de los viajes',esc(resumenV),null,'g-ajv')}
      ${quitados.length?seccion('g-quitados','deshacer','Gastos quitados',`${quitados.length} que ya no se cobran`,null,quitados.map(g=>`<div class="cx-fila"><span class="cx-fila-t"><b>${esc(g.n)}</b><small>${col(g.monto)} ${CADA_T[g.cada]} · dejó de cobrarse el ${u.diaCorto(clDateAdd(g.hasta||ref,1))}</small></span><button type="button" class="cx-segundo" data-cx="g-volver" data-k="${esc(g.id)}">Volver a cobrarlo</button></div>`).join('')):''}
    </div>
    <div class="cx-pie" data-ui-abajo><button type="button" class="cx-accion" data-cx="gasto-nuevo"><span>Pagar un gasto</span>${u.flecha('mas')}</button></div>`;
  }

  u.vista('gastos',vGastos);
  u.vista('fijos',vGastos);                                   // los enlaces de antes llegan aquí
  u.cuadro({id:'fijos',quita:true});
  u.cuadro({id:'gastos',orden:40,vista:'gastos',tono:'gas',icono:'recibo',nombre:'Gastos',
    dato:D=>({num:col(D.fixedTotal+D.salarioTotal+D.gastosVarios),sub:'gastado '+u.cuando(D.date)})});
  u.acciones({
    'gasto-nuevo':()=>pagar({}),
    gasto:d=>{const m=(data.plata||[]).find(x=>x.id===d.id);if(!m)return;if(m.concepto==='viaje')viaje({mov:m});else pagar({mov:m});},
    'g-editar':d=>editar(d.k),
    'g-agregar':()=>agregar(),
    'g-viaje':d=>viaje({f:d&&d.f}),
    'g-ajv':()=>ajustesViajes(),
    'g-volver':d=>reponer(d.k),
    'g-abrir':d=>{if(E.abiertos.has(d.k))E.abiertos.delete(d.k);else E.abiertos.add(d.k);u.pintar();},
    'g-cat':d=>{if(plegadas.has(d.k))plegadas.delete(d.k);else plegadas.add(d.k);u.pintar();}
  });
  // lo que falta: el viaje al mercado de hoy o de ayer (solo si los viajes ya están configurados)
  u.pendiente(()=>{
    const out=[],h=u.hoy();
    [h,clDateAdd(h,-1)].forEach(f=>{
      if(!porKm(f)||!faltaViaje(f))return;
      out.push({a:'g-viaje',f,q:`¿Anotar el viaje al mercado ${f===h?'de hoy':'de ayer'}?`,d:'Hubo Cierre de compras con compras de Los Ángeles y no hay ningún viaje anotado ese día. Se cuenta por kilómetro, justo para las dos tiendas.',b:'Anotar el viaje'});
    });
    return out;
  });
});
})();
