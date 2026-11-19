// Blindado táctico de la Era Digital: casco facetado, cristal blindado, rejillas anticohete y torreta remota con cámara y cañón.
import { THREE, Acum, loft, caja, cilX, cilZ, tubo, torno, esfera, barra, lib, est, cristal, faroMat, mat4, base, restosMetal } from './comun.js';
import { montarRueda } from './ruedas.js';
import { extruir, T, cil } from '../geo.js';

export function crearBlindado() {
  const { grupo, chasis } = base();
  const M = {
    pintura: lib('acero_pintado', { color: 0x4a5560, desgaste: 0.25 }), pinturaB: lib('acero_pintado', { color: 0x2c333a, desgaste: 0.3 }),
    cromo: lib('cromo'), hierro: lib('hierro_forjado'), neg: est('bt_neg', { color: 0x0e1012, roughness: 0.5, metalness: 0.4 }), acero: lib('acero_cepillado'),
    cristal: cristal(0x16262e), faro: faroMat(0xe8f4ff, 4), luzR: est('bt_rojo', { color: 0x300000, emissive: 0xff2020, emissiveIntensity: 3 }),
    luzA: est('bt_azul', { color: 0x001030, emissive: 0x2a6bff, emissiveIntensity: 3 }), lente: est('bt_lente', { color: 0x001018, emissive: 0x2cd8ff, emissiveIntensity: 2.8 }),
    naranja: est('bt_nar', { color: 0xff7a14, roughness: 0.5, metalness: 0.2 }), goma: est('bt_goma', { color: 0x111214, roughness: 0.8 }),
  };
  const a = new Acum();
  const casco = loft([
    { z: -2.8, w: 1.1, yb: 0.72, yt: 2.05, e: 8, eb: 8 },
    { z: -2.4, w: 1.26, yb: 0.62, yt: 2.2, e: 8, eb: 8 },
    { z: -0.3, w: 1.27, yb: 0.62, yt: 2.2, e: 8, eb: 8 },
    { z: 0.6, w: 1.24, yb: 0.62, yt: 2.1, e: 8, eb: 8 },
    { z: 1.0, w: 1.2, yb: 0.62, yt: 1.7, e: 8, eb: 8 },
    { z: 2.3, w: 1.16, yb: 0.64, yt: 1.55, e: 7, eb: 8 },
    { z: 2.8, w: 1.0, yb: 0.7, yt: 1.38, e: 5, eb: 6 },
  ], { aro: 40, pasos: 4 });
  a.add(casco, M.pintura);
  // faldones inferiores oscuros y guardabarros
  a.add(loft([{ z: -2.6, w: 1.2, yb: 0.45, yt: 0.7, e: 4 }, { z: 2.7, w: 1.1, yb: 0.45, yt: 0.7, e: 4 }], { aro: 16, pasos: 2 }), M.pinturaB);
  for (const s of [-1, 1]) for (const z of [1.55, -1.3]) a.add(caja(0.2, 0.1, 1.5, 0.04), M.pinturaB, mat4(s * 1.3, 1.22, z));
  // parabrisas inclinado y ventanillas blindadas
  a.add(caja(1.9, 0.5, 0.08, 0.04), M.cristal, mat4(0, 1.88, 1.07, -0.7, 0, 0));
  a.add(caja(2.0, 0.6, 0.06, 0.02), M.neg, mat4(0, 1.88, 1.045, -0.7, 0, 0));
  for (const s of [-1, 1]) for (const z of [0.4, -0.5]) a.add(caja(0.05, 0.42, 0.6, 0.03), M.cristal, mat4(s * 1.275, 1.95, z)); 
  for (const s of [-1, 1]) a.add(caja(0.03, 0.7, 0.03, 0.01, 1), M.neg, mat4(s * 1.28, 1.7, -0.1));
  // parrilla y luces LED, parachoques, cabrestante
  a.add(caja(1.4, 0.4, 0.06, 0.02), M.neg, mat4(0, 0.98, 2.78));
  for (let i = -6; i <= 6; i++) a.add(caja(0.015, 0.34, 0.02, 0.004, 1), M.acero, mat4(i * 0.1, 0.98, 2.82));
  for (const s of [-1, 1]) { a.add(caja(0.32, 0.12, 0.06, 0.02), M.faro, mat4(s * 0.85, 1.12, 2.7)); a.add(caja(0.12, 0.08, 0.06, 0.02), M.naranja, mat4(s * 1.02, 0.9, 2.62)); }
  a.add(caja(2.4, 0.22, 0.34, 0.06), M.pinturaB, mat4(0, 0.58, 2.8));
  a.add(caja(0.3, 0.14, 0.2, 0.04), M.hierro, mat4(0, 0.6, 2.98)); a.add(cilX(0.07, 0.3, 12), M.acero, mat4(0, 0.6, 3.05));
  a.add(caja(2.3, 0.2, 0.3, 0.05), M.pinturaB, mat4(0, 0.62, -2.82));
  // barra de luces de emergencia
  a.add(caja(1.5, 0.08, 0.14, 0.02), M.neg, mat4(0, 2.28, 0.5));
  for (const [x, m] of [[-0.55, M.luzR], [-0.28, M.luzR], [0.28, M.luzA], [0.55, M.luzA]]) a.add(caja(0.2, 0.06, 0.12, 0.02), m, mat4(x, 2.34, 0.5));
  // rejillas anticohete en los laterales (barras)
  for (const s of [-1, 1]) for (let i = 0; i < 11; i++) a.add(caja(0.025, 0.55, 0.025, 0.006, 1), M.neg, mat4(s * 1.34, 1.35, -2.0 + i * 0.35 + 0.0));
  for (const s of [-1, 1]) { a.add(caja(0.03, 0.03, 3.6, 0.01, 1), M.neg, mat4(s * 1.34, 1.64, -0.2)); a.add(caja(0.03, 0.03, 3.6, 0.01, 1), M.neg, mat4(s * 1.34, 1.1, -0.2)); }
  // escotilla trasera, puertas, antenas, snorkel y luces traseras
  a.add(caja(1.9, 1.3, 0.05, 0.03), M.pinturaB, mat4(0, 1.42, -2.8));
  for (const x of [-1.1, 1.1]) a.add(caja(0.2, 0.1, 0.06, 0.02), M.luzR, mat4(x, 0.95, -2.8));
  for (const s of [-1, 1]) a.add(caja(0.03, 1.1, 0.03, 0.006, 1), M.neg, mat4(s * 1.28, 1.45, 0.05));
  a.add(barra([-1.0, 2.2, -2.2], [-1.05, 3.3, -2.3], 0.014, 0.008, 6), M.neg); a.add(barra([1.0, 2.2, -2.2], [1.05, 3.0, -2.3], 0.014, 0.008, 6), M.neg);
  a.add(tubo([[1.2, 1.3, 1.0], [1.35, 2.8, 1.0], [1.35, 2.9, 0.8]], 0.08, 12, 8), M.neg);
  // espejos y estribos
  for (const s of [-1, 1]) { a.add(barra([s * 1.2, 1.9, 1.3], [s * 1.5, 2.0, 1.4], 0.015, 0.015, 6), M.neg); a.add(caja(0.05, 0.22, 0.18, 0.02), M.neg, mat4(s * 1.55, 2.0, 1.4)); a.add(caja(0.2, 0.05, 1.8, 0.02), M.neg, mat4(s * 1.4, 0.65, 0.4)); }
  // franjas de identificación
  for (const s of [-1, 1]) a.add(caja(0.01, 0.14, 2.2, 0.004, 1), M.naranja, mat4(s * 1.275, 1.0, -0.8));
  // chasis y ejes
  a.add(caja(1.6, 0.2, 5.0, 0.04), M.hierro, mat4(0, 0.45, 0)); a.add(cilX(0.1, 2.4, 10), M.hierro, mat4(0, 0.58, 1.6)); a.add(cilX(0.1, 2.4, 10), M.hierro, mat4(0, 0.58, -1.6));
  a.volcar(chasis);
  const ruedas = [];
  for (const [z, d] of [[1.6, true], [-1.6, false]]) for (const s of [-1, 1]) ruedas.push(montarRueda(chasis, 'militar', { R: 0.6, ancho: 0.42, x: s * 1.24, z, direccion: d, M }));
  // torreta remota
  const yaw = new THREE.Group(); yaw.position.set(0, 2.2, -1.2); chasis.add(yaw);
  const t = new Acum();
  t.add(torno([[0.001, 0], [0.5, 0], [0.5, 0.09], [0.001, 0.09]], 24), M.pinturaB);
  t.add(caja(0.62, 0.4, 0.7, 0.07), M.pintura, mat4(0, 0.3, 0.0));
  t.add(esfera(0.17, 14, 10), M.neg, mat4(0.0, 0.62, 0.25)); t.add(esfera(0.08, 10, 8), M.lente, mat4(0, 0.64, 0.4));
  t.add(caja(0.2, 0.12, 0.2, 0.03), M.neg, mat4(-0.32, 0.35, 0.0)); t.add(cilZ(0.04, 0.03, 8), M.lente, mat4(-0.32, 0.35, 0.12));
  t.add(caja(0.5, 0.2, 0.12, 0.03), M.neg, mat4(0, 0.55, -0.4)); t.add(barra([0.25, 0.65, -0.35], [0.28, 1.1, -0.45], 0.01, 0.01, 5), M.neg);
  t.volcar(yaw);
  const retro = new THREE.Group(); retro.position.set(0, 0.28, 0.35); yaw.add(retro);
  { const g = new Acum(); g.add(caja(0.2, 0.2, 0.5, 0.04), M.neg, mat4(0, 0, 0.1)); g.add(cilZ(0.04, 1.0, 12), M.acero, mat4(0, 0, 0.8)); g.add(cilZ(0.06, 0.2, 12), M.neg, mat4(0, 0, 1.3)); g.add(cilZ(0.075, 0.28, 12), M.neg, mat4(0, 0, 0.5)); g.volcar(retro); }
  const boca = new THREE.Object3D(); boca.position.set(0, 0, 1.4); retro.add(boca);
  const asiento = new THREE.Object3D(); asiento.position.set(0, 1.5, 0.3); chasis.add(asiento);
  return {
    grupo, chasis, ruedas, asiento, arma: { yaw, boca, retroceso: retro },
    faros: [{ x: -0.85, y: 1.12, z: 2.7 }, { x: 0.85, y: 1.12, z: 2.7 }], escapes: [{ x: 1.3, y: 0.6, z: -2.2 }],
    humoAveria: { x: 0, y: 1.7, z: 2.0 },
    restos() { restosMetal(this); },
  };
}
