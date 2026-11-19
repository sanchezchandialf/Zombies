// 1950 · Surtidor de gasolina: al dañarlo fuga un charco creciente que se inflama (fuego o chispa) → gran explosión y zona de fuego.
// Opciones de crear: { x, z, rot, vida=120, radioMax=3.4 (charco), explosion=9 (radio), danio=260 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, lim, suave } from './comun.js';

class SurtidorGasolina extends Interactivo {
  constructor(juego, o) {
    super(juego, 'surtidor_gasolina', o, { vida: o.vida ?? 120, material: 'metal', radio: 0.6, resist: { fuego: 0 } });
    this.fuga = false; this.tFuga = 0; this.rCharco = 0; this.radioMax = o.radioMax ?? 3.4; this.ardiendo = false; this.fuegoT = 0;
    this._modelo();
    this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: 0.33, hz: 0.27, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA });
    this.estado = 'disponible';
  }
  _modelo() {
    const m = this.malla(), rojo = ['acero_pintado', { color: 0xc42a1f, desgaste: 0.45 }], crom = 'cromo', hi = ['hierro_forjado', { color: 0x1a1c1e }];
    m.add(caja(0.9, 0.2, 0.7, 0.05), 'hormigon', { p: [0, 0.1, 0] });
    m.add(caja(0.62, 1.4, 0.46, 0.12, 4), rojo, { p: [0, 0.9, 0] });
    m.add(caja(0.66, 0.1, 0.5, 0.04), crom, { p: [0, 0.3, 0] });
    m.add(caja(0.66, 0.06, 0.5, 0.03), crom, { p: [0, 1.6, 0] });
    // franja y rótulo
    m.add(caja(0.5, 0.18, 0.02, 0.01), ['acero_pintado', { color: 0xf2efe6 }], { p: [0, 1.35, 0.235] });
    m.add(caja(0.48, 0.3, 0.02, 0.02), hi, { p: [0, 0.98, 0.235] });
    for (let i = 0; i < 5; i++) m.add(caja(0.06, 0.1, 0.02, 0.01), ['tela', { color: 0xf2efe6 }], { p: [-0.18 + i * 0.09, 0.98, 0.25] });
    m.add(caja(0.1, 0.1, 0.02, 0.02), crom, { p: [0.0, 0.7, 0.235] });
    // cabezal con globo y estrella
    m.add(cil(0.2, 0.22, 0.12, 20), crom, { p: [0, 1.69, 0] });
    m.add(cil(0.04, 0.04, 0.3, 8), crom, { p: [0, 1.9, 0] });
    // soporte de pistola + manguera + pistola
    m.add(caja(0.12, 0.14, 0.1, 0.03), hi, { p: [0.36, 1.0, 0.05] });
    m.add(tubo([[0.3, 1.2, 0], [0.5, 1.15, 0.3], [0.62, 0.7, 0.35], [0.52, 0.32, 0.4], [0.32, 0.22, 0.38]], 0.032, 22, 7), 'goma', {});
    m.add(caja(0.07, 0.2, 0.09, 0.025), hi, { p: [0.4, 1.0, 0.08], r: [0, 0, -0.2] });
    m.add(cil(0.012, 0.012, 0.22, 6), crom, { p: [0.4, 1.08, 0.15], r: [Math.PI / 2 - 0.2, 0, 0] });
    this.construir(m);
    // globo de cristal luminoso (lámpara)
    this.mGlobo = this.propio(emisivo(0xffe9a0, 1.8, { transparent: true, opacity: 0.92 }));
    this.globo = new THREE.Mesh(esfera(0.2, 20), this.mGlobo); this.globo.position.set(0, 2.06, 0); this.grupo.add(this.globo); this._extras.push(this.globo.geometry);
    this.luzG = this.luz({ x: this.pos.x, y: 2.1, z: this.pos.z, color: 0xffe4a0, intensidad: 14, distancia: 6 });
  }
  _crearCharco() {
    const g = new THREE.CircleGeometry(1, 40); g.rotateX(-Math.PI / 2);
    const mt = new THREE.MeshPhysicalMaterial({ color: 0x1b140a, roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 });
    this.charco = new THREE.Mesh(g, mt); this.charco.position.set(this.pos.x, 0.045, this.pos.z); this.charco.scale.setScalar(0.01); this.charco.renderOrder = 1;
    this.propioObj(this.charco, this._escena || this.grupo);
  }
  alDanio(info) {
    this.fx('chispas', info.x ?? this.pos.x, 1.0, info.z ?? this.pos.z, { cantidad: 4 });
    if (!this.fuga) { this.fuga = true; this._crearCharco(); this.sonido('fuga_gas', { volumen: 0.7 }); this.mensaje('¡El surtidor pierde gasolina!', 'aviso', 2.5); this.estado = 'activo'; }
    if (this.ardiendo) return;
    if (info.tipo === 'fuego' || info.tipo === 'explosivo' || info.tipo === 'energia') this.inflamar();
    else if (Math.random() < 0.22) this.inflamar();
  }
  alDestruirse() { this.inflamar(); }
  inflamar() {
    if (this.ardiendo) return; this.ardiendo = true; this.vivo = false; this.estado = 'destruido';
    const { x, z } = this.pos, r = Math.max(1.2, this.rCharco);
    this.explotar({ x, z, radio: this.opciones.explosion ?? 9, danio: this.opciones.danio ?? 260, empuje: 16, y: 0.8 });
    this.fx('explosion_grande', x, 0.9, z, { escala: 1.6 }); this.fx('fuego', x, 0.3, z, { escala: 2 });
    this.zona({ x, z, radio: r + 0.8, duracion: 10, dps: 12 });
    this.emisor('fuego', x, 0.1, z, { escala: 2.2, duracion: 10 }); this.emisor('humo', x, 1.5, z, { escala: 2.4, duracion: 18 });
    this.calco('quemadura', x, z, r * 2.4 + 2); this.sacudir(0.7, 0.55);
    this.escombros({ x, y: 1, z, cantidad: 14, material: 'metal', fuerza: 9 });
    this.globo.visible = false; this.quitarLuz(this.luzG); this.luzG = null;
    this.luzFuego = this.luz({ x, y: 1.2, z, color: 0xff7a24, intensidad: 90, distancia: 14 });
    this.grupo.scale.y = 0.85; this.fuegoT = 10;
    if (this.charco) { this.charco.material.color.setHex(0x080604); }
  }
  paso(dt) {
    this.mGlobo.emissiveIntensity = this.ardiendo ? 0 : 1.6 + Math.sin(this.t * 3) * 0.2;
    if (this.fuga && !this.ardiendo) {
      this.tFuga += dt;
      this.rCharco = this.radioMax * suave(this.tFuga / 6) * (0.9 + 0.1 * Math.sin(this.t * 1.7));
      this.charco.scale.setScalar(Math.max(0.01, this.rCharco));
      if (Math.random() < dt * 8) this.fx('salpicadura', this.pos.x + (Math.random() - 0.5) * 0.4, 0.4, this.pos.z + 0.3, { cantidad: 1, escala: 0.3 });
      if (this.hayFuegoEn(this.pos.x, this.pos.z, this.rCharco * 0.8) || this.tFuga > 12) this.inflamar();
    }
    if (this.ardiendo) {
      this.fuegoT -= dt;
      if (this.luzFuego) this.luzFuego.intensidad = Math.max(0, 40 + Math.sin(this.t * 17) * 25 + Math.random() * 20) * lim(this.fuegoT / 3, 0, 1);
      if (this.fuegoT <= 0) { this.quitarLuz(this.luzFuego); this.luzFuego = null; if (this.charco) this.charco.visible = false; }
    }
  }
}
registrarTipo('surtidor_gasolina', (juego, o) => new SurtidorGasolina(juego, o));
