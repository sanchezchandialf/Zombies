// 2000 · Baliza de dron de suministros: al activarla un dron desciende, baja una caja con cable y suelta suministros. Enfriamiento largo.
// Opciones de crear: { x, z, rot, destino:{x,z} (por defecto a 4 m delante), cajas=2, enfriamiento=60 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, discoSuelo, matAditivo, lim, suave, rango } from './comun.js';

class DronSuministros extends Interactivo {
  constructor(juego, o) {
    super(juego, 'dron_suministros', o, { vida: 100, material: 'metal', radio: 0.5 });
    const dx = Math.sin(this.rot), dz = Math.cos(this.rot);
    this.dest = o.destino || { x: this.pos.x + dx * 4, z: this.pos.z + dz * 4 };
    this.cajas = o.cajas ?? 2; this.enfri = o.enfriamiento ?? 60; this.fase = 'reposo'; this.tf = 0;
    this._modelo();
    this.cuerpo({ forma: 'circulo', x: this.pos.x, z: this.pos.z, radio: 0.3, masa: 0, capa: CAPA.ESTRUCTURA });
    this.registrar({ radioUso: 2.2, etiqueta: () => (this.fase === 'reposo' ? (this.listo ? 'Llamar al dron de suministros' : 'Baliza recargando') : 'Dron en camino'), puedeUsar: () => this.fase === 'reposo' && this.listo, usar: () => this.llamar() });
  }
  _modelo() {
    const m = this.malla(), hi = ['hierro_forjado', { color: 0x1f2224 }], pint = ['acero_pintado', { color: 0xc8a020, desgaste: 0.5 }];
    // trípode
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; m.add(cil(0.02, 0.025, 1.0, 8), hi, { p: [Math.cos(a) * 0.22, 0.45, Math.sin(a) * 0.22], r: [-Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4] }); m.add(esfera(0.04, 8), hi, { p: [Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4] }); }
    m.add(caja(0.5, 0.4, 0.34, 0.06), pint, { p: [0, 1.05, 0] });
    m.add(caja(0.34, 0.16, 0.02, 0.01), hi, { p: [0, 1.1, 0.175] });
    m.add(cil(0.012, 0.012, 1.0, 6), hi, { p: [0.18, 1.7, 0] });
    m.add(esfera(0.04, 8), hi, { p: [0.18, 2.2, 0] });
    // parábola
    m.add(torno([[0.0, 0], [0.12, 0.02], [0.2, 0.08], [0.24, 0.16], [0.23, 0.16], [0.19, 0.09], [0.1, 0.03], [0, 0.02]], 20), ['cromo', {}], { p: [-0.1, 1.3, 0.0], r: [-0.9, 0, 0.5] });
    this.construir(m);
    this.mLed = this.propio(emisivo(0x30ff60, 3));
    this.led = new THREE.Mesh(esfera(0.045, 10), this.mLed); this.led.position.set(-0.18, 1.3, 0.16); this.grupo.add(this.led); this._extras.push(this.led.geometry);
    const l2 = new THREE.Mesh(esfera(0.03, 8), this.mLed); l2.position.set(0.18, 2.24, 0); this.grupo.add(l2); this._extras.push(l2.geometry);
  }
  _modeloDron() {
    const d = new THREE.Group();
    const m = this.malla(), neg = ['hierro_forjado', { color: 0x1c1e20 }], gris = ['acero_pintado', { color: 0x8e949a, desgaste: 0.3 }];
    m.add(torno([[0, -0.2], [0.35, -0.2], [0.5, -0.08], [0.55, 0.05], [0.4, 0.2], [0, 0.26]], 24), gris, {});
    m.add(toro(0.5, 0.025, 28, 8), neg, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0] });
    this.hel = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 0.95, z = Math.sin(a) * 0.95;
      m.add(caja(0.9, 0.07, 0.11, 0.025), gris, { p: [x / 2, 0.04, z / 2], r: [0, -a, 0] });
      m.add(cil(0.1, 0.12, 0.14, 14), neg, { p: [x, 0.08, z] });
      m.add(cil(0.015, 0.015, 0.1, 6), neg, { p: [x, 0.19, z] });
      m.add(cil(0.025, 0.02, 0.35, 6), neg, { p: [x, -0.15, z] });
    }
    m.add(esfera(0.11, 12), neg, { p: [0, -0.22, 0.3] });
    this.construir(m, d);
    this.mLedD = this.propio(emisivo(0x40a0ff, 4));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 0.95, z = Math.sin(a) * 0.95;
      const h = new THREE.Group(); h.position.set(x, 0.22, z); d.add(h);
      const b = new THREE.Mesh(this._geoHel || (this._geoHel = caja(0.6, 0.012, 0.045, 0.005)), this.propio(new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 }))); const b2 = b.clone(); b2.rotation.y = Math.PI / 2; h.add(b, b2);
      const disco = new THREE.Mesh(this._geoDisco || (this._geoDisco = cil(0.32, 0.32, 0.004, 24)), this._matDisco || (this._matDisco = matAditivo(0xbfd8ff, 0.12))); h.add(disco);
      this.hel.push(h);
      const led = new THREE.Mesh(this._geoLed || (this._geoLed = esfera(0.03, 8)), this.mLedD); led.position.set(x * 0.8, -0.05, z * 0.8); d.add(led);
    }
    this._extras.push(this._geoHel, this._geoDisco, this._geoLed, this._matDisco);
    return d;
  }
  llamar() {
    if (this.fase !== 'reposo' || !this.listo) return;
    this.fase = 'llegada'; this.tf = 0; this.estado = 'activo'; this.mLed.emissive.setHex(0xff3020);
    this.dron = this._modeloDron(); this.propioObj(this.dron, this._escena || this.grupo);
    this.ini = { x: this.dest.x + 26, y: 32, z: this.dest.z - 24 }; this.dron.position.set(this.ini.x, this.ini.y, this.ini.z);
    this.marca = discoSuelo(2.2, 0x40ff80, 0, { anillo: 0.12 }); this.marca.position.set(this.dest.x, 0.06, this.dest.z); this.propioObj(this.marca, this._escena || this.grupo);
    this.snd = this.bucle('dron', { x: this.ini.x, z: this.ini.z, volumen: 0.9 });
    this.luzD = this.luz({ x: this.ini.x, y: this.ini.y, z: this.ini.z, color: 0xcfe4ff, intensidad: 30, distancia: 12 });
    this.humoBal = this.emisor('humo', this.dest.x, 0.3, this.dest.z, { escala: 0.9, duracion: 12, color: 0x40ff80 });
    this.mensaje('Dron de suministros en camino.', 'info', 3);
    this.sonido('baliza', { volumen: 0.8 });
  }
  _soltar() {
    for (let i = 0; i < this.cajas; i++) {
      const a = (i / Math.max(1, this.cajas)) * Math.PI * 2 + 0.4, x = this.dest.x + (this.cajas > 1 ? Math.cos(a) * 0.9 : 0), z = this.dest.z + (this.cajas > 1 ? Math.sin(a) * 0.9 : 0);
      let ob = null; try { ob = this.juego.mundo?.crear?.('caja', { x, z, botin: true, suerte: 1 }); } catch (e) { ob = null; }
      if (!ob) this.juego.mundo?.soltarBotin?.(x, z, { suerte: 1 });
    }
    this.fx('polvo', this.dest.x, 0.3, this.dest.z, { escala: 1.4 }); this.sonido('caja_cae', { x: this.dest.x, z: this.dest.z });
    this.juego.eventos?.emitir?.('dron:suministros', { objeto: this, x: this.dest.x, z: this.dest.z });
  }
  paso(dt) {
    const parp = this.mLed; if (this.fase === 'reposo') { parp.emissive.setHex(this.listo ? 0x30ff60 : 0xffa020); parp.emissiveIntensity = this.listo ? 3 : 1; this.estado = this.listo ? 'disponible' : 'enfriamiento'; }
    else parp.emissiveIntensity = Math.sin(this.t * 12) > 0 ? 4 : 0.3;
    if (this.fase === 'reposo' || !this.dron) return;
    this.tf += dt;
    for (const h of this.hel || []) h.rotation.y += dt * 60;
    const D = this.dest;
    if (this.marca) this.marca.material.opacity = 0.3 + 0.2 * Math.sin(this.t * 6);
    if (this.fase === 'llegada') {
      const k = suave(this.tf / 5.5);
      this.dron.position.set(this.ini.x + (D.x - this.ini.x) * k, 32 + (6.5 - 32) * k + Math.sin(this.t * 3) * 0.1, this.ini.z + (D.z - this.ini.z) * k);
      this.dron.rotation.z = (1 - k) * -0.25; this.dron.rotation.x = (1 - k) * 0.2;
      if (this.tf >= 5.5) { this.fase = 'bajada'; this.tf = 0; this._crearCarga(); }
    } else if (this.fase === 'bajada') {
      const k = suave(this.tf / 2.6);
      this.dron.position.y = 6.5 + Math.sin(this.t * 3) * 0.1;
      this.carga.position.y = -0.4 - (6.5 - 0.35) * k; this.cable.scale.y = Math.max(0.01, (6.1 * k + 0.2)); this.cable.position.y = -0.2 - this.cable.scale.y / 2;
      if (this.tf >= 2.6) { this._soltar(); this.carga.visible = false; this.cable.visible = false; this.fase = 'salida'; this.tf = 0; }
    } else if (this.fase === 'salida') {
      const k = suave(this.tf / 4);
      this.dron.position.set(D.x - (D.x - this.ini.x) * -0 + k * 28, 6.5 + k * 30, D.z + k * 22);
      if (this.marca) this.marca.material.opacity *= 0.9;
      if (this.tf >= 4.2) this._irse();
    }
    const p = this.dron.position;
    if (this.luzD) this.luzD.pos.set(p.x, p.y - 0.4, p.z);
    this.snd?.ajustar?.({ x: p.x, z: p.z });
  }
  _crearCarga() {
    const g = new THREE.Group(); this.dron.add(g);
    const m = this.malla();
    m.add(caja(0.8, 0.55, 0.6, 0.06), ['acero_pintado', { color: 0x4a5a3a, desgaste: 0.5 }], {});
    m.add(caja(0.82, 0.08, 0.62, 0.02), ['acero_pintado', { color: 0xc8a020 }], { p: [0, 0.15, 0] });
    m.add(caja(0.2, 0.2, 0.03, 0.01), 'rayas_peligro', { p: [0, 0, 0.31] });
    this.construir(m, g);
    this.carga = g; g.position.y = -0.4;
    const cg = cil(0.012, 0.012, 1, 6); this.cable = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })); this._extras.push(cg); this._propios.push(this.cable.material);
    this.dron.add(this.cable); this.cable.scale.y = 0.2; this.cable.position.y = -0.3;
  }
  _irse() {
    this.fase = 'reposo'; this.iniciarEnfriamiento(this.enfri); this.estado = 'enfriamiento';
    this.snd?.detener?.(); this.snd = null; this.quitarLuz(this.luzD); this.luzD = null; this.quitarEmisor(this.humoBal);
    this.dron?.removeFromParent(); this.dron = null;
    if (this.marca) { this.marca.removeFromParent(); this.marca.geometry.dispose(); this.marca.material.dispose(); this.marca = null; }
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 1.1, info.z ?? this.pos.z, { cantidad: 4 }); }
  alDestruirse() { this._irse(); this.fxAqui('explosion', 1, { escala: 0.5 }); this.mLed.emissiveIntensity = 0; this.grupo.scale.y = 0.6; if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; } }
  alLimpiar() { this.snd?.detener?.(); }
}
registrarTipo('dron_suministros', (juego, o) => new DronSuministros(juego, o));
