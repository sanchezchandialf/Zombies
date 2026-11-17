// Granja de instancias: un InstancedMesh por (tipo de pieza × material). Cada cuadro se reescriben las matrices
// de todas las piezas visibles de todos los zombis, cadáveres y restos desmembrados (CPU) y se suben en bloque.
import * as THREE from 'three';
import { geometria, KINDS } from './geometrias.js';
import { materialesZombi } from './materiales.js';
import { GRUPO_DE_J } from './matematica.js';

export const MAT = { MATE: 0, METAL: 1, EMISIVO: 2 };
const NMAT = 3;

/** Modelo: lista plana de piezas de un zombi (compartida con sus restos). */
export class Modelo {
  constructor(cap = 80) {
    this.n = 0; this.cap = cap;
    this.mi = new Uint8Array(cap); this.joint = new Uint8Array(cap); this.pulso = new Uint8Array(cap); this.lod = new Uint8Array(cap);
    this.loc = new Float32Array(cap * 12); this.col = new Float32Array(cap * 3);
    this.grupo = new Uint8Array(cap);
  }
  crecer() {
    const c = this.cap * 2;
    const g = (A, k) => { const n = new A.constructor(c * k); n.set(A); return n; };
    this.mi = g(this.mi, 1); this.joint = g(this.joint, 1); this.pulso = g(this.pulso, 1); this.lod = g(this.lod, 1);
    this.loc = g(this.loc, 12); this.col = g(this.col, 3); this.grupo = g(this.grupo, 1); this.cap = c;
  }
  /** Añade pieza. pos, rot (Euler Y·X·Z), tam son arrays de 3. col 0xRRGGBB (o [r,g,b]). */
  anadir(kindIdx, mat, joint, px, py, pz, ex, ey, ez, col, o = null) {
    if (this.n >= this.cap) this.crecer();
    const i = this.n++;
    this.mi[i] = kindIdx * NMAT + mat; this.joint[i] = joint; this.grupo[i] = GRUPO_DE_J[joint];
    this.pulso[i] = o?.pulso || 0; this.lod[i] = o?.lod ? 1 : 0;
    const rx = o?.rx || 0, ry = o?.ry || 0, rz = o?.rz || 0;
    const cx = Math.cos(rx), sxn = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz_ = Math.sin(rz);
    const r00 = cy * cz + sy * sxn * sz_, r01 = -cy * sz_ + sy * sxn * cz, r02 = sy * cx;
    const r10 = cx * sz_, r11 = cx * cz, r12 = -sxn;
    const r20 = -sy * cz + cy * sxn * sz_, r21 = sy * sz_ + cy * sxn * cz, r22 = cy * cx;
    const b = i * 12, L = this.loc;
    L[b] = r00 * ex; L[b + 1] = r10 * ex; L[b + 2] = r20 * ex;
    L[b + 3] = r01 * ey; L[b + 4] = r11 * ey; L[b + 5] = r21 * ey;
    L[b + 6] = r02 * ez; L[b + 7] = r12 * ez; L[b + 8] = r22 * ez;
    L[b + 9] = px; L[b + 10] = py; L[b + 11] = pz;
    let r, g, bl;
    if (Array.isArray(col)) { r = col[0]; g = col[1]; bl = col[2]; }
    else { r = ((col >> 16) & 255) / 255; g = ((col >> 8) & 255) / 255; bl = (col & 255) / 255; r = r * r; g = g * g; bl = bl * bl; } // sRGB→lineal aprox.
    const k = i * 3; this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = bl;
    return i;
  }
}

export class Granja {
  constructor(escena) {
    this.escena = escena;
    this.mats = materialesZombi();
    this.meshes = new Array(KINDS.length * NMAT).fill(null);
    this.n = new Int32Array(KINDS.length * NMAT);
    this.faltan = false;
    this.grupo = new THREE.Group(); this.grupo.name = 'horda';
    escena.add(this.grupo);
  }
  _mesh(mi, cap) {
    const kind = (mi / NMAT) | 0, mat = mi % NMAT;
    const geo = geometria(KINDS[kind]).clone();
    geo.setAttribute('aFx', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.InstancedMesh(geo, [this.mats.mate, this.mats.metal, this.mats.emisivo][mat], cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.count = 0;
    m.castShadow = mat !== MAT.EMISIVO; m.receiveShadow = mat !== MAT.EMISIVO;
    m.name = `horda-${KINDS[kind]}-${mat}`;
    m.userData.cap = cap;
    this.grupo.add(m);
    return m;
  }
  inicio() { this.n.fill(0); }
  /**
   * Escribe las piezas de un modelo.
   * W/wo: matrices mundiales de articulaciones (12 floats cada una). mascara: bits de grupos ocultos.
   * fx: [brasa, carbon, destello, disolucion]; tinte: [r,g,b,amt]; t: tiempo (pulsos); nivel: 0 todo, 1 sin detalle.
   */
  escribir(m, W, wo, mascara, fx, tinte, t, nivel, semilla) {
    const n = m.n, mi = m.mi, jt = m.joint, loc = m.loc, col = m.col, grupo = m.grupo, lod = m.lod, pul = m.pulso;
    const f0 = fx[0], f1 = fx[1], f2 = fx[2], f3 = fx[3];
    const ta = tinte[3], tr = tinte[0], tg = tinte[1], tb = tinte[2];
    for (let i = 0; i < n; i++) {
      if (mascara & (1 << grupo[i])) continue;
      if (nivel && lod[i]) continue;
      const k = mi[i];
      let mesh = this.meshes[k];
      if (!mesh) { mesh = this.meshes[k] = this._mesh(k, 512); }
      const idx = this.n[k];
      if (idx >= mesh.userData.cap) { this.faltan = true; continue; }
      this.n[k] = idx + 1;
      const w = wo + jt[i] * 12, b = i * 12;
      const a0 = W[w], a1 = W[w + 1], a2 = W[w + 2], b0 = W[w + 3], b1 = W[w + 4], b2 = W[w + 5], c0 = W[w + 6], c1 = W[w + 7], c2 = W[w + 8];
      const A = mesh.instanceMatrix.array, o = idx * 16;
      let x = loc[b], y = loc[b + 1], z = loc[b + 2];
      A[o] = a0 * x + b0 * y + c0 * z; A[o + 1] = a1 * x + b1 * y + c1 * z; A[o + 2] = a2 * x + b2 * y + c2 * z; A[o + 3] = 0;
      x = loc[b + 3]; y = loc[b + 4]; z = loc[b + 5];
      A[o + 4] = a0 * x + b0 * y + c0 * z; A[o + 5] = a1 * x + b1 * y + c1 * z; A[o + 6] = a2 * x + b2 * y + c2 * z; A[o + 7] = 0;
      x = loc[b + 6]; y = loc[b + 7]; z = loc[b + 8];
      A[o + 8] = a0 * x + b0 * y + c0 * z; A[o + 9] = a1 * x + b1 * y + c1 * z; A[o + 10] = a2 * x + b2 * y + c2 * z; A[o + 11] = 0;
      x = loc[b + 9]; y = loc[b + 10]; z = loc[b + 11];
      A[o + 12] = a0 * x + b0 * y + c0 * z + W[w + 9]; A[o + 13] = a1 * x + b1 * y + c1 * z + W[w + 10]; A[o + 14] = a2 * x + b2 * y + c2 * z + W[w + 11]; A[o + 15] = 1;
      const C = mesh.instanceColor.array, q = idx * 3, s = i * 3;
      let r = col[s], g = col[s + 1], bl = col[s + 2];
      if (k % NMAT === MAT.EMISIVO) {
        const p = pul[i];
        if (p) {
          let e = 1;
          if (p === 1) e = 0.55 + 0.45 * Math.sin(t * 31 + semilla) * Math.sin(t * 17.3 + semilla * 2) + (Math.sin(t * 53 + semilla) > 0.8 ? 0.6 : 0);
          else if (p === 2) e = 0.7 + 0.45 * Math.sin(t * 3.1 + semilla + i);
          else if (p === 3) e = 0.85 + 0.15 * Math.sin(t * 7 + semilla);
          else if (p === 4) e = Math.sin(t * 9 + semilla) > -0.2 ? 1.4 : 0.15;
          r *= e; g *= e; bl *= e;
        }
      } else if (ta > 0) { r += (tr - r) * ta; g += (tg - g) * ta; bl += (tb - bl) * ta; }
      C[q] = r; C[q + 1] = g; C[q + 2] = bl;
      if (k % NMAT !== MAT.EMISIVO) {
        const F = mesh.geometry.attributes.aFx.array, h = idx * 4;
        F[h] = f0; F[h + 1] = f1; F[h + 2] = f2; F[h + 3] = f3;
      }
    }
  }
  fin() {
    for (let k = 0; k < this.meshes.length; k++) {
      const m = this.meshes[k]; if (!m) continue;
      const n = this.n[k];
      m.count = n;
      if (n === 0 && !m.userData.sucio) continue;
      m.userData.sucio = n > 0;
      const ia = m.instanceMatrix, ic = m.instanceColor, fa = m.geometry.attributes.aFx;
      for (const a of [ia, ic, fa]) { a.clearUpdateRanges?.(); a.needsUpdate = true; }
      ia.addUpdateRange(0, Math.max(1, n * 16)); ic.addUpdateRange(0, Math.max(1, n * 3)); fa.addUpdateRange(0, Math.max(1, n * 4));
      if (n > m.userData.cap * 0.92) this.faltan = true;
    }
    if (this.faltan) {
      this.faltan = false;
      for (let k = 0; k < this.meshes.length; k++) {
        const m = this.meshes[k]; if (!m || this.n[k] < m.userData.cap * 0.85) continue;
        this.grupo.remove(m); m.geometry.dispose(); m.dispose();
        this.meshes[k] = this._mesh(k, m.userData.cap * 2);
      }
    }
  }
  limpiar() {
    for (const m of this.meshes) if (m) { this.grupo.remove(m); m.geometry.dispose(); m.dispose(); }
    this.meshes.fill(null); this.escena.remove(this.grupo);
  }
}
