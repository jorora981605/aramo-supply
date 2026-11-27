// control-socios.js — la plata de los tres socios del Control, colón por colón. 2026-11-26.
// Jefes 20 % · Roger 40 % · Joseph 40 %. La plata del negocio (la "bolsa": para comprar y para pagar los gastos
// fijos) y el sencillo de la caja los ponen los tres en esa misma proporción, igual que se reparte la ganancia.
// Desde el día de arranque (data.socios.desde):
//  · La caja no se toca: solo entran ventas. Las compras y los gastos se pagan con la bolsa (motor: clIntocable).
//  · Cada compra y cada pago de un gasto fijo dice quién lo pagó: la bolsa, o alguien de su bolsillo (y la bolsa
//    se lo devuelve completo).
//  · Si la bolsa no alcanza, lo que faltó lo adelantó alguien (Roger, salvo que se diga otra cosa) y los otros
//    le pasan su parte. Nada de eso se guarda: se calcula cada vez, así se arregla solo si después se anota otra cosa.
//  · El lunes: las ventas reponen la bolsa (lo comprado), se aparta lo de los gastos fijos y salarios, se guarda el
//    ahorro a nombre de los tres, se devuelve lo de bolsillo y se reparte la ganancia. Lo que alguien todavía deba
//    se arregla con su parte de la ganancia ("lunes en cero").
//  · Ya no hay rebajo ni deuda de Joseph (2026-11-26: "no vamos a dar más crédito").
// Guarda: data.socios (ajustes y semanas repartidas), data.plata (cada movimiento de plata: pone / paso / devuelve /
// repone / gasto), data.pagoDe (quién pagó un renglón que llegó solo o que está en la hoja) y el campo "pago" de
// cada compra anotada. No pinta nada: lo usa control-cuadros.js (window.Plata).
(function(){
'use strict';
if(typeof clComputeWeek!=='function')return;

const SOCIOS=[{id:'jefes',n:'Jefes',pct:20},{id:'roger',n:'Roger',pct:40},{id:'joseph',n:'Joseph',pct:40}];
const IDS=SOCIOS.map(s=>s.id);
const PAGAN=['bolsa',...IDS];
const NOMBRE={bolsa:'La bolsa',jefes:'Jefes',roger:'Roger',joseph:'Joseph',caja:'La caja',ventas:'Las ventas'};
const COMPRA=['comprasEfectivo','comprasSinpe','comprasTarjeta','comprasUber'];
const ent=n=>Math.round(num(n));
const cero=()=>({jefes:0,roger:0,joseph:0});
const hoy=()=>clDateISO(new Date());

function cfg(){const s=data.socios;return s&&s.activo&&s.desde?s:null;}
const activoEn=f=>{const c=cfg();return !!c&&!!f&&f>=c.desde;};

// mientras se pinta una pantalla, las cuentas se hacen una sola vez
let memo=null;
function conMemo(fn){memo=new Map();try{return fn();}finally{memo=null;}}
const recordado=(k,fn)=>{if(!memo)return fn();if(!memo.has(k))memo.set(k,fn());return memo.get(k);};

// Un monto entero repartido 20/40/40 sin que se pierda ni sobre un colón
function partes(total){
  const T=ent(total),sg=T<0?-1:1,A=Math.abs(T);
  const b=SOCIOS.map(s=>({id:s.id,v:Math.floor(A*s.pct/100),r:(A*s.pct)%100}));
  let resto=A-b.reduce((t,x)=>t+x.v,0);
  b.slice().sort((x,y)=>y.r-x.r).forEach(x=>{if(resto>0){x.v++;resto--;}});
  const o={};b.forEach(x=>{o[x.id]=sg*x.v;});return o;
}

/* ---------- quién pagó cada compra ---------- */
function pagoDefecto(campo){
  const p=(data.socios||{}).pagos||{};
  if(campo==='comprasEfectivo')return'bolsa';
  if(campo==='comprasSinpe')return PAGAN.includes(p.sinpe)?p.sinpe:'roger';
  return PAGAN.includes(p.tarjeta)?p.tarjeta:'roger';           // tarjeta y Uber
}
function pagoDe(f,r){
  let g;
  if(r.tipo==='mov'){g=r.pago;if(g===undefined){const m=(data.movs||[]).find(x=>x.id===r.id);g=m&&m.pago;}}
  else g=(data.pagoDe||{})[f+'|'+r.id];
  return PAGAN.includes(g)?g:pagoDefecto(r.campo);
}
function ponerPago(f,r,quien){
  if(!PAGAN.includes(quien))return;
  if(r.tipo==='mov'){const m=(data.movs||[]).find(x=>x.id===r.id);if(m)m.pago=quien;}
  else{data.pagoDe=data.pagoDe||{};data.pagoDe[f+'|'+r.id]=quien;}
}
// Las compras de un día, renglón por renglón y con quién las pagó (las mismas que suma la hoja)
function compras(f){
  return recordado('c'+f,()=>{
    const raw=clDailyRaw(f),fuera=data.autoFuera||{},out=[];
    COMPRA.forEach(k=>{const v=num(raw[k]);if(v)out.push({tipo:'hoja',id:'h:'+k,campo:k,monto:v,titulo:'Anotado en la hoja'});});
    clAutoLineas(f).forEach(l=>{if(COMPRA.includes(l.campo)&&!fuera[l.id]&&!num(raw[l.campo]))out.push({tipo:'auto',id:l.id,campo:l.campo,monto:num(l.monto),titulo:l.titulo});});
    (data.movs||[]).forEach(m=>{if(m&&m.date===f&&COMPRA.includes(m.campo))out.push({tipo:'mov',id:m.id,campo:m.campo,monto:num(m.monto),titulo:m.nota||'',pago:m.pago});});
    out.forEach(c=>{c.pago=pagoDe(f,c);});
    return out;
  });
}

/* ---------- la cuenta de cada uno ---------- */
// Lo que alguien debe se le paga directo a quien puso de más (de mayor a mayor)
function arreglos(cu){
  const d=IDS.filter(id=>cu[id]<0).map(id=>({id,v:-cu[id]})).sort((a,b)=>b.v-a.v);
  const a=IDS.filter(id=>cu[id]>0).map(id=>({id,v:cu[id]})).sort((x,y)=>y.v-x.v);
  const out=[];let i=0,j=0;
  while(i<d.length&&j<a.length){
    const v=Math.min(d[i].v,a[j].v);if(v>0)out.push({de:d[i].id,para:a[j].id,monto:v});
    d[i].v-=v;a[j].v-=v;if(!d[i].v)i++;if(!a[j].v)j++;
  }
  return out;
}
// Todo lo que pasó desde el arranque hasta "hasta" (ese día incluido)
function estado(hasta){
  const c=cfg();if(!c)return null;
  hasta=hasta||hoy();
  return recordado('e'+hasta,()=>{
    const puso=cero(),bolsillo=cero(),devuelto=cero(),dias=[],virtual=[],por={};
    (data.plata||[]).forEach(m=>{if(m&&m.f>=c.desde&&m.f<=hasta)(por[m.f]||(por[m.f]=[])).push(m);});
    const adelanta=IDS.includes(c.adelanta)?c.adelanta:'roger';
    let bolsa=0,apartado=0,pagado=0;
    for(let f=c.desde;f<=hasta;f=clDateAdd(f,1)){
      let gasto=0,entra=0,sale=0;
      compras(f).forEach(x=>{if(x.pago==='bolsa')gasto+=x.monto;else bolsillo[x.pago]+=x.monto;});
      (por[f]||[]).forEach(m=>{const v=ent(m.monto);
        if(m.t==='pone'){if(m.de in puso)puso[m.de]+=v;if(m.a!=='caja')entra+=v;}
        else if(m.t==='paso'){if(m.de in puso)puso[m.de]+=v;if(m.a in puso)puso[m.a]-=v;}
        else if(m.t==='devuelve'){if(m.a in devuelto)devuelto[m.a]+=v;sale+=v;}
        else if(m.t==='repone'){entra+=v;if(m.para==='fijos')apartado+=v;}
        else if(m.t==='gasto'){pagado+=v;if(m.de in bolsillo)bolsillo[m.de]+=v;else sale+=v;}   // un gasto fijo pagado: con la bolsa o de bolsillo
      });
      bolsa+=entra-sale-gasto;
      let falto=0;
      if(bolsa<=-0.5){   // la bolsa no alcanzó: lo que faltó lo puso alguien de su bolsillo
        falto=ent(-bolsa);puso[adelanta]+=falto;bolsa=0;
        virtual.push({id:'v:'+f,f,t:'pone',de:adelanta,a:'bolsa',monto:falto,virtual:true,at:f+'T23:59'});
      }
      dias.push({f,gasto:ent(gasto),bolsa:ent(bolsa),falto});
    }
    const F=IDS.reduce((t,id)=>t+ent(puso[id]),0),le=partes(F),cuentas={},debeBolsa={};
    IDS.forEach(id=>{puso[id]=ent(puso[id]);cuentas[id]=puso[id]-le[id];debeBolsa[id]=Math.max(0,ent(bolsillo[id]-devuelto[id]));});
    // de lo que hay en la bolsa, cuánto está apartado para gastos fijos y salarios y todavía no se ha pagado
    return{desde:c.desde,hasta,bolsa:ent(bolsa),puso,le,F,cuentas,debeBolsa,bolsillo,devuelto,dias,virtual,adelanta,
      apartado:ent(apartado),pagado:ent(pagado),reserva:Math.max(0,ent(apartado-pagado)),arreglos:arreglos(cuentas)};
  });
}

/* ---------- el reparto ---------- */
// La parte de cada uno en un día. Regla de siempre: los Jefes no pagan salarios. Antes del arranque el sobrante de
// caja iba en tres partes iguales; desde el arranque un sobrante es una venta en efectivo que no se anotó, y se
// reparte como cualquier venta (20/40/40).
const parteDe=(d,pct,pagaSalario,joseph)=>{
  const sob=activoEn(d.date)?0:d.cajaSobrante,base=d.ganancia-sob+d.salarioTotal;
  return base*pct+sob/3-(pagaSalario?d.salarioTotal/2:0)-(joseph?num(d.manual.rebajoJoseph):0);};
function reparto(dias){
  const r={jefes:0,roger:0,joseph:0,viejo:0};
  dias.forEach(d=>{
    r.jefes+=parteDe(d,.2,false,false);r.roger+=parteDe(d,.4,true,false);r.joseph+=parteDe(d,.4,true,true);
    r.viejo+=num(d.manual.rebajoJoseph);       // solo semanas de antes: el rebajo ya no existe
  });
  return r;
}
// redondea las tres partes sin perder el colón: suman exacto lo mismo que sin redondear
function redondear(o){
  const T=Math.round(IDS.reduce((t,id)=>t+o[id],0)),b=IDS.map(id=>({id,v:Math.floor(o[id]),r:o[id]-Math.floor(o[id])}));
  let resto=T-b.reduce((t,x)=>t+x.v,0);
  b.slice().sort((x,y)=>y.r-x.r).forEach(x=>{if(resto>0){x.v++;resto--;}});
  const out={};b.forEach(x=>{out[x.id]=x.v;});return out;
}
// El plan del lunes para la semana que empieza el lunes L (con los días que entran: toda la semana o hasta hoy)
function plan(L,dias){
  const c=cfg();if(!c)return null;
  const ult=dias.length?dias[dias.length-1].date:L;
  let reponer=0,antes=0;
  dias.forEach(d=>{if(activoEn(d.date))reponer+=compras(d.date).reduce((t,x)=>t+x.monto,0);else antes+=d.comprasTotal;});
  const st=estado(ult),ganancia=dias.reduce((t,d)=>t+d.ganancia,0),fijos=dias.reduce((t,d)=>t+d.fixedTotal+d.salarioTotal,0);
  // el ahorro es un gasto fijo más (sale antes de la ganancia), pero la plata es de los tres: 20/40/40
  const ahorro=ent(num((data.settings||{}).savings)/7*dias.length),ahorroPartes=partes(ahorro),apartar=Math.max(0,ent(fijos)-ahorro);
  const rp=reparto(dias),final=redondear({jefes:rp.jefes,roger:rp.roger,joseph:rp.joseph}),ajustes=[];
  // lunes en cero: lo que alguien todavía deba se arregla con su parte de la ganancia (sin dejarla en negativo)
  st.arreglos.forEach(a=>{
    const v=Math.max(0,Math.min(a.monto,final[a.de]));
    if(v>0){final[a.de]-=v;final[a.para]+=v;}
    ajustes.push({...a,monto:v,falta:a.monto-v});
  });
  return{L,fin:clDateAdd(L,6),reponer:ent(reponer),antes:ent(antes),devolver:st.debeBolsa,fijos,apartar,ahorro,ahorroPartes,ganancia,rp,final,ajustes,st,hecho:(c.repartidas||{})[L]||null};
}
// El ahorro que ya se apartó en los lunes repartidos, y de quién es (20/40/40)
function ahorroGuardado(){
  const c=cfg();if(!c)return{total:0,partes:cero(),semanas:0};
  const R=Object.values(c.repartidas||{}),total=R.reduce((t,r)=>t+ent(r.ahorro),0);
  return{total,partes:partes(total),semanas:R.filter(r=>ent(r.ahorro)>0).length};
}
// "Listo, ya repartimos": queda anotado el lunes siguiente, marcado con la semana para poder deshacerlo
function repartir(L){
  const c=cfg();if(!c)return null;
  const W=clComputeWeek(L),p=plan(L,W.perDay),f=clDateAdd(L,7),at=new Date().toISOString(),sem=L,n=clWeekNumber(L);
  data.plata=(data.plata||[]).filter(m=>m.sem!==L);
  if(p.reponer>0)data.plata.push({id:uid(),f,t:'repone',de:'ventas',a:'bolsa',para:'compras',monto:p.reponer,nota:'Lo que se compró en la semana '+n,sem,at});
  if(p.apartar>0)data.plata.push({id:uid(),f,t:'repone',de:'ventas',a:'bolsa',para:'fijos',monto:p.apartar,nota:'Gastos fijos y salarios de la semana '+n,sem,at});
  IDS.forEach(id=>{const v=p.devolver[id];if(v>0)data.plata.push({id:uid(),f,t:'devuelve',de:'bolsa',a:id,monto:v,nota:'Lo que pagó de su bolsillo',sem,at});});
  p.ajustes.forEach(a=>{if(a.monto>0)data.plata.push({id:uid(),f,t:'paso',de:a.de,a:a.para,monto:a.monto,como:'ganancia',nota:'Con su parte de la ganancia de la semana '+n,sem,at});});
  c.repartidas=c.repartidas||{};
  c.repartidas[L]={at,ganancia:ent(p.ganancia),reponer:p.reponer,apartar:p.apartar,antes:p.antes,final:p.final,ahorro:p.ahorro,ahorroPartes:p.ahorroPartes};
  save();
  return p;
}
function deshacer(L){
  const c=cfg();if(!c)return;
  data.plata=(data.plata||[]).filter(m=>m.sem!==L);
  if(c.repartidas)delete c.repartidas[L];
  save();
}

/* ---------- lo que falta hacer con la plata ---------- */
function pendientes(){
  const c=cfg();if(!c)return[];
  const h=hoy(),st=estado(h),out=[];
  for(let L=clMonday(c.desde);clDateAdd(L,6)<h;L=clDateAdd(L,7)){if(!(c.repartidas||{})[L]){out.push({acc:'repartir',L});break;}}
  st.arreglos.forEach(x=>out.push({acc:'pasar',...x}));
  IDS.forEach(id=>{const v=st.debeBolsa[id];if(v>0&&st.bolsa>=v)out.push({acc:'devolver',para:id,monto:v});});
  return out;
}

window.Plata={SOCIOS,IDS,PAGAN,NOMBRE,COMPRA,cfg,activoEn,conMemo,partes,pagoDefecto,pagoDe,ponerPago,compras,
  estado,arreglos,reparto,redondear,plan,ahorroGuardado,repartir,deshacer,pendientes,parteDe};
})();
