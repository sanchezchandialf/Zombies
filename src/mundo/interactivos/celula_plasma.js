// 2050 · Célula de plasma inestable: contenedor transportable. Al usarla sale rodando en la dirección de la mira y detona
// (energía, área grande) al chocar o a los 3,5 s; también detona si la destruyen.
// Opciones de crear: { x, z, rot, radio=10 (m), danio=220, mecha=3.5 (s), velocidad=11 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, Rayos, rango, lim } from './comun.js';

class CelulaPlasma extends Interactivo {
  constructor(juego, o) {
    super(juego, 'celula_plasma', o, { vida: 30, material: 'energia', radio: 0.4, resist: { energia: 0 } });
    this.rodando = false; this.arm = 0; this.mecha = o.mecha ?? 3.5; this.v = o.velocidad ?? 11; this.ang = 0; this.tilt = 0; this.yaw = 0; this.tLanz = 0;
    this._modelo();
    this.cb = this.cuerpo({
      forma: 'circulo', x: this.pos.x, z: this.pos.z, radio: 0.4, masa: 45, amortiguacion: 2.6, rebote: 0.35, capa: CAPA.PROP,
      alColisionar: (otro, nx, nz, pen, vel) => { if (this.rodando && this.tLanz > 0.2 && !otro.sensor && vel > 1.5) this.detonar(); },
    });
    this.registrar({ radioUso: 2.0, etiqueta: 'Lanzar la célula de plasma', puedeUsar: () => this.vivo && !this.rodando, usar: (j) => this.lanzar(j) });
  }
  _modelo() {
    this.yawG = new THREE.Group(); this.grupo.add(this.yawG);
    this.tiltG = new THREE.Group(); this.tiltG.position.y = 0.45; this.yawG.add(this.tiltG);
    this.rodG = new THREE.Group(); this.tiltG.add(this.rodG);
    const m = this.malla(), blanco = ['casco_nave', { color: 0xdfe6ea, desgaste: 0.35 }], neg = ['hierro_forjado', { color: 0x14161a }], crom = ['acero_cepillado', {}];
    // tapas y abrazaderas (el cilindro va en eje Y local del rodG)
    m.add(torno([[0, -0.46], [0.3, -0.46], [0.36, -0.4], [0.37, -0.32], [0.3, -0.28], [0, -0.28]], 24), blanco, {});
    m.add(torno([[0, 0.46], [0.3, 0.46], [0.36, 0.4], [0.37, 0.32], [0.3, 0.28], [0, 0.28]], 24), blanco, {});
    for (const y of [-0.3, 0.3]) m.add(toro(0.32, 0.03, 24, 8), neg, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; m.add(cil(0.025, 0.025, 0.6, 8), crom, { p: [Math.cos(a) * 0.335, 0, Math.sin(a) * 0.335] }); }
    m.add(cil(0.07, 0.07, 0.1, 10), neg, { p: [0, 0.52, 0] });
    m.add(cil(0.07, 0.07, 0.1, 10), neg, { p: [0, -0.52, 0] });
    m.add(caja(0.2, 0.12, 0.02, 0.01), 'rayas_peligro', { p: [0, 0.4, 0.375] });
    this.construir(m, this.rodG);
    // cápsula de cristal y plasma
    const cg = cil(0.3, 0.3, 0.56, 28); const vm = this.propio(new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.25, clearcoat: 1 }));
    this.cristal = new THREE.Mesh(cg, vm); this.rodG.add(this.cristal); this._extras.push(cg);
    this.mPlasma = this.propio(emisivo(0xff4af0, 3.5, { transparent: true, opacity: 0.95 }));
    this.mPlasma2 = this.propio(emisivo(0x6af2ff, 4));
    const pg = esfera(0.22, 20); this.plasma = new THREE.Mesh(pg, this.mPlasma); this.rodG.add(this.plasma); this._extras.push(pg);
    const ng = esfera(0.1, 14); this.nucleo = new THREE.Mesh(ng, this.mPlasma2); this.rodG.add(this.nucleo); this._extras.push(ng);
    this.anillo = new THREE.Mesh(toro(0.27, 0.012, 36, 6), this.mPlasma2); this.rodG.add(this.anillo); this._extras.push(this.anillo.geometry);
    this.anillo2 = new THREE.Mesh(toro(0.27, 0.01, 36, 6), this.mPlasma); this.rodG.add(this.anillo2); this._extras.push(this.anillo2.geometry);
    // patas de apoyo (se ocultan al rodar? no: pequeñas)
    this.luzC = this.luz({ x: this.pos.x, y: 0.9, z: this.pos.z, color: 0xff6af0, intensidad: 18, distancia: 7 });
    this.rayos = new Rayos(this._escena || this.grupo, { color: 0xff5af0, ancho: 0.05, maxSegmentos: 40, nucleo: 0xd8ffff });
  }
  lanzar(j) {
    if (this.rodando || !this.vivo) return;
    let rot = j?.rot;
    if (rot === undefined || rot === null) { rot = Math.atan2(this.pos.x - (j?.pos?.x ?? this.pos.x), this.pos.z - (j?.pos?.z ?? this.pos.z)); }
    const dx = Math.sin(rot), dz = Math.cos(rot);
    this.cb.amortiguacion = 0.35;
    this.cb.vx = dx * this.v; this.cb.vz = dz * this.v;
    this.cb.x = this.pos.x + dx * 0.7; this.cb.z = this.pos.z + dz * 0.7;
    this.yaw = rot; this.rodando = true; this.arm = this.mecha; this.tLanz = 0; this.estado = 'activo';
    this.sonido('plasma_lanzada', { volumen: 0.9 });
    this.mensaje('¡Célula de plasma lanzada!', 'aviso', 1.5);
  }
  paso(dt) {
    const v = this.cb ? Math.hypot(this.cb.vx, this.cb.vz) : 0;
    const inest = this.rodando ? 1 : 0;
    // animación de plasma
    const p = 0.5 + 0.5 * Math.sin(this.t * (this.rodando ? 24 : 7));
    this.mPlasma.emissiveIntensity = (this.rodando ? 5 : 2.8) + p * (this.rodando ? 3 : 1.4); this.mPlasma2.emissiveIntensity = 3.5 + p * 2;
    this.plasma.scale.setScalar(0.9 + p * 0.18 + inest * 0.1); this.nucleo.position.set(Math.sin(this.t * 5) * 0.05, Math.sin(this.t * 3.3) * 0.12, Math.cos(this.t * 4.1) * 0.05);
    this.anillo.rotation.set(this.t * 3, this.t * 1.2, 0); this.anillo2.rotation.set(0.7, this.t * -2.4, this.t * 2);
    if (this.luzC) { this.luzC.intensidad = 14 + p * 12 + inest * 30; this.luzC.pos.set(this.pos.x, 0.9, this.pos.z); }
    // arcos esporádicos (inestable)
    this.rayos.limpiar();
    if (Math.random() < (this.rodando ? 0.8 : 0.12)) {
      const a = Math.random() * Math.PI * 2;
      this.rayos.arco(this.pos.x, 0.9, this.pos.z, this.pos.x + Math.cos(a) * 0.9, rango(0.1, 1.5), this.pos.z + Math.sin(a) * 0.9, { seg: 5, jitter: 0.12, ramas: false });
    }
    this.rayos.subir(1);
    if (this.rodando) {
      this.tLanz += dt; this.arm -= dt;
      this.tilt += (Math.PI / 2 - this.tilt) * Math.min(1, dt * 10);
      this.yawG.rotation.y = this.yaw; this.tiltG.rotation.z = this.tilt;
      this.ang -= (v / 0.37) * dt; this.rodG.rotation.y = this.ang;
      this.tiltG.position.y = 0.37 + (0.45 - 0.37) * (1 - this.tilt / (Math.PI / 2));
      if (Math.random() < dt * 25) this.fx('chispas', this.pos.x, 0.4, this.pos.z, { cantidad: 2, color: 0xff6af0 });
      if (this.arm <= 0) this.detonar();
    }
  }
  posFisica() {
    if (!this.cb || !this.cb.activo) return;
    this.pos.x = this.cb.x; this.pos.z = this.cb.z; this.grupo.position.set(this.pos.x, 0, this.pos.z);
    this.grupo.rotation.y = 0;
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 0.5, info.z ?? this.pos.z, { cantidad: 6, color: 0xff6af0 }); }
  alDestruirse() { this.detonar(); }
  detonar() {
    if (this._det) return; this._det = true; this.vivo = false; this.estado = 'destruido';
    const { x, z } = this.pos;
    this.explotar({ x, z, radio: this.opciones.radio ?? 10, danio: this.opciones.danio ?? 220, tipo: 'energia', empuje: 16, y: 0.5 });
    this.fx('plasma', x, 0.6, z, { escala: 2.4 }); this.fx('onda', x, 0.5, z, { escala: 3.4, color: 0xff6af0 }); this.fx('explosion_grande', x, 0.6, z, { escala: 1.4 });
    this.destello(x, 1, z, 0xff8af4, 4, 0.5, 14);
    this.zona({ x, z, radio: 4.5, duracion: 2.5, tipo: 'gravedad', dps: 0, afecta: 'zombis' });
    this.calco('quemadura', x, z, 5); this.sacudir(0.6, 0.55); this.sonido('plasma_explosion', { volumen: 1 });
    this.yawG.visible = false; this.quitarCuerpo(this.cb); this.quitarLuz(this.luzC); this.luzC = null; this.rayos.limpiar(); this.rayos.subir(0);
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
  alLimpiar() { this.rayos?.destruir(); }
}
registrarTipo('celula_plasma', (juego, o) => new CelulaPlasma(juego, o));
