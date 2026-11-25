// Sistema de la horda: visuales de zombis instanciados (clases) y jefes; muertes físicas, restos y reciclaje.
import * as THREE from 'three';
import { crearRng } from '../../nucleo/util.js';
import { Granja } from './granja.js';
import { crearModeloZombi } from './cuerpo.js';
import { NJ } from './matematica.js';
import { animarVivo, construirJoints, DUR_ACCION } from './animacion.js';
import { iniciarMuerte, actualizarMuerto, actualizarResto } from './muerte.js';
import { crearVisualJefe } from './jefes.js';
import { RIM_ZOMBI } from './materiales.js';

const TINTE = {
  ralentizado: [0.12, 0.34, 0.8, 0.38], envenenado: [0.18, 0.62, 0.08, 0.34], furia: [0.85, 0.06, 0.04, 0.32],
};
const NINGUNO = [0, 0, 0, 0];

class VisualZombi {
  constructor(sis, claseId, eraIdx, o = {}) {
    this.sis = sis; this.clase = claseId; this.era = eraIdx;
    this.semilla = (o.semilla ?? Math.floor(Math.random() * 1e9)) >>> 0; this.elite = !!o.elite;
    const b = crearModeloZombi(claseId, eraIdx, this.semilla, this.elite);
    this.modelo = b.modelo; this.rest = b.rest; this.d = b.d; this.P = b.P; this.altura = b.altura; this.brazoFalta = b.brazoFalta; this.anclas = b.anclas;
    this.rng = crearRng(this.semilla ^ 0x9e3779b9);
    this.desfase = this.rng() * 6.283; this.fase = this.rng() * 6.283;
    this.x = 0; this.z = 0; this.y = 0; this.rot = 0; this.vx = 0; this.vz = 0; this.vel = 0;
    this.st = { ardiendo: false, ralentizado: false, furia: false, cargando: false, envenenado: false, invisible: false };
    this.acc = null; this.golpe = null; this.vivo = true; this.estadoV = 'vivo'; this.mascara = 0; this.visible_ = true;
    this.A = new Float32Array(NJ * 3); this.q = { oy: 0, ofz: 0, ofx: 0, pitch: 0, roll: 0, yaw: 0, sX0: 1, sc: 1 };
    this.W = new Float32Array(NJ * 12);
    this.fx = new Float32Array(4); this.tinte = [0, 0, 0, 0];
    this.flash = 0; this.dentro = true; this.nivel = 0;
    this.listo = false;
  }
  get radioVis() { return this.d.W * 0.5; }
  colocar(x, z, rot) { if (!this.vivo) return; this.x = x; this.z = z; this.rot = rot; this.listo = true; }
  mover(vx, vz) { this.vx = vx; this.vz = vz; }
  accion(nombre, o = {}) {
    if (!this.vivo) return;
    if (nombre === 'golpe') { this.golpe = { t: 0, dur: Math.max(0.2, o.duracion || 0.3), dx: o.dirX || 0, dz: o.dirZ || 0, fuerza: 1 }; return; }
    if (nombre === 'cuerpo') nombre = 'atacar';
    if (!(nombre in DUR_ACCION)) return;
    this.acc = { n: nombre, t: 0, dur: Math.max(0.2, o.duracion || DUR_ACCION[nombre]), dx: o.dirX || 0, dz: o.dirZ || 0, salto: !!o.salto };
    if (nombre === 'emerger') this.sis.juego.fx?.emitir?.('polvo', { x: this.x, y: 0.1, z: this.z }, { escala: 0.6 + this.d.W * 0.4 });
  }
  estado(n, on) { if (n in this.st) this.st[n] = !!on; }
  destello() { this.flash = 1; }
  visible(v) { this.visible_ = !!v; }
  equipar() {} vestir() {}
  boca(out = new THREE.Vector3()) { return out.set(this.x + Math.sin(this.rot) * 0.5, this.altura * 0.85, this.z + Math.cos(this.rot) * 0.5); }
  morir(info = {}) { if (!this.vivo) return; iniciarMuerte(this.sis, this, info); }
  liberar() {
    const s = this.sis;
    this.emisor?.detener?.(); this.emisor = null;
    let i = s.items.indexOf(this); if (i >= 0) { s.items[i] = s.items[s.items.length - 1]; s.items.pop(); }
    i = s.cadaveres.indexOf(this); if (i >= 0) s.cadaveres.splice(i, 1);
    this.vivo = false; this.liberado = true;
  }
}

export function crearVisualesZombis(juego) {
  const sis = { juego, rng: crearRng(20240611), items: [], restos: [], jefes: [], cadaveres: [], maxCadaveres: 56, maxRestos: 110, t: 0 };
  let granja = null;
  const frustum = new THREE.Frustum(), mat = new THREE.Matrix4(), esf = new THREE.Sphere();
  const asegurar = () => { if (!granja && juego.render?.escena) granja = sis.granja = new Granja(juego.render.escena); return granja; };
  const calidad = () => juego.opciones?.calidad;

  function crear(claseId, eraIdx, opciones) {
    asegurar();
    const v = new VisualZombi(sis, claseId, eraIdx ?? juego.estado?.eraIdx ?? 0, opciones || {});
    sis.items.push(v);
    return v;
  }
  function crearJefe(jefeId) {
    const v = crearVisualJefe(sis, jefeId);
    sis.jefes.push(v);
    return v;
  }

  function actualizar(dt) {
    if (!granja) { for (const j of sis.jefes) j.actualizar?.(dt); return; }
    dt = Math.min(dt, 0.1);
    sis.t += dt;
    const t = sis.t;
    RIM_ZOMBI.value = 1 + 1.1 * (juego.render?.ambienteActual?.noche ?? 0);
    const cam = juego.render?.camara;
    let cx = 0, cz = 0;
    if (cam) { cam.updateMatrixWorld?.(); mat.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(mat); cx = cam.position.x; cz = cam.position.z; }
    const items = sis.items;
    const masa = items.length > 190;
    granja.inicio();
    for (let n = 0; n < items.length; n++) {
      const it = items[n];
      if (!it.listo && it.vivo) continue;
      if (it.vivo) {
        const v0 = Math.hypot(it.vx, it.vz);
        it.vel += (v0 - it.vel) * Math.min(1, dt * 9);
        const k = (it.acc && it.acc.n === 'emerger') ? 0 : 1;
        if (it.vel > 0.12 && k) it.fase += (it.vel / it.P.anim.zancada) * 6.2832 * dt;
        // estados → tinte / brillo
        let tg = NINGUNO;
        if (it.st.furia) tg = TINTE.furia; else if (it.st.envenenado) tg = TINTE.envenenado; else if (it.st.ralentizado) tg = TINTE.ralentizado;
        const T = it.tinte, a = Math.min(1, dt * 6);
        T[0] += (tg[0] - T[0]) * a; T[1] += (tg[1] - T[1]) * a; T[2] += (tg[2] - T[2]) * a; T[3] += (tg[3] - T[3]) * a;
        const fx = it.fx;
        fx[0] = it.st.ardiendo ? 0.5 + 0.3 * Math.sin(t * 17 + it.desfase) : (it.st.furia ? 0.1 + 0.05 * Math.sin(t * 9) : Math.max(0, fx[0] - dt * 2));
        if (it.st.ardiendo) fx[1] = Math.min(0.55, fx[1] + dt * 0.1);
        it.flash = Math.max(0, it.flash - dt * 7); fx[2] = it.flash * 0.55;
        animarVivo(it, dt, t);
        const dx = it.x - cx, dz = it.z - cz;
        esf.center.set(it.x, 1, it.z); esf.radius = 2.4;
        it.dentro = it.visible_ && !it.st.invisible && (!cam || frustum.intersectsSphere(esf));
        if (!it.dentro) continue;
        it.nivel = (masa || dx * dx + dz * dz > 45 * 45) ? 1 : 0;
        construirJoints(it, it.W);
      } else {
        const ok = actualizarMuerto(sis, it, dt);
        if (!ok) { it.liberar(); n--; continue; }
        esf.center.set(it.varilla.cx, 1, it.varilla.cz); esf.radius = 2.6;
        it.dentro = it.visible_ && (!cam || frustum.intersectsSphere(esf));
        if (!it.dentro) continue;
        it.nivel = masa ? 1 : 0;
      }
      granja.escribir(it.modelo, it.W, 0, it.mascara, it.fx, it.tinte, t, it.nivel, it.semilla);
    }
    for (let n = 0; n < sis.restos.length; n++) {
      const r = sis.restos[n];
      if (!actualizarResto(sis, r, dt)) { sis.restos.splice(n, 1); n--; continue; }
      granja.escribir(r.modelo, r.W, 0, r.mascara, r.fx, r.tinte, t, 1, r.semilla);
    }
    granja.fin();
    for (const j of sis.jefes) j.actualizar?.(dt);
  }

  function limpiar() {
    for (const it of sis.items) { it.emisor?.detener?.(); }
    sis.items.length = 0; sis.restos.length = 0; sis.cadaveres.length = 0;
    for (const j of [...sis.jefes]) j.liberar?.(true);
    sis.jefes.length = 0;
    granja?.limpiar(); granja = null; sis.granja = null;
  }

  return {
    crear, crearJefe, actualizar, limpiar,
    /** Depuración / pruebas */
    sis, get estadisticas() { return { zombis: sis.items.length, cadaveres: sis.cadaveres.length, restos: sis.restos.length, instancias: granja ? Array.from(granja.n).reduce((a, b) => a + b, 0) : 0, mallas: granja ? granja.meshes.filter((m) => m && m.count > 0).length : 0 }; },
  };
}
