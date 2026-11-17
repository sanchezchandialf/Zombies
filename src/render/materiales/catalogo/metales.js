// Catálogo · METALES (512 px)
import { clamp, suave, mezcla, col, blanco, rampa, crearRng } from './util.js';
import { remaches, grietas } from '../texturas.js';

const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
const poner = (c, i, r, g, b) => { c.alb[i * 3] = r; c.alb[i * 3 + 1] = g; c.alb[i * 3 + 2] = b; };
const par = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };

const hierro_forjado = {
  nombre: 'hierro_forjado', grupo: 'metales', tam: 512, escala: 1,
  descripcion: 'Hierro forjado negro martilleado: golpes de fragua, cascarilla, brillo en los cantos y motas de óxido.',
  material: { macro: [0.12, 0.03, 0.12], desgaste: 0.3, props: { envMapIntensity: 1.2 } },
  generar(c) {
    const N = c.N, n = c.n;
    const mart = c.worley(14, { jit: 1, warp: { amp: 0.15, freq: 6 } }), mart2 = c.worley(34, { jit: 1 }), sup = c.fbm(40, 4), blot = c.fbm(4, 5), bl = blanco(N, 41), ox = c.fbm(9, 5), rayas = c.fbm([2, 160], 2, { exacto: true });
    const base = col(0x4a4b4e), calido = col(0x58504a), orin = col(0x7a3d1c);
    for (let i = 0; i < n; i++) {
      const e1 = suave(0, 0.5, mart.f1[i]), e2 = suave(0, 0.5, mart2.f1[i]);
      const h = 0.5 + (1 - e1) * 0.28 * (mart.id[i] - 0.3) + (1 - e2) * 0.1 * (mart2.id[i] - 0.5) + (sup[i] - 0.5) * 0.06;
      c.h[i] = h;
      par(base, calido, blot[i], tmp);
      let k = 0.55 + (1 - e1) * 0.35 * mart.id[i] + (sup[i] - 0.5) * 0.35 + (rayas[i] - 0.5) * 0.12 + (bl[i] - 0.5) * 0.06;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const om = suave(0.66, 0.78, ox[i]) * 0.7;
      r = mezcla(r, orin[0], om); g = mezcla(g, orin[1], om); b = mezcla(b, orin[2], om);
      poner(c, i, r, g, b);
      c.tinte[i] = 0;
      c.met[i] = (1 - om) * 0.9;
      c.rug[i] = clamp(0.5 + (sup[i] - 0.5) * 0.3 + (rayas[i] - 0.5) * 0.15 + om * 0.4 - (1 - e1) * 0.1);
    }
    c.fuerzaNormal = 3.2; c.cav = [{ r: 2, f: 2.4 }, { r: 8, f: 1.2 }];
  },
};

const hierro_oxidado = {
  nombre: 'hierro_oxidado', grupo: 'metales', tam: 512, escala: 1.2,
  descripcion: 'Chapa de hierro oxidada: restos de pintura verdosa, costra parda y naranja, picaduras, escamas y metal desnudo.',
  material: { macro: [0.2, 0.08, 0.12], desgaste: 0.5 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const costra = c.fbm(5, 6, { warp: { amp: 0.7, freq: 3 } }), pic = c.worley(52, { jit: 1 }), cr = c.cresta(9, 5), fino = c.fbm(80, 3), bl = blanco(N, 43);
    const pint = c.fbm(4, 6, { warp: { amp: 0.8, freq: 3 } }), pint2 = c.fbm(16, 4), hol = c.fbm([22, 3], 3, { exacto: true }), desn = c.fbm(6, 5, { warp: { amp: 0.6, freq: 2 } });
    const acero = col(0x6a6d70), pintura = col(0x5b6e62), orin = [col(0x2e170c), col(0x5a2c14), col(0x8a4220), col(0xb6602a), col(0x6e4a2c)];
    for (let i = 0; i < n; i++) {
      const pv = suave(0.5, 0.56, pint[i] + (pint2[i] - 0.5) * 0.18 + (bl[i] - 0.5) * 0.03); // 1 = pintura conservada
      const costra0 = suave(0.42, 0.5, costra[i] * 0.7 + cr[i] * 0.3);
      const t = clamp(costra[i] * 0.9 + cr[i] * 0.45 + (fino[i] - 0.5) * 0.5 - 0.15);
      rampa(orin, t, tmp);
      const pit = (1 - suave(0, 0.2, pic.f1[i])) * (pic.id[i] > 0.4 ? 1 : 0);
      let k = 0.85 + (fino[i] - 0.5) * 0.5 + (bl[i] - 0.5) * 0.12 - pit * 0.45 + (hol[i] - 0.5) * 0.2;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      // metal desnudo en rasguños y zonas lijadas por el óxido desprendido
      const metal = suave(0.78, 0.86, desn[i]) * (1 - costra0 * 0.6);
      r = mezcla(r, acero[0] * (0.7 + fino[i] * 0.6), metal); g = mezcla(g, acero[1] * (0.7 + fino[i] * 0.6), metal); b = mezcla(b, acero[2] * (0.7 + fino[i] * 0.6), metal);
      // pintura restante (gris verdosa, con óxido que la atraviesa)
      const pk = 0.8 + (fino[i] - 0.5) * 0.3 + (hol[i] - 0.5) * 0.15;
      const pm = pv * (1 - metal);
      r = mezcla(r, pintura[0] * pk, pm * 0.95); g = mezcla(g, pintura[1] * pk, pm * 0.95); b = mezcla(b, pintura[2] * pk, pm * 0.95);
      poner(c, i, r, g, b);
      c.tinte[i] = 0;
      c.h[i] = 0.4 + (1 - pv) * (0.12 + costra0 * 0.12 + cr[i] * 0.12 + (fino[i] - 0.5) * 0.12) + pv * 0.22 - pit * 0.2 - metal * 0.1;
      c.met[i] = metal * 0.9;
      c.rug[i] = clamp(mezcla(0.93 + (fino[i] - 0.5) * 0.1, 0.5, metal) * (1 - pm * 0.4) + pm * 0.0);
    }
    c.fuerzaNormal = 4; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.6 }];
  },
};

const acero_pintado = {
  nombre: 'acero_pintado', grupo: 'metales', tam: 512, escala: 1.6,
  descripcion: 'Planchas de acero pintadas (el color se elige con `color`), remachadas, con desconchones hasta el metal y óxido en los cantos.',
  material: { tipo: 'physical', macro: [0.1, 0.04, 0.1], desgaste: 0.4, props: { clearcoat: 0.45, clearcoatRoughness: 0.35, envMapIntensity: 1.2 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 2, piezas: 2, desfase: 0.5, redondeo: px(5), deform: c.deform(5, px(0.8)) });
    const rem = remaches(c, { cols: 16, filas: 16, radio: 3.4, desfaseX: 0.5, desfaseY: 0.5 });
    const bl = blanco(N, 47), des = c.fbm(7, 6, { warp: { amp: 0.7, freq: 3 } }), des2 = c.fbm(26, 4), ray = c.fbm([4, 100], 2, { exacto: true }), hol = c.fbm([30, 3], 3, { exacto: true }), ox = c.fbm(9, 5), sup = c.fbm(50, 2), suc = c.fbm(5, 5);
    const pintura = col(0xe6e6e6), primer = col(0x7a4a3a), metal = col(0x8d9094), orin = col(0x8a4220);
    for (let i = 0; i < n; i++) {
      const d = D.d[i];
      const m = suave(px(1.2), px(2.6), d);
      const bisel = suave(0, px(6), d);
      // desconchones: más en bordes, remaches y con ruido
      const borde = 1 - suave(0, px(18), d);
      const f = des[i] + borde * 0.12 + rem.mask[i] * 0.06 + (des2[i] - 0.5) * 0.18 + (bl[i] - 0.5) * 0.03;
      const pv = suave(0.6, 0.64, f);        // 1 = pintura saltada
      const pm = 1 - pv;
      const prim = pv * (1 - suave(0.64, 0.7, f)) * 0.0 + suave(0.6, 0.62, f) * (1 - suave(0.63, 0.66, f));
      const sk = 0.62 + (sup[i] - 0.5) * 0.3 + (ray[i] - 0.5) * 0.2;
      const om = suave(0.58, 0.7, ox[i]) * pv * 0.8;
      const pk = 0.95 + (suc[i] - 0.5) * 0.12 + (sup[i] - 0.5) * 0.04 - hol[i] * 0.0;
      let r = mezcla(metal[0] * sk, pintura[0] * pk, pm), g = mezcla(metal[1] * sk, pintura[1] * pk, pm), b = mezcla(metal[2] * sk, pintura[2] * pk, pm);
      r = mezcla(r, primer[0], prim * 0.5); g = mezcla(g, primer[1], prim * 0.5); b = mezcla(b, primer[2], prim * 0.5);
      r = mezcla(r, orin[0] * (0.7 + sup[i] * 0.6), om); g = mezcla(g, orin[1] * (0.7 + sup[i] * 0.6), om); b = mezcla(b, orin[2] * (0.7 + sup[i] * 0.6), om);
      r *= 1 - rem.mask[i] * 0.12; g *= 1 - rem.mask[i] * 0.12; b *= 1 - rem.mask[i] * 0.12;
      r = mezcla(r * 0.3, r, m); g = mezcla(g * 0.3, g, m); b = mezcla(b * 0.3, b, m);
      poner(c, i, r, g, b);
      c.tinte[i] = clamp(pm * (1 - prim * 0.5) * (1 - om));
      c.h[i] = mezcla(0.1, 0.6 + bisel * 0.06 + pm * 0.07 + rem.alt[i] * 0.18 - om * 0.02 + (sup[i] - 0.5) * 0.02, m);
      c.met[i] = pv * (1 - om) * 0.9;
      c.rug[i] = clamp(mezcla(0.42 + (ray[i] - 0.5) * 0.3, 0.38 + (sup[i] - 0.5) * 0.12, pm) * (1 - om) + om * 0.9);
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.4 }];
  },
};

const laton_bronce = {
  nombre: 'laton_bronce', grupo: 'metales', tam: 512, escala: 1,
  descripcion: 'Latón y bronce envejecidos: dorado cálido, martilleado suave, arañazos y pátina verdosa en las hendiduras.',
  material: { macro: [0.12, 0.05, 0.1], desgaste: 0.3, props: { envMapIntensity: 1.3 } },
  generar(c) {
    const N = c.N, n = c.n;
    const mart = c.worley(8, { jit: 1, warp: { amp: 0.35, freq: 4 } }), sup = c.fbm(50, 4), blot = c.fbm(3, 5, { warp: { amp: 0.5, freq: 2 } }), rayas = c.fbm([3, 200], 2, { exacto: true }), ray2 = c.fbm([140, 2], 2, { exacto: true }), pat = c.fbm(5, 6, { warp: { amp: 0.7, freq: 3 } }), bl = blanco(N, 51), pat2 = c.fbm(22, 4);
    const oro = col(0xd2a043), bronce = col(0x9a5a28), verde = col(0x4a8a72), verde2 = col(0x78b4a0);
    for (let i = 0; i < n; i++) {
      const e = suave(0, 0.55, mart.f1[i]);
      const h = 0.55 + (1 - e) * 0.07 * (mart.id[i] - 0.3) + (mart.borde[i] < 0.05 ? -0.03 : 0) + (sup[i] - 0.5) * 0.05;
      c.h[i] = h;
      par(bronce, oro, clamp(0.25 + blot[i] * 0.9), tmp);
      let k = 0.72 + (rayas[i] - 0.5) * 0.3 + (sup[i] - 0.5) * 0.18 + (bl[i] - 0.5) * 0.04 + (e - 0.5) * 0.08;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      // pátina: solo en hendiduras y en manchas dispersas
      const pv = suave(0.64, 0.78, pat[i] * 0.75 + (1 - h) * 0.3 + (pat2[i] - 0.5) * 0.2) * (0.6 + 0.4 * (1 - e));
      par(verde, verde2, sup[i], tmp2);
      r = mezcla(r, tmp2[0] * (0.55 + sup[i] * 0.4), pv * 0.85); g = mezcla(g, tmp2[1] * (0.55 + sup[i] * 0.4), pv * 0.85); b = mezcla(b, tmp2[2] * (0.55 + sup[i] * 0.4), pv * 0.85);
      poner(c, i, r, g, b);
      c.tinte[i] = 0;
      c.met[i] = (1 - pv * 0.85);
      c.rug[i] = clamp(0.3 + (sup[i] - 0.5) * 0.25 + (rayas[i] - 0.5) * 0.2 + (ray2[i] - 0.5) * 0.1 + pv * 0.5);
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 2, f: 2.4 }, { r: 8, f: 1.4 }];
  },
};

const cromo = {
  nombre: 'cromo', grupo: 'metales', tam: 512, escala: 1,
  descripcion: 'Cromado espejo con huellas, micro-arañazos y motas de picadura; vive del reflejo del entorno.',
  material: { macro: [0.04, 0.0, 0.1], desgaste: 0.1, props: { envMapIntensity: 1.5 } },
  generar(c) {
    const N = c.N, n = c.n;
    const fin = c.fbm(60, 3), hue = c.fbm(5, 5, { warp: { amp: 0.5, freq: 3 } }), hue2 = c.fbm(14, 4), ray = c.fbm([2, 220], 2, { exacto: true }), ray2 = c.fbm([180, 3], 2, { exacto: true }), bl = blanco(N, 53), pic = c.worley(40, { jit: 1 }), fond = c.fbm(3, 3);
    for (let i = 0; i < n; i++) {
      const pit = pic.id[i] > 0.93 ? 1 - suave(0.03, 0.08, pic.f1[i]) : 0;
      const g = 0.86 + (hue[i] - 0.5) * 0.08 - pit * 0.25 + (fond[i] - 0.5) * 0.04;
      poner(c, i, g * 0.99, g, g * 1.01);
      c.tinte[i] = 0;
      c.h[i] = 0.5 + (fin[i] - 0.5) * 0.02 - pit * 0.1;
      c.met[i] = 1;
      const huella = suave(0.58, 0.72, hue2[i] * 0.6 + hue[i] * 0.4);
      c.rug[i] = clamp(0.06 + huella * 0.14 + Math.max(0, (ray[i] - 0.52) * 0.8) + Math.max(0, (ray2[i] - 0.57) * 0.8) + pit * 0.2);
    }
    c.fuerzaNormal = 1.4; c.cav = [{ r: 2, f: 1.5 }, { r: 8, f: 0.8 }];
  },
};

const acero_cepillado = {
  nombre: 'acero_cepillado', grupo: 'metales', tam: 512, escala: 1.2,
  descripcion: 'Acero inoxidable cepillado en una dirección, con reflejo anisótropo, planchas atornilladas y marcas de uso.',
  material: { tipo: 'physical', macro: [0.08, 0.02, 0.1], desgaste: 0.2, props: { anisotropy: 0.65, anisotropyRotation: 0, envMapIntensity: 1.3 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 2, piezas: 2, desfase: 0, redondeo: px(4) });
    const rem = remaches(c, { cols: 8, filas: 8, radio: 3.6, desfaseX: 0.12, desfaseY: 0.12 });
    const ce1 = c.fbm([2, 400], 2, { exacto: true }), ce2 = c.fbm([4, 160], 3, { exacto: true }), blot = c.fbm(4, 5), uso = c.fbm(7, 5, { warp: { amp: 0.5, freq: 3 } }), bl = blanco(N, 57), mancha = c.fbm([3, 30], 3);
    const base = col(0xb4b7ba);
    for (let i = 0; i < n; i++) {
      const d = D.d[i];
      const m = suave(px(1.2), px(2.6), d), bisel = suave(0, px(6), d);
      const cep = (ce1[i] - 0.5) * 0.5 + (ce2[i] - 0.5) * 0.5;
      let k = 0.82 + cep * 0.45 + (blot[i] - 0.5) * 0.12 + D.id[i] * 0.06 - suave(0.6, 0.8, uso[i]) * 0.1;
      k *= 1 - rem.mask[i] * 0.15;
      poner(c, i, base[0] * k, base[1] * k, base[2] * k * 1.01);
      c.tinte[i] = 0;
      c.h[i] = mezcla(0.1, 0.6 + cep * 0.06 + bisel * 0.04 + rem.alt[i] * 0.2, m);
      c.met[i] = 1 - (1 - m) * 0.4;
      c.rug[i] = clamp(0.3 + cep * 0.18 + suave(0.55, 0.8, uso[i]) * 0.2 + (mancha[i] - 0.5) * 0.1 + (1 - m) * 0.2);
    }
    c.fuerzaNormal = 2.2; c.cav = [{ r: 2, f: 2 }, { r: 8, f: 1.2 }];
  },
};

const casco_nave = {
  nombre: 'casco_nave', grupo: 'metales', tam: 512, escala: 2.4,
  descripcion: 'Casco de nave espacial: placas de tamaños desiguales, remaches, tuberías hundidas, quemaduras y luces de posición. `color` pinta el blindaje.',
  material: { tipo: 'physical', macro: [0.12, 0.03, 0.1], desgaste: 0.35, emisivo: 3, colorEmisivo: false, props: { clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 1.3 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 7, piezas: (r) => [3, 2, 4, 2, 3, 5, 2][r % 7], hVar: 0.6, wVar: 0.6, desfase: 'azar', redondeo: px(4), deform: c.deform(5, px(0.5)) });
    const rem = remaches(c, { cols: 32, filas: 32, radio: 2.2, desfaseX: 0.5, desfaseY: 0.5 });
    const bl = blanco(N, 59), roz = c.fbm(7, 6, { warp: { amp: 0.6, freq: 3 } }), fino = c.fbm(60, 2), ray = c.fbm([8, 120], 2, { exacto: true }), quem = c.fbm(5, 5, { warp: { amp: 0.7, freq: 2 } }), hol = c.fbm([22, 3], 3, { exacto: true }), mant = c.fbm(4, 4);
    const E = c.emision();
    const casco = col(0xb9bdc2), oscuro = col(0x4b5056), metal = col(0x80858a), quema = col(0x17120f);
    const luces = [col(0xff3a30), col(0x40ff9a), col(0xffffff)];
    for (let i = 0; i < n; i++) {
      const d = D.d[i], id = D.id[i], id2 = D.id2[i];
      const m = suave(px(1.0), px(2.2), d), bisel = suave(0, px(7), d);
      // algunas placas más oscuras o con panel interior hundido
      const ix = Math.min(D.u[i], 1 - D.u[i]) * D.pw[i], iy = Math.min(D.v[i], 1 - D.v[i]) * D.ph[i];
      const di = Math.min(ix, iy) - px(10);
      const inset = id2 > 0.55 ? suave(-px(1.2), px(1.2), di) : 0;
      const lab = id2 > 0.55 ? 1 - suave(0, px(2.4), Math.abs(di)) : 0;
      const tone = id < 0.22 ? 0.55 : 1;
      let pmask = 1;
      // desconchón de pintura hacia el metal
      const roz0 = suave(0.62, 0.7, roz[i] + (1 - bisel) * 0.1 + lab * 0.05);
      pmask = 1 - roz0;
      let k = (0.88 + (id - 0.5) * 0.18 + (fino[i] - 0.5) * 0.06 + (mant[i] - 0.5) * 0.12) * tone;
      k *= 1 - inset * 0.12;
      let r = casco[0] * k, g = casco[1] * k, b = casco[2] * k;
      const sk = 0.7 + (ray[i] - 0.5) * 0.3 + (fino[i] - 0.5) * 0.2;
      r = mezcla(metal[0] * sk, r, pmask); g = mezcla(metal[1] * sk, g, pmask); b = mezcla(metal[2] * sk, b, pmask);
      const q = suave(0.66, 0.78, quem[i]) * 0.8;
      r = mezcla(r, quema[0], q); g = mezcla(g, quema[1], q); b = mezcla(b, quema[2], q);
      r *= 1 - rem.mask[i] * 0.2; g *= 1 - rem.mask[i] * 0.2; b *= 1 - rem.mask[i] * 0.2;
      r = mezcla(r * 0.2, r, m); g = mezcla(g * 0.2, g, m); b = mezcla(b * 0.2, b, m);
      poner(c, i, r, g, b);
      c.tinte[i] = clamp(pmask * (1 - q) * m);
      c.h[i] = mezcla(0.0, 0.7 - inset * 0.08 + lab * 0.04 + bisel * 0.05 + rem.alt[i] * 0.14 + (fino[i] - 0.5) * 0.012, m);
      c.met[i] = clamp(0.4 + (1 - pmask) * 0.6 - q * 0.3);
      c.rug[i] = clamp(mezcla(0.5 + (ray[i] - 0.5) * 0.2, 0.7, q) + (1 - m) * 0.2 + hol[i] * 0.02);
      // luces de posición: pequeños puntos en esquinas de algunas placas
      if (id2 < 0.12) {
        const cx = Math.min(D.u[i], 1 - D.u[i]) * D.pw[i] - px(7), cy = Math.min(D.v[i], 1 - D.v[i]) * D.ph[i] - px(7);
        const dd = Math.sqrt(cx * cx + cy * cy), e = 1 - suave(px(1.4), px(2.8), dd);
        if (e > 0) { const lc = luces[Math.min(2, Math.floor(id * 12))]; E[i * 3] = lc[0] * e; E[i * 3 + 1] = lc[1] * e; E[i * 3 + 2] = lc[2] * e; }
      }
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 2, f: 3 }, { r: 8, f: 1.4 }];
  },
};

export default [hierro_forjado, hierro_oxidado, acero_pintado, laton_bronce, cromo, acero_cepillado, casco_nave];
