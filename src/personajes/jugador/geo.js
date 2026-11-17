// Geometrías compartidas (cacheadas por dimensiones) para los personajes jugadores.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const C = new Map();
const g = (k, f) => { let v = C.get(k); if (!v) { v = f(); C.set(k, v); } return v; };
const q = (n) => Math.round(n * 1000) / 1000;

export const geoCaja = (w, h, d, r = 0.02) => g(`c${q(w)}|${q(h)}|${q(d)}|${q(r)}`, () => {
  const rr = Math.max(0.002, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  return new RoundedBoxGeometry(w, h, d, 3, rr);
});
/** Esfera unidad (se escala por pieza para elipsoides). */
export const geoEsfera = () => g('s', () => new THREE.SphereGeometry(1, 22, 16));
/** Cúpula (media esfera superior) de radio 1. */
export const geoDomo = () => g('d', () => new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2));
export const geoCil = (rt, rb, h, seg = 18) => g(`y${q(rt)}|${q(rb)}|${q(h)}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1));
export const geoCono = (r, h, seg = 10) => g(`n${q(r)}|${q(h)}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
export const geoToro = (R, r, seg = 20) => g(`t${q(R)}|${q(r)}|${seg}`, () => new THREE.TorusGeometry(R, r, 8, seg));
export const geoCapsula = (r, len) => g(`k${q(r)}|${q(len)}`, () => new THREE.CapsuleGeometry(r, len, 5, 12));
/** Segmento de miembro con taper y extremos redondeados: nace en y=0 (articulación) y baja hasta -len. */
export const geoSeg = (rt, rb, len) => g(`l${q(rt)}|${q(rb)}|${q(len)}`, () => {
  const N = 6, P = [];
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI / 2; P.push(new THREE.Vector2(Math.max(1e-4, rb * Math.sin(a)), -len - 0.75 * rb * Math.cos(a))); }
  for (let i = 1; i <= N; i++) { const a = (i / N) * Math.PI / 2; P.push(new THREE.Vector2(Math.max(1e-4, rt * Math.cos(a)), 0.75 * rt * Math.sin(a))); }
  return new THREE.LatheGeometry(P, 16);
});

export const geoAbierto = (rt, rb, h, t0, tl) => g(`a${q(rt)}|${q(rb)}|${q(h)}|${q(t0)}|${q(tl)}`, () => new THREE.CylinderGeometry(rt, rb, h, 20, 3, true, t0, tl));

export function liberarGeometrias() { for (const v of C.values()) v.dispose(); C.clear(); }
