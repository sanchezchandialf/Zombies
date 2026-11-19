// ERA Z · Zona de Cuarentena 7 · Carteles (texto en español) pintados en un atlas de lienzo y fundidos en UNA malla.
import * as THREE from 'three';

// Atlas 1024×1024: dos banderolas apaisadas (1024×205) y cuatro carteles (512×256).
const CELDAS = {
  banda1: { x: 0, y: 0, w: 1024, h: 205 },
  banda2: { x: 0, y: 205, w: 1024, h: 205 },
  alto: { x: 0, y: 410, w: 512, h: 256 },
  biologico: { x: 512, y: 410, w: 512, h: 256 },
  prohibido: { x: 0, y: 666, w: 512, h: 256 },
  hospital: { x: 512, y: 666, w: 512, h: 256 },
};
const FUENTE = '"Arial Black","Impact","Helvetica Neue",Arial,sans-serif';

function texto(g, t, x, y, tam, color, ancho, peso = 'bold') {
  g.font = `${peso} ${tam}px ${FUENTE}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color;
  let m = g.measureText(t).width;
  if (ancho && m > ancho) { tam *= ancho / m; g.font = `${peso} ${tam}px ${FUENTE}`; }
  g.fillText(t, x, y);
}
function trebol(g, cx, cy, r, color) {
  g.save(); g.translate(cx, cy); g.fillStyle = color; g.strokeStyle = color;
  for (let i = 0; i < 3; i++) {
    g.save(); g.rotate((i * 2 * Math.PI) / 3);
    g.beginPath(); g.arc(0, -r * 0.62, r * 0.5, 0, Math.PI * 2); g.lineWidth = r * 0.17; g.stroke();
    g.beginPath(); g.arc(0, -r * 0.62, r * 0.17, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.beginPath(); g.arc(0, 0, r * 0.17, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(0, 0, r * 0.28, 0, Math.PI * 2); g.lineWidth = r * 0.1; g.stroke();
  g.restore();
}
function rayas(g, x, y, w, h, c1, c2, paso = 34) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = c1; g.fillRect(x, y, w, h); g.fillStyle = c2;
  for (let i = -h; i < w + h; i += paso * 2) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + paso, y + h); g.lineTo(x + i + paso + h, y); g.lineTo(x + i + h, y); g.fill(); }
  g.restore();
}
function marco(g, c, color, grosor = 10) { g.strokeStyle = color; g.lineWidth = grosor; g.strokeRect(c.x + grosor / 2, c.y + grosor / 2, c.w - grosor, c.h - grosor); }

function pintarAtlas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const g = cv.getContext('2d');
  g.fillStyle = '#20262c'; g.fillRect(0, 0, 1024, 1024);
  // banda 1: ZONA DE CUARENTENA 7 (azul clínico, franja roja)
  let c = CELDAS.banda1;
  g.fillStyle = '#0f3a5c'; g.fillRect(c.x, c.y, c.w, c.h);
  g.fillStyle = '#12507c'; g.fillRect(c.x, c.y, c.w, c.h * 0.5);
  rayas(g, c.x, c.y + c.h - 26, c.w, 26, '#d8232a', '#f4f6f8', 30);
  texto(g, 'ZONA DE CUARENTENA 7', c.x + c.w / 2, c.y + 82, 104, '#f4f8fb', 940);
  texto(g, 'ACCESO RESTRINGIDO · AUTORIDAD MILITAR', c.x + c.w / 2, c.y + 158, 36, '#a8d8ff', 900, '600');
  marco(g, c, '#e9f2f8', 8);
  // banda 2: advertencia roja
  c = CELDAS.banda2;
  g.fillStyle = '#b3141b'; g.fillRect(c.x, c.y, c.w, c.h);
  rayas(g, c.x, c.y, c.w, 22, '#111', '#f2c200', 26); rayas(g, c.x, c.y + c.h - 22, c.w, 22, '#111', '#f2c200', 26);
  texto(g, 'CIERRE TOTAL · NO SALIR', c.x + c.w / 2, c.y + 84, 88, '#ffffff', 920);
  texto(g, 'SE AUTORIZA EL USO DE FUERZA LETAL', c.x + c.w / 2, c.y + 150, 38, '#ffe2e0', 900, '600');
  // ALTO
  c = CELDAS.alto;
  g.fillStyle = '#c8161d'; g.fillRect(c.x, c.y, c.w, c.h);
  marco(g, c, '#ffffff', 12);
  texto(g, 'ALTO', c.x + c.w / 2, c.y + 100, 132, '#ffffff', 440);
  texto(g, 'CONTROL SANITARIO', c.x + c.w / 2, c.y + 190, 48, '#ffffff', 440, '700');
  // PELIGRO BIOLÓGICO
  c = CELDAS.biologico;
  g.fillStyle = '#f1c40f'; g.fillRect(c.x, c.y, c.w, c.h);
  rayas(g, c.x, c.y, c.w, 18, '#111', '#f1c40f', 22); rayas(g, c.x, c.y + c.h - 18, c.w, 18, '#111', '#f1c40f', 22);
  trebol(g, c.x + 118, c.y + c.h / 2, 80, '#141414');
  texto(g, 'PELIGRO', c.x + 340, c.y + 98, 66, '#141414', 280);
  texto(g, 'BIOLÓGICO', c.x + 340, c.y + 164, 60, '#141414', 280);
  // PROHIBIDO EL PASO
  c = CELDAS.prohibido;
  g.fillStyle = '#f4f4f2'; g.fillRect(c.x, c.y, c.w, c.h);
  g.fillStyle = '#c8161d'; g.fillRect(c.x, c.y, c.w, 78);
  texto(g, 'PROHIBIDO', c.x + c.w / 2, c.y + 40, 54, '#ffffff', 440);
  texto(g, 'EL PASO', c.x + c.w / 2, c.y + 142, 84, '#c8161d', 440);
  texto(g, 'ZONA RESTRINGIDA', c.x + c.w / 2, c.y + 214, 36, '#222', 440, '700');
  marco(g, c, '#c8161d', 8);
  // HOSPITAL DE CAMPAÑA
  c = CELDAS.hospital;
  g.fillStyle = '#eef6fb'; g.fillRect(c.x, c.y, c.w, c.h);
  g.fillStyle = '#0f6fb4'; g.fillRect(c.x, c.y, c.w, 64);
  texto(g, 'HOSPITAL DE CAMPAÑA', c.x + c.w / 2, c.y + 34, 40, '#ffffff', 470);
  g.fillStyle = '#d8232a'; g.fillRect(c.x + 36, c.y + 118, 100, 34 + 0); g.fillRect(c.x + 69, c.y + 85, 34, 100);
  texto(g, 'TRIAJE', c.x + 300, c.y + 124, 76, '#0f6fb4', 320);
  texto(g, 'URGENCIAS', c.x + 300, c.y + 190, 40, '#2a3640', 320, '700');
  marco(g, c, '#0f6fb4', 8);
  return cv;
}

/**
 * Cartel: caja trasera metálica + plano con el atlas. `poner({ x, y, z, rot, ancho, id, rotX })` (y = centro).
 * El alto sale de la proporción del cartel. `cerrar()` crea la malla única (la llama el mapa al terminar).
 */
export function crearCarteles(kit, matTrasera) {
  const mapa = new THREE.Texture(pintarAtlas());
  mapa.colorSpace = THREE.SRGBColorSpace; mapa.anisotropy = 4; mapa.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ map: mapa, emissiveMap: mapa, emissive: new THREE.Color(0x6a7480), emissiveIntensity: 0.55, roughness: 0.5, metalness: 0.1 });
  mat.name = 'carteles';
  kit._propios.push({ dispose() { mapa.dispose(); mat.dispose(); } });
  const pos = [], uv = [], nor = [], idx = [];
  const api = {
    poner({ x, y, z, rot = 0, ancho = 2, id = 'alto', rotX = 0, grosor = 0.05 }) {
      const c = CELDAS[id], alto = ancho * (c.h / c.w);
      const M = kit.matriz(x, y, z, rot, rotX, 0);
      if (matTrasera) kit.lote0.anadir(kit.cajaRedondeada(ancho + 0.08, alto + 0.08, grosor, 0.012, 1), matTrasera, new THREE.Matrix4().multiplyMatrices(M, kit.matriz(0, 0, -grosor / 2 - 0.002)), { uv: false });
      const v = [[-ancho / 2, -alto / 2], [ancho / 2, -alto / 2], [ancho / 2, alto / 2], [-ancho / 2, alto / 2]];
      const u0 = c.x / 1024, u1 = (c.x + c.w) / 1024, t0 = 1 - (c.y + c.h) / 1024, t1 = 1 - c.y / 1024;
      const uvs = [[u0, t0], [u1, t0], [u1, t1], [u0, t1]];
      const base = pos.length / 3, n = new THREE.Vector3(0, 0, 1);
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Vector3(v[i][0], v[i][1], 0.002).applyMatrix4(M);
        pos.push(p.x, p.y, p.z); uv.push(uvs[i][0], uvs[i][1]);
        const nn = n.clone().transformDirection(M); nor.push(nn.x, nn.y, nn.z);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    },
    cerrar() {
      if (!pos.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); m.name = 'carteles'; m.receiveShadow = true; m.frustumCulled = false;
      kit.anadir(m);
      return m;
    },
  };
  return api;
}
