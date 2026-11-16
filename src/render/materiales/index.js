// PROVISIONAL — lo sustituye el agente de Materiales. Biblioteca de materiales PBR procedurales.
import * as THREE from 'three';
const cache = new Map();
export const materiales = {
  /** Devuelve un material compartido (no modificar; clonar si hace falta). */
  obtener(nombre, opciones = {}) {
    const k = nombre + JSON.stringify(opciones);
    if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color: opciones.color ?? 0x888888, roughness: 0.8 }));
    return cache.get(k);
  },
  lista() { return []; },
};
