// PROVISIONAL — lo sustituye el agente Personajes-Jugadores. API en docs/ARQUITECTURA.md §Personajes.
import { visualProvisional } from './_provisional.js';
import { ROLES } from '../datos/roles.js';
export function crearVisualesJugadores(juego) {
  return {
    crear(rolId, eraIdx) { return visualProvisional(juego, ROLES[rolId]?.color ?? '#ffffff'); },
    actualizar(dt) {}, limpiar() {},
  };
}
