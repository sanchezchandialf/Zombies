// ERA Z · ERA 0 (Pólvora, 1800–1849) · «Villa de Santa Ceniza»
// Villa colonial empedrada al anochecer con niebla baja: plaza con fuente de piedra, iglesia con campanario al norte, mercado de
// puestos de lona al este, casas encaladas con balcones de madera, cementerio con verja de hierro y tumbas abiertas al noreste.
//
// Planta (x → este, z → sur; la cámara mira al norte):
//   N  iglesia (0,-33) + campanario (-9.5,-28.5)          NE cementerio  x 14..40, z -38..-20
//   E  mercado: dos hileras de puestos (z -12 y -3)        W  casas (x ≈ -33) y cabildo (-21,-17)
//   C  plaza r 13 con fuente en (0,-3)                     S  casas bajas, carros, pajares (nada alto en el borde sur)
import * as THREE from 'three';
import { ERAS } from '../datos/eras.js';
import * as P from './villa_colonial/props.js';

const ERA_IDX = 0;

export async function construir(juego, kit) {
  const era = ERAS[ERA_IDX];
  const rng = kit.rng(1800);
  await kit.precargar(['empedrado', 'tierra', 'adoquin', 'hierba', 'silleria', 'estuco_desconchado', 'ladrillo_encalado', 'teja_arabe', 'pizarra', 'tablones',
    'tablas_viejas', 'hierro_forjado', 'laton_bronce', 'lona', 'tela', 'saco_arena', 'paja', 'cuerda', 'madera_lacada', 'yeso', 'agua', 'troncos']);

  // ───────────── 1. SUELO ─────────────
  // 0 = empedrado, 1 = tierra: núcleo empedrado de la villa; caminos de tierra hacia los bordes; desgaste y adoquines sueltos.
  kit.suelo({
    tam: 160, material: 'empedrado', mezcla: 'tierra', mojado: 0.14, semilla: 5, contraste: 1.8,
    relieve: { amp: 0.05, escala: 14, centroPlano: 46 },
    pintura: (p) => {
      p.fondo(1);
      p.circulo(0, 0, 26, 0, 9, 24);
      p.camino([[-32, 1], [0, 1], [32, 1]], 8, 0, 3).camino([[0, -27], [0, 0], [0, 31]], 7, 0, 3);
      p.camino([[-12, -13], [-26, -17]], 5, 0, 2.5).camino([[14, -21], [26, -14], [30, -7]], 5, 0, 2.5);
      p.salpicar(-28, -28, 28, 28, 34, 0.9, 2.6, 1, 1.4);
      p.salpicar(-44, -44, 44, 44, 40, 0.8, 2.0, 0, 1.2);
      p.romper(3.3, 0.55);
    },
  });
  // Plaza adoquinada con borde de sillería y pavimento claro alrededor de la fuente.
  kit.zona({ circulo: { x: 0, z: 0, r: 13 }, material: 'adoquin', alto: 0.035, borde: { material: 'silleria', ancho: 0.4, alto: 0.13 }, mojado: 0.1, desgaste: 0.4 });
  kit.zona({ circulo: { x: 0, z: -3, r: 4.4 }, material: 'silleria', color: 0xc8c0b0, alto: 0.07, borde: { material: 'silleria', ancho: 0.25, alto: 0.12, color: 0xa8a090 } });
  // Atrio de la iglesia y camposanto.
  kit.zona({ rect: [-8, -26, 8, -22.2], material: 'adoquin', alto: 0.045, borde: { material: 'silleria', ancho: 0.3, alto: 0.12 }, desgaste: 0.5 });
  kit.zona({ rect: [14.3, -37.8, 39.7, -20.3], material: 'hierba', alto: 0.02, desgaste: 0.5 });
  kit.zona({ rect: [25.1, -37.6, 26.9, -20.3], material: 'tierra', alto: 0.03 });

  // ───────────── 2. EDIFICIOS ─────────────
  // Iglesia: nave encalada, frontispicio ondulado, rosetón y campanario; la fachada mira al sur.
  const iglesia = kit.edificio({
    x: 0, z: -33, ancho: 15, fondo: 14, pisos: 1, alto: 8.2, estilo: 'encalado', muro: 'ladrillo_encalado', colorMuro: 0xf2ead9, zocalo: 'silleria', colorZocalo: 0xc4bcab,
    tejado: { tipo: 'dos_aguas', eje: 'x', material: 'teja_arabe', alero: 0.35, pendiente: 0.34 }, falsaFachada: { alto: 2.2 },
    ventanas: { ancho: 1.0, alto: 2.4, sep: 3.6, luz: 0.85, marcoColor: 0x2e251d, postigos: false, margen: 1.6, antepecho: 1.8 },
    puertas: [{ cara: 'sur', u: 0, ancho: 2.8, alto: 4.4, arco: true, escalones: 3, material: 'tablones', color: 0x3a2514 }],
    luzPuertas: true, colorLuz: 0xffb464, intensidadLuz: 18, nombre: 'iglesia', semilla: 11,
  });
  P.frontisIglesia(kit, 0, -26, 15, 8.2, 2.2);
  P.contrafuertes(kit, 0, -33, 15, 14, 8.2);
  P.campanario(kit, -9.5, -28.5, 13.2);

  // Casas encaladas con tejas árabes, postigos y balcones de madera.
  const casas = [
    { x: -33, z: -30, ancho: 13, fondo: 9, pisos: 2, estilo: 'colonial', colorMuro: 0xe8dabc, rot: 0.03, puertas: [{ cara: 'sur', u: 3.6, arco: true }], balcon: { u: -2.4, ancho: 4.6 }, chimenea: true, nombre: 'casa_noroeste' },
    { x: -35, z: -9, ancho: 10, fondo: 8, pisos: 2, estilo: 'encalado', colorMuro: 0xf1ecdf, rot: -0.03, puertas: [{ cara: 'sur', u: -2.2 }], balcon: { u: 2.2, ancho: 3.8 }, chimenea: true, nombre: 'casa_oeste' },
    { x: -33.5, z: 13, ancho: 12, fondo: 9, pisos: 2, estilo: 'colonial', colorMuro: 0xdcc8a0, puertas: [{ cara: 'sur', u: 0, arco: true }], balcon: { u: -3, ancho: 4.2 }, luzPuertas: true, chimenea: true, nombre: 'casa_suroeste' },
    { x: -21, z: -17, ancho: 10, fondo: 8, pisos: 2, estilo: 'colonial', colorMuro: 0xefe2c4, puertas: [{ cara: 'sur', u: 0, ancho: 1.9, alto: 2.7, arco: true }], balcon: { u: 0, ancho: 5.0 }, luzPuertas: true, nombre: 'cabildo' },
    { x: 35.5, z: 14, ancho: 11, fondo: 9, pisos: 2, estilo: 'encalado', colorMuro: 0xe6d3b4, rot: -0.03, puertas: [{ cara: 'oeste', u: 0, arco: true }, { cara: 'sur', u: 3.2 }], balcon: { u: -2, ancho: 4.4 }, luzPuertas: true, chimenea: true, nombre: 'casa_este' },
    { x: -31, z: 31, ancho: 9, fondo: 7, pisos: 1, alto: 4.2, estilo: 'encalado', colorMuro: 0xf0e8d4, rot: 0.05, puertas: [{ cara: 'sur', u: 1.5 }], nombre: 'casa_sur1' },
    { x: 20, z: 31, ancho: 10, fondo: 7, pisos: 1, alto: 4.4, estilo: 'colonial', colorMuro: 0xe0d0b0, puertas: [{ cara: 'sur', u: -1.5 }], chimenea: true, nombre: 'casa_sur2' },
    { x: 37, z: 33, ancho: 8, fondo: 7, pisos: 1, alto: 4.2, estilo: 'encalado', colorMuro: 0xece2cc, rot: -0.04, puertas: [{ cara: 'sur', u: 0, arco: true }], nombre: 'casa_sur3' },
  ];
  const infoCasas = casas.map((c, i) => {
    const { balcon, chimenea, ...o } = c;
    const info = kit.edificio({
      ...o, tejado: { chimenea: !!chimenea, pendiente: 0.46 }, semilla: 20 + i,
      ventanas: { luz: 0.6, postigos: true, sep: 3.2, rejas: o.pisos === 1 },
    });
    if (balcon && c.pisos > 1) P.balconMadera(kit, info, balcon.u, balcon.ancho);
    return info;
  });

  // Mausoleo y cementerio (verja de hierro con portón de 7,6 m hacia la plaza).
  P.mausoleo(kit, 34, -34);
  kit.valla({ puntos: [[22.2, -20], [14, -20], [14, -38], [40, -38], [40, -20], [29.8, -20]], tipo: 'hierro', alto: 1.7, colision: 'baja' });
  const sill = kit.mat('silleria', { color: 0xb8b1a0 }), hierro = kit.mat('hierro_forjado');
  for (const px of [22.2, 29.8]) {
    kit.lote0.anadir(kit.cajaRedondeada(0.8, 3.0, 0.8, 0.05, 1), sill, kit.matriz(px, 1.5, -20));
    kit.lote0.anadir(kit.cajaRedondeada(1.0, 0.22, 1.0, 0.04, 1), sill, kit.matriz(px, 3.1, -20));
    kit.lote0.anadir(kit.cilindro(0.3, 0.04, 0.5, 10, 0.02), sill, kit.matriz(px, 3.2, -20));
    kit.muro(px, -20, 0.9, 0.9, 0, { nombre: 'pilar_verja' });
  }
  kit.lote0.anadir(kit.cajaRedondeada(7.8, 0.08, 0.08, 0.02, 1), hierro, kit.matriz(26, 3.0, -20));
  for (let i = 0; i < 12; i++) kit.lote0.anadir(kit.cajaRedondeada(0.05, 0.4 + Math.abs(Math.sin(i * 0.52)) * 0.5, 0.05, 0.01, 1), hierro, kit.matriz(22.9 + i * 0.64, 3.3, -20));
  // hojas del portón, entreabiertas
  for (const [px, s] of [[22.6, 1], [29.4, -1]]) {
    for (let i = 0; i < 7; i++) kit.lote0.anadir(kit.cajaRedondeada(0.04, 1.6, 0.04, 0.008, 1), hierro, kit.matriz(px + s * 0.2 * 0, 0.85, -20 + s * 0.07 + (i - 3) * 0.0 + 0, 0, 0, 0));
  }

  // Tumbas (tres abiertas = puntos de aparición temáticos), lápidas y cruces.
  const fosas = [[20.5, -32.5, 0.1], [29.5, -29, -0.15], [35.5, -24.5, 0.2]];
  for (const [x, z, r] of fosas) P.fosaAbierta(kit, x, z, r);
  for (const [x, z, r] of [[17.2, -28.5, 0], [22.6, -29.2, 0.06], [32.5, -27, -0.05]]) P.tumba(kit, x, z, r);
  [[17.6, -35, 0, 0], [20.8, -36.4, 0.1, 2], [24.2, -34.6, -0.1, 1], [28.2, -36.2, 0.05, 0], [22.5, -24.6, 0.1, 1], [18.5, -23.6, 0, 2], [19.6, -26.6, 0.1, 0],
    [29.8, -33.4, -0.05, 0], [33.5, -22.4, 0, 2], [38, -27, 0.1, 0], [38.4, -31, 0, 1], [23.0, -21.8, 0.2, 0]].forEach(([x, z, r, t], i) => P.lapida(kit, x, z, r, t, 0.9 + (i % 3) * 0.12));
  kit.arbol({ x: 15.8, z: -36.8, tipo: 'muerto', escala: 1.1, semilla: 3 });
  kit.arbol({ x: 38.6, z: -36.2, tipo: 'muerto', escala: 0.95, semilla: 4 });

  // ───────────── 3. FUENTE, MERCADO, CARROS Y BARRILES ─────────────
  P.fuente(kit, 0, -3);
  const ctx = { frutas: [], sacos: [], velas: [] };
  const lonas = [[0xa8473a, 0xe5d6ad], [0x3f6280, 0xe5d6ad], [0x6a8a4e, 0xe0d2a8], [0xc99a3a, 0xe9dcc0], [0x8a3b32, 0xd8c9a2], [0x4a6a60, 0xe5d6ad]];
  const tipos = ['fruta', 'telas', 'ceramica', 'sacos', 'fruta', 'ceramica', 'telas'];
  [[19.5, -12, 0], [26, -12, 0], [32.5, -12, 0], [39, -12, 0], [21, -3, Math.PI], [28, -3, Math.PI], [35, -3, Math.PI]].forEach(([x, z, r], i) =>
    P.puesto(kit, ctx, { x, z, rot: r, lona: lonas[i % lonas.length], tipo: tipos[i], luz: i === 5 }));
  P.volcarMercado(kit, ctx);
  const palA = P.mastil(kit, 15, -7.5), palB = P.mastil(kit, 41, -7.5);
  P.banderines(kit, [15, palA, -7.5], [41, palB, -7.5], 0.9, 22, 4);

  P.grupoBarriles(kit, 16.2, -15.4, 0.3, 'trio'); P.grupoBarriles(kit, 41.5, -16.2, 1.4, 'par'); P.grupoBarriles(kit, -26.2, -22, 0.2, 'par');
  P.grupoBarriles(kit, -28.2, 2.4, 1.5, 'trio'); P.grupoBarriles(kit, -26.5, 21, 0.5, 'par'); P.grupoBarriles(kit, 26.5, 20.5, 2.0, 'par');
  P.grupoBarriles(kit, 3.5, 27, 0.2, 'fila'); P.grupoBarriles(kit, -7.3, -21.4, 0.0, 'solo'); P.grupoBarriles(kit, 30, 5, 0.6, 'solo');
  P.carro(kit, 36.5, -16.5, 0.5, 'cajas'); P.carro(kit, -15.5, 25.5, 0.6, 'heno'); P.carro(kit, 8, 35.5, 3.0, 'barriles'); P.carro(kit, -26, -3.2, 1.45, 'heno');
  P.pajar(kit, -13, 30, 1.0, 0.3); P.pajar(kit, 28, 27, 0.9, 1.2); P.pajar(kit, -41, -20, 1.1, 2.0);
  P.pozo(kit, -22.5, 23.5);
  // palenque de caballos (valla baja de madera)
  kit.valla({ puntos: [[-20, 9.6], [-12.5, 9.6]], tipo: 'madera', alto: 1.1, colision: 'baja' });

  // Mobiliario: faroles de aceite decorativos (la luz la dan los interactivos y las puertas) y árboles de los flancos.
  kit.farola({ x: -5.8, z: -22.6, tipo: 'aceite', rot: 0, luz: false });
  kit.farola({ x: 5.8, z: -22.6, tipo: 'aceite', rot: Math.PI, luz: false });
  kit.farola({ x: 21.4, z: -18.8, tipo: 'aceite', rot: 0, luz: true });
  kit.farola({ x: -14.5, z: -4, tipo: 'aceite', rot: 0, luz: false });
  kit.farola({ x: 14.5, z: 3.5, tipo: 'aceite', rot: Math.PI, luz: false });
  for (const [x, z, t, e, s] of [[-42.5, -13, 'roble', 1.15, 1], [-43, 6, 'roble', 1.0, 2], [42.5, -26, 'roble', 1.0, 6], [42.3, 2, 'roble', 1.1, 7], [-24, -41, 'roble', 1.0, 8]]) kit.arbol({ x, z, tipo: t, escala: e, semilla: s });

  // Velas: peldaños de la iglesia, tumbas y mostradores.
  ctx.velas.push(...[[-2.3, 0, -24.2], [-1.9, 0, -23.9], [2.2, 0, -24.1], [2.6, 0, -23.8], [-3.0, 0, -23.6]].map(([x, , z]) => ({ x, y: 0.05, z })));
  ctx.velas.push(...[[17.2, -30.3], [22.6, -27.9], [32.5, -28.6], [20.5, -30.9], [35.5, -26.1], [29.5, -27.4]].map(([x, z]) => ({ x, y: 0.0, z })));
  P.velas(kit, ctx.velas);

  // ───────────── 4. DETALLES DE SUELO ─────────────
  const evitar = [
    ...kit._edificios.map((e) => ({ x: e.x, z: e.z, hx: e.ancho / 2, hz: e.fondo / 2, rot: e.rot, margen: 1 })),
    { x: -9.5, z: -28.5, hx: 2.7, hz: 2.7, margen: 0.5 },
  ];
  kit.parches({ tipo: 'charco', area: { x0: -40, z0: -38, x1: 40, z1: 40 }, cantidad: 12, radio: [0.8, 2.2], evitar, semilla: 7 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 10, radio: [2.5, 5.5], evitar, color: 0x3a2e22, opacidad: 0.2, semilla: 31 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 12, radio: [0.7, 1.7], evitar, color: 0x2b2118, opacidad: 0.5, semilla: 8 });
  // musgo y hierba en los bordes, paja suelta cerca de los carros y puestos
  kit.parches({ tipo: 'mancha', area: [{ x0: -45, z0: -45, x1: -36, z1: 45 }, { x0: 36, z0: -20, x1: 45, z1: 45 }, { x0: -45, z0: 36, x1: 45, z1: 45 }], cantidad: 20, radio: [2.0, 4.5], evitar, color: 0x55703a, opacidad: 0.42, semilla: 41 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -30, x1: 42, z1: 38 }, cantidad: 8, radio: [0.8, 2.0], evitar, color: 0x9a8f68, opacidad: 0.22, semilla: 42 });
  for (let i = 0; i < 8; i++) kit.parche({ tipo: 'hojas', x: rng.rango(-38, 38), z: rng.rango(-36, 38), radio: rng.rango(1.6, 3.4), cantidad: 22, semilla: i });
  // matas de hierba instanciadas (cementerio, bordes y pies de muro)
  const matasMat = P.propio(kit, 'matas', { color: 0xffffff, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const verdes = [0x5d7a3a, 0x6f8a41, 0x7d8f4a, 0x8f9a55, 0x4f6a35, 0x9a9158];
  const pm = kit.dispersar({
    area: [{ x0: -45, z0: -45, x1: -37, z1: 45 }, { x0: 37, z0: -45, x1: 45, z1: 45 }, { x0: -45, z0: 36, x1: 45, z1: 45 }, { x0: 14.5, z0: -37.5, x1: 39.5, z1: -20.5 }, { x0: -45, z0: -45, x1: 45, z1: -40 }],
    cantidad: 260, distMin: 1.0, libre: 0.5, semilla: 12, escMin: 0.8, escMax: 1.5, evitar,
  });
  P.matas(kit, pm.map((p) => ({ x: p.x, z: p.z, rot: p.rot, esc: p.esc, color: verdes[Math.floor(p.u * verdes.length)] })), matasMat);

  // ───────────── 5. JUGABILIDAD ─────────────
  const m = juego.mundo, vh = juego.vehiculos;
  const vetar = [...evitar, { x: 0, z: -3, r: 4 }, { x: 0, z: 6, r: 6 }, { rect: [13, -39, 41, -19] }, { rect: [14, -14, 42, -1] }];
  const area = [{ x0: -41, z0: -40, x1: 41, z1: 38 }];
  const explosivos = kit.dispersar({ area, cantidad: 9, distMin: 13, libre: 1.3, semilla: 21, evitar: vetar });
  for (const p of explosivos) m?.crear?.('explosivo', { x: p.x, z: p.z, rot: p.rot, eraIdx: ERA_IDX });
  const cajas = kit.dispersar({ area, cantidad: 8, distMin: 9, libre: 1.2, semilla: 22, evitar: [...vetar, ...explosivos.map((p) => ({ x: p.x, z: p.z, r: 3 }))] });
  for (const p of cajas) m?.crear?.('caja', { x: p.x, z: p.z, rot: p.rot, eraIdx: ERA_IDX });
  const empuj = kit.dispersar({ area, cantidad: 3, distMin: 15, libre: 1.2, semilla: 23, evitar: [...vetar, ...explosivos.map((p) => ({ x: p.x, z: p.z, r: 3 })), ...cajas.map((p) => ({ x: p.x, z: p.z, r: 2.5 }))] });
  for (const p of empuj) m?.crear?.('empujable', { x: p.x, z: p.z, rot: p.rot, eraIdx: ERA_IDX });
  // cañones de campaña: uno mirando a la plaza desde el oeste y otro cubriendo el sur
  m?.crear?.('emplazamiento', { x: -16.5, z: 6, rot: Math.PI / 2, eraIdx: ERA_IDX });
  m?.crear?.('emplazamiento', { x: 17, z: 17, rot: Math.PI, eraIdx: ERA_IDX });
  // interactivos de la era
  m?.crear?.('campana_iglesia', { x: 10.5, z: -22.2, rot: 0, eraIdx: ERA_IDX });
  for (const [x, z] of [[-9.5, -9], [9.5, -9.5], [-9, 8], [9.5, 8]]) m?.crear?.('farol_aceite', { x, z, rot: 0, eraIdx: ERA_IDX });
  m?.crear?.('carreta', { x: 22, z: 6, rot: 0.4, eraIdx: ERA_IDX });
  // caballos (junto al palenque y en el mercado)
  vh?.crear?.(era.vehiculo, { x: -16, z: 13, rot: 1.0 });
  vh?.crear?.(era.vehiculo, { x: 18, z: -7.5, rot: -0.6 });

  // ───────────── 6. NIEBLA BAJA Y DATOS DEL MAPA ─────────────
  const niebla = P.niebla(kit, { cuantos: 11, centros: [[27, -29], [20, -24], [-4, 13], [-22, 4], [22, 14], [2, 31], [-28, -12], [0, -20], [36, -5], [-16, 28], [10, -40]] });

  return {
    grupo: kit.grupo,
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x: -2, z: 8 }, { x: 2, z: 8 }],
    puntosAparicion: [
      { x: -43, z: -30, tipo: 'borde' }, { x: -43, z: -5, tipo: 'borde' }, { x: -43, z: 28, tipo: 'borde' },
      { x: -20, z: -43, tipo: 'borde' }, { x: 2, z: -43, tipo: 'borde' }, { x: 26, z: -43, tipo: 'borde' },
      { x: 43, z: -20, tipo: 'borde' }, { x: 43, z: 0, tipo: 'borde' }, { x: 43, z: 24, tipo: 'borde' },
      { x: -24, z: 43, tipo: 'borde' }, { x: -2, z: 43, tipo: 'borde' }, { x: 22, z: 43, tipo: 'borde' },
      { x: 20.5, z: -30.8, tipo: 'interior', peso: 0.7 }, { x: 29.5, z: -27, tipo: 'interior', peso: 0.7 }, { x: 35.5, z: -22.6, tipo: 'interior', peso: 0.7 },
      { x: 0, z: -23.6, tipo: 'interior', peso: 0.5 },
    ],
    zonas: [{ id: 'plaza', x: 0, z: 0, r: 13 }, { id: 'mercado', x: 29, z: -7.5, r: 13 }, { id: 'cementerio', x: 27, z: -29, r: 13 }, { id: 'iglesia', x: 0, z: -26, r: 8 }],
    actualizar(dt) { niebla.actualizar(dt); },
    destruir() { niebla.destruir(); },
  };
}
