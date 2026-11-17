// Utilidades compartidas por los generadores del catálogo (solo typed arrays; sin DOM).
import { clamp, suave, mezcla, col, hash01, crearRng } from '../texturas.js';
export { clamp, suave, mezcla, col, hash01, crearRng };

/** Ruido blanco por píxel (0..1), determinista. */
export function blanco(N, semilla = 1) {
  const o = new Float32Array(N * N);
  for (let i = 0; i < o.length; i++) o[i] = hash01(i, 77, semilla);
  return o;
}
/** Mezcla de una lista de colores según t (0..1) → escribe en out. */
export function rampa(cols, t, out) {
  const n = cols.length - 1; t = clamp(t) * n;
  const i = Math.min(n - 1, Math.floor(t)), f = t - i;
  const a = cols[i], b = cols[i + 1];
  out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f;
  return out;
}
/** Rellena albedo con un color. */
export function rellenar(c, color) { for (let i = 0; i < c.n; i++) { c.alb[i * 3] = color[0]; c.alb[i * 3 + 1] = color[1]; c.alb[i * 3 + 2] = color[2]; } }
/** Multiplica el albedo del píxel i. */
export function oscurecer(c, i, k) { c.alb[i * 3] *= k; c.alb[i * 3 + 1] *= k; c.alb[i * 3 + 2] *= k; }
/** Mezcla el albedo del píxel i hacia un color con peso t. */
export function teñir(c, i, color, t) {
  const a = c.alb, j = i * 3;
  a[j] += (color[0] - a[j]) * t; a[j + 1] += (color[1] - a[j + 1]) * t; a[j + 2] += (color[2] - a[j + 2]) * t;
}
/** Desplazamiento de tono sutil: k>0 cálido, k<0 frío. */
export function calidez(c, i, k) { const a = c.alb, j = i * 3; a[j] *= 1 + k; a[j + 2] *= 1 - k; }

/**
 * Madera sobre un despiece: devuelve { grano (0..1, claro-oscuro), poro (relieve), nudo (máscara) }.
 * desp: resultado de c.despiece(). Las vetas siguen el eje x de la pieza (o y si vertical).
 */
export function maderaVeta(c, desp, { frecAnillo = 14, anillos = 1.0, deform = 1.2, poros = 1, nudos = 0.25, vertical = false } = {}) {
  const N = c.N, n = c.n;
  const lento = c.fbm(vertical ? [8, 2] : [2, 8], 4, { warp: { amp: 0.3, freq: 3 } });
  const fino = c.fbm(vertical ? [180, 6] : [6, 180], 2, { exacto: true });
  const grano = new Float32Array(n), poro = new Float32Array(n), nudo = new Float32Array(n);
  // nudos: pocos centros aleatorios por pieza (en coordenadas locales u,v)
  const rng = crearRng(c.semilla * 31 + 5);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const idp = desp.id[i];
    const along = vertical ? desp.v[i] * desp.ph[i] : desp.u[i] * desp.pw[i];
    const across = vertical ? desp.u[i] * desp.pw[i] : desp.v[i] * desp.ph[i];
    // anillos: ondas en el eje transversal, deformadas por ruido lento (ondulación a lo largo)
    const fase = (across / c.px(frecAnillo)) * anillos + lento[i] * deform * 3 + idp * 20 + (along / N) * 0.8 * Math.sin(idp * 40);
    const r = Math.abs(Math.sin(fase * Math.PI));
    const anillo = Math.pow(r, 1.6);
    const fin = fino[i];
    grano[i] = clamp(anillo * 0.7 + (fin - 0.5) * 0.5 * poros + 0.15);
    poro[i] = clamp((fin - 0.5) * poros * 0.9 + 0.5 + (anillo - 0.5) * 0.25);
  }
  if (nudos > 0) {
    // un nudo ocasional por pieza: elipse alargada en la dirección de la veta
    const w = c.worley(6, { jit: 0.8 });
    for (let i = 0; i < n; i++) {
      const idp = desp.id2[i];
      if (idp < nudos) {
        const d = w.f1[i];
        const m = 1 - suave(0.0, 0.35, d);
        nudo[i] = m;
      }
    }
  }
  return { grano, poro, nudo };
}
