// Aerodeslizador de la Era Sintética: casco lacado, faldón flexible, cúpula con piloto visible, propulsores luminosos y cañón de pulsos.
import { THREE, Acum, loft, caja, cilX, cilZ, tubo, torno, esfera, barra, lib, est, cristal, mat4, base, restosMetal } from './comun.js';
import { cil } from '../geo.js';

export function crearAerodeslizador() {
  const { grupo, chasis } = base();
  const flot = new THREE.Group(); flot.position.y = 0.38; chasis.add(flot);
  const M = {
    casco: lib('casco_nave', { color: 0xe9eaf2 }), oscuro: est('ad_osc', { color: 0x0b0c12, roughness: 0.3, metalness: 0.75 }),
    magenta: est('ad_mag', { color: 0xd01a8c, roughness: 0.28, metalness: 0.55, emissive: 0x60104a, emissiveIntensity: 0.5 }),
    cian: est('ad_cian', { color: 0x001a24, emissive: 0x2ae6ff, emissiveIntensity: 3.4, roughness: 0.3 }),
    magE: est('ad_magE', { color: 0x240016, emissive: 0xff2fb5, emissiveIntensity: 3, roughness: 0.3 }),
    cristal: cristal(0x203040), goma: est('ad_faldon', { color: 0x15161c, roughness: 0.85, metalness: 0.1 }), cromo: lib('cromo'),
    suelo: est('ad_suelo', { color: 0x000000, emissive: 0x24d8ff, emissiveIntensity: 1.4, transparent: true, opacity: 0.32, depthWrite: false }),
  };
  const a = new Acum();
  const hull = loft([
    { z: -2.2, w: 0.7, yb: 0.2, yt: 0.78, e: 3, eb: 3 },
    { z: -1.7, w: 1.05, yb: 0.12, yt: 0.95, e: 3, eb: 4 },
    { z: -0.6, w: 1.18, yb: 0.08, yt: 1.0, e: 3, eb: 4 },
    { z: 0.7, w: 1.05, yb: 0.1, yt: 0.82, e: 3, eb: 4 },
    { z: 1.6, w: 0.7, yb: 0.2, yt: 0.62, e: 3, eb: 3 },
    { z: 2.25, w: 0.3, yb: 0.28, yt: 0.46, e: 2.6, eb: 3 },
  ], { aro: 40, pasos: 10 });
  a.add(hull, M.casco);
  // carenado superior magenta y franjas luminosas
  a.add(loft([{ z: -1.9, w: 0.55, yb: 0.75, yt: 0.92, e: 3 }, { z: -0.6, w: 0.9, yb: 0.92, yt: 1.08, e: 3 }, { z: 0.6, w: 0.6, yb: 0.8, yt: 0.9, e: 3 }], { aro: 20, pasos: 6 }), M.magenta);
  for (const s of [-1, 1]) {
    a.add(loft([{ z: -1.4, w: 0.015, yb: 0.55, yt: 0.6, e: 3, cx: s * 1.16 }, { z: 0, w: 0.015, yb: 0.52, yt: 0.57, e: 3, cx: s * 1.185 }, { z: 1.2, w: 0.015, yb: 0.45, yt: 0.5, e: 3, cx: s * 1.05 }], { aro: 8, pasos: 6 }), M.cian);
    // aletas laterales y estabilizadores
    a.add(caja(0.05, 0.6, 0.9, 0.02), M.magenta, mat4(s * 0.85, 1.15, -1.9, 0, 0, s * 0.18));
    a.add(caja(0.35, 0.05, 0.5, 0.02), M.oscuro, mat4(s * 1.2, 0.62, 0.3, 0, s * 0.2, 0));
    a.add(caja(0.12, 0.12, 0.3, 0.04), M.oscuro, mat4(s * 0.55, 0.78, 1.3));
    a.add(cilZ(0.03, 0.14, 8), M.cian, mat4(s * 0.55, 0.78, 1.46));
  }
  // morro: sensor y luces frontales
  a.add(caja(0.5, 0.05, 0.05, 0.02), M.cian, mat4(0, 0.5, 2.0));
  for (const s of [-1, 1]) a.add(caja(0.2, 0.05, 0.1, 0.02), est('ad_faro', { color: 0xffffff, emissive: 0xbff4ff, emissiveIntensity: 4 }), mat4(s * 0.4, 0.58, 1.6, 0, s * 0.3, 0));
  // cabina: tina del piloto y cúpula de cristal
  a.add(loft([{ z: -0.95, w: 0.46, yb: 0.85, yt: 1.0, e: 3 }, { z: -0.4, w: 0.5, yb: 0.85, yt: 1.12, e: 3 }, { z: 0.35, w: 0.42, yb: 0.85, yt: 1.02, e: 3 }], { aro: 24, pasos: 6 }), M.oscuro);
  a.add(caja(0.5, 0.1, 0.45, 0.04), M.magenta, mat4(0, 0.95, -0.62)); a.add(caja(0.5, 0.45, 0.1, 0.04), M.magenta, mat4(0, 1.2, -0.88, -0.2, 0, 0));
  a.add(caja(0.5, 0.12, 0.3, 0.04), M.oscuro, mat4(0, 1.1, 0.12)); a.add(caja(0.34, 0.01, 0.2, 0.004, 1), M.cian, mat4(0, 1.17, 0.12, -0.2, 0, 0));
  // faldón flexible y base
  a.add(torno([[1.12, 0.0], [1.2, 0.0], [1.22, 0.38], [1.15, 0.42], [1.1, 0.2]], 32).scale(1, 1, 2.0 / 1.2 * 1.0).translate(0, 0, 0.0), M.goma, mat4(0, -0.38, 0.0));
  a.volcar(flot);
  // luz bajo el casco (halo de la sustentación)
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), M.suelo); halo.rotation.x = -Math.PI / 2; halo.scale.set(0.8, 1.45, 1); halo.position.y = -0.34; flot.add(halo);
  // cúpula transparente
  const cup = new Acum(); cup.add(loft([{ z: -0.5, w: 0.5, yb: 0.95, yt: 1.12, e: 2.4 }, { z: -0.1, w: 0.5, yb: 0.95, yt: 1.52, e: 2.2 }, { z: 0.35, w: 0.4, yb: 0.95, yt: 1.3, e: 2.2 }, { z: 0.7, w: 0.2, yb: 0.95, yt: 1.02, e: 2.2 }], { aro: 28, pasos: 8 }), M.cristal); cup.volcar(flot);
  // propulsores traseros: aros, rotores y toberas luminosas
  const rotores = [];
  for (const s of [-1, 1]) {
    const g = new Acum();
    g.add(torno([[0.4, -0.3], [0.44, -0.28], [0.44, 0.3], [0.4, 0.34], [0.36, 0.3], [0.36, -0.28]], 24).rotateX(Math.PI / 2), M.oscuro);
    g.add(torno([[0.46, 0.25], [0.5, 0.25], [0.5, 0.32], [0.46, 0.32]], 24).rotateX(Math.PI / 2), M.cian);
    g.add(cilZ(0.34, 0.03, 24), M.cian, mat4(0, 0, 0.36));
    const tob = new THREE.Group(); tob.position.set(s * 0.72, 0.62, -1.95); flot.add(tob);
    g.volcar(tob);
    const rot = new THREE.Group(); rot.position.set(0, 0, 0.0); tob.add(rot);
    const r = new Acum();
    for (let i = 0; i < 9; i++) r.add(caja(0.03, 0.34, 0.05, 0.01, 1), M.cromo, mat4(0, 0, 0, 0, 0, (i / 9) * 6.283).multiply(mat4(0, 0.18, 0, 0.25, 0, 0)));
    r.add(esfera(0.07, 8, 6), M.cromo); r.volcar(rot); rotores.push(rot);
  }
  const asiento = new THREE.Object3D(); asiento.position.set(0, 1.0, -0.45); flot.add(asiento);
  // cañón de pulsos giratorio sobre el morro
  const yaw = new THREE.Group(); yaw.position.set(0, 0.95, 1.0); flot.add(yaw);
  { const g = new Acum(); g.add(torno([[0.001, 0], [0.2, 0], [0.22, 0.05], [0.001, 0.05]], 18), M.oscuro); g.add(caja(0.26, 0.2, 0.34, 0.05), M.magenta, mat4(0, 0.17, 0)); g.volcar(yaw); }
  const retro = new THREE.Group(); retro.position.set(0, 0.2, 0.1); yaw.add(retro);
  { const g = new Acum(); g.add(cilZ(0.05, 0.7, 12), M.oscuro, mat4(0, 0, 0.35)); g.add(cilZ(0.07, 0.12, 12), M.cian, mat4(0, 0, 0.62)); g.add(cilZ(0.075, 0.26, 12), M.oscuro, mat4(0, 0, 0.1)); g.volcar(retro); }
  const boca = new THREE.Object3D(); boca.position.set(0, 0, 0.8); retro.add(boca);
  const faldon = flot;
  const ruedas = [[0.9, 1.4], [-0.9, 1.4], [0.9, -1.5], [-0.9, -1.5]].map(([x, z]) => ({ giro: null, virar: null, radio: 0, x, y: 0, z, delantera: z > 0 }));
  return {
    grupo, chasis, ruedas, asiento, arma: { yaw, boca, retroceso: retro },
    faros: [{ x: -0.4, y: 0.58, z: 1.6 }, { x: 0.4, y: 0.58, z: 1.6 }], escapes: [],
    humoAveria: { x: 0, y: 1.0, z: 0.6 },
    anim(dt, E) {
      for (const r of rotores) r.rotation.z += dt * (12 + Math.abs(E.vel) * 1.5);
      halo.material.opacity = 0.28 + Math.sin(E.t * 5) * 0.04;
      flot.position.y = 0.38 + Math.sin(E.t * 1.9) * 0.03;
      flot.rotation.x = Math.sin(E.t * 1.3) * 0.012;
      void faldon;
    },
    restos() { halo.visible = false; restosMetal(this); },
  };
}
