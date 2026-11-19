// 1950 · Coche aparcado de los años 50 (obstáculo estático). Su alarma atrae zombis 8 s (al usarla o al recibir daño).
// Si lo destruyen explota con mucho daño y queda el casco calcinado.
// Opciones de crear: { x, z, rot, color=0x2fb5a6, enfriamiento=15, radioAtraer=35, duracionAtraer=8 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, emisivo, extruir } from './comun.js';

const f2z = (pts) => pts.map(([f, y]) => [-f, y]); // la 'f' del perfil mira a +Z tras girar la extrusión

class AlarmaCoche extends Interactivo {
  constructor(juego, o) {
    super(juego, 'alarma_coche', o, { vida: 280, material: 'metal', radio: 1.5, resist: { bala: 0.7 } });
    this.color = o.color ?? 0x2fb5a6; this.enfri = o.enfriamiento ?? 15; this.sonando = 0; this.destello = 0;
    this.modeloGrupo = new THREE.Group(); this.grupo.add(this.modeloGrupo);
    this._modelo(false);
    this.cb = this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: 0.95, hz: 2.4, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA });
    this.registrar({ radioUso: 2.8, etiqueta: () => (this.listo && this.vivo ? 'Forzar la alarma' : 'La alarma ya suena'), puedeUsar: () => this.listo && this.vivo && this.sonando <= 0, usar: () => this.sonar() });
  }

  _modelo(quemado) {
    const g = this.modeloGrupo;
    for (const c of [...g.children]) { g.remove(c); c.geometry?.dispose?.(); }
    const m = this.malla();
    const pintura = quemado ? ['hierro_oxidado', { color: 0x1a1512, desgaste: 1 }] : ['acero_pintado', { color: this.color, desgaste: 0.35 }];
    const crom = quemado ? ['hierro_oxidado', { color: 0x2a2420 }] : 'cromo';
    const cristal = quemado ? ['hierro_oxidado', { color: 0x111111 }] : ['cristal', { color: 0xb8d8e0 }];
    const goma = 'goma';
    const cuerpo = extruir(f2z([[-2.4, 0.4], [2.3, 0.4], [2.46, 0.6], [2.36, 0.86], [1.1, 0.96], [0.8, 1.02], [-1.9, 1.0], [-2.3, 1.08], [-2.46, 0.84]]), 1.8, 0.06).rotateY(Math.PI / 2);
    m.add(cuerpo, pintura, {});
    // aletas traseras
    for (const s of [-1, 1]) m.add(extruir(f2z([[-2.46, 0.9], [-2.0, 1.0], [-2.62, 1.3], [-2.62, 1.02]]), 0.12, 0.02).rotateY(Math.PI / 2), pintura, { p: [s * 0.88, 0, 0] });
    // capó y maletero (relieve)
    m.add(caja(1.3, 0.05, 1.4, 0.03), pintura, { p: [0, 0.99, 1.55] });
    m.add(caja(1.3, 0.05, 0.9, 0.03), pintura, { p: [0, 1.04, -1.8] });
    // habitáculo: techo y montantes + cristal
    m.add(caja(1.52, 0.07, 1.3, 0.03), pintura, { p: [0, 1.46, -0.15] });
    m.add(extruir(f2z([[-1.55, 1.0], [-1.05, 1.42], [0.6, 1.42], [1.15, 1.0]]), 1.46, 0.0).rotateY(Math.PI / 2), cristal, {});
    for (const s of [-1, 1]) for (const [f, y, r] of [[1.15, 1.2, -0.56], [0.58, 1.22, 0], [-1.05, 1.22, 0.62], [-0.28, 1.22, 0]]) m.add(caja(0.07, 0.5, 0.09, 0.02), pintura, { p: [s * 0.74, y, f], r: [r, 0, 0] });
    // parabrisas panorámico (marco cromado)
    m.add(caja(1.5, 0.05, 0.05, 0.015), crom, { p: [0, 1.0, 1.17], r: [0, 0, 0] });
    // parachoques cromados y calandra
    m.add(caja(1.95, 0.16, 0.2, 0.07), crom, { p: [0, 0.52, 2.5] });
    m.add(caja(1.95, 0.16, 0.2, 0.07), crom, { p: [0, 0.52, -2.55] });
    for (const s of [-1, 1]) { m.add(esfera(0.1, 10), crom, { p: [s * 0.5, 0.58, 2.55], s: [1, 1, 1.7] }); }
    m.add(caja(1.2, 0.3, 0.06, 0.03), crom, { p: [0, 0.72, 2.45] });
    for (let i = 0; i < 6; i++) m.add(caja(0.02, 0.26, 0.04, 0.005), 'hierro_forjado', { p: [-0.5 + i * 0.2, 0.72, 2.47] });
    // moldura lateral
    for (const s of [-1, 1]) m.add(caja(0.03, 0.04, 4.2, 0.012), crom, { p: [s * 0.9, 0.76, 0] });
    // pasos de rueda y ruedas
    this.ruedas = [];
    for (const f of [1.45, -1.5]) for (const s of [-1, 1]) {
      m.add(cil(0.38, 0.38, 0.05, 20), 'hierro_forjado', { p: [s * 0.92, 0.38, f], r: [0, 0, Math.PI / 2], s: [1, 1, 1] });
      m.add(torno([[0.0, -0.11], [0.33, -0.11], [0.37, -0.07], [0.38, 0.07], [0.37, 0.11], [0.0, 0.11]], 24), goma, { p: [s * 0.88, 0.36, f], r: [0, 0, Math.PI / 2] });
      if (!quemado) m.add(cil(0.255, 0.255, 0.215, 24), ['tela', { color: 0xf2f0e8 }], { p: [s * 0.88, 0.36, f], r: [0, 0, Math.PI / 2] });
      m.add(cil(0.2, 0.2, 0.225, 20), crom, { p: [s * 0.885, 0.36, f], r: [0, 0, Math.PI / 2] });
      m.add(cil(0.07, 0.07, 0.24, 10), pintura, { p: [s * 0.885, 0.36, f], r: [0, 0, Math.PI / 2] });
    }
    this.construir(m, g);
    // faros y pilotos (emisivos con material propio)
    if (!this.mFaro) { this.mFaro = this.propio(emisivo(0xfff2c0, 0.25)); this.mPiloto = this.propio(emisivo(0xff2a20, 0.4)); this.mInter = this.propio(emisivo(0xff9a10, 0)); }
    if (!quemado) {
      this.luces3d = new THREE.Group();
      for (const s of [-1, 1]) {
        const h = new THREE.Mesh(esfera(0.13, 12), this.mFaro); h.position.set(s * 0.65, 0.78, 2.4); h.scale.set(1, 1, 0.6);
        const p = new THREE.Mesh(caja(0.28, 0.1, 0.07, 0.03), this.mPiloto); p.position.set(s * 0.65, 0.95, -2.5);
        const i = new THREE.Mesh(caja(0.14, 0.07, 0.05, 0.02), this.mInter); i.position.set(s * 0.9, 0.62, 2.43);
        this.luces3d.add(h, p, i);
      }
      g.add(this.luces3d);
      this.geosPropias = this.luces3d.children.map((c) => c.geometry);
    }
  }

  sonar() {
    if (!this.vivo || this.sonando > 0) return;
    this.sonando = this.opciones.duracionAtraer ?? 8; this.estado = 'activo';
    this.atraer(this.pos.x, this.pos.z, this.opciones.radioAtraer ?? 35, this.sonando);
    this.snd = this.bucle('alarma_coche', { volumen: 1 });
    this.luzAl = this.luz({ x: this.pos.x, y: 1.6, z: this.pos.z, color: 0xffa030, intensidad: 30, distancia: 10 });
    this.juego.eventos?.emitir?.('alarma:sonando', { objeto: this });
  }
  _parar() {
    this.sonando = 0; this.snd?.detener?.(); this.snd = null; this.quitarLuz(this.luzAl); this.luzAl = null;
    this.mFaro.emissiveIntensity = 0.25; this.mInter.emissiveIntensity = 0; this.mPiloto.emissiveIntensity = 0.4;
    if (this.vivo) { this.iniciarEnfriamiento(this.enfri); this.estado = 'enfriamiento'; }
  }
  paso(dt) {
    if (this.sonando > 0) {
      this.sonando -= dt;
      const on = Math.sin(this.t * 9) > 0;
      this.mFaro.emissiveIntensity = on ? 5 : 0.2; this.mInter.emissiveIntensity = on ? 6 : 0; this.mPiloto.emissiveIntensity = on ? 3 : 0.3;
      if (this.luzAl) { this.luzAl.intensidad = on ? 45 : 6; this.luzAl.pos.set(this.pos.x, 1.6, this.pos.z); }
      if (this.sonando <= 0) this._parar();
    } else if (this.vivo) this.estado = this.listo ? 'disponible' : 'enfriamiento';
  }
  alDanio(info) {
    this.fx('chispas', info.x ?? this.pos.x, 0.9, info.z ?? this.pos.z, { cantidad: 4 });
    if (this.sonando <= 0 && this.listo && this.vida > 0) this.sonar();
  }
  alDestruirse() {
    const { x, z } = this.pos;
    this.explotar({ x, z, radio: 7.5, danio: 230, empuje: 14, y: 0.7 });
    this.fx('explosion_grande', x, 0.8, z, { escala: 1.4 });
    this.escombros({ x, y: 1, z, cantidad: 12, material: 'metal', fuerza: 8 });
    this.zona({ x, z, radio: 3, duracion: 8, dps: 9 }); this.emisor('fuego', x, 0.5, z, { escala: 1.4, duracion: 10 }); this.emisor('humo', x, 1.2, z, { escala: 1.8, duracion: 16 });
    this.calco('quemadura', x, z, 5); this.sacudir(0.55, 0.5);
    this._parar();
    this.quitarLuz(this.luzAl);
    this._modelo(true); this.modeloGrupo.position.y = -0.05;
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
  alLimpiar() { this.snd?.detener?.(); }
}
registrarTipo('alarma_coche', (juego, o) => new AlarmaCoche(juego, o));
