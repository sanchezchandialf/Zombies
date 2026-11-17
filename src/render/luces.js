// Luz principal (sol/luna con sombra estable que sigue al objetivo), hemisférica y reserva fija de luces puntuales.
import * as THREE from 'three';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ELEV_MAX = 1.12;       // 64º de elevación máxima del sol
const ELEV_MIN_SOMBRA = 0.42; // seno mínimo de la elevación de la luz de sombras (~25º): sombras largas pero acotadas
const RADIO_SOMBRA = 34;

export const MAX_PUNTUALES = 12;

export function crearLuces(escena) {
  const sol = new THREE.DirectionalLight(0xffffff, 3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  const cs = sol.shadow.camera;
  cs.left = cs.bottom = -RADIO_SOMBRA; cs.right = cs.top = RADIO_SOMBRA; cs.near = 5; cs.far = 190;
  sol.shadow.bias = -0.00035; sol.shadow.normalBias = 0.045; sol.shadow.radius = 2.4;
  sol.name = 'sol';
  escena.add(sol, sol.target);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemi.name = 'hemisferica';
  escena.add(hemi);

  // ── reserva fija de luces puntuales (nunca cambia el número de luces de la escena → sin recompilar shaders)
  const pool = [];
  for (let i = 0; i < MAX_PUNTUALES; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 10, 2);
    l.name = 'puntual' + i; escena.add(l);
    pool.push({ luz: l, actual: 0, dueno: null });
  }
  const fuentes = [];
  let activas = MAX_PUNTUALES;

  const solDir = new THREE.Vector3(0, 1, 0), lunaDir = new THREE.Vector3(0, -1, 0), dirLuz = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3(), ejeX = new THREE.Vector3(), ejeY = new THREE.Vector3(), colLuz = new THREE.Color();
  const dS = new THREE.Vector3(), dL = new THREE.Vector3();
  const info = { noche: 0, solAltura: 1, f: 1, g: 0 };

  function limitarElevacion(d, out) {
    const hx = d.x, hz = d.z, hl = Math.hypot(hx, hz) || 1;
    const y = Math.max(d.y, ELEV_MIN_SOMBRA), c = Math.sqrt(1 - y * y);
    return out.set((hx / hl) * c, y, (hz / hl) * c);
  }

  const api = {
    sol, hemi, solDir, lunaDir, info,
    /** Fija direcciones del sol y la luna para la hora `h` y calcula intensidades. */
    actualizarAstros(atm, hora, foco, flash) {
      const a = hora * Math.PI * 2;
      const elev = Math.sin(a) * ELEV_MAX, ce = Math.cos(elev);
      let hx = Math.cos(a), hz = 0.38; const hl = Math.hypot(hx, hz); hx /= hl; hz /= hl;
      solDir.set(hx * ce, Math.sin(elev), hz * ce);
      lunaDir.set(-hx * ce, -Math.sin(elev), hz * ce);
      const f = sm(-0.1, 0.02, solDir.y) * (0.3 + 0.7 * sm(0, 0.5, solDir.y));
      const g = sm(-0.1, 0.02, lunaDir.y) * (0.35 + 0.65 * sm(0, 0.5, lunaDir.y));
      const Is = atm.solI * f, Im = atm.lunaI * g, I = Is + Im;
      info.noche = sm(0.06, -0.18, solDir.y); info.solAltura = solDir.y; info.f = f; info.g = g;
      limitarElevacion(solDir, dS); limitarElevacion(lunaDir, dL);
      if (I > 1e-4) {
        dirLuz.copy(dS).multiplyScalar(Is / I).addScaledVector(dL, Im / I).normalize();
        const wm = Im / I; colLuz.copy(atm.sol).multiplyScalar(Is / I); colLuz.r += atm.luna.r * wm; colLuz.g += atm.luna.g * wm; colLuz.b += atm.luna.b * wm;
      }
      sol.color.copy(colLuz); sol.intensity = I * (1 + flash * 0.4);
      sol.shadow.intensity = 0.62 + 0.3 * (I > 1e-4 ? Is / I : 0);
      hemi.color.copy(atm.hemiC); hemi.groundColor.copy(atm.hemiS); hemi.intensity = atm.hemiI * (1 + flash * 1.5);
      api.colocarSombra(foco);
    },
    /** Coloca la luz y su cámara de sombra alineando el objetivo a la rejilla de texels (sin temblor al moverse). */
    colocarSombra(foco) {
      const d = dirLuz;
      ejeX.set(0, 1, 0).cross(d).normalize();
      ejeY.copy(d).cross(ejeX);
      const texel = (2 * RADIO_SOMBRA) / sol.shadow.mapSize.x;
      const px = Math.round(foco.dot(ejeX) / texel) * texel, py = Math.round(foco.dot(ejeY) / texel) * texel, pz = foco.dot(d);
      sol.target.position.set(0, 0, 0).addScaledVector(ejeX, px).addScaledVector(ejeY, py).addScaledVector(d, pz);
      sol.target.position.y = Math.max(sol.target.position.y, -2);
      sol.position.copy(sol.target.position).addScaledVector(d, 95);
      sol.target.updateMatrixWorld(); sol.updateMatrixWorld();
    },
    tamanoSombra(n) {
      if (sol.shadow.mapSize.x === n) return;
      sol.shadow.mapSize.set(n, n);
      if (sol.shadow.map) { sol.shadow.map.dispose(); sol.shadow.map = null; }
    },
    /** Número de luces puntuales activas según calidad (las demás quedan invisibles; recompila una vez). */
    puntualesActivas(n) {
      activas = Math.max(0, Math.min(MAX_PUNTUALES, n));
      for (let i = 0; i < pool.length; i++) pool[i].luz.visible = i < activas;
    },
    luzPuntual(o = {}) {
      const col = o.color && o.color.isColor ? o.color.clone() : new THREE.Color(o.color ?? 0xffffff);
      const f = {
        pos: new THREE.Vector3(o.x ?? 0, o.y ?? 2, o.z ?? 0), color: col,
        intensidad: o.intensidad ?? 10, distancia: o.distancia ?? 10, activa: true,
        quitar() { const i = fuentes.indexOf(f); if (i >= 0) fuentes.splice(i, 1); f.activa = false; },
      };
      fuentes.push(f);
      return f;
    },
    /** Asigna las luces de la reserva a las fuentes más cercanas al foco. */
    actualizarPuntuales(dt, foco) {
      for (const f of fuentes) { const dx = f.pos.x - foco.x, dz = f.pos.z - foco.z; f._d = dx * dx + dz * dz - f.intensidad * 0.5; }
      fuentes.sort((a, b) => a._d - b._d);
      const kf = Math.min(1, dt * 14);
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i], f = i < activas ? fuentes[i] : undefined;
        if (f && f.intensidad > 0.001) {
          if (p.dueno !== f) { p.dueno = f; p.actual = 0; }
          p.actual += (f.intensidad - p.actual) * kf;
          p.luz.position.copy(f.pos); p.luz.color.copy(f.color); p.luz.distance = f.distancia; p.luz.intensity = p.actual;
        } else {
          p.dueno = null; p.actual *= 1 - kf; if (p.actual < 0.01) p.actual = 0;
          p.luz.intensity = p.actual;
        }
      }
    },
    liberar() {
      sol.shadow.map?.dispose();
      escena.remove(sol, sol.target, hemi); for (const p of pool) escena.remove(p.luz);
      fuentes.length = 0;
    },
  };
  return api;
}
