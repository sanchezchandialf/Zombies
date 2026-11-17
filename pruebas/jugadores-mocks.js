// Sistemas provisionales SOLO para la página de pruebas de jugadores (combate, mundo y zombis de pega).
// Si los módulos reales están listos, la página los usa con ?real=1.
import * as THREE from 'three';
import { ARMAS } from '../src/datos/armas.js';
import { CAPA, MASCARA_BALA } from '../src/nucleo/fisica.js';
import { dirDeRot } from '../src/nucleo/util.js';

const matVerde = new THREE.MeshStandardMaterial({ color: 0x6f8a5a, roughness: 0.9 });
const geoZ = new THREE.CapsuleGeometry(0.4, 0.9, 4, 10);

export function mockCombate(juego) {
  const pendientes = [], zonas = [];
  const api = {
    zonas, ultimoDisparo: null, golpes: 0, lanzadas: 0,
    crearArma(id, p) {
      const def = ARMAS[id];
      const m = p?.mods?.reserva ?? 1;
      return { def, id, municion: def.cargador, reserva: def.reserva < 0 ? Infinity : Math.ceil(def.reserva * def.cargador * m), recargando: false, progresoRecarga: 0, enfriamiento: 0, calor: 0, _t: 0 };
    },
    actualizarArma(inst, dt, p) {
      if (!inst) return;
      inst.enfriamiento = Math.max(0, inst.enfriamiento - dt);
      if (inst.recargando) {
        inst._t += dt; const dur = inst.def.recarga * (p?.mods?.recarga ?? 1);
        inst.progresoRecarga = Math.min(1, inst._t / dur);
        if (inst._t >= dur) {
          const falta = inst.def.cargador - inst.municion, n = Math.min(falta, inst.reserva);
          inst.municion += n; if (inst.reserva !== Infinity) inst.reserva -= n;
          inst.recargando = false; inst.progresoRecarga = 0;
        }
      }
    },
    gatillo(p, inst, origen, rot, apretado, reciente) {
      const def = inst.def;
      if (!apretado || inst.recargando || inst.enfriamiento > 0) return false;
      if (!def.auto && !reciente) return false;
      if (inst.municion <= 0) return false;
      if (!p.mods.municionInfinita) inst.municion--;
      inst.enfriamiento = 1 / (def.cadencia * (p.mods.cadencia ?? 1));
      const n = def.perdigones ?? 1;
      const lleva = p.proximoDisparo; p.proximoDisparo = null;
      const crit = !!lleva?.critico || juego.rng() < (p.mods.critico ?? 0), mult = lleva?.multiplicador ?? 1;
      for (let k = 0; k < n; k++) {
        const r = rot + (juego.rng() - 0.5) * (def.dispersion ?? 0) * (Math.PI / 180) * (p.mods.dispersion ?? 1);
        const d = dirDeRot(r);
        const h = juego.fisica.rayo(origen.x, origen.z, d.x, d.z, def.alcance ?? 30, MASCARA_BALA, (c) => c.datos !== p && c.datos?.bando !== 'jugadores');
        const fin = h ? { x: h.x, y: 1.1, z: h.z } : { x: origen.x + d.x * (def.alcance ?? 30), y: 1.1, z: origen.z + d.z * (def.alcance ?? 30) };
        juego.fx?.trazadora?.(origen, fin, { tipo: def.trazadora });
        if (h?.cuerpo?.datos?.recibirDanio) api.aplicarDanio(h.cuerpo.datos, { cantidad: def.danio * (p.mods.danio ?? 1) * mult * (crit ? 2 : 1), tipo: def.tipo, atacante: p, arma: def, x: h.x, z: h.z, dirX: d.x, dirZ: d.z, empuje: def.empuje, critico: crit });
      }
      api.ultimoOrigen = { x: origen.x, z: origen.z };
      api.ultimoDisparo = { crit, mult, rot, cuadro: juego.tiempo.cuadro, danioMod: p.mods.danio };
      juego.eventos.emitir('arma:disparo', { portador: p, arma: def, origen, rot });
      return true;
    },
    recargar(inst, p) {
      if (inst.recargando || inst.municion >= inst.def.cargador || inst.reserva <= 0) return false;
      inst.recargando = true; inst._t = 0; juego.eventos.emitir('arma:recarga', { portador: p, arma: inst.def, duracion: inst.def.recarga });
      return true;
    },
    golpear(p, id, origen, rot) {
      const def = ARMAS[id]; api.golpes++;
      let n = 0;
      for (const z of juego.zombis) {
        if (!z.vivo) continue;
        const dx = z.pos.x - origen.x, dz = z.pos.z - origen.z, d = Math.hypot(dx, dz);
        if (d > def.alcance + 0.5) continue;
        const a = Math.abs(Math.atan2(dx, dz) - rot); const da = Math.min(a, Math.PI * 2 - a);
        if (da > (def.arco * Math.PI / 360)) continue;
        api.aplicarDanio(z, { cantidad: def.danio * (p.mods.cuerpo ?? 1), tipo: 'golpe', atacante: p, x: z.pos.x, z: z.pos.z, dirX: dx / (d || 1), dirZ: dz / (d || 1), empuje: def.empuje });
        n++;
      }
      return n > 0;
    },
    lanzar(p, id, origen, destino) { api.lanzadas++; pendientes.push({ t: ARMAS[id].mecha ?? 1.5, x: destino.x, z: destino.z, def: ARMAS[id], p }); },
    aplicarDanio(o, info) {
      const r = o.recibirDanio ? o.recibirDanio(info) : 0;
      if (r > 0) juego.eventos.emitir('danio', { objetivo: o, cantidad: r, tipo: info.tipo, critico: info.critico, atacante: info.atacante, x: info.x, z: info.z });
      return r;
    },
    explotar() {},
    crearZona(o) { const z = { ...o, activo: true, resta: o.duracion, quitar() { z.activo = false; } }; zonas.push(z); return z; },
    proyectil() { return null; },
    limpiar() { pendientes.length = 0; zonas.length = 0; },
    actualizar(dt) {
      for (let i = pendientes.length - 1; i >= 0; i--) {
        const g = pendientes[i]; g.t -= dt;
        if (g.t > 0) continue;
        pendientes.splice(i, 1);
        juego.fx?.emitir?.('explosion', { x: g.x, y: 0.5, z: g.z }, { escala: 1 });
        for (const z of juego.zombis) if (z.vivo && Math.hypot(z.pos.x - g.x, z.pos.z - g.z) < g.def.radio) api.aplicarDanio(z, { cantidad: g.def.danio, tipo: 'explosivo', atacante: g.p, x: z.pos.x, z: z.pos.z, dirX: 0, dirZ: 1 });
      }
      for (let i = zonas.length - 1; i >= 0; i--) {
        const z = zonas[i]; z.resta -= dt;
        if (z.resta <= 0 || !z.activo) { zonas.splice(i, 1); continue; }
        if (z.tipo === 'curacion') {
          for (const j of juego.jugadores) if (j.vivo && Math.hypot(j.pos.x - z.x, j.pos.z - z.z) < z.radio) j.curar(z.dps * dt, true);
          for (const q of juego.zombis) if (q.vivo && Math.hypot(q.pos.x - z.x, q.pos.z - z.z) < z.radio) api.aplicarDanio(q, { cantidad: (z.dpsEnemigos ?? z.dps) * dt, tipo: 'fuego', atacante: z.atacante, x: q.pos.x, z: q.pos.z, dirX: 0, dirZ: 0 });
        }
      }
    },
  };
  return api;
}

export function mockMundo(juego) {
  const interactivos = [], estructuras = [], objetos = [];
  function estructura(tipo, x, z, vidaMax, radio, color) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, 1.2, 16), new THREE.MeshStandardMaterial({ color }));
    g.position.set(x, 0.6, z); g.castShadow = true; juego.render.escena.add(g);
    const e = {
      tipo, bando: 'jugadores', vivo: true, pos: new THREE.Vector3(x, 0, z), radio, material: 'metal', vida: vidaMax, vidaMax,
      cuerpo: juego.fisica.crearCuerpo({ forma: 'circulo', x, z, radio, masa: 0, capa: CAPA.ESTRUCTURA, datos: null }),
      recibirDanio(i) { this.vida -= i.cantidad; if (this.vida <= 0) this.vivo = false; return i.cantidad; },
      reparar(c) { this.vida = Math.min(this.vidaMax, this.vida + c); }, malla: g,
    };
    e.cuerpo.datos = e; estructuras.push(e); return e;
  }
  const api = {
    interactivos, estructuras, objetos, torretas: 0, barricadas: 0, usos: 0, estructura,
    crear() { return null; },
    registrarInteractivo(o) { interactivos.push(o); return o; },
    quitarInteractivo(o) { const i = interactivos.indexOf(o); if (i >= 0) interactivos.splice(i, 1); },
    interactivoCercano(j) {
      let m = null, md = Infinity;
      for (const o of interactivos) { const d = Math.hypot(o.pos.x - j.pos.x, o.pos.z - j.pos.z); if (d <= (o.radioUso ?? 2) && d < md) { md = d; m = o; } }
      return m;
    },
    soltarBotin() {},
    desplegarTorreta(j) { const d = dirDeRot(j.rot); api.torretas++; return estructura('torreta', j.pos.x + d.x * 2.6, j.pos.z + d.z * 2.6, 200, 0.5, 0x8a8a90); },
    desplegarBarricada(j) { const d = dirDeRot(j.rot); api.barricadas++; return estructura('barricada', j.pos.x + d.x * 2.4, j.pos.z + d.z * 2.4, 120, 0.7, 0x7a5a3a); },
    limpiar() { interactivos.length = 0; for (const e of estructuras) { e.malla.removeFromParent(); juego.fisica.eliminarCuerpo(e.cuerpo); } estructuras.length = 0; },
    actualizar() {}, posFisica() {},
  };
  return api;
}

/** Zombis de pega: persiguen al jugador vivo más cercano y le muerden. */
export function mockZombis(juego) {
  function crear(x, z, vida = 120, vel = 2.4) {
    const malla = new THREE.Mesh(geoZ, matVerde); malla.castShadow = true; juego.render.escena.add(malla);
    const z0 = {
      bando: 'zombis', vivo: true, pos: new THREE.Vector3(x, 0, z), radio: 0.45, material: 'carne', vida, vidaMax: vida, slow: 1, slowT: 0, stunT: 0, atkT: 0, vel, rot: 0,
      cuerpo: juego.fisica.crearCuerpo({ forma: 'circulo', x, z, radio: 0.45, masa: 70, capa: CAPA.ZOMBI, rigidez: 0.6, datos: null, amortiguacion: 6 }),
      recibirDanio(i) {
        if (!this.vivo) return 0; const c = Math.min(this.vida, i.cantidad); this.vida -= i.cantidad; this.ultimoDanio = i;
        if (i.empuje) this.cuerpo.impulso((i.dirX ?? 0) * i.empuje * 4, (i.dirZ ?? 0) * i.empuje * 4);
        if (this.vida <= 0) { this.vivo = false; juego.eventos.emitir('zombi:muerte', { zombi: this, info: i, atacante: i.atacante }); juego.fisica.eliminarCuerpo(this.cuerpo); malla.removeFromParent(); }
        return c;
      },
      ralentizar(f, s) { this.slow = f; this.slowT = s; }, aturdir(s) { this.stunT = Math.max(this.stunT, s); }, empujar(ix, iz) { this.cuerpo.vx += ix; this.cuerpo.vz += iz; },
      malla,
    };
    z0.cuerpo.datos = z0; juego.zombis.push(z0); return z0;
  }
  return {
    crear, pasivos: false,
    limpiar() { for (const z of juego.zombis) { z.malla.removeFromParent(); juego.fisica.eliminarCuerpo(z.cuerpo); z.vivo = false; } juego.zombis.length = 0; },
    actualizar(dt) {
      for (let i = juego.zombis.length - 1; i >= 0; i--) {
        const z = juego.zombis[i]; if (!z.vivo) { juego.zombis.splice(i, 1); continue; }
        z.slowT -= dt; if (z.slowT <= 0) z.slow = 1; z.stunT -= dt; z.atkT -= dt;
        let m = null, md = Infinity;
        for (const j of juego.jugadores) { if (!j.vivo || j.invisible) continue; const d = Math.hypot(j.pos.x - z.pos.x, j.pos.z - z.pos.z); if (d < md) { md = d; m = j; } }
        if (!m || z.stunT > 0 || this.pasivos) continue;
        const dx = m.pos.x - z.pos.x, dz = m.pos.z - z.pos.z; z.rot = Math.atan2(dx, dz);
        if (md > 1.0) { const v = z.vel * z.slow; z.cuerpo.vx += (dx / md) * v * dt * 8; z.cuerpo.vz += (dz / md) * v * dt * 8; }
        else if (z.atkT <= 0) { z.atkT = 0.9; juego.combate.aplicarDanio(m, { cantidad: 9, tipo: 'golpe', atacante: z, x: z.pos.x, z: z.pos.z, dirX: dx / md, dirZ: dz / md, empuje: 3 }); }
      }
    },
    posFisica() { for (const z of juego.zombis) { z.pos.x = z.cuerpo.x; z.pos.z = z.cuerpo.z; z.malla.position.set(z.pos.x, 0.85, z.pos.z); z.malla.rotation.y = z.rot; } },
  };
}
