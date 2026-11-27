/* pos-catalogo.js — el ARAMO POS dentro de la lista única de productos de ARAMO (2026-11-25).
   · Une cada producto del POS con su producto de ARAMO (columna catalogo_id).
   · Agrega los productos de ARAMO que el POS no tiene: entran sin precio y sin stock (el precio
     se pone la primera vez que se venden; el stock, como siempre, en Inventario). Un producto
     que ya se agregó una vez no se vuelve a agregar: si alguien lo borra del POS, queda borrado.
   · Arma la lista que el POS publica en la nube para que La Feria use sus precios. */
window.PosCatalogo=(function(){
'use strict';
const CAT_POS={frutas:'Frutas',verduras:'Verduras',hierbas:'Hierbas',despensa:'Despensa',raices:'Raíces'};
const COLOR={Frutas:'#FF9800',Verduras:'#4CAF50',Hierbas:'#8BC34A',Despensa:'#A1887F','Raíces':'#795548'};
const DE_POS={Frutas:'frutas','Cítricos':'frutas',Verduras:'verduras',Hierbas:'hierbas','Raíces':'raices','Tubérculos':'raices',Despensa:'despensa','Lácteos':'despensa',Granos:'despensa',Bebidas:'despensa',Especias:'despensa'};

function sincronizar(POS,opc){
  const C=window.ARAMO_CAT;if(!C||!POS)return{agregados:0,unidos:0};
  const todas=(s,a)=>POS.prepare(s).all(a||[]),correr=(s,a)=>POS.prepare(s).run(a||[]),una=(s,a)=>POS.prepare(s).get(a||[]);
  Object.keys(COLOR).forEach(n=>correr('INSERT OR IGNORE INTO categorias (nombre, color) VALUES (?, ?)',[n,COLOR[n]]));
  const cats=new Map(todas('SELECT id, nombre FROM categorias').map(c=>[c.nombre,c.id]));
  const ya=new Set();let unidos=0,agregados=0;
  todas('SELECT id, nombre, catalogo_id FROM productos').forEach(p=>{
    const id=p.catalogo_id||C.idDe(p.nombre);ya.add(id);
    if(!p.catalogo_id){correr('UPDATE productos SET catalogo_id = ? WHERE id = ?',[id,p.id]);unidos++;}
  });
  const fila=una("SELECT valor FROM configuracion WHERE clave = 'catalogo_agregados'");
  let antes=[];try{antes=JSON.parse(fila&&fila.valor||'[]');}catch(e){}
  const vistos=new Set(antes),nuevos=[];
  ((opc&&opc.lista)||C.todos()).forEach(x=>{
    if(!x||!x.id||ya.has(x.id)||vistos.has(x.id))return;
    correr('INSERT INTO productos (codigo,nombre,precio,costo,stock,stock_minimo,unidad,categoria_id,emoji,catalogo_id,origen) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      ['',x.n,0,0,0,0,x.u==='kg'?'kg':'unidad',cats.get(CAT_POS[x.c])||null,x.e||'',x.id,'catalogo']);
    ya.add(x.id);nuevos.push(x.id);agregados++;
  });
  if(nuevos.length)correr("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('catalogo_agregados', ?)",[JSON.stringify(antes.concat(nuevos))]);
  return{agregados,unidos};
}

// Lo que se publica: { claveDeLaFeria: {id, n, p, u, c, e} } con los productos activos del POS.
function lista(POS){
  const C=window.ARAMO_CAT,out={};if(!POS)return out;
  POS.prepare(`SELECT p.nombre, p.precio, p.unidad, p.emoji, p.catalogo_id, c.nombre AS cat
               FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.activo = 1 ORDER BY p.id`).all().forEach(r=>{
    const id=r.catalogo_id||(C?C.idDe(r.nombre):String(r.nombre)),k=C?C.claveFeria(id):id;
    if(out[k]&&+out[k].p>0)return; // si el POS lo tiene dos veces, manda el que tiene precio
    out[k]={id,n:String(r.nombre||''),p:Math.round((+r.precio||0)*100)/100,u:r.unidad==='kg'?'kg':'unid',c:DE_POS[r.cat]||(C?C.categoria(r.nombre):''),e:r.emoji||''};
  });
  return out;
}
// Firma corta de la lista, para no volver a publicar lo mismo
function firma(obj){const s=JSON.stringify(obj);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)+':'+s.length;}

return{sincronizar,lista,firma,CAT_POS};
})();
