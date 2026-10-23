// ARAMO · Compilar: arma la versión rápida para publicar.
// Copia la app a una carpeta nueva con el JavaScript, el CSS y el HTML comprimidos (sin
// espacios, comentarios ni nombres largos internos). Lo que hace la app no cambia.
// Los nombres compartidos entre archivos (funciones y variables de arriba de cada archivo) se
// conservan. No se publican los archivos internos (.sql, .md, abrir-local, este archivo).
//
// Uso:  npm install --no-save esbuild@0.25.0 html-minifier-terser@7.2.0
//       node compilar.mjs [origen=.] [destino=dist]
// GitHub lo corre solo en cada publicación (.github/workflows/publicar.yml).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';
import { minify } from 'html-minifier-terser';

const ORIGEN = path.resolve(process.argv[2] || '.');
const DESTINO = path.resolve(process.argv[3] || 'dist');
// Lo que no se publica: archivos ocultos, internos y herramientas.
const FUERA = [/^\./, /^dist$/, /^node_modules$/, /\.sql$/i, /\.md$/i, /^abrir-local\./i, /^compilar\.mjs$/, /^package(-lock)?\.json$/, /^ARAMO PEDIDOS DESDE LA CASA$/];
// Ya vienen comprimidos (el POS sale armado de su propio proyecto).
const YA_LISTO = [/[\\/]pos[\\/]assets[\\/]/, /\.min\.(js|css)$/, /[\\/]pos[\\/]sql[\\/]/];

const HTML = {
  collapseWhitespace: true, conservativeCollapse: true, removeComments: true,
  minifyCSS: true, minifyJS: { compress: true, mangle: true }, keepClosingSlash: true,
  // El service worker busca src="…" y href="…" con comillas: no se quitan.
  removeAttributeQuotes: false, quoteCharacter: '"',
};

let antes = 0, despues = 0;
const filas = [];
const comprimir = async (texto, tipo) => (await esbuild.transform(texto, { loader: tipo, minify: true, legalComments: 'none', charset: 'utf8' })).code;
const huella = texto => createHash('sha1').update(texto).digest('hex').slice(0, 8);
// El código y los estilos grandes que vienen DENTRO de una página salen a archivos aparte (con
// su huella en el nombre). Así el navegador los guarda ya traducidos y la página se lee mucho
// más rápido. Se ejecutan en el mismo orden y en el mismo lugar que antes.
async function sacarDePagina(html, rel) {
  const base = path.basename(rel, '.html'), dir = path.dirname(rel);
  let n = 0;
  const partes = [];
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (todo, codigo) => {
    if (codigo.length < 4000) return todo;
    partes.push({ tipo: 'js', codigo, n: ++n });
    return `<script src="@@parte${n}@@"></script>`;
  });
  html = html.replace(/<style>([\s\S]*?)<\/style>/g, (todo, codigo) => {
    if (codigo.length < 4000) return todo;
    partes.push({ tipo: 'css', codigo, n: ++n });
    return `<link rel="stylesheet" href="@@parte${n}@@">`;
  });
  for (const p of partes) {
    const salida = await comprimir(p.codigo, p.tipo);
    const nombre = `${base}.parte${p.n}.${huella(salida)}.${p.tipo}`;
    await fs.writeFile(path.join(DESTINO, dir, nombre), salida);
    html = html.replace(`@@parte${p.n}@@`, nombre);
  }
  return html;
}
async function procesar(rel) {
  const de = path.join(ORIGEN, rel), a = path.join(DESTINO, rel);
  await fs.mkdir(path.dirname(a), { recursive: true });
  const ext = path.extname(rel).toLowerCase();
  const listo = YA_LISTO.some(r => r.test(de));
  if (!listo && (ext === '.js' || ext === '.css' || ext === '.html')) {
    const texto = await fs.readFile(de, 'utf8');
    let salida;
    if (ext === '.html') salida = await minify(versiones(await sacarDePagina(texto, rel), rel), HTML);
    else salida = await comprimir(texto, ext.slice(1));
    await fs.writeFile(a, salida);
    huellas.set(posix(rel), huella(salida));
    const b0 = Buffer.byteLength(texto), b1 = Buffer.byteLength(salida);
    antes += b0; despues += b1; filas.push([rel, b0, b1]);
  } else {
    await fs.copyFile(de, a);
    if (ext === '.js' || ext === '.css') huellas.set(posix(rel), huella(await fs.readFile(de)));
  }
}
// Cada página pide sus .js y .css con ?v=<huella del contenido>: si un archivo cambia, el
// navegador baja el nuevo; si no, usa el guardado. Nadie tiene que acordarse de cambiar ?v=.
const huellas = new Map();
const posix = r => r.split(path.sep).join('/');
function versiones(html, rel) {
  const dir = path.posix.dirname(posix(rel));
  return html.replace(/(src|href)="([^":?#]+\.(?:js|css))(?:\?v=[^"]*)?"/g, (todo, attr, ruta) => {
    const destino = path.posix.normalize(path.posix.join(dir, ruta));
    if (YA_LISTO.some(r => r.test('/' + destino))) return todo; // ya traen su huella en el nombre
    const h = huellas.get(destino);
    return h ? `${attr}="${ruta}?v=${h}"` : todo;
  });
}
async function recorrer(dir = '', lista = []) {
  for (const e of await fs.readdir(path.join(ORIGEN, dir), { withFileTypes: true })) {
    if (FUERA.some(r => r.test(e.name))) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) await recorrer(rel, lista);
    else lista.push(rel);
  }
  return lista;
}

await fs.rm(DESTINO, { recursive: true, force: true });
const todos = await recorrer();
// Primero todo lo que no es página (para conocer sus huellas) y después las páginas.
for (const rel of todos.filter(r => !r.endsWith('.html'))) await procesar(rel);
for (const rel of todos.filter(r => r.endsWith('.html'))) await procesar(rel);
const kb = n => (n / 1024).toFixed(0).padStart(5) + ' KB';
filas.sort((x, y) => y[1] - x[1]).slice(0, 12).forEach(([r, b0, b1]) => console.log(kb(b0), '→', kb(b1), ' ', r));
console.log(`Total código: ${kb(antes)} → ${kb(despues)} (${Math.round((1 - despues / antes) * 100)}% menos)`);
