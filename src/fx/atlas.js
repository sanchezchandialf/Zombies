// Atlas procedurales del FX. Todo se calcula por píxel en JS (sin canvas ni recursos externos) y se sube como DataTexture.
//
// ATLAS DE PARTÍCULAS (1024², 4×4 celdas de 256). Canal A = densidad; R = grosor/calor (0..1); G,B = normal de pantalla
// (0,5 = plana) que el shader usa para iluminar el humo con la luz solar y dar volumen.
//   0‑3  humo/nube (4 variantes, también sirven de fotogramas de bola de fuego)   4‑7  lenguas de llama (fotogramas)
//   8 brillo suave   9 disco difuso   10 esquirla   11 anillo   12 estrella de destello   13 estela (cabeza a +x)
//   14 mancha irregular (bruma de sangre)   15 esfera con normales (gotas, casquillos)
//
// ATLAS DE CALCOS (1024², 4×4 de 256). A = densidad; R = grosor (0 borde → 1 centro); G,B = normal del suelo.
//   0‑1 sangre grande   2‑3 salpicadura media   4‑5 sangre direccional   6 charco   7 gotero
//   8‑10 quemadura (estrella de hollín)   11‑12 ácido   13 cráter   14 aceite   15 huella
import * as THREE from 'three';

export const CELDA = 256;
export const N = 4;
const TAM = CELDA * N;

// ───────────────────────────── ruido ─────────────────────────────
function hash(ix, iy, s) {
  let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vn(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, s, oct = 4) {
  let a = 0.5, f = 1, t = 0, n = 0;
  for (let i = 0; i < oct; i++) { t += a * vn(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return t / n;
}
const sm = (a, b, x) => { const d = b - a; if (d === 0) return x >= a ? 1 : 0; const t = Math.min(1, Math.max(0, (x - a) / d)); return t * t * (3 - 2 * t); };
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
function rngSemilla(s) {
  let a = (s * 2654435761) >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ───────────────────────────── utilidades de celda ─────────────────────────────
function crearBuffer() { return new Uint8Array(TAM * TAM * 4); }

/**
 * Escribe una celda a partir de un campo de altura/densidad. `h(u,v)` en [-1,1]² (v hacia arriba) → { a, r?, h? }.
 * El relieve (para las normales) sale de `rel` si existe, si no de la densidad.
 */
function escribirCelda(buf, idx, campo, o = {}) {
  const cx = (idx % N) * CELDA, cy = Math.floor(idx / N) * CELDA;
  const A = new Float32Array(CELDA * CELDA), R = new Float32Array(CELDA * CELDA), H = new Float32Array(CELDA * CELDA);
  const res = {};
  for (let j = 0; j < CELDA; j++) {
    const v = 1 - (j + 0.5) / CELDA * 2;
    for (let i = 0; i < CELDA; i++) {
      const u = (i + 0.5) / CELDA * 2 - 1;
      campo(u, v, res);
      const k = j * CELDA + i;
      A[k] = res.a; R[k] = res.r ?? res.a; H[k] = res.h ?? res.a;
    }
  }
  const fuerza = o.normal ?? 0;
  for (let j = 0; j < CELDA; j++) {
    for (let i = 0; i < CELDA; i++) {
      const k = j * CELDA + i;
      let gx = 0, gy = 0;
      if (fuerza && i > 1 && j > 1 && i < CELDA - 2 && j < CELDA - 2) {
        // gradiente de 5 puntos suavizado
        gx = (H[k + 1] - H[k - 1]) * 2 + (H[k + 2] - H[k - 2]);
        gy = (H[k + CELDA] - H[k - CELDA]) * 2 + (H[k + 2 * CELDA] - H[k - 2 * CELDA]);
        gx *= fuerza; gy *= fuerza;
      }
      // normal «hacia fuera» de la superficie (−gradiente); y de pantalla hacia arriba = −y de imagen
      const nx = clamp(-gx, -0.97, 0.97), ny = clamp(gy, -0.97, 0.97);
      const p = ((cy + j) * TAM + cx + i) * 4;
      buf[p] = Math.round(clamp(R[k]) * 255);
      buf[p + 1] = Math.round((nx * 0.5 + 0.5) * 255);
      buf[p + 2] = Math.round((ny * 0.5 + 0.5) * 255);
      buf[p + 3] = Math.round(clamp(A[k]) * 255);
    }
  }
}

function textura(buf, mip = true) {
  const t = new THREE.DataTexture(buf, TAM, TAM, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  t.generateMipmaps = mip;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// ───────────────────────────── ATLAS DE PARTÍCULAS ─────────────────────────────
function campoHumo(seed) {
  return (u, v, o) => {
    const r = Math.hypot(u, v);
    const w = fbm(u * 1.5 + seed * 7.3, v * 1.5 + seed * 3.1, seed, 4);
    const w2 = fbm(u * 3.6 + seed * 1.7, v * 3.6 - seed * 5.3, seed + 9, 3);
    // varios «cúmulos» desplazados: silueta de nube, no de disco
    const lob = fbm(u * 0.9 + seed * 2.1, v * 0.9 + seed * 4.7, seed + 3, 2);
    const base = (1 - r * 1.04) * 1.5 + (w - 0.5) * 1.15 + (w2 - 0.5) * 0.4 + (lob - 0.5) * 0.5 - 0.1;
    let d = Math.pow(sm(-0.12, 1.05, base), 1.15) * sm(1, 0.62, r);
    o.a = d;
    o.r = clamp(d * (0.55 + 0.45 * w2) * 1.15);
    o.h = d * (0.7 + 0.45 * w2 + 0.35 * w) * 0.9; // relieve interno → normales con volumen
  };
}

function campoLlama(seed) {
  return (u, v, o) => {
    const y = clamp((v + 0.92) / 1.84);             // 0 base · 1 punta
    const sway = Math.sin(y * 4.6 + seed * 2.3) * 0.16 * y + (fbm(v * 1.7 + seed * 5, seed, seed, 2) - 0.5) * 0.5 * y;
    const turb = (fbm(u * 2.4 + seed * 3.7, v * 3.1 - seed * 2.9, seed, 4) - 0.5) * 0.85 * (0.25 + y);
    const ancho = Math.max(0.004, 0.62 * Math.pow(Math.max(0, 1 - y), 0.78) * sm(0, 0.16, y) ** 0.45);
    const dx = Math.abs(u - sway - turb);
    const cuerpo = sm(ancho, ancho * 0.25, dx);
    // lengüetas rotas en el borde y la punta
    const er = fbm(u * 3.3 + seed * 8.3, v * 4.2 - seed * 1.3, seed + 5, 3);
    let a = cuerpo * sm(0.12, 0.5, er + (1 - y) * 0.55) * (1 - sm(0.9, 1, y)) * sm(0.0, 0.05, y);
    // brasa hueca en la base para que parezcan gases y no un globo
    a = clamp(a * 1.25);
    o.a = a;
    // temperatura: núcleo caliente que sube y se enfría hacia los bordes y la punta
    const nuc = sm(ancho * 0.85, 0, dx) * (1 - y * 0.75);
    o.r = clamp(nuc * (0.7 + 0.5 * er) * 1.1) * (a > 0.02 ? 1 : 0);
    o.h = a;
  };
}

function campoBrillo(u, v, o) {
  const r = Math.hypot(u, v);
  const a = Math.pow(Math.max(0, 1 - r), 2.4) * 0.85 + Math.exp(-r * r * 38) * 0.6;
  o.a = clamp(a) * sm(1, 0.9, r); o.r = o.a; o.h = 0;
}
function campoDisco(u, v, o) {
  const r = Math.hypot(u, v);
  o.a = sm(1, 0.55, r); o.r = o.a; o.h = 0;
}
function campoEsquirla(u, v, o) {
  // rombo alargado con dos facetas (una más clara)
  const t = Math.abs(u), ancho = 0.34 * (1 - t) ** 0.8;
  const a = sm(ancho, ancho * 0.55, Math.abs(v)) * sm(1, 0.9, t);
  o.a = a; o.r = clamp(v > 0 ? 0.35 : 1) * (a > 0.01 ? 1 : 0); o.h = a * (v > 0 ? 1 : 0.4);
}
function campoAnillo(u, v, o) {
  const r = Math.hypot(u, v);
  const a = Math.exp(-(((r - 0.82) / 0.085) ** 2)) + 0.1 * Math.exp(-(((r - 0.55) / 0.3) ** 2)) * 0.5;
  o.a = clamp(a) * sm(1, 0.93, r); o.r = 1; o.h = 0;
}
function campoEstrella(u, v, o) {
  const r = Math.hypot(u, v), au = Math.abs(u), av = Math.abs(v);
  const h = Math.exp(-av * 22) * (1 - au) ** 2.2, vv = Math.exp(-au * 22) * (1 - av) ** 2.2;
  const diag = Math.exp(-Math.abs(Math.abs(u) - Math.abs(v)) * 28) * (1 - r) ** 3 * 0.35;
  const nuc = Math.exp(-r * r * 26);
  const a = clamp(Math.max(h, vv) + diag + nuc * 0.9) * sm(1, 0.85, r);
  o.a = a; o.r = clamp(nuc + a * 0.4); o.h = 0;
}
function campoEstela(u, v, o) {
  // cabeza brillante y redonda a +x, cola larga afilada y tenue
  const t = (u + 1) * 0.5;                      // 0 cola · 1 cabeza
  const ancho = 0.05 + 0.13 * t ** 1.4;
  const perfil = Math.exp(-((v / ancho) ** 2));
  const long = sm(0, 0.18, t) * (0.25 + 0.75 * t ** 1.3);
  const cabeza = Math.exp(-(((u - 0.74) ** 2) / 0.018 + (v * v) / 0.03));
  const a = clamp(perfil * long + cabeza) * sm(1, 0.92, u);
  o.a = a; o.r = clamp(cabeza * 1.2 + perfil * t); o.h = 0;
}
function campoMancha(seed) {
  return (u, v, o) => {
    const r = Math.hypot(u, v), ang = Math.atan2(v, u);
    const k = fbm(Math.cos(ang) * 1.6 + 3 + seed, Math.sin(ang) * 1.6 + 3 + seed * 2, seed, 3);
    const k2 = vn(ang * 3.1 + seed * 5, 0.5, seed);
    const R = 0.38 + 0.5 * k + 0.12 * k2 * k2;
    const a = sm(R, R * 0.7, r + (fbm(u * 5, v * 5, seed + 2, 2) - 0.5) * 0.22);
    o.a = a; o.r = a * (0.5 + 0.5 * sm(R, 0, r)); o.h = a;
  };
}
function campoEsfera(u, v, o) {
  const r = Math.hypot(u, v);
  o.a = sm(1, 0.92, r);
  const z = Math.sqrt(Math.max(0, 1 - r * r));
  o.r = 0; o.h = z * 0.5; o._esfera = true;
}

let _atlasParticulas = null;
export function atlasParticulas() {
  if (_atlasParticulas) return _atlasParticulas;
  const buf = crearBuffer();
  for (let i = 0; i < 4; i++) escribirCelda(buf, i, campoHumo(i * 1.37 + 1), { normal: 4.2 });
  for (let i = 0; i < 4; i++) escribirCelda(buf, 4 + i, campoLlama(i * 1.91 + 2), { normal: 0 });
  escribirCelda(buf, 8, campoBrillo);
  escribirCelda(buf, 9, campoDisco);
  escribirCelda(buf, 10, campoEsquirla, { normal: 5 });
  escribirCelda(buf, 11, campoAnillo);
  escribirCelda(buf, 12, campoEstrella);
  escribirCelda(buf, 13, campoEstela);
  escribirCelda(buf, 14, campoMancha(4), { normal: 8 });
  // esfera con normales analíticas
  {
    const cx = 3 * CELDA, cy = 3 * CELDA;
    for (let j = 0; j < CELDA; j++) for (let i = 0; i < CELDA; i++) {
      const u = (i + 0.5) / CELDA * 2 - 1, v = 1 - (j + 0.5) / CELDA * 2, r = Math.hypot(u, v);
      const p = ((cy + j) * TAM + cx + i) * 4;
      buf[p] = 0; buf[p + 1] = Math.round((clamp(u * 0.95) * 0.5 + 0.5) * 255); buf[p + 2] = Math.round((clamp(v * 0.95) * 0.5 + 0.5) * 255);
      buf[p + 3] = Math.round(sm(1, 0.9, r) * 255);
    }
  }
  _atlasParticulas = textura(buf);
  return _atlasParticulas;
}

// ───────────────────────────── ATLAS DE CALCOS ─────────────────────────────
// Metabolas con soporte compacto: la suma de núcleos da manchas orgánicas que se funden entre sí.
const UMBRAL = 0.42;
function muestra(S, u, v) {
  const j = Math.min(CELDA - 1, Math.max(0, Math.floor(CELDA - (v + 1) / 2 * CELDA)));
  const i = Math.min(CELDA - 1, Math.max(0, Math.floor((u + 1) / 2 * CELDA)));
  return S[j * CELDA + i];
}
function nuevoCampoMetabola() {
  const S = new Float32Array(CELDA * CELDA);
  return {
    S,
    circulo(cx, cy, r) {            // cx,cy,r en [-1,1]²
      const R = r * 2;
      const i0 = Math.max(0, Math.floor(((cx - R) + 1) / 2 * CELDA)), i1 = Math.min(CELDA - 1, Math.ceil(((cx + R) + 1) / 2 * CELDA));
      const j0 = Math.max(0, Math.floor((1 - (cy + R)) / 2 * CELDA)), j1 = Math.min(CELDA - 1, Math.ceil((1 - (cy - R)) / 2 * CELDA));
      const R2 = R * R;
      for (let j = j0; j <= j1; j++) {
        const v = 1 - (j + 0.5) / CELDA * 2, dv = v - cy;
        for (let i = i0; i <= i1; i++) {
          const u = (i + 0.5) / CELDA * 2 - 1, du = u - cx;
          const d2 = du * du + dv * dv;
          if (d2 >= R2) continue;
          const t = 1 - d2 / R2;
          S[j * CELDA + i] += t * t * t;
        }
      }
    },
    hilo(ax, ay, bx, by, r0, r1, paso) {    // cadena de círculos de a a b con radio decreciente
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(L / paso));
      for (let k = 0; k <= n; k++) { const t = k / n; this.circulo(ax + (bx - ax) * t, ay + (by - ay) * t, r0 + (r1 - r0) * t); }
    },
  };
}

/** Salpicadura de sangre: charco central lobulado, pocos chorros de largo y grosor desiguales (agrupados, no en estrella),
 *  gotas satélite que se alargan en la dirección del vuelo y rocío fino. */
function sangre(idx, buf, o) {
  const rnd = rngSemilla(o.semilla), M = nuevoCampoMetabola();
  const { masa = 0.32, nRayos = 14, largoMin = 0.35, largoMax = 0.86, sesgo = 0, motas = 14, rocio = 0.9, ang0 = 0 } = o;
  // masa central: 5–8 lóbulos de tamaño muy distinto (charco orgánico, nunca un círculo)
  const nm = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < nm; i++) {
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * masa * 0.85;
    M.circulo(Math.cos(a) * d * (sesgo ? 1.4 : 1), Math.sin(a) * d * (sesgo ? 0.6 : 1), masa * (0.3 + rnd() * 0.55));
  }
  if (o.centro) M.circulo(0, 0, masa * 0.9);
  // chorros: agrupados en 2–3 abanicos (el impacto tiene una dirección), longitudes y grosores muy variables
  const nAb = sesgo ? 1 : 2 + Math.floor(rnd() * 2);
  const abanicos = []; for (let k = 0; k < nAb; k++) abanicos.push(ang0 + (sesgo ? 0 : rnd() * 6.283));
  const nR = Math.max(4, Math.round(nRayos * 0.6));
  for (let i = 0; i < nR; i++) {
    const base = abanicos[i % nAb];
    const a = base + (rnd() - 0.5) * (sesgo ? 0.9 : 1.5);
    const L = largoMin + (largoMax - largoMin) * Math.pow(rnd(), 1.6);
    const gr = sesgo ? 0.018 + rnd() * rnd() * 0.05 : 0.03 + rnd() * rnd() * 0.11;
    const ax = Math.cos(a) * masa * 0.5, ay = Math.sin(a) * masa * 0.5;
    const curva = (rnd() - 0.5) * 0.25;
    const mx = Math.cos(a + curva) * (L * 0.55), my = Math.sin(a + curva) * (L * 0.55);
    const bx = Math.cos(a + curva * 1.6) * L, by = Math.sin(a + curva * 1.6) * L;
    M.hilo(ax, ay, mx, my, gr, gr * 0.6, 0.03);
    M.hilo(mx, my, bx, by, gr * 0.6, gr * 0.22, 0.03);
    // gotas sueltas más allá del chorro, cada vez menores y alargadas
    let gx = bx, gy = by, gs = 0.02 + rnd() * 0.035;
    const ng = rnd() < 0.7 ? 1 + Math.floor(rnd() * 3) : 0;
    for (let g = 0; g < ng; g++) {
      gx += Math.cos(a) * (0.05 + rnd() * 0.08); gy += Math.sin(a) * (0.05 + rnd() * 0.08);
      if (Math.hypot(gx, gy) > 0.95) break;
      M.hilo(gx - Math.cos(a) * gs, gy - Math.sin(a) * gs, gx, gy, gs * 0.5, gs, 0.02);
      gs *= 0.7;
    }
  }
  // rocío de motas finas, más denso del lado de los abanicos
  for (let i = 0; i < motas * 1.4; i++) {
    const a = (rnd() < 0.6 ? abanicos[i % nAb] + (rnd() - 0.5) * 1.6 : rnd() * 6.283);
    const d = masa * 0.6 + rnd() * rocio * 0.55;
    if (d > 0.93) continue;
    M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.012 + rnd() * rnd() * 0.04);
  }
  escribirMetabola(buf, idx, M.S, o.rugosidad ?? (sesgo ? 0.07 : 0.11), rnd, o);
}

function escribirMetabola(buf, idx, S, rug, rnd, o = {}) {
  const sem = Math.floor(rnd() * 1000);
  escribirCelda(buf, idx, (u, v, out) => {
    const s0 = muestra(S, u, v), s = s0 + (fbm(u * 6, v * 6, sem, 3) - 0.5) * rug;
    const edge = sm(1, 0.92, Math.hypot(u, v));
    const a = sm(UMBRAL - 0.035, UMBRAL + 0.035, s) * edge;
    out.a = a;
    const grosor = clamp((s - UMBRAL) / (o.grosor ?? 0.9));
    out.r = a * (0.25 + 0.75 * grosor);
    out.h = clamp(s0) * edge * 1.1;     // relieve liso (sin el ruido del borde) para que el brillo no centellee
  }, { normal: o.normalFuerza ?? 6 });
}

function charco(idx, buf, semilla) {
  // charco espeso que se ha extendido: lóbulos de tamaños muy distintos, entrantes y un par de lenguas que buscan la pendiente
  const rnd = rngSemilla(semilla), M = nuevoCampoMetabola();
  for (let i = 0; i < 11; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.42; M.circulo(Math.cos(a) * d, Math.sin(a) * d * 0.8, 0.12 + rnd() * rnd() * 0.3); }
  for (let i = 0; i < 2; i++) { const a = rnd() * 6.283; M.hilo(Math.cos(a) * 0.2, Math.sin(a) * 0.2, Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.1, 0.04, 0.04); }
  for (let i = 0; i < 8; i++) { const a = rnd() * 6.283, d = 0.55 + rnd() * 0.35; M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.015 + rnd() * 0.035); }
  escribirMetabola(buf, idx, M.S, 0.12, rnd, { grosor: 0.6, normalFuerza: 3 });
}

function gotero(idx, buf, semilla) {
  const rnd = rngSemilla(semilla), M = nuevoCampoMetabola();
  // arrastre: una mancha que se estira y deja gotas en hilera
  M.hilo(-0.7, 0, 0.1, 0, 0.13, 0.22, 0.05);
  M.circulo(0.15, 0, 0.26);
  for (let i = 0; i < 9; i++) { const x = 0.35 + i * 0.07 + rnd() * 0.04; M.circulo(x, (rnd() - 0.5) * 0.14, 0.05 * (1 - i * 0.07) + rnd() * 0.02); }
  for (let i = 0; i < 6; i++) M.circulo(-0.3 + rnd() * 0.8, (rnd() - 0.5) * 0.7, 0.015 + rnd() * 0.03);
  escribirMetabola(buf, idx, M.S, 0.08, rnd, { grosor: 0.8 });
}

/** Quemadura: mancha de hollín lobulada con borde deshilachado, zonas más negras y lenguas cortas e irregulares
 *  (agrupadas por el soplo de la explosión), nunca una estrella de rayos iguales. */
function quemadura(idx, buf, semilla) {
  const rnd = rngSemilla(semilla), M = nuevoCampoMetabola();
  const n = 6 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.3; M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.14 + rnd() * 0.2); }
  const lenguas = 7 + Math.floor(rnd() * 5), soplo = rnd() * 6.283;
  for (let i = 0; i < lenguas; i++) {
    const a = rnd() < 0.5 ? soplo + (rnd() - 0.5) * 1.8 : rnd() * 6.283;
    const L = 0.38 + Math.pow(rnd(), 1.5) * 0.45;
    const g = 0.04 + rnd() * 0.06;
    M.hilo(Math.cos(a) * 0.15, Math.sin(a) * 0.15, Math.cos(a + (rnd() - 0.5) * 0.3) * L, Math.sin(a + (rnd() - 0.5) * 0.3) * L, g, g * 0.35, 0.03);
  }
  const sem = Math.floor(rnd() * 999);
  escribirCelda(buf, idx, (u, v, out) => {
    const r = Math.hypot(u, v);
    const w1 = fbm(u * 3.0 + 7, v * 3.0, sem, 4) - 0.5, w2 = fbm(u * 11, v * 11, sem + 4, 3);
    const s = muestra(M.S, u + w1 * 0.08, v + w1 * 0.08);
    // halo de hollín: borde deshilachado por ruido, motas más oscuras dentro
    const halo = sm(0.92, 0.25, r + w1 * 0.75) * (0.22 + 0.4 * w2);
    const nucleo = sm(UMBRAL - 0.32, UMBRAL + 0.3, s + (w2 - 0.5) * 0.35);
    const a = clamp(Math.max(nucleo * (0.82 + 0.16 * w2), halo)) * sm(1, 0.88, r);
    out.a = a; out.r = clamp(0.15 + nucleo * 0.55 * w2 + halo * 0.6 - nucleo * 0.25); out.h = 0.25 * a;
  });
}

function acido(idx, buf, semilla) {
  const rnd = rngSemilla(semilla), M = nuevoCampoMetabola();
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.283, d = rnd() * 0.32; M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.2 + rnd() * 0.18); }
  for (let i = 0; i < 12; i++) { const a = rnd() * 6.283, d = 0.4 + rnd() * 0.4; M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.025 + rnd() * 0.07); }
  const burbujas = []; for (let i = 0; i < 9; i++) { const a = rnd() * 6.283, d = rnd() * 0.5; burbujas.push([Math.cos(a) * d, Math.sin(a) * d, 0.035 + rnd() * 0.06]); }
  const sem = Math.floor(rnd() * 999);
  escribirCelda(buf, idx, (u, v, out) => {
    const s = muestra(M.S, u, v) + (fbm(u * 6, v * 6, sem, 3) - 0.5) * 0.1;
    const a = sm(UMBRAL - 0.04, UMBRAL + 0.04, s) * sm(1, 0.92, Math.hypot(u, v));
    let b = 0;
    for (const [bx, by, br] of burbujas) { const d = Math.hypot(u - bx, v - by); b = Math.max(b, Math.exp(-(((d - br) / (br * 0.22)) ** 2)) * 0.9); }
    out.a = a; out.r = clamp(a * (0.35 + 0.65 * clamp((s - UMBRAL) / 0.8)) + b * a); out.h = clamp(s) * 1.0 + b * 0.5;
  }, { normal: 7 });
}

/** Cráter: hoyo oscuro y hondo, labio de tierra levantada irregular, tierra proyectada en grumos y regueros de
 *  distinta longitud (distribución aleatoria, sin simetría radial) y un halo de hollín que se deshace en el suelo. */
function crater(idx, buf, semilla) {
  const rnd = rngSemilla(semilla), sem = Math.floor(rnd() * 999);
  const M = nuevoCampoMetabola();
  const reg = 9 + Math.floor(rnd() * 6);
  for (let i = 0; i < reg; i++) {
    const a = rnd() * 6.283, L = 0.55 + Math.pow(rnd(), 2) * 0.38, g = 0.025 + rnd() * 0.05;
    M.hilo(Math.cos(a) * 0.42, Math.sin(a) * 0.42, Math.cos(a + (rnd() - 0.5) * 0.25) * L, Math.sin(a + (rnd() - 0.5) * 0.25) * L, g, g * 0.3, 0.03);
  }
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.283, d = 0.5 + rnd() * 0.42; M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.015 + rnd() * rnd() * 0.06); }
  escribirCelda(buf, idx, (u, v, out) => {
    const r = Math.hypot(u, v), ang = Math.atan2(v, u);
    const wob = fbm(Math.cos(ang) * 1.3 + 5, Math.sin(ang) * 1.3 + 5, sem, 4) - 0.5;
    const R = 0.36 + wob * 0.16;
    const n1 = fbm(u * 9, v * 9, sem + 3, 3), n2 = fbm(u * 22, v * 22, sem + 9, 2);
    const hoyo = sm(R, R * 0.55, r + (n1 - 0.5) * 0.08);
    const anillo = Math.exp(-(((r - R * 1.15 - (n1 - 0.5) * 0.08) / (0.08 + 0.05 * n1)) ** 2)) * (0.45 + 0.55 * n1);
    const eyecta = sm(UMBRAL - 0.05, UMBRAL + 0.05, muestra(M.S, u, v) + (n2 - 0.5) * 0.15);
    const halo = sm(0.95, 0.35, r + (fbm(u * 3.5, v * 3.5, sem + 1, 4) - 0.5) * 0.7) * (0.25 + 0.3 * n2);
    const a = clamp(Math.max(hoyo * 0.98, anillo * 0.9, eyecta * 0.85, halo)) * sm(1, 0.9, r);
    out.a = a;
    // R: claro = tierra removida (labio y grumos); el fondo del hoyo es lo más oscuro
    out.r = clamp(anillo * (0.6 + 0.4 * n2) + eyecta * 0.4 * n2 + halo * 0.12 + hoyo * (0.03 + 0.08 * n2) * (1 - anillo));
    out.h = -hoyo * 0.7 + anillo * 0.9 + eyecta * 0.25;
  }, { normal: 6 });
}

function aceite(idx, buf, semilla) {
  const rnd = rngSemilla(semilla), M = nuevoCampoMetabola();
  for (let i = 0; i < 5; i++) { const a = rnd() * 6.283, d = rnd() * 0.3; M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.3 + rnd() * 0.15); }
  for (let i = 0; i < 4; i++) { const a = rnd() * 6.283, d = 0.45 + rnd() * 0.2; M.circulo(Math.cos(a) * d, Math.sin(a) * d, 0.1 + rnd() * 0.08); }
  escribirMetabola(buf, idx, M.S, 0.04, rnd, { grosor: 0.6, normalFuerza: 3 });
}

function huella(idx, buf) {
  // suela de bota: puntera ancha, cintura, tacón separado, con tacos
  escribirCelda(buf, idx, (u, v, out) => {
    // eje largo vertical; puntera arriba
    const x = u / 0.9, y = v / 0.95;
    let a = 0;
    // puntera
    const ex = x / 0.36, ey = (y - 0.38) / 0.5; a = Math.max(a, sm(1, 0.82, Math.hypot(ex, ey)));
    // cintura
    const cx = Math.abs(x) < 0.25 - 0.06 * Math.abs(y + 0.05) * 3 && y > -0.2 && y < 0.2 ? 1 : 0; a = Math.max(a, cx * sm(0.25, 0.18, Math.abs(x)));
    // tacón
    const hx = x / 0.26, hy = (y + 0.55) / 0.3; a = Math.max(a, sm(1, 0.82, Math.hypot(hx, hy * 0.95)));
    // tacos (hendiduras)
    const taco = (Math.sin(y * 34) > 0.55 ? 0.5 : 0) * (y > 0 ? 1 : 0) + (Math.sin(y * 26 + 1) > 0.6 && y < -0.3 ? 0.4 : 0);
    out.a = clamp(a) * (1 - taco * 0.8) * sm(1, 0.9, Math.hypot(u, v)); out.r = out.a; out.h = a * (1 - taco);
  }, { normal: 5 });
}

let _atlasCalcos = null;
export function atlasCalcos() {
  if (_atlasCalcos) return _atlasCalcos;
  const buf = crearBuffer();
  sangre(0, buf, { semilla: 11, masa: 0.5, nRayos: 16, largoMin: 0.45, largoMax: 0.92, motas: 22, rocio: 1 });
  sangre(1, buf, { semilla: 29, masa: 0.46, nRayos: 12, largoMin: 0.4, largoMax: 0.88, motas: 26, rocio: 1, ang0: 0.5 });
  sangre(2, buf, { semilla: 41, masa: 0.44, nRayos: 10, largoMin: 0.3, largoMax: 0.6, motas: 18, rocio: 0.85 });
  sangre(3, buf, { semilla: 53, masa: 0.4, nRayos: 13, largoMin: 0.3, largoMax: 0.66, motas: 20, rocio: 0.9, ang0: 1.2 });
  // direccional: abanico estrecho de regueros finos y gotas alargadas, con poca masa en el origen (nada de «renacuajos»)
  sangre(4, buf, { semilla: 67, masa: 0.16, nRayos: 18, largoMin: 0.45, largoMax: 0.95, sesgo: 0.85, motas: 16, rocio: 0.9, ang0: 0 });
  sangre(5, buf, { semilla: 83, masa: 0.14, nRayos: 16, largoMin: 0.5, largoMax: 0.97, sesgo: 0.9, motas: 18, rocio: 0.9, ang0: 0.05 });
  charco(6, buf, 97);
  gotero(7, buf, 101);
  quemadura(8, buf, 113); quemadura(9, buf, 127); quemadura(10, buf, 139);
  acido(11, buf, 151); acido(12, buf, 163);
  crater(13, buf, 173);
  aceite(14, buf, 181);
  huella(15, buf);
  _atlasCalcos = textura(buf);
  return _atlasCalcos;
}

export function liberarAtlas() {
  _atlasParticulas?.dispose(); _atlasParticulas = null;
  _atlasCalcos?.dispose(); _atlasCalcos = null;
}
