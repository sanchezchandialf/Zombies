// Armas de fuego: instancias, cadencia, cargador, recarga, dispersión, gatillo y los comportamientos hitscan / perdigones / proyectil.
// Las especiales (llama, arco, cuerpo a cuerpo) viven en especiales.js.
import * as THREE from 'three';
import { MASCARA_BALA } from '../nucleo/fisica.js';
import { ARMAS } from '../datos/armas.js';
import { GRAD, entidadDe, filtroBalas, factorCaida, costePerforar, materialDeCuerpo, alturaImpacto } from './util.js';

const COLOR_ENERGIA = { pulso: 0x66e8ff, aguja: 0xff7ad9, riel: 0xbfd6ff, arco: 0xb08cff };
const ALTURA_BOCA = 1.1;
const MAX_DISPAROS_CUADRO = 6;
const BUFFER_PULSACION = 0.18;

export function instalarArmas(c) {
  const { juego } = c;
  const fisica = juego.fisica;
  const rng = juego.rng;

  const modsDe = (portador) => portador?.mods ?? SIN_MODS;
  const SIN_MODS = {};
  const infinita = (inst, mods) => inst.reserva < 0 || !!mods.municionInfinita || !!inst.def.municionInfinita;

  // ─────────────────────────── Instancia ───────────────────────────
  /**
   * Crea un arma lista para usar. `reserva` = balas sueltas de reserva (−1 = infinita); `reservaMax` = su tope.
   * El cargador y la reserva respetan portador.mods.cargador / .reserva.
   */
  c.crearArma = function crearArma(armaId, portador) {
    let def = ARMAS[armaId];
    if (!def) {
      console.warn('[combate] arma desconocida:', armaId);
      def = { id: armaId, nombre: String(armaId), comportamiento: 'ninguno', cadencia: 1, cargador: 1, recarga: 1, reserva: 0 };
    }
    const mods = modsDe(portador);
    const cargador = Math.max(1, Math.round((def.cargador ?? 1) * (mods.cargador ?? 1)));
    const reservaMax = def.reserva < 0 ? -1 : Math.round((def.reserva ?? 0) * (def.cargador ?? 1) * (mods.reserva ?? 1));
    return {
      def, id: armaId, municion: cargador, cargador, reserva: reservaMax, reservaMax,
      recargando: false, progresoRecarga: 0, enfriamiento: 0, calor: 0, sobrecalentado: false,
      _recT: 0, _recDur: 0, _t1: 0, _buf: 0, _vaciaT: 0, _mano: 0, _ultimo: -10, _emisor: null,
    };
  };

  /** Suma `fraccion` (0..1) del tope de reserva (recogidas de munición). */
  c.darMunicion = function darMunicion(inst, fraccion = 0.5) {
    if (!inst || inst.reserva < 0) return;
    inst.reserva = Math.min(inst.reservaMax, inst.reserva + Math.ceil(inst.reservaMax * fraccion));
  };

  c.cancelarRecarga = function cancelarRecarga(inst) {
    if (!inst) return;
    inst.recargando = false; inst.progresoRecarga = 0; inst._recT = 0;
  };

  /** Avanza temporizadores de cadencia, recarga y calor. Llamar cada cuadro para el arma activa. */
  c.actualizarArma = function actualizarArma(inst, dt, portador) {
    if (!inst || !inst.def) return;
    const def = inst.def, mods = modsDe(portador);
    inst.cargador = Math.max(1, Math.round((def.cargador ?? 1) * (mods.cargador ?? 1)));
    // Cadencia: se permite acumular hasta un cuadro de crédito para no perder disparos a pocos fps
    inst.enfriamiento = Math.max(inst.enfriamiento - dt, -dt);
    if (inst._buf > 0) inst._buf -= dt;
    if (inst._vaciaT > 0) inst._vaciaT -= dt;
    // Calor: la dispersión vuelve a la calma cuando se deja de disparar
    if (inst.calor > 0 && juego.tiempo.ahora - inst._ultimo > 1 / Math.max(0.5, def.cadencia ?? 1) + 0.1) {
      inst.calor = Math.max(0, inst.calor - dt / Math.max(0.7, (def.calentamiento ?? 2) * 0.45));
    }
    if (inst.sobrecalentado && inst.calor < 0.4) { inst.sobrecalentado = false; juego.eventos.emitir('arma:enfriada', { portador, arma: def }); }
    if (inst._emisor && juego.tiempo.ahora - inst._ultimo > 0.12) { inst._emisor.detener?.(); inst._emisor = null; }
    // Recarga
    if (inst.recargando) {
      inst._recT += dt;
      if (def.recargaTipo === 'cartucho') {
        while (inst._recT >= inst._t1 && inst.municion < inst.cargador && (inst.reserva !== 0)) {
          inst._recT -= inst._t1;
          inst.municion++;
          if (inst.reserva > 0) inst.reserva--;
          juego.eventos.emitir('arma:cartucho', { portador, arma: def, municion: inst.municion });
        }
        inst.progresoRecarga = inst.municion / inst.cargador;
        if (inst.municion >= inst.cargador || inst.reserva === 0) { inst.recargando = false; inst.progresoRecarga = 0; inst._recT = 0; }
      } else {
        inst.progresoRecarga = Math.min(1, inst._recT / inst._recDur);
        if (inst._recT >= inst._recDur) {
          const falta = inst.cargador - inst.municion;
          const toma = inst.reserva < 0 ? falta : Math.min(falta, inst.reserva);
          inst.municion += toma;
          if (inst.reserva > 0) inst.reserva -= toma;
          inst.recargando = false; inst.progresoRecarga = 0; inst._recT = 0;
          juego.eventos.emitir('arma:recargada', { portador, arma: def });
        }
      }
    }
  };

  /** Inicia la recarga. Devuelve true si empieza. */
  c.recargar = function recargar(inst, portador) {
    if (!inst?.def || inst.recargando) return false;
    const def = inst.def;
    if (!(def.cargador > 0) || def.comportamiento === 'ninguno') return false;
    if (inst.municion >= inst.cargador || inst.reserva === 0) return false;
    const mods = modsDe(portador);
    const dur = Math.max(0.15, (def.recarga ?? 2) * (mods.recarga ?? 1));
    inst.recargando = true; inst.progresoRecarga = 0; inst._recT = 0; inst._recDur = dur;
    inst._t1 = dur / inst.cargador; // recarga por cartucho
    juego.eventos.emitir('arma:recarga', { portador, arma: def, duracion: dur });
    portador?.visual?.accion?.('recargar', { duracion: dur });
    return true;
  };

  // ─────────────────────────── Gatillo ───────────────────────────
  /** Devuelve true si se ha disparado en este cuadro. */
  c.gatillo = function gatillo(portador, inst, origen, rot, apretado, recienApretado) {
    if (!inst?.def) return false;
    const def = inst.def;
    if (def.comportamiento === 'cuerpo') return apretado ? c.golpear(portador, def.id, origen, rot) : false;
    if (def.comportamiento === 'arrojadiza' || def.comportamiento === 'ninguno') return false;
    const mods = modsDe(portador);
    const auto = !!def.auto;
    let quiere = auto ? apretado : (recienApretado || inst._buf > 0);
    if (!quiere) return false;
    if (inst.sobrecalentado) return false;
    const inf = infinita(inst, mods);

    // Recargando: las de cartucho se pueden interrumpir si queda algo en la recámara
    if (inst.recargando) {
      if (def.recargaTipo === 'cartucho' && inst.municion > 0) c.cancelarRecarga(inst);
      else return false;
    }
    if (inst.municion <= 0 && !inf) {
      if (recienApretado || inst._vaciaT <= 0) {
        inst._vaciaT = 0.45;
        juego.eventos.emitir('arma:vacia', { portador, arma: def });
      }
      if (inst.reserva !== 0) c.recargar(inst, portador);
      return false;
    }
    if (inst.enfriamiento > 1e-9) {
      if (!auto && recienApretado && inst.enfriamiento < BUFFER_PULSACION) inst._buf = BUFFER_PULSACION;
      return false;
    }
    inst._buf = 0;

    const cad = Math.max(0.05, (def.cadencia ?? 1) * (mods.cadencia ?? 1));
    const intervalo = 1 / cad;
    let n = 0;
    const lleva = portador?.proximoDisparo;
    do {
      disparar(portador, inst, origen, rot, mods, intervalo, lleva && n === 0 ? lleva : null);
      if (!inf) inst.municion--;
      inst.enfriamiento += intervalo;
      n++;
    } while (auto && n < MAX_DISPAROS_CUADRO && inst.enfriamiento <= 1e-9 && (inst.municion > 0 || inf) && !inst.sobrecalentado);
    if (lleva) portador.proximoDisparo = null;
    inst._ultimo = juego.tiempo.ahora;
    if (inst.municion <= 0 && !inf && inst.reserva !== 0) c.recargar(inst, portador);
    return true;
  };

  // ─────────────────────────── Disparo ───────────────────────────
  function dispersionActual(def, inst, mods) {
    const base = (def.dispersion ?? 0) * (mods.dispersion ?? 1);
    return base * (1 + (def.calentamiento ? 1.6 : 0.3) * inst.calor);
  }

  function disparar(portador, inst, origen, rot, mods, intervalo, extra) {
    const def = inst.def;
    // Posición de la boca (armas dobles alternan mano)
    let ox = origen.x, oz = origen.z;
    if (def.doble) {
      inst._mano ^= 1;
      const lado = inst._mano ? 1 : -1;
      ox += Math.cos(rot) * 0.17 * lado; oz -= Math.sin(rot) * 0.17 * lado;
    }
    const oy = origen.y || ALTURA_BOCA;
    const tir = {
      portador, inst, def, mods, ox, oy, oz, rot, dx: Math.sin(rot), dz: Math.cos(rot),
      bando: portador?.bando ?? 'neutral', extra,
      disp: dispersionActual(def, inst, mods) * GRAD,
    };
    // Calor: dispersión creciente con el fuego sostenido (y sobrecalentamiento de emplazamientos)
    const cal = mods.sobrecalentamiento ? (def.calorMax ?? 5) : (def.calentamiento ?? 8);
    inst.calor = Math.min(1, inst.calor + intervalo / cal);
    if (mods.sobrecalentamiento && inst.calor >= 1) { inst.sobrecalentado = true; juego.eventos.emitir('arma:sobrecalentada', { portador, arma: def }); }

    switch (def.comportamiento) {
      case 'perdigones': perdigones(tir); break;
      case 'proyectil': disparoProyectil(tir); break;
      case 'llama': c._llama(tir); break;
      case 'arco': c._arco(tir); break;
      default: hitscan(tir);
    }
    efectosDisparo(tir);
  }

  function efectosDisparo(tir) {
    const { portador, def, ox, oy, oz, dx, dz } = tir;
    const fx = juego.fx;
    const pos = { x: ox + dx * 0.15, y: oy, z: oz + dz * 0.15 };
    juego.eventos.emitir('arma:disparo', { portador, arma: def, origen: new THREE.Vector3(ox, oy, oz), rot: tir.rot });
    if (def.comportamiento !== 'llama' && def.comportamiento !== 'arco' && def.fogonazo && def.fogonazo !== 'ninguno') {
      const grande = /grande|cohete|riel|onda/.test(def.fogonazo);
      fx?.emitir?.('fogonazo', pos, { tipo: def.fogonazo, dirX: dx, dirY: 0, dirZ: dz, escala: grande ? 1.4 : 1, rot: tir.rot, color: def.color });
      fx?.destello?.(pos, def.color ?? (def.tipo === 'energia' ? 0x66e8ff : 0xffc27a), grande ? 5 : 3, 0.06, grande ? 9 : 6);
      if (def.fogonazo === 'polvora' || def.fogonazo === 'polvora_grande') {
        fx?.emitir?.('humo', { x: pos.x + dx * 0.4, y: oy, z: pos.z + dz * 0.4 }, { dirX: dx, dirY: 0.1, dirZ: dz, escala: def.fogonazo === 'polvora_grande' ? 1.5 : 1, cantidad: 3, color: 0x2a2724 });
      }
    }
    if (def.casquillo) fx?.emitir?.('casquillo', { x: ox, y: oy, z: oz }, { dirX: Math.cos(tir.rot), dirZ: -Math.sin(tir.rot), escala: 1 });
    portador?.visual?.accion?.('disparar', { duracion: Math.min(0.2, 0.9 / (def.cadencia ?? 2)) });
    // Cámara: solo para jugadores humanos (los emplazamientos y torretas no la sacuden)
    if (portador && portador.indice !== undefined) {
      const f = def.retroceso ?? 0.5;
      juego.render?.retroceso?.(dx, dz, f);
      if (f >= 0.8 || (def.cadencia ?? 1) < 3) juego.render?.sacudir?.(Math.min(0.5, 0.02 + f * 0.08), 0.1 + f * 0.04);
    }
    portador?.alDisparar?.(def);
  }

  // ─────────────────────────── Hitscan ───────────────────────────
  function anguloConDispersion(tir) {
    const a = tir.rot + (rng() + rng() - 1) * tir.disp * 0.5;
    return a;
  }

  /**
   * Traza una bala por el mundo: devuelve los impactos dañables (con factor de daño acumulado) y el punto final.
   * `perf` objetivos extra que atraviesa; los muros detienen la bala salvo `def.atraviesaMuros`.
   */
  function trazar(tir, ang, alcance, perf, perdida) {
    const def = tir.def;
    const dx = Math.sin(ang), dz = Math.cos(ang);
    const hits = fisica.rayoTodos(tir.ox, tir.oz, dx, dz, alcance, MASCARA_BALA, tir.filtro ??= filtroBalas(tir.portador));
    const res = { dx, dz, impactos: [], fin: alcance, muro: null };
    let usados = 0, factor = 1;
    const vistos = new Set();
    for (const h of hits) {
      const ent = entidadDe(h.cuerpo);
      if (!ent) {
        if (def.atraviesaMuros) continue;
        res.fin = h.dist; res.muro = h; break;
      }
      if (ent.vivo === false || vistos.has(ent)) continue;
      vistos.add(ent);
      res.impactos.push({ ent, h, factor: factor * factorCaida(def, h.dist) });
      usados += costePerforar(ent);
      factor *= (1 - (perdida ?? 0.3));
      if (usados > perf) { res.fin = h.dist; break; }
    }
    return res;
  }

  function trazadora(tir, res, fraccion = 1) {
    const fx = juego.fx; if (!fx?.trazadora) return;
    const d = res.fin * fraccion;
    const tipo = tir.def.trazadora ?? 'bala';
    fx.trazadora({ x: tir.ox, y: tir.oy, z: tir.oz }, { x: tir.ox + res.dx * d, y: tir.oy * 0.9, z: tir.oz + res.dz * d }, { tipo, color: tir.def.color ?? COLOR_ENERGIA[tipo] });
  }

  function infoBase(tir, extraMult = 1) {
    const { def, portador, extra } = tir;
    return {
      tipo: def.tipo, atacante: portador, arma: def, puedeCritico: true, probCritico: def.critico ?? 0, multCritico: def.multCritico ?? 2,
      aturdimiento: def.aturdimiento, quemadura: def.quemadura, ralentiza: def.ralentiza, multiplicador: (extra?.multiplicador ?? 1) * extraMult,
      critico: !!extra?.critico,
    };
  }

  function impactoMuro(tir, res) {
    if (!res.muro) return;
    const h = res.muro;
    juego.eventos.emitir('impacto', { x: h.x, y: tir.oy, z: h.z, nx: h.nx, nz: h.nz, material: materialDeCuerpo(h.cuerpo), tipo: tir.def.tipo, objetivo: null, dirX: res.dx, dirZ: res.dz });
  }

  function hitscan(tir) {
    const { def } = tir;
    const ang = anguloConDispersion(tir);
    const res = trazar(tir, ang, def.alcance ?? 40, def.perforacion ?? 0, def.perdida ?? 0.3);
    for (const im of res.impactos) {
      c.aplicarDanio(im.ent, { ...infoBase(tir), cantidad: (def.danio ?? 10) * im.factor, x: im.h.x, z: im.h.z, dirX: res.dx, dirZ: res.dz, empuje: (def.empuje ?? 0) * Math.sqrt(im.factor), nx: im.h.nx, nz: im.h.nz });
    }
    impactoMuro(tir, res);
    trazadora(tir, res);
  }

  function perdigones(tir) {
    const { def } = tir;
    const n = def.perdigones ?? 8;
    const acum = new Map();
    let muros = 0;
    const cono = Math.max(tir.disp, 0.001);
    for (let i = 0; i < n; i++) {
      // Abanico estratificado con algo de azar: llena el cono y a la vez es irregular
      const u = 0.65 * ((i + rng()) / n * 2 - 1) + 0.35 * (rng() + rng() - 1);
      const ang = tir.rot + u * cono * 0.5;
      const res = trazar(tir, ang, def.alcance ?? 14, def.perforacion ?? 0, def.perdida ?? 0.3);
      for (const im of res.impactos) {
        let a = acum.get(im.ent);
        if (!a) acum.set(im.ent, (a = { cantidad: 0, n: 0, factor: 0, x: im.h.x, z: im.h.z, nx: im.h.nx, nz: im.h.nz }));
        a.cantidad += (def.danio ?? 10) * im.factor; a.n++; a.factor += im.factor;
      }
      if (res.muro && muros < 5) { muros++; impactoMuro(tir, res); }
      if (i % Math.max(1, Math.floor(n / 6)) === 0) trazadora(tir, res);
    }
    for (const [ent, a] of acum) {
      const frac = a.n / n;
      c.aplicarDanio(ent, { ...infoBase(tir), cantidad: a.cantidad, x: a.x, z: a.z, dirX: tir.dx, dirZ: tir.dz, empuje: (def.empuje ?? 0) * Math.min(1, frac * 1.6) * (a.factor / a.n), nx: a.nx, nz: a.nz });
    }
  }

  // ─────────────────────────── Proyectiles de arma ───────────────────────────
  function disparoProyectil(tir) {
    const { def, portador, mods } = tir;
    const ang = anguloConDispersion(tir);
    const dx = Math.sin(ang), dz = Math.cos(ang);
    let alcance = def.alcance ?? 40;
    if (def.gravedad) alcance = Math.min(alcance, portador?.distApuntado ?? alcance * 0.6);
    c.proyectil({
      x: tir.ox + dx * 0.4, y: tir.oy, z: tir.oz + dz * 0.4, dirX: dx, dirZ: dz, velocidad: def.velocidad ?? 30, alcance,
      danio: (def.danio ?? 50) * (tir.extra?.multiplicador ?? 1), tipo: def.tipo, radioExplosion: def.radio ?? 0, gravedad: !!def.gravedad,
      atacante: portador, arma: def, efecto: def.efecto, visual: def.visual, empuje: def.empuje, aturdimiento: def.aturdimiento,
      quemadura: def.quemadura, estela: def.visual === 'cohete' ? 'humo' : undefined,
      escala: { cohete: 1.5, granada40: 2.2, plasma: 1.2 }[def.visual] ?? 1,
    });
  }
}
