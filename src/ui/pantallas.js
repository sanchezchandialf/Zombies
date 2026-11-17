// Pantallas de menú: gestor con pila (menú principal, práctica, créditos y carga) más las de roles e información.
// Se navega con ratón, teclado y mando (ver nav.js). El menú se muestra sobre el juego en vivo (la cámara de menú la mueve el render).
import { ERAS, primerDiaDeEra } from '../datos/eras.js';
import { ARMAS } from '../datos/armas.js';
import { icono } from './iconos.js';
import { iconoDeArma } from './armasUI.js';
import { html, texto, contenido, visible, relanzar, escapar, numero, guardado } from './util.js';
import { PIE_AYUDA } from './comun.js';
import { crearPantallaRoles } from './pantallasRoles.js';
import { crearBestiario, crearControles, crearOpciones } from './pantallasInfo.js';

const LOGO_Z = `
<svg class="logo-z" viewBox="0 0 120 132" aria-hidden="true">
  <defs>
    <linearGradient id="lz-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--logo-1, #ffe9a8)"/><stop offset=".55" stop-color="var(--acento)"/><stop offset="1" stop-color="var(--logo-2, #b3201a)"/></linearGradient>
    <linearGradient id="lz-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
  </defs>
  <g class="lz-reloj" fill="none" stroke="var(--acento)">
    <circle cx="60" cy="66" r="58" stroke-width="1.6" opacity=".55"/>
    <circle cx="60" cy="66" r="53" stroke-width="5" stroke-dasharray=".8 6.58" opacity=".7"/>
    <circle cx="60" cy="66" r="47" stroke-width=".8" opacity=".4"/>
    <path d="M60 66V22M60 66l24 14" stroke="var(--tinta)" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>
    <circle cx="60" cy="66" r="3.4" fill="var(--tinta)" stroke="none" opacity=".8"/>
  </g>
  <path class="lz-sombra" d="M18 25H110V47L56 97H114V121H14V97L68 47H18Z" fill="#000" opacity=".55" transform="translate(3.5 4)"/>
  <path class="lz-cuerpo" d="M14 20H106V42L52 92H110V116H10V92L64 42H14Z" fill="url(#lz-g)" stroke="rgba(0,0,0,.65)" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M14 20H106V42L52 92H110V116H10V92L64 42H14Z" fill="url(#lz-s)"/>
  <path d="M20 26H100M60 49 25 84M17 100H96" stroke="#fff" stroke-opacity=".38" stroke-width="1.4" stroke-linecap="round" fill="none"/>
  <path class="lz-grieta" d="M84 28l-8 14 9 4-12 16 8 2-10 14" stroke="rgba(0,0,0,.7)" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
  <g class="lz-sangre" fill="#b3201a"><path d="M92 116c0 6 -3 9 -3 14a3 3 0 0 0 6 0c0 -5 -3 -8 -3 -14z" opacity=".9"/><circle cx="100" cy="123" r="2" opacity=".9"/><circle cx="31" cy="118" r="1.6" opacity=".9"/><path d="M70 20l2 -7a2 2 0 0 1 4 0l1.600 7z" opacity=".9"/></g>
</svg>`;

export function crearPantallas(ctx) {
  const { juego, capas } = ctx;
  const est = juego.estado;
  const capa = capas.pantallas;
  const pila = [];
  let esperandoJugar = 0;

  // ── gestor ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const registro = {};
  const gestor = {
    abrir(nombre, datos = {}) {
      const p = registro[nombre];
      if (!p) return;
      const tope = pila[pila.length - 1];
      if (tope) { visible(tope.p.el, false); ctx.nav.sacar(tope.p.el); }
      pila.push({ nombre, p, datos });
      p.alAbrir?.(datos);
      visible(p.el, true);
      relanzar(p.el, 'pn-entra');
      ctx.nav.empujar(p.el, { atras: nombre === 'menu' ? null : gestor.atras, foco: p.foco });
    },
    atras() {
      if (pila.length <= 1 && pila[0]?.nombre === 'menu') return;
      const t = pila.pop();
      if (t) { visible(t.p.el, false); ctx.nav.sacar(t.p.el); t.p.alCerrar?.(); }
      ctx.eraForzada = null;
      const prev = pila[pila.length - 1];
      if (prev) { visible(prev.p.el, true); relanzar(prev.p.el, 'pn-entra'); ctx.nav.empujar(prev.p.el, { atras: prev.nombre === 'menu' ? null : gestor.atras, foco: prev.p.foco }); prev.p.alVolver?.(); }
      else if (est.fase === 'menu') gestor.abrir('menu');
    },
    cerrarTodo() {
      while (pila.length) { const t = pila.pop(); visible(t.p.el, false); ctx.nav.sacar(t.p.el); t.p.alCerrar?.(); }
      ctx.eraForzada = null;
    },
    get pila() { return pila; },
    jugar(datos) {
      gestor.cerrarTodo();
      esperandoJugar = 2.5;
      ctx.emitir('ui:jugar', datos);
    },
  };

  // ══ Menú principal ═════════════════════════════════════════════════════════════════════════════════════════════
  const menu = html(`
<section class="pn pn-menu" hidden>
  <div class="menu-velo"></div>
  <div class="menu-col">
    <div class="logo">
      <div class="logo-fila"><span class="logo-era titulo">ERA</span>${LOGO_Z}</div>
      <div class="logo-anios"><i></i><span class="num">1800 · 2100</span><i></i></div>
      <div class="logo-eras"></div>
      <div class="logo-lema">Tres siglos. Una plaga. Ni un solo respiro.</div>
    </div>
    <nav class="menu-lista">
      <button type="button" class="btn destacado" data-foco data-a="jugar">${icono('jugar')}<span>Jugar<small>Día 1 · Año 1800 · Villa de Santa Ceniza</small></span></button>
      <button type="button" class="btn" data-foco data-a="practica">${icono('tiempo')}<span>Práctica<small>Empieza en la era que quieras</small></span></button>
      <button type="button" class="btn" data-foco data-a="bestiario">${icono('libro')}<span>Bestiario</span></button>
      <button type="button" class="btn" data-foco data-a="controles">${icono('teclado')}<span>Controles</span></button>
      <button type="button" class="btn" data-foco data-a="opciones">${icono('engranaje')}<span>Opciones</span></button>
      <button type="button" class="btn" data-foco data-a="creditos">${icono('estrella')}<span>Créditos</span></button>
    </nav>
    <div class="menu-record rotulo" hidden></div>
  </div>
  ${PIE_AYUDA}
</section>`);
  const eraDots = menu.querySelector('.logo-eras');
  eraDots.innerHTML = ERAS.map((e) => `<span class="le" style="--c:${e.color}"><i></i><b class="num">${e.anios[0]}</b></span>`).join('');
  const recordEl = menu.querySelector('.menu-record');
  registro.menu = { el: menu, foco: '[data-a="jugar"]', alAbrir() {
    const r = guardado.leer('record.v1', null);
    if (r?.puntos) { texto(recordEl, `Récord: ${numero(r.puntos)} puntos · día ${r.dia ?? '—'}`); visible(recordEl, true); } else visible(recordEl, false);
  } };
  menu.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'jugar') gestor.abrir('roles', { dia: 1 });
    else gestor.abrir(a);
  });

  // ══ Práctica: elegir era inicial ═══════════════════════════════════════════════════════════════════════════════
  const practica = html(`
<section class="pn pn-practica" hidden>
  <header class="pn-cab"><button type="button" class="btn mini" data-foco data-a="atras">${icono('atras')}<span>Volver</span></button>
    <h2 class="titulo">Práctica</h2><div class="pn-cab-sub">Elige la era en la que quieres empezar</div></header>
  <div class="pr-grid">${ERAS.map((e) => `
    <button type="button" class="pr-era panel orn" data-foco data-e="${e.idx}" style="--c:${e.color}">
      <span class="pr-num num">${e.idx + 1}</span>
      <span class="pr-anios num">${e.anios[0]} — ${e.anios[1]}</span>
      <span class="pr-nombre titulo">${escapar(e.nombre)}</span>
      <span class="pr-lugar">${icono('mapa')}${escapar(e.nombreEscenario)}</span>
      <span class="pr-lema">«${escapar(e.lema)}»</span>
      <span class="pr-armas">${['fusil', 'precision', 'pesada'].map((a) => `<span class="pr-arma" title="${escapar(ARMAS[e.armas[a]]?.nombre ?? '')}">${iconoDeArma(e.armas[a], 96)}</span>`).join('')}</span>
      <span class="pr-dia rotulo">Empieza en el día ${primerDiaDeEra(e.idx)}</span>
    </button>`).join('')}</div>
  ${PIE_AYUDA}
</section>`);
  registro.practica = { el: practica, foco: '[data-e="0"]' };
  practica.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-a="atras"]')) { gestor.atras(); return; }
    const b = ev.target.closest('[data-e]'); if (!b) return;
    const e = Number(b.dataset.e);
    gestor.abrir('roles', { dia: primerDiaDeEra(e), practica: true, era: e });
  });
  practica.addEventListener('pointerover', (ev) => { const b = ev.target.closest('[data-e]'); if (b) ctx.eraForzada = Number(b.dataset.e); });
  practica.addEventListener('focusin', () => {});
  const origAtras = null; void origAtras;

  // ══ Créditos ═══════════════════════════════════════════════════════════════════════════════════════════════════
  const creditos = html(`
<section class="pn pn-creditos" hidden>
  <header class="pn-cab"><button type="button" class="btn mini" data-foco data-a="atras">${icono('atras')}<span>Volver</span></button><h2 class="titulo">Créditos</h2></header>
  <div class="cr-caja panel orn">
    <div class="cr-logo titulo">ERA Z</div>
    <div class="cr-anios num">1800 · 2100</div>
    <hr class="sep">
    <p>Un juego original de supervivencia por oleadas contra los muertos vivientes a lo largo de tres siglos.</p>
    <p class="suave">Todo lo que ves y oyes se genera por código en tu navegador: geometría, texturas, música, efectos e interfaz. Ni una imagen ni una fuente descargada.</p>
    <div class="cr-lista">
      <div><span class="rotulo">Motor gráfico</span><b>Three.js</b></div>
      <div><span class="rotulo">Audio</span><b>WebAudio procedural</b></div>
      <div><span class="rotulo">Interfaz</span><b>HTML, CSS y SVG propios</b></div>
      <div><span class="rotulo">Idioma</span><b>Español</b></div>
    </div>
    <p class="tenue cr-nota">Gracias por resistir.</p>
  </div>
  ${PIE_AYUDA}
</section>`);
  registro.creditos = { el: creditos, foco: '[data-a="atras"]' };
  creditos.addEventListener('click', (ev) => { if (ev.target.closest('[data-a="atras"]')) gestor.atras(); });

  // ══ Pantallas de roles e información ═══════════════════════════════════════════════════════════════════════════
  registro.roles = crearPantallaRoles(ctx, gestor);
  registro.bestiario = crearBestiario(ctx, gestor);
  registro.controles = crearControles(ctx, gestor);
  registro.opciones = crearOpciones(ctx, gestor);

  for (const [n, p] of Object.entries(registro)) { p.el.dataset.pn = n; capa.appendChild(p.el); }

  // ── carga ──
  const carga = html(`<div class="pn-carga" hidden><div class="pc-aro"></div><div class="pc-t rotulo">Viajando en el tiempo…</div></div>`);
  capa.appendChild(carga);

  // ── eventos ──
  ctx.en('partida:inicio', () => { gestor.cerrarTodo(); esperandoJugar = 0; });
  ctx.en('ui:menu', () => { gestor.cerrarTodo(); esperandoJugar = 0; });

  return {
    abrir: gestor.abrir, cerrar: gestor.cerrarTodo, atras: gestor.atras,
    /** ¿Hay una pantalla de menú abierta que deba consumir Esc? (en el menú principal, no) */
    abierta() { return pila.length > 0 && !(pila.length === 1 && pila[0].nombre === 'menu'); },
    actual() { return pila[pila.length - 1]?.nombre ?? null; },
    registro,
    actualizar(dt) {
      if (esperandoJugar > 0) esperandoJugar -= dt;
      const enMenu = est.fase === 'menu';
      if (enMenu && !pila.length && esperandoJugar <= 0) gestor.abrir('menu');
      if (!enMenu && pila.length && !pila.some((x) => x.datos?.desde === 'pausa')) gestor.cerrarTodo();
      visible(carga, est.subfase === 'carga' && est.fase !== 'menu');
      for (const x of pila) x.p.actualizar?.(dt);
    },
    destruir() { for (const p of Object.values(registro)) p.destruir?.(); for (const p of Object.values(registro)) p.el.remove(); carga.remove(); },
  };
}
