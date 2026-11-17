// Navegación de la interfaz con teclado, ratón y mando: pila de capas con foco espacial.
// Una «capa» es un elemento raíz cuyos descendientes `[data-foco]` forman el conjunto navegable.
//   nav.empujar(el, { atras, alEntrar })   nav.sacar(el)   nav.enfocar(elemento)   nav.suscribir(fn) → off
// Los suscriptores reciben { accion, pad } con accion ∈ izq|der|arriba|abajo|ok|atras|start|x|y|lb|rb y pueden devolver true para consumirla.
import { clase } from './util.js';

const REPETICION_INICIAL = 0.36, REPETICION = 0.12, UMBRAL = 0.55;
const BOTON = { 0: 'ok', 1: 'atras', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 9: 'start', 12: 'arriba', 13: 'abajo', 14: 'izq', 15: 'der' };

export function crearNav(ctx) {
  const pila = [];
  const subs = new Set();
  let foco = null;
  const estadoPad = new Map(); // índice → { botones: {}, dir: {…}, t }
  let ultimaEntrada = 'teclado';

  const visibleEl = (e) => !e.hidden && e.getClientRects().length > 0 && !e.closest('[hidden]') && !e.disabled && !e.closest('[inert]');
  const lista = () => {
    const capa = pila[pila.length - 1]?.el;
    return capa ? Array.from(capa.querySelectorAll('[data-foco]')).filter(visibleEl) : [];
  };

  function enfocar(e, suave = false) {
    if (foco === e) return;
    if (foco) foco.classList.remove('foco');
    foco = e || null;
    if (foco) {
      foco.classList.add('foco');
      try { foco.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: suave ? 'smooth' : 'auto' }); } catch { /* sin scroll */ }
    }
  }

  function mover(dir) {
    const l = lista();
    if (!l.length) return;
    if (!foco || !l.includes(foco)) { enfocar(l[0]); return; }
    if (foco.__ajustar && (dir === 'izq' || dir === 'der')) { foco.__ajustar(dir === 'izq' ? -1 : 1); return; }
    const r0 = foco.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let mejor = null, mejorD = Infinity;
    for (const e of l) {
      if (e === foco) continue;
      const r = e.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      let ok, p, q;
      if (dir === 'arriba') { ok = dy < -2; p = -dy; q = Math.abs(dx); }
      else if (dir === 'abajo') { ok = dy > 2; p = dy; q = Math.abs(dx); }
      else if (dir === 'izq') { ok = dx < -2; p = -dx; q = Math.abs(dy); }
      else { ok = dx > 2; p = dx; q = Math.abs(dy); }
      if (!ok) continue;
      const d = p + q * 2.2;
      if (d < mejorD) { mejorD = d; mejor = e; }
    }
    if (mejor) enfocar(mejor);
  }

  function activar() { if (foco && visibleEl(foco)) foco.click(); }
  function atras() { const c = pila[pila.length - 1]; if (c?.atras) c.atras(); }

  function accion(a, pad = -1) {
    for (const f of subs) { try { if (f({ accion: a, pad }) === true) return true; } catch (e) { console.error('[ui] nav', e); } }
    if (!pila.length) return false;
    if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') mover(a);
    else if (a === 'ok') activar();
    else if (a === 'atras') atras();
    return true;
  }

  function tecla(ev) {
    if (ev.defaultPrevented || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    let a = null;
    switch (ev.code) {
      case 'ArrowUp': case 'KeyW': a = 'arriba'; break;
      case 'ArrowDown': case 'KeyS': a = 'abajo'; break;
      case 'ArrowLeft': case 'KeyA': a = 'izq'; break;
      case 'ArrowRight': case 'KeyD': a = 'der'; break;
      case 'Enter': case 'NumpadEnter': case 'Space': a = 'ok'; break;
      case 'Escape': case 'Backspace': a = 'atras'; break;
      default: return;
    }
    // Los suscriptores pueden leer teclas propias; solo se captura si hay capa activa.
    if (!pila.length && !subs.size) return;
    if (ultimaEntrada !== 'teclado') { ultimaEntrada = 'teclado'; ctx.raiz.classList.remove('ez-mando'); }
    if (accion(a, -1) && pila.length) ev.preventDefault();
  }
  addEventListener('keydown', tecla);

  const alRaton = () => { if (ultimaEntrada !== 'teclado') { ultimaEntrada = 'teclado'; ctx.raiz.classList.remove('ez-mando'); } };
  addEventListener('pointermove', alRaton, { passive: true });

  function sobre(ev) {
    const e = ev.target.closest?.('[data-foco]');
    if (e && pila.length && pila[pila.length - 1].el.contains(e)) enfocar(e);
  }
  ctx.raiz.addEventListener('pointerover', sobre);

  function leerPads(dt) {
    let lista_ = [];
    try { lista_ = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch { lista_ = []; }
    for (const g of lista_) {
      if (!g || !g.connected || !g.buttons) continue;
      let st = estadoPad.get(g.index);
      if (!st) { st = { b: {}, dir: { izq: 0, der: 0, arriba: 0, abajo: 0 }, activo: false }; estadoPad.set(g.index, st); }
      // Botones
      for (const [idx, nombre] of Object.entries(BOTON)) {
        const pulsado = !!g.buttons[idx]?.pressed;
        const antes = !!st.b[idx];
        st.b[idx] = pulsado;
        if (pulsado && !antes) {
          if (ultimaEntrada !== 'mando') { ultimaEntrada = 'mando'; ctx.raiz.classList.add('ez-mando'); }
          accion(nombre, g.index);
          if (nombre === 'arriba' || nombre === 'abajo' || nombre === 'izq' || nombre === 'der') st.dir[nombre] = -REPETICION_INICIAL;
        } else if (pulsado && (nombre === 'arriba' || nombre === 'abajo' || nombre === 'izq' || nombre === 'der')) {
          st.dir[nombre] += dt;
          if (st.dir[nombre] >= REPETICION) { st.dir[nombre] = 0; accion(nombre, g.index); }
        }
      }
      // Stick izquierdo como cruceta
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      const ds = { izq: ax < -UMBRAL, der: ax > UMBRAL, arriba: ay < -UMBRAL, abajo: ay > UMBRAL };
      for (const n of ['izq', 'der', 'arriba', 'abajo']) {
        const idxBoton = { izq: 14, der: 15, arriba: 12, abajo: 13 }[n];
        if (g.buttons[idxBoton]?.pressed) continue; // ya tratado
        if (ds[n]) {
          if (st['s' + n] === undefined || st['s' + n] === null) {
            st['s' + n] = -REPETICION_INICIAL;
            if (ultimaEntrada !== 'mando') { ultimaEntrada = 'mando'; ctx.raiz.classList.add('ez-mando'); }
            accion(n, g.index);
          } else {
            st['s' + n] += dt;
            if (st['s' + n] >= REPETICION) { st['s' + n] = 0; accion(n, g.index); }
          }
        } else st['s' + n] = null;
      }
    }
  }

  return {
    empujar(el, opciones = {}) {
      const i = pila.findIndex((c) => c.el === el);
      if (i >= 0) pila.splice(i, 1);
      pila.push({ el, atras: opciones.atras || null });
      // Enfoca el primer elemento (o el indicado) tras mostrarse.
      requestAnimationFrame(() => {
        const l = lista();
        const preferido = opciones.foco ? el.querySelector(opciones.foco) : null;
        enfocar(preferido && visibleEl(preferido) ? preferido : l[0] || null);
      });
    },
    sacar(el) {
      const i = pila.findIndex((c) => c.el === el);
      if (i >= 0) pila.splice(i, 1);
      if (foco && !lista().includes(foco)) {
        const l = lista();
        enfocar(l[0] || null);
      }
    },
    /** Quita todas las capas (p. ej. al empezar la partida). */
    vaciar() { pila.length = 0; enfocar(null); },
    enfocar, mover, activar, atras, accion,
    get capa() { return pila[pila.length - 1]?.el || null; },
    get hayCapa() { return pila.length > 0; },
    get foco() { return foco; },
    get entrada() { return ultimaEntrada; },
    suscribir(fn) { subs.add(fn); return () => subs.delete(fn); },
    /** Pads conectados (índices). */
    pads() {
      try { return Array.from(navigator.getGamepads?.() || []).filter((g) => g && g.connected && g.buttons && g.buttons.length >= 10).map((g) => g.index); }
      catch { return []; }
    },
    actualizar(dt) {
      // Sin capa ni suscriptores no hay nada que navegar; aun así se leen los mandos para detectar «Start».
      leerPads(dt);
      if (foco && !foco.isConnected) enfocar(null);
      if (pila.length && (!foco || !visibleEl(foco))) { const l = lista(); if (l.length) enfocar(l[0]); }
    },
    destruir() {
      removeEventListener('keydown', tecla);
      removeEventListener('pointermove', alRaton);
      ctx.raiz.removeEventListener('pointerover', sobre);
    },
  };
}
