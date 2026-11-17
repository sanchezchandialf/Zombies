// ERA Z · Parche de shader común a todos los materiales del catálogo (onBeforeCompile sobre MeshStandard/Physical).
//
//  · Un único muestreo del mapa ORMH (R=oclusión, G=rugosidad, B=metalicidad, A=altura) en lugar de tres.
//  · Tinte por máscara en el alfa del albedo (el alfa NO es transparencia): color final = textura · mezcla(1, color, alfa).
//  · Macro-variación (ruido de baja frecuencia a dos escalas incomensurables): rompe la repetición del mosaico.
//  · Desgaste (suciedad en cavidades y manchas) y mojado (oscurece, baja rugosidad, charcos en las zonas bajas).
//  · Animaciones baratas: agua (normal doble en movimiento), pantalla/holograma (líneas y barrido), neón (parpadeo).
//  · Mezcla de dos materiales de suelo con máscara (mezclaSuelo).
import * as THREE from 'three';

/** Reloj compartido de los materiales animados. Se actualiza solo (material.onBeforeRender) o con materiales.tiempo(t). */
export const reloj = { value: 0, manual: false };

const PARS = /* glsl */`
uniform sampler2D tOrm;
uniform sampler2D tMacro;
uniform vec3 uMV;      // x: variación de valor, y: variación de tono, z: variación de rugosidad
uniform float uDes;    // desgaste 0..1
uniform float uMoj;    // mojado 0..1
uniform float uT;      // tiempo (s)
#ifdef EZ_MIX
uniform sampler2D tMapB;
uniform sampler2D tOrmB;
uniform sampler2D tNormB;
uniform sampler2D tMask;
uniform vec4 uMix;     // x: repetición de B, y: escala de la máscara, z: umbral, w: contraste
#endif
`;

const MAPA = /* glsl */`
vec4 ezT = texture2D( map, vMapUv );
vec4 ezO = texture2D( tOrm, vMapUv );
vec4 ezM = texture2D( tMacro, vMapUv * 0.113 );
vec4 ezM2 = texture2D( tMacro, vMapUv.yx * 0.0377 + vec2( 0.31, 0.57 ) );
#ifdef EZ_MIX
{
	vec2 uvB = vMapUv * uMix.x + vec2( 0.37, 0.61 );
	vec4 tB = texture2D( tMapB, uvB );
	vec4 oB = texture2D( tOrmB, uvB );
	#ifdef EZ_MASK
		float mk = texture2D( tMask, vMapUv * uMix.y ).r;
	#else
		float mk = ezM.a * 0.55 + ezM2.a * 0.45;
	#endif
	float hb = clamp( ( mk - uMix.z ) * uMix.w + 0.5 + ( oB.a - ezO.a ) * 0.7, 0.0, 1.0 );
	ezMixT = smoothstep( 0.35, 0.65, hb );
	ezT = mix( ezT, tB, ezMixT );
	ezO = mix( ezO, oB, ezMixT );
}
#endif
vec3 ezA = ezT.rgb * mix( vec3( 1.0 ), diffuse, ezT.a );
ezA *= 1.0 + ( ezM.r * 0.6 + ezM2.r * 0.4 - 0.5 ) * 2.0 * uMV.x;
float ezTono = ( ezM.g * 0.5 + ezM2.g * 0.5 - 0.5 ) * uMV.y;
ezA *= vec3( 1.0 + ezTono, 1.0, 1.0 - ezTono );
float ezCav = 1.0 - ezO.r;
float ezSuc = uDes * ( ezCav * 0.9 + smoothstep( 0.45, 0.85, ezM2.b ) * 0.55 );
ezA *= 1.0 - clamp( ezSuc, 0.0, 1.0 ) * 0.55;
float ezCharco = 0.0;
if ( uMoj > 0.0 ) {
	float nivel = ezM.b * 0.6 + ( 1.0 - ezO.a ) * 0.5;
	ezCharco = smoothstep( 1.05 - uMoj * 0.8, 1.17 - uMoj * 0.8, nivel );
	ezA *= mix( 1.0, 0.55, clamp( uMoj * 1.1, 0.0, 1.0 ) ) * mix( 1.0, 0.7, ezCharco );
}
diffuseColor.rgb = ezA;
`;

const RUG = /* glsl */`
float roughnessFactor = roughness * ezO.g;
roughnessFactor += ( ezM.g * 0.5 + ezM2.g * 0.5 - 0.5 ) * uMV.z;
roughnessFactor = mix( roughnessFactor, 1.0, ezSuc * 0.25 );
roughnessFactor = mix( roughnessFactor, roughnessFactor * 0.4, clamp( uMoj, 0.0, 1.0 ) * 0.8 );
roughnessFactor = mix( roughnessFactor, 0.035, ezCharco );
roughnessFactor = clamp( roughnessFactor, 0.03, 1.0 );
`;

const MET = /* glsl */`
float metalnessFactor = metalness * ezO.b * ( 1.0 - ezCharco * 0.7 );
`;

const AO = /* glsl */`
float ambientOcclusion = ezO.r;
reflectedLight.indirectDiffuse *= ambientOcclusion;
#if defined( USE_CLEARCOAT )
	clearcoatSpecularIndirect *= ambientOcclusion;
#endif
#if defined( USE_ENVMAP ) && defined( STANDARD )
	float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
	reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
#endif
`;

function parcheNormal(anim) {
  let ch = THREE.ShaderChunk.normal_fragment_maps;
  const base = 'texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0';
  let nuevo;
  if (anim === 'agua') {
    nuevo = '( texture2D( normalMap, vNormalMapUv + vec2( uT * 0.021, uT * 0.013 ) ).xyz + texture2D( normalMap, vNormalMapUv.yx * 1.37 + vec2( -uT * 0.017, uT * 0.025 ) ).xyz - 1.0 )';
  } else {
    nuevo = base;
  }
  return ch.replace(base, nuevo);
}

/**
 * Aplica el parche al material. cfg: { orm, macro, mv:[v,t,r], desgaste, mojado, anim, mezcla? }
 * Devuelve las uniformes por si se quieren ajustar después.
 */
export function parchear(mat, cfg) {
  const U = {
    tOrm: { value: cfg.orm }, tMacro: { value: cfg.macro },
    uMV: { value: new THREE.Vector3(...(cfg.mv || [0.16, 0.05, 0.1])) },
    uDes: { value: cfg.desgaste ?? 0 }, uMoj: { value: cfg.mojado ?? 0 }, uT: reloj,
  };
  const mz = cfg.mezcla;
  if (mz) {
    U.tMapB = { value: mz.mapB }; U.tOrmB = { value: mz.ormB }; U.tNormB = { value: mz.normB };
    U.tMask = { value: mz.mascara || mz.mapB };
    U.uMix = { value: new THREE.Vector4(mz.repB ?? 1, mz.escalaMascara ?? 0.1, mz.umbral ?? 0.5, mz.contraste ?? 3) };
  }
  const anim = cfg.anim || '';
  mat.userData.ez = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    let f = sh.fragmentShader;
    f = f.replace('#include <common>', '#include <common>\n' + PARS);
    f = f.replace('#include <map_fragment>', (mz ? 'float ezMixT = 0.0;\n' : '') + MAPA);
    f = f.replace('#include <roughnessmap_fragment>', RUG);
    f = f.replace('#include <metalnessmap_fragment>', MET);
    let nm = parcheNormal(anim);
    if (mz) nm = nm.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
      'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n\tvec3 mapNB = texture2D( tNormB, vMapUv * uMix.x + vec2( 0.37, 0.61 ) ).xyz * 2.0 - 1.0;\n\tmapN = normalize( mix( mapN, mapNB, ezMixT ) );');
    nm += '\nnormal = normalize( mix( normal, nonPerturbedNormal, ezCharco * 0.92 ) );\n';
    f = f.replace('#include <normal_fragment_maps>', nm);
    f = f.replace('#include <aomap_fragment>', AO);
    if (anim === 'pantalla') {
      f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
        'float ezLin = 0.78 + 0.22 * sin( vMapUv.y * 260.0 + uT * 2.0 );\n' +
        'float ezBarra = pow( max( 0.0, 1.0 - abs( fract( vMapUv.y * 0.6 - uT * 0.17 ) - 0.5 ) * 9.0 ), 2.0 );\n' +
        'float ezTrem = 0.96 + 0.04 * sin( uT * 53.0 ) * sin( uT * 7.0 );\n' +
        'totalEmissiveRadiance *= ezLin * ( 1.0 + ezBarra * 1.4 ) * ezTrem;');
    } else if (anim === 'neon') {
      f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
        'totalEmissiveRadiance *= 0.93 + 0.07 * sin( uT * 41.0 ) * sin( uT * 13.0 + 1.0 );');
    }
    if (mz) { f = '#define EZ_MIX\n' + (mz.mascara ? '#define EZ_MASK\n' : '') + f; }
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => 'ezmat1|' + anim + (mz ? '|mix' + (mz.mascara ? 'm' : '') : '');
  if (anim) mat.onBeforeRender = () => { if (!reloj.manual) reloj.value = performance.now() / 1000; };
  return U;
}
