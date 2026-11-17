// INTERFAZ de ERA Z — src/ui/index.js → crearUI(juego)   (siempre: true)
// HTML+CSS+JS propios sobre el lienzo, dentro de `juego.contenedor`. Viaja en el tiempo con la partida: el tema visual
// (tipografía, ornamentos, colores y formas) cambia con `estado.eraIdx` (ver estilos/base.css y temas.js).
//
// Módulos: hud.js (HUD por jugador, calendario, puntuación, jefe, marcadores, números flotantes, retícula, minimapa),
//          momentos.js (anuncios, intermedio con mejoras, salto de era, jefe, mensajes), pantallas.js (menú, práctica, roles,
//          bestiario, controles, opciones, créditos), pausa.js (pausa y fin de partida), nav.js (foco con teclado/ratón/mando).
//
// API añadida al contrato: ui.mensaje(texto, { tipo, duracion, subtitulo }) · ui.abrir(pantalla) · ui.cerrar() · ui.ajustes ·
//   ui.era (índice mostrado) · ui.destruir(). Eventos que emite: ui:jugar, ui:elegirMejora, ui:reiniciar, ui:menu, ui:saltarIntermedio.
import cssBase from './estilos/base.css?inline';
import cssHud from './estilos/hud.css?inline';
import cssMomentos from './estilos/momentos.css?inline';
import cssPantallas from './estilos/pantallas.css?inline';
import { el, guardado, limitar } from './util.js';
import { aplicarTema } from './temas.js';
import { crearNav } from './nav.js';
import { crearHud } from './hud.js';
import { crearMomentos } from './momentos.js';
import { crearPantallas } from './pantallas.js';
import { crearPausa } from './pausa.js';

const AJUSTES_DEF = { calidad: null, vol: [0.8, 0.6, 0.9], dificultad: 'normal', minimapa: true, numeros: true, sacudida: true };

function inyectarCss() {
  if (document.getElementById('ez-estilos')) return;
  const s = document.createElement('style');
  s.id = 'ez-estilos';
  s.textContent = [cssBase, cssHud, cssMomentos, cssPantallas].join('\n');
  document.head.appendChild(s);
}

export function crearUI(juego) {
  // `?sinui=1`: nada en pantalla (capturas limpias). Se conserva la API para que nadie falle al llamarla.
  if (juego.opciones?.sinui) return { siempre: true, mensaje() {}, actualizar() {}, abrir() {}, cerrar() {}, destruir() {} };

  inyectarCss();
  const raiz = el('div', 'ez');
  raiz.setAttribute('role', 'presentation');
  const capas = {};
  for (const n of ['mundo', 'momentos', 'pantallas', 'pausa']) {
    capas[n] = el('div', `ez-capa ez-${n}`);
    raiz.appendChild(capas[n]);
  }
  juego.contenedor.appendChild(raiz);

  // ── contexto compartido por los módulos ─────────────────────────────────────────────────────────────────────────
  const offs = [];
  const ajustes = { ...AJUSTES_DEF, ...(guardado.leer('ajustes', {}) || {}) };
  const ctx = {
    juego, raiz, capas, ajustes,
    eraForzada: null,
    en(nombre, fn) { const off = juego.eventos.en(nombre, (d) => { try { fn(d || {}); } catch (e) { console.error(`[ui] ${nombre}`, e); } }); offs.push(off); return off; },
    emitir(nombre, datos = {}) { juego.eventos.emitir(nombre, datos); },
    guardarAjustes() { guardado.escribir('ajustes', ajustes); },
    aplicarAjustes() {
      if (ajustes.calidad && !juego.opciones?.calidad) { try { juego.render?.calidad?.(ajustes.calidad); } catch (e) { console.error('[ui] calidad', e); } }
      try { juego.audio?.volumen?.(ajustes.vol[0], ajustes.vol[1], ajustes.vol[2]); } catch (e) { console.error('[ui] volumen', e); }
      raiz.classList.toggle('ez-sin-numeros', !ajustes.numeros);
      raiz.classList.toggle('ez-sin-minimapa', !ajustes.minimapa);
    },
    nJugadores() { return juego.jugadores.length || 1; },
    get era() { return ctx.eraForzada ?? juego.estado.eraIdx ?? 0; },
  };
  ctx.nav = crearNav(ctx);
  ctx.aplicarAjustes();

  // ── escala 1280×720 → 4K ─────────────────────────────────────────────────────────────────────────────────────────
  let anchoPrev = 0, altoPrev = 0;
  function escalar() {
    const w = juego.contenedor.clientWidth || innerWidth, h = juego.contenedor.clientHeight || innerHeight;
    if (w === anchoPrev && h === altoPrev) return;
    anchoPrev = w; altoPrev = h;
    const px = limitar(Math.min(w / 1280, h / 720), 0.62, 3.2);
    raiz.style.setProperty('--px', px.toFixed(4) + 'px');
    raiz.dataset.formato = w / h < 1.4 ? 'estrecho' : w / h > 2.1 ? 'ancho' : 'normal';
  }
  escalar();
  const alRedim = () => escalar();
  addEventListener('resize', alRedim);
  let ro = null;
  try { ro = new ResizeObserver(escalar); ro.observe(juego.contenedor); } catch { /* sin ResizeObserver */ }

  // ── primer gesto: desbloquea el audio ───────────────────────────────────────────────────────────────────────────
  let audioListo = false;
  const gesto = () => {
    if (audioListo) return;
    audioListo = true;
    try { juego.audio?.desbloquear?.(); } catch (e) { console.error('[ui] audio', e); }
    removeEventListener('pointerdown', gesto, true); removeEventListener('keydown', gesto, true); removeEventListener('touchstart', gesto, true);
  };
  addEventListener('pointerdown', gesto, true); addEventListener('keydown', gesto, true); addEventListener('touchstart', gesto, true);
  ctx.gesto = gesto;

  // La pausa la gestiona la UI (Esc/P/Start) para poder cerrar submenús con Esc sin reanudar la partida.
  if (juego.entrada) juego.entrada.gestionaPausa = false;

  // ── módulos (si uno falla, el resto sigue) ──────────────────────────────────────────────────────────────────────
  const modulos = [];
  function modulo(nombre, fabrica) {
    try { const m = fabrica(ctx); if (m) { m.nombre = nombre; modulos.push(m); ctx[nombre] = m; } return m; }
    catch (e) { console.error(`[ui] no se pudo crear el módulo «${nombre}»`, e); return null; }
  }
  modulo('hud', crearHud);
  modulo('momentos', crearMomentos);
  modulo('pantallas', crearPantallas);
  modulo('pausa', crearPausa);

  let eraPrev = -1, fasePrev = '', pausaPrev = null;
  function actualizar() {
    const dt = limitar(juego.tiempo?.dtReal ?? 1 / 60, 0, 0.1);
    const est = juego.estado;
    const era = ctx.era;
    if (era !== eraPrev) { eraPrev = era; aplicarTema(raiz, era); }
    if (est.fase !== fasePrev) { fasePrev = est.fase; raiz.dataset.fase = est.fase; }
    if (est.pausado !== pausaPrev) { pausaPrev = est.pausado; raiz.dataset.pausa = est.pausado ? '1' : '0'; }
    ctx.nav.actualizar(dt);
    for (const m of modulos) {
      try { m.actualizar?.(dt); }
      catch (e) { m.errores = (m.errores || 0) + 1; if (m.errores <= 3) console.error(`[ui] error en ${m.nombre}.actualizar`, e); }
    }
  }

  const ui = {
    siempre: true,
    ctx,
    ajustes,
    get era() { return ctx.era; },
    actualizar,
    redimensionar() { escalar(); },
    /** Muestra un mensaje en la cola de avisos. `opciones`: { tipo: 'info'|'aviso'|'logro'|'jefe', duracion, subtitulo }. */
    mensaje(texto, opciones = {}) { ctx.momentos?.mensaje?.({ texto, ...opciones }); },
    /** Abre una pantalla de menú: 'menu' | 'practica' | 'roles' | 'bestiario' | 'controles' | 'opciones' | 'creditos'. */
    abrir(nombre, datos) { ctx.pantallas?.abrir?.(nombre, datos); },
    cerrar() { ctx.pantallas?.cerrar?.(); },
    destruir() {
      for (const o of offs) { try { o(); } catch { /* ya quitado */ } }
      for (const m of modulos) { try { m.destruir?.(); } catch { /* sin limpieza */ } }
      ctx.nav.destruir();
      removeEventListener('resize', alRedim);
      try { ro?.disconnect(); } catch { /* sin observer */ }
      raiz.remove();
    },
  };
  return ui;
}
