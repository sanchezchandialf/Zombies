// Página de prueba del módulo FX.
//   ?efecto=explosion            lanza el efecto (admite lista separada por comas y variantes «fogonazo:polvora»)
//   ?efecto=galeria              todos los efectos a la vez en una cuadrícula
//   &t=0.5                       congela la simulación y avanza 0,5 s tras lanzar (para capturas deterministas)
//   &cam=cerca|juego|alto        encuadre (juego = ~25 m de cámara)       &hora=0.75 (noche)  &era=0..5
//   &suelo=claro                 suelo claro para juzgar la sangre         &repetir=2.5  repite cada n s
// Consola: window.probar('nombre'[, opciones]), window.paso(seg), window.parar(bool), window.limpiar()
import * as THREE from 'three';
import { crearArnes } from './arnes.js';

const q = new URLSearchParams(location.search);
const cam = q.get('cam') ?? 'juego';
const camaras = {
  cerca: { x: 0, alto: 2.6, dist: 7, objetivo: [0, 1, 0] },
  juego: { x: 0, alto: 18, dist: 17, objetivo: [0, 0, 0] },
  alto: { x: 0, alto: 30, dist: 12, objetivo: [0, 0, 0] },
  lejos: { x: 0, alto: 16, dist: 17, objetivo: [0, 2, 0] },
  medio: { x: 0, alto: 9, dist: 11, objetivo: [0, 0.5, 0] },
  galeria: { x: 0, alto: 26, dist: 21, objetivo: [0, 0, -2] },
};
const a = await crearArnes({ hora: q.has('hora') ? +q.get('hora') : 0.25, camara: camaras[q.get('efecto') === 'galeria' ? 'galeria' : cam] ?? camaras.juego });
const juego = a.juego, fx = juego.fx;
if (q.get('suelo') === 'claro') { const s = juego.render.escena.getObjectByName('sueloArnes'); if (s) s.material.color.set(0xc9bda6); }
// un par de siluetas de referencia (1,8 m) para juzgar la escala
const ref = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.2, 4, 10), new THREE.MeshStandardMaterial({ color: 0x486a8a, roughness: 0.7 }));
ref.position.set(-3.2, 0.9, 2.4); ref.castShadow = true; if (q.get('ref') !== '0') juego.render.escena.add(ref);

const P = (x = 0, y = 1, z = 0) => ({ x, y, z });
const dirs = { x: [1, 0], z: [0, 1] };
let emisores = [];

const EFECTOS = {
  // fogonazos
  'fogonazo:polvora': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'polvora', dirX: 1, dirZ: 0.15 }),
  'fogonazo:polvora_grande': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'polvora_grande', dirX: 1, dirZ: 0.15, escala: 1.4 }),
  'fogonazo:moderno': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'moderno', dirX: 1, dirZ: 0.15 }),
  'fogonazo:moderno_grande': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'moderno_grande', dirX: 1, dirZ: 0.15, escala: 1.4 }),
  'fogonazo:plasma': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'plasma', dirX: 1 }),
  'fogonazo:riel': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'riel', dirX: 1, escala: 1.3 }),
  'fogonazo:electrico': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'electrico', dirX: 1 }),
  'fogonazo:cohete': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'cohete', dirX: 1, escala: 1.4 }),
  'fogonazo:onda': () => fx.emitir('fogonazo', P(0, 1.2, 0), { tipo: 'onda', dirX: 1 }),
  fogonazo: () => EFECTOS['fogonazo:polvora'](),
  humo: () => fx.emitir('humo', P(0, 1, 0), { cantidad: 6, escala: 1.5, dirX: 1, dirY: 0.2 }),
  sangre: () => fx.emitir('sangre', P(0, 1, 0), { dirX: 1, dirZ: 0.2, cantidad: 12 }),
  sangre_grande: () => fx.emitir('sangre_grande', P(0, 1, 0), { dirX: 1, dirZ: 0.2 }),
  chispas: () => fx.emitir('chispas', P(0, 1, 0), { dirX: -1, cantidad: 12 }),
  astillas: () => fx.emitir('astillas', P(0, 1, 0), { dirX: -1, cantidad: 12 }),
  polvo: () => fx.emitir('polvo', P(0, 0.2, 0), { cantidad: 10, escala: 1.5 }),
  piedra: () => fx.emitir('piedra', P(0, 0.8, 0), { dirX: -1, cantidad: 10, escala: 1.4 }),
  explosion: () => fx.emitir('explosion', P(0, 0.6, 0), { escala: 1 }),
  explosion_grande: () => fx.emitir('explosion_grande', P(0, 0.6, 0), { escala: 1.4 }),
  fuego: () => fx.emitir('fuego', P(0, 0.1, 0), { cantidad: 14, escala: 1.4 }),
  gas_toxico: () => fx.emitir('gas_toxico', P(0, 0.3, 0), { cantidad: 6, escala: 2 }),
  acido: () => fx.emitir('acido', P(0, 0.1, 0), { cantidad: 16, escala: 1.6 }),
  plasma: () => fx.emitir('plasma', P(0, 1, 0), { escala: 1.4 }),
  electrico: () => fx.emitir('electrico', P(0, 1, 0), { escala: 1.6 }),
  vapor: () => fx.emitir('vapor', P(0, 0.8, 0), { cantidad: 8, escala: 1.5 }),
  casquillo: () => { for (let i = 0; i < 6; i++) fx.emitir('casquillo', P(0, 1.1, 0), { dirX: 0, dirZ: 1 }); },
  curacion: () => fx.emitir('curacion', P(0, 1, 0), { cantidad: 30, escala: 2 }),
  onda: () => fx.emitir('onda', P(0, 0.15, 0), { escala: 1.6, color: 0xffb070 }),
  aparicion: () => fx.emitir('aparicion', P(0, 0.1, 0), { escala: 1.4, cantidad: 8 }),
  salpicadura: () => fx.emitir('salpicadura', P(0, 0.1, 0), { escala: 1.4 }),
  singularidad: () => fx.emitir('singularidad', P(0, 0.9, 0), { escala: 1.2 }),
  llama: () => { for (let i = 0; i < 24; i++) fx.emitir('llama', P(-4, 1, 0), { dirX: 1, dirZ: 0, cantidad: 3, escala: 1 }); },
  // trazadoras
  'trazadora:bala': () => fx.trazadora(P(-6, 1.2, 0), P(6, 1, 0.5), { tipo: 'bala' }),
  'trazadora:pulso': () => fx.trazadora(P(-6, 1.2, 0), P(6, 1, 0.5), { tipo: 'pulso' }),
  'trazadora:riel': () => fx.trazadora(P(-6, 1.2, 0), P(7, 1, 0.5), { tipo: 'riel' }),
  'trazadora:aguja': () => fx.trazadora(P(-6, 1.2, 0), P(6, 1, 0.5), { tipo: 'aguja' }),
  'trazadora:arco': () => fx.trazadora(P(-5, 1.2, 0), P(5, 1, 0.5), { tipo: 'arco', color: 0x9ab8ff }),
  'trazadora:laser': () => fx.trazadora(P(-6, 1.2, 0), P(6, 1, 0.5), { tipo: 'laser', duracion: 0.6 }),
  // calcos
  'calco:sangre': () => { fx.calco('sangre', 0, 0, 3.4); fx.calco('sangre', 3, 1, 2); fx.calco('sangre', -3, -1.5, 2.6, { dirX: 1, dirZ: 0.3 }); fx.calco('sangre', 1, 3, 1.2); },
  'calco:quemadura': () => fx.calco('quemadura', 0, 0, 4),
  'calco:acido': () => fx.calco('acido', 0, 0, 3),
  'calco:crater': () => fx.calco('crater', 0, 0, 3.6),
  'calco:aceite': () => fx.calco('aceite', 0, 0, 2.6),
  'calco:huella': () => { for (let i = 0; i < 6; i++) fx.calco('huella', i * 0.9 - 2.2, (i % 2) * 0.4, 0.6, { dirX: 1, dirZ: 0 }); },
  // escombros
  'escombros:madera': () => fx.escombros({ x: 0, y: 1, z: 0, cantidad: 16, material: 'madera', fuerza: 6 }),
  'escombros:piedra': () => fx.escombros({ x: 0, y: 1, z: 0, cantidad: 16, material: 'piedra', fuerza: 6 }),
  'escombros:metal': () => fx.escombros({ x: 0, y: 1, z: 0, cantidad: 16, material: 'metal', fuerza: 6 }),
  'escombros:carne': () => fx.escombros({ x: 0, y: 1, z: 0, cantidad: 12, material: 'carne', fuerza: 6 }),
  'escombros:vidrio': () => fx.escombros({ x: 0, y: 1, z: 0, cantidad: 16, material: 'vidrio', fuerza: 6 }),
  destello: () => { fx.destello(P(0, 1.5, 0), 0xffa050, 8, 0.5, 9); fx.emitir('onda', P(0, 0.15, 0), { escala: 0.8 }); },
  // emisores continuos
  'emisor:fuego': () => emisores.push(fx.crearEmisor('fuego', P(0, 0.05, 0), { escala: 1.6 })),
  'emisor:gas_toxico': () => emisores.push(fx.crearEmisor('gas_toxico', P(0, 0.1, 0), { escala: 2 })),
  'emisor:vapor': () => emisores.push(fx.crearEmisor('vapor', P(0, 0.5, 0), { escala: 1.4 })),
  'emisor:humo': () => emisores.push(fx.crearEmisor('humo', P(0, 1, 0), { escala: 1.6 })),
  'emisor:acido': () => emisores.push(fx.crearEmisor('acido', P(0, 0.05, 0), { escala: 1.6 })),
  // eventos del juego (pasan por las reacciones automáticas)
  'impacto:carne': () => { for (let i = 0; i < 4; i++) juego.eventos.emitir('impacto', { x: i * 1.4 - 2, y: 1.1, z: 0, nx: -1, nz: 0, material: 'carne', tipo: 'bala', objetivo: null, dirX: 1, dirZ: 0.1, cantidad: i === 3 ? 200 : 25, critico: i === 3 }); },
  'impacto:metal': () => juego.eventos.emitir('impacto', { x: 0, y: 1, z: 0, nx: -1, nz: 0.2, material: 'metal', tipo: 'bala', objetivo: null }),
  'impacto:madera': () => juego.eventos.emitir('impacto', { x: 0, y: 1, z: 0, nx: -1, nz: 0.2, material: 'madera', tipo: 'bala', objetivo: null }),
  'impacto:piedra': () => juego.eventos.emitir('impacto', { x: 0, y: 1, z: 0, nx: -1, nz: 0.2, material: 'piedra', tipo: 'bala', objetivo: null }),
  'impacto:energia': () => juego.eventos.emitir('impacto', { x: 0, y: 1, z: 0, nx: -1, nz: 0, material: 'energia', tipo: 'energia', objetivo: null }),
  'evento:explosion': () => juego.eventos.emitir('explosion', { x: 0, z: 0, y: 0.5, radio: 5, danio: 100, tipo: 'explosivo' }),
  'evento:explosion_fuego': () => juego.eventos.emitir('explosion', { x: 0, z: 0, y: 0.5, radio: 4, danio: 50, tipo: 'fuego' }),
  'evento:explosion_energia': () => juego.eventos.emitir('explosion', { x: 0, z: 0, y: 0.5, radio: 4, danio: 50, tipo: 'energia' }),
  'evento:zombi_muerte': () => juego.eventos.emitir('zombi:muerte', { zombi: { pos: { x: 0, z: 0 }, radio: 0.45 }, info: { dirX: 1, dirZ: 0.2, tipo: 'bala' } }),
  'evento:zombi_muerte_explosivo': () => juego.eventos.emitir('zombi:muerte', { zombi: { pos: { x: 0, z: 0 }, radio: 0.45 }, info: { dirX: 1, dirZ: 0.2, tipo: 'explosivo' } }),
  'evento:horda': () => { for (let i = 0; i < 28; i++) { const x = (Math.random() - 0.5) * 16, z = (Math.random() - 0.5) * 9; juego.eventos.emitir('zombi:muerte', { zombi: { pos: { x, z }, radio: 0.45 }, info: { dirX: Math.cos(i), dirZ: Math.sin(i), tipo: 'bala' } }); } },
};

function ejecutar(nombre, op) {
  const f = EFECTOS[nombre];
  if (f) return f(op);
  if (nombre === 'galeria') return galeria();
  if (nombre === 'todo') return Object.keys(EFECTOS).forEach((n) => { try { EFECTOS[n](); } catch (e) { console.error(n, e); } });
  // nombre suelto del contrato: lo emitimos tal cual
  fx.emitir(nombre, P(0, 1, 0), op);
}

function galeria() {
  const lista = ['fogonazo:polvora', 'fogonazo:moderno', 'fogonazo:plasma', 'explosion', 'fuego', 'gas_toxico', 'acido', 'electrico', 'vapor', 'sangre_grande', 'chispas', 'astillas', 'polvo', 'piedra', 'curacion', 'onda', 'aparicion', 'salpicadura', 'singularidad', 'plasma', 'humo', 'calco:sangre', 'escombros:madera', 'emisor:fuego'];
  const cols = 6, sep = 7.5;
  lista.forEach((n, i) => {
    const cx = (i % cols - (cols - 1) / 2) * sep, cz = (Math.floor(i / cols) - 1.5) * 6.5;
    const orig = fx.emitir, origC = fx.calco, origE = fx.escombros, origCE = fx.crearEmisor;
    fx.emitir = (nom, p, o) => orig(nom, { x: p.x + cx, y: p.y, z: p.z + cz }, o);
    fx.calco = (t, x, z, tam, o) => origC(t, x + cx, z + cz, tam, o);
    fx.escombros = (o) => origE({ ...o, x: o.x + cx, z: o.z + cz });
    fx.crearEmisor = (nom, p, o) => origCE(nom, { x: p.x + cx, y: p.y, z: p.z + cz }, o);
    try { EFECTOS[n](); } catch (e) { console.error(n, e); }
    fx.emitir = orig; fx.calco = origC; fx.escombros = origE; fx.crearEmisor = origCE;
  });
}

window.probar = (n, op) => ejecutar(n, op);
window.parar = (v = true) => juego.pausar(v);
window.paso = (seg) => { const n = Math.max(1, Math.round(seg * 30)); for (let i = 0; i < n; i++) fx.actualizar(1 / 30); };
window.fijar = (nombres, t = 0.3, repetir = 1) => { juego.pausar(true); window.limpiar(); fx.actualizar(1 / 60); for (let r = 0; r < repetir; r++) for (const n of String(nombres).split(',')) ejecutar(n.trim()); window.paso(t); };
window.limpiar = () => { emisores = []; fx.limpiar(); };
window.fx = fx; window.juego = juego; window.arnes = a;
window.diag = () => fx.estado();
window.nombres = () => Object.keys(EFECTOS);

const ef = q.get('efecto');
if (ef) {
  const t = q.has('t') ? +q.get('t') : null;
  const lanzar = () => { for (const n of ef.split(',')) ejecutar(n.trim()); };
  if (t !== null) {
    juego.pausar(true);
    fx.actualizar(1 / 60);
    lanzar();
    window.paso(t);
  } else {
    lanzar();
    if (q.has('repetir')) setInterval(lanzar, +q.get('repetir') * 1000);
  }
}
a.lista();
