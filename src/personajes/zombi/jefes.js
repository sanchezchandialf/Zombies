// Jefes: jerarquías de mallas normales (uno a la vez) con el mismo esqueleto y animación que la horda.
// Los diseños están en jefes-disenos.js. Muerte espectacular: colapso → explosión en trozos con física.
import * as THREE from 'three';
import { geometria } from './geometrias.js';
import { J, NJ, PADRE } from './matematica.js';
import { animarVivo, DUR_ACCION } from './animacion.js';
import { DISENOS } from './jefes-disenos.js';
import { materialJefe } from './materiales.js';
import { JEFES } from '../../datos/zombis.js';
import { crearRng } from '../../nucleo/util.js';

// Nombres de ataques de la IA → acción base del visual
const ALIAS = {
  carga: 'cargar', derrape: 'cargar', tajo_amplio: 'atacar', latigazo_cadena: 'atacar', tentaculos: 'atacar', salto_aplastante: 'saltar',
  invocar: 'gritar', chorro_vapor: 'gritar', rastro_fuego: 'gritar', esporas: 'gritar', regenerar: 'gritar', barrido_laser: 'gritar', pulso_iem: 'gritar', nucleo_expuesto: 'gritar',
  lluvia_carbon: 'lanzar', mortero: 'lanzar', enjambre_drones: 'lanzar', nube_gas: 'escupir', cuerpo: 'atacar',
};
const ORDEN = 'YXZ';

class VisualJefe {
  constructor(sis, jefeId) {
    this.sis = sis; this.juego = sis.juego; this.id = jefeId; this.def = JEFES[jefeId] || {};
    this.raiz = new THREE.Group(); this.raiz.name = 'jefe-' + jefeId;
    this.nodo = new THREE.Group(); this.raiz.add(this.nodo);               // oy, ofz, pitch, roll
    this.piv = [this.nodo];
    for (let j = 1; j < NJ; j++) { const g = new THREE.Group(); g.rotation.order = ORDEN; this.piv[PADRE[j]].add(g); this.piv.push(g); }
    this.rest = new Float32Array(NJ * 3);
    this.mats = []; this.emisivos = []; this.extras = []; this.mallas = [];
    this.st = { ardiendo: false, ralentizado: false, furia: false, cargando: false, envenenado: false, invisible: false };
    this.acc = null; this.golpe = null; this.vel = 0; this.fase = 0; this.desfase = 0.7; this.x = 0; this.z = 0; this.y = 0; this.rot = 0; this.vx = 0; this.vz = 0;
    this.A = new Float32Array(NJ * 3); this.q = { oy: 0, ofz: 0, ofx: 0, pitch: 0, roll: 0, yaw: 0, sX0: 1, sc: 1 };
    this.t = 0; this.vivo = true; this.tel = 0; this.flash = 0; this.furiaK = 0; this.muerto = null; this.chunks = [];
    this.altura = 4; this.P = { anim: { zancada: 2.5, pierna: 0.4, rodilla: 0.5, brazo: 0.1, inclina: 0.1, cabInc: 0, cabLado: 0.05, boca: 0.1, bI: [-0.3, 0.2, -0.3], bD: [-0.3, 0.2, -0.3], arrastre: 0, hombro: 0, cadera: 0.1, rebote: 0.03, vref: 2.6, temblor: 0.2 } };
    this.clase = 'jefe'; this.listo = false; this.escena = sis.juego.render.escena;
    this.rng = crearRng(777 + jefeId.length);
    this.escalaV = 2;
    (DISENOS[jefeId] || DISENOS.coracero)(this);
    for (let j = 1; j < NJ; j++) this.piv[j].position.set(this.rest[j * 3], this.rest[j * 3 + 1], this.rest[j * 3 + 2]);
    this.escena.add(this.raiz);
    this.raiz.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; this.mallas.push(o); } });
    this.raiz.visible = false;
  }
  // ── Constructores usados por los diseños ──
  mat(opts) { const m = materialJefe(opts); this.mats.push(m); if (opts.ei) this.emisivos.push({ m, base: opts.ei }); return m; }
  pieza(kind, mat, padre, pos, tam, rot = [0, 0, 0]) {
    const p = typeof padre === 'number' ? this.piv[padre] : padre;
    const m = new THREE.Mesh(geometria(kind), mat);
    m.position.set(pos[0], pos[1], pos[2]); m.scale.set(tam[0], tam[1], tam[2]); m.rotation.set(rot[0], rot[1], rot[2]);
    p.add(m); return m;
  }
  grupo(padre, pos = [0, 0, 0], rot = [0, 0, 0]) { const g = new THREE.Group(); g.position.set(...pos); g.rotation.set(...rot); (typeof padre === 'number' ? this.piv[padre] : padre).add(g); return g; }
  /** Esqueleto estándar con dimensiones propias del jefe. */
  esqueleto(o) {
    const r = this.rest, set = (j, x, y, z) => { r[j * 3] = x; r[j * 3 + 1] = y; r[j * 3 + 2] = z; };
    const hy = o.pie + o.tibia + o.muslo;
    set(J.PELVIS, 0, hy, 0); set(J.TORSO, 0, o.cintura ?? 0.2, 0); set(J.CABEZA, 0, o.cuello ?? o.torso, o.cabZ ?? 0); set(J.MANDIBULA, 0, -(o.cabR ?? 0.3) * 0.25, 0);
    set(J.BRAZO_I, -o.hombroX, o.torso * 0.92, 0); set(J.BRAZO_D, o.hombroX, o.torso * 0.92, 0);
    set(J.ANTEBRAZO_I, 0, -o.brazo, 0); set(J.ANTEBRAZO_D, 0, -o.brazo, 0);
    set(J.MUSLO_I, -o.cadera, -0.1, 0); set(J.MUSLO_D, o.cadera, -0.1, 0); set(J.TIBIA_I, 0, -o.muslo, 0); set(J.TIBIA_D, 0, -o.muslo, 0); set(J.PIE_I, 0, -o.tibia, 0); set(J.PIE_D, 0, -o.tibia, 0);
    set(J.X0, 0, o.torso * 0.5, 0); set(J.X1, 0, o.torso * 0.5, 0);
    this.dim = o;
  }
  // ── Interfaz Visual ──
  colocar(x, z, rot) { if (this.muerto) return; this.x = x; this.z = z; this.rot = rot; this.listo = true; this.raiz.visible = true; this.raiz.position.set(x, 0, z); this.raiz.rotation.y = rot; }
  mover(vx, vz) { this.vx = vx; this.vz = vz; }
  accion(nombre, o = {}) {
    if (this.muerto) return;
    let n = ALIAS[nombre] || nombre;
    if (n === 'golpe') { this.golpe = { t: 0, dur: 0.3, dx: o.dirX || 0, dz: o.dirZ || 0, fuerza: 0.35 }; return; }
    if (n === 'saltar') { this.acc = { n: 'atacar', t: 0, dur: o.duracion || 1.0, dx: 0, dz: 0, salto: true, extra: nombre }; return; }
    if (!(n in DUR_ACCION)) return;
    this.acc = { n, t: 0, dur: Math.max(0.3, o.duracion || DUR_ACCION[n] * 1.2), dx: o.dirX || 0, dz: o.dirZ || 0, salto: !!o.salto, extra: nombre };
    if (n === 'emerger') this.juego.fx?.emitir?.('polvo', { x: this.x, y: 0.1, z: this.z }, { escala: 3 });
  }
  estado(n, on) { if (n in this.st) this.st[n] = !!on; }
  destello() { this.flash = 1; }
  visible(v) { this.raiz.visible = !!v && this.listo; }
  equipar() {} vestir() {}
  boca(out = new THREE.Vector3()) { return out.set(this.x + Math.sin(this.rot) * 1.0, this.altura * 0.8, this.z + Math.cos(this.rot) * 1.0); }
  morir(info = {}) {
    if (this.muerto) return;
    this.muerto = { t: 0, fase: 'colapso', dx: info.dirX || 0, dz: info.dirZ || 0 };
    this.acc = null; this.golpe = null; this.vivo = false;
    this.juego.render?.sacudir?.(0.6, 1.4);
    this.juego.fx?.emitir?.('humo', { x: this.x, y: 1.5, z: this.z }, { escala: 2 });
  }
  liberar(todo) {
    for (const c of this.chunks) c.mesh.removeFromParent();
    this.chunks.length = 0; this.raiz.removeFromParent();
    for (const m of this.mats) m.dispose();
    this.mats.length = 0;
    const s = this.sis.jefes, i = s.indexOf(this); if (i >= 0) s.splice(i, 1);
  }
  // ── Cuadro ──
  actualizar(dt) {
    if (dt <= 0) dt = 1e-6;
    dt = Math.min(dt, 0.1);
    this.t += dt;
    if (this.muerto) return this.actualizarMuerte(dt);
    if (!this.listo) return;
    const v0 = Math.hypot(this.vx, this.vz); this.vel += (v0 - this.vel) * Math.min(1, dt * 7);
    if (this.vel > 0.12 && !(this.acc && this.acc.n === 'emerger')) this.fase += (this.vel / this.P.anim.zancada) * 6.2832 * dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    animarVivo(this, dt, this.t);
    // anticipación visible: el brillo sube durante el amago de cada ataque
    let tel = 0;
    if (this.acc) { const u = this.acc.t / this.acc.dur; tel = u < 0.55 ? u / 0.55 : Math.max(0, 1 - (u - 0.55) / 0.3); if (this.acc.n === 'emerger' || this.acc.n === 'aturdir') tel = 0; }
    this.tel += (tel - this.tel) * Math.min(1, dt * 12);
    this.furiaK += ((this.st.furia ? 1 : 0) - this.furiaK) * Math.min(1, dt * 4);
    const k = 1 + this.tel * 2.4 + this.furiaK * 1.2 + this.flash * 1.5 + (this.st.ardiendo ? 0.5 : 0);
    for (const e of this.emisivos) e.m.emissiveIntensity = e.base * k * (0.92 + 0.08 * Math.sin(this.t * 8 + e.base * 7));
    this.aplicar();
    for (const f of this.extras) f(this, dt, this.t);
  }
  aplicar() {
    const q = this.q, A = this.A;
    this.nodo.position.set(q.ofx, q.oy, q.ofz);
    this.nodo.rotation.set(q.pitch, q.yaw, q.roll, ORDEN);
    for (let j = 1; j < NJ; j++) this.piv[j].rotation.set(A[j * 3], A[j * 3 + 1], A[j * 3 + 2]);
    this.piv[J.X0].scale.setScalar(q.sX0);
  }
  actualizarMuerte(dt) {
    const m = this.muerto; m.t += dt;
    if (m.fase === 'colapso') {
      const u = Math.min(1, m.t / 1.7), e = u * u;
      const A = this.A; A.fill(0); const q = this.q;
      A[J.MUSLO_I * 3] = -1.0 * e; A[J.MUSLO_D * 3] = -0.8 * e; A[J.TIBIA_I * 3] = 1.5 * e; A[J.TIBIA_D * 3] = 1.3 * e;
      A[J.TORSO * 3] = 0.8 * e + Math.sin(m.t * 30) * 0.03; A[J.CABEZA * 3] = 0.5 * e; A[J.BRAZO_I * 3] = -0.3 * e; A[J.BRAZO_D * 3] = -0.2 * e; A[J.MANDIBULA * 3] = 1.0 * e;
      q.oy = -0.7 * e; q.ofz = 0.3 * e; q.pitch = 0.1 * e; q.ofx = Math.sin(m.t * 45) * 0.06 * u; q.roll = Math.sin(m.t * 37) * 0.03 * u;
      for (const em of this.emisivos) em.m.emissiveIntensity = em.base * (1 + 6 * e) * (0.8 + 0.2 * Math.sin(m.t * 40));
      this.aplicar();
      if ((m.t * 12) % 1 < dt * 12) this.juego.fx?.emitir?.('chispas', { x: this.x + (this.rng() - 0.5) * 2, y: 0.8 + this.rng() * 2.5, z: this.z + (this.rng() - 0.5) * 2 }, { escala: 1, cantidad: 5 });
      if (m.t > 1.7) this.explotar();
    } else {
      let vivos = 0;
      for (const c of this.chunks) { if (this.pasoTrozo(c, dt)) vivos++; }
      if (m.t > 22 || vivos === 0 && m.t > 3) { this.liberarDefinitivo(); }
    }
  }
  explotar() {
    const m = this.muerto; m.fase = 'trozos'; m.t = 0;
    const fx = this.juego.fx, cx = this.x, cz = this.z;
    fx?.emitir?.('explosion_grande', { x: cx, y: 2, z: cz }, { escala: 2.2 });
    fx?.emitir?.('sangre_grande', { x: cx, y: 2, z: cz }, { escala: 2 });
    fx?.emitir?.('fuego', { x: cx, y: 1.5, z: cz }, { escala: 1.6 });
    fx?.destello?.({ x: cx, y: 2, z: cz }, 0xffaa55, 8, 0.5, 14);
    fx?.calco?.('quemadura', cx, cz, 5); fx?.calco?.('sangre', cx, cz, 4.5);
    this.juego.render?.sacudir?.(1, 1.2); this.juego.camaraLenta?.(0.3, 1.3);
    this.raiz.updateMatrixWorld(true);
    const centro = new THREE.Vector3(cx, 1.8, cz);
    const meshes = []; this.raiz.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const mesh of meshes) {
      const p = new THREE.Vector3(), qq = new THREE.Quaternion(), s = new THREE.Vector3();
      mesh.matrixWorld.decompose(p, qq, s);
      mesh.removeFromParent();
      mesh.position.copy(p); mesh.quaternion.copy(qq); mesh.scale.copy(s);
      this.escena.add(mesh);
      const dir = p.clone().sub(centro); const d = Math.max(0.5, dir.length()); dir.divideScalar(d);
      const rad = Math.max(0.08, Math.min(s.x, s.y, s.z) * 0.35 + Math.max(s.x, s.y, s.z) * 0.15);
      const imp = 5 + this.rng() * 8;
      this.chunks.push({ mesh, rad, v: new THREE.Vector3(dir.x * imp + (this.rng() - 0.5) * 3, 4 + this.rng() * 9 + Math.max(0, 3 - d), dir.z * imp + (this.rng() - 0.5) * 3),
        w: new THREE.Vector3((this.rng() - 0.5) * 14, (this.rng() - 0.5) * 14, (this.rng() - 0.5) * 14), dorm: false, t: 0, hund: 0 });
    }
    this.raiz.visible = true;
    for (const e of this.emisivos) e.m.emissiveIntensity = e.base * 3;
  }
  pasoTrozo(c, dt) {
    const m = c.mesh; c.t += dt;
    if (c.t > 18) { c.hund += dt * 0.5; m.position.y -= dt * 0.5; if (c.hund > 1.6) { m.visible = false; return false; } }
    if (c.dorm) return true;
    c.v.y -= 9.81 * dt; m.position.addScaledVector(c.v, dt);
    m.rotation.x += c.w.x * dt; m.rotation.y += c.w.y * dt; m.rotation.z += c.w.z * dt;
    if (m.position.y < c.rad) {
      m.position.y = c.rad;
      if (c.v.y < -1.5) { c.v.y *= -0.32; c.v.x *= 0.7; c.v.z *= 0.7; c.w.multiplyScalar(0.6); if (c.rad > 0.3 && this.rng() < 0.4) this.juego.fx?.emitir?.('polvo', { x: m.position.x, y: 0.1, z: m.position.z }, { escala: c.rad * 1.5 }); }
      else { c.v.y = 0; c.v.x *= 0.9; c.v.z *= 0.9; c.w.multiplyScalar(0.85); if (c.v.lengthSq() < 0.05 && c.w.lengthSq() < 0.1) c.dorm = true; }
    }
    return true;
  }
  liberarDefinitivo() { this.liberar(); }
}

export function crearVisualJefe(sis, jefeId) {
  const v = new VisualJefe(sis, jefeId);
  return v;
}
