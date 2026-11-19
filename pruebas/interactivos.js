// Exposición de los interactivos de era (src/mundo/interactivos/).
//   ?tipo=campana_iglesia  (un tipo) · ?era=1 (los tres de esa era) · ?hora=0.75 · ?zombis=8
//   window.activar('palanca_tren')  → usa el interactivo (con el jugador falso)     window.avanzar(seg, paso=1/30)
//   window.mirar(x,y,z,tx,ty,tz)    window.plano(tipo, dist=7, alto=4)    window.vistaJuego(tipo)    window.estado()
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearCombate } from '../src/combate/index.js';
import { CAPA } from '../src/nucleo/fisica.js';
import { ERAS } from '../src/datos/eras.js';
import { fabricas } from '../src/mundo/registro.js';

window.__err = [];
addEventListener('error', (e) => window.__err.push(String(e.message)));
const _ce = console.error; console.error = (...a) => { window.__err.push(a.map(String).join(' ').slice(0, 300)); _ce(...a); };
const q = new URLSearchParams(location.search);
const tipoPedido = q.get('tipo');
const eraPedida = q.get('era') !== null ? +q.get('era') : null;
const eraDeTipo = (t) => Math.max(0, ERAS.findIndex((e) => e.interactivos.includes(t)));
const eraIdx = tipoPedido ? eraDeTipo(tipoPedido) : (eraPedida ?? 0);
const hora = q.get('hora') !== null ? +q.get('hora') : 0.5;

const a = await crearArnes({ eraIdx, hora, camara: { dist: 9, alto: 5, objetivo: [0, 1.2, 0] }, sistemas: { combate: crearCombate } });
const juego = a.juego, escena = juego.render.escena, fisica = juego.fisica;
window.juego = juego;
const suelo = escena.getObjectByName('sueloArnes');
if (suelo) { suelo.material.color.set([0x6a5b43, 0x7a5a3c, 0x4c4f3e, 0x3a3d45, 0x6d6f73, 0x2a2c3c][eraIdx]); suelo.material.roughness = 0.9; }

// ───── Zombis falsos (Dañables con cuerpo, aturdir/ralentizar/incendiar/empujar) ─────
const geoCuerpo = new THREE.CapsuleGeometry(0.28, 0.85, 4, 10), geoCab = new THREE.SphereGeometry(0.2, 12, 10);
const matZ = new THREE.MeshStandardMaterial({ color: 0x6f8a5a, roughness: 0.85 }), matCab = new THREE.MeshStandardMaterial({ color: 0x8fa377, roughness: 0.8 });
class ZombiFalso {
  constructor(x, z) {
    this.bando = 'zombis'; this.vivo = true; this.material = 'carne'; this.radio = 0.4; this.esJefe = false;
    this.pos = new THREE.Vector3(x, 0, z); this.vida = this.vidaMax = 100; this.rot = 0;
    this.tAtur = 0; this.tLento = 0; this.fLento = 1; this.tArde = 0; this.objetivo = null; this.dir = { x: 0, z: 0 }; this.recibidos = 0;
    this.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x, z, radio: 0.4, masa: 70, capa: CAPA.ZOMBI, amortiguacion: 4, rigidez: 0.6, datos: this });
    this.g = new THREE.Group();
    const c = new THREE.Mesh(geoCuerpo, matZ); c.position.y = 0.9; c.castShadow = true; this.g.add(c);
    const h = new THREE.Mesh(geoCab, matCab); h.position.y = 1.62; h.castShadow = true; this.g.add(h);
    escena.add(this.g); juego.zombis.push(this);
  }
  recibirDanio(i) { if (!this.vivo) return 0; this.vida -= i.cantidad; this.recibidos += i.cantidad; if (i.empuje) this.empujar((i.dirX || 0) * i.empuje * 70, (i.dirZ || 0) * i.empuje * 70); if (this.vida <= 0) this.morir(); return i.cantidad; }
  morir() { this.vivo = false; this.g.rotation.x = -1.5; this.g.position.y = 0.3; fisica.eliminarCuerpo(this.cuerpo); setTimeout(() => { escena.remove(this.g); }, 2500); }
  aturdir(s) { this.tAtur = Math.max(this.tAtur, s); this.g.children[0].material = matAt; }
  ralentizar(f, s) { this.fLento = f; this.tLento = Math.max(this.tLento, s); }
  incendiar(s) { this.tArde = Math.max(this.tArde, s); }
  empujar(ix, iz) { this.cuerpo.vx += ix / 70; this.cuerpo.vz += iz / 70; }
  actualizar(dt) {
    if (!this.vivo) return;
    this.tAtur = Math.max(0, this.tAtur - dt); this.tLento = Math.max(0, this.tLento - dt); if (this.tLento <= 0) this.fLento = 1;
    if (this.tArde > 0) { this.tArde -= dt; this.vida -= 6 * dt; if (this.vida <= 0) this.morir(); }
    if (this.tAtur <= 0) {
      this.g.children[0].material = matZ;
      const o = zombiAtrae.activo ? zombiAtrae : (window.__camina ? { x: 0, z: 14 } : null);
      if (o) { const dx = o.x - this.pos.x, dz = o.z - this.pos.z, l = Math.hypot(dx, dz); if (l > 1.2) { const v = 1.5 * this.fLento; this.cuerpo.vx += (dx / l * v - this.cuerpo.vx) * Math.min(1, dt * 6); this.cuerpo.vz += (dz / l * v - this.cuerpo.vz) * Math.min(1, dt * 6); this.rot = Math.atan2(dx, dz); } }
    }
  }
  posFisica() { this.pos.x = this.cuerpo.x; this.pos.z = this.cuerpo.z; this.g.position.x = this.pos.x; this.g.position.z = this.pos.z; this.g.rotation.y = this.rot; }
}
const matAt = new THREE.MeshStandardMaterial({ color: 0xa6d6ff, emissive: 0x2255aa, roughness: 0.6 });
const zombiAtrae = { activo: false, x: 0, z: 0, t: 0 };
window.__atraer = [];
// sistema de zombis falso
juego.registrar('zombis', {
  atraer(x, z, r, d) { window.__atraer.push({ x, z, r, d, t: juego.tiempo.ahora }); zombiAtrae.activo = true; zombiAtrae.x = x; zombiAtrae.z = z; zombiAtrae.t = d; },
  navegacion: { reconstruirSuave() { window.__nav = (window.__nav || 0) + 1; }, reconstruir() { window.__nav = (window.__nav || 0) + 1; } },
  actualizar(dt) {
    if (zombiAtrae.activo) { zombiAtrae.t -= dt; if (zombiAtrae.t <= 0) zombiAtrae.activo = false; }
    for (const z of juego.zombis) z.actualizar(dt);
  },
  posFisica() { for (const z of juego.zombis) if (z.vivo) z.posFisica(); },
}, 30);

// ───── Jugador falso ─────
const jug = {
  bando: 'jugadores', vivo: true, caido: false, material: 'carne', radio: 0.4, indice: 0, rot: 0, vida: 100, vidaMax: 100, recibidos: 0, pos: new THREE.Vector3(0, 0, 6), estados: {},
  recibirDanio(i) { this.recibidos += i.cantidad; this.vida = Math.max(1, this.vida - i.cantidad); return i.cantidad; },
  aplicarEstado(n, d) { this.estados[n] = d; }, tieneEstado(n) { return !!this.estados[n]; },
};
jug.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x: 0, z: 6, radio: 0.4, masa: 80, capa: CAPA.JUGADOR, amortiguacion: 6, datos: jug });
{ const g = new THREE.Group(); const c = new THREE.Mesh(geoCuerpo, new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.6 })); c.position.y = 0.9; c.castShadow = true; g.add(c); const h = new THREE.Mesh(geoCab, matCab); h.position.y = 1.62; g.add(h); escena.add(g); jug.g = g; }
juego.jugadores.push(jug);
juego.registrar('jugadorFalso', { posFisica() { jug.pos.x = jug.cuerpo.x; jug.pos.z = jug.cuerpo.z; jug.g.position.set(jug.pos.x, 0, jug.pos.z); jug.g.rotation.y = jug.rot; } }, 31);

// ───── Vehículo falso (para el farol) ─────
const vehiculos = { lista: [], limpiar() {}, actualizar() {} };
juego.registrar('vehiculos', vehiculos, 40);

// ───── Mundo mínimo ─────
const interactivos = [], objetos = [], estructuras = [];
const mundo = {
  interactivos, objetos, estructuras,
  crear(tipo, o = {}) { const f = fabricas.get(tipo); if (!f) { console.warn('tipo sin registrar', tipo); return null; } const ob = f(juego, { eraIdx, ...o }); if (ob) objetos.push(ob); return ob; },
  registrarInteractivo(r) { interactivos.push(r); return r; },
  quitarInteractivo(r) { const i = interactivos.indexOf(r); if (i >= 0) interactivos.splice(i, 1); },
  interactivoCercano() { return null; },
  soltarBotin(x, z) { window.__botin = (window.__botin || 0) + 1; },
  actualizar(dt) { for (const o of [...objetos]) o.actualizar?.(dt); },
  posFisica(dt) { for (const o of objetos) o.posFisica?.(dt); },
  limpiar() { for (const o of objetos) o.destruir?.(); objetos.length = 0; interactivos.length = 0; },
};
juego.registrar('mundo', mundo, 45);

await import('../src/mundo/interactivos/index.js');

// ───── Escena según tipo ─────
const DEMO = {
  campana_iglesia: [{ x: 0, z: 0 }], farol_aceite: [{ x: 0, z: 0 }], carreta: [{ x: 0, z: 0, rot: 0.4 }],
  palanca_tren: [{ x: 3, z: 4, via: { x1: -40, z1: 0, x2: 40, z2: 0 }, dibujarVia: q.get('via') !== '0' }], deposito_agua: [{ x: 0, z: -2 }], vagoneta: [{ x: -10, z: 0, rot: Math.PI / 2 }],
  alambrada: [{ x: 0, z: 0, largo: 6 }], mina_terrestre: [{ x: 0, z: 0 }, { x: 3, z: 1 }], sirena_antiaerea: [{ x: 0, z: 0, rot: 0 }],
  alarma_coche: [{ x: 0, z: 0, rot: 0.5 }], surtidor_gasolina: [{ x: 0, z: 0 }], transformador: [{ x: 0, z: 0 }],
  valla_electrica: [{ x: 0, z: 0, largo: 6 }, { tipo: 'generador', x: -5, z: 2.5 }], generador: [{ x: 0, z: 0 }], dron_suministros: [{ x: 0, z: 0 }],
  torre_tesla: [{ x: 0, z: 0 }], puerta_energia: [{ x: 0, z: 0, ancho: 5 }], celula_plasma: [{ x: 0, z: 0 }],
};
const tipos = tipoPedido ? [tipoPedido] : ERAS[eraIdx].interactivos;
tipos.forEach((t, i) => {
  const dx = tipos.length === 1 ? 0 : (i - (tipos.length - 1) / 2) * 7;
  for (const d of DEMO[t] || [{ x: 0, z: 0 }]) {
    const tp = d.tipo || t;
    const ob = mundo.crear(tp, { ...d, x: (d.x || 0) + dx, z: d.z || 0 });
    if (ob) { ob.__demo = true; }
  }
});
const nzomb = q.get('zombis') !== null ? +q.get('zombis') : 6;
const centro = { x: 0, z: -7 };
for (let i = 0; i < nzomb; i++) new ZombiFalso(centro.x + (i % 4) * 1.4 - 2, centro.z - Math.floor(i / 4) * 1.4);
if (q.get('camina')) window.__camina = true;

// ───── Utilidades de prueba ─────
const buscar = (t) => objetos.find((o) => o.tipo === t);
window.activar = (t, i = 0) => {
  const o = typeof t === 'string' ? objetos.filter((x) => x.tipo === t)[i] : t;
  const r = o && interactivos.find((x) => x.objeto === o || x.pos === o.pos);
  if (!r) return false;
  jug.rot = 0; r.usar(jug); return true;
};
window.avanzar = (seg, paso = 1 / 30) => { for (let t = 0; t < seg; t += paso) juego.avanzar(paso); return juego.tiempo.ahora; };
window.mirar = (x, y, z, tx, ty, tz) => a.mirar(x, y, z, tx, ty, tz);
window.plano = (t, dist = 7, alto = 4, ry = 1.2, lado = 0.6) => { const o = buscar(t) || objetos[0]; a.mirar(o.pos.x + dist * lado, alto, o.pos.z + dist, o.pos.x, ry, o.pos.z); };
window.vistaJuego = (t) => { const o = (t && buscar(t)) || objetos[0]; a.mirar(o.pos.x, 24, o.pos.z + 17, o.pos.x, 0, o.pos.z - 2); };
window.objetos = objetos; window.jug = jug; window.zombis = juego.zombis;
window.estado = (t) => { const o = buscar(t) || objetos[0]; return { tipo: o.tipo, estado: o.estado, vida: o.vida, enfriamiento: o.enfriamiento, ahora: juego.tiempo.ahora }; };
window.ponerJugador = (x, z) => { jug.cuerpo.x = x; jug.cuerpo.z = z; jug.pos.set(x, 0, z); };
window.vehiculoFalso = (x, z, rot, vel) => { const v = { vivo: true, pos: new THREE.Vector3(x, 0, z), rot, velocidad: vel, radio: 1.4 }; vehiculos.lista.push(v); return v; };
window.plano(tipos[0], tipos.length === 1 ? 7 : 22, tipos.length === 1 ? 4 : 12);
document.getElementById('info').textContent = `interactivos · ${tipos.join(', ')} · era ${eraIdx}`;
a.lista();
