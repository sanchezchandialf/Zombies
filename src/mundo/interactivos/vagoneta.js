// 1850 · Vagoneta minera sobre raíl: al empujarla sale lanzada arrollando zombis; si lleva dinamita explota al final del raíl.
// Opciones de crear: { x, z, rot (dirección del raíl: +Z local), largo=26 (m de raíl), dinamita=true, velocidad=16 }
// (x,z) es el extremo de salida del raíl; sin dinamita se detiene al final y puede empujarse de vuelta.
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, extruir, lim } from './comun.js';

class Vagoneta extends Interactivo {
  constructor(juego, o) {
    super(juego, 'vagoneta', o, { vida: 100, material: 'metal', radio: 1 });
    this.largo = o.largo ?? 26; this.dinamita = o.dinamita !== false; this.vmax = o.velocidad ?? 16;
    this.s = 0.9; this.v = 0; this.sentido = 1; this.fase = 'reposo'; this.ang = 0; this.golpeados = new Set();
    this.dir = { x: Math.sin(this.rot), z: Math.cos(this.rot) };
    this._raiL(); this._modelo();
    this.cb = this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: 0.6, hz: 0.9, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA, mascara: 0 });
    this._colocar();
    this.registrar({ radioUso: 2.3, etiqueta: () => (this.fase === 'reposo' ? 'Empujar la vagoneta' : 'En marcha'), puedeUsar: () => this.fase === 'reposo' && this.vivo, usar: () => this.lanzar() });
  }
  _raiL() {
    const m = this.malla(), L = this.largo, hi = ['hierro_oxidado', { desgaste: 0.4 }];
    for (let s = 0.2; s < L; s += 0.8) m.add(caja(1.5, 0.1, 0.2, 0.02), 'tablas_viejas', { p: [0, 0.07, s] });
    for (const k of [-0.5, 0.5]) m.add(caja(0.07, 0.1, L, 0.02), hi, { p: [k, 0.17, L / 2] });
    // tope al final
    m.add(caja(1.6, 0.5, 0.3, 0.05), 'silleria', { p: [0, 0.25, L + 0.2] });
    m.add(caja(1.6, 0.4, 0.3, 0.05), 'silleria', { p: [0, 0.2, -0.3] });
    this.construir(m, this.grupo, { sombra: false });
  }
  _modelo() {
    this.car = new THREE.Group(); this.grupo.add(this.car);
    const m = this.malla(), hi = ['hierro_forjado', { color: 0x2a2c2e, desgaste: 0.5 }], ox = ['hierro_oxidado', { desgaste: 0.6 }];
    // caja con perfil trapezoidal (extruida en X)
    const perfil = [[-0.9, 0.32], [0.9, 0.32], [1.0, 1.05], [-1.0, 1.05]];
    const g = extruir(perfil.map(([z, y]) => [z, y]), 1.1, 0.04); g.rotateY(Math.PI / 2);
    m.add(g, ox, {});
    m.add(extruir([[-0.92, 0.33], [0.92, 0.33], [0.98, 0.55], [-0.98, 0.55]], 1.18, 0.02).rotateY(Math.PI / 2), hi, {});
    m.add(caja(1.2, 0.07, 2.12, 0.03), hi, { p: [0, 1.08, 0] }); // borde (vacío visual: se tapa abajo)
    for (const z of [-1.0, 1.0]) m.add(caja(1.15, 0.07, 0.09, 0.02), hi, { p: [0, 1.08, z] });
    for (const x of [-0.6, 0.6]) m.add(caja(0.09, 0.07, 2.1, 0.02), hi, { p: [x, 1.08, 0] });
    // remaches
    for (let i = 0; i < 8; i++) for (const x of [-0.57, 0.57]) m.add(esfera(0.022, 6), hi, { p: [x * (1 + 0.0), 0.5 + (i % 2) * 0.35, -0.85 + i * 0.24] });
    // enganches y chasis
    m.add(caja(0.7, 0.1, 2.4, 0.03), hi, { p: [0, 0.32, 0] });
    for (const z of [-1.3, 1.3]) { m.add(cil(0.04, 0.04, 0.35, 8), hi, { p: [0, 0.34, z * 0.95], r: [Math.PI / 2, 0, 0] }); m.add(toro(0.07, 0.014, 12, 6), hi, { p: [0, 0.34, z * 1.0 + Math.sign(z) * 0.28], r: [0, Math.PI / 2, 0] }); }
    this.construir(m, this.car);
    // ruedas
    this.ruedas = [];
    for (const z of [-0.65, 0.65]) for (const x of [-0.5, 0.5]) {
      const w = new THREE.Group(); w.position.set(x, 0.25, z);
      const r = this.malla();
      r.add(cil(0.19, 0.19, 0.08, 20), hi, { r: [0, 0, Math.PI / 2] });
      r.add(cil(0.21, 0.21, 0.025, 20), hi, { p: [x > 0 ? -0.045 : 0.045, 0, 0], r: [0, 0, Math.PI / 2] });
      for (let i = 0; i < 4; i++) r.add(caja(0.09, 0.03, 0.35, 0.01), ox, { r: [i * Math.PI / 4, 0, 0] });
      this.construir(r, w); this.car.add(w); this.ruedas.push(w);
    }
    if (this.dinamita) {
      const d = this.malla();
      for (let i = 0; i < 3; i++) d.add(caja(0.34, 0.28, 0.45, 0.03), 'tablas_pintadas', { p: [-0.35 + i * 0.35, 1.0, (i % 2) * 0.1 - 0.4], r: [0, i * 0.08, 0] });
      for (let i = 0; i < 14; i++) d.add(cil(0.035, 0.035, 0.34, 8), ['acero_pintado', { color: 0xb02a1a }], { p: [-0.45 + (i % 7) * 0.15, 1.18 + (i < 7 ? 0 : 0.07), 0.38 + (i < 7 ? 0 : 0.04)], r: [0, 0, Math.PI / 2 + (i % 3) * 0.02] });
      d.add(tubo([[-0.4, 1.3, 0.4], [-0.1, 1.5, 0.2], [0.3, 1.45, 0.45], [0.55, 1.2, 0.5]], 0.012, 12, 5), ['cuerda', { color: 0x55452e }], {});
      this.construir(d, this.car);
      this.mecha = new THREE.Mesh(esfera(0.03, 8), this.propio(emisivo(0xffb040, 5))); this.mecha.position.set(0.55, 1.2, 0.5); this.car.add(this.mecha); this._extras.push(this.mecha.geometry);
    }
  }
  _colocar() {
    const s = this.s, x = this.pos.x + this.dir.x * s, z = this.pos.z + this.dir.z * s;
    this.car.position.set(0, 0, s); // en el sistema local del grupo
    this.cb.x = x; this.cb.z = z; this.juego.fisica?.marcarEstaticosSucios?.();
    this.centro = { x, z };
  }
  lanzar() {
    if (this.fase !== 'reposo') return;
    this.fase = 'lanzada'; this.estado = 'activo'; this.v = 3; this.golpeados.clear();
    this.sonido('vagoneta_rail', { volumen: 0.9 }); this.fx('chispas', this.centro.x, 0.2, this.centro.z, { cantidad: 8 });
    this.bucleSnd = this.bucle('vagoneta_rail', { volumen: 0.8 });
  }
  paso(dt) {
    if (this.fase === 'lanzada') {
      this.v = Math.min(this.vmax, this.v + 9 * dt);
      this.s += this.v * dt * this.sentido;
      const fin = this.sentido > 0 ? this.s >= this.largo - 0.7 : this.s <= 0.9;
      this.s = lim(this.s, 0.9, this.largo - 0.7);
      this._colocar();
      const a = (this.v / 0.22) * dt * this.sentido; for (const w of this.ruedas) w.rotation.x += a;
      this.car.position.y = Math.sin(this.t * 55) * 0.006;
      if (Math.random() < dt * 14) this.fx('chispas', this.centro.x, 0.2, this.centro.z, { cantidad: 2 });
      this._arrollar();
      this.bucleSnd?.ajustar?.({ x: this.centro.x, z: this.centro.z });
      if (fin) this._llegar();
    }
    if (this.mecha) this.mecha.material.emissiveIntensity = 3 + Math.sin(this.t * 40) * 2;
  }
  _arrollar() {
    const dx = this.dir.x * this.sentido, dz = this.dir.z * this.sentido;
    const probar = (e, danio) => {
      if (!e || e.vivo === false || e === this || this.golpeados.has(e) || !e.pos) return;
      const rx = e.pos.x - this.centro.x, rz = e.pos.z - this.centro.z, a = rx * dx + rz * dz, l = rx * -dz + rz * dx;
      if (a < -1.1 || a > 1.3 || Math.abs(l) > 0.9 + (e.radio ?? 0.4)) return;
      this.golpeados.add(e);
      const sg = l >= 0 ? 1 : -1;
      const info = { cantidad: danio, tipo: 'golpe', atacante: null, x: e.pos.x, z: e.pos.z, dirX: dx * 0.7 - dz * sg * 0.5, dirZ: dz * 0.7 + dx * sg * 0.5, empuje: 7 };
      this.danioA(e, info); e.empujar?.(info.dirX * 400, info.dirZ * 400);
      this.fx('sangre', e.pos.x, 1, e.pos.z, { dirX: info.dirX, dirZ: info.dirZ }); this.sacudir(0.12, 0.15);
    };
    for (const z of this.juego.zombis || []) probar(z, 140);
    for (const j of this.juego.jugadores || []) probar(j, 30);
  }
  _llegar() {
    this.bucleSnd?.detener?.(); this.bucleSnd = null;
    if (this.dinamita && this.sentido > 0) return this.detonar();
    this.fase = 'reposo'; this.v = 0; this.sentido *= -1; this.estado = 'disponible';
    this.sonido('choque_metal', { x: this.centro.x, z: this.centro.z }); this.fx('chispas', this.centro.x, 0.5, this.centro.z, { cantidad: 14 });
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.centro.x, 0.8, info.z ?? this.centro.z, { cantidad: 4 }); }
  alDestruirse() { if (this.dinamita) this.detonar(); else { this.grupo.visible = false; } }
  detonar() {
    if (this._det) return; this._det = true; this.vivo = false; this.estado = 'destruido';
    const { x, z } = this.centro;
    this.explotar({ x, z, radio: 7, danio: 210, empuje: 12, y: 0.8 });
    this.fx('explosion_grande', x, 0.8, z, { escala: 1.2 }); this.calco('crater', x, z, 3.2);
    this.escombros({ x, y: 1, z, cantidad: 10, material: 'metal', fuerza: 8 });
    this.sacudir(0.5, 0.5);
    this.car.visible = false; this.quitarCuerpo(this.cb);
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
}
registrarTipo('vagoneta', (juego, o) => new Vagoneta(juego, o));
