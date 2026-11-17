// Era 0 · Pólvora (1800–1849). Cada fábrica dibuja el arma en el Constructor `b` y devuelve sus metadatos.
// Ejes: cañón a +Z, empuñadura (mano derecha) en el origen, +Y arriba. Perfiles de lado = pares [z, y].
import { canon, abrazaderas, baqueta, guardamonte, llaveChispa } from './piezas.js';

const PI = Math.PI;

/** Placa lateral de latón (platina izquierda), serpentina. */
function placaLateral(b, x, z, y, esc = 1) {
  b.perfil('laton', [[-0.05, 0.0], [-0.02, 0.012], [0.03, 0.008], [0.055, 0.0], [0.03, -0.012], [-0.02, -0.008]].map(([a, c]) => [a * esc, c * esc]), 0.004, [x, y, z], { suave: 0.004, bisel: 0.001 });
}

/** Culata de fusil largo con el contorno tallado (perfil de lado). */
function culataLarga(b, mat, { z0 = -0.385, zf = 0.72, yTop = 0.078, w = 0.036 } = {}) {
  b.perfil(mat, [
    [z0, 0.098], [z0 + 0.085, 0.07], [-0.15, 0.067], [-0.03, 0.078], [zf, yTop], [zf, yTop - 0.03],
    [0.12, 0.048], [0.04, 0.02], [-0.02, -0.03], [-0.09, -0.036], [-0.18, -0.02], [-0.26, -0.045], [z0, -0.088],
  ], w, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  // carrillera y molduras del cajón (relieve tallado)
  for (const s of [-1, 1]) {
    b.perfil(mat, [[-0.3, 0.07], [-0.16, 0.068], [-0.15, 0.03], [-0.25, 0.01], [-0.33, 0.03]], 0.004, [s * 0.0185, 0, 0], { suave: 0.012, bisel: 0.001 });
    b.perfil(mat, [[-0.07, 0.07], [0.0, 0.082], [0.1, 0.074], [0.02, 0.06]], 0.004, [s * 0.0185, 0, 0], { suave: 0.006, bisel: 0.001 });
  }
}

function mosquete(b) {
  culataLarga(b, 'nogal');
  // cañón: culata octogonal + caña redonda ahusada
  canon(b, { mat: 'acero', y: 0.09, z0: -0.04, z1: 0.2, r: 0.0172, oct: true, ánima: false });
  canon(b, { mat: 'acero', y: 0.09, z0: 0.2, z1: 0.99, r: 0.0150, r2: 0.0128 });
  b.cil('acero', 0.0175, 0.012, [0, 0.09, 0.19], { seg: 14 });
  // punto de mira de latón y guía de bayoneta
  b.caja('laton', [0.005, 0.012, 0.016], [0, 0.109, 0.94], 0.0012);
  abrazaderas(b, { mat: 'laton', y: 0.09, zs: [], r: 0.014 });
  // abrazaderas de latón que ciñen cañón y madera
  for (const z of [0.22, 0.45, 0.68]) {
    b.caja('laton', [0.042, 0.068, 0.016], [0, 0.066, z], 0.006);
    b.caja('laton', [0.0455, 0.072, 0.005], [0, 0.066, z - 0.0095], 0.0025);
    b.caja('laton', [0.0455, 0.072, 0.005], [0, 0.066, z + 0.0095], 0.0025);
  }
  b.caja('laton', [0.042, 0.04, 0.03], [0, 0.063, 0.735], 0.006); // casquillo de la boca de la madera
  baqueta(b, { y: 0.043, z0: 0.02, z1: 0.76, r: 0.0048, mat: 'acero_c' });
  b.cil('laton', 0.0075, 0.02, [0, 0.043, 0.755], { seg: 10 });
  llaveChispa(b, { x: -0.0215, z: -0.045, y: 0.058 });
  placaLateral(b, 0.0215, -0.03, 0.04, 1.2);
  guardamonte(b, { z: -0.115, y: -0.03, largo: 0.125, prof: 0.045 });
  // chapa de culata y tornillo
  b.perfil('laton', [[-0.397, 0.1], [-0.38, 0.1], [-0.376, -0.082], [-0.396, -0.09]], 0.038, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.perfil('laton', [[-0.29, 0.073], [-0.2, 0.069], [-0.285, 0.066]], 0.005, [0, 0, 0], { bisel: 0.001 });
  return { boca: [0, 0.09, 0.99], manoIzq: [0, 0.035, 0.4], pose: 'larga' };
}

function pistolaChispaPieza(b, { largo = 0.26, esc = 1 } = {}) {
  const y = 0.05;
  b.perfil('nogal', [
    [largo * 0.85, 0.045], [largo * 0.85, 0.022], [0.05, 0.02], [0.022, 0.0], [0.014, -0.09], [0.0, -0.115],
    [-0.075, -0.126], [-0.088, -0.092], [-0.062, -0.02], [-0.05, 0.022], [-0.064, 0.058], [-0.02, 0.062], [0.0, 0.047],
  ], 0.032, [0, 0, 0], { suave: 0.01, bisel: 0.0025 });
  canon(b, { mat: 'acero', y, z0: -0.02, z1: largo, r: 0.0125, r2: 0.0108, oct: true });
  abrazaderas(b, { mat: 'laton', y, zs: [largo * 0.5, largo * 0.8], r: 0.011, ancho: 0.012 });
  baqueta(b, { y: 0.026, z0: 0.0, z1: largo * 0.84, r: 0.0036, mat: 'acero_c' });
  llaveChispa(b, { x: -0.0175, z: -0.035, y: 0.037, esc: 0.78 });
  b.perfil('laton', [[-0.092, -0.1], [-0.07, -0.098], [-0.065, -0.13], [-0.095, -0.13]], 0.034, [0, 0, 0], { suave: 0.004, bisel: 0.002 }); // pomo
  guardamonte(b, { z: -0.03, y: 0.0, largo: 0.085, prof: 0.032, r: 0.0048 });
  b.caja('laton', [0.034, 0.012, 0.03], [0, 0.0, 0.01], 0.004); // refuerzo
  b.caja('laton', [0.005, 0.01, 0.012], [0, y + 0.0165, largo - 0.01], 0.001); // punto de mira
}

function pistola_chispa(b) {
  pistolaChispaPieza(b, { largo: 0.27 });
  return { boca: [0, 0.05, 0.27], manoIzq: null, pose: 'pistola' };
}

function rifle_cazador(b) {
  // culata curva de rifle largo: talón en gancho y puntera adelantada
  b.perfil('nogal', [
    [-0.4, 0.075], [-0.33, 0.068], [-0.2, 0.062], [-0.05, 0.075], [0.0, 0.078], [0.75, 0.078], [0.75, 0.05],
    [0.1, 0.044], [0.03, 0.018], [-0.02, -0.03], [-0.1, -0.04], [-0.17, -0.038], [-0.29, -0.06], [-0.36, -0.095], [-0.40, -0.09], [-0.41, -0.02],
  ], 0.032, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  canon(b, { mat: 'acero', y: 0.09, z0: -0.04, z1: 1.08, r: 0.0152, r2: 0.0135, oct: true });
  b.cil('acero', 0.0178, 0.04, [0, 0.09, 0.0], { seg: 8, oct: true });
  abrazaderas(b, { mat: 'laton', y: 0.09, zs: [], r: 0.0135 });
  for (const z of [0.18, 0.36, 0.54, 0.72]) { // cuñas pasantes de latón en el cañón
    b.caja('laton', [0.04, 0.012, 0.006], [0, 0.0435, z], 0.0015);
  }
  b.caja('laton', [0.008, 0.016, 0.02], [0, 0.113, 1.02], 0.0016);          // punto de mira
  b.caja('acero', [0.006, 0.024, 0.006], [0, 0.116, 0.1], 0.001);            // alza de pínula
  b.caja('acero', [0.034, 0.006, 0.01], [0, 0.103, 0.1], 0.001);
  baqueta(b, { y: 0.045, z0: 0.05, z1: 0.76, r: 0.0042, mat: 'madera_c' });
  llaveChispa(b, { x: -0.0195, z: -0.045, y: 0.058, esc: 0.95 });
  placaLateral(b, 0.0195, -0.03, 0.04, 1.1);
  // guardamonte con gatillo de disparo y gatillo de precisión (doble gatillo)
  guardamonte(b, { z: -0.11, y: -0.03, largo: 0.13, prof: 0.05 });
  b.perfil('acero', [[0, 0], [0.004, 0], [0.002, -0.026], [-0.008, -0.028]], 0.004, [0, -0.026, -0.065], { bisel: 0.0008 });
  // caja de pólvora/«patchbox» de latón en la culata y placa de la culata en media luna
  b.perfil('laton', [[-0.33, 0.04], [-0.24, 0.044], [-0.22, 0.02], [-0.25, 0.0], [-0.33, 0.012]], 0.004, [0.0175, 0, 0], { suave: 0.012, bisel: 0.001 });
  b.perfil('laton', [[-0.402, 0.077], [-0.388, 0.077], [-0.372, -0.1], [-0.411, -0.092]], 0.034, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  for (const z of [0.2, 0.46, 0.7]) b.caja('laton', [0.04, 0.012, 0.012], [0, 0.0445, z], 0.003); // abrazaderas de la baqueta
  return { boca: [0, 0.09, 1.08], manoIzq: [0, 0.035, 0.45], pose: 'larga' };
}

function trabuco(b) {
  b.perfil('nogal', [
    [-0.34, 0.096], [-0.27, 0.068], [-0.14, 0.066], [-0.03, 0.078], [0.3, 0.078], [0.3, 0.05],
    [0.08, 0.044], [0.03, 0.02], [-0.02, -0.03], [-0.09, -0.036], [-0.17, -0.02], [-0.24, -0.045], [-0.34, -0.085],
  ], 0.038, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  // cañón de latón con boca acampanada (campana)
  b.rev('laton', [[0.017, -0.04], [0.019, 0.1], [0.021, 0.2], [0.026, 0.3], [0.04, 0.4], [0.062, 0.5], [0.066, 0.515]], [0, 0.09, 0], { seg: 22 });
  b.circ('negro', 0.056, [0, 0.09, 0.5155], [0, 0, 0], 22);
  b.toro('hierro', 0.0635, 0.0065, [0, 0.09, 0.515], { seg: 26, rad: 8 });
  // bandas de hierro
  for (const [z, r] of [[0.03, 0.0215], [0.18, 0.0235], [0.34, 0.032]]) b.cil('hierro', r, 0.022, [0, 0.09, z - 0.011], { seg: 16 });
  b.caja('laton', [0.044, 0.07, 0.016], [0, 0.065, 0.1], 0.006);
  b.caja('laton', [0.044, 0.04, 0.03], [0, 0.063, 0.285], 0.006);
  llaveChispa(b, { x: -0.0235, z: -0.045, y: 0.058 });
  placaLateral(b, 0.0235, -0.03, 0.04, 1.2);
  guardamonte(b, { z: -0.115, y: -0.03, largo: 0.12, prof: 0.045 });
  b.perfil('laton', [[-0.35, 0.098], [-0.332, 0.098], [-0.33, -0.082], [-0.35, -0.088]], 0.04, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.caja('laton', [0.006, 0.014, 0.018], [0, 0.0985, 0.0], 0.001); // alza
  return { boca: [0, 0.09, 0.515], manoIzq: [0, 0.03, 0.2], pose: 'pesada' };
}

function pistolas_duelo(b) {
  const par = (esp) => b.en([esp, 0, 0], () => {
    pistolaChispaPieza(b, { largo: 0.3 });
    // cantonera de nogal tallada con cuadrícula (punteado de empuñadura)
    for (let i = 0; i < 5; i++) b.caja('madera_o', [0.034, 0.004, 0.05], [0, -0.04 - i * 0.015, -0.034 - i * 0.002], 0.001);
  });
  par(0); par(0.38);
  return { boca: [0, 0.05, 0.3], bocaIzq: [0.38, 0.05, 0.3], manoIzq: [0.38, -0.03, 0], doble: true, pose: 'doble' };
}

function carabina_zapador(b) {
  b.perfil('madera_g', [
    [-0.32, 0.092], [-0.26, 0.066], [-0.14, 0.064], [-0.03, 0.078], [0.46, 0.078], [0.46, 0.048],
    [0.1, 0.044], [0.04, 0.02], [-0.02, -0.03], [-0.09, -0.036], [-0.17, -0.02], [-0.24, -0.045], [-0.32, -0.082],
  ], 0.04, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  canon(b, { mat: 'hierro', y: 0.09, z0: -0.04, z1: 0.64, r: 0.0185, r2: 0.0175, oct: true, ánima: false });
  b.rev('hierro', [[0.0175, 0.5], [0.0215, 0.58], [0.027, 0.64], [0.028, 0.652]], [0, 0.09, 0], { seg: 16 }); // boca ensanchada (para postas)
  b.circ('negro', 0.0225, [0, 0.09, 0.6525], [0, 0, 0], 16);
  for (const z of [0.2, 0.4]) { b.caja('laton', [0.046, 0.07, 0.016], [0, 0.066, z], 0.006); }
  b.caja('laton', [0.046, 0.04, 0.028], [0, 0.063, 0.455], 0.006);
  b.cil('hierro', 0.007, 0.05, [0, 0.0, 0.0], { seg: 8, rot: [0, 0, 0], r2: 0.005 });
  // anillo de portacorrea y barra lateral de zapador
  b.toro('hierro', 0.014, 0.0035, [-0.021, 0.03, -0.12], { seg: 14, rad: 6, rot: [0, PI / 2, 0] });
  llaveChispa(b, { x: -0.0245, z: -0.045, y: 0.058 });
  placaLateral(b, 0.0245, -0.03, 0.04, 1.2);
  guardamonte(b, { mat: 'hierro', z: -0.11, y: -0.03, largo: 0.12, prof: 0.045 });
  b.perfil('hierro', [[-0.33, 0.094], [-0.315, 0.094], [-0.312, -0.078], [-0.33, -0.084]], 0.042, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  // bayoneta de cubo plegada bajo el cañón
  b.cil('hierro', 0.011, 0.05, [0, 0.062, 0.6], { seg: 10 });
  b.perfil('acero_c', [[0, 0], [0.25, 0.0], [0.33, 0.004], [0.25, 0.017], [0, 0.017]], 0.0045, [0, 0.02, 0.62], { bisel: 0.0008 });
  baqueta(b, { y: 0.045, z0: 0.05, z1: 0.46, r: 0.0042, mat: 'madera_c' });
  return { boca: [0, 0.09, 0.652], manoIzq: [0, 0.035, 0.28], pose: 'larga' };
}

function granada_mecha(b) {
  const y = 0.06, z = 0.04;
  b.esf('hierro', 0.058, [0, y, z], 1, 18);
  // costura y cinchas
  b.toro('hierro', 0.0585, 0.004, [0, y, z], { seg: 24, rad: 6 });
  b.toro('acero', 0.0585, 0.003, [0, y, z], { seg: 24, rad: 6, rot: [0, PI / 2, 0] });
  b.toro('acero', 0.0585, 0.003, [0, y, z], { seg: 24, rad: 6, rot: [PI / 2, 0, 0] });
  // remaches y nervaduras (fragmentación)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * PI;
    b.esf('acero_c', 0.0065, [Math.cos(a) * 0.058, y + Math.sin(a) * 0.058 * 0.0, z + Math.sin(a) * 0.058], 1, 6);
  }
  // tapón de madera, aro de latón y mecha de cuerda con brasa
  b.cil('madera_c', 0.02, 0.03, [0, y + 0.048, z], { rot: [-PI / 2, 0, 0], seg: 12, r2: 0.014 });
  b.cil('laton', 0.024, 0.008, [0, y + 0.052, z], { rot: [-PI / 2, 0, 0], seg: 12 });
  b.tubo('cuerda', [[0, y + 0.075, z], [0.005, y + 0.115, z + 0.006], [0.012, y + 0.14, z - 0.008], [0.004, y + 0.16, z - 0.012]], 0.0048, { seg: 14, rad: 6 });
  b.esf('mecha', 0.0085, [0.004, y + 0.164, z - 0.012], 1, 8);
  return { boca: [0, y, z], manoIzq: null, pose: 'arrojadiza' };
}

function sable(b) {
  // empuñadura de cuero con alambre, pomo, guardia con arco para los dedos
  b.cil('cuero', 0.0155, 0.115, [0, 0, -0.055], { seg: 12 });
  for (let i = 0; i < 9; i++) b.toro('laton', 0.0158, 0.0013, [0, 0, -0.05 + i * 0.012], { seg: 12, rad: 4 });
  b.esf('laton', 0.022, [0, 0, -0.07], [1, 1.1, 1.2], 12);
  b.perfil('laton', [[-0.08, 0.016], [-0.045, 0.03], [-0.02, 0.026], [-0.05, 0.012]], 0.012, [0, 0, 0], { suave: 0.004, bisel: 0.002 });
  b.tubo('laton', [[0, 0.0, 0.07], [0, -0.04, 0.05], [0, -0.062, 0.0], [0, -0.052, -0.045], [0, -0.025, -0.068]], 0.0058, { seg: 20, rad: 6 });
  b.cil('laton', 0.008, 0.16, [-0.08, -0.002, 0.072], { rot: [0, PI / 2, 0], seg: 10 });
  b.esf('laton', 0.011, [0.08, -0.002, 0.072], 1, 8); b.esf('laton', 0.011, [-0.08, -0.002, 0.072], 1, 8);
  b.cil('laton', 0.015, 0.02, [0, -0.002, 0.068], { seg: 12 });
  // hoja curva (filo convexo hacia abajo): sector de círculo de radio 3 m
  const R = 3.2, cz = 0.09, cy = 0.0 + R, pts = [], pts2 = [];
  const t1 = 0.285;
  for (let i = 0; i <= 14; i++) {
    const t = (t1 * i) / 14, a = Math.sin(t) * R, c = R - Math.cos(t) * R;
    const ancho = 0.036 * (1 - Math.pow(t / t1, 1.6)) + (i === 14 ? 0 : 0.002);
    pts.push([cz + a, c - 0.014]); pts2.push([cz + a - 0.002 * 0, c - 0.014 + ancho]);
  }
  b.perfil('acero_c', pts.concat(pts2.reverse()), 0.0065, [0, 0, 0], { bisel: 0.0012 });
  // contrafilo ('falso filo') y canal central oscuro
  b.perfil('acero', pts2.slice().reverse().filter((_, i) => i < 10).map((p) => [p[0], p[1] - 0.012]).concat(pts2.filter((_, i) => i < 10).map((p) => [p[0], p[1] - 0.0145]).reverse()), 0.0072, [0, 0, 0], { bisel: 0.0004 });
  const tip = pts[pts.length - 1];
  return { boca: [0, tip[1] + 0.0, tip[0]], manoIzq: null, pose: 'cuerpo' };
}

export const ARMAS_E0 = { mosquete, pistola_chispa, rifle_cazador, trabuco, pistolas_duelo, carabina_zapador, granada_mecha, sable };
