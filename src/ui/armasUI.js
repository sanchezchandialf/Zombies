// Iconos de arma para la interfaz: usa `crearIconoArma` del Arsenal si existe y, si no, una silueta SVG por arquetipo.
import * as modelos from '../armas/modelos.js';
import { ARMAS } from '../datos/armas.js';
import { iconoArma } from './iconos.js';
import { escapar } from './util.js';

const cache = new Map();

/** HTML del icono del arma `armaId` (def o id). Se cachea; el canvas del Arsenal se convierte en imagen una sola vez. */
export function iconoDeArma(arma, tam = 128) {
  const def = typeof arma === 'string' ? ARMAS[arma] : arma;
  if (!def) return iconoArma('fusil');
  const clave = def.id + ':' + tam;
  if (cache.has(clave)) return cache.get(clave);
  let h = null;
  try {
    const clave_ = 'crearIconoArma'; const f = modelos[clave_];
    if (typeof f === 'function') {
      const c = f(def.id, tam);
      if (c && c.toDataURL) h = `<img class="ico-arma" alt="${escapar(def.nombre)}" draggable="false" src="${c.toDataURL('image/png')}">`;
    }
  } catch (e) { console.error('[ui] crearIconoArma', def.id, e); }
  if (!h) h = iconoArma(def.arquetipo, 'ico-arma-svg');
  cache.set(clave, h);
  return h;
}

export const nombreArma = (def) => def?.nombre ?? '—';
