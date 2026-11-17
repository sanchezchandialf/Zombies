// Catálogo · SUELOS (1024 px; el suelo ocupa el 60 % de la pantalla)
import { clamp, suave, mezcla, col, blanco, rampa, crearRng, maderaVeta } from './util.js';
import { grietas, remaches } from '../texturas.js';

const tmp = [0, 0, 0], tmp2 = [0, 0, 0];

/** Escribe el albedo del píxel i. */
const poner = (c, i, r, g, b) => { c.alb[i * 3] = r; c.alb[i * 3 + 1] = g; c.alb[i * 3 + 2] = b; };

/** Aplica ruido fino (grano) multiplicando el albedo. */
function grano(c, amt, sem = 3) {
  const w = blanco(c.N, sem + c.semilla);
  for (let i = 0; i < c.n; i++) { const k = 1 + (w[i] - 0.5) * amt; c.alb[i * 3] *= k; c.alb[i * 3 + 1] *= k; c.alb[i * 3 + 2] *= k; }
  return w;
}

const adoquin = {
  nombre: 'adoquin', grupo: 'suelos', tam: 1024, escala: 1.6,
  descripcion: 'Adoquín de granito en hiladas, juntas con tierra y musgo, desgaste pulido en las caras.',
  material: { macro: [0.2, 0.06, 0.12], desgaste: 0.3 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const dd = c.deform(9, px(5));
    const D = c.despiece({ filas: 16, piezas: 8, hVar: 0.08, wVar: 0.32, desfase: 0.5, redondeo: px(15), deform: dd });
    const sup = c.fbm(26, 4), blot = c.fbm(5, 4, { warp: { amp: 0.4, freq: 3 } }), pulido = c.fbm(7, 3), musgo = c.fbm(14, 4), poro = c.worley(70, { jit: 1 });
    const bl = blanco(N, 11);
    const gris1 = col(0x77726c), gris2 = col(0xb3a899), gris3 = col(0x938b82), basalto = col(0x56565a), rosa = col(0xa88f84), tierra = col(0x3a2e22), verde = col(0x5a6e30);
    const jw = px(2.4);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i], id2 = D.id2[i];
      const m = suave(jw, jw + px(2.2), d);
      const b = suave(0, px(15), d);
      const alto = 0.52 + 0.26 * id2;
      const rug = (sup[i] - 0.5) * 0.2 + (bl[i] - 0.5) * 0.03;
      const hp = alto + 0.22 * Math.pow(b, 0.65) + rug - (poro.f1[i] < 0.12 ? 0.05 : 0);
      c.h[i] = mezcla(0.06 + 0.04 * sup[i], hp, m);
      // color de piedra
      if (id < 0.15) mezclaPar(basalto, gris1, id2, tmp); else if (id < 0.5) mezclaPar(gris1, gris3, id2, tmp); else if (id < 0.8) mezclaPar(gris3, gris2, id2, tmp); else mezclaPar(gris3, rosa, id2, tmp);
      let k = 1.0 + (blot[i] - 0.5) * 0.55 + (pulido[i] - 0.5) * 0.12;
      k *= 0.78 + 0.22 * suave(0, px(30), d);                 // suciedad hacia las juntas
      k *= 0.9 + (bl[i] - 0.5) * 0.28;                       // grano
      if (poro.f1[i] < 0.1) k *= 0.72;                      // poros
      let r = tmp[0] * k, g = tmp[1] * k, bb = tmp[2] * k;
      // junta: tierra, grano de arena y algo de musgo
      const jm = 1 - m;
      const mus = suave(0.55, 0.72, musgo[i]) * jm * 0.7 + suave(0.62, 0.8, musgo[i]) * (1 - suave(0, px(12), d)) * 0.35;
      const jr = tierra[0] * (0.7 + bl[i] * 0.9), jg = tierra[1] * (0.7 + bl[i] * 0.9), jb = tierra[2] * (0.7 + bl[i] * 0.9);
      r = mezcla(r, jr, jm); g = mezcla(g, jg, jm); bb = mezcla(bb, jb, jm);
      r = mezcla(r, verde[0], mus); g = mezcla(g, verde[1], mus); bb = mezcla(bb, verde[2], mus);
      poner(c, i, r, g, bb);
      c.rug[i] = clamp(0.8 - 0.2 * pulido[i] * b + (1 - m) * 0.2 + (sup[i] - 0.5) * 0.15);
    }
    c.fuerzaNormal = 4; c.cav = [{ r: 3, f: 4 }, { r: 12, f: 1.6 }];
  },
};
function mezclaPar(a, b, t, o) { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; }

const empedrado = {
  nombre: 'empedrado', grupo: 'suelos', tam: 1024, escala: 2.2,
  descripcion: 'Empedrado de cantos rodados irregulares con tierra entre las piedras.',
  material: { macro: [0.22, 0.07, 0.12], desgaste: 0.35 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const w = c.worley(9, { jit: 0.85, warp: { amp: 0.18, freq: 6 } });
    const w2 = c.worley(40, { jit: 1 });
    const sup = c.fbm(30, 3), blot = c.fbm(4, 4), musgo = c.fbm(12, 4), bl = blanco(N, 5);
    const pal = [col(0x6e675e), col(0x8c8374), col(0x575350), col(0x7d6e5a), col(0x9a9387), col(0x4f4a44), col(0x84705c)];
    const tierra = col(0x2e251b), verde = col(0x4a5b2b);
    for (let i = 0; i < n; i++) {
      const e = w.borde[i], id = w.id[i];
      const forma = suave(0.025, 0.2, e);
      const domo = Math.pow(suave(0, 0.45, e), 0.55);
      const hp = 0.35 + 0.35 * w.id2[i] + 0.3 * domo + (sup[i] - 0.5) * 0.12;
      c.h[i] = mezcla(0.05 + (w2.f1[i] < 0.15 ? 0.03 : 0) + 0.05 * sup[i], hp, forma);
      const p = Math.min(pal.length - 1.001, id * pal.length);
      const pi = Math.floor(p);
      mezclaPar(pal[pi], pal[pi + 1], p - pi, tmp);
      let k = 0.85 + (blot[i] - 0.5) * 0.5 + (bl[i] - 0.5) * 0.22 + (w2.f1[i] < 0.09 ? -0.1 : 0);
      k *= 0.78 + 0.22 * suave(0, 0.2, e);
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const jm = 1 - forma;
      r = mezcla(r, tierra[0] * (0.6 + bl[i]), jm); g = mezcla(g, tierra[1] * (0.6 + bl[i]), jm); b = mezcla(b, tierra[2] * (0.6 + bl[i]), jm);
      const mus = suave(0.6, 0.78, musgo[i]) * (jm * 0.7 + (1 - suave(0, 0.12, e)) * 0.3);
      r = mezcla(r, verde[0], mus); g = mezcla(g, verde[1], mus); b = mezcla(b, verde[2], mus);
      poner(c, i, r, g, b);
      c.rug[i] = clamp(0.72 + (bl[i] - 0.5) * 0.2 + jm * 0.22 - domo * 0.1);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 3, f: 3.5 }, { r: 14, f: 1.8 }];
  },
};

const tierra = {
  nombre: 'tierra', grupo: 'suelos', tam: 1024, escala: 2.5,
  descripcion: 'Tierra apisonada y seca con guijarros, terrones y marcas de rodadura.',
  material: { macro: [0.25, 0.08, 0.1], desgaste: 0.2 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const f1 = c.fbm(6, 5, { warp: { amp: 0.5, freq: 3 } }), f2 = c.fbm(24, 4), clod = c.worley(16, { jit: 1 }), peb = c.worley(46, { jit: 1 }), bl = blanco(N, 9);
    const sec = c.fbm(3, 3), hu = c.fbm(5, 4, { warp: { amp: 0.6, freq: 2 } });
    const cl = [col(0x4a3724), col(0x6b5035), col(0x8b6b45), col(0xa8865a)];
    const gui = [col(0x7c7468), col(0x5e564c), col(0x9a8f7c)];
    for (let i = 0; i < n; i++) {
      const t = clamp(f1[i] * 0.9 + (f2[i] - 0.5) * 0.35 + (sec[i] - 0.5) * 0.5 + 0.08);
      rampa(cl, t, tmp);
      let r = tmp[0], g = tmp[1], b = tmp[2];
      const terron = 1 - suave(0, 0.38, clod.f1[i]);
      const hum = suave(0.55, 0.75, hu[i]) * 0.4;
      let k = 0.8 + terron * 0.22 + (bl[i] - 0.5) * 0.3 + (f2[i] - 0.5) * 0.25 - hum * 0.35;
      r *= k; g *= k; b *= k;
      let h = 0.4 + f1[i] * 0.25 + (f2[i] - 0.5) * 0.14 + terron * clod.id[i] * 0.2;
      const pg = peb.id[i] > 0.78 ? 1 - suave(0.05, 0.2, peb.f1[i]) : 0;
      if (pg > 0) { const gi = gui[Math.floor(peb.id2[i] * 2.99)]; r = mezcla(r, gi[0] * (0.7 + peb.id[i] * 0.5), pg); g = mezcla(g, gi[1] * (0.7 + peb.id[i] * 0.5), pg); b = mezcla(b, gi[2] * (0.7 + peb.id[i] * 0.5), pg); h += pg * 0.3 * (0.4 + peb.id2[i]); }
      poner(c, i, r, g, b); c.h[i] = h;
      c.rug[i] = clamp(0.92 - hum * 0.3 - pg * 0.15 + (bl[i] - 0.5) * 0.1);
    }
    c.fuerzaNormal = 3.2; c.cav = [{ r: 3, f: 3 }, { r: 12, f: 1.5 }];
  },
};

const barro = {
  nombre: 'barro', grupo: 'suelos', tam: 1024, escala: 3,
  descripcion: 'Barro oscuro con rodadas y charcos que reflejan el cielo.',
  material: { macro: [0.22, 0.05, 0.08], desgaste: 0.15 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const base = c.fbm(4, 6, { warp: { amp: 0.7, freq: 2 } }), fino = c.fbm(40, 3), bl = blanco(N, 4), ru = c.cresta(3, 3, { warp: { amp: 0.4, freq: 2 } }), hum = c.fbm(7, 4);
    const pie = c.worley(22, { jit: 1 });
    const seco = col(0x94744c), mojado = col(0x5e4429), agua = col(0x1d1c19);
    for (let i = 0; i < n; i++) {
      const nivel = base[i] * 0.78 + ru[i] * 0.22 - (1 - suave(0, 0.3, pie.f1[i])) * pie.id[i] * 0.04;
      const charco = 1 - suave(0.4, 0.45, nivel);
      const borde = suave(0.34, 0.42, nivel) * (1 - charco);
      let h = nivel * 0.7 + (fino[i] - 0.5) * 0.06 * (1 - charco);
      h = mezcla(h, 0.2, charco);
      c.h[i] = h;
      const m = clamp(0.35 + hum[i] * 0.6 + borde * 0.5);
      let k = 0.8 + (fino[i] - 0.5) * 0.45 + (bl[i] - 0.5) * 0.12;
      mezclaPar(seco, mojado, m, tmp);
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      r = mezcla(r, agua[0] * (0.8 + base[i] * 0.4), charco); g = mezcla(g, agua[1] * (0.8 + base[i] * 0.4), charco); b = mezcla(b, agua[2] * (0.8 + base[i] * 0.4), charco);
      poner(c, i, r, g, b);
      c.rug[i] = mezcla(clamp(0.38 + (1 - m) * 0.35 + (fino[i] - 0.5) * 0.25), 0.04, charco);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 3, f: 2.5 }, { r: 12, f: 1.4 }];
  },
};

const hierba = {
  nombre: 'hierba', grupo: 'suelos', tam: 1024, escala: 2,
  descripcion: 'Césped vista cenital: hojas individuales, matas secas, tréboles y tierra asomando.',
  material: { macro: [0.28, 0.1, 0.06], desgaste: 0.1 },
  generar(c) {
    const N = c.N, n = c.n;
    const rng = crearRng(c.semilla * 91 + 3);
    const suelo = c.fbm(5, 4), mancha = c.fbm(3, 4, { warp: { amp: 0.5, freq: 2 } }), seca = c.fbm(4, 4, { warp: { amp: 0.4, freq: 3 } }), fino = c.fbm(60, 2);
    const verdes = [col(0x1c3a14), col(0x2f5a1c), col(0x4b7d27), col(0x6c9a35), col(0x93b244)];
    const sec = [col(0x7a6a2c), col(0xa89548)];
    const tierraC = col(0x2d2214);
    const z = new Float32Array(n).fill(0); // altura de la hoja dibujada
    const acc = new Float32Array(n * 3);   // color de la hoja
    // suelo base
    for (let i = 0; i < n; i++) { acc[i * 3] = tierraC[0]; acc[i * 3 + 1] = tierraC[1]; acc[i * 3 + 2] = tierraC[2]; }
    const hojas = Math.round(n / 15);
    const L0 = c.px(22);
    for (let k = 0; k < hojas; k++) {
      let x0 = rng() * N, y0 = rng() * N;
      const xi = (x0 | 0), yi = (y0 | 0);
      const idx = yi * N + xi;
      const zona = mancha[idx], sq = seca[idx];
      const ang = rng() * Math.PI * 2, L = L0 * (0.6 + rng() * 0.8), curv = (rng() - 0.5) * 0.7;
      const esSeca = sq > 0.64 && rng() < 0.7;
      const t0 = clamp(0.2 + zona * 0.55 + (rng() - 0.5) * 0.45);
      rampa(verdes, t0, tmp);
      let cr = tmp[0], cg = tmp[1], cb = tmp[2];
      if (esSeca) { mezclaPar(sec[0], sec[1], rng(), tmp2); cr = tmp2[0]; cg = tmp2[1]; cb = tmp2[2]; }
      const ancho = c.px(1.7 + rng() * 1.1);
      const pasos = Math.max(8, Math.round(L / 1.3));
      const zb = rng() * 0.3;
      for (let s = 0; s <= pasos; s++) {
        const t = s / pasos;
        const a2 = ang + curv * t;
        const x = x0 + Math.cos(a2) * L * t, y = y0 + Math.sin(a2) * L * t;
        const wd = ancho * (1 - t * t * 0.9) * 0.5 + 0.35;
        const zt = 0.3 + zb + 0.7 * t * (1 - zb * 0.5);
        const lum = 0.55 + 0.6 * t;
        const rad = Math.ceil(wd);
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const dd = Math.sqrt(dx * dx + dy * dy);
          if (dd > wd) continue;
          const px2 = (((Math.round(x) + dx) % N) + N) % N, py2 = (((Math.round(y) + dy) % N) + N) % N;
          const j = py2 * N + px2;
          const zz = zt * (1 - 0.35 * dd / wd);
          if (zz > z[j]) { z[j] = zz; const k2 = lum * (1 - 0.18 * dd / wd); acc[j * 3] = cr * k2; acc[j * 3 + 1] = cg * k2; acc[j * 3 + 2] = cb * k2; }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const k = 0.92 + (fino[i] - 0.5) * 0.25;
      poner(c, i, acc[i * 3] * k, acc[i * 3 + 1] * k, acc[i * 3 + 2] * k);
      c.h[i] = z[i] * 0.9 + suelo[i] * 0.05;
      c.rug[i] = 0.78 + (fino[i] - 0.5) * 0.2 - z[i] * 0.1;
    }
    c.fuerzaNormal = 2.4; c.cav = [{ r: 2, f: 3.2 }, { r: 7, f: 1.8 }];
  },
};

const arena = {
  nombre: 'arena', grupo: 'suelos', tam: 1024, escala: 3,
  descripcion: 'Arena y polvo con rizos de viento, granos brillantes y algún guijarro.',
  material: { macro: [0.2, 0.08, 0.05], desgaste: 0.1 },
  generar(c) {
    const N = c.N, n = c.n;
    const bl = blanco(N, 21), bl2 = blanco(N, 22), onda = c.fbm(3, 4, { warp: { amp: 0.8, freq: 2 } }), fino = c.fbm(48, 2), mancha = c.fbm(4, 4), peb = c.worley(30, { jit: 1 });
    const claro = col(0xd8bf8a), oscuro = col(0xb08d58), roj = col(0xc2976a);
    for (let i = 0; i < n; i++) {
      const y = (i / N) | 0;
      const fase = (y / N) * 22 + (onda[i] - 0.5) * 1.9;
      const fr = fase - Math.floor(fase);
      const rizo = fr < 0.7 ? Math.pow(fr / 0.7, 1.3) : Math.pow(1 - (fr - 0.7) / 0.3, 1.8); // perfil asimétrico
      let t = clamp(0.35 + mancha[i] * 0.5 + (rizo - 0.5) * 0.25);
      mezclaPar(oscuro, claro, t, tmp);
      mezclaPar(tmp, roj, suave(0.55, 0.8, mancha[i]) * 0.5, tmp2);
      let k = 0.9 + (bl[i] - 0.5) * 0.26 + (fino[i] - 0.5) * 0.12 + (rizo - 0.5) * 0.14;
      if (bl2[i] > 0.996) k *= 1.6;                   // grano brillante
      let r = tmp2[0] * k, g = tmp2[1] * k, b = tmp2[2] * k;
      let h = 0.4 + rizo * 0.3 + (fino[i] - 0.5) * 0.08 + (bl[i] - 0.5) * 0.02;
      if (peb.id[i] > 0.9) { const pm = 1 - suave(0.05, 0.14, peb.f1[i]); r = mezcla(r, 0.4, pm * 0.7); g = mezcla(g, 0.36, pm * 0.7); b = mezcla(b, 0.3, pm * 0.7); h += pm * 0.2; }
      poner(c, i, r, g, b); c.h[i] = h;
      c.rug[i] = clamp(0.92 + (bl[i] - 0.5) * 0.1);
    }
    c.fuerzaNormal = 2.6; c.cav = [{ r: 2, f: 2 }, { r: 10, f: 1.2 }];
  },
};

const tablones = {
  nombre: 'tablones', grupo: 'suelos', tam: 1024, escala: 2,
  descripcion: 'Tablones de madera clavados, con veta, nudos, juntas oscuras y desgaste de uso.',
  material: { macro: [0.2, 0.06, 0.14], desgaste: 0.35 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const dd = c.deform(8, px(1.2));
    const D = c.despiece({ filas: 8, piezas: 2, wVar: 0.45, hVar: 0.04, desfase: 'azar', deform: dd });
    const V = maderaVeta(c, D, { frecAnillo: 16, nudos: 0.22 });
    const sucio = c.fbm(4, 5), ray = c.fbm([3, 140], 2, { exacto: true }), bl = blanco(N, 6), paso = c.fbm([5, 3], 4);
    const claro = col(0xa57c55), oscuro = col(0x5a4128), nud = col(0x2f1a0b);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i];
      const m = suave(px(1.2), px(2.6), d);
      const b = suave(0, px(7), d);
      const lum = clamp(0.25 + id * 0.55 + (sucio[i] - 0.5) * 0.3);
      mezclaPar(oscuro, claro, lum, tmp);
      let k = 0.62 + V.grano[i] * 0.75;
      k *= 1 - V.nudo[i] * 0.5;
      k *= 0.85 + b * 0.15;
      const uso = suave(0.5, 0.8, paso[i]) * 0.35;                // pasos: se aclara y pierde barniz
      k *= 1 + uso * 0.25 + (ray[i] - 0.5) * 0.2;
      let r = tmp[0] * k, g = tmp[1] * k, bb = tmp[2] * k;
      // clavos junto a los extremos
      const cu = Math.min(D.u[i] * D.pw[i], (1 - D.u[i]) * D.pw[i]);
      const cx = cu - px(14), cy = (D.v[i] - 0.5) * D.ph[i];
      const dc = Math.sqrt(cx * cx + cy * cy);
      const clavo = 1 - suave(px(2), px(4), dc);
      r = mezcla(r, 0.1, clavo * 0.8); g = mezcla(g, 0.09, clavo * 0.8); bb = mezcla(bb, 0.08, clavo * 0.8);
      r = mezcla(r * 0.25, r, m); g = mezcla(g * 0.25, g, m); bb = mezcla(bb * 0.25, bb, m);
      poner(c, i, r, g, bb);
      c.h[i] = mezcla(0.05, 0.58 + (V.poro[i] - 0.5) * 0.1 + b * 0.1 + clavo * 0.05 - V.nudo[i] * 0.04 + (D.id2[i] - 0.5) * 0.04, m);
      c.rug[i] = clamp(0.55 + uso * 0.3 + (1 - V.grano[i]) * 0.1 + (ray[i] - 0.5) * 0.25 + (1 - m) * 0.4);
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 2, f: 3 }, { r: 9, f: 1.2 }];
  },
};

const gravilla_via = {
  nombre: 'gravilla_via', grupo: 'suelos', tam: 1024, escala: 2,
  descripcion: 'Balasto de vía: piedra machacada angulosa de varios tamaños.',
  material: { macro: [0.2, 0.05, 0.1], desgaste: 0.3 },
  generar(c) {
    const N = c.N, n = c.n;
    const A = c.worley(13, { jit: 1, warp: { amp: 0.1, freq: 8 } }), B = c.worley(26, { jit: 1 }), C = c.worley(52, { jit: 1 });
    const bl = blanco(N, 13), blot = c.fbm(4, 4), fino = c.fbm(80, 2);
    const pal = [col(0x3d3c3b), col(0x575553), col(0x6f6c68), col(0x8a867f), col(0x4a463f)];
    const tierraC = col(0x1e1a15);
    for (let i = 0; i < n; i++) {
      // tres capas de piedras: la más grande arriba
      const capas = [[A, 0], [B, 1], [C, 2]];
      let h = 0, r = 0, g = 0, b = 0, ocupa = 0;
      for (let q = 2; q >= 0; q--) {
        const W = capas[q][0];
        const dx = 0, e = W.f2[i] - W.f1[i];
        const forma = suave(0.02, 0.1, e);
        // facetas planas: cada piedra tiene un plano inclinado propio
        const ang = W.id[i] * 6.2832, tilt = 0.5 + 0.5 * Math.sin(ang * 3 + W.f1[i] * 9 * (W.id2[i] - 0.5));
        const alto = 0.25 + q * 0.0 + 0.3 * W.id2[i] + 0.35 * tilt * forma + 0.2 * Math.pow(suave(0, 0.35, e), 0.7);
        const hq = (q === 0 ? 0.35 : q === 1 ? 0.18 : 0.0) + alto * (q === 0 ? 0.65 : q === 1 ? 0.55 : 0.4);
        if (forma > 0.5 && hq > h) {
          h = hq;
          const pi = Math.min(4.999, W.id[i] * 5);
          const pf = Math.floor(pi);
          mezclaPar(pal[pf], pal[Math.min(4, pf + 1)], pi - pf, tmp);
          const k = 0.7 + 0.5 * tilt + (fino[i] - 0.5) * 0.4 + (bl[i] - 0.5) * 0.3;
          r = tmp[0] * k; g = tmp[1] * k; b = tmp[2] * k; ocupa = 1;
        }
      }
      if (!ocupa) { r = tierraC[0]; g = tierraC[1]; b = tierraC[2]; h = 0.02; }
      const k2 = 0.85 + (blot[i] - 0.5) * 0.3;
      poner(c, i, r * k2, g * k2, b * k2);
      c.h[i] = h;
      c.rug[i] = clamp(0.78 + (bl[i] - 0.5) * 0.25);
    }
    c.fuerzaNormal = 3.2; c.cav = [{ r: 2, f: 3.5 }, { r: 10, f: 2 }];
  },
};

/** Asfalto: seco o mojado (misma estructura; el mojado baja rugosidad y oscurece). */
function asfalto(c, mojado) {
  const N = c.N, n = c.n, px = (v) => c.px(v);
  const bl = blanco(N, 31), bl2 = blanco(N, 32), arido = c.worley(90, { jit: 1 }), mancha = c.fbm(4, 5, { warp: { amp: 0.5, freq: 3 } }), fino = c.fbm(64, 2), desg = c.fbm(2, 3);
  const grt = grietas(c, { freq: 4, ancho: 0.016, deform: 0.5, zona: 0.4 });
  const grt2 = grietas(c, { freq: 9, ancho: 0.011, deform: 0.7, zona: 0.4 });
    const aceite = c.fbm(5, 4, { warp: { amp: 0.7, freq: 3 } });
  const betun = col(0x3e3e41), piedra = col(0x8a867f), claro = col(0xa09b93);
  for (let i = 0; i < n; i++) {
    const a = 1 - suave(0.0, 0.28, arido.f1[i]);
    const expuesto = clamp(0.25 + desg[i] * 0.6 + (fino[i] - 0.5) * 0.4); // árido a la vista por el desgaste
    const gr = Math.max(grt[i], grt2[i] * 0.6);
    const pm = a * expuesto * (arido.id[i] > 0.35 ? 1 : 0.4);
    mezclaPar(betun, arido.id2[i] > 0.5 ? piedra : claro, pm * (0.55 + arido.id[i] * 0.4), tmp);
    let k = 0.95 + (bl[i] - 0.5) * 0.4 + (mancha[i] - 0.5) * 0.5 + (fino[i] - 0.5) * 0.15;
    if (bl2[i] > 0.997) k *= 1.5;
    let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
    // juntas de parcheo: línea más oscura y lisa
    const junta = 0;
    r *= 1 - junta * 0.35; g *= 1 - junta * 0.35; b *= 1 - junta * 0.35;
    r *= 1 - gr * 0.65; g *= 1 - gr * 0.65; b *= 1 - gr * 0.65;
    const ac = suave(0.62, 0.78, aceite[i]) * 0.5;
    r *= 1 - ac * 0.4; g *= 1 - ac * 0.4; b *= 1 - ac * 0.4;
    if (mojado) { r *= 0.62; g *= 0.62; b *= 0.65; }
    poner(c, i, r, g, b);
    let h = 0.5 + pm * 0.18 * arido.id[i] + (fino[i] - 0.5) * 0.08 - gr * 0.3 - junta * 0.08 + (bl[i] - 0.5) * 0.03;
    c.h[i] = h;
    if (mojado) {
      const charco = suave(0.52, 0.6, mancha[i] * 0.7 + (1 - desg[i]) * 0.3);
      c.rug[i] = clamp(mezcla(0.28 + (fino[i] - 0.5) * 0.25 + pm * 0.12, 0.035, charco) + ac * 0.1 + gr * 0.3);
      c.h[i] = mezcla(h, 0.45 - gr * 0.3, charco * 0.85);
      c.met[i] = 0;
    } else c.rug[i] = clamp(0.88 - pm * 0.12 + (bl[i] - 0.5) * 0.12 + ac * 0.1 - junta * 0.1);
  }
  c.fuerzaNormal = mojado ? 2.4 : 3; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.6 }];
}
const asfalto_seco = { nombre: 'asfalto_seco', grupo: 'suelos', tam: 1024, escala: 2.4, descripcion: 'Asfalto de carretera: árido a la vista, grietas finas, juntas de parcheo y manchas de aceite.', material: { macro: [0.2, 0.03, 0.08], desgaste: 0.35 }, generar: (c) => asfalto(c, false) };
const asfalto_mojado = { nombre: 'asfalto_mojado', grupo: 'suelos', tam: 1024, escala: 2.4, descripcion: 'Asfalto empapado: oscuro y brillante, con charcos planos que reflejan neones y cielo.', material: { macro: [0.15, 0.03, 0.05], desgaste: 0.2 }, generar: (c) => asfalto(c, true) };

const hormigon = {
  nombre: 'hormigon', grupo: 'suelos', tam: 1024, escala: 2.4,
  descripcion: 'Losa de hormigón con juntas de dilatación, poros, grietas finas y manchas de humedad.',
  material: { macro: [0.22, 0.04, 0.1], desgaste: 0.35 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const dd = c.deform(6, px(1.5));
    const D = c.despiece({ filas: 2, piezas: 2, desfase: 0, deform: dd });
    const bl = blanco(N, 41), mancha = c.fbm(3, 5, { warp: { amp: 0.5, freq: 2 } }), fino = c.fbm(50, 3), poro = c.worley(55, { jit: 1 });
    const grt = grietas(c, { freq: 3, ancho: 0.012, deform: 0.6, zona: 0.35 });
    const llana = c.fbm([3, 10], 3, { warp: { amp: 0.3, freq: 3 } }), hum = c.fbm(5, 4);
    const claro = col(0xa7a49d), oscuro = col(0x7f7c76);
    for (let i = 0; i < n; i++) {
      const d = D.d[i];
      const m = suave(px(1.5), px(4), d);
      const losa = D.id[i];
      mezclaPar(oscuro, claro, clamp(0.5 + (mancha[i] - 0.5) * 0.9 + (losa - 0.5) * 0.4), tmp);
      let k = 0.9 + (bl[i] - 0.5) * 0.14 + (fino[i] - 0.5) * 0.18 + (llana[i] - 0.5) * 0.14;
      const pr = (1 - suave(0.0, 0.1, poro.f1[i])) * (poro.id[i] > 0.55 ? 1 : 0);
      k *= 1 - pr * 0.4;
      const h2 = suave(0.6, 0.78, hum[i]) * 0.35;
      k *= 1 - h2 * 0.5;
      k *= 1 - grt[i] * 0.55;
      k *= 0.55 + 0.45 * m;
      poner(c, i, tmp[0] * k, tmp[1] * k * 0.995, tmp[2] * k * 0.985);
      c.h[i] = mezcla(0.1, 0.55 + (fino[i] - 0.5) * 0.12 + (llana[i] - 0.5) * 0.05 - pr * 0.12 - grt[i] * 0.2 + (losa - 0.5) * 0.03, m);
      c.rug[i] = clamp(0.8 - h2 * 0.2 + (llana[i] - 0.5) * 0.2 + (bl[i] - 0.5) * 0.05 + (1 - m) * 0.15);
    }
    c.fuerzaNormal = 2.8; c.cav = [{ r: 2, f: 3 }, { r: 10, f: 1.4 }];
  },
};

const losas_acera = {
  nombre: 'losas_acera', grupo: 'suelos', tam: 1024, escala: 2.4,
  descripcion: 'Losas de acera cuadradas con esquinas desportilladas, chicles, musgo en las juntas.',
  material: { macro: [0.22, 0.05, 0.1], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const dd = c.deform(9, px(2));
    const D = c.despiece({ filas: 4, piezas: 4, desfase: 0, redondeo: px(5), deform: dd, hVar: 0.0 });
    const bl = blanco(N, 51), mancha = c.fbm(5, 5, { warp: { amp: 0.5, freq: 3 } }), fino = c.fbm(60, 3), esq = c.fbm(20, 3), musgo = c.fbm(12, 4);
    const grt = grietas(c, { freq: 4, ancho: 0.011, deform: 0.6, zona: 0.35 });
    const chicle = c.worley(24, { jit: 1 });
    const claro = col(0xb3afa6), oscuro = col(0x8c887f), verde = col(0x4b5a2b), tierraC = col(0x2a2219);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i];
      const m = suave(px(2.4), px(4.6), d);
      const bisel = suave(0, px(8), d);
      // esquinas desportilladas: ruido que se come la losa cerca del borde
      const mord = suave(0.62, 0.8, esq[i]) * (1 - suave(px(4), px(24), d));
      const mm = m * (1 - mord * 0.9);
      mezclaPar(oscuro, claro, clamp(0.45 + (id - 0.5) * 0.7 + (mancha[i] - 0.5) * 0.6), tmp);
      let k = 0.9 + (bl[i] - 0.5) * 0.16 + (fino[i] - 0.5) * 0.14;
      k *= 0.82 + 0.18 * bisel;
      k *= 1 - grt[i] * 0.55;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const ch = chicle.id[i] > 0.93 ? 1 - suave(0.04, 0.09, chicle.f1[i]) : 0;
      r = mezcla(r, 0.23, ch * 0.8); g = mezcla(g, 0.22, ch * 0.8); b = mezcla(b, 0.21, ch * 0.8);
      const jm = 1 - mm;
      const mus = suave(0.5, 0.7, musgo[i]) * jm * 0.8;
      r = mezcla(r, tierraC[0], jm * 0.85); g = mezcla(g, tierraC[1], jm * 0.85); b = mezcla(b, tierraC[2], jm * 0.85);
      r = mezcla(r, verde[0], mus); g = mezcla(g, verde[1], mus); b = mezcla(b, verde[2], mus);
      poner(c, i, r, g, b);
      c.h[i] = mezcla(0.05, 0.6 + (fino[i] - 0.5) * 0.08 + bisel * 0.12 + (id - 0.5) * 0.06 - grt[i] * 0.2 + ch * 0.03, mm);
      c.rug[i] = clamp(0.82 + (fino[i] - 0.5) * 0.2 - ch * 0.25 + jm * 0.15);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 3, f: 3.5 }, { r: 12, f: 1.4 }];
  },
};

const baldosa_hospital = {
  nombre: 'baldosa_hospital', grupo: 'suelos', tam: 1024, escala: 2.4,
  descripcion: 'Baldosa clínica brillante de gres claro, junta fina gris, marcas de fregado y roces.',
  material: { macro: [0.1, 0.03, 0.14], desgaste: 0.25, props: { envMapIntensity: 1.1 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 8, piezas: 8, desfase: 0, redondeo: px(3) });
    const bl = blanco(N, 61), fino = c.fbm(80, 2), fregado = c.fbm([2, 40], 3, { exacto: false }), roce = c.fbm([40, 3], 3, { warp: { amp: 0.4, freq: 2 } }), mancha = c.fbm(4, 4);
    const mot = c.worley(60, { jit: 1 });
    const base = col(0xcfd8d6), juntaC = col(0x8e9895), verde = col(0xb4c9c3);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i];
      const m = suave(px(1.4), px(3), d);
      mezclaPar(base, verde, clamp(id * 0.7 + (mancha[i] - 0.5) * 0.3), tmp);
      // motas sutiles tipo gres técnico
      const mt = mot.id[i] > 0.82 ? (1 - suave(0.0, 0.1, mot.f1[i])) : 0;
      let k = 0.94 + (fino[i] - 0.5) * 0.08 + (bl[i] - 0.5) * 0.04 - mt * 0.1 - suave(0.6, 0.8, roce[i]) * 0.1;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      r = mezcla(juntaC[0] * (0.8 + bl[i] * 0.3), r, m); g = mezcla(juntaC[1] * (0.8 + bl[i] * 0.3), g, m); b = mezcla(juntaC[2] * (0.8 + bl[i] * 0.3), b, m);
      poner(c, i, r, g, b);
      c.h[i] = mezcla(0.1, 0.6 + (id - 0.5) * 0.02 + (fino[i] - 0.5) * 0.02, m);
      c.rug[i] = clamp(0.2 + (fregado[i] - 0.5) * 0.18 + suave(0.55, 0.8, roce[i]) * 0.3 + (bl[i] - 0.5) * 0.04 + (1 - m) * 0.6);
    }
    c.fuerzaNormal = 2; c.cav = [{ r: 2, f: 2.5 }, { r: 10, f: 1 }];
  },
};

const placa_antideslizante = {
  nombre: 'placa_antideslizante', grupo: 'suelos', tam: 1024, escala: 1.6,
  descripcion: 'Chapa de acero estriada con rombos alternos, pintura saltada y suciedad en las ranuras. Admite color.',
  material: { macro: [0.14, 0.04, 0.12], desgaste: 0.4, props: { envMapIntensity: 1.2 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const cel = 6, T = N / cel;
    const bl = blanco(N, 71), mancha = c.fbm(4, 5, { warp: { amp: 0.5, freq: 2 } }), fino = c.fbm(90, 2), ray = c.fbm([3, 120], 2, { exacto: true }), desc = c.fbm(7, 5, { warp: { amp: 0.4, freq: 3 } }), des2 = c.fbm(24, 3);
    const metal = col(0xb4b8bc), pintura = col(0xd9dadc), sucio = col(0x6a6358);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      let lx = (x / T - gx) - 0.5, ly = (y / T - gy) - 0.5;
      if ((gx + gy) & 1) { const t = lx; lx = -ly; ly = t; }
      const a = (lx + ly) * 0.7071, b = (lx - ly) * 0.7071;
      const sd = Math.max(Math.abs(a) / 0.40, Math.abs(b) / 0.1);
      const lug = 1 - suave(0.82, 1.0, sd);
      const dom = lug * (0.6 + 0.4 * Math.sqrt(clamp(1 - sd * sd * 0.6)));
      c.h[i] = 0.2 + dom * 0.75 + (fino[i] - 0.5) * 0.03;
      // pintura saltada: ruido suave, más desgaste en los relieves
      const pv = suave(0.6, 0.68, desc[i] + lug * 0.2 + (des2[i] - 0.5) * 0.22);
      const pm = 1 - pv;               // 1 = pintura
      const sup = 0.62 + (fino[i] - 0.5) * 0.3 + (ray[i] - 0.5) * 0.2;
      const pr = 0.92 + (bl[i] - 0.5) * 0.06 + (fino[i] - 0.5) * 0.08;
      let r = mezcla(metal[0] * sup, pintura[0] * pr, pm), g = mezcla(metal[1] * sup, pintura[1] * pr, pm), b2 = mezcla(metal[2] * sup, pintura[2] * pr, pm);
      const su = clamp((1 - lug) * 0.4 + suave(0.6, 0.9, mancha[i]) * 0.35);
      r = mezcla(r, sucio[0], su * 0.32); g = mezcla(g, sucio[1], su * 0.32); b2 = mezcla(b2, sucio[2], su * 0.32);
      poner(c, i, r, g, b2);
      c.tinte[i] = clamp(pm * (1 - su * 0.5));
      c.met[i] = pv * (1 - su * 0.6) * 0.95;
      c.rug[i] = clamp(mezcla(0.4 + (ray[i] - 0.5) * 0.3 + su * 0.35, 0.5 + (fino[i] - 0.5) * 0.15, pm));
    }
    c.fuerzaNormal = 3.6; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.5 }];
  },
};

const rejilla = {
  nombre: 'rejilla', grupo: 'suelos', tam: 1024, escala: 1.6,
  descripcion: 'Rejilla metálica industrial de pletinas cruzadas sobre un fondo profundo; admite color.',
  material: { macro: [0.12, 0.04, 0.1], desgaste: 0.45 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const cel = 8, T = N / cel;
    const mancha = c.fbm(5, 5, { warp: { amp: 0.5, freq: 2 } }), fino = c.fbm(70, 2), ox = c.fbm(7, 5), ray = c.fbm([4, 90], 2, { exacto: true });
    const fondo = col(0x0c0c0e), acero = col(0x7c7f83), pintura = col(0xc9c9c9), orin = col(0x9a4c1c);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const lx = (x / T - Math.floor(x / T)), ly = (y / T - Math.floor(y / T));
      const dA = Math.abs(ly - 0.5), dB = Math.abs(lx - 0.5);
      const a = 1 - suave(0.085, 0.11, dA), b = 1 - suave(0.03, 0.05, dB);
      const mask = Math.max(a, b);
      const bisel = Math.max(a * suave(0.0, 0.05, 0.11 - dA), b * suave(0.0, 0.03, 0.05 - dB));
      c.h[i] = mask * (0.55 + 0.4 * Math.min(1, bisel * 1.6)) + (fino[i] - 0.5) * 0.03 * mask + (a > 0.5 && b > 0.5 ? 0.05 : 0) * 0;
      const oxm = suave(0.58, 0.72, ox[i]);
      const pm = 1 - suave(0.28, 0.4, mancha[i]);
      let r = acero[0] * (0.85 + (fino[i] - 0.5) * 0.3), g = acero[1] * (0.85 + (fino[i] - 0.5) * 0.3), bb = acero[2] * (0.85 + (fino[i] - 0.5) * 0.3);
      r = mezcla(r, pintura[0] * 0.95, pm); g = mezcla(g, pintura[1] * 0.95, pm); bb = mezcla(bb, pintura[2] * 0.95, pm);
      r = mezcla(r, orin[0], oxm * 0.7); g = mezcla(g, orin[1], oxm * 0.7); bb = mezcla(bb, orin[2], oxm * 0.7);
      r = mezcla(fondo[0], r, mask); g = mezcla(fondo[1], g, mask); bb = mezcla(fondo[2], bb, mask);
      poner(c, i, r, g, bb);
      c.tinte[i] = mask * pm * (1 - oxm * 0.8);
      c.met[i] = mask * (1 - pm) * (1 - oxm * 0.8) * 0.9;
      c.rug[i] = clamp(mask * (0.45 + pm * 0.2 + oxm * 0.35 + (ray[i] - 0.5) * 0.2) + (1 - mask) * 0.9);
    }
    c.fuerzaNormal = 3.6; c.cav = [{ r: 2, f: 4 }, { r: 8, f: 2.2 }];
  },
};

const composite_futurista = {
  nombre: 'composite_futurista', grupo: 'suelos', tam: 1024, escala: 2.4,
  descripcion: 'Paneles de composite negro pulido con juntas luminosas. `color` = color del neón.',
  material: { macro: [0.08, 0.02, 0.1], desgaste: 0.1, colorEmisivo: true, colorBase: 0x35e6ff, emisivo: 2.2, props: { envMapIntensity: 1.3 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 4, piezas: 4, desfase: 0, redondeo: px(10) });
    const bl = blanco(N, 91), fino = c.fbm(60, 2), roce = c.fbm([30, 3], 3), mancha = c.fbm(4, 4);
    const E = c.emision();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const d = D.d[i], id = D.id[i];
      const luz = 1 - suave(px(1.2), px(4.2), d - px(3));      // línea luminosa en la junta
      const m = suave(px(3), px(6), d);
      const bisel = suave(px(6), px(16), d);
      // textura hexagonal fina sobre el panel (rejilla de puntos en relieve)
      const hx = (x / px(14)), hy = (y / px(12.1));
      const ph = Math.sin(hx * Math.PI * 2) * Math.sin(hy * Math.PI * 2 + (Math.floor(hx) % 2) * Math.PI);
      const pts = suave(0.35, 0.8, ph) * 0.5;
      const k = 0.085 + (fino[i] - 0.5) * 0.02 + id * 0.01 + bisel * 0.012 + (bl[i] - 0.5) * 0.01;
      poner(c, i, k * 0.9, k * 0.95, k * 1.1);
      c.tinte[i] = 0;
      c.h[i] = mezcla(0.0, 0.7 + bisel * 0.12 + pts * 0.05 + (id - 0.5) * 0.02, m);
      c.rug[i] = clamp(0.12 + suave(0.55, 0.85, roce[i]) * 0.3 + pts * 0.2 + (mancha[i] - 0.5) * 0.06);
      c.met[i] = 0.3 * m;
      // marcas de luz: pequeños testigos en las esquinas de cada panel
      const cu = Math.min(D.u[i], 1 - D.u[i]) * D.pw[i], cv = Math.min(D.v[i], 1 - D.v[i]) * D.ph[i];
      const dot = 1 - suave(px(2), px(4), Math.sqrt((cu - px(26)) ** 2 + (cv - px(26)) ** 2));
      const e = Math.max(luz, dot * 0.9);
      E[i * 3] = e; E[i * 3 + 1] = e; E[i * 3 + 2] = e;
    }
    c.fuerzaNormal = 2.4; c.cav = [{ r: 2, f: 2 }, { r: 8, f: 1.2 }];
  },
};

export default [adoquin, empedrado, tierra, barro, hierba, arena, tablones, gravilla_via, asfalto_seco, asfalto_mojado, hormigon, losas_acera, baldosa_hospital, placa_antideslizante, rejilla, composite_futurista];
