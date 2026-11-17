// Era 2 · Trincheras (1900–1949): subfusil de tambor, pistola semiautomática, fusil de cerrojo con mira, lanzallamas, carabina ligera,
// escopeta con bayoneta, granada de mango y pala de trinchera.
import { canon, guardamonte, cargadorTambor, cargadorCurvo, miraTelescopica, miraHierro, bayoneta, boca } from './piezas.js';

const PI = Math.PI;

/** Hendiduras de ventilación (negro) alrededor de un manguito cilíndrico. */
function ranuras(b, { y, z0, z1, r, n = 8, filas = [-PI / 2, -PI / 4, 0, PI / 4, PI / 2, PI * 0.75, PI], largo = 0.016 }) {
  const paso = (z1 - z0) / n;
  for (const a of filas) for (let i = 0; i < n; i++) {
    b.caja('negro', [0.007, 0.006, largo * 0.8], [Math.sin(a) * r * 1.0, y + Math.cos(a) * r * 1.0, z0 + paso * (i + 0.5)], 0.0015);
  }
}

function subfusil_trinchera(b) {
  const y = 0.066;
  // culata y pistolet de nogal
  b.perfil('nogal', [[-0.06, 0.09], [-0.46, 0.082], [-0.47, -0.045], [-0.33, -0.05], [-0.21, -0.035], [-0.12, -0.056], [-0.06, 0.0]], 0.034, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('nogal', [[-0.04, 0.03], [0.04, 0.03], [0.034, -0.125], [-0.016, -0.13], [-0.036, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.0028 });
  b.caja('acero', [0.036, 0.012, 0.046], [0, -0.131, 0.01], 0.003);
  // caja de mecanismo y manguito perforado con aletas de refrigeración
  b.caja('acero', [0.046, 0.074, 0.34], [0, y, 0.1], 0.007);
  b.caja('acero_c', [0.05, 0.02, 0.2], [0, y + 0.016, 0.05], 0.004);
  b.cil('acero', 0.03, 0.27, [0, y + 0.002, 0.27], { seg: 16 });
  ranuras(b, { y: y + 0.002, z0: 0.29, z1: 0.53, r: 0.0298, n: 10, filas: [PI / 2, -PI / 2, 0, PI] });
  for (const z of [0.3, 0.36, 0.42, 0.48, 0.54]) b.toro('acero', 0.0302, 0.0028, [0, y + 0.002, z], { seg: 20, rad: 5 });
  canon(b, { mat: 'acero', y: y + 0.002, z0: 0.5, z1: 0.66, r: 0.0115, ánima: false });
  b.cil('acero', 0.0185, 0.07, [0, y + 0.002, 0.6], { seg: 14 });  // compensador
  for (const z of [0.615, 0.635]) b.caja('negro', [0.04, 0.004, 0.006], [0, y + 0.0205, z], 0.001);
  boca(b, 0.67, y + 0.002, 0.0185, { mat: 'acero', corona: false, ratio: 0.45 });
  b.cil('acero', 0.0185, 0.01, [0, y + 0.002, 0.663], { seg: 14 });
  // empuñadura delantera vertical
  b.perfil('nogal', [[0.34, 0.034], [0.41, 0.034], [0.405, -0.1], [0.345, -0.1]], 0.034, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.caja('acero', [0.04, 0.012, 0.075], [0, 0.036, 0.375], 0.004);
  // cargador de tambor de 50 balas bajo la caja
  b.caja('acero', [0.034, 0.05, 0.06], [0, 0.005, 0.12], 0.004);
  cargadorTambor(b, { z: 0.12, y: -0.062, r: 0.085, w: 0.062, nerv: 12 });
  b.cil('laton', 0.02, 0.07, [-0.035, -0.062, 0.12], { rot: [0, PI / 2, 0], seg: 12 });
  // armado lateral, guardamonte, miras, alza y anilla de correa
  b.cil('acero', 0.011, 0.02, [-0.023, y + 0.026, 0.06], { rot: [0, PI / 2, 0], seg: 10 });
  guardamonte(b, { mat: 'acero', z: -0.075, y: 0.016, largo: 0.1, prof: 0.032, r: 0.0045 });
  b.caja('acero', [0.006, 0.026, 0.024], [0, y + 0.0375 + 0.026, 0.0], 0.0015);
  b.caja('acero', [0.03, 0.01, 0.026], [0, y + 0.047, 0.0], 0.002);
  b.caja('acero', [0.005, 0.018, 0.008], [0, y + 0.0465 + 0.0, 0.62], 0.001);
  b.toro('acero', 0.011, 0.0028, [0, 0.025, -0.44], { seg: 12, rad: 5, rot: [0, PI / 2, 0] });
  return { boca: [0, y + 0.002, 0.67], manoIzq: [0, -0.04, 0.375], pose: 'larga' };
}

function pistola_semiauto(b) {
  // armazón con su empuñadura inclinada, corredera con estrías, cañón y guardamonte
  b.perfil('acero', [[-0.05, 0.05], [0.14, 0.05], [0.14, 0.038], [0.06, 0.034], [0.044, 0.0], [0.03, -0.1], [-0.05, -0.105], [-0.058, -0.04]], 0.024, [0, 0, 0], { suave: 0.005, bisel: 0.0018 });
  b.perfil('madera_o', [[-0.05, 0.036], [0.034, 0.02], [0.026, -0.092], [-0.052, -0.096], [-0.055, -0.03]], 0.0315, [0, 0, 0], { suave: 0.007, bisel: 0.002 });
  b.caja('acero', [0.026, 0.012, 0.074], [0, -0.108, -0.01], 0.003);                // base del cargador
  b.caja('acero', [0.029, 0.04, 0.23], [0, 0.07, 0.07], 0.005);                  // corredera
  for (let i = 0; i < 7; i++) b.caja('negro', [0.031, 0.034, 0.003], [0, 0.07, -0.025 + i * 0.008], 0.0008); // estrías posteriores
  b.cil('acero_c', 0.0082, 0.02, [0, 0.07, 0.178], { seg: 10 });
  b.circ('negro', 0.0045, [0, 0.07, 0.1981], [0, 0, 0], 10);
  b.caja('acero', [0.004, 0.012, 0.012], [0, 0.095, 0.16], 0.001);                // punto de mira
  b.caja('acero', [0.014, 0.008, 0.012], [0, 0.095, -0.03], 0.0015);              // alza
  b.perfil('acero', [[-0.058, 0.052], [-0.082, 0.06], [-0.084, 0.044], [-0.06, 0.04]], 0.008, [0, 0, 0], { suave: 0.003, bisel: 0.001 }); // martillo
  guardamonte(b, { mat: 'acero', z: 0.005, y: 0.034, largo: 0.09, prof: 0.03, r: 0.0042 });
  b.cil('laton', 0.005, 0.034, [-0.0165, -0.03, -0.03], { rot: [0, PI / 2, 0], seg: 8 });
  return { boca: [0, 0.07, 0.2], manoIzq: null, pose: 'pistola' };
}

function fusil_cerrojo(b) {
  const y = 0.082;
  b.perfil('nogal', [[-0.42, 0.092], [-0.3, 0.07], [-0.2, 0.066], [-0.06, 0.075], [0.72, 0.074], [0.72, 0.05], [0.3, 0.046], [0.17, 0.022], [0.1, -0.012], [-0.02, -0.042], [-0.1, -0.05], [-0.18, -0.04], [-0.3, -0.07], [-0.42, -0.09]], 0.036, [0, 0, 0], { suave: 0.013, bisel: 0.003 });
  b.perfil('caucho', [[-0.43, 0.094], [-0.416, 0.094], [-0.416, -0.092], [-0.43, -0.092]], 0.04, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  canon(b, { mat: 'acero', y, z0: 0.1, z1: 1.04, r: 0.0138, r2: 0.0108 });
  b.cil('acero', 0.0125, 0.03, [0, y, 0.72], { seg: 12 });
  b.caja('hierro', [0.04, 0.045, 0.012], [0, 0.059, 0.724], 0.003);               // abrazadera
  // cajón cilíndrico, cerrojo y manija con bola, seguro y cargador de cinco tiros
  b.cil('acero', 0.0196, 0.25, [0, y, -0.12], { seg: 16 });
  b.caja('acero', [0.014, 0.012, 0.09], [0, y + 0.0185, 0.02], 0.003);
  b.cil('acero_c', 0.0125, 0.07, [0, y, -0.2], { seg: 12 });
  b.cil('acero_c', 0.008, 0.09, [0, y, -0.28], { seg: 10 });
  b.tubo('acero_c', [[-0.012, y, -0.06], [-0.045, y - 0.005, -0.065], [-0.075, y - 0.03, -0.065]], 0.0052, { seg: 10, rad: 6 });
  b.esf('acero_c', 0.0135, [-0.082, y - 0.0385, -0.065], 1, 12);
  b.caja('acero', [0.032, 0.058, 0.09], [0, 0.03, 0.045], 0.004);               // caja del cargador
  b.caja('acero_c', [0.028, 0.008, 0.08], [0, -0.003, 0.045], 0.002);
  guardamonte(b, { mat: 'acero', z: -0.075, y: 0.0, largo: 0.17, prof: 0.045, r: 0.0055 });
  // mira telescópica larga sobre soportes + alza y punto de mira
  miraTelescopica(b, { x: 0, y: 0.142, z: -0.08, largo: 0.33, r: 0.0165, soportes: [0.0, 0.26] });
  b.caja('acero', [0.006, 0.02, 0.014], [0, y + 0.0235, 1.0], 0.001);
  b.cil('acero', 0.008, 0.012, [0, y, 1.04], { seg: 10 });
  // portafusil de cuero y anillas
  b.toro('acero', 0.011, 0.0028, [0, 0.036, 0.6], { seg: 12, rad: 5, rot: [0, PI / 2, 0] });
  b.toro('acero', 0.011, 0.0028, [0, -0.055, -0.33], { seg: 12, rad: 5, rot: [0, PI / 2, 0] });
  return { boca: [0, y, 1.04], manoIzq: [0, 0.03, 0.44], pose: 'larga' };
}

function lanzallamas(b) {
  const y = 0.065;
  // empuñadura de pistola con disparador, varilla-lanza aislada con manguito de madera
  b.perfil('madera_o', [[-0.04, 0.03], [0.04, 0.03], [0.034, -0.12], [-0.016, -0.126], [-0.04, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('acero', [0.05, 0.05, 0.16], [0, 0.05, 0.02], 0.007);
  guardamonte(b, { mat: 'acero', z: -0.035, y: 0.026, largo: 0.1, prof: 0.032, r: 0.0042 });
  b.cil('acero', 0.0205, 0.8, [0, y, 0.0], { seg: 14, r2: 0.0205 });
  b.cil('madera_c', 0.03, 0.2, [0, y, 0.24], { seg: 14 });
  for (const z of [0.24, 0.43]) b.toro('laton', 0.0305, 0.0032, [0, y, z + 0.0], { seg: 16, rad: 5 });
  b.perfil('madera_c', [[0.5, 0.036], [0.56, 0.036], [0.55, -0.07], [0.505, -0.07]], 0.032, [0, 0, 0], { suave: 0.008, bisel: 0.0025 }); // segunda empuñadura
  b.rev('acero', [[0.0205, 0.8], [0.026, 0.82], [0.036, 0.87], [0.04, 0.88]], [0, y, 0], { seg: 16 });
  b.circ('negro', 0.027, [0, y, 0.8805], [0, 0, 0], 14);
  b.toro('laton', 0.0405, 0.0035, [0, y, 0.88], { seg: 16, rad: 5 });
  // encendedor con llama piloto
  b.tubo('acero', [[0, y - 0.0, 0.62], [0, y + 0.04, 0.72], [0, y + 0.05, 0.86]], 0.0045, { seg: 12, rad: 5 });
  b.esf('em_naranja', 0.011, [0, y + 0.0505, 0.875], [0.8, 1.7, 1.4], 8);
  // depósitos gemelos a la espalda, con válvulas, manómetro y correas; manguera hasta la lanza
  for (const x of [-0.085, 0.085]) {
    b.cil('oliva', 0.075, 0.5, [x, 0.0, -0.64], { seg: 18, r2: 0.075 });
    b.rev('oliva', [[0.0, -0.64], [0.05, -0.652], [0.075, -0.64]], [x, 0.0, 0], { seg: 18 });
    b.rev('oliva', [[0.075, -0.14], [0.058, -0.125], [0.0, -0.118]], [x, 0.0, 0], { seg: 18 });
    for (const z of [-0.57, -0.4, -0.24]) b.toro('hierro', 0.0765, 0.0055, [x, 0.0, z], { seg: 22, rad: 6 });
    b.cil('laton', 0.016, 0.03, [x, 0.074, -0.4], { rot: [-PI / 2, 0, 0], seg: 10 });
    b.esf('laton', 0.018, [x, 0.108, -0.4], 1, 10);
  }
  b.cil('acero', 0.03, 0.04, [0, 0.06, -0.44], { seg: 12, rot: [0, 0, 0] });
  b.cil('laton', 0.024, 0.02, [0, 0.082, -0.44], { seg: 12, rot: [0, 0, 0] });
  b.caja('hierro', [0.17, 0.014, 0.05], [0, 0.088, -0.28], 0.004);
  b.tubo('caucho', [[0.08, 0.05, -0.15], [0.07, 0.11, -0.04], [0.02, 0.1, 0.03], [0.0, 0.085, 0.07]], 0.0105, { seg: 22, rad: 8 });
  b.tubo('caucho', [[0.0, 0.088, -0.28], [0.02, 0.15, -0.12], [0.03, 0.15, -0.02], [0.012, 0.095, 0.05]], 0.0105, { seg: 22, rad: 8 });
  b.cil('laton', 0.013, 0.02, [0.0, 0.085, 0.045], { seg: 10 });
  return { boca: [0, y, 0.89], manoIzq: [0, 0.0, 0.53], pose: 'pesada' };
}

function carabina_m(b) {
  const y = 0.07;
  b.perfil('nogal', [[-0.43, 0.08], [-0.3, 0.064], [-0.16, 0.062], [-0.04, 0.074], [0.2, 0.074], [0.2, 0.04], [0.06, 0.036], [0.03, 0.0], [0.01, -0.04], [-0.07, -0.05], [-0.14, -0.04], [-0.22, -0.045], [-0.34, -0.055], [-0.43, -0.076]], 0.034, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('caucho', [[-0.44, 0.082], [-0.428, 0.082], [-0.428, -0.078], [-0.44, -0.078]], 0.038, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.caja('acero', [0.038, 0.05, 0.2], [0, 0.058, 0.07], 0.005);
  canon(b, { mat: 'acero', y, z0: 0.1, z1: 0.64, r: 0.0125, r2: 0.0108 });
  b.perfil('nogal', [[0.2, 0.092], [0.46, 0.09], [0.46, 0.048], [0.2, 0.04]], 0.036, [0, 0, 0], { suave: 0.01, bisel: 0.003 });  // guardamanos
  b.caja('acero', [0.04, 0.05, 0.016], [0, 0.07, 0.465], 0.004);                                                                   // abrazadera
  b.cil('acero', 0.01, 0.2, [0, y + 0.0235, 0.26], { seg: 10 });
  cargadorCurvo(b, { z: 0.05, y: 0.034, largo: 0.19, w: 0.024, prof: 0.032, curva: 0.07 });
  guardamonte(b, { mat: 'acero', z: -0.07, y: 0.012, largo: 0.1, prof: 0.032, r: 0.0045 });
  b.caja('acero', [0.012, 0.014, 0.034], [0, y + 0.0375, -0.01], 0.002); b.caja('acero', [0.004, 0.012, 0.01], [0, y + 0.018, 0.0], 0.001);
  b.caja('acero', [0.005, 0.02, 0.008], [0, y + 0.0215, 0.62], 0.001); b.caja('acero', [0.026, 0.006, 0.01], [0, y + 0.0128, 0.62], 0.001);
  b.cil('acero_c', 0.0075, 0.016, [-0.02, 0.06, 0.14], { rot: [0, PI / 2, 0], seg: 8 });
  b.toro('acero', 0.011, 0.0028, [0, -0.0, -0.4], { seg: 12, rad: 5, rot: [0, PI / 2, 0] });
  return { boca: [0, y, 0.64], manoIzq: [0, 0.03, 0.34], pose: 'larga' };
}

function escopeta_trinchera(b) {
  const y = 0.078;
  b.perfil('nogal', [[-0.43, 0.088], [-0.3, 0.066], [-0.16, 0.064], [-0.05, 0.075], [0.02, 0.07], [0.02, -0.03], [-0.07, -0.045], [-0.14, -0.04], [-0.22, -0.045], [-0.33, -0.055], [-0.43, -0.08]], 0.036, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('caucho', [[-0.44, 0.09], [-0.428, 0.09], [-0.428, -0.082], [-0.44, -0.082]], 0.04, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.caja('acero', [0.044, 0.07, 0.24], [0, 0.062, 0.1], 0.006);
  b.caja('negro', [0.046, 0.016, 0.07], [0, 0.07, 0.1], 0.002);                      // ventana de expulsión
  canon(b, { mat: 'acero', y, z0: 0.2, z1: 0.8, r: 0.0172, r2: 0.0165 });
  b.cil('hierro', 0.0265, 0.4, [0, y, 0.24], { seg: 16 });                           // cubrecañón perforado
  ranuras(b, { y, z0: 0.25, z1: 0.62, r: 0.0265, n: 12, filas: [PI / 2, -PI / 2, PI / 4, -PI / 4], largo: 0.016 });
  b.cil('acero', 0.0125, 0.52, [0, 0.0475, 0.14], { seg: 12 });                      // depósito tubular
  b.cil('acero', 0.014, 0.012, [0, 0.0475, 0.66], { seg: 12 });
  // guardamanos de corredera con estrías
  b.cil('madera_c', 0.028, 0.2, [0, 0.0475, 0.3], { seg: 14 });
  for (let i = 0; i < 6; i++) b.toro('madera_o', 0.0282, 0.0021, [0, 0.0475, 0.34 + i * 0.026], { seg: 14, rad: 4 });
  b.caja('acero', [0.012, 0.012, 0.09], [0, 0.0475, 0.285], 0.002);
  guardamonte(b, { mat: 'acero', z: -0.1, y: 0.03, largo: 0.12, prof: 0.035, r: 0.0045 });
  // bayoneta calada bajo la boca
  b.cil('acero', 0.014, 0.05, [0, 0.052, 0.72], { seg: 10 });
  b.perfil('acero_c', [[0.0, 0.0], [0.28, 0.0], [0.36, 0.006], [0.28, 0.02], [0.0, 0.022]], 0.005, [0, 0.032, 0.76], { bisel: 0.001 });
  b.caja('acero', [0.006, 0.02, 0.014], [0, y + 0.0275, 0.78], 0.001);
  return { boca: [0, y, 0.8], manoIzq: [0, 0.03, 0.4], pose: 'larga' };
}

function granada_mango(b) {
  // cabeza cilíndrica de chapa con estampado, mango de madera, anilla de tracción
  b.cil('madera_c', 0.0135, 0.34, [0, 0.0, -0.17], { seg: 12 });
  b.cil('hierro', 0.0425, 0.13, [0, 0.0, 0.16], { seg: 18 });
  b.rev('hierro', [[0.0425, 0.29], [0.036, 0.305], [0.02, 0.315], [0.0, 0.317]], [0, 0, 0], { seg: 18 });
  b.rev('hierro', [[0.0, 0.158], [0.03, 0.16], [0.0425, 0.162]], [0, 0, 0], { seg: 18 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI; b.caja('oxido', [0.006, 0.006, 0.12], [Math.sin(a) * 0.0425, Math.cos(a) * 0.0425, 0.225], 0.0015, [0, 0, -a]); }
  b.toro('acero', 0.0428, 0.003, [0, 0, 0.165], { seg: 20, rad: 5 }); b.toro('acero', 0.0428, 0.003, [0, 0, 0.285], { seg: 20, rad: 5 });
  b.cil('laton', 0.016, 0.03, [0, 0, -0.18], { seg: 12 });
  b.tubo('cuerda', [[0, 0, -0.19], [0.0, 0.02, -0.23], [0.03, 0.03, -0.26], [0.04, 0.0, -0.27]], 0.003, { seg: 12, rad: 5 });
  b.toro('acero_c', 0.011, 0.0025, [0.04, -0.012, -0.27], { seg: 12, rad: 5, rot: [PI / 2, 0, 0] });
  return { boca: [0, 0, 0.3], manoIzq: null, pose: 'arrojadiza' };
}

function pala_trinchera(b) {
  // mango corto de fresno con pomo y virola, hoja de acero afilada
  b.cil('madera_c', 0.0165, 0.58, [0, 0, -0.14], { seg: 12 });
  b.esf('madera_c', 0.027, [0, 0, -0.145], [1, 1, 1.15], 12);
  b.cil('hierro', 0.022, 0.07, [0, 0, 0.42], { seg: 12, r2: 0.0165 });
  b.perfil('acero', [[0.465, 0.014], [0.5, 0.06], [0.58, 0.092], [0.7, 0.088], [0.74, 0.0], [0.7, -0.088], [0.58, -0.092], [0.5, -0.06], [0.465, -0.014]], 0.005, [0, 0, 0], { suave: 0.02, bisel: 0.0015 });
  b.perfil('acero_c', [[0.69, 0.088], [0.74, 0.0], [0.69, -0.088], [0.7, -0.088], [0.745, 0.0], [0.7, 0.088]], 0.0062, [0, 0, 0], { bisel: 0.0004 });
  b.perfil('hierro', [[0.47, 0.01], [0.62, 0.012], [0.64, 0.0], [0.62, -0.012], [0.47, -0.01]], 0.012, [0, 0, 0], { suave: 0.004, bisel: 0.002 });
  b.cil('acero', 0.005, 0.01, [0.0, 0.05, 0.54], { seg: 6, rot: [0, PI / 2, 0] });
  return { boca: [0, 0, 0.74], manoIzq: null, pose: 'cuerpo' };
}

export const ARMAS_E2 = { subfusil_trinchera, pistola_semiauto, fusil_cerrojo, lanzallamas, carabina_m, escopeta_trinchera, granada_mango, pala_trinchera };
