// 2050 · Torre Tesla: 8 s de arcos encadenados contra los zombis en 10 m; después sobrecarga y enfriamiento.
// Opciones de crear: { x, z, rot, alcance=10, duracion=8, enfriamiento=25, danio=26, saltos=3 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, emisivo, Rayos, discoSuelo, lim, rango } from './comun.js';

class TorreTesla extends Interactivo {
  constructor(juego, o) {
    super(juego, 'torre_tesla', o, { vida: 260, material: 'energia', radio: 0.8, resist: { energia: 0 } });
    this.R = o.alcance ?? 10; this.dur = o.duracion ?? 8; this.enfri = o.enfriamiento ?? 25; this.danio = o.danio ?? 26; this.saltos = o.saltos ?? 3;
    this.activo = 0; this.sobrecarga = 0; this.tDisp = 0; this.nucleoI = 0.8;
    this._modelo();
    this.cuerpo({ forma: 'circulo', x: this.pos.x, z: this.pos.z, radio: 0.62, masa: 0, capa: CAPA.ESTRUCTURA });
    this.rayos = new Rayos(this._escena || this.grupo, { color: 0xff5af0, ancho: 0.09, maxSegmentos: 220, nucleo: 0xd8ffff });
    this.registrar({ radioUso: 2.4, etiqueta: () => (this.listo && this.activo <= 0 ? 'Activar la torre Tesla' : this.activo > 0 ? 'Torre activa' : 'Torre sobrecalentada'), puedeUsar: () => this.listo && this.activo <= 0 && this.sobrecarga <= 0, usar: () => this.activar() });
  }
  _modelo() {
    const m = this.malla(), blanco = ['casco_nave', { color: 0xdfe6ea, desgaste: 0.2 }], negro = ['composite_futurista', { color: 0xff3df0 }], neg = ['hierro_forjado', { color: 0x14161a }];
    m.add(torno([[0, 0], [0.95, 0], [1.0, 0.05], [0.95, 0.2], [0.7, 0.32], [0.0, 0.34]], 6), negro, { r: [0, Math.PI / 6, 0] });
    m.add(torno([[0, 0], [0.62, 0], [0.64, 0.05], [0.5, 0.3], [0.0, 0.3]], 24), blanco, { p: [0, 0.3, 0] });
    // columna con segmentos que se estrechan
    for (const [y, r1, r2, h] of [[0.6, 0.46, 0.4, 0.8], [1.45, 0.4, 0.3, 0.9], [2.4, 0.3, 0.2, 0.9]]) m.add(cil(r2, r1, h, 28), blanco, { p: [0, y + h / 2, 0] });
    for (const y of [0.62, 1.47, 2.42]) m.add(toro(0.48 - (y - 0.62) * 0.1, 0.03, 32, 8), neg, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
    // tres bobinas laterales
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; m.add(cil(0.07, 0.09, 1.4, 12), neg, { p: [Math.cos(a) * 0.52, 0.95, Math.sin(a) * 0.52], r: [Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16] }); }
    // cúpula del emisor
    m.add(torno([[0, 0], [0.34, 0], [0.38, 0.04], [0.26, 0.2], [0.0, 0.26]], 24), neg, { p: [0, 3.25, 0] });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; m.add(caja(0.05, 0.5, 0.05, 0.015), blanco, { p: [Math.cos(a) * 0.3, 3.52, Math.sin(a) * 0.3], r: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2] }); }
    this.construir(m);
    // anillos emisivos y núcleo
    this.mAnillo = this.propio(emisivo(0xff3df0, 2.5)); this.mNucleo = this.propio(emisivo(0x6af2ff, 3, { transparent: true, opacity: 0.95 }));
    this.anillos = [];
    for (const [y, r] of [[0.95, 0.435], [1.9, 0.35], [2.75, 0.26]]) { const t = new THREE.Mesh(toro(r, 0.022, 36, 8), this.mAnillo); t.position.y = y; t.rotation.x = Math.PI / 2; this.grupo.add(t); this.anillos.push(t); this._extras.push(t.geometry); }
    this.nucleo = new THREE.Mesh(esfera(0.3, 24), this.mNucleo); this.nucleo.position.y = 3.95; this.grupo.add(this.nucleo); this._extras.push(this.nucleo.geometry);
    this.halo = new THREE.Mesh(toro(0.5, 0.018, 40, 6), this.mAnillo); this.halo.position.y = 3.95; this.grupo.add(this.halo); this._extras.push(this.halo.geometry);
    this.halo2 = new THREE.Mesh(toro(0.42, 0.014, 40, 6), this.mAnillo); this.halo2.position.y = 3.95; this.grupo.add(this.halo2); this._extras.push(this.halo2.geometry);
    this.luzT = this.luz({ x: this.pos.x, y: 4, z: this.pos.z, color: 0x7af0ff, intensidad: 12, distancia: 9 });
  }
  activar() {
    if (!this.listo || this.activo > 0 || !this.vivo) return;
    this.activo = this.dur; this.estado = 'activo'; this.tDisp = 0;
    this.sonido('tesla_activa', { volumen: 1 }); this.snd = this.bucle('tesla', { volumen: 0.8 });
    this.mensaje('Torre Tesla activada.', 'info', 2);
  }
  _objetivos() {
    const cand = [];
    this.alrededor(this.pos.x, this.pos.z, this.R, (z, d) => cand.push({ z, d }));
    cand.sort((a, b) => a.d - b.d);
    return cand;
  }
  _disparar() {
    const cand = this._objetivos();
    this.rayos.limpiar();
    const tx = this.pos.x, ty = 3.95, tz = this.pos.z;
    if (!cand.length) { // arco ambiental a tierra
      const a = Math.random() * Math.PI * 2, r = rango(1.2, 3);
      this.rayos.arco(tx, ty, tz, tx + Math.cos(a) * r, 0.1, tz + Math.sin(a) * r, { seg: 8, jitter: 0.35 });
      return;
    }
    const usados = new Set(); const nCadenas = Math.min(3, cand.length);
    for (let c = 0; c < nCadenas; c++) {
      let actual = cand[c].z; if (usados.has(actual)) continue;
      let px = tx, py = ty, pz = tz;
      for (let s = 0; s <= this.saltos; s++) {
        if (!actual) break; usados.add(actual);
        const ex = actual.pos.x, ez = actual.pos.z;
        this.rayos.arco(px, py, pz, ex, 1.15, ez, { seg: 7, jitter: 0.3 });
        this.danioA(actual, { cantidad: this.danio * (1 - s * 0.15), tipo: 'energia', atacante: null, x: ex, z: ez, dirX: 0, dirZ: 0 });
        actual.aturdir?.(0.45);
        this.fx('electrico', ex, 1.1, ez, { cantidad: 4 });
        px = ex; py = 1.15; pz = ez;
        let sig = null, ds = 4.5;
        for (const o of cand) { if (usados.has(o.z) || o.z.vivo === false) continue; const d = Math.hypot(o.z.pos.x - ex, o.z.pos.z - ez); if (d < ds) { ds = d; sig = o.z; } }
        actual = sig;
      }
    }
  }
  paso(dt) {
    const a = this.activo > 0;
    for (let i = 0; i < this.anillos.length; i++) { this.anillos[i].rotation.z += dt * (1.5 + i) * (a ? 3 : 0.4); }
    this.halo.rotation.set(this.t * (a ? 6 : 1), this.t * 2, 0); this.halo2.rotation.set(0.5, this.t * (a ? -5 : -1), this.t * 3);
    if (a) {
      this.activo -= dt; this.tDisp -= dt;
      this.mNucleo.emissiveIntensity = 5 + Math.random() * 3; this.mAnillo.emissiveIntensity = 4 + Math.sin(this.t * 30) * 2;
      this.nucleo.scale.setScalar(1.15 + Math.sin(this.t * 40) * 0.1);
      if (this.tDisp <= 0) { this.tDisp = 0.3; this._disparar(); this.rayos.subir(1); this.sonido('arco_tesla', { volumen: 0.5 }); }
      else this.rayos.mat.opacity = this.rayos.mat2.opacity = lim(this.tDisp / 0.2, 0.2, 1);
      if (this.luzT) this.luzT.intensidad = 40 + Math.random() * 50;
      if (this.activo <= 0) { this.sobrecarga = 1.6; this.rayos.limpiar(); this.rayos.subir(0); this.snd?.detener?.(); this.snd = null; this.fxAqui('humo', 4, { escala: 1.2 }); this.sonido('sobrecarga', { volumen: 0.8 }); }
    } else if (this.sobrecarga > 0) {
      this.sobrecarga -= dt; this.mNucleo.emissive.setHex(0xff3020);
      this.mNucleo.emissiveIntensity = Math.sin(this.t * 35) > 0 ? 5 : 0.5; this.mAnillo.emissiveIntensity = 0.5;
      if (Math.random() < dt * 20) this.fx('chispas', this.pos.x, 3.9, this.pos.z, { cantidad: 4 });
      if (this.sobrecarga <= 0) { this.iniciarEnfriamiento(this.enfri); this.estado = 'enfriamiento'; if (this.luzT) this.luzT.intensidad = 4; }
    } else {
      this.mNucleo.emissive.setHex(this.listo ? 0x6af2ff : 0x553a60);
      const k = this.listo ? 1 : 0.15 + 0.85 * (1 - this.enfriamiento);
      this.mNucleo.emissiveIntensity = (this.listo ? 2.6 + Math.sin(this.t * 3) * 0.5 : 0.4 + k) * (this.vivo ? 1 : 0); this.mAnillo.emissiveIntensity = 0.4 + 1.8 * k;
      this.nucleo.scale.setScalar(1);
      if (this.luzT) this.luzT.intensidad = this.vivo ? 4 + 8 * k : 0;
      if (this.vivo) this.estado = this.listo ? 'disponible' : 'enfriamiento';
    }
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 1.5, info.z ?? this.pos.z, { cantidad: 5 }); }
  alDestruirse() {
    this.activo = 0; this.snd?.detener?.(); this.rayos.limpiar(); this.rayos.subir(0);
    this.explotar({ x: this.pos.x, z: this.pos.z, radio: 5, danio: 80, tipo: 'energia', empuje: 8, y: 2 });
    this.fx('explosion', this.pos.x, 2, this.pos.z, { escala: 1.2 }); this.fx('plasma', this.pos.x, 3.9, this.pos.z, { escala: 1.5 });
    this.mNucleo.emissiveIntensity = 0; this.mAnillo.emissiveIntensity = 0; this.quitarLuz(this.luzT); this.luzT = null;
    this.emisor('humo', this.pos.x, 3, this.pos.z, { escala: 1.2, duracion: 14 });
    this.nucleo.visible = false; this.halo.visible = this.halo2.visible = false; this.sacudir(0.4, 0.4);
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
  alLimpiar() { this.snd?.detener?.(); this.rayos?.destruir(); }
}
registrarTipo('torre_tesla', (juego, o) => new TorreTesla(juego, o));
