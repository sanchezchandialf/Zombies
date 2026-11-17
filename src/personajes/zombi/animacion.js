// Animación procedural de no-muertos: locomoción ligada a la velocidad real, acciones puntuales y estados persistentes.
import { J, NJ, PADRE, articular, raiz, ease, clamp01, lerp } from './matematica.js';

const sm = (a, b, x) => ease(clamp01((x - a) / (b - a)));
const sgnOut = (z, lado) => (lado < 0 ? -z : z);       // z "hacia fuera" → ángulo Rz del lado correspondiente

export const DUR_ACCION = { atacar: 0.8, emerger: 1.1, aturdir: 1.5, gritar: 1.0, escupir: 0.7, cargar: 1.0, lanzar: 1.1, golpe: 0.25 };

/** Rellena it.A (ángulos por articulación) y it.q (parámetros de raíz) para el cuadro. */
export function animarVivo(it, dt, t) {
  const P = it.P.anim, A = it.A, q = it.q, st = it.st;
  A.fill(0);
  q.oy = 0; q.ofz = 0; q.ofx = 0; q.pitch = 0; q.roll = 0; q.yaw = 0; q.sX0 = 1; q.sc = 1;
  const ph0 = it.desfase;
  // velocidad suavizada y fase de paso
  const v = it.vel;
  const marcha = clamp01((v - 0.12) / 0.5);
  const cargando = st.cargando;
  const amp = Math.min(1.3, Math.max(0.6, v / P.vref)) * (cargando && it.clase !== 'mole' ? 1.1 : 1);
  const furia = st.furia ? 1 : 0, arde = st.ardiendo ? 1 : 0;
  const ph = it.fase;
  const s = Math.sin(ph), c = Math.cos(ph), c2 = Math.cos(2 * ph);
  const k = marcha;
  const caos = (P.temblor || 0.5) * (1 + furia * 1.5 + arde * 2);
  const nz1 = Math.sin(t * 7.1 + ph0 * 3) * Math.sin(t * 3.7 + ph0), nz2 = Math.sin(t * 5.3 + ph0 * 5) * Math.sin(t * 2.3 + ph0 * 2);
  const resp = Math.sin(t * 1.7 + ph0) * 0.025;

  // ── Piernas ──
  const aP = P.pierna * amp * (cargando ? 1.15 : 1);
  const K = P.rodilla * amp;
  let thI = -aP * s * k + 0.05 * (1 - k) + (1 - k) * Math.sin(t * 0.5 + ph0) * 0.02;
  let thD = aP * s * k + 0.05 * (1 - k);
  let knI = K * k * Math.pow(Math.max(0, c), 0.85) + (1 - k) * 0.1;
  let knD = K * k * Math.pow(Math.max(0, -c), 0.85) + (1 - k) * 0.1;
  let ftI = -(thI + knI) * 0.85 + 0.25 * k * Math.max(0, -c) * 0, ftD = -(thD + knD) * 0.85;
  if (P.arrastre) {          // pierna izquierda que se arrastra
    thI = -aP * 0.5 * s * k - 0.14 * k + 0.05 * (1 - k); knI = 0.12 * k + (1 - k) * 0.1; ftI = 0.55 * k + 0.05;
  }
  A[J.MUSLO_I * 3] = thI; A[J.MUSLO_D * 3] = thD; A[J.TIBIA_I * 3] = knI; A[J.TIBIA_D * 3] = knD; A[J.PIE_I * 3] = ftI; A[J.PIE_D * 3] = ftD;
  A[J.MUSLO_I * 3 + 2] = 0.04 + (it.clase === 'apestado' ? 0.12 : 0); A[J.MUSLO_D * 3 + 2] = -0.04 - (it.clase === 'apestado' ? 0.12 : 0);

  // ── Cadera, torso ──
  q.oy = P.rebote * (c2 - 1) * 0.5 * k * amp - 0.025 * k - (cargando ? 0.06 : 0) + resp * 0.3;
  A[J.PELVIS * 3 + 1] = P.cadera * s * k * amp;
  A[J.PELVIS * 3 + 2] = P.cadera * 0.35 * s * k + (it.clase === 'apestado' ? 0.04 * Math.sin(t * 1.3 + ph0) : 0);
  const incl = P.inclina + (cargando ? (it.clase === 'mole' ? 0.4 : 0.22) : 0) + k * 0.05;
  A[J.TORSO * 3] = incl + 0.04 * c2 * k + resp;
  A[J.TORSO * 3 + 1] = -P.cadera * s * k * amp * 0.9 + 0.1 * nz2 * (1 - k) * caos;
  A[J.TORSO * 3 + 2] = -0.05 * s * k + P.hombro + 0.04 * nz1 * caos * 0.4;
  // ── Cabeza ──
  A[J.CABEZA * 3] = P.cabInc - (it.clase === 'corredor' && cargando ? 0.1 : 0) + 0.04 * Math.sin(2 * ph + 1) * k + 0.03 * nz1 * caos;
  A[J.CABEZA * 3 + 1] = 0.32 * Math.sin(t * 0.55 + ph0 * 2) * (1 - k * 0.6) + 0.08 * nz2 * caos;
  A[J.CABEZA * 3 + 2] = P.cabLado * (1 + 0.25 * Math.sin(t * 0.9 + ph0)) + 0.06 * nz1 * caos * (it.clase === 'aullador' ? 3 : 1);
  A[J.MANDIBULA * 3] = Math.max(0, P.boca * (0.65 + 0.35 * Math.sin(t * (2.1 + ph0 * 0.3) + ph0)) + 0.1 * nz1 * caos);

  // ── Brazos ──
  const bI = P.bI, bD = P.bD, sw = P.brazo * amp * k;
  let axI = bI[0] + sw * s, axD = bD[0] - sw * s;
  let azI = sgnOut(bI[1], -1), azD = sgnOut(bD[1], 1);
  let elI = bI[2], elD = bD[2];
  const tmb = 0.05 * caos;
  axI += tmb * nz1; axD += tmb * nz2; elI += tmb * nz2 * 2; elD += tmb * nz1 * 2;
  if (it.clase === 'corredor') { axI += 0.15 * c; axD -= 0.15 * c; elI -= 0.3 * Math.max(0, s) * k; elD -= 0.3 * Math.max(0, -s) * k; }
  if (it.clase === 'mole') { axD += 0.12 * s * k; if (cargando) { axD = -1.45; elD = -0.5; axI = -0.7; elI = -0.5; } }
  if (it.clase === 'aullador') { axI += 0.15 * nz1 * 3 * k; axD += 0.15 * nz2 * 3 * k; }
  if (it.clase === 'detonador') { axI += 0.05 * s * k; axD -= 0.05 * s * k; }
  A[J.BRAZO_I * 3] = axI; A[J.BRAZO_D * 3] = axD; A[J.BRAZO_I * 3 + 2] = azI; A[J.BRAZO_D * 3 + 2] = azD;
  A[J.ANTEBRAZO_I * 3] = elI; A[J.ANTEBRAZO_D * 3] = elD;
  A[J.ANTEBRAZO_I * 3 + 1] = 0.25; A[J.ANTEBRAZO_D * 3 + 1] = -0.25;

  // ── Rasgos de clase ──
  if (it.clase === 'escupidor') {
    A[J.CABEZA * 3] += 0.25 * Math.sin(t * 1.8 + ph0) * 0.5 + 0.1;
    A[J.TORSO * 3 + 1] += 0.15 * Math.sin(t * 1.1 + ph0);
    q.sX0 = 1 + 0.08 * Math.sin(t * 3 + ph0);
  }
  if (it.clase === 'apestado') q.sX0 = 1 + 0.035 * Math.sin(t * 2.2 + ph0);
  if (it.clase === 'mole') { A[J.TORSO * 3 + 1] += 0.2 * s * k; q.roll += 0.04 * s * k; }
  if (it.clase === 'detonador') q.sX0 = 1;

  // ── Estados ──
  if (arde) {                       // pánico: brazos al aire, sacudidas
    A[J.BRAZO_I * 3] = -2.6 + 0.6 * nz1 * 2; A[J.BRAZO_D * 3] = -2.4 + 0.6 * nz2 * 2;
    A[J.ANTEBRAZO_I * 3] = -0.6 + nz2 * 0.7; A[J.ANTEBRAZO_D * 3] = -0.6 + nz1 * 0.7;
    A[J.CABEZA * 3] += -0.35 + 0.2 * nz1; A[J.MANDIBULA * 3] = 0.9;
    A[J.TORSO * 3 + 1] += 0.35 * nz2;
  }
  if (furia) {
    A[J.CABEZA * 3 + 2] += 0.2 * nz1 * 2; A[J.MANDIBULA * 3] = Math.max(A[J.MANDIBULA * 3], 0.7);
    A[J.TORSO * 3] += 0.1;
  }

  // ── Acción puntual ──
  const ac = it.acc;
  if (ac) {
    ac.t += dt;
    const u = ac.t / ac.dur;
    if (u >= 1) it.acc = null; else accion(it, ac, u, t, A, q, P, k);
  }
  // ── Sacudida direccional por impacto ──
  const g = it.golpe;
  if (g) {
    g.t += dt;
    const u = g.t / g.dur;
    if (u >= 1) it.golpe = null;
    else {
      const env = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u) * g.fuerza;
      const sr = Math.sin(it.rot), cr = Math.cos(it.rot);
      const f = g.dx * sr + g.dz * cr, r = g.dx * cr - g.dz * sr;
      A[J.TORSO * 3] += 0.34 * f * env; A[J.TORSO * 3 + 2] += -0.3 * r * env;
      A[J.CABEZA * 3] += 0.4 * f * env * 1.2; A[J.CABEZA * 3 + 2] += -0.3 * r * env;
      A[J.BRAZO_I * 3] += 0.4 * f * env; A[J.BRAZO_D * 3] += 0.4 * f * env;
      q.ofz += 0.05 * f * env; q.ofx += 0.05 * r * env;
      A[J.MANDIBULA * 3] += 0.3 * env;
    }
  }
}

function accion(it, ac, u, t, A, q, P, k) {
  const n = ac.n;
  const IA = J.BRAZO_I * 3, DA = J.BRAZO_D * 3, IE = J.ANTEBRAZO_I * 3, DE = J.ANTEBRAZO_D * 3, TO = J.TORSO * 3, CA = J.CABEZA * 3, MA = J.MANDIBULA * 3;
  if (n === 'atacar' || n === 'cuerpo') {
    // 0–.38 amago hacia atrás · .38–.5 golpe · .5–1 recuperación
    const B = u < 0.38 ? sm(0, 0.38, u) : 1 - sm(0.38, 0.5, u);
    const F = u < 0.38 ? 0 : u < 0.5 ? sm(0.38, 0.5, u) : 1 - sm(0.5, 1, u);
    const mole = it.clase === 'mole';
    const alza = mole ? -3.0 : -2.5;
    if (mole) {
      A[DA] = lerp(A[DA], alza, B) * (1 - F) + F * -0.9; A[DE] = lerp(A[DE], -0.3, B) * (1 - F) + F * -0.1;
      A[TO] += -0.45 * B + 0.7 * F; q.pitch += 0.0; q.ofz += 0.5 * F; q.roll += -0.12 * B + 0.1 * F;
      A[IA] += 0.5 * F;
    } else if (it.clase === 'apestado') {
      A[IA] = lerp(A[IA], -1.6, B * 0.8 + F * 0.4); A[DA] = lerp(A[DA], -1.6, B * 0.8 + F * 0.4);
      A[TO] += -0.15 * B + 0.4 * F; q.ofz += 0.35 * F; q.sX0 = 1 + 0.12 * F;
    } else {
      A[IA] = lerp(A[IA], alza, B) * (1 - F) + F * -1.2; A[DA] = lerp(A[DA], alza - 0.2, B) * (1 - F) + F * -1.3;
      A[IE] = lerp(A[IE], -0.4, B) * (1 - F) + F * -0.2; A[DE] = lerp(A[DE], -0.4, B) * (1 - F) + F * -0.2;
      A[TO] += -0.38 * B + 0.5 * F; q.ofz += 0.4 * F;
    }
    A[CA] += -0.35 * B + 0.3 * F; A[MA] = Math.max(A[MA], 0.4 + 0.6 * (B + F) * 0.8);
    if (ac.salto) {          // salto del Corredor sobre la presa
      const h = Math.sin(Math.PI * clamp01((u - 0.12) / 0.7));
      q.oy += 0.9 * h; q.pitch += 0.45 * h; q.ofz += 1.0 * clamp01((u - 0.15) / 0.5) * (1 - 0.4 * clamp01((u - 0.7) / 0.3));
      A[J.MUSLO_I * 3] = -0.9; A[J.MUSLO_D * 3] = -0.4; A[J.TIBIA_I * 3] = 1.0; A[J.TIBIA_D * 3] = 0.8;
    }
  } else if (n === 'emerger') {
    const sub = 1 - ease(clamp01(u * 1.15));
    q.oy += -1.95 * sub * (it.escalaV || 1);
    const arriba = 1 - sm(0.45, 0.95, u);
    A[IA] = lerp(A[IA], -2.9, arriba); A[DA] = lerp(A[DA], -3.0, arriba);
    A[IE] = lerp(A[IE], -0.5, arriba); A[DE] = lerp(A[DE], -0.4, arriba);
    A[IA + 2] += sgnOut(0.15, -1) * arriba; A[DA + 2] += sgnOut(0.15, 1) * arriba;
    A[TO] += 0.5 * (1 - sm(0.2, 0.9, u)); q.pitch += -0.35 * (1 - sm(0.1, 0.9, u));
    A[CA] += -0.4 * (1 - sm(0.3, 1, u));
    const sac = (1 - u) * 0.12;
    q.ofx += Math.sin(t * 40) * sac * 0.3; q.roll += Math.sin(t * 33) * sac * 0.5; A[TO + 2] += Math.sin(t * 29) * sac;
    A[MA] = Math.max(A[MA], 0.6 * (1 - u));
  } else if (n === 'aturdir') {
    const e = Math.min(1, u * 6) * (1 - sm(0.85, 1, u));
    A[CA + 2] += 0.5 * Math.sin(t * 9) * e; A[CA] += 0.35 * e; A[TO + 2] += 0.22 * Math.sin(t * 7 + 1) * e; A[TO] += 0.2 * e + 0.1 * Math.sin(t * 5) * e;
    A[IA] = lerp(A[IA], -0.15, e); A[DA] = lerp(A[DA], -0.1, e); A[IE] = lerp(A[IE], -0.1, e); A[DE] = lerp(A[DE], -0.1, e);
    A[J.TIBIA_I * 3] += 0.35 * e; A[J.TIBIA_D * 3] += 0.35 * e; A[J.MUSLO_I * 3] += -0.2 * e; A[J.MUSLO_D * 3] += -0.2 * e;
    q.oy += -0.1 * e; q.ofx += 0.05 * Math.sin(t * 8) * e; A[MA] = Math.max(A[MA], 0.5 * e);
  } else if (n === 'gritar') {
    const e = sm(0, 0.18, u) * (1 - sm(0.82, 1, u));
    A[CA] = lerp(A[CA], -0.75, e); A[MA] = lerp(A[MA], 1.1, e); A[TO] += -0.38 * e;
    A[IA] = lerp(A[IA], -0.7, e); A[DA] = lerp(A[DA], -0.7, e); A[IA + 2] = sgnOut(1.1, -1) * e + A[IA + 2] * (1 - e); A[DA + 2] = sgnOut(1.1, 1) * e + A[DA + 2] * (1 - e);
    A[IE] = lerp(A[IE], -0.25, e); A[DE] = lerp(A[DE], -0.25, e);
    const vib = Math.sin(t * 55) * 0.03 * e; A[CA + 2] += vib * 2; A[TO + 2] += vib; q.ofx += vib * 0.5; q.sX0 = 1 + 0.06 * e;
    q.oy += 0.02 * e * Math.sin(t * 40);
  } else if (n === 'escupir') {
    const ret = u < 0.45 ? sm(0, 0.45, u) : 1 - sm(0.45, 0.55, u), fw = u < 0.45 ? 0 : u < 0.55 ? sm(0.45, 0.55, u) : 1 - sm(0.55, 1, u);
    A[CA] += -0.55 * ret + 0.55 * fw; A[TO] += -0.25 * ret + 0.35 * fw; q.ofz += 0.22 * fw;
    A[MA] = Math.max(A[MA], 0.2 + 0.9 * (ret * 0.4 + fw)); q.sX0 = 1 + 0.35 * ret - 0.45 * fw;
    A[IA] = lerp(A[IA], -0.3, fw); A[DA] = lerp(A[DA], -0.3, fw);
  } else if (n === 'cargar') {
    // agacha hombro y escarba con el pie (antes de embestir)
    const e = sm(0, 0.35, u) * (1 - sm(0.8, 1, u));
    A[TO] += 0.55 * e; A[CA] += 0.2 * e + 0.0; q.oy += -0.12 * e;
    A[J.MUSLO_I * 3] += -0.5 * e; A[J.TIBIA_I * 3] += 0.7 * e; A[J.MUSLO_D * 3] += 0.35 * e; A[J.TIBIA_D * 3] += 0.55 * e;
    if (it.clase === 'mole') { A[DA] = lerp(A[DA], -1.5, e); A[DE] = lerp(A[DE], -0.6, e); }
    A[MA] = Math.max(A[MA], 0.6 * e);
    q.ofx += Math.sin(t * 50) * 0.015 * e;
  } else if (n === 'lanzar') {
    const B = u < 0.45 ? sm(0, 0.45, u) : 1 - sm(0.45, 0.6, u), F = u < 0.45 ? 0 : u < 0.6 ? sm(0.45, 0.6, u) : 1 - sm(0.6, 1, u);
    A[DA] = lerp(A[DA], -2.9, B) * (1 - F) + F * -0.6; A[DE] = lerp(A[DE], -0.9, B) * (1 - F) + F * -0.1;
    A[TO] += -0.3 * B + 0.5 * F; A[TO + 1] += 0.4 * B - 0.5 * F; A[CA] += -0.2 * B; A[IA] = lerp(A[IA], -1.1, B);
  }
}

/** Calcula las matrices mundiales de las articulaciones a partir de it.A / it.q. */
export function construirJoints(it, W) {
  const q = it.q, A = it.A, rest = it.rest;
  raiz(W, 0, it.x + Math.sin(it.rot) * q.ofz + Math.cos(it.rot) * q.ofx, q.oy + it.y, it.z + Math.cos(it.rot) * q.ofz - Math.sin(it.rot) * q.ofx, it.rot + q.yaw, q.pitch, q.roll, q.sc);
  for (let j = 1; j < NJ; j++) {
    const o3 = j * 3;
    articular(W, j * 12, W, PADRE[j] * 12, rest[o3], rest[o3 + 1], rest[o3 + 2], A[o3], A[o3 + 1], A[o3 + 2], j === J.X0 ? q.sX0 : 1);
  }
}
