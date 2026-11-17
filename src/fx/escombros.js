// Escombros 3D: un único InstancedMesh (≈300 trozos) con física propia en arrays tipados:
// gravedad, rebote, rozamiento, giro por cuaterniones, asentamiento hasta apoyarse plano, reposo y desvanecido (encoge y se hunde).
// Un trozo = caja de aristas desplazadas (facetada); el material de cada trozo cambia color, rugosidad, metal y proporciones.
import * as THREE from 'three';

const MATERIALES = {
  //            color base (lineal aprox.)       rug   met   rebote  dimensiones [min,max] por eje              reposo(s) peso
  madera: { col: [0.30, 0.17, 0.075], var: 0.35, rug: 0.88, met: 0.0, reb: 0.34, dim: [[0.04, 0.09], [0.035, 0.075], [0.22, 0.6]], reposo: 9 },
  piedra: { col: [0.34, 0.32, 0.29], var: 0.3, rug: 0.96, met: 0.0, reb: 0.26, dim: [[0.1, 0.26], [0.08, 0.2], [0.1, 0.26]], reposo: 11 },
  metal: { col: [0.42, 0.43, 0.46], var: 0.3, rug: 0.38, met: 0.92, reb: 0.46, dim: [[0.12, 0.3], [0.014, 0.03], [0.1, 0.26]], reposo: 10 },
  carne: { col: [0.5, 0.025, 0.035], var: 0.4, rug: 0.32, met: 0.0, reb: 0.12, dim: [[0.1, 0.22], [0.07, 0.15], [0.1, 0.24]], reposo: 12 },
  vidrio: { col: [0.62, 0.82, 0.8], var: 0.15, rug: 0.06, met: 0.05, reb: 0.3, dim: [[0.08, 0.2], [0.008, 0.012], [0.08, 0.2]], reposo: 9 },
};
const GRAV = 17;

function geometriaTrozo() {
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
  const p = g.attributes.position;
  const h = (x, y, z) => { let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.17;
    p.setXYZ(i, x + (h(x, y, z) - 0.5) * k, y + (h(y, z, x) - 0.5) * k, z + (h(z, x, y) - 0.5) * k);
  }
  g.computeVertexNormals();
  return g;
}

export function crearEscombros(juego, escena, opciones = {}) {
  const cap = opciones.max ?? 300;
  const geo = geometriaTrozo();
  const pbr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
  geo.setAttribute('aPBR', pbr);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, flatShading: true });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aPBR; varying vec2 vPBR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPBR = aPBR;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vPBR;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vPBR.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vPBR.y;');
  };
  const malla = new THREE.InstancedMesh(geo, mat, cap);
  malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  malla.count = 0; malla.frustumCulled = false; malla.castShadow = true; malla.receiveShadow = true; malla.name = 'fx_escombros';
  malla.setColorAt(0, new THREE.Color(1, 1, 1)); // crea instanceColor
  escena.add(malla);

  const px = new Float32Array(cap), py = new Float32Array(cap), pz = new Float32Array(cap);
  const vx = new Float32Array(cap), vy = new Float32Array(cap), vz = new Float32Array(cap);
  const qx = new Float32Array(cap), qy = new Float32Array(cap), qz = new Float32Array(cap), qw = new Float32Array(cap);
  const tx = new Float32Array(cap), ty = new Float32Array(cap), tz = new Float32Array(cap), tw = new Float32Array(cap);
  const wx = new Float32Array(cap), wy = new Float32Array(cap), wz = new Float32Array(cap);
  const sx = new Float32Array(cap), sy = new Float32Array(cap), sz = new Float32Array(cap);
  const estado = new Uint8Array(cap);  // 0 libre · 1 vuelo · 2 reposo
  const tm = new Float32Array(cap), reposoMax = new Float32Array(cap), rebote = new Float32Array(cap), rebotes = new Uint8Array(cap), mat_ = new Uint8Array(cap);
  const NOMBRES = Object.keys(MATERIALES);
  let sig = 0, alto = 0;
  const rng = juego.rng ?? Math.random;

  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qt = new THREE.Quaternion(), v3 = new THREE.Vector3(), esc = new THREE.Vector3(), pos = new THREE.Vector3(), m4 = new THREE.Matrix4(), col = new THREE.Color(), ax = new THREE.Vector3();
  const ceros = new THREE.Matrix4().makeScale(0, 0, 0);
  let colorSucio = false;
  let alAterrizar = null;

  /** Lanza trozos. { x, y, z, cantidad, material, fuerza, dirX, dirZ } */
  function lanzar(o = {}) {
    const mn = o.material && MATERIALES[o.material] ? o.material : 'piedra';
    const M = MATERIALES[mn], idMat = NOMBRES.indexOf(mn);
    const n = Math.min(60, Math.max(1, Math.round(o.cantidad ?? 8)));
    const fuerza = o.fuerza ?? 5;
    const dl = Math.hypot(o.dirX ?? 0, o.dirZ ?? 0);
    const dx = dl > 0.001 ? o.dirX / dl : 0, dz = dl > 0.001 ? o.dirZ / dl : 0;
    for (let k = 0; k < n; k++) {
      const i = sig; sig = (sig + 1) % cap; if (i + 1 > alto) alto = i + 1;
      px[i] = (o.x ?? 0) + (rng() - 0.5) * 0.3; py[i] = Math.max(0.05, o.y ?? 0.5) + rng() * 0.2; pz[i] = (o.z ?? 0) + (rng() - 0.5) * 0.3;
      let a = rng() * 6.2832, bias = dl > 0.001 && rng() < 0.65 ? 1 : 0;
      let ddx = Math.cos(a), ddz = Math.sin(a);
      if (bias) { ddx = dx + (rng() - 0.5) * 0.9; ddz = dz + (rng() - 0.5) * 0.9; const l = Math.hypot(ddx, ddz) || 1; ddx /= l; ddz /= l; }
      const sp = fuerza * (0.25 + rng() * 0.85);
      vx[i] = ddx * sp; vz[i] = ddz * sp; vy[i] = fuerza * (0.35 + rng() * 0.75) + 1.5;
      q.set(rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
      qx[i] = q.x; qy[i] = q.y; qz[i] = q.z; qw[i] = q.w;
      const sw = 7 + rng() * 11; wx[i] = (rng() - 0.5) * 2 * sw; wy[i] = (rng() - 0.5) * 2 * sw; wz[i] = (rng() - 0.5) * 2 * sw;
      const e = 0.7 + rng() * 0.6, d = M.dim;
      sx[i] = (d[0][0] + (d[0][1] - d[0][0]) * rng()) * e; sy[i] = (d[1][0] + (d[1][1] - d[1][0]) * rng()) * e; sz[i] = (d[2][0] + (d[2][1] - d[2][0]) * rng()) * e;
      estado[i] = 1; tm[i] = 0; reposoMax[i] = M.reposo * (0.8 + rng() * 0.5); rebote[i] = M.reb; rebotes[i] = 0; mat_[i] = idMat;
      const v = 1 + (rng() - 0.5) * 2 * M.var;
      col.setRGB(M.col[0] * v, M.col[1] * (1 + (rng() - 0.5) * M.var), M.col[2] * v);
      malla.setColorAt(i, col); colorSucio = true;
      pbr.setXY(i, M.rug, M.met); pbr.needsUpdate = true;
      tw[i] = 0;
    }
    malla.count = alto;
  }

  function soporte(i, R10, R11, R12) { return (Math.abs(R10) * sx[i] + Math.abs(R11) * sy[i] + Math.abs(R12) * sz[i]) * 0.5; }

  function actualizar(dt) {
    if (alto === 0 || dt <= 0) return;
    const dts = Math.min(dt, 1 / 30);
    let activos = false;
    for (let i = 0; i < alto; i++) {
      const e = estado[i];
      if (e === 0) continue;
      activos = true;
      q.set(qx[i], qy[i], qz[i], qw[i]);
      let escala = 1;
      if (e === 1) {
        vy[i] -= GRAV * dts;
        px[i] += vx[i] * dts; py[i] += vy[i] * dts; pz[i] += vz[i] * dts;
        const w = Math.hypot(wx[i], wy[i], wz[i]);
        if (w > 1e-4) { ax.set(wx[i] / w, wy[i] / w, wz[i] / w); q2.setFromAxisAngle(ax, w * dts); q.premultiply(q2); }
        const x = q.x, y = q.y, z = q.z, ww = q.w;
        const h = soporte(i, 2 * (x * y + ww * z), 1 - 2 * (x * x + z * z), 2 * (y * z - ww * x));
        if (py[i] < h) {
          py[i] = h;
          if (vy[i] < 0) {
            const primero = rebotes[i] === 0;
            rebotes[i]++;
            vy[i] = -vy[i] * rebote[i]; const f = 0.55;
            vx[i] *= f; vz[i] *= f; wx[i] *= 0.5; wy[i] *= 0.5; wz[i] *= 0.5;
            if (primero && alAterrizar) alAterrizar(NOMBRES[mat_[i]], px[i], pz[i], Math.max(sx[i], sz[i]));
            if (vy[i] < 1.3 || rebotes[i] > 3) {
              // asentar: gira el eje más vertical hasta quedar plano
              const R = [2 * (x * y + ww * z), 1 - 2 * (x * x + z * z), 2 * (y * z - ww * x)];
              const m = [
                [1 - 2 * (y * y + z * z), 2 * (x * y + ww * z), 2 * (x * z - ww * y)],
                [2 * (x * y - ww * z), 1 - 2 * (x * x + z * z), 2 * (y * z + ww * x)],
                [2 * (x * z + ww * y), 2 * (y * z - ww * x), 1 - 2 * (x * x + y * y)],
              ];
              // columnas del eje local a (en mundo): m[0][a], m[1][a], m[2][a]
              let mejor = 0, mv = 0;
              for (let a = 0; a < 3; a++) { const c = Math.abs(m[1][a]); if (c > mv) { mv = c; mejor = a; } }
              v3.set(m[0][mejor], m[1][mejor], m[2][mejor]).normalize();
              q2.setFromUnitVectors(v3, ax.set(0, v3.y >= 0 ? 1 : -1, 0));
              qt.copy(q).premultiply(q2);
              tx[i] = qt.x; ty[i] = qt.y; tz[i] = qt.z; tw[i] = qt.w;
              estado[i] = 2; tm[i] = 0; vx[i] = vz[i] = vy[i] = 0; wx[i] = wy[i] = wz[i] = 0;
            }
          }
          if (estado[i] === 1) { vx[i] *= 0.985; vz[i] *= 0.985; }
        }
      } else {
        tm[i] += dts;
        // asentamiento: gira hacia la pose plana
        if (tw[i] !== 0 && tm[i] < 0.5) {
          qt.set(tx[i], ty[i], tz[i], tw[i]);
          q.slerp(qt, Math.min(1, dts * 14));
          const x = q.x, y = q.y, z = q.z, ww = q.w;
          py[i] = soporte(i, 2 * (x * y + ww * z), 1 - 2 * (x * x + z * z), 2 * (y * z - ww * x));
        }
        if (tm[i] > reposoMax[i]) {
          const f = (tm[i] - reposoMax[i]) / 1.4;
          if (f >= 1) { estado[i] = 0; malla.setMatrixAt(i, ceros); continue; }
          escala = 1 - f * f; py[i] -= dts * 0.12;
        }
      }
      qx[i] = q.x; qy[i] = q.y; qz[i] = q.z; qw[i] = q.w;
      pos.set(px[i], py[i], pz[i]); esc.set(sx[i] * escala, sy[i] * escala, sz[i] * escala);
      m4.compose(pos, q, esc);
      malla.setMatrixAt(i, m4);
    }
    if (activos) malla.instanceMatrix.needsUpdate = true;
    if (colorSucio && malla.instanceColor) { malla.instanceColor.needsUpdate = true; colorSucio = false; }
  }

  function limpiar() {
    estado.fill(0); sig = 0; alto = 0; malla.count = 0;
    malla.instanceMatrix.needsUpdate = true;
  }
  function liberar() { malla.removeFromParent(); geo.dispose(); mat.dispose(); malla.dispose?.(); }
  function cuenta() { let n = 0; for (let i = 0; i < alto; i++) if (estado[i]) n++; return n; }

  return { lanzar, actualizar, limpiar, liberar, cuenta, set alAterrizar(f) { alAterrizar = f; }, MATERIALES };
}
