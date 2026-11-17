// Sistema de combate de ERA Z. API en docs/ARQUITECTURA.md §Combate.
//   armas.js        instancias, cadencia, recarga, gatillo, hitscan / perdigones / proyectil
//   especiales.js   llama, arco eléctrico, cuerpo a cuerpo
//   danio.js        aplicarDanio (mods, fuego amigo, críticos, eventos) y explotar (muros, cadena)
//   zonas.js        fuego, gas, ácido, curación, gravedad
//   proyectiles.js  proyectil() genérico y objetos lanzados (lanzar)
//   visuales.js     modelos de proyectil, discos de zona, avisos, tajos
import { crearVisuales } from './visuales.js';
import { instalarDanio } from './danio.js';
import { instalarZonas } from './zonas.js';
import { instalarProyectiles } from './proyectiles.js';
import { instalarArmas } from './armas.js';
import { instalarEspeciales } from './especiales.js';

export function crearCombate(juego) {
  const c = { juego, visuales: crearVisuales(juego) };
  instalarDanio(c);
  instalarZonas(c);
  instalarProyectiles(c);
  instalarArmas(c);
  instalarEspeciales(c);

  c.actualizar = function actualizar(dt) {
    c._actualizarProyectiles(dt);
    c._actualizarZonas(dt);
    c._actualizarCadena();
    c._volcarContinuo();
    c.visuales.actualizar(dt);
  };

  /** Quita proyectiles, zonas, explosiones pendientes y visuales (cambio de mapa o fin de partida). */
  c.limpiar = function limpiar() {
    c._limpiarProyectiles();
    c._limpiarZonas();
    c._limpiarEspeciales();
    c._pendientes.length = 0;
    c.visuales.limpiar();
  };
  return c;
}
