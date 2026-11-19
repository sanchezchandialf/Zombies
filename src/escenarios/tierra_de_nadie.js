// ERA Z · Era 2 (Trincheras, 1900–1949) · «Tierra de Nadie»
// Frente devastado bajo lluvia y bengalas: barro con cráteres, líneas de sacos terreros con tablas, búnker de hormigón,
// iglesia sin techo y casas en ruinas, tanque destrozado, alambradas, un campo de minas señalizado y árboles calcinados.
// Planta (x este, z sur; la cámara mira al norte, -Z): trinchera enemiga al norte, iglesia al noroeste, búnker al noreste,
// aldea en ruinas al oeste, trinchera propia al sur y un centro abierto con cráteres donde empiezan los jugadores.
import * as THREE from 'three';
import { ERAS } from '../datos/eras.js';
import { crearPiezas } from './tierra_de_nadie/piezas.js';

const CRATERES = [
  { x: -6, z: -14, r: 5.8, d: 0.2 }, { x: 12, z: -6, r: 4.2, d: 0.17 }, { x: -14, z: 10, r: 4.6, d: 0.19 }, { x: 5, z: 14, r: 3.4, d: 0.15 },
  { x: 30, z: 2, r: 5.0, d: 0.18 }, { x: -4, z: -31, r: 4.2, d: 0.17 }, { x: 14, z: -31, r: 3.4, d: 0.14 }, { x: -38, z: -5, r: 4.0, d: 0.16 },
  { x: -24, z: 40, r: 3.6, d: 0.15 }, { x: 22, z: 34, r: 4.4, d: 0.16 }, { x: 2, z: 36, r: 3.2, d: 0.13 }, { x: 40, z: -30, r: 3.6, d: 0.15 },
  { x: 4, z: -2.5, r: 2.8, d: 0.1 }, { x: -22, z: 3, r: 3.2, d: 0.13 },
];

// Zonas planas (suelos propios): el relieve se atenúa junto a ellas para que no asomen ni queden enterradas.
const RECT_PLANOS = [
  [-37.5, -39.7, 37.5, -35.0], [-23, 21.0, 27, 26.5], [-34, -28, -20, -18], [17, -19.5, 35, -14.4], [-39, 7, -27, 17], [-39, 27, -29, 35],
  [31, 18, 41, 26], [-46, 17.5, -22, 26.8],
];
const distRect = (x, z, [x0, z0, x1, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));

export async function construir(juego, kit) {
  const eraIdx = kit.eraIdx, era = ERAS[2];
  const rng = kit.rng(2202);
  await kit.precargar(['barro', 'hierba', 'tierra', 'tablones', 'empedrado', 'hormigon', 'saco_arena', 'tablas_viejas', 'ladrillo_rojo', 'ladrillo_encalado', 'silleria',
    'hormigon_bunker', 'hierro_oxidado', 'hierro_forjado', 'acero_pintado', 'troncos', 'lona', 'goma', 'rayas_peligro', 'cristal', 'estuco_desconchado']);
  const M = (n, o) => kit.mat(n, o);
  const P = crearPiezas(kit);
  const L = kit.lote0;
  const mat4 = kit.matriz;

  // ───────────── 1. SUELO: barro y hierba apagada, cráteres suaves ─────────────
  const relieve = (x, z) => {
    let h = 0;
    for (const c of CRATERES) {
      const t = Math.hypot(x - c.x, z - c.z) / c.r;
      if (t < 1) { const q = 1 - t * t; h -= c.d * q * q; }
      else if (t < 1.7) h += c.d * 0.35 * Math.exp(-(((t - 1.18) / 0.22) ** 2));
    }
    const ruido = Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17 - 0.4) * 0.035 + Math.sin(x * 0.07 + z * 0.09) * 0.05;
    let d = 9; for (const r of RECT_PLANOS) d = Math.min(d, distRect(x, z, r));
    return (h + ruido) * Math.min(1, d / 2.5);
  };
  kit.suelo({
    tam: 160, material: 'tierra', mezcla: 'barro', mojado: 0.2, contraste: 2.8, semilla: 4, desgaste: 0.5, relieve,
    pintura: (p) => {
      p.fondo(0.0);
      p.salpicar(-52, -52, 52, 52, 110, 2.5, 6, 1, 2.5);
      p.rect(-80, -80, 80, -52, 1, 6).rect(-80, 52, 80, 80, 1, 6).rect(-80, -80, -52, 80, 1, 6).rect(52, -80, 80, 80, 1, 6);
      p.salpicar(-50, -50, 50, 50, 90, 1.2, 3.2, 1, 2.0);
      for (const c of CRATERES) p.circulo(c.x, c.z, c.r * 0.9, 0, 2.5);
      p.rect(-38, -41, 38, -34, 0, 2).rect(-24, 20, 28, 28, 0, 2);
      p.romper(3.4, 0.55);
    },
  });
  // Suelos propios: tablones en las trincheras, empedrado en la aldea y la iglesia, hormigón ante el búnker.
  kit.zona({ rect: [-37.5, -39.7, 37.5, -35.0], material: 'tablones', alto: 0.04, mojado: 0.45, desgaste: 0.9 });
  kit.zona({ rect: [-23, 21.0, 27, 26.5], material: 'tablones', alto: 0.04, mojado: 0.45, desgaste: 0.9 });
  kit.zona({ rect: [-34, -28, -20, -18], material: 'empedrado', alto: 0.04, mojado: 0.3, desgaste: 0.9 });
  kit.zona({ rect: [17, -19.5, 35, -14.4], material: 'hormigon', alto: 0.05, mojado: 0.4, desgaste: 0.9, borde: { material: 'hormigon_bunker', ancho: 0.3, alto: 0.1 } });
  kit.zona({ rect: [-39, 7, -27, 17], material: 'tablones', alto: 0.04, mojado: 0.2, desgaste: 1 });
  kit.zona({ rect: [-39, 27, -29, 35], material: 'tablones', alto: 0.04, mojado: 0.2, desgaste: 1 });
  kit.zona({ rect: [31, 18, 41, 26], material: 'hormigon', alto: 0.04, mojado: 0.3, desgaste: 1 });
  kit.zona({ rect: [-46, 17.5, -22, 26.8], material: 'empedrado', alto: 0.04, mojado: 0.45, desgaste: 0.8 });

  // ───────────── 2. MASAS GRANDES ─────────────
  // 2a. Búnker de hormigón (noreste), fachada al sur con tronera y cobertura de tierra.
  const bunker = kit.edificio({ x: 26, z: -24, ancho: 13, fondo: 9, pisos: 1, alto: 3.5, estilo: 'bunker', colorMuro: 0xa8a99a,
    puertas: [{ cara: 'sur', u: -3.2, ancho: 1.7, alto: 2.3, escalones: 1 }], luzPuertas: false, semilla: 5, nombre: 'bunker' });
  {
    const mH = M('hormigon_bunker', { desgaste: 0.9 }), mTierra = M('barro', { desgaste: 0.5 }), mHier = M('hierba', { desgaste: 0.8, color: 0x5d6a3a });
    const mLona = M('lona', { color: 0x4f5a37, desgaste: 0.9 });
    const frente = -24 + 4.5;
    P.cajaM(mH, mat4(0, 0, 0), 27, 2.0, frente + 0.08, 3.4, 0.52, 0.16, { radio: 0.03 });                     // marco de la tronera
    P.cajaM(M('hierro_forjado'), mat4(0, 0, 0), 27, 2.0, frente + 0.13, 2.8, 0.3, 0.05, { radio: 0.02 });
    P.cajaM(kit.emisivo(0xffa04a, 0.8), mat4(0, 0, 0), 27, 2.0, frente + 0.17, 2.4, 0.12, 0.03, { radio: 0.01 });
    // tejado cubierto de tierra, hierba y red de camuflaje
    for (let i = 0; i < 9; i++) P.cajaM(i % 3 ? mTierra : mHier, mat4(0, 0, 0), 21.5 + i * 1.1 + rng.rango(-0.3, 0.3), 3.55 + rng.rango(0, 0.25), -24 + rng.rango(-2.8, 2.8), rng.rango(1.5, 2.7), rng.rango(0.25, 0.5), rng.rango(1.6, 3.2), { radio: 0.15, seg: 2, ry: rng() * 3 });
    P.cajaM(mLona, mat4(0, 0, 0), 31, 3.9, -22.5, 3.8, 0.12, 3.2, { radio: 0.05, rx: 0.12, ry: 0.15, rz: -0.08 });
    P.cajaM(M('hierro_oxidado'), mat4(0, 0, 0), 22.6, 4.8, -26.5, 0.22, 2.4, 0.22, { radio: 0.04 });         // chimenea de ventilación
    P.cajaM(M('hierro_forjado'), mat4(0, 0, 0), 29.5, 5.0, -26, 0.07, 3.0, 0.07, { radio: 0.01 });             // antena
    // sacos ante la puerta y viga de protección
    P.sacos([20.2, -18.4], [24.4, -18.4], { grosor: 0.7, semilla: 7 });
    P.sacos([28.6, -18.0], [32.2, -18.0], { grosor: 0.7, semilla: 8 });
  }

  // 2b. Iglesia sin techo (noroeste): sillería rota, torre decapitada, cabríos quemados, bancos volcados.
  {
    const sill = M('silleria', { desgaste: 0.9 }), ladr = M('ladrillo_encalado', { color: 0x8e8c74, desgaste: 0.95 });
    P.muroRuina(-34.4, -18, -19.6, -18, { mat: sill, grosor: 0.8, semilla: 1, perfil: [[-34.4, -31.5, 2.0], [-31.5, -29, 3.4], [-25, -22.5, 3.8], [-22.5, -19.6, 2.4]],
      huecos: [{ u0: -31.0, u1: -30.0, y0: 1.2, y1: 3.0 }, { u0: -23.9, u1: -22.9, y0: 1.2, y1: 3.2 }] });
    P.muroRuina(-34.4, -28, -19.6, -28, { mat: sill, grosor: 0.8, semilla: 2, perfil: [[-34.4, -30, 6.2], [-30, -24, 7.0], [-24, -21.5, 5.0], [-21.5, -19.6, 3.4]],
      huecos: [{ u0: -32.3, u1: -31.1, y0: 1.7, y1: 4.8 }, { u0: -28.5, u1: -27.3, y0: 1.7, y1: 4.8 }, { u0: -24.7, u1: -23.5, y0: 1.7, y1: 4.6 }] });
    P.muroRuina(-34, -28, -34, -18, { mat: sill, grosor: 0.8, semilla: 3, perfil: [[-28, -25, 6.0], [-25, -21, 4.4], [-21, -18, 2.4]],
      huecos: [{ u0: -24.8, u1: -22.4, y0: 1.8, y1: 4.4 }] });
    P.muroRuina(-20, -28, -20, -18, { mat: sill, grosor: 0.8, semilla: 4, perfil: [[-28, -25.2, 4.2], [-20, -18, 2.0]], huecos: [{ u0: -27.4, u1: -26.2, y0: 1.5, y1: 3.4 }] });
    // torre campanario decapitada (esquina noroeste)
    P.cajaM(sill, mat4(0, 0, 0), -34.7, 4.6, -27.3, 3.4, 9.4, 3.4, { radio: 0.08, seg: 1 });
    for (let i = 0; i < 5; i++) P.cajaM(sill, mat4(0, 0, 0), -34.7 + rng.rango(-1.2, 1.2), 9.4 + rng.rango(0.1, 0.55), -27.3 + rng.rango(-1.2, 1.2), rng.rango(0.6, 1.3), rng.rango(0.5, 1.0), rng.rango(0.6, 1.2), { radio: 0.05, ry: rng() });
    kit.muro(-34.7, -27.3, 3.4, 3.4, 0, { material: 'piedra', nombre: 'torre' });
    // cabríos quemados que asoman sobre los muros
    const quemado = M('troncos', { color: 0x2a221b, desgaste: 1 });
    for (const px of [-31.5, -27.5, -23.5]) {
      for (const s of [-1, 1]) {
        const zE = -23 + s * 5.2, zR = -23, yE = 5.0, yR = 8.2;
        const dz = zR - zE, dy = yR - yE, len = Math.hypot(dz, dy);
        if (px === -27.5 && s === 1) continue;
        L.anadir(kit.cajaRedondeada(0.16, 0.22, len * (px === -23.5 ? 0.55 : 0.9), 0.03, 1), quemado, mat4(px, (yE + yR) / 2 + (px === -23.5 ? -0.7 : 0), (zE + zR) / 2 + (px === -23.5 ? s * 1.0 : 0), 0, Math.atan2(-dy, dz), 0), { uv: 'tablas_viejas' });
      }
    }
    // bancos volcados, altar, escombros
    const banco = M('tablas_viejas', { color: 0x4a3a2c, desgaste: 0.9 });
    const bancos = [[-31.6, -26.0, 0.1], [-31.2, -24.3, -0.15], [-31.0, -22.6, 0.05], [-23.4, -26.2, -0.05], [-23.0, -22.4, 0.2]];
    for (const [bx, bz, br] of bancos) {
      P.cajaM(banco, mat4(0, 0, 0), bx, 0.45, bz, 3.2, 0.1, 0.5, { ry: br, radio: 0.02, uv: 'tablas_viejas' });
      P.cajaM(banco, mat4(0, 0, 0), bx, 0.8, bz - 0.2, 3.2, 0.5, 0.07, { ry: br, rx: 0.5, radio: 0.02, uv: 'tablas_viejas' });
      kit.vallaBaja(bx, bz, 3.2, br, { ancho: 0.55 });
    }
    P.cajaM(sill, mat4(0, 0, 0), -26.5, 0.55, -26.6, 2.6, 1.1, 1.0, { radio: 0.06 });
    P.cajaM(M('laton_bronce', { desgaste: 0.7 }), mat4(0, 0, 0), -26.5, 1.3, -26.6, 0.14, 0.5, 0.14, { radio: 0.02 });
    P.cajaM(M('laton_bronce', { desgaste: 0.7 }), mat4(0, 0, 0), -26.5, 1.45, -26.6, 0.5, 0.12, 0.12, { radio: 0.02 });
    kit.muro(-26.5, -26.6, 2.6, 1.0, 0, { material: 'piedra', nombre: 'altar' });
    void ladr;
  }

  // 2c. Aldea en ruinas al oeste: tres casas derruidas (ladrillo rojo y encalado).
  {
    const rojo = M('ladrillo_rojo', { desgaste: 0.9 }), cal = M('ladrillo_encalado', { color: 0x8f8d76, desgaste: 0.95 });
    // Casa A (-38..-28, 8..16): puerta al sur y brecha al este.
    P.muroRuina(-38, 16, -28, 16, { mat: rojo, grosor: 0.5, semilla: 11, perfil: [[-38, -36, 1.5], [-32, -28, 2.1]], huecos: [{ u0: -29.8, u1: -28.9, y0: 0.9, y1: 1.7 }] });
    P.muroRuina(-38, 8, -28, 8, { mat: rojo, grosor: 0.5, semilla: 12, perfil: [[-38, -34, 4.4], [-34, -31, 5.6], [-31, -28, 3.8]], huecos: [{ u0: -36.8, u1: -35.6, y0: 1.3, y1: 2.9 }, { u0: -31.7, u1: -30.5, y0: 1.3, y1: 2.9 }] });
    P.muroRuina(-38, 8, -38, 16, { mat: rojo, grosor: 0.5, semilla: 13, perfil: [[8, 11, 3.6], [11, 14, 2.4], [14, 16, 1.2]], huecos: [{ u0: 12, u1: 13.2, y0: 1.0, y1: 2.2 }] });
    P.muroRuina(-28, 8, -28, 16, { mat: rojo, grosor: 0.5, semilla: 14, perfil: [[8, 10.5, 4.2], [10.5, 11.5, 2.6], [14, 16, 2.2]], huecos: [{ u0: 8.8, u1: 9.8, y0: 1.2, y1: 2.8 }] });
    // chimenea en pie
    P.cajaM(rojo, mat4(0, 0, 0), -29.1, 2.9, 9.0, 1.2, 5.8, 1.0, { radio: 0.06 });
    kit.muro(-29.1, 9.0, 1.2, 1.0, 0, { material: 'ladrillo', nombre: 'chimenea' });
    // mobiliario caído
    P.cajaM(M('tablas_viejas', { color: 0x5a4936, desgaste: 0.9 }), mat4(0, 0, 0), -34.5, 0.4, 12.4, 1.9, 0.08, 1.0, { ry: 0.3, radio: 0.02, uv: 'tablas_viejas' });
    P.cajaM(M('hierro_oxidado'), mat4(0, 0, 0), -33.2, 0.25, 10.4, 1.9, 0.08, 0.9, { ry: -0.2, radio: 0.02 });
    // Casa B (-38.5..-29.5, 27.5..34.5): baja al sur.
    P.muroRuina(-38.5, 34.5, -29.5, 34.5, { mat: cal, grosor: 0.5, semilla: 21, perfil: [[-38.5, -36, 1.3], [-32, -29.5, 1.8]] });
    P.muroRuina(-38.5, 27.5, -29.5, 27.5, { mat: cal, grosor: 0.5, semilla: 22, perfil: [[-38.5, -33, 3.6], [-33, -29.5, 2.2]], huecos: [{ u0: -36.5, u1: -35.4, y0: 1.2, y1: 2.7 }] });
    P.muroRuina(-38.5, 27.5, -38.5, 34.5, { mat: cal, grosor: 0.5, semilla: 23, perfil: [[27.5, 31, 3.0], [31, 34.5, 1.6]] });
    P.muroRuina(-29.5, 27.5, -29.5, 34.5, { mat: cal, grosor: 0.5, semilla: 24, perfil: [[27.5, 29, 2.4], [32.5, 34.5, 1.8]] });
    // Casa C (32..40, 18.5..25.5): al este, junto al campo de minas.
    P.muroRuina(32, 25.5, 40, 25.5, { mat: rojo, grosor: 0.5, semilla: 31, perfil: [[32, 34.5, 1.2], [38, 40, 1.5]] });
    P.muroRuina(32, 18.5, 40, 18.5, { mat: rojo, grosor: 0.5, semilla: 32, perfil: [[32, 36, 3.4], [36, 40, 4.2]], huecos: [{ u0: 33.3, u1: 34.5, y0: 1.2, y1: 2.7 }, { u0: 37.2, u1: 38.4, y0: 1.2, y1: 2.8 }] });
    P.muroRuina(32, 18.5, 32, 21, { mat: rojo, grosor: 0.5, semilla: 33, perfil: [[18.5, 21, 2.4]] });
    P.muroRuina(40, 18.5, 40, 25.5, { mat: rojo, grosor: 0.5, semilla: 34, perfil: [[18.5, 25.5, 2.0]], huecos: [{ u0: 21.5, u1: 22.7, y0: 1.0, y1: 1.9 }] });
  }

  // 2d. Tanque destrozado (centro-este) con su cañón caído.
  P.tanque(17, 4, 0.55);

  // ───────────── 3. TRINCHERAS DE SACOS Y TABLAS (pasillos de 4,7 m) ─────────────
  // Línea enemiga (norte): dos parapetos con huecos escalonados; el revestimiento mira al pasillo.
  P.lineaSacos(-34.5, [[-37, -26], [-21, -9], [-4, 9], [14, 37]], { lado: -1, semilla: 5 });
  P.lineaSacos(-40.2, [[-37, -22], [-17, -6], [-1, 12], [17, 37]], { lado: 1, semilla: 6 });
  // Línea propia (sur): huecos escalonados y entrada de la aldea al oeste.
  P.lineaSacos(20.5, [[-22, -9], [-3, 16], [22, 26]], { lado: 1, semilla: 7 });
  P.lineaSacos(27.0, [[-22, -12], [-6, 12], [18, 26]], { lado: -1, semilla: 8 });
  // Nidos de ametralladora pesada
  P.nido(-3, -18, { rot: 0, semilla: 9 });
  P.nido(-14, 15.5, { rot: 0, semilla: 10 });

  // ───────────── 4. ALAMBRADAS, ERIZOS, CAMPO DE MINAS ─────────────
  for (const [a, b] of [[-44, -30], [-24, -16], [16, 24], [30, 44]]) kit.valla({ puntos: [[a, -12.5], [b, -12.5]], tipo: 'alambre', colision: 'baja', semilla: 3 });
  kit.valla({ puntos: [[-44, 38], [-34, 38]], tipo: 'alambre', colision: 'baja', semilla: 4 });
  kit.valla({ puntos: [[31, -8.5], [31, 7]], tipo: 'alambre', colision: 'baja', semilla: 5 });
  for (const [x, z, r] of [[-27, -9.5, 0.2], [-10, -9, 1.1], [10, -10, -0.4], [26, -9.5, 0.7], [-8, 32, 0.3], [14, 31, -0.6]]) P.erizo(x, z, r);
  for (const [x, z, r] of [[-20, -12.5, 0.4], [18, -12.5, 1.2], [-31, -12.5, 2.1], [32, 7.5, 0.6], [-1, -37, 0.4]]) P.rolloAlambre(x, z, r);
  // Señales del campo de minas (este)
  for (const [x, z, r] of [[32, -8.6, 0.2], [32.4, 7.6, -0.2], [43.5, -8, 0.3], [43.5, 7, -0.2], [37.5, -9.2, 0.1], [37.5, 8.2, -0.1]]) P.cartelMinas(x, z, r);

  // ───────────── 5. ÁRBOLES CALCINADOS, POSTES Y CRUCES ─────────────
  const evitarMasas = [
    { x: -27, z: -23, hx: 8.6, hz: 6.6, margen: 1.5 }, { x: 26, z: -24, hx: 7.5, hz: 5.5, margen: 1.5 }, { x: -33, z: 12, hx: 6.5, hz: 4.8, margen: 1.5 },
    { x: -34, z: 31, hx: 5.8, hz: 4.2, margen: 1.5 }, { x: 36, z: 22, hx: 5, hz: 4.2, margen: 1.5 }, { x: 17, z: 4, r: 6 }, { x: 0, z: 0, r: 8 },
    { rect: [-38, -41, 38, -33.5], margen: 0.8 }, { rect: [-24, 19.5, 28, 28.5], margen: 0.8 }, { rect: [29, -10, 45, 9], margen: 0.5 }, { x: -3, z: -18, r: 4 }, { x: -14, z: 15.5, r: 4 },
    { rect: [-46, 17, -22, 27], margen: 0.5 },
  ];
  const arboles = kit.dispersar({ area: [{ x0: -44, z0: -33, x1: -36, z1: 4 }, { x0: -20, z0: -10, x1: 40, z1: -3 }, { x0: 36, z0: 28, x1: 44, z1: 44 }, { x0: -22, z0: 29, x1: 30, z1: 44 }, { x0: -44, z0: 36, x1: -22, z1: 44 }, { x0: 38, z0: -44, x1: 44, z1: -14 }],
    cantidad: 12, distMin: 8, libre: 3, semilla: 5, evitar: evitarMasas });
  arboles.forEach((a, i) => kit.arbol({ x: a.x, z: a.z, tipo: 'muerto', escala: 0.8 + a.u * 0.7, colorTronco: 0x2b2520, semilla: i + 3 }));
  // árboles y ruinas fuera del mapa (el frente continúa)
  for (let i = 0; i < 26; i++) {
    const lado = i % 4, t = rng.rango(-60, 60), d = rng.rango(48, 60);
    const x = lado === 0 ? -d : lado === 1 ? d : t, z = lado === 2 ? -d : lado === 3 ? d : t;
    if (lado === 3 && rng() < 0.5) continue;
    kit.arbol({ x, z, tipo: 'muerto', escala: rng.rango(0.8, 1.5), colorTronco: 0x2b2520, semilla: i, colision: false });
  }
  const mRuinaFondo = M('ladrillo_rojo', { desgaste: 1 });
  for (let i = 0; i < 12; i++) {
    const x = rng.rango(-60, 60), z = -rng.rango(48, 62);
    P.cajaM(mRuinaFondo, mat4(0, 0, 0), x, 1.5 + rng() * 1.8, z, rng.rango(2, 5), 3 + rng() * 3.6, rng.rango(0.5, 0.9), { radio: 0.05 });
  }
  for (let i = 0; i < 8; i++) {
    const z = rng.rango(-40, 36), x = (i % 2 ? 1 : -1) * rng.rango(49, 58);
    P.cajaM(mRuinaFondo, mat4(0, 0, 0), x, 0.9 + rng() * 1.2, z, rng.rango(1.5, 3.5), 1.6 + rng() * 2, rng.rango(0.5, 0.9), { radio: 0.05, ry: rng() });
  }
  // Postes de telégrafo: dos en pie con el cable roto y dos caídos
  const pA = kit.poste({ x: 41.5, z: -36, alto: 7.5, tipo: 'madera' }), pB = kit.poste({ x: 41.5, z: -20, alto: 7.5, tipo: 'madera' });
  kit.catenaria({ desde: [41.5, pA.puntaY, -36], hasta: [41.5, pB.puntaY, -20], caida: 1.2 });
  kit.catenaria({ desde: [41.5, pB.puntaY, -20], hasta: [40.2, 0.2, -15.5], caida: 0.4 });
  const pC = kit.poste({ x: -41.5, z: -38, alto: 7.5, tipo: 'madera' });
  kit.catenaria({ desde: [-41.5, pC.puntaY, -38], hasta: [-39.5, 0.2, -31], caida: 0.6 });
  P.posteCaido(6, -25, 1.0, 7.2); P.posteCaido(-30, 38, -0.4, 6.5);
  kit.vallaBaja(6 + Math.sin(1.0) * 3.6, -25 + Math.cos(1.0) * 3.6, 7.2, Math.atan2(-Math.cos(1.0), Math.sin(1.0)), { ancho: 0.35 });
  kit.vallaBaja(-30 + Math.sin(-0.4) * 3.25, 38 + Math.cos(-0.4) * 3.25, 6.5, Math.atan2(-Math.cos(-0.4), Math.sin(-0.4)), { ancho: 0.35 });
  // Cementerio improvisado junto a la iglesia
  P.tumbas([{ x: -41, z: -14, casco: true, rot: 0.1 }, { x: -39.2, z: -14.4, rot: -0.15, incl: 0.1 }, { x: -37.4, z: -13.8, casco: true, rot: 0.05 }, { x: -41.3, z: -11.6, rot: 0.2, incl: -0.12 }, { x: -39.4, z: -11.9, casco: true, rot: -0.05 },
    { x: -37.6, z: -11.3, rot: 0.15 }, { x: -41.1, z: -9.2, rot: 0, casco: true }, { x: -39.1, z: -9.5, rot: -0.2, incl: 0.15 }, { x: 23, z: -13.6, rot: 0.1 }, { x: 25, z: -13.9, casco: true, rot: -0.1 }]);

  // ───────────── 6. DETALLES: escombros, terrones, tablones, charcos y gas ─────────────
  const evitarDet = [...evitarMasas.slice(0, 5)];
  const ladrilloR = M('ladrillo_rojo', { desgaste: 1 }), barroM = M('barro', { desgaste: 0.7 }), tab = M('tablas_viejas', { desgaste: 1 });
  const trozos = [];
  for (const [cx, cz, rx, rz, n] of [[-27, -23, 9, 7, 26], [-33, 12, 7, 5.5, 22], [-34, 31, 6, 4.5, 16], [36, 22, 5, 4.5, 14], [26, -24, 9, 6.5, 10]]) {
    for (let i = 0; i < n; i++) trozos.push({ x: cx + rng.rango(-rx, rx), z: cz + rng.rango(-rz, rz), y: 0, rot: rng() * 6.28, rotZ: rng.rango(-0.3, 0.3), esc: [rng.rango(0.6, 1.4), rng.rango(0.5, 1.2), rng.rango(0.6, 1.3)], color: [0x8a6a58, 0x6e6a5c, 0x9a8d7a][i % 3] });
  }
  kit.instancias(kit.cajaRedondeada(0.34, 0.2, 0.24, 0.05, 1), ladrilloR, trozos.filter((t) => kit.libre(t.x, t.z, 0.2)), { nombre: 'escombros' });
  const terrones = [];
  for (const c of CRATERES) for (let i = 0; i < 9; i++) { const a = rng() * 6.28, r = c.r * rng.rango(0.95, 1.35); terrones.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r, y: -0.02, rot: rng() * 6.28, esc: [rng.rango(0.8, 2), rng.rango(0.6, 1.4), rng.rango(0.8, 1.8)], color: [0x3a3226, 0x4a4030, 0x2f2a20][i % 3] }); }
  kit.instancias(kit.cajaRedondeada(0.4, 0.2, 0.34, 0.08, 1), barroM, terrones, { nombre: 'terrones' });
  const maderas = kit.dispersar({ area: { x0: -42, z0: -34, x1: 42, z1: 40 }, cantidad: 40, distMin: 3, libre: 0.3, semilla: 12, evitar: [...evitarMasas, { x: 0, z: 0, r: 5 }] });
  kit.instancias(kit.cajaRedondeada(1.2, 0.07, 0.16, 0.015, 1), tab, maderas.map((p) => ({ x: p.x, z: p.z, y: 0.01, rot: p.rot, esc: [p.esc, 1, 1] })), { nombre: 'tablas_sueltas', sombras: false });

  const evitarParche = evitarMasas.slice(0, 5).map((e) => ({ ...e, margen: 0.5 }));
  // charcos de agua turbia en el fondo de los cráteres
  CRATERES.forEach((c, i) => kit.parche({ tipo: 'charco', x: c.x + rng.rango(-0.4, 0.4), z: c.z + rng.rango(-0.4, 0.4), radio: c.r * rng.rango(0.42, 0.62), rot: rng() * 6, color: 0x2b3a30, semilla: i }));
  kit.parches({ tipo: 'charco', area: { x0: -42, z0: -34, x1: 42, z1: 42 }, cantidad: 16, radio: [0.8, 2.2], evitar: [...evitarParche, { x: 0, z: 0, r: 6 }], color: 0x27322d, semilla: 7 });
  // manchas de barro oscuro y quemaduras
  kit.parches({ tipo: 'mancha', area: { x0: -44, z0: -40, x1: 44, z1: 42 }, cantidad: 10, radio: [2.5, 5.5], evitar: evitarParche, color: 0x2e281d, opacidad: 0.25, semilla: 31 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -38, x1: 42, z1: 40 }, cantidad: 7, radio: [0.7, 1.4], evitar: evitarParche, color: 0x1d1a15, opacidad: 0.4, semilla: 8 });
  // gas amarillento a ras de suelo en las zonas bajas
  for (const [i, c] of CRATERES.slice(0, 9).entries()) kit.parche({ tipo: 'mancha', x: c.x, z: c.z, radio: c.r * 1.35, rot: i, color: 0xa7a24a, opacidad: 0.2, capa: 3, semilla: i });
  kit.parche({ tipo: 'mancha', x: 0, z: -36.5, radio: 10, alargado: 3, color: 0xa7a24a, opacidad: 0.16, capa: 3 });
  kit.parche({ tipo: 'mancha', x: 2, z: 24, radio: 9, alargado: 2.6, color: 0x9a9848, opacidad: 0.14, capa: 3 });
  // restos de hierba seca y paja (en vez de hojas)
  for (let i = 0; i < 8; i++) kit.parche({ tipo: 'hojas', x: rng.rango(-40, 40), z: rng.rango(-34, 40), radio: rng.rango(2, 4), cantidad: 22, semilla: i, paleta: [0x4a4a2a, 0x5b5a34, 0x3d3a26, 0x6a5c3a, 0x55512f] });

  // ───────────── 7. LUCES (≤ 10) y bengala ─────────────
  const lampara = (x, y, z) => { const g = kit.cajaRedondeada(0.18, 0.26, 0.18, 0.04, 1); L.anadir(g, kit.emisivo(0xffb25a, 2.6), mat4(x, y, z), { uv: false }); L.anadir(kit.cajaRedondeada(0.04, 0.5, 0.04, 0.01, 1), M('hierro_forjado'), mat4(x, y + 0.35, z), { uv: false }); };
  kit.luz({ x: 22.6, y: 2.8, z: -17.4, color: 0xffc070, intensidad: 20, distancia: 15 });
  lampara(22.6, 2.55, -17.6);
  kit.luz({ x: -26.5, y: 2.2, z: -23, color: 0xffd48a, intensidad: 12, distancia: 13 });
  lampara(-26.6, 1.5, -24.2); P.cajaM(M('tablas_viejas'), mat4(0, 0, 0), -26.6, 0.65, -24.2, 0.4, 0.4, 0.4, { radio: 0.04 });
  kit.luz({ x: -4, y: 2.4, z: 23.8, color: 0xffb860, intensidad: 14, distancia: 12 });
  lampara(-4, 2.05, 21.6);
  kit.luz({ x: 20, y: 2.4, z: 23.8, color: 0xffb860, intensidad: 14, distancia: 12 });
  lampara(20, 2.05, 21.6);
  kit.luz({ x: -33, y: 1.0, z: 12, color: 0xff8a3a, intensidad: 10, distancia: 9 });
  P.cajaM(kit.emisivo(0xff7a2a, 2.4), mat4(0, 0, 0), -33, 0.1, 12, 1.0, 0.12, 0.7, { radio: 0.03 });
  kit.luz({ x: 17.6, y: 2.0, z: 4.6, color: 0xff5a20, intensidad: 16, distancia: 10 });
  kit.luz({ x: 0, y: 2.4, z: -37.4, color: 0xcfe2c0, intensidad: 12, distancia: 14 });
  lampara(0, 2.1, -35.6);

  // Bengala: cae despacio sobre el frente y lo ilumina en blanco verdoso
  const bengala = kit.luz({ x: 0, y: 24, z: -20, color: 0xdfffe6, intensidad: 0, distancia: 65 });
  const matBengala = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 3.4), toneMapped: false });
  const malla = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), matBengala);
  malla.frustumCulled = false; malla.visible = false; kit.anadir(malla); kit._propios.push(matBengala);
  const estado = { t: 0, dur: 13, espera: 3, x0: 0, z0: -20, vx: 1.2, rnd: kit.rng(77) };

  // ───────────── 8. JUGABILIDAD ─────────────
  const m = juego.mundo, vh = juego.vehiculos;
  const evitar = [...evitarMasas, { x: 0, z: 0, r: 7 }];
  const explosivos = [
    ...[[14.2, 10.6], [20.8, 9.4], [20.5, -16.5], [-24, -14.6]].map(([x, z]) => ({ x, z, rot: rng() * 6 })),
    ...kit.dispersar({ area: { x0: -40, z0: -32, x1: 40, z1: 34 }, cantidad: 6, distMin: 11, libre: 1.2, semilla: 21, evitar }),
  ];
  for (const p of explosivos) m?.crear?.('explosivo', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  const cajasFijas = [[-14, 23.8], [8, 23.8], [-12, -37.5], [11, -37.5]];
  for (const [x, z] of cajasFijas) m?.crear?.('caja', { x, z, rot: rng() * 6, eraIdx });
  for (const p of kit.dispersar({ area: { x0: -40, z0: -32, x1: 40, z1: 34 }, cantidad: 5, distMin: 9, libre: 1, semilla: 22, evitar })) m?.crear?.('caja', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  for (const p of kit.dispersar({ area: { x0: -38, z0: -30, x1: 38, z1: 32 }, cantidad: 3, distMin: 10, libre: 1, semilla: 23, evitar })) m?.crear?.('empujable', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  m?.crear?.('emplazamiento', { x: -3, z: -18.2, rot: Math.PI, eraIdx });
  m?.crear?.('emplazamiento', { x: -14, z: 15.7, rot: Math.PI, eraIdx });
  vh?.crear?.(era.vehiculo, { x: -14, z: 4, rot: 0.3 });
  vh?.crear?.(era.vehiculo, { x: 4, z: -24, rot: 0.2 });
  // Interactivos de la era: alambradas, minas (en la zona marcada) y sirena
  for (const [x, z, r] of [[-27, -9.5, 0], [29, -9.8, 0], [-1, -26, 0]]) m?.crear?.('alambrada', { x, z, rot: r, eraIdx });
  for (const [x, z] of [[34, -5], [37, -2], [35, 1], [39, 3.5], [38, -6.5], [41, 0]]) m?.crear?.('mina_terrestre', { x, z, eraIdx });
  m?.crear?.('sirena_antiaerea', { x: -18, z: -8, rot: 0, eraIdx });

  // ───────────── 9. DATOS DEL MAPA ─────────────
  const puertaB = bunker.puertas[0];
  return {
    grupo: kit.grupo,
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x: -2.5, z: 5 }, { x: 2.5, z: 5 }],
    puntosAparicion: [
      { x: -38, z: -43, tipo: 'borde' }, { x: -18, z: -43, tipo: 'borde' }, { x: 0, z: -43, tipo: 'borde' }, { x: 18, z: -43, tipo: 'borde' }, { x: 38, z: -43, tipo: 'borde' },
      { x: -43, z: -10, tipo: 'borde' }, { x: 43, z: -10, tipo: 'borde' }, { x: -43, z: 8, tipo: 'borde' }, { x: 43, z: 12, tipo: 'borde' },
      { x: -12, z: 43, tipo: 'borde' }, { x: 14, z: 43, tipo: 'borde' },
      { x: -23.5, z: -37.4, tipo: 'interior', peso: 0.7 }, { x: 5.5, z: -37.4, tipo: 'interior', peso: 0.7 },
      { x: -27, z: -16.2, tipo: 'interior', peso: 0.5 },
      { x: puertaB.x, z: puertaB.z + 1.6, tipo: 'interior', peso: 0.5 },
      { x: -6, z: -14, tipo: 'interior', peso: 0.5 },
    ],
    zonas: [{ id: 'centro', x: 0, z: 0, r: 12 }, { id: 'trinchera_enemiga', x: 0, z: -37, r: 12 }, { id: 'trinchera_propia', x: 2, z: 24, r: 12 }],
    actualizar(dt) {
      const e = estado;
      e.t += dt;
      if (e.t < 0) { malla.visible = false; bengala.intensidad = 0; return; }
      const k = e.t / e.dur;
      if (k >= 1) { e.t = -e.espera; e.x0 = e.rnd.rango(-24, 24); e.z0 = e.rnd.rango(-34, -6); e.vx = e.rnd.rango(-1.6, 1.6); return; }
      const y = 27 - 15 * k - 2 * Math.sin(k * 3);
      bengala.pos.set(e.x0 + e.vx * e.t, y, e.z0 + Math.sin(e.t * 0.5) * 1.5);
      const sube = Math.min(1, e.t / 0.6), baja = Math.min(1, (e.dur - e.t) / 2.0);
      const parpadeo = 0.88 + 0.12 * Math.sin(e.t * 23) * Math.sin(e.t * 7.3);
      bengala.intensidad = 260 * sube * baja * parpadeo;
      malla.position.copy(bengala.pos); malla.visible = true; malla.scale.setScalar(0.6 + 0.4 * baja);
    },
  };
}
