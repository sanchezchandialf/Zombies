// Momentos de la partida: cuenta atrás, anuncio de oleada, «día superado», cola de mensajes, presentación de jefe,
// salto de era e intermedio con mejoras. Todos reaccionan a los eventos del contrato y reutilizan sus nodos.
import { ERAS } from '../datos/eras.js';
import { ROLES } from '../datos/roles.js';
import { ARMAS } from '../datos/armas.js';
import { JEFES } from '../datos/zombis.js';
import { RAREZAS } from '../datos/mejoras.js';
import { icono } from './iconos.js';
import { iconoDeArma } from './armasUI.js';
import { retratoRol, retratoJefe } from './retratos.js';
import { SABOR_ERA, subtituloDeDia, NOMBRE_VEHICULO, NOMBRE_EMPLAZAMIENTO, NOMBRE_EXPLOSIVO, NOMBRE_TORRETA } from './textos.js';
import { html, texto, contenido, clase, estilo, visible, relanzar, limitar, escapar, numero, reloj } from './util.js';

const ICONO_MSG = { info: 'estrella', aviso: 'flecha', logro: 'corona', jefe: 'calavera' };

export function crearMomentos(ctx) {
  const { juego, capas } = ctx;
  const est = juego.estado;
  const capa = capas.momentos;

  const raiz = html(`<div class="mm">
    <div class="mm-cuenta" hidden><span class="mm-cuenta-t rotulo">Preparados</span><span class="mm-cuenta-n num"></span></div>
    <div class="mm-anuncio" hidden></div>
    <div class="mm-superado" hidden></div>
    <div class="mm-jefe" hidden></div>
    <div class="mm-mensajes"></div>
    <div class="mm-salto" hidden><div class="sl-t rotulo">Salto temporal</div><div class="sl-anio num"></div><div class="sl-rayas"></div></div>
    <div class="mm-era" hidden></div>
    <div class="mm-inter" hidden></div>
  </div>`);
  capa.appendChild(raiz);
  const q = (s) => raiz.querySelector(s);
  const N = { cuenta: q('.mm-cuenta'), cuentaN: q('.mm-cuenta-n'), anuncio: q('.mm-anuncio'), superado: q('.mm-superado'), jefe: q('.mm-jefe'), mensajes: q('.mm-mensajes'), salto: q('.mm-salto'), saltoAnio: q('.sl-anio'), era: q('.mm-era'), inter: q('.mm-inter') };

  // ── temporizadores de aparición ──────────────────────────────────────────────────────────────────────────────────
  const timers = []; // { nodo, t, dur }
  function mostrar(nodo, dur) {
    visible(nodo, true);
    nodo.classList.remove('sale');
    relanzar(nodo, 'entra');
    const i = timers.findIndex((x) => x.nodo === nodo);
    if (i >= 0) timers.splice(i, 1);
    timers.push({ nodo, t: dur, dur });
  }
  function ocultar(nodo, rapido = false) {
    const i = timers.findIndex((x) => x.nodo === nodo);
    if (i >= 0) timers.splice(i, 1);
    if (rapido || nodo.hidden) { visible(nodo, false); return; }
    nodo.classList.add('sale');
    setTimeout(() => { if (nodo.classList.contains('sale')) visible(nodo, false); }, 600);
  }
  function limpiarTodo() {
    for (const n of [N.anuncio, N.superado, N.jefe, N.era, N.salto, N.cuenta]) ocultar(n, true);
    timers.length = 0;
    mensajesActivos.forEach((m) => m.nodo.remove());
    mensajesActivos.length = 0; cola.length = 0;
  }

  // ══ Cuenta atrás de la oleada ═══════════════════════════════════════════════════════════════════════════════════
  let cuentaPrev = -1;
  function actualizarCuenta() {
    const c = est.subfase === 'cuenta' ? est.cuenta ?? 0 : 0;
    const mostrarla = c > 0 && est.fase === 'jugando';
    visible(N.cuenta, mostrarla);
    if (mostrarla && c !== cuentaPrev) { texto(N.cuentaN, c); relanzar(N.cuentaN, 'tic'); }
    cuentaPrev = mostrarla ? c : -1;
  }

  // ══ Anuncio de oleada ═══════════════════════════════════════════════════════════════════════════════════════════
  let suprimirDia = 0;
  ctx.en('oleada:inicio', (d) => {
    const era = ERAS[d.eraIdx ?? est.eraIdx] || ERAS[0];
    const tema = d.tematica ?? est.tematica ?? {};
    const sub = tema.subtitulo || subtituloDeDia(d.dia, era.idx, !!d.jefe);
    const sello = (SABOR_ERA[era.idx] || SABOR_ERA[0]).sello;
    N.anuncio.dataset.jefe = d.jefe ? '1' : '0';
    contenido(N.anuncio, `
      <div class="an-sello rotulo">${escapar(d.jefe ? 'Día de jefe' : sello)}</div>
      <div class="an-dia titulo">DÍA ${d.dia}</div>
      <div class="an-linea"><i></i><span class="an-anio num">AÑO ${d.anio}</span><i></i></div>
      <div class="an-nombre titulo">${escapar(tema.nombre ?? '')}</div>
      <div class="an-sub">${escapar(sub)}</div>
      <div class="an-total rotulo">${numero(d.total ?? est.zombisTotales ?? 0)} zombis en camino</div>`);
    mostrar(N.anuncio, 4.4);
    ocultar(N.superado, true);
    suprimirDia = 0.4; // el Director emite además un `mensaje` equivalente: se descarta
  });

  // ══ Día superado ════════════════════════════════════════════════════════════════════════════════════════════════
  ctx.en('oleada:fin', (d) => {
    const era = ERAS[est.eraIdx] || ERAS[0];
    const b = d.bonus || {};
    const filas = [];
    filas.push(['Bajas de la jornada', numero(d.bajas ?? 0), 'calavera']);
    if (d.tiempo) filas.push(['Tiempo de oleada', reloj(d.tiempo), 'tiempo']);
    if (b.sinDanio) filas.push(['Sin recibir daño', '+' + numero(b.sinDanio), 'escudo', true]);
    if (b.tiempo) filas.push(['Bonus de tiempo', '+' + numero(b.tiempo), 'reloj', true]);
    contenido(N.superado, `
      <div class="su-sello rotulo">${escapar((SABOR_ERA[era.idx] || SABOR_ERA[0]).superado)}</div>
      <div class="su-titulo titulo">DÍA SUPERADO</div>
      <div class="su-dia">Día ${d.dia} · Año ${d.anio}</div>
      <div class="su-filas">${filas.map((f, i) => `<div class="su-fila${f[3] ? ' bonus' : ''}" style="--i:${i}">${icono(f[2])}<span>${f[0]}</span><b class="num">${f[1]}</b></div>`).join('')}</div>`);
    mostrar(N.superado, d.bonus && (d.bonus.sinDanio || d.bonus.tiempo) ? 3.6 : 3.0);
    ocultar(N.anuncio, true);
  });

  // ══ Cola de mensajes ═══════════════════════════════════════════════════════════════════════════════════════════
  const cola = [], mensajesActivos = [];
  const MAX_VISIBLES = 3, MAX_COLA = 6;
  function mensaje(m) {
    if (!m || !m.texto) return;
    const tipo = ICONO_MSG[m.tipo] ? m.tipo : 'info';
    // Los avisos de día y de jefe del Director los cubren el anuncio y la presentación propios.
    if (suprimirDia > 0 && tipo === 'aviso' && /^D[ií]a\s+\d+/i.test(m.texto)) return;
    if (tipo === 'jefe' && Object.values(JEFES).some((j) => j.nombre.toUpperCase() === String(m.texto).toUpperCase())) return;
    const duplicado = [...cola, ...mensajesActivos].find((x) => x.texto === m.texto);
    if (duplicado) { if (duplicado.nodo) duplicado.t = Math.max(duplicado.t, m.duracion ?? 3); return; }
    if (cola.length >= MAX_COLA) cola.shift();
    cola.push({ texto: String(m.texto), subtitulo: m.subtitulo ? String(m.subtitulo) : '', tipo, t: m.duracion ?? 3 });
  }
  ctx.en('mensaje', (d) => mensaje(d));

  function actualizarMensajes(dt) {
    for (let i = mensajesActivos.length - 1; i >= 0; i--) {
      const m = mensajesActivos[i];
      m.t -= dt;
      if (m.t <= 0.45 && !m.saliendo) { m.saliendo = true; m.nodo.classList.add('sale'); }
      if (m.t <= 0) { m.nodo.remove(); mensajesActivos.splice(i, 1); }
    }
    while (cola.length && mensajesActivos.length < MAX_VISIBLES) {
      const m = cola.shift();
      m.nodo = html(`<div class="msg ${m.tipo} entra"><span class="msg-ico">${icono(ICONO_MSG[m.tipo])}</span><div class="msg-cuerpo"><div class="msg-t titulo">${escapar(m.texto)}</div>${m.subtitulo ? `<div class="msg-s">${escapar(m.subtitulo)}</div>` : ''}</div></div>`);
      N.mensajes.appendChild(m.nodo);
      mensajesActivos.push(m);
    }
  }

  // ══ Presentación de jefe ═══════════════════════════════════════════════════════════════════════════════════════
  ctx.en('jefe:aparece', (d) => {
    const j = d.jefe; if (!j) return;
    const def = j.def ?? JEFES[j.id] ?? {};
    const id = def.id ?? j.id;
    contenido(N.jefe, `
      <div class="je-banda">
        <div class="je-retr">${retratoJefe(id)}</div>
        <div class="je-texto">
          <div class="je-rot rotulo">${def.final ? 'Jefe final' : 'Jefe de la era'}</div>
          <div class="je-nombre titulo">${escapar((def.nombre ?? j.nombre ?? 'Jefe').toUpperCase())}</div>
          <div class="je-titulo">${escapar(def.titulo ?? '')}</div>
          <div class="je-desc">${escapar(def.descripcion ?? '')}</div>
        </div>
      </div>`);
    mostrar(N.jefe, 4.2);
  });

  // ══ Salto temporal y rótulo de era ═════════════════════════════════════════════════════════════════════════════
  let anioMostrado = est.anio ?? 1800, anioObjetivo = anioMostrado, saltoT = 0, ultimoAnioFuera = est.anio ?? 1800;
  function actualizarSalto(dt) {
    const enTransicion = est.fase === 'transicion';
    if (enTransicion && N.salto.hidden && N.era.hidden) {
      anioMostrado = ultimoAnioFuera; saltoT = 0;
      visible(N.salto, true); relanzar(N.salto, 'entra'); N.salto.classList.remove('sale');
    }
    if (enTransicion) {
      saltoT += dt;
      anioObjetivo = est.anio ?? anioObjetivo;
      const u = limitar(saltoT / 1.7, 0, 1), e = 1 - Math.pow(1 - u, 3);
      anioMostrado = Math.round(ultimoAnioFuera + (anioObjetivo - ultimoAnioFuera) * e);
      texto(N.saltoAnio, anioMostrado);
    } else {
      if (!N.salto.hidden) ocultar(N.salto);
      ultimoAnioFuera = est.anio ?? ultimoAnioFuera;
    }
  }

  ctx.en('era:cambio', (d) => {
    const era = d.era ?? ERAS[d.eraIdx] ?? ERAS[0];
    const sab = SABOR_ERA[era.idx] || SABOR_ERA[0];
    const equipo = juego.jugadores.map((j) => {
      const rol = j.rol ?? ROLES[j.rolId];
      if (!rol) return '';
      const ids = [rol.equipo.primaria, rol.equipo.secundaria].map((a) => era.armas[a]).filter(Boolean);
      return `<div class="er-jug" style="--rol:${rol.color}"><div class="er-retr">${retratoRol(rol.id)}</div>
        <div class="er-armas">${ids.map((id) => `<div class="er-arma"><span class="er-ico">${iconoDeArma(id, 128)}</span><span class="er-nom">${escapar(ARMAS[id]?.nombre ?? id)}</span></div>`).join('')}</div></div>`;
    }).join('');
    contenido(N.era, `
      <div class="er-fondo"></div>
      <div class="er-centro">
        <div class="er-rot rotulo">${escapar(sab.saltoRotulo)} · ${escapar(sab.sello)}</div>
        <div class="er-nombre titulo">${escapar(era.nombre)}</div>
        <div class="er-anios num"><i></i>${era.anios[0]} — ${era.anios[1]}<i></i></div>
        <div class="er-lema">«${escapar(era.lema)}»</div>
        <div class="er-lugar">${icono('mapa')}${escapar(era.nombreEscenario ?? '')}</div>
        ${equipo ? `<div class="er-equipo"><div class="rotulo">Nuevo equipo</div><div class="er-equipo-fila">${equipo}</div></div>` : ''}
        <div class="er-extras">
          <span class="chip">${icono('vehiculo')}${escapar(NOMBRE_VEHICULO[era.vehiculo] ?? era.vehiculo)}</span>
          <span class="chip">${icono('torreta')}${escapar(NOMBRE_TORRETA[era.torreta] ?? era.torreta)}</span>
          <span class="chip">${icono('explosivo')}${escapar(NOMBRE_EMPLAZAMIENTO[era.emplazamiento] ?? era.emplazamiento)}</span>
          <span class="chip">${icono('fuego')}${escapar(NOMBRE_EXPLOSIVO[era.explosivo] ?? era.explosivo)}</span>
        </div>
      </div>`);
    ocultar(N.salto, true);
    mostrar(N.era, 5.4);
  });

  // ══ Intermedio: tres cartas de mejora por jugador ═════════════════════════════════════════════════════════════
  const I = { activo: false, total: 20, jugadores: [], lista: [] }; // lista: { indice, elegida, resalte, cartas[], col, estado }
  const TECLAS_J = [['Digit1', 'Digit2', 'Digit3'], ['Digit7', 'Digit8', 'Digit9']];
  const TECLAS_NUM = [['Numpad1', 'Numpad2', 'Numpad3'], ['Numpad7', 'Numpad8', 'Numpad9']];

  function jugadorDePad(pad) {
    const n = I.lista.length;
    if (n <= 1) return I.lista[0] ?? null;
    const pads = ctx.nav.pads();
    const dosPads = pads.length >= 2;
    const slotJ2 = I.lista[1], slotJ1 = I.lista[0];
    if (dosPads) return pad === pads[0] ? slotJ1 : slotJ2;
    return slotJ2;
  }

  function cartaHtml(m, k, indice, muchos) {
    const r = RAREZAS[m.rareza] || RAREZAS.comun;
    const nuevo = (m.nivel ?? 0) <= 0;
    return `<button type="button" class="carta r-${m.rareza}${muchos ? ' compacta' : ''}" data-i="${indice}" data-k="${k}" data-id="${escapar(m.id)}" style="--r:${r.color};--k:${k}">
      <span class="carta-tecla tecla">${TECLAS_J[indice]?.[k]?.replace('Digit', '') ?? k + 1}</span>
      <span class="carta-rareza rotulo">${escapar(r.nombre)}</span>
      <span class="carta-medalla">${icono(m.icono || 'estrella')}</span>
      <span class="carta-nombre titulo">${escapar(m.nombre)}</span>
      <span class="carta-desc">${escapar(m.descripcion)}</span>
      <span class="carta-nivel rotulo">${nuevo ? 'Nueva' : 'Nivel ' + (m.nivel + 1) + (m.max ? ' / ' + m.max : '')}</span>
    </button>`;
  }

  function elegir(slot, k) {
    if (!I.activo || !slot || slot.elegida != null) return;
    const carta = slot.cartas[k];
    if (!carta) return;
    marcarElegida(slot, carta.dataset.id);
    ctx.emitir('ui:elegirMejora', { indiceJugador: slot.indice, mejoraId: carta.dataset.id });
  }
  function marcarElegida(slot, id) {
    if (slot.elegida != null) return;
    slot.elegida = id;
    slot.cartas.forEach((c) => { const si = c.dataset.id === id; c.classList.toggle('elegida', si); c.classList.toggle('descartada', !si); c.classList.remove('resalte'); });
    texto(slot.estado, 'Mejora elegida');
    slot.col.classList.add('lista');
  }
  function resaltar(slot, k) {
    if (!slot || slot.elegida != null) return;
    slot.resalte = (k + slot.cartas.length) % slot.cartas.length;
    slot.cartas.forEach((c, i) => c.classList.toggle('resalte', i === slot.resalte));
  }

  ctx.en('intermedio:inicio', (d) => {
    I.activo = true; I.total = Math.max(1, d.duracion ?? 20);
    const lista = d.porJugador?.length ? d.porJugador : [{ indice: 0, rol: juego.jugadores[0]?.rol?.id ?? 'soldado', mejoras: d.mejoras ?? [] }];
    const muchos = lista.length > 1;
    const sigEra = ERAS[d.eraSiguiente ?? est.eraIdx] || ERAS[0];
    const cambiaEra = (d.eraSiguiente ?? est.eraIdx) !== est.eraIdx;
    const sab = SABOR_ERA[est.eraIdx] || SABOR_ERA[0];
    contenido(N.inter, `
      <div class="in-cab">
        <div class="in-rot rotulo">${escapar(sab.superado)}</div>
        <div class="in-titulo titulo">Amanecer</div>
        <div class="in-sub">Día ${d.dia} superado. Elige una mejora.</div>
      </div>
      <div class="in-reloj"><svg viewBox="0 0 60 60"><circle class="ir-pista" cx="30" cy="30" r="25"/><circle class="ir-prog" cx="30" cy="30" r="25" transform="rotate(-90 30 30)"/></svg><span class="in-seg num"></span><span class="rotulo ir-txt">segundos</span></div>
      <div class="in-cols${muchos ? ' dos' : ''}">${lista.map((p) => {
        const rol = ROLES[p.rol] || {};
        return `<section class="in-col" data-i="${p.indice}" style="--rol:${rol.color ?? '#fff'}">
          <header class="in-col-cab"><span class="in-retr">${retratoRol(p.rol)}</span><span class="in-col-id"><b class="jug-tag num">J${p.indice + 1}</b><span class="titulo">${escapar(rol.nombre ?? p.rol)}</span></span><span class="in-estado rotulo">Elige una carta</span></header>
          <div class="in-cartas">${p.mejoras.map((m, k) => cartaHtml(m, k, p.indice, muchos)).join('') || '<div class="in-nada rotulo">Sin mejoras disponibles</div>'}</div>
        </section>`;
      }).join('')}</div>
      <div class="in-pie">
        <div class="in-prox panel"><span class="rotulo">Próximo</span><b class="titulo">Día ${d.diaSiguiente} · Año ${d.anioSiguiente}</b><span class="in-era${cambiaEra ? ' cambia' : ''}">${escapar(sigEra.nombre)}${cambiaEra ? ' · ¡salto de era!' : ''}</span></div>
        <button type="button" class="btn mini in-saltar" data-saltar>${icono('jugar')}<span>Continuar ya</span></button>
        <div class="in-ayuda rotulo"><span class="tecla">1</span><span class="tecla">2</span><span class="tecla">3</span> elegir · clic · <span class="tecla mando">◄ ►</span><span class="tecla mando">A</span> mando</div>
      </div>`);
    I.lista = Array.from(N.inter.querySelectorAll('.in-col')).map((col) => ({
      indice: Number(col.dataset.i), col, cartas: Array.from(col.querySelectorAll('.carta')), elegida: null, resalte: -1, estado: col.querySelector('.in-estado'),
    }));
    I.seg = N.inter.querySelector('.in-seg'); I.prog = N.inter.querySelector('.ir-prog'); I.reloj = N.inter.querySelector('.in-reloj');
    I.prog.style.strokeDasharray = (2 * Math.PI * 25).toFixed(2);
    I.lista.forEach((s) => resaltar(s, 0));
    N.inter.onclick = (ev) => {
      const c = ev.target.closest('.carta');
      if (c) { const s = I.lista.find((x) => x.indice === Number(c.dataset.i)); if (s) elegir(s, Number(c.dataset.k)); return; }
      if (ev.target.closest('[data-saltar]')) ctx.emitir('ui:saltarIntermedio', {});
    };
    N.inter.onpointerover = (ev) => {
      const c = ev.target.closest('.carta');
      if (c) { const s = I.lista.find((x) => x.indice === Number(c.dataset.i)); if (s) resaltar(s, Number(c.dataset.k)); }
    };
    ocultar(N.superado, true); ocultar(N.anuncio, true);
    visible(N.inter, true); relanzar(N.inter, 'entra'); N.inter.classList.remove('sale');
    quitarNav?.(); quitarNav = ctx.nav.suscribir(accionPad);
  });
  let quitarNav = null;
  ctx.en('mejora:aplicada', (d) => {
    const slot = I.lista.find((s) => s.indice === d.jugador?.indice);
    if (slot && d.mejora) marcarElegida(slot, d.mejora.id);
  });
  ctx.en('intermedio:fin', () => {
    I.activo = false; quitarNav?.(); quitarNav = null;
    ocultar(N.inter);
  });

  function accionPad({ accion, pad }) {
    if (!I.activo || N.inter.hidden || pad < 0) return false;
    const slot = jugadorDePad(pad);
    if (!slot) return false;
    if (accion === 'izq') { resaltar(slot, (slot.resalte < 0 ? 0 : slot.resalte) - 1); return true; }
    if (accion === 'der') { resaltar(slot, (slot.resalte < 0 ? 0 : slot.resalte) + 1); return true; }
    if (accion === 'ok') { elegir(slot, Math.max(0, slot.resalte)); return true; }
    if (accion === 'start' && I.lista.every((s) => s.elegida != null)) { ctx.emitir('ui:saltarIntermedio', {}); return true; }
    return false;
  }
  const onTecla = (ev) => {
    if (!I.activo || N.inter.hidden || ev.repeat) return;
    for (let j = 0; j < I.lista.length; j++) {
      const slot = I.lista[j];
      const mapa = TECLAS_J[slot.indice] || [];
      const k = mapa.indexOf(ev.code) >= 0 ? mapa.indexOf(ev.code) : (TECLAS_NUM[slot.indice] || []).indexOf(ev.code);
      if (k >= 0) { elegir(slot, k); return; }
    }
    if (ev.code === 'Enter' || ev.code === 'NumpadEnter') {
      if (I.lista.every((s) => s.elegida != null)) ctx.emitir('ui:saltarIntermedio', {});
    }
  };
  addEventListener('keydown', onTecla);

  function actualizarIntermedio() {
    if (!I.activo || N.inter.hidden) return;
    const rest = Math.max(0, est.intermedioRestante ?? 0);
    texto(I.seg, Math.ceil(rest));
    estilo(I.prog, 'strokeDashoffset', ((1 - limitar(rest / I.total, 0, 1)) * 2 * Math.PI * 25).toFixed(2));
    clase(I.reloj, 'urgente', rest <= 5);
    const todos = I.lista.every((s) => s.elegida != null);
    clase(N.inter, 'completo', todos);
  }

  // ══ Cambios de partida ═════════════════════════════════════════════════════════════════════════════════════════
  ctx.en('partida:inicio', () => { limpiarTodo(); visible(N.inter, false); I.activo = false; });
  ctx.en('partida:fin', () => { limpiarTodo(); visible(N.inter, false); I.activo = false; quitarNav?.(); quitarNav = null; });
  ctx.en('ui:menu', () => { limpiarTodo(); visible(N.inter, false); I.activo = false; });

  return {
    mensaje,
    actualizar(dt) {
      if (suprimirDia > 0) suprimirDia -= dt;
      const dtV = est.pausado ? 0 : dt;
      for (let i = timers.length - 1; i >= 0; i--) {
        const t = timers[i];
        t.t -= dtV;
        if (t.t <= 0.5 && !t.nodo.classList.contains('sale')) t.nodo.classList.add('sale');
        if (t.t <= 0) { visible(t.nodo, false); timers.splice(i, 1); }
      }
      if (est.fase === 'menu') { if (!N.era.hidden || !N.anuncio.hidden || !N.inter.hidden || !N.salto.hidden || !N.jefe.hidden) limpiarTodo(), visible(N.inter, false); return; }
      clase(ctx.raiz, 'ez-cubierto', !N.era.hidden || !N.salto.hidden || !N.inter.hidden);
      actualizarCuenta();
      actualizarMensajes(dtV);
      actualizarSalto(dt);
      actualizarIntermedio();
      // Salir del intermedio por una vía no anunciada (p. ej. depuración).
      if (I.activo && est.fase !== 'intermedio' && est.fase !== 'jugando' && est.fase !== 'transicion') { I.activo = false; visible(N.inter, false); }
    },
    destruir() { removeEventListener('keydown', onTecla); quitarNav?.(); raiz.remove(); },
  };
}
