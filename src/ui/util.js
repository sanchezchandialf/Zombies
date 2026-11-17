// Utilidades de DOM de la interfaz. Todo lo que se toca cada cuadro pasa por estos «ponedores» con caché,
// de modo que el DOM solo se reescribe cuando el valor cambia de verdad.

/** Crea un elemento a partir de una cadena HTML (primer nodo raíz). */
export function html(cadena) {
  const t = document.createElement('template');
  t.innerHTML = cadena.trim();
  return t.content.firstElementChild;
}

/** Crea un elemento con clase y contenido HTML opcionales. */
export function el(etiqueta, clase, contenido) {
  const e = document.createElement(etiqueta);
  if (clase) e.className = clase;
  if (contenido != null) e.innerHTML = contenido;
  return e;
}

export const uno = (raiz, selector) => raiz.querySelector(selector);
export const todos = (raiz, selector) => Array.from(raiz.querySelectorAll(selector));

/** Texto con caché. */
export function texto(e, v) {
  if (!e) return;
  v = v == null ? '' : String(v);
  if (e.__t !== v) { e.__t = v; e.textContent = v; }
}

/** HTML con caché (solo para contenido propio, nunca texto ajeno sin escapar). */
export function contenido(e, v) {
  if (!e) return;
  if (e.__h !== v) { e.__h = v; e.innerHTML = v; }
}

/** Activa o desactiva una clase con caché. */
export function clase(e, nombre, activo) {
  if (!e) return;
  const c = e.__c || (e.__c = {});
  activo = !!activo;
  if (c[nombre] !== activo) { c[nombre] = activo; e.classList.toggle(nombre, activo); }
}

/** Atributo con caché (null lo quita). */
export function atributo(e, nombre, v) {
  if (!e) return;
  const a = e.__a || (e.__a = {});
  if (a[nombre] === v) return;
  a[nombre] = v;
  if (v == null || v === false) e.removeAttribute(nombre); else e.setAttribute(nombre, v);
}

/** Propiedad de estilo (o variable CSS) con caché. */
export function estilo(e, prop, v) {
  if (!e) return;
  const s = e.__s || (e.__s = {});
  if (s[prop] === v) return;
  s[prop] = v;
  if (prop.startsWith('--')) e.style.setProperty(prop, v); else e.style[prop] = v;
}

/** Muestra u oculta con el atributo `hidden` (con caché). */
export function visible(e, v) {
  if (!e) return;
  v = !!v;
  if (e.__v !== v) { e.__v = v; e.hidden = !v; }
}

/** Reinicia una animación CSS quitando y poniendo la clase. */
export function relanzar(e, nombre) {
  if (!e) return;
  e.classList.remove(nombre);
  // Forzar reflujo para que el navegador reinicie la animación.
  void e.offsetWidth;
  e.classList.add(nombre);
  if (e.__c) e.__c[nombre] = true;
}

export function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Número con separador de millares a la española (espacio fino a partir de cinco cifras). */
export function numero(n) {
  n = Math.round(Number(n) || 0);
  const neg = n < 0; let s = String(Math.abs(n));
  if (s.length > 4) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + s;
}

/** Decimal con coma. */
export function decimal(n, cifras = 1) {
  return (Number(n) || 0).toFixed(cifras).replace('.', ',');
}

/** mm:ss */
export function reloj(segundos) {
  segundos = Math.max(0, Math.floor(Number(segundos) || 0));
  const h = Math.floor(segundos / 3600), m = Math.floor((segundos % 3600) / 60), s = segundos % 60;
  const dos = (x) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
}

export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Almacenamiento local a prueba de fallos (modo privado, cuotas, etc.). */
const PREFIJO = 'eraz.';
export const guardado = {
  leer(clave, porDefecto) {
    try {
      const v = localStorage.getItem(PREFIJO + clave);
      return v == null ? porDefecto : JSON.parse(v);
    } catch { return porDefecto; }
  },
  escribir(clave, valor) {
    try { localStorage.setItem(PREFIJO + clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
  },
};

/** Reserva de nodos reutilizables: evita crear y destruir elementos en caliente. */
export function crearReserva(padre, fabrica, tamInicial = 0) {
  const libres = [], usados = [];
  for (let i = 0; i < tamInicial; i++) { const n = fabrica(); n.hidden = true; padre.appendChild(n); libres.push(n); }
  return {
    usados,
    tomar() {
      let n = libres.pop();
      if (!n) { n = fabrica(); padre.appendChild(n); }
      n.hidden = false; n.__v = true;
      usados.push(n);
      return n;
    },
    soltar(n) {
      const i = usados.indexOf(n);
      if (i < 0) return;
      usados.splice(i, 1);
      n.hidden = true; n.__v = false;
      libres.push(n);
    },
    soltarTodos() { while (usados.length) this.soltar(usados[usados.length - 1]); },
    get total() { return libres.length + usados.length; },
  };
}
