// control-productos.js — Productos y Desechos del Control total (2026-11-28).
// ¿A dónde va cada colón? Por producto: lo que costó lo vendido, lo que se botó, los gastos que le tocan y lo que de verdad le quedó.
//   · Las CUENTAS (window.Productos) son funciones puras que reciben datos y devuelven números; `leer` junta los datos del Control
//     (POS de Los Ángeles, compras, gastos de la semana) y `cuentas(E)` hace la cuenta. Todo en colones enteros, repartido con Colones.partir.
//   · Las PANTALLAS (abajo) usan esas cuentas: `productos`, `desechos` y los cuadros del Inicio.
// Lo que guarda: data.desechos (desechos anotados a mano: movimientos), data.desechoMotivo (el motivo de los desechos del POS: movimientos)
// y data.factores (cuántos kilos trae la caja de cada producto: ajustes).
(function(){
'use strict';
if(typeof clComputeWeek!=='function'||typeof data==='undefined')return;
const PU=window.AramoPuente||null;

/* ══════════════ utilidades ══════════════ */
const r0=x=>Math.round(Number(x)||0);
const n0=x=>{x=Number(x);return Number.isFinite(x)?x:0;};
const hoy=()=>clDateISO(new Date());
const idDe=s=>window.ARAMO_CAT&&window.ARAMO_CAT.idDe?window.ARAMO_CAT.idDe(s):String(s||'').trim().toLowerCase().replace(/\s+/g,'_');
const partir=(t,p)=>{
  if(window.Colones&&window.Colones.partir)return window.Colones.partir(t,p);
  const T=r0(t),P=p.map(x=>Math.max(0,n0(x))),S=P.reduce((a,b)=>a+b,0);if(!P.length)return[];
  if(!S){const o=P.map(()=>0);o[0]=T;return o;}
  const b=P.map((x,i)=>{const v=Math.floor(Math.abs(T)*x/S+1e-9);return{i,v,r:Math.abs(T)*x/S-v};});
  let rs=Math.abs(T)-b.reduce((a,x)=>a+x.v,0);b.slice().sort((x,y)=>y.r-x.r||x.i-y.i).forEach(x=>{if(rs>0){x.v++;rs--;}});
  return b.map(x=>(T<0?-1:1)*x.v);
};
// 20 % / 40 % / 40 % (Plata.partes si está; si no, la misma cuenta)
const SOC=[{id:'jefes',n:'Jefes',pct:20},{id:'roger',n:'Roger',pct:40},{id:'joseph',n:'Joseph',pct:40}];
function partesSocios(total){
  if(window.Plata&&window.Plata.partes)return window.Plata.partes(total);
  const v=partir(total,SOC.map(s=>s.pct)),o={};SOC.forEach((s,i)=>{o[s.id]=v[i];});return o;
}
const unorm=u=>{
  let s=String(u||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/^(kg|kgs|kilo|kilos|kilogramo|kilogramos)$/.test(s))return'kg';
  if(/^(u|un|und|unds|unid|unidad|unidades|c\/u)$/.test(s))return'u';
  if(/^(g|gr|grs|gramo|gramos)$/.test(s))return'g';
  if(s.length>3&&s.endsWith('s'))s=s.slice(0,-1);
  return s;
};
const diasEntre=(a,b)=>{const L=[];for(let f=a;f<=b;f=clDateAdd(f,1)){L.push(f);if(L.length>400)break;}return L;};

/* ══════════════ las reglas fijas del módulo ══════════════ */
const MOTIVOS=[
  {v:'podrido',t:'Se pudrió'},{v:'maltrato',t:'Se maltrató'},{v:'limpieza',t:'Limpieza y recorte'},
  {v:'regalo',t:'Se regaló o lo consumimos'},{v:'peso',t:'Diferencia de peso'},{v:'otro',t:'Otro'}];
const motivoT=v=>(MOTIVOS.find(m=>m.v===v)||{t:v||'Sin motivo'}).t;
const AVISO_DESECHO=0.15;                                                 // más del 15 % de lo que se compra de un producto
const GASTOS=[                                                            // cada gasto que se reparte según lo vendido
  {k:'transporte',t:'Transporte',d:'Viajes y gastos de ir a comprar'},
  {k:'comision',t:'Comisión del datáfono',d:'Lo que cobra el banco por la tarjeta'},
  {k:'fijos',t:'Gastos fijos',d:'Alquiler, luz y los demás de siempre'},
  {k:'salarios',t:'Salarios',d:'Lo que se paga a quien atiende'},
  {k:'otros',t:'Otros gastos',d:'Gastos sueltos y retiros de caja'}];
const PARTES=[{k:'costo',t:'Lo que costó',d:'Lo que se pagó por lo que se vendió'},{k:'desecho',t:'Lo que se botó',d:'Lo que se desechó de este producto, al costo'}]
  .concat(GASTOS,[{k:'ganancia',t:'Ganancia',d:'Lo que de verdad queda'}]);

/* ══════════════ LAS CUENTAS (puras) ══════════════ */
// E = { desde, hasta,
//   dias:[{f, incluir, hayPOS, productos:[{id,n,u,q,t,d,c,sc}], desechosDet:[…]|null, desechosPOS:número}],
//   desechosMano:[{id,f,prod,pid,q,u,costo,motivo,nota,foto}], motivos:{idLínea:motivo}, factores:{id:{caja}},
//   compras:[{f,prov,t,u,q,precio,monto}], comprasMerc:número (lo que el Control cuenta como compras, sin los gastos del viaje),
//   gastos:{transporte,comision,fijos,salarios,otros} (de los días que se incluyen), gastosFuera:número (de los demás días),
//   control:{ganancia,ventas,bodega,sobrante,desechosResta}, diasProblema:[{f,ventas}], idDe:fn }
function cuentas(E){
  const idF=E.idDe||idDe,dias=E.dias||[],rows=new Map();
  const fila=(id,n,u)=>{
    let r=rows.get(id);
    if(!r){r={id,n:n||id,u:u||'',qs:{},venta:0,desc:0,costoVend:0,sc:false,desecho:0,desechoQ:{},desechoN:0,compra:null,gastos:{},gastoTotal:0};rows.set(id,r);}
    return r;
  };
  // 1) lo vendido, tal como lo mandó el POS
  dias.forEach(d=>{(d.productos||[]).forEach(p=>{
    const r=fila(p.id,p.n,p.u),u=p.u||'';
    r.qs[u]=(r.qs[u]||0)+n0(p.q);r.venta+=r0(p.t);r.desc+=r0(p.d);r.costoVend+=r0(p.c);if(p.sc)r.sc=true;
  });});
  // el mismo producto con otro nombre: el id del POS (o el del catálogo) se une por el nombre
  const porNombre=new Map();rows.forEach(r=>{const k=idF(r.n);if(!porNombre.has(k))porNombre.set(k,r.id);});
  const canon=(pid,nombre)=>{
    if(pid&&rows.has(pid))return pid;
    const k=nombre?idF(nombre):'';
    if(k&&porNombre.has(k))return porNombre.get(k);
    if(pid&&porNombre.has(pid))return porNombre.get(pid);
    return pid||k||'sd';
  };
  // 2) lo que se botó: del POS (automático) y lo anotado a mano
  const lista=[];
  dias.forEach(d=>{
    if(Array.isArray(d.desechosDet)){
      d.desechosDet.forEach(x=>{
        const k=d.f+':'+x.n+':'+x.id;
        lista.push({k,f:d.f,h:x.h||'',id:canon(x.id,x.nom),nom:x.nom||'',u:x.u||'',q:n0(x.q),cu:n0(x.cu),costo:r0(x.c),motivo:(E.motivos||{})[k]||'',origen:'pos',cajero:x.cajero||'',num:x.n});
      });
    }else if(n0(d.desechosPOS)>0){
      const k=d.f+':sd:sd';
      lista.push({k,f:d.f,h:'',id:'sd',nom:'Desechos del POS (sin detalle)',u:'',q:0,cu:0,costo:r0(d.desechosPOS),motivo:(E.motivos||{})[k]||'',origen:'pos',cajero:'',num:''});
    }
  });
  (E.desechosMano||[]).forEach(m=>{
    lista.push({k:'m:'+m.id,f:m.f,h:'',id:canon(m.pid,m.prod),nom:m.prod||'',u:m.u||'',q:n0(m.q),cu:n0(m.q)>0?n0(m.costo)/n0(m.q):0,costo:r0(m.costo),motivo:m.motivo||'',nota:m.nota||'',foto:!!m.foto,origen:'mano',mid:m.id});
  });
  lista.sort((a,b)=>(a.f+(a.h||'99:99')).localeCompare(b.f+(b.h||'99:99'))||(a.k<b.k?-1:1));
  lista.forEach(x=>{
    const r=fila(x.id,x.nom,x.u);r.desecho+=x.costo;r.desechoN++;
    const k=unorm(x.u);r.desechoQ[k]=(r.desechoQ[k]||0)+x.q;
  });
  // 3) lo que se compró de cada producto
  const compraPor=new Map();let comprasDet=0;
  (E.compras||[]).forEach(c=>{
    const id=canon(null,c.t),m=r0(c.monto);comprasDet+=m;
    const x=compraPor.get(id)||{monto:0,items:[]};x.monto+=m;x.items.push({f:c.f,t:c.t,u:c.u||'',q:n0(c.q),precio:n0(c.precio),monto:m,prov:c.prov||''});compraPor.set(id,x);
  });
  // 4) cada producto: unidad, estado
  rows.forEach(r=>{
    const us=Object.keys(r.qs).sort((a,b)=>r.qs[b]-r.qs[a]);
    r.u=us[0]!==undefined?us[0]:(r.u||'');r.q=us.length?Math.round(r.qs[us[0]]*1000)/1000:0;r.mezcla=us.length>1;
    r.suelto=/^g:/.test(r.id)||r.id==='sd';
    r.sinCosto=!r.suelto&&r.venta>0&&(r.sc||r.costoVend<=0);
    r.compra=compraPor.get(r.id)||null;
  });
  // 5) los gastos se reparten entre los productos según su parte de lo vendido (Colones.partir: la suma da exacto)
  const orden=[...rows.values()].filter(r=>r.venta>0).sort((a,b)=>b.venta-a.venta||(a.id<b.id?-1:1));
  const sinRepartir={},gastosRep={};
  GASTOS.forEach(g=>{
    const total=r0((E.gastos||{})[g.k]);gastosRep[g.k]=0;
    if(!total)return;
    if(!orden.length){sinRepartir[g.k]=total;return;}
    const p=partir(total,orden.map(r=>r.venta));
    orden.forEach((r,i)=>{r.gastos[g.k]=p[i];r.gastoTotal+=p[i];});gastosRep[g.k]=total;
  });
  // 6) "Le quedó" y "Ganancia" (sin costo conocido no se inventa: queda aparte, como pendiente)
  const tot={venta:0,desc:0,costo:0,desecho:0,gastos:0,margen:0,ganancia:0,pend:0};
  rows.forEach(r=>{
    GASTOS.forEach(g=>{if(!r.gastos[g.k])r.gastos[g.k]=0;});
    r.conCosto=!r.suelto&&!r.sinCosto;
    if(r.conCosto){r.margen=r.venta-r.costoVend-r.desecho;r.ganancia=r.margen-r.gastoTotal;r.pend=0;
      const c=partesSocios(Math.max(0,r.ganancia));r.socios=r.ganancia>0?c:{jefes:0,roger:0,joseph:0};tot.margen+=r.margen;tot.ganancia+=r.ganancia;}
    else{r.margen=null;r.ganancia=null;r.pend=r.venta-r.costoVend-r.desecho-r.gastoTotal;r.socios=null;tot.pend+=r.pend;}
    tot.venta+=r.venta;tot.desc+=r.desc;tot.costo+=r.costoVend;tot.desecho+=r.desecho;tot.gastos+=r.gastoTotal;
  });
  tot.total=tot.ganancia+tot.pend;                                          // = ventas − costo − desechos − gastos repartidos
  tot.formula=tot.venta-tot.costo-tot.desecho-tot.gastos;
  const todas=[...rows.values()];
  const conVida=r=>r.venta>0||r.desecho>0;
  const ranking=todas.filter(r=>r.conCosto&&conVida(r));
  const faltaCosto=todas.filter(r=>r.sinCosto).sort((a,b)=>b.venta-a.venta).map(r=>({id:r.id,n:r.n,u:r.u,q:r.q,venta:r.venta,costoParcial:r.costoVend}));
  const sueltos=todas.filter(r=>r.suelto&&r.venta>0).map(r=>({id:r.id,n:r.n,venta:r.venta}));
  // pierde plata el que se vendió por menos de lo que costó (con lo que se botó); que no alcance para los gastos es otra cosa
  const pierden=ranking.filter(r=>r.margen<0).sort((a,b)=>a.margen-b.margen);
  // 7) comprado ↔ vendido ↔ botado en CANTIDAD (solo si se pueden comparar; si no, solo plata)
  todas.forEach(r=>{r.cant=cantidades(r,(E.factores||{})[r.id]);});
  // 8) el puente: lo que se compró, a dónde fue
  const comprasMerc=E.comprasMerc!=null?r0(E.comprasMerc):comprasDet;
  const diasProblema=E.diasProblema||[];
  const puente={compraste:comprasMerc,comprasDetalle:comprasDet,costo:tot.costo,desecho:tot.desecho,quedo:comprasMerc-tot.costo-tot.desecho,
    incompleto:diasProblema.length>0,costoIncompleto:faltaCosto.length>0||sueltos.length>0};
  // 9) por qué esto no es igual a la "Ganancia de la semana" del Control
  let conControl=null;
  if(E.control){
    const c=E.control,fuera=r0(E.gastosFuera);
    const ventasFuera=r0(c.ventas)-tot.venta;
    conControl={ganancia:r0(c.ganancia),productos:tot.total,ventasFuera,bodega:r0(c.bodega),sobrante:r0(c.sobrante),desechosResta:r0(c.desechosResta),gastosFuera:fuera,quedo:puente.quedo};
    conControl.suma=conControl.productos+ventasFuera+conControl.bodega+conControl.sobrante-conControl.desechosResta-conControl.quedo-fuera;
    conControl.dif=conControl.ganancia-conControl.suma;                      // 0 (o unos pocos colones de redondeo)
  }
  // 10) desechos: por producto, por motivo y por día
  const total=lista.reduce((s,x)=>s+x.costo,0);
  const porProd=new Map();
  lista.forEach(x=>{const g=porProd.get(x.id)||{id:x.id,n:(rows.get(x.id)||{}).n||x.nom,costo:0,q:{},veces:0};g.costo+=x.costo;g.veces++;const k=unorm(x.u);g.q[k]=(g.q[k]||0)+x.q;porProd.set(x.id,g);});
  const porProducto=[...porProd.values()].sort((a,b)=>b.costo-a.costo||(a.id<b.id?-1:1)).map(g=>{
    const comp=compraPor.get(g.id),pct=comp&&comp.monto>0?g.costo/comp.monto:null;
    const us=Object.keys(g.q).sort((a,b)=>g.q[b]-g.q[a]);
    return{id:g.id,n:g.n,costo:g.costo,q:us.length?g.q[us[0]]:0,u:us[0]||'',veces:g.veces,comprado:comp?comp.monto:0,pct,aviso:pct!=null&&pct>AVISO_DESECHO&&g.costo>0};
  });
  const porMot=new Map();
  lista.forEach(x=>{const k=x.motivo||'';const g=porMot.get(k)||{v:k,t:k?motivoT(k):'Sin motivo',costo:0,veces:0};g.costo+=x.costo;g.veces++;porMot.set(k,g);});
  const porMotivo=[...porMot.values()].sort((a,b)=>b.costo-a.costo);
  const porDia=new Map();lista.forEach(x=>{const g=porDia.get(x.f)||{f:x.f,total:0,lista:[]};g.total+=x.costo;g.lista.push(x);porDia.set(x.f,g);});
  const desechos={lista,total,porProducto,porMotivo,porDia:[...porDia.values()].sort((a,b)=>a.f<b.f?-1:1),
    pctCompras:comprasMerc>0?total/comprasMerc:null,avisos:porProducto.filter(g=>g.aviso),
    sinCosto:lista.filter(x=>x.costo<=0).length,sinMotivo:lista.filter(x=>!x.motivo).length};
  return{desde:E.desde,hasta:E.hasta,filas:todas,porId:rows,ranking,pierden,faltaCosto,sueltos,tot,puente,conControl,desechos,
    gastos:gastosRep,gastosSinRepartir:sinRepartir,gastosFuera:r0(E.gastosFuera),diasProblema,
    vacio:!tot.venta&&!desechos.total,sinVentas:!orden.length};
}
// Comprado, vendido y botado en cantidad. Solo si las unidades se pueden comparar (o si se sabe cuántos kg trae la caja).
function cantidades(r,factor){
  const comp=r.compra;if(!comp||!comp.items.length)return null;
  const uv=unorm(r.u),f=factor&&n0(factor.caja)>0?n0(factor.caja):0;
  let qc=0,hayOtra=false;
  comp.items.forEach(i=>{
    if(unorm(i.u)===uv||!i.u&&!uv)qc+=i.q;
    else if(f)qc+=i.q*f;
    else hayOtra=true;
  });
  if(hayOtra)return{ok:false,necesitaFactor:true,uCompra:(comp.items.find(i=>unorm(i.u)!==uv)||{}).u||'',uVenta:r.u};
  const bq=Object.keys(r.desechoQ).filter(k=>k!==uv&&r.desechoQ[k]>0);
  if(bq.length)return{ok:false,necesitaFactor:false,uCompra:'',uVenta:r.u,comprado:qc,vendido:r.q};
  const botado=r.desechoQ[uv]||0;
  return{ok:true,comprado:Math.round(qc*1000)/1000,vendido:r.q,botado:Math.round(botado*1000)/1000,queda:Math.round((qc-r.q-botado)*1000)/1000,u:r.u};
}
// "Cada colón de la fresa": de cada ₡1 000 vendidos (y de cada kilo/unidad), a dónde fue. Partes enteras que suman exacto.
function trozos(r,base){
  const v=r.venta;if(!(v>0)||!(base>0))return null;
  const x={costo:r.costoVend,desecho:r.desecho};GASTOS.forEach(g=>{x[g.k]=r.gastos[g.k]||0;});
  const claves=PARTES.map(p=>p.k).filter(k=>k!=='ganancia'),gan=v-claves.reduce((s,k)=>s+x[k],0);
  let p;
  if(gan>=0){const t=partir(base,claves.map(k=>x[k]).concat(gan));p={};claves.forEach((k,i)=>{p[k]=t[i];});p.ganancia=t[claves.length];}
  else{                                                                      // pierde: las partes pasan de lo vendido
    const S=claves.reduce((s,k)=>s+x[k],0),t=partir(Math.round(base*S/v),claves.map(k=>x[k]));p={};claves.forEach((k,i)=>{p[k]=t[i];});
    p.ganancia=base-Object.values(p).reduce((s,n)=>s+n,0);
  }
  p.base=base;p.socios=p.ganancia>0?partesSocios(p.ganancia):{jefes:0,roger:0,joseph:0};
  return p;
}
function cascadaDe(r){
  if(!r)return null;
  if(r.suelto)return{id:r.id,n:r.n,suelto:true,venta:r.venta};
  if(r.sinCosto)return{id:r.id,n:r.n,sinCosto:true,venta:r.venta,q:r.q,u:r.u};
  if(!(r.venta>0))return{id:r.id,n:r.n,soloDesecho:true,desecho:r.desecho,venta:0};
  const por1000=trozos(r,1000),precio=r.q>0?Math.round(r.venta/r.q):0;
  // por unidad: el precio promedio al que se vendió, repartido de la misma forma (una unidad = lo vendido ÷ cantidad)
  let porUnidad=null;
  if(r.q>0&&precio>0){
    const x=trozos(r,precio);porUnidad=x;
  }
  return{id:r.id,n:r.n,u:r.u,q:r.q,venta:r.venta,margen:r.margen,ganancia:r.ganancia,costoVend:r.costoVend,desecho:r.desecho,gastos:r.gastos,gastoTotal:r.gastoTotal,
    por1000,porUnidad,precio,conGanancia:r.ganancia>0};
}

/* ══════════════ de dónde salen los datos ══════════════ */
// Las compras con su detalle de producto: del módulo de Compras si está; si no, de los Cierres de compras de Inventario
function comprasDeCierres(desde,hasta){
  const out=[];if(!PU||!PU.cierresDia)return out;
  diasEntre(desde,hasta).forEach(f=>{
    (PU.cierresDia(f,TIENDA)||[]).forEach(c=>{
      (c.provs||[]).forEach(p=>{
        (p.items||[]).forEach(it=>{const m=n0(it.sa);if(m>0)out.push({f,prov:p.prov||'',t:it.t||'',u:it.u||'',q:n0(it.qa),precio:n0(it.precio),monto:r0(m),origen:'Cierre de compras'});});
        (p.mas||[]).forEach(it=>{const m=n0(it.sa);if(m>0)out.push({f,prov:p.prov||'',t:it.t||'',u:'',q:it.para==='mitad'?n0(it.q)/2:n0(it.q),precio:n0(it.precio),monto:r0(m),origen:'Cierre de compras'});});
      });
    });
  });
  return out;
}
function comprasCostos(desde,hasta){
  try{if(window.Compras&&typeof window.Compras.costos==='function'){const r=window.Compras.costos(desde,hasta);if(Array.isArray(r))return r;}}catch(e){console.error(e);}
  return comprasDeCierres(desde,hasta);
}
// Junta todo lo que hace falta de un rango de días (nunca más allá de hoy) y se lo pasa a cuentas()
function leer(desde,hasta,Wc){
  const h=hoy(),fin=hasta>h?h:hasta,pesos={},semanas=new Map();
  const lunes0=clMonday(desde);
  const Wde=f=>{const L=clMonday(f);if(Wc&&L===lunes0)return Wc;if(!semanas.has(L))semanas.set(L,clComputeWeek(L));return semanas.get(L);};
  const dias=[],problema=[];
  const G={transporte:0,comision:0,fijos:0,salarios:0,otros:0},GT={transporte:0,comision:0,fijos:0,salarios:0,otros:0};
  const C={ganancia:0,ventas:0,bodega:0,sobrante:0,desechosResta:0};let comprasTotal=0,viajes=0;
  const fuera=data.autoFuera||{};
  if(fin>=desde)diasEntre(desde,fin).forEach(f=>{
    const D=Wde(f).perDay.find(x=>x.date===f);if(!D)return;
    const pos=PU?PU.posDia(f,TIENDA):null,detalle=!!(pos&&Array.isArray(pos.productos));
    const incluir=detalle||(!pos&&n0(D.ventas)<=0);
    dias.push({f,incluir,hayPOS:!!pos,productos:detalle?pos.productos:[],desechosDet:pos&&Array.isArray(pos.desechosDet)?pos.desechosDet:null,desechosPOS:pos?n0(pos.desechos):0});
    if(!incluir)problema.push({f,ventas:r0(D.ventas)});
    // los gastos del viaje de compras (ya van dentro de las compras del Control) y los viajes por kilómetro
    let tv=0;
    if(PU&&PU.lineas){const raw=clDailyRaw(f);(PU.lineas(f,TIENDA)||[]).forEach(l=>{if(l.origen==='Gasto del viaje de compras'&&!fuera[l.id]&&!n0(raw[l.campo]))tv+=n0(l.monto);});}
    const gd=D.gastosDet,km=gd?n0(gd.viajes||gd.transporte):0;
    const g={transporte:tv+km,comision:n0(D.manual.card)-n0(D.datafonoNeto),fijos:n0(D.fixedTotal),salarios:n0(D.salarioTotal),
      otros:n0(D.gastosVarios)-km+n0(D.retirosGasto)+n0(D.rebajoTotal)+n0(D.cuentaXpagarTotal)};
    Object.keys(g).forEach(k=>{GT[k]+=g[k];if(incluir)G[k]+=g[k];});
    viajes+=tv;comprasTotal+=n0(D.comprasTotal);
    C.ganancia+=n0(D.ganancia);C.ventas+=n0(D.ventas);C.bodega+=n0(D.manual.bodega);C.sobrante+=n0(D.cajaSobrante);C.desechosResta+=n0(D.desechosResta);
  });
  const gastos={},gastosAll={};let gastosFuera=0;
  Object.keys(G).forEach(k=>{gastos[k]=r0(G[k]);gastosAll[k]=r0(GT[k]);gastosFuera+=gastosAll[k]-gastos[k];});
  const mano=(data.desechos||[]).filter(m=>m&&m.f>=desde&&m.f<=fin);
  return{desde,hasta:fin,dias,desechosMano:mano,motivos:data.desechoMotivo||{},factores:data.factores||{},
    compras:fin>=desde?comprasCostos(desde,fin):[],comprasMerc:r0(comprasTotal-viajes),gastos,gastosFuera,control:C,diasProblema:problema,idDe};
}
let memo={W:null,k:'',R:null};
function rango(desde,hasta,Wc){
  if(Wc&&memo.W===Wc&&memo.k===desde+'|'+hasta)return memo.R;
  const R=cuentas(leer(desde,hasta,Wc));
  if(Wc)memo={W:Wc,k:desde+'|'+hasta,R};
  return R;
}
const semana=(lunes,Wc)=>rango(lunes,clDateAdd(lunes,6),Wc);
function cascada(id,lunes,Wc){const R=semana(lunes||clMonday(hoy()),Wc);return cascadaDe(R.porId.get(id));}

// El último costo que se conoce de un producto: lo que costó lo último que se vendió (POS) o el último precio de compra
const cacheCosto=new Map();let cacheT=0;
function ultimoCosto(pid,nombre,unidad){
  const t=Date.now();if(t-cacheT>20000){cacheCosto.clear();cacheT=t;}
  const ck=[pid||'',nombre||'',unorm(unidad)].join('|');if(cacheCosto.has(ck))return cacheCosto.get(ck);
  const k=idDe(nombre||pid||''),uu=unorm(unidad),h=hoy();let otra=null,res=null;
  const es=x=>x.id===pid||x.id===k||idDe(x.n)===k||(pid&&idDe(x.n)===pid);
  for(let i=0;i<60&&!res;i++){
    const p=PU&&PU.posDia?PU.posDia(clDateAdd(h,-i),TIENDA):null;if(!p||!Array.isArray(p.productos))continue;
    for(const x of p.productos){
      if(x.sc||!(n0(x.q)>0)||!(n0(x.c)>0)||!es(x))continue;
      const cu=x.c/x.q,c={cu,u:x.u,origen:'POS',f:p.fecha||clDateAdd(h,-i)};
      if(!uu||unorm(x.u)===uu){res=c;break;}
      if(!otra)otra=c;
    }
  }
  if(!res){
    const L=comprasCostos(clDateAdd(h,-60),h).filter(c=>idDe(c.t)===k&&n0(c.precio)>0).sort((a,b)=>a.f<b.f?1:-1);
    const m=L.find(c=>!uu||unorm(c.u)===uu);if(m)res={cu:n0(m.precio),u:m.u,origen:'compras',f:m.f};
    else if(!otra&&L[0])otra={cu:n0(L[0].precio),u:L[0].u,origen:'compras',f:L[0].f};
  }
  const out=res||(otra?{...otra,otraUnidad:true}:null);
  cacheCosto.set(ck,out);return out;
}
const costoAnotado=(q,cu)=>r0(n0(q)*n0(cu));

window.Productos={
  cuentas,leer,rango,semana,cascada,cascadaDe,trozos,cantidades,ultimoCosto,costoAnotado,
  MOTIVOS,motivoT,GASTOS,PARTES,AVISO_DESECHO,unorm,
  motivoDe:k=>(data.desechoMotivo||{})[k]||'',
  limpiar(){memo={W:null,k:'',R:null};cacheCosto.clear();}
};
// los datos nuevos se crean vacíos (sin guardar: un respaldo viejo abre igual)
data.desechos=Array.isArray(data.desechos)?data.desechos:[];
data.desechoMotivo=data.desechoMotivo&&typeof data.desechoMotivo==='object'?data.desechoMotivo:{};
data.factores=data.factores&&typeof data.factores==='object'?data.factores:{};

/* ══════════════ LAS PANTALLAS ══════════════ */
(window.CX_MODULOS=window.CX_MODULOS||[]).push(u=>{
  if(u.alReiniciar)u.alReiniciar(()=>{data.desechos=[];data.desechoMotivo={};try{window.Productos.limpiar();}catch(e){}});
  const {col,ic,hoy:hoyU}=u,esc=window.esc||(s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const fq=q=>(Math.round(n0(q)*100)/100).toLocaleString('es-CR');
  const fpct=x=>(Math.round(n0(x)*1000)/10).toLocaleString('es-CR')+' %';
  const uTxt=(q,un)=>{const k=unorm(un);return k==='kg'?'kg':k==='u'?(Math.abs(q-1)<1e-9?'unidad':'unidades'):k==='g'?'g':(un||'');};
  const cantTxt=(q,un)=>fq(q)+' '+uTxt(q,un);
  const unSing=un=>{const k=unorm(un);return k==='kg'?'kilo':k==='u'?'unidad':k==='g'?'gramo':(un||'unidad');};
  let orden='ganancia';
  const permiso=async f=>!(window.Cierres&&Cierres.permiso&&!(await Cierres.permiso(f)));

  /* ── piezas ── */
  const barraChica=(pct,clase)=>`<span class="cp-barra ${clase||''}"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></span>`;
  function avisoDias(R){
    if(!R.diasProblema.length)return'';
    const L=R.diasProblema.map(d=>u.diaCorto(d.f)).join(', ');
    return `<p class="cp-aviso"><b>De estos días no hay detalle por producto:</b> ${esc(L)}. Lo que se vendió esos días no entra en esta cuenta, ni sus gastos. El detalle llega solo cuando el POS de Los Ángeles tiene internet.</p>`;
  }
  const puenteHTML=(R,Wn)=>{
    const p=R.puente,c=R.conControl,ab=u.estado.abiertos.has('cp-porque');
    const quedoT=p.quedo>=0?'Quedó en la tienda o se perdió sin anotar':'Se vendió más de lo que se compró';
    const quedoD=p.quedo>=0?'Compraste − lo que se vendió − lo que se botó. Si esta plata se perdió sin anotarla como desecho, aquí se ve.':'La diferencia salió de lo que ya había en la tienda de semanas anteriores.';
    const fila=(t,v,d,clase)=>`<div class="cx-res-f ${clase||''}"><span>${t}<small>${d}</small></span><b>${col(v)}</b></div>`;
    return `<section class="cx-res cp-puente" aria-label="Lo que se compró y a dónde fue">
      <h2><i class="mas" aria-hidden="true">+</i>Compraste<b>${col(p.compraste)}</b></h2>
      ${fila('Se vendió, a su costo',p.costo,'Lo que costó lo que se vendió'+(p.costoIncompleto?' (falta el costo de algunos)':''))}
      ${fila('Se botó',p.desecho,'Los desechos, al costo')}
      ${fila(quedoT,p.quedo,quedoD,p.quedo>=0?'cp-quedo':'cp-quedo menos')}
      ${p.incompleto?'<p class="cp-aviso">Faltan días sin detalle: esta cuenta no es del todo exacta.</p>':''}
      ${p.costoIncompleto&&!p.incompleto?'<p class="cp-aviso">Hay productos sin costo: lo que "quedó" sale más grande de lo real hasta que se les ponga el costo.</p>':''}
      <button type="button" class="cx-enlace" data-cx="cp-porque" aria-expanded="${ab}">${ab?'Ocultar':'¿Por qué no es la ganancia de la semana?'}</button>
      ${ab&&c?`<div class="cp-porque">
        <p>La ganancia de la semana (Inicio) resta lo que se <b>compró</b>. Aquí solo se resta lo que <b>costó lo que se vendió</b>. Por eso la diferencia es lo que quedó en la tienda.</p>
        <div class="cx-res-f"><span>Ganancia de la semana</span><b>${col(c.ganancia)}</b></div>
        <div class="cx-res-f"><span>Ganancia de los productos</span><b>${col(c.productos)}</b></div>
        <div class="cx-res-f"><span>Vendido fuera del detalle<small>Ventas que no llegaron por producto</small></span><b>${col(c.ventasFuera)}</b></div>
        ${c.bodega||c.sobrante?`<div class="cx-res-f"><span>Bodega y caja de más</span><b>${col(c.bodega+c.sobrante)}</b></div>`:''}
        ${c.gastosFuera?`<div class="cx-res-f"><span>Gastos de los días sin detalle</span><b>${col(-c.gastosFuera)}</b></div>`:''}
        <div class="cx-res-f"><span>Lo que quedó en la tienda<small>Se compró y todavía no se vendió ni se botó</small></span><b>${col(-c.quedo)}</b></div>
        ${Math.abs(c.dif)>0?`<p class="cx-nota">Diferencia de redondeo: ${col(c.dif)}.</p>`:''}
      </div>`:''}
    </section>`;
  };
  const filaProducto=(r,max)=>{
    const g=r.ganancia,pierde=r.margen<0,neg=pierde,corto=!pierde&&g<0;
    return `<article class="cx-renglon cp-fila${neg?' perdida':''}"><button type="button" class="cx-renglon-b" data-cx="cp-ver" data-id="${esc(r.id)}">
      <span class="cx-ico" aria-hidden="true">${ic(r.venta>0?'canasta':'borrar',20)}</span>
      <span class="cx-renglon-t"><b>${esc(r.n)}</b>
        <small>${r.venta>0?`Vendido ${col(r.venta)}${r.q?' · '+cantTxt(r.q,r.u):''}<br>Le quedó ${col(r.margen)}`:'Solo se botó: '+col(r.desecho)}</small>
        ${barraChica(max>0?Math.abs(g)/max*100:0,neg?'mal':corto?'ojo':'bien')}</span>
      <span class="cx-renglon-m"><b class="${neg?'cx-rojo':corto?'cp-ambar':''}">${col(g)}</b><small>ganancia</small></span></button></article>`;
  };

  /* ── Productos ── */
  function vProductos(){
    const Wn=u.semana(),R=semana(Wn.inicio,Wn),t=R.tot;
    const cab=u.barra()+u.tiraDias()+u.cabeza(`Semana ${clWeekNumber(Wn.inicio)}${u.enCurso()?' · hasta hoy':''}`,'Productos',
      R.vacio?'—':col(t.ganancia),R.vacio?'Lo que deja cada producto, después de lo que costó, lo que se botó y los gastos.':'Lo que de verdad dejaron los productos esta semana, ya con su costo, sus desechos y su parte de los gastos.',t.ganancia<0&&t.margen<=0?'mal':'pro');
    const pie=`<div class="cx-pie" data-ui-abajo><button type="button" class="cx-accion" data-cx="ir" data-v="desechos"><span>Ver los desechos</span>${u.flecha()}</button></div>`;
    if(R.vacio)return cab+avisoDias(R)+(R.puente.compraste?puenteHTML(R,Wn):'')+u.vacio('Todavía no llegó el detalle de ventas por producto de esta semana. Llega solo del POS de Los Ángeles cuando se vende. Cuando llegue, aquí se ve lo que dejó cada producto.')+pie;
    const lista=R.ranking.filter(r=>!R.pierden.includes(r)).slice();
    // los productos dejaron algo, pero lo vendido no alcanzó para los gastos de estos días: se dice claro, sin asustar
    const noAlcanzo=t.ganancia<0&&t.margen>0;
    const clave={ganancia:r=>r.ganancia,vendido:r=>r.venta,quedo:r=>r.margen};
    lista.sort((a,b)=>clave[orden](b)-clave[orden](a)||(a.id<b.id?-1:1));
    const max=Math.max(1,...R.ranking.map(r=>Math.abs(r.ganancia)));
    const promedio=(()=>{const v=R.ranking.reduce((s,r)=>s+r.venta,0);return v>0?Math.round(R.ranking.reduce((s,r)=>s+r.ganancia,0)/v*1000):null;})();
    return cab+avisoDias(R)+puenteHTML(R,Wn)+`
    <div class="cx-cajitas">
      <div class="cx-cajita"><small>Vendido</small><b>${col(t.venta)}</b></div>
      <div class="cx-cajita"><small>Le quedó</small><b>${col(t.margen)}</b></div>
      <div class="cx-cajita"><small>Ganancia</small><b class="${t.ganancia<0?(t.margen>0?'cp-ambar':'cx-rojo'):''}">${col(t.ganancia)}</b></div>
    </div>
    ${noAlcanzo?`<p class="cx-nota ojo cp-noalcanzo">Los productos sí dejaron <b>${col(t.margen)}</b> después de lo que costaron y de lo que se botó. Los gastos de estos días (alquiler, salarios, transporte y lo demás) fueron <b>${col(t.gastos)}</b>: por eso la cuenta sale en negativo. No es que los productos pierdan: es que lo vendido todavía no alcanza para los gastos.</p>`:''}`+`
    <p class="cx-nota cp-prom">${promedio==null?'':`De cada ${col(1000)} vendidos, quedan ${col(promedio)} de ganancia${R.faltaCosto.length?` (sin contar los ${R.faltaCosto.length} que no tienen costo)`:''}.`}
      <br>“Le quedó” es lo vendido menos lo que costó y lo que se botó. La ganancia, además, ya descontó su parte de los gastos.</p>
    ${R.pierden.length?`<h2 class="cx-h2 cp-rojo">Estos pierden plata <span>${R.pierden.length}</span></h2>
    <p class="cx-nota arriba">Se vendieron por menos de lo que costaron, contando lo que se botó. Conviene revisar su precio o cuánto se compra.</p>
    <div class="cx-lista">${R.pierden.map(r=>filaProducto(r,max)).join('')}</div>`:''}
    <h2 class="cx-h2">Lo que deja cada producto <span>${lista.length}</span></h2>
    <div class="cx-chips cp-orden" role="group" aria-label="Ordenar por">${[['ganancia','Ganancia'],['vendido','Vendido'],['quedo','Le quedó']].map(([k,tx])=>`<button type="button" class="cx-chip" data-cx="cp-orden" data-o="${k}" aria-pressed="${orden===k}"><span>${tx}</span></button>`).join('')}</div>
    ${lista.some(r=>r.ganancia<0)?'<p class="cx-nota arriba">En ámbar: al producto le quedó plata, pero no le alcanzó para su parte de los gastos (alquiler, salarios y lo demás).</p>':''}
    <div class="cx-lista">${lista.length?lista.map(r=>filaProducto(r,max)).join(''):u.vacio('Ningún producto deja plata todavía.')}</div>
    ${R.faltaCosto.length?`<h2 class="cx-h2 cp-ambar">Falta el costo <span>${R.faltaCosto.length}</span></h2>
      <p class="cx-nota arriba">No se sabe cuánto dejan: se vendieron pero no tienen costo en el POS. No cuentan en el promedio. Se arregla poniendo el costo del producto en el POS (Inventario).</p>
      <div class="cx-lista">${R.faltaCosto.map(x=>`<article class="cx-renglon cp-falta"><button type="button" class="cx-renglon-b" data-cx="cp-ver" data-id="${esc(x.id)}"><span class="cx-ico" aria-hidden="true">${ic('alerta',20)}</span>
        <span class="cx-renglon-t"><b>${esc(x.n)}</b><small>Se vendió${x.q?' '+cantTxt(x.q,x.u):''} · falta el costo</small></span>
        <span class="cx-renglon-m"><b>${col(x.venta)}</b><small>vendido</small></span></button></article>`).join('')}</div>`:''}
    ${R.sueltos.length?`<p class="cx-nota">Ventas sueltas, que no son un producto de la lista (envíos y otras): ${col(R.sueltos.reduce((s,x)=>s+x.venta,0))}. No se calcula su ganancia.</p>`:''}
    ${R.gastosFuera||Object.keys(R.gastosSinRepartir).length?'':''}
    ${pie}`;
  }
  // "Cada colón de [producto]"
  function hojaProducto(id){
    const Wn=u.semana(),R=semana(Wn.inicio,Wn),r=R.porId.get(id);if(!r)return;
    const c=cascadaDe(r);
    let html='';
    const filasDe=(p,base,tit,sub)=>{
      if(!p)return'';
      const ks=PARTES.map(x=>x.k),tope=Math.max(1,...ks.map(k=>Math.abs(p[k])));
      const suma=ks.filter(k=>k!=='ganancia'||p.ganancia>0).reduce((s,k)=>s+Math.max(0,p[k]),0)||1;
      return `<section class="cp-cascada"><h3>${tit}</h3><p class="cp-sub">${sub}</p>
        <div class="cp-apilada" role="img" aria-label="Cómo se reparte">${ks.map(k=>Math.max(0,p[k])?`<i class="cp-k-${k}" style="width:${Math.max(0,p[k])/suma*100}%"></i>`:'').join('')}</div>
        ${PARTES.map(x=>{const v=p[x.k];if(!v&&x.k!=='ganancia'&&x.k!=='costo')return'';
          return `<div class="cp-parte"><span class="cp-punto cp-k-${x.k}" aria-hidden="true"></span><span class="cp-parte-t"><b>${x.t}</b><small>${x.d}</small>${barraChica(Math.abs(v)/tope*100,'cp-k-'+x.k)}</span><b class="cp-parte-m${v<0?' cx-rojo':''}">${col(v)}</b></div>`;}).join('')}
        <div class="cp-total"><span>Suma</span><b>${col(base)}</b></div>
        ${p.ganancia>0?`<p class="cp-sub cp-socios">De los ${col(p.ganancia)} de ganancia: ${SOC.map(s=>`<b>${s.n}</b> ${col(p.socios[s.id])} (${s.pct} %)`).join(' · ')}</p>`:''}
      </section>`;
    };
    if(c.suelto)html=`<p class="cx-nota">Esto es una venta suelta, no un producto de la lista. Se vendió ${col(c.venta)}. No se calcula su ganancia porque no tiene costo.</p>`;
    else if(c.sinCosto)html=`<div class="cp-aviso"><b>Falta el costo de ${esc(r.n)}.</b> Se vendió ${col(c.venta)}, pero en el POS no tiene costo, y sin el costo no se sabe cuánto deja. Ponele el costo al producto en el POS (Inventario) y desde la próxima venta sale solo.</div>`;
    else if(c.soloDesecho)html=`<p class="cx-nota">Esta semana no se vendió nada de ${esc(r.n)}, pero se botaron ${col(c.desecho)} (al costo). Eso es plata que se pagó y no volvió.</p>`;
    else{
      const vend=`Esta semana: vendido ${col(c.venta)} (${cantTxt(c.q,c.u)}) · costó ${col(c.costoVend)}${c.desecho?` · se botó ${col(c.desecho)}`:''} · le quedó ${col(c.margen)} · gastos ${col(c.gastoTotal)}`;
      html=`<p class="cp-sub cp-resumen">${vend}</p>`+filasDe(c.por1000,1000,`De cada ${col(1000)} que se vendieron`,`Así se reparte cada ${col(1000)} que entraron por ${esc(r.n)}.`)
        +(c.porUnidad?filasDe(c.porUnidad,c.precio,`De cada ${esc(unSing(c.u))} a ${col(c.precio)}`,`El precio promedio al que se vendió ${esc(r.n)} esta semana.`):'')
        +`<p class="cx-nota">La ganancia es lo que queda de verdad: ya descontó el costo, lo botado y la parte de los gastos que le toca según lo que se vendió.</p>`;
    }
    // comprado ↔ vendido en cantidad (si se puede)
    const q=r.cant;
    if(q&&q.ok&&!r.suelto)html+=`<section class="cp-cascada"><h3>En cantidad</h3><div class="cx-res-f"><span>Compraste</span><b>${cantTxt(q.comprado,q.u)}</b></div><div class="cx-res-f"><span>Vendiste</span><b>${cantTxt(q.vendido,q.u)}</b></div><div class="cx-res-f"><span>Botaste</span><b>${cantTxt(q.botado,q.u)}</b></div><div class="cx-res-f"><span>${q.queda>=0?'Quedan o se perdieron':'Vendiste de más'}</span><b>${cantTxt(Math.abs(q.queda),q.u)}</b></div></section>`;
    else if(q&&q.necesitaFactor)html+=`<div class="cp-aviso">Se compra por ${esc(q.uCompra||'otra unidad')} y se vende por ${esc(unSing(q.uVenta))}: para comparar cuánto se compró y cuánto se vendió hace falta un dato. <button type="button" class="cx-enlace" data-cx-hoja="cp-factor" data-id="${esc(r.id)}">¿Cuántos ${esc(uTxt(2,q.uVenta))} trae ${esc(q.uCompra?'la '+unorm(q.uCompra):'la caja')} de ${esc(r.n)}?</button></div>`;
    else if(q&&q.ok===false)html+='<p class="cx-nota">Lo botado está en otra unidad que lo vendido: solo se compara la plata.</p>';
    const h=u.ventana({titulo:'Cada colón de '+r.n,sub:'Semana '+clWeekNumber(Wn.inicio),html,no:'Cerrar'});
    h.cuerpo.addEventListener('click',e=>{const b=e.target.closest('[data-cx-hoja="cp-factor"]');if(b){h.cerrar();setTimeout(()=>pedirFactor(b.dataset.id),250);}});
  }
  async function pedirFactor(id){
    const Wn=u.semana(),R=semana(Wn.inicio,Wn),r=R.porId.get(id);if(!r||!r.cant)return;
    const uc=r.cant.uCompra||'caja',uv=r.cant.uVenta||'kg',viejo=(data.factores||{})[id];
    const v=await AramoUI.pedir({titulo:`¿Cuántos ${uTxt(2,uv)} trae cada ${unorm(uc)||'caja'}?`,texto:`De ${r.n}. Con eso se puede comparar lo que se compró con lo que se vendió.`,etiqueta:`${uTxt(2,uv)} por ${unorm(uc)||'caja'}`,
      valor:viejo?String(viejo.caja).replace('.',','):'',tipo:'decimal',si:'Guardar',validar:x=>{const n=Number(String(x).replace(',','.'));return n>0&&n<10000?'':'Escribí un número mayor que cero.';}});
    if(v==null)return;
    data.factores=data.factores||{};data.factores[id]={caja:Number(String(v).replace(',','.')),de:uc,a:uv};
    Productos.limpiar();save();u.aviso('Listo: ya se pueden comparar las cantidades de '+r.n+'.');
  }

  /* ── Desechos ── */
  const motivoChip=(k,t)=>`<span class="cx-marca ${k?'ojo':'info'}">${esc(t)}</span>`;
  function filaDesecho(x){
    return `<article class="cx-renglon cp-des"><button type="button" class="cx-renglon-b" data-cx="cp-des" data-k="${esc(x.k)}">
      <span class="cx-ico" aria-hidden="true">${ic('borrar',20)}</span>
      <span class="cx-renglon-t"><b>${esc(x.nom||'Producto')}</b>
        <small>${x.q?cantTxt(x.q,x.u):''}${x.q&&x.cu?' × '+col(x.cu)+(x.origen==='pos'?'':' (al costo)'):''}${x.h?' · '+esc(x.h):''}${x.origen==='pos'?' · del POS':' · anotado aquí'}</small>
        ${motivoChip(x.motivo,x.motivo?motivoT(x.motivo):'Tocá para decir por qué')}${x.nota?`<small>${esc(x.nota)}</small>`:''}</span>
      <span class="cx-renglon-m"><b>${col(x.costo)}</b></span></button>${x.foto?u.miniFoto('d:'+x.mid):''}</article>`;
  }
  function vDesechos(){
    const Wn=u.semana(),R=semana(Wn.inicio,Wn),D=R.desechos;
    const pct=D.pctCompras==null?'':` · ${fpct(D.pctCompras)} de lo que se compró`;
    const cab=u.barra()+u.tiraDias()+u.cabeza(`Semana ${clWeekNumber(Wn.inicio)}${u.enCurso()?' · hasta hoy':''}`,'Desechos',col(D.total),
      D.total?`Lo botado esta semana, al costo${pct}.`:'Lo que se bota: se anota aquí o llega solo del POS.','des');
    const pie=`<div class="cx-pie" data-ui-abajo><button type="button" class="cx-accion" data-cx="cp-anotar"><span>Anotar un desecho</span>${u.flecha('mas')}</button></div>`;
    const regla=`<p class="cx-nota cp-regla">Un desecho vale lo que <b>costó</b>, no lo que se iba a vender. Ya está dentro de las compras: no se resta otra vez de la ganancia.</p>`;
    if(!D.lista.length)return cab+regla+u.vacio('Nada botado esta semana. Cuando se bote algo, se anota aquí con su motivo, o llega solo si se anotó como desecho en el POS.')+pie;
    const maxP=Math.max(1,...D.porProducto.map(g=>g.costo)),maxM=Math.max(1,...D.porMotivo.map(g=>g.costo));
    return cab+regla+
    (D.avisos.length?`<section class="cp-aviso" role="status"><b>Ojo con esto:</b> ${D.avisos.map(g=>`${esc(g.n)} bota el ${fpct(g.pct)} de lo que se compra (${col(g.costo)} de ${col(g.comprado)})`).join('; ')}. Pasa del ${fpct(AVISO_DESECHO)}.</section>`:'')+
    (D.sinCosto?`<p class="cp-aviso">${D.sinCosto===1?'Un desecho no tiene costo':D.sinCosto+' desechos no tienen costo'}: valen ₡0 hasta que se corrijan.</p>`:'')+
    `<h2 class="cx-h2">Por producto <span>${D.porProducto.length}</span></h2>
    <div class="cx-lista">${D.porProducto.map(g=>`<article class="cx-renglon"><div class="cx-renglon-b cp-sinboton"><span class="cx-ico" aria-hidden="true">${ic('borrar',20)}</span>
      <span class="cx-renglon-t"><b>${esc(g.n)}</b><small>${g.q?cantTxt(g.q,g.u)+' · ':''}${g.veces} ${g.veces===1?'vez':'veces'}${g.pct!=null?' · '+fpct(g.pct)+' de lo que se compró':''}</small>${barraChica(g.costo/maxP*100,g.aviso?'ojo':'des')}</span>
      <span class="cx-renglon-m"><b>${col(g.costo)}</b>${g.aviso?'<span class="cx-marca ojo">Mucho</span>':''}</span></div></article>`).join('')}</div>
    <h2 class="cx-h2">Por motivo</h2>
    <div class="cx-lista">${D.porMotivo.map(g=>`<article class="cx-renglon"><div class="cx-renglon-b cp-sinboton"><span class="cx-ico" aria-hidden="true">${ic('nota',20)}</span>
      <span class="cx-renglon-t"><b>${esc(g.t)}</b><small>${g.veces} ${g.veces===1?'desecho':'desechos'}${g.v?'':' · tocalos abajo para decir por qué'}</small>${barraChica(g.costo/maxM*100,g.v?'des':'ojo')}</span>
      <span class="cx-renglon-m"><b>${col(g.costo)}</b></span></div></article>`).join('')}</div>
    <h2 class="cx-h2">Día por día</h2>
    ${D.porDia.map(d=>`<h3 class="cp-dia">${esc(u.diaBonito(d.f))}<b>${col(d.total)}</b></h3><div class="cx-lista">${d.lista.map(filaDesecho).join('')}</div>`).join('')}
    <p class="cx-nota">Tocá un desecho para decir por qué se botó${D.lista.some(x=>x.origen==='mano')?' o para corregirlo':''}.</p>`+pie;
  }

  /* ── Anotar un desecho (a mano) o ponerle motivo a uno del POS ── */
  function sugerencias(){
    const Wn=u.semana(),R=semana(Wn.inicio,Wn),s=new Map();
    R.filas.forEach(r=>{if(!r.suelto&&r.venta>0)s.set(idDe(r.n),r.n);});
    if(window.ARAMO_CAT&&Array.isArray(ARAMO_CAT.LISTA))ARAMO_CAT.LISTA.forEach(p=>{if(p&&p.n&&!s.has(idDe(p.n)))s.set(idDe(p.n),p.n);});
    return [...s.values()];
  }
  function unidadSugerida(nombre){
    const Wn=u.semana(),R=semana(Wn.inicio,Wn),k=idDe(nombre),r=[...R.porId.values()].find(x=>idDe(x.n)===k||x.id===k);
    return r&&r.u?unorm(r.u)==='kg'?'kg':'u':'kg';
  }
  const UNIDADES=[{v:'kg',t:'Kilos'},{v:'u',t:'Unidades'}];
  async function anotarDesecho(m){
    const f=m?m.f:u.estado.dia,id=m?m.id:uid();
    let tocoCosto=!!m,pid=m?m.pid:'',unidad=m?(unorm(m.u)==='u'?'u':'kg'):'kg';
    const html=`<label class="cx-campo"><span class="cx-et">¿Qué se botó?</span>
        <input id="cpP" class="ui-campo-in" type="text" list="cpLista" autocomplete="off" maxlength="60" placeholder="Ej.: Fresa" value="${esc(m?m.prod:'')}"><span class="cx-error" role="alert"></span></label>
      <datalist id="cpLista">${sugerencias().map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>
      <label class="cx-campo"><span class="cx-et">¿Cuánto?</span>
        <input id="cpQ" class="ui-campo-in" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej.: 2,5" value="${m&&m.q?String(m.q).replace('.',','):''}"><span class="cx-error" role="alert"></span></label>
      ${u.chips('cpU','Unidad',UNIDADES,unidad)}
      ${u.campoMonto('cpC','Lo que costó (en total)',m?m.costo:'','<span id="cpAy">El costo sale solo del último costo conocido del producto. Podés corregirlo.</span>')}
      ${u.chips('cpM','¿Por qué se botó?',MOTIVOS.map(x=>({v:x.v,t:x.t})),m?m.motivo:'', 'Con el motivo se sabe cómo evitarlo.')}
      <label class="cx-campo"><span class="cx-et">Nota (si querés)</span><input id="cpN" class="ui-campo-in" type="text" autocomplete="off" maxlength="120" value="${esc(m?m.nota||'':'')}"></label>
      ${u.fotoHTML(m&&m.foto,'Foto de lo botado')}`;
    let st=null;
    u.ventana({titulo:m?'Corregir el desecho':'Anotar un desecho',sub:u.diaLargo(f),html,si:'Guardar',
      borrar:m?()=>borrarDesecho(m):null,borrarTexto:'Borrar este desecho',
      listo(cuerpo){
        st=u.atarFoto(cuerpo,'d:'+id,m&&m.foto);
        const P=cuerpo.querySelector('#cpP'),Q=cuerpo.querySelector('#cpQ'),C=cuerpo.querySelector('#cpC'),Ay=cuerpo.querySelector('#cpAy');
        const cantidad=()=>Number(String(Q.value).replace(',','.'))||0;
        const sacar=()=>{
          const nombre=P.value.trim();if(!nombre)return;
          const k=ultimoCosto(idDe(nombre),nombre,unidad);
          if(!tocoCosto){
            const q=cantidad();
            if(k&&!k.otraUnidad&&q>0){C.value=costoAnotado(q,k.cu).toLocaleString('es-CR');Ay.textContent=`${cantTxt(q,unidad)} × ${col(k.cu)} (el último costo conocido, ${k.origen==='POS'?'del POS':'de las compras'}). Podés corregirlo.`;}
            else if(k&&k.otraUnidad){C.value='';Ay.textContent=`El último costo conocido es ${col(k.cu)} por ${unSing(k.u)}, pero lo botado está en otra unidad: escribí el costo total.`;}
            else if(!k){C.value='';Ay.textContent='No se conoce el costo de este producto: escribí cuánto costó lo que se botó.';}
          }
        };
        P.addEventListener('input',()=>{tocoCosto=false;sacar();});P.addEventListener('change',()=>{tocoCosto=false;sacar();});
        Q.addEventListener('input',sacar);
        C.addEventListener('input',()=>{tocoCosto=true;});
        cuerpo.querySelector('[data-grupo="cpU"]').addEventListener('cambio',e=>{unidad=e.detail;sacar();});
        if(!m&&!P.value)setTimeout(()=>P.focus(),50);
      },
      async guardar(cuerpo){
        const P=cuerpo.querySelector('#cpP'),Q=cuerpo.querySelector('#cpQ'),C=cuerpo.querySelector('#cpC');
        const nombre=P.value.trim(),q=Number(String(Q.value).replace(',','.'))||0,costo=u.leerMonto(C);
        const mot=u.escogido(cuerpo,'cpM')||'otro',un=u.escogido(cuerpo,'cpU')||'kg';
        if(!nombre){u.fallo(P.closest('.cx-campo'),'Escribí qué se botó.');return false;}
        if(!(q>0)){u.fallo(Q.closest('.cx-campo'),'Escribí cuánto se botó.');return false;}
        if(!(costo>0)){u.fallo(C.closest('.cx-campo'),'Escribí cuánto costó lo que se botó (no se conoce el costo de este producto).');return false;}
        if(!(await permiso(f)))return false;
        if(m&&m.f!==f&&!(await permiso(m.f)))return false;
        const conFoto=await st.guardar('d:'+id);
        const reg={id,f,prod:nombre,pid:idDe(nombre),q:Math.round(q*1000)/1000,u:un,costo,motivo:mot,nota:cuerpo.querySelector('#cpN').value.trim(),foto:!!conFoto,at:m?m.at:new Date().toISOString()};
        data.desechos=(data.desechos||[]).filter(x=>x.id!==id).concat(reg);
        Productos.limpiar();save();
        u.aviso(`${m?'Corregido':'Anotado'}: ${nombre}, ${col(costo)} (${motivoT(mot).toLowerCase()}).`);
      }});
  }
  async function borrarDesecho(m){
    if(!(await permiso(m.f)))return;
    const antes=(data.desechos||[]).slice();
    data.desechos=antes.filter(x=>x.id!==m.id);Productos.limpiar();save();
    let deshecho=false;
    u.aviso(`Borrado: ${m.prod}, ${col(m.costo)}.`,{deshacer(){deshecho=true;data.desechos=antes;Productos.limpiar();save();}});
    if(m.foto)setTimeout(()=>{if(!deshecho)u.Fotos.borrar('d:'+m.id);},9000);
  }
  // un desecho del POS: solo se le pone el motivo
  function motivoPOS(x){
    const html=`<p class="cx-hoja-texto">${esc(x.nom)} · ${x.q?cantTxt(x.q,x.u)+' · ':''}<b>${col(x.costo)}</b>${x.num?' · '+esc(x.num):''}${x.h?' · '+esc(x.h):''}${x.cajero?' · '+esc(x.cajero):''}<br>Lo anotó el POS. Decí por qué se botó.</p>`
      +u.chips('cpM','¿Por qué se botó?',MOTIVOS.map(m=>({v:m.v,t:m.t})),x.motivo||'');
    u.ventana({titulo:'¿Por qué se botó?',sub:u.diaLargo(x.f),html,si:'Guardar',
      async guardar(cuerpo){
        const mot=u.escogido(cuerpo,'cpM');if(!mot){u.fallo(cuerpo.querySelector('.cx-campo'),'Tocá un motivo.');return false;}
        if(!(await permiso(x.f)))return false;
        data.desechoMotivo=data.desechoMotivo||{};data.desechoMotivo[x.k]=mot;Productos.limpiar();save();
        u.aviso(`Listo: ${x.nom} · ${motivoT(mot).toLowerCase()}.`);
      }});
  }

  /* ── ponerlo en el Control ── */
  u.vista('productos',vProductos);
  u.vista('desechos',vDesechos);
  u.acciones({
    'cp-ver':d=>hojaProducto(d.id),
    'cp-orden':d=>{orden=d.o;u.pintar();},
    'cp-porque':()=>{const A=u.estado.abiertos;A.has('cp-porque')?A.delete('cp-porque'):A.add('cp-porque');u.pintar();},
    'cp-anotar':()=>anotarDesecho(null),
    'cp-des':d=>{
      const Wn=u.semana(),x=semana(Wn.inicio,Wn).desechos.lista.find(y=>y.k===d.k);if(!x)return;
      if(x.origen==='mano'){const m=(data.desechos||[]).find(y=>y.id===x.mid);if(m)anotarDesecho(m);}else motivoPOS(x);
    },
  });
  u.cuadro({id:'productos',orden:50,vista:'productos',tono:'pro',icono:'canasta',nombre:'Productos',
    dato:(D,W)=>{
      const R=semana(W.inicio,W);
      if(R.vacio)return{num:'Sin datos',sub:'llegan solos del POS'};
      const top=[...R.ranking].sort((a,b)=>b.margen-a.margen)[0],dejan=top&&top.margen>0;
      if(R.faltaCosto.length)return{num:'Falta el costo de '+R.faltaCosto.length,sub:dejan?'el que más deja: '+top.n:'ninguno deja plata todavía',clase:'ojo'};
      if(!top)return{num:'Sin ventas',sub:'esta semana'};
      if(R.pierden.length)return{num:R.pierden.length===1?R.pierden[0].n:R.pierden.length+' pierden plata',sub:R.pierden.length===1?'se vende por menos de lo que cuesta':'se venden por menos de lo que cuestan',clase:'alerta'};
      return dejan?{num:top.n,sub:'el que más deja: '+col(top.margen)+' esta semana'}:{num:'Sin ganancia',sub:'ninguno deja plata esta semana',clase:'ojo'};
    }});
  u.cuadro({id:'desechos',orden:60,vista:'desechos',tono:'des',icono:'borrar',nombre:'Desechos',
    dato:(D,W)=>{
      const R=semana(W.inicio,W),x=R.desechos;
      return x.total?{num:col(x.total),sub:'botado esta semana'+(x.pctCompras!=null?' · '+fpct(x.pctCompras)+' de lo comprado':''),clase:x.avisos.length?'ojo':''}:{num:col(0),sub:'nada botado esta semana'};
    }});
  u.pendiente(D=>{
    if(D.date!==hoyU())return[];
    const Wn=u.semana(),R=semana(Wn.inicio,Wn),out=[];
    if(R.faltaCosto.length)out.push({a:'cp-ir',q:`Falta el costo de ${R.faltaCosto.length} ${R.faltaCosto.length===1?'producto':'productos'}`,d:'Sin el costo no se sabe cuánto deja cada uno. Se pone en el POS (Inventario).',b:'Ver cuáles',ir:'productos'});
    return out;
  });
  u.acciones({'cp-ir':()=>u.ir('productos')});
});
})();
