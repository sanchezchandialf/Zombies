// Sistemas y entidades FALSOS para probar zombis/IA de forma aislada (Node y navegador). No forman parte del juego.
// · crearCombateFalso: aplicarDanio (fuego amigo como el real), explotar radial, zonas con dps, proyectiles en parábola.
// · crearJugadorFalso / crearEstructuraFalsa: Dañables sencillos con cuerpo físico.
// · laberinto / pasillos: obstáculos estáticos para la navegación.
import * as THREE from 'three';
import { CAPA } from '../src/nucleo/fisica.js';

export function crearCombateFalso(juego) {
  const zonas = [];
  const proyectiles = [];
  const reg = { explosiones: [], zonas: [], danio: [], proyectiles: [] };
  const factor = (a, b, area) => {
    if (a === 'jugadores' && b === 'jugadores') return area ? 0.35 : 0;
    if (a === 'zombis' && b === 'zombis') return area ? 1 : 0;
    return 1;
  };
  const api = {
    zonas, reg,
    aplicarDanio(obj, info) {
      if (!obj || obj.vivo === false || !obj.recibirDanio) return 0;
      const f = factor(info.atacante?.bando ?? info.bando ?? 'neutral', obj.bando ?? 'neutral', !!info.area);
      if (f <= 0) return 0;
      const real = obj.recibirDanio({ ...info, cantidad: info.cantidad * f });
      reg.danio.push({ obj, tipo: info.tipo, cantidad: real, atacante: info.atacante });
      return real;
    },
    explotar(o) {
      reg.explosiones.push(o);
      const todos = [...juego.zombis, ...juego.jugadores, ...(juego.mundo?.estructuras || []), ...(juego.sistemas?.zombis?.sis?.drones || [])];
      for (const e of todos) {
        if (!e || e.vivo === false) continue;
        const d = Math.hypot(e.pos.x - o.x, e.pos.z - o.z) - (e.radio ?? 0.4);
        if (d > o.radio) continue;
        const f = d <= o.radio * 0.25 ? 1 : 1 - 0.8 * ((d - o.radio * 0.25) / (o.radio * 0.75));
        const dx = e.pos.x - o.x, dz = e.pos.z - o.z, l = Math.hypot(dx, dz) || 1;
        const duro = e.cuerpo && (e.cuerpo.capa & (CAPA.ESTRUCTURA | CAPA.VEHICULO));
        api.aplicarDanio(e, { cantidad: o.danio * f * (duro ? (o.danioEstructuras ?? 1) : 1), tipo: o.tipo || 'explosivo', atacante: o.atacante, x: e.pos.x, z: e.pos.z, dirX: dx / l, dirZ: dz / l, empuje: (o.empuje ?? 0) * f, area: true });
      }
      juego.eventos.emitir('explosion', { x: o.x, z: o.z, radio: o.radio, danio: o.danio, tipo: o.tipo || 'explosivo', atacante: o.atacante });
    },
    crearZona(o) {
      const z = { ...o, activo: true, t: 0, quitar() { this.activo = false; } };
      zonas.push(z); reg.zonas.push(z);
      return z;
    },
    proyectil(o) {
      if (api.sinProyectiles) return null;
      const D = o.alcance, T = D / o.velocidad, g = o.gravedad || 20;
      const p = { ...o, t: 0, T, vy: g * T / 2 - o.y / T, activo: true };
      proyectiles.push(p); reg.proyectiles.push(p);
      return p;
    },
    limpiar() { zonas.length = 0; proyectiles.length = 0; },
    actualizar(dt) {
      for (let i = proyectiles.length - 1; i >= 0; i--) {
        const p = proyectiles[i]; p.t += dt;
        if (p.t >= p.T) {
          proyectiles.splice(i, 1);
          const x = p.x + p.dirX * p.alcance, z = p.z + p.dirZ * p.alcance;
          if (p.radioExplosion > 0 && p.danio > 0) api.explotar({ x, z, radio: p.radioExplosion, danio: p.danio, tipo: p.tipo, atacante: p.atacante });
          p.alImpactar?.(x, z);
        }
      }
      for (let i = zonas.length - 1; i >= 0; i--) {
        const zn = zonas[i];
        if (!zn.activo) { zonas.splice(i, 1); continue; }
        zn.t += dt;
        if (zn.t >= zn.duracion) { zn.activo = false; zonas.splice(i, 1); continue; }
        for (const e of [...juego.jugadores, ...juego.zombis, ...(juego.mundo?.estructuras || [])]) {
          if (!e || e.vivo === false) continue;
          const afecta = zn.afecta || 'todos';
          if (afecta === 'jugadores' && e.bando === 'zombis') continue;
          if (afecta === 'zombis' && e.bando !== 'zombis') continue;
          if (Math.hypot(e.pos.x - zn.x, e.pos.z - zn.z) <= zn.radio + (e.radio ?? 0.4))
            api.aplicarDanio(e, { cantidad: (zn.dps || 0) * dt, tipo: zn.tipo === 'gas' ? 'veneno' : zn.tipo, atacante: zn.atacante, area: true, continuo: true, x: e.pos.x, z: e.pos.z, dirX: 0, dirZ: 0 });
        }
      }
    },
  };
  return api;
}

export class JugadorFalso {
  constructor(juego, x, z, o = {}) {
    this.juego = juego;
    this.bando = 'jugadores'; this.vivo = true; this.material = 'carne'; this.radio = 0.4;
    this.pos = new THREE.Vector3(x, 0, z);
    this.vidaMax = o.vida ?? 100000; this.vida = this.vidaMax;
    this.rol = { id: o.rol || 'soldado', nombre: o.rol || 'soldado' };
    this.invisible = false; this.caido = false; this.silenciado = 0; this.vehiculo = null;
    this.recibido = {}; this.golpes = 0; this.ultimoImpulso = 0;
    this.cuerpo = juego.fisica.crearCuerpo({ forma: 'circulo', x, z, radio: 0.4, masa: 80, capa: CAPA.JUGADOR, datos: this, amortiguacion: 6 });
    this.meta = o.meta || null;       // {x,z}: lo mueve hacia allí a 5 m/s
    this.vel = o.vel ?? 5;
    juego.jugadores.push(this);
  }
  recibirDanio(info) {
    if (!this.vivo) return 0;
    this.recibido[info.tipo] = (this.recibido[info.tipo] || 0) + info.cantidad;
    this.recibido.total = (this.recibido.total || 0) + info.cantidad;
    if (info.tipo === 'golpe') this.golpes++;
    this.vida -= info.cantidad;
    if (info.empuje > 0 && info.dirX !== undefined) {
      this.cuerpo.vx += info.dirX * info.empuje * 70 / 80; this.cuerpo.vz += (info.dirZ ?? 0) * info.empuje * 70 / 80;
      this.ultimoImpulso = info.empuje;
    }
    if (this.vida <= 0) { this.vivo = false; this.juego.fisica.eliminarCuerpo(this.cuerpo); }
    return info.cantidad;
  }
  aplicarEstado() {}
  actualizar(dt) {
    if (!this.vivo) return;
    if (this.silenciado > 0) this.silenciado -= dt;
    if (this.meta) {
      const dx = this.meta.x - this.cuerpo.x, dz = this.meta.z - this.cuerpo.z, d = Math.hypot(dx, dz);
      if (d > 0.2) { this.cuerpo.vx = dx / d * this.vel; this.cuerpo.vz = dz / d * this.vel; } else { this.cuerpo.vx = 0; this.cuerpo.vz = 0; }
    }
  }
  posFisica() { this.pos.x = this.cuerpo.x; this.pos.z = this.cuerpo.z; }
}

export class EstructuraFalsa {
  constructor(juego, x, z, o = {}) {
    this.juego = juego;
    this.bando = 'jugadores'; this.vivo = true; this.material = 'madera';
    this.pos = new THREE.Vector3(x, 0, z);
    this.hx = o.hx ?? 1.2; this.hz = o.hz ?? 0.3; this.radio = Math.max(this.hx, this.hz);
    this.vida = o.vida ?? 400; this.vidaMax = this.vida; this.recibido = 0;
    this.cuerpo = juego.fisica.cajaEstatica(x, z, this.hx, this.hz, o.rot || 0, { capa: CAPA.ESTRUCTURA, datos: this });
    (juego.mundo ||= { estructuras: [] }).estructuras.push(this);
  }
  recibirDanio(info) {
    if (!this.vivo) return 0;
    this.recibido += info.cantidad; this.vida -= info.cantidad;
    if (this.vida <= 0) {
      this.vivo = false; this.juego.fisica.eliminarCuerpo(this.cuerpo);
      const l = this.juego.mundo.estructuras, i = l.indexOf(this); if (i >= 0) l.splice(i, 1);
      this.juego.eventos.emitir('estructura:destruida', { estructura: this });
    }
    return info.cantidad;
  }
}

/** Cajas estáticas: laberinto serpenteante (filas de muros con hueco alternado). */
export function laberinto(juego, { ancho = 80, filas = 6, hueco = 3.2, grosor = 1, margen = 4 } = {}) {
  const f = juego.fisica, m = ancho / 2;
  f.limites = { minX: -m, maxX: m, minZ: -m, maxZ: m };
  const sep = (ancho - margen * 2) / (filas + 1);
  const cajas = [];
  for (let i = 1; i <= filas; i++) {
    const z = -m + margen + i * sep, izq = i % 2 === 0;
    const x0 = izq ? -m : -m + hueco + 2, x1 = izq ? m - hueco - 2 : m;
    const cx = (x0 + x1) / 2, hx = (x1 - x0) / 2;
    cajas.push(f.cajaEstatica(cx, z, hx, grosor / 2));
  }
  return cajas;
}

/** Pilares dispersos (obstáculos de una plaza). */
export function pilares(juego, n, semilla = 3) {
  const out = [];
  let s = semilla;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const m = juego.fisica.limites.maxX - 6;
  for (let i = 0; i < n; i++) out.push(juego.fisica.circuloEstatico((r() - 0.5) * 2 * m, (r() - 0.5) * 2 * m, 0.8 + r() * 1.4));
  return out;
}
