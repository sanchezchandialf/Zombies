// Zonas de efecto en el suelo: fuego, gas (veneno, inflamable), ácido, curación y gravedad. Tics fijos de 0,25 s.
import { CAPA } from '../nucleo/fisica.js';
import { entidadDe, radioDe, posDe, TIC_ZONA } from './util.js';

const _p = { x: 0, z: 0 };
const MASCARA = CAPA.JUGADOR | CAPA.ZOMBI | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;
const COLORES = { fuego: 0xff8a2a, gas: 0x9bd64a, acido: 0x9dff3a, curacion: 0x62e0a1, gravedad: 0xb070ff };
/** Máximo de zonas de fuego simultáneas del mismo atacante antes de fusionar (evita acumular cientos con el lanzallamas). */
const MAX_FUEGO = 40;

export function instalarZonas(c) {
  const { juego, visuales } = c;
  const fisica = juego.fisica;
  const zonas = c.zonas = [];

  function afectado(afecta, ent) {
    if (afecta === 'todos') return true;
    if (afecta === 'zombis') return ent.bando === 'zombis';
    return ent.bando !== 'zombis'; // 'jugadores': el bando de los jugadores y lo neutral (vehículos, props)
  }

  /**
   * crearZona({ x, z, radio, duracion, tipo, dps, atacante, afecta, dpsEnemigos?, alTerminar? }) → zona
   * `afecta` por defecto: lo contrario del bando del atacante ('todos' si no hay atacante).
   * Curación: `dps` = vida/s a quien afecta; `dpsEnemigos` = daño/s de fuego a los zombis dentro (suero de la Médica).
   */
  c.crearZona = function crearZona(o) {
    const tipo = o.tipo ?? 'fuego';
    const bando = o.atacante?.bando;
    const afecta = o.afecta ?? (tipo === 'curacion' ? 'jugadores' : bando === 'jugadores' ? 'zombis' : bando === 'zombis' ? 'jugadores' : 'todos');
    // Fusiona fuego solapado del mismo atacante: alarga la existente en vez de apilar otra
    if (tipo === 'fuego' && !o.sinFusion) {
      let fuegos = 0, cerca = null;
      for (const z of zonas) if (z.activo && z.tipo === 'fuego') { fuegos++; if (z.atacante === o.atacante && Math.hypot(z.x - o.x, z.z - o.z) < Math.min(z.radio, o.radio) * 0.7) cerca = z; }
      if (cerca || fuegos >= MAX_FUEGO) {
        const z = cerca ?? zonas.find((q) => q.activo && q.tipo === 'fuego');
        z.duracion = Math.max(z.duracion, z.tiempo + (o.duracion ?? 4)); z.dps = Math.max(z.dps, o.dps ?? 0);
        return z;
      }
    }
    const z = {
      x: o.x, z: o.z, radio: o.radio ?? 3, duracion: o.duracion ?? 5, tiempo: 0, tipo, dps: o.dps ?? 0,
      dpsEnemigos: o.dpsEnemigos ?? 0, atacante: o.atacante ?? null, afecta, activo: true, alTerminar: o.alTerminar ?? null,
      tic: 0, emisores: [], luz: null, disco: null, _fxT: 0, inflamada: false, intensidad: o.intensidad ?? 1,
      quitar() { terminar(z, false); },
    };
    const color = COLORES[tipo] ?? 0xffffff;
    z.disco = visuales.disco(tipo, z.radio, o.color ?? color);
    const fx = juego.fx;
    const pos = { x: z.x, y: 0.15, z: z.z };
    const emisor = { fuego: 'fuego', gas: 'gas_toxico', acido: 'acido' }[tipo];
    if (emisor && fx?.crearEmisor) {
      const n = z.radio < 1.4 ? 1 : Math.min(7, Math.ceil(z.radio * 1.3));
      for (let i = 0; i < n; i++) {
        const a = juego.rng() * 6.283, r = i === 0 ? 0 : z.radio * (0.35 + 0.45 * juego.rng());
        const e = fx.crearEmisor(emisor, { x: z.x + Math.cos(a) * r, y: 0.1, z: z.z + Math.sin(a) * r }, { escala: Math.max(0.6, z.radio * (n === 1 ? 0.9 : 0.45)) });
        if (e) z.emisores.push(e);
      }
    }
    if (tipo === 'fuego') {
      fx?.calco?.('quemadura', z.x, z.z, z.radio * 1.7);
      if (z.radio >= 1.2) z.luz = juego.render?.luzPuntual?.({ x: z.x, y: 1.2, z: z.z, color: 0xff7a22, intensidad: 5, distancia: Math.max(6, z.radio * 3) }) ?? null;
    } else if (tipo === 'acido') {
      fx?.calco?.('acido', z.x, z.z, z.radio * 1.5);
    } else if (tipo === 'gravedad') {
      fx?.emitir?.('singularidad', pos, { escala: z.radio / 5 });
      z.luz = juego.render?.luzPuntual?.({ x: z.x, y: 1, z: z.z, color: 0xa05cff, intensidad: 6, distancia: z.radio * 2.5 }) ?? null;
    }
    zonas.push(z);
    juego.eventos.emitir('zona:crear', { zona: z });
    return z;
  };

  function terminar(z, natural) {
    if (!z.activo) return;
    z.activo = false;
    for (const e of z.emisores) e?.detener?.();
    z.emisores.length = 0;
    z.luz?.quitar?.(); z.luz = null;
    z.disco?.quitar(); z.disco = null;
    const i = zonas.indexOf(z); if (i >= 0) zonas.splice(i, 1);
    if (natural) {
      if (z.tipo === 'fuego') juego.fx?.emitir?.('humo', { x: z.x, y: 0.4, z: z.z }, { escala: Math.max(0.6, z.radio * 0.5), cantidad: 4 });
      z.alTerminar?.(z);
    }
  }

  /** Detona las nubes de gas dentro del círculo (el fuego, las explosiones y las llamas las inflaman). */
  c.inflamarGas = function inflamarGas(x, z, r, tipo = 'fuego') {
    if (tipo !== 'fuego' && tipo !== 'explosivo' && tipo !== 'energia') return;
    for (const g of zonas) {
      if (g.tipo === 'gas' && g.activo && !g.inflamada && Math.hypot(g.x - x, g.z - z) <= r + g.radio * 0.6) g.inflamada = true;
    }
  };

  function detonarGas(g) {
    g.inflamada = true;
    const radio = Math.max(2.5, g.radio * 0.85);
    const danio = Math.min(420, Math.max(90, (g.dps || 8) * 16));
    const atacante = g.atacante;
    terminar(g, false);
    c.explotar({ x: g.x, z: g.z, radio, danio, tipo: 'fuego', atacante, empuje: 6, y: 0.8, quemadura: { duracion: 3, dps: 25 } });
    c.crearZona({ x: g.x, z: g.z, radio: radio * 0.6, duracion: 2.5, tipo: 'fuego', dps: 30, atacante, afecta: g.afecta });
  }

  function tic(z) {
    const x = z.x, zz = z.z, r = z.radio;
    const cuerpos = fisica.enCirculo(x, zz, r, MASCARA, []);
    const vistos = new Set();
    for (const cuerpo of cuerpos) {
      const ent = entidadDe(cuerpo);
      if (!ent || vistos.has(ent) || ent.vivo === false) continue;
      vistos.add(ent);
      posDe(ent, _p);
      if (Math.hypot(_p.x - x, _p.z - zz) > r + Math.min(radioDe(ent), 0.5) * 0.4) continue;
      if (z.tipo === 'curacion') {
        if (afectado(z.afecta, ent)) {
          if (ent.curar) ent.curar(z.dps * TIC_ZONA); else ent.reparar?.(z.dps * TIC_ZONA * 0.5);
        } else if (z.dpsEnemigos > 0 && ent.bando === 'zombis') {
          c.aplicarDanio(ent, { cantidad: z.dpsEnemigos * TIC_ZONA, tipo: 'fuego', atacante: z.atacante, x: _p.x, z: _p.z, area: true, continuo: true, sinMods: true });
        }
        continue;
      }
      if (z.tipo === 'gravedad') {
        if (z.dps > 0 && afectado(z.afecta, ent)) c.aplicarDanio(ent, { cantidad: z.dps * TIC_ZONA, tipo: 'energia', atacante: z.atacante, x: _p.x, z: _p.z, area: true, continuo: true });
        continue;
      }
      if (!afectado(z.afecta, ent) || z.dps <= 0) continue;
      const tipoDanio = z.tipo === 'gas' ? 'veneno' : z.tipo === 'acido' ? 'acido' : 'fuego';
      const info = { cantidad: z.dps * TIC_ZONA, tipo: tipoDanio, atacante: z.atacante, x: _p.x, z: _p.z, area: true, continuo: true };
      if (z.tipo === 'fuego') info.quemadura = { duracion: 1.6, dps: z.dps * 0.5 };
      c.aplicarDanio(ent, info);
      if (z.tipo === 'gas') ent.aplicarEstado?.('envenenado', 1.2, { dps: z.dps });
      else if (z.tipo === 'acido') ent.aplicarEstado?.('corroido', 1.0);
    }
  }

  function gravedad(z, dt) {
    const cuerpos = fisica.enCirculo(z.x, z.z, z.radio, MASCARA, []);
    const fase = Math.min(1, z.tiempo / Math.max(0.01, z.duracion));
    for (const cuerpo of cuerpos) {
      if (cuerpo.sensor || cuerpo.estatico) continue;
      const ent = cuerpo.datos;
      if (ent?.bando === 'jugadores' && z.afecta !== 'todos') continue;
      const dx = z.x - cuerpo.x, dz = z.z - cuerpo.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { cuerpo.vx *= 0.4; cuerpo.vz *= 0.4; continue; }
      // Velocidad de arrastre (m/s): crece hacia el centro y con el tiempo. Los zombis reescriben su velocidad
      // cada cuadro (se suma el arrastre completo); los objetos sueltos la conservan (se acumula).
      const v = (3.5 + 7 * fase) * (0.4 + 0.6 * (1 - Math.min(1, d / z.radio))) * z.intensidad;
      const dueno = (cuerpo.capa & (CAPA.ZOMBI | CAPA.JUGADOR)) !== 0;
      const s = dueno ? Math.min(v, d / Math.max(dt, 1e-3) * 0.8) : Math.min(v * 3 * dt, d / Math.max(dt, 1e-3) * 0.5);
      cuerpo.vx += (dx / d) * s; cuerpo.vz += (dz / d) * s;
      if (!dueno) { const f = Math.exp(-2 * dt); cuerpo.vx *= f; cuerpo.vz *= f; }
      ent?.ralentizar?.(0.6, 0.25);
    }
  }

  c._actualizarZonas = function (dt) {
    const ahora = juego.tiempo.ahora;
    for (let i = zonas.length - 1; i >= 0; i--) {
      const z = zonas[i];
      if (!z.activo) continue;
      z.tiempo += dt;
      const resta = z.duracion - z.tiempo;
      if (z.inflamada && z.tipo === 'gas') { detonarGas(z); continue; }
      if (z.tipo === 'fuego') c.inflamarGas(z.x, z.z, z.radio, 'fuego');
      z.tic += dt;
      while (z.tic >= TIC_ZONA) { z.tic -= TIC_ZONA; tic(z); }
      if (z.tipo === 'gravedad') gravedad(z, dt);
      // Sensación
      if (z.disco) {
        const ent = Math.min(1, z.tiempo / 0.25), sal = Math.min(1, Math.max(0, resta) / 0.6);
        const parp = z.tipo === 'fuego' ? 0.85 + 0.15 * Math.sin(ahora * 17 + z.x) : 1;
        z.disco.mat.opacity = Math.min(ent, sal) * 0.8 * parp;
        if (z.tipo === 'gravedad') z.disco.obj.rotation.y -= dt * (2 + 4 * (z.tiempo / z.duracion));
        if (z.tipo === 'gas') z.disco.obj.rotation.y += dt * 0.15;
      }
      if (z.luz) z.luz.intensidad = (z.tipo === 'fuego' ? 4.5 + Math.sin(ahora * 21 + z.x * 3) * 1.2 + Math.sin(ahora * 13) : 6) * Math.min(1, resta / 0.8);
      z._fxT -= dt;
      if (z._fxT <= 0) {
        if (z.tipo === 'curacion') { z._fxT = 0.28; juego.fx?.emitir?.('curacion', { x: z.x + (juego.rng() - 0.5) * z.radio, y: 0.2, z: z.z + (juego.rng() - 0.5) * z.radio }, { escala: 0.8 }); }
        else if (z.tipo === 'gravedad') { z._fxT = 0.25; juego.fx?.emitir?.('singularidad', { x: z.x, y: 0.8, z: z.z }, { escala: z.radio / 6 }); }
        else z._fxT = 1;
      }
      if (resta <= 0) terminar(z, true);
    }
  };

  c._limpiarZonas = function () {
    for (const z of zonas.slice()) terminar(z, false);
    zonas.length = 0;
  };
}
