// Álgebra afín mínima sin asignaciones para el esqueleto de la horda.
// Una transformación afín se guarda en 12 floats: [c0x,c0y,c0z, c1x,c1y,c1z, c2x,c2y,c2z, tx,ty,tz] (columnas + traslación).
// Las articulaciones pueden llevar escala uniforme; las piezas llevan escala no uniforme SOLO como último factor (T·R·S).

export const NJ = 18;
export const J = {
  RAIZ: 0, PELVIS: 1, TORSO: 2, CABEZA: 3, MANDIBULA: 4,
  BRAZO_I: 5, ANTEBRAZO_I: 6, BRAZO_D: 7, ANTEBRAZO_D: 8,
  MUSLO_I: 9, TIBIA_I: 10, PIE_I: 11, MUSLO_D: 12, TIBIA_D: 13, PIE_D: 14,
  X0: 15, X1: 16, X2: 17,
};
// Padre de cada articulación
export const PADRE = [-1, 0, 1, 2, 3, 2, 5, 2, 7, 1, 9, 10, 1, 12, 13, 2, 2, 3];

/** Grupos desmembrables por articulación (0 = tronco, nunca se separa). */
export const GRUPO_DE_J = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 0, 0, 1];
export const G = { TRONCO: 0, CABEZA: 1, BRAZO_I: 2, BRAZO_D: 3, PIERNA_I: 4, PIERNA_D: 5 };

/** out[o..o+11] = padre[po..] · [R(ax,ay,az)·s | (ox,oy,oz)] con R = Ry·Rx·Rz */
export function articular(out, o, P, po, ox, oy, oz, ax, ay, az, s) {
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  const r00 = (cy * cz + sy * sx * sz) * s, r01 = (-cy * sz + sy * sx * cz) * s, r02 = sy * cx * s;
  const r10 = cx * sz * s, r11 = cx * cz * s, r12 = -sx * s;
  const r20 = (-sy * cz + cy * sx * sz) * s, r21 = (sy * sz + cy * sx * cz) * s, r22 = cy * cx * s;
  // columnas de R: c0=(r00,r10,r20) c1=(r01,r11,r21) c2=(r02,r12,r22)
  const a0 = P[po], a1 = P[po + 1], a2 = P[po + 2], b0 = P[po + 3], b1 = P[po + 4], b2 = P[po + 5], c0 = P[po + 6], c1 = P[po + 7], c2 = P[po + 8];
  out[o] = a0 * r00 + b0 * r10 + c0 * r20; out[o + 1] = a1 * r00 + b1 * r10 + c1 * r20; out[o + 2] = a2 * r00 + b2 * r10 + c2 * r20;
  out[o + 3] = a0 * r01 + b0 * r11 + c0 * r21; out[o + 4] = a1 * r01 + b1 * r11 + c1 * r21; out[o + 5] = a2 * r01 + b2 * r11 + c2 * r21;
  out[o + 6] = a0 * r02 + b0 * r12 + c0 * r22; out[o + 7] = a1 * r02 + b1 * r12 + c1 * r22; out[o + 8] = a2 * r02 + b2 * r12 + c2 * r22;
  out[o + 9] = a0 * ox + b0 * oy + c0 * oz + P[po + 9];
  out[o + 10] = a1 * ox + b1 * oy + c1 * oz + P[po + 10];
  out[o + 11] = a2 * ox + b2 * oy + c2 * oz + P[po + 11];
}

/** Raíz del mundo: traslación (x,y,z) + giro Y + inclinación (pitch X) + alabeo (roll Z). */
export function raiz(out, o, x, y, z, rotY, pitch, roll, s) {
  const I = RAIZ_ID;
  articular(out, o, I, 0, x, y, z, pitch, rotY, roll, s);
}
const RAIZ_ID = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);

/** Rotación a partir de cuaternión (qx,qy,qz,qw) → 9 floats en out[o..o+8] (columnas). */
export function matDeQuat(out, o, x, y, z, w) {
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  out[o] = 1 - (yy + zz); out[o + 1] = xy + wz; out[o + 2] = xz - wy;
  out[o + 3] = xy - wz; out[o + 4] = 1 - (xx + zz); out[o + 5] = yz + wx;
  out[o + 6] = xz + wy; out[o + 7] = yz - wx; out[o + 8] = 1 - (xx + yy);
}

/** Integra un cuaternión q (array de 4) con velocidad angular mundial w (wx,wy,wz) durante dt. */
export function integrarQuat(q, wx, wy, wz, dt) {
  const hx = wx * dt * 0.5, hy = wy * dt * 0.5, hz = wz * dt * 0.5;
  const x = q[0], y = q[1], z = q[2], w = q[3];
  q[0] = x + hw(hx, w, hy, z, hz, y); q[1] = y + hw(hy, w, hz, x, hx, z); q[2] = z + hw(hz, w, hx, y, hy, x); q[3] = w - (hx * x + hy * y + hz * z);
  const l = 1 / Math.hypot(q[0], q[1], q[2], q[3]);
  q[0] *= l; q[1] *= l; q[2] *= l; q[3] *= l;
}
function hw(a, w, b, p, c, r) { return a * w + b * p - c * r; }

/** Cuaternión a partir de ángulos (Y·X·Z). */
export function quatDeEuler(q, ax, ay, az) {
  const c1 = Math.cos(ax / 2), s1 = Math.sin(ax / 2), c2 = Math.cos(ay / 2), s2 = Math.sin(ay / 2), c3 = Math.cos(az / 2), s3 = Math.sin(az / 2);
  // orden YXZ (Ry·Rx·Rz), igual que articular()
  q[0] = s1 * c2 * c3 + c1 * s2 * s3;
  q[1] = c1 * s2 * c3 - s1 * c2 * s3;
  q[2] = c1 * c2 * s3 - s1 * s2 * c3;
  q[3] = c1 * c2 * c3 + s1 * s2 * s3;
}

export const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a, b, t) => a + (b - a) * t;
