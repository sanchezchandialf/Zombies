// Zombis y jefes: entidad Dañable, sistema de la horda (objetivos, rejilla espacial, LOD de IA) y generación.
// El comportamiento por clase vive en src/ia/clases.js; los jefes en src/ia/jefes.js; la navegación en src/ia/navegacion.js.
// API del contrato: docs/ARQUITECTURA.md §Zombis. Extras documentados al final del archivo (sis.* y zombi.*).
import * as THREE from 'three';
import { ZOMBIS, JEFES } from '../datos/zombis.js';
import { CAPA, TODAS } from '../nucleo/fisica.js';
import { limitar, difAngulo, girarHacia, crearRng } from '../nucleo/util.js';
import { crearNavegacion } from '../ia/navegacion.js';
import { crearTelegrafos } from '../ia/telegrafos.js';
import { COMPORTAMIENTOS, EXTRAS } from '../ia/clases.js';
import { crearJefeIA } from '../ia/jefes.js';

const FACTORES_DIFICULTAD = {
  facil: { vida: 0.8, danio: 0.75 }, normal: { vida: 1, danio: 1 }, dificil: { vida: 1.25, danio: 1.2 },
};
const ANTICIPACION = { caminante: 0.45, corredor: 0.22, acorazado: 0.55, escupidor: 0.5, apestado: 0.5, mole: 0.75, aullador: 0.4, detonador: 0.3 };
const TAMBALEO = { caminante: 0.36, corredor: 0.08, acorazado: 0.1, escupidor: 0.2, apestado: 0.28, mole: 0.05, aullador: 0.22, detonador: 0.1 };
const GIRO_DIR = { caminante: 4.2, corredor: 7.5, acorazado: 2.6, escupidor: 4.5, apestado: 3.2, mole: 2.4, aullador: 4.5, detonador: 6 };
const GIRO_ROT = { caminante: 5.2, corredor: 10, acorazado: 1.7, escupidor: 6, apestado: 3.4, mole: 2.2, aullador: 6, detonador: 8 };

/** Visual vacío (sin módulo de personajes): cumple la interfaz y no hace nada. */
export function visualNulo() {
  return {
    altura: 1.8, colocar() {}, mover() {}, accion() {}, estado() {}, destello() {}, visible() {}, morir() {}, liberar() {},
    equipar() {}, vestir() {}, boca(out) { return out; },
  };
}

let _sigId = 1;
const _o = { x: 0, z: 0, d: 0 };

export class Zombi {
  constructor(sis, def, o) {
    const juego = sis.juego;
    this.sis = sis; this.juego = juego;
    this.id = _sigId++;
    this.def = def; this.clase = def;
    this.bando = 'zombis'; this.vivo = true; this.esJefe = !!o.esJefe; this.elite = !!o.elite;
    this.esZombi = true;
    this.material = 'carne';
    this.nombre = def.nombre;
    const rng = crearRng((o.semilla ?? (Math.floor(juego.rng() * 1e9))) + this.id * 7919);
    this.rng = rng;

    // Escalado con el día / dificultad / élite
    const dia = juego.estado?.dia || 1, dif = FACTORES_DIFICULTAD[juego.estado?.dificultad] || FACTORES_DIFICULTAD.normal;
    let escVida = (1 + 0.05 * (dia - 1)) * dif.vida, escDanio = (1 + 0.022 * (dia - 1)) * dif.danio;
    let escRadio = 1, escMasa = 1;
    if (this.elite) { escVida *= 2.5; escDanio *= 1.35; escRadio = 1.08; escMasa = 1.35; }
    if (this.esJefe) {
      const n = Math.max(1, juego.jugadores?.length || 1);
      escVida = dif.vida * (1 + 0.65 * (n - 1)); escDanio = dif.danio * (1 + 0.1 * (dia > 25 ? 1 : 0));
    }
    this.escVida = escVida; this.escDanio = escDanio;
    this.vidaMax = o.vida ?? Math.round(def.vida * escVida);
    this.vida = this.vidaMax;
    this.danio = def.danio * escDanio;
    this.radio = def.radio * escRadio;
    this.masa = def.masa * escMasa;
    this.alcance = def.alcance ?? (def.radio + 1.4);
    this.cadenciaAtaque = def.cadenciaAtaque ?? 0.5;
    this.puntos = Math.round(def.puntos * (this.elite ? 3 : 1));
    this.resistencias = def.resistencias || {};
    this.velBase = def.velocidad;

    // Individualidad
    this.velMul = this.esJefe ? 1 : 0.86 + rng() * 0.28;
    this.fase = rng() * 6.283;
    this.frecTambaleo = 0.9 + rng() * 0.9;
    this.ampTambaleo = TAMBALEO[def.id] ?? 0.08;
    this.giro = (GIRO_DIR[def.id] ?? 3.5) * (0.85 + rng() * 0.3);
    this.giroRot = (GIRO_ROT[def.id] ?? 3) * (0.85 + rng() * 0.3);
    this.lado = rng() < 0.5 ? -1 : 1;
    this.anticipacion = ANTICIPACION[def.id] ?? 0.5;

    // Navegación
    this.capa = sis.nav.capaDeRadio(this.radio);
    this.pos = new THREE.Vector3(o.x, 0, o.z);
    this.rot = o.rot ?? 0;
    this.px = o.x; this.pz = o.z; this.rvx = 0; this.rvz = 0;
    this.mx = 0; this.mz = 0; this.deseoX = 0; this.deseoZ = 0; this.velFactor = 1;
    this.mirarX = 0; this.mirarZ = 0;
    this.gx = 0; this.gz = 0;
    this.kbX = 0; this.kbZ = 0;
    this.fVx = 0; this.fVz = 0; this.tForzado = 0;
    this.prog = 1; this.sinCamino = false;
    this.tPensar = 0; this.tPensarPrev = 0;
    this.rec = null; this.objetivo = null; this.dObj = 1e9;
    this.atraidoHasta = 0; this.atraidoX = 0; this.atraidoZ = 0;
    this.lod = 0;

    // Estados
    this.tInvul = 0; this.tEmerge = 0; this.tAturdido = 0;
    this.tLento = 0; this.factorLento = 1;
    this.tArde = 0; this.dpsArde = 0; this.atacanteFuego = null; this.tTickFuego = 0;
    this.tFuria = 0;
    this.tCoolAtaque = 0; this.atk = null;
    this.tUltimoGolpe = -9; this.ultimoAtacante = null; this.tChispa = 0;
    this.bloqueador = null; this.tBloqueo = -9; this.muroTocado = -9; this.muroNx = 0; this.muroNz = 0;
    this.ultimoContacto = null;
    this.modo = 'normal'; this.tModo = 0;
    this.datosClase = {};
    this.expuesto = false;

    // Cuerpo físico
    this.cuerpo = sis.fisica.crearCuerpo({
      forma: 'circulo', x: o.x, z: o.z, radio: this.radio, masa: this.masa, capa: CAPA.ZOMBI, mascara: TODAS,
      rigidez: this.esJefe ? 0.9 : 0.6, amortiguacion: 0, datos: this,
      alColisionar: (otro, nx, nz, solape, velRel) => this.contacto(otro, nx, nz, solape, velRel),
    });

    this.visual = o.visual || visualNulo();
    this.comp = COMPORTAMIENTOS[def.comportamiento] || COMPORTAMIENTOS.perseguir;
    this.extra = EXTRAS[def.id] || null;
    this.ia = null;       // jefes: máquina de estados
    if (this.esJefe) this.ia = crearJefeIA(sis, this);
    this.comp.iniciar?.(this, sis);
    this.extra?.iniciar?.(this, sis);
  }

  /** ¿Es el momento (juego.tiempo.ahora)? */
  get ahora() { return this.sis.ahora; }

  /** 'metal' si es un Acorazado y el agresor más cercano está de frente; 'carne' en el resto de casos. */
  get material() {
    if (!this.def.blindajeFrontal) return 'carne';
    const r = this.sis.jugadorMasCercano(this.pos.x, this.pos.z);
    if (!r) return 'metal';
    const dx = r.x - this.pos.x, dz = r.z - this.pos.z, l = Math.hypot(dx, dz) || 1;
    return (dx * Math.sin(this.rot) + dz * Math.cos(this.rot)) / l > 0.3 ? 'metal' : 'carne';
  }
  set material(_) { /* derivado */ }

  // ───────────── Daño y estados (interfaz Dañable) ─────────────

  /** ¿Viene el golpe de frente? (el proyectil viaja contra la mirada del zombi). */
  _frontal(dirX, dirZ) {
    return -(dirX * Math.sin(this.rot) + dirZ * Math.cos(this.rot)) > 0.34;
  }
  /** ¿Viene el golpe de la espalda? */
  _trasero(dirX, dirZ) {
    return (dirX * Math.sin(this.rot) + dirZ * Math.cos(this.rot)) > 0.3;
  }

  recibirDanio(info) {
    if (!this.vivo) return 0;
    if (this.tInvul > 0 && !info.ignorarInvulnerable) return 0;
    const sis = this.sis, def = this.def;
    let tipo = info.tipo || 'bala';
    let cant = info.cantidad || 0;
    if (cant <= 0) return 0;
    let dx = info.dirX, dz = info.dirZ;
    if (dx === undefined || dz === undefined) {
      const a = info.atacante?.pos;
      if (a) { dx = this.pos.x - a.x; dz = this.pos.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
      else { dx = 0; dz = 0; }
    }
    let mult = this.resistencias[tipo];
    if (mult === undefined) mult = tipo === 'veneno' ? 0.3 : 1;
    let rebote = false;
    if (def.blindajeFrontal) {
      if (tipo === 'bala') {
        if (this._frontal(dx, dz)) rebote = true; else mult = 1;     // por la espalda: daño normal
      }
    }
    if (def.puntoDebil === 'espalda' && this._trasero(dx, dz)) {
      const m = this.modo === 'aturdida' || this.tAturdido > 0 ? 2 : 1.5;
      mult *= m; if (m >= 2) info.critico = true;
    }
    if (this.ia) mult *= this.ia.multiplicadorDanio(info, tipo, dx, dz);
    cant *= mult;
    this.vida -= cant;
    this.tUltimoGolpe = sis.ahora; this.ultimoAtacante = info.atacante || this.ultimoAtacante;
    if (info.empuje) this.empujar(dx * info.empuje * 70, dz * info.empuje * 70);   // empuje del contrato ≈ m/s sobre 70 kg
    if (this.tAturdido <= 0 || this.vida <= 0 || true) this.visual.accion('golpe', { dirX: dx, dirZ: dz, duracion: 0.25 });
    this.visual.destello?.();
    if (rebote && sis.ahora - this.tChispa > 0.07) {
      this.tChispa = sis.ahora;
      sis.fxEmitir('chispas', info.x ?? this.pos.x, 1.1, info.z ?? this.pos.z, { dirX: -dx, dirZ: -dz, cantidad: 6 });
      sis.juego.audio?.reproducir?.('rebote', { x: this.pos.x, z: this.pos.z, volumen: 0.6 });
    }
    if (this.extra?.alRecibir) this.extra.alRecibir(this, info, cant);
    if (this.ia) this.ia.alRecibir(info, cant);
    if (this.vida <= 0) {
      this.vida = 0;
      this.morir({ ...info, dirX: dx, dirZ: dz, danioFinal: cant });
    }
    return cant;
  }

  aturdir(s) {
    if (!this.vivo || s <= 0) return;
    if (this.esJefe) { if (this.ia.puedeAturdir()) s = Math.min(s, 0.7); else return; }
    if (this.tAturdido < s) {
      this.tAturdido = s;
      this.atk = null;
      this.visual.accion('aturdir', { duracion: s });
    }
  }

  ralentizar(factor, s) {
    if (!this.vivo) return;
    if (this.esJefe) factor = Math.max(factor, 0.6);
    if (this.tLento <= 0 || factor <= this.factorLento) { this.factorLento = factor; }
    this.tLento = Math.max(this.tLento, s);
    this.visual.estado('ralentizado', true);
  }

  incendiar(s, dps = 6, atacante = null) {
    if (!this.vivo) return;
    if (this.esJefe && this.resistencias.fuego < 0.3) return;      // el Fogonero no arde
    if (this.tArde <= 0) this.tTickFuego = 0.4;
    this.tArde = Math.max(this.tArde, s);
    this.dpsArde = Math.max(this.dpsArde, dps);
    this.atacanteFuego = atacante || this.atacanteFuego;
    this.visual.estado('ardiendo', true);
  }

  /** Empuje en N·s (impulso): se convierte en velocidad según la masa; los grandes casi no se mueven. */
  empujar(ix, iz) {
    if (!this.vivo) return;
    let k = 1 / this.masa;
    if (this.esJefe) k *= 0.03; else if (this.def.id === 'mole') k *= 0.35; else if (this.def.id === 'acorazado') k *= 0.7;
    this.kbX += ix * k; this.kbZ += iz * k;
    const v2 = this.kbX * this.kbX + this.kbZ * this.kbZ;
    if (v2 > 196) { const f = 14 / Math.sqrt(v2); this.kbX *= f; this.kbZ *= f; }
  }

  /** Teletransporte / colocación segura. */
  colocar(x, z) {
    this.cuerpo.x = x; this.cuerpo.z = z; this.pos.x = x; this.pos.z = z; this.px = x; this.pz = z;
  }

  // ───────────── Contacto (física) ─────────────

  contacto(otro, nx, nz, solape, velRel) {
    const d = otro.datos;
    if (!d) {
      if (otro.estatico) { this.muroTocado = this.sis.ahora; this.muroNx = nx; this.muroNz = nz; this.muroVel = velRel; }
      return;
    }
    if (d.bando === 'zombis') { if (this.comp.alContacto) this.comp.alContacto(this, d, otro, nx, nz, velRel); return; }
    if (d.vivo === false) return;
    if (typeof d.recibirDanio !== 'function') { if (otro.estatico) { this.muroTocado = this.sis.ahora; this.muroNx = nx; this.muroNz = nz; this.muroVel = velRel; } return; }
    this.ultimoContacto = d;
    if (otro.capa & (CAPA.ESTRUCTURA | CAPA.VEHICULO | CAPA.ESTATICO | CAPA.PROP)) { this.bloqueador = d; this.tBloqueo = this.sis.ahora; }
    if (otro.estatico) { this.muroTocado = this.sis.ahora; this.muroNx = nx; this.muroNz = nz; this.muroVel = velRel; }
    if (this.comp.alContacto) this.comp.alContacto(this, d, otro, nx, nz, velRel);
    if (this.ia) this.ia.alContacto(d, otro, nx, nz, velRel);
  }

  // ───────────── Percepción y movimiento ─────────────

  /** Elige el blanco más cercano (jugador o vehículo ocupado) y deja z.rec, z.objetivo, z.dObj. */
  preparar() {
    const sis = this.sis, lista = sis.objetivos, n = sis.nObjetivos;
    const x = this.cuerpo.x, z = this.cuerpo.z;
    let mejor = null, md = 1e18;
    for (let i = 0; i < n; i++) {
      const r = lista[i], dx = r.x - x, dz = r.z - z, d2 = dx * dx + dz * dz;
      if (d2 < md) { md = d2; mejor = r; }
    }
    this.rec = mejor; this.objetivo = mejor ? (mejor.jugador || mejor.ent) : null;
    this.dObj = mejor ? Math.sqrt(md) : 1e9;
    return mejor;
  }

  /** Dirección de navegación hacia (tx,tz): directa si hay paso libre y está cerca, campo de flujo si no. Resultado en gx/gz. */
  guiar(tx, tz, d, campo) {
    const nav = this.sis.nav, x = this.cuerpo.x, z = this.cuerpo.z;
    if (d < 11 && nav.lineaTransitable(x, z, tx, tz, this.radio)) {
      const inv = 1 / (d || 1);
      this.gx = (tx - x) * inv; this.gz = (tz - z) * inv; this.sinCamino = false;
      return;
    }
    nav.direccion(x, z, _o, this.capa, campo || 'jugadores');
    if (_o.d >= 1e8 || (_o.x === 0 && _o.z === 0 && d > 1.6)) {
      // sin camino para este tamaño: de frente (y a romper lo que estorbe)
      const inv = 1 / (d || 1);
      this.gx = (tx - x) * inv; this.gz = (tz - z) * inv; this.sinCamino = true;
    } else { this.gx = _o.x; this.gz = _o.z; this.sinCamino = false; }
  }

  /**
   * Compone la dirección deseada: guía + separación de vecinos + rechazo de muros + evitación de zonas + tambaleo.
   * `vel` = factor de velocidad (0..1+).
   */
  componer(gx, gz, vel, sepPeso = 1.25) {
    const sis = this.sis, nav = sis.nav, h = sis.hash;
    const x = this.cuerpo.x, z = this.cuerpo.z, ahora = sis.ahora;
    let sx = 0, sz = 0;
    // separación
    {
      let cx = ((x - h.minX) * h.inv) | 0, cz = ((z - h.minZ) * h.inv) | 0;
      if (cx < 1) cx = 1; else if (cx > h.nx - 2) cx = h.nx - 2;
      if (cz < 1) cz = 1; else if (cz > h.nz - 2) cz = h.nz - 2;
      const lista = h.lista, sig = h.sig, cab = h.cabeza, r0 = this.radio;
      for (let j = cz - 1; j <= cz + 1; j++) {
        for (let i = cx - 1; i <= cx + 1; i++) {
          for (let k = cab[j * h.nx + i]; k >= 0; k = sig[k]) {
            const o = lista[k];
            if (o === this) continue;
            const dx = x - o.cuerpo.x, dz = z - o.cuerpo.z, d2 = dx * dx + dz * dz;
            const rr = (r0 + o.radio) * 1.35 + 0.2;
            if (d2 >= rr * rr || d2 < 1e-6) continue;
            const d = Math.sqrt(d2), w = (1 - d / rr) * (o.masa > this.masa * 2 ? 2.2 : 1);
            sx += (dx / d) * w; sz += (dz / d) * w;
          }
        }
      }
    }
    let ex = 0, ez = 0;
    // muros
    nav.repulsion(x, z, this.radio, _o);
    ex += _o.x * 1.6; ez += _o.z * 1.6;
    // zonas peligrosas
    const zonas = sis.juego.combate?.zonas;
    if (zonas && zonas.length) {
      for (let i = 0; i < zonas.length; i++) {
        const zn = zonas[i];
        if (!zn.activo || !(zn.tipo === 'fuego' || zn.tipo === 'acido' || zn.tipo === 'gas' || zn.tipo === 'gravedad')) continue;
        if (zn.afecta === 'jugadores') continue;
        const dx = x - zn.x, dz = z - zn.z, rr = zn.radio + this.radio + 1.4, d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 0.01, w = (1 - d / rr) * 2.4;
        ex += (dx / d) * w; ez += (dz / d) * w;
      }
    }
    // atasco: si la masa no deja avanzar, abrirse en abanico alrededor del objetivo
    let tx = 0, tz = 0;
    if (this.prog < 0.35 && !this.atk && this.dObj < 9) { tx = -gz * this.lado * 0.9; tz = gx * this.lado * 0.9; }
    let dxd = gx + sx * sepPeso + ex + tx, dzd = gz + sz * sepPeso + ez + tz;
    // tambaleo (paso irregular)
    if (this.ampTambaleo > 0) {
      const a = Math.sin(ahora * this.frecTambaleo * 2.3 + this.fase) * this.ampTambaleo, c = Math.cos(a), s = Math.sin(a);
      const ux = dxd * c - dzd * s; dzd = dxd * s + dzd * c; dxd = ux;
    }
    const l2 = dxd * dxd + dzd * dzd;
    if (l2 > 1) { const il = 1 / Math.sqrt(l2); dxd *= il; dzd *= il; }
    this.deseoX = dxd; this.deseoZ = dzd; this.velFactor = vel;
  }

  /** Quieto y mirando hacia (mx, mz): la dirección no cambia pero se frena. */
  parar() { this.deseoX = 0; this.deseoZ = 0; this.velFactor = 0; }

  /** Paseo sin rumbo (sin objetivos). */
  vagar() {
    const a = this.fase + this.sis.ahora * 0.25 * this.frecTambaleo + Math.sin(this.sis.ahora * 0.7 + this.fase * 3) * 1.6;
    this.componer(Math.sin(a), Math.cos(a), 0.35);
  }

  /** Ataque cuerpo a cuerpo genérico: anticipación + golpe. `obj` Dañable. */
  puedeGolpear() { return !this.atk && this.tCoolAtaque <= this.sis.ahora && this.tAturdido <= 0 && this.tEmerge <= 0; }

  alcanceA(obj) { return this.alcance + this.radio + (obj.radio ?? 0.4); }

  iniciarGolpe(obj, dur = this.anticipacion) {
    const sis = this.sis;
    const dx = obj.pos.x - this.pos.x, dz = obj.pos.z - this.pos.z, l = Math.hypot(dx, dz) || 1;
    this.atk = { obj, t: 0, dur, dx: dx / l, dz: dz / l, mult: 1 };
    this.mirarX = dx / l; this.mirarZ = dz / l;
    this.visual.accion('atacar', { duracion: dur + 0.25, dirX: dx / l, dirZ: dz / l });
    sis.juego.audio?.reproducir?.('zombi_ataque', { x: this.pos.x, z: this.pos.z, volumen: 0.4 });
  }

  /** Avanza el golpe en curso. */
  _avanzarGolpe(dt) {
    const a = this.atk, obj = a.obj;
    if (!obj || obj.vivo === false) { this.atk = null; this.mirarX = this.mirarZ = 0; return; }
    const dx = obj.pos.x - this.pos.x, dz = obj.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    a.t += dt;
    if (a.t < a.dur) { this.mirarX = dx / d; this.mirarZ = dz / d; return; }
    // golpe
    const alc = this.alcanceA(obj) + 0.55;
    if (d <= alc) this.golpear(obj, dx / d, dz / d, a.mult);
    this.tCoolAtaque = this.sis.ahora + (1 / this.cadenciaAtaque) * (0.9 + this.rng() * 0.3);
    this.atk = null; this.mirarX = this.mirarZ = 0;
  }

  /** Daño de golpe a un objetivo (jugador, vehículo, estructura…). */
  golpear(obj, dirX, dirZ, mult = 1, extra = null) {
    const sis = this.sis;
    let cant = this.danio * mult;
    const esJugador = obj.bando === 'jugadores' && obj.rol;
    if (!esJugador && this.def.danioEstructuras) cant *= this.def.danioEstructuras;
    const info = {
      cantidad: cant, tipo: 'golpe', atacante: this, arma: null, x: obj.pos.x, z: obj.pos.z, dirX, dirZ,
      empuje: (this.def.id === 'mole' ? 8 : this.def.id === 'acorazado' ? 3.2 : this.esJefe ? 5 : 1.8), critico: false, ...extra,
    };
    return sis.danar(obj, info);
  }

  // ───────────── Ciclo ─────────────

  /** Pensamiento (a ritmo de LOD) */
  pensar() {
    if (this.ia) { this.ia.pensar(); return; }
    this.comp.pensar(this, this.sis);
  }

  /** Cada cuadro, antes de la física. */
  actualizar(dt) {
    const sis = this.sis, ahora = sis.ahora;
    if (this.tInvul > 0) this.tInvul -= dt;
    if (this.tEmerge > 0) { this.tEmerge -= dt; }
    if (this.tAturdido > 0) { this.tAturdido -= dt; if (this.tAturdido <= 0) this.alDesaturdir?.(); }
    if (this.tLento > 0) { this.tLento -= dt; if (this.tLento <= 0) { this.factorLento = 1; this.visual.estado('ralentizado', false); } }
    if (this.tFuria > 0) { this.tFuria -= dt; if (this.tFuria <= 0) this.visual.estado('furia', false); }
    if (this.tArde > 0) {
      this.tArde -= dt; this.tTickFuego -= dt;
      if (this.tTickFuego <= 0) {
        this.tTickFuego = 0.5;
        sis.danar(this, { cantidad: this.dpsArde * 0.5, tipo: 'fuego', atacante: this.atacanteFuego, x: this.pos.x, z: this.pos.z, dirX: 0, dirZ: 0, ignorarInvulnerable: true });
        if (!this.vivo) return;
      }
      if (this.tArde <= 0) { this.dpsArde = 0; this.visual.estado('ardiendo', false); }
    }

    // pensar (LOD)
    if (ahora >= this.tPensar && this.tEmerge <= 0 && this.tAturdido <= 0) {
      this.pensar();
      if (!this.vivo) return;
      const iv = this.lod === 0 ? 0 : this.lod === 1 ? 0.05 : this.lod === 2 ? 0.1 : 0.2;
      this.tPensar = ahora + iv * (0.8 + this.rng() * 0.4);
    }
    this.comp.actualizar?.(this, dt, sis);
    this.extra?.actualizar?.(this, dt, sis);
    if (this.ia) this.ia.actualizar(dt);
    if (!this.vivo) return;
    if (this.atk) this._avanzarGolpe(dt);

    this.integrar(dt);
  }

  integrar(dt) {
    const c = this.cuerpo;
    let vf = this.velFactor;
    const kb2 = this.kbX * this.kbX + this.kbZ * this.kbZ;
    if (this.tAturdido > 0 || this.tEmerge > 0) vf = 0;
    else if (kb2 > 4) vf *= 0.35;
    if (this.atk) vf *= 0.08;
    const k = Math.min(1, this.giro * dt);
    this.mx += (this.deseoX - this.mx) * k; this.mz += (this.deseoZ - this.mz) * k;
    const rap = this.velBase * this.velMul * vf * this.factorLento * (this.tFuria > 0 ? 1.4 : 1) * (this.tArde > 0 && !this.esJefe ? 1.15 : 1);
    let vx = this.mx * rap, vz = this.mz * rap;
    if (this.tForzado > 0) { this.tForzado -= dt; vx = this.fVx; vz = this.fVz; }
    if (kb2 > 1e-4) {
      vx += this.kbX; vz += this.kbZ;
      const f = Math.exp(-(this.esJefe ? 10 : 5.5) * dt);
      this.kbX *= f; this.kbZ *= f;
      if (kb2 < 0.01) { this.kbX = 0; this.kbZ = 0; }
    }
    c.vx = vx; c.vz = vz;
    // orientación
    let lx = this.mx, lz = this.mz;
    if (this.mirarX !== 0 || this.mirarZ !== 0) { lx = this.mirarX; lz = this.mirarZ; }
    else if (this.tForzado > 0) { lx = this.fVx; lz = this.fVz; }
    if (lx * lx + lz * lz > 0.012) this.rot = girarHacia(this.rot, Math.atan2(lx, lz), this.giroRot * dt);
  }

  /** Tras la física: sincroniza posición y visual. */
  posFisica(dt) {
    const c = this.cuerpo;
    this.pos.x = c.x; this.pos.z = c.z;
    if (dt > 1e-5) {
      const rvx = (c.x - this.px) / dt, rvz = (c.z - this.pz) / dt;
      this.rvx += (rvx - this.rvx) * 0.45; this.rvz += (rvz - this.rvz) * 0.45;
      const esp = Math.hypot(c.vx, c.vz);
      const prog = esp > 0.4 ? Math.min(1, Math.hypot(this.rvx, this.rvz) / esp) : 1;
      this.prog += (prog - this.prog) * Math.min(1, dt * 2.5);
    }
    this.px = c.x; this.pz = c.z;
    this.visual.mover(this.rvx, this.rvz);
    this.visual.colocar(c.x, c.z, this.rot);
  }

  // ───────────── Muerte ─────────────

  morir(info = {}) {
    if (!this.vivo) return;
    const sis = this.sis, juego = this.juego;
    this.vivo = false;
    this.extra?.alMorir?.(this, info, sis);
    this.comp.alMorir?.(this, info, sis);
    const lista = juego.zombis, i = lista.indexOf(this);
    if (i >= 0) { lista[i] = lista[lista.length - 1]; lista.pop(); }
    sis.fisica.eliminarCuerpo(this.cuerpo);
    const dirX = info.dirX ?? 0, dirZ = info.dirZ ?? 0;
    const fuerza = limitar(0.25 + (info.danioFinal ?? info.cantidad ?? 0) / Math.max(30, this.vidaMax * 0.6) + (info.tipo === 'explosivo' ? 1 : 0) + (info.empuje ? Math.min(1, info.empuje / (this.masa * 8)) : 0), 0, 3);
    this.visual.estado('ardiendo', false); this.visual.estado('ralentizado', false); this.visual.estado('furia', false); this.visual.estado('cargando', false);
    this.visual.morir({ dirX, dirZ, fuerza, tipo: info.tipo || 'bala' });
    if (this.ia) this.ia.alMorir(info);
    juego.eventos.emitir('zombi:muerte', { zombi: this, info, atacante: info.atacante || this.ultimoAtacante });
    if (this.esJefe) juego.eventos.emitir('jefe:muerte', { jefe: this });
    const botines = this.esJefe ? 5 : this.elite ? 2 : 1;
    for (let k = 0; k < botines; k++) {
      juego.mundo?.soltarBotin?.(this.pos.x + (k ? (this.rng() - 0.5) * 3 : 0), this.pos.z + (k ? (this.rng() - 0.5) * 3 : 0), { suerte: this.esJefe ? 3 : this.elite ? 2 : 1 });
    }
    sis.alMorirZombi(this);
  }

  /** Retirada inmediata sin muerte (limpiar). */
  liberar() {
    this.vivo = false;
    this.extra?.liberar?.(this);
    this.sis.fisica.eliminarCuerpo(this.cuerpo);
    this.visual.liberar();
  }
}

// ───────────────────────────────────────────────────────────────────────────

export function crearZombis(juego) {
  const fisica = juego.fisica;
  const nav = crearNavegacion(juego);
  const tel = crearTelegrafos(juego);
  const radioPrueba = 0;
  void radioPrueba;

  // Registros de objetivos reutilizables
  const reg = []; for (let i = 0; i < 12; i++) reg.push({ ent: null, jugador: null, x: 0, z: 0, radio: 0.5, pos: null, esVehiculo: false });
  const objNav = [];        // [{x,z}] para el campo de flujo de jugadores
  const objSenuelos = [];   // para el campo de señuelos
  const senuelos = [];      // { x, z, radio, hasta }

  // Rejilla espacial de zombis (celdas de 2 m) para la separación
  const hash = { minX: -50, minZ: -50, inv: 0.5, nx: 52, nz: 52, cabeza: new Int32Array(52 * 52), sig: new Int32Array(512), lista: [] };

  function prepararHash() {
    const l = fisica.limites || { minX: -45, maxX: 45, minZ: -45, maxZ: 45 };
    const nx = Math.ceil((l.maxX - l.minX) / 2) + 4, nz = Math.ceil((l.maxZ - l.minZ) / 2) + 4;
    hash.minX = l.minX - 2; hash.minZ = l.minZ - 2; hash.inv = 0.5;
    if (hash.nx !== nx || hash.nz !== nz) { hash.nx = nx; hash.nz = nz; hash.cabeza = new Int32Array(nx * nz); }
  }
  function reconstruirHash(lista, n) {
    const h = hash;
    h.cabeza.fill(-1);
    if (h.sig.length < n) h.sig = new Int32Array(n * 2);
    h.lista = lista;
    for (let i = 0; i < n; i++) {
      const z = lista[i];
      let cx = ((z.cuerpo.x - h.minX) * h.inv) | 0, cz = ((z.cuerpo.z - h.minZ) * h.inv) | 0;
      if (cx < 1) cx = 1; else if (cx > h.nx - 2) cx = h.nx - 2;
      if (cz < 1) cz = 1; else if (cz > h.nz - 2) cz = h.nz - 2;
      const c = cz * h.nx + cx;
      h.sig[i] = h.cabeza[c]; h.cabeza[c] = i;
    }
  }

  const lote = [];
  const nubes = [];      // nubes de gas de apestados (inflamables)
  const drones = [];
  let tObjetivos = 0;
  const offs = [];
  const sis = {
    juego, fisica, nav, tel, hash, objetivos: reg, nObjetivos: 0, senuelos, nubes, drones,
    ahora: 0, dia: 1,
    nav_: nav,

    jugadorMasCercano(x, z) {
      let mejor = null, md = 1e18;
      for (let i = 0; i < sis.nObjetivos; i++) {
        const r = reg[i], dx = r.x - x, dz = r.z - z, d2 = dx * dx + dz * dz;
        if (d2 < md) { md = d2; mejor = r; }
      }
      return mejor;
    },

    /** Daño por el cauce del contrato (combate) y, si no existe, directo. */
    danar(obj, info) {
      if (!obj || obj.vivo === false) return 0;
      const c = juego.combate;
      if (c?.aplicarDanio) return c.aplicarDanio(obj, info);
      return obj.recibirDanio ? obj.recibirDanio(info) : 0;
    },

    fxEmitir(nombre, x, y, z, op) {
      const fx = juego.fx;
      if (fx?.emitir) { offs.length = 0; fx.emitir(nombre, { x, y, z }, op); }
    },

    /** Entidades dañables de los jugadores en radio: jugadores, vehículos, estructuras. */
    amigos(x, z, radio, fn) {
      for (const j of juego.jugadores) if (j && j.vivo !== false && !j.invisible) { if (Math.hypot(j.pos.x - x, j.pos.z - z) <= radio + (j.radio ?? 0.4)) fn(j); }
      const v = juego.vehiculos?.lista;
      if (v) for (const e of v) if (e && e.vivo !== false) { if (Math.hypot(e.pos.x - x, e.pos.z - z) <= radio + (e.radio ?? 1.2)) fn(e); }
      const est = juego.mundo?.estructuras;
      if (est) for (const e of est) if (e && e.vivo !== false) { if (Math.hypot(e.pos.x - x, e.pos.z - z) <= radio + (e.radio ?? 0.8)) fn(e); }
    },

    /** Estructuras y vehículos dañables (blancos del Escupidor, rotura de la Mole…). */
    estructuras() { return juego.mundo?.estructuras || []; },

    /** Explosión: delega en combate.explotar y suma el daño extra a estructuras. */
    explotar(x, z, radio, danio, o = {}) {
      const c = juego.combate;
      if (c?.explotar) c.explotar({ x, z, radio, danio, tipo: o.tipo || 'explosivo', atacante: o.atacante, empuje: o.empuje ?? 5, danioEstructuras: o.danioEstructuras, quemadura: o.quemadura });
      sis.fxEmitir(o.fx || 'explosion', x, 0.6, z, { escala: radio / 4.5 });
    },

    zona(o) { return juego.combate?.crearZona?.(o) ?? null; },

    alMorirZombi() {},

    /** Grito del Aullador: la horda cercana corre +40 % durante `grito.duracion` y los jugadores cercanos quedan silenciados. */
    gritar(z) {
      const g = z.def.grito, x = z.pos.x, zz = z.pos.z, ahora = sis.ahora;
      for (const o of juego.zombis) {
        if (!o.vivo || o === z || o.esJefe) continue;
        if (Math.hypot(o.pos.x - x, o.pos.z - zz) <= g.radio * 1.8) { o.tFuria = Math.max(o.tFuria, g.duracion); o.visual.estado('furia', true); }
      }
      z.tFuria = 0;
      for (const j of juego.jugadores) {
        if (!j || j.vivo === false) continue;
        if (Math.hypot(j.pos.x - x, j.pos.z - zz) <= g.radio) j.silenciado = Math.max(j.silenciado || 0, g.silencio);
      }
      sis.fxEmitir('onda', x, 1.2, zz, { escala: 1.5, color: '#d98fd0' });
      juego.render?.sacudir?.(0.25, 0.4);
      juego.eventos.emitir('zombi:grito', { zombi: z, t: ahora });
    },

    // ─── Nubes de gas inflamables (Apestado) ───
    crearNube(x, z, radio, duracion, dps, atacante) {
      const zona = sis.zona({ x, z, radio, duracion, tipo: 'gas', dps, atacante, afecta: 'jugadores' });
      nubes.push({ x, z, radio, hasta: sis.ahora + duracion, zona, atacante });
      sis.fxEmitir('gas_toxico', x, 0.3, z, { escala: radio / 3 });
    },
    /** Detona el gas: explosión de fuego en (x,z) y las nubes vecinas se inflaman en cadena. */
    detonarNube(x, z, radio, atacante) {
      sis.explotar(x, z, radio * 0.9, 55 * (atacante?.escDanio ?? 1), { tipo: 'fuego', atacante, fx: 'explosion', empuje: 5, quemadura: { duracion: 3, dps: 8 } });
      sis.zona({ x, z, radio: radio * 0.6, duracion: 3, tipo: 'fuego', dps: 9, atacante, afecta: 'todos' });
    },
    alExplosion(e) {
      for (let i = nubes.length - 1; i >= 0; i--) {
        const n = nubes[i];
        if (n.detonada) continue;
        if (Math.hypot(n.x - e.x, n.z - e.z) <= e.radio + n.radio * 0.6) {
          n.detonada = true; n.zona?.quitar?.(); nubes.splice(i, 1);
          sis.detonarNube(n.x, n.z, n.radio, n.atacante);
        }
      }
    },
    actualizarNubes() {
      const zonas = juego.combate?.zonas;
      for (let i = nubes.length - 1; i >= 0; i--) {
        const n = nubes[i];
        if (n.hasta <= sis.ahora || (n.zona && n.zona.activo === false)) { nubes.splice(i, 1); continue; }
        if (!zonas) continue;
        for (let k = 0; k < zonas.length; k++) {
          const f = zonas[k];
          if (f.activo && f.tipo === 'fuego' && f !== n.zona && Math.hypot(f.x - n.x, f.z - n.z) < f.radio + n.radio * 0.6) {
            nubes.splice(i, 1); n.zona?.quitar?.(); n.detonada = true; sis.detonarNube(n.x, n.z, n.radio, n.atacante); break;
          }
        }
      }
    },

    /**
     * Proyectil en parábola desde (x,y,z) hasta (tx,tz) en `tiempo` s, con aviso en el suelo. Usa combate.proyectil si existe;
     * si no, simula el arco aquí. alImpactar(x, z, conCombate) se llama al aterrizar (o al chocar en vuelo).
     */
    parabola(o) {
      const ox = o.x, oz = o.z, oy = o.y ?? 1.5, D = Math.hypot(o.tx - ox, o.tz - oz) || 0.01;
      const T = Math.max(0.2, o.tiempo ?? D / 12);
      if (o.telegrafo !== false) {
        const radioAv = o.radioAviso ?? o.radio ?? 1.6;
        tel.disco(o.tx, o.tz, radioAv, T, { color: o.colorAviso || '#ff4a2a' });
      }
      let hecho = false, usaCombate = false;
      const impactar = (a, b) => {
        if (hecho) return; hecho = true;
        let px = o.tx, pz = o.tz;
        if (typeof a === 'number' && typeof b === 'number') { px = a; pz = b; }
        else if (a && typeof a.x === 'number' && typeof a.z === 'number') { px = a.x; pz = a.z; }
        o.alImpactar?.(px, pz, usaCombate);
      };
      const c = juego.combate?.proyectil?.({
        x: ox, y: oy, z: oz, dirX: (o.tx - ox) / D, dirZ: (o.tz - oz) / D, velocidad: D / T, alcance: D, danio: o.danio ?? 0,
        tipo: o.tipo || 'acido', radio: 0.25, radioExplosion: o.radio ?? 0, gravedad: o.gravedad ?? 20, atacante: o.atacante,
        bando: 'zombis', efecto: o.efecto, alImpactar: impactar,
      });
      if (c) { usaCombate = true; return c; }
      vuelos.push({ ox, oz, oy, tx: o.tx, tz: o.tz, T, t: 0, impactar, mesh: crearBola(o.efecto) });
      return null;
    },
  };

  // Vuelos propios (cuando combate no ofrece proyectiles)
  const vuelos = [];
  let geoBola = null; const matsBola = {};
  function crearBola(efecto) {
    const esc = juego.render?.escena;
    if (!esc) return null;
    if (!geoBola) geoBola = new THREE.IcosahedronGeometry(0.22, 1);
    const col = efecto === 'acido' ? 0x8cff3a : efecto === 'gas' ? 0xc8d84a : efecto === 'fuego' ? 0xff7a1c : 0xff4a2a;
    const m = matsBola[col] || (matsBola[col] = new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
    const mesh = new THREE.Mesh(geoBola, m);
    esc.add(mesh);
    return mesh;
  }
  function actualizarVuelos(dt) {
    for (let i = vuelos.length - 1; i >= 0; i--) {
      const v = vuelos[i];
      v.t += dt;
      const s = Math.min(1, v.t / v.T), alt = 0.5 * Math.hypot(v.tx - v.ox, v.tz - v.oz) * 0.35 + 1.2;
      if (v.mesh) v.mesh.position.set(v.ox + (v.tx - v.ox) * s, v.oy * (1 - s) + 4 * alt * s * (1 - s), v.oz + (v.tz - v.oz) * s);
      if (s >= 1) { v.mesh?.removeFromParent(); vuelos.splice(i, 1); v.impactar(v.tx, v.tz); }
    }
  }
  sis.actualizarVuelos = actualizarVuelos;
  sis.vuelos = vuelos;

  function refrescarObjetivos() {
    let n = 0;
    const j = juego.jugadores;
    for (let pasada = 0; pasada < 2 && n === 0; pasada++) {
      for (let i = 0; i < j.length; i++) {
        const p = j[i];
        if (!p || p.vivo === false || p.invisible) continue;
        if (pasada === 0 && p.caido) continue;
        const ent = p.vehiculo && p.vehiculo.vivo !== false && p.vehiculo.pos ? p.vehiculo : p;
        let dup = false;
        for (let k = 0; k < n; k++) if (reg[k].ent === ent) { dup = true; break; }
        if (dup) continue;
        if (n >= reg.length) break;
        const r = reg[n++];
        r.ent = ent; r.jugador = p; r.pos = ent.pos; r.x = ent.pos.x; r.z = ent.pos.z;
        r.radio = ent.radio ?? ent.cuerpo?.radio ?? 0.5; r.esVehiculo = ent !== p;
      }
    }
    sis.nObjetivos = n;
    objNav.length = n;
    for (let i = 0; i < n; i++) {
      let o = objNav[i]; if (!o) o = objNav[i] = { x: 0, z: 0 };
      o.x = reg[i].x; o.z = reg[i].z;
    }
    nav.objetivos('jugadores', objNav);
  }

  function refrescarSenuelos(ahora) {
    for (let i = senuelos.length - 1; i >= 0; i--) if (senuelos[i].hasta <= ahora) senuelos.splice(i, 1);
    objSenuelos.length = senuelos.length;
    for (let i = 0; i < senuelos.length; i++) objSenuelos[i] = senuelos[i];
    nav.objetivos('senuelos', objSenuelos);
  }

  // ───────────── API pública ─────────────

  function generar(claseId, x, z, opciones = {}) {
    const def = ZOMBIS[claseId];
    if (!def) return null;
    const eraIdx = opciones.eraIdx ?? juego.estado?.eraIdx ?? 0;
    const elite = !!opciones.elite;
    const semilla = opciones.semilla ?? Math.floor(juego.rng() * 1e9);
    const radio = def.radio * (elite ? 1.08 : 1);
    if (!fisica.libre(x, z, radio)) {
      const p = nav.puntoLibre(x, z, nav.capaDeRadio(radio), { x: 0, z: 0 });
      x = p.x; z = p.z;
    }
    const visual = juego.personajes?.crearZombi?.(claseId, eraIdx, { semilla, elite }) || null;
    const zombi = new Zombi(sis, def, { x, z, elite, semilla, visual, vida: opciones.vida });
    const t = sis.jugadorMasCercano(x, z);
    zombi.rot = t ? Math.atan2(t.x - x, t.z - z) : (zombi.rng() * 6.283);
    zombi.colocar(x, z);
    if (opciones.emerger !== false) {
      zombi.tEmerge = 1.0; zombi.tInvul = 1.0;
      zombi.visual.accion('emerger', { duracion: 1.1 });
      sis.fxEmitir('aparicion', x, 0, z, { escala: 0.7 + radio });
    }
    zombi.visual.colocar(x, z, zombi.rot);
    juego.zombis.push(zombi);
    juego.eventos.emitir('zombi:aparece', { zombi });
    return zombi;
  }

  function generarJefe(jefeId, x, z) {
    const jd = JEFES[jefeId];
    if (!jd) return null;
    const def = {
      ...jd, nombre: jd.nombre, comportamiento: 'jefe', cadenciaAtaque: 0.5, alcance: jd.radio + 1.5,
      danioEstructuras: 4, blindajeFrontal: false,
    };
    const visual = juego.personajes?.crearJefe?.(jefeId) || null;
    const p = nav.puntoLibre(x, z, nav.capaDeRadio(def.radio), { x: 0, z: 0 });
    const jefe = new Zombi(sis, def, { x: p.x, z: p.z, esJefe: true, visual });
    jefe.jefeId = jefeId;
    const t = sis.jugadorMasCercano(p.x, p.z);
    jefe.rot = t ? Math.atan2(t.x - p.x, t.z - p.z) : 0;
    jefe.colocar(p.x, p.z);
    jefe.tEmerge = 1.6; jefe.tInvul = 1.6;
    jefe.visual.accion('emerger', { duracion: 1.8 });
    sis.fxEmitir('aparicion', p.x, 0, p.z, { escala: 2.5 });
    jefe.visual.colocar(p.x, p.z, jefe.rot);
    juego.zombis.push(jefe);
    juego.eventos.emitir('zombi:aparece', { zombi: jefe });
    juego.eventos.emitir('jefe:aparece', { jefe });
    juego.eventos.emitir('mensaje', { texto: `${def.nombre.toUpperCase()} — ${def.titulo}`, tipo: 'jefe', duracion: 4 });
    juego.render?.sacudir?.(0.7, 0.8);
    return jefe;
  }

  function atraer(x, z, radio, duracion) {
    const ahora = sis.ahora || juego.tiempo.ahora;
    senuelos.push({ x, z, radio, hasta: ahora + duracion });
    for (const zb of juego.zombis) {
      if (!zb.vivo || zb.esJefe) continue;
      const d = Math.hypot(zb.pos.x - x, zb.pos.z - z);
      if (d <= radio) { zb.atraidoHasta = ahora + duracion; zb.atraidoX = x; zb.atraidoZ = z; }
    }
  }

  function limpiar() {
    for (const z of juego.zombis.slice()) z.liberar();
    juego.zombis.length = 0; lote.length = 0;
    for (const n of nubes) n.zona?.quitar?.();
    nubes.length = 0; senuelos.length = 0;
    for (const v of vuelos) v.mesh?.removeFromParent();
    vuelos.length = 0;
    for (const d of drones.slice()) d.liberar();
    drones.length = 0;
    tel.limpiar();
    nav.limpiar();
  }

  const apagar = [];
  const api = {
    generar, generarJefe, atraer, limpiar, navegacion: nav, sis, telegrafos: tel,
    get lista() { return juego.zombis; },

    iniciar() {
      apagar.push(juego.eventos.en('escenario:cargado', () => { nav.reconstruir(); }));
      apagar.push(juego.eventos.en('estructura:creada', () => nav.reconstruirSuave()));
      apagar.push(juego.eventos.en('estructura:destruida', () => nav.reconstruirSuave()));
      apagar.push(juego.eventos.en('explosion', (e) => sis.alExplosion?.(e)));
      apagar.push(juego.eventos.en('ui:menu', () => limpiar()));
    },

    actualizar(dt) {
      const ahora = juego.tiempo.ahora;
      sis.ahora = ahora; sis.dia = juego.estado?.dia || 1;
      prepararHash();
      nav.actualizar(dt);
      refrescarObjetivos();
      refrescarSenuelos(ahora);
      const src = juego.zombis, n = src.length;
      lote.length = n;
      for (let i = 0; i < n; i++) lote[i] = src[i];
      reconstruirHash(lote, n);
      // LOD: distancia al jugador más cercano
      const nObj = sis.nObjetivos;
      for (let i = 0; i < n; i++) {
        const z = lote[i];
        if (!z.vivo) continue;
        let md = 1e18;
        const x = z.cuerpo.x, zz = z.cuerpo.z;
        for (let k = 0; k < nObj; k++) { const r = reg[k], dx = r.x - x, dz = r.z - zz, d2 = dx * dx + dz * dz; if (d2 < md) md = d2; }
        z.lod = z.esJefe || md < 18 * 18 ? 0 : md < 32 * 32 ? 1 : md < 55 * 55 ? 2 : 3;
        z.preparar();
        z.actualizar(dt);
      }
      // nubes inflamables y drones
      if (nubes.length) sis.actualizarNubes?.(dt);
      if (vuelos.length) actualizarVuelos(dt);
      for (let i = drones.length - 1; i >= 0; i--) drones[i].actualizar(dt);
      tel.actualizar(dt);
    },

    posFisica(dt) {
      const l = juego.zombis;
      for (let i = 0; i < l.length; i++) l[i].posFisica(dt);
      for (let i = 0; i < drones.length; i++) drones[i].posFisica?.(dt);
    },

    /** Para pruebas y depuración. */
    depurar() { return { objetivos: sis.nObjetivos, senuelos: senuelos.length, nubes: nubes.length, drones: drones.length }; },
  };
  void apagar;
  // utilidades que usa clases.js a través de sis
  sis.generar = generar;
  sis.api = api;
  return api;
}
