// Banco de pulido de personajes, zombis, armas y FX a distancia de juego real (cámara del render: fov 35, 22 m, 55°).
//   ?era=0..5  ?rol=soldado  ?hora=0.5  ?dist=22 (acercar: 8)  ?modo=horda|roles|fx|armas  ?t=segundos
// Captura: node pruebas/pz-captura.mjs "http://127.0.0.1:5173/pruebas/pulido.html?era=0" pruebas/capturas/pp --pasos "P.render()@@x"
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearVisualesJugadores } from '../src/personajes/jugadores.js';
import { crearVisualesZombis } from '../src/personajes/zombis.js';
import { crearModeloArma } from '../src/armas/modelos.js';
import { ERAS } from '../src/datos/eras.js';
import { ROLES } from '../src/datos/roles.js';
import { ZOMBIS } from '../src/datos/zombis.js';

const q = new URLSearchParams(location.search);
const era = +(q.get('era') ?? 0), rol = q.get('rol') || 'soldado', modo = q.get('modo') || 'horda';
const a = await crearArnes({ eraIdx: era, hora: +(q.get('hora') ?? 0.5), orbita: false, suelo: true });
const juego = a.juego;
juego.render.camaraExterna = true;
const vj = crearVisualesJugadores(juego), vz = crearVisualesZombis(juego);
const cam = juego.render.camara;
cam.fov = 35; cam.updateProjectionMatrix();
const dist = +(q.get('dist') ?? 22), cab = 55 * Math.PI / 180;
const fx0 = +(q.get('cx') ?? 0), fz0 = +(q.get('cz') ?? 0);
a.mirar(fx0, 0.7 + dist * Math.sin(cab), fz0 + dist * Math.cos(cab), fx0, 0.7, fz0);

const armaDe = (r, e, arq) => { const id = ERAS[e].armas[arq || ROLES[r].equipo.primaria]; try { return crearModeloArma(id); } catch (err) { console.error(err); return null; } };
const jug = [], zs = [];
const CLASES = Object.keys(ZOMBIS);
function ponerJ(r, x, z, rot, mueve = 0) { const v = vj.crear(r, era); v.equipar(armaDe(r, era)); v.colocar(x, z, rot); jug.push({ v, x, z, rot, mueve }); return v; }

if (modo === 'horda') {
  ponerJ(rol, 0, 0, 0.6);
  CLASES.forEach((c, i) => {
    const ang = -Math.PI * 0.95 + (i / (CLASES.length - 1)) * Math.PI * 1.9, R = 4.2 + (c === 'mole' ? 0.8 : 0);
    const x = Math.sin(ang) * R, z = -Math.cos(ang) * R;
    const v = vz.crear(c, era, { semilla: 100 + i * 37 });
    zs.push({ v, x, z, rot: Math.atan2(-x, -z), vel: ZOMBIS[c].velocidad });
  });
} else if (modo === 'roles') {
  Object.keys(ROLES).forEach((r, i) => ponerJ(r, (i - 2) * 2.4, 0, 0.5 + i * 0.3, 1));
} else if (modo === 'clases') {
  CLASES.forEach((c, i) => { const x = ((i % 4) - 1.5) * 2.3, z = Math.floor(i / 4) * 2.8 - 1.4; zs.push({ v: vz.crear(c, era, { semilla: 7 + i * 13 }), x, z, rot: +(q.get('rot') ?? 0.25), vel: q.get('quieto') ? 0 : ZOMBIS[c].velocidad }); });
} else if (modo === 'fx') {
  ponerJ(rol, 0, 2.5, Math.PI);
  setTimeout(() => {}, 0);
} else if (modo === 'lista') {
  // ?arq=pistola,precision : el arquetipo pedido en las seis eras (filas)
  const arqs = (q.get('arq') || 'pistola,precision').split(',');
  arqs.forEach((arq, f) => { for (let e = 0; e < 6; e++) { const g = armaDe('soldado', e, arq); if (!g) continue; g.position.set((e - 2.5) * (arq === 'pistola' || arq === 'ligera' ? 0.75 : 1.35) - (arq === 'pistola' ? 0 : 0.4), 0.9, f * 1.1 - 0.5); g.rotation.y = Math.PI / 2; juego.render.escena.add(g); } });
} else if (modo === 'armas') {
  const arqs = Object.keys(ERAS[era].armas);
  arqs.forEach((arq, i) => { const g = armaDe('soldado', era, arq); if (!g) return; g.position.set((i % 4 - 1.5) * 1.3, 0.9, Math.floor(i / 4) * 1.0 - 0.5); g.rotation.y = Math.PI / 2; juego.render.escena.add(g); });
}

let reloj = 0;
function paso(dt) {
  reloj += dt;
  for (const j of jug) { if (j.mueve) j.v.mover(Math.sin(j.rot) * 2.5, Math.cos(j.rot) * 2.5); j.v.colocar(j.x, j.z, j.rot); }
  for (const z of zs) { z.v.mover(Math.sin(z.rot) * z.vel, Math.cos(z.rot) * z.vel); z.v.colocar(z.x, z.z, z.rot); }
  vj.actualizar(dt); vz.actualizar(dt);
}
window.P = {
  juego, jug, zs, vz, vj, THREE,
  avanzar(s, dt = 1 / 30) { for (let t = 0; t < s; t += dt) paso(dt); },
  render() { juego.avanzar(1 / 60); const r = juego.render.renderer.info; return { calls: r.render.calls, tris: r.render.triangles }; },
  fx(nombre, x, z, o, y = 0.2) { juego.fx.emitir(nombre, { x, y, z }, o); },
  /** Avanza el juego entero (fx incluidos) sin dibujar. */
  simular(s, dt = 1 / 30) { const R = juego.render.renderer, d = R.render; R.render = () => {}; const c = juego.render.composer; const dc = c?.render; if (c) c.render = () => {}; try { for (let t = 0; t < s; t += dt) { juego.avanzar(dt); vz.actualizar(0); } } finally { R.render = d; if (c) c.render = dc; } },
  escenaFx() {
    const fx = juego.fx;
    fx.crearEmisor('fuego', { x: -3.2, y: 0.05, z: -1 }, { escala: 1 });
    fx.crearEmisor('fuego', { x: 3.2, y: 0.05, z: -1.2 }, { escala: 1.8 });
    fx.calco('crater', -2.5, 3, 3.2); fx.calco('quemadura', 2.8, 3.2, 2.4);
    fx.calco('sangre', 0, -2.6, 1.6, { dirX: 1, dirZ: 0.2 }); fx.calco('sangre', 0.8, -3.2, 1.0, { dirX: 0.3, dirZ: -1 });
    fx.emitir('sangre_grande', { x: -0.8, y: 1.1, z: -2.6 }, { dirX: -1, dirY: 0.3, dirZ: 0.2, escala: 1.2 });
  },
  matar(i, tipo = 'bala', f = 0.8) { const z = zs[i]; z.v.morir({ dirX: Math.sin(z.rot) * -1, dirZ: -Math.cos(z.rot), fuerza: f, tipo }); zs.splice(i, 1); },
};
paso(1 / 30); P.avanzar(+(q.get('t') ?? 1.2));
juego.detener(); P.render();
a.lista();
