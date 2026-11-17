// Materiales PBR compartidos del Arsenal: acero pavonado, hierro, latón, nogal con veta, polímero, composite y emisivos HDR (bloom).
// Cada clave se crea una sola vez (texturas pequeñas de canvas, en mosaico) y se comparte entre todos los modelos.
import * as THREE from 'three';

const cache = new Map();
const texCache = new Map();

function rng(semilla) { let s = semilla >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function lienzo(n, fn, srgb = true, repetir = true) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'); fn(g, n);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = repetir ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}
const tex = (k, f) => { let t = texCache.get(k); if (!t) { t = f(); texCache.set(k, t); } return t; };

/** Veta de madera: líneas onduladas a lo largo de u (eje Z del arma), poros y nudos suaves. Periódica. */
function texMadera(base, oscuro, claro, semilla, vetaDensidad = 1) {
  return lienzo(256, (g, n) => {
    const r = rng(semilla);
    g.fillStyle = base; g.fillRect(0, 0, n, n);
    // bandas anchas de tono
    for (let i = 0; i < 18; i++) {
      const y = r() * n, h = 6 + r() * 26, a = 0.05 + r() * 0.12;
      g.fillStyle = (r() < 0.5 ? oscuro : claro) + Math.round(a * 255).toString(16).padStart(2, '0');
      for (const dy of [-n, 0, n]) g.fillRect(0, y + dy, n, h);
    }
    // vetas finas onduladas (periodo entero en x)
    const N = Math.round(150 * vetaDensidad);
    for (let i = 0; i < N; i++) {
      const y0 = r() * n, amp = 1 + r() * 5, f = 1 + Math.floor(r() * 3), ph = r() * 6.28;
      const col = r() < 0.62 ? oscuro : claro;
      g.strokeStyle = col + Math.round((0.1 + r() * 0.34) * 255).toString(16).padStart(2, '0');
      g.lineWidth = 0.5 + r() * 1.4;
      for (const dy of [-n, 0, n]) {
        g.beginPath();
        for (let x = 0; x <= n; x += 8) {
          const y = y0 + dy + Math.sin((x / n) * 6.2832 * f + ph) * amp;
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    }
    // poros
    for (let i = 0; i < 260; i++) {
      g.fillStyle = oscuro + '55';
      g.fillRect(r() * n, r() * n, 1 + r() * 5, 0.7);
    }
  });
}

function texRuido(n, base, var_, semilla, rayas = true, srgb = false) {
  return lienzo(n, (g) => {
    const r = rng(semilla);
    g.fillStyle = base; g.fillRect(0, 0, n, n);
    for (let i = 0; i < n * 5; i++) {
      const v = Math.round(r() * 255);
      g.fillStyle = `rgba(${v},${v},${v},${var_})`;
      if (rayas) g.fillRect(r() * n, r() * n, 2 + r() * 14, 1); else g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2);
    }
  }, srgb);
}

/** Rugosidad variable (mapa en canal verde): arañazos y pulido desigual. */
const rugAcero = () => tex('rug_acero', () => texRuido(128, '#a0a0a0', 0.22, 11, true));
const rugPol = () => tex('rug_pol', () => texRuido(128, '#d0d0d0', 0.12, 23, false));

function texCuero() {
  return tex('cuero', () => lienzo(128, (g, n) => {
    const r = rng(77);
    g.fillStyle = '#5a3a24'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(20,10,4,0.25)' : 'rgba(150,100,60,0.18)';
      const s = 1 + r() * 3; g.beginPath(); g.arc(r() * n, r() * n, s, 0, 6.28); g.fill();
    }
  }));
}
function texCuerda() {
  return tex('cuerda', () => lienzo(128, (g, n) => {
    g.fillStyle = '#b79a68'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 8) {
      g.fillStyle = '#6e5630'; g.fillRect(0, i, n, 2);
      g.fillStyle = '#d8bd86'; g.fillRect(0, i + 3, n, 2);
    }
  }));
}

function texLona() {
  return tex('lona', () => lienzo(128, (g, n) => {
    const r = rng(5);
    g.fillStyle = '#6d7048'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 2) { g.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`; g.fillRect(i, 0, 1, n); g.fillRect(0, i, n, 1); }
  }));
}

function texComposite(n = 256) {
  return tex('composite', () => lienzo(n, (g, nn) => {
    g.fillStyle = '#e6e9ee'; g.fillRect(0, 0, nn, nn);
    g.strokeStyle = 'rgba(70,90,110,0.55)'; g.lineWidth = 2;
    g.strokeRect(1, 1, nn - 2, nn - 2);
    g.strokeStyle = 'rgba(70,90,110,0.18)'; g.lineWidth = 1;
    g.strokeRect(nn * 0.1, nn * 0.1, nn * 0.8, nn * 0.8);
  }));
}

const DEF = {
  // metales
  acero: () => new THREE.MeshStandardMaterial({ name: 'arsenal_acero', color: 0x55616f, metalness: 0.95, roughness: 0.36, roughnessMap: rugAcero(), envMapIntensity: 1.5 }),
  acero_c: () => new THREE.MeshStandardMaterial({ name: 'arsenal_acero_claro', color: 0xb9bec4, metalness: 1, roughness: 0.34, roughnessMap: rugAcero(), envMapIntensity: 1.5 }),
  hierro: () => new THREE.MeshStandardMaterial({ name: 'arsenal_hierro', color: 0x3a3836, metalness: 0.85, roughness: 0.68, roughnessMap: rugAcero(), envMapIntensity: 1.1 }),
  oxido: () => new THREE.MeshStandardMaterial({ name: 'arsenal_oxido', color: 0x5a3a28, metalness: 0.55, roughness: 0.85, roughnessMap: rugAcero(), envMapIntensity: 0.8 }),
  laton: () => new THREE.MeshStandardMaterial({ name: 'arsenal_laton', color: 0xd8a948, metalness: 1, roughness: 0.3, envMapIntensity: 1.8 }),
  cromo: () => new THREE.MeshStandardMaterial({ name: 'arsenal_cromo', color: 0xe2e6ea, metalness: 1, roughness: 0.12, envMapIntensity: 2 }),
  // maderas y cuero
  nogal: () => new THREE.MeshStandardMaterial({ name: 'arsenal_nogal', map: tex('nogal', () => texMadera('#5b3820', '#2a160a', '#8a5a34', 31)), color: 0xffffff, metalness: 0, roughness: 0.5, envMapIntensity: 0.7 }),
  madera_c: () => new THREE.MeshStandardMaterial({ name: 'arsenal_fresno', map: tex('fresno', () => texMadera('#b88e5c', '#6e4a28', '#e0bd8a', 47, 0.8)), metalness: 0, roughness: 0.62, envMapIntensity: 0.6 }),
  madera_o: () => new THREE.MeshStandardMaterial({ name: 'arsenal_ebano', map: tex('ebano', () => texMadera('#2a1c14', '#0e0804', '#4a3220', 53)), metalness: 0, roughness: 0.4, envMapIntensity: 0.9 }),
  madera_g: () => new THREE.MeshStandardMaterial({ name: 'arsenal_madera_gastada', map: tex('gastada', () => texMadera('#7a6244', '#3c2c1a', '#a08a64', 61, 1.2)), metalness: 0, roughness: 0.82, envMapIntensity: 0.4 }),
  cuero: () => new THREE.MeshStandardMaterial({ name: 'arsenal_cuero', map: texCuero(), metalness: 0, roughness: 0.62, envMapIntensity: 0.5 }),
  cuerda: () => new THREE.MeshStandardMaterial({ name: 'arsenal_cuerda', map: texCuerda(), metalness: 0, roughness: 0.95 }),
  lona: () => new THREE.MeshStandardMaterial({ name: 'arsenal_lona', map: texLona(), metalness: 0, roughness: 0.95 }),
  papel: () => new THREE.MeshStandardMaterial({ name: 'arsenal_papel', color: 0xd9c9a0, metalness: 0, roughness: 0.9 }),
  rojo_dinamita: () => new THREE.MeshStandardMaterial({ name: 'arsenal_rojo', color: 0xa8281c, metalness: 0, roughness: 0.7 }),
  // sintéticos
  polimero: () => new THREE.MeshStandardMaterial({ name: 'arsenal_polimero', color: 0x23262b, metalness: 0.1, roughness: 0.6, roughnessMap: rugPol(), envMapIntensity: 0.9 }),
  polimero_c: () => new THREE.MeshStandardMaterial({ name: 'arsenal_polimero_arena', color: 0x8a7a58, metalness: 0.05, roughness: 0.68, roughnessMap: rugPol(), envMapIntensity: 0.8 }),
  oliva: () => new THREE.MeshStandardMaterial({ name: 'arsenal_oliva', color: 0x56603a, metalness: 0.25, roughness: 0.62, roughnessMap: rugAcero(), envMapIntensity: 0.9 }),
  caucho: () => new THREE.MeshStandardMaterial({ name: 'arsenal_caucho', color: 0x121314, metalness: 0, roughness: 0.92 }),
  negro: () => new THREE.MeshStandardMaterial({ name: 'arsenal_negro', color: 0x030303, metalness: 0, roughness: 1 }),
  cristal: () => new THREE.MeshStandardMaterial({ name: 'arsenal_cristal', color: 0x1a3a52, metalness: 0.2, roughness: 0.05, envMapIntensity: 2.4, emissive: 0x0a2a44, emissiveIntensity: 0.6 }),
  vidrio_c: () => new THREE.MeshStandardMaterial({ name: 'arsenal_vidrio', color: 0xaecfdc, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.55, envMapIntensity: 2 }),
  composite: () => new THREE.MeshStandardMaterial({ name: 'arsenal_composite', map: texComposite(), color: 0xffffff, metalness: 0.15, roughness: 0.28, envMapIntensity: 1.3 }),
  composite_n: () => new THREE.MeshStandardMaterial({ name: 'arsenal_composite_negro', color: 0x0d1016, metalness: 0.6, roughness: 0.22, roughnessMap: rugPol(), envMapIntensity: 1.6 }),
  composite_g: () => new THREE.MeshStandardMaterial({ name: 'arsenal_composite_gris', color: 0x5c6670, metalness: 0.7, roughness: 0.3, roughnessMap: rugAcero(), envMapIntensity: 1.5 }),
  // emisivos HDR (bloom): emissiveIntensity > 1
  em_cian: () => emis(0x40e8ff, 3.4),
  em_azul: () => emis(0x4a8cff, 3.0),
  em_magenta: () => emis(0xff40d0, 3.2),
  em_violeta: () => emis(0xa070ff, 3.4),
  em_naranja: () => emis(0xff7a28, 3.6),
  em_rojo: () => emis(0xff2a1a, 3.2),
  em_verde: () => emis(0x50ff7a, 2.8),
  em_ambar: () => emis(0xffb030, 3.0),
  em_blanco: () => emis(0xeaf6ff, 3.0),
  brasa: () => emis(0xff5a10, 2.2),
  mecha: () => emis(0xffc060, 4.0),
};
function emis(color, i) {
  return new THREE.MeshStandardMaterial({ name: 'arsenal_emisivo', color: 0x101214, emissive: color, emissiveIntensity: i, metalness: 0, roughness: 0.4, toneMapped: false });
}

/** Material compartido por clave (ver DEF). Un nombre desconocido devuelve acero. */
export function matArma(clave) {
  let m = cache.get(clave);
  if (!m) { m = (DEF[clave] || DEF.acero)(); m.userData.compartido = true; cache.set(clave, m); }
  return m;
}
export const clavesMateriales = () => Object.keys(DEF);

/** Libera materiales y texturas del Arsenal (se recrean bajo demanda). */
export function liberarMaterialesArsenal() {
  for (const m of cache.values()) m.dispose();
  for (const t of texCache.values()) t.dispose();
  cache.clear(); texCache.clear();
}
