// PROVISIONAL — lo sustituye el agente de Arsenal. API en docs/ARQUITECTURA.md §Arsenal.
import * as THREE from 'three';
const mat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
/** Modelo de arma: cañón hacia +Z, empuñadura en el origen, arriba +Y. userData.boca = Vector3 local de la boca. */
export function crearModeloArma(armaId) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.9), mat); m.position.z = 0.3; m.castShadow = true; g.add(m);
  g.userData.boca = new THREE.Vector3(0, 0, 0.78); g.userData.armaId = armaId;
  return g;
}
export function crearModeloTorreta(eraIdx) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.9, 12), mat); b.position.y = 0.45; g.add(b);
  const cab = new THREE.Group(); cab.position.y = 1.0; g.add(cab);
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.0), mat); c.position.z = 0.4; cab.add(c);
  g.userData.cabeza = cab; g.userData.boca = new THREE.Vector3(0, 0, 0.95);
  return g;
}
export function crearModeloEmplazamiento(eraIdx) {
  const g = crearModeloTorreta(eraIdx); g.scale.setScalar(1.4); return g;
}
