// Sistema de visuales de personajes. Delega en jugadores.js (agente Personajes-Jugadores) y zombis.js (agente Personajes-Zombis).
import { crearVisualesJugadores } from './jugadores.js';
import { crearVisualesZombis } from './zombis.js';

export function crearPersonajes(juego) {
  const vj = crearVisualesJugadores(juego);
  const vz = crearVisualesZombis(juego);
  return {
    crearJugador: (rolId, eraIdx) => vj.crear(rolId, eraIdx),
    crearZombi: (claseId, eraIdx, opciones) => vz.crear(claseId, eraIdx, opciones),
    crearJefe: (jefeId) => vz.crearJefe(jefeId),
    limpiar() { vj.limpiar?.(); vz.limpiar?.(); },
    actualizar(dt) { vj.actualizar(dt); vz.actualizar(dt); },
  };
}
