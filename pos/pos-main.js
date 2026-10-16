/* ARAMO POS · main.js del POS de Windows, igual al original, corriendo en el navegador.
   Generado por build_pos.py: solo cambia Electron/disco por la versión web (pos-web.js). */
window.POS_MAIN = function (H) {
// main.js — Electron main process con sql.js (WebAssembly, sin compilación nativa)
'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = H.electron;
const path   = H.path;
const fs     = H.fs;
const https  = H.https;
const crypto = H.crypto;
const process = H.process, __dirname = '';

const isDev = process.env.NODE_ENV === 'development';

// ──────────────────────────────────────────────
// BASE DE DATOS (sql.js — WebAssembly)
// ──────────────────────────────────────────────
let db;
let dbFilePath;
let _inTransaction = false; // evita que saveDB() llame db.export() dentro de BEGIN/COMMIT

// ─ Helpers que imitan la API de better-sqlite3 ─
function prepare(sql) {
  return {
    run(...args) {
      const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args.flat();
      db.run(sql, params.length ? params : []);
      // No persistir mientras hay una transacción activa; db.export() puede
      // interferir con el estado interno de sql.js durante BEGIN…COMMIT.
      if (!_inTransaction) saveDB();
      const r = db.exec('SELECT last_insert_rowid()');
      return { lastInsertRowid: r[0]?.values?.[0]?.[0] ?? null };
    },
    get(...args) {
      const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args.flat();
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row;
    },
    all(...args) {
      const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args.flat();
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
  };
}

function dbExec(sql) {
  db.run(sql);
  saveDB();
}

function saveDB() {
  // web: no se exporta en cada cambio; pos-web.js guarda en el dispositivo y sube a la nube
  if (!db) return;
  H.cambio();
}

// ──────────────────────────────────────────────
// BACKUPS
// ──────────────────────────────────────────────
function backupDir() {
  return path.join(app.getPath('documents'), 'ARAMO POS', 'Backups');
}

function backupDB() {
  if (!db || !dbFilePath) return { ok: false, error: 'DB no inicializada' };
  try {
    saveDB(); // garantizar que el archivo en disco esté actualizado

    const now    = new Date();
    const fecha  = now.toISOString().slice(0, 10);                  // 2026-06-13
    const hora   = now.toTimeString().slice(0, 5).replace(':', ''); // 1430
    const nombre = `backup_pos_aramo_${fecha}_${hora}.db`;

    const dir = backupDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const destLocal = path.join(dir, nombre);
    fs.copyFileSync(dbFilePath, destLocal);

    // Copia a carpeta de nube si está configurada y existe
    try {
      const r = prepare('SELECT valor FROM configuracion WHERE clave = ?').get(['backup_carpeta_nube']);
      const nubeDir = r?.valor;
      if (nubeDir && fs.existsSync(nubeDir)) {
        fs.copyFileSync(dbFilePath, path.join(nubeDir, nombre));
      }
    } catch(_) {}

    // Mantener solo los últimos 30 respaldos
    try {
      const archivos = fs.readdirSync(dir)
        .filter(f => f.startsWith('backup_pos_aramo_') && f.endsWith('.db'))
        .sort(); // fecha ISO ordena bien alfanuméricamente
      if (archivos.length > 30) {
        for (const f of archivos.slice(0, archivos.length - 30)) {
          try { fs.unlinkSync(path.join(dir, f)); } catch(_) {}
        }
      }
    } catch(_) {}

    return { ok: true, nombre, ruta: destLocal };
  } catch (err) {
    console.error('[backup] Error:', err.message);
    return { ok: false, error: err.message };
  }
}

function backupDiario() {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const dir = backupDir();
    if (!fs.existsSync(dir)) { backupDB(); return; }
    const existe = fs.readdirSync(dir)
      .some(f => f.startsWith(`backup_pos_aramo_${hoy}`) && f.endsWith('.db'));
    if (!existe) backupDB();
  } catch(e) {}
}

function registrarMovimiento({ producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo = '', costo_unitario = 0, usuario = '' }) {
  try {
    prepare(`
      INSERT INTO movimientos_inventario
        (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, costo_unitario, usuario)
      VALUES (?,?,?,?,?,?,?,?)
    `).run([producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, costo_unitario, usuario]);
  } catch(e) {
    console.error('[kardex]', e.message);
  }
}

function transaction(fn) {
  return (...args) => {
    _inTransaction = true;
    db.run('BEGIN');
    try {
      const result = fn(...args);
      db.run('COMMIT');
      _inTransaction = false;
      saveDB(); // persistir solo tras el COMMIT exitoso
      return result;
    } catch (originalError) {
      _inTransaction = false;
      try {
        db.run('ROLLBACK');
      } catch (_rollbackErr) {
        // El ROLLBACK puede fallar si sql.js ya revirtió internamente;
        // ignoramos ese error secundario y relanzamos el error original.
      }
      throw originalError;
    }
  };
}

async function initDB() {
  // web: la base viene del dispositivo o de la nube (pos-web.js)
  const SQL = await H.sql();
  dbFilePath = 'web';
  const buf = H.bytes();
  db = buf ? new SQL.Database(buf) : new SQL.Database();

  db.run('PRAGMA foreign_keys = ON');

  // ── Schema ──
  db.run(`CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY, valor TEXT NOT NULL DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    color  TEXT DEFAULT '#4CAF50'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS productos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo            TEXT,
    nombre            TEXT NOT NULL,
    descripcion       TEXT DEFAULT '',
    precio            REAL NOT NULL DEFAULT 0,
    costo             REAL DEFAULT 0,
    stock             REAL DEFAULT 0,
    stock_minimo      REAL DEFAULT 0,
    unidad            TEXT DEFAULT 'unidad',
    tasa_impuesto     REAL DEFAULT 0,
    categoria_id      INTEGER REFERENCES categorias(id),
    activo            INTEGER DEFAULT 1,
    fecha_creacion    TEXT DEFAULT (datetime('now','localtime')),
    fecha_modificacion TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS cajas (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_apertura         TEXT DEFAULT (datetime('now','localtime')),
    fecha_cierre           TEXT,
    monto_apertura         REAL DEFAULT 0,
    monto_cierre_calculado REAL DEFAULT 0,
    monto_cierre_real      REAL DEFAULT 0,
    diferencia             REAL DEFAULT 0,
    estado                 TEXT DEFAULT 'abierta',
    notas_apertura         TEXT DEFAULT '',
    notas_cierre           TEXT DEFAULT '',
    usuario                TEXT DEFAULT 'Admin'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS arqueo_detalle (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    caja_id          INTEGER REFERENCES cajas(id),
    tipo             TEXT NOT NULL,
    denominacion     REAL NOT NULL,
    tipo_denominacion TEXT NOT NULL,
    cantidad         INTEGER DEFAULT 0,
    subtotal         REAL DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS ventas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    numero          TEXT UNIQUE NOT NULL,
    fecha           TEXT DEFAULT (datetime('now','localtime')),
    subtotal        REAL NOT NULL DEFAULT 0,
    descuento_total REAL DEFAULT 0,
    impuesto        REAL DEFAULT 0,
    total           REAL NOT NULL DEFAULT 0,
    metodo_pago     TEXT DEFAULT 'efectivo',
    monto_recibido  REAL DEFAULT 0,
    cambio          REAL DEFAULT 0,
    estado          TEXT DEFAULT 'completada',
    caja_id         INTEGER,
    cliente_nombre  TEXT DEFAULT '',
    cliente_cedula  TEXT DEFAULT '',
    notas           TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS venta_items (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id              INTEGER REFERENCES ventas(id),
    producto_id           INTEGER REFERENCES productos(id),
    nombre                TEXT NOT NULL,
    precio_unitario       REAL NOT NULL,
    cantidad              REAL NOT NULL,
    unidad                TEXT NOT NULL,
    tasa_impuesto         REAL DEFAULT 0,
    descuento             REAL DEFAULT 0,
    subtotal              REAL NOT NULL,
    promocion_id          INTEGER,
    promocion_descripcion TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS promociones (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT NOT NULL,
    descripcion     TEXT DEFAULT '',
    tipo            TEXT NOT NULL,
    valor           REAL DEFAULT 0,
    precio_especial REAL DEFAULT 0,
    producto_id     INTEGER REFERENCES productos(id),
    fecha_inicio    TEXT,
    fecha_fin       TEXT,
    activo          INTEGER DEFAULT 1,
    fecha_creacion  TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS cajeros (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT NOT NULL,
    cedula     TEXT DEFAULT '',
    pin_hash   TEXT NOT NULL,
    pin_salt   TEXT NOT NULL,
    rol        TEXT DEFAULT 'cajero',
    estado     TEXT DEFAULT 'activo',
    color      TEXT DEFAULT '#1565C0',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS facturas_electronicas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id           INTEGER UNIQUE REFERENCES ventas(id),
    clave              TEXT UNIQUE,
    numero_consecutivo TEXT,
    tipo_documento     TEXT DEFAULT '01',
    xml_enviado        TEXT DEFAULT '',
    xml_respuesta      TEXT DEFAULT '',
    estado             TEXT DEFAULT 'pendiente',
    fecha_envio        TEXT,
    fecha_respuesta    TEXT,
    mensaje_hacienda   TEXT DEFAULT '',
    fecha_creacion     TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id    INTEGER REFERENCES productos(id),
    tipo           TEXT NOT NULL,
    cantidad       REAL NOT NULL,
    stock_anterior REAL NOT NULL DEFAULT 0,
    stock_nuevo    REAL NOT NULL DEFAULT 0,
    motivo         TEXT DEFAULT '',
    costo_unitario REAL DEFAULT 0,
    usuario        TEXT DEFAULT '',
    fecha          TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // ── Config por defecto ──
  const configs = [
    ['empresa_nombre','ARAMO Frutas y Verduras'],
    ['empresa_cedula','3101000000'],
    ['empresa_tipo_cedula','02'],
    ['empresa_telefono',''],
    ['empresa_correo',''],
    ['empresa_direccion','San José, Costa Rica'],
    ['empresa_provincia','1'],
    ['empresa_canton','01'],
    ['empresa_distrito','01'],
    ['empresa_actividad','011101'],
    ['moneda','CRC'],
    ['siguiente_numero','1'],
    ['hacienda_usuario',''],
    ['hacienda_password',''],
    ['hacienda_ambiente','stag'],
    ['mostrar_impuesto','0'],
    ['sinpe_numero',''],
  ];
  for (const [k, v] of configs) {
    db.run('INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)', [k, v]);
  }

  // ── Categorías ──
  const cats = [
    ['Frutas','#FF9800'],['Verduras','#4CAF50'],['Hierbas','#8BC34A'],
    ['Raíces','#795548'],['Cítricos','#FFC107'],['Lácteos','#90CAF9'],
    ['Granos','#FFD54F'],['Otros','#9E9E9E'],
  ];
  for (const [n, c] of cats) {
    db.run('INSERT OR IGNORE INTO categorias (nombre, color) VALUES (?, ?)', [n, c]);
  }

  // Migración: columna codigo_cabys
  try { db.run('ALTER TABLE productos ADD COLUMN codigo_cabys TEXT DEFAULT ""'); } catch(e) {}

  // Migraciones cajeros (para DBs anteriores sin la tabla)
  try { db.run('ALTER TABLE cajeros ADD COLUMN cedula TEXT DEFAULT ""'); } catch(e) {}

  // Migraciones ventas — columnas de pago mixto
  try { db.run('ALTER TABLE ventas ADD COLUMN pago_efectivo REAL DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE ventas ADD COLUMN pago_tarjeta  REAL DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE ventas ADD COLUMN pago_sinpe    REAL DEFAULT 0'); } catch(e) {}

  // Migraciones — descuentos manuales
  try { db.run('ALTER TABLE cajeros     ADD COLUMN desc_max_pct    REAL DEFAULT 10'); } catch(e) {}
  try { db.run('ALTER TABLE ventas      ADD COLUMN desc_global_pct   REAL DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE ventas      ADD COLUMN desc_global_monto REAL DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE venta_items ADD COLUMN desc_manual_pct   REAL DEFAULT 0'); } catch(e) {}

  // Migraciones — metadatos de anulación
  try { db.run('ALTER TABLE ventas ADD COLUMN anulado_por    TEXT DEFAULT NULL'); } catch(e) {}
  try { db.run('ALTER TABLE ventas ADD COLUMN anulado_fecha  TEXT DEFAULT NULL'); } catch(e) {}
  try { db.run('ALTER TABLE ventas ADD COLUMN anulado_motivo TEXT DEFAULT NULL'); } catch(e) {}

  // Migración — emoji por producto
  try { db.run('ALTER TABLE productos ADD COLUMN emoji TEXT DEFAULT ""'); } catch(e) {}

  // Migraciones — producto genérico / CABYS por línea
  try { db.run('ALTER TABLE venta_items ADD COLUMN cabys_codigo      TEXT    DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE venta_items ADD COLUMN producto_generico INTEGER DEFAULT 0');  } catch(e) {}

  // Migración — permisos individuales por cajero
  try { db.run("ALTER TABLE cajeros ADD COLUMN permisos TEXT DEFAULT '{}'"); } catch(e) {}

  // Admin por defecto si no existe ningún administrador
  const adminCnt = prepare(`SELECT COUNT(*) AS n FROM cajeros WHERE rol = 'administrador'`).get();
  if (!adminCnt || adminCnt.n === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update('1234' + salt).digest('hex');
    prepare(`INSERT INTO cajeros (nombre, cedula, pin_hash, pin_salt, rol, estado, color)
             VALUES (?,?,?,?,?,?,?)`)
      .run(['Administrador', '', hash, salt, 'administrador', 'activo', '#1a472a']);
  }

  // ── Productos de muestra ──
  const cnt = prepare('SELECT COUNT(*) AS n FROM productos').get();
  if (!cnt || cnt.n === 0) {
    const prodData = [
      ['001','Manzana Roja',    1200,750, 50,5, 'kg',     1],
      ['002','Banano',           500,300,100,10,'kg',     1],
      ['003','Papaya',          1400,900, 20,3, 'kg',     1],
      ['004','Piña',            1800,1200,15,2, 'unidad', 1],
      ['005','Sandía',          2000,1300,10,2, 'unidad', 1],
      ['006','Naranja',          800,500, 40,5, 'kg',     5],
      ['007','Limón',            600,350, 30,5, 'kg',     5],
      ['008','Zanahoria',        700,450, 30,5, 'kg',     2],
      ['009','Tomate',           900,580, 25,5, 'kg',     2],
      ['010','Lechuga',          800,500, 20,3, 'unidad', 2],
      ['011','Chile Dulce',     1200,800, 15,3, 'kg',     2],
      ['012','Pepino',           600,380, 20,3, 'kg',     2],
      ['013','Brócoli',         1500,1000,10,2, 'unidad', 2],
      ['014','Repollo',          700,450, 15,3, 'unidad', 2],
      ['015','Culantro',         500,300, 30,5, 'unidad', 3],
      ['016','Apio',             600,380, 20,3, 'unidad', 3],
      ['017','Yuca',             600,380, 20,5, 'kg',     4],
      ['018','Ñame',            1000,650, 10,2, 'kg',     4],
      ['019','Camote',           700,450, 15,3, 'kg',     4],
      ['020','Plátano Maduro',   500,300, 50,10,'kg',     1],
    ];
    for (const r of prodData) {
      db.run(
        'INSERT INTO productos (codigo,nombre,precio,costo,stock,stock_minimo,unidad,categoria_id) VALUES (?,?,?,?,?,?,?,?)',
        r
      );
    }
  }

  saveDB();
}

// Número de venta
function generarNumeroVenta() {
  const cfg = prepare('SELECT valor FROM configuracion WHERE clave = ?').get(['siguiente_numero']);
  const n = parseInt(cfg?.valor || '1', 10);
  db.run('UPDATE configuracion SET valor = ? WHERE clave = ?', [String(n + 1), 'siguiente_numero']);
  const now = new Date();
  const fecha = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  return `VTA-${fecha}-${String(n).padStart(4,'0')}`;
}

// ──────────────────────────────────────────────
// VENTANA
// ──────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366, height: 768,
    minWidth: 1024, minHeight: 600,
    title: 'ARAMO Frutas y Verduras - POS',
    backgroundColor: '#1B5E20',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Interceptar cierre de ventana para mostrar opciones de caja
  mainWindow.on('close', (e) => {
    const caja = prepare(`SELECT * FROM cajas WHERE estado='abierta' LIMIT 1`).get();
    if (!caja) return; // sin caja abierta → cierre normal
    e.preventDefault(); // bloquear cierre inmediato
    mainWindow.webContents.send('app:before-close', {
      cajero:         caja.usuario,
      fecha_apertura: caja.fecha_apertura,
    });
  });
}

// Renderer pide cerrar definitivamente (tras arqueo o salir sin cerrar)
ipcMain.on('app:force-close', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('close'); // evitar que el interceptor vuelva a disparar
    mainWindow.close();
  }
});

app.whenReady().then(async () => {
  try {
    await initDB();
    backupDiario();
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Error al iniciar', `No se pudo inicializar la base de datos:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (db) saveDB();
  if (process.platform !== 'darwin') app.quit();
});

// ──────────────────────────────────────────────
// IPC — CATEGORÍAS
// ──────────────────────────────────────────────
ipcMain.handle('categorias:listar', () =>
  prepare('SELECT * FROM categorias ORDER BY nombre').all()
);

// ──────────────────────────────────────────────
// IPC — PRODUCTOS
// ──────────────────────────────────────────────
ipcMain.handle('productos:listar', () =>
  prepare(`
    SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.activo = 1 ORDER BY p.nombre
  `).all()
);

ipcMain.handle('productos:buscar', (_, q) => {
  const like = `%${q}%`;
  return prepare(`
    SELECT p.*, c.nombre AS categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.activo = 1 AND (p.nombre LIKE ? OR p.codigo LIKE ?)
    ORDER BY p.nombre LIMIT 30
  `).all([like, like]);
});

ipcMain.handle('productos:obtener', (_, id) =>
  prepare(`
    SELECT p.*, c.nombre AS categoria_nombre
    FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.id = ?
  `).get([id])
);

ipcMain.handle('productos:crear', (_, d) => {
  const r = prepare(`
    INSERT INTO productos (codigo,nombre,descripcion,precio,costo,stock,stock_minimo,unidad,tasa_impuesto,categoria_id,codigo_cabys,emoji)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run([d.codigo||'', d.nombre, d.descripcion||'', d.precio, d.costo||0, d.stock||0, d.stock_minimo||0, d.unidad, d.tasa_impuesto||0, d.categoria_id||null, d.codigo_cabys||'', d.emoji||'']);
  return { id: r.lastInsertRowid, ...d };
});

ipcMain.handle('productos:actualizar', (_, id, d) => {
  prepare(`
    UPDATE productos SET
      codigo=?, nombre=?, descripcion=?, precio=?, costo=?, stock=?, stock_minimo=?,
      unidad=?, tasa_impuesto=?, categoria_id=?, codigo_cabys=?, emoji=?,
      fecha_modificacion=datetime('now','localtime')
    WHERE id=?
  `).run([d.codigo||'', d.nombre, d.descripcion||'', d.precio, d.costo||0, d.stock||0, d.stock_minimo||0, d.unidad, d.tasa_impuesto||0, d.categoria_id||null, d.codigo_cabys||'', d.emoji||'', id]);
  return { id, ...d };
});

ipcMain.handle('productos:crear_lote', (_, lista) => {
  return transaction(() => {
    const resultados = [];
    for (const d of lista) {
      const r = prepare(`
        INSERT INTO productos (codigo,nombre,descripcion,precio,costo,stock,stock_minimo,unidad,tasa_impuesto,categoria_id,codigo_cabys)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run([d.codigo||'', d.nombre, d.descripcion||'', d.precio, d.costo||0, d.stock||0, d.stock_minimo||0, d.unidad||'unidad', d.tasa_impuesto||0, d.categoria_id||null, d.codigo_cabys||'']);
      resultados.push({ id: r.lastInsertRowid, nombre: d.nombre });
    }
    return resultados;
  })();
});

ipcMain.handle('productos:eliminar', (_, id) => {
  prepare('UPDATE productos SET activo = 0 WHERE id = ?').run([id]);
  return { ok: true };
});

ipcMain.handle('productos:ajustar_stock', (_, id, cantidad) => {
  prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run([cantidad, id]);
  return prepare('SELECT stock FROM productos WHERE id = ?').get([id]);
});

// ──────────────────────────────────────────────
// IPC — PROMOCIONES
// ──────────────────────────────────────────────
ipcMain.handle('promociones:listar', () =>
  prepare(`
    SELECT pr.*, p.nombre AS producto_nombre
    FROM promociones pr LEFT JOIN productos p ON pr.producto_id = p.id
    ORDER BY pr.activo DESC, pr.nombre
  `).all()
);

ipcMain.handle('promociones:activas', (_, productoId) => {
  const hoy = new Date().toISOString().slice(0, 10);
  return prepare(`
    SELECT * FROM promociones
    WHERE activo = 1
      AND (producto_id = ? OR producto_id IS NULL)
      AND (fecha_inicio IS NULL OR fecha_inicio <= ?)
      AND (fecha_fin IS NULL OR fecha_fin >= ?)
  `).all([productoId, hoy, hoy]);
});

ipcMain.handle('promociones:crear', (_, d) => {
  const r = prepare(`
    INSERT INTO promociones (nombre,descripcion,tipo,valor,precio_especial,producto_id,fecha_inicio,fecha_fin,activo)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run([d.nombre, d.descripcion||'', d.tipo, d.valor||0, d.precio_especial||0, d.producto_id||null, d.fecha_inicio||null, d.fecha_fin||null, d.activo??1]);
  return { id: r.lastInsertRowid, ...d };
});

ipcMain.handle('promociones:actualizar', (_, id, d) => {
  prepare(`
    UPDATE promociones SET
      nombre=?, descripcion=?, tipo=?, valor=?, precio_especial=?,
      producto_id=?, fecha_inicio=?, fecha_fin=?, activo=?
    WHERE id=?
  `).run([d.nombre, d.descripcion||'', d.tipo, d.valor||0, d.precio_especial||0, d.producto_id||null, d.fecha_inicio||null, d.fecha_fin||null, d.activo??1, id]);
  return { id, ...d };
});

ipcMain.handle('promociones:eliminar', (_, id) => {
  prepare('DELETE FROM promociones WHERE id = ?').run([id]);
  return { ok: true };
});

// ──────────────────────────────────────────────
// IPC — CAJA
// ──────────────────────────────────────────────
ipcMain.handle('caja:actual', () =>
  prepare(`SELECT * FROM cajas WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1`).get() || null
);

ipcMain.handle('caja:historial', () =>
  prepare(`
    SELECT c.*,
      COALESCE(v.num_ventas,   0) AS num_ventas,
      COALESCE(v.total_ventas, 0) AS total_ventas,
      COALESCE(v.efectivo,     0) AS efectivo,
      COALESCE(v.tarjeta,      0) AS tarjeta,
      COALESCE(v.sinpe,        0) AS sinpe
    FROM cajas c
    LEFT JOIN (
      SELECT caja_id,
        COUNT(*) AS num_ventas,
        COALESCE(SUM(total),0) AS total_ventas,
        COALESCE(SUM(
          CASE WHEN (pago_efectivo+pago_tarjeta+pago_sinpe)>0 THEN pago_efectivo
               WHEN metodo_pago='efectivo' THEN total ELSE 0 END
        ),0) AS efectivo,
        COALESCE(SUM(
          CASE WHEN (pago_efectivo+pago_tarjeta+pago_sinpe)>0 THEN pago_tarjeta
               WHEN metodo_pago='tarjeta' THEN total ELSE 0 END
        ),0) AS tarjeta,
        COALESCE(SUM(
          CASE WHEN (pago_efectivo+pago_tarjeta+pago_sinpe)>0 THEN pago_sinpe
               WHEN metodo_pago='sinpe' THEN total ELSE 0 END
        ),0) AS sinpe
      FROM ventas WHERE estado = 'completada'
      GROUP BY caja_id
    ) v ON v.caja_id = c.id
    ORDER BY c.id DESC LIMIT 50
  `).all()
);

ipcMain.handle('caja:abrir', (_, d) => {
  prepare(`UPDATE cajas SET estado='forzado_cierre', fecha_cierre=datetime('now','localtime') WHERE estado='abierta'`).run();
  const r = prepare(
    `INSERT INTO cajas (monto_apertura, notas_apertura, usuario) VALUES (?,?,?)`
  ).run([d.monto_apertura||0, d.notas_apertura||'', d.usuario||'Admin']);

  const cajaId = r.lastInsertRowid;

  if (d.denominaciones?.length) {
    for (const den of d.denominaciones) {
      if (den.cantidad > 0) {
        prepare(
          `INSERT INTO arqueo_detalle (caja_id,tipo,denominacion,tipo_denominacion,cantidad,subtotal) VALUES (?,?,?,?,?,?)`
        ).run([cajaId, 'apertura', den.denominacion, den.tipo, den.cantidad, den.cantidad * den.denominacion]);
      }
    }
  }
  return prepare('SELECT * FROM cajas WHERE id = ?').get([cajaId]);
});

ipcMain.handle('caja:cerrar', (_, id, d) => {
  const tv = prepare(`
    SELECT COALESCE(SUM(total),0) AS total FROM ventas
    WHERE caja_id = ? AND estado = 'completada' AND metodo_pago = 'efectivo'
  `).get([id]);

  const calculado = (d.monto_apertura||0) + (tv?.total||0);
  const diferencia = (d.monto_cierre_real||0) - calculado;

  prepare(`
    UPDATE cajas SET estado='cerrada', fecha_cierre=datetime('now','localtime'),
      monto_cierre_calculado=?, monto_cierre_real=?, diferencia=?, notas_cierre=?
    WHERE id=?
  `).run([calculado, d.monto_cierre_real||0, diferencia, d.notas_cierre||'', id]);

  if (d.denominaciones?.length) {
    prepare('DELETE FROM arqueo_detalle WHERE caja_id = ? AND tipo = ?').run([id, 'cierre']);
    for (const den of d.denominaciones) {
      if (den.cantidad > 0) {
        prepare(
          `INSERT INTO arqueo_detalle (caja_id,tipo,denominacion,tipo_denominacion,cantidad,subtotal) VALUES (?,?,?,?,?,?)`
        ).run([id, 'cierre', den.denominacion, den.tipo, den.cantidad, den.cantidad * den.denominacion]);
      }
    }
  }
  const resultadoCierre = prepare('SELECT * FROM cajas WHERE id = ?').get([id]);
  backupDB();
  return resultadoCierre;
});

// Descuento máximo para la sesión activa (según cajero y rol)
ipcMain.handle('caja:descuentoMax', () => {
  const caja = prepare(`SELECT usuario FROM cajas WHERE estado = 'abierta' LIMIT 1`).get();
  if (!caja) return 100;
  const cajero = prepare(`SELECT rol, desc_max_pct FROM cajeros WHERE nombre = ? AND estado = 'activo'`).get([caja.usuario]);
  if (!cajero) return 100;
  if (cajero.rol === 'administrador') return 100;
  return cajero.desc_max_pct ?? 10;
});

ipcMain.handle('caja:resumen', (_, id) => {
  const caja  = prepare('SELECT * FROM cajas WHERE id = ?').get([id]);
  const ventas = prepare(`
    SELECT COUNT(*) AS num_ventas, COALESCE(SUM(total),0) AS total_ventas,
      COALESCE(SUM(
        CASE WHEN (pago_efectivo+pago_tarjeta+pago_sinpe)>0 THEN pago_efectivo
             WHEN metodo_pago='efectivo' THEN total ELSE 0 END
      ),0) AS efectivo,
      COALESCE(SUM(
        CASE WHEN (pago_efectivo+pago_tarjeta+pago_sinpe)>0 THEN pago_tarjeta
             WHEN metodo_pago='tarjeta' THEN total ELSE 0 END
      ),0) AS tarjeta,
      COALESCE(SUM(
        CASE WHEN (pago_efectivo+pago_tarjeta+pago_sinpe)>0 THEN pago_sinpe
             WHEN metodo_pago='sinpe' THEN total ELSE 0 END
      ),0) AS sinpe
    FROM ventas WHERE caja_id = ? AND estado = 'completada'
  `).get([id]);
  const denominaciones = prepare(
    'SELECT * FROM arqueo_detalle WHERE caja_id = ? ORDER BY tipo, tipo_denominacion DESC, denominacion DESC'
  ).all([id]);
  return { caja, ventas, denominaciones };
});

// ──────────────────────────────────────────────
// IPC — VENTAS
// ──────────────────────────────────────────────
ipcMain.handle('ventas:crear', (_, data) => {
  const crearVenta = transaction((data) => {
    const numero   = generarNumeroVenta();
    const cajaRow  = prepare(`SELECT id, usuario FROM cajas WHERE estado='abierta' LIMIT 1`).get();
    const cajaId   = cajaRow ? cajaRow.id : null;

    const r = prepare(`
      INSERT INTO ventas
        (numero,subtotal,descuento_total,impuesto,total,metodo_pago,monto_recibido,cambio,
         caja_id,cliente_nombre,cliente_cedula,notas,pago_efectivo,pago_tarjeta,pago_sinpe,
         desc_global_pct,desc_global_monto)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run([
      numero, data.subtotal, data.descuento_total||0, data.impuesto||0, data.total,
      data.metodo_pago||'efectivo', data.monto_recibido||0, data.cambio||0,
      cajaId, data.cliente_nombre||'', data.cliente_cedula||'', data.notas||'',
      data.pago_efectivo||0, data.pago_tarjeta||0, data.pago_sinpe||0,
      data.desc_global_pct||0, data.desc_global_monto||0,
    ]);

    const ventaId = r.lastInsertRowid;

    for (const item of (data.items || [])) {
      prepare(`
        INSERT INTO venta_items
          (venta_id,producto_id,nombre,precio_unitario,cantidad,unidad,tasa_impuesto,
           descuento,subtotal,promocion_id,promocion_descripcion,desc_manual_pct,
           cabys_codigo,producto_generico)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run([
        ventaId, item.producto_id || null, item.nombre, item.precio_unitario,
        item.cantidad, item.unidad, item.tasa_impuesto||0,
        item.descuento||0, item.subtotal,
        item.promocion_id||null, item.promocion_descripcion||'',
        item.desc_manual_pct||0,
        item.cabys_codigo||'',
        item.producto_generico ? 1 : 0,
      ]);
      // Solo descontar stock si es producto del inventario
      if (item.producto_id) {
        const stockAnterior = prepare('SELECT stock FROM productos WHERE id = ?').get([item.producto_id])?.stock || 0;
        prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run([item.cantidad, item.producto_id]);
        registrarMovimiento({
          producto_id:    item.producto_id,
          tipo:           'venta',
          cantidad:       -item.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo:    stockAnterior - item.cantidad,
          motivo:         `Venta ${numero}`,
          usuario:        cajaRow?.usuario || '',
        });
      }
    }

    const ventaRow = prepare('SELECT * FROM ventas WHERE id = ?').get([ventaId]);
    ventaRow.items = prepare('SELECT * FROM venta_items WHERE venta_id = ?').all([ventaId]);
    return ventaRow;
  });

  return crearVenta(data);
});

ipcMain.handle('ventas:listar', (_, filtros = {}) => {
  const params = [];
  let where = 'WHERE 1=1';
  if (filtros.desde) { where += ' AND DATE(v.fecha) >= ?'; params.push(filtros.desde); }
  if (filtros.hasta) { where += ' AND DATE(v.fecha) <= ?'; params.push(filtros.hasta); }
  if (filtros.estado)  { where += ' AND v.estado = ?';    params.push(filtros.estado); }
  if (filtros.caja_id) { where += ' AND v.caja_id = ?';  params.push(filtros.caja_id); }

  return prepare(`
    SELECT v.*,
      COUNT(vi.id) AS num_items,
      c.usuario AS cajero,
      GROUP_CONCAT(vi.nombre, ', ') AS productos_texto
    FROM ventas v
    LEFT JOIN venta_items vi ON vi.venta_id = v.id
    LEFT JOIN cajas c ON v.caja_id = c.id
    ${where}
    GROUP BY v.id
    ORDER BY v.fecha DESC
    LIMIT 200
  `).all(params);
});

ipcMain.handle('ventas:obtener', (_, id) => {
  const venta = prepare(`
    SELECT v.*, c.usuario AS cajero
    FROM ventas v
    LEFT JOIN cajas c ON v.caja_id = c.id
    WHERE v.id = ?
  `).get([id]);
  if (!venta) return null;
  venta.items = prepare('SELECT * FROM venta_items WHERE venta_id = ?').all([id]);
  return venta;
});

ipcMain.handle('ventas:cajeros', () =>
  prepare(`
    SELECT DISTINCT c.usuario FROM ventas v
    JOIN cajas c ON v.caja_id = c.id
    WHERE c.usuario IS NOT NULL AND c.usuario != ''
    ORDER BY c.usuario
  `).all().map(r => r.usuario)
);

ipcMain.handle('ventas:devolver_item', (_, ventaId, itemId) => {
  return transaction(() => {
    const item = prepare('SELECT * FROM venta_items WHERE id = ? AND venta_id = ?').get([itemId, ventaId]);
    if (!item) return { ok: false, error: 'Artículo no encontrado' };

    if (item.producto_id) {
      const stockAnterior = prepare('SELECT stock FROM productos WHERE id = ?').get([item.producto_id])?.stock || 0;
      prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run([item.cantidad, item.producto_id]);
      const ventaInfo = prepare('SELECT numero FROM ventas WHERE id = ?').get([ventaId]);
      registrarMovimiento({
        producto_id:    item.producto_id,
        tipo:           'anulacion',
        cantidad:       item.cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo:    stockAnterior + item.cantidad,
        motivo:         `Devolución ítem venta ${ventaInfo?.numero || ventaId}`,
        usuario:        '',
      });
    }

    prepare(`UPDATE ventas SET
      total   = MAX(0, total   - ?),
      subtotal = MAX(0, subtotal - ?)
      WHERE id = ?`
    ).run([item.subtotal, item.subtotal, ventaId]);

    const v = prepare('SELECT notas FROM ventas WHERE id = ?').get([ventaId]);
    const nota = ((v?.notas || '') + `\n[DEV] ${item.nombre} x${item.cantidad}`).trim();
    prepare('UPDATE ventas SET notas = ? WHERE id = ?').run([nota, ventaId]);

    return { ok: true };
  })();
});

ipcMain.handle('ventas:anular', (_, id, data = {}) => {
  const venta = prepare('SELECT * FROM ventas WHERE id = ?').get([id]);
  if (!venta || venta.estado !== 'completada') return { ok: false };
  const ahora = new Date().toISOString();
  transaction(() => {
    const items = prepare('SELECT * FROM venta_items WHERE venta_id = ?').all([id]);
    for (const item of items) {
      const stockAnterior = item.producto_id
        ? (prepare('SELECT stock FROM productos WHERE id = ?').get([item.producto_id])?.stock || 0)
        : 0;
      prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run([item.cantidad, item.producto_id]);
      if (item.producto_id) {
        registrarMovimiento({
          producto_id:    item.producto_id,
          tipo:           'anulacion',
          cantidad:       item.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo:    stockAnterior + item.cantidad,
          motivo:         `Anulación venta ${venta.numero}`,
          usuario:        data.cajeroNombre || 'Administrador',
        });
      }
    }
    prepare(`UPDATE ventas SET estado='anulada', anulado_por=?, anulado_fecha=?, anulado_motivo=? WHERE id=?`)
      .run([data.cajeroNombre || 'Administrador', ahora, data.motivo || '', id]);
  })();
  return { ok: true };
});

// ──────────────────────────────────────────────
// IPC — REPORTES
// ──────────────────────────────────────────────
ipcMain.handle('reportes:resumen', (_, desde, hasta) => {
  const stats = prepare(`
    SELECT COUNT(*) AS total_transacciones,
      COALESCE(SUM(total),0) AS total_ventas,
      COALESCE(AVG(total),0) AS ticket_promedio,
      COALESCE(SUM(descuento_total),0) AS total_descuentos,
      COALESCE(SUM(impuesto),0) AS total_impuesto
    FROM ventas
    WHERE estado = 'completada' AND DATE(fecha) >= ? AND DATE(fecha) <= ?
  `).get([desde, hasta]);

  const porDia = prepare(`
    SELECT DATE(fecha) AS dia, COUNT(*) AS transacciones, COALESCE(SUM(total),0) AS total
    FROM ventas
    WHERE estado = 'completada' AND DATE(fecha) >= ? AND DATE(fecha) <= ?
    GROUP BY DATE(fecha) ORDER BY dia
  `).all([desde, hasta]);

  const porMetodo = prepare(`
    SELECT metodo_pago, COUNT(*) AS transacciones, COALESCE(SUM(total),0) AS total
    FROM ventas
    WHERE estado = 'completada' AND DATE(fecha) >= ? AND DATE(fecha) <= ?
    GROUP BY metodo_pago
  `).all([desde, hasta]);

  return { stats, porDia, porMetodo };
});

ipcMain.handle('reportes:top_productos', (_, desde, hasta, limite = 15) =>
  prepare(`
    SELECT vi.producto_id, vi.nombre,
      SUM(vi.cantidad) AS cantidad_total, SUM(vi.subtotal) AS revenue_total,
      COUNT(DISTINCT vi.venta_id) AS num_ventas
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    WHERE v.estado = 'completada' AND DATE(v.fecha) >= ? AND DATE(v.fecha) <= ?
    GROUP BY vi.producto_id, vi.nombre
    ORDER BY revenue_total DESC LIMIT ?
  `).all([desde, hasta, limite])
);

ipcMain.handle('reportes:stock_bajo', () =>
  prepare(`SELECT * FROM productos WHERE activo = 1 AND stock <= stock_minimo ORDER BY (stock - stock_minimo) ASC`).all()
);

// ──────────────────────────────────────────────
// IPC — CONFIGURACIÓN
// ──────────────────────────────────────────────
ipcMain.handle('config:obtener_todo', () => {
  const rows = prepare('SELECT clave, valor FROM configuracion').all();
  return Object.fromEntries(rows.map(r => [r.clave, r.valor]));
});

ipcMain.handle('config:obtener', (_, clave) => {
  const r = prepare('SELECT valor FROM configuracion WHERE clave = ?').get([clave]);
  return r ? r.valor : null;
});

ipcMain.handle('config:guardar', (_, datos) => {
  for (const [k, v] of Object.entries(datos)) {
    db.run('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)', [k, String(v)]);
  }
  saveDB();
  return { ok: true };
});

// ──────────────────────────────────────────────
// IPC — FACTURACIÓN
// ──────────────────────────────────────────────
ipcMain.handle('facturas:listar', () =>
  prepare(`
    SELECT fe.*, v.numero AS venta_numero, v.total AS venta_total, v.fecha AS venta_fecha
    FROM facturas_electronicas fe
    JOIN ventas v ON fe.venta_id = v.id
    ORDER BY fe.fecha_creacion DESC LIMIT 100
  `).all()
);

ipcMain.handle('facturas:crear', (_, ventaId) => {
  const venta = prepare('SELECT * FROM ventas WHERE id = ?').get([ventaId]);
  if (!venta) return { error: 'Venta no encontrada' };
  const existe = prepare('SELECT id FROM facturas_electronicas WHERE venta_id = ?').get([ventaId]);
  if (existe) return { error: 'Ya existe una factura para esta venta' };

  const cfgRows = prepare('SELECT clave, valor FROM configuracion').all();
  const config  = Object.fromEntries(cfgRows.map(r => [r.clave, r.valor]));

  const numCfg  = prepare(`SELECT valor FROM configuracion WHERE clave = 'siguiente_numero'`).get();
  const num     = parseInt(numCfg?.valor || '2', 10) - 1;
  const consec  = `00100001010${String(num).padStart(10,'0')}`;

  const now = new Date();
  const dd  = String(now.getDate()).padStart(2,'0');
  const mm  = String(now.getMonth()+1).padStart(2,'0');
  const aa  = String(now.getFullYear()).slice(-2);
  const ced = (config.empresa_cedula||'000000000').padStart(12,'0');
  const seg = Math.floor(Math.random()*99999999).toString().padStart(8,'0');
  const clave = `506${dd}${mm}${aa}${ced}00001000010${consec.slice(-10)}1${seg}`;

  const r = prepare(
    `INSERT INTO facturas_electronicas (venta_id,clave,numero_consecutivo,estado) VALUES (?,?,?,'pendiente')`
  ).run([ventaId, clave, consec]);

  return prepare('SELECT * FROM facturas_electronicas WHERE id = ?').get([r.lastInsertRowid]);
});

ipcMain.handle('facturas:obtener', (_, id) => {
  const f = prepare('SELECT * FROM facturas_electronicas WHERE id = ?').get([id]);
  if (!f) return null;
  f.venta = prepare('SELECT * FROM ventas WHERE id = ?').get([f.venta_id]);
  if (f.venta) {
    f.venta.items = prepare('SELECT * FROM venta_items WHERE venta_id = ?').all([f.venta_id]);
  }
  return f;
});

ipcMain.handle('facturas:actualizar_estado', (_, id, estado, mensaje) => {
  prepare(`
    UPDATE facturas_electronicas SET estado=?, mensaje_hacienda=?, fecha_respuesta=datetime('now','localtime')
    WHERE id=?
  `).run([estado, mensaje||'', id]);
  return { ok: true };
});

ipcMain.handle('app:abrir_datos', () => {
  shell.openPath(app.getPath('userData'));
});

// ──────────────────────────────────────────────
// IPC — BACKUPS
// ──────────────────────────────────────────────

ipcMain.handle('backup:ejecutar', () => backupDB());

ipcMain.handle('backup:listar', () => {
  const dir = backupDir();
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter(f => f.startsWith('backup_pos_aramo_') && f.endsWith('.db'))
      .sort().reverse()
      .map(nombre => {
        const stat = fs.statSync(path.join(dir, nombre));
        return { nombre, tamano: stat.size };
      });
  } catch(e) { return []; }
});

ipcMain.handle('backup:seleccionar_carpeta', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta para respaldo en la nube',
    buttonLabel: 'Usar esta carpeta',
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('backup:restaurar', (_, nombre, pin) => {
  const admins = prepare(
    `SELECT pin_hash, pin_salt FROM cajeros WHERE rol = 'administrador' AND estado = 'activo'`
  ).all();
  let autorizado = false;
  for (const a of admins) {
    if (pinHash(pin, a.pin_salt) === a.pin_hash) { autorizado = true; break; }
  }
  if (!autorizado) return { ok: false, error: 'PIN de administrador incorrecto.' };

  const origen = path.join(backupDir(), nombre);
  if (!fs.existsSync(origen)) return { ok: false, error: 'El archivo de respaldo no existe.' };

  try {
    saveDB();
    fs.copyFileSync(origen, dbFilePath);
    app.relaunch();
    app.exit(0);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ──────────────────────────────────────────────
// IPC — INVENTARIO (KARDEX)
// ──────────────────────────────────────────────
ipcMain.handle('inventario:movimientos', (_, filtros = {}) => {
  const params = [];
  let where = 'WHERE 1=1';
  if (filtros.producto_id) { where += ' AND m.producto_id = ?'; params.push(filtros.producto_id); }
  if (filtros.tipo)        { where += ' AND m.tipo = ?';        params.push(filtros.tipo); }
  if (filtros.desde)       { where += ' AND DATE(m.fecha) >= ?'; params.push(filtros.desde); }
  if (filtros.hasta)       { where += ' AND DATE(m.fecha) <= ?'; params.push(filtros.hasta); }
  return prepare(`
    SELECT m.*, p.nombre AS producto_nombre, p.unidad AS producto_unidad
    FROM movimientos_inventario m
    LEFT JOIN productos p ON m.producto_id = p.id
    ${where}
    ORDER BY m.fecha DESC, m.id DESC
    LIMIT 500
  `).all(params);
});

ipcMain.handle('inventario:ajustar', (_, data) => {
  const admins = prepare(
    `SELECT pin_hash, pin_salt, nombre FROM cajeros WHERE rol = 'administrador' AND estado = 'activo'`
  ).all();
  let adminNombre = null;
  for (const a of admins) {
    const hash = crypto.createHash('sha256').update(String(data.pin) + a.pin_salt).digest('hex');
    if (hash === a.pin_hash) { adminNombre = a.nombre; break; }
  }
  if (!adminNombre) return { ok: false, error: 'PIN de administrador incorrecto.' };

  const prod = prepare('SELECT stock FROM productos WHERE id = ?').get([data.producto_id]);
  if (!prod) return { ok: false, error: 'Producto no encontrado.' };

  const stockAnterior = prod.stock;
  const stockNuevo    = parseFloat(data.stock_nuevo);
  const diferencia    = stockNuevo - stockAnterior;

  return transaction(() => {
    prepare(`UPDATE productos SET stock = ?, fecha_modificacion = datetime('now','localtime') WHERE id = ?`)
      .run([stockNuevo, data.producto_id]);
    registrarMovimiento({
      producto_id:    data.producto_id,
      tipo:           'ajuste',
      cantidad:       diferencia,
      stock_anterior: stockAnterior,
      stock_nuevo:    stockNuevo,
      motivo:         data.motivo || '',
      usuario:        adminNombre,
    });
    return { ok: true, stock_anterior: stockAnterior, stock_nuevo: stockNuevo, diferencia };
  })();
});

ipcMain.handle('inventario:entrada', (_, data) => {
  return transaction(() => {
    const resultados = [];
    for (const item of (data.items || [])) {
      const prod = prepare('SELECT stock FROM productos WHERE id = ?').get([item.producto_id]);
      if (!prod) continue;
      const stockAnterior = prod.stock;
      const stockNuevo    = stockAnterior + item.cantidad;
      prepare(`UPDATE productos SET stock = stock + ?, fecha_modificacion = datetime('now','localtime') WHERE id = ?`)
        .run([item.cantidad, item.producto_id]);
      if (item.costo_unitario > 0) {
        prepare('UPDATE productos SET costo = ? WHERE id = ?').run([item.costo_unitario, item.producto_id]);
      }
      const motivo = data.proveedor ? `Compra - ${data.proveedor}` : 'Entrada de mercadería';
      registrarMovimiento({
        producto_id:    item.producto_id,
        tipo:           'entrada',
        cantidad:       item.cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo:    stockNuevo,
        motivo,
        costo_unitario: item.costo_unitario || 0,
        usuario:        data.usuario || '',
      });
      resultados.push({ producto_id: item.producto_id, stock_anterior: stockAnterior, stock_nuevo: stockNuevo });
    }
    return { ok: true, resultados };
  })();
});

// ──────────────────────────────────────────────
// IPC — CAJEROS
// ──────────────────────────────────────────────
function pinHash(pin, salt) {
  return crypto.createHash('sha256').update(String(pin) + salt).digest('hex');
}

function defaultPermisos(rol) {
  const a = rol === 'administrador';
  return {
    ver_inventario:          a,
    ver_cajeros:             a,
    ver_promociones:         a,
    ver_reportes:            a,
    ver_facturacion:         a,
    ver_configuracion:       a,
    ver_costos_ganancias:    a,
    editar_precios_carrito:  a,
    ver_ventas_todos_turnos: a,
    anular_ventas:           a,
    ajustar_inventario:      a,
  };
}

function parsePermisos(str, rol) {
  const defaults = defaultPermisos(rol);
  let stored;
  try { stored = JSON.parse(str || '{}'); } catch(e) { stored = {}; }
  return { ...defaults, ...stored };
}

// Cajeros activos — para AperturaModal (sin hash)
ipcMain.handle('cajeros:listar', () =>
  prepare(`SELECT id, nombre, cedula, rol, estado, color, desc_max_pct, permisos
           FROM cajeros WHERE estado = 'activo' ORDER BY rol DESC, nombre`).all()
    .map(r => ({ ...r, permisos: parsePermisos(r.permisos, r.rol) }))
);

// Todos los cajeros — para gestión (sin hash)
ipcMain.handle('cajeros:todos', () =>
  prepare(`SELECT id, nombre, cedula, rol, estado, color, desc_max_pct, created_at, permisos
           FROM cajeros ORDER BY rol DESC, nombre`).all()
    .map(r => ({ ...r, permisos: parsePermisos(r.permisos, r.rol) }))
);

ipcMain.handle('cajeros:crear', (_, d) => {
  const salt     = crypto.randomBytes(16).toString('hex');
  const hash     = pinHash(d.pin, salt);
  const maxPct   = d.rol === 'administrador' ? 100 : (d.desc_max_pct ?? 10);
  const permisos = JSON.stringify(defaultPermisos(d.rol || 'cajero'));
  const r = prepare(`INSERT INTO cajeros (nombre, cedula, pin_hash, pin_salt, rol, estado, color, desc_max_pct, permisos)
                     VALUES (?,?,?,?,?,?,?,?,?)`)
    .run([d.nombre, d.cedula||'', hash, salt, d.rol||'cajero', d.estado||'activo', d.color||'#1565C0', maxPct, permisos]);
  return { id: r.lastInsertRowid, nombre: d.nombre, rol: d.rol||'cajero' };
});

ipcMain.handle('cajeros:actualizar', (_, id, d) => {
  const maxPct = d.rol === 'administrador' ? 100 : (d.desc_max_pct ?? 10);
  if (d.pin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = pinHash(d.pin, salt);
    prepare(`UPDATE cajeros SET nombre=?, cedula=?, pin_hash=?, pin_salt=?, rol=?, estado=?, color=?, desc_max_pct=? WHERE id=?`)
      .run([d.nombre, d.cedula||'', hash, salt, d.rol||'cajero', d.estado||'activo', d.color||'#1565C0', maxPct, id]);
  } else {
    prepare(`UPDATE cajeros SET nombre=?, cedula=?, rol=?, estado=?, color=?, desc_max_pct=? WHERE id=?`)
      .run([d.nombre, d.cedula||'', d.rol||'cajero', d.estado||'activo', d.color||'#1565C0', maxPct, id]);
  }
  return { ok: true };
});

ipcMain.handle('cajeros:eliminar', (_, id) => {
  // Desactiva si tiene historial de turnos, elimina si no
  const enUso = prepare(`SELECT COUNT(*) AS n FROM cajas
                          WHERE usuario IN (SELECT nombre FROM cajeros WHERE id = ?)`).get([id]);
  if (enUso && enUso.n > 0) {
    prepare(`UPDATE cajeros SET estado = 'inactivo' WHERE id = ?`).run([id]);
    return { ok: true, accion: 'desactivado' };
  }
  prepare('DELETE FROM cajeros WHERE id = ?').run([id]);
  return { ok: true, accion: 'eliminado' };
});

// Verificar PIN de un cajero específico
ipcMain.handle('cajeros:verificarPin', (_, id, pin) => {
  const c = prepare('SELECT pin_hash, pin_salt FROM cajeros WHERE id = ? AND estado = ?').get([id, 'activo']);
  if (!c) return false;
  return pinHash(pin, c.pin_salt) === c.pin_hash;
});

// Buscar cajero activo por nombre
ipcMain.handle('cajeros:porNombre', (_, nombre) => {
  const row = prepare(`SELECT id, nombre, rol, desc_max_pct, permisos
                       FROM cajeros WHERE nombre = ? AND estado = 'activo' LIMIT 1`).get([nombre]);
  if (!row) return null;
  return { ...row, permisos: parsePermisos(row.permisos, row.rol) };
});

// Verificar PIN de cualquier administrador activo
ipcMain.handle('cajeros:verificarAdmin', (_, pin) => {
  const admins = prepare(`SELECT id, nombre, pin_hash, pin_salt FROM cajeros
                           WHERE rol = 'administrador' AND estado = 'activo'`).all();
  for (const a of admins) {
    if (pinHash(pin, a.pin_salt) === a.pin_hash) {
      return { ok: true, id: a.id, nombre: a.nombre };
    }
  }
  return { ok: false };
});

// Guardar permisos individuales — requiere PIN de administrador
ipcMain.handle('cajeros:guardarPermisos', (_, id, permisos, pin) => {
  const admins = prepare(`SELECT id, pin_hash, pin_salt FROM cajeros
                           WHERE rol = 'administrador' AND estado = 'activo'`).all();
  let authOk = false;
  for (const a of admins) {
    if (pinHash(pin, a.pin_salt) === a.pin_hash) { authOk = true; break; }
  }
  if (!authOk) return { ok: false, error: 'PIN de administrador incorrecto' };

  // Proteger acceso administrativo si este cajero es el único administrador activo
  const cajero = prepare(`SELECT rol FROM cajeros WHERE id = ?`).get([id]);
  if (cajero?.rol === 'administrador') {
    const totalAdmins = prepare(`SELECT COUNT(*) AS n FROM cajeros
                                 WHERE rol='administrador' AND estado='activo'`).get();
    if (totalAdmins.n <= 1) {
      permisos = { ...permisos, ver_cajeros: true, ver_configuracion: true };
    }
  }

  prepare(`UPDATE cajeros SET permisos = ? WHERE id = ?`).run([JSON.stringify(permisos), id]);
  return { ok: true, permisos };
});

// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// IPC — CABYS (API Hacienda CR, llamada desde main para evitar CORS)
// ──────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ARAMO-POS/1.0' } }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('Respuesta inválida de la API CABYS')); }
      });
    }).on('error', reject);
  });
}

ipcMain.handle('cabys:buscar', async (_, termino) => {
  if (!termino || String(termino).trim().length < 2) return [];
  const q   = encodeURIComponent(String(termino).trim());
  const url = `https://api.hacienda.go.cr/fe/cabys?q=${q}&top=10`;
  const data = await httpsGet(url);
  const items = Array.isArray(data) ? data : (data.cabys || data.data || []);
  return items.map(item => ({
    codigo:      item.codigo      || '',
    descripcion: item.descripcion || '',
    impuesto:    typeof item.impuesto === 'object' && item.impuesto !== null
                   ? (item.impuesto.tarifa ?? item.impuesto.tasa ?? 0)
                   : (item.impuesto ?? 0),
  }));
});

// IPC — TIQUETE TÉRMICO
// ──────────────────────────────────────────────
ipcMain.handle('tiquete:imprimir', async (_, html) => {
  const win = new BrowserWindow({
    show: false,
    width: 320,
    height: 600,
    webPreferences: { contextIsolation: true },
  });

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  return new Promise((resolve) => {
    win.webContents.print(
      { silent: false, printBackground: true },
      (success, reason) => {
        win.destroy();
        resolve({ ok: success, reason: reason || '' });
      }
    );
  });
});

ipcMain.handle('tiquete:guardar', (_, texto, numero) => {
  const dir = path.join(app.getPath('userData'), 'tiquetes');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const nombre  = (numero || 'tiquete').replace(/[:/\\?*|"<>]/g, '-') + '.txt';
  const archivo = path.join(dir, nombre);
  fs.writeFileSync(archivo, texto, 'utf-8');
  return { ok: true, archivo };
});

  return {
    initDB,
    exportar: () => db.export(),
    prepare,
    pinHash,
  };
};
