// PROVISIONAL — lo sustituye el agente de Vehículos. API en docs/ARQUITECTURA.md §Vehículos.
export function crearVehiculos(juego) {
  const lista = [];
  return {
    lista,
    crear(vehiculoId, opciones) { return null; },
    limpiar() { lista.length = 0; },
    actualizar(dt) {}, posFisica(dt) {},
  };
}
