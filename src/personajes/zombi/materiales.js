// Tres materiales compartidos para toda la horda: mate (piel y tela), metal y emisivo. Color por instancia.
// Atributo por instancia aFx = (brasa, carbonizado, destello, disolución) para fuego, quemaduras, golpes y desintegración.
import * as THREE from 'three';

const GLSL_RUIDO = /* glsl */`
  float zh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float zr(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(zh(i), zh(i + vec3(1,0,0)), f.x), mix(zh(i + vec3(0,1,0)), zh(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(zh(i + vec3(0,0,1)), zh(i + vec3(1,0,1)), f.x), mix(zh(i + vec3(0,1,1)), zh(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

function parchear(mat, { granulado = 1, rim = 0.3, suciedad = 0.5 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n attribute vec4 aFx; varying vec4 vFx; varying vec3 vLoc; varying float vAlt;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n vFx = aFx; vLoc = position;\n vAlt = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n varying vec4 vFx; varying vec3 vLoc; varying float vAlt;\n${GLSL_RUIDO}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float zn = zr(vLoc * 6.0 + vColor.rgb * 13.0);
        float zn2 = zr(vLoc * 17.0 + 3.7);
        diffuseColor.rgb *= 1.0 - ${granulado.toFixed(2)} * 0.3 + ${granulado.toFixed(2)} * (0.44 * zn + 0.14 * zn2);
        diffuseColor.rgb *= 0.7 + 0.3 * smoothstep(-0.55, 0.45, vLoc.y);
        float suc = smoothstep(0.75, 0.0, vAlt);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.42, 0.36, 0.3), suc * ${suciedad.toFixed(2)});
        diffuseColor.rgb *= 1.0 - vFx.y * 0.93;
        if (vFx.w > 0.001) { float dn = zr(vLoc * 9.0 + vec3(1.3, 4.1, 2.2)) * 0.6 + zn2 * 0.4; if (dn < vFx.w) discard; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float zrim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += diffuseColor.rgb * zrim * ${rim.toFixed(2)};
        totalEmissiveRadiance += vec3(1.0, 0.38, 0.06) * (vFx.x * (0.6 + 0.8 * zn) + vFx.y * 0.9 * smoothstep(0.72, 0.9, zn2) * (0.4 + vFx.x));
        totalEmissiveRadiance += vec3(1.0, 0.92, 0.82) * vFx.z;
        if (vFx.w > 0.001) { float dn2 = zr(vLoc * 9.0 + vec3(1.3, 4.1, 2.2)) * 0.6 + zn2 * 0.4; float ed = 1.0 - smoothstep(vFx.w, vFx.w + 0.1, dn2); totalEmissiveRadiance += vec3(1.0, 0.45, 0.1) * ed * 4.0; }`);
  };
  mat.customProgramCacheKey = () => 'zombi-' + granulado + rim + suciedad;
  return mat;
}

let mats = null;
export function materialesZombi() {
  if (mats) return mats;
  const mate = parchear(new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.86, metalness: 0.0 }), { granulado: 1, rim: 0.12, suciedad: 0.55 });
  const metal = parchear(new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.38, metalness: 0.85 }), { granulado: 0.55, rim: 0.06, suciedad: 0.4 });
  const emisivo = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  mats = { mate, metal, emisivo };
  return mats;
}
export function liberarMateriales() { if (mats) { for (const m of Object.values(mats)) m.dispose(); mats = null; } }

/** Material para jefes (mallas normales, no instanciadas): grano por objeto, suciedad cerca del suelo y borde de luz. */
export function materialJefe({ color = 0x888888, metal = 0, rough = 0.7, emis = null, ei = 0, rim = 0.12, grano = 0.8 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
  if (emis !== null) { m.emissive = new THREE.Color(emis); m.emissiveIntensity = ei; }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n varying vec3 vLoc; varying float vAlt;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n vLoc = position; vAlt = (modelMatrix * vec4(transformed, 1.0)).y;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n varying vec3 vLoc; varying float vAlt;\n${GLSL_RUIDO}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float zn = zr(vLoc * 5.0), zn2 = zr(vLoc * 19.0 + 3.7);
        diffuseColor.rgb *= 1.0 - ${grano.toFixed(2)} * 0.2 + ${grano.toFixed(2)} * (0.3 * zn + 0.1 * zn2);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.45, 0.38, 0.3), smoothstep(1.2, 0.0, vAlt) * 0.5);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0) * ${rim.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => 'jefe-' + grano + rim;
  return m;
}
