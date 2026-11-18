// Constructores de ruedas. Eje X; la cara exterior mira a +X (las ruedas izquierdas se voltean en el modelo).
import * as THREE from 'three';
import { Acum, T, caja, cilX, torno, neumatico, barra, esfera } from '../geo.js';
import { neum } from '../mats.js';

const mat4 = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));

/** Devuelve un Group con la rueda completa (neumático, llanta, radios, tuercas) en 2–3 mallas. */
export function crearRueda(estilo, o) {
  const { R, ancho, M } = o;
  const g = new THREE.Group();
  const a = new Acum();
  const k = o.k ?? 1;
  if (estilo === 'mag') {
    // llanta de aleación con radios cromados y neumático de perfil bajo
    const rr = R * 0.62;
    a.add(neumatico(R, ancho, rr * 0.98, 0, 0.015), neum());
    a.add(torno([[rr, -ancho * 0.36], [rr + 0.012, -ancho * 0.34], [rr + 0.012, ancho * 0.30], [rr * 0.95, ancho * 0.42], [rr * 0.55, ancho * 0.32], [rr * 0.2, ancho * 0.30], [0.001, ancho * 0.34]], 28).rotateZ(-Math.PI / 2), M.cromo);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const rad = caja(0.03, rr * 0.82, 0.045, 0.01, 1);
      a.add(rad, M.cromo, mat4(ancho * 0.34, 0, 0, ang, 0, 0).multiply(mat4(0, rr * 0.45, 0)));
    }
    a.add(torno([[0.001, 0.045], [0.07, 0.038], [0.085, 0.0], [0.001, -0.002]], 18).rotateZ(-Math.PI / 2), M.pintura, mat4(ancho * 0.4, 0, 0));
    for (let i = 0; i < 5; i++) { const ang = (i / 5) * Math.PI * 2; a.add(cilX(0.014, 0.03, 8), M.cromo, mat4(ancho * 0.41, Math.cos(ang) * rr * 0.34, Math.sin(ang) * rr * 0.34)); }
    // disco de freno visible tras los radios
    a.add(cilX(rr * 0.8, 0.018, 24), M.hierro, mat4(ancho * 0.2, 0, 0));
  } else if (estilo === 'artilleria') {
    // rueda de artillería: radios de madera, llanta de hierro y cubierta maciza de goma
    const rr = R * 0.86;
    a.add(neumatico(R, ancho * 0.92, rr, 0, 0), neum());
    a.add(torno([[rr, -ancho * 0.45], [rr + 0.012, -ancho * 0.45], [rr + 0.012, ancho * 0.45], [rr, ancho * 0.45]], 32).rotateZ(Math.PI / 2), M.hierro);
    a.add(torno([[rr * 0.93, -ancho * 0.28], [rr * 0.99, -ancho * 0.28], [rr * 0.99, ancho * 0.28], [rr * 0.93, ancho * 0.28]], 32).rotateZ(Math.PI / 2), M.madera);
    const N = 12;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      a.add(caja(ancho * 0.30, rr * 0.9, 0.052, 0.012, 1), M.madera, mat4(0, 0, 0, ang, 0, 0).multiply(mat4(0, rr * 0.5, 0)));
    }
    a.add(torno([[0.0, -0.1], [0.12, -0.09], [0.145, -0.04], [0.145, 0.04], [0.12, 0.09], [0.0, 0.1]], 20).rotateZ(Math.PI / 2), M.laton, mat4(ancho * 0.05, 0, 0));
    a.add(cilX(0.045, 0.06, 12), M.hierro, mat4(ancho * 0.18, 0, 0));
    for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; a.add(cilX(0.012, 0.025, 6), M.hierro, mat4(ancho * 0.13, Math.cos(ang) * 0.1, Math.sin(ang) * 0.1)); }
  } else if (estilo === 'hierro') {
    // rueda de tractor de vapor: llanta ancha de hierro con tacos, radios en doble hilera y cubo grueso
    const rr = R * 0.93;
    a.add(torno([[rr, -ancho * 0.5], [R, -ancho * 0.5], [R, ancho * 0.5], [rr, ancho * 0.5]], 40).rotateZ(Math.PI / 2), M.hierro);
    a.add(torno([[rr * 0.92, -ancho * 0.52], [rr, -ancho * 0.52], [rr, ancho * 0.52], [rr * 0.92, ancho * 0.52]], 40).rotateZ(Math.PI / 2), M.herrumbre);
    const tacos = Math.round(R * 22);
    for (let i = 0; i < tacos; i++) {
      const ang = (i / tacos) * Math.PI * 2;
      a.add(caja(ancho * 0.96, 0.05, 0.075, 0.012, 1), M.hierro, mat4(0, 0, 0, ang, 0, 0).multiply(mat4(0, R + 0.012, 0, 0, 0, 0)).multiply(mat4(0, 0, 0, 0, 0, 0)));
    }
    const N = Math.max(10, Math.round(R * 14));
    for (const s of [-1, 1]) for (let i = 0; i < N; i++) {
      const ang = ((i + (s > 0 ? 0.5 : 0)) / N) * Math.PI * 2;
      a.add(caja(0.045, rr * 0.88, 0.07, 0.012, 1), M.hierro, mat4(s * ancho * 0.3, 0, 0, ang, 0, 0).multiply(mat4(0, rr * 0.5, 0)));
    }
    a.add(torno([[0.0, -ancho * 0.42], [0.2, -ancho * 0.4], [0.24, -ancho * 0.2], [0.24, ancho * 0.2], [0.2, ancho * 0.4], [0.0, ancho * 0.42]], 20).rotateZ(Math.PI / 2), M.laton);
    for (const s of [-1, 1]) a.add(torno([[rr * 0.9, 0], [rr * 0.9, 0.012], [rr * 0.55, 0.02], [0.2, 0.02]], 28).rotateZ(Math.PI / 2), M.hierro, mat4(s * ancho * 0.42, 0, 0));
    for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2; a.add(cilX(0.02, 0.05, 6), M.hierro, mat4(ancho * 0.44, Math.cos(ang) * 0.17, Math.sin(ang) * 0.17)); }
    a.add(cilX(0.05, 0.09, 10), M.laton, mat4(ancho * 0.45, 0, 0));
  } else if (estilo === 'militar') {
    // cubierta de perfil alto con tacos grandes, llanta de acero con pernos y casquillo
    const rr = R * 0.58;
    a.add(neumatico(R, ancho, rr * 0.98, 22, 0.045), neum());
    a.add(torno([[rr, -ancho * 0.36], [rr, ancho * 0.36], [rr * 0.7, ancho * 0.46], [rr * 0.25, ancho * 0.42], [0.001, ancho * 0.42]], 28).rotateZ(-Math.PI / 2), M.pintura);
    a.add(torno([[rr * 1.0, ancho * 0.36], [rr * 0.93, ancho * 0.44], [rr * 0.7, ancho * 0.48], [rr * 0.68, ancho * 0.44]], 28).rotateZ(-Math.PI / 2), M.hierro);
    for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2; a.add(cilX(0.026, 0.05, 6), M.cromo, mat4(ancho * 0.47, Math.cos(ang) * rr * 0.55, Math.sin(ang) * rr * 0.55)); }
    a.add(torno([[0.001, 0.07], [0.12, 0.06], [0.15, 0.0], [0.001, 0.0]], 18).rotateZ(-Math.PI / 2), M.hierro, mat4(ancho * 0.44, 0, 0));
    a.add(cilX(rr * 0.65, 0.03, 20), M.hierro, mat4(ancho * 0.22, 0, 0));
  }
  a.volcar(g, { sombra: true });
  return g;
}

/** Monta la jerarquía virar → giro → cara y la añade a `padre`. Devuelve el registro de rueda. */
export function montarRueda(padre, estilo, o) {
  const virar = new THREE.Group(), giro = new THREE.Group(), cara = new THREE.Group();
  const w = crearRueda(estilo, o);
  cara.add(w);
  if (o.x < 0) cara.rotation.y = Math.PI;
  giro.add(cara); virar.add(giro);
  virar.position.set(o.x, o.y ?? o.R, o.z);
  padre.add(virar);
  return { giro, virar: o.direccion ? virar : null, radio: o.R, x: o.x, y: o.y ?? o.R, z: o.z, delantera: !!o.direccion, sentido: 1 };
}
export { barra, esfera, T };
