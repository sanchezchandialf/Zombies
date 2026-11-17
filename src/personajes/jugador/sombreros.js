// Tocados y gafas por era (se montan en el hueso 'cabeza'; centro del cráneo en y = 0,125).
import { mat } from './mat.js';
const H = 'cabeza';
const PI = Math.PI;

export function chaco(c, col, ribete, pluma) {
  const t = mat('tela', col), l = mat('cuero', 0x16110e), br = mat('laton', 0xc9a03c), r = mat('tela', ribete);
  c.cil(H, t, 0.088, 0.104, 0.2, [0, 0.31, -0.005]);
  c.cil(H, br, 0.1, 0.1, 0.012, [0, 0.4, -0.005]);               // reborde superior
  c.cil(H, t, 0.098, 0.098, 0.014, [0, 0.4, -0.005]);
  c.cil(H, r, 0.106, 0.106, 0.018, [0, 0.215, -0.005]);          // cinta inferior
  c.esf(H, br, [0.04, 0.045, 0.01], [0, 0.31, 0.098]);           // placa
  c.abierto(H, l, 0.108, 0.108, 0.012, -0.9, 1.8, [0, 0.205, 0.03], null, [1, 1, 1.1]); // visera
  c.caja(H, l, [0.19, 0.012, 0.06], [0, 0.208, 0.125], [0.35, 0, 0], 0.005);
  c.cil(H, br, 0.01, 0.01, 0.07, [0, 0.43, -0.005]);
  c.esf(H, mat('tela', pluma), [0.026, 0.06, 0.026], [0, 0.49, -0.005]);   // penacho
}
export function tricornio(c, col, ribete) {
  const t = mat('tela', col), l = mat('laton', 0xc9a03c), r = mat('tela', ribete);
  c.cil(H, t, 0.08, 0.098, 0.075, [0, 0.265, 0]);
  for (let i = 0; i < 3; i++) {
    const a = i * PI * 2 / 3 + PI;  // 0 = detrás
    const px = Math.sin(a) * 0.1, pz = Math.cos(a) * 0.1;
    c.caja(H, t, [0.21, 0.014, 0.115], [px, 0.232, pz], [-Math.cos(a) * 0.45, a, Math.sin(a) * 0.45 * 0], 0.006);
    c.caja(H, r, [0.215, 0.016, 0.012], [px * 1.55, 0.255, pz * 1.55], [-Math.cos(a) * 0.45, a, 0], 0.004);
  }
  c.cil(H, l, 0.085, 0.085, 0.01, [0, 0.296, 0]);
  c.esf(H, l, [0.012, 0.012, 0.012], [0, 0.33, 0.04]);
}
export function alaAncha(c, col, banda, caida = 0.12) {
  const f = mat('cuero', col), b = mat('tela', banda);
  c.cil(H, f, 0.075, 0.095, 0.12, [0, 0.28, 0]);
  c.esf(H, f, [0.06, 0.012, 0.075], [0, 0.34, 0.02]);
  c.cil(H, f, 0.205, 0.205, 0.012, [0, 0.225, 0.01], [-0.06, 0, 0], [1, 1, 1.08]);
  c.toro(H, f, 0.199, 0.009, [0, 0.226, 0.01], [PI / 2 - 0.06, 0, 0], [1, 1.08, 1]);
  c.cil(H, b, 0.097, 0.099, 0.03, [0, 0.245, 0]);
  c.caja(H, mat('laton', 0xc9a03c), [0.03, 0.026, 0.01], [0, 0.245, 0.1], null, 0.004);
  c.cil(H, f, 0.075, 0.075, 0.02, [0, 0.33, 0]);
}
export function bombin(c, col, banda) {
  const f = mat('tela', col), b = mat('cuero', banda);
  c.domo(H, f, [0.108, 0.1, 0.12], [0, 0.205, 0]);
  c.cil(H, f, 0.146, 0.146, 0.01, [0, 0.205, 0], null, [1, 1, 1.1]);
  c.cil(H, b, 0.109, 0.11, 0.022, [0, 0.215, 0], null, [1, 1, 1.1]);
}
export function gorraVisera(c, col, visera) {
  const f = mat('tela', col), v = mat('cuero', visera);
  c.domo(H, f, [0.108, 0.098, 0.12], [0, 0.2, -0.004], [-0.12, 0, 0]);
  c.caja(H, v, [0.15, 0.01, 0.075], [0, 0.205, 0.145], [0.25, 0, 0], 0.004);
  c.esf(H, f, [0.012, 0.012, 0.012], [0, 0.3, -0.01]);
}
export function boina(c, col) {
  const f = mat('tela', col);
  c.esf(H, f, [0.135, 0.045, 0.13], [0.025, 0.245, -0.005], [0.05, 0, -0.18]);
  c.cil(H, f, 0.112, 0.112, 0.02, [0, 0.213, 0], null, [1, 1, 1.05]);
  c.cil(H, f, 0.01, 0.012, 0.025, [0.03, 0.296, -0.005]);
}
export function tupe(c, col) {
  const f = mat('pelo', col);
  c.domo(H, f, [0.108, 0.11, 0.12], [0, 0.138, -0.004], [-0.1, 0, 0]);
  c.esf(H, f, [0.09, 0.07, 0.07], [0, 0.245, 0.06], [-0.25, 0, 0]);
  c.caja(H, f, [0.16, 0.04, 0.06], [0, 0.23, 0.095], [0.4, 0, 0], 0.02);
  for (const s of [-1, 1]) c.cap(H, f, 0.022, 0.07, [s * 0.1, 0.14, 0.015], [0, 0, 0]);
}
export function pañuelo(c, col) {
  const f = mat('tela', col);
  c.domo(H, f, [0.11, 0.108, 0.119], [0, 0.145, -0.005], [-0.2, 0, 0]);
  c.esf(H, f, [0.034, 0.03, 0.03], [0.04, 0.12, -0.13]);
  c.cono(H, f, 0.028, 0.1, [0.045, 0.06, -0.15], [PI - 0.4, 0, 0.2]);
  c.cono(H, f, 0.024, 0.09, [-0.01, 0.07, -0.155], [PI - 0.3, 0, -0.2]);
}
export function bandana(c, col) {
  const f = mat('tela', col);
  c.cil(H, f, 0.112, 0.112, 0.035, [0, 0.19, -0.004], [-0.1, 0, 0], [1, 1, 1.07]);
  c.cono(H, f, 0.025, 0.09, [0.02, 0.17, -0.14], [PI - 0.5, 0, 0.2]);
}
/** Cascos militares. tipo: brodie | adrian | stahl | acero */
export function casco(c, tipo, col, A) {
  const m = mat('pintura', col), cu = mat('cuero', 0x2a1e14), mt = mat('metal', 0x505050);
  if (tipo === 'brodie') {
    c.domo(H, m, [0.118, 0.092, 0.126], [0, 0.185, 0]);
    c.abierto(H, m, 0.168, 0.12, 0.014, 0, PI * 2, [0, 0.188, 0.0], [0.04, 0, 0], [1, 1, 1.05]);
    c.cil(H, m, 0.168, 0.168, 0.006, [0, 0.187, 0], null, [1, 1, 1.05]);
    c.toro(H, mt, 0.12, 0.005, [0, 0.194, 0], [PI / 2, 0, 0], [1, 1.04, 1]);
  } else if (tipo === 'adrian') {
    c.domo(H, m, [0.116, 0.115, 0.128], [0, 0.17, 0]);
    c.caja(H, m, [0.02, 0.025, 0.25], [0, 0.285, 0], null, 0.01);
    c.caja(H, m, [0.15, 0.012, 0.07], [0, 0.205, 0.128], [0.2, 0, 0], 0.004);
    c.caja(H, m, [0.16, 0.025, 0.06], [0, 0.17, -0.138], [-0.3, 0, 0], 0.01);
  } else if (tipo === 'stahl') {
    c.domo(H, m, [0.125, 0.11, 0.135], [0, 0.178, -0.008]);
    c.cil(H, m, 0.122, 0.128, 0.04, [0, 0.185, -0.008], null, [1, 1, 1.05]);
    c.caja(H, m, [0.28, 0.02, 0.1], [0, 0.088, -0.12], [0.5, 0, 0], 0.008);       // cubrenuca
    c.caja(H, m, [0.2, 0.02, 0.07], [0, 0.205, 0.13], [0.22, 0, 0], 0.008);        // visera
    for (const s of [-1, 1]) c.cil(H, mt, 0.012, 0.012, 0.03, [s * 0.1, 0.19, 0.0], [0, 0, PI / 2]);
  } else { // acero genérico con cruz opcional
    c.domo(H, m, [0.117, 0.098, 0.126], [0, 0.187, 0]);
    c.abierto(H, m, 0.155, 0.12, 0.014, 0, PI * 2, [0, 0.19, 0], [0.04, 0, 0], [1, 1, 1.05]);
    c.cil(H, m, 0.155, 0.155, 0.006, [0, 0.188, 0], null, [1, 1, 1.05]);
  }
  c.caja(H, cu, [0.17, 0.006, 0.014], [0, 0.1, 0.0], null, 0.002);
  if (A != null) c.caja(H, mat('blanco', A), [0.05, 0.05, 0.006], [0, 0.222, 0.122], [0.33, 0, 0], 0.004);
}
export function cascoTactico(c, col, A, visor = true, aud = true) {
  const m = mat('pintura', col), n = mat('goma', 0x15171a), lente = mat('cristal', 0x1a2a38), l = mat('luz', A);
  c.domo(H, m, [0.119, 0.1, 0.13], [0, 0.178, -0.006]);
  c.cil(H, m, 0.118, 0.123, 0.04, [0, 0.176, -0.006], null, [1, 1, 1.08]);
  c.caja(H, n, [0.05, 0.05, 0.03], [0, 0.245, 0.1], null, 0.01);                // soporte NVG
  c.caja(H, m, [0.15, 0.02, 0.06], [0, 0.248, 0.02], null, 0.008);              // raíl
  if (visor) { c.abierto(H, lente, 0.125, 0.125, 0.07, -1.0, 2.0, [0, 0.142, 0.0], null, [1, 1, 1.1]); c.caja(H, n, [0.14, 0.012, 0.03], [0, 0.185, 0.128], null, 0.004); }
  if (aud) for (const s of [-1, 1]) { c.cil(H, n, 0.045, 0.045, 0.03, [s * 0.116, 0.12, 0], [0, 0, PI / 2]); c.cil(H, l, 0.012, 0.012, 0.032, [s * 0.12, 0.12, 0.0], [0, 0, PI / 2]); c.cap(H, n, 0.005, 0.07, [s * 0.1, 0.07, 0.06], [-1.0, 0, s * 0.3]); }
}
export function cascoObra(c, col) {
  const m = mat('pintura', col), n = mat('goma', 0x1a1a1a), l = mat('luz', 0xffffcc);
  c.domo(H, m, [0.12, 0.105, 0.13], [0, 0.18, 0]);
  c.caja(H, m, [0.035, 0.02, 0.24], [0, 0.285, 0], null, 0.008);
  c.abierto(H, m, 0.138, 0.125, 0.012, -1.1, 2.2, [0, 0.19, 0.04], [0.05, 0, 0], [1, 1, 1.08]);
  c.cil(H, n, 0.03, 0.03, 0.04, [0, 0.235, 0.123], [PI / 2 - 0.2, 0, 0]); c.cil(H, l, 0.022, 0.022, 0.01, [0, 0.238, 0.147], [PI / 2 - 0.2, 0, 0]);
}
export function cascoEOD(c, col, A) {
  const m = mat('pintura', col), n = mat('goma', 0x101214), lente = mat('cristal', 0x203040), l = mat('luz', A);
  c.esf(H, m, [0.15, 0.15, 0.158], [0, 0.135, -0.01]);
  c.caja(H, lente, [0.17, 0.065, 0.06], [0, 0.155, 0.125], [-0.05, 0, 0], 0.02);
  c.caja(H, n, [0.19, 0.012, 0.07], [0, 0.205, 0.13], [-0.1, 0, 0], 0.005);
  c.caja(H, l, [0.1, 0.008, 0.01], [0, 0.125, 0.15], null, 0.003);
  c.caja(H, m, [0.03, 0.03, 0.2], [0, 0.285, -0.02], null, 0.012);
  c.cil(H, m, 0.1, 0.12, 0.09, [0, 0.01, 0.0]);
}
export function cascoFuturo(c, col, A, tipo = 0) {
  const m = mat('pintura', col), n = mat('metal', 0x15181d), l = mat('luz', A), lente = mat('cristal', A);
  c.domo(H, m, [0.119, 0.105, 0.13], [0, 0.18, -0.006]);
  c.cil(H, m, 0.118, 0.123, 0.045, [0, 0.172, -0.006], null, [1, 1, 1.08]);
  c.caja(H, l, [0.012, 0.01, 0.2], [0, 0.288 - 0.0, -0.01], null, 0.003);
  for (const s of [-1, 1]) { c.caja(H, n, [0.04, 0.07, 0.09], [s * 0.118, 0.13, -0.01], null, 0.015); c.caja(H, l, [0.006, 0.05, 0.05], [s * 0.141, 0.13, -0.01], null, 0.002); }
  if (tipo === 0) { c.abierto(H, lente, 0.124, 0.124, 0.06, -1.05, 2.1, [0, 0.146, 0.0], null, [1, 1, 1.1]); c.caja(H, l, [0.14, 0.006, 0.006], [0, 0.178, 0.133], null, 0.002); }
  else if (tipo === 1) { c.cil(H, l, 0.03, 0.03, 0.01, [0.07, 0.15, 0.125], [PI / 2, 0, 0]); c.caja(H, lente, [0.2, 0.04, 0.02], [0, 0.15, 0.123], null, 0.01); }
  else { c.abierto(H, n, 0.126, 0.126, 0.14, -1.2, 2.4, [0, 0.11, 0.0], null, [1, 1, 1.1]); c.caja(H, lente, [0.17, 0.05, 0.02], [0, 0.145, 0.136], null, 0.012); }
}
export function capucha(c, col, forro) {
  const f = mat('tela', col, true), i = mat('tela', forro);
  c.domo(H, f, [0.133, 0.14, 0.142], [0, 0.115, -0.025], [-0.28, 0, 0]);
  c.abierto(H, f, 0.135, 0.136, 0.15, PI * 0.4, PI * 1.2, [0, 0.09, -0.02], null, [1, 1, 1.04]);
  c.cono(H, f, 0.075, 0.2, [0, 0.19, -0.14], [-1.9, 0, 0]);
  for (const s of [-1, 1]) c.esf(H, f, [0.035, 0.1, 0.1], [s * 0.118, 0.1, 0.01]);
  c.toro(H, i, 0.112, 0.012, [0, 0.175, 0.04], [PI / 2 - 0.3, 0, 0], [1, 1.05, 1.0]);
}
export function gafasCuero(c, col, lente, enFrente = true) {
  const cu = mat('cuero', col), v = mat('cristal', lente), mt = mat('metal', 0x606060);
  const y = enFrente ? 0.196 : 0.135, z = enFrente ? 0.1 : 0.112, r = enFrente ? -0.3 : 0;
  c.toro(H, cu, 0.109, 0.011, [0, y - 0.01, -0.005], [PI / 2 + (enFrente ? 0.05 : 0), 0, 0], [1, 1.08, 1]);
  for (const s of [-1, 1]) { c.cil(H, mt, 0.034, 0.034, 0.03, [s * 0.04, y, z], [PI / 2 + r, 0, 0]); c.cil(H, v, 0.028, 0.028, 0.034, [s * 0.04, y, z + 0.004], [PI / 2 + r, 0, 0]); }
  c.caja(H, cu, [0.02, 0.014, 0.03], [0, y, z - 0.005], null, 0.005);
}
export function gafasAviador(c, col, lente) {
  const mt = mat('laton', col), v = mat('cristal', lente);
  for (const s of [-1, 1]) {
    c.esf(H, v, [0.036, 0.034, 0.008], [s * 0.043, 0.125, 0.118], [0.1, s * 0.15, 0]);
    c.toro(H, mt, 0.035, 0.0045, [s * 0.043, 0.125, 0.119], [0.1, s * 0.15, 0], [1, 0.95, 1]);
    c.cap(H, mt, 0.004, 0.09, [s * 0.108, 0.13, 0.06], [PI / 2, 0, 0]);
  }
  c.cap(H, mt, 0.004, 0.02, [0, 0.135, 0.122], [0, 0, PI / 2]);
}
export function gafasLentes(c, col) {
  const mt = mat('metal', col), v = mat('cristal', 0xaad0ee);
  for (const s of [-1, 1]) { c.toro(H, mt, 0.027, 0.004, [s * 0.04, 0.135, 0.116], [0, 0, 0]); c.cil(H, v, 0.026, 0.026, 0.004, [s * 0.04, 0.135, 0.117], [PI / 2, 0, 0]); c.cap(H, mt, 0.003, 0.09, [s * 0.1, 0.14, 0.065], [PI / 2, 0, 0]); }
  c.caja(H, mt, [0.02, 0.005, 0.005], [0, 0.14, 0.117], null, 0.002);
}
export function visorHolo(c, A, tipo = 0) {
  const l = mat('luz', A), v = mat('cristal', A), n = mat('metal', 0x1a1c20);
  if (tipo === 0) {
    c.abierto(H, v, 0.12, 0.12, 0.05, -1.0, 2.0, [0, 0.14, 0], null, [1, 1, 1.1]);
    c.abierto(H, l, 0.121, 0.121, 0.006, -1.0, 2.0, [0, 0.168, 0], null, [1, 1, 1.1]);
  } else {
    c.toro(H, n, 0.11, 0.008, [0, 0.2, -0.005], [PI / 2, 0, 0], [1, 1.08, 1]);
    c.caja(H, v, [0.19, 0.045, 0.01], [0, 0.14, 0.125], [0.0, 0, 0], 0.01);
    c.caja(H, l, [0.19, 0.005, 0.012], [0, 0.164, 0.127], null, 0.002);
    c.cap(H, n, 0.005, 0.06, [0.116, 0.16, 0.06], [PI / 2, 0, 0]);
  }
}
export function mascaraGas(c, col, puesta = false, y = 0) {
  const g = mat('goma', col), v = mat('cristal', 0x889a70), mt = mat('metal', 0x555555);
  if (puesta) {
    c.esf(H, g, [0.1, 0.095, 0.075], [0, 0.098, 0.062]);
    for (const s of [-1, 1]) { c.cil(H, mt, 0.032, 0.032, 0.012, [s * 0.043, 0.125, 0.127], [PI / 2, 0, 0]); c.cil(H, v, 0.026, 0.026, 0.014, [s * 0.043, 0.125, 0.129], [PI / 2, 0, 0]); }
    c.cil(H, mt, 0.032, 0.036, 0.075, [0, 0.055, 0.13], [PI / 2, 0, 0]);
  }
}
