// Cadena de postproceso HDR propia (sin EffectComposer, para controlar coste y resolución de cada paso):
//   escena (HalfFloat + MSAA + profundidad) → AO a media resolución (+ desenfoque bilateral) → bloom por mips (13 taps)
//   → composición (AO, bloom, exposición, ACES, gradación, viñeta) a LDR → final (FXAA opcional, aberración, grano,
//   transición temporal) a pantalla.
import * as THREE from 'three';

const VS = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0., 1.); }`;

const LINEAL = /* glsl */`
  uniform float uNear, uFar;
  float linDepth(float d) { float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }`;

// ─────────────────────────────────────────────── AO (Alchemy-like, a partir de la profundidad)
const FS_AO = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D tDepth;
  uniform float uP00, uP11, uRadio, uAsp, uTiempo;
  uniform vec2 uTexel;
  ${LINEAL}
  vec3 vp(vec2 uv) {
    float z = linDepth(texture2D(tDepth, clamp(uv, vec2(.0005), vec2(.9995))).x);
    vec2 n = uv * 2. - 1.;
    return vec3(n.x * z / uP00, n.y * z / uP11, -z);
  }
  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
  void main() {
    float d = texture2D(tDepth, vUv).x;
    if (d >= .99999) { gl_FragColor = vec4(1.); return; }
    vec3 P = vp(vUv);
    vec2 e = uTexel;
    vec3 Pr = vp(vUv + vec2(e.x, 0.)), Pl = vp(vUv - vec2(e.x, 0.)), Pu = vp(vUv + vec2(0., e.y)), Pd = vp(vUv - vec2(0., e.y));
    vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
    vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
    vec3 n = normalize(cross(dx, dy));
    float z = -P.z;
    float ruv = clamp(uRadio * uP11 * .5 / z, .003, .14);
    vec2 sc = vec2(ruv / uAsp, ruv);
    float a0 = ign(gl_FragCoord.xy) * 6.2831853;
    float j = ign(gl_FragCoord.xy + 17.3);
    float occ = 0.;
    for (int i = 0; i < AO_N; i++) {
      float fi = (float(i) + .5 + j * .5) / float(AO_N);
      float a = a0 + fi * 6.2831853 * 2.7;
      vec2 o = vec2(cos(a), sin(a)) * sqrt(fi) * sc;
      vec3 S = vp(vUv + o);
      vec3 v = S - P;
      float l = length(v);
      float c = dot(n, v) / max(l, 1e-4);
      float att = 1. - smoothstep(uRadio * .55, uRadio * 1.25, l);
      occ += max(c - .12, 0.) * att;
    }
    float ao = clamp(1. - occ / float(AO_N) * 2.1, 0., 1.);
    gl_FragColor = vec4(vec3(ao * ao * (3. - 2. * ao) * .35 + ao * .65), 1.);
  }`;

const FS_AO_BLUR = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D tAO, tDepth;
  uniform vec2 uDir;
  ${LINEAL}
  void main() {
    float zc = linDepth(texture2D(tDepth, vUv).x);
    float s = 0., w = 0.;
    for (int i = -4; i <= 4; i++) {
      vec2 uv = vUv + uDir * float(i) * 1.25;
      float zs = linDepth(texture2D(tDepth, uv).x);
      float g = exp(-float(i * i) * .09) * exp(-abs(zc - zs) * 2.2 / (1. + zc * .02));
      s += texture2D(tAO, uv).r * g; w += g;
    }
    gl_FragColor = vec4(vec3(s / max(w, 1e-4)), 1.);
  }`;

// ─────────────────────────────────────────────── Bloom
const FS_BLOOM_PRE = /* glsl */`
  varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uUmbral;
  vec3 t(vec2 o) { return min(texture2D(tSrc, vUv + o * uTexel).rgb, vec3(24.)); }
  void main() {
    vec3 c = (t(vec2(-1., -1.)) + t(vec2(1., -1.)) + t(vec2(-1., 1.)) + t(vec2(1., 1.))) * .25;
    float br = max(max(c.r, c.g), c.b);
    float knee = uUmbral * .6 + .001;
    float soft = clamp(br - uUmbral + knee, 0., 2. * knee);
    soft = soft * soft / (4. * knee + 1e-4);
    float w = max(soft, br - uUmbral) / max(br, 1e-4);
    gl_FragColor = vec4(c * w, 1.);
  }`;
const FS_BLOOM_DOWN = /* glsl */`
  varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel;
  vec3 t(float x, float y) { return texture2D(tSrc, vUv + vec2(x, y) * uTexel).rgb; }
  void main() {
    vec3 a = t(-2., 2.), b = t(0., 2.), c = t(2., 2.), d = t(-2., 0.), e = t(0., 0.), f = t(2., 0.), g = t(-2., -2.), h = t(0., -2.), i = t(2., -2.);
    vec3 j = t(-1., 1.), k = t(1., 1.), l = t(-1., -1.), m = t(1., -1.);
    vec3 r = e * .125 + (a + c + g + i) * .03125 + (b + d + f + h) * .0625 + (j + k + l + m) * .125;
    gl_FragColor = vec4(r, 1.);
  }`;
const FS_BLOOM_UP = /* glsl */`
  varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uPeso;
  void main() {
    vec4 d = uTexel.xyxy * vec4(1., 1., -1., 0.) * 1.1;
    vec3 s = texture2D(tSrc, vUv - d.xy).rgb + texture2D(tSrc, vUv - d.wy).rgb * 2. + texture2D(tSrc, vUv - d.zy).rgb
           + texture2D(tSrc, vUv + d.zw).rgb * 2. + texture2D(tSrc, vUv).rgb * 4. + texture2D(tSrc, vUv + d.xw).rgb * 2.
           + texture2D(tSrc, vUv + d.zy).rgb + texture2D(tSrc, vUv + d.wy).rgb * 2. + texture2D(tSrc, vUv + d.xy).rgb;
    gl_FragColor = vec4(s * (1. / 16.), uPeso);
  }`;

// ─────────────────────────────────────────────── Composición HDR → LDR
const FS_COMP = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D tEscena, tAO, tBloom;
  uniform float uAO, uBloom, uExp, uSat, uContraste, uVineta, uAsp;
  uniform vec3 uSombras, uLuces;
  vec3 aces(vec3 color) {
    const mat3 I = mat3(vec3(.59719, .07600, .02840), vec3(.35458, .90834, .13383), vec3(.04823, .01566, .83777));
    const mat3 O = mat3(vec3(1.60475, -.10208, -.00327), vec3(-.53108, 1.10813, -.07276), vec3(-.07367, -.00605, 1.07602));
    color *= uExp / .6;
    color = I * color;
    vec3 a = color * (color + .0245786) - .000090537, b = color * (.983729 * color + .4329510) + .238081;
    color = O * (a / b);
    return clamp(color, 0., 1.);
  }
  vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
  void main() {
    vec3 col = texture2D(tEscena, vUv).rgb;
    #ifdef USA_AO
      float ao = texture2D(tAO, vUv).r;
      float lum = dot(col, vec3(.2126, .7152, .0722));
      col *= mix(1., ao, uAO * (1. - smoothstep(1.2, 4., lum)));
    #endif
    #ifdef USA_BLOOM
      col += texture2D(tBloom, vUv).rgb * uBloom;
    #endif
    vec3 s = srgb(aces(col));
    float l = dot(s, vec3(.2126, .7152, .0722));
    s *= mix(uSombras, uLuces, smoothstep(.04, .9, l));
    s = mix(vec3(l), s, uSat);
    s = clamp((s - .46) * uContraste + .46, 0., 1.);
    vec2 q = (vUv - .5) * vec2(uAsp * .62, 1.);
    float r = length(q) * 1.5;
    float v = smoothstep(.32, 1.15, r);
    s *= 1. - uVineta * v * v * (1.4 - .4 * v);
    s = mix(s, s * vec3(.9, .94, 1.04), v * .35);
    gl_FragColor = vec4(s, 1.);
  }`;

// ─────────────────────────────────────────────── Final: FXAA, aberración, grano, transición
const FS_FINAL = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D tLDR;
  uniform vec2 uTexel;
  uniform float uAb, uGrano, uTiempo, uTrans, uAsp, uFlash;
  uniform vec3 uTransColor, uFlashColor;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float hash1(float n) { return fract(sin(n) * 43758.5453); }
  vec3 fxaa(vec2 uv) {
    vec2 px = uTexel;
    vec3 nw = texture2D(tLDR, uv + vec2(-1., -1.) * px).rgb, ne = texture2D(tLDR, uv + vec2(1., -1.) * px).rgb;
    vec3 sw = texture2D(tLDR, uv + vec2(-1., 1.) * px).rgb, se = texture2D(tLDR, uv + vec2(1., 1.) * px).rgb;
    vec3 m = texture2D(tLDR, uv).rgb;
    vec3 L = vec3(.299, .587, .114);
    float lnw = dot(nw, L), lne = dot(ne, L), lsw = dot(sw, L), lse = dot(se, L), lm = dot(m, L);
    float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
    vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
    float red = max((lnw + lne + lsw + lse) * .03125, .0078125);
    float rcp = 1. / (min(abs(dir.x), abs(dir.y)) + red);
    dir = clamp(dir * rcp, vec2(-8.), vec2(8.)) * px;
    vec3 a = .5 * (texture2D(tLDR, uv + dir * (1. / 3. - .5)).rgb + texture2D(tLDR, uv + dir * (2. / 3. - .5)).rgb);
    vec3 b = a * .5 + .25 * (texture2D(tLDR, uv + dir * -.5).rgb + texture2D(tLDR, uv + dir * .5).rgb);
    float lb = dot(b, L);
    return (lb < lmin || lb > lmax) ? a : b;
  }
  vec3 muestra(vec2 uv) {
    #ifdef USA_FXAA
      return fxaa(uv);
    #else
      return texture2D(tLDR, uv).rgb;
    #endif
  }
  void main() {
    vec2 uv = vUv;
    vec2 c = uv - .5;
    vec3 col;
    float ab = uAb;
    if (uTrans > .001) {
      // salto temporal: remolino + desenfoque radial + túnel de luz
      float s = uTrans;
      float cover = smoothstep(.5, .95, s);
      float r = length(c * vec2(uAsp, 1.));
      vec3 acc = vec3(0.);
      const int N = 12;
      for (int i = 0; i < N; i++) {
        float k = float(i) / float(N - 1);
        float zoom = 1. - s * s * .55 * k;
        float sw = s * s * 2.6 * k * (1.2 - r);
        float cs = cos(sw), sn = sin(sw);
        vec2 p = c * zoom; vec2 pa = vec2(p.x * uAsp, p.y); pa = vec2(pa.x * cs - pa.y * sn, pa.x * sn + pa.y * cs); p = vec2(pa.x / uAsp, pa.y);
        vec2 u2 = .5 + p;
        acc.r += texture2D(tLDR, u2 + c * ab * 3.).r; acc.g += texture2D(tLDR, u2).g; acc.b += texture2D(tLDR, u2 - c * ab * 3.).b;
      }
      col = acc / float(N);
      float ang = atan(c.y, c.x * uAsp);
      float rayos = hash1(floor(ang * 22.) + floor(uTiempo * 14.) * 1.7) * .6 + hash1(floor(ang * 61.) - floor(uTiempo * 23.) * 3.1) * .4;
      float tunel = pow(rayos, 2.2) * (.35 + 1.6 * smoothstep(.0, .9, r));
      vec3 luz = uTransColor * (.25 + tunel * 2.4) + vec3(1., .96, .9) * exp(-r * 5.) * (1.2 + 2. * sin(uTiempo * 9.) * .15);
      col = mix(col, luz, cover);
      col = mix(col, vec3(1.), smoothstep(.93, 1., s) * .0);
      col *= 1. + s * .25;
      ab = 0.;
    } else {
      #ifdef USA_FXAA
        col = fxaa(uv);
      #else
        col = texture2D(tLDR, uv).rgb;
      #endif
    }
    if (ab > 0.) {
      vec2 off = c * ab * (.4 + 3. * dot(c, c));
      col.r = muestra(uv + off).r; col.b = muestra(uv - off).b;
    }
    if (uFlash > .001) col = mix(col, uFlashColor, uFlash * (.25 + .75 * smoothstep(.2, 1., length(c) * 1.6)));
    float l = dot(col, vec3(.2126, .7152, .0722));
    float g = hash(uv * 1013. + fract(uTiempo * 7.13) * 91.7) - .5;
    col += g * uGrano * (1. - .55 * l) * (1. - .6 * uTrans);
    col += (hash(uv * 733. + 3.7) - .5) / 255.; // dither anti-bandas
    gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
  }`;

export function crearPostproceso(renderer) {
  const triGeo = new THREE.BufferGeometry();
  triGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const tri = new THREE.Mesh(triGeo, null); tri.frustumCulled = false;
  const escenaQ = new THREE.Scene(); escenaQ.add(tri);
  const camQ = new THREE.Camera();

  const mat = (fs, uniforms, defines, extra = {}) => new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: fs, uniforms, defines, depthTest: false, depthWrite: false, toneMapped: false, ...extra,
  });
  const tex = (v = null) => ({ value: v });
  const cam = { uNear: { value: 0.4 }, uFar: { value: 450 } };

  const mAO = mat(FS_AO, { tDepth: tex(), uP00: { value: 1 }, uP11: { value: 1 }, uRadio: { value: 1 }, uAsp: { value: 1 }, uTiempo: { value: 0 }, uTexel: { value: new THREE.Vector2() }, ...cam }, { AO_N: 12 });
  const mBlur = mat(FS_AO_BLUR, { tAO: tex(), tDepth: tex(), uDir: { value: new THREE.Vector2() }, ...cam });
  const mPre = mat(FS_BLOOM_PRE, { tSrc: tex(), uTexel: { value: new THREE.Vector2() }, uUmbral: { value: 1 } });
  const mDown = mat(FS_BLOOM_DOWN, { tSrc: tex(), uTexel: { value: new THREE.Vector2() } });
  const mUp = mat(FS_BLOOM_UP, { tSrc: tex(), uTexel: { value: new THREE.Vector2() }, uPeso: { value: 1 } }, {}, { blending: THREE.AdditiveBlending, transparent: false });
  const mComp = mat(FS_COMP, {
    tEscena: tex(), tAO: tex(), tBloom: tex(), uAO: { value: 0.8 }, uBloom: { value: 0.5 }, uExp: { value: 1 }, uSat: { value: 1 }, uContraste: { value: 1 },
    uVineta: { value: 0.4 }, uAsp: { value: 1.78 }, uSombras: { value: new THREE.Color(1, 1, 1) }, uLuces: { value: new THREE.Color(1, 1, 1) },
  }, {});
  const mFinal = mat(FS_FINAL, {
    tLDR: tex(), uTexel: { value: new THREE.Vector2() }, uAb: { value: 0.0015 }, uGrano: { value: 0.03 }, uTiempo: { value: 0 }, uTrans: { value: 0 },
    uAsp: { value: 1.78 }, uTransColor: { value: new THREE.Color(0.4, 0.8, 1) }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 1, 1) },
  }, {});

  let cfg = { samples: 4, ao: true, aoMuestras: 12, bloomNiveles: 5, fxaa: false };
  let W = 2, H = 2;
  let rtEscena = null, rtLDR = null, rtAO = [], mips = [];
  const size = new THREE.Vector2();

  function liberarRT() {
    for (const r of [rtEscena, rtLDR, ...rtAO, ...mips]) r?.dispose();
    rtEscena = rtLDR = null; rtAO = []; mips = [];
  }
  function construir() {
    liberarRT();
    const opt = (o = {}) => ({ depthBuffer: false, stencilBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false, ...o });
    const dt = new THREE.DepthTexture(W, H); dt.type = THREE.UnsignedIntType; dt.format = THREE.DepthFormat; dt.minFilter = dt.magFilter = THREE.NearestFilter;
    rtEscena = new THREE.WebGLRenderTarget(W, H, opt({ type: THREE.HalfFloatType, depthBuffer: true, depthTexture: dt, samples: cfg.samples }));
    rtLDR = new THREE.WebGLRenderTarget(W, H, opt({ type: THREE.UnsignedByteType }));
    const hw = Math.max(2, W >> 1), hh = Math.max(2, H >> 1);
    if (cfg.ao) for (let i = 0; i < 2; i++) rtAO.push(new THREE.WebGLRenderTarget(hw, hh, opt({ type: THREE.UnsignedByteType })));
    for (let i = 0; i < cfg.bloomNiveles; i++) mips.push(new THREE.WebGLRenderTarget(Math.max(2, W >> (i + 1)), Math.max(2, H >> (i + 1)), opt({ type: THREE.HalfFloatType })));
    mAO.defines.AO_N = cfg.aoMuestras; mAO.needsUpdate = true;
    mComp.defines = { ...(cfg.ao ? { USA_AO: 1 } : {}), ...(cfg.bloomNiveles > 0 ? { USA_BLOOM: 1 } : {}) }; mComp.needsUpdate = true;
    mFinal.defines = cfg.fxaa ? { USA_FXAA: 1 } : {}; mFinal.needsUpdate = true;
    mFinal.uniforms.uTexel.value.set(1 / W, 1 / H);
  }
  function pasada(m, destino) {
    tri.material = m;
    renderer.setRenderTarget(destino);
    renderer.render(escenaQ, camQ);
  }

  const api = {
    get config() { return cfg; },
    configurar(nuevo) {
      const cambia = ['samples', 'ao', 'aoMuestras', 'bloomNiveles', 'fxaa'].some((k) => nuevo[k] !== undefined && nuevo[k] !== cfg[k]);
      cfg = { ...cfg, ...nuevo };
      if (cambia && rtEscena) construir();
    },
    /** Tamaño del búfer de dibujo (píxeles reales). */
    redimensionar(w, h) {
      W = Math.max(2, Math.floor(w)); H = Math.max(2, Math.floor(h));
      construir();
    },
    uniformes: { final: mFinal.uniforms, comp: mComp.uniforms },
    /** P = { exp, bloom, umbral, ao, aoRadio, sat, contraste, vineta, grano, aberracion, sombras, luces, tiempo, trans, transColor, flash, flashColor } */
    render(escena, camara, P) {
      if (!rtEscena) return;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      const asp = W / H;
      // 1) escena HDR
      renderer.setRenderTarget(rtEscena);
      renderer.clear(true, true, true);
      renderer.render(escena, camara);
      // 2) AO a media resolución
      const usaAO = cfg.ao && rtAO.length === 2 && P.ao > 0.01;
      if (usaAO) {
        const dep = rtEscena.depthTexture;
        for (const m of [mAO, mBlur]) { m.uniforms.uNear.value = camara.near; m.uniforms.uFar.value = camara.far; m.uniforms.tDepth.value = dep; }
        mAO.uniforms.uP00.value = camara.projectionMatrix.elements[0]; mAO.uniforms.uP11.value = camara.projectionMatrix.elements[5];
        mAO.uniforms.uRadio.value = P.aoRadio; mAO.uniforms.uAsp.value = asp; mAO.uniforms.uTexel.value.set(1 / W, 1 / H);
        pasada(mAO, rtAO[0]);
        mBlur.uniforms.tAO.value = rtAO[0].texture; mBlur.uniforms.uDir.value.set(1 / rtAO[0].width, 0); pasada(mBlur, rtAO[1]);
        mBlur.uniforms.tAO.value = rtAO[1].texture; mBlur.uniforms.uDir.value.set(0, 1 / rtAO[0].height); pasada(mBlur, rtAO[0]);
        mComp.uniforms.tAO.value = rtAO[0].texture;
      }
      // 3) bloom
      const n = mips.length;
      if (n > 0) {
        mPre.uniforms.tSrc.value = rtEscena.texture; mPre.uniforms.uTexel.value.set(1 / W, 1 / H); mPre.uniforms.uUmbral.value = P.umbral;
        pasada(mPre, mips[0]);
        for (let i = 1; i < n; i++) {
          mDown.uniforms.tSrc.value = mips[i - 1].texture; mDown.uniforms.uTexel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
          pasada(mDown, mips[i]);
        }
        for (let i = n - 2; i >= 0; i--) {
          mUp.uniforms.tSrc.value = mips[i + 1].texture; mUp.uniforms.uTexel.value.set(1 / mips[i + 1].width, 1 / mips[i + 1].height);
          mUp.uniforms.uPeso.value = 0.62 + 0.06 * i;
          pasada(mUp, mips[i]);
        }
        mComp.uniforms.tBloom.value = mips[0].texture;
      }
      // 4) composición → LDR
      const u = mComp.uniforms;
      u.tEscena.value = rtEscena.texture;
      u.uAO.value = usaAO ? P.ao : 0; u.uBloom.value = P.bloom; u.uExp.value = P.exp; u.uSat.value = P.sat; u.uContraste.value = P.contraste;
      u.uVineta.value = P.vineta; u.uAsp.value = asp; u.uSombras.value.copy(P.sombras); u.uLuces.value.copy(P.luces);
      pasada(mComp, rtLDR);
      // 5) final → pantalla
      const f = mFinal.uniforms;
      f.tLDR.value = rtLDR.texture; f.uAb.value = P.aberracion; f.uGrano.value = P.grano; f.uTiempo.value = P.tiempo; f.uTrans.value = P.trans;
      f.uAsp.value = asp; f.uTransColor.value.copy(P.transColor); f.uFlash.value = P.flash; f.uFlashColor.value.copy(P.flashColor);
      pasada(mFinal, null);
      renderer.autoClear = autoClear;
    },
    liberar() {
      liberarRT();
      for (const m of [mAO, mBlur, mPre, mDown, mUp, mComp, mFinal]) m.dispose();
      triGeo.dispose();
    },
  };
  return api;
}
