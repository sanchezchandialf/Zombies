// Atuendos de época: 6 eras × 5 roles. Cada función de era añade prendas al Con y devuelve los materiales del cuerpo.
import { mat } from './mat.js';
import { lados } from './construir.js';
import * as S from './sombreros.js';
const PI = Math.PI;

// Paleta [principal, secundario, ribete] por era y rol
const PAL = [
  { soldado: [0x1f3768, 0xd9d3c0, 0xb02b2b], medico: [0x45553f, 0x35353b, 0xe6e1d3], ingeniero: [0x6c4a2c, 0x3d3327, 0xc8a050], cazador: [0x3a5638, 0x5a4934, 0x9a7a3c], demoledor: [0x7a2b23, 0x2b2b33, 0x44403a] },
  { soldado: [0x72604a, 0x38486a, 0x9a2c28], medico: [0xdcd4bc, 0x4a3c30, 0x2a2a2a], ingeniero: [0x4c3b2a, 0x56565e, 0xc27a30], cazador: [0x7c6c50, 0x4a3a2a, 0x3a5a3a], demoledor: [0x2e2a28, 0x3a3a42, 0x8c2a22] },
  { soldado: [0x5b5f3a, 0x5a5a3a, 0x4a3a28], medico: [0x6b6f4b, 0x5a5a3a, 0xe8e4dc], ingeniero: [0x4a4a33, 0x3a3a2c, 0x6a4a2a], cazador: [0x48583a, 0x4a4a30, 0x3a3a28], demoledor: [0x4a4a3e, 0x3a3a30, 0x2a2a24] },
  { soldado: [0x30343a, 0x2a3a5a, 0xb8b0a0], medico: [0x4a6e92, 0x28384f, 0xe8e8e0], ingeniero: [0x5c3a22, 0x3b3b40, 0xcaa24a], cazador: [0x6a2a36, 0x22222a, 0xd0c8b8], demoledor: [0x1c1c20, 0x2a3040, 0x8a8a90] },
  { soldado: [0x3d4a38, 0x323c2c, 0x1a1c1a], medico: [0x4a5c6c, 0x2e3844, 0xe8e8ea], ingeniero: [0x44484c, 0x2e3032, 0xe28a1c], cazador: [0x4a5238, 0x3a4030, 0x22241e], demoledor: [0x2e3234, 0x24282a, 0x161818] },
  { soldado: [0x151a26, 0x10141c, 0x2a3446], medico: [0x1c2430, 0x12181f, 0xdfe6ee], ingeniero: [0x1a1e24, 0x12151a, 0x3a424c], cazador: [0x14181f, 0x0f1217, 0x242c38], demoledor: [0x1a1a1e, 0x121214, 0x30323a] },
];
const sup = (f, rx, rz, n = 0.55) => [Math.sign(Math.sin(f)) * Math.abs(Math.sin(f)) ** n * rx, 0, Math.sign(Math.cos(f)) * Math.abs(Math.cos(f)) ** n * rz];
const cinto = (c, w, m, y = 0.055, hebilla = null) => {
  c.lazo('pelvis', m, (f) => { const p = sup(f, 0.158 * w + 0.012, 0.108 + 0.01 * w); p[1] = y; return p; }, 0.015);
  if (hebilla) c.caja('pelvis', hebilla, [0.05, 0.045, 0.014], [0, y, 0.13 + 0.01 * w], null, 0.008);
};
const polaina = (c, sf, m, w, n = 5, y0 = -0.09) => { for (let i = 0; i < n; i++) c.toro('rodilla' + sf, m, (0.055 - i * 0.0024) * w, 0.011, [0, y0 - i * 0.045, 0], [PI / 2, 0, 0.0]); };
const botaAlta = (c, sf, w, cu, cuff) => { c.cil('rodilla' + sf, cu, 0.066 * w, 0.056 * w, 0.3, [0, -0.2, 0]); c.cil('rodilla' + sf, cuff, 0.073 * w, 0.068 * w, 0.045, [0, -0.06, 0]); };
const brazalete = (c, A, sf, y = -0.12, w = 1) => { c.cil('hombro' + sf, mat('tela', A), 0.056 * w, 0.054 * w, 0.06, [0, y, 0]); c.caja('hombro' + sf, mat('blanco', 0xf0f0f0), [0.03, 0.03, 0.006], [0, y, 0.057 * w], null, 0.003); };
const pauldron = (c, w, m, st, k = 1) => lados((s, sf) => {
  c.domo('hombro' + sf, m, [0.1 * w * k, 0.06 * k, 0.1 * w * k], [s * 0.012, 0.025, 0], [0, 0, -s * 0.2]);
  c.toro('hombro' + sf, st, 0.092 * w * k, 0.008, [s * 0.012, 0.027, 0], [PI / 2, 0, -s * 0.2]);
  for (let i = 0; i < 5; i++) c.esf('hombro' + sf, st, 0.008, [Math.sin(i * 1.2 + 0.4) * 0.07 * w * k + s * 0.01, 0.08 * k, Math.cos(i * 1.2 + 0.4) * 0.07 * w * k]);
});
const mochila = (c, w, m, m2, sz = [0.24, 0.3, 0.13], y = 0.18) => {
  c.caja('pecho', m, [sz[0] * w, sz[1], sz[2]], [0, y, -0.2], null, 0.03);
  c.caja('pecho', m2, [sz[0] * w * 0.85, sz[1] * 0.4, 0.04], [0, y - 0.02, -0.27], null, 0.015);
  lados((s) => c.caja('pecho', m2, [0.03, 0.5, 0.012], [s * 0.1 * w, 0.24, 0.0], [0, 0, s * 0.05], 0.004));
};
const capa = (c, m, w, forro, largo = 0.7) => {
  c.abierto('capa', m, 0.16 * w, 0.27 * w, largo, PI - 1.9, 3.8, [0, -largo / 2, 0], null, [1, 1, 0.85]);
  c.toro('capa', forro, 0.15 * w, 0.02, [0, -0.02, 0.01], [PI / 2 - 0.2, 0, 0], [1, 0.9, 1]);
  c.esf('capa', m, [0.2 * w, 0.06, 0.14], [0, -0.02, 0]);
};
const faldon = (c, m, w, largo, th = 4.2, rt = 0.175, rb = 0.23, forro = null) => {
  c.abierto('falda', m, rt * w, rb * w, largo, PI - th / 2, th, [0, -largo / 2, 0], null, [1, 1, 0.78]);
  if (forro) c.caja('falda', forro, [0.025, largo * 0.9, 0.012], [0, -largo / 2, -rt * 0.78 * w - 0.01], null, 0.004);
};
const bolsaMed = (c, w, cu, A, x = -0.24, y = -0.08, z = 0.02, bh = 'pelvis') => {
  c.caja(bh, cu, [0.17, 0.17, 0.09], [x * w, y, z], null, 0.025);
  c.caja(bh, mat('laton', 0xb09040), [0.03, 0.025, 0.012], [x * w, y + 0.03, z + 0.05], null, 0.004);
  c.caja(bh, mat('blanco', A), [0.07, 0.02, 0.006], [x * w, y - 0.02, z + 0.048], null, 0.002);
  c.caja(bh, mat('blanco', A), [0.02, 0.07, 0.006], [x * w, y - 0.02, z + 0.048], null, 0.002);
};

// ══════════════════════════════════ 1800 · PÓLVORA ══════════════════════════════════
function era0(T) {
  const { c, R, A, P, rol } = T, w = R.w;
  const casaca = mat('tela', P[0]), pant = mat('tela', P[1]), ribete = mat('tela', P[2]);
  const cuero = mat('cuero', 0x2a1c14), negro = mat('cuero', 0x16110e), blanco = mat('tela', 0xe4dfcf), laton = mat('laton', 0xc9a03c);
  const O = { camisa: casaca, manga: casaca, antebrazo: casaca, guante: rol === 'soldado' ? mat('tela', 0xe9e4d6) : mat('cuero', 0x8a6a44), muslo: pant, pierna: pant, bota: negro, pantalon: pant };
  faldon(c, casaca, w, 0.42, 4.2, 0.175, 0.225, ribete);
  // Delantera: chaleco, solapas, botones y cuello
  c.caja('pecho', mat('tela', rol === 'medico' ? 0xd8d2c0 : 0xd7ceb4), [0.14 * w, 0.3, 0.02], [0, 0.17, 0.126], [-0.04, 0, 0], 0.008);
  lados((s) => c.caja('pecho', rol === 'medico' ? casaca : ribete, [0.05, 0.24, 0.014], [s * 0.065 * w, 0.27, 0.124], [0, s * 0.1, s * 0.22], 0.006));
  for (let i = 0; i < 5; i++) c.esf('pecho', laton, 0.0105, [0, 0.31 - i * 0.055, 0.139 - Math.abs(i - 2) * 0.0015]);
  c.toro('cuello', ribete, 0.062, 0.021, [0, 0.03, 0], [PI / 2, 0, 0]);
  c.caja('cuello', blanco, [0.1, 0.03, 0.09], [0, 0.065, 0.015], null, 0.012);
  lados((s, sf) => { c.cil('codo' + sf, ribete, 0.036 * w + 0.004, 0.034 * w + 0.004, 0.05, [0, -0.235, 0]); botaAlta(c, sf, w, negro, mat('cuero', 0x7a5a38)); c.caja('hombro' + sf, laton, [0.09 * w, 0.014, 0.07], [0, 0.058 * w, 0], [0, 0, -s * 0.15], 0.006); });
  cinto(c, w, cuero, 0.05, laton);
  if (rol === 'soldado') {
    S.chaco(c, 0x1b1b22, P[2], 0xe8e4d6);
    T.cruzado(blanco);
    c.caja('pelvis', negro, [0.15, 0.1, 0.06], [0, 0.02, -0.15], [0.1, 0, 0], 0.02); c.esf('pelvis', laton, [0.025, 0.025, 0.008], [0, 0.02, -0.18]);
    c.cil('pelvis', mat('cuero', 0x6a5a40), 0.045, 0.045, 0.12, [0.17 * w, -0.04, -0.05], [0.1, 0, 0.05]);
    mochila(c, w, mat('cuero', 0x4a3a28), cuero, [0.22, 0.26, 0.12], 0.14);
    c.cil('pecho', mat('tela', 0x6a6a5a), 0.05, 0.05, 0.3 * w, [0, 0.33, -0.2], [0, 0, PI / 2]);
  } else if (rol === 'medico') {
    S.tricornio(c, 0x1c1c1e, A);
    c.caja('pecho', blanco, [0.22 * w, 0.4, 0.014], [0, 0.1, 0.14], [-0.05, 0, 0], 0.01);
    c.caja('pelvis', blanco, [0.2 * w, 0.26, 0.014], [0, -0.1, 0.12], [0.02, 0, 0], 0.01);
    c.caja('pecho', mat('goma', 0x7a2a28), [0.06, 0.05, 0.004], [0.05, 0.15, 0.148], [0, 0, 0.3], 0.003);
    bolsaMed(c, w, mat('cuero', 0x4a2e1c), A);
    brazalete(c, A, 'I', -0.11, w);
    c.cap('pecho', mat('laton', 0xc9a03c), 0.007, 0.06, [-0.1 * w, 0.37, 0.12], [0, 0, 0.5]);
  } else if (rol === 'ingeniero') {
    S.bombin(c, 0x4a3a2c, 0x1a1410); S.gafasCuero(c, 0x4a2e1c, 0xe0c070, true);
    const dc = mat('cuero', 0x3a2718);
    c.caja('pecho', dc, [0.22 * w, 0.5, 0.016], [0, 0.1, 0.14], [-0.05, 0, 0], 0.01);
    c.caja('pelvis', dc, [0.2 * w, 0.28, 0.016], [0, -0.09, 0.122], null, 0.01);
    c.caja('pecho', cuero, [0.1, 0.1, 0.02], [0, 0.1, 0.156], null, 0.01);
    mochila(c, w, mat('cuero', 0x5a3a22), cuero, [0.26, 0.34, 0.14], 0.14);
    c.cap('pecho', mat('metal', 0x7a7a80), 0.014, 0.36, [-0.07 * w, 0.4, -0.22], [0.12, 0, -0.1]); c.caja('pecho', mat('metal', 0x555560), [0.08, 0.04, 0.04], [-0.085 * w, 0.6, -0.225], null, 0.01);
    c.cap('pecho', mat('cuero', 0x6a4a28), 0.014, 0.4, [0.08 * w, 0.38, -0.22], [0.1, 0, 0.15]); c.caja('pecho', mat('metal', 0x666670), [0.04, 0.09, 0.03], [0.1 * w, 0.62, -0.225], null, 0.01);
    c.toro('pelvis', mat('metal', 0x888890), 0.025, 0.007, [0.19 * w, -0.04, 0.04], [0, PI / 2, 0]);
  } else if (rol === 'cazador') {
    S.capucha(c, P[0], 0x2a2a22); capa(c, mat('tela', P[0], true), w, mat('tela', 0x2a2a22), 0.62);
    T.cruzado(cuero, 0x1);
    c.caja('pelvis', mat('cuero', 0x3a2a1a), [0.1, 0.12, 0.07], [0.19 * w, -0.04, 0.05], null, 0.02);
    c.cono('pelvis', mat('blanco', 0xd8cfae), 0.035, 0.18, [-0.19 * w, -0.06, 0.06], [-0.4, 0, 0.3]);
    c.cap('pelvis', cuero, 0.005, 0.2, [-0.17 * w, -0.04, 0.06], [-0.4, 0, 0.2]);
  } else { // demoledor
    S.bandana(c, P[2] === 0x44403a ? 0x8a2a22 : P[2]);
    pauldron(c, w, mat('cuero', 0x3a2a1c), mat('metal', 0x77777c), 1.05);
    c.cil('pecho', mat('cuero', 0x4e3220), 0.14, 0.14, 0.34, [0, 0.17, -0.26]);
    for (const y of [0.04, 0.17, 0.3]) c.toro('pecho', mat('metal', 0x66666a), 0.142, 0.011, [0, y, -0.26], [PI / 2, 0, 0]);
    c.cil('pecho', mat('laton', 0xa88a38), 0.03, 0.03, 0.04, [0, 0.36, -0.26]);
    c.caja('pecho', cuero, [0.26 * w, 0.5, 0.016], [0, 0.07, 0.142], [-0.05, 0, 0], 0.01);
    for (let i = 0; i < 4; i++) c.cil('pelvis', mat('goma', 0xb02a22), 0.016, 0.016, 0.14, [(-0.09 + i * 0.06) * w, 0.04, 0.13], [0.0, 0, 0]);
    lados((s, sf) => c.cil('codo' + sf, cuero, 0.047 * w, 0.04 * w, 0.18, [0, -0.1, 0]));
  }
  return O;
}

// ══════════════════════════════════ 1850 · VAPOR ══════════════════════════════════
function era1(T) {
  const { c, R, A, P, rol } = T, w = R.w;
  const duster = mat('tela', P[0]), pant = mat('tela', P[1]), cuero = mat('cuero', 0x3a2618), negro = mat('cuero', 0x1c1410), laton = mat('laton', 0xc9a03c);
  const O = { camisa: duster, manga: duster, antebrazo: duster, guante: mat('cuero', 0x6a4a2a), muslo: pant, pierna: pant, bota: negro, pantalon: pant };
  c.abierto('falda', duster, 0.175 * w, 0.27 * w, 0.78, 0.55, PI * 2 - 1.1, [0, -0.39, 0], null, [1, 1, 0.8]);  // guardapolvo (abierto delante)
  c.caja('falda', mat('tela', P[0]), [0.03, 0.74, 0.012], [0, -0.39, -0.2], null, 0.004);
  c.toro('cuello', duster, 0.065, 0.026, [0, 0.04, -0.01], [PI / 2 - 0.3, 0, 0], [1, 1, 1.1]);
  c.caja('pecho', mat('tela', rol === 'medico' ? 0xe8e4d4 : 0x6a4a32), [0.15 * w, 0.32, 0.02], [0, 0.16, 0.12], null, 0.008);
  for (let i = 0; i < 4; i++) c.esf('pecho', laton, 0.009, [0, 0.29 - i * 0.065, 0.133]);
  c.cono('pecho', mat('tela', rol === 'cazador' ? 0x3a5a3a : A), 0.07, 0.14, [0, 0.31, 0.12], [PI + 0.1, 0, 0], [1.2, 1, 0.3]);       // pañuelo anudado
  c.toro('cuello', mat('tela', rol === 'cazador' ? 0x3a5a3a : A), 0.058, 0.014, [0, 0.01, 0], [PI / 2, 0, 0]);
  cinto(c, w, cuero, 0.05, laton);
  for (let i = 0; i < 7; i++) c.cil('pelvis', laton, 0.008, 0.008, 0.035, [(-0.1 + i * 0.033) * w, 0.045, 0.13 + 0.01 * w], null);
  c.caja('pelvis', cuero, [0.05, 0.16, 0.07], [-0.195 * w, -0.08, 0.04], [0, 0, 0.08], 0.02); c.caja('pelvis', negro, [0.03, 0.08, 0.05], [-0.19 * w, 0.02, 0.025], [-0.3, 0, 0], 0.01); // pistolera
  lados((s, sf) => {
    botaAlta(c, sf, w, negro, mat('cuero', 0x5a3a24));
    c.cil('tobillo' + sf, mat('metal', 0x9a9a9a), 0.006, 0.006, 0.05, [0, -0.04, -0.045], [0, 0, PI / 2]);
    c.toro('tobillo' + sf, mat('metal', 0x9a9a9a), 0.016, 0.004, [s * 0.03, -0.045, -0.062], [0, PI / 2, 0]);
    c.cil('codo' + sf, cuero, 0.036 * w + 0.004, 0.034 * w + 0.004, 0.04, [0, -0.25, 0]);
  });
  if (rol === 'soldado') {
    S.alaAncha(c, 0x4a3a28, P[2]); T.cruzado(cuero);
    c.cil('pelvis', mat('cuero', 0x55432e), 0.04, 0.04, 0.12, [0.17 * w, -0.03, -0.06]);
    mochila(c, w, mat('tela', 0x5a5a48), cuero, [0.22, 0.26, 0.12], 0.14);
  } else if (rol === 'medico') {
    S.bombin(c, 0x2a2a2c, 0x6a6a6a); bolsaMed(c, w, mat('cuero', 0x2a1c14), A); brazalete(c, A, 'I', -0.13, w);
    c.cil('pecho', mat('metal', 0xaaaaaa), 0.008, 0.008, 0.07, [-0.08 * w, 0.37, 0.12], [0, 0, 0.9]);
    c.esf('pecho', mat('metal', 0xbababa), 0.022, [-0.12 * w, 0.4, 0.12]);
  } else if (rol === 'ingeniero') {
    S.gorraVisera(c, 0x4a3e30, 0x2a2018); S.gafasCuero(c, 0x2a1c14, 0x70c0a0, false);
    const dc = mat('cuero', 0x2e2016);
    c.caja('pecho', dc, [0.2 * w, 0.4, 0.016], [0, 0.12, 0.14], [-0.04, 0, 0], 0.01); c.caja('pelvis', dc, [0.19 * w, 0.2, 0.016], [0, -0.04, 0.122], null, 0.01);
    mochila(c, w, mat('cuero', 0x4a3220), cuero, [0.26, 0.34, 0.14], 0.14);
    c.cil('pecho', mat('metal', 0x7a7a80), 0.045, 0.045, 0.26, [0, 0.38, -0.2], [0, 0, PI / 2]); c.cap('pecho', mat('metal', 0x8a8a90), 0.018, 0.34, [0.12 * w, 0.42, -0.26], [0.1, 0, 0.1]);
    c.cap('pecho', mat('cuero', 0x6a4a28), 0.014, 0.36, [-0.1 * w, 0.52, -0.26], [0.1, 0, -0.12]);
    c.caja('pecho', mat('metal', 0x606068), [0.08, 0.05, 0.05], [-0.115 * w, 0.72, -0.265], null, 0.01);
  } else if (rol === 'cazador') {
    S.alaAncha(c, 0x6a5a40, 0x2a2a20); capa(c, mat('tela', P[0], true), w, mat('tela', 0x2a2a22), 0.5);
    c.caja('cabeza', mat('tela', 0x3a5a3a), [0.12, 0.05, 0.08], [0, 0.04, 0.085], null, 0.02);
    T.cruzado(cuero, 0x1);
    c.cap('pelvis', cuero, 0.025, 0.12, [0.19 * w, -0.05, 0.0], [0, 0, 0.1]);
  } else {
    S.bombin(c, 0x1c1c1c, 0x2a1c14);
    pauldron(c, w, mat('metal', 0x4a4a52), mat('metal', 0x909098), 1.1);
    c.caja('pecho', mat('cuero', 0x2a1c14), [0.27 * w, 0.28, 0.02], [0, 0.18, 0.14], null, 0.01);
    for (let i = 0; i < 4; i++) c.cil('pecho', mat('goma', 0xb02a22), 0.02, 0.02, 0.2, [(-0.09 + i * 0.06) * w, 0.2, 0.17], [0, 0, 0.0]);
    c.cil('pelvis', mat('metal', 0x3a3a3e), 0.06, 0.06, 0.14, [0.22 * w, -0.04, -0.04]);
    lados((s, sf) => c.cil('codo' + sf, mat('metal', 0x44444a), 0.044 * w, 0.038 * w, 0.14, [0, -0.1, 0]));
  }
  return O;
}

// ══════════════════════════════════ 1900 · TRINCHERAS ══════════════════════════════════
function era2(T) {
  const { c, R, A, P, rol } = T, w = R.w;
  const guerrera = mat('tela', P[0]), pant = mat('tela', P[1]), cuero = mat('cuero', 0x4a3220), negro = mat('cuero', 0x1e1812), laton = mat('laton', 0xa88a38);
  const O = { camisa: guerrera, manga: guerrera, antebrazo: guerrera, guante: mat('cuero', 0x4a3a28), muslo: pant, pierna: pant, bota: negro, pantalon: pant };
  c.abierto('falda', guerrera, 0.17 * w, 0.2 * w, 0.2, 0, PI * 2, [0, -0.1, 0], null, [1, 1, 0.78]);
  lados((s) => { c.caja('pecho', guerrera, [0.07, 0.07, 0.025], [s * 0.08 * w, 0.17, 0.133], [0, s * 0.1, 0], 0.008); c.caja('pecho', mat('tela', P[2]), [0.07, 0.016, 0.027], [s * 0.08 * w, 0.205, 0.134], [0, s * 0.1, 0], 0.005); c.esf('pecho', laton, 0.007, [s * 0.08 * w, 0.185, 0.146]); });
  c.toro('cuello', guerrera, 0.06, 0.02, [0, 0.04, 0], [PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) c.esf('pecho', laton, 0.008, [0, 0.33 - i * 0.07, 0.136]);
  cinto(c, w, cuero, 0.05, laton);
  T.cruzado(cuero, 0, 0.016);
  for (let i = 0; i < 2; i++) lados((s) => c.caja('pelvis', cuero, [0.075, 0.08, 0.045], [s * (0.065 + i * 0.0) * w + s * 0.01, 0.045, 0.135 + 0.01 * w], [0, s * 0.2, 0], 0.012));
  lados((s, sf) => {
    c.caja('tobillo' + sf, negro, [0.1 * w, 0.1, 0.1], [0, 0.02, 0.0], null, 0.02);
    polaina(c, sf, mat('tela', P[1] === 0x5a5a3a ? 0x6a6648 : P[1]), w, 7, -0.07);
    c.cil('codo' + sf, cuero, 0.036 * w + 0.003, 0.034 * w + 0.003, 0.035, [0, -0.25, 0]);
  });
  c.caja('pelvis', mat('tela', 0x6a6a52), [0.14, 0.17, 0.07], [0.2 * w, -0.06, 0.02], [0, 0, -0.1], 0.02);               // bolsa de la máscara
  c.cil('pelvis', mat('goma', 0x22251c), 0.014, 0.014, 0.1, [0.2 * w, -0.0, 0.07]);
  if (rol === 'soldado') {
    S.casco(c, 'brodie', P[0] - 0x101010 > 0 ? 0x5a5e44 : 0x5a5e44);
    mochila(c, w, mat('tela', 0x5a5a3e), cuero, [0.24, 0.28, 0.13], 0.14);
    c.cil('pecho', mat('tela', 0x6c6c52), 0.06, 0.06, 0.3 * w, [0, 0.34, -0.2], [0, 0, PI / 2]); c.cil('pecho', mat('metal', 0x6a6a6a), 0.045, 0.045, 0.07, [0.1 * w, 0.0, -0.265], [PI / 2, 0, 0]);
  } else if (rol === 'medico') {
    S.casco(c, 'adrian', 0x7a8068, 0xc83a3a); bolsaMed(c, w, mat('tela', 0xcfcab6), A, -0.24, -0.06, 0.03); brazalete(c, A, 'I', -0.1, w);
    c.caja('pecho', mat('tela', 0xcfcab6), [0.2, 0.12, 0.06], [0, 0.05, -0.2], null, 0.02);
    c.cap('pecho', mat('metal', 0x909090), 0.01, 0.34, [0.1, 0.18, -0.26], [0, 0, 0.1]);
  } else if (rol === 'ingeniero') {
    S.casco(c, 'acero', 0x4a4a3a); S.gafasCuero(c, 0x2a1c14, 0x7ab0c8, true);
    mochila(c, w, mat('tela', 0x4a4a38), cuero, [0.27, 0.34, 0.15], 0.14);
    c.cil('pecho', mat('metal', 0x6a6a6a), 0.014, 0.014, 0.4, [0.09 * w, 0.2, -0.27], null); c.caja('pecho', mat('metal', 0x6a6a6a), [0.13, 0.012, 0.15], [0.09 * w, 0.42, -0.27], [0, 0, 0], 0.004);
    c.cil('pelvis', mat('metal', 0x555555), 0.03, 0.03, 0.14, [-0.19 * w, -0.04, 0.0]); c.caja('pelvis', mat('metal', 0x5a5a60), [0.05, 0.1, 0.04], [0.19 * w, -0.1, 0.04], [0, 0, 0.2], 0.01);
  } else if (rol === 'cazador') {
    const ghi = mat('tela', 0x4a5a38, true);
    S.capucha(c, 0x4a5a38, 0x2a3220); capa(c, ghi, w, mat('tela', 0x3a4a2c), 0.5);
    for (let i = 0; i < 14; i++) c.cono('pecho', mat('tela', i % 2 ? 0x5a6a40 : 0x3a4a2a), 0.02, 0.09, [Math.sin(i * 2.1) * 0.15 * w, 0.1 + (i % 5) * 0.07, -0.2 - (i % 3) * 0.02], [-2.5, 0, Math.sin(i) * 0.5]);
    c.cap('pecho', negro, 0.02, 0.5, [0.06 * w, 0.1, -0.22], [0, 0, 0.3]);                 // funda del rifle a la espalda
  } else {
    S.casco(c, 'stahl', 0x4a4a42);
    pauldron(c, w, mat('metal', 0x3a3a38), mat('metal', 0x7a7a74), 1.1);
    c.caja('pecho', mat('metal', 0x3c3c3a), [0.26 * w, 0.3, 0.05], [0, 0.2, 0.15], [-0.04, 0, 0], 0.03);
    c.caja('pecho', mat('metal', 0x333332), [0.2 * w, 0.14, 0.04], [0, 0.0, 0.14], [-0.04, 0, 0], 0.02);
    for (let i = 0; i < 4; i++) c.esf('pecho', mat('metal', 0x8a8a84), 0.007, [(-0.1 + i * 0.067) * w, 0.31, 0.178]);
    c.cil('pelvis', mat('metal', 0x3a3a38), 0.055, 0.055, 0.14, [-0.22 * w, -0.04, 0.0]);
    c.caja('pecho', mat('tela', 0x5a5a48), [0.3 * w, 0.28, 0.14], [0, 0.17, -0.21], null, 0.04);
  }
  return O;
}

// ══════════════════════════════════ 1950–90 · ATÓMICA ══════════════════════════════════
function era3(T) {
  const { c, R, A, P, rol } = T, w = R.w;
  const chq = mat('cuero', P[0]), jean = mat('tela', P[1]), cuero = mat('cuero', 0x1c1612), cro = mat('metal', 0xc8ccd0);
  const sinMangas = rol === 'demoledor';
  const camiseta = mat('tela', rol === 'medico' ? 0xe8e8e0 : rol === 'cazador' ? 0xd8d0c0 : 0x909090);
  const O = { camisa: chq, manga: sinMangas ? mat('piel', R.piel) : chq, antebrazo: sinMangas ? mat('piel', R.piel) : chq, guante: sinMangas ? mat('cuero', 0x1a1a1a) : mat('piel', R.piel), muslo: jean, pierna: jean, bota: cuero, pantalon: jean };
  faldon(c, chq, w, 0.13, 6.28, 0.172, 0.18);
  c.caja('pecho', camiseta, [0.08 * w, 0.28, 0.02], [0, 0.2, 0.13], [0, 0, 0], 0.01);
  lados((s) => { c.caja('pecho', chq, [0.06, 0.2, 0.02], [s * 0.065 * w, 0.28, 0.125], [0, s * 0.2, s * 0.28], 0.008); c.cil('pecho', cro, 0.006, 0.006, 0.4, [s * 0.015 * w, 0.14, 0.14]); });
  c.cap('pecho', cro, 0.005, 0.38, [0.0, 0.12, 0.142], [0, 0, 0]);
  c.toro('cuello', chq, 0.063, 0.022, [0, 0.04, -0.005], [PI / 2 - 0.2, 0, 0]);
  cinto(c, w, cuero, 0.05, cro);
  lados((s, sf) => {
    c.caja('tobillo' + sf, cuero, [0.11 * w, 0.12, 0.12], [0, 0.03, 0.0], null, 0.03);
    c.cil('rodilla' + sf, mat('tela', P[1] * 1 + 0x080808), 0.058 * w, 0.05 * w, 0.05, [0, -0.33, 0]);   // dobladillo
    if (!sinMangas) c.cil('codo' + sf, chq, 0.036 * w + 0.004, 0.034 * w + 0.004, 0.04, [0, -0.25, 0]);
  });
  if (rol === 'soldado') {
    S.boina(c, 0x4a5a34); S.gafasAviador(c, 0xc8ccd0, 0x2a3a2a);
    lados((s) => c.caja('hombro' + (s < 0 ? 'D' : 'I'), mat('tela', P[2]), [0.04, 0.05, 0.02], [0, -0.07, 0.055 * w], null, 0.005));
    mochila(c, w, mat('tela', 0x4a4a38), cuero, [0.24, 0.3, 0.13], 0.14);
    c.caja('pelvis', mat('tela', 0x4a4a38), [0.08, 0.1, 0.05], [0.19 * w, 0.0, 0.07], null, 0.015);
  } else if (rol === 'medico') {
    S.pañuelo(c, A); bolsaMed(c, w, mat('tela', 0xcfd8d4), A, -0.24, -0.06, 0.02); brazalete(c, A, 'I', -0.11, w);
    c.caja('pelvis', mat('tela', 0xe6e6e0), [0.3 * w, 0.4, 0.02], [0, -0.2, 0.13], null, 0.01);
    c.cap('pecho', mat('metal', 0xb0b0b8), 0.01, 0.1, [-0.1 * w, 0.3, 0.14], [0, 0, 0.1]);
  } else if (rol === 'ingeniero') {
    S.gorraVisera(c, 0x3a4a5a, 0x1a1a1a); S.gafasCuero(c, 0x2a2a2a, 0x80c8d8, true);
    c.caja('pecho', mat('tela', 0x30506a), [0.26 * w, 0.28, 0.02], [0, 0.18, 0.14], null, 0.01);
    mochila(c, w, mat('cuero', 0x5a4028), cuero, [0.26, 0.34, 0.15], 0.14);
    c.cap('pecho', mat('metal', 0x8a8a90), 0.016, 0.34, [-0.1 * w, 0.42, -0.26], [0.0, 0, -0.1]); c.cap('pecho', mat('goma', 0xc03a22), 0.016, 0.3, [0.1 * w, 0.4, -0.26], [0.1, 0, 0.12]);
    c.caja('pelvis', mat('metal', 0x7a7a80), [0.04, 0.12, 0.03], [0.2 * w, 0.0, 0.0], null, 0.01);
  } else if (rol === 'cazador') {
    S.gafasAviador(c, 0xd0c8a0, 0x30222a);
    c.cil('cuello', mat('tela', A), 0.066, 0.07, 0.08, [0, 0.03, 0]); c.cono('pecho', mat('tela', A), 0.05, 0.3, [0.07, 0.25, -0.1], [PI - 0.15, 0, 0.1]);
    capa(c, mat('tela', P[0], true), w, mat('tela', 0x201014), 0.42);
    c.cap('pecho', cuero, 0.02, 0.44, [0.05 * w, 0.16, -0.21], [0, 0, 0.4]);
  } else {
    S.bandana(c, A);
    pauldron(c, w, cuero, cro, 0.9);
    lados((s, sf) => { c.cil('codo' + sf, mat('metal', 0x7a7a80), 0.043 * w, 0.037 * w, 0.14, [0, -0.1, 0]); c.toro('hombro' + sf, mat('metal', 0xb0b0b8), 0.058 * w, 0.01, [0, -0.2, 0], [PI / 2, 0, 0]); });
    c.toro('pecho', mat('metal', 0xa0a0a8), 0.14, 0.012, [0, 0.2, 0.0], [PI / 2 - 0.5, 0.3, 0], [1.05, 1, 0.8]);
    c.caja('pecho', cuero, [0.3 * w, 0.28, 0.02], [0, 0.2, 0.135], null, 0.01);
    for (let i = 0; i < 3; i++) c.esf('pecho', cro, 0.008, [(-0.08 + i * 0.08) * w, 0.31, 0.15]);
    c.caja('pecho', mat('tela', 0x303030), [0.3 * w, 0.28, 0.16], [0, 0.17, -0.22], null, 0.04);
  }
  return O;
}

// ══════════════════════════════════ 2000 · DIGITAL ══════════════════════════════════
function era4(T) {
  const { c, R, A, P, rol } = T, w = R.w;
  const cam = mat('tela', P[0]), cargo = mat('tela', P[1]), neg = mat('tela', 0x1a1c1e), bota = mat('cuero', 0x1e1c18), pl = mat('pintura', rol === 'ingeniero' ? 0xe28a1c : 0x23282a), n2 = mat('goma', 0x15171a);
  const O = { camisa: cam, manga: cam, antebrazo: cam, guante: mat('goma', 0x1c1e20), muslo: cargo, pierna: cargo, bota, pantalon: cargo };
  // Chaleco portaplacas con cargadores
  c.caja('pecho', pl, [0.27 * w, 0.34, 0.075], [0, 0.2, 0.12], [-0.02, 0, 0], 0.035);
  c.caja('pecho', pl, [0.26 * w, 0.34, 0.06], [0, 0.2, -0.12], null, 0.035);
  lados((s) => { c.caja('pecho', pl, [0.07, 0.2, 0.08], [s * 0.13 * w, 0.24, 0.0], null, 0.03); c.caja('pecho', pl, [0.06, 0.04, 0.1], [s * 0.1 * w, 0.37, 0.0], null, 0.015); });
  for (let i = 0; i < 3; i++) c.caja('pecho', n2, [0.06, 0.1, 0.04], [(-0.075 + i * 0.075) * w, 0.12, 0.17], null, 0.012);
  c.caja('pecho', n2, [0.1, 0.07, 0.03], [0, 0.29, 0.168], null, 0.01); c.caja('pecho', mat('luz', rol === 'ingeniero' ? 0xffcc40 : A), [0.04, 0.006, 0.004], [0, 0.31, 0.186], null, 0.002);
  cinto(c, w, n2, 0.05, mat('metal', 0x303438));
  c.caja('pelvis', n2, [0.08, 0.14, 0.06], [0.2 * w, -0.06, 0.03], null, 0.015); c.caja('pelvis', n2, [0.08, 0.1, 0.06], [-0.2 * w, -0.02, 0.05], null, 0.015);
  lados((s, sf) => {
    c.caja('rodilla' + sf, pl, [0.1 * w, 0.12, 0.05], [0, -0.01, 0.06 * w], [0.1, 0, 0], 0.03);   // rodillera
    c.caja('codo' + sf, pl, [0.07 * w, 0.07, 0.04], [0, -0.0, -0.045 * w], null, 0.02);         // codera
    c.cap('cadera' + sf, cargo, 0.05 * w, 0.1, [s * 0.04 * w, -0.2, 0.04], [0, 0, 0], [1, 1, 1.0]); c.caja('cadera' + sf, cargo, [0.08, 0.12, 0.05], [s * 0.065 * w, -0.2, 0.04 * w], null, 0.02);
    c.caja('tobillo' + sf, bota, [0.108 * w, 0.14, 0.12], [0, 0.04, 0.0], null, 0.03);
  });
  c.toro('cuello', cam, 0.06, 0.02, [0, 0.035, 0], [PI / 2, 0, 0]);
  if (rol === 'soldado') {
    S.cascoTactico(c, 0x4a5240, A, true, true);
    mochila(c, w, mat('tela', 0x3d4a38), n2, [0.24, 0.28, 0.14], 0.16);
    c.cap('pelvis', n2, 0.012, 0.1, [0.2 * w, -0.25, 0.05], [0, 0, 0]);
  } else if (rol === 'medico') {
    S.cascoTactico(c, 0xe0e4e6, A, false, true); S.gafasLentes(c, 0x2a2a2a); brazalete(c, A, 'I', -0.1, w);
    bolsaMed(c, w, mat('tela', 0xd8dcd8), A, 0, -0.18, 0.02, 'cadera' + 'D');
    c.caja('pecho', mat('blanco', 0xf0f0f0), [0.1, 0.1, 0.006], [0, 0.1, -0.16], null, 0.003); c.caja('pecho', mat('blanco', A), [0.07, 0.02, 0.006], [0, 0.1, -0.165], null, 0.002); c.caja('pecho', mat('blanco', A), [0.02, 0.07, 0.006], [0, 0.1, -0.165], null, 0.002);
    mochila(c, w, mat('tela', 0xcfd6d2), n2, [0.24, 0.26, 0.12], 0.12);
  } else if (rol === 'ingeniero') {
    S.cascoObra(c, 0xe28a1c); S.gafasLentes(c, 0x2a2a2a);
    c.caja('pecho', mat('tela', 0xd8782a), [0.28 * w, 0.2, 0.02], [0, 0.2, 0.17], null, 0.01); c.caja('pecho', mat('blanco', 0xd8d8d0), [0.28 * w, 0.025, 0.022], [0, 0.18, 0.171], null, 0.005); c.caja('pecho', mat('blanco', 0xd8d8d0), [0.28 * w, 0.025, 0.022], [0, 0.25, 0.171], null, 0.005);
    mochila(c, w, mat('tela', 0x3a3e40), pl, [0.28, 0.36, 0.17], 0.16);
    c.cil('pecho', mat('metal', 0x9a9aa0), 0.03, 0.03, 0.34, [-0.1 * w, 0.28, -0.32]); c.cap('pecho', mat('goma', 0xc03a22), 0.015, 0.4, [0.09 * w, 0.3, -0.32], [0, 0, 0.05]);
    c.cil('pecho', mat('luz', 0xffcc40), 0.01, 0.01, 0.03, [0.12 * w, 0.4, -0.27], [PI / 2, 0, 0]);
    c.caja('pelvis', mat('metal', 0x666a70), [0.06, 0.2, 0.04], [-0.21 * w, -0.1, 0.0], null, 0.01);
  } else if (rol === 'cazador') {
    c.domo('cabeza', mat('tela', 0x4a5238), [0.12, 0.09, 0.128], [0, 0.185, -0.004], [-0.1, 0, 0]);
    c.cil('cabeza', mat('tela', 0x4a5238), 0.19, 0.19, 0.012, [0, 0.19, 0.008], [-0.08, 0, 0], [1, 1, 1.08]);
    S.gafasLentes(c, 0x1a1a1a);
    c.cap('cabeza', n2, 0.005, 0.06, [0.115, 0.1, 0.05], [-1.0, 0, 0.3]); c.esf('cabeza', n2, 0.012, [0.12, 0.08, 0.03]);
    capa(c, mat('tela', 0x4a5238, true), w, cam, 0.4);
    for (let i = 0; i < 12; i++) c.cono('pecho', mat('tela', i % 2 ? 0x5a6a40 : 0x3a4a2a), 0.02, 0.1, [Math.sin(i * 1.7) * 0.14 * w, 0.1 + (i % 4) * 0.08, -0.24], [-2.6, 0, Math.sin(i) * 0.5]);
    c.cap('pecho', n2, 0.022, 0.55, [0.08 * w, 0.14, -0.25], [0, 0, 0.35]);
  } else {
    S.cascoEOD(c, 0x3a3e40, A);
    pauldron(c, w, mat('pintura', 0x33383a), mat('metal', 0x7a7e80), 1.2);
    c.caja('pecho', mat('pintura', 0x2e3234), [0.3 * w, 0.4, 0.09], [0, 0.18, 0.14], [-0.03, 0, 0], 0.04);
    c.caja('pecho', mat('luz', A), [0.2 * w, 0.01, 0.01], [0, 0.34, 0.19], null, 0.003);
    c.caja('pelvis', mat('pintura', 0x2e3234), [0.2 * w, 0.14, 0.05], [0, -0.1, 0.14], [0.05, 0, 0], 0.03);
    lados((s, sf) => { c.caja('rodilla' + sf, mat('pintura', 0x2e3234), [0.1 * w, 0.22, 0.05], [0, -0.17, 0.06 * w], null, 0.03); c.cil('codo' + sf, mat('pintura', 0x2e3234), 0.046 * w, 0.04 * w, 0.17, [0, -0.1, 0]); });
    c.caja('pecho', mat('tela', 0x3a3e30), [0.34 * w, 0.28, 0.16], [0, 0.17, -0.22], null, 0.04);
  }
  return O;
}

// ══════════════════════════════════ 2050 · SINTÉTICA ══════════════════════════════════
function era5(T) {
  const { c, R, A, P, rol } = T, w = R.w;
  const suit = mat('pintura', P[0]), suit2 = mat('pintura', P[1]), pl = mat('pintura', P[2]), luz = mat('luz', A), n = mat('metal', 0x15181d), cris = mat('cristal', A);
  const O = { camisa: suit, manga: suit, antebrazo: suit2, guante: mat('goma', 0x101216), muslo: suit, pierna: suit2, bota: n, pantalon: suit2 };
  const k = rol === 'demoledor' ? 1.25 : 1;
  c.caja('pecho', pl, [0.27 * w, 0.32, 0.08], [0, 0.21, 0.115], [-0.04, 0, 0], 0.04);
  c.caja('pecho', luz, [0.2 * w, 0.008, 0.012], [0, 0.255, 0.16], [-0.04, 0, 0], 0.003); c.caja('pecho', luz, [0.008, 0.2, 0.012], [0, 0.15, 0.162], [-0.04, 0, 0], 0.003);
  lados((s) => c.caja('pecho', luz, [0.008, 0.16, 0.012], [s * 0.09 * w, 0.2, 0.158], [-0.04, 0, s * 0.3], 0.003));
  c.caja('pecho', pl, [0.25 * w, 0.32, 0.07], [0, 0.2, -0.12], null, 0.04);
  c.caja('pelvis', pl, [0.22 * w, 0.1, 0.05], [0, -0.06, 0.12], [0.05, 0, 0], 0.03);
  cinto(c, w, n, 0.05, luz);
  c.toro('cuello', pl, 0.062, 0.022, [0, 0.04, 0], [PI / 2, 0, 0]);
  lados((s, sf) => {
    c.domo('hombro' + sf, pl, [0.1 * w * k, 0.065 * k, 0.1 * w * k], [s * 0.012, 0.03, 0], [0, 0, -s * 0.25]);
    c.toro('hombro' + sf, luz, 0.084 * w * k, 0.005, [s * 0.012, 0.034, 0], [PI / 2, 0, -s * 0.25]);
    c.cil('hombro' + sf, suit2, 0.056 * w, 0.054 * w, 0.02, [0, -0.15, 0]); c.caja('codo' + sf, pl, [0.06 * w, 0.18, 0.06 * w], [0, -0.13, 0.005], null, 0.03); c.caja('codo' + sf, luz, [0.006, 0.12, 0.006], [0, -0.13, 0.04 * w], null, 0.002);
    c.caja('cadera' + sf, pl, [0.1 * w, 0.2, 0.08 * w], [0, -0.17, 0.0], null, 0.035); c.caja('cadera' + sf, luz, [0.006, 0.14, 0.006], [0, -0.17, 0.052 * w], null, 0.002);
    c.caja('rodilla' + sf, pl, [0.1 * w, 0.2, 0.07 * w], [0, -0.18, 0.012], [-0.04, 0, 0], 0.035); c.caja('rodilla' + sf, pl, [0.11 * w, 0.08, 0.06], [0, 0.0, 0.06 * w], [0.2, 0, 0], 0.03); c.caja('rodilla' + sf, luz, [0.006, 0.14, 0.006], [0, -0.18, 0.06 * w], null, 0.002);
    c.caja('tobillo' + sf, pl, [0.108 * w, 0.14, 0.14], [0, 0.03, 0.0], null, 0.035); c.caja('tobillo' + sf, luz, [0.07 * w, 0.006, 0.006], [0, -0.065, 0.145], null, 0.002);
  });
  // Mochila energética con núcleo luminoso
  c.caja('pecho', n, [0.24 * w, 0.3, 0.13], [0, 0.2, -0.2], null, 0.04);
  c.cil('pecho', luz, 0.03, 0.03, 0.22, [0.07 * w, 0.2, -0.275]); c.cil('pecho', luz, 0.03, 0.03, 0.22, [-0.07 * w, 0.2, -0.275]);
  c.cil('pecho', n, 0.04, 0.04, 0.03, [0.07 * w, 0.32, -0.275]); c.cil('pecho', n, 0.04, 0.04, 0.03, [-0.07 * w, 0.32, -0.275]);
  c.cil('pecho', n, 0.04, 0.04, 0.03, [0.07 * w, 0.08, -0.275]); c.cil('pecho', n, 0.04, 0.04, 0.03, [-0.07 * w, 0.08, -0.275]);
  if (rol === 'soldado') {
    S.cascoFuturo(c, 0x20283a, A, 0);
    lados((s) => c.caja('pelvis', pl, [0.06, 0.12, 0.05], [s * 0.2 * w, -0.04, 0.03], null, 0.02));
  } else if (rol === 'medico') {
    S.cascoFuturo(c, 0xe4eaf0, A, 1); S.visorHolo(c, A, 0);
    brazalete(c, A, 'I', -0.1, w); bolsaMed(c, w, mat('pintura', 0xe4eaf0), A, 0.0, -0.18, 0.0, 'caderaD');
    c.caja('pecho', mat('blanco', 0xe4eaf0), [0.16, 0.18, 0.1], [0, 0.2, 0.17], null, 0.03);
    c.caja('pecho', luz, [0.1, 0.02, 0.012], [0, 0.2, 0.225], null, 0.003); c.caja('pecho', luz, [0.02, 0.1, 0.012], [0, 0.2, 0.225], null, 0.003);
  } else if (rol === 'ingeniero') {
    S.cascoFuturo(c, 0x2a2e36, A, 2); S.gafasLentes(c, 0x303840);
    c.caja('pecho', pl, [0.3 * w, 0.4, 0.2], [0, 0.22, -0.26], null, 0.05);
    for (const s of [-1, 1]) { c.cap('pecho', n, 0.02, 0.3, [s * 0.18 * w, 0.46, -0.3], [0.2, 0, s * 0.5]); c.esf('pecho', luz, 0.025, [s * 0.26 * w, 0.58, -0.34]); c.cap('pecho', n, 0.015, 0.25, [s * 0.22 * w, 0.2, -0.36], [-0.6, 0, s * 0.3]); c.esf('pecho', luz, 0.02, [s * 0.27 * w, 0.0, -0.45]); }
    c.caja('pelvis', pl, [0.07, 0.13, 0.05], [0.2 * w, -0.04, 0.03], null, 0.02);
  } else if (rol === 'cazador') {
    S.capucha(c, 0x14181f, 0x0a0c10); S.visorHolo(c, A, 1);
    capa(c, mat('tela', 0x14181f, true), w, mat('luz', A), 0.55);
    c.caja('pecho', luz, [0.008, 0.5, 0.008], [0, 0.2, -0.3], null, 0.002);
    c.cap('pecho', n, 0.022, 0.55, [0.08 * w, 0.14, -0.27], [0, 0, 0.35]);
  } else {
    S.cascoFuturo(c, 0x1c1e24, A, 2);
    pauldron(c, w, pl, luz, 0.0001); // sin tachones: usamos placas grandes
    lados((s, sf) => { c.domo('hombro' + sf, pl, [0.16 * w, 0.1, 0.15 * w], [s * 0.03, 0.05, 0], [0, 0, -s * 0.3]); c.toro('hombro' + sf, luz, 0.14 * w, 0.006, [s * 0.03, 0.052, 0], [PI / 2, 0, -s * 0.3]); c.caja('codo' + sf, pl, [0.09 * w, 0.2, 0.09 * w], [0, -0.1, 0], null, 0.04); });
    c.caja('pecho', pl, [0.34 * w, 0.4, 0.12], [0, 0.2, 0.13], [-0.03, 0, 0], 0.05);
    c.caja('pecho', luz, [0.12, 0.012, 0.012], [0, 0.32, 0.2], null, 0.004);
  }
  return O;
}

const ERAS_ROPA = [era0, era1, era2, era3, era4, era5];
export function aplicarEra(eraIdx, T) {
  T.P = PAL[eraIdx][T.rol];
  return ERAS_ROPA[eraIdx](T);
}
export { PAL };
