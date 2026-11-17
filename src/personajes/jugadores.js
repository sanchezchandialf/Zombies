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

export function crearVisualesJugadores(juego) {
  const lista = [];
  const sis = {
    juego, escena: juego.render?.escena ?? juego.escena,
    crearSombra() { sombraCompartida(); const m = new THREE.Mesh(geoSombra, matSombra); m.position.y = 0.025; m.renderOrder = 1; m.name = 'sombra'; return m; },
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
    },
  };
}
