// Exposición y pruebas del módulo Mundo. ?era=N elige la era. window.prueba: ver funciones al final.
//   exposicion() · cadena() · cajas() · botin() · torreta() · vista(modo)  · avanzar(seg)
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearCombate } from '../src/combate/index.js';
import { crearMundo } from '../src/mundo/index.js';
import { CAPA } from '../src/nucleo/fisica.js';
import { ERAS } from '../src/datos/eras.js';

const a = await crearArnes({ eraIdx: 0, hora: 0.3, camara: { dist: 16, alto: 12, objetivo: [0, 0.5, 0] }, sistemas: { combate: crearCombate, mundo: crearMundo } });
const juego = a.juego, mundo = juego.mundo, fisica = juego.fisica, era = juego.estado.eraIdx;
fisica.limites = { minX: -60, maxX: 60, minZ: -60, maxZ: 60 };
const gen = [];

// jugador falso (Dañable mínimo con la API usada por el mundo)
const jugador = {
  indice: 0, bando: 'jugadores', vivo: true, caido: false, pos: new THREE.Vector3(0, 0, 14), rot: Math.PI, radio: 0.4, vida: 40, vidaMax: 100, mods: { torretas: 1 },
  arma: { reserva: 5, reservaMax: 40, municion: 1, cargador: 1 }, log: [],
  curar(n) { this.vida = Math.min(this.vidaMax, this.vida + n); this.log.push(['curar', n]); }, darMunicion(f) { this.log.push(['municion', f]); }, darArrojadizas(n) { this.log.push(['arroj', n]); },
  aplicarEstado(n, d) { this.log.push(['estado', n, d]); }, intencion: { apuntar: { x: 0, z: 0 }, dirApuntar: { x: 0, z: -1 }, disparar: false, disparoPulsado: false },
  cuerpo: { x: 0, z: 14 }, emplazamiento: null, vehiculo: null, mods2: 0,
};
juego.jugadores.push(jugador);

function diana(x, z, vida = 400) {
  const o = { bando: 'zombis', vivo: true, pos: new THREE.Vector3(x, 0, z), radio: 0.4, material: 'carne', vida, vidaMax: vida, hits: 0,
    recibirDanio(i) { if (!this.vivo) return 0; this.vida -= i.cantidad; this.hits++; if (this.vida <= 0) { this.vivo = false; this.malla.visible = false; fisica.eliminarCuerpo(this.cuerpo); } return i.cantidad; } };
  o.malla = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 10), new THREE.MeshStandardMaterial({ color: 0x6b8f5a, roughness: 0.9 }));
  o.malla.position.set(x, 0.8, z); o.malla.castShadow = true; juego.render.escena.add(o.malla);
  o.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x, z, radio: 0.4, masa: 70, capa: CAPA.ZOMBI, datos: o, amortiguacion: 6 });
  juego.zombis.push(o); return o;
}
const dianas = [];

function limpiarTodo() { mundo.limpiar(); for (const d of dianas) { d.malla.parent?.remove(d.malla); if (d.cuerpo) fisica.eliminarCuerpo(d.cuerpo); } dianas.length = 0; juego.zombis.length = 0; juego.combate?.limpiar?.(); }
// Avanza la simulación a mano (sin renderizar): mundo, combate, fx y física.
function avanzar(seg, paso = 1 / 30) {
  const nombres = new Set(['mundo', 'combate', 'fx']);
  const sis = juego._orden.filter((s) => nombres.has(s.nombre));
  for (let t = 0; t < seg; t += paso) {
    juego.tiempo.dt = paso; juego.tiempo.ahora += paso; juego.tiempo.real += paso; juego.tiempo.cuadro++;
    for (const s of sis) if (s.nombre !== 'fx') { try { s.sis.actualizar?.(paso); } catch (e) { console.error(e); } }
    fisica.paso(paso);
    for (const s of sis) { try { s.sis.posFisica?.(paso); } catch (e) { console.error(e); } }
  }
}

function exposicion(g = juego.opciones.grupo || 'explosivos') {
  limpiarTodo();
  const tipos = ['barril_polvora', 'caja_dinamita', 'bidon_combustible', 'surtidor_gasolina', 'bombona_gas', 'celula_plasma'];
  const fila = (z, fn) => { for (let i = 0; i < 6; i++) fn(i, -7.5 + i * 3, z); };
  if (g === 'explosivos') fila(0, (i, x, z) => gen.push(mundo.crear('explosivo', { x, z, variante: tipos[i], rot: 0.4 * i })));
  if (g === 'cajas') { fila(-2, (i, x, z) => mundo.crear('caja', { x, z, eraIdx: i, escala: 1, rot: 0.3 })); fila(2, (i, x, z) => mundo.crear('empujable', { x, z, eraIdx: i })); }
  if (g === 'recogidas') for (const [t, z] of [['botiquin', -2.5], ['municion', 1], ['potenciador', 4.5]]) fila(z, (i, x, zz) => mundo.crear(t, { x, z: zz, eraIdx: i, duracion: 999, vx: 0, vz: 0 }));
  if (g === 'barricadas') barricadas();
  if (g === 'emplaz') emplazamiento(juego.estado.eraIdx);
  jugador.pos.set(40, 0, 40); jugador.cuerpo.x = 40;
}
function barricadas() { limpiarTodo(); for (let i = 0; i < 6; i++) mundo.crear('barricada', { x: -7.5 + i * 3.3 * 1.0, z: 0, rot: 0, eraIdx: i, jugador }); }
function emplazamiento(e = era) { limpiarTodo(); mundo.crear('emplazamiento', { x: 0, z: 2, rot: Math.PI, eraIdx: e }); mundo.crear('torreta', { x: 4, z: 2, rot: Math.PI, eraIdx: e, jugador }); }
function cadena() {
  limpiarTodo();
  for (let i = 0; i < 6; i++) mundo.crear('explosivo', { x: -6 + i * 2.2, z: 0, variante: 'barril_polvora' });
  for (let i = 0; i < 4; i++) mundo.crear('explosivo', { x: -5 + i * 2.5, z: 2.2, variante: i % 2 ? 'bombona_gas' : 'bidon_combustible' });
  for (let i = 0; i < 3; i++) dianas.push(diana(-4 + i * 4, -2.5));
  jugador.pos.set(40, 0, 40);
  const primero = mundo.objetos.find((o) => o.tipo === 'explosivo');
  primero.recibirDanio({ cantidad: 999, tipo: 'bala', dirX: 1, dirZ: 0, atacante: null });
}
function cajas() { limpiarTodo(); for (let i = 0; i < 5; i++) mundo.crear('caja', { x: -4 + i * 2, z: 0, eraIdx: era }); jugador.pos.set(40, 0, 40); for (const o of [...mundo.objetos]) o.recibirDanio({ cantidad: 999, tipo: 'bala', dirX: 0, dirZ: -1 }); }
function botin() { limpiarTodo(); jugador.pos.set(0, 0, 4); jugador.cuerpo.x = 0; jugador.cuerpo.z = 4; jugador.vida = 30; for (const t of ['botiquin', 'municion', 'potenciador']) mundo.crear(t, { x: (t === 'botiquin' ? -2 : t === 'municion' ? 0 : 2), z: 1, eraIdx: era }); }
function torreta() {
  limpiarTodo(); jugador.pos.set(0, 0, 8); jugador.rot = Math.PI;
  const t = mundo.desplegarTorreta(jugador); const b = mundo.desplegarBarricada(jugador);
  for (let i = 0; i < 4; i++) dianas.push(diana(-6 + i * 4, -8, 2000));
  return !!t && !!b;
}
window.prueba = { a, juego, mundo, jugador, exposicion, barricadas, emplazamiento, cadena, cajas, botin, torreta, avanzar, dianas, limpiarTodo,
  vista(x, y, z, tx = 0, ty = 0.5, tz = 0) { a.mirar(x, y, z, tx, ty, tz); }, resumen() { return { objetos: mundo.objetos.length, est: mundo.estructuras.length, dianas: dianas.map((d) => d.hits), jugador: jugador.log, vida: jugador.vida }; } };
exposicion();
a.lista();
