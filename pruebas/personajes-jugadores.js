// Prueba de los visuales de jugadores. Parámetros:
//   (sin nada)            parrilla 5 roles × 6 eras
//   ?rol=soldado&era=2    primer plano de un atuendo   (&giro=grados  &arma=0|1)
//   ?modo=juego           cámara a distancia de juego (25 m, 55°) con los 5 roles
//   ?anim=correr|andar|disparar|recargar|lanzar|cuerpo|habilidad|esquivar|golpe|caido|morir|invisible|ardiendo   (con rol/era)
//   &t=segundos           tiempo simulado antes de capturar (se avanza a mano)
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearVisualesJugadores } from '../src/personajes/jugadores.js';
import { crearModeloArma } from '../src/armas/modelos.js';
import { ERAS } from '../src/datos/eras.js';
import { ROLES } from '../src/datos/roles.js';

const q = new URLSearchParams(location.search);
const rol = q.get('rol'), era = q.get('era') != null ? +q.get('era') : null, anim = q.get('anim'), modo = q.get('modo');
const a = await crearArnes({ eraIdx: era ?? 0, hora: 0.5, orbita: !!q.get('orbita'), suelo: true });
const juego = a.juego;
juego.render.camaraExterna = true;
const vis = crearVisualesJugadores(juego);
const ids = Object.keys(ROLES);
const todos = [];

function armaDe(rolId, e) {
  const arq = ROLES[rolId].equipo.primaria;
  const id = ERAS[e].armas[arq];
  try { return crearModeloArma(id); } catch (err) { console.error('arma', id, err.message); return null; }
}
function poner(rolId, e, x, z, rot = 0, conArma = q.get('arma') !== '0') {
  const v = vis.crear(rolId, e);
  v.colocar(x, z, rot);
  if (conArma) v.equipar(armaDe(rolId, e));
  todos.push(v); return v;
}

let obj = null;
if (q.get('fila')) {
  const r = q.get('fila');
  for (let e = 0; e < 6; e++) poner(r, e, (e - 2.5) * 1.3, 0, 0.4);
  a.mirar(0, 1.5, 9, 0, 0.95, 0);
  juego.render.camara.fov = 34; juego.render.camara.updateProjectionMatrix();
} else if (!rol && modo !== 'juego') {
  ids.forEach((r, i) => { for (let e = 0; e < 6; e++) poner(r, e, (e - 2.5) * 1.5, (i - 2) * 1.9, 0.5); });
  a.mirar(0, 7.5, 12.5, 0, 0.9, 0);
  juego.render.camara.fov = 38; juego.render.camara.updateProjectionMatrix();
} else if (modo === 'juego') {
  ids.forEach((r, i) => { const v = poner(r, era ?? 0, (i - 2) * 3, 0, 0.6 + i * 0.4); v.mover(Math.sin(i) * 3, Math.cos(i) * 3); });
  a.mirar(0, 20, 14, 0, 0, 0);
  juego.render.camara.fov = 55; juego.render.camara.updateProjectionMatrix();
} else {
  const v = poner(rol, era ?? 0, 0, 0, +(q.get('giro') ?? 25) * Math.PI / 180);
  obj = v;
  const d = +(q.get('d') ?? 4.2), h = +(q.get('h') ?? 1.0);
  a.mirar(0.2, h + 0.5, d, 0, h, 0);
  juego.render.camara.fov = 36; juego.render.camara.updateProjectionMatrix();
}
const dt = 1 / 30;
let reloj = 0;
function avanzar(seg) { const n = Math.round(seg / dt); for (let i = 0; i < n; i++) { reloj += dt; escena(reloj); vis.actualizar(dt); } }
function escena(t) {
  if (!obj) return;
  const rot = obj.rot;
  if (anim === 'correr') obj.mover(Math.sin(rot) * 5.4, Math.cos(rot) * 5.4);
  else if (anim === 'andar') obj.mover(Math.sin(rot) * 2, Math.cos(rot) * 2);
  else if (anim === 'lateral') obj.mover(Math.cos(rot) * 3.5, -Math.sin(rot) * 3.5);
  else if (anim === 'atras') obj.mover(-Math.sin(rot) * 3, -Math.cos(rot) * 3);
  else if (anim === 'disparar' && Math.abs(t % 0.35) < dt) obj.accion('disparar');
  else if (anim === 'recargar' && Math.abs(t % 2.0) < dt) obj.accion('recargar', { duracion: 1.5 });
  else if (anim === 'lanzar' && Math.abs(t % 1.4) < dt) obj.accion('lanzar', { duracion: 0.5 });
  else if (anim === 'cuerpo' && Math.abs(t % 1.2) < dt) obj.accion('cuerpo', { duracion: 0.45 });
  else if (anim === 'habilidad' && Math.abs(t % 1.4) < dt) obj.accion('habilidad', { duracion: 0.6 });
  else if (anim === 'esquivar' && Math.abs(t % 1.4) < dt) obj.accion('esquivar', { duracion: 0.5, dirX: Math.sin(rot), dirZ: Math.cos(rot) });
  else if (anim === 'golpe' && Math.abs(t % 1.2) < dt) { obj.accion('golpe', { dirX: -Math.sin(rot), dirZ: -Math.cos(rot), duracion: 0.3 }); obj.destello(); }
}
if (anim === 'caido') obj?.estado('caido', true);
if (anim === 'invisible') obj?.estado('invisible', true);
if (anim === 'ardiendo') obj?.estado('ardiendo', true);
if (anim === 'furia') obj?.estado('furia', true);
if (anim === 'escudo') obj?.estado('escudo', true);
if (anim === 'aturdido') obj?.estado('aturdido', true);
if (anim === 'envenenado') obj?.estado('envenenado', true);
if (anim === 'morir') { obj.morir({ dirX: -Math.sin(obj.rot), dirZ: -Math.cos(obj.rot), fuerza: +(q.get('f') ?? 0.8), tipo: q.get('tipo') || 'bala' }); }
avanzar(+(q.get('t') ?? 1.2));
window.avanzar = avanzar; window.vis = vis; window.todos = todos; window.obj = obj; window.a = a;
setTimeout(() => a.lista(), 300);
