// 1900 · Alambrada de espino: ralentiza y hiere a quien la cruce (zombis y jugadores). Destructible (explosivos, fuego, golpes).
// Opciones de crear: { x, z, rot (el tramo corre a lo largo de su eje X local), largo=6, vida=140 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, esfera, tubo, toro } from './comun.js';

class Alambrada extends Interactivo {
  constructor(juego, o) {
    super(juego, 'alambrada', o, { vida: o.vida ?? 140, material: 'metal', radio: (o.largo ?? 6) / 2, resist: { bala: 0.2, perforante: 0.2, fuego: 0.6, explosivo: 1.6, golpe: 1.2 } });
    this.largo = o.largo ?? 6; this.tic = 0; this.rota = false;
    this._modelo();
    this.cb = this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: this.largo / 2, hz: 0.18, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA, mascara: 0, bloqueaBalas: true });
  }
  _modelo() {
    const L = this.largo, n = Math.max(2, Math.round(L / 1.5) + 1), m = this.malla(), hi = ['hierro_oxidado', { desgaste: 0.6 }], mad = 'tablas_viejas';
    this.postes = new THREE.Group(); this.alambre = new THREE.Group(); this.grupo.add(this.postes, this.alambre);
    const pm = this.malla();
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (L * i) / (n - 1), inc = (i % 2 ? 0.04 : -0.03);
      pm.add(cil(0.045, 0.055, 1.35, 8), mad, { p: [x, 0.62, 0], r: [inc, 0, inc * 0.5] });
      pm.add(cil(0.035, 0.045, 0.1, 8), hi, { p: [x, 1.31, 0], r: [inc, 0, 0] });
      pm.add(esfera(0.07, 10), mad, { p: [x, 0.0, 0], s: [1, 0.3, 1] });
    }
    this.construir(pm, this.postes);
    const w = this.malla(), acero = ['hierro_forjado', { desgaste: 0.5 }];
    for (const [y, r, vu] of [[0.28, 0.2, 9], [0.7, 0.23, 8], [1.12, 0.2, 9]]) {
      const pts = [], N = Math.round(L * vu), turnos = L * 3.2;
      for (let i = 0; i <= N; i++) { const t = i / N, a = t * turnos * Math.PI * 2; pts.push([-L / 2 + t * L, y + Math.sin(a) * r * (0.9 + 0.15 * Math.sin(i * 1.7)), Math.cos(a) * r * 0.9]); }
      w.add(tubo(pts, 0.011, N * 2, 5), acero, {});
      // hilo recto con púas
      w.add(cil(0.008, 0.008, L, 5), acero, { p: [0, y, 0.0], r: [0, 0, Math.PI / 2] });
      for (let x = -L / 2 + 0.15; x < L / 2; x += 0.28) { w.add(cil(0.006, 0.006, 0.1, 4), acero, { p: [x, y, 0], r: [0.7, 0, 0.5] }); w.add(cil(0.006, 0.006, 0.1, 4), acero, { p: [x, y, 0], r: [-0.7, 0, -0.5] }); }
    }
    this.construir(w, this.alambre, { recibe: false });
  }
  paso(dt) {
    if (this.rota) return;
    this.tic -= dt;
    const tocar = this.tic <= 0; if (tocar) this.tic = 0.25;
    const cb = (e) => {
      const l = this.enCajaLocal(e.pos.x, e.pos.z, this.largo / 2, 0.15, e.radio ?? 0.4);
      if (!l) return;
      if (e.bando === 'zombis') e.ralentizar?.(0.35, 0.35); else (e.aplicarEstado?.('ralentizado', 0.4, { factor: 0.45 }), e.cuerpo && (e.cuerpo.vx *= 0.6, e.cuerpo.vz *= 0.6));
      if (tocar) {
        this.danioA(e, { cantidad: e.bando === 'zombis' ? 5 : 4, tipo: 'golpe', atacante: null, x: e.pos.x, z: e.pos.z, dirX: 0, dirZ: 0, continuo: true });
        this.fx(e.bando === 'zombis' ? 'sangre' : 'chispas', e.pos.x, 0.7, e.pos.z, { cantidad: 2 });
        // desgaste por uso
        this.vida = Math.max(0, this.vida - 0.8); if (this.vida <= 0 && this.vivo) { this.vivo = false; this.estado = 'destruido'; this.alDestruirse(); }
      }
    };
    this.alrededor(this.pos.x, this.pos.z, this.largo / 2 + 1, cb, { jugadores: true });
    this.estado = this.vida < this.vidaMax * 0.5 ? 'enfriamiento' : 'disponible';
  }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 0.7, info.z ?? this.pos.z, { cantidad: 4 }); }
  alDestruirse() {
    this.rota = true; this.alambre.visible = false;
    this.postes.children.forEach((c) => { c.rotation.z += (Math.random() - 0.5) * 0.9; c.rotation.x += (Math.random() - 0.5) * 0.5; });
    this.fxAqui('chispas', 0.6, { cantidad: 14 }); this.escombros({ x: this.pos.x, y: 0.8, z: this.pos.z, cantidad: 8, material: 'metal', fuerza: 3 });
    this.quitarCuerpo(this.cb);
  }
}
registrarTipo('alambrada', (juego, o) => new Alambrada(juego, o));
