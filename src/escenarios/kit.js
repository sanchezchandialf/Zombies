// ERA Z · Kit de construcción de escenarios. Documentación completa: docs/ESCENARIOS.md
//
//   export function construir(juego, kit) { …; return { grupo: kit.grupo, limites, inicioJugadores, puntosAparicion }; }
//
// El gestor (index.js) crea un kit por mapa y lo limpia al cambiar de mapa: todo lo que se crea con el kit
// (cuerpos de física, luces, materiales propios, geometrías) se libera solo.
import * as THREE from 'three';
import { materiales, uvMundo } from '../render/materiales/index.js';
import { CAPA } from '../nucleo/fisica.js';
import { crearRng } from '../nucleo/util.js';
import { cajaRedondeada, cilindro, torno, extruir, disco, matriz, crearLote, tejadoDosAguas, tejadoCuatroAguas } from './lib/geometria.js';
import { construirSuelo, construirZona, anadirParche, construirParches, crearRuido } from './lib/suelo.js';
import { construirEdificio, ESTILOS } from './lib/edificio.js';
import { construirValla, construirPoste, construirCatenaria, construirFarola, construirEscalera, construirBloque, construirRoca, construirArbol, segmentos } from './lib/estructuras.js';

export { crearRuido };

export function crearKit(juego, eraIdx = 0) {
  const fisica = juego.fisica;
  const grupo = new THREE.Group();
  grupo.name = 'escenario';
  const rngMapa = crearRng((juego.opciones.semillaMapa ?? 20240) + eraIdx * 101);

  const kit = {
    THREE, juego, eraIdx, grupo, ESTILOS,
    /** Material PBR compartido (materiales.obtener). */
    mat: (n, o) => materiales.obtener(n, o),
    materiales, uvMundo,
    cajaRedondeada, cilindro, torno, extruir, disco, matriz, tejadoDosAguas, tejadoCuatroAguas, segmentos,
    rng: (semilla = 1) => crearRng(semilla),
    rngMapa,
    ruido: (semilla = 1) => crearRuido(semilla),
    altura: () => 0,
    sueloInfo: null,
    _propios: [], _luces: [], _cuerpos: [], _edificios: [], _lotes: [], _parches: new Map(), _matParche: new Map(), _cache: new Map(),
    cerrado: false,
  };

  // ───────────── carga de materiales ─────────────
  /** Genera los materiales dando respiro al hilo: `await kit.precargar(['adoquin','hierba',…])` al empezar `construir`. */
  kit.precargar = (lista) => materiales.precargar([...new Set(lista)]);

  // ───────────── lotes ─────────────
  kit.lote0 = crearLote();
  kit._lotes.push({ lote: kit.lote0, nombre: 'estatico' });
  /** Lote adicional (una malla por material). Se construye y añade al grupo al cerrar el mapa, salvo que llames a `.construir()` tú. */
  kit.lote = (nombre = 'lote') => { const l = crearLote(); kit._lotes.push({ lote: l, nombre }); return l; };
  kit.anadir = (obj) => { grupo.add(obj); return obj; };

  // ───────────── colisión ─────────────
  const reg = (c, o = {}, material = 'piedra') => {
    c.datos = { decorado: true, material: o.material ?? material, nombre: o.nombre ?? '' };
    c.material = c.datos.material;
    kit._cuerpos.push(c);
    return c;
  };
  /** Caja estática: centro (x,z), `largo` a lo largo de X local, `ancho` a lo largo de Z local, giro `rot`. */
  kit.muro = (x, z, largo, ancho, rot = 0, o = {}) => reg(fisica.cajaEstatica(x, z, largo / 2, ancho / 2, rot, {
    bloqueaBalas: o.bloqueaBalas ?? true, bloqueaVision: o.bloqueaVision ?? (o.bloqueaBalas ?? true), mascara: o.mascara,
  }), o);
  /** Caja estática por semiejes (hx, hz). */
  kit.caja = (x, z, hx, hz, rot = 0, o = {}) => kit.muro(x, z, hx * 2, hz * 2, rot, o);
  /** Muro entre dos puntos con un grosor. */
  kit.muroEntre = (a, b, grosor = 0.4, o = {}) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    return kit.muro((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, L, grosor, Math.atan2(-dz, dx), o);
  };
  /** Círculo estático (árboles, postes, columnas). */
  kit.pilar = (x, z, radio = 0.4, o = {}) => reg(fisica.circuloEstatico(x, z, radio, { bloqueaBalas: o.bloqueaBalas ?? true, bloqueaVision: o.bloqueaVision ?? (o.bloqueaBalas ?? true) }), o);
  /** Valla baja: detiene a zombis y jugadores pero NO a las balas ni a la vista. `largo` a lo largo de X local. */
  kit.vallaBaja = (x, z, largo, rot = 0, o = {}) => reg(fisica.cajaEstatica(x, z, largo / 2, (o.ancho ?? 0.25) / 2, rot, { bloqueaBalas: false, bloqueaVision: false }), o, 'madera');
  /**
   * Colisión a partir de una malla o grupo ya colocado: { modo: 'caja' (por defecto, una caja orientada) | 'cajas' (una por malla)
   * | 'circulo', margen: -0.05 (encoge/agranda), bloqueaBalas }. También acepta { geometria, x, z, rot, esc } para una BufferGeometry suelta.
   */
  kit.colisionDesdeMalla = (obj, o = {}) => {
    const m = o.margen ?? 0;
    if (obj.isBufferGeometry) {
      obj.computeBoundingBox();
      const b = obj.boundingBox, c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()), e = o.esc ?? 1;
      const cs = Math.cos(o.rot ?? 0), sn = Math.sin(o.rot ?? 0);
      return [kit.muro((o.x ?? 0) + (c.x * cs + c.z * sn) * e, (o.z ?? 0) + (-c.x * sn + c.z * cs) * e, s.x * e + 2 * m, s.z * e + 2 * m, o.rot ?? 0, o)];
    }
    obj.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), esc = new THREE.Vector3();
    obj.matrixWorld.decompose(pos, q, esc);
    const rot = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
    const cuerpos = [];
    const cajaLocal = (mesh) => {
      const g = mesh.geometry; if (!g) return null;
      if (!g.boundingBox) g.computeBoundingBox();
      const rel = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld), b = new THREE.Box3(), v = new THREE.Vector3();
      const bb = g.boundingBox;
      for (let i = 0; i < 8; i++) { v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(rel); b.expandByPoint(v); }
      return b;
    };
    const aMundo = (b) => {
      const c = b.getCenter(new THREE.Vector3()).applyMatrix4(obj.matrixWorld), s = b.getSize(new THREE.Vector3());
      return { x: c.x, z: c.z, sx: s.x * Math.abs(esc.x), sz: s.z * Math.abs(esc.z) };
    };
    if ((o.modo ?? 'caja') === 'cajas') {
      obj.traverse((h) => { if (h.isMesh) { const b = cajaLocal(h); if (b) { const w = new THREE.Box3(); const mw = new THREE.Matrix4().multiplyMatrices(inv, h.matrixWorld); void mw; const r = aMundo(b); cuerpos.push(kit.muro(r.x, r.z, r.sx + 2 * m, r.sz + 2 * m, rot, o)); } } });
      return cuerpos;
    }
    const U = new THREE.Box3();
    obj.traverse((h) => { if (h.isMesh) { const b = cajaLocal(h); if (b) U.union(b); } });
    if (U.isEmpty()) return [];
    const r = aMundo(U);
    if (o.modo === 'circulo') return [kit.pilar(r.x, r.z, Math.max(r.sx, r.sz) / 2 + m, o)];
    return [kit.muro(r.x, r.z, r.sx + 2 * m, r.sz + 2 * m, rot, o)];
  };
  /** ¿Hay sitio libre de estáticos en (x,z) para un círculo de radio r? */
  kit.libre = (x, z, r = 0.5) => fisica.libre(x, z, r, CAPA.ESTATICO);

  // ───────────── luces ─────────────
  /** Luz puntual local (render.luzPuntual, en candelas: farol ≈ 16–40, foco ≈ 60–120). Máx. ~10 por mapa. */
  kit.luz = (o = {}) => {
    const l = juego.render?.luzPuntual?.(o) ?? null;
    if (l) kit._luces.push(l);
    return l;
  };

  // ───────────── materiales propios ─────────────
  const propio = (clave, fabrica) => {
    let m = kit._cache.get(clave);
    if (!m) { m = fabrica(); kit._cache.set(clave, m); kit._propios.push(m); }
    return m;
  };
  /** Material emisivo (farolas, neones, cristales encendidos). Cacheado por color e intensidad. */
  kit.emisivo = (color = 0xffc070, intensidad = 2.4) => propio(`emi|${color}|${intensidad}`, () => {
    const m = new THREE.MeshStandardMaterial({ color: 0x151515, emissive: new THREE.Color(color), emissiveIntensity: intensidad, roughness: 0.4, metalness: 0 });
    m.name = 'emisivo'; return m;
  });
  /** Cristal de ventana: encendido (emisivo cálido) o apagado (oscuro y reflectante). */
  kit.vidrio = (encendido = false, color = 0xffbf6b) => propio(`vid|${encendido}|${color}`, () => {
    const m = encendido
      ? new THREE.MeshStandardMaterial({ color: 0x1b1409, emissive: new THREE.Color(color), emissiveIntensity: 1.7, roughness: 0.35, metalness: 0 })
      : new THREE.MeshStandardMaterial({ color: 0x0d171f, roughness: 0.08, metalness: 0.85, envMapIntensity: 1.5 });
    m.name = 'vidrio'; return m;
  });

  // ───────────── instancias y dispersión ─────────────
  /**
   * InstancedMesh con transformación y color por instancia.
   * lista: [{ x, y=0, z, rot=0, rotX, rotZ, esc=1 | [sx,sy,sz], color }]
   */
  kit.instancias = (geo, material, lista, o = {}) => {
    let g = geo;
    if (!g.attributes.uv) g = uvMundo(g.clone(), materiales.info(material.name) ? material.name : 2);
    const mesh = new THREE.InstancedMesh(g, material, lista.length);
    const c = new THREE.Color();
    lista.forEach((it, i) => {
      mesh.setMatrixAt(i, matriz(it.x, it.y ?? 0, it.z, it.rot ?? 0, it.rotX ?? 0, it.rotZ ?? 0, it.esc ?? 1));
      if (it.color != null) { c.set(it.color); mesh.setColorAt(i, c); }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = o.sombras ?? true; mesh.receiveShadow = true; mesh.name = o.nombre ?? 'instancias';
    mesh.frustumCulled = false;
    if (o.anadir !== false) grupo.add(mesh);
    return mesh;
  };

  /**
   * Reparte puntos al azar y devuelve la lista [{x,z,rot,esc,u}] (y llama a fn(p,i) por cada uno).
   * area: { x0,z0,x1,z1 } | { x,z,r } | { poligono:[[x,z],…] } | [ {…}, {…} ]
   * evitar: [{x,z,r}] | [{x,z,hx,hz,rot}] | [{rect:[x0,z0,x1,z1]}]; distMin: separación entre puntos; libre: radio libre de estáticos (0 = no comprueba).
   */
  kit.dispersar = (o = {}) => {
    const rng = crearRng((o.semilla ?? 1) * 7 + 3);
    const areas = Array.isArray(o.area) ? o.area : [o.area];
    const evitar = o.evitar ?? [];
    const out = [];
    const dentro = (a, x, z) => !a.poligono || puntoEnPoligono(a.poligono, x, z);
    const tomar = (a) => {
      if (a.r != null) { const t = rng() * 6.283, r = Math.sqrt(rng()) * a.r; return [a.x + Math.cos(t) * r, a.z + Math.sin(t) * r]; }
      if (a.poligono) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of a.poligono) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return [rng.rango(x0, x1), rng.rango(z0, z1)]; }
      return [rng.rango(a.x0, a.x1), rng.rango(a.z0, a.z1)];
    };
    const choca = (x, z) => {
      for (const e of evitar) {
        if (e.rect) { const m = e.margen ?? 0; if (x > e.rect[0] - m && x < e.rect[2] + m && z > e.rect[1] - m && z < e.rect[3] + m) return true; }
        else if (e.hx != null) {
          const cs = Math.cos(e.rot ?? 0), sn = Math.sin(e.rot ?? 0), dx = x - e.x, dz = z - e.z, m = e.margen ?? 0;
          const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
          if (Math.abs(lx) < e.hx + m && Math.abs(lz) < e.hz + m) return true;
        } else if (Math.hypot(x - e.x, z - e.z) < (e.r ?? 1)) return true;
      }
      return false;
    };
    const intentos = (o.cantidad ?? 10) * (o.intentos ?? 40);
    for (let n = 0; n < intentos && out.length < (o.cantidad ?? 10); n++) {
      const a = areas[Math.floor(rng() * areas.length)];
      const [x, z] = tomar(a);
      if (!dentro(a, x, z) || choca(x, z)) continue;
      if (o.distMin && out.some((p) => Math.hypot(p.x - x, p.z - z) < o.distMin)) continue;
      if ((o.libre ?? 0.5) > 0 && !kit.libre(x, z, o.libre ?? 0.5)) continue;
      out.push({ x, z, rot: rng() * 6.283, esc: rng.rango(o.escMin ?? 0.85, o.escMax ?? 1.2), u: rng() });
    }
    if (o.fn) out.forEach((p, i) => o.fn(p, i, rng));
    return out;
  };

  // ───────────── suelo y parches ─────────────
  /**
   * Suelo de todo el mapa (llámalo primero). { tam=160, material, mezcla (2.º material), pintura(p) (callback para pintar la máscara),
   * relieve:{amp,escala,centroPlano} | fn(x,z), mojado, desgaste, umbral, contraste }.
   * Con `mezcla`, `pintura` recibe un objeto Pintura: p.fondo(0) · p.circulo(x,z,r,v,suave) · p.rect(x0,z0,x1,z1,v,suave)
   * · p.poligono(pts,v,suave) · p.camino(pts,ancho,v,suave) · p.salpicar(x0,z0,x1,z1,n,rMin,rMax,v) · p.romper(escala,amp). v: 0 = material, 1 = mezcla.
   */
  kit.suelo = (o) => construirSuelo(kit, o);
  /** Zona elevada con material propio y borde opcional: { poligono | rect:[x0,z0,x1,z1] | circulo:{x,z,r}, material, alto=0.025, borde:{material,ancho,alto} }. */
  kit.zona = (o) => construirZona(kit, o);
  /** Parche en el suelo sin z-fighting: { tipo:'charco'|'mancha'|'hojas', x, z, radio, rot, alargado, color, opacidad, cantidad (hojas), capa }. */
  kit.parche = (o) => anadirParche(kit, o);
  /** Reparte parches con dispersar: { tipo, area, cantidad, radio:[min,max], evitar, … }. */
  kit.parches = (o) => {
    const [r0, r1] = o.radio ?? [0.8, 2];
    const pts = kit.dispersar({ ...o, libre: o.libre ?? 0, escMin: 1, escMax: 1 });
    pts.forEach((p, i) => anadirParche(kit, { tipo: o.tipo, x: p.x, z: p.z, radio: r0 + (r1 - r0) * p.u, rot: p.rot, alargado: o.alargado ?? 1 + (p.esc - 1), color: o.color, opacidad: o.opacidad, cantidad: o.cantidad2, radio2: o.radio2, capa: o.capa ?? i % 3, semilla: (o.semilla ?? 1) + i }));
    return pts;
  };

  // ───────────── arquitectura y mobiliario ─────────────
  /** Edificio paramétrico (ver docs/ESCENARIOS.md). Devuelve { puertas, ventanas, techoY, cuerpo, aMundo, … }. */
  kit.edificio = (o) => construirEdificio(kit, o);
  kit.valla = (o) => construirValla(kit, o);
  kit.poste = (o) => construirPoste(kit, o);
  kit.catenaria = (o) => construirCatenaria(kit, o);
  kit.farola = (o) => construirFarola(kit, o);
  kit.escalera = (o) => construirEscalera(kit, o);
  kit.bloque = (o) => construirBloque(kit, o);
  kit.roca = (o) => construirRoca(kit, o);
  kit.arbol = (o) => construirArbol(kit, o);

  // ───────────── cierre, depuración y limpieza ─────────────
  kit.depurarColision = () => {
    const pos = [], col = [];
    const y = 0.25;
    const lin = (x1, z1, x2, z2, c) => { pos.push(x1, y, z1, x2, y, z2); col.push(...c, ...c); };
    for (const c of fisica.estaticos) {
      const co = c._invisible ? [0.3, 0.5, 1] : c.bloqueaBalas ? [1, 0.2, 0.2] : [1, 0.85, 0.15];
      if (c.forma === 'circulo') {
        const n = 20; for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832; lin(c.x + Math.cos(a) * c.radio, c.z + Math.sin(a) * c.radio, c.x + Math.cos(b) * c.radio, c.z + Math.sin(b) * c.radio, co); }
      } else {
        const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
        const P = [[-c.hx, -c.hz], [c.hx, -c.hz], [c.hx, c.hz], [-c.hx, c.hz]].map(([lx, lz]) => [c.x + lx * cs + lz * sn, c.z - lx * sn + lz * cs]);
        for (let i = 0; i < 4; i++) lin(P[i][0], P[i][1], P[(i + 1) % 4][0], P[(i + 1) % 4][1], co);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
    m.renderOrder = 999; m.name = 'depuracion_colision'; m.frustumCulled = false;
    grupo.add(m);
    kit._propios.push(m.material);
  };

  /** Lo llama el gestor al terminar `construir`: funde los lotes, los parches y activa la depuración. */
  kit.cerrar = () => {
    if (kit.cerrado) return;
    kit.cerrado = true;
    for (const { lote, nombre } of kit._lotes) if (lote.piezas > 0) grupo.add(lote.construir({ nombre }));
    if (kit._parches.size) grupo.add(construirParches(kit));
    if (juego.opciones.depurar === 'colision' || juego.opciones.depurar === true) kit.depurarColision();
  };

  /** Libera luces, materiales propios y geometrías. El gestor la llama al destruir el mapa. */
  kit.limpiar = () => {
    for (const l of kit._luces) l.quitar?.();
    kit._luces.length = 0;
    grupo.traverse((h) => { if (h.geometry) h.geometry.dispose?.(); if (h.isInstancedMesh) h.dispose?.(); });
    for (const p of kit._propios) p.dispose?.();
    kit._propios.length = 0; kit._cache.clear(); kit._matParche.clear(); kit._cuerpos.length = 0; kit._edificios.length = 0;
    grupo.removeFromParent();
  };

  return kit;
}

function puntoEnPoligono(poli, x, z) {
  let d = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, zi] = poli[i], [xj, zj] = poli[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}
