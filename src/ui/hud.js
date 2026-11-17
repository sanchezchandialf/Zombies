// HUD: barra superior (zombis, puntuación + racha, calendario, minimapa), paneles por jugador, barra de jefe y viñeta de daño.
// Los elementos del mundo (etiquetas, números flotantes, marcadores, retícula…) viven en hudMundo.js.
import { ERAS } from '../datos/eras.js';
import { ROLES } from '../datos/roles.js';
import { icono, iconoArma as svgArma } from './iconos.js';
import { iconoDeArma } from './armasUI.js';
import { retratoRol } from './retratos.js';
import { ESTADOS } from './textos.js';
import { html, texto, contenido, clase, estilo, visible, relanzar, limitar } from './util.js';
import { crearHudMundo } from './hudMundo.js';
import { crearMinimapa } from './minimapa.js';

const HAB_ICONO = { supresion: 'hab_supresion', suero: 'hab_suero', torreta: 'hab_torreta', acecho: 'hab_acecho', terremoto: 'hab_terremoto' };
const FIN = ' '; // espacio fino

/** 1 234 567 → { ceros, cifras } con 9 dígitos y ceros iniciales atenuados. */
function formatoPuntos(n) {
  const s = String(Math.max(0, Math.round(n))).padStart(9, '0');
  const g = s.replace(/(\d{3})(?=\d)/g, '$1' + FIN);
  const m = g.match(/^[0 ]*/)[0];
  const sinCeros = m.length >= g.length ? g.slice(-1) : g.slice(m.length);
  const ceros = g.slice(0, g.length - sinCeros.length);
  return { ceros, cifras: sinCeros };
}

function periodoDelDia(h) {
  const x = ((h % 1) + 1) % 1;
  if (x < 0.1 || x >= 0.93) return ['AMANECER', 'amanecer'];
  if (x < 0.38) return ['DÍA', 'sol'];
  if (x < 0.6) return ['ATARDECER', 'amanecer'];
  return ['NOCHE', 'luna'];
}

const PLANTILLA_JUG = `
<div class="jug panel orn">
  <div class="jug-retr"></div>
  <div class="jug-cuerpo">
    <div class="jug-cab"><span class="jug-tag num"></span><span class="jug-rol titulo"></span><span class="jug-est"></span></div>
    <div class="vida">
      <span class="vida-ico">${icono('vida')}</span>
      <div class="barra vida-pista"><i class="vida-perdida"></i><i class="vida-actual"></i><b class="vida-cura"></b></div>
      <span class="vida-txt num"></span>
    </div>
    <div class="arma-fila">
      <div class="arma-ico"></div>
      <div class="arma-datos">
        <div class="arma-nombre"></div>
        <div class="mun-fila"><span class="mun-act num"></span><span class="mun-res num"></span><span class="mun-aviso"></span></div>
        <div class="barra fina mun-barra"><i></i></div>
      </div>
    </div>
    <div class="jug-pie">
      <div class="sec"><span class="tecla sec-tecla">2</span><span class="sec-ico"></span><span class="sec-mun num"></span></div>
      <div class="arroj"><span class="tecla arroj-tecla">G</span>${icono('granada')}<span class="arroj-pips"></span></div>
    </div>
  </div>
  <div class="hab">
    <svg class="hab-anillo" viewBox="0 0 44 44"><circle class="hab-pista" cx="22" cy="22" r="19"/><circle class="hab-prog" cx="22" cy="22" r="19" transform="rotate(-90 22 22)"/></svg>
    <span class="hab-ico"></span><span class="hab-t num"></span><span class="tecla hab-tecla">Q</span>
  </div>
  <div class="jug-aviso"></div>
</div>`;

export function crearHud(ctx) {
  const { juego, capas } = ctx;
  const est = juego.estado;
  const capa = capas.mundo;

  // ── barra superior ──────────────────────────────────────────────────────────────────────────────────────────────
  const sup = html(`
<div class="hud-sup">
  <div class="hud-izq">
    <div class="panel orn zomb">
      <div class="zomb-fila"><span class="zomb-ico">${icono('calavera')}</span><span class="zomb-num num">0</span><span class="zomb-txt rotulo">Zombis<br>restantes</span></div>
      <div class="barra seg zomb-barra"><i></i></div>
      <div class="hora-fila"><span class="hora-ico"></span><div class="hora-dial"><i class="hora-marca"></i></div><span class="hora-txt rotulo"></span></div>
    </div>
  </div>
  <div class="hud-centro">
    <div class="puntos-fila">
      <div class="puntos num" aria-label="Puntuación"><span class="ceros"></span><span class="cifras">0</span></div>
      <div class="racha">
        <svg viewBox="0 0 60 60"><circle class="racha-pista" cx="30" cy="30" r="25"/><circle class="racha-prog" cx="30" cy="30" r="25" transform="rotate(-90 30 30)"/></svg>
        <span class="racha-mult num">×1</span>
        <span class="racha-txt rotulo">Racha <b class="num">0</b></span>
      </div>
    </div>
    <div class="calendario panel"><span class="cal-dia"></span><i></i><span class="cal-anio"></span><i></i><span class="cal-era"></span></div>
  </div>
  <div class="hud-der">
    <div class="mini-caja"><canvas class="mini" width="200" height="200"></canvas><span class="mini-norte rotulo">N</span></div>
    <div class="der-datos rotulo">Bajas <b class="num der-bajas">0</b></div>
  </div>
</div>`);
  capa.appendChild(sup);
  const q = (s) => sup.querySelector(s);
  const E = {
    zombNum: q('.zomb-num'), zombBarra: q('.zomb-barra i'), horaIco: q('.hora-ico'), horaMarca: q('.hora-marca'), horaTxt: q('.hora-txt'),
    puntos: q('.puntos'), ceros: q('.ceros'), cifras: q('.cifras'),
    racha: q('.racha'), rachaProg: q('.racha-prog'), rachaMult: q('.racha-mult'), rachaNum: q('.racha-txt b'),
    calDia: q('.cal-dia'), calAnio: q('.cal-anio'), calEra: q('.cal-era'), calendario: q('.calendario'),
    mini: q('.mini'), miniCaja: q('.mini-caja'), bajas: q('.der-bajas'),
  };
  const RACHA_LEN = 2 * Math.PI * 25;
  E.rachaProg.style.strokeDasharray = RACHA_LEN.toFixed(2);

  // ── barra de jefe ───────────────────────────────────────────────────────────────────────────────────────────────
  const jefeEl = html(`
<div class="jefe-barra" hidden>
  <div class="jefe-cab"><span class="jefe-nombre titulo"></span><span class="jefe-titulo"></span></div>
  <div class="jefe-pista"><i class="jefe-perdida"></i><i class="jefe-vida"></i><b class="jefe-marcas"></b></div>
</div>`);
  capa.appendChild(jefeEl);
  const J = { nombre: jefeEl.querySelector('.jefe-nombre'), titulo: jefeEl.querySelector('.jefe-titulo'), vida: jefeEl.querySelector('.jefe-vida'), perdida: jefeEl.querySelector('.jefe-perdida') };
  let jefeActual = null, jefePerdida = 1;

  ctx.en('jefe:aparece', (d) => {
    const j = d.jefe; if (!j) return;
    jefeActual = j; jefePerdida = 1;
    texto(J.nombre, (j.def?.nombre ?? j.nombre ?? 'JEFE').toUpperCase());
    texto(J.titulo, j.def?.titulo ?? '');
    visible(jefeEl, true);
    relanzar(jefeEl, 'anim-aparece');
  });
  ctx.en('jefe:muerte', () => { jefeActual = null; visible(jefeEl, false); });

  // ── viñeta de daño ───────────────────────────────────────────────────────────────────────────────────────────────
  const vineta = html('<div class="vineta"></div>');
  const flash = html('<div class="flash-danio"></div>');
  capa.append(vineta, flash);

  // ── paneles de jugador ──────────────────────────────────────────────────────────────────────────────────────────
  const contJug = html('<div class="hud-jugs"></div>');
  capa.appendChild(contJug);
  const paneles = new Map(); // indice → { el, ref, cache }

  function crearPanel(j) {
    const nodo = html(PLANTILLA_JUG);
    nodo.dataset.i = String(j.indice);
    contJug.appendChild(nodo);
    const r = (s) => nodo.querySelector(s);
    const p = {
      el: nodo, estados: new Map(), rolId: null, armaId: null, secId: null,
      perdida: 1, tPerdida: 0, vidaPrev: j.vida, tecla: null,
      ref: {
        retr: r('.jug-retr'), tag: r('.jug-tag'), rol: r('.jug-rol'), est: r('.jug-est'),
        vida: r('.vida'), vidaAct: r('.vida-actual'), vidaPer: r('.vida-perdida'), vidaCura: r('.vida-cura'), vidaTxt: r('.vida-txt'),
        armaIco: r('.arma-ico'), armaNom: r('.arma-nombre'), munAct: r('.mun-act'), munRes: r('.mun-res'), munAviso: r('.mun-aviso'), munBarra: r('.mun-barra i'), munBarraEl: r('.mun-barra'),
        sec: r('.sec'), secIco: r('.sec-ico'), secMun: r('.sec-mun'), secTecla: r('.sec-tecla'),
        arrojPips: r('.arroj-pips'), arrojTecla: r('.arroj-tecla'),
        hab: r('.hab'), habProg: r('.hab-prog'), habIco: r('.hab-ico'), habT: r('.hab-t'), habTecla: r('.hab-tecla'), aviso: r('.jug-aviso'),
      },
    };
    p.ref.habProg.style.strokeDasharray = (2 * Math.PI * 19).toFixed(2);
    return p;
  }

  ctx.en('jugador:danio', (d) => {
    const p = paneles.get(d.jugador?.indice); if (!p) return;
    relanzar(p.el, 'golpe');
    relanzar(flash, 'on');
  });
  ctx.en('jugador:curado', (d) => {
    const p = paneles.get(d.jugador?.indice); if (!p) return;
    relanzar(p.ref.vidaCura, 'on');
  });
  ctx.en('jugador:habilidad', (d) => {
    const p = paneles.get(d.jugador?.indice); if (!p) return;
    relanzar(p.ref.hab, 'usada');
  });
  ctx.en('jugador:arma', (d) => {
    const p = paneles.get(d.jugador?.indice); if (!p) return;
    relanzar(p.ref.armaIco, 'cambio');
  });
  ctx.en('arma:vacia', (d) => {
    const p = paneles.get(d.portador?.indice); if (!p) return;
    relanzar(p.ref.munAct, 'anim-sacude');
  });
  ctx.en('puntos', () => { relanzar(E.puntos, 'sube'); });

  const claveMando = (i) => (juego.entrada?.dispositivo?.(i) === 'mando');

  function actualizarEstados(p, j) {
    const mapa = p.estados;
    const vistos = new Set();
    const lista = j.estados ? Array.from(j.estados.entries()) : [];
    for (const [nombre, e] of lista) {
      const meta = ESTADOS[nombre];
      if (!meta) continue;
      vistos.add(nombre);
      let n = mapa.get(nombre);
      if (!n) {
        n = html(`<span class="est ${meta.tono}" title="${meta.nombre}">${icono(meta.icono)}<b class="num"></b></span>`);
        n.__b = n.querySelector('b');
        mapa.set(nombre, n); p.ref.est.appendChild(n);
      }
      visible(n, true);
      texto(n.__b, e.resta > 0 && e.resta < 99 ? Math.ceil(e.resta) : '');
    }
    for (const [nombre, n] of mapa) if (!vistos.has(nombre)) visible(n, false);
  }

  function actualizarPanel(p, j, dt, i) {
    const R = p.ref;
    const rolId = j.rol?.id;
    if (rolId !== p.rolId) {
      p.rolId = rolId;
      const rol = ROLES[rolId];
      contenido(R.retr, retratoRol(rolId));
      texto(R.rol, rol?.nombre ?? '');
      texto(R.tag, 'J' + (j.indice + 1));
      estilo(p.el, '--rol', rol?.color ?? '#aaa');
      p.el.dataset.rol = rolId ?? '';
      contenido(R.habIco, icono(HAB_ICONO[rol?.habilidad?.id] || 'hab'));
    }
    const mando = claveMando(j.indice);
    texto(R.habTecla, mando ? 'LB' : 'Q'); clase(R.habTecla, 'mando', mando);
    texto(R.arrojTecla, mando ? 'LT' : 'G'); clase(R.arrojTecla, 'mando', mando);

    // ── vida ──
    const vmax = Math.max(1, j.vidaMax || 100), vida = limitar(j.vida ?? 0, 0, vmax), f = vida / vmax;
    estilo(R.vidaAct, '--v', f.toFixed(3));
    if (f < p.perdida) { p.tPerdida = 0.45; p.perdida = Math.max(f, p.perdida); }
    if (p.tPerdida > 0) p.tPerdida -= dt;
    else p.perdida = Math.max(f, p.perdida - dt * 0.5);
    if (f > p.perdida) p.perdida = f;
    estilo(R.vidaPer, '--v', p.perdida.toFixed(3));
    contenido(R.vidaTxt, `<b>${Math.ceil(vida)}</b>/${Math.round(vmax)}`);
    clase(R.vida, 'critica', f < 0.3 && j.vivo !== false);
    estilo(R.vidaAct, '--c', f < 0.3 ? 'var(--vida)' : f < 0.6 ? 'var(--vida-2)' : 'var(--vida-ok)');
    const abatido = j.caido || j.vivo === false;
    clase(p.el, 'abatido', !!abatido);
    clase(p.el, 'muerto', !!j.muerto);
    if (abatido) {
      texto(R.aviso, j.muerto ? 'CAÍDO' : `ABATIDO · ${Math.round((j.progresoReanimar || 0) * 100)} %`);
    } else texto(R.aviso, '');
    visible(R.aviso, !!abatido);

    // ── arma ──
    const inst = j.arma, def = inst?.def;
    if (def && def.id !== p.armaId) { p.armaId = def.id; contenido(R.armaIco, iconoDeArma(def)); texto(R.armaNom, def.nombre); }
    if (inst) {
      const cargador = Math.max(1, def?.cargador ?? 1);
      const infinita = j.mods?.municionInfinita || (j.habilidad?.activa && j.rol?.id === 'soldado');
      const reservaInf = inst.reserva < 0 || def?.reserva === -1;
      texto(R.munAct, inst.municion ?? 0);
      texto(R.munRes, infinita ? ' / ∞' : reservaInf ? ' / ∞' : ` / ${Math.max(0, Math.round(inst.reserva ?? 0))}`);
      const rec = !!inst.recargando;
      const frac = rec ? limitar(inst.progresoRecarga ?? 0, 0, 1) : limitar((inst.municion ?? 0) / cargador, 0, 1);
      estilo(R.munBarra, '--v', frac.toFixed(3));
      clase(R.munBarraEl, 'recargando', rec);
      const bajo = !rec && (inst.municion ?? 0) <= Math.max(0, Math.floor(cargador * 0.2)) && cargador > 2;
      const vacio = !rec && (inst.municion ?? 0) <= 0;
      const sinReserva = !reservaInf && !infinita && (inst.reserva ?? 0) <= 0;
      clase(R.munBarraEl, 'bajo', bajo || vacio);
      clase(p.el, 'mun-baja', (bajo || vacio) && !rec);
      texto(R.munAviso, rec ? 'RECARGANDO' : vacio && sinReserva ? 'SIN MUNICIÓN' : bajo ? '¡RECARGA!' : '');
      clase(R.munAviso, 'urgente', !rec && (vacio || bajo));
    }
    // ── arma secundaria ──
    const otra = j.armas && j.armas.length > 1 ? j.armas[1 - (j.armaIdx || 0)] : null;
    visible(R.sec, !!otra);
    if (otra?.def) {
      if (otra.def.id !== p.secId) { p.secId = otra.def.id; contenido(R.secIco, iconoDeArma(otra.def, 96)); }
      const inf = otra.reserva < 0 || otra.def.reserva === -1;
      texto(R.secMun, `${otra.municion ?? 0}${inf ? ' · ∞' : ' / ' + Math.round(Math.max(0, otra.reserva ?? 0))}`);
      texto(R.secTecla, String((1 - (j.armaIdx || 0)) + 1));
    }
    // ── arrojadizas ──
    const n = j.arrojadizas ?? 0, nmax = Math.max(n, j.arrojadizasMax ?? 0);
    const pips = (nmax > 6 ? `<b class="num">×${n}</b>` : Array.from({ length: nmax }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join(''));
    contenido(R.arrojPips, pips);
    // ── habilidad ──
    const h = j.habilidad;
    if (h) {
      const activa = !!h.activa;
      const total = Math.max(0.001, h.total || h.def?.enfriamiento || 1);
      const listo = (h.restante ?? 0) <= 0.001;
      let prog; // 0..1 de anillo rellenado
      if (activa) prog = limitar((h.tiempoActiva ?? 0) / Math.max(0.001, h.duracion || h.def?.duracion || 1), 0, 1);
      else prog = listo ? 1 : 1 - limitar(h.restante / total, 0, 1);
      estilo(R.habProg, 'strokeDashoffset', ((1 - prog) * 2 * Math.PI * 19).toFixed(2));
      clase(R.hab, 'lista', listo && !activa);
      clase(R.hab, 'activa', activa);
      clase(R.hab, 'silenciada', (j.silenciado ?? 0) > 0);
      texto(R.habT, !listo && !activa ? Math.ceil(h.restante) : '');
    }
    actualizarEstados(p, j);
  }

  // ── actualización por cuadro ────────────────────────────────────────────────────────────────────────────────────
  let puntosMostrados = 0, puntosTexto = '', rachaPrev = 0, multPrev = 1, zombPrev = -1;
  const hudMundo = crearHudMundo(ctx, { paneles });
  const minimapa = crearMinimapa(ctx, E.mini);

  function actualizar(dt) {
    const enMenu = est.fase === 'menu';
    if (enMenu) return;
    // Arriba: zombis
    const rest = est.zombisRestantes ?? 0, tot = Math.max(1, est.zombisTotales ?? 1);
    texto(E.zombNum, rest);
    if (rest !== zombPrev && zombPrev >= 0 && rest < zombPrev) relanzar(E.zombNum, 'anim-pop');
    zombPrev = rest;
    estilo(E.zombBarra, '--v', limitar(rest / tot, 0, 1).toFixed(3));
    clase(sup.querySelector('.zomb'), 'pocos', rest > 0 && rest <= 5);
    // Hora del día
    const h = est.hora ?? 0.5;
    const [pNom, pIco] = periodoDelDia(h);
    texto(E.horaTxt, pNom);
    contenido(E.horaIco, icono(pIco));
    estilo(E.horaMarca, 'left', (((h % 1) + 1) % 1 * 100).toFixed(1) + '%');
    // Puntuación
    const objetivo = est.puntos ?? 0;
    if (Math.abs(objetivo - puntosMostrados) < 1) puntosMostrados = objetivo;
    else puntosMostrados += (objetivo - puntosMostrados) * Math.min(1, dt * 9) + Math.sign(objetivo - puntosMostrados) * 0.5;
    const shown = Math.round(puntosMostrados);
    const fmt = formatoPuntos(shown);
    const clave = fmt.ceros + '|' + fmt.cifras;
    if (clave !== puntosTexto) { puntosTexto = clave; texto(E.ceros, fmt.ceros); texto(E.cifras, fmt.cifras); }
    // Racha
    const racha = est.racha ?? 0, mult = est.multiplicador ?? 1, rr = limitar(est.rachaRestante ?? 0, 0, 1);
    texto(E.rachaMult, '×' + mult); texto(E.rachaNum, racha);
    estilo(E.rachaProg, 'strokeDashoffset', ((1 - (racha > 0 ? rr : 0)) * RACHA_LEN).toFixed(2));
    E.racha.dataset.nivel = String(Math.min(5, mult));
    clase(E.racha, 'activa', racha > 0);
    clase(E.racha, 'urgente', racha > 0 && rr < 0.35);
    if (racha > rachaPrev) relanzar(E.rachaMult, 'anim-pop');
    if (mult > multPrev) relanzar(E.racha, 'anim-sacude');
    rachaPrev = racha; multPrev = mult;
    // Calendario
    const era = ERAS[est.eraIdx] || ERAS[0];
    visible(E.calendario, (est.dia ?? 0) > 0);
    texto(E.calDia, `DÍA ${est.dia ?? 0}`); texto(E.calAnio, `AÑO ${est.anio ?? 1800}`); texto(E.calEra, era.nombre);
    texto(E.bajas, est.bajas ?? 0);
    // Jefe
    if (jefeActual) {
      if (jefeActual.vivo === false) { jefeActual = null; visible(jefeEl, false); }
      else {
        const f = limitar((jefeActual.vida ?? 0) / Math.max(1, jefeActual.vidaMax ?? 1), 0, 1);
        estilo(J.vida, '--v', f.toFixed(3));
        if (f < jefePerdida) jefePerdida = Math.max(f, jefePerdida - dt * 0.18);
        estilo(J.perdida, '--v', jefePerdida.toFixed(3));
      }
    } else if (est.jefe && est.jefe.vivo !== false) {
      // El jefe ya estaba en marcha (p. ej. se creó la UI después): lo adopta.
      const j = est.jefe; jefeActual = j; jefePerdida = 1;
      texto(J.nombre, (j.def?.nombre ?? j.nombre ?? 'JEFE').toUpperCase()); texto(J.titulo, j.def?.titulo ?? ''); visible(jefeEl, true);
    }
    // Paneles de jugador
    const ids = new Set();
    for (const j of juego.jugadores) {
      let p = paneles.get(j.indice);
      if (!p) { p = crearPanel(j); paneles.set(j.indice, p); }
      ids.add(j.indice);
      visible(p.el, true);
      actualizarPanel(p, j, dt, j.indice);
    }
    for (const [i, p] of paneles) if (!ids.has(i)) visible(p.el, false);
    contJug.dataset.n = String(ids.size);
    // Viñeta de poca vida
    let minF = 1, hayVivo = false;
    for (const j of juego.jugadores) { if (j.vivo === false) continue; hayVivo = true; minF = Math.min(minF, (j.vida ?? 0) / Math.max(1, j.vidaMax || 100)); }
    const critica = hayVivo ? limitar((0.38 - minF) / 0.38, 0, 1) : 0;
    estilo(vineta, 'opacity', critica.toFixed(2));
    clase(vineta, 'latido', critica > 0.55);
    hudMundo.actualizar(dt);
    minimapa.actualizar(dt);
  }

  return {
    actualizar, paneles,
    destruir() { hudMundo.destruir?.(); minimapa.destruir?.(); sup.remove(); jefeEl.remove(); vineta.remove(); flash.remove(); contJug.remove(); },
  };
}
