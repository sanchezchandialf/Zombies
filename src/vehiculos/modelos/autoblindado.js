// Autoblindado de la Era de las Trincheras: casco de planchas remachadas, radiador de latón, ruedas de artillería y torreta con ametralladora Maxim.
import { THREE, Acum, loft, caja, cilX, cilZ, tubo, torno, esfera, barra, lib, est, faroMat, mat4, base, restosMetal } from './comun.js';
import { montarRueda } from './ruedas.js';
import { cil } from '../geo.js';

export function crearAutoblindado() {
  const { grupo, chasis } = base();
  const M = {
    pintura: lib('acero_pintado', { color: 0x6b7242, desgaste: 0.25 }), pinturaO: lib('acero_pintado', { color: 0x4b5130, desgaste: 0.3 }),
    hierro: lib('hierro_forjado'), laton: lib('laton_bronce'), madera: lib('tablas_viejas'), neg: est('ab_neg', { color: 0x111111, roughness: 0.6, metalness: 0.4 }),
    faro: faroMat(0xffe2a0, 3), cuero: lib('cuero', { color: 0x3a2a1a }), acero: lib('acero_cepillado'), herrumbre: lib('hierro_oxidado'),
  };
  const a = new Acum();
  // casco: planchas anguladas (loft de sección casi rectangular)
  const casco = loft([
    { z: -2.3, w: 0.88, yb: 0.62, yt: 1.65, e: 6, eb: 6 },
    { z: -1.7, w: 1.0, yb: 0.55, yt: 1.95, e: 7, eb: 6 },
    { z: -0.2, w: 1.0, yb: 0.55, yt: 1.95, e: 7, eb: 6 },
    { z: 0.2, w: 0.96, yb: 0.55, yt: 1.78, e: 7, eb: 6 },
    { z: 0.5, w: 0.92, yb: 0.55, yt: 1.48, e: 7, eb: 6 },
    { z: 1.6, w: 0.88, yb: 0.55, yt: 1.45, e: 7, eb: 6 },
    { z: 2.1, w: 0.8, yb: 0.58, yt: 1.38, e: 5, eb: 5 },
  ], { aro: 40, pasos: 4 });
  a.add(casco, M.pintura);
  // capó con aletas de ventilación y radiador de latón
  for (let i = 0; i < 6; i++) a.add(caja(0.5, 0.02, 0.04, 0.005, 1), M.neg, mat4(0, 1.47, 0.75 + i * 0.1));
  a.add(caja(1.1, 0.8, 0.12, 0.04), M.laton, mat4(0, 0.98, 2.14));
  for (let i = -5; i <= 5; i++) a.add(caja(0.02, 0.7, 0.03, 0.006, 1), M.neg, mat4(i * 0.095, 0.98, 2.21));
  a.add(torno([[0.0, 0], [0.09, 0], [0.09, 0.1], [0.0, 0.12]], 14), M.laton, mat4(0, 1.38, 2.14));
  a.add(caja(0.12, 0.05, 0.05, 0.015, 1), M.laton, mat4(0, 1.5, 2.15));
  // visores del conductor, portillos y planchas
  for (const x of [-0.35, 0.35]) a.add(caja(0.34, 0.07, 0.04, 0.01, 1), M.neg, mat4(x, 1.7, 0.18));
  for (const s of [-1, 1]) for (const z of [-1.5, -0.9, -0.3]) a.add(caja(0.04, 0.07, 0.16, 0.01, 1), M.neg, mat4(s * 1.0, 1.55, z));
  // remaches en hileras
  for (const s of [-1, 1]) for (let i = 0; i < 24; i++) { a.add(esfera(0.022, 5, 4), M.hierro, mat4(s * 1.01, 0.8, -2.2 + i * 0.18)); a.add(esfera(0.022, 5, 4), M.hierro, mat4(s * 1.01, 1.85, -1.8 + i * 0.06 * (i < 20 ? 1 : 0))); }
  for (let i = 0; i < 12; i++) a.add(esfera(0.022, 5, 4), M.hierro, mat4(-0.55 + i * 0.1, 1.2, 2.2));
  // torreta giratoria base (fija) y plataforma
  a.add(torno([[0.001, 0], [0.8, 0], [0.82, 0.08], [0.8, 0.14], [0.001, 0.14]], 28), M.pinturaO, mat4(0, 1.93, -0.9));
  // guardabarros altos
  for (const s of [-1, 1]) for (const z of [1.45, -1.3]) a.add(caja(0.34, 0.06, 1.3, 0.025), M.pinturaO, mat4(s * 1.05, 0.98, z));
  // estribos
  for (const s of [-1, 1]) a.add(caja(0.3, 0.05, 2.0, 0.02), M.madera, mat4(s * 1.15, 0.62, -0.1));
  // faros de carburo grandes de latón
  for (const s of [-1, 1]) { a.add(torno([[0.001, 0.0], [0.17, 0.0], [0.17, 0.18], [0.12, 0.26]], 18).rotateX(Math.PI / 2), M.laton, mat4(s * 0.6, 1.13, 2.05)); a.add(cilZ(0.14, 0.03, 16), M.faro, mat4(s * 0.6, 1.13, 2.32)); a.add(barra([s * 0.6, 1.0, 2.0], [s * 0.6, 0.9, 1.9], 0.025, 0.025, 6), M.hierro); }
  // parachoques de tubo y ganchos, escape lateral, rueda de repuesto
  a.add(tubo([[-0.9, 0.62, 2.25], [-0.5, 0.58, 2.3], [0.5, 0.58, 2.3], [0.9, 0.62, 2.25]], 0.05, 16, 8), M.hierro);
  a.add(tubo([[1.08, 0.9, -1.8], [1.1, 0.88, -0.2], [1.1, 0.88, 0.9]], 0.05, 10, 8), M.hierro);
  a.add(caja(0.08, 0.14, 0.4, 0.02), M.hierro, mat4(1.1, 0.88, 0.9));
  a.add(cilX(0.4, 0.2, 18), M.neg, mat4(-1.09, 1.35, -1.55)); a.add(cilX(0.25, 0.24, 14), M.pintura, mat4(-1.1, 1.35, -1.55));
  // luz trasera, pala de zapa y bidón de gasolina
  a.add(caja(0.12, 0.12, 0.05, 0.02), est('luzr', { color: 0x550000, emissive: 0xff2010, emissiveIntensity: 1.8 }), mat4(0.7, 1.0, -2.35));
  a.add(caja(0.45, 0.6, 0.2, 0.04), M.pinturaO, mat4(-0.55, 1.1, -2.42)); a.add(caja(0.05, 0.4, 0.05, 0.01, 1), M.hierro, mat4(-0.55, 1.15, -2.55));
  a.add(caja(1.2, 0.2, 4.3, 0.04), M.hierro, mat4(0, 0.4, 0));
  a.add(cilX(0.06, 1.9, 8), M.hierro, mat4(0, 0.5, 1.45)); a.add(cilX(0.06, 1.9, 8), M.hierro, mat4(0, 0.5, -1.4));
  a.volcar(chasis);
  const ruedas = [];
  for (const [z, d] of [[1.45, true], [-1.4, false]]) for (const s of [-1, 1]) ruedas.push(montarRueda(chasis, 'artilleria', { R: 0.5, ancho: 0.3, x: s * 1.05, z, direccion: d, M }));
  // torreta con ametralladora Maxim
  const yaw = new THREE.Group(); yaw.position.set(0, 2.07, -0.9); chasis.add(yaw);
  const t = new Acum();
  t.add(torno([[0.001, 0], [0.62, 0], [0.64, 0.06], [0.6, 0.5], [0.5, 0.58], [0.001, 0.62]], 28), M.pintura, mat4(0, 0, 0));
  t.add(torno([[0.62, 0.38], [0.66, 0.38], [0.66, 0.44], [0.62, 0.44]], 28), M.hierro);
  t.add(caja(0.5, 0.26, 0.5, 0.05), M.pinturaO, mat4(0, 0.48, 0.52));                       // mantelete de la ametralladora
  t.add(caja(0.34, 0.12, 0.04, 0.01, 1), M.neg, mat4(0, 0.52, 0.78));                          // tronera
  t.add(caja(0.34, 0.1, 0.04, 0.01, 1), M.neg, mat4(0, 0.5, -0.64));
  for (let i = 0; i < 12; i++) { const an = (i / 12) * 6.283; t.add(esfera(0.02, 5, 4), M.hierro, mat4(Math.cos(an) * 0.64, 0.3, Math.sin(an) * 0.64)); }
  t.add(cilZ(0.04, 0.04, 8), M.hierro, mat4(0, 0.62, 0.0));
  // escotilla
  t.add(torno([[0.001, 0.04], [0.22, 0.03], [0.24, 0.0], [0.001, 0.0]], 18), M.pinturaO, mat4(0, 0.6, -0.15));
  t.volcar(yaw);
  const retro = new THREE.Group(); retro.position.set(0, 0.5, 0.7); yaw.add(retro);
  { const g = new Acum();
    g.add(cilZ(0.075, 0.55, 16), M.acero, mat4(0, 0, 0.1));                                        // camisa de agua
    for (let i = 0; i < 6; i++) g.add(torno([[0.075, -0.01], [0.085, -0.01], [0.085, 0.01], [0.075, 0.01]], 12).rotateX(Math.PI / 2), M.neg, mat4(0, 0, -0.1 + i * 0.07));
    g.add(cilZ(0.022, 0.5, 8), M.neg, mat4(0, 0, 0.62)); g.add(cilZ(0.04, 0.1, 8), M.neg, mat4(0, 0, 0.45));
    g.add(caja(0.12, 0.14, 0.2, 0.03), M.neg, mat4(0, 0.0, -0.25)); g.add(cilZ(0.02, 0.2, 6), M.neg, mat4(-0.09, 0, -0.35));
    g.add(caja(0.14, 0.14, 0.14, 0.02), M.hierro, mat4(0.16, -0.03, -0.1)); g.add(caja(0.015, 0.2, 0.3, 0.005, 1), M.pinturaO, mat4(0, 0.0, 0.3 + 0.2));
    g.volcar(retro); }
  const boca = new THREE.Object3D(); boca.position.set(0, 0, 0.92); retro.add(boca);
  const asiento = new THREE.Object3D(); asiento.position.set(0, 1.2, -0.1); chasis.add(asiento);
  return {
    grupo, chasis, ruedas, asiento, arma: { yaw, boca, retroceso: retro },
    faros: [{ x: -0.6, y: 1.13, z: 2.3 }, { x: 0.6, y: 1.13, z: 2.3 }], escapes: [{ x: -1.1, y: 0.9, z: -2.0 }],
    humoAveria: { x: 0, y: 1.5, z: 1.4 },
    restos() { restosMetal(this); },
  };
}
