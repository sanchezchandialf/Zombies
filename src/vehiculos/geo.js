// Utilidades de geometría para los modelos de vehículos: lofts de carrocería, tornos, ruedas, acumulador por material.
// Todo procedural. Los modelos miran a +Z, +Y arriba, X lateral.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { uvMundo } from '../render/materiales/index.js';
import { escalaUV } from './mats.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

/** Transforma una geometría en el sitio: posición, rotación (rad XYZ) y escala. Devuelve la misma geometría. */
export function T(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  return g;
}

/** Caja con aristas redondeadas. */
export function caja(w, h, d, r = 0.03, seg = 2) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
}
export function cil(rt, rb, h, seg = 18) { return new THREE.CylinderGeometry(rt, rb, h, seg, 1); }
/** Cilindro con eje a lo largo de Z. */
export function cilZ(r, h, seg = 18, rb = r) { const g = new THREE.CylinderGeometry(r, rb, h, seg, 1); g.rotateX(Math.PI / 2); return g; }
/** Cilindro con eje a lo largo de X. */
export function cilX(r, h, seg = 18, rb = r) { const g = new THREE.CylinderGeometry(r, rb, h, seg, 1); g.rotateZ(Math.PI / 2); return g; }
export function esfera(r, ws = 14, hs = 10) { return new THREE.SphereGeometry(r, ws, hs); }

/** Torno: perfil [[radio, y], …] girado en torno a Y. */
export function torno(perfil, seg = 24) {
  const pts = perfil.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, seg);
}

/** Tubo que sigue una polilínea suave. */
export function tubo(puntos, radio, seg = 24, rad = 8, cerrado = false, radioFin = null) {
  const c = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(p[0], p[1], p[2])), cerrado, 'centripetal');
  const g = new THREE.TubeGeometry(c, seg, radio, rad, cerrado);
  if (radioFin !== null && radioFin !== radio) {
    // estrecha hacia el final (colas, trompas)
    const pos = g.attributes.position, n = seg + 1, m = rad + 1;
    for (let i = 0; i <= seg; i++) {
      const k = radioFin / radio, f = 1 + (k - 1) * (i / seg);
      const cp = c.getPoint(i / seg);
      for (let j = 0; j < m; j++) {
        const idx = i * m + j;
        pos.setXYZ(idx, cp.x + (pos.getX(idx) - cp.x) * f, cp.y + (pos.getY(idx) - cp.y) * f, cp.z + (pos.getZ(idx) - cp.z) * f);
      }
    }
    g.computeVertexNormals();
  }
  return g;
}

/** Cono/cilindro cónico entre dos puntos (miembro de un animal, brazo, tubo recto). */
export function barra(a, b, ra, rb = ra, seg = 10) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(rb, ra, len, seg, 1);
  g.rotateX(Math.PI / 2);                  // eje Y → Z
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  const mm = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(mm);
  return g;
}

/** Forma 2D extruida con bisel (perfil en XY, profundidad en Z centrada). */
export function extruir(pts, prof, bisel = 0.03, pasos = 1) {
  const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(sh, { depth: prof, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 2, steps: pasos, curveSegments: 10 });
  g.translate(0, 0, -prof / 2);
  return g;
}

const sgn = (x) => (x < 0 ? -1 : 1);
const CAMPOS = ['z', 'w', 'yb', 'yt', 'e', 'eb', 'cx', 'cy'];
function hermite(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * Carrocería por secciones. `est` = [{ z, w (semiancho), yb (fondo), yt (techo), e (exponente de la forma superior, 2 = elipse,
 * 6 = casi rectángulo), eb (exponente inferior), cx (desplazamiento lateral) }, …] ordenado por z.
 * Interpola con Catmull-Rom entre estaciones. Devuelve geometría indexada con normales suaves y tapas planas.
 */
export function loft(est, { aro = 32, pasos = 8, tapas = true } = {}) {
  const E = est.map((s) => ({ z: s.z, w: s.w, yb: s.yb, yt: s.yt, e: s.e ?? 3, eb: s.eb ?? s.e ?? 3, cx: s.cx ?? 0, cy: 0 }));
  const n = E.length, anillos = (n - 1) * pasos + 1;
  const pos = [], idx = [];
  const val = (campo, i, t) => {
    const a = E[Math.max(0, i - 1)][campo], b = E[i][campo], c = E[Math.min(n - 1, i + 1)][campo], d = E[Math.min(n - 1, i + 2)][campo];
    return hermite(a, b, c, d, t);
  };
  for (let r = 0; r < anillos; r++) {
    const f = r / pasos, i = Math.min(n - 2, Math.floor(f)), t = r === anillos - 1 ? 1 : f - i;
    const z = val('z', i, t), w = Math.max(1e-3, val('w', i, t)), yb = val('yb', i, t), yt = Math.max(yb + 1e-3, val('yt', i, t));
    const e = Math.max(1.6, val('e', i, t)), eb = Math.max(1.6, val('eb', i, t)), cx = val('cx', i, t);
    const cy = (yb + yt) / 2, hh = (yt - yb) / 2;
    for (let k = 0; k < aro; k++) {
      const a = (k / aro) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const ex = 2 / (s >= 0 ? e : eb);
      pos.push(cx + w * sgn(c) * Math.pow(Math.abs(c), ex), cy + hh * sgn(s) * Math.pow(Math.abs(s), ex), z);
    }
  }
  for (let r = 0; r < anillos - 1; r++) for (let k = 0; k < aro; k++) {
    const k1 = (k + 1) % aro, p0 = r * aro + k, p1 = r * aro + k1, p2 = (r + 1) * aro + k, p3 = (r + 1) * aro + k1;
    idx.push(p0, p1, p2, p1, p3, p2);
  }
  if (tapas) {
    for (const [r, cara] of [[0, -1], [anillos - 1, 1]]) {
      const base = pos.length / 3; let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < aro; k++) { const o = (r * aro + k) * 3; cx += pos[o]; cy += pos[o + 1]; cz = pos[o + 2]; }
      cx /= aro; cy /= aro;
      for (let k = 0; k < aro; k++) { const o = (r * aro + k) * 3; pos.push(pos[o], pos[o + 1], pos[o + 2]); }
      const c0 = pos.length / 3; pos.push(cx, cy, cz);
      for (let k = 0; k < aro; k++) { const k1 = (k + 1) % aro; if (cara > 0) idx.push(c0, base + k, base + k1); else idx.push(c0, base + k1, base + k); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Guardabarros: medio toro-arco alrededor de la rueda (eje X). `a0`..`a1` en rad medidos desde +Z hacia arriba. */
export function guardabarros(radio, ancho, grosor = 0.035, a0 = -0.35, a1 = Math.PI + 0.35, seg = 18) {
  const pts = [];
  const g = new THREE.CylinderGeometry(radio, radio, ancho, seg, 1, true, 0, 1);
  g.dispose();
  // Perfil en forma de arco hueco con borde redondeado (extrusión de un anillo parcial)
  const sh = new THREE.Shape();
  const ri = radio, ro = radio + grosor;
  sh.absarc(0, 0, ro, a0, a1, false);
  sh.absarc(0, 0, ri, a1, a0, true);
  const ex = new THREE.ExtrudeGeometry(sh, { depth: ancho, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: seg });
  ex.translate(0, 0, -ancho / 2);
  ex.rotateY(Math.PI / 2);       // el plano del arco pasa a YZ; la profundidad, a X
  return ex;
}

// ───────────────────────────── Ruedas ─────────────────────────────
/** Neumático con flancos redondeados y tacos. Eje X. */
export function neumatico(R, ancho, rInt, tacos = 24, altoTaco = 0.02) {
  const W = ancho, rr = rInt;
  const perfil = [
    [rr, -W * 0.44], [rr + (R - rr) * 0.22, -W * 0.5], [R - (R - rr) * 0.2, -W * 0.47], [R - 0.012, -W * 0.34], [R, -W * 0.2],
    [R, W * 0.2], [R - 0.012, W * 0.34], [R - (R - rr) * 0.2, W * 0.47], [rr + (R - rr) * 0.22, W * 0.5], [rr, W * 0.44],
  ];
  const lat = torno(perfil, 32); lat.rotateZ(Math.PI / 2);
  const partes = [lat];
  if (tacos > 0) {
    for (let i = 0; i < tacos; i++) {
      const a = (i / tacos) * Math.PI * 2;
      const t = caja(W * 0.7, altoTaco * 2.2, R * 0.13, 0.008, 1);
      T(t, 0, 0, 0); t.translate(0, R - altoTaco * 0.4, 0); t.rotateX(a);
      partes.push(t);
    }
  }
  return normalizar(partes);
}

/** Convierte todas las geometrías a no indexadas con position+normal+uv y las fusiona. */
export function normalizar(lista) {
  const out = lista.map((g) => {
    let h = g.index ? g.toNonIndexed() : g;
    if (g !== h) g.dispose();
    if (!h.attributes.normal) h.computeVertexNormals();
    if (!h.attributes.uv) h.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2));
    for (const k of Object.keys(h.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') h.deleteAttribute(k);
    return h;
  });
  return mergeGeometries(out, false);
}

/**
 * Acumulador de geometría por material: `a.add(geo, material, matriz?)` y `a.volcar(grupo)` crea un Mesh por material
 * con la geometría fusionada. Aplica UV por proyección de caja con la escala natural del material.
 */
export class Acum {
  constructor() { this.m = new Map(); }
  add(geo, mat, matriz = null, uvEsc = null) {
    if (matriz) geo.applyMatrix4(matriz);
    let h = geo.index ? geo.toNonIndexed() : geo;
    if (h !== geo) geo.dispose();
    if (!h.attributes.normal) h.computeVertexNormals();
    const esc = uvEsc ?? escalaUV(mat);
    if (esc) h = uvMundo(h, esc);
    else if (!h.attributes.uv) h.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2));
    for (const k of Object.keys(h.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') h.deleteAttribute(k);
    if (mat.vertexColors && !h.attributes.color) h.setAttribute('color', new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 3).fill(1), 3));
    let e = this.m.get(mat); if (!e) this.m.set(mat, (e = []));
    e.push(h);
    return this;
  }
  volcar(grupo, { sombra = true, nombre = '' } = {}) {
    const mallas = [];
    for (const [mat, lista] of this.m) {
      const g = mergeGeometries(lista, false);
      for (const l of lista) l.dispose();
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = sombra && !mat.transparent; mesh.receiveShadow = sombra && !mat.transparent;
      if (nombre) mesh.name = nombre;
      grupo.add(mesh); mallas.push(mesh);
    }
    this.m.clear();
    return mallas;
  }
}

export { THREE };
