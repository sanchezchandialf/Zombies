// Efectos de estado persistentes (llamas, veneno, furia, escudo, aturdimiento...). Geometrías y materiales compartidos.
import * as THREE from 'three';

let G = null;
const MA = new Map();
function geo() {
  if (G) return G;
  G = {
    aro: new THREE.RingGeometry(0.52, 0.66, 40).rotateX(-Math.PI / 2),
    llama: new THREE.ConeGeometry(0.09, 0.42, 7).translate(0, 0.21, 0),
    esfera: new THREE.SphereGeometry(1, 16, 12),
    estrella: new THREE.OctahedronGeometry(0.05, 0),
    columna: new THREE.CylinderGeometry(0.5, 0.58, 2.1, 24, 1, true).translate(0, 1.05, 0),
  };
  return G;
}
function am(color, op = 0.7) {
  const k = color + ':' + op;
  let m = MA.get(k);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }); MA.set(k, m); }
  return m;
}
export function liberarAuras() { if (G) { for (const g of Object.values(G)) g.dispose(); G = null; } for (const m of MA.values()) m.dispose(); MA.clear(); }

const COL = { envenenado: 0x7cff3c, ralentizado: 0x6ab8ff, furia: 0xff4a30, escudo: 0x70e0ff, silenciado: 0xb0b0b0, aturdido: 0xffe070 };

export function crearAuras(v) {
  const g = new THREE.Group(); g.name = 'auras'; v.root.add(g);
  let activos = {};
  const obj = {};
  const llamas = [], estrellas = [], burbujas = [];
  const crear = (n) => {
    const Gg = geo();
    if (n === 'ardiendo') {
      const pts = [['pecho', 0, 0.2, 0.05], ['pecho', 0.12, 0.3, -0.1], ['pecho', -0.12, 0.1, 0.1], ['pelvis', 0, 0, 0.0], ['cabeza', 0, 0.15, 0], ['hombroD', 0, 0, 0], ['hombroI', 0, -0.1, 0], ['pelvis', 0.1, 0.1, -0.1]];
      for (const [h, x, y, z] of pts) {
        const m = new THREE.Mesh(Gg.llama, am(0xff7a1a, 0.85)); m.position.set(x, y, z); v.H[h].add(m);
        const m2 = new THREE.Mesh(Gg.llama, am(0xffe070, 0.8)); m2.scale.setScalar(0.55); m2.position.set(x, y, z); v.H[h].add(m2);
        llamas.push(m, m2);
      }
      return llamas;
    }
    if (n === 'aturdido') { for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(Gg.estrella, am(COL.aturdido, 0.95)); g.add(m); estrellas.push(m); } return estrellas; }
    if (n === 'escudo') { const m = new THREE.Mesh(Gg.esfera, am(COL.escudo, 0.16)); m.scale.set(0.85, 1.1, 0.85); m.position.y = 0.95; g.add(m); return [m]; }
    if (n === 'furia') { const m = new THREE.Mesh(Gg.columna, am(COL.furia, 0.22)); g.add(m); const r = new THREE.Mesh(Gg.aro, am(COL.furia, 0.6)); r.position.y = 0.04; g.add(r); return [m, r]; }
    const r = new THREE.Mesh(Gg.aro, am(COL[n] ?? 0xffffff, 0.55)); r.position.y = 0.04; g.add(r);
    const l = [r];
    if (n === 'envenenado') for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(Gg.esfera, am(COL.envenenado, 0.8)); b.scale.setScalar(0.035); g.add(b); burbujas.push(b); l.push(b); }
    return l;
  };
  return {
    estado(n, on) {
      if (!(n in COL) && n !== 'ardiendo' && n !== 'potenciado') return;
      if (n === 'potenciado') n = 'furia';
      if (on && !obj[n]) obj[n] = crear(n);
      if (obj[n]) for (const m of obj[n]) m.visible = on;
      activos[n] = on;
    },
    todo(on) { for (const n of Object.keys(obj)) { for (const m of obj[n]) m.visible = on; activos[n] = on; } },
    actualizar(dt, t) {
      if (activos.ardiendo) llamas.forEach((m, i) => { const f = 0.75 + 0.45 * Math.sin(t * 14 + i * 2.3) * Math.sin(t * 9 + i); m.scale.set(0.8 + 0.3 * Math.sin(t * 11 + i), f * (i % 2 ? 0.55 : 1), 0.8 + 0.3 * Math.cos(t * 12 + i)); m.rotation.y = t * 3 + i; });
      if (activos.aturdido) estrellas.forEach((m, i) => { const a = t * 3 + i * 2.09; m.position.set(Math.cos(a) * 0.22, v.altura * 0.97 - 0.08, Math.sin(a) * 0.22); m.rotation.y = a * 2; m.rotation.x = a; });
      if (activos.envenenado) burbujas.forEach((b, i) => { const k = (t * 0.6 + i * 0.27) % 1; b.position.set(Math.sin(i * 2.4 + t) * 0.3, 0.2 + k * 1.5, Math.cos(i * 2.4) * 0.3); b.scale.setScalar(0.04 * (1 - k * 0.6)); });
      const f = obj.furia; if (f && activos.furia) { f[0].scale.set(1 + 0.05 * Math.sin(t * 8), 1, 1 + 0.05 * Math.sin(t * 8)); f[1].scale.setScalar(1 + 0.12 * Math.sin(t * 6)); }
      const e = obj.escudo; if (e && activos.escudo) e[0].scale.set(0.85 + 0.03 * Math.sin(t * 5), 1.1, 0.85 + 0.03 * Math.sin(t * 5));
    },
    liberar() { g.removeFromParent(); for (const l of llamas) l.removeFromParent(); },
  };
}
