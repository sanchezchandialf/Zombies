// Era 5 · Sintética (2050–2100): composite blanco y negro con emisivos HDR (bloom): disipadores, bobinas, raíles abiertos, plasma.
import { guardamonte, cargadorCaja, cargadorCurvo, carril, boca, aletas, bobina, celda, canon } from './piezas.js';

const PI = Math.PI;

function visorSensor(b, { y = 0.13, z = 0.1, luz = 'em_cian', largo = 0.14 } = {}) {
  b.caja('composite_n', [0.036, 0.034, largo], [0, y, z], 0.01);
  b.caja('composite_g', [0.04, 0.012, largo * 0.7], [0, y + 0.02, z], 0.004);
  b.circ(luz, 0.0125, [0, y, z + largo / 2 + 0.0012], [0, 0, 0], 14);
  b.toro('composite_g', 0.0135, 0.0025, [0, y, z + largo / 2], { seg: 14, rad: 5 });
  b.caja(luz, [0.003, 0.004, largo * 0.5], [0.0185, y, z], 0.001); b.caja(luz, [0.003, 0.004, largo * 0.5], [-0.0185, y, z], 0.001);
}

function rifle_pulsos(b) {
  const y = 0.078, L = 'em_cian';
  b.perfil('composite', [[-0.34, 0.112], [0.3, 0.118], [0.35, 0.08], [0.3, 0.036], [0.06, 0.032], [-0.04, 0.0], [-0.3, -0.02], [-0.38, 0.04]], 0.046, [0, 0, 0], { suave: 0.014, bisel: 0.004 });
  b.perfil(L, [[-0.22, 0.082], [0.26, 0.09], [0.28, 0.084], [-0.2, 0.074]], 0.0475, [0, 0, 0], { bisel: 0.0003 });
  b.perfil('composite_n', [[-0.34, 0.11], [-0.2, 0.108], [-0.2, 0.04], [-0.37, 0.036]], 0.05, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.perfil('caucho', [[-0.385, 0.098], [-0.37, 0.1], [-0.372, 0.032], [-0.39, 0.04]], 0.05, [0, 0, 0], { suave: 0.004, bisel: 0.002 });
  b.perfil('composite_n', [[-0.04, 0.03], [0.044, 0.03], [0.034, -0.12], [-0.026, -0.126], [-0.046, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  // cañón con disipadores luminosos y emisor
  b.cil('composite_g', 0.012, 0.9, [0, y, 0.1], { seg: 10 });
  aletas(b, { y, z0: 0.34, z1: 0.76, r: 0.03, n: 7, mat: 'composite_n', luz: L });
  b.cil('composite_n', 0.02, 0.07, [0, y, 0.8], { seg: 12 });
  b.toro(L, 0.0205, 0.0035, [0, y, 0.86], { seg: 16, rad: 6 });
  boca(b, 0.872, y, 0.02, { corona: false, ratio: 0.45 });
  // célula de energía dorsal con ventana
  celda(b, { y: 0.138, z: 0.06, l: 0.16, r: 0.022, luz: L });
  b.caja('composite_g', [0.034, 0.014, 0.1], [0, 0.124, 0.06], 0.004);
  cargadorCurvo(b, { mat: 'composite_n', z: 0.1, y: 0.032, largo: 0.17, w: 0.034, prof: 0.044, curva: 0.05 });
  b.caja(L, [0.0355, 0.1, 0.004], [0, -0.04, 0.086], 0.0008, [0.06, 0, 0]);
  guardamonte(b, { mat: 'composite_n', z: -0.09, y: 0.028, largo: 0.11, prof: 0.032, r: 0.0045 });
  visorSensor(b, { y: 0.172, z: 0.1, luz: L, largo: 0.12 });
  return { boca: [0, y, 0.872], manoIzq: [0, 0.03, 0.4], pose: 'larga' };
}

function pistola_plasma(b) {
  const y = 0.07, L = 'em_cian';
  b.perfil('composite', [[-0.05, 0.1], [0.16, 0.1], [0.2, 0.07], [0.16, 0.036], [0.06, 0.03], [0.045, 0.0], [0.034, -0.12], [-0.05, -0.126], [-0.06, -0.03]], 0.036, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.perfil(L, [[-0.04, 0.06], [0.12, 0.066], [0.14, 0.058], [-0.04, 0.052]], 0.0375, [0, 0, 0], { bisel: 0.0003 });
  // cámara de plasma: esfera de cristal con núcleo y espiras
  b.esf('vidrio_c', 0.034, [0, 0.092, 0.04], 1, 18);
  b.esf(L, 0.02, [0, 0.092, 0.04], 1, 14);
  b.toro('composite_g', 0.035, 0.0038, [0, 0.092, 0.04], { seg: 20, rad: 5, rot: [0, PI / 2, 0] });
  b.toro('composite_g', 0.035, 0.0038, [0, 0.092, 0.04], { seg: 20, rad: 5 });
  // emisor cónico con aros luminosos
  b.rev('composite_n', [[0.02, 0.14], [0.026, 0.2], [0.03, 0.26], [0.022, 0.275]], [0, y, 0], { seg: 16 });
  for (const z of [0.18, 0.22, 0.255]) b.toro(L, 0.0265 + (z - 0.18) * 0.1, 0.0025, [0, y, z], { seg: 16, rad: 5 });
  boca(b, 0.276, y, 0.022, { corona: false, ratio: 0.55 });
  celda(b, { y: -0.04, z: 0.0, l: 0.1, r: 0.014, luz: L, eje: 'y' });
  guardamonte(b, { mat: 'composite_n', z: -0.0, y: 0.03, largo: 0.1, prof: 0.03, r: 0.0042 });
  return { boca: [0, y, 0.276], manoIzq: null, pose: 'pistola' };
}

function canon_riel(b) {
  const y = 0.084, L = 'em_azul';
  b.perfil('composite_g', [[-0.04, 0.1], [-0.5, 0.108], [-0.5, -0.06], [-0.34, -0.06], [-0.22, -0.03], [-0.1, -0.03], [-0.06, 0.02]], 0.04, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('caucho', [[-0.512, 0.11], [-0.498, 0.11], [-0.498, -0.062], [-0.512, -0.062]], 0.046, [0, 0, 0], { suave: 0.004, bisel: 0.002 });
  b.perfil('composite_n', [[-0.04, 0.03], [0.042, 0.03], [0.032, -0.12], [-0.024, -0.126], [-0.046, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('composite_n', [0.058, 0.08, 0.5], [0, 0.07, 0.14], 0.01);
  b.caja(L, [0.06, 0.006, 0.34], [0, 0.074, 0.12], 0.001);
  // condensadores a ambos lados del cajón
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) celda(b, { x: s * 0.058, y: 0.07, z: -0.04 + i * 0.12, l: 0.1, r: 0.0235, luz: L, mat: 'composite' });
  // raíles abiertos con separadores y arco de conducción entre ellos
  for (const s of [-1, 1]) {
    b.caja('cromo', [0.011, 0.032, 0.86], [s * 0.025, y, 0.74], 0.002);
    b.caja('composite_g', [0.0125, 0.008, 0.86], [s * 0.025, y + 0.02, 0.74], 0.002);
  }
  b.caja(L, [0.02, 0.004, 0.84], [0, y, 0.74], 0.0008);
  for (const z of [0.42, 0.62, 0.82, 1.02, 1.16]) b.caja('composite_n', [0.074, 0.044, 0.02], [0, y, z], 0.005);
  b.caja(L, [0.07, 0.01, 0.006], [0, y, 1.171], 0.001);
  b.caja('composite_n', [0.05, 0.05, 0.05], [0, y, 0.38], 0.008);
  boca(b, 1.17, y, 0.01, { corona: false, ratio: 0.4 });
  visorSensor(b, { y: 0.15, z: -0.1, luz: L, largo: 0.2 });
  guardamonte(b, { mat: 'composite_n', z: -0.09, y: 0.028, largo: 0.12, prof: 0.032, r: 0.0045 });
  // guardamanos y bípode corto
  b.perfil('composite_n', [[0.2, 0.034], [0.34, 0.034], [0.33, -0.06], [0.21, -0.06]], 0.04, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  return { boca: [0, y, 1.17], manoIzq: [0, -0.02, 0.27], pose: 'larga' };
}

function canon_arco(b) {
  const y = 0.1, L = 'em_violeta';
  b.perfil('composite_g', [[-0.12, 0.17], [0.44, 0.15], [0.44, 0.04], [0.1, 0.03], [-0.12, 0.05]], 0.07, [0, 0, 0], { suave: 0.014, bisel: 0.004 });
  b.perfil('composite_n', [[-0.04, 0.034], [0.05, 0.034], [0.04, -0.12], [-0.026, -0.126], [-0.05, -0.05]], 0.038, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.perfil('composite_n', [[0.3, 0.04], [0.37, 0.04], [0.364, -0.1], [0.306, -0.1]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  guardamonte(b, { mat: 'composite_n', z: -0.04, y: 0.032, largo: 0.1, prof: 0.03, r: 0.0045 });
  // núcleo conductor luminoso rodeado de bobinas de latón y soportes
  b.cil(L, 0.012, 0.66, [0, y, 0.4], { seg: 10 });
  bobina(b, { y, z0: 0.46, z1: 0.98, R: 0.042, r: 0.0095, n: 7, mat: 'laton' });
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; b.cil('composite_n', 0.0055, 0.6, [Math.sin(a) * 0.046, y + Math.cos(a) * 0.046, 0.42], { seg: 6 }); }
  for (const z of [0.44, 0.7, 0.99]) b.cil('composite_n', 0.052, 0.022, [0, y, z], { seg: 16 });
  // emisor de tres puntas con esfera de arco
  for (let i = 0; i < 3; i++) {
    const a = i * (2 * PI / 3) + PI / 2;
    b.tubo('composite_g', [[Math.sin(a) * 0.045, y + Math.cos(a) * 0.045, 1.0], [Math.sin(a) * 0.052, y + Math.cos(a) * 0.052, 1.06], [Math.sin(a) * 0.026, y + Math.cos(a) * 0.026, 1.14], [Math.sin(a) * 0.016, y + Math.cos(a) * 0.016, 1.18]], 0.0065, { seg: 14, rad: 5 });
    b.esf(L, 0.007, [Math.sin(a) * 0.016, y + Math.cos(a) * 0.016, 1.185], 1, 6);
  }
  b.esf(L, 0.022, [0, y, 1.1], 1, 14); b.esf('vidrio_c', 0.032, [0, y, 1.1], 1, 14);
  // células laterales y cableado
  for (const s of [-1, 1]) { celda(b, { x: s * 0.07, y: 0.14, z: -0.05, l: 0.2, r: 0.026, luz: L }); b.tubo('caucho', [[s * 0.07, 0.14, 0.12], [s * 0.07, 0.15, 0.3], [s * 0.04, 0.14, 0.44]], 0.008, { seg: 14, rad: 5 }); }
  b.caja('composite_n', [0.05, 0.03, 0.1], [0, 0.19, 0.2], 0.006);
  return { boca: [0, y, 1.19], manoIzq: [0, 0.0, 0.335], pose: 'pesada' };
}

function subfusil_agujas(b) {
  const y = 0.07, L = 'em_magenta';
  b.perfil('composite', [[-0.08, 0.098], [0.3, 0.1], [0.34, 0.07], [0.3, 0.04], [0.04, 0.034], [-0.02, 0.0], [-0.1, 0.02]], 0.04, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil(L, [[-0.02, 0.068], [0.28, 0.074], [0.3, 0.068], [-0.02, 0.06]], 0.0415, [0, 0, 0], { bisel: 0.0003 });
  b.perfil('composite_n', [[-0.04, 0.034], [0.044, 0.034], [0.034, -0.12], [-0.026, -0.126], [-0.046, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  // culata de varillas con hombrera
  b.tubo('composite_g', [[0.016, y + 0.02, -0.06], [0.016, y + 0.024, -0.3], [0.016, y - 0.02, -0.34]], 0.006, { seg: 10, rad: 6 });
  b.tubo('composite_g', [[-0.016, y + 0.02, -0.06], [-0.016, y + 0.024, -0.3], [-0.016, y - 0.02, -0.34]], 0.006, { seg: 10, rad: 6 });
  b.perfil('composite_n', [[-0.36, y + 0.0], [-0.335, y + 0.0], [-0.335, y - 0.09], [-0.36, y - 0.09]], 0.046, [0, 0, 0], { suave: 0.004, bisel: 0.002 });
  // cargador transparente con agujas luminosas
  b.caja('vidrio_c', [0.03, 0.17, 0.056], [0, -0.07, 0.07], 0.004);
  for (let i = 0; i < 5; i++) b.caja(L, [0.012, 0.15, 0.003], [0, -0.07, 0.05 + i * 0.01], 0.0006);
  b.caja('composite_n', [0.034, 0.012, 0.062], [0, -0.16, 0.07], 0.004);
  // haz de cañones: tres rieles finos dentro de un manguito
  b.cil('composite_n', 0.026, 0.14, [0, y, 0.3], { seg: 14 });
  for (let i = 0; i < 3; i++) { const a = i * 2 * PI / 3; const px = Math.sin(a) * 0.0105, py = y + Math.cos(a) * 0.0105; b.cil('acero_c', 0.0055, 0.2, [px, py, 0.34], { seg: 8 }); b.circ('negro', 0.003, [px, py, 0.5401], [0, 0, 0], 6); }
  b.toro(L, 0.0265, 0.003, [0, y, 0.37], { seg: 16, rad: 5 }); b.toro(L, 0.0265, 0.003, [0, y, 0.42], { seg: 16, rad: 5 });
  guardamonte(b, { mat: 'composite_n', z: -0.07, y: 0.034, largo: 0.1, prof: 0.03, r: 0.0042 });
  visorSensor(b, { y: 0.128, z: 0.1, luz: L, largo: 0.1 });
  return { boca: [0, y, 0.54], manoIzq: [0, 0.0, 0.25], pose: 'larga' };
}

function proyector_ondas(b) {
  const y = 0.082, L = 'em_magenta';
  b.perfil('composite', [[-0.1, 0.13], [0.3, 0.13], [0.34, 0.09], [0.3, 0.04], [0.06, 0.036], [-0.02, 0.0], [-0.12, 0.06]], 0.06, [0, 0, 0], { suave: 0.016, bisel: 0.004 });
  b.perfil('composite_n', [[-0.04, 0.036], [0.05, 0.036], [0.04, -0.12], [-0.026, -0.126], [-0.05, -0.05]], 0.04, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.perfil('composite_n', [[0.2, 0.04], [0.28, 0.04], [0.274, -0.09], [0.206, -0.09]], 0.04, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  guardamonte(b, { mat: 'composite_n', z: -0.04, y: 0.03, largo: 0.1, prof: 0.03, r: 0.0045 });
  // antena parabólica de proyección: cuenco hueco con núcleo y anillos luminosos
  b.rev('composite_n', [[0.03, 0.3], [0.045, 0.36], [0.075, 0.43], [0.095, 0.5], [0.098, 0.52], [0.09, 0.52], [0.07, 0.46], [0.04, 0.4], [0.02, 0.34]], [0, y, 0], { seg: 24 });
  b.toro('composite_g', 0.097, 0.007, [0, y, 0.52], { seg: 28, rad: 6 });
  b.cil(L, 0.03, 0.01, [0, y, 0.34], { seg: 16, r2: 0.04 });
  for (const [r, z] of [[0.05, 0.45], [0.072, 0.495]]) b.toro(L, r, 0.0035, [0, y, z], { seg: 24, rad: 5 });
  b.cil('composite_g', 0.012, 0.06, [0, y, 0.32], { seg: 8 });
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; b.cil('composite_g', 0.005, 0.2, [Math.sin(a) * 0.04, y + Math.cos(a) * 0.04, 0.32], { rot: [0.0, 0.0, 0.0], seg: 5 }); }
  // bobinas de bombeo sobre el cuerpo y células
  bobina(b, { y: 0.165, z0: 0.04, z1: 0.26, R: 0.026, r: 0.008, n: 5, mat: 'composite_g' });
  b.cil(L, 0.012, 0.22, [0, 0.165, 0.04], { seg: 8 });
  for (const s of [-1, 1]) b.caja(L, [0.004, 0.012, 0.2], [s * 0.0305, 0.1, 0.14], 0.001);
  return { boca: [0, y, 0.52], manoIzq: [0, -0.01, 0.24], pose: 'pesada' };
}

function granada_singularidad(b) {
  const y = 0.062, z = 0.03, L = 'em_violeta';
  b.esf('composite_n', 0.036, [0, y, z], 1, 20);
  // anillos orbitales luminosos y jaula de arcos
  b.toro(L, 0.056, 0.0042, [0, y, z], { seg: 36, rad: 6 });
  b.toro(L, 0.056, 0.0042, [0, y, z], { seg: 36, rad: 6, rot: [PI / 2, 0, 0] });
  b.toro('composite_g', 0.062, 0.0035, [0, y, z], { seg: 36, rad: 5, rot: [0, PI / 3, PI / 4] });
  b.toro('composite_g', 0.062, 0.0035, [0, y, z], { seg: 36, rad: 5, rot: [PI / 3, PI / 2, PI / 5] });
  b.esf(L, 0.012, [0, y, z], 1, 12);
  for (const s of [-1, 1]) { b.cil('composite_g', 0.012, 0.03, [0, y + s * 0.054, z], { seg: 10, rot: [-PI / 2 * s, 0, 0] }); }
  // casquillo de agarre y anilla de seguridad
  b.cil('composite_n', 0.022, 0.03, [0, y - 0.088, z], { seg: 14, rot: [-PI / 2, 0, 0] });
  b.toro('composite_g', 0.022, 0.004, [0, y - 0.088, z], { seg: 14, rad: 5, rot: [PI / 2, 0, 0] });
  b.toro(L, 0.014, 0.0025, [0.0, y + 0.082, z], { seg: 14, rad: 5, rot: [0, PI / 2, 0] });
  return { boca: [0, y, z], manoIzq: null, pose: 'arrojadiza' };
}

function hoja_termica(b) {
  const L = 'em_naranja';
  // empuñadura de composite con anillos, pomo con núcleo caliente y guarda con ventilas
  b.cil('composite_n', 0.0175, 0.19, [0, 0, -0.1], { seg: 12 });
  for (let i = 0; i < 6; i++) b.toro('caucho', 0.0178, 0.0022, [0, 0, -0.09 + i * 0.03], { seg: 12, rad: 4 });
  b.esf('composite_g', 0.024, [0, 0, -0.11], [1, 1, 0.8], 10); b.toro(L, 0.024, 0.0025, [0, 0, -0.115], { seg: 14, rad: 5 });
  b.perfil('composite_g', [[0.085, 0.034], [0.12, 0.052], [0.14, 0.04], [0.108, 0.0], [0.14, -0.04], [0.12, -0.052], [0.085, -0.034]], 0.03, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  for (const s of [-1, 1]) b.caja(L, [0.004, 0.044, 0.014], [s * 0.0155, 0.0, 0.107], 0.001);
  b.cil('composite_n', 0.021, 0.035, [0, 0, 0.075], { seg: 12 });
  // hoja: filo incandescente protegido por un lomo oscuro de cerámica
  b.perfil(L, [[0.1, 0.016], [0.78, 0.015], [0.9, -0.002], [0.78, -0.032], [0.1, -0.03]], 0.009, [0, 0, 0], { bisel: 0.0012 });
  b.perfil('em_blanco', [[0.12, -0.008], [0.8, -0.012], [0.84, -0.014], [0.8, -0.018], [0.12, -0.016]], 0.0098, [0, 0, 0], { bisel: 0.0003 });
  b.perfil('composite_n', [[0.1, 0.024], [0.78, 0.022], [0.9, 0.0], [0.78, 0.012], [0.1, 0.004]], 0.0125, [0, 0, 0], { bisel: 0.0012 });
  for (let i = 0; i < 5; i++) b.caja('composite_g', [0.0135, 0.008, 0.02], [0, 0.0055 + 0.0, 0.2 + i * 0.12], 0.001);
  return { boca: [0, 0.0, 0.9], manoIzq: null, pose: 'cuerpo' };
}

export const ARMAS_E5 = { rifle_pulsos, pistola_plasma, canon_riel, canon_arco, subfusil_agujas, proyector_ondas, granada_singularidad, hoja_termica };
