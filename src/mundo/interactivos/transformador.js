// 1950 · Transformador eléctrico con interruptor: electrifica un radio durante 6 s (aturde y daña a zombis, también a los jugadores
// dentro), con arcos visibles y enfriamiento.
// Opciones de crear: { x, z, rot, radio=6, duracion=6, enfriamiento=14, dps=14 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, emisivo, Rayos, discoSuelo, lim, rango } from './comun.js';

class Transformador extends Interactivo {
  constructor(juego, o) {
    super(juego, 'transformador', o, { vida: 220, material: 'metal', radio: 0.9, resist: { energia: 0 } });
    this.R = o.radio ?? 6; this.dur = o.duracion ?? 6; this.enfri = o.enfriamiento ?? 14; this.dps = o.dps ?? 14;
    this.activo = 0; this.tic = 0; this.tArco = 0;
    this._modelo();
    this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: 0.7, hz: 0.5, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA });
    this.registrar({ radioUso: 2.3, etiqueta: () => (this.listo ? 'Accionar el interruptor' : this.activo > 0 ? 'Corriente conectada' : 'Recargando'), puedeUsar: () => this.listo && this.activo <= 0, usar: () => this.conectar() });
  }
  _modelo() {
    const m = this.malla(), gris = ['acero_pintado', { color: 0x6a7a70, desgaste: 0.6 }], hi = ['hierro_forjado', { color: 0x222426 }], porc = ['marmol', { color: 0xcbb98c }];
    m.add(caja(1.8, 0.2, 1.3, 0.05), 'hormigon', { p: [0, 0.1, 0] });
    m.add(caja(1.4, 1.35, 0.9, 0.07), gris, { p: [0, 0.88, 0] });
    m.add(caja(1.5, 0.08, 1.0, 0.04), hi, { p: [0, 1.58, 0] });
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) m.add(caja(0.05, 1.05, 0.28, 0.015), gris, { p: [s * 0.82, 0.88, -0.36 + i * 0.12], s: [1, 1, 1] });
    // aisladores
    for (const x of [-0.45, 0, 0.45]) {
      const per = [[0.16, 0], [0.16, 0.05], [0.07, 0.08]];
      for (let i = 0; i < 5; i++) per.push([0.1 + (i % 2) * 0.05, 0.12 + i * 0.1]);
      per.push([0.07, 0.65], [0.0, 0.66]);
      m.add(torno(per, 16), porc, { p: [x, 1.62, 0] });
      m.add(cil(0.045, 0.045, 0.12, 10), 'laton_bronce', { p: [x, 2.34, 0] });
      m.add(esfera(0.06, 10), 'laton_bronce', { p: [x, 2.42, 0] });
    }
    // armario del interruptor y placa de peligro
    m.add(caja(0.5, 0.7, 0.28, 0.04), ['acero_pintado', { color: 0x8a8f86, desgaste: 0.6 }], { p: [-0.35, 0.65, 0.58] });
    m.add(caja(0.28, 0.34, 0.03, 0.02), 'rayas_peligro', { p: [0.2, 0.9, 0.46] });
    m.add(cil(0.025, 0.025, 0.1, 8), hi, { p: [-0.35, 0.78, 0.75], r: [Math.PI / 2, 0, 0] });
    this.construir(m);
    // palanca del interruptor (animada)
    this.palanca = new THREE.Group(); this.palanca.position.set(-0.35, 0.78, 0.76); this.grupo.add(this.palanca);
    const p = this.malla();
    p.add(cil(0.015, 0.015, 0.3, 8), hi, { p: [0, 0.15, 0] }); p.add(esfera(0.04, 10), ['acero_pintado', { color: 0xb02020 }], { p: [0, 0.32, 0] });
    this.construir(p, this.palanca); this.palanca.rotation.x = 0.6;
    this.mLed = this.propio(emisivo(0x30ff60, 2)); this.led = new THREE.Mesh(esfera(0.03, 8), this.mLed); this.led.position.set(-0.35, 0.95, 0.73); this.grupo.add(this.led); this._extras.push(this.led.geometry);
    this.rayos = new Rayos(this._escena || this.grupo, { color: 0x6ab8ff, ancho: 0.07, maxSegmentos: 200 });
    this._extras.push({ traverse: () => {} });
    this.anillo = discoSuelo(this.R, 0x4aa8ff, 0, { anillo: 0.06 }); this.anillo.position.set(this.pos.x, 0.05, this.pos.z); this.propioObj(this.anillo, this._escena || this.grupo);
  }
  conectar() {
    if (!this.listo || this.activo > 0 || !this.vivo) return;
    this.activo = this.dur; this.estado = 'activo';
    this.sonido('electricidad', { volumen: 1 }); this.snd = this.bucle('electricidad', { volumen: 0.9 });
    this.luzE = this.luz({ x: this.pos.x, y: 2.5, z: this.pos.z, color: 0x66b6ff, intensidad: 70, distancia: this.R + 3 });
    this.mensaje('¡Corriente conectada! Aléjate del transformador.', 'aviso', 2.5);
  }
  _apagar() {
    this.activo = 0; this.rayos.limpiar(); this.rayos.subir(0); this.anillo.material.opacity = 0;
    this.snd?.detener?.(); this.snd = null; this.quitarLuz(this.luzE); this.luzE = null;
    this.iniciarEnfriamiento(this.enfri); this.estado = 'enfriamiento'; this.fxAqui('humo', 2.2, { escala: 0.8 });
  }
  paso(dt) {
    const x0 = this.pos.x, z0 = this.pos.z;
    this.palanca.rotation.x += ((this.activo > 0 ? -0.6 : 0.6) - this.palanca.rotation.x) * Math.min(1, dt * 12);
    this.mLed.emissive.setHex(this.activo > 0 ? 0xff3020 : this.listo ? 0x30ff60 : 0xffa020); this.mLed.emissiveIntensity = this.activo > 0 ? 3 + Math.sin(this.t * 30) * 2 : 1.6;
    if (this.activo > 0) {
      this.activo -= dt; this.tArco -= dt; this.tic -= dt;
      const fade = lim(this.activo / 0.5, 0, 1), ap = lim((this.dur - this.activo) / 0.25, 0, 1);
      this.anillo.material.opacity = (0.18 + 0.12 * Math.sin(this.t * 22)) * fade * ap;
      if (this.tArco <= 0) {
        this.tArco = 0.05; this.rayos.limpiar();
        for (const bx of [-0.45, 0, 0.45]) {
          const c = Math.cos(this.rot), s = Math.sin(this.rot);
          const ax = x0 + bx * c, az = z0 - bx * s;
          const nArc = Math.random() < 0.55 ? 1 : 0;
          for (let k = 0; k < nArc + 1; k++) {
            const a = Math.random() * Math.PI * 2, r = rango(0.25, 1) * this.R;
            this.rayos.arco(ax, 2.45, az, x0 + Math.cos(a) * r, 0.05, z0 + Math.sin(a) * r, { seg: 9, jitter: 0.5 });
          }
        }
        this.rayos.subir(fade);
      }
      if (this.luzE) this.luzE.intensidad = (40 + Math.random() * 60) * fade;
      if (this.tic <= 0) {
        this.tic = 0.25;
        this.alrededor(x0, z0, this.R, (e, d) => {
          const mult = 1 - 0.4 * (d / this.R);
          if (e.bando === 'zombis') e.aturdir?.(0.9);
          this.danioA(e, { cantidad: this.dps * 0.25 * mult * (e.bando === 'zombis' ? 1 : 0.7), tipo: 'energia', atacante: null, x: e.pos.x, z: e.pos.z, dirX: 0, dirZ: 0, continuo: true });
          if (Math.random() < 0.5) this.fx('electrico', e.pos.x, 1, e.pos.z, { cantidad: 3 });
        }, { jugadores: true });
      }
      if (this.activo <= 0) this._apagar();
    } else this.estado = this.listo ? 'disponible' : 'enfriamiento';
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 1.0, info.z ?? this.pos.z, { cantidad: 5 }); }
  alDestruirse() {
    this.explotar({ x: this.pos.x, z: this.pos.z, radio: 4, danio: 70, tipo: 'energia', empuje: 6, y: 1 });
    this.fx('explosion', this.pos.x, 1, this.pos.z, { escala: 1 }); this.fx('electrico', this.pos.x, 1.4, this.pos.z, { cantidad: 20 });
    this._apagar(); this.estado = 'destruido'; this.mLed.emissiveIntensity = 0;
    this.emisor('humo', this.pos.x, 1.4, this.pos.z, { escala: 1.2, duracion: 14 });
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
  alLimpiar() { this.snd?.detener?.(); this.rayos?.destruir(); }
}
registrarTipo('transformador', (juego, o) => new Transformador(juego, o));
