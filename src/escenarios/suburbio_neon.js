// ERA Z · Era 3 (Atómica, 1950–1999) · «Avenida Neón»: tramo de carretera americana de noche, asfalto mojado y neón rosa/turquesa.
// Planta (x → este, z → sur; la cámara mira al norte):
//   norte: autocine (pantalla gigante, filas en arco) · noroeste: motel con piscina · este: diner de cromo
//   centro: avenida E-O abierta (inicio de jugadores) · suroeste: gasolinera · sur: aparcamiento · sureste: lavandería
import { ERAS } from '../datos/eras.js';
import { crearUtiles, PINTURAS, ROSA, TURQUESA } from './suburbio_neon/utiles.js';
import { crearEdificios } from './suburbio_neon/edificios.js';

const TAU = Math.PI * 2;

export async function construir(juego, kit) {
  const eraIdx = kit.eraIdx, era = ERAS[eraIdx] ?? ERAS[3];
  const rng = kit.rng(1950);
  await kit.precargar(['asfalto_mojado', 'asfalto_seco', 'losas_acera', 'hormigon', 'gravilla_via', 'hierba', 'tierra', 'cromo', 'acero_pintado', 'acero_cepillado', 'goma',
    'tela_asfaltica', 'ladrillo_encalado', 'estuco_desconchado', 'panel_prefabricado', 'troncos', 'hierro_forjado', 'hierro_oxidado', 'agua', 'tablas_viejas', 'rayas_peligro', 'ladrillo_rojo']);
  const U = crearUtiles(kit), E = crearEdificios(kit, U);
  const lote = kit.lote0, M = kit.matriz, CR = kit.cajaRedondeada;
  const pint = (c, o = {}) => kit.mat('acero_pintado', { color: c, desgaste: 0.3, ...o });

  // ───────────── 1. SUELO ─────────────
  kit.suelo({
    tam: 160, material: 'asfalto_mojado', mezcla: 'asfalto_seco', mojado: 0.5, semilla: 7, contraste: 1.6,
    relieve: { amp: 0, escala: 16, centroPlano: 90 },
    pintura: (p) => {
      p.fondo(0);
      p.rect(-46, -23, -4, -6, 1, 3).rect(-12, 12, 20, 38, 1, 3).rect(20, 26, 46, 40, 1, 3).rect(18, -9, 45, -2, 1, 2).rect(-46, 8, -10, 34, 0.0, 1);
      p.salpicar(-46, -46, 46, 46, 40, 1.2, 3.4, 1); p.salpicar(-46, -4, 46, 12, 12, 0.8, 2, 1);
      p.romper(2.4, 0.5);
    },
  });
  // periferia: césped oscuro fuera de la arena (la avenida sigue hacia los lados)
  for (const r of [[-80, -80, 80, -49], [-80, 49, 80, 80], [-80, -49, -49, -4], [-80, 11, -49, 49], [49, -49, 80, -4], [49, 11, 80, 49]]) kit.zona({ rect: r, material: 'hierba', alto: 0.02, mojado: 0.4 });
  // acera con bordillo (norte y sur de la avenida)
  kit.zona({ rect: [-45, -6.5, 45, -2.6], material: 'losas_acera', alto: 0.12, borde: { material: 'hormigon', ancho: 0.22, alto: 0.15 }, mojado: 0.35 });
  kit.zona({ rect: [-45, 10.6, 45, 13.6], material: 'losas_acera', alto: 0.12, borde: { material: 'hormigon', ancho: 0.22, alto: 0.15 }, mojado: 0.35 });
  // explanada de la gasolinera, cubierta de la piscina y suelo del autocine
  kit.zona({ rect: [-45, 13.6, -12, 31], material: 'hormigon', alto: 0.05, mojado: 0.45 });
  kit.zona({ rect: [-40.5, -17.5, -24.5, -7.5], material: 'hormigon', alto: 0.05, borde: { material: 'losas_acera', ancho: 0.3, alto: 0.1 }, mojado: 0.3 });
  kit.zona({ rect: [-6, -44.5, 45, -19.5], material: 'gravilla_via', alto: 0.03, mojado: 0.45 });
  // montículos en arco de las filas del autocine (centro detrás de la pantalla)
  const ACX = 22, ACZ = -46;
  const arco = (r0, r1, a0, a1) => { const pts = [], n = 18; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([ACX + Math.cos(a) * r1, ACZ + Math.sin(a) * r1]); } for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; pts.push([ACX + Math.cos(a) * r0, ACZ + Math.sin(a) * r0]); } return pts; };
  const d2r = Math.PI / 180;
  for (const [r0, r1, a0] of [[8.6, 12.4, 44], [15.2, 19, 46], [21.8, 25.6, 52]]) kit.zona({ poligono: arco(r0, r1, a0 * d2r, (180 - a0) * d2r), material: 'tierra', alto: 0.07, mojado: 0.4 });

  // ───────────── 2. MARCAS VIALES ─────────────
  const blanca = kit.emisivo(0xdfe8f0, 0.32), amarilla = kit.emisivo(0xf0c24a, 0.36);
  const raya = (m, x, z, w, d) => lote.caja(m, x, 0.075, z, w, 0.03, d, { uv: false, radio: 0.008 });
  for (let x = -45; x < 45; x += 6) { raya(amarilla, x + 1.5, 3.6, 3, 0.16); raya(amarilla, x + 1.5, 4.0, 3, 0.16); }
  raya(blanca, 0, -1.9, 90, 0.16); raya(blanca, 0, 9.9, 90, 0.16);
  for (let i = 0; i < 12; i++) raya(blanca, 9, -1.4 + i * 0.95, 3.0, 0.5);          // paso de cebra
  raya(blanca, 6.6, 7, 0.4, 5.6); raya(blanca, 6.6, 0.7, 0.4, 5.6);                  // líneas de detención
  // flechas / texto SÓLO en el pavimento: bordes del aparcamiento sur
  const plazas = (x0, x1, zA, zB, sep = 2.9) => { for (let x = x0; x <= x1 + 0.01; x += sep) raya(blanca, x, (zA + zB) / 2, 0.12, Math.abs(zB - zA)); raya(blanca, (x0 + x1) / 2, zB, x1 - x0, 0.12); };
  plazas(-9, 17, 14.6, 20.2); plazas(-9, 17, 28.2, 33.8);
  for (let x = -6; x < 16; x += 6) raya(amarilla, x, 24.2, 2.4, 0.12);
  plazas(-42, -18, -20.8, -16.2, 3);                                                 // aparcamiento del motel
  plazas(-5, 18, -21, -17, 2.9);
  plazas(22, 44, 30, 35.2, 2.9);                                                     // frente a la lavandería
  // discapacitados / marcas de pintura quemada
  for (const [x, z] of [[-4, 17.4], [-6, -18.6]]) raya(pint(0x2f8cff), x, z, 1.1, 0.5);

  // ───────────── 3. EDIFICIOS ─────────────
  const motel = E.motel({}), diner = E.diner({}), gas = E.gasolinera({}), lav = E.lavanderia({}), kiosco = E.kiosco({});
  E.taquilla({ x: 12, z: -19.5 });

  // piscina del motel: agua turquesa con borde
  {
    const px = -32.5, pz = -12.5, w = 11, d = 4.8;
    lote.caja(kit.mat('losas_acera', { color: 0xf2f2f0 }), px, 0.07, pz, w + 0.9, 0.14, d + 0.9, { radio: 0.04 });
    const ag = kit.mat('agua', { color: 0x30e8ff });
    lote.caja(ag, px, 0.12, pz, w, 0.05, d, { uv: true, radio: 0.01 });
    lote.caja(kit.emisivo(0x2fe0f0, 0.9), px, 0.16, pz, w - 0.6, 0.03, d - 0.6, { uv: false, radio: 0.01 });
    for (let i = 0; i < 3; i++) lote.caja(kit.mat('cromo'), px - 4.6 + i * 0.0, 0.3, pz - 1.3 + i * 1.3, 0.04, 0.5, 0.04, { uv: false }); // escalera
    kit.muro(px, pz, w + 0.8, d + 0.8, 0, { bloqueaBalas: false, nombre: 'piscina' });
    for (let i = 0; i < 4; i++) U.tumbona({ x: -38 + i * 1.7, z: -8.9, rot: Math.PI, color: i % 2 ? 0xff7ac0 : 0x4fd1c5 });
    U.sombrilla({ x: -27.2, z: -9.0, color: 0xff7ac0 }); U.sombrilla({ x: -37.5, z: -16.3, color: 0x4fd1c5 });
    kit.luz({ x: px, y: 1.5, z: pz, color: 0x2ff0ff, intensidad: 26, distancia: 11 });
  }

  // pilones de neón: motel y autocine
  {
    const px = -13.6, pz = -18.6;
    lote.cajaBase(kit.mat('acero_cepillado'), px, 0, pz, 0.34, 7.6, 0.34, { radio: 0.05 }); kit.pilar(px, pz, 0.3, { nombre: 'pilon_motel' });
    U.rotulo({ x: px, y: 8.0, z: pz + 0.3, w: 4.6, h: 3.0, lineas: [{ t: 'MOTEL', color: ROSA, tam: 0.3, y: 0.3, esp: 0.08 }, { t: 'METEORO', color: TURQUESA, tam: 0.26, y: 0.66, esp: 0.05 }], borde: ROSA, parpadeo: { vel: 13, fase: 0.3, prof: 0.07 } });
    U.rotulo({ x: px, y: 5.6, z: pz + 0.3, w: 3.8, h: 1.0, lineas: [{ t: 'VACANTES', color: TURQUESA, tam: 0.58, esp: 0.05 }], borde: ROSA, intensidad: 2.2, parpadeo: { vel: 2.4, fase: 0, prof: 0.1, apaga: -0.55 } });
    kit.luz({ x: px, y: 6.5, z: pz + 3, color: ROSA, intensidad: 70, distancia: 19 });
    const sx = 16.5, sz = -7.8;
    lote.cajaBase(kit.mat('acero_cepillado'), sx, 0, sz, 0.3, 6.4, 0.3, { radio: 0.05 }); kit.pilar(sx, sz, 0.28, { nombre: 'pilon_autocine' });
    U.rotulo({ x: sx, y: 6.6, z: sz + 0.25, w: 5.2, h: 3.1, lineas: [{ t: 'AUTOCINE', color: TURQUESA, tam: 0.27, y: 0.24, esp: 0.06 }, { t: 'ESTRELLA', color: ROSA, tam: 0.27, y: 0.52 }, { t: 'DOBLE SESIÓN', color: TURQUESA, tam: 0.12, y: 0.78 }], borde: ROSA, parpadeo: { vel: 8, fase: 2, prof: 0.08 } });
  }
  U.pantallaCine({ x: 22, z: -42.3, w: 30, h: 13 });

  // ───────────── 4. COCHES (obstáculos) ─────────────
  const P = PINTURAS;
  const coches = [];
  const c = (x, z, rot, ci, tipo = 'sedan', col2) => { U.coche({ x, z, rot, color: P[ci % P.length], tipo, color2: col2 }); coches.push({ x, z }); };
  const haciaCentro = (x, z) => Math.atan2(-(ACZ - z), ACX - x);
  // autocine en filas de arco, mirando a la pantalla
  for (const [r, ang, ci, tipo] of [[10.4, 62, 0, 'sedan'], [10.4, 112, 1, 'cupe'], [17.1, 50, 5, 'ranchera'], [17.1, 84, 2, 'sedan'], [17.1, 128, 6, 'cupe'], [23.7, 66, 3, 'sedan'], [23.7, 98, 8, 'ranchera'], [23.7, 130, 4, 'sedan'], [23.7, 54, 9, 'cupe']]) {
    const x = ACX + Math.cos(ang * d2r) * r, z = ACZ + Math.sin(ang * d2r) * r;
    c(x, z, haciaCentro(x, z) + (Math.sin(ang) * 0.06), ci, tipo);
  }
  // altavoces del autocine
  for (const [r, angs] of [[8.9, [50, 78, 100, 126]], [15.6, [48, 70, 98, 120]], [22.2, [58, 80, 112]]]) for (const a of angs) { const x = ACX + Math.cos(a * d2r) * r, z = ACZ + Math.sin(a * d2r) * r; lote.cajaBase(kit.mat('hierro_forjado'), x, 0, z, 0.08, 1.25, 0.08, { uv: false }); lote.caja(pint(0x39434d), x, 1.15, z, 0.3, 0.22, 0.14, { uv: false, radio: 0.04 }); }
  // aparcamiento del motel
  c(-38.6, -18.5, Math.PI / 2, 1, 'sedan'); c(-29.6, -18.5, Math.PI / 2 + 0.08, 4, 'ranchera'); c(-20.4, -18.5, Math.PI / 2, 5, 'cupe');
  c(-10.4, -12.6, 0.3, 3, 'sedan');
  // frente del diner
  c(26.5, -4.2, Math.PI / 2 - 0.5, 0, 'cupe'); c(34.8, -4.6, Math.PI / 2 + 0.12, 1, 'sedan');
  // aparcamiento sur (central)
  c(-6.1, 17.6, -Math.PI / 2, 2, 'sedan'); c(2.7, 17.6, -Math.PI / 2 + 0.06, 7, 'ranchera'); c(11.1, 17.4, -Math.PI / 2, 8, 'cupe');
  c(-3.2, 31.0, Math.PI / 2, 6, 'sedan'); c(8.6, 31.0, Math.PI / 2 - 0.05, 1, 'cupe'); c(0.2, 25.7, 0.15, 9, 'sedan');
  // gasolinera y lavandería
  c(-26.5, 22.8, Math.PI, 4, 'sedan'); c(-37.5, 27, 0.4, 8, 'ranchera');
  c(24.7, 32.6, -Math.PI / 2, 5, 'ranchera'); c(30.5, 32.6, -Math.PI / 2 + 0.06, 0, 'sedan'); c(41.5, 14.5, 0.1, 7, 'sedan');

  // ───────────── 5. MOBILIARIO Y PROPS ─────────────
  // cabinas telefónicas y máquinas expendedoras
  U.cabina({ x: 20.2, z: -4.2, rot: 0 }); U.cabina({ x: -9.3, z: 12.4, rot: Math.PI }); U.cabina({ x: -14.3, z: -7.6, rot: 0 });
  U.expendedora({ x: -17.7, z: -20.5, rot: Math.PI, color: 0xe8507f }); U.expendedora({ x: 24.2, z: -6.7, rot: 0, color: 0x2fc9bd }); U.expendedora({ x: -31.2, z: 21.2, rot: 0, color: 0xe8507f });
  U.expendedora({ x: 7.2, z: -25.9, rot: Math.PI / 2, color: 0x4fa3e8, panel: 0xffe6b0 }); U.expendedora({ x: 24.7, z: 26.9, rot: 0, color: 0xe8507f });
  // contenedores, papeleras, hidrantes, bancos, conos, neumáticos
  U.contenedor({ x: 31, z: -18.6, rot: 0 }); U.contenedor({ x: -30, z: -31.2, rot: 0.1, color: 0x3a4f78 }); U.contenedor({ x: -40, z: 24.6, rot: 0.3 });
  for (const [x, z] of [[-4.5, -3.8], [22.8, -6.2], [-9.5, 12.3], [28.5, 17.3], [-16, -7.4], [5, 11.6]]) U.papelera({ x, z });
  for (const [x, z] of [[2.5, -3.6], [-26, 14.4], [36.4, 17.2]]) U.hidrante({ x, z });
  U.banco({ x: 27, z: 27.6 }); U.banco({ x: 33.5, z: 27.6 }); U.banco({ x: -3, z: -3.4, rot: Math.PI }); U.banco({ x: 38.3, z: -3.4, rot: Math.PI });
  U.neumaticos({ x: -35.8, z: 23.3 }); U.neumaticos({ x: -34.7, z: 23.9, pilas: 2 });
  for (const [x, z] of [[-9.5, 8.3], [-9.2, 9.0], [-8.6, 9.5], [14.8, -0.6], [14.9, 0.2], [20.5, 9.3]]) U.cono({ x, z, rot: rng() * 6 });
  // postes de teléfono/electricidad con cables y transformadores
  const postes = [-40, -22, -4, 12, 28, 43].map((x) => kit.poste({ x, z: -4.7, alto: 9.2, tipo: 'madera' }));
  for (let i = 0; i < postes.length - 1; i++) for (const dz of [-0.5, 0.5]) kit.catenaria({ desde: [postes[i].x ?? [-40, -22, -4, 12, 28, 43][i], postes[i].puntaY - 0.5, -4.7 + dz], hasta: [[-40, -22, -4, 12, 28, 43][i + 1], postes[i + 1].puntaY - 0.5, -4.7 + dz], caida: 0.8 });
  for (let k = 0; k < 3; k++) lote.anadir(kit.cilindro(0.3, 0.3, 0.7, 12, 0.04), kit.mat('acero_cepillado'), M(11.6 + k * 0.4, 8.0, -4.7 + (k - 1) * 0.0 - 0.45), { uv: false });
  // palmeras de carretera
  for (const [x, z, s] of [[-43, -4.2, 1], [-30, 11.8, 2], [-8, -3.9, 3], [17.5, 11.9, 4], [43, 12, 5], [-2, 40, 6], [14, 41, 7], [41, 40, 8], [-34, 40, 9], [-43, 36, 10], [41, -33, 11], [-44, -40, 12], [-12, -26, 13], [44, 8, 14]]) U.palmera({ x, z, alto: 6.2 + (s % 4) * 0.7, escala: 1, semilla: s });
  U.cerrarPalmeras();
  // setos bajos junto al motel y a la lavandería
  for (const [x, z, w] of [[-34, -21.6, 5], [-24, -21.6, 3.5], [27, 26.9, 3], [34.5, 26.9, 3]]) lote.cajaBase(kit.mat('hierba', { color: 0x3f6b38, desgaste: 0.5 }), x, 0, z, w, 0.7, 0.6, { radio: 0.2, uv: true });
  // señales y barreras
  lote.cajaBase(kit.mat('rayas_peligro'), 14.6, 0, 8.9, 1.6, 0.9, 0.2, { radio: 0.03 }); kit.muro(14.6, 8.9, 1.6, 0.3, 0, { nombre: 'barrera' });

  // ───────────── 6. DETALLES DE SUELO ─────────────
  const evitar = [[-29, -26, 26, 7], [31, -12, 17, 9], [-37, 17.25, 9, 6.5], [30, 22, 14, 8], [3, -30, 9, 5.5], [22, -42.3, 31, 2.4]].map(([x, z, w, d]) => ({ x, z, hx: w / 2, hz: d / 2, margen: 0.6 }));
  kit.parches({ tipo: 'charco', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 26, radio: [0.9, 2.6], evitar, semilla: 3, alargado: 1.4 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 18, radio: [1.6, 3.6], evitar, color: 0x15181c, opacidad: 0.32, semilla: 31 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 14, radio: [0.4, 1.0], evitar, color: 0x0d0f12, opacidad: 0.55, semilla: 8 });
  // reflejos de neón sobre el asfalto mojado
  for (const [x, z, r, col, o] of [[31, -3, 7, ROSA, 0.2], [-13.5, -15, 6.5, ROSA, 0.2], [-22, 25, 8, TURQUESA, 0.2], [30, 31, 6.5, ROSA, 0.17], [3, -24, 5, TURQUESA, 0.14], [22, -30, 12, TURQUESA, 0.1], [16, -3, 4, TURQUESA, 0.14]]) kit.parche({ tipo: 'mancha', x, z, radio: r, color: col, opacidad: o, capa: 4, alargado: 1.5 });
  for (let i = 0; i < 5; i++) kit.parche({ tipo: 'hojas', x: rng.rango(-40, 40), z: rng.rango(-12, 40), radio: rng.rango(1.5, 3), cantidad: 14, semilla: i, paleta: [0x4a5a2a, 0x6b6a2c, 0x7a6a3a, 0x3d4a28] });

  // ───────────── 7. LUCES (≤ 10) ─────────────
  kit.luz({ x: 31, y: 4.2, z: -3.5, color: ROSA, intensidad: 60, distancia: 16 });
  kit.luz({ x: -21.5, y: 3.9, z: 19, color: 0x35f0ff, intensidad: 90, distancia: 20 });
  kit.luz({ x: 22, y: 6.5, z: -37, color: 0xb9d8ff, intensidad: 100, distancia: 28 });
  kit.luz({ x: 30, y: 4.2, z: 28.5, color: 0xff6fbd, intensidad: 44, distancia: 14 });
  kit.luz({ x: 3, y: 3.4, z: -24.5, color: 0xffc080, intensidad: 30, distancia: 11 });
  kit.farola({ x: -6, z: -4.2, tipo: 'sodio', rot: Math.PI, luz: true, intensidad: 34 }); kit.farola({ x: 16, z: 11.6, tipo: 'sodio', rot: 0, luz: true, intensidad: 34 });
  kit.farola({ x: 36, z: -4.2, tipo: 'sodio', rot: Math.PI, luz: false }); kit.farola({ x: -40, z: 11.6, tipo: 'sodio', rot: 0, luz: false });

  // ───────────── 8. EDIFICIOS DE FONDO (fuera de los límites, sin colisión) ─────────────
  for (const [x, z, w, d, pisos, mu] of [[-62, -34, 16, 12, 3, 'ladrillo'], [-60, 2, 14, 12, 2, 'prefabricado'], [60, -30, 16, 12, 3, 'prefabricado'], [60, 10, 14, 11, 2, 'ladrillo'], [-30, -62, 18, 12, 4, 'ladrillo'], [-2, -66, 16, 12, 3, 'prefabricado'], [48, -64, 20, 12, 5, 'ladrillo']])
    kit.edificio({ x, z, ancho: w, fondo: d, pisos, estilo: mu, colision: false, ventanas: { luz: 0.45, sep: 3.2 }, puertas: [], semilla: pisos + w });
  for (const x of [-30, -20, -10, 0, 10, 20, 30, 40]) U.palmera({ x, z: 49 + (x % 3), alto: 7, escala: 1.1, semilla: x + 40, colision: false });

  // ───────────── 9. JUGABILIDAD ─────────────
  const m = juego.mundo, vh = juego.vehiculos;
  const libre = (x, z, r = 0.7) => kit.libre(x, z, r);
  const crear = (tipo, x, z, o = {}) => { const ok = libre(x, z, o.r ?? 0.7); return ok ? m?.crear?.(tipo, { x, z, rot: o.rot ?? rng() * TAU, eraIdx, ...o.op }) : null; };
  // explosivos: surtidores en las islas, bidones y bombonas repartidos (10)
  for (const [x, z, rot] of [[-25.2, 19, 0], [-22.8, 19, Math.PI], [-19.8, 19, 0]]) m?.crear?.('explosivo', { x, z, rot, eraIdx });
  const ex = [[-30, -32.6, 'bidon_combustible'], [-17.4, -24, 'bombona_gas'], [29.6, -19.4, 'bombona_gas'], [32.2, -19.0, 'bidon_combustible'], [9.4, -23.6, 'bombona_gas'], [-39.4, 25.6, 'bidon_combustible'], [-14, 20.5, 'bidon_combustible']];
  for (const [x, z, v] of ex) m?.crear?.('explosivo', { x, z, rot: rng() * TAU, eraIdx, variante: v });
  // cajas (8)
  for (const [x, z] of [[-20, 6], [14, 14], [28, 8.4], [-30, -3], [8, -14], [-1, 20.5], [-12, -26.4], [20, -26]]) crear('caja', x, z, { r: 0.8 });
  // empujables (3)
  for (const [x, z] of [[-14, 0], [26, 14], [10, -10]]) crear('empujable', x, z, { r: 0.8 });
  // emplazamientos M60
  m?.crear?.('emplazamiento', { x: 14, z: -5.6, rot: 0, eraIdx });
  m?.crear?.('emplazamiento', { x: -8, z: 14.4, rot: Math.PI, eraIdx });
  // vehículos
  vh?.crear?.(era.vehiculo, { x: -11, z: 6.4, rot: Math.PI / 2 });
  vh?.crear?.(era.vehiculo, { x: 22, z: 0.8, rot: -Math.PI / 2 + 0.1 });
  // interactivos: alarmas de coche (con coche de repuesto si el tipo aún no existe), surtidor y transformadores
  for (const [x, z, rot, ci] of [[4.5, 6.5, 0.3, 0], [-16, -10.3, Math.PI / 2, 1], [24, 21.5 + 12, Math.PI, 3], [-6.5, 22.6, -Math.PI / 2, 4]]) {
    if (!(libre(x, z, 2.4) && m?.crear?.('alarma_coche', { x, z, rot, eraIdx }))) { /* sin interactivo o sitio ocupado: se omite */ }
  }
  crear('surtidor_gasolina', -17.3, 19, { rot: Math.PI });
  for (const [x, z] of [[14.5, -3.8], [-42.5, 12]]) { if (!m?.crear?.('transformador', { x, z, rot: 0, eraIdx })) { /* opcional */ } }

  // ───────────── 10. DATOS DEL MAPA ─────────────
  const mDoor = motel.puertas[1];
  let tt = 0;
  return {
    grupo: kit.grupo,
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x: -1.8, z: 3.2 }, { x: 1.8, z: 3.2 }],
    puntosAparicion: [
      { x: -42, z: -36, tipo: 'borde' }, { x: -42, z: 4, tipo: 'borde' }, { x: -42, z: 33, tipo: 'borde' },
      { x: 42, z: -36, tipo: 'borde' }, { x: 42, z: -4, tipo: 'borde' }, { x: 42, z: 34, tipo: 'borde' },
      { x: -30, z: -42, tipo: 'borde' }, { x: -8, z: -42, tipo: 'borde' },
      { x: -20, z: 42, tipo: 'borde' }, { x: 6, z: 42, tipo: 'borde' }, { x: 30, z: 42, tipo: 'borde' },
      { x: mDoor.x, z: mDoor.z, tipo: 'interior', peso: 0.6 },
      { x: kiosco.puerta.x, z: kiosco.puerta.z, tipo: 'interior', peso: 0.6 },
      { x: lav.puerta.x, z: lav.puerta.z, tipo: 'interior', peso: 0.6 },
      { x: gas.puerta.x, z: gas.puerta.z, tipo: 'interior', peso: 0.5 },
    ],
    zonas: [{ id: 'avenida', x: 0, z: 3, r: 14 }, { id: 'gasolinera', x: -21, z: 19, r: 11 }, { id: 'autocine', x: 22, z: -32, r: 14 }],
    actualizar(dt) { tt += dt; U.actualizar(tt); },
  };
}
