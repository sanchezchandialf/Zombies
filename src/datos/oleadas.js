// Datos y composición de las oleadas («días») de ERA Z. Dueño: Director (src/oleadas).
// Sin dependencias de Three.js ni del DOM: se puede ejecutar en Node (pruebas/director.test.mjs).
//
// Una oleada se compone así (`componerOleada`):
//   1. Presupuesto de amenaza = presupuestoDeDia(día) × dificultad × nº de jugadores × temática (×0,5 en días de jefe).
//   2. Se gasta el presupuesto en «unidades»: zombis sueltos (elegidos por `peso` de ZOMBIS × multiplicador de la temática
//      × counter de los roles presentes) o «grupos mixtos» (escuadras que explotan los counters: vanguardia blindada con
//      escupidores detrás, jauría con aullador, estampida con Mole…). Los élites aparecen desde el día 12.
//   3. Las unidades se reparten en PULSOS (oleadas de aparición) separados por pausas y RESPIROS.
// La temática de cada día (nombre y subtítulo) está en TEMAS; la lista es fija (diseñada), no aleatoria.
import { ZOMBIS, JEFES } from './zombis.js';
import { ERAS, esDiaDeJefe, eraDeDia, DIA_FINAL } from './eras.js';

export const TOPE_VIVOS = 150;   // zombis vivos simultáneos máximos (el director lo reduce si el equipo va lento)
export const TOPE_TOTAL = 320;   // zombis máximos por oleada (sin contar invocados por jefes)
export const DIA_PRIMER_ELITE = 12;
export const COSTE_ELITE = 2.4;

/** Coste de amenaza de cada clase (un caminante = 1). */
export const AMENAZA = {
  caminante: 1, corredor: 1.2, acorazado: 3.2, escupidor: 2.6, apestado: 3, detonador: 2.2, aullador: 3.6, mole: 12,
};
export const amenazaDe = (clase) => AMENAZA[clase] ?? Math.max(1, (ZOMBIS[clase]?.vida ?? 60) / 60);

/** Dificultades. `cantidad`: presupuesto; `vida`/`danio`: escalado de zombis; `elite`: probabilidad de élites; `ritmo`: duración de las pausas entre pulsos;
 *  `puntos`: multiplicador de puntuación; `cura`/`municion`: fracción repuesta en el intermedio (×). */
export const DIFICULTADES = {
  facil:     { id: 'facil',     nombre: 'Recluta',    cantidad: 0.7,  vida: 0.8,  danio: 0.8,  elite: 0.5, ritmo: 1.25, puntos: 0.8,  cura: 1.4,  municion: 1.3 },
  normal:    { id: 'normal',    nombre: 'Veterano',   cantidad: 1,    vida: 1,    danio: 1,    elite: 1,   ritmo: 1,    puntos: 1,    cura: 1,    municion: 1 },
  dificil:   { id: 'dificil',   nombre: 'Pesadilla',  cantidad: 1.3,  vida: 1.2,  danio: 1.2,  elite: 1.5, ritmo: 0.85, puntos: 1.25, cura: 0.75, municion: 0.85 },
  pesadilla: { id: 'pesadilla', nombre: 'Apocalipsis', cantidad: 1.6, vida: 1.45, danio: 1.4,  elite: 2.2, ritmo: 0.7,  puntos: 1.6,  cura: 0.5,  municion: 0.7 },
};
export const dificultadDe = (id) => DIFICULTADES[id] || DIFICULTADES.normal;

/** Presupuesto de amenaza base de un día (jugador solo, dificultad normal). */
export function presupuestoDeDia(dia) {
  const d = Math.max(1, dia);
  const rampa = Math.min(1, 0.72 + 0.09 * d); // los dos primeros días, más suaves
  return (11 + 6.4 * d + 0.36 * d * d) * rampa;
}
/** Escalado de vida de los zombis con el día (+1,3 %/día) y la dificultad; el equipo grande los hace algo más duros. */
export function escalaVida(dia, dificultad = 'normal', jugadores = 1) {
  return (1 + 0.013 * (Math.max(1, dia) - 1)) * dificultadDe(dificultad).vida * (1 + 0.1 * (Math.max(1, jugadores) - 1));
}
export function escalaDanio(dia, dificultad = 'normal') {
  return (1 + 0.008 * (Math.max(1, dia) - 1)) * dificultadDe(dificultad).danio;
}

// ---------------------------------------------------------------------------------------------------------------------
// TEMÁTICAS: una por día (índice = día − 1). `mult`: multiplicador de peso por clase; `pres`: factor de presupuesto;
// `grupos`: probabilidad de sacar una escuadra mixta en lugar de un zombi suelto; `elite`: factor de élites.
// ---------------------------------------------------------------------------------------------------------------------
const T = (nombre, subtitulo, mult = {}, extra = {}) => ({ nombre, subtitulo, mult, ...extra });
export const TEMAS = [
  /*  1 */ T('Primera noche', 'Llaman a las puertas. Solo son caminantes… por ahora.', {}, { grupos: 0 }),
  /*  2 */ T('Noche de corredores', 'Pasos rápidos entre la niebla: no dejes que te alcancen.', { corredor: 5 }, { grupos: 0 }),
  /*  3 */ T('Primeros acorazados', 'El hierro viejo también se levanta.', { acorazado: 4, corredor: 0.6 }, { grupos: 0.2 }),
  /*  4 */ T('Lluvia de ácido', 'Algo escupe desde las sombras.', { escupidor: 5 }, { grupos: 0.25 }),
  /*  5 */ T('La carga del Coracero', JEFES.coracero.titulo, { acorazado: 1.6, corredor: 1.3 }, { pres: 1 }),
  /*  6 */ T('Noche de podredumbre', 'El aire se vuelve irrespirable.', { apestado: 6 }, { grupos: 0.3 }),
  /*  7 */ T('Mecha corta', 'Todo lo que corre, explota.', { detonador: 6, corredor: 1.6 }, { grupos: 0.3 }),
  /*  8 */ T('Temblor', 'El suelo tiembla bajo sus pasos.', { mole: 6 }, { grupos: 0.3 }),
  /*  9 */ T('Coro de aullidos', 'Cuando uno grita, todos corren.', { aullador: 6, corredor: 1.6 }, { grupos: 0.35 }),
  /* 10 */ T('El Fogonero ruge', JEFES.fogonero.titulo, { apestado: 1.5, detonador: 1.5 }, { pres: 1 }),
  /* 11 */ T('Asedio de acorazados', 'Una muralla de coraza avanza sin prisa.', { acorazado: 6, escupidor: 2 }, { pres: 1.1, grupos: 0.4 }),
  /* 12 */ T('Sangre vieja', 'Los primeros élites han despertado.', {}, { elite: 2.2, grupos: 0.35 }),
  /* 13 */ T('Tormenta de corredores', 'Una estampida que no se detiene.', { corredor: 7, aullador: 3 }, { pres: 1.15, grupos: 0.3 }),
  /* 14 */ T('Nube tóxica', 'Apestados y ácido: no respires.', { apestado: 5, escupidor: 4 }, { grupos: 0.45 }),
  /* 15 */ T('Orden del Mariscal', JEFES.mariscal.titulo, { acorazado: 1.6, escupidor: 1.6 }, { pres: 1 }),
  /* 16 */ T('Estampida', 'Los colosos abren paso a la horda.', { mole: 5, corredor: 2 }, { grupos: 0.45 }),
  /* 17 */ T('Fuegos artificiales', 'Cada zombi es una bomba con patas.', { detonador: 7, apestado: 2.5 }, { grupos: 0.4 }),
  /* 18 */ T('Cacería de élites', 'Los mejores de cada siglo vuelven a por ti.', {}, { elite: 3, grupos: 0.4 }),
  /* 19 */ T('Muro de acero', 'Nada de lo que dispares los detendrá de frente.', { acorazado: 5, mole: 2.5 }, { pres: 1.1, grupos: 0.5 }),
  /* 20 */ T('Rugido de V8', JEFES.rey_asfalto.titulo, { corredor: 2, detonador: 1.6 }, { pres: 1 }),
  /* 21 */ T('Marea infinita', 'Ya no cabe un alfiler entre ellos.', { caminante: 3 }, { pres: 1.25, grupos: 0.15 }),
  /* 22 */ T('Niebla de ácido', 'Todo lo que toca se derrite.', { escupidor: 5, apestado: 4 }, { grupos: 0.5 }),
  /* 23 */ T('Frenesí', 'Aullidos sin fin: la horda no frena.', { aullador: 6, corredor: 4 }, { pres: 1.2, grupos: 0.45 }),
  /* 24 */ T('Titanes', 'Se oyen pasos que no son de este mundo.', { mole: 6, acorazado: 2 }, { grupos: 0.5 }),
  /* 25 */ T('El origen del brote', JEFES.paciente_cero.titulo, { apestado: 2, aullador: 1.6 }, { pres: 1 }),
  /* 26 */ T('Noche de los mil muertos', 'Todos los caídos a la vez.', { caminante: 3, corredor: 2 }, { pres: 1.3, grupos: 0.2 }),
  /* 27 */ T('Blindaje total', 'Exoesqueletos y músculo: poco acero basta.', { acorazado: 6, mole: 3, escupidor: 2 }, { pres: 1.1, grupos: 0.55 }),
  /* 28 */ T('Tormenta de fuego', 'La noche arde: pólvora, gas y plasma.', { detonador: 6, apestado: 3, corredor: 2 }, { grupos: 0.5 }),
  /* 29 */ T('Pesadilla élite', 'Cada sombra es un élite.', {}, { elite: 3, pres: 1.1, grupos: 0.5 }),
  /* 30 */ T('La última noche', 'Faltan horas para 2100. Todo lo que queda viene a por ti.', { acorazado: 1.5, escupidor: 1.5, apestado: 1.5, mole: 1.6, aullador: 1.5, detonador: 1.5 }, { pres: 1.2, grupos: 0.55, elite: 1.6 }),
  /* 31 */ T('OMEGA', JEFES.omega.titulo, { acorazado: 1.5, mole: 1.5, aullador: 1.5 }, { pres: 1 }),
];

/** Temática de un día, con valores por defecto completos. */
export function tematicaDeDia(dia) {
  const i = Math.min(TEMAS.length, Math.max(1, dia)) - 1;
  const t = TEMAS[i];
  const jefe = esDiaDeJefe(dia) ? ERAS[eraDeDia(dia)].jefe : null;
  return {
    dia, id: 'dia' + (i + 1), nombre: t.nombre, subtitulo: t.subtitulo, mult: t.mult,
    pres: t.pres ?? 1, grupos: t.grupos ?? Math.min(0.5, 0.1 + 0.025 * dia), elite: t.elite ?? 1, jefe,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// GRUPOS MIXTOS: escuadras pensadas para explotar los counters. Aparecen juntas, desde el mismo punto.
// ---------------------------------------------------------------------------------------------------------------------
export const GRUPOS = [
  { id: 'vanguardia', nombre: 'Vanguardia blindada', desde: 3, peso: 3, miembros: [['acorazado', 2], ['caminante', 4]] },
  { id: 'acido_y_hierro', nombre: 'Ácido tras el escudo', desde: 4, peso: 3, miembros: [['acorazado', 2], ['escupidor', 2]] },
  { id: 'francotiradores', nombre: 'Tiradores de ácido', desde: 4, peso: 2, miembros: [['escupidor', 3], ['caminante', 4]] },
  { id: 'jaula', nombre: 'Nube y ácido', desde: 6, peso: 2, miembros: [['apestado', 3], ['escupidor', 2]] },
  { id: 'bomba_nube', nombre: 'Gas y chispas', desde: 7, peso: 2.5, miembros: [['apestado', 2], ['detonador', 2], ['caminante', 3]] },
  { id: 'asalto', nombre: 'Asalto suicida', desde: 7, peso: 2, miembros: [['detonador', 3], ['corredor', 3]] },
  { id: 'estampida', nombre: 'Estampida', desde: 8, peso: 2.5, miembros: [['mole', 1], ['corredor', 4]] },
  { id: 'comitiva', nombre: 'Comitiva del aullador', desde: 9, peso: 2.5, miembros: [['aullador', 1], ['caminante', 6]] },
  { id: 'jauria', nombre: 'Jauría', desde: 9, peso: 2.5, miembros: [['aullador', 1], ['corredor', 5]] },
  { id: 'ariete', nombre: 'Ariete', desde: 12, peso: 2, miembros: [['mole', 2], ['acorazado', 2]] },
];
export const costeGrupo = (g) => g.miembros.reduce((s, [c, n]) => s + amenazaDe(c) * n, 0);
export const tamGrupo = (g) => g.miembros.reduce((s, [, n]) => s + n, 0);

// ---------------------------------------------------------------------------------------------------------------------
// COMPOSICIÓN
// ---------------------------------------------------------------------------------------------------------------------
/** Multiplicador de peso de una clase según los roles presentes: sube si es counter de alguno, baja un poco si es débil ante alguno. */
export function pesoContra(claseId, roles = []) {
  if (!roles.length) return 1;
  const def = ZOMBIS[claseId];
  let s = 0;
  for (const r of roles) {
    if (def.counterDe?.includes(r)) s += 0.35;
    if (def.debilAnte?.includes(r)) s -= 0.12;
  }
  return Math.max(0.6, 1 + s / roles.length * (roles.length > 1 ? 1.4 : 1));
}

/** Nº de élites esperado: probabilidad de que una unidad suelta sea élite en ese día. */
export function probElite(dia, dificultad = 'normal', temaElite = 1) {
  if (dia < DIA_PRIMER_ELITE) return 0;
  return Math.min(0.5, (0.04 + 0.05 * (dia - DIA_PRIMER_ELITE + 1)) * dificultadDe(dificultad).elite * temaElite);
}

/**
 * Compone una oleada. Devuelve el plan completo (puro y determinista dado `rng`).
 * @param {{dia:number, jugadores?:number, roles?:string[], dificultad?:string, rng:Function}} o
 * @returns {{dia, tema, jefe, presupuesto, total, conteos, elites, grupos, pulsos, pausaBase, composicion}}
 */
export function componerOleada({ dia, jugadores = 1, roles = [], dificultad = 'normal', rng }) {
  const tema = tematicaDeDia(dia);
  const dif = dificultadDe(dificultad);
  const jefeId = tema.jefe;
  const nJug = Math.max(1, jugadores);
  const escalaJug = 1 + 0.7 * (nJug - 1);
  let presupuesto = presupuestoDeDia(dia) * dif.cantidad * escalaJug * tema.pres * (jefeId ? 0.5 : 1);
  if (dia === DIA_FINAL) presupuesto *= 0.9;

  const disponibles = Object.values(ZOMBIS).filter((z) => dia >= z.desdeDia);
  const pesoClase = (z) => z.peso * (tema.mult[z.id] ?? 1) * pesoContra(z.id, roles);
  const pesosClases = disponibles.map((z) => [z.id, pesoClase(z)]);
  const grupos = GRUPOS.filter((g) => dia >= g.desde && g.miembros.every(([c]) => dia >= ZOMBIS[c].desdeDia));
  const pesosGrupos = grupos.map((g) => {
    const m = g.miembros.reduce((s, [c, n]) => s + (tema.mult[c] ?? 1) * pesoContra(c, roles) * n, 0) / tamGrupo(g);
    return [g, g.peso * Math.max(0.15, m)];
  });
  const pElite = probElite(dia, dificultad, tema.elite);

  const unidades = []; // cada unidad = { items:[{clase, elite}], coste, grupo }
  let restante = presupuesto;
  let total = 0;
  const minCoste = 1;
  let seguridad = 0;
  while (restante >= minCoste && total < TOPE_TOTAL && seguridad++ < 2000) {
    if (grupos.length && rng.prob(tema.grupos)) {
      const g = rng.ponderado(pesosGrupos);
      const c = costeGrupo(g);
      if (c <= restante * 1.15) {
        const items = [];
        for (const [clase, n] of g.miembros) for (let k = 0; k < n; k++) items.push({ clase, elite: false });
        unidades.push({ items, coste: c, grupo: g.id });
        restante -= c; total += items.length;
        continue;
      }
    }
    const id = rng.ponderado(pesosClases);
    const elite = pElite > 0 && rng.prob(pElite);
    let c = amenazaDe(id) * (elite ? COSTE_ELITE : 1);
    if (c > restante + 1.2) { // no cabe: prueba con algo barato
      const baratos = pesosClases.filter(([k]) => amenazaDe(k) <= restante + 1.2);
      if (!baratos.length) break;
      const barato = rng.ponderado(baratos);
      unidades.push({ items: [{ clase: barato, elite: false }], coste: amenazaDe(barato), grupo: null });
      restante -= amenazaDe(barato); total++;
      continue;
    }
    unidades.push({ items: [{ clase: id, elite }], coste: c, grupo: null });
    restante -= c; total++;
  }
  // Mínimos: que ningún día sea ridículo.
  const minimo = Math.round((dia <= 2 ? 8 : 10) * dif.cantidad * escalaJug);
  while (total < minimo && !jefeId) { unidades.push({ items: [{ clase: 'caminante', elite: false }], coste: 1, grupo: null }); total++; }

  // Orden: lo ligero tiende a salir antes, con ruido para mezclar.
  unidades.forEach((u) => { u.clave = u.coste * (0.3 + 1.4 * rng()); });
  unidades.sort((a, b) => a.clave - b.clave);

  // Pulsos
  const tamBase = Math.min(34, Math.max(7, Math.round((6 + 0.5 * dia) * Math.sqrt(dif.cantidad * escalaJug))));
  const pausaBase = Math.min(13, Math.max(6.5, 13 - 0.18 * dia)) * dif.ritmo;
  const pulsos = [];
  let actual = null;
  for (const u of unidades) {
    if (!actual) { actual = { unidades: [], tam: 0 }; pulsos.push(actual); }
    actual.unidades.push(u.items); actual.tam += u.items.length;
    if (actual.tam >= tamBase) actual = null;
  }
  if (pulsos.length > 1 && pulsos[pulsos.length - 1].tam < tamBase * 0.4) { // un último pulso minúsculo se une al anterior
    const ult = pulsos.pop();
    pulsos[pulsos.length - 1].unidades.push(...ult.unidades); pulsos[pulsos.length - 1].tam += ult.tam;
  }
  pulsos.forEach((p, i) => {
    const respiro = i > 0 && i % 3 === 0;
    p.respiro = respiro;
    p.pausa = i === 0 ? 1.5 : respiro ? pausaBase * 1.7 : pausaBase * (0.85 + 0.3 * rng());
  });

  const conteos = {};
  let elites = 0, nGrupos = 0;
  for (const u of unidades) {
    if (u.grupo) nGrupos++;
    for (const it of u.items) { conteos[it.clase] = (conteos[it.clase] || 0) + 1; if (it.elite) elites++; }
  }
  const nSueltos = total;
  const plan = {
    dia, tema, jefe: jefeId, presupuesto, total: nSueltos + (jefeId ? 1 : 0), esbirros: nSueltos, conteos, elites, grupos: nGrupos, pulsos, pausaBase,
    tamPulso: tamBase,
  };
  plan.composicion = textoComposicion(plan);
  return plan;
}

const PLURAL = { caminante: 'caminantes', corredor: 'corredores', acorazado: 'acorazados', escupidor: 'escupidores', apestado: 'apestados', mole: 'moles', aullador: 'aulladores', detonador: 'detonadores' };
const SINGULAR = { caminante: 'caminante', corredor: 'corredor', acorazado: 'acorazado', escupidor: 'escupidor', apestado: 'apestado', mole: 'mole', aullador: 'aullador', detonador: 'detonador' };
/** «28 caminantes, 12 corredores, 4 acorazados · 3 élites · jefe: El Coracero» */
export function textoComposicion(plan) {
  const orden = Object.keys(ZOMBIS);
  const partes = orden.filter((c) => plan.conteos[c]).map((c) => `${plan.conteos[c]} ${plan.conteos[c] === 1 ? SINGULAR[c] || c : PLURAL[c] || c}`);
  let t = partes.join(', ');
  if (plan.elites) t += ` · ${plan.elites} élite${plan.elites > 1 ? 's' : ''}`;
  if (plan.jefe) t = `${JEFES[plan.jefe].nombre} + ${t}`;
  return t;
}
