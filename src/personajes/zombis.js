// PROVISIONAL — lo sustituye el agente Personajes-Zombis. API en docs/ARQUITECTURA.md §Personajes.
import { visualProvisional } from './_provisional.js';
import { ZOMBIS, JEFES } from '../datos/zombis.js';
export function crearVisualesZombis(juego) {
  return {
    crear(claseId, eraIdx, opciones) { const c = ZOMBIS[claseId]; return visualProvisional(juego, c?.color ?? '#88aa77', 1.75 * (c ? c.radio / 0.42 : 1) ** 0.6, c?.radio ?? 0.42); },
    crearJefe(jefeId) { const j = JEFES[jefeId]; return visualProvisional(juego, '#aa3333', 3.6, j?.radio ?? 1.3); },
    actualizar(dt) {}, limpiar() {},
  };
}
