// ERA Z · Gestor de escenarios. Contrato: docs/ARQUITECTURA.md §Escenarios · Guía para autores: docs/ESCENARIOS.md
//
//   escenarios.cargar(eraIdx) → Promise<mapa>
//   escenarios.actual            { id, eraIdx, grupo, limites, inicioJugadores, puntosAparicion, zonas?, validacion, kit }
//   escenarios.puntoAparicion(lejosDe?, distMin = 18) → { x, z, tipo }
//   escenarios.actualizar(dt)    delega en mapa.actualizar
// Cada mapa vive en src/escenarios/<ERAS[i].escenario>.js y exporta construir(juego, kit) (puede ser async).
import * as THREE from 'three';
import { ERAS } from '../datos/eras.js';
import { CAPA } from '../nucleo/fisica.js';
import { crearKit } from './kit.js';

// Carga perezosa de los mapas (un trozo por mapa). Los módulos auxiliares (index, kit) no son mapas.
const MODULOS = import.meta.glob('./*.js');
const RESERVA = 'campo_pruebas';
const LIMITES_POR_DEFECTO = { minX: -45, maxX: 45, minZ: -45, maxZ: 45 };

/** Rejilla de ocupación sobre los límites: true = bloqueado para un círculo de radio r (solo estáticos). */
function rejillaLibre(juego, lim, r, celda = 1) {
  const W = Math.ceil((lim.maxX - lim.minX) / celda), H = Math.ceil((lim.maxZ - lim.minZ) / celda);
  const libre = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = lim.minX + (i + 0.5) * celda, z = lim.minZ + (j + 0.5) * celda;
    libre[j * W + i] = juego.fisica.libre(x, z, r, CAPA.ESTATICO) ? 1 : 0;
  }
  return { W, H, libre, celda, lim };
}

/** Inundación desde un punto; devuelve Uint8Array con 1 en lo alcanzable (8 vecinos sin cortar esquinas). */
function inundar(rej, x, z) {
  const { W, H, libre, celda, lim } = rej;
  const alcanzado = new Uint8Array(W * H);
  let ci = Math.floor((x - lim.minX) / celda), cj = Math.floor((z - lim.minZ) / celda);
  if (ci < 0 || cj < 0 || ci >= W || cj >= H) return alcanzado;
  // si el punto cae en celda bloqueada, busca la libre más cercana (radio 3)
  if (!libre[cj * W + ci]) {
    let mejor = -1, md = 1e9;
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= W || j >= H || !libre[j * W + i]) continue;
      const d = di * di + dj * dj; if (d < md) { md = d; mejor = j * W + i; }
    }
    if (mejor < 0) return alcanzado;
    ci = mejor % W; cj = Math.floor(mejor / W);
  }
  const pila = [cj * W + ci]; alcanzado[pila[0]] = 1;
  while (pila.length) {
    const k = pila.pop(), i = k % W, j = (k - i) / W;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= W || b >= H) continue;
      const n = b * W + a;
      if (alcanzado[n] || !libre[n]) continue;
      if (di && dj && (!libre[j * W + a] || !libre[b * W + i])) continue;
      alcanzado[n] = 1; pila.push(n);
    }
  }
  return alcanzado;
}
const alcanzable = (rej, al, x, z) => {
  const i = Math.floor((x - rej.lim.minX) / rej.celda), j = Math.floor((z - rej.lim.minZ) / rej.celda);
  if (i < 0 || j < 0 || i >= rej.W || j >= rej.H) return false;
  // tolera la celda vecina (los puntos de aparición pegados a un muro)
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < rej.W && b < rej.H && al[b * rej.W + a]) return true;
  }
  return false;
};

/** Validación al cargar: avisos por consola y resumen en mapa.validacion. */
function validar(juego, mapa, kit) {
  const etiqueta = `[escenarios] ${mapa.id}`;
  const v = { avisos: [], colisionadores: 0, libreAndable: 0, conectados: 0, desconectados: 0, jefeOk: 0, jefeKo: 0 };
  const aviso = (t) => { v.avisos.push(t); console.warn(`${etiqueta}: ${t}`); };
  const lim = mapa.limites;
  const estaticos = juego.fisica.estaticos.filter((c) => !c._invisible);
  v.colisionadores = estaticos.length;
  if (v.colisionadores > 420) aviso(`${v.colisionadores} colisionadores (presupuesto ≈ 400): fusiona muros contiguos o usa cajas más grandes`);
  if (!mapa.inicioJugadores?.length) aviso('sin inicioJugadores');
  if (!mapa.puntosAparicion?.length) aviso('sin puntosAparicion');
  const rej = rejillaLibre(juego, lim, 0.45), rejJefe = rejillaLibre(juego, lim, 1.8);
  v.libreAndable = rej.libre.reduce((a, b) => a + b, 0) / rej.libre.length;
  if (v.libreAndable < 0.55) aviso(`solo ${(v.libreAndable * 100).toFixed(0)} % del mapa es transitable: demasiado cargado`);
  const inicios = mapa.inicioJugadores || [];
  inicios.forEach((p, i) => { if (!juego.fisica.libre(p.x, p.z, 0.5, CAPA.ESTATICO)) aviso(`el inicio ${i} (${p.x}, ${p.z}) está dentro de un obstáculo`); });
  if (inicios.length) {
    const al = inundar(rej, inicios[0].x, inicios[0].z), alJ = inundar(rejJefe, inicios[0].x, inicios[0].z);
    inicios.forEach((p, i) => { if (i && !alcanzable(rej, al, p.x, p.z)) aviso(`el inicio ${i} no está conectado con el inicio 0`); });
    mapa.puntosAparicion?.forEach((p, i) => {
      if (!juego.fisica.libre(p.x, p.z, 0.45, CAPA.ESTATICO)) aviso(`el punto de aparición ${i} (${p.x}, ${p.z}) está dentro de un obstáculo`);
      const ok = alcanzable(rej, al, p.x, p.z);
      p.conectado = ok; p.jefeOk = alcanzable(rejJefe, alJ, p.x, p.z);
      if (ok) v.conectados++; else { v.desconectados++; aviso(`el punto de aparición ${i} (${p.x}, ${p.z}) NO está conectado con el inicio`); }
      if (p.jefeOk) v.jefeOk++; else v.jefeKo++;
    });
    if (v.jefeKo > 0 && v.jefeOk < Math.ceil((mapa.puntosAparicion?.length || 1) / 2)) aviso(`solo ${v.jefeOk} puntos de aparición son accesibles con pasillos de 3,6 m (jefes)`);
    // zonas transitables aisladas (celdas libres que no alcanza el inicio): bolsas muertas
    let libres = 0, alc = 0; for (let k = 0; k < rej.libre.length; k++) if (rej.libre[k]) { libres++; if (al[k]) alc++; }
    v.aisladas = libres - alc;
    if (libres && v.aisladas / libres > 0.04) aviso(`${(100 * v.aisladas / libres).toFixed(1)} % del suelo transitable queda aislado del inicio (bolsas cerradas)`);
  }
  if (kit?._luces.length > 10) aviso(`${kit._luces.length} luces locales (presupuesto ≤ 10)`);
  let mallas = 0; mapa.grupo.traverse((h) => { if (h.isMesh) mallas++; });
  v.mallas = mallas;
  if (mallas > 250) aviso(`${mallas} mallas (presupuesto ≈ 250 draw calls)`);
  return v;
}

export function crearEscenarios(juego) {
  let kit = null;
  let mapa = null;
  let cola = Promise.resolve();
  const reciente = [];            // índices de puntos de aparición usados hace poco
  const murosInvisibles = [];

  function destruirAnterior() {
    if (mapa) { try { mapa.destruir?.(); } catch (e) { console.error('[escenarios] destruir', e); } }
    if (kit) { try { kit.limpiar(); } catch (e) { console.error('[escenarios] kit.limpiar', e); } }
    mapa?.grupo?.removeFromParent();
    juego.fisica.limpiar();
    murosInvisibles.length = 0;
    juego.mundo?.limpiar?.();
    juego.vehiculos?.limpiar?.();
    juego.fx?.limpiar?.();
    juego.combate?.limpiar?.();
    reciente.length = 0;
    mapa = null; kit = null; api.actual = null;
  }

  function crearMurosInvisibles(lim) {
    const E = 5, a = lim.maxX - lim.minX + 2 * E, b = lim.maxZ - lim.minZ + 2 * E, cx = (lim.minX + lim.maxX) / 2, cz = (lim.minZ + lim.maxZ) / 2;
    const defs = [[cx, lim.minZ - E / 2, a / 2, E / 2], [cx, lim.maxZ + E / 2, a / 2, E / 2], [lim.minX - E / 2, cz, E / 2, b / 2], [lim.maxX + E / 2, cz, E / 2, b / 2]];
    for (const [x, z, hx, hz] of defs) {
      const c = juego.fisica.cajaEstatica(x, z, hx, hz, 0, { bloqueaBalas: false, bloqueaVision: false });
      c._invisible = true; c.datos = { decorado: true, invisible: true, material: 'piedra' };
      murosInvisibles.push(c);
    }
  }

  async function cargarModulo(id) {
    const cargador = MODULOS[`./${id}.js`];
    if (!cargador) return null;
    try { return await cargador(); } catch (e) { console.error(`[escenarios] no se pudo cargar ${id}:`, e); return null; }
  }

  async function construirMapa(eraIdx) {
    const id = ERAS[eraIdx]?.escenario ?? RESERVA;
    let mod = await cargarModulo(id), idUsado = id;
    if (!mod?.construir) {
      if (id !== RESERVA) console.warn(`[escenarios] «${id}» aún no existe: se usa ${RESERVA}`);
      mod = await cargarModulo(RESERVA); idUsado = RESERVA;
    }
    kit = crearKit(juego, eraIdx);
    let res;
    try { res = await mod.construir(juego, kit); }
    catch (e) {
      console.error(`[escenarios] error construyendo ${idUsado}:`, e);
      if (idUsado === RESERVA) throw e;
      // reinicio limpio con el mapa de reserva
      kit.limpiar(); juego.fisica.limpiar(); juego.mundo?.limpiar?.(); juego.vehiculos?.limpiar?.();
      mod = await cargarModulo(RESERVA); idUsado = RESERVA;
      kit = crearKit(juego, eraIdx);
      res = await mod.construir(juego, kit);
    }
    kit.cerrar();
    res = res || {};
    const grupo = res.grupo ?? kit.grupo;
    if (grupo !== kit.grupo) kit.grupo.add(grupo);
    const m = {
      ...res,
      id: res.id ?? idUsado, eraIdx, grupo: kit.grupo,
      limites: res.limites ?? { ...LIMITES_POR_DEFECTO },
      inicioJugadores: res.inicioJugadores ?? [{ x: 0, z: 0 }, { x: 2, z: 0 }],
      puntosAparicion: res.puntosAparicion ?? [],
      zonas: res.zonas ?? [],
      kit,
    };
    return m;
  }

  const api = {
    actual: null,
    /** Carga (y construye) el escenario de la era. Las llamadas se encolan. */
    cargar(eraIdx) {
      const tarea = cola.then(async () => {
        destruirAnterior();
        const m = await construirMapa(eraIdx);
        juego.render?.escena?.add(m.grupo);
        juego.fisica.limites = m.limites;
        crearMurosInvisibles(m.limites);
        juego.render?.establecerAmbiente?.(eraIdx, { inmediato: true });
        mapa = m; api.actual = m;
        m.validacion = validar(juego, m, kit);
        juego.zombis?.navegacion?.reconstruir?.();
        juego.eventos.emitir('escenario:cargado', { eraIdx, mapa: m });
        return m;
      });
      cola = tarea.catch(() => {});
      return tarea;
    },
    /**
     * Punto de aparición libre, alejado de `lejosDe` ≥ distMin, variado y, si es posible, fuera de la pantalla.
     * Devuelve una copia { x, z, tipo } con una pequeña dispersión.
     */
    puntoAparicion(lejosDe = [], distMin = 18) {
      const lista = (mapa?.puntosAparicion ?? []).filter((p) => p.conectado !== false);
      if (!lista.length) return { x: 0, z: -40, tipo: 'borde' };
      const rng = juego.rng;
      const pos = new THREE.Vector3();
      const enPantalla = (p) => {
        const r = juego.render?.proyectar?.(pos.set(p.x, 0.5, p.z));
        return !!r && r.visible && r.x > -80 && r.y > -80 && r.x < innerWidth + 80 && r.y < innerHeight + 80;
      };
      let cand = lista.map((p, i) => ({ p, i, d: lejosDe.length ? Math.min(...lejosDe.map((j) => Math.hypot(j.x - p.x, j.z - p.z))) : 99 }));
      let ok = cand.filter((c) => c.d >= distMin);
      if (!ok.length) { const maxD = Math.max(...cand.map((c) => c.d)); ok = cand.filter((c) => c.d >= maxD - 1); }
      const pesos = ok.map((c) => {
        let w = 1;
        w *= enPantalla(c.p) ? 0.25 : 3;
        const k = reciente.indexOf(c.i); if (k >= 0) w *= 0.15 + 0.15 * (reciente.length - k) / reciente.length;
        if (c.p.peso) w *= c.p.peso;
        return w;
      });
      let t = rng() * pesos.reduce((a, b) => a + b, 0), el = ok[ok.length - 1];
      for (let k = 0; k < ok.length; k++) { t -= pesos[k]; if (t <= 0) { el = ok[k]; break; } }
      reciente.push(el.i); if (reciente.length > Math.min(5, Math.floor(lista.length / 2))) reciente.shift();
      let x = el.p.x, z = el.p.z;
      for (let n = 0; n < 4; n++) { // pequeña dispersión si queda libre
        const jx = x + (rng() - 0.5) * 3, jz = z + (rng() - 0.5) * 3;
        if (juego.fisica.libre(jx, jz, 0.6, CAPA.ESTATICO) && jx > mapa.limites.minX && jx < mapa.limites.maxX && jz > mapa.limites.minZ && jz < mapa.limites.maxZ) { x = jx; z = jz; break; }
      }
      return { x, z, tipo: el.p.tipo ?? 'borde' };
    },
    actualizar(dt) { mapa?.actualizar?.(dt); },
    /** Añadido: muros invisibles y utilidades de depuración. */
    get kit() { return kit; },
  };
  return api;
}
