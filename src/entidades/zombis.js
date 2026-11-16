// PROVISIONAL — lo sustituye el agente de Zombis-IA. API en docs/ARQUITECTURA.md §Zombis.
export function crearZombis(juego) {
  return {
    generar(claseId, x, z, opciones) { return null; },
    generarJefe(jefeId, x, z) { return null; },
    atraer(x, z, radio, duracion) {},
    navegacion: { reconstruir() {}, direccion(x, z, out) { return out; } },
    limpiar() { juego.zombis.length = 0; },
    actualizar(dt) {}, posFisica(dt) {},
  };
}
