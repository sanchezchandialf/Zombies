// Torretas automáticas del Ingeniero, una por era. Cada fábrica devuelve { base, cabeza, canones, posCabeza, posCanones, boca, altura, radio }
// base = estático · cabeza = gira en Y (+Z hacia delante) · canones = grupo dentro de la cabeza que gira en Z al disparar (opcional).
import { Constructor, canon, boca, aletas, bobina, celda, abrazaderas, gToro } from './piezas.js';

const PI = Math.PI;
const trio = (n) => Array.from({ length: n }, (_, i) => (i / n) * 2 * PI);

/** Rueda con eje X: llanta, cubo y radios. */
export function rueda(b, { x = 0, y = 0, z = 0, R = 0.5, ancho = 0.07, radios = 12, mat = 'madera_c', llanta = 'hierro', cubo = 'laton' } = {}) {
  b.toro(mat, R * 0.93, 0.045, [x, y, z], { seg: 26, rad: 8, rot: [0, PI / 2, 0], esc: [1, 1, ancho / 0.09] });
  b.toro(llanta, R, 0.016, [x, y, z], { seg: 30, rad: 6, rot: [0, PI / 2, 0], esc: [1, 1, ancho / 0.032] });
  b.cil(mat, 0.06, ancho * 1.5, [x - ancho * 0.75, y, z], { seg: 12, rot: [0, PI / 2, 0] });
  b.cil(cubo, 0.04, ancho * 1.9, [x - ancho * 0.95, y, z], { seg: 12, rot: [0, PI / 2, 0] });
  for (let i = 0; i < radios; i++) {
    const a = (i / radios) * 2 * PI;
    b.caja(mat, [ancho * 0.55, R * 0.88, 0.036], [x, y + Math.sin(a) * R * 0.44, z + Math.cos(a) * R * 0.44], 0.006, [PI / 2 - a, 0, 0]);
  }
}

/** Saco terrero (lona rellena). */
export function saco(b, x, y, z, ry = 0, s = 1) {
  b.caja('lona', [0.5 * s, 0.22 * s, 0.3 * s], [x, y, z], 0.085 * s, [0, ry, 0.0], 3);
  b.toro('cuerda', 0.1 * s, 0.01 * s, [x + Math.sin(ry) * 0.2 * s, y + 0.02, z + Math.cos(ry) * 0.2 * s], { seg: 8, rad: 4, rot: [0, ry, 0] });
}

function trípode(b, { y = 1.0, radio = 0.7, r = 0.035, mat = 'madera_o', pies = 'hierro', angulos = [PI / 2, PI / 2 + 2 * PI / 3, PI / 2 + 4 * PI / 3] } = {}) {
  for (const a of angulos) {
    const fx = Math.cos(a) * radio, fz = Math.sin(a) * radio;
    b.tubo(mat, [[0, y - 0.02, 0], [fx * 0.5, y * 0.5, fz * 0.5], [fx, 0.03, fz]], r, { seg: 8, rad: 8 });
    b.cil(pies, r * 1.7, 0.07, [fx, 0.0, fz], { rot: [-PI / 2, 0, 0], seg: 8, r2: r * 1.1 });
  }
}

// ───────────────────────────── 0 · Órgano de relojería ─────────────────────────────
function organo() {
  const base = new Constructor(), cab = new Constructor();
  trípode(base, { y: 0.96, radio: 0.72 });
  base.cil('hierro', 0.09, 0.12, [0, 0.86, 0], { rot: [-PI / 2, 0, 0], seg: 14 });
  base.cil('laton', 0.115, 0.03, [0, 0.98, 0], { rot: [-PI / 2, 0, 0], seg: 20 });
  base.eng('laton', 0.13, 14, 0.02, [0, 0.9, 0], [PI / 2, 0, 0], { hueco: 0.35 });
  for (const a of trio(3)) base.caja('hierro', [0.05, 0.05, 0.3], [Math.sin(a) * 0.17, 0.62, Math.cos(a) * 0.17], 0.01, [0, a, 0]);
  // cabeza: bastidor de nogal con 7 cañones de mosquete en abanico horizontal
  cab.caja('hierro', [0.52, 0.04, 0.1], [0, -0.075, 0.0], 0.008);
  for (const s of [-1, 1]) cab.caja('hierro', [0.04, 0.13, 0.1], [s * 0.27, -0.01, 0.0], 0.008);
  cab.caja('nogal', [0.5, 0.1, 0.26], [0, 0.0, -0.1], 0.02);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.062;
    canon(cab, { mat: 'acero', x, y: 0.02, z0: -0.1, z1: 1.0, r: 0.0235, r2: 0.0205 });
    cab.perfil('acero_c', [[0, 0], [0.014, 0], [0.012, 0.045], [0.034, 0.066], [0.03, 0.075], [0.006, 0.058], [-0.01, 0.026]], 0.008, [x, 0.04, -0.02], { suave: 0.003, bisel: 0.001 });
    cab.caja('laton', [0.02, 0.012, 0.03], [x, 0.046, 0.04], 0.002);
  }
  for (const z of [0.25, 0.55, 0.85]) {
    cab.caja('laton', [0.46, 0.07, 0.02], [0, 0.02, z], 0.008);
    cab.caja('laton', [0.46, 0.012, 0.03], [0, 0.058, z], 0.004);
  }
  // mecanismo de relojería lateral: caja de latón con engranajes, muelle y manivela
  cab.caja('laton', [0.1, 0.2, 0.22], [0.34, 0.0, -0.08], 0.012);
  cab.eng('acero_c', 0.085, 16, 0.016, [0.4, 0.03, -0.08], [0, PI / 2, 0], { hueco: 0.3 });
  cab.eng('laton', 0.05, 10, 0.016, [0.4, 0.075, -0.0], [0, PI / 2, 0], { hueco: 0.3 });
  cab.eng('hierro', 0.04, 8, 0.016, [0.4, -0.06, -0.14], [0, PI / 2, 0], { hueco: 0.3 });
  cab.cil('acero', 0.01, 0.12, [0.4, 0.03, -0.08], { rot: [0, PI / 2, 0], seg: 8 });
  cab.tubo('hierro', [[0.4, 0.03, -0.08], [0.46, 0.0, -0.1], [0.5, -0.08, -0.06]], 0.008, { seg: 10, rad: 5 });
  cab.esf('madera_o', 0.022, [0.51, -0.09, -0.055], 1, 8);
  // llaves de cuerda en el bastidor
  return { base: base, cabeza: cab, canones: null, posCabeza: [0, 1.06, 0], boca: [0, 0.02, 1.0], altura: 1.3, radio: 0.75 };
}

// ───────────────────────────── 1 · Mini-Gatling de manivela ─────────────────────────────
function miniGatling() {
  const base = new Constructor(), cab = new Constructor(), can = new Constructor();
  trípode(base, { y: 0.92, radio: 0.62, mat: 'hierro', pies: 'acero' });
  base.cil('laton', 0.1, 0.1, [0, 0.82, 0], { rot: [-PI / 2, 0, 0], seg: 16 });
  base.cil('hierro', 0.07, 0.2, [0, 0.72, 0], { rot: [-PI / 2, 0, 0], seg: 12 });
  base.toro('laton', 0.1, 0.012, [0, 0.92, 0], { seg: 18, rad: 6, rot: [PI / 2, 0, 0] });
  // cabeza: horquilla, tambor de alimentación superior, caja de mecanismo y manivela
  for (const s of [-1, 1]) cab.perfil('hierro', [[-0.18, -0.08], [0.28, -0.08], [0.3, 0.1], [0.12, 0.17], [-0.12, 0.15]], 0.03, [s * 0.1, 0.0, 0.0], { suave: 0.03, bisel: 0.004 });
  cab.caja('laton', [0.2, 0.17, 0.3], [0, 0.0, 0.1], 0.02);
  cab.cil('laton', 0.085, 0.14, [0, 0.19, 0.02], { rot: [-PI / 2, 0, 0], seg: 20, r2: 0.07 });
  cab.cil('hierro', 0.09, 0.02, [0, 0.185, 0.02], { rot: [-PI / 2, 0, 0], seg: 20 });
  cab.cil('hierro', 0.092, 0.015, [0, 0.33, 0.02], { rot: [-PI / 2, 0, 0], seg: 20 });
  cab.cil('laton', 0.02, 0.04, [0, 0.34, 0.02], { rot: [-PI / 2, 0, 0], seg: 10 });
  cab.cil('laton', 0.06, 0.14, [0, 0.06, 0.28], { seg: 16 });
  // manivela lateral con volante
  cab.cil('hierro', 0.012, 0.22, [0.1, 0.0, -0.08], { rot: [0, PI / 2, 0], seg: 8 });
  cab.tubo('hierro', [[0.3, 0.0, -0.08], [0.36, 0.1, -0.08], [0.36, 0.1, -0.02]], 0.012, { seg: 10, rad: 6 });
  cab.cil('madera_o', 0.02, 0.07, [0.36, 0.1, -0.02], { seg: 10 });
  cab.eng('laton', 0.07, 16, 0.014, [0.18, 0.0, -0.08], [0, PI / 2, 0], { hueco: 0.25 });
  // grupo de seis cañones giratorios con aros de latón
  const n = 6, rr = 0.045, z0 = 0.2, z1 = 0.95;
  can.cil('laton', 0.026, 0.06, [0, 0, 0.0], { seg: 12 });
  for (const a of trio(n)) {
    const x = Math.sin(a) * rr, y = Math.cos(a) * rr;
    canon(can, { mat: 'acero', x, y, z0: 0.0, z1: z1 - z0, r: 0.016, r2: 0.0145 });
  }
  for (const z of [0.12, 0.4, 0.55]) can.cil('laton', 0.072, 0.03, [0, 0, z], { seg: 20 });
  can.toro('laton', 0.07, 0.01, [0, 0, 0.68], { seg: 20, rad: 6 });
  can.cil('hierro', 0.026, z1 - z0, [0, 0, 0.0], { seg: 10 });
  return { base, cabeza: cab, canones: can, posCabeza: [0, 1.0, 0], posCanones: [0, 0.06, z0], boca: [0, 0.06, z1], altura: 1.35, radio: 0.7 };
}

// ───────────────────────────── 2 · Torreta Maxim con escudo ─────────────────────────────
function maxim() {
  const base = new Constructor(), cab = new Constructor();
  trípode(base, { y: 0.84, radio: 0.62, mat: 'oliva', pies: 'hierro', r: 0.032 });
  base.cil('hierro', 0.1, 0.14, [0, 0.74, 0], { rot: [-PI / 2, 0, 0], seg: 14 });
  for (const a of trio(3)) base.caja('hierro', [0.04, 0.04, 0.34], [Math.sin(a + PI / 3) * 0.16, 0.5, Math.cos(a + PI / 3) * 0.16], 0.008, [0.5, a + PI / 3, 0]);
  // escudo de plancha con aspillera y remaches
  cab.perfil('oliva', [[0.0, -0.3], [0.0, 0.3], [0.03, 0.34], [0.03, -0.34]], 0.78, [0, 0.12, 0.38], { suave: 0.01, bisel: 0.005 });
  cab.caja('negro', [0.1, 0.07, 0.03], [0, 0.17, 0.41], 0.004);
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) cab.cil('acero_c', 0.014, 0.01, [s * 0.34, -0.12 + i * 0.12, 0.405], { seg: 8 });
  cab.perfil('acero', [[0.0, 0.0], [0.04, 0.0], [0.04, 0.12], [0.0, 0.12]], 0.82, [0, 0.14, 0.41], { bisel: 0.003 });
  // ametralladora de agua: manguito refrigerante, cañón, mecanismo y cinta de munición
  cab.cil('acero', 0.056, 0.62, [0, 0.14, 0.2], { seg: 18 });
  cab.cil('laton', 0.062, 0.03, [0, 0.14, 0.2], { seg: 18 });
  cab.cil('laton', 0.058, 0.03, [0, 0.14, 0.78], { seg: 18 });
  cab.cil('laton', 0.02, 0.04, [0, 0.2, 0.46], { rot: [-PI / 2, 0, 0], seg: 10 });
  canon(cab, { mat: 'acero', y: 0.14, z0: 0.8, z1: 1.0, r: 0.016, r2: 0.018 });
  cab.caja('hierro', [0.14, 0.16, 0.3], [0, 0.14, 0.0], 0.015);
  cab.caja('hierro', [0.1, 0.1, 0.12], [0, 0.22, 0.02], 0.01);
  cab.tubo('hierro', [[-0.04, 0.2, -0.08], [-0.12, 0.24, -0.2], [-0.12, 0.12, -0.3], [-0.04, 0.1, -0.34]], 0.01, { seg: 12, rad: 5 });
  cab.cil('madera_o', 0.022, 0.07, [-0.06, 0.1, -0.34], { rot: [0, PI / 2, 0], seg: 8 }); cab.cil('madera_o', 0.022, 0.07, [-0.01, 0.1, -0.34], { rot: [0, PI / 2, 0], seg: 8 });
  // caja de cinta y cinta con balas
  cab.caja('oliva', [0.12, 0.16, 0.22], [0.2, 0.0, 0.0], 0.012);
  cab.tubo('laton', [[0.14, 0.04, 0.0], [0.1, 0.1, 0.0], [0.06, 0.16, 0.0]], 0.014, { seg: 12, rad: 6, rot: [0, 0, 0] });
  cab.caja('hierro', [0.15, 0.03, 0.16], [0.2, 0.09, 0.0], 0.005);
  return { base, cabeza: cab, canones: null, posCabeza: [0, 0.9, 0], boca: [0, 0.14, 1.0], altura: 1.3, radio: 0.7 };
}

// ───────────────────────────── 3 · Centinela de los 80 ─────────────────────────────
function centinela() {
  const base = new Constructor(), cab = new Constructor();
  // pedestal cilíndrico de cromo con patas laterales y franjas de neón
  base.cil('cromo', 0.3, 0.1, [0, 0.0, 0], { rot: [-PI / 2, 0, 0], seg: 24 });
  base.cil('composite_n', 0.2, 0.55, [0, 0.1, 0], { rot: [-PI / 2, 0, 0], seg: 20, r2: 0.15 });
  base.toro('em_magenta', 0.205, 0.008, [0, 0.34, 0], { seg: 28, rad: 5, rot: [PI / 2, 0, 0] });
  base.toro('em_cian', 0.155, 0.008, [0, 0.62, 0], { seg: 28, rad: 5, rot: [PI / 2, 0, 0] });
  for (const a of trio(3)) base.caja('cromo', [0.06, 0.05, 0.26], [Math.sin(a) * 0.3, 0.03, Math.cos(a) * 0.3], 0.01, [0, a, 0]);
  // cabeza: carcasa aerodinámica en cuña, ojo de sensor rojo, doble cañón con disipador
  cab.perfil('composite_g', [[-0.28, -0.14], [-0.28, 0.16], [0.0, 0.2], [0.3, 0.1], [0.3, -0.1], [0.0, -0.14]], 0.36, [0, 0, 0], { suave: 0.05, bisel: 0.01 });
  cab.perfil('cromo', [[-0.2, 0.18], [0.0, 0.22], [0.2, 0.14], [0.0, 0.16]], 0.2, [0, 0.0, 0], { suave: 0.02, bisel: 0.004 });
  cab.cil('composite_n', 0.1, 0.05, [0, 0.22, 0.08], { rot: [-PI / 2, 0, 0], seg: 16 });
  cab.esf('em_rojo', 0.06, [0, 0.27, 0.08], 1, 14);
  cab.toro('cromo', 0.07, 0.008, [0, 0.265, 0.08], { seg: 16, rad: 5, rot: [PI / 2, 0, 0] });
  for (const s of [-1, 1]) {
    cab.cil('composite_n', 0.04, 0.28, [s * 0.1, -0.02, 0.28], { seg: 14 });
    canon(cab, { mat: 'cromo', x: s * 0.1, y: -0.02, z0: 0.5, z1: 0.78, r: 0.026, r2: 0.022, ánima: true });
    for (let i = 0; i < 4; i++) cab.toro('composite_g', 0.04, 0.005, [s * 0.1, -0.02, 0.33 + i * 0.045], { seg: 14, rad: 4 });
    cab.cil('em_cian', 0.045, 0.012, [s * 0.1, -0.02, 0.28 + 0.2], { seg: 14 });
    cab.cil('cromo', 0.036, 0.06, [s * 0.1, -0.02, 0.76], { seg: 12, r2: 0.032 });
  }
  cab.caja('em_magenta', [0.38, 0.012, 0.012], [0, 0.0, 0.31], 0.002);
  cab.caja('composite_n', [0.09, 0.14, 0.2], [0.0, -0.13, -0.14], 0.01);
  return { base, cabeza: cab, canones: null, posCabeza: [0, 0.82, 0], boca: [0.0, -0.02, 0.82], altura: 1.15, radio: 0.5 };
}

// ───────────────────────────── 4 · Torreta automática con sensor ─────────────────────────────
function automatica() {
  const base = new Constructor(), cab = new Constructor();
  // plataforma con estabilizadores y anillo de giro
  base.cil('composite_g', 0.34, 0.1, [0, 0.0, 0], { rot: [-PI / 2, 0, 0], seg: 8 });
  for (const a of trio(4)) { base.caja('composite_n', [0.1, 0.06, 0.34], [Math.sin(a + PI / 4) * 0.4, 0.04, Math.cos(a + PI / 4) * 0.4], 0.012, [0, a + PI / 4, 0]); base.cil('caucho', 0.05, 0.03, [Math.sin(a + PI / 4) * 0.52, 0.0, Math.cos(a + PI / 4) * 0.52], { rot: [-PI / 2, 0, 0], seg: 10 }); }
  base.cil('composite_n', 0.17, 0.38, [0, 0.1, 0], { rot: [-PI / 2, 0, 0], seg: 18, r2: 0.13 });
  base.toro('em_cian', 0.15, 0.006, [0, 0.46, 0], { seg: 24, rad: 5, rot: [PI / 2, 0, 0] });
  // cabeza: carcasa blindada con sensor esférico, cañón de carril, cargador de tambor
  cab.perfil('composite_g', [[-0.24, -0.12], [-0.24, 0.12], [0.0, 0.18], [0.22, 0.1], [0.28, -0.04], [0.1, -0.12]], 0.34, [0, 0, 0], { suave: 0.04, bisel: 0.008 });
  cab.perfil('composite_n', [[-0.2, 0.1], [0.0, 0.17], [0.2, 0.09], [0.0, 0.11]], 0.26, [0, 0.0, 0], { suave: 0.02, bisel: 0.004 });
  cab.esf('composite_n', 0.085, [0, 0.19, 0.04], 1, 16);
  cab.esf('em_cian', 0.05, [0, 0.2, 0.09], 1, 12);
  cab.circ('em_blanco', 0.02, [0, 0.2, 0.139], [0, 0, 0], 10);
  cab.toro('composite_g', 0.06, 0.008, [0, 0.2, 0.09], { seg: 18, rad: 5 });
  cab.caja('composite_n', [0.09, 0.09, 0.45], [0, 0.02, 0.4], 0.016);
  canon(cab, { mat: 'acero', y: 0.02, z0: 0.5, z1: 0.98, r: 0.022, r2: 0.02, ánima: false });
  cab.cil('composite_n', 0.036, 0.1, [0, 0.02, 0.9], { seg: 12 });
  for (const z of [0.92, 0.95]) cab.caja('negro', [0.08, 0.005, 0.01], [0, 0.02, z], 0.001);
  boca(cab, 1.0, 0.02, 0.036, { corona: false, ratio: 0.45 });
  for (const s of [-1, 1]) cab.cil('composite_n', 0.11, 0.07, [s * 0.2, -0.02, -0.04], { rot: [0, PI / 2, 0], seg: 18 });
  cab.cil('em_cian', 0.05, 0.075, [0.2, -0.02, -0.04], { rot: [0, PI / 2, 0], seg: 12 });
  for (const s of [-1, 1]) cab.cil('composite_g', 0.012, 0.3, [s * 0.1, 0.1, 0.3], { seg: 6 });
  return { base, cabeza: cab, canones: null, posCabeza: [0, 0.78, 0], boca: [0, 0.02, 1.0], altura: 1.1, radio: 0.55 };
}

// ───────────────────────────── 5 · Torreta láser ─────────────────────────────
function laser() {
  const base = new Constructor(), cab = new Constructor(), can = new Constructor();
  // pilón esbelto de composite con anillo luminoso y base hexagonal flotante
  base.cil('composite_g', 0.3, 0.06, [0, 0.0, 0], { rot: [-PI / 2, 0, 0], seg: 6 });
  base.toro('em_cian', 0.26, 0.008, [0, 0.07, 0], { seg: 6, rad: 5, rot: [PI / 2, 0, 0] });
  base.cil('composite', 0.12, 0.55, [0, 0.06, 0], { rot: [-PI / 2, 0, 0], seg: 16, r2: 0.07 });
  for (const a of trio(3)) base.caja('composite', [0.04, 0.4, 0.04], [Math.sin(a) * 0.2, 0.26, Math.cos(a) * 0.2], 0.01, [Math.cos(a) * 0.0, a, 0]);
  base.toro('em_magenta', 0.09, 0.007, [0, 0.4, 0], { seg: 22, rad: 5, rot: [PI / 2, 0, 0] });
  base.esf('composite_n', 0.09, [0, 0.64, 0], 1, 16);
  // cabeza: cápsula blanca con lente, anillos enfocadores (giran) y aletas de disipación
  cab.rev('composite', [[0.0, -0.3], [0.1, -0.28], [0.15, -0.15], [0.15, 0.2], [0.11, 0.34], [0.08, 0.4]], [0, 0.0, 0], { seg: 22 });
  cab.cil('composite_n', 0.155, 0.02, [0, 0, 0.0], { seg: 22 }); cab.cil('composite_n', 0.155, 0.02, [0, 0, 0.22], { seg: 22 });
  for (const s of [-1, 1]) cab.perfil('composite_g', [[-0.2, 0.1], [0.1, 0.12], [0.1, 0.2], [-0.15, 0.22]], 0.02, [s * 0.15, 0, 0], { suave: 0.01, bisel: 0.003 });
  cab.cil('composite_n', 0.075, 0.28, [0, 0.0, 0.34], { seg: 16, r2: 0.045 });
  cab.circ('em_magenta', 0.028, [0, 0, 0.6201], [0, 0, 0], 14);
  cab.toro('composite_g', 0.045, 0.01, [0, 0, 0.62], { seg: 18, rad: 6 });
  cab.cil('em_cian', 0.16, 0.012, [0, 0, 0.1], { seg: 24 });
  for (let i = 0; i < 5; i++) cab.caja('em_cian', [0.01, 0.01, 0.2], [0, 0.145 + 0.0, 0.02 + i * 0.0], 0.001, [0, 0, 0], 1);
  for (const z of [0.4, 0.5]) can.toro('em_cian', 0.062 - (z - 0.4) * 0.1, 0.007, [0, 0, z], { seg: 20, rad: 5 });
  can.cil('composite_g', 0.075, 0.014, [0, 0, 0.36], { seg: 16 });
  for (const a of trio(4)) can.caja('em_magenta', [0.008, 0.02, 0.2], [Math.sin(a) * 0.055, Math.cos(a) * 0.055, 0.42], 0.002, [0, 0, -a]);
  return { base, cabeza: cab, canones: can, posCabeza: [0, 0.76, 0], posCanones: [0, 0, 0], boca: [0, 0, 0.64], altura: 1.2, radio: 0.5 };
}

export const TORRETAS = [organo, miniGatling, maxim, centinela, automatica, laser];
