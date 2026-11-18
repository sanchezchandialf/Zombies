// 1800 · Carreta de pólvora: carro de madera pesado y empujable con barriles. Al usarla se enciende la mecha y explota a los 4 s.
// Opciones de crear: { x, z, rot, mecha=4 (s), radio=9 (m), danio=260 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, rango } from './comun.js';

class Carreta extends Interactivo {
  constructor(juego, o) {
    super(juego, 'carreta', o, { vida: 110, material: 'madera', radio: 1.4, resist: { golpe: 0.6, bala: 0.8 } });
    this.tMecha = o.mecha ?? 4; this.restante = 0; this.encendida = false; this.ang = 0; this.chispa = 0;
    this._modelo();
    this.cb = this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: 0.85, hz: 1.35, rot: this.rot, masa: 380, amortiguacion: 2.4, rebote: 0.1, capa: CAPA.PROP });
    this.registrar({ radioUso: 2.4, etiqueta: 'Encender la mecha', puedeUsar: () => this.vivo && !this.encendida, usar: () => this.encender() });
  }

  _modelo() {
    const m = this.malla(), mad = 'tablas_viejas', hi = ['hierro_oxidado', { desgaste: 0.7 }], lat = 'hierro_forjado';
    // plataforma
    for (let i = 0; i < 6; i++) m.add(caja(0.27, 0.07, 2.3, 0.012), mad, { p: [-0.7 + i * 0.28, 0.62, -0.05] });
    m.add(caja(0.12, 0.14, 2.45, 0.03), mad, { p: [-0.62, 0.52, -0.05] });
    m.add(caja(0.12, 0.14, 2.45, 0.03), mad, { p: [0.62, 0.52, -0.05] });
    // laterales con barrotes
    for (const s of [-1, 1]) {
      m.add(caja(0.07, 0.07, 2.3, 0.02), mad, { p: [s * 0.82, 1.12, -0.05] });
      for (let k = 0; k < 6; k++) m.add(caja(0.06, 0.5, 0.06, 0.015), mad, { p: [s * 0.82, 0.88, -1.1 + k * 0.4] });
    }
    m.add(caja(1.7, 0.07, 0.07, 0.02), mad, { p: [0, 1.12, -1.2] });
    m.add(caja(1.7, 0.4, 0.06, 0.02), mad, { p: [0, 0.86, -1.2] });
    // eje y varas hacia +Z
    m.add(cil(0.05, 0.05, 2.2, 12), lat, { p: [0, 0.55, -0.1], r: [0, 0, Math.PI / 2] });
    for (const s of [-1, 1]) {
      m.add(caja(0.09, 0.09, 2.5, 0.03), mad, { p: [s * 0.4, 0.62, 1.9], r: [0.05, s * -0.05, 0] });
      m.add(caja(0.14, 0.1, 0.14, 0.03), lat, { p: [s * 0.4, 0.6, 1.0] });
    }
    m.add(caja(0.9, 0.07, 0.07, 0.02), mad, { p: [0, 0.65, 2.6] });
    // barriles de pólvora (3) + cuerda
    const barril = (x, z, y = 0.66, s = 1) => {
      const per = [[0, 0], [0.26, 0], [0.3, 0.1], [0.34, 0.3], [0.35, 0.45], [0.34, 0.6], [0.3, 0.8], [0.26, 0.9], [0, 0.9]];
      m.add(torno(per.map(([r, h]) => [r * s, h * s]), 24), ['madera_lacada', { color: 0x6b4426, desgaste: 0.8 }], { p: [x, y, z] });
      for (const h of [0.12, 0.3, 0.6, 0.78]) {
        const rr = (h < 0.2 ? 0.292 : h < 0.5 ? 0.346 : h < 0.7 ? 0.342 : 0.288) * s;
        m.add(toro(rr, 0.018 * s, 28, 6), hi, { p: [x, y + h * s, z], r: [Math.PI / 2, 0, 0] });
      }
    };
    barril(-0.35, -0.55); barril(0.38, -0.5); barril(0.0, 0.45, 0.66, 0.95);
    barril(-0.34, 0.5, 0.66, 0.82);
    // saco apilado
    m.add(caja(0.5, 0.22, 0.34, 0.1, 3), ['saco_arena', { color: 0xc9b37e }], { p: [0.42, 0.8, 0.55], r: [0, 0.4, 0] });
    // cuerda que ata la carga
    m.add(tubo([[-0.85, 1.05, -0.9], [-0.1, 1.62, -0.4], [0.5, 1.5, 0.2], [0.85, 1.05, 0.5]], 0.014, 20, 5), ['cuerda', { color: 0xb8a070 }], {});
    this.construir(m);

    // ruedas
    this.ruedas = [];
    const ru = this.malla();
    const R = 0.58;
    ru.add(torno([[R - 0.06, -0.05], [R, -0.045], [R, 0.045], [R - 0.06, 0.05]], 28), mad, { r: [0, 0, Math.PI / 2] });
    ru.add(toro(R + 0.005, 0.022, 36, 8), hi, { p: [0.05, 0, 0], r: [0, Math.PI / 2, 0] });
    ru.add(toro(R + 0.005, 0.022, 36, 8), hi, { p: [-0.05, 0, 0], r: [0, Math.PI / 2, 0] });
    ru.add(cil(0.11, 0.11, 0.2, 16), lat, { r: [0, 0, Math.PI / 2] });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ru.add(cil(0.026, 0.026, R - 0.1, 8), mad, { p: [0, Math.cos(a) * (R / 2 + 0.03), Math.sin(a) * (R / 2 + 0.03)], r: [a, 0, 0] }); }
    const ruedaGeo = new THREE.Group(); ru.construir(ruedaGeo);
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(s * 1.05, R, -0.1);
      const meshes = []; ruedaGeo.children.forEach((c) => { const cl = new THREE.Mesh(c.geometry, c.material); cl.castShadow = true; g.add(cl); });
      this.grupo.add(g); this.ruedas.push(g);
    }
    // mecha
    this.mecha = new THREE.Group(); this.mecha.position.set(0.1, 1.6, 0.3); this.grupo.add(this.mecha);
    const geo = cil(0.012, 0.012, 1, 6); this._extras.push(geo.clone());
    this.cordon = new THREE.Mesh(geo, this.propio(emisivo(0x35291a, 0.0)));
    this.cordon.visible = false; this.mecha.add(this.cordon);
    this.punta = new THREE.Mesh(esfera(0.035, 8), this.propio(emisivo(0xffb347, 5)));
    this.punta.visible = false; this.mecha.add(this.punta);
  }

  encender() {
    if (this.encendida || !this.vivo) return;
    this.encendida = true; this.restante = this.tMecha; this.estado = 'activo';
    this.cordon.visible = this.punta.visible = true;
    this.sonido('mecha', { volumen: 0.7 });
    this.luzMecha = this.luz({ x: this.pos.x, y: 1.8, z: this.pos.z, color: 0xff9440, intensidad: 25, distancia: 7 });
    this.mensaje('¡La mecha está encendida! Aléjate de la carreta.', 'aviso', 2.5);
    this.juego.eventos?.emitir?.('carreta:mecha', { objeto: this });
  }

  paso(dt) {
    if (!this.vivo && this.estado !== 'activo') return;
    // vuelo de las ruedas según la velocidad a lo largo del eje
    const b = this.cb;
    if (b && b.activo) {
      const v = b.vx * Math.sin(this.rot) + b.vz * Math.cos(this.rot);
      this.ang += (v / 0.58) * dt;
      for (const r of this.ruedas) r.rotation.x = this.ang;
    }
    if (this.encendida && this.vivo) {
      this.restante -= dt;
      const f = Math.max(0, this.restante / this.tMecha);
      this.cordon.scale.set(1, Math.max(0.02, 0.5 * f + 0.02), 1);
      this.cordon.position.y = (this.cordon.scale.y) / 2 - 0.0;
      this.punta.position.y = this.cordon.scale.y + 0.02;
      this.punta.material.emissiveIntensity = 4 + Math.sin(this.t * 60) * 2;
      this.chispa -= dt;
      const lp = this.punta.getWorldPosition(this._wp || (this._wp = new THREE.Vector3()));
      if (this.chispa <= 0) { this.chispa = 0.07; this.fx('chispas', lp.x, lp.y, lp.z, { cantidad: 3 }); this.fx('humo', lp.x, lp.y + 0.1, lp.z, { cantidad: 1, escala: 0.3 }); }
      if (this.luzMecha) { this.luzMecha.pos.set(lp.x, lp.y + 0.2, lp.z); this.luzMecha.intensidad = 18 + Math.random() * 14; }
      if (this.restante <= 0) this.detonar();
    }
  }
  posFisica() {
    const b = this.cb;
    if (!b || !b.activo) return;
    this.pos.x = b.x; this.pos.z = b.z;
    this.grupo.position.set(b.x, 0, b.z);
  }

  alDanio(info) {
    this.fx('astillas', info.x ?? this.pos.x, 0.9, info.z ?? this.pos.z, { cantidad: 4 });
    if ((info.tipo === 'fuego') && !this.encendida) this.encender();
  }
  alDestruirse(info) { this.detonar(); }

  detonar() {
    if (this._det) return; this._det = true; this.vivo = false; this.estado = 'destruido';
    const x = this.pos.x, z = this.pos.z;
    this.explotar({ x, z, radio: this.opciones.radio ?? 9, danio: this.opciones.danio ?? 260, empuje: 14, y: 0.8 });
    this.fx('explosion_grande', x, 0.8, z, { escala: 1.5 });
    this.escombros({ x, y: 1, z, cantidad: 22, material: 'madera', fuerza: 8 });
    this.escombros({ x, y: 1, z, cantidad: 8, material: 'metal', fuerza: 7 });
    this.calco('crater', x, z, 4);
    this.zona({ x, z, radio: 3, duracion: 5, dps: 8 });
    this.sacudir(0.6, 0.5);
    this.quitarLuz(this.luzMecha); this.luzMecha = null;
    this.grupo.visible = false;
    for (const c of [...this._cuerpos]) this.quitarCuerpo(c);
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
}
registrarTipo('carreta', (juego, o) => new Carreta(juego, o));
