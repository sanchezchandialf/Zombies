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
export function maderaVeta(c, desp, { frecAnillo = 16, anillos = 1.0, deform = 1.0, poros = 1, nudos = 0.2, vertical = false } = {}) {
  const N = c.N, n = c.n;
  const lento = c.fbm(vertical ? [6, 2] : [2, 6], 4, { warp: { amp: 0.25, freq: 3 } });
  const fibra = c.fbm(vertical ? [220, 5] : [5, 220], 2, { exacto: true });
  const fibra2 = c.fbm(vertical ? [90, 3] : [3, 90], 3, { exacto: true });
  const grano = new Float32Array(n), poro = new Float32Array(n), nudo = new Float32Array(n);
  const px = (v) => c.px(v);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const idp = desp.id[i];
    const along = vertical ? desp.v[i] * desp.ph[i] : desp.u[i] * desp.pw[i];
    const across = vertical ? desp.u[i] * desp.pw[i] : desp.v[i] * desp.ph[i];
    // nudo: elipse alargada con anillos concéntricos que desvían los anillos de la madera
    let nd = 0, dev = 0;
    if (desp.id2[i] < nudos) {
      const cx = (0.2 + 0.6 * ((idp * 7.31) % 1)) * (vertical ? desp.ph[i] : desp.pw[i]), cy = (0.25 + 0.5 * ((idp * 3.7) % 1)) * (vertical ? desp.pw[i] : desp.ph[i]);
      const a = px(26 + 18 * ((idp * 11.3) % 1)), b = a * 0.42;
      const dx = (along - cx) / a, dy = (across - cy) / b;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2.2) { nd = 1 - suave(0.75, 1.0, d); dev = (1 - suave(0, 2.2, d)) * Math.sign(dy || 1) * 1.6; nd *= 0.55 + 0.45 * Math.cos(d * 14); }
    }
    const fase = (across / px(frecAnillo)) * anillos + lento[i] * deform * 3 + idp * 20 + dev;
    const r = Math.abs(Math.sin(fase * Math.PI));
    const anillo = Math.pow(r, 2.2);
    const fin = fibra[i] * 0.6 + fibra2[i] * 0.4;
    grano[i] = clamp(0.38 + (anillo - 0.4) * 0.38 + (fin - 0.5) * 0.9 * poros);
    poro[i] = clamp((fibra[i] - 0.5) * poros * 1.1 + 0.5 + (anillo - 0.5) * 0.15);
    nudo[i] = nd;
  }
  return { grano, poro, nudo };
}
