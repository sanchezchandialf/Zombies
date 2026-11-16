// Utilidades matemáticas y de azar compartidas. Sin dependencias.
export const TAU = Math.PI * 2;
export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
export const mezclar = (a, b, t) => a + (b - a) * t;
export const suavizar = (t) => t * t * (3 - 2 * t);
export const pasoSuave = (a, b, v) => suavizar(limitar((v - a) / (b - a), 0, 1));
/** Amortiguación exponencial independiente de la tasa de cuadros: acerca `a` a `b` con rapidez `k` (1/s). */
export const amortiguar = (a, b, k, dt) => mezclar(a, b, 1 - Math.exp(-k * dt));
export const dist2 = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az; return dx * dx + dz * dz; };
export const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
/** Diferencia angular mínima a→b en (-PI, PI]. */
export const difAngulo = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d <= -Math.PI) d += TAU; return d; };
/** Gira `a` hacia `b` como mucho `maxPaso` radianes. */
export const girarHacia = (a, b, maxPaso) => { const d = difAngulo(a, b); return Math.abs(d) <= maxPaso ? b : a + Math.sign(d) * maxPaso; };
/** Convención del juego: rot=0 mira a +Z; dirección = (sin(rot), cos(rot)). */
export const dirDeRot = (rot, out = { x: 0, z: 0 }) => { out.x = Math.sin(rot); out.z = Math.cos(rot); return out; };
export const rotDeDir = (dx, dz) => Math.atan2(dx, dz);

/** Generador pseudoaleatorio determinista (mulberry32). */
export function crearRng(semilla = 1) {
  let s = semilla >>> 0 || 1;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.rango = (a, b) => a + (b - a) * r();
  r.entero = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.elegir = (lista) => lista[Math.floor(r() * lista.length)];
  r.prob = (p) => r() < p;
  r.signo = () => (r() < 0.5 ? -1 : 1);
  /** Elige de una lista de [valor, peso]. */
  r.ponderado = (pares) => {
    let total = 0;
    for (const p of pares) total += p[1];
    let x = r() * total;
    for (const p of pares) { x -= p[1]; if (x <= 0) return p[0]; }
    return pares[pares.length - 1][0];
  };
  return r;
}
