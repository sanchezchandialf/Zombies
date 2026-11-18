// Exposición y circuito de los vehículos.
//   ?vehiculo=muscle_car  exposición de uno (giratoria; &cerca=1 primer plano; &noche=1)
//   sin parámetro: circuito con dianas Dañables, obstáculos y un conductor simulado (&vehiculo=id elige cuál conduce; &era=n)
//   window.prueba: avanzar(seg) · vista(x,y,z,tx,ty,tz) · v (vehículo) · dianas
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearCombate } from '../src/combate/index.js';
import { crearVehiculos, VEHICULOS } from '../src/vehiculos/index.js';
import { CAPA } from '../src/nucleo/fisica.js';
import { crearFxPrueba } from './combate-fx.js';

const q = new URLSearchParams(location.search);
const id = q.get('vehiculo');
const todos = ['caballo', 'locomovil', 'autoblindado', 'muscle_car', 'blindado_tactico', 'aerodeslizador'];
const eraIdx = id ? VEHICULOS[id].era : (q.has('era') ? +q.get('era') : 3);
const a = await crearArnes({ eraIdx, hora: q.has('noche') ? 0.75 : 0.3, camara: { dist: 9, alto: 4.5, objetivo: [0, 1, 0] }, sistemas: { combate: crearCombate, vehiculos: crearVehiculos } });
const juego = a.juego, fisica = juego.fisica, escena = juego.render.escena;
let fx = juego.fx;
if (!fx || /\{\s*\}\s*$/.test(String(fx.emitir))) { fx = crearFxPrueba(juego); juego.sistemas.fx = fx; juego.fx = fx; juego.registrar('fxPrueba', { actualizar: (dt) => fx.actualizar(dt) }, 85); }
const falso = () => ({ bando: 'jugadores', indice: 0, mods: {}, rol: null, pos: new THREE.Vector3(), radio: 0.4, vehiculo: null, visual: null, teletransportar() {} });
const dianas = [];
function diana(x, z, vida = 90, metal = false) {
  const d = { bando: 'zombis', vivo: true, pos: new THREE.Vector3(x, 0, z), radio: 0.42, material: metal ? 'metal' : 'carne', vida, vidaMax: vida, masa: 70, clase: { id: 'caminante' }, esJefe: false, rot: 0 };
  d.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x, z, radio: 0.42, masa: 70, capa: CAPA.ZOMBI, rigidez: 0.6, amortiguacion: 3, datos: d });
  d.recibirDanio = (i) => { d.vida -= i.cantidad; if (i.empuje) { d.cuerpo.vx += (i.dirX ?? 0) * i.empuje; d.cuerpo.vz += (i.dirZ ?? 0) * i.empuje; } if (d.vida <= 0 && d.vivo) { d.vivo = false; d.malla.rotation.x = -1.4; d.malla.position.y = 0.2; fisica.eliminarCuerpo(d.cuerpo); juego.eventos.emitir('zombi:muerte', { zombi: d }); } return i.cantidad; };
  d.malla = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: metal ? 0x888c92 : 0x6f8a58, roughness: 0.8 }));
  m.position.y = 0.85; m.castShadow = true; d.malla.add(m); escena.add(d.malla);
  dianas.push(d); return d;
}
juego.registrar('dianas', { posFisica() { for (const d of dianas) { if (!d.vivo) continue; d.pos.x = d.cuerpo.x; d.pos.z = d.cuerpo.z; d.malla.position.set(d.pos.x, 0, d.pos.z); } } }, 61);

const v = juego.vehiculos;
let principal = null;
if (id && !q.has('circuito')) {
  // exposición
  const ve = v.crear(id, { x: 0, z: 0, rot: 0 });
  principal = ve;
  const cerca = q.has('cerca');
  const R = ve.def.hz * (cerca ? 1.9 : 3.4);
  let ang = +(q.get('ang') ?? 0.7);
  if (q.has('giro')) a.alCuadro((dt) => { ang += dt * 0.3; });
  a.camaraJuego(false);
  const colocar = () => a.mirar(Math.sin(ang) * R, R * 0.38, Math.cos(ang) * R, 0, 0.9, 0);
  a.alCuadro(colocar); colocar();
  if (q.has('mover')) {
    const j = falso(); ve.subir(j);
    ve.mando = { moverX: 0, moverZ: 1, esquivar: false };
    a.alCuadro(() => { ve.mando.moverZ = Math.cos(juego.tiempo.ahora * 0.3); ve.mando.moverX = Math.sin(juego.tiempo.ahora * 0.3); });
  }
} else {
  // circuito
  const sel = id ?? 'muscle_car';
  const ve = v.crear(sel, { x: 0, z: 24, rot: Math.PI });
  principal = ve;
  const j = falso(); ve.subir(j);
  const ruta = [[0, 14], [-14, 6], [-14, -14], [0, -22], [14, -14], [14, 6], [0, 14], [0, 24]];
  let wp = 0; ve.mando = { moverX: 0, moverZ: 0, esquivar: false, disparar: false, disparoPulsado: false, apuntar: { x: 0, z: 0 } };
  ve.piloto = null;
  juego.registrar('piloto', { actualizar(dt) {
    const m = ve.mando, t = ruta[wp];
    if (!ve.vivo) return;
    const dx = t[0] - ve.pos.x, dz = t[1] - ve.pos.z, d = Math.hypot(dx, dz);
    if (d < 4) wp = (wp + 1) % ruta.length;
    m.moverX = dx / d; m.moverZ = dz / d;
    m.esquivar = d < 9 && ve.def.tipo === 'coche' && Math.abs(ve.estado.vf) > 8;
    const obj = dianas.find((z) => z.vivo && Math.hypot(z.pos.x - ve.pos.x, z.pos.z - ve.pos.z) < 22);
    m.disparar = !!obj; if (obj) { m.apuntar.x = obj.pos.x; m.apuntar.z = obj.pos.z; m.disparoPulsado = true; }
  } }, 39);
  // dianas: filas y masa
  for (let i = 0; i < 14; i++) diana(-14 + (i % 2) * 1.2, -12 + i * 1.4);
  for (let i = 0; i < 12; i++) diana(12 + Math.sin(i) * 1.5, -10 + i * 1.6, 90);
  for (let i = 0; i < 8; i++) diana(-6 + i * 1.7, -22 + (i % 2) * 1.5, 60);
  // obstáculos: muros y bloques
  const grises = new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.9 });
  const obst = (x, z, hx, hz) => { fisica.cajaEstatica(x, z, hx, hz); const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 1.6, hz * 2), grises); m.position.set(x, 0.8, z); m.castShadow = m.receiveShadow = true; escena.add(m); };
  obst(0, 0, 3, 1.5); obst(-6, -9, 1.2, 1.2); obst(7, -4, 1.5, 3);
  fisica.limites = { minX: -30, maxX: 30, minZ: -32, maxZ: 32 };
  a.camaraJuego(false);
  const c = new THREE.Vector3();
  a.alCuadro((dt) => { c.lerp(new THREE.Vector3(ve.pos.x, 0, ve.pos.z), 1 - Math.exp(-3 * dt)); a.mirar(c.x, 22, c.z + 20, c.x, 0, c.z); });
}
window.prueba = {
  v: principal, dianas, v_: v,
  avanzar(seg) { for (let t = 0; t < seg; t += 1 / 60) juego.avanzar(1 / 60); },
  vista(x, y, z, tx = 0, ty = 1, tz = 0) { a.camaraJuego(false); a.mirar(x, y, z, tx, ty, tz); },
  juego, a,
};
a.lista();
