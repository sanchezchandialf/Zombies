// IA de jefes: máquina de estados con los `ataques` de cada jefe (datos/zombis.js → JEFES[id].ataques).
// Todos los ataques tienen tres etapas: AVISO (telegrafiado con marcas en el suelo, esquivable) → EJECUCIÓN → RECUPERACIÓN.
// Fases al 66 % y 33 % de vida: rugido (invulnerable ~1,4 s), invoca refuerzos y los ataques se vuelven más rápidos y numerosos.
import * as THREE from 'three';
import { CAPA } from '../nucleo/fisica.js';
import { limitar, difAngulo, TAU } from '../nucleo/util.js';

const ROJO = '#ff4a2a', NARANJA = '#ff9a1c', VERDE = '#8cff3a', CIAN = '#46e6ff', MORADO = '#c05cff', AMARILLO = '#e8dc4a';

// ───────────────────────── Ayudas de daño por área ─────────────────────────

function esDuro(e) { return !(e.bando === 'jugadores' && e.rol); }

/** Daño en círculo a jugadores, vehículos y estructuras. */
function danioCirculo(sis, z, x, zz, r, cant, o = {}) {
  sis.amigos(x, zz, r, (e) => {
    const dx = e.pos.x - x, dz = e.pos.z - zz, l = Math.hypot(dx, dz) || 1;
    sis.danar(e, {
      cantidad: cant * (o.estructuras && esDuro(e) ? o.estructuras : 1), tipo: o.tipo || 'golpe', atacante: z, x: e.pos.x, z: e.pos.z,
      dirX: dx / l, dirZ: dz / l, empuje: o.empuje ?? 6, area: !!o.area,
    });
  });
}

/** Daño en cono (apertura total `ap`) desde (x,z) hacia `rot`. */
function danioCono(sis, z, x, zz, rot, alc, ap, cant, o = {}) {
  const fx = Math.sin(rot), fz = Math.cos(rot), cosMin = Math.cos(ap / 2);
  sis.amigos(x, zz, alc, (e) => {
    const dx = e.pos.x - x, dz = e.pos.z - zz, l = Math.hypot(dx, dz) || 1;
    if ((dx * fx + dz * fz) / l < cosMin - (e.radio ?? 0.4) / l) return;
    sis.danar(e, {
      cantidad: cant * (o.estructuras && esDuro(e) ? o.estructuras : 1), tipo: o.tipo || 'golpe', atacante: z, x: e.pos.x, z: e.pos.z,
      dirX: dx / l, dirZ: dz / l, empuje: o.empuje ?? 7, area: !!o.area, continuo: !!o.continuo,
    });
  });
}

/** Daño en rectángulo (línea) desde (x,z) hacia `rot` de `largo` × `ancho`. */
function danioLinea(sis, z, x, zz, rot, largo, ancho, cant, o = {}) {
  const fx = Math.sin(rot), fz = Math.cos(rot);
  sis.amigos(x + fx * largo * 0.5, zz + fz * largo * 0.5, largo * 0.5 + ancho, (e) => {
    const dx = e.pos.x - x, dz = e.pos.z - zz, a = dx * fx + dz * fz, b = Math.abs(-dx * fz + dz * fx);
    if (a < -0.5 || a > largo + (e.radio ?? 0.4) || b > ancho * 0.5 + (e.radio ?? 0.4)) return;
    sis.danar(e, {
      cantidad: cant * (o.estructuras && esDuro(e) ? o.estructuras : 1), tipo: o.tipo || 'golpe', atacante: z, x: e.pos.x, z: e.pos.z,
      dirX: fx, dirZ: fz, empuje: o.empuje ?? 4, area: !!o.area, continuo: !!o.continuo,
    });
  });
}

/** Longitud libre de un rayo hasta el primer muro (para láseres). */
function largoLibre(sis, x, z, rot, max) {
  const h = sis.fisica.rayo(x, z, Math.sin(rot), Math.cos(rot), max, CAPA.ESTATICO, (c) => c.bloqueaVision);
  return h ? h.dist : max;
}

function puntoCerca(sis, x, z, r, capa = 0) {
  const a = sis.juego.rng() * TAU, d = Math.sqrt(sis.juego.rng()) * r;
  return sis.nav.puntoLibre(x + Math.sin(a) * d, z + Math.cos(a) * d, capa, { x: 0, z: 0 });
}

function objetivoAleatorio(sis) {
  const n = sis.nObjetivos;
  return n ? sis.objetivos[Math.floor(sis.juego.rng() * n) % n] : null;
}

// ───────────────────────── Dron (enjambre de OMEGA) ─────────────────────────

let geoDron = null, matDron = null, matLuz = null;
class Dron {
  constructor(sis, jefe, x, z) {
    const juego = sis.juego;
    this.sis = sis; this.jefe = jefe;
    this.bando = 'zombis'; this.vivo = true; this.esDron = true; this.material = 'metal';
    this.pos = new THREE.Vector3(x, 0, z); this.radio = 0.5; this.altura = 1.5;
    this.vidaMax = Math.round(40 * jefe.escVida); this.vida = this.vidaMax;
    this.t = 0; this.vx = 0; this.vz = 0; this.fase = Math.random() * 6;
    this.cuerpo = sis.fisica.crearCuerpo({ forma: 'circulo', x, z, radio: 0.5, masa: 12, capa: CAPA.ZOMBI, mascara: 0, datos: this, amortiguacion: 0 });
    const esc = juego.render?.escena;
    if (esc) {
      if (!geoDron) {
        geoDron = { cuerpo: new THREE.OctahedronGeometry(0.45, 0), anillo: new THREE.TorusGeometry(0.62, 0.05, 6, 20).rotateX(Math.PI / 2) };
        matDron = new THREE.MeshStandardMaterial({ color: 0x20262e, metalness: 0.8, roughness: 0.35 });
        matLuz = new THREE.MeshBasicMaterial({ color: 0xff3050, toneMapped: false });
      }
      this.mesh = new THREE.Group();
      this.mesh.add(new THREE.Mesh(geoDron.cuerpo, matDron), new THREE.Mesh(geoDron.anillo, matLuz));
      this.mesh.children[0].castShadow = true;
      esc.add(this.mesh);
    }
  }
  recibirDanio(info) {
    if (!this.vivo) return 0;
    const c = (info.cantidad || 0) * (info.tipo === 'energia' ? 0.5 : 1);
    this.vida -= c;
    this.sis.fxEmitir('chispas', this.pos.x, 1.4, this.pos.z, { cantidad: 4 });
    if (this.vida <= 0) this.morir(true);
    return c;
  }
  actualizar(dt) {
    if (!this.vivo) return;
    this.t += dt;
    const sis = this.sis, c = this.cuerpo;
    let mejor = null, md = 1e9;
    for (let i = 0; i < sis.nObjetivos; i++) { const o = sis.objetivos[i], d = Math.hypot(o.x - c.x, o.z - c.z); if (d < md) { md = d; mejor = o; } }
    if (mejor) {
      const dx = (mejor.x - c.x) / (md || 1), dz = (mejor.z - c.z) / (md || 1);
      const vel = Math.min(8.5, 3 + this.t * 3.5);
      const k = Math.min(1, dt * 3.5);
      this.vx += (dx * vel + Math.cos(this.t * 3 + this.fase) * 1.6 * -dz - this.vx) * k;
      this.vz += (dz * vel + Math.cos(this.t * 3 + this.fase) * 1.6 * dx - this.vz) * k;
      if (md <= 1.2 + mejor.radio) { this.morir(false); return; }
    }
    c.vx = this.vx; c.vz = this.vz;
    if (this.t > 14) this.morir(false);
  }
  posFisica() {
    if (!this.vivo) return;
    this.pos.x = this.cuerpo.x; this.pos.z = this.cuerpo.z;
    if (this.mesh) { this.mesh.position.set(this.pos.x, 1.5 + Math.sin(this.t * 4 + this.fase) * 0.12, this.pos.z); this.mesh.rotation.y += 0.2; }
  }
  /** `abatido`: lo han destruido (explosión pequeña); si no, detona contra el objetivo. */
  morir(abatido) {
    if (!this.vivo) return;
    this.vivo = false;
    const sis = this.sis;
    sis.explotar(this.pos.x, this.pos.z, abatido ? 1.6 : 2.6, (abatido ? 8 : 24) * this.jefe.escDanio, { tipo: 'energia', atacante: this.jefe, fx: 'electrico', empuje: 3 });
    this.liberar();
  }
  liberar() {
    this.vivo = false;
    this.sis.fisica.eliminarCuerpo(this.cuerpo);
    this.mesh?.removeFromParent(); this.mesh = null;
    const l = this.sis.drones, i = l.indexOf(this);
    if (i >= 0) l.splice(i, 1);
  }
}

// ───────────────────────── Ataques ─────────────────────────
// Cada ataque: { dur:[aviso, ejec, rec], rango:[min,max]|null, cd, peso, puede?(j), ini(j,A), aviso?(j,A,dt,p), lanza?(j,A), ejec?(j,A,dt,p), fin?(j,A) }
// j = IA del jefe; j.z = zombi jefe; j.sis = sistema; A.* = datos propios del ataque en curso.

const ATAQUES = {
  // ── Embestida lineal (Coracero, Fogonero, OMEGA) ──
  carga: {
    dur: [1.0, 2.2, 0.9], rango: [6, 24], cd: 9, peso: 1.4,
    puede: (j) => j.hayCarrera(),
    ini(j, A) {
      A.dx = j.ap.dx; A.dz = j.ap.dz; A.max = Math.min(32, j.ap.d + 12); A.golpeados = []; A.dist = 0; A.t2 = 0; A.estr = 0;
      A.tel = j.sis.tel.linea(j.z.pos.x, j.z.pos.z, Math.atan2(A.dx, A.dz), A.max, j.z.radio * 2.2, A.dur[0], { color: ROJO });
      j.z.visual.accion('cargar', { duracion: A.dur[0], dirX: A.dx, dirZ: A.dz }); j.z.visual.estado('cargando', true);
    },
    aviso(j, A, dt, p) {
      if (p < 0.65 && j.z.rec) { const d = j.z.dObj || 1; A.dx = (j.z.rec.x - j.z.pos.x) / d; A.dz = (j.z.rec.z - j.z.pos.z) / d; }
      j.mirar(A.dx, A.dz);
      if (A.tel) { A.tel.rot = Math.atan2(A.dx, A.dz); A.tel.x = j.z.pos.x; A.tel.z = j.z.pos.z; }
    },
    ejec(j, A, dt) {
      const z = j.z;
      A.t2 += dt;
      const vel = Math.min(12.5, A.t2 * 24) * (A.frenado ? 0.4 : 1);
      z.fVx = A.dx * vel; z.fVz = A.dz * vel; z.tForzado = 0.06; j.mirar(A.dx, A.dz);
      A.dist += vel * dt;
      if (j.sis.ahora - z.muroTocado < 0.07 && A.t2 > 0.4 && (z.muroNx * A.dx + z.muroNz * A.dz) > 0.3) {
        // choque con un muro: queda expuesto
        z.visual.accion('aturdir', { duracion: 1.6 }); j.sis.juego.render?.sacudir?.(0.6, 0.5);
        j.sis.fxEmitir('polvo', z.pos.x + A.dx * z.radio, 0.8, z.pos.z + A.dz * z.radio, { escala: 2.5 });
        j.expuestoHasta = j.sis.ahora + 2.4; A.t = A.dur[1]; j.recExtra = 1.4;
      } else if (A.dist >= A.max) A.t = A.dur[1];
    },
    fin(j, A) { j.z.tForzado = 0; j.z.visual.estado('cargando', false); },
    contacto(j, A, d) {
      if (A.golpeados.includes(d) && !(d.cuerpo?.capa & CAPA.ESTRUCTURA)) return;
      const z = j.z, sis = j.sis;
      if (d.bando === 'zombis') return;
      if (d.cuerpo?.capa & (CAPA.ESTRUCTURA | CAPA.PROP | CAPA.ESTATICO)) {
        if (sis.ahora - A.estr < 0.2) return; A.estr = sis.ahora;
        sis.danar(d, { cantidad: z.danio * 4 * 2, tipo: 'golpe', atacante: z, x: d.pos.x, z: d.pos.z, dirX: A.dx, dirZ: A.dz, empuje: 5 });
        if (d.vivo !== false) A.frenado = true;
        return;
      }
      A.golpeados.push(d);
      sis.danar(d, { cantidad: z.danio * 1.8, tipo: 'golpe', atacante: z, x: d.pos.x, z: d.pos.z, dirX: A.dx, dirZ: A.dz, empuje: 12 });
    },
  },

  // ── Tajo en cono ──
  tajo_amplio: {
    dur: [0.85, 0.12, 0.7], rango: [0, 5.5], cd: 3.5, peso: 2.2,
    ini(j, A) {
      A.rot = Math.atan2(j.ap.dx, j.ap.dz); A.alc = j.z.radio + 4.3;
      A.tel = j.sis.tel.cono(j.z.pos.x, j.z.pos.z, A.rot, A.alc, 1.9, A.dur[0], { color: ROJO });
      j.z.visual.accion('atacar', { duracion: A.dur[0] + 0.3, dirX: j.ap.dx, dirZ: j.ap.dz });
    },
    aviso(j, A, dt, p) {
      if (p < 0.6 && j.z.rec) A.rot = Math.atan2(j.z.rec.x - j.z.pos.x, j.z.rec.z - j.z.pos.z);
      j.mirar(Math.sin(A.rot), Math.cos(A.rot));
      if (A.tel) { A.tel.rot = A.rot; A.tel.x = j.z.pos.x; A.tel.z = j.z.pos.z; }
    },
    lanza(j, A) {
      const z = j.z;
      danioCono(j.sis, z, z.pos.x, z.pos.z, A.rot, A.alc, 1.9, z.danio * 1.3, { estructuras: 3, empuje: 8 });
      j.sis.fxEmitir('onda', z.pos.x + Math.sin(A.rot) * 2, 0.8, z.pos.z + Math.cos(A.rot) * 2, { escala: 1.2 });
      j.sis.juego.render?.sacudir?.(0.3, 0.25);
    },
  },

  // ── Invocar refuerzos ──
  invocar: {
    dur: [1.3, 0.4, 0.6], rango: null, cd: 20, peso: 0.9,
    puede: (j) => j.minionsVivos() < 12,
    ini(j, A) {
      A.tel = j.sis.tel.disco(j.z.pos.x, j.z.pos.z, 4.5, A.dur[0], { color: MORADO });
      j.z.visual.accion('gritar', { duracion: A.dur[0] + 0.4 });
    },
    lanza(j) { j.invocar(4 + j.fase * 2); },
  },

  // ── Lluvia de carbón ardiendo (Fogonero) ──
  lluvia_carbon: {
    dur: [0.9, 3.4, 0.7], rango: null, cd: 10, peso: 1.6,
    ini(j, A) {
      A.marcas = []; A.n = 7 + j.fase * 3;
      j.z.visual.accion('lanzar', { duracion: 1.2 });
      for (let i = 0; i < A.n; i++) {
        const o = i < sisN(j) ? j.sis.objetivos[i] : objetivoAleatorio(j.sis);
        if (!o) break;
        const spread = i < sisN(j) ? 1.2 : 6.5;
        const p = puntoCerca(j.sis, o.x + (i < sisN(j) ? 0 : 0), o.z, spread);
        const retardo = 0.3 + i * (2.4 / A.n);
        A.marcas.push({ x: p.x, z: p.z, t: retardo + 1.25, hecho: false, tel: j.sis.tel.disco(p.x, p.z, 2.5, 1.25, { color: NARANJA, retardo }) });
      }
    },
    ejec(j, A) {
      for (const m of A.marcas) if (!m.hecho && A.t >= m.t - A.dur[0]) {
        m.hecho = true;
        j.sis.explotar(m.x, m.z, 2.5, 30 * j.z.escDanio, { tipo: 'fuego', atacante: j.z, fx: 'explosion', empuje: 4, danioEstructuras: 2, quemadura: { duracion: 2, dps: 5 } });
        j.sis.zona({ x: m.x, z: m.z, radio: 1.9, duracion: 3.5, tipo: 'fuego', dps: 10 * j.z.escDanio, atacante: j.z, afecta: 'jugadores' });
      }
    },
    fin(j, A) { for (const m of A.marcas) { m.tel?.quitar(); } },
  },

  // ── Chorro de vapor en barrido ──
  chorro_vapor: {
    dur: [1.0, 2.6, 0.8], rango: [0, 10], cd: 8, peso: 1.6,
    ini(j, A) {
      A.rot0 = Math.atan2(j.ap.dx, j.ap.dz); A.barr = 0.62 + j.fase * 0.1; A.alc = 9.5;
      A.dir = j.z.lado;
      A.tel = j.sis.tel.cono(j.z.pos.x, j.z.pos.z, A.rot0 - A.dir * A.barr, A.alc, 0.9, A.dur[0], { color: '#e8f0f4' });
      j.z.visual.accion('escupir', { duracion: A.dur[0] + A.dur[1] });
    },
    aviso(j, A) { j.mirar(Math.sin(A.rot0 - A.dir * A.barr), Math.cos(A.rot0 - A.dir * A.barr)); if (A.tel) { A.tel.x = j.z.pos.x; A.tel.z = j.z.pos.z; } },
    lanza(j, A) {
      A.emisor = j.sis.juego.fx?.crearEmisor?.('vapor', { x: j.z.pos.x, y: 1.5, z: j.z.pos.z }, { escala: 2.2 }) ?? null;
      A.tick = 0; A.telB = j.sis.tel.cono(j.z.pos.x, j.z.pos.z, A.rot0, A.alc, 0.9, A.dur[1], { color: '#e8f0f4', sigue: (t) => { t.x = j.z.pos.x; t.z = j.z.pos.z; t.rot = A.rotAct; } });
    },
    ejec(j, A, dt, p) {
      const z = j.z;
      A.rotAct = A.rot0 - A.dir * A.barr + A.dir * A.barr * 2 * limitar(p, 0, 1);
      j.mirar(Math.sin(A.rotAct), Math.cos(A.rotAct));
      if (A.emisor) { A.emisor.pos.x = z.pos.x + Math.sin(A.rotAct) * 2; A.emisor.pos.z = z.pos.z + Math.cos(A.rotAct) * 2; }
      A.tick -= dt;
      if (A.tick <= 0) {
        A.tick = 0.2;
        danioCono(j.sis, z, z.pos.x, z.pos.z, A.rotAct, A.alc, 0.9, z.danio * 0.28, { tipo: 'fuego', area: true, continuo: false, empuje: 1.5, estructuras: 1.5 });
        j.sis.fxEmitir('vapor', z.pos.x + Math.sin(A.rotAct) * 3, 1.2, z.pos.z + Math.cos(A.rotAct) * 3, { dirX: Math.sin(A.rotAct), dirZ: Math.cos(A.rotAct), escala: 1.6 });
      }
    },
    fin(j, A) { A.emisor?.detener?.(); A.telB?.quitar(); },
  },

  // ── Bombardeo de mortero (Mariscal) ──
  mortero: {
    dur: [0.9, 3.2, 0.8], rango: null, cd: 11, peso: 1.7,
    ini(j, A) { A.n = 6 + j.fase * 2; A.k = 0; A.sig = 0; j.z.visual.accion('lanzar', { duracion: 1 }); A.silbido = false; },
    ejec(j, A, dt) {
      A.sig -= dt;
      if (A.sig <= 0 && A.k < A.n) {
        A.sig = 0.42 - j.fase * 0.04; A.k++;
        const o = A.k % 2 ? j.sis.objetivos[(A.k >> 1) % Math.max(1, j.sis.nObjetivos)] || objetivoAleatorio(j.sis) : objetivoAleatorio(j.sis);
        if (!o) return;
        const p = puntoCerca(j.sis, o.x, o.z, A.k % 2 ? 2.2 : 7);
        const z = j.z;
        j.sis.parabola({
          x: z.pos.x, z: z.pos.z, y: 3.2, tx: p.x, tz: p.z, tiempo: 1.55, atacante: z, danio: 0, tipo: 'explosivo', radio: 0, efecto: 'fuego',
          radioAviso: 3.4, colorAviso: ROJO,
          alImpactar: (px, pz) => j.sis.explotar(px, pz, 3.4, 36 * z.escDanio, { tipo: 'explosivo', atacante: z, empuje: 6, danioEstructuras: 1.5 }),
        });
      }
    },
  },

  // ── Nube de gas ──
  nube_gas: {
    dur: [0.9, 1.6, 0.8], rango: null, cd: 12, peso: 1.3,
    ini(j, A) { A.n = 1 + (j.fase >= 1 ? 1 : 0) + (j.fase >= 2 ? 1 : 0); A.lanzado = false; j.z.visual.accion('lanzar', { duracion: 1 }); },
    lanza(j, A) {
      const z = j.z;
      for (let i = 0; i < A.n; i++) {
        const o = j.sis.objetivos[i % Math.max(1, j.sis.nObjetivos)] || objetivoAleatorio(j.sis);
        if (!o) break;
        const p = i === 0 ? { x: o.x, z: o.z } : puntoCerca(j.sis, o.x, o.z, 8);
        j.sis.parabola({
          x: z.pos.x, z: z.pos.z, y: 3, tx: p.x, tz: p.z, tiempo: 1.3, atacante: z, danio: 0, tipo: 'veneno', radio: 0, efecto: 'gas',
          radioAviso: 4.8, colorAviso: AMARILLO,
          alImpactar: (px, pz) => j.sis.crearNube(px, pz, 4.8, 8, 11 * z.escDanio, z),
        });
      }
    },
  },

  // ── Derrape con rastro de fuego (Rey del Asfalto) ──
  derrape: {
    dur: [0.95, 1.2, 1.0], rango: [6, 22], cd: 7, peso: 1.6,
    puede: (j) => j.hayCarrera(),
    ini(j, A) {
      A.dx = j.ap.dx; A.dz = j.ap.dz; A.max = Math.min(24, j.ap.d + 8); A.dist = 0; A.golpeados = []; A.sig = 0; A.t2 = 0;
      A.tel = j.sis.tel.linea(j.z.pos.x, j.z.pos.z, Math.atan2(A.dx, A.dz), A.max, j.z.radio * 2.2, A.dur[0], { color: NARANJA });
      j.z.visual.accion('cargar', { duracion: A.dur[0], dirX: A.dx, dirZ: A.dz }); j.z.visual.estado('cargando', true);
    },
    aviso(j, A, dt, p) {
      if (p < 0.6 && j.z.rec) { const d = j.z.dObj || 1; A.dx = (j.z.rec.x - j.z.pos.x) / d; A.dz = (j.z.rec.z - j.z.pos.z) / d; }
      j.mirar(A.dx, A.dz);
      if (A.tel) { A.tel.rot = Math.atan2(A.dx, A.dz); A.tel.x = j.z.pos.x; A.tel.z = j.z.pos.z; }
    },
    ejec(j, A, dt) {
      const z = j.z; A.t2 += dt;
      const vel = Math.min(18, A.t2 * 40) * (A.dist > A.max * 0.8 ? 0.55 : 1);
      z.fVx = A.dx * vel; z.fVz = A.dz * vel; z.tForzado = 0.06; j.mirar(A.dx, A.dz);
      A.dist += vel * dt; A.sig -= vel * dt;
      if (A.sig <= 0) {
        A.sig = 1.8;
        j.sis.zona({ x: z.pos.x - A.dx * 1.2, z: z.pos.z - A.dz * 1.2, radio: 1.3, duracion: 3.2, tipo: 'fuego', dps: 11 * z.escDanio, atacante: z, afecta: 'jugadores' });
        j.sis.fxEmitir('fuego', z.pos.x - A.dx * 1.2, 0.2, z.pos.z - A.dz * 1.2, { escala: 1.2 });
      }
      if (j.sis.ahora - z.muroTocado < 0.07 && A.t2 > 0.3 || A.dist >= A.max) A.t = A.dur[1];
    },
    fin(j) { j.z.tForzado = 0; j.z.visual.estado('cargando', false); },
    contacto(j, A, d) { ATAQUES.carga.contacto(j, A, d); },
  },

  // ── Círculo de fuego alrededor del objetivo ──
  rastro_fuego: {
    dur: [0.8, 2.4, 0.7], rango: null, cd: 13, peso: 1.1,
    ini(j, A) {
      const o = j.sis.jugadorMasCercano(j.z.pos.x, j.z.pos.z);
      A.cx = o ? o.x : j.z.pos.x; A.cz = o ? o.z : j.z.pos.z; A.R = 8; A.sig = 0; A.ang = Math.atan2(j.z.pos.x - A.cx, j.z.pos.z - A.cz);
      A.tel = j.sis.tel.disco(A.cx, A.cz, A.R + 1, A.dur[0], { color: NARANJA });
      j.z.visual.accion('gritar', { duracion: A.dur[0] });
    },
    ejec(j, A, dt) {
      const z = j.z, w = 9.5 / A.R;
      A.ang += w * dt * z.lado;
      const tx = A.cx + Math.sin(A.ang) * A.R, tz = A.cz + Math.cos(A.ang) * A.R;
      const dx = tx - z.pos.x, dz = tz - z.pos.z, l = Math.hypot(dx, dz) || 1, v = Math.min(11, l * 6 + 4);
      z.fVx = dx / l * v; z.fVz = dz / l * v; z.tForzado = 0.06; j.mirar(dx, dz);
      A.sig -= v * dt;
      if (A.sig <= 0) {
        A.sig = 2.0;
        const px = z.pos.x, pz = z.pos.z;
        j.sis.tel.disco(px, pz, 1.5, 0.55, { color: NARANJA });
        A.pend = A.pend || [];
        A.pend.push({ t: 0.55, x: px, z: pz });
      }
      if (A.pend) for (let i = A.pend.length - 1; i >= 0; i--) {
        const f = A.pend[i]; f.t -= dt;
        if (f.t <= 0) { A.pend.splice(i, 1); j.sis.zona({ x: f.x, z: f.z, radio: 1.5, duracion: 4, tipo: 'fuego', dps: 11 * z.escDanio, atacante: z, afecta: 'jugadores' }); j.sis.fxEmitir('fuego', f.x, 0.2, f.z, { escala: 1.3 }); }
      }
    },
    fin(j) { j.z.tForzado = 0; },
  },

  // ── Latigazo de cadena ──
  latigazo_cadena: {
    dur: [0.8, 0.12, 0.55], rango: [2.5, 11], cd: 5, peso: 2,
    ini(j, A) {
      A.rot = Math.atan2(j.ap.dx, j.ap.dz); A.largo = 10.5; A.n = 1 + (j.fase >= 1 ? 1 : 0); A.k = 0;
      A.tel = j.sis.tel.linea(j.z.pos.x, j.z.pos.z, A.rot, A.largo, 1.6, A.dur[0], { color: ROJO });
      j.z.visual.accion('atacar', { duracion: 1.1, dirX: j.ap.dx, dirZ: j.ap.dz });
    },
    aviso(j, A, dt, p) {
      if (p < 0.6 && j.z.rec) A.rot = Math.atan2(j.z.rec.x - j.z.pos.x, j.z.rec.z - j.z.pos.z);
      j.mirar(Math.sin(A.rot), Math.cos(A.rot));
      if (A.tel) { A.tel.rot = A.rot; A.tel.x = j.z.pos.x; A.tel.z = j.z.pos.z; }
    },
    lanza(j, A) { azotar(j, A); },
    fin(j, A) {
      if (A.k < A.n) {
        // segundo latigazo con el rumbo desviado
        A.rot += 0.55 * j.z.lado;
        A.tel = j.sis.tel.linea(j.z.pos.x, j.z.pos.z, A.rot, A.largo, 1.6, 0.5, { color: ROJO });
        A.seg = 0.5;
      }
    },
    rec(j, A, dt) {
      if (A.seg > 0) { A.seg -= dt; if (A.seg <= 0) azotar(j, A); }
    },
  },

  // ── Tentáculos (Paciente Cero) ──
  tentaculos: {
    dur: [1.1, 0.5, 0.8], rango: null, cd: 9, peso: 1.8,
    ini(j, A) {
      A.pts = []; const n = 5 + j.fase * 2;
      for (let i = 0; i < n; i++) {
        const o = i < j.sis.nObjetivos ? j.sis.objetivos[i] : objetivoAleatorio(j.sis);
        if (!o) break;
        const p = i < j.sis.nObjetivos ? { x: o.x, z: o.z } : puntoCerca(j.sis, o.x, o.z, 6);
        A.pts.push({ x: p.x, z: p.z, tel: j.sis.tel.disco(p.x, p.z, 1.7, A.dur[0], { color: MORADO }) });
      }
      j.z.visual.accion('gritar', { duracion: 1.3 });
    },
    lanza(j, A) {
      const z = j.z;
      for (const p of A.pts) {
        danioCirculo(j.sis, z, p.x, p.z, 1.7, z.danio * 0.9, { empuje: 8, estructuras: 2 });
        j.sis.fxEmitir('sangre_grande', p.x, 0.5, p.z, { escala: 1.2 });
        j.sis.juego.fx?.calco?.('sangre', p.x, p.z, 3);
      }
      j.sis.juego.render?.sacudir?.(0.35, 0.3);
    },
  },

  // ── Esporas (Paciente Cero) ──
  esporas: {
    dur: [0.8, 1.2, 0.8], rango: null, cd: 11, peso: 1.3,
    ini(j, A) { j.z.visual.accion('escupir', { duracion: 1 }); A.n = 6 + j.fase * 2; },
    lanza(j, A) {
      const z = j.z;
      for (let i = 0; i < A.n; i++) {
        const o = i < j.sis.nObjetivos ? j.sis.objetivos[i] : objetivoAleatorio(j.sis);
        if (!o) break;
        const p = puntoCerca(j.sis, o.x, o.z, i < j.sis.nObjetivos ? 2 : 9);
        j.sis.parabola({
          x: z.pos.x, z: z.pos.z, y: 3.5, tx: p.x, tz: p.z, tiempo: 1.2 + i * 0.07, atacante: z, danio: 0, tipo: 'veneno', radio: 0, efecto: 'gas',
          radioAviso: 2.8, colorAviso: VERDE,
          alImpactar: (px, pz) => {
            j.sis.zona({ x: px, z: pz, radio: 2.8, duracion: 5.5, tipo: 'gas', dps: 7 * z.escDanio, atacante: z, afecta: 'jugadores' });
            j.sis.fxEmitir('gas_toxico', px, 0.3, pz, { escala: 1 });
          },
        });
      }
    },
  },

  // ── Salto aplastante ──
  salto_aplastante: {
    dur: [1.05, 0.8, 1.1], rango: [4, 20], cd: 9, peso: 1.7,
    ini(j, A) {
      const o = j.z.rec; A.tx = o ? o.x : j.z.pos.x; A.tz = o ? o.z : j.z.pos.z;
      A.R = 4.6;
      A.tel = j.sis.tel.disco(A.tx, A.tz, A.R, A.dur[0], { color: ROJO });
      j.z.visual.accion('atacar', { duracion: A.dur[0] + 0.5, salto: true });
    },
    aviso(j, A, dt, p) {
      if (p < 0.55 && j.z.rec) {
        A.tx += (j.z.rec.x - A.tx) * Math.min(1, dt * 5); A.tz += (j.z.rec.z - A.tz) * Math.min(1, dt * 5);
        if (A.tel) { A.tel.x = A.tx; A.tel.z = A.tz; }
      }
      j.mirar(A.tx - j.z.pos.x, A.tz - j.z.pos.z);
    },
    lanza(j, A) {
      const p = j.sis.nav.puntoLibre(A.tx, A.tz, j.z.capa, { x: 0, z: 0 });
      A.tx = p.x; A.tz = p.z;
      A.vx = (A.tx - j.z.pos.x) / A.dur[1]; A.vz = (A.tz - j.z.pos.z) / A.dur[1];
      j.z.cuerpo.mascara = 0; j.z.tInvul = Math.max(j.z.tInvul, 0.15);
    },
    ejec(j, A) { j.z.fVx = A.vx; j.z.fVz = A.vz; j.z.tForzado = 0.06; j.mirar(A.vx, A.vz); },
    fin(j, A) {
      const z = j.z;
      z.cuerpo.mascara = 0xffff; z.tForzado = 0;
      danioCirculo(j.sis, z, z.pos.x, z.pos.z, A.R, z.danio * 1.7, { empuje: 11, estructuras: 3 });
      j.sis.fxEmitir('onda', z.pos.x, 0.3, z.pos.z, { escala: 2.4 });
      j.sis.fxEmitir('polvo', z.pos.x, 0.5, z.pos.z, { escala: 3 });
      j.sis.juego.fx?.escombros?.({ x: z.pos.x, y: 0.5, z: z.pos.z, cantidad: 16, material: 'piedra', fuerza: 8 });
      j.sis.juego.render?.sacudir?.(0.8, 0.5);
      j.expuestoHasta = j.sis.ahora + 1.4;
    },
  },

  // ── Regenerar ──
  regenerar: {
    dur: [0.7, 3.6, 0.6], rango: null, cd: 24, peso: 1.0,
    puede: (j) => j.fase >= 1 && j.z.vida < j.z.vidaMax * 0.8,
    ini(j, A) {
      A.dano = 0; A.tel = j.sis.tel.disco(j.z.pos.x, j.z.pos.z, j.z.radio + 1.6, A.dur[0] + A.dur[1], { color: VERDE, sigue: (t) => { t.x = j.z.pos.x; t.z = j.z.pos.z; } });
      j.z.visual.accion('gritar', { duracion: 1.2 });
      j.regeneracion = A;
    },
    ejec(j, A, dt) {
      j.z.vida = Math.min(j.z.vidaMax, j.z.vida + j.z.vidaMax * 0.022 * dt);
      j.z.deseoX = j.z.deseoZ = 0;
      if (j.sis.ahora - (A.tFx || 0) > 0.35) { A.tFx = j.sis.ahora; j.sis.fxEmitir('curacion', j.z.pos.x, 1, j.z.pos.z, { escala: 2 }); }
      if (A.dano > j.z.vidaMax * 0.03) {      // interrumpido a base de daño
        A.t = A.dur[1]; j.expuestoHasta = j.sis.ahora + 2; j.sis.juego.eventos.emitir('mensaje', { texto: 'Regeneración interrumpida', tipo: 'aviso', duracion: 1.5 });
      }
    },
    fin(j, A) { j.regeneracion = null; A.tel?.quitar(); },
  },

  // ── Barrido láser (OMEGA) ──
  barrido_laser: {
    dur: [1.4, 3.4, 0.9], rango: null, cd: 12, peso: 1.7,
    ini(j, A) {
      A.rot0 = Math.atan2(j.ap.dx, j.ap.dz); A.dir = j.z.lado; A.arco = 2.0; A.haces = j.fase >= 2 ? 2 : 1; A.tick = 0;
      A.telA = j.sis.tel.linea(j.z.pos.x, j.z.pos.z, A.rot0 - A.dir * A.arco / 2, 17, 0.6, A.dur[0], { color: CIAN });
      A.telB = A.haces > 1 ? j.sis.tel.linea(j.z.pos.x, j.z.pos.z, A.rot0 - A.dir * A.arco / 2 + Math.PI, 17, 0.6, A.dur[0], { color: CIAN }) : null;
      j.z.visual.accion('escupir', { duracion: A.dur[0] + 0.4 });
    },
    aviso(j, A) {
      const r0 = A.rot0 - A.dir * A.arco / 2;
      j.mirar(Math.sin(r0), Math.cos(r0));
      for (const t of [A.telA, A.telB]) if (t) { t.x = j.z.pos.x; t.z = j.z.pos.z; }
    },
    ejec(j, A, dt, p) {
      const z = j.z, rot = A.rot0 - A.dir * A.arco / 2 + A.dir * A.arco * limitar(p, 0, 1);
      A.rotAct = rot;
      j.mirar(Math.sin(rot), Math.cos(rot));
      A.tick -= dt;
      if (A.tick > 0) return;
      A.tick = 0.1;
      for (let h = 0; h < A.haces; h++) {
        const r = rot + h * Math.PI, largo = largoLibre(j.sis, z.pos.x, z.pos.z, r, 17);
        danioLinea(j.sis, z, z.pos.x, z.pos.z, r, largo, 0.9, z.danio * 0.2, { tipo: 'energia', area: true, continuo: false, empuje: 1, estructuras: 1.5 });
        const a = { x: z.pos.x, y: 1.8, z: z.pos.z }, b = { x: z.pos.x + Math.sin(r) * largo, y: 1.0, z: z.pos.z + Math.cos(r) * largo };
        j.sis.juego.fx?.trazadora?.(a, b, { tipo: 'laser', color: 0x46e6ff });
        if (largo < 17) j.sis.fxEmitir('chispas', b.x, 0.6, b.z, { cantidad: 3 });
      }
    },
  },

  // ── Enjambre de drones ──
  enjambre_drones: {
    dur: [0.9, 0.6, 0.8], rango: null, cd: 16, peso: 1.1,
    puede: (j) => j.sis.drones.length < 6,
    ini(j, A) { j.z.visual.accion('gritar', { duracion: 1.2 }); A.tel = j.sis.tel.disco(j.z.pos.x, j.z.pos.z, 3.6, A.dur[0], { color: CIAN }); },
    lanza(j) {
      const n = Math.min(10 - j.sis.drones.length, 3 + j.fase * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + j.sis.juego.rng() * 0.5;
        const d = new Dron(j.sis, j.z, j.z.pos.x + Math.sin(a) * 2.2, j.z.pos.z + Math.cos(a) * 2.2);
        j.sis.drones.push(d);
      }
      j.sis.fxEmitir('electrico', j.z.pos.x, 1.5, j.z.pos.z, { escala: 1.6 });
    },
  },

  // ── Pulso IEM ──
  pulso_iem: {
    dur: [2.0, 0.25, 1.1], rango: null, cd: 15, peso: 1.2,
    ini(j, A) {
      A.R = 10; A.tel = j.sis.tel.disco(j.z.pos.x, j.z.pos.z, A.R, A.dur[0], { color: CIAN, sigue: (t) => { t.x = j.z.pos.x; t.z = j.z.pos.z; } });
      j.z.visual.accion('gritar', { duracion: 2.2 });
    },
    lanza(j, A) {
      const z = j.z, sis = j.sis;
      sis.fxEmitir('onda', z.pos.x, 1, z.pos.z, { escala: 4, color: '#46e6ff' });
      sis.fxEmitir('electrico', z.pos.x, 1.4, z.pos.z, { escala: 3 });
      sis.juego.render?.sacudir?.(0.6, 0.5);
      sis.amigos(z.pos.x, z.pos.z, A.R, (e) => {
        if (!sis.fisica.lineaLibre(z.pos.x, z.pos.z, e.pos.x, e.pos.z)) return;           // los muros protegen
        const dx = e.pos.x - z.pos.x, dz = e.pos.z - z.pos.z, l = Math.hypot(dx, dz) || 1;
        sis.danar(e, { cantidad: z.danio * 0.7, tipo: 'energia', atacante: z, x: e.pos.x, z: e.pos.z, dirX: dx / l, dirZ: dz / l, empuje: 4, area: true });
        if (e.silenciado !== undefined) e.silenciado = Math.max(e.silenciado || 0, 5);
        e.aplicarEstado?.('aturdido', 0.5);
        e.desactivar?.(4); e.aturdir?.(3);                                   // torretas, emplazamientos, vehículos
      });
    },
  },

  // ── Núcleo expuesto: ventana de daño ×2,5 a cambio de descargas radiales ──
  nucleo_expuesto: {
    dur: [0.8, 5.2, 1.0], rango: null, cd: 26, peso: 1.2,
    puede: (j) => j.fase >= 1,
    ini(j, A) { A.sig = 0; A.giro = 0; A.rayos = []; j.z.visual.accion('gritar', { duracion: 1.2 }); },
    lanza(j, A) { j.nucleo = true; j.z.visual.estado('furia', true); j.sis.fxEmitir('electrico', j.z.pos.x, 2, j.z.pos.z, { escala: 2.5 }); },
    ejec(j, A, dt) {
      const z = j.z;
      A.sig -= dt;
      if (A.sig <= 0) {
        A.sig = 1.15 - j.fase * 0.1;
        const n = 8;
        for (let i = 0; i < n; i++) {
          const rot = A.giro + (i / n) * TAU;
          const largo = largoLibre(j.sis, z.pos.x, z.pos.z, rot, 15);
          A.rayos.push({ rot, largo, t: 0.7, tel: j.sis.tel.linea(z.pos.x, z.pos.z, rot, largo, 1.1, 0.7, { color: CIAN }), x: z.pos.x, z: z.pos.z });
        }
        A.giro += TAU / 16;
      }
      for (let i = A.rayos.length - 1; i >= 0; i--) {
        const r = A.rayos[i]; r.t -= dt;
        if (r.t <= 0) {
          A.rayos.splice(i, 1);
          danioLinea(j.sis, z, r.x, r.z, r.rot, r.largo, 1.1, z.danio * 0.75, { tipo: 'energia', area: true, empuje: 5, estructuras: 2 });
          j.sis.juego.fx?.trazadora?.({ x: r.x, y: 1.5, z: r.z }, { x: r.x + Math.sin(r.rot) * r.largo, y: 0.8, z: r.z + Math.cos(r.rot) * r.largo }, { tipo: 'laser', color: 0x46e6ff });
        }
      }
      z.deseoX = z.deseoZ = 0;
    },
    fin(j, A) { j.nucleo = false; j.z.visual.estado('furia', false); j.expuestoHasta = j.sis.ahora + 1; for (const r of A.rayos) r.tel?.quitar(); A.rayos.length = 0; },
  },
};

function sisN(j) { return j.sis.nObjetivos; }

function azotar(j, A) {
  const z = j.z;
  danioLinea(j.sis, z, z.pos.x, z.pos.z, A.rot, A.largo, 1.6, z.danio * 1.1, { estructuras: 3, empuje: 9 });
  const fx = Math.sin(A.rot), fz = Math.cos(A.rot);
  j.sis.juego.fx?.trazadora?.({ x: z.pos.x, y: 1.6, z: z.pos.z }, { x: z.pos.x + fx * A.largo, y: 0.5, z: z.pos.z + fz * A.largo }, { tipo: 'arco', color: 0xffc070 });
  j.sis.fxEmitir('chispas', z.pos.x + fx * A.largo, 0.4, z.pos.z + fz * A.largo, { cantidad: 6 });
  j.sis.juego.render?.sacudir?.(0.25, 0.2);
  A.k++;
}

// ───────────────────────── IA del jefe ─────────────────────────

const MINIONS = {
  coracero: [['caminante', 6], ['corredor', 2]],
  fogonero: [['caminante', 5], ['corredor', 3], ['apestado', 1]],
  mariscal: [['caminante', 4], ['acorazado', 3], ['escupidor', 2]],
  rey_asfalto: [['corredor', 5], ['caminante', 3], ['detonador', 2]],
  paciente_cero: [['caminante', 4], ['corredor', 3], ['apestado', 2], ['aullador', 1]],
  omega: [['corredor', 4], ['acorazado', 3], ['detonador', 3], ['mole', 0.5]],
};

export function crearJefeIA(sis, z) {
  const juego = sis.juego;
  const lista = (z.def.ataques || []).filter((id) => ATAQUES[id]);
  const cds = {};
  const ia = {
    z, sis, fase: 0, ataque: null, tProximo: 0, ultimo: null, transicion: 0, expuestoHasta: 0, recExtra: 0,
    nucleo: false, regeneracion: null, ap: { x: 0, z: 0, dx: 0, dz: 1, d: 1 }, tAturdidoUlt: -99, ataqueActual: null,

    get estado() { return z.tEmerge > 0 ? 'entrando' : ia.transicion > 0 ? 'fase' : ia.ataque ? ia.ataque.id : 'moviendo'; },

    mirar(dx, dz) { z.mirarX = dx; z.mirarZ = dz; },

    puedeAturdir() { if (sis.ahora - ia.tAturdidoUlt < 8) return false; ia.tAturdidoUlt = sis.ahora; return true; },

    /** ¿Hay una carrera sin muros hasta el objetivo? */
    hayCarrera() {
      const a = ia.ap;
      return sis.nav.distanciaLibre(z.pos.x, z.pos.z, a.dx, a.dz, a.d, z.radio * 0.9, true) >= a.d - 1.5;
    },

    minionsVivos() {
      let n = 0;
      for (const o of juego.zombis) if (o.invocador === z && o.vivo) n++;
      return n;
    },

    invocar(n) {
      const cap = Math.min(n, 12 - ia.minionsVivos(), 170 - juego.zombis.length);
      for (let i = 0; i < cap; i++) {
        const a = (i / n) * TAU + sis.juego.rng() * 0.6, d = z.radio + 2.5 + sis.juego.rng() * 3.5;
        const id = juego.rng.ponderado(MINIONS[z.jefeId] || MINIONS.coracero);
        const m = sis.api.generar(id, z.pos.x + Math.sin(a) * d, z.pos.z + Math.cos(a) * d, { emerger: true });
        if (m) m.invocador = z;
      }
    },

    multiplicadorDanio(info, tipo) {
      let m = 1;
      if (ia.nucleo) m *= 2.5;
      else if (sis.ahora < ia.expuestoHasta) m *= 1.3;
      return m;
    },

    alRecibir(info, cant) {
      if (ia.regeneracion) ia.regeneracion.dano += cant;
      const r = z.vida / z.vidaMax;
      const fase = r <= 0.33 ? 2 : r <= 0.66 ? 1 : 0;
      if (fase > ia.fase && z.vivo && z.vida > 0) ia.cambiarFase(fase);
    },

    cambiarFase(f) {
      ia.fase = f;
      ia.cancelar();
      ia.transicion = 1.5; z.tInvul = Math.max(z.tInvul, 1.5);
      z.visual.accion('gritar', { duracion: 1.6 });
      sis.juego.render?.sacudir?.(0.8, 0.9);
      sis.fxEmitir('onda', z.pos.x, 1, z.pos.z, { escala: 4 });
      juego.eventos.emitir('jefe:fase', { jefe: z, fase: f });
      juego.eventos.emitir('mensaje', { texto: f === 1 ? `${z.def.nombre} se enfurece` : `${z.def.nombre} está al límite`, tipo: 'jefe', duracion: 3 });
      ia.proximaInvocacion = true;
    },

    cancelar() {
      const A = ia.ataque;
      if (A) {
        const def = ATAQUES[A.id];
        try { def.fin?.(ia, A); } catch (e) { /* limpieza */ }
        A.tel?.quitar(); A.telA?.quitar(); A.telB?.quitar();
        if (A.marcas) for (const m of A.marcas) m.tel?.quitar();
        if (A.pts) for (const p of A.pts) p.tel?.quitar();
        if (A.rayos) for (const r of A.rayos) r.tel?.quitar();
      }
      ia.ataque = null; z.tForzado = 0; z.cuerpo.mascara = 0xffff; z.mirarX = z.mirarZ = 0;
      z.visual.estado('cargando', false);
      ia.nucleo = false;
    },

    elegir() {
      const a = ia.ap, ahora = sis.ahora;
      const cand = [];
      for (const id of lista) {
        const d = ATAQUES[id];
        if ((cds[id] || 0) > ahora) continue;
        if (d.rango && (a.d < d.rango[0] || a.d > d.rango[1])) continue;
        if (d.puede && !d.puede(ia)) continue;
        let w = d.peso;
        if (id === ia.ultimo) w *= 0.15;
        if (id === 'invocar' && ia.proximaInvocacion) w *= 6;
        cand.push([id, w]);
      }
      if (!cand.length) return null;
      return juego.rng.ponderado(cand);
    },

    iniciar(id) {
      const d = ATAQUES[id], vel = 1 - ia.fase * 0.12;
      const A = { id, etapa: 'aviso', t: 0, dur: [d.dur[0] * (id === 'pulso_iem' ? 1 : vel), d.dur[1], d.dur[2] * vel] };
      ia.ataque = A; ia.ultimo = id; cds[id] = sis.ahora + d.cd * (1 - ia.fase * 0.1) + d.dur[0] + d.dur[1];
      if (id === 'invocar') ia.proximaInvocacion = false;
      d.ini(ia, A);
      juego.eventos.emitir('jefe:ataque', { jefe: z, ataque: id });
    },

    pensar() {
      if (z.tEmerge > 0 || ia.transicion > 0) { z.parar(); return; }
      const r = z.rec;
      if (r) {
        const dx = r.x - z.pos.x, dz = r.z - z.pos.z, d = Math.hypot(dx, dz) || 1;
        ia.ap.x = r.x; ia.ap.z = r.z; ia.ap.dx = dx / d; ia.ap.dz = dz / d; ia.ap.d = d;
      }
      if (ia.ataque) { z.parar(); return; }
      z.mirarX = z.mirarZ = 0;
      if (!r) { z.vagar(); return; }
      if (z.atk) { z.parar(); return; }
      if (sis.ahora >= ia.tProximo) {
        const id = ia.elegir();
        if (id) { ia.iniciar(id); z.parar(); return; }
        ia.tProximo = sis.ahora + 0.4;
      }
      // golpe básico si está pegado
      const d = ia.ap.d;
      if (d <= z.alcanceA(r.ent) && z.puedeGolpear()) z.iniciarGolpe(r.ent, 0.55);
      z.guiar(r.x, r.z, d);
      z.componer(z.gx, z.gz, d <= z.alcanceA(r.ent) ? 0.1 : 1, 0.5);
    },

    actualizar(dt) {
      if (z.tEmerge > 0) return;
      if (ia.transicion > 0) {
        ia.transicion -= dt; z.parar();
        if (ia.transicion <= 0 && ia.proximaInvocacion) { ia.invocar(4 + ia.fase * 2); ia.proximaInvocacion = false; }
        return;
      }
      const A = ia.ataque;
      if (!A) return;
      const d = ATAQUES[A.id];
      A.t += dt;
      if (A.etapa === 'aviso') {
        z.parar();
        d.aviso?.(ia, A, dt, A.t / A.dur[0]);
        if (A.t >= A.dur[0]) { A.etapa = 'ejec'; A.t = 0; d.lanza?.(ia, A); }
      } else if (A.etapa === 'ejec') {
        z.parar();
        d.ejec?.(ia, A, dt, A.t / A.dur[1]);
        if (A.t >= A.dur[1]) { d.fin?.(ia, A); A.etapa = 'rec'; A.t = 0; }
      } else {
        z.parar();
        d.rec?.(ia, A, dt);
        if (A.t >= A.dur[2] + ia.recExtra) {
          ia.recExtra = 0; ia.ataque = null; z.mirarX = z.mirarZ = 0;
          ia.tProximo = sis.ahora + Math.max(0.5, 1.7 - 0.4 * ia.fase);
        }
      }
    },

    alContacto(d, otro, nx, nz, velRel) {
      const A = ia.ataque;
      if (A && A.etapa === 'ejec') ATAQUES[A.id].contacto?.(ia, A, d);
    },

    alMorir(info) {
      ia.cancelar();
      for (const dr of sis.drones.slice()) dr.liberar();
      juego.render?.sacudir?.(1, 1.2);
      juego.camaraLenta?.(0.3, 1.6);
      juego.eventos.emitir('mensaje', { texto: `${z.def.nombre} ha caído`, tipo: 'logro', duracion: 4 });
      sis.fxEmitir('explosion_grande', z.pos.x, 1, z.pos.z, { escala: 2 });
    },
  };
  return ia;
}

export { ATAQUES };
