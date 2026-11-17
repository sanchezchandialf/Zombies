// Geometrías unitarias redondeadas (caja envolvente [-0.5,0.5]³) compartidas por todas las piezas de la horda.
// Nada de primitivas desnudas: superelipsoides, torneados con bisel, torso y cráneo modelados.
import * as THREE from 'three';

const sgn = (v) => (v < 0 ? -1 : 1);
const spw = (v, e) => sgn(v) * Math.pow(Math.abs(v), e);

/** Malla paramétrica con costura soldada (envuelve en u) y polos con normal exacta. */
function rejilla(nu, nv, fn, { cierraU = true, polos = true } = {}) {
  const pos = [], idx = [];
  const filas = nv + 1, cols = cierraU ? nu : nu + 1;
  for (let j = 0; j <= nv; j++) for (let i = 0; i < cols; i++) { const p = fn(i / nu, j / nv); pos.push(p[0], p[1], p[2]); }
  const at = (i, j) => j * cols + (cierraU ? i % nu : i);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    idx.push(a, d, b, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (polos && cierraU) {
    const n = g.attributes.normal;
    for (let i = 0; i < cols; i++) { n.setXYZ(i, 0, 1, 0); n.setXYZ(nv * cols + i, 0, -1, 0); }
  }
  return g;
}

/** Superelipsoide: e=1 esfera; e<1 caja redondeada. */
function superElipsoide(e1, e2, nu = 22, nv = 14, deforma = null) {
  return rejilla(nu, nv, (u, v) => {
    const fi = Math.PI / 2 - v * Math.PI, th = u * Math.PI * 2;
    const cp = spw(Math.cos(fi), e1), sp = spw(Math.sin(fi), e1);
    let x = 0.5 * cp * spw(Math.cos(th), e2), z = 0.5 * cp * spw(Math.sin(th), e2), y = 0.5 * sp;
    if (deforma) { const r = deforma(x, y, z); x = r[0]; y = r[1]; z = r[2]; }
    return [x, y, z];
  });
}

/** Torneado: perfil = [[radio, y], …] de arriba a abajo (radio 0 en los extremos). */
function torneado(perfil, nu = 24) {
  const nv = perfil.length - 1;
  return rejilla(nu, nv, (u, v) => {
    const f = v * nv, j = Math.min(nv - 1, Math.floor(f)), t = f - j;
    const r = perfil[j][0] + (perfil[j + 1][0] - perfil[j][0]) * t, y = perfil[j][1] + (perfil[j + 1][1] - perfil[j][1]) * t;
    const th = u * Math.PI * 2;
    return [r * Math.cos(th), y, r * Math.sin(th)];
  });
}

/** Perfil de cilindro con bisel redondeado. */
function perfilCilindro(r = 0.5, h = 1, b = 0.08, pasosB = 4, abomba = 0) {
  const p = [[0, h / 2]];
  const rad = (y) => r * (1 - abomba * Math.pow((2 * y) / h, 2));
  for (let k = 0; k <= pasosB; k++) { const a = (k / pasosB) * Math.PI / 2; p.push([rad(h / 2 - b) - b + b * Math.sin(a), h / 2 - b + b * Math.cos(a)]); }
  const n = 6;
  for (let k = 1; k < n; k++) { const y = h / 2 - b - ((h - 2 * b) * k) / n; p.push([rad(y), y]); }
  for (let k = 0; k <= pasosB; k++) { const a = (k / pasosB) * Math.PI / 2; p.push([rad(-h / 2 + b) - b + b * Math.cos(a), -h / 2 + b - b * Math.sin(a)]); }
  p.push([0, -h / 2]);
  return p;
}

function cilindro() { return torneado(perfilCilindro(0.5, 1, 0.07, 4, 0), 24); }
function barril() { return torneado(perfilCilindro(0.5, 1, 0.07, 4, 0.16), 24); }
function cono() {
  const p = [[0, 0.5], [0.035, 0.49], [0.09, 0.4]];
  for (let k = 1; k < 7; k++) p.push([0.09 + (0.41 * k) / 7 * 0.96, 0.4 - (0.8 * k) / 7]);
  for (let k = 0; k <= 4; k++) { const a = (k / 4) * Math.PI / 2; p.push([0.42 + 0.08 * Math.sin(a), -0.42 - 0.08 * (1 - Math.cos(a)) * 0.9]); }
  p.push([0, -0.5]);
  return torneado(p, 20);
}
function cupula() {
  const p = [[0, 0.5]];
  for (let k = 1; k <= 10; k++) { const a = (k / 10) * Math.PI / 2; p.push([0.5 * Math.sin(a), -0.5 + Math.cos(a) * 1.0 * 1.0]); }
  p.push([0.5, -0.5 + 0.0]); p.push([0.46, -0.5]); p.push([0, -0.5]);
  // ajuste: el domo ocupa toda la altura (y de 0.5 a -0.5)
  return torneado(p, 24);
}
function toro() {
  const R = 0.4, r = 0.1;
  return rejilla(26, 10, (u, v) => {
    const a = u * Math.PI * 2, b = v * Math.PI * 2;
    return [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)];
  }, { polos: false });
}

/** Segmento de extremidad: cápsula ahusada con leve abultamiento muscular. y de +0.5 (proximal) a −0.5 (distal). */
function segmento() {
  const nv = 16, capH = 0.3, perfil = [];
  for (let j = 0; j <= nv; j++) {
    const y = 0.5 - j / nv;
    const t = 0.5 - y;                        // 0 proximal → 1 distal
    let r = 0.5 * (1 - 0.2 * t) * (1 + 0.07 * Math.sin(Math.min(1, t * 1.6) * Math.PI));
    const d = Math.abs(y) - (0.5 - capH);
    if (d > 0) r *= Math.sqrt(Math.max(0, 1 - (d / capH) * (d / capH)));
    perfil.push([r, y]);
  }
  perfil[0][0] = 0; perfil[nv][0] = 0;
  return torneado(perfil, 14);
}

/** Torso con hombros, pecho, cintura y cadera. Anchura total 1, profundidad 1, altura 1. */
function torso() {
  const nv = 22;
  const ancho = (y) => { // y de 0.5 (arriba) a -0.5
    const t = y + 0.5;
    const hombro = Math.exp(-Math.pow((t - 0.78) / 0.16, 2));
    const cintura = Math.exp(-Math.pow((t - 0.28) / 0.2, 2));
    return 0.72 + 0.28 * hombro - 0.13 * cintura + 0.1 * Math.exp(-Math.pow(t / 0.15, 2));
  };
  const hondo = (y) => { const t = y + 0.5; return 0.74 + 0.26 * Math.exp(-Math.pow((t - 0.62) / 0.22, 2)) - 0.1 * Math.exp(-Math.pow((t - 0.22) / 0.18, 2)); };
  return rejilla(26, nv, (u, v) => {
    const y = 0.5 - v;
    const cTop = 0.17, cBot = 0.09;
    let f = 1;
    if (y > 0.5 - cTop) { const d = (y - (0.5 - cTop)) / cTop; f = Math.sqrt(Math.max(0, 1 - d * d)); f = 0.35 + 0.65 * f; if (v < 0.001) f = 0; }
    else if (y < -0.5 + cBot) { const d = (-0.5 + cBot - y) / cBot; f = Math.sqrt(Math.max(0, 1 - d * d)); }
    const th = u * Math.PI * 2;
    const w = ancho(y) * f * 0.5, d = hondo(y) * f * 0.5;
    const x = w * spw(Math.cos(th), 0.82), z = d * spw(Math.sin(th), 0.82);
    const zOff = 0.04 * Math.exp(-Math.pow((y - 0.15) / 0.3, 2));
    return [x, y, z + zOff];
  });
}

/** Cráneo: esfera con mandíbula estrechada, frente marcada y mentón retraído (cara hacia +Z). */
function cabeza() {
  return superElipsoide(1, 1, 26, 18, (x, y, z) => {
    const yy = y / 0.5;
    if (yy < 0) {
      const k = Math.pow(-yy, 1.4);
      x *= 1 - 0.26 * k;
      if (z > 0) z *= 1 - 0.22 * k; else z *= 1 - 0.08 * k;
    }
    if (yy > -0.1 && yy < 0.45 && z > 0) z += 0.045 * Math.exp(-Math.pow((yy - 0.2) / 0.22, 2)) * (z / 0.5);
    x *= 0.93;
    return [x, y, z];
  });
}

function mandibula() {
  return superElipsoide(0.8, 0.8, 18, 10, (x, y, z) => {
    const yy = (y + 0.5);
    x *= 0.75 + 0.25 * (1 - yy);
    return [x, y * 0.7, z + (z > 0 ? 0 : 0)];
  });
}

/** Placa curva (chapa de blindaje, hombrera, costilla, bota…): semicilindro hueco abierto hacia −Z. */
function arco(span = Math.PI * 1.1, grosor = 0.07) {
  const pos = [], idx = [];
  const nu = 16, nv = 4;
  const add = (fn, flip) => {
    const base = pos.length / 3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = fn(i / nu, j / nv); pos.push(p[0], p[1], p[2]); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = base + j * (nu + 1) + i, b = a + 1, c = a + (nu + 1) + 1, d = a + (nu + 1);
      if (flip) idx.push(a, b, d, b, c, d); else idx.push(a, d, b, b, d, c);
    }
  };
  const R = 0.5, r = 0.5 - grosor;
  const ang = (u) => (u - 0.5) * span;
  add((u, v) => { const a = ang(u); return [R * Math.sin(a), 0.5 - v, R * Math.cos(a) - 0.0]; }, false);   // exterior
  add((u, v) => { const a = ang(u); return [r * Math.sin(a), 0.5 - v, r * Math.cos(a)]; }, true);          // interior
  add((u, v) => { const a = ang(u), rr = R - (R - r) * v; return [rr * Math.sin(a), 0.5, rr * Math.cos(a)]; }, false); // borde superior
  add((u, v) => { const a = ang(u), rr = R - (R - r) * v; return [rr * Math.sin(a), -0.5, rr * Math.cos(a)]; }, true);  // inferior
  for (const s of [-1, 1]) add((u, v) => { const a = s * span / 2, rr = R - (R - r) * u; return [rr * Math.sin(a), 0.5 - v, rr * Math.cos(a)]; }, s > 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // centra en z: el arco abarca z∈[R·cos(span/2), R]
  g.translate(0, 0, -(R + R * Math.cos(span / 2)) / 2);
  const bb = new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  const s = new THREE.Vector3(); bb.getSize(s);
  g.scale(1 / Math.max(s.x, 1e-6), 1, 1 / Math.max(s.z, 1e-6));
  return g;
}

/** Tricornio: ala triangular redondeada con bordes vueltos hacia arriba (esquina al frente +Z). */
function tricornio() {
  const nu = 36, nv = 8;
  const radio = (th) => 0.5 * (0.7 + 0.3 * Math.cos(3 * (th - Math.PI / 2))) / 1.0;
  return rejilla(nu, nv * 2 + 1, (u, v) => {
    const th = u * Math.PI * 2; const R = radio(th);
    // v 0..0.5: cara superior de centro a borde; 0.5..1: cara inferior de borde a centro
    const s = v < 0.5 ? v * 2 : (1 - v) * 2;       // 0 centro → 1 borde
    const rr = R * Math.min(1, s * 1.0);
    const lift = 0.5 * Math.pow(s, 2.2);
    const y = v < 0.5 ? -0.25 + lift + 0.05 : -0.25 + lift - 0.05;
    return [rr * Math.sin(th), y, rr * Math.cos(th)];
  }, { polos: false });
}

const FABRICAS = {
  esfera: () => superElipsoide(1, 1, 22, 14),
  bloque: () => superElipsoide(0.34, 0.34, 20, 14),
  almohada: () => superElipsoide(0.55, 0.55, 20, 14),
  segmento, torso, cabeza, mandibula, cilindro, barril, cono, cupula, toro,
  arco: () => arco(Math.PI * 1.1, 0.08),
  arcoFino: () => arco(Math.PI * 1.5, 0.05),
  tricornio,
};
export const KINDS = Object.keys(FABRICAS);
export const KIND = Object.fromEntries(KINDS.map((k, i) => [k, i]));

const cache = new Map();
export function geometria(kind) {
  let g = cache.get(kind);
  if (!g) { g = FABRICAS[kind](); cache.set(kind, g); }
  return g;
}
export function liberarGeometrias() { for (const g of cache.values()) g.dispose(); cache.clear(); }
