// ERA Z · Arquitectura paramétrica: kit.edificio({...}). Todo se funde en el lote estático del mapa (1 malla por material).
// Marco local del edificio: ancho a lo largo de X, fondo a lo largo de Z. La cara «sur» es +Z (la que mira a la cámara).
import * as THREE from 'three';
import { materiales } from '../../render/materiales/index.js';
import { cajaRedondeada, cilindro, matriz, tejadoDosAguas, tejadoCuatroAguas } from './geometria.js';
import { crearRng } from '../../nucleo/util.js';

/** Estilos predefinidos: se mezclan con las opciones del autor (las opciones ganan). */
export const ESTILOS = {
  colonial: { muro: 'estuco_desconchado', colorMuro: 0xe6d3a8, zocalo: 'silleria', esquinas: 'silleria', tejado: { tipo: 'dos_aguas', material: 'teja_arabe', alero: 0.55, pendiente: 0.5 }, ventanas: { marcoColor: 0x4a2f1c, postigos: true, rejas: false }, cornisa: true },
  encalado: { muro: 'ladrillo_encalado', colorMuro: 0xf1ecdf, zocalo: 'silleria', esquinas: null, tejado: { tipo: 'dos_aguas', material: 'teja_arabe', alero: 0.5, pendiente: 0.45 }, ventanas: { marcoColor: 0x2e4a3a, postigos: true }, cornisa: false },
  piedra: { muro: 'silleria', zocalo: 'silleria', esquinas: null, tejado: { tipo: 'dos_aguas', material: 'pizarra', alero: 0.4, pendiente: 0.8 }, ventanas: { marcoColor: 0x2b2a28, ancho: 0.9, alto: 1.5 }, cornisa: true },
  madera: { muro: 'tablas_pintadas', colorMuro: 0x9a3b2e, zocalo: 'tablas_viejas', esquinas: 'tablas_viejas', tejado: { tipo: 'dos_aguas', material: 'chapa_ondulada', color: 0x7f8a8d, alero: 0.5, pendiente: 0.32 }, ventanas: { marcoColor: 0xe9e2d0, postigos: true }, cornisa: false },
  ladrillo: { muro: 'ladrillo_rojo', zocalo: 'hormigon', esquinas: null, tejado: { tipo: 'plano', material: 'tela_asfaltica' }, ventanas: { marcoColor: 0x232a2e, alto: 1.6 }, cornisa: true },
  industrial: { muro: 'chapa_ondulada', colorMuro: 0x8d9a93, zocalo: 'hormigon', esquinas: null, tejado: { tipo: 'dos_aguas', material: 'chapa_ondulada', color: 0x6f7a78, alero: 0.35, pendiente: 0.18 }, ventanas: { marcoColor: 0x2a2f32, ancho: 1.6, alto: 0.9, sep: 3.2 }, cornisa: false },
  bunker: { muro: 'hormigon_bunker', zocalo: 'hormigon_bunker', esquinas: null, tejado: { tipo: 'plano', material: 'hormigon_bunker' }, ventanas: false, cornisa: false },
  prefabricado: { muro: 'panel_prefabricado', colorMuro: 0xd9dde0, zocalo: 'hormigon', esquinas: null, tejado: { tipo: 'plano', material: 'tela_asfaltica' }, ventanas: { marcoColor: 0x2c3a46, ancho: 1.8, alto: 1.3, sep: 3.6 }, cornisa: true },
  cristal: { muro: 'cristal_rascacielos', zocalo: 'acero_cepillado', esquinas: null, tejado: { tipo: 'plano', material: 'hormigon' }, ventanas: false, cornisa: true },
  futurista: { muro: 'panel_futurista', zocalo: 'casco_nave', esquinas: null, tejado: { tipo: 'plano', material: 'composite_futurista' }, ventanas: { marcoColor: 0x20303c, ancho: 2, alto: 1.2, sep: 3.8, luz: 0.9 }, cornisa: true },
};

const mezcla = (a, b) => {
  const r = { ...a };
  for (const k of Object.keys(b || {})) if (b[k] !== undefined) r[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a?.[k] && typeof a[k] === 'object') ? mezcla(a[k], b[k]) : b[k];
  return r;
};

const CARAS = { sur: { th: 0, eje: 'ancho' }, norte: { th: Math.PI, eje: 'ancho' }, este: { th: Math.PI / 2, eje: 'fondo' }, oeste: { th: -Math.PI / 2, eje: 'fondo' } };

/** Forma plana en XY (no en suelo) extruida en +Z: puerta/ventana con arco. */
function formaArco(w, h, arco, hole) {
  const s = new THREE.Shape(), hw = w / 2;
  if (arco) {
    const r = hw, y0 = h - r;
    s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, y0); s.absarc(0, y0, r, 0, Math.PI, false); s.lineTo(-hw, 0);
  } else { s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, h); s.lineTo(-hw, h); s.lineTo(-hw, 0); }
  if (hole) s.holes.push(hole);
  return s;
}
const cacheForma = new Map();
function extrusionXY(w, h, prof, arco, marco = 0) {
  const k = [w, h, prof, arco, marco].join('|');
  let g = cacheForma.get(k);
  if (g) return g;
  let hole = null;
  if (marco > 0) {
    const iw = w - 2 * marco, ih = h - marco;
    hole = new THREE.Path();
    const hw = iw / 2;
    if (arco) { const y0 = ih - hw; hole.moveTo(-hw, 0); hole.lineTo(hw, 0); hole.lineTo(hw, y0); hole.absarc(0, y0, hw, 0, Math.PI, false); hole.lineTo(-hw, 0); }
    else { hole.moveTo(-hw, 0); hole.lineTo(hw, 0); hole.lineTo(hw, ih); hole.lineTo(-hw, ih); hole.lineTo(-hw, 0); }
  }
  const sh = formaArco(w, h, arco, hole);
  g = new THREE.ExtrudeGeometry(sh, { depth: prof, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 10 });
  g.translate(0, 0, -0.0);
  cacheForma.set(k, g);
  return g;
}

export function construirEdificio(kit, opc = {}) {
  const base = ESTILOS[opc.estilo || 'colonial'] || ESTILOS.colonial;
  const o = mezcla(base, opc);
  const {
    x = 0, z = 0, ancho = 10, fondo = 8, pisos = 2, rot = 0, semilla = 1,
  } = o;
  const alturaPiso = o.alturaPiso ?? 3.2;
  const alto = o.alto ?? pisos * alturaPiso;
  const hPiso = alto / pisos;
  const rng = crearRng(semilla * 1009 + Math.floor(x * 31 + z * 17));
  const lote = o.lote ?? kit.lote0;
  const M0 = matriz(x, 0, z, rot);
  const mat = (n, op) => (typeof n === 'string' ? materiales.obtener(n, op) : n);

  const mMuro = mat(o.muro, { color: o.colorMuro, desgaste: o.desgasteMuro, mojado: o.mojadoMuro });
  const mZoc = o.zocalo ? mat(o.zocalo, { color: o.colorZocalo }) : null;
  const mEsq = o.esquinas ? mat(o.esquinas, { color: o.colorEsquinas }) : null;
  const mCornisa = mat(o.materialCornisa ?? o.zocalo ?? o.muro, { color: o.colorCornisa ?? (o.zocalo ? undefined : o.colorMuro) });

  // ── pieza genérica en marco local del edificio / de una cara
  const mLocal = (lx, ly, lz, rotY = 0) => new THREE.Matrix4().multiplyMatrices(M0, matriz(lx, ly, lz, rotY));
  const caja = (m, lx, ly, lz, w, h, d, op = {}) => lote.anadir(cajaRedondeada(w, h, d, op.radio ?? 0.03, op.seg ?? 1), m, mLocal(lx, ly, lz, op.rotY || 0), op);
  const mCara = (cara, u, y, w, rotExtra = 0) => {
    const c = CARAS[cara], D = (c.eje === 'ancho' ? fondo : ancho) / 2;
    const F = new THREE.Matrix4().multiplyMatrices(matriz(0, 0, 0, c.th), matriz(u, y, D + w, rotExtra));
    return new THREE.Matrix4().multiplyMatrices(M0, F);
  };
  // caja en el marco de una cara: u a lo largo, y alto, w hacia fuera (centro)
  const cajaCara = (m, cara, u, y, w, aw, ah, ad, op = {}) => lote.anadir(cajaRedondeada(aw, ah, ad, op.radio ?? 0.025, 1), m, mCara(cara, u, y, w), op);

  const info = { x, z, rot, ancho, fondo, alto, pisos, puertas: [], ventanas: [], techoY: alto, esquinas: [] };
  const sc = Math.sin(rot), cc = Math.cos(rot);
  const aMundo = (lx, lz) => ({ x: x + lx * cc + lz * sc, z: z - lx * sc + lz * cc });
  info.aMundo = aMundo;

  // ── volumen principal, zócalo, esquinas y cornisas
  caja(mMuro, 0, alto / 2, 0, ancho, alto, fondo, { radio: 0.06 });
  const zocH = o.alturaZocalo ?? 0.95;
  if (mZoc) caja(mZoc, 0, zocH / 2, 0, ancho + 0.14, zocH, fondo + 0.14, { radio: 0.04 });
  if (mEsq) {
    const qw = 0.55;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      caja(mEsq, sx * (ancho / 2 - qw / 2 + 0.05), alto / 2, sz * (fondo / 2 - qw / 2 + 0.05), qw, alto - 0.1, qw, { radio: 0.05 });
    }
  }
  if (o.cornisa !== false) {
    for (let p = 1; p < pisos; p++) caja(mCornisa, 0, p * hPiso, 0, ancho + 0.12, 0.2, fondo + 0.12, { radio: 0.03 });
  }

  // ── puertas
  const puertas = (o.puertas === undefined ? [{ cara: 'sur', u: 0 }] : o.puertas) || [];
  const mPuertaHoja = mat(o.materialPuerta ?? 'tablones', { color: o.colorPuerta });
  const mMarcoPuerta = mat(o.materialMarcoPuerta ?? o.zocalo ?? 'silleria', { color: o.colorMarcoPuerta });
  const mMetal = mat('hierro_forjado');
  for (const p of puertas) {
    const cara = p.cara ?? 'sur', u = p.u ?? 0, w = p.ancho ?? 1.5, h = p.alto ?? 2.4, arco = p.arco ?? (o.arcos ?? false);
    const m1 = mCara(cara, u, 0, -0.01);
    // marco de piedra (aro) y hoja recogida
    lote.anadir(extrusionXY(w + 0.55, h + 0.28, 0.2, arco, 0.27), mMarcoPuerta, mCara(cara, u, 0, -0.04));
    lote.anadir(extrusionXY(w, h, 0.08, arco, 0), mat(p.material ?? mPuertaHoja, { color: p.color ?? o.colorPuerta }), mCara(cara, u, 0, -0.02));
    // herrajes
    cajaCara(mMetal, cara, u - w * 0.38, h * 0.48, 0.1, 0.05, 0.22, 0.05);
    cajaCara(mMetal, cara, u + w * 0.0, h * 0.5, 0.075, 0.025, h * 0.86, 0.02, { radio: 0.008 }); // junta central
    for (const yy of [0.5, h - 0.55]) cajaCara(mMetal, cara, u, yy, 0.075, w * 0.92, 0.07, 0.02, { radio: 0.008 });
    // escalones
    const ne = p.escalones ?? 2;
    for (let e = 0; e < ne; e++) {
      const alt = (e + 1) * 0.16, ext = 0.3 + (ne - e) * 0.34;
      cajaCara(mMarcoPuerta, cara, u, alt / 2, ext / 2 - 0.05, w + 0.7 + (ne - e) * 0.25, alt, ext, { radio: 0.02 });
    }
    const c = CARAS[cara], D = (c.eje === 'ancho' ? fondo : ancho) / 2;
    const loc = new THREE.Vector3(u, 0, D + 1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.th);
    const pw = aMundo(loc.x, loc.z);
    info.puertas.push({ cara, x: pw.x, z: pw.z, rot: rot + c.th, ancho: w });
    if (p.luz !== false && o.luzPuertas) {
      const l = aMundo(new THREE.Vector3(u, 0, D + 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.th).x, new THREE.Vector3(u, 0, D + 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.th).z);
      kit.luz({ x: l.x, y: h + 0.5, z: l.z, color: o.colorLuz ?? 0xffb061, intensidad: o.intensidadLuz ?? 14, distancia: 9 });
    }
    void m1;
  }

  // ── ventanas
  const V = o.ventanas === false ? null : (o.ventanas || {});
  if (V) {
    const vw = V.ancho ?? 1.1, vh = V.alto ?? 1.5, sep = V.sep ?? 3.3, probLuz = V.luz ?? 0.5;
    const mMarco = mat(V.marcoMaterial ?? 'tablas_pintadas', { color: V.marcoColor ?? 0x4a2f1c });
    const mDintel = mZoc || mMarco;
    const matCristal = (enc) => kit.vidrio(enc, o.colorLuz ?? 0xffbf6b);
    for (const cara of ['sur', 'norte', 'este', 'oeste']) {
      const cfg = o.caras?.[cara];
      if (cfg?.ventanas === false) continue;
      const vv = { ...V, ...(cfg?.ventanas && typeof cfg.ventanas === 'object' ? cfg.ventanas : {}) };
      const w_ = vv.ancho ?? vw, h_ = vv.alto ?? vh, s_ = vv.sep ?? sep;
      const L = CARAS[cara].eje === 'ancho' ? ancho : fondo;
      const U = L - 2 * (vv.margen ?? 1.5);
      if (U < w_) continue;
      const n = Math.max(1, Math.round(U / s_));
      const paso = U / n;
      for (let f = 0; f < pisos; f++) {
        for (let i = 0; i < n; i++) {
          const u = -U / 2 + paso * (i + 0.5);
          if (f === 0) {
            let choca = false;
            for (const p of puertas) if ((p.cara ?? 'sur') === cara && Math.abs((p.u ?? 0) - u) < (p.ancho ?? 1.5) / 2 + w_ / 2 + 0.55) choca = true;
            if (choca) continue;
          }
          const y0 = f * hPiso + (vv.antepecho ?? (f === 0 ? Math.max(zocH + 0.15, 1.0) : 0.95));
          if (y0 + h_ > (f + 1) * hPiso - 0.25) continue;
          const enc = rng() < probLuz;
          const arcoV = vv.arco ?? false;
          // cristal rehundido (a ras del muro) y marco con relieve
          cajaCara(matCristal(enc), cara, u, y0 + h_ / 2, 0.012, w_ - 0.06, h_ - 0.06, 0.02, { radio: 0.004 });
          const t = vv.grosorMarco ?? 0.09, prof = 0.14;
          cajaCara(mMarco, cara, u - w_ / 2 + t / 2, y0 + h_ / 2, 0.05, t, h_, prof);
          cajaCara(mMarco, cara, u + w_ / 2 - t / 2, y0 + h_ / 2, 0.05, t, h_, prof);
          cajaCara(mMarco, cara, u, y0 + h_ - t / 2, 0.05, w_, t, prof);
          cajaCara(mMarco, cara, u, y0 + t / 2, 0.05, w_, t, prof);
          if (vv.travesanos !== false) {
            cajaCara(mMarco, cara, u, y0 + h_ / 2, 0.04, 0.045, h_ - t, 0.07, { radio: 0.01 });
            cajaCara(mMarco, cara, u, y0 + h_ * 0.62, 0.04, w_ - t, 0.045, 0.07, { radio: 0.01 });
          }
          // dintel y alféizar
          cajaCara(mDintel, cara, u, y0 + h_ + 0.12, 0.1, w_ + 0.5, 0.2, 0.2, { radio: 0.03 });
          cajaCara(mDintel, cara, u, y0 - 0.06, 0.13, w_ + 0.34, 0.1, 0.3, { radio: 0.025 });
          if (vv.postigos && rng() < 0.85 && !arcoV) {
            const abierto = rng() < 0.7;
            const ps = rng() < 0.5 ? 1 : -1;
            if (abierto) {
              for (const s of [-1, 1]) cajaCara(mMarco, cara, u + s * (w_ / 2 + w_ * 0.25 + 0.06), y0 + h_ / 2, 0.05, w_ * 0.5, h_ + 0.04, 0.045, { radio: 0.015 });
            } else {
              cajaCara(mMarco, cara, u + ps * 0, y0 + h_ / 2, 0.09, w_ + 0.1, h_ + 0.04, 0.045, { radio: 0.015 });
            }
          }
          if (vv.rejas && f === 0) {
            for (let b = 0; b < 6; b++) cajaCara(mMetal, cara, u - w_ / 2 + (b + 0.5) * (w_ / 6), y0 + h_ / 2, 0.16, 0.022, h_ + 0.1, 0.022, { radio: 0.008 });
            cajaCara(mMetal, cara, u, y0 + h_ * 0.35, 0.16, w_, 0.03, 0.03, { radio: 0.008 });
          }
          if (vv.macetas && f > 0 && rng() < 0.4) cajaCara(mat('hierro_oxidado'), cara, u, y0 - 0.06, 0.35, w_ * 0.9, 0.16, 0.2, { radio: 0.04 });
          const pc = aMundo(...(() => { const c = CARAS[cara], D = (c.eje === 'ancho' ? fondo : ancho) / 2; const v = new THREE.Vector3(u, 0, D).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.th); return [v.x, v.z]; })());
          info.ventanas.push({ cara, piso: f, x: pc.x, z: pc.z, y: y0 + h_ / 2, encendida: enc });
        }
      }
    }
  }

  // ── balcón corrido en el piso superior de la cara sur
  if (o.balcon && pisos > 1) {
    const mB = mat('hierro_forjado');
    const bw = Math.min(ancho - 2, o.balcon.ancho ?? ancho * 0.6), prof = o.balcon.fondo ?? 1.0, yb = (pisos - 1) * hPiso;
    cajaCara(mat(o.balcon.material ?? 'tablones'), 'sur', o.balcon.u ?? 0, yb - 0.08, prof / 2, bw, 0.16, prof, { radio: 0.02 });
    cajaCara(mB, 'sur', o.balcon.u ?? 0, yb + 1.0, prof - 0.04, bw, 0.06, 0.06);
    const np = Math.round(bw / 0.28);
    for (let i = 0; i <= np; i++) cajaCara(mB, 'sur', (o.balcon.u ?? 0) - bw / 2 + (i / np) * bw, yb + 0.5, prof - 0.04, 0.03, 1.0, 0.03, { radio: 0.008 });
    for (const s of [-1, 1]) cajaCara(mB, 'sur', (o.balcon.u ?? 0) + s * bw / 2, yb + 0.5, prof / 2, 0.05, 1.0, prof, { radio: 0.01 });
  }

  // ── tejado
  const T = mezcla({ tipo: 'dos_aguas', material: 'teja_arabe', alero: 0.5, pendiente: 0.5 }, o.tejado || {});
  const mTej = mat(T.material, { color: T.color, mojado: T.mojado });
  const mFascia = mat(T.materialFascia ?? o.zocalo ?? 'tablas_viejas', { color: T.colorFascia });
  let techoY = alto, alturaCumbre = 0;
  if (T.tipo === 'dos_aguas' || T.tipo === 'cuatro_aguas') {
    const al = T.alero ?? 0.5, w2 = ancho + 2 * al, d2 = fondo + 2 * al;
    const eje = T.eje ?? 'x';
    const luz = eje === 'x' ? d2 : w2;
    alturaCumbre = Math.max(0.5, (T.pendiente ?? 0.5) * luz / 2);
    const g = T.tipo === 'dos_aguas' ? tejadoDosAguas(eje === 'x' ? w2 : d2, eje === 'x' ? d2 : w2, alturaCumbre) : tejadoCuatroAguas(w2, d2, alturaCumbre, T.cumbrera ?? 0.4);
    // para eje z se gira 90° la pieza (largo ↔ fondo)
    const gm = T.tipo === 'dos_aguas' && eje === 'z' ? new THREE.Matrix4().multiplyMatrices(M0, matriz(0, alto, 0, Math.PI / 2)) : new THREE.Matrix4().multiplyMatrices(M0, matriz(0, alto, 0));
    lote.anadir(g, mTej, gm, { uv: T.material });
    // fascias y cumbrera
    if (T.tipo === 'dos_aguas') {
      const largo = eje === 'x' ? w2 : d2, ancho2 = eje === 'x' ? d2 : w2;
      const rotF = eje === 'x' ? 0 : Math.PI / 2;
      const mc = (lx, ly, lz) => new THREE.Matrix4().multiplyMatrices(M0, new THREE.Matrix4().multiplyMatrices(matriz(0, 0, 0, rotF), matriz(lx, ly, lz)));
      lote.anadir(cajaRedondeada(largo + 0.1, 0.17, 0.42, 0.06, 2), mTej, mc(0, alto + alturaCumbre, 0), { uv: T.material });
      for (const s of [-1, 1]) lote.anadir(cajaRedondeada(largo + 0.06, 0.2, 0.1, 0.025, 1), mFascia, mc(0, alto + 0.04, s * ancho2 / 2));
      // vierteaguas (hastiales)
      for (const s of [-1, 1]) lote.anadir(cajaRedondeada(0.12, 0.22, ancho2 + 0.04, 0.03, 1), mFascia, mc(s * largo / 2, alto + 0.04, 0));
    } else {
      lote.anadir(cajaRedondeada(w2 + 0.08, 0.2, d2 + 0.08, 0.04, 1), mFascia, matriz(0, 0, 0), { uv: false, });
    }
    techoY = alto + alturaCumbre;
    // chimenea
    if (T.chimenea) {
      const ch = T.chimenea === true ? {} : T.chimenea;
      const cx = ch.x ?? ancho * 0.28, cz = ch.z ?? 0;
      const hz = eje === 'x' ? d2 / 2 : w2 / 2;
      const coord = eje === 'x' ? cz : cx;
      const yb = alto + alturaCumbre * Math.max(0, 1 - Math.abs(coord) / hz);
      const alt = (ch.alto ?? 1.5) + 0.8;
      const mL = mat(ch.material ?? 'ladrillo_rojo', { color: ch.color });
      caja(mL, cx, yb + alt / 2 - 0.5, cz, 0.9, alt + 1.0, 0.9, { radio: 0.04 });
      caja(mat('hormigon'), cx, yb + alt - 0.5 + 0.06, cz, 1.1, 0.14, 1.1, { radio: 0.03 });
      caja(mat('hierro_oxidado'), cx, yb + alt - 0.5 + 0.2, cz, 0.55, 0.14, 0.55, { radio: 0.02 });
      info.chimenea = { x: aMundo(cx, cz).x, z: aMundo(cx, cz).z, y: yb + alt };
    }
  } else if (T.tipo === 'plano') {
    const mP = mTej, mPar = mat(T.parapeto ?? o.zocalo ?? o.muro, { color: T.colorParapeto ?? (o.zocalo ? undefined : o.colorMuro) });
    const pa = T.parapetoAlto ?? 0.55;
    caja(mP, 0, alto + 0.1, 0, ancho + 0.1, 0.2, fondo + 0.1, { radio: 0.03, uv: T.material });
    // parapeto
    if (pa > 0) {
      caja(mPar, 0, alto + 0.2 + pa / 2, fondo / 2 + 0.02, ancho + 0.28, pa, 0.3, { radio: 0.04 });
      caja(mPar, 0, alto + 0.2 + pa / 2, -fondo / 2 - 0.02, ancho + 0.28, pa, 0.3, { radio: 0.04 });
      caja(mPar, ancho / 2 + 0.02, alto + 0.2 + pa / 2, 0, 0.3, pa, fondo - 0.3, { radio: 0.04 });
      caja(mPar, -ancho / 2 - 0.02, alto + 0.2 + pa / 2, 0, 0.3, pa, fondo - 0.3, { radio: 0.04 });
    }
    techoY = alto + 0.2 + pa;
    if (T.equipos !== false && ancho > 6 && fondo > 5) {
      const mAC = mat('acero_cepillado'), mCil = mat('acero_pintado', { color: 0x9aa3a6 });
      const ne = T.equipos ?? Math.max(2, Math.round(ancho * fondo / 38));
      for (let i = 0; i < ne; i++) {
        const ex = (rng() - 0.5) * (ancho - 3), ez = (rng() - 0.5) * (fondo - 3);
        if (rng() < 0.55) {
          caja(mAC, ex, techoY + 0.4, ez, 1.5, 0.8, 1.1, { radio: 0.05 }); caja(mCil, ex, techoY + 0.86, ez, 1.1, 0.1, 0.85, { radio: 0.02 });
        } else lote.anadir(cilindro(0.55, 0.55, 1.3, 14, 0.04), mCil, new THREE.Matrix4().multiplyMatrices(M0, matriz(ex, techoY, ez)));
      }
    }
  }
  if (o.falsaFachada) {
    const ff = typeof o.falsaFachada === 'object' ? o.falsaFachada : {};
    const hh = ff.alto ?? 2.2;
    caja(mMuro, 0, alto + hh / 2, fondo / 2 - 0.15, ancho + 0.05, hh, 0.3, { radio: 0.04 });
    caja(mCornisa, 0, alto + hh + 0.08, fondo / 2 - 0.1, ancho + 0.4, 0.2, 0.5, { radio: 0.04 });
    techoY = Math.max(techoY, alto + hh);
  }
  info.techoY = techoY;

  // ── colisión: el volumen del edificio
  if (o.colision !== false) info.cuerpo = kit.muro(x, z, ancho + 0.1, fondo + 0.1, rot, { nombre: o.nombre || 'edificio' });
  kit._edificios.push(info);
  return info;
}
