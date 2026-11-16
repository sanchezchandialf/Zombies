// PROVISIONAL — lo sustituye el agente de UI. API en docs/ARQUITECTURA.md §UI.
export function crearUI(juego) {
  return { siempre: true, mensaje(texto, opciones) {}, actualizar(dt) {} };
}
