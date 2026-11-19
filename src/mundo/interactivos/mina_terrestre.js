// 1900 · Mina terrestre: casi invisible (un destello rojo periódico). Estalla cuando la pisa un zombi (los jugadores solo si `hostil`).
// Opciones de crear: { x, z, hostil=false, radio=5 (m), danio=170 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, esfera, emisivo } from './comun.js';

class MinaTerrestre extends Interactivo {
  constructor(juego, o) {
    super(juego, 'mina_terrestre', o, { vida: 6, material: 'metal', radio: 0.3 });
    this.hostil = !!o.hostil;
    this._modelo();
    this.estado = 'disponible';
    this.armada = false; this.tArma = o.armadoInmediato ? 0 : 0.8;
  }
  _modelo() {
    const m = this.malla(), tierra = ['hierro_oxidado', { color: 0x4a3f2c, desgaste: 0.9 }];
    m.add(torno([[0, 0], [0.26, 0], [0.27, 0.03], [0.25, 0.07], [0.2, 0.09], [0.0, 0.1]], 24), tierra, { p: [0, -0.02, 0] });
    m.add(cil(0.1, 0.11, 0.035, 16), tierra, { p: [0, 0.1, 0] });
    for (let i = 0; i < 3; i++) { const a = i * 2.094; m.add(cil(0.012, 0.014, 0.06, 6), tierra, { p: [Math.cos(a) * 0.17, 0.11, Math.sin(a) * 0.17] }); }
    // montículo de tierra encima
    m.add(torno([[0, 0.02], [0.34, 0.0], [0.3, 0.04], [0.15, 0.08], [0.0, 0.09]], 14), ['tierra', { color: 0x6b5a40 }], { p: [0, 0.0, 0] });
    this.construir(m, this.grupo, { sombra: false });
    this.mLed = this.propio(emisivo(0xff2010, 0));
    this.led = new THREE.Mesh(esfera(0.018, 8), this.mLed); this.led.position.set(0.1, 0.12, 0.05); this.grupo.add(this.led); this._extras.push(this.led.geometry);
  }
  paso(dt) {
    if (this.tArma > 0) { this.tArma -= dt; if (this.tArma <= 0) this.armada = true; return; }
    const ciclo = (this.t + this.pos.x * 0.37) % 2.8;
    this.mLed.emissiveIntensity = ciclo < 0.12 ? 7 : 0;
    const r = this.opciones.radioDisparo ?? 0.55;
    let pisa = false;
    this.alrededor(this.pos.x, this.pos.z, r, (e, d) => { if (d <= r) pisa = true; }, { jugadores: this.hostil });
    if (pisa) this.detonar();
  }
  alDanio(info) { if (info.tipo === 'explosivo' || info.cantidad >= 6) { /* destruirse detona */ } }
  alDestruirse() { this.detonar(); }
  detonar() {
    if (this._det) return; this._det = true; this.vivo = false; this.estado = 'destruido';
    const { x, z } = this.pos;
    this.explotar({ x, z, radio: this.opciones.radio ?? 5, danio: this.opciones.danio ?? 170, empuje: 10, y: 0.2 });
    this.fx('explosion', x, 0.3, z, { escala: 1.2 }); this.fx('polvo', x, 0.2, z, { escala: 1.6 });
    this.calco('crater', x, z, 2.2); this.sacudir(0.3, 0.3);
    this.grupo.visible = false;
  }
}
registrarTipo('mina_terrestre', (juego, o) => new MinaTerrestre(juego, o));
