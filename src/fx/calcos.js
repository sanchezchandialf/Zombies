// Calcos sobre el suelo (sangre, quemaduras, ácido, cráteres, aceite, huellas).
// Un único InstancedMesh con buffer circular (~450): al llenarse recicla el más antiguo. Se desvanecen despacio.
// Sin z-fighting: profundidad sin escritura, polygonOffset y una pequeña altura distinta por instancia.
// La sangre es roja saturada, brillante y mojada al aparecer; se oscurece al secarse.
import * as THREE from 'three';
import { atlasCalcos } from './atlas.js';

const STRIDE = 16;
const TIPOS = {
  //            celdas            kind  color                         vida   crece  alfa
  sangre:    { celdas: [0, 1, 2, 3, 6], kind: 0, color: [0.4, 0.012, 0.014], vida: 210, crece: 0.28, alfa: 0.97 },
  quemadura: { celdas: [8, 9, 10], kind: 1, color: [0.045, 0.04, 0.036], vida: 150, crece: 0.18, alfa: 0.88 },
  acido:     { celdas: [11, 12], kind: 2, color: [0.32, 0.9, 0.06], vida: 40, crece: 0.45, alfa: 0.92 },
  crater:    { celdas: [13], kind: 3, color: [0.11, 0.085, 0.065], vida: 320, crece: 0.12, alfa: 0.92 },
  aceite:    { celdas: [14], kind: 4, color: [0.012, 0.011, 0.012], vida: 160, crece: 0.8, alfa: 0.95 },
  huella:    { celdas: [15], kind: 5, color: [0.1, 0.07, 0.05], vida: 28, crece: 0.0, alfa: 0.8 },
};

const VS = /* glsl */`
attribute vec2 aEsq;
attribute vec4 aA; attribute vec4 aB; attribute vec4 aC; attribute vec4 aD;
uniform float uT; uniform vec3 uFogColor; uniform float uFogDens;
varying vec2 vQ; varying vec4 vC; varying vec3 vW; varying vec4 vB; varying vec2 vRot; varying float vAge; varying float vFog; varying float vAlpha;
void main() {
  float age = uT - aB.y, life = aB.z;
  if (age < 0.0 || age >= life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec4(0.0); vQ = vec2(0.0); vW = vec3(0.0); vB = vec4(0.0); vRot = vec2(1.0, 0.0); vAge = 0.0; vFog = 0.0; vAlpha = 0.0; return; }
  float tg = aD.y > 0.0 ? min(age / aD.y, 1.0) : 1.0;
  float grow = 1.0 - pow(1.0 - tg, 3.0);
  float size = aA.z * mix(0.22, 1.0, grow);
  float a = aC.a * smoothstep(0.0, 0.05, age) * (1.0 - smoothstep(life * 0.72, life, age));
  float r = aA.w;
  vec2 rc = vec2(cos(r), sin(r));
  vec2 l = vec2(aEsq.x * aD.x, -aEsq.y) * size * 0.5;
  vec3 wp = vec3(aA.x + rc.x * l.x - rc.y * l.y, 0.022 + float(gl_InstanceID % 48) * 0.00045, aA.y + rc.y * l.x + rc.x * l.y);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  vQ = aEsq; vC = aC; vW = wp; vB = aB; vRot = rc; vAge = age; vAlpha = a;
  vFog = 1.0 - exp(-uFogDens * uFogDens * dot(mv.xyz, mv.xyz));
}
`;
const FS = /* glsl */`
uniform sampler2D uAtlas; uniform vec3 uAmb; uniform vec3 uSol; uniform vec3 uLdir; uniform vec3 uGlow; uniform vec3 uFogColor; uniform float uT;
varying vec2 vQ; varying vec4 vC; varying vec3 vW; varying vec4 vB; varying vec2 vRot; varying float vAge; varying float vFog; varying float vAlpha;
void main() {
  if (vAlpha <= 0.001) discard;
  float cel = vB.x, kind = vB.w;
  vec2 uv = (vec2(mod(cel, 4.0), floor(cel / 4.0)) + vec2(vQ.x * 0.5 + 0.5, 0.5 - vQ.y * 0.5)) * 0.25;
  vec4 t = texture2D(uAtlas, uv);
  float a = t.a * vAlpha;
  if (a <= 0.003) discard;
  vec2 nl = vec2(t.g * 2.0 - 1.0, -(t.b * 2.0 - 1.0));
  vec2 nw = vec2(vRot.x * nl.x - vRot.y * nl.y, vRot.y * nl.x + vRot.x * nl.y);
  vec3 n = normalize(vec3(nw.x * 0.9, 1.0, nw.y * 0.9));
  vec3 V = normalize(cameraPosition - vW), H = normalize(uLdir + V);
  float ndl = clamp(dot(n, uLdir), 0.0, 1.0);
  vec3 lum = max(uAmb + uSol * ndl + uGlow * 0.5, vec3(0.5));
  vec3 col; vec3 emi = vec3(0.0);
  if (kind < 0.5) {            // sangre: roja saturada, mojada al principio
    float seca = smoothstep(6.0, 80.0, vAge);
    // borde fino más vivo, centro espeso casi granate; se oscurece al secarse
    col = vC.rgb * mix(1.15, 0.5, t.r) * mix(1.0, 0.55, seca);
    col *= mix(vec3(1.0), vec3(1.0, 1.0, 1.0), seca);
    float spec = pow(max(dot(n, H), 0.0), 90.0) * (1.0 - seca * 0.85) * 0.75 * smoothstep(0.2, 0.6, t.r);
    col *= lum; col += vec3(1.0, 0.85, 0.85) * spec * (uSol + 0.15);
  } else if (kind < 1.5) {     // quemadura: hollín mate, más claro en el borde
    col = mix(vC.rgb * 2.2, vC.rgb * 0.55, t.r) * lum;
  } else if (kind < 2.5) {     // ácido: charco que burbujea y brilla
    float p = 0.75 + 0.25 * sin(uT * 3.0 + vW.x * 2.0 + vW.z * 3.0);
    col = vC.rgb * (0.35 + 0.5 * t.r) * lum;
    emi = vec3(0.45, 1.5, 0.1) * (0.35 + 0.65 * t.r) * p * (1.0 - smoothstep(0.55, 1.0, vAge / vB.z));
  } else if (kind < 3.5) {     // cráter: fondo casi negro, tierra removida más clara y cálida en el labio
    col = mix(vC.rgb * 0.3, vC.rgb * vec3(1.7, 1.45, 1.15), t.r) * lum;
  } else if (kind < 4.5) {     // aceite: casi negro con reflejos
    float spec = pow(max(dot(n, H), 0.0), 30.0) * 1.2;
    float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.0);
    col = vC.rgb * lum + (uAmb * 1.6 + uSol * 0.4) * (0.15 + fres) * 0.5 * t.r + vec3(spec) * uSol;
  } else {
    col = vC.rgb * lum;
  }
  col = mix(col, uFogColor, vFog * 0.85);
  col += emi;
  gl_FragColor = vec4(col * a, a);
}
`;

export function crearCalcos(juego, escena, uniformes, opciones = {}) {
  const cap = opciones.max ?? 450;
  const data = new Float32Array(cap * STRIDE);
  const buf = new THREE.InstancedInterleavedBuffer(data, STRIDE, 1);
  buf.setUsage(THREE.DynamicDrawUsage);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('aEsq', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [n, o] of [['aA', 0], ['aB', 4], ['aC', 8], ['aD', 12]]) g.setAttribute(n, new THREE.InterleavedBufferAttribute(buf, 4, o));
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS,
    uniforms: { ...uniformes, uAtlas: { value: atlasCalcos() } },
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const malla = new THREE.Mesh(g, mat);
  malla.frustumCulled = false; malla.renderOrder = 3; malla.name = 'fx_calcos';
  escena.add(malla);

  let sig = 0, alto = 0, lleno = false, dMin = 1e9, dMax = -1, pMin = 1e9, pMax = -1, dibujada = true;
  malla.onBeforeRender = () => { dibujada = true; };   // acumula tramos sucios mientras no se dibuja (ver particulas.js)
  const rng = juego.rng ?? Math.random;
  const reloj = () => uniformes.uT.value;

  /** Crea un calco. Devuelve su índice. opciones: { rot, dirX, dirZ, alfa, color:[r,g,b], celda, vida, crece, aspecto } */
  function calco(tipo, x, z, tam, o) {
    const T = TIPOS[tipo] ?? TIPOS.sangre;
    if (tipo === 'sangre') tam *= 1.45;   // la masa útil de la textura ocupa ~la mitad del cuadro
    const r = rng();
    let celda;
    if (o?.celda !== undefined) celda = o.celda;
    else if (tipo === 'sangre') {
      if (o && (o.dirX || o.dirZ) && o.direccional !== false) celda = r < 0.5 ? 4 : 5;
      else if (o?.charco) celda = 6;
      else if (tam >= 1.6) celda = r < 0.5 ? 0 : 1;
      else celda = r < 0.5 ? 2 : 3;
    } else celda = T.celdas[Math.floor(r * T.celdas.length)];
    let rot = o?.rot;
    if (rot === undefined) rot = (o && (o.dirX || o.dirZ) && (celda === 4 || celda === 5 || tipo === 'huella')) ? Math.atan2(o.dirZ, o.dirX) : rng() * 6.2832;
    const i = sig; sig = i + 1 >= cap ? 0 : i + 1; if (sig === 0) lleno = true; if (i + 1 > alto) alto = i + 1;
    const p = i * STRIDE, c = o?.color ?? T.color;
    // las manchas direccionales se alargan algo hacia donde van
    const asp = o?.aspecto ?? ((celda === 4 || celda === 5) ? 1.15 : 1);
    data[p] = x; data[p + 1] = z; data[p + 2] = tam; data[p + 3] = rot;
    data[p + 4] = celda; data[p + 5] = reloj(); data[p + 6] = (o?.vida ?? T.vida) * (0.9 + 0.2 * rng()); data[p + 7] = T.kind;
    const v = tipo === 'sangre' ? 0.88 + rng() * 0.24 : 1;
    data[p + 8] = c[0] * v; data[p + 9] = c[1] * (tipo === 'sangre' ? v : 1); data[p + 10] = c[2] * (tipo === 'sangre' ? v : 1); data[p + 11] = o?.alfa ?? T.alfa;
    data[p + 12] = asp; data[p + 13] = o?.crece ?? T.crece; data[p + 14] = 0; data[p + 15] = 0;
    if (i < dMin) dMin = i; if (i > dMax) dMax = i;
    return i;
  }

  // Cola de calcos diferidos: las gotas de sangre manchan el suelo donde aterrizan, no donde nacieron.
  const NP = 192;
  const pt = new Float32Array(NP), px = new Float32Array(NP), pz = new Float32Array(NP), ptam = new Float32Array(NP);
  const pdx = new Float32Array(NP), pdz = new Float32Array(NP), ptipo = new Uint8Array(NP); // 0 = libre
  const NOMBRES = ['', 'sangre', 'quemadura', 'acido'];
  let psig = 0;
  function programar(retardo, tipo, x, z, tam, dx = 0, dz = 0) {
    const id = NOMBRES.indexOf(tipo); if (id <= 0) return;
    const i = psig; psig = (psig + 1) % NP;
    pt[i] = reloj() + retardo; px[i] = x; pz[i] = z; ptam[i] = tam; pdx[i] = dx; pdz[i] = dz; ptipo[i] = id;
  }
  const _o = { dirX: 0, dirZ: 0, direccional: true };

  function actualizar() {
    const t = reloj();
    for (let i = 0; i < NP; i++) {
      if (ptipo[i] && pt[i] <= t) {
        _o.dirX = pdx[i]; _o.dirZ = pdz[i];
        calco(NOMBRES[ptipo[i]], px[i], pz[i], ptam[i], (pdx[i] || pdz[i]) ? _o : undefined);
        ptipo[i] = 0;
      }
    }
    if (dMax >= 0) {
      g.instanceCount = lleno ? cap : alto;
      if (dibujada) { pMin = 1e9; pMax = -1; dibujada = false; }
      pMin = Math.min(pMin, dMin); pMax = Math.max(pMax, dMax);
      buf.clearUpdateRanges?.();
      buf.addUpdateRange?.(pMin * STRIDE, (pMax - pMin + 1) * STRIDE);
      buf.needsUpdate = true; dMin = 1e9; dMax = -1;
    }
  }

  function limpiar() {
    data.fill(0); sig = 0; alto = 0; lleno = false; g.instanceCount = 0; dMin = 1e9; dMax = -1; ptipo.fill(0);
    buf.clearUpdateRanges?.(); buf.needsUpdate = true;
  }
  function liberar() { malla.removeFromParent(); g.dispose(); mat.dispose(); }
  function cuenta() { const tot = lleno ? cap : alto; let n = 0; const t = reloj(); for (let i = 0; i < tot; i++) { const a = t - data[i * STRIDE + 5]; if (a >= 0 && a < data[i * STRIDE + 6]) n++; } return n; }

  return { calco, programar, actualizar, limpiar, liberar, cuenta, cap, TIPOS };
}
