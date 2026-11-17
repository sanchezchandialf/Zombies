// Daño: aplicarDanio (modificadores, fuego amigo, críticos, eventos) y explotar (radial con muros y reacción en cadena).
import { CAPA } from '../nucleo/fisica.js';
import { entidadDe, factorBando, radioDe, posDe, alturaImpacto, ALTURA_PECHO, finito } from './util.js';

const _p = { x: 0, z: 0 };
const MASCARA_EXPLOSION = CAPA.JUGADOR | CAPA.ZOMBI | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;
/** Profundidad máxima de reacciones en cadena y retraso visual entre eslabones. */
const MAX_CADENA = 14;

export function instalarDanio(c) {
  const { juego } = c;
  const fisica = juego.fisica;
  const rng = juego.rng;

  /**
   * Aplica daño a una entidad Dañable. `info` = { cantidad, tipo, atacante, arma, x, z, dirX, dirZ, empuje, critico }
   * y, opcionalmente: area, puedeCritico, probCritico, multCritico, aturdimiento, quemadura {duracion,dps},
   * ralentiza [factor, s], continuo, sinMods, multiplicador, nx, nz, y.
   * Devuelve el daño real aplicado por la entidad.
   */
  c.aplicarDanio = function aplicarDanio(objetivo, info) {
    if (!objetivo || objetivo.vivo === false || typeof objetivo.recibirDanio !== 'function' || !info) return 0;
    const atacante = info.atacante ?? null;
    const bandoA = info.bando ?? atacante?.bando ?? 'neutral';
    const area = !!info.area;
    const fb = factorBando(bandoA, objetivo.bando ?? 'neutral', area);
    if (fb <= 0) return 0;
    const mods = info.mods ?? atacante?.mods ?? null;
    const tipo = info.tipo ?? 'bala';

    let cantidad = finito(info.cantidad) * fb * (info.multiplicador ?? 1);
    if (cantidad <= 0) return 0;
    // Modificadores del portador. Explosivos: mods.explosivos; golpes: mods.cuerpo; el resto: mods.danio.
    if (mods && !info.sinMods) {
      const m = tipo === 'explosivo' ? (mods.explosivos ?? 1) : tipo === 'golpe' ? (mods.cuerpo ?? 1) : (mods.danio ?? 1);
      cantidad *= m;
    }

    // Críticos
    let critico = !!info.critico;
    if (!critico && info.puedeCritico) {
      const prob = (info.probCritico ?? 0) + (mods?.critico ?? 0);
      if (prob > 0 && rng() < prob) critico = true;
    }
    if (critico) {
      const mult = (info.multCritico ?? 2) + Math.max(0, (mods?.danioCritico ?? 2) - 2);
      cantidad *= mult;
    }

    // Posición y dirección completadas
    const dest = posDe(objetivo, _p);
    const x = info.x ?? dest.x, z = info.z ?? dest.z;
    let dirX = info.dirX, dirZ = info.dirZ;
    if (dirX === undefined || dirZ === undefined) {
      const ap = atacante?.pos;
      let dx = ap ? dest.x - ap.x : 0, dz = ap ? dest.z - ap.z : 1;
      const l = Math.hypot(dx, dz) || 1; dirX = dx / l; dirZ = dz / l;
    }
    const empuje = finito(info.empuje) * (info.escalaEmpuje ?? 1);
    let espalda = false;
    if (typeof objetivo.rot === 'number') espalda = (Math.sin(objetivo.rot) * dirX + Math.cos(objetivo.rot) * dirZ) > 0.35;

    const completo = {
      cantidad, tipo, atacante, arma: info.arma ?? null, x, z, dirX, dirZ, empuje, critico,
      area, espalda, continuo: !!info.continuo, aturdimiento: info.aturdimiento ?? 0,
    };
    // Cualquier campo extra de la info original viaja al objetivo (nx, nz, quemadura…) sin pisar lo calculado.
    for (const k in info) if (!(k in completo)) completo[k] = info[k];

    const antes = objetivo.vivo !== false;
    let real = objetivo.recibirDanio(completo);
    if (typeof real !== 'number' || !(real >= 0)) real = 0;
    const murio = antes && objetivo.vivo === false;

    // Efectos secundarios si sigue en pie
    if (objetivo.vivo !== false) {
      if (info.aturdimiento > 0) objetivo.aturdir?.(info.aturdimiento);
      const rl = info.ralentiza ?? mods?.ralentiza;
      if (rl && tipo !== 'veneno') objetivo.ralentizar?.(rl[0], rl[1]);
      if (info.quemadura) objetivo.incendiar?.(info.quemadura.duracion, info.quemadura.dps, atacante);
    }

    if (real > 0) {
      juego.eventos.emitir('danio', { objetivo, cantidad: real, tipo, critico, atacante, x, z, continuo: !!info.continuo, area, muerte: murio });
    }
    if (!area && !info.continuo) {
      const nx = info.nx ?? -dirX, nz = info.nz ?? -dirZ;
      juego.eventos.emitir('impacto', {
        x, y: info.y ?? alturaImpacto(objetivo), z, nx, nz, material: objetivo.material ?? 'carne', tipo, objetivo,
        dirX, dirZ, cantidad: real, critico,
      });
    }
    // Congelación de impacto: críticos potentes y bajas de golpe seco
    if (!area && !info.continuo && real > 0 && ((critico && real >= 220) || (murio && critico && real >= 120))) {
      c.congelar(0.12, critico && real >= 600 ? 0.085 : 0.055);
    }
    return real;
  };

  /** Congelación de impacto (cámara lenta muy breve). Limitada para no encadenarse. */
  let ultimaCongelacion = -1;
  c.congelar = function congelar(escala, duracion) {
    const t = juego.tiempo.real;
    if (t - ultimaCongelacion < 0.22) return;
    ultimaCongelacion = t;
    juego.camaraLenta?.(escala, duracion);
  };

  // ─────────────────────────── Explosiones ───────────────────────────
  const pendientes = []; // reacciones en cadena diferidas { t, o }
  let explotando = 0;
  c._pendientes = pendientes;

  /** Visibilidad entre el centro y un blanco: se consideran el centro y los dos extremos laterales. */
  function visible(x, z, tx, tz, r) {
    const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz);
    if (d < 0.35) return true;
    const ux = dx / d, uz = dz / d;
    const lib = (px, pz) => {
      const ex = px - x, ez = pz - z, l = Math.hypot(ex, ez);
      if (l < 1e-4) return true;
      return !fisica.rayo(x, z, ex / l, ez / l, Math.max(0, l - 0.12), CAPA.ESTATICO);
    };
    if (lib(tx, tz)) return true;
    const rr = Math.min(r, 0.6) * 0.85;
    return lib(tx - uz * rr, tz + ux * rr) || lib(tx + uz * rr, tz - ux * rr);
  }

  /**
   * Explosión radial: daño con caída (100 % hasta el 25 % del radio, 20 % en el borde), los muros bajan a cero el daño
   * de lo que protegen, empuje radial y reacción en cadena (los eslabones se encolan con un pequeño retraso).
   */
  c.explotar = function explotar(o) {
    if (!o) return;
    if (explotando > 0 && !o._diferida) {
      const prof = (o._prof ?? 0) + 1;
      if (prof <= MAX_CADENA) pendientes.push({ t: juego.tiempo.ahora + 0.07 + rng() * 0.09, o: { ...o, _diferida: true, _prof: prof } });
      return;
    }
    explotando++;
    try { ejecutarExplosion(o); } finally { explotando--; }
  };

  function ejecutarExplosion(o) {
    const x = o.x, z = o.z;
    const radio = Math.max(0.5, o.radio ?? 4);
    const danio = o.danio ?? 100;
    const tipo = o.tipo ?? 'explosivo';
    const atacante = o.atacante ?? null;
    const y = o.y ?? 0.4;
    juego.eventos.emitir('explosion', { x, z, y, radio, danio, tipo, atacante });

    // Física: lo que no tiene lógica de daño (cajas empujables, restos) sale rodando
    const empuje = o.empuje ?? 0;
    if (empuje !== 0) fisica.impulsoRadial(x, z, radio, empuje * 70, CAPA.PROP | CAPA.VEHICULO);

    const cuerpos = fisica.enCirculo(x, z, radio, MASCARA_EXPLOSION, []);
    const vistos = new Set();
    for (let i = 0; i < cuerpos.length; i++) {
      const cuerpo = cuerpos[i];
      if (cuerpo.sensor) continue;
      const ent = entidadDe(cuerpo);
      if (!ent || vistos.has(ent) || ent.vivo === false) continue;
      vistos.add(ent);
      posDe(ent, _p);
      const dx = _p.x - x, dz = _p.z - z, d = Math.hypot(dx, dz);
      const re = radioDe(ent);
      const dBorde = Math.max(0, d - re);
      if (dBorde > radio) continue;
      if (!visible(x, z, _p.x, _p.z, re)) continue;
      const t = dBorde / radio;
      const f = t <= 0.25 ? 1 : 1 - 0.8 * ((t - 0.25) / 0.75);
      const ux = d > 1e-4 ? dx / d : 0, uz = d > 1e-4 ? dz / d : 1;
      const duro = (cuerpo.capa & (CAPA.ESTRUCTURA | CAPA.VEHICULO)) !== 0;
      const fisico = (cuerpo.capa & (CAPA.PROP | CAPA.VEHICULO)) !== 0;
      c.aplicarDanio(ent, {
        cantidad: danio * f * (duro ? (o.danioEstructuras ?? 1) : 1),
        tipo, atacante, arma: o.arma ?? null, x: _p.x, z: _p.z, y: 0.9, dirX: ux, dirZ: uz,
        empuje: fisico ? 0 : empuje * f, aturdimiento: (o.aturdimiento ?? 0) * f, area: true,
        quemadura: o.quemadura, bando: o.bando,
      });
    }

    c.inflamarGas?.(x, z, radio, tipo);

    // Sensación: temblor de cámara según el tamaño y la cercanía a algún jugador, y congelación en las grandes
    let cerca = Infinity;
    for (const j of juego.jugadores) { if (j.pos) cerca = Math.min(cerca, Math.hypot(j.pos.x - x, j.pos.z - z)); }
    if (cerca === Infinity) cerca = 12;
    const grande = Math.min(1, radio / 9) * Math.min(1, (danio + 120) / 520);
    const k = grande * Math.max(0, 1 - cerca / 30);
    if (k > 0.04) juego.render?.sacudir?.(Math.min(1, 0.18 + k * 1.2), 0.25 + k * 0.4);
    if (radio >= 5 && danio >= 300 && cerca < 22) c.congelar(0.2, 0.06);
  }

  /** Procesa las reacciones en cadena que han vencido. */
  c._actualizarCadena = function () {
    if (!pendientes.length) return;
    const ahora = juego.tiempo.ahora;
    for (let i = 0; i < pendientes.length; i++) {
      if (pendientes[i].t <= ahora) {
        const { o } = pendientes[i];
        pendientes.splice(i, 1); i--;
        c.explotar(o);
      }
    }
  };
}
