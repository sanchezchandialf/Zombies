// PROVISIONAL — lo sustituye el agente de Escenarios-base. API en docs/ARQUITECTURA.md §Escenarios.
import * as THREE from 'three';
export function crearEscenarios(juego) {
  let grupo = null;
  const api = {
    actual: null,
    async cargar(eraIdx) {
      if (grupo) grupo.removeFromParent();
      juego.fisica.limpiar();
      grupo = new THREE.Group();
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x4a4f45, roughness: 1 }));
      suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; grupo.add(suelo);
      juego.render.escena.add(grupo);
      juego.fisica.limites = { minX: -45, maxX: 45, minZ: -45, maxZ: 45 };
      api.actual = {
        id: 'provisional', eraIdx, grupo, limites: juego.fisica.limites,
        inicioJugadores: [{ x: 0, z: 0 }, { x: 2, z: 0 }],
        puntosAparicion: [{ x: -42, z: -42, tipo: 'borde' }, { x: 42, z: -42, tipo: 'borde' }, { x: -42, z: 42, tipo: 'borde' }, { x: 42, z: 42, tipo: 'borde' }],
      };
      juego.eventos.emitir('escenario:cargado', { eraIdx, mapa: api.actual });
      return api.actual;
    },
    puntoAparicion(lejosDe) { return juego.rng.elegir(api.actual.puntosAparicion); },
    actualizar(dt) {},
  };
  return api;
}
