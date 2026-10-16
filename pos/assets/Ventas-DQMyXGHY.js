import{r as s,j as e,f as L,g as $t,c as zt,u as ct,a as Et,M as ke,e as Dt}from"./index-DWj2HEej.js";const Tt=[1e3,2e3,5e3,1e4,2e4,5e4],Mt=`
  .pm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(3px);
  }
  .pm-modal {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 480px;
    max-height: 92vh;
    overflow-y: auto;
    box-shadow: 0 32px 80px rgba(0,0,0,0.42);
    display: flex; flex-direction: column;
    animation: pm-in 0.2s ease;
  }
  @keyframes pm-in {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  .pm-header {
    background: #1a472a;
    border-radius: 20px 20px 0 0;
    padding: 18px 22px;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .pm-header-title {
    font-size: 20px; font-weight: 900;
    letter-spacing: 2.5px; text-transform: uppercase; color: #fff;
  }
  .pm-close {
    width: 32px; height: 32px; border-radius: 50%;
    border: none; background: rgba(255,255,255,0.15);
    cursor: pointer; font-size: 15px;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.85); transition: background 0.15s;
  }
  .pm-close:hover { background: rgba(255,255,255,0.28); }

  .pm-total-section {
    padding: 22px 24px 18px;
    text-align: center;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
  }
  .pm-total-lbl {
    font-size: 10px; font-weight: 800;
    letter-spacing: 2px; text-transform: uppercase;
    color: #aaa; margin-bottom: 4px;
  }
  .pm-total-val {
    font-size: 46px; font-weight: 900;
    color: #FF8C00; letter-spacing: -1.5px; line-height: 1;
  }

  .pm-modo-grid {
    display: grid; grid-template-columns: repeat(3,1fr);
    gap: 10px; padding: 18px 20px 14px; flex-shrink: 0;
  }
  .pm-modo-btn {
    border: 2px solid #e8e8e8; border-radius: 14px;
    background: #fff; cursor: pointer;
    padding: 16px 8px 13px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    transition: all 0.15s; font-family: inherit;
  }
  .pm-modo-btn:hover:not(.sel) { border-color: #a5d6a7; background: #f9fdf9; }
  .pm-modo-btn.sel {
    border-color: #FF8C00; background: #f0fdf4;
    box-shadow: 0 0 0 3px rgba(255,140,0,0.13);
  }
  .pm-modo-icon { font-size: 30px; line-height: 1; }
  .pm-modo-lbl  { font-size: 12px; font-weight: 800; color: #333; }
  .pm-modo-btn.sel .pm-modo-lbl { color: #1a472a; }

  .pm-panel { padding: 4px 20px 18px; overflow-y: auto; }

  .pm-fl { font-size: 12px; font-weight: 700; color: #666; margin-bottom: 6px; }

  .pm-monto-wrap { position: relative; margin-bottom: 12px; }
  .pm-monto-pfx {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 18px; font-weight: 900; color: #1a472a; pointer-events: none;
  }
  .pm-monto-in {
    width: 100%; box-sizing: border-box;
    padding: 13px 16px 13px 34px;
    font-size: 30px; font-weight: 900; text-align: right;
    border: 2px solid #c8e6c9; border-radius: 12px;
    outline: none; color: #1a472a; background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s; font-family: inherit;
  }
  .pm-monto-in:focus { border-color: #1a472a; box-shadow: 0 0 0 3px rgba(26,71,42,0.10); }

  .pm-atajos { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .pm-at {
    padding: 6px 11px; border-radius: 8px;
    border: 1.5px solid #d0e8d2; background: #fff;
    color: #2E7D32; font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.12s; font-family: inherit;
  }
  .pm-at:hover { background: #e8f5e9; border-color: #1a472a; }
  .pm-at.orange { border-color: #FFB74D; color: #E65100; background: #FFF8E1; }
  .pm-at.orange:hover { background: #FFE0B2; border-color: #FF8C00; }

  .pm-cambio {
    background: #E8F5E9; border: 1.5px solid #a5d6a7; border-radius: 12px;
    padding: 14px 18px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .pm-cambio-lbl { font-size: 13px; font-weight: 800; color: #2E7D32; }
  .pm-cambio-val { font-size: 28px; font-weight: 900; color: #1B5E20; }

  .pm-info-box {
    background: #f5f5f5; border-radius: 10px;
    padding: 10px 14px; margin-bottom: 12px;
    font-size: 13px; color: #777;
    display: flex; align-items: center; gap: 8px;
  }

  .pm-mx-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
  .pm-mx-lbl { font-size: 12px; font-weight: 800; color: #555; }
  .pm-mx-wrap { position: relative; }
  .pm-mx-pfx {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    font-size: 15px; font-weight: 900; color: #1a472a; pointer-events: none;
  }
  .pm-mx-in {
    width: 100%; box-sizing: border-box;
    padding: 10px 14px 10px 28px;
    font-size: 20px; font-weight: 800; text-align: right;
    border: 2px solid #e0e0e0; border-radius: 10px;
    outline: none; color: #1a472a; background: #fff;
    transition: border-color 0.15s; font-family: inherit;
  }
  .pm-mx-in:focus { border-color: #1a472a; }

  .pm-sinpe-num {
    background: #E3F2FD; border-radius: 8px;
    padding: 8px 12px; margin-bottom: 8px;
    display: flex; align-items: center; gap: 10px;
  }

  .pm-res {
    background: #f6f6f6; border-radius: 12px;
    padding: 14px 16px; margin-top: 10px;
  }
  .pm-res-row {
    display: flex; justify-content: space-between;
    align-items: center; padding: 4px 0; font-size: 13px;
  }

  .pm-footer {
    padding: 14px 20px 20px;
    border-top: 1px solid #f0f0f0;
    display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
  }
  .pm-btn-cobrar {
    width: 100%; padding: 16px 20px;
    font-size: 17px; font-weight: 900;
    color: #fff; background: #FF8C00; border: none; border-radius: 12px;
    cursor: pointer; letter-spacing: 0.5px;
    box-shadow: 0 4px 20px rgba(255,140,0,0.38);
    transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
    font-family: inherit;
  }
  .pm-btn-cobrar:hover:not(:disabled) {
    background: #E65100; transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(255,140,0,0.50);
  }
  .pm-btn-cobrar:active:not(:disabled) { transform: translateY(0); }
  .pm-btn-cobrar:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; transform: none; }
  .pm-btn-cancel {
    width: 100%; padding: 10px 20px;
    font-size: 13px; font-weight: 600; color: #888;
    background: transparent; border: 1.5px solid #e0e0e0; border-radius: 10px;
    cursor: pointer; transition: background 0.12s, color 0.12s; font-family: inherit;
  }
  .pm-btn-cancel:hover { background: #f5f5f5; color: #555; }
`;function It({total:o,sinpeNumero:M,onConfirmar:$,onCerrar:D}){const[h,E]=s.useState("efectivo"),[C,T]=s.useState(String(o)),[S,a]=s.useState(String(o)),[f,j]=s.useState(""),[A,w]=s.useState(""),[_,G]=s.useState(""),[U,N]=s.useState(!1),g=s.useRef(null),z=s.useRef(null),H=s.useRef(null);s.useEffect(()=>{setTimeout(()=>{var i;return(i=g.current)==null?void 0:i.select()},80)},[]),s.useEffect(()=>{const i=setTimeout(()=>{var k,Y,O;h==="efectivo"?(k=g.current)==null||k.select():h==="tarjeta"?(Y=z.current)==null||Y.select():(O=H.current)==null||O.focus()},70);return()=>clearTimeout(i)},[h]),s.useEffect(()=>{const i=k=>{k.key==="Escape"&&D()};return window.addEventListener("keydown",i),()=>window.removeEventListener("keydown",i)},[D]);const K=parseFloat(C)||0,v=parseFloat(S)||0,F=parseFloat(f)||0,c=parseFloat(A)||0,I=parseFloat(_)||0;let y,m,J=0,R,b,p,d,x;if(h==="efectivo")m=Math.max(0,K-o),y=K>=o,R="efectivo",b=K,p=K,d=0,x=0;else if(h==="tarjeta")m=0,y=v>=o-.5,R="tarjeta",b=v,p=0,d=v,x=0;else{J=o-(F+c+I),y=J<=.5;const i=Math.max(0,o-c-I);m=Math.max(0,F-i);const k=[F>0&&"efectivo",c>0&&"tarjeta",I>0&&"sinpe"].filter(Boolean);R=k.length===1?k[0]:"mixto",b=F,p=F,d=c,x=I}async function u(){!y||U||(N(!0),await $({metodo_pago:R,monto_recibido:b,cambio:m,pago_efectivo:p,pago_tarjeta:d,pago_sinpe:x}),N(!1))}return e.jsxs("div",{className:"pm-overlay",onClick:D,children:[e.jsx("style",{children:Mt}),e.jsxs("div",{className:"pm-modal",onClick:i=>i.stopPropagation(),children:[e.jsxs("div",{className:"pm-header",children:[e.jsx("span",{className:"pm-header-title",children:"💰 Cobrar"}),e.jsx("button",{className:"pm-close",onClick:D,children:"✕"})]}),e.jsxs("div",{className:"pm-total-section",children:[e.jsx("div",{className:"pm-total-lbl",children:"Total a pagar"}),e.jsx("div",{className:"pm-total-val",children:L(o)})]}),e.jsx("div",{className:"pm-modo-grid",children:[{k:"efectivo",icon:"💵",lbl:"Efectivo"},{k:"tarjeta",icon:"💳",lbl:"Tarjeta"},{k:"mixto",icon:"🔀",lbl:"Mixto"}].map(i=>e.jsxs("button",{className:`pm-modo-btn${h===i.k?" sel":""}`,onClick:()=>E(i.k),children:[e.jsx("span",{className:"pm-modo-icon",children:i.icon}),e.jsx("span",{className:"pm-modo-lbl",children:i.lbl})]},i.k))}),e.jsxs("div",{className:"pm-panel",children:[h==="efectivo"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"pm-fl",children:"Pagó con:"}),e.jsxs("div",{className:"pm-monto-wrap",children:[e.jsx("span",{className:"pm-monto-pfx",children:"₡"}),e.jsx("input",{ref:g,className:"pm-monto-in",type:"number",min:"0",step:"50",value:C,placeholder:"0",onChange:i=>T(i.target.value.replace(/[^0-9.]/g,"")),onKeyDown:i=>{i.key==="Enter"&&y&&u()}})]}),e.jsxs("div",{className:"pm-atajos",children:[Tt.map(i=>e.jsxs("button",{className:"pm-at",onClick:()=>{var k;T(String(i)),(k=g.current)==null||k.focus()},children:["₡",i>=1e3?i/1e3+"K":i]},i)),e.jsx("button",{className:"pm-at orange",onClick:()=>{var i;T(String(o)),(i=g.current)==null||i.focus()},children:"Exacto"})]}),e.jsxs("div",{className:"pm-cambio",children:[e.jsx("span",{className:"pm-cambio-lbl",children:"Su cambio:"}),e.jsx("span",{className:"pm-cambio-val",children:y?L(m):"—"})]})]}),h==="tarjeta"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"pm-info-box",children:[e.jsx("span",{style:{fontSize:20},children:"💳"}),e.jsx("span",{children:"Ingresá el monto cobrado por tarjeta débito o crédito"})]}),e.jsx("div",{className:"pm-fl",children:"Monto tarjeta:"}),e.jsxs("div",{className:"pm-monto-wrap",children:[e.jsx("span",{className:"pm-monto-pfx",children:"₡"}),e.jsx("input",{ref:z,className:"pm-monto-in",type:"number",min:"0",step:"50",value:S,placeholder:"0",onChange:i=>a(i.target.value.replace(/[^0-9.]/g,"")),onKeyDown:i=>{i.key==="Enter"&&y&&u()}})]}),e.jsxs("button",{className:"pm-at orange",style:{marginBottom:12},onClick:()=>{var i;a(String(o)),(i=z.current)==null||i.focus()},children:["Cobrar total — ",L(o)]})]}),h==="mixto"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"pm-mx-row",children:[e.jsx("div",{className:"pm-mx-lbl",children:"💵 Efectivo"}),e.jsxs("div",{className:"pm-mx-wrap",children:[e.jsx("span",{className:"pm-mx-pfx",children:"₡"}),e.jsx("input",{ref:H,className:"pm-mx-in",type:"number",min:"0",step:"50",placeholder:"0",value:f,onChange:i=>j(i.target.value.replace(/[^0-9.]/g,""))})]})]}),e.jsxs("div",{className:"pm-mx-row",children:[e.jsx("div",{className:"pm-mx-lbl",children:"💳 Tarjeta"}),e.jsxs("div",{className:"pm-mx-wrap",children:[e.jsx("span",{className:"pm-mx-pfx",children:"₡"}),e.jsx("input",{className:"pm-mx-in",type:"number",min:"0",step:"50",placeholder:"0",value:A,onChange:i=>w(i.target.value.replace(/[^0-9.]/g,""))})]})]}),e.jsxs("div",{className:"pm-mx-row",children:[e.jsx("div",{className:"pm-mx-lbl",children:"📱 SINPE Móvil"}),M&&e.jsxs("div",{className:"pm-sinpe-num",children:[e.jsx("span",{style:{fontSize:18},children:"📞"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:10,color:"#1565C0",fontWeight:800,textTransform:"uppercase",letterSpacing:.8},children:"Número SINPE del negocio"}),e.jsx("div",{style:{fontSize:17,fontWeight:900,color:"#0D47A1",letterSpacing:2},children:M})]})]}),e.jsxs("div",{className:"pm-mx-wrap",children:[e.jsx("span",{className:"pm-mx-pfx",children:"₡"}),e.jsx("input",{className:"pm-mx-in",type:"number",min:"0",step:"50",placeholder:"0",value:_,onChange:i=>G(i.target.value.replace(/[^0-9.]/g,""))})]})]}),e.jsxs("div",{className:"pm-res",children:[e.jsxs("div",{className:"pm-res-row",children:[e.jsx("span",{style:{color:"#888"},children:"Total venta"}),e.jsx("span",{style:{fontWeight:700},children:L(o)})]}),e.jsxs("div",{className:"pm-res-row",children:[e.jsx("span",{style:{color:"#888"},children:"Ingresado"}),e.jsxs("span",{style:{fontWeight:700,color:y?"#2E7D32":F+c+I>0?"#E65100":"#aaa"},children:[L(F+c+I),y&&e.jsx("span",{style:{marginLeft:4},children:"✓"})]})]}),!y&&J>.5&&e.jsxs("div",{className:"pm-res-row",children:[e.jsx("span",{style:{color:"#e53935",fontWeight:700},children:"⚠️ Pendiente"}),e.jsx("span",{style:{fontWeight:800,color:"#e53935"},children:L(J)})]}),m>0&&e.jsxs("div",{className:"pm-res-row",style:{borderTop:"1.5px solid #e0e0e0",paddingTop:8,marginTop:4},children:[e.jsx("span",{style:{color:"#2E7D32",fontWeight:700},children:"Cambio (efectivo)"}),e.jsx("span",{style:{fontWeight:800,color:"#1B5E20"},children:L(m)})]})]})]})]}),e.jsxs("div",{className:"pm-footer",children:[e.jsx("button",{className:"pm-btn-cobrar",onClick:u,disabled:!y||U,children:U?"Procesando...":y?`COBRAR ${L(o)}`:h==="mixto"?`Falta ${L(Math.max(0,J))}`:"Ingresá el monto"}),e.jsx("button",{className:"pm-btn-cancel",onClick:D,disabled:U,children:"Cancelar"})]})]})]})}var lt={exports:{}};(function(o,M){(function($,D){o.exports=D()})(zt,function(){var $=1e3,D=6e4,h=36e5,E="millisecond",C="second",T="minute",S="hour",a="day",f="week",j="month",A="quarter",w="year",_="date",G="Invalid Date",U=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,N=/\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,g={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(b){var p=["th","st","nd","rd"],d=b%100;return"["+b+(p[(d-20)%10]||p[d]||p[0])+"]"}},z=function(b,p,d){var x=String(b);return!x||x.length>=p?b:""+Array(p+1-x.length).join(d)+b},H={s:z,z:function(b){var p=-b.utcOffset(),d=Math.abs(p),x=Math.floor(d/60),u=d%60;return(p<=0?"+":"-")+z(x,2,"0")+":"+z(u,2,"0")},m:function b(p,d){if(p.date()<d.date())return-b(d,p);var x=12*(d.year()-p.year())+(d.month()-p.month()),u=p.clone().add(x,j),i=d-u<0,k=p.clone().add(x+(i?-1:1),j);return+(-(x+(d-u)/(i?u-k:k-u))||0)},a:function(b){return b<0?Math.ceil(b)||0:Math.floor(b)},p:function(b){return{M:j,y:w,w:f,d:a,D:_,h:S,m:T,s:C,ms:E,Q:A}[b]||String(b||"").toLowerCase().replace(/s$/,"")},u:function(b){return b===void 0}},K="en",v={};v[K]=g;var F="$isDayjsObject",c=function(b){return b instanceof J||!(!b||!b[F])},I=function b(p,d,x){var u;if(!p)return K;if(typeof p=="string"){var i=p.toLowerCase();v[i]&&(u=i),d&&(v[i]=d,u=i);var k=p.split("-");if(!u&&k.length>1)return b(k[0])}else{var Y=p.name;v[Y]=p,u=Y}return!x&&u&&(K=u),u||!x&&K},y=function(b,p){if(c(b))return b.clone();var d=typeof p=="object"?p:{};return d.date=b,d.args=arguments,new J(d)},m=H;m.l=I,m.i=c,m.w=function(b,p){return y(b,{locale:p.$L,utc:p.$u,x:p.$x,$offset:p.$offset})};var J=function(){function b(d){this.$L=I(d.locale,null,!0),this.parse(d),this.$x=this.$x||d.x||{},this[F]=!0}var p=b.prototype;return p.parse=function(d){this.$d=function(x){var u=x.date,i=x.utc;if(u===null)return new Date(NaN);if(m.u(u))return new Date;if(u instanceof Date)return new Date(u);if(typeof u=="string"&&!/Z$/i.test(u)){var k=u.match(U);if(k){var Y=k[2]-1||0,O=(k[7]||"0").substring(0,3);return i?new Date(Date.UTC(k[1],Y,k[3]||1,k[4]||0,k[5]||0,k[6]||0,O)):new Date(k[1],Y,k[3]||1,k[4]||0,k[5]||0,k[6]||0,O)}}return new Date(u)}(d),this.init()},p.init=function(){var d=this.$d;this.$y=d.getFullYear(),this.$M=d.getMonth(),this.$D=d.getDate(),this.$W=d.getDay(),this.$H=d.getHours(),this.$m=d.getMinutes(),this.$s=d.getSeconds(),this.$ms=d.getMilliseconds()},p.$utils=function(){return m},p.isValid=function(){return this.$d.toString()!==G},p.isSame=function(d,x){var u=y(d);return this.startOf(x)<=u&&u<=this.endOf(x)},p.isAfter=function(d,x){return y(d)<this.startOf(x)},p.isBefore=function(d,x){return this.endOf(x)<y(d)},p.$g=function(d,x,u){return m.u(d)?this[x]:this.set(u,d)},p.unix=function(){return Math.floor(this.valueOf()/1e3)},p.valueOf=function(){return this.$d.getTime()},p.startOf=function(d,x){var u=this,i=!!m.u(x)||x,k=m.p(d),Y=function(de,Q){var ae=m.w(u.$u?Date.UTC(u.$y,Q,de):new Date(u.$y,Q,de),u);return i?ae:ae.endOf(a)},O=function(de,Q){return m.w(u.toDate()[de].apply(u.toDate("s"),(i?[0,0,0,0]:[23,59,59,999]).slice(Q)),u)},X=this.$W,P=this.$M,l=this.$D,W="set"+(this.$u?"UTC":"");switch(k){case w:return i?Y(1,0):Y(31,11);case j:return i?Y(1,P):Y(0,P+1);case f:var Z=this.$locale().weekStart||0,te=(X<Z?X+7:X)-Z;return Y(i?l-te:l+(6-te),P);case a:case _:return O(W+"Hours",0);case S:return O(W+"Minutes",1);case T:return O(W+"Seconds",2);case C:return O(W+"Milliseconds",3);default:return this.clone()}},p.endOf=function(d){return this.startOf(d,!1)},p.$set=function(d,x){var u,i=m.p(d),k="set"+(this.$u?"UTC":""),Y=(u={},u[a]=k+"Date",u[_]=k+"Date",u[j]=k+"Month",u[w]=k+"FullYear",u[S]=k+"Hours",u[T]=k+"Minutes",u[C]=k+"Seconds",u[E]=k+"Milliseconds",u)[i],O=i===a?this.$D+(x-this.$W):x;if(i===j||i===w){var X=this.clone().set(_,1);X.$d[Y](O),X.init(),this.$d=X.set(_,Math.min(this.$D,X.daysInMonth())).$d}else Y&&this.$d[Y](O);return this.init(),this},p.set=function(d,x){return this.clone().$set(d,x)},p.get=function(d){return this[m.p(d)]()},p.add=function(d,x){var u,i=this;d=Number(d);var k=m.p(x),Y=function(P){var l=y(i);return m.w(l.date(l.date()+Math.round(P*d)),i)};if(k===j)return this.set(j,this.$M+d);if(k===w)return this.set(w,this.$y+d);if(k===a)return Y(1);if(k===f)return Y(7);var O=(u={},u[T]=D,u[S]=h,u[C]=$,u)[k]||1,X=this.$d.getTime()+d*O;return m.w(X,this)},p.subtract=function(d,x){return this.add(-1*d,x)},p.format=function(d){var x=this,u=this.$locale();if(!this.isValid())return u.invalidDate||G;var i=d||"YYYY-MM-DDTHH:mm:ssZ",k=m.z(this),Y=this.$H,O=this.$m,X=this.$M,P=u.weekdays,l=u.months,W=u.meridiem,Z=function(Q,ae,ue,ve){return Q&&(Q[ae]||Q(x,i))||ue[ae].slice(0,ve)},te=function(Q){return m.s(Y%12||12,Q,"0")},de=W||function(Q,ae,ue){var ve=Q<12?"AM":"PM";return ue?ve.toLowerCase():ve};return i.replace(N,function(Q,ae){return ae||function(ue){switch(ue){case"YY":return String(x.$y).slice(-2);case"YYYY":return m.s(x.$y,4,"0");case"M":return X+1;case"MM":return m.s(X+1,2,"0");case"MMM":return Z(u.monthsShort,X,l,3);case"MMMM":return Z(l,X);case"D":return x.$D;case"DD":return m.s(x.$D,2,"0");case"d":return String(x.$W);case"dd":return Z(u.weekdaysMin,x.$W,P,2);case"ddd":return Z(u.weekdaysShort,x.$W,P,3);case"dddd":return P[x.$W];case"H":return String(Y);case"HH":return m.s(Y,2,"0");case"h":return te(1);case"hh":return te(2);case"a":return de(Y,O,!0);case"A":return de(Y,O,!1);case"m":return String(O);case"mm":return m.s(O,2,"0");case"s":return String(x.$s);case"ss":return m.s(x.$s,2,"0");case"SSS":return m.s(x.$ms,3,"0");case"Z":return k}return null}(Q)||k.replace(":","")})},p.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},p.diff=function(d,x,u){var i,k=this,Y=m.p(x),O=y(d),X=(O.utcOffset()-this.utcOffset())*D,P=this-O,l=function(){return m.m(k,O)};switch(Y){case w:i=l()/12;break;case j:i=l();break;case A:i=l()/3;break;case f:i=(P-X)/6048e5;break;case a:i=(P-X)/864e5;break;case S:i=P/h;break;case T:i=P/D;break;case C:i=P/$;break;default:i=P}return u?i:m.a(i)},p.daysInMonth=function(){return this.endOf(j).$D},p.$locale=function(){return v[this.$L]},p.locale=function(d,x){if(!d)return this.$L;var u=this.clone(),i=I(d,x,!0);return i&&(u.$L=i),u},p.clone=function(){return m.w(this.$d,this)},p.toDate=function(){return new Date(this.valueOf())},p.toJSON=function(){return this.isValid()?this.toISOString():null},p.toISOString=function(){return this.$d.toISOString()},p.toString=function(){return this.$d.toUTCString()},b}(),R=J.prototype;return y.prototype=R,[["$ms",E],["$s",C],["$m",T],["$H",S],["$W",a],["$M",j],["$y",w],["$D",_]].forEach(function(b){R[b[1]]=function(p){return this.$g(p,b[0],b[1])}}),y.extend=function(b,p){return b.$i||(b(p,J,y),b.$i=!0),y},y.locale=I,y.isDayjs=c,y.unix=function(b){return y(1e3*b)},y.en=v[K],y.Ls=v,y.p={},y})})(lt);var Ft=lt.exports;const xe=$t(Ft),je=42;function me(o){if(o=String(o),o.length>=je)return o;const M=Math.floor((je-o.length)/2);return" ".repeat(M)+o}function ne(o,M){const $=String(o),D=String(M),h=je-$.length-D.length;return h<1?$.slice(0,je-D.length-1)+" "+D:$+" ".repeat(h)+D}function fe(o="-"){return o.repeat(je)}function dt(o){const M={};let $=0;for(const h of o.items||[]){const E=h.tasa_impuesto||0,C=h.subtotal||0,T=Math.round(C/(1+E/100)),S=C-T;$+=T,E>0&&(M[E]=(M[E]||0)+S)}const D=Object.keys(M).map(Number).sort((h,E)=>E-h);return{subtotalSinIva:$,ivaGroups:M,ivaRates:D}}function re(o){return"₡"+Math.round(o||0).toLocaleString("es-CR")}function At(o){return o.unidad==="kg"?`${(+o.cantidad).toFixed(3)}k`:`${+o.cantidad}u`}function Rt(o,M){const $=M||{},D=$.empresa_nombre||"ARAMO Frutas y Verduras",h=$.empresa_direccion||"",E=$.empresa_telefono||"",C=$.empresa_cedula||"",T=xe(o.fecha||new Date).format("DD/MM/YYYY  HH:mm:ss"),S={efectivo:"Efectivo",tarjeta:"Tarjeta",sinpe:"SINPE Móvil"}[o.metodo_pago]||o.metodo_pago||"Efectivo",a=[];a.push(fe("=")),a.push(me(D)),a.push(me("Frutas y Verduras Frescas")),h&&a.push(me(h)),E&&a.push(me("Tel: "+E)),C&&a.push(me("Ced: "+C)),a.push(fe("=")),a.push(ne("  Tiquete:",o.numero||"-")),a.push(ne("  Fecha:",T)),a.push(fe("-")),a.push(`${"Producto".padEnd(16)} ${"Cant.".padStart(6)} ${"Precio".padStart(7)}  ${"Total".padStart(9)}`),a.push(fe("-"));for(const _ of o.items||[]){const G=_.nombre.slice(0,16).padEnd(16),U=At(_).padStart(6),N=re(_.precio_unitario).padStart(7),g=re(_.subtotal).padStart(9);a.push(`${G} ${U} ${N}  ${g}`),_.promocion_descripcion&&a.push("  > "+_.promocion_descripcion.slice(0,je-4)),(_.desc_manual_pct||0)>0&&a.push(ne("  Desc. cajero:",`-${Math.round(_.desc_manual_pct)}%`))}a.push(fe("-"));const{subtotalSinIva:f,ivaGroups:j,ivaRates:A}=dt(o);(o.descuento_total||0)>0&&(a.push(ne("  Precio bruto:",re(o.subtotal))),a.push(ne("  Descuento:","-"+re(o.descuento_total)))),a.push(ne("  Subtotal s/IVA:",re(f)));for(const _ of A)a.push(ne(`  IVA ${_}%:`,re(j[_])));if((o.desc_global_monto||0)>0){const _=(o.desc_global_pct||0)>0?`Desc. ${Math.round(o.desc_global_pct)}% total:`:"Desc. total:";a.push(ne(`  ${_}`,"-"+re(o.desc_global_monto)))}return a.push(""),a.push(ne("  TOTAL:",re(o.total))),a.push(""),a.push(fe("-")),(o.pago_efectivo||0)+(o.pago_tarjeta||0)+(o.pago_sinpe||0)>0?((o.pago_efectivo||0)>0&&a.push(ne("  Efectivo:",re(o.pago_efectivo))),(o.pago_tarjeta||0)>0&&a.push(ne("  Tarjeta:",re(o.pago_tarjeta))),(o.pago_sinpe||0)>0&&a.push(ne("  SINPE:",re(o.pago_sinpe))),(o.cambio||0)>0&&a.push(ne("  Cambio:",re(o.cambio)))):(a.push(ne("  Método:",S)),(o.monto_recibido||0)>0&&(a.push(ne("  Recibido:",re(o.monto_recibido))),a.push(ne("  Cambio:",re(o.cambio||0))))),a.push(fe("=")),a.push(me("¡Gracias por su compra!")),a.push(me("Vuelva pronto")),a.push(fe("=")),a.push(""),a.join(`
`)}function le(o){return String(o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Pt(o,M){const $=Rt(o,M),D=M||{},h=D.empresa_nombre||"ARAMO Frutas y Verduras",E=D.empresa_direccion||"",C=D.empresa_telefono||"",T=D.empresa_cedula||"",S=xe(o.fecha||new Date).format("DD/MM/YYYY HH:mm:ss"),a={efectivo:"Efectivo",tarjeta:"Tarjeta de débito/crédito",sinpe:"SINPE Móvil"}[o.metodo_pago]||o.metodo_pago||"Efectivo",f=v=>"&#8353;"+Math.round(v||0).toLocaleString("es-CR"),j=(o.items||[]).map(v=>{const F=v.unidad==="kg"?`${(+v.cantidad).toFixed(3)}&nbsp;kg`:`${+v.cantidad}&nbsp;und`,c=v.promocion_descripcion?`<br><span class="promo-lbl">&gt; ${le(v.promocion_descripcion)}</span>`:"",I=(v.desc_manual_pct||0)>0?`<br><span class="promo-lbl">Desc. cajero: -${Math.round(v.desc_manual_pct)}%</span>`:"";return`<tr>
      <td class="c-n">${le(v.nombre)}${c}${I}</td>
      <td class="c-c">${F}</td>
      <td class="c-p">${f(v.precio_unitario)}</td>
      <td class="c-s">${f(v.subtotal)}</td>
    </tr>`}).join(""),{subtotalSinIva:A,ivaGroups:w,ivaRates:_}=dt(o),G=(o.descuento_total||0)>0?`
    <tr><td>Precio bruto:</td><td>${f(o.subtotal)}</td></tr>
    <tr><td>Descuento:</td><td>-${f(o.descuento_total)}</td></tr>`:"",U=(o.desc_global_monto||0)>0?`<tr><td>${(o.desc_global_pct||0)>0?`Desc. ${Math.round(o.desc_global_pct)}% total:`:"Desc. total:"}</td><td>-${f(o.desc_global_monto)}</td></tr>`:"",N=`
    <tr><td>Subtotal s/IVA:</td><td>${f(A)}</td></tr>
    ${_.map(v=>`<tr><td>IVA ${v}%:</td><td>${f(w[v])}</td></tr>`).join("")}
    ${U}`,z=(o.pago_efectivo||0)+(o.pago_tarjeta||0)+(o.pago_sinpe||0)>0?[(o.pago_efectivo||0)>0?`<tr><td>Efectivo:</td><td>${f(o.pago_efectivo)}</td></tr>`:"",(o.pago_tarjeta||0)>0?`<tr><td>Tarjeta:</td><td>${f(o.pago_tarjeta)}</td></tr>`:"",(o.pago_sinpe||0)>0?`<tr><td>SINPE:</td><td>${f(o.pago_sinpe)}</td></tr>`:"",(o.cambio||0)>0?`<tr><td>Cambio:</td><td>${f(o.cambio)}</td></tr>`:""].join(""):`<tr><td>Pago:</td><td>${le(a)}</td></tr>`+((o.monto_recibido||0)>0?`<tr><td>Recibido:</td><td>${f(o.monto_recibido)}</td></tr><tr><td>Cambio:</td><td>${f(o.cambio||0)}</td></tr>`:"");return{html:`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tiquete ${le(o.numero||"")}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:80mm auto;margin:2mm 4mm;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    body{
      font-family:'Courier New',Courier,monospace;
      font-size:12pt;font-weight:700;color:#000;background:#fff;
      width:72mm;line-height:1.6;
      -webkit-font-smoothing:none;
      -moz-osx-font-smoothing:unset;
      font-smooth:never;
      text-rendering:optimizeSpeed;
      print-color-adjust:exact;
      -webkit-print-color-adjust:exact;
    }
    @media print{
      body{
        -webkit-font-smoothing:none;
        -moz-osx-font-smoothing:unset;
        font-smooth:never;
        text-rendering:optimizeSpeed;
        print-color-adjust:exact;
        -webkit-print-color-adjust:exact;
      }
    }
    .nom{font-size:14pt;font-weight:700;text-align:center;margin-bottom:2pt}
    .sub{font-size:11pt;font-weight:700;text-align:center;color:#333;line-height:1.6}
    hr{border:none;border-top:1.5px solid #000;margin:4pt 0}
    hr.sol{border-top:2px solid #000;margin:4pt 0}
    .meta{font-size:12pt;font-weight:700;margin:1.5pt 0}
    table{width:100%;border-collapse:collapse}
    th{font-size:11pt;font-weight:700;border-bottom:1.5px solid #000;padding:2pt 0;text-align:left}
    td{font-size:10pt;font-weight:700;padding:1.5pt 0;vertical-align:top;line-height:1.3}
    .c-n{width:42%}
    .c-c{width:14%;text-align:right}
    .c-p{width:22%;text-align:right}
    .c-s{width:22%;text-align:right}
    .promo-lbl{font-size:10pt;font-weight:700;color:#555}
    .t-tbl td{padding:1.5pt 0;font-size:12pt;font-weight:700}
    .t-tbl td:first-child{text-align:right;padding-right:5pt;color:#444}
    .t-tbl td:last-child{text-align:right;font-weight:700;font-size:13pt}
    .t-fin td{font-size:18pt;font-weight:700;border-top:1.5px solid #000;padding-top:4pt}
    .p-tbl td{padding:1.5pt 0;font-size:12pt;font-weight:700;line-height:1.6}
    .p-tbl td:last-child{text-align:right;font-weight:700;font-size:13pt}
    .grc{font-size:14pt;font-weight:700;text-align:center;margin:6pt 0 2pt}
    .pie{font-size:10pt;font-weight:700;text-align:center;color:#333;line-height:1.6}
  </style>
</head>
<body>
  <div class="nom">${le(h)}</div>
  <div class="sub">Frutas y Verduras Frescas</div>
  ${E?`<div class="sub">${le(E)}</div>`:""}
  ${C?`<div class="sub">Tel: ${le(C)}</div>`:""}
  ${T?`<div class="sub">Ced: ${le(T)}</div>`:""}
  <hr class="sol">
  <div class="meta"><span><b>Tiquete:</b>&nbsp;${le(o.numero||"-")}</span></div>
  <div class="meta"><span><b>Fecha:</b>&nbsp;${le(S)}</span></div>
  <hr>
  <table>
    <thead>
      <tr>
        <th class="c-n">Producto</th>
        <th class="c-c" style="text-align:right">Cant.</th>
        <th class="c-p" style="text-align:right">Precio</th>
        <th class="c-s" style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${j}</tbody>
  </table>
  <hr>
  <table class="t-tbl">
    ${G}
    ${N}
    <tr class="t-fin">
      <td>TOTAL:</td>
      <td>${f(o.total)}</td>
    </tr>
  </table>
  <hr>
  <table class="p-tbl">
    ${z}
  </table>
  <hr class="sol">
  <div class="grc">¡Gracias por su compra!</div>
  <div class="pie">Vuelva pronto</div>
  ${C?`<div class="pie">Tel: ${le(C)}</div>`:""}
</body>
</html>`,texto:$}}function ut({venta:o,config:M,onCerrar:$}){const[D,h]=s.useState(!1),[E,C]=s.useState(!1),[T,S]=s.useState(""),{html:a,texto:f}=Pt(o,M);async function j(){h(!0),S("");try{const w=await window.db.tiquete.imprimir(a);w&&!w.ok&&S("Error al imprimir: "+(w.reason||"desconocido"))}catch(w){S("Error al imprimir: "+w.message)}h(!1)}async function A(){S("");try{await window.db.tiquete.guardar(f,o.numero||"tiquete"),C(!0),setTimeout(()=>C(!1),3e3)}catch(w){S("Error al guardar: "+w.message)}}return e.jsx("div",{className:"modal-overlay",onClick:$,children:e.jsxs("div",{className:"modal modal-sm",onClick:w=>w.stopPropagation(),style:{maxWidth:380},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("span",{className:"modal-title",children:["🧾 Tiquete — ",o.numero]}),e.jsx("button",{className:"btn-close",onClick:$,children:"✕"})]}),e.jsxs("div",{className:"modal-body",style:{padding:0},children:[T&&e.jsx("div",{className:"alert alert-error",style:{margin:"10px 10px 0",borderRadius:6},children:T}),e.jsx("div",{style:{background:"#ddd",padding:"10px 14px",display:"flex",justifyContent:"center"},children:e.jsx("pre",{style:{fontFamily:'"Courier New", Courier, monospace',fontSize:11,lineHeight:1.5,whiteSpace:"pre",background:"#fff",padding:"10px 8px",width:300,boxShadow:"0 2px 8px rgba(0,0,0,.18)",overflowY:"auto",maxHeight:"52vh",margin:0,borderRadius:2},children:f})})]}),e.jsxs("div",{className:"modal-footer",style:{flexDirection:"column",gap:8,alignItems:"stretch"},children:[e.jsx("button",{className:"btn btn-primary btn-lg",style:{width:"100%",fontSize:15,justifyContent:"center"},onClick:j,disabled:D,children:D?"⏳ Abriendo impresora...":"🖨️ Imprimir Tiquete"}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"btn btn-outline",style:{flex:1},onClick:A,disabled:E,children:E?"✓ Guardado":"💾 Guardar .txt"}),e.jsx("button",{className:"btn btn-ghost",style:{flex:1},onClick:$,children:"Cerrar"})]})]})]})})}const Wt={efectivo:"Efectivo",tarjeta:"Tarjeta",sinpe:"SINPE Móvil"},be={position:"sticky",top:0,zIndex:2,background:"var(--verde-fondo)"};function qt({ventaNumero:o,ventaId:M,onExito:$,onCancelar:D}){const[h,E]=s.useState(""),[C,T]=s.useState(["","","",""]),[S,a]=s.useState(null),[f,j]=s.useState(!1),[A,w]=s.useState(!1),_=s.useRef(),G=s.useRef(),U=s.useRef(),N=s.useRef(),g=[_,G,U,N];function z(v,F){var I;F=F.replace(/\D/g,"").slice(-1);const c=[...C];c[v]=F,T(c),a(null),F&&v<3&&((I=g[v+1].current)==null||I.focus())}function H(v,F){var c;F.key==="Backspace"&&!C[v]&&v>0&&((c=g[v-1].current)==null||c.focus())}async function K(){var I;if(!h.trim()){j(!0);return}const v=C.join("");if(v.length<4){a("Ingrese el PIN completo (4 dígitos).");return}w(!0);const F=await window.db.cajeros.verificarAdmin(v);if(!(F!=null&&F.ok)){a("PIN incorrecto. Solo un administrador puede autorizar esta operación."),T(["","","",""]),(I=g[0].current)==null||I.focus(),w(!1);return}const c=await window.db.ventas.anular(M,{motivo:h.trim(),cajeroNombre:F.nombre});w(!1),c!=null&&c.ok?$(`Venta ${o} anulada. El stock de todos los artículos fue restaurado.`):a("No se pudo anular la venta (puede que ya esté anulada).")}return e.jsx("div",{className:"modal-overlay",onClick:D,style:{zIndex:1100},children:e.jsxs("div",{className:"modal modal-sm",onClick:v=>v.stopPropagation(),style:{maxWidth:430},children:[e.jsxs("div",{className:"modal-header",style:{background:"#c62828",color:"#fff"},children:[e.jsxs("span",{className:"modal-title",style:{color:"#fff"},children:["🚫 Anular Venta ",o]}),e.jsx("button",{className:"btn-close",style:{color:"#fff"},onClick:D,children:"✕"})]}),e.jsxs("div",{className:"modal-body",style:{display:"flex",flexDirection:"column",gap:16},children:[e.jsxs("div",{style:{background:"#FFF3E0",border:"1px solid #FF9800",borderRadius:8,padding:"10px 14px",fontSize:13,lineHeight:1.5},children:["Esta acción es ",e.jsx("strong",{children:"irreversible"}),". La venta quedará marcada como ANULADA, se devolverá el stock al inventario y se registrará quién autorizó la operación."]}),e.jsxs("div",{children:[e.jsxs("label",{style:{display:"block",fontWeight:700,fontSize:13,marginBottom:6},children:["Motivo de la anulación ",e.jsx("span",{style:{color:"var(--rojo)"},children:"*"})]}),e.jsx("textarea",{className:"form-input",placeholder:"Ej: Error en cobro, producto dañado, solicitud del cliente...",value:h,onChange:v=>{E(v.target.value),j(!1)},rows:3,style:{resize:"vertical",fontSize:13,borderColor:f?"var(--rojo)":void 0}}),f&&e.jsx("div",{style:{fontSize:12,color:"var(--rojo)",marginTop:3},children:"El motivo es obligatorio."})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontWeight:700,fontSize:13,marginBottom:10,textAlign:"center"},children:"PIN de administrador"}),e.jsx("div",{style:{display:"flex",gap:12,justifyContent:"center"},children:C.map((v,F)=>e.jsx("input",{ref:g[F],type:"password",inputMode:"numeric",maxLength:1,value:v,onChange:c=>z(F,c.target.value),onKeyDown:c=>H(F,c),style:{width:54,height:54,textAlign:"center",fontSize:24,fontWeight:700,borderRadius:10,border:`2px solid ${S?"var(--rojo)":"var(--borde)"}`,outline:"none",transition:"border-color .15s"}},F))}),S&&e.jsx("div",{style:{fontSize:12,color:"var(--rojo)",marginTop:8,textAlign:"center"},children:S})]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn btn-ghost",disabled:A,onClick:D,children:"Cancelar"}),e.jsx("button",{className:"btn btn-danger",disabled:A,onClick:K,style:{minWidth:150},children:A?"Procesando...":"🚫 Confirmar Anulación"})]})]})})}function Lt({config:o,onCerrar:M}){const{permisos:$,cajaId:D}=ct(),h=!$.ver_ventas_todos_turnos,[E,C]=s.useState([]),[T,S]=s.useState(!0),[a,f]=s.useState(xe().format("YYYY-MM-DD")),[j,A]=s.useState(""),[w,_]=s.useState(""),[G,U]=s.useState([]),[N,g]=s.useState(null),[z,H]=s.useState(null),[K,v]=s.useState(!1),[F,c]=s.useState(!1),[I,y]=s.useState(!1),[m,J]=s.useState(!1),[R,b]=s.useState(null);s.useEffect(()=>{h||p()},[h]),s.useEffect(()=>{d()},[a,h,D]);async function p(){const l=await window.db.ventas.cajeros();U(l||[])}async function d(){S(!0),g(null),H(null);const l=h?{caja_id:D}:{desde:a,hasta:a},W=await window.db.ventas.listar(l);C(W),S(!1)}async function x(l){if((N==null?void 0:N.id)===l.id)return;v(!0),H(null);const W=await window.db.ventas.obtener(l.id);g(W),v(!1)}const u=s.useMemo(()=>{let l=E;if(w&&(l=l.filter(W=>W.cajero===w)),j.trim()){const W=j.toLowerCase();l=l.filter(Z=>(Z.numero||"").toLowerCase().includes(W)||(Z.productos_texto||"").toLowerCase().includes(W))}return l},[E,j,w]),i=u.filter(l=>l.estado!=="anulada").reduce((l,W)=>l+(W.total||0),0),k=u.filter(l=>l.estado==="anulada").length;async function Y(){if(!N||!z)return;const l=await window.db.ventas.devolverItem(N.id,z.id);if(J(!1),l!=null&&l.ok){O(`Devolución procesada. Stock de "${z.nombre}" restaurado.`,"success");const W=await window.db.ventas.obtener(N.id);g(W),H(null),d()}else O("No se pudo procesar la devolución.","error")}function O(l,W){b({text:l,tipo:W}),setTimeout(()=>b(null),5e3)}function X(l){y(!1),O(l,"success"),g(W=>({...W,estado:"anulada"})),d()}const P=(N==null?void 0:N.estado)==="anulada";return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"modal-overlay",onClick:M,children:e.jsxs("div",{className:"modal",onClick:l=>l.stopPropagation(),style:{width:"92vw",maxWidth:"92vw",height:"92vh",maxHeight:"92vh",display:"flex",flexDirection:"column",borderRadius:12,overflow:"hidden"},children:[e.jsxs("div",{style:{background:"var(--verde-oscuro)",color:"#fff",padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:17,fontWeight:800,letterSpacing:.5},children:h?"MIS VENTAS DEL TURNO":"HISTORIAL DE VENTAS"}),e.jsx("div",{style:{fontSize:12,color:"rgba(255,255,255,.65)",marginTop:1},children:h?"Ventas registradas en tu turno actual":xe(a).format("dddd DD [de] MMMM [de] YYYY")})]}),e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center"},children:[e.jsx("button",{className:"btn btn-ghost btn-sm",style:{color:"#fff",border:"1px solid rgba(255,255,255,.35)",fontSize:12},onClick:d,disabled:T,children:"🔄 Actualizar"}),e.jsx("button",{className:"btn-close",style:{color:"#fff",fontSize:22},onClick:M,children:"✕"})]})]}),R&&e.jsx("div",{className:`alert alert-${R.tipo}`,style:{margin:"8px 16px 0",flexShrink:0,borderRadius:8,fontSize:13},children:R.text}),e.jsxs("div",{style:{flex:1,display:"grid",gridTemplateColumns:"1fr 430px",overflow:"hidden"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column",overflow:"hidden",borderRight:"2px solid var(--borde)"},children:[e.jsxs("div",{style:{padding:"12px 16px",background:"var(--verde-fondo)",borderBottom:"1px solid var(--borde)",flexShrink:0},children:[e.jsxs("div",{style:{position:"relative",marginBottom:h?0:10},children:[e.jsx("span",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none",color:"var(--verde-medio)"},children:"🔍"}),e.jsx("input",{type:"text",className:"form-input",placeholder:"Buscar por folio o nombre de producto...",value:j,onChange:l=>A(l.target.value),style:{paddingLeft:34,fontSize:13}})]}),!h&&e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",marginTop:10},children:[e.jsx("input",{type:"date",className:"form-input",value:a,onChange:l=>f(l.target.value),style:{flex:1,fontSize:13}}),e.jsx("button",{className:"btn btn-outline btn-sm",onClick:()=>f(xe().format("YYYY-MM-DD")),style:{whiteSpace:"nowrap",fontSize:12},children:"Hoy"}),e.jsxs("select",{className:"form-select",value:w,onChange:l=>_(l.target.value),style:{flex:1,fontSize:13},children:[e.jsx("option",{value:"",children:"Todos los cajeros"}),G.map(l=>e.jsx("option",{value:l,children:l},l))]})]})]}),e.jsx("div",{style:{flex:1,overflowY:"auto"},children:T?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:140},children:e.jsx("div",{className:"loading-spinner"})}):u.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"48px 20px",color:"var(--texto-muted)"},children:[e.jsx("div",{style:{fontSize:40},children:"🛒"}),e.jsx("p",{style:{marginTop:10,fontSize:14},children:"No hay ventas para este filtro"})]}):e.jsxs("table",{className:"table",style:{borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{...be,width:"44%"},children:"Folio"}),e.jsx("th",{style:{...be,width:"14%",textAlign:"center"},children:"Arts"}),e.jsx("th",{style:{...be,width:"18%"},children:"Hora"}),e.jsx("th",{style:{...be,width:"24%",textAlign:"right"},children:"Total"})]})}),e.jsx("tbody",{children:u.map(l=>{const W=(N==null?void 0:N.id)===l.id,Z=l.estado==="anulada";return e.jsxs("tr",{onClick:()=>x(l),style:{cursor:"pointer",background:W?"#C8E6C9":Z?"#FFEBEE":void 0},children:[e.jsxs("td",{style:{fontFamily:"monospace",fontSize:12.5,fontWeight:700,color:Z?"#b71c1c":W?"var(--verde-oscuro)":"var(--texto)",borderLeft:W?"4px solid var(--verde)":"4px solid transparent",paddingLeft:W?10:14,textDecoration:Z?"line-through":"none"},children:[l.numero,Z&&e.jsx("span",{style:{marginLeft:6,fontSize:9.5,background:"#c62828",color:"#fff",padding:"1px 5px",borderRadius:10,fontFamily:"inherit",textDecoration:"none",display:"inline-block"},children:"ANULADA"})]}),e.jsx("td",{style:{textAlign:"center",fontWeight:700,color:Z?"#b71c1c":"var(--verde-medio)",fontSize:13},children:l.num_items}),e.jsx("td",{style:{color:Z?"#b71c1c":"var(--texto-sec)",fontSize:13},children:xe(l.fecha).format("HH:mm")}),e.jsx("td",{style:{textAlign:"right",fontWeight:700,fontSize:13,color:Z?"#b71c1c":"var(--texto)",textDecoration:Z?"line-through":"none"},children:L(l.total)})]},l.id)})})]})}),e.jsxs("div",{style:{padding:"8px 16px",background:"var(--verde-fondo)",borderTop:"2px solid var(--borde-oscuro)",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,flexShrink:0},children:[e.jsxs("span",{style:{color:"var(--texto-sec)",display:"flex",gap:10,alignItems:"center"},children:[e.jsxs("span",{children:[u.filter(l=>l.estado!=="anulada").length," venta",u.filter(l=>l.estado!=="anulada").length!==1?"s":""]}),k>0&&e.jsxs("span",{style:{fontSize:11,color:"#b71c1c",background:"#FFEBEE",padding:"1px 7px",borderRadius:10,fontWeight:700},children:[k," anulada",k!==1?"s":""]})]}),e.jsxs("span",{style:{fontWeight:700,color:"var(--verde-oscuro)"},children:["Total: ",L(i)]})]})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"},children:N?e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{background:P?"#c62828":"var(--verde-oscuro)",color:"#fff",padding:"11px 18px",flexShrink:0},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsxs("span",{style:{fontSize:15,fontWeight:700},children:["Ticket ",N.numero]}),P&&e.jsx("span",{style:{fontSize:11,background:"rgba(0,0,0,.25)",padding:"2px 9px",borderRadius:12,fontWeight:700},children:"ANULADA"})]})}),e.jsxs("div",{style:{padding:"10px 18px",borderBottom:"1px solid var(--borde)",flexShrink:0,background:"var(--verde-fondo)"},children:[e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px"},children:[["FOLIO",N.numero],["CAJERO",N.cajero||"Admin"],["CLIENTE",N.cliente_nombre||"Consumidor Final"],["FECHA/HORA",xe(N.fecha).format("DD/MM/YY HH:mm")]].map(([l,W])=>e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:10,color:"var(--texto-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:1},children:l}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"var(--texto)"},children:W})]},l))}),P&&e.jsxs("div",{style:{marginTop:10,background:"#FFEBEE",border:"1px solid #ef9a9a",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#b71c1c",lineHeight:1.6},children:[e.jsx("div",{style:{fontWeight:800,marginBottom:3,fontSize:11,textTransform:"uppercase",letterSpacing:.5},children:"🚫 Venta Anulada"}),N.anulado_motivo&&e.jsxs("div",{children:[e.jsx("strong",{children:"Motivo:"})," ",N.anulado_motivo]}),N.anulado_por&&e.jsxs("div",{children:[e.jsx("strong",{children:"Autorizado por:"})," ",N.anulado_por]}),N.anulado_fecha&&e.jsxs("div",{children:[e.jsx("strong",{children:"Fecha:"})," ",xe(N.anulado_fecha).format("DD/MM/YY HH:mm")]})]})]}),e.jsx("div",{style:{flex:1,overflowY:"auto"},children:K?e.jsx("div",{style:{display:"flex",justifyContent:"center",padding:24},children:e.jsx("div",{className:"loading-spinner"})}):e.jsxs("table",{className:"table",style:{borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{...be,width:72},children:"Cant."}),e.jsx("th",{style:be,children:"Descripción"}),e.jsx("th",{style:{...be,textAlign:"right",width:88},children:"Importe"})]})}),e.jsx("tbody",{children:(N.items||[]).map(l=>{const W=(z==null?void 0:z.id)===l.id;return e.jsxs("tr",{onClick:()=>!P&&H(W?null:l),style:{cursor:P?"default":"pointer",background:W?"#C8E6C9":void 0,opacity:P?.65:1},children:[e.jsx("td",{style:{fontWeight:700,fontSize:12.5,whiteSpace:"nowrap",borderLeft:W?"4px solid var(--verde)":"4px solid transparent",paddingLeft:W?10:14,color:W?"var(--verde-oscuro)":"var(--texto)"},children:l.unidad==="kg"?`${(+l.cantidad).toFixed(3)} kg`:`${+l.cantidad} und`}),e.jsxs("td",{children:[e.jsx("div",{style:{fontWeight:500,fontSize:13},children:l.nombre}),e.jsxs("div",{style:{fontSize:11,color:"var(--texto-muted)",marginTop:1},children:["@ ",L(l.precio_unitario),"/",l.unidad]}),l.promocion_descripcion&&e.jsxs("div",{style:{fontSize:11,color:"var(--verde)"},children:["🏷️ ",l.promocion_descripcion]})]}),e.jsx("td",{style:{textAlign:"right",fontWeight:700,fontSize:13,whiteSpace:"nowrap"},children:L(l.subtotal)})]},l.id)})})]})}),e.jsx("div",{style:{padding:"8px 18px",borderTop:"1px solid var(--borde)",flexShrink:0,background:z?"#FFFDE7":"#fafafa"},children:e.jsxs("button",{className:"btn btn-outline btn-sm",style:{width:"100%",fontSize:12.5,justifyContent:"center",color:z&&!P?"var(--naranja-oscuro)":"var(--texto-muted)",borderColor:z&&!P?"var(--naranja-oscuro)":"var(--borde)"},disabled:!z||P,onClick:()=>J(!0),children:["↩ Devolver artículo seleccionado",z&&e.jsxs("span",{style:{marginLeft:6,fontStyle:"italic",fontWeight:400},children:["(",z.nombre,")"]})]})}),e.jsxs("div",{style:{padding:"10px 18px",background:"var(--verde-fondo)",borderTop:"1px solid var(--borde)",flexShrink:0},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5,color:"var(--texto-sec)"},children:[e.jsx("span",{children:"Pago con:"}),e.jsxs("span",{style:{fontWeight:600,color:"var(--texto)"},children:[L(N.monto_recibido)," ",e.jsxs("span",{style:{fontSize:11,color:"var(--texto-muted)"},children:["(",Wt[N.metodo_pago]||N.metodo_pago,")"]})]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:17,fontWeight:800},children:[e.jsx("span",{style:{color:P?"#b71c1c":"var(--verde-oscuro)"},children:"TOTAL"}),e.jsx("span",{style:{color:P?"#b71c1c":"var(--verde)",textDecoration:P?"line-through":"none"},children:L(N.total)})]})]}),e.jsxs("div",{style:{padding:"10px 18px",borderTop:"2px solid var(--borde-oscuro)",display:"flex",gap:8,flexShrink:0},children:[$.anular_ventas&&e.jsx("button",{className:"btn btn-danger",style:{flex:1},disabled:P,onClick:()=>y(!0),children:"🚫 Anular Venta"}),e.jsx("button",{className:"btn",style:{flex:1,background:P?"var(--borde)":"var(--azul)",color:P?"var(--texto-muted)":"#fff",cursor:P?"not-allowed":"pointer"},disabled:P,onClick:()=>!P&&c(!0),children:"🖨️ Imprimir copia"})]})]}):e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"var(--texto-muted)",gap:12},children:[e.jsx("div",{style:{fontSize:52},children:"🧾"}),e.jsx("p",{style:{fontSize:14},children:"Seleccione una venta de la lista"})]})})]}),e.jsx("div",{style:{padding:"12px 22px",borderTop:"2px solid var(--borde)",display:"flex",justifyContent:"center",flexShrink:0,background:"#fff"},children:e.jsx("button",{className:"btn btn-ghost btn-lg",style:{minWidth:200},onClick:M,children:"Cerrar Ventana"})})]})}),F&&N&&e.jsx(ut,{venta:N,config:o,onCerrar:()=>c(!1)}),I&&N&&e.jsx(qt,{ventaNumero:N.numero,ventaId:N.id,onExito:X,onCancelar:()=>y(!1)}),m&&e.jsx("div",{className:"modal-overlay",onClick:()=>J(!1),style:{zIndex:1100},children:e.jsxs("div",{className:"modal modal-sm",onClick:l=>l.stopPropagation(),style:{maxWidth:400},children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("span",{className:"modal-title",style:{color:"var(--naranja-oscuro)"},children:"Devolver Artículo"}),e.jsx("button",{className:"btn-close",onClick:()=>J(!1),children:"✕"})]}),e.jsxs("div",{className:"modal-body",children:[e.jsxs("p",{style:{marginBottom:10},children:["¿Confirma la devolución de"," ",e.jsx("strong",{children:z==null?void 0:z.nombre}),"?"]}),e.jsxs("div",{style:{background:"var(--verde-fondo)",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:10},children:[e.jsxs("div",{children:["Cantidad: ",e.jsx("strong",{children:(z==null?void 0:z.unidad)==="kg"?`${(+(z==null?void 0:z.cantidad)).toFixed(3)} kg`:`${+(z==null?void 0:z.cantidad)} und`})]}),e.jsxs("div",{children:["Importe: ",e.jsx("strong",{children:L(z==null?void 0:z.subtotal)})]})]}),e.jsx("p",{style:{fontSize:13,color:"var(--texto-sec)"},children:"Se restaurará el stock del producto al inventario."})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn btn-ghost",onClick:()=>J(!1),children:"Cancelar"}),e.jsx("button",{className:"btn btn-secondary",style:{background:"var(--naranja-oscuro)"},onClick:Y,children:"Confirmar devolución"})]})]})})]})}function Yt(o){return{Frutas:"🍎",Verduras:"🥬",Hierbas:"🌿",Raíces:"🥕",Cítricos:"🍊",Lácteos:"🥛",Carnes:"🥩",Bebidas:"🥤",Granos:"🌾",Tubérculos:"🍠",Especias:"🌶️"}[o]||"🛒"}const Bt=`
  .bm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.60);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 36px;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }
  .bm-modal {
    background: #fff;
    border-radius: 18px;
    width: calc(100% - 48px);
    max-width: 820px;
    max-height: 88vh;
    display: flex; flex-direction: column;
    box-shadow: 0 28px 80px rgba(0,0,0,0.38);
    animation: bm-in 0.18s ease;
  }
  @keyframes bm-in {
    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)      scale(1);   }
  }

  /* Header + Search (same green band) */
  .bm-top {
    background: #1a472a;
    border-radius: 18px 18px 0 0;
    padding: 16px 22px 18px;
    flex-shrink: 0;
  }
  .bm-header-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px;
  }
  .bm-title {
    font-size: 15px; font-weight: 900;
    letter-spacing: 1.8px; text-transform: uppercase; color: #fff;
  }
  .bm-close {
    width: 30px; height: 30px; border-radius: 50%;
    border: none; background: rgba(255,255,255,0.15);
    cursor: pointer; font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.9); transition: background 0.15s;
  }
  .bm-close:hover { background: rgba(255,255,255,0.28); }
  .bm-hint {
    font-size: 12px; color: rgba(255,255,255,0.65); margin-bottom: 10px;
  }
  .bm-search-wrap { position: relative; }
  .bm-search-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%); font-size: 17px; pointer-events: none;
  }
  .bm-search-in {
    width: 100%; box-sizing: border-box;
    padding: 12px 42px 12px 46px;
    font-size: 18px; font-weight: 700;
    border: none; border-radius: 10px;
    outline: none; background: #fff; color: #1a472a;
    box-shadow: 0 4px 18px rgba(0,0,0,0.22);
    font-family: inherit;
  }
  .bm-search-in::placeholder { color: #bbb; font-weight: 400; }
  .bm-search-clear {
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    width: 26px; height: 26px; border-radius: 50%;
    border: none; background: rgba(0,0,0,0.08);
    cursor: pointer; font-size: 13px; color: #666;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.12s;
  }
  .bm-search-clear:hover { background: rgba(0,0,0,0.16); }

  /* Table */
  .bm-table-wrap {
    flex: 1; overflow-y: auto; min-height: 0;
  }
  .bm-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 52px 24px; color: #bbb; gap: 10px;
  }
  .bm-empty-icon { font-size: 44px; }
  .bm-empty-msg  { font-size: 14px; }
  .bm-table {
    width: 100%; border-collapse: collapse; font-size: 14px;
  }
  .bm-table thead tr {
    position: sticky; top: 0; z-index: 1; background: #f2f2f2;
  }
  .bm-table th {
    padding: 10px 14px; text-align: left;
    font-size: 11px; font-weight: 800; color: #777;
    text-transform: uppercase; letter-spacing: .8px;
    border-bottom: 2px solid #e0e0e0;
  }
  .bm-table th.r { text-align: right; }
  .bm-tr { border-bottom: 1px solid #f4f4f4; transition: background 0.08s; }
  .bm-tr td { padding: 10px 14px; vertical-align: middle; }
  .bm-tr:not(.nostock) { cursor: pointer; }
  .bm-tr:hover:not(.nostock):not(.sel) { background: #f6fdf7; }
  .bm-tr.sel {
    background: #e8f5e9;
    outline: none;
  }
  .bm-tr.sel td:first-child { border-left: 3px solid #1a472a; padding-left: 11px; }
  .bm-tr.nostock { background: #fff8f8; cursor: not-allowed; opacity: 0.60; }

  .bm-td-nombre  { font-weight: 700; color: #111; }
  .bm-badge {
    display: inline-block; font-size: 10px; font-weight: 800;
    padding: 1px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle;
  }
  .bm-badge-kg    { background: #e3f2fd; color: #1565c0; }
  .bm-badge-promo { color: #E65100; }
  .bm-td-precio   { text-align: right; font-weight: 800; color: #1a472a; font-size: 15px; white-space: nowrap; }
  .bm-td-cat      { color: #555; white-space: nowrap; }
  .bm-td-sok      { color: #2E7D32; font-weight: 700; white-space: nowrap; }
  .bm-td-s0       { color: #e53935; font-weight: 800; white-space: nowrap; }

  .bm-counter {
    padding: 5px 22px; font-size: 12px; color: #999;
    background: #fafafa; border-top: 1px solid #f0f0f0; flex-shrink: 0;
  }

  /* Footer */
  .bm-footer {
    padding: 11px 22px 15px;
    border-top: 1px solid #f0f0f0;
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0; background: #fafafa; border-radius: 0 0 18px 18px;
  }
  .bm-kbd-hints { display: flex; gap: 18px; font-size: 12px; color: #bbb; }
  .bm-btn-ok {
    padding: 10px 20px; border-radius: 10px;
    background: #1a472a; color: #fff; border: none;
    font-size: 13px; font-weight: 800; cursor: pointer;
    transition: background 0.15s; font-family: inherit;
  }
  .bm-btn-ok:hover:not(:disabled) { background: #155722; }
  .bm-btn-ok:disabled { background: #ccc; cursor: not-allowed; }
  .bm-btn-esc {
    padding: 10px 18px; border-radius: 10px;
    background: transparent; color: #888;
    border: 1.5px solid #e0e0e0;
    font-size: 13px; font-weight: 700; cursor: pointer;
    transition: background 0.12s; font-family: inherit;
  }
  .bm-btn-esc:hover { background: #f5f5f5; }
`;function Ht({productos:o,promociones:M,onAgregar:$,onSeleccionarKg:D,onCerrar:h}){const E=()=>[...o].sort((c,I)=>c.nombre.localeCompare(I.nombre,"es")),[C,T]=s.useState(""),[S,a]=s.useState(E),[f,j]=s.useState(()=>E().findIndex(c=>c.stock>0)||0),A=s.useRef(null),w=s.useRef(null),_=s.useRef(0),G=s.useRef([]);s.useEffect(()=>{setTimeout(()=>{var c;return(c=A.current)==null?void 0:c.focus()},70)},[]),s.useEffect(()=>{var c,I;(I=(c=w.current)==null?void 0:c.querySelector(`[data-idx="${f}"]`))==null||I.scrollIntoView({block:"nearest"})},[f]);function U(c){const I=E();if(!c.trim())return I;const y=c.toLowerCase();return I.filter(m=>m.nombre.toLowerCase().includes(y)||m.codigo&&m.codigo.toLowerCase().includes(y))}function N(c){const I=c.target.value;T(I);const y=U(I);a(y),j(y.findIndex(m=>m.stock>0)||0)}function g(){var I;T("");const c=U("");a(c),j(c.findIndex(y=>y.stock>0)||0),(I=A.current)==null||I.focus()}function z(c){const I=Date.now();if(_.current>0&&(G.current.push(I-_.current),G.current.length>30&&G.current.shift()),_.current=I,c.key==="Escape"){c.preventDefault(),h();return}if(c.key==="ArrowDown"){c.preventDefault(),j(y=>{let m=y+1;for(;m<S.length&&S[m].stock<=0;)m++;return m<S.length?m:y});return}if(c.key==="ArrowUp"){c.preventDefault(),j(y=>{let m=y-1;for(;m>=0&&S[m].stock<=0;)m--;return m>=0?m:y});return}if(c.key==="Enter"){c.preventDefault();const y=C.trim().length;if(y>=3&&G.current.length>=2&&G.current.slice(-Math.min(y,15)).every(R=>R<30)){const R=o.find(b=>{var p;return((p=b.codigo)==null?void 0:p.trim())===C.trim()});if(R){G.current=[],_.current=0,H(R);return}}const m=S[f];m&&m.stock>0&&H(m)}}function H(c){c.stock<=0||(c.unidad==="kg"?D(c):$(c,1))}const K=S[f],v=K&&K.stock>0,F=S.length>0;return e.jsxs("div",{className:"bm-overlay",onClick:h,children:[e.jsx("style",{children:Bt}),e.jsxs("div",{className:"bm-modal",onClick:c=>c.stopPropagation(),children:[e.jsxs("div",{className:"bm-top",children:[e.jsxs("div",{className:"bm-header-row",children:[e.jsx("span",{className:"bm-title",children:"🔍 Búsqueda de Productos"}),e.jsx("button",{className:"bm-close",onClick:h,children:"✕"})]}),e.jsx("div",{className:"bm-hint",children:"Escribí las primeras letras del producto o escaneá un código de barras"}),e.jsxs("div",{className:"bm-search-wrap",children:[e.jsx("span",{className:"bm-search-icon",children:"🔍"}),e.jsx("input",{ref:A,className:"bm-search-in",type:"text",value:C,onChange:N,onKeyDown:z,placeholder:"Buscar producto...",autoComplete:"off",spellCheck:"false"}),C&&e.jsx("button",{className:"bm-search-clear",onClick:g,children:"✕"})]})]}),e.jsx("div",{className:"bm-table-wrap",children:F?e.jsxs("table",{className:"bm-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Descripción"}),e.jsx("th",{className:"r",children:"Precio Venta"}),e.jsx("th",{children:"Categoría"}),e.jsx("th",{children:"Stock"})]})}),e.jsx("tbody",{ref:w,children:S.map((c,I)=>{const y=c.stock<=0,m=I===f,J=M==null?void 0:M.find(R=>R.activo&&(R.producto_id===c.id||R.producto_id===null));return e.jsxs("tr",{"data-idx":I,className:`bm-tr${m?" sel":""}${y?" nostock":""}`,onClick:()=>!y&&H(c),onMouseEnter:()=>{y||j(I)},children:[e.jsxs("td",{className:"bm-td-nombre",children:[c.nombre,c.unidad==="kg"&&e.jsx("span",{className:"bm-badge bm-badge-kg",children:"⚖️ kg"}),J&&e.jsx("span",{className:"bm-badge bm-badge-promo",children:"🏷️ PROMO"})]}),e.jsx("td",{className:"bm-td-precio",children:L(c.precio)}),e.jsxs("td",{className:"bm-td-cat",children:[c.emoji||Yt(c.categoria_nombre)," ",c.categoria_nombre||"—"]}),e.jsx("td",{className:y?"bm-td-s0":"bm-td-sok",children:y?"Agotado":`${c.stock} ${c.unidad==="kg"?"kg":"und"}`})]},c.id)})})]}):e.jsxs("div",{className:"bm-empty",children:[e.jsx("div",{className:"bm-empty-icon",children:"🔍"}),e.jsxs("div",{className:"bm-empty-msg",children:["Sin resultados para «",C,"»"]})]})}),F&&e.jsxs("div",{className:"bm-counter",children:[S.length," producto",S.length!==1?"s":"",C.trim()?` · búsqueda: «${C}»`:""]}),e.jsxs("div",{className:"bm-footer",children:[e.jsxs("div",{className:"bm-kbd-hints",children:[e.jsx("span",{children:"↑↓ navegar"}),e.jsx("span",{children:"Enter seleccionar"}),e.jsx("span",{children:"Esc cerrar"})]}),e.jsxs("div",{style:{display:"flex",gap:10},children:[e.jsx("button",{className:"bm-btn-ok",disabled:!v,onClick:()=>v&&H(K),children:"✅ ENTER — Aceptar"}),e.jsx("button",{className:"bm-btn-esc",onClick:h,children:"❌ ESC — Cancelar"})]})]})]})]})}const Me=9;function Oe(o){return{Frutas:"🍎",Verduras:"🥬",Hierbas:"🌿",Raíces:"🥕",Cítricos:"🍊",Lácteos:"🥛",Carnes:"🥩",Bebidas:"🥤",Granos:"🌾",Tubérculos:"🍠",Especias:"🌶️"}[o]||"🛒"}const Ot=`
  .sdrop-item {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 16px; cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    border-left: 3px solid transparent;
    transition: background 0.1s, border-left-color 0.1s;
  }
  .sdrop-item:last-child { border-bottom: none; }
  .sdrop-item:hover      { background: #f6fdf7; }
  .sdrop-item.active     { background: #f0fdf4; border-left-color: #1a472a; }
  .sdrop-item.sinstock   { opacity: 0.55; cursor: not-allowed; }
  .sdrop-item.sinstock:hover { background: #fff5f5; }
`,Vt=`
  .desc-panel {
    background: #f8fdf9; border: 1.5px solid #a5d6a7;
    border-radius: 8px; padding: 10px 12px; margin-top: 6px;
  }
  .desc-panel.desc-global {
    background: #fffde7; border-color: #FFD54F; margin: 6px 0;
  }
  .desc-tabs { display: flex; gap: 4px; margin-bottom: 4px; }
  .desc-tab {
    flex: 1; padding: 5px 0; font-size: 11px; font-weight: 700;
    border: 1.5px solid #ddd; border-radius: 6px; cursor: pointer;
    background: #fff; color: #666; transition: all 0.1s;
  }
  .desc-tab.active { background: #1a472a; color: #fff; border-color: #1a472a; }
  .desc-input {
    flex: 1; min-width: 0; padding: 6px 10px; font-size: 14px; font-weight: 700;
    border: 1.5px solid #c8e6c9; border-radius: 6px; outline: none;
    background: #fff; color: #1a472a; width: 100%; box-sizing: border-box;
  }
  .desc-input:focus { border-color: #1a472a; }
  .desc-btn-ok {
    padding: 5px 12px; background: #1a472a; color: #fff;
    border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;
  }
  .desc-btn-ok:disabled { background: #ccc; cursor: not-allowed; }
  .desc-btn-quitar {
    padding: 5px 12px; background: #ffebee; color: #c62828;
    border: 1.5px solid #ef9a9a; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;
  }
  .desc-btn-cancel {
    padding: 5px 12px; background: #f5f5f5; color: #666;
    border: 1.5px solid #ddd; border-radius: 6px; font-size: 12px; font-weight: 700;
    cursor: pointer; margin-left: auto;
  }
`,Gt=`
  .tiq-bar {
    display: flex; align-items: center; gap: 3px;
    padding: 5px 8px;
    background: linear-gradient(135deg, #0d2b0d, #163d22);
    border-bottom: 2px solid rgba(230,81,0,0.40);
    overflow-x: auto; overflow-y: hidden;
    scrollbar-width: none; flex-shrink: 0;
  }
  .tiq-bar::-webkit-scrollbar { display: none; }
  .tiq-tab {
    flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 7px 4px 10px; border-radius: 8px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    border: 1.5px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.06);
    transition: all 0.15s; white-space: nowrap; user-select: none;
  }
  .tiq-tab:hover { background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.22); }
  .tiq-tab.tiq-active {
    background: linear-gradient(135deg,#E65100,#FF9800);
    color: #fff; border-color: rgba(255,255,255,0.28);
    box-shadow: 0 2px 10px rgba(230,81,0,0.42);
  }
  .tiq-dot { width:5px; height:5px; border-radius:50%; background:#69F0AE; flex-shrink:0; }
  .tiq-close {
    width:14px; height:14px; border-radius:50%;
    background: rgba(255,255,255,0.15); border:none; cursor:pointer;
    font-size:8px; font-weight:900; color:rgba(255,255,255,0.7);
    display:inline-flex; align-items:center; justify-content:center;
    transition: background 0.15s, color 0.15s; flex-shrink:0; padding:0; line-height:1;
  }
  .tiq-close:hover { background: rgba(200,0,0,0.55); color:#fff; }
  .tiq-add {
    width:22px; height:22px; border-radius:50%;
    background: rgba(255,255,255,0.10);
    border: 1.5px dashed rgba(255,255,255,0.35);
    color: rgba(255,255,255,0.65); font-size:15px; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
    flex-shrink:0; transition:all 0.15s; padding:0; line-height:1; margin-left:3px;
  }
  .tiq-add:hover:not(:disabled) { background:rgba(255,255,255,0.22); border-color:rgba(255,255,255,0.6); color:#fff; }
  .tiq-add:disabled { opacity:0.3; cursor:not-allowed; }
`;function Kt({onSuccess:o,onCancelar:M}){const[$,D]=s.useState(""),[h,E]=s.useState(""),[C,T]=s.useState(!1),S=s.useRef();s.useEffect(()=>{setTimeout(()=>{var f;return(f=S.current)==null?void 0:f.focus()},120)},[]);async function a(f){const j=f??$;if(j.length!==4)return;T(!0);const A=await window.db.cajeros.verificarAdmin(j);T(!1),A.ok?o():(E("PIN incorrecto"),D(""))}return e.jsx("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9e3},children:e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"32px 36px",maxWidth:320,width:"90vw",textAlign:"center",boxShadow:"0 12px 48px rgba(0,0,0,0.25)"},children:[e.jsx("div",{style:{fontSize:40,marginBottom:12},children:"🔐"}),e.jsx("h3",{style:{margin:"0 0 8px",color:"#1a472a",fontSize:18,fontWeight:800},children:"Autorización requerida"}),e.jsxs("p",{style:{margin:"0 0 24px",color:"#666",fontSize:13,lineHeight:1.5},children:["El descuento supera el límite permitido.",e.jsx("br",{}),"Ingresá el PIN de administrador."]}),e.jsxs("div",{style:{display:"flex",gap:10,justifyContent:"center",marginBottom:16,position:"relative"},onClick:()=>{var f;return(f=S.current)==null?void 0:f.focus()},children:[[0,1,2,3].map(f=>e.jsx("div",{style:{width:48,height:48,borderRadius:10,border:`2px solid ${h?"#e53935":f<$.length?"#1a472a":"#ddd"}`,background:f<$.length?"#f0fdf4":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,cursor:"text"},children:$[f]?"●":""},f)),e.jsx("input",{ref:S,type:"password",inputMode:"numeric",value:$,maxLength:4,onChange:f=>{const j=f.target.value.replace(/\D/g,"").slice(0,4);D(j),E(""),j.length===4&&a(j)},style:{position:"absolute",inset:0,opacity:0,cursor:"pointer"}})]}),h&&e.jsxs("div",{style:{color:"#e53935",fontSize:12,marginBottom:12,fontWeight:600},children:["⚠️ ",h]}),e.jsxs("div",{style:{display:"flex",gap:10},children:[e.jsx("button",{onClick:M,style:{flex:1,padding:"10px",background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"},children:"Cancelar"}),e.jsx("button",{onClick:()=>a(),disabled:$.length!==4||C,style:{flex:1,padding:"10px",background:$.length===4&&!C?"#1a472a":"#ccc",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:$.length===4?"pointer":"not-allowed"},children:C?"...":"Autorizar"})]})]})})}function Ut({item:o,onAplicar:M,onQuitar:$,onCerrar:D}){const[h,E]=s.useState("pct"),[C,T]=s.useState(o.desc_manual_pct>0?String(Math.round(o.desc_manual_pct)):""),S=s.useRef();s.useEffect(()=>{setTimeout(()=>{var w;return(w=S.current)==null?void 0:w.focus()},60)},[]);const a=parseFloat(C)||0,f=h==="pct"?a:o.precio_final>0&&a>0?(o.precio_final-a)/o.precio_final*100:0,j=h==="pct"?o.precio_final*(1-a/100):a,A=h==="pct"?a>0&&a<=100:a>0&&a<o.precio_final;return e.jsxs("div",{className:"desc-panel",children:[e.jsxs("div",{className:"desc-tabs",children:[e.jsx("button",{className:`desc-tab${h==="pct"?" active":""}`,onClick:()=>{E("pct"),T("")},children:"% Descuento"}),e.jsx("button",{className:`desc-tab${h==="precio"?" active":""}`,onClick:()=>{E("precio"),T("")},children:"Precio nuevo"})]}),e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",marginTop:8},children:[e.jsx("input",{ref:S,type:"number",min:"0",max:h==="pct"?100:o.precio_final-1,step:h==="pct"?1:10,value:C,onChange:w=>T(w.target.value),onKeyDown:w=>{w.key==="Enter"&&(w.preventDefault(),A&&M(f)),w.key==="Escape"&&D()},placeholder:h==="pct"?"Ej: 10":L(o.precio_final),className:"desc-input"}),A&&e.jsxs("span",{style:{color:"#1a472a",fontSize:12,whiteSpace:"nowrap",fontWeight:600},children:["→ ",L(j)]})]}),e.jsxs("div",{style:{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"},children:[e.jsx("button",{onClick:()=>{A&&M(f)},disabled:!A,className:"desc-btn-ok",children:"✓ Aplicar"}),o.desc_manual_pct>0&&e.jsx("button",{onClick:$,className:"desc-btn-quitar",children:"✕ Quitar"}),e.jsx("button",{onClick:D,className:"desc-btn-cancel",children:"Cerrar"})]})]})}function Jt({totalBase:o,descGlobal:M,onAplicar:$,onQuitar:D,onCerrar:h}){const[E,C]=s.useState(M.tipo||"pct"),[T,S]=s.useState(M.valor||""),a=s.useRef();s.useEffect(()=>{setTimeout(()=>{var _;return(_=a.current)==null?void 0:_.focus()},60)},[]);const f=parseFloat(T)||0,j=E==="pct"?o*(f/100):Math.min(f,o),A=E==="pct"?f:o>0?f/o*100:0,w=f>0&&j>0&&j<o;return e.jsxs("div",{className:"desc-panel desc-global",children:[e.jsx("div",{style:{fontWeight:700,fontSize:12,color:"#E65100",marginBottom:8},children:"🏷️ Descuento sobre el total"}),e.jsxs("div",{className:"desc-tabs",children:[e.jsx("button",{className:`desc-tab${E==="pct"?" active":""}`,onClick:()=>{C("pct"),S("")},children:"% Porcentaje"}),e.jsx("button",{className:`desc-tab${E==="monto"?" active":""}`,onClick:()=>{C("monto"),S("")},children:"Monto fijo ₡"})]}),e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",marginTop:8},children:[e.jsx("input",{ref:a,type:"number",min:"0",value:T,onChange:_=>S(_.target.value),onKeyDown:_=>{_.key==="Enter"&&(_.preventDefault(),w&&$(E,T,A)),_.key==="Escape"&&h()},placeholder:E==="pct"?"Ej: 5":"Ej: 1000",className:"desc-input"}),w&&e.jsxs("span",{style:{color:"#E65100",fontSize:12,whiteSpace:"nowrap",fontWeight:600},children:["−",L(j)]})]}),e.jsxs("div",{style:{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"},children:[e.jsx("button",{onClick:()=>{w&&$(E,T,A)},disabled:!w,className:"desc-btn-ok",children:"✓ Aplicar"}),M.aplicado&&e.jsx("button",{onClick:D,className:"desc-btn-quitar",children:"✕ Quitar"}),e.jsx("button",{onClick:h,className:"desc-btn-cancel",children:"Cerrar"})]})]})}const Qt=["0","1","2","4","8","13"];function Zt({cabysGenerico:o,onAgregar:M,onCerrar:$}){const[D,h]=s.useState(""),[E,C]=s.useState(""),[T,S]=s.useState("13"),[a,f]=s.useState("unidad"),[j,A]=s.useState(""),[w,_]=s.useState(""),G=s.useRef();s.useEffect(()=>{setTimeout(()=>{var g;return(g=G.current)==null?void 0:g.focus()},80)},[]);function U(){if(!D.trim()){_("La descripción es obligatoria.");return}const g=parseFloat(E);if(!g||g<=0){_("El precio debe ser mayor a ₡0.");return}let z=1;if(a==="kg"&&(z=parseFloat(j),!z||z<=0)){_("Ingresá la cantidad en kg (mayor a 0).");return}M({nombre:D.trim(),precio:g,tasa_impuesto:parseFloat(T),unidad:a,cantidad:z,cabys_codigo:o||""})}const N=E&&parseFloat(E)>0&&(a==="unidad"||j&&parseFloat(j)>0)?parseFloat(E)*(a==="kg"?parseFloat(j)||0:1):0;return e.jsx("div",{className:"modal-overlay",onClick:$,style:{zIndex:1100},children:e.jsxs("div",{className:"modal modal-sm",onClick:g=>g.stopPropagation(),style:{maxWidth:390},children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("span",{className:"modal-title",children:"➕ Producto Común"}),e.jsx("button",{className:"btn-close",onClick:$,children:"✕"})]}),e.jsxs("div",{className:"modal-body",style:{display:"flex",flexDirection:"column",gap:14},children:[e.jsxs("div",{style:{background:"#f0fdf4",border:"1px solid #c8e6c9",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#2E7D32",lineHeight:1.5},children:["Para productos que ",e.jsx("strong",{children:"no están en el inventario"}),". Usa el CABYS genérico configurado en Ajustes → Hacienda para que la línea sea válida en facturación electrónica."]}),e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsxs("label",{className:"form-label",children:["Descripción ",e.jsx("span",{style:{color:"var(--rojo)"},children:"*"})]}),e.jsx("input",{ref:G,className:"form-input",value:D,onChange:g=>{h(g.target.value),_("")},onKeyDown:g=>{g.key==="Enter"&&(g.preventDefault(),U())},placeholder:"Ej: Producto varios, mandado, etc."})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:[e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Precio ₡ (con imp.)"}),e.jsx("input",{className:"form-input",type:"number",min:"0",step:"1",value:E,onChange:g=>{C(g.target.value),_("")},onKeyDown:g=>{g.key==="Enter"&&(g.preventDefault(),U())},placeholder:"0"})]}),e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Impuesto (IVA)"}),e.jsx("select",{className:"form-select",value:T,onChange:g=>S(g.target.value),children:Qt.map(g=>e.jsxs("option",{value:g,children:[g,"%"]},g))})]})]}),e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Unidad de venta"}),e.jsxs("select",{className:"form-select",value:a,onChange:g=>{f(g.target.value),A(""),_("")},children:[e.jsx("option",{value:"unidad",children:"Unidad (und)"}),e.jsx("option",{value:"kg",children:"Peso (kg)"})]})]}),a==="kg"&&e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Cantidad (kg)"}),e.jsx("input",{className:"form-input",type:"number",min:"0.001",step:"0.001",value:j,onChange:g=>{A(g.target.value),_("")},onKeyDown:g=>{g.key==="Enter"&&(g.preventDefault(),U())},placeholder:"0.000"})]}),N>0&&e.jsxs("div",{style:{textAlign:"right",fontSize:13,color:"var(--verde-oscuro)",fontWeight:700},children:["Subtotal: ",L(N)]}),w&&e.jsxs("div",{style:{fontSize:12,color:"var(--rojo)",fontWeight:600},children:["⚠️ ",w]}),!o&&e.jsxs("div",{style:{fontSize:12,color:"#E65100",background:"#FFF3E0",borderRadius:8,padding:"8px 12px",border:"1px solid #FFE0B2"},children:["⚠️ No hay CABYS genérico configurado. Andá a ",e.jsx("strong",{children:"Ajustes → Hacienda"})," y configurá un código para que esta línea sea válida en facturas electrónicas."]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn btn-ghost",onClick:$,children:"Cancelar"}),e.jsx("button",{className:"btn btn-primary",onClick:U,children:"➕ Agregar al carrito"})]})]})})}function en(){var it;const{permisos:o}=ct(),M=o.editar_precios_carrito,[$,D]=s.useState([]),[h,E]=s.useState([]),[C,T]=s.useState(null),[S,a]=s.useState({}),[f,j]=s.useState(""),[A,w]=s.useState([]),[_,G]=s.useState(!1),[U,N]=s.useState(0),[g,z]=s.useState(null),[H,K]=s.useState(""),{tickets:v,setTickets:F,activeId:c,setActiveId:I,ticketIdRef:y}=Et(),m=s.useRef(v);m.current=v;const J=v.find(t=>t.id===c)??v[0],R=J.cart,b=J.descGlobal,p=J.kgEdits,d=J.kgWarnings;function x(t){F(n=>n.map(r=>r.id===c?{...r,cart:typeof t=="function"?t(r.cart):t}:r))}function u(t){F(n=>n.map(r=>r.id===c?{...r,descGlobal:typeof t=="function"?t(r.descGlobal):t}:r))}function i(t){F(n=>n.map(r=>r.id===c?{...r,kgEdits:typeof t=="function"?t(r.kgEdits):t}:r))}function k(t){F(n=>n.map(r=>r.id===c?{...r,kgWarnings:typeof t=="function"?t(r.kgWarnings):t}:r))}function Y(t){I(t),te(null),Q(!1)}function O(){if(v.length>=ke)return;const t=++y.current;F(n=>[...n,Dt(t)]),I(t),te(null),Q(!1)}function X(t){const n=m.current,r=n.find(ee=>ee.id===t);if(!r)return;const q=n.findIndex(ee=>ee.id===t)+1;if(r.cart.length>0&&!window.confirm(`¿Descartar el Tiquete ${q} con ${r.cart.length} producto${r.cart.length>1?"s":""}?`))return;const B=n.filter(ee=>ee.id!==t);if(B.length!==0&&(F(B),c===t)){const ee=n.findIndex(se=>se.id===t),ce=B[Math.min(ee,B.length-1)];I(ce.id),te(null),Q(!1)}}const P=v.length>1||v.some(t=>t.cart.length>0),[l,W]=s.useState(100),[Z,te]=s.useState(null),[de,Q]=s.useState(!1),[ae,ue]=s.useState(null),[ve,Ie]=s.useState(null),[Ve,we]=s.useState(""),[Fe,Ge]=s.useState(null),[Ae,Se]=s.useState(!1),[Ke,pt]=s.useState(null),[Ne,Ue]=s.useState(!1),[Ce,Je]=s.useState(!1),[Re,ye]=s.useState(!1),[ft,Pe]=s.useState(!1),oe=s.useRef(null),_e=s.useRef(null),Qe=s.useRef(null),pe=s.useRef(0),ie=s.useRef([]),Ze=s.useRef(0);s.useEffect(()=>{var t;xt(),(t=oe.current)==null||t.focus()},[]),s.useEffect(()=>{function t(n){if(n.key==="F10"&&(n.preventDefault(),!Ae&&!Ne&&!Ce&&ye(r=>!r)),n.key==="F12"&&(n.preventDefault(),R.length>0&&!Re&&!Ne&&!Ce&&Se(!0)),n.ctrlKey&&!n.altKey&&!n.shiftKey){const r=parseInt(n.key,10);if(r>=1&&r<=ke){const q=m.current;r-1<q.length&&(n.preventDefault(),Y(q[r-1].id))}}}return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)},[R.length,Ae,Ne,Ce,Re]),s.useEffect(()=>{function t(n){_e.current&&!_e.current.contains(n.target)&&oe.current&&!oe.current.closest(".search-wrapper").contains(n.target)&&G(!1)}return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]),s.useEffect(()=>{var n;if(!_)return;const t=(n=_e.current)==null?void 0:n.querySelector(`[data-idx="${U}"]`);t==null||t.scrollIntoView({block:"nearest"})},[U,_]),s.useEffect(()=>{g&&setTimeout(()=>{var t;return(t=Qe.current)==null?void 0:t.focus()},60)},[g]);async function xt(){const[t,n,r,q,B]=await Promise.all([window.db.caja.actual(),window.db.productos.listar(),window.db.promociones.listar(),window.db.config.obtenerTodo(),window.db.caja.descuentoMax()]);T(t),D(n),E(r.filter(ee=>ee.activo)),a(q),W(B??100)}function ht(t){if(!t.trim())return[];const n=t.toLowerCase();return $.filter(r=>r.nombre.toLowerCase().includes(n)||r.codigo&&r.codigo.toLowerCase().includes(n))}function gt(t){const n=t.target.value;if(j(n),!n.trim()){pe.current=0,ie.current=[],w([]),G(!1);return}const r=ht(n);w(r),G(!0),N(0)}function mt(t){const n=Date.now();if(pe.current>0&&(ie.current.push(n-pe.current),ie.current.length>30&&ie.current.shift()),pe.current=n,t.key==="Escape"){t.preventDefault(),et();return}if(!g){if(_&&A.length>0){if(t.key==="ArrowDown"){t.preventDefault(),N(r=>Math.min(r+1,Math.min(A.length,Me)-1));return}if(t.key==="ArrowUp"){t.preventDefault(),N(r=>Math.max(r-1,0));return}}if(t.key==="Enter"){t.preventDefault();const r=f.trim().length;if(r>=3&&ie.current.length>=2){const ee=ie.current.slice(-Math.min(r,15));if(ee.every(se=>se<30)&&ee.length>=2){const se=$.find(V=>V.codigo&&V.codigo.trim()===f.trim());if(se){ie.current=[],pe.current=0,We(se);return}}}const B=A.slice(0,Me)[U]??(A.length===1?A[0]:null);B&&We(B)}}}function We(t){var n;if(t.stock<=0){ge(`⚠️ ${t.nombre} no tiene stock disponible`,"error");return}G(!1),N(0),t.unidad==="kg"?(j(""),w([]),z({prod:t}),K("1")):($e(t,1),j(""),w([]),pe.current=0,ie.current=[],(n=oe.current)==null||n.focus())}function Xe(){var n;const t=parseFloat(H.replace(",","."));!t||t<=0||($e(g.prod,t),z(null),K(""),j(""),pe.current=0,ie.current=[],(n=oe.current)==null||n.focus())}function qe(){var t;z(null),K(""),j(""),pe.current=0,ie.current=[],(t=oe.current)==null||t.focus()}function et(){var t;j(""),w([]),G(!1),N(0),z(null),K(""),pe.current=0,ie.current=[],(t=oe.current)==null||t.focus()}function Le(t){return h.find(n=>n.activo&&(n.producto_id===t||n.producto_id===null))||null}function bt(t,n){if(!n)return{precio:t,desc:0,desc_txt:""};if(n.tipo==="porcentaje"){const r=t*(n.valor/100);return{precio:t-r,desc:r,desc_txt:`${n.nombre} -${n.valor}%`}}return n.tipo==="precio_especial"?{precio:n.precio_especial,desc:t-n.precio_especial,desc_txt:n.nombre}:n.tipo==="2x1"?{precio:t,desc:0,desc_txt:`${n.nombre} (2x1)`}:{precio:t,desc:0,desc_txt:""}}function $e(t,n){const r=Le(t.id),{precio:q,desc:B,desc_txt:ee}=bt(t.precio,r);if(t.unidad==="unidad"){const ce=R.find(se=>se.productoId===t.id);if(ce){x(se=>se.map(V=>V.cartId===ce.cartId?{...V,cantidad:V.cantidad+1,subtotal:V.precio_cobrado*(V.cantidad+1)}:V)),ge(`+1 ${t.nombre}`);return}}x(ce=>[...ce,{cartId:++Ze.current,productoId:t.id,nombre:t.nombre,precio_unitario:t.precio,precio_final:q,precio_cobrado:q,cantidad:n,unidad:t.unidad,tasa_impuesto:t.tasa_impuesto||0,subtotal:q*n,desc_manual_pct:0,promocion_id:r?r.id:null,promocion_descripcion:ee}]),ge(`✓ ${t.nombre}`)}function vt({nombre:t,precio:n,tasa_impuesto:r,unidad:q,cantidad:B,cabys_codigo:ee}){x(ce=>[...ce,{cartId:++Ze.current,productoId:null,nombre:t,precio_unitario:n,precio_final:n,precio_cobrado:n,cantidad:B,unidad:q,tasa_impuesto:r,subtotal:n*B,desc_manual_pct:0,promocion_id:null,promocion_descripcion:"",es_generico:!0,cabys_codigo:ee}]),Pe(!1),ge(`✓ ${t}`)}function jt(t){var n;if(t.stock<=0){ge(`⚠️ ${t.nombre} sin stock`,"error");return}t.unidad==="kg"?(z({prod:t}),K("1"),j(""),G(!1)):($e(t,1),(n=oe.current)==null||n.focus())}function tt(t){x(n=>n.filter(r=>r.cartId!==t)),Z===t&&te(null),i(n=>{const r={...n};return delete r[t],r}),k(n=>{const r={...n};return delete r[t],r})}function ze(t,n){const r=parseFloat(n);if(isNaN(r)||r<=0){tt(t);return}x(q=>q.map(B=>B.cartId===t?{...B,cantidad:r,subtotal:B.precio_cobrado*r}:B))}function yt(t,n){x(r=>r.map(q=>{if(q.cartId!==t)return q;const B=q.precio_final*(1-n/100);return{...q,desc_manual_pct:n,precio_cobrado:B,subtotal:B*q.cantidad}})),te(null)}function kt(t){x(n=>n.map(r=>r.cartId!==t?r:{...r,desc_manual_pct:0,precio_cobrado:r.precio_final,subtotal:r.precio_final*r.cantidad})),te(null)}function nt(t){const n=parseFloat(Ve);!isNaN(n)&&n>=0&&x(r=>r.map(q=>q.cartId!==t?q:{...q,precio_cobrado:n,precio_final:n,desc_manual_pct:0,subtotal:n*q.cantidad})),Ie(null),we("")}function wt(t,n){u({tipo:t,valor:n,aplicado:!0}),Q(!1)}function St(){u({tipo:"pct",valor:"",aplicado:!1}),Q(!1)}function ot(t,n){t<=l?n():(te(null),Q(!1),ue({callback:n}))}const Ye=R.reduce((t,n)=>t+n.precio_unitario*n.cantidad,0),Ee=R.reduce((t,n)=>t+n.subtotal,0);let De=0;if(b.aplicado){const t=parseFloat(b.valor)||0;De=b.tipo==="pct"?Ee*(t/100):Math.min(t,Ee)}const he=Math.max(0,Ee-De),Te=Ye-he;async function Nt({metodo_pago:t,monto_recibido:n,cambio:r,pago_efectivo:q,pago_tarjeta:B,pago_sinpe:ee}){if(!R.length)return;const ce=b.aplicado&&b.tipo==="pct"&&parseFloat(b.valor)||0,se={subtotal:Ye,descuento_total:Te,impuesto:0,total:he,metodo_pago:t,monto_recibido:n,cambio:r,pago_efectivo:q||0,pago_tarjeta:B||0,pago_sinpe:ee||0,desc_global_pct:ce,desc_global_monto:De,items:R.map(V=>({producto_id:V.productoId,nombre:V.nombre,precio_unitario:V.precio_unitario,cantidad:V.cantidad,unidad:V.unidad,tasa_impuesto:V.tasa_impuesto,descuento:V.precio_unitario*V.cantidad-V.subtotal,subtotal:V.subtotal,promocion_id:V.promocion_id,promocion_descripcion:V.promocion_descripcion,desc_manual_pct:V.desc_manual_pct||0,cabys_codigo:V.cabys_codigo||"",producto_generico:V.es_generico?1:0}))};try{const V=await window.db.ventas.crear(se);pt(V),Se(!1),Ue(!0),F(_t=>_t.map(He=>He.id===c?{...He,cart:[],descGlobal:{tipo:"pct",valor:"",aplicado:!1},kgEdits:{},kgWarnings:{}}:He)),te(null),j(""),ge(`✓ Venta ${V.numero} completada — Cambio: ${L(r)}`)}catch(V){ge("Error al registrar la venta: "+V.message,"error")}}function Ct(){var t;F(n=>n.map(r=>r.id===c?{...r,cart:[],descGlobal:{tipo:"pct",valor:"",aplicado:!1},kgEdits:{},kgWarnings:{}}:r)),te(null),Q(!1),(t=oe.current)==null||t.focus()}function ge(t,n="success"){Ge({msg:t,tipo:n}),setTimeout(()=>Ge(null),n==="error"?4e3:2200)}const rt=A.slice(0,Me),Be=A.length-Me,st=H&&g?g.prod.precio*parseFloat(H.replace(",",".")||"0"):0,at=v.findIndex(t=>t.id===c)+1;return e.jsxs("div",{className:"pos-layout",children:[e.jsx("style",{children:Ot}),e.jsx("style",{children:Vt}),e.jsx("style",{children:Gt}),e.jsxs("div",{className:"pos-left",children:[e.jsxs("div",{className:"pos-search-bar",children:[e.jsxs("div",{className:"search-wrapper",style:{position:"relative"},children:[e.jsxs("div",{className:"search-bar",children:[e.jsx("span",{style:{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#388E3C",fontSize:22,pointerEvents:"none"},children:"🔍"}),e.jsx("input",{ref:oe,type:"text",value:f,onChange:gt,onKeyDown:mt,placeholder:"Buscar producto o escanear código de barras...",style:{paddingLeft:46},autoFocus:!0,autoComplete:"off",spellCheck:"false"}),f&&e.jsx("button",{onClick:et,style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.3)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14},title:"Limpiar (Escape)",children:"✕"})]}),_&&!g&&e.jsx("div",{ref:_e,style:{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",border:"1.5px solid #1a472a",borderRadius:12,boxShadow:"0 12px 40px rgba(0,0,0,0.20)",zIndex:300,overflow:"hidden",maxHeight:380,overflowY:"auto"},children:rt.length===0?e.jsxs("div",{style:{padding:"22px 16px",textAlign:"center",color:"#aaa",fontSize:14},children:["🔍 Sin resultados para ",e.jsxs("strong",{children:['"',f,'"']})]}):e.jsxs(e.Fragment,{children:[rt.map((t,n)=>{const r=t.stock<=0,q=Le(t.id),B=n===U;return e.jsxs("div",{"data-idx":n,className:`sdrop-item${B?" active":""}${r?" sinstock":""}`,onMouseEnter:()=>N(n),onClick:()=>!r&&We(t),children:[e.jsx("span",{style:{fontSize:24,flexShrink:0},children:t.emoji||Oe(t.categoria_nombre)}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:14,color:r?"#e53935":"#111",display:"flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:t.nombre}),r&&e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff",background:"#e53935",borderRadius:4,padding:"1px 6px",flexShrink:0},children:"SIN STOCK"}),q&&!r&&e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#E65100",flexShrink:0},children:"🏷️ PROMO"})]}),e.jsxs("div",{style:{fontSize:12,marginTop:2,display:"flex",gap:10},children:[e.jsxs("span",{style:{color:r?"#e53935":"#2E7D32",fontWeight:600},children:["Stock: ",r?"Agotado":`${t.stock} ${t.unidad}`]}),t.codigo&&e.jsxs("span",{style:{color:"#bbb"},children:["#",t.codigo]})]})]}),e.jsxs("div",{style:{textAlign:"right",flexShrink:0},children:[e.jsx("div",{style:{fontWeight:800,fontSize:15,color:"#1a472a"},children:L(t.precio)}),e.jsx("div",{style:{fontSize:11,color:"#aaa",marginTop:1},children:t.unidad==="kg"?"⚖️ /kg":"📦 /und"})]})]},t.id)}),Be>0&&e.jsxs("div",{style:{padding:"8px 16px",fontSize:12,color:"#999",background:"#f9f9f9",textAlign:"center",borderTop:"1px solid #f0f0f0"},children:["+",Be," resultado",Be>1?"s":""," — refiná la búsqueda"]}),e.jsxs("div",{style:{padding:"6px 16px",fontSize:11,color:"#bbb",background:"#fafafa",borderTop:"1px solid #f0f0f0",display:"flex",gap:16},children:[e.jsx("span",{children:"↑↓ navegar"}),e.jsx("span",{children:"Enter seleccionar"}),e.jsx("span",{children:"Escape cancelar"})]})]})})]}),e.jsxs("div",{style:{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"},children:[e.jsxs("button",{onClick:()=>ye(!0),style:{padding:"7px 16px",background:"linear-gradient(135deg, #E65100, #FF9800)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:7,boxShadow:"0 3px 12px rgba(230,81,0,0.40)",letterSpacing:"0.2px"},onMouseEnter:t=>{t.currentTarget.style.transform="translateY(-1px)",t.currentTarget.style.boxShadow="0 5px 16px rgba(230,81,0,0.50)"},onMouseLeave:t=>{t.currentTarget.style.transform="",t.currentTarget.style.boxShadow="0 3px 12px rgba(230,81,0,0.40)"},children:["🔍 Buscar producto",e.jsx("span",{style:{fontSize:10,opacity:.8,fontWeight:700,background:"rgba(0,0,0,0.15)",padding:"1px 6px",borderRadius:4},children:"F10"})]}),e.jsx("button",{onClick:()=>Pe(!0),style:{padding:"7px 14px",background:"rgba(255,255,255,0.12)",border:"1.5px dashed rgba(255,255,255,0.45)",borderRadius:10,color:"rgba(255,255,255,0.85)",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:6},onMouseEnter:t=>{t.currentTarget.style.background="rgba(255,255,255,0.22)",t.currentTarget.style.color="#fff"},onMouseLeave:t=>{t.currentTarget.style.background="rgba(255,255,255,0.12)",t.currentTarget.style.color="rgba(255,255,255,0.85)"},title:"Agregar producto que no está en el inventario",children:"➕ Producto Común"})]}),C?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginTop:8},children:[e.jsx("div",{className:"caja-dot abierta",style:{width:10,height:10,borderRadius:"50%",flexShrink:0}}),e.jsxs("span",{style:{fontSize:12,color:"rgba(255,255,255,.82)",fontWeight:600},children:["Caja abierta · ",e.jsx("span",{style:{color:"#A5D6A7"},children:C.usuario})," · ",(it=C.fecha_apertura)==null?void 0:it.slice(0,10)]})]}):e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,marginTop:8},children:[e.jsx("span",{style:{fontSize:14},children:"⚠️"}),e.jsx("span",{style:{fontSize:12,color:"#FFEB3B",fontWeight:600},children:"Sin caja abierta — vaya a Caja para abrir sesión"})]})]}),Fe&&e.jsx("div",{className:`alert alert-${Fe.tipo||"success"}`,style:{margin:"10px 12px 0",borderRadius:8},children:Fe.msg}),e.jsx("div",{className:"pos-products",children:$.length===0?e.jsxs("div",{style:{textAlign:"center",padding:40,color:"var(--texto-muted)"},children:[e.jsx("div",{style:{fontSize:40},children:"📦"}),e.jsx("p",{style:{marginTop:10},children:"Cargando productos..."})]}):e.jsx("div",{className:"product-grid",children:$.map(t=>e.jsxs("div",{className:`product-card${t.unidad==="kg"?" kg":""}${t.stock<=0?" sinstock":""}`,onClick:()=>jt(t),title:t.stock<=0?"Sin stock disponible":void 0,children:[e.jsx("div",{style:{fontSize:42,lineHeight:1},children:t.emoji||Oe(t.categoria_nombre)}),e.jsx("div",{className:"prod-name",children:t.nombre}),e.jsx("div",{className:"prod-price",children:L(t.precio)}),e.jsxs("div",{className:"prod-stock",children:["Stock:"," ",t.stock<=0?e.jsx("span",{style:{color:"var(--rojo)"},children:"Agotado"}):`${t.stock} ${t.unidad==="kg"?"kg":"und"}`]}),e.jsx("span",{className:"prod-unit",children:t.unidad==="kg"?"⚖️ Peso":"1 Und"}),Le(t.id)&&e.jsx("div",{style:{fontSize:10,color:"var(--naranja-oscuro)",fontWeight:700,marginTop:3},children:"🏷️ PROMO"})]},t.id))})})]}),e.jsxs("div",{className:"pos-right",children:[e.jsx("div",{className:"pos-cart-header",children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx("span",{style:{fontSize:22},children:"🛒"}),e.jsxs("div",{children:[e.jsx("div",{className:"pos-cart-title",children:"Carrito de Compras"}),e.jsx("div",{className:"pos-cart-info",children:P?R.length===0?`Tiquete ${at} — vacío`:`Tiquete ${at} · ${R.length} ítem${R.length>1?"s":""} · ${L(he)}`:R.length===0?"Sin productos agregados":`${R.length} ítem${R.length>1?"s":""} · ${L(he)}`})]})]})}),P&&e.jsxs("div",{className:"tiq-bar",children:[v.map((t,n)=>e.jsxs("div",{className:`tiq-tab${t.id===c?" tiq-active":""}`,onClick:()=>Y(t.id),title:`Tiquete ${n+1}${t.cart.length>0?` · ${t.cart.length} ítem${t.cart.length>1?"s":""}`:" · vacío"}  ${n<4?`(Ctrl+${n+1})`:""}`,children:[t.cart.length>0&&e.jsx("span",{className:"tiq-dot"}),"Tiquete ",n+1,v.length>1&&e.jsx("button",{className:"tiq-close",onClick:r=>{r.stopPropagation(),X(t.id)},title:"Cerrar tiquete",children:"✕"})]},t.id)),e.jsx("button",{className:"tiq-add",onClick:O,disabled:v.length>=ke,title:v.length>=ke?`Máximo ${ke} tiquetes simultáneos`:"Nuevo tiquete",children:"+"})]}),e.jsx("div",{className:"pos-cart-body",children:R.length===0?e.jsxs("div",{className:"cart-empty",children:[e.jsx("div",{className:"cart-empty-icon",children:"🛒"}),e.jsx("p",{style:{fontWeight:700,color:"var(--texto-sec)"},children:"El carrito está vacío"}),e.jsxs("p",{style:{fontSize:12,color:"var(--texto-muted)"},children:["Buscá un producto arriba,",e.jsx("br",{}),"hacé clic en una tarjeta",e.jsx("br",{}),"o escaneá un código de barras"]})]}):R.map(t=>e.jsxs("div",{className:"cart-item",children:[e.jsxs("div",{className:"cart-item-header",children:[e.jsx("div",{className:"cart-item-name",children:t.nombre}),e.jsx("div",{className:"cart-item-price",children:ve===t.cartId?e.jsx("input",{type:"number",min:"0",step:"1",autoFocus:!0,value:Ve,onChange:n=>we(n.target.value),onBlur:()=>nt(t.cartId),onKeyDown:n=>{n.key==="Enter"&&(n.preventDefault(),nt(t.cartId)),n.key==="Escape"&&(Ie(null),we(""))},style:{width:88,textAlign:"right",fontSize:13,fontWeight:700,border:"1.5px solid var(--verde)",borderRadius:6,padding:"2px 6px",outline:"none",color:"var(--verde-oscuro)"}}):e.jsxs(e.Fragment,{children:[t.desc_manual_pct>0&&e.jsx("span",{style:{textDecoration:"line-through",color:"#bbb",fontSize:11,marginRight:4},children:L(t.precio_final*t.cantidad)}),e.jsx("span",{onClick:()=>{M&&(Ie(t.cartId),we(String(t.precio_cobrado)))},title:M?"Clic para editar precio":void 0,style:{cursor:M?"text":"default"},children:L(t.subtotal)})]})})]}),e.jsxs("div",{className:"cart-item-controls",children:[t.unidad==="unidad"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"qty-btn",onClick:()=>ze(t.cartId,t.cantidad-1),children:"−"}),e.jsx("input",{className:"qty-input",type:"number",min:"1",value:t.cantidad,onChange:n=>ze(t.cartId,n.target.value)}),e.jsx("button",{className:"qty-btn",onClick:()=>ze(t.cartId,t.cantidad+1),children:"+"}),e.jsx("span",{className:"qty-unit",children:"und"})]}):e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{fontSize:14,flexShrink:0},children:"⚖️"}),e.jsx("input",{type:"number",min:"0.001",step:"0.001",className:"qty-input",style:{width:80},value:p[t.cartId]!==void 0?p[t.cartId]:t.cantidad.toFixed(3),onChange:n=>i(r=>({...r,[t.cartId]:n.target.value})),onBlur:()=>{const n=p[t.cartId];if(n===void 0)return;const r=parseFloat(n);if(i(q=>{const B={...q};return delete B[t.cartId],B}),!isNaN(r)&&r>0){ze(t.cartId,r);const q=$.find(B=>B.id===t.productoId);q&&r>q.stock?k(B=>({...B,[t.cartId]:!0})):k(B=>{const ee={...B};return delete ee[t.cartId],ee})}},onKeyDown:n=>{n.key==="Enter"&&(n.preventDefault(),n.target.blur()),n.key==="Escape"&&(i(r=>{const q={...r};return delete q[t.cartId],q}),n.target.blur())},title:"Editá el peso directamente — Enter o clic fuera para confirmar"}),e.jsx("span",{className:"qty-unit",children:"kg"}),e.jsxs("span",{style:{fontSize:11,color:"#aaa",whiteSpace:"nowrap"},children:["× ",L(t.precio_cobrado),"/kg"]})]}),e.jsx("button",{className:"btn btn-ghost btn-sm",style:{marginLeft:4,padding:"3px 7px",fontSize:10,fontWeight:700,color:t.desc_manual_pct>0?"#E65100":"var(--verde-oscuro)",border:`1px solid ${t.desc_manual_pct>0?"#FFCC80":"var(--borde)"}`,background:t.desc_manual_pct>0?"#fff3e0":"transparent"},onClick:()=>te(Z===t.cartId?null:t.cartId),title:"Aplicar descuento a este producto",children:t.desc_manual_pct>0?`−${Math.round(t.desc_manual_pct)}%`:"% Desc"}),e.jsx("button",{className:"btn btn-ghost btn-sm",style:{marginLeft:"auto",color:"var(--rojo)",padding:"3px 6px"},onClick:()=>tt(t.cartId),children:"🗑️"})]}),t.unidad==="kg"&&d[t.cartId]&&e.jsx("div",{style:{fontSize:11,color:"var(--naranja-oscuro)",marginTop:4,display:"flex",alignItems:"center",gap:4},children:"⚠️ Supera el stock registrado — verificá la medición"}),t.promocion_descripcion&&e.jsxs("div",{className:"cart-item-desc",children:["🏷️ ",t.promocion_descripcion]}),Z===t.cartId&&e.jsx(Ut,{item:t,onAplicar:n=>ot(n,()=>yt(t.cartId,n)),onQuitar:()=>kt(t.cartId),onCerrar:()=>te(null)})]},t.cartId))}),e.jsxs("div",{className:"pos-totales",children:[Te>0&&e.jsxs("div",{className:"total-row",children:[e.jsx("span",{className:"total-label",children:"Precio bruto"}),e.jsx("span",{className:"total-value",children:L(Ye)})]}),Te>0&&e.jsxs("div",{className:"total-row total-descuento",children:[e.jsx("span",{className:"total-label",children:"Descuentos"}),e.jsxs("span",{className:"total-value",children:["− ",L(Te)]})]}),R.length>0&&e.jsx("div",{style:{margin:"4px 0"},children:de?e.jsx(Jt,{totalBase:Ee,descGlobal:b,onAplicar:(t,n,r)=>ot(r,()=>wt(t,n)),onQuitar:St,onCerrar:()=>Q(!1)}):e.jsx("button",{onClick:()=>Q(!0),style:{width:"100%",padding:"5px 0",background:b.aplicado?"#fff3e0":"transparent",border:`1px dashed ${b.aplicado?"#FFCC80":"#ccc"}`,borderRadius:6,fontSize:12,fontWeight:700,color:b.aplicado?"#E65100":"#888",cursor:"pointer"},children:b.aplicado?`🏷️ Desc. total aplicado (−${L(De)})`:"🏷️ + Descuento sobre total"})}),e.jsxs("div",{className:"total-row total-final",children:[e.jsx("span",{children:"TOTAL"}),e.jsx("span",{children:L(he)})]})]}),e.jsxs("div",{className:"pos-cobrar",children:[e.jsx("button",{className:"btn btn-ghost",onClick:Ct,disabled:R.length===0,children:"🗑️ Limpiar"}),e.jsxs("button",{className:"btn btn-cobrar btn-lg",style:{flex:1},onClick:()=>Se(!0),disabled:R.length===0||!C,title:C?void 0:"Abra un turno en Caja para poder cobrar",children:["💰 F12 — Cobrar ",R.length>0?L(he):""]})]}),e.jsx("div",{style:{padding:"8px 14px 10px",borderTop:"1px solid var(--borde)",background:"var(--verde-palido)"},children:e.jsx("button",{onClick:()=>Je(!0),style:{width:"100%",padding:"8px 0",background:"transparent",border:"1.5px solid var(--borde-oscuro)",borderRadius:10,color:"var(--verde-oscuro)",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all 0.15s"},onMouseEnter:t=>{t.currentTarget.style.background="var(--verde-fondo)",t.currentTarget.style.borderColor="var(--verde)"},onMouseLeave:t=>{t.currentTarget.style.background="transparent",t.currentTarget.style.borderColor="var(--borde-oscuro)"},children:"📋 Ventas del Día"})})]}),Re&&e.jsx(Ht,{productos:$,promociones:h,onAgregar:(t,n)=>{var r;$e(t,n),ye(!1),(r=oe.current)==null||r.focus()},onSeleccionarKg:t=>{ye(!1),z({prod:t}),K("1")},onCerrar:()=>{var t;ye(!1),(t=oe.current)==null||t.focus()}}),Ae&&e.jsx(It,{total:he,sinpeNumero:S.sinpe_numero||"",onConfirmar:Nt,onCerrar:()=>{var t;Se(!1),(t=oe.current)==null||t.focus()}}),Ne&&Ke&&e.jsx(ut,{venta:Ke,config:S,onCerrar:()=>{var t;Ue(!1),(t=oe.current)==null||t.focus()}}),Ce&&e.jsx(Lt,{config:S,onCerrar:()=>{var t;Je(!1),(t=oe.current)==null||t.focus()}}),ae&&e.jsx(Kt,{onSuccess:()=>{ae.callback(),ue(null)},onCancelar:()=>ue(null)}),ft&&e.jsx(Zt,{cabysGenerico:S.cabys_generico_codigo||"",onAgregar:vt,onCerrar:()=>Pe(!1)}),g&&e.jsx("div",{onClick:qe,style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1300},children:e.jsxs("div",{onClick:t=>t.stopPropagation(),style:{background:"#fff",borderRadius:20,padding:"30px 32px 26px",width:360,maxWidth:"92vw",boxShadow:"0 28px 90px rgba(0,0,0,0.38), 0 8px 24px rgba(0,0,0,0.18)",textAlign:"center",animation:"kgModalIn 0.16s ease-out"},children:[e.jsx("style",{children:`
              @keyframes kgModalIn {
                from { opacity:0; transform: scale(0.92) translateY(8px); }
                to   { opacity:1; transform: scale(1)    translateY(0);   }
              }
            `}),e.jsx("div",{style:{fontSize:30,lineHeight:1,marginBottom:6},children:"⚖️"}),e.jsx("h2",{style:{margin:"0 0 20px",color:"#1a472a",fontSize:22,fontWeight:900,letterSpacing:"-0.3px"},children:"Ingrese la cantidad"}),e.jsxs("div",{style:{background:"#f0fdf4",border:"1.5px solid #c8e6c9",borderRadius:12,padding:"12px 16px",marginBottom:22},children:[e.jsx("div",{style:{fontSize:34,lineHeight:1,marginBottom:4},children:g.prod.emoji||Oe(g.prod.categoria_nombre)}),e.jsx("div",{style:{fontWeight:800,fontSize:16,color:"#1a1a1a",lineHeight:1.3},children:g.prod.nombre}),e.jsxs("div",{style:{fontSize:13,color:"#2e7d32",fontWeight:700,marginTop:3},children:[L(g.prod.precio)," / kg"]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16},children:[e.jsx("button",{onClick:()=>{const t=parseFloat(H)||0,n=Math.max(.001,Math.round((t-.5)*1e3)/1e3);K(String(n))},style:{width:50,height:50,borderRadius:"50%",flexShrink:0,background:"#f0f0f0",border:"2px solid #ddd",color:"#333",fontSize:26,fontWeight:300,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.12s"},onMouseEnter:t=>t.currentTarget.style.background="#e0e0e0",onMouseLeave:t=>t.currentTarget.style.background="#f0f0f0",children:"−"}),e.jsxs("div",{style:{position:"relative",flex:1},children:[e.jsx("input",{ref:Qe,type:"number",min:"0.001",step:"0.001",value:H,onChange:t=>K(t.target.value),onFocus:t=>t.target.select(),onKeyDown:t=>{t.key==="Enter"&&(t.preventDefault(),Xe()),t.key==="Escape"&&(t.preventDefault(),qe())},placeholder:"0.000",style:{width:"100%",boxSizing:"border-box",padding:"13px 40px 13px 14px",fontSize:30,fontWeight:900,textAlign:"center",borderRadius:12,border:"2.5px solid #a5d6a7",outline:"none",background:"#fff",color:"#1a472a",transition:"border-color 0.15s"},onFocusCapture:t=>{t.currentTarget.style.borderColor="#1a472a"},onBlur:t=>{t.currentTarget.style.borderColor="#a5d6a7"}}),e.jsx("span",{style:{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontWeight:700,color:"#666",fontSize:14,pointerEvents:"none"},children:"kg"})]}),e.jsx("button",{onClick:()=>{const t=parseFloat(H)||0,n=Math.round((t+.5)*1e3)/1e3;K(String(n||.5))},style:{width:50,height:50,borderRadius:"50%",flexShrink:0,background:"#1a472a",border:"none",color:"#fff",fontSize:26,fontWeight:300,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.12s",boxShadow:"0 3px 12px rgba(26,71,42,0.35)"},onMouseEnter:t=>t.currentTarget.style.background="#163d22",onMouseLeave:t=>t.currentTarget.style.background="#1a472a",children:"+"})]}),e.jsx("div",{style:{minHeight:38,marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center"},children:st>0&&e.jsxs("div",{style:{background:"#f0fdf4",border:"1px solid #c8e6c9",borderRadius:10,padding:"8px 20px",fontSize:17,fontWeight:800,color:"#1B5E20"},children:["Total: ",L(st)]})}),e.jsxs("div",{style:{display:"flex",gap:10},children:[e.jsx("button",{onClick:qe,style:{flex:1,padding:"13px 0",background:"#f5f5f5",border:"1.5px solid #ddd",borderRadius:12,fontSize:14,fontWeight:700,color:"#555",cursor:"pointer",transition:"background 0.12s"},onMouseEnter:t=>t.currentTarget.style.background="#ebebeb",onMouseLeave:t=>t.currentTarget.style.background="#f5f5f5",children:"Cancelar"}),e.jsx("button",{onClick:Xe,disabled:!H||parseFloat(H)<=0,style:{flex:2,padding:"13px 0",background:H&&parseFloat(H)>0?"#1a472a":"#ccc",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:800,letterSpacing:"0.2px",cursor:H&&parseFloat(H)>0?"pointer":"not-allowed",transition:"background 0.15s",boxShadow:H&&parseFloat(H)>0?"0 4px 16px rgba(26,71,42,0.32)":"none"},children:"✓ Agregar al carrito"})]}),e.jsx("div",{style:{fontSize:11,color:"#bbb",marginTop:10},children:"Enter para agregar · Escape para cancelar · clic fuera para cerrar"})]})})]})}export{en as default};
