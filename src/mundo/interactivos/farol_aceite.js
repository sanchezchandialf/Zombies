// 1800 · Farol de aceite sobre poste de hierro forjado. Llama emisiva con luz y parpadeo. Si le disparan o lo derriba un vehículo,
// el poste cae y el aceite derramado crea una zona de fuego.
// Opciones de crear: { x, z, rot, altura=3.2, encendido=true, fuego=true (zona de fuego al caer) }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, rango } from './comun.js';

class FarolAceite extends Interactivo {
  constructor(juego, o) {
    super(juego, 'farol_aceite', o, { vida: 22, material: 'metal', radio: 0.35, resist: { fuego: 0, veneno: 0, acido: 0.5 } });
    this.H = o.altura ?? 3.2;
    this.cae = 0; this.vel = 0; this.dirL = { x: 0, z: 1 }; this.caido = false; this.encendido = o.encendido !== false;
    this.poste = new THREE.Group(); this.grupo.add(this.poste);
    this._modelo();
    this.cuerpo({ forma: 'circulo', x: this.pos.x, z: this.pos.z, radio: 0.16, masa: 0, capa: CAPA.ESTRUCTURA });
    this.luzFarol = this.encendido ? this.luz({ x: this.pos.x, y: this.H - 0.2, z: this.pos.z, color: 0xff9a45, intensidad: 42, distancia: 11 }) : null;
    this.estado = 'disponible';
  }

  _modelo() {
    const m = this.malla(), hf = ['hierro_forjado', { color: 0x1d1f22 }], H = this.H;
    // basamento moldurado de fundición
    m.add(torno([[0, 0], [0.26, 0], [0.27, 0.04], [0.22, 0.1], [0.2, 0.22], [0.16, 0.34], [0.13, 0.55], [0.0, 0.55]], 24), hf, {});
    m.add(toro(0.15, 0.025, 20, 8), hf, { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0] });
    // fuste fino con collarines
    m.add(cil(0.055, 0.075, H - 0.6, 16), hf, { p: [0, 0.6 + (H - 0.6) / 2, 0] });
    for (const y of [1.1, 2.0, H - 0.5]) m.add(toro(0.07, 0.02, 16, 8), hf, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
    // brazo curvado con volutas
    m.add(tubo([[0, H - 0.45, 0], [0.0, H - 0.1, 0.14], [0, H + 0.12, 0.38], [0, H + 0.1, 0.62]], 0.026, 20, 7), hf, {});
    m.add(tubo([[0, H - 0.5, 0], [0, H - 0.35, 0.3], [0, H - 0.1, 0.42], [0, H - 0.0, 0.3]], 0.016, 16, 6), hf, {});
    m.add(esfera(0.05, 12), hf, { p: [0, H + 0.14, 0.0] });
    // farol: pie, cuerpo de latón con cristales, tejadillo y anilla
    const fz = 0.62, fy = H - 0.55;
    const lat = ['laton_bronce', { desgaste: 0.6 }];
    m.add(torno([[0, 0], [0.12, 0], [0.14, 0.03], [0.1, 0.06], [0.0, 0.06]], 16), lat, { p: [0, fy, fz] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.add(cil(0.012, 0.012, 0.36, 6), lat, { p: [sx * 0.105, fy + 0.24, fz + sz * 0.105] });
    m.add(caja(0.28, 0.025, 0.28, 0.01), lat, { p: [0, fy + 0.43, fz] });
    m.add(torno([[0, 0], [0.2, 0], [0.18, 0.04], [0.1, 0.12], [0.03, 0.17], [0.0, 0.2]], 4), lat, { p: [0, fy + 0.44, fz], r: [0, Math.PI / 4, 0] });
    m.add(toro(0.035, 0.008, 12, 6), lat, { p: [0, fy + 0.66, fz], r: [0, 0, 0] });
    m.add(cil(0.012, 0.012, 0.06, 6), lat, { p: [0, fy + 0.63, fz] });
    this.construir(m, this.poste);
    // cristal
    const v = this.malla();
    v.add(caja(0.2, 0.34, 0.2, 0.012), ['cristal', { color: 0xffe0b0 }], { p: [0, fy + 0.24, fz] });
    this.construir(v, this.poste, { sombra: false });
    // llama (material propio, animada)
    this.matLlama = this.propio(emisivo(0xff8a24, 3.2, { transparent: true, opacity: 0.95 }));
    const lg = torno([[0, 0], [0.045, 0.02], [0.055, 0.07], [0.04, 0.14], [0.02, 0.2], [0.0, 0.27]], 12);
    this.llama = new THREE.Mesh(lg, this.matLlama);
    this.llama.position.set(0, fy + 0.1, fz);
    this.llama.visible = this.encendido; this.llama.castShadow = false;
    this.poste.add(this.llama);
    this.llamaCentro = new THREE.Mesh(esfera(0.03, 8), this.propio(emisivo(0xfff0b0, 4)));
    this.llamaCentro.position.set(0, fy + 0.15, fz); this.llamaCentro.visible = this.encendido;
    this.poste.add(this.llamaCentro);
    this.fy = fy; this.fz = fz;
    this._extras.push(this.llama.geometry, this.llamaCentro.geometry);
  }

  _posFarol(out) {
    // posición mundo de la llama
    this.poste.updateWorldMatrix(true, false);
    return out.copy(this.llama.position).applyMatrix4(this.poste.matrixWorld);
  }

  derribar(dx, dz) {
    if (this.caido || this.cae > 0) return;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    this.dirW = { x: dx, z: dz };
    this.dirL = { x: dx * c - dz * s, z: dx * s + dz * c };
    this.cae = 0.001; this.estado = 'activo'; this.vivo = false;
    this.quitarCuerpo(this._cuerpos[0]);
    this.sonido('metal_cae', { volumen: 0.8 });
  }

  paso(dt) {
    const tmp = this._tmp || (this._tmp = new THREE.Vector3());
    if (this.cae > 0 && !this.caido) {
      this.vel += 9 * dt; this.cae += this.vel * dt;
      if (this.cae >= 1.5) { this.cae = 1.5; this.caido = true; this._alSuelo(); }
      const eje = this._eje || (this._eje = new THREE.Vector3());
      eje.set(this.dirL.z, 0, -this.dirL.x);
      this.poste.quaternion.setFromAxisAngle(eje, this.cae);
    } else if (!this.caido && this.vivo && this.encendido) {
      // detección de atropello
      for (const v of this.juego.vehiculos?.lista || []) {
        if (!v || v.vivo === false || !v.pos) continue;
        const sp = v.velocidad ?? 0;
        if (Math.abs(sp) < 2.5) continue;
        if (Math.hypot(v.pos.x - this.pos.x, v.pos.z - this.pos.z) < (v.radio ?? 1.2) + 0.55) {
          const sg = Math.sign(sp); this.derribar(Math.sin(v.rot ?? 0) * sg, Math.cos(v.rot ?? 0) * sg); break;
        }
      }
    }
    // parpadeo de la llama
    if (this.encendido) {
      const f = 0.85 + Math.sin(this.t * 17 + 1.3) * 0.07 + Math.sin(this.t * 41) * 0.05 + rango(-0.04, 0.04);
      this.llama.scale.set(1 + (f - 0.85) * 0.6, f * 1.15, 1 + (f - 0.85) * 0.6);
      this.llama.rotation.y += dt * 3;
      this.matLlama.emissiveIntensity = 2.6 + f * 1.4;
      if (this.luzFarol) {
        this._posFarol(tmp);
        this.luzFarol.pos.copy(tmp); this.luzFarol.intensidad = (this.caido ? 28 : 42) * (f + 0.15);
      }
    }
    if (this.caido) {
      this.tCaido = (this.tCaido || 0) + dt;
      if (this.tCaido > (this.opciones.fuegoDuracion ?? 9) && this.encendido) this._apagar();
    }
  }

  _alSuelo() {
    const p = this._posFarol(new THREE.Vector3());
    this.sonido('vidrio_rotura', { volumen: 0.7 });
    this.escombros({ x: p.x, y: 0.2, z: p.z, cantidad: 8, material: 'vidrio', fuerza: 3 });
    this.fx('chispas', p.x, 0.2, p.z, { cantidad: 12 });
    this.sacudir(0.08, 0.2);
    if (this.opciones.fuego !== false) {
      this.zonaFuego = this.zona({ x: p.x, z: p.z, radio: 2.1, duracion: this.opciones.fuegoDuracion ?? 9, dps: 8 });
      this.emFuego = this.emisor('fuego', p.x, 0.1, p.z, { escala: 1.6, duracion: this.opciones.fuegoDuracion ?? 9 });
      this.calco('quemadura', p.x, p.z, 3.2);
      this.calco('aceite', p.x, p.z, 2.4);
    }
    this.llama.scale.setScalar(1.8);
  }
  _apagar() {
    this.encendido = false; this.llama.visible = false; this.llamaCentro.visible = false;
    this.quitarLuz(this.luzFarol); this.luzFarol = null; this.estado = 'destruido';
    this.quitarEmisor(this.emFuego);
  }

  recibirDanio(info) {
    if (this.caido || this.cae > 0 || !info) return 0;
    const real = super.recibirDanio(info);
    return real;
  }
  alDestruirse(info) {
    this.vivo = true; // super lo marcó muerto; derribar lo gestiona
    let dx = info?.dirX, dz = info?.dirZ;
    if (dx === undefined || dz === undefined || (!dx && !dz)) { dx = this.pos.x - (info?.x ?? this.pos.x - 1); dz = this.pos.z - (info?.z ?? this.pos.z); }
    this.derribar(dx, dz);
  }
}
registrarTipo('farol_aceite', (juego, o) => new FarolAceite(juego, o));
