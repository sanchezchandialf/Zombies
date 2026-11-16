// Bus de eventos del juego. Todos los sistemas se comunican por aquí para no acoplarse entre sí.
export class Eventos {
  constructor() { this._m = new Map(); }

  /** Suscribe `fn` al evento `nombre`. Devuelve una función para desuscribirse. */
  en(nombre, fn) {
    let l = this._m.get(nombre);
    if (!l) this._m.set(nombre, (l = []));
    l.push(fn);
    return () => { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  }

  /** Suscripción de un solo uso. */
  una(nombre, fn) {
    const off = this.en(nombre, (d) => { off(); fn(d); });
    return off;
  }

  /** Emite el evento. Un fallo en un oyente no rompe a los demás. */
  emitir(nombre, datos) {
    const l = this._m.get(nombre);
    if (!l) return;
    for (const fn of l.slice()) {
      try { fn(datos); } catch (e) { console.error(`[eventos] error en oyente de "${nombre}"`, e); }
    }
  }
}
