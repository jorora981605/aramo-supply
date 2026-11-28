# ARAMO · reglas fijas del dueño

Estas reglas las pidió el dueño varias veces. Valen para cualquier asistente (Claude, Codex u otro) y para cualquier versión que se publique, hasta que el dueño dé otra orden.

## 1. El Control es SOLO de Los Ángeles (LASR)

- Moravia no tiene Control. Un aparato sin tienda escogida cuenta como Moravia.
- La puerta «Control» del Inicio y la tecla 4 salen solamente si la tienda del aparato es Los Ángeles (`puerta.js`, `localK()!=='angeles'`).
- `control.html` abre siempre con Los Ángeles (`TIENDA='angeles'`). No hay selector de Moravia.
- Solo el POS de Los Ángeles manda su resumen del día al Control. Eso incluye `pos/pos-dia.js` (`tiendasControl()` = `['angeles']`) y `posPublicarResumen` en `pos/pos-web.js`.
- En Moravia ningún texto menciona el Control.
- Prueba: `probar-control-moravia.js` revisa Moravia, Los Ángeles y un aparato sin tienda.

## 2. Reiniciar el pedido a proveedores

- Se reinicia solo dentro de Inventario, una tienda por vez, desde el encabezado de esa tienda.
- Nunca va en el Inicio un «Reiniciar el pedido de las dos tiendas» (ni la acción `reiniciar-pedido`).
- El Mostrador tampoco esconde reinicios en «Más».

## 3. Inventario

- Se llama **Inventario**, no «Surtido».
- La pestaña **«Productos y precios»** sirve para buscar productos, ver y cambiar su precio, agregar productos nuevos y editar nombres. Eso no va en Configuración.
- El PDF de cada tienda solo se abre para verlo. El pedido se envía desde **Ambos**.

## 4. Publicar

- Siempre se parte de `origin/main` actualizado. No se publican copias viejas de archivos que otra sesión ya cambió: se juntan los cambios, no se pisan.
- En cada publicación se sube el número de versión del service worker (`CACHE_NAME`).
- Nunca se publican `.rediseno/`, `DISENO-FABLE/`, `.sql`, `.md` ni `abrir-local.*`; `compilar.mjs` ya los deja fuera.
