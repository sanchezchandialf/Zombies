// Comportamientos especiales: llama (cono continuo), arco (rayo encadenado) y cuerpo a cuerpo. Daño continuo acumulado en tics de 0,1 s.
import { CAPA } from '../nucleo/fisica.js';
import { ARMAS } from '../datos/armas.js';
import { difAngulo } from '../nucleo/util.js';
import { GRAD, TIC_CONTINUO, esBlancoDe, radioDe, posDe, factorCaida, alturaImpacto, materialDeCuerpo } from './util.js';

const MASCARA_BLANCOS = CAPA.ZOMBI | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA | CAPA.JUGADOR;
const MAX_RESIDUOS_ACTIVOS = 22;
const _p = { x: 0, z: 0 };

export function instalarEspeciales(c) {
  const { juego, visuales } = c;
  const fisica = juego.fisica;
  const rng = juego.rng;

  // ─────────────────────────── Daño continuo acumulado ───────────────────────────
  const acumulado = new Map(); // ent → registro
  /** Suma daño por pulso a una entidad; se vuelca como un único `danio` cada 0,1 s. */
  function acumular(ent, info) {
    let r = acumulado.get(ent);
    if (!r) acumulado.set(ent, (r = { ent, cantidad: 0, t0: juego.tiempo.ahora, info }));
    r.cantidad += info.cantidad; r.info = info;
  }
  c._volcarContinuo = function (forzar = false) {
    if (!acumulado.size) return;
    const ahora = juego.tiempo.ahora;
    for (const [ent, r] of acumulado) {
      if (!forzar && ahora - r.t0 < TIC_CONTINUO) continue;
      acumulado.delete(ent);
      if (ent.vivo === false) continue;
      c.aplicarDanio(ent, { ...r.info, cantidad: r.cantidad, continuo: true });
    }
  };

  const libre = (ox, oz, tx, tz) => {
    const dx = tx - ox, dz = tz - oz, d = Math.hypot(dx, dz);
    if (d < 0.3) return true;
    return !fisica.rayo(ox, oz, dx / d, dz / d, d - 0.1, CAPA.ESTATICO);
  };

  /** Blancos dentro de un cono (o cualquier dirección si cono ≥ 2π). Devuelve [{ent, d, x, z}]. */
  function enCono(tir, alcance, semi) {
    const res = [];
    const cuerpos = fisica.enCirculo(tir.ox, tir.oz, alcance + 1, MASCARA_BLANCOS, []);
    const vistos = new Set();
    for (const cu of cuerpos) {
      const ent = cu.datos;
      if (!ent || typeof ent.recibirDanio !== 'function' || vistos.has(ent) || !esBlancoDe(tir.bando, ent)) continue;
      vistos.add(ent);
      posDe(ent, _p);
      const vx = _p.x - tir.ox, vz = _p.z - tir.oz, d = Math.hypot(vx, vz);
      const r = radioDe(ent);
      if (d - r > alcance) continue;
      if (d > 0.01) {
        const ang = Math.abs(difAngulo(tir.rot, Math.atan2(vx, vz)));
        if (ang > semi + Math.atan2(r, Math.max(d, 0.3))) continue;
      }
      if (!libre(tir.ox, tir.oz, _p.x, _p.z)) continue;
      res.push({ ent, d, x: _p.x, z: _p.z, vx: d > 0.01 ? vx / d : tir.dx, vz: d > 0.01 ? vz / d : tir.dz });
    }
    return res;
  }

  // ─────────────────────────── Llama ───────────────────────────
  const residuos = []; // zonas de fuego generadas por el chorro
  c._llama = function llama(tir) {
    const { def, portador, ox, oy, oz } = tir;
    const alcance = def.alcance ?? 11;
    // Longitud real del chorro: lo detiene el primer muro
    const muro = fisica.rayo(ox, oz, tir.dx, tir.dz, alcance, CAPA.ESTATICO);
    const largo = muro ? muro.dist : alcance;
    const blancos = enCono(tir, largo, (def.cono ?? 24) * GRAD * 0.5);
    const porPulso = (def.danio ?? 100) / Math.max(1, def.cadencia ?? 10);
    for (const b of blancos) {
      acumular(b.ent, {
        cantidad: porPulso * factorCaida(def, b.d) * (tir.extra?.multiplicador ?? 1), tipo: 'fuego', atacante: portador, arma: def, x: b.x, z: b.z,
        dirX: tir.dx, dirZ: tir.dz, empuje: (def.empuje ?? 0) * 0.35, quemadura: def.quemadura, area: false, y: 0.9,
      });
    }
    // Inflama las nubes de gas dentro del chorro
    c.inflamarGas(ox + tir.dx * largo * 0.6, oz + tir.dz * largo * 0.6, largo * 0.5, 'fuego');
    if (muro) juego.fx?.emitir?.('chispas', { x: muro.x, y: oy, z: muro.z }, { dirX: muro.nx, dirZ: muro.nz, escala: 0.5, cantidad: 2 });

    // Visual: un chorro por cuadro de disparo (varios pulsos en un cuadro comparten chorro)
    const fx = juego.fx;
    if (juego.tiempo.cuadro !== tir.inst._cuadroLlama) {
      tir.inst._cuadroLlama = juego.tiempo.cuadro;
      const j = (rng() - 0.5) * tir.disp;
      const a = tir.rot + j;
      fx?.emitir?.('llama', { x: ox + tir.dx * 0.3, y: oy, z: oz + tir.dz * 0.3 }, { dirX: Math.sin(a), dirY: 0, dirZ: Math.cos(a), escala: Math.min(1.2, largo / alcance + 0.2), cantidad: 3, rot: a });
      fx?.destello?.({ x: ox + tir.dx * 2, y: oy, z: oz + tir.dz * 2 }, 0xff8a30, 5 + rng() * 2, 0.08, 9);
    }
    // Zona residual: el suelo sigue ardiendo donde ha llegado el chorro
    const res = def.residuo;
    if (res) {
      tir.inst._resT = (tir.inst._resT ?? 0) - 1 / Math.max(1, def.cadencia);
      if (tir.inst._resT <= 0) {
        tir.inst._resT = res.cada ?? 0.5;
        const fin = Math.max(1.5, largo * (0.55 + 0.4 * rng()));
        const rx = ox + tir.dx * fin, rz = oz + tir.dz * fin;
        for (let i = residuos.length - 1; i >= 0; i--) if (!residuos[i].activo) residuos.splice(i, 1);
        if (residuos.length < MAX_RESIDUOS_ACTIVOS || true) {
          const z = c.crearZona({ x: rx, z: rz, radio: res.radio, duracion: res.duracion, tipo: 'fuego', dps: res.dps, atacante: portador, afecta: portador?.bando === 'jugadores' ? 'zombis' : undefined });
          if (z && !residuos.includes(z)) residuos.push(z);
        }
      }
    }
  };

  // ─────────────────────────── Arco eléctrico ───────────────────────────
  c._arco = function arco(tir) {
    const { def, portador, ox, oy, oz } = tir;
    const alcance = def.alcance ?? 16;
    const blancos = enCono(tir, alcance, (def.cono ?? 28) * GRAD * 0.5);
    const fx = juego.fx;
    const color = def.color ?? 0xb08cff;
    const desde = { x: ox + tir.dx * 0.4, y: oy, z: oz + tir.dz * 0.4 };
    if (!blancos.length) {
      const muro = fisica.rayo(ox, oz, tir.dx, tir.dz, alcance * 0.85, CAPA.ESTATICO);
      const d = muro ? muro.dist : alcance * 0.85;
      fx?.trazadora?.(desde, { x: ox + tir.dx * d, y: oy * 0.7, z: oz + tir.dz * d }, { tipo: 'arco', color });
      if (muro) fx?.emitir?.('electrico', { x: muro.x, y: oy, z: muro.z }, { escala: 0.6 });
      return;
    }
    blancos.sort((a, b) => a.d - b.d);
    const porPulso = (def.danio ?? 100) / Math.max(1, def.cadencia ?? 5);
    const visitados = new Set();
    let actual = blancos[0], previo = desde, mult = 1;
    const saltos = def.saltos ?? 4, radioSalto = def.radioSalto ?? 5;
    for (let i = 0; i <= saltos && actual; i++) {
      visitados.add(actual.ent);
      acumular(actual.ent, {
        cantidad: porPulso * mult * (tir.extra?.multiplicador ?? 1), tipo: def.tipo ?? 'energia', atacante: portador, arma: def, x: actual.x, z: actual.z,
        dirX: tir.dx, dirZ: tir.dz, empuje: def.empuje ?? 0, ralentiza: def.ralentiza, area: false, y: 0.9,
      });
      const destino = { x: actual.x, y: alturaImpacto(actual.ent), z: actual.z };
      fx?.trazadora?.(previo, destino, { tipo: 'arco', color });
      fx?.emitir?.('electrico', destino, { escala: 0.7 });
      previo = destino;
      // Siguiente eslabón: el blanco libre más cercano dentro del radio de salto
      let mejor = null, md = radioSalto;
      const cercanos = fisica.enCirculo(actual.x, actual.z, radioSalto + 1, MASCARA_BLANCOS, []);
      for (const cu of cercanos) {
        const ent = cu.datos;
        if (!ent || typeof ent.recibirDanio !== 'function' || visitados.has(ent) || !esBlancoDe(tir.bando, ent)) continue;
        posDe(ent, _p);
        const d = Math.hypot(_p.x - actual.x, _p.z - actual.z) - radioDe(ent);
        if (d < md && libre(actual.x, actual.z, _p.x, _p.z)) { md = d; mejor = { ent, d, x: _p.x, z: _p.z }; }
      }
      actual = mejor; mult *= 1 - (def.perdidaSalto ?? 0.15);
    }
    fx?.destello?.(desde, color, 3, 0.07, 7);
  };

  // ─────────────────────────── Cuerpo a cuerpo ───────────────────────────
  /**
   * golpear(portador, armaId, origen, rot): arco frontal que daña a hasta `objetivos` blancos, con empuje.
   * La cadencia se limita por portador. Devuelve true si el golpe sale.
   */
  c.golpear = function golpear(portador, armaId, origen, rot) {
    const def = ARMAS[armaId];
    if (!def || def.comportamiento !== 'cuerpo') return false;
    const ahora = juego.tiempo.ahora;
    const clave = portador ? (portador._golpeLista ??= {}) : (c._golpeSinPortador ??= {});
    if (ahora < (clave[armaId] ?? -1)) return false;
    clave[armaId] = ahora + 1 / Math.max(0.2, def.cadencia ?? 1.5);

    const bando = portador?.bando ?? 'jugadores';
    const dx = Math.sin(rot), dz = Math.cos(rot);
    const ox = origen.x, oz = origen.z, oy = origen.y || 1.0;
    const alcance = def.alcance ?? 2;
    const semi = (def.arco ?? 100) * GRAD * 0.5;
    const tir = { ox, oz, rot, dx, dz, bando };
    const blancos = enCono(tir, alcance, semi).sort((a, b) => a.d - b.d).slice(0, def.objetivos ?? 3);
    let golpes = 0, mejor = 0, critico = false;
    for (const b of blancos) {
      const real = c.aplicarDanio(b.ent, {
        cantidad: def.danio, tipo: def.tipo ?? 'golpe', atacante: portador, arma: def, x: b.x - b.vx * radioDe(b.ent) * 0.7, z: b.z - b.vz * radioDe(b.ent) * 0.7,
        dirX: b.vx, dirZ: b.vz, empuje: (def.empuje ?? 0) * (b === blancos[0] ? 1 : 0.7), aturdimiento: def.aturdimiento, quemadura: def.quemadura,
        puedeCritico: true, probCritico: def.critico ?? 0, multCritico: def.multCritico ?? 2,
      });
      golpes++; mejor = Math.max(mejor, real);
    }
    const col = def.tipo === 'fuego' ? 0xff9a50 : def.color ?? 0xe8ecf4;
    visuales.tajo(ox + dx * 0.3, oz + dz * 0.3, rot, alcance + 0.4, (def.arco ?? 100) * GRAD, col);
    portador?.visual?.accion?.('cuerpo', { duracion: Math.min(0.4, 0.8 / (def.cadencia ?? 1.5)) });
    juego.eventos.emitir('arma:disparo', { portador, arma: def, origen: { x: ox, y: oy, z: oz }, rot, cuerpo: true, golpes });
    juego.eventos.emitir('arma:golpe', { portador, arma: def, origen: { x: ox, y: oy, z: oz }, rot, golpes });
    if (portador?.indice !== undefined) {
      juego.render?.retroceso?.(dx, dz, 0.5);
      if (golpes) juego.render?.sacudir?.(0.1 + Math.min(0.15, golpes * 0.04), 0.12);
    }
    if (golpes) c.congelar(0.15, 0.04 + Math.min(0.03, mejor / 8000));
    else {
      // Golpe al aire contra un muro cercano: chispas
      const m = fisica.rayo(ox, oz, dx, dz, alcance, CAPA.ESTATICO);
      if (m) juego.eventos.emitir('impacto', { x: m.x, y: oy, z: m.z, nx: m.nx, nz: m.nz, material: materialDeCuerpo(m.cuerpo), tipo: 'golpe', objetivo: null });
    }
    return true;
  };

  c._limpiarEspeciales = function () { acumulado.clear(); residuos.length = 0; };
}
