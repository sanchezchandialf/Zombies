// Catálogo · OTROS (512 px): tejidos, goma, cristal, agua, emisivos, madera lacada, mármol, yeso, alfombra, nieve
import { clamp, suave, mezcla, col, blanco, rampa, crearRng, maderaVeta } from './util.js';
import { remaches, vetas } from '../texturas.js';

const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
const poner = (c, i, r, g, b) => { c.alb[i * 3] = r; c.alb[i * 3 + 1] = g; c.alb[i * 3 + 2] = b; };
const par = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };

/** Tejido liso: devuelve [alto 0..1, hilo (0 trama, 1 urdimbre)] en coordenadas (x,y) con `n` hilos (par). */
function tejer(x, y, N, n) {
  const fx = (x / N) * n, fy = (y / N) * n;
  const i = Math.floor(fx), j = Math.floor(fy), lx = fx - i, ly = fy - j;
  const v = (i + j) & 1;
  const a = Math.sin(Math.PI * lx), b = Math.sin(Math.PI * ly);
  const h = v ? a * (0.65 + 0.35 * b) : b * (0.65 + 0.35 * a);
  return h;
}

const saco_arena = {
  nombre: 'saco_arena', grupo: 'otros', tam: 512, escala: 1.6,
  descripcion: 'Sacos de arena de arpillera: trama gruesa, abultados, con costura, polvo y descosidos.',
  material: { macro: [0.2, 0.06, 0.1], desgaste: 0.4 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 4, piezas: 2, hVar: 0.15, wVar: 0.3, desfase: 'azar', redondeo: px(26), deform: c.deform(6, px(5)) });
    const blot = c.fbm(5, 5), bl = blanco(N, 61), polvo = c.fbm(8, 5), sup = c.fbm(24, 3), arr = c.fbm(3, 4), hilo = c.fbm([80, 6], 2, { exacto: true });
    const base = [col(0xb59a68), col(0x9c8350), col(0xc4a874), col(0x8a7448)], suc = col(0x4a3d28);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const d = D.d[i], id = D.id[i];
      const m = suave(px(1.5), px(5), d);
      const dome = Math.pow(suave(0, px(46), d), 0.8);
      const w = tejer(x, y, N, 88);
      const w2 = tejer(x + 3, y + 1, N, 44) * 0.5;
      const costura = (1 - suave(px(1), px(2.6), Math.abs(D.v[i] - 0.5) * D.ph[i] - px(0))) * 0 ;
      const arrug = (arr[i] - 0.5) * 0.18 + (sup[i] - 0.5) * 0.1;
      c.h[i] = mezcla(0.05, 0.2 + dome * 0.55 + arrug + w * 0.14 + w2 * 0.05 + (hilo[i] - 0.5) * 0.03, m);
      const pi = Math.min(2.99, id * 4), pf = Math.floor(pi);
      par(base[pf], base[pf + 1], pi - pf, tmp);
      let k = 0.82 + (w - 0.5) * 0.35 + (blot[i] - 0.5) * 0.35 + (hilo[i] - 0.5) * 0.15 + (bl[i] - 0.5) * 0.08;
      k *= 0.55 + 0.45 * suave(0, px(24), d);
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const pv = suave(0.55, 0.75, polvo[i]) * 0.35;
      r = mezcla(r, suc[0] * 1.4, pv); g = mezcla(g, suc[1] * 1.4, pv); b = mezcla(b, suc[2] * 1.4, pv);
      r = mezcla(r * 0.25, r, m); g = mezcla(g * 0.25, g, m); b = mezcla(b * 0.25, b, m);
      poner(c, i, r, g, b);
      c.tinte[i] = 0.5;
      c.rug[i] = clamp(0.95 + (hilo[i] - 0.5) * 0.08);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 1, f: 3 }, { r: 8, f: 1.8 }];
  },
};

const lona = {
  nombre: 'lona', grupo: 'otros', tam: 512, escala: 1.2,
  descripcion: 'Lona de algodón encerado (admite color): trama fina, pliegues suaves, manchas y ojetes.',
  material: { macro: [0.14, 0.05, 0.08], desgaste: 0.35 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const plie = c.cresta(3, 4, { warp: { amp: 0.6, freq: 2 } }), blot = c.fbm(4, 5), bl = blanco(N, 63), suc = c.fbm(6, 5, { warp: { amp: 0.5, freq: 2 } }), hilo = c.fbm([120, 8], 2, { exacto: true }), hilo2 = c.fbm([8, 120], 2, { exacto: true });
    const rem = remaches(c, { cols: 2, filas: 2, radio: 14, desfaseX: 0.5, desfaseY: 0.5 });
    const base = col(0x8a8a64), mancha = col(0x3e3a2c);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const w = tejer(x, y, N, 128);
      const pl = (plie[i] - 0.5);
      c.h[i] = 0.5 + pl * 0.6 + w * 0.07 + (hilo[i] + hilo2[i] - 1) * 0.03 - rem.alt[i] * 0.0;
      const sm = suave(0.55, 0.78, suc[i]);
      let k = 0.9 + (w - 0.5) * 0.2 + pl * 0.35 + (blot[i] - 0.5) * 0.2 + (hilo[i] - 0.5) * 0.08 + (bl[i] - 0.5) * 0.04;
      let r = base[0] * k, g = base[1] * k, b = base[2] * k;
      r = mezcla(r, mancha[0], sm * 0.35); g = mezcla(g, mancha[1], sm * 0.35); b = mezcla(b, mancha[2], sm * 0.35);
      // ojete metálico
      const oj = rem.mask[i], an = suave(0.2, 0.5, oj) * (1 - suave(0.6, 0.9, oj));
      r = mezcla(r, 0.55, oj * 0.9); g = mezcla(g, 0.55, oj * 0.9); b = mezcla(b, 0.52, oj * 0.9);
      poner(c, i, r, g, b);
      c.tinte[i] = 1 - oj;
      c.h[i] += oj * 0.2;
      c.met[i] = oj * 0.9;
      c.rug[i] = clamp(mezcla(0.88 - sm * 0.05, 0.35, oj));
    }
    c.fuerzaNormal = 3; c.cav = [{ r: 1, f: 2.4 }, { r: 8, f: 1.4 }];
  },
};

const cuero = {
  nombre: 'cuero', grupo: 'otros', tam: 512, escala: 0.8,
  descripcion: 'Cuero curtido (admite color): poro granulado, arrugas, rozaduras que aclaran los bordes y brillo suave.',
  material: { macro: [0.14, 0.05, 0.1], desgaste: 0.3, props: { envMapIntensity: 1.1 } },
  generar(c) {
    const N = c.N, n = c.n;
    const g1 = c.worley(70, { jit: 0.9, warp: { amp: 0.08, freq: 8 } }), g2 = c.worley(34, { jit: 1 }), arr = c.cresta(5, 5, { warp: { amp: 0.5, freq: 3 } }), blot = c.fbm(4, 5), roz = c.fbm(7, 5, { warp: { amp: 0.5, freq: 3 } }), bl = blanco(N, 65), ray = c.fbm([4, 90], 2, { exacto: true }), fino = c.fbm(80, 2);
    const base = col(0x7a4a2a), claro = col(0xa8794d);
    for (let i = 0; i < n; i++) {
      const bor = suave(0.04, 0.4, g1.borde[i]), bor2 = suave(0.03, 0.3, g2.borde[i]);
      const grano = bor * 0.7 + bor2 * 0.3;
      const ar = suave(0.55, 0.85, arr[i]) * 0.5;
      c.h[i] = 0.5 + grano * 0.22 - ar * 0.2 + (fino[i] - 0.5) * 0.04;
      const rz = suave(0.58, 0.75, roz[i]);
      par(base, claro, clamp(rz * 0.8 + (blot[i] - 0.5) * 0.5 + 0.1), tmp);
      let k = 0.78 + grano * 0.28 + (blot[i] - 0.5) * 0.35 + (bl[i] - 0.5) * 0.05 - ar * 0.35;
      poner(c, i, tmp[0] * k, tmp[1] * k, tmp[2] * k);
      c.tinte[i] = 1;
      c.rug[i] = clamp(0.5 + (1 - grano) * 0.2 + rz * 0.25 + ar * 0.2 + Math.max(0, ray[i] - 0.55) * 0.5);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 1, f: 3 }, { r: 6, f: 1.4 }];
  },
};

const tela = {
  nombre: 'tela', grupo: 'otros', tam: 512, escala: 0.6,
  descripcion: 'Tejido de lana o algodón en sarga (admite color), con motas, pelusa y desgaste en los pliegues.',
  material: { macro: [0.14, 0.05, 0.08], desgaste: 0.3 },
  generar(c) {
    const N = c.N, n = c.n;
    const blot = c.fbm(4, 5), bl = blanco(N, 67), pel = c.fbm(90, 3), pl = c.fbm(4, 5, { warp: { amp: 0.5, freq: 2 } }), mot = c.worley(48, { jit: 1 });
    const base = col(0x8c8f9a);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      // sarga: hilos en diagonal
      const fx = (x / N) * 96, fy = (y / N) * 96;
      const d = Math.sin((fx + fy) * Math.PI) * 0.5 + 0.5;
      const t = Math.sin(fx * Math.PI * 2) * 0.5 + 0.5, t2 = Math.sin(fy * Math.PI * 2) * 0.5 + 0.5;
      const w = d * 0.6 + t * t2 * 0.4;
      c.h[i] = 0.5 + w * 0.2 + (pel[i] - 0.5) * 0.08 + (pl[i] - 0.5) * 0.2;
      const m = mot.id[i] > 0.9 ? 1 - suave(0.04, 0.1, mot.f1[i]) : 0;
      let k = 0.85 + (w - 0.5) * 0.25 + (blot[i] - 0.5) * 0.2 + (pel[i] - 0.5) * 0.18 + (bl[i] - 0.5) * 0.06 + m * 0.15;
      poner(c, i, base[0] * k, base[1] * k, base[2] * k);
      c.tinte[i] = 1;
      c.rug[i] = clamp(0.92 + (pel[i] - 0.5) * 0.1);
    }
    c.fuerzaNormal = 2.8; c.cav = [{ r: 1, f: 2.4 }, { r: 6, f: 1.2 }];
  },
};

const cuerda = {
  nombre: 'cuerda', grupo: 'otros', tam: 512, escala: 0.8,
  descripcion: 'Cuerda de cáñamo de tres cabos retorcidos, hilada en cordones horizontales, con fibras sueltas y suciedad.',
  material: { macro: [0.16, 0.05, 0.08], desgaste: 0.35 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const cuerdas = 4, T = N / cuerdas;
    const fib = c.fbm([4, 160], 2, { exacto: true }), fib2 = c.fbm([2, 90], 3, { exacto: true }), blot = c.fbm(4, 5), bl = blanco(N, 69), pelo = c.fbm(60, 3), suc = c.fbm(6, 5);
    const claro = col(0xc9ad76), oscuro = col(0x7a6238), sucio = col(0x3c3022);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const fi = Math.floor(y / T);
      const v = (y / T - fi) * 2 - 1, rs = Math.abs(v);
      const prof = Math.sqrt(Math.max(0, 1 - rs * rs));
      const cuerpo = suave(0.97, 0.86, rs);
      // cabos retorcidos: fase oblicua (3 cabos que giran al avanzar x)
      const fase = (x / N) * 10 + v * 0.85 * 1.0 + fi * 0.37;
      const cabo = Math.abs(Math.sin(fase * Math.PI * 1.0 * 1.5));
      const surco = Math.pow(cabo, 0.7);
      const hh = prof * (0.5 + 0.5 * surco) + (fib[i] - 0.5) * 0.08 + (fib2[i] - 0.5) * 0.1;
      c.h[i] = hh * (0.2 + 0.8 * cuerpo);
      let k = 0.5 + 0.55 * surco * prof + (fib[i] - 0.5) * 0.35 + (blot[i] - 0.5) * 0.3 + (bl[i] - 0.5) * 0.08;
      k *= 0.2 + 0.8 * cuerpo;
      par(oscuro, claro, clamp(0.35 + surco * 0.45 + (fib2[i] - 0.5) * 0.4), tmp);
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      const sc = suave(0.55, 0.8, suc[i]) * 0.5;
      r = mezcla(r, sucio[0], sc); g = mezcla(g, sucio[1], sc); b = mezcla(b, sucio[2], sc);
      poner(c, i, r, g, b);
      c.tinte[i] = 0.4;
      c.rug[i] = 0.95;
    }
    c.fuerzaNormal = 4.2; c.cav = [{ r: 1, f: 3 }, { r: 6, f: 2 }];
  },
};

const goma = {
  nombre: 'goma', grupo: 'otros', tam: 512, escala: 1,
  descripcion: 'Goma negra con tacos circulares antideslizantes (admite color), poro fino, desgaste y polvo.',
  material: { macro: [0.1, 0.02, 0.1], desgaste: 0.35 },
  generar(c) {
    const N = c.N, n = c.n;
    const rem = remaches(c, { cols: 12, filas: 12, radio: 14, desfaseX: 0.5, desfaseY: 0.5, alternar: true });
    const bl = blanco(N, 71), por = c.fbm(90, 3), blot = c.fbm(5, 5), roz = c.fbm(6, 5, { warp: { amp: 0.5, freq: 3 } }), polvo = c.fbm(8, 4);
    const base = col(0x2b2b2d);
    for (let i = 0; i < n; i++) {
      const t = rem.alt[i], m = rem.mask[i];
      c.h[i] = 0.2 + t * 0.7 + (por[i] - 0.5) * 0.04;
      const rz = suave(0.6, 0.8, roz[i]) * t;
      let k = 0.9 + (por[i] - 0.5) * 0.2 + (bl[i] - 0.5) * 0.1 + (blot[i] - 0.5) * 0.2 + rz * 0.35 + suave(0.6, 0.8, polvo[i]) * 0.2;
      poner(c, i, base[0] * k, base[1] * k, base[2] * k * 1.02);
      c.tinte[i] = 1;
      c.rug[i] = clamp(0.8 - rz * 0.25 + (por[i] - 0.5) * 0.2);
    }
    c.fuerzaNormal = 3.6; c.cav = [{ r: 2, f: 2.6 }, { r: 8, f: 1.4 }];
  },
};

const cristal = {
  nombre: 'cristal', grupo: 'otros', tam: 512, escala: 1,
  descripcion: 'Vidrio transparente (admite color) con ligeras manchas, huellas y arañazos que dispersan el reflejo.',
  material: { tipo: 'physical', macro: [0.0, 0.0, 0.04], desgaste: 0.15, transparente: true, doble: true, props: { opacity: 0.28, envMapIntensity: 1.6, ior: 1.5 } },
  generar(c) {
    const N = c.N, n = c.n;
    const hue = c.fbm(5, 5, { warp: { amp: 0.5, freq: 3 } }), hue2 = c.fbm(14, 4), ray = c.fbm([2, 200], 2, { exacto: true }), ray2 = c.fbm([200, 2], 2, { exacto: true }), bl = blanco(N, 73), polvo = c.fbm(7, 5);
    for (let i = 0; i < n; i++) {
      const huella = suave(0.58, 0.72, hue2[i] * 0.5 + hue[i] * 0.5);
      poner(c, i, 0.78, 0.86, 0.86);
      c.tinte[i] = 1;
      c.h[i] = 0.5 + (hue[i] - 0.5) * 0.01;
      c.met[i] = 0;
      c.rug[i] = clamp(0.03 + huella * 0.12 + Math.max(0, ray[i] - 0.6) * 0.9 + Math.max(0, ray2[i] - 0.6) * 0.9 + suave(0.65, 0.8, polvo[i]) * 0.12);
    }
    c.fuerzaNormal = 0.8; c.cav = [{ r: 2, f: 0.3 }];
  },
};

const agua = {
  nombre: 'agua', grupo: 'otros', tam: 512, escala: 4,
  descripcion: 'Agua en movimiento: oleaje suave con dos capas de normales animadas, reflejo especular y tinte verdoso (admite color).',
  material: { tipo: 'physical', macro: [0.0, 0.0, 0.0], desgaste: 0, anim: 'agua', transparente: true, normal: 1.4, props: { opacity: 0.9, envMapIntensity: 1.6, clearcoat: 0.0 } },
  generar(c) {
    const N = c.N, n = c.n;
    const o1 = c.fbm(6, 5, { warp: { amp: 0.4, freq: 3 } }), o2 = c.cresta(10, 4, { warp: { amp: 0.3, freq: 4 } }), o3 = c.fbm(24, 3), prof = c.fbm(3, 4), esp = c.fbm(8, 4);
    for (let i = 0; i < n; i++) {
      c.h[i] = o1[i] * 0.55 + o2[i] * 0.3 + o3[i] * 0.15;
      const p = prof[i];
      const r = 0.05 + p * 0.03, g = 0.2 + p * 0.1, b = 0.24 + p * 0.1;
      poner(c, i, r, g, b);
      c.tinte[i] = 1;
      c.met[i] = 0;
      c.rug[i] = clamp(0.04 + (esp[i] - 0.5) * 0.04 + Math.max(0, o3[i] - 0.6) * 0.12);
    }
    c.fuerzaNormal = 3.4; c.cav = [{ r: 1, f: 0.0 }];
  },
};

const neon = {
  nombre: 'neon', grupo: 'otros', tam: 512, escala: 1,
  descripcion: 'Tubo de neón emisivo: núcleo blanco, halo de color (`color`), parpadeo sutil. Úsalo con bloom.',
  material: { macro: [0.0, 0.0, 0.0], desgaste: 0, anim: 'neon', colorEmisivo: true, colorBase: 0xff2fb5, emisivo: 3.2, props: { envMapIntensity: 0.4 } },
  generar(c) {
    const N = c.N, n = c.n;
    const E = c.emision();
    const rui = c.fbm([2, 60], 2, { exacto: true }), ru2 = c.fbm(5, 3);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const v = (y / N) * 2 - 1;
      const nucleo = Math.pow(Math.max(0, 1 - Math.abs(v)), 0.65);
      const e = clamp(0.55 + nucleo * 0.6 + (rui[i] - 0.5) * 0.06 + (ru2[i] - 0.5) * 0.05);
      // el centro se acerca al blanco en el color final
      E[i * 3] = e; E[i * 3 + 1] = e; E[i * 3 + 2] = e;
      poner(c, i, 0.02, 0.02, 0.02);
      c.tinte[i] = 0;
      c.h[i] = 0.5 + nucleo * 0.4;
      c.rug[i] = 0.25;
    }
    c.fuerzaNormal = 1.5; c.cav = [{ r: 2, f: 0.5 }];
  },
};

const pantalla = {
  nombre: 'pantalla', grupo: 'otros', tam: 512, escala: 1,
  descripcion: 'Pantalla/holograma: interfaz de rejilla, gráficas y bloques de texto con líneas de barrido animadas (`color` = tono).',
  material: { macro: [0.0, 0.0, 0.0], desgaste: 0, anim: 'pantalla', colorEmisivo: true, colorBase: 0x33e0ff, emisivo: 2.2, props: { envMapIntensity: 0.6 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const E = c.emision();
    const rng = crearRng(c.semilla * 13 + 5);
    const buf = new Float32Array(n);
    const rect = (x0, y0, w, h, v, hueco = false) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y % N) * N + (x % N); if (hueco && x > x0 + 1 && x < x0 + w - 2 && y > y0 + 1 && y < y0 + h - 2) continue; buf[i] = Math.max(buf[i], v); } };
    // marco y rejilla
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const gx = x % px(32) < 1.2, gy = y % px(32) < 1.2;
      buf[i] = (gx || gy) ? 0.14 : 0.02;
      if (x < px(5) || y < px(5) || x > N - px(5) || y > N - px(5)) buf[i] = 0.7;
    }
    // bloques de texto
    for (let k = 0; k < 11; k++) {
      const y0 = px(36 + k * 22), x0 = px(30), ancho = px(60 + rng() * 140);
      rect(Math.round(x0), Math.round(y0), Math.round(ancho), Math.round(px(5)), 0.6 + rng() * 0.3);
    }
    // gráfica de barras
    for (let k = 0; k < 14; k++) { const h = px(20 + rng() * 120), w = px(14); rect(Math.round(px(280 + k * 16)), Math.round(px(250) - h), Math.round(w), Math.round(h), 0.55 + rng() * 0.4); }
    // círculo radar
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - px(150), dy = y - px(390), r = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(r - px(80)) < 1.6 || Math.abs(r - px(50)) < 1.2 || Math.abs(r - px(20)) < 1.2) buf[y * N + x] = Math.max(buf[y * N + x], 0.8);
      if ((Math.abs(dx) < 1 || Math.abs(dy) < 1) && r < px(80)) buf[y * N + x] = Math.max(buf[y * N + x], 0.4);
      const ang = Math.atan2(dy, dx); if (r < px(80) && Math.abs(ang - 0.7) < 0.05) buf[y * N + x] = Math.max(buf[y * N + x], 0.9);
    }
    rect(Math.round(px(300)), Math.round(px(330)), Math.round(px(170)), Math.round(px(110)), 0.8, true);
    for (let k = 0; k < 40; k++) { const x = Math.round(px(310 + rng() * 150)), y = Math.round(px(340 + rng() * 90)); rect(x, y, 3, 3, 0.9); }
    const ru = c.fbm(80, 2);
    for (let i = 0; i < n; i++) {
      const e = clamp(buf[i] * (0.9 + (ru[i] - 0.5) * 0.2));
      E[i * 3] = e; E[i * 3 + 1] = e; E[i * 3 + 2] = e;
      poner(c, i, 0.02, 0.03, 0.035);
      c.tinte[i] = 0;
      c.h[i] = 0.5 + e * 0.03;
      c.rug[i] = 0.18; c.met[i] = 0.1;
    }
    c.fuerzaNormal = 1; c.cav = [{ r: 2, f: 0.3 }];
  },
};

const rayas_peligro = {
  nombre: 'rayas_peligro', grupo: 'otros', tam: 512, escala: 1,
  descripcion: 'Franjas diagonales amarillas y negras de señalización, con pintura gastada, golpes y óxido.',
  material: { macro: [0.14, 0.04, 0.1], desgaste: 0.45 },
  generar(c) {
    const N = c.N, n = c.n;
    const bl = blanco(N, 75), roz = c.fbm(7, 6, { warp: { amp: 0.6, freq: 3 } }), roz2 = c.fbm(26, 4), ray = c.fbm([4, 100], 2, { exacto: true }), ox = c.fbm(8, 5), fino = c.fbm(70, 2), suc = c.fbm(4, 5);
    const am = col(0xf0b800), ne = col(0x1a1a1b), metal = col(0x7d8084), orin = col(0x8a4220);
    const bandas = 8;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const f = ((x + y) / N) * bandas, fr = f - Math.floor(f);
      const dist = Math.abs(fr - 0.5) ;
      const suaveBorde = suave(0.5, 0.485, dist - 0.0 + 0.0);
      const amarillo = fr < 0.5 ? 1 : 0;
      const e = 1 - suave(0.0, 0.012, Math.min(Math.abs(fr - 0.5), fr, 1 - fr));
      const amr = amarillo * (1 - e * 0.0);
      const gast = suave(0.6, 0.66, roz[i] + (roz2[i] - 0.5) * 0.2 + (bl[i] - 0.5) * 0.04);
      const pm = 1 - gast;
      let r = mezcla(ne[0], am[0], amr), g = mezcla(ne[1], am[1], amr), b = mezcla(ne[2], am[2], amr);
      const kk = 0.85 + (fino[i] - 0.5) * 0.2 - (1 - suc[i]) * 0.1;
      r *= kk; g *= kk; b *= kk;
      const om = suave(0.6, 0.72, ox[i]) * gast;
      const sk = 0.55 + (ray[i] - 0.5) * 0.3 + (fino[i] - 0.5) * 0.3;
      r = mezcla(metal[0] * sk, r, pm); g = mezcla(metal[1] * sk, g, pm); b = mezcla(metal[2] * sk, b, pm);
      r = mezcla(r, orin[0] * (0.7 + fino[i] * 0.6), om); g = mezcla(g, orin[1] * (0.7 + fino[i] * 0.6), om); b = mezcla(b, orin[2] * (0.7 + fino[i] * 0.6), om);
      poner(c, i, r, g, b);
      c.tinte[i] = 0;
      c.h[i] = 0.55 + pm * 0.05 + (fino[i] - 0.5) * 0.03 - om * 0.02;
      c.met[i] = gast * (1 - om) * 0.9;
      c.rug[i] = clamp(mezcla(0.4 + (ray[i] - 0.5) * 0.3, 0.55 + (fino[i] - 0.5) * 0.15, pm) * (1 - om) + om * 0.9);
    }
    c.fuerzaNormal = 2.6; c.cav = [{ r: 2, f: 2 }, { r: 8, f: 1.2 }];
  },
};

const madera_lacada = {
  nombre: 'madera_lacada', grupo: 'otros', tam: 512, escala: 1.2,
  descripcion: 'Madera noble lacada con barniz brillante (admite color): veta fina, paneles con junta y reflejo de laca.',
  material: { tipo: 'physical', macro: [0.1, 0.05, 0.06], desgaste: 0.2, props: { clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 } },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const D = c.despiece({ filas: 1, piezas: 4, wVar: 0.1, desfase: 0, soloX: true });
    const V = maderaVeta(c, D, { frecAnillo: 30, anillos: 1, nudos: 0.0, vertical: true, poros: 0.8 });
    const bl = blanco(N, 77), ray = c.fbm([3, 140], 2, { exacto: true }), blot = c.fbm(4, 5), roz = c.fbm(6, 5);
    const oscuro = col(0x3c1a0c), claro = col(0x8a4a22);
    for (let i = 0; i < n; i++) {
      const d = D.d[i], m = suave(px(0.8), px(2), d);
      par(oscuro, claro, clamp(0.2 + D.id[i] * 0.5 + (blot[i] - 0.5) * 0.3), tmp);
      let k = 0.5 + V.grano[i] * 0.9;
      k *= 0.5 + 0.5 * m;
      poner(c, i, tmp[0] * k, tmp[1] * k, tmp[2] * k);
      c.tinte[i] = 0.7;
      c.h[i] = mezcla(0.2, 0.6 + (V.poro[i] - 0.5) * 0.03, m);
      c.rug[i] = clamp(0.18 + Math.max(0, ray[i] - 0.58) * 0.9 + suave(0.6, 0.8, roz[i]) * 0.12);
    }
    c.fuerzaNormal = 1.4; c.cav = [{ r: 2, f: 1.5 }, { r: 6, f: 0.8 }];
  },
};

const marmol = {
  nombre: 'marmol', grupo: 'otros', tam: 512, escala: 1.6,
  descripcion: 'Mármol pulido (admite color): fondo lechoso, vetas grises y doradas ramificadas, poco poro y mucho brillo.',
  material: { macro: [0.06, 0.03, 0.04], desgaste: 0.1, props: { envMapIntensity: 1.2 } },
  generar(c) {
    const N = c.N, n = c.n;
    const nube = c.fbm(3, 6, { warp: { amp: 0.8, freq: 2 } }), v1 = c.fbm(4, 6, { warp: { amp: 1.2, freq: 3 } }), v2 = c.fbm(6, 6, { warp: { amp: 1.0, freq: 4 } }), fino = c.fbm(60, 2), bl = blanco(N, 79), pul = c.fbm(5, 4);
    const base = col(0xeeeae0), gris = col(0x6a6a72), oro = col(0xa88a4a);
    for (let i = 0; i < n; i++) {
      // vetas: líneas finas donde el ruido deformado cruza 0.5
      const a = Math.abs(v1[i] - 0.5), b = Math.abs(v2[i] - 0.5);
      const ve1 = 1 - suave(0.0, 0.028 + nube[i] * 0.02, a), ve2 = 1 - suave(0.0, 0.012, b);
      const hal = 1 - suave(0.0, 0.1, a);
      let k = 0.96 - (nube[i] - 0.5) * 0.18 + (fino[i] - 0.5) * 0.03 - hal * 0.07;
      let r = base[0] * k, g = base[1] * k, b2 = base[2] * k;
      r = mezcla(r, gris[0], ve1 * 0.75); g = mezcla(g, gris[1], ve1 * 0.75); b2 = mezcla(b2, gris[2], ve1 * 0.75);
      r = mezcla(r, oro[0], ve2 * 0.5); g = mezcla(g, oro[1], ve2 * 0.5); b2 = mezcla(b2, oro[2], ve2 * 0.5);
      poner(c, i, r, g, b2);
      c.tinte[i] = 1;
      c.h[i] = 0.5 + (fino[i] - 0.5) * 0.015 - ve1 * 0.01;
      c.rug[i] = clamp(0.1 + (pul[i] - 0.5) * 0.1 + (fino[i] - 0.5) * 0.06 + ve1 * 0.03);
    }
    c.fuerzaNormal = 1; c.cav = [{ r: 2, f: 0.8 }];
  },
};

const yeso = {
  nombre: 'yeso', grupo: 'otros', tam: 512, escala: 2,
  descripcion: 'Yeso o escayola (admite color): enlucido a la llana con remolinos suaves, pequeñas fisuras y roces.',
  material: { macro: [0.12, 0.04, 0.06], desgaste: 0.3 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const lla = c.fbm(7, 5, { warp: { amp: 1.3, freq: 3 } }), lla2 = c.cresta(4, 3, { warp: { amp: 0.9, freq: 2 } }), fino = c.fbm(80, 3), bl = blanco(N, 81), man = c.fbm(3, 5, { warp: { amp: 0.5, freq: 2 } }), hol = c.fbm([16, 3], 3, { exacto: true });
    const base = col(0xeee8dc);
    const fis = c.worley(5, { jit: 0.9, warp: { amp: 0.5, freq: 5 } });
    for (let i = 0; i < n; i++) {
      const f = (1 - suave(0.0, 0.008, fis.borde[i])) * suave(0.5, 0.7, man[i]);
      c.h[i] = 0.5 + (lla[i] - 0.5) * 0.3 + (lla2[i] - 0.5) * 0.1 + (fino[i] - 0.5) * 0.04 - f * 0.12;
      let k = 0.96 + (lla[i] - 0.5) * 0.12 + (man[i] - 0.5) * 0.1 + (fino[i] - 0.5) * 0.04 + (bl[i] - 0.5) * 0.02 - f * 0.4 - suave(0.6, 0.8, hol[i]) * 0.04;
      poner(c, i, base[0] * k, base[1] * k, base[2] * k);
      c.tinte[i] = 1;
      c.rug[i] = clamp(0.88 + (fino[i] - 0.5) * 0.1 - suave(0.6, 0.8, lla2[i]) * 0.1);
    }
    c.fuerzaNormal = 2.4; c.cav = [{ r: 2, f: 2 }, { r: 8, f: 1.2 }];
  },
};

const alfombra_roja = {
  nombre: 'alfombra_roja', grupo: 'otros', tam: 512, escala: 1.4,
  descripcion: 'Alfombra de pelo corto (admite color): rojo profundo, dibujo de rombos tejido, pelo aplastado por el paso.',
  material: { macro: [0.14, 0.04, 0.06], desgaste: 0.3 },
  generar(c) {
    const N = c.N, n = c.n, px = (v) => c.px(v);
    const pelo = c.fbm([160, 140], 2, { exacto: true }), pelo2 = c.fbm(60, 3), blot = c.fbm(4, 5), pas = c.fbm([3, 5], 4, { warp: { amp: 0.5, freq: 2 } }), bl = blanco(N, 83), sombra = c.fbm(9, 4);
    const base = col(0x9c1a22), osc = col(0x5e0e14), oro = col(0xc8a24a);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const u = (x / N) * 4, v = (y / N) * 4;
      const fx = u - Math.floor(u) - 0.5, fy = v - Math.floor(v) - 0.5;
      const rombo = Math.abs(fx) + Math.abs(fy);
      const lin = 1 - suave(0.0, 0.035, Math.abs(rombo - 0.36));
      const centro = 1 - suave(0.0, 0.05, rombo - 0.12);
      const dib = Math.max(lin, centro * 0.8);
      const aplast = suave(0.55, 0.8, pas[i]);
      c.h[i] = 0.5 + (pelo[i] - 0.5) * 0.25 * (1 - aplast * 0.6) + (pelo2[i] - 0.5) * 0.1 - dib * 0.02;
      par(base, osc, clamp((blot[i] - 0.4) * 0.8 + aplast * 0.2), tmp);
      let k = 0.85 + (pelo[i] - 0.5) * 0.5 + (pelo2[i] - 0.5) * 0.2 + (bl[i] - 0.5) * 0.12 + aplast * 0.12;
      let r = tmp[0] * k, g = tmp[1] * k, b = tmp[2] * k;
      r = mezcla(r, oro[0] * k, dib * 0.85); g = mezcla(g, oro[1] * k, dib * 0.85); b = mezcla(b, oro[2] * k, dib * 0.85);
      poner(c, i, r, g, b);
      c.tinte[i] = 1 - dib * 0.9;
      c.rug[i] = clamp(0.96 - aplast * 0.1);
    }
    c.fuerzaNormal = 2.4; c.cav = [{ r: 1, f: 3 }, { r: 6, f: 1.6 }];
  },
};

const nieve_ceniza = {
  nombre: 'nieve_ceniza', grupo: 'otros', tam: 512, escala: 2.4,
  descripcion: 'Nieve virgen o ceniza (con `color` gris oscuro): ondulaciones suaves, destellos de cristal y huellas leves.',
  material: { macro: [0.08, 0.03, 0.05], desgaste: 0.1 },
  generar(c) {
    const N = c.N, n = c.n;
    const o1 = c.fbm(4, 6, { warp: { amp: 0.8, freq: 3 } }), o2 = c.fbm(14, 4), bl = blanco(N, 85), bl2 = blanco(N, 86), fino = c.fbm(90, 2), hu = c.worley(18, { jit: 1 });
    const base = col(0xf2f5fa);
    for (let i = 0; i < n; i++) {
      const bump = 1 - suave(0, 0.35, hu.f1[i]);
      c.h[i] = 0.5 + (o1[i] - 0.5) * 0.35 + (o2[i] - 0.5) * 0.12 + (fino[i] - 0.5) * 0.03 + bump * 0.04;
      let k = 0.92 + (o1[i] - 0.5) * 0.12 + (fino[i] - 0.5) * 0.04 + (bl[i] - 0.5) * 0.02;
      if (bl2[i] > 0.997) k *= 1.5;
      poner(c, i, base[0] * k, base[1] * k, Math.min(1, base[2] * k * 1.02));
      c.tinte[i] = 1;
      c.rug[i] = clamp(0.78 + (fino[i] - 0.5) * 0.1 - (bl2[i] > 0.997 ? 0.4 : 0));
    }
    c.fuerzaNormal = 2.4; c.cav = [{ r: 2, f: 1.6 }, { r: 10, f: 1 }];
  },
};

export default [saco_arena, lona, cuero, tela, cuerda, goma, cristal, agua, neon, pantalla, rayas_peligro, madera_lacada, marmol, yeso, alfombra_roja, nieve_ceniza];
