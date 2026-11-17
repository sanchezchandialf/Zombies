// Prueba de visuales de zombis. Parámetros:
//   ?clase=caminante&era=0      una clase/era (o todas las eras de una clase; sin parámetros: parrilla 8×6)
//   ?jefe=coracero              un jefe (todos si jefe=todos)
//   ?horda=200&era=2            modo horda
//   ?muertes=1                  modo muertes
//   ?vista=juego|cerca|alto     cámara (juego = ~25 m, 55°)   ?quieto=1  sin andar   ?elite=1
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearVisualesZombis } from '../src/personajes/zombis.js';
import { ZOMBIS, JEFES } from '../src/datos/zombis.js';

const q = new URLSearchParams(location.search);
const eraQ = q.get('era') !== null ? +q.get('era') : null;
const a = await crearArnes({ eraIdx: eraQ ?? 0, hora: +(q.get('hora') ?? 0.5), camara: { dist: 14, alto: 8, objetivo: [0, 1.2, 0] } });
const juego = a.juego;
const vz = crearVisualesZombis(juego);
const CLASES = Object.keys(ZOMBIS), JEFES_IDS = Object.keys(JEFES);
const lista = [];   // { vis, clase, era, vel, x, z, rot, ... }
const vista = q.get('vista') || 'cerca';
const elite = q.get('elite') === '1';
const quieto = q.get('quieto') === '1';

function poner(clase, era, x, z, rot = 0, extra = {}) {
  const vis = vz.crear(clase, era, { semilla: extra.semilla ?? (Math.floor(Math.random() * 1e9)), elite: extra.elite ?? elite });
  const e = { vis, clase, era, x, z, rot, vel: quieto ? 0 : (extra.vel ?? ZOMBIS[clase].velocidad), ...extra };
  vis.colocar(x, z, rot);
  lista.push(e);
  return e;
}

function camara(cx, cz, ancho, prof) {
  if (vista === 'juego') { const d = 25; a.mirar(cx, d * Math.sin(55 * Math.PI / 180), cz + d * Math.cos(55 * Math.PI / 180), cx, 0, cz); }
  else if (vista === 'alto') a.mirar(cx, 40, cz + 14, cx, 0, cz);
  else a.mirar(cx, 1.6 + prof * 0.35, cz + Math.max(ancho * 0.62, 5) + prof * 0.5, cx, 1.0, cz);
}

const modoJefe = q.get('jefe');
const modoHorda = q.get('horda');
const modoMuertes = q.get('muertes');

if (modoJefe) {
  const ids = modoJefe === 'todos' ? JEFES_IDS : [modoJefe];
  ids.forEach((id, i) => {
    const v = vz.crearJefe(id); const x = (i - (ids.length - 1) / 2) * 7;
    v.colocar(x, 0, 0); lista.push({ vis: v, jefe: id, x, z: 0, rot: 0, vel: 0 });
  });
  if (vista === 'juego') camara(0, 0, 0, 0); else a.mirar(0, 3.6, 11 + ids.length * 2.2, 0, 2, 0);
} else if (modoHorda) {
  const n = +modoHorda || 200;
  const rs = (k) => { const x = Math.sin(k * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const pesos = [['caminante', 10], ['corredor', 5], ['acorazado', 3], ['escupidor', 3], ['apestado', 2.5], ['mole', 1], ['aullador', 1.2], ['detonador', 1.8]];
  for (let i = 0; i < n; i++) {
    let r = rs(i + 1) * 30.5, c = 'caminante'; for (const [k, w] of pesos) { r -= w; if (r <= 0) { c = k; break; } }
    const x = (rs(i + 100) - 0.5) * 36, z = -6 + (rs(i + 200) - 0.5) * 30;
    const era = eraQ ?? (i % 6);
    const rot = Math.atan2(-x, 12 - z) + (rs(i + 300) - 0.5) * 0.8;
    poner(c, era, x, z, rot, { semilla: i * 7919 + 3, elite: i % 11 === 0, vel: ZOMBIS[c].velocidad * (0.8 + 0.4 * rs(i + 400)), mueve: true });
  }
  camara(0, -2, 30, 20); if (vista === 'cerca') a.mirar(0, 26, 22, 0, 0, -4);
} else if (modoMuertes) {
  const tipos = [['bala', 0.3], ['bala', 1.0], ['golpe', 1.4], ['explosivo', 1.6], ['explosivo', 2.6], ['fuego', 0.6], ['energia', 0.8], ['perforante', 1.8]];
  const era = eraQ ?? 2;
  tipos.forEach(([tipo, f], i) => {
    for (let k = 0; k < 3; k++) { const c = ['caminante', 'acorazado', 'detonador'][k]; poner(c, era, (i - 3.5) * 3.4, k * 4.2 - 3, Math.PI * 0.0, { vel: 0, tipo, fuerza: f }); }
  });
  a.mirar(0, 12, 18, 0, 0, -1);
  window.P_matarTodos = () => { for (const e of lista) if (e.tipo && !e.muerto) { e.muerto = true; e.vis.morir({ dirX: 0.3, dirZ: -1, fuerza: e.fuerza, tipo: e.tipo }); } };
} else {
  // parrilla clases × eras
  const clases = q.get('clase') ? [q.get('clase')] : CLASES;
  const eras = eraQ !== null ? [eraQ] : [0, 1, 2, 3, 4, 5];
  const sp = 3.3;
  const nc = clases.length, ne = eras.length;
  eras.forEach((era, r) => clases.forEach((cl, c) => {
    for (let k = 0; k < (q.get('clase') && eraQ !== null ? 5 : 1); k++) poner(cl, era, (c - (nc - 1) / 2) * sp + (k - 2) * (q.get('clase') && eraQ !== null ? 2.4 : 0), (r - (ne - 1) / 2) * sp * 0.9, 0, { semilla: 11 + c * 31 + r * 7 + k * 101 });
  }));
  if (vista === 'cerca') a.mirar(0, 1.7 + ne * 1.3, Math.max(nc * sp * 0.5, 6) + ne * 2.4, 0, 0.9, 0);
  else camara(0, 0, nc * sp, ne * sp);
}

let reloj = 0;
a.alCuadro((dtReal) => {
  const dt = Math.min(dtReal, 1 / 20);
  paso(dt);
});
function paso(dt) {
  reloj += dt;
  for (const e of lista) {
    if (e.muerto) continue;
    if (e.mueve) {
      e.x += Math.sin(e.rot) * e.vel * dt; e.z += Math.cos(e.rot) * e.vel * dt;
      if (e.z > 14) { e.z = -22; }
    }
    e.vis.mover?.(Math.sin(e.rot) * e.vel, Math.cos(e.rot) * e.vel);
    e.vis.colocar(e.x, e.z, e.rot);
  }
  vz.actualizar(dt);
}
window.P = {
  vz, lista, juego, a, THREE,
  avanzar(s, dt = 1 / 60) { for (let t = 0; t < s; t += dt) paso(dt); },
  accion(nombre, o = {}, i = null) { for (const [k, e] of lista.entries()) if (i === null || i === k) e.vis.accion(nombre, o); },
  estado(nombre, v = true, i = null) { for (const [k, e] of lista.entries()) if (i === null || i === k) e.vis.estado(nombre, v); },
  matar(tipo = 'bala', fuerza = 0.5, dirX = 0.2, dirZ = -1, i = null) { for (const [k, e] of lista.entries()) if ((i === null || i === k) && !e.muerto) { e.muerto = true; e.vis.morir({ dirX, dirZ, fuerza, tipo }); } },
  stats: () => vz.estadisticas,
  info: () => renderInfo(),
};
function renderInfo() { const r = juego.render.renderer.info; return { calls: r.render.calls, tris: r.render.triangles }; }
paso(0.016); paso(0.016);
a.lista();
