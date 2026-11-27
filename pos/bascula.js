/* ══════════════════════════════════════════════════════════════════════
   ARAMO POS · Báscula (2026-11-27)
   Lee el peso de una báscula de mostrador y se lo pasa al POS celular, para no
   digitarlo. Sirve con:
   • Bluetooth BLE (Web Bluetooth): adaptadores RS-232→BLE tipo HM-10/«BLE serial»
     (servicio FFE0, característica FFE1), Nordic UART (6e400001…) o una báscula con
     el perfil estándar de peso (0x181D / 0x2A9D). Android con Chrome; en iPhone, el
     navegador Bluefy.
   • Puerto serie (Web Serial): Bluetooth clásico (SPP) emparejado en Android (Chrome
     138 o más nuevo) o un cable USB en la compu.
   Entiende las líneas de texto que mandan casi todas las básculas con salida de datos:
   «  12.34 kg G» (Ohaus), «ST,GS,+  1.250kg», «1,250 kg», «850 g»… Si la báscula solo
   contesta cuando se le pide, le manda «P» cada medio segundo.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const UUID={ffe0:0xffe0,ffe1:0xffe1,nus:'6e400001-b5a3-f393-e0a9-e50e24dcca9e',nusTx:'6e400003-b5a3-f393-e0a9-e50e24dcca9e',nusRx:'6e400002-b5a3-f393-e0a9-e50e24dcca9e',peso:0x181d,pesoMed:0x2a9d};
const SPP='00001101-0000-1000-8000-00805f9b34fb';
const B={estado:'nada',nombre:'',via:'',kg:null,estable:false,ultimo:'',hora:0,error:''};
const subs=new Set();
let disp=null,carac=null,escribir=null,puerto=null,lector=null,buf='',tPedir=0,tCalla=0,fin=false;
const avisar=()=>subs.forEach(f=>{try{f({...B});}catch(e){}});

// ── Entender una línea de texto de la báscula ──
function leerLinea(s){
  const t=String(s||'').replace(/[\x00-\x1f]/g,' ').trim();
  if(!t)return null;
  const m=t.match(/([-+]?\s*\d+(?:[.,]\d+)?)\s*(kg|g|lb|lbs|oz)?\b/i);
  if(!m)return null;
  let v=parseFloat(m[1].replace(/\s/g,'').replace(',','.'));
  if(!isFinite(v))return null;
  let u=(m[2]||'').toLowerCase();
  // sin unidad: un número sin decimales grande (850) son gramos; con decimales (1.250), kilos
  if(!u)u=/[.,]/.test(m[1])||Math.abs(v)<50?'kg':'g';
  const kg=u==='g'?v/1000:u==='lb'||u==='lbs'?v*0.45359237:u==='oz'?v*0.028349523:v;
  const inestable=/\?|\bUS\b|\bMOT|\bM\b|\bU\b/i.test(t)&&!/\bST\b/i.test(t);
  return {kg:Math.round(kg*1000)/1000,estable:!inestable,crudo:t};
}
// El perfil estándar de peso de Bluetooth (Weight Measurement 0x2A9D)
function leerPesoEstandar(dv){
  const flags=dv.getUint8(0),imperial=flags&1,crudo=dv.getUint16(1,true);
  const kg=imperial?crudo*0.01*0.45359237:crudo*0.005;
  return {kg:Math.round(kg*1000)/1000,estable:true,crudo:'0x2A9D '+crudo};
}
function nuevoPeso(p){
  if(!p)return;
  B.kg=p.kg<0?0:p.kg;B.estable=p.estable;B.ultimo=p.crudo;B.hora=Date.now();B.estado='lista';
  clearTimeout(tCalla);tCalla=setTimeout(()=>{if(B.estado==='lista'){B.estado='callada';avisar();}},4000);
  avisar();
}
function trozo(texto){
  buf+=texto;
  const partes=buf.split(/\r\n|\r|\n|\x03/);buf=partes.pop();
  if(buf.length>200)buf=buf.slice(-200);
  for(const l of partes){const p=leerLinea(l);if(p)nuevoPeso(p);}
  // algunas básculas mandan sin fin de línea: si el pedazo ya trae un peso completo con unidad, sirve igual
  if(buf&&/\d\s*(kg|g|lb)\b/i.test(buf)&&buf.length>4){const p=leerLinea(buf);if(p){nuevoPeso(p);buf='';}}
}
const dec=new TextDecoder();
function pedirSiCalla(){
  clearInterval(tPedir);
  // si en 1 s no mandó nada, se le pide el peso («P») cada medio segundo
  setTimeout(()=>{if(!B.hora&&escribir&&!fin)tPedir=setInterval(()=>{escribir('P\r\n').catch(()=>{});},500);},1000);
}

// ── Bluetooth BLE ──
async function conectarBLE(){
  const d=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[UUID.ffe0,UUID.nus,UUID.peso]});
  await abrirBLE(d);
}
async function abrirBLE(d){
  disp=d;B.nombre=d.name||'Báscula Bluetooth';B.via='Bluetooth';B.estado='conectando';avisar();
  d.addEventListener('gattserverdisconnected',()=>{if(fin)return;B.estado='perdida';avisar();setTimeout(()=>reconectarBLE(d),1500);});
  const g=await d.gatt.connect();
  let s;
  if((s=await g.getPrimaryService(UUID.peso).catch(()=>null))){
    carac=await s.getCharacteristic(UUID.pesoMed);
    carac.addEventListener('characteristicvaluechanged',e=>nuevoPeso(leerPesoEstandar(e.target.value)));
    await carac.startNotifications();escribir=null;
  }else{
    let rx=null;
    if((s=await g.getPrimaryService(UUID.ffe0).catch(()=>null))){carac=await s.getCharacteristic(UUID.ffe1);rx=carac;}
    else if((s=await g.getPrimaryService(UUID.nus).catch(()=>null))){carac=await s.getCharacteristic(UUID.nusTx);rx=await s.getCharacteristic(UUID.nusRx).catch(()=>null);}
    else throw new Error('Esa báscula no manda el peso de una forma que el POS entienda.');
    carac.addEventListener('characteristicvaluechanged',e=>trozo(dec.decode(e.target.value)));
    await carac.startNotifications();
    escribir=rx&&(rx.properties.write||rx.properties.writeWithoutResponse)?t=>(rx.properties.writeWithoutResponse?rx.writeValueWithoutResponse(new TextEncoder().encode(t)):rx.writeValue(new TextEncoder().encode(t))):null;
  }
  B.estado='lista';B.error='';guardarRecuerdo({via:'ble',id:d.id,nombre:B.nombre});avisar();pedirSiCalla();
}
async function reconectarBLE(d){if(fin||B.estado==='lista')return;try{await abrirBLE(d);}catch(e){B.estado='perdida';B.error=String(e.message||e);avisar();}}

// ── Puerto serie (Bluetooth clásico en Android, o USB en la compu) ──
async function conectarSerie(){
  let p;
  try{p=await navigator.serial.requestPort({allowedBluetoothServiceClassIds:[SPP]});}
  catch(e){if(e&&e.name==='TypeError')p=await navigator.serial.requestPort();else throw e;}
  await abrirSerie(p);
}
async function abrirSerie(p){
  puerto=p;const info=p.getInfo?p.getInfo():{};
  B.nombre=info.bluetoothServiceClassId?'Báscula Bluetooth':'Báscula por cable';B.via=info.bluetoothServiceClassId?'Bluetooth':'Cable';B.estado='conectando';avisar();
  await p.open({baudRate:+(LSget('aramo_bascula_baudios')||9600)});
  escribir=async t=>{const w=p.writable.getWriter();try{await w.write(new TextEncoder().encode(t));}finally{w.releaseLock();}};
  B.estado='lista';B.error='';guardarRecuerdo({via:'serie'});avisar();pedirSiCalla();
  (async()=>{
    while(p.readable&&!fin){
      lector=p.readable.getReader();
      try{for(;;){const {value,done}=await lector.read();if(done)break;if(value)trozo(dec.decode(value,{stream:true}));}}
      catch(e){B.estado='perdida';B.error=String(e.message||e);avisar();}
      finally{try{lector.releaseLock();}catch(e){}}
      if(fin)break;await new Promise(r=>setTimeout(r,500));
    }
  })();
}

// ── Recordar la última báscula y volver a conectarla sola (si el navegador lo permite sin preguntar) ──
function LSget(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function guardarRecuerdo(r){try{localStorage.setItem('aramo_bascula',JSON.stringify(r));}catch(e){}}
async function reconectarSola(){
  let r=null;try{r=JSON.parse(LSget('aramo_bascula')||'null');}catch(e){}
  if(!r||B.estado==='lista'||B.estado==='conectando')return false;
  try{
    if(r.via==='serie'&&navigator.serial&&navigator.serial.getPorts){const ps=await navigator.serial.getPorts();if(ps[0]){await abrirSerie(ps[0]);return true;}}
    if(r.via==='ble'&&navigator.bluetooth&&navigator.bluetooth.getDevices){const ds=await navigator.bluetooth.getDevices();const d=ds.find(x=>x.id===r.id)||ds[0];if(d){await abrirBLE(d);return true;}}
  }catch(e){B.estado='nada';B.error=String(e.message||e);avisar();}
  return false;
}

window.Bascula={
  soportada:()=>!!(navigator.bluetooth||navigator.serial),
  formas:()=>({bluetooth:!!navigator.bluetooth,serie:!!navigator.serial}),
  recordada:()=>{try{return !!JSON.parse(LSget('aramo_bascula')||'null');}catch(e){return false;}},
  estado:()=>({...B}),
  on(f){subs.add(f);return()=>subs.delete(f);},
  async conectar(via){
    fin=false;B.error='';
    try{
      if(via==='serie'||(!via&&!navigator.bluetooth&&navigator.serial))await conectarSerie();
      else await conectarBLE();
      return true;
    }catch(e){
      B.estado='nada';B.error=e&&e.name==='NotFoundError'?'':String(e&&e.message||e);avisar();
      return false;
    }
  },
  reconectarSola,
  async desconectar(){
    fin=true;clearInterval(tPedir);clearTimeout(tCalla);
    try{if(carac)await carac.stopNotifications();}catch(e){}
    try{if(disp&&disp.gatt&&disp.gatt.connected)disp.gatt.disconnect();}catch(e){}
    try{if(lector)await lector.cancel();}catch(e){}
    try{if(puerto)await puerto.close();}catch(e){}
    disp=carac=escribir=puerto=lector=null;buf='';
    Object.assign(B,{estado:'nada',nombre:'',via:'',kg:null,estable:false,hora:0});
    try{localStorage.removeItem('aramo_bascula');}catch(e){}
    avisar();
  },
  _leerLinea:leerLinea, // para las pruebas
};
})();
