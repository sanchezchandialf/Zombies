// Era 1 · Vapor (1850–1899): repetición de palanca, revólveres, escopetas de cañones paralelos, dinamita y machete.
import { canon, abrazaderas, guardamonte, tamborRevolver, boca, bobina } from './piezas.js';

const PI = Math.PI;

function rifle_palanca(b) {
  const y = 0.078;
  // culata recta de nogal con cantonera de latón
  b.perfil('nogal', [[-0.5, 0.082], [-0.3, 0.07], [-0.1, 0.062], [0.0, 0.07], [0.02, 0.0], [-0.02, -0.03], [-0.1, -0.03], [-0.2, -0.04], [-0.32, -0.056], [-0.5, -0.07]], 0.036, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('laton', [[-0.512, 0.086], [-0.497, 0.086], [-0.497, -0.074], [-0.512, -0.078]], 0.04, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  // caja de mecanismo de latón (cuerpo alargado con ventana de carga)
  b.caja('laton', [0.04, 0.074, 0.25], [0, 0.046, 0.1], 0.008);
  b.caja('laton', [0.043, 0.02, 0.07], [0, 0.07, 0.05], 0.004);
  b.perfil('acero', [[0.03, 0.03], [0.15, 0.03], [0.17, 0.052], [0.04, 0.056]], 0.003, [0.0205, 0, 0], { suave: 0.004, bisel: 0.0008 });
  b.perfil('acero', [[0.03, 0.03], [0.15, 0.03], [0.17, 0.052], [0.04, 0.056]], 0.003, [-0.0205, 0, 0], { suave: 0.004, bisel: 0.0008 });
  // cañón octogonal y cargador tubular bajo el cañón
  canon(b, { mat: 'acero', y, z0: 0.15, z1: 0.76, r: 0.0152, r2: 0.0145, oct: true });
  b.cil('acero', 0.0115, 0.5, [0, 0.0405, 0.15], { seg: 12 });
  b.cil('laton', 0.0125, 0.02, [0, 0.0405, 0.64], { seg: 12 });
  b.perfil('madera_c', [[0.2, 0.052], [0.62, 0.052], [0.62, 0.012], [0.2, 0.02]], 0.034, [0, 0, 0], { suave: 0.006, bisel: 0.0025 });
  // palanca de acero: la anilla cae bajo la mano y rodea el gatillo
  const lever = [[0.1, 0.02, 0.0], [0.16, 0.0, -0.06], [0.14, -0.07, -0.12], [0.0, -0.1, -0.16], [-0.11, -0.085, -0.15], [-0.12, -0.03, -0.12]];
  b.tubo('acero', lever.map(([z, y]) => [0, y, z]).map((p, i) => p), 0.0062, { seg: 24, rad: 6 });
  b.perfil('acero', [[0, 0], [0.006, 0], [0.003, -0.026], [-0.01, -0.027]], 0.004, [0, 0.01, 0.0], { bisel: 0.0008 });
  // martillo con cresta moleteada
  b.perfil('acero', [[-0.04, 0.09], [-0.015, 0.1], [-0.005, 0.094], [-0.03, 0.065]], 0.008, [0, 0.0, 0.03], { suave: 0.003, bisel: 0.001 });
  b.perfil('acero', [[-0.07, 0.112], [-0.045, 0.118], [-0.04, 0.1], [-0.06, 0.092]], 0.008, [0, 0, 0.065], { suave: 0.003, bisel: 0.001 });
  // miras: alza de campo y punto de mira con funda
  b.caja('acero', [0.006, 0.014, 0.01], [0, y + 0.0215, 0.24], 0.001);
  b.caja('acero', [0.026, 0.006, 0.016], [0, y + 0.017, 0.24], 0.0015);
  b.caja('laton', [0.006, 0.014, 0.012], [0, y + 0.0215, 0.74], 0.001);
  // anillas de portacorrea
  b.toro('acero', 0.012, 0.0028, [0, 0.0, -0.4], { seg: 12, rad: 5, rot: [0, PI / 2, 0] });
  return { boca: [0, y, 0.76], manoIzq: [0, 0.015, 0.42], pose: 'larga' };
}

function revolverPieza(b, { grip = 'nogal', tono = 'acero', barra = 0.25 } = {}) {
  const y = 0.056;
  // armazón con puente superior y guardamonte de latón
  b.perfil(tono, [[-0.05, 0.088], [0.07, 0.086], [0.07, 0.03], [0.04, 0.018], [-0.005, 0.01], [-0.045, 0.04]], 0.03, [0, 0, 0], { suave: 0.006, bisel: 0.002 });
  tamborRevolver(b, { z: 0.0, y, R: 0.0315, l: 0.062, n: 6, prof: 0.0055, mat: tono });
  canon(b, { mat: tono, y, z0: 0.06, z1: barra, r: 0.0118, oct: true });
  b.cil(tono, 0.013, 0.012, [0, y, 0.06], { seg: 8, oct: true });
  // varilla de extracción con su alojamiento
  b.cil('acero', 0.0058, 0.16, [0, y - 0.0275, 0.075], { seg: 8 });
  b.cil('acero', 0.0095, 0.03, [0, y - 0.0275, 0.2], { seg: 8 });
  b.caja('laton', [0.006, 0.012, 0.01], [0, y + 0.0155, barra - 0.02], 0.001);
  // mira trasera (en el puente) y martillo con cresta
  b.perfil(tono, [[-0.045, 0.086], [-0.088, 0.078], [-0.098, 0.1], [-0.082, 0.112], [-0.06, 0.1], [-0.04, 0.1]], 0.012, [0, 0.0, 0.0], { suave: 0.004, bisel: 0.0015 });
  // empuñadura de nogal en pico de pájaro
  b.perfil(grip, [[-0.05, 0.062], [0.012, 0.044], [0.02, -0.01], [0.012, -0.1], [-0.02, -0.126], [-0.09, -0.118], [-0.1, -0.08], [-0.08, -0.03], [-0.075, 0.02]], 0.03, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('laton', [[0.01, 0.0], [0.016, -0.0], [0.014, -0.1], [-0.025, -0.13], [-0.03, -0.12], [0.004, -0.095]], 0.033, [0, 0, 0], { bisel: 0.0015 });
  guardamonte(b, { z: -0.04, y: 0.003, largo: 0.1, prof: 0.032, r: 0.0042 });
  b.cil('laton', 0.008, 0.032, [-0.016, -0.0, -0.05], { rot: [0, PI / 2, 0], seg: 8 }); // tornillo de la cacha
}

function revolver(b) {
  revolverPieza(b, {});
  return { boca: [0, 0.056, 0.25], manoIzq: null, pose: 'pistola' };
}

function revolveres_gemelos(b) {
  for (const x of [0, 0.38]) b.en([x, 0, 0], () => revolverPieza(b, { grip: 'madera_c', tono: 'cromo', barra: 0.22 }));
  return { boca: [0, 0.056, 0.22], bocaIzq: [0.38, 0.056, 0.22], manoIzq: [0.38, -0.04, 0], doble: true, pose: 'doble' };
}

function rifle_bufalo(b) {
  const y = 0.088;
  b.perfil('nogal', [[-0.45, 0.095], [-0.36, 0.074], [-0.15, 0.068], [-0.05, 0.088], [0.06, 0.088], [0.7, 0.082], [0.7, 0.04], [0.15, 0.036], [0.05, 0.01], [-0.02, -0.035], [-0.1, -0.045], [-0.22, -0.035], [-0.34, -0.075], [-0.45, -0.1]], 0.04, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
  b.perfil('laton', [[-0.462, 0.1], [-0.447, 0.1], [-0.435, -0.09], [-0.463, -0.1]], 0.044, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  // bloque de mecanismo («falling block») de acero y palanca inferior prolongada
  b.caja('acero', [0.042, 0.088, 0.16], [0, 0.07, 0.05], 0.007);
  b.perfil('acero_c', [[-0.03, 0.02], [0.12, 0.02], [0.14, 0.06], [-0.01, 0.1]], 0.004, [0.0215, 0, 0.02], { suave: 0.006, bisel: 0.001 });
  b.perfil('acero_c', [[-0.03, 0.02], [0.12, 0.02], [0.14, 0.06], [-0.01, 0.1]], 0.004, [-0.0215, 0, 0.02], { suave: 0.006, bisel: 0.001 });
  b.tubo('acero', [[0, 0.02, 0.09], [0, -0.01, 0.12], [0, -0.095, 0.1], [0, -0.14, -0.02], [0, -0.13, -0.16], [0, -0.09, -0.19], [0, -0.04, -0.17]], 0.0075, { seg: 28, rad: 6 });
  // cañón octogonal pesado con anillas
  canon(b, { mat: 'acero', y, z0: 0.12, z1: 1.04, r: 0.0235, r2: 0.0205, oct: true });
  b.cil('acero', 0.0232, 0.02, [0, y, 0.12], { seg: 8, oct: true });
  for (const z of [0.26, 0.5, 0.74]) b.caja('hierro', [0.044, 0.036, 0.014], [0, 0.048, z], 0.004);
  // martillo exterior, mira de pínula en la cola y punto de mira
  b.perfil('acero', [[-0.04, 0.112], [-0.02, 0.124], [-0.005, 0.115], [-0.03, 0.085]], 0.008, [0, 0, 0.0], { suave: 0.004, bisel: 0.001 });
  b.cil('acero', 0.0035, 0.07, [0, 0.12, -0.06], { rot: [-PI / 2 * 0.2, 0, 0], seg: 6 });
  b.cil('laton', 0.011, 0.006, [0, 0.19, -0.067], { seg: 12, rot: [PI / 2, 0, 0] });
  b.caja('laton', [0.006, 0.018, 0.014], [0, y + 0.032, 1.0], 0.001);
  // mira telescópica fina de latón montada sobre el cañón
  b.cil('laton', 0.0095, 0.42, [0, y + 0.0385, 0.08], { seg: 10 });
  b.cil('acero', 0.014, 0.034, [0, y + 0.0385, 0.07], { seg: 12, r2: 0.0095 });
  b.cil('acero', 0.014, 0.05, [0, y + 0.0385, 0.48], { seg: 12, r2: 0.0125 });
  b.circ('cristal', 0.012, [0, y + 0.0385, 0.5305], [0, 0, 0], 14);
  for (const z of [0.14, 0.4]) b.caja('acero', [0.012, 0.03, 0.02], [0, y + 0.019, z], 0.003);
  return { boca: [0, y, 1.04], manoIzq: [0, 0.04, 0.5], pose: 'larga' };
}

/** Escopeta de cañones paralelos con percutores externos. */
function escopetaCañones(b, { largo = 0.72, culata = true, y = 0.074 } = {}) {
  const x = 0.0165;
  if (culata) {
    b.perfil('nogal', [[-0.4, 0.07], [-0.3, 0.052], [-0.1, 0.052], [-0.02, 0.07], [0.0, 0.0], [-0.03, -0.04], [-0.1, -0.05], [-0.2, -0.045], [-0.3, -0.04], [-0.4, -0.06]], 0.038, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
    b.perfil('caucho', [[-0.41, 0.072], [-0.397, 0.072], [-0.397, -0.062], [-0.41, -0.062]], 0.04, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  } else {
    // recortada: empuñadura de pistola de nogal
    b.perfil('nogal', [[-0.02, 0.07], [0.02, 0.01], [0.0, -0.06], [-0.04, -0.14], [-0.1, -0.12], [-0.1, -0.06], [-0.07, 0.0], [-0.1, 0.05], [-0.06, 0.075]], 0.036, [0, 0, 0], { suave: 0.012, bisel: 0.003 });
    b.caja('laton', [0.04, 0.02, 0.05], [0, -0.14, -0.07], 0.005, [0.5, 0, 0]);
  }
  for (const s of [-1, 1]) {
    canon(b, { mat: 'acero', x: s * x, y, z0: 0.02, z1: largo, r: 0.0168, r2: 0.0168 });
  }
  b.caja('acero', [0.014, 0.008, largo - 0.04], [0, y + 0.0165, 0.02 + (largo - 0.04) / 2], 0.002); // cinta ventilada
  b.caja('acero', [0.012, 0.01, largo - 0.04], [0, y - 0.0165, 0.02 + (largo - 0.04) / 2], 0.002);
  b.caja('laton', [0.006, 0.01, 0.008], [0, y + 0.0235, largo - 0.02], 0.001); // punto de mira
  // bloque de bisagra grabado y llave de apertura
  b.caja('acero_c', [0.05, 0.062, 0.12], [0, 0.043, 0.0], 0.008);
  b.perfil('acero_c', [[-0.05, 0.01], [0.04, 0.0], [0.06, 0.05], [-0.04, 0.074]], 0.0036, [0.0265, 0.0, 0.0], { suave: 0.006, bisel: 0.001 });
  b.perfil('acero_c', [[-0.05, 0.01], [0.04, 0.0], [0.06, 0.05], [-0.04, 0.074]], 0.0036, [-0.0265, 0.0, 0.0], { suave: 0.006, bisel: 0.001 });
  // avancarga de nogal con ventana de latón y percutores externos
  b.perfil('nogal', [[0.1, 0.044], [0.46, 0.046], [0.46, 0.02], [0.28, 0.01], [0.1, 0.014]], 0.044, [0, 0, 0], { suave: 0.008, bisel: 0.003 });
  for (const s of [-1, 1]) {
    b.perfil('acero', [[-0.01, 0.0], [0.006, 0.0], [0.008, 0.03], [0.034, 0.05], [0.04, 0.058], [0.02, 0.062], [-0.004, 0.044]], 0.008, [s * 0.0265 + s * 0.004, y - 0.01, -0.01], { suave: 0.003, bisel: 0.0012 });
    b.cil('laton', 0.0055, 0.01, [s * 0.0265, y + 0.01, 0.025], { rot: [0, PI / 2, 0], seg: 8 });
  }
  guardamonte(b, { mat: 'acero', z: -0.09, y: -0.015, largo: 0.12, prof: 0.04, gatillo: false });
  b.perfil('acero', [[0, 0], [0.004, 0], [0.002, -0.025], [-0.008, -0.026]], 0.004, [0, 0.0, -0.045], { bisel: 0.0008 });
  b.perfil('acero', [[0, 0], [0.004, 0], [0.002, -0.025], [-0.008, -0.026]], 0.004, [0, 0.0, -0.065], { bisel: 0.0008 });
}

function escopeta_doble(b) {
  escopetaCañones(b, { largo: 0.74 });
  return { boca: [0, 0.074, 0.74], bocaIzq: null, manoIzq: [0, 0.02, 0.34], pose: 'pesada' };
}

function recortada(b) {
  escopetaCañones(b, { largo: 0.3, culata: false });
  return { boca: [0, 0.074, 0.3], manoIzq: [0, 0.02, 0.17], pose: 'larga' };
}

function dinamita(b) {
  const largo = 0.2;
  const palo = (x, y) => {
    b.cil('rojo_dinamita', 0.0135, largo, [x, y, -0.06], { seg: 14 });
    b.cil('papel', 0.0138, 0.012, [x, y, -0.06], { seg: 14 });
    b.cil('papel', 0.0138, 0.012, [x, y, -0.06 + largo - 0.012], { seg: 14 });
    b.circ('papel', 0.0136, [x, y, -0.0605], [0, PI, 0], 14);
    b.circ('papel', 0.0136, [x, y, -0.06 + largo + 0.0005], [0, 0, 0], 14);
  };
  const y0 = 0.045;
  palo(-0.0145, y0); palo(0.0145, y0); palo(0, y0 + 0.0255);
  // ataduras de cuerda
  for (const z of [0.0, 0.07]) {
    b.toro('cuerda', 0.0263, 0.0033, [0, y0 + 0.0085, z], { seg: 24, rad: 6 });
  }
  b.tubo('cuerda', [[0, y0 + 0.0255, 0.14], [0.006, y0 + 0.0255, 0.16], [0.012, y0 + 0.04, 0.18], [0.008, y0 + 0.058, 0.2], [0.012, y0 + 0.07, 0.19]], 0.0035, { seg: 14, rad: 5 });
  b.esf('mecha', 0.0072, [0.012, y0 + 0.0705, 0.189], 1, 8);
  return { boca: [0, y0, 0.14], manoIzq: null, pose: 'arrojadiza' };
}

function machete(b) {
  // mango de nogal con remaches, cantonera de latón, hoja ancha con filo en panza y punta recortada
  b.perfil('nogal', [[-0.12, 0.019], [-0.08, 0.023], [0.06, 0.02], [0.074, 0.0], [0.06, -0.022], [-0.08, -0.023], [-0.12, -0.016], [-0.125, 0.0]], 0.022, [0, 0, 0], { suave: 0.008, bisel: 0.003 });
  for (const z of [-0.07, -0.01, 0.04]) b.cil('laton', 0.0046, 0.028, [-0.014, 0.0, z], { rot: [0, PI / 2, 0], seg: 8 });
  b.perfil('laton', [[-0.133, 0.02], [-0.12, 0.02], [-0.12, -0.018], [-0.133, -0.016]], 0.024, [0, 0, 0], { suave: 0.003, bisel: 0.002 });
  b.caja('acero', [0.012, 0.05, 0.016], [0, 0.0, 0.07], 0.003);
  b.tubo('cuerda', [[0, -0.018, -0.12], [0, -0.07, -0.12], [0, -0.1, -0.09], [0, -0.07, -0.06]], 0.004, { seg: 14, rad: 5 });
  b.perfil('acero_c', [[0.075, 0.017], [0.5, 0.019], [0.64, 0.022], [0.72, 0.012], [0.74, -0.008], [0.62, -0.03], [0.4, -0.044], [0.2, -0.04], [0.075, -0.026]], 0.0055, [0, 0, 0], { suave: 0.004, bisel: 0.001 });
  b.perfil('acero', [[0.11, 0.004], [0.62, 0.006], [0.62, 0.003], [0.11, 0.001]], 0.0064, [0, 0, 0], { bisel: 0.0003 });
  return { boca: [0, 0.0, 0.74], manoIzq: null, pose: 'cuerpo' };
}

export const ARMAS_E1 = { rifle_palanca, revolver, rifle_bufalo, escopeta_doble, revolveres_gemelos, recortada, dinamita, machete };
