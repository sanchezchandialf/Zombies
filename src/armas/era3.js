// Era 3 · Atómica (1950–1999): fusil de asalto de cargador curvo, magnum, francotirador semiautomático, lanzacohetes tubular,
// subfusil compacto de culata de alambre, escopeta de corredera, cóctel molotov y bate con clavos.
import { canon, guardamonte, cargadorCurvo, cargadorCaja, miraTelescopica, miraHierro, carril, tamborRevolver, boca } from './piezas.js';

const PI = Math.PI;

function fusil_asalto(b) {
  const y = 0.078;
  b.perfil('polimero', [[-0.05, 0.088], [-0.45, 0.072], [-0.455, -0.056], [-0.3, -0.046], [-0.12, -0.03], [-0.05, 0.0]], 0.032, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('caucho', [[-0.465, 0.076], [-0.452, 0.076], [-0.457, -0.06], [-0.47, -0.06]], 0.036, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.perfil('polimero', [[-0.04, 0.03], [0.045, 0.03], [0.034, -0.125], [-0.022, -0.13], [-0.046, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  // cajón: tapa acanalada, ventana de expulsión y palanca de armado
  b.caja('acero', [0.042, 0.076, 0.34], [0, 0.062, 0.1], 0.007);
  b.caja('acero_c', [0.044, 0.016, 0.3], [0, 0.103, 0.1], 0.004);
  b.caja('negro', [0.046, 0.016, 0.07], [0, 0.07, 0.12], 0.002);
  b.cil('acero_c', 0.007, 0.03, [-0.02, 0.07, 0.07], { rot: [0, PI / 2, 0], seg: 8 });
  // guardamanos de madera superior e inferior, tubo de gases y cañón
  b.perfil('madera_c', [[0.26, 0.104], [0.56, 0.1], [0.56, 0.082], [0.26, 0.084]], 0.036, [0, 0, 0], { suave: 0.008, bisel: 0.003 });
  b.perfil('madera_c', [[0.26, 0.07], [0.58, 0.066], [0.58, 0.014], [0.34, 0.0], [0.26, 0.02]], 0.044, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  for (let i = 0; i < 6; i++) b.caja('madera_o', [0.046, 0.003, 0.02], [0, 0.03, 0.34 + i * 0.04], 0.001);
  b.cil('acero', 0.0075, 0.3, [0, 0.109, 0.3], { seg: 8 });
  canon(b, { mat: 'acero', y, z0: 0.3, z1: 0.8, r: 0.0118, r2: 0.0108, ánima: false });
  b.caja('acero', [0.026, 0.05, 0.026], [0, 0.086, 0.6], 0.004);
  // guía del punto de mira con base y freno de boca con ranuras
  b.perfil('acero', [[0.7, 0.075], [0.73, 0.075], [0.725, 0.14], [0.705, 0.14]], 0.008, [0, 0, 0], { bisel: 0.001 });
  b.cil('acero', 0.0035, 0.03, [0, 0.14, 0.7], { seg: 6 });
  b.cil('acero', 0.0175, 0.075, [0, y, 0.775], { seg: 14 });
  for (const z of [0.795, 0.815]) b.caja('negro', [0.04, 0.004, 0.006], [0, y + 0.0172, z], 0.001);
  boca(b, 0.85, y, 0.0175, { corona: false, ratio: 0.45 });
  cargadorCurvo(b, { z: 0.09, y: 0.026, largo: 0.26, w: 0.032, prof: 0.044, curva: 0.12 });
  guardamonte(b, { mat: 'acero', z: -0.1, y: 0.026, largo: 0.11, prof: 0.034, r: 0.0045 });
  miraHierro(b, { y: y + 0.03, zF: 0.0, zT: 0.2 });
  b.toro('acero', 0.011, 0.0028, [0, 0.03, -0.42], { seg: 12, rad: 5, rot: [0, PI / 2, 0] });
  return { boca: [0, y, 0.85], manoIzq: [0, 0.03, 0.4], pose: 'larga' };
}

function magnum(b) {
  const y = 0.062;
  b.perfil('acero_c', [[-0.055, 0.09], [0.075, 0.088], [0.075, 0.03], [0.04, 0.02], [-0.005, 0.01], [-0.05, 0.04]], 0.032, [0, 0, 0], { suave: 0.006, bisel: 0.002 });
  tamborRevolver(b, { z: 0.0, y, R: 0.0345, l: 0.07, n: 6, prof: 0.0028, mat: 'acero_c' });
  canon(b, { mat: 'acero_c', y, z0: 0.07, z1: 0.34, r: 0.0152 });
  b.caja('acero_c', [0.026, 0.026, 0.23], [0, y - 0.015, 0.19], 0.005);        // contrapeso inferior
  b.caja('acero', [0.011, 0.007, 0.26], [0, y + 0.0185, 0.2], 0.0015);         // cinta ventilada
  for (let i = 0; i < 8; i++) b.caja('negro', [0.0114, 0.0074, 0.008], [0, y + 0.0187, 0.1 + i * 0.03], 0.0005);
  b.caja('acero', [0.006, 0.02, 0.012], [0, y + 0.032, 0.325], 0.001);
  b.caja('acero', [0.016, 0.01, 0.026], [0, 0.098, -0.01], 0.002);
  b.perfil('acero', [[-0.055, 0.086], [-0.09, 0.076], [-0.1, 0.1], [-0.082, 0.114], [-0.062, 0.1]], 0.012, [0, 0, 0], { suave: 0.004, bisel: 0.0015 });
  // empuñadura de revólver: estrecha, inclinada hacia atrás y proporcionada al armazón (con la talla horneada ×1,3)
  b.perfil('nogal', [[-0.048, 0.046], [0.004, 0.034], [0.008, 0.0], [-0.004, -0.06], [-0.026, -0.086], [-0.072, -0.084], [-0.084, -0.06], [-0.074, -0.014], [-0.072, 0.022]], 0.034, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.caja('acero_c', [0.036, 0.008, 0.05], [0, -0.085, -0.05], 0.003);   // tapa del talón
  guardamonte(b, { mat: 'acero_c', z: -0.04, y: 0.003, largo: 0.11, prof: 0.034, r: 0.0045 });
  return { boca: [0, y, 0.34], manoIzq: null, pose: 'pistola' };
}

function rifle_francotirador(b) {
  const y = 0.082;
  b.perfil('polimero', [[-0.04, 0.088], [-0.46, 0.09], [-0.46, -0.07], [-0.35, -0.062], [-0.24, -0.03], [-0.12, -0.02], [-0.06, 0.02]], 0.036, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('polimero_c', [[-0.2, 0.096], [-0.4, 0.098], [-0.4, 0.07], [-0.2, 0.07]], 0.04, [0, 0, 0], { suave: 0.006, bisel: 0.003 });   // moflete regulable
  b.perfil('caucho', [[-0.472, 0.092], [-0.46, 0.092], [-0.46, -0.072], [-0.472, -0.074]], 0.04, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.perfil('polimero', [[-0.04, 0.03], [0.042, 0.03], [0.032, -0.125], [-0.022, -0.13], [-0.044, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('acero', [0.044, 0.074, 0.46], [0, 0.063, 0.14], 0.007);
  carril(b, { y: 0.106, z0: -0.08, z1: 0.36, w: 0.03, mat: 'acero' });
  b.cil('polimero', 0.0345, 0.46, [0, y, 0.3], { seg: 16 });                          // guardamanos tubular
  for (let i = 0; i < 9; i++) b.caja('negro', [0.0125, 0.0125, 0.022], [0.034, y, 0.33 + i * 0.045], 0.002), b.caja('negro', [0.0125, 0.0125, 0.022], [-0.034, y, 0.33 + i * 0.045], 0.002);
  canon(b, { mat: 'acero', y, z0: 0.74, z1: 1.04, r: 0.0165, r2: 0.0148, ánima: false });
  // freno de boca grande con lumbreras
  b.cil('acero', 0.025, 0.1, [0, y, 1.0], { seg: 14, r2: 0.025 });
  for (const z of [1.03, 1.055, 1.08]) { b.caja('negro', [0.054, 0.005, 0.008], [0, y, z], 0.001); b.caja('negro', [0.005, 0.054, 0.008], [0, y, z], 0.001); }
  boca(b, 1.1, y, 0.025, { corona: false, ratio: 0.38 });
  miraTelescopica(b, { x: 0, y: 0.158, z: -0.06, largo: 0.38, r: 0.0195, soportes: [0.02, 0.3] });
  cargadorCaja(b, { z: 0.14, y: 0.025, largo: 0.12, w: 0.03, prof: 0.07, incl: 0.0 });
  guardamonte(b, { mat: 'acero', z: -0.09, y: 0.026, largo: 0.12, prof: 0.034, r: 0.0045 });
  // bípodo plegado bajo el guardamanos
  for (const s of [-1, 1]) b.cil('acero', 0.0055, 0.2, [s * 0.026, 0.044, 0.58], { seg: 8 });
  b.caja('acero', [0.07, 0.016, 0.028], [0, 0.046, 0.575], 0.004);
  b.caja('acero', [0.005, 0.018, 0.01], [0, y + 0.0345, 0.99], 0.0008);
  return { boca: [0, y, 1.1], manoIzq: [0, 0.03, 0.5], pose: 'larga' };
}

function lanzacohetes(b) {
  const y = 0.152, r = 0.056;
  // tubo, bocas ensanchadas, ojiva del cohete asomando y banda de color
  b.cil('oliva', r, 1.05, [0, y, -0.34], { seg: 22 });
  b.rev('oliva', [[r, -0.34], [r + 0.012, -0.36], [r + 0.03, -0.43], [r + 0.034, -0.45]], [0, y, 0], { seg: 22 });
  b.circ('negro', r + 0.025, [0, y, -0.4501], [0, PI, 0], 20);
  b.toro('hierro', r + 0.033, 0.006, [0, y, -0.448], { seg: 24, rad: 6 });
  b.rev('oliva', [[r, 0.71], [r + 0.012, 0.74], [r + 0.02, 0.75]], [0, y, 0], { seg: 22 });
  b.rev('hierro', [[0.043, 0.7], [0.043, 0.82], [0.036, 0.9], [0.02, 0.97], [0.004, 1.01]], [0, y, 0.0], { seg: 18 });
  b.toro('laton', 0.044, 0.004, [0, y, 0.8], { seg: 20, rad: 5 });
  for (let i = 0; i < 4; i++) b.caja('hierro', [0.002, 0.045, 0.06], [Math.sin(i * PI / 2) * 0.043, y + Math.cos(i * PI / 2) * 0.043, 0.72], 0.0005, [0, 0, -i * PI / 2]);
  for (const z of [-0.1, 0.4]) b.toro('hierro', r + 0.0035, 0.004, [0, y, z], { seg: 22, rad: 5 });
  b.cil('acero', 0.011, 0.04, [0, y + r, 0.28], { rot: [-PI / 2, 0, 0], seg: 8 });
  // hombrera, empuñadura con gatillo, empuñadura delantera y mira abatible
  b.perfil('caucho', [[-0.12, 0.2], [0.04, 0.2], [0.04, 0.1], [-0.12, 0.1]], 0.05, [0, 0, 0], { suave: 0.012, bisel: 0.004 });
  b.perfil('polimero', [[-0.04, 0.086], [0.045, 0.086], [0.034, -0.12], [-0.022, -0.125], [-0.046, -0.05]], 0.034, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  b.caja('acero', [0.05, 0.03, 0.16], [0, 0.092, 0.01], 0.006);
  guardamonte(b, { mat: 'acero', z: -0.05, y: 0.074, largo: 0.1, prof: 0.032, r: 0.0042 });
  b.perfil('polimero', [[0.34, 0.1], [0.4, 0.1], [0.394, -0.06], [0.346, -0.06]], 0.032, [0, 0, 0], { suave: 0.008, bisel: 0.003 });
  b.caja('acero', [0.03, 0.02, 0.1], [0, 0.092, 0.37], 0.004);
  b.perfil('acero', [[0.0, 0.0], [0.03, 0.0], [0.03, 0.05], [0.0, 0.05]], 0.004, [r + 0.012, y + 0.01, 0.12], { bisel: 0.0008 });
  b.perfil('acero', [[0.0, 0.0], [0.016, 0.0], [0.016, 0.034], [0.0, 0.034]], 0.004, [r + 0.012, y + 0.01, 0.55], { bisel: 0.0008 });
  return { boca: [0, y, 1.0], manoIzq: [0, 0.03, 0.37], pose: 'pesada' };
}

function subfusil_compacto(b) {
  const y = 0.07;
  // cuerpo de chapa estampada con nervios y empuñadura que aloja el cargador
  b.caja('acero', [0.046, 0.066, 0.32], [0, y, 0.06], 0.008);
  for (let i = 0; i < 5; i++) b.caja('acero_c', [0.048, 0.01, 0.006], [0, y + 0.03, -0.05 + i * 0.045], 0.0012);
  b.perfil('polimero', [[-0.045, 0.036], [0.05, 0.036], [0.04, -0.14], [-0.03, -0.145], [-0.05, -0.05]], 0.036, [0, 0, 0], { suave: 0.01, bisel: 0.003 });
  cargadorCaja(b, { z: 0.01, y: -0.14, largo: 0.17, w: 0.03, prof: 0.046, incl: 0.0, mat: 'acero' });
  canon(b, { mat: 'acero', y, z0: 0.22, z1: 0.46, r: 0.0125, ánima: false });
  b.cil('acero', 0.022, 0.22, [0, y, 0.26], { seg: 14 });
  b.cil('acero', 0.0165, 0.04, [0, y, 0.46], { seg: 12 });
  boca(b, 0.5, y, 0.0165, { corona: false, ratio: 0.45 });
  for (let i = 0; i < 6; i++) b.caja('negro', [0.046, 0.005, 0.012], [0, y, 0.285 + i * 0.03], 0.001, [0, 0, 0]);
  // culata plegable de alambre: marco de varilla con placa
  const x = 0.026;
  b.tubo('acero', [[x, y + 0.01, -0.09], [x, y + 0.012, -0.3], [x, y - 0.03, -0.38], [x, y - 0.06, -0.38]], 0.0058, { seg: 12, rad: 6 });
  b.tubo('acero', [[-x, y + 0.01, -0.09], [-x, y + 0.012, -0.3], [-x, y - 0.03, -0.38], [-x, y - 0.06, -0.38]], 0.0058, { seg: 12, rad: 6 });
  b.perfil('caucho', [[-0.395, y + 0.0], [-0.375, y + 0.0], [-0.375, y - 0.09], [-0.395, y - 0.09]], 0.056, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  guardamonte(b, { mat: 'acero', z: -0.07, y: 0.036, largo: 0.1, prof: 0.032, r: 0.0042 });
  b.caja('acero', [0.006, 0.024, 0.016], [0, y + 0.047, 0.01], 0.001); b.caja('acero', [0.004, 0.016, 0.008], [0, y + 0.04, 0.45], 0.001);
  b.cil('acero_c', 0.008, 0.02, [-0.03, y + 0.01, 0.0], { rot: [0, PI / 2, 0], seg: 8 });
  // empuñadura delantera abatible
  b.perfil('polimero', [[0.24, 0.045], [0.285, 0.045], [0.28, -0.07], [0.245, -0.07]], 0.028, [0, 0, 0], { suave: 0.006, bisel: 0.002 });
  return { boca: [0, y, 0.5], manoIzq: [0, 0.0, 0.265], pose: 'larga' };
}

function escopeta_corredera(b) {
  const y = 0.078;
  b.perfil('nogal', [[-0.44, 0.09], [-0.3, 0.066], [-0.16, 0.064], [-0.05, 0.076], [0.02, 0.072], [0.02, -0.03], [-0.07, -0.045], [-0.14, -0.04], [-0.22, -0.045], [-0.34, -0.052], [-0.44, -0.084]], 0.038, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('caucho', [[-0.452, 0.092], [-0.438, 0.092], [-0.438, -0.086], [-0.452, -0.086]], 0.042, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.caja('acero', [0.046, 0.072, 0.26], [0, 0.062, 0.11], 0.007);
  b.caja('negro', [0.048, 0.015, 0.08], [0, 0.072, 0.11], 0.002);
  canon(b, { mat: 'acero', y, z0: 0.24, z1: 0.84, r: 0.0172, r2: 0.0168 });
  b.caja('acero', [0.012, 0.007, 0.58], [0, y + 0.0215, 0.54], 0.0015);                     // cinta ventilada
  b.caja('laton', [0.005, 0.01, 0.01], [0, y + 0.0275, 0.82], 0.001);
  b.cil('acero', 0.0125, 0.6, [0, 0.046, 0.18], { seg: 12 });                               // depósito de 8 cartuchos
  b.cil('acero', 0.0135, 0.014, [0, 0.046, 0.76], { seg: 12 });
  // guardamanos de corredera con estrías
  b.perfil('nogal', [[0.28, 0.062], [0.54, 0.062], [0.54, 0.014], [0.28, 0.014]], 0.048, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  for (let i = 0; i < 7; i++) b.caja('madera_o', [0.05, 0.004, 0.006], [0, 0.0145, 0.3 + i * 0.03], 0.001), b.caja('madera_o', [0.05, 0.004, 0.006], [0, 0.0615, 0.3 + i * 0.03], 0.001);
  b.caja('acero', [0.012, 0.014, 0.18], [0.0, 0.046, 0.18], 0.002);
  guardamonte(b, { mat: 'acero', z: -0.09, y: 0.03, largo: 0.12, prof: 0.035, r: 0.0045 });
  b.perfil('acero', [[0, 0], [0.012, 0], [0.012, -0.03], [0, -0.03]], 0.004, [0.0, 0.0, 0.04], { bisel: 0.0008 });
  b.toro('acero', 0.011, 0.0028, [0, 0.02, -0.4], { seg: 12, rad: 5, rot: [0, PI / 2, 0] });
  return { boca: [0, y, 0.84], manoIzq: [0, 0.03, 0.42], pose: 'larga' };
}

function molotov(b) {
  // botella de vidrio con líquido ámbar, etiqueta, trapo encendido; inclinada 45° hacia delante y arriba
  b.en([0, 0.04, -0.02], () => {
    b.rev('vidrio_c', [[0.0, 0.0], [0.036, 0.0], [0.04, 0.012], [0.04, 0.17], [0.036, 0.2], [0.02, 0.235], [0.013, 0.26], [0.013, 0.31], [0.017, 0.318], [0.017, 0.33], [0.0, 0.33]], [0, 0, 0], { seg: 18 });
    b.rev('liquido_ambar', [[0.0, 0.004], [0.034, 0.004], [0.037, 0.014], [0.037, 0.13], [0.0, 0.13]], [0, 0, 0], { seg: 16 });
    b.cil('papel', 0.0408, 0.06, [0, 0, 0.055], { seg: 18 });
    b.cil('rojo_dinamita', 0.0412, 0.008, [0, 0, 0.065], { seg: 18 });
    b.cil('rojo_dinamita', 0.0412, 0.008, [0, 0, 0.097], { seg: 18 });
    // trapo empapado que asoma por el gollete
    b.tubo('lona', [[0, 0, 0.3], [0.004, 0.002, 0.34], [0.014, 0.01, 0.37], [0.012, 0.02, 0.395]], 0.0075, { seg: 12, rad: 5 });
    b.tubo('lona', [[0.004, -0.004, 0.31], [-0.006, -0.004, 0.345], [-0.016, 0.0, 0.37]], 0.0055, { seg: 10, rad: 5 });
    // llama
    b.esf('em_naranja', 0.024, [0.012, 0.02, 0.42], [1, 1, 1.7], 10);
    b.esf('mecha', 0.012, [0.012, 0.02, 0.415], [1, 1, 1.5], 8);
  }, [-PI / 3.2, 0, 0]);
  return { boca: [0, 0.2, 0.2], manoIzq: null, pose: 'arrojadiza' };
}

function bate(b) {
  // fresno torneado: mango fino con cinta, cuerpo ensanchado, base redondeada y clavos
  b.rev('madera_c', [[0.0, -0.14], [0.03, -0.138], [0.032, -0.12], [0.0185, -0.09], [0.014, -0.02], [0.0145, 0.15], [0.02, 0.3], [0.03, 0.46], [0.038, 0.62], [0.04, 0.72], [0.036, 0.8], [0.024, 0.85], [0.0, 0.87]], [0, 0, 0], { seg: 18 });
  b.cil('cuero', 0.0165, 0.2, [0, 0, -0.08], { seg: 12 });
  for (let i = 0; i < 8; i++) b.toro('oxido', 0.0166, 0.0016, [0, 0, -0.07 + i * 0.024], { seg: 12, rad: 4 });
  // clavos radiales en espiral por la cabeza (punta cónica y cabeza embutida)
  for (let i = 0; i < 24; i++) {
    const a = i * 2.4, z = 0.46 + (i % 12) * 0.03, r = 0.0295 + (z - 0.4) * 0.03;
    b.en([0, 0, 0], () => {
      b.cil('acero_c', 0.0036, 0.04, [0, r - 0.006, z], { rot: [-PI / 2, 0, 0], seg: 5, r2: 0.0008 });
      b.cil('oxido', 0.0062, 0.003, [0, r - 0.0035, z], { rot: [-PI / 2, 0, 0], seg: 7 });
    }, [0, 0, -a]);
  }
  return { boca: [0, 0, 0.87], manoIzq: null, pose: 'cuerpo' };
}

export const ARMAS_E3 = { fusil_asalto, magnum, rifle_francotirador, lanzacohetes, subfusil_compacto, escopeta_corredera, molotov, bate };
