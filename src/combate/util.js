// Utilidades internas del sistema de combate (no forman parte del contrato público).
import { CAPA } from '../nucleo/fisica.js';

/** Gravedad de los proyectiles y objetos lanzados (m/s²). Algo menor que la real: parábolas más legibles desde la cámara. */
export const GRAVEDAD = 20;
/** Altura media del impacto sobre un cuerpo (m). */
export const ALTURA_PECHO = 1.0;
/** Duración de un tic de zona y de volcado de daño continuo. */
export const TIC_ZONA = 0.25;
export const TIC_CONTINUO = 0.1;
/** Separación angular mínima: aplica a los cuerpos pequeños en los conos. */
export const GRAD = Math.PI / 180;

/** Entidad dañable dueña de un cuerpo físico, o null (muros, decorado sin vida). */
export function entidadDe(cuerpo) {
  const d = cuerpo?.datos;
  return d && typeof d.recibirDanio === 'function' ? d : null;
}

/** Bando de una entidad o portador. */
export const bandoDe = (e) => e?.bando ?? 'neutral';

/**
 * Factor de daño según los bandos (fuego amigo). `area` = explosión, zona o fuego (el contrato les da un 35 %).
 *  - jugadores → jugadores: balas 0; áreas 0,35
 *  - zombis → zombis: balas 0; áreas 1 (las explosiones de zombis dañan a todos)
 */
export function factorBando(bandoAtacante, bandoObjetivo, area) {
  if (bandoAtacante === 'jugadores' && bandoObjetivo === 'jugadores') return area ? 0.35 : 0;
  if (bandoAtacante === 'zombis' && bandoObjetivo === 'zombis') return area ? 1 : 0;
  return 1;
}

/** ¿Es `ent` un enemigo directo de `bando` (se le puede apuntar con conos y arcos)? Los neutrales (barriles) también cuentan. */
export function esBlancoDe(bando, ent) {
  if (!ent || ent.vivo === false) return false;
  const b = ent.bando ?? 'neutral';
  if (bando === 'jugadores') return b !== 'jugadores';
  if (bando === 'zombis') return b !== 'zombis';
  return true;
}

/**
 * Filtro de cuerpos para los rayos del portador: atraviesa a sus propios aliados y a sí mismo,
 * y se detiene en muros (datos nulos) y en el resto.
 */
export function filtroBalas(portador) {
  const bando = bandoDe(portador);
  const propio = portador?.cuerpo ?? null;
  return (cuerpo) => {
    if (cuerpo === propio) return false;
    const e = cuerpo.datos;
    if (!e) return true;
    if (e === portador) return false;
    if (typeof e.recibirDanio !== 'function') return true; // decorado sólido
    if (e.vivo === false) return false;
    const b = e.bando ?? 'neutral';
    return !(b === bando && bando !== 'neutral');
  };
}

/** Máscara de colisión de un proyectil según el bando que lo dispara. */
export function mascaraDeBando(bando) {
  if (bando === 'zombis') return CAPA.ESTATICO | CAPA.JUGADOR | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;
  if (bando === 'jugadores') return CAPA.ESTATICO | CAPA.ZOMBI | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;
  return CAPA.ESTATICO | CAPA.JUGADOR | CAPA.ZOMBI | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;
}

/** Factor de daño por distancia: 1 hasta `caida[0]·alcance` y lineal hasta `caida[1]` en el alcance. */
export function factorCaida(def, distancia) {
  const c = def.caida;
  if (!c || !def.alcance) return 1;
  const ini = c[0] * def.alcance;
  if (distancia <= ini) return 1;
  const t = Math.min(1, (distancia - ini) / Math.max(0.001, def.alcance - ini));
  return 1 + (c[1] - 1) * t;
}

/** Material de un cuerpo que no es una entidad (muro, roca…). */
export const materialDeCuerpo = (cuerpo) => cuerpo?.datos?.material ?? cuerpo?.material ?? 'piedra';

/** Coste de atravesar una entidad con un proyectil perforante: la carne cuesta 1; metal y piedra, 2. */
export function costePerforar(ent) {
  const m = ent?.material;
  return m === 'metal' || m === 'piedra' ? 2 : 1;
}

/** Radio efectivo de un blanco (para conos y explosiones). */
export const radioDe = (ent) => ent?.radio ?? ent?.cuerpo?.radio ?? 0.4;

/** Posición plana del blanco. */
export function posDe(ent, out) {
  const p = ent.pos ?? ent.cuerpo;
  out.x = p?.x ?? 0; out.z = p?.z ?? 0;
  return out;
}

/** Altura de impacto razonable sobre un blanco. */
export function alturaImpacto(ent) {
  const a = ent?.visual?.altura ?? ent?.altura;
  return a ? a * 0.62 : ALTURA_PECHO;
}

/** Normaliza (x, z); devuelve la longitud. Si es nulo deja (0, 1). */
export function normalizar(v) {
  const l = Math.hypot(v.x, v.z);
  if (l < 1e-9) { v.x = 0; v.z = 1; return 0; }
  v.x /= l; v.z /= l; return l;
}

/** ¿El estado de pausa o menú congela el combate? (nunca se llama con dt>0 en pausa; protección extra para pruebas.) */
export const finito = (n, def = 0) => (Number.isFinite(n) ? n : def);
