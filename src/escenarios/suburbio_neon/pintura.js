// ERA Z · Pintura de carrocería / chapa lacada (material propio, sin desconchones).
// Sustituye a 'acero_pintado' del catálogo, cuyo «metal desnudo» (metalicidad 0,9) se ve negro de noche y
// salpica coches y tejados de manchas oscuras. Cacheado por color/opciones y liberado con el mapa (kit._propios).
import * as THREE from 'three';

export function crearPintura(kit) {
  const cache = new Map();
  /** pintura(color, { brillo, metal, rug, emisivo }) → MeshPhysicalMaterial lacado. */
  return (color, o = {}) => {
    const k = `${color}|${o.metal ?? ''}|${o.rug ?? ''}|${o.cc ?? ''}|${o.emisivo ?? ''}`;
    let m = cache.get(k);
    if (!m) {
      m = new THREE.MeshPhysicalMaterial({
        color, roughness: o.rug ?? 0.42, metalness: o.metal ?? 0.3,
        clearcoat: o.cc ?? 0.75, clearcoatRoughness: 0.22, envMapIntensity: 1.25,
      });
      if (o.emisivo) { m.emissive = new THREE.Color(color); m.emissiveIntensity = o.emisivo; }
      m.name = 'pintura';
      cache.set(k, m); kit._propios.push(m);
    }
    return m;
  };
}
