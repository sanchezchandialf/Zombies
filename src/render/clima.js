// Clima de partículas totalmente en GPU: cada sistema es una malla instanciada cuyas posiciones se calculan en el
// vertex shader a partir de una semilla y del tiempo, envolviendo en una caja que sigue a la cámara.
// Tipos: niebla · polvo · lluvia (con salpicaduras) · neon (lluvia con tinte neón) · ceniza · luminosa.
import * as THREE from 'three';

const ENVOLVER = /* glsl */`
  uniform float uTiempo, uCant, uFade;
  uniform vec3 uCentro, uCaja;
  attribute vec4 aSemilla;
  float h11(float n) { return fract(sin(n) * 43758.5453123); }
  vec3 h31(float n) { return fract(sin(vec3(n * 127.1, n * 311.7, n * 74.7)) * 43758.5453123); }
  // posición base (0..1)^3 + movimiento → dentro de la caja centrada en uCentro (xz) con y ∈ [uY0, uY0+caja.y]
  vec3 envolver(vec3 base, vec3 mov, float y0) {
    vec3 p = base * uCaja + mov;
    vec2 o = uCentro.xz - uCaja.xz * .5;
    p.xz = mod(p.xz - o, uCaja.xz) + o;
    p.y = mod(p.y - y0, uCaja.y) + y0;
    return p;
  }
  bool descartar() { return aSemilla.w > uCant * uFade; }
`;

const VS_CORRIENTE = /* glsl */`
  ${ENVOLVER}
  uniform vec3 uVel; uniform float uLargo, uGrosor;
  varying vec2 vUv; varying float vDist, vY, vVar;
  void main() {
    vUv = position.xy;
    vVar = fract(aSemilla.w * 91.7);
    if (descartar()) { gl_Position = vec4(2., 2., 2., 1.); return; }
    float k = .85 + .3 * h11(aSemilla.x * 77. + aSemilla.z * 31.);
    vec3 p = envolver(aSemilla.xyz, uVel * uTiempo * k, 0.);
    vY = p.y;
    vec4 mv = viewMatrix * vec4(p, 1.);
    vec3 eje = normalize(mat3(viewMatrix) * uVel);
    vec3 haciaCam = normalize(-mv.xyz);
    vec3 lado = normalize(cross(eje, haciaCam));
    float L = uLargo * (.7 + .6 * vVar);
    mv.xyz += eje * (position.y * L) + lado * (position.x * uGrosor);
    vDist = length(mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FS_CORRIENTE = /* glsl */`
  uniform vec3 uColA, uColB, uLuz; uniform float uAlfa, uEmisivo;
  varying vec2 vUv; varying float vDist, vY, vVar;
  void main() {
    if (vY < 0.) discard;
    float a = pow(1. - abs(vUv.x) * 2., 1.4) * mix(.12, 1., vUv.y + .5);
    a *= smoothstep(2.5, 11., vDist) * exp(-vDist * .012) * uAlfa;
    vec3 c = mix(uColA, uColB, step(.5, vVar));
    c *= mix(uLuz, vec3(1.), uEmisivo);
    gl_FragColor = vec4(c, a);
  }`;

const VS_SALPICADURA = /* glsl */`
  ${ENVOLVER}
  attribute float aTipo;
  uniform float uRitmo, uTam;
  varying vec2 vUv; varying float vFase, vTipo, vVar, vDist;
  void main() {
    vUv = position.xz; vTipo = aTipo;
    vVar = fract(aSemilla.w * 53.1);
    if (descartar()) { gl_Position = vec4(2., 2., 2., 1.); return; }
    float ciclo = uTiempo * uRitmo * (.75 + .5 * vVar) + aSemilla.w * 10.;
    float c = floor(ciclo); vFase = ciclo - c;
    vec3 r = h31(aSemilla.x * 913. + aSemilla.z * 71. + c * 7.13);
    vec3 p = envolver(vec3(r.x, 0., r.z), vec3(0.), 0.);
    p.y = .02;
    float R = (.05 + vFase * .42) * uTam * (.8 + .4 * vVar);
    vec4 mv;
    if (aTipo < .5) {
      vec3 w = p + vec3(position.x * R, 0., position.z * R);
      mv = viewMatrix * vec4(w, 1.);
    } else {
      float hgt = (1. - (1. - vFase * 1.8) * (1. - vFase * 1.8)) * .28 * uTam;
      mv = viewMatrix * vec4(p, 1.);
      mv.xy += vec2(position.x * .07 * uTam, (position.y + .5) * max(hgt, 0.));
    }
    vDist = length(mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FS_SALPICADURA = /* glsl */`
  uniform vec3 uColA, uColB, uLuz; uniform float uAlfa, uEmisivo;
  varying vec2 vUv; varying float vFase, vTipo, vVar, vDist;
  void main() {
    float a;
    if (vTipo < .5) {
      float r = length(vUv) * 2.;
      a = exp(-pow((r - .82) / .09, 2.)) * pow(1. - vFase, 2.4) * .6;
    } else {
      float f = (vUv.y + .5);
      a = smoothstep(.5, 0., abs(vUv.x) * 2. * (.4 + f)) * smoothstep(.0, .25, f) * (1. - vFase) * (1. - vFase) * step(vFase, .6) * .9;
    }
    a *= smoothstep(4., 12., vDist) * exp(-vDist * .01) * uAlfa;
    vec3 c = mix(uColA, uColB, step(.5, vVar));
    c *= mix(uLuz, vec3(1.), uEmisivo);
    gl_FragColor = vec4(c, a);
  }`;

const VS_MOTA = /* glsl */`
  ${ENVOLVER}
  uniform vec3 uVel; uniform vec2 uTam; uniform float uOscila, uY0;
  varying vec2 vUv; varying float vVar, vDist, vParp;
  void main() {
    vUv = position.xy * 2.;
    vVar = fract(aSemilla.w * 37.7);
    if (descartar()) { gl_Position = vec4(2., 2., 2., 1.); return; }
    float k = .6 + .8 * h11(aSemilla.x * 41. + aSemilla.y * 13.);
    vec3 mov = uVel * uTiempo * k;
    float f = uTiempo * (.4 + vVar) + aSemilla.x * 40.;
    mov += vec3(sin(f * 1.3), sin(f * .9 + 2.), cos(f * 1.1)) * uOscila * (.5 + vVar);
    vec3 p = envolver(aSemilla.xyz, mov, uY0);
    vParp = .65 + .35 * sin(uTiempo * (3. + vVar * 7.) + aSemilla.z * 50.);
    vec4 mv = viewMatrix * vec4(p, 1.);
    float s = mix(uTam.x, uTam.y, h11(aSemilla.z * 19. + 3.));
    mv.xy += position.xy * s;
    vDist = length(mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FS_MOTA = /* glsl */`
  uniform vec3 uColA, uColB, uLuz; uniform float uAlfa, uEmisivo, uParp;
  varying vec2 vUv; varying float vVar, vDist, vParp;
  void main() {
    float r2 = dot(vUv, vUv);
    if (r2 > 1.) discard;
    float a = (1. - r2); a *= a;
    a *= smoothstep(1.5, 7., vDist) * exp(-vDist * .01) * uAlfa * mix(1., vParp, uParp);
    vec3 c = mix(uColA, uColB, step(.5, vVar));
    c *= mix(uLuz, vec3(1.), uEmisivo);
    gl_FragColor = vec4(c, a);
  }`;

const VS_NIEBLA = /* glsl */`
  ${ENVOLVER}
  uniform vec3 uVel; uniform vec2 uTam; uniform float uY0;
  varying vec2 vUv; varying vec3 vMund; varying float vDist, vVar;
  void main() {
    vUv = position.xz * 2.;
    vVar = fract(aSemilla.w * 29.3);
    if (descartar()) { gl_Position = vec4(2., 2., 2., 1.); return; }
    vec3 p = envolver(aSemilla.xyz, uVel * uTiempo * (.5 + vVar), uY0);
    float s = mix(uTam.x, uTam.y, h11(aSemilla.z * 23. + 1.));
    float ang = aSemilla.x * 6.2831 * 3.;
    float cs = cos(ang), sn = sin(ang);
    vec3 w = p + vec3(position.x * cs - position.z * sn, 0., position.x * sn + position.z * cs) * s;
    vMund = w;
    vec4 mv = viewMatrix * vec4(w, 1.);
    vDist = length(mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FS_NIEBLA = /* glsl */`
  uniform vec3 uColA, uColB, uLuz; uniform float uAlfa, uTiempo;
  varying vec2 vUv; varying vec3 vMund; varying float vDist, vVar;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
  void main() {
    float r = length(vUv);
    if (r > 1.) discard;
    float borde = (1. - r); borde *= borde;
    vec2 q = vMund.xz * .11 + vec2(uTiempo * .013, -uTiempo * .009) * (1. + vVar);
    float n = vn(q) * .6 + vn(q * 2.3 + 7.) * .4;
    float a = borde * smoothstep(.22, .85, n) * uAlfa;
    a *= smoothstep(3., 14., vDist);
    vec3 c = mix(uColA, uColB, n);
    gl_FragColor = vec4(c * uLuz, a);
  }`;

function semillas(n, rng) {
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    a[i * 4] = rng(); a[i * 4 + 1] = rng(); a[i * 4 + 2] = rng();
    a[i * 4 + 3] = (i + 0.5) / n; // w ordena la densidad: cantidad c ⇒ se ven los de w < c
  }
  return a;
}

function mezclarUniformes(o) {
  return {
    uTiempo: { value: 0 }, uCant: { value: 1 }, uFade: { value: 0 }, uCentro: { value: new THREE.Vector3() }, uCaja: { value: new THREE.Vector3(60, 26, 60) },
    uColA: { value: new THREE.Color(1, 1, 1) }, uColB: { value: new THREE.Color(1, 1, 1) }, uLuz: { value: new THREE.Color(1, 1, 1) },
    uAlfa: { value: 1 }, uEmisivo: { value: 0 }, ...o,
  };
}

function crearMalla(geoBase, n, rng, vs, fs, uniformes, blending = THREE.NormalBlending, extraAttrs) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = geoBase.index;
  for (const k in geoBase.attributes) geo.setAttribute(k, geoBase.attributes[k]);
  geo.setAttribute('aSemilla', new THREE.InstancedBufferAttribute(semillas(n, rng), 4));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    vertexShader: vs, fragmentShader: fs, uniforms: uniformes, transparent: true, depthWrite: false, blending,
    fog: false, toneMapped: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false; m.renderOrder = 20;
  m.userData.liberar = () => { geo.dispose(); mat.dispose(); };
  return m;
}

function geoQuadVertical() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
function geoQuadSuelo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, 0, -.5, .5, 0, -.5, .5, 0, .5, -.5, 0, .5]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
function geoSalpicadura() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1,           // anillo
    -.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0,   // corona
  ]), 3));
  g.setAttribute('aTipo', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 1, 1, 1]), 1));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return g;
}

const C = (h) => new THREE.Color(h);

/** Descripciones de cada tipo de clima. `luz` indica si el color se atenúa con la luz ambiente. */
const TIPOS = {
  niebla(rng, escala, base) {
    const sistemas = [];
    const u = mezclarUniformes({ uCaja: { value: new THREE.Vector3(80, 3, 80) }, uVel: { value: new THREE.Vector3(.5, 0, .2) }, uTam: { value: new THREE.Vector2(9, 17) }, uY0: { value: 0.12 } });
    u.uColA.value.copy(base.niebla).multiplyScalar(1.15); u.uColB.value.copy(base.niebla).lerp(C(0x9fb4d8), .45).multiplyScalar(1.2); u.uAlfa.value = 0.26;
    sistemas.push({ m: crearMalla(geoQuadSuelo(), Math.round(46 * escala), rng, VS_NIEBLA, FS_NIEBLA, u), u, luz: true, cant: 0.8 });
    const u2 = mezclarUniformes({ uCaja: { value: new THREE.Vector3(46, 7, 46) }, uVel: { value: new THREE.Vector3(.18, .05, .08) }, uTam: { value: new THREE.Vector2(.03, .07) }, uOscila: { value: .6 }, uY0: { value: .3 }, uParp: { value: .8 } });
    u2.uColA.value.set(2.2, 1.35, .6); u2.uColB.value.set(1.6, 1.5, 1.2); u2.uAlfa.value = .75; u2.uEmisivo.value = 1;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(140 * escala), rng, VS_MOTA, FS_MOTA, u2, THREE.NormalBlending), u: u2, luz: false, cant: .55 });
    return sistemas;
  },
  polvo(rng, escala, base) {
    const sistemas = [];
    const u = mezclarUniformes({ uCaja: { value: new THREE.Vector3(60, 7, 60) }, uVel: { value: new THREE.Vector3(5.2, .1, 1.1) }, uTam: { value: new THREE.Vector2(.05, .14) }, uOscila: { value: .9 }, uY0: { value: .1 }, uParp: { value: 0 } });
    u.uColA.value.set(.95, .62, .34); u.uColB.value.set(.8, .55, .38); u.uAlfa.value = .38;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(600 * escala), rng, VS_MOTA, FS_MOTA, u), u, luz: true, cant: .9 });
    const u2 = mezclarUniformes({ uCaja: { value: new THREE.Vector3(80, 2.4, 80) }, uVel: { value: new THREE.Vector3(2.4, 0, .5) }, uTam: { value: new THREE.Vector2(10, 18) }, uY0: { value: .2 } });
    u2.uColA.value.set(.82, .5, .26); u2.uColB.value.set(.7, .46, .32); u2.uAlfa.value = .12;
    sistemas.push({ m: crearMalla(geoQuadSuelo(), Math.round(30 * escala), rng, VS_NIEBLA, FS_NIEBLA, u2), u: u2, luz: true, cant: .8 });
    return sistemas;
  },
  lluvia(rng, escala) {
    const sistemas = [];
    const u = mezclarUniformes({ uCaja: { value: new THREE.Vector3(56, 24, 56) }, uVel: { value: new THREE.Vector3(-2.4, -19, -.9) }, uLargo: { value: 1.05 }, uGrosor: { value: .022 } });
    u.uColA.value.set(.62, .68, .7); u.uColB.value.set(.74, .78, .74); u.uAlfa.value = .3;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(2600 * escala), rng, VS_CORRIENTE, FS_CORRIENTE, u), u, luz: true, cant: 1 });
    const us = mezclarUniformes({ uCaja: { value: new THREE.Vector3(46, 1, 46) }, uRitmo: { value: 2.2 }, uTam: { value: 1 } });
    us.uColA.value.set(.78, .82, .82); us.uColB.value.set(.7, .78, .72); us.uAlfa.value = .24;
    sistemas.push({ m: crearMalla(geoSalpicadura(), Math.round(520 * escala), rng, VS_SALPICADURA, FS_SALPICADURA, us), u: us, luz: true, cant: 1 });
    const un = mezclarUniformes({ uCaja: { value: new THREE.Vector3(80, 3, 80) }, uVel: { value: new THREE.Vector3(.9, 0, .3) }, uTam: { value: new THREE.Vector2(9, 16) }, uY0: { value: .15 } });
    un.uColA.value.set(.7, .68, .38); un.uColB.value.set(.58, .62, .42); un.uAlfa.value = .11;
    sistemas.push({ m: crearMalla(geoQuadSuelo(), Math.round(40 * escala), rng, VS_NIEBLA, FS_NIEBLA, un), u: un, luz: true, cant: .85 });
    return sistemas;
  },
  neon(rng, escala) {
    const sistemas = [];
    const u = mezclarUniformes({ uCaja: { value: new THREE.Vector3(56, 24, 56) }, uVel: { value: new THREE.Vector3(-1.4, -21, -.4) }, uLargo: { value: 1.1 }, uGrosor: { value: .03 } });
    u.uColA.value.set(1.9, .55, 1.15); u.uColB.value.set(.45, 1.5, 1.7); u.uAlfa.value = .24; u.uEmisivo.value = .75;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(1500 * escala), rng, VS_CORRIENTE, FS_CORRIENTE, u), u, luz: false, cant: 1 });
    const us = mezclarUniformes({ uCaja: { value: new THREE.Vector3(46, 1, 46) }, uRitmo: { value: 1.8 }, uTam: { value: .7 } });
    us.uColA.value.set(1.8, .6, 1.2); us.uColB.value.set(.5, 1.5, 1.6); us.uAlfa.value = .22; us.uEmisivo.value = .8;
    sistemas.push({ m: crearMalla(geoSalpicadura(), Math.round(420 * escala), rng, VS_SALPICADURA, FS_SALPICADURA, us), u: us, luz: false, cant: 1 });
    return sistemas;
  },
  ceniza(rng, escala) {
    const sistemas = [];
    const u = mezclarUniformes({ uCaja: { value: new THREE.Vector3(60, 8, 60) }, uVel: { value: new THREE.Vector3(1.1, -1.05, .35) }, uTam: { value: new THREE.Vector2(.035, .085) }, uOscila: { value: 1.1 }, uY0: { value: 0 }, uParp: { value: 0 } });
    u.uColA.value.set(.78, .8, .84); u.uColB.value.set(.56, .58, .62); u.uAlfa.value = .5;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(1300 * escala), rng, VS_MOTA, FS_MOTA, u), u, luz: true, cant: 1 });
    const ue = mezclarUniformes({ uCaja: { value: new THREE.Vector3(50, 12, 50) }, uVel: { value: new THREE.Vector3(.6, .55, .2) }, uTam: { value: new THREE.Vector2(.05, .11) }, uOscila: { value: .9 }, uY0: { value: .2 }, uParp: { value: .9 } });
    ue.uColA.value.set(3.2, .7, .35); ue.uColB.value.set(2.6, .45, .3); ue.uAlfa.value = .9; ue.uEmisivo.value = 1;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(220 * escala), rng, VS_MOTA, FS_MOTA, ue), u: ue, luz: false, cant: .7 });
    const un = mezclarUniformes({ uCaja: { value: new THREE.Vector3(80, 3.5, 80) }, uVel: { value: new THREE.Vector3(1.2, 0, .4) }, uTam: { value: new THREE.Vector2(10, 18) }, uY0: { value: .3 } });
    un.uColA.value.set(.34, .36, .4); un.uColB.value.set(.26, .28, .32); un.uAlfa.value = .14;
    sistemas.push({ m: crearMalla(geoQuadSuelo(), Math.round(26 * escala), rng, VS_NIEBLA, FS_NIEBLA, un), u: un, luz: true, cant: .8 });
    return sistemas;
  },
  luminosa(rng, escala) {
    const sistemas = [];
    const u = mezclarUniformes({ uCaja: { value: new THREE.Vector3(56, 26, 56) }, uVel: { value: new THREE.Vector3(-3.2, -24, -.8) }, uLargo: { value: 1.35 }, uGrosor: { value: .026 } });
    u.uColA.value.set(3.4, .6, 2.2); u.uColB.value.set(.7, 2.5, 3.6); u.uAlfa.value = .36; u.uEmisivo.value = 1;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(1700 * escala), rng, VS_CORRIENTE, FS_CORRIENTE, u), u, luz: false, cant: 1 });
    const us = mezclarUniformes({ uCaja: { value: new THREE.Vector3(46, 1, 46) }, uRitmo: { value: 2.0 }, uTam: { value: .65 } });
    us.uColA.value.set(3.0, .7, 2.0); us.uColB.value.set(.8, 2.2, 3.0); us.uAlfa.value = .2; us.uEmisivo.value = 1;
    sistemas.push({ m: crearMalla(geoSalpicadura(), Math.round(400 * escala), rng, VS_SALPICADURA, FS_SALPICADURA, us), u: us, luz: false, cant: 1 });
    const um = mezclarUniformes({ uCaja: { value: new THREE.Vector3(50, 10, 50) }, uVel: { value: new THREE.Vector3(.15, .45, .1) }, uTam: { value: new THREE.Vector2(.04, .1) }, uOscila: { value: .7 }, uY0: { value: .2 }, uParp: { value: 1 } });
    um.uColA.value.set(.7, 2.8, 3.6); um.uColB.value.set(3.2, .8, 2.6); um.uAlfa.value = .85; um.uEmisivo.value = 1;
    sistemas.push({ m: crearMalla(geoQuadVertical(), Math.round(260 * escala), rng, VS_MOTA, FS_MOTA, um), u: um, luz: false, cant: .8 });
    return sistemas;
  },
};

/** Gestor de clima: cambia de tipo con fundido cruzado y sigue a la cámara. */
export function crearClima(escena, rng) {
  const raiz = new THREE.Group(); raiz.name = 'clima'; escena.add(raiz);
  let activo = null;           // { tipo, sistemas, fade }
  const saliendo = [];
  let escala = 1, cantidad = 1;
  const luzAmb = new THREE.Color(1, 1, 1);

  function construir(tipo, atm) {
    const f = TIPOS[tipo];
    if (!f) return null;
    const sistemas = f(rng, 1.15, atm);
    for (const s of sistemas) raiz.add(s.m);
    return { tipo, sistemas, fade: 0 };
  }
  function destruir(g) { for (const s of g.sistemas) { raiz.remove(s.m); s.m.userData.liberar?.(); } }

  return {
    get tipo() { return activo?.tipo ?? null; },
    /** tipo: 'niebla'|'polvo'|'lluvia'|'neon'|'ceniza'|'luminosa'|null ; cant: 0..1 ; inmediato: sin fundido */
    establecer(tipo, cant, atm, inmediato = false) {
      cantidad = cant ?? 1;
      if ((activo?.tipo ?? null) === (tipo ?? null)) return;
      if (activo) { saliendo.push(activo); if (inmediato) { destruir(activo); saliendo.pop(); } }
      activo = tipo ? construir(tipo, atm) : null;
      if (activo && inmediato) activo.fade = 1;
    },
    /** Calidad: fracción de partículas usadas (0.35 baja … 1 ultra). */
    escala(e) { escala = e; },
    actualizar(dt, tiempo, centro, atm, luminosidad) {
      luzAmb.setScalar(luminosidad);
      // el tinte de la luz ambiente acompaña al color de la niebla
      luzAmb.r = luminosidad * (0.7 + 0.3 * Math.min(1.5, atm.niebla.r * 3));
      luzAmb.g = luminosidad * (0.7 + 0.3 * Math.min(1.5, atm.niebla.g * 3));
      luzAmb.b = luminosidad * (0.7 + 0.3 * Math.min(1.5, atm.niebla.b * 3));
      const grupo = (g, objetivo) => {
        g.fade += Math.sign(objetivo - g.fade) * Math.min(Math.abs(objetivo - g.fade), dt * 0.7);
        for (const s of g.sistemas) {
          const u = s.u;
          u.uTiempo.value = tiempo; u.uCentro.value.copy(centro);
          u.uFade.value = g.fade; u.uCant.value = Math.min(1, s.cant * cantidad * escala);
          u.uLuz.value.copy(luzAmb);
        }
      };
      if (activo) grupo(activo, 1);
      for (let i = saliendo.length - 1; i >= 0; i--) {
        grupo(saliendo[i], 0);
        if (saliendo[i].fade <= 0.001) { destruir(saliendo[i]); saliendo.splice(i, 1); }
      }
    },
    liberar() { if (activo) destruir(activo); for (const g of saliendo) destruir(g); escena.remove(raiz); },
  };
}
