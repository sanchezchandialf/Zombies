// Temas de era de la interfaz. La tipografía, los colores y las formas viven en CSS (`.ez[data-era="n"]`);
// aquí se generan los ornamentos de esquina (SVG en línea como imagen de fondo) y se aplican al elemento raíz.
import { ERAS } from '../datos/eras.js';

/** Pieza de esquina superior izquierda (32×32) de cada era; las otras tres esquinas son reflejos. */
const ESQUINA = [
  // 0 · grabado: filete doble con voluta y punto
  (c) => `<path d="M2.500 30V11Q2.500 2.500 11 2.500H30" fill="none" stroke="${c}" stroke-width="1.600"/><path d="M6.500 30V14q0-7.500 7.500-7.500H30" fill="none" stroke="${c}" stroke-width=".9" opacity=".7"/><circle cx="5" cy="5" r="2.400" fill="${c}"/><path d="M12 12q4-1 5 3-4 2-5-3z" fill="${c}" opacity=".8"/>`,
  // 1 · cartel: esquina de entrada perforada con estrella
  (c) => `<path d="M0 0h18a8 8 0 0 1-8 8 8 8 0 0 1-8 8 8 8 0 0 1-2-.5z" fill="${c}"/><path d="M9 21l1.400 3 3.100.3-2.300 2 .7 3.100L9 27.800 6.100 29.400l.7-3.100-2.300-2 3.100-.3z" fill="${c}" opacity=".85"/>`,
  // 2 · estarcido: escuadra gruesa con remache
  (c) => `<path d="M2 30V2h28" fill="none" stroke="${c}" stroke-width="4.500" stroke-linecap="square"/><circle cx="11" cy="11" r="2.500" fill="${c}"/><path d="M2 30h6M30 2v6" stroke="${c}" stroke-width="4.500" opacity=".0"/>`,
  // 3 · neón: arco redondeado con destello
  (c) => `<path d="M3 29V13A10 10 0 0 1 13 3h16" fill="none" stroke="${c}" stroke-width="2.600" stroke-linecap="round"/><path d="M9 9l1.200 3.200L13.500 13.500l-3.300 1.200L9 18l-1.200-3.300L4.500 13.500l3.300-1.300z" fill="#fff" opacity=".9"/>`,
  // 4 · táctica: corchete con marcas
  (c) => `<path d="M1.500 20V1.500H20" fill="none" stroke="${c}" stroke-width="2"/><path d="M1.500 25v4M1.500 24.500v6M6 1.500h0M24 1.500h5" stroke="${c}" stroke-width="1.400"/><path d="M6.500 6.500h5" stroke="${c}" stroke-width="1.400" opacity=".7"/>`,
  // 5 · holograma: contorno hexagonal con rombo
  (c) => `<path d="M1.500 30V9l7.500-7.500H30" fill="none" stroke="${c}" stroke-width="1.200"/><path d="M6 30V11l5-5h19" fill="none" stroke="${c}" stroke-width=".8" opacity=".55"/><path d="M12 12l3 3-3 3-3-3z" fill="${c}" opacity=".85"/>`,
];

const uri = (inner) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${inner}</svg>`)}")`;

const _cache = new Map();
function esquinas(eraIdx) {
  if (_cache.has(eraIdx)) return _cache.get(eraIdx);
  const era = ERAS[eraIdx] || ERAS[0];
  const base = (ESQUINA[eraIdx] || ESQUINA[0])(era.color);
  const r = {
    tl: uri(base),
    tr: uri(`<g transform="translate(32 0) scale(-1 1)">${base}</g>`),
    bl: uri(`<g transform="translate(0 32) scale(1 -1)">${base}</g>`),
    br: uri(`<g transform="translate(32 32) scale(-1 -1)">${base}</g>`),
  };
  _cache.set(eraIdx, r);
  return r;
}

function aRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Aplica el tema de la era `eraIdx` al elemento raíz (variables de color y ornamentos). */
export function aplicarTema(raiz, eraIdx) {
  const i = Math.max(0, Math.min(ERAS.length - 1, eraIdx | 0));
  const era = ERAS[i];
  const o = esquinas(i);
  raiz.dataset.era = String(i);
  const s = raiz.style;
  s.setProperty('--era', era.color);
  s.setProperty('--era-rgb', aRgb(era.color));
  s.setProperty('--orn-tl', o.tl); s.setProperty('--orn-tr', o.tr);
  s.setProperty('--orn-bl', o.bl); s.setProperty('--orn-br', o.br);
}

export const colorEra = (i) => (ERAS[i] || ERAS[0]).color;
export const rgbEra = (i) => aRgb((ERAS[i] || ERAS[0]).color);
