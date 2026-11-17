// Piezas paramétricas del Arsenal y el Constructor que las acumula por material y las fusiona.
// Convención de ejes de las armas: cañón a +Z, +Y arriba, metros. Los perfiles se dibujan de lado como pares [z, y] y se extruyen en X.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PI = Math.PI;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();

// ───────────────────────────── Geometrías base ─────────────────────────────
/** Cilindro a lo largo de +Z desde z=0 hasta z=l. rBack en z=0, rFront en z=l. oct=true → prisma con la cara plana arriba. */
export function gCil(rBack, l, rFront = rBack, seg = 14, oct = false) {
  const g = new THREE.CylinderGeometry(rFront, rBack, l, seg, 1, false);
  if (oct) g.rotateY(PI / seg);
  g.rotateX(PI / 2); g.translate(0, 0, l / 2);
  return g;
}
export function gCaja(w, h, l, r = 0.004, seg = 2) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, l / 2 - 1e-4);
  return new RoundedBoxGeometry(w, h, l, seg, Math.max(r, 0.0005));
}
function redondear(pts, r) {
  const n = pts.length, P = pts.map((p) => new THREE.Vector2(p[0], p[1])), seg = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n];
    const da = a.distanceTo(b), dc = c.distanceTo(b);
    const ra = Math.min(r, da * 0.45), rc = Math.min(r, dc * 0.45);
    seg.push([b.clone().add(a.clone().sub(b).setLength(ra)), b, b.clone().add(c.clone().sub(b).setLength(rc))]);
  }
  return seg;
}
/** Perfil lateral [[z,y],…] extruido en X con grosor w (centrado en x=0). `suave` redondea las esquinas (m). */
export function gPerfil(pts, w, { bisel = 0.0025, suave = 0 } = {}) {
  const sh = new THREE.Shape();
  if (suave > 0) {
    const s = redondear(pts, suave);
    sh.moveTo(s[0][2].x, s[0][2].y);
    for (let i = 1; i <= s.length; i++) { const k = s[i % s.length]; sh.lineTo(k[0].x, k[0].y); sh.quadraticCurveTo(k[1].x, k[1].y, k[2].x, k[2].y); }
  } else {
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  }
  const bis = Math.min(bisel, w * 0.3);
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(w - bis * 2, 0.0004), bevelEnabled: bis > 0, bevelThickness: bis, bevelSize: bis * 0.9, bevelSegments: 1, curveSegments: 5 });
  g.rotateY(-PI / 2);
  g.computeBoundingBox(); g.translate(-(g.boundingBox.min.x + g.boundingBox.max.x) / 2, 0, 0);
  return g;
}
/** Sólido de revolución sobre el eje Z. pts = [[radio, z],…] con z creciente. */
export function gRev(pts, seg = 18) {
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  g.rotateX(PI / 2);
  return g;
}
export const gToro = (R, r, seg = 18, rad = 8) => new THREE.TorusGeometry(R, r, rad, seg);
export const gEsf = (r, seg = 14) => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));
export function gTubo(pts, r, seg = 24, rad = 7) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, rad, false);
}
export const gCirc = (r, seg = 18) => new THREE.CircleGeometry(r, seg);
/** Engranaje con eje Z: dientes trapezoidales y agujero central. */
export function gEngranaje(R, dientes = 12, ancho = 0.01, prof = 0.12, rHueco = 0.3) {
  const sh = new THREE.Shape(), rr = R * (1 - prof);
  for (let i = 0; i < dientes; i++) {
    const a = (i / dientes) * 2 * PI, d = (PI * 2) / dientes;
    const pts = [[rr, a], [R, a + d * 0.2], [R, a + d * 0.5], [rr, a + d * 0.7]];
    pts.forEach(([r, an], k) => { const x = Math.cos(an) * r, y = Math.sin(an) * r; (i === 0 && k === 0) ? sh.moveTo(x, y) : sh.lineTo(x, y); });
  }
  sh.closePath();
  if (rHueco > 0) { const h = new THREE.Path(); h.absarc(0, 0, R * rHueco, 0, 2 * PI, true); sh.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: ancho, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -ancho / 2);
  return g;
}
/** Polígono de un sector anular (para cargadores curvos, guardamontes, hojas curvas). Devuelve pares [z,y]. */
export function banda(cz, cy, R0, R1, a0, a1, n = 12) {
  const a = [], b = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    a.push([cz + Math.cos(t) * R1, cy + Math.sin(t) * R1]);
    b.push([cz + Math.cos(t) * R0, cy + Math.sin(t) * R0]);
  }
  return a.concat(b.reverse());
}
/** Cilindro con n acanaladuras (tambor de revólver). Eje Z, de z=0 a z=l. */
export function gTamborAcanalado(R, n, prof, l, chambers = true) {
  const sh = new THREE.Shape(), pasos = n * 14;
  for (let i = 0; i <= pasos; i++) {
    const a = (i / pasos) * 2 * PI;
    const f = Math.max(0, Math.cos(a * n) - 0.2) / 0.8;
    const rr = R - prof * Math.pow(f, 0.7);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? sh.lineTo(x, y) : sh.moveTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: l, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 4 });
  g.computeBoundingBox(); g.translate(0, 0, -g.boundingBox.min.z);
  return g;
}

// ───────────────────────────── Constructor ─────────────────────────────
const UV = 3.2;
/** Acumula geometrías por material con una pila de transformaciones y las fusiona en una malla por material. */
export class Constructor {
  constructor() { this.por = new Map(); this.pila = [new THREE.Matrix4()]; }
  get M() { return this.pila[this.pila.length - 1]; }
  /** Dibuja `fn` con un desplazamiento/giro/escala local. */
  en(pos, fn, rot = [0, 0, 0], esc = 1) {
    e.set(rot[0], rot[1], rot[2]); q.setFromEuler(e); s3.set(...(Array.isArray(esc) ? esc : [esc, esc, esc]));
    const l = new THREE.Matrix4().compose(v3.set(pos[0], pos[1], pos[2]), q, s3);
    this.pila.push(new THREE.Matrix4().multiplyMatrices(this.M, l));
    fn(this);
    this.pila.pop();
    return this;
  }
  /** Añade una geometría ya creada (se transforma y consume). */
  geo(mat, g, pos = [0, 0, 0], rot = [0, 0, 0], esc = 1) {
    e.set(rot[0], rot[1], rot[2]); q.setFromEuler(e); s3.set(...(Array.isArray(esc) ? esc : [esc, esc, esc]));
    m4.compose(v3.set(pos[0], pos[1], pos[2]), q, s3);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(this.M, m4));
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    let l = this.por.get(mat); if (!l) this.por.set(mat, l = []);
    l.push(g);
    return this;
  }
  cil(mat, r, l, pos = [0, 0, 0], o = {}) { return this.geo(mat, gCil(r, l, o.r2 ?? r, o.seg ?? 14, o.oct), pos, o.rot, o.esc); }
  caja(mat, dim, pos = [0, 0, 0], r = 0.004, rot, seg = 2) { return this.geo(mat, gCaja(dim[0], dim[1], dim[2], r, seg), pos, rot); }
  perfil(mat, pts, w, pos = [0, 0, 0], o = {}) { return this.geo(mat, gPerfil(pts, w, o), pos, o.rot, o.esc); }
  rev(mat, pts, pos = [0, 0, 0], o = {}) { return this.geo(mat, gRev(pts, o.seg ?? 18), pos, o.rot, o.esc); }
  toro(mat, R, r, pos = [0, 0, 0], o = {}) { return this.geo(mat, gToro(R, r, o.seg ?? 18, o.rad ?? 8), pos, o.rot, o.esc); }
  esf(mat, r, pos = [0, 0, 0], esc = 1, seg = 14) { return this.geo(mat, gEsf(r, seg), pos, [0, 0, 0], esc); }
  tubo(mat, pts, r, o = {}) { return this.geo(mat, gTubo(pts, r, o.seg ?? 24, o.rad ?? 7), [0, 0, 0], o.rot); }
  circ(mat, r, pos = [0, 0, 0], rot, seg = 18) { return this.geo(mat, gCirc(r, seg), pos, rot); }
  eng(mat, R, n, ancho, pos = [0, 0, 0], rot, o = {}) { return this.geo(mat, gEngranaje(R, n, ancho, o.prof, o.hueco ?? 0.3), pos, rot); }
  tambor(mat, R, n, prof, l, pos = [0, 0, 0]) { return this.geo(mat, gTamborAcanalado(R, n, prof, l), pos); }
  vacio() { return this.por.size === 0; }

  /** Fusiona por material → [{ mat, geo }]. UV planares (u = z, v = x + y) para vetas y rugosidad. */
  construir() {
    const out = [];
    for (const [mat, lista] of this.por) {
      const g = mergeGeometries(lista, false);
      for (const l of lista) l.dispose();
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) * UV, (p.getX(i) + p.getY(i)) * UV);
      g.computeBoundingSphere(); g.computeBoundingBox();
      out.push({ mat, geo: g });
    }
    return out;
  }
}

// ───────────────────────────── Piezas reutilizables ─────────────────────────────
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export { V };

/** Boca con ánima: disco negro hundido en el cañón + corona de metal. */
export function boca(b, z, y, r, { x = 0, mat = 'acero', corona = true, ratio = 0.58 } = {}) {
  b.circ('negro', r * ratio, [x, y, z + 0.0012], [0, 0, 0], 14);
  if (corona) b.cil(mat, r * 1.12, 0.012, [x, y, z - 0.01], { r2: r * 1.12, seg: 14 });
}
/** Cañón redondo u octogonal con ánima. */
export function canon(b, { mat = 'acero', x = 0, y = 0.07, z0 = 0, z1 = 0.6, r = 0.012, r2, oct = false, ánima = true, corona = true } = {}) {
  b.cil(mat, r, z1 - z0, [x, y, z0], { r2: r2 ?? r, seg: oct ? 8 : 14, oct });
  if (ánima) boca(b, z1, y, r2 ?? r, { x, mat, corona });
}
/** Abrazaderas (anillos) a lo largo del cañón. */
export function abrazaderas(b, { mat = 'laton', x = 0, y = 0.07, zs = [], r = 0.012, ancho = 0.014, extra = 0.004 } = {}) {
  for (const z of zs) {
    b.cil(mat, r + extra, ancho, [x, y, z - ancho / 2], { seg: 14 });
    b.cil(mat, r + extra * 1.6, ancho * 0.22, [x, y, z - ancho / 2], { seg: 14 });
    b.cil(mat, r + extra * 1.6, ancho * 0.22, [x, y, z + ancho * 0.28], { seg: 14 });
  }
}
/** Baqueta bajo el cañón con sus anillas. */
export function baqueta(b, { x = 0, y = 0.035, z0 = 0.05, z1 = 0.7, r = 0.0045, anillas = [], mat = 'madera_c' } = {}) {
  b.cil(mat, r, z1 - z0, [x, y, z0], { seg: 8 });
  b.cil('laton', r * 1.4, 0.012, [x, y, z1 - 0.01], { seg: 8 });
  for (const z of anillas) b.cil('laton', r * 2.2, 0.012, [x, y, z], { seg: 8 });
}
/** Guardamonte: arco de metal bajo el cajón + gatillo. */
export function guardamonte(b, { mat = 'laton', x = 0, z = -0.03, y = 0.0, largo = 0.1, prof = 0.045, r = 0.0055, gatillo = true } = {}) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, a = t * PI; pts.push([x, y - Math.sin(a) * prof, z + largo * (1 - Math.cos(a)) / 2]); }
  b.tubo(mat, pts, r, { seg: 20, rad: 6 });
  if (gatillo) b.perfil('acero', [[0, 0], [0.006, 0], [0.004, -0.032], [-0.012, -0.034], [-0.004, -0.0150]], 0.005, [x, y + 0.002, z + largo * 0.38], { suave: 0.003, bisel: 0.001 });
}
/** Llave de chispa (flintlock) en el lado -X: platina, gallo con pedernal, rastrillo y cazoleta. */
export function llaveChispa(b, { x = -0.02, z = 0, y = 0.07, esc = 1, lado = -1 } = {}) {
  const s = esc, sx = lado;
  // platina (con bordes biselados) y su contraplatina de latón
  b.perfil('acero', [[-0.07 * s, -0.012 * s], [0.07 * s, -0.004 * s], [0.082 * s, 0.012 * s], [0.04 * s, 0.026 * s], [-0.05 * s, 0.022 * s], [-0.085 * s, 0.002 * s]], 0.008, [x, y - 0.012, z], { suave: 0.007, bisel: 0.002 });
  // cazoleta de latón
  b.caja('laton', [0.012, 0.012, 0.026 * s], [x + sx * 0.008, y + 0.016 * s, z + 0.066 * s], 0.003);
  // rastrillo (frizzen) en L
  b.perfil('acero', [[0, 0], [0.012 * s, 0], [0.012 * s, 0.05 * s], [0.002 * s, 0.05 * s], [0.002 * s, 0.01 * s], [0, 0.01 * s]], 0.008, [x + sx * 0.0045, y + 0.026 * s, z + 0.056 * s], { bisel: 0.0012 });
  // gallo: cuerpo curvo con mordazas y pedernal
  b.perfil('acero_c', [[0, 0], [0.012, 0], [0.012, 0.028], [0.034, 0.05], [0.04, 0.062], [0.028, 0.064], [0.012, 0.052], [-0.004, 0.034], [-0.006, 0.01]].map((p) => [p[0] * s - 0.03 * s, p[1] * s]), 0.007, [x + sx * 0.0075, y + 0.012 * s, z + 0.012 * s], { suave: 0.003, bisel: 0.0012 });
  b.caja('cuero', [0.012, 0.012, 0.012], [x + sx * 0.0075, y + 0.062 * s, z + 0.012 * s + 0.012 * s], 0.002);
  b.caja('piedra', [0.008, 0.008, 0.012], [x + sx * 0.0075, y + 0.067 * s, z + 0.024 * s], 0.001);
  // tornillo de gallo y clavija
  b.cil('laton', 0.005, 0.012, [x + sx * 0.0045, y + 0.004, z - 0.01], { rot: [0, sx * PI / 2, 0], seg: 8 });
}
/** Tambor de revólver acanalado con las cámaras visibles de frente. */
export function tamborRevolver(b, { z = 0.0, y = 0.07, x = 0, R = 0.032, l = 0.07, n = 6, prof = 0.006, mat = 'acero' } = {}) {
  b.tambor(mat, R, n, prof, l, [x, y, z]);
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI + PI / n; b.circ('negro', R * 0.22, [x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62, z + l + 0.0033], [0, 0, 0], 10); }
  b.cil('acero_c', R * 0.18, 0.012, [x, y, z + l + 0.0003], { seg: 10 });
}
/** Cargador de caja ligeramente curvo (perfil lateral). */
export function cargadorCurvo(b, { mat = 'acero', x = 0, z = 0, y = 0, largo = 0.2, w = 0.026, prof = 0.03, curva = 0.07, n = 8 } = {}) {
  // arco desde (z,y) hacia abajo y adelante
  const a = [], bb = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, zc = z + curva * t * t * 1.0, yc = y - largo * t;
    const dz = curva * 2 * t / largo, nz = 1 / Math.hypot(1, dz), ny = dz * nz;
    a.push([zc - nz * prof / 2 + 0 * ny, yc - ny * prof / 2 * 0]); bb.push([zc + nz * prof / 2, yc]);
  }
  b.perfil(mat, a.concat(bb.reverse()), w, [x, 0, 0], { bisel: 0.002 });
  // labio de la boca del cargador y base
  b.caja(mat, [w + 0.004, 0.008, prof + 0.006], [x, y - largo, z + curva - 0.0 + 0.002], 0.002);
}
/** Cargador de caja recto con inclinación. */
export function cargadorCaja(b, { mat = 'acero', x = 0, z = 0, y = 0, largo = 0.14, w = 0.024, prof = 0.04, incl = 0.0 } = {}) {
  b.perfil(mat, [[z - prof / 2, y], [z + prof / 2, y], [z + prof / 2 + incl, y - largo], [z - prof / 2 + incl, y - largo]], w, [x, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.caja('polimero', [w + 0.004, 0.01, prof + 0.008], [x, y - largo - 0.003, z + incl], 0.003);
}
/** Cargador de tambor con nervaduras (eje X). */
export function cargadorTambor(b, { mat = 'acero', x = 0, z = 0, y = 0, r = 0.075, w = 0.06, nerv = 10 } = {}) {
  b.cil(mat, r, w, [x - w / 2, y, z], { rot: [0, PI / 2, 0], seg: 20 }); // eje X: cilindro girado
  b.cil('acero', r * 0.25, w + 0.012, [x - w / 2 - 0.006, y, z], { rot: [0, PI / 2, 0], seg: 10 });
  for (let i = 0; i < nerv; i++) {
    const a = (i / nerv) * 2 * PI;
    b.caja('acero', [w + 0.006, 0.012, 0.016], [x, y + Math.sin(a) * r * 0.97, z + Math.cos(a) * r * 0.97], 0.003, [PI / 2 - a, 0, 0]);
  }
}
/** Mira telescópica: tubo, campanas, anillos, torretas y soportes. */
export function miraTelescopica(b, { x = 0, y = 0.13, z = 0.0, largo = 0.3, r = 0.016, soportes = [0.04, 0.24], mat = 'acero' } = {}) {
  b.cil(mat, r, largo, [x, y, z], { seg: 14 });
  b.rev(mat, [[r * 0.9, 0], [r * 1.5, 0.012], [r * 1.7, 0.05], [r * 1.65, 0.06]], [x, y, z - 0.06], { seg: 16 });       // campana ocular
  b.rev(mat, [[r, 0], [r * 1.5, 0.014], [r * 1.9, 0.06], [r * 1.85, 0.07]], [x, y, z + largo - 0.005], { seg: 16, rot: [PI, 0, 0], esc: 1 });
  b.circ('cristal', r * 1.55, [x, y, z + largo + 0.0702], [0, 0, 0], 18);
  b.circ('cristal', r * 1.25, [x, y, z - 0.059], [0, PI, 0], 18);
  b.cil('acero_c', r * 1.05, 0.012, [x, y, z + largo * 0.38], { seg: 14 });
  b.cil('acero', r * 0.55, 0.024, [x, y + r * 0.9, z + largo * 0.38 + 0.006], { rot: [-PI / 2, 0, 0], seg: 10 });
  b.cil('acero', r * 0.55, 0.024, [x + r * 0.95, y, z + largo * 0.38 + 0.006], { rot: [0, 0, 0], seg: 10 });
  for (const sz of soportes) {
    b.caja('acero_c', [0.012, y - 0.07 - r * 0.4, 0.022], [x, (y + 0.07 - r * 0.4) / 2 - 0.004, z + sz], 0.003);
    b.cil('acero_c', r * 1.15, 0.016, [x, y, z + sz - 0.008], { seg: 14 });
  }
}
/** Miras abiertas: punto de mira con guardamonte y alza. */
export function miraHierro(b, { x = 0, y = 0.08, zF = 0.5, zT = 0.0, alto = 0.014, mat = 'acero' } = {}) {
  b.caja(mat, [0.004, alto, 0.01], [x, y + alto / 2, zF], 0.0008);
  b.caja(mat, [0.024, 0.01, 0.014], [x, y + 0.004, zT], 0.0015);
  b.caja(mat, [0.004, 0.012, 0.008], [x - 0.009, y + 0.014, zT], 0.0008);
  b.caja(mat, [0.004, 0.012, 0.008], [x + 0.009, y + 0.014, zT], 0.0008);
}
/** Carril de accesorios (picatinny). */
export function carril(b, { x = 0, y = 0.1, z0 = 0, z1 = 0.3, w = 0.022, mat = 'acero' } = {}) {
  b.caja(mat, [w, 0.008, z1 - z0], [x, y, (z0 + z1) / 2], 0.0015);
  const n = Math.floor((z1 - z0) / 0.014);
  for (let i = 0; i < n; i++) b.caja(mat, [w + 0.001, 0.005, 0.007], [x, y + 0.0055, z0 + 0.008 + i * 0.014], 0.0008, undefined, 1);
}
/** Bípode con patas articuladas, plegadas hacia delante. */
export function bipode(b, { x = 0, y = 0.06, z = 0.5, largo = 0.26, abierto = 0.18, mat = 'acero' } = {}) {
  b.cil(mat, 0.011, 0.03, [x - 0.015, y - 0.014, z - 0.015], { rot: [0, PI / 2, 0], seg: 8 });
  for (const s of [-1, 1]) {
    b.cil(mat, 0.005, largo, [x + s * 0.016, y - 0.012, z], { rot: [PI * 0.58, s * 0.0, -s * abierto * 0.0], seg: 8 });
  }
}
/** Bayoneta de hoja plana bajo/sobre el cañón (cuña). */
export function bayoneta(b, { x = 0, y = 0.04, z = 0.55, largo = 0.28, mat = 'acero_c' } = {}) {
  b.cil('acero', 0.012, 0.035, [x, y, z], { seg: 10 });
  b.perfil(mat, [[0, 0], [largo * 0.85, 0.0], [largo, 0.002], [largo * 0.86, 0.016], [0.0, 0.016]], 0.004, [x, y - 0.008, z + 0.03], { bisel: 0.0008 });
}
/** Correa de cuero entre dos puntos con una comba. */
export function correa(b, a, c, { comba = 0.08, r = 0.012, mat = 'cuero' } = {}) {
  const m = [(a[0] + c[0]) / 2, Math.min(a[1], c[1]) - comba, (a[2] + c[2]) / 2];
  b.tubo(mat, [a, [(a[0] + m[0]) / 2, (a[1] + m[1]) / 2 - comba * 0.2, (a[2] + m[2]) / 2], m, [(m[0] + c[0]) / 2, (m[1] + c[1]) / 2 - comba * 0.2, (m[2] + c[2]) / 2], c], r, { seg: 12, rad: 4 });
}
/** Aletas de disipación luminosas alrededor de un cañón. */
export function aletas(b, { x = 0, y = 0.07, z0 = 0.1, z1 = 0.4, r = 0.026, n = 6, mat = 'composite_n', luz = 'em_cian' } = {}) {
  const paso = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    b.cil(mat, r, paso * 0.55, [x, y, z0 + i * paso], { seg: 16 });
    b.cil(luz, r * 0.86, paso * 0.18, [x, y, z0 + i * paso + paso * 0.57], { seg: 16 });
  }
}
/** Bobina de cobre/latón: espiras (toros) sobre un núcleo. */
export function bobina(b, { x = 0, y = 0.07, z0 = 0, z1 = 0.3, R = 0.03, r = 0.007, n = 8, mat = 'laton', luz = null } = {}) {
  const paso = (z1 - z0) / n;
  for (let i = 0; i < n; i++) b.toro(mat, R, r, [x, y, z0 + paso * (i + 0.5)], { seg: 20, rad: 8 });
  if (luz) b.cil(luz, R * 0.45, z1 - z0, [x, y, z0], { seg: 10 });
}
/** Célula de energía: cápsula con ventana luminosa. */
export function celda(b, { x = 0, y = 0, z = 0, l = 0.09, r = 0.022, luz = 'em_cian', mat = 'composite_n', eje = 'z' } = {}) {
  const rot = eje === 'x' ? [0, PI / 2, 0] : eje === 'y' ? [-PI / 2, 0, 0] : [0, 0, 0];
  b.cil(mat, r, l, [x, y, z], { seg: 14, rot });
  b.cil(luz, r * 0.7, l * 0.6, [x, y, z], { seg: 12, rot, r2: r * 0.7 });
  b.cil(mat, r * 1.12, l * 0.14, [x, y, z], { seg: 14, rot });
  b.cil(mat, r * 1.12, l * 0.14, [x, y, z], { seg: 14, rot });
}
/** Hoja recta/curva dibujada de lado: pts [[z,y],…]. */
export function hoja(b, pts, { mat = 'acero_c', w = 0.006, x = 0, y = 0, z = 0, bisel = 0.0012, suave = 0 } = {}) {
  b.perfil(mat, pts, w, [x, y, z], { bisel, suave });
}
