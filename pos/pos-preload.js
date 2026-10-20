(function(){
// preload.js — puente seguro entre el proceso principal y el renderer
'use strict';

// web: el mismo window.db del POS de Windows, pero cada llamada la atiende pos-web.js
const contextBridge = { exposeInMainWorld: (n, o) => { window[n] = o; } };
const ipcRenderer = {
  invoke: (c, ...a) => window.POSWEB.invoke(c, ...a),
  send: (c, ...a) => window.POSWEB.send(c, ...a),
  on: (c, cb) => window.POSWEB.on(c, cb),
  removeAllListeners: (c) => window.POSWEB.off(c),
};

contextBridge.exposeInMainWorld('db', {
  // Categorías
  categorias: {
    listar: () => ipcRenderer.invoke('categorias:listar'),
  },

  // Productos
  productos: {
    listar:       ()          => ipcRenderer.invoke('productos:listar'),
    buscar:       (q)         => ipcRenderer.invoke('productos:buscar', q),
    obtener:      (id)        => ipcRenderer.invoke('productos:obtener', id),
    crear:        (d)         => ipcRenderer.invoke('productos:crear', d),
    actualizar:   (id, d)     => ipcRenderer.invoke('productos:actualizar', id, d),
    eliminar:     (id)        => ipcRenderer.invoke('productos:eliminar', id),
    ajustarStock: (id, qty)   => ipcRenderer.invoke('productos:ajustar_stock', id, qty),
    crearLote:    (lista)     => ipcRenderer.invoke('productos:crear_lote', lista),
  },

  // Promociones
  promociones: {
    listar:     ()       => ipcRenderer.invoke('promociones:listar'),
    activas:    (pid)    => ipcRenderer.invoke('promociones:activas', pid),
    crear:      (d)      => ipcRenderer.invoke('promociones:crear', d),
    actualizar: (id, d)  => ipcRenderer.invoke('promociones:actualizar', id, d),
    eliminar:   (id)     => ipcRenderer.invoke('promociones:eliminar', id),
  },

  // Caja
  caja: {
    actual:       ()        => ipcRenderer.invoke('caja:actual'),
    historial:    ()        => ipcRenderer.invoke('caja:historial'),
    abrir:        (d)       => ipcRenderer.invoke('caja:abrir', d),
    cerrar:       (id, d)   => ipcRenderer.invoke('caja:cerrar', id, d),
    resumen:      (id)      => ipcRenderer.invoke('caja:resumen', id),
    descuentoMax: ()        => ipcRenderer.invoke('caja:descuentoMax'),
  },

  // Ventas
  ventas: {
    crear:        (d)           => ipcRenderer.invoke('ventas:crear', d),
    listar:       (filtros)     => ipcRenderer.invoke('ventas:listar', filtros),
    obtener:      (id)          => ipcRenderer.invoke('ventas:obtener', id),
    anular:       (id, data)    => ipcRenderer.invoke('ventas:anular', id, data),
    cajeros:      ()            => ipcRenderer.invoke('ventas:cajeros'),
    devolverItem: (vid, iid)    => ipcRenderer.invoke('ventas:devolver_item', vid, iid),
  },

  // Reportes
  reportes: {
    resumen:       (desde, hasta) => ipcRenderer.invoke('reportes:resumen', desde, hasta),
    topProductos:  (desde, hasta, lim) => ipcRenderer.invoke('reportes:top_productos', desde, hasta, lim),
    stockBajo:     ()              => ipcRenderer.invoke('reportes:stock_bajo'),
  },

  // Configuración
  config: {
    obtenerTodo: ()        => ipcRenderer.invoke('config:obtener_todo'),
    obtener:     (clave)   => ipcRenderer.invoke('config:obtener', clave),
    guardar:     (datos)   => ipcRenderer.invoke('config:guardar', datos),
  },

  // Facturación electrónica
  facturas: {
    listar:           ()       => ipcRenderer.invoke('facturas:listar'),
    crear:            (vid)    => ipcRenderer.invoke('facturas:crear', vid),
    obtener:          (id)     => ipcRenderer.invoke('facturas:obtener', id),
    actualizarEstado: (id, e, m) => ipcRenderer.invoke('facturas:actualizar_estado', id, e, m),
  },

  // CABYS
  cabys: {
    buscar: (termino) => ipcRenderer.invoke('cabys:buscar', termino),
  },

  // Cajeros
  cajeros: {
    listar:        ()          => ipcRenderer.invoke('cajeros:listar'),
    todos:         ()          => ipcRenderer.invoke('cajeros:todos'),
    crear:         (d)         => ipcRenderer.invoke('cajeros:crear', d),
    actualizar:    (id, d)     => ipcRenderer.invoke('cajeros:actualizar', id, d),
    eliminar:      (id)        => ipcRenderer.invoke('cajeros:eliminar', id),
    verificarPin:     (id, pin)          => ipcRenderer.invoke('cajeros:verificarPin', id, pin),
    verificarAdmin:   (pin)              => ipcRenderer.invoke('cajeros:verificarAdmin', pin),
    porNombre:        (nombre)           => ipcRenderer.invoke('cajeros:porNombre', nombre),
    guardarPermisos:  (id, permisos, pin)=> ipcRenderer.invoke('cajeros:guardarPermisos', id, permisos, pin),
  },

  // Inventario (Kardex)
  inventario: {
    movimientos: (filtros) => ipcRenderer.invoke('inventario:movimientos', filtros),
    ajustar:     (data)    => ipcRenderer.invoke('inventario:ajustar', data),
    entrada:     (data)    => ipcRenderer.invoke('inventario:entrada', data),
  },

  // Backups
  backup: {
    ejecutar:          ()           => ipcRenderer.invoke('backup:ejecutar'),
    listar:            ()           => ipcRenderer.invoke('backup:listar'),
    seleccionarCarpeta:()           => ipcRenderer.invoke('backup:seleccionar_carpeta'),
    restaurar:         (nom, pin)   => ipcRenderer.invoke('backup:restaurar', nom, pin),
  },

  // App
  app: {
    abrirDatos:    () => ipcRenderer.invoke('app:abrir_datos'),
    forceClose:    () => ipcRenderer.send('app:force-close'),
    onBeforeClose: (cb) => ipcRenderer.on('app:before-close', (_, d) => cb(d)),
    offBeforeClose: () => ipcRenderer.removeAllListeners('app:before-close'),
  },

  // Tiquete térmico
  tiquete: {
    imprimir: (html)          => ipcRenderer.invoke('tiquete:imprimir', html),
    guardar:  (texto, numero) => ipcRenderer.invoke('tiquete:guardar', texto, numero),
  },
});

})();
