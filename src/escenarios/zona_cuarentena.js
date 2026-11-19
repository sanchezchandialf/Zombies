// ERA Z · Era 4 (Digital, 2000–2049) · «Zona de Cuarentena 7»
// Centro de una metrópolis sellada por el ejército. Planta (x → este, z → sur; la cámara mira al norte):
//   norte  · dos torres de cristal (solo plantas bajas + fuste) con una avenida entre ellas y un vestíbulo en ruinas
//   oeste  · hospital de campaña (tres carpas blancas, camillas, bolsas de cadáveres, ambulancias)
//   este   · helipuerto con el helicóptero estrellado, contenedores y valla eléctrica
//   sur    · puesto de control militar: líneas de barreras, garitas, pórtico, torres de vigilancia y cola de coches
//   centro · explanada de descontaminación abierta (inicio de los jugadores) con autobús volcado al norte
import * as THREE from 'three';
import { ERAS } from '../datos/eras.js';
import { crearProps } from './zona_cuarentena/props.js';
import { crearCarteles } from './zona_cuarentena/carteles.js';

const PI = Math.PI;

export async function construir(juego, kit) {
  const eraIdx = kit.eraIdx ?? 4, era = ERAS[eraIdx];
  const rng = kit.rng(4242);
  await kit.precargar(['asfalto_seco', 'losas_acera', 'baldosa_hospital', 'hormigon', 'panel_prefabricado', 'cristal_rascacielos', 'acero_cepillado', 'hierro_forjado',
    'hierro_oxidado', 'goma', 'lona', 'saco_arena', 'rayas_peligro', 'cristal', 'placa_antideslizante', 'rejilla', 'acero_pintado', 'chapa_ondulada', 'marmol', 'yeso', 'tela_asfaltica']);

  const P = crearProps(kit), M = P.M;
  const L0 = kit.lote0, mx = kit.matriz, caja = kit.cajaRedondeada;
  const luces = [];
  const luz = (o) => { const l = kit.luz(o); if (l) luces.push(l); return l; };

  // ───────────── 1. SUELO ─────────────
  kit.suelo({
    tam: 160, material: 'asfalto_seco', mezcla: 'losas_acera', mojado: 0.12, semilla: 5, contraste: 2.2,
    relieve: { amp: 0.02, escala: 20, centroPlano: 70 },
    pintura: (p) => {
      p.fondo(0);
      p.rect(-80, -80, 80, -46, 1, 3).rect(-80, 46, 80, 80, 1, 3).rect(-80, -80, -46, 80, 1, 3).rect(46, -80, 80, 80, 1, 3);   // periferia: aceras
      p.rect(-42, -46, -7, -22, 1, 1.5).rect(8, -46, 40, -23, 1, 1.5);                                                         // plazas de las torres
      p.rect(-46, -46, -40, 46, 1, 2.5).rect(40, -46, 46, 46, 1, 2.5);                                                         // aceras laterales
      p.salpicar(-44, -22, 44, 46, 14, 0.5, 1.6, 1);                                                                           // parches de acera/reparaciones
      p.camino([[-44, 6], [-16, 6], [0, 8]], 2.2, 1, 1.5);                                                                     // acera junto al hospital
      p.romper(3.4, 0.55);
    },
  });
  const zr = (x0, z0, x1, z1, material, o = {}) => kit.zona({ rect: [x0, z0, x1, z1], material, alto: o.alto ?? 0.06, color: o.color, mojado: o.mojado, borde: o.borde });
  zr(-42, -45.5, -6.5, -22.5, 'losas_acera', { color: 0xd3dbe0, borde: { material: 'hormigon', ancho: 0.28, alto: 0.15, color: 0xaab2b8 } });
  zr(8, -45.5, 38, -23, 'losas_acera', { color: 0xd3dbe0, borde: { material: 'hormigon', ancho: 0.28, alto: 0.15, color: 0xaab2b8 } });
  zr(-43, -14, -22, 21, 'baldosa_hospital', { color: 0xdfe9f0, alto: 0.05, borde: { material: 'hormigon', ancho: 0.25, alto: 0.12, color: 0x9fb0bd } });
  kit.zona({ circulo: { x: 30, z: 4, r: 9.4 }, material: 'hormigon', color: 0x59626b, alto: 0.07, borde: { material: 'hormigon', ancho: 0.3, alto: 0.16, color: 0xb8bec3 } });
  kit.zona({ circulo: { x: 0, z: 0, r: 14 }, material: 'hormigon', color: 0x8d9ca8, alto: 0.03, borde: { material: 'hormigon', ancho: 0.22, alto: 0.07, color: 0xd9ae1c } });
  zr(-28, -31.4, -18.6, -24, 'marmol', { color: 0x8a96a0, alto: 0.07 });                          // suelo del vestíbulo
  zr(-9.2, 22, 9.2, 28.5, 'hormigon', { color: 0x7f8a93, alto: 0.03 });                           // carril central del control

  // ───────────── 2. MARCAS VIALES ─────────────
  const pintura = (m, x, z, w, d, rot = 0) => L0.anadir(caja(w, 0.02, d, 0.004, 1), m, mx(x, 0.07 + 0.0, z, rot), { uv: false });
  const marca = (m, x, z, w, d, rot = 0, y = 0.012) => L0.anadir(caja(w, 0.024, d, 0.004, 1), m, mx(x, y, z, rot), { uv: false });
  void pintura;
  // plaza: anillo amarillo, anillo discontinuo blanco, cruz
  const anillo = (r0, r1, m, y = 0.04) => L0.anadir(kit.extruir(Array.from({ length: 56 }, (_, i) => [Math.cos((i / 56) * PI * 2) * r1, Math.sin((i / 56) * PI * 2) * r1]), 0.02, { bisel: 0.004, huecos: [Array.from({ length: 56 }, (_, i) => [Math.cos((i / 56) * PI * 2) * r0, Math.sin((i / 56) * PI * 2) * r0])] }), m, mx(0, y, 0), { uv: false });
  anillo(11.6, 11.9, M.pintAmarilla);
  for (let i = 0; i < 28; i++) { const a = (i / 28) * PI * 2; marca(M.pintBlanca, Math.cos(a) * 8, Math.sin(a) * 8, 0.9, 0.12, -a, 0.045); }
  marca(M.pintAmarilla, 0, 0, 0.2, 5.0, 0, 0.045); marca(M.pintAmarilla, 0, 0, 5.0, 0.2, 0, 0.045);
  anillo(1.9, 2.1, M.pintAmarilla);
  // pasos de cebra norte y avenida
  for (let i = -5; i <= 5; i++) marca(M.pintBlanca, i * 1.4, -18, 0.7, 3.0);
  for (let z = -44; z < -22; z += 3.4) marca(M.pintAmarilla, 1.0, z, 0.14, 1.8);
  for (let z = 15.5; z < 22; z += 3.4) marca(M.pintAmarilla, 0, z, 0.14, 1.8);
  // líneas de «alto» en los carriles del control y flechas
  for (const [x0, x1] of [[-20, -12.3], [-8.7, 8.7], [12.3, 20]]) marca(M.pintBlanca, (x0 + x1) / 2, 28.3, x1 - x0, 0.4);
  for (const x of [-16, -5, 5, 16]) { marca(M.pintBlanca, x, 31.2, 0.22, 2.4); marca(M.pintBlanca, x - 0.35, 29.9, 0.22, 0.8, 0.8); marca(M.pintBlanca, x + 0.35, 29.9, 0.22, 0.8, -0.8); }
  // ───────────── 3. NORTE: LAS TORRES ─────────────
  const oscuro = (c) => { const k = new THREE.Color(c); k.multiplyScalar(0.42); return k.getHex(); };
  const cristal = (col, em = 0.9) => kit.mat('cristal_rascacielos', { color: oscuro(col), emisivo: em * 0.4 });
  const zocaloTorre = { muro: kit.mat('panel_prefabricado', { color: 0x8c9fb0 }), zocalo: 'acero_cepillado', estilo: 'prefabricado', cornisa: true, pisos: 2, alto: 6.2, colorLuz: 0x7fa6c4,
    ventanas: { ancho: 2.3, alto: 1.6, sep: 4.2, luz: 0.55, marcoColor: 0x20303c, marcoMaterial: 'acero_pintado', travesanos: false }, tejado: { tipo: 'plano', material: 'tela_asfaltica', equipos: 2 } };
  const fuste = (o) => kit.edificio({ estilo: 'cristal', colision: false, ventanas: false, cornisa: false, puertas: [], tejado: { tipo: 'plano', material: 'hormigon', equipos: 3, parapetoAlto: 0.4 }, ...o });
  // Torre A (noroeste): dos alas y un cuerpo trasero que dejan el vestíbulo abierto al sur
  kit.edificio({ ...zocaloTorre, x: -33.5, z: -35, ancho: 13, fondo: 18, puertas: [], semilla: 11, nombre: 'torreA_oeste' });
  kit.edificio({ ...zocaloTorre, x: -14.5, z: -35, ancho: 11, fondo: 18, puertas: [], semilla: 12, nombre: 'torreA_este' });
  kit.edificio({ ...zocaloTorre, x: -23, z: -37.5, ancho: 8, fondo: 13, puertas: [], semilla: 13, ventanas: false, nombre: 'torreA_fondo' });
  fuste({ x: -33.5, z: -36, ancho: 10.6, fondo: 15.6, pisos: 7, alto: 28, muro: cristal(0x7fb4da), semilla: 1 });
  fuste({ x: -14.5, z: -36, ancho: 8.6, fondo: 15.6, pisos: 6, alto: 22, muro: cristal(0x8cc0e0, 1.0), semilla: 2 });
  fuste({ x: -23, z: -39, ancho: 6.6, fondo: 9, pisos: 8, alto: 32, muro: cristal(0x6aa3cc), semilla: 3 });
  // marquesina y vestíbulo
  L0.anadir(caja(9.2, 0.34, 7.4, 0.05, 1), M.acero, mx(-23, 4.9, -27.6));
  L0.anadir(caja(9.2, 0.1, 0.1, 0.02, 1), M.emFrio, mx(-23, 4.74, -24.0), { uv: false });
  for (const sx of [-1, 1]) { L0.anadir(kit.cilindro(0.3, 0.3, 4.9, 14, 0.03), M.acero, mx(-23 + sx * 4.1, 0, -24.5)); kit.pilar(-23 + sx * 4.1, -24.5, 0.3, { nombre: 'pilar_vestibulo' }); }
  // fachada del fondo del vestíbulo: puertas giratorias de cristal y mostrador
  L0.anadir(caja(8, 4.3, 0.12, 0.03, 1), M.vidrio, mx(-23, 2.2, -30.95), { uv: false });
  L0.anadir(caja(7.4, 3.2, 0.06, 0.02, 1), M.emFrio, mx(-23, 2.0, -30.88), { uv: false });
  for (let i = -3; i <= 3; i++) L0.anadir(caja(0.1, 4.3, 0.18, 0.02, 1), M.acero, mx(-23 + i * 1.15, 2.2, -30.9));
  L0.anadir(caja(3.4, 1.05, 0.9, 0.06, 2), M.prefab, mx(-24.2, 0.55, -29.4)); L0.anadir(caja(3.5, 0.06, 1.0, 0.02, 1), M.pintBlanca, mx(-24.2, 1.08, -29.4));
  L0.anadir(caja(1.0, 0.6, 0.05, 0.02, 1), M.emPantalla, mx(-24.8, 1.4, -29.1, 0.3, -0.3), { uv: false });
  for (const [bx, bz, r] of [[-20.6, -28.5, 0.4], [-21.4, -27.4, -0.5]]) { L0.anadir(caja(1.5, 0.4, 0.5, 0.08, 1), M.lonaNegra, mx(bx, 0.22, bz, r)); }
  luz({ x: -23.2, y: 3.6, z: -28, color: 0xbfe6ff, intensidad: 70, distancia: 15 });
  // Torre B (noreste)
  const pB = kit.edificio({ ...zocaloTorre, x: 22.5, z: -35.5, ancho: 25, fondo: 17, puertas: [{ cara: 'sur', u: 3.2, ancho: 3.4, alto: 2.9, escalones: 2, arco: false, material: 'acero_cepillado' }], semilla: 21, luzPuertas: false, colorLuz: 0x7fa6c4, nombre: 'torreB' });
  fuste({ x: 22.5, z: -36.5, ancho: 22.6, fondo: 14.4, pisos: 6, alto: 24, muro: cristal(0x75a9d4, 1.0), semilla: 4 });
  fuste({ x: 31, z: -37, ancho: 6.5, fondo: 9, pisos: 8, alto: 33, muro: cristal(0x5f96c2), semilla: 5 });
  luz({ x: pB.puertas[0].x, y: 3.3, z: pB.puertas[0].z + 0.2, color: 0xff3a2a, intensidad: 50, distancia: 11 });
  L0.anadir(caja(0.4, 0.14, 4.0, 0.03, 1), M.baliza, mx(pB.puertas[0].x, 3.6, pB.puertas[0].z - 0.6), { uv: false });

  // edificios del horizonte (fuera del mapa: la ciudad continúa)
  const lejos = [
    [-52, -63, 22, 16, 44, 0x6aa0c8], [-26, -66, 20, 14, 56, 0x7db1d8], [3, -70, 26, 16, 62, 0x5d93bd], [32, -66, 22, 15, 48, 0x78acd2], [58, -62, 20, 18, 40, 0x6aa0c8],
    [-66, -32, 16, 26, 36, 0x6aa0c8], [-68, 6, 16, 22, 48, 0x7db1d8], [-66, 36, 16, 20, 26, 0x5d93bd],
    [66, -32, 16, 26, 42, 0x7db1d8], [68, 6, 16, 22, 34, 0x6aa0c8], [66, 36, 16, 20, 28, 0x5d93bd],
  ];
  lejos.forEach(([x, z, w, d, h, c], i) => kit.edificio({ estilo: 'cristal', x, z, ancho: w, fondo: d, alto: h, pisos: Math.round(h / 4), muro: cristal(c, 0.7 + (i % 3) * 0.2), colision: false, puertas: [], ventanas: false, cornisa: false, tejado: { tipo: 'plano', material: 'hormigon', equipos: 2 }, semilla: 30 + i }));
  for (const [x, z, w, d] of [[-52, 60, 26, 12], [-10, 62, 30, 12], [34, 60, 28, 12]]) kit.edificio({ estilo: 'prefabricado', x, z, ancho: w, fondo: d, alto: 4.6, pisos: 1, colision: false, puertas: [], tejado: { tipo: 'plano', material: 'tela_asfaltica', equipos: 2 }, semilla: Math.round(x) });

  // ───────────── 4. OESTE: HOSPITAL DE CAMPAÑA ─────────────
  P.carpa({ x: -32, z: -8, w: 14, d: 7, puertas: [-0.27], semilla: 1 });
  P.carpa({ x: -32, z: 4, w: 14, d: 7, puertas: [-0.27, 0.25] });
  P.carpa({ x: -33, z: 14.5, w: 8, d: 5.5, tipo: 'militar', puertas: [0.0], cruz: false });
  // mesa de triaje y mobiliario junto a las carpas
  const carteles = crearCarteles(kit, kit.mat('acero_cepillado'));
  const poste = (x, z, h = 2.2) => L0.anadir(kit.cilindro(0.045, 0.04, h, 8, 0.01), M.hierro, mx(x, 0, z));
  const cartel = ({ x, z, rot = 0, id, ancho = 1.8, y = 1.9, postes = true }) => {
    const alto = ancho * ({ alto: 0.5, biologico: 0.5, prohibido: 0.5, hospital: 0.5, banda1: 0.2, banda2: 0.2 }[id] ?? 0.5);
    carteles.poner({ x, y, z, rot, ancho, id });
    if (postes) for (const s of [-1, 1]) { const dx = Math.cos(rot) * s * ancho * 0.4, dz = -Math.sin(rot) * s * ancho * 0.4; L0.anadir(kit.cilindro(0.04, 0.04, y + alto / 2 - 0.0, 8, 0.008), M.hierro, mx(x + dx, 0, z + dz - 0.05)); }
  };
  cartel({ x: -24.8, z: -3.6, id: 'hospital', ancho: 3.0, y: 2.55 });
  cartel({ x: -42.6, z: -13.2, id: 'biologico', ancho: 1.7, y: 1.7, rot: 0.2 });
  cartel({ x: -40.6, z: 20.8, id: 'prohibido', ancho: 1.7, y: 1.6, rot: -0.2 });
  const camillas = [[-36, -3.2, 0.1, true], [-33.2, -3.0, -0.08, false], [-30.5, -3.1, 0.05, false], [-38.8, 2.4, PI / 2 + 0.1, true], [-27, 9.7, 0.0, false]];
  for (const [x, z, r, c] of camillas) { P.camilla({ x, z, rot: r, cuerpo: c }); kit.muro(x, z, 1.9, 0.6, r, { bloqueaBalas: false, nombre: 'camilla' }); }
  for (const [x, z, r] of [[-42, -4.5, 0.05], [-42.1, -3.4, -0.1], [-42, -2.3, 0.08], [-41.9, -1.2, 0], [-42.2, -0.1, -0.06]]) P.bolsaCadaver({ x, z, rot: PI / 2 + r });
  for (const [x, z] of [[-37.8, -3.4], [-29.3, -3.2], [-39.5, 9.8]]) P.gotero({ x, z });
  for (const [x, z] of [[-24.8, 6.8], [-24.6, 7.5], [-25.3, 7.2]]) P.bombonaO2({ x, z });
  for (const [x, z, r, n] of [[-26.5, 8.6, 0.3, 2], [-24.2, -9.5, -0.2, 3], [-41.3, 13.5, 0.1, 2], [-39.6, 8.6, 0.4, 1]]) { P.cajaMedica({ x, z, rot: r, apilada: n }); kit.muro(x, z, 0.9, 0.6, r, { bloqueaBalas: false, nombre: 'cajas_medicas' }); }
  for (const [x, z] of [[-23.4, 0.3], [-23.4, -10.8], [-41.6, 16], [-27.7, 12.8]]) { P.bidonBio({ x, z }); kit.pilar(x, z, 0.36, { bloqueaBalas: false, nombre: 'bidon' }); }
  P.sacosBio([{ x: -23.2, z: 1.2 }, { x: -22.9, z: 0.8, rojo: true, esc: 0.9 }, { x: -23.6, z: 1.6, esc: 0.8 }, { x: -41.5, z: 17.2 }, { x: -40.8, z: 17.6, esc: 1.1 }, { x: -41.9, z: 16.8, rojo: true, esc: 0.8 },
    { x: -40.5, z: -13, esc: 1.1 }, { x: -39.8, z: -12.6, esc: 0.9 }, { x: -30.6, z: -12.4 }, { x: -31.4, z: -12.8, esc: 0.8 }, { x: 10.8, z: -9.4 }, { x: 11.4, z: -9.0, rojo: true, esc: 0.8 }, { x: 26.5, z: -13.0 }]);
  P.coche({ x: -24.8, z: 13.2, rot: PI / 2, tipo: 'ambulancia' });
  P.coche({ x: -26.8, z: -15.8, rot: 0.15, tipo: 'ambulancia', puerta: true });
  P.cinta([[-22, -14], [-22, -7.5]], {}); P.cinta([[-22, -2.5], [-22, 8]], {}); P.cinta([[-22, 11], [-22, 21]], {}); P.cinta([[-43, 21], [-23.5, 21]], {});
  luz({ x: -30, y: 3.6, z: -1.6, color: 0xa8d8ff, intensidad: 80, distancia: 15 });

  // ───────────── 5. ESTE: HELIPUERTO ─────────────
  const aro = (cx, cz, r0, r1, m, y) => L0.anadir(kit.extruir(Array.from({ length: 56 }, (_, i) => [Math.cos((i / 56) * PI * 2) * r1, Math.sin((i / 56) * PI * 2) * r1]), 0.02, { bisel: 0.004, huecos: [Array.from({ length: 56 }, (_, i) => [Math.cos((i / 56) * PI * 2) * r0, Math.sin((i / 56) * PI * 2) * r0])] }), m, mx(cx, y, cz), { uv: false });
  aro(30, 4, 7.4, 7.9, M.pintAmarilla, 0.07);
  aro(30, 4, 8.6, 8.7, M.pintBlanca, 0.07);
  marca(M.pintBlanca, 28.7, 4, 0.7, 4.8, 0, 0.082); marca(M.pintBlanca, 31.3, 4, 0.7, 4.8, 0, 0.082); marca(M.pintBlanca, 30, 4, 2.6, 0.7, 0, 0.082);   // la H
  for (let i = 0; i < 16; i++) { const a = (i / 16) * PI * 2; L0.anadir(caja(0.22, 0.12, 0.22, 0.03, 1), i % 2 ? M.emAmbar : M.emBlanco, mx(30 + Math.cos(a) * 8.95, 0.12, 4 + Math.sin(a) * 8.95), { uv: false }); }
  P.helicoptero({ x: 34.5, z: -9.5, rot: 0.55 });
  P.pila({ x: 29.0, z: -11.6, radio: 2.4, n: 12, semilla: 7, color: 0x4a4a4c });
  kit.parche({ tipo: 'mancha', x: 33, z: -9, radio: 7, color: 0x0e0d0c, opacidad: 0.7, alargado: 1.2, capa: 1 });
  kit.parche({ tipo: 'mancha', x: 30, z: -8, radio: 4.5, color: 0x1a1816, opacidad: 0.55, capa: 2 });
  P.cinta([[22.5, -17], [37.5, -17], [40.5, -4]], { color: 'roja' });
  P.cinta([[23, -3.6], [21.5, -8], [21.5, -14.5]], {});
  luz({ x: 31, y: 7.5, z: 3, color: 0xe6f3ff, intensidad: 110, distancia: 20 });
  cartel({ x: 23.2, z: 12.8, id: 'prohibido', ancho: 1.7, y: 1.6, rot: 0.15 });
  cartel({ x: 40.4, z: -17.4, id: 'biologico', ancho: 1.7, y: 1.7, rot: -0.2 });
  // contenedores del flanco este y oeste del control (apilados)
  P.contenedor({ x: 40.5, z: 24, rot: 0, color: 'azul' }); P.contenedor({ x: 40.5, z: 24, rot: 0.04, color: 'rojo', y: 2.6, colision: false });
  P.contenedor({ x: -40.5, z: 24, rot: 0, color: 'gris' }); P.contenedor({ x: -40.5, z: 24, rot: -0.05, color: 'verde', y: 2.6, colision: false });
  P.contenedor({ x: 41.8, z: 31.5, rot: PI / 2 + 0.1, color: 'blanco' }); P.contenedor({ x: -41.8, z: 32.5, rot: PI / 2 - 0.08, color: 'azul' });
  P.contenedor({ x: 38.0, z: -2.0 + 21, rot: 0.1, color: 'gris', colision: false });

  // ───────────── 6. SUR: PUESTO DE CONTROL ─────────────
  const barrera = (a, b, o = {}) => kit.valla({ puntos: [a, b], tipo: 'barrera', colision: 'alta', color: 0xaab2b8, ...o });
  barrera([-37, 24], [-20, 24]); barrera([20, 24], [37, 24]);
  barrera([-3.2, 26.8], [3.2, 26.8]);                         // isla del carril central
  barrera([-37, 30.5], [-30, 30.5]); barrera([30, 30.5], [37, 30.5]);
  P.mallado([[-37, 22.8], [-20.3, 22.8]]); P.mallado([[20.3, 22.8], [37, 22.8]]);
  P.garita({ x: -10.5, z: 24, w: 3.3, d: 2.5 }); P.garita({ x: 10.5, z: 24, w: 3.3, d: 2.5, rot: 0 });
  P.pluma({ x: -12.6, z: 26.8, rot: PI, alzada: 1.25 }); P.pluma({ x: 12.6, z: 26.8, rot: 0, alzada: 1.25 });
  P.pluma({ x: -19.6, z: 26.8, rot: 0, alzada: 1.25 });
  const por = P.portico({ x: 0, z: 21.2, ancho: 21 });
  carteles.poner({ x: 0, y: por.y + 0.18, z: 21.62, id: 'banda1', ancho: 14 });
  carteles.poner({ x: 0, y: 5.55, z: 21.56, id: 'banda2', ancho: 12.8 });
  cartel({ x: -12.4, z: 21.5, id: 'alto', ancho: 1.7, y: 1.9, rot: 0 }); cartel({ x: 12.4, z: 21.5, id: 'alto', ancho: 1.7, y: 1.9, rot: 0 });
  cartel({ x: -29, z: 22.1, id: 'banda2', ancho: 8, y: 1.55 }); cartel({ x: 29, z: 22.1, id: 'banda2', ancho: 8, y: 1.55 });
  cartel({ x: -20.5, z: 30, id: 'prohibido', ancho: 1.7, y: 1.6, rot: 0.15 }); cartel({ x: 20.5, z: 30, id: 'biologico', ancho: 1.7, y: 1.7, rot: -0.15 });
  const tA = P.torre({ x: -25, z: 19.2, rot: 0.0 }), tB = P.torre({ x: 25, z: 19.2, rot: 0.0 });
  luz({ x: tA.lampX, y: tA.lampY, z: tA.lampZ + 0.3, color: 0xf2f8ff, intensidad: 120, distancia: 26 });
  luz({ x: tB.lampX, y: tB.lampY, z: tB.lampZ + 0.3, color: 0xf2f8ff, intensidad: 120, distancia: 26 });
  luz({ x: 0, y: 5.0, z: 22.5, color: 0xdfeeff, intensidad: 80, distancia: 18 });
  // haces de foco (conos aditivos suaves)
  const matHaz = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.075, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  kit._propios.push(matHaz);
  const haz = (o, d, largo = 24, r = 3.4) => {
    const g = new THREE.ConeGeometry(r, largo, 20, 1, true); g.translate(0, -largo / 2, 0);
    const m = new THREE.Mesh(g, matHaz); m.position.set(o.lampX, o.lampY, o.lampZ + 0.5);
    const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), v); m.renderOrder = 5; m.name = 'haz'; m.frustumCulled = false;
    kit.anadir(m); return m;
  };
  haz(tA, [0.35, -0.55, 0.8]); haz(tB, [-0.35, -0.55, 0.8]);
  // conos, cinta y focos del control
  P.conos([{ x: -19, z: 28.4 }, { x: -13, z: 28.4 }, { x: -8.4, z: 28.4 }, { x: 8.4, z: 28.4 }, { x: 13, z: 28.4 }, { x: 19, z: 28.4 }, { x: -3.8, z: 28.0 }, { x: 3.8, z: 28.0 }, { x: -6, z: 17.4 }, { x: 6.2, z: 17.6 }]);
  P.foco({ x: -14, z: -17.5, rot: 0.6 }); const fB = P.foco({ x: 15.5, z: 15.5, rot: -0.6 });
  void fB;
  luz({ x: -13.6, y: 9.2, z: -16.6, color: 0xeaf4ff, intensidad: 90, distancia: 22 });
  // cola de coches abandonados al sur
  const coches = [
    [-5.6, 34.5, 1.62, 'blanco', 'berlina'], [-5.0, 40.8, 1.44, 'negro', 'suv', 0.02, true], [5.8, 32.8, 1.7, 'taxi', 'berlina'], [3.2, 38.8, 1.2, 'blanco', 'policia'],
    [-16.8, 35.2, 1.57, 'azul', 'furgon'], [-15.0, 42.0, 1.9, 'plata', 'berlina'], [16.5, 34.6, 1.4, 'plata', 'suv'], [17.2, 41.0, 1.72, 'rojo', 'berlina', 0, false, true],
    [26, 38, 0.2, 'verdeOsc', 'berlina'], [-27, 38.5, 3.0, 'taxi', 'berlina'],
    [11.5, -4.5, 2.7, 'azul', 'berlina', 0.03], [-6.5, 7.6, 0.4, 'plata', 'berlina'], [21.5, -12.5, 1.0, 'blanco', 'policia'], [4.2, -35.5, 1.3, 'negro', 'berlina', 0, false, true],
  ];
  for (const [x, z, rot, color, tipo, inclina = 0, puerta = false, quemado = false] of coches) P.coche({ x, z, rot, color, tipo, inclina, puerta: puerta === true, quemado: quemado === true });
  P.autobus({ x: -1.5, z: -21.5, rot: 0.28 });
  luz({ x: -1.5, y: 3.4, z: -19.2, color: 0xff3a2a, intensidad: 45, distancia: 12 });
  P.pila({ x: -23, z: -27.2, radio: 2.6, n: 22, semilla: 3, color: 0x8b9298 }); P.pila({ x: -19.6, z: -25.4, radio: 1.4, n: 9, semilla: 4, color: 0x7d858c });
  P.pila({ x: 6.5, z: -16.5, radio: 1.6, n: 10, semilla: 5 }); P.pila({ x: -7.5, z: -24.5, radio: 1.2, n: 8, semilla: 6, color: 0x7a8288 });
  P.cinta([[-27.5, -23.6], [-19, -23.6]], {});
  cartel({ x: -40.8, z: -26.2, id: 'prohibido', ancho: 1.7, y: 1.6, rot: 0.2 }); cartel({ x: 41, z: -23, id: 'alto', ancho: 1.7, y: 1.9, rot: -0.2 });
  cartel({ x: -6.5, z: -24.2, id: 'biologico', ancho: 1.7, y: 1.7, rot: 0.3 });

  // ───────────── 7. FARO Y MOBILIARIO URBANO ─────────────
  for (const [x, z, r] of [[-16, -3.5, PI], [16, 3.5, 0], [-6.8, -30, PI], [8.6, -30, 0], [-6.5, 19.5, PI], [7, 19.5, 0]]) kit.farola({ x, z, tipo: 'led', rot: r, luz: false, colorPoste: 0x3d4a55 });
  // empujables, explosivos y cajas colocados a mano
  // ───────────── 8. DETALLES DE SUELO ─────────────
  const evitar = kit._edificios.filter((e) => Math.abs(e.x) < 46 && Math.abs(e.z) < 46).map((e) => ({ x: e.x, z: e.z, hx: e.ancho / 2, hz: e.fondo / 2, rot: e.rot, margen: 1 }));
  kit.parches({ tipo: 'charco', area: { x0: -42, z0: -20, x1: 42, z1: 42 }, cantidad: 7, radio: [0.8, 2.0], evitar, color: 0x0a1016, semilla: 9 });
  kit.parches({ tipo: 'mancha', area: { x0: -43, z0: -42, x1: 43, z1: 43 }, cantidad: 14, radio: [2.5, 5.5], evitar, color: 0x1d2227, opacidad: 0.2, semilla: 31 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -40, x1: 42, z1: 42 }, cantidad: 16, radio: [0.6, 1.5], evitar, color: 0x15181b, opacidad: 0.5, semilla: 8 });
  // papeles y cristales rotos dispersos
  const papeles = kit.dispersar({ area: [{ x0: -40, z0: -30, x1: 40, z1: 42 }], cantidad: 90, distMin: 1.2, libre: 0.3, semilla: 12, evitar });
  kit.instancias(new THREE.BoxGeometry(0.3, 0.012, 0.21), kit.mat('hormigon', { color: 0xeef1f3 }), papeles.map((p, i) => ({ x: p.x, y: 0.014 + (i % 4) * 0.001, z: p.z, rot: p.rot, rotX: (i % 5) * 0.015, esc: [1 + (i % 3) * 0.12, 1, 1], color: i % 3 ? 0xffffff : 0xcfd8de })), { sombras: false, nombre: 'papeles' });
  const vidrios = kit.dispersar({ area: [{ x: -23, z: -26, r: 6 }, { x: -1.5, z: -21.5, r: 7 }, { x: 33, z: -8, r: 5 }], cantidad: 50, distMin: 0.5, libre: 0.2, semilla: 13 });
  kit.instancias(new THREE.BoxGeometry(0.22, 0.012, 0.14), kit.mat('cristal', { color: 0xb8e2f4 }), vidrios.map((p, i) => ({ x: p.x, y: 0.013, z: p.z, rot: p.rot, esc: [0.5 + (i % 4) * 0.35, 1, 0.6 + (i % 3) * 0.3] })), { sombras: false, nombre: 'cristales' });

  // ───────────── 9. VALLAS ELÉCTRICAS, GENERADORES Y DRONES ─────────────
  const m = juego.mundo, vh = juego.vehiculos;
  const poner = (tipo, x, z, rot = 0, extra = {}) => {
    if (!kit.libre(x, z, 0.6) && !['valla_electrica', 'generador', 'dron_suministros'].includes(tipo)) { console.warn(`[zona_cuarentena] ${tipo} en (${x}, ${z}) cae en un obstáculo`); return null; }
    return m?.crear?.(tipo, { x, z, rot, eraIdx, ...extra }) ?? null;
  };
  // generadores y sus vallas (cable por el suelo)
  const cable = (a, b) => kit.catenaria({ desde: [a[0], 0.07, a[1]], hasta: [b[0], 0.07, b[1]], caida: 0, grosor: 0.05, material: 'goma' });
  const cargas = [
    { g: [-22.5, 16.5], f: [-16.2, 24.0], r: 0, largo: 7.0 },
    { g: [22.5, 16.5], f: [16.2, 24.0], r: 0, largo: 7.0 },
    { g: [40.2, -9.6], f: [40.2, -19.5], r: PI / 2, largo: 6.0 },
  ];
  cargas.forEach((c, i) => {
    poner('generador', c.g[0], c.g[1], i === 2 ? PI : 0, { id: `gen${i}` });
    poner('valla_electrica', c.f[0], c.f[1], c.r, { largo: c.largo, generador: `gen${i}`, id: `valla${i}` });
    cable([c.g[0], c.g[1] + 1.2], [c.f[0] - (c.r ? 0 : 3.6), c.f[1] - (c.r ? 3.2 : 0.5)]);
    L0.anadir(caja(1.4, 0.04, 1.4, 0.01, 1), M.rayas, mx(c.g[0], 0.03, c.g[1]), { uv: false });
  });
  for (const [x, z] of [[7, 9], [-10, -7]]) {
    poner('dron_suministros', x, z, rng() * 6, { eraIdx });
    for (const [dx, dz, w, d] of [[0, -1.5, 3.4, 0.14], [0, 1.5, 3.4, 0.14], [-1.7, 0, 0.14, 3.2], [1.7, 0, 0.14, 3.2]]) marca(M.pintAmarilla, x + dx, z + dz, w, d, 0, 0.045);
  }

  // ───────────── 10. EMPLAZAMIENTOS ─────────────
  const emplaza = (x, z, tx, tz) => {
    const r = Math.atan2(tx - x, tz - z), fx = Math.sin(r), fz = Math.cos(r), rx = Math.cos(r), rz = -Math.sin(r);
    m?.crear?.('emplazamiento', { x, z, rot: r, eraIdx });
    kit.bloque({ x: x - fx * 1.7, z: z - fz * 1.7, ancho: 3.4, fondo: 0.7, alto: 0.95, rot: r, material: 'saco_arena', nombre: 'sacos' });
    for (const s of [-1, 1]) kit.bloque({ x: x + rx * s * 1.7 - fx * 0.7, z: z + rz * s * 1.7 - fz * 0.7, ancho: 1.9, fondo: 0.7, alto: 0.95, rot: r - PI / 2, material: 'saco_arena', nombre: 'sacos' });
    for (const [bx, bz] of [[x - fx * 1.7 + rx * 0.5, z - fz * 1.7 + rz * 0.5]]) L0.anadir(caja(1.2, 0.35, 0.55, 0.1, 1), kit.mat('saco_arena'), mx(bx, 1.1, bz, r));
  };
  emplaza(-17, -9.5, 0, 0); emplaza(19, 12.5, 0, 0);

  // ───────────── 11. EXPLOSIVOS, CAJAS Y EMPUJABLES ─────────────
  const explosivos = [[-19, 9], [-10, -14], [9, -13], [17.5, -5], [37, 12], [-3, 17.5], [24.5, -19], [-11.5, 26.5], [11, 30], [-31, 27], [31, 27.5]];
  for (const [x, z] of explosivos) poner('explosivo', x, z, rng() * 6.28);
  const cajas = [[-6.5, -9], [7.5, 4], [-12.5, 5.5], [14, -9.5], [-27, 18], [-36.5, -17], [38, 3], [22.5, 6], [-1.2, 12.5], [33, 18], [-20, -19]];
  for (const [x, z] of cajas) poner('caja', x, z, rng() * 6.28);
  for (const [x, z] of [[5, -4.5], [-5.5, 11], [18, 19], [-14, 30]]) poner('empujable', x, z, rng() * 6.28);
  // vehículos blindados
  vh?.crear?.(era.vehiculo, { x: -8, z: 13.5, rot: PI });
  vh?.crear?.(era.vehiculo, { x: 13, z: -11, rot: -0.7 });

  carteles.cerrar();

  // ───────────── 12. DATOS DEL MAPA ─────────────
  let t = 0;
  return {
    grupo: kit.grupo,
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x: -2.5, z: 2.5 }, { x: 2.5, z: 2.5 }],
    puntosAparicion: [
      { x: 1, z: -42, tipo: 'borde' }, { x: -42.6, z: -38, tipo: 'borde' }, { x: 42, z: -38, tipo: 'borde' },
      { x: -42.6, z: -19, tipo: 'borde' }, { x: -42.6, z: 6, tipo: 'borde' }, { x: 43, z: -12, tipo: 'borde' }, { x: 43, z: 6, tipo: 'borde' },
      { x: -30, z: 42, tipo: 'borde' }, { x: -10, z: 42, tipo: 'borde' }, { x: 10, z: 42, tipo: 'borde' }, { x: 30, z: 42, tipo: 'borde' },
      { x: -23, z: -28.6, tipo: 'interior', peso: 0.6 },       // vestíbulo de la torre A
      { x: pB.puertas[0].x, z: pB.puertas[0].z + 0.4, tipo: 'interior', peso: 0.5 },   // puerta de la torre B
      { x: -35.5, z: 9.4, tipo: 'interior', peso: 0.6 },       // puerta de la carpa de triaje
    ],
    zonas: [{ id: 'explanada', x: 0, z: 0, r: 14 }, { id: 'hospital', x: -32, z: 2, r: 12 }, { id: 'helipuerto', x: 30, z: 4, r: 9 }, { id: 'control', x: 0, z: 25, r: 14 }],
    actualizar(dt) {
      t += dt;
      P.M.baliza.emissiveIntensity = 0.5 + 3.0 * Math.max(0, Math.sin(t * 6.5));
      P.M.balizaAzul.emissiveIntensity = 0.5 + 3.0 * Math.max(0, Math.sin(t * 6.5 + PI));
    },
  };
}
