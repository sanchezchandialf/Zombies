// 1800 · Campana de iglesia: armazón de madera con campana de bronce. Usarla o dispararle la repica y atrae zombis.
// Opciones de crear: { x, z, rot, enfriamiento=10 (s), radioAtraer=30, duracionAtraer=8 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo } from './comun.js';

const ALTO = 3.1, PIVOTE_Y = 2.72;

class CampanaIglesia extends Interactivo {
  constructor(juego, o) {
    super(juego, 'campana_iglesia', o, { vida: 160, material: 'madera', radio: 1.1, resist: { fuego: 0.5 } });
    this.enfri = o.enfriamiento ?? 10;
    this.amp = 0; this.fase = 0; this.golpes = [];
    this._modelo();
    this.cuerpo({ forma: 'circulo', x: this.pos.x + Math.cos(this.rot) * 0.95, z: this.pos.z - Math.sin(this.rot) * 0.95, radio: 0.2, masa: 0, capa: CAPA.ESTRUCTURA });
    this.cuerpo({ forma: 'circulo', x: this.pos.x - Math.cos(this.rot) * 0.95, z: this.pos.z + Math.sin(this.rot) * 0.95, radio: 0.2, masa: 0, capa: CAPA.ESTRUCTURA });
    this.registrar({ radioUso: 2.6, etiqueta: () => (this.listo ? 'Tocar la campana' : 'La campana aún vibra'), puedeUsar: () => this.listo, usar: () => this.repicar() });
  }

  _modelo() {
    const m = this.malla();
    const mad = ['madera_lacada', { color: 0x4a2d1a, desgaste: 0.7 }], vieja = 'tablas_viejas', hierro = 'hierro_forjado', piedra = 'silleria';
    // tarima de piedra
    m.add(caja(2.9, 0.18, 1.5, 0.05), piedra, { p: [0, 0.09, 0] });
    m.add(caja(2.6, 0.08, 1.25, 0.03), piedra, { p: [0, 0.22, 0] });
    for (const s of [-1, 1]) {
      // pórtico en A: dos montantes inclinados + pie
      for (const k of [-1, 1]) {
        m.add(caja(0.2, ALTO + 0.1, 0.2, 0.04), vieja, { p: [s * 0.95, 0.26 + ALTO / 2, k * 0.34], r: [k * -0.2, 0, s * 0.0] });
      }
      m.add(caja(0.26, 0.26, 0.9, 0.05), vieja, { p: [s * 0.95, 0.26 + 0.13, 0] });
      // riostra en X
      m.add(caja(0.09, 1.9, 0.09, 0.02), vieja, { p: [s * 0.95, 1.5, 0], r: [0, 0, 0.0] });
      m.add(caja(0.12, 0.12, 0.8, 0.03), vieja, { p: [s * 0.95, 1.35, 0] });
      // herraje del cojinete
      m.add(caja(0.3, 0.22, 0.34, 0.05), hierro, { p: [s * 0.95, PIVOTE_Y, 0] });
      for (const k of [-1, 1]) for (const j of [-1, 1]) m.add(esfera(0.028, 8), hierro, { p: [s * 0.95 + k * 0.11, PIVOTE_Y + j * 0.07, 0.175] });
    }
    // viga superior / eje
    m.add(caja(2.3, 0.26, 0.28, 0.06), vieja, { p: [0, ALTO + 0.14, 0] });
    m.add(cil(0.05, 0.05, 2.1, 14), hierro, { p: [0, PIVOTE_Y, 0], r: [0, 0, Math.PI / 2] });
    // tejadillo de tablas (a dos aguas)
    for (const k of [-1, 1]) m.add(caja(2.9, 0.07, 0.95, 0.02), 'tablas_viejas', { p: [0, ALTO + 0.55, k * 0.38], r: [k * 0.62, 0, 0] });
    m.add(caja(2.9, 0.1, 0.1, 0.03), vieja, { p: [0, ALTO + 0.86, 0] });
    this.construir(m);

    // Campana (pivota)
    this.pivote = new THREE.Group(); this.pivote.position.set(0, PIVOTE_Y, 0); this.grupo.add(this.pivote);
    const b = this.malla();
    const perfil = [[0.0, -1.0], [0.56, -1.0], [0.6, -0.98], [0.57, -0.93], [0.5, -0.8], [0.4, -0.55], [0.3, -0.32], [0.24, -0.1], [0.2, 0.05], [0.12, 0.1], [0.0, 0.1]];
    b.add(torno(perfil.map(([r, y]) => [r * 0.95, y * 0.82]), 40), ['laton_bronce', { desgaste: 0.5 }], { p: [0, -0.18, 0] });
    b.add(toro(0.5, 0.025, 36, 8), 'laton_bronce', { p: [0, -0.18 - 0.62, 0], r: [Math.PI / 2, 0, 0] });
    b.add(toro(0.34, 0.018, 32, 8), 'laton_bronce', { p: [0, -0.18 - 0.3, 0], r: [Math.PI / 2, 0, 0] });
    // yugo de madera
    b.add(caja(0.26, 0.2, 0.9, 0.05), 'madera_lacada', { p: [0, 0.0, 0] });
    b.add(caja(0.2, 0.2, 0.2, 0.04), 'hierro_forjado', { p: [0, -0.15, 0] });
    // badajo
    b.add(cil(0.025, 0.025, 0.7, 10), 'hierro_forjado', { p: [0, -0.62, 0] });
    b.add(esfera(0.085, 14), 'hierro_forjado', { p: [0, -1.0, 0] });
    // cuerda
    b.add(tubo([[0, -0.5, 0], [0.08, -1.2, 0.04], [0.04, -1.85, 0.08], [0.06, -2.2, 0.06]], 0.018, 12, 5), ['cuerda', { color: 0xb59a6b }], {});
    this.construir(b, this.pivote);
  }

  repicar() {
    if (!this.listo || !this.vivo) return;
    this.amp = 0.62; this.fase = 0; this.iniciarEnfriamiento(this.enfri); this.estado = 'activo';
    this.golpes = [0, 0.85, 1.7, 2.8].map((d) => this.t + d);
    this.atraer(this.pos.x, this.pos.z, this.opciones.radioAtraer ?? 30, this.opciones.duracionAtraer ?? 8);
    this.juego.eventos?.emitir?.('campana:repique', { objeto: this });
  }

  _golpe() {
    this.sonido('campana_iglesia', { volumen: 1 });
    this.fx('onda', this.pos.x, 2.4, this.pos.z, { escala: 2.2, color: 0xe9c98a });
    this.sacudir(0.05, 0.25);
    this.destello(this.pos.x, 2.2, this.pos.z, 0xffd9a0, 1.2, 0.3, 6);
  }

  paso(dt) {
    if (this.golpes.length && this.t >= this.golpes[0]) { this.golpes.shift(); this._golpe(); }
    if (this.amp > 0.002) {
      this.fase += dt * 5.2;
      this.amp *= Math.exp(-0.42 * dt);
      this.pivote.rotation.x = Math.sin(this.fase) * this.amp;
    } else if (this.estado === 'activo') this.estado = this.listo ? 'disponible' : 'enfriamiento';
    if (this.estado === 'disponible' && !this.listo) this.estado = 'enfriamiento';
    if (this.estado === 'enfriamiento' && this.listo) this.estado = 'disponible';
  }

  alDanio(info) {
    this.fx('astillas', info.x ?? this.pos.x, 1.2, info.z ?? this.pos.z, { cantidad: 4 });
    if (this.listo && (info.tipo === 'bala' || info.tipo === 'perforante' || info.tipo === 'golpe')) this.repicar();
  }
  alDestruirse() {
    this.escombros({ x: this.pos.x, y: 1.5, z: this.pos.z, cantidad: 14, material: 'madera', fuerza: 4 });
    this.fxAqui('polvo', 0.5, { escala: 2 });
    this.sonido('campana_iglesia', { tono: 0.6, volumen: 1 });
    this.grupo.visible = false;
    for (const c of [...this._cuerpos]) this.quitarCuerpo(c);
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
}
registrarTipo('campana_iglesia', (juego, o) => new CampanaIglesia(juego, o));
