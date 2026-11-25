// Materiales compartidos de los personajes (tela con trama, cuero con grano, metal, piel...). Cacheados por tipo+color.
import * as THREE from 'three';

let T = null;
function lienzo(n = 128) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function tex(c, rep = 1) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t; }
function rnd(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function texturas() {
  if (T) return T;
  const r = rnd(7);
  // Tela: trama de hilos cruzados con irregularidad
  let c = lienzo(), x = c.getContext('2d'), im = x.createImageData(128, 128);
  for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) {
    const a = ((i >> 1) + (j >> 1)) & 1, hilo = (i & 1) ? 0.08 : 0, hilo2 = (j & 1) ? 0.08 : 0;
    const v = 205 + (a ? 20 : -6) - (hilo + hilo2) * 255 * 0.6 + (r() - 0.5) * 18;
    const k = (j * 128 + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = Math.max(120, Math.min(255, v)); im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); const tela = tex(c, 3);
  // Cuero: grano de poros
  c = lienzo(); x = c.getContext('2d'); x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, 128, 128);
  for (let n = 0; n < 900; n++) { const px = r() * 128, py = r() * 128, rad = 1 + r() * 2.2; x.fillStyle = `rgba(${r() < 0.5 ? '120,120,120' : '255,255,255'},${0.18 + r() * 0.2})`; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill(); }
  for (let n = 0; n < 14; n++) { x.strokeStyle = 'rgba(90,90,90,0.25)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(r() * 128, r() * 128); x.lineTo(r() * 128, r() * 128); x.stroke(); }
  const cuero = tex(c, 2);
  // Metal: vetas cepilladas
  c = lienzo(); x = c.getContext('2d'); x.fillStyle = '#e4e4e4'; x.fillRect(0, 0, 128, 128);
  for (let n = 0; n < 260; n++) { const yy = r() * 128; x.strokeStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + r() * 0.1})`; x.lineWidth = 0.6 + r(); x.beginPath(); x.moveTo(0, yy); x.lineTo(128, yy + (r() - 0.5) * 3); x.stroke(); }
  const metal = tex(c, 2);
  // Piel: poro suave
  c = lienzo(); x = c.getContext('2d'); x.fillStyle = '#f0f0f0'; x.fillRect(0, 0, 128, 128);
  for (let n = 0; n < 700; n++) { x.fillStyle = `rgba(120,120,120,${0.05 + r() * 0.08})`; x.beginPath(); x.arc(r() * 128, r() * 128, 0.8 + r() * 1.2, 0, 7); x.fill(); }
  const piel = tex(c, 3);
  T = { tela, cuero, metal, piel };
  return T;
}

const cache = new Map();
/** Fuerza del borde de luz (rim) de todos los materiales de jugador: la sube el visual de noche para separarlos del fondo. */
export const RIM = { value: 0.45 };
function conRim(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRimJ = RIM;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n uniform float uRimJ;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimJ = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.6);
        totalEmissiveRadiance += (diffuseColor.rgb * 0.55 + vec3(0.05, 0.055, 0.065)) * rimJ * uRimJ;`);
  };
  m.customProgramCacheKey = () => 'jug-rim';
  return m;
}
const DEF = {
  tela: (c) => ({ color: c, roughness: 0.93, metalness: 0, map: 'tela', bumpMap: 'tela', bumpScale: 0.7 }),
  cuero: (c) => ({ color: c, roughness: 0.52, metalness: 0.02, map: 'cuero', bumpMap: 'cuero', bumpScale: 1.4 }),
  metal: (c) => ({ color: c, roughness: 0.34, metalness: 0.88, map: 'metal', bumpMap: 'metal', bumpScale: 0.35, envMapIntensity: 1.4 }),
  laton: (c) => ({ color: c, roughness: 0.28, metalness: 1, envMapIntensity: 1.5 }),
  pintura: (c) => ({ color: c, roughness: 0.42, metalness: 0.35, map: 'metal', bumpMap: 'metal', bumpScale: 0.2, envMapIntensity: 1.2 }),
  piel: (c) => ({ color: c, roughness: 0.58, metalness: 0, map: 'piel', bumpMap: 'piel', bumpScale: 0.35, emissive: new THREE.Color(c).multiplyScalar(0.1) }),
  pelo: (c) => ({ color: c, roughness: 0.7, metalness: 0.05, map: 'cuero', bumpMap: 'cuero', bumpScale: 0.6 }),
  goma: (c) => ({ color: c, roughness: 0.82, metalness: 0 }),
  cristal: (c) => ({ color: c, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, envMapIntensity: 2 }),
  luz: (c) => ({ color: 0x050505, emissive: c, emissiveIntensity: 2.4, roughness: 0.4 }),
  blanco: (c) => ({ color: c, roughness: 0.7, metalness: 0 }),
};
/** Material compartido. tipo ∈ tela|cuero|metal|laton|pintura|piel|pelo|goma|cristal|luz|blanco */
export function mat(tipo, color = 0xffffff, doble = false) {
  const k = tipo + ':' + new THREE.Color(color).getHexString() + (doble ? ':d' : '');
  let m = cache.get(k);
  if (m) return m;
  const d = DEF[tipo] ? DEF[tipo](color) : DEF.tela(color);
  const t = texturas();
  for (const n of ['map', 'bumpMap']) if (typeof d[n] === 'string') d[n] = t[d[n]];
  if (doble) d.side = THREE.DoubleSide;
  m = new THREE.MeshStandardMaterial(d);
  if (tipo !== 'luz' && tipo !== 'cristal') conRim(m);
  m.userData.compartido = true;
  cache.set(k, m);
  return m;
}

// Silueta «rayos X»: se dibuja solo donde el héroe queda tapado por el escenario (profundidad mayor), en el color del rol.
// Va antes que el propio héroe (renderOrder 1 < 2) y sin escribir profundidad, así el cuerpo visible la cubre y no se tiñe.
const siluetas = new Map();
export function matSilueta(color = 0xffffff) {
  const k = String(color);
  let m = siluetas.get(k);
  if (!m) {
    // Holograma: relleno tenue y borde marcado (fresnel). Mezcla alfa propia sin pasar a la lista de transparentes
    // (debe dibujarse entre el escenario y el héroe).
    m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
        void main() { float r = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6); gl_FragColor = vec4(uColor * (0.75 + 0.6 * r), 0.2 + 0.6 * r); }`,
      transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      depthWrite: false, depthFunc: THREE.GreaterDepth, toneMapped: false, fog: false,
    });
    siluetas.set(k, m);
  }
  return m;
}

const flash = new Map();
export function matFlash(color = 0xffffff) {
  let m = flash.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, toneMapped: false }); flash.set(color, m); }
  return m;
}
let fantasma = null;
export function matFantasma() {
  if (fantasma) return fantasma;
  fantasma = new THREE.MeshStandardMaterial({ color: 0x8fd0ff, emissive: 0x2a6a98, emissiveIntensity: 0.6, transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.3 });
  fantasma.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float rimF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2);
      outgoingLight += vec3(0.35, 0.85, 1.0) * rimF * 1.8;
      diffuseColor.a = mix(0.16, 0.95, rimF);
      #include <opaque_fragment>`);
  };
  fantasma.customProgramCacheKey = () => 'jug-fantasma';
  return fantasma;
}

export function liberarMateriales() {
  for (const m of cache.values()) m.dispose();
  cache.clear();
  for (const m of siluetas.values()) m.dispose();
  siluetas.clear();
  for (const m of flash.values()) m.dispose();
  flash.clear();
  fantasma?.dispose(); fantasma = null;
  if (T) { for (const t of Object.values(T)) t.dispose(); T = null; }
}
