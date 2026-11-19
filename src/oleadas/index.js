// DIRECTOR de ERA Z — src/oleadas/index.js → crearDirector(juego)
// Máquina de estados de la partida (31 «días», 1800 → 2100): flujo, oleadas por pulsos, jefes, ciclo día/noche, intermedio con mejoras,
// puntuación y racha, cambios de era y fin de partida. Es el ÚNICO que escribe `juego.estado`.
//
// API del contrato (§Director):
//   director.iniciarPartida({ roles:[rolId,…], dia=1, dificultad='normal' })   (async)
//   director.terminarPartida()   abandona: fase 'derrota' con resumen      director.siguienteOleada()   director.saltarA(dia)
// API añadida:
//   director.matarTodos()               mata (o descarta) todo lo pendiente de la oleada actual
//   director.elegirMejora(indice, id)   igual que el evento `ui:elegirMejora`    director.saltarIntermedio()
//   director.ofertas()                  { indiceJugador: [vistaMejora ×3] } del intermedio en curso
//   director.mejorasDe(indice)          { mejoraId: nivel } de un jugador       director.info()   foto del estado interno (pruebas)
//   director.puntuacion                 (ver puntuacion.js)                       director.recordActual()
//   director.destruir()                 quita oyentes
//
// FLUJO (juego.estado.fase / director.sub):
//   menu ─ui:jugar→ transicion/carga ─→ jugando·cuenta (≈4 s) ─→ jugando·oleada ─→ jugando·cierre (≈2,6 s) ─→ intermedio (≈20 s)
//        ─→ [transicion si cambia la era] ─→ jugando·cuenta (≈3 s) ─→ oleada … ─→ victoria (OMEGA, día 31) | derrota (no queda nadie en pie)
//   `estado.fase` solo toma los valores del contrato; el detalle (cuenta|oleada|cierre) va en `estado.subfase`.
//
// CAMPOS que el Director añade a `juego.estado` (la UI puede leerlos):
//   subfase 'cuenta'|'oleada'|'cierre'|'intermedio'|…   cuenta (s enteros de la cuenta atrás)   tematica {nombre, subtitulo}   jefe (zombi jefe vivo | null)
//   mejorRacha   rachaRestante (0..1, tiempo antes de que decaiga la racha)   tiempoPartida (s)   tiempoOleada (s)   escalaVida / escalaDanio (zombis)
//   intermedioRestante (s)   record ({puntos,…} | null)
//
// EVENTOS EMITIDOS además de los del contrato:
//   `oleada:inicio` lleva también { tematica:{nombre,subtitulo}, composicion, dificultad };  `oleada:fin` { dia, anio, bonus:{sinDanio,tiempo}, bajas, tiempo }
//   `intermedio:inicio` lleva `mejoras` (las del jugador 0, copias sin `aplicar`) y `porJugador: [{ indice, rol, mejoras:[…] }]`, `diaSiguiente`, `anioSiguiente`, `eraSiguiente`
//   `mejora:aplicada` { jugador, mejora }   `puntos` { cantidad, multiplicador, racha, zombi, x, z }   `mensaje` admite además `subtitulo`
//
// COMPORTAMIENTOS A SABER
//   · zombisTotales/zombisRestantes son exactos: restantes = por aparecer + vivos de la oleada; los zombis invocados por un jefe suben el total.
//   · Aparición por pulsos con respiros (datos/oleadas.js); tope de vivos 150 (menos si el equipo va a <30 fps); antiatasco en 3 etapas
//     (señuelo con zombis.atraer → reubicar atascados → forzar la muerte).
//   · Al morir el jefe se cancelan las apariciones pendientes; la oleada acaba al caer también sus esbirros. OMEGA muerto = victoria inmediata.
//   · En el intermedio, quien no elige a tiempo (o si se salta) recibe una de sus ofertas al azar.
//   · A los zombis se les pasa `vida` escalada por día/dificultad (no a los élites) y `estado.escalaVida/escalaDanio` quedan disponibles.
//
// DEPURACIÓN: `?depurar=1` → F2 siguiente día · F3 siguiente era · F4 siguiente día de jefe. `?auto=1&rol=soldado,medico&dia=11&dif=dificil` inicia sin menú.
import { ERAS, anioDeDia, eraDeDia, esDiaDeJefe, DIA_FINAL } from '../datos/eras.js';
import { ROLES } from '../datos/roles.js';
import { ZOMBIS, JEFES } from '../datos/zombis.js';
import { componerOleada, dificultadDe, escalaVida, escalaDanio, TOPE_VIVOS } from '../datos/oleadas.js';
import { elegirMejoras, vistaMejora, MEJORAS_POR_ID } from '../datos/mejoras.js';
import { limitar } from '../nucleo/util.js';
import { crearPuntuacion } from './puntuacion.js';
import { crearCiclo } from './ciclo.js';

const DUR_CUENTA_INICIAL = 4;
const DUR_CUENTA = 3;
const DUR_CIERRE = 2.6;
const DUR_CIERRE_JEFE = 4.5;
const DUR_INTERMEDIO = 20;
const PRESENTACION_JEFE = 3.2;
const DEMORA_DERROTA = 1.8;
const MAX_JUGADORES = 4;

export function crearDirector(juego) {
  const estado = juego.estado;
  const puntuacion = crearPuntuacion(juego);
  const ciclo = crearCiclo(juego);

  // ------------------------------------------------------------------------------------------------------------------
  // Estado interno
  // ------------------------------------------------------------------------------------------------------------------
  let sub = 'menu';          // menu | carga | cuenta | oleada | cierre | intermedio | transicion | fin
  let token = 0;             // invalida procesos asíncronos obsoletos
  let partida = null;        // { roles, dia, dificultad }
  let C = null;              // cuenta atrás { t }
  let W = null;              // oleada en curso
  let I = null;              // intermedio en curso
  let tDerrota = 0;
  let aplicadas = {};        // indiceJugador → { mejoraId: nivel }
  let dtMedio = 1 / 60;      // EMA del paso real (para el tope adaptativo)
  const muertosProcesados = new WeakSet();
  const lejosPool = [];
  const offs = [];

  // ------------------------------------------------------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------------------------------------------------------
  const sis = (n) => juego.sistemas?.[n];
  const emitir = (n, d) => juego.eventos.emitir(n, d);
  const mensaje = (texto, tipo = 'info', duracion = 3, extra) => emitir('mensaje', { texto, tipo, duracion, ...extra });
  const enPartida = () => sub === 'cuenta' || sub === 'oleada' || sub === 'cierre' || sub === 'intermedio' || sub === 'transicion' || sub === 'carga';
  const jugadoresVivos = () => juego.jugadores.filter((j) => j.vivo !== false && !j.caido);
  const fijarSub = (s) => {
    sub = s; estado.subfase = s;
    estado.fase = s === 'cuenta' || s === 'oleada' || s === 'cierre' ? 'jugando'
      : s === 'intermedio' ? 'intermedio' : s === 'carga' || s === 'transicion' ? 'transicion' : estado.fase;
  };

  function centroEquipo() {
    let x = 0, z = 0, n = 0;
    for (const j of juego.jugadores) if (j.pos && j.vivo !== false) { x += j.pos.x; z += j.pos.z; n++; }
    return n ? { x: x / n, z: z / n } : { x: 0, z: 0 };
  }

  /** Punto de aparición lejos de los jugadores (usa escenarios.puntoAparicion). */
  function elegirPunto(distMin = 18) {
    let n = 0;
    for (const j of juego.jugadores) {
      if (!j.pos) continue;
      const o = lejosPool[n] || (lejosPool[n] = { x: 0, z: 0 });
      o.x = j.pos.x; o.z = j.pos.z; n++;
    }
    lejosPool.length = Math.max(lejosPool.length, n);
    const lejos = lejosPool.slice(0, n);
    const p = sis('escenarios')?.puntoAparicion?.(lejos, distMin);
    if (p && Number.isFinite(p.x)) return p;
    const l = juego.fisica?.limites ?? { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };
    const lado = juego.rng.entero(0, 3), t = juego.rng();
    return lado === 0 ? { x: l.minX + 2, z: l.minZ + t * (l.maxZ - l.minZ) } : lado === 1 ? { x: l.maxX - 2, z: l.minZ + t * (l.maxZ - l.minZ) }
      : lado === 2 ? { x: l.minX + t * (l.maxX - l.minX), z: l.minZ + 2 } : { x: l.minX + t * (l.maxX - l.minX), z: l.maxZ - 2 };
  }

  /** Posición con dispersión alrededor del punto, comprobando que esté libre. */
  function dispersar(pt, radioMax = 2.6) {
    const l = juego.fisica?.limites;
    for (let k = 0; k < 4; k++) {
      const a = juego.rng() * Math.PI * 2, r = 0.5 + juego.rng() * radioMax;
      let x = pt.x + Math.sin(a) * r, z = pt.z + Math.cos(a) * r;
      if (l) { x = limitar(x, l.minX + 1, l.maxX - 1); z = limitar(z, l.minZ + 1, l.maxZ - 1); }
      if (!juego.fisica?.libre || juego.fisica.libre(x, z, 0.5)) return { x, z };
    }
    return { x: pt.x, z: pt.z };
  }

  function topeVivos() {
    const base = juego.opciones.tope ?? TOPE_VIVOS;
    const f = dtMedio > 0.05 ? 0.55 : dtMedio > 0.04 ? 0.7 : dtMedio > 1 / 30 ? 0.85 : 1;
    return Math.max(20, Math.round(base * f));
  }

  function limpiarEntidades() {
    sis('zombis')?.limpiar?.();
    sis('jugadores')?.limpiar?.();
    sis('combate')?.limpiar?.();
    if (juego.zombis.length) juego.zombis.length = 0;
    if (juego.jugadores.length) juego.jugadores.length = 0;
  }

  function sincronizar() {
    if (!W) { estado.zombisRestantes = 0; estado.zombisTotales = 0; return; }
    estado.zombisRestantes = W.porGenerar + W.vivos.size;
    estado.zombisTotales = W.total;
  }

  // ------------------------------------------------------------------------------------------------------------------
  // Partida
  // ------------------------------------------------------------------------------------------------------------------
  function normalizarRoles(roles) {
    let l = Array.isArray(roles) ? roles : typeof roles === 'string' ? roles.split(',') : [];
    l = l.map((r) => String(r).trim()).filter((r) => ROLES[r]).slice(0, MAX_JUGADORES);
    return l.length ? l : ['soldado'];
  }

  async function iniciarPartida({ roles, dia = 1, dificultad = 'normal' } = {}) {
    const tk = ++token;
    roles = normalizarRoles(roles);
    dia = limitar(Math.round(Number(dia) || 1), 1, DIA_FINAL);
    if (!['facil', 'normal', 'dificil', 'pesadilla'].includes(dificultad)) dificultad = 'normal';
    partida = { roles, dia, dificultad };
    W = null; I = null; C = null; aplicadas = {}; tDerrota = 0;
    limpiarEntidades();
    puntuacion.reiniciar(dificultad);
    const eraIdx = eraDeDia(dia);
    Object.assign(estado, {
      dia, anio: anioDeDia(dia), eraIdx, dificultad, zombisRestantes: 0, zombisTotales: 0, tiempoPartida: 0, tiempoOleada: 0, cuenta: 0,
      tematica: null, jefe: null, escalaVida: 1, escalaDanio: 1, intermedioRestante: 0, record: puntuacion.leerRecord(),
    });
    juego.pausar?.(false);
    fijarSub('carga');
    juego.render?.camaraMenu?.(false);
    ciclo.olvidarMusica();
    ciclo.fijar(0.5);
    try { await sis('escenarios')?.cargar?.(eraIdx); } catch (e) { console.error('[director] no se pudo cargar el escenario', e); }
    if (tk !== token) return;
    colocarJugadores(roles);
    juego.render?.seguir?.(juego.jugadores);
    emitir('partida:inicio', { roles, dia });
    prepararCuenta(DUR_CUENTA_INICIAL);
  }

  function colocarJugadores(roles) {
    const inicios = sis('escenarios')?.actual?.inicioJugadores?.length ? sis('escenarios').actual.inicioJugadores : [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 2 }];
    const sj = sis('jugadores');
    roles.forEach((rol, i) => {
      const p = inicios[i % inicios.length];
      sj?.crear?.(i, rol, p.x, p.z);
    });
  }

  function recolocarJugadores() {
    const inicios = sis('escenarios')?.actual?.inicioJugadores;
    if (!inicios?.length) return;
    juego.jugadores.forEach((j, i) => { const p = inicios[i % inicios.length]; j.teletransportar?.(p.x, p.z); });
  }

  function prepararCuenta(seg) {
    C = { t: seg };
    W = null;
    sincronizar();
    estado.jefe = null; estado.tiempoOleada = 0;
    estado.cuenta = Math.ceil(seg);
    fijarSub('cuenta');
    ciclo.apuntar(1.5, 2.5); // el atardecer se acerca
    ciclo.musica('combate', 0.15);
  }

  function irAlMenu() {
    token++;
    W = null; I = null; C = null; sincronizar();
    limpiarEntidades();
    sis('mundo')?.limpiar?.(); sis('vehiculos')?.limpiar?.(); sis('fx')?.limpiar?.();
    juego.pausar?.(false);
    fijarSub('menu'); estado.fase = 'menu'; estado.jefe = null; estado.subfase = 'menu';
    juego.render?.seguir?.([]);
    juego.render?.camaraMenu?.(true);
    ciclo.fijar(0.5); ciclo.olvidarMusica(); ciclo.musica('menu', 0.2);
  }

  function resumen(victoria, extra = {}) {
    const dia = victoria ? DIA_FINAL : estado.dia;
    return {
      dias: dia, diasSuperados: victoria ? DIA_FINAL : Math.max(0, estado.dia - 1), anio: anioDeDia(dia), eraIdx: eraDeDia(dia),
      puntos: Math.round(estado.puntos), bajas: estado.bajas, tiempo: Math.round(estado.tiempoPartida), mejorRacha: estado.mejorRacha,
      victoria, dificultad: estado.dificultad, roles: partida?.roles ?? [], ...extra,
    };
  }

  function finPartida(victoria) {
    if (sub === 'fin' || sub === 'menu') return;
    token++;
    let extra = {};
    if (victoria) extra.bonusVictoria = puntuacion.bonusVictoria();
    const r = resumen(victoria, extra);
    const rec = puntuacion.guardarRecord({ puntos: r.puntos, dia: r.dias, anio: r.anio, roles: r.roles, victoria, dificultad: r.dificultad });
    r.record = rec.record; r.recordAnterior = rec.anterior?.puntos ?? 0;
    estado.record = rec.record ? { puntos: r.puntos, dia: r.dias } : rec.anterior;
    W = null; sincronizar(); estado.jefe = null; I = null;
    fijarSub('fin');
    estado.fase = victoria ? 'victoria' : 'derrota';
    estado.subfase = 'fin';
    ciclo.musica(victoria ? 'victoria' : 'derrota', 0.6);
    emitir('partida:fin', { victoria, resumen: r });
  }

  function comprobarDerrota(dt) {
    if (!juego.jugadores.length) { tDerrota = 0; return; }
    if (jugadoresVivos().length === 0) {
      tDerrota += dt;
      if (tDerrota >= DEMORA_DERROTA) finPartida(false);
    } else tDerrota = 0;
  }

  // ------------------------------------------------------------------------------------------------------------------
  // Oleada
  // ------------------------------------------------------------------------------------------------------------------
  function iniciarOleada() {
    const dia = estado.dia;
    const nJug = Math.max(1, juego.jugadores.length || partida?.roles.length || 1);
    const roles = juego.jugadores.length ? juego.jugadores.map((j) => j.rol?.id ?? j.rolId).filter(Boolean) : partida?.roles ?? [];
    const plan = componerOleada({ dia, jugadores: nJug, roles, dificultad: estado.dificultad, rng: juego.rng });
    W = {
      plan, t: 0, total: plan.total, porGenerar: plan.total, vivos: new Set(),
      pulsos: plan.pulsos.map((p) => ({ ...p, unidades: p.unidades.map((u) => u.slice()) })), idx: 0, liberado: false, tPulso: 0, tamAnt: 0,
      cola: [], tSpawn: 0, generando: false,
      jefeId: plan.jefe, jefeRef: null, jefeSpawned: !plan.jefe, jefeMuerto: false, jefeT: PRESENTACION_JEFE, tJefe: 0,
      sinBaja: 0, tStall: 0, e1: false, proxAtraer: 0, muestras: new Map(), tMuestra: 0, lentaHecha: false, victoria: false,
      cierreT: 0, fallos: 0, escalaV: escalaVida(dia, estado.dificultad, nJug),
    };
    estado.escalaVida = W.escalaV; estado.escalaDanio = escalaDanio(dia, estado.dificultad);
    estado.tematica = { nombre: plan.tema.nombre, subtitulo: plan.tema.subtitulo };
    estado.tiempoOleada = 0; estado.cuenta = 0;
    puntuacion.alIniciarOleada();
    ciclo.fijar(0.5);
    fijarSub('oleada');
    sincronizar();
    emitir('oleada:inicio', {
      dia, anio: estado.anio, eraIdx: estado.eraIdx, total: plan.total, jefe: plan.jefe,
      tematica: estado.tematica, composicion: plan.composicion, dificultad: estado.dificultad,
    });
    if (plan.jefe) {
      const j = JEFES[plan.jefe];
      mensaje(j.nombre.toUpperCase(), 'jefe', PRESENTACION_JEFE + 1.5, { subtitulo: j.titulo });
      juego.render?.sacudir?.(0.35, 1.2);
      ciclo.musica('jefe', 0.5);
    } else {
      mensaje(`Día ${dia} · ${plan.tema.nombre}`, 'aviso', 4, { subtitulo: plan.tema.subtitulo });
    }
  }

  function spawnJefe() {
    W.jefeSpawned = true; W.tJefe = W.t;
    const pt = elegirPunto(24);
    W.generando = true;
    let jefe = null;
    try { jefe = sis('zombis')?.generarJefe?.(W.jefeId, pt.x, pt.z) ?? null; } catch (e) { console.error('[director] generarJefe', e); }
    W.generando = false;
    W.porGenerar--;
    if (jefe) { W.jefeRef = jefe; W.vivos.add(jefe); estado.jefe = jefe; }
    else { W.total--; W.jefeMuerto = true; }
    sincronizar();
  }

  function spawnItem(it) {
    const g = it.g;
    if (!g.pt) g.pt = elegirPunto(18);
    const { x, z } = dispersar(g.pt, g.n > 1 ? 3.4 : 1.8);
    const opciones = { eraIdx: estado.eraIdx, elite: !!it.elite, emerger: true };
    if (!it.elite && ZOMBIS[it.clase]) opciones.vida = Math.max(1, Math.round(ZOMBIS[it.clase].vida * W.escalaV));
    W.generando = true;
    let zb = null;
    try { zb = sis('zombis')?.generar?.(it.clase, x, z, opciones) ?? null; } catch (e) { console.error('[director] generar', e); }
    W.generando = false;
    W.porGenerar--;
    if (zb) W.vivos.add(zb);
    else { W.total--; W.fallos++; }
    sincronizar();
  }

  function liberarPulsos(dt) {
    W.tPulso += dt;
    if (W.cola.length) return;
    const p = W.pulsos[W.idx];
    if (!p) return;
    if (!W.liberado) {
      const vivos = W.vivos.size;
      const umbral = p.respiro ? Math.max(3, 0.12 * W.tamAnt) : Math.max(5, 0.4 * W.tamAnt);
      const listo = W.idx === 0 ? W.tPulso >= p.pausa
        : (W.tPulso >= p.pausa && vivos <= umbral) || W.tPulso >= p.pausa * 2.4 || (!p.respiro && vivos === 0 && W.tPulso >= Math.min(p.pausa, 4));
      if (!listo) return;
      W.liberado = true; W.tPulso = 0;
    }
    const tope = topeVivos();
    while (p.unidades.length) {
      const u = p.unidades[0];
      const ocupados = W.vivos.size + W.cola.length;
      if (ocupados > 0 && ocupados + u.length > tope) break; // espera hueco
      p.unidades.shift();
      const g = { pt: null, n: u.length };
      for (const it of u) W.cola.push({ clase: it.clase, elite: it.elite, g });
    }
    if (!p.unidades.length) { W.tamAnt = p.tam; W.idx++; W.liberado = false; W.tPulso = 0; }
  }

  function dejarAparecer(dt) {
    W.tSpawn -= dt;
    let n = 0;
    while (W.tSpawn <= 0 && W.cola.length && n++ < 8) {
      const it = W.cola.shift();
      spawnItem(it);
      W.tSpawn += it.g.n > 1 ? 0.06 + 0.09 * juego.rng() : 0.12 + 0.3 * juego.rng();
    }
    if (!W.cola.length && W.tSpawn < 0) W.tSpawn = 0;
  }

  function progreso() {
    const rest = W.porGenerar + W.vivos.size;
    const pEsb = W.total > 0 ? 1 - rest / W.total : 1;
    if (!W.jefeId) return limitar(pEsb, 0, 1);
    let f = 0;
    if (W.jefeMuerto) f = 1;
    else if (W.jefeRef && W.jefeRef.vidaMax > 0) f = 1 - limitar(W.jefeRef.vida / W.jefeRef.vidaMax, 0, 1);
    return limitar(0.3 * pEsb + 0.7 * f, 0, 1);
  }

  function actualizarOleada(dt) {
    W.t += dt; estado.tiempoOleada = W.t;
    // Jefe: presentación y aparición.
    if (W.jefeId && !W.jefeSpawned) { W.jefeT -= dt; if (W.jefeT <= 0) spawnJefe(); }
    const retenido = W.jefeId && (!W.jefeSpawned || (W.t - W.tJefe) < 3.5);
    if (!W.victoria && !retenido && !(W.jefeId && W.jefeMuerto)) { liberarPulsos(dt); dejarAparecer(dt); }
    // Limpia caídos que no avisaron.
    for (const z of W.vivos) if (z.vivo === false) { W.vivos.delete(z); }
    if (W.vivos.size !== estado.zombisRestantes - W.porGenerar) sincronizar();
    antiatasco(dt);
    // Ciclo día/noche y música según el avance.
    const p = progreso();
    ciclo.apuntar(0.5 + 0.5 * p, 0.8);
    const inten = limitar(Math.min(1, W.vivos.size / 45) * 0.55 + p * 0.25 + (W.jefeId ? 0.2 : 0), 0, 1);
    ciclo.musica(W.jefeId ? 'jefe' : 'combate', inten, dt);
    // Fin de oleada
    if (!W.victoria && W.porGenerar <= 0 && W.cola.length === 0 && W.vivos.size === 0) finOleada();
  }

  function finOleada() {
    const dur = W.t;
    const bonus = puntuacion.alFinOleada({ dia: estado.dia, duracion: dur, total: W.total, jefe: !!W.jefeId });
    W.cierreT = W.jefeId ? DUR_CIERRE_JEFE : DUR_CIERRE;
    sincronizar();
    fijarSub('cierre');
    estado.jefe = null;
    ciclo.apuntar(1.0, 0.9); // amanece
    ciclo.musica('intermedio', 0.2);
    emitir('oleada:fin', { dia: estado.dia, anio: estado.anio, bonus, bajas: puntuacion.bajasOleada, tiempo: dur });
  }

  function actualizarCierre(dt) {
    W.cierreT -= dt;
    if (W.cierreT > 0) return;
    if (W.victoria) { finPartida(true); return; }
    entrarIntermedio();
  }

  // --- antiatasco -----------------------------------------------------------------------------------------------------
  function distJugador(z) {
    let m = Infinity;
    for (const j of juego.jugadores) if (j.vivo !== false && j.pos) m = Math.min(m, Math.hypot(j.pos.x - z.pos.x, j.pos.z - z.pos.z));
    return m;
  }
  function reubicar(z) {
    const p = elegirPunto(20), q = dispersar(p, 3);
    if (typeof z.teletransportar === 'function') z.teletransportar(q.x, q.z);
    else {
      if (z.cuerpo) { z.cuerpo.x = q.x; z.cuerpo.z = q.z; z.cuerpo.vx = 0; z.cuerpo.vz = 0; }
      if (z.pos) { z.pos.x = q.x; z.pos.z = q.z; }
    }
  }
  function antiatasco(dt) {
    W.sinBaja += dt; W.tStall += dt;
    if (W.tStall < 1) return;
    W.tStall = 0;
    const n = W.vivos.size;
    if (!n) return;
    const s = W.sinBaja;
    // 1) Señuelo: los zombis acuden al equipo.
    if ((s > 20 && n <= 12 && W.porGenerar === 0) || s > 45) {
      if (!W.e1) { W.e1 = true; mensaje(n === 1 ? 'Queda 1 zombi: ¡acaba con él!' : `Quedan ${n} zombis: ¡acaba con ellos!`, 'aviso', 3); }
      if (s >= W.proxAtraer) {
        const c = centroEquipo();
        sis('zombis')?.atraer?.(c.x, c.z, 140, 8);
        W.proxAtraer = s + 12;
      }
    }
    // 2) Reubicar a los que llevan tiempo quietos y lejos.
    if (s > 40) {
      W.tMuestra += 1;
      if (W.tMuestra >= 5) {
        W.tMuestra = 0;
        for (const z of W.vivos) {
          if (!z.pos) continue;
          const m = W.muestras.get(z);
          if (m && Math.hypot(z.pos.x - m.x, z.pos.z - m.z) < 1.2 && distJugador(z) > 14) reubicar(z);
          W.muestras.set(z, { x: z.pos.x, z: z.pos.z });
        }
      }
    }
    // 3) Último recurso.
    if (s > 90 || W.t > 900) { matarTodos(); }
  }

  // --- muertes y apariciones ajenas --------------------------------------------------------------------------------
  function procesarMuerte(z) {
    if (!z || muertosProcesados.has(z)) return;
    muertosProcesados.add(z);
    const activa = sub === 'oleada' || sub === 'cierre';
    if (activa) puntuacion.alMatar(z);
    if (!W) return;
    W.vivos.delete(z);
    W.sinBaja = 0; W.e1 = false; W.proxAtraer = 0;
    sincronizar();
    if (sub === 'oleada' && !W.lentaHecha && W.porGenerar <= 0 && W.cola.length === 0 && W.vivos.size === 0 && !W.victoria) {
      W.lentaHecha = true;
      juego.camaraLenta?.(0.25, 1.2);
    }
  }

  function alMorirJefe(jefe) {
    if (!W || !W.jefeId || W.jefeMuerto) return;
    const id = jefe?.clase?.id ?? jefe?.def?.id ?? jefe?.id;
    if (jefe !== W.jefeRef && id !== W.jefeId) return;
    W.jefeMuerto = true; estado.jefe = null;
    procesarMuerte(jefe);
    // Cancela lo que quedaba por aparecer.
    let descartados = W.cola.length;
    W.cola.length = 0;
    for (let i = W.idx; i < W.pulsos.length; i++) { for (const u of W.pulsos[i].unidades) descartados += u.length; W.pulsos[i].unidades.length = 0; }
    W.idx = W.pulsos.length;
    W.porGenerar = Math.max(0, W.porGenerar - descartados);
    W.total = Math.max(0, W.total - descartados);
    sincronizar();
    const def = JEFES[W.jefeId];
    juego.camaraLenta?.(0.2, 2);
    juego.render?.sacudir?.(0.6, 1.5);
    mensaje(`¡${def.nombre} ha caído!`, 'jefe', 4);
    if (W.jefeId === 'omega') {
      W.victoria = true; W.lentaHecha = true;
      fijarSub('cierre'); W.cierreT = DUR_CIERRE_JEFE + 1;
      emitir('oleada:fin', { dia: estado.dia, anio: estado.anio, bonus: { sinDanio: 0, tiempo: 0 }, bajas: puntuacion.bajasOleada, tiempo: W.t });
      mataEsbirros();
    }
  }

  // ------------------------------------------------------------------------------------------------------------------
  // Intermedio y mejoras
  // ------------------------------------------------------------------------------------------------------------------
  function entrarIntermedio() {
    const dif = dificultadDe(estado.dificultad);
    W = null; sincronizar();
    sis('jugadores')?.reanimarTodos?.();
    for (const j of juego.jugadores) {
      const cura = j.vidaMax * 0.4 * dif.cura;
      if (j.curar) j.curar(cura); else if (j.vidaMax) j.vida = Math.min(j.vidaMax, (j.vida ?? 0) + cura);
      j.darMunicion?.(limitar(0.5 * dif.municion, 0.1, 1));
      j.darArrojadizas?.(1);
    }
    // Ofertas: 3 por jugador.
    const ofertas = {}, porJugador = [];
    for (const j of juego.jugadores) {
      const rol = j.rol?.id ?? j.rolId ?? partida?.roles?.[j.indice] ?? 'soldado';
      const ap = aplicadas[j.indice] || (aplicadas[j.indice] = {});
      const defs = elegirMejoras(juego.rng, rol, ap, estado.dia, 3);
      const vistas = defs.map((d) => vistaMejora(d, ap[d.id] || 0));
      ofertas[j.indice] = { defs, vistas, elegida: null };
      porJugador.push({ indice: j.indice, rol, mejoras: vistas });
    }
    const hayOfertas = porJugador.some((p) => p.mejoras.length);
    I = { t: 0, dur: hayOfertas ? DUR_INTERMEDIO : 4, ofertas, completoT: null, saliendo: false };
    const dSig = Math.min(DIA_FINAL, estado.dia + 1);
    fijarSub('intermedio');
    estado.intermedioRestante = I.dur;
    ciclo.apuntar(1.5, 0.35);
    ciclo.musica('intermedio', 0.25);
    emitir('intermedio:inicio', {
      dia: estado.dia, duracion: I.dur, mejoras: porJugador[0]?.mejoras ?? [], porJugador,
      diaSiguiente: dSig, anioSiguiente: anioDeDia(dSig), eraSiguiente: eraDeDia(dSig),
    });
  }

  function aplicarMejora(j, def) {
    const ap = aplicadas[j.indice] || (aplicadas[j.indice] = {});
    try {
      if (typeof j.aplicarMejora === 'function') j.aplicarMejora(def); else def.aplicar(j);
    } catch (e) { console.error('[director] error al aplicar la mejora', def.id, e); }
    ap[def.id] = (ap[def.id] || 0) + 1;
    emitir('mejora:aplicada', { jugador: j, mejora: vistaMejora(def, ap[def.id]) });
  }

  function elegirMejora(indiceJugador, mejoraId) {
    if (sub !== 'intermedio' || !I || I.saliendo) return false;
    const of = I.ofertas[indiceJugador];
    if (!of || of.elegida) return false;
    const def = of.defs.find((d) => d.id === mejoraId) ?? (MEJORAS_POR_ID[mejoraId] && of.defs.length ? null : null);
    const j = juego.jugadores.find((q) => q.indice === indiceJugador);
    if (!def || !j) return false;
    of.elegida = def.id;
    aplicarMejora(j, def);
    return true;
  }

  function autoelegirFaltantes() {
    for (const j of juego.jugadores) {
      const of = I.ofertas[j.indice];
      if (of && !of.elegida && of.defs.length) elegirMejora(j.indice, juego.rng.elegir(of.defs).id);
    }
  }

  function saltarIntermedio() {
    if (sub !== 'intermedio' || !I || I.saliendo) return;
    autoelegirFaltantes();
    I.saliendo = true; I.completoT = Math.max(I.completoT ?? 0, 0.5);
  }

  function actualizarIntermedio(dt) {
    I.t += dt;
    estado.intermedioRestante = Math.max(0, I.dur - I.t);
    const faltan = Object.values(I.ofertas).some((o) => !o.elegida && o.defs.length);
    if (!faltan && I.completoT === null) I.completoT = 0;
    if (I.t >= I.dur && !I.saliendo) { autoelegirFaltantes(); I.saliendo = true; I.completoT = 0.6; }
    if (I.completoT !== null) {
      I.completoT += dt;
      if (I.completoT >= (I.saliendo ? 1.1 : 1.5)) salirIntermedio();
    }
  }

  function salirIntermedio() {
    if (!I) return;
    I = null;
    emitir('intermedio:fin', {});
    avanzarA(Math.min(DIA_FINAL, estado.dia + 1));
  }

  // ------------------------------------------------------------------------------------------------------------------
  // Calendario y eras
  // ------------------------------------------------------------------------------------------------------------------
  async function avanzarA(dia, tk = token) {
    estado.dia = dia; estado.anio = anioDeDia(dia);
    const nueva = eraDeDia(dia);
    if (nueva !== estado.eraIdx) {
      await cambiarEra(nueva, tk);
      if (tk !== token) return;
    }
    prepararCuenta(DUR_CUENTA);
  }

  async function cambiarEra(nueva, tk) {
    const anterior = estado.eraIdx;
    fijarSub('transicion');
    W = null; I = null; sincronizar();
    ciclo.musica('intermedio', 0.1);
    let hecho = null;
    const alMedio = () => {
      if (!hecho) {
        hecho = (async () => {
          sis('zombis')?.limpiar?.(); sis('combate')?.limpiar?.();
          estado.eraIdx = nueva;
          await sis('escenarios')?.cargar?.(nueva);
          recolocarJugadores();
          sis('jugadores')?.alCambiarEra?.(nueva);
          for (const j of juego.jugadores) {
            if (j.vivo === false) continue;
            const cura = (j.vidaMax ?? 0) * 0.3;
            if (j.curar) j.curar(cura); else if (j.vidaMax) j.vida = Math.min(j.vidaMax, (j.vida ?? 0) + cura);
          }
        })();
      }
      return hecho;
    };
    try {
      if (typeof juego.render?.transicionEra === 'function') await juego.render.transicionEra(alMedio);
      await alMedio(); // si el render no llamó a alMedio (o no la esperó), se asegura aquí
    } catch (e) { console.error('[director] error en el cambio de era', e); }
    if (tk !== token) return;
    estado.eraIdx = nueva;
    ciclo.fijar(0.5);
    ciclo.olvidarMusica();
    emitir('era:cambio', { eraIdx: nueva, era: ERAS[nueva], anterior });
  }

  /** Depuración: salta a un día concreto (descarta la oleada en curso). */
  async function saltarA(dia) {
    if (!enPartida() || sub === 'carga') return;
    dia = limitar(Math.round(Number(dia) || 1), 1, DIA_FINAL);
    const tk = ++token;
    descartarOleada();
    if (sub === 'intermedio') emitir('intermedio:fin', {});
    I = null; C = null; W = null; sincronizar();
    estado.jefe = null;
    await avanzarA(dia, tk);
  }

  /** Quita de golpe a todos los zombis (sin puntos) y cancela la oleada. */
  function descartarOleada() {
    sis('zombis')?.limpiar?.();
    if (juego.zombis.length) juego.zombis.length = 0;
    if (W) { W.vivos.clear(); W.cola.length = 0; }
  }

  function siguienteOleada() {
    if (sub === 'oleada') matarTodos();
    else if (sub === 'intermedio') saltarIntermedio();
    else if (sub === 'cuenta') C.t = 0;
  }

  /** Mata a todos los zombis de la oleada y cancela lo que quede por aparecer (la oleada termina sola). */
  function mataEsbirros() {
    if (!W) return;
    // Lo que ya estaba en la cola de aparición también cuenta en porGenerar: hay que descontarlo.
    let descartados = W.cola.length;
    W.cola.length = 0;
    for (let i = W.idx; i < W.pulsos.length; i++) { for (const u of W.pulsos[i].unidades) descartados += u.length; W.pulsos[i].unidades.length = 0; }
    W.idx = W.pulsos.length;
    const noJefe = W.jefeId && !W.jefeSpawned ? 1 : 0;
    W.porGenerar = Math.max(0, W.porGenerar - descartados - noJefe);
    W.total = Math.max(0, W.total - descartados - noJefe);
    if (noJefe) W.jefeSpawned = true;
    const combate = sis('combate');
    for (const z of [...W.vivos]) {
      try {
        // ignorarInvulnerable: los que aún están emergiendo del suelo también deben morir.
        const info = { cantidad: 1e7, tipo: 'energia', atacante: null, arma: null, x: z.pos?.x ?? 0, z: z.pos?.z ?? 0, dirX: 0, dirZ: 0, empuje: 0, critico: false, ignorarInvulnerable: true };
        if (combate?.aplicarDanio) combate.aplicarDanio(z, info); else z.recibirDanio?.(info);
      } catch (e) { console.error('[director] matarTodos', e); }
      if (z.vivo !== false) {
        // No murió (inmune): se retira del todo, también de juego.zombis, para que no quede un zombi fantasma.
        W.vivos.delete(z);
        try { if (z.liberar) z.liberar(); else z.visual?.liberar?.(); } catch { /* sin visual */ }
        const i = juego.zombis.indexOf(z); if (i >= 0) juego.zombis.splice(i, 1);
      }
    }
    sincronizar();
  }
  const matarTodos = () => { if (W) mataEsbirros(); };

  // ------------------------------------------------------------------------------------------------------------------
  // Suscripciones
  // ------------------------------------------------------------------------------------------------------------------
  offs.push(
    juego.eventos.en('ui:jugar', (d) => { iniciarPartida(d || {}); }),
    juego.eventos.en('ui:reiniciar', () => { if (partida) iniciarPartida({ ...partida }); }),
    juego.eventos.en('ui:menu', () => irAlMenu()),
    juego.eventos.en('ui:saltarIntermedio', () => saltarIntermedio()),
    juego.eventos.en('ui:elegirMejora', (d) => { if (d) elegirMejora(d.indiceJugador, d.mejoraId); }),
    juego.eventos.en('zombi:muerte', (d) => { if (d?.zombi) { if (d.zombi.esJefe) alMorirJefe(d.zombi); procesarMuerte(d.zombi); } }),
    juego.eventos.en('jefe:muerte', (d) => { if (d?.jefe) alMorirJefe(d.jefe); }),
    juego.eventos.en('zombi:aparece', (d) => {
      const z = d?.zombi;
      if (!z || !W || sub !== 'oleada' || W.generando || W.vivos.has(z) || z.vivo === false) return;
      W.vivos.add(z); W.total++; sincronizar(); // invocado por un jefe u otro sistema
    }),
    juego.eventos.en('jugador:danio', () => { if (sub === 'oleada' || sub === 'cierre') puntuacion.alDanioJugador(); }),
  );

  let quitaTeclas = null;
  function activarDepuracion() {
    if (!juego.opciones.depurar || typeof window === 'undefined') return;
    const alTecla = (e) => {
      if (!enPartida()) return;
      if (e.code === 'F2') { e.preventDefault(); saltarA(estado.dia >= DIA_FINAL ? 1 : estado.dia + 1); }
      else if (e.code === 'F3') { e.preventDefault(); saltarA(Math.min(DIA_FINAL, (eraDeDia(estado.dia) + 1) * 5 + 1)); }
      else if (e.code === 'F4') {
        e.preventDefault();
        let d = estado.dia + 1;
        while (d <= DIA_FINAL && !esDiaDeJefe(d)) d++;
        saltarA(d > DIA_FINAL ? 5 : d);
      }
    };
    window.addEventListener('keydown', alTecla);
    quitaTeclas = () => window.removeEventListener('keydown', alTecla);
  }

  function arrancarAuto() {
    if (sub !== 'menu') return;
    const o = juego.opciones;
    iniciarPartida({ roles: normalizarRoles(String(o.rol ?? 'soldado')), dia: o.dia ?? 1, dificultad: o.dif ?? o.dificultad ?? 'normal' });
  }

  // ------------------------------------------------------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------------------------------------------------------
  const api = {
    get sub() { return sub; },
    puntuacion, ciclo,
    iniciarPartida,
    terminarPartida() { if (enPartida()) finPartida(false); },
    siguienteOleada, saltarA, matarTodos, elegirMejora, saltarIntermedio,
    ofertas() { return I ? Object.fromEntries(Object.entries(I.ofertas).map(([k, o]) => [k, o.vistas])) : {}; },
    mejorasDe(indice) { return { ...(aplicadas[indice] || {}) }; },
    recordActual() { return puntuacion.leerRecord(); },
    info() {
      return {
        sub, dia: estado.dia, plan: W?.plan ?? null, vivos: W?.vivos.size ?? 0, porGenerar: W?.porGenerar ?? 0, total: W?.total ?? 0,
        cola: W?.cola.length ?? 0, pulso: W ? `${W.idx}/${W.pulsos.length}` : null, jefe: W?.jefeRef ?? null, tiempoOleada: W?.t ?? 0, tope: topeVivos(),
      };
    },
    iniciar() {
      activarDepuracion();
      if (juego.opciones.auto) {
        if (juego._andando) setTimeout(arrancarAuto, 0);
        else offs.push(juego.eventos.una('juego:listo', () => arrancarAuto()));
      } else if (!sis('escenarios')?.actual) {
        // Menú: un escenario de fondo para la cámara cinematográfica.
        Promise.resolve(sis('escenarios')?.cargar?.(juego.opciones.era ?? 0)).then(() => { if (sub === 'menu') juego.render?.camaraMenu?.(true); }).catch(() => {});
      } else juego.render?.camaraMenu?.(true);
    },
    actualizar(dt) {
      dtMedio += (Math.min(juego.tiempo.dtReal || dt, 0.2) - dtMedio) * 0.05;
      if (sub === 'menu' || sub === 'fin' || sub === 'carga' || sub === 'transicion') return;
      estado.tiempoPartida += dt;
      puntuacion.actualizar(dt);
      ciclo.actualizar(dt);
      if (sub === 'cuenta') {
        C.t -= dt; estado.cuenta = Math.max(0, Math.ceil(C.t));
        if (C.t <= 0) iniciarOleada();
      } else if (sub === 'oleada') actualizarOleada(dt);
      else if (sub === 'cierre') actualizarCierre(dt);
      else if (sub === 'intermedio') actualizarIntermedio(dt);
      if (sub === 'cuenta' || sub === 'oleada' || sub === 'cierre') comprobarDerrota(dt);
    },
    destruir() { for (const o of offs) o(); offs.length = 0; quitaTeclas?.(); quitaTeclas = null; },
  };
  return api;
}
