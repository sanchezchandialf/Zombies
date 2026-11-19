// 2000 · Generador diésel: se arranca manteniendo E 1,5 s; funciona 30 s alimentando vallas eléctricas y su foco en su radio.
// Hace ruido (atrae zombis) y explota si lo destruyen.
// Opciones de crear: { x, z, rot, duracion=30 (s), radioAlimenta=25 (m), enfriamiento=20 (s), arranque=1.5 }
// API añadida: .enMarcha, .carga (0..1), .alimenta(x,z) → bool, .consumir(fraccion)
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, lim } from './comun.js';

class Generador extends Interactivo {
  constructor(juego, o) {
    super(juego, 'generador', o, { vida: 160, material: 'metal', radio: 0.9, resist: { bala: 0.8 } });
    this.dur = o.duracion ?? 30; this.R = o.radioAlimenta ?? 25; this.enfri = o.enfriamiento ?? 20;
    this.enMarcha = false; this.carga = 0; this.tRuido = 0; this.tHumo = 0; this.arrancando = 0;
    this.vib = new THREE.Group(); this.grupo.add(this.vib);
    this._modelo();
    this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: 0.65, hz: 0.45, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA });
    this.registrar({
      radioUso: 2.2, mantener: o.arranque ?? 1.5,
      etiqueta: () => (this.enMarcha ? 'Generador en marcha' : this.listo ? 'Arrancar el generador (mantener)' : 'Generador caliente'),
      puedeUsar: () => this.listo && !this.enMarcha, usar: () => this.arrancar(),
    });
  }
  _modelo() {
    const m = this.malla(), verde = ['acero_pintado', { color: 0x55633f, desgaste: 0.55 }], hi = ['hierro_forjado', { color: 0x1d1f21 }], crom = 'cromo', ox = ['hierro_oxidado', { desgaste: 0.5 }];
    // bastidor de tubo
    for (const x of [-0.62, 0.62]) { m.add(cil(0.04, 0.04, 1.3, 8), hi, { p: [x, 0.2, 0], r: [Math.PI / 2, 0, 0] }); m.add(caja(0.08, 0.2, 0.08, 0.02), hi, { p: [x, 0.1, 0.62] }); m.add(caja(0.08, 0.2, 0.08, 0.02), hi, { p: [x, 0.1, -0.62] }); }
    m.add(caja(1.3, 0.06, 1.3, 0.02), hi, { p: [0, 0.2, 0] });
    // motor/alternador: carcasa principal
    m.add(caja(1.1, 0.72, 0.85, 0.1), verde, { p: [0, 0.62, 0.1] });
    for (let i = 0; i < 6; i++) m.add(caja(1.12, 0.012, 0.6, 0.004), hi, { p: [0, 0.4 + i * 0.1, 0.14] }); // rejilla de ventilación
    m.add(caja(1.0, 0.1, 0.7, 0.04), ox, { p: [0, 1.02, 0.1] });
    // alternador cilíndrico en un extremo
    m.add(cil(0.3, 0.3, 0.46, 24), ['acero_pintado', { color: 0x3b4a30 }], { p: [0, 0.68, -0.52], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) m.add(toro(0.3, 0.012, 24, 6), hi, { p: [0, 0.68, -0.4 - i * 0.1], r: [0, 0, 0] });
    // depósito de combustible sobre el motor
    m.add(torno([[0, -0.4], [0.2, -0.4], [0.24, -0.36], [0.25, 0], [0.24, 0.36], [0.2, 0.4], [0, 0.4]], 20), ['acero_pintado', { color: 0xb8892a, desgaste: 0.5 }], { p: [0, 1.22, 0.1], r: [0, 0, Math.PI / 2] });
    m.add(cil(0.05, 0.05, 0.05, 10), crom, { p: [0, 1.46, 0.1] });
    // escape con codo y silenciador
    m.add(cil(0.1, 0.1, 0.45, 14), ox, { p: [0.4, 1.28, 0.38], r: [0, 0, 0] });
    m.add(tubo([[0.4, 1.05, 0.38], [0.4, 1.2, 0.38], [0.4, 1.55, 0.38]], 0.04, 6, 8), hi, { p: [0, 0.0, 0] });
    m.add(cil(0.05, 0.05, 0.4, 8), hi, { p: [0.4, 1.8, 0.38] });
    // panel de control en la cara frontal (+Z)
    m.add(caja(0.8, 0.4, 0.07, 0.03), hi, { p: [0, 0.78, 0.56] });
    for (const x of [-0.25, 0, 0.25]) m.add(cil(0.045, 0.045, 0.03, 12), crom, { p: [x, 0.64, 0.6], r: [Math.PI / 2, 0, 0] });
    // tomas
    for (const x of [-0.3, 0.3]) m.add(cil(0.05, 0.05, 0.05, 10), ['acero_pintado', { color: 0xc8a020 }], { p: [x, 0.5, 0.58], r: [Math.PI / 2, 0, 0] });
    // cable enrollado
    m.add(toro(0.2, 0.03, 20, 6), ['goma', { color: 0x1a1a1a }], { p: [-0.7, 0.3, 0.2], r: [0, Math.PI / 2, 0] });
    // asas
    for (const z of [-0.3, 0.55]) m.add(tubo([[-0.62, 0.9, z], [-0.7, 1.05, z], [0.7, 1.05, z], [0.62, 0.9, z]], 0.018, 12, 6), crom, {});
    // mástil del foco (telescópico)
    m.add(cil(0.025, 0.03, 1.5, 8), hi, { p: [-0.5, 1.8, -0.35] });
    m.add(cil(0.04, 0.04, 0.4, 8), hi, { p: [-0.5, 1.3, -0.35] });
    this.construir(m, this.vib);
    // foco
    this.cabeza = new THREE.Group(); this.cabeza.position.set(-0.5, 2.58, -0.35); this.vib.add(this.cabeza);
    const f = this.malla();
    f.add(caja(0.5, 0.34, 0.2, 0.04), hi, { p: [0, 0, 0] });
    f.add(caja(0.54, 0.38, 0.03, 0.01), crom, { p: [0, 0, 0.115] });
    this.construir(f, this.cabeza);
    this.mFoco = this.propio(emisivo(0xfff4d8, 0.1));
    this.lente = new THREE.Mesh(caja(0.44, 0.28, 0.02, 0.01), this.mFoco); this.lente.position.set(0, 0, 0.13); this.cabeza.add(this.lente); this._extras.push(this.lente.geometry);
    this.cabeza.rotation.y = 0.4; this.cabeza.rotation.x = 0.15;
    // pilotos del panel
    this.mVerde = this.propio(emisivo(0x30ff60, 0.2)); this.mRojo = this.propio(emisivo(0xff3020, 1.2));
    const l1 = new THREE.Mesh(esfera(0.022, 8), this.mVerde), l2 = new THREE.Mesh(esfera(0.022, 8), this.mRojo);
    l1.position.set(-0.28, 0.9, 0.6); l2.position.set(-0.18, 0.9, 0.6); this.vib.add(l1, l2); this._extras.push(l1.geometry, l2.geometry);
    // medidor de carga
    this.barra = new THREE.Mesh(caja(0.5, 0.04, 0.02, 0.008), this.propio(emisivo(0x30ff60, 2))); this.barra.position.set(0, 0.92, 0.6); this.vib.add(this.barra); this._extras.push(this.barra.geometry);
    this.barra.visible = false;
  }

  alimenta(x, z) { return this.enMarcha && this.carga > 0 && Math.hypot(x - this.pos.x, z - this.pos.z) <= this.R; }
  consumir(f) { if (this.enMarcha) this.carga = Math.max(0, this.carga - f); }

  arrancar() {
    if (this.enMarcha || !this.listo || !this.vivo) return;
    this.enMarcha = true; this.carga = 1; this.estado = 'activo'; this.tRuido = 0;
    this.sonido('generador_arranque', { volumen: 0.9 }); this.snd = this.bucle('generador', { volumen: 0.8 });
    this.luzF = this.luz({ x: this.pos.x, y: 2.6, z: this.pos.z, color: 0xfff0d0, intensidad: 90, distancia: 17 });
    this.humo = this.emisor('humo', this.pos.x, 2.2, this.pos.z, { escala: 0.8 });
    this.juego.eventos?.emitir?.('generador:arranque', { objeto: this });
  }
  parar() {
    if (!this.enMarcha) return;
    this.enMarcha = false; this.carga = 0; this.snd?.detener?.(); this.snd = null; this.quitarLuz(this.luzF); this.luzF = null; this.quitarEmisor(this.humo); this.humo = null;
    this.vib.position.set(0, 0, 0); this.mFoco.emissiveIntensity = 0.1; this.barra.visible = false;
    if (this.vivo) { this.iniciarEnfriamiento(this.enfri); this.estado = 'enfriamiento'; }
    this.sonido('generador_parada', { volumen: 0.7 });
  }
  paso(dt) {
    const w = this.enMarcha;
    this.mVerde.emissiveIntensity = w ? 3 : 0.2; this.mRojo.emissiveIntensity = w ? 0.1 : (this.listo ? 0.2 : 2.5);
    if (w) {
      this.carga = Math.max(0, this.carga - dt / this.dur);
      const baja = this.carga < 0.15 ? (Math.sin(this.t * 25) > 0 ? 1 : 0.3) : 1;
      this.vib.position.set(Math.sin(this.t * 90) * 0.004, Math.abs(Math.sin(this.t * 70)) * 0.004, Math.cos(this.t * 85) * 0.004);
      this.mFoco.emissiveIntensity = 5 * baja;
      this.barra.visible = true; this.barra.scale.x = Math.max(0.02, this.carga); this.barra.position.x = -0.25 * (1 - this.carga);
      if (this.luzF) this.luzF.intensidad = (90 + Math.sin(this.t * 40) * 5) * baja;
      if (this.humo) { const c = Math.cos(this.rot), s = Math.sin(this.rot); this.humo.pos.x = this.pos.x + 0.4 * c + 0.38 * s; this.humo.pos.z = this.pos.z - 0.4 * s + 0.38 * c; this.humo.pos.y = 2.05; }
      this.tRuido -= dt; if (this.tRuido <= 0) { this.tRuido = 2.5; this.atraer(this.pos.x, this.pos.z, 22, 3); }
      if (this.carga <= 0) this.parar();
    } else if (this.vivo) this.estado = this.listo ? 'disponible' : 'enfriamiento';
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 0.9, info.z ?? this.pos.z, { cantidad: 4 }); }
  alDestruirse() {
    const { x, z } = this.pos;
    this.parar(); this.estado = 'destruido';
    this.explotar({ x, z, radio: 7, danio: 180, empuje: 12, y: 0.8 });
    this.fx('explosion_grande', x, 0.9, z, { escala: 1.3 });
    this.zona({ x, z, radio: 3, duracion: 8, dps: 9 }); this.emisor('fuego', x, 0.5, z, { escala: 1.3, duracion: 9 }); this.emisor('humo', x, 1.2, z, { escala: 1.6, duracion: 15 });
    this.escombros({ x, y: 1, z, cantidad: 10, material: 'metal', fuerza: 8 }); this.calco('quemadura', x, z, 4); this.sacudir(0.5, 0.5);
    this.vib.rotation.z = 0.08; this.mFoco.emissiveIntensity = 0;
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
  alLimpiar() { this.snd?.detener?.(); }
}
registrarTipo('generador', (juego, o) => new Generador(juego, o));
