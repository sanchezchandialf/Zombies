// Pruebas de zombis/IA en Node (sin navegador): node pruebas/zombis.test.mjs
import { Juego } from '../src/nucleo/juego.js';
import { crearZombis } from '../src/entidades/zombis.js';
import { CAPA } from '../src/nucleo/fisica.js';
import { crearCombateFalso, JugadorFalso, EstructuraFalsa, laberinto, pilares } from './falsos.js';
import { ZOMBIS, JEFES } from '../src/datos/zombis.js';

let fallos = 0, total = 0;
function ok(cond, msg, extra = '') { total++; if (!cond) { fallos++; console.log('  ✗ ' + msg + ' ' + extra); } else console.log('  ✓ ' + msg + (extra ? ' ' + extra : '')); }
function seccion(t) { console.log('\n' + t); }

/** Monta un juego aislado con zombis, combate falso y límites ±45. */
export function montar({ semilla = 7, limites = 45 } = {}) {
  const juego = new Juego({ contenedor: null });
  juego.rng = (await_rng(semilla));
  juego.fisica.limites = { minX: -limites, maxX: limites, minZ: -limites, maxZ: limites };
  juego.estado.fase = 'jugando'; juego.estado.dia = 5;
  const combate = crearCombateFalso(juego);
  juego.registrar('combate', combate);
  const sis = crearZombis(juego);
  juego.registrar('zombis', sis);
  sis.iniciar();
  juego.registrar('jugadoresFalsos', { actualizar: (dt) => { for (const j of juego.jugadores) j.actualizar?.(dt); }, posFisica: () => { for (const j of juego.jugadores) j.posFisica?.(); } }, 25);
  return { juego, sis, combate };
}
import { crearRng } from '../src/nucleo/util.js';
function await_rng(s) { return crearRng(s); }

export function correr(juego, seg, dt = 1 / 60, cada = null) {
  const n = Math.round(seg / dt);
  for (let i = 0; i < n; i++) { juego.avanzar(dt); if (cada) cada(i * dt); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { pruebas } = await import('./zombis.casos.mjs');
  await pruebas({ ok, seccion, montar, correr });
  console.log(`\n${total - fallos}/${total} comprobaciones correctas`);
  process.exit(fallos ? 1 : 0);
}
