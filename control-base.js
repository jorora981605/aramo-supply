// control-base.js — la base del "Control total" (2026-11-28): lo que comparten los módulos nuevos del Control.
// Se carga después del motor de control.html y antes de todo lo demás.
//   · data.reglas.desde   el día que este aparato estrenó las reglas nuevas (lo de antes no cambia; motor: clNuevo).
//   · window.Colones      repartir plata en colones enteros sin que se pierda ni sobre uno.
//   · window.ControlCaja  plata que sale del cajón para pagar algo que ya está anotado en otro lado (una entrega, un
//                         gasto): baja lo que debe haber en la caja, pero no se resta otra vez de la ganancia.
//   · window.ControlFuentes  renglones que un módulo le suma al día (motor: clAutoLineas).
//   · window.CX_MODULOS      pantallas que un módulo le agrega a la cara del Control (control-cuadros.js las monta).
(function(){
'use strict';
if(typeof clComputeWeek!=='function')return;

window.ControlFuentes=window.ControlFuentes||[];
window.CX_MODULOS=window.CX_MODULOS||[];

/* ---------- desde cuándo valen las reglas nuevas ---------- */
if(!data.reglas||!data.reglas.desde){
  data.reglas={desde:clDateISO(new Date()),v:1};
  try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){}
}

/* ---------- colones enteros ---------- */
const dos=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>y+'-'+dos(m)+'-'+dos(d);
const ms=f=>Date.parse(f+'T12:00:00');
const entre=(a,b)=>Math.round((ms(b)-ms(a))/864e5);          // días de a hasta b (b−a)
const ultimo=(y,m)=>new Date(y,m,0).getDate();                 // último día del mes m (1 a 12)

// Reparte un total entero según unos pesos, sin perder ni un colón (método del mayor residuo; los empates, en orden).
// partir(1000,[20,40,40]) → [200,400,400] · partir(100,[1,1,1]) → [34,33,33]
function partir(total,pesos){
  const T=Math.round(Number(total)||0),sg=T<0?-1:1,A=Math.abs(T);
  const P=(pesos||[]).map(p=>Math.max(0,Number(p)||0)),S=P.reduce((t,p)=>t+p,0);
  if(!P.length)return[];
  if(!S){const o=P.map(()=>0);o[0]=sg*A;return o;}
  const b=P.map((p,i)=>{const x=A*p/S,v=Math.floor(x+1e-9);return{i,v,r:x-v};});
  let resto=A-b.reduce((t,x)=>t+x.v,0);
  b.slice().sort((x,y)=>y.r-x.r||x.i-y.i).forEach(x=>{if(resto>0){x.v++;resto--;}});
  return b.map(x=>sg*x.v);
}
// El período al que pertenece un día: cada 'dia' | 'semana' (lunes a domingo) | 'mes' | 'trimestre' | 'anio'.
// → {id, ini, fin, dias, i}  (i: qué día del período es, empezando en 0)
function periodo(f,cada){
  const y=+f.slice(0,4),m=+f.slice(5,7),d=+f.slice(8,10);
  if(cada==='dia')return{id:f,ini:f,fin:f,dias:1,i:0};
  if(cada==='semana'){const L=clMonday(f);return{id:'S'+L,ini:L,fin:clDateAdd(L,6),dias:7,i:entre(L,f)};}
  if(cada==='trimestre'){const q=Math.floor((m-1)/3),m0=q*3+1,ini=iso(y,m0,1),fin=iso(y,m0+2,ultimo(y,m0+2));return{id:y+'-T'+(q+1),ini,fin,dias:entre(ini,fin)+1,i:entre(ini,f)};}
  if(cada==='anio'){const ini=iso(y,1,1),fin=iso(y,12,31);return{id:String(y),ini,fin,dias:entre(ini,fin)+1,i:entre(ini,f)};}
  const n=ultimo(y,m);return{id:f.slice(0,7),ini:iso(y,m,1),fin:iso(y,m,n),dias:n,i:d-1};        // mes
}
// La parte de UN día de un monto que es de todo el período, en colones enteros. Sumando todos los días del período
// da el monto exacto (ni un colón más ni uno menos).
function delDia(monto,f,cada){
  const M=Math.round(Number(monto)||0);if(!M)return 0;
  const p=periodo(f,cada);
  return Math.round(M*(p.i+1)/p.dias)-Math.round(M*p.i/p.dias);
}
const nombrePeriodo=(f,cada)=>{
  const p=periodo(f,cada),x=new Date(f+'T12:00:00');
  if(cada==='mes')return x.toLocaleDateString('es-CR',{month:'long',year:'numeric'});
  if(cada==='semana')return 'semana '+clWeekNumber(p.ini);
  if(cada==='trimestre')return 'trimestre '+p.id.slice(-1)+' de '+p.id.slice(0,4);
  if(cada==='anio')return 'año '+p.id;
  return x.toLocaleDateString('es-CR',{day:'numeric',month:'long'});
};
window.Colones={partir,periodo,delDia,nombrePeriodo,entre,
  CADA:{dia:'por día',semana:'por semana',mes:'al mes',trimestre:'cada tres meses',anio:'al año'}};

/* ---------- la caja: salidas que pagan algo ya anotado ---------- */
// Cada salida queda como un retiro del día con "enlace" (p. ej. 'e:<id de la entrega>' o 'g:<id del gasto>').
// Un enlace = una sola salida: si se vuelve a poner, se corrige la que había.
const hora=()=>new Date().toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'});
function quitarSalida(enlace){
  if(!enlace)return false;let hubo=false;
  Object.keys(data.closureDaily||{}).forEach(f=>{
    const e=data.closureDaily[f],L=e&&e.cajaRetiros;
    if(L&&L.some(r=>r&&r.enlace===enlace)){data.closureDaily[f]={...e,cajaRetiros:L.filter(r=>!r||r.enlace!==enlace)};hubo=true;}
  });
  return hubo;
}
function ponerSalida(f,o){
  if(!f||!o||!o.enlace)return null;
  const monto=Math.round(Number(o.monto)||0);
  const viejo=salidaDe(o.enlace);
  quitarSalida(o.enlace);
  if(monto<=0)return null;
  const e0=clDailyRaw(f),r={id:(viejo&&viejo.id)||uid(),amount:monto,concept:String(o.motivo||'').trim()||'Pago',at:(viejo&&viejo.fecha===f&&viejo.at)||hora(),foto:!!o.foto,enlace:o.enlace};
  data.closureDaily=data.closureDaily||{};
  const d0={...e0};delete d0.compras;
  data.closureDaily[f]={...d0,cajaRetiros:[...(e0.cajaRetiros||[]),r]};
  return r;
}
function salidaDe(enlace){
  let out=null;
  Object.keys(data.closureDaily||{}).some(f=>{const r=((data.closureDaily[f]||{}).cajaRetiros||[]).find(x=>x&&x.enlace===enlace);if(r){out={...r,fecha:f};return true;}return false;});
  return out;
}
// Ninguna de las tres guarda: quien las llama hace save() al terminar.
window.ControlCaja={ponerSalida,quitarSalida,salidaDe};
})();
