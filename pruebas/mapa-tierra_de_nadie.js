// Prueba del módulo Escenarios: carga el mapa de la era con el gestor real.
// URL: ?era=N  &vista=juego|alta|cenit|oblicua  &cx=&cz= (centro de la cámara)  &hora=0.25  &depurar=colision  &figuras=0  &calidad=media
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearEscenarios } from '../src/escenarios/index.js';

const a = await crearArnes({ eraIdx: 0, hora: 0.5, suelo: false, sistemas: { escenarios: crearEscenarios }, camara: { dist: 15, alto: 21, objetivo: [0, 0.7, 0] } });
const J = a.juego, op = J.opciones, era = op.era ?? 2;
if (op.calidad) J.render.calidad?.(op.calidad);
if (op.hora != null) J.render.establecerHora?.(op.hora, true);
const t0 = performance.now();
const mapa = await J.escenarios.cargar(era);
const ms = Math.round(performance.now() - t0);

// Vistas: «juego» replica la cámara real (55º, 26 m); «alta» ve toda la arena; «cenit» desde arriba.
const cx = op.cx ?? 0, cz = op.cz ?? 0, v = op.vista ?? 'juego';
const dist = op.dist ?? (v === 'alta' ? 62 : v === 'cenit' ? 80 : 26);
const cab = v === 'cenit' ? 78 : v === 'oblicua' ? 40 : 55;
const pit = (cab * Math.PI) / 180;
a.mirar(cx, Math.sin(pit) * dist + 0.7, cz + Math.cos(pit) * dist, cx, 0.7, cz);
a.orbita.update?.();

// Figuras de escala (1,8 m): jugadores en azul, puntos de aparición en rojo tenue
if (op.figuras !== 0) {
  const g = new THREE.CapsuleGeometry(0.34, 1.1, 4, 10);
  const mA = new THREE.MeshStandardMaterial({ color: 0x3a8cff, roughness: 0.6 }), mR = new THREE.MeshStandardMaterial({ color: 0x9a2a2a, roughness: 0.7 });
  for (const p of mapa.inicioJugadores) { const m = new THREE.Mesh(g, mA); m.position.set(p.x, 0.9, p.z); m.castShadow = true; J.render.escena.add(m); }
  if (op.spawns) for (const p of mapa.puntosAparicion) { const m = new THREE.Mesh(g, mR); m.position.set(p.x, 0.9, p.z); J.render.escena.add(m); }
}
window.a = a; window.mapa = mapa; window.J = J;
window.__info = { id: mapa.id, ms, validacion: mapa.validacion, mallas: mapa.validacion?.mallas, cuerpos: J.fisica.estaticos.length, drawCalls: () => J.render.renderer.info.render.calls, tris: () => J.render.renderer.info.render.triangles };
console.log('[prueba] escenario', mapa.id, ms + ' ms', JSON.stringify(mapa.validacion));
a.lista();
