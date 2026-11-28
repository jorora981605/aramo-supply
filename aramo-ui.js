// aramo-ui.js — ARAMO · ventanitas propias (reemplazan confirm/prompt/alert) y un solo sistema de avisos.
// Global, sin dependencias. Va después de iconos.js. Estilos en aramo-ui.css (.ui-hoja, .ui-aviso…).
//
//   AramoUI.confirmar({titulo, texto, si:'Sí, borrar', no:'Cancelar', peligro:false, mantener:false}) → Promise<boolean>
//   AramoUI.pedir({titulo, texto, etiqueta, valor:'', tipo:'text'|'decimal'|'tel', si:'Listo', validar})  → Promise<string|null>
//   AramoUI.elegir({titulo, texto, opciones:[{v, t, sub, icono, peligro}], cancelar:true})                → Promise<v|null>
//   AramoUI.aviso(texto, {tipo:'ok'|'error'|'info', deshacer:fn, ms:5000})                                → {cerrar()}
//        más: {id, icono:false, arriba:true, textoDeshacer} para los avisos viejos que pasan por aquí
//   AramoUI.temaReal('auto'|'light'|'dark') → 'light'|'dark'   ·   AramoUI.alCambiarSistema(fn)
//
// No toca el historial del navegador (el Mostrador usa #encargo= / #ver= y el Taller su propio pushState).
(function(){
  'use strict';
  const ico = (n, t) => (typeof window.icono === 'function' ? window.icono(n, { t: t || 20 }) : '');
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  let serie = 0;
  const abiertas = [];           // pila de hojas abiertas (la última es la de arriba)

  /* ---------- Hoja genérica ---------- */
  // o: {titulo, sub, clase, panel, alCerrar(valor), cerrable:true, foco:'titulo'}
  // foco:'titulo' = no saltar al primer campo (en el teléfono eso abre el teclado encima de la hoja).
  // Devuelve {hoja, cuerpo, pie, cerrar(valor)}; el pie se crea solo si se usa.
  function hoja(o){
    o = o || {};
    const id = 'uiHoja' + (++serie);
    const antes = document.activeElement;
    const velo = el('div', 'ui-velo' + (o.panel ? ' ui-velo--panel' : ''));
    const h = el('div', 'ui-hoja' + (o.panel ? ' ui-hoja--panel' : '') + (o.clase ? ' ' + o.clase : ''));
    h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true'); h.setAttribute('aria-labelledby', id + 't');
    const cab = el('header', 'ui-hoja-cab');
    const tit = el('h2', 'ui-hoja-tit', o.titulo || ''); tit.id = id + 't'; tit.tabIndex = -1;
    if (o.sub) tit.appendChild(el('small', 'ui-hoja-sub', o.sub));
    cab.appendChild(tit);
    const cerrable = o.cerrable !== false;
    if (cerrable){
      const x = el('button', 'ui-btn-ico'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); x.title = 'Cerrar'; x.innerHTML = ico('cerrar', 22);
      x.addEventListener('click', () => cerrar(null)); cab.appendChild(x);
    }
    const cuerpo = el('div', 'ui-hoja-cuerpo');
    h.appendChild(cab); h.appendChild(cuerpo);
    let pie = null, cerrada = false;
    const api = {
      hoja: h, cuerpo, cerrar,
      get pie(){ if (!pie){ pie = el('footer', 'ui-pie'); h.appendChild(pie); } return pie; },
      enfocar(){ const c = o.foco === 'titulo' ? null : h.querySelector('[data-ui-foco],input:not([type=hidden]),textarea,select'); (c || tit).focus({ preventScroll: true }); if (c && c.select && o.seleccionar !== false) try { c.select(); } catch (e) {} },
    };
    function cerrar(valor){
      if (cerrada) return; cerrada = true;
      const i = abiertas.indexOf(api); if (i >= 0) abiertas.splice(i, 1);
      if (!abiertas.length) document.documentElement.classList.remove('ui-hoja-abierta');
      if (!abiertas.some(a => a.panel)) document.documentElement.classList.remove('ui-panel-abierto');
      velo.classList.remove('open'); h.classList.remove('open');
      setTimeout(() => { velo.remove(); h.remove(); ubicarAviso(); }, 360);
      if (antes && antes.focus && document.contains(antes)) try { antes.focus({ preventScroll: true }); } catch (e) {}
      if (o.alCerrar) o.alCerrar(valor === undefined ? null : valor);
    }
    if (cerrable) velo.addEventListener('click', () => cerrar(null));
    // El foco no se sale de la hoja
    h.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = [...h.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(n => !n.disabled && n.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === tit)){ e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); }
    });
    api.cerrable = cerrable; api.panel = !!o.panel;
    if (o.panel) document.documentElement.classList.add('ui-panel-abierto');   // la página puede correrse para que el panel no tape la lista
    document.body.appendChild(velo); document.body.appendChild(h);
    abiertas.push(api);
    document.documentElement.classList.add('ui-hoja-abierta');
    // Dos cuadros: que el navegador pinte el estado cerrado antes de animar
    requestAnimationFrame(() => requestAnimationFrame(() => { velo.classList.add('open'); h.classList.add('open'); api.enfocar(); }));
    setTimeout(ubicarAviso, 380);   // si había un aviso a la vista, que suba y no tape los botones de la hoja
    return api;
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !abiertas.length) return;
    const a = abiertas[abiertas.length - 1];
    if (a.cerrable){ e.preventDefault(); e.stopPropagation(); a.cerrar(null); }
  }, true);

  const boton = (txt, variante, extra) => { const b = el('button', 'ui-btn ui-btn--' + variante + (extra ? ' ' + extra : ''), txt); b.type = 'button'; return b; };

  /* ---------- Confirmar ---------- */
  function confirmar(o){
    o = o || {};
    return new Promise(res => {
      const h = hoja({ titulo: o.titulo || '¿Seguro?', clase: 'ui-hoja--dialogo', alCerrar: v => res(v === true) });
      if (o.texto) h.cuerpo.appendChild(el('p', 'ui-hoja-texto', o.texto));
      const no = boton(o.no || 'Cancelar', 'secundario', 'ui-btn--l');
      const si = boton(o.si || (o.peligro ? 'Sí, borrar' : 'Sí'), o.peligro ? 'peligro' : 'primario', 'ui-btn--l ui-crece');
      no.addEventListener('click', () => h.cerrar(false));
      if (o.mantener){
        // Borrados masivos: hay que mantener apretado 1,2 s
        const MS = 1200; let t = 0;
        si.classList.add('ui-btn--mantener'); si.style.setProperty('--ui-mantener', MS + 'ms');
        const empezar = () => { if (t) return; si.classList.add('apretando'); t = setTimeout(() => { t = 0; try { navigator.vibrate && navigator.vibrate(15); } catch (e) {} h.cerrar(true); }, MS); };
        const soltar = () => { if (!t) return; clearTimeout(t); t = 0; si.classList.remove('apretando'); };
        si.addEventListener('pointerdown', e => { if (e.button) return; empezar(); });
        ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => si.addEventListener(ev, soltar));
        si.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat){ e.preventDefault(); empezar(); } });
        si.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') soltar(); });
        si.addEventListener('contextmenu', e => e.preventDefault());
        h.cuerpo.appendChild(el('p', 'ui-mantener-ayuda', 'Mantené apretado el botón rojo para confirmar.'));
      } else {
        si.addEventListener('click', () => h.cerrar(true));
      }
      h.pie.appendChild(no); h.pie.appendChild(si);
      no.setAttribute('data-ui-foco', '');     // el foco empieza en lo seguro
    });
  }

  /* ---------- Pedir un dato ---------- */
  function pedir(o){
    o = o || {};
    return new Promise(res => {
      const h = hoja({ titulo: o.titulo || '', clase: 'ui-hoja--dialogo', alCerrar: v => res(typeof v === 'string' ? v : null) });
      if (o.texto) h.cuerpo.appendChild(el('p', 'ui-hoja-texto', o.texto));
      const campo = el('label', 'ui-campo');
      if (o.etiqueta) campo.appendChild(el('span', 'ui-campo-et', o.etiqueta));
      const inp = el(o.largo ? 'textarea' : 'input', 'ui-campo-in');
      if (!o.largo) inp.type = o.tipo === 'tel' ? 'tel' : 'text';
      inp.inputMode = o.tipo === 'decimal' ? 'decimal' : o.tipo === 'tel' ? 'tel' : 'text';
      inp.autocomplete = 'off'; inp.value = o.valor == null ? '' : String(o.valor);
      if (o.ejemplo) inp.placeholder = o.ejemplo;
      if (!o.etiqueta) inp.setAttribute('aria-label', o.titulo || 'Dato');
      const err = el('span', 'ui-campo-error'); err.setAttribute('role', 'alert');
      campo.appendChild(inp); campo.appendChild(err); h.cuerpo.appendChild(campo);
      const no = boton(o.no || 'Cancelar', 'secundario', 'ui-btn--l');
      const si = boton(o.si || 'Listo', 'primario', 'ui-btn--l ui-crece');
      const listo = () => {
        const v = inp.value.trim();
        const r = o.validar ? o.validar(v) : (o.obligatorio && !v ? 'Falta este dato' : '');
        if (r && r !== true){ campo.classList.add('error'); err.innerHTML = ico('alerta', 16); err.appendChild(document.createTextNode(String(r))); inp.focus(); return; }
        h.cerrar(v);
      };
      inp.addEventListener('input', () => { campo.classList.remove('error'); err.textContent = ''; });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !(o.largo && !e.ctrlKey)){ e.preventDefault(); listo(); } });
      no.addEventListener('click', () => h.cerrar(null)); si.addEventListener('click', listo);
      h.pie.appendChild(no); h.pie.appendChild(si);
    });
  }

  /* ---------- Elegir una opción ---------- */
  function elegir(o){
    o = o || {};
    return new Promise(res => {
      let elegido = null;
      const h = hoja({ titulo: o.titulo || '', clase: 'ui-hoja--dialogo', alCerrar: () => res(elegido) });
      if (o.texto) h.cuerpo.appendChild(el('p', 'ui-hoja-texto', o.texto));
      const lista = el('div', 'ui-opciones');
      (o.opciones || []).forEach((op, i) => {
        const b = el('button', 'ui-opcion' + (op.peligro ? ' ui-opcion--peligro' : '')); b.type = 'button';
        if (op.icono) b.insertAdjacentHTML('beforeend', ico(op.icono, 22));
        const s = el('span', '', op.t); if (op.sub) s.appendChild(el('small', '', op.sub));
        b.appendChild(s);
        if (i === 0) b.setAttribute('data-ui-foco', '');
        b.addEventListener('click', () => { elegido = op.v; h.cerrar(); });
        lista.appendChild(b);
      });
      h.cuerpo.appendChild(lista);
      if (o.cancelar !== false){
        const no = boton(typeof o.cancelar === 'string' ? o.cancelar : 'Cancelar', 'fantasma', 'ui-btn--l ui-crece');
        no.addEventListener('click', () => h.cerrar()); h.pie.appendChild(no);
      }
    });
  }

  /* ---------- Aviso (uno a la vez, arriba de la navegación y de la barra de acción) ---------- */
  let zona = null, actual = null;
  function alturaDeAbajo(){
    // Cuánto ocupa lo que está pegado abajo (navegación o barra de acción) para que el aviso salga encima
    let alto = 0; const H = window.innerHeight, W = window.innerWidth;
    document.querySelectorAll('.ui-nav,.ui-hoja.open .ui-pie,.nav-bottom,body > .bar,#tlBar,[data-ui-abajo]').forEach(n => {
      if (n.closest('.ui-hoja:not(.open)')) return;
      if (n.offsetParent === null && getComputedStyle(n).position !== 'fixed') return;   // escondida: no se mide
      const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none') return;
      // Si es una barra fija se mide dónde VA a quedar (sin su animación de entrada); si no, dónde está
      let r = n.getBoundingClientRect();
      if (cs.position === 'fixed') r = { top: n.offsetTop, bottom: n.offsetTop + n.offsetHeight, left: n.offsetLeft, right: n.offsetLeft + n.offsetWidth, height: n.offsetHeight };
      // cuenta si está pegado (o casi) abajo y queda debajo de donde sale el aviso (centrado, hasta 480 px)
      if (r.height && r.height < 220 && r.bottom >= H - 40 && r.top < H && r.right > W / 2 - 240 && r.left < W / 2 + 240) alto = Math.max(alto, H - r.top);
    });
    return alto;
  }
  // Se mide en el próximo cuadro (cuando el navegador igual va a acomodar la pantalla), no en medio de un cambio:
  // así no se recalcula toda la pantalla de más. Varias llamadas seguidas cuentan como una.
  let _ubT = 0;
  function ubicarAviso(){ if (!zona || _ubT) return; _ubT = requestAnimationFrame(() => setTimeout(() => { _ubT = 0; zona.style.setProperty('--ui-aviso-abajo', (alturaDeAbajo() + 12) + 'px'); }, 0)); }   // después de dibujar: medir sale gratis
  function aviso(texto, op){
    if (texto && typeof texto === 'object'){ op = texto; texto = op.texto; }
    op = op || {};
    const tipo = op.tipo === 'error' || op.tipo === 'info' ? op.tipo : 'ok';
    if (!zona){ zona = el('div', 'ui-avisos'); zona.setAttribute('role', 'status'); zona.setAttribute('aria-live', 'polite'); document.body.appendChild(zona); }
    if (actual) actual.cerrar(true);
    zona.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
    zona.classList.toggle('ui-avisos--arriba', !!op.arriba);
    ubicarAviso();
    const a = el('div', 'ui-aviso ui-aviso--' + tipo);
    if (op.id) a.id = op.id;
    // Si el texto ya trae su propio dibujito al inicio (los avisos viejos), no se le pone otro
    const propio = /^\s*(?:\p{Extended_Pictographic}|[\u2190-\u21ff\u2713-\u2717])/u.test(String(texto));
    if (op.icono !== false && !propio) a.innerHTML = ico(tipo === 'error' ? 'alerta' : tipo === 'info' ? 'info' : 'listo', 20);
    a.appendChild(el('span', 'ui-aviso-txt', String(texto == null ? '' : texto)));
    let t = 0, fuera = false;
    const yo = { cerrar(yaMismo){ if (fuera) return; fuera = true; clearTimeout(t); if (actual === yo) actual = null; if (yaMismo) a.remove(); else { a.classList.add('sale'); setTimeout(() => a.remove(), 220); } } };
    if (typeof op.deshacer === 'function'){
      const d = el('button', 'ui-aviso-deshacer', op.textoDeshacer || 'Deshacer'); d.type = 'button';
      d.addEventListener('click', () => { yo.cerrar(); try { op.deshacer(); } catch (e) { console.error(e); } });
      a.appendChild(d);
    } else a.classList.add('ui-aviso--pasa');   // sin botón: los toques pasan a lo de abajo (no tapa la barra de arriba)
    const ms = op.ms || (op.deshacer ? 7000 : 5000);
    const armar = () => { clearTimeout(t); t = setTimeout(() => yo.cerrar(), ms); };
    a.addEventListener('pointerenter', () => clearTimeout(t)); a.addEventListener('pointerleave', armar);
    zona.appendChild(a); actual = yo; armar();
    // Por si la barra de abajo aparece un instante después que el aviso (la canasta del Taller)
    setTimeout(ubicarAviso, 450);   // una sola vez más, por si la barra de abajo estaba entrando
    return yo;
  }

  /* ---------- Pausar animaciones infinitas con la pestaña oculta + aparatos lentos ---------- */
  const raiz = document.documentElement;
  const visible = () => raiz.classList.toggle('oculta', document.hidden);
  document.addEventListener('visibilitychange', visible); visible();
  try { if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4)) raiz.classList.add('liviano'); } catch (e) {}

  /* ---------- Tema: 'auto' sigue al teléfono, pero la página siempre queda en light o dark ---------- */
  const oscuro = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function temaReal(pref){ return pref === 'dark' || (pref === 'auto' && oscuro && oscuro.matches) ? 'dark' : 'light'; }
  function alCambiarSistema(fn){ if (oscuro) oscuro.addEventListener ? oscuro.addEventListener('change', fn) : oscuro.addListener(fn); }

  window.AramoUI = { confirmar, pedir, elegir, aviso, hoja, temaReal, alCambiarSistema };
})();
