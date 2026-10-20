import{r as n,j as e,f as $,u as Y}from"./index-DWj2HEej.js";function H(s){return{Frutas:"🍎",Verduras:"🥬",Hierbas:"🌿",Raíces:"🥕",Cítricos:"🍊",Lácteos:"🥛",Carnes:"🥩",Bebidas:"🥤",Granos:"🌾",Tubérculos:"🍠",Especias:"🌶️"}[s]||"🛒"}const G=[{value:0,label:"0% — Exento"},{value:1,label:"1% — Canasta básica"},{value:2,label:"2%"},{value:4,label:"4%"},{value:8,label:"8%"},{value:13,label:"13% — General"}],O=[{value:"unidad",label:"📦 Unidad"},{value:"kg",label:"⚖️ Kilogramo"},{value:"litro",label:"🧴 Litro"},{value:"gramo",label:"🔬 Gramo"}],K={codigo:"",nombre:"",descripcion:"",precio:"",costo:"",stock:"",stock_minimo:"",unidad:"unidad",tasa_impuesto:0,categoria_id:"",codigo_cabys:"",emoji:""};function U({producto:s,categorias:h,onGuardar:B,onCerrar:x}){var S;const[r,v]=n.useState(K),[y,N]=n.useState({}),[l,m]=n.useState(!1),[F,f]=n.useState(""),[E,C]=n.useState(""),[k,b]=n.useState([]),[_,M]=n.useState(!1),[i,u]=n.useState(!1),g=n.useRef(null),z=n.useRef(null);n.useEffect(()=>{if(s){v({codigo:s.codigo||"",nombre:s.nombre||"",descripcion:s.descripcion||"",precio:s.precio??"",costo:s.costo??"",stock:s.stock??"",stock_minimo:s.stock_minimo??"",unidad:s.unidad||"unidad",tasa_impuesto:s.tasa_impuesto??0,categoria_id:s.categoria_id||"",codigo_cabys:s.codigo_cabys||"",emoji:s.emoji||""}),C(s.codigo_cabys||"");const t=parseFloat(s.precio??""),c=parseFloat(s.tasa_impuesto??0)||0;f(isNaN(t)?"":String(Math.round(t/(1+c/100))))}else v(K),C(""),f("");N({}),b([])},[s]);function w(t,c){v(A=>({...A,[t]:c})),y[t]&&N(A=>({...A,[t]:""}))}function I(t){f(t);const c=parseFloat(t),A=parseFloat(r.tasa_impuesto)||0;w("precio",!isNaN(c)&&c>=0?String(Math.round(c*(1+A/100))):"")}function L(t){w("precio",t);const c=parseFloat(t),A=parseFloat(r.tasa_impuesto)||0;f(!isNaN(c)&&c>=0?String(Math.round(c/(1+A/100))):"")}function d(t){w("tasa_impuesto",t);const c=parseFloat(r.precio),A=parseFloat(t)||0;!isNaN(c)&&c>0&&f(String(Math.round(c/(1+A/100))))}const j=(()=>{const t=parseFloat(r.precio),c=parseFloat(r.costo);return!t||!c||c<=0?null:((t-c)/c*100).toFixed(1)})();function P(t){if(C(t),clearTimeout(g.current),t.trim().length<2){b([]),u(!1);return}g.current=setTimeout(async()=>{M(!0);try{const c=await window.db.cabys.buscar(t.trim());b(c||[]),u((c||[]).length>0)}catch{b([]),u(!1)}M(!1)},600)}function R(t){return t.impuesto??0}function T(t){const c=R(t);v(A=>{const q=parseFloat(A.precio),V=parseFloat(c)||0;return!isNaN(q)&&q>0&&f(String(Math.round(q/(1+V/100)))),{...A,codigo_cabys:t.codigo,tasa_impuesto:c}}),C(`${t.codigo} — ${t.descripcion}`),b([]),u(!1)}function D(){v(t=>({...t,codigo_cabys:""})),C(""),b([]),u(!1)}function o(){const t={};return r.nombre.trim()||(t.nombre="El nombre es requerido"),(r.precio===""||isNaN(parseFloat(r.precio))||parseFloat(r.precio)<0)&&(t.precio="Ingrese un precio válido"),t}async function p(){const t=o();if(Object.keys(t).length){N(t);return}m(!0);const c={...r,precio:parseFloat(r.precio)||0,costo:parseFloat(r.costo)||0,stock:parseFloat(r.stock)||0,stock_minimo:parseFloat(r.stock_minimo)||0,tasa_impuesto:parseFloat(r.tasa_impuesto)||0,categoria_id:r.categoria_id?parseInt(r.categoria_id):null};await B(c),m(!1)}const a=r.unidad==="kg"||r.unidad==="gramo";return e.jsx("div",{className:"modal-overlay",onClick:x,children:e.jsxs("div",{className:"modal modal-lg",onClick:t=>t.stopPropagation(),style:{maxWidth:720},children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("span",{className:"modal-title",children:s?"✏️ Editar Producto":"➕ Nuevo Producto"}),e.jsx("button",{className:"btn-close",onClick:x,children:"✕"})]}),e.jsxs("div",{className:"modal-body",style:{overflowY:"auto",maxHeight:"75vh"},children:[e.jsxs("div",{style:{display:"flex",gap:14,alignItems:"flex-start",marginBottom:14},children:[e.jsxs("div",{className:"form-group",style:{marginBottom:0,flexShrink:0},children:[e.jsx("label",{className:"form-label",children:"Ícono"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:[e.jsx("div",{style:{width:64,height:64,display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,lineHeight:1,borderRadius:12,border:"2px solid var(--borde)",background:"var(--verde-fondo)",userSelect:"none"},children:r.emoji||H((S=h.find(t=>t.id===parseInt(r.categoria_id)))==null?void 0:S.nombre)}),e.jsx("input",{className:"form-input",value:r.emoji,onChange:t=>w("emoji",t.target.value),placeholder:"🍅",maxLength:8,style:{width:64,textAlign:"center",fontSize:22,padding:"4px 0"},title:"Escribí o pegá un emoji. Dejalo vacío para usar el de la categoría."})]}),e.jsx("div",{className:"form-hint",style:{textAlign:"center",fontSize:10.5,marginTop:2},children:"Vacío = auto"})]}),e.jsxs("div",{className:"form-group",style:{flex:1,marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Nombre del producto *"}),e.jsx("input",{className:`form-input${y.nombre?" error":""}`,value:r.nombre,onChange:t=>w("nombre",t.target.value),placeholder:"Ej: Manzana Roja",autoFocus:!0}),y.nombre&&e.jsx("div",{className:"form-error",children:y.nombre})]})]}),e.jsxs("div",{className:"form-row form-row-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{className:"form-label",children:"Código de barras"}),e.jsxs("div",{style:{display:"flex",gap:6},children:[e.jsx("input",{ref:z,className:"form-input",value:r.codigo,onChange:t=>w("codigo",t.target.value),placeholder:"Escanear o escribir",style:{flex:1}}),e.jsx("button",{type:"button",className:"btn btn-outline btn-sm",title:"Haga clic aquí y luego escanee el código",onClick:()=>{var t;return(t=z.current)==null?void 0:t.focus()},children:"📷"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{className:"form-label",children:"Categoría"}),e.jsxs("select",{className:"form-select",value:r.categoria_id,onChange:t=>w("categoria_id",t.target.value),children:[e.jsx("option",{value:"",children:"Sin categoría"}),h.map(t=>e.jsx("option",{value:t.id,children:t.nombre},t.id))]})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{className:"form-label",children:"Unidad de medida"}),e.jsx("div",{style:{display:"flex",gap:8},children:O.map(t=>e.jsxs("label",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"9px 6px",border:"1.5px solid",borderColor:r.unidad===t.value?"var(--verde)":"var(--borde)",borderRadius:8,cursor:"pointer",fontSize:12.5,background:r.unidad===t.value?"var(--verde-fondo)":"#fff",fontWeight:r.unidad===t.value?700:400,color:r.unidad===t.value?"var(--verde)":"var(--texto)",transition:"all .15s"},children:[e.jsx("input",{type:"radio",name:"unidad",value:t.value,checked:r.unidad===t.value,onChange:()=>w("unidad",t.value),style:{display:"none"}}),t.label]},t.value))})]}),e.jsxs("div",{style:{background:"var(--verde-fondo)",border:"1px solid var(--borde-oscuro)",borderRadius:10,padding:"14px 16px",marginBottom:14},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,color:"var(--verde-oscuro)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12},children:"Precios"}),e.jsxs("div",{className:"form-row form-row-2",style:{marginBottom:10},children:[e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Precio de costo (₡)"}),e.jsx("input",{className:"form-input",type:"number",min:"0",step:"1",value:r.costo,onChange:t=>w("costo",t.target.value),placeholder:"0"})]}),e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Precio sin impuesto (₡)"}),e.jsx("input",{className:"form-input",type:"number",min:"0",step:"1",value:F,onChange:t=>I(t.target.value),placeholder:"0"})]})]}),e.jsxs("div",{className:"form-row form-row-2",children:[e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Tasa de impuesto (IVA)"}),e.jsx("select",{className:"form-select",value:r.tasa_impuesto,onChange:t=>d(t.target.value),children:G.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))})]}),e.jsxs("div",{className:"form-group",style:{marginBottom:0},children:[e.jsx("label",{className:"form-label",children:"Precio con impuesto (₡) *"}),e.jsx("input",{className:`form-input${y.precio?" error":""}`,type:"number",min:"0",step:"1",value:r.precio,onChange:t=>L(t.target.value),placeholder:"0",style:{fontWeight:700,color:"var(--verde-oscuro)"}}),y.precio&&e.jsx("div",{className:"form-error",children:y.precio})]})]})]}),j!==null&&e.jsx("div",{style:{background:parseFloat(j)>=0?"var(--verde-fondo)":"#FFEBEE",borderRadius:8,padding:"8px 14px",marginBottom:14,fontSize:13},children:e.jsxs("span",{style:{color:parseFloat(j)>=0?"var(--verde)":"var(--rojo)"},children:["💡 Margen: ",e.jsxs("strong",{children:[j,"%"]})," — Ganancia por ",r.unidad," (precio final − costo):"," ",e.jsxs("strong",{children:["₡",Math.round(parseFloat(r.precio)-parseFloat(r.costo)).toLocaleString("es-CR")]})]})}),e.jsxs("div",{className:"form-row form-row-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{className:"form-label",children:"Stock actual"}),e.jsx("input",{className:"form-input",type:"number",min:"0",step:a?"0.001":"1",value:r.stock,onChange:t=>w("stock",t.target.value),placeholder:"0"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{className:"form-label",children:"Stock mínimo"}),e.jsx("input",{className:"form-input",type:"number",min:"0",step:a?"0.001":"1",value:r.stock_minimo,onChange:t=>w("stock_minimo",t.target.value),placeholder:"0"}),e.jsx("div",{className:"form-hint",children:"Alerta cuando baje de este nivel"})]})]}),e.jsxs("div",{className:"form-group",style:{position:"relative"},children:[e.jsxs("label",{className:"form-label",children:["Código CABYS"," ",e.jsx("span",{style:{fontSize:11,color:"var(--texto-muted)",fontWeight:400},children:"— busque por nombre o código, ajusta el IVA automáticamente"})]}),e.jsxs("div",{style:{position:"relative"},children:[e.jsx("input",{className:"form-input",value:E,onChange:t=>P(t.target.value),onFocus:()=>k.length>0&&u(!0),onBlur:()=>setTimeout(()=>u(!1),180),placeholder:"Escriba nombre o código CABYS para buscar en Hacienda CR..."}),_&&e.jsx("span",{style:{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--verde-medio)"},children:"Buscando..."})]}),r.codigo_cabys&&e.jsxs("div",{style:{marginTop:6,fontSize:12,color:"var(--verde)",display:"flex",alignItems:"center",gap:8},children:[e.jsxs("span",{children:["✓ CABYS: ",e.jsx("strong",{style:{fontFamily:"monospace"},children:r.codigo_cabys})]}),e.jsx("button",{type:"button",className:"btn btn-ghost btn-sm",style:{fontSize:11,padding:"1px 7px",color:"var(--rojo)"},onClick:D,children:"✕ Quitar"})]}),i&&k.length>0&&e.jsx("div",{style:{position:"absolute",zIndex:200,top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid var(--borde-oscuro)",borderRadius:8,boxShadow:"var(--sombra-lg)",maxHeight:230,overflowY:"auto",marginTop:4},children:k.map((t,c)=>e.jsxs("div",{onMouseDown:()=>T(t),style:{padding:"8px 14px",cursor:"pointer",borderBottom:"1px solid var(--borde)",fontSize:12.5},onMouseEnter:A=>A.currentTarget.style.background="var(--verde-fondo)",onMouseLeave:A=>A.currentTarget.style.background="",children:[e.jsx("span",{style:{fontFamily:"monospace",fontWeight:700,color:"var(--verde)",marginRight:10},children:t.codigo}),e.jsx("span",{style:{color:"var(--texto)"},children:t.descripcion}),e.jsxs("span",{style:{float:"right",color:"var(--texto-muted)",fontSize:11},children:["IVA ",R(t),"%"]})]},c))})]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn btn-ghost",onClick:x,disabled:l,children:"Cancelar"}),e.jsx("button",{className:"btn btn-primary",onClick:p,disabled:l,children:l?"Guardando...":s?"💾 Actualizar":"✓ Crear Producto"})]})]})})}const Q=`
  .adj-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.58);
    display: flex; align-items: center; justify-content: center;
    z-index: 1400; backdrop-filter: blur(4px);
    animation: adj-fadein 0.15s ease;
  }
  @keyframes adj-fadein { from { opacity: 0; } to { opacity: 1; } }
  .adj-modal {
    background: #fff; border-radius: 20px;
    width: 420px; max-width: calc(100vw - 32px);
    box-shadow: 0 28px 90px rgba(0,0,0,0.38);
    animation: adj-in 0.18s ease; overflow: hidden;
  }
  @keyframes adj-in {
    from { transform: scale(0.92) translateY(8px); opacity: 0; }
    to   { transform: scale(1)    translateY(0);   opacity: 1; }
  }
  .adj-header {
    background: #E65100; padding: 18px 22px 16px; color: #fff;
  }
  .adj-header h2 {
    margin: 0; font-size: 15px; font-weight: 900;
    letter-spacing: 1.5px; text-transform: uppercase;
  }
  .adj-header p { margin: 5px 0 0; font-size: 13px; opacity: 0.85; }
  .adj-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
  .adj-field { display: flex; flex-direction: column; gap: 5px; }
  .adj-label {
    font-size: 11px; font-weight: 800; color: #555;
    text-transform: uppercase; letter-spacing: .6px;
  }
  .adj-input {
    padding: 10px 13px; border: 1.5px solid #e0e0e0; border-radius: 10px;
    font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.15s;
    width: 100%; box-sizing: border-box;
  }
  .adj-input:focus { border-color: #E65100; }
  .adj-input:read-only { background: #f8f8f8; color: #666; }
  .adj-diff {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; border-radius: 10px;
    font-weight: 800; font-size: 14px;
  }
  .adj-diff.pos  { background: #e8f5e9; color: #2E7D32; }
  .adj-diff.neg  { background: #ffebee; color: #c62828; }
  .adj-diff.zero { background: #f5f5f5; color: #999; }
  .adj-error {
    background: #fff3e0; border: 1px solid #FFB300;
    color: #E65100; border-radius: 10px;
    padding: 10px 13px; font-size: 13px; font-weight: 600;
  }
  .adj-footer {
    padding: 0 22px 20px;
    display: flex; gap: 10px; justify-content: flex-end;
  }
  .adj-btn-cancel {
    padding: 10px 18px; border-radius: 10px;
    background: transparent; color: #888;
    border: 1.5px solid #e0e0e0; font-size: 13px;
    font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.12s;
  }
  .adj-btn-cancel:hover { background: #f5f5f5; }
  .adj-btn-ok {
    padding: 10px 22px; border-radius: 10px;
    background: #E65100; color: #fff; border: none;
    font-size: 13px; font-weight: 800; cursor: pointer;
    font-family: inherit; transition: background 0.15s;
  }
  .adj-btn-ok:hover:not(:disabled) { background: #BF360C; }
  .adj-btn-ok:disabled { background: #ccc; cursor: not-allowed; }
  .adj-pin-hint {
    text-align: center; color: #555; font-size: 14px;
  }
  .adj-pin-summary {
    text-align: center; font-size: 13px; color: #888;
    line-height: 1.5;
  }
  .adj-pin-row { display: flex; gap: 10px; justify-content: center; }
  .adj-pin-box {
    width: 52px; height: 60px; border-radius: 12px;
    border: 2px solid #e0e0e0; font-size: 24px; font-weight: 900;
    text-align: center; font-family: monospace; outline: none;
    transition: border-color 0.15s; -webkit-text-security: disc;
    box-sizing: border-box;
  }
  .adj-pin-box:focus { border-color: #E65100; }
`;function J({producto:s,onConfirmar:h,onCerrar:B}){const[x,r]=n.useState("form"),[v,y]=n.useState(String(+s.stock)),[N,l]=n.useState(""),[m,F]=n.useState(["","","",""]),[f,E]=n.useState(""),[C,k]=n.useState(!1),b=n.useRef(),_=[n.useRef(),n.useRef(),n.useRef(),n.useRef()];n.useEffect(()=>{x==="form"&&setTimeout(()=>{var d;return(d=b.current)==null?void 0:d.focus()},80),x==="pin"&&setTimeout(()=>{var d;return(d=_[0].current)==null?void 0:d.focus()},80)},[x]);const M=s.unidad==="kg"||s.unidad==="gramo",i=d=>M?(+d).toFixed(3):(+d).toFixed(0),u=+s.stock,g=parseFloat(v),z=isNaN(g)?0:g-u;function w(){if(!N.trim()){E("El motivo es obligatorio.");return}if(isNaN(g)||g<0){E("Ingresá un stock válido (≥ 0).");return}E(""),r("pin")}function I(d,j){var R,T;if(d.key==="Backspace"){const D=[...m];D[j]="",F(D),j>0&&((R=_[j-1].current)==null||R.focus());return}if(!/^\d$/.test(d.key))return;const P=[...m];P[j]=d.key,F(P),j<3?(T=_[j+1].current)==null||T.focus():L([...P])}async function L(d){const j=(d||m).join("");if(j.length<4)return;k(!0),E("");const P=await window.db.inventario.ajustar({producto_id:s.id,stock_nuevo:g,motivo:N,pin:j});k(!1),P.ok?h(P):(E(P.error||"Error desconocido."),F(["","","",""]),setTimeout(()=>{var R;return(R=_[0].current)==null?void 0:R.focus()},50))}return e.jsxs("div",{className:"adj-overlay",onClick:B,children:[e.jsx("style",{children:Q}),e.jsxs("div",{className:"adj-modal",onClick:d=>d.stopPropagation(),children:[e.jsxs("div",{className:"adj-header",children:[e.jsx("h2",{children:"⚙️ Ajustar Stock"}),e.jsxs("p",{children:[s.emoji||""," ",s.nombre]})]}),e.jsxs("div",{className:"adj-body",children:[x==="form"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"adj-field",children:[e.jsx("label",{className:"adj-label",children:"Stock Actual"}),e.jsx("input",{className:"adj-input",readOnly:!0,value:`${i(u)} ${s.unidad}`})]}),e.jsxs("div",{className:"adj-field",children:[e.jsx("label",{className:"adj-label",children:"Nuevo Stock"}),e.jsx("input",{ref:b,className:"adj-input",type:"number",step:M?"0.001":"1",min:"0",value:v,onChange:d=>y(d.target.value),onKeyDown:d=>d.key==="Enter"&&w()})]}),e.jsxs("div",{className:`adj-diff${z>0?" pos":z<0?" neg":" zero"}`,children:[e.jsx("span",{children:z>0?"▲":z<0?"▼":"="}),e.jsxs("span",{children:["Diferencia: ",z>0?"+":"",i(z)," ",s.unidad]})]}),e.jsxs("div",{className:"adj-field",children:[e.jsxs("label",{className:"adj-label",children:["Motivo ",e.jsx("span",{style:{color:"#e53935"},children:"*"})]}),e.jsx("input",{className:"adj-input",placeholder:"Ej: Conteo físico, Producto dañado, Merma...",value:N,onChange:d=>l(d.target.value),onKeyDown:d=>d.key==="Enter"&&w(),maxLength:200})]})]}),x==="pin"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"adj-pin-hint",children:"Ingresá el PIN de administrador para confirmar"}),e.jsxs("div",{className:"adj-pin-summary",children:[i(u)," → ",e.jsx("strong",{children:i(g)})," ",s.unidad," ·  Motivo: ",e.jsx("strong",{children:N})]}),e.jsx("div",{className:"adj-pin-row",children:m.map((d,j)=>e.jsx("input",{ref:_[j],className:"adj-pin-box",type:"password",inputMode:"numeric",maxLength:1,value:d,onChange:()=>{},onKeyDown:P=>I(P,j),readOnly:C},j))})]}),f&&e.jsxs("div",{className:"adj-error",children:["⚠️ ",f]})]}),e.jsxs("div",{className:"adj-footer",children:[e.jsx("button",{className:"adj-btn-cancel",onClick:x==="pin"?()=>{r("form"),F(["","","",""]),E("")}:B,children:x==="pin"?"← Volver":"Cancelar"}),x==="form"&&e.jsx("button",{className:"adj-btn-ok",onClick:w,disabled:!N.trim()||v==="",children:"Continuar →"}),x==="pin"&&e.jsx("button",{className:"adj-btn-ok",onClick:()=>L(),disabled:m.join("").length<4||C,children:C?"Confirmando...":"✓ Confirmar"})]})]})]})}const X=`
  .ent-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.58);
    display: flex; align-items: center; justify-content: center;
    z-index: 1400; backdrop-filter: blur(4px);
  }
  .ent-modal {
    background: #fff; border-radius: 20px;
    width: 700px; max-width: calc(100vw - 32px);
    max-height: 92vh; display: flex; flex-direction: column;
    box-shadow: 0 28px 90px rgba(0,0,0,0.38);
    animation: ent-in 0.18s ease;
  }
  @keyframes ent-in {
    from { transform: scale(0.93) translateY(8px); opacity: 0; }
    to   { transform: scale(1)    translateY(0);   opacity: 1; }
  }
  .ent-header {
    background: #1a472a; padding: 18px 22px 16px;
    border-radius: 20px 20px 0 0; color: #fff; flex-shrink: 0;
  }
  .ent-header h2 {
    margin: 0; font-size: 15px; font-weight: 900;
    letter-spacing: 1.5px; text-transform: uppercase;
  }
  .ent-header p { margin: 5px 0 0; font-size: 12px; opacity: 0.8; }
  .ent-body {
    padding: 20px; display: flex; flex-direction: column;
    gap: 16px; overflow-y: auto; flex: 1; min-height: 0;
  }
  .ent-label {
    font-size: 11px; font-weight: 800; color: #666;
    text-transform: uppercase; letter-spacing: .6px; margin-bottom: 5px;
    display: block;
  }
  .ent-input {
    padding: 9px 12px; border: 1.5px solid #e0e0e0; border-radius: 10px;
    font-size: 14px; font-family: inherit; outline: none;
    width: 100%; box-sizing: border-box; transition: border-color 0.15s;
  }
  .ent-input:focus { border-color: #1a472a; }
  .ent-grid3 { display: grid; grid-template-columns: 1fr 130px 150px; gap: 10px; align-items: end; }
  .ent-search-wrap { position: relative; }
  .ent-dropdown {
    position: absolute; top: calc(100% + 2px); left: 0; right: 0;
    background: #fff; border: 1.5px solid #e0e0e0;
    border-radius: 10px; max-height: 220px; overflow-y: auto;
    z-index: 10; box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  }
  .ent-drop-item {
    padding: 9px 13px; cursor: pointer; font-size: 13px;
    display: flex; align-items: center; justify-content: space-between;
    transition: background 0.08s; gap: 8px;
  }
  .ent-drop-item:hover, .ent-drop-item.sel { background: #e8f5e9; }
  .ent-drop-name  { font-weight: 700; color: #111; }
  .ent-drop-stock { font-size: 12px; color: #888; white-space: nowrap; }
  .ent-add-btn {
    padding: 9px 18px; border-radius: 10px;
    background: #1a472a; color: #fff; border: none;
    font-size: 13px; font-weight: 800; cursor: pointer;
    font-family: inherit; white-space: nowrap;
    transition: background 0.15s; display: flex; align-items: center; gap: 6px;
  }
  .ent-add-btn:hover:not(:disabled) { background: #155722; }
  .ent-add-btn:disabled { background: #ccc; cursor: not-allowed; }

  .ent-section-title {
    font-size: 12px; font-weight: 800; color: #555;
    text-transform: uppercase; letter-spacing: .7px;
    padding-bottom: 10px; border-bottom: 1px solid #f0f0f0;
  }

  /* Lista de productos agregados */
  .ent-list { border: 1.5px solid #e8e8e8; border-radius: 12px; overflow: hidden; }
  .ent-list-head {
    background: #f5f5f5; padding: 8px 14px;
    display: grid; grid-template-columns: 1fr 110px 120px 34px;
    gap: 8px; font-size: 11px; font-weight: 800; color: #777;
    text-transform: uppercase; letter-spacing: .6px;
  }
  .ent-list-row {
    padding: 10px 14px;
    display: grid; grid-template-columns: 1fr 110px 120px 34px;
    gap: 8px; align-items: center; border-top: 1px solid #f0f0f0;
    font-size: 13px;
  }
  .ent-list-row:nth-child(even) { background: #fafafa; }
  .ent-row-name  { font-weight: 700; }
  .ent-row-qty   { text-align: right; color: #1a472a; font-weight: 800; }
  .ent-row-costo { text-align: right; color: #555; font-size: 12px; }
  .ent-del-btn {
    width: 28px; height: 28px; border-radius: 8px; border: none;
    background: #ffebee; color: #e53935; font-size: 14px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.12s;
  }
  .ent-del-btn:hover { background: #ef9a9a; }
  .ent-list-empty {
    padding: 24px; text-align: center; color: #bbb; font-size: 13px;
  }

  .ent-error {
    background: #fff3e0; border: 1px solid #FFB300;
    color: #E65100; border-radius: 10px;
    padding: 10px 13px; font-size: 13px; font-weight: 600;
  }
  .ent-footer {
    padding: 14px 20px; border-top: 1px solid #f0f0f0;
    display: flex; justify-content: space-between; align-items: center;
    background: #fafafa; border-radius: 0 0 20px 20px; flex-shrink: 0;
    gap: 12px;
  }
  .ent-footer-info { font-size: 13px; color: #666; }
  .ent-footer-btns { display: flex; gap: 10px; flex-shrink: 0; }
  .ent-btn-cancel {
    padding: 10px 18px; border-radius: 10px;
    background: transparent; color: #888;
    border: 1.5px solid #e0e0e0; font-size: 13px;
    font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.12s;
  }
  .ent-btn-cancel:hover { background: #f5f5f5; }
  .ent-btn-confirm {
    padding: 10px 22px; border-radius: 10px;
    background: #1a472a; color: #fff; border: none;
    font-size: 13px; font-weight: 800; cursor: pointer;
    font-family: inherit; transition: background 0.15s;
  }
  .ent-btn-confirm:hover:not(:disabled) { background: #155722; }
  .ent-btn-confirm:disabled { background: #ccc; cursor: not-allowed; }
`,W=s=>s==="kg"||s==="gramo";function Z({productos:s,onConfirmar:h,onCerrar:B}){const[x,r]=n.useState(""),[v,y]=n.useState(""),[N,l]=n.useState(0),[m,F]=n.useState(null),[f,E]=n.useState(""),[C,k]=n.useState(""),[b,_]=n.useState([]),[M,i]=n.useState(!1),[u,g]=n.useState(""),z=n.useRef(),w=n.useRef();n.useEffect(()=>{setTimeout(()=>{var o;return(o=z.current)==null?void 0:o.focus()},80)},[]);const I=v.trim().length>=1?s.filter(o=>o.nombre.toLowerCase().includes(v.toLowerCase())||(o.codigo||"").includes(v)).slice(0,8):[],L=I.length>0&&!m;function d(o){F(o),y(o.nombre),k(o.costo>0?String(o.costo):""),l(0),setTimeout(()=>{var p;return(p=w.current)==null?void 0:p.focus()},50)}function j(){F(null),y(""),E(""),k(""),setTimeout(()=>{var o;return(o=z.current)==null?void 0:o.focus()},50)}function P(o){if(o.key==="ArrowDown"){o.preventDefault(),l(p=>Math.min(p+1,I.length-1));return}if(o.key==="ArrowUp"){o.preventDefault(),l(p=>Math.max(p-1,0));return}if(o.key==="Enter"&&I[N]){o.preventDefault(),d(I[N]);return}o.key==="Escape"&&j(),l(0)}function R(){if(!m){g("Seleccioná un producto de la lista.");return}if(!f||+f<=0){g("Ingresá una cantidad válida mayor a 0.");return}g(""),_(o=>{const p=o.findIndex(a=>a.producto_id===m.id);if(p>=0){const a=[...o];return a[p]={...a[p],cantidad:+(a[p].cantidad+ +f).toFixed(3),costo_unitario:+C>0?+C:a[p].costo_unitario},a}return[...o,{producto_id:m.id,nombre:m.nombre,unidad:m.unidad,stock_actual:m.stock,cantidad:+f,costo_unitario:+C||0}]}),j()}function T(o){_(p=>p.filter((a,S)=>S!==o))}async function D(){if(b.length===0){g("Agregá al menos un producto a la entrada.");return}i(!0),g("");try{const o=await window.db.caja.actual(),p=await window.db.inventario.entrada({proveedor:x.trim(),usuario:(o==null?void 0:o.usuario)||"",items:b});p!=null&&p.ok?h(p):g("Error al registrar la entrada.")}catch(o){g(o.message)}i(!1)}return e.jsxs("div",{className:"ent-overlay",onClick:B,children:[e.jsx("style",{children:X}),e.jsxs("div",{className:"ent-modal",onClick:o=>o.stopPropagation(),children:[e.jsxs("div",{className:"ent-header",children:[e.jsx("h2",{children:"📥 Nueva Entrada de Mercadería"}),e.jsx("p",{children:"Registrá el ingreso de stock al inventario"})]}),e.jsxs("div",{className:"ent-body",children:[e.jsxs("div",{children:[e.jsx("label",{className:"ent-label",children:"Proveedor (opcional)"}),e.jsx("input",{className:"ent-input",placeholder:"Nombre del proveedor...",value:x,onChange:o=>r(o.target.value)})]}),e.jsxs("div",{children:[e.jsx("div",{className:"ent-section-title",children:"Agregar Producto"}),e.jsxs("div",{className:"ent-grid3",style:{marginTop:10},children:[e.jsxs("div",{className:"ent-search-wrap",children:[e.jsx("input",{ref:z,className:"ent-input",placeholder:"Buscar producto...",value:v,onChange:o=>{y(o.target.value),F(null),l(0)},onKeyDown:P,autoComplete:"off"}),L&&e.jsx("div",{className:"ent-dropdown",children:I.map((o,p)=>e.jsxs("div",{className:`ent-drop-item${p===N?" sel":""}`,onMouseDown:()=>d(o),onMouseEnter:()=>l(p),children:[e.jsxs("span",{className:"ent-drop-name",children:[o.emoji||""," ",o.nombre]}),e.jsxs("span",{className:"ent-drop-stock",children:[W(o)?(+o.stock).toFixed(3):(+o.stock).toFixed(0)," ",o.unidad]})]},o.id))})]}),e.jsx("input",{ref:w,className:"ent-input",type:"number",min:"0.001",step:m&&W(m)?"0.001":"1",placeholder:"Cantidad",value:f,onChange:o=>E(o.target.value),onKeyDown:o=>o.key==="Enter"&&R()}),e.jsx("input",{className:"ent-input",type:"number",min:"0",placeholder:"Costo unit. (opc.)",value:C,onChange:o=>k(o.target.value),onKeyDown:o=>o.key==="Enter"&&R()})]}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:10},children:e.jsx("button",{className:"ent-add-btn",onClick:R,disabled:!m||!f||+f<=0,children:"➕ Agregar a la entrada"})})]}),e.jsxs("div",{className:"ent-list",children:[e.jsxs("div",{className:"ent-list-head",children:[e.jsx("span",{children:"Producto"}),e.jsx("span",{style:{textAlign:"right"},children:"Cantidad"}),e.jsx("span",{style:{textAlign:"right"},children:"Costo unit."}),e.jsx("span",{})]}),b.length===0?e.jsx("div",{className:"ent-list-empty",children:"Sin productos agregados todavía"}):b.map((o,p)=>e.jsxs("div",{className:"ent-list-row",children:[e.jsx("span",{className:"ent-row-name",children:o.nombre}),e.jsxs("span",{className:"ent-row-qty",children:["+",W(o)?o.cantidad.toFixed(3):o.cantidad.toFixed(0)," ",o.unidad]}),e.jsx("span",{className:"ent-row-costo",children:o.costo_unitario>0?$(o.costo_unitario):"—"}),e.jsx("button",{className:"ent-del-btn",onClick:()=>T(p),children:"✕"})]},p))]}),u&&e.jsxs("div",{className:"ent-error",children:["⚠️ ",u]})]}),e.jsxs("div",{className:"ent-footer",children:[e.jsx("div",{className:"ent-footer-info",children:b.length===0?"Sin productos en esta entrada":`${b.length} producto${b.length!==1?"s":""}${x?` · Proveedor: ${x}`:""}`}),e.jsxs("div",{className:"ent-footer-btns",children:[e.jsx("button",{className:"ent-btn-cancel",onClick:B,children:"Cancelar"}),e.jsx("button",{className:"ent-btn-confirm",onClick:D,disabled:b.length===0||M,children:M?"Registrando...":`✓ Confirmar Entrada (${b.length})`})]})]})]})]})}function ee(s){switch(s){case"venta":return{label:"Venta",color:"#c62828",bg:"#ffebee",icon:"🛒"};case"entrada":return{label:"Entrada",color:"#2e7d32",bg:"#e8f5e9",icon:"📥"};case"ajuste":return{label:"Ajuste",color:"#e65100",bg:"#fff3e0",icon:"⚙️"};case"anulacion":return{label:"Anulación",color:"#1565c0",bg:"#e3f2fd",icon:"↩️"};default:return{label:s,color:"#666",bg:"#f5f5f5",icon:"•"}}}function te(s){const h=new Date(s.replace(" ","T"));return isNaN(h)?s:h.toLocaleString("es-CR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}const ae=`
  .kx-bar {
    display: flex; gap: 10px; flex-wrap: wrap;
    margin-bottom: 16px; align-items: center;
  }
  .kx-input {
    padding: 9px 12px; border: 1.5px solid #e0e0e0; border-radius: 10px;
    font-size: 13px; font-family: inherit; outline: none;
    transition: border-color 0.15s; background: #fff;
  }
  .kx-input:focus { border-color: #1a472a; }
  .kx-sel {
    padding: 9px 12px; border: 1.5px solid #e0e0e0; border-radius: 10px;
    font-size: 13px; font-family: inherit; outline: none; background: #fff;
    transition: border-color 0.15s;
  }
  .kx-sel:focus { border-color: #1a472a; }
  .kx-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 6px;
    font-size: 11px; font-weight: 800;
  }
  .kx-qty-pos { color: #2e7d32; font-weight: 800; }
  .kx-qty-neg { color: #c62828; font-weight: 800; }
  .kx-empty { padding: 52px; text-align: center; color: #bbb; font-size: 14px; }
  .kx-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .kx-table thead tr {
    background: #f5f5f5; position: sticky; top: 0; z-index: 1;
  }
  .kx-table th {
    padding: 9px 12px; text-align: left;
    font-size: 11px; font-weight: 800; color: #777;
    text-transform: uppercase; letter-spacing: .7px;
    border-bottom: 2px solid #e8e8e8;
  }
  .kx-table th.r { text-align: right; }
  .kx-table td {
    padding: 9px 12px; border-bottom: 1px solid #f4f4f4;
    vertical-align: middle;
  }
  .kx-table tr:last-child td { border-bottom: none; }
  .kx-table tr:hover td { background: #fafafa; }
  .kx-count { margin-top: 8px; font-size: 12px; color: #999; }
`;function oe(){const[s,h]=n.useState([]),[B,x]=n.useState(!0),[r,v]=n.useState(""),[y,N]=n.useState(""),[l,m]=n.useState(""),[F,f]=n.useState("");n.useEffect(()=>{E()},[y,l,F]);async function E(){x(!0);const i=await window.db.inventario.movimientos({tipo:y||void 0,desde:l||void 0,hasta:F||void 0});h(i||[]),x(!1)}function C(){v(""),N(""),m(""),f("")}const k=s.filter(i=>{const u=r.toLowerCase();return!u||(i.producto_nombre||"").toLowerCase().includes(u)||(i.motivo||"").toLowerCase().includes(u)||(i.usuario||"").toLowerCase().includes(u)});function b(i){const u=+i.cantidad;return M(i.producto_unidad)?u.toFixed(3):u.toFixed(0)}function _(i,u){return M(i.producto_unidad)?(+i[u]).toFixed(3):(+i[u]).toFixed(0)}const M=i=>i==="kg"||i==="gramo";return e.jsxs("div",{children:[e.jsx("style",{children:ae}),e.jsxs("div",{className:"kx-bar",children:[e.jsx("input",{className:"kx-input",style:{flex:"1 1 180px",minWidth:160},placeholder:"🔍 Buscar producto, motivo o usuario...",value:r,onChange:i=>v(i.target.value)}),e.jsxs("select",{className:"kx-sel",value:y,onChange:i=>N(i.target.value),children:[e.jsx("option",{value:"",children:"Todos los tipos"}),e.jsx("option",{value:"venta",children:"🛒 Venta"}),e.jsx("option",{value:"entrada",children:"📥 Entrada"}),e.jsx("option",{value:"ajuste",children:"⚙️ Ajuste"}),e.jsx("option",{value:"anulacion",children:"↩️ Anulación"})]}),e.jsx("input",{className:"kx-input",type:"date",value:l,onChange:i=>m(i.target.value),title:"Desde"}),e.jsx("input",{className:"kx-input",type:"date",value:F,onChange:i=>f(i.target.value),title:"Hasta"}),e.jsx("button",{className:"btn btn-outline",style:{fontSize:12,padding:"8px 14px"},onClick:C,children:"Limpiar"}),e.jsx("button",{className:"btn btn-outline",style:{fontSize:12,padding:"8px 14px"},onClick:E,children:"↺ Actualizar"})]}),e.jsx("div",{className:"card",style:{overflow:"hidden",padding:0},children:e.jsx("div",{style:{maxHeight:"55vh",overflowY:"auto"},children:B?e.jsx("div",{className:"kx-empty",children:"Cargando..."}):k.length===0?e.jsx("div",{className:"kx-empty",children:s.length===0?"Aún no hay movimientos de inventario registrados.":"Sin resultados para los filtros aplicados."}):e.jsxs("table",{className:"kx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Fecha"}),e.jsx("th",{children:"Producto"}),e.jsx("th",{children:"Tipo"}),e.jsx("th",{className:"r",children:"Cantidad"}),e.jsx("th",{className:"r",children:"Stock Ant."}),e.jsx("th",{className:"r",children:"Stock Nuevo"}),e.jsx("th",{children:"Motivo"}),e.jsx("th",{children:"Usuario"})]})}),e.jsx("tbody",{children:k.map(i=>{const u=ee(i.tipo),g=+i.cantidad;return e.jsxs("tr",{children:[e.jsx("td",{style:{whiteSpace:"nowrap",color:"#666",fontSize:12},children:te(i.fecha)}),e.jsx("td",{style:{fontWeight:600},children:i.producto_nombre||"—"}),e.jsx("td",{children:e.jsxs("span",{className:"kx-badge",style:{color:u.color,background:u.bg},children:[u.icon," ",u.label]})}),e.jsxs("td",{className:`r ${g>0?"kx-qty-pos":g<0?"kx-qty-neg":""}`,children:[g>0?"+":"",b(i)," ",i.producto_unidad]}),e.jsxs("td",{className:"r",style:{color:"#aaa",fontSize:12},children:[_(i,"stock_anterior")," ",i.producto_unidad]}),e.jsxs("td",{className:"r",style:{fontWeight:700},children:[_(i,"stock_nuevo")," ",i.producto_unidad]}),e.jsx("td",{style:{color:"#555",maxWidth:220},children:i.motivo||"—"}),e.jsx("td",{style:{color:"#888",fontSize:12},children:i.usuario||"—"})]},i.id)})})]})})}),!B&&k.length>0&&e.jsxs("div",{className:"kx-count",children:[k.length," movimiento",k.length!==1?"s":"",k.length!==s.length?` (filtrado de ${s.length})`:""]})]})}const ne=`
  .inv-tabs {
    display: flex; gap: 2px; margin-bottom: 0;
    border-bottom: 2px solid #e8e8e8;
  }
  .inv-tab {
    padding: 10px 20px; border: none; background: transparent;
    cursor: pointer; font-size: 13px; font-weight: 700; color: #999;
    font-family: inherit; transition: color 0.15s;
    border-bottom: 3px solid transparent; margin-bottom: -2px;
    white-space: nowrap;
  }
  .inv-tab:hover { color: #1a472a; }
  .inv-tab.active { color: #1a472a; border-bottom-color: #1a472a; }
  .inv-tab-body { padding-top: 18px; }
`;function ie(){const{permisos:s}=Y(),[h,B]=n.useState("productos"),[x,r]=n.useState([]),[v,y]=n.useState([]),[N,l]=n.useState(""),[m,F]=n.useState(""),[f,E]=n.useState("nombre"),[C,k]=n.useState(!1),[b,_]=n.useState(null),[M,i]=n.useState(null),[u,g]=n.useState(!1),[z,w]=n.useState(null),[I,L]=n.useState(!0);n.useEffect(()=>{d()},[]);async function d(){L(!0);const[a,S]=await Promise.all([window.db.productos.listar(),window.db.categorias.listar()]);r(a),y(S),L(!1)}const j=x.filter(a=>{const S=N.toLowerCase(),t=!S||a.nombre.toLowerCase().includes(S)||(a.codigo||"").includes(S)||(a.codigo_cabys||"").includes(S),c=!m||a.categoria_id===parseInt(m);return t&&c}).sort((a,S)=>f==="nombre"?a.nombre.localeCompare(S.nombre,"es"):f==="precio"?S.precio-a.precio:f==="stock"?a.stock-S.stock:0);async function P(a){try{b?(await window.db.productos.actualizar(b.id,a),T("Producto actualizado correctamente","success")):(await window.db.productos.crear(a),T("Producto creado correctamente","success")),k(!1),_(null),d()}catch(S){T("Error: "+S.message,"error")}}async function R(a){window.confirm(`¿Eliminar "${a.nombre}"? Esta acción no se puede deshacer.`)&&(await window.db.productos.eliminar(a.id),T("Producto eliminado","success"),d())}function T(a,S){w({msg:a,tipo:S}),setTimeout(()=>w(null),3500)}function D(a){return a.stock<=0?{cls:"badge-rojo",row:"stock-critico"}:a.stock<=a.stock_minimo?{cls:"badge-naranja",row:"stock-bajo"}:{cls:"badge-verde",row:""}}const o=x.filter(a=>a.stock>0&&a.stock<=a.stock_minimo).length,p=x.filter(a=>a.stock<=0).length;return I?e.jsx("div",{className:"loading-screen",children:e.jsx("div",{className:"loading-spinner"})}):e.jsxs("div",{className:"page",children:[e.jsx("style",{children:ne}),e.jsxs("div",{className:"page-header",children:[e.jsxs("div",{children:[e.jsx("div",{className:"page-title",children:"📦 Inventario"}),e.jsxs("div",{className:"page-subtitle",children:[h==="productos"&&e.jsxs(e.Fragment,{children:[j.length," de ",x.length," productos",p>0&&e.jsxs("span",{className:"badge badge-rojo",style:{marginLeft:8},children:[p," agotados"]}),o>0&&e.jsxs("span",{className:"badge badge-naranja",style:{marginLeft:6},children:[o," stock bajo"]})]}),h==="entradas"&&"Entradas de mercadería y compras",h==="historial"&&"Kardex — historial de movimientos de inventario"]})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[h==="productos"&&e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn btn-outline",disabled:!0,title:"Próximamente",style:{opacity:.5,cursor:"not-allowed"},children:"📥 Importar Excel"}),e.jsx("button",{className:"btn btn-primary",onClick:()=>{_(null),k(!0)},children:"➕ Nuevo Producto"})]}),h==="entradas"&&e.jsx("button",{className:"btn btn-primary",onClick:()=>g(!0),children:"📥 Nueva Entrada"})]})]}),z&&e.jsx("div",{className:`alert alert-${z.tipo}`,style:{marginBottom:14},children:z.msg}),e.jsx("div",{className:"inv-tabs",children:[{key:"productos",label:"📦 Productos"},{key:"entradas",label:"📥 Entradas"},{key:"historial",label:"📋 Historial / Kardex"}].map(a=>e.jsx("button",{className:`inv-tab${h===a.key?" active":""}`,onClick:()=>B(a.key),children:a.label},a.key))}),e.jsxs("div",{className:"inv-tab-body",children:[h==="productos"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"inventario-toolbar",children:[e.jsxs("div",{className:"search-bar",style:{flex:1,minWidth:200,position:"relative"},children:[e.jsx("span",{className:"search-icon",style:{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:16},children:"🔍"}),e.jsx("input",{className:"form-input",style:{paddingLeft:38},placeholder:"Buscar por nombre, código o CABYS...",value:N,onChange:a=>l(a.target.value)})]}),e.jsxs("select",{className:"form-select",style:{width:170},value:m,onChange:a=>F(a.target.value),children:[e.jsx("option",{value:"",children:"Todas las categorías"}),v.map(a=>e.jsx("option",{value:a.id,children:a.nombre},a.id))]}),e.jsxs("select",{className:"form-select",style:{width:150},value:f,onChange:a=>E(a.target.value),children:[e.jsx("option",{value:"nombre",children:"Ordenar: Nombre"}),e.jsx("option",{value:"precio",children:"Ordenar: Precio"}),e.jsx("option",{value:"stock",children:"Ordenar: Stock"})]})]}),e.jsx("div",{className:"card",children:e.jsx("div",{className:"table-wrapper",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Código"}),e.jsx("th",{children:"Nombre"}),e.jsx("th",{children:"Categoría"}),e.jsx("th",{children:"Unidad"}),e.jsx("th",{style:{textAlign:"right"},children:"Sin IVA"}),e.jsx("th",{style:{textAlign:"right"},children:"Con IVA"}),s.ver_costos_ganancias&&e.jsx("th",{style:{textAlign:"right"},children:"Costo"}),e.jsx("th",{style:{textAlign:"center"},children:"IVA"}),e.jsx("th",{style:{textAlign:"right"},children:"Stock"}),e.jsx("th",{style:{textAlign:"right"},children:"Mín."}),e.jsx("th",{children:"CABYS"}),e.jsx("th",{children:"Estado"}),e.jsx("th",{children:"Acciones"})]})}),e.jsx("tbody",{children:j.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:s.ver_costos_ganancias?13:12,style:{textAlign:"center",padding:40,color:"var(--texto-muted)"},children:"No hay productos que mostrar"})}):j.map(a=>{const S=D(a),t=a.tasa_impuesto||0,c=Math.round(a.precio/(1+t/100));return e.jsxs("tr",{className:S.row,children:[e.jsx("td",{style:{fontFamily:"monospace",fontSize:12},children:a.codigo||e.jsx("span",{style:{color:"var(--texto-muted)"},children:"—"})}),e.jsx("td",{style:{fontWeight:600,maxWidth:180},children:a.nombre}),e.jsx("td",{children:a.categoria_nombre?e.jsx("span",{className:"badge badge-verde",children:a.categoria_nombre}):e.jsx("span",{className:"badge badge-gris",children:"—"})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${a.unidad==="kg"?"badge-naranja":"badge-azul"}`,children:a.unidad})}),e.jsx("td",{style:{textAlign:"right",color:"var(--texto-sec)",fontSize:13},children:$(c)}),e.jsx("td",{style:{textAlign:"right",fontWeight:700,color:"var(--naranja-oscuro)"},children:$(a.precio)}),s.ver_costos_ganancias&&e.jsx("td",{style:{textAlign:"right",color:"var(--texto-muted)",fontSize:12},children:$(a.costo)}),e.jsx("td",{style:{textAlign:"center"},children:e.jsxs("span",{className:`badge ${t>0?"badge-naranja":"badge-gris"}`,children:[t,"%"]})}),e.jsx("td",{style:{textAlign:"right",fontWeight:700},children:a.unidad==="kg"||a.unidad==="gramo"?(+a.stock).toFixed(3):(+a.stock).toFixed(0)}),e.jsx("td",{style:{textAlign:"right",color:"var(--texto-muted)",fontSize:12},children:a.stock_minimo>0?a.unidad==="kg"||a.unidad==="gramo"?(+a.stock_minimo).toFixed(3):(+a.stock_minimo).toFixed(0):"—"}),e.jsx("td",{style:{fontFamily:"monospace",fontSize:10.5,color:"var(--texto-sec)"},children:a.codigo_cabys?e.jsxs("span",{title:a.codigo_cabys,children:[a.codigo_cabys.slice(0,10),a.codigo_cabys.length>10?"…":""]}):e.jsx("span",{style:{color:"var(--texto-muted)"},children:"—"})}),e.jsx("td",{children:a.stock<=0?e.jsx("span",{className:"badge badge-rojo",children:"🔴 Agotado"}):a.stock<=a.stock_minimo?e.jsx("span",{className:"badge badge-naranja",children:"⚠️ Bajo"}):e.jsx("span",{className:"badge badge-verde",children:"✓ OK"})}),e.jsx("td",{children:e.jsxs("div",{className:"table-actions",children:[s.ajustar_inventario&&e.jsx("button",{className:"btn btn-outline btn-sm",title:"Ajustar Stock",onClick:()=>i(a),children:"⚙️"}),e.jsx("button",{className:"btn btn-outline btn-sm",title:"Editar",onClick:()=>{_(a),k(!0)},children:"✏️"}),e.jsx("button",{className:"btn btn-danger btn-sm",title:"Eliminar",onClick:()=>R(a),children:"🗑️"})]})})]},a.id)})})]})})})]}),h==="entradas"&&e.jsx(se,{onNuevaEntrada:()=>g(!0)}),h==="historial"&&e.jsx(oe,{})]}),C&&e.jsx(U,{producto:b,categorias:v,onGuardar:P,onCerrar:()=>{k(!1),_(null)}}),M&&e.jsx(J,{producto:M,onConfirmar:()=>{i(null),d(),T("Stock ajustado correctamente","success")},onCerrar:()=>i(null)}),u&&e.jsx(Z,{productos:x,onConfirmar:()=>{g(!1),d(),T("Entrada de mercadería registrada correctamente","success")},onCerrar:()=>g(!1)})]})}function se({onNuevaEntrada:s}){const{permisos:h}=Y(),[B,x]=n.useState([]),[r,v]=n.useState(!0);n.useEffect(()=>{(async()=>{v(!0);const l=await window.db.inventario.movimientos({tipo:"entrada"});x(l||[]),v(!1)})()},[]);const y=l=>l==="kg"||l==="gramo";function N(l){const m=new Date(l.replace(" ","T"));return isNaN(m)?l:m.toLocaleString("es-CR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}return!r&&B.length===0?e.jsxs("div",{className:"card",style:{padding:52,textAlign:"center"},children:[e.jsx("div",{style:{fontSize:52,marginBottom:12},children:"📦"}),e.jsx("div",{style:{fontSize:16,fontWeight:700,marginBottom:8},children:"Sin entradas registradas"}),e.jsx("div",{style:{color:"var(--texto-muted)",marginBottom:24},children:"Registrá el ingreso de mercadería para llevar un Kardex completo."}),e.jsx("button",{className:"btn btn-primary",onClick:s,children:"📥 Registrar primera entrada"})]}):e.jsx("div",{className:"card",children:e.jsx("div",{className:"table-wrapper",children:r?e.jsx("div",{style:{padding:40,textAlign:"center",color:"#bbb"},children:"Cargando..."}):e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Fecha"}),e.jsx("th",{children:"Producto"}),e.jsx("th",{style:{textAlign:"right"},children:"Cantidad"}),h.ver_costos_ganancias&&e.jsx("th",{style:{textAlign:"right"},children:"Costo Unit."}),e.jsx("th",{style:{textAlign:"right"},children:"Stock Resultante"}),e.jsx("th",{children:"Proveedor / Motivo"}),e.jsx("th",{children:"Usuario"})]})}),e.jsx("tbody",{children:B.map(l=>e.jsxs("tr",{children:[e.jsx("td",{style:{whiteSpace:"nowrap",color:"#666",fontSize:12},children:N(l.fecha)}),e.jsx("td",{style:{fontWeight:600},children:l.producto_nombre||"—"}),e.jsxs("td",{style:{textAlign:"right",color:"#2e7d32",fontWeight:800},children:["+",y(l.producto_unidad)?(+l.cantidad).toFixed(3):(+l.cantidad).toFixed(0)," ",l.producto_unidad]}),h.ver_costos_ganancias&&e.jsx("td",{style:{textAlign:"right",color:"#555",fontSize:12},children:l.costo_unitario>0?$(l.costo_unitario):"—"}),e.jsxs("td",{style:{textAlign:"right",fontWeight:700},children:[y(l.producto_unidad)?(+l.stock_nuevo).toFixed(3):(+l.stock_nuevo).toFixed(0)," ",l.producto_unidad]}),e.jsx("td",{style:{color:"#555"},children:l.motivo||"—"}),e.jsx("td",{style:{color:"#888",fontSize:12},children:l.usuario||"—"})]},l.id))})]})})})}export{ie as default};
