// Locomóvil: tractor de vapor de la Era del Vapor. Caldera con bandas de latón, chimenea humeante, volante que gira y ruedas de hierro.
import { THREE, Acum, loft, caja, cilX, cilZ, tubo, torno, esfera, barra, lib, est, faroMat, mat4, base, restosMetal } from './comun.js';
import { montarRueda } from './ruedas.js';
import { cil, T } from '../geo.js';

export function crearLocomovil() {
  const { grupo, chasis } = base();
  const M = {
    caldera: lib('acero_pintado', { color: 0x1f5a45, desgaste: 0.35 }), roja: lib('acero_pintado', { color: 0x8c2a1c, desgaste: 0.4 }),
    hierro: lib('hierro_forjado'), herrumbre: lib('hierro_oxidado'), laton: lib('laton_bronce'), madera: lib('tablas_viejas'),
    cuero: lib('cuero', { color: 0x4a2a16 }), faro: faroMat(0xffc875, 3), carbon: est('carbon', { color: 0x0a0a0b, roughness: 0.6, metalness: 0.2 }),
    cristal: est('vidrio_loco', { color: 0xaed8dc, roughness: 0.05, transparent: true, opacity: 0.55 }),
  };
  const a = new Acum();
  // bastidor y plataforma
  a.add(caja(1.5, 0.22, 4.9, 0.04), M.hierro, mat4(0, 0.85, 0));
  for (const s of [-1, 1]) a.add(caja(0.12, 0.3, 4.9, 0.03), M.hierro, mat4(s * 0.68, 0.8, 0));
  a.add(caja(2.0, 0.07, 2.2, 0.02), M.madera, mat4(0, 1.0, -1.4));
  // caldera: cilindro con envuelta, bandas de latón y remaches
  a.add(torno([[0.001, -1.65], [0.6, -1.65], [0.62, -1.55], [0.62, 1.4], [0.6, 1.5], [0.001, 1.5]], 36).rotateX(Math.PI / 2), M.caldera, mat4(0, 1.85, 0.7));
  a.add(torno([[0.001, 0], [0.66, 0], [0.68, 0.1], [0.68, 0.55], [0.64, 0.62], [0.001, 0.62]], 36).rotateX(Math.PI / 2), M.hierro, mat4(0, 1.85, 2.1));   // caja de humos
  a.add(torno([[0.0, 0], [0.55, 0], [0.55, 0.05], [0.0, 0.06]], 28).rotateX(Math.PI / 2), M.laton, mat4(0, 1.85, 2.74));                              // puerta
  a.add(esfera(0.07, 10, 8), M.laton, mat4(0, 1.85, 2.78));
  for (let i = 0; i < 10; i++) { const an = (i / 10) * 6.283; a.add(esfera(0.02, 6, 5), M.hierro, mat4(Math.cos(an) * 0.5, 1.85 + Math.sin(an) * 0.5, 2.77)); }
  for (const z of [-0.55, 0.2, 0.95, 1.7]) a.add(torno([[0.625, -0.05], [0.66, -0.05], [0.66, 0.05], [0.625, 0.05]], 36).rotateX(Math.PI / 2), M.laton, mat4(0, 1.85, z));
  for (const z of [-0.55, 0.2, 0.95, 1.7]) for (let i = 0; i < 18; i++) { const an = (i / 18) * 6.283; a.add(esfera(0.017, 5, 4), M.laton, mat4(Math.cos(an) * 0.665, 1.85 + Math.sin(an) * 0.665, z)); }
  // cúpula de vapor, válvulas, silbato
  a.add(torno([[0.001, 0.38], [0.2, 0.34], [0.3, 0.2], [0.31, 0.0], [0.001, 0.0]], 24), M.laton, mat4(0, 2.4, 0.4));
  a.add(torno([[0.001, 0], [0.34, 0], [0.34, 0.06], [0.001, 0.06]], 24), M.hierro, mat4(0, 2.45, 0.4));
  a.add(cil(0.025, 0.04, 0.3, 8), M.laton, mat4(0.3, 2.55, 0.9)); a.add(esfera(0.05, 8, 6), M.laton, mat4(0.3, 2.72, 0.9));
  a.add(cil(0.03, 0.03, 0.3, 8), M.laton, mat4(-0.1, 2.66, 0.85)); a.add(cil(0.05, 0.05, 0.1, 8), M.laton, mat4(-0.1, 2.85, 0.85));
  // chimenea ahusada con embocadura acampanada
  a.add(torno([[0.001, 0], [0.28, 0], [0.22, 0.4], [0.18, 1.2], [0.2, 1.55], [0.3, 1.7], [0.31, 1.78], [0.24, 1.78], [0.001, 1.74]], 24), M.hierro, mat4(0, 2.4, 2.1));
  a.add(torno([[0.2, 0.8], [0.22, 0.8], [0.22, 0.9], [0.2, 0.9]], 24), M.laton, mat4(0, 2.4, 2.1));
  // cilindros de vapor y bielas
  for (const s of [-1, 1]) {
    a.add(cilZ(0.14, 0.9, 16), M.hierro, mat4(s * 0.82, 1.35, 1.5));
    a.add(cilZ(0.16, 0.06, 16), M.laton, mat4(s * 0.82, 1.35, 1.99)); a.add(cilZ(0.16, 0.06, 16), M.laton, mat4(s * 0.82, 1.35, 1.01));
    a.add(caja(0.15, 0.2, 0.7, 0.03), M.hierro, mat4(s * 0.82, 1.55, 1.5));
    a.add(barra([s * 0.7, 1.35, 1.0], [s * 0.7, 1.62, 0.3], 0.025, 0.025, 8), M.laton);
  }
  // cabina trasera: techo con aleros, columnas, asiento, volante
  for (const x of [-0.95, 0.95]) for (const z of [-2.35, -0.55]) a.add(caja(0.1, 1.9, 0.1, 0.02), M.hierro, mat4(x, 2.0, z));
  a.add(caja(2.3, 0.1, 2.2, 0.03), M.roja, mat4(0, 3.0, -1.45));
  a.add(caja(2.4, 0.05, 2.3, 0.02), M.hierro, mat4(0, 3.07, -1.45));
  a.add(caja(1.9, 1.6, 0.1, 0.03), M.caldera, mat4(0, 2.0, -2.4));
  a.add(caja(0.9, 0.08, 0.55, 0.03), M.cuero, mat4(0, 1.35, -1.6)); a.add(caja(0.9, 0.5, 0.1, 0.03), M.cuero, mat4(0, 1.62, -1.9, -0.15, 0, 0));
  a.add(cil(0.04, 0.05, 0.9, 8), M.hierro, mat4(0, 1.5, -0.55, 0.7, 0, 0));
  // caja de fuego y carbonera
  a.add(caja(1.5, 0.9, 0.9, 0.06), M.caldera, mat4(0, 1.6, -1.0));
  a.add(caja(0.5, 0.35, 0.05, 0.02), M.hierro, mat4(0, 1.45, -0.54)); a.add(caja(0.34, 0.22, 0.03, 0.01), est('fuegoh', { color: 0x331100, emissive: 0xff6a10, emissiveIntensity: 2.2 }), mat4(0, 1.45, -0.52));
  a.add(caja(1.1, 0.5, 0.8, 0.04), M.hierro, mat4(-0.95, 1.4, -2.0)); for (let i = 0; i < 14; i++) a.add(esfera(0.07 + (i % 3) * 0.02, 6, 5), M.carbon, mat4(-0.95 + ((i * 37) % 10 - 5) * 0.04, 1.7 + (i % 4) * 0.02, -2.0 + ((i * 53) % 10 - 5) * 0.06));
  a.add(torno([[0.0, 0], [0.34, 0], [0.34, 0.65], [0.3, 0.7], [0.0, 0.7]], 16), M.madera, mat4(0.95, 1.04, -2.0));       // barril de agua
  for (const y of [0.15, 0.55]) a.add(torno([[0.33, 0], [0.36, 0], [0.36, 0.05], [0.33, 0.05]], 16), M.hierro, mat4(0.95, 1.04 + y, -2.0));
  // ariete delantero (para arrollar) y faroles
  a.add(loft([{ z: 2.75, w: 0.1, yb: 0.55, yt: 0.8, e: 3 }, { z: 3.0, w: 0.5, yb: 0.35, yt: 0.95, e: 3 }, { z: 3.25, w: 0.95, yb: 0.2, yt: 0.85, e: 3 }, { z: 3.3, w: 1.0, yb: 0.2, yt: 0.8, e: 3 }].map((s) => ({ ...s, z: s.z - 0.55 })), { aro: 16, pasos: 4 }), M.hierro);
  for (let i = -3; i <= 3; i++) a.add(cil(0.03, 0.012, 0.35, 6), M.hierro, mat4(i * 0.3, 0.55, 2.8, Math.PI / 2, 0, 0));
  for (const s of [-1, 1]) { a.add(cil(0.12, 0.12, 0.16, 12), M.laton, mat4(s * 0.45, 2.7, 2.35, Math.PI / 2, 0, 0)); a.add(cilZ(0.1, 0.04, 12), M.faro, mat4(s * 0.45, 2.7, 2.45)); }
  a.add(caja(1.3, 0.1, 0.5, 0.03), M.hierro, mat4(0, 1.12, 2.75));
  // guardabarros trasero sobre las ruedas grandes
  for (const s of [-1, 1]) a.add(caja(0.8, 0.07, 2.0, 0.03), M.roja, mat4(s * 1.1, 2.05, -1.05));
  a.volcar(chasis);
  // ruedas
  const ruedas = [];
  for (const s of [-1, 1]) ruedas.push(montarRueda(chasis, 'hierro', { R: 0.62, ancho: 0.4, x: s * 0.98, z: 1.75, direccion: true, M }));
  for (const s of [-1, 1]) ruedas.push(montarRueda(chasis, 'hierro', { R: 1.0, ancho: 0.55, x: s * 1.05, z: -1.1, direccion: false, M }));
  // volante (rueda de dirección, gira con el giro)
  const volante = new THREE.Group(); volante.position.set(0, 1.9, -0.2); volante.rotation.x = -0.9; chasis.add(volante);
  { const v = new Acum(); v.add(torno([[0.2, -0.015], [0.23, -0.015], [0.23, 0.015], [0.2, 0.015]], 24).rotateX(Math.PI / 2), M.madera);
    for (let i = 0; i < 4; i++) v.add(caja(0.4, 0.025, 0.025, 0.008, 1), M.laton, mat4(0, 0, 0, 0, 0, (i / 4) * Math.PI)); v.add(esfera(0.04, 8, 6), M.laton); v.volcar(volante); }
  // volante de inercia: gira con el motor
  const inercia = new THREE.Group(); inercia.position.set(1.15, 2.1, 0.2); chasis.add(inercia);
  { const v = new Acum(); v.add(torno([[0.5, -0.04], [0.56, -0.05], [0.56, 0.05], [0.5, 0.04]], 32).rotateZ(Math.PI / 2), M.hierro);
    for (let i = 0; i < 8; i++) v.add(caja(0.05, 0.95, 0.06, 0.012, 1), M.hierro, mat4(0, 0, 0, (i / 8) * Math.PI, 0, 0));
    v.add(cilX(0.09, 0.18, 12), M.laton); v.add(cilX(0.03, 0.4, 8), M.hierro); v.volcar(inercia); }
  // biela y manivela visibles
  const biela = new THREE.Group(); biela.position.set(1.0, 2.1, 0.2); chasis.add(biela);
  { const v = new Acum(); v.add(barra([0.2, 0, 0], [0.2, 0, 1.0], 0.03, 0.03, 8), M.laton); v.add(esfera(0.05, 8, 6), M.laton, mat4(0.2, 0, 0)); v.volcar(biela); }
  const asiento = new THREE.Object3D(); asiento.position.set(0, 1.6, -1.55); chasis.add(asiento);
  return {
    grupo, chasis, ruedas, asiento, volante,
    faros: [{ x: -0.45, y: 2.7, z: 2.45 }, { x: 0.45, y: 2.7, z: 2.45 }],
    escapes: [{ x: 0, y: 4.2, z: 2.1 }],
    vapor: [{ x: -0.9, y: 1.35, z: 1.9 }, { x: 0.9, y: 1.35, z: 1.9 }],
    humoAveria: { x: 0, y: 2.2, z: 2.0 },
    anim(dt, E) {
      volante.rotation.z = -E.steer * 3.2;
      const w = (Math.abs(E.vf) * 0.9 + 1.6) * dt;
      inercia.rotation.x += w * 3;
      biela.rotation.x = Math.sin(inercia.rotation.x) * 0.1;
    },
    restos() { restosMetal(this); },
  };
}
