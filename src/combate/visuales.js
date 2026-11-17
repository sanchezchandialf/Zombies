// Visuales propios del combate: proyectiles y granadas, discos de zona, círculos de aviso, sombras y estelas de tajo.
// Todo se crea de forma perezosa y compartida (geometrías y materiales cacheados). Sin escena (pruebas en Node) no hace nada.
import * as THREE from 'three';

const AD = THREE.AdditiveBlending;
const geos = new Map();
const mats = new Map();
const texs = new Map();

const memo = (mapa, clave, fabrica) => { let v = mapa.get(clave); if (!v) { v = fabrica(); mapa.set(clave, v); } return v; };
const hex = (c) => (typeof c === 'number' ? c : new THREE.Color(c).getHex());

function lienzo(n) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = n; return cv;
}

/** Textura de brillo radial (blanco→transparente). */
function texBrillo() {
  return memo(texs, 'brillo', () => {
    const cv = lienzo(64); if (!cv) return null;
    const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}

/** Textura de disco de zona: relleno suave, anillo exterior nítido y, según el tipo, marcas internas. */
function texZona(tipo) {
  return memo(texs, 'zona_' + tipo, () => {
    const n = 256, cv = lienzo(n); if (!cv) return null;
    const g = cv.getContext('2d'), m = n / 2;
    const gr = g.createRadialGradient(m, m, 0, m, m, m * 0.96);
    const relleno = { fuego: [0.34, 0.12], gas: [0.3, 0.2], acido: [0.4, 0.16], curacion: [0.14, 0.1], gravedad: [0.4, 0.04] }[tipo] || [0.3, 0.1];
    gr.addColorStop(0, `rgba(255,255,255,${relleno[0]})`); gr.addColorStop(0.7, `rgba(255,255,255,${relleno[1]})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(m, m, m * 0.97, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(m, m, m * 0.9, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(m, m, m * 0.8, 0, Math.PI * 2); g.stroke();
    if (tipo === 'gravedad') {
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.7)';
      for (let a = 0; a < 4; a++) {
        g.beginPath();
        for (let t = 0; t <= 1; t += 0.02) { const r = m * 0.88 * (1 - t), an = a * Math.PI / 2 + t * 5.2; const x = m + Math.cos(an) * r, y = m + Math.sin(an) * r; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.stroke();
      }
    } else if (tipo === 'curacion') {
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(m - 10, m - 52, 20, 104); g.fillRect(m - 52, m - 10, 104, 20);
    } else if (tipo === 'gas' || tipo === 'acido') {
      g.fillStyle = 'rgba(255,255,255,0.2)';
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = m * (0.2 + 0.6 * ((i * 37) % 10) / 10); g.beginPath(); g.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, 9 + (i % 4) * 5, 0, 7); g.fill(); }
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  });
}

const geoDisco = () => memo(geos, 'disco', () => { const g = new THREE.CircleGeometry(1, 48); g.rotateX(-Math.PI / 2); return g; });
const geoAnillo = () => memo(geos, 'anillo', () => { const g = new THREE.RingGeometry(0.9, 1, 56); g.rotateX(-Math.PI / 2); return g; });

function matBrillo(color, opacidad = 1) {
  return memo(mats, 'brillo_' + hex(color) + '_' + opacidad, () => new THREE.SpriteMaterial({
    map: texBrillo(), color: hex(color), blending: AD, transparent: true, depthWrite: false, opacity: opacidad, toneMapped: false,
  }));
}
function matEmisivo(color, factor = 1.8) {
  return memo(mats, 'emi_' + hex(color) + '_' + factor, () => {
    const c = new THREE.Color(hex(color)).multiplyScalar(factor);
    return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  });
}
function matMetal(color, rug = 0.4, met = 0.8) {
  return memo(mats, 'metal_' + hex(color) + rug + met, () => new THREE.MeshStandardMaterial({ color: hex(color), roughness: rug, metalness: met }));
}

function sprite(color, tam, opacidad = 1) {
  const s = new THREE.Sprite(matBrillo(color, opacidad)); s.scale.setScalar(tam); s.userData.base = tam; return s;
}

// ─────────────────────────── Modelos de proyectiles y granadas ───────────────────────────
/** Modelos locales: +Z = hacia delante, origen = centro. */
const FABRICAS = {
  bala() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(memo(geos, 'bala', () => { const c = new THREE.CapsuleGeometry(0.03, 0.22, 3, 8); c.rotateX(Math.PI / 2); return c; }), matEmisivo(0xffd68a, 2));
    g.add(m, sprite(0xffb455, 0.5, 0.6)); return g;
  },
  plasma() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(memo(geos, 'esf_plasma', () => new THREE.SphereGeometry(0.13, 16, 12)), matEmisivo(0xdffcff, 2.2)));
    g.add(sprite(0x3fd8ff, 1.3, 0.9), sprite(0xff4fd8, 2.1, 0.28));
    g.userData.pulso = g.children[1]; return g;
  },
  cohete() {
    const g = new THREE.Group();
    const cuerpo = memo(geos, 'cohete', () => {
      const perfil = [[0, -0.42], [0.075, -0.4], [0.085, -0.3], [0.085, 0.2], [0.07, 0.34], [0.04, 0.44], [0, 0.5]].map(([r, z]) => new THREE.Vector2(r, z));
      const l = new THREE.LatheGeometry(perfil, 16); l.rotateX(Math.PI / 2); return l;
    });
    g.add(new THREE.Mesh(cuerpo, matMetal(0x6b705c, 0.5, 0.6)));
    const banda = new THREE.Mesh(memo(geos, 'cohete_banda', () => { const c = new THREE.CylinderGeometry(0.088, 0.088, 0.07, 16); c.rotateX(Math.PI / 2); return c; }), matMetal(0xc9422b, 0.5, 0.3));
    banda.position.z = 0.22; g.add(banda);
    const aleta = memo(geos, 'cohete_aleta', () => new THREE.BoxGeometry(0.012, 0.17, 0.18));
    for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(aleta, matMetal(0x3a3d34, 0.6, 0.5)); a.position.z = -0.32; a.rotation.z = i * Math.PI / 2; a.translateY(0.1); g.add(a); }
    const llama = new THREE.Mesh(memo(geos, 'cohete_llama', () => { const c = new THREE.ConeGeometry(0.075, 0.55, 12); c.rotateX(-Math.PI / 2); c.translate(0, 0, -0.68); return c; }),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.35), toneMapped: false, transparent: true, opacity: 0.9, blending: AD, depthWrite: false }));
    g.add(llama, Object.assign(sprite(0xff9a3c, 1.6, 0.8), { position: new THREE.Vector3(0, 0, -0.5) }));
    g.userData.llama = llama; return g;
  },
  granada40() {
    const g = new THREE.Group();
    const c = new THREE.Mesh(memo(geos, 'gr40', () => { const l = new THREE.LatheGeometry([[0, -0.1], [0.045, -0.09], [0.05, 0.02], [0.04, 0.08], [0, 0.12]].map(([r, z]) => new THREE.Vector2(r, z)), 12); l.rotateX(Math.PI / 2); return l; }), matMetal(0xb08d4a, 0.35, 0.9));
    g.add(c, sprite(0xffc27a, 0.35, 0.5)); return g;
  },
  obus() {
    const g = FABRICAS.granada40(); g.scale.setScalar(1.7); return g;
  },
  _chispa(g, z = 0.2, y = 0.1) {
    const s = sprite(0xffd37a, 0.3, 1); s.position.set(0, y, z); g.add(s); g.userData.chispa = s; return s;
  },
  granada_mecha() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(memo(geos, 'esf_hierro', () => new THREE.SphereGeometry(0.1, 14, 10)), matMetal(0x24262a, 0.55, 0.85)));
    const cuello = new THREE.Mesh(memo(geos, 'cuello', () => new THREE.CylinderGeometry(0.032, 0.04, 0.05, 8)), matMetal(0x17181a, 0.6, 0.8));
    cuello.position.y = 0.105; g.add(cuello);
    const mecha = new THREE.Mesh(memo(geos, 'mecha', () => new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5)), matMetal(0xb8a77a, 0.9, 0));
    mecha.position.y = 0.17; mecha.rotation.z = 0.35; g.add(mecha);
    FABRICAS._chispa(g, 0, 0.23); return g;
  },
  dinamita() {
    const g = new THREE.Group();
    const barra = memo(geos, 'barra_din', () => new THREE.CylinderGeometry(0.032, 0.032, 0.24, 10));
    for (let i = -1; i <= 1; i++) { const b = new THREE.Mesh(barra, matMetal(0xb3281f, 0.8, 0)); b.rotation.z = Math.PI / 2; b.position.set(0, i * 0.045 + (i === 0 ? 0.03 : 0), 0); g.add(b); }
    const cuerda = new THREE.Mesh(memo(geos, 'cuerda', () => new THREE.TorusGeometry(0.06, 0.008, 5, 12)), matMetal(0xc9b184, 0.9, 0));
    cuerda.rotation.y = Math.PI / 2; g.add(cuerda);
    FABRICAS._chispa(g, 0.0, 0.16); g.userData.chispa.position.set(0.1, 0.13, 0); return g;
  },
  granada_mango() {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(memo(geos, 'cab_mango', () => new THREE.CylinderGeometry(0.06, 0.06, 0.11, 12)), matMetal(0x59614a, 0.6, 0.6));
    cab.position.y = 0.17; g.add(cab);
    const mango = new THREE.Mesh(memo(geos, 'mango', () => new THREE.CylinderGeometry(0.018, 0.02, 0.24, 8)), matMetal(0x8a6137, 0.85, 0));
    g.add(mango); g.position.y = 0; return g;
  },
  granada_frag() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(memo(geos, 'ovoide', () => {
      const p = []; for (let i = 0; i <= 10; i++) { const t = i / 10, a = (t - 0.5) * Math.PI; p.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * 0.075 * (1 + (i % 2) * 0.05)), Math.sin(a) * 0.1)); }
      return new THREE.LatheGeometry(p, 12);
    }), matMetal(0x4b5a36, 0.5, 0.7)));
    const palanca = new THREE.Mesh(memo(geos, 'palanca', () => new THREE.BoxGeometry(0.02, 0.1, 0.012)), matMetal(0x9aa0a6, 0.4, 0.9));
    palanca.position.set(0.07, 0.04, 0); palanca.rotation.z = -0.15; g.add(palanca); return g;
  },
  molotov() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(memo(geos, 'botella', () => new THREE.LatheGeometry([[0, -0.11], [0.05, -0.1], [0.055, -0.02], [0.04, 0.05], [0.018, 0.1], [0.02, 0.15], [0, 0.15]].map(([r, y]) => new THREE.Vector2(r, y)), 12)),
      memo(mats, 'vidrio', () => new THREE.MeshStandardMaterial({ color: 0x5a7a52, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.8 }))));
    const trapo = sprite(0xff8a2c, 0.42, 1); trapo.position.set(0, 0.2, 0); g.add(trapo, Object.assign(sprite(0xffcf6a, 0.2, 1), { position: new THREE.Vector3(0, 0.19, 0) }));
    g.userData.chispa = trapo; return g;
  },
  granada_singularidad() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(memo(geos, 'esf_neg', () => new THREE.SphereGeometry(0.085, 16, 12)), matMetal(0x08050f, 0.2, 1)));
    const anillo = new THREE.Mesh(memo(geos, 'anillo_sing', () => new THREE.TorusGeometry(0.13, 0.012, 6, 24)), matEmisivo(0xc07bff, 2));
    g.add(anillo, sprite(0x9a5cff, 0.7, 0.8)); g.userData.anillo = anillo; return g;
  },
  acido() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(memo(geos, 'esf_acido', () => new THREE.SphereGeometry(0.16, 14, 10)), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 1.3, 0.2), toneMapped: false, transparent: true, opacity: 0.92 })));
    g.add(sprite(0xa6ff3a, 0.9, 0.55)); return g;
  },
};

/** Visual 'defecto' si la clave no existe. */
function modelo(clave) {
  const f = FABRICAS[clave] && clave[0] !== '_' ? FABRICAS[clave] : FABRICAS.bala;
  return f();
}

export function crearVisuales(juego) {
  const efimeros = []; // { obj, t, dur, alTerminar, actualizar(frac) }
  const escena = () => juego.render?.escena ?? null;
  const habilitado = () => !!escena();

  function anadir(obj) { const e = escena(); if (e && obj) e.add(obj); return obj; }
  function quitar(obj) { obj?.removeFromParent?.(); }

  /** Visual de proyectil. Devuelve { obj, actualizar(dt, t) } o null. */
  function proyectil(clave, escala = 1) {
    if (!habilitado()) return null;
    const obj = modelo(clave);
    obj.scale.multiplyScalar(escala);
    anadir(obj);
    obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const u = obj.userData;
    return {
      obj,
      actualizar(dt, t) {
        const f = 0.8 + 0.25 * Math.sin(t * 38) + 0.1 * Math.sin(t * 91);
        if (u.chispa) u.chispa.scale.setScalar(u.chispa.userData.base * (0.7 + f * 0.6));
        if (u.pulso) u.pulso.scale.setScalar(u.pulso.userData.base * (0.85 + f * 0.25));
        if (u.llama) u.llama.scale.set(1 - 0.12 * Math.sin(t * 60), 1 - 0.12 * Math.sin(t * 60), 0.8 + 0.4 * f);
        if (u.anillo) { u.anillo.rotation.x += dt * 5; u.anillo.rotation.y += dt * 3; }
      },
      quitar() { quitar(obj); },
    };
  }

  /** Disco de zona sobre el suelo. */
  function disco(tipo, radio, color) {
    if (!habilitado()) return null;
    const mat = new THREE.MeshBasicMaterial({
      map: texZona(tipo), color: hex(color), transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
      blending: tipo === 'gas' || tipo === 'acido' ? THREE.NormalBlending : AD, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const m = new THREE.Mesh(geoDisco(), mat); m.scale.setScalar(radio); m.position.y = 0.04; m.renderOrder = 2; m.frustumCulled = false;
    anadir(m);
    return {
      obj: m, mat,
      quitar() { quitar(m); mat.dispose(); },
    };
  }

  /** Círculo de aviso pulsante (impacto inminente). */
  function aviso(x, z, radio, duracion, color = 0xff5a3c) {
    if (!habilitado()) return null;
    const g = new THREE.Group(); g.position.set(x, 0.05, z);
    const mAnillo = new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, blending: AD, polygonOffset: true, polygonOffsetFactor: -3 });
    const mRelleno = new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false, blending: AD, polygonOffset: true, polygonOffsetFactor: -3 });
    const a = new THREE.Mesh(geoAnillo(), mAnillo), r = new THREE.Mesh(geoDisco(), mRelleno);
    const crece = new THREE.Mesh(geoAnillo(), mAnillo); // anillo que converge hacia el borde al acercarse el impacto
    g.add(r, a, crece); g.scale.setScalar(radio);
    for (const h of g.children) { h.frustumCulled = false; h.renderOrder = 3; }
    anadir(g);
    const e = {
      obj: g, t: 0, dur: duracion,
      actualizar(frac, dt) {
        const pulso = 0.6 + 0.4 * Math.sin(frac * duracion * 14);
        mAnillo.opacity = 0.5 + 0.5 * pulso; mRelleno.opacity = 0.06 + 0.2 * frac;
        crece.scale.setScalar(1 + (1 - frac) * 0.9);
      },
      fin() { quitar(g); mAnillo.dispose(); mRelleno.dispose(); },
    };
    efimeros.push(e);
    return e;
  }

  /** Sombra difusa bajo un proyectil en parábola. */
  function sombra(tam) {
    if (!habilitado()) return null;
    const m = new THREE.Mesh(geoDisco(), memo(mats, 'sombra', () => new THREE.MeshBasicMaterial({ map: texBrillo(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
    m.scale.setScalar(tam); m.position.y = 0.045; m.renderOrder = 2; anadir(m);
    return { obj: m, quitar() { quitar(m); } };
  }

  /** Estela del tajo de un arma cuerpo a cuerpo. */
  function tajo(x, z, rot, alcance, arcoRad, color = 0xffffff) {
    if (!habilitado()) return;
    const clave = 'tajo_' + Math.round(arcoRad * 20);
    const geo = memo(geos, clave, () => { const g = new THREE.RingGeometry(0.5, 1, 32, 1, -Math.PI / 2 - arcoRad / 2, arcoRad); g.rotateX(-Math.PI / 2); return g; });
    const mat = new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, blending: AD });
    const m = new THREE.Mesh(geo, mat); m.rotation.y = rot; m.position.set(x, 0.95, z); m.scale.setScalar(alcance * 0.9);
    anadir(m);
    efimeros.push({
      obj: m, t: 0, dur: 0.2,
      actualizar(frac) { mat.opacity = 0.85 * (1 - frac) * (1 - frac); m.scale.setScalar(alcance * (0.75 + 0.3 * frac)); },
      fin() { quitar(m); mat.dispose(); },
    });
  }

  function actualizar(dt) {
    for (let i = efimeros.length - 1; i >= 0; i--) {
      const e = efimeros[i];
      e.t += dt;
      const f = Math.min(1, e.t / e.dur);
      e.actualizar?.(f, dt);
      if (f >= 1) { e.fin?.(); efimeros.splice(i, 1); }
    }
  }
  function limpiar() { for (const e of efimeros) e.fin?.(); efimeros.length = 0; }

  return { habilitado, proyectil, disco, aviso, sombra, tajo, actualizar, limpiar, sprite, matBrillo, escena };
}
