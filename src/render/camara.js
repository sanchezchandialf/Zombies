// Cámara de juego: cenital inclinada, sigue con suavidad al centro de los objetivos, se adelanta hacia donde se
// mueven, se aleja si hay jugadores separados, sacudida con ruido suave, retroceso direccional y vuelo de menú.
import * as THREE from 'three';

export const CAMARA = { fov: 35, cabeceo: (55 * Math.PI) / 180, dist: 22, altoMirada: 0.7, near: 0.4, far: 450 };

const suave = (t) => t * t * (3 - 2 * t);
const ruido = (t, s) => (Math.sin(t * 7.3 + s * 11.1) + Math.sin(t * 12.7 + s * 5.3) * 0.6 + Math.sin(t * 19.1 + s * 2.7) * 0.3) / 1.9;

export function crearCamaraJuego(camara) {
  const foco = new THREE.Vector3(), focoObj = new THREE.Vector3(), centroPrev = new THREE.Vector3(), vel = new THREE.Vector3();
  const spring = new THREE.Vector3(), springV = new THREE.Vector3();
  const posJuego = new THREE.Vector3(), mirJuego = new THREE.Vector3(), posMenu = new THREE.Vector3(), mirMenu = new THREE.Vector3();
  const tmp = new THREE.Vector3(), derecha = new THREE.Vector3(), arriba = new THREE.Vector3();
  let objetivos = [], iniciado = false, dist = CAMARA.dist, zoomVal = 1, zoomObj = 1, zoomT = 0;
  const sacudidas = []; let reloj = 0, menuActivo = false, menuMix = 0, menuAz = 0.6, fovAct = CAMARA.fov;
  const libre = { x: 0, z: 0 };

  camara.fov = CAMARA.fov; camara.near = CAMARA.near; camara.far = CAMARA.far; camara.updateProjectionMatrix();

  const api = {
    foco, get distancia() { return dist; },
    seguir(lista) { objetivos = lista || []; },
    sacudir(fuerza = 0.5, duracion = 0.4) {
      if (sacudidas.length > 10) sacudidas.shift();
      sacudidas.push({ f: Math.min(1, Math.max(0, fuerza)), t: 0, d: Math.max(0.05, duracion) });
    },
    retroceso(dx, dz, fuerza = 0.5) {
      const l = Math.hypot(dx, dz) || 1;
      springV.x += (dx / l) * fuerza * 5.5; springV.z += (dz / l) * fuerza * 5.5;
    },
    zoom(factor = 1, duracion = 0.5) { zoomObj = factor; zoomT = Math.max(0.05, duracion); },
    menu(v) { menuActivo = !!v; },
    get menuActivo() { return menuActivo; },
    /** Avanza la cámara. Si `aplicar` es false (camaraExterna) solo se mantiene el estado interno. */
    actualizar(dt, aplicar) {
      dt = Math.min(Math.max(dt, 0), 0.1); reloj += dt;
      // ── centro de los objetivos
      let n = 0, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (const o of objetivos) {
        const p = o?.pos; if (!p || !isFinite(p.x) || !isFinite(p.z)) continue;
        n++; if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
      }
      let cx = foco.x, cz = foco.z, ancho = 0, fondo = 0;
      if (n > 0) { cx = (minX + maxX) / 2; cz = (minZ + maxZ) / 2; ancho = maxX - minX; fondo = maxZ - minZ; }
      if (!iniciado) { foco.set(cx, 0, cz); centroPrev.set(cx, 0, cz); iniciado = true; }
      if (n > 0 && dt > 0) {
        const kv = 1 - Math.exp(-6 * dt);
        vel.x += ((cx - centroPrev.x) / dt - vel.x) * kv; vel.z += ((cz - centroPrev.z) / dt - vel.z) * kv;
        const m = Math.hypot(vel.x, vel.z); if (m > 14) { vel.x *= 14 / m; vel.z *= 14 / m; }
        centroPrev.set(cx, 0, cz);
      } else if (n === 0) { vel.multiplyScalar(Math.exp(-4 * dt)); }
      const lead = 0.42;
      let lx = vel.x * lead, lz = vel.z * lead; const lm = Math.hypot(lx, lz);
      if (lm > 4.5) { lx *= 4.5 / lm; lz *= 4.5 / lm; }
      focoObj.set(cx + (n > 0 ? lx : 0), 0, cz + (n > 0 ? lz : 0));
      if (Math.hypot(focoObj.x - foco.x, focoObj.z - foco.z) > 45) foco.copy(focoObj); // teletransporte / cambio de escenario
      else { const kf = 1 - Math.exp(-5.2 * dt); foco.x += (focoObj.x - foco.x) * kf; foco.z += (focoObj.z - foco.z) * kf; }

      // ── distancia: se aleja si hay jugadores separados
      const asp = camara.aspect || 16 / 9;
      const altoVis = 2 * CAMARA.dist * Math.tan((CAMARA.fov * Math.PI) / 360);
      const kx = (ancho + 11) / (altoVis * asp), kz = (fondo + 10) / (altoVis / Math.sin(CAMARA.cabeceo));
      const sep = Math.min(2.1, Math.max(1, kx, kz));
      if (zoomT > 0) zoomT -= dt;
      const zObj = zoomT > 0 ? zoomObj : 1;
      zoomVal += (zObj - zoomVal) * (1 - Math.exp(-(zoomT > 0 ? 9 : 2.6) * dt));
      const dObj = CAMARA.dist * sep * zoomVal;
      dist += (dObj - dist) * (1 - Math.exp(-2.2 * dt));

      // ── retroceso (muelle)
      const k = 110, c = 15;
      springV.x += (-k * spring.x - c * springV.x) * dt; springV.z += (-k * spring.z - c * springV.z) * dt;
      spring.x += springV.x * dt; spring.z += springV.z * dt;

      // ── pose de juego
      const cab = CAMARA.cabeceo;
      const sway = Math.sin(reloj * 0.21) * 0.012;
      tmp.set(Math.sin(sway) * 1.0, Math.sin(cab), Math.cos(cab) * Math.cos(sway));
      posJuego.copy(foco).addScaledVector(tmp, dist);
      posJuego.x += spring.x; posJuego.z += spring.z;
      mirJuego.set(foco.x + spring.x * 0.6, CAMARA.altoMirada, foco.z + spring.z * 0.6);

      // ── pose de menú: vuelo orbital lento
      menuMix += ((menuActivo ? 1 : 0) - menuMix) * (1 - Math.exp(-1.6 * dt));
      if (menuMix > 0.002) {
        menuAz += dt * 0.05;
        const R = 38 + Math.sin(reloj * 0.07) * 4, H = 15 + Math.sin(reloj * 0.11) * 3.2;
        const cxm = menuActivo && n === 0 ? libre.x : foco.x, czm = menuActivo && n === 0 ? libre.z : foco.z;
        posMenu.set(cxm + Math.sin(menuAz) * R, H, czm + Math.cos(menuAz) * R);
        mirMenu.set(cxm, 2.2, czm);
      }
      const mm = suave(menuMix);
      let roll = 0;
      // ── sacudida
      let trauma = 0;
      for (let i = sacudidas.length - 1; i >= 0; i--) {
        const s = sacudidas[i]; s.t += dt;
        if (s.t >= s.d) { sacudidas.splice(i, 1); continue; }
        const r = 1 - s.t / s.d; trauma += s.f * r * r;
      }
      trauma = Math.min(1, trauma);
      const amp = trauma * trauma, escala = dist / CAMARA.dist;

      if (aplicar) {
        const fovObj = CAMARA.fov + mm * 7;
        if (Math.abs(fovObj - fovAct) > 0.01) { fovAct = fovObj; camara.fov = fovAct; camara.updateProjectionMatrix(); }
        camara.position.lerpVectors(posJuego, posMenu, mm);
        tmp.lerpVectors(mirJuego, mirMenu, mm);
        camara.lookAt(tmp);
        if (amp > 0.0001) {
          derecha.set(1, 0, 0).applyQuaternion(camara.quaternion); arriba.set(0, 1, 0).applyQuaternion(camara.quaternion);
          const A = 0.5 * amp * escala;
          camara.position.addScaledVector(derecha, ruido(reloj, 1) * A).addScaledVector(arriba, ruido(reloj, 2) * A);
          roll = ruido(reloj, 3) * 0.018 * amp;
          camara.rotateZ(roll);
        }
      }
    },
  };
  return api;
}
