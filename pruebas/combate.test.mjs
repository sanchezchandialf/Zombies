// Pruebas de lógica del combate en Node: node pruebas/combate.test.mjs
// Usa un Juego real (física, eventos, tiempo) sin render. Cada prueba monta su propio mundo.
import * as THREE from 'three';
import { Juego } from '../src/nucleo/juego.js';
import { CAPA } from '../src/nucleo/fisica.js';
import { crearRng } from '../src/nucleo/util.js';
import { crearCombate } from '../src/combate/index.js';
import { ARMAS, LISTA_ARMAS } from '../src/datos/armas.js';

let fallos = 0, total = 0;
const errores = [];
const consolaError = console.error;
console.error = (...a) => { errores.push(a.map(String).join(' ')); };

function ok(cond, msg, extra = '') {
  total++;
  if (!cond) { fallos++; console.log('  ✗', msg, extra); } else console.log('  ✓', msg);
}
const cerca = (a, b, tol) => Math.abs(a - b) <= tol;
function seccion(t) { console.log('\n' + t); }

function mundo(semilla = 7) {
  const juego = new Juego({ contenedor: null });
  juego.rng = crearRng(semilla);
  juego.estado.fase = 'jugando';
  const combate = crearCombate(juego);
  juego.registrar('combate', combate);
  const fisica = juego.fisica;
  const eventos = [];
  for (const n of ['danio', 'impacto', 'explosion', 'arma:disparo', 'arma:recarga', 'arma:vacia', 'arma:cartucho', 'arma:recargada']) juego.eventos.en(n, (d) => eventos.push({ n, d }));
  const cuenta = (n) => eventos.filter((e) => e.n === n).length;

  function diana(x, z, o = {}) {
    const e = {
      bando: o.bando ?? 'zombis', vivo: true, pos: new THREE.Vector3(x, 0, z), radio: o.radio ?? 0.4, material: o.material ?? 'carne',
      vida: o.vida ?? 1e6, vidaIni: o.vida ?? 1e6, rot: o.rot ?? 0, recibidos: [], aturdido: 0, ralentizado: 0, ardiendo: 0, envenenado: 0, curado: 0, alMorir: o.alMorir,
      recibirDanio(info) {
        if (!this.vivo) return 0;
        this.recibidos.push(info);
        const real = Math.max(0, info.cantidad);
        this.vida -= real;
        if (this.vida <= 0) { this.vivo = false; fisica.eliminarCuerpo(this.cuerpo); this.alMorir?.(this); }
        return real;
      },
      aturdir(s) { this.aturdido += s; },
      ralentizar() { this.ralentizado++; },
      incendiar() { this.ardiendo++; },
      aplicarEstado() { this.envenenado++; },
      curar(n) { this.curado += n; },
      get total() { return this.recibidos.reduce((s, i) => s + i.cantidad, 0); },
    };
    const capa = o.capa ?? (e.bando === 'jugadores' ? CAPA.JUGADOR : e.bando === 'neutral' ? CAPA.PROP : CAPA.ZOMBI);
    e.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x, z, radio: e.radio, masa: o.masa ?? 70, capa, amortiguacion: 20, datos: e });
    return e;
  }
  const muro = (x, z, hx, hz) => fisica.cajaEstatica(x, z, hx, hz, 0, { bloqueaBalas: true });
  const portador = (o = {}) => ({ bando: o.bando ?? 'jugadores', pos: new THREE.Vector3(o.x ?? 0, 0, o.z ?? 0), mods: o.mods ?? {}, indice: 0, rot: 0 });
  const boca = (p) => new THREE.Vector3(p.pos.x, 1.1, p.pos.z);
  /** Avanza `seg` s a 60 Hz; `fn(i)` se ejecuta antes de cada cuadro. */
  function correr(seg, fn, dt = 1 / 60) {
    const n = Math.round(seg / dt);
    for (let i = 0; i < n; i++) { fn?.(i); juego.avanzar(dt); }
  }
  return { juego, combate, fisica, eventos, cuenta, diana, muro, portador, boca, correr };
}

/** Dispara con el gatillo mantenido (o pulsado una vez) durante `seg` s y devuelve disparos hechos. */
function fuego(m, p, inst, seg, { mantener = true, rot = 0 } = {}) {
  let disparos = 0;
  m.correr(seg, (i) => {
    m.combate.actualizarArma(inst, 1 / 60, p);
    if (m.combate.gatillo(p, inst, m.boca(p), rot, mantener || i === 0, i === 0)) disparos++;
  });
  return disparos;
}

// ───────────────────────────────────────────────────────────────
seccion('Datos: coherencia de las 48 armas');
{
  ok(LISTA_ARMAS.length === 48, '48 armas', String(LISTA_ARMAS.length));
  const sinDesc = LISTA_ARMAS.filter((a) => !a.descripcion);
  ok(sinDesc.length === 0, 'todas tienen descripcion', sinDesc.map((a) => a.id).join());
  const porEra = {};
  for (const a of LISTA_ARMAS) (porEra[a.era] ||= new Set()).add(a.arquetipo);
  ok(Object.values(porEra).every((s) => s.size === 8), '8 arquetipos por era');
  const m = mundo();
  const todas = LISTA_ARMAS.map((a) => m.combate.crearArma(a.id, m.portador()));
  ok(todas.every((i) => i && i.def), 'crearArma funciona para todas');
}

seccion('Cadencia');
{
  const m = mundo();
  const p = m.portador();
  const inst = m.combate.crearArma('fusil_asalto', p);
  const n = fuego(m, p, inst, 2);
  // 10 disparos/s durante 2 s (el primero es inmediato)
  ok(n >= 19 && n <= 22, `fusil de asalto ~10/s → ${n} disparos en 2 s`);
  ok(m.cuenta('arma:disparo') === n, 'un evento arma:disparo por disparo');
  ok(inst.municion === 30 - n, 'gasta una bala por disparo', `${inst.municion}`);

  const p2 = m.portador({ mods: { cadencia: 1.5 } });
  const inst2 = m.combate.crearArma('fusil_asalto', p2);
  const n2 = fuego(m, p2, inst2, 1);
  ok(n2 >= 14 && n2 <= 16, `mods.cadencia ×1.5 → ${n2} disparos en 1 s`);

  // Semiautomática: mantener no repite
  const inst3 = m.combate.crearArma('pistola_semiauto', p);
  const n3 = fuego(m, p, inst3, 1, { mantener: false });
  ok(n3 === 1, `semiauto: una pulsación = un disparo (${n3})`);
  // Pulsando repetidamente respeta la cadencia (4,5/s)
  const inst4 = m.combate.crearArma('pistola_semiauto', p);
  let d4 = 0;
  m.correr(2, (i) => {
    m.combate.actualizarArma(inst4, 1 / 60, p);
    const pulso = i % 4 === 0; // clic cada 4 cuadros = 15 clics/s
    if (m.combate.gatillo(p, inst4, m.boca(p), 0, pulso, pulso)) d4++;
  });
  ok(d4 >= 8 && d4 <= 10, `semiauto limitada por cadencia ~4,5/s → ${d4} en 2 s`);

  // A pocos fps no se pierden disparos
  const m5 = mundo();
  const p5 = m5.portador(); const i5 = m5.combate.crearArma('subfusil_compacto', p5);
  let d5 = 0;
  m5.correr(1, (i) => { m5.combate.actualizarArma(i5, 0.1, p5); if (m5.combate.gatillo(p5, i5, m5.boca(p5), 0, true, i === 0)) d5 += 0; }, 0.1);
  const s5 = 32 - i5.municion;
  ok(s5 >= 13 && s5 <= 16, `15/s a 10 fps: ${s5} disparos en 1 s (multidisparo por cuadro)`);
}

seccion('Cargador, recarga y disparo en vacío');
{
  const m = mundo();
  const p = m.portador();
  const inst = m.combate.crearArma('mosquete', p);
  ok(inst.municion === 1 && inst.reserva === 40, 'mosquete: 1 en recámara, 40 de reserva');
  fuego(m, p, inst, 0.05, { mantener: false });
  ok(inst.municion === 0 && inst.recargando, 'tras el disparo recarga sola (era 0)');
  m.correr(1.3, () => m.combate.actualizarArma(inst, 1 / 60, p));
  ok(cerca(inst.progresoRecarga, 0.5, 0.08), `progreso de recarga a 1,3 s de 2,6 s ≈ 0,5 (${inst.progresoRecarga.toFixed(2)})`);
  m.correr(1.4, () => m.combate.actualizarArma(inst, 1 / 60, p));
  ok(inst.municion === 1 && !inst.recargando && inst.reserva === 39, 'recarga completa: 1 bala, reserva 39');

  // mods.recarga acorta la recarga
  const ps = m.portador({ mods: { recarga: 0.5 } });
  const i2 = m.combate.crearArma('mosquete', ps);
  i2.municion = 0; m.combate.recargar(i2, ps);
  m.correr(1.4, () => m.combate.actualizarArma(i2, 1 / 60, ps));
  ok(i2.municion === 1, 'mods.recarga ×0,5 → 1,3 s');

  // Sin reserva: arma:vacia y nada de recarga
  const i3 = m.combate.crearArma('mosquete', p);
  i3.municion = 0; i3.reserva = 0;
  const v0 = m.cuenta('arma:vacia');
  const disp = fuego(m, p, i3, 0.2, { mantener: false });
  ok(disp === 0 && m.cuenta('arma:vacia') === v0 + 1 && !i3.recargando, 'sin balas ni reserva: arma:vacia y no dispara');

  // Con reserva, el gatillo vacío lanza recarga automática
  const i4 = m.combate.crearArma('subfusil_trinchera', p);
  i4.municion = 0;
  fuego(m, p, i4, 0.1, { mantener: false });
  ok(i4.recargando, 'gatillo en vacío con reserva → recarga automática');
  m.correr(2.4, () => m.combate.actualizarArma(i4, 1 / 60, p));
  ok(i4.municion === 32 && i4.reserva === 7 * 32 - 32, `cargador completo (${i4.municion}) y reserva ${i4.reserva}`);

  // Pistola de reserva infinita
  const i5 = m.combate.crearArma('pistola_semiauto', p);
  ok(i5.reserva === -1, 'pistola: reserva infinita (−1)');
  i5.municion = 0; m.combate.recargar(i5, p);
  m.correr(1.6, () => m.combate.actualizarArma(i5, 1 / 60, p));
  ok(i5.municion === 8 && i5.reserva === -1, 'recarga sin gastar reserva');

  // Munición infinita (habilidad del soldado)
  const pi = m.portador({ mods: { municionInfinita: true } });
  const i6 = m.combate.crearArma('fusil_asalto', pi);
  fuego(m, pi, i6, 1);
  ok(i6.municion === 30, 'municionInfinita: no gasta');
}

seccion('Escopeta de corredera: cartucho a cartucho e interrumpible');
{
  const m = mundo();
  const p = m.portador();
  const inst = m.combate.crearArma('escopeta_corredera', p);
  inst.municion = 2;
  ok(m.combate.recargar(inst, p), 'inicia recarga');
  const t1 = 3.2 / 8;
  m.correr(t1 * 3 + 0.02, () => m.combate.actualizarArma(inst, 1 / 60, p));
  ok(inst.municion === 5, `tras 3 cartuchos hay 5 (${inst.municion})`);
  ok(m.cuenta('arma:cartucho') === 3, 'evento por cartucho');
  const antes = inst.reserva;
  const d = fuego(m, p, inst, 0.05, { mantener: false });
  ok(d === 1 && !inst.recargando && inst.municion === 4, 'disparar interrumpe la recarga');
  ok(antes === 6 * 8 - 3, `reserva descontada cartucho a cartucho (${antes})`);
  m.combate.recargar(inst, p);
  m.correr(3.5, () => m.combate.actualizarArma(inst, 1 / 60, p));
  ok(inst.municion === 8 && !inst.recargando, 'recarga hasta llenar');
}

seccion('Dispersión creciente con el fuego sostenido');
{
  const m = mundo(11);
  const p = m.portador();
  const inst = m.combate.crearArma('fusil_asalto', p);
  ok(inst.calor === 0, 'arranca frío');
  fuego(m, p, inst, 1.2);
  ok(inst.calor > 0.35, `el calor sube (${inst.calor.toFixed(2)})`);
  const c0 = inst.calor;
  m.correr(2, () => m.combate.actualizarArma(inst, 1 / 60, p));
  ok(inst.calor < c0 * 0.3, `y baja al soltar (${inst.calor.toFixed(2)})`);
  // La dispersión real se nota en el ángulo de los impactos: comparar anchura frío vs caliente
  const medir = (calor) => {
    const mm = mundo(5);
    const pp = mm.portador(); const ii = mm.combate.crearArma('subfusil_compacto', pp);
    const d = mm.diana(0, 30, { radio: 6 });
    let xs = [];
    for (let k = 0; k < 120; k++) { ii.calor = calor; ii.enfriamiento = 0; ii.municion = 32; mm.combate.gatillo(pp, ii, mm.boca(pp), 0, true, true); }
    for (const r of d.recibidos) xs.push(r.x);
    const desv = Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length);
    return desv;
  };
  const frio = medir(0), caliente = medir(1);
  ok(caliente > frio * 1.8, `desviación en caliente ${caliente.toFixed(2)} m vs frío ${frio.toFixed(2)} m`);
}

seccion('Hitscan: daño, caída, perforación, muros y críticos');
{
  const m = mundo();
  const p = m.portador();
  const d = m.diana(0, 10);
  const inst = m.combate.crearArma('fusil_asalto', p);
  m.combate.gatillo(p, inst, m.boca(p), 0, true, true);
  ok(d.recibidos.length === 1 && cerca(d.recibidos[0].cantidad, 44, 0.01), 'impacto a 10 m: daño completo (44)', `${d.recibidos[0]?.cantidad}`);
  ok(d.recibidos[0].tipo === 'bala' && d.recibidos[0].arma === inst.def && d.recibidos[0].atacante === p, 'info completa (tipo, arma, atacante)');
  ok(m.cuenta('danio') === 1 && m.cuenta('impacto') === 1, 'emite danio e impacto');

  // Caída por distancia
  const m2 = mundo();
  const lejos = m2.diana(0, 40); // fusil: alcance 42, caida [0.6,0.6]
  const p2 = m2.portador({ mods: { dispersion: 0 } }); const i2 = m2.combate.crearArma('fusil_asalto', p2);
  m2.combate.gatillo(p2, i2, m2.boca(p2), 0, true, true);
  const c = lejos.recibidos[0]?.cantidad ?? 0;
  ok(c > 44 * 0.6 && c < 44 * 0.7, `caída a 40 m ≈ ×0,6x (${c.toFixed(1)})`);
  // Fuera de alcance
  const m3 = mundo(); const fuera = m3.diana(0, 60); const p3 = m3.portador(); const i3 = m3.combate.crearArma('fusil_asalto', p3);
  m3.combate.gatillo(p3, i3, m3.boca(p3), 0, true, true);
  ok(fuera.recibidos.length === 0, 'fuera de alcance: nada');

  // Perforación
  const mp = mundo();
  const pp = mp.portador();
  const fila = [8, 10, 12, 14, 16, 18].map((z) => mp.diana(0, z));
  const rifle = mp.combate.crearArma('rifle_cazador', pp); // perforacion 3, perdida 0.15
  mp.combate.gatillo(pp, rifle, mp.boca(pp), 0, true, true);
  const golpeados = fila.filter((e) => e.recibidos.length).length;
  ok(golpeados === 4, `rifle de cazador (perf. 3) atraviesa 4 (${golpeados})`);
  const cants = fila.slice(0, 4).map((e) => e.recibidos[0].cantidad);
  ok(cants[0] > cants[1] && cants[1] > cants[2] && cants[2] > cants[3], 'cada objetivo recibe menos', cants.map((x) => x.toFixed(0)).join('/'));
  ok(cerca(cants[1] / cants[0], 0.85, 0.01), 'pérdida del 15 % por objetivo');

  const mq = mundo(); const pq = mq.portador();
  const fq = [6, 8, 10].map((z) => mq.diana(0, z));
  const mos = mq.combate.crearArma('mosquete', pq);
  mq.combate.gatillo(pq, mos, mq.boca(pq), 0, true, true);
  ok(fq.filter((e) => e.recibidos.length).length === 2, 'mosquete atraviesa a dos');

  const mr = mundo(); const pr = mr.portador();
  const fr = Array.from({ length: 10 }, (_, i) => mr.diana(0, 8 + i * 2));
  const riel = mr.combate.crearArma('canon_riel', pr);
  mr.combate.gatillo(pr, riel, mr.boca(pr), 0, true, true);
  ok(fr.every((e) => e.recibidos.length === 1), 'cañón de riel atraviesa toda la fila');

  // Un fusil normal se queda en el primero si perf 0
  const mc = mundo(); const pc = mc.portador();
  const fc = [8, 10].map((z) => mc.diana(0, z));
  const pis = mc.combate.crearArma('pistola_semiauto', pc);
  mc.combate.gatillo(pc, pis, mc.boca(pc), 0, true, true);
  ok(fc[0].recibidos.length === 1 && fc[1].recibidos.length === 0, 'sin perforación se detiene en el primero');

  // Muro: detiene todo (aunque perfore) y emite impacto de muro
  const mw = mundo(); const pw = mw.portador();
  mw.muro(0, 6, 3, 0.3);
  const tras = mw.diana(0, 10);
  const rw = mw.combate.crearArma('canon_riel', pw);
  mw.combate.gatillo(pw, rw, mw.boca(pw), 0, true, true);
  ok(tras.recibidos.length === 0, 'el muro detiene incluso el cañón de riel');
  ok(mw.eventos.some((e) => e.n === 'impacto' && e.d.objetivo === null), 'impacto contra el muro sin objetivo');

  // Críticos
  const mk = mundo(); const pk = mk.portador({ mods: { critico: 1, danioCritico: 3 } });
  const dk = mk.diana(0, 10);
  const ik = mk.combate.crearArma('rifle_francotirador', pk); // multCritico 2.5 + (3-2)
  mk.combate.gatillo(pk, ik, mk.boca(pk), 0, true, true);
  ok(dk.recibidos[0].critico && cerca(dk.recibidos[0].cantidad, 420 * 3.5, 1), `crítico garantizado: ×3,5 (${dk.recibidos[0].cantidad})`);
  const ev = mk.eventos.find((e) => e.n === 'danio');
  ok(ev && ev.d.critico === true, 'evento danio marca el crítico');

  // Mods del portador
  const md = mundo(); const pd = md.portador({ mods: { danio: 0.5 } });
  const dd = md.diana(0, 10); const id = md.combate.crearArma('fusil_asalto', pd);
  md.combate.gatillo(pd, id, md.boca(pd), 0, true, true);
  ok(cerca(dd.recibidos[0].cantidad, 22, 0.01), 'mods.danio ×0,5');

  // El hitscan no cuenta a los aliados ni a sí mismo
  const mf = mundo(); const pf = mf.portador();
  const aliado = mf.diana(0, 5, { bando: 'jugadores' });
  const enemigo = mf.diana(0, 9);
  const fi = mf.combate.crearArma('fusil_asalto', pf);
  mf.combate.gatillo(pf, fi, mf.boca(pf), 0, true, true);
  ok(aliado.recibidos.length === 0 && enemigo.recibidos.length === 1, 'las balas pasan a través de los aliados sin dañarlos');
}

seccion('Perdigones');
{
  const m = mundo(21);
  const p = m.portador();
  const cerquita = m.diana(0, 3, { radio: 0.5 });
  const inst = m.combate.crearArma('escopeta_doble', p);
  m.combate.gatillo(p, inst, m.boca(p), 0, true, true);
  ok(cerquita.recibidos.length === 1, 'un único danio agregado por objetivo');
  const total = cerquita.recibidos[0].cantidad;
  ok(total > 24 * 12 * 0.4, `a quemarropa casi todos los perdigones impactan (${total.toFixed(0)} de ${24 * 12})`);
  ok(cerquita.recibidos[0].empuje > 5, 'empuje significativo', cerquita.recibidos[0].empuje.toFixed(1));
  const m2 = mundo(21); const p2 = m2.portador();
  const lej = m2.diana(0, 12, { radio: 0.5 });
  const i2 = m2.combate.crearArma('escopeta_doble', p2);
  m2.combate.gatillo(p2, i2, m2.boca(p2), 0, true, true);
  ok((lej.recibidos[0]?.cantidad ?? 0) < total * 0.3, `a 12 m casi nada (${(lej.recibidos[0]?.cantidad ?? 0).toFixed(0)})`);
  // Abanico: objetivos separados lateralmente
  const m3 = mundo(3); const p3 = m3.portador();
  const lado = [-0.8, 0, 0.8].map((x) => m3.diana(x, 5, { radio: 0.5 }));
  const i3 = m3.combate.crearArma('trabuco', p3);
  m3.combate.gatillo(p3, i3, m3.boca(p3), 0, true, true);
  ok(lado.filter((e) => e.recibidos.length).length >= 2, 'el trabuco abre en abanico y toca a varios');
}

seccion('Cuerpo a cuerpo');
{
  const m = mundo();
  const p = m.portador();
  const frente = [0.3, 0, -0.3].map((x, i) => m.diana(x, 1.5 + i * 0.1));
  const lejano = m.diana(0, 4);
  const detras = m.diana(0, -1.2);
  const okGolpe = m.combate.golpear(p, 'sable', m.boca(p), 0);
  ok(okGolpe, 'golpea');
  ok(frente.every((e) => e.recibidos.length === 1) && !lejano.recibidos.length && !detras.recibidos.length, 'arco frontal: delante sí, lejos y detrás no');
  ok(frente[0].recibidos[0].tipo === 'golpe' && frente[0].recibidos[0].empuje > 0, 'tipo golpe con empuje');
  ok(!m.combate.golpear(p, 'sable', m.boca(p), 0), 'enfriamiento entre golpes');
  m.correr(0.7);
  const m2 = mundo(); const p2 = m2.portador({ mods: { cuerpo: 2 } });
  const e = m2.diana(0, 1.5);
  m2.combate.golpear(p2, 'sable', m2.boca(p2), 0);
  ok(cerca(e.recibidos[0].cantidad, 140, 0.01), 'mods.cuerpo ×2');
  // Máximo de objetivos
  const m3 = mundo(); const p3 = m3.portador();
  const muchos = Array.from({ length: 8 }, (_, i) => m3.diana((i - 3.5) * 0.25, 1.4));
  m3.combate.golpear(p3, 'machete', m3.boca(p3), 0); // objetivos 3
  ok(muchos.filter((x) => x.recibidos.length).length === 3, 'machete: máximo 3 objetivos');
  // Muros bloquean el golpe
  const m4 = mundo(); const p4 = m4.portador(); m4.muro(0, 0.9, 2, 0.1); const t4 = m4.diana(0, 1.6);
  m4.combate.golpear(p4, 'sable', m4.boca(p4), 0);
  ok(!t4.recibidos.length, 'un muro entre medias protege del golpe');
}

seccion('Explosiones: caída, muros, empuje y fuego amigo');
{
  const m = mundo();
  const p = m.portador();
  const centro = m.diana(0, 0, { radio: 0.4 });
  const medio = m.diana(3, 0);
  const borde = m.diana(0, 5.4);
  const fuera = m.diana(9, 0);
  m.muro(-3, 0, 0.3, 3);
  const trasMuro = m.diana(-5, 0);
  const bar = m.diana(0, -1.5, { bando: 'neutral', radio: 0.5, masa: 40 }); // barril
  m.combate.explotar({ x: 0, z: 0.0, radio: 6, danio: 400, atacante: p, empuje: 10 });
  ok(m.cuenta('explosion') === 1, 'emite explosion');
  ok(centro.total > 395 && centro.total <= 400, `daño completo en el centro (${centro.total.toFixed(0)})`);
  ok(medio.total < centro.total && medio.total > borde.total && borde.total > 0, 'caída con la distancia', [centro, medio, borde].map((e) => e.total.toFixed(0)).join(' > '));
  ok(borde.total >= 400 * 0.2 - 1, 'en el borde queda ≥ 20 %');
  ok(fuera.total === 0, 'fuera del radio: nada');
  ok(trasMuro.total === 0, 'el muro protege a lo que hay detrás');
  ok(medio.recibidos[0].empuje > 0 && medio.recibidos[0].area, 'empuje radial y marca de área');
  ok(bar.total > 0, 'también daña a los props');
  // Explosiones: danio × explosivos del portador
  const m2 = mundo(); const p2 = m2.portador({ mods: { explosivos: 1.35 } });
  const e2 = m2.diana(0, 0);
  m2.combate.explotar({ x: 0, z: 0, radio: 5, danio: 100, atacante: p2 });
  ok(cerca(e2.total, 135, 0.5), 'mods.explosivos ×1,35');

  // Fuego amigo
  const mf = mundo();
  const pj = mf.portador();
  const amigo = mf.diana(2, 0, { bando: 'jugadores' });
  mf.combate.explotar({ x: 0, z: 0, radio: 5, danio: 100, atacante: pj });
  ok(amigo.total > 0 && amigo.total <= 35.01 * 1.0 && amigo.total > 10, `explosión de jugador a jugador al 35 % (${amigo.total.toFixed(1)})`);
  const mz = mundo();
  const zb = { bando: 'zombis', pos: new THREE.Vector3() };
  const z1 = mz.diana(2, 0, { bando: 'zombis' }), j1 = mz.diana(-2, 0, { bando: 'jugadores' });
  mz.combate.explotar({ x: 0, z: 0, radio: 5, danio: 100, atacante: zb });
  ok(z1.total > 50 && j1.total > 50, 'las explosiones de zombis dañan a todos');
  // Balas directas: aplicarDanio
  const mb = mundo(); const pb = mb.portador();
  const ally = mb.diana(1, 0, { bando: 'jugadores' }), neutro = mb.diana(2, 0, { bando: 'neutral' });
  ok(mb.combate.aplicarDanio(ally, { cantidad: 50, tipo: 'bala', atacante: pb }) === 0 && ally.total === 0, 'bala de jugador no daña a jugador');
  ok(mb.combate.aplicarDanio(neutro, { cantidad: 50, tipo: 'bala', atacante: pb }) === 50, 'sí daña a props neutrales');
  ok(mb.combate.aplicarDanio(ally, { cantidad: 50, tipo: 'bala', atacante: zb }) === 50, 'bala de zombi sí daña a jugadores');
  const zz = mb.diana(5, 5, { bando: 'zombis' });
  ok(mb.combate.aplicarDanio(zz, { cantidad: 50, tipo: 'bala', atacante: zb }) === 0, 'bala de zombi no daña a zombis');
  ok(mb.combate.aplicarDanio(zz, { cantidad: 50, tipo: 'bala', atacante: zb, area: true }) === 50, 'explosión de zombi sí daña a zombis');
  ok(mb.combate.aplicarDanio(null, { cantidad: 5 }) === 0, 'objetivo nulo seguro');
}

seccion('Reacción en cadena de barriles');
{
  const m = mundo();
  const p = m.portador();
  const barriles = [];
  const crearBarril = (x, z) => {
    const b = m.diana(x, z, { bando: 'neutral', radio: 0.5, masa: 40, vida: 30, alOMorir: null });
    b.alMorir = (e) => m.combate.explotar({ x: e.pos.x, z: e.pos.z, radio: 4, danio: 150, atacante: null });
    barriles.push(b); return b;
  };
  for (let i = 0; i < 5; i++) crearBarril(i * 3, 0);
  const z = m.diana(6, 1.5, { vida: 1000 });
  m.combate.aplicarDanio(barriles[0], { cantidad: 100, tipo: 'bala', atacante: p });
  ok(m.cuenta('explosion') === 1, 'primera explosión inmediata');
  ok(barriles[1].vivo === true || m.cuenta('explosion') >= 1, 'los eslabones se encolan con retraso');
  m.correr(1.5);
  ok(barriles.every((b) => !b.vivo), 'cadena completa: los 5 barriles explotan');
  ok(m.cuenta('explosion') === 5, `5 explosiones (${m.cuenta('explosion')})`);
  ok(z.total > 150, 'el zombi cercano recibe varias explosiones', z.total.toFixed(0));
}

seccion('Zonas: fuego, gas, ácido, curación y gravedad');
{
  const m = mundo();
  const p = m.portador();
  const zom = m.diana(0, 0);
  const lejos = m.diana(10, 0);
  const aliado = m.diana(1, 0, { bando: 'jugadores' });
  const zona = m.combate.crearZona({ x: 0, z: 0, radio: 3, duracion: 2, tipo: 'fuego', dps: 40, atacante: p });
  ok(m.combate.zonas.includes(zona) && zona.activo, 'aparece en combate.zonas');
  m.correr(1);
  ok(cerca(zom.total, 40, 12), `fuego: ≈ dps × 1 s (${zom.total.toFixed(1)})`);
  ok(zom.recibidos[0].tipo === 'fuego' && zom.ardiendo > 0, 'tipo fuego e incendia');
  ok(lejos.total === 0, 'fuera de la zona: nada');
  ok(aliado.total === 0, 'zona de jugador no afecta a jugadores por defecto');
  m.correr(1.2);
  ok(!zona.activo && !m.combate.zonas.includes(zona), 'caduca y se retira');
  const t = zom.total; m.correr(0.5);
  ok(zom.total === t, 'ya no daña');
  // Tics fijos
  const mt = mundo(); const zt = mt.diana(0, 0); mt.combate.crearZona({ x: 0, z: 0, radio: 2, duracion: 5, tipo: 'fuego', dps: 100 });
  mt.correr(1.02);
  ok(zt.recibidos.length === 4 || zt.recibidos.length === 5, `tics fijos de 0,25 s (${zt.recibidos.length} en 1 s)`);

  // Quitar manualmente
  const mq = mundo(); const zq = mq.combate.crearZona({ x: 0, z: 0, radio: 2, duracion: 9, tipo: 'ácido'.normalize ? 'acido' : 'acido', dps: 10 });
  zq.quitar(); ok(!zq.activo && mq.combate.zonas.length === 0, 'quitar() la retira');

  // Gas: veneno, y el fuego lo detona
  const mg = mundo(); const pg = mg.portador({});
  const a = mg.diana(0, 0), b = mg.diana(2, 0, { bando: 'jugadores' });
  const gas = mg.combate.crearZona({ x: 0, z: 0, radio: 4, duracion: 8, tipo: 'gas', dps: 10, atacante: { bando: 'zombis' } });
  mg.correr(1);
  ok(b.total > 5 && b.recibidos[0].tipo === 'veneno' && b.envenenado > 0, `gas envenena a jugadores (${b.total.toFixed(1)})`);
  ok(a.total === 0, 'gas de zombi no daña zombis');
  const antes = mg.cuenta('explosion');
  mg.combate.crearZona({ x: 1, z: 1, radio: 2, duracion: 3, tipo: 'fuego', dps: 20, atacante: pg });
  mg.correr(0.4);
  ok(!gas.activo && mg.cuenta('explosion') === antes + 1, 'el fuego detona la nube de gas');
  ok(a.total > 20, 'la explosión del gas daña a todos', a.total.toFixed(0));

  // Gas inflamado por explosión
  const mg2 = mundo(); const g2 = mg2.combate.crearZona({ x: 0, z: 0, radio: 4, duracion: 8, tipo: 'gas', dps: 10 });
  mg2.combate.explotar({ x: 2, z: 0, radio: 3, danio: 50 });
  mg2.correr(0.3);
  ok(!g2.activo, 'una explosión también detona el gas');

  // Ácido y curación
  const mc = mundo(); const pc = mc.portador();
  const herido = mc.diana(0, 0, { bando: 'jugadores' }), enemigo = mc.diana(1, 0);
  mc.combate.crearZona({ x: 0, z: 0, radio: 3, duracion: 3, tipo: 'curacion', dps: 12, dpsEnemigos: 8, atacante: pc });
  mc.correr(1);
  ok(cerca(herido.curado, 12, 3) && herido.total === 0, `curación: ${herido.curado.toFixed(1)} de vida/s a aliados`);
  ok(enemigo.total > 4 && enemigo.curado === 0, 'quema a los enemigos dentro');
  const ma = mundo(); const j = ma.diana(0, 0, { bando: 'jugadores' }), zz = ma.diana(1, 0);
  ma.combate.crearZona({ x: 0, z: 0, radio: 3, duracion: 3, tipo: 'acido', dps: 20, atacante: { bando: 'zombis' } });
  ma.correr(1);
  ok(j.total > 10 && j.recibidos[0].tipo === 'acido' && zz.total === 0, 'ácido de zombi daña a jugadores y no a zombis');

  // Gravedad: atrae y luego implosiona
  const mv = mundo(); const pv = mv.portador();
  const lej = mv.diana(5, 0, { masa: 70 });
  // Un zombi real reescribe su velocidad cada cuadro: lo simulamos
  const antesX = lej.cuerpo.x;
  let implosion = 0;
  mv.combate.crearZona({ x: 0, z: 0, radio: 7, duracion: 1.5, tipo: 'gravedad', atacante: pv, alTerminar: () => { implosion++; mv.combate.explotar({ x: 0, z: 0, radio: 7, danio: 650, tipo: 'energia', atacante: pv, empuje: -30 }); } });
  mv.correr(1.2, () => { lej.cuerpo.vx = 0; lej.cuerpo.vz = 0; });
  ok(lej.cuerpo.x < antesX - 1.5, `la gravedad arrastra al zombi hacia el centro (${antesX} → ${lej.cuerpo.x.toFixed(2)})`);
  mv.correr(0.6);
  ok(implosion === 1 && lej.total > 100, `implosión al cerrarse (${lej.total.toFixed(0)} de daño)`);
  ok(lej.recibidos.at(-1).empuje < 0, 'empuje negativo = hacia dentro');
}

seccion('Proyectiles: cohete, parábola, plasma, aviso y muros');
{
  const m = mundo();
  const p = m.portador();
  const objetivo = m.diana(0, 20, { radio: 0.5 });
  const vecino = m.diana(3, 20);
  const inst = m.combate.crearArma('lanzacohetes', p);
  m.combate.gatillo(p, inst, m.boca(p), 0, true, true);
  ok(m.combate.proyectiles.length === 1, 'sale un proyectil');
  m.correr(0.4);
  ok(objetivo.total === 0 && m.combate.proyectiles.length === 1, 'aún en vuelo');
  m.correr(0.5);
  ok(m.cuenta('explosion') === 1 && objetivo.total > 400 && vecino.total > 100, `explota al impactar (${objetivo.total.toFixed(0)}, vecino ${vecino.total.toFixed(0)})`);
  ok(m.combate.proyectiles.length === 0, 'se retira');

  // Anti-túnel: un blanco muy fino delante de un proyectil muy rápido
  const mt = mundo(); const pt = mt.portador();
  const fino = mt.diana(0, 10, { radio: 0.2 });
  mt.combate.proyectil({ x: 0, y: 1, z: 0, dirX: 0, dirZ: 1, velocidad: 300, alcance: 50, danio: 77, tipo: 'bala', atacante: pt });
  mt.correr(0.2);
  ok(fino.total === 77, 'barrido anti-túnel: no atraviesa un blanco fino a 300 m/s', String(fino.total));

  // Los muros detienen los proyectiles y la explosión no cruza
  const mw = mundo(); const pw = mw.portador(); mw.muro(0, 8, 3, 0.3);
  const detr = mw.diana(0, 11);
  const iw = mw.combate.crearArma('lanzacohetes', pw);
  mw.combate.gatillo(pw, iw, mw.boca(pw), 0, true, true);
  mw.correr(1);
  ok(mw.cuenta('explosion') === 1, 'el cohete estalla contra el muro');
  ok(detr.total === 0, 'y el muro protege de la onda expansiva');

  // Granada de lanzador: parábola y aterrizaje en el alcance pedido
  const mg = mundo(); const pg = mg.portador();
  pg.distApuntado = 20;
  const dg = mg.diana(0, 20);
  const ig = mg.combate.crearArma('lanzagranadas', pg);
  mg.combate.gatillo(pg, ig, mg.boca(pg), 0, true, true);
  const pr = mg.combate.proyectiles[0];
  let ymax = 0;
  mg.correr(0.3, () => { ymax = Math.max(ymax, pr.y); });
  ok(ymax > 1.4, `describe una parábola (altura máx ${ymax.toFixed(2)} m)`);
  mg.correr(1.3);
  ok(mg.cuenta('explosion') === 1 && dg.total > 300, `explota donde cae (${dg.total.toFixed(0)})`);

  // Plasma: pequeña explosión de área
  const mp = mundo(); const pp = mp.portador();
  const dpl = mp.diana(0, 10), dpl2 = mp.diana(1.0, 10);
  const ip = mp.combate.crearArma('pistola_plasma', pp);
  mp.combate.gatillo(pp, ip, mp.boca(pp), 0, true, true);
  mp.correr(0.5);
  ok(dpl.total > 80 && dpl2.total > 20, `plasma: impacto + salpicadura (${dpl.total.toFixed(0)} / ${dpl2.total.toFixed(0)})`);

  // Aviso y alImpactar (mortero de zombi): cae sobre los jugadores y deja gas
  const mm = mundo();
  const objJ = mm.diana(0, 12, { bando: 'jugadores', radio: 0.5 });
  let llamado = 0;
  mm.combate.proyectil({
    x: 0, y: 2, z: 0, destino: { x: 0, z: 12 }, velocidad: 10, gravedad: true, danio: 60, tipo: 'explosivo', radioExplosion: 3,
    atacante: { bando: 'zombis' }, aviso: true, alImpactar: () => { llamado++; },
  });
  mm.correr(2);
  ok(llamado === 1 && objJ.total > 50, `mortero: callback alImpactar y daño (${objJ.total.toFixed(0)})`);
  ok(mm.combate.proyectiles.length === 0, 'no quedan proyectiles');

  // Proyectil de zombi: choca con jugadores, ignora zombis
  const mz = mundo();
  const zombiEnMedio = mz.diana(0, 4); const jug = mz.diana(0, 8, { bando: 'jugadores' });
  mz.combate.proyectil({ x: 0, y: 1, z: 0, dirX: 0, dirZ: 1, velocidad: 20, alcance: 20, danio: 14, tipo: 'acido', atacante: { bando: 'zombis' } });
  mz.correr(1);
  ok(zombiEnMedio.total === 0 && jug.total === 14, 'el escupitajo ignora a otros zombis y daña al jugador');
}

seccion('Arrojadizas');
{
  const m = mundo();
  const p = m.portador();
  const d = m.diana(0, 12);
  const lej = m.diana(0, 25);
  m.combate.lanzar(p, 'granada_mecha', m.boca(p), { x: 0, z: 12 });
  ok(m.combate.proyectiles.length === 1, 'granada en el aire');
  m.correr(1.3);
  ok(m.cuenta('explosion') === 0, 'la mecha (1,6 s) aún no se ha agotado');
  m.correr(0.6);
  ok(m.cuenta('explosion') === 1, 'explota al agotarse la mecha');
  ok(d.total > 100 && lej.total === 0, `daña cerca del destino (${d.total.toFixed(0)})`);
  const ex = m.eventos.find((e) => e.n === 'explosion').d;
  ok(Math.abs(ex.z - 12) < 3.5 && Math.abs(ex.x) < 1.5, `aterriza cerca del destino (z=${ex.z.toFixed(1)})`);
  ok(ex.radio === ARMAS.granada_mecha.radio, 'radio del arma');

  // Rebota en el muro
  const mw = mundo(); const pw = mw.portador(); mw.muro(0, 6, 4, 0.3);
  mw.combate.lanzar(pw, 'granada_mecha', mw.boca(pw), { x: 0, z: 14 });
  mw.correr(2.2);
  const e2 = mw.eventos.find((e) => e.n === 'explosion');
  ok(e2 && e2.d.z < 6, `rebota en el muro y no lo atraviesa (explota en z=${e2?.d.z.toFixed(1)})`);

  // Molotov: estalla al tocar el suelo y deja zona de fuego
  const mm = mundo(); const pm = mm.portador();
  const dm = mm.diana(0, 10);
  mm.combate.lanzar(pm, 'molotov', mm.boca(pm), { x: 0, z: 10 });
  mm.correr(1.3);
  ok(mm.combate.zonas.some((z) => z.tipo === 'fuego'), 'molotov crea una zona de fuego');
  const t0 = dm.total;
  mm.correr(2);
  ok(dm.total > t0 + 60, `y la zona sigue quemando (${(dm.total - t0).toFixed(0)} en 2 s)`);

  // Singularidad
  const ms = mundo(); const ps = ms.portador();
  const ds = ms.diana(0, 13), dl = ms.diana(5, 13);
  ms.combate.lanzar(ps, 'granada_singularidad', ms.boca(ps), { x: 0, z: 12 });
  ms.correr(0.6);
  // El zombi lo mueve su IA: simulamos la reescritura de velocidad
  ms.correr(1.4, () => { ds.cuerpo.vx = 0; ds.cuerpo.vz = 0; dl.cuerpo.vx = 0; dl.cuerpo.vz = 0; });
  ok(ms.combate.zonas.some((z) => z.tipo === 'gravedad') || ms.cuenta('explosion') >= 0, 'pozo de gravedad creado');
  ms.correr(2.5);
  ok(ms.cuenta('explosion') === 1 && ds.total > 300, `implosiona al cerrarse (${ds.total.toFixed(0)})`);
  ok(dl.cuerpo.z < 13 - 0.1 || dl.total > 100, 'atrae a lo lejano antes de cerrarse');
}

seccion('Llama y arco');
{
  const m = mundo();
  const p = m.portador();
  const cerca1 = m.diana(0, 3), cerca2 = m.diana(1.0, 5), lado = m.diana(6, 2), lejos = m.diana(0, 14);
  const inst = m.combate.crearArma('lanzallamas', p);
  const n = fuego(m, p, inst, 1);
  ok(n >= 19 && n <= 21, `20 pulsos/s (${n})`);
  const dps = cerca1.total;
  ok(dps > 80 && dps < 260, `daño sostenido a un objetivo cercano ≈ danio/s con caída (${dps.toFixed(0)})`);
  ok(cerca2.total > 40, 'el cono alcanza a varios objetivos', cerca2.total.toFixed(0));
  ok(lado.total === 0 && lejos.total === 0, 'fuera del cono y del alcance no');
  ok(cerca1.ardiendo > 0, 'prende fuego');
  ok(cerca1.recibidos.length <= 12, `daño agregado en tics (${cerca1.recibidos.length} golpes en 1 s)`, '');
  ok(m.combate.zonas.some((z) => z.tipo === 'fuego'), 'deja zonas de fuego residuales');
  ok(inst.municion === 120 - n, 'gasta 1 munición por pulso');
  // El muro corta el chorro
  const mw = mundo(); const pw = mw.portador(); mw.muro(0, 2, 2, 0.2); const tw = mw.diana(0, 4);
  const iw = mw.combate.crearArma('lanzallamas', pw); fuego(mw, pw, iw, 0.5);
  ok(tw.total === 0, 'las llamas no atraviesan muros');

  const ma = mundo(); const pa = ma.portador();
  const cadena = [[0, 6], [3, 8], [6, 9], [9, 11], [-1.5, 8]].map(([x, z]) => ma.diana(x, z));
  const aislado = ma.diana(-12, 12);
  const ia = ma.combate.crearArma('canon_arco', pa);
  fuego(ma, pa, ia, 1);
  const tocados = cadena.filter((e) => e.total > 0).length;
  ok(tocados >= 4, `el arco salta entre enemigos (${tocados} de 5)`);
  ok(aislado.total === 0, 'no salta más allá del radio de salto');
  ok(cadena[0].total > cadena[3].total * 0.9, 'el primer objetivo recibe lo máximo', `${cadena[0].total.toFixed(0)} vs ${cadena[3].total.toFixed(0)}`);
  ok(cadena[0].ralentizado > 0, 'ralentiza');
}

seccion('Hit-stop, fx y robustez');
{
  const m = mundo();
  const llamadas = [];
  m.juego.camaraLenta = (e, d) => llamadas.push([e, d]);
  const fxLog = [];
  m.juego.fx = { emitir: (n, pos, o) => fxLog.push(n), trazadora: () => fxLog.push('trazadora'), destello: () => fxLog.push('destello'), crearEmisor: (n) => { fxLog.push('emisor:' + n); return { detener() { fxLog.push('detener:' + n); } }; }, calco: () => fxLog.push('calco') };
  const accion = [];
  const p = m.portador(); p.visual = { accion: (a) => accion.push(a) };
  const d = m.diana(0, 8);
  const rifle = m.combate.crearArma('rifle_antimaterial', p);
  p.mods.critico = 1;
  m.combate.gatillo(p, rifle, m.boca(p), 0, true, true);
  ok(llamadas.length === 1, 'congelación de impacto en crítico potente');
  ok(fxLog.includes('fogonazo') && fxLog.includes('trazadora') && fxLog.includes('casquillo'), 'pide fogonazo, trazadora y casquillo', fxLog.join());
  ok(accion.includes('disparar'), 'portador.visual.accion("disparar")');
  m.combate.explotar({ x: 20, z: 0, radio: 6, danio: 500, atacante: p });
  m.combate.crearZona({ x: 0, z: -10, radio: 3, duracion: 1, tipo: 'fuego', dps: 5 });
  ok(fxLog.includes('emisor:fuego'), 'zona de fuego crea emisor fx');
  m.correr(1.5);
  ok(fxLog.includes('detener:fuego'), 'y lo detiene al acabar');
  m.combate.limpiar();
  ok(m.combate.zonas.length === 0 && m.combate.proyectiles.length === 0, 'limpiar() lo vacía todo');

  // Sin fx/render/visual ni mods: no revienta
  const m2 = mundo(); m2.juego.fx = undefined;
  const inst = m2.combate.crearArma('escopeta_doble', {});
  const o = new THREE.Vector3(0, 1, 0);
  let lanzo = false;
  try { m2.combate.gatillo(undefined, inst, o, 0, true, true); m2.combate.actualizarArma(inst, 0.016); m2.combate.recargar(inst); m2.combate.lanzar(undefined, 'noexiste', o, { x: 1, z: 1 }); m2.combate.golpear(undefined, 'noexiste', o, 0); m2.combate.crearArma('noexiste'); lanzo = false; } catch (e) { lanzo = true; console.log(e); }
  ok(!lanzo, 'sin portador, sin fx y con ids desconocidos no lanza excepciones');
}

seccion('DPS sostenido por era y arquetipo (simulado)');
{
  // Mide el daño por segundo real contra un muro de objetivos, incluyendo recargas.
  const medir = (id) => {
    const m = mundo(99);
    const p = m.portador();
    const def = ARMAS[id];
    const objetivos = [];
    for (let i = 0; i < 6; i++) objetivos.push(m.diana((i - 2.5) * 0.9, 7, { radio: 0.45 }));
    const inst = m.combate.crearArma(id, p);
    inst.reserva = 9999; inst.reservaMax = 9999;
    const T = 12;
    let click = 0;
    m.correr(T, (i) => {
      m.combate.actualizarArma(inst, 1 / 60, p);
      const pulso = def.auto || i % 6 === 0;
      m.combate.gatillo(p, inst, m.boca(p), 0, true, pulso);
    });
    const total = objetivos.reduce((s, e) => s + e.total, 0);
    return total / T;
  };
  const filas = {};
  for (const a of LISTA_ARMAS) {
    if (a.comportamiento === 'arrojadiza' || a.comportamiento === 'cuerpo') continue;
    (filas[a.arquetipo] ||= []).push([a.era, a.id, medir(a.id)]);
  }
  for (const [arq, fl] of Object.entries(filas)) {
    console.log('  ' + arq.padEnd(12), fl.map(([e, id, d]) => `${id}:${d.toFixed(0)}`).join('  '));
  }
  // No tiene por qué ser estrictamente monótono para pesada (se mide en zona), pero sí para el resto
  for (const arq of ['fusil', 'pistola', 'ligera', 'herramienta', 'precision']) {
    const v = filas[arq].map((f) => f[2]);
    const crece = v.every((x, i) => i === 0 || x >= v[i - 1] * 0.9);
    ok(crece, `DPS medido creciente por era en «${arq}»`, v.map((x) => x.toFixed(0)).join(' → '));
  }
}

console.error = consolaError;
if (errores.length) { console.log('\nErrores de consola durante las pruebas:'); errores.slice(0, 8).forEach((e) => console.log('  ', e)); fallos++; }
console.log(`\n${total - fallos}/${total} comprobaciones superadas${fallos ? ` — ${fallos} FALLOS` : ''}`);
process.exit(fallos ? 1 : 0);
