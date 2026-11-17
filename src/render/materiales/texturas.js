// ERA Z · Motor de texturas procedurales (sin DOM: solo typed arrays, se puede probar en Node).
// Todo es periódico: cualquier campo generado enlaza perfectamente consigo mismo (mosaico sin costuras).
//
//  · Ruido en mosaico: valor, Perlin, Worley (F1/F2/borde/id), fBm, crestas, turbulencia, deformación de dominio.
//  · Despiece (ladrillos, losas, sillares, tablones) con juntas, bisel, esquinas redondeadas y bordes irregulares.
//  · Grietas, vetas, remaches, óxido, manchas, goteos, cavidad (AO desde altura).
//  · Normal desde altura (Sobel periódico), mipmaps propios con corrección de Toksvig para normal/rugosidad.
//
// Convenciones: la altura va de 0 a 1; el albedo se escribe en sRGB (0..1) y el resto es lineal. Las filas de
// los arrays crecen con la coordenada v (la textura se sube sin flipY).

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const mezcla = (a, b, t) => a + (b - a) * t;
export const suave = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const paso = (a, x) => (x < a ? 0 : 1);

/** Color hex → [r,g,b] en 0..1 (sRGB, tal como se escribe en el albedo). */
export function col(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
export function mezclaCol(a, b, t, o = [0, 0, 0]) { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; }

// ───────────────────────────── Azar determinista ─────────────────────────────
export function crearRng(a) {
  a = a >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hu(x, y, s) {
  let h = (Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(s, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
export const hash01 = (x, y, s) => hu(x | 0, y | 0, s | 0) / 4294967296;

const GX = new Float32Array(256), GY = new Float32Array(256);
for (let i = 0; i < 256; i++) { GX[i] = Math.cos((i / 256) * TAU); GY[i] = Math.sin((i / 256) * TAU); }
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

// ───────────────────────────── Ruido escalar periódico ─────────────────────────────
/** Perlin periódico (periodos enteros px, py). Devuelve ≈ -1..1. */
export function perlin2(x, y, px, py, s) {
  const xf = Math.floor(x), yf = Math.floor(y);
  const fx = x - xf, fy = y - yf;
  let x0 = xf % px; if (x0 < 0) x0 += px;
  let y0 = yf % py; if (y0 < 0) y0 += py;
  const x1 = x0 + 1 === px ? 0 : x0 + 1, y1 = y0 + 1 === py ? 0 : y0 + 1;
  const g00 = hu(x0, y0, s) >>> 24, g10 = hu(x1, y0, s) >>> 24, g01 = hu(x0, y1, s) >>> 24, g11 = hu(x1, y1, s) >>> 24;
  const n00 = GX[g00] * fx + GY[g00] * fy;
  const n10 = GX[g10] * (fx - 1) + GY[g10] * fy;
  const n01 = GX[g01] * fx + GY[g01] * (fy - 1);
  const n11 = GX[g11] * (fx - 1) + GY[g11] * (fy - 1);
  const u = fade(fx), v = fade(fy);
  const a = n00 + (n10 - n00) * u, b = n01 + (n11 - n01) * u;
  return (a + (b - a) * v) * 1.41;
}
/** Ruido de valor periódico, 0..1. */
export function valor2(x, y, px, py, s) {
  const xf = Math.floor(x), yf = Math.floor(y);
  const fx = x - xf, fy = y - yf;
  let x0 = xf % px; if (x0 < 0) x0 += px;
  let y0 = yf % py; if (y0 < 0) y0 += py;
  const x1 = x0 + 1 === px ? 0 : x0 + 1, y1 = y0 + 1 === py ? 0 : y0 + 1;
  const a = hu(x0, y0, s) / 4294967296, b = hu(x1, y0, s) / 4294967296, c = hu(x0, y1, s) / 4294967296, d = hu(x1, y1, s) / 4294967296;
  const u = fade(fx), v = fade(fy);
  const p = a + (b - a) * u, q = c + (d - c) * u;
  return p + (q - p) * v;
}
// Worley: deja sus resultados en W (sin asignar memoria).
export const W = { f1: 0, f2: 0, id: 0, id2: 0, dx: 0, dy: 0 };
export function worley2(x, y, px, py, s, jit = 1) {
  const cx = Math.floor(x), cy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0, id2 = 0, bdx = 0, bdy = 0;
  for (let j = -1; j <= 1; j++) {
    const ny = cy + j; let wy = ny % py; if (wy < 0) wy += py;
    for (let i = -1; i <= 1; i++) {
      const nx = cx + i; let wx = nx % px; if (wx < 0) wx += px;
      const h = hu(wx, wy, s);
      const ox = 0.5 + ((h & 1023) / 1023 - 0.5) * jit;
      const oy = 0.5 + (((h >>> 10) & 1023) / 1023 - 0.5) * jit;
      const dx = nx + ox - x, dy = ny + oy - y;
      const d = dx * dx + dy * dy;
      if (d < f1) { f2 = f1; f1 = d; id = (h >>> 20) / 4096; id2 = ((h >>> 3) & 1023) / 1023; bdx = dx; bdy = dy; }
      else if (d < f2) f2 = d;
    }
  }
  W.f1 = Math.sqrt(f1); W.f2 = Math.sqrt(f2); W.id = id; W.id2 = id2; W.dx = bdx; W.dy = bdy;
}

// ───────────────────────────── Campos (Float32Array N*N) ─────────────────────────────
function potencia2(n) { let p = 1; while (p < n) p <<= 1; return p; }

/** Reescala un campo MxM a NxN con interpolación bilineal periódica. */
export function reescalar(f, M, N) {
  if (M === N) return f;
  const o = new Float32Array(N * N);
  const k = M / N;
  const x0 = new Int32Array(N), x1 = new Int32Array(N), fx = new Float32Array(N);
  for (let x = 0; x < N; x++) { const sx = x * k; const i = Math.floor(sx); x0[x] = i % M; x1[x] = (i + 1) % M; const t = sx - i; fx[x] = t * t * (3 - 2 * t); }
  for (let y = 0; y < N; y++) {
    const sy = y * k; const j = Math.floor(sy); const r0 = (j % M) * M, r1 = ((j + 1) % M) * M; let ty = sy - j; ty = ty * ty * (3 - 2 * ty);
    const ro = y * N;
    for (let x = 0; x < N; x++) {
      const a = f[r0 + x0[x]], b = f[r0 + x1[x]], c = f[r1 + x0[x]], d = f[r1 + x1[x]];
      const t = fx[x];
      const p = a + (b - a) * t, q = c + (d - c) * t;
      o[ro + x] = p + (q - p) * ty;
    }
  }
  return o;
}

const par = (f) => (Array.isArray(f) ? [Math.max(1, Math.round(f[0])), Math.max(1, Math.round(f[1]))] : [Math.max(1, Math.round(f)), Math.max(1, Math.round(f))]);

/**
 * fBm periódico → 0..1.
 * o: { tipo:'perlin'|'valor'|'cresta'|'turb', lac:2, gan:0.5, semilla, warp:{ amp, freq, semilla } , exacto }
 * freq entero o [fx, fy] (ruido anisótropo para vetas y goteos).
 */
export function fbm(N, freq, oct = 4, o = {}) {
  const [fx, fy] = par(freq);
  const lac = Math.max(2, Math.round(o.lac ?? 2)), gan = o.gan ?? 0.5, tipo = o.tipo ?? 'perlin', s = (o.semilla ?? 1) | 0;
  const maxF = Math.max(fx, fy) * Math.pow(lac, oct - 1);
  const M = o.exacto ? N : Math.min(N, Math.max(32, potencia2(maxF * 8)));
  const out = new Float32Array(M * M);
  let amp = 1, suma = 0;
  const w = o.warp;
  let wx = null, wy = null;
  if (w) {
    const [wpx, wpy] = par(w.freq ?? 2), wamp = w.amp ?? 0.5, ws = (w.semilla ?? s + 77) | 0;
    wx = new Float32Array(M * M); wy = new Float32Array(M * M);
    const iv = 1 / M;
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
      wx[y * M + x] = wamp * perlin2(x * iv * wpx, y * iv * wpy, wpx, wpy, ws) / fx;
      wy[y * M + x] = wamp * perlin2(x * iv * wpx + 3.1, y * iv * wpy + 1.7, wpx, wpy, ws + 9) / fy;
    }
  }
  const inv = 1 / M;
  const colX0 = new Int32Array(M), colX1 = new Int32Array(M), colFx = new Float32Array(M), colUx = new Float32Array(M);
  for (let k = 0; k < oct; k++) {
    const px = fx * Math.pow(lac, k), py = fy * Math.pow(lac, k), sk = s + k * 131;
    // tabla de la retícula de esta octava
    const G = new Uint8Array(px * py), V = tipo === 'valor' ? new Float32Array(px * py) : null;
    for (let iy = 0; iy < py; iy++) for (let ix = 0; ix < px; ix++) { const h = hu(ix, iy, sk); G[iy * px + ix] = h >>> 24; if (V) V[iy * px + ix] = h / 4294967296; }
    if (!wx) for (let x = 0; x < M; x++) { const xx = x * inv * px; const xi = Math.floor(xx); colX0[x] = xi; colX1[x] = xi + 1 === px ? 0 : xi + 1; const f = xx - xi; colFx[x] = f; colUx[x] = f * f * f * (f * (f * 6 - 15) + 10); }
    for (let y = 0; y < M; y++) {
      const v = y * inv;
      let ry0 = 0, ry1 = 0, fyy = 0, vy = 0;
      if (!wx) { const yy = v * py; const yi = Math.floor(yy); ry0 = yi * px; ry1 = (yi + 1 === py ? 0 : yi + 1) * px; fyy = yy - yi; vy = fyy * fyy * fyy * (fyy * (fyy * 6 - 15) + 10); }
      for (let x = 0; x < M; x++) {
        const j = y * M + x;
        let x0, x1, fxx, ux, r0, r1, fy2, uy;
        if (wx) {
          const xx = x * inv * px + wx[j] * px, yy = v * py + wy[j] * py;
          const xi = Math.floor(xx), yi = Math.floor(yy);
          fxx = xx - xi; fy2 = yy - yi;
          x0 = xi % px; if (x0 < 0) x0 += px; x1 = x0 + 1 === px ? 0 : x0 + 1;
          let y0 = yi % py; if (y0 < 0) y0 += py; const y1 = y0 + 1 === py ? 0 : y0 + 1;
          r0 = y0 * px; r1 = y1 * px;
          ux = fxx * fxx * fxx * (fxx * (fxx * 6 - 15) + 10); uy = fy2 * fy2 * fy2 * (fy2 * (fy2 * 6 - 15) + 10);
        } else { x0 = colX0[x]; x1 = colX1[x]; fxx = colFx[x]; ux = colUx[x]; r0 = ry0; r1 = ry1; fy2 = fyy; uy = vy; }
        let n;
        if (V) {
          const a = V[r0 + x0], b = V[r0 + x1], c2 = V[r1 + x0], d2 = V[r1 + x1];
          const p = a + (b - a) * ux, q = c2 + (d2 - c2) * ux;
          n = (p + (q - p) * uy) * 2 - 1;
        } else {
          const g00 = G[r0 + x0], g10 = G[r0 + x1], g01 = G[r1 + x0], g11 = G[r1 + x1];
          const n00 = GX[g00] * fxx + GY[g00] * fy2;
          const n10 = GX[g10] * (fxx - 1) + GY[g10] * fy2;
          const n01 = GX[g01] * fxx + GY[g01] * (fy2 - 1);
          const n11 = GX[g11] * (fxx - 1) + GY[g11] * (fy2 - 1);
          const p = n00 + (n10 - n00) * ux, q = n01 + (n11 - n01) * ux;
          n = (p + (q - p) * uy) * 1.41;
          if (tipo === 'cresta') { n = 1 - Math.abs(n); n = n * n * 2 - 1; }
          else if (tipo === 'turb') n = Math.abs(n) * 2 - 1;
        }
        out[j] += n * amp;
      }
    }
    suma += amp; amp *= gan;
  }
  const k0 = 0.5 / suma;
  for (let i = 0; i < out.length; i++) { const v = out[i] * k0 + 0.5; out[i] = v < 0 ? 0 : v > 1 ? 1 : v; }
  return reescalar(out, M, N);
}

/** Campo de Worley periódico: { f1, f2, borde (f2-f1), id, id2 }. freq entero o [fx, fy]. jit 0..1. warp igual que en fbm. */
export function worley(N, freq, o = {}) {
  const [fx, fy] = par(freq);
  const s = (o.semilla ?? 1) | 0, jit = o.jit ?? 1;
  const n = N * N;
  const f1 = new Float32Array(n), f2 = new Float32Array(n), id = new Float32Array(n), id2 = new Float32Array(n);
  const w = o.warp; let wpx = 0, wpy = 0, wamp = 0, ws = 0;
  if (w) { [wpx, wpy] = par(w.freq ?? 3); wamp = w.amp ?? 0.3; ws = (w.semilla ?? s + 55) | 0; }
  const inv = 1 / N;
  for (let y = 0; y < N; y++) {
    const v = y * inv;
    for (let x = 0; x < N; x++) {
      const u = x * inv;
      let xx = u * fx, yy = v * fy;
      if (w) {
        xx += wamp * perlin2(u * wpx, v * wpy, wpx, wpy, ws);
        yy += wamp * perlin2(u * wpx + 5.3, v * wpy + 2.9, wpx, wpy, ws + 9);
      }
      worley2(xx, yy, fx, fy, s, jit);
      const i = y * N + x;
      f1[i] = W.f1; f2[i] = W.f2; id[i] = W.id; id2[i] = W.id2;
    }
  }
  const borde = new Float32Array(n);
  for (let i = 0; i < n; i++) borde[i] = f2[i] - f1[i];
  return { f1, f2, borde, id, id2 };
}

/** Campo de desplazamiento periódico (en píxeles) para deformar bordes: { dx, dy } */
export function deformacion(N, freq, amp, semilla = 5, oct = 3) {
  const a = fbm(N, freq, oct, { semilla, exacto: false }), b = fbm(N, freq, oct, { semilla: semilla + 31 });
  for (let i = 0; i < a.length; i++) { a[i] = (a[i] - 0.5) * 2 * amp; b[i] = (b[i] - 0.5) * 2 * amp; }
  return { dx: a, dy: b };
}

/** Desenfoque periódico (dos pasadas de caja separable ≈ gaussiano). */
export function desenfocar(f, N, r, pasadas = 2) {
  r = Math.max(1, Math.round(r));
  let a = f, b = new Float32Array(N * N);
  const tmp = new Float32Array(N);
  const d = 2 * r + 1;
  for (let p = 0; p < pasadas; p++) {
    // horizontal a → b
    for (let y = 0; y < N; y++) {
      const ro = y * N; let s = 0;
      for (let k = -r; k <= r; k++) s += a[ro + ((k % N) + N) % N];
      for (let x = 0; x < N; x++) {
        b[ro + x] = s / d;
        s += a[ro + ((x + r + 1) % N)] - a[ro + (((x - r) % N) + N) % N];
      }
    }
    // vertical b → a (en una copia si a es la fuente original)
    const dst = a === f ? new Float32Array(N * N) : a;
    for (let x = 0; x < N; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += b[(((k % N) + N) % N) * N + x];
      for (let y = 0; y < N; y++) {
        tmp[y] = s / d;
        s += b[((y + r + 1) % N) * N + x] - b[((((y - r) % N) + N) % N) * N + x];
      }
      for (let y = 0; y < N; y++) dst[y * N + x] = tmp[y];
    }
    a = dst;
  }
  return a;
}

/** Cavidad (oclusión ambiental desde altura): 1 = abierto, <1 = hendidura. */
export function cavidad(h, N, radio, fuerza) {
  // el desenfoque es suave: se calcula a menor resolución cuando el radio es grande
  const f = radio >= 6 ? 4 : radio >= 3 ? 2 : 1;
  let b;
  if (f === 1) b = desenfocar(h, N, radio, 2);
  else {
    const M = N / f, s = new Float32Array(M * M), k = 1 / (f * f);
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) { let a = 0; for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) a += h[(y * f + j) * N + x * f + i]; s[y * M + x] = a * k; }
    b = reescalar(desenfocar(s, M, Math.max(1, Math.round(radio / f)), 2), M, N);
  }
  const o = new Float32Array(N * N);
  for (let i = 0; i < o.length; i++) { const v = 1 - (b[i] - h[i]) * fuerza; o[i] = v < 0 ? 0 : v > 1 ? 1 : v; }
  return o;
}

// ───────────────────────────── Despiece (ladrillos, losas, tablones, sillares) ─────────────────────────────
/**
 * Divide el mosaico en filas de piezas rectangulares (periódico).
 * o: { filas, piezas (n por fila, número o función(fila)→n), hVar, wVar (0..1), desfase (fracción de pieza en filas impares,
 *      'azar' para desfase aleatorio), redondeo (px), deform: { dx, dy } campos en px, semilla, cuadrado }
 * Devuelve arrays N*N: id, id2 (azar por pieza), u, v (0..1 local), d (distancia interior al borde en px; <0 fuera), pw, ph (tamaño px)
 */
export function despiece(N, o = {}) {
  const n = N * N;
  const rng = crearRng((o.semilla ?? 3) * 7919 + 13);
  const filas = o.filas ?? 8, hVar = o.hVar ?? 0, wVar = o.wVar ?? 0, redondeo = o.redondeo ?? 0;
  const dfs = o.desfase ?? 0.5;
  // alturas de fila
  const pesos = []; let sp = 0;
  for (let r = 0; r < filas; r++) { const p = 1 + hVar * (rng() * 2 - 1); pesos.push(p); sp += p; }
  const ys = [0]; let acc = 0;
  for (let r = 0; r < filas; r++) { acc += (pesos[r] / sp) * N; ys.push(r === filas - 1 ? N : Math.round(acc)); }
  const filaDeY = new Int16Array(N);
  for (let r = 0; r < filas; r++) for (let y = ys[r]; y < ys[r + 1]; y++) filaDeY[y] = r;
  // piezas por fila
  const F = [];
  let idGlobal = 0;
  for (let r = 0; r < filas; r++) {
    let np = typeof o.piezas === 'function' ? o.piezas(r) : (o.piezas ?? 4);
    np = Math.max(1, Math.round(np));
    const ws = []; let sw = 0;
    for (let k = 0; k < np; k++) { const w = 1 + wVar * (rng() * 2 - 1); ws.push(w); sw += w; }
    const xs = [0]; let a = 0;
    for (let k = 0; k < np; k++) { a += (ws[k] / sw) * N; xs.push(k === np - 1 ? N : a); }
    let off = 0;
    if (dfs === 'azar') off = rng() * N;
    else if (r % 2 === 1) off = (dfs * N) / np;
    const ids = [], ids2 = [];
    for (let k = 0; k < np; k++) { ids.push(rng()); ids2.push(rng()); idGlobal++; }
    F.push({ np, xs, off, ids, ids2, base: idGlobal - np });
  }
  const id = new Float32Array(n), id2 = new Float32Array(n), u = new Float32Array(n), v = new Float32Array(n), d = new Float32Array(n);
  const pw = new Float32Array(n), ph = new Float32Array(n);
  const dd = o.deform;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let sx = x, sy = y;
      if (dd) { sx += dd.dx[i]; sy += dd.dy[i]; }
      sy = ((sy % N) + N) % N;
      const r = filaDeY[sy | 0];
      const fr = F[r], y0 = ys[r], hh = ys[r + 1] - y0;
      const t = (((sx - fr.off) % N) + N) % N;
      // pieza: búsqueda binaria en xs
      let lo = 0, hi = fr.np - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (fr.xs[m] <= t) lo = m; else hi = m - 1; }
      const x0 = fr.xs[lo], w = fr.xs[lo + 1] - x0;
      const lx = t - x0, ly = sy - y0;
      id[i] = fr.ids[lo]; id2[i] = fr.ids2[lo];
      u[i] = lx / w; v[i] = ly / hh; pw[i] = w; ph[i] = hh;
      if (redondeo > 0) {
        const qx = Math.abs(lx - w / 2) - (w / 2 - redondeo), qy = Math.abs(ly - hh / 2) - (hh / 2 - redondeo);
        const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
        d[i] = redondeo - (Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0));
      } else d[i] = o.soloX ? Math.min(lx, w - lx) : Math.min(lx, w - lx, ly, hh - ly);
    }
  }
  return { id, id2, u, v, d, pw, ph };
}

// ───────────────────────────── Altura → normal, AO, mips ─────────────────────────────
/** Normal en espacio tangente desde altura (Sobel periódico). fuerza ≈ pendiente por unidad de altura/píxel. → Float32Array 3N² (vector normalizado) */
export function normalDesdeAltura(h, N, fuerza) {
  const o = new Float32Array(N * N * 3);
  const xm = new Int32Array(N), xp = new Int32Array(N);
  for (let x = 0; x < N; x++) { xm[x] = (x + N - 1) % N; xp[x] = (x + 1) % N; }
  for (let y = 0; y < N; y++) {
    const rm = ((y + N - 1) % N) * N, r0 = y * N, rp = ((y + 1) % N) * N;
    for (let x = 0; x < N; x++) {
      const a = xm[x], b = xp[x];
      const dx = (h[rm + b] + 2 * h[r0 + b] + h[rp + b] - h[rm + a] - 2 * h[r0 + a] - h[rp + a]) * 0.125;
      const dy = (h[rp + a] + 2 * h[rp + x] + h[rp + b] - h[rm + a] - 2 * h[rm + x] - h[rm + b]) * 0.125;
      let nx = -dx * fuerza, ny = -dy * fuerza;
      const il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const k = (r0 + x) * 3;
      o[k] = nx * il; o[k + 1] = ny * il; o[k + 2] = il;
    }
  }
  return o;
}

const SRGB_A_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; SRGB_A_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

/**
 * Cadena de mipmaps de normal y ORM con corrección de Toksvig (la rugosidad sube donde el relieve se promedia).
 * normal: Float32Array 3N² (unitario) · orm: Uint8Array 4N² (R=ao, G=rugosidad, B=metal, A=altura)
 * Devuelve { normal: [{data,width,height}], orm: [...] } listas de niveles, incluido el 0.
 */
export function mipsNormalOrm(normal, orm, N) {
  const nm = [], om = [];
  // nivel 0
  let nx = new Float32Array(N * N), ny = new Float32Array(N * N), nz = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { nx[i] = normal[i * 3]; ny[i] = normal[i * 3 + 1]; nz[i] = normal[i * 3 + 2]; }
  let ao = new Float32Array(N * N), ro = new Float32Array(N * N), me = new Float32Array(N * N), al = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { ao[i] = orm[i * 4] / 255; ro[i] = orm[i * 4 + 1] / 255; me[i] = orm[i * 4 + 2] / 255; al[i] = orm[i * 4 + 3] / 255; }
  let S = N;
  const R0 = new Float32Array(N * N); R0.set(ro);
  for (;;) {
    const nd = new Uint8Array(S * S * 4), od = new Uint8Array(S * S * 4);
    for (let i = 0; i < S * S; i++) {
      const lx = nx[i], ly = ny[i], lz = nz[i];
      const l = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
      nd[i * 4] = Math.round((lx / l * 0.5 + 0.5) * 255); nd[i * 4 + 1] = Math.round((ly / l * 0.5 + 0.5) * 255); nd[i * 4 + 2] = Math.round((lz / l * 0.5 + 0.5) * 255); nd[i * 4 + 3] = 255;
      // Toksvig
      let r = ro[i];
      if (l < 0.9999) {
        const rr = Math.max(r, 0.045);
        const ss = 2 / (rr * rr * rr * rr) - 2;
        const ss2 = ss * l / (l + ss * (1 - l));
        r = Math.min(1, Math.pow(2 / (ss2 + 2), 0.25));
        if (r < ro[i]) r = ro[i];
      }
      od[i * 4] = Math.round(ao[i] * 255); od[i * 4 + 1] = Math.round(r * 255); od[i * 4 + 2] = Math.round(me[i] * 255); od[i * 4 + 3] = Math.round(al[i] * 255);
    }
    nm.push({ data: nd, width: S, height: S }); om.push({ data: od, width: S, height: S });
    if (S === 1) break;
    const T = S >> 1;
    const f = (src) => { const o = new Float32Array(T * T); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const a = (2 * y) * S + 2 * x; o[y * T + x] = (src[a] + src[a + 1] + src[a + S] + src[a + S + 1]) * 0.25; } return o; };
    nx = f(nx); ny = f(ny); nz = f(nz); ao = f(ao); me = f(me); al = f(al);
    // la rugosidad de base se promedia desde la anterior
    ro = f(ro);
    S = T;
  }
  return { normal: nm, orm: om };
}

// ───────────────────────────── Contexto de generación ─────────────────────────────
/**
 * Contexto que reciben los generadores de materiales. Los generadores escriben en:
 *   c.alb (Float32Array 3·N², sRGB) · c.tinte (N², 0..1: cuánto toma el color del material) · c.h (altura) · c.rug · c.met
 *   c.ao (opcional; si no se da se calcula de la altura) · c.emi (Float32Array 3·N² lineal, opcional)
 */
export function crearContexto(N, semilla = 1) {
  const n = N * N;
  let contador = 0;
  const c = {
    N, n, semilla,
    rng: crearRng(semilla * 2654435761 + 17),
    alb: new Float32Array(n * 3), tinte: new Float32Array(n).fill(1),
    h: new Float32Array(n), rug: new Float32Array(n).fill(0.8), met: new Float32Array(n),
    ao: null, emi: null,
    fuerzaNormal: 3, cav: [{ r: 2, f: 3 }, { r: 8, f: 1.4 }],
    sem() { return (semilla * 1013 + (++contador) * 7177) | 0; },
    // ruido
    fbm(freq, oct = 4, o = {}) { return fbm(N, freq, oct, { semilla: c.sem(), ...o }); },
    cresta(freq, oct = 4, o = {}) { return fbm(N, freq, oct, { semilla: c.sem(), tipo: 'cresta', ...o }); },
    turb(freq, oct = 4, o = {}) { return fbm(N, freq, oct, { semilla: c.sem(), tipo: 'turb', ...o }); },
    valor(freq, oct = 1, o = {}) { return fbm(N, freq, oct, { semilla: c.sem(), tipo: 'valor', ...o }); },
    worley(freq, o = {}) { return worley(N, freq, { semilla: c.sem(), ...o }); },
    deform(freq, amp, oct = 3) { return deformacion(N, freq, amp, c.sem(), oct); },
    despiece(o = {}) { return despiece(N, { semilla: c.sem(), ...o }); },
    desenfocar(f, r, p = 2) { return desenfocar(f, N, r, p); },
    emision() { if (!c.emi) c.emi = new Float32Array(n * 3); return c.emi; },
    /** Escala los px de un diseño pensado para 512 al tamaño actual. */
    px(v) { return (v * N) / 512; },
  };
  return c;
}

// ───────────────────────────── Utilidades de dibujo ─────────────────────────────
/** Grietas: máscara 1 en la grieta (bordes de Worley deformados). `zona` (0..1) limita dónde aparecen: pocas y que mueren a medio camino. */
export function grietas(c, { freq = 5, ancho = 0.03, deform = 0.35, zona = 0.5 } = {}) {
  const w = c.worley(freq, { jit: 0.9, warp: { amp: deform, freq: Math.max(2, freq), semilla: c.sem() } });
  const o = new Float32Array(c.n);
  const reg = zona < 1 ? c.fbm(Math.max(2, freq), 3, { warp: { amp: 0.5, freq: 2 } }) : null;
  const u = 1 - zona;
  for (let i = 0; i < c.n; i++) {
    let m = 1 - suave(0, ancho, w.borde[i]);
    if (reg) m *= suave(0.5 + u * 0.1, 0.62 + u * 0.1, reg[i] + (w.id[i] - 0.5) * 0.35);
    o[i] = m;
  }
  return o;
}
/** Vetas tipo mármol/madera: líneas finas 0..1 siguiendo un ruido deformado. */
export function vetas(c, { freq = 3, deform = 1.5, grosor = 0.1, dir = 'x', ruido, semilla } = {}) {
  const N = c.N, o = new Float32Array(c.n);
  const rn = ruido || c.fbm(3, 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const t = (dir === 'x' ? x : y) / N * freq + (rn[i] - 0.5) * deform;
    const s = Math.abs(Math.sin(t * Math.PI));
    o[i] = 1 - suave(0, grosor, s);
  }
  return o;
}
/** Remaches/pernos en rejilla: { alt (cúpula 0..1), mask (disco) }. `alternar` desplaza las filas impares media celda. */
export function remaches(c, { cols = 8, filas = 8, radio = 5, desfaseX = 0.5, desfaseY = 0.5, alternar = false } = {}) {
  const N = c.N, alt = new Float32Array(c.n), mask = new Float32Array(c.n);
  const cw = N / cols, ch = N / filas, r = c.px(radio);
  for (let y = 0; y < N; y++) {
    const gy = Math.floor(y / ch);
    for (let x = 0; x < N; x++) {
      const gx = Math.floor(x / cw);
      let best = 1e9;
      for (let j = -1; j <= 1; j++) {
        const cy = (gy + j + desfaseY) * ch;
        const par = ((gy + j) % 2 + 2) % 2;
        const off = alternar && par ? 0.5 : 0;
        for (let k = -1; k <= 1; k++) {
          const cx = (gx + k + desfaseX + off) * cw;
          const d1 = x - cx, d2 = y - cy, dist = Math.sqrt(d1 * d1 + d2 * d2);
          if (dist < best) best = dist;
        }
      }
      if (best < r) { const t = best / r; alt[y * N + x] = Math.sqrt(1 - t * t); mask[y * N + x] = suave(0, 0.3, 1 - t); }
    }
  }
  return { alt, mask };
}
/** Goteos/vetas de suciedad verticales: 0..1. Más intenso arriba o cerca de elementos si se da `origen`. */
export function goteos(c, { cols = 40, largo = 3, semilla } = {}) {
  const a = c.fbm([cols, largo], 3, { exacto: true });
  const b = c.fbm([cols * 2, largo * 2], 2);
  const o = new Float32Array(c.n);
  for (let i = 0; i < c.n; i++) o[i] = clamp((a[i] - 0.42) * 3.2 * (0.7 + b[i] * 0.6));
  return o;
}
/** Óxido: máscara 0..1 con bordes irregulares (hierro oxidado), con pústulas. */
export function oxido(c, { cantidad = 0.5, freq = 4, detalle = 6 } = {}) {
  const a = c.fbm(freq, 5, { warp: { amp: 0.6, freq: 3 } });
  const b = c.fbm(freq * 6, 3);
  const o = new Float32Array(c.n);
  const t = 1 - cantidad;
  for (let i = 0; i < c.n; i++) o[i] = suave(t - 0.08, t + 0.08, a[i] * 0.8 + b[i] * 0.3 - 0.1);
  return o;
}
/** Manchas suaves (suciedad, humedad): 0..1. */
export function manchas(c, { freq = 3, cantidad = 0.5, dureza = 0.25 } = {}) {
  const a = c.fbm(freq, 5, { warp: { amp: 0.4, freq: 2 } });
  const o = new Float32Array(c.n);
  const t = 1 - cantidad;
  for (let i = 0; i < c.n; i++) o[i] = suave(t - dureza, t + dureza, a[i]);
  return o;
}

// ───────────────────────────── Empaquetado final ─────────────────────────────
const b8 = (v) => { v = v * 255 + 0.5; return v < 0 ? 0 : v > 255 ? 255 : v | 0; };

/** Convierte lo escrito en el contexto en imágenes de 8 bits y cadenas de mipmaps. */
export function finalizar(c, { mips = true } = {}) {
  const N = c.N, n = c.n;
  // cavidad desde altura
  const h = c.h;
  let ao = c.ao;
  if (!ao) {
    ao = new Float32Array(n).fill(1);
    for (const { r, f } of c.cav) { const cv = cavidad(h, N, c.px(r), f); for (let i = 0; i < n; i++) ao[i] *= cv[i]; }
  }
  const norm = normalDesdeAltura(h, N, c.fuerzaNormal * (N / 512));
  const albedo = new Uint8Array(n * 4), orm = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    albedo[i * 4] = b8(c.alb[i * 3]); albedo[i * 4 + 1] = b8(c.alb[i * 3 + 1]); albedo[i * 4 + 2] = b8(c.alb[i * 3 + 2]); albedo[i * 4 + 3] = b8(c.tinte[i]);
    orm[i * 4] = b8(ao[i]); orm[i * 4 + 1] = b8(c.rug[i]); orm[i * 4 + 2] = b8(c.met[i]); orm[i * 4 + 3] = b8(h[i]);
  }
  let emi = null;
  if (c.emi) { emi = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { emi[i * 4] = b8(c.emi[i * 3]); emi[i * 4 + 1] = b8(c.emi[i * 3 + 1]); emi[i * 4 + 2] = b8(c.emi[i * 3 + 2]); emi[i * 4 + 3] = 255; } }
  let normal, mipN = null, mipO = null;
  if (mips) { const m = mipsNormalOrm(norm, orm, N); mipN = m.normal; mipO = m.orm; normal = mipN[0].data; }
  else { normal = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { normal[i * 4] = b8(norm[i * 3] * 0.5 + 0.5); normal[i * 4 + 1] = b8(norm[i * 3 + 1] * 0.5 + 0.5); normal[i * 4 + 2] = b8(norm[i * 3 + 2] * 0.5 + 0.5); normal[i * 4 + 3] = 255; } }
  return { N, albedo, normal, orm, emi, mipNormal: mipN, mipOrm: mipO };
}

/** Textura de ruido de baja frecuencia (4 canales independientes) para la macro-variación en shader. */
export function ruidoMacro(N = 256) {
  const a = [fbm(N, 3, 4, { semilla: 901 }), fbm(N, 4, 4, { semilla: 902, warp: { amp: 0.5, freq: 2 } }), fbm(N, 6, 3, { semilla: 903 }), fbm(N, 2, 5, { semilla: 904, warp: { amp: 0.8, freq: 3 } })];
  const d = new Uint8Array(N * N * 4);
  // normaliza cada canal a un rango útil (0.1..0.9 → 0..1)
  for (const f of a) { let lo = 1, hi = 0; for (let i = 0; i < f.length; i++) { if (f[i] < lo) lo = f[i]; if (f[i] > hi) hi = f[i]; } const k = 1 / (hi - lo); for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) * k; }
  for (let i = 0; i < N * N; i++) for (let k = 0; k < 4; k++) d[i * 4 + k] = b8(a[k][i]);
  return { N, data: d };
}
