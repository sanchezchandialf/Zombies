// Materiales de vehículos: biblioteca PBR compartida (materiales.obtener) más materiales propios cacheados.
import * as THREE from 'three';
import { materiales } from '../render/materiales/index.js';

const ESC = new WeakMap();
const cache = new Map();
export const escalaUV = (m) => ESC.get(m) ?? 0;

/** Material de la biblioteca con la escala de mosaico registrada para la proyección de UV. */
export function lib(nombre, opc) {
  const clave = 'L|' + nombre + '|' + JSON.stringify(opc ?? {});
  let m = cache.get(clave);
  if (m) return m;
  m = materiales.obtener(nombre, opc);
  ESC.set(m, materiales.info(nombre)?.escala ?? 1.5);
  cache.set(clave, m);
  return m;
}

/** Material estándar propio (sin UV), cacheado por clave. */
export function est(clave, props, fisico = false) {
  let m = cache.get('S|' + clave);
  if (m) return m;
  m = fisico ? new THREE.MeshPhysicalMaterial(props) : new THREE.MeshStandardMaterial(props);
  ESC.set(m, 0);
  cache.set('S|' + clave, m);
  return m;
}

export const neum = () => est('neumatico', { color: 0x151515, roughness: 0.88, metalness: 0.0 });
export const cristal = (tinte = 0x1a2630) => est('cristal' + tinte, { color: tinte, roughness: 0.04, metalness: 0.2, envMapIntensity: 2.2, transparent: true, opacity: 0.72 }, true);
export const faroMat = (color = 0xfff0c8, k = 3.2) => est('faro' + color + k, { color: 0xffffff, emissive: color, emissiveIntensity: k, roughness: 0.2, metalness: 0.0 });
export const luzRoja = (k = 2.5) => est('luzroja' + k, { color: 0x660808, emissive: 0xff1810, emissiveIntensity: k, roughness: 0.3 });
export const quemado = () => est('quemado', { color: 0x1d1a18, roughness: 0.92, metalness: 0.35, emissive: 0x200800, emissiveIntensity: 0.4 });
export const brasa = () => est('brasa', { color: 0x1a0d08, roughness: 0.9, emissive: 0xff5a14, emissiveIntensity: 1.6 });

export function liberarMats() { cache.clear(); }
