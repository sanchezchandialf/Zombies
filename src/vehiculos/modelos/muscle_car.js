// Muscle car de la Era Atómica (años 50-90): cupé fastback, franjas blancas, cromo y un motor sobrealimentado asomando por el capó.
import { THREE, Acum, loft, caja, cilX, cilZ, tubo, torno, esfera, barra, lib, est, cristal, faroMat, luzRoja, mat4, abrirArcos, franja, base, faroRedondo, placa } from './comun.js';
import { montarRueda } from './ruedas.js';
import { quemado } from '../mats.js';

export function crearMuscleCar() {
  const { grupo, chasis } = base();
  const M = {
    pintura: lib('acero_pintado', { color: 0x12b5c2, desgaste: 0.15 }),
    blanco: est('mc_blanco', { color: 0xf1f0ea, roughness: 0.35, metalness: 0.3, envMapIntensity: 1.2 }),
    cromo: lib('cromo'), hierro: lib('hierro_forjado'), negro: est('mc_negro', { color: 0x101114, roughness: 0.55, metalness: 0.3 }),
    cristal: cristal(0x15222a), faro: faroMat(0xfff2d0, 3.4), luzRoja: luzRoja(2.4), goma: est('mc_goma', { color: 0x1a1a1a, roughness: 0.8 }),
    cuero: lib('cuero', { color: 0x7a1d22 }), laton: lib('laton_bronce'),
  };
  const a = new Acum();
  // ───── carrocería inferior ─────
  const EB = [
    { z: -2.45, w: 0.78, yb: 0.40, yt: 0.92, e: 3.2, eb: 3 },
    { z: -2.32, w: 0.90, yb: 0.33, yt: 1.02, e: 3.4, eb: 4 },
    { z: -1.85, w: 0.975, yb: 0.28, yt: 1.09, e: 3.8, eb: 5 },
    { z: -1.0, w: 0.98, yb: 0.27, yt: 1.045, e: 4, eb: 6 },
    { z: 0.1, w: 0.985, yb: 0.27, yt: 1.02, e: 4, eb: 6 },
    { z: 1.1, w: 0.985, yb: 0.28, yt: 0.99, e: 4, eb: 6 },
    { z: 1.8, w: 0.96, yb: 0.30, yt: 0.93, e: 3.8, eb: 5 },
    { z: 2.25, w: 0.88, yb: 0.34, yt: 0.82, e: 3.4, eb: 4 },
    { z: 2.46, w: 0.74, yb: 0.40, yt: 0.64, e: 3, eb: 3 },
  ];
  const cuerpo = loft(EB, { aro: 56, pasos: 14 });
  abrirArcos(cuerpo, [
    { z: 1.5, y: 0.37, r: 0.47, xin: 0.60, blend: 0.1 }, { z: -1.5, y: 0.38, r: 0.49, xin: 0.60, blend: 0.1 },
  ]);
  a.add(cuerpo, M.pintura);
  // faldones oscuros y bajos
  a.add(loft([{ z: -2.3, w: 0.86, yb: 0.22, yt: 0.36, e: 3 }, { z: 0, w: 0.9, yb: 0.2, yt: 0.34, e: 3 }, { z: 2.3, w: 0.84, yb: 0.22, yt: 0.36, e: 3 }], { aro: 16, pasos: 6 }), M.negro);
  // cabina (techo pintado) y cristales
  const EC = [
    { z: 0.95, w: 0.80, yb: 0.99, yt: 1.04, e: 3 },
    { z: 0.55, w: 0.77, yb: 0.99, yt: 1.34, e: 3.4 },
    { z: -0.2, w: 0.75, yb: 0.99, yt: 1.45, e: 4 },
    { z: -0.95, w: 0.75, yb: 0.99, yt: 1.41, e: 4 },
    { z: -1.5, w: 0.79, yb: 0.99, yt: 1.2, e: 3.4 },
    { z: -2.0, w: 0.84, yb: 0.99, yt: 1.08, e: 3 },
  ];
  a.add(loft(EC, { aro: 40, pasos: 10 }), M.pintura);
  const EG = [
    { z: 0.78, w: 0.79, yb: 1.0, yt: 1.12, e: 3.2 },
    { z: 0.50, w: 0.785, yb: 1.0, yt: 1.30, e: 3.4 },
    { z: -0.2, w: 0.765, yb: 1.0, yt: 1.40, e: 4 },
    { z: -0.9, w: 0.765, yb: 1.0, yt: 1.36, e: 4 },
    { z: -1.35, w: 0.8, yb: 1.0, yt: 1.2, e: 3.4 },
  ];
  a.add(loft(EG, { aro: 40, pasos: 10 }), M.cristal);
  // franjas de carrera blancas (capó, techo, maletero)
  for (const cx of [-0.2, 0.2]) {
    a.add(loft(franja(EB.filter((s) => s.z > 1.0 || s.z < -1.8 ? true : false).filter((s) => s.z > 1.1), cx, 0.085, 0.01, 0.04), { aro: 12, pasos: 8 }), M.blanco);
    a.add(loft(franja(EC.filter((s) => s.z < 0.6 && s.z > -1.6), cx, 0.085, 0.01, 0.04), { aro: 12, pasos: 8 }), M.blanco);
    a.add(loft(franja(EB.filter((s) => s.z < -1.0), cx, 0.085, 0.01, 0.04), { aro: 12, pasos: 8 }), M.blanco);
  }
  // ───── cromo y detalles ─────
  // paragolpes delantero y trasero
  for (const [z, sg] of [[2.43, 1], [-2.43, -1]]) {
    a.add(tubo([[-0.9, 0.46, z - sg * 0.06], [-0.55, 0.43, z + sg * 0.03], [0, 0.42, z + sg * 0.06], [0.55, 0.43, z + sg * 0.03], [0.9, 0.46, z - sg * 0.06]], 0.045, 24, 8), M.cromo);
    for (const x of [-0.62, 0.62]) a.add(esfera(0.055, 10, 8), M.cromo, mat4(x, 0.43, z + sg * 0.1));
  }
  // parrilla: marco, fondo y lamas
  a.add(caja(0.98, 0.17, 0.06, 0.02), M.cromo, mat4(0, 0.58, 2.41));
  a.add(caja(0.92, 0.13, 0.04, 0.01, 1), M.negro, mat4(0, 0.58, 2.43));
  for (let i = -5; i <= 5; i++) a.add(caja(0.012, 0.12, 0.03, 0.004, 1), M.cromo, mat4(i * 0.083, 0.58, 2.45));
  a.add(caja(0.9, 0.012, 0.035, 0.004, 1), M.cromo, mat4(0, 0.58, 2.45));
  // faros y luces traseras
  for (const x of [-0.62, 0.62]) {
    faroRedondo(a, M, x, 0.74, 2.30, 0.125);
    a.add(caja(0.2, 0.06, 0.03, 0.01, 1), est('mc_intermitente', { color: 0xffb030, emissive: 0xff8a10, emissiveIntensity: 0.7, roughness: 0.3 }), mat4(x, 0.52, 2.43));
  }
  a.add(caja(1.5, 0.09, 0.03, 0.012), M.luzRoja, mat4(0, 0.86, -2.44));
  for (const x of [-0.78, 0.78]) a.add(caja(0.18, 0.12, 0.03, 0.012), M.luzRoja, mat4(x, 0.86, -2.4, 0, x > 0 ? 0.35 : -0.35, 0));
  a.add(caja(1.2, 0.05, 0.02, 0.01, 1), M.cromo, mat4(0, 0.7, -2.44));
  placa(a, M, 0, 0.62, -2.465, Math.PI);
  placa(a, M, 0, 0.5, 2.44, 0, 0.3, 0.15);
  // capó: bulto del motor sobrealimentado asomando por la abertura
  a.add(caja(0.62, 0.05, 0.9, 0.02), M.negro, mat4(0, 1.0, 1.35));
  a.add(caja(0.5, 0.1, 0.62, 0.03), M.cromo, mat4(0, 1.08, 1.32));
  a.add(torno([[0.001, 0.2], [0.14, 0.19], [0.2, 0.12], [0.21, 0.0], [0.001, -0.001]], 24), M.cromo, mat4(0, 1.12, 1.35));      // cámara del compresor
  a.add(caja(0.34, 0.16, 0.5, 0.05), M.negro, mat4(0, 1.3, 1.35));
  a.add(caja(0.12, 0.2, 0.52, 0.04), M.cromo, mat4(0, 1.38, 1.35));
  a.add(torno([[0.001, 0.13], [0.15, 0.12], [0.17, 0.0], [0.001, 0.0]], 20), M.negro, mat4(0, 1.4, 1.6));                         // toma de aire
  for (const x of [-0.21, -0.07, 0.07, 0.21]) { a.add(cilZ(0.028, 0.2, 10), M.cromo, mat4(x, 1.12, 1.05)); a.add(cil2(0.04, 0.09), M.cromo, mat4(x, 1.16, 1.65)); }
  for (const x of [-0.25, 0.25]) { a.add(esfera(0.06, 10, 8), M.hierro, mat4(x, 1.07, 0.98)); }
  // retrovisores
  for (const s of [-1, 1]) {
    a.add(barra([s * 0.8, 1.05, 0.62], [s * 0.96, 1.12, 0.62], 0.014, 0.014, 6), M.cromo);
    a.add(caja(0.05, 0.1, 0.14, 0.02), M.cromo, mat4(s * 0.98, 1.14, 0.62));
  }
  // manetas, juntas de las puertas, tomas de aire laterales
  for (const s of [-1, 1]) {
    a.add(caja(0.012, 0.012, 0.16, 0.004, 1), M.cromo, mat4(s * 0.99, 0.94, 0.0));
    a.add(caja(0.012, 0.012, 0.16, 0.004, 1), M.cromo, mat4(s * 0.99, 0.94, -1.12));
    for (const z of [0.78, -0.45, -1.7]) a.add(caja(0.008, 0.5, 0.01, 0.002, 1), M.negro, mat4(s * 0.985, 0.7, z));
    a.add(caja(0.01, 0.07, 0.34, 0.01, 1), M.negro, mat4(s * 0.985, 0.78, -1.88));
    a.add(tubo([[s * 0.86, 0.3, 1.0], [s * 0.88, 0.28, 0.0], [s * 0.88, 0.29, -1.0]], 0.045, 12, 8), M.cromo);           // escapes laterales
    a.add(cilZ(0.05, 0.1, 10), M.negro, mat4(s * 0.88, 0.285, -1.05));
  }
  // alerón trasero discreto
  a.add(caja(1.3, 0.025, 0.2, 0.01), M.pintura, mat4(0, 1.12, -2.28));
  for (const s of [-1, 1]) a.add(caja(0.03, 0.08, 0.12, 0.01, 1), M.pintura, mat4(s * 0.52, 1.07, -2.26));
  // escapes traseros dobles
  for (const x of [-0.45, 0.45]) { a.add(cilZ(0.06, 0.16, 12), M.cromo, mat4(x, 0.36, -2.4)); a.add(cilZ(0.045, 0.17, 12), M.negro, mat4(x, 0.36, -2.4)); }
  // interior: asientos de cuero visibles, volante y salpicadero
  a.add(caja(0.8, 0.07, 0.35, 0.03), M.negro, mat4(0, 1.02, 0.65));
  for (const x of [-0.3, 0.3]) { a.add(caja(0.42, 0.1, 0.46, 0.04), M.cuero, mat4(x, 1.04, -0.15)); a.add(caja(0.4, 0.5, 0.1, 0.04), M.cuero, mat4(x, 1.28, -0.38, -0.25, 0, 0)); }
  a.add(caja(0.9, 0.2, 0.2, 0.04), M.cuero, mat4(0, 1.04, -1.05));
  // chasis inferior y diferenciales
  a.add(caja(1.0, 0.1, 3.2, 0.03), M.hierro, mat4(0, 0.25, 0));
  a.add(cilX(0.07, 1.5, 10), M.hierro, mat4(0, 0.37, -1.5));
  a.add(esfera(0.17, 10, 8), M.hierro, mat4(0, 0.37, -1.5));
  a.add(cilX(0.045, 1.4, 8), M.hierro, mat4(0, 0.37, 1.5));
  a.volcar(chasis);

  // pasos de rueda oscuros (visibles tras los arcos)
  const pozos = new Acum();
  for (const [z, r] of [[1.5, 0.45], [-1.5, 0.47]]) for (const s of [-1, 1]) pozos.add(cilX(r, 0.02, 22), M.negro, mat4(s * 0.605, 0.37, z));
  pozos.volcar(chasis);

  // ruedas
  const ruedas = [];
  for (const [z, d, R, w] of [[1.5, true, 0.355, 0.24], [-1.5, false, 0.375, 0.32]]) for (const s of [-1, 1]) {
    ruedas.push(montarRueda(chasis, 'mag', { R, ancho: w, x: s * (0.86 - (w - 0.24) * 0.15), z, direccion: d, M }));
  }
  // lámpara delantera (para las luces de ambiente se sigue `faros`)
  return {
    grupo, chasis, ruedas,
    faros: [{ x: -0.62, y: 0.74, z: 2.3 }, { x: 0.62, y: 0.74, z: 2.3 }],
    escapes: [{ x: -0.45, y: 0.36, z: -2.55 }, { x: 0.45, y: 0.36, z: -2.55 }],
    humoAveria: { x: 0, y: 1.1, z: 1.4 },
    restos(v) { destruirModelo(this); },
  };
}
const cil2 = (r, h) => cilZ(r, h, 10);
function destruirModelo(m) {
  m.chasis.traverse((o) => { if (o.isMesh) { if (o.material.transparent) o.visible = false; else o.material = quemado(); } });
  m.chasis.rotation.z = 0.05; m.chasis.position.y = -0.04;
  m.ruedas.forEach((r, i) => { if (i === 1) r.virar.rotation.z = 0.0; });
}
