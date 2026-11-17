// Selección de rol (1–2 jugadores): cinco fichas con retrato, virtudes y defectos, estadísticas, habilidad, pasiva,
// equipo de la era inicial y los zombis contra los que es fuerte o débil.
import { ERAS } from '../datos/eras.js';
import { ROLES, LISTA_ROLES } from '../datos/roles.js';
import { ZOMBIS } from '../datos/zombis.js';
import { ARMAS } from '../datos/armas.js';
import { icono } from './iconos.js';
import { iconoDeArma } from './armasUI.js';
import { retratoRol, retratoZombi } from './retratos.js';
import { DIFICULTADES, NOMBRE_ARQUETIPO, NOMBRE_DANIO } from './textos.js';
import { PIE_AYUDA } from './comun.js';
import { html, contenido, texto, clase, escapar, limitar, decimal, relanzar, visible } from './util.js';
import { primerDiaDeEra } from '../datos/eras.js';

const HAB_ICONO = { supresion: 'hab_supresion', suero: 'hab_suero', torreta: 'hab_torreta', acecho: 'hab_acecho', terremoto: 'hab_terremoto' };

/** Estadísticas comparables de un rol (0..1) a partir de sus datos. */
function estadisticas(rol) {
  const m = rol.mods;
  const n = (x, a, b) => limitar((x - a) / (b - a), 0.07, 1);
  return [
    { id: 'vida', nombre: 'Vida', v: n(rol.vida, 50, 175), txt: String(rol.vida) },
    { id: 'velocidad', nombre: 'Velocidad', v: n(rol.velocidad, 3.6, 6.3), txt: decimal(rol.velocidad) + ' m/s' },
    { id: 'danio', nombre: 'Potencia', v: n(m.danio, 0.65, 1.2), txt: '×' + decimal(m.danio, 2) },
    { id: 'cadencia', nombre: 'Cadencia', v: n(m.cadencia, 0.8, 1.25), txt: '×' + decimal(m.cadencia, 2) },
    { id: 'recarga', nombre: 'Recarga', v: n(1 / m.recarga, 0.7, 1.45), txt: '×' + decimal(1 / m.recarga, 2) },
    { id: 'precision', nombre: 'Precisión', v: n(1 / m.dispersion, 0.8, 2.6), txt: '×' + decimal(1 / m.dispersion, 2) },
  ];
}

export function crearPantallaRoles(ctx, gestor) {
  const { juego } = ctx;

  const el = html(`
<section class="pn pn-roles" hidden>
  <header class="pn-cab">
    <button type="button" class="btn mini" data-foco data-a="atras">${icono('atras')}<span>Volver</span></button>
    <h2 class="titulo">Elige tu rol</h2>
    <div class="rl-jug">
      <button type="button" class="rl-tab sel" data-foco data-j="0"><b class="jug-tag num">J1</b><span class="rl-tab-n"></span></button>
      <button type="button" class="rl-tab" data-foco data-j="1" hidden><b class="jug-tag num">J2</b><span class="rl-tab-n"></span></button>
      <button type="button" class="btn mini rl-add" data-foco data-a="j2">${icono('mando')}<span>Añadir jugador 2</span></button>
      <button type="button" class="btn mini rl-quita" data-foco data-a="quitar" hidden><span>Quitar J2</span></button>
    </div>
  </header>
  <div class="rl-fichas">${LISTA_ROLES.map((r) => `
    <button type="button" class="ficha" data-foco data-r="${r.id}" style="--rol:${r.color}">
      <span class="ficha-retr">${retratoRol(r.id)}</span>
      <span class="ficha-nombre titulo">${escapar(r.nombre)}</span>
      <span class="ficha-tit">${escapar(r.titulo)}</span>
      <span class="ficha-tags"></span>
    </button>`).join('')}</div>
  <div class="rl-det panel orn"></div>
  <footer class="rl-pie">
    <div class="rl-era" hidden><span class="rotulo">Era inicial</span>${ERAS.map((e) => `<button type="button" class="btn mini" data-foco data-era="${e.idx}" style="--c:${e.color}"><span>${e.anios[0]}</span></button>`).join('')}</div>
    <div class="rl-dif"><span class="rotulo">Dificultad</span>${DIFICULTADES.map((d) => `<button type="button" class="btn mini" data-foco data-dif="${d.id}" title="${escapar(d.nota)}"><span>${escapar(d.nombre)}</span></button>`).join('')}</div>
    <button type="button" class="btn primario rl-jugar" data-foco data-a="jugar">${icono('jugar')}<span>¡A sobrevivir!</span></button>
  </footer>
  ${PIE_AYUDA}
</section>`);

  const R = {
    fichas: Array.from(el.querySelectorAll('.ficha')), det: el.querySelector('.rl-det'),
    tabs: Array.from(el.querySelectorAll('.rl-tab')), add: el.querySelector('.rl-add'), quita: el.querySelector('.rl-quita'),
    eraBox: el.querySelector('.rl-era'), eraBtns: Array.from(el.querySelectorAll('[data-era]')), difBtns: Array.from(el.querySelectorAll('[data-dif]')),
  };
  const S = { jug: [{ rol: 'soldado' }], activo: 0, dia: 1, era: 0, practica: false };
  let claveDet = '';
  let quitaNav = null;

  const eraIdx = () => S.era;

  function tarjetaArma(id, extra = '') {
    const d = ARMAS[id];
    if (!d) return '';
    const dps = d.danio != null ? `${Math.round(d.danio)}${d.perdigones ? '×' + d.perdigones : ''} daño` : '';
    const cad = d.cadencia ? `${decimal(d.cadencia)} disp./s` : '';
    return `<div class="eq-arma"><span class="eq-ico">${iconoDeArma(d, 128)}</span><span class="eq-datos"><b>${escapar(d.nombre)}</b><small>${escapar(NOMBRE_ARQUETIPO[d.arquetipo] ?? '')}${NOMBRE_DANIO[d.tipo] ? ' · ' + escapar(NOMBRE_DANIO[d.tipo]) : ''}${dps ? ' · ' + dps : ''}${cad && d.comportamiento !== 'cuerpo' && d.comportamiento !== 'arrojadiza' ? ' · ' + cad : ''}${extra}</small></span></div>`;
  }

  function pintarDetalle() {
    const rolId = S.jug[S.activo].rol;
    const rol = ROLES[rolId];
    const era = ERAS[eraIdx()] || ERAS[0];
    const clave = `${rolId}|${era.idx}`;
    if (clave === claveDet) return;
    claveDet = clave;
    const a = era.armas, eq = rol.equipo;
    const stats = estadisticas(rol);
    const extras = [];
    if (rol.mods.critico >= 0.1) extras.push(`Crítico ${Math.round(rol.mods.critico * 100)} %`);
    if (rol.mods.cuerpo >= 1.5) extras.push(`Cuerpo a cuerpo ×${decimal(rol.mods.cuerpo, 0)}`);
    if (rol.mods.explosivos >= 1.2) extras.push(`Explosivos ×${decimal(rol.mods.explosivos, 2)}`);
    if (rol.mods.regeneracion) extras.push(`Regenera ${decimal(rol.mods.regeneracion)} vida/s`);
    const chipsZ = (lista, tono) => lista.map((id) => `<span class="chip ${tono}"><span class="chip-z">${retratoZombi(id)}</span>${escapar(ZOMBIS[id]?.nombre ?? id)}</span>`).join('');
    contenido(R.det, `
      <div class="det-col det-id" style="--rol:${rol.color}">
        <div class="det-retr">${retratoRol(rolId)}</div>
        <div class="det-nombre titulo">${escapar(rol.nombre)}</div>
        <div class="det-tit" style="color:${rol.color}">${escapar(rol.titulo)}</div>
        <p class="det-desc">${escapar(rol.descripcion)}</p>
      </div>
      <div class="det-col det-mid">
        <div class="det-listas">
          <div><div class="rotulo bueno-t">Virtudes</div><ul class="vd">${rol.virtudes.map((v) => `<li>${escapar(v)}</li>`).join('')}</ul></div>
          <div><div class="rotulo malo-t">Defectos</div><ul class="df">${rol.defectos.map((v) => `<li>${escapar(v)}</li>`).join('')}</ul></div>
        </div>
        <div class="det-stats">${stats.map((s) => `<div class="st"><span class="st-n">${s.nombre}</span><div class="barra seg"><i style="--v:${s.v.toFixed(3)};--c:${rol.color}"></i></div><b class="st-v num">${s.txt}</b></div>`).join('')}</div>
        ${extras.length ? `<div class="det-extras">${extras.map((x) => `<span class="chip">${escapar(x)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="det-col det-der">
        <div class="det-hab">
          <span class="det-hab-ico" style="--rol:${rol.color}">${icono(HAB_ICONO[rol.habilidad.id] || 'hab')}</span>
          <div><div class="rotulo">Habilidad <span class="tecla">Q</span> · ${rol.habilidad.enfriamiento} s de enfriamiento</div><b class="titulo">${escapar(rol.habilidad.nombre)}</b><p>${escapar(rol.habilidad.descripcion)}</p></div>
        </div>
        <div class="det-hab pasiva">
          <span class="det-hab-ico" style="--rol:${rol.color}">${icono('estrella')}</span>
          <div><div class="rotulo">Pasiva</div><b class="titulo">${escapar(rol.pasiva.nombre)}</b><p>${escapar(rol.pasiva.descripcion)}</p></div>
        </div>
        <div class="det-eq"><div class="rotulo">Equipo inicial · ${escapar(era.nombre)}</div>
          ${tarjetaArma(a[eq.primaria])}${tarjetaArma(a[eq.secundaria])}
          <div class="eq-arma"><span class="eq-ico">${iconoDeArma(a.arrojadiza, 128)}</span><span class="eq-datos"><b>${escapar(ARMAS[a.arrojadiza]?.nombre ?? '')}</b><small>×${eq.arrojadizas} · ${escapar(NOMBRE_ARQUETIPO.arrojadiza)} · cuerpo a cuerpo: ${escapar(ARMAS[a.cuerpo]?.nombre ?? '')}</small></span></div>
        </div>
      </div>
      <div class="det-vs">
        <div><span class="rotulo bueno-t">Fuerte contra</span>${chipsZ(rol.fuerteContra, 'bueno')}</div>
        <div><span class="rotulo malo-t">Débil contra</span>${chipsZ(rol.debilContra, 'malo')}</div>
      </div>`);
    relanzar(R.det, 'anim-fundido');
  }

  function pintarSeleccion() {
    // Fichas: marcas J1/J2 y selección del jugador activo
    for (const f of R.fichas) {
      const tags = S.jug.map((j, i) => (j.rol === f.dataset.r ? `<b class="jug-tag num j${i}">J${i + 1}</b>` : '')).join('');
      contenido(f.querySelector('.ficha-tags'), tags);
      clase(f, 'sel', S.jug[S.activo].rol === f.dataset.r);
    }
    R.tabs.forEach((t, i) => {
      visible(t, i < S.jug.length);
      clase(t, 'sel', i === S.activo);
      if (i < S.jug.length) texto(t.querySelector('.rl-tab-n'), ROLES[S.jug[i].rol].nombre);
    });
    visible(R.add, S.jug.length < 2);
    visible(R.quita, S.jug.length > 1);
    R.difBtns.forEach((b) => clase(b, 'sel', b.dataset.dif === ctx.ajustes.dificultad));
    R.eraBtns.forEach((b) => clase(b, 'sel', Number(b.dataset.era) === S.era));
    pintarDetalle();
  }

  function elegirRol(id, jugador = S.activo) {
    if (!ROLES[id] || !S.jug[jugador]) return;
    S.jug[jugador].rol = id;
    pintarSeleccion();
  }
  function anadirJ2() {
    if (S.jug.length >= 2) return;
    const usado = S.jug[0].rol;
    S.jug.push({ rol: LISTA_ROLES.find((r) => r.id !== usado).id });
    S.activo = 1;
    pintarSeleccion();
  }
  function quitarJ2() { S.jug.length = 1; S.activo = 0; pintarSeleccion(); }

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    const f = t.closest('.ficha');
    if (f) { elegirRol(f.dataset.r); return; }
    const tab = t.closest('.rl-tab');
    if (tab) { S.activo = Number(tab.dataset.j); pintarSeleccion(); return; }
    const era = t.closest('[data-era]');
    if (era) { S.era = Number(era.dataset.era); S.dia = primerDiaDeEra(S.era); ctx.eraForzada = S.era; pintarSeleccion(); return; }
    const dif = t.closest('[data-dif]');
    if (dif) { ctx.ajustes.dificultad = dif.dataset.dif; ctx.guardarAjustes(); pintarSeleccion(); return; }
    const a = t.closest('[data-a]')?.dataset.a;
    if (a === 'atras') gestor.atras();
    else if (a === 'j2') anadirJ2();
    else if (a === 'quitar') quitarJ2();
    else if (a === 'jugar') gestor.jugar({ roles: S.jug.map((j) => j.rol), dia: S.dia, dificultad: ctx.ajustes.dificultad });
  });
  // El foco (teclado, mando o ratón) sobre una ficha la selecciona para el jugador activo.
  el.addEventListener('pointerover', (ev) => { const f = ev.target.closest('.ficha'); if (f && S.jug[S.activo].rol !== f.dataset.r) elegirRol(f.dataset.r); });
  let focoPrev = null;
  function vigilarFoco() {
    const f = ctx.nav.foco;
    if (f === focoPrev) return;
    focoPrev = f;
    if (f?.classList?.contains('ficha') && el.contains(f) && S.jug[S.activo].rol !== f.dataset.r) elegirRol(f.dataset.r);
  }

  // ── mando del jugador 2 ──
  function slotDePad(pad) {
    if (S.jug.length < 2) return 0;
    const pads = ctx.nav.pads();
    if (pads.length >= 2) return pad === pads[0] ? 0 : 1;
    return 1;
  }
  function accionMando({ accion, pad }) {
    if (pad < 0 || el.hidden) return false;
    if (accion === 'y' && S.jug.length < 2) { anadirJ2(); return true; }
    if (S.jug.length < 2) return false;
    const slot = slotDePad(pad);
    if (slot !== 1) return false;
    const idx = LISTA_ROLES.findIndex((r) => r.id === S.jug[1].rol);
    if (accion === 'izq') { elegirRol(LISTA_ROLES[(idx + LISTA_ROLES.length - 1) % LISTA_ROLES.length].id, 1); S.activo = 1; pintarSeleccion(); return true; }
    if (accion === 'der') { elegirRol(LISTA_ROLES[(idx + 1) % LISTA_ROLES.length].id, 1); S.activo = 1; pintarSeleccion(); return true; }
    if (accion === 'arriba' || accion === 'abajo' || accion === 'ok' || accion === 'x') return true;
    if (accion === 'y') { quitarJ2(); return true; }
    return false;
  }

  return {
    el, foco: '.ficha.sel',
    alAbrir(datos = {}) {
      S.dia = datos.dia ?? 1; S.practica = !!datos.practica; S.era = datos.era ?? 0;
      if (!S.practica) { S.era = 0; S.dia = 1; }
      ctx.eraForzada = S.practica ? S.era : null;
      visible(R.eraBox, S.practica);
      claveDet = '';
      // Número de jugadores: si hay un segundo mando conectado, se ofrece de partida.
      pintarSeleccion();
      quitaNav?.(); quitaNav = ctx.nav.suscribir(accionMando);
    },
    alCerrar() { quitaNav?.(); quitaNav = null; ctx.eraForzada = null; },
    alVolver() { quitaNav?.(); quitaNav = ctx.nav.suscribir(accionMando); },
    actualizar() { vigilarFoco(); },
    destruir() { quitaNav?.(); },
  };
}
