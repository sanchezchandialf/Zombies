// Catálogo · CUBIERTAS (512 px)
import { clamp, suave, mezcla, col, blanco, rampa, crearRng } from './util.js';

const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
const poner = (c, i, r, g, b) => { c.alb[i * 3] = r; c.alb[i * 3 + 1] = g; c.alb[i * 3 + 2] = b; };
const par = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };

const teja_arabe = {
  nombre: 'teja_arabe', grupo: 'cubiertas', tam: 512, escala: 1.6,
  descripcion: 'Cubierta de teja árabe de barro: canales y cobijas en hileras, solapes sombreados, líquenes y hollín.',
  material: { macro: [0.2, 0.07, 0.1], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const cols = 8, Wc = N / cols, filasT = 4, L = N / filasT;
    const rng = crearRng(c.semilla * 5 + 2);
    const off = [], tid = [];
    for (let k = 0; k < cols; k++) { off.push(rng() * N); for (let j = 0; j < filasT + 1; j++) tid.push(rng()); }
    const warp = c.deform(6, px(2.2)), sup = c.fbm(30, 4), blot = c.fbm(5, 5, { warp: { amp: 0.5, freq: 3 } }), bl = blanco(N, 33), liq = c.fbm(11, 5), sombra = c.fbm(4, 3);
    const pal = [col(0x8a3d22), col(0xb0562e), col(0xc4703c), col(0x9c4a2a), col(0xd08a52)];
    const liquen = col(0x8a9a5a), hollin = col(0x2a211b);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const xx = x + warp.dx[i] * 0.6, yy = y + warp.dy[i] * 0.4;
      const cx = Math.floor((((xx % N) + N) % N) / Wc);
      const lx = ((((xx % N) + N) % N) / Wc - cx) * 2 - 1;      // -1..1
      const cover = (cx & 1) === 0;                              // cobija (convexa) o canal (cóncava)
      const ty = (((yy + off[cx]) % N) + N) % N;
      const seg = Math.floor(ty / L), t = (ty / L - seg);
      const id = tid[cx * (filasT + 1) + seg];
      // perfil transversal: cobija = cúpula estrecha, canal = vaguada
      const dome = Math.sqrt(Math.max(0, 1 - lx * lx));
      let perfil = cover ? 0.55 + 0.45 * dome : 0.3 + 0.1 * (1 - dome) * 0;
      if (!cover) perfil = 0.28 + 0.22 * (1 - Math.abs(lx)) * 0.6 - 0.1 * dome * 0.0;
      // el solape: la teja crece hacia el extremo inferior y termina en un borde con sombra
      const rampa2 = 0.72 + 0.28 * suave(0, 0.88, t);
      const caida = 1 - suave(0.9, 0.995, t);
      const h = perfil * rampa2 * (0.45 + 0.55 * caida) + (sup[i] - 0.5) * 0.06 + (id - 0.5) * 0.05;
      c.h[i] = h;
      const p = Math.min(3.99, id * 5), pi = Math.floor(p);
      par(pal[pi], pal[pi + 1], p - pi, tmp);
      let k = 0.9 + (blot[i] - 0.5) * 0.5 + (sup[i] - 0.5) * 0.25 + (bl[i] - 0.5) * 0.1;
      k *= 0.55 + 0.45 * rampa2 + 0.0;                              // más oscuro bajo el solape
      k *= 0.5 + 0.5 * caida + 0.0;
      k *= 0.7 + 0.3 * (cover ? 0.6 + 0.4 * dome : 0.6 + 0.4 * (1 - Math.abs(lx)));
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const ho = suave(0.55, 0.8, sombra[i]) * (cover ? 0.3 : 0.7) * 0.6 + (!cover ? 0.25 : 0);
      r = mezcla(r, hollin[0], ho * 0.5); g = mezcla(g, hollin[1], ho * 0.5); b = mezcla(b, hollin[2], ho * 0.5);
      const lq = suave(0.62, 0.78, liq[i]) * 0.55;
      r = mezcla(r, liquen[0], lq); g = mezcla(g, liquen[1], lq); b = mezcla(b, liquen[2], lq);
      poner(c, i, r, g, b);
      c.tinte[i] = 0;
      c.rug[i] = clamp(0.78 + (sup[i] - 0.5) * 0.25 - (1 - caida) * 0.0 + lq * 0.1);
    }
    c.fuerzaNormal = 7; c.cav = [{ r: 2, f: 2.6 }, { r: 10, f: 2.2 }];
  },
};

const pizarra = {
  nombre: 'pizarra', grupo: 'cubiertas', tam: 512, escala: 1.4,
  descripcion: 'Tejado de pizarra azulada en hiladas solapadas, con lajas desportilladas, rotas y manchas de musgo.',
  material: { macro: [0.2, 0.05, 0.12], desgaste: 0.35, props: { envMapIntensity: 1.1 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const dd = c.deform(8, px(2.5));
    const D = c.despiece({ filas: 12, piezas: (r) => 6, hVar: 0.0, wVar: 0.25, desfase: 0.5, redondeo: px(3), deform: dd });
    const sup = c.fbm(40, 4), blot = c.fbm(5, 5), bl = blanco(N, 35), estr = c.fbm([60, 3], 2, { exacto: true }), mus = c.fbm(11, 5), esq = c.fbm(16, 3), roce = c.fbm(4, 4);
    const pal = [col(0x3c4752), col(0x4b5864), col(0x59656f), col(0x353b43), col(0x4f4a52)];
    const musgo = col(0x58703a);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i];
      const mord = suave(0.68, 0.84, esq[i]) * (1 - suave(px(2), px(14), d)) * (D.v[i] > 0.5 ? 1 : 0.3);
      const m = suave(px(1.2), px(2.6), d) * (1 - mord);
      const bisel = suave(0, px(5), d);
      const sh = suave(0, 0.18, D.v[i]);               // zona cubierta por la hilada superior
      const lip = suave(0.86, 1.0, D.v[i]);            // canto grueso inferior
      const tilt = 0.5 + id * 0.35;
      c.h[i] = mezcla(0.05, 0.2 + D.v[i] * 0.55 * tilt + lip * 0.18 + bisel * 0.06 + (sup[i] - 0.5) * 0.06 + (estr[i] - 0.5) * 0.03, m);
      const p = Math.min(3.99, id * 4), pi = Math.floor(p);
      par(pal[pi], pal[pi + 1], p - pi, tmp);
      let k = 1.0 + (blot[i] - 0.5) * 0.45 + (sup[i] - 0.5) * 0.25 + (estr[i] - 0.5) * 0.18 + (bl[i] - 0.5) * 0.06;
      k *= 0.45 + 0.55 * sh;                          // sombra bajo la hilada de arriba
      k *= 1 + lip * 0.25;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const ms = suave(0.66, 0.8, mus[i]) * (0.3 + 0.7 * (1 - D.v[i])) * 0.6;
      r = mezcla(r, musgo[0], ms); g = mezcla(g, musgo[1], ms); b = mezcla(b, musgo[2], ms);
      r *= 0.25 + 0.75 * m; g *= 0.25 + 0.75 * m; b *= 0.25 + 0.75 * m;
      poner(c, i, r, g, b);
      c.tinte[i] = 0;
      c.rug[i] = clamp(0.5 + (roce[i] - 0.5) * 0.4 + (estr[i] - 0.5) * 0.25 + ms * 0.4 + (bl[i] - 0.5) * 0.05);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 2 }];
  },
};

const paja = {
  nombre: 'paja', grupo: 'cubiertas', tam: 512, escala: 1.6,
  descripcion: 'Tejado de paja trenzada: miles de tallos dorados y pardos, hileras atadas y manchas de humedad.',
  material: { macro: [0.2, 0.07, 0.06], desgaste: 0.3 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const rng = crearRng(c.semilla * 41 + 1);
    const fino = c.fbm(70, 2), mancha = c.fbm(4, 5, { warp: { amp: 0.5, freq: 3 } }), hum = c.fbm(6, 4);
    const pal = [col(0x6f5a2c), col(0x9a8040), col(0xc2a45a), col(0xd8bd72), col(0x8a6e3a)];
    const z = new Float32Array(n), acc = new Float32Array(n * 3), tid = new Float32Array(n);
    for (let i = 0; i < n; i++) { acc[i * 3] = 0.12; acc[i * 3 + 1] = 0.09; acc[i * 3 + 2] = 0.05; }
    const tallos = Math.round(n / 70), L0 = px(80);
    const bandas = 6;
    for (let k = 0; k < tallos; k++) {
      const x0 = rng() * N, y0 = rng() * N;
      const ang = Math.PI / 2 + (rng() - 0.5) * 0.45, L = L0 * (0.7 + rng() * 0.7), curv = (rng() - 0.5) * 0.18;
      const idx = ((y0 | 0) * N + (x0 | 0));
      const t0 = clamp(0.25 + mancha[idx] * 0.6 + (rng() - 0.5) * 0.4);
      rampa(pal, t0, tmp);
      const ancho = px(1.3 + rng() * 1.0), zb = rng() * 0.35, pasos = Math.round(L / 1.5);
      for (let s = 0; s <= pasos; s++) {
        const t = s / pasos, a2 = ang + curv * t;
        const x = x0 + Math.cos(a2) * L * t, y = y0 + Math.sin(a2) * L * t;
        const wd = ancho * 0.5 + 0.3;
        const zt = 0.25 + zb + 0.35 * t;
        const lum = 0.65 + 0.5 * t;
        const rad = Math.ceil(wd);
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const dd = Math.sqrt(dx * dx + dy * dy); if (dd > wd) continue;
          const xp = (((Math.round(x) + dx) % N) + N) % N, yp = (((Math.round(y) + dy) % N) + N) % N, j = yp * N + xp;
          const zz = zt * (1 - 0.3 * dd / wd);
          if (zz > z[j]) { z[j] = zz; const k2 = lum * (1 - 0.2 * dd / wd); acc[j * 3] = tmp[0] * k2; acc[j * 3 + 1] = tmp[1] * k2; acc[j * 3 + 2] = tmp[2] * k2; }
        }
      }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      // hileras atadas: surcos horizontales suaves
      const hb = 0.5 + 0.5 * Math.cos((y / N) * bandas * Math.PI * 2);
      const k = (0.88 + (fino[i] - 0.5) * 0.3) * (0.88 + 0.12 * hb) * (1 - suave(0.6, 0.8, hum[i]) * 0.25);
      poner(c, i, acc[i * 3] * k, acc[i * 3 + 1] * k, acc[i * 3 + 2] * k);
      c.h[i] = z[i] * 0.8 + hb * 0.12;
      c.rug[i] = clamp(0.85 + (fino[i] - 0.5) * 0.15);
      c.tinte[i] = 0;
    }
    c.fuerzaNormal = 2.8; c.cav = [{ r: 2, f: 3.5 }, { r: 8, f: 1.8 }];
  },
};

const tela_asfaltica = {
  nombre: 'tela_asfaltica', grupo: 'cubiertas', tam: 512, escala: 2,
  descripcion: 'Lámina asfáltica negra con gránulo mineral, solapes, burbujas, parches de alquitrán y charcos de agua sucia.',
  material: { macro: [0.2, 0.03, 0.08], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 4, piezas: 1, desfase: 0, redondeo: 0, soloX: false });
    const bl = blanco(N, 37), bl2 = blanco(N, 38), gran = c.worley(110, { jit: 1 }), blot = c.fbm(5, 5, { warp: { amp: 0.5, freq: 3 } }), burb = c.worley(12, { jit: 1 }), parche = c.fbm(4, 5, { warp: { amp: 0.7, freq: 2 } }), charco = c.fbm(3, 5, { warp: { amp: 0.6, freq: 2 } }), fino = c.fbm(60, 2);
    const base = col(0x4a4b50), claro = col(0x77777c), alq = col(0x222225);
    for (let i = 0; i < n; i++) {
      const d = D.d[i];
      const costura = 1 - suave(0, px(3), D.v[i] * D.ph[i]);
      const lip = suave(px(6), 0, D.v[i] * D.ph[i] - px(0));
      const g = (1 - suave(0, 0.3, gran.f1[i])) * (gran.id[i] > 0.4 ? 1 : 0.4);
      par(base, claro, g * (0.3 + gran.id[i] * 0.7) * 0.8, tmp);
      let k = 0.92 + (blot[i] - 0.5) * 0.4 + (bl[i] - 0.5) * 0.2 + (fino[i] - 0.5) * 0.1;
      if (bl2[i] > 0.997) k *= 1.8;
      const ap = suave(0.62, 0.7, parche[i]);               // parche de alquitrán liso
      let r = tmp[0] * k, gg = tmp[1] * k, b = tmp[2] * k;
      r = mezcla(r, alq[0], ap * 0.85); gg = mezcla(gg, alq[1], ap * 0.85); b = mezcla(b, alq[2], ap * 0.85);
      const bu = (burb.id[i] > 0.8) ? 1 - suave(0.1, 0.3, burb.f1[i]) : 0;
      r *= 1 + bu * 0.25; gg *= 1 + bu * 0.25; b *= 1 + bu * 0.25;
      r *= 1 - costura * 0.5; gg *= 1 - costura * 0.5; b *= 1 - costura * 0.5;
      poner(c, i, r, gg, b);
      c.tinte[i] = 0;
      c.h[i] = 0.5 + g * 0.22 * (1 - ap) + bu * 0.12 - costura * 0.2 + (D.v[i] > 0.97 ? 0.05 : 0) + (fino[i] - 0.5) * 0.04 + ap * 0.08;
      const cm = suave(0.6, 0.66, charco[i]);
      c.rug[i] = clamp(mezcla(mezcla(0.88 - g * 0.1, 0.3, ap), 0.06, cm));
      c.h[i] = mezcla(c.h[i], 0.42, cm);
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 2, f: 3 }, { r: 10, f: 1.6 }];
  },
};

export default [teja_arabe, pizarra, paja, tela_asfaltica];
