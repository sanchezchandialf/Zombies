// Visual de un jugador: esqueleto articulado + animación procedural (andar ligado a la velocidad real, apuntado con IK de brazos,
// acciones puntuales, estados persistentes y muerte física). No contiene lógica de juego.
import * as THREE from 'three';
import { D } from './construir.js';
import { RASGOS } from './rasgos.js';
import { atuendo } from './atuendos.js';
import { matTinte, matFantasma, matSilueta, RIM } from './mat.js';
import { ROLES } from '../../datos/roles.js';
import { crearAuras } from './auras.js';

const V = THREE.Vector3, Q = THREE.Quaternion;
const DOWN = new V(0, -1, 0);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const TAU = Math.PI * 2;
/** Escala heroica: a 22 m de cámara el héroe debe dominar el encuadre frente a la horda (ARTE §8). */
const ESC_HEROE = 1.12;
const DUR_TINTE = 0.13;

// Posición del puño derecho (empuñadura) en el marco del pecho y parámetros de retroceso por pose de arma
const POSES = {
  larga: { p: [-0.15, 0.27, 0.12], rx: 0, kick: 0.09, kr: 0.05, dos: true },
  pistola: { p: [-0.12, 0.32, 0.43], rx: 0, kick: 0.05, kr: 0.14, dos: false, apoyo: [0.045, -0.035, -0.015] },
  doble: { p: [-0.2, 0.3, 0.4], rx: 0, kick: 0.04, kr: 0.09, dos: true },
  pesada: { p: [-0.16, 0.14, 0.26], rx: 0, kick: 0.13, kr: 0.04, dos: true },
  cuerpo: { p: [-0.2, 0.2, 0.3], rx: -0.35, kick: 0, kr: 0, dos: false },
  arrojadiza: { p: [-0.17, 0.25, 0.34], rx: 0, kick: 0, kr: 0, dos: false },
};

// Temporales
const _d = new V(), _e = new V(), _pole = new V(), _t1 = new V(), _t2 = new V(), _w = new V(), _qa = new Q(), _qb = new Q(), _qc = new Q();
const _tr = new V(), _tl = new V(), _pr = new V(), _pl = new V(), _gl = new V(), _k = new V();
const _ax = new V();
const _eu = new THREE.Euler();
const _qw = new Q();

function resolverBrazo(a, T, pole, qMano) {
  const sh = a.sh, S = sh.position, U = a.U, F = a.F;
  _d.copy(T).sub(S);
  let dist = _d.length();
  if (dist < 1e-5) { _d.set(0, -1, 0); dist = 0.2; } else _d.multiplyScalar(1 / dist);
  dist = clamp(dist, Math.abs(U - F) + 0.04, (U + F) * 0.992);
  const cosA = clamp((U * U + dist * dist - F * F) / (2 * U * dist), -1, 1), ang = Math.acos(cosA);
  _pole.copy(pole); _pole.addScaledVector(_d, -_pole.dot(_d));
  if (_pole.lengthSq() < 1e-6) _pole.set(0, -1, 0); _pole.normalize();
  _e.copy(S).addScaledVector(_d, U * cosA).addScaledVector(_pole, U * Math.sin(ang));
  _t1.copy(_e).sub(S).normalize();
  sh.quaternion.setFromUnitVectors(DOWN, _t1);
  _w.copy(S).addScaledVector(_d, dist);
  _t2.copy(_w).sub(_e).normalize().applyQuaternion(_qa.copy(sh.quaternion).invert());
  a.el.quaternion.setFromUnitVectors(DOWN, _t2);
  if (qMano) a.hd.quaternion.copy(sh.quaternion).multiply(a.el.quaternion).invert().multiply(qMano);
  else a.hd.quaternion.identity();
}

export class VisualJugador {
  constructor(sis, rolId, eraIdx) {
    this.sis = sis; this.juego = sis.juego; this.rolId = rolId;
    const R = this.R = RASGOS[rolId] ?? RASGOS.soldado;
    this.altura = 1.95 * R.esc * ESC_HEROE;
    const H = this.H = {};
    const mk = (n, padre, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.name = n; g.position.set(x, y, z); padre.add(g); H[n] = g; return g; };
    const root = this.root = new THREE.Group(); root.name = 'jugador_' + rolId; root.scale.setScalar(R.esc * ESC_HEROE);
    const caida = mk('caida', root), volteo = mk('volteo', caida, 0, 0.9, 0), cuerpo = mk('cuerpo', volteo, 0, -0.9, 0);
    const w = R.w;
    const pelvis = mk('pelvis', cuerpo, 0, D.alturaCadera, 0);
    mk('falda', pelvis, 0, 0.04, 0);
    const espina = mk('espina', pelvis, 0, D.espina, 0);
    const pecho = mk('pecho', espina, 0, D.pecho0, 0);
    mk('capa', pecho, 0, 0.4, -0.1);
    const cuello = mk('cuello', pecho, 0, D.cuello0, 0);
    mk('cabeza', cuello, 0, D.cabeza0, 0.008);
    const sx = 0.225 * w * R.hom * 0.9 + 0.02, hx = 0.092 * w ** 0.85;
    this.brazos = []; this.piernas = [];
    for (const [s, sf] of [[-1, 'D'], [1, 'I']]) {
      const sh = mk('hombro' + sf, pecho, s * sx, D.hombroY, 0), el = mk('codo' + sf, sh, 0, -D.brazo, 0), hd = mk('mano' + sf, el, 0, -D.antebrazo, 0);
      this.brazos.push({ s, sh, el, hd, U: D.brazo, F: D.antebrazo });
      const cd = mk('cadera' + sf, pelvis, s * hx, -0.02, 0), ro = mk('rodilla' + sf, cd, 0, -D.muslo, 0), to = mk('tobillo' + sf, ro, 0, -D.pierna, 0);
      this.piernas.push({ s, cd, ro, to });
    }
    const pivot = this.pivot = new THREE.Group(); pivot.name = 'armaPivot'; pecho.add(pivot);
    this.arma = null; this.pose = null; this.manoIzq = null;
    this.mallas = [];
    this.auras = crearAuras(this);
    this.sombra = sis.crearSombra(); root.add(this.sombra);
    this.anillo = sis.crearAnillo?.(ROLES[rolId]?.color ?? '#ffffff') ?? null;
    if (this.anillo) { this.anillo.scale.setScalar(1 / (R.esc * ESC_HEROE)); root.add(this.anillo); }
    // Luz de héroe: pequeño foco sin sombra sobre la cabeza, blanco teñido del color del rol. De noche separa al jugador del fondo.
    this.colLuz = new THREE.Color(ROLES[rolId]?.color ?? '#ffffff').lerp(new THREE.Color(1, 0.96, 0.9), 0.7);   // casi blanca: modela al héroe sin teñir el arma
    this.luz = this.juego?.render?.luzPuntual?.({ x: 0, y: 2.6, z: 0, color: this.colLuz, intensidad: 0, distancia: 8 }) ?? null;
    sis.escena.add(root);

    // Estado de animación
    this.t = Math.random() * 10; this.fase = Math.random() * TAU;
    this.vx = 0; this.vz = 0; this.lf = 0; this.ls = 0; this.sp = 0; this.mov = 0; this.run = 0;
    this.px = 0; this.pz = 0; this.rot = 0;
    this.wR = 0; this.wL = 0;
    this.retro = 0; this.lean = 0;
    this.T = { recargar: null, lanzar: null, cuerpo: null, habilidad: null, golpe: null, esquivar: null };
    this.est = {};
    this.wCaido = 0; this.derribo = null;
    this.flashT = 0; this.flashCol = 0xffffff; this.invisible = false;
    this.flaldaA = 0; this.capaA = 0;
    this.muerto = false; this.M = null;
    this.eraIdx = -1;
    this.vestir(eraIdx);
    this.aplicarPose(0);
    this.root.updateMatrixWorld(true);
  }

  // ───────────── API del contrato ─────────────
  colocar(x, z, rot) { if (this.muerto) return; this.root.position.set(x, this.root.position.y * 0, z); this.root.rotation.y = rot; this.rot = rot; }
  mover(vx, vz) { this.vx = vx; this.vz = vz; }
  accion(n, o = {}) {
    const dur = o.duracion;
    const T = this.T;
    switch (n) {
      case 'disparar': this.retro = 1; break;
      case 'recargar': T.recargar = { t: 0, d: dur || 1.4 }; break;
      case 'lanzar': T.lanzar = { t: 0, d: dur || 0.45 }; break;
      case 'cuerpo': T.cuerpo = { t: 0, d: dur || 0.4 }; break;
      case 'habilidad': T.habilidad = { t: 0, d: dur || 0.5 }; break;
      case 'esquivar': T.esquivar = { t: 0, d: dur || 0.45, dx: o.dirX ?? 0, dz: o.dirZ ?? 1 }; break;
      case 'golpe':
        if ((dur || 0) > 0.7) this.derribo = { t: 0, d: dur };
        else T.golpe = { t: 0, d: dur || 0.28, dx: o.dirX ?? 0, dz: o.dirZ ?? 0 };
        break;
      default: break;
    }
  }
  estado(n, on) {
    this.est[n] = !!on;
    if (n === 'invisible') { this.invisible = !!on; this._mats(); }
    this.auras.estado(n, !!on);
  }
  equipar(obj) {
    if (this.arma) this.pivot.remove(this.arma);
    this.arma = obj || null;
    if (obj) {
      obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0);
      this.pivot.add(obj);
      const u = obj.userData || {};
      this.pose = POSES[u.pose] ? u.pose : 'larga';
      this.manoIzq = u.manoIzq || null;
    } else { this.pose = null; this.manoIzq = null; }
    this.armaVisible = true;
  }
  boca(out = new V()) {
    const o = this.arma;
    if (o && o.userData?.boca) { o.updateWorldMatrix(true, false); return out.copy(o.userData.boca).applyMatrix4(o.matrixWorld); }
    const h = this.H.manoD; h.updateWorldMatrix(true, false);
    return out.set(0, -0.06, 0.5).applyMatrix4(h.matrixWorld);
  }
  vestir(eraIdx) {
    this.eraIdx = eraIdx;
    // Retirar mallas anteriores (las geometrías están cacheadas y compartidas: nada que liberar aquí)
    for (const m of this.mallas) m.removeFromParent();
    this.mallas.length = 0;
    for (const m of this.siluetas ?? []) m.removeFromParent();
    this.siluetas = [];
    const colRol = ROLES[this.rolId]?.color ?? '#ffffff';
    for (const p of atuendo(this.rolId, eraIdx)) {
      const h = this.H[p.h]; if (!h) continue;
      const m = new THREE.Mesh(p.geo, p.m);
      m.castShadow = true; m.receiveShadow = true; m.userData.m0 = p.m;
      m.renderOrder = 2;
      h.add(m); this.mallas.push(m);
      const sl = new THREE.Mesh(p.geo, matSilueta(colRol));
      sl.renderOrder = 1; sl.castShadow = false; sl.receiveShadow = false;
      h.add(sl); this.siluetas.push(sl);
    }
    this._mats();
  }
  destello(color = 0xffffff) {
    // bajo golpes seguidos el tinte no se queda clavado al máximo: solo el primero del racimo llega al nivel fuerte
    this.flashNivel = this.t - (this.tGolpe ?? -9) < 0.45 ? 1 : 2; this.tGolpe = this.t;
    this.flashT = DUR_TINTE; this.flashCol = color === 0xffffff ? 0xff3424 : color; this._mats();
  }
  visible(v) { this.root.visible = v; }
  liberar() { this.root.removeFromParent(); this.sis.quitar(this); this.auras.liberar(); this.luz?.quitar?.(); this.luz = null; }

  morir(o = {}) {
    if (this.muerto) return;
    this.muerto = true;
    this.est = {}; this.auras.todo(false);
    const cr = Math.cos(this.rot), sr = Math.sin(this.rot);
    const dx = o.dirX ?? 0, dz = o.dirZ ?? 1;
    const lx = dx * cr - dz * sr, lz = dx * sr + dz * cr, ln = Math.hypot(lx, lz) || 1;
    const f = clamp(o.fuerza ?? 0.6, 0.2, 1.6), exp = o.tipo === 'explosivo';
    const rnd = Math.random;
    this.M = {
      t: 0, th: 0.03, om: 0.8 + f * 2.2 + (exp ? 3 : 0), lx: lx / ln, lz: lz / ln, f, exp,
      vx: (lx / ln) * (0.8 + f * 3.2 + (exp ? 5 : 0)), vz: (lz / ln) * (0.8 + f * 3.2 + (exp ? 5 : 0)), vy: exp ? 4.5 + f * 2 : 0,
      x: 0, y: 0, z: 0, giro: exp ? (rnd() - 0.5) * 9 : 0, giroA: 0, rebotes: 0, quieto: false,
      bocaAbajo: lz / ln > 0.1, sem: [rnd(), rnd(), rnd(), rnd(), rnd(), rnd()],
      desde: {}, hundir: 0,
    };
    for (const n of ['hombroD', 'hombroI', 'codoD', 'codoI', 'cadera' + 'D', 'caderaI', 'rodillaD', 'rodillaI', 'espina', 'pecho', 'cuello', 'cabeza', 'pelvis', 'tobilloD', 'tobilloI']) this.M.desde[n] = this.H[n].quaternion.clone();
    // El arma cae al suelo
    if (this.arma) {
      const a = this.arma; a.updateWorldMatrix(true, false);
      this.sis.escena.attach(a);
      this.M.arma = { o: a, vy: 1.2, vx: this.M.vx * 0.5, vz: this.M.vz * 0.5, wx: (rnd() - 0.5) * 8, wz: (rnd() - 0.5) * 8, quieto: false };
      this.arma = null;
    }
    this.wR = this.wL = 0;
    this._mats();
  }

  // ───────────── materiales (destello / invisible) ─────────────
  _mats() {
    const tinte = this.flashT > 0 && !this.invisible, f = !tinte && this.invisible ? matFantasma() : null;
    for (const m of this.mallas) { m.material = tinte ? matTinte(m.userData.m0, this.flashCol, this.flashNivel) : (f || m.userData.m0); m.castShadow = !this.invisible; }
    for (const m of this.siluetas ?? []) m.visible = !this.invisible && !this.muerto;
    this.sombra.visible = !this.invisible;
  }

  // ───────────── animación ─────────────
  actualizar(dt) {
    dt = Math.min(dt, 0.1);
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this._mats();
      else if (this.flashNivel > 1 && this.flashT < DUR_TINTE * 0.55) { this.flashNivel = 1; this._mats(); }   // el tinte se apaga en dos pasos
    }
    if (dt <= 0) return;
    this.t += dt;
    this.auras.actualizar(dt, this.t);
    const noche = this.juego?.render?.ambienteActual?.noche ?? 0;
    RIM.value = 0.4 + 0.5 * noche;
    if (this.luz) {
      const p = this.root.position;
      // por delante (hacia la cámara) y a ~2,5 m de la cabeza: modela la cara visible sin quemarla
      this.luz.pos.set(p.x, p.y + 3.3, p.z + 2.2);
      this.luz.intensidad = this.muerto || this.invisible || !this.root.visible ? 0 : 2 + 5 * noche;
    }
    if (this.anillo) {
      this.anillo.visible = !this.muerto && !this.invisible;
      this.anillo.material.opacity = 0.78 + 0.12 * Math.sin(this.t * 2.6);
    }
    if (this.muerto) { this._muerte(dt); return; }
    this._gait(dt);
    this.aplicarPose(dt);
  }

  _gait(dt) {
    // Velocidad en el marco local del personaje (+Z = adelante, +X = su izquierda)
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    const lz = this.vx * s + this.vz * c, lx = this.vx * c - this.vz * s;
    this.lf = damp(this.lf, lz, 14, dt); this.ls = damp(this.ls, lx, 14, dt);
    const sp = Math.hypot(this.lf, this.ls);
    this.sp = sp;
    this.mov = sstep(0.12, 0.9, sp);
    this.run = sstep(3.4, 5.6, sp);
    const sv = Math.min(sp, 7);
    const paso = 0.4 + 0.14 * sv;           // longitud de paso (m)
    const f = sv / (2 * paso);              // ciclos por segundo: los pies no patinan
    this.fase = (this.fase + f * TAU * dt) % (TAU * 100);
    this.paso = paso;
  }

  aplicarPose(dt) {
    const H = this.H, R = this.R, w = R.w, t = this.t;
    const T = this.T, est = this.est;
    // Temporizadores
    for (const k of Object.keys(T)) { const a = T[k]; if (a) { a.t += dt; if (a.t >= a.d) T[k] = null; } }
    if (this.derribo) { this.derribo.t += dt; if (this.derribo.t >= this.derribo.d) this.derribo = null; }
    this.retro = Math.max(0, this.retro - dt * 9);
    const prog = (a) => (a ? a.t / a.d : -1);
    const mov = this.mov, run = this.run, fase = this.fase;
    const sp = this.sp;
    const sv = Math.min(sp, 7);
    const nz = sp > 0.05 ? 1 / sp : 0, cF = this.lf * nz, cS = this.ls * nz;

    // Peso de postura caída / derribada
    let caidoObj = est.caido ? 1 : 0;
    if (this.derribo) { const u = this.derribo.t, d = this.derribo.d; caidoObj = Math.max(caidoObj, sstep(0, 0.22, u) * (1 - sstep(d - 0.4, d, u))); }
    this.wCaido = damp(this.wCaido, caidoObj, 12, dt || 0.016);
    const wC = this.wCaido, vive = 1 - wC;

    // ── Marcha: piernas ──
    const Lg = D.muslo + D.pierna;
    const paso = this.paso || 0.5;
    const A = Math.asin(clamp(paso / (2 * Lg * 0.93), 0, 0.82)) * mov;
    const velLento = est.ralentizado ? 0.85 : 1;
    const esq = prog(T.esquivar), wTuck = esq >= 0 ? Math.sin(Math.PI * clamp(esq, 0, 1)) ** 0.6 : 0;
    const hundir = 0.012 * Math.sin(t * 1.4);
    let pelY = D.alturaCadera;
    const sa = Math.abs(Math.sin(fase));
    pelY = 0.905 - Lg * (1 - Math.cos(A * sa)) * 0.95 * velLento - mov * 0.015 + hundir * (1 - mov);
    const agachar = 0.1 * (est.cargando ? 1 : 0);
    for (let i = 0; i < 2; i++) {
      const p = this.piernas[i], ph = fase + (i ? Math.PI : 0), sn = Math.sin(ph), cs = Math.cos(ph);
      const sw = Math.max(0, cs);
      const hipF = A * sn * cF, hipS = A * sn * cS;
      let thX = -hipF, thZ = hipS + p.s * (0.03 + 0.02 * (1 - mov));
      let knee = 0.05 + 0.1 * mov + (0.45 + 0.6 * run) * sw ** 1.15 * mov + 0.08 * (1 - mov) * 0;
      let foot = 0;
      // Postura quieta con peso en una pierna
      const des = (1 - mov) * Math.sin(t * 0.6) * 0.012 * (i ? 1 : -1);
      thX += des;
      // Esquiva: pierna encogida
      thX = lerp(thX, -1.35 + i * 0.1, wTuck); knee = lerp(knee, 1.9, wTuck);
      // Caído: arrastra las piernas
      thX = lerp(thX, 0.12 + Math.sin(t * 2.2 + i * 3) * 0.18 * (est.caido ? 1 : 0.3), wC);
      knee = lerp(knee, 0.3 + (i ? 0.5 : 0) * (0.5 + 0.5 * Math.sin(t * 2.2)), wC);
      p.cd.rotation.set(thX, 0, thZ * (1 - wTuck));
      p.ro.rotation.set(knee, 0, 0);
      foot = -(thX + knee) - 0.2 * sw * mov * (1 - wTuck) + (i ? 0 : 0);
      foot = lerp(foot, 0.6, wTuck + wC);
      p.to.rotation.set(foot, 0, -p.cd.rotation.z * 0.9);
    }
    // Pelvis: cabeceo, balanceo y torsión opuesta a hombros
    const sn1 = Math.sin(fase), cs2 = Math.cos(2 * fase);
    const tw = (0.1 + 0.07 * run) * mov;
    H.pelvis.position.y = pelY - 0.1 * agachar;
    H.pelvis.position.x = Math.sin(fase) * 0.012 * mov * -1;
    const lat = Math.sin(fase) * (0.045 * mov);
    H.pelvis.rotation.set(0.02 * run, tw * sn1 * cF, lat * 0.6 + (1 - mov) * Math.sin(t * 0.6) * 0.012);

    // ── Torso ──
    const leanF = (0.05 + 0.028 * Math.min(sv, 6)) * mov;
    let spX = leanF * cF + Math.sin(t * 1.7) * 0.008 * (1 - mov) - 0.03 * (1 - cF) * 0;
    let spZ = -0.05 * cS * mov * Math.min(sv, 6) / 6 * 1.2;
    let spY = -tw * 0.7 * sn1 * cF;
    let chX = Math.sin(t * 1.7 + 0.4) * 0.012 * (1 - mov * 0.5), chY = -tw * 0.5 * sn1 * cF, chZ = 0;
    let neX = 0, hdX = 0, hdY = 0, hdZ = 0;
    const respira = Math.sin(t * 1.7);
    H.pecho.scale.set(1 + respira * 0.008, 1 + respira * 0.012, 1 + respira * 0.01);

    // Retroceso
    const pz = POSES[this.pose] || POSES.larga;
    const rk = this.retro * this.retro;
    spX -= 0.045 * this.retro * (pz.kick > 0.08 ? 1.6 : 1);

    // ── Posición base del puño derecho/arma (marco del pecho) ──
    const piv = this.pivot;
    let ppx = pz.p[0], ppy = pz.p[1], ppz = pz.p[2], prx = pz.rx, pry = 0, prz = 0;
    if (this.pose) {
      // el torso se inclina un poco hacia delante al correr; el arma sube y baja con el paso
      ppy += Math.cos(2 * fase) * 0.012 * mov;
      ppz -= pz.kick * rk; prx -= pz.kr * this.retro;
    }
    // Acciones (modifican arma, torso y brazos)
    const ovR = _pr.set(0, 0, 0); let wOvR = 0;
    const ovL = _pl.set(0, 0, 0); let wOvL = 0;
    let poleAim = 1; let armaOculta = false;
    const lanz = prog(T.lanzar), cuer = prog(T.cuerpo), hab = prog(T.habilidad), rec = prog(T.recargar), gol = prog(T.golpe);

    if (rec >= 0) this._recarga(rec, pz, { ppx, ppy, ppz, prx }, ovL, ovR, (v) => { wOvL = v[0]; wOvR = v[1]; }, (o) => { ppx = o.ppx; ppy = o.ppy; ppz = o.ppz; prx = o.prx; prz = o.prz || 0; pry = o.pry || 0; spX += o.sp || 0; hdX += o.hd || 0; });
    if (cuer >= 0) {
      const barrido = this.pose === 'cuerpo' ? 1 : 0.4;
      const a = sstep(0, 0.22, cuer), b = sstep(0.22, 0.62, cuer), c2 = sstep(0.62, 1, cuer);
      const yaw = (-0.95 * a + (1.0 + 0.95) * b - 0.55 * c2 * 0) * barrido * (1 - c2 * 0.8);
      chY += yaw; spY += yaw * 0.35; hdY -= yaw * 0.55;
      spX += 0.2 * b * (1 - c2);
      ppz += (0.12 * b - 0.05 * a) * (1 + barrido); ppy += 0.06 * a - 0.12 * b * barrido * 0 + 0.03 * b; prx += (-0.3 * a + 0.9 * b) * barrido * (1 - c2) + (this.pose !== 'cuerpo' ? -0.05 : 0);
      ppx += (-0.1 * a + 0.0 * b) * barrido;
      if (this.pose !== 'cuerpo') { ppz += 0.25 * Math.sin(Math.PI * clamp(cuer * 1.6, 0, 1)); }
    }
    if (lanz >= 0) {
      const mano = (this.pose === 'arrojadiza' || !this.pose || this.pose === 'cuerpo') ? 'D' : 'I';
      const sg = mano === 'D' ? -1 : 1;
      const a = sstep(0, 0.4, lanz), b = sstep(0.4, 0.62, lanz), c2 = sstep(0.62, 1, lanz);
      const yaw = sg * (0.7 * a - 1.5 * b) * -1 + sg * 0.5 * c2 * 0;
      chY += -sg * (0.55 * a) * 1 + sg * 1.1 * b * (1 - c2 * 0.6); spX += 0.18 * b * (1 - c2) - 0.1 * a; hdY += sg * 0.3 * b;
      _k.set(sg * 0.2 + sg * 0.04, 0.58 * a - 0.08 * b + 0.12 * (1 - c2) * b, -0.28 * a + 0.82 * b - 0.3 * c2);
      const wk = sstep(0, 0.12, lanz) * (1 - sstep(0.88, 1, lanz));
      if (mano === 'D') { ppx = lerp(ppx, _k.x, wk); ppy = lerp(ppy, _k.y + 0.0, wk); ppz = lerp(ppz, _k.z + 0.1, wk); prx += -1.1 * b * (1 - c2); if (lanz > 0.55 && this.pose === 'arrojadiza') armaOculta = true; }
      else { ovL.copy(_k); wOvL = wk; }
    }
    if (hab >= 0) {
      const up = sstep(0, 0.5, hab) * (1 - sstep(0.5, 0.62, hab)), slam = sstep(0.5, 0.62, hab) * (1 - sstep(0.62, 1, hab));
      spX += -0.18 * up + 0.4 * slam; hdX += 0.2 * up - 0.3 * slam;
      ppy += 0.3 * up - 0.18 * slam; prx += -0.5 * up + 0.7 * slam; ppz += 0.05 * up + 0.1 * slam;
      ovL.set(0.22, 0.66 * up - 0.05 * slam + 0.12, 0.2 + 0.2 * slam); wOvL = Math.max(up, slam) * 0.95;
      H.pelvis.position.y -= 0.14 * slam;
    }
    if (gol >= 0) {
      const g = T.golpe, b = Math.sin(Math.PI * clamp(gol, 0, 1)); const c = Math.cos(this.rot), s = Math.sin(this.rot);
      const lx = g.dx * c - g.dz * s, lz = g.dx * s + g.dz * c, n = Math.hypot(lx, lz) || 1;
      // El torso se dobla en la dirección del impacto
      spX += (lz / n) * 0.28 * b; spZ += -(lx / n) * 0.28 * b; hdX -= (lz / n) * 0.2 * b;
      this.lean = b;
    }

    // ── Esquiva: voltereta ──
    const vq = H.volteo.quaternion;
    if (esq >= 0) {
      const e = T.esquivar, c = Math.cos(this.rot), s = Math.sin(this.rot);
      const lx = e.dx * c - e.dz * s, lz = e.dx * s + e.dz * c, n = Math.hypot(lx, lz) || 1;
      _ax.set(lz / n, 0, -lx / n);
      const u = clamp(esq, 0, 1), ez = u * u * (3 - 2 * u) * 0.35 + u * 0.65;
      vq.setFromAxisAngle(_ax, TAU * ez);
      H.volteo.position.y = lerp(0.9, 0.5, wTuck);
    } else if (wC > 0.01) {
      // Postura abatida: boca abajo, arrastrándose
      _ax.set(1, 0, 0);
      vq.setFromAxisAngle(_ax, 1.45 * wC);
      H.volteo.position.y = lerp(0.9, 0.17, wC);
    } else { vq.identity(); H.volteo.position.y = 0.9; }
    // Caída boca abajo: la cabeza se levanta
    hdX = lerp(hdX, -1.0 + Math.sin(t * 1.6) * 0.06, wC);
    neX = lerp(neX, -0.25, wC);
    spX = lerp(spX, -0.2 + Math.sin(t * 2.2) * 0.05, wC);
    H.pelvis.position.y = lerp(H.pelvis.position.y, D.alturaCadera, wC * 0.8);

    // Tuck en la esquiva
    spX = lerp(spX, 0.5, wTuck); hdX = lerp(hdX, 0.5, wTuck);

    H.espina.rotation.set(spX, spY, spZ);
    H.pecho.rotation.set(chX, chY, chZ);
    H.cuello.rotation.set(neX + Math.sin(t * 0.9) * 0.01, 0, 0);
    // La cabeza compensa la torsión del torso y mira al frente
    H.cabeza.rotation.set(hdX - spX * 0.5 - chX * 0.3 + (this.est.aturdido ? Math.sin(t * 5) * 0.15 : 0), hdY - (spY + chY) * 0.6 + Math.sin(t * 0.5) * 0.02, hdZ - spZ * 0.5 + (this.est.aturdido ? Math.sin(t * 4) * 0.12 : 0));

    // ── Pivote del arma ──
    const wArma = (this.pose && !armaOculta && this.armaVisible !== false) ? 1 : 0;
    if (this.arma) this.arma.visible = !!wArma && wC < 0.6 && esq < 0 && this.root.visible !== false;
    piv.position.set(ppx, ppy, ppz);
    piv.rotation.set(prx, pry, prz);
    piv.updateMatrix();

    // ── Brazos (IK) ──
    const tieneArma = !!this.pose && wC < 0.5 && esq < 0;
    const objR = tieneArma ? 1 : 0;
    const dosManos = tieneArma && (pz.dos && (this.manoIzq || this.pose === 'larga' || this.pose === 'pesada' || this.pose === 'doble'));
    const apoyo = tieneArma && this.pose === 'pistola';
    let objL = (dosManos || apoyo) ? 1 : 0;
    if (lanz >= 0 && (this.pose !== 'arrojadiza' && this.pose && this.pose !== 'cuerpo')) objL = 0;
    this.wR = damp(this.wR, objR, 14, dt || 0.016); this.wL = damp(this.wL, objL, 14, dt || 0.016);
    const wR = this.wR, wL = this.wL;

    // Posiciones de agarre en el marco del pecho
    _gl.set(0, 0, 0);
    _qw.setFromEuler(_eu.set(prx, pry, prz));
    const gR = _tr.set(ppx, ppy, ppz);
    if (this.manoIzq && this.pose !== 'pistola') _gl.copy(this.manoIzq).applyQuaternion(_qw).add(gR);
    else if (apoyo) _gl.set(pz.apoyo[0], pz.apoyo[1], pz.apoyo[2]).applyQuaternion(_qw).add(gR);
    else _gl.copy(gR);
    // Muñeca: el puño queda ~5 cm por delante de ella
    _k.set(0, 0.05, 0).applyQuaternion(_qw); _tr.add(_k); _gl.add(_k);

    const swing = (i) => {
      const a = this.brazos[i], sg = i ? 1 : -1;
      const ph = fase + (i ? 0 : Math.PI);                    // el brazo derecho avanza con la pierna izquierda
      const amp = (0.35 + 0.25 * run) * mov;
      const ang = Math.sin(ph) * amp * cF;
      const Lh = (D.brazo + D.antebrazo) * (0.9 - 0.22 * run * mov);
      const out = 0.07 + 0.04 * run + 0.02 * Math.sin(t * 1.5 + i) * (1 - mov) + Math.sin(ph) * 0.12 * Math.abs(cS) * mov * sg;
      const bend = 0.0;
      _k.set(a.sh.position.x + sg * out * 1.0, a.sh.position.y - Lh * Math.cos(ang) * (1 - bend) - 0.02 * run * mov, a.sh.position.z + Lh * Math.sin(ang) + 0.04 * run * mov);
      return _k;
    };
    for (let i = 0; i < 2; i++) {
      const a = this.brazos[i], sg = i ? 1 : -1;
      const tgt = i ? _tl : _tr;
      const free = _pole.copy(swing(i));
      let T0, wG, over = i ? ovL : ovR, wOv = i ? wOvL : wOvR, grip = i ? _gl : _tr;
      T0 = i ? _t1.copy(_gl) : _t2.copy(_tr);
      wG = i ? wL : wR;
      const out = _w.copy(free).lerp(T0, wG);
      if (wOv > 0) out.lerp(over, wOv);
      // Esquiva: manos a las rodillas / caído: manos al frente
      if (wTuck > 0) out.lerp(_e.set(sg * 0.12, 0.0, 0.34), wTuck);
      if (wC > 0.01) out.lerp(_e.set(sg * 0.3, 0.62 + Math.sin(t * 2.2 + i * Math.PI) * 0.1 * (est.caido ? 1 : 0.2), 0.1 + Math.max(0, Math.sin(t * 2.2 + i * Math.PI)) * 0.08), wC);
      const aim = wG * poleAim;
      _pole.set(sg * lerp(0.35, 0.65, aim), lerp(-0.3, -1, aim), lerp(-0.9, -0.25, aim));
      const qm = (wG > 0.5 && !(wOv > 0.3)) ? _qb.copy(_qw) : null;
      resolverBrazo(a, out, _pole, qm);
    }

    // ── Elementos con inercia: falda y capa ──
    const fT = 0.06 + 0.5 * Math.min(1, sp / 6) + Math.abs(Math.sin(fase)) * 0.12 * mov;
    this.flaldaA = damp(this.flaldaA, fT, 9, dt || 0.016);
    H.falda.rotation.set(this.flaldaA - Math.abs(cF) * 0 + (cF < -0.3 ? -1.0 * this.flaldaA : 0), 0, Math.sin(fase) * 0.06 * mov * cS);
    const cT = 0.04 + 0.7 * Math.min(1, sp / 6) * Math.max(0, cF) + 0.06 * Math.sin(t * 1.3);
    this.capaA = damp(this.capaA, cT, 7, dt || 0.016);
    H.capa.rotation.set(this.capaA, 0, Math.sin(t * 1.9) * 0.025 + Math.sin(fase) * 0.05 * mov);

    // Sombra y rotación de raíz
    this.sombra.scale.setScalar(1 + (1 - wC) * 0 + wC * 0.4);
  }

  /** Recarga: genera desplazamientos del arma y de la mano libre según la pose. */
  _recarga(u, pz, b, ovL, ovR, setW, setB) {
    const sa = sstep(0, 0.18, u) * (1 - sstep(0.86, 1, u));
    const pose = this.pose;
    let { ppx, ppy, ppz, prx } = b, prz = 0, pry = 0, sp = 0, hd = 0;
    if (pose === 'pistola') {
      ppy += 0.02 * sa; ppz -= 0.2 * sa; ppx += 0.06 * sa; prx -= 0.65 * sa; prz = 0.2 * sa;
      const m = _k;
      const kf = [[0, 0.05, 0.12, 0.1], [0.18, 0.05, 0.12, 0.1], [0.38, 0.2, -0.14, 0.12], [0.55, 0.2, -0.14, 0.12], [0.72, 0.0, 0.34, 0.2], [0.82, 0.0, 0.32, 0.2], [1, 0.05, 0.12, 0.1]];
      this._kf(u, kf, ovL, 0.0);
      setW([sstep(0.05, 0.2, u) * (1 - sstep(0.88, 1, u)), 0]);
      sp = 0.08 * sa; hd = 0.15 * sa;
    } else if (pose === 'doble') {
      ppy -= 0.08 * sa; ppz -= 0.12 * sa; prx += 0.3 * sa;
      const kf = [[0, 0.2, 0.0, 0.34], [0.2, 0.22, -0.13, 0.12], [0.45, 0.22, -0.13, 0.12], [0.7, 0.08, 0.14, 0.32], [1, 0.2, 0.0, 0.34]];
      this._kf(u, kf, ovL, 0.0);
      setW([sstep(0.05, 0.2, u) * (1 - sstep(0.85, 1, u)), 0]);
      sp = 0.1 * sa;
    } else if (pose === 'cuerpo' || pose === 'arrojadiza') {
      ppy += 0.05 * sa; prx -= 0.3 * sa; setW([0, 0]);
    } else {
      // Larga / pesada: baja el arma, la mano de delante va al cinto y al cargador
      ppy -= 0.1 * sa; ppz -= 0.04 * sa; prx -= 0.25 * sa; prz = -0.55 * sa; ppx += 0.03 * sa;
      const gx = ppx, gy = ppy, gz = ppz;
      const kf = [[0, gx - 0.06, gy + 0.1, gz + 0.4], [0.12, gx - 0.05, gy + 0.08, gz + 0.35], [0.32, 0.2, -0.16, 0.14], [0.46, 0.2, -0.16, 0.14], [0.66, gx + 0.03, gy - 0.1, gz + 0.14], [0.8, gx + 0.03, gy - 0.12, gz + 0.12], [0.9, gx - 0.04, gy + 0.08, gz + 0.38], [1, gx - 0.06, gy + 0.1, gz + 0.4]];
      this._kf(u, kf, ovL, 0.0);
      setW([sstep(0.04, 0.16, u) * (1 - sstep(0.9, 1, u)), 0]);
      sp = 0.1 * sa; hd = 0.18 * sa;
    }
    setB({ ppx, ppy, ppz, prx, prz, pry, sp, hd });
  }
  _kf(u, kf, out, _x) {
    let i = 0; while (i < kf.length - 2 && u > kf[i + 1][0]) i++;
    const a = kf[i], b = kf[i + 1], t = sstep(a[0], b[0], u);
    out.set(lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t));
  }

  // ───────────── muerte física ─────────────
  _muerte(dt) {
    const M = this.M, H = this.H;
    M.t += dt;
    // Péndulo invertido alrededor de los pies
    if (!M.quieto) {
      const g = M.exp ? 6 : 24;
      M.om += g * Math.sin(M.th + 0.1) * dt * (M.th < 1.5 ? 1 : 0.2);
      M.th += M.om * dt;
      if (M.th >= Math.PI / 2) {
        M.th = Math.PI / 2; M.om = -Math.abs(M.om) * 0.2; M.rebotes++;
        if (M.rebotes > 2 || Math.abs(M.om) < 0.3) { M.quieto = true; M.om = 0; }
      }
      if (M.th < 0.03) M.th = 0.03;
    }
    _ax.set(M.lz, 0, -M.lx);
    const c = H.caida;
    c.quaternion.setFromAxisAngle(_ax, (M.bocaAbajo ? 1 : 1) * M.th);
    if (M.giro) { M.giroA += M.giro * dt * (M.y > 0.05 ? 1 : 0); _qc.setFromAxisAngle(_t1.set(0, 1, 0), M.giroA); c.quaternion.premultiply(_qc); }
    // Traslación balística + fricción
    M.vy -= 22 * dt; M.y += M.vy * dt;
    if (M.y < 0) { M.y = 0; if (M.vy < -3) { M.vy = -M.vy * 0.25; } else M.vy = 0; M.vx *= 0.9; M.vz *= 0.9; }
    const fr = M.y > 0.02 ? 1 : Math.exp(-3.2 * dt);
    M.vx *= fr; M.vz *= fr;
    M.x += M.vx * dt; M.z += M.vz * dt;
    const alt = 0.1 * Math.sin(Math.min(M.th, Math.PI / 2)) ;
    c.position.set(M.x, M.y + alt, M.z);
    // Miembros: de la última pose a la pose de muerte
    const s = sstep(0, 0.45, M.t);
    const r = M.sem, ab = M.bocaAbajo, sg = r[0] < 0.5 ? 1 : -1;
    const obj = {
      hombroD: [ab ? -2.5 : -0.5 - r[1] * 0.6, 0, -1.0 - r[2] * 0.4], hombroI: [ab ? -2.2 : 0.3 + r[3] * 0.5, 0, 1.0 + r[4] * 0.5],
      codoD: [-0.4 - r[2] * 0.6, 0, 0], codoI: [-0.2 - r[1] * 0.8, 0, 0],
      caderaD: [-0.2 - r[1] * 0.3, 0, -0.2 - r[2] * 0.1], caderaI: [0.2 + r[3] * 0.5, 0, 0.25 + r[4] * 0.2],
      rodillaD: [0.1 + r[5] * 0.5, 0, 0], rodillaI: [0.6 + r[1] * 0.6, 0, 0],
      espina: [ab ? -0.15 : 0.15, 0.1 * sg, 0.12 * sg], pecho: [0, 0.15 * sg, 0], cuello: [0, 0, 0.1 * sg], cabeza: [ab ? -0.2 : 0.35, 0.5 * sg, 0.3 * sg], pelvis: [0, -0.1 * sg, 0],
      tobilloD: [0.5, 0, 0.2], tobilloI: [0.3, 0, -0.2],
    };
    for (const n of Object.keys(obj)) {
      const o = obj[n]; _eu.set(o[0], o[1], o[2]); _qa.setFromEuler(_eu);
      H[n].quaternion.copy(M.desde[n]).slerp(_qa, s);
    }
    H.volteo.quaternion.identity(); H.volteo.position.y = 0.9;
    // Arma suelta
    const a = M.arma;
    if (a && !a.quieto) {
      const o = a.o; a.vy -= 22 * dt; o.position.x += a.vx * dt; o.position.z += a.vz * dt; o.position.y += a.vy * dt;
      o.rotation.x += a.wx * dt; o.rotation.z += a.wz * dt;
      if (o.position.y < 0.04) { o.position.y = 0.04; a.vy = a.vy < -2 ? -a.vy * 0.3 : 0; a.vx *= 0.7; a.vz *= 0.7; a.wx *= 0.5; a.wz *= 0.5; if (Math.abs(a.vy) < 0.1 && Math.abs(a.vx) < 0.05) { a.quieto = true; o.rotation.x = Math.PI / 2 * Math.sign(o.rotation.x || 1) * 0 + 0.1; o.rotation.z = Math.PI / 2; } }
    }
    this.sombra.material.opacity = 0.45;
    // Desvanecer: se hunde y desaparece
    if (M.t > 9) {
      M.hundir += dt;
      this.root.position.y = -0.35 * sstep(0, 2.2, M.hundir);
      if (M.arma) M.arma.o.position.y -= 0.0;
      if (M.hundir > 2.4) { if (M.arma) M.arma.o.removeFromParent(); this.liberar(); }
    }
  }
}
