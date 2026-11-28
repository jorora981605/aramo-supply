/* ══════════════════════════════════════════════════════════════════════
   ARAMO POS celular · Cobrar desde el teléfono (2026-11-26)
   La cara de teléfono del ARAMO POS: se escribe el producto, se pone lo que
   pesa y se sigue con el otro. Usa la MISMA caja, los mismos productos y las
   mismas ventas del ARAMO POS computadora (window.db → pos-web.js →
   pos-main.js): lo que se cobra, se anula o se devuelve aquí aparece en
   Caja, Reportes, Facturación e Inventario de la compu, y sube solo a la nube.
   Los pedidos de La Feria (Mostrador) entran aquí como una cuenta con el
   nombre del cliente (aramo-nube.js, la misma tabla `encargos`).
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const D=document,raiz=D.getElementById('cb'),hojaEl=D.getElementById('cbHoja'),avisoEl=D.getElementById('cbAviso');
if(!raiz||!window.POSWEB)return;
const N=window.AramoNube||null; // pedidos de La Feria / Mostrador
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const ic=(n,t)=>typeof window.icono==='function'?window.icono(n,{t:t||22}):'';
const col=n=>'₡'+Math.round(+n||0).toLocaleString('es-CR');
const num=(n,d)=>(+n||0).toLocaleString('es-CR',{maximumFractionDigits:d??3});
const vib=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch{}};
const p2=n=>String(n).padStart(2,'0');
const hoyISO=d=>{d=d||new Date();return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;};
const hora=s=>{try{const d=new Date(/T/.test(String(s))?s:String(s).replace(' ','T'));return isNaN(d)?'':d.toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});}catch{return '';}};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const raizDe=t=>t.length>3?t.replace(/(es|s)$/,''):t;
const SUCS={moravia:'Moravia',angeles:'Los Ángeles'};
const UNI={kg:{c:'kg',l:'el kilo',por:'por kilo',dec:true},litro:{c:'L',l:'el litro',por:'por litro',dec:true},unidad:{c:'unid.',l:'c/u',por:'cada uno',dec:false}};
const uni=u=>UNI[u]||{c:u||'unid.',l:'c/u',por:'cada uno',dec:false};
const METODOS={efectivo:{n:'Efectivo',i:'efectivo'},sinpe:{n:'SINPE',i:'sinpe'},tarjeta:{n:'Tarjeta',i:'tarjeta'},fiado:{n:'Fiado',i:'libro'},mixto:{n:'En dos partes',i:'efectivo'}};
// teléfono de Costa Rica: 8 números (con o sin 506)
const telLimpio=t=>{const d=String(t||'').replace(/\D/g,'').replace(/^506(?=\d{8}$)/,'');return d.length===8?d:'';};
const telTxt=t=>t?t.slice(0,4)+'-'+t.slice(4):'';
const miDisp=()=>{try{return window.POSWEB.estado().DISP||'';}catch{return '';}};
const miNombre=()=>{try{return window.POSWEB.estado().NOMBRE||'';}catch{return '';}};

// ── Estado ──
const S={suc:null,caja:null,cajero:null,cajeros:[],prods:[],porId:new Map(),promos:[],cfg:{},descMax:100,top:new Map(),
  q:'',porVoz:false,tk:[],act:null,seq:0,cant:null,pago:null,ultima:null,est:{k:''},hoy:null,apert:null,recien:null,
  ventas:[],vdia:'',resumen:null,descs:null,toque:Date.now(),nueva:false,viejo:false,pagando:false,nPedidos:0};
const pila=['venta'];
const vista=()=>pila[pila.length-1];

// ── Dibujo de cada producto: su foto de La Feria o un emoji ──
const EMO=[['repollo','🥬'],['lechuga','🥬'],['espinaca','🥬'],['acelga','🥬'],['mostaza','🥬'],['tomate','🍅'],['zanahoria','🥕'],['papaya','🥭'],['papa','🥔'],['cebolla','🧅'],['cebollin','🧅'],['ajo','🧄'],
  ['chile','🌶️'],['limon','🍋'],['naranja','🍊'],['mandarina','🍊'],['toronja','🍊'],['banano','🍌'],['platano','🍌'],['guineo','🍌'],['pina','🍍'],['sandia','🍉'],['melon','🍈'],['manzana','🍎'],['uva','🍇'],
  ['fresa','🍓'],['mora','🍇'],['aguacate','🥑'],['pepino','🥒'],['zucchini','🥒'],['zukini','🥒'],['chayote','🥒'],['brocoli','🥦'],['coliflor','🥦'],['elote','🌽'],['maiz','🌽'],['mango','🥭'],['manga','🥭'],
  ['coco','🥥'],['pipa','🥥'],['kiwi','🥝'],['pera','🍐'],['durazno','🍑'],['melocoton','🍑'],['ciruela','🍑'],['cereza','🍒'],['berenjena','🍆'],['hongo','🍄'],['huevo','🥚'],['camote','🍠'],['yuca','🍠'],
  ['name','🍠'],['tiquizque','🍠'],['nampi','🍠'],['remolacha','🍠'],['arracache','🍠'],['culantro','🌿'],['perejil','🌿'],['apio','🌿'],['albahaca','🌿'],['hierba','🌿'],['hierbabuena','🌿'],['romero','🌿'],['oregano','🌿'],
  ['tomillo','🌿'],['menta','🌿'],['jengibre','🌱'],['vainica','🌱'],['rabano','🌱'],['leche','🥛'],['natilla','🥛'],['queso','🧀'],['pan','🍞'],['tortilla','🌮'],['arroz','🍚'],['frijol','🌰'],['mani','🥜'],['miel','🍯'],
  ['jugo','🥤'],['agua','💧'],['ayote','🎃'],['calabaza','🎃'],['maracuya','🍈'],['granadilla','🍈'],['guanabana','🍈'],['guayaba','🍈'],['cas','🍈'],['cafe','☕'],['azucar','🍬'],['galleta','🍪'],['envio','🛵']]
  .sort((a,b)=>b[0].length-a[0].length);
const EMO_CAT={frutas:'🍎',verduras:'🥬',hierbas:'🌿',raices:'🥔',citricos:'🍋',lacteos:'🥛',granos:'🌾',despensa:'🧺',otros:'🧺'};
function emojiDe(n,cat){
  const w=n.split(' ').map(raizDe);
  for(const [k,e] of EMO){const r=raizDe(k);if(k.length<=3?w.includes(r)||w.includes(k):w.some(x=>x.startsWith(r)))return e;}
  return EMO_CAT[norm(cat)]||'🧺';
}
const COLORES=/\b(morad|verde|roj|amarill|blanc|negr|rosad)/;
function fotoDe(n){
  const F=window.ARAMO_FOTOS||{},de=k=>F[k]&&F[k].f?'../'+F[k].f:'';
  let f=de(n.replace(/ /g,'_'));if(f)return f;
  if(COLORES.test(n))return ''; // un repollo morado no se dibuja con la foto del verde
  const w=n.split(' ');
  return (w.length>1&&de(w.slice(0,2).join('_')))||de(w[0])||de(w[0].replace(/s$/,''))||de(w[0].replace(/es$/,''))||'';
}
function plato(p,clase){
  const c=/^#[0-9a-f]{3,8}$/i.test(p._col||'')?p._col:'#4CAF50';
  return `<span class="cb-plato ${clase||''}" style="--c:${c}">${p._f?`<img src="${esc(p._f)}" alt="" decoding="async">`:`<i>${esc(p._e||'🧺')}</i>`}</span>`;
}
// como suena: «repoyo» = «repollo», «sanaoria» = «zanahoria», «bainica» = «vainica»
const fon=s=>s.replace(/ll/g,'y').replace(/v/g,'b').replace(/z/g,'s').replace(/c(?=[ei])/g,'s').replace(/qu/g,'k').replace(/c/g,'k').replace(/h/g,'').replace(/(.)\1/g,'$1');
function preparar(p){p._n=norm(p.nombre);p._fo=fon(p._n);p._c=norm(p.codigo);p._e=p.emoji||emojiDe(p._n,p.categoria_nombre);p._f=fotoDe(p._n);p._col=p.categoria_color||'#4CAF50';return p;}

// ── Promociones (las mismas reglas del POS) ──
function promoDe(p){
  if(!p.id)return null;const h=hoyISO();
  return S.promos.find(n=>n.activo&&(n.producto_id===p.id||n.producto_id==null)&&(!n.fecha_inicio||String(n.fecha_inicio).slice(0,10)<=h)&&(!n.fecha_fin||String(n.fecha_fin).slice(0,10)>=h))||null;
}
function precioDe(p){
  const pr=promoDe(p),b=+p.precio||0;
  if(!pr)return{pf:b,id:null,txt:''};
  if(pr.tipo==='porcentaje')return{pf:b*(1-pr.valor/100),id:pr.id,txt:`${pr.nombre} -${pr.valor}%`};
  if(pr.tipo==='precio_especial')return{pf:+pr.precio_especial||0,id:pr.id,txt:pr.nombre};
  if(pr.tipo==='2x1')return{pf:b,id:pr.id,txt:`${pr.nombre} (2x1)`};
  return{pf:b,id:pr.id,txt:''};
}
function precioTxt(p){
  const {pf}=precioDe(p);
  if(!(pf>0))return '<em class="cb-sinp">Sin precio</em>';
  return `${col(pf)} <i>${uni(p.unidad).l}</i>${pf<p.precio?` <s>${col(p.precio)}</s>`:''}`;
}

// ── Las cuentas abiertas (una por cliente) ──
const idNuevo=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function cuentaNueva(){S.seq=S.tk.length?S.seq+1:1;const t={id:idNuevo(),k:S.seq,n:'',tel:'',items:[],desc:null,pedido:null};S.tk.push(t);S.act=t.id;return t;}
function tk(){return S.tk.find(t=>t.id===S.act)||S.tk[0]||cuentaNueva();}
const nombreTk=t=>t.n||('Cliente '+t.k);
function totalDe(t){
  const neto=t.items.reduce((s,i)=>s+i.sub,0),d=t.desc;let rebajo=0,pct=0;
  if(d&&+d.valor>0){if(d.tipo==='pct'){pct=Math.min(100,+d.valor);rebajo=Math.round(neto*pct/100);}else rebajo=Math.min(Math.round(+d.valor),neto);}
  return{n:t.items.length,neto,rebajo,pct,total:neto-rebajo,bruto:t.items.reduce((s,i)=>s+Math.round(i.pu*i.q),0)};
}
const descTxt=T=>`−${col(T.rebajo)}${T.pct?` (${num(T.pct,1)} %)`:''}`;
function guardar(){LS.set('aramo_cobrar_'+S.suc,{tk:S.tk,act:S.act,seq:S.seq});}
function recuperar(){
  const g=LS.get('aramo_cobrar_'+S.suc,null);
  if(g&&Array.isArray(g.tk)){
    S.tk=g.tk.filter(t=>t&&Array.isArray(t.items)).map(t=>{if(t.rebajo&&!t.desc)t.desc={tipo:'monto',valor:+t.rebajo};delete t.rebajo;t.tel=t.tel||'';t.pedido=t.pedido||null;t.desc=t.desc||null;return t;});
    S.act=g.act;S.seq=+g.seq||S.tk.length;
  }
  if(!S.tk.length)cuentaNueva();
  if(!S.tk.some(t=>t.id===S.act))S.act=S.tk[0].id;
}
const lineaTxt=i=>uni(i.u).dec?`${num(i.q)} ${uni(i.u).c} × ${col(i.pc)}`:`${num(i.q)} × ${col(i.pc)}`;
const cantTxt=(q,u)=>uni(u).dec?`${num(q)} ${uni(u).c}`:`${num(q)} ×`;

// ── Buscar ──
function lev(a,b,max){
  if(Math.abs(a.length-b.length)>max)return max+1;
  let ant=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const f=[i];let min=i;for(let j=1;j<=b.length;j++){f[j]=Math.min(ant[j]+1,f[j-1]+1,ant[j-1]+(a[i-1]===b[j-1]?0:1));if(f[j]<min)min=f[j];}if(min>max)return max+1;ant=f;}
  return ant[b.length];
}
function buscar(q){
  const nq=norm(q),t=nq.split(' ').filter(Boolean).map(raizDe);if(!t.length)return[];
  const tf=t.map(fon),sale=[];
  for(const p of S.prods){
    let ok=true,sc=0;
    for(let n=0;n<t.length;n++){
      const k=t[n];let i=p._n.indexOf(k);
      if(i>=0){sc+=i===0?6:p._n[i-1]===' '?3:1;continue;}
      i=p._fo.indexOf(tf[n]);
      if(i>=0){sc+=i===0?4:p._fo[i-1]===' '?2:.5;continue;}
      if(p._c&&p._c.includes(k)){sc+=2;continue;}
      ok=false;break;
    }
    if(!ok)continue;
    if(p._n===nq)sc+=10;
    sc+=Math.min(4,Math.log2(1+(S.top.get(p.id)||0)))-p._n.length/200; // lo que más se vende, de primero
    sale.push([sc,p]);
  }
  if(!sale.length){ // nadie escribe perfecto con prisa: se perdona una letra (dos si la palabra es larga)
    for(const p of S.prods){
      const w=p._fo.split(' ').map(raizDe);let ok=true,sc=0;
      for(const k of tf){
        if(p._fo.includes(k))continue;
        if(k.length<4){ok=false;break;}
        const max=k.length>=7?2:1;let m=9;for(const x of w){const d=lev(k,x.slice(0,k.length+1),max);if(d<m)m=d;}
        if(m>max){ok=false;break;}sc-=m;
      }
      if(ok)sale.push([sc,p]);
    }
  }
  sale.sort((a,b)=>b[0]-a[0]||a[1].nombre.localeCompare(b[1].nombre,'es'));
  return sale.slice(0,30).map(x=>x[1]);
}

// ── Avisos y hojas ──
let tAviso=0;
function aviso(m,ms){avisoEl.textContent=m;avisoEl.classList.add('on');clearTimeout(tAviso);tAviso=setTimeout(()=>avisoEl.classList.remove('on'),ms||3200);}
let hojaRes=null,hojaTecla=null,hojaClick=null;
function abrirHoja(html,o){
  o=o||{};
  if(!hojaEl.hidden){const r=hojaRes;hojaRes=null;r&&r(undefined);}
  hojaEl.innerHTML=`<div class="cb-velo" data-h="cerrar"></div><div class="cb-hoja-c${o.clase?' '+o.clase:''}" role="dialog" aria-modal="true"><button type="button" class="cb-hoja-x" data-h="cerrar" aria-label="Cerrar">${ic('cerrar',20)}</button>${html}</div>`;
  hojaEl.hidden=false;hojaTecla=o.tecla||null;hojaClick=o.click||null;
  return new Promise(r=>{hojaRes=r;});
}
function cerrarHoja(v){if(hojaEl.hidden)return;hojaEl.hidden=true;hojaEl.innerHTML='';const r=hojaRes;hojaRes=null;hojaTecla=null;hojaClick=null;r&&r(v);}
function teclado(o){
  o=o||{};const esp=o.plata?'000':o.coma===false?'':',';
  return ['1','2','3','4','5','6','7','8','9',esp,'0','b'].map(x=>x===''?'<span></span>':`<button type="button" class="cb-tecla${x==='b'?' cb-tecla--b':''}${x==='000'?' cb-tecla--ch':''}" data-k="${x}" aria-label="${x==='b'?'Borrar':x===','?'Coma':x}">${x==='b'?ic('retroceso',26):x}</button>`).join('');
}
function pedirMonto(o){
  let raw=o.inicial?String(Math.round(o.inicial)):'',fresco=!!raw;
  const pinta=()=>{const n=hojaEl.querySelector('#cbHN'),b=hojaEl.querySelector('[data-h="ok"]');if(n)n.textContent=(+raw||0).toLocaleString('es-CR');if(b)b.disabled=!(+raw>0)&&!o.cero;};
  const p=abrirHoja(`<h2 class="cb-hoja-t">${esc(o.titulo)}</h2>${o.sub?`<p class="cb-hoja-s">${esc(o.sub)}</p>`:''}
    <div class="cb-visor ch"><div class="cb-visor-n"><small>₡</small><span id="cbHN">0</span></div></div>
    <div class="cb-teclas">${teclado({plata:true})}</div>
    <button type="button" class="cb-principal" data-h="ok"><span>${esc(o.ok||'Listo')}</span></button>`,{
    tecla(k){if(fresco){raw='';fresco=false;}if(k==='b')raw=raw.slice(0,-1);else if(/^\d+$/.test(k)&&(raw+k).length<=7&&!(raw===''&&/^0+$/.test(k)))raw+=k;pinta();},
    click(a){if(a==='ok'&&(+raw>0||o.cero))cerrarHoja(+raw||0);}});
  pinta();return p;
}
function pedirPin(o){
  let pin='',ocupado=false;
  const pinta=mal=>{const d=hojaEl.querySelector('#cbPin');if(d){d.innerHTML=[0,1,2,3].map(i=>`<i class="${i<pin.length?'on':''}"></i>`).join('');d.classList.toggle('mal',!!mal);}};
  const p=abrirHoja(`<h2 class="cb-hoja-t">${esc(o.titulo)}</h2><p class="cb-hoja-s" id="cbPinS">${esc(o.sub||'Poné el PIN de 4 números')}</p>
    <div class="cb-pin" id="cbPin"></div><div class="cb-teclas">${teclado({coma:false})}</div>`,{
    async tecla(k){
      if(ocupado)return;
      if(k==='b')pin=pin.slice(0,-1);else if(/^\d$/.test(k)&&pin.length<4)pin+=k;
      pinta();
      if(pin.length===4){ocupado=true;let r=null;try{r=await o.verificar(pin);}catch{}ocupado=false;
        if(r)return cerrarHoja(r);
        pin='';pinta(true);vib(60);const s=hojaEl.querySelector('#cbPinS');if(s)s.textContent='Ese PIN no es. Probá otra vez.';}
    }});
  pinta();return p;
}
function pedirTexto(o){
  const p=abrirHoja(`<h2 class="cb-hoja-t">${esc(o.titulo)}</h2>${o.sub?`<p class="cb-hoja-s">${esc(o.sub)}</p>`:''}
    <input class="cb-campo" id="cbTxt" type="${o.tipo||'text'}" ${o.tipo==='tel'?'inputmode="numeric"':''} maxlength="${o.max||40}" value="${esc(o.valor||'')}" placeholder="${esc(o.pista||'')}" autocomplete="off" enterkeyhint="done">
    <button type="button" class="cb-principal" data-h="ok"><span>${esc(o.ok||'Listo')}</span></button>`,{click(a){if(a==='ok')cerrarHoja(hojaEl.querySelector('#cbTxt').value.trim());}});
  const i=hojaEl.querySelector('#cbTxt');i.focus();i.select();i.addEventListener('keydown',e=>{if(e.key==='Enter')cerrarHoja(i.value.trim());});
  return p;
}
function preguntar(o){
  return abrirHoja(`<h2 class="cb-hoja-t">${esc(o.titulo)}</h2>${o.texto?`<p class="cb-hoja-s">${esc(o.texto)}</p>`:''}
    <div class="cb-hoja-bot">${o.opciones.map((x,i)=>`<button type="button" class="${i===0&&!o.lista?'cb-principal':'cb-segundo'}${x.mal?' cb-mal':''}" data-h="op" data-i="${i}"><span>${esc(x.n)}</span></button>`).join('')}</div>`,
    {click(a,el){if(a==='op')cerrarHoja(o.opciones[+el.dataset.i].v);}});
}

// ── La nube y la caja (lo lleva pos-web.js; aquí solo se muestra) ──
function pw(a){
  const pill=D.getElementById('pwPill'),menu=D.getElementById('pwMenu');if(!pill||!menu)return false;
  menu.hidden=true;pill.click();
  const b=menu.querySelector(`[data-pw="${a}"]`);if(!b){menu.hidden=true;return false;}
  b.click();return true;
}
function salir(){if(!pw('salir'))location.href='../APP.html';}
function tomarCaja(){if(!pw('usar'))location.reload();}
function leerEstado(){
  let e;try{e=window.POSWEB.estado();}catch{return;}
  const k=e.compartida?'comp':e.soloLectura?'lee':e.offline?'off':e.sucio?'sube':'ok',d=e.info&&e.info.dueno_nombre||'';
  // la copia nueva la trae pos-web.js por detrás (evento pos-base-nueva): ya no hace falta recargar
  S.viejo=false;
  if(k===S.est.k&&d===S.est.d)return;
  const era=S.est.k;S.est={k,d};
  if(vista()==='abrir'&&(era==='lee')!==(k==='lee')&&hojaEl.hidden)pintar();else pintarEstado();
  if(vista()==='venta'&&(era==='lee')!==(k==='lee'))pintarDock();
}
const EST={ok:['En vivo','Todo guardado en la nube'],sube:['Guardando','Subiendo a la nube…'],off:['Sin internet','Queda guardado aquí y sube al volver'],lee:['Solo mirando','La caja está en otro aparato'],comp:['En vivo','Cobra junto con la caja']};
function pintarEstado(){
  const el=D.getElementById('cbEstado');
  if(el){const k=S.est.k||'ok';el.className='cb-estado '+(k==='comp'?'ok':k);el.innerHTML=`<b>${esc(SUCS[S.suc]||'ARAMO')}</b><span><i></i>${EST[k][0]}${k==='comp'?' · con '+esc(S.est.d||'la compu'):''}</span>`;el.title=k==='comp'?'Este teléfono cobra; la caja la lleva '+(S.est.d||'otro aparato')+' y todo se junta solo':EST[k][1];}
  const al=D.getElementById('cbAlerta');
  if(al)al.innerHTML=S.est.k==='lee'?`<div class="cb-alerta"><div><b>La caja está en ${esc(S.est.d||'otro aparato')}</b><small>Aquí ves todo al día. Para cobrar desde este teléfono, pasala para acá.</small></div><button type="button" class="cb-alerta-b" data-a="tomar">Cobrar aquí</button></div>`:'';
  const n=D.getElementById('cbListoNube');
  if(n&&S.ultima&&S.ultima.v&&S.ultima.v.pendiente)n.innerHTML=`${ic('reloj',16)} Quedó en la fila: se anota en la caja apenas responda`;
  else if(n&&S.ultima&&S.est.k==='comp')n.innerHTML=`${ic('nube',16)} Anotada en la caja de ${esc(S.est.d||'la compu')} · ya sale allá`;
  else if(n&&S.ultima)n.innerHTML=S.est.k==='ok'?`${ic('nube',16)} Guardada en la nube · ya sale en el POS computadora`:S.est.k==='off'?`${ic('aviso',16)} Guardada en este teléfono. Sube sola cuando vuelva el internet.`:`${ic('reloj',16)} Subiendo a la nube…`;
}
function barra(o){
  return `<header class="cb-barra">${o.izq||'<span></span>'}<div class="cb-estado" id="cbEstado"></div>${o.der||'<span class="cb-hueco"></span>'}</header>`;
}
const bVolver=t=>`<button type="button" class="cb-pastilla" data-a="volver">${ic('atras',20)}<span>${t||'Volver'}</span></button>`;

// ══════════════ Pantallas ══════════════
const VOZ=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
const V={},DESPUES={};

// 1 · La pantalla de cobrar: el buscador grande, la cuenta y el total. Nada más.
V.venta=()=>barra({izq:`<button type="button" class="cb-pastilla" data-a="salir" aria-label="Volver al inicio de ARAMO">${ic('inicio',20)}<span>Inicio</span></button>`,
    der:`<button type="button" class="cb-redondo" data-a="mas" aria-label="Más opciones">${ic('menu',22)}</button>`})+
  `<div class="cb-cuerpo" id="cbCuerpo">
    <div id="cbAlerta"></div>
    <div id="cbPedidos"></div>
    <div class="cb-cuentas" id="cbCuentas"></div>
    <div class="cb-busca" id="cbBusca"><span class="cb-busca-ic">${ic('buscar',26)}</span>
      <input id="cbQ" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="¿Qué producto?" value="${esc(S.q)}" aria-label="Escribí el producto">
      <button type="button" class="cb-busca-x" data-a="limpiar" aria-label="Borrar lo escrito" ${S.q?'':'hidden'}>${ic('cerrar',20)}</button>
      ${VOZ?`<button type="button" class="cb-busca-mic" data-a="voz" aria-label="Decir el producto">${ic('microfono',24)}</button>`:''}</div>
    <div id="cbRes"></div>
  </div>
  <footer class="cb-dock" id="cbDock"></footer>`;
DESPUES.venta=()=>{pintarPedidos();pintarCuentas();pintarRes();pintarDock();};
function pintarCuentas(){
  const el=D.getElementById('cbCuentas');if(!el)return;
  if(S.tk.length<2&&!tk().items.length){el.innerHTML='';return;}
  el.innerHTML=S.tk.map(t=>{const T=totalDe(t);return `<button type="button" class="cb-cta${t.id===S.act?' on':''}" data-a="cta" data-id="${t.id}">${t.pedido?ic('canasta',16):''}<b>${esc(nombreTk(t))}</b>${T.n?`<span>${col(T.total)}</span>`:''}${t.id===S.act?ic('editar',14):''}</button>`;}).join('')+
    (S.tk.length<6?`<button type="button" class="cb-cta mas" data-a="cta-nueva">${ic('mas',16)}<span>Otra cuenta</span></button>`:'');
}
function hoyHtml(grande){
  const h=S.hoy||{n:0,total:0};
  if(grande)return `<button type="button" class="cb-hero cb-hero--b" data-a="ventas"><span class="cb-hero-quien quieto">Hoy en ${esc(SUCS[S.suc]||'')}</span><span class="cb-hero-n">${col(h.total)}</span>
    <span class="cb-hero-s">${h.n?`${h.n} ${h.n===1?'venta':'ventas'}${h.desc?` · descuentos ${col(h.desc)}`:''} · ver todas`:'Todavía no hay ventas hoy'}</span><span class="cb-hero-ir">${ic('siguiente',20)}</span></button>`;
  return h.n?`<button type="button" class="cb-hoy" data-a="ventas">${ic('grafico',18)}<span>Hoy van <b>${h.n}</b> ${h.n===1?'venta':'ventas'} · <b>${col(h.total)}</b></span>${ic('siguiente',16)}</button>`:'';
}
function pintarRes(){
  const el=D.getElementById('cbRes');if(!el)return;
  const x=D.querySelector('.cb-busca-x');if(x)x.hidden=!S.q;
  if(S.q.trim()){
    const r=buscar(S.q);
    el.innerHTML=(r.length?`<div class="cb-filas">${r.map(p=>`<button type="button" class="cb-fila" data-a="prod" data-id="${p.id}">${plato(p,'ch')}<span class="cb-fila-t"><b>${esc(p.nombre)}</b><small>${precioTxt(p)}</small></span><span class="cb-fila-go">${ic('siguiente',20)}</span></button>`).join('')}</div>`
      :`<p class="cb-vacio">No encontré «${esc(S.q.trim())}».</p>`)+
      `<button type="button" class="cb-suelto" data-a="suelto">${ic('mas',18)}<span>Cobrar «${esc(S.q.trim())}» como producto suelto</span></button>`;
    return;
  }
  const t=tk(),T=totalDe(t);
  if(!T.n){
    el.innerHTML=(t.pedido||t.n?cabeceraCuenta(t,T):'')+hoyHtml(true)+`<p class="cb-guia">Tocá <b>¿Qué producto?</b>, escribí el nombre y poné la cantidad. Todo queda guardado solo en el ARAMO POS.</p>`;
    return;
  }
  const rec=S.recien;S.recien=null;
  el.innerHTML=cabeceraCuenta(t,T)+
    `<div class="cb-lista">${[...t.items].reverse().map(i=>`<button type="button" class="cb-item${i.id===rec?' nuevo':''}${!(i.pc>0)?' falta':''}" data-a="item" data-id="${i.id}">${plato({_f:i.f,_e:i.e,_col:i.col},'ch')}<span class="cb-item-t"><b>${esc(i.n)}</b><small>${i.pc>0?lineaTxt(i):'Falta el precio · tocá aquí'}${i.promo_txt?` · ${esc(i.promo_txt)}`:''}</small></span><span class="cb-item-m">${col(i.sub)}</span></button>`).join('')}</div>`+
    (T.rebajo?`<button type="button" class="cb-desc-linea" data-a="descuento"><span>Descuento</span><b>${descTxt(T)}</b></button>`:'')+hoyHtml(false);
}
function cabeceraCuenta(t,T){
  const p=t.pedido;
  return `<div class="cb-cab"><button type="button" class="cb-cab-n" data-a="cliente"><b>${esc(nombreTk(t))}</b>${t.tel?`<small>${telTxt(t.tel)}</small>`:''}${ic('editar',15)}</button>
    <span class="cb-cab-c">${T.n} ${T.n===1?'producto':'productos'}</span>${T.n||t.pedido||t.n?`<button type="button" class="cb-cab-v" data-a="vaciar" aria-label="Vaciar esta cuenta">${ic('borrar',18)}</button>`:''}</div>`+
    (p&&estadoPedido(t)?`<div class="cb-ped-alerta"><div><b>${avisoPed(t)[0]}</b><small>${avisoPed(t)[1]}</small></div><div class="cb-ped-alerta-b">${estadoPedido(t)==='otro'?'<button type="button" class="cb-alerta-b" data-a="retomar">Traerlo aquí</button>':''}<button type="button" class="cb-alerta-b gris" data-a="vaciar">Quitar</button></div></div>`:'')+
    (p?`<div class="cb-ped-info${!estadoPedido(t)?' cot-'+cotEstado(t):''}">${ic('canasta',18)}<span>Pedido de La Feria <b>${esc(p.ref||'')}</b>${p.envio?' · a domicilio':p.cuando?' · recoge '+hora(p.cuando):''}${p.pago&&METODOS[p.pago]?' · paga con '+METODOS[p.pago].n.toLowerCase():''}${estadoPedido(t)?'.':cotNota(t)}</span></div>`:'');
}
function pintarDock(){
  const el=D.getElementById('cbDock');if(!el)return;
  const T=totalDe(tk());
  const t=tk(),st=t.pedido&&!estadoPedido(t)?cotEstado(t):'cobrar',nom=esc(String(nombreTk(t)).split(' ')[0]);
  el.innerHTML=!T.n?'':st==='mandar'?`<button type="button" class="cb-principal cb-b-cobrar cb-b-mandar" data-a="cot-mandar"><span class="cb-pila"><small>Mandarle el total nuevo a ${nom}</small><b>${col(T.total)}</b></span><i>${ic('flecha',20)}</i></button>`
    :st==='esperando'?`<button type="button" class="cb-principal cb-b-cobrar cb-b-espera" data-a="cot-espera"><span class="cb-pila"><small>Esperando que ${nom} confirme</small><b>${col(T.total)}</b></span><i>${ic('reloj',20)}</i></button>`
    :`<button type="button" class="cb-principal cb-b-cobrar" data-a="cobrar"><span class="cb-pila"><small>Cobrar · ${T.n} ${T.n===1?'producto':'productos'}</small><b>${col(T.total)}</b></span><i>${ic('flecha',20)}</i></button>`;
}
function repintarVenta(){if(vista()!=='venta')return;const t=tk();if(t&&t.pedido&&!estadoPedido(t)&&sincEnvio(t))guardar();pintarPedidos();pintarCuentas();pintarRes();pintarDock();}

// ── Pedidos de La Feria que llegan al Mostrador: un toque los acepta y arma la cuenta con el nombre ──
function pedidos(){
  if(!N||!S.suc)return[];
  const lim=Date.now()-3*864e5,enCuenta=new Set(S.tk.map(t=>t.pedido&&t.pedido.id).filter(Boolean));
  let l=[];try{l=N.lista();}catch{}
  const yo=miDisp();
  return l.filter(o=>o&&o.sucursal===S.suc&&!o.cobro&&['nuevo','alistando','listo'].includes(o.estado)&&!enCuenta.has(o.id)&&(Date.parse(o.created||0)||0)>lim
      &&!(o.enCaja&&o.enCaja.disp&&o.enCaja.disp!==yo))
    .sort((a,b)=>(a.estado==='nuevo'?0:1)-(b.estado==='nuevo'?0:1)||(Date.parse(a.created)||0)-(Date.parse(b.created)||0));
}
function pintarPedidos(){
  const el=D.getElementById('cbPedidos');if(!el)return;
  const l=pedidos();
  el.innerHTML=l.slice(0,4).map(o=>{
    const nuevo=o.estado==='nuevo',n=(o.items||[]).filter(i=>i.estado!=='nohay').length,tot=N.totalDe?N.totalDe(o):0;
    return `<div class="cb-ped${nuevo?' nuevo':''}"><span class="cb-ped-ic">${ic('canasta',22)}</span><div class="cb-ped-t"><b>${nuevo?'Pedido nuevo':'Pedido'} de ${esc(o.cliente&&o.cliente.nombre||'un cliente')}</b>
      <small>La Feria ${esc(o.ref||'')} · ${n} ${n===1?'producto':'productos'}${tot?' · '+col(tot):''}${o.retiro&&o.retiro.envio?' · a domicilio':o.retiro&&o.retiro.at?' · recoge '+hora(o.retiro.at):''}</small></div>
      <button type="button" class="cb-ped-b" data-a="ped-aceptar" data-id="${esc(o.id)}">${nuevo?'Aceptar':'Abrir'}</button></div>`;
  }).join('');
  const nuevos=l.filter(o=>o.estado==='nuevo').length;
  if(nuevos>S.nPedidos)vib([30,60,30,60,60]);
  S.nPedidos=nuevos;
}
// Una línea de la cuenta para un producto del pedido. El precio es el que vio el cliente en La Feria (si se cambia, el cliente
// confirma el total nuevo antes de cobrar); el del POS solo si el pedido no trae precio. El producto del POS igual queda unido.
function lineaDePedido(it){
  if(it.estado==='nohay')return null;
  const q=Math.round((+(it.qr!=null&&it.qr!==''?it.qr:it.q)||0)*1000)/1000;if(!(q>0))return null;
  const u=it.u==='kg'?'kg':/^unid/i.test(it.u||'')?'unidad':(it.u||'unidad');
  const p=S.prods.find(x=>x._n===norm(it.n)&&x.unidad===u&&+x.precio>0)||null,pOrd=+(it.pr!=null&&it.pr!==''?it.pr:it.p)||0,pr=p&&!(pOrd>0)?precioDe(p):null;
  const pc=pOrd>0?pOrd:(pr?pr.pf:0);
  const pp=p||preparar({id:null,nombre:it.n||'Producto',precio:pc,unidad:u,emoji:it.e||'',categoria_color:'#9E9E9E'});
  return{id:idNuevo(),pid:p?p.id:null,n:pp.nombre,e:pp._e,f:pp._f,col:pp._col,u,ti:+(p&&p.tasa_impuesto)||0,pu:pr?+p.precio:pc,pf:pc,pc,q,sub:Math.round(pc*q),
    promo_id:pr?pr.id:null,promo_txt:pr?pr.txt:'',gen:p?0:1,cabys:'',ped:it.k||it.n,pedQ:+it.q||0};
}
function cuentaDePedido(o){
  const c=o.cliente||{};
  const t={id:idNuevo(),k:0,n:String(c.nombre||'').trim().slice(0,40),tel:telLimpio(c.tel),items:[],desc:null,
    pedido:{id:o.id,ref:o.ref||'',cuando:o.retiro&&o.retiro.at||'',envio:!!(o.retiro&&o.retiro.envio),pago:o.pago&&o.pago.metodo||'',cambioVisto:o.ultimoCambio&&o.ultimoCambio.at||''}};
  for(const it of o.items||[]){const l=lineaDePedido(it);if(l)t.items.push(l);}
  const envio=+(o.retiro&&o.retiro.envio&&o.retiro.envio.costo)||0;
  if(envio>0)t.items.push({id:idNuevo(),pid:null,n:'Envío',e:'🛵',f:'',col:'#9E9E9E',u:'unidad',ti:0,pu:envio,pf:envio,pc:envio,q:1,sub:Math.round(envio),promo_id:null,promo_txt:'',gen:1,cabys:'',ped:'__envio'});
  if(o.premio&&+o.premio.valor>0)t.desc={tipo:'monto',valor:+o.premio.valor};
  const vacia=S.tk.find(x=>!x.items.length&&!x.n&&!x.pedido); // la cuenta vacía se aprovecha
  if(vacia){t.k=vacia.k;S.tk[S.tk.indexOf(vacia)]=t;}else{S.seq=S.tk.length?S.seq+1:1;t.k=S.seq;S.tk.push(t);}
  return t;
}
// Si el cliente cambia su pedido en La Feria (agrega, quita o cambia cantidades) mientras está en una cuenta de aquí,
// la cuenta se pone al día sola: lo nuevo entra, lo que quitó sale, lo que cambió queda con la cantidad nueva (hay que pesarlo),
// y el teléfono dice qué cambió (pedQ = la cantidad que pedía el cliente cuando se armó la línea). Lo agregado aquí en el POS (sin producto del pedido) se queda.
function sincCambiosCliente(){
  if(!N)return false;let algo=false;
  for(const t of S.tk){
    if(!t.pedido||estadoPedido(t))continue;
    const o=N.get(t.pedido.id),uc=o&&o.ultimoCambio;
    if(!uc||!uc.at||uc.at===t.pedido.cambioVisto)continue;
    t.pedido.cambioVisto=uc.at;algo=true;
    const claves=new Set((o.items||[]).map(it=>it.k||it.n));
    t.items=t.items.filter(l=>!l.ped||l.ped==='__envio'||claves.has(l.ped));
    for(const it of o.items||[]){
      const k=it.k||it.n,l=t.items.find(x=>x.ped===k);
      if(!l){const nl=lineaDePedido(it);if(nl){const env=t.items.findIndex(x=>x.ped==='__envio');if(env>=0)t.items.splice(env,0,nl);else t.items.push(nl);}continue;}
      if(l.pedQ!=null&&Math.abs((+it.q||0)-l.pedQ)>1e-9){const q=Math.round((+it.q||0)*1000)/1000;l.pedQ=+it.q||0;if(q>0){l.q=q;l.sub=Math.round(l.pc*q);}} // el cliente cambió la cantidad: hay que volver a pesarlo
    }
    sincEnvio(t);
    vib([60,40,60]);aviso(`✏️ ${nombreTk(t)} cambió su pedido: ${(uc.lineas||[]).slice(0,3).join(' · ')||'revisalo'}`,7000);
  }
  if(algo)guardar();
  return algo;
}
const marcaCaja=()=>({donde:'POS celular',disp:miDisp(),n:miNombre(),at:new Date().toISOString()});
async function aceptarPedido(id){
  if(!N)return;
  let o=(await N.refrescarPedido(id).catch(()=>null))||N.get(id);if(!o)return;
  if(o.cobro){aviso('Ese pedido ya se cobró en el Mostrador');pintarPedidos();return;}
  if(o.estado==='cancelado'||o.estado==='entregado'){aviso('Ese pedido ya no está pendiente');pintarPedidos();return;}
  if(o.enCaja&&o.enCaja.disp&&o.enCaja.disp!==miDisp()){
    const si=await preguntar({titulo:'Ese pedido ya lo tiene otro aparato',texto:`Lo tomó ${o.enCaja.n||'otro aparato'} a las ${hora(o.enCaja.at)}. Si lo pasás aquí, allá ya no se cobra.`,opciones:[{n:'Pasarlo a este teléfono',v:true},{n:'Dejarlo allá',v:false}]});
    if(!si)return;
  }
  const nuevo=o.estado==='nuevo';
  try{o=await N.cambiar(id,x=>{if(x.estado==='nuevo'){x.estado='alistando';x.fase='recibido';}x.enCaja=marcaCaja();},'tienda',nuevo?'La tienda recibió el pedido · se cobra en el ARAMO POS celular':'Pasó al ARAMO POS celular para pesarlo y cobrarlo')||o;}catch(e){console.warn(e);}
  const t=cuentaDePedido(o);S.act=t.id;S.q='';guardar();vib([20,40,20]);
  if(vista()!=='venta'){pila.length=1;pintar('atras');}else{const i=D.getElementById('cbQ');if(i)i.value='';repintarVenta();}
  aviso(`Pedido aceptado. La cuenta de ${nombreTk(t)} ya está armada.`,4200);
}
// Lo que pasó con el pedido de una cuenta mientras tanto: null = sigue aquí, listo para cobrar
function estadoPedido(t){
  if(!N||!t||!t.pedido)return null;
  const o=N.get(t.pedido.id);
  if(!o)return null;
  if(o.cobro)return 'cobrado';
  if(o.estado==='cancelado')return 'cancelado';
  if(o.estado==='entregado')return 'entregado';
  if(!o.enCaja||o.enCaja.disp!==miDisp())return 'otro';
  return null;
}
const AVISO_PED={cobrado:['Este pedido ya se cobró en el Mostrador','Quitá esta cuenta: así no se cobra dos veces.'],
  entregado:['Este pedido ya se entregó','Quitá esta cuenta: así no se cobra dos veces.'],
  cancelado:['El cliente canceló este pedido','Podés quitar la cuenta o cobrarla como una venta normal.'],
  otro:['El Mostrador se trajo este pedido','Ahora se cobra allá. Si lo vas a cobrar aquí, traelo de vuelta.']};
function avisoPed(t){
  const e=estadoPedido(t),o=N&&t.pedido?N.get(t.pedido.id):null;
  if(e==='cancelado'&&o&&o.rechazo&&o.rechazo.por==='cliente')return ['El cliente no aceptó el total nuevo',(o.rechazo.motivo?'Dijo: «'+o.rechazo.motivo+'». ':'')+'Quitá la cuenta, o cobrala como venta normal si te dice que sí.'];
  return AVISO_PED[e];
}
// ── El total nuevo de un pedido (pos-cotizacion.js): si cambió el peso, el precio o algún producto, el cliente lo confirma antes de cobrar ──
const COT=window.PosCotizacion||null;
const lineasDe=t=>t.items.filter(i=>i.ped!=='__envio').map(i=>({k:i.ped||'',n:i.n,q:i.q,p:i.pc,u:i.u==='kg'?'kg':'unid',pid:i.pid,e:i.e,_i:i}));
function cotEstado(t){
  if(!COT||!N||!t||!t.pedido)return 'cobrar';
  const o=N.get(t.pedido.id);if(!o)return 'cobrar';
  return COT.estado(o,lineasDe(t));
}
// el envío del pedido (el costo del Uber puede llegar después) va igual en la cuenta
function sincEnvio(t){
  if(!N||!t||!t.pedido)return false;
  const o=N.get(t.pedido.id);if(!o)return false;
  const c=Math.round(+(o.retiro&&o.retiro.envio&&o.retiro.envio.costo)||0),l=t.items.find(i=>i.ped==='__envio');
  if(l&&c>0&&l.pc!==c){l.pu=l.pf=l.pc=c;l.sub=c;return true;}
  if(!l&&c>0){t.items.push({id:idNuevo(),pid:null,n:'Envío',e:'🛵',f:'',col:'#9E9E9E',u:'unidad',ti:0,pu:c,pf:c,pc:c,q:1,sub:c,promo_id:null,promo_txt:'',gen:1,cabys:'',ped:'__envio'});return true;}
  return false;
}
function cotNota(t){
  const st=cotEstado(t),o=N&&t.pedido?N.get(t.pedido.id):null,c=COT&&o?COT.confirmado(o):null;
  if(st==='mandar')return '. <b>Cambió lo que pidió:</b> mandale el total nuevo y se cobra cuando lo confirme.';
  if(st==='esperando')return '. Le mandamos el total nuevo: se cobra cuando lo confirme en La Feria o te diga que sí.';
  if(c)return `. <b>${c.por==='cliente'?'Confirmó':'Te dijo que sí a'} ${col(c.total)}</b>: ya se puede cobrar.`;
  return '. Pesá cada producto. Si cambia el peso o el precio, el cliente confirma el total antes de cobrar.';
}
// cuando el cliente confirma (en La Feria), el teléfono lo dice
function avisoConfirmados(){
  if(!COT||!N)return;S.cotUlt=S.cotUlt||{};
  for(const t of S.tk){
    if(!t.pedido)continue;const st=cotEstado(t),antes=S.cotUlt[t.id];S.cotUlt[t.id]=st;
    if(antes==='esperando'&&st==='cobrar'){const c=COT.confirmado(N.get(t.pedido.id));if(c){vib([40,60,40,60,80]);aviso(`✅ ${nombreTk(t)} confirmó ${col(c.total)}: ya se puede cobrar`,6000);}}
  }
}
// Justo antes de cobrar: el pedido tiene que seguir libre (nadie lo cobró en otro lado)
async function pedidoLibre(t){
  if(!N||!t.pedido)return true;
  await N.refrescarPedido(t.pedido.id).catch(()=>null);
  if(sincCambiosCliente()){repintarVenta();return false;} // el cliente cambió algo: primero se ve qué
  const e=estadoPedido(t);
  if(!e)return true;
  if(e==='cobrado'||e==='entregado'){aviso(AVISO_PED[e][0]+'. No se cobra dos veces.',5200);repintarVenta();return false;}
  if(e==='cancelado'){
    const si=await preguntar({titulo:AVISO_PED.cancelado[0],texto:'¿Lo cobrás igual como una venta normal?',opciones:[{n:'Cobrarlo como venta normal',v:true},{n:'No',v:false}]});
    if(!si)return false;t.pedido=null;guardar();return true;
  }
  const si=await preguntar({titulo:AVISO_PED.otro[0],texto:'Si lo cobrás aquí, allá ya no se puede cobrar.',opciones:[{n:'Cobrarlo aquí',v:true},{n:'No',v:false}]});
  if(!si)return false;
  await N.cambiar(t.pedido.id,x=>{x.enCaja=marcaCaja();},'tienda','Volvió al ARAMO POS celular para cobrarlo').catch(()=>null);
  return !estadoPedido(t);
}
async function soltarPedido(t,nota){
  if(!N||!t||!t.pedido)return;
  const yo=miDisp();
  await N.cambiar(t.pedido.id,x=>{if(x.enCaja&&x.enCaja.disp===yo)delete x.enCaja;},'tienda',nota||'Volvió al Mostrador').catch(()=>null);
}
// Un pedido que se abrió desde el Mostrador («Pesarlo y cobrarlo en el POS celular»)
function abrirPedidoUrl(){const id=S.pedidoUrl;S.pedidoUrl=null;if(!id||!N)return;if(S.tk.some(t=>t.pedido&&t.pedido.id===id)){const t=S.tk.find(x=>x.pedido&&x.pedido.id===id);S.act=t.id;guardar();repintarVenta();return;}if(N.get(id))aceptarPedido(id);else aviso('Ese pedido no está en este aparato');}
// Al cobrar la cuenta de un pedido, el pedido queda cobrado (y entregado si lo recogen) en La Feria y en el Mostrador.
async function cerrarPedido(t,v,d){
  if(!N||!t.pedido)return;
  const metodo=d.metodo_pago==='mixto'?'efectivo':d.metodo_pago,fecha=new Date().toISOString();
  await N.cambiar(t.pedido.id,x=>{
    (x.items||[]).forEach(it=>{
      if(it.estado==='nohay')return;
      const l=t.items.find(i=>i.ped===(it.k||it.n));
      if(l){it.qr=l.q;it.pr=l.pc;it.estado='listo';}else it.estado='nohay'; // lo que se quitó de la cuenta no había
    });
    x.cobro={metodo,total:v.total,recibido:d.monto_recibido,vuelto:d.cambio,fecha,venta:v.numero||null,sucursal:x.sucursal,porPOS:true};
    x.pago=x.pago||{};x.pago.estado='verificado';x.totalFinal=v.total;delete x.enCaja;
    if(x.retiro&&x.retiro.envio){if(x.estado!=='entregado')x.estado='listo';}
    else{x.estado='entregado';x.fase='entregado';x.entregado=fecha;}
  },'tienda',`Cobrado ${col(v.total)} (${(METODOS[d.metodo_pago]||{n:d.metodo_pago}).n})${v.numero?' · '+v.numero:''} · ARAMO POS celular`);
}

// 2 · ¿Cuánto? (solo el número, grande)
function abrirCant(p,it){
  const pr=it?null:precioDe(p),dec=uni(p.unidad).dec;
  S.cant={p,it:it||null,raw:it?String(it.q).replace('.',','):(dec?'':'1'),fresco:!!it||!dec,modo:'peso',g:null,
    pu:it?it.pu:+p.precio||0,pf:it?it.pf:pr.pf,pc:it?it.pc:pr.pf,promo_id:it?it.promo_id:pr.id,promo_txt:it?it.promo_txt:pr.txt};
  ir('cantidad');
  if(!(S.cant.pc>0))cambiarPrecio(true);
}
function calc(c){
  const n=parseFloat(String(c.raw||'').replace(',','.'))||0,u=c.p.unidad;
  if(c.modo==='plata'){const sub=Math.round(n),q=c.pc>0?Math.round(sub/c.pc*10000)/10000:0;return{n,q,sub,g:false,ok:q>0&&sub>0};}
  const g=u==='kg'&&(c.g===true||(c.g===null&&!String(c.raw).includes(',')&&n>=50));
  const q=Math.round((g?n/1000:n)*1000)/1000;
  return{n,q,sub:Math.round(c.pc*q),g,ok:q>0&&q<=9999&&c.pc>0};
}
V.cantidad=()=>{
  const c=S.cant,p=c.p;
  return barra({izq:bVolver('Volver'),der:c.it?`<button type="button" class="cb-pastilla cb-mal" data-a="quitar">${ic('borrar',18)}<span>Quitar</span></button>`:''})+
  `<div class="cb-cant">
    <div class="cb-cant-p">${plato(p,'gr')}<div class="cb-cant-pt"><h1 class="cb-cant-n">${esc(p.nombre)}</h1><button type="button" class="cb-precio" data-a="precio" id="cbPrecio"></button></div></div>
    <div class="cb-visor" id="cbVisor"></div>
    <div id="cbBascula"></div>
    <div class="cb-modos" id="cbModos"></div>
    <div class="cb-teclas" id="cbTeclas">${teclado()}</div>
    <button type="button" class="cb-principal" data-a="cant-ok" id="cbCantOk"><span>${c.it?'Guardar':'Listo'}</span><i>${ic(c.it?'ok':'flecha',20)}</i></button>
  </div>`;
};
DESPUES.cantidad=()=>{pintarCant();pintarBascula();aplicarBascula();};
function pintarCant(){
  const c=S.cant;if(!c)return;const p=c.p,u=uni(p.unidad),r=calc(c),v=D.getElementById('cbVisor');if(!v)return;
  const pre=D.getElementById('cbPrecio');
  if(pre)pre.innerHTML=c.pc>0?`${col(c.pc)} <i>${u.l}</i>${c.promo_txt?` <em>${esc(c.promo_txt)}</em>`:''}${ic('editar',14)}`:`Poner el precio ${ic('editar',14)}`;
  const vacio=!c.raw,txt=c.raw?(c.modo==='plata'?(+c.raw||0).toLocaleString('es-CR'):c.raw.replace(/^(\d+)/,m=>(+m).toLocaleString('es-CR'))):'0';
  const uTxt=c.modo==='plata'?'':r.g?'g':p.unidad==='unidad'?(r.n===1?'unidad':'unidades'):u.c;
  const abajo=c.modo==='plata'?(r.ok?`${num(r.q)} ${u.c}`:`¿Cuánta plata quiere llevar?`)
    :r.ok?`<b>${col(r.sub)}</b>${r.g?`<i>${num(r.q)} kg</i>`:''}`:(u.dec?'Poné lo que marca la pesa':'¿Cuántos lleva?');
  v.className='cb-visor'+(vacio?' vacio':'')+(c.fresco&&!vacio?' fresco':'')+(c.desdeBascula?' bascula':'');
  v.innerHTML=`<div class="cb-visor-n">${c.modo==='plata'?'<small>₡</small>':''}<span>${esc(txt)}</span>${uTxt?`<small>${uTxt}</small>`:''}</div><div class="cb-visor-s">${abajo}</div>`;
  const m=D.getElementById('cbModos');
  if(m){
    const ops=p.unidad==='kg'?[['kg','Kilos'],['g','Gramos'],['plata','Por plata']]:u.dec?[['kg',u.c==='L'?'Litros':'Cantidad'],['plata','Por plata']]:[];
    const on=c.modo==='plata'?'plata':r.g?'g':'kg';
    m.innerHTML=ops.map(([k,n])=>`<button type="button" class="cb-modo${k===on?' on':''}" data-a="modo" data-k="${k}">${n}</button>`).join('');
    m.hidden=!ops.length;
  }
  const com=D.querySelector('#cbTeclas [data-k=","]');if(com)com.disabled=c.modo==='plata';
  const ok=D.getElementById('cbCantOk');if(ok)ok.disabled=!r.ok;
}
function teclaCant(k){
  const c=S.cant;if(!c)return;
  c.manual=true;c.desdeBascula=false; // si alguien escribe, la báscula ya no lo cambia
  let r=c.fresco?'':c.raw;c.fresco=false;
  if(k==='b')r=r.slice(0,-1);
  else if(k===','){if(c.modo==='plata'||r.includes(','))return;r=(r||'0')+',';}
  else{
    if(r==='0')r='';
    const pa=r.split(',');
    if(pa.length>1?pa[1].length>=3:pa[0].length>=(c.modo==='plata'?6:4))return vib(30);
    r+=k;
  }
  c.raw=r;pintarCant();
}
async function cambiarPrecio(obligado){
  const c=S.cant;if(!c)return;const p=c.p,u=uni(p.unidad);
  if(!obligado&&!puede('editar_precios_carrito')){aviso('Solo un administrador puede cambiar el precio');return;}
  const n=await pedirMonto({titulo:c.pc>0?'¿A cómo está hoy?':`¿A cómo está ${p.nombre}?`,sub:`Colones ${u.por}`,inicial:c.pc>0?c.pc:0,ok:'Listo'});
  if(!S.cant||S.cant!==c)return;
  if(!n){if(!(c.pc>0))volver();return;}
  let fijo=!(p.precio>0)&&!!p.id;
  if(!fijo&&p.id&&n!==p.precio)fijo=await preguntar({titulo:`${p.nombre} a ${col(n)} ${u.l}`,texto:'¿Queda así de ahora en adelante o es solo para esta venta?',opciones:[{n:'Solo esta venta',v:false},{n:'Dejar este precio',v:true}]});
  if(!S.cant||S.cant!==c)return;
  if(fijo){
    try{await guardarPrecio(p,n);c.pu=n;c.promo_id=null;c.promo_txt='';aviso(`${p.nombre}: precio guardado en el POS`);}
    catch(e){if(!errorCaja(e))aviso('No se pudo guardar el precio');}
  }
  c.pc=c.pf=n;if(n>c.pu)c.pu=n;
  pintarCant();
}
async function guardarPrecio(p,n){
  const f=await window.db.productos.obtener(p.id);if(!f)throw new Error('producto');
  await window.db.productos.actualizar(p.id,{codigo:f.codigo,nombre:f.nombre,descripcion:f.descripcion,precio:n,costo:f.costo,stock:f.stock,stock_minimo:f.stock_minimo,unidad:f.unidad,tasa_impuesto:f.tasa_impuesto,categoria_id:f.categoria_id,codigo_cabys:f.codigo_cabys,emoji:f.emoji});
  p.precio=n;window.POSWEB.subir();
}
function listoCant(){
  const c=S.cant;if(!c)return;const r=calc(c);if(!r.ok)return vib(30);
  const t=tk(),p=c.p;let it=c.it;
  if(it)Object.assign(it,{q:r.q,sub:r.sub,pc:c.pc,pf:c.pf,pu:c.pu});
  else{
    const igual=!uni(p.unidad).dec&&p.id?t.items.find(i=>i.pid===p.id&&i.pc===c.pc&&!i.gen):null;
    if(igual){igual.q=Math.round((igual.q+r.q)*1000)/1000;igual.sub=Math.round(igual.pc*igual.q);it=igual;t.items=t.items.filter(x=>x!==it).concat(it);}
    else{
      it={id:idNuevo(),pid:p.id||null,n:p.nombre,e:p._e,f:p._f,col:p._col,u:p.unidad,ti:+p.tasa_impuesto||0,pu:c.pu,pf:c.pf,pc:c.pc,q:r.q,sub:r.sub,promo_id:c.promo_id,promo_txt:c.promo_txt,gen:p.gen?1:0,cabys:p.codigo_cabys||''};
      t.items.push(it);
    }
  }
  guardar();vib(14);
  const editando=!!c.it,porVoz=S.porVoz;S.cant=null;S.q='';S.porVoz=false;S.recien=it.id;
  volver();
  // el buscador queda listo para el producto que sigue (el teclado vuelve solo)
  if(!editando&&!porVoz&&vista()==='venta'){const i=D.getElementById('cbQ');if(i)i.focus();}
}
function elegir(p){if(!p)return;abrirCant(p,null);}
async function productoSuelto(){
  const n0=S.q.trim();
  const n=await pedirTexto({titulo:'Producto suelto',sub:'Algo que no está en la lista. ¿Cómo se llama?',valor:n0,pista:'Ej. Bolsa de hielo',ok:'Seguir'});
  if(!n)return;
  const porKilo=await preguntar({titulo:`¿Cómo se vende ${n}?`,opciones:[{n:'Por unidad',v:false},{n:'Por kilo',v:true}]});
  if(porKilo===undefined)return;
  const pr=await pedirMonto({titulo:`¿A cómo está ${n}?`,sub:porKilo?'Colones por kilo':'Colones cada uno',ok:'Seguir'});
  if(!pr)return;
  abrirCant(preparar({id:null,nombre:n,precio:pr,unidad:porKilo?'kg':'unidad',tasa_impuesto:0,gen:1,categoria_color:'#9E9E9E'}),null);
}

// La báscula: el peso entra solo al visor cuando se queda quieta (si nadie escribió a mano)
const BA=window.Bascula||null;
const usaBascula=()=>!!(BA&&BA.soportada()&&S.cant&&S.cant.p.unidad==='kg'&&S.cant.modo!=='plata');
function pintarBascula(){
  const el=D.getElementById('cbBascula');if(!el)return;
  if(!usaBascula()){el.innerHTML='';return;}
  const e=BA.estado(),kg=e.kg!=null?num(e.kg)+' kg':'';
  el.innerHTML=e.estado==='lista'||e.estado==='callada'?`<div class="cb-bascula on${e.estable?' quieta':''}">${ic('balanza',20)}<span><b>${e.estado==='callada'?'La báscula no manda nada':'Báscula'}</b><small>${e.estado==='callada'?'Revisá que esté encendida':e.estable?'Peso listo':'Esperando que se quede quieta…'}</small></span><b class="cb-bascula-kg">${esc(kg)}</b></div>`
    :e.estado==='conectando'?`<div class="cb-bascula">${ic('balanza',20)}<span><b>Conectando la báscula…</b></span></div>`
    :`<button type="button" class="cb-bascula boton" data-a="bascula">${ic('balanza',20)}<span><b>${e.estado==='perdida'?'La báscula se desconectó':'Conectar la báscula'}</b><small>${e.estado==='perdida'?'Tocá para volver a conectarla':'Y el peso entra solo'}</small></span>${ic('siguiente',18)}</button>`;
}
function aplicarBascula(){
  const c=S.cant;if(!c||!usaBascula()||c.manual)return;
  const e=BA.estado();if(e.estado!=='lista'||!e.estable||!(e.kg>0))return;
  const raw=String(e.kg).replace('.',',');
  if(c.raw===raw&&c.desdeBascula)return;
  c.raw=raw;c.g=false;c.fresco=true;c.desdeBascula=true;vib(8);pintarCant(); // fresco: si se escribe encima, reemplaza
}
if(BA)BA.on(()=>{if(vista()==='cantidad'){pintarBascula();aplicarBascula();}});
async function conectarBascula(){
  if(!BA||!BA.soportada()){aviso('Este navegador no puede conectar básculas. En Android usá Chrome.',5000);return;}
  const f=BA.formas();
  let via='bluetooth';
  if(f.bluetooth&&f.serie)via=await preguntar({titulo:'¿Cómo se conecta la báscula?',texto:'Si tiene un adaptador Bluetooth nuevo (BLE), escogé Bluetooth. Si está emparejada en los ajustes del teléfono o con cable, escogé la otra.',lista:true,opciones:[{n:'Bluetooth',v:'bluetooth'},{n:'Emparejada o con cable',v:'serie'}]});
  else if(f.serie)via='serie';
  if(!via)return;
  const ok=await BA.conectar(via);
  if(ok)aviso('Báscula conectada: el peso entra solo');else if(BA.estado().error)aviso('No se pudo conectar: '+BA.estado().error,5000);
  pintarBascula();aplicarBascula();
}
async function menuBascula(){
  const e=BA?BA.estado():{estado:'nada'};
  if(e.estado!=='lista'&&e.estado!=='callada'){await conectarBascula();return;}
  const r=await abrirHoja(`<h2 class="cb-hoja-t">Báscula</h2><p class="cb-hoja-s">${esc(e.nombre||'')} · ${esc(e.via||'')}${e.kg!=null?' · ahora marca '+num(e.kg)+' kg':''}</p>${e.ultimo?`<p class="cb-nota">Lo último que mandó: <b>${esc(e.ultimo)}</b></p>`:''}
    <div class="cb-hoja-bot"><button type="button" class="cb-segundo cb-mal" data-h="quitar"><span>Desconectar la báscula</span></button></div>`,{click(a){cerrarHoja(a);}});
  if(r==='quitar'){await BA.desconectar();aviso('Báscula desconectada');}
}

// 3 · Cobrar: cliente, descuento y cómo paga
function billetes(total){
  const s=new Set();
  for(const m of [1000,2000,5000,10000,20000]){const v=Math.ceil(total/m)*m;if(v>total)s.add(v);}
  return [...s].sort((a,b)=>a-b).slice(0,4);
}
// A quién se le hace el SINPE: la misma lista del POS computadora (Configuración → Sistema)
function destinos(){
  let l=[];try{const a=JSON.parse(S.cfg.sinpe_destinos||'[]');if(Array.isArray(a))l=a.filter(x=>x&&(x.nombre||x.tel)).map(x=>({nombre:String(x.nombre||'').trim(),tel:String(x.tel||'').trim()}));}catch{}
  if(!l.length&&S.cfg.sinpe_numero)l=[{nombre:'Tienda',tel:String(S.cfg.sinpe_numero).trim()}];
  return l.map(x=>({...x,label:x.tel?`${x.nombre||'SINPE'} · ${x.tel}`:x.nombre}));
}
function abrirCobro(){
  const t=tk(),T=totalDe(t);if(!T.n)return;
  if(S.est.k==='lee'){pedirCaja();return;}
  if(t.pedido){pedidoLibre(t).then(ok=>{if(!ok)return;const st=cotEstado(t);if(st==='mandar')return ACC['cot-mandar']();if(st==='esperando')return ACC['cot-espera']();abrirCobroYa();});return;}
  abrirCobroYa();
}
function abrirCobroYa(){
  const t=tk();
  const sinPrecio=t.items.find(i=>!(i.pc>0));
  if(sinPrecio){aviso(`Falta el precio de ${sinPrecio.n}`);ACC.item({dataset:{id:sinPrecio.id}});return;}
  const ds=destinos();let ult='';try{ult=localStorage.getItem('pos_sinpe_ultimo')||'';}catch{}
  let metodo=t.pedido&&METODOS[t.pedido.pago]?t.pedido.pago:LS.get('aramo_cobrar_metodo','efectivo');
  if(!METODOS[metodo]||metodo==='mixto')metodo='efectivo';
  S.debeDe=null; // lo que debe el cliente se vuelve a leer cada vez que se abre el cobro
  S.pago={metodo,recibido:0,destino:(ds.find(d=>d.label===ult)||ds[0]||{}).label||'',parte:null};
  if(vista()==='cobrar')pintar();else ir('cobrar');
}
V.cobrar=()=>{
  const t=tk(),T=totalDe(t);
  return barra({izq:bVolver('Volver')})+
  `<div class="cb-cuerpo">
    <div class="cb-hero"><div class="cb-hero-quien quieto">A cobrar</div><div class="cb-hero-n">${col(T.total)}</div>
      <div class="cb-hero-s">${T.n} ${T.n===1?'producto':'productos'}${T.rebajo?` · ${col(T.neto)} menos ${col(T.rebajo)} de descuento`:''}</div></div>
    <div class="cb-ops">
      <button type="button" class="cb-op" data-a="cliente">${ic('clientes',22)}<span><small>Cliente</small><b>${t.n||t.tel?esc([t.n,telTxt(t.tel)].filter(Boolean).join(' · ')):'Nombre y teléfono'}</b></span>${ic('siguiente',18)}</button>
      <button type="button" class="cb-op${T.rebajo?' on':''}" data-a="descuento">${ic('precio',22)}<span><small>Descuento</small><b>${T.rebajo?descTxt(T):'Hacer un descuento'}</b></span>${ic('siguiente',18)}</button>
    </div>
    <h2 class="cb-h2">¿Cómo paga?</h2>
    <div class="cb-metodos" id="cbMetodos"></div>
    <div id="cbPanel"></div>
    <button type="button" class="cb-enlace" data-a="partes">${ic('mas',16)} Paga en dos partes</button>
  </div>
  <footer class="cb-dock"><button type="button" class="cb-principal" data-a="pagar" id="cbPagar"><span>Listo, cobrado</span><i>${ic('ok',20)}</i></button></footer>`;
};
DESPUES.cobrar=pintarPago;
function sinpeHtml(P){
  const ds=destinos(),propio=P.destino&&!ds.some(d=>d.label===P.destino);
  return `<div class="cb-sinpe"><h3 class="cb-h3">¿A quién le hacen el SINPE?</h3><div class="cb-dest">${ds.map(d=>`<button type="button" class="cb-dest-b${d.label===P.destino?' on':''}" data-a="destino" data-l="${esc(d.label)}"><small>${esc(d.nombre||'SINPE')}</small><b>${esc(d.tel||d.nombre||'')}</b></button>`).join('')}
    ${propio?`<button type="button" class="cb-dest-b on" data-a="destino" data-l="${esc(P.destino)}"><small>Solo esta venta</small><b>${esc(P.destino)}</b></button>`:''}
    <button type="button" class="cb-dest-b mas" data-a="destino-nuevo">${ic('mas',18)}<b>Otra persona</b></button></div>
    ${!ds.length&&!propio?'<p class="cb-nota">Todavía no hay nadie registrado para recibir SINPE. Tocá <b>Otra persona</b> y anotá a quién se lo hicieron: queda en la venta.</p>':''}</div>`;
}
function pintarPago(){
  const P=S.pago,T=totalDe(tk()),me=D.getElementById('cbMetodos'),pa=D.getElementById('cbPanel');if(!P||!me||!pa)return;
  me.innerHTML=['efectivo','sinpe','tarjeta','fiado'].map(k=>`<button type="button" class="cb-metodo ${k}${P.metodo===k&&!P.parte?' on':''}" data-a="metodo" data-k="${k}" aria-pressed="${P.metodo===k&&!P.parte}">${ic(METODOS[k].i,26)}<b>${METODOS[k].n}</b></button>`).join('');
  let h='';
  if(P.parte){
    const resto=T.total-P.parte.efectivo;
    h=`<div class="cb-partes"><div><small>En efectivo</small><b>${col(P.parte.efectivo)}</b></div><i>+</i><div><small>${P.parte.otro==='sinpe'?'Por SINPE':'Con tarjeta'}</small><b>${col(resto)}</b></div><button type="button" class="cb-redondo ch" data-a="parte-quitar" aria-label="Quitar el pago en dos partes">${ic('cerrar',18)}</button></div>${P.parte.otro==='sinpe'?sinpeHtml(P):''}`;
  }else if(P.metodo==='efectivo'){
    const v=P.recibido>T.total?P.recibido-T.total:0,bs=billetes(T.total);
    h=`<h3 class="cb-h3">¿Con cuánto paga?</h3><div class="cb-billetes"><button type="button" class="cb-billete${!P.recibido?' on':''}" data-a="billete" data-n="0">Exacto</button>${bs.map(b=>`<button type="button" class="cb-billete${P.recibido===b?' on':''}" data-a="billete" data-n="${b}">${col(b)}</button>`).join('')}<button type="button" class="cb-billete${P.recibido&&!bs.includes(P.recibido)?' on':''}" data-a="otro-monto">${P.recibido&&!bs.includes(P.recibido)?col(P.recibido):'Otro'}</button></div>
      ${v?`<div class="cb-vuelto"><small>Vuelto</small><b>${col(v)}</b></div>`:''}`;
  }else if(P.metodo==='sinpe')h=sinpeHtml(P);
  else if(P.metodo==='fiado')h=fiadoPanel(tk(),T);
  else h=`<p class="cb-nota">Pasá la tarjeta en el datáfono por <b>${col(T.total)}</b> y después tocá «Listo, cobrado».</p>`;
  pa.innerHTML=h;
}
// Anotar a quién le hicieron el SINPE cuando todavía no está registrado
async function destinoNuevo(){
  const r=await abrirHoja(`<h2 class="cb-hoja-t">¿A quién le hacen el SINPE?</h2><p class="cb-hoja-s">Queda anotado en la venta, igual que en el POS computadora.</p>
    <label class="cb-etq">Nombre<input class="cb-campo" id="cbSdN" type="text" maxlength="30" placeholder="Ej. Roger" autocomplete="off" enterkeyhint="next"></label>
    <label class="cb-etq">Número de SINPE (opcional)<input class="cb-campo" id="cbSdT" type="tel" inputmode="numeric" maxlength="14" placeholder="8888-8888" autocomplete="off" enterkeyhint="done"></label>
    <button type="button" class="cb-principal" data-h="guardar"><span>Guardarlo para siempre</span></button>
    <button type="button" class="cb-segundo" data-h="una"><span>Usarlo solo en esta venta</span></button>`,{
    click(a){
      if(a!=='guardar'&&a!=='una')return;
      const n=hojaEl.querySelector('#cbSdN').value.trim().slice(0,30),tr=hojaEl.querySelector('#cbSdT').value.trim(),tel=telLimpio(tr);
      if(!n){aviso('Poné el nombre');hojaEl.querySelector('#cbSdN').focus();return;}
      if(tr&&!tel){aviso('El número lleva 8 números');hojaEl.querySelector('#cbSdT').focus();return;}
      cerrarHoja({n,tel,guardar:a==='guardar'});
    }});
  hojaEl.querySelector('#cbSdN')&&hojaEl.querySelector('#cbSdN').focus();
  const res=await r;if(!res||!S.pago)return;
  const label=res.tel?`${res.n} · ${telTxt(res.tel)}`:res.n;
  let guardado=false;
  if(res.guardar){
    let ok=puede('ver_configuracion');
    if(!ok)ok=!!(await pedirAdmin('Guardar a quién se le hace SINPE','Solo un administrador agrega personas. PIN de administrador.'));
    if(ok){
      try{
        const l=destinos().map(d=>({nombre:d.nombre,tel:d.tel}));l.push({nombre:res.n,tel:telTxt(res.tel)});
        await window.db.config.guardar({sinpe_destinos:JSON.stringify(l),sinpe_numero:l[0].tel||''});
        S.cfg=await window.db.config.obtenerTodo();window.POSWEB.subir();guardado=true;
      }catch(e){if(errorCaja(e))return;}
    }
  }
  if(!S.pago)return;
  S.pago.destino=label;pintarPago();
  aviso(guardado?`${res.n} quedó guardado para recibir SINPE`:`SINPE a ${res.n}: queda anotado en esta venta`);
}
async function dosPartes(){
  const T=totalDe(tk());
  const e=await pedirMonto({titulo:'¿Cuánto da en efectivo?',sub:`De ${col(T.total)}. El resto va por SINPE o tarjeta.`});
  if(!e||!S.pago)return;
  if(e>=T.total){aviso('Eso ya cubre todo: cobralo en efectivo');return;}
  const o=await preguntar({titulo:`Faltan ${col(T.total-e)}. ¿Cómo los paga?`,opciones:[{n:'Por SINPE',v:'sinpe'},{n:'Con tarjeta',v:'tarjeta'}]});
  if(o&&S.pago){S.pago.parte={efectivo:e,otro:o};pintarPago();}
}
// Descuento: en porcentaje o en colones. Queda en la venta igual que en el POS computadora.
async function hacerDescuento(){
  const t=tk(),T=totalDe(t);if(!T.neto)return;
  let tipo=t.desc?t.desc.tipo:'pct',raw=t.desc?String(t.desc.valor):'',fresco=!!raw;
  const cuenta=()=>{const v=+raw||0;return{v,r:tipo==='pct'?Math.round(T.neto*Math.min(100,v)/100):Math.min(v,T.neto)};};
  const pinta=teclas=>{
    const q=s=>hojaEl.querySelector(s),{v,r}=cuenta();
    if(teclas){q('#cbDK').innerHTML=teclado(tipo==='pct'?{coma:false}:{plata:true});q('#cbDR').hidden=tipo!=='pct';hojaEl.querySelectorAll('[data-h="tipo"]').forEach(b=>b.classList.toggle('on',b.dataset.k===tipo));}
    q('#cbDV').innerHTML=tipo==='pct'?`<span>${v}</span><small>%</small>`:`<small>₡</small><span>${v.toLocaleString('es-CR')}</span>`;
    q('#cbDP').innerHTML=v>0?`<b>−${col(r)}</b><i>queda en ${col(T.neto-r)}</i>`:'¿De cuánto es el descuento?';
    q('[data-h="ok"]').disabled=!(v>0)||r>=T.neto;
  };
  const p=abrirHoja(`<h2 class="cb-hoja-t">Descuento</h2><p class="cb-hoja-s">La cuenta va en ${col(T.neto)}</p>
    <div class="cb-modos"><button type="button" class="cb-modo" data-h="tipo" data-k="pct">En porcentaje</button><button type="button" class="cb-modo" data-h="tipo" data-k="monto">En colones</button></div>
    <div class="cb-visor ch"><div class="cb-visor-n" id="cbDV"></div><div class="cb-visor-s" id="cbDP"></div></div>
    <div class="cb-billetes" id="cbDR">${[5,10,15,20].map(n=>`<button type="button" class="cb-billete" data-h="rapido" data-n="${n}">${n} %</button>`).join('')}</div>
    <div class="cb-teclas" id="cbDK"></div>
    <button type="button" class="cb-principal" data-h="ok"><span>Aplicar el descuento</span></button>
    ${t.desc?`<button type="button" class="cb-segundo cb-mal" data-h="quitar"><span>Quitar el descuento</span></button>`:''}`,{
    tecla(k){if(fresco){raw='';fresco=false;}if(k==='b')raw=raw.slice(0,-1);else if(/^\d+$/.test(k)&&!(raw===''&&/^0+$/.test(k))){const s=raw+k;if(tipo==='pct'?+s<=100:s.length<=7)raw=s;}pinta();},
    click(a,el){
      if(a==='tipo'){if(tipo!==el.dataset.k){tipo=el.dataset.k;raw='';fresco=false;pinta(true);}}
      else if(a==='rapido'){tipo='pct';raw=el.dataset.n;fresco=false;pinta();}
      else if(a==='ok'){if(cuenta().v>0)cerrarHoja({tipo,valor:+raw});}
      else if(a==='quitar')cerrarHoja({quitar:true});
    }});
  pinta(true);
  const res=await p;if(!res)return;
  if(res.quitar){t.desc=null;guardar();aviso('Descuento quitado');return;}
  const r=res.tipo==='pct'?Math.round(T.neto*res.valor/100):Math.min(res.valor,T.neto),pct=T.neto?r/T.neto*100:0;
  if(r>=T.neto){aviso('El descuento no puede ser toda la cuenta');return;}
  if(pct>S.descMax+.001){const a=await pedirAdmin(`Descuento de ${col(r)}`,`Pasa del ${num(S.descMax,0)} % permitido. PIN de administrador.`);if(!a)return;}
  t.desc={tipo:res.tipo,valor:res.valor};guardar();
}
// Cliente: el nombre sale en la factura y con el teléfono se le envía por WhatsApp
async function ponerCliente(o){
  o=o||{};const t=tk();
  const p=abrirHoja(`<h2 class="cb-hoja-t">${o.nueva?'Cuenta nueva':'Cliente'}</h2><p class="cb-hoja-s">${o.nueva?'¿De quién es? Así no se confunden las cuentas.':'El nombre sale en la factura. Con el teléfono se la enviás por WhatsApp.'}</p>
    <label class="cb-etq">Nombre<input class="cb-campo" id="cbCliN" type="text" maxlength="40" value="${esc(t.n||'')}" placeholder="${esc('Cliente '+t.k)}" autocomplete="off" enterkeyhint="next"></label>
    <label class="cb-etq">Teléfono (opcional)<input class="cb-campo" id="cbCliT" type="tel" inputmode="numeric" maxlength="14" value="${esc(telTxt(t.tel))}" placeholder="8888-8888" autocomplete="off" enterkeyhint="done"></label>
    <button type="button" class="cb-principal" data-h="ok"><span>Listo</span></button>${o.nueva?'<button type="button" class="cb-segundo" data-h="sin"><span>Seguir sin nombre</span></button>':''}`,{
    click(a){if(a==='sin')return cerrarHoja();if(a!=='ok')return;const tel=hojaEl.querySelector('#cbCliT').value.trim();if(tel&&!telLimpio(tel)){aviso('El teléfono lleva 8 números');hojaEl.querySelector('#cbCliT').focus();return;}cerrarHoja({n:hojaEl.querySelector('#cbCliN').value.trim().slice(0,40),tel:telLimpio(tel)});}});
  const nom=hojaEl.querySelector('#cbCliN');if(nom){nom.focus();nom.select();nom.addEventListener('keydown',e=>{if(e.key==='Enter')hojaEl.querySelector('[data-h="ok"]').click();});}
  const r=await p;
  if(!r)return;t.n=r.n;t.tel=r.tel;guardar();
}
function pedirAdmin(titulo,sub){return pedirPin({titulo,sub:sub||'PIN de administrador',verificar:async pin=>{const r=await window.db.cajeros.verificarAdmin(pin);return r&&r.ok?r:null;}});}
function puede(permiso){const c=S.cajero;return !!c&&(c.rol==='administrador'||!!(c.permisos&&c.permisos[permiso]));}
function errorCaja(e){if(/Solo lectura|otra pesta/i.test(String(e&&e.message))){leerEstado();pedirCaja();return true;}return false;}
async function pedirCaja(){
  const r=await preguntar({titulo:'La caja está en otro aparato',texto:`Ahora mismo cobra ${S.est.d||'otro dispositivo'}. Si la pasás para acá, ese queda solo mirando.`,opciones:[{n:'Cobrar en este teléfono',v:true},{n:'Ahora no',v:false}]});
  if(r)tomarCaja();
}
async function pagar(){
  const t=tk(),T=totalDe(t),P=S.pago;if(!T.n||!P||S.pagando)return;
  if(t.pedido){S.pagando=true;const ok=await pedidoLibre(t).finally(()=>{S.pagando=false;});if(!ok){if(estadoPedido(t)){pila.length=1;pintar('atras');}return;}
    const st=cotEstado(t);if(st==='mandar'||st==='esperando'){pila.length=1;pintar('atras');return ACC[st==='mandar'?'cot-mandar':'cot-espera']();}}
  if((P.parte?P.parte.otro==='sinpe':P.metodo==='sinpe')&&!P.destino){aviso('Falta a quién le hicieron el SINPE');destinoNuevo();return;}
  if(P.metodo==='fiado'&&!P.parte&&!t.n){aviso('Para fiar hace falta el nombre del cliente');await ponerCliente();pintar();return;}
  let d={metodo_pago:P.metodo,monto_recibido:T.total,cambio:0,pago_efectivo:0,pago_tarjeta:0,pago_sinpe:0,sinpe_destino:''};
  if(P.parte){const resto=T.total-P.parte.efectivo;d.metodo_pago='mixto';d.monto_recibido=P.parte.efectivo;d.pago_efectivo=P.parte.efectivo;if(P.parte.otro==='sinpe'){d.pago_sinpe=resto;d.sinpe_destino=P.destino;}else d.pago_tarjeta=resto;}
  else if(P.metodo==='efectivo'){const rec=P.recibido>T.total?P.recibido:T.total;d.monto_recibido=rec;d.cambio=rec-T.total;d.pago_efectivo=T.total;}
  else if(P.metodo==='sinpe'){d.pago_sinpe=T.total;d.sinpe_destino=P.destino;}
  else if(P.metodo==='fiado'){d.monto_recibido=0;}
  else d.pago_tarjeta=T.total;
  const notas=[t.pedido?`Pedido web ${t.pedido.ref} · ${SUCS[S.suc]||''}`:'',t.tel?'Tel '+telTxt(t.tel):''].filter(Boolean).join(' · ');
  const datos={subtotal:T.bruto,descuento_total:Math.max(0,T.bruto-T.total),impuesto:0,total:T.total,...d,desc_global_pct:T.pct,desc_global_monto:T.rebajo,cliente_nombre:t.n||'',cliente_tel:t.tel||'',notas,
    items:t.items.map(i=>({producto_id:i.pid||null,nombre:i.n,precio_unitario:i.pu,cantidad:i.q,unidad:i.u,tasa_impuesto:i.ti||0,descuento:Math.max(0,Math.round(i.pu*i.q)-i.sub),subtotal:i.sub,
      promocion_id:i.promo_id||null,promocion_descripcion:i.promo_txt||'',desc_manual_pct:0,cabys_codigo:i.cabys||'',producto_generico:i.gen?1:0}))};
  S.pagando=true;const b=D.getElementById('cbPagar');if(b)b.disabled=true;
  try{
    let antes=0;if(d.metodo_pago==='fiado'){try{antes=+(await window.db.fiados.debe(t.n,t.tel))||0;}catch{}}
    let v=await window.db.ventas.crear(datos);
    if(v&&v.pendiente)v={...datos,numero:'(en la fila)',fecha:new Date().toISOString(),estado:'completada',pendiente:true};
    const debe=d.metodo_pago==='fiado'?antes+T.total:0;if(debe)v.debeFiado=debe;
    if(d.sinpe_destino)try{localStorage.setItem('pos_sinpe_ultimo',d.sinpe_destino);}catch{}
    LS.set('aramo_cobrar_metodo',P.parte?'efectivo':P.metodo);
    for(const i of t.items){const p=S.porId.get(i.pid);if(p){p.stock=(+p.stock||0)-i.q;S.top.set(p.id,(S.top.get(p.id)||0)+1);}}
    S.ultima={v,cliente:nombreTk(t),tel:t.tel||'',vuelto:d.cambio,pedido:t.pedido?t.pedido.ref:'',debe};
    if(t.pedido)cerrarPedido(t,v,d).catch(e=>console.warn('[pedido]',e));
    S.tk=S.tk.filter(x=>x!==t);if(!S.tk.length)cuentaNueva();S.act=S.tk[0].id;
    S.pago=null;S.q='';guardar();
    if(S.hoy){S.hoy.n++;S.hoy.total+=T.total;S.hoy.desc=(S.hoy.desc||0)+datos.descuento_total;}
    vib([18,60,30]);
    window.POSWEB.subir(); // a la nube ya, sin esperar
    pila.length=1;pila.push('listo');pintar('adelante');
  }catch(e){
    if(b)b.disabled=false;
    if(!errorCaja(e))aviso('No se pudo guardar la venta: '+(e&&e.message||e),6000);
  }finally{S.pagando=false;}
}

// 4 · Cobrado
const comoPago=v=>v.metodo_pago==='fiado'?`Al fiado${v.cliente_nombre?' · '+v.cliente_nombre:''}`:v.metodo_pago==='mixto'?`${col(v.pago_efectivo)} en efectivo + ${col(v.total-v.pago_efectivo)} ${v.pago_sinpe>0?'por SINPE':'con tarjeta'}${v.sinpe_destino?' a '+String(v.sinpe_destino).split(' · ')[0]:''}`
  :v.metodo_pago==='sinpe'?`SINPE${v.sinpe_destino?' a '+String(v.sinpe_destino).split(' · ')[0]:''}`:(METODOS[v.metodo_pago]||{n:v.metodo_pago}).n;
V.listo=()=>{
  const u=S.ultima;if(!u)return '';const v=u.v;
  return `<div class="cb-cuerpo cb-listo">
    <div class="cb-ok" aria-hidden="true"><svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="42"/><path d="M29 49.5 42.5 63 68 36.5"/></svg></div>
    <h1 class="cb-listo-h">Cobrado</h1>
    <p class="cb-listo-t"><b>${col(v.total)}</b> · ${esc(comoPago(v))}${v.descuento_total>0?` · descuento ${col(v.descuento_total)}`:''}</p>
    ${u.vuelto>0?`<div class="cb-vuelto gr"><small>Dale de vuelto</small><b>${col(u.vuelto)}</b></div>`:''}
    <p class="cb-listo-n">${esc(v.numero||'')} · ${esc(u.cliente)}${u.pedido?' · pedido '+esc(u.pedido)+' cobrado en La Feria':''}</p>
    <p class="cb-listo-nube" id="cbListoNube"></p>
    <div class="cb-listo-acc"><button type="button" class="cb-segundo cb-wa" data-a="factura">${ic('enviar',18)}<span>${u.tel?'Enviar la factura al '+telTxt(u.tel):'Enviar la factura por WhatsApp'}</span></button><button type="button" class="cb-segundo" data-a="imprimir">${ic('imprimir',18)}<span>Imprimir</span></button></div>
  </div>
  <footer class="cb-dock"><button type="button" class="cb-principal" data-a="siguiente"><span>Siguiente cliente</span><i>${ic('flecha',20)}</i></button></footer>`;
};
DESPUES.listo=pintarEstado;
// La factura: dice cada producto, el descuento (si hubo) y cómo pagó
function descDe(v){const d=+v.descuento_total||0;return d>0?{d,et:(+v.desc_global_pct>0&&Math.abs(d-(+v.desc_global_monto||0))<1)?`Descuento (${num(v.desc_global_pct,1)} %)`:'Descuento'}:null;}
const devueltos=v=>new Set(String(v.notas||'').split('\n').map(l=>(l.match(/^\[DEV\] (.*) x[\d.]+$/)||[])[1]).filter(Boolean));
function facturaTxt(v){
  const L=[],de=descDe(v),dev=devueltos(v);
  L.push(`*${S.cfg.empresa_nombre||'ARAMO Frutas y Verduras'}*`,[SUCS[S.suc],S.cfg.empresa_telefono?'Tel. '+S.cfg.empresa_telefono:''].filter(Boolean).join(' · '),
    `Factura ${v.numero||''} · ${new Date(String(v.fecha||'').replace(' ','T')||Date.now()).toLocaleString('es-CR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})}`);
  if(v.cliente_nombre)L.push('Cliente: '+v.cliente_nombre);
  if(v.estado==='anulada')L.push('*** ANULADA ***');
  L.push('');
  for(const i of v.items||[])L.push(`${cantTxt(i.cantidad,i.unidad)} ${i.nombre}  ${col(i.subtotal)}${dev.has(i.nombre)?' (devuelto)':''}`);
  L.push('');
  if(de)L.push('Subtotal: '+col(v.subtotal),`${de.et}: -${col(de.d)}`);
  L.push('*TOTAL: '+col(v.total)+'*');
  if(v.metodo_pago==='fiado'){L.push('Queda al fiado.');if(v.debeFiado>0)L.push('Debe en total: '+col(v.debeFiado));}
  else if(v.metodo_pago==='efectivo'){L.push(`Pagó con ${col(v.monto_recibido)} en efectivo`);if(v.cambio>0)L.push('Vuelto: '+col(v.cambio));}
  else if(v.metodo_pago==='mixto')L.push(`Efectivo ${col(v.pago_efectivo)} + ${v.pago_sinpe>0?'SINPE '+col(v.pago_sinpe):'tarjeta '+col(v.pago_tarjeta)}`);
  else L.push('Pagó '+(v.metodo_pago==='sinpe'?'por SINPE':'con tarjeta'));
  L.push('','¡Gracias por su compra!');
  return L.filter((x,i)=>x!==''||L[i-1]!=='').join('\n');
}
async function enviarFactura(v,tel){
  tel=telLimpio(tel);
  if(!tel){
    const t=await pedirTexto({titulo:'¿A qué número se la enviamos?',sub:'El WhatsApp del cliente (8 números).',tipo:'tel',max:14,pista:'8888-8888',ok:'Enviar por WhatsApp'});
    if(t===undefined)return;
    tel=telLimpio(t);if(!tel){aviso('El teléfono lleva 8 números');return;}
    if(S.ultima&&S.ultima.v===v)S.ultima.tel=tel;
  }
  window.open('https://wa.me/506'+tel+'?text='+encodeURIComponent(facturaTxt(v)),'_blank','noopener');
}
function imprimirFactura(v){
  const de=descDe(v);
  const filas=(v.items||[]).map(i=>`<tr><td>${esc(cantTxt(i.cantidad,i.unidad))} ${esc(i.nombre)}</td><td class="d">${col(i.subtotal)}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:4mm}body{font:12px/1.35 monospace;width:68mm;margin:0;color:#000}h1{font-size:15px;margin:0;text-align:center}p{margin:2px 0;text-align:center}table{width:100%;border-collapse:collapse;margin:6px 0}td{padding:1px 0;vertical-align:top}.d{text-align:right;white-space:nowrap}.s td{border-top:1px dashed #000;padding-top:4px}.t td{font-weight:700;font-size:14px}</style></head><body>
    <h1>${esc(S.cfg.empresa_nombre||'ARAMO Frutas y Verduras')}</h1><p>${esc(SUCS[S.suc]||'')}${S.cfg.empresa_telefono?' · '+esc(S.cfg.empresa_telefono):''}</p><p>${esc(v.numero||'')} · ${esc(String(v.fecha||''))}</p>${v.cliente_nombre?`<p>Cliente: ${esc(v.cliente_nombre)}</p>`:''}${v.estado==='anulada'?'<p><b>*** ANULADA ***</b></p>':''}
    <table>${filas}${de?`<tr class="s"><td>Subtotal</td><td class="d">${col(v.subtotal)}</td></tr><tr><td>${esc(de.et)}</td><td class="d">-${col(de.d)}</td></tr><tr class="t"><td>TOTAL</td><td class="d">${col(v.total)}</td></tr>`:`<tr class="s t"><td>TOTAL</td><td class="d">${col(v.total)}</td></tr>`}
    ${v.metodo_pago==='efectivo'?`<tr><td>Efectivo</td><td class="d">${col(v.monto_recibido)}</td></tr><tr><td>Vuelto</td><td class="d">${col(v.cambio)}</td></tr>`:`<tr><td>Pago</td><td class="d">${esc(comoPago(v))}</td></tr>`}</table>
    <p>¡Gracias por su compra!</p></body></html>`;
  window.db.tiquete.imprimir(html).catch(()=>aviso('No se pudo abrir la impresión'));
}

// 5 · Abrir la caja (una sola vez al empezar el turno)
const colorDe=c=>/^#[0-9a-f]{3,8}$/i.test(c||'')?c:'#156334';
const inicial=n=>esc(String(n||'?').trim().slice(0,1).toUpperCase());
V.abrir=()=>{
  const a=S.apert;
  const izq=a.paso==='quien'||(a.paso==='pin'&&S.cajeros.length<2)?`<button type="button" class="cb-pastilla" data-a="salir">${ic('inicio',20)}<span>Inicio</span></button>`:bVolver('Volver');
  if(S.est.k==='lee')return barra({izq})+`<div class="cb-cuerpo"><p class="cb-sobre">${saludo()}</p><h1 class="cb-h1">La caja está en ${esc(S.est.d||'otro aparato')}</h1><p class="cb-vacio">Para cobrar desde este teléfono, pasala para acá. El otro aparato queda solo mirando.</p></div><footer class="cb-dock"><button type="button" class="cb-principal" data-a="tomar"><span>Cobrar en este teléfono</span><i>${ic('flecha',20)}</i></button></footer>`;
  if(a.paso==='quien')return barra({izq})+`<div class="cb-cuerpo"><p class="cb-sobre">${saludo()}</p><h1 class="cb-h1">¿Quién cobra hoy?</h1>
    <div class="cb-quienes">${S.cajeros.map(c=>`<button type="button" class="cb-quien" data-a="quien" data-id="${c.id}"><span class="cb-avatar" style="--c:${colorDe(c.color)}">${inicial(c.nombre)}</span><b>${esc(c.nombre)}</b><small>${c.rol==='administrador'?'Administrador':'Cajero'}</small></button>`).join('')}</div></div>`;
  if(a.paso==='pin')return barra({izq})+`<div class="cb-cant"><div class="cb-cant-p"><span class="cb-avatar gr" style="--c:${colorDe(a.cajero.color)}">${inicial(a.cajero.nombre)}</span><div class="cb-cant-pt"><h1 class="cb-cant-n">Hola, ${esc(a.cajero.nombre)}</h1><p class="cb-sub" id="cbPinS">Poné tu PIN para abrir la caja</p></div></div>
    <div class="cb-pin gr" id="cbPin">${[0,1,2,3].map(i=>`<i class="${i<a.pin.length?'on':''}"></i>`).join('')}</div><div class="cb-teclas">${teclado({coma:false})}</div></div>`;
  return barra({izq})+`<div class="cb-cant"><div class="cb-cant-pt solo"><h1 class="cb-cant-n">¿Con cuánto sencillo empieza la caja?</h1><p class="cb-sub">Lo que hay en el cajón antes de la primera venta</p></div>
    <div class="cb-visor" id="cbVisor"><div class="cb-visor-n"><small>₡</small><span>${(+a.raw||0).toLocaleString('es-CR')}</span></div><div class="cb-visor-s">Turno de ${esc(a.cajero.nombre)}</div></div>
    <div class="cb-teclas">${teclado({plata:true})}</div>
    <button type="button" class="cb-principal" data-a="abrir-ok" id="cbAbrirOk"><span>${+a.raw>0?'Abrir la caja':'Abrir sin sencillo'}</span><i>${ic('flecha',20)}</i></button></div>`;
};
DESPUES.abrir=pintarEstado;
const saludo=()=>{const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';};
async function teclaAbrir(k){
  const a=S.apert;if(!a||a.ocupado)return;
  if(a.paso==='pin'){
    if(k==='b')a.pin=a.pin.slice(0,-1);else if(/^\d$/.test(k)&&a.pin.length<4)a.pin+=k;
    const d=D.getElementById('cbPin');if(d){d.classList.remove('mal');d.innerHTML=[0,1,2,3].map(i=>`<i class="${i<a.pin.length?'on':''}"></i>`).join('');}
    if(a.pin.length===4){
      a.ocupado=true;let ok=false;try{ok=await window.db.cajeros.verificarPin(a.cajero.id,a.pin);}catch{}a.ocupado=false;
      if(ok){a.paso='monto';a.raw=String(LS.get('aramo_cobrar_sencillo_'+S.suc,'')||'');a.fresco=!!a.raw;pintar('adelante');}
      else{a.pin='';vib(60);const d2=D.getElementById('cbPin');if(d2){d2.innerHTML=[0,1,2,3].map(()=>'<i></i>').join('');d2.classList.add('mal');}const s=D.getElementById('cbPinS');if(s)s.textContent='Ese PIN no es. Probá otra vez.';}
    }
  }else if(a.paso==='monto'){
    if(a.fresco){a.raw='';a.fresco=false;}
    if(k==='b')a.raw=a.raw.slice(0,-1);else if(/^\d+$/.test(k)&&(a.raw+k).length<=7&&!(a.raw===''&&/^0+$/.test(k)))a.raw+=k;
    pintar();
  }
}
async function abrirCaja(){
  const a=S.apert;if(!a||a.ocupado)return;a.ocupado=true;
  try{
    S.caja=await window.db.caja.abrir({usuario:a.cajero.nombre,monto_apertura:+a.raw||0,notas_apertura:'',denominaciones:[]});
    LS.set('aramo_cobrar_sencillo_'+S.suc,a.raw||'');
    S.cajero=await window.db.cajeros.porNombre(S.caja.usuario);S.descMax=await window.db.caja.descuentoMax()??100;
    S.apert=null;window.POSWEB.subir();pila.length=1;pila[0]='venta';pintar('adelante');aviso(`Caja abierta. ¡A cobrar, ${S.caja.usuario}!`);
    if(S.pedidoUrl)setTimeout(abrirPedidoUrl,300);
  }catch(e){a.ocupado=false;if(!errorCaja(e))aviso('No se pudo abrir la caja');}
}
function pedirApertura(){S.apert={paso:S.cajeros.length>1?'quien':'pin',cajero:S.cajeros[0]||null,pin:'',raw:''};pila.length=1;pila[0]='abrir';}

// 6 · Facturas (ventas) por día: ver, enviar, devolver un producto y anular, como en el POS computadora
const ultimosDias=()=>Array.from({length:7},(_,i)=>{const f=new Date();f.setDate(f.getDate()-i);return{d:hoyISO(f),f,i};});
const diaTxt=(f,i)=>i===0?'Hoy':i===1?'Ayer':f.toLocaleDateString('es-CR',{weekday:'short',day:'numeric'}).replace('.','');
async function cargarVentas(dia){if(dia)S.vdia=dia;if(!S.vdia)S.vdia=hoyISO();S.ventas=await window.db.ventas.listar({desde:S.vdia,hasta:S.vdia});}
const pagoDe=v=>{const s=(+v.pago_efectivo||0)+(+v.pago_tarjeta||0)+(+v.pago_sinpe||0);return s>0?{e:+v.pago_efectivo||0,t:+v.pago_tarjeta||0,s:+v.pago_sinpe||0}:{e:v.metodo_pago==='efectivo'?v.total:0,t:v.metodo_pago==='tarjeta'?v.total:0,s:v.metodo_pago==='sinpe'?v.total:0};};
const filaVenta=(v,conDesc)=>`<button type="button" class="cb-item${v.estado!=='completada'?' anulada':''}" data-a="venta-ver" data-id="${v.id}"><span class="cb-plato ch m-${esc(v.metodo_pago)}"><i>${ic((METODOS[v.metodo_pago]||METODOS.efectivo).i,22)}</i></span><span class="cb-item-t"><b>${hora(v.fecha)}${v.cliente_nombre?' · '+esc(v.cliente_nombre):''}</b><small>${v.estado!=='completada'?'Anulada · ':''}${conDesc?`De ${col(v.subtotal)} quedó en ${col(v.total)}${v.cajero?' · '+esc(v.cajero):''}`:(v.sinpe_destino?'SINPE a '+esc(String(v.sinpe_destino).split(' · ')[0])+' · ':'')+esc(String(v.productos_texto||'').slice(0,60))}</small></span><span class="cb-item-m${conDesc?' menos':''}">${conDesc?'−'+col(v.descuento_total):col(v.total)}</span></button>`;
V.ventas=()=>{
  const ok=S.ventas.filter(v=>v.estado==='completada'),anu=S.ventas.length-ok.length,tot=ok.reduce((s,v)=>s+v.total,0),m=ok.reduce((a,v)=>{const p=pagoDe(v);a.e+=p.e;a.t+=p.t;a.s+=p.s;return a;},{e:0,t:0,s:0}),de=ok.reduce((s,v)=>s+(+v.descuento_total||0),0);
  const dias=ultimosDias(),hoy=dias.find(x=>x.d===S.vdia)||dias[0];
  return barra({izq:bVolver('Volver')})+`<div class="cb-cuerpo">
    <div class="cb-cuentas cb-cuentas--dias">${dias.map(x=>`<button type="button" class="cb-cta${x.d===S.vdia?' on':''}" data-a="ventas-dia" data-d="${x.d}"><b>${esc(diaTxt(x.f,x.i))}</b></button>`).join('')}</div>
    <div class="cb-hero"><div class="cb-hero-quien quieto">Ventas · ${esc(diaTxt(hoy.f,hoy.i))} · ${ok.length} ${ok.length===1?'factura':'facturas'}</div><div class="cb-hero-n">${col(tot)}</div>
      <div class="cb-hero-3"><span><small>Efectivo</small><b>${col(m.e)}</b></span><span><small>SINPE</small><b>${col(m.s)}</b></span><span><small>Tarjeta</small><b>${col(m.t)}</b></span></div></div>
    <button type="button" class="cb-hoy" data-a="descuentos" data-d="${S.vdia}">${ic('precio',18)}<span>Descuentos: <b>${col(de)}</b>${anu?` · ${anu} ${anu===1?'anulada':'anuladas'}`:''}</span>${ic('siguiente',16)}</button>
    ${S.ventas.length?`<div class="cb-lista cb-lista--sep">${S.ventas.map(v=>filaVenta(v)).join('')}</div><p class="cb-guia">Tocá una factura para verla, enviarla, devolver un producto o anularla.</p>`:`<p class="cb-vacio">Ese día no hay ventas.</p>`}
  </div>`;
};
// Descuentos por día: cuánto se rebajó, en cuántas ventas y cuáles fueron
async function cargarDescuentos(dia){
  const db=window.db,dias=ultimosDias();
  for(const x of dias){const r=await db.reportes.resumen(x.d,x.d);x.total=+r.stats.total_ventas||0;x.n=+r.stats.total_transacciones||0;x.desc=+r.stats.total_descuentos||0;}
  const sel=dia||(S.descs&&S.descs.sel)||dias[0].d;
  const lista=(await db.ventas.listar({desde:sel,hasta:sel,estado:'completada'})).filter(v=>+v.descuento_total>0);
  S.descs={dias,sel,lista};
}
V.descuentos=()=>{
  const X=S.descs,dia=X.dias.find(x=>x.d===X.sel)||X.dias[0],max=Math.max(1,...X.dias.map(x=>x.desc)),sem=X.dias.reduce((s,x)=>s+x.desc,0);
  return barra({izq:bVolver('Volver')})+`<div class="cb-cuerpo">
    <div class="cb-hero"><div class="cb-hero-quien quieto">Descuentos · ${esc(diaTxt(dia.f,dia.i))}</div><div class="cb-hero-n">${col(dia.desc)}</div>
      <div class="cb-hero-s">${X.lista.length} ${X.lista.length===1?'venta con descuento':'ventas con descuento'} de ${dia.n} · se vendió ${col(dia.total)}</div></div>
    <h3 class="cb-h3">Últimos 7 días · ${col(sem)}</h3>
    <div class="cb-dias">${X.dias.map(x=>`<button type="button" class="cb-dia${x.d===X.sel?' on':''}" data-a="desc-dia" data-d="${x.d}"><small>${esc(diaTxt(x.f,x.i))}</small><span class="cb-dia-b"><i style="height:${Math.round(x.desc/max*100)}%"></i></span><b>${x.desc?col(x.desc):'—'}</b></button>`).join('')}</div>
    ${X.lista.length?`<div class="cb-lista cb-lista--sep">${X.lista.map(v=>filaVenta(v,true)).join('')}</div>`:`<p class="cb-vacio">Ese día no se hizo ningún descuento.</p>`}
  </div>`;
};
async function refrescarListas(){
  await Promise.all([cargarVentas(),cargarHoy(),cargarProductos()]);
  if(vista()==='descuentos')await cargarDescuentos();
  if(vista()==='ventas'||vista()==='descuentos')pintar();
}
function pedirMotivo(){
  const p=abrirHoja(`<h2 class="cb-hoja-t">¿Por qué se anula?</h2><p class="cb-hoja-s">Queda anotado en la factura, igual que en el POS computadora.</p>
    <div class="cb-billetes">${['Se cobró mal','El cliente devolvió todo','Se hizo dos veces','Era una prueba'].map(m=>`<button type="button" class="cb-billete" data-h="motivo" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>
    <input class="cb-campo" id="cbMot" type="text" maxlength="80" placeholder="O escribí el motivo" autocomplete="off" enterkeyhint="done">
    <button type="button" class="cb-principal cb-mal" data-h="ok"><span>Seguir</span></button>`,{
    click(a,el){if(a==='motivo')cerrarHoja(el.dataset.m);else if(a==='ok'){const m=hojaEl.querySelector('#cbMot').value.trim();if(!m){aviso('Poné el motivo');hojaEl.querySelector('#cbMot').focus();return;}cerrarHoja(m);}}});
  return p;
}
async function verVenta(id){
  const v=await window.db.ventas.obtener(id);if(!v)return;const de=descDe(v),dev=devueltos(v),viva=v.estado==='completada',quedan=(v.items||[]).filter(i=>!dev.has(i.nombre));
  const r=await abrirHoja(`<h2 class="cb-hoja-t">${col(v.total)} · ${hora(v.fecha)}</h2><p class="cb-hoja-s">${esc(v.numero||'')} · ${esc(comoPago(v))}${v.cajero?' · cobró '+esc(v.cajero):''}${v.cliente_nombre?' · '+esc(v.cliente_nombre):''}</p>
    ${viva?'':`<p class="cb-nota cb-nota--mal"><b>Factura anulada</b>${v.anulado_por?' por '+esc(v.anulado_por):''}${v.anulado_motivo?': '+esc(v.anulado_motivo):''}</p>`}
    <div class="cb-detalle">${(v.items||[]).map(i=>`<div${dev.has(i.nombre)?' class="dev"':''}><span>${esc(cantTxt(i.cantidad,i.unidad))} ${esc(i.nombre)}${dev.has(i.nombre)?' · devuelto':''}</span><b>${col(i.subtotal)}</b></div>`).join('')}${de?`<div><span>${esc(de.et)}</span><b>-${col(de.d)}</b></div>`:''}</div>
    <div class="cb-hoja-bot"><button type="button" class="cb-segundo cb-wa" data-h="factura">${ic('enviar',18)}<span>Enviar la factura por WhatsApp</span></button><button type="button" class="cb-segundo" data-h="imprimir">${ic('imprimir',18)}<span>Imprimir</span></button>
    ${viva&&quedan.length>1?`<button type="button" class="cb-segundo" data-h="devolver">${ic('deshacer',18)}<span>Devolver un producto</span></button>`:''}
    ${viva?`<button type="button" class="cb-segundo cb-mal" data-h="anular">${ic('borrar',18)}<span>Anular la factura</span></button>`:''}</div>`,{click(a){cerrarHoja(a);}});
  if(r==='factura')enviarFactura(v,(String(v.notas||'').match(/Tel (\d{4}-\d{4})/)||[])[1]||'');
  if(r==='imprimir')imprimirFactura(v);
  if(r==='devolver'){
    const it=await preguntar({titulo:'¿Cuál producto devuelve?',texto:'Vuelve al inventario y se rebaja de la factura.',lista:true,opciones:quedan.map(i=>({n:`${cantTxt(i.cantidad,i.unidad)} ${i.nombre} · ${col(i.subtotal)}`,v:i}))});
    if(!it)return;
    if(!puede('anular_ventas')){const a=await pedirAdmin('Devolver '+it.nombre,'PIN de administrador para autorizar la devolución.');if(!a)return;}
    try{const x=await window.db.ventas.devolverItem(v.id,it.id);if(!x||!x.ok)throw new Error('dev');window.POSWEB.subir();aviso(`Devuelto: ${it.nombre}. Hay que regresarle ${col(it.subtotal)}.`,5200);await refrescarListas();}
    catch(e){if(!errorCaja(e))aviso('No se pudo hacer la devolución');}
  }
  if(r==='anular'){
    const motivo=await pedirMotivo();if(!motivo)return;
    const a=await pedirAdmin(`Anular la factura de ${col(v.total)}`,'Solo un administrador puede anular. PIN de administrador.');if(!a)return;
    try{const x=await window.db.ventas.anular(v.id,{cajeroNombre:a.nombre||'Administrador',motivo});if(!x||!x.ok)throw new Error('anular');window.POSWEB.subir();aviso('Factura anulada. Los productos volvieron al inventario.',4200);await refrescarListas();}
    catch(e){if(!errorCaja(e))aviso('No se pudo anular (puede que ya esté anulada)');}
  }
}
V.caja=()=>{
  const r=S.resumen,c=r&&r.caja,v=r&&r.ventas||{};if(!c)return barra({izq:bVolver('Volver')})+'<div class="cb-cuerpo"><p class="cb-vacio">No hay caja abierta.</p></div>';
  const debe=(+c.monto_apertura||0)+(+v.efectivo||0);
  return barra({izq:bVolver('Volver')})+`<div class="cb-cuerpo">
    <div class="cb-hero"><div class="cb-hero-quien quieto">Debe haber en el cajón</div><div class="cb-hero-n">${col(debe)}</div><div class="cb-hero-s">Turno de ${esc(c.usuario||'')} · desde ${hora(c.fecha_apertura)}</div></div>
    <div class="cb-detalle tarjeta"><div><span>Sencillo con que empezó</span><b>${col(c.monto_apertura)}</b></div><div><span>Ventas en efectivo</span><b>${col(v.efectivo)}</b></div><div><span>Ventas por SINPE</span><b>${col(v.sinpe)}</b></div>
      ${(v.sinpe_destinos||[]).map(x=>`<div class="sub"><span>↳ ${esc(x.destino)}</span><b>${col(x.monto)}</b></div>`).join('')}
      <div><span>Ventas con tarjeta</span><b>${col(v.tarjeta)}</b></div>${v.abonos_n?`<div class="sub"><span>↳ incluye pagos de fiados</span><b>${col((v.abonos_efectivo||0)+(v.abonos_sinpe||0)+(v.abonos_tarjeta||0))}</b></div>`:''}${v.fiado?`<div><span>Vendido al fiado (no entra plata)</span><b>${col(v.fiado)}</b></div>`:''}<div><span>Descuentos dados</span><b>${col(v.descuentos)}</b></div><div class="t"><span>${v.num_ventas||0} ${v.num_ventas===1?'venta':'ventas'} en el turno</span><b>${col(v.total_ventas)}</b></div></div>
  </div><footer class="cb-dock"><button type="button" class="cb-principal" data-a="cerrar-caja"><span>Cerrar la caja</span><i>${ic('candado',20)}</i></button></footer>`;
};
async function cerrarCaja(){
  const r=S.resumen;if(!r||!r.caja)return;const c=r.caja,debe=(+c.monto_apertura||0)+(+(r.ventas||{}).efectivo||0);
  const n=await pedirMonto({titulo:'¿Cuánto contaste en el cajón?',sub:`Debe haber ${col(debe)}`,cero:true,ok:'Seguir'});
  if(n===undefined)return;
  const dif=n-debe;
  const si=await preguntar({titulo:dif===0?'Cuadra exacto':dif<0?`Faltan ${col(-dif)}`:`Sobran ${col(dif)}`,texto:`Contaste ${col(n)} y debía haber ${col(debe)}. Al cerrar, el turno de ${c.usuario||''} termina.`,opciones:[{n:'Cerrar la caja',v:true},{n:'Volver a contar',v:false}]});
  if(!si)return;
  try{
    await window.db.caja.cerrar(c.id,{monto_apertura:c.monto_apertura,monto_cierre_real:n,notas_cierre:'Cerrada desde el teléfono',denominaciones:[]});
    window.POSWEB.subir();S.caja=null;S.cajero=null;S.resumen=null;aviso('Caja cerrada. ¡Buen trabajo!');pedirApertura();pintar('atras');
  }catch(e){if(!errorCaja(e))aviso('No se pudo cerrar la caja');}
}
async function abrirMas(){
  const h=S.hoy||{n:0,total:0};
  const r=await abrirHoja(`<h2 class="cb-hoja-t">Más</h2><div class="cb-menu">
    <button type="button" data-h="ventas">${ic('recibo',22)}<span><b>Ventas y facturas</b><small>${h.n} hoy · ${col(h.total)} · ver, enviar, devolver o anular</small></span></button>
    ${BA&&BA.soportada()?`<button type="button" data-h="bascula">${ic('balanza',22)}<span><b>Báscula</b><small>${BA.estado().estado==='lista'?'Conectada · el peso entra solo':'Conectarla para no digitar el peso'}</small></span></button>`:''}
    <button type="button" data-h="fiados">${ic('libro',22)}<span><b>Fiados</b><small>Quién debe, cuánto, y recibir pagos</small></span></button>
    <button type="button" data-h="descuentos">${ic('precio',22)}<span><b>Descuentos</b><small>Cuánto se rebajó cada día y en cuáles ventas</small></span></button>
    <button type="button" data-h="caja">${ic('caja',22)}<span><b>La caja</b><small>${S.caja?`Turno de ${esc(S.caja.usuario||'')} · contar y cerrar`:'Sin abrir'}</small></span></button>
    <button type="button" data-h="suelto">${ic('mas',22)}<span><b>Producto suelto</b><small>Cobrar algo que no está en la lista</small></span></button>
    <button type="button" data-h="completo">${ic('pantalla',22)}<span><b>ARAMO POS computadora</b><small>Inventario, reportes, cajeros y ajustes</small></span></button>
    <button type="button" data-h="nube">${ic('nube',22)}<span><b>Nube y este teléfono</b><small>${esc(EST[S.est.k||'ok'][1])}</small></span></button></div>`,{click(a){cerrarHoja(a);}});
  if(r==='ventas'){await cargarVentas(hoyISO());ir('ventas');}
  if(r==='descuentos'){await cargarDescuentos(hoyISO());ir('descuentos');}
  if(r==='fiados'){await cargarFiados();ir('fiados');}
  if(r==='bascula')menuBascula();
  if(r==='caja'){if(!S.caja)return;S.resumen=await window.db.caja.resumen(S.caja.id);ir('caja');}
  if(r==='suelto')productoSuelto();
  if(r==='completo'){guardar();location.href='index.html?suc='+encodeURIComponent(S.suc);}
  if(r==='nube'){const pill=D.getElementById('pwPill');if(pill)setTimeout(()=>pill.click(),30);}
}

// 7 · Fiado: se fía al cobrar; aquí se ve quién debe y se reciben los pagos (entran a la caja de hoy)
function fiadoPanel(t,T){
  if(!t.n)return `<div class="cb-nota"><b>¿A quién se le fía?</b><br>Hace falta el nombre (y si se puede, el teléfono para recordarle).</div><button type="button" class="cb-segundo" data-a="cliente" style="margin-top:10px">${ic('clientes',18)}<span>Poner el cliente</span></button>`;
  const deb=S.debeDe&&S.debeDe.k===t.n+'|'+t.tel?S.debeDe.v:null;
  if(deb===null){S.debeDe={k:t.n+'|'+t.tel,v:null};window.db.fiados.debe(t.n,t.tel).then(v=>{S.debeDe={k:t.n+'|'+t.tel,v:+v||0};if(vista()==='cobrar'&&S.pago&&S.pago.metodo==='fiado')pintarPago();}).catch(()=>{});}
  return `<div class="cb-fiado"><div><small>Se le anota a</small><b>${esc(t.n)}${t.tel?' · '+telTxt(t.tel):''}</b></div>
    <div class="cb-fiado-n"><small>${deb?'Ya debía':'Debía'}</small><b>${deb===null?'…':col(deb)}</b></div>
    <div class="cb-fiado-n tot"><small>Va a deber</small><b>${deb===null?'…':col(deb+T.total)}</b></div></div>
    <p class="cb-nota">No entra plata a la caja: queda como venta al fiado. Los pagos se reciben en <b>Más → Fiados</b>.</p>`;
}
async function cargarFiados(){S.fiados=await window.db.fiados.clientes();}
V.fiados=()=>{
  const L=S.fiados||[],deben=L.filter(c=>c.debe>0),tot=deben.reduce((s,c)=>s+c.debe,0);
  return barra({izq:bVolver('Volver')})+`<div class="cb-cuerpo">
    <div class="cb-hero cb-hero--fiado"><div class="cb-hero-quien quieto">Fiados · por cobrar</div><div class="cb-hero-n">${col(tot)}</div><div class="cb-hero-s">${deben.length} ${deben.length===1?'cliente debe':'clientes deben'}</div></div>
    ${L.length?`<div class="cb-lista cb-lista--sep">${L.map(c=>`<button type="button" class="cb-item${c.debe>0?'':' pagado'}" data-a="fiado-ver" data-k="${esc(c.clave)}"><span class="cb-avatar ch" style="--c:${c.debe>0?'#a3420e':'#4b4c43'}">${esc(String(c.cliente||'?').trim().slice(0,1).toUpperCase())}</span><span class="cb-item-t"><b>${esc(c.cliente||'Sin nombre')}</b><small>${c.tel?telTxt(c.tel)+' · ':''}${c.debe>0?`${c.n} ${c.n===1?'compra':'compras'} al fiado`:c.aFavor>0?'Tiene '+col(c.aFavor)+' a favor':'Al día'}</small></span><span class="cb-item-m${c.debe>0?' debe':''}">${c.debe>0?col(c.debe):'✓'}</span></button>`).join('')}</div>`
      :`<p class="cb-vacio">Nadie debe nada. Para fiar, al cobrar escogé «Fiado».</p>`}
  </div>`;
};
V.fiadoCli=()=>{
  const c=S.fiadoCli;if(!c)return '';
  const movs=[...c.ventas.map(v=>({t:'v',f:v.fecha,v})),...c.pagos.map(p=>({t:'p',f:p.fecha,p}))].sort((a,b)=>String(b.f).localeCompare(String(a.f)));
  return barra({izq:bVolver('Fiados')})+`<div class="cb-cuerpo">
    <div class="cb-hero cb-hero--fiado"><div class="cb-hero-quien quieto">${esc(c.cliente||'Cliente')}${c.tel?' · '+telTxt(c.tel):''}</div><div class="cb-hero-n">${col(c.debe)}</div><div class="cb-hero-s">${c.debe>0?'Debe en total':c.aFavor>0?'Tiene '+col(c.aFavor)+' a favor':'Está al día'} · se llevó ${col(c.fiado)} y pagó ${col(c.pagado)}</div></div>
    <div class="cb-ops">
      <button type="button" class="cb-op" data-a="fiado-pagar">${ic('efectivo',22)}<span><small>Recibir un pago</small><b>${c.debe>0?'Pagó todo o una parte':'Adelantar un pago'}</b></span>${ic('siguiente',18)}</button>
      ${c.tel&&c.debe>0?`<button type="button" class="cb-op" data-a="fiado-recordar">${ic('enviar',22)}<span><small>WhatsApp</small><b>Recordarle lo que debe</b></span>${ic('siguiente',18)}</button>`:''}
    </div>
    <h3 class="cb-h3">Lo que se llevó y lo que pagó</h3>
    <div class="cb-lista">${movs.map(m=>m.t==='v'?`<button type="button" class="cb-item" data-a="venta-ver" data-id="${m.v.id}"><span class="cb-plato ch m-fiado"><i>${ic('libro',22)}</i></span><span class="cb-item-t"><b>Se llevó · ${esc(diaHora(m.v.fecha))}</b><small>${esc(m.v.numero||'')}${m.v.pagada?' · pagada':m.v.abonado>0?' · abonado '+col(m.v.abonado):''}</small></span><span class="cb-item-m debe">${col(m.v.total)}</span></button>`
      :`<button type="button" class="cb-item" data-a="fiado-pago" data-id="${m.p.id}"><span class="cb-plato ch m-${esc(m.p.metodo)}"><i>${ic((METODOS[m.p.metodo]||METODOS.efectivo).i,22)}</i></span><span class="cb-item-t"><b>Pagó · ${esc(diaHora(m.p.fecha))}</b><small>${esc((METODOS[m.p.metodo]||{n:m.p.metodo}).n)}${m.p.usuario?' · recibió '+esc(m.p.usuario):''}</small></span><span class="cb-item-m menos">−${col(m.p.monto)}</span></button>`).join('')}</div>
  </div>`;
};
const diaHora=s=>{try{const d=new Date(/T/.test(String(s))?s:String(s).replace(' ','T'));return d.toLocaleDateString('es-CR',{weekday:'short',day:'numeric',month:'short'}).replace(/\./g,'')+' '+d.toLocaleTimeString('es-CR',{hour:'numeric',minute:'2-digit'});}catch{return String(s||'');}};
async function verFiado(clave){S.fiadoCli=await window.db.fiados.cliente(clave);if(!S.fiadoCli){aviso('Ese cliente ya no tiene fiados');return false;}return true;}
async function pagarFiado(){
  const c=S.fiadoCli;if(!c)return;
  if(!S.caja){aviso('Abrí la caja para recibir pagos');return;}
  if(S.est.k==='lee'){pedirCaja();return;}
  const n=await pedirMonto({titulo:`¿Cuánto paga ${c.cliente||'el cliente'}?`,sub:c.debe>0?`Debe ${col(c.debe)}`:'No debe nada: queda a favor',inicial:c.debe>0?c.debe:0,ok:'Seguir'});
  if(!n)return;
  const metodo=await preguntar({titulo:`Pagó ${col(n)}. ¿Cómo?`,lista:true,opciones:[{n:'En efectivo',v:'efectivo'},{n:'Por SINPE',v:'sinpe'},{n:'Con tarjeta',v:'tarjeta'}]});
  if(!metodo)return;
  let destino='';
  if(metodo==='sinpe'){const ds=destinos();if(ds.length>1){destino=await preguntar({titulo:'¿A quién le hicieron el SINPE?',lista:true,opciones:ds.map(x=>({n:x.label,v:x.label}))});if(!destino)return;}else destino=(ds[0]||{}).label||'';}
  try{
    const r=await window.db.fiados.abonar({cliente:c.cliente,tel:c.tel,monto:n,metodo,sinpe_destino:destino,usuario:S.caja&&S.caja.usuario||''});
    if(!r||r.ok===false)throw new Error(r&&r.error||'pago');
    window.POSWEB.subir();vib([18,60,30]);
    const ahora=r.pendiente?Math.max(0,c.debe-n):+r.debe||0;
    await verFiado(c.clave);await cargarHoy();pintar();
    const avisar=c.tel?await preguntar({titulo:r.pendiente?'Pago en la fila':`Listo: ahora debe ${col(ahora)}`,texto:metodo==='efectivo'?`Entraron ${col(n)} al cajón.`:'',opciones:[{n:'Mandarle el comprobante',v:true},{n:'Listo',v:false}]}):(aviso(`Listo: ahora debe ${col(ahora)}`,4200),false);
    if(avisar)window.open('https://wa.me/506'+c.tel+'?text='+encodeURIComponent(`*${S.cfg.empresa_nombre||'ARAMO'}* · ${SUCS[S.suc]||''}\nRecibimos su pago de ${col(n)} (${(METODOS[metodo]||{n:metodo}).n}).\n${ahora>0?'Queda debiendo '+col(ahora)+'.':'¡Quedó al día! Gracias.'}`),'_blank','noopener');
  }catch(e){if(!errorCaja(e))aviso('No se pudo anotar el pago: '+(e&&e.message||e),5000);}
}
function recordarFiado(){
  const c=S.fiadoCli;if(!c||!c.tel)return;
  const pend=c.ventas.filter(v=>!v.pagada).map(v=>`· ${diaHora(v.fecha)}: ${col(v.total-(v.abonado||0))}`).slice(-8).join('\n');
  window.open('https://wa.me/506'+c.tel+'?text='+encodeURIComponent(`Hola ${c.cliente||''}, le saluda ${S.cfg.empresa_nombre||'ARAMO'} (${SUCS[S.suc]||''}).\nLe recordamos que tiene pendiente *${col(c.debe)}*:\n${pend}\n¡Gracias!`),'_blank','noopener');
}
async function verPagoFiado(id){
  const p=(S.fiadoCli&&S.fiadoCli.pagos||[]).find(x=>x.id===id);if(!p)return;
  const r=await abrirHoja(`<h2 class="cb-hoja-t">Pago de ${col(p.monto)}</h2><p class="cb-hoja-s">${esc(diaHora(p.fecha))} · ${esc((METODOS[p.metodo]||{n:p.metodo}).n)}${p.usuario?' · recibió '+esc(p.usuario):''}</p>
    <div class="cb-hoja-bot"><button type="button" class="cb-segundo cb-mal" data-h="anular">${ic('borrar',18)}<span>Anular este pago</span></button></div>`,{click(a){cerrarHoja(a);}});
  if(r!=='anular')return;
  const a=await pedirAdmin('Anular el pago de '+col(p.monto),'Solo un administrador. PIN de administrador.');if(!a)return;
  try{const x=await window.db.fiados.anularPago(p.id,{motivo:'Anulado desde el teléfono',quien:a.nombre||''});if(x&&x.ok===false)throw new Error(x.error);window.POSWEB.subir();aviso('Pago anulado');await verFiado(S.fiadoCli.clave);await cargarHoy();pintar();}
  catch(e){if(!errorCaja(e))aviso('No se pudo anular el pago');}
}

// ══════════════ Moverse ══════════════
function pintar(dir){
  const v=vista();raiz.dataset.vista=v;
  raiz.innerHTML=`<section class="cb-vista${dir?' cb-'+dir:''}" data-v="${v}">${V[v]()}</section>`;
  pintarEstado();DESPUES[v]&&DESPUES[v]();
}
function ir(v){pila.push(v);pintar('adelante');}
function volver(){
  if(!hojaEl.hidden){cerrarHoja();return true;}
  const v=vista();
  if(v==='abrir'){const a=S.apert;if(a&&a.paso==='monto'){a.paso='pin';a.pin='';pintar('atras');return true;}if(a&&a.paso==='pin'&&S.cajeros.length>1){a.paso='quien';pintar('atras');return true;}return false;}
  if(v==='venta'&&S.q){S.q='';pintar();return true;} // con algo escrito, «atrás» solo limpia el buscador
  if(pila.length<2)return false;
  if(v==='listo'){pila.length=1;S.ultima=null;}else pila.pop();
  if(v==='cantidad')S.cant=null;
  if(v==='fiadoCli'&&vista()==='fiados'){cargarFiados().then(()=>{if(vista()==='fiados')pintar();});}
  pintar('atras');return true;
}
try{history.replaceState({cb:0},'');history.pushState({cb:1},'');}catch{}
window.addEventListener('popstate',()=>{if(volver()){try{history.pushState({cb:1},'');}catch{}}else salir();});

const ACC={
  salir,volver,mas:abrirMas,tomar:tomarCaja,suelto:productoSuelto,cobrar:abrirCobro,pagar,partes:dosPartes,
  // Mandarle el total nuevo al cliente: queda «Esperando tu confirmación» en La Feria y aquí no se cobra hasta que diga que sí
  async 'cot-mandar'(){
    const t=tk();if(!t.pedido||!N||!COT)return;
    await N.refrescarPedido(t.pedido.id).catch(()=>null);
    if(sincCambiosCliente())repintarVenta();
    if(estadoPedido(t)){repintarVenta();return;}
    let o=N.get(t.pedido.id);if(!o)return aviso('No encuentro ese pedido');
    const L=lineasDe(t),dif=COT.diferencias(o,L);
    if(!dif.length){repintarVenta();return cotEstado(t)==='esperando'?ACC['cot-espera']():abrirCobroYa();}
    const uber=COT.necesitaUber(o),nom=esc(String(nombreTk(t)).split(' ')[0]),antes=N.totalDe(o),ahora=COT.totalCon(o,L);
    const r=await abrirHoja(`<h2 class="cb-hoja-t">Mandarle el total nuevo a ${nom}</h2>
      <p class="cb-hoja-s">Le llega a La Feria para que lo revise. Se cobra cuando lo confirme (o cuando te diga que sí).</p>
      <ul class="cb-cambios">${dif.map(c=>`<li>${esc(COT.cambioTxt(c,col))}</li>`).join('')}</ul>
      <div class="cb-cot-tot"><span>Antes <s>${col(antes)}</s></span><b>${uber?'Sin el Uber ':''}${col(ahora)}</b></div>
      ${uber?`<label class="cb-etq">Costo del Uber (miralo en la app de Uber)<input class="cb-campo" id="cbUber" type="text" inputmode="numeric" placeholder="₡ 0" autocomplete="off"></label>`:''}
      <button type="button" class="cb-principal" data-h="ok"><span>Mandárselo</span></button>
      <button type="button" class="cb-segundo" data-h="sigo"><span>Seguir pesando</span></button>`,{
      click(a){if(a==='sigo')return cerrarHoja();if(a!=='ok')return;
        if(uber){const v=Math.round(+String(hojaEl.querySelector('#cbUber').value).replace(/[^0-9]/g,''));if(!(v>0)){aviso('Falta el costo del Uber');hojaEl.querySelector('#cbUber').focus();return;}return cerrarHoja({uber:v});}
        cerrarHoja({});}});
    if(!r)return;
    try{
      if(r.uber)await N.costoRealUber(o.id,r.uber);
      o=await COT.mandar(o.id,L,'ARAMO POS celular',S.cajero&&S.cajero.nombre||miNombre());
    }catch(e){console.warn(e);return aviso('No se pudo mandar. Revisá el internet y probá otra vez.',5000);}
    L.forEach(l=>{if(l.k&&!l._i.ped)l._i.ped=l.k;}); // lo agregado queda unido a su producto nuevo del pedido
    sincEnvio(t);guardar();vib([20,40,20]);repintarVenta();
    if(!o||N.faseDe(o)!=='confirmacion')return aviso('El pedido cambió en otro lado: revisalo.',5000);
    ACC['cot-espera']({mandado:true});
  },
  // Esperando que confirme: avisarle por WhatsApp, o «Ya me dijo que sí» si lo dijo en persona o por teléfono
  async 'cot-espera'(op){
    const t=tk();if(!t.pedido||!N||!COT)return;
    const o=N.get(t.pedido.id);if(!o)return;
    if(cotEstado(t)!=='esperando'){repintarVenta();return;}
    const nom=esc(String(nombreTk(t)).split(' ')[0]),tel=t.tel||(o.cliente&&o.cliente.tel)||'';
    const r=await abrirHoja(`<h2 class="cb-hoja-t">${op&&op.mandado?'Listo: le llegó a '+nom:'Esperando que '+nom+' confirme'}</h2>
      <p class="cb-hoja-s">El total nuevo es <b>${col(N.totalDe(o))}</b>. Apenas lo confirme en La Feria, aquí se puede cobrar.</p>
      <div class="cb-hoja-bot">${tel?`<button type="button" class="cb-segundo cb-wa" data-h="wa"><span>Avisarle por WhatsApp</span></button>`:''}
      <button type="button" class="cb-segundo" data-h="si"><span>Ya me dijo que sí · cobrar</span></button>
      <button type="button" class="cb-segundo" data-h="no"><span>Seguir pesando</span></button></div>`,{
      click(a){if(a==='wa'){try{window.open(N.wa(tel,COT.waTexto(N.get(o.id)||o)),'_blank');}catch(e){}return;}if(a==='si'||a==='no')cerrarHoja(a);}});
    if(r!=='si')return;
    try{await COT.confirmarTienda(o.id,S.cajero&&S.cajero.nombre||miNombre(),'ARAMO POS celular');}catch(e){return aviso('No se pudo guardar. Revisá el internet y probá otra vez.',5000);}
    repintarVenta();
    if(cotEstado(t)==='cobrar')abrirCobroYa();
  },
  limpiar(){S.q='';const i=D.getElementById('cbQ');if(i){i.value='';i.focus();}pintarRes();},
  voz:escuchar,
  prod(b){const p=S.porId.get(+b.dataset.id);if(p)elegir(p);},
  async cta(b){if(b.dataset.id===S.act){await ponerCliente();repintarVenta();return;}S.act=b.dataset.id;guardar();repintarVenta();},
  async 'cta-nueva'(){cuentaNueva();guardar();repintarVenta();await ponerCliente({nueva:true});repintarVenta();const i=D.getElementById('cbQ');if(i)i.focus();},
  'cant-ok':listoCant,
  precio(){cambiarPrecio(false);},
  modo(b){const c=S.cant,k=b.dataset.k;if(!c)return;if(k==='plata'){if(c.modo!=='plata'){c.modo='plata';c.raw='';c.fresco=false;}}else{if(c.modo==='plata'){c.modo='peso';c.raw='';}c.g=k==='g';}pintarCant();},
  quitar(){const c=S.cant;if(!c||!c.it)return;const t=tk(),it=c.it;t.items=t.items.filter(x=>x!==it);guardar();S.cant=null;volver();aviso(it.n+' quitado de la cuenta');},
  item(b){const it=tk().items.find(i=>i.id===b.dataset.id);if(!it)return;const p=S.porId.get(it.pid)||preparar({id:null,nombre:it.n,precio:it.pu,unidad:it.u,gen:it.gen,categoria_color:it.col,emoji:it.e});abrirCant(p,it);},
  async vaciar(){const t=tk();const si=await preguntar({titulo:`¿Vaciar la cuenta de ${nombreTk(t)}?`,texto:t.pedido?(estadoPedido(t)?'Se quita de este teléfono.':'Se quita de aquí y el pedido vuelve al Mostrador, sin cobrar.'):'Se quitan todos los productos de esta cuenta.',opciones:[{n:t.pedido?'Sí, quitarla':'Sí, vaciar',v:true,mal:true},{n:'No',v:false}]});if(!si)return;
    if(t.pedido&&!estadoPedido(t))soltarPedido(t,'Se quitó del ARAMO POS celular: volvió al Mostrador');
    S.tk=S.tk.filter(x=>x!==t);if(!S.tk.length)cuentaNueva();S.act=S.tk[0].id;guardar();pila.length=1;pintar();},
  async cliente(){await ponerCliente();pintar();},
  async retomar(){const t=tk();if(!t.pedido)return;await N.cambiar(t.pedido.id,x=>{x.enCaja=marcaCaja();},'tienda','Volvió al ARAMO POS celular para cobrarlo').catch(()=>null);repintarVenta();aviso('El pedido volvió a este teléfono');},
  async descuento(b){if(vista()==='ventas'){await cargarDescuentos(b&&b.dataset&&b.dataset.d||hoyISO());ir('descuentos');return;}await hacerDescuento();pintar();},
  metodo(b){const P=S.pago;if(!P)return;P.metodo=b.dataset.k;P.parte=null;pintarPago();},
  billete(b){S.pago.recibido=+b.dataset.n||0;pintarPago();},
  async 'otro-monto'(){const T=totalDe(tk()),n=await pedirMonto({titulo:'¿Con cuánto paga?',sub:`La cuenta es de ${col(T.total)}`});if(n===undefined||!S.pago)return;if(n<T.total){aviso('Eso no alcanza para '+col(T.total));return;}S.pago.recibido=n;pintarPago();},
  destino(b){S.pago.destino=b.dataset.l;pintarPago();},
  'destino-nuevo':destinoNuevo,
  'parte-quitar'(){S.pago.parte=null;pintarPago();},
  siguiente(){S.ultima=null;pila.length=1;pintar('atras');quizasRecargar(true);},
  factura(){S.ultima&&enviarFactura(S.ultima.v,S.ultima.tel).then(()=>{if(vista()==='listo')pintar();});},
  imprimir(){S.ultima&&imprimirFactura(S.ultima.v);},
  async ventas(){await cargarVentas(hoyISO());ir('ventas');},
  async 'ventas-dia'(b){await cargarVentas(b.dataset.d);pintar();},
  async descuentos(b){await cargarDescuentos(b&&b.dataset&&b.dataset.d||hoyISO());ir('descuentos');},
  async 'desc-dia'(b){await cargarDescuentos(b.dataset.d);pintar();},
  'venta-ver'(b){verVenta(+b.dataset.id);},
  'ped-aceptar'(b){aceptarPedido(b.dataset.id);},
  async 'fiado-ver'(b){if(await verFiado(b.dataset.k))ir('fiadoCli');},
  'fiado-pagar':pagarFiado,
  bascula:conectarBascula,'fiado-recordar':recordarFiado,
  'fiado-pago'(b){verPagoFiado(+b.dataset.id);},
  quien(b){const c=S.cajeros.find(x=>x.id===+b.dataset.id);if(!c)return;S.apert.cajero=c;S.apert.paso='pin';S.apert.pin='';pintar('adelante');},
  'abrir-ok':abrirCaja,'cerrar-caja':cerrarCaja,
};
D.addEventListener('click',e=>{
  S.toque=Date.now();
  if(!hojaEl.hidden){const h=e.target.closest('[data-h]');if(h&&hojaEl.contains(h)){if(h.dataset.h==='cerrar')cerrarHoja();else hojaClick&&hojaClick(h.dataset.h,h);return;}}
  const k=e.target.closest('[data-k].cb-tecla');if(k&&e.detail===0){alTeclear(k.dataset.k);return;} // con teclado físico o lector de pantalla
  const b=e.target.closest('[data-a]');if(!b||!raiz.contains(b)||b.disabled)return;
  const fn=ACC[b.dataset.a];if(fn)Promise.resolve(fn(b,e)).catch(err=>{console.error(err);if(!errorCaja(err))aviso('Algo no salió bien. Probá otra vez.');});
});
function alTeclear(k){if(hojaTecla&&!hojaEl.hidden)hojaTecla(k);else if(vista()==='cantidad')teclaCant(k);else if(vista()==='abrir')teclaAbrir(k);}
D.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.cb-tecla');if(!b||b.disabled)return;
  e.preventDefault();S.toque=Date.now();b.classList.add('on');setTimeout(()=>b.classList.remove('on'),130);vib(6);alTeclear(b.dataset.k);
});
D.addEventListener('keydown',e=>{
  if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName)){if(e.key==='Enter'&&e.target.id==='cbQ'){const r=buscar(S.q);if(r.length)elegir(r[0]);}return;}
  const conTeclas=(hojaTecla&&!hojaEl.hidden)||vista()==='cantidad'||vista()==='abrir';
  if(conTeclas&&/^\d$/.test(e.key))alTeclear(e.key);
  else if(conTeclas&&(e.key===','||e.key==='.'))alTeclear(',');
  else if(conTeclas&&e.key==='Backspace')alTeclear('b');
  else if(e.key==='Enter'&&!(e.target&&e.target.tagName==='BUTTON')){const b=!hojaEl.hidden?hojaEl.querySelector('[data-h="ok"]'):raiz.querySelector('.cb-dock .cb-principal,#cbCantOk,#cbAbrirOk');if(b&&!b.disabled)b.click();}
  else if(e.key==='Escape')volver();
});
D.addEventListener('input',e=>{if(e.target.id!=='cbQ')return;S.q=e.target.value;S.porVoz=false;S.toque=Date.now();pintarRes();const c=D.getElementById('cbCuerpo'),b=D.getElementById('cbBusca');if(c&&b&&S.q)c.scrollTop=Math.max(0,b.offsetTop-6);});

// ── Buscar hablando ──
let rec=null;
function escuchar(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
  if(rec){try{rec.stop();}catch{}return;}
  const caja=D.getElementById('cbBusca'),inp=D.getElementById('cbQ');
  try{
    rec=new SR();rec.lang='es-CR';rec.interimResults=true;rec.maxAlternatives=1;
    rec.onresult=e=>{
      let t='';for(const r of e.results)t+=r[0].transcript;
      S.q=t.trim().replace(/[.¿?¡!]+$/,'');S.porVoz=true;if(inp)inp.value=S.q;pintarRes();
      if(e.results[e.results.length-1].isFinal){const r=buscar(S.q);if(r.length===1||(r.length&&r[0]._n===norm(S.q)))elegir(r[0]);}
    };
    rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed')aviso('Dale permiso al micrófono para buscar hablando');else if(e.error==='no-speech')aviso('No te escuché. Tocá el micrófono y decí el producto.');};
    rec.onend=()=>{rec=null;const c=D.getElementById('cbBusca');c&&c.classList.remove('oye');const i=D.getElementById('cbQ');if(i)i.placeholder='¿Qué producto?';};
    rec.start();caja&&caja.classList.add('oye');if(inp){inp.value='';inp.placeholder='Te escucho…';}S.q='';pintarRes();vib(12);
  }catch{rec=null;aviso('El micrófono no está disponible aquí');}
}

// ── Datos ──
async function cargarProductos(){
  const l=await window.db.productos.listar();
  S.prods=l.map(preparar);S.porId=new Map(S.prods.map(p=>[p.id,p]));
}
async function cargarHoy(){try{const h=hoyISO(),r=await window.db.reportes.resumen(h,h);S.hoy={n:+r.stats.total_transacciones||0,total:+r.stats.total_ventas||0,desc:+r.stats.total_descuentos||0};}catch{S.hoy=null;}}
async function cargar(){
  const db=window.db,h=hoyISO(),d=hoyISO(new Date(Date.now()-45*864e5));
  const [caja,promos,cfg,dmax,top,cajeros]=await Promise.all([db.caja.actual(),db.promociones.listar(),db.config.obtenerTodo(),db.caja.descuentoMax(),db.reportes.topProductos(d,h,80),db.cajeros.listar(),cargarProductos(),cargarHoy()]);
  S.caja=caja;S.promos=(promos||[]).filter(x=>x.activo);S.cfg=cfg||{};S.descMax=dmax??100;S.cajeros=cajeros||[];
  S.top=new Map((top||[]).filter(x=>x.producto_id).map(x=>[x.producto_id,+x.num_ventas||0]));
  S.cajero=caja?await db.cajeros.porNombre(caja.usuario):null;
}
async function refrescar(){
  if(!S.suc||Date.now()-(S.fresco||0)<20000)return;S.fresco=Date.now();
  try{await Promise.all([cargarProductos(),cargarHoy()]);const c=await window.db.caja.actual();
    if(!c&&S.caja){S.caja=null;pedirApertura();pintar();return;}
    if(vista()==='venta'&&hojaEl.hidden&&!S.q)repintarVenta();}catch{}
}

// La copia del POS se puso al día por detrás (otro aparato cobró, o se hizo algo de la fila): se vuelve a leer
let tNueva=0;
window.addEventListener('pos-base-nueva',()=>{clearTimeout(tNueva);tNueva=setTimeout(alDia,200);});
async function alDia(){
  if(!S.suc)return;
  try{
    await Promise.all([cargarProductos(),cargarHoy()]);
    const c=await window.db.caja.actual();
    if(!c&&S.caja&&!S.pagando){S.caja=null;S.cajero=null;if(vista()==='venta'&&hojaEl.hidden){pedirApertura();pintar();}return;}
    if(c&&(!S.caja||S.caja.id!==c.id)){S.caja=c;S.cajero=await window.db.cajeros.porNombre(c.usuario);if(vista()==='abrir'){pila.length=1;pila[0]='venta';pintar();return;}}
    if(!hojaEl.hidden)return;
    if(vista()==='venta'&&!S.q)repintarVenta();
    else if(vista()==='ventas'){await cargarVentas();pintar();}
    else if(vista()==='fiados'){await cargarFiados();pintar();}
    else if(vista()==='fiadoCli'&&S.fiadoCli){await verFiado(S.fiadoCli.clave);pintar();}
    else if(vista()==='caja'&&S.caja){S.resumen=await window.db.caja.resumen(S.caja.id);pintar();}
  }catch(e){console.warn('[cobrar] al día',e);}
}

// ── La pantalla no se apaga mientras se cobra; lo nuevo entra solo ──
let wl=null;
async function despierto(){try{if('wakeLock' in navigator&&D.visibilityState==='visible'&&!wl){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null;});}}catch{}}
D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='visible'){despierto();refrescar();try{window.POSWEB.latido();}catch{}}});
// Se recarga sola (las cuentas no se pierden) cuando hay versión nueva de la app, o cuando este
// teléfono está solo mirando y el otro aparato ya subió ventas nuevas.
function quizasRecargar(ya){
  if(!S.nueva&&!S.viejo)return;
  const quieto=vista()==='venta'&&!S.q&&hojaEl.hidden&&D.activeElement!==D.getElementById('cbQ')&&(S.viejo||!tk().items.length);
  if(quieto&&(ya||Date.now()-S.toque>2500)){guardar();location.reload();}
}
try{if('serviceWorker' in navigator){const tenia=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(tenia)S.nueva=true;});}}catch{}
setInterval(()=>quizasRecargar(false),4000);
setInterval(()=>{if(S.est.k==='lee'&&D.visibilityState==='visible')try{window.POSWEB.latido();}catch{}},10000); // mirando: pregunta más seguido si hay algo nuevo

// el alto de verdad (con el teclado del teléfono abierto, lo de abajo queda encima del teclado)
function alto(){const v=window.visualViewport;D.documentElement.style.setProperty('--cb-alto',(v?v.height:window.innerHeight)+'px');if(v&&v.offsetTop)window.scrollTo(0,0);}
if(window.visualViewport){window.visualViewport.addEventListener('resize',alto);window.visualViewport.addEventListener('scroll',alto);}
window.addEventListener('resize',alto);alto();

// pos-web.js avisa «tocá el estado y Usar la caja aquí»: en esta cara eso es el botón «Cobrar aquí»
function callarAvisoViejo(){try{const pt=D.getElementById('pwToast');if(!pt)return;const ve=()=>{if(pt.classList.contains('show')&&/Usar la caja aqu/.test(pt.textContent))pt.classList.remove('show');};ve();new MutationObserver(ve).observe(pt,{attributes:true,childList:true,characterData:true,subtree:true});}catch{}}

// ── Arranque ──
(async function(){
  try{
    await window.POSWEB.listo;
    callarAvisoViejo();
    S.suc=window.POSWEB.estado().SUC;
    D.title='ARAMO POS celular · '+(SUCS[S.suc]||'');
    recuperar();
    await cargar();
    leerEstado();setInterval(leerEstado,700);
    if(!S.caja)pedirApertura();
    pintar();despierto();
    if(BA&&BA.recordada())BA.reconectarSola().catch(()=>{});
    if(N){ // los pedidos de La Feria, en vivo (los mismos que ve el Mostrador)
      try{N.on(()=>{sincCambiosCliente();avisoConfirmados();if(vista()==='venta'&&hojaEl.hidden){if(S.q)pintarPedidos();else repintarVenta();}});N.conectar().then(()=>{if(vista()==='venta')pintarPedidos();}).catch(()=>{});}catch{}
      const pid=new URLSearchParams(location.search).get('pedido');
      if(pid&&!S.tk.some(t=>t.pedido&&t.pedido.id===pid)){S.pedidoUrl=pid;if(S.caja)setTimeout(abrirPedidoUrl,400);}
      try{if(pid)history.replaceState(history.state,'',location.pathname+'?suc='+encodeURIComponent(S.suc));}catch{}
    }
    window.CobrarARAMO={S,buscar,calc,totalDe,tk,pintar,pedidos,facturaTxt,alDia}; // para las pruebas
  }catch(e){
    console.error(e);
    raiz.innerHTML=`<section class="cb-vista"><div class="cb-cuerpo"><h1 class="cb-h1">No se pudo abrir</h1><p class="cb-vacio">${esc(e&&e.message||e)}</p><button type="button" class="cb-principal" onclick="location.reload()"><span>Probar otra vez</span></button></div></section>`;
  }
})();
})();
