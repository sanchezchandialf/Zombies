// Sistema de visuales de los jugadores (ver docs/ARQUITECTURA.md §Personajes).
// Cinco héroes × seis atuendos de época, modelados por código y animados de forma procedural.
import * as THREE from 'three';
import { VisualJugador } from './jugador/visual.js';
import { liberarGeometrias } from './jugador/geo.js';
import { liberarMateriales } from './jugador/mat.js';
import { liberarAtuendos } from './jugador/atuendos.js';
import { liberarAuras } from './jugador/auras.js';

let texSombra = null, matSombra = null, geoSombra = null;
function sombraCompartida() {
  if (matSombra) return;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.55, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  texSombra = new THREE.CanvasTexture(c);
  matSombra = new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false, opacity: 0.45, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  geoSombra = new THREE.PlaneGeometry(1.35, 1.35).rotateX(-Math.PI / 2);
}

// Anillo de rol en el suelo: aro fino con halo suave y una punta hacia donde mira el héroe. Identifica al jugador al
// instante sobre cualquier suelo (contorno oscuro + color de rol), sin tapar la acción.
let texAnillo = null, geoAnillo = null;
const matsAnillo = new Map();
function texturaAnillo() {
  if (texAnillo) return texAnillo;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), m = N / 2;
  // halo interior muy tenue
  const g = x.createRadialGradient(m, m, N * 0.2, m, m, N * 0.4);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  // contorno oscuro que separa el aro de suelos claros
  x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = N * 0.05;
  x.beginPath(); x.arc(m, m, N * 0.4, 0, Math.PI * 2); x.stroke();
  // aro (blanco: se tiñe con el color del rol)
  x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = N * 0.022;
  x.beginPath(); x.arc(m, m, N * 0.4, 0, Math.PI * 2); x.stroke();
  // punta de dirección (abajo del lienzo = +Z local = adelante)
  x.fillStyle = 'rgba(0,0,0,0.55)';
  x.beginPath(); x.moveTo(m - N * 0.085, N * 0.885); x.lineTo(m, N * 0.985); x.lineTo(m + N * 0.085, N * 0.885); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,1)';
  x.beginPath(); x.moveTo(m - N * 0.06, N * 0.895); x.lineTo(m, N * 0.965); x.lineTo(m + N * 0.06, N * 0.895); x.closePath(); x.fill();
  texAnillo = new THREE.CanvasTexture(c); texAnillo.colorSpace = THREE.SRGBColorSpace; texAnillo.anisotropy = 4;
  geoAnillo = new THREE.PlaneGeometry(1.9, 1.9).rotateX(-Math.PI / 2);
  return texAnillo;
}
function materialAnillo(color) {
  const k = String(color);
  let m = matsAnillo.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      map: texturaAnillo(), color: new THREE.Color(color).multiplyScalar(1.35), transparent: true, opacity: 0.9, depthWrite: false,
      toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    matsAnillo.set(k, m);
  }
  return m;
}

export function crearVisualesJugadores(juego) {
  const lista = [];
  const sis = {
    juego, escena: juego.render?.escena ?? juego.escena,
    crearSombra() { sombraCompartida(); const m = new THREE.Mesh(geoSombra, matSombra); m.position.y = 0.025; m.renderOrder = 1; m.name = 'sombra'; return m; },
    crearAnillo(color = '#ffffff') { const m = new THREE.Mesh((texturaAnillo(), geoAnillo), materialAnillo(color)); m.position.y = 0.03; m.renderOrder = 2; m.name = 'anilloRol'; return m; },
    quitar(v) { const i = lista.indexOf(v); if (i >= 0) lista.splice(i, 1); },
  };
  return {
    crear(rolId, eraIdx = 0) {
      const v = new VisualJugador(sis, rolId, eraIdx);
      lista.push(v);
      return v;
    },
    actualizar(dt) { for (let i = lista.length - 1; i >= 0; i--) lista[i].actualizar(dt); },
    limpiar() {
      for (const v of lista.slice()) v.liberar();
      lista.length = 0;
      liberarAtuendos(); liberarGeometrias(); liberarMateriales(); liberarAuras();
      matSombra?.dispose(); texSombra?.dispose(); geoSombra?.dispose(); matSombra = texSombra = geoSombra = null;
      for (const m of matsAnillo.values()) m.dispose(); matsAnillo.clear(); texAnillo?.dispose(); geoAnillo?.dispose(); texAnillo = geoAnillo = null;
    },
  };
}
