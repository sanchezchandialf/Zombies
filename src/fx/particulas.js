// Motor de partículas instanciado. Dos «colas» (= dos draw calls):
//   humo   → mezcla alfa premultiplicada, iluminada con la luz ambiente/solar (humo, polvo, sangre, esquirlas, casquillos)
//   brillo → aditivo, sin iluminar, valores HDR para el bloom (fuego, chispas, destellos, energía)
// La simulación vive en el vertex shader: cada partícula guarda posición/velocidad iniciales, arrastre y gravedad y su
// posición en cualquier instante es una fórmula cerrada (arrastre lineal + gravedad). La CPU solo escribe los nacimientos
// en un buffer circular de Float32Array (sin objetos por partícula) y sube el rango modificado.
import * as THREE from 'three';
import { atlasParticulas } from './atlas.js';

export const F = { PLANO: 1, SALE: 2, FUEGO: 4, ENTRA: 8, SIN_SUELO: 16 };
const STRIDE = 32;

const VS = /* glsl */`
attribute vec2 aEsq;
attribute vec3 aP0; attribute vec3 aV0; attribute vec4 aT; attribute vec4 aS; attribute vec2 aR;
attribute vec4 aC0; attribute vec4 aC1; attribute vec4 aC2; attribute vec4 aX;
uniform float uT; uniform vec3 uLdir; uniform vec3 uFogColor; uniform float uFogDens;
varying vec2 vQ; varying vec4 vCol; varying vec3 vL; varying vec4 vCel; varying vec3 vInfo; varying float vPlano;
void main() {
  float age = uT - aT.x, life = aT.y;
  if (age < 0.0 || age >= life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec4(0.0); vQ = vec2(0.0); vL = vec3(0.0); vCel = vec4(0.0); vInfo = vec3(0.0); vPlano = 0.0; return; }
  float f = age / life;
  int fl = int(aX.z + 0.5);
  bool plano = (fl & 1) != 0;
  float ta = min(age, aS.w);
  float k = aT.z, g = aT.w;
  float e = k > 0.02 ? (1.0 - exp(-k * ta)) / k : ta - 0.5 * k * ta * ta;
  vec3 pos;
  pos.xz = aP0.xz + aV0.xz * e;
  pos.y = aP0.y + aV0.y * e - g * (k > 0.02 ? (ta - e) / k : 0.5 * ta * ta);
  // tamaño
  float te = f;
  if ((fl & 2) != 0) te = 1.0 - pow(1.0 - f, 2.2);
  else if ((fl & 8) != 0) te = f * f;
  float size = mix(aS.x, aS.y, te);
  if (age > aS.w) size *= max(0.0, 1.0 - (age - aS.w) / 0.14);
  // color por tres paradas y entrada rápida
  vec4 c = f < 0.35 ? mix(aC0, aC1, f / 0.35) : mix(aC1, aC2, (f - 0.35) / 0.65);
  c.a *= smoothstep(0.0, min(0.05, life * 0.2), age);
  vCol = c;
  vec3 Lv = (viewMatrix * vec4(uLdir, 0.0)).xyz;
  vec2 q = aEsq;
  vec3 wp;
  vec2 ex, ey;
  if (plano) {
    float r = aR.x + aR.y * age;
    vec2 a = vec2(cos(r), sin(r));
    wp = pos + vec3(a.x * q.x - a.y * q.y, 0.0, a.y * q.x + a.x * q.y) * size * 0.5;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    gl_Position.z -= 0.3 / max(gl_Position.w, 1.0);   // los quads planos se acercan ~0,4 m a cámara: sin z-fighting con el suelo
    vL = vec3(0.0, 0.0, 1.0);
  } else {
    vec4 mv = viewMatrix * vec4(pos, 1.0);
    vec2 off;
    if (aS.z > 0.0) {
      float ek = exp(-k * ta);
      vec3 vel = vec3(aV0.x * ek, (aV0.y + (k > 0.02 ? g / k : 0.0)) * ek - (k > 0.02 ? g / k : g * ta), aV0.z * ek);
      vec2 vv = (viewMatrix * vec4(vel, 0.0)).xy;
      float sp = length(vel);
      ex = length(vv) > 1e-4 ? normalize(vv) : vec2(1.0, 0.0);
      ey = vec2(-ex.y, ex.x);
      float len = size * (1.0 + min(aS.z * sp, 14.0));
      off = ex * q.x * len * 0.5 + ey * q.y * size * 0.5;
    } else {
      float r = aR.x + aR.y * age;
      ex = vec2(cos(r), sin(r)); ey = vec2(-ex.y, ex.x);
      off = (ex * q.x + ey * q.y) * size * 0.5;
    }
    mv.xy += off;
    gl_Position = projectionMatrix * mv;
    wp = pos + vec3(off, 0.0) * mat3(viewMatrix);
    vL = vec3(dot(ex, Lv.xy), dot(ey, Lv.xy), Lv.z);
  }
  float hf = ((fl & 16) != 0 || plano) ? 0.0 : min(0.5, size * 0.32);
  float nfr = aX.y, i0 = 0.0, i1 = 0.0, mx = 0.0;
  if (nfr > 1.5) { float fr = min(f * nfr, nfr - 0.001); i0 = floor(fr); i1 = min(i0 + 1.0, nfr - 1.0); mx = fract(fr); }
  vCel = vec4(aX.x + i0, aX.x + i1, mx, aX.w);
  vQ = q;
  vec3 vp = (viewMatrix * vec4(wp, 1.0)).xyz;
  float ff = 1.0 - exp(-uFogDens * uFogDens * dot(vp, vp));
  vInfo = vec3(wp.y, ff, hf);
  vPlano = plano ? 1.0 : 0.0;
}
`;

const FS = /* glsl */`
uniform sampler2D uAtlas; uniform vec3 uAmb; uniform vec3 uSol; uniform vec3 uGlow; uniform vec3 uFogColor;
varying vec2 vQ; varying vec4 vCol; varying vec3 vL; varying vec4 vCel; varying vec3 vInfo; varying float vPlano;
vec4 celda(float i, vec2 q) {
  float col = mod(i, 4.0), row = floor(i / 4.0);
  vec2 uv = (vec2(col, row) + vec2(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5)) * 0.25;
  return texture2D(uAtlas, uv);
}
void main() {
  if (vCol.a <= 0.0005) discard;
  vec4 t = celda(vCel.x, vQ);
  if (vCel.z > 0.001) t = mix(t, celda(vCel.y, vQ), vCel.z);
  float a = vCol.a * t.a;
  if (vInfo.z > 0.0) a *= smoothstep(0.0, vInfo.z, vInfo.x);
  if (a <= 0.002) discard;
  float fog = vInfo.y;
  #ifdef ADITIVO
    vec3 col = vCol.rgb;
    // las celdas de llama traen el calor en R: núcleo blanco-amarillo, bordes rojizos
    col *= mix(vec3(1.0, 0.62, 0.38), vec3(1.45, 1.3, 1.12), clamp(t.r * 1.2, 0.0, 1.0));
    gl_FragColor = vec4(col * a * (1.0 - fog), 0.0);
  #else
    vec3 n = vec3((t.g - 0.5) * 2.0, (t.b - 0.5) * 2.0, 0.0);
    n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)));
    float dif = vPlano > 0.5 ? 0.75 : clamp(dot(n, normalize(vL)) * 0.5 + 0.5, 0.0, 1.0);
    vec3 luz = uAmb + uSol * dif + uGlow * 0.55;
    vec3 col = vCol.rgb * mix(vec3(1.0), luz, vCel.w);
    col *= 1.0 - 0.34 * t.r * vCel.w;
    col = mix(col, uFogColor, fog * 0.85);
    gl_FragColor = vec4(col * a, a);
  #endif
}
`;

function crearCola(escena, cap, aditivo, atlas, uniformes, orden) {
  const data = new Float32Array(cap * STRIDE);
  const buf = new THREE.InstancedInterleavedBuffer(data, STRIDE, 1);
  buf.setUsage(THREE.DynamicDrawUsage);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('aEsq', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
  // el atributo de posición es obligatorio para three (vértices de la plantilla)
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const def = [['aP0', 3, 0], ['aV0', 3, 3], ['aT', 4, 6], ['aS', 4, 10], ['aR', 2, 14], ['aC0', 4, 16], ['aC1', 4, 20], ['aC2', 4, 24], ['aX', 4, 28]];
  for (const [n, s, o] of def) g.setAttribute(n, new THREE.InterleavedBufferAttribute(buf, s, o));
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS,
    uniforms: { ...uniformes, uAtlas: { value: atlas } },
    defines: aditivo ? { ADITIVO: 1 } : {},
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: aditivo ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: aditivo ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
  });
  const malla = new THREE.Mesh(g, mat);
  malla.frustumCulled = false; malla.renderOrder = orden; malla.name = aditivo ? 'fx_brillo' : 'fx_humo';
  escena.add(malla);
  const cola = { data, buf, geo: g, mat, malla, cap, sig: 0, alto: 0, dMin: 1e9, dMax: -1, lleno: false, vivas: 0, pMin: 1e9, pMax: -1, dibujada: true };
  // Si un cuadro no se dibuja (pausa del render, capturas, pestaña oculta), los tramos sucios se acumulan hasta el siguiente
  // dibujo: si no, lo emitido en los cuadros sin dibujar nunca llegaría a la GPU.
  malla.onBeforeRender = () => { cola.dibujada = true; };
  return cola;
}

export function crearMotor(juego, escena, opciones = {}) {
  const atlas = atlasParticulas();
  const uniformes = {
    uT: { value: 0 }, uLdir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    uAmb: { value: new THREE.Color(0.35, 0.37, 0.4) }, uSol: { value: new THREE.Color(0.5, 0.45, 0.4) },
    uGlow: { value: new THREE.Color(0, 0, 0) },
    uFogColor: { value: new THREE.Color(0.5, 0.55, 0.6) }, uFogDens: { value: 0.012 },
  };
  const capH = opciones.capHumo ?? 7000, capB = opciones.capBrillo ?? 7000;
  const humo = crearCola(escena, capH, false, atlas, uniformes, 8);
  const brillo = crearCola(escena, capB, true, atlas, uniformes, 9);
  let T = 0;
  const rng = juego.rng ?? Math.random;

  // Estado «de pincel»: la receta lo ajusta y lanzar() lo consume y restablece (sin crear objetos).
  const S = {};
  function reset() { S.drag = 0.6; S.grav = 0; S.stretch = 0; S.rot = 0; S.rotV = 0; S.nfr = 1; S.flags = 0; S.luz = 1; S.suelo = null; S.t0 = 0; }
  reset();

  /** Lanza una partícula. Colores [r,g,b,a] constantes (HDR permitido). */
  function lanzar(cola, px, py, pz, vx, vy, vz, vida, tam0, tam1, cel, c0, c1, c2) {
    const i = cola.sig;
    cola.sig = i + 1 >= cola.cap ? 0 : i + 1;
    if (cola.sig === 0) cola.lleno = true;
    if (i + 1 > cola.alto) cola.alto = i + 1;
    const d = cola.data, o = i * STRIDE;
    d[o] = px; d[o + 1] = py; d[o + 2] = pz; d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
    d[o + 6] = T + S.t0; d[o + 7] = vida; d[o + 8] = S.drag; d[o + 9] = S.grav;
    d[o + 10] = tam0; d[o + 11] = tam1; d[o + 12] = S.stretch;
    // tiempo hasta tocar el suelo (si procede)
    let tl = 1e4;
    if (S.suelo !== null) {
      const k = S.drag, g = S.grav, fy = S.suelo;
      const yEn = (t) => {
        const e = k > 0.02 ? (1 - Math.exp(-k * t)) / k : t - 0.5 * k * t * t;
        return py + vy * e - g * (k > 0.02 ? (t - e) / k : 0.5 * t * t);
      };
      if (yEn(vida) <= fy) {
        if (py <= fy) tl = 0.001;
        else { let a = 0, b = vida; for (let n = 0; n < 14; n++) { const m = (a + b) * 0.5; if (yEn(m) > fy) a = m; else b = m; } tl = b; }
      }
    }
    d[o + 13] = tl;
    d[o + 14] = S.rot; d[o + 15] = S.rotV;
    d[o + 16] = c0[0]; d[o + 17] = c0[1]; d[o + 18] = c0[2]; d[o + 19] = c0[3];
    d[o + 20] = c1[0]; d[o + 21] = c1[1]; d[o + 22] = c1[2]; d[o + 23] = c1[3];
    d[o + 24] = c2[0]; d[o + 25] = c2[1]; d[o + 26] = c2[2]; d[o + 27] = c2[3];
    d[o + 28] = cel; d[o + 29] = S.nfr; d[o + 30] = S.flags; d[o + 31] = S.luz;
    if (i < cola.dMin) cola.dMin = i;
    if (i > cola.dMax) cola.dMax = i;
    reset();
    return tl;
  }

  function subir(cola) {
    if (cola.dMax < 0) return;
    cola.geo.instanceCount = cola.lleno ? cola.cap : cola.alto;
    const b = cola.buf;
    if (cola.dibujada) { cola.pMin = 1e9; cola.pMax = -1; cola.dibujada = false; }
    cola.pMin = Math.min(cola.pMin, cola.dMin); cola.pMax = Math.max(cola.pMax, cola.dMax);
    b.clearUpdateRanges?.();
    if (cola.pMax - cola.pMin > cola.cap * 0.6) { /* subida completa */ }
    else b.addUpdateRange?.(cola.pMin * STRIDE, (cola.pMax - cola.pMin + 1) * STRIDE);
    b.needsUpdate = true;
    cola.dMin = 1e9; cola.dMax = -1;
  }

  function actualizar(dt, ambiente) {
    T += dt;
    uniformes.uT.value = T;
    if (ambiente) {
      uniformes.uAmb.value.copy(ambiente.amb); uniformes.uSol.value.copy(ambiente.sol);
      uniformes.uLdir.value.copy(ambiente.dir);
      uniformes.uFogColor.value.copy(ambiente.niebla); uniformes.uFogDens.value = ambiente.nieblaD;
    }
    // resplandor global (explosiones / fogonazos) que se apaga solo
    const gl = uniformes.uGlow.value;
    const k = Math.exp(-3.2 * dt);
    gl.r *= k; gl.g *= k; gl.b *= k;
    subir(humo); subir(brillo);
  }

  /** Resplandor: ilumina por un instante el humo (el color se suma a la luz ambiente de las partículas). */
  function resplandor(r, g, b) {
    const gl = uniformes.uGlow.value;
    gl.r = Math.min(2, gl.r + r); gl.g = Math.min(2, gl.g + g); gl.b = Math.min(2, gl.b + b);
  }

  function limpiar() {
    for (const c of [humo, brillo]) {
      c.data.fill(0); c.sig = 0; c.alto = 0; c.lleno = false; c.geo.instanceCount = 0; c.dMin = 1e9; c.dMax = -1;
      c.buf.clearUpdateRanges?.(); c.buf.needsUpdate = true;
    }
  }

  /** Cuenta partículas vivas (diagnóstico, recorre los buffers). */
  function vivas() {
    let n = 0;
    for (const c of [humo, brillo]) {
      const tot = c.lleno ? c.cap : c.alto;
      for (let i = 0; i < tot; i++) { const o = i * STRIDE, a = T - c.data[o + 6]; if (a >= 0 && a < c.data[o + 7]) n++; }
    }
    return n;
  }

  function liberar() {
    for (const c of [humo, brillo]) { c.malla.removeFromParent(); c.geo.dispose(); c.mat.dispose(); }
  }

  return { humo, brillo, S, lanzar, actualizar, limpiar, liberar, resplandor, vivas, reloj: () => T, uniformes, rng };
}
