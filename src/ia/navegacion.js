// Navegación de la horda: rejilla de holgura + campos de flujo multiobjetivo.
//
// · Rejilla (1 m por defecto) sobre `fisica.limites`. Para cada celda se guarda la HOLGURA: distancia exacta del
//   centro al obstáculo duro más cercano (cuerpos estáticos) y también la de los puntos medios de sus aristas, de
//   modo que un muro fino nunca se «salta» entre dos celdas vecinas.
// · Cinco CAPAS por tamaño (radio 0,42 · 0,6 · 0,95 · 1,3 · 1,8): los zombis grandes y los jefes necesitan pasillos más anchos.
// · Las estructuras destructibles (barricadas, torretas, cajas) son obstáculos BLANDOS: se pueden atravesar con un
//   coste alto, así la horda las rodea si el rodeo es corto y, si no, va de frente y las rompe.
// · Campo de flujo por «marcha rápida» (ecuación eikonal): distancias casi euclídeas y direcciones en cualquier
//   ángulo, sin los quiebros a 45° de un Dijkstra de 8 vecinos. Se calcula POR PARTES (presupuesto de celdas por
//   cuadro) en un búfer de trabajo y se intercambia al terminar; cada campo se refresca cada ~0,25 s.
// · Varios campos con nombre («jugadores», «senuelos»…), creados bajo demanda y descartados si nadie los consulta.
import { CAPA } from '../nucleo/fisica.js';

export const RADIOS_CAPA = [0.42, 0.6, 0.95, 1.3, 1.8];
const HOLGURA_MAX = 2.6;
const INF = 1e9;
const B_XP = 1, B_XN = 2, B_ZP = 4, B_ZN = 8, B_PASO = 16;
const COSTE_PARED = 1.6;      // sobrecoste máximo junto a un muro (prefiere el centro de la calle)
const MARGEN_PARED = 1.2;     // m a partir de los cuales el muro deja de penalizar
const COSTE_BLANDO = 7;       // sobrecoste por celda ocupada por una estructura destructible
const PERIODO = 0.25;         // s entre refrescos de un mismo campo
const CADUCIDAD = 3;          // s sin consultas tras los que un campo se descarta

class Monticulo {
  constructor(cap) { this.k = new Float32Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  meter(clave, valor) {
    if (this.n >= this.k.length) {
      const k = new Float32Array(this.k.length * 2), v = new Int32Array(this.k.length * 2);
      k.set(this.k); v.set(this.v); this.k = k; this.v = v;
    }
    const k = this.k, v = this.v;
    let i = this.n++;
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= clave) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = clave; v[i] = valor;
  }
  sacar() {
    const k = this.k, v = this.v, res = v[0], n = --this.n;
    if (n > 0) {
      const ck = k[n], cv = v[n];
      let i = 0;
      for (;;) {
        let h = 2 * i + 1;
        if (h >= n) break;
        if (h + 1 < n && k[h + 1] < k[h]) h++;
        if (k[h] >= ck) break;
        k[i] = k[h]; v[i] = v[h]; i = h;
      }
      k[i] = ck; v[i] = cv;
    }
    return res;
  }
}

/**
 * @param {object} juego
 * @param {{celda?: number, presupuesto?: number}} [opciones]
 */
export function crearNavegacion(juego, opciones = {}) {
  const fisica = juego.fisica;
  const celda = opciones.celda ?? 1;
  let presupuesto = opciones.presupuesto ?? 1500;   // celdas resueltas por cuadro

  let minX = -45, minZ = -45, maxX = 45, maxZ = 45, nx = 0, nz = 0, W = 0, H = 0, N = 0;
  let holg = null, holgX = null, holgZ = null, blando = null;
  const blandos = [];                                   // cuerpos de los obstáculos blandos (índice+1 en `blando`)
  const capas = RADIOS_CAPA.map((radio) => ({ radio, paso: null, coste: null }));
  const campos = new Map();
  const objetivos = new Map();
  let version = 0, sucio = true, sucioSuave = false, firma = -1, tFirma = 0, ahora = 0, tConstr = -1e9, enCurso = null, turno = 0;
  let listaCampos = null;                               // caché de campos.values() (se invalida al crear/descartar)

  // ───────────── Rejilla ─────────────

  function clasificar(c) {
    if (!c.activo || c.sensor) return 0;
    if (!(c.mascara & CAPA.ZOMBI)) return 0;
    if (c.capa & (CAPA.ZOMBI | CAPA.JUGADOR)) return 0;
    const d = c.datos;
    const daniable = !!d && typeof d.recibirDanio === 'function' && d.vivo !== false && d.bando !== 'zombis';
    if (c.estatico) return daniable ? 2 : 1;
    if (c.capa & CAPA.ESTRUCTURA) return daniable ? 2 : 0;
    return 0;
  }

  function calcularFirma() {
    let s = 0;
    const e = fisica.estaticos, d = fisica.dinamicos;
    for (let i = 0; i < e.length; i++) s = (s + e[i].id * 31 + 7) | 0;
    for (let i = 0; i < d.length; i++) if (d[i].capa & CAPA.ESTRUCTURA) s = (s + d[i].id * 17 + 3) | 0;
    const l = fisica.limites;
    if (l) s = (s + l.minX * 3 + l.maxX * 5 + l.minZ * 7 + l.maxZ * 11) | 0;
    return s;
  }

  function distCuerpo(c, x, z) {
    const dx = x - c.x, dz = z - c.z;
    if (c.forma === 'circulo') { const d = Math.hypot(dx, dz) - c.radio; return d > 0 ? d : 0; }
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    const qx = Math.abs(dx * cs - dz * sn) - c.hx, qz = Math.abs(dx * sn + dz * cs) - c.hz;
    const ax = qx > 0 ? qx : 0, az = qz > 0 ? qz : 0;
    return Math.sqrt(ax * ax + az * az);
  }

  function rasterizar(c, margen, fn) {
    let ex, ez;
    if (c.forma === 'circulo') { ex = ez = c.radio; }
    else {
      const cs = Math.abs(Math.cos(c.rot)), sn = Math.abs(Math.sin(c.rot));
      ex = c.hx * cs + c.hz * sn; ez = c.hx * sn + c.hz * cs;
    }
    let i0 = Math.floor((c.x - ex - margen - minX) / celda), i1 = Math.floor((c.x + ex + margen - minX) / celda) + 2;
    let j0 = Math.floor((c.z - ez - margen - minZ) / celda), j1 = Math.floor((c.z + ez + margen - minZ) / celda) + 2;
    if (i0 < 1) i0 = 1; if (j0 < 1) j0 = 1; if (i1 > nx) i1 = nx; if (j1 > nz) j1 = nz;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(c, j * W + i, minX + (i - 0.5) * celda, minZ + (j - 0.5) * celda);
  }

  const pintarDuro = (c, k, x, z) => {
    let d = distCuerpo(c, x, z); if (d < holg[k]) holg[k] = d;
    d = distCuerpo(c, x + celda * 0.5, z); if (d < holgX[k]) holgX[k] = d;
    d = distCuerpo(c, x, z + celda * 0.5); if (d < holgZ[k]) holgZ[k] = d;
  };
  let _idxBlando = 0;
  const pintarBlando = (c, k, x, z) => { if (distCuerpo(c, x, z) < 0.55) blando[k] = _idxBlando; };

  function construirRejilla() {
    const l = fisica.limites;
    const a = l ? l.minX : -45, b = l ? l.maxX : 45, c0 = l ? l.minZ : -45, d0 = l ? l.maxZ : 45;
    const nnx = Math.max(1, Math.ceil((b - a) / celda - 1e-6)), nnz = Math.max(1, Math.ceil((d0 - c0) / celda - 1e-6));
    if (nnx !== nx || nnz !== nz || !holg) {
      nx = nnx; nz = nnz; W = nx + 2; H = nz + 2; N = W * H;
      holg = new Float32Array(N); holgX = new Float32Array(N); holgZ = new Float32Array(N); blando = new Uint16Array(N);
      for (const L of capas) { L.paso = new Uint8Array(N); L.coste = new Float32Array(N); }
      campos.clear(); listaCampos = null; enCurso = null;
    }
    minX = a; maxX = b; minZ = c0; maxZ = d0;
    // holgura inicial: distancia al borde del mapa (el borde se comporta como un muro)
    holg.fill(0); holgX.fill(0); holgZ.fill(0); blando.fill(0);
    for (let j = 1; j <= nz; j++) for (let i = 1; i <= nx; i++) {
      const k = j * W + i, x = minX + (i - 0.5) * celda, z = minZ + (j - 0.5) * celda;
      const bx = Math.min(x - minX, maxX - x), bz = Math.min(z - minZ, maxZ - z);
      holg[k] = Math.min(HOLGURA_MAX, bx, bz);
      holgX[k] = i < nx ? Math.min(HOLGURA_MAX, bx - celda * 0.5 + (x - minX < maxX - x ? celda : 0), bz) : 0;
      holgZ[k] = j < nz ? Math.min(HOLGURA_MAX, bx, bz - celda * 0.5 + (z - minZ < maxZ - z ? celda : 0)) : 0;
    }
    blandos.length = 0;
    const pasar = (lista) => {
      for (let n = 0; n < lista.length; n++) {
        const c = lista[n], tipo = clasificar(c);
        if (tipo === 1) rasterizar(c, HOLGURA_MAX, pintarDuro);
        else if (tipo === 2 && blandos.length < 65000) { blandos.push(c); _idxBlando = blandos.length; rasterizar(c, 0.6, pintarBlando); }
      }
    };
    pasar(fisica.estaticos); pasar(fisica.dinamicos);
    for (const L of capas) construirCapa(L);
    version++; sucio = false; sucioSuave = false; tConstr = ahora; firma = calcularFirma();
  }

  function construirCapa(L) {
    const r = L.radio - 0.005, rArista = L.radio * 0.82, paso = L.paso, coste = L.coste;
    paso.fill(0);
    for (let j = 1; j <= nz; j++) for (let i = 1; i <= nx; i++) { const k = j * W + i; if (holg[k] >= r) paso[k] = B_PASO; }
    for (let j = 1; j <= nz; j++) for (let i = 1; i <= nx; i++) {
      const k = j * W + i;
      if (!(paso[k] & B_PASO)) { coste[k] = INF; continue; }
      let m = B_PASO;
      if ((paso[k + 1] & B_PASO) && holgX[k] >= rArista) m |= B_XP;
      if ((paso[k - 1] & B_PASO) && holgX[k - 1] >= rArista) m |= B_XN;
      if ((paso[k + W] & B_PASO) && holgZ[k] >= rArista) m |= B_ZP;
      if ((paso[k - W] & B_PASO) && holgZ[k - W] >= rArista) m |= B_ZN;
      paso[k] = m;
      const u = 1 - Math.min(1, (holg[k] - r) / MARGEN_PARED);
      coste[k] = 1 + COSTE_PARED * u * u + (blando[k] ? COSTE_BLANDO : 0);
    }
  }

  function asegurar() { if (sucio || !holg) construirRejilla(); }

  // ───────────── Campos de flujo ─────────────

  function crearCampo(nombre, capa) {
    return {
      nombre, capa, clave: nombre + ':' + capa,
      T: new Float32Array(N).fill(INF), dirX: new Float32Array(N), dirZ: new Float32Array(N),
      Tt: new Float32Array(N), dxT: new Float32Array(N), dzT: new Float32Array(N), est: new Uint8Array(N),
      monticulo: new Monticulo(N * 2 + 64),
      valido: false, activo: false, version: -1, tFin: -1e9, tUso: ahora, firmaSemillas: NaN, semillas: 0,
    };
  }

  function firmaDe(lista) {
    let s = lista.length * 977;
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      s += Math.round(o.x * 2) * 131 + Math.round(o.z * 2) * 337 + (o.sesgo ? Math.round(o.sesgo * 8) * 53 : 0);
    }
    return s;
  }

  function celdaLibreCercana(L, x, z, radioMax) {
    const gx = (x - minX) / celda + 0.5, gz = (z - minZ) / celda + 0.5;
    const bi = Math.max(1, Math.min(nx, Math.round(gx))), bj = Math.max(1, Math.min(nz, Math.round(gz)));
    let mejor = -1, md = Infinity;
    for (let r = 0; r <= radioMax; r++) {
      for (let j = bj - r; j <= bj + r; j++) {
        if (j < 1 || j > nz) continue;
        for (let i = bi - r; i <= bi + r; i++) {
          if (i < 1 || i > nx) continue;
          if (Math.max(Math.abs(i - bi), Math.abs(j - bj)) !== r) continue;
          const k = j * W + i;
          if (!(L.paso[k] & B_PASO)) continue;
          const d = (i - gx) * (i - gx) + (j - gz) * (j - gz);
          if (d < md) { md = d; mejor = k; }
        }
      }
      if (mejor >= 0 && r >= 1) break;
      if (mejor >= 0 && md < 0.3) break;
    }
    return mejor;
  }

  function iniciarCampo(c) {
    const L = capas[c.capa], lista = objetivos.get(c.nombre) || [];
    c.Tt.fill(INF); c.est.fill(0); c.monticulo.n = 0; c.semillas = 0;
    for (let n = 0; n < lista.length; n++) {
      const o = lista[n], sesgo = o.sesgo || 0;
      const gx = (o.x - minX) / celda + 0.5, gz = (o.z - minZ) / celda + 0.5;
      const i0 = Math.floor(gx), j0 = Math.floor(gz);
      let puestas = 0;
      for (let dj = 0; dj <= 1; dj++) for (let di = 0; di <= 1; di++) {
        const i = i0 + di, j = j0 + dj;
        if (i < 1 || i > nx || j < 1 || j > nz) continue;
        const k = j * W + i;
        if (!(L.paso[k] & B_PASO)) continue;
        const t = Math.hypot(i - gx, j - gz) * celda + sesgo;
        if (t < c.Tt[k]) { c.Tt[k] = t; c.monticulo.meter(t, k); }
        puestas++;
      }
      if (!puestas) {
        // objetivo dentro de un obstáculo o en un paso demasiado estrecho para esta capa: se llega hasta lo más cerca posible
        const k = celdaLibreCercana(L, o.x, o.z, 10);
        if (k >= 0) {
          const i = k % W, j = (k - i) / W, t = Math.hypot(i - gx, j - gz) * celda + sesgo;
          if (t < c.Tt[k]) { c.Tt[k] = t; c.monticulo.meter(t, k); }
          puestas++;
        }
      }
      c.semillas += puestas;
    }
    c.activo = true; c.firmaTrabajo = firmaDe(lista); c.versionTrabajo = version;
  }

  function relajar(c, L, k) {
    const m = L.paso[k], T = c.Tt, est = c.est;
    let a = INF, b = INF, t;
    if ((m & B_XP) && est[k + 1] === 2 && T[k + 1] < a) a = T[k + 1];
    if ((m & B_XN) && est[k - 1] === 2 && T[k - 1] < a) a = T[k - 1];
    if ((m & B_ZP) && est[k + W] === 2 && T[k + W] < b) b = T[k + W];
    if ((m & B_ZN) && est[k - W] === 2 && T[k - W] < b) b = T[k - W];
    if (a > b) { t = a; a = b; b = t; }
    const co = L.coste[k] * celda, dif = b - a;
    t = dif >= co ? a + co : 0.5 * (a + b + Math.sqrt(2 * co * co - dif * dif));
    if (t < T[k]) { T[k] = t; c.monticulo.meter(t, k); }
  }

  /** Avanza la marcha rápida como mucho `max` celdas. Devuelve las resueltas. */
  function avanzarCampo(c, max) {
    const L = capas[c.capa], paso = L.paso, est = c.est, mon = c.monticulo;
    let hechas = 0;
    while (mon.n > 0 && hechas < max) {
      const k = mon.sacar();
      if (est[k] === 2) continue;
      est[k] = 2; hechas++;
      const m = paso[k];
      if ((m & B_XP) && est[k + 1] !== 2) relajar(c, L, k + 1);
      if ((m & B_XN) && est[k - 1] !== 2) relajar(c, L, k - 1);
      if ((m & B_ZP) && est[k + W] !== 2) relajar(c, L, k + W);
      if ((m & B_ZN) && est[k - W] !== 2) relajar(c, L, k - W);
    }
    if (mon.n === 0) terminarCampo(c);
    return hechas;
  }

  function terminarCampo(c) {
    const L = capas[c.capa], paso = L.paso, T = c.Tt, dx = c.dxT, dz = c.dzT;
    for (let j = 1; j <= nz; j++) {
      for (let k = j * W + 1, fin = j * W + nx; k <= fin; k++) {
        const m = paso[k], t = T[k];
        if (!(m & B_PASO) || t >= INF) { dx[k] = 0; dz[k] = 0; continue; }
        let gx = 0, gz = 0;
        const l = m & B_XN ? T[k - 1] : INF, r = m & B_XP ? T[k + 1] : INF;
        if (l < r) { if (l < t) gx = l - t; } else if (r < t) gx = t - r;
        const u = m & B_ZN ? T[k - W] : INF, d = m & B_ZP ? T[k + W] : INF;
        if (u < d) { if (u < t) gz = u - t; } else if (d < t) gz = t - d;
        const len = Math.sqrt(gx * gx + gz * gz);
        if (len > 1e-6) { dx[k] = gx / len; dz[k] = gz / len; } else { dx[k] = 0; dz[k] = 0; }
      }
    }
    let tmp = c.T; c.T = c.Tt; c.Tt = tmp;
    tmp = c.dirX; c.dirX = c.dxT; c.dxT = tmp;
    tmp = c.dirZ; c.dirZ = c.dzT; c.dzT = tmp;
    c.activo = false; c.valido = true; c.tFin = ahora; c.version = c.versionTrabajo; c.firmaSemillas = c.firmaTrabajo;
    if (enCurso === c) enCurso = null;
  }

  function calcularYa(c) { iniciarCampo(c); while (c.activo) avanzarCampo(c, 1e9); }

  function campo(nombre, capa) {
    const clave = nombre + ':' + capa;
    let c = campos.get(clave);
    if (!c) { c = crearCampo(nombre, capa); campos.set(clave, c); listaCampos = null; }
    c.tUso = ahora;
    if (!c.valido) { if (enCurso === c) enCurso = null; calcularYa(c); }   // la primera vez, de una sola pasada
    return c;
  }

  // ───────────── Consultas ─────────────

  const _base = { k: 0, gx: 0, gz: 0, bi: 0, bj: 0 };
  function celdaBase(x, z) {
    const gx = (x - minX) / celda + 0.5, gz = (z - minZ) / celda + 0.5;
    let bi = Math.round(gx), bj = Math.round(gz);
    if (bi < 1) bi = 1; else if (bi > nx) bi = nx;
    if (bj < 1) bj = 1; else if (bj > nz) bj = nz;
    _base.gx = gx; _base.gz = gz; _base.bi = bi; _base.bj = bj; _base.k = bj * W + bi;
    return _base;
  }

  function escapar(c, L, x, z, out) {
    // celda bloqueada o aislada: hacia la celda transitable y alcanzable más cercana
    const b = celdaBase(x, z), T = c ? c.T : null;
    let mejor = -1, md = Infinity;
    for (let r = 1; r <= 5 && mejor < 0; r++) {
      for (let j = b.bj - r; j <= b.bj + r; j++) {
        if (j < 1 || j > nz) continue;
        for (let i = b.bi - r; i <= b.bi + r; i++) {
          if (i < 1 || i > nx) continue;
          const k = j * W + i;
          if (!(L.paso[k] & B_PASO) || (T && T[k] >= INF)) continue;
          const d = (i - b.gx) * (i - b.gx) + (j - b.gz) * (j - b.gz);
          if (d < md) { md = d; mejor = k; }
        }
      }
    }
    if (mejor < 0) { out.x = 0; out.z = 0; out.d = INF; return out; }
    const i = mejor % W, j = (mejor - i) / W;
    const dx = i - b.gx, dz = j - b.gz, len = Math.hypot(dx, dz) || 1;
    out.x = dx / len; out.z = dz / len; out.d = (T ? T[mejor] : 0) + len * celda;
    return out;
  }

  const api = {
    celda, RADIOS_CAPA,
    get ancho() { return W; }, get alto() { return H; }, get version() { return version; },

    /** Marca la rejilla como obsoleta; se rehace en la siguiente consulta o cuadro. */
    reconstruir() { sucio = true; },
    /** Como `reconstruir` pero agrupado (como mucho cada ~0,2 s): para estructuras que aparecen y se rompen sin parar. */
    reconstruirSuave() { sucioSuave = true; },

    /** Fija los puntos de destino de un campo: [{ x, z, sesgo? }]. */
    objetivos(nombre, lista) { objetivos.set(nombre, lista); },

    /** Capa de navegación adecuada para un radio de cuerpo. */
    capaDeRadio(r) {
      for (let i = 0; i < RADIOS_CAPA.length; i++) if (RADIOS_CAPA[i] >= r - 0.04) return i;
      return RADIOS_CAPA.length - 1;
    },

    /**
     * Dirección unitaria del campo de flujo en (x, z), interpolada entre celdas. (0,0) si ya se está en el destino.
     * `out.d` = distancia de camino restante (m) o ≥ 1e9 si no hay camino.
     */
    direccion(x, z, out, capa = 0, nombre = 'jugadores') {
      asegurar();
      const c = campo(nombre, capa), L = capas[capa], paso = L.paso, T = c.T;
      const b = celdaBase(x, z), k = b.k, m = paso[k];
      if (!(m & B_PASO) || T[k] >= INF) return escapar(c, L, x, z, out);
      const fx = b.gx - b.bi, fz = b.gz - b.bj;
      const sx = fx >= 0 ? 1 : -1, sz = fz >= 0 ? W : -W;
      const ax = fx >= 0 ? fx : -fx, az = fz >= 0 ? fz : -fz;
      const bitX = fx >= 0 ? B_XP : B_XN, bitZ = fz >= 0 ? B_ZP : B_ZN;
      let w = (1 - ax) * (1 - az);
      let dx = c.dirX[k] * w, dz = c.dirZ[k] * w;
      const okX = (m & bitX) && T[k + sx] < INF, okZ = (m & bitZ) && T[k + sz] < INF;
      if (okX) { w = ax * (1 - az); dx += c.dirX[k + sx] * w; dz += c.dirZ[k + sx] * w; }
      if (okZ) { w = (1 - ax) * az; dx += c.dirX[k + sz] * w; dz += c.dirZ[k + sz] * w; }
      if (okX && okZ && (paso[k + sx] & bitZ) && (paso[k + sz] & bitX) && T[k + sx + sz] < INF) {
        w = ax * az; dx += c.dirX[k + sx + sz] * w; dz += c.dirZ[k + sx + sz] * w;
      }
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 1e-4) { out.x = dx / len; out.z = dz / len; } else { out.x = 0; out.z = 0; }
      out.d = T[k];
      return out;
    },

    /** Distancia de camino (m) hasta el objetivo más cercano del campo. */
    distancia(x, z, capa = 0, nombre = 'jugadores') {
      asegurar();
      const c = campo(nombre, capa);
      return c.T[celdaBase(x, z).k];
    },

    /** Holgura (m hasta el obstáculo duro más cercano) interpolada. */
    holgura(x, z) {
      asegurar();
      const gx = (x - minX) / celda + 0.5, gz = (z - minZ) / celda + 0.5;
      let i = Math.floor(gx), j = Math.floor(gz);
      if (i < 0) i = 0; else if (i > nx) i = nx;
      if (j < 0) j = 0; else if (j > nz) j = nz;
      let tx = gx - i, tz = gz - j;
      if (tx < 0) tx = 0; else if (tx > 1) tx = 1;
      if (tz < 0) tz = 0; else if (tz > 1) tz = 1;
      const k = j * W + i;
      return (holg[k] * (1 - tx) + holg[k + 1] * tx) * (1 - tz) + (holg[k + W] * (1 - tx) + holg[k + W + 1] * tx) * tz;
    },

    /** Empuje que aleja de los muros: vector de módulo 0..1 (0 si hay sitio de sobra). */
    repulsion(x, z, radio, out) {
      const b = celdaBase(x, z), k = b.k, h0 = holg[k], margen = 0.6;
      out.x = 0; out.z = 0;
      if (h0 > radio + margen + celda * 0.75) return out;
      const h = api.holgura(x, z), f = (radio + margen - h) / margen;
      if (f <= 0) return out;
      let gx = holg[k + 1] - holg[k - 1], gz = holg[k + W] - holg[k - W];
      const len = Math.sqrt(gx * gx + gz * gz);
      if (len < 1e-4) return out;
      const fu = f > 1 ? 1 : f;
      out.x = gx / len * fu; out.z = gz / len * fu;
      return out;
    },

    /** ¿Puede un cuerpo de ese radio ir en línea recta entre los dos puntos (sin muros ni estructuras)? */
    lineaTransitable(x1, z1, x2, z2, radio = 0.42) {
      asegurar();
      const dx = x2 - x1, dz = z2 - z1, d = Math.sqrt(dx * dx + dz * dz);
      const pasos = Math.max(1, Math.ceil(d / (celda * 0.5))), r = radio - 0.06;
      for (let n = 0; n <= pasos; n++) {
        const t = n / pasos, x = x1 + dx * t, z = z1 + dz * t;
        if (api.holgura(x, z) < r) return false;
        if (blando[celdaBase(x, z).k]) return false;
      }
      return true;
    },

    /** Distancia libre en línea recta desde (x,z) en la dirección dada, hasta `max` (para cargas). */
    distanciaLibre(x, z, dx, dz, max, radio = 0.42, ignorarBlandos = true) {
      asegurar();
      const paso = celda * 0.5, r = radio - 0.1;
      for (let d = paso; d <= max; d += paso) {
        const px = x + dx * d, pz = z + dz * d;
        if (px < minX || px > maxX || pz < minZ || pz > maxZ) return d - paso;
        if (api.holgura(px, pz) < r) return d - paso;
        if (!ignorarBlandos && blando[celdaBase(px, pz).k]) return d - paso;
      }
      return max;
    },

    transitable(x, z, capa = 0) { asegurar(); return !!(capas[capa].paso[celdaBase(x, z).k] & B_PASO); },

    /** Punto transitable más cercano a (x, z) para la capa. */
    puntoLibre(x, z, capa = 0, out = { x: 0, z: 0 }) {
      asegurar();
      const L = capas[capa];
      if (x > minX && x < maxX && z > minZ && z < maxZ && api.holgura(x, z) >= L.radio) { out.x = x; out.z = z; return out; }
      const k = celdaLibreCercana(L, x, z, 12);
      if (k < 0) { out.x = Math.max(minX + 1, Math.min(maxX - 1, x)); out.z = Math.max(minZ + 1, Math.min(maxZ - 1, z)); return out; }
      const i = k % W, j = (k - i) / W;
      out.x = minX + (i - 0.5) * celda; out.z = minZ + (j - 0.5) * celda;
      return out;
    },

    /** Entidad destructible (estructura, caja…) que ocupa la celda de (x, z), o null. */
    blandoEn(x, z) {
      asegurar();
      const n = blando[celdaBase(x, z).k];
      if (!n) return null;
      const c = blandos[n - 1];
      return c && c.activo ? c.datos : null;
    },

    /** Avanza el cálculo escalonado de los campos. */
    actualizar(dt) {
      ahora += dt;
      tFirma -= dt;
      if (tFirma <= 0) { tFirma = 0.4; if (!sucio && calcularFirma() !== firma) sucioSuave = true; }
      if (sucioSuave && ahora - tConstr >= 0.2) sucio = true;
      asegurar();
      let quedan = presupuesto;
      for (let vueltas = 0; vueltas < 4 && quedan > 0; vueltas++) {
        if (!enCurso) {
          // elige el siguiente campo que toca refrescar (por turnos)
          const lista = listaCampos || (listaCampos = [...campos.values()]);
          for (let n = 0; n < lista.length; n++) {
            const c = lista[(turno + n) % lista.length];
            if (ahora - c.tUso > CADUCIDAD) { campos.delete(c.clave); listaCampos = null; if (enCurso === c) enCurso = null; break; }
            if (ahora - c.tFin < PERIODO && c.version === version) continue;
            const obj = objetivos.get(c.nombre) || [];
            if (c.version === version && firmaDe(obj) === c.firmaSemillas) { c.tFin = ahora; continue; }   // nada ha cambiado
            enCurso = c; turno = (turno + n + 1) % lista.length;
            iniciarCampo(c);
            break;
          }
          if (!enCurso) break;
        }
        quedan -= avanzarCampo(enCurso, quedan) + 1;
      }
    },

    /** Calcula ahora mismo, de una pasada, todos los campos en uso (pruebas, carga de mapa). */
    forzar() {
      asegurar();
      if (enCurso) enCurso = null;
      for (const c of campos.values()) calcularYa(c);
    },

    establecerPresupuesto(n) { presupuesto = n; },

    /** Datos crudos para depuración visual. */
    depurar(nombre = 'jugadores', capa = 0) {
      asegurar();
      const c = campo(nombre, capa);
      return { W, H, nx, nz, minX, minZ, celda, holgura: holg, paso: capas[capa].paso, coste: capas[capa].coste, blando, T: c.T, dirX: c.dirX, dirZ: c.dirZ, INF };
    },

    limpiar() { campos.clear(); listaCampos = null; enCurso = null; objetivos.clear(); sucio = true; },
  };
  return api;
}
