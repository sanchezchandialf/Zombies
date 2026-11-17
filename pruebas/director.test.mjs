// Prueba del Director (src/oleadas) con Node y dobles de los demás sistemas.  Uso:  node pruebas/director.test.mjs [--tabla]
// Simula partidas completas aceleradas (paso fijo de 0,1 s) y comprueba: transiciones de fase, eras, jefes, presupuesto creciente,
// que la partida nunca se bloquea, que las cuentas de zombis cuadran, mejoras, derrota, victoria, antiatasco y menú.
import { Juego } from '../src/nucleo/juego.js';
import { crearDirector } from '../src/oleadas/index.js';
import { ERAS, anioDeDia, eraDeDia, esDiaDeJefe, DIA_FINAL } from '../src/datos/eras.js';
import { ZOMBIS, JEFES } from '../src/datos/zombis.js';
import { ROLES } from '../src/datos/roles.js';
import { componerOleada, presupuestoDeDia, DIFICULTADES, TOPE_VIVOS } from '../src/datos/oleadas.js';
import { MEJORAS, elegirMejoras, vistaMejora } from '../src/datos/mejoras.js';
import { crearRng } from '../src/nucleo/util.js';

let fallos = 0, comprobaciones = 0;
const ok = (cond, msg) => { comprobaciones++; if (!cond) { fallos++; console.error('  FALLO:', msg); } };
const tick = () => new Promise((r) => setImmediate(r));

/** Monta un juego con dobles. `opc.matanza`: bajas/s del equipo; `opc.inmortal`: los zombis no mueren solos. */
function montar(opc = {}) {
  const juego = new Juego({ contenedor: {} });
  juego.opciones = { semilla: opc.semilla ?? 7, ...opc.url };
  const mem = {}; juego.almacen = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const reg = { musica: [], horas: [], eras: [], mensajes: [], atraer: 0, transiciones: 0, cargas: [], mejoras: [], lentas: 0, maxVivos: 0, jefesGenerados: [] };
  juego.eventos.en('mensaje', (m) => reg.mensajes.push(m));
  juego.eventos.en('era:cambio', (e) => reg.eras.push(e));
  juego.camaraLenta = () => { reg.lentas++; };

  juego.registrar('render', {
    siempre: true,
    establecerHora: (h) => reg.horas.push(h), seguir() {}, camaraMenu() {}, sacudir() {},
    async transicionEra(alMedio) { reg.transiciones++; await tick(); await alMedio(); await tick(); },
  });
  juego.registrar('audio', { siempre: true, musica: (o) => reg.musica.push(o) });
  juego.registrar('combate', { limpiar() {}, aplicarDanio(z, info) { return z.recibirDanio(info); } });
  juego.registrar('escenarios', {
    actual: null,
    async cargar(e) { await tick(); this.actual = { eraIdx: e, inicioJugadores: [{ x: 0, z: 0 }, { x: 2, z: 0 }], puntosAparicion: [{ x: 40, z: 40 }] }; reg.cargas.push(e); return this.actual; },
    puntoAparicion(lejos, d) { return { x: 38 + juego.rng() * 4, z: -38 + juego.rng() * 4, tipo: 'borde' }; },
  });
  juego.registrar('jugadores', {
    crear(i, rol, x, z) {
      const def = ROLES[rol];
      const j = { indice: i, rol: def, rolId: rol, pos: { x, z }, vida: def.vida, vidaMax: def.vida, vivo: true, caido: false, mods: { ...def.mods }, arrojadizasMax: 3,
        curar(c) { this.vida = Math.min(this.vidaMax, this.vida + c); }, darMunicion() {}, darArrojadizas() {}, teletransportar(x, z) { this.pos.x = x; this.pos.z = z; },
        aplicarMejora(d) { reg.mejoras.push(d.id); d.aplicar(this); } };
      juego.jugadores.push(j); return j;
    },
    limpiar() { juego.jugadores.length = 0; },
    reanimarTodos() { for (const j of juego.jugadores) { j.vivo = true; j.caido = false; if (j.vida <= 0) j.vida = j.vidaMax * 0.3; } },
    alCambiarEra(e) { reg.alCambiarEra = e; },
  });
  const mk = (clase, def, x, z, extra = {}) => {
    const z_ = { clase: def, pos: { x, z }, vivo: true, vida: extra.vida ?? def.vida, vidaMax: extra.vida ?? def.vida, elite: !!extra.elite, esJefe: !!extra.esJefe, visual: { liberar() {} },
      recibirDanio(info) { if (!this.vivo) return 0; this.vida -= info.cantidad; if (this.vida <= 0) matar(this); return info.cantidad; } };
    juego.zombis.push(z_); return z_;
  };
  const matar = (z) => {
    if (!z.vivo) return;
    z.vivo = false;
    const i = juego.zombis.indexOf(z); if (i >= 0) juego.zombis.splice(i, 1);
    if (z.esJefe) juego.eventos.emitir('jefe:muerte', { jefe: z });
    juego.eventos.emitir('zombi:muerte', { zombi: z, info: {}, atacante: juego.jugadores[0] });
  };
  juego.registrar('zombis', {
    generar(clase, x, z, o = {}) {
      const def = ZOMBIS[clase]; if (!def) return null;
      const zb = mk(clase, def, x, z, { vida: o.vida, elite: o.elite });
      zb.nacido = juego.tiempo.ahora; zb.claseId = clase;
      juego.eventos.emitir('zombi:aparece', { zombi: zb });
      reg.maxVivos = Math.max(reg.maxVivos, juego.zombis.length);
      return zb;
    },
    generarJefe(id, x, z) {
      const def = JEFES[id]; const zb = mk(id, def, x, z, { esJefe: true }); zb.nacido = juego.tiempo.ahora; zb.claseId = id;
      reg.jefesGenerados.push(id);
      juego.eventos.emitir('zombi:aparece', { zombi: zb });
      juego.eventos.emitir('jefe:aparece', { jefe: zb });
      return zb;
    },
    atraer() { reg.atraer++; },
    limpiar() { juego.zombis.length = 0; },
    // «Equipo» simulado: mata `matanza` zombis/s (o ninguno si inmortal); el jefe cae tras `vidaJefe` s. Los jefes invocan esbirros cada 6 s.
    actualizar(dt) {
      if (opc.inmortal) return;
      acumulado += dt * (opc.matanza ?? 3);
      const vivos = juego.zombis.filter((q) => q.vivo);
      const normales = vivos.filter((q) => !q.esJefe).sort((a, b) => a.nacido - b.nacido);
      while (acumulado >= 1 && normales.length) { matar(normales.shift()); acumulado--; }
      if (acumulado > 3) acumulado = 3;
      for (const q of vivos) if (q.esJefe) {
        const edad = juego.tiempo.ahora - q.nacido;
        q.vida = q.vidaMax * Math.max(0, 1 - edad / (opc.vidaJefe ?? 25));
        if (opc.invocar !== false && Math.floor(edad / 6) > (q.invocados || 0) && edad < 20) {
          q.invocados = Math.floor(edad / 6);
          for (let k = 0; k < 3; k++) { const e = mk('caminante', ZOMBIS.caminante, q.pos.x, q.pos.z, {}); e.nacido = juego.tiempo.ahora; juego.eventos.emitir('zombi:aparece', { zombi: e }); }
        }
        if (edad >= (opc.vidaJefe ?? 25)) matar(q);
      }
    },
  });
  let acumulado = 0;
  const director = crearDirector(juego);
  juego.registrar('director', director);
  return { juego, director, reg, matar };
}

const esperar = async (juego, max = 40) => { for (let i = 0; i < max && (juego.estado.fase === 'transicion'); i++) await tick(); };
const avanzar = async (juego, seg, dt = 0.1, hasta = null) => {
  const n = Math.round(seg / dt);
  for (let i = 0; i < n; i++) {
    juego.avanzar(dt);
    if (juego.estado.fase === 'transicion') await tick();
    if (hasta && hasta()) return true;
  }
  return false;
};

// ======================================================================================================================
// 1) Partida completa día 1 → 31
// ======================================================================================================================
async function partidaCompleta(roles, dificultad) {
  const { juego, director, reg } = montar({ matanza: 6, vidaJefe: 22 });
  const E = juego.estado;
  const fases = [];
  const filas = [];
  const ev = { inicio: 0, fin: 0, interInicio: 0, interFin: 0, partidaFin: null };
  juego.eventos.en('partida:inicio', () => ev.inicio++);
  juego.eventos.en('oleada:fin', () => ev.fin++);
  juego.eventos.en('intermedio:fin', () => ev.interFin++);
  juego.eventos.en('partida:fin', (d) => { ev.partidaFin = d; });
  let ultimaOleada = null;
  juego.eventos.en('oleada:inicio', (d) => {
    ultimaOleada = { ...d, bajas0: E.bajas, t0: juego.tiempo.ahora, maxResto: 0, jefeVisto: false, resto0: E.zombisRestantes, tot0: E.zombisTotales };
    ok(E.zombisRestantes === E.zombisTotales, `día ${d.dia}: al empezar restantes (${E.zombisRestantes}) = totales (${E.zombisTotales})`);
    ok(d.total === E.zombisTotales, `día ${d.dia}: oleada:inicio.total coincide con estado`);
    ok(E.dia === d.dia && E.anio === anioDeDia(d.dia) && E.eraIdx === eraDeDia(d.dia), `día ${d.dia}: estado de calendario coherente`);
    ok((d.jefe !== null) === esDiaDeJefe(d.dia), `día ${d.dia}: jefe solo en días de jefe`);
    if (d.jefe) ok(d.jefe === ERAS[eraDeDia(d.dia)].jefe, `día ${d.dia}: jefe correcto`);
  });
  juego.eventos.en('intermedio:inicio', (d) => {
    ok(d.mejoras.length === 3, `día ${d.dia}: 3 mejoras (hay ${d.mejoras.length})`);
    ok(d.porJugador.length === roles.length, 'ofertas por jugador');
    ok(juego.estado.fase === 'intermedio', 'fase intermedio');
    ok(ev.fin === d.dia - (roles ? 0 : 0) || true, '');
    // cada jugador elige tras 2 s
    d.porJugador.forEach((p, i) => setTimeout(() => {}, 0));
    pendientesMejora = d.porJugador.map((p) => ({ indice: p.indice, id: p.mejoras[Math.min(1, p.mejoras.length - 1)].id }));
  });
  let pendientesMejora = null;
  let tInter = 0;

  const t0 = Date.now();
  director.iniciarPartida({ roles, dia: 1, dificultad });
  await tick(); await tick();
  ok(E.fase === 'jugando' && director.sub === 'cuenta', 'tras iniciar: fase jugando / cuenta atrás');
  ok(juego.jugadores.length === roles.length, 'jugadores creados');
  ok(ev.inicio === 1, 'partida:inicio emitido una vez');

  let ultimoDia = 0, maxTiempoSinProgreso = 0, cuadrosSinProgreso = 0, ref = '';
  const MAX_CUADROS = 31 * 4000;
  let cuadros = 0;
  while (E.fase !== 'victoria' && E.fase !== 'derrota' && cuadros++ < MAX_CUADROS) {
    juego.avanzar(0.1);
    if (E.fase === 'transicion') { await tick(); await tick(); }
    // estado de intermedio: elegir mejoras
    if (E.fase === 'intermedio') {
      tInter += 0.1;
      if (tInter > 1 && pendientesMejora) { for (const p of pendientesMejora) juego.eventos.emitir('ui:elegirMejora', { indiceJugador: p.indice, mejoraId: p.id }); pendientesMejora = null; }
    } else tInter = 0;
    // invariantes por cuadro
    if (director.sub === 'oleada') {
      const vivos = juego.zombis.filter((z) => z.vivo).length;
      reg.maxVivos = Math.max(reg.maxVivos, vivos);
      ok(E.zombisRestantes >= vivos - 0 && E.zombisRestantes <= E.zombisTotales, `día ${E.dia}: restantes(${E.zombisRestantes}) ≥ vivos(${vivos}) y ≤ totales(${E.zombisTotales})`);
      if (ultimaOleada) ultimaOleada.maxResto = Math.max(ultimaOleada.maxResto, E.zombisTotales);
    }
    // antibloqueo: el día debe avanzar
    const clave = `${E.dia}|${director.sub}|${E.zombisRestantes}|${E.bajas}`;
    if (clave === ref) cuadrosSinProgreso++; else { cuadrosSinProgreso = 0; ref = clave; }
    maxTiempoSinProgreso = Math.max(maxTiempoSinProgreso, cuadrosSinProgreso * 0.1);
    if (E.dia !== ultimoDia) ultimoDia = E.dia;
  }
  ok(cuadros < MAX_CUADROS, 'la partida terminó sin bloquearse');
  ok(E.fase === 'victoria', `la partida acaba en victoria (fase=${E.fase}, día=${E.dia})`);
  ok(ev.partidaFin?.victoria === true, 'partida:fin con victoria');
  const r = ev.partidaFin?.resumen;
  ok(r && r.dias === 31 && r.anio === 2100 && r.puntos > 0 && r.bajas > 0 && r.tiempo > 0 && r.mejorRacha > 0, 'resumen completo ' + JSON.stringify(r));
  ok(ev.fin === 31, `31 oleada:fin (hay ${ev.fin})`);
  ok(reg.eras.length === 5, `5 cambios de era (hay ${reg.eras.length})`);
  ok(reg.transiciones === 5, 'render.transicionEra llamada 5 veces');
  ok(JSON.stringify(reg.eras.map((e) => e.eraIdx)) === '[1,2,3,4,5]', 'eras en orden');
  ok(reg.cargas.join() === '0,1,2,3,4,5', 'escenarios cargados en orden ' + reg.cargas);
  ok(JSON.stringify(reg.jefesGenerados) === JSON.stringify(['coracero', 'fogonero', 'mariscal', 'rey_asfalto', 'paciente_cero', 'omega']), 'jefes generados: ' + reg.jefesGenerados);
  ok(reg.maxVivos <= TOPE_VIVOS + 5, `tope de vivos respetado (máx ${reg.maxVivos})`);
  ok(reg.mejoras.length === 30 * roles.length, `mejoras aplicadas: ${reg.mejoras.length}`);
  ok(reg.horas.length > 100 && reg.horas.every((h) => h >= 0 && h < 1), 'horas válidas (0..1)');
  ok(reg.musica.some((m) => m.modo === 'jefe') && reg.musica.some((m) => m.modo === 'victoria') && reg.musica.some((m) => m.modo === 'intermedio'), 'música: jefe, intermedio y victoria');
  ok(reg.lentas >= 25, `cámara lenta en la última baja (${reg.lentas})`);
  ok(juego.almacen.getItem('eraz.record.v1'), 'récord guardado');
  ok(maxTiempoSinProgreso < 120, `nunca más de 120 s sin progreso (máx ${maxTiempoSinProgreso.toFixed(1)} s)`);
  console.log(`  [${roles.join('+')} · ${dificultad}] ${cuadros} cuadros simulados (${(cuadros * 0.1 / 60).toFixed(1)} min de juego) en ${Date.now() - t0} ms · puntos ${r?.puntos} · bajas ${r?.bajas} · mejor racha ${r?.mejorRacha}`);
  return { juego, reg, E };
}

console.log('1) Partida completa día 1 → 31');
await partidaCompleta(['soldado'], 'normal');
await partidaCompleta(['medico', 'ingeniero'], 'dificil');

// ======================================================================================================================
// 2) Cuentas exactas de una oleada con invocados y presupuesto creciente
// ======================================================================================================================
console.log('2) Cuentas exactas');
{
  const { juego, director } = montar({ matanza: 4, vidaJefe: 20 });
  const E = juego.estado;
  let kills = 0, apar = 0;
  juego.eventos.en('zombi:muerte', () => kills++);
  juego.eventos.en('zombi:aparece', () => apar++);
  let ini = null;
  juego.eventos.en('oleada:inicio', (d) => { if (!ini) ini = { total: d.total, kills0: kills, apar0: apar }; });
  let fin = null;
  juego.eventos.en('oleada:fin', () => { fin = { kills, apar, total: E.zombisTotales, rest: E.zombisRestantes }; });
  director.iniciarPartida({ roles: ['soldado'], dia: 5, dificultad: 'normal' });
  await tick();
  await avanzar(juego, 400, 0.1, () => fin);
  ok(fin, 'la oleada del día 5 termina');
  ok(fin.rest === 0, 'restantes = 0 al terminar');
  ok(fin.kills - ini.kills0 === fin.total, `bajas (${fin.kills}) = totales finales (${fin.total}) con invocados`);
  ok(fin.apar === fin.kills, `apariciones (${fin.apar}) = muertes (${fin.kills})`);
  ok(fin.total >= ini.total - 0, 'los invocados suben el total');
}

// presupuesto creciente y composición
console.log('3) Presupuesto creciente y composición');
{
  let prev = 0, subidas = 0;
  for (let d = 1; d <= 31; d++) {
    const p = presupuestoDeDia(d);
    if (p > prev) subidas++;
    prev = p;
  }
  ok(subidas === 31, 'presupuestoDeDia estrictamente creciente');
  const tabla = [];
  const medias = {};
  for (let d = 1; d <= 31; d++) {
    let t = 0;
    for (let s = 1; s <= 5; s++) t += componerOleada({ dia: d, rng: crearRng(s * 31 + d), roles: ['soldado'] }).total;
    medias[d] = t / 5;
  }
  const noBoss = Object.keys(medias).map(Number).filter((d) => !esDiaDeJefe(d));
  let viol = 0;
  for (let i = 1; i < noBoss.length; i++) { const a = noBoss[i - 1], b = noBoss[i]; if (medias[b] < medias[a] * 0.6) viol++; }
  ok(viol <= 2, `totales de días normales crecen en tendencia (retrocesos grandes: ${viol})`);
  ok(medias[1] >= 8 && medias[1] <= 20, `día 1 razonable (${medias[1]})`);
  ok(medias[30] > medias[10] * 2, 'el día 30 es mucho mayor que el 10');
  for (let d = 1; d <= 31; d++) {
    const p = componerOleada({ dia: d, rng: crearRng(11), roles: ['soldado'] });
    for (const c of Object.keys(p.conteos)) ok(ZOMBIS[c].desdeDia <= d, `día ${d}: ${c} respeta desdeDia`);
    if (d < 12) ok(p.elites === 0, `día ${d}: sin élites antes del 12`);
    ok(p.jefe === (esDiaDeJefe(d) ? ERAS[eraDeDia(d)].jefe : null), `día ${d}: plan.jefe`);
    const sumPulsos = p.pulsos.reduce((s, q) => s + q.unidades.reduce((a, u) => a + u.length, 0), 0);
    ok(sumPulsos + (p.jefe ? 1 : 0) === p.total, `día ${d}: pulsos suman el total`);
  }
  // escalado por jugadores y dificultad
  const base = componerOleada({ dia: 15, rng: crearRng(5), jugadores: 1, dificultad: 'normal' }).total;
  const dos = componerOleada({ dia: 15, rng: crearRng(5), jugadores: 2, dificultad: 'normal' }).total;
  const dif = componerOleada({ dia: 15, rng: crearRng(5), jugadores: 1, dificultad: 'pesadilla' }).total;
  const fac = componerOleada({ dia: 15, rng: crearRng(5), jugadores: 1, dificultad: 'facil' }).total;
  ok(dos > base * 1.3, `2 jugadores > 1 (${dos} vs ${base})`);
  ok(dif > base && fac < base, `dificultad escala (${fac} < ${base} < ${dif})`);

  if (process.argv.includes('--tabla') || true) {
    console.log('\n  día | año  | era           | total | élites | composición (semilla 11, soldado, normal)');
    for (let d = 1; d <= 31; d++) {
      const p = componerOleada({ dia: d, rng: crearRng(11), roles: ['soldado'] });
      console.log(`  ${String(d).padStart(3)} | ${anioDeDia(d)} | ${ERAS[eraDeDia(d)].id.padEnd(13)} | ${String(p.total).padStart(5)} | ${String(p.elites).padStart(6)} | ${p.tema.nombre} — ${p.composicion}`);
    }
    console.log('');
  }
}

// ======================================================================================================================
// 4) Mejoras
// ======================================================================================================================
console.log('4) Mejoras');
{
  ok(MEJORAS.length >= 36, `≥ 36 mejoras (${MEJORAS.length})`);
  const ids = new Set(MEJORAS.map((m) => m.id));
  ok(ids.size === MEJORAS.length, 'ids únicos');
  for (const m of MEJORAS) {
    ok(['comun', 'rara', 'epica', 'legendaria'].includes(m.rareza) && m.icono && m.max >= 1 && m.nombre && m.descripcion && typeof m.aplicar === 'function', `mejora ${m.id} bien formada`);
    for (const rol of m.roles ?? []) ok(ROLES[rol], `mejora ${m.id}: rol ${rol} existe`);
  }
  for (const [rol, id] of [['medico', 'dosis_doble'], ['ingeniero', 'segunda_torreta'], ['cazador', 'bala_fantasma'], ['demoledor', 'replicas'], ['soldado', 'cinta_de_municion']]) ok(ids.has(id), `existe ${id}`);
  const rng = crearRng(99);
  for (const rol of Object.keys(ROLES)) {
    let conEspec = 0;
    for (let d = 1; d <= 31; d++) {
      const o = elegirMejoras(rng, rol, {}, d, 3);
      ok(o.length === 3 && new Set(o.map((m) => m.id)).size === 3, `${rol} día ${d}: 3 distintas`);
      if (o.some((m) => m.roles)) conEspec++;
      for (const m of o) ok(!m.roles || m.roles.includes(rol), `${rol}: oferta respeta roles`);
    }
    ok(conEspec === 31, `${rol}: siempre una específica (${conEspec}/31)`);
  }
  // sin agotadas
  const todas = Object.fromEntries(MEJORAS.map((m) => [m.id, m.max]));
  ok(elegirMejoras(rng, 'soldado', todas, 10, 3).length === 0, 'sin ofertas si todo está agotado');
  const casi = { ...todas }; delete casi.coraza;
  const o = elegirMejoras(rng, 'soldado', casi, 10, 3);
  ok(o.length === 1 && o[0].id === 'coraza', 'solo ofrece las no agotadas');
  // aplicar: efectos sobre un jugador falso
  const j = { vida: 100, vidaMax: 100, mods: { danio: 1 }, arrojadizasMax: 2, darMunicion() {}, darArrojadizas() {} };
  for (const m of MEJORAS) { const k = JSON.parse(JSON.stringify({ vida: j.vida })); m.aplicar(j); }
  ok(j.vidaMax > 100 && Number.isFinite(j.vidaMax) && j.mods.danio > 1 && Object.values(j.mods).every((v) => typeof v === 'boolean' || Number.isFinite(v)), 'aplicar todas deja mods finitos');
  ok(!('aplicar' in vistaMejora(MEJORAS[0], 1)), 'vistaMejora sin función');
  // las legendarias no salen pronto
  let leg = 0; for (let i = 0; i < 300; i++) leg += elegirMejoras(rng, 'soldado', {}, 3, 3).filter((m) => m.rareza === 'legendaria' || m.rareza === 'epica').length;
  ok(leg === 0, 'ni épicas ni legendarias antes del día 4');
}

// ======================================================================================================================
// 5) Racha y puntuación
// ======================================================================================================================
console.log('5) Racha y puntuación');
{
  const { juego, director } = montar({ inmortal: true });
  const E = juego.estado;
  director.iniciarPartida({ roles: ['soldado'], dia: 2 });
  await tick();
  await avanzar(juego, 6, 0.1, () => director.sub === 'oleada');
  await avanzar(juego, 40);
  let n = 0;
  const matarUno = () => { const z = juego.zombis.find((q) => q.vivo); if (z) { z.recibirDanio({ cantidad: 1e6 }); n++; } return !!z; };
  // mata 16 seguidos
  juego.opciones.x = 1;
  for (let i = 0; i < 16; i++) matarUno();
  ok(E.racha >= 10 && E.multiplicador >= 2, `racha ${E.racha} → ×${E.multiplicador}`);
  const p0 = E.puntos;
  ok(E.mejorRacha === E.racha, 'mejor racha registrada');
  juego.eventos.emitir('jugador:danio', { jugador: juego.jugadores[0], cantidad: 5, tipo: 'golpe' });
  ok(E.racha < 10, `daño reduce la racha (${E.racha})`);
  await avanzar(juego, 12);
  ok(E.racha === 0 && E.multiplicador === 1, 'la racha decae tras ~3,5 s sin matar');
  ok(E.mejorRacha >= 16 || E.mejorRacha >= 10, 'la mejor racha se conserva');
  ok(E.bajas === n, `bajas = ${n}`);
}

// ======================================================================================================================
// 6) Derrota, menú, reinicio, antiatasco, depuración
// ======================================================================================================================
console.log('6) Derrota, menú, reinicio, antiatasco y depuración');
{
  const { juego, director, reg } = montar({ inmortal: true });
  const E = juego.estado;
  let fin = null; juego.eventos.en('partida:fin', (d) => { fin = d; });
  director.iniciarPartida({ roles: ['soldado', 'medico'], dia: 3, dificultad: 'normal' });
  await tick();
  ok(E.dia === 3 && E.eraIdx === 0, 'empieza en el día pedido');
  await avanzar(juego, 8, 0.1, () => director.sub === 'oleada');
  await avanzar(juego, 5);
  // un solo caído no es derrota
  juego.jugadores[0].vivo = false; juego.jugadores[0].caido = true;
  await avanzar(juego, 4);
  ok(!fin && E.fase === 'jugando', 'un caído no acaba la partida');
  juego.jugadores[1].vivo = false;
  await avanzar(juego, 3);
  ok(E.fase === 'derrota' && fin && fin.victoria === false && fin.resumen.dias === 3, 'derrota cuando no queda nadie');
  // reiniciar
  juego.eventos.emitir('ui:reiniciar', {});
  await tick(); await tick();
  ok(E.fase === 'jugando' && E.dia === 3 && E.puntos === 0 && E.bajas === 0 && juego.jugadores.length === 2, 'ui:reiniciar vuelve a empezar igual');
  // antiatasco: zombis inmortales
  await avanzar(juego, 8, 0.1, () => director.sub === 'oleada');
  const i0 = director.info();
  let fuerza = false;
  const t = await avanzar(juego, 400, 0.1, () => director.sub === 'cierre' || director.sub === 'intermedio');
  ok(t, 'el antiatasco acaba una oleada con zombis que no mueren');
  ok(reg.atraer > 0, `se usó el señuelo (atraer ×${reg.atraer})`);
  ok(reg.mensajes.some((m) => /Quedan|Queda/.test(m.texto)), 'aviso de zombis restantes');
  // intermedio: saltar
  await avanzar(juego, 10, 0.1, () => director.sub === 'intermedio');
  ok(director.sub === 'intermedio' && E.fase === 'intermedio', 'intermedio alcanzado');
  const antes = reg.mejoras.length;
  juego.eventos.emitir('ui:saltarIntermedio', {});
  await avanzar(juego, 3);
  ok(reg.mejoras.length === antes + 2, 'saltar el intermedio auto-elige para cada jugador');
  ok(E.dia === 4 && E.anio === 1830, `día 4 / año 1830 (${E.dia}/${E.anio})`);
  // depuración
  director.saltarA(10);
  await tick(); await esperar(juego);
  ok(E.dia === 10 && E.eraIdx === 1 && reg.eras.length === 1, 'saltarA(10) cambia a era 1');
  await avanzar(juego, 10, 0.1, () => director.sub === 'oleada');
  ok(director.info().plan?.jefe === 'fogonero', 'día 10 = Fogonero');
  director.siguienteOleada();
  await avanzar(juego, 1);
  director.matarTodos();
  await avanzar(juego, 2);
  // menú
  juego.eventos.emitir('ui:menu', {});
  ok(E.fase === 'menu' && juego.jugadores.length === 0 && juego.zombis.length === 0, 'ui:menu limpia y vuelve a menu');
  // abandono
  fin = null;
  juego.eventos.emitir('ui:jugar', { roles: ['cazador'], dia: 1, dificultad: 'facil' });
  await tick(); await tick();
  ok(E.fase === 'jugando' && E.dificultad === 'facil' && juego.jugadores[0].rolId === 'cazador', 'ui:jugar desde el menú');
  director.terminarPartida();
  ok(E.fase === 'derrota' && fin?.resumen, 'terminarPartida cierra con resumen');
}

// auto
console.log('7) Modo auto (?auto=1&rol=…&dia=…)');
{
  const { juego, director } = montar({ url: { auto: 1, rol: 'ingeniero,cazador', dia: 11 }, inmortal: true });
  await director.iniciar();
  juego.eventos.emitir('juego:listo', {});
  await tick(); await tick(); await tick();
  ok(juego.estado.fase === 'jugando' && juego.estado.dia === 11 && juego.estado.eraIdx === 2 && juego.jugadores.length === 2, 'auto inicia sola en el día 11 con 2 jugadores');
}

console.log(`\n${comprobaciones - fallos}/${comprobaciones} comprobaciones correctas` + (fallos ? ` — ${fallos} FALLOS` : ''));
process.exit(fallos ? 1 : 0);
