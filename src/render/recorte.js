// Recorte de oclusores («cutaway»): todo lo que queda por ENCIMA de la altura de la cabeza y ENTRE la cámara y un
// jugador (tejados, plantas altas, marquesinas, copas de árbol, arcos de neón) se abre con un agujero circular de borde
// tramado, para que el héroe nunca quede tapado. Es genérico: se aplica por material (onBeforeCompile encadenado) a
// todas las mallas del escenario sin tocar los mapas. Las sombras no cambian (el material de profundidad es otro),
// así que bajo un tejado recortado el suelo sigue en sombra y se lee que hay techo.
//
// Todo se calcula en espacio de vista: un cilindro de radio uRecR alrededor del rayo cámara → pecho del jugador,
// solo para fragmentos más cerca de la cámara que el jugador y por encima de uRecAlt (m sobre el suelo).
import * as THREE from 'three';

const MAX = 2;
export const RECORTE = {
  uRecObj: { value: [new THREE.Vector3(), new THREE.Vector3()] },
  uRecN: { value: 0 },
  uRecArriba: { value: new THREE.Vector3(0, 1, 0) },
  uRecCamY: { value: 0 },
  uRecR: { value: 3.9 },
  uRecAlt: { value: 2.25 },
  uRecFuerza: { value: 1 },
};

const PARS_V = /* glsl */`
varying vec3 vRecV;`;
const PARS_F = /* glsl */`
varying vec3 vRecV;
uniform vec3 uRecObj[${MAX}];
uniform int uRecN;
uniform vec3 uRecArriba;
uniform float uRecCamY, uRecR, uRecAlt, uRecFuerza;
float recIgn(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }`;
const FRAG = /* glsl */`
{
  vec3 rp = vRecV;
  float rAlt = smoothstep(uRecAlt, uRecAlt + 0.8, uRecCamY + dot(rp, uRecArriba));
  float rk = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uRecN) break;
    vec3 d = uRecObj[i];
    float t = dot(rp, d) / max(dot(d, d), 1e-4);
    float r = length(rp - d * t);
    // un poco más ancho cerca de la cámara (cono suave) para que el hueco no se vea como un tubo
    float R = uRecR * (1.0 + 0.25 * (1.0 - clamp(t, 0.0, 1.0)));
    rk = max(rk, (1.0 - smoothstep(R * 0.72, R, r)) * (1.0 - smoothstep(0.88, 0.98, t)) * step(0.0, t));
  }
  rk *= rAlt * uRecFuerza;
  if (rk > 0.002 && rk >= recIgn(gl_FragCoord.xy) * 0.94 + 0.03) discard;
}`;

const parcheados = new WeakSet();

/** Hace recortable un material incorporado (Standard/Physical/Lambert/Phong/Basic/Toon). Idempotente. */
export function hacerRecortable(m) {
  if (!m || parcheados.has(m) || m.isShaderMaterial || m.isRawShaderMaterial || m.isPointsMaterial || m.isLineBasicMaterial || m.isSpriteMaterial) return;
  if (m.userData?.sinRecorte) return;
  parcheados.add(m);
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) {
    prev?.call(this, sh, r);
    if (!sh.vertexShader.includes('#include <project_vertex>') || !sh.fragmentShader.includes('#include <clipping_planes_fragment>')) return;
    Object.assign(sh.uniforms, RECORTE);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>' + PARS_V)
      .replace('#include <project_vertex>', '#include <project_vertex>\n vRecV = mvPosition.xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + PARS_F)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + FRAG);
  };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|recorte'; };
  m.needsUpdate = true;
}

/** Recorre un objeto (grupo del escenario) y hace recortables los materiales de sus mallas. */
export function prepararRecorte(obj) {
  obj?.traverse?.((h) => {
    if (!h.isMesh || h.isSkinnedMesh || h.userData?.sinRecorte) return;
    if (Array.isArray(h.material)) h.material.forEach(hacerRecortable); else hacerRecortable(h.material);
  });
}

const _v = new THREE.Vector3();
/** Actualiza las uniformes con la cámara y los objetivos ({ pos }), una vez por cuadro tras mover la cámara. */
export function actualizarRecorte(camara, objetivos, alturaPecho = 1.1) {
  const U = RECORTE, V = camara.matrixWorldInverse;
  let n = 0;
  for (const o of objetivos || []) {
    if (n >= MAX) break;
    const p = o?.pos; if (!p || !isFinite(p.x) || o.vivo === false) continue;
    U.uRecObj.value[n++].set(p.x, (p.y || 0) + alturaPecho, p.z).applyMatrix4(V);
  }
  U.uRecN.value = n;
  U.uRecArriba.value.set(0, 1, 0).transformDirection(V);
  // transformDirection normaliza; el vector «arriba» en vista sirve para y_mundo = camY + dot(p_vista, arriba)
  U.uRecCamY.value = camara.getWorldPosition(_v).y;
}
