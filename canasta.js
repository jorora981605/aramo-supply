/* ══════════════════════════════════════════════════════════════════════
   ARAMO Canasta — taller del cliente, de punta a punta:

     🧺 Armar  →  📍 Retiro  →  💳 Pago  →  🧑‍🌾 Alistamos  →  🛍️ Recogés

   Tres formas de armar: recetas que se escalan por personas, pasillos con
   tocar-y-listo, o escribir/dictar la lista como se habla. Recuerda lo de
   siempre (nombre, sucursal, forma de pago) para no volver a preguntarlo.
   El pedido vive en AramoNube y Mostrador lo atiende en vivo.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const CFG=window.ARAMO_CANASTA,N=window.AramoNube;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const buzz=p=>{try{if(navigator.userActivation?.hasBeenActive!==false)navigator.vibrate&&navigator.vibrate(p);}catch{}};
const MINI=/[?&]mini=1/.test(location.search);
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const $c=N.colones;

const C={
  vista:'armar',pasillo:'top',q:'',parse:null,
  cesta:LS.get('cn_cesta',{}),
  retiro:Object.assign({suc:null,modo:'asap',dia:0,hora:null,carro:false,placa:''},LS.get('cn_retiro',{})),
  perfil:Object.assign({nombre:'',tel:''},LS.get('cn_perfil',{})),
  pago:Object.assign({metodo:'sinpe',conCuanto:0},LS.get('cn_pago',{})),
  sust:LS.get('cn_sust','avisar'),
  nota:LS.get('cn_nota',''),
  mis:LS.get('cn_mis',[]),
  personas:LS.get('cn_personas',4),
  actual:null,editPerfil:false,
};
function guardar(){
  LS.set('cn_cesta',C.cesta);LS.set('cn_retiro',C.retiro);LS.set('cn_perfil',C.perfil);LS.set('cn_pago',C.pago);
  LS.set('cn_sust',C.sust);LS.set('cn_nota',C.nota);LS.set('cn_mis',C.mis);LS.set('cn_personas',C.personas);
}

// ══════════════ Catálogo (vitrina de la tienda) ══════════════
const T=()=>N.tienda();
let _cat=null;
function cat(){
  if(_cat)return _cat;
  const t=T(),ocultos=new Set(t.ocultos||[]),agot=new Set(t.agotados||[]),precios=t.precios||{};
  return _cat=CFG.productos.filter(p=>!ocultos.has(p.k)).map(p=>({...p,p:+precios[p.k]||p.p,agotado:agot.has(p.k)}));
}
const prod=k=>cat().find(p=>p.k===k);

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
const porU=p=>$c(p.p)+(p.u==='kg'?' el kilo':p.u==='unid'?' c/u':' / '+fu(p.u,1));
const MAD={hoy:'Para comer hoy',semana:'Para la semana',verde:'Bien verde'};
const SUST={avisar:{e:'📞',n:'Avisame'},similar:{e:'🔁',n:'Algo parecido'},quitar:{e:'✖️',n:'Quitalo'}};

// ══════════════ Canasta ══════════════
function cestaItems(){return Object.entries(C.cesta).map(([k,v])=>({k,p:prod(k),...v})).filter(x=>x.p&&x.q>0);}
function cestaTotal(){return N.redondear5(cestaItems().reduce((t,x)=>t+x.q*x.p.p,0));}
function cestaN(){return cestaItems().length;}
function setQ(k,q){
  const p=prod(k);if(!p)return;
  q=+(Math.round(Math.max(0,q)/p.s)*p.s).toFixed(2);
  if(q<=0)delete C.cesta[k];else C.cesta[k]={...(C.cesta[k]||{}),q};
  guardar();
}
function add(k,el){
  const p=prod(k);if(!p)return;
  if(p.agotado){toast(p.n+' está agotado hoy');return;}
  setQ(k,(C.cesta[k]?.q||0)+p.s);buzz(8);
  if(el)volar(p.e,el);
  refrescar();
}

// ══════════════ Navegación ══════════════
function ir(v,opts={}){
  C.vista=v;
  if(!MINI&&!opts.noHist)history.pushState({v,id:C.actual},'',location.pathname+location.search);
  render(true);
  window.scrollTo(0,0);
}
window.addEventListener('popstate',e=>{
  if(H){cerrarHoja(true);return;}
  C.vista=e.state?.v||'armar';
  if(e.state?.id)C.actual=e.state.id;
  render(true);
});

const PASOS=[{k:'armar',e:'🧺',n:'Armar'},{k:'retiro',e:'📍',n:'Retiro'},{k:'pago',e:'💳',n:'Pago'},{k:'alistar',e:'🧑‍🌾',n:'Alistamos'},{k:'recoger',e:'🛍️',n:'Recogés'}];
function pasoActual(){
  if(C.vista==='seguimiento'){const e=N.get(C.actual)?.estado;return e==='entregado'?5:e==='listo'?4:3;}
  return C.vista==='retiro'?1:C.vista==='pago'?2:0;
}
function renderCiclo(){
  const i=pasoActual(),el=$('cnCiclo'),lleno=cestaN()>0,seg=C.vista==='seguimiento';
  el.style.setProperty('--pct',Math.min(1,i/4));
  el.innerHTML=PASOS.map((p,j)=>{
    const puede=!seg&&(j===0||(j<=2&&lleno));
    return `<button type="button" class="paso${j<i?' ok':''}${j===i?' ya':''}" data-act="paso" data-i="${j}" ${puede?'':'disabled'} aria-label="${p.n}"><b>${j<i?'✓':p.e}</b>${p.n}</button>`;
  }).join('');
}

// ══════════════ Pedidos del cliente ══════════════
const misPedidos=()=>C.mis.map(id=>N.get(id)).filter(Boolean);
const activo=()=>misPedidos().filter(o=>!['entregado','cancelado'].includes(o.estado))[0]||null;
const ultimoEntregado=()=>misPedidos().find(o=>o.estado==='entregado')||null;
function avance(o){const it=o.items||[],r=it.filter(x=>x.estado==='listo'||x.estado==='nohay').length;return{r,n:it.length};}
const suc=k=>(T().sucursales||[]).find(s=>s.k===k);
const sucs=()=>(T().sucursales||[]).filter(s=>s.activa!==false);
const sucTxt=s=>s?`${s.n} · ${s.zona}`:'';

// ══════════════ Horarios de retiro ══════════════
const hm=s=>{const [h,m]=String(s||'0:0').split(':').map(Number);return h*60+(m||0);};
const lead=()=>+T().alistadoMin||40;
const minsHoy=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
function aFecha(dia,min){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+dia);d.setMinutes(min);return d;}
function abierta(s){const m=minsHoy();return m>=hm(s.abre)&&m<hm(s.cierra);}
function asap(s){
  let m=Math.max(minsHoy(),hm(s.abre))+lead();
  m=Math.ceil(m/5)*5;
  return m>hm(s.cierra)?null:aFecha(0,m);
}
function slots(s,dia){
  let m=hm(s.abre)+lead();
  if(dia===0)m=Math.max(m,minsHoy()+lead());
  m=Math.ceil(m/30)*30;
  const out=[];
  for(;m<=hm(s.cierra);m+=30)out.push(aFecha(dia,m));
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
    if(!h||h<Date.now()+lead()*6e4*.5||!slots(s,r.dia).some(x=>+x===+h)){
      if(!slots(s,r.dia).length)r.dia=r.dia===0?1:r.dia;
      r.hora=(slots(s,r.dia)[0]||null)?.toISOString()||null;
    }
  }
  if(!T().alCarro)r.carro=false;
}
function horaRetiro(){
  const s=suc(C.retiro.suc);if(!s)return null;
  if(C.retiro.modo==='asap')return asap(s);
  const h=C.retiro.hora?new Date(C.retiro.hora):null;
  return h&&+h>Date.now()?h:null;
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
  let t=norm(txt)
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
    if(q==null)q=p?.u==='kg'?1:1;
    out.push({txt:seg,p,q:p?Math.max(p.s,+(Math.round(q/p.s)*p.s).toFixed(2)):q,on:!!(p&&!p.agotado)});
  });
  return out;
}

// ══════════════ Vistas ══════════════
const VISTAS={};

VISTAS.armar=()=>`
  <div id="cnSmart"></div>
  <form class="lista" id="cnLista" autocomplete="off">
    <input id="cnQ" type="search" enterkeyhint="go" placeholder="Buscá o dictá: 2 kg tomate, 6 limones" value="${esc(C.q)}" aria-label="Buscar o escribir lista">
    <button type="button" class="mic" id="cnMic" aria-label="Dictar lista">🎙️</button>
    <button type="submit" class="go" aria-label="Agregar lista">➜</button>
  </form>
  <div id="cnParse"></div>
  <section class="sec" id="cnTaller">
    <div class="sec-h"><h2 class="h2">Taller de recetas</h2><small>Decís qué cocinás, armamos la canasta</small></div>
    <div class="recetas">${CFG.recetas.map(r=>`<button type="button" class="rc" data-act="receta" data-k="${r.k}"><div class="rc-art" style="--c:${r.color}"><span>${r.e}</span></div><div class="rc-b"><strong>${esc(r.n)}</strong><small>${r.items.length} ingredientes · desde ${$c(costoReceta(r,2))}</small></div></button>`).join('')}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2 class="h2" id="cnGridT">Pasillos</h2><small id="cnGridS"></small></div>
    <div class="pasillos" id="cnPasillos"></div>
    <div class="grid" id="cnGrid"></div>
  </section>`;

function smartHtml(){
  const a=activo();
  if(a){
    const s=suc(a.sucursal),{r,n}=avance(a),E=N.ESTADOS.find(x=>x.k===a.estado)||N.ESTADOS[0];
    const t={nuevo:'Recibimos tu pedido',alistando:`Alistando tu canasta · ${r} de ${n}`,listo:'¡Tu canasta está lista!'}[a.estado]||E.n;
    return `<div class="smart" data-art="${E.e}"><small>Tu pedido ${esc(a.ref)}</small><h2>${t}</h2><p>Recogela ${cuando(a.retiro.at)} en ${esc(s?.n||'')}.</p><div class="row"><button type="button" class="btn btn-p" data-act="ver" data-id="${a.id}">Ver mi pedido</button></div></div>`;
  }
  const u=ultimoEntregado();
  if(u&&!cestaN()){
    return `<div class="smart" data-art="🧺"><small>Lo de siempre</small><h2>¿Repetimos tu última canasta?</h2><div class="emos">${(u.items||[]).slice(0,9).map(i=>i.e).join('')}</div><p>${u.items.length} productos · ${$c(N.totalDe(u))}</p><div class="row"><button type="button" class="btn btn-p" data-act="repetir" data-id="${u.id}">Sí, repetirla</button><button type="button" class="btn btn-s" data-act="ir-taller">Armar otra</button></div></div>`;
  }
  if(cestaN())return '';
  return `<div class="smart" data-art="🥑"><small>${esc(T().nombre||'ARAMO')} · frutas y verduras</small><h2>Armá tu canasta y recogela lista</h2><p>Escogemos cada producto como si fuera para nosotros.</p><div class="how"><div><b>🧺</b>Elegís aquí</div><div><b>🧑‍🌾</b>La alistamos</div><div><b>🛍️</b>Pasás por ella</div></div></div>`;
}
function tile(p){
  const q=C.cesta[p.k]?.q||0;
  return `<div class="pt${q?' in':''}${p.agotado?' off':''}" role="button" tabindex="0" data-act="tile" data-k="${p.k}" aria-label="${esc(p.n)}">
    ${p.agotado?'<span class="pt-tag pill r">Agotado</span>':q?`<span class="pt-tag pill">${esc(qtxt(q,p.u))}</span>`:''}
    <span class="pt-art">${p.e}</span><span class="pt-n">${esc(p.n)}</span><span class="pt-p">${porU(p)}</span>
    ${q?`<div class="step"><button type="button" data-act="menos" data-k="${p.k}" aria-label="Menos">−</button><span>${$c(q*p.p)}</span><button type="button" data-act="mas" data-k="${p.k}" aria-label="Más">+</button></div>`:p.agotado?'':'<span class="add-hint">＋ Agregar</span>'}
  </div>`;
}
function refrescarArmar(){
  if(C.vista!=='armar')return;
  $('cnSmart').innerHTML=smartHtml();
  const q=norm(C.q).replace(/[\d.,]+/g,' ').replace(/\b(kg|kilos?|unid\w*|rollos?)\b/g,' ').trim();
  $('cnPasillos').hidden=!!q;
  $('cnPasillos').innerHTML=CFG.pasillos.map(p=>`<button type="button" class="chip${C.pasillo===p.k?' on':''}" data-act="pasillo" data-k="${p.k}">${p.e} ${esc(p.n)}</button>`).join('');
  let lista;
  if(q){
    const w=q.split(/\s+/).filter(t=>!VACIAS.has(t));
    lista=cat().filter(p=>{const n=norm(p.n);return w.every(t=>n.includes(t.replace(/(es|s)$/,'')));});
    $('cnGridT').textContent='Resultados';$('cnGridS').textContent=lista.length+' productos';
  }else{
    lista=cat().filter(p=>C.pasillo==='top'?p.top:p.c===C.pasillo);
    const pa=CFG.pasillos.find(p=>p.k===C.pasillo);
    $('cnGridT').textContent='Pasillos';$('cnGridS').textContent=pa?pa.n:'';
  }
  $('cnGrid').innerHTML=lista.length?lista.map(tile).join(''):`<div class="empty" style="grid-column:1/-1"><b>🔍</b>No encontramos “${esc(C.q)}”.<br><button type="button" class="link" data-act="limpiar-q">Ver todos los pasillos</button></div>`;
  renderParse();
}
function renderParse(){
  const el=$('cnParse');if(!el)return;
  const P=C.parse;
  if(!P){el.innerHTML='';return;}
  const ok=P.filter(x=>x.p&&x.on);
  el.innerHTML=`<div class="parse fade-in"><div class="parse-h">✨ Entendí esto · tocá para quitar o poner</div><div class="parse-l">${P.map((x,i)=>x.p?`<button type="button" class="chip${x.on?' on':''}" data-act="parse-t" data-i="${i}">${x.p.e} ${esc(qtxt(x.q,x.p.u))} ${esc(x.p.n)}${x.p.agotado?' <small>agotado</small>':''}</button>`:`<span class="chip bad">❓ “${esc(x.txt)}”</span>`).join('')}</div><div class="row"><button type="button" class="btn btn-p" data-act="parse-ok" ${ok.length?'':'disabled'}>Agregar ${ok.length} a la canasta</button><button type="button" class="btn btn-s" data-act="parse-no">Cancelar</button></div></div>`;
}

VISTAS.canasta=()=>{
  const it=cestaItems();
  if(!it.length)return `<div class="empty"><b>🧺</b>Tu canasta está vacía.<br><br><button type="button" class="btn btn-p" data-act="ir" data-v="armar">Empezar a armar</button></div>`;
  return `<h1 class="h1">Tu canasta</h1><p class="sub">${it.length} productos. Tocá uno para ajustar cantidad, madurez o una nota.</p>
  <div class="card sec" style="margin-top:14px">${it.map(x=>`<div class="fila"><span class="art">${x.p.e}</span><div class="t" role="button" tabindex="0" data-act="info" data-k="${x.k}"><strong>${esc(x.p.n)}</strong><small>${porU(x.p)}</small>${x.mad||x.nota?`<div class="chips">${x.mad?`<span class="chip on">${esc(MAD[x.mad])}</span>`:''}${x.nota?`<span class="chip">📝 ${esc(x.nota)}</span>`:''}</div>`:''}</div><div class="mini-step"><div><button type="button" data-act="menos" data-k="${x.k}" aria-label="Menos">−</button><span>${esc(qtxt(x.q,x.p.u))}</span><button type="button" data-act="mas" data-k="${x.k}" aria-label="Más">+</button></div><small>${$c(x.q*x.p.p)}</small></div></div>`).join('')}</div>
  <section class="sec"><div class="sec-h"><h2 class="h2">Si algo no hay</h2><small>Decidís vos</small></div>
    <div class="seg">${Object.entries(SUST).map(([k,s])=>`<button type="button" class="${C.sust===k?'on':''}" data-act="sust" data-k="${k}">${k==='avisar'?'<span class="star">RECOMENDADO</span>':''}<b>${s.e}</b>${s.n}</button>`).join('')}</div></section>
  <details class="sec"><summary class="link">📝 Nota para quien alista</summary><textarea class="inp" id="cnNota" style="margin-top:10px" placeholder="Ej.: los aguacates para el domingo, bolsas aparte…">${esc(C.nota)}</textarea></details>
  <div class="totales"><div class="l"><span>${it.length} productos</span><span>${$c(cestaTotal())}</span></div><div class="l big"><span>Total aproximado</span><b>${$c(cestaTotal())}</b></div><p class="nota-peso">⚖️ Lo que va por kilo se pesa al alistar. Pagás el total exacto, nunca más de lo que llevás.</p></div>
  <div style="text-align:center;margin-top:16px"><button type="button" class="link" data-act="ir" data-v="armar">＋ Seguir agregando</button></div>`;
};

VISTAS.retiro=()=>{
  asegurarRetiro();
  const r=C.retiro,s=suc(r.suc),t=T();
  const opcSuc=sucs().map(x=>{
    const ab=abierta(x),a=asap(x);
    return `<button type="button" class="opt${r.suc===x.k?' on':''}" data-act="suc" data-k="${x.k}"><span class="oi">${x.k==='moravia'?'🏠':'📍'}</span><span class="ot"><strong>${esc(x.n)} · ${esc(x.zona)}</strong><small><span class="${ab?'abierto':'cerrado'}">${ab?'Abierto':'Cerrado'}</span> · ${ab?'cierra '+fh(aFecha(0,hm(x.cierra))):'abre '+fh(aFecha(0,hm(x.abre)))}${a?' · lista '+fh(a):''}</small></span><span class="ok">✓</span></button>`;
  }).join('');
  let cuandoH='';
  if(s){
    const a=asap(s);
    cuandoH=`<div class="opts">
      <button type="button" class="opt${r.modo==='asap'?' on':''}" data-act="cuando" data-v="asap" ${a?'':'disabled'}>${a?'<span class="star" style="right:10px">RECOMENDADO</span>':''}<span class="oi">⚡</span><span class="ot"><strong>Lo antes posible</strong><small>${a?`Lista hoy a las ${fh(a)} (unos ${lead()} min)`:'Hoy ya no da tiempo, programala'}</small></span><span class="ok">✓</span></button>
      <button type="button" class="opt${r.modo==='prog'?' on':''}" data-act="cuando" data-v="prog"><span class="oi">🗓️</span><span class="ot"><strong>Programar</strong><small>${r.modo==='prog'&&horaRetiro()?'Para '+cuando(horaRetiro()):'Elegí día y hora'}</small></span><span class="ok">✓</span></button>
    </div>
    ${r.modo==='prog'?`<div class="card" style="margin-top:10px;padding:12px"><div class="chips">${[0,1,2].map(d=>`<button type="button" class="chip${r.dia===d?' on':''}" data-act="dia" data-d="${d}">${d===0?'Hoy':d===1?'Mañana':aFecha(2,0).toLocaleDateString('es-CR',{weekday:'long'})}</button>`).join('')}</div><div class="slots">${slots(s,r.dia).map(h=>`<button type="button" class="chip${r.hora&&+new Date(r.hora)===+h?' on':''}" data-act="hora" data-h="${h.toISOString()}">${fh(h)}</button>`).join('')||'<span class="sub">Ese día ya no hay horas. Probá otro.</span>'}</div></div>`:''}`;
  }
  const h=horaRetiro();
  return `<h1 class="h1">¿Dónde y cuándo la recogés?</h1><p class="sub">Te avisamos cuando esté lista.</p>
  <section class="sec"><div class="sec-h"><h2 class="h2">Tienda</h2></div><div class="opts">${opcSuc}</div></section>
  <section class="sec"><div class="sec-h"><h2 class="h2">Hora</h2></div>${cuandoH}</section>
  ${t.alCarro?`<section class="sec"><div class="sec-h"><h2 class="h2">¿Cómo la recogés?</h2></div><div class="seg" style="grid-template-columns:1fr 1fr"><button type="button" class="${!r.carro?'on':''}" data-act="carro" data-v="0"><b>🚶</b>Paso adentro</button><button type="button" class="${r.carro?'on':''}" data-act="carro" data-v="1"><b>🚗</b>Me la llevan al carro</button></div>${r.carro?`<input class="inp" id="cnPlaca" style="margin-top:10px" placeholder="Placa o color del carro (opcional)" value="${esc(r.placa)}" autocomplete="off">`:''}</section>`:''}
  ${s&&h?`<div class="contexto"><span class="pill">📍 ${esc(s.n)}</span><span class="pill">🕐 ${esc(cuando(h))}</span><span class="pill o">${r.carro?'🚗 Al carro':'🚶 Adentro'}</span></div>`:''}`;
};

VISTAS.pago=()=>{
  const P=C.perfil,okPerfil=perfilOk(),t=T(),tot=cestaTotal();
  const metodos=Object.entries(N.PAGOS).filter(([k])=>k!=='link'||t.linkTarjeta);
  if(!metodos.some(([k])=>k===C.pago.metodo))C.pago.metodo='sinpe';
  const s=suc(C.retiro.suc),h=horaRetiro();
  const quien=okPerfil&&!C.editPerfil
    ?`<div class="yo"><span class="av">${esc(P.nombre.trim()[0]?.toUpperCase()||'🙂')}</span><div class="t"><strong>${esc(P.nombre)}</strong><small>${esc(fmtTel(P.tel))} · te avisamos aquí</small></div><button type="button" class="link" data-act="edit-perfil">Cambiar</button></div>`
    :`<div class="dos"><label><span class="vh">Nombre</span><input class="inp" id="cnNombre" placeholder="Tu nombre" autocomplete="given-name" value="${esc(P.nombre)}"></label><label><span class="vh">Teléfono</span><input class="inp" id="cnTel" placeholder="Teléfono" inputmode="tel" autocomplete="tel" maxlength="9" value="${esc(P.tel)}"></label></div><div class="err" id="cnPerfilErr"></div>`;
  const ef=C.pago.metodo==='efectivo'?`<div class="card" style="margin-top:10px;padding:12px"><div class="lbl" style="margin-top:0">¿Con cuánto pagás?</div><div class="chips">${[0,...billetes(tot)].map(v=>`<button type="button" class="chip${(+C.pago.conCuanto||0)===v?' on':''}" data-act="con" data-v="${v}">${v?$c(v):'Exacto'}</button>`).join('')}</div></div>`:'';
  return `<h1 class="h1">Último paso</h1><p class="sub">Revisá y confirmá. No pagás nada todavía.</p>
  <section class="sec"><div class="sec-h"><h2 class="h2">¿A nombre de quién?</h2></div>${quien}</section>
  <section class="sec"><div class="sec-h"><h2 class="h2">¿Cómo pagás?</h2><small>Siempre el total exacto</small></div>
    <div class="opts">${metodos.map(([k,m])=>`<button type="button" class="opt${C.pago.metodo===k?' on':''}" data-act="metodo" data-k="${k}">${k==='sinpe'?'<span class="star" style="right:10px">MÁS RÁPIDO</span>':''}<span class="oi">${m.e}</span><span class="ot"><strong>${m.n}</strong><small>${m.txt}</small></span><span class="ok">✓</span></button>`).join('')}</div>${ef}</section>
  <section class="sec"><div class="totales">
    <div class="l"><span>🧺 ${cestaN()} productos</span><button type="button" class="link" data-act="ir" data-v="canasta">Editar</button></div>
    <div class="l"><span>📍 ${esc(sucTxt(s))}</span><button type="button" class="link" data-act="ir" data-v="retiro">Cambiar</button></div>
    <div class="l"><span>🕐 ${h?esc(cuando(h)):'Falta la hora'}${C.retiro.carro?' · 🚗 al carro':''}</span></div>
    <div class="l"><span>${SUST[C.sust].e} Si algo no hay: ${SUST[C.sust].n.toLowerCase()}</span></div>
    <div class="l big"><span>Total aproximado</span><b>${$c(tot)}</b></div>
    <p class="nota-peso">⚖️ Te confirmamos el total exacto al pesar. ${N.PAGOS[C.pago.metodo]?.txt||''}</p></div></section>
  ${N.modo()!=='nube'?`<div class="nube-aviso">💬 Al confirmar, te mostramos un botón para enviarle tu pedido a la tienda por WhatsApp.</div>`:''}`;
};
function billetes(t){
  const out=[];
  [5000,10000,20000,50000].forEach(b=>{const v=Math.ceil(t/b)*b;if(v>t&&!out.includes(v)&&out.length<3)out.push(v);});
  return out;
}
const telDig=t=>String(t||'').replace(/\D/g,'').replace(/^506/,'');
const fmtTel=t=>{const d=telDig(t);return d.length===8?d.slice(0,4)+'-'+d.slice(4):d;};
const perfilOk=()=>C.perfil.nombre.trim().length>=2&&telDig(C.perfil.tel).length===8;

VISTAS.seguimiento=()=>{
  const o=N.get(C.actual);
  if(!o)return `<div class="empty"><b>🧾</b>No encontramos ese pedido en este teléfono.<br><br><button type="button" class="btn btn-p" data-act="ir" data-v="armar">Volver al inicio</button></div>`;
  const s=suc(o.sucursal),E=N.ESTADOS.find(x=>x.k===o.estado),{r,n}=avance(o),t=T();
  const total=N.totalDe(o),aprox=N.esAprox(o);
  const fin=o.estado==='entregado'||o.estado==='cancelado';
  const hero={
    nuevo:['📥','Recibimos tu pedido',N.modo()==='nube'||o.avisado?'La tienda ya lo tiene y empieza a alistarlo.':'Falta un paso: avisale a la tienda (abajo).'],
    alistando:['🧑‍🌾','Alistando tu canasta',`${r} de ${n} productos escogidos`],
    listo:['✅','¡Tu canasta está lista!',`Te espera en ${s?.n||''} · ${cuando(o.retiro.at)}`],
    entregado:['🛍️','¡Que la disfrutés!','Gracias por comprar en '+(t.nombre||'ARAMO')+'.'],
    cancelado:['✖️','Pedido cancelado',o.motivo||''],
  }[o.estado]||['🧺','Tu pedido',''];
  const idx=N.ESTADOS.findIndex(x=>x.k===o.estado);
  const horaDe=k=>{const l=(o.log||[]).filter(x=>x.s===k).pop();return l?fh(l.t):'';};
  return `<div class="estado${fin||o.estado==='listo'?' quieto':''}">
    <div class="estado-ico">${hero[0]}</div><h2>${hero[1]}</h2><p>${esc(hero[2])}</p>
    ${o.estado==='alistando'?`<div class="prog"><i style="width:${n?Math.round(r/n*100):0}%"></i></div>`:''}
    ${o.estado!=='cancelado'?`<div class="tl">${N.ESTADOS.map((x,i)=>`<div class="${i<=idx?'ok':''}${i===idx?' ya':''}">${x.n}<small>${horaDe(x.k)}</small></div>`).join('')}</div>`:''}
  </div>
  ${o.estado==='nuevo'&&!o.avisado&&N.modo()!=='nube'?`<div class="ultimo sec"><h3>💬 Enviale tu pedido a la tienda</h3><p>Un toque y le llega por WhatsApp con todo listo para alistarlo.</p><button type="button" class="btn btn-p btn-w" data-act="wa-enviar">Enviar por WhatsApp</button></div>`:''}
  ${!fin?`<div class="codigo sec"><div class="qr" id="cnQR" aria-label="Código QR de retiro"></div><div><small>Código de retiro</small><div class="pin">${esc(o.pin)}</div><small>Mostralo al recoger${o.retiro.carro?' (te lo llevamos al carro)':''}.</small><span class="ref">Pedido ${esc(o.ref)}</span></div></div>`:''}
  ${pagoHtml(o,total,aprox)}
  <section class="sec"><div class="sec-h"><h2 class="h2">Tu canasta</h2><small>${o.items.length} productos</small></div>
    <div class="card">${o.items.map(it=>{
      const st=it.estado==='listo'?'<span class="it-estado" style="color:var(--g)">✓ Lista</span>':it.estado==='nohay'?'<span class="it-estado" style="color:var(--r)">No hubo</span>':'<span class="it-estado" style="color:var(--mute)">⏳</span>';
      const q=it.qr!=null&&it.qr!==''?+it.qr:it.q;
      return `<div class="fila${it.estado==='nohay'?' nohay':''}"><span class="art">${it.e}</span><div class="t"><strong>${esc(it.n)}</strong><small>${esc(qtxt(q,it.u))}${it.qr!=null&&+it.qr!==+it.q?` (pediste ${esc(qtxt(it.q,it.u))})`:''}${it.mad?' · '+esc(MAD[it.mad]||''):''}${it.sub?' · cambio: '+esc(it.sub):''}</small></div>${o.estado==='nuevo'?'':st}</div>`;}).join('')}</div>
    <div class="totales"><div class="l big"><span>${aprox?'Total aproximado':'Total'}</span><b>${$c(total)}</b></div>${aprox?'<p class="nota-peso">⚖️ El total exacto aparece cuando pesen tus productos.</p>':''}</div>
  </section>
  ${o.estado==='entregado'?`<section class="sec card" style="padding:16px;text-align:center"><h2 class="h2">¿Qué tal estuvo todo?</h2><div class="caritas">${['😍','🙂','😐'].map((c,i)=>`<button type="button" class="${o.rating===3-i?'on':''}" data-act="rating" data-v="${3-i}" aria-label="Calificar ${3-i}">${c}</button>`).join('')}</div><button type="button" class="btn btn-p btn-w" style="margin-top:14px" data-act="repetir" data-id="${o.id}">🔁 Repetir esta canasta</button></section>`:''}
  <section class="sec acciones">
    ${s?`<button type="button" class="btn btn-s" data-act="mapa">🗺️ Cómo llegar</button>`:''}
    <button type="button" class="btn btn-s" data-act="wa-tienda">💬 Escribir a la tienda</button>
    ${o.estado==='nuevo'?`<button type="button" class="btn btn-r" style="grid-column:1/-1" data-act="cancelar">Cancelar pedido</button>`:''}
  </section>
  <div style="text-align:center;margin:18px 0"><button type="button" class="link" data-act="ir" data-v="armar">Volver al inicio</button></div>`;
};
function pagoHtml(o,total,aprox){
  const t=T(),m=o.pago||{},M=N.PAGOS[m.metodo]||N.PAGOS.efectivo;
  if(o.estado==='cancelado')return '';
  if(m.estado==='verificado')return `<div class="paycard sec"><h3>✅ Pago confirmado</h3><p class="sub">${M.n} · ${$c(total)}</p></div>`;
  if(m.metodo==='sinpe'){
    if(m.estado==='reportado')return `<div class="paycard sec"><h3>📲 Pago enviado</h3><p class="sub">Le avisaste a la tienda que pagaste ${$c(total)}. Lo confirman al entregarte la canasta.</p></div>`;
    if(o.estado==='listo'){
      const num=telDig(t.sinpe?.numero);
      return `<div class="paycard sec"><h3>📲 Pagá por SINPE Móvil</h3><div class="monto">${$c(total)}</div>
        ${num?`<div class="copia"><div><small>Número</small>${esc(fmtTel(num))}${t.sinpe?.nombre?` · ${esc(t.sinpe.nombre)}`:''}</div><button type="button" data-act="copiar" data-v="${num}">Copiar</button></div>`:'<p class="sub">La tienda te envía el número por WhatsApp.</p>'}
        <div class="copia"><div><small>Monto</small>${$c(total)}</div><button type="button" data-act="copiar" data-v="${Math.round(total)}">Copiar</button></div>
        <div class="copia"><div><small>Descripción</small>${esc(o.ref)}</div><button type="button" data-act="copiar" data-v="${esc(o.ref)}">Copiar</button></div>
        <div class="acciones" style="margin-top:12px"><button type="button" class="btn btn-p" data-act="ya-pague">Ya pagué</button><button type="button" class="btn btn-s" data-act="comprobante">Enviar comprobante</button></div></div>`;
    }
    return `<div class="paycard sec"><h3>📲 SINPE Móvil</h3><p class="sub">Cuando esté lista te mostramos aquí el monto exacto, ya pesado, para pagar en un toque.</p></div>`;
  }
  if(m.metodo==='link'&&o.estado==='listo'&&t.linkTarjeta)
    return `<div class="paycard sec"><h3>🔗 Pagá con tarjeta</h3><div class="monto">${$c(total)}</div><button type="button" class="btn btn-p btn-w" data-act="link-pago">Abrir pago seguro</button><button type="button" class="link" style="display:block;margin:10px auto 0" data-act="ya-pague">Ya pagué</button></div>`;
  const vuelto=m.metodo==='efectivo'&&+m.conCuanto>total?` Llevás ${$c(m.conCuanto)}: tu vuelto es ${$c(+m.conCuanto-total)}.`:'';
  return `<div class="paycard sec"><h3>${M.e} ${M.n}</h3><p class="sub">${aprox?'Total aproximado':'Total'} ${$c(total)}.${vuelto}</p></div>`;
}

VISTAS.bitacora=()=>{
  const L=misPedidos();
  return `<h1 class="h1">Mis pedidos</h1><p class="sub">Todo lo que pediste desde este teléfono.</p>
  <div class="sec">${L.length?L.map(o=>{const E=N.ESTADOS.find(x=>x.k===o.estado);return `<button type="button" class="bt" data-act="ver" data-id="${o.id}"><span class="pt-art" style="margin:0;width:50px;height:50px">${o.estado==='cancelado'?'✖️':E?.e||'🧺'}</span><span class="t"><strong>${esc(o.ref)} · ${$c(N.totalDe(o))}</strong><small>${esc(fdia(o.created))} · ${(o.items||[]).map(i=>i.e).join('')}</small></span><span class="pill${o.estado==='cancelado'?' r':o.estado==='entregado'?' m':''}">${o.estado==='cancelado'?'Cancelado':E?.n||''}</span></button>`;}).join(''):`<div class="empty"><b>🧾</b>Todavía no has hecho pedidos.</div>`}</div>`;
};

// ══════════════ Pintar ══════════════
function render(anim){
  const m=$('cnMain');
  m.innerHTML=VISTAS[C.vista]?VISTAS[C.vista]():'';
  if(anim){m.classList.remove('fade-in');void m.offsetWidth;m.classList.add('fade-in');}
  renderCiclo();renderBar();renderMisDot();
  if(C.vista==='armar'){refrescarArmar();ligarArmar();}
  if(C.vista==='seguimiento')pintarQR();
  ligarInputs();
}
function refrescar(){
  if(C.vista==='armar'){refrescarArmar();renderBar();renderCiclo();return;}
  const y=window.scrollY;render(false);window.scrollTo(0,y);
}
function renderMisDot(){
  const n=misPedidos().filter(o=>!['entregado','cancelado'].includes(o.estado)).length;
  const d=$('cnMis')?.querySelector('.dot');if(!d)return;
  d.hidden=!n;d.textContent=n;
}
function renderBar(){
  const bar=$('cnBar'),inn=$('cnBarIn'),n=cestaN(),tot=cestaTotal(),v=C.vista;
  let h='';
  const mini=`<button type="button" class="cesta-mini" data-act="ir" data-v="canasta"><span class="cesta-ico" id="cnIco">🧺<em>${n}</em></span><span class="cesta-txt"><strong>${$c(tot)}</strong><small>${cestaItems().map(x=>x.p.e).join(' ')}</small></span></button>`;
  if(v==='armar'&&n)h=mini+`<button type="button" class="btn btn-p" data-act="ir" data-v="canasta">Ver canasta →</button>`;
  else if(v==='canasta'&&n)h=mini+`<button type="button" class="btn btn-p" data-act="ir" data-v="retiro">Elegir retiro →</button>`;
  else if(v==='retiro'&&n)h=`<div class="cesta-txt" style="flex:1"><strong>${horaRetiro()?esc(cuando(horaRetiro())):'Elegí una hora'}</strong><small>${esc(sucTxt(suc(C.retiro.suc)))}</small></div><button type="button" class="btn btn-p" data-act="ir" data-v="pago" ${horaRetiro()?'':'disabled'}>Seguir →</button>`;
  else if(v==='pago'&&n)h=`<button type="button" class="btn btn-p btn-w" data-act="pedir" id="cnPedir" ${perfilOk()&&horaRetiro()?'':'disabled'}>Hacer pedido · ${$c(tot)}</button>`;
  bar.classList.toggle('hide',!h||MINI&&v!=='armar');
  if(h)inn.innerHTML=h;
}
function pintarQR(){
  const el=$('cnQR'),o=N.get(C.actual);if(!el||!o)return;
  if(!window.qrcode){el.innerHTML='<div style="display:grid;place-items:center;height:100%;font-size:40px">🧺</div>';return;}
  const q=window.qrcode(0,'M');q.addData('ARAMO:'+o.ref+':'+o.pin);q.make();
  el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});
}

// ══════════════ Hojas (producto y receta) ══════════════
let H=null;
function abrirHoja(h){
  H=h;pintarHoja();
  $('cnSheet').classList.add('open');$('cnSheetBg').classList.add('open');
  if(!MINI)history.pushState({v:C.vista,id:C.actual,hoja:1},'',location.pathname+location.search);
}
function cerrarHoja(desdeHist){
  if(!H)return;H=null;
  $('cnSheet').classList.remove('open');$('cnSheetBg').classList.remove('open');
  if(!desdeHist&&!MINI)history.back();
}
function pintarHoja(){
  const el=$('cnSheet');if(!H)return;
  if(H.tipo==='prod'){
    const p=prod(H.k),en=!!C.cesta[H.k];
    const rapidos=p.u==='kg'?[.5,1,2,3]:[1,2,3,6,12];
    el.innerHTML=`<div class="sheet-grip"></div><button type="button" class="sheet-x" data-act="h-x" aria-label="Cerrar">✕</button>
      <div style="display:flex;align-items:center;gap:14px;margin-top:6px"><span class="pt-art" style="width:72px;height:72px;font-size:44px;margin:0">${p.e}</span><div><h2 class="h2">${esc(p.n)}</h2><p class="sub">${porU(p)}</p></div></div>
      <div class="big-step"><button type="button" data-act="h-menos" aria-label="Menos">−</button><output>${esc(fq(H.q))}<small>${esc(fu(p.u,H.q))}</small></output><button type="button" data-act="h-mas" aria-label="Más">+</button></div>
      <div class="chips" style="justify-content:center">${rapidos.map(v=>`<button type="button" class="chip${H.q===v?' on':''}" data-act="h-set" data-v="${v}">${esc(qtxt(v,p.u))}</button>`).join('')}</div>
      ${p.mad?`<span class="lbl">¿Para cuándo?</span><div class="chips">${Object.entries(MAD).map(([k,n])=>`<button type="button" class="chip${H.mad===k?' on':''}" data-act="h-mad" data-v="${k}">${n}</button>`).join('')}</div>`:''}
      <span class="lbl">Nota (opcional)</span><input class="inp" id="cnHNota" placeholder="Ej.: grandes, bien rojos…" value="${esc(H.nota)}" autocomplete="off">
      <div style="display:flex;gap:8px;margin-top:18px">${en?`<button type="button" class="btn btn-r" data-act="h-quitar">Quitar</button>`:''}<button type="button" class="btn btn-p" style="flex:1" data-act="h-ok">${en?'Listo':'Agregar'} · ${$c(H.q*p.p)}</button></div>`;
    $('cnHNota').addEventListener('input',e=>{H.nota=e.target.value;});
  }else{
    const r=CFG.recetas.find(x=>x.k===H.k),L=ingredientes(r,H.personas),tot=N.redondear5(L.filter(x=>x.on).reduce((t,x)=>t+x.q*x.p.p,0));
    el.innerHTML=`<div class="rc-hero" style="--c:${r.color}"><span>${r.e}</span></div><button type="button" class="sheet-x" data-act="h-x" aria-label="Cerrar">✕</button>
      <h2 class="h1" style="margin-top:14px">${esc(r.n)}</h2><p class="sub">${esc(r.desc)}</p>
      <span class="lbl">¿Para cuántas personas?</span>
      <div class="gente">${[1,2,3,4,5,6,7,8].map(i=>`<button type="button" class="${i<=H.personas?'on':''}" data-act="h-per" data-v="${i}" aria-label="${i} personas">🧑<small>${i}</small></button>`).join('')}</div>
      <div class="gente-n">${H.personas} ${H.personas===1?'persona':'personas'}</div>
      <span class="lbl">Ingredientes</span>
      <div>${L.map(x=>`<button type="button" class="ing${x.on?' on':''}" data-act="h-ing" data-k="${x.p.k}" ${x.p.agotado?'disabled':''}><span class="ck">${x.on?'✓':''}</span><span class="e">${x.p.e}</span><span class="t"><strong>${esc(x.p.n)}</strong><small>${x.p.agotado?'Agotado hoy':esc(qtxt(x.q,x.p.u))}</small></span><span class="pz">${$c(x.q*x.p.p)}</span></button>`).join('')}</div>
      <button type="button" class="btn btn-p btn-w" style="margin-top:16px" data-act="h-receta" ${L.some(x=>x.on)?'':'disabled'}>Agregar a mi canasta · ${$c(tot)}</button>`;
  }
}
function escalar(p,q4,personas){
  const x=q4*personas/4;
  return p.u==='kg'?Math.max(p.s,Math.ceil(x/p.s-1e-9)*p.s):Math.max(1,Math.ceil(x-1e-9));
}
function ingredientes(r,personas){
  return r.items.map(([k,q4])=>{const p=prod(k);return p?{p,q:escalar(p,q4,personas),on:!p.agotado&&!H?.off?.has(k)}:null;}).filter(Boolean);
}
function costoReceta(r,personas){return N.redondear5(r.items.reduce((t,[k,q4])=>{const p=prod(k);return p&&!p.agotado?t+escalar(p,q4,personas)*p.p:t;},0));}

// ══════════════ Pedido ══════════════
function hacerPedido(){
  if(!perfilOk()){C.editPerfil=true;render(false);toast('Falta tu nombre o teléfono');return;}
  const s=suc(C.retiro.suc),h=horaRetiro();
  if(!s||!h){toast('Elegí dónde y cuándo la recogés');ir('retiro');return;}
  const items=cestaItems().filter(x=>!x.p.agotado);
  if(!items.length){toast('Tu canasta está vacía');ir('armar');return;}
  const o=N.crear({
    id:N.nuevoId(),ref:N.nuevoRef(),pin:N.nuevoPin(),estado:'nuevo',sucursal:s.k,
    cliente:{nombre:C.perfil.nombre.trim(),tel:telDig(C.perfil.tel)},
    retiro:{modo:C.retiro.modo,at:h.toISOString(),carro:!!C.retiro.carro,placa:C.retiro.carro?C.retiro.placa.trim():''},
    pago:{metodo:C.pago.metodo,conCuanto:C.pago.metodo==='efectivo'?+C.pago.conCuanto||0:0,estado:'pendiente'},
    sust:C.sust,nota:C.nota.trim(),
    items:items.map(x=>({k:x.k,n:x.p.n,e:x.p.e,u:x.p.u,q:x.q,p:x.p.p,mad:x.mad||'',nota:x.nota||''})),
    totalEst:cestaTotal(),canal:N.modo(),
  });
  C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];C.cesta={};C.nota='';C.editPerfil=false;guardar();
  C.actual=o.id;estados[o.id]=o.estado;
  fiesta(o.items.map(i=>i.e));buzz([30,40,30]);
  ir('seguimiento');
}
function msgTienda(o){
  const s=suc(o.sucursal),M=N.PAGOS[o.pago.metodo];
  return [
    `🧺 *Pedido ARAMO Canasta · ${o.ref}*`,
    `👤 ${o.cliente.nombre} · ${fmtTel(o.cliente.tel)}`,
    `📍 ${s?.n||''} (${s?.zona||''}) · ${cuando(o.retiro.at)} · ${o.retiro.carro?'🚗 al carro'+(o.retiro.placa?' ('+o.retiro.placa+')':''):'adentro'}`,
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
const estados={};
misPedidos().forEach(o=>{estados[o.id]=o.estado;});
function vigilar(){
  misPedidos().forEach(o=>{
    const antes=estados[o.id];estados[o.id]=o.estado;
    if(!antes||antes===o.estado)return;
    if(o.estado==='listo'){toast('✅ ¡Tu canasta '+o.ref+' está lista!');buzz([90,60,90,60,160]);campana();}
    else if(o.estado==='alistando')toast('🧑‍🌾 Ya están alistando tu canasta');
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
function toast(m){const t=$('cnToast');t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2600);}
function volar(emoji,desde){
  const ico=$('cnIco');
  const a=desde.getBoundingClientRect();
  const s=document.createElement('span');s.className='vuelo';s.textContent=emoji;
  s.style.left=(a.left+a.width/2-15)+'px';s.style.top=(a.top+a.height/2-15)+'px';
  document.body.appendChild(s);
  requestAnimationFrame(()=>{
    const b=($('cnIco')||ico)?.getBoundingClientRect()||{left:innerWidth/2,top:innerHeight-60,width:0,height:0};
    s.style.transform=`translate(${b.left+b.width/2-(a.left+a.width/2)}px,${b.top+b.height/2-(a.top+a.height/2)}px) scale(.4)`;s.style.opacity='.2';
  });
  setTimeout(()=>{s.remove();const i=$('cnIco');if(i){i.classList.remove('bump');void i.offsetWidth;i.classList.add('bump');}},720);
}
function fiesta(emos){
  if(MINI)return;
  const f=document.createElement('div');f.className='fiesta';
  const set=emos?.length?emos:['🍅','🥑','🍌','🥕'];
  for(let i=0;i<26;i++){const s=document.createElement('span');s.textContent=set[i%set.length];s.style.left=Math.random()*100+'%';s.style.animationDelay=(Math.random()*.6)+'s';s.style.fontSize=(22+Math.random()*18)+'px';f.appendChild(s);}
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
  if(!SR){toast('Usá el micrófono 🎤 de tu teclado para dictar');$('cnQ')?.focus();return;}
  if(rec){rec.stop();return;}
  rec=new SR();rec.lang='es-CR';rec.interimResults=false;rec.maxAlternatives=1;
  $('cnMic')?.classList.add('on');
  rec.onresult=e=>{const t=e.results[0][0].transcript;C.q=t;$('cnQ').value=t;procesarLista();};
  rec.onend=()=>{rec=null;$('cnMic')?.classList.remove('on');};
  rec.onerror=()=>{toast('No te escuché bien, probá de nuevo');};
  try{rec.start();}catch{rec=null;$('cnMic')?.classList.remove('on');}
}
function procesarLista(){
  const L=leerLista(C.q);
  if(!L.length||!L.some(x=>x.p)){refrescarArmar();return;}
  C.parse=L;renderParse();
}

// ══════════════ Eventos ══════════════
let _qt=0;
function ligarArmar(){
  const f=$('cnLista'),q=$('cnQ');
  f.addEventListener('submit',e=>{e.preventDefault();C.q=q.value;procesarLista();q.blur();});
  q.addEventListener('input',()=>{C.q=q.value;C.parse=null;clearTimeout(_qt);_qt=setTimeout(refrescarArmar,160);});
  $('cnMic').addEventListener('click',dictar);
}
function ligarInputs(){
  const nota=$('cnNota');if(nota)nota.addEventListener('input',()=>{C.nota=nota.value;guardar();});
  const placa=$('cnPlaca');if(placa)placa.addEventListener('input',()=>{C.retiro.placa=placa.value;guardar();});
  const nom=$('cnNombre'),tel=$('cnTel');
  const chk=()=>{C.perfil.nombre=nom.value;C.perfil.tel=tel.value;guardar();renderBar();const e=$('cnPerfilErr');if(e)e.textContent=tel.value&&telDig(tel.value).length!==8&&tel.value.replace(/\D/g,'').length>=8?'El teléfono debe tener 8 dígitos':'';};
  if(nom&&tel){nom.addEventListener('input',chk);tel.addEventListener('input',chk);}
}
const ACT={
  tile(el){const k=el.dataset.k;if(C.cesta[k])abrirProd(k);else add(k,el);},
  mas(el){const p=prod(el.dataset.k);setQ(p.k,(C.cesta[p.k]?.q||0)+p.s);buzz(6);refrescar();},
  menos(el){const p=prod(el.dataset.k);setQ(p.k,(C.cesta[p.k]?.q||0)-p.s);buzz(6);refrescar();},
  info(el){abrirProd(el.dataset.k);},
  pasillo(el){C.pasillo=el.dataset.k;refrescarArmar();document.getElementById('cnPasillos')?.scrollIntoView({block:'nearest'});},
  receta(el){abrirHoja({tipo:'receta',k:el.dataset.k,personas:C.personas,off:new Set()});},
  'ir-taller'(){$('cnTaller')?.scrollIntoView({behavior:'smooth',block:'start'});},
  'limpiar-q'(){C.q='';C.parse=null;$('cnQ').value='';refrescarArmar();},
  ir(el){ir(el.dataset.v);},
  paso(el){ir(['armar','retiro','pago'][+el.dataset.i]||'armar');},
  ver(el){C.actual=el.dataset.id;ir('seguimiento');},
  repetir(el){
    const o=N.get(el.dataset.id);if(!o)return;let n=0;
    o.items.forEach(i=>{const p=prod(i.k);if(p&&!p.agotado&&i.estado!=='nohay'){C.cesta[i.k]={q:i.q,mad:i.mad||'',nota:i.nota||''};n++;}});
    guardar();toast(n+' productos en tu canasta');ir('canasta');
  },
  'parse-t'(el){const x=C.parse[+el.dataset.i];if(x.p&&!x.p.agotado)x.on=!x.on;renderParse();},
  'parse-no'(){C.parse=null;renderParse();},
  'parse-ok'(){
    const ok=C.parse.filter(x=>x.p&&x.on);
    ok.forEach(x=>{C.cesta[x.p.k]={...(C.cesta[x.p.k]||{}),q:+((C.cesta[x.p.k]?.q||0)+x.q).toFixed(2)};});
    guardar();C.parse=null;C.q='';$('cnQ').value='';
    toast('✨ '+ok.length+' productos agregados');fiesta(ok.map(x=>x.p.e));refrescarArmar();renderBar();renderCiclo();
  },
  sust(el){C.sust=el.dataset.k;guardar();refrescar();},
  suc(el){C.retiro.suc=el.dataset.k;guardar();refrescar();},
  cuando(el){C.retiro.modo=el.dataset.v;asegurarRetiro();guardar();refrescar();},
  dia(el){C.retiro.dia=+el.dataset.d;C.retiro.hora=null;asegurarRetiro();guardar();refrescar();},
  hora(el){C.retiro.hora=el.dataset.h;guardar();refrescar();},
  carro(el){C.retiro.carro=el.dataset.v==='1';guardar();refrescar();},
  metodo(el){C.pago.metodo=el.dataset.k;guardar();refrescar();},
  con(el){C.pago.conCuanto=+el.dataset.v;guardar();refrescar();},
  'edit-perfil'(){C.editPerfil=true;refrescar();$('cnNombre')?.focus();},
  pedir(){hacerPedido();},
  'wa-enviar'(){
    const o=N.get(C.actual);if(!o)return;
    abrir(N.wa(T().whatsapp,msgTienda(o)));
    N.cambiar(o.id,x=>{x.avisado=true;},'cliente','Pedido enviado por WhatsApp').then(()=>refrescar());
  },
  'wa-tienda'(){const o=N.get(C.actual);abrir(N.wa(T().whatsapp,`Hola, sobre mi pedido ${o?.ref||''} de ARAMO Canasta: `));},
  comprobante(){const o=N.get(C.actual);abrir(N.wa(T().whatsapp,`📲 Comprobante SINPE del pedido ${o.ref} por ${$c(N.totalDe(o))} (adjunto la captura).`));},
  'ya-pague'(){N.cambiar(C.actual,o=>{o.pago.estado='reportado';o.pago.reportado=new Date().toISOString();},'cliente','El cliente avisó que pagó').then(()=>{toast('¡Gracias! La tienda lo confirma al entregarte');refrescar();});},
  'link-pago'(){abrir(T().linkTarjeta);},
  mapa(){const o=N.get(C.actual),s=suc(o?.sucursal);abrir('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s?.mapa||s?.n||'ARAMO'));},
  cancelar(){
    const o=N.get(C.actual);if(!o||o.estado!=='nuevo')return;
    if(!confirm('¿Cancelar el pedido '+o.ref+'?'))return;
    N.cambiar(o.id,x=>{if(x.estado==='nuevo'){x.estado='cancelado';x.motivo='Lo canceló el cliente';}},'cliente').then(x=>{
      if(x?.estado!=='cancelado'){toast('Ya lo están alistando; escribile a la tienda');refrescar();return;}
      if(N.modo()!=='nube'&&o.avisado)abrir(N.wa(T().whatsapp,`Hola, cancelo mi pedido ${o.ref}. ¡Gracias!`));
      toast('Pedido cancelado');refrescar();
    });
  },
  rating(el){N.cambiar(C.actual,o=>{o.rating=+el.dataset.v;},'cliente','Calificó con '+el.dataset.v).then(()=>{toast('¡Gracias por contarnos!');refrescar();});},
  copiar(el){copiar(el.dataset.v);},
  // hoja
  'h-x'(){cerrarHoja();},
  'h-mas'(){const p=prod(H.k);H.q=+(H.q+p.s).toFixed(2);pintarHoja();buzz(6);},
  'h-menos'(){const p=prod(H.k);H.q=Math.max(p.s,+(H.q-p.s).toFixed(2));pintarHoja();buzz(6);},
  'h-set'(el){H.q=+el.dataset.v;pintarHoja();},
  'h-mad'(el){H.mad=H.mad===el.dataset.v?'':el.dataset.v;pintarHoja();},
  'h-quitar'(){delete C.cesta[H.k];guardar();cerrarHoja();refrescar();},
  'h-ok'(){const nuevo=!C.cesta[H.k];C.cesta[H.k]={q:H.q,mad:H.mad||'',nota:(H.nota||'').trim()};guardar();cerrarHoja();refrescar();if(nuevo)toast('Agregado a tu canasta');},
  'h-per'(el){H.personas=+el.dataset.v;C.personas=H.personas;guardar();pintarHoja();buzz(5);},
  'h-ing'(el){const k=el.dataset.k;H.off.has(k)?H.off.delete(k):H.off.add(k);pintarHoja();},
  'h-receta'(){
    const r=CFG.recetas.find(x=>x.k===H.k),L=ingredientes(r,H.personas).filter(x=>x.on);
    L.forEach(x=>{C.cesta[x.p.k]={...(C.cesta[x.p.k]||{}),q:+((C.cesta[x.p.k]?.q||0)+x.q).toFixed(2)};});
    guardar();cerrarHoja();fiesta(L.map(x=>x.p.e));toast(`${r.e} ${r.n}: ${L.length} productos a tu canasta`);buzz([20,30,20]);refrescar();
  },
};
function abrirProd(k){const p=prod(k);if(!p)return;const c=C.cesta[k];abrirHoja({tipo:'prod',k,q:c?.q||p.s,mad:c?.mad||'',nota:c?.nota||''});}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
  const f=ACT[el.dataset.act];if(!f)return;
  e.preventDefault();e.stopPropagation();f(el);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&H){cerrarHoja();return;}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[role="button"][data-act]')){e.preventDefault();e.target.click();}
});
$('cnSheetBg').addEventListener('click',()=>cerrarHoja());
$('cnMis').addEventListener('click',()=>ir('bitacora'));

// Tema
function temaActual(){return document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}
function pintarTema(){const d=temaActual()==='dark';$('cnTema').textContent=d?'☀️':'🌙';document.querySelector('meta[name="theme-color"]').content=d?'#0d1310':'#f6f3ea';}
$('cnTema').addEventListener('click',()=>{const t=temaActual()==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('cn_theme',t);}catch{}pintarTema();});
pintarTema();

// ══════════════ Arranque ══════════════
N.on((tipo)=>{
  if(tipo==='tienda'){_cat=null;}
  if(tipo==='encargo'||tipo==='tienda'){vigilar();if(!H)refrescar();else renderMisDot();}
  if(tipo==='modo'&&C.vista==='pago')refrescar();
});
function importarHash(){
  const m=location.hash.match(/^#e=(.+)$/);if(!m)return false;
  const o=N.unpack(m[1]);if(!o?.id)return false;
  N.importar(o);C.mis=[o.id,...C.mis.filter(x=>x!==o.id)];guardar();C.actual=o.id;C.vista='seguimiento';
  if(!estados[o.id])estados[o.id]=N.get(o.id)?.estado;
  vigilar();
  return true;
}
importarHash();
window.addEventListener('hashchange',()=>{if(importarHash()){history.replaceState({v:C.vista,id:C.actual},'',location.pathname+location.search);render(true);window.scrollTo(0,0);}});
if(!MINI){
  history.replaceState({v:C.vista,id:C.actual},'',location.pathname+location.search);
  N.conectar({ids:C.mis});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
render(true);
window.ARAMO_CANASTA_APP={C,leerLista,hacerPedido,ir};
})();
