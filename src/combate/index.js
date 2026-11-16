// PROVISIONAL — lo sustituye el agente de Combate. API en docs/ARQUITECTURA.md §Combate.
import { ARMAS } from '../datos/armas.js';
export function crearCombate(juego) {
  return {
    crearArma(armaId, portador) { const def = ARMAS[armaId]; return { def, id: armaId, municion: def?.cargador ?? 0, reserva: 0, recargando: false, progresoRecarga: 0, enfriamiento: 0 }; },
    actualizarArma(inst, dt, portador) {},
    gatillo(portador, inst, origen, rot, apretado, recienApretado) { return false; },
    recargar(inst, portador) { return false; },
    golpear(portador, armaId, origen, rot) { return false; },
    lanzar(portador, armaId, origen, destino) {},
    aplicarDanio(objetivo, info) { return objetivo?.recibirDanio ? objetivo.recibirDanio(info) : 0; },
    explotar(opciones) {},
    crearZona(opciones) { return { activo: true, quitar() {} }; },
    proyectil(opciones) { return null; },
    limpiar() {},
    actualizar(dt) {},
  };
}
