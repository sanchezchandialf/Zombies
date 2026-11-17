// Entrada del jugador: teclado + ratón (J1) y mandos (API Gamepad, J1/J2). Contrato en docs/ARQUITECTURA.md §Entrada.
//
//   entrada.de(indice) → intención del cuadro (ver intencionVacia). Los flancos se calculan UNA vez por cuadro.
//   entrada.vibrar(indice, fuerza 0..1, duracion s)
//   entrada.dispositivo(indice) → 'teclado' | 'mando'
//
// Añadido al contrato:
//   entrada.simular(indice, parcial | null)   gancho de pruebas: sustituye la entrada real de ese jugador. Los booleanos
//                                             son «botón mantenido» (los flancos se derivan solos); `cambiar` y `ranura`
//                                             se consumen en un cuadro. `null` devuelve el control a los dispositivos.
//   entrada.mandosConectados() → número        entrada.dosJugadores = bool (fuerza el reparto J1/J2 en menús)
//   entrada.asistencia = 0..1                  fuerza de la asistencia de apuntado con mando (0,7 por defecto)
//   entrada.gestionaPausa = true               Esc / P / Start conmutan juego.pausar() durante la partida
//   entrada.cursor = true                      dibuja una mira procedural como cursor mientras se juega con ratón
//   entrada.destruir()                         retira los oyentes del DOM
//
// Reparto de dispositivos: un jugador → teclado/ratón y el primer mando (se usa el último que se haya tocado).
// Dos jugadores → con dos mandos, J1 = teclado + mando 1 y J2 = mando 2; con un solo mando, J1 = teclado y J2 = mando.
import * as THREE from 'three';
import { amortiguar, difAngulo, girarHacia } from './util.js';

/** Intención de un jugador en este cuadro. Los campos marcados (flanco) solo valen `true` el cuadro en que se pulsa. */
export function intencionVacia() {
  return {
    moverX: 0, moverZ: 0,            // −1..1 en ejes del mundo (+X derecha, +Z hacia la cámara/abajo en pantalla)
    apuntar: { x: 0, z: 0 },         // punto del mundo al que apunta (ratón; con mando, el objetivo asistido o un punto al frente)
    dirApuntar: { x: 0, z: 1 },      // dirección normalizada de apuntado (siempre válida)
    usaMando: false,
    disparar: false, disparoPulsado: false,   // mantenido · flanco
    recargar: false, usar: false, usarMantenido: false, habilidad: false, lanzar: false, cuerpo: false, esquivar: false,
    cambiar: 0, ranura: -1,          // cambiar: −1/+1 (rueda, Y) · ranura: 0/1 (teclas 1 y 2), −1 = nada
    // ── añadidos ──
    lanzarMantenido: false,          // G / LT mantenido (previsualización de la arrojadiza; se lanza al soltar)
    cuerpoMantenido: false,          // F / clic derecho / RB mantenido (golpes encadenados)
    pausa: false,                    // flanco de Esc / P / Start
    magnitud: 0,                     // módulo del vector de movimiento (0..1): el stick permite andar despacio
    fuerzaApuntar: 0,                // inclinación del stick derecho (0..1); 1 con ratón
    objetivoAsistido: null,          // zombi hacia el que tira la asistencia de apuntado (solo mando)
  };
}

const BOTONES = ['disparar', 'recargar', 'usar', 'habilidad', 'lanzar', 'cuerpo', 'esquivar', 'pausa', 'cambiarSig', 'cambiarAnt'];
const TECLA = {
  KeyW: 'arriba', ArrowUp: 'arriba', KeyS: 'abajo', ArrowDown: 'abajo', KeyA: 'izq', ArrowLeft: 'izq', KeyD: 'der', ArrowRight: 'der',
  KeyR: 'recargar', KeyE: 'usar', KeyQ: 'habilidad', KeyG: 'lanzar', KeyF: 'cuerpo', Space: 'esquivar', ShiftLeft: 'esquivar',
  Digit1: 'ranura0', Digit2: 'ranura1', Numpad1: 'ranura0', Numpad2: 'ranura1', Escape: 'pausa', KeyP: 'pausa',
};
const SIN_DESPLAZAR = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

// Sticks: zona muerta radial reescalada + respuesta no lineal (control fino cerca del centro, tope antes del borde físico).
const ZONA_MUERTA_MOVER = 0.16, ZONA_MUERTA_APUNTAR = 0.24, ZONA_EXTERIOR = 0.94, CURVA_MOVER = 1.6;
const UMBRAL_GATILLO = 0.22;
// Asistencia de apuntado (solo mando).
const ASIST_CONO = 0.26;       // rad: semiángulo en el que un zombi «atrae» la mira
const ASIST_ALCANCE = 34;      // m
const ASIST_RAPIDEZ = 14;      // 1/s: suavizado del tirón

function crudoVacio() {
  const c = { mx: 0, mz: 0, apX: 0, apZ: 0, apMag: 0, cambiar: 0, ranura: -1, activo: false, b: {}, l: {} };
  for (const n of BOTONES) { c.b[n] = false; c.l[n] = false; }
  return c;
}
function limpiarCrudo(c) {
  c.mx = c.mz = c.apX = c.apZ = c.apMag = 0; c.cambiar = 0; c.ranura = -1; c.activo = false;
  for (const n of BOTONES) { c.b[n] = false; c.l[n] = false; }
  return c;
}

const _pal = { x: 0, y: 0, m: 0 };
function palanca(x, y, zonaMuerta, exponente) {
  const m = Math.hypot(x, y);
  if (!(m > zonaMuerta)) { _pal.x = 0; _pal.y = 0; _pal.m = 0; return _pal; }
  const n = Math.min(1, (m - zonaMuerta) / (ZONA_EXTERIOR - zonaMuerta));
  const k = Math.pow(n, exponente);
  _pal.x = (x / m) * k; _pal.y = (y / m) * k; _pal.m = k;
  return _pal;
}

function enFormulario(el = document.activeElement) {
  if (!el || el === document.body) return false;
  const t = el.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable === true;
}

/** Mira procedural para el cursor (sin recursos externos). tipo: 'normal' | 'impacto' | 'baja'. */
function crearCursor(tipo) {
  try {
    const n = 32, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), m = n / 2;
    const trazo = (color, ancho) => {
      g.strokeStyle = color; g.lineWidth = ancho; g.lineCap = 'round';
      g.beginPath();
      if (tipo === 'normal') {
        g.arc(m, m, 7.5, 0, Math.PI * 2);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(m + dx * 10.5, m + dy * 10.5); g.lineTo(m + dx * 14, m + dy * 14); }
      } else {
        const a = tipo === 'baja' ? 4 : 5.5, b = tipo === 'baja' ? 12.5 : 11;
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.moveTo(m + dx * a, m + dy * a); g.lineTo(m + dx * b, m + dy * b); }
      }
      g.stroke();
    };
    const color = tipo === 'baja' ? '#ff5340' : '#ffffff';
    trazo('rgba(0,0,0,0.75)', 4); trazo(color, 1.8);
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.arc(m, m, 2.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc(m, m, 1.3, 0, Math.PI * 2); g.fill();
    return `url(${c.toDataURL('image/png')}) ${m} ${m}, crosshair`;
  } catch { return 'crosshair'; }
}

export function crearEntrada(juego) {
  const ahoraReal = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const teclas = new Set();          // acciones de teclado mantenidas
  const pulsadas = new Set();        // acciones pulsadas desde el último cuadro (no se pierde un toque más corto que un cuadro)
  const raton = { x: 0, y: 0, valido: false, botones: 0, pulsados: 0, rueda: 0, bloqueado: false };
  const intenciones = [intencionVacia(), intencionVacia()];
  const fuera = intencionVacia();    // para índices sin jugador
  const previo = [{}, {}];           // botones mantenidos el cuadro anterior
  const sim = [null, null];
  const disp = ['teclado', 'mando'];
  const actTeclado = { t: 0 }, actMando = [-1, -1];
  const cTeclado = crudoVacio(), cMando = [crudoVacio(), crudoVacio()], cSim = crudoVacio();
  const apunt = [{ cruda: 0, desvio: 0, quieto: 9, objetivo: null }, { cruda: 0, desvio: 0, quieto: 9, objetivo: null }];
  const mandoDe = [null, null];
  const vib = [{ hasta: 0, fuerza: 0 }, { hasta: 0, fuerza: 0 }];
  const _p = new THREE.Vector3();
  const mandos = [];
  let tPrevio = ahoraReal(), tImpacto = 0, tBaja = 0, cursorPuesto = null;
  const cursores = {};
  const oyentes = [];

  const lienzo = () => juego.render?.renderer?.domElement ?? null;
  const jugador = (i) => { const l = juego.jugadores; for (let k = 0; k < l.length; k++) if (l[k].indice === i) return l[k]; return null; };
  const enPartida = () => { const f = juego.estado.fase; return f === 'jugando' || f === 'intermedio' || f === 'transicion'; };

  // ───────────── Oyentes del DOM ─────────────
  function oir(objetivo, tipo, fn, opciones) {
    if (!objetivo?.addEventListener) return;
    objetivo.addEventListener(tipo, fn, opciones);
    oyentes.push(() => objetivo.removeEventListener(tipo, fn, opciones));
  }
  function soltarTodo() { teclas.clear(); pulsadas.clear(); raton.botones = 0; raton.pulsados = 0; raton.rueda = 0; raton.bloqueado = false; }

  function alTeclaAbajo(e) {
    const accion = TECLA[e.code];
    if (!accion) return;
    if (enFormulario(e.target) || enFormulario()) return;       // escribiendo en un campo: la tecla no es del juego
    if (e.ctrlKey || e.metaKey || e.altKey) return;             // atajos del navegador
    if (SIN_DESPLAZAR.has(e.code)) e.preventDefault();          // sin desplazamiento de página
    actTeclado.t = ahoraReal();
    if (e.repeat) return;
    teclas.add(accion); pulsadas.add(accion);
  }
  function alTeclaArriba(e) { const accion = TECLA[e.code]; if (accion) teclas.delete(accion); if (e.code === 'ShiftLeft' || e.code === 'Space') { /* dos teclas, una acción */ if (!e.shiftKey || e.code === 'ShiftLeft') teclas.delete('esquivar'); } }

  const esUI = (el) => !!el?.closest?.('button, a, input, select, textarea, label, summary, [role="button"], [data-ui]');
  function alRatonMover(e) {
    if (Math.abs(e.clientX - raton.x) + Math.abs(e.clientY - raton.y) >= 3 || !raton.valido) actTeclado.t = ahoraReal();
    raton.x = e.clientX; raton.y = e.clientY; raton.valido = true;
    // Resincroniza con el estado real de los botones (si se soltó fuera de la ventana no llega el mouseup).
    if (e.buttons === 0) { raton.botones = 0; raton.bloqueado = false; }
    else if (!raton.bloqueado) raton.botones &= e.buttons;
  }
  function alRatonAbajo(e) {
    raton.x = e.clientX; raton.y = e.clientY; raton.valido = true;
    if (esUI(e.target) || enFormulario(e.target)) { raton.bloqueado = true; return; }   // clic en la interfaz: no dispara
    const dentro = juego.contenedor?.contains?.(e.target) || e.target === document.body || e.target === document.documentElement;
    if (!dentro) { raton.bloqueado = true; return; }
    actTeclado.t = ahoraReal();
    const bit = e.button === 0 ? 1 : e.button === 2 ? 2 : e.button === 1 ? 4 : 0;
    if (!bit) return;
    if (e.button === 1) e.preventDefault();                     // sin desplazamiento automático del botón central
    raton.botones |= bit; raton.pulsados |= bit;
    try { juego.audio?.desbloquear?.(); } catch { /* audio aún provisional */ }
  }
  function alRatonArriba(e) {
    const bit = e.button === 0 ? 1 : e.button === 2 ? 2 : e.button === 1 ? 4 : 0;
    raton.botones &= ~bit;
    if (e.buttons === 0) raton.bloqueado = false;
  }
  function alMenuContextual(e) { if (juego.contenedor?.contains?.(e.target) && !enFormulario(e.target)) e.preventDefault(); }
  function alRueda(e) {
    if (!enPartida() || juego.estado.pausado) return;           // en menús la rueda desplaza las listas
    if (!juego.contenedor?.contains?.(e.target) || enFormulario(e.target)) return;
    e.preventDefault();
    if (e.deltaY !== 0) { raton.rueda += Math.sign(e.deltaY); actTeclado.t = ahoraReal(); }
  }

  oir(window, 'keydown', alTeclaAbajo);
  oir(window, 'keyup', alTeclaArriba);
  oir(window, 'mousemove', alRatonMover);
  oir(window, 'mousedown', alRatonAbajo);
  oir(window, 'mouseup', alRatonArriba);
  oir(window, 'contextmenu', alMenuContextual);
  oir(window, 'wheel', alRueda, { passive: false });
  oir(window, 'blur', soltarTodo);
  oir(document, 'visibilitychange', () => { if (document.hidden) soltarTodo(); });

  // Confirmación de impacto en la mira del ratón.
  const bajas = [
    juego.eventos.en('danio', (d) => { const a = d?.atacante; if (a && a.bando === 'jugadores' && a.indice === 0 && d.objetivo?.bando === 'zombis' && d.cantidad > 0) tImpacto = 0.085; }),
    juego.eventos.en('zombi:muerte', (d) => { const a = d?.atacante; if (a && a.bando === 'jugadores' && a.indice === 0) tBaja = 0.17; }),
  ];

  // ───────────── Lectura de dispositivos ─────────────
  function leerTeclado(c) {
    limpiarCrudo(c);
    const baja = (a) => teclas.has(a) || pulsadas.has(a);
    let x = (baja('der') ? 1 : 0) - (baja('izq') ? 1 : 0), z = (baja('abajo') ? 1 : 0) - (baja('arriba') ? 1 : 0);
    if (x && z) { x *= Math.SQRT1_2; z *= Math.SQRT1_2; }      // la diagonal no corre más
    c.mx = x; c.mz = z;
    const bot = raton.botones | raton.pulsados;
    c.b.disparar = !!(bot & 1); c.l.disparar = !!(raton.pulsados & 1);
    c.b.cuerpo = !!(bot & 2) || baja('cuerpo'); c.l.cuerpo = !!(raton.pulsados & 2) || pulsadas.has('cuerpo');
    c.b.lanzar = !!(bot & 4) || baja('lanzar'); c.l.lanzar = !!(raton.pulsados & 4) || pulsadas.has('lanzar');
    for (const n of ['recargar', 'usar', 'habilidad', 'esquivar', 'pausa']) { c.b[n] = baja(n); c.l[n] = pulsadas.has(n); }
    if (pulsadas.has('ranura0')) c.ranura = 0; else if (pulsadas.has('ranura1')) c.ranura = 1;
    if (raton.rueda) c.cambiar = raton.rueda > 0 ? 1 : -1;
    return c;
  }

  function leerMando(gp, c) {
    limpiarCrudo(c);
    const b = gp.buttons, a = gp.axes;
    const pres = (i) => { const x = b[i]; return !!x && (x.pressed || x.value > 0.5); };
    const valor = (i) => { const x = b[i]; return x ? Math.max(x.value || 0, x.pressed ? 1 : 0) : 0; };
    let p = palanca(a[0] || 0, a[1] || 0, ZONA_MUERTA_MOVER, CURVA_MOVER);
    c.mx = p.x; c.mz = p.y;
    if (p.m > 0) c.activo = true;
    p = palanca(a[2] || 0, a[3] || 0, ZONA_MUERTA_APUNTAR, 1);
    c.apX = p.x; c.apZ = p.y; c.apMag = p.m;
    if (p.m > 0) c.activo = true;
    c.b.disparar = valor(7) > UMBRAL_GATILLO;     // RT
    c.b.lanzar = valor(6) > UMBRAL_GATILLO;       // LT
    c.b.cuerpo = pres(5) || pres(11);             // RB (o pulsar el stick derecho)
    c.b.habilidad = pres(4);                      // LB
    c.b.esquivar = pres(0);                       // A
    c.b.usar = pres(1);                           // B
    c.b.recargar = pres(2);                       // X
    c.b.cambiarSig = pres(3) || pres(15);         // Y o cruceta derecha
    c.b.cambiarAnt = pres(14);                    // cruceta izquierda
    c.b.pausa = pres(9);                          // Start
    if (!c.activo) for (const n of BOTONES) if (c.b[n]) { c.activo = true; break; }
    return c;
  }

  function leerSimulada(s, c) {
    limpiarCrudo(c);
    c.mx = +s.moverX || 0; c.mz = +s.moverZ || 0;
    const m = Math.hypot(c.mx, c.mz); if (m > 1) { c.mx /= m; c.mz /= m; }
    for (const n of ['disparar', 'recargar', 'usar', 'habilidad', 'lanzar', 'cuerpo', 'esquivar', 'pausa']) c.b[n] = !!s[n];
    if (s.cambiar) { c.cambiar = s.cambiar > 0 ? 1 : -1; s.cambiar = 0; }
    if (s.ranura != null && s.ranura >= 0) { c.ranura = s.ranura | 0; s.ranura = -1; }
    return c;
  }

  // ───────────── Apuntado ─────────────
  /** Zombi más cercano al eje de la mira dentro del cono de asistencia. Devuelve el giro (rad) hacia él o 0. */
  function buscarAsistencia(j, ang, ap) {
    const zs = juego.zombis, px = j.pos.x, pz = j.pos.z;
    let mejor = null, mejorNota = Infinity, mejorDesvio = 0, mejorEfectivo = 0;
    for (let k = 0; k < zs.length; k++) {
      const z = zs[k];
      if (!z || !z.vivo || !z.pos) continue;
      const dx = z.pos.x - px, dz = z.pos.z - pz, d = Math.hypot(dx, dz);
      if (d < 0.8 || d > ASIST_ALCANCE) continue;
      const desvio = difAngulo(ang, Math.atan2(dx, dz));
      const efectivo = Math.max(0, Math.abs(desvio) - Math.atan2(z.radio || 0.45, d));
      if (efectivo > ASIST_CONO) continue;
      // Se prefiere el más alineado; a igualdad, el más cercano. Histéresis: el objetivo actual gana por poco.
      const nota = efectivo + d * 0.0035 - (z === ap.objetivo ? 0.05 : 0);
      if (nota < mejorNota) { mejorNota = nota; mejor = z; mejorDesvio = desvio; mejorEfectivo = efectivo; }
    }
    if (mejor && juego.fisica?.lineaLibre && !juego.fisica.lineaLibre(px, pz, mejor.pos.x, mejor.pos.z)) mejor = null;
    ap.objetivo = mejor;
    if (!mejor) return 0;
    return mejorDesvio * api.asistencia * (1 - 0.6 * (mejorEfectivo / ASIST_CONO));
  }

  function apuntarConMando(i, it, c, dt) {
    const ap = apunt[i], j = jugador(i);
    if (c.apMag > 0) { ap.cruda = Math.atan2(c.apX, c.apZ); ap.quieto = 0; }
    else {
      ap.quieto += dt;
      // Sin tocar el stick derecho, tras un instante el personaje encara su marcha (salvo que esté disparando).
      const mm = Math.hypot(c.mx, c.mz);
      if (ap.quieto > 0.35 && mm > 0.35 && !c.b.disparar) ap.cruda = girarHacia(ap.cruda, Math.atan2(c.mx, c.mz), 10 * dt);
    }
    let desvio = 0;
    if (j && j.vivo && api.asistencia > 0 && enPartida()) desvio = buscarAsistencia(j, ap.cruda, ap); else ap.objetivo = null;
    ap.desvio = amortiguar(ap.desvio, desvio, ASIST_RAPIDEZ, dt);
    const ang = ap.cruda + ap.desvio;
    it.dirApuntar.x = Math.sin(ang); it.dirApuntar.z = Math.cos(ang);
    it.fuerzaApuntar = c.apMag;
    it.objetivoAsistido = ap.objetivo;
    const px = j ? j.pos.x : 0, pz = j ? j.pos.z : 0;
    if (ap.objetivo) { it.apuntar.x = ap.objetivo.pos.x; it.apuntar.z = ap.objetivo.pos.z; }
    else { const d = 5 + 6 * c.apMag; it.apuntar.x = px + it.dirApuntar.x * d; it.apuntar.z = pz + it.dirApuntar.z * d; }
  }

  function apuntarConRaton(i, it) {
    const j = jugador(i), ap = apunt[i];
    it.fuerzaApuntar = 1; it.objetivoAsistido = null; ap.objetivo = null;
    const px = j ? j.pos.x : 0, pz = j ? j.pos.z : 0;
    let hecho = false;
    if (raton.valido && juego.render?.puntoEnSuelo) {
      let p = null;
      try { p = juego.render.puntoEnSuelo(raton.x, raton.y, 1.2, _p); } catch { p = null; }
      if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) {
        it.apuntar.x = p.x; it.apuntar.z = p.z;
        const dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz);
        if (d > 0.3) { it.dirApuntar.x = dx / d; it.dirApuntar.z = dz / d; ap.cruda = Math.atan2(dx, dz); }
        hecho = true;
      }
    }
    if (!hecho) { it.apuntar.x = px + it.dirApuntar.x * 8; it.apuntar.z = pz + it.dirApuntar.z * 8; }
    ap.desvio = 0;
  }

  function apuntarSimulado(i, it, s) {
    const j = jugador(i), ap = apunt[i];
    const px = j ? j.pos.x : 0, pz = j ? j.pos.z : 0;
    it.fuerzaApuntar = 1; it.objetivoAsistido = null;
    if (s.apuntar) {
      it.apuntar.x = s.apuntar.x; it.apuntar.z = s.apuntar.z;
      const dx = s.apuntar.x - px, dz = s.apuntar.z - pz, d = Math.hypot(dx, dz);
      if (d > 0.3) { it.dirApuntar.x = dx / d; it.dirApuntar.z = dz / d; }
    } else {
      if (s.dirApuntar) { const d = Math.hypot(s.dirApuntar.x, s.dirApuntar.z) || 1; it.dirApuntar.x = s.dirApuntar.x / d; it.dirApuntar.z = s.dirApuntar.z / d; }
      it.apuntar.x = px + it.dirApuntar.x * 8; it.apuntar.z = pz + it.dirApuntar.z * 8;
    }
    ap.cruda = Math.atan2(it.dirApuntar.x, it.dirApuntar.z); ap.desvio = 0;
  }

  // ───────────── Composición de la intención ─────────────
  function procesar(i, conTeclado, gp, dt, ahora) {
    const it = intenciones[i], pv = previo[i], s = sim[i];
    let c, modo;
    mandoDe[i] = gp;
    if (s) { c = leerSimulada(s, cSim); modo = 'sim'; disp[i] = s.usaMando ? 'mando' : 'teclado'; }
    else {
      let cm = null;
      if (gp) { cm = leerMando(gp, cMando[i]); if (cm.activo) actMando[i] = ahora; }
      if (conTeclado) {
        leerTeclado(cTeclado);
        if (cm && actMando[i] > actTeclado.t) { c = cm; modo = 'mando'; } else { c = cTeclado; modo = 'teclado'; }
      } else if (cm) { c = cm; modo = 'mando'; }
      else { c = limpiarCrudo(cMando[i]); modo = 'mando'; }
      if (disp[i] !== modo) { disp[i] = modo; for (const n of BOTONES) pv[n] = c.b[n]; }   // al cambiar de dispositivo no se inventan flancos
    }
    it.usaMando = disp[i] === 'mando';
    it.moverX = c.mx; it.moverZ = c.mz; it.magnitud = Math.min(1, Math.hypot(c.mx, c.mz));
    if (modo === 'sim') apuntarSimulado(i, it, s);
    else if (modo === 'mando') apuntarConMando(i, it, c, dt);
    else apuntarConRaton(i, it);

    const flanco = (n) => c.l[n] || (c.b[n] && !pv[n]);
    it.disparar = c.b.disparar; it.disparoPulsado = flanco('disparar');
    it.recargar = flanco('recargar');
    it.usar = flanco('usar'); it.usarMantenido = c.b.usar;
    it.habilidad = flanco('habilidad');
    it.lanzar = flanco('lanzar'); it.lanzarMantenido = c.b.lanzar;
    it.cuerpo = flanco('cuerpo'); it.cuerpoMantenido = c.b.cuerpo;
    it.esquivar = flanco('esquivar');
    it.pausa = flanco('pausa');
    it.cambiar = c.cambiar || (flanco('cambiarSig') ? 1 : flanco('cambiarAnt') ? -1 : 0);
    it.ranura = c.ranura;
    for (const n of BOTONES) pv[n] = c.b[n];
    if (it.pausa) alternarPausa();
  }

  function alternarPausa() {
    if (!api.gestionaPausa) return;
    const f = juego.estado.fase;
    if (f === 'jugando' || f === 'intermedio') juego.pausar(!juego.estado.pausado);
  }

  function leerMandos() {
    mandos.length = 0;
    let lista = null;
    try { lista = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : null; } catch { lista = null; }
    if (lista) for (let k = 0; k < lista.length; k++) { const g = lista[k]; if (g && g.connected && g.buttons && g.buttons.length >= 10) mandos.push(g); }
    return mandos;
  }

  function actualizarCursor(dtReal) {
    if (tImpacto > 0) tImpacto -= dtReal;
    if (tBaja > 0) tBaja -= dtReal;
    const el = lienzo();
    if (!el) return;
    let quiero = '';
    if (api.cursor && enPartida() && !juego.estado.pausado && juego.jugadores.length > 0) {
      if (disp[0] === 'mando' && !sim[0]) quiero = 'none';
      else { const tipo = tBaja > 0 ? 'baja' : tImpacto > 0 ? 'impacto' : 'normal'; quiero = cursores[tipo] ?? (cursores[tipo] = crearCursor(tipo)); }
    }
    if (quiero !== cursorPuesto) { cursorPuesto = quiero; el.style.cursor = quiero; }
  }

  const api = {
    siempre: true,
    asistencia: 0.7, gestionaPausa: true, cursor: true, dosJugadores: false,

    /** Intención del jugador `indice` en este cuadro. Siempre devuelve un objeto válido. */
    de(indice) { return intenciones[indice] ?? fuera; },

    /** 'teclado' | 'mando': dispositivo con el que juega ahora mismo ese jugador. */
    dispositivo(indice) { return disp[indice] ?? 'teclado'; },

    mandosConectados() { return leerMandos().length; },

    /** Vibración del mando de ese jugador (solo si está jugando con él). fuerza 0..1, duración en s. */
    vibrar(indice, fuerza = 0.5, duracion = 0.15) {
      if (juego.opciones?.sinvibracion || disp[indice] !== 'mando' || sim[indice]) return;
      const gp = mandoDe[indice];
      if (!gp || !(fuerza > 0) || !(duracion > 0)) return;
      const f = Math.min(1, fuerza), ahora = ahoraReal(), v = vib[indice];
      if (ahora < v.hasta && f < v.fuerza * 0.8) return;        // una vibración débil no corta a una fuerte en curso
      v.hasta = ahora + duracion; v.fuerza = f;
      const ms = Math.round(Math.min(2, duracion) * 1000);
      try {
        const act = gp.vibrationActuator;
        if (act?.playEffect) act.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: f, strongMagnitude: f * f }).catch(() => {});
        else if (gp.hapticActuators?.[0]?.pulse) gp.hapticActuators[0].pulse(f, ms);
      } catch { /* mando sin vibración */ }
    },

    /** Gancho de pruebas (ver cabecera). */
    simular(indice, parcial) {
      if (indice !== 0 && indice !== 1) return;
      if (parcial == null) { sim[indice] = null; return; }
      sim[indice] = Object.assign(sim[indice] ?? {}, parcial);
      if (parcial.apuntar) { sim[indice].apuntar = { x: parcial.apuntar.x, z: parcial.apuntar.z }; }
      if (parcial.dirApuntar) { sim[indice].apuntar = null; }
    },

    actualizar() {
      const ahora = ahoraReal();
      // Con el bucle real, el paso del cuadro; con `juego.avanzar(dt)` a mano (pruebas) se usa el mismo paso.
      const dt = Math.min(0.1, Math.max(0, juego.tiempo?.dtReal > 0 ? juego.tiempo.dtReal : ahora - tPrevio));
      tPrevio = ahora;
      const lista = leerMandos();
      const dos = api.dosJugadores || juego.jugadores.length > 1;
      let m0 = null, m1 = null;
      if (dos) { if (lista.length >= 2) { m0 = lista[0]; m1 = lista[1]; } else m1 = lista[0] ?? null; }
      else m0 = lista[0] ?? null;
      procesar(0, true, m0, dt, ahora);
      procesar(1, false, m1, dt, ahora);
      pulsadas.clear(); raton.pulsados = 0; raton.rueda = 0;
      actualizarCursor(dt);
    },

    destruir() {
      for (const f of oyentes) f();
      oyentes.length = 0;
      for (const f of bajas) f();
      const el = lienzo(); if (el && cursorPuesto) el.style.cursor = '';
      soltarTodo();
    },
  };
  return api;
}
