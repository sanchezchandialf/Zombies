// 2000 · Valla eléctrica: tramo con postes y tres hilos. Está activa si un generador en marcha la alimenta (en su radio);
// electrocuta zombis al tocarla y consume carga del generador.
// Opciones de crear: { x, z, rot (el tramo corre por su eje X local), largo=6, dps=26, consumo=0.012 (fracción de carga por descarga), vida=160 }
// API añadida: .activa (bool)
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, emisivo, Rayos, lim, rango } from './comun.js';

class VallaElectrica extends Interactivo {
  constructor(juego, o) {
    super(juego, 'valla_electrica', o, { vida: o.vida ?? 160, material: 'metal', radio: (o.largo ?? 6) / 2, resist: { bala: 0.1, perforante: 0.1, energia: 0 } });
    this.largo = o.largo ?? 6; this.dps = o.dps ?? 26; this.consumo = o.consumo ?? 0.012; this.activa = false; this.tic = 0; this.tArco = 0; this.gen = null; this.tGen = 0;
    this._modelo();
    this.cb = this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: this.largo / 2, hz: 0.1, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA, bloqueaBalas: false, bloqueaVision: false });
    this.rehacerNavegacion();
  }
  _modelo() {
    const L = this.largo, n = Math.max(2, Math.round(L / 2) + 1), m = this.malla(), hi = ['hierro_forjado', { color: 0x25282b }], porc = ['marmol', { color: 0xd8cdb0 }], hormigon = 'hormigon_bunker';
    this.puntas = [];
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (L * i) / (n - 1);
      m.add(caja(0.2, 1.9, 0.2, 0.04), hormigon, { p: [x, 0.95, 0] });
      m.add(caja(0.32, 0.1, 0.32, 0.03), hormigon, { p: [x, 0.05, 0] });
      m.add(caja(0.14, 0.08, 0.14, 0.02), hi, { p: [x, 1.95, 0] });
      for (const y of [0.55, 1.1, 1.65]) {
        m.add(cil(0.025, 0.025, 0.2, 8), hi, { p: [x, y, 0.14], r: [Math.PI / 2, 0, 0] });
        m.add(torno([[0.0, 0], [0.04, 0], [0.065, 0.02], [0.03, 0.04], [0.065, 0.06], [0.03, 0.08], [0.0, 0.09]], 12), porc, { p: [x, y, 0.12], r: [Math.PI / 2, 0, 0] });
      }
      m.add(cil(0.01, 0.01, 0.5, 6), hi, { p: [x, 2.2, 0] });
    }
    for (const y of [0.55, 1.1, 1.65]) m.add(cil(0.008, 0.008, L, 5), ['cromo', {}], { p: [0, y, 0.2], r: [0, 0, Math.PI / 2] });
    // carteles de peligro
    for (let i = 0; i < n - 1; i++) { const x = -L / 2 + (L * (i + 0.5)) / (n - 1); m.add(caja(0.34, 0.24, 0.02, 0.012), 'rayas_peligro', { p: [x, 1.45, -0.115] }); }
    this.construir(m);
    this.mLed = this.propio(emisivo(0x3a9fff, 0));
    for (let i = 0; i < n; i++) { const x = -L / 2 + (L * i) / (n - 1); const l = new THREE.Mesh(esfera(0.045, 8), this.mLed); l.position.set(x, 2.5, 0); this.grupo.add(l); this._extras.push(l.geometry); this.puntas.push(x); }
    this.rayos = new Rayos(this._escena || this.grupo, { color: 0x58b0ff, ancho: 0.035, maxSegmentos: 120 });
  }
  _buscarGen() {
    this.gen = null;
    for (const o of this.juego.mundo?.objetos || []) if (o.tipo === 'generador' && o.vivo && o.alimenta?.(this.pos.x, this.pos.z)) { this.gen = o; break; }
  }
  paso(dt) {
    this.tGen -= dt; if (this.tGen <= 0) { this.tGen = 0.4; this._buscarGen(); }
    const act = !!this.gen && this.vivo; this.activa = act; this.estado = act ? 'activo' : this.vivo ? 'disponible' : 'destruido';
    this.mLed.emissiveIntensity = act ? 4 + Math.sin(this.t * 20) : 0;
    this.tArco -= dt;
    if (act && this.tArco <= 0) {
      this.tArco = 0.06; this.rayos.limpiar();
      const c = Math.cos(this.rot), s = Math.sin(this.rot), L = this.largo;
      for (let k = 0; k < 4; k++) {
        const x1 = rango(-L / 2, L / 2 - 0.5), x2 = x1 + rango(0.2, 0.7), y1 = [0.55, 1.1, 1.65][Math.floor(Math.random() * 3)], y2 = [0.55, 1.1, 1.65][Math.floor(Math.random() * 3)];
        this.rayos.arco(this.pos.x + x1 * c + 0.2 * s, y1, this.pos.z - x1 * s + 0.2 * c, this.pos.x + x2 * c + 0.2 * s, y2, this.pos.z - x2 * s + 0.2 * c, { seg: 5, jitter: 0.08, ramas: false });
      }
      this.rayos.subir(1);
    } else if (!act && this.rayos.n) { this.rayos.limpiar(); this.rayos.subir(0); }
    this.tic -= dt;
    if (act && this.tic <= 0) {
      this.tic = 0.2; let toco = false;
      this.alrededor(this.pos.x, this.pos.z, this.largo / 2 + 1, (e) => {
        if (e.bando !== 'zombis') return;
        const l = this.enCajaLocal(e.pos.x, e.pos.z, this.largo / 2, 0.15, (e.radio ?? 0.4) + 0.25);
        if (!l) return;
        toco = true;
        e.aturdir?.(0.55);
        this.danioA(e, { cantidad: this.dps * 0.2, tipo: 'energia', atacante: null, x: e.pos.x, z: e.pos.z, dirX: 0, dirZ: 0, continuo: true });
        this.fx('electrico', e.pos.x, 1.1, e.pos.z, { cantidad: 4 });
        this.rayos.arco(e.pos.x, 1.0, e.pos.z, this.pos.x + l.lx * c0(this.rot) + 0.2 * Math.sin(this.rot), 1.1, this.pos.z - l.lx * Math.sin(this.rot) + 0.2 * Math.cos(this.rot), { seg: 4, jitter: 0.15 });
      });
      if (toco) { this.gen.consumir?.(this.consumo); this.rayos.subir(1); this.sonido('electrocucion', { volumen: 0.7 }); }
    }
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 1.1, info.z ?? this.pos.z, { cantidad: 5 }); }
  alDestruirse() {
    this.activa = false; this.quitarCuerpo(this.cb); this.rehacerNavegacion();
    this.grupo.children.forEach((c) => { if (c.isMesh) { c.rotation.z += 0.3; c.position.y -= 0.3; } });
    this.mLed.emissiveIntensity = 0; this.rayos.limpiar(); this.rayos.subir(0);
    this.fxAqui('chispas', 1, { cantidad: 14 }); this.escombros({ x: this.pos.x, y: 1, z: this.pos.z, cantidad: 8, material: 'piedra', fuerza: 4 });
  }
  alLimpiar() { this.rayos?.destruir(); this.rehacerNavegacion(); }
}
const c0 = Math.cos;
registrarTipo('valla_electrica', (juego, o) => new VallaElectrica(juego, o));
