// ERA Z · Era 1 (Vapor, 1850–1899) · Estación Cruz del Diablo.
// Pueblo fronterizo al atardecer: vía de tren al norte (este–oeste), estación con andén, saloon, sheriff, almacén, herrería,
// establo con corral, calle principal de tierra y una mina al este con raíles y vagoneta.
//
// Plano (x → este, z → sur; la cámara mira al norte):
//   z -40  vía (franja de 3 m despejada, el tren cruza de x=-50 a x=50)       · andén y estación (x -28..-4)
//   z -12  fachadas sur de la hilera norte: saloon (x -24) · sheriff (-3) · almacén (19)
//   z   0  calle principal y centro abierto (inicio de los jugadores)
//   z +24  herrería (x -30) y establo con corral (x 28)
//   x +41  macizo rocoso con la boca de la mina (z -22) y raíles hacia el oeste
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ERAS } from '../datos/eras.js';
import { cajaRedondeada, cilindro, torno, matriz } from './lib/geometria.js';

const IDX = 1;
const ZV = -40;                                   // eje de la vía

export async function construir(juego, kit) {
  const eraIdx = kit.eraIdx ?? IDX, era = ERAS[eraIdx] ?? ERAS[IDX];
  const rng = kit.rng(77);
  await kit.precargar(['tierra', 'arena', 'gravilla_via', 'tablones', 'tablas_viejas', 'tablas_pintadas', 'chapa_ondulada', 'hierro_forjado',
    'hierro_oxidado', 'laton_bronce', 'silleria', 'hormigon', 'paja', 'saco_arena', 'lona', 'agua', 'troncos', 'hierba', 'cuero', 'cuerda']);
  const M = (n, o) => kit.mat(n, o);
  const L = kit.lote0;
  const mm = (m, ...r) => new THREE.Matrix4().multiplyMatrices(m, matriz(...r));
  const evitar = [];                               // zonas que los elementos jugables no deben ocupar
  const rect = (x0, z0, x1, z1, margen = 0) => evitar.push({ rect: [x0, z0, x1, z1], margen });

  // ───────────── 1. SUELO: tierra parda y arena naranja, calle clara, periferia de desierto ─────────────
  kit.suelo({
    tam: 160, material: 'tierra', mezcla: 'arena', mojado: 0, semilla: 9, contraste: 1.7, desgaste: 0.45,
    relieve: { amp: 0.05, escala: 14, centroPlano: 60 },
    pintura: (p) => {
      p.fondo(0.0);
      p.rect(-80, -80, 80, -49, 1, 5).rect(-80, 49, 80, 80, 1, 5).rect(-80, -80, -49, 80, 1, 5).rect(49, -80, 80, 80, 1, 5);   // periferia arenosa
      p.salpicar(-48, -46, 48, 48, 85, 1.6, 5.5, 1, 2).salpicar(-48, -46, 48, 48, 30, 1.2, 3.5, 0, 1.5);
      p.camino([[-50, 0.5], [-20, 0], [0, 0.5], [22, 0], [50, 1]], 13, 0, 3.5);                       // calle principal arenosa
      p.circulo(0, 1, 15, 0, 4);                                                                      // plaza de la calle
      p.camino([[-4, -12], [-4, -34]], 7, 0, 2.5).camino([[9, -12], [9, -36]], 7, 0, 2.5);             // callejones hacia la vía
      p.camino([[0, 12], [0, 48]], 6, 0, 2.5).camino([[-30, 14], [-30, 20]], 8, 0, 2).camino([[28, 12], [28, 20]], 8, 0, 2);
      p.camino([[-46, -40], [46, -40]], 6, 0, 2);                                                      // tierra oscura bajo la vía
      p.romper(3.4, 0.55);
    },
  });
  // Vía: lecho de balasto
  kit.zona({ rect: [-47, ZV - 1.9, 47, ZV + 1.9], material: 'gravilla_via', alto: 0.05 });
  kit.zona({ rect: [26, -22.9, 38, -21.1], material: 'gravilla_via', alto: 0.04 });
  rect(-50, ZV - 2.2, 50, ZV + 2.2);

  // ───────────── 2. VÍA: traviesas, carriles, juntas ─────────────
  const mTrav = M('tablas_viejas', { color: 0x5b4a3a, desgaste: 0.7 });
  const trav = [];
  for (let x = -46.4; x <= 46.4; x += 0.78) trav.push({ x: x + rng.rango(-0.03, 0.03), y: 0.05, z: ZV + rng.rango(-0.06, 0.06), rot: Math.PI / 2 + rng.rango(-0.02, 0.02), esc: [2.7, 1, 1], color: rng.elegir([0x6a5a48, 0x594a3b, 0x7a6a55, 0x4d4036]) });
  kit.instancias(cajaRedondeada(1, 0.13, 0.26, 0.025, 1), mTrav, trav, { sombras: false, nombre: 'traviesas' });
  const mRiel = M('hierro_oxidado', { color: 0x6b5448, desgaste: 0.3 });
  for (const k of [-0.72, 0.72]) {
    L.caja(mRiel, 0, 0.26, ZV + k, 94, 0.13, 0.09, { radio: 0.02 });
    L.caja(M('hierro_forjado', { color: 0x2c2a29 }), 0, 0.19, ZV + k, 94, 0.07, 0.15, { radio: 0.02 });
  }
  // Vía de la mina
  const tmina = [];
  for (let x = 27.2; x <= 37.6; x += 0.7) tmina.push({ x, y: 0.045, z: -22, rot: Math.PI / 2, esc: [1.9, 1, 1], color: rng.elegir([0x6a5a48, 0x594a3b, 0x7a6a55]) });
  kit.instancias(cajaRedondeada(1, 0.1, 0.22, 0.02, 1), mTrav, tmina, { sombras: false, nombre: 'traviesas_mina' });
  for (const k of [-0.46, 0.46]) L.caja(mRiel, 32.5, 0.19, -22 + k, 11, 0.1, 0.07, { radio: 0.015 });
  L.caja(M('tablas_viejas'), 26.8, 0.2, -22, 0.25, 0.4, 1.7, { radio: 0.03 });                   // tope del final de la vía

  // ───────────── 3. CARTELES (un solo atlas con texto) ─────────────
  const cart = crearCarteles(kit);

  // ───────────── 4. ARQUITECTURA ─────────────
  const mTabla = (c) => M('tablas_pintadas', { color: c });
  const colMadera = 0x6f4d33;

  // Estación (x -26..-8): madera curtida con detalles blancos
  const estacion = kit.edificio({
    x: -17, z: -30, ancho: 18, fondo: 6, pisos: 1, alto: 4.8, estilo: 'madera', colorMuro: 0x7a5a3d, muro: 'tablas_pintadas',
    tejado: { tipo: 'dos_aguas', material: 'tablas_viejas', color: 0x6d5a45, alero: 1.0, pendiente: 0.34, chimenea: { x: 5, z: 0.4, alto: 1.8 } },
    ventanas: { marcoColor: 0xe8e0cf, ancho: 1.2, alto: 1.5, sep: 3.6, luz: 0.7, postigos: false },
    puertas: [{ cara: 'sur', u: -4, ancho: 1.8, alto: 2.5, escalones: 1 }, { cara: 'norte', u: -4, ancho: 1.8, alto: 2.5, escalones: 1 }],
    luzPuertas: false, semilla: 5, nombre: 'estacion',
  });
  rect(-26.5, -33.5, -7.5, -24.5, 0.8);
  // Marquesina del andén (posts + techo, al norte de la estación)
  const andenZ0 = -37.4, andenZ1 = -33;
  kit.bloque({ x: -16, z: (andenZ0 + andenZ1) / 2, ancho: 24, fondo: andenZ1 - andenZ0, alto: 0.32, material: 'tablones', color: 0xb9a58c, colision: false });
  L.caja(M('tablas_viejas', { color: 0x4d3f33 }), -16, 0.16, andenZ0 - 0.05, 24.2, 0.34, 0.12, { radio: 0.02 });       // canto del andén
  const mTejadoA = M('chapa_ondulada', { color: 0x59595a, desgaste: 0.7 });
  L.caja(mTejadoA, -16, 3.45, andenZ0 + 1.9, 23, 0.1, 4.4, { radio: 0.03 });
  L.caja(M('hierro_forjado'), -16, 3.37, andenZ0 + 0.0, 23, 0.16, 0.16, { radio: 0.03 });
  for (const px of [-26, -21, -16, -11, -6]) {
    L.caja(mTabla(0xe6e0d0), px, 1.7, andenZ0 + 0.4, 0.2, 3.4, 0.2, { radio: 0.03 });
    kit.pilar(px, andenZ0 + 0.4, 0.2, { nombre: 'poste_anden' });
    L.caja(M('hierro_forjado'), px + 0.35, 3.1, andenZ0 + 0.4, 0.55, 0.07, 0.07, { rotZ: 0.8, radio: 0.01 });
  }
  rect(-29, -37.6, -3, -32.8);
  // Porche de la estación (sur)
  porche(kit, { xa: -26, xb: -8, zF: -27, prof: 1.5, yT: 3.1, posts: [-25.6, -20.5, -13, -8.4], mT: mTabla(0x8a6a4c), deck: false, escalon: false });
  cart.poner('estacion', -17, 3.95, -26.95, 7, 1.75, 0, 0.12);

  // Saloon: dos pisos, falsa fachada, balcón y puertas batientes
  const saloon = kit.edificio({
    x: -24, z: -16.5, ancho: 15, fondo: 9, pisos: 2, estilo: 'madera', colorMuro: 0x8a4a33, muro: 'tablas_pintadas',
    tejado: { tipo: 'dos_aguas', material: 'chapa_ondulada', color: 0x6b6258, alero: 0.4, pendiente: 0.18, chimenea: { x: -4.5, z: 0, alto: 1.2 } },
    falsaFachada: { alto: 2.6 }, ventanas: { marcoColor: 0xeadfc6, ancho: 1.1, alto: 1.5, sep: 2.7, luz: 0.65, postigos: false },
    puertas: [{ cara: 'sur', u: 0, ancho: 2.3, alto: 2.6, escalones: 0 }], semilla: 3, nombre: 'saloon',
  });
  rect(-32, -21.5, -16, -11.5, 0.4);
  porche(kit, { xa: -31.5, xb: -16.5, zF: -12, prof: 2.4, yT: 3.12, posts: [-31.2, -27, -21, -16.8], mT: mTabla(0xdacdb0), deck: true, barandilla: true });
  batientes(kit, -24, -12, 2.3);
  cart.poner('saloon', -24, 7.7, -11.9, 9, 2.25, 0, 0.1);
  farolPorche(kit, -27.5, 2.3, -9.8, true); farolPorche(kit, -20.5, 2.3, -9.8, false);

  // Sheriff
  kit.edificio({
    x: -3, z: -15.5, ancho: 8, fondo: 7, pisos: 1, alto: 4.2, estilo: 'madera', colorMuro: 0x8a7a58, muro: 'tablas_pintadas',
    tejado: { tipo: 'dos_aguas', material: 'chapa_ondulada', color: 0x57534e, alero: 0.4, pendiente: 0.15 },
    falsaFachada: { alto: 1.6 }, ventanas: { marcoColor: 0x2c2a28, ancho: 1.0, alto: 1.3, sep: 3, luz: 0.5, rejas: true, postigos: false },
    puertas: [{ cara: 'sur', u: 0, ancho: 1.5, alto: 2.4, escalones: 0 }], semilla: 9, nombre: 'sheriff',
  });
  rect(-7.2, -19.2, 1.2, -11.8, 0.4);
  porche(kit, { xa: -7, xb: 1, zF: -12, prof: 2.0, yT: 3.0, posts: [-6.8, 0.8], mT: mTabla(0x6a5642), deck: true });
  cart.poner('sheriff', -3, 4.95, -11.9, 5.6, 1.4, 0, 0.1);
  cart.poner('busca', 3.35, 1.7, -9.4, 0.9, 0.45, Math.PI * 0.02, 0.0);
  farolPorche(kit, -1.5, 2.2, -10.2, true);

  // Almacén general
  kit.edificio({
    x: 19, z: -16, ancho: 13, fondo: 8, pisos: 1, alto: 5.2, estilo: 'madera', colorMuro: 0x6f6350, muro: 'tablas_viejas',
    tejado: { tipo: 'dos_aguas', material: 'chapa_ondulada', color: 0x8a6a4a, alero: 0.4, pendiente: 0.16 },
    falsaFachada: { alto: 2.0 }, ventanas: { marcoColor: 0xe4d9bd, ancho: 1.6, alto: 1.5, sep: 3.8, luz: 0.5, postigos: false },
    puertas: [{ cara: 'sur', u: 0, ancho: 2.6, alto: 3.0, escalones: 0 }], semilla: 12, nombre: 'almacen',
  });
  rect(12.3, -20.2, 25.7, -11.8, 0.4);
  porche(kit, { xa: 12.5, xb: 25.5, zF: -12, prof: 2.2, yT: 3.4, posts: [12.9, 16.3, 21.7, 25.1], mT: mTabla(0x7f6a52), deck: true });
  cart.poner('almacen', 19, 6.2, -11.9, 8, 2, 0, 0.1);
  farolPorche(kit, 15.5, 2.5, -9.9, true);

  // Herrería (sur-oeste): cobertizo de chapa con fragua al aire libre
  const herreria = kit.edificio({
    x: -30, z: 24, ancho: 10, fondo: 8, pisos: 1, alto: 4.2, estilo: 'industrial', muro: 'tablas_viejas', colorMuro: 0x5b4b3d,
    tejado: { tipo: 'dos_aguas', material: 'chapa_ondulada', color: 0x45474a, alero: 0.6, pendiente: 0.22, chimenea: { x: -3, z: -1, alto: 2 } },
    ventanas: { marcoColor: 0x2c2a28, ancho: 1.1, alto: 1.2, sep: 3.4, luz: 0.8, postigos: false },
    puertas: [{ cara: 'sur', u: -2, ancho: 2.8, alto: 2.8, escalones: 0 }], semilla: 21, nombre: 'herreria',
  });
  rect(-35.3, 19.8, -24.7, 28.2, 0.4);
  cart.poner('herreria', -33, 3.5, 28.05, 3.6, 0.9, 0, 0.1);
  // Fragua exterior al este del taller
  L.caja(M('silleria', { color: 0x6e665c }), -22.5, 0.5, 25, 2.2, 1.0, 1.6, { radio: 0.05 }); kit.muro(-22.5, 25, 2.2, 1.6, 0, { nombre: 'fragua' });
  L.caja(kit.emisivo(0xff7a2a, 3.2), -22.5, 1.02, 25, 1.4, 0.06, 0.9, { radio: 0.02, uv: false });
  L.cajaBase(M('hierro_forjado'), -22.5, 0, 22.6, 0.7, 0.8, 0.5, { radio: 0.04 }); kit.muro(-22.5, 22.6, 0.7, 0.5, 0, { nombre: 'yunque' });
  L.caja(M('hierro_forjado'), -22.5, 0.88, 22.6, 1.0, 0.14, 0.34, { radio: 0.03 });
  L.cajaBase(M('silleria', { color: 0x6e665c }), -22.5, 0, 26.6, 0.9, 1.9, 0.9);        // chimenea de la fragua
  L.cajaBase(M('silleria', { color: 0x6e665c }), -22.5, 1.9, 26.6, 0.6, 2.1, 0.6);
  kit.luz({ x: -22.5, y: 1.6, z: 24.1, color: 0xff7a30, intensidad: 26, distancia: 9 });

  // Establo y corral (sur-este)
  kit.edificio({
    x: 28, z: 26, ancho: 10, fondo: 7, pisos: 1, alto: 4.0, estilo: 'madera', colorMuro: 0x7a5b40, muro: 'tablas_viejas',
    tejado: { tipo: 'dos_aguas', material: 'tablas_viejas', color: 0x55483a, alero: 0.5, pendiente: 0.4 },
    ventanas: { marcoColor: 0x2c2a28, ancho: 0.9, alto: 1.0, sep: 4, luz: 0.2, postigos: false },
    puertas: [{ cara: 'sur', u: 0, ancho: 3.2, alto: 3.0, escalones: 0 }], semilla: 31, nombre: 'establo',
  });
  rect(22.8, 22.3, 33.2, 29.7, 0.4);
  kit.valla({ puntos: [[22.8, 18.2], [18, 18.2]], tipo: 'madera' });
  kit.valla({ puntos: [[13, 18.2], [10, 18.2], [10, 32], [22.8, 32]], tipo: 'madera' });
  rect(9.6, 17.6, 22.8, 32.4);
  paca(kit, 14, 30, 0.2); paca(kit, 15.3, 30.2, -0.3); paca(kit, 14.5, 30.1, 0.1, 1.0);
  abrevadero(kit, 18.5, 21, 0);

  // Macizo rocoso y mina (este)
  const mRoca = M('silleria', { color: 0xa88259, desgaste: 0.6 });
  kit.bloque({ x: 41.5, z: -21, ancho: 7, fondo: 22, alto: 5, mat: mRoca, radio: 0.4 });
  kit.bloque({ x: 42.3, z: -24, ancho: 5, fondo: 11, alto: 7.2, mat: mRoca, radio: 0.5, colision: false });
  kit.bloque({ x: 43, z: -14.5, ancho: 4, fondo: 6, alto: 6.2, mat: mRoca, radio: 0.5, colision: false });
  kit.roca({ x: 37.2, z: -31, radio: 2.2, color: 0xa88259, semilla: 3 }); kit.roca({ x: 36.6, z: -11.2, radio: 1.8, color: 0x9a7650, semilla: 4 });
  rect(34, -33, 46, -9);
  // Boca de la mina: bastidor de vigas
  const mViga = M('troncos', { color: 0x5a4636 });
  for (const k of [-1, 1]) L.caja(mViga, 37.7, 1.5, -22 + k * 1.75, 0.45, 3.0, 0.45, { radio: 0.06, uv: 'tablas_viejas' });
  L.caja(mViga, 37.7, 3.1, -22, 0.5, 0.5, 4.5, { radio: 0.07, uv: 'tablas_viejas' });
  L.caja(kit.emisivo(0x000000, 0), 38.1, 1.45, -22, 0.12, 2.9, 3.0, { radio: 0.01, uv: false });
  for (const k of [-1, 1]) L.caja(mViga, 37.5, 2.5, -22 + k * 1.2, 0.2, 0.2, 1.5, { rotX: k * 0.8, radio: 0.04, uv: 'tablas_viejas' });
  cart.poner('mina', 37.35, 3.9, -22, 3.2, 0.8, -Math.PI / 2, 0.0);
  kit.luz({ x: 36.2, y: 3.0, z: -23.6, color: 0xffa24a, intensidad: 20, distancia: 10 });
  L.caja(kit.emisivo(0xffb25a, 3), 37.2, 2.75, -23.9, 0.2, 0.3, 0.2, { radio: 0.04, uv: false });
  // montón de mineral y herramientas
  for (const [x, z, r] of [[35.5, -19.8, 0.7], [34.7, -19.3, 0.5], [35.9, -18.9, 0.45]]) kit.roca({ x, z, radio: r, color: 0x3a3430, colision: false, semilla: Math.floor(x * z) });
  kit.pilar(35.3, -19.4, 1.0, { nombre: 'mineral', bloqueaBalas: false });

  // ───────────── 5. MOBILIARIO DEL PUEBLO ─────────────
  // Postes de atar caballos y abrevaderos frente a las fachadas
  poste_atar(kit, -27.5, -8.2, 0); poste_atar(kit, -19.5, -8.2, 0); poste_atar(kit, -3, -8.6, 0); poste_atar(kit, 16, -8.6, 0); poste_atar(kit, 22.5, -8.6, 0);
  abrevadero(kit, -23.5, -8.0, 0); abrevadero(kit, 19.2, -8.4, 0.03);
  // Barriles y cajas en los porches y rincones
  barril(kit, -30.3, -10.4); barril(kit, -29.4, -10.9); barril(kit, -17.6, -10.5);
  barril(kit, 13.6, -10.5); barril(kit, 14.5, -10.2); barril(kit, 24.4, -10.4);
  caja_decor(kit, 23.5, -10.6, 0.2); caja_decor(kit, 24.9, -10.8, -0.1); caja_decor(kit, 24.1, -10.7, 0, 1.0, 0.9);
  sacos(kit, 20.6, -10.6); sacos(kit, 17.6, -10.4);
  barril(kit, -6.5, -10.6); caja_decor(kit, 0.2, -10.5, 0.1);
  // Banco del sheriff
  banco(kit, -5.2, -10.3, 0);
  // Andén: bancos, baúles, bidones de leche, lámpara
  banco(kit, -22, -34.3, 0); banco(kit, -9.5, -34.3, 0);
  caja_decor(kit, -13.5, -35, 0.3, 1.1); caja_decor(kit, -12.3, -35.4, -0.2); barril(kit, -26.3, -34.7); barril(kit, -25.4, -35.1);
  kit.farola({ x: -15, z: -35.2, tipo: 'gas', rot: 0 });
  // Carro del almacén y rueda apoyada
  carro(kit, 31, -4.5, 0.35);
  // Barricada de sacos de arena junto al emplazamiento
  // Pila de carbón junto a la vía
  for (const [x, z, r] of [[28, -35.8, 1.5], [30, -35.2, 1.1], [26.7, -35.3, 0.9]]) kit.roca({ x, z, radio: r, color: 0x26272a, material: 'hierro_forjado', semilla: Math.floor(x) });
  rect(25, -37, 32, -34);
  // Postes de telégrafo a lo largo de la vía
  const pt = [];
  for (let x = -42; x <= 42; x += 14) pt.push(kit.poste({ x, z: -43.4, alto: 7.6, tipo: 'madera' }));
  for (let i = 0; i < pt.length - 1; i++) {
    for (const dz of [-0.3, 0.3]) kit.catenaria({ desde: [pt[i].x + 0.0, pt[i].puntaY, -43.4 + dz], hasta: [pt[i + 1].x, pt[i + 1].puntaY, -43.4 + dz], caida: 0.5 });
  }
  // Farolas de aceite en la calle (con luz)
  kit.farola({ x: -9.5, z: -7, tipo: 'aceite', rot: 0 });
  kit.farola({ x: 9.5, z: -7, tipo: 'aceite', rot: Math.PI });
  // Cartel de peligro junto a la palanca
  cart.poner('peligro', -2, 1.55, -34.8, 1.5, 0.75, 0, 0.0);
  L.caja(M('tablas_viejas'), -2, 0.8, -34.85, 0.12, 1.6, 0.12, { radio: 0.02 });

  // ───────────── 6. NATURALEZA: cactus, rocas, árboles muertos, matas ─────────────
  const mCactus = M('hierba', { color: 0x58744a, desgaste: 0.6 });
  const zonasBorde = [{ x0: -44.5, z0: -34, x1: -37, z1: 44 }, { x0: 38, z0: -6, x1: 44.5, z1: 44 }, { x0: -44, z0: 36, x1: 44, z1: 44.5 }, { x0: -40, z0: 12, x1: -36, z1: 17 }];
  const ptsCactus = kit.dispersar({ area: zonasBorde, cantidad: 15, distMin: 6, libre: 1.0, semilla: 4, evitar: [{ rect: [-36, 18, -22, 30] }, { rect: [8, 16, 24, 33] }] });
  for (const p of ptsCactus) { cactus(kit, mCactus, p.x, p.z, p.rot, p.esc * rng.rango(0.9, 1.25)); kit.pilar(p.x, p.z, 0.32, { nombre: 'cactus', bloqueaBalas: false }); }
  const rocasPts = [[-42, -26, 2.0], [-43, 14, 1.7], [-40, 39, 1.8], [43, 14, 1.9], [42, 37, 2.2], [-12, 43, 1.6], [14, 42, 1.5], [-41.5, -4, 1.3], [39, 6, 1.4]];
  for (const [x, z, r] of rocasPts) kit.roca({ x, z, radio: r, color: rng.elegir([0xb08a60, 0xa6825c, 0x9a7a58]), semilla: Math.floor(x + z) });
  for (const [x, z] of [[-42.5, 24], [41.5, -3], [-8, 41.5]]) kit.arbol({ x, z, tipo: 'muerto', escala: 1.0 });
  // Pastos secos: instancias de matas
  const matas = kit.dispersar({ area: [{ x0: -44, z0: -34, x1: 44, z1: 44 }], cantidad: 70, distMin: 2.2, libre: 0, semilla: 8, evitar: [...evitar, { rect: [-46, -12, 46, 12] }] });
  const geoMata = new THREE.ConeGeometry(0.32, 0.55, 5); geoMata.translate(0, 0.27, 0);
  kit.instancias(geoMata, M('hierba', { color: 0x9a8a52, desgaste: 0.8 }), matas.map((p) => ({ x: p.x, z: p.z, rot: p.rot, esc: [p.esc * 0.9, p.esc * (0.7 + p.u * 0.8), p.esc * 0.9], color: rng.elegir([0xa89a60, 0x8e8650, 0xb0a070]) })), { sombras: false, nombre: 'matas' });

  // ───────────── 7. DETALLES DEL SUELO ─────────────
  const evP = evitar.slice();
  kit.parches({ tipo: 'charco', area: [{ x0: -23, z0: -8, x1: -23, z1: -8 }, { x0: -40, z0: -10, x1: 40, z1: 12 }], cantidad: 5, radio: [0.8, 1.8], evitar: evP, semilla: 3, opacidad: 0.8 });
  kit.parches({ tipo: 'mancha', area: { x0: -44, z0: -34, x1: 44, z1: 44 }, cantidad: 16, radio: [2.5, 5.5], evitar: evP, color: 0x6a4a2c, opacidad: 0.2, semilla: 31 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -34, x1: 42, z1: 42 }, cantidad: 18, radio: [0.6, 1.5], evitar: evP, color: 0x2d2219, opacidad: 0.45, semilla: 8 });
  for (let i = 0; i < 7; i++) kit.parche({ tipo: 'mancha', x: -34 + i * 11, z: 2.5 + (i % 2) * 2.5, radio: 5, alargado: 4.5, rot: 0.04 * (i % 3 - 1), color: 0x5a3f26, opacidad: 0.16, capa: i % 3 });   // rodadas de carretas
  // Bolsas de ceniza bajo el depósito y la fragua
  kit.parche({ tipo: 'mancha', x: -22.5, z: 25, radio: 3, color: 0x1c1613, opacidad: 0.55, capa: 2 });
  kit.parche({ tipo: 'mancha', x: 12, z: -33, radio: 4.4, color: 0x2b2118, opacidad: 0.35, capa: 1 });

  // ───────────── 8. HUMO Y VAPOR (animación) ─────────────
  const humos = [
    crearHumo(kit, { x: estacion.chimenea?.x ?? -12, y: estacion.chimenea?.y ?? 7, z: estacion.chimenea?.z ?? -30, n: 9, color: 0xf2f0ec, opac: 0.5, alto: 5, r: 0.5 }),
    crearHumo(kit, { x: -22.5, y: 4.1, z: 26.6, n: 8, color: 0x4a4540, opac: 0.5, alto: 5, r: 0.4 }),
    crearHumo(kit, { x: -28.5, y: 8.1, z: -16, n: 7, color: 0xdedad4, opac: 0.4, alto: 4, r: 0.38 }),
  ];
  cart.cerrar();

  // ───────────── 9. JUGABILIDAD ─────────────
  const m = juego.mundo, vh = juego.vehiculos;
  rect(-9, -12, 9, 11);                           // el centro queda libre
  const evJ = [...evitar, { x: 0, z: 2, r: 9 }, { rect: [-46, -12, -16, -9.5] }];
  const exps = kit.dispersar({ area: [{ x0: -41, z0: -32, x1: 41, z1: 41 }], cantidad: 10, distMin: 10, libre: 1.4, semilla: 21, evitar: evJ });
  for (const p of exps) m?.crear?.('explosivo', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  const cajas = kit.dispersar({ area: [{ x0: -41, z0: -32, x1: 41, z1: 41 }], cantidad: 8, distMin: 9, libre: 1.1, semilla: 22, evitar: [...evJ, ...exps.map((p) => ({ x: p.x, z: p.z, r: 3 }))] });
  for (const p of cajas) m?.crear?.('caja', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  const emp = [{ x: -14, z: 6, rot: Math.PI / 2 }, { x: 15, z: 5, rot: -Math.PI / 2 }];
  for (const e of emp) m?.crear?.('emplazamiento', { ...e, eraIdx });
  // sacos de arena tras los emplazamientos
  for (const e of emp) { const s = Math.sign(Math.cos(e.rot)) || 1; sacos(kit, e.x - s * 1.4, e.z - 1.1); sacos(kit, e.x - s * 1.4, e.z + 1.1); }
  // Interactivos
  m?.crear?.('palanca_tren', { x: -2, z: -36.2, rot: 0, eraIdx, via: { x1: -50, z1: ZV, x2: 50, z2: ZV } });
  m?.crear?.('deposito_agua', { x: 12, z: -33.5, rot: 0, eraIdx });
  m?.crear?.('vagoneta', { x: 31, z: -22, rot: Math.PI / 2, eraIdx });
  const emp2 = kit.dispersar({ area: [{ x0: -10, z0: -30, x1: 36, z1: 40 }], cantidad: 3, distMin: 9, libre: 1.4, semilla: 55, evitar: [...evJ, ...exps.map((p) => ({ x: p.x, z: p.z, r: 2 })), { x: 12, z: -33.5, r: 5 }] });
  for (const p of emp2.slice(0, 2)) m?.crear?.('empujable', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  vh?.crear?.(era.vehiculo, { x: 8, z: 19, rot: 0.3 });
  vh?.crear?.(era.vehiculo, { x: -36, z: 4, rot: 1.45 });

  let t = 0;
  return {
    grupo: kit.grupo,
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x: -1.5, z: 4 }, { x: 1.5, z: 4 }],
    puntosAparicion: [
      { x: -42, z: -22, tipo: 'borde' }, { x: -42, z: 6, tipo: 'borde' }, { x: -42, z: 32, tipo: 'borde' },
      { x: 42, z: -2, tipo: 'borde' }, { x: 42, z: 22, tipo: 'borde' }, { x: 42, z: 34, tipo: 'borde' },
      { x: -34, z: -41, tipo: 'borde' }, { x: 0, z: -41, tipo: 'borde' }, { x: 34, z: -41, tipo: 'borde' },
      { x: -22, z: 42, tipo: 'borde' }, { x: 2, z: 42, tipo: 'borde' }, { x: 22, z: 42, tipo: 'borde' },
      { x: -24, z: -9.4, tipo: 'interior', peso: 0.6 },        // puertas batientes del saloon
      { x: 33.5, z: -22, tipo: 'interior', peso: 0.7 },        // boca de la mina
      { x: -8, z: -35.2, tipo: 'interior', peso: 0.5 },        // andén
    ],
    zonas: [{ id: 'calle_mayor', x: 0, z: 2, r: 14 }, { id: 'via', x: 0, z: ZV, r: 10 }, { id: 'mina', x: 32, z: -22, r: 7 }],
    actualizar(dt) { t += dt; for (const h of humos) h(t); },
  };
}

// ═════════════════════════════ piezas ═════════════════════════════
function porche(kit, { xa, xb, zF, prof, yT, posts, mT, deck = true, barandilla = false, escalon = true }) {
  const L = kit.lote0, M = (n, o) => kit.mat(n, o), w = xb - xa, cx = (xa + xb) / 2;
  const mPoste = M('tablas_pintadas', { color: 0xdfd6c3 }), mTab = M('tablones', { color: 0xa8957c });
  if (deck) {
    L.cajaBase(mTab, cx, 0, zF + prof / 2, w, 0.2, prof, { radio: 0.02 });
    if (escalon) L.cajaBase(mTab, cx, 0, zF + prof + 0.2, w * 0.95, 0.1, 0.4, { radio: 0.02 });
  }
  L.caja(M('tablas_viejas', { color: 0x4f4034 }), cx, yT, zF + prof / 2, w + 0.3, 0.14, prof + 0.25, { radio: 0.03 });   // tejadillo
  L.caja(mT, cx, yT - 0.17, zF + prof + 0.1, w + 0.3, 0.26, 0.08, { radio: 0.015 });                                  // faldón
  for (const px of posts) {
    L.caja(mPoste, px, yT / 2 + 0.06, zF + prof - 0.2, 0.2, yT, 0.2, { radio: 0.03 });
    L.caja(mPoste, px, 0.12, zF + prof - 0.2, 0.3, 0.12, 0.3, { radio: 0.03 });
    for (const s of [-1, 1]) L.caja(mPoste, px + s * 0.34, yT - 0.4, zF + prof - 0.2, 0.55, 0.08, 0.08, { rotZ: s * 0.75, radio: 0.01 });
    kit.pilar(px, zF + prof - 0.2, 0.2, { nombre: 'poste_porche' });
  }
  if (barandilla) {
    const mH = M('hierro_forjado');
    L.caja(mH, cx, yT + 1.05, zF + prof - 0.1, w, 0.07, 0.07, { radio: 0.015 });
    const n = Math.round(w / 0.3);
    for (let i = 0; i <= n; i++) L.caja(mH, xa + (i / n) * w, yT + 0.58, zF + prof - 0.1, 0.035, 0.9, 0.035, { radio: 0.008 });
    for (const s of [0, 1]) L.caja(mH, xa + s * w, yT + 0.58, zF + prof / 2, 0.07, 1.0, prof, { radio: 0.01 });
  }
}

function batientes(kit, x, zF, ancho) {
  const L = kit.lote0, mD = kit.mat('tablas_pintadas', { color: 0x4d3322 });
  for (const s of [-1, 1]) {
    L.caja(mD, x + s * (ancho * 0.25), 1.45, zF + 0.28, 1.05, 1.15, 0.05, { rotY: s * 0.5, radio: 0.01 });
    L.caja(kit.mat('hierro_forjado'), x + s * (ancho * 0.25), 1.45, zF + 0.3, 1.0, 0.03, 0.07, { rotY: s * 0.5, radio: 0.01 });
  }
}

function farolPorche(kit, x, y, z, luz) {
  const L = kit.lote0, mH = kit.mat('hierro_forjado');
  L.caja(mH, x, y + 0.45, z, 0.03, 0.9, 0.03, { radio: 0.005 });
  L.caja(kit.emisivo(0xffb25a, 3.4), x, y, z, 0.2, 0.28, 0.2, { radio: 0.03, uv: false });
  L.caja(mH, x, y + 0.19, z, 0.26, 0.05, 0.26, { radio: 0.01 });
  if (luz) kit.luz({ x, y, z: z + 0.2, color: 0xffa94c, intensidad: 15, distancia: 9 });
}

function poste_atar(kit, x, z, rot) {
  const L = kit.lote0, m = kit.mat('tablas_viejas', { color: 0x5e4a37 }), L2 = 3.2;
  const M = matriz(x, 0, z, rot);
  for (const s of [-1, 1]) L.anadir(cilindro(0.09, 0.07, 1.25, 8, 0.01), m, mm2(M, s * (L2 / 2 - 0.1), 0, 0), { uv: 'tablas_viejas' });
  L.anadir(cajaRedondeada(L2, 0.1, 0.1, 0.02, 1), m, mm2(M, 0, 1.08, 0), { uv: 'tablas_viejas' });
  L.anadir(cajaRedondeada(0.35, 0.03, 0.03, 0.006, 1), kit.mat('cuerda'), mm2(M, 0.4, 1.0, 0.06, 0.0, 0, 0.0));
  kit.vallaBaja(x, z, L2, rot, { ancho: 0.2 });
}
const mm2 = (m, ...r) => new THREE.Matrix4().multiplyMatrices(m, matriz(...r));

function abrevadero(kit, x, z, rot) {
  const L = kit.lote0, M = matriz(x, 0, z, rot), mT = kit.mat('tablas_viejas', { color: 0x6a5842 });
  const w = 2.8, d = 0.9, h = 0.7;
  L.anadir(cajaRedondeada(w, h, 0.1, 0.02, 1), mT, mm2(M, 0, h / 2, d / 2 - 0.05)); L.anadir(cajaRedondeada(w, h, 0.1, 0.02, 1), mT, mm2(M, 0, h / 2, -d / 2 + 0.05));
  for (const s of [-1, 1]) L.anadir(cajaRedondeada(0.1, h, d, 0.02, 1), mT, mm2(M, s * (w / 2 - 0.05), h / 2, 0));
  L.anadir(cajaRedondeada(w - 0.2, 0.05, d - 0.2, 0.01, 1), kit.mat('agua', { color: 0x6f8a78 }), mm2(M, 0, h - 0.12, 0), { uv: 'agua' });
  L.anadir(cajaRedondeada(w - 0.2, 0.3, d - 0.2, 0.01, 1), mT, mm2(M, 0, 0.15, 0));
  kit.muro(x, z, w, d, rot, { bloqueaBalas: false, nombre: 'abrevadero', material: 'madera' });
}

function barril(kit, x, z) {
  const L = kit.lote0, mT = kit.mat('tablas_viejas', { color: 0x6b5238 }), mB = kit.mat('hierro_forjado');
  L.anadir(torno([[0, 0], [0.26, 0], [0.3, 0.14], [0.35, 0.42], [0.3, 0.74], [0.26, 0.86], [0, 0.86]], 12), mT, matriz(x, 0, z), { uv: 'tablas_viejas' });
  for (const y of [0.14, 0.68]) L.anadir(cilindro(0.34 - (y < 0.3 ? 0.03 : 0.03), 0.34 - 0.03, 0.05, 12, 0.005), mB, matriz(x, y, z), { uv: false });
  L.anadir(cilindro(0.355, 0.355, 0.05, 12, 0.005), mB, matriz(x, 0.4, z), { uv: false });
  kit.pilar(x, z, 0.33, { nombre: 'barril', bloqueaBalas: false });
}

function caja_decor(kit, x, z, rot = 0, esc = 1, alto = 0.8) {
  const L = kit.lote0, m = kit.mat('tablas_viejas', { color: 0x8a6e4a }), mH = kit.mat('hierro_forjado');
  const w = 0.9 * esc, h = alto * esc;
  L.anadir(cajaRedondeada(w, h, w, 0.03, 1), m, matriz(x, h / 2, z, rot), { uv: 'tablas_viejas' });
  for (const s of [-1, 1]) L.anadir(cajaRedondeada(0.05, h + 0.02, w + 0.03, 0.01, 1), mH, matriz(x + Math.cos(rot) * s * w * 0.32, h / 2, z - Math.sin(rot) * s * w * 0.32, rot), { uv: false });
  kit.muro(x, z, w, w, rot, { bloqueaBalas: false, nombre: 'caja_decor', material: 'madera' });
}

function sacos(kit, x, z) {
  const L = kit.lote0, m = kit.mat('saco_arena', { color: 0xb8a276 });
  for (let i = 0; i < 3; i++) L.anadir(cajaRedondeada(0.62, 0.3, 0.38, 0.1, 2), m, matriz(x + (i - 1) * 0.62, 0.15, z, (i - 1) * 0.08), { uv: 'saco_arena' });
  L.anadir(cajaRedondeada(0.62, 0.3, 0.38, 0.1, 2), m, matriz(x - 0.3, 0.44, z + 0.02, 0.1), { uv: 'saco_arena' });
  L.anadir(cajaRedondeada(0.62, 0.3, 0.38, 0.1, 2), m, matriz(x + 0.3, 0.44, z - 0.02, -0.06), { uv: 'saco_arena' });
  kit.muro(x, z, 1.9, 0.5, 0, { bloqueaBalas: true, nombre: 'sacos', material: 'tela' });
}

function paca(kit, x, z, rot, esc = 0.8) {
  kit.lote0.anadir(cajaRedondeada(1.2, 0.7 * esc, 0.7, 0.12, 2), kit.mat('paja', { color: 0xc9a85c }), matriz(x, 0.35 * esc, z, rot), { uv: 'paja' });
  kit.muro(x, z, 1.2, 0.7, rot, { bloqueaBalas: false, nombre: 'paca', material: 'madera' });
}

function banco(kit, x, z, rot) {
  const L = kit.lote0, m = kit.mat('tablas_viejas', { color: 0x7a6247 }), M = matriz(x, 0, z, rot);
  L.anadir(cajaRedondeada(1.8, 0.07, 0.42, 0.015, 1), m, mm2(M, 0, 0.48, 0), { uv: 'tablas_viejas' });
  L.anadir(cajaRedondeada(1.8, 0.4, 0.06, 0.015, 1), m, mm2(M, 0, 0.8, -0.2), { uv: 'tablas_viejas' });
  for (const s of [-0.75, 0.75]) L.anadir(cajaRedondeada(0.07, 0.48, 0.4, 0.01, 1), kit.mat('hierro_forjado'), mm2(M, s, 0.24, 0), { uv: false });
  kit.muro(x, z, 1.8, 0.45, rot, { bloqueaBalas: false, nombre: 'banco', material: 'madera' });
}

function carro(kit, x, z, rot) {
  const L = kit.lote0, mT = kit.mat('tablas_viejas', { color: 0x6b5238 }), mH = kit.mat('hierro_forjado'), M = matriz(x, 0, z, rot);
  L.anadir(cajaRedondeada(3.2, 0.12, 1.5, 0.02, 1), mT, mm2(M, 0, 0.78, 0), { uv: 'tablas_viejas' });
  for (const s of [-1, 1]) L.anadir(cajaRedondeada(3.2, 0.5, 0.08, 0.02, 1), mT, mm2(M, 0, 1.1, s * 0.76), { uv: 'tablas_viejas' });
  L.anadir(cajaRedondeada(0.08, 0.5, 1.5, 0.02, 1), mT, mm2(M, -1.56, 1.1, 0), { uv: 'tablas_viejas' });
  L.anadir(cajaRedondeada(0.08, 0.5, 1.5, 0.02, 1), mT, mm2(M, 1.56, 1.1, 0), { uv: 'tablas_viejas' });
  L.anadir(cajaRedondeada(2.4, 0.9, 1.0, 0.18, 2), kit.mat('lona', { color: 0xb9ab8c }), mm2(M, -0.2, 1.4, 0), { uv: 'lona' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    L.anadir(new THREE.TorusGeometry(0.52, 0.045, 6, 18), mH, mm2(M, sx * 1.0, 0.52, sz * 0.86, 0, Math.PI / 2 * 0, 0), { uv: false });
    L.anadir(cilindro(0.07, 0.07, 0.2, 8, 0.01), mH, mm2(M, sx * 1.0, 0.52, sz * 0.83, 0, Math.PI / 2, 0), { uv: false });
  }
  L.anadir(cajaRedondeada(2.2, 0.08, 0.08, 0.01, 1), mT, mm2(M, 2.6, 0.55, 0.0, 0, 0, 0.1), { uv: 'tablas_viejas' });
  kit.muro(x, z, 3.3, 1.7, rot, { bloqueaBalas: false, nombre: 'carro', material: 'madera' });
}

function cactus(kit, mat, x, z, rot, esc) {
  const L = kit.lote0, M = matriz(x, 0, z, rot, 0, 0, esc);
  L.anadir(torno([[0, 0], [0.2, 0.01], [0.26, 0.3], [0.27, 1.5], [0.21, 1.95], [0, 2.12]], 10), mat, M, { uv: 'hierba' });
  for (const [s, y, l] of [[1, 0.8, 0.55], [-1, 1.1, 0.4]]) {
    L.anadir(torno([[0, 0], [0.11, 0.01], [0.12, 0.5], [0.0, 0.62]], 8), mat, mm2(M, s * 0.48, y, 0, 0, 0, -s * 1.5708), { uv: 'hierba' });
    L.anadir(torno([[0, 0], [0.1, 0.01], [0.115, l], [0.0, l + 0.14]], 8), mat, mm2(M, s * 0.6, y + 0.05, 0), { uv: 'hierba' });
  }
}

// ═════════════════════ carteles: un atlas de texto, una sola malla ═════════════════════
function crearCarteles(kit) {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const celdas = { saloon: [0, 0, 512, 128], estacion: [512, 0, 512, 128], sheriff: [0, 128, 512, 128], herreria: [512, 128, 512, 128], almacen: [0, 256, 512, 128], mina: [512, 256, 512, 128], peligro: [0, 384, 256, 128], busca: [256, 384, 256, 128] };
  const pinta = (id, fondo, borde, color, l1, l2, tam1 = 74, tam2 = 26) => {
    const [x, y, w, h] = celdas[id];
    g.fillStyle = fondo; g.fillRect(x, y, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + (i % 5) * 0.012})`; g.fillRect(x + ((i * 53) % w), y, 2 + (i % 3), h); }
    g.strokeStyle = borde; g.lineWidth = 6; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${tam1}px Georgia, 'Times New Roman', serif`;
    g.fillText(l1, x + w / 2, y + (l2 ? h * 0.42 : h * 0.52), w - 40);
    if (l2) { g.font = `bold ${tam2}px Georgia, serif`; g.fillText(l2, x + w / 2, y + h * 0.8, w - 50); }
  };
  pinta('saloon', '#3b2416', '#d9b977', '#f0dfae', 'SALOON', '★ WHISKY · NAIPES ★', 84, 24);
  pinta('estacion', '#f0eadc', '#2b2724', '#2b2724', 'CRUZ DEL DIABLO', 'ESTACIÓN · ALT. 612 m', 56, 24);
  pinta('sheriff', '#2e2a26', '#c9a24a', '#e6d9b4', 'SHERIFF', '', 86);
  pinta('herreria', '#26262a', '#a35a2a', '#e7c79a', 'HERRERÍA', '', 70);
  pinta('almacen', '#d8c9a0', '#4a3524', '#3a2a1c', 'ALMACÉN GENERAL', 'Y TIENDA DE RAMOS', 52, 24);
  pinta('mina', '#30231a', '#bba57a', '#f1dfae', 'MINA LA VETA', 'PELIGRO · SOLO PERSONAL', 62, 22);
  pinta('peligro', '#e8c43a', '#1a1a1a', '#1a1a1a', '¡PELIGRO!', 'TREN EN VÍA', 52, 24);
  pinta('busca', '#cdb98a', '#3a2c1c', '#3a2c1c', 'SE BUSCA', 'VIVO O MUERTO', 46, 22);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0 });
  kit._propios.push(mat, tex);
  const geos = [], L = kit.lote0, mTab = kit.mat('tablas_viejas', { color: 0x5a4636 });
  return {
    /** Coloca un cartel centrado en (x,y,z) de ancho w y alto h; rotY gira sobre Y, incl = inclinación hacia delante. */
    poner(id, x, y, z, w, h, rotY = 0, incl = 0) {
      const [cx, cy, cw, ch] = celdas[id];
      const gm = new THREE.PlaneGeometry(w, h), uv = gm.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i) * cw) / W, 1 - (cy + (1 - uv.getY(i)) * ch) / H);
      gm.applyMatrix4(matriz(x, y, z, rotY, -incl));
      geos.push(gm);
      L.anadir(cajaRedondeada(w + 0.16, h + 0.16, 0.08, 0.02, 1), mTab, matriz(x - Math.sin(rotY) * 0.05, y, z - Math.cos(rotY) * 0.05, rotY, -incl), { uv: 'tablas_viejas' });
    },
    cerrar() {
      if (!geos.length) return;
      const m = new THREE.Mesh(mergeGeometries(geos, false), mat); m.name = 'carteles'; m.castShadow = false; m.receiveShadow = true;
      kit.anadir(m);
      for (const gm of geos) gm.dispose();
    },
  };
}

// ═════════════════════ humo y vapor animados ═════════════════════
function crearHumo(kit, { x, y, z, n = 8, color = 0xffffff, opac = 0.5, alto = 5, r = 0.4 }) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opac, depthWrite: false, fog: true });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, n);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.name = 'humo'; mesh.renderOrder = 5;
  kit.anadir(mesh); kit._propios.push(mat);
  const d = new THREE.Object3D();
  const fase = Array.from({ length: n }, (_, i) => i / n), sem = Array.from({ length: n }, (_, i) => ((i * 7919) % 100) / 100);
  return (t) => {
    for (let i = 0; i < n; i++) {
      const p = (t * 0.14 + fase[i]) % 1;
      const esc = r * (0.5 + p * 2.4) * (p > 0.78 ? (1 - p) / 0.22 : 1);
      d.position.set(x + p * 2.2 + Math.sin(t * 0.6 + i) * 0.15 * p, y + p * alto, z + (sem[i] - 0.5) * 0.5 * p);
      d.scale.setScalar(Math.max(0.001, esc)); d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
}
