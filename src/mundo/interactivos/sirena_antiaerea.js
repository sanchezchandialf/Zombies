// 1900 · Sirena antiaérea de manivela: atrae zombis 10 s y, a los 6 s, cae una salva de artillería sobre la zona marcada.
// Opciones de crear: { x, z, rot, objetivo:{x,z} (por defecto a 15 m en la dirección rot), radioZona=8, obuses=7, enfriamiento=45 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, emisivo, discoSuelo, matAditivo, lim, rango, suave } from './comun.js';

class SirenaAntiaerea extends Interactivo {
  constructor(juego, o) {
    super(juego, 'sirena_antiaerea', o, { vida: 130, material: 'metal', radio: 0.5 });
    const dx = Math.sin(this.rot), dz = Math.cos(this.rot);
    this.obj = o.objetivo || { x: this.pos.x + dx * 15, z: this.pos.z + dz * 15 };
    this.rz = o.radioZona ?? 8; this.nObuses = o.obuses ?? 7; this.enfri = o.enfriamiento ?? 45;
    this.fase = 'reposo'; this.tf = 0; this.shells = []; this.lanzados = 0; this.giro = 0; this.vg = 0;
    this._modelo();
    this.cuerpo({ forma: 'circulo', x: this.pos.x, z: this.pos.z, radio: 0.3, masa: 0, capa: CAPA.ESTRUCTURA });
    this.registrar({ radioUso: 2.2, etiqueta: () => (this.fase === 'reposo' ? (this.listo ? 'Girar la manivela' : 'La sirena se enfría') : 'Sirena en marcha'), puedeUsar: () => this.fase === 'reposo' && this.listo, usar: () => this.activar() });
  }
  _modelo() {
    const m = this.malla(), hi = ['hierro_forjado', { color: 0x2b2e30 }], gris = ['acero_pintado', { color: 0x6a7260, desgaste: 0.7 }];
    m.add(caja(0.9, 0.3, 0.9, 0.06), 'hormigon_bunker', { p: [0, 0.15, 0] });
    m.add(cil(0.1, 0.13, 2.3, 14), gris, { p: [0, 1.4, 0] });
    for (const y of [0.6, 1.4, 2.2]) m.add(toro(0.125, 0.018, 16, 6), hi, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
    // caja del mecanismo
    m.add(caja(0.5, 0.55, 0.42, 0.06), gris, { p: [0, 1.15, 0.28] });
    m.add(cil(0.1, 0.1, 0.2, 14), hi, { p: [0.31, 1.15, 0.28], r: [0, 0, Math.PI / 2] });
    // base del rotor
    m.add(cil(0.2, 0.17, 0.16, 18), hi, { p: [0, 2.58, 0] });
    this.construir(m);
    // rotor con cuatro bocinas
    this.rotor = new THREE.Group(); this.rotor.position.y = 2.7; this.grupo.add(this.rotor);
    const r = this.malla();
    r.add(cil(0.06, 0.06, 0.9, 8), hi, { r: [0, 0, Math.PI / 2] });
    r.add(cil(0.06, 0.06, 0.9, 8), hi, { r: [Math.PI / 2, 0, 0] });
    r.add(esfera(0.13, 14), hi, {});
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      r.add(torno([[0.06, 0], [0.065, 0.1], [0.12, 0.28], [0.2, 0.5], [0.24, 0.58], [0.22, 0.58], [0.17, 0.5], [0.1, 0.28], [0.05, 0.1]], 20), ['laton_bronce', { color: 0x9a5b2a, desgaste: 0.5 }], { p: [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4], r: [Math.sin(a) * Math.PI / 2, 0, -Math.cos(a) * Math.PI / 2 + 0] });
    }
    this.construir(r, this.rotor);
    // manivela
    this.manivela = new THREE.Group(); this.manivela.position.set(0.42, 1.15, 0.28); this.grupo.add(this.manivela);
    const mm = this.malla();
    mm.add(cil(0.02, 0.02, 0.5, 8), hi, { p: [0, 0.25, 0] });
    mm.add(cil(0.022, 0.022, 0.2, 8), ['madera_lacada', { color: 0x4a2d1a }], { p: [0.1, 0.5, 0], r: [0, 0, Math.PI / 2] });
    this.construir(mm, this.manivela);
    // luz de aviso
    this.mLuz = this.propio(emisivo(0xff2a10, 0));
    this.lampara = new THREE.Mesh(esfera(0.07, 10), this.mLuz); this.lampara.position.set(0, 2.78, 0); this.grupo.add(this.lampara); this._extras.push(this.lampara.geometry);
  }

  activar() {
    if (this.fase !== 'reposo' || !this.listo) return;
    this.fase = 'sonando'; this.tf = 0; this.estado = 'activo'; this.lanzados = 0; this.proxObus = 6.0;
    this.atraer(this.pos.x, this.pos.z, 45, 10);
    this.snd = this.bucle('sirena_antiaerea', { volumen: 1 });
    this.mensaje('¡Sirena antiaérea! Salva de artillería sobre la zona marcada.', 'aviso', 4);
    this.aviso = discoSuelo(this.rz, 0xff2a10, 0.0, { anillo: 0.1 }); this.aviso.position.set(this.obj.x, 0.06, this.obj.z);
    this.aviso2 = discoSuelo(this.rz, 0xff3a14, 0.0); this.aviso2.position.set(this.obj.x, 0.05, this.obj.z);
    this.propioObj(this.aviso, this._escena || this.grupo); this.propioObj(this.aviso2, this._escena || this.grupo);
    this.luzSirena = this.luz({ x: this.pos.x, y: 2.9, z: this.pos.z, color: 0xff3010, intensidad: 25, distancia: 9 });
  }
  _obus() {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * this.rz * 0.92;
    const x = this.obj.x + Math.cos(a) * r, z = this.obj.z + Math.sin(a) * r;
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(this._geoObus || (this._geoObus = torno([[0, -0.55], [0.1, -0.5], [0.12, -0.1], [0.1, 0.25], [0.06, 0.5], [0, 0.65]], 12)), this._matObus || (this._matObus = this.propio(new THREE.MeshStandardMaterial({ color: 0x3a3f33, roughness: 0.5, metalness: 0.6 }))));
    const estela = new THREE.Mesh(this._geoEst || (this._geoEst = cil(0.0, 0.14, 4, 8)), this._matEst || (this._matEst = matAditivo(0xffb060, 0.7)));
    estela.position.y = 2.6; this._extras.push(this._geoObus, this._geoEst);
    g.add(cuerpo, estela); g.rotation.x = Math.PI; g.position.set(x, 55, z);
    const anillo = discoSuelo(2.4, 0xffd0a0, 0.55, { anillo: 0.25 }); anillo.position.set(x, 0.07, z);
    (this._escena || this.grupo).add(g, anillo);
    this.shells.push({ x, z, t: 0, T: 1.15, g, anillo });
    this.sonido('obus_silbido', { x, z, volumen: 0.9 });
  }
  _impacto(s) {
    this.explotar({ x: s.x, z: s.z, radio: 6, danio: 150, empuje: 14, y: 0.5 });
    this.fx('explosion_grande', s.x, 0.6, s.z, { escala: 1.1 }); this.calco('crater', s.x, s.z, 3.2);
    this.escombros({ x: s.x, y: 0.5, z: s.z, cantidad: 8, material: 'piedra', fuerza: 7 }); this.sacudir(0.35, 0.35);
    s.g.removeFromParent(); s.anillo.removeFromParent(); s.anillo.geometry.dispose(); s.anillo.material.dispose();
  }
  paso(dt) {
    // rotor y manivela
    const objV = this.fase === 'sonando' ? 5.5 : 0; this.vg += (objV - this.vg) * Math.min(1, dt * 1.6);
    this.giro += this.vg * dt; this.rotor.rotation.y = this.giro; this.manivela.rotation.x = this.giro * 1.3;
    this.mLuz.emissiveIntensity = this.fase === 'sonando' ? (Math.sin(this.t * 10) > 0 ? 5 : 0.2) : 0;
    if (this.fase === 'sonando') {
      this.tf += dt;
      const p = 0.5 + 0.5 * Math.sin(this.t * 7), ap = lim(this.tf / 0.6, 0, 1);
      this.aviso.material.opacity = (0.35 + 0.4 * p) * ap * (this.tf > 6 ? 1 : 0.7); this.aviso2.material.opacity = (0.05 + 0.1 * p) * ap;
      if (this.luzSirena) this.luzSirena.intensidad = 10 + 25 * p;
      if (this.tf >= 6 && this.lanzados < this.nObuses && this.tf >= this.proxObus) { this._obus(); this.lanzados++; this.proxObus += rango(0.35, 0.6); }
      if (this.tf >= 10) this._detener();
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i]; s.t += dt; const k = s.t / s.T;
      s.g.position.y = 55 * (1 - k * k) + 0.5; s.anillo.material.opacity = 0.35 + 0.3 * Math.sin(s.t * 25);
      s.anillo.scale.setScalar(1 - 0.4 * k);
      if (s.t >= s.T) { this.shells.splice(i, 1); this._impacto(s); }
    }
    if (this.fase === 'cierre' && this.shells.length === 0) { this.fase = 'reposo'; this._limpiarAviso(); this.iniciarEnfriamiento(this.enfri); this.estado = 'enfriamiento'; }
    if (this.fase === 'reposo') this.estado = this.listo ? 'disponible' : 'enfriamiento';
  }
  _detener() {
    this.fase = 'cierre'; this.snd?.detener?.(); this.snd = null; this.quitarLuz(this.luzSirena); this.luzSirena = null;
  }
  _limpiarAviso() { for (const o of [this.aviso, this.aviso2]) if (o) { o.removeFromParent(); o.geometry.dispose(); o.material.dispose(); } this.aviso = this.aviso2 = null; }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 1.3, info.z ?? this.pos.z, { cantidad: 4 }); }
  alDestruirse() {
    this.snd?.detener?.(); this.fxAqui('explosion', 1.3, { escala: 0.7 }); this.escombros({ x: this.pos.x, y: 1, z: this.pos.z, cantidad: 8, material: 'metal', fuerza: 5 });
    this.rotor.rotation.z = 0.5; this.rotor.position.y = 0.4; this.manivela.visible = false; this.mLuz.emissiveIntensity = 0;
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
  alLimpiar() { this.snd?.detener?.(); this._limpiarAviso(); for (const s of this.shells) { s.g.removeFromParent(); s.anillo.removeFromParent(); } this.shells.length = 0; }
}
registrarTipo('sirena_antiaerea', (juego, o) => new SirenaAntiaerea(juego, o));
