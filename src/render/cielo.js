// Cielo procedural en shader (degradado, sol y luna con halo, estrellas, vía láctea, nubes) y entorno PMREM derivado de él.
import * as THREE from 'three';

const COMUN = /* glsl */`
  varying vec3 vDir;
  uniform vec3 uCenit, uHorizonte, uSuelo, uSolDir, uSolColor, uLunaDir, uLunaColor, uNubeClaro, uNubeOscuro, uNiebla;
  uniform float uSolI, uLunaI, uNoche, uEstrellas, uTiempo, uNubes, uNubesVel, uFlash, uEntorno;

  float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
  vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float vnoise2(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    float a = hash13(vec3(i, 1.)), b = hash13(vec3(i + vec2(1,0), 1.)), c = hash13(vec3(i + vec2(0,1), 1.)), d = hash13(vec3(i + 1., 1.));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm2(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoise2(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; } return s; }

  vec3 estrellas(vec3 d) {
    vec3 acc = vec3(0.);
    for (int k = 0; k < 2; k++) {
      float esc = k == 0 ? 95. : 210.;
      vec3 p = d * esc, id = floor(p), f = fract(p);
      vec3 j = hash33(id), c = vec3(.5) + (j - .5) * .6;
      float h = hash13(id + 7.7);
      float umbral = k == 0 ? .955 : .975;
      if (h > umbral) {
        float r = length(f - c);
        float b = (h - umbral) / (1. - umbral);
        float tw = .7 + .3 * sin(uTiempo * (2. + 5. * j.x) + j.y * 40.);
        float s = smoothstep(.2 - .08 * (1. - b), 0., r) * (.5 + 2.6 * b * b) * tw;
        vec3 col = mix(vec3(.75, .85, 1.), vec3(1., .86, .7), j.z);
        acc += col * s * (k == 0 ? 1.6 : .9);
      }
    }
    // vía láctea tenue
    vec3 n = normalize(vec3(.35, .75, .55));
    float band = exp(-pow(dot(d, n) / .22, 2.));
    float ruido = vnoise(d * 5.) * .6 + vnoise(d * 11.) * .4;
    acc += vec3(.42, .5, .8) * band * smoothstep(.35, .85, ruido) * .22;
    return acc;
  }

  vec3 lunaDisco(vec3 d) {
    vec3 L = uLunaDir;
    float c = dot(d, L);
    vec3 col = vec3(0.);
    // halo
    col += uLunaColor * (pow(max(c, 0.), 90.) * .45 + pow(max(c, 0.), 14.) * .09 + pow(max(c, 0.), 3.) * .02) * uLunaI;
    const float cosR = .99918; // radio angular ~2.3º
    if (c > cosR) {
      vec3 up = abs(L.y) < .95 ? vec3(0, 1, 0) : vec3(1, 0, 0);
      vec3 rt = normalize(cross(up, L)), up2 = cross(L, rt);
      vec2 q = vec2(dot(d, rt), dot(d, up2)) / sqrt(1. - cosR * cosR);
      float r2 = dot(q, q);
      if (r2 < 1.) {
        vec3 n = vec3(q, sqrt(1. - r2));
        float fase = smoothstep(-.25, .55, dot(n, normalize(vec3(-.55, .35, .6))));
        float maria = vnoise(n * 3.4 + 3.) * .6 + vnoise(n * 8.) * .3;
        vec3 sup = mix(vec3(.55, .6, .72), vec3(1., 1., .98), smoothstep(.25, .75, maria));
        float borde = smoothstep(1., .93, r2);
        col += sup * uLunaColor * fase * borde * 2.6 + uLunaColor * .015 * borde;
      }
    }
    return col;
  }

  vec3 cielo(vec3 d) {
    float y = d.y;
    float t = pow(clamp(y, 0., 1.), .5);
    vec3 col = mix(uHorizonte, uCenit, t);
    // brillo del horizonte hacia el sol y hacia la luna
    float cs = max(dot(d, uSolDir), 0.), cl = max(dot(d, uLunaDir), 0.);
    float hz = pow(1. - clamp(abs(y), 0., 1.), 3.);
    float visSol = smoothstep(-.12, .12, uSolDir.y);
    col += uSolColor * (pow(cs, 5.) * .55 + pow(cs, 24.) * .55 + pow(cs, 220.) * 2.) * hz * visSol * 1.1;
    col += uSolColor * pow(cs, 3.) * .12 * visSol;
    col += uLunaColor * pow(cl, 8.) * .05 * hz;
    // por debajo del horizonte: bruma que se oscurece
    col = mix(col, uSuelo, smoothstep(0., -.28, y));

    if (uEntorno < .5) {
      // estrellas (solo de noche y por encima del horizonte)
      float vis = uNoche * uEstrellas * smoothstep(.0, .22, y);
      if (vis > .001) col += estrellas(d) * vis;
      // sol
      float sd = smoothstep(.99955, .99985, dot(d, uSolDir)) * step(0., y + .01) * visSol;
      col += uSolColor * sd * 40.;
      // luna
      col += lunaDisco(d) * smoothstep(-.02, .06, y) * mix(.15, 1., uNoche);
      // nubes
      if (y > .015 && uNubes > .01) {
        vec2 uv = d.xz / (y * .75 + .22) * .9 + vec2(uTiempo * uNubesVel, uTiempo * uNubesVel * .6);
        float dn = fbm2(uv * 1.1);
        float cob = mix(.78, .36, uNubes);
        float dens = smoothstep(cob, cob + .22, dn);
        float dn2 = fbm2((uv + uSolDir.xz * .12 / max(uSolDir.y, .25)) * 1.1);
        float luz = clamp(.55 + (dn - dn2) * 3.2, 0., 1.);
        vec3 nc = mix(uNubeOscuro, uNubeClaro, luz);
        float borde = smoothstep(.015, .22, y);
        col = mix(col, nc, dens * borde * .92);
        col += uSolColor * dens * pow(cs, 14.) * .35 * visSol;
      }
    }
    col += uFlash * vec3(.75, .8, 1.) * (.4 + .6 * smoothstep(.0, .5, y));
    return col;
  }
`;

const VS_PANTALLA = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
    gl_Position = p.xyww; // al fondo del búfer de profundidad: solo se sombrea donde no hay geometría
  }`;
const VS_ENTORNO = /* glsl */`
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FS = /* glsl */`
  ${COMUN}
  void main() { gl_FragColor = vec4(cielo(normalize(vDir)), 1.); }`;

/** Crea el cielo: devuelve { malla, mallaEntorno, uniforms, actualizar(atm, sol, luna, noche, tiempo), liberar() } */
export function crearCielo() {
  const U = {
    uCenit: { value: new THREE.Color() }, uHorizonte: { value: new THREE.Color() }, uSuelo: { value: new THREE.Color() },
    uSolDir: { value: new THREE.Vector3(0, 1, 0) }, uSolColor: { value: new THREE.Color() },
    uLunaDir: { value: new THREE.Vector3(0, -1, 0) }, uLunaColor: { value: new THREE.Color() },
    uNubeClaro: { value: new THREE.Color() }, uNubeOscuro: { value: new THREE.Color() }, uNiebla: { value: new THREE.Color() },
    uSolI: { value: 1 }, uLunaI: { value: 1 }, uNoche: { value: 0 }, uEstrellas: { value: 1 },
    uTiempo: { value: 0 }, uNubes: { value: 0.4 }, uNubesVel: { value: 0.005 }, uFlash: { value: 0 }, uEntorno: { value: 0 },
  };
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const matPantalla = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VS_PANTALLA, fragmentShader: FS,
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
  });
  const UE = { ...U, uEntorno: { value: 1 } };
  const matEntorno = new THREE.ShaderMaterial({
    uniforms: UE, vertexShader: VS_ENTORNO, fragmentShader: FS,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
  });
  const malla = new THREE.Mesh(geo, matPantalla);
  malla.frustumCulled = false; malla.renderOrder = 1000; malla.name = 'cielo';
  malla.matrixAutoUpdate = false; malla.updateMatrix();
  const mallaEntorno = new THREE.Mesh(geo, matEntorno);
  mallaEntorno.frustumCulled = false;
  const _t = new THREE.Color();
  return {
    malla, mallaEntorno, uniforms: U,
    actualizar(a, solDir, lunaDir, noche, tiempo, flash) {
      U.uCenit.value.copy(a.cenit); U.uHorizonte.value.copy(a.horizonte);
      U.uSuelo.value.copy(a.niebla).multiplyScalar(0.55).lerp(_t.copy(a.horizonte), 0.2);
      U.uNiebla.value.copy(a.niebla);
      U.uSolDir.value.copy(solDir); U.uLunaDir.value.copy(lunaDir);
      U.uSolColor.value.copy(a.sol); U.uLunaColor.value.copy(a.luna);
      U.uSolI.value = a.solI; U.uLunaI.value = a.lunaI;
      U.uNoche.value = noche; U.uEstrellas.value = a.estrellas;
      U.uTiempo.value = tiempo; U.uNubes.value = a.nubes; U.uNubesVel.value = a.nubesVel; U.uFlash.value = flash || 0;
      // las nubes reciben la luz dominante: de día, color del sol; de noche, tenues y azuladas
      const dia = 1 - noche;
      U.uNubeClaro.value.copy(a.nubeClaro).multiply(_t.copy(a.sol).lerp(a.luna, noche)).multiplyScalar(0.35 + 0.95 * dia * (0.6 + 0.12 * a.solI));
      { const k = 0.25 * noche, c = U.uNubeClaro.value; c.r += a.luna.r * k; c.g += a.luna.g * k; c.b += a.luna.b * k; }
      U.uNubeOscuro.value.copy(a.nubeOscuro).multiply(a.horizonte).multiplyScalar(0.9 + 0.5 * dia).lerp(a.cenit, 0.2);
    },
    liberar() { geo.dispose(); matPantalla.dispose(); matEntorno.dispose(); },
  };
}

/** Gestiona el mapa de entorno PMREM: se regenera solo cuando el cielo cambia lo bastante. */
export function crearEntorno(renderer, escena, cielo) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entornoEscena = new THREE.Scene();
  entornoEscena.add(cielo.mallaEntorno);
  let rt = null;
  const firma = new Float32Array(16), ultima = new Float32Array(16);
  let t = 0, haUltima = false, tEstable = 0, pendiente = false;
  const U = cielo.uniforms;

  function leerFirma() {
    const c = U.uCenit.value, h = U.uHorizonte.value, s = U.uSolColor.value, l = U.uLunaColor.value, sd = U.uSolDir.value, ld = U.uLunaDir.value;
    firma[0] = c.r; firma[1] = c.g; firma[2] = c.b; firma[3] = h.r; firma[4] = h.g; firma[5] = h.b;
    const ws = Math.max(0, sd.y) * 0.6 + 0.1, wl = Math.max(0, ld.y) * 0.3;
    firma[6] = sd.x * ws; firma[7] = sd.y * ws; firma[8] = sd.z * ws;
    firma[9] = ld.x * wl; firma[10] = ld.y * wl; firma[11] = ld.z * wl;
    firma[12] = s.r * ws; firma[13] = s.g * ws; firma[14] = l.b * wl; firma[15] = U.uSuelo.value.g;
  }
  function generar() {
    const prevEntorno = escena.environment;
    const nuevo = pmrem.fromScene(entornoEscena, 0.015, 0.1, 10);
    escena.environment = nuevo.texture;
    if (rt) rt.dispose();
    rt = nuevo;
    ultima.set(firma); haUltima = true; tEstable = 0; pendiente = false;
    return prevEntorno;
  }
  return {
    /** Llamar cada cuadro tras actualizar el cielo. `forzar` regenera ya. */
    actualizar(dt, forzar = false) {
      t += dt;
      leerFirma();
      if (!haUltima || forzar) { generar(); return; }
      let d = 0;
      for (let i = 0; i < 16; i++) d += Math.abs(firma[i] - ultima[i]);
      if (d > 0.14 && t > 0.5) { t = 0; generar(); return; }
      if (d > 0.012) { tEstable += dt; if (tEstable > 1.5 && t > 1.5) { t = 0; generar(); } } else tEstable = 0;
    },
    liberar() { if (rt) rt.dispose(); pmrem.dispose(); escena.environment = null; },
  };
}
