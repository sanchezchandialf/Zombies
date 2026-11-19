// 2050 · Puerta de energía: barrera entre dos postes que se abre/cierra al usarla. Cerrada bloquea el paso (estructura estática,
// navegación reconstruida) y daña al contacto; tiene batería que se agota.
// Opciones de crear: { x, z, rot (la puerta corre por su eje X local), ancho=5, cerrada=true, dps=28, duracionBateria=60 (s) }
// API añadida: .cerrada, .bateria (0..1)
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, emisivo, lim, suave } from './comun.js';

class PuertaEnergia extends Interactivo {
  constructor(juego, o) {
    super(juego, 'puerta_energia', o, { vida: 220, material: 'energia', radio: (o.ancho ?? 5) / 2, resist: { energia: 0 } });
    this.ancho = o.ancho ?? 5; this.dps = o.dps ?? 28; this.dur = o.duracionBateria ?? 60;
    this.cerrada = false; this.bateria = 1; this.apertura = 0; this.tic = 0; this.cb = null; this.bloqueada = false;
    this._modelo();
    for (const s of [-1, 1]) { const c = Math.cos(this.rot), sn = Math.sin(this.rot); this.cuerpo({ forma: 'circulo', x: this.pos.x + s * (this.ancho / 2) * c, z: this.pos.z - s * (this.ancho / 2) * sn, radio: 0.3, masa: 0, capa: CAPA.ESTRUCTURA }); }
    if (o.cerrada !== false) this._poner(true);
    this.registrar({ radioUso: 2.8, etiqueta: () => (this.bateria <= 0.02 ? 'Sin batería' : this.cerrada ? 'Abrir la puerta de energía' : 'Cerrar la puerta de energía'), puedeUsar: () => this.vivo && (this.cerrada || this.bateria > 0.2), usar: () => this.alternar() });
  }
  _textura() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(120,230,255,0.10)'); gr.addColorStop(0.5, 'rgba(255,90,240,0.20)'); gr.addColorStop(1, 'rgba(120,230,255,0.12)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 8; i++) { const x = i * 16 + 8; const lg = g.createLinearGradient(x - 4, 0, x + 4, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(210,250,255,0.9)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(x - 4, 0, 8, 256); }
    for (let y = 0; y < 256; y += 32) { g.fillStyle = 'rgba(255,120,245,0.55)'; g.fillRect(0, y, 128, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  _modelo() {
    const m = this.malla(), blanco = ['casco_nave', { color: 0xdfe6ea, desgaste: 0.2 }], neg = ['composite_futurista', { color: 0xff3df0 }], hi = ['hierro_forjado', { color: 0x14161a }];
    const A = this.ancho;
    this.mNodo = this.propio(emisivo(0xff3df0, 2.5));
    for (const s of [-1, 1]) {
      const x = s * A / 2;
      m.add(caja(0.8, 0.14, 0.8, 0.05), neg, { p: [x, 0.07, 0] });
      m.add(torno([[0, 0], [0.26, 0], [0.22, 0.4], [0.17, 1.8], [0.2, 2.4], [0.0, 2.52]], 6), blanco, { p: [x, 0.12, 0], r: [0, Math.PI / 6, 0] });
      m.add(caja(0.36, 0.3, 0.36, 0.06), hi, { p: [x, 2.7, 0] });
      m.add(caja(0.16, 0.5, 0.5, 0.04), hi, { p: [x - s * 0.02, 1.2, 0] });
    }
    // emisores superior e inferior (rieles)
    m.add(caja(A, 0.08, 0.12, 0.03), hi, { p: [0, 0.14, 0] });
    this.construir(m);
    this.nodos = [];
    for (const s of [-1, 1]) for (const y of [0.35, 0.9, 1.45, 2.0, 2.7]) { const n = new THREE.Mesh(esfera(y > 2.6 ? 0.1 : 0.05, 10), this.mNodo); n.position.set(s * A / 2, y, 0.0); n.scale.z = 1; this.grupo.add(n); this.nodos.push(n); this._extras.push(n.geometry); }
    // barrera
    this.textura = this._textura(); this.textura.repeat.set(A * 1.4, 1);
    this.mBarrera = new THREE.MeshBasicMaterial({ map: this.textura, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this._propios.push(this.mBarrera);
    const pg = new THREE.PlaneGeometry(A - 0.4, 2.3); this.barrera = new THREE.Mesh(pg, this.mBarrera); this.barrera.position.y = 1.3; this.barrera.renderOrder = 4; this.grupo.add(this.barrera); this._extras.push(pg);
    this.mBorde = this.propio(emisivo(0xff3df0, 3));
    const bg = caja(A - 0.3, 0.06, 0.06, 0.02); this.bordeA = new THREE.Mesh(bg, this.mBorde); this.bordeB = new THREE.Mesh(bg, this.mBorde);
    this.bordeA.position.y = 0.2; this.bordeB.position.y = 2.45; this.grupo.add(this.bordeA, this.bordeB); this._extras.push(bg);
    this.luzP = this.luz({ x: this.pos.x, y: 1.4, z: this.pos.z, color: 0xff6af0, intensidad: 0, distancia: 7 });
    this.barrera.visible = false; this.bordeA.visible = this.bordeB.visible = false;
  }
  _poner(cerr) {
    if (cerr === this.cerrada) return;
    this.cerrada = cerr;
    if (cerr) {
      this.cb = this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: this.ancho / 2 - 0.1, hz: 0.14, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA, bloqueaBalas: false, bloqueaVision: false });
      this.sonido('puerta_energia_cierra', { volumen: 0.8 });
    } else { this.quitarCuerpo(this.cb); this.cb = null; this.sonido('puerta_energia_abre', { volumen: 0.8 }); }
    this.rehacerNavegacion();
    this.juego.eventos?.emitir?.(cerr ? 'estructura:creada' : 'estructura:destruida', { estructura: this });
  }
  alternar() {
    if (!this.vivo) return;
    if (this.cerrada) this._poner(false);
    else if (this.bateria > 0.2) this._poner(true);
  }
  paso(dt) {
    const objetivo = this.cerrada ? 1 : 0; this.apertura += (objetivo - this.apertura) * Math.min(1, dt * 7);
    const vis = this.apertura > 0.02; this.barrera.visible = vis; this.bordeA.visible = this.bordeB.visible = vis;
    this.barrera.scale.y = Math.max(0.01, this.apertura); this.barrera.position.y = 0.2 + 1.15 * this.apertura; this.bordeB.position.y = 0.2 + 2.25 * this.apertura;
    const baja = this.bateria < 0.2 ? (Math.sin(this.t * 22) > 0 ? 1 : 0.35) : 1;
    this.textura.offset.x += dt * 0.6; this.textura.offset.y -= dt * 0.15;
    this.mBarrera.opacity = (0.7 + Math.sin(this.t * 20) * 0.08) * baja;
    this.mNodo.emissiveIntensity = (this.cerrada ? 3 : 0.7 + this.bateria * 0.6) * baja * (this.vivo ? 1 : 0);
    this.mNodo.emissive.setHex(this.bateria <= 0.02 ? 0xff3020 : this.cerrada ? 0xff3df0 : 0x6af2ff);
    if (this.luzP) this.luzP.intensidad = this.cerrada && this.vivo ? 22 * baja : 0;
    if (this.cerrada && this.vivo) {
      this.bateria = Math.max(0, this.bateria - dt / this.dur);
      this.tic -= dt;
      if (this.tic <= 0) {
        this.tic = 0.2;
        this.alrededor(this.pos.x, this.pos.z, this.ancho / 2 + 1, (e) => {
          if (!this.enCajaLocal(e.pos.x, e.pos.z, this.ancho / 2, 0.14, (e.radio ?? 0.4) + 0.2)) return;
          this.danioA(e, { cantidad: this.dps * 0.2, tipo: 'energia', atacante: null, x: e.pos.x, z: e.pos.z, dirX: 0, dirZ: 0, continuo: true, empuje: 2 });
          if (e.bando === 'zombis') e.aturdir?.(0.35);
          this.bateria = Math.max(0, this.bateria - 0.006); this.fx('electrico', e.pos.x, 1.1, e.pos.z, { cantidad: 3 });
        }, { jugadores: true });
      }
      if (this.bateria <= 0) { this._poner(false); this.mensaje('La puerta de energía se ha quedado sin batería.', 'aviso', 2.5); }
      this.estado = 'activo';
    } else if (this.vivo) {
      this.bateria = Math.min(1, this.bateria + dt / (this.dur * 0.7));
      this.estado = this.bateria > 0.2 ? 'disponible' : 'enfriamiento';
    }
  }
  alLimpiar() { this.textura?.dispose(); }
  get enfriamiento() { return this.vivo ? lim(1 - this.bateria, 0, 1) : 1; }
  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 1.2, info.z ?? this.pos.z, { cantidad: 5 }); this.bateria = Math.max(0, this.bateria - 0.01); }
  alDestruirse() {
    this._poner(false); this.fxAqui('explosion', 1.2, { escala: 0.8 }); this.fx('electrico', this.pos.x, 1.5, this.pos.z, { cantidad: 16 });
    this.mNodo.emissiveIntensity = 0; this.quitarLuz(this.luzP); this.luzP = null; this.barrera.visible = false;
    this.escombros({ x: this.pos.x, y: 1, z: this.pos.z, cantidad: 8, material: 'metal', fuerza: 5 });
    if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; }
  }
}
registrarTipo('puerta_energia', (juego, o) => new PuertaEnergia(juego, o));
