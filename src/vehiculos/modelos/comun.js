// Ayudas comunes de los modelos.
import * as THREE from 'three';
import { Acum, loft, caja, cilX, cilZ, T, tubo, torno, esfera, barra } from '../geo.js';
import { lib, est, cristal, faroMat, luzRoja, neum, quemado, brasa } from '../mats.js';

export const mat4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));

/** Hunde la superficie de una carrocería (loft indexado) en los pasos de rueda: arcos = [{z, y, r, xin, blend}] simétricos en X. */
export function abrirArcos(g, arcos) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(x);
    for (const a of arcos) {
      if (ax <= a.xin) continue;
      const d = Math.hypot(z - a.z, y - a.y);
      const bl = a.blend ?? 0.09;
      if (d >= a.r + bl) continue;
      const t = d <= a.r ? 1 : 1 - (d - a.r) / bl;
      const s = t * t * (3 - 2 * t);
      const nx = ax + (a.xin - ax) * s;
      p.setX(i, Math.sign(x || 1) * nx);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Duplica una lista de estaciones de loft en una franja fina sobre la superficie (rayas de carrera). */
export function franja(est, cx, ancho, subida = 0.008, grosor = 0.05) {
  return est.map((s) => ({ z: s.z, w: ancho, yb: s.yt - grosor, yt: s.yt + subida, e: 3, eb: 3, cx }));
}

/** Estructura base: grupo raíz + chasis (suspensión). */
export function base() {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  return { grupo, chasis };
}

/** Faro redondo: aro cromado + lente emisiva (+ reflector). Devuelve geometrías ya orientadas en el origen (mirando +Z). */
export function faroRedondo(a, M, x, y, z, r = 0.14, lente = null) {
  a.add(cilZ(r * 1.22, 0.05, 20), M.cromo, mat4(x, y, z - 0.01));
  a.add(torno([[0.001, 0], [r, 0.0], [r * 0.95, 0.03], [r * 0.2, 0.05], [0.001, 0.055]], 20).rotateX(Math.PI / 2), lente ?? M.faro, mat4(x, y, z + 0.0));
}

export function placa(a, M, x, y, z, rotY = 0, w = 0.36, h = 0.18) {
  a.add(caja(w, h, 0.012, 0.004, 1), est('placa', { color: 0xe8e0c0, roughness: 0.5, metalness: 0.1 }), mat4(x, y, z, 0, rotY, 0));
}

/** Convierte el modelo en un resto calcinado (materiales quemados, cristales fuera, torreta ladeada). */
export function restosMetal(m, extra) {
  m.chasis.traverse((o) => { if (o.isMesh) { if (o.material.transparent) o.visible = false; else if (!o.userData.conservar) o.material = quemado(); } });
  m.chasis.rotation.z = 0.06; m.chasis.position.y = -0.05;
  if (m.arma) { m.arma.yaw.rotation.y = 0.7; m.arma.yaw.rotation.z = 0.12; }
  for (const r of m.ruedas) if (r.virar) r.virar.rotation.y = (Math.random() - 0.5) * 0.4;
  extra?.();
}

export { THREE, Acum, loft, caja, cilX, cilZ, T, tubo, torno, esfera, barra, lib, est, cristal, faroMat, luzRoja, neum, quemado, brasa };
