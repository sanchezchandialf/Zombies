// Retratos SVG de los roles, las clases de zombi y los jefes. Todo procedural, sin recursos externos.
// retratoRol(rolId) · retratoZombi(claseId) · retratoJefe(jefeId) → cadena <svg>
import { ROLES } from '../datos/roles.js';
import { ZOMBIS, JEFES } from '../datos/zombis.js';

let _n = 0;
const uid = () => `rt${++_n}`;

/** Mezcla de colores hex (a→b, t 0..1). */
function mezclar(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const oscuro = (c, t = 0.45) => mezclar(c, '#0a0c10', t);
const claro = (c, t = 0.4) => mezclar(c, '#ffffff', t);

const marco = (id, acento, cuerpo) => `
<defs>
  <radialGradient id="${id}f" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${mezclar(acento, '#1a1f2a', 0.55)}"/><stop offset="1" stop-color="#0b0d12"/></radialGradient>
  <linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1c9a8"/><stop offset="1" stop-color="#c98f6a"/></linearGradient>
  <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${claro(acento, 0.25)}"/><stop offset="1" stop-color="${oscuro(acento, 0.35)}"/></linearGradient>
  <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4350"/><stop offset="1" stop-color="#171b22"/></linearGradient>
  <clipPath id="${id}c"><rect width="120" height="140" rx="10"/></clipPath>
</defs>
<g clip-path="url(#${id}c)">
  <rect width="120" height="140" fill="url(#${id}f)"/>
  <circle cx="60" cy="62" r="46" fill="${acento}" opacity=".14"/>
  <path d="M0 118 120 98v42H0z" fill="${acento}" opacity=".10"/>
  ${cuerpo}
</g>`;

const svg = (c, vb = '0 0 120 140', cls = 'retrato') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${c}</svg>`;

// Cabeza humana base: óvalo + orejas + cuello. `y` desplaza verticalmente.
const cabeza = (id, y = 0) => `
  <rect x="50" y="${74 + y}" width="20" height="22" rx="6" fill="#b87c58"/>
  <ellipse cx="38.500" cy="${58 + y}" rx="3.600" ry="6" fill="#d9a07e"/><ellipse cx="81.500" cy="${58 + y}" rx="3.600" ry="6" fill="#d9a07e"/>
  <ellipse cx="60" cy="${57 + y}" rx="21" ry="26" fill="url(#${id}p)"/>`;
const ojos = (y = 0, c = '#20150f', sep = 8.500) => `
  <ellipse cx="${60 - sep}" cy="${58 + y}" rx="2.600" ry="2.100" fill="${c}"/><ellipse cx="${60 + sep}" cy="${58 + y}" rx="2.600" ry="2.100" fill="${c}"/>
  <path d="M${60 - sep - 5} ${53.500 + y}q5-3 10 0M${60 + sep - 5} ${53.500 + y}q5-3 10 0" stroke="#3a261b" stroke-width="2" fill="none" stroke-linecap="round"/>`;

// ───────────────────────────── ROLES ─────────────────────────────
const ROL = {
  soldado(id, c) {
    return marco(id, c, `
      <path d="M8 140c0-26 16-40 40-44l12 10 12-10c24 4 40 18 40 44z" fill="url(#${id}t)"/>
      <path d="M8 140c0-26 16-40 40-44l-4 44z" fill="#2a303a" opacity=".6"/>
      <path d="M22 118l-12 22h30zM98 118l12 22H80z" fill="${oscuro(c, 0.55)}" opacity=".5"/>
      <rect x="14" y="116" width="26" height="9" rx="2" fill="url(#${id}a)"/>
      <path d="M48 96l12 12 12-12v8l-12 12-12-12z" fill="#252a33"/>
      ${cabeza(id)}
      <path d="M45 68q15 17 30 0v6q-15 20-30 0z" fill="#2b2118" opacity=".35"/>
      ${ojos()}
      <path d="M54 72q6 2.500 12 0" stroke="#7a4a36" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M36 47c0-22 10-31 24-31s24 9 24 31c-5-5-12-8-24-8s-19 3-24 8z" fill="url(#${id}a)"/>
      
      <path d="M33 46h54v5H33z" fill="${oscuro(c, 0.3)}"/>
      <path d="M42 28q18-9 36 0" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M40 72q-3 14 6 20M80 72q3 14-6 20" stroke="${oscuro(c, 0.3)}" stroke-width="2.500" fill="none"/>
      <rect x="58" y="21" width="4" height="9" rx="1.500" fill="${oscuro(c, 0.4)}"/>`);
  },
  medico(id, c) {
    return marco(id, c, `
      <path d="M6 140c0-28 16-42 42-46l12 12 12-12c26 4 42 18 42 46z" fill="#dfe6ea"/>
      <path d="M48 94l12 12-8 10-14-14zM72 94l-12 12 8 10 14-14z" fill="#b9c3ca"/>
      <path d="M50 96l10 14 10-14" stroke="${c}" stroke-width="3" fill="none"/>
      <path d="M36 96c-2 14 2 24 10 30M84 96c2 14-2 24-10 30" stroke="#2a3138" stroke-width="3.500" fill="none" stroke-linecap="round"/>
      <circle cx="46" cy="128" r="5" fill="none" stroke="#2a3138" stroke-width="3"/>
      <path d="M26 50c0-22 10-31 34-31s34 9 34 31c0 20-6 30-9 44l-8-36-17-10-17 10-8 36c-3-14-9-24-9-44z" fill="#4a2f22"/>
      <path d="M80 28q22 10 17 36 2 14-6 24l-5-10q6-26-6-50z" fill="#3b2419"/>
      ${cabeza(id)}
      <path d="M40 46c6-12 14-16 20-16s14 4 20 16c-8-6-14-8-20-8s-12 2-20 8z" fill="#4a2f22"/>
      ${ojos(0, '#1b2a20')}
      <path d="M53 71q7 4 14 0" stroke="#a24a4f" stroke-width="2.600" fill="none" stroke-linecap="round"/>
      <path d="M38 40c2-10 10-16 22-16s20 6 22 16c-8-5-14-7-22-7s-14 2-22 7z" fill="#f4f6f7"/>
      <path d="M38 40q22-10 44 0v5q-22-9-44 0z" fill="#d6dde1"/>
      <path class="x" d="M56 28h8v5h5v7h-5v5h-8v-5h-5v-7h5z" fill="url(#${id}a)" transform="translate(0 -1) scale(1)"/>`);
  },
  ingeniero(id, c) {
    return marco(id, c, `
      <path d="M8 140c0-26 16-40 40-44l12 10 12-10c24 4 40 18 40 44z" fill="#3c4a52"/>
      <path d="M38 98l-6 42h12l4-30zM82 98l6 42H76l-4-30z" fill="${oscuro(c, 0.45)}"/>
      <rect x="30" y="112" width="12" height="8" rx="2" fill="url(#${id}a)"/><rect x="78" y="112" width="12" height="8" rx="2" fill="url(#${id}a)"/>
      <path d="M46 96l14 14 14-14v10l-14 14-14-14z" fill="#d9d2c0"/>
      ${cabeza(id)}
      <path d="M44 66q16 10 32 0 0 10-6 12-10-4-20 0-6-2-6-12z" fill="#5a3a26"/>
      <path d="M50 70q10 3 20 0" stroke="#5a3a26" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${ojos(1)}
      <path d="M36 52c0-20 10-32 24-32s24 12 24 32z" fill="url(#${id}a)"/>
      <path d="M32 52h56v6H32z" fill="${oscuro(c, 0.3)}"/>
      <path d="M58 20h4v14h-4z" fill="${claro(c, 0.2)}"/>
      <rect x="53" y="26" width="14" height="8" rx="3" fill="#fff6c7"/><rect x="53" y="26" width="14" height="8" rx="3" fill="none" stroke="#7a5a1a" stroke-width="1.500"/>
      <rect x="39" y="58" width="42" height="12" rx="6" fill="#15232a" opacity="0"/>
      <g transform="translate(0 -10)"><rect x="40" y="52" width="16" height="12" rx="6" fill="#16222a" stroke="${c}" stroke-width="2.500"/><rect x="64" y="52" width="16" height="12" rx="6" fill="#16222a" stroke="${c}" stroke-width="2.500"/><path d="M56 58h8" stroke="${c}" stroke-width="2.500"/>
      <path d="M44 55q4-2 8 0M68 55q4-2 8 0" stroke="#fff" stroke-opacity=".5" stroke-width="1.500" fill="none"/></g>`);
  },
  cazador(id, c) {
    return marco(id, c, `
      <path d="M10 140c0-26 14-40 38-44l12 12 12-12c24 4 38 18 38 44z" fill="#2a2433"/>
      <path d="M44 94q16 22 32 0l6 8q-22 28-44 0z" fill="${oscuro(c, 0.2)}"/>
      <path d="M46 98q14 16 28 0" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none"/>
      <path d="M26 58c-2-30 12-42 34-42s36 12 34 42c0 22-4 36-8 48l-9-14q4-24-17-38-21 14-17 38l-9 14c-4-12-8-26-8-48z" fill="#241d2e"/>
      ${cabeza(id, 2)}
      <path d="M38 52c4-12 12-18 22-18s18 6 22 18q-22-9-44 0z" fill="#241d2e"/>
      <path d="M40 66q20 10 40 0v8q-20 14-40 0z" fill="${oscuro(c, 0.15)}"/>
      <path d="M44 62h32v6q-16 8-32 0z" fill="${c}" opacity=".9"/>
      <ellipse cx="51.500" cy="60" rx="3" ry="2.200" fill="#fff6e8"/><ellipse cx="68.500" cy="60" rx="3" ry="2.200" fill="#fff6e8"/>
      <circle cx="51.500" cy="60" r="1.400" fill="${c}"/><circle cx="68.500" cy="60" r="1.400" fill="${c}"/>
      <path d="M47 55q4-2.500 9 0M64 55q4-2.500 9 0" stroke="#150f1b" stroke-width="2.200" fill="none" stroke-linecap="round"/>
      <path d="M22 50q38-44 76 0l-10 6q-28-24-56 0z" fill="url(#${id}a)"/>
      <path d="M22 50q38-44 76 0" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none"/>
      <path d="M12 54q48 14 96 0l-4 7q-44 12-88 0z" fill="${oscuro(c, 0.35)}"/>`);
  },
  demoledor(id, c) {
    return marco(id, c, `
      <path d="M0 140c0-22 12-36 34-42l14-4 12 10 12-10 14 4c22 6 34 20 34 42z" fill="#3a2d2b"/>
      <path d="M0 126l30-28 8 14-14 28zM120 126l-30-28-8 14 14 28z" fill="url(#${id}a)"/>
      <path d="M30 100l30 12 30-12v10l-30 14-30-14z" fill="#201a19"/>
      <path d="M52 112h16v28H52z" fill="${oscuro(c, 0.5)}"/><circle cx="46" cy="118" r="3" fill="#bbb" opacity=".6"/><circle cx="74" cy="118" r="3" fill="#bbb" opacity=".6"/>
      <rect x="46" y="76" width="28" height="22" rx="8" fill="#9d6a4b"/>
      ${cabeza(id, 3)}
      <path d="M38 66q22 30 44 0 2 22-22 32-24-10-22-32z" fill="#3b2619"/>
      <path d="M50 78q10 5 20 0" stroke="#150e0a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M34 54c0-20 10-30 26-30s26 10 26 30v10H34z" fill="url(#${id}a)"/>
      <path d="M34 54c0-20 10-30 26-30s26 10 26 30" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none"/>
      <path d="M36 52h48v12q-24 6-48 0z" fill="#151012"/>
      <path d="M40 58h40v3H40z" fill="#ff7a5c"/><path d="M40 58h40v3H40z" fill="#ff7a5c" opacity=".5" filter="blur(1)"/>
      <path d="M60 24v28" stroke="${oscuro(c, 0.4)}" stroke-width="4"/>
      <path d="M42 36q6-6 12-7M78 36q-6-6-12-7" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/>`);
  },
};

export function retratoRol(rolId, clase = 'retrato') {
  const rol = ROLES[rolId];
  const f = ROL[rolId];
  if (!rol || !f) return svg('<rect width="120" height="140" rx="10" fill="#161a22"/>', '0 0 120 140', clase);
  return svg(f(uid(), rol.color), '0 0 120 140', clase);
}

// ───────────────────────────── ZOMBIS ─────────────────────────────
function marcoZ(id, c, cuerpo) {
  return `
<defs>
  <radialGradient id="${id}f" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${mezclar(c, '#0b0f0c', 0.62)}"/><stop offset="1" stop-color="#080a0b"/></radialGradient>
  <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${claro(c, 0.18)}"/><stop offset="1" stop-color="${oscuro(c, 0.45)}"/></linearGradient>
  <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b4bcc6"/><stop offset="1" stop-color="#4a525c"/></linearGradient>
  <clipPath id="${id}c"><rect width="100" height="100" rx="9"/></clipPath>
</defs>
<g clip-path="url(#${id}c)"><rect width="100" height="100" fill="url(#${id}f)"/>
<circle cx="50" cy="48" r="36" fill="${c}" opacity=".13"/>
${cuerpo}</g>`;
}
const ojosZ = (x, y, sep = 9, r = 3.600, col = '#f4f0b0') => `<circle cx="${x - sep}" cy="${y}" r="${r}" fill="#0a0c08"/><circle cx="${x + sep}" cy="${y}" r="${r}" fill="#0a0c08"/><circle cx="${x - sep}" cy="${y}" r="${r * 0.48}" fill="${col}"/><circle cx="${x + sep}" cy="${y}" r="${r * 0.48}" fill="${col}"/>`;
const dientes = (x, y, w) => `<path d="M${x - w} ${y}q${w} ${w * 0.9} ${w * 2} 0v${w * 0.5}q-${w} ${w * 0.5}-${w * 2} 0z" fill="#150808"/><path d="M${x - w + 2} ${y + 1}v3M${x - w / 2} ${y + 2}v4M${x + w / 2} ${y + 2}v4M${x + w - 2} ${y + 1}v3" stroke="#e8dcb0" stroke-width="1.600" stroke-linecap="round"/>`;
const hombros = (id, c) => `<path d="M0 100c0-18 12-26 28-30l22 6 22-6c16 4 28 12 28 30z" fill="${oscuro(c, 0.55)}"/><path d="M8 100c2-12 10-18 22-21l-6 21z" fill="#000" opacity=".25"/><path d="M30 76l6 10-9 6M70 76l-6 10 11 8" stroke="#2a0f10" stroke-width="2" fill="none"/>`;

const ZOM = {
  caminante(id, c) {
    return marcoZ(id, c, `${hombros(id, c)}
      <g transform="rotate(-9 50 50)"><rect x="43" y="62" width="14" height="14" fill="${oscuro(c, 0.3)}"/>
      <ellipse cx="50" cy="44" rx="20" ry="23" fill="url(#${id}s)"/>
      <path d="M32 36q4-10 14-12M60 26q10 3 12 12" stroke="#2a3a24" stroke-width="2" fill="none"/>
      ${ojosZ(50, 42, 8.500)}
      <path d="M40 28l5 7M57 33l6 4" stroke="#5a1214" stroke-width="2.200" stroke-linecap="round"/>
      ${dientes(50, 55, 7)}
      <path d="M34 50q-2 8 1 14" stroke="#6a1214" stroke-width="2.500" fill="none"/></g>`);
  },
  corredor(id, c) {
    return marcoZ(id, c, `
      <path d="M2 60h26M0 72h22M6 84h20" stroke="${c}" stroke-opacity=".5" stroke-width="2.500" stroke-linecap="round"/>
      <path d="M12 100c0-14 12-22 26-26l20-2c14 2 28 10 30 28z" fill="${oscuro(c, 0.55)}"/>
      <g transform="rotate(14 56 50)"><rect x="48" y="62" width="11" height="14" fill="${oscuro(c, 0.3)}"/>
      <ellipse cx="56" cy="44" rx="15" ry="22" fill="url(#${id}s)"/>
      ${ojosZ(56, 38, 6.500, 4.400, '#ffe86a')}
      <path d="M46 26l6 8M64 26l-5 8" stroke="#5a1214" stroke-width="2" stroke-linecap="round"/>
      <path d="M46 52q10 9 20 0q-3 11-10 11t-10-11z" fill="#150808"/><path d="M49 53v3M54 54v4M59 54v4M63 53v3" stroke="#e8dcb0" stroke-width="1.500" stroke-linecap="round"/></g>`);
  },
  acorazado(id, c) {
    return marcoZ(id, c, `
      <path d="M0 100c0-16 10-24 24-28l26 4 26-4c14 4 24 12 24 28z" fill="url(#${id}m)"/>
      <path d="M0 86c6-10 14-14 26-15v14zM100 86c-6-10-14-14-26-15v14z" fill="#5a626d"/>
      <path d="M18 80l32 8 32-8" stroke="#2c3138" stroke-width="2" fill="none"/>
      <rect x="43" y="62" width="14" height="12" fill="${oscuro(c, 0.3)}"/>
      <ellipse cx="50" cy="42" rx="19" ry="22" fill="url(#${id}s)"/>
      <path d="M28 44c-2-22 8-34 22-34s24 12 22 34l-5 6V40H33v10z" fill="url(#${id}m)"/>
      <path d="M33 42h34v6H33z" fill="#0b0d0f"/>
      <circle cx="42" cy="45" r="2.200" fill="#f4f0b0"/><circle cx="58" cy="45" r="2.200" fill="#f4f0b0"/>
      <path d="M50 12v28" stroke="#2c3138" stroke-width="2.500"/>
      <path d="M36 22q14-8 28 0" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none"/>
      <circle cx="30" cy="38" r="1.500" fill="#2c3138"/><circle cx="70" cy="38" r="1.500" fill="#2c3138"/>
      <path d="M43 56q7 4 14 0" stroke="#150808" stroke-width="3" fill="none"/>`);
  },
  escupidor(id, c) {
    return marcoZ(id, c, `${hombros(id, c)}
      <path d="M44 70c-2-12-1-22 3-30h8c4 8 5 18 3 30z" fill="${oscuro(c, 0.2)}"/>
      <ellipse cx="50" cy="66" rx="15" ry="13" fill="#9be04a" opacity=".85"/><ellipse cx="50" cy="66" rx="15" ry="13" fill="none" stroke="#d6ff8f" stroke-width="2"/>
      <ellipse cx="46" cy="62" rx="5" ry="3" fill="#fff" opacity=".35"/>
      <ellipse cx="50" cy="30" rx="15" ry="17" fill="url(#${id}s)"/>
      ${ojosZ(50, 26, 6.500, 3.200, '#d9ff6a')}
      <path d="M43 36q7 14 14 0z" fill="#1a2a0a"/>
      <path d="M62 38q14 2 22 10M60 42q14 8 20 20" stroke="#b6ff4a" stroke-width="2.800" stroke-linecap="round" fill="none" opacity=".9"/>
      <circle cx="86" cy="52" r="3" fill="#b6ff4a"/><circle cx="82" cy="66" r="2.400" fill="#b6ff4a"/><circle cx="90" cy="42" r="1.800" fill="#b6ff4a"/>`);
  },
  apestado(id, c) {
    return marcoZ(id, c, `
      <circle cx="18" cy="26" r="9" fill="#9bd47a" opacity=".22"/><circle cx="86" cy="22" r="11" fill="#9bd47a" opacity=".18"/><circle cx="80" cy="64" r="7" fill="#9bd47a" opacity=".2"/>
      <path d="M0 100c0-14 10-22 22-24l28 4 28-4c12 2 22 10 22 24z" fill="${oscuro(c, 0.55)}"/>
      <ellipse cx="50" cy="52" rx="29" ry="29" fill="url(#${id}s)"/>
      <circle cx="30" cy="62" r="5" fill="#d7ff72"/><circle cx="30" cy="62" r="5" fill="none" stroke="#f1ffa8" stroke-width="1.600"/>
      <circle cx="70" cy="64" r="6.500" fill="#d7ff72"/><circle cx="68" cy="40" r="3.600" fill="#d7ff72"/><circle cx="36" cy="38" r="3" fill="#d7ff72"/>
      <path d="M26 56q-2 9 4 14" stroke="#4a6a24" stroke-width="2" fill="none"/>
      ${ojosZ(50, 48, 9, 3.800, '#d8ff7a')}
      <path d="M38 62q12 9 24 0" stroke="#150808" stroke-width="3.400" fill="none" stroke-linecap="round"/>
      <path d="M44 64v4M50 66v4M56 64v4" stroke="#d9d29a" stroke-width="2" stroke-linecap="round"/>`);
  },
  mole(id, c) {
    return marcoZ(id, c, `
      <path d="M-4 100c0-28 14-42 36-42h36c22 0 36 14 36 42z" fill="url(#${id}s)"/>
      <path d="M2 92c2-16 8-26 20-31M98 92c-2-16-8-26-20-31" stroke="#000" stroke-opacity=".28" stroke-width="3" fill="none"/>
      <ellipse cx="50" cy="40" rx="12" ry="14" fill="${claro(c, 0.08)}"/>
      ${ojosZ(50, 38, 5, 2.800, '#ffd0a0')}
      <path d="M44 48q6 4 12 0" stroke="#150808" stroke-width="2.600" fill="none"/>
      <path d="M20 66q-16 10-16 30h28q2-18-12-30zM80 66q16 10 16 30H68q-2-18 12-30z" fill="${oscuro(c, 0.15)}"/>
      <path d="M8 84q10-2 18 2M92 84q-10-2-18 2" stroke="#5a1214" stroke-width="2.600" fill="none"/>
      <path d="M34 62q16 6 32 0" stroke="#000" stroke-opacity=".3" stroke-width="3" fill="none"/>`);
  },
  aullador(id, c) {
    return marcoZ(id, c, `
      <path d="M8 40q-8 14 0 28M92 40q8 14 0 28M16 32q-12 18 0 40M84 32q12 18 0 40" stroke="${c}" stroke-opacity=".6" stroke-width="2.600" fill="none" stroke-linecap="round"/>
      <path d="M12 100c0-14 12-24 26-26l12 4 12-4c14 2 26 12 26 26z" fill="${oscuro(c, 0.5)}"/>
      <rect x="44" y="68" width="12" height="12" fill="${oscuro(c, 0.3)}"/>
      <g transform="rotate(-6 50 46)"><ellipse cx="50" cy="40" rx="17" ry="21" fill="url(#${id}s)"/>
      <path d="M30 34q2-8 10-10" stroke="#3a2a38" stroke-width="2" fill="none"/>
      ${ojosZ(50, 30, 7, 3, '#ffd6f8')}
      <ellipse cx="50" cy="50" rx="9" ry="13" fill="#190a14"/><ellipse cx="50" cy="58" rx="6" ry="5" fill="#6a1a3a"/>
      <path d="M44 41l2 6M50 40v6M56 41l-2 6" stroke="#eadcc8" stroke-width="2" stroke-linecap="round"/></g>`);
  },
  detonador(id, c) {
    return marcoZ(id, c, `${hombros(id, c)}
      <ellipse cx="42" cy="46" rx="14" ry="17" fill="url(#${id}s)"/>
      ${ojosZ(42, 42, 6, 3.200, '#ffd29a')}
      <path d="M36 54q6 5 12 0" stroke="#150808" stroke-width="2.600" fill="none"/>
      <rect x="54" y="52" width="36" height="38" rx="9" fill="#a8452c"/><rect x="54" y="52" width="36" height="38" rx="9" fill="none" stroke="#e08a58" stroke-width="2"/>
      <path d="M54 62h36M54 80h36" stroke="#2a1a14" stroke-width="3.500"/>
      <path d="M72 52V44q0-6 6-8" stroke="#d9c28a" stroke-width="2.400" fill="none" stroke-linecap="round"/>
      <circle cx="80" cy="34" r="4.500" fill="#ffd44a"/><circle cx="80" cy="34" r="8" fill="#ff8a3c" opacity=".4"/>
      <path d="M80 24v-5M88 28l4-3M72 28l-4-3" stroke="#ffd44a" stroke-width="2" stroke-linecap="round"/>
      <path d="M32 70q10 12 28 6" stroke="${oscuro(c, 0.4)}" stroke-width="7" stroke-linecap="round" fill="none"/>`);
  },
};

export function retratoZombi(claseId, clase = 'retrato-z') {
  const z = ZOMBIS[claseId], f = ZOM[claseId];
  if (!z || !f) return svg('<rect width="100" height="100" rx="9" fill="#10140f"/>', '0 0 100 100', clase);
  return svg(f(uid(), z.color), '0 0 100 100', clase);
}

// ───────────────────────────── JEFES ─────────────────────────────
const COLOR_JEFE = { coracero: '#d9a441', fogonero: '#e0662a', mariscal: '#8ea05a', rey_asfalto: '#ff4fa3', paciente_cero: '#6fd6a0', omega: '#b46bff' };
const JEF = {
  coracero(id, c) {
    return marcoZ(id, c, `
      <path d="M-2 100c0-22 12-32 28-36l24 6 24-6c16 4 28 14 28 36z" fill="url(#${id}m)"/>
      <path d="M28 70q22 12 44 0v26q-22 10-44 0z" fill="${c}" opacity=".85"/><path d="M50 74v22" stroke="#6a4a14" stroke-width="2.500"/>
      <rect x="43" y="56" width="14" height="14" fill="${oscuro('#8fa37a', 0.3)}"/>
      <ellipse cx="50" cy="42" rx="17" ry="19" fill="#8fa37a"/>
      <path d="M30 42c-2-20 8-30 20-30s22 10 20 30l-6 4V38H36v8z" fill="url(#${id}m)"/>
      <path d="M50 2c4 4 8 8 8 14H42c0-6 4-10 8-14z" fill="${c}"/><path d="M36 38h28v6H36z" fill="#0b0d0f"/>
      <circle cx="43" cy="41" r="2" fill="#ff8a4a"/><circle cx="57" cy="41" r="2" fill="#ff8a4a"/>
      <path d="M76 20 94 6M80 26 98 14" stroke="#cfd6dd" stroke-width="3" stroke-linecap="round"/>`);
  },
  fogonero(id, c) {
    return marcoZ(id, c, `
      <path d="M-2 100c0-20 10-30 24-34h56c14 4 24 14 24 34z" fill="#2a2a2e"/>
      <circle cx="50" cy="78" r="21" fill="#4a3a30"/><circle cx="50" cy="78" r="21" fill="none" stroke="#b8845a" stroke-width="3.500"/>
      <circle cx="50" cy="78" r="12" fill="#ff7a2a"/><circle cx="50" cy="78" r="7" fill="#ffd25a"/>
      <circle cx="30" cy="62" r="4.500" fill="#d8d2bc"/><path d="M30 62l2-3" stroke="#c0382a" stroke-width="1.600"/>
      <rect x="43" y="52" width="14" height="10" fill="#6a7a60"/>
      <ellipse cx="50" cy="36" rx="16" ry="18" fill="#7a8a6a"/>
      <path d="M32 28q18-18 36 0l-4 6H36z" fill="#2a2420"/><rect x="30" y="28" width="40" height="5" rx="2" fill="#4a3a30"/>
      <circle cx="43" cy="38" r="3" fill="#ff9a3a"/><circle cx="57" cy="38" r="3" fill="#ff9a3a"/>
      <path d="M42 46q8 6 16 0" stroke="#150808" stroke-width="3" fill="none"/>
      <path d="M78 52q10-6 6-18M86 62q12-8 8-24" stroke="#eee" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  },
  mariscal(id, c) {
    return marcoZ(id, c, `
      <path d="M-2 100c0-20 12-30 26-34l26 8 26-8c14 4 26 14 26 34z" fill="#3a4030"/>
      <path d="M14 74l18-4M86 74l-18-4M10 82l24-2M90 82l-24-2" stroke="#b8bcc4" stroke-width="2" stroke-linecap="round"/>
      <rect x="43" y="58" width="14" height="12" fill="#5a6048"/>
      <ellipse cx="50" cy="42" rx="17" ry="19" fill="#9aa68a"/>
      <path d="M34 36q16-8 32 0v14q-16 14-32 0z" fill="#3d4a34"/><path d="M34 36q16-8 32 0v14q-16 14-32 0z" fill="none" stroke="#1d2418" stroke-width="2"/>
      <circle cx="43" cy="42" r="5.500" fill="#0c120a"/><circle cx="57" cy="42" r="5.500" fill="#0c120a"/>
      <circle cx="43" cy="42" r="2.400" fill="#f0e860"/><circle cx="57" cy="42" r="2.400" fill="#f0e860"/>
      <circle cx="50" cy="55" r="4.500" fill="#1d2418"/><path d="M50 58q-2 14 14 18" stroke="#1d2418" stroke-width="3.500" fill="none"/>
      <path d="M30 28q20-16 40 0l4 6H26z" fill="#2c3424"/><path d="M26 34h48v5H26z" fill="#1d2418"/>
      <path d="M45 22l5-5 5 5-5 4z" fill="${c}"/>`);
  },
  rey_asfalto(id, c) {
    return marcoZ(id, c, `
      <path d="M-2 100c0-22 10-34 26-38h52c16 4 26 16 26 38z" fill="#1c1c24"/>
      <path d="M6 70h22v6H6zM72 70h22v6H72z" fill="#b8bcc4"/><path d="M0 70l-2-14h10l4 14zM100 70l2-14h-10l-4 14z" fill="${c}"/>
      <path d="M26 100c10-4 14-14 14-26M74 100c-10-4-14-14-14-26" stroke="#8a8a94" stroke-width="3" fill="none"/>
      <rect x="43" y="56" width="14" height="12" fill="#6a5a50"/>
      <ellipse cx="50" cy="40" rx="17" ry="19" fill="#c89a7a"/>
      <path d="M31 40c-2-20 8-30 19-30s21 10 19 30l-4 2V34H35v8z" fill="#101018"/>
      <path d="M35 36h30v10q-15 6-30 0z" fill="${c}" opacity=".9"/><path d="M35 36h30v10q-15 6-30 0z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.500"/>
      <path d="M50 10q-8-4-6-10 8 2 6 10zM50 10q8-6 14-2-4 6-14 2z" fill="#ffb02a"/>
      <path d="M44 52q6 5 12 0" stroke="#150808" stroke-width="3" fill="none"/>
      <path d="M40 42l20-2" stroke="#fff" stroke-opacity=".3" stroke-width="1.600"/>`);
  },
  paciente_cero(id, c) {
    return marcoZ(id, c, `
      <path d="M2 100c0-14 10-22 22-24h52c12 2 22 10 22 24z" fill="#c8d6cf"/>
      <path d="M6 78q-6-18 6-34M94 78q6-18-6-34M20 70q-10-28 4-44M80 70q10-28-4-44M30 66q-6-24 6-40M70 66q6-24-6-40" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>
      <circle cx="12" cy="44" r="3.600" fill="#c8ffe0"/><circle cx="88" cy="44" r="3.600" fill="#c8ffe0"/><circle cx="24" cy="26" r="3" fill="#c8ffe0"/><circle cx="76" cy="26" r="3" fill="#c8ffe0"/>
      <ellipse cx="50" cy="46" rx="19" ry="23" fill="#d8e2dc"/>
      <path d="M32 40q18-14 36 0" stroke="#7a9a8a" stroke-width="2" fill="none"/>
      <path d="M36 52q-2 10 2 18M64 52q2 10-2 18" stroke="${c}" stroke-width="2.500" fill="none"/>
      <circle cx="42" cy="46" r="5" fill="#0a1a12"/><circle cx="58" cy="46" r="5" fill="#0a1a12"/>
      <circle cx="42" cy="46" r="2.200" fill="${c}"/><circle cx="58" cy="46" r="2.200" fill="${c}"/>
      <path d="M42 58q8 6 16 0" stroke="#3a1a1a" stroke-width="3" fill="none"/>`);
  },
  omega(id, c) {
    return marcoZ(id, c, `
      <path d="M-2 100c0-20 10-32 24-36l28 6 28-6c14 4 24 16 24 36z" fill="#1c1a26"/>
      <circle cx="50" cy="82" r="14" fill="#12101a" stroke="${c}" stroke-width="2.500"/><circle cx="50" cy="82" r="7" fill="${c}"/><circle cx="50" cy="82" r="11" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.500" stroke-dasharray="3 3"/>
      <rect x="43" y="54" width="14" height="12" fill="#3a3444"/>
      <path d="M32 44c-2-22 8-34 18-34s20 12 18 34c-2 12-8 18-18 18s-16-6-18-18z" fill="#2a2634"/>
      <path d="M50 10v52" stroke="${c}" stroke-width="1.600" opacity=".6"/>
      <path d="M32 44c0-14 5-26 18-34-4 14-4 30 0 52-10 0-16-6-18-18z" fill="#cdbcc0" opacity=".85"/>
      <circle cx="42" cy="38" r="4" fill="#cfb6b6"/><circle cx="42" cy="38" r="1.800" fill="#3a1a1a"/>
      <rect x="53" y="34" width="12" height="7" rx="3.500" fill="#0a0812" stroke="${c}" stroke-width="1.600"/><circle cx="62" cy="37.500" r="2.200" fill="#ff4f6a"/>
      <path d="M66 38l30-8" stroke="#ff4f6a" stroke-width="2" opacity=".8"/>
      <path d="M40 50h20" stroke="#150808" stroke-width="2.600"/><path d="M44 50v4M50 50v4M56 50v4" stroke="${c}" stroke-width="1.600"/>`);
  },
};

export function retratoJefe(jefeId, clase = 'retrato-z') {
  const f = JEF[jefeId];
  if (!f || !JEFES[jefeId]) return svg('<rect width="100" height="100" rx="9" fill="#10140f"/>', '0 0 100 100', clase);
  return svg(f(uid(), COLOR_JEFE[jefeId] || '#aaa'), '0 0 100 100', clase);
}
export const colorJefe = (id) => COLOR_JEFE[id] || '#cccccc';
