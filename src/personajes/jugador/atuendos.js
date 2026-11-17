// Construye (y cachea por rol+era) la lista de mallas fusionadas de un atuendo completo.
import { Con, cuerpoBase } from './construir.js';
import { RASGOS, hex } from './rasgos.js';
import { ROLES } from '../../datos/roles.js';
import { aplicarEra } from './ropa.js';
import { mat } from './mat.js';

const cache = new Map();

export function atuendo(rolId, eraIdx) {
  const k = rolId + '|' + eraIdx;
  let r = cache.get(k);
  if (r) return r;
  const R = RASGOS[rolId] ?? RASGOS.soldado;
  const A = hex(ROLES[rolId]?.color ?? '#ffffff');
  const c = new Con();
  const T = {
    c, R, A, rol: rolId, P: null,
    /** Bandolera(s) cruzada(s) sobre el pecho */
    cruzado(m, uno = 0, r = 0.013) {
      const w = R.w;
      c.banda('pecho', m, 0.2, 0.245, 0.2 * w, 0.135, 0.2, 0.14, r, 0, 1.06);
      if (!uno) c.banda('pecho', m, 0.2, 0.245, 0.2 * w, 0.135, 0.2, 0.14, r, Math.PI, 1.06);
    },
  };
  const O = aplicarEra(eraIdx, T);
  cuerpoBase(c, R, O);
  r = c.fusionar();
  cache.set(k, r);
  return r;
}

export function liberarAtuendos() {
  for (const lista of cache.values()) for (const p of lista) p.geo.dispose();
  cache.clear();
}
