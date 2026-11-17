// Era 4 · Digital (2000–2049): armas modulares de polímero con raíles, ópticas y accesorios.
import { canon, guardamonte, cargadorCurvo, cargadorCaja, miraTelescopica, carril, tamborRevolver, boca, bipode } from './piezas.js';

const PI = Math.PI;

/** Visor de punto rojo/holográfico compacto sobre un raíl. */
function visorPunto(b, { x = 0, y = 0.12, z = 0.1, esc = 1 } = {}) {
  b.caja('composite_n', [0.034 * esc, 0.012, 0.07 * esc], [x, y, z], 0.004);
  b.caja('composite_n', [0.03 * esc, 0.034 * esc, 0.012], [x, y + 0.022 * esc, z - 0.03 * esc], 0.003);
  for (const s of [-1, 1]) b.caja('composite_n', [0.004, 0.04 * esc, 0.07 * esc], [x + s * 0.0165 * esc, y + 0.022 * esc, z], 0.0015);
  b.caja('composite_n', [0.036 * esc, 0.006, 0.07 * esc], [x, y + 0.045 * esc, z], 0.002);
  b.caja('vidrio_c', [0.027 * esc, 0.034 * esc, 0.002], [x, y + 0.022 * esc, z + 0.032 * esc], 0.0006);
  b.circ('em_rojo', 0.0028, [x, y + 0.024 * esc, z + 0.0335 * esc], [0, 0, 0], 8);
}

/** Orificios de montaje (M-lok) a lo largo de un guardamanos. */
function mlok(b, { y, z0, n, r, ang = [PI / 2, -PI / 2, PI] }) {
  for (const a of ang) for (let i = 0; i < n; i++)
    b.caja('negro', [0.007, 0.007, 0.034], [Math.sin(a) * r, y + Math.cos(a) * r, z0 + i * 0.05], 0.001);
}

function carabina_tactica(b) {
  const y = 0.082;
  b.perfil('polimero', [[-0.05, 0.09], [-0.2, 0.088], [-0.4, 0.068], [-0.4, -0.05], [-0.3, -0.05], [-0.15, -0.03], [-0.05, 0.0]], 0.03, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('caucho', [[-0.412, 0.07], [-0.398, 0.07], [-0.398, -0.052], [-0.412, -0.054]], 0.036, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.cil('composite_g', 0.016, 0.2, [0, y, -0.25], { seg: 10 });                                  // tubo telescópico
  b.perfil('polimero', [[-0.04, 0.03], [0.045, 0.03], [0.036, -0.12], [-0.024, -0.126], [-0.048, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('composite_g', [0.044, 0.056, 0.3], [0, 0.058, 0.07], 0.006);                           // cajera inferior
  b.caja('composite_n', [0.044, 0.05, 0.34], [0, 0.1, 0.08], 0.006);                            // cajera superior
  b.caja('negro', [0.046, 0.016, 0.06], [0, 0.1, 0.12], 0.002);
  carril(b, { y: 0.128, z0: -0.07, z1: 0.62, w: 0.022, mat: 'composite_g' });
  b.cil('composite_n', 0.0345, 0.34, [0, y + 0.002, 0.25], { seg: 8, oct: true });               // guardamanos con carriles
  mlok(b, { y: y + 0.002, z0: 0.28, n: 6, r: 0.0345, ang: [PI / 2, -PI / 2, PI] });
  carril(b, { y: y + 0.0405, z0: 0.25, z1: 0.59, w: 0.02, mat: 'composite_g' });
  canon(b, { mat: 'acero', y, z0: 0.55, z1: 0.76, r: 0.0125, ánima: false });
  b.cil('composite_n', 0.0185, 0.095, [0, y, 0.74], { seg: 12, r2: 0.016 });                      // apagallamas ranurado
  for (const z of [0.765, 0.79, 0.81]) b.caja('negro', [0.04, 0.004, 0.006], [0, y + 0.0162, z], 0.001);
  boca(b, 0.835, y, 0.016, { corona: false, ratio: 0.5 });
  cargadorCurvo(b, { mat: 'composite_n', z: 0.09, y: 0.03, largo: 0.2, w: 0.03, prof: 0.04, curva: 0.04 });
  guardamonte(b, { mat: 'composite_n', z: -0.09, y: 0.026, largo: 0.11, prof: 0.032, r: 0.0045 });
  visorPunto(b, { y: 0.136, z: 0.14 });
  b.perfil('composite_g', [[0.0, 0.0], [0.05, 0.0], [0.05, -0.1], [0.0, -0.1]], 0.026, [0, 0.05, 0.38], { suave: 0.008, bisel: 0.003 }); // empuñadura vertical
  b.caja('composite_n', [0.03, 0.016, 0.06], [0, 0.05, 0.405], 0.004);
  b.caja('composite_n', [0.012, 0.012, 0.03], [0, 0.131 + 0.008, 0.52], 0.002);
  return { boca: [0, y, 0.835], manoIzq: [0, -0.04, 0.405], pose: 'larga' };
}

function pistola_tactica(b) {
  const y = 0.066;
  b.perfil('polimero', [[-0.05, 0.05], [0.15, 0.05], [0.15, 0.026], [0.08, 0.022], [0.05, 0.02], [0.044, -0.0], [0.034, -0.105], [-0.05, -0.108], [-0.062, -0.04]], 0.03, [0, 0, 0], { suave: 0.006, bisel: 0.002 });
  for (let i = 0; i < 4; i++) b.caja('negro', [0.0316, 0.006, 0.05], [0, -0.04 - i * 0.02, -0.012 - i * 0.002], 0.001);  // agarre acanalado
  b.caja('composite_n', [0.032, 0.014, 0.075], [0, -0.136, -0.008], 0.004);
  b.caja('acero_c', [0.026, 0.04, 0.215], [0, y, 0.06], 0.005);                       // corredera
  b.caja('acero', [0.028, 0.012, 0.215], [0, y + 0.019, 0.06], 0.003);
  for (let i = 0; i < 6; i++) b.caja('negro', [0.028, 0.03, 0.0025], [0, y, -0.02 + i * 0.008], 0.0005);
  b.caja('acero', [0.006, 0.01, 0.02], [0, y + 0.02 + 0.006, 0.165], 0.001); b.caja('acero', [0.016, 0.009, 0.012], [0, y + 0.028, -0.03], 0.0015);
  b.cil('acero', 0.0072, 0.03, [0, y, 0.162], { seg: 10 }); b.circ('negro', 0.0042, [0, y, 0.1921], [0, 0, 0], 10);
  // módulo de linterna y láser bajo el cañón
  b.caja('composite_n', [0.03, 0.026, 0.05], [0, 0.026, 0.118], 0.005);
  b.circ('em_blanco', 0.008, [0.0, 0.026, 0.1431], [0, 0, 0], 12); b.circ('em_rojo', 0.0035, [0, 0.0145, 0.1431], [0, 0, 0], 8);
  guardamonte(b, { mat: 'polimero', z: -0.0, y: 0.022, largo: 0.1, prof: 0.032, r: 0.0042 });
  b.caja('composite_n', [0.012, 0.01, 0.026], [0, 0.0, 0.0], 0.002);
  return { boca: [0, y, 0.19], manoIzq: null, pose: 'pistola' };
}

function rifle_antimaterial(b) {
  const y = 0.09;
  b.perfil('composite_g', [[-0.04, 0.1], [-0.5, 0.1], [-0.5, -0.07], [-0.34, -0.066], [-0.22, -0.034], [-0.12, -0.03], [-0.06, 0.01]], 0.044, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.perfil('composite_n', [[-0.46, 0.1], [-0.22, 0.1], [-0.22, 0.075], [-0.46, 0.075]], 0.05, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.perfil('caucho', [[-0.512, 0.102], [-0.498, 0.102], [-0.498, -0.072], [-0.512, -0.074]], 0.05, [0, 0, 0], { suave: 0.004, bisel: 0.002 });
  b.perfil('composite_n', [[-0.04, 0.03], [0.044, 0.03], [0.034, -0.13], [-0.024, -0.134], [-0.048, -0.05]], 0.036, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('composite_g', [0.056, 0.086, 0.5], [0, 0.07, 0.17], 0.009);
  carril(b, { y: 0.118, z0: -0.07, z1: 0.42, w: 0.034, mat: 'composite_n' });
  canon(b, { mat: 'acero', y, z0: 0.4, z1: 1.04, r: 0.0235, r2: 0.0215, ánima: false });
  for (let i = 0; i < 10; i++) b.toro('acero', 0.0238, 0.0022, [0, y, 0.5 + i * 0.05], { seg: 18, rad: 4 });  // aletas de refrigeración
  // freno de boca de dos cámaras con lumbreras laterales
  b.cil('composite_n', 0.034, 0.18, [0, y, 1.0], { seg: 14 });
  for (const z of [1.06, 1.11, 1.16]) { b.caja('negro', [0.07, 0.009, 0.014], [0, y, z], 0.001); }
  b.cil('composite_n', 0.039, 0.016, [0, y, 1.0], { seg: 14 }); b.cil('composite_n', 0.039, 0.016, [0, y, 1.164], { seg: 14 });
  boca(b, 1.18, y, 0.034, { corona: false, ratio: 0.36 });
  // guardamanos de composite y asa de transporte
  b.cil('composite_n', 0.04, 0.3, [0, y, 0.4], { seg: 16 });
  b.perfil('composite_n', [[0.0, 0.1], [0.09, 0.1], [0.07, 0.17], [0.02, 0.17]], 0.02, [0, 0.0, 0.15], { suave: 0.012, bisel: 0.003 });
  miraTelescopica(b, { x: 0, y: 0.172, z: -0.05, largo: 0.4, r: 0.0235, soportes: [0.02, 0.32], mat: 'composite_n' });
  cargadorCaja(b, { mat: 'composite_n', z: 0.17, y: 0.03, largo: 0.1, w: 0.04, prof: 0.1, incl: 0.0 });
  guardamonte(b, { mat: 'composite_n', z: -0.1, y: 0.03, largo: 0.12, prof: 0.034, r: 0.005 });
  // bípode con patas articuladas, abiertas hacia delante
  b.caja('composite_n', [0.05, 0.026, 0.05], [0, 0.036, 0.74], 0.006);
  for (const s of [-1, 1]) {
    b.cil('acero', 0.0065, 0.34, [s * 0.026, 0.038, 0.74], { rot: [0.9, s * 0.16, 0], seg: 8 });
    b.cil('caucho', 0.0095, 0.03, [s * 0.026 + s * 0.052, 0.038 - 0.27, 0.74 + 0.21], { rot: [0.9, s * 0.16, 0], seg: 8 });
  }
  b.cil('acero_c', 0.011, 0.07, [-0.036, 0.036, 0.74], { rot: [0, PI / 2, 0], seg: 8 });
  return { boca: [0, y, 1.18], manoIzq: [0, 0.01, 0.5], pose: 'pesada' };
}

function lanzagranadas(b) {
  const y = 0.1;
  b.perfil('composite_n', [[-0.04, 0.03], [0.05, 0.03], [0.04, -0.125], [-0.024, -0.13], [-0.05, -0.05]], 0.036, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('composite_g', [0.05, 0.056, 0.18], [0, 0.058, -0.0], 0.007);
  // tambor de seis granadas con las cámaras a la vista
  b.cil('acero', 0.075, 0.13, [0, y, 0.06], { seg: 22 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI + PI / 6; b.circ('negro', 0.0235, [Math.sin(a) * 0.046, y + Math.cos(a) * 0.046, 0.1903], [0, 0, 0], 14); b.toro('laton', 0.0245, 0.0035, [Math.sin(a) * 0.046, y + Math.cos(a) * 0.046, 0.1905], { seg: 14, rad: 5 }); }
  b.cil('acero_c', 0.014, 0.012, [0, y, 0.19], { seg: 12 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI; b.caja('acero_c', [0.01, 0.014, 0.12], [Math.sin(a) * 0.075, y + Math.cos(a) * 0.075, 0.125], 0.002, [0, 0, -a]); }
  b.cil('acero', 0.018, 0.04, [0, y, 0.02], { seg: 12 });
  canon(b, { mat: 'composite_g', y, z0: 0.19, z1: 0.46, r: 0.0345, r2: 0.0345, oct: true, ánima: false });
  b.cil('acero', 0.0375, 0.03, [0, y, 0.44], { seg: 14 }); boca(b, 0.47, y, 0.0375, { corona: false, ratio: 0.66 });
  carril(b, { y: y + 0.0425, z0: 0.0, z1: 0.46, w: 0.026, mat: 'composite_n' });
  for (const z of [0.24, 0.38]) b.caja('composite_n', [0.05, 0.02, 0.026], [0, y - 0.03, z], 0.004);
  b.perfil('composite_n', [[0.22, 0.07], [0.29, 0.07], [0.285, -0.07], [0.225, -0.07]], 0.032, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  // culata plegable de varillas con hombrera y alza de cuadrante
  b.tubo('composite_g', [[0.02, 0.08, -0.08], [0.02, 0.09, -0.34], [0.02, 0.04, -0.4]], 0.007, { seg: 12, rad: 6 });
  b.tubo('composite_g', [[-0.02, 0.08, -0.08], [-0.02, 0.09, -0.34], [-0.02, 0.04, -0.4]], 0.007, { seg: 12, rad: 6 });
  b.perfil('caucho', [[-0.42, 0.1], [-0.388, 0.1], [-0.388, -0.04], [-0.42, -0.04]], 0.07, [0, 0, 0], { suave: 0.006, bisel: 0.003 });
  b.perfil('acero', [[0.0, 0.0], [0.02, 0.0], [0.02, 0.06], [0.0, 0.06]], 0.004, [-0.032, y + 0.044, 0.1], { bisel: 0.0008 });
  guardamonte(b, { mat: 'composite_n', z: -0.04, y: 0.032, largo: 0.1, prof: 0.032, r: 0.0045 });
  return { boca: [0, y, 0.47], manoIzq: [0, 0.0, 0.255], pose: 'pesada' };
}

function pdw(b) {
  const y = 0.07;
  // diseño «bullpup»: el cargador queda tras la empuñadura y el cuerpo llega hasta el hombro
  b.perfil('composite_g', [[-0.34, 0.1], [0.2, 0.1], [0.2, 0.06], [0.1, 0.04], [0.0, 0.03], [-0.2, 0.012], [-0.34, -0.03], [-0.36, 0.04]], 0.044, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('composite_n', [[-0.34, 0.098], [-0.1, 0.1], [-0.1, 0.066], [-0.34, 0.066]], 0.048, [0, 0, 0], { suave: 0.008, bisel: 0.003 });
  b.perfil('caucho', [[-0.355, 0.1], [-0.34, 0.1], [-0.35, -0.03], [-0.368, 0.04]], 0.046, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.perfil('polimero', [[-0.04, 0.03], [0.044, 0.03], [0.034, -0.12], [-0.026, -0.125], [-0.046, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.perfil('composite_n', [[0.1, 0.05], [0.16, 0.05], [0.15, -0.05], [0.105, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });  // empuñadura delantera
  cargadorCaja(b, { mat: 'composite_n', z: -0.14, y: 0.014, largo: 0.19, w: 0.03, prof: 0.044, incl: -0.012 });
  b.cil('acero', 0.013, 0.2, [0, y + 0.008, 0.2], { seg: 12 });
  b.cil('composite_n', 0.021, 0.12, [0, y + 0.008, 0.27], { seg: 14 });                       // supresor
  for (const z of [0.3, 0.33, 0.36]) b.toro('composite_g', 0.0215, 0.0022, [0, y + 0.008, z], { seg: 14, rad: 4 });
  boca(b, 0.39, y + 0.008, 0.021, { corona: false, ratio: 0.3 });
  carril(b, { y: 0.108, z0: -0.2, z1: 0.18, w: 0.022, mat: 'composite_n' });
  visorPunto(b, { y: 0.116, z: 0.02, esc: 0.9 });
  guardamonte(b, { mat: 'composite_n', z: -0.07, y: 0.03, largo: 0.1, prof: 0.032, r: 0.0042 });
  b.cil('acero_c', 0.007, 0.02, [-0.026, 0.092, 0.05], { rot: [0, PI / 2, 0], seg: 8 });
  return { boca: [0, y + 0.008, 0.39], manoIzq: [0, 0.0, 0.13], pose: 'larga' };
}

function escopeta_automatica(b) {
  const y = 0.082;
  b.perfil('polimero', [[-0.05, 0.09], [-0.2, 0.09], [-0.4, 0.072], [-0.4, -0.05], [-0.3, -0.05], [-0.16, -0.035], [-0.05, 0.0]], 0.038, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('caucho', [[-0.412, 0.074], [-0.398, 0.074], [-0.398, -0.052], [-0.412, -0.054]], 0.042, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.perfil('polimero', [[-0.04, 0.03], [0.046, 0.03], [0.036, -0.12], [-0.024, -0.126], [-0.048, -0.05]], 0.036, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('composite_g', [0.052, 0.08, 0.34], [0, 0.066, 0.1], 0.008);
  b.caja('negro', [0.054, 0.016, 0.07], [0, 0.074, 0.08], 0.002);
  carril(b, { y: 0.112, z0: -0.07, z1: 0.3, w: 0.024, mat: 'composite_n' });
  canon(b, { mat: 'acero', y, z0: 0.26, z1: 0.76, r: 0.019, r2: 0.0185, ánima: false });
  b.cil('composite_n', 0.027, 0.3, [0, y, 0.3], { seg: 10 });
  for (let i = 0; i < 4; i++) { b.caja('negro', [0.011, 0.011, 0.04], [0.027, y, 0.35 + i * 0.065], 0.002); b.caja('negro', [0.011, 0.011, 0.04], [-0.027, y, 0.35 + i * 0.065], 0.002); }
  b.cil('composite_n', 0.026, 0.08, [0, y, 0.7], { seg: 12 });
  for (const z of [0.725, 0.745]) b.caja('negro', [0.054, 0.004, 0.006], [0, y, z], 0.001);
  boca(b, 0.78, y, 0.026, { corona: false, ratio: 0.55 });
  // cargador «petaca» de 12 cartuchos bajo la caja
  cargadorCaja(b, { mat: 'composite_n', z: 0.17, y: 0.03, largo: 0.19, w: 0.05, prof: 0.12, incl: 0.01 });
  guardamonte(b, { mat: 'composite_n', z: -0.09, y: 0.028, largo: 0.12, prof: 0.032, r: 0.0045 });
  visorPunto(b, { y: 0.12, z: 0.08, esc: 1 });
  b.perfil('composite_g', [[0.0, 0.0], [0.05, 0.0], [0.05, -0.1], [0.0, -0.1]], 0.026, [0, 0.03, 0.42], { suave: 0.008, bisel: 0.003 });
  return { boca: [0, y, 0.78], manoIzq: [0, -0.04, 0.445], pose: 'larga' };
}

function granada_frag(b) {
  // cuerpo ovoide segmentado (cuadrícula de fragmentación), tapa de espoleta, palanca y anilla de seguridad
  const y = 0.05, z = 0.02;
  b.esf('oliva', 0.047, [0, y, z], [1, 1.18, 1], 20);
  for (let i = -2; i <= 2; i++) b.toro('acero', 0.0472 * Math.sqrt(1 - Math.pow((i * 0.0215) / (0.047 * 1.18), 2)) + 0.001, 0.0017, [0, y + i * 0.0215, z], { seg: 20, rad: 4, rot: [PI / 2, 0, 0] });
  for (let i = 0; i < 8; i++) b.toro('acero', 0.0555, 0.0017, [0, y, z], { seg: 22, rad: 4, rot: [0, (i / 8) * PI, 0], esc: [1, 1.18, 1] });
  b.cil('acero_c', 0.0175, 0.034, [0, y + 0.047 * 1.18 - 0.004, z], { rot: [-PI / 2, 0, 0], seg: 12 });
  b.cil('oliva', 0.0165, 0.02, [0, y + 0.047 * 1.18 + 0.026, z], { rot: [-PI / 2, 0, 0], seg: 12, r2: 0.0125 });
  b.perfil('acero_c', [[0.0, 0.0], [0.014, 0.0], [0.016, -0.075], [0.006, -0.1], [0.0, -0.09]], 0.006, [0.0, y + 0.0555 + 0.01, z + 0.0], { bisel: 0.001 });
  b.toro('acero_c', 0.012, 0.0022, [0.0, y + 0.0555 + 0.04, z - 0.028], { seg: 14, rad: 5, rot: [0, PI / 2, 0] });
  b.cil('laton', 0.003, 0.03, [0.0, y + 0.0555 + 0.028, z - 0.012], { rot: [0, PI / 2, 0], seg: 5 });
  b.cil('em_rojo', 0.005, 0.002, [0, y + 0.0, z + 0.0462], { seg: 8 });
  return { boca: [0, y, z], manoIzq: null, pose: 'arrojadiza' };
}

function hacha_tactica(b) {
  // mango de polímero con empuñadura de cordón, cabeza de acero con filo y pico trasero
  b.cil('composite_n', 0.0185, 0.56, [0, 0, -0.12], { seg: 12 });
  b.cil('polimero', 0.0205, 0.22, [0, 0, -0.1], { seg: 12 });
  for (let i = 0; i < 12; i++) b.toro('caucho', 0.0205, 0.0022, [0, 0, -0.08 + i * 0.016], { seg: 12, rad: 4 });
  b.esf('composite_n', 0.0235, [0, 0, -0.125], [1, 1, 0.7], 10);
  b.tubo('em_ambar', [[0.0, 0.02, -0.14], [0.0, 0.06, -0.15], [0.0, 0.07, -0.1]], 0.0028, { seg: 8, rad: 4 });
  b.perfil('acero', [[0.4, 0.012], [0.44, 0.07], [0.5, 0.115], [0.58, 0.135], [0.62, 0.078], [0.57, 0.03], [0.585, -0.0], [0.57, -0.03], [0.5, -0.06], [0.44, -0.075]], 0.014, [0, 0, 0], { suave: 0.008, bisel: 0.0022 });
  b.perfil('acero_c', [[0.57, 0.136], [0.62, 0.078], [0.585, 0.036], [0.603, 0.08]], 0.016, [0, 0, 0], { bisel: 0.0005 });
  b.perfil('acero', [[0.43, -0.075], [0.5, -0.06], [0.52, -0.16], [0.47, -0.13], [0.42, -0.07]], 0.012, [0, 0, 0], { suave: 0.004, bisel: 0.0015 });
  b.cil('hierro', 0.024, 0.07, [0, 0, 0.4], { seg: 10 });
  return { boca: [0, 0.1, 0.6], manoIzq: null, pose: 'cuerpo' };
}

export const ARMAS_E4 = { carabina_tactica, pistola_tactica, rifle_antimaterial, lanzagranadas, pdw, escopeta_automatica, granada_frag, hacha_tactica };
