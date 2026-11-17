// Catálogo · MUROS (512 px)
import { clamp, suave, mezcla, col, blanco, rampa, crearRng, maderaVeta } from './util.js';
import { grietas, remaches, goteos } from '../texturas.js';

const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
const poner = (c, i, r, g, b) => { c.alb[i * 3] = r; c.alb[i * 3 + 1] = g; c.alb[i * 3 + 2] = b; };
const par = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };

/** Despiece de ladrillos común. */
function despieceLadrillo(c, { filas = 12, piezas = 5, hVar = 0.0, wVar = 0.04, redondeo = 4, amp = 1.2 } = {}) {
  const dd = c.deform(8, c.px(amp));
  return c.despiece({ filas, piezas, hVar, wVar, desfase: 0.5, redondeo: c.px(redondeo), deform: dd });
}

const ladrillo_rojo = {
  nombre: 'ladrillo_rojo', grupo: 'muros', tam: 512, escala: 1.2,
  descripcion: 'Muro de ladrillo cocido: tonos rojos y quemados, mortero rehundido, hollín y eflorescencias.',
  material: { macro: [0.2, 0.06, 0.12], desgaste: 0.35 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = despieceLadrillo(c, { filas: 12, piezas: 5 });
    const sup = c.fbm(28, 4), blot = c.fbm(6, 4, { warp: { amp: 0.4, freq: 3 } }), bl = blanco(N, 3), poro = c.worley(80, { jit: 1 }), hol = goteos(c, { cols: 30, largo: 2 }), sal = c.fbm(9, 5), esq = c.fbm(22, 3);
    const pal = [col(0x6a3022), col(0x86402b), col(0x9a4d31), col(0xa95f3d), col(0x773f2e), col(0x5c291d)];
    const mort = col(0xa59b88);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i];
      const mord = suave(0.64, 0.8, esq[i]) * (1 - suave(px(1), px(7), d));
      const m = suave(px(2.2), px(3.6), d) * (1 - mord * 0.6);
      const b = suave(0, px(5), d);
      const p = Math.min(4.99, id * 5.0), pi = Math.floor(p);
      par(pal[pi], pal[pi + 1], p - pi, tmp);
      let k = 0.92 + (blot[i] - 0.5) * 0.45 + (sup[i] - 0.5) * 0.3 + (bl[i] - 0.5) * 0.12;
      if (poro.f1[i] < 0.14 && poro.id[i] > 0.5) k *= 0.7;
      k *= 0.85 + 0.15 * b;
      k *= 1 - hol[i] * 0.3;
      let r = tmp[0] * k, g = tmp[1] * k, bb = tmp[2] * k;
      const ef = suave(0.66, 0.8, sal[i]) * 0.35;       // eflorescencia blanquecina
      r = mezcla(r, 0.78, ef); g = mezcla(g, 0.75, ef); bb = mezcla(bb, 0.7, ef);
      const mk = (0.7 + (bl[i] - 0.5) * 0.7 + (sup[i] - 0.5) * 0.4) * (0.8 + 0.2 * blot[i]);
      r = mezcla(mort[0] * mk * 0.8, r, m); g = mezcla(mort[1] * mk * 0.8, g, m); bb = mezcla(mort[2] * mk * 0.8, bb, m);
      poner(c, i, r, g, bb);
      c.h[i] = mezcla(0.18 + (bl[i] - 0.5) * 0.06 + (sup[i] - 0.5) * 0.06, 0.62 + b * 0.18 + (sup[i] - 0.5) * 0.14 + (D.id2[i] - 0.5) * 0.06 - (poro.f1[i] < 0.12 ? 0.05 : 0), m);
      c.rug[i] = clamp(0.8 + (sup[i] - 0.5) * 0.2 + (1 - m) * 0.15 - ef * 0.1);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 2, f: 3.5 }, { r: 8, f: 1.6 }];
  },
};

const ladrillo_encalado = {
  nombre: 'ladrillo_encalado', grupo: 'muros', tam: 512, escala: 1.2,
  descripcion: 'Ladrillo encalado: cal blanca (admite color) saltada en las aristas, dejando ver el ladrillo.',
  material: { macro: [0.14, 0.05, 0.1], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = despieceLadrillo(c, { filas: 12, piezas: 5, amp: 1.6 });
    const sup = c.fbm(22, 4), blot = c.fbm(5, 4), bl = blanco(N, 7), cae = c.fbm(7, 5, { warp: { amp: 0.6, freq: 3 } }), hol = goteos(c, { cols: 26, largo: 2 }), mo = c.fbm(14, 4);
    const lad = [col(0x7a3a2a), col(0x92482f), col(0x65301f)];
    const cal = col(0xf2eee4);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i];
      const m = suave(px(2), px(3.4), d);
      const b = suave(0, px(5), d);
      // la cal se cae en zonas y en las aristas
      const cae0 = suave(0.6, 0.7, cae[i] + (1 - b) * 0.15 + (bl[i] - 0.5) * 0.08);
      const pi = Math.min(1.99, id * 2), pf = Math.floor(pi);
      par(lad[pf], lad[pf + 1], pi - pf, tmp);
      let kl = 0.9 + (sup[i] - 0.5) * 0.4;
      const cl = 0.93 + (blot[i] - 0.5) * 0.12 + (sup[i] - 0.5) * 0.08 - hol[i] * 0.16;
      const pc = 1 - cae0;
      let r = mezcla(tmp[0] * kl, cal[0] * cl, pc), g = mezcla(tmp[1] * kl, cal[1] * cl, pc), bb = mezcla(tmp[2] * kl, cal[2] * cl, pc);
      // el mortero queda cubierto de cal pero más sucio
      const mk = 0.78 + (bl[i] - 0.5) * 0.3;
      r = mezcla(cal[0] * mk * 0.92 * (1 - 0.1 * (1 - pc)), r, m); g = mezcla(cal[1] * mk * 0.9, g, m); bb = mezcla(cal[2] * mk * 0.85, bb, m);
      const musg = suave(0.7, 0.86, mo[i]) * (1 - m) * 0.0;
      poner(c, i, r, g, bb);
      c.tinte[i] = clamp(pc * 0.95 + (1 - m) * 0.4);
      c.h[i] = mezcla(0.22 + (bl[i] - 0.5) * 0.04, 0.6 + b * 0.18 + (sup[i] - 0.5) * 0.1 + pc * 0.04, m);
      c.rug[i] = clamp(0.88 - pc * 0.04 + (sup[i] - 0.5) * 0.14);
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.6 }];
  },
};

const sillería = {
  nombre: 'silleria', grupo: 'muros', tam: 512, escala: 2.4,
  descripcion: 'Sillería de piedra caliza en hiladas desiguales: cincelado, juntas finas, liquen y manchas de lluvia.',
  material: { macro: [0.2, 0.06, 0.12], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const dd = c.deform(7, px(2.4));
    const D = c.despiece({ filas: 5, piezas: (r) => [3, 2, 3, 2, 3][r % 5], hVar: 0.35, wVar: 0.4, desfase: 'azar', redondeo: px(9), deform: dd });
    const sup = c.fbm(26, 4), cin = c.fbm([5, 90], 3, { exacto: true }), blot = c.fbm(5, 5, { warp: { amp: 0.4, freq: 3 } }), bl = blanco(N, 8), liq = c.fbm(12, 5), hol = goteos(c, { cols: 14, largo: 2 }), esq = c.fbm(14, 3), poro = c.worley(40, { jit: 1 });
    const pal = [col(0xb3a68f), col(0xc6b99f), col(0x9c9078), col(0xaa9c86)];
    const liquen = col(0x7a8a4a), junta = col(0x8a8070);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i];
      const mord = suave(0.66, 0.82, esq[i]) * (1 - suave(px(2), px(16), d));
      const m = suave(px(2.4), px(4), d) * (1 - mord * 0.8);
      const b = suave(0, px(12), d);
      const p = Math.min(2.99, id * 3), pi = Math.floor(p);
      par(pal[pi], pal[pi + 1], p - pi, tmp);
      let k = 0.9 + (blot[i] - 0.5) * 0.5 + (sup[i] - 0.5) * 0.25 + (cin[i] - 0.5) * 0.2 + (bl[i] - 0.5) * 0.08;
      k *= 1 - hol[i] * 0.16; k *= 0.85 + 0.15 * b;
      if (poro.f1[i] < 0.1 && poro.id[i] > 0.6) k *= 0.7;
      let r = tmp[0] * k, g = tmp[1] * k, bb = tmp[2] * k;
      const lq = suave(0.62, 0.78, liq[i]) * (0.4 + (1 - b) * 0.6) * 0.55;
      r = mezcla(r, liquen[0], lq); g = mezcla(g, liquen[1], lq); bb = mezcla(bb, liquen[2], lq);
      const jk = 0.7 + (bl[i] - 0.5) * 0.6;
      r = mezcla(junta[0] * jk, r, m); g = mezcla(junta[1] * jk, g, m); bb = mezcla(junta[2] * jk, bb, m);
      poner(c, i, r, g, bb);
      c.h[i] = mezcla(0.1, 0.55 + b * 0.25 + (sup[i] - 0.5) * 0.14 + (cin[i] - 0.5) * 0.05 + (D.id2[i] - 0.5) * 0.12, m);
      c.rug[i] = clamp(0.86 + (sup[i] - 0.5) * 0.14 - lq * 0.15);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 2, f: 3 }, { r: 10, f: 1.8 }];
  },
};

const estuco_desconchado = {
  nombre: 'estuco_desconchado', grupo: 'muros', tam: 512, escala: 2,
  descripcion: 'Enlucido liso (admite color) con grandes desconchones que dejan ver ladrillo, grietas y manchas de humedad.',
  material: { macro: [0.16, 0.06, 0.1], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const caida = c.fbm(4, 6, { warp: { amp: 0.7, freq: 3 } }), fino = c.fbm(50, 3), blot = c.fbm(3, 5), bl = blanco(N, 9), hol = goteos(c, { cols: 18, largo: 2 }), hum = c.fbm(4, 4, { warp: { amp: 0.5, freq: 2 } });
    const grt = grietas(c, { freq: 4, ancho: 0.014, deform: 0.6, zona: 0.5 });
    const D = despieceLadrillo(c, { filas: 12, piezas: 5, amp: 0.8 });
    const est = col(0xe3d6bd), lad = [col(0x8e3d28), col(0xa84e30)], mort = col(0x8c8372), capa = col(0xbfb49c);
    for (let i = 0; i < n; i++) {
      const v = caida[i] + (fino[i] - 0.5) * 0.1;
      const hueco = 1 - suave(0.67, 0.675, v);      // 1 = ladrillo visible
      const borde = suave(0.54, 0.6, v) * (1 - (1 - hueco));
      const labio = suave(0.52, 0.6, v) * suave(0.62, 0.6, v);
      // ladrillo al fondo
      const d = D.d[i], m = suave(px(2), px(3.4), d);
      par(lad[0], lad[1], D.id[i], tmp);
      let kl = 0.85 + (fino[i] - 0.5) * 0.4 + (bl[i] - 0.5) * 0.12;
      let lr = mezcla(mort[0] * 0.8, tmp[0] * kl, m), lg = mezcla(mort[1] * 0.8, tmp[1] * kl, m), lb = mezcla(mort[2] * 0.8, tmp[2] * kl, m);
      // capa de mortero basto entre estuco y ladrillo
      const basto = suave(0.64, 0.67, v) * (1 - suave(0.67, 0.7, v));
      // estuco
      let k = 0.95 + (blot[i] - 0.5) * 0.12 + (fino[i] - 0.5) * 0.08 - hol[i] * 0.16 - suave(0.55, 0.75, hum[i]) * 0.18;
      k *= 1 - grt[i] * 0.45;
      let er = est[0] * k, eg = est[1] * k, eb = est[2] * k;
      er = mezcla(er, capa[0] * 0.85, basto); eg = mezcla(eg, capa[1] * 0.85, basto); eb = mezcla(eb, capa[2] * 0.85, basto);
      const r = mezcla(er, lr, hueco), g = mezcla(eg, lg, hueco), bb = mezcla(eb, lb, hueco);
      poner(c, i, r, g, bb);
      c.tinte[i] = clamp(1 - hueco - basto * 0.5);
      const hl = mezcla(0.62 + (fino[i] - 0.5) * 0.05 + (blot[i] - 0.5) * 0.04 - grt[i] * 0.12, 0.2 + m * 0.2 + (fino[i] - 0.5) * 0.06, hueco);
      c.h[i] = hl + (1 - hueco) * suave(0.58, 0.64, v) * 0.0;
      c.rug[i] = clamp(mezcla(0.9 + (fino[i] - 0.5) * 0.1, 0.85, hueco));
    }
    c.fuerzaNormal = 4.2; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 2 }];
  },
};

/** Tablas verticales (pintadas o viejas). */
function tablas(c, { pintadas }) {
  const N = c.N, n = c.n, px = (v) => c.px(v);
  const dd = c.deform(8, px(1.0));
  const D = c.despiece({ filas: 1, piezas: pintadas ? 8 : 9, wVar: pintadas ? 0.02 : 0.25, desfase: 0, deform: dd, soloX: true });
  const V = maderaVeta(c, D, { frecAnillo: pintadas ? 24 : 18, nudos: pintadas ? 0.12 : 0.3, vertical: true, poros: pintadas ? 0.8 : 1.2 });
  const sup = c.fbm([40, 4], 3), blot = c.fbm(4, 5), bl = blanco(N, 14), hol = goteos(c, { cols: 28, largo: 2 }), pel = c.fbm(7, 5, { warp: { amp: 0.7, freq: 3 } }), fis = c.fbm([3, 40], 3, { exacto: true });
  const grisM = col(0x8d8678), grisO = col(0x4e483f), pint = col(0xe9e4d6);
  const sepEnd = c.fbm(2, 2);
  for (let i = 0; i < n; i++) {
    const d = D.d[i], id = D.id[i];
    const m = suave(px(1.6), px(3.2), d);
    const b = suave(0, px(5), d);
    // madera vista
    par(grisO, grisM, clamp(0.2 + id * 0.7 + (blot[i] - 0.5) * 0.4), tmp);
    let kw = pintadas ? 0.62 + V.grano[i] * 0.55 : 0.5 + V.grano[i] * 1.0;
    kw *= 1 - V.nudo[i] * 0.5;
    if (!pintadas) { const fi = 1 - suave(0.0, 0.06, Math.abs(fis[i] - 0.5) - 0.0) ; kw *= 1 - 0.0; }
    let wr = tmp[0] * kw, wg = tmp[1] * kw, wb = tmp[2] * kw;
    let r = wr, g = wg, bb = wb, pm = 0;
    if (pintadas) {
      // pintura: se descascarilla en zonas (más en los bordes y abajo)
      const pel0 = suave(0.58, 0.66, pel[i] + (1 - b) * 0.08 + (bl[i] - 0.5) * 0.1);
      pm = 1 - pel0;
      const pk = 0.94 + (blot[i] - 0.5) * 0.1 + (V.poro[i] - 0.5) * 0.12 - hol[i] * 0.2;
      r = mezcla(wr, pint[0] * pk, pm); g = mezcla(wg, pint[1] * pk, pm); bb = mezcla(wb, pint[2] * pk, pm);
    }
    r = mezcla(r * 0.2, r, m); g = mezcla(g * 0.2, g, m); bb = mezcla(bb * 0.2, bb, m);
    poner(c, i, r, g, bb);
    c.tinte[i] = pintadas ? pm : 0;
    c.h[i] = mezcla(0.05, 0.6 + (V.poro[i] - 0.5) * 0.14 + b * 0.1 + pm * 0.08 - V.nudo[i] * 0.03 + (D.id2[i] - 0.5) * 0.04, m);
    c.rug[i] = clamp(pintadas ? mezcla(0.9, 0.55 + (V.poro[i] - 0.5) * 0.1, pm) : 0.92 + (V.poro[i] - 0.5) * 0.1);
    if (pintadas) c.rug[i] = clamp(mezcla(0.88, 0.5 + (V.poro[i] - 0.5) * 0.1 + hol[i] * 0.2, pm));
  }
  c.fuerzaNormal = 3.4; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.4 }];
}
const tablas_pintadas = { nombre: 'tablas_pintadas', grupo: 'muros', tam: 512, escala: 2, descripcion: 'Revestimiento de tablas verticales pintadas (admite color), con pintura saltada que deja ver la madera gris.', material: { macro: [0.12, 0.04, 0.1], desgaste: 0.4 }, generar: (c) => tablas(c, { pintadas: true }) };
const tablas_viejas = { nombre: 'tablas_viejas', grupo: 'muros', tam: 512, escala: 2, descripcion: 'Tablas de madera curtida por la intemperie: gris plata, grietas largas, nudos y clavos oxidados.', material: { macro: [0.2, 0.05, 0.1], desgaste: 0.4 }, generar: (c) => tablas(c, { pintadas: false }) };

const troncos = {
  nombre: 'troncos', grupo: 'muros', tam: 512, escala: 1.6,
  descripcion: 'Muro de troncos apilados: perfil cilíndrico, corteza fisurada, musgo y hendiduras entre rollizos.',
  material: { macro: [0.2, 0.06, 0.1], desgaste: 0.3 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const filas = 6;
    const bl = blanco(N, 17), fis = c.cresta([3, 48], 4, { warp: { amp: 0.25, freq: 3 } }), fis2 = c.fbm([6, 120], 2, { exacto: true }), blot = c.fbm(4, 5), mus = c.fbm(8, 5), nudo = c.worley(5, { jit: 1 });
    const cor = [col(0x3b2a1c), col(0x5c4330), col(0x7a5a3f)], musgo = col(0x4d6a2c);
    const T = N / filas;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const fi = Math.floor(y / T);
      const v = (y / T - fi) * 2 - 1;           // -1..1
      const rs = Math.abs(v);
      const rid = ((fi * 0.6180339 + 0.13 + (c.semilla % 7) * 0.05) % 1);
      const prof = Math.sqrt(Math.max(0, 1 - rs * rs));
      const fisura = suave(0.45, 0.8, fis[i]);
      // el eje del tronco se ondula suavemente
      const cuerpo = suave(0.93, 0.8, rs) ;
      let h = prof * 0.8 + (fisura - 0.5) * 0.22 * (0.3 + prof) + (fis2[i] - 0.5) * 0.06;
      const nd = 1 - suave(0, 0.2, nudo.f1[i]); h += nd * (nudo.id[i] > 0.7 ? 0.1 : 0);
      c.h[i] = h * (0.35 + 0.65 * cuerpo) * 1.0;
      const t = clamp(0.3 + blot[i] * 0.6 + rid * 0.2 + (1 - fisura) * 0.25);
      rampa(cor, t, tmp);
      let k = 0.3 + Math.pow(prof, 1.5) * 0.8;
      k *= 0.75 + fisura * 0.45 + (fis2[i] - 0.5) * 0.3;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const ms = suave(0.6, 0.75, mus[i]) * (0.4 + (1 - prof) * 0.6) * 0.8;
      r = mezcla(r, musgo[0], ms); g = mezcla(g, musgo[1], ms); b = mezcla(b, musgo[2], ms);
      r *= 0.3 + 0.7 * cuerpo; g *= 0.3 + 0.7 * cuerpo; b *= 0.3 + 0.7 * cuerpo;
      poner(c, i, r, g, b);
      c.tinte[i] = 0.0;
      c.rug[i] = clamp(0.88 + (fis2[i] - 0.5) * 0.15 - ms * 0.1);
    }
    c.fuerzaNormal = 4; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.8 }];
  },
};

const chapa_ondulada = {
  nombre: 'chapa_ondulada', grupo: 'muros', tam: 512, escala: 1.6,
  descripcion: 'Chapa ondulada galvanizada o pintada (admite color), con óxido, golpes, tornillos y churretes de suciedad.',
  material: { macro: [0.16, 0.04, 0.12], desgaste: 0.5, props: { envMapIntensity: 1.1 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const ond = 8;
    const bl = blanco(N, 19), ox = c.fbm(5, 6, { warp: { amp: 0.6, freq: 3 } }), ox2 = c.fbm(18, 4), hol = goteos(c, { cols: 36, largo: 2 }), gol = c.fbm(3, 4), fino = c.fbm(80, 2), pel = c.fbm(6, 5, { warp: { amp: 0.6, freq: 3 } });
    const rem = remaches(c, { cols: ond, filas: 5, radio: 5, desfaseX: 0.0, desfaseY: 0.5 });
    const pintura = col(0xcdd0cf), metal = col(0x9fa3a5), orin = [col(0x5a2a10), col(0x9a4a1c), col(0xb8672a)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const fase = (x / N) * ond * Math.PI * 2;
      const o = Math.sin(fase) * 0.5 + 0.5;
      const dent = (gol[i] - 0.5) * 0.35;
      const pe = suave(0.55, 0.64, pel[i] + (1 - o) * 0.04 - hol[i] * 0.05);
      const oxm = suave(0.58, 0.72, ox[i] * 0.7 + ox2[i] * 0.3 + (pe) * 0.15) * pe + suave(0.8, 0.9, ox2[i]) * 0.5;
      const pm = 1 - pe;
      const lum = 0.55 + o * 0.5 + dent * 0.3 + (fino[i] - 0.5) * 0.1;
      const tr = pintura[0] * lum * (0.92 - hol[i] * 0.3), tg = pintura[1] * lum * (0.92 - hol[i] * 0.3), tb = pintura[2] * lum * (0.92 - hol[i] * 0.3);
      let r = mezcla(metal[0] * lum, tr, pm), g = mezcla(metal[1] * lum, tg, pm), b = mezcla(metal[2] * lum, tb, pm);
      const t = clamp(ox2[i] * 1.2);
      rampa(orin, t, tmp2);
      const om = clamp(oxm);
      r = mezcla(r, tmp2[0] * (0.6 + o * 0.5), om); g = mezcla(g, tmp2[1] * (0.6 + o * 0.5), om); b = mezcla(b, tmp2[2] * (0.6 + o * 0.5), om);
      const tor = rem.mask[i]; r = mezcla(r, 0.25, tor * 0.8); g = mezcla(g, 0.24, tor * 0.8); b = mezcla(b, 0.23, tor * 0.8);
      poner(c, i, r, g, b);
      c.tinte[i] = clamp(pm * (1 - om));
      c.h[i] = o * 0.7 + 0.15 + dent * 0.12 + rem.alt[i] * 0.15 + om * 0.05 * ox2[i];
      c.met[i] = (1 - pm) * (1 - om) * 0.95;
      c.rug[i] = clamp(mezcla(0.4 + (fino[i] - 0.5) * 0.15 + hol[i] * 0.2, 0.5, pm) * (1 - om) + om * 0.85);
    }
    c.fuerzaNormal = 3.6; c.cav = [{ r: 2, f: 2.5 }, { r: 10, f: 1.4 }];
  },
};

const hormigon_bunker = {
  nombre: 'hormigon_bunker', grupo: 'muros', tam: 512, escala: 2.4,
  descripcion: 'Hormigón de encofrado en búnker: paneles marcados, orificios de atirantado, poros, óxido de armadura y manchas.',
  material: { macro: [0.2, 0.04, 0.1], desgaste: 0.5 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 4, piezas: 2, desfase: 0, redondeo: px(2), deform: c.deform(6, px(0.8)) });
    const bl = blanco(N, 23), fino = c.fbm(48, 3), manch = c.fbm(3, 5, { warp: { amp: 0.5, freq: 2 } }), poro = c.worley(70, { jit: 1 }), hol = goteos(c, { cols: 22, largo: 2 }), hum = c.fbm(4, 4), ox = goteos(c, { cols: 12, largo: 3 }), tab = c.fbm([4, 70], 3, { exacto: true });
    const rem = remaches(c, { cols: 4, filas: 4, radio: 7, desfaseX: 0.25, desfaseY: 0.25 });
    const claro = col(0x9b9990), oscuro = col(0x6f6d67), orin = col(0x8a4a22);
    for (let i = 0; i < n; i++) {
      const d = D.d[i];
      const m = suave(px(1.2), px(2.6), d);
      mezcla;
      par(oscuro, claro, clamp(0.5 + (manch[i] - 0.5) * 0.9 + (D.id[i] - 0.5) * 0.35), tmp);
      let k = 0.9 + (fino[i] - 0.5) * 0.22 + (bl[i] - 0.5) * 0.1 + (tab[i] - 0.5) * 0.16;
      const pr = (1 - suave(0, 0.1, poro.f1[i])) * (poro.id[i] > 0.5 ? 1 : 0);
      k *= 1 - pr * 0.42; k *= 1 - hol[i] * 0.3 - suave(0.6, 0.8, hum[i]) * 0.14;
      k *= 0.7 + 0.3 * m;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const oxm = ox[i] * 0.85 * suave(0.45, 0.7, manch[i]);
      r = mezcla(r, orin[0] * 0.9, oxm * 0.55); g = mezcla(g, orin[1] * 0.9, oxm * 0.55); b = mezcla(b, orin[2] * 0.9, oxm * 0.55);
      r *= 1 - rem.mask[i] * 0.55; g *= 1 - rem.mask[i] * 0.55; b *= 1 - rem.mask[i] * 0.55;
      poner(c, i, r, g, b);
      c.h[i] = mezcla(0.2, 0.62 + (fino[i] - 0.5) * 0.14 + (tab[i] - 0.5) * 0.04 - pr * 0.1 - rem.alt[i] * 0.25 + (D.id2[i] - 0.5) * 0.05, m);
      c.rug[i] = clamp(0.84 + (fino[i] - 0.5) * 0.14 + hol[i] * 0.05);
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.6 }];
  },
};

const panel_prefabricado = {
  nombre: 'panel_prefabricado', grupo: 'muros', tam: 512, escala: 3,
  descripcion: 'Fachada de paneles de hormigón prefabricado (admite color), con juntas selladas y manchas de lluvia.',
  material: { macro: [0.16, 0.04, 0.1], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 2, piezas: 2, desfase: 0.5, redondeo: px(5), deform: c.deform(5, px(0.6)) });
    const bl = blanco(N, 27), fino = c.fbm(54, 3), hol = goteos(c, { cols: 14, largo: 2 }), hum = c.fbm(4, 5, { warp: { amp: 0.5, freq: 2 } }), poro = c.worley(80, { jit: 1 });
    const base = col(0xcfcdc6), selle = col(0x4a4a4b);
    for (let i = 0; i < n; i++) {
      const d = D.d[i];
      const m = suave(px(3), px(6), d);
      const bisel = suave(px(6), px(14), d);
      let k = 0.94 + (fino[i] - 0.5) * 0.12 + (bl[i] - 0.5) * 0.05 + (D.id[i] - 0.5) * 0.06;
      k *= 1 - hol[i] * 0.14 - suave(0.6, 0.78, hum[i]) * 0.1;
      const pr = (1 - suave(0, 0.1, poro.f1[i])) * (poro.id[i] > 0.6 ? 1 : 0); k *= 1 - pr * 0.3;
      let r = base[0] * k, g = base[1] * k, b = base[2] * k;
      const sk = 0.8 + (bl[i] - 0.5) * 0.25;
      // junta: sellante oscuro (no toma el tinte)
      r = mezcla(selle[0] * sk, r, m); g = mezcla(selle[1] * sk, g, m); b = mezcla(selle[2] * sk, b, m);
      poner(c, i, r, g, b);
      c.tinte[i] = m;
      c.h[i] = mezcla(0.28 + (bl[i] - 0.5) * 0.02, 0.62 + (fino[i] - 0.5) * 0.07 + bisel * 0.06 - pr * 0.06, m);
      c.rug[i] = clamp(mezcla(0.5, 0.82 + (fino[i] - 0.5) * 0.1 + hol[i] * 0.06, m));
    }
    c.fuerzaNormal = 2.6; c.cav = [{ r: 2, f: 2.5 }, { r: 10, f: 1.2 }];
  },
};

const cristal_rascacielos = {
  nombre: 'cristal_rascacielos', grupo: 'muros', tam: 512, escala: 4,
  descripcion: 'Muro cortina de cristal de rascacielos (admite color): paños reflectantes, montantes de aluminio y ventanas encendidas (usa `emisivo` para la noche).',
  material: { macro: [0.06, 0.02, 0.05], desgaste: 0.1, emisivo: 1.2, colorBase: 0xffffff, props: { envMapIntensity: 1.6 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 14, piezas: 7, desfase: 0, redondeo: px(1.5) });
    const bl = blanco(N, 29), hol = goteos(c, { cols: 40, largo: 3 }), mancha = c.fbm(5, 4), tira = c.fbm([2, 20], 3);
    const E = c.emision();
    const vidrio = col(0x1c3342), marco = col(0x9aa2a8);
    const luz = [col(0xffb860), col(0xffd9a0), col(0xaed4ff)];
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i], id2 = D.id2[i];
      const m = suave(px(1.4), px(2.4), d);
      const interior = suave(px(2.4), px(4), d);
      const t = (D.u[i] * 0.5 + D.v[i] * 0.5);
      let k = 0.8 + id * 0.35 + (D.v[i] - 0.5) * 0.3 + (tira[i] - 0.5) * 0.2;
      let r = vidrio[0] * k, g = vidrio[1] * k, b = vidrio[2] * k * (1 + id2 * 0.1);
      r = mezcla(marco[0] * 0.8, r, m); g = mezcla(marco[1] * 0.8, g, m); b = mezcla(marco[2] * 0.8, b, m);
      poner(c, i, r, g, b);
      c.tinte[i] = m;
      c.h[i] = mezcla(0.7, 0.4 + (1 - interior) * 0.05, m);
      c.met[i] = mezcla(0.9, 0.35, m * 0.0 + (1 - m)) ;
      c.met[i] = mezcla(0.95, 0.9, 1 - m);
      c.rug[i] = clamp(mezcla(0.55, 0.04 + hol[i] * 0.2 + (mancha[i] - 0.5) * 0.06, m));
      // ventanas encendidas al azar (un tercio)
      const enc = id2 < 0.14 ? 1 : 0;
      if (enc && m > 0.5) { const q = Math.min(2.99, id * 3), qi = Math.floor(q); const lc = luz[qi]; const br = (0.35 + 0.5 * D.v[i]) * 0.55; E[i * 3] = lc[0] * br * m; E[i * 3 + 1] = lc[1] * br * m; E[i * 3 + 2] = lc[2] * br * m; }
    }
    c.fuerzaNormal = 2; c.cav = [{ r: 2, f: 2 }, { r: 8, f: 1 }];
  },
};

const panel_futurista = {
  nombre: 'panel_futurista', grupo: 'muros', tam: 512, escala: 2.4,
  descripcion: 'Blindaje de paneles cerámicos blancos con placas hundidas, ventilaciones y líneas luminosas. `color` = color del neón.',
  material: { macro: [0.08, 0.02, 0.06], desgaste: 0.15, colorEmisivo: true, colorBase: 0x35e6ff, emisivo: 2.4, props: { envMapIntensity: 1.2 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 4, piezas: 2, desfase: 0, redondeo: px(8) });
    const bl = blanco(N, 31), fino = c.fbm(60, 2), roce = c.fbm([20, 3], 3), man = c.fbm(4, 4);
    const E = c.emision();
    const base = col(0xdfe3e6), hundida = col(0x8d969c), fondo = col(0x15191c);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i], id2 = D.id2[i];
      const m = suave(px(2), px(3.5), d);
      const lx = D.u[i], ly = D.v[i];
      const tipo = id < 0.33 ? 0 : id < 0.66 ? 1 : 2;
      // placa interior hundida
      const ix = Math.min(lx, 1 - lx) * D.pw[i], iy = Math.min(ly, 1 - ly) * D.ph[i];
      const di = Math.min(ix, iy) - px(16);
      const placa = suave(-px(1.4), px(1.4), di);          // 1 dentro de la placa
      const labio = 1 - suave(0, px(3), Math.abs(di));
      let k = 0.95 + (fino[i] - 0.5) * 0.06 + (bl[i] - 0.5) * 0.03 - suave(0.6, 0.8, roce[i]) * 0.1;
      let r = base[0] * k, g = base[1] * k, b = base[2] * k;
      r = mezcla(r, hundida[0] * k, placa * 0.5); g = mezcla(g, hundida[1] * k, placa * 0.5); b = mezcla(b, hundida[2] * k, placa * 0.5);
      let ev = 0, vent = 0;
      if (tipo === 1) { // ventilación: ranuras horizontales
        const sl = (ly * D.ph[i]) / px(7);
        const f = sl - Math.floor(sl);
        const dentro = placa * suave(px(8), px(10), Math.min(ix, iy) ) ;
        vent = (1 - suave(0.28, 0.4, Math.abs(f - 0.5))) * suave(0.2, 0.28, 0.5 - Math.abs(f - 0.5) * 0) * placa;
        vent *= (D.u[i] > 0.2 && D.u[i] < 0.8 && ly > 0.2 && ly < 0.8) ? 1 : 0;
        r = mezcla(r, fondo[0], vent); g = mezcla(g, fondo[1], vent); b = mezcla(b, fondo[2], vent);
      } else if (tipo === 2) { // tira luminosa en el centro
        const dl = Math.abs(ly - 0.5) * D.ph[i];
        ev = (1 - suave(px(2), px(3.4), dl)) * (D.u[i] > 0.12 && D.u[i] < 0.88 ? 1 : 0) * placa;
        r = mezcla(r, fondo[0], ev * 0.6); g = mezcla(g, fondo[1], ev * 0.6); b = mezcla(b, fondo[2], ev * 0.6);
      }
      r = mezcla(fondo[0] * 0.5, r, m); g = mezcla(fondo[1] * 0.5, g, m); b = mezcla(fondo[2] * 0.5, b, m);
      poner(c, i, r, g, b);
      c.tinte[i] = 0;
      c.h[i] = mezcla(0.0, 0.7 - placa * 0.12 - vent * 0.35 + labio * 0.04 + (fino[i] - 0.5) * 0.01, m);
      c.rug[i] = clamp(0.28 + suave(0.55, 0.85, roce[i]) * 0.35 + (man[i] - 0.5) * 0.1 + vent * 0.3);
      c.met[i] = 0.05;
      const e = Math.max(ev, (1 - suave(px(1.2), px(2.2), d)) * 0.0 + (tipo === 0 ? (1 - suave(px(0.8), px(1.8), Math.abs(di))) * 0.5 : 0));
      E[i * 3] = e; E[i * 3 + 1] = e; E[i * 3 + 2] = e;
    }
    c.fuerzaNormal = 2.8; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.4 }];
  },
};

export default [ladrillo_rojo, ladrillo_encalado, sillería, estuco_desconchado, tablas_pintadas, tablas_viejas, troncos, chapa_ondulada, hormigon_bunker, panel_prefabricado, cristal_rascacielos, panel_futurista];
