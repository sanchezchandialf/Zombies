// Emplazamientos fijos tripulables, uno por era. Mismo formato que las torretas + `asiento` (posición local de la base donde se coloca el tirador,
// con la cabeza mirando a +Z). Mayores y más pesados que las torretas.
import { Constructor, canon, boca, bobina, celda, carril } from './piezas.js';
import { rueda, saco } from './torretas.js';

const PI = Math.PI;
const trio = (n) => Array.from({ length: n }, (_, i) => (i / n) * 2 * PI);

// ───────────────────────────── 0 · Cañón de campaña ─────────────────────────────
function canonCampana() {
  const base = new Constructor(), cab = new Constructor();
  // plataforma de tablones sobre la que gira la cureña, con calzos de piedra y sacos
  base.cil('madera_g', 1.15, 0.1, [0, 0, 0], { rot: [-PI / 2, 0, 0], seg: 20 });
  base.toro('hierro', 1.15, 0.02, [0, 0.1, 0], { seg: 28, rad: 5, rot: [PI / 2, 0, 0] });
  for (const a of trio(10)) base.caja('madera_c', [0.18, 0.012, 2.1], [0, 0.103, 0], 0.003, [0, a / 2 + 0.3, 0], 1);
  for (let i = 0; i < 6; i++) saco(base, Math.sin(i * 0.5 + 2.5) * 1.2, 0.2, Math.cos(i * 0.5 + 2.5) * 1.2, i * 0.5 + 2.5 + PI / 2, 1.1);
  // cabeza (gira): cureña de madera con ruedas, tubo de bronce y espeque
  const y = 0.62;
  for (const s of [-1, 1]) {
    rueda(cab, { x: s * 0.52, y: y - 0.0, z: 0.0, R: 0.55, ancho: 0.085, radios: 14 });
    cab.perfil('madera_c', [[-0.95, 0.04], [-0.9, 0.12], [-0.1, 0.34], [0.5, 0.36], [0.5, 0.24], [-0.1, 0.2], [-0.85, 0.0]], 0.09, [s * 0.3, y - 0.1, 0.0], { suave: 0.02, bisel: 0.005 });
  }
  cab.cil('hierro', 0.035, 1.1, [-0.55, y, 0.0], { rot: [0, PI / 2, 0], seg: 10 });
  cab.cil('madera_g', 0.05, 0.62, [-0.28, y + 0.12, -0.35], { rot: [0, 0, 0], seg: 10 });
  cab.caja('hierro', [0.6, 0.12, 0.12], [0, y + 0.18, -0.6], 0.015);
  cab.cil('hierro', 0.05, 0.12, [0, y - 0.12, -1.0], { rot: [0, PI / 2, 0], seg: 10 });
  // cañón de bronce con collarines, muñones, asas de delfín y mira de volea
  cab.rev('laton', [[0.07, -0.4], [0.13, -0.35], [0.15, -0.2], [0.13, 0.3], [0.11, 0.9], [0.1, 1.3], [0.122, 1.38], [0.13, 1.42], [0.1, 1.44]], [0, y + 0.3, 0], { seg: 24 });
  boca(cab, 1.4401, y + 0.3, 0.1, { corona: false, ratio: 0.72 });
  for (const z of [-0.2, 0.28, 0.9]) cab.toro('laton', z < 0 ? 0.153 : z < 0.5 ? 0.134 : 0.108, 0.014, [0, y + 0.3, z], { seg: 24, rad: 6 });
  cab.cil('laton', 0.04, 0.5, [-0.25, y + 0.3, 0.2], { rot: [0, PI / 2, 0], seg: 12 });
  cab.cil('laton', 0.05, 0.05, [-0.29, y + 0.3, 0.2], { rot: [0, PI / 2, 0], seg: 12 }); cab.cil('laton', 0.05, 0.05, [0.24, y + 0.3, 0.2], { rot: [0, PI / 2, 0], seg: 12 });
  cab.cil('hierro', 0.018, 0.1, [0, y + 0.44, 0.18], { rot: [-PI / 2, 0, 0], seg: 8 });
  cab.tubo('laton', [[0.0, y + 0.43, 0.12], [0.0, y + 0.5, 0.24], [0.0, y + 0.46, 0.34]], 0.012, { seg: 10, rad: 5 });
  return { base, cabeza: cab, canones: null, posCabeza: [0, 0.1, 0.0], boca: [0, y + 0.3, 1.44], altura: 1.4, radio: 1.2, asiento: [0, 0.1, -1.7] };
}

// ───────────────────────────── 1 · Gatling sobre afuste ─────────────────────────────
function gatling() {
  const base = new Constructor(), cab = new Constructor(), can = new Constructor();
  base.cil('madera_g', 1.0, 0.1, [0, 0, 0], { rot: [-PI / 2, 0, 0], seg: 18 });
  base.toro('hierro', 1.0, 0.018, [0, 0.1, 0], { seg: 26, rad: 5, rot: [PI / 2, 0, 0] });
  base.cil('hierro', 0.16, 0.7, [0, 0.1, 0.0], { rot: [-PI / 2, 0, 0], seg: 14, r2: 0.12 });
  base.cil('laton', 0.2, 0.05, [0, 0.76, 0.0], { rot: [-PI / 2, 0, 0], seg: 18 });
  for (const a of trio(3)) { base.caja('hierro', [0.08, 0.08, 0.6], [Math.sin(a + PI / 6) * 0.3, 0.2, Math.cos(a + PI / 6) * 0.3], 0.01, [0.0, a + PI / 6, 0]); }
  for (let i = 0; i < 5; i++) saco(base, Math.sin(i * 0.55 + 3.0) * 1.0, 0.18, Math.cos(i * 0.55 + 3.0) * 1.0, i * 0.55 + 3.0 + PI / 2, 1.0);
  // cabeza: horquilla de hierro, caja de mecanismo de latón, tolva de carga, manivela con volante
  const y = 0.0;
  for (const s of [-1, 1]) cab.perfil('hierro', [[-0.4, -0.12], [0.5, -0.12], [0.55, 0.2], [0.3, 0.4], [-0.3, 0.3]], 0.05, [s * 0.2, y, 0.0], { suave: 0.05, bisel: 0.006 });
  cab.caja('laton', [0.32, 0.3, 0.55], [0, y + 0.12, 0.0], 0.03);
  cab.caja('hierro', [0.34, 0.03, 0.57], [0, y - 0.04, 0.0], 0.006);
  cab.cil('laton', 0.14, 0.26, [0, y + 0.3, -0.1], { rot: [-PI / 2, 0, 0], seg: 22, r2: 0.1 });
  cab.cil('hierro', 0.15, 0.02, [0, y + 0.3, -0.1], { rot: [-PI / 2, 0, 0], seg: 22 }); cab.cil('hierro', 0.12, 0.02, [0, y + 0.56, -0.1], { rot: [-PI / 2, 0, 0], seg: 22 });
  cab.cil('laton', 0.03, 0.06, [0, y + 0.58, -0.1], { rot: [-PI / 2, 0, 0], seg: 10 });
  cab.cil('hierro', 0.022, 0.4, [0.1, y + 0.1, -0.3], { rot: [0, PI / 2, 0], seg: 8 });
  cab.eng('laton', 0.13, 18, 0.03, [0.3, y + 0.1, -0.3], [0, PI / 2, 0], { hueco: 0.2 });
  cab.tubo('hierro', [[0.32, y + 0.1, -0.3], [0.4, y + 0.28, -0.3], [0.4, y + 0.28, -0.22]], 0.014, { seg: 10, rad: 6 });
  cab.cil('madera_o', 0.026, 0.1, [0.4, y + 0.28, -0.22], { seg: 10 });
  cab.cil('hierro', 0.014, 0.8, [0.0, y + 0.34, -0.45], { rot: [0.35, 0, 0], seg: 6 }); // brazo de apuntar
  cab.cil('madera_o', 0.03, 0.12, [0.0, y + 0.38, -0.82], { seg: 10 });
  // cañones: diez tubos en corona con tres aros de latón
  const n = 10, rr = 0.075;
  can.cil('laton', 0.045, 0.1, [0, 0, 0.0], { seg: 14 });
  for (const a of trio(n)) canon(can, { mat: 'acero', x: Math.sin(a) * rr, y: Math.cos(a) * rr, z0: 0.0, z1: 1.2, r: 0.021, r2: 0.019 });
  for (const z of [0.05, 0.5, 1.0]) can.cil('laton', 0.108, 0.04, [0, 0, z], { seg: 24 });
  can.cil('hierro', 0.045, 1.2, [0, 0, 0.0], { seg: 10 });
  can.cil('laton', 0.112, 0.012, [0, 0, 1.19], { seg: 24 });
  return { base, cabeza: cab, canones: can, posCabeza: [0, 0.82, 0.0], posCanones: [0, 0.14, 0.28], boca: [0, 0.14, 1.48], altura: 1.4, radio: 1.0, asiento: [0, 0.1, -1.0] };
}

// ───────────────────────────── 2 · Ametralladora pesada con sacos terreros ─────────────────────────────
function ametralladoraPesada() {
  const base = new Constructor(), cab = new Constructor();
  // anillo de sacos terreros (abierto por detrás) y plataforma de tablones
  base.cil('madera_g', 0.95, 0.06, [0, 0, 0], { rot: [-PI / 2, 0, 0], seg: 18 });
  for (let capa = 0; capa < 2; capa++) for (let i = 0; i < 11; i++) {
    const a = -2.05 + i * 0.41 + (capa % 2) * 0.2, r = 0.88 - capa * 0.03;
    if (capa === 2 && (i < 3 || i > 7)) continue;
    saco(base, Math.sin(a) * r, 0.14 + capa * 0.21, Math.cos(a) * r, a + PI / 2, 1.0);
  }
  base.cil('hierro', 0.1, 0.75, [0, 0.06, 0.0], { rot: [-PI / 2, 0, 0], seg: 12 });
  for (const a of trio(3)) base.tubo('hierro', [[0, 0.7, 0], [Math.sin(a) * 0.3, 0.38, Math.cos(a) * 0.3], [Math.sin(a) * 0.55, 0.07, Math.cos(a) * 0.55]], 0.03, { seg: 8, rad: 6 });
  // cabeza: ametralladora refrigerada por agua montada en afuste, culatín con empuñaduras y caja de cinta
  const y = 0.0;
  cab.cil('hierro', 0.1, 0.05, [0, y - 0.1, 0.0], { rot: [-PI / 2, 0, 0], seg: 14 });
  cab.caja('hierro', [0.22, 0.2, 0.22], [0, y + 0.06, -0.05], 0.02);
  cab.caja('oliva', [0.18, 0.16, 0.5], [0, y + 0.24, 0.0], 0.02);
  cab.cil('oliva', 0.085, 0.8, [0, y + 0.24, 0.25], { seg: 20 });
  cab.cil('laton', 0.092, 0.04, [0, y + 0.24, 0.25], { seg: 20 }); cab.cil('laton', 0.09, 0.04, [0, y + 0.24, 1.0], { seg: 20 });
  for (let i = 0; i < 6; i++) cab.toro('hierro', 0.087, 0.005, [0, y + 0.24, 0.35 + i * 0.12], { seg: 20, rad: 4 });
  cab.cil('laton', 0.03, 0.05, [0, y + 0.33, 0.55], { rot: [-PI / 2, 0, 0], seg: 10 });
  canon(cab, { mat: 'acero', y: y + 0.24, z0: 1.0, z1: 1.2, r: 0.026, r2: 0.03 });
  cab.cil('hierro', 0.04, 0.08, [0, y + 0.24, 1.14], { seg: 10 });
  cab.tubo('laton', [[0.06, y + 0.3, 0.45], [0.16, y + 0.4, 0.6], [0.22, y + 0.34, 0.85], [0.22, y + 0.22, 0.95]], 0.016, { seg: 14, rad: 6 });   // manguera de agua
  cab.caja('oliva', [0.2, 0.2, 0.3], [0.26, y + 0.0, 0.0], 0.015);
  cab.tubo('hierro', [[0.2, y + 0.08, 0.0], [0.12, y + 0.2, 0.0], [0.1, y + 0.24, 0.0]], 0.02, { seg: 10, rad: 6 });
  for (let i = 0; i < 8; i++) cab.cil('laton', 0.011, 0.05, [0.2 - i * 0.012, y + 0.12 + i * 0.016, -0.04], { rot: [0, 0, 0], seg: 6 });
  for (const s of [-1, 1]) cab.cil('madera_o', 0.026, 0.14, [s * 0.1, y + 0.2, -0.46], { rot: [0.2, 0, 0], seg: 8 });
  cab.caja('hierro', [0.26, 0.04, 0.05], [0, y + 0.2, -0.38], 0.008);
  return { base, cabeza: cab, canones: null, posCabeza: [0, 0.6, 0.0], boca: [0, 0.24, 1.2], altura: 1.2, radio: 1.0, asiento: [0, 0.06, -0.78] };
}

// ───────────────────────────── 3 · M60 con escudo ─────────────────────────────
function m60Fija() {
  const base = new Constructor(), cab = new Constructor();
  base.cil('hierro', 0.55, 0.08, [0, 0, 0], { rot: [-PI / 2, 0, 0], seg: 8 });
  base.cil('hierro', 0.12, 0.9, [0, 0.08, 0.0], { rot: [-PI / 2, 0, 0], seg: 14, r2: 0.09 });
  base.cil('acero_c', 0.14, 0.03, [0, 0.98, 0.0], { rot: [-PI / 2, 0, 0], seg: 18 });
  for (const a of trio(4)) base.tubo('oliva', [[0, 0.7, 0], [Math.sin(a + PI / 4) * 0.2, 0.4, Math.cos(a + PI / 4) * 0.2], [Math.sin(a + PI / 4) * 0.46, 0.06, Math.cos(a + PI / 4) * 0.46]], 0.032, { seg: 8, rad: 6 });
  // cabeza: ametralladora de cinta con bípode plegado, escudo blindado con ventana y caja de munición
  const y = 0.0;
  cab.perfil('oliva', [[0.0, -0.26], [0.0, 0.26], [0.035, 0.28], [0.035, -0.28]], 0.74, [0, 0.2, 0.66], { suave: 0.01, bisel: 0.008 });
  for (const sx of [-1, 1]) cab.perfil('composite_g', [[0.0, -0.26], [0.0, 0.26], [0.03, 0.26], [0.03, -0.26]], 0.26, [sx * 0.48, 0.2, 0.52], { suave: 0.01, bisel: 0.006 });
  cab.caja('negro', [0.3, 0.11, 0.05], [0.0, 0.2, 0.68], 0.012);
  cab.caja('negro', [0.2, 0.05, 0.05], [0.0, 0.38, 0.68], 0.01);
  cab.caja('vidrio_c', [0.18, 0.035, 0.01], [0.0, 0.38, 0.706], 0.003);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) cab.cil('acero_c', 0.012, 0.01, [sx * 0.32, 0.06 + k * 0.14, 0.7], { seg: 8, rot: [PI / 2, 0, 0] });
  cab.caja('hierro', [0.18, 0.22, 0.2], [0, y + 0.0, 0.2], 0.015);
  cab.caja('oliva', [0.16, 0.16, 0.5], [0, y + 0.2, 0.2], 0.02);
  cab.caja('composite_n', [0.11, 0.07, 0.4], [0, y + 0.3, 0.15], 0.012);
  cab.cil('acero', 0.05, 0.48, [0, y + 0.2, 0.55], { seg: 14 });
  for (let i = 0; i < 8; i++) cab.caja('negro', [0.1, 0.012, 0.02], [0, y + 0.2, 0.62 + i * 0.045], 0.002), cab.caja('negro', [0.012, 0.1, 0.02], [0, y + 0.2, 0.62 + i * 0.045], 0.002);
  canon(cab, { mat: 'acero', y: y + 0.2, z0: 1.0, z1: 1.24, r: 0.02, r2: 0.022 });
  cab.cil('acero', 0.035, 0.1, [0, y + 0.2, 1.14], { seg: 12 });
  for (const s of [-1, 1]) cab.cil('acero', 0.007, 0.35, [s * 0.04, y + 0.14, 0.9], { rot: [0.1, 0, 0], seg: 6 });
  cab.caja('oliva', [0.18, 0.22, 0.2], [0.2, y + 0.04, 0.2], 0.016);                      // caja de munición
  cab.tubo('laton', [[0.16, y + 0.14, 0.2], [0.1, y + 0.2, 0.2], [0.08, y + 0.24, 0.2]], 0.02, { seg: 12, rad: 6 });
  for (const s of [-1, 1]) cab.cil('caucho', 0.024, 0.14, [s * 0.1, y + 0.1, -0.2], { rot: [0.25, 0, 0], seg: 8 });
  cab.caja('hierro', [0.26, 0.04, 0.05], [0, y + 0.08, -0.14], 0.008);
  cab.perfil('composite_n', [[-0.6, 0.18], [-0.2, 0.16], [-0.2, 0.02], [-0.5, -0.0]], 0.05, [0, y + 0.1, 0.0], { suave: 0.01, bisel: 0.004 });
  return { base, cabeza: cab, canones: null, posCabeza: [0, 1.0, 0.0], boca: [0, 0.2, 1.24], altura: 1.5, radio: 0.8, asiento: [0, 0.0, -0.85] };
}

// ───────────────────────────── 4 · Minigun blindada ─────────────────────────────
function minigunFija() {
  const base = new Constructor(), cab = new Constructor(), can = new Constructor();
  base.cil('composite_g', 0.7, 0.12, [0, 0, 0], { rot: [-PI / 2, 0, 0], seg: 10 });
  for (const a of trio(4)) { base.caja('composite_n', [0.16, 0.1, 0.55], [Math.sin(a + PI / 4) * 0.55, 0.06, Math.cos(a + PI / 4) * 0.55], 0.02, [0, a + PI / 4, 0]); base.cil('caucho', 0.09, 0.04, [Math.sin(a + PI / 4) * 0.8, 0.0, Math.cos(a + PI / 4) * 0.8], { rot: [-PI / 2, 0, 0], seg: 10 }); }
  base.cil('composite_n', 0.22, 0.8, [0, 0.12, 0.0], { rot: [-PI / 2, 0, 0], seg: 16, r2: 0.16 });
  base.toro('em_cian', 0.18, 0.01, [0, 0.55, 0.0], { seg: 24, rad: 5, rot: [PI / 2, 0, 0] });
  base.cil('composite_g', 0.28, 0.04, [0, 0.9, 0], { rot: [-PI / 2, 0, 0], seg: 20 });
  // cabeza: carcasa blindada con visor, minigun de seis cañones rotativos, tambor de munición con cinta
  const y = 0.0;
  cab.perfil('composite_g', [[-0.3, -0.16], [-0.3, 0.3], [0.1, 0.4], [0.5, 0.25], [0.5, -0.1], [0.1, -0.16]], 0.6, [0, 0, 0], { suave: 0.06, bisel: 0.012 });
  cab.perfil('composite_n', [[0.2, 0.3], [0.55, 0.24], [0.56, 0.0], [0.2, 0.0]], 0.7, [0, 0.0, 0.0], { suave: 0.04, bisel: 0.01 });
  cab.caja('vidrio_c', [0.46, 0.1, 0.02], [0, 0.26, 0.36], 0.004, [0.42, 0, 0]);
  cab.caja('composite_n', [0.5, 0.04, 0.05], [0, 0.3, 0.33], 0.008, [0.42, 0, 0]);
  cab.caja('em_cian', [0.42, 0.012, 0.012], [0, 0.2, 0.545], 0.002);
  cab.caja('composite_n', [0.32, 0.26, 0.2], [0, 0.0, 0.5], 0.03);                    // aspillera del arma
  // tambor de munición lateral con cinta
  cab.cil('composite_g', 0.17, 0.2, [0.3, 0.05, -0.1], { rot: [0, PI / 2, 0], seg: 20 });
  cab.cil('composite_g', 0.17, 0.2, [-0.5, 0.05, -0.1], { rot: [0, PI / 2, 0], seg: 20 });
  cab.cil('em_cian', 0.09, 0.22, [0.28, 0.05, -0.1], { rot: [0, PI / 2, 0], seg: 12 });
  cab.tubo('laton', [[0.38, 0.12, 0.0], [0.3, 0.18, 0.2], [0.16, 0.1, 0.4]], 0.02, { seg: 12, rad: 6 });
  // seis cañones giratorios con carcasa y tres aros
  const n = 6, rr = 0.07;
  can.cil('composite_n', 0.11, 0.3, [0, 0, 0.0], { seg: 18 });
  for (const a of trio(n)) canon(can, { mat: 'acero', x: Math.sin(a) * rr, y: Math.cos(a) * rr, z0: 0.3, z1: 1.2, r: 0.022, r2: 0.02, ánima: true });
  for (const z of [0.5, 0.85, 1.15]) can.cil('composite_g', 0.1, 0.035, [0, 0, z], { seg: 20 });
  can.cil('acero', 0.04, 1.2, [0, 0, 0.0], { seg: 10 });
  return { base, cabeza: cab, canones: can, posCabeza: [0, 0.94, 0.0], posCanones: [0, 0.14, 0.6], boca: [0, 0.14, 1.8], altura: 1.6, radio: 0.9, asiento: [0, 0.0, -0.85] };
}

// ───────────────────────────── 5 · Cañón de plasma ─────────────────────────────
function canonPlasmaFijo() {
  const base = new Constructor(), cab = new Constructor(), can = new Constructor();
  // disco de anclaje con círculo luminoso, pilón con células de energía
  base.cil('composite_g', 0.8, 0.08, [0, 0, 0], { rot: [-PI / 2, 0, 0], seg: 6 });
  base.toro('em_cian', 0.7, 0.014, [0, 0.085, 0], { seg: 6, rad: 5, rot: [PI / 2, 0, 0] });
  base.toro('em_magenta', 0.5, 0.01, [0, 0.085, 0], { seg: 24, rad: 5, rot: [PI / 2, 0, 0] });
  base.cil('composite', 0.24, 0.7, [0, 0.08, 0], { rot: [-PI / 2, 0, 0], seg: 16, r2: 0.17 });
  for (const a of trio(3)) { celda(base, { x: Math.sin(a) * 0.3, y: 0.1, z: Math.cos(a) * 0.3, l: 0.7, r: 0.07, luz: 'em_cian', eje: 'y', mat: 'composite_n' }); }
  base.cil('composite_g', 0.3, 0.05, [0, 0.8, 0], { rot: [-PI / 2, 0, 0], seg: 20 });
  base.toro('em_cian', 0.3, 0.012, [0, 0.83, 0], { seg: 28, rad: 5, rot: [PI / 2, 0, 0] });
  // cabeza: emisor con escudo curvo, resonador y condensadores
  cab.perfil('composite_g', [[-0.34, -0.2], [-0.34, 0.34], [0.0, 0.44], [0.3, 0.3], [0.3, -0.12], [0.0, -0.2]], 0.5, [0, 0, 0], { suave: 0.07, bisel: 0.012 });
  cab.perfil('composite', [[-0.2, 0.38], [0.0, 0.46], [0.28, 0.32], [0.0, 0.36]], 0.4, [0, 0.0, 0], { suave: 0.03, bisel: 0.006 });
  cab.caja('em_cian', [0.52, 0.012, 0.012], [0, 0.13, 0.31], 0.002);
  cab.caja('composite_n', [0.5, 0.6, 0.06], [0, 0.18, 0.46], 0.02);                                // escudo frontal
  cab.caja('em_magenta', [0.44, 0.012, 0.012], [0, 0.46, 0.497], 0.002); cab.caja('em_magenta', [0.44, 0.012, 0.012], [0, -0.1, 0.497], 0.002);
  for (const s of [-1, 1]) celda(cab, { x: s * 0.36, y: 0.1, z: -0.02, l: 0.5, r: 0.07, luz: 'em_cian', mat: 'composite_n' });
  cab.cil('composite_n', 0.14, 0.4, [0, 0.14, 0.4], { seg: 18, r2: 0.1 });
  bobina(cab, { y: 0.14, z0: 0.5, z1: 0.9, R: 0.11, r: 0.016, n: 5, mat: 'laton' });
  cab.cil('em_violeta', 0.05, 0.7, [0, 0.14, 0.45], { seg: 12 });
  cab.cil('composite_n', 0.14, 0.04, [0, 0.14, 0.9], { seg: 18 });
  // boca: tres púas y esfera de plasma, anillos enfocadores giratorios
  for (const a of trio(3)) cab.tubo('composite_g', [[Math.sin(a) * 0.12, 0.14 + Math.cos(a) * 0.12, 0.92], [Math.sin(a) * 0.16, 0.14 + Math.cos(a) * 0.16, 1.1], [Math.sin(a) * 0.07, 0.14 + Math.cos(a) * 0.07, 1.34]], 0.022, { seg: 14, rad: 6 });
  cab.esf('em_cian', 0.065, [0, 0.14, 1.22], 1, 14); cab.esf('vidrio_c', 0.1, [0, 0.14, 1.22], 1, 16);
  for (const z of [0.98, 1.06]) can.toro('em_magenta', 0.17 - (z - 0.98) * 0.1, 0.014, [0, 0, z], { seg: 24, rad: 6 });
  for (const a of trio(4)) can.caja('em_cian', [0.012, 0.04, 0.16], [Math.sin(a) * 0.14, Math.cos(a) * 0.14, 1.02], 0.003, [0, 0, -a]);
  return { base, cabeza: cab, canones: can, posCabeza: [0, 0.9, 0.0], posCanones: [0, 0.14, 0], boca: [0, 0.14, 1.34], altura: 1.7, radio: 0.9, asiento: [0, 0.08, -0.85] };
}

export const EMPLAZAMIENTOS = [canonCampana, gatling, ametralladoraPesada, m60Fija, minigunFija, canonPlasmaFijo];
