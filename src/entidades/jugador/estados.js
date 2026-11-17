// Estados temporales del jugador: envenenado, ardiendo, ralentizado, silenciado, potenciado, escudo, invisible
// (+ aturdido y derribado, que usan los zombis). Se reflejan en visual.estado(nombre, activo).
import { ESTADOS } from './constantes.js';

const POR_DEFECTO = { envenenado: 4, ardiendo: 3, ralentizado: 3, silenciado: 4, potenciado: 8, escudo: 10, invisible: 5, aturdido: 1, derribado: 1 };
// Estados cuyo nombre se pasa tal cual a visual.estado(); los demás se avisan igualmente (el visual ignora lo que no conozca).
const A_VISUAL = ['envenenado', 'ardiendo', 'ralentizado', 'invisible', 'silenciado', 'potenciado', 'escudo', 'aturdido'];

export function crearEstados() {
  return new Map(); // nombre → { resta, total, datos, acum }
}

/** ¿Es inmune el jugador a este estado? */
function inmune(j, nombre) {
  const r = j.rasgos;
  if (nombre === 'envenenado' && r.inmune?.includes('veneno')) return true;
  if ((nombre === 'derribado' || nombre === 'aturdido') && r.inamovible) return true;
  return false;
}

export function aplicarEstado(j, nombre, duracion, datos) {
  if (!j.vivo && !j.caido) return false;
  if (inmune(j, nombre)) return false;
  const dur = duracion > 0 ? duracion : (POR_DEFECTO[nombre] ?? 3);
  const base = ESTADOS[nombre] ?? {};
  const previo = j.estados.get(nombre);
  if (previo) {
    // Se renueva con el mayor de los dos tiempos; los datos más fuertes mandan.
    previo.resta = Math.max(previo.resta, dur); previo.total = Math.max(previo.total, previo.resta);
    if (datos) previo.datos = { ...previo.datos, ...datos };
  } else {
    j.estados.set(nombre, { resta: dur, total: dur, datos: { ...base, ...datos }, acum: 0 });
    j.visual?.estado?.(nombre, true);
    if (nombre === 'potenciado') j.visual?.estado?.('furia', true);
  }
  if (nombre === 'escudo') j.escudo = Math.max(j.escudo, (datos?.cantidad ?? base.cantidad ?? 60));
  if (nombre === 'invisible') j.invisible = true;
  if (nombre === 'silenciado') j.silenciado = Math.max(j.silenciado, dur);
  if (nombre === 'derribado') j.derribar?.(dur);
  return true;
}

export function quitarEstado(j, nombre) {
  const e = j.estados.get(nombre);
  if (!e) return;
  j.estados.delete(nombre);
  j.visual?.estado?.(nombre, false);
  if (nombre === 'potenciado' && !j.supresionActiva?.()) j.visual?.estado?.('furia', false);
  if (nombre === 'escudo') j.escudo = 0;
  if (nombre === 'invisible') j.invisible = false;
  if (nombre === 'silenciado') j.silenciado = 0;
}

export function quitarTodos(j) { for (const n of [...j.estados.keys()]) quitarEstado(j, n); }

/** Avanza temporizadores y aplica el daño continuo. */
export function actualizarEstados(j, dt) {
  if (!j.estados.size) { j.factorEstado = 1; return; }
  let factor = 1;
  for (const [nombre, e] of j.estados) {
    e.resta -= dt;
    if (e.resta <= 0) { quitarEstado(j, nombre); continue; }
    switch (nombre) {
      case 'envenenado': case 'ardiendo': {
        e.acum += dt;
        if (e.acum >= 0.5) {
          const c = e.datos.dps * e.acum; e.acum = 0;
          j.recibirDanio({ cantidad: c, tipo: e.datos.tipo, dot: true, atacante: e.datos.atacante ?? null, x: j.pos.x, z: j.pos.z, dirX: 0, dirZ: 0 });
          if (!j.vivo && !j.caido) return;
          if (nombre === 'ardiendo') j.juego.fx?.emitir?.('fuego', { x: j.pos.x, y: 0.9, z: j.pos.z }, { escala: 0.6, cantidad: 3 });
        }
        break;
      }
      case 'ralentizado': factor *= e.datos.factor ?? 0.6; break;
      case 'silenciado': j.silenciado = e.resta; break;
      case 'aturdido': factor *= 0.35; break;
      default: break;
    }
  }
  j.factorEstado = factor;
}
