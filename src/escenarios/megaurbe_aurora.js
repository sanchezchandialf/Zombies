// ERA Z · Era 5 (Sintética, 2050–2100) · MEGAURBE AURORA
// Plaza elevada de una megaciudad bajo la lluvia ácida de neón: suelo de composite negro con juntas luminosas, raíles magnéticos con un
// tren de levitación detenido, reactor con anillos holográficos al norte, torres Tesla, puertas de energía entre pilares, hologramas
// publicitarios flotantes, quioscos, drones caídos, macetas bioluminiscentes, barandillas de cristal sobre el vacío y la ciudad lejana.
//
// Plano (x → este, z → sur; la cámara mira al norte):
//   reactor (0,-31)  ·  torre NW (-29,-24)  ·  torre NE (34,-33)  ·  terminal SW (-30,25)  ·  tren E-O sobre los raíles z=-14 (x 12…38)
//   plaza central de combate (0,6) r≈15 (abierta: jefe final OMEGA)  ·  jardín bioluminiscente al SE
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ERAS } from '../datos/eras.js';

const CIAN = 0x35e6ff, MAGENTA = 0xff3fd0, VIOLETA = 0x8f5bff, MENTA = 0x3dffc4;
const PLAZA = { x: 0, z: 6, r: 15 };
const REACTOR = { x: 0, z: -31, r: 8.6 };
const RAIL_Z = -14;

// ───────────────────────── texturas de lienzo (todo procedural) ─────────────────────────
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/** Atlas 2×4 de carteles publicitarios con textos inventados (cada celda 512×256). */
const CARTELES = [
  ['AURORA', 'tu ciudad · tu mejor yo', '#ff5fd8', '#35e6ff'],
  ['NEOCARNE™', 'cuerpo nuevo en 24 horas', '#35e6ff', '#ff5fd8'],
  ['VÍA MAGLEV', 'andén 7 · sin esperas', '#7dffd6', '#ff5fd8'],
  ['SINTÉTICA', 'respira: nosotros respiramos por ti', '#ff5fd8', '#a9a0ff'],
  ['ONDA-9', 'descarga tu memoria', '#35e6ff', '#ffd25f'],
  ['ATLAS BANK', 'interés cuántico del 14 %', '#ffd25f', '#35e6ff'],
  ['EVACUACIÓN', 'siga las luces · sector 9', '#ff6a6a', '#35e6ff'],
  ['OMEGA CORP', 'un futuro sin hambre', '#a9a0ff', '#ff5fd8'],
];
function crearAtlasCarteles() {
  const cv = lienzo(1024, 1024), g = cv.getContext('2d');
  CARTELES.forEach(([titulo, sub, c1, c2], i) => {
    const ox = (i % 2) * 512, oy = Math.floor(i / 2) * 256;
    g.save(); g.translate(ox, oy);
    const fondo = g.createLinearGradient(0, 0, 512, 256);
    fondo.addColorStop(0, 'rgba(20,10,40,0.62)'); fondo.addColorStop(1, 'rgba(0,30,50,0.5)');
    g.fillStyle = fondo; g.fillRect(14, 14, 484, 228);
    // marco con esquinas
    g.strokeStyle = c2; g.lineWidth = 3; g.shadowColor = c2; g.shadowBlur = 12;
    for (const [sx, sy] of [[18, 18], [494, 18], [18, 238], [494, 238]]) {
      const dx = sx < 256 ? 1 : -1, dy = sy < 128 ? 1 : -1;
      g.beginPath(); g.moveTo(sx + dx * 44, sy); g.lineTo(sx, sy); g.lineTo(sx, sy + dy * 36); g.stroke();
    }
    g.shadowBlur = 0; g.globalAlpha = 0.5; g.lineWidth = 1.5; g.strokeRect(26, 26, 460, 204); g.globalAlpha = 1;
    // título y subtítulo
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 84; g.font = `900 ${fs}px "Arial Black", Impact, sans-serif`;
    while (g.measureText(titulo).width > 430 && fs > 30) { fs -= 4; g.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; }
    g.shadowColor = c1; g.shadowBlur = 26; g.fillStyle = c1; g.fillText(titulo, 256, 108);
    g.shadowBlur = 8; g.fillStyle = '#ffffff'; g.globalAlpha = 0.9; g.fillText(titulo, 256, 108); g.globalAlpha = 1;
    g.shadowColor = c2; g.shadowBlur = 12; g.fillStyle = c2;
    let fs2 = 27; g.font = `600 ${fs2}px "Courier New", monospace`;
    while (g.measureText(sub).width > 440 && fs2 > 14) { fs2 -= 1; g.font = `600 ${fs2}px "Courier New", monospace`; }
    g.fillText(sub, 256, 178);
    // logotipo y barras de datos
    g.shadowBlur = 0; g.fillStyle = c2; g.globalAlpha = 0.8;
    g.beginPath(); g.arc(60, 214, 9, 0, 7); g.fill();
    for (let k = 0; k < 14; k++) g.fillRect(90 + k * 10, 222 - ((k * 7 + i * 5) % 13), 6, 4 + ((k * 7 + i * 5) % 13));
    g.globalAlpha = 1;
    g.restore();
  });
  // líneas de barrido: apagan una de cada cuatro filas
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.38)';
  for (let y = 0; y < 1024; y += 4) g.fillRect(0, y, 1024, 1.6);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

/** Anillo holográfico: cinta de marcas, arcos y símbolos (vista cenital; se gira en Y). */
function crearTexturaAnillo(semilla = 1) {
  const N = 512, cv = lienzo(N, N), g = cv.getContext('2d'), c = N / 2;
  let s = semilla * 9301 + 49297; const az = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.lineCap = 'butt'; g.strokeStyle = '#fff'; g.fillStyle = '#fff';
  const arco = (r, a0, a1, w, alfa) => { g.globalAlpha = alfa; g.lineWidth = w; g.beginPath(); g.arc(c, c, r, a0, a1); g.stroke(); };
  arco(N * 0.485, 0, 6.2832, 3, 0.9); arco(N * 0.405, 0, 6.2832, 2, 0.55);
  for (let a = 0; a < 6.28; a += az() * 0.9 + 0.25) arco(N * 0.445, a, a + az() * 0.7 + 0.12, 13, 0.55 + az() * 0.35);
  for (let k = 0; k < 120; k++) { // marcas de graduación
    const a = (k / 120) * 6.2832, r0 = N * 0.405, r1 = r0 - (k % 5 === 0 ? 20 : 9);
    g.globalAlpha = k % 5 === 0 ? 0.95 : 0.55; g.lineWidth = k % 5 === 0 ? 3 : 1.6;
    g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
  }
  g.globalAlpha = 0.8; g.font = '600 15px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 0; k < 24; k++) { // glifos en la franja interior
    const a = (k / 24) * 6.2832, r = N * 0.335;
    g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a + Math.PI / 2);
    g.fillText(['Ω', '∆', '◇', '≡', '07', 'A9', '⌬', '∑'][(k * 3 + semilla) % 8], 0, 0); g.restore();
  }
  arco(N * 0.29, 0.3, 2.4, 4, 0.8); arco(N * 0.29, 3.5, 5.4, 4, 0.6); arco(N * 0.25, 0, 6.2832, 1.5, 0.45);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
}

/** Banda de campo de energía (rayas verticales con degradado) para las puertas. */
function crearTexturaCampo() {
  const cv = lienzo(256, 128), g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0.15)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#fff'; for (let x = 0; x < 256; x += 16) g.fillRect(x, 0, 3, 128);
  g.globalAlpha = 0.9; g.fillRect(0, 62, 256, 4);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}

// ───────────────────────── construcción ─────────────────────────
export async function construir(juego, kit) {
  const eraIdx = kit.eraIdx, era = ERAS[eraIdx];
  const rng = kit.rng(505);
  const m = juego.mundo, vh = juego.vehiculos;
  const { matriz, cajaRedondeada, cilindro, extruir } = kit;
  const mat = (n, o) => kit.mat(n, o);
  const trasPropio = (o) => { kit._propios.push(o); return o; };

  await kit.precargar(['composite_futurista', 'asfalto_mojado', 'panel_futurista', 'casco_nave', 'cristal_rascacielos', 'acero_cepillado',
    'cristal', 'placa_antideslizante', 'rejilla', 'pantalla', 'hormigon', 'goma', 'acero_pintado']);

  // materiales de uso frecuente
  const mCompC = mat('composite_futurista', { color: CIAN }), mCompM = mat('composite_futurista', { color: MAGENTA });
  const mPanM = mat('panel_futurista', { color: MAGENTA }), mPanC = mat('panel_futurista', { color: CIAN });
  const mCasco = mat('casco_nave', { color: 0x1d2433 }), mCascoCl = mat('casco_nave', { color: 0xd8e0ee });
  const mAcero = mat('acero_cepillado'), mAceroOsc = mat('acero_cepillado', { color: 0x4a5263 });
  const mCristal = mat('cristal', { color: 0x9fe8ff });
  const eC = kit.emisivo(CIAN, 2.6), eM = kit.emisivo(MAGENTA, 2.6), eV = kit.emisivo(VIOLETA, 2.4), eB = kit.emisivo(0xe8fbff, 3.2), eMenta = kit.emisivo(MENTA, 2.4);
  const eCsuave = kit.emisivo(CIAN, 1.5), eMsuave = kit.emisivo(MAGENTA, 1.5);
  const mNegro = trasPropio(new THREE.MeshStandardMaterial({ color: 0x090611, roughness: 0.22, metalness: 0.7, envMapIntensity: 1.2 }));
  mNegro.name = 'vacio';
  const mBasico = trasPropio(new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false }));
  const mHojas = trasPropio(new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide }));

  const L = kit.lote0;                       // lote principal
  const Lneon = kit.lote('neon');            // piezas emisivas
  const Y = (o) => ({ uv: false, ...o });
  const caja = (lote, m_, cx, cy, cz, w, h, d, o) => lote.caja(m_, cx, cy, cz, w, h, d, o);
  const evitar = [];                         // masas para repartir objetos

  // ═════════════ 1. SUELO ═════════════
  kit.suelo({
    tam: 160, material: 'composite_futurista', mezcla: 'asfalto_mojado', mojado: 0.45, contraste: 2.4, semilla: 5, desgaste: 0.35,
    pintura: (p) => {
      p.fondo(0.0);
      p.salpicar(-46, -46, 46, 46, 70, 1.5, 4.8, 1, 1.4);                     // parches de calzada mojada
      p.camino([[-46, 36], [-20, 36], [0, 41], [46, 38]], 4, 1, 1.4);          // calle de servicio al sur
      p.camino([[-40, -8], [-16, -8]], 3, 1, 1.2).camino([[16, 18], [44, 18]], 3, 1, 1.2);
      p.circulo(PLAZA.x, PLAZA.z, 19, 0, 3);                                   // la plaza queda limpia (sangre legible)
      p.rect(-4, -26, 4, -8, 0, 2);
      p.romper(3, 0.55);
    },
  });

  // ═════════════ 2. ZONAS ELEVADAS Y NEONES DE SUELO ═════════════
  const circ = (cx, cz, r, n = 72, k0 = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(k0 + (i / n) * 6.2832) * r, cz + Math.sin(k0 + (i / n) * 6.2832) * r]);
  const anillo = (lote, m_, cx, cz, r, ancho, y, alto = 0.025) => {
    lote.anadir(extruir(circ(cx, cz, r + ancho / 2), alto, { bisel: 0.004, huecos: [circ(cx, cz, r - ancho / 2).reverse()] }), m_, matriz(0, y, 0), Y());
  };
  // plaza central (magenta) con borde de acero y avenida al reactor
  kit.zona({ circulo: { x: PLAZA.x, z: PLAZA.z, r: PLAZA.r }, seg: 72, mat: mCompM, alto: 0.03, borde: { mat: mAceroOsc, ancho: 0.28, alto: 0.09 } });
  kit.zona({ rect: [-3.6, -24, 3.6, -9.2], mat: mCompC, alto: 0.036, borde: { mat: mAceroOsc, ancho: 0.2, alto: 0.1 } });
  // plataforma del andén y lecho de los raíles
  kit.zona({ rect: [10.5, -11.9, 41, -8.9], mat: mat('placa_antideslizante', { color: 0x3a4658 }), alto: 0.05, borde: { mat: mAceroOsc, ancho: 0.2, alto: 0.08 } });
  kit.zona({ rect: [5.5, RAIL_Z - 2.1, 46, RAIL_Z + 2.1], mat: mat('rejilla', { color: 0x2c3a52 }), alto: 0.03 });
  // explanada del reactor
  kit.zona({ circulo: { x: REACTOR.x, z: REACTOR.z, r: 12.2 }, seg: 64, mat: mat('placa_antideslizante', { color: 0x2d3445 }), alto: 0.03 });
  // explanadas de las torres y del terminal (placas oscuras con borde)
  kit.zona({ rect: [-39, -19, -19, -15.6], mat: mat('placa_antideslizante', { color: 0x2d3445 }), alto: 0.03 });
  kit.zona({ rect: [-39.5, 18, -20.5, 21.2], mat: mat('placa_antideslizante', { color: 0x2d3445 }), alto: 0.03 });
  kit.zona({ rect: [26, -28.5, 42, -25], mat: mat('placa_antideslizante', { color: 0x2d3445 }), alto: 0.03 });

  // neones empotrados en el suelo
  anillo(Lneon, eC, PLAZA.x, PLAZA.z, 12.5, 0.14, 0.045);
  anillo(Lneon, eM, PLAZA.x, PLAZA.z, 8.2, 0.1, 0.045);
  anillo(Lneon, eC, PLAZA.x, PLAZA.z, 4.2, 0.08, 0.045);
  anillo(Lneon, eM, REACTOR.x, REACTOR.z, 10.4, 0.16, 0.05);
  anillo(Lneon, eC, REACTOR.x, REACTOR.z, 11.6, 0.08, 0.05);
  for (let k = 0; k < 16; k++) { // radios de la plaza
    const a = (k / 16) * 6.2832 + 0.1;
    Lneon.caja(eMsuave, PLAZA.x + Math.cos(a) * 14.1, 0.045, PLAZA.z + Math.sin(a) * 14.1, 1.4, 0.02, 0.08, { rotY: -a, uv: false, radio: 0.005 });
  }
  for (const sx of [-3.6, 3.6]) Lneon.caja(eC, sx, 0.06, -16.6, 0.1, 0.02, 15, Y({ radio: 0.005 }));
  Lneon.caja(eM, 0, 0.06, -9.9, 6.8, 0.02, 0.12, Y({ radio: 0.005 }));
  Lneon.caja(eM, 25.75, 0.07, -11.9, 30.5, 0.03, 0.12, Y({ radio: 0.005 }));      // borde luminoso del andén
  // marcas de luz empotradas (baldosas luminosas) alineadas
  const marcas = [];
  for (let i = 0; i < 12; i++) { marcas.push({ x: -2.2, z: -11 - i * 1.1, color: CIAN }, { x: 2.2, z: -11 - i * 1.1, color: CIAN }); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.2832; marcas.push({ x: PLAZA.x + Math.cos(a) * 16.2, z: PLAZA.z + Math.sin(a) * 16.2, color: i % 2 ? MAGENTA : CIAN, rot: -a }); }
  for (let i = 0; i < 16; i++) marcas.push({ x: -44 + i * 2.2, z: 36.2, color: i % 3 ? CIAN : MAGENTA }, { x: 14 + i * 2, z: 18, color: i % 2 ? MAGENTA : VIOLETA });
  kit.instancias(cajaRedondeada(0.5, 0.025, 0.2, 0.008, 1), mBasico, marcas.map((p) => ({ ...p, y: 0.04, esc: 1 })), { sombras: false, nombre: 'marcas_suelo' });

  // parches: charcos de lluvia ácida que reflejan el neón y manchas oscuras
  const masas = [];                                           // se completa más abajo; los parches se dibujan al final
  // ═════════════ 3. REACTOR (norte) ═════════════
  {
    const { x, z } = REACTOR;
    L.anadir(cilindro(9.0, 8.5, 0.6, 56, 0.06), mPanM, matriz(x, 0, z));
    L.anadir(cilindro(7.4, 7.0, 0.5, 56, 0.05), mCompC, matriz(x, 0.6, z));
    anillo(Lneon, eM, x, z, 8.7, 0.18, 0.62, 0.03);
    anillo(Lneon, eC, x, z, 6.9, 0.14, 1.12, 0.03);
    // carcasa del núcleo
    L.anadir(cilindro(3.2, 2.6, 1.6, 40, 0.1), mCasco, matriz(x, 1.1, z));
    L.anadir(cilindro(2.7, 2.3, 0.35, 40, 0.05), mAcero, matriz(x, 2.7, z));
    anillo(Lneon, eC, x, z, 2.95, 0.12, 2.55, 0.05);
    // columna de plasma (emisiva) y casquete
    Lneon.anadir(cilindro(1.05, 0.95, 9.2, 32, 0.12), eC, matriz(x, 3.0, z), Y());
    Lneon.anadir(new THREE.SphereGeometry(1.35, 24, 16), eC, matriz(x, 12.5, z), Y());
    for (let k = 0; k < 6; k++) { // costillas de contención
      const a = (k / 6) * 6.2832 + 0.2, cx = x + Math.cos(a) * 2.5, cz = z + Math.sin(a) * 2.5;
      L.anadir(cilindro(0.2, 0.14, 8.8, 8, 0.02), mAcero, matriz(cx, 2.9, cz));
      Lneon.caja(eM, cx + Math.cos(a) * 0.17, 7.4, cz + Math.sin(a) * 0.17, 0.05, 6.2, 0.05, Y({ rotY: -a, radio: 0.005 }));
      L.anadir(cajaRedondeada(0.42, 0.3, 0.42, 0.04, 1), mAcero, matriz(cx, 11.7, cz, -a));
    }
    // cuatro pilones de refrigeración en la plataforma
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * 6.2832 + 0.78, cx = x + Math.cos(a) * 6.0, cz = z + Math.sin(a) * 6.0;
      L.anadir(cilindro(0.55, 0.45, 2.2, 14, 0.05), mCasco, matriz(cx, 1.1, cz));
      Lneon.anadir(cilindro(0.5, 0.5, 0.1, 14, 0.01), eM, matriz(cx, 3.3, cz), Y());
      Lneon.anadir(cilindro(0.2, 0.2, 2.0, 10, 0.01), eC, matriz(cx, 1.3, cz), Y());
    }
    kit.pilar(x, z, 8.4, { nombre: 'reactor' });
    masas.push({ x, z, r: 11.5 });
    kit.luz({ x, y: 9, z: z + 2, color: CIAN, intensidad: 150, distancia: 34 });
  }

  // ═════════════ 4. EDIFICIOS ═════════════
  const lucesTorre = { luzPuertas: false, colorLuz: CIAN };
  const torreNW = kit.edificio({ x: -29, z: -24, ancho: 13, fondo: 10, pisos: 3, alto: 10, estilo: 'futurista', colorMuro: MAGENTA, ...lucesTorre,
    puertas: [{ cara: 'sur', u: -2.5, ancho: 2.4, alto: 2.8 }], ventanas: { ancho: 1.8, alto: 1.2, sep: 3.2, luz: 0.85, marcoColor: 0x1a2430 }, semilla: 11, nombre: 'torre_nw' });
  const torreNE = kit.edificio({ x: 34, z: -33, ancho: 12, fondo: 10, pisos: 3, alto: 12, estilo: 'futurista', colorMuro: CIAN, ...lucesTorre,
    puertas: [{ cara: 'sur', u: 2, ancho: 2.4, alto: 2.8 }], ventanas: { ancho: 1.8, alto: 1.2, sep: 3.4, luz: 0.8, marcoColor: 0x1a2430 }, semilla: 12, nombre: 'torre_ne' });
  const terminal = kit.edificio({ x: -30, z: 25, ancho: 14, fondo: 8, pisos: 1, alto: 4.8, estilo: 'futurista', colorMuro: VIOLETA, ...lucesTorre,
    puertas: [{ cara: 'sur', u: -3, ancho: 3, alto: 3.2 }, { cara: 'sur', u: 3.2, ancho: 3, alto: 3.2 }], ventanas: { ancho: 2.2, alto: 1.1, sep: 3.8, luz: 0.9 }, semilla: 13, nombre: 'terminal' });
  for (const b of [torreNW, torreNE, terminal]) {
    const y = b.techoY, P = (lx, lz) => b.aMundo(lx, lz);
    // luz de borde en la azotea (los parapetos brillan)
    const w = b.ancho, f = b.fondo;
    for (const [lx, lz, sw, sd] of [[0, f / 2 - 0.1, w - 0.4, 0.1], [0, -f / 2 + 0.1, w - 0.4, 0.1], [w / 2 - 0.1, 0, 0.1, f - 0.4], [-w / 2 + 0.1, 0, 0.1, f - 0.4]]) {
      const p = P(lx, lz); Lneon.caja(b === torreNE ? eC : b === torreNW ? eM : eV, p[0] ?? p.x, y + 0.12, p[1] ?? p.z, sw, 0.08, sd, Y({ rotY: b.rot ?? 0, radio: 0.01 }));
    }
    // antena con baliza y plato de comunicaciones
    const pa = P(w * 0.3, -f * 0.2), ax = pa[0] ?? pa.x, az = pa[1] ?? pa.z;
    L.anadir(cilindro(0.1, 0.05, b.alto * 0.45, 8, 0.01), mAcero, matriz(ax, y, az));
    Lneon.anadir(new THREE.SphereGeometry(0.16, 10, 8), eM, matriz(ax, y + b.alto * 0.45 + 0.12, az), Y());
    const pd = P(-w * 0.25, f * 0.1), dx = pd[0] ?? pd.x, dz = pd[1] ?? pd.z;
    L.anadir(cilindro(0.2, 0.2, 0.5, 10, 0.02), mCasco, matriz(dx, y, dz));
    L.anadir(new THREE.SphereGeometry(0.75, 16, 8, 0, 6.2832, 0, 1.0), mCascoCl, matriz(dx, y + 0.9, dz, 0, 0.5), { uv: 'casco_nave' });
  }
  masas.push({ x: -29, z: -24, hx: 7.5, hz: 6 }, { x: 34, z: -33, hx: 7, hz: 6 }, { x: -30, z: 25, hx: 8, hz: 5 });

  // ═════════════ 5. RAÍLES MAGNÉTICOS Y TREN DETENIDO ═════════════
  {
    const z0 = RAIL_Z;
    // raíles: dos vigas de acero con la guía magnética luminosa entre ellas (siguen sobre el vacío)
    for (const dz of [-1.0, 1.0]) {
      L.anadir(cajaRedondeada(80, 0.14, 0.2, 0.03, 1), mAcero, matriz(26, 0.13, z0 + dz), { uv: 'acero_cepillado' });
      Lneon.caja(eCsuave, 26, 0.21, z0 + dz * 1.12, 80, 0.03, 0.04, Y({ radio: 0.005 }));
    }
    Lneon.caja(eM, 26, 0.12, z0, 80, 0.04, 0.34, Y({ radio: 0.01 }));
    for (let x = 8; x < 46; x += 1.9) L.caja(mAceroOsc, x, 0.09, z0, 0.32, 0.1, 3.4, { radio: 0.02 });
    // viaducto que continúa más allá del borde: durmientes y balizas hasta el horizonte
    for (let x = 48; x < 90; x += 6) {
      L.caja(mAceroOsc, x, 0.02, z0, 0.5, 0.16, 3.6, { radio: 0.03 });
      Lneon.caja(x % 12 === 0 ? eM : eC, x, 0.2, z0 + 1.95, 0.12, 0.08, 0.12, Y({ radio: 0.01 }));
    }
    // tope de vía en el extremo oeste
    L.caja(mCasco, 5.8, 0.55, z0, 0.6, 1.1, 3.0, { radio: 0.06 });
    Lneon.caja(eM, 6.12, 0.8, z0, 0.04, 0.24, 2.6, Y({ radio: 0.005 }));

    // vagones levitando
    const W = 3.5, H = 3.0, Y0 = 0.5;
    const vagon = (cx, len, sentido) => {
      const a = 2.7, pts = [], b = W / 2, fin = (len / 2) * sentido;
      for (let i = 0; i <= 14; i++) { const t = -Math.PI / 2 + (i / 14) * Math.PI; pts.push([cx + fin - sentido * a + sentido * a * Math.cos(t), z0 + b * Math.sin(t)]); }
      const atras = -fin;
      pts.push([cx + atras + sentido * 0.25, z0 + b], [cx + atras, z0 + b - 0.25], [cx + atras, z0 - b + 0.25], [cx + atras + sentido * 0.25, z0 - b]);
      L.anadir(extruir(pts, H, { bisel: 0.14, segBisel: 2 }), mCascoCl, matriz(0, Y0, 0), { uv: 'casco_nave' });
      // faldón inferior y estela luminosa del colchón magnético
      L.caja(mCasco, cx, Y0 + 0.02, z0, len - 1.2, 0.34, 2.5, { radio: 0.1 });
      Lneon.caja(eC, cx, 0.3, z0, len - 2.4, 0.05, 2.2, Y({ radio: 0.01 }));
      // franja magenta y banda de ventanas (a ambos lados)
      const ini = cx - len / 2 + 1.0, fi = cx + len / 2 - 1.0, nariz = sentido > 0 ? fi - 3.0 : ini + 3.0;
      const x0 = sentido > 0 ? ini : nariz, x1 = sentido > 0 ? nariz : fi;
      Lneon.caja(eM, (x0 + x1) / 2, Y0 + 0.85, z0, x1 - x0, 0.09, W + 0.04, Y({ radio: 0.01 }));
      const nv = 5, pv = (x1 - x0) / nv;
      for (let i = 0; i < nv; i++) { // ventanillas separadas por montantes
        Lneon.caja(eC, x0 + pv * (i + 0.5), Y0 + 2.05, z0, pv - 0.45, 0.78, W + 0.05, Y({ radio: 0.05 }));
      }
      for (const d of [0.22, 0.78]) { // puertas
        const dxp = x0 + (x1 - x0) * d;
        L.caja(mCasco, dxp, Y0 + 1.2, z0, 1.5, 2.25, W + 0.07, { radio: 0.04 });
        Lneon.caja(eM, dxp, Y0 + 1.2, z0, 0.06, 2.1, W + 0.09, Y({ radio: 0.005 }));
      }
      // cabina: cristal oscuro en el morro, faros
      const nx = cx + fin - sentido * 0.55;
      L.caja(mNegro, nx - sentido * 0.9, Y0 + 2.0, z0, 2.2, 0.8, W - 0.8, { radio: 0.2 });
      Lneon.caja(eB, nx + sentido * 0.2, Y0 + 0.9, z0 - 0.9, 0.2, 0.16, 0.5, Y({ radio: 0.04 }));
      Lneon.caja(eB, nx + sentido * 0.2, Y0 + 0.9, z0 + 0.9, 0.2, 0.16, 0.5, Y({ radio: 0.04 }));
      // techo con equipos
      L.caja(mAceroOsc, cx, Y0 + H + 0.1, z0, len - 4.2, 0.22, 2.3, { radio: 0.06 });
      for (let i = 0; i < 3; i++) L.caja(mCasco, cx - len * 0.25 + i * len * 0.25 - sentido * 0.8, Y0 + H + 0.45, z0 + (i % 2 ? 0.4 : -0.4), 1.5, 0.45, 0.9, { radio: 0.05 });
      Lneon.caja(eV, cx, Y0 + H + 0.24, z0, len - 4.6, 0.05, 0.12, Y({ radio: 0.005 }));
      kit.muro(cx, z0, len - 0.4, W - 0.1, 0, { nombre: 'vagon', material: 'metal' });
    };
    vagon(17.5, 11, -1);
    vagon(32.5, 11, 1);
    // pasarela del acoplamiento entre vagones (fuelle)
    L.caja(mat('goma', { color: 0x1a1d27 }), 25, 1.5, z0, 4.2, 2.6, 2.3, { radio: 0.2 });
    kit.luz({ x: 38.5, y: 2.6, z: z0, color: CIAN, intensidad: 70, distancia: 18 });
    masas.push({ x: 25, z: z0, hx: 15, hz: 3.4 });
  }

  // ═════════════ 6. BARANDILLAS DE CRISTAL, VACÍO Y CIUDAD LEJANA ═════════════
  {
    const E = 45.45, LB = kit.lote('baranda');
    // el vacío: anillo oscuro y reflectante que oculta el suelo de la periferia
    const cuadro = (r) => [[-r, -r], [r, -r], [r, r], [-r, r]];
    const vacio = extruir(cuadro(260), 0.05, { bisel: 0.005, huecos: [cuadro(E + 0.55).reverse()] });
    L.anadir(vacio, mNegro, matriz(0, 0.02, 0), Y());
    // luces de calles lejanas muy abajo (puntos que parecen estar a gran profundidad)
    const lados = [[0, -E, 1, 0], [0, E, 1, 0], [-E, 0, 0, 1], [E, 0, 0, 1]];
    for (const [cx, cz, ux, uz] of lados) {
      const largo = 2 * E + 0.9, n = Math.round(largo / 3);
      for (let i = 0; i <= n; i++) {
        const t = -largo / 2 + (i / n) * largo, px = cx + ux * t, pz = cz + uz * t;
        L.caja(mAceroOsc, px, 0.55, pz, 0.11, 1.1, 0.11, { radio: 0.02 });
        if (i < n) {
          const mx = cx + ux * (t + largo / n / 2), mz = cz + uz * (t + largo / n / 2);
          LB.caja(mCristal, mx, 0.58, mz, uz ? 0.04 : largo / n - 0.16, 0.95, uz ? largo / n - 0.16 : 0.04, { radio: 0.01, uv: false });
          Lneon.caja(i % 2 ? eC : eV, mx, 1.12, mz, uz ? 0.06 : largo / n - 0.1, 0.05, uz ? largo / n - 0.1 : 0.06, Y({ radio: 0.01 }));
        }
      }
    }
    // la ciudad lejana: rascacielos con ventanas encendidas (una malla por tinte) y balizas
    const ciudad = {
      c: kit.lote('ciudad_c'), m: kit.lote('ciudad_m'), v: kit.lote('ciudad_v'),
    };
    const mC = mat('cristal_rascacielos', { color: CIAN, emisivo: 1.5 }), mM = mat('cristal_rascacielos', { color: MAGENTA, emisivo: 1.5 }), mV = mat('cristal_rascacielos', { color: VIOLETA, emisivo: 1.4 });
    const rc = kit.rng(77);
    let n = 0, intentos = 0;
    while (n < 62 && intentos++ < 800) {
      const x = rc.rango(-118, 118), z = rc.rango(-118, 118), d = Math.max(Math.abs(x), Math.abs(z));
      if (d < 54) continue;
      const w = rc.rango(7, 15), f = rc.rango(7, 15);
      const norte = z < -40, alto = z > 48 ? rc.rango(6, 13) : norte ? rc.rango(24, 78) : rc.rango(10, 44);
      const tipo = rc() < 0.4 ? 'c' : rc() < 0.6 ? 'm' : 'v', mt = tipo === 'c' ? mC : tipo === 'm' ? mM : mV;
      ciudad[tipo].cajaBase(mt, x, 0, z, w, alto, f, { radio: 0.15 });
      if (alto > 20) { ciudad[tipo].cajaBase(mt, x, alto, z, w * 0.62, 5, f * 0.62, { radio: 0.1 }); Lneon.caja(rc() < 0.5 ? eM : eC, x, alto + 5.4, z, 0.4, 0.5, 0.4, Y({ radio: 0.05 })); }
      n++;
    }
    for (const k of ['c', 'm', 'v']) { const g = ciudad[k].construir({ sombras: false, nombre: 'ciudad_' + k }); kit.anadir(g); }
    // faro/anuncio gigante lejano (franja luminosa en el horizonte norte)
    for (let i = 0; i < 7; i++) Lneon.caja(i % 2 ? eM : eC, -60 + i * 20, 70 + (i % 3) * 20, -120, 10, 0.5, 0.4, Y({ radio: 0.05 }));
  }

  // ═════════════ 7. CARTELES HOLOGRÁFICOS FLOTANTES ═════════════
  const carteles = [];
  {
    const tex = trasPropio(crearAtlasCarteles());
    const mH = trasPropio(new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    // [x, z, y, rot, ancho, índice de cartel]
    const defs = [
      [-17, -13.6, 5.4, 0.04, 6.4, 0], [21, -22, 5.6, -0.05, 6.4, 1], [-41, -2, 4.8, Math.PI / 2, 6, 2], [41.2, 12, 4.8, -Math.PI / 2, 6, 3],
      [-13, 31, 4.6, 0.0, 5.6, 4], [16, 33, 4.6, 0.04, 5.6, 5], [-37, 11, 4.6, Math.PI / 2 - 0.3, 5.4, 6], [-10, -40.2, 6.8, 0.0, 7.4, 7],
    ];
    const geos = [];
    for (const [x, z, y, rot, w, idx] of defs) {
      const g = new THREE.PlaneGeometry(w, w / 2);
      const c = idx % 2, r = Math.floor(idx / 2), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, c * 0.5 + uv.getX(i) * 0.5, 1 - (r + 1) * 0.25 + uv.getY(i) * 0.25);
      g.applyMatrix4(matriz(x, y, z, rot));
      geos.push(g);
      // proyector en el suelo
      L.anadir(cilindro(0.34, 0.22, 0.5, 10, 0.03), mCasco, matriz(x + Math.sin(rot) * 0.0, 0, z + 0.3 * Math.cos(rot) * 0));
      Lneon.anadir(cilindro(0.26, 0.26, 0.05, 10, 0.005), idx % 2 ? eM : eC, matriz(x, 0.5, z), Y());
      // haz tenue del proyector al cartel
      kit.pilar(x, z, 0.32, { nombre: 'proyector' });
      Lneon.caja(idx % 2 ? eMsuave : eCsuave, x, y * 0.5 - 0.2, z, 0.03, y - 1.0, 0.03, Y({ radio: 0.004 }));
    }
    const geo = mergeGeometries(geos, false);
    const malla = new THREE.Mesh(geo, mH); malla.name = 'carteles_holograficos'; malla.frustumCulled = false; malla.renderOrder = 5;
    kit.anadir(malla);
    carteles.push({ malla, base: 0, mH });
  }

  // ═════════════ 8. PUERTAS DE ENERGÍA, TORRES TESLA, QUIOSCOS, DRONES, MACETAS ═════════════
  const texCampo = trasPropio(crearTexturaCampo());
  const mCampo = trasPropio(new THREE.MeshBasicMaterial({ map: texCampo, color: MAGENTA, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const campos = [];
  const puerta = ({ x, z, ancho, rot = 0, color = MAGENTA, luz = true }) => {
    const hx = ancho / 2, c = Math.cos(rot), s = -Math.sin(rot);
    const eP = color === MAGENTA ? eM : eC;
    for (const sg of [-1, 1]) {
      const px = x + sg * (hx + 0.55) * c, pz = z + sg * (hx + 0.55) * s;
      L.anadir(cilindro(0.66, 0.56, 0.5, 14, 0.04), mCasco, matriz(px, 0, pz));
      L.anadir(cilindro(0.5, 0.42, 3.4, 14, 0.03), color === MAGENTA ? mPanM : mPanC, matriz(px, 0.5, pz));
      Lneon.anadir(cilindro(0.54, 0.54, 0.07, 14, 0.005), eP, matriz(px, 1.4, pz), Y());
      Lneon.anadir(cilindro(0.5, 0.5, 0.07, 14, 0.005), eP, matriz(px, 2.7, pz), Y());
      L.anadir(cilindro(0.36, 0.3, 0.5, 14, 0.03), mAcero, matriz(px, 3.9, pz));
      Lneon.anadir(new THREE.SphereGeometry(0.3, 12, 10), eP, matriz(px, 4.3, pz), Y());
      kit.pilar(px, pz, 0.62, { nombre: 'pilar_energia' });
    }
    // viga con emisor superior (sin colisión)
    Lneon.caja(eP, x, 3.75, z, ancho + 0.9, 0.08, 0.14, Y({ rotY: rot, radio: 0.01 }));
    Lneon.caja(eP, x, 0.08, z, ancho + 0.9, 0.04, 0.14, Y({ rotY: rot, radio: 0.01 }));
    const obj = m?.crear?.('puerta_energia', { x, z, rot, ancho, eraIdx });
    if (!obj) { // sin el interactivo del mundo, se dibuja solo el campo (no bloquea)
      const campo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, 3.3), mCampo);
      campo.position.set(x, 1.95, z); campo.rotation.y = rot; campo.renderOrder = 4; campo.name = 'campo_energia';
      kit.anadir(campo); campos.push(campo);
    }
    if (luz) kit.luz({ x, y: 3.0, z: z + 0.8, color, intensidad: 34, distancia: 12 });
  };
  puerta({ x: -40.2, z: -24, ancho: 7.0, color: MAGENTA });
  puerta({ x: 41.6, z: RAIL_Z, ancho: 5.4, color: CIAN });
  puerta({ x: -41.2, z: 25, ancho: 6.4, color: MAGENTA, luz: false });

  const tesla = ({ x, z }) => {
    const obj = m?.crear?.('torre_tesla', { x, z, eraIdx });
    if (obj) return;
    L.anadir(cilindro(1.0, 0.8, 0.9, 16, 0.06), mCasco, matriz(x, 0, z));
    L.anadir(cilindro(0.38, 0.2, 4.6, 12, 0.03), mAcero, matriz(x, 0.9, z));
    for (let i = 0; i < 4; i++) {
      const r = 0.95 - i * 0.14, y = 1.7 + i * 0.95;
      Lneon.anadir(new THREE.TorusGeometry(r, 0.07, 8, 24), i % 2 ? eM : eC, matriz(x, y, z, 0, Math.PI / 2), Y());
    }
    Lneon.anadir(new THREE.SphereGeometry(0.45, 16, 12), eB, matriz(x, 5.9, z), Y());
    for (let k = 0; k < 4; k++) { const a = (k / 4) * 6.2832 + 0.4; L.anadir(cilindro(0.06, 0.03, 1.4, 6, 0.005), mAcero, matriz(x + Math.cos(a) * 0.55, 0.9, z + Math.sin(a) * 0.55, 0, Math.sin(a) * 0.35, -Math.cos(a) * 0.35)); }
    kit.pilar(x, z, 0.95, { nombre: 'torre_tesla' });
  };
  tesla({ x: -17, z: -9 }); tesla({ x: 18, z: -5 }); tesla({ x: -4, z: 29 });
  kit.luz({ x: -17, y: 5.4, z: -9, color: CIAN, intensidad: 40, distancia: 13 });

  // quioscos automáticos (pantalla hacia el sur salvo que se indique)
  const quiosco = (x, z, rot = 0, tono = CIAN) => {
    const M = matriz(x, 0, z, rot), eP = tono === CIAN ? eC : eM;
    L.anadir(cajaRedondeada(1.3, 2.3, 0.95, 0.08, 2), mCasco, mm(M, 0, 1.15, 0), { uv: 'casco_nave' });
    L.anadir(cajaRedondeada(1.42, 0.14, 1.07, 0.05, 1), mAcero, mm(M, 0, 2.38, 0), { uv: 'acero_cepillado' });
    Lneon.anadir(cajaRedondeada(0.92, 1.1, 0.05, 0.02, 1), tono === CIAN ? eCsuave : eMsuave, mm(M, -0.1, 1.45, 0.5), Y());
    Lneon.anadir(cajaRedondeada(0.22, 0.9, 0.04, 0.02, 1), eP, mm(M, 0.45, 1.3, 0.49), Y());
    Lneon.anadir(cajaRedondeada(1.1, 0.07, 0.04, 0.01, 1), eP, mm(M, 0, 0.5, 0.49), Y());
    Lneon.anadir(cajaRedondeada(1.2, 0.07, 0.06, 0.01, 1), eP, mm(M, 0, 2.25, 0.47), Y());
    L.anadir(cajaRedondeada(0.5, 0.26, 0.08, 0.02, 1), mNegro, mm(M, -0.3, 0.8, 0.5), Y());   // bandeja de dispensado
    kit.caja(x, z, 0.65, 0.5, rot, { nombre: 'quiosco' });
  };
  const mm = (M, ...r) => new THREE.Matrix4().multiplyMatrices(M, matriz(...r));
  quiosco(-21, -16.4, 0, CIAN); quiosco(16, -10.1, 0, MAGENTA); quiosco(30, -10.1, 0, CIAN); quiosco(-38, 16.5, 0, MAGENTA);
  quiosco(21.5, 29.2, 0, CIAN); quiosco(36.5, 4, -Math.PI / 2, MAGENTA); quiosco(-8, 37.2, 0, CIAN);

  // drones caídos
  const drones = [];
  const dron = (x, z, rot, vuelco = 0.25) => {
    const M = matriz(x, 0.16, z, rot, vuelco * 0.6, vuelco);
    L.anadir(new THREE.SphereGeometry(0.34, 14, 10), mCasco, mm(M, 0, 0, 0, 0, 0, 0, [1, 0.55, 1]), { uv: 'casco_nave' });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * 6.2832 + 0.78, ax = Math.cos(a) * 0.5, az = Math.sin(a) * 0.5;
      L.anadir(cajaRedondeada(0.62, 0.05, 0.06, 0.01, 1), mAceroOsc, mm(M, ax * 0.9, 0, az * 0.9, -a), { uv: 'acero_cepillado' });
      if (k !== 2) L.anadir(cilindro(0.26, 0.26, 0.03, 12, 0.005), mCasco, mm(M, ax * 1.8, k % 2 ? -0.02 : 0.05, az * 1.8), { uv: 'casco_nave' });
    }
    Lneon.anadir(new THREE.SphereGeometry(0.1, 8, 6), tonoDron(x), mm(M, 0.0, 0.0, 0.3), Y());
    Lneon.caja(eMsuave, x + Math.cos(rot) * 0.1, 0.04, z + Math.sin(rot) * 0.1, 0.5, 0.02, 0.05, Y({ rotY: rot + 0.7, radio: 0.005 }));
  };
  const tonoDron = (x) => (x > 0 ? eM : eC);
  [[-9, 17, 0.5], [11, 8.5, 2.0], [-12, -3, 3.9], [3, 26, 1.1], [27, -2, 5.3], [-26, 3, 0.2], [34, 21, 2.7], [-5, -19, 4.4], [12, -25, 1.5]].forEach(([x, z, r], i) => dron(x, z, r, 0.18 + (i % 3) * 0.1));

  // vegetación bioluminiscente (macetas, jardineras y matas de pelo luminoso)
  const hojas = [], bulbos = [];
  const planta = (x, z, n, radio, altura, paleta) => {
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.2832, d = Math.sqrt(rng()) * radio, h = altura * (0.45 + rng() * 0.75);
      const color = paleta[Math.floor(rng() * paleta.length)];
      const inc = 0.15 + rng() * 0.55 * (d / Math.max(radio, 0.01) + 0.4);
      hojas.push({ x: x + Math.cos(a) * d, y: 0, z: z + Math.sin(a) * d, rot: rng() * 6.2832, rotX: Math.cos(a) * inc, rotZ: Math.sin(a) * inc, esc: [0.7 + rng() * 0.6, h, 0.7 + rng() * 0.6], color });
      if (rng() < 0.3) bulbos.push({ x: x + Math.cos(a) * d * 1.05, y: h * 0.9, z: z + Math.sin(a) * d * 1.05, esc: 0.55 + rng() * 0.7, color: rng() < 0.5 ? 0xffd0f6 : 0xc8fff0 });
    }
  };
  const PAL = [MENTA, CIAN, MAGENTA, 0x7dffd6, 0xff7de9, VIOLETA];
  const maceta = (x, z, r = 0.95) => {
    L.anadir(cilindro(r, r * 0.82, 0.78, 20, 0.06), mCasco, matriz(x, 0, z));
    Lneon.anadir(cilindro(r + 0.02, r + 0.02, 0.05, 20, 0.005), eMenta, matriz(x, 0.5, z), Y());
    L.anadir(cilindro(r * 0.88, r * 0.88, 0.06, 20, 0.005), mat('hormigon', { color: 0x120c1c }), matriz(x, 0.76, z));
    planta(x, z, 16, r * 0.7, 1.15, PAL);
    kit.pilar(x, z, r + 0.05, { nombre: 'maceta' });
  };
  const jardinera = (x, z, largo, ancho, rot = 0, n = 70) => {
    const M = matriz(x, 0, z, rot);
    L.anadir(cajaRedondeada(largo, 0.82, ancho, 0.07, 2), mCasco, mm(M, 0, 0.41, 0), { uv: 'casco_nave' });
    Lneon.anadir(cajaRedondeada(largo + 0.04, 0.05, ancho + 0.04, 0.01, 1), eMenta, mm(M, 0, 0.56, 0), Y());
    L.anadir(cajaRedondeada(largo - 0.3, 0.05, ancho - 0.3, 0.01, 1), mat('hormigon', { color: 0x120c1c }), mm(M, 0, 0.83, 0));
    for (let i = 0; i < n; i++) {
      const lx = (rng() - 0.5) * (largo - 0.7), lz = (rng() - 0.5) * (ancho - 0.6), c = Math.cos(rot), s = -Math.sin(rot);
      planta(x + lx * c + lz * s, z + lx * s * -1 * -1 + lz * c, 1, 0.01, 1.3, PAL);
    }
    kit.muro(x, z, largo, ancho, rot, { nombre: 'jardinera', bloqueaBalas: false });
  };
  [[16.6, 6.6], [-16.6, 6.6], [0, 22.4], [-11.8, 18.2], [11.8, 18.4], [-12.2, -5.2], [13.5, -3.5]].forEach(([x, z]) => maceta(x, z));
  jardinera(27, 31, 9, 2.2, 0.0, 60); jardinera(36.5, 27.5, 5, 2.0, 0.3, 34); jardinera(-30, 19.4, 7, 1.3, 0.0, 34); jardinera(-24, -15.2, 5, 1.3, 0, 22);
  if (hojas.length) {
    const cono = new THREE.ConeGeometry(0.1, 1, 6, 1, true); cono.translate(0, 0.5, 0);
    const col = [], p = cono.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getY(i); col.push(0.12 + t * 0.88, 0.12 + t * 0.88, 0.12 + t * 0.88); }
    cono.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    kit.instancias(cono, mHojas, hojas, { sombras: false, nombre: 'hojas_bio' });
    kit.instancias(new THREE.IcosahedronGeometry(0.1, 0), mBasico, bulbos, { sombras: false, nombre: 'bulbos_bio' });
  }

  // ═════════════ 9. FAROLAS, MOBILIARIO Y DETALLES ═════════════
  for (const [x, z, r] of [[-9, -4, 0], [9, -4, Math.PI], [-10, 18, 0], [10, 19, Math.PI], [-38, -14, 0.5]]) kit.farola({ x, z, tipo: 'sintetica', rot: r, luz: false });
  // bancos flotantes de luz en el andén y la plaza
  for (const [x, z, r] of [[20, -9.8, 0], [24, -9.8, 0], [34.5, -9.8, 0], [-15, 14, 0.6], [15.5, 15, -0.6]]) {
    const M = matriz(x, 0, z, r);
    L.anadir(cajaRedondeada(2.0, 0.12, 0.5, 0.04, 1), mAcero, mm(M, 0, 0.45, 0), { uv: 'acero_cepillado' });
    L.anadir(cajaRedondeada(0.12, 0.45, 0.4, 0.02, 1), mCasco, mm(M, -0.8, 0.22, 0), { uv: 'casco_nave' });
    L.anadir(cajaRedondeada(0.12, 0.45, 0.4, 0.02, 1), mCasco, mm(M, 0.8, 0.22, 0), { uv: 'casco_nave' });
    Lneon.caja(eC, x, 0.3, z, 1.8, 0.03, 0.4, Y({ rotY: r, radio: 0.005 }));
    kit.caja(x, z, 1.0, 0.25, r, { nombre: 'banco', bloqueaBalas: false });
  }
  // restos de paneles rotos y cajas de cables sueltas por el suelo
  const restos = kit.dispersar({ area: { x0: -42, z0: -40, x1: 42, z1: 40 }, cantidad: 46, distMin: 3, libre: 0, semilla: 9, evitar: [...masas.map((q) => (q.r ? { x: q.x, z: q.z, r: q.r } : { x: q.x, z: q.z, hx: q.hx, hz: q.hz, rot: 0, margen: 0.5 })), { x: PLAZA.x, z: PLAZA.z, r: 6 }] });
  kit.instancias(cajaRedondeada(0.62, 0.1, 0.4, 0.03, 1), mAceroOsc, restos.map((p) => ({ x: p.x, y: 0.05, z: p.z, rot: p.rot, rotZ: (p.u - 0.5) * 0.12, esc: [0.5 + p.u, 1, 0.6 + p.u * 0.8], color: p.u > 0.7 ? 0x6a5b8c : 0x3a4458 })), { sombras: false, nombre: 'restos' });
  // charcos de lluvia ácida y manchas de aceite
  const ev = [...kit._edificios.map((e) => ({ x: e.x, z: e.z, hx: e.ancho / 2, hz: e.fondo / 2, rot: e.rot, margen: 1 })), { x: REACTOR.x, z: REACTOR.z, r: 9.5 }, { x: 25, z: RAIL_Z, hx: 14, hz: 3 }];
  kit.parches({ tipo: 'charco', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 14, radio: [1.0, 2.6], evitar: ev, color: 0x15213a, opacidad: 0.9, semilla: 17 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 12, radio: [2.2, 5], evitar: ev, color: 0x0b0814, opacidad: 0.3, semilla: 18 });
  kit.parches({ tipo: 'mancha', area: { x0: -42, z0: -42, x1: 42, z1: 42 }, cantidad: 14, radio: [0.6, 1.6], evitar: ev, color: 0x1c1030, opacidad: 0.5, semilla: 19 });

  // ═════════════ 10. ANILLOS HOLOGRÁFICOS DEL REACTOR (animados) ═════════════
  const anillos = [];
  {
    const tex = trasPropio(crearTexturaAnillo(3));
    const defs = [[6.6, 3.6, CIAN, 0.55, 0.12, 0.0], [5.2, 6.3, MAGENTA, -0.8, -0.1, 0.1], [3.9, 8.9, CIAN, 1.1, 0.0, -0.12], [7.8, 11.0, MAGENTA, -0.4, 0.06, 0.08]];
    for (const [r, y, color, w, tx, tz] of defs) {
      const g = new THREE.PlaneGeometry(r * 2, r * 2); g.rotateX(-Math.PI / 2);
      const mt = trasPropio(new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity: 0.9 }));
      const malla = new THREE.Mesh(g, mt); malla.renderOrder = 6; malla.frustumCulled = false;
      const gr = new THREE.Group(); gr.position.set(REACTOR.x, y, REACTOR.z); gr.rotation.set(tx, 0, tz); gr.add(malla); gr.name = 'anillo_holografico';
      kit.anadir(gr); anillos.push({ malla, w, mt });
    }
  }

  // tráfico aéreo lejano (estelas luminosas que cruzan el cielo)
  const trafico = [];
  const traficoInst = (() => {
    const lista = [];
    for (let i = 0; i < 26; i++) {
      const z = rng.rango(-120, -58) + (i % 4 === 0 ? rng.rango(110, 190) : 0), y = rng.rango(8, 46), v = rng.rango(6, 18) * (i % 2 ? 1 : -1);
      trafico.push({ x: rng.rango(-130, 130), y, z, v });
      lista.push({ x: 0, y, z, color: [CIAN, MAGENTA, 0xffffff, VIOLETA][i % 4] });
    }
    return kit.instancias(cajaRedondeada(2.6, 0.14, 0.28, 0.03, 1), mBasico, lista, { sombras: false, nombre: 'trafico_aereo' });
  })();
  const M4 = new THREE.Matrix4();

  // ═════════════ 11. JUGABILIDAD ═════════════
  const libresDe = [...masas.map((q) => (q.r ? { x: q.x, z: q.z, r: q.r } : { x: q.x, z: q.z, hx: q.hx, hz: q.hz, rot: 0, margen: 1.2 })), { x: PLAZA.x, z: PLAZA.z, r: 9 },
    ...[[-40.2, -24], [41.6, RAIL_Z], [-41.2, 25]].map(([x, z]) => ({ x, z, r: 5 }))];
  const exp = kit.dispersar({ area: { x0: -40, z0: -38, x1: 40, z1: 38 }, cantidad: 10, distMin: 12, libre: 1.4, semilla: 21, evitar: libresDe });
  for (const p of exp) m?.crear?.('explosivo', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  const cajasJ = kit.dispersar({ area: { x0: -40, z0: -38, x1: 40, z1: 38 }, cantidad: 8, distMin: 9, libre: 1.2, semilla: 22, evitar: [...libresDe, ...exp.map((p) => ({ x: p.x, z: p.z, r: 2.5 }))] });
  for (const p of cajasJ) m?.crear?.('caja', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  for (const [x, z] of [[-6.5, 14], [8.5, 13], [-19, 5]]) m?.crear?.('empujable', { x, z, eraIdx });
  m?.crear?.('emplazamiento', { x: -16, z: 3, rot: Math.PI / 2, eraIdx });
  m?.crear?.('emplazamiento', { x: 15.5, z: 22, rot: -Math.PI / 2 - 0.4, eraIdx });
  vh?.crear?.(era.vehiculo, { x: -2, z: 24.5, rot: Math.PI });
  vh?.crear?.(era.vehiculo, { x: -22, z: -6, rot: 0.5 });

  // ═════════════ 12. DATOS DEL MAPA ═════════════
  const dN = torreNW.puertas[0], dT = terminal.puertas[0];
  let t = 0;
  return {
    grupo: kit.grupo,
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x: -2, z: 8 }, { x: 2, z: 8 }],
    puntosAparicion: [
      { x: -42, z: -42, tipo: 'borde' }, { x: -18, z: -42.5, tipo: 'borde' }, { x: 0, z: -43, tipo: 'borde' }, { x: 20, z: -42, tipo: 'borde' },
      { x: 42.5, z: -24, tipo: 'borde' }, { x: 42.5, z: 8, tipo: 'borde' }, { x: 42.5, z: 33, tipo: 'borde' },
      { x: 14, z: 42, tipo: 'borde' }, { x: -14, z: 42, tipo: 'borde' }, { x: -40, z: 42, tipo: 'borde' },
      { x: -42.5, z: -10, tipo: 'borde' }, { x: -42.5, z: 10, tipo: 'borde' }, { x: -42.5, z: -35, tipo: 'borde' },
      { x: dN.x, z: dN.z + 1.6, tipo: 'interior', peso: 0.6 },         // puerta de la torre noroeste
      { x: dT.x, z: dT.z + 1.6, tipo: 'interior', peso: 0.6 },         // puerta del terminal
      { x: 25, z: RAIL_Z, tipo: 'interior', peso: 0.5 },               // entre los vagones del tren
    ],
    zonas: [{ id: 'plaza', x: PLAZA.x, z: PLAZA.z, r: PLAZA.r }, { id: 'reactor', x: REACTOR.x, z: REACTOR.z, r: 12 }, { id: 'andén', x: 26, z: -10, r: 14 }],
    actualizar(dt) {
      t += dt;
      anillos.forEach((a, i) => { a.malla.rotation.y += a.w * dt; a.mt.opacity = 0.75 + Math.sin(t * 2.2 + i * 1.7) * 0.18; });
      for (const c of carteles) { c.malla.position.y = Math.sin(t * 0.9) * 0.12; c.mH.opacity = 0.9 + Math.sin(t * 7.3) * 0.05 * (Math.sin(t * 0.7) > 0.8 ? 3 : 1); }
      for (const c of campos) c.material.opacity = 0.42 + Math.sin(t * 5) * 0.08;
      mCampo.map.offset.x = (t * 0.25) % 1;
      for (let i = 0; i < trafico.length; i++) {
        const q = trafico[i]; q.x += q.v * dt; if (q.x > 140) q.x = -140; if (q.x < -140) q.x = 140;
        const col = traficoInst.instanceMatrix; M4.compose(new THREE.Vector3(q.x, q.y, q.z), new THREE.Quaternion(), new THREE.Vector3(q.v < 0 ? -1 : 1, 1, 1)); M4.toArray(col.array, i * 16);
      }
      traficoInst.instanceMatrix.needsUpdate = true;
    },
  };
}
