// Banco de pruebas de integración: un jugador automático juega partidas aceleradas sin dibujar.
// Uso desde pruebas/captura.mjs:
//   --eval "import('/pruebas/bot.js').then(m => m.correr({ segundos: 120 }))"
// sobre la página principal con ?auto=1&dia=N&rol=X (&dios=1 para que no muera).
// Devuelve un resumen: eventos contados, errores capturados, estado final, rendimiento de la simulación.

const PASO = 1 / 30;
const BOT = { pasivo: false };

export async function correr(o = {}) {
  const juego = window.juego;
  const segundos = o.segundos ?? 60;
  const dibujar = !!o.dibujar;
  BOT.pasivo = !!o.pasivo; // no dispara: deja que la horda se acerque (fotos)
  const errores = [];
  const contar = {};
  const t0 = performance.now();

  // Captura de errores de todo el juego
  const errOrig = console.error;
  console.error = (...a) => { errores.push(a.map(x => (x && x.stack) || String(x)).join(' ').slice(0, 400)); errOrig.apply(console, a); };
  const onErr = (e) => errores.push('[window] ' + (e.error?.stack || e.message).slice(0, 400));
  addEventListener('error', onErr);

  let simT = 0;
  // Contador de eventos
  const nombres = ['zombi:aparece', 'zombi:muerte', 'jefe:aparece', 'jefe:muerte', 'oleada:inicio', 'oleada:fin', 'intermedio:inicio',
    'era:cambio', 'escenario:cargado', 'jugador:danio', 'jugador:caido', 'jugador:muerte', 'partida:fin', 'arma:disparo', 'arma:recarga',
    'explosion', 'recogida', 'impacto', 'jugador:habilidad', 'vehiculo:atropello', 'estructura:creada'];
  const offs = nombres.map(n => juego.eventos.en(n, () => { contar[n] = (contar[n] || 0) + 1; }));
  const detalle = [];
  const resumir = (d) => { const o2 = {}; for (const k in d) { const v = d[k]; if (v == null || typeof v !== 'object') o2[k] = typeof v === 'number' ? +v.toFixed(2) : v; else o2[k] = v.clase?.id || v.def?.id || v.rol?.id || v.tipo || v.id || '[obj]'; } return o2; };
  for (const n of (o.detalle || ['jugador:danio', 'jugador:muerte', 'explosion'])) offs.push(juego.eventos.en(n, (d) => { if (detalle.length < 40) detalle.push({ t: +simT.toFixed(1), n, ...resumir(d || {}) }); }));

  // Detener el bucle real y, si no se pide dibujar, anular el coste del render
  juego.detener();
  const r = juego.render.renderer;
  const renderOrig = r.render.bind(r);
  if (!dibujar) r.render = () => {};

  const ent = juego.entrada;
  let cuadros = 0, maxZombis = 0, peorCuadro = 0, sumaCuadro = 0;
  const hitos = [];
  let faseAnt = '';
  while (simT < segundos) {
    if (juego.estado.fase === 'derrota' || juego.estado.fase === 'victoria') break;
    // Intermedio: el bot elige la primera mejora y salta
    if (juego.estado.fase === 'intermedio') juego.director?.saltarIntermedio?.();
    // Modo maratón: liquida la oleada en curso cada N segundos para recorrer la partida entera
    if (o.matarCada && juego.estado.subfase === 'oleada' && (simT % o.matarCada) < PASO) juego.director?.matarTodos?.();
    for (const j of juego.jugadores) ent?.simular?.(j.indice, intencionBot(juego, j, simT));
    const a = performance.now();
    juego.avanzar(PASO);
    const d = performance.now() - a;
    peorCuadro = Math.max(peorCuadro, d); sumaCuadro += d;
    simT += PASO; cuadros++;
    maxZombis = Math.max(maxZombis, juego.zombis.length);
    const f = juego.estado.fase + '/' + (juego.estado.subfase || '') + ' d' + juego.estado.dia;
    if (f !== faseAnt) { hitos.push(`${simT.toFixed(1)}s ${f}`); faseAnt = f; }
    if (cuadros % 15 === 0) await new Promise(res => setTimeout(res, 0)); // deja avanzar cargas asíncronas
  }

  for (const off of offs) off();
  removeEventListener('error', onErr);
  console.error = errOrig;
  r.render = renderOrig;
  for (const j of juego.jugadores) ent?.simular?.(j.indice, null);
  if (dibujar || o.foto) { for (let k = 0; k < (o.cuadrosFoto ?? 3); k++) juego.avanzar(1 / 60); } // dibuja sin pausar (la pausa abre el menú)

  const e = juego.estado;
  return {
    simulado: +simT.toFixed(1), real: +((performance.now() - t0) / 1000).toFixed(1), cuadros,
    msCuadroMedio: +(sumaCuadro / cuadros).toFixed(2), msCuadroPeor: +peorCuadro.toFixed(1), maxZombis,
    estado: { fase: e.fase, sub: e.subfase, dia: e.dia, anio: e.anio, era: e.eraIdx, restantes: e.zombisRestantes, totales: e.zombisTotales, puntos: e.puntos, bajas: e.bajas },
    jugadores: juego.jugadores.map(j => ({ rol: j.rol?.id, vida: Math.round(j.vida), vivo: j.vivo, arma: j.arma?.id, mun: j.arma?.municion, res: j.arma?.reserva })),
    mapa: juego.escenarios.actual?.id, zombisVivos: juego.zombis.length,
    eventos: contar, detalle, hitos: hitos.slice(0, 40), errores: [...new Set(errores)].slice(0, 15),
  };
}

// Jugador automático: busca el zombi más cercano, mantiene distancia, dispara, recarga, esquiva y usa la habilidad.
function intencionBot(juego, j, t) {
  const p = j.pos;
  let mejor = null, md = Infinity;
  for (const z of juego.zombis) {
    if (!z.vivo) continue;
    const d = Math.hypot(z.pos.x - p.x, z.pos.z - p.z);
    if (d < md) { md = d; mejor = z; }
  }
  const out = { moverX: 0, moverZ: 0, disparar: false, recargar: false, esquivar: false, habilidad: false, cuerpo: false, lanzar: false };
  // deambular hacia el centro si no hay nadie
  if (!mejor) {
    const dx = -p.x, dz = -p.z, l = Math.hypot(dx, dz);
    if (l > 4) { out.moverX = dx / l; out.moverZ = dz / l; }
    out.apuntar = { x: p.x + Math.sin(t) * 5, z: p.z + Math.cos(t) * 5 };
    return out;
  }
  const dx = mejor.pos.x - p.x, dz = mejor.pos.z - p.z, l = md || 1;
  out.apuntar = { x: mejor.pos.x, z: mejor.pos.z };
  const lejos = 11, cerca = 6;
  if (md > lejos) { out.moverX = dx / l; out.moverZ = dz / l; }
  else if (md < cerca) {
    // retroceder en diagonal para no quedar acorralado contra un muro
    const s = Math.sin(t * 0.7) > 0 ? 1 : -1;
    out.moverX = -dx / l + (-dz / l) * 0.6 * s; out.moverZ = -dz / l + (dx / l) * 0.6 * s;
  } else {
    // ametrallar en círculo
    out.moverX = -dz / l * 0.7; out.moverZ = dx / l * 0.7;
  }
  out.disparar = !BOT.pasivo && md < 30 && (Math.floor(t * 8) % 2 === 0 || j.arma?.def?.auto);
  if (j.arma && j.arma.municion === 0 && !j.arma.recargando) out.recargar = true;
  if (md < 2.2) { out.esquivar = true; out.cuerpo = true; }
  if (!BOT.pasivo && md < 9 && juego.zombis.length > 6) out.habilidad = true;
  if (!BOT.pasivo && md < 14 && juego.zombis.length > 10 && Math.floor(t) % 7 === 0) out.lanzar = true;
  return out;
}
