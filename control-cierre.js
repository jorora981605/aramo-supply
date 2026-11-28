// control-cierre.js — el cierre del día y de la semana, el candado de lo cerrado y la pantalla "Cada colón".
// Parte del Control total (2026-11-28). Se carga después del motor y antes de control-cuadros.js.
//
//  · Cada día que ya pasó se cierra SOLO la primera vez que alguien abre el Control (no hay servidor: "a la medianoche"
//    quiere decir "la próxima vez que se abre"). Al cerrar se congelan los gastos fijos, los salarios y la comisión de
//    ese día: aunque después cambien el alquiler, un horario o la comisión, el día cerrado ya no cambia
//    (el motor lo lee con window.Cierres.congelado(fecha) desde clComputeWeek).
//  · Cuando una semana pasó entera y sus días están cerrados, la semana se cierra sola (y queda en la hoja de siempre).
//  · Si después del cierre cambian los números (llegó tarde el POS, alguien corrigió algo) NO se esconde: queda anotado
//    de cuánto a cuánto, quién y por qué. Para cambiar a mano un día cerrado hay que decir por qué (Cierres.permiso).
//  · La pantalla "Cada colón": Entró − Se fue = Quedó, en colones enteros, y dónde está la plata de ese día.
//
// Guarda (data.cierres):
//   dias    {[fecha]: {at,auto,por,fijos,sal,fee,fij,salDet,n:{…foto del día…},pend:[…textos…]}}   MOVIMIENTO
//   semanas {[lunes]: {at,auto,por,L,fin,dias,libro,partes,pend,cambios,ganancia,gan0}}              MOVIMIENTO
//   cambios [{id,f,at,antes,despues,quien,motivo}]                                                   MOVIMIENTO
//   vistos  {[idCambio]: iso}  ·  motivos {[fecha]: {motivo,quien,at}}                               MOVIMIENTO
// (Todo es movimiento: al "dejar todo en cero" se borra. No hay ajustes.)
(function(){
'use strict';
if(typeof clComputeWeek!=='function')return;

const num0=v=>Number(v)||0;
const ent=v=>Math.round(num0(v))||0;                       // entero, nunca -0
const hoy=()=>clDateISO(new Date());
const PU=()=>window.AramoPuente||null;
const PLATA=()=>window.Plata||null;

/* ================= datos ================= */
// data.cierres se crea sin guardar (un respaldo viejo no lo trae)
function C(){
  let c=data.cierres;
  if(!c||typeof c!=='object')c=data.cierres={};
  if(!c.dias||typeof c.dias!=='object')c.dias={};
  if(!c.semanas||typeof c.semanas!=='object')c.semanas={};
  if(!Array.isArray(c.cambios))c.cambios=[];
  if(!c.vistos||typeof c.vistos!=='object')c.vistos={};
  if(!c.motivos||typeof c.motivos!=='object')c.motivos={};
  return c;
}
C();
const cerrado=f=>{const c=data.cierres;return !!(c&&c.dias&&c.dias[f]);};
// Lo lee el motor desde adentro de clComputeWeek (7 veces por semana): lectura directa, nada de cuentas.
function congelado(f){const c=data.cierres;return(c&&c.dias&&c.dias[f])||null;}

/* ================= la cuenta de cada colón ================= */
// Lo que entró, por dónde (la tarjeta completa: la comisión va en lo que se fue).
const ENTRO=[
  {k:'efectivo',t:'Efectivo',ir:'ingresos',v:d=>num0(d.manual.cash)},
  {k:'sinpe',t:'SINPE',ir:'ingresos',v:d=>num0(d.manual.sinpe)},
  {k:'tarjeta',t:'Tarjeta',ir:'ingresos',v:d=>num0(d.manual.card)},
  {k:'otros',t:'Otra forma de pago',ir:'ingresos',v:d=>num0(d.manual.otros)},
  {k:'fiado',t:'Fiado',ir:'ingresos',v:d=>num0(d.cuentasPorCobrarTotal)},
  {k:'bodega',t:'Bodega',ir:'ingresos',v:d=>num0(d.manual.bodega)},
  {k:'sobrante',t:'Efectivo de más en la caja',ir:'caja',v:d=>num0(d.cajaSobrante)}];
// Lo que se fue, en qué. Es exactamente la resta de la ganancia del motor (más la comisión, que sale de la tarjeta).
const SEFUE=[
  {k:'compras',t:'Compras',ir:'compras',v:d=>num0(d.comprasTotal)},
  {k:'comision',t:'Comisión del datáfono',ir:'fijos',v:d=>num0(d.manual.card)-num0(d.datafonoNeto)},
  {k:'fijos',t:'Gastos fijos',ir:'fijos',v:d=>num0(d.fixedTotal)},
  {k:'salarios',t:'Salarios',ir:'fijos',v:d=>num0(d.salarioTotal)},
  {k:'varios',t:'Otros gastos del día',ir:'fijos',v:d=>num0(d.gastosVarios)},
  {k:'retiros',t:'Retiros de caja',ir:'caja',v:d=>num0(d.retirosGasto)},
  {k:'rebajos',t:'Rebajos',ir:'admin',v:d=>num0(d.rebajoTotal)},
  {k:'abonos',t:'Abonos de cuentas por pagar',ir:'',v:d=>num0(d.cuentaXpagarTotal)},
  {k:'desechos',t:'Desechos',ir:'ingresos',v:d=>num0(d.desechosResta)}];

// Enteros que suman exacto "total": cada uno lleva su parte entera y los colones que sobran se dan a los de mayor residuo.
function enteros(valores,total){
  const b=valores.map(v=>{const f=Math.floor(v+1e-9);return{v:f,r:v-f};});
  let resto=total-b.reduce((t,x)=>t+x.v,0);
  const n=b.length,orden=b.map((x,i)=>i).sort((i,j)=>b[j].r-b[i].r||i-j);
  for(let k=0;n&&resto>0;k++,resto--)b[orden[k%n]].v++;
  for(let k=0;n&&resto<0;k++,resto++)b[orden[n-1-(k%n)]].v--;
  return b.map(x=>x.v||0);
}
// La cuenta pura, para un día o para varios: Entró − Se fue = Quedó, en colones enteros.
//  → {entro:[{k,t,monto,ir}], seFue:[…], quedo, entroTotal, seFueTotal, partes, partesSuma, cuadra, sinExplicar}
// El motor trabaja con decimales (fracciones de hora, comisión del 5 %, la cuenta de 30,44): se redondea la ganancia y
// el total que entró, y el redondeo se reparte entre los renglones de "Se fue" (mayor residuo) para que los renglones
// sumen su total y el total cuadre. Si aun así la suma no da la ganancia del motor, NO se tapa: sinExplicar ≠ 0.
function libro(dias){
  dias=(dias||[]).filter(Boolean);
  const suma=def=>dias.reduce((t,d)=>t+def.v(d),0);
  const eV=ENTRO.map(suma),sV=SEFUE.map(suma);
  const Ef=eV.reduce((t,x)=>t+x,0),Sf=sV.reduce((t,x)=>t+x,0),Gf=dias.reduce((t,d)=>t+num0(d.ganancia),0);
  const E=ent(Ef),G=ent(Gf),legitimo=Math.abs(Ef-Sf-Gf)<0.001;
  const S=legitimo?E-G:ent(Sf);
  const er=enteros(eV,E),sr=enteros(sV,S);
  const sinExplicar=legitimo?0:G-(E-S);
  let partes=null,partesSuma=null;
  try{
    const P=PLATA();
    if(P&&typeof P.reparto==='function'&&typeof P.redondear==='function'){
      const r=P.reparto(dias);partes=P.redondear({jefes:r.jefes,roger:r.roger,joseph:r.joseph});
      partesSuma=partes.jefes+partes.roger+partes.joseph;
    }
  }catch(e){console.error(e);}
  const linea=(def,m)=>({k:def.k,t:def.t,monto:m,ir:def.ir});
  return{
    entro:ENTRO.map((d,i)=>linea(d,er[i])).filter(x=>x.monto!==0),
    seFue:SEFUE.map((d,i)=>linea(d,sr[i])).filter(x=>x.monto!==0),
    quedo:G,entroTotal:E,seFueTotal:S,partes,partesSuma,cuadra:sinExplicar===0,sinExplicar};
}

/* ================= cerrar un día ================= */
// La foto de los números del día (enteros): con esto se nota si después cambia algo.
function foto(d){
  return{ventas:ent(d.ventas),efectivo:ent(d.manual.cash),sinpe:ent(d.manual.sinpe),tarjeta:ent(d.manual.card),otros:ent(d.manual.otros),
    fiado:ent(d.cuentasPorCobrarTotal),bodega:ent(d.manual.bodega),compras:ent(d.comprasTotal),credito:ent(d.manual.comprasCredito),
    fijos:ent(d.fixedTotal),sal:ent(d.salarioTotal),varios:ent(d.gastosVarios),comision:ent(num0(d.manual.card)-num0(d.datafonoNeto)),
    retiros:ent(d.retirosGasto),ganancia:ent(d.ganancia),esperado:ent(d.cajaEsperada),faltante:ent(d.cajaFaltante),sobrante:ent(d.cajaSobrante)};
}
// Lo que quedó pendiente al cerrar, en palabras (lo mismo que la pantalla de "Lo que falta" marca en un día que ya pasó).
function pendDe(d){
  const out=[],f=d.date,P=PLATA(),pu=PU();
  const segs=d.cajaSegments||[];
  segs.forEach(s=>{
    const t=s.turno||{},rato=s.start+' a '+s.end,quien=s.personName||'la persona del turno';
    if(s.needsEncargado)out.push(`No se dijo quién cuenta la caja de ${rato}`);
    else if(t.apertura===undefined&&!s.autoApertura)out.push(`La caja de ${quien} (${rato}) no se contó: falta con cuánto empezó`);
    else if(t.apertura===undefined)out.push(`La caja de ${quien} (${rato}) no se contó: el turno anterior no cerró la suya`);
    else if(s.autoApertura&&!t.confirmedAt)out.push(`${quien} no contó lo que recibió (${rato})`);
    else if(t.cierre===undefined)out.push(`La caja de ${quien} (${rato}) no se contó al cerrar`);
  });
  if(!ent(d.ventas)){
    let con=false;try{con=!!(pu&&pu.posConectado&&pu.posConectado(TIENDA));}catch(e){}
    out.push(con?'No llegaron las ventas del POS':'No se anotaron las ventas');
  }
  const u=segs[segs.length-1];
  if(P&&P.activoEn&&P.activoEn(f)&&u&&(u.turno||{}).cierre!==undefined&&!(data.cajaEntregas||{})[f])out.push('Falta guardar el sobre del día');
  if(ent(d.cajaFaltante)>0){
    const q=(d.cajaFaltantes||[]).map(x=>x.personName).filter(Boolean);
    out.push(`Faltan ${fmt(d.cajaFaltante)} en la caja${q.length?' (los debe '+q.join(' y ')+')':''}`);
  }
  // un día en que no se contó la caja de varios turnos es UN pendiente, no uno por turno
  const cj=out.filter(x=>/^La caja de .* no se contó/.test(x));
  if(cj.length>1){const i=out.indexOf(cj[0]),resto=out.filter(x=>!cj.includes(x));resto.splice(Math.min(i,resto.length),0,`La caja no se contó (${cj.length} turnos)`);return resto;}
  return out;
}
// Los tres números que el motor congela + el detalle, y la foto y los pendientes
function armarDia(d,Wk){
  let fij={};
  const it=d.gastosDet&&Array.isArray(d.gastosDet.items)?d.gastosDet.items:null;
  if(it)it.forEach(x=>{if(x&&x.id!=null)fij[x.id]=num0(x.monto);});
  else(Wk.fixedMonthly||[]).forEach(x=>{if(x&&x.key)fij[x.key]=num0(x.daily);});
  let salDet={};try{salDet=JSON.parse(JSON.stringify(clHourlyDetailForDay(d.dayName)||{}));}catch(e){}
  return{at:new Date().toISOString(),auto:true,por:'Se cerró solo',
    fijos:num0(d.fixedTotal),sal:num0(d.salarioTotal),fee:num0(d.cardFeePct),fij,salDet,n:foto(d),pend:pendDe(d)};
}

/* ================= cerrar la semana ================= */
function armarSemana(L,Wk,c){
  const lb=libro(Wk.perDay),fin=clDateAdd(L,6),pend=[],dias=[];
  Wk.perDay.forEach(d=>{const z=c.dias[d.date];if(!z)return;dias.push(d.date);(z.pend||[]).forEach(t=>pend.push({f:d.date,t}));});
  return{at:new Date().toISOString(),auto:true,por:'Se cerró sola',L,fin,dias,
    libro:{entro:lb.entro.map(x=>({k:x.k,t:x.t,monto:x.monto})),seFue:lb.seFue.map(x=>({k:x.k,t:x.t,monto:x.monto})),entroTotal:lb.entroTotal,seFueTotal:lb.seFueTotal,sinExplicar:lb.sinExplicar},
    ganancia:lb.quedo,gan0:lb.quedo,ventas:Wk.perDay.reduce((t,d)=>t+num0(d.ventas),0),partes:lb.partes,pend,
    cambios:c.cambios.filter(x=>x.f>=L&&x.f<=fin).length};
}
// la hoja de siempre (la lista de cierres de la semana) ve también el cierre solo; sin duplicar la de esa semana
function escribirHoja(L,Wk,sem){
  try{
    const ventas=Wk.perDay.reduce((t,d)=>t+num0(d.ventas),0),gan=Wk.perDay.reduce((t,d)=>t+num0(d.ganancia),0);
    let todos=[];try{todos=JSON.parse(localStorage.getItem(CLOSURES_KEY)||'[]')||[];}catch(e){}
    if(!Array.isArray(todos))todos=[];
    const i=todos.findIndex(x=>x&&x.start===L);
    if(i>=0)todos[i]={...todos[i],totals:{sales:ventas,profit:gan}};
    else todos.push({start:L,end:clDateAdd(L,6),notes:'Se cerró sola',createdAt:sem.at,totals:{sales:ventas,profit:gan}});
    localStorage.setItem(CLOSURES_KEY,JSON.stringify(todos));
  }catch(e){console.error(e);}
}

/* ================= el cierre solo ================= */
let cerrando=false,escaneo='';
// Cierra los días que ya pasaron (desde data.reglas.desde hasta ayer) y las semanas que ya quedaron completas.
// Nunca cierra hoy ni un día futuro ni días de antes de las reglas nuevas. Un solo save() al final.
function autoCerrar(forzar){
  if(cerrando)return 0;
  const h=hoy(),c=C(),desde=data.reglas&&data.reglas.desde;
  if(!desde||desde>=h)return 0;
  const ayer=clDateAdd(h,-1);
  if(!forzar&&escaneo===h&&c.dias[ayer])return 0;
  cerrando=true;
  let hubo=0;
  try{
    const cache={};
    for(let f=desde;f<=ayer;f=clDateAdd(f,1)){
      if(c.dias[f])continue;
      const L=clMonday(f),Wk=cache[L]||(cache[L]=clComputeWeek(L)),d=Wk.perDay.find(x=>x.date===f);
      if(!d||d.cerrado)continue;
      c.dias[f]=armarDia(d,Wk);hubo++;
    }
    // semanas que ya pasaron enteras
    for(let L=clMonday(desde);clDateAdd(L,6)<h;L=clDateAdd(L,7)){
      if(c.semanas[L])continue;
      let completa=true,alguno=false;
      for(let i=0;i<7;i++){const f=clDateAdd(L,i);if(f<desde)continue;alguno=true;if(!c.dias[f]){completa=false;break;}}
      if(!completa||!alguno)continue;
      const Wk=clComputeWeek(L),sem=armarSemana(L,Wk,c);
      c.semanas[L]=sem;escribirHoja(L,Wk,sem);hubo++;
    }
    escaneo=h;
  }catch(e){console.error(e);}
  finally{cerrando=false;}
  if(hubo){try{save();}catch(e){console.error(e);}}
  return hubo;
}

/* ================= lo que cambió después de cerrar ================= */
let U=null;                                                 // la API de la cara (cuando ya está montada)
const quienEs=()=>{try{return(U&&U.quien().n)||'sin nombre';}catch(e){return'sin nombre';}};
const MOTIVO_VIGENTE=30*60*1000;                           // el motivo que se dijo vale 30 minutos
// Compara los números de hoy contra la foto del cierre, solo de los días cerrados de la semana Wk. Devuelve true si
// anotó algo (quien llama hace UN save(), fuera de la pintada).
function revisarCambios(Wk){
  if(!Wk||!Wk.perDay)return false;
  const c=C();let hubo=false;
  Wk.perDay.forEach(d=>{
    const z=c.dias[d.date];if(!z||!z.n)return;
    const v=foto(d),a=z.n;
    if(v.ventas===a.ventas&&v.compras===a.compras&&v.ganancia===a.ganancia&&v.faltante===a.faltante)return;
    const m=c.motivos[d.date],vigente=m&&(Date.now()-(Date.parse(m.at)||0))<MOTIVO_VIGENTE;
    const sub=x=>({ventas:x.ventas,compras:x.compras,ganancia:x.ganancia,faltante:x.faltante});
    c.cambios.push({id:uid(),f:d.date,at:new Date().toISOString(),antes:sub(a),despues:sub(v),
      quien:vigente?m.quien:'No se sabe',motivo:vigente?m.motivo:'Llegó algo nuevo o se cambió en la hoja, y nadie dijo por qué'});
    delete c.motivos[d.date];
    z.n=v;hubo=true;
    // si la semana de ese día ya estaba cerrada, su resumen se pone al día (la ganancia de cuando se cerró queda en gan0)
    const L=clMonday(d.date),s=c.semanas[L];
    if(s){
      const lb=libro(Wk.perDay);
      s.libro={entro:lb.entro.map(x=>({k:x.k,t:x.t,monto:x.monto})),seFue:lb.seFue.map(x=>({k:x.k,t:x.t,monto:x.monto})),entroTotal:lb.entroTotal,seFueTotal:lb.seFueTotal,sinExplicar:lb.sinExplicar};
      s.ganancia=lb.quedo;s.partes=lb.partes;s.ventas=Wk.perDay.reduce((t,x)=>t+num0(x.ventas),0);
      s.cambios=c.cambios.filter(x=>x.f>=L&&x.f<=clDateAdd(L,6)).length;
      escribirHoja(L,Wk,s);
    }
  });
  return hubo;
}

/* ================= el candado ================= */
const recientes={},enPregunta={};
// ¿Se puede cambiar ese día? Si no está cerrado, sí. Si está cerrado, hay que decir por qué (queda anotado y se pega
// al próximo cambio que se note de esa fecha). Se acuerda unos minutos para no preguntar dos veces por el mismo día.
function permiso(f){
  f=String(f||'');
  if(!f||!cerrado(f))return Promise.resolve(true);
  const t=recientes[f];
  if(t!=null&&performance.now()-t<5*60*1000)return Promise.resolve(true);
  if(enPregunta[f])return enPregunta[f];
  if(!window.AramoUI||!AramoUI.pedir)return Promise.resolve(true);
  const p=AramoUI.pedir({titulo:'Este día ya se cerró',texto:'¿Por qué lo cambiás? Queda anotado con tu nombre, para que después se sepa.',
    etiqueta:'El motivo',ejemplo:'Por ejemplo: se anotó mal la venta',largo:true,si:'Sí, cambiarlo',no:'Mejor no',
    validar:v=>v.length>=3?'':'Escribí por qué (aunque sea corto).'}).then(v=>{
    delete enPregunta[f];
    if(v==null)return false;
    C().motivos[f]={motivo:v,quien:quienEs(),at:new Date().toISOString()};   // sin save(): el cambio que sigue guarda
    recientes[f]=performance.now();
    return true;
  },e=>{delete enPregunta[f];console.error(e);return false;});
  enPregunta[f]=p;return p;
}

/* ================= el texto para mandar ================= */
function diasDeLaSemana(Wk){const h=hoy(),fin=clDateAdd(Wk.inicio||Wk.perDay[0].date,6);return fin<h?Wk.perDay:Wk.perDay.filter(d=>d.date<=h);}
function textoSemana(L,Wk){
  const c=C(),s=c.semanas[L],h=hoy(),terminada=clDateAdd(L,6)<h;
  const dias=terminada?Wk.perDay:Wk.perDay.filter(d=>d.date<=h),lb=libro(dias);
  const a=new Date(L+'T12:00:00'),b=new Date(clDateAdd(L,6)+'T12:00:00');
  const rango=`${a.getDate()} al ${b.getDate()} de ${b.toLocaleDateString('es-CR',{month:'long'})}`;
  const R=[];
  R.push(`*${terminada?'Cierre de la semana':'Así va la semana'} ${clWeekNumber(L)}* · ${TIENDA_NOMBRE}`);
  R.push(`Del ${rango}${terminada?'':' (hasta hoy)'}`);R.push('');
  R.push(`*Entró* ${fmt(lb.entroTotal)}`);lb.entro.forEach(x=>R.push(`• ${x.t} ${fmt(x.monto)}`));R.push('');
  R.push(`*Se fue* ${fmt(lb.seFueTotal)}`);lb.seFue.forEach(x=>R.push(`• ${x.t} ${fmt(x.monto)}`));R.push('');
  R.push(`*Quedó (ganancia)* ${lb.quedo<0?'−':''}${fmt(Math.abs(lb.quedo))}`);
  if(!lb.cuadra)R.push(`Ojo: hay ${fmt(Math.abs(lb.sinExplicar))} sin explicar.`);
  const cs=n=>(n<0?'−':'')+fmt(Math.abs(n));
  if(lb.partes)R.push(`Jefes ${cs(lb.partes.jefes)} · Roger ${cs(lb.partes.roger)} · Joseph ${cs(lb.partes.joseph)}`);
  const pend=[];dias.forEach(d=>{const z=c.dias[d.date];if(!z)return;const P=z.pend||[],caja=P.filter(x=>/^La caja de /.test(x)),otros=P.filter(x=>!/^La caja de /.test(x));
    const dia=`${d.dayName.slice(0,3)} ${new Date(d.date+'T12:00:00').getDate()}`;
    if(caja.length)pend.push(`${dia}: la caja no se contó${caja.length>1?` (${caja.length} turnos)`:''}`);
    otros.forEach(x=>pend.push(`${dia}: ${x}`));});
  R.push('');
  R.push(pend.length?`*Pendientes (${pend.length})*`:'Sin pendientes.');pend.slice(0,8).forEach(x=>R.push(`• ${x}`));
  if(pend.length>8)R.push(`• y ${pend.length-8} más (se ven en el Control)`);
  const cb=c.cambios.filter(x=>x.f>=L&&x.f<=clDateAdd(L,6));
  if(cb.length)R.push('',`Cambios después de cerrar: ${cb.length}.`);
  if(s)R.push('',`Se cerró sola el ${new Date(s.at).toLocaleDateString('es-CR',{day:'numeric',month:'long'})}.`);
  return R.join('\n');
}
async function mandar(texto){
  try{if(navigator.share){await navigator.share({text:texto});return true;}}
  catch(e){if(e&&e.name==='AbortError')return false;}
  try{window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank','noopener');return true;}catch(e){console.error(e);return false;}
}

window.Cierres={congelado,permiso,libro,cerrado,dia:f=>(C().dias[f]||null),semana:L=>(C().semanas[L]||null),
  cambios:()=>C().cambios,autoCerrar,revisarCambios,pendDe,foto,texto:textoSemana};

/* ================= la cara ================= */
(window.CX_MODULOS=window.CX_MODULOS||[]).push(u=>{
  U=u;
  const ic=u.ic,col=u.col;
  const hora=iso=>u.hora(iso),diaDe=iso=>clDateISO(new Date(iso));
  const cuando=iso=>`${u.diaBonito(diaDe(iso))} a las ${hora(iso)}`;
  const sinVer=()=>{const c=C();return c.cambios.filter(x=>!c.vistos[x.id]);};
  const quienTxt=x=>(x.quien==='No se sabe'?'No se sabe quién lo cambió.':'Lo cambió '+x.quien+' el '+cuando(x.at));
  const NOMBRE_K={ventas:'ventas',compras:'compras',ganancia:'ganancia',faltante:'faltante de caja'};
  const queCambio=x=>['ventas','compras','ganancia','faltante'].filter(k=>(x.antes||{})[k]!==(x.despues||{})[k])
    .map(k=>`${NOMBRE_K[k]} de ${u.col(x.antes[k])} a ${u.col(x.despues[k])}`).join(' · ');

  /* ---- Cada colón (reemplaza la pantalla "Ganancia del día") ---- */
  function fila(t,v,ir,sub){
    const tag=ir?`button type="button" data-cx="ir" data-v="${ir}"`:'div';
    return `<${tag} class="cx-res-f"><span>${t}${sub?`<small>${sub}</small>`:''}</span><b>${col(v)}</b>${ir?ic('siguiente',16):''}</${ir?'button':'div'}>`;
  }
  // los nombres de los gastos sueltos del día (viajes, sueltos y diferencias), si se pueden saber
  function nombresVarios(D){
    const out=[],gd=D.gastosDet;
    try{
      if(gd&&Array.isArray(gd.varios))gd.varios.forEach(x=>{if(x&&ent(x.monto))out.push(`${x.label||x.t||'Gasto'} ${fmt(x.monto)}`);});
      else{
        (data.plata||[]).forEach(m=>{if(m&&m.t==='gasto'&&m.f===D.date&&(m.concepto==='otro'||m.concepto==='viaje'||(window.Gastos&&Gastos.esSuelto&&Gastos.esSuelto(m))))out.push(`${m.nota||(m.concepto==='viaje'?'Viaje':'Gasto suelto')} ${fmt(m.monto)}`);});
        if(gd&&ent(gd.ajuste))out.push(`${gd.ajuste>0?'Pagado de más':'Pagado de menos'} contra lo calculado ${col(gd.ajuste)}`);
      }
    }catch(e){}
    return out.join(' · ');
  }
  function subDe(k,D){
    if(k==='tarjeta'&&num0(D.manual.card))return `Lo que pasó por el datáfono, completo. La comisión de ${D.cardFeePct}% va en «Se fue».`;
    if(k==='fiado')return 'Vendido, todavía por cobrar';
    if(k==='sobrante')return 'Venta que no se anotó';
    if(k==='otros')return 'Ventas del POS con otra forma de pago';
    if(k==='bodega')return 'De registros viejos';
    if(k==='compras'&&ent(D.manual.comprasCredito))return `De esto, ${fmt(D.manual.comprasCredito)} se debe: todavía no se pagó`;
    if(k==='comision')return `${D.cardFeePct}% de ${fmt(D.manual.card)} cobrados con tarjeta`;
    if(k==='fijos')return 'La parte de un día';
    if(k==='varios')return nombresVarios(D);
    if(k==='retiros')return 'Plata que salió del cajón con su motivo';
    if(k==='rebajos')return 'De antes: ya no se hacen';
    if(k==='abonos')return 'De registros viejos';
    if(k==='desechos')return 'De registros viejos';
    return '';
  }
  // dónde quedó físicamente lo que entró ese día
  function dondeEstaLaPlata(D){
    const f=D.date,pu=PU(),L=[];
    const lugar=(icono,t,monto,sub,marca)=>`<article class="cz-lugar"><span class="cx-ico" aria-hidden="true">${ic(icono,20)}</span><div class="cz-lugar-t"><b>${t}</b>${sub?`<small>${sub}</small>`:''}${marca||''}</div><b class="cz-lugar-m">${monto==null?'':col(monto)}</b></article>`;
    // el cajón
    const en=(data.cajaEntregas||{})[f],esp=ent(D.cajaEsperada),falt=ent(D.cajaFaltante),sob=ent(D.cajaSobrante);
    if(esp||falt||sob||en){
      let sub='Es lo que debe haber, según las ventas en efectivo y lo que salió del cajón.';
      if(en)sub=`Ya se sacó el sobre: ${fmt(en.monto)}. En el cajón quedan ${fmt(esp-num0(en.monto))} de sencillo.`;
      let marca='';
      if(falt>0){const q=(D.cajaFaltantes||[]).map(x=>`${esc(x.personName)} ${fmt(x.amount)}`).join(' · ');
        marca=`<span class="cx-marca mal">Faltan ${fmt(falt)}${q?': los debe '+q:''}</span><small>No baja la ganancia: lo debe quien cerró ese turno.</small>`;}
      else if(sob>0){const q=(D.cajaSegments||[]).filter(s=>s.diff!=null&&s.diff>0.5).map(s=>esc(s.personName)).join(' y ');
        marca=`<span class="cx-marca ojo">Hay ${fmt(sob)} de más${q?' en la caja de '+q:''}</span><small>Es venta en efectivo que no se anotó. Ya cuenta como entrada.</small>`;}
      else if((D.cajaSegments||[]).length&&D.cajaSegments.every(s=>s.diff!=null))marca='<span class="cx-marca bien">La caja cuadra exacto</span>';
      L.push(lugar('caja','En el cajón',esp,sub,marca));
    }
    // SINPE
    if(ent(D.manual.sinpe)){
      let sp=null;try{const p=pu&&pu.pos&&pu.pos(f,TIENDA);sp=p&&p.sinpePara;}catch(e){}
      const q=sp?Object.entries(sp).map(([n,m])=>`${esc(n)} ${fmt(m)}`).join(' · '):'';
      L.push(lugar('sinpe','Por SINPE',D.manual.sinpe,sp?`A quién le llegó: ${q}`:'Llegó por SINPE. El POS no dice a quién.'));
    }
    // el banco, por la tarjeta
    if(ent(D.manual.card)){
      const com=num0(D.manual.card)-num0(D.datafonoNeto);
      L.push(lugar('tarjeta','En el banco, por la tarjeta',D.datafonoNeto,`El banco deposita esto: ${fmt(D.manual.card)} cobrados menos ${fmt(com)} de comisión (${D.cardFeePct}%). La comisión se la queda el banco.`));
    }
    // te deben
    if(ent(D.cuentasPorCobrarTotal)){
      let ls=[];try{ls=u.renglones(f,'ing').filter(r=>r.tipo==='fiado'||r.tipo==='fiadoPos');}catch(e){}
      const deben=ls.filter(r=>!r.cobrado),pagaron=ls.filter(r=>r.cobrado);
      const total=ls.length?deben.reduce((t,r)=>t+num0(r.monto),0):D.cuentasPorCobrarTotal;
      const nombres=deben.map(r=>`${esc(r.nota||'Cliente')} ${fmt(r.monto)}`).join(' · ');
      const ya=pagaron.length?` Ya pagaron: ${pagaron.map(r=>esc(r.nota||'Cliente')).join(', ')}.`:'';
      L.push(lugar('clientes','Te deben',total,(nombres?`Debe: ${nombres}.`:(total?'Todavía no se ha cobrado.':'Todos ya pagaron.'))+ya));
    }
    // fiados de otros días que se pagaron este día
    let fp=[];try{fp=pu&&pu.fiadoPagos?pu.fiadoPagos(f,TIENDA):[];}catch(e){}
    if(fp.length){
      const t=fp.reduce((s,x)=>s+num0(x.monto),0);
      L.push(lugar('efectivo','Fiados cobrados este día',t,`Entraron ${fmt(t)} de fiados de otros días: no es venta nueva, ya se había contado. ${fp.map(x=>`${esc(x.cliente||'Cliente')} ${fmt(x.monto)}${x.metodo?' ('+esc(x.metodo)+')':''}`).join(' · ')}.`));
    }
    return `<h2 class="cx-h2">Dónde está la plata de este día</h2>
    <p class="cx-nota arriba">No es la ganancia: es dónde quedó, de verdad, lo que entró.</p>
    <div class="cz-lugares">${L.length?L.join(''):u.vacio('Todavía no entró nada. Cuando haya ventas, aquí se ve dónde quedó cada una: el cajón, el SINPE, el banco o lo que te deben.')}</div>`;
  }
  function bannerDia(D){
    const c=C(),z=c.dias[D.date],h=u.hoy(),desde=data.reglas&&data.reglas.desde;
    if(z){
      const cb=c.cambios.filter(x=>x.f===D.date),pend=z.pend||[];
      return `<section class="cx-calma cz-banner${pend.length||cb.length?' ojo':''}"><span aria-hidden="true">${ic('candado',22)}</span><div>
        <b>Día cerrado el ${esc(u.diaBonito(diaDe(z.at)))} a las ${esc(hora(z.at))}</b>
        <small>${pend.length?`Se cerró con ${pend.length} pendiente${pend.length===1?'':'s'}: ${pend.map(esc).join('. ')}.`:'Se cerró sin nada pendiente.'} Para cambiar algo hay que decir por qué.</small>
        ${cb.length?`<small class="cz-cambio-t">Cambió después de cerrarse:</small>${cb.map(x=>`<small>${esc(u.diaCorto(diaDe(x.at)))} ${esc(hora(x.at))}: ${esc(queCambio(x))}. ${esc(quienTxt(x))} Motivo: «${esc(x.motivo)}».</small>`).join('')}`:''}
      </div></section>`;
    }
    if(desde&&D.date>=desde&&D.date<h)return `<p class="cx-nota cz-nota-dia">Este día se cierra solo la próxima vez que abran el Control.</p>`;
    if(desde&&D.date===h)return `<p class="cx-nota cz-nota-dia">Hoy se cierra solo mañana, la primera vez que abran el Control.</p>`;
    return '';
  }
  u.vista('resultado',()=>{
    const D=u.dia(),W=u.semana(),lb=libro([D]),G=lb.quedo,falt=ent(D.cajaFaltante);
    const fl=(x,sub)=>fila(esc(x.t),x.monto,x.ir,sub);
    const partes=lb.partes;
    return u.barra()+u.tiraDias()+u.cabeza(u.diaLargo(D.date),'Cada colón del día',col(G),G>=0?'Lo que entró menos lo que se fue':'Pérdida: se fue más de lo que entró',G<0?'mal':'res')+`
    ${bannerDia(D)}
    <section class="cx-res">
      <h2><i class="mas" aria-hidden="true">+</i>Entró<b>${fmt(lb.entroTotal)}</b></h2>
      ${lb.entro.map(x=>fl(x,subDe(x.k,D))).join('')}
      ${lb.entroTotal?'':'<p class="cx-vacio">Todavía no entró nada.</p>'}
    </section>
    <section class="cx-res">
      <h2><i class="menos" aria-hidden="true">−</i>Se fue<b>${fmt(lb.seFueTotal)}</b></h2>
      ${lb.seFue.map(x=>fl(x,subDe(x.k,D))).join('')}
      ${lb.seFueTotal?'':'<p class="cx-vacio">Todavía no se fue nada.</p>'}
    </section>
    <section class="cx-res cx-res-fin ${G<0?'neg':''}"><h2><i aria-hidden="true">=</i>Quedó<b>${col(G)}</b></h2>
      <p class="cz-fin-sub">${G<0?'Es la pérdida del día':'Es la ganancia del día'}: ${fmt(lb.entroTotal)} que entraron menos ${fmt(lb.seFueTotal)} que se fueron.</p></section>
    ${lb.cuadra?`<p class="cz-cuadra bien">${ic('ok',20)}<span>Cuadra: no falta ni un colón</span></p>`
      :`<p class="cz-cuadra mal">${ic('alerta',20)}<span>Hay ${fmt(Math.abs(lb.sinExplicar))} sin explicar</span><small>Lo que entró menos lo que se fue no da la ganancia de las cuentas. Mirá los renglones de arriba.</small></p>`}
    ${partes?`<h2 class="cx-h2">Para quién queda</h2>
    <button type="button" class="cz-partes" data-cx="ir" data-v="admin">
      ${[['jefes','Jefes',20],['roger','Roger',40],['joseph','Joseph',40]].map(([id,n,p])=>`<span class="cz-parte"><small>${n} · ${p} %</small><b class="${partes[id]<0?'cx-rojo':''}">${col(partes[id])}</b></span>`).join('')}
    </button>
    <p class="cx-nota">${lb.partesSuma===G?`Las tres partes suman ${fmt(Math.abs(G))}, exacto la ganancia.`:`Las tres partes suman ${col(lb.partesSuma)}; la ganancia es ${col(G)}: la diferencia es el rebajo de antes.`} Los Jefes no pagan salarios; Roger y Joseph, la mitad cada uno.</p>`:''}
    ${dondeEstaLaPlata(D)}
    ${falt?`<p class="cx-nota mal">Faltante de caja: ${fmt(falt)}. No baja la ganancia: lo debe quien cerró ese turno (está en Caja).</p>`:''}
    ${u.ranuraDe('resultado:abajo')}
    <button type="button" class="cx-segundo ancho" data-cx="ir" data-v="ganancia">${ic('grafico',18)} Ver la semana completa</button>`;
  });

  /* ---- La pantalla "Cierre": el estado de la semana ---- */
  function marcaDia(d,c){
    const h=u.hoy(),desde=data.reglas&&data.reglas.desde,z=c.dias[d.date];
    if(z){
      const cb=c.cambios.filter(x=>x.f===d.date),n=(z.pend||[]).length;
      if(cb.length)return{t:'Cambió después',c:'ojo'};
      if(n)return{t:`Cerrado · ${n} pendiente${n===1?'':'s'}`,c:'ojo'};
      return{t:'Cerrado',c:'bien'};
    }
    if(desde&&d.date<desde)return{t:'De antes',c:''};
    if(d.date===h)return{t:'Hoy: se cierra mañana',c:'info'};
    if(d.date>h)return{t:'Todavía no llega',c:''};
    return{t:'Abierto: se cierra solo',c:'info'};
  }
  function estadoSemana(L){
    const c=C(),h=u.hoy(),fin=clDateAdd(L,6),s=c.semanas[L],desde=data.reglas&&data.reglas.desde;
    if(s){
      const n=(s.pend||[]).length;
      return{b:n?`Cerrada con ${n} pendiente${n===1?'':'s'}`:'Semana cerrada',small:`Se cerró sola el ${cuando(s.at)} Lo cerrado ya no cambia sin decir por qué.`,ok:!n};
    }
    if(fin>=h)return{b:`Esta semana se cierra sola el lunes ${new Date(clDateAdd(L,7)+'T12:00:00').getDate()}`,small:'Cada día se cierra solo al día siguiente, la primera vez que abran el Control. La semana, cuando se cierra el domingo.',ok:true};
    if(!desde||fin<desde)return{b:'Semana de antes del cierre automático',small:'Esta semana no se cierra sola: es de antes de que el Control estrenara el cierre.',ok:true};
    return{b:'Se cierra sola la próxima vez que abran el Control',small:'Falta cerrar algunos días. Pasa solo, sin tocar nada.',ok:true};
  }
  u.ranura('admin:cierre',()=>{
    const W=u.semana(),L=W.inicio,c=C(),e=estadoSemana(L),fin=clDateAdd(L,6);
    const cb=c.cambios.filter(x=>x.f>=L&&x.f<=fin),sv=cb.filter(x=>!c.vistos[x.id]);
    const pend=[];W.perDay.forEach(d=>{const z=c.dias[d.date];if(z)(z.pend||[]).forEach(t=>pend.push({f:d.date,t,dn:d.dayName}));});
    const hayCerrados=W.perDay.some(d=>c.dias[d.date]);
    const pl=PLATA(),cfg=pl&&pl.cfg&&pl.cfg(),yaRepartida=!!(cfg&&cfg.repartidas&&cfg.repartidas[L]);
    const hayReparto=!!(cfg&&fin>=cfg.desde&&fin<u.hoy()&&!yaRepartida);   // ahí ya hay un botón grande: este queda como segundo
    return `<h2 class="cx-h2">Cierre de la semana</h2>
    <section class="cx-calma cz-estado${e.ok?'':' ojo'}"><span aria-hidden="true">${ic(c.semanas[L]?'candado':'reloj',22)}</span><div><b>${esc(e.b)}</b><small>${esc(e.small)}</small></div></section>
    <div class="cz-dias" role="list">${W.perDay.map(d=>{const m=marcaDia(d,c),z=c.dias[d.date];
      return `<button type="button" role="listitem" class="cz-dia" data-cx="dia-res" data-d="${d.date}"><span class="cz-dia-f"><b>${esc(d.dayName)}</b><small>${new Date(d.date+'T12:00:00').getDate()}</small></span>
        <span class="cz-dia-m">${m.t?`<span class="cx-marca ${m.c}">${esc(m.t)}</span>`:''}${z?`<small>${esc(u.col(z.n.ganancia))} de ganancia</small>`:''}</span>${ic('siguiente',16)}</button>`;}).join('')}</div>
    ${pend.length?`<h2 class="cx-h2">Lo que quedó pendiente <span>${pend.length}</span></h2><ul class="cz-pend">${pend.map(x=>`<li><b>${esc(x.dn.slice(0,3))} ${new Date(x.f+'T12:00:00').getDate()}</b> ${esc(x.t)}</li>`).join('')}</ul>`:''}
    ${hayCerrados?`<h2 class="cx-h2">Cambios después de cerrar <span>${cb.length}</span></h2>
    ${cb.length?`<div class="cz-cambios">${cb.map(x=>`<article class="cz-cambio${c.vistos[x.id]?' visto':''}"><b>${esc(u.diaBonito(x.f))}</b>
        <p>${esc(queCambio(x))}</p><small>${esc(quienTxt(x))} Motivo: «${esc(x.motivo)}».</small>
        ${c.vistos[x.id]?'<span class="cx-marca bien">Revisado</span>':`<button type="button" class="cx-enlace" data-cx="cz-visto" data-id="${esc(x.id)}">${ic('ok',16)} Ya lo revisé</button>`}</article>`).join('')}
      ${sv.length>1?`<button type="button" class="cx-enlace" data-cx="cz-vistos" data-l="${L}">${ic('ok',16)} Marcar todos como revisados</button>`:''}</div>`
      :'<p class="cx-nota">Nada cambió después de cerrar. Si llega algo tarde (el POS, un cierre de compras) o alguien corrige un día, queda anotado aquí con quién y por qué.</p>'}`:''}
    <button type="button" class="${hayReparto?'cx-segundo ancho':'cx-accion'}" data-cx="cz-mandar" data-l="${L}"><span>${hayReparto?ic('enviar',18)+' ':''}Mandar el cierre por WhatsApp</span>${hayReparto?'':u.flecha('enviar')}</button>
    <p class="cx-nota">Es un texto corto con las ventas, las compras, los gastos, la ganancia y la parte de cada socio. Se manda sin números de teléfono: escogés a quién.</p>`;
  });

  /* ---- lo que falta ---- */
  const faltaCambios=D=>{
    if(D.date!==u.hoy())return[];
    const n=sinVer().length;if(!n)return[];
    return[{a:'cz-ver',q:`Revisar ${n} cambio${n===1?'':'s'} después del cierre`,d:'Un día que ya estaba cerrado cambió. Mirá qué cambió, quién lo cambió y por qué.',b:'Ver los cambios'}];
  };
  u.pendiente(faltaCambios);
  window.Cierres.pendientes=faltaCambios;

  /* ---- acciones ---- */
  u.acciones({
    'cz-visto':d=>{C().vistos[d.id]=new Date().toISOString();save();},
    'cz-vistos':d=>{const c=C(),fin=clDateAdd(d.l,6),t=new Date().toISOString();c.cambios.forEach(x=>{if(x.f>=d.l&&x.f<=fin&&!c.vistos[x.id])c.vistos[x.id]=t;});save();},
    'cz-ver':()=>{const p=sinVer()[0];if(p){u.estado.dia=p.f;u.recordar();}u.ir('admin');},
    'cz-mandar':async d=>{
      const L=d.l||u.semana().inicio,Wk=L===u.semana().inicio?u.semana():clComputeWeek(L);
      const ok=await mandar(textoSemana(L,Wk));
      if(ok)u.aviso('Listo: escogé a quién mandárselo.',{tipo:'ok'});
    }
  });

  // al "dejar todo en cero": los cierres son movimientos, se borran con lo demás
  if(u.alReiniciar)u.alReiniciar(()=>{data.cierres={};});

  /* ---- el candado ---- */
  // Cambiar a mano algo de un día ya cerrado pide el motivo. Navegar o ver no pide nada.
  const CAMBIAN=new Set(['anotar','auto-fuera','fiado-cobro','retiro','retiro-nuevo','caja-ap','caja-recibir','caja-cierre','caja-enc','sobre','pago','pague']);
  u.guarda((accion,datos)=>{
    let f=u.estado.dia;
    if(!cerrado(f)&&!(accion==='fiado-cobro'&&datos&&datos.f))return true;
    if(accion==='renglon'){
      let r=null;try{r=u.renglones(f,datos.g).find(x=>x.id===datos.id);}catch(e){}
      if(!r||r.tipo==='auto')return true;                     // un renglón que llegó solo solo se abre para verlo
      return permiso(f);
    }
    if(accion==='fiado-cobro'&&datos&&datos.f)f=datos.f;
    if(!CAMBIAN.has(accion))return true;
    return permiso(f);
  });

  /* ---- cuándo se cierra solo ---- */
  const raiz=document.getElementById('cx');let t=null;
  const programar=ms=>{clearTimeout(t);t=setTimeout(revisar,ms==null?150:ms);};
  function revisar(){
    if(cerrando)return;
    try{
      autoCerrar();
      if(revisarCambios(u.semana()))save();
    }catch(e){console.error(e);}
  }
  // después de cada pintada (cada pintada reemplaza el contenido): barato, solo mira lo que hace falta
  if(raiz)new MutationObserver(()=>programar()).observe(raiz,{childList:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)programar(50);});
  setInterval(()=>{if(escaneo!==hoy())programar(50);},5*60*1000);
  programar(300);
});
})();
