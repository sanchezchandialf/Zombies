// Mejoras del intermedio de ERA Z (1 de 3 por jugador tras cada oleada). Dueño: Director (src/oleadas).
//
// Cada mejora: { id, nombre, descripcion, rareza: 'comun'|'rara'|'epica'|'legendaria', roles?: [rolId], icono, max, aplicar(jugador) }
//   · `roles` ausente = general; con `roles` solo se ofrece a esos roles (una específica de rol siempre intenta salir entre las 3).
//   · `max` = veces que se puede acumular. `aplicar(jugador)` modifica `jugador.mods` (o vida, arrojadizas…).
//   · Las que tienen contrapartida la dicen en la descripción («a cambio de…»).
//
// CLAVES de `jugador.mods` que escriben las mejoras (1 = neutro; «×» = se multiplica, «+» = se suma).
//   Ya existen en roles.js:  danio× cadencia× recarga× (menor = más rápida) dispersion× (menor = más precisa) explosivos× cuerpo×
//                            critico+ danioCritico+ reserva× regeneracion+ (vida/s) municionInfinita (bool) empujeRecibido× vehiculos×
//   NUEVAS (las debe honrar quien las use: Jugadores/Combate/Mundo; si no las lee, la mejora solo tiene su parte «visible»):
//     velocidad×          multiplicador de la velocidad de movimiento
//     resistencia×        multiplicador del daño recibido (0,9 = −10 %)      resistenciaVeneno× / resistenciaAcido×
//     robovida+           fracción del daño infligido que se recupera como vida (0,02 = 2 %)
//     iman×               multiplicador del radio de recogida de botín        suerte+  probabilidad extra de botín (0,2 = +20 %)
//     cargador×           multiplicador del tamaño de cargador                perforacion+  objetivos extra que atraviesa cada bala
//     empuje×             multiplicador del empuje de los disparos            alcance×  alcance de las armas
//     radioExplosion×     multiplicador del radio de las explosiones          esquivaEnfriamiento×  recarga de la esquiva
//     habilidadEnfriamiento× / habilidadDuracion× / habilidadPotencia×   sobre la habilidad del rol
//     reanimacion×        velocidad al reanimar aliados                        curacion×  potencia de las curas a terceros
//     reparacion×         velocidad/potencia al reparar                        segundaOportunidad+  veces que evita caer/morir (una por oleada)
//   Específicas de rol:  dosisDoble (Médica) · torretas (Ingeniero: nº de torretas a la vez) · torretaVida× torretaDanio× barricadaVida× ·
//                        balaFantasma (Cazadora: cada N disparos la bala lo atraviesa todo) · replicas (Demoledor: réplicas de cada explosión) ·
//                        cinta (Soldado: cinta de munición, sin recarga hasta vaciar el cargador ampliado) · disciplinaMax+ (tope de la pasiva)
//
// ICONOS (ids para la interfaz; la UI debe tener un icono por defecto si falta alguno):
//   vida, velocidad, danio, cadencia, recarga, critico, municion, granada, robo_vida, iman, escudo, regeneracion, veneno,
//   explosion, perforante, esquiva, habilidad, reanimar, botin, empuje, cuerpo, dosis, torreta, fantasma, replicas, cinta,
//   reloj, titan, infinito, disciplina, supresion, sismo, sombra, pacto, cristal, vampiro, alcance, reparar, barricada, suerte.
export const RAREZAS = {
  comun: { id: 'comun', nombre: 'Común', peso: 60, color: '#b8c0cc' },
  rara: { id: 'rara', nombre: 'Rara', peso: 28, color: '#4fa3ff' },
  epica: { id: 'epica', nombre: 'Épica', peso: 9, color: '#b46bff' },
  legendaria: { id: 'legendaria', nombre: 'Legendaria', peso: 3, color: '#ffb02e' },
};

// --- ayudas de aplicación -------------------------------------------------------------------------------------------
const mods = (j) => (j.mods ??= {});
const mul = (j, k, f) => { const m = mods(j); m[k] = (m[k] ?? 1) * f; };
const sum = (j, k, v) => { const m = mods(j); m[k] = (m[k] ?? 0) + v; };
const poner = (j, k, v) => { mods(j)[k] = v; };
/** Suma vida máxima (y la misma cantidad de vida actual). */
const masVida = (j, d) => {
  j.vidaMax = Math.max(1, Math.round((j.vidaMax ?? 100) + d));
  j.vida = Math.min(j.vidaMax, Math.max(1, Math.round((j.vida ?? j.vidaMax) + Math.max(0, d))));
};
/** Escala la vida máxima manteniendo la proporción de vida actual. */
const vidaPor = (j, f) => {
  const frac = (j.vida ?? j.vidaMax) / (j.vidaMax || 1);
  j.vidaMax = Math.max(1, Math.round((j.vidaMax ?? 100) * f));
  j.vida = Math.max(1, Math.min(j.vidaMax, Math.round(j.vidaMax * frac)));
};
const masGranadas = (j, n) => { j.arrojadizasMax = (j.arrojadizasMax ?? 0) + n; j.darArrojadizas?.(n); };

const M = (id, nombre, descripcion, rareza, icono, max, aplicar, roles) => ({ id, nombre, descripcion, rareza, icono, max, aplicar, ...(roles ? { roles } : {}) });

export const MEJORAS = [
  // ===== GENERALES · comunes ======================================================================================
  M('coraza', 'Coraza reforzada', '+15 de vida máxima.', 'comun', 'vida', 5, (j) => masVida(j, 15)),
  M('botas_ligeras', 'Botas ligeras', '+6 % de velocidad de movimiento.', 'comun', 'velocidad', 4, (j) => mul(j, 'velocidad', 1.06)),
  M('pulso_firme', 'Pulso firme', 'Dispersión −10 %: los disparos van más juntos.', 'comun', 'alcance', 4, (j) => mul(j, 'dispersion', 0.9)),
  M('municion_mejorada', 'Munición mejorada', '+8 % de daño con todas las armas.', 'comun', 'danio', 5, (j) => mul(j, 'danio', 1.08)),
  M('gatillo_ligero', 'Gatillo ligero', '+6 % de cadencia de disparo.', 'comun', 'cadencia', 5, (j) => mul(j, 'cadencia', 1.06)),
  M('manos_agiles', 'Manos ágiles', 'Recarga un 8 % más rápida.', 'comun', 'recarga', 4, (j) => mul(j, 'recarga', 0.92)),
  M('bandolera', 'Bandolera', 'Reserva de munición +20 % y repone un 30 % ahora.', 'comun', 'municion', 4, (j) => { mul(j, 'reserva', 1.2); j.darMunicion?.(0.3); }),
  M('cinturon_granadas', 'Cinturón de granadas', '+1 arrojadiza máxima y una de regalo.', 'comun', 'granada', 4, (j) => masGranadas(j, 1)),
  M('iman_botin', 'Imán de botín', 'Recoges el botín desde un 40 % más lejos.', 'comun', 'iman', 3, (j) => mul(j, 'iman', 1.4)),
  M('cicatrizacion', 'Cicatrización', 'Regeneras +0,5 de vida por segundo.', 'comun', 'regeneracion', 4, (j) => sum(j, 'regeneracion', 0.5)),
  M('piel_curtida', 'Piel curtida', 'Recibes un 5 % menos de daño.', 'comun', 'escudo', 4, (j) => mul(j, 'resistencia', 0.95)),
  M('ojo_de_lince', 'Ojo de lince', '+4 % de probabilidad de crítico.', 'comun', 'critico', 5, (j) => sum(j, 'critico', 0.04)),
  M('nudillos_hierro', 'Nudillos de hierro', 'Daño cuerpo a cuerpo +20 %.', 'comun', 'cuerpo', 4, (j) => mul(j, 'cuerpo', 1.2)),
  M('polvora_extra', 'Pólvora extra', 'Explosivos y arrojadizas +12 % de daño.', 'comun', 'explosion', 4, (j) => mul(j, 'explosivos', 1.12)),
  M('saqueador', 'Saqueador', '+15 % de probabilidad de botín al abatir zombis.', 'comun', 'suerte', 3, (j) => sum(j, 'suerte', 0.15)),

  // ===== GENERALES · raras =======================================================================================
  M('sed_de_sangre', 'Sed de sangre', 'Recuperas un 2 % del daño que infliges como vida.', 'rara', 'robo_vida', 3, (j) => sum(j, 'robovida', 0.02)),
  M('vigor', 'Vigor', '+30 de vida máxima.', 'rara', 'vida', 3, (j) => masVida(j, 30)),
  M('adrenalina', 'Adrenalina', '+10 % de velocidad y +5 % de cadencia.', 'rara', 'velocidad', 2, (j) => { mul(j, 'velocidad', 1.1); mul(j, 'cadencia', 1.05); }),
  M('cargador_ampliado', 'Cargador ampliado', 'Cargador +25 %. Se rellena al instante.', 'rara', 'municion', 3, (j) => { mul(j, 'cargador', 1.25); j.darMunicion?.(0.25); }),
  M('punta_de_acero', 'Punta de acero', 'Las balas atraviesan un objetivo más.', 'rara', 'perforante', 2, (j) => sum(j, 'perforacion', 1)),
  M('golpe_certero', 'Golpe certero', 'Los críticos hacen +40 % de daño.', 'rara', 'critico', 3, (j) => sum(j, 'danioCritico', 0.4)),
  M('reflejos', 'Reflejos', 'La esquiva se recarga un 20 % antes.', 'rara', 'esquiva', 3, (j) => mul(j, 'esquivaEnfriamiento', 0.8)),
  M('estomago_de_hierro', 'Estómago de hierro', 'Veneno y ácido te hacen un 30 % menos de daño.', 'rara', 'veneno', 2, (j) => { mul(j, 'resistenciaVeneno', 0.7); mul(j, 'resistenciaAcido', 0.7); }),
  M('maestria', 'Maestría', 'Tu habilidad se recarga un 12 % más rápido.', 'rara', 'habilidad', 4, (j) => mul(j, 'habilidadEnfriamiento', 0.88)),
  M('retroceso_brutal', 'Retroceso brutal', 'Tus disparos empujan un 25 % más.', 'rara', 'empuje', 3, (j) => mul(j, 'empuje', 1.25)),
  M('manos_de_cirujano', 'Manos de cirujano', 'Reanimas a los aliados un 60 % más rápido.', 'rara', 'reanimar', 2, (j) => mul(j, 'reanimacion', 1.6)),

  // ===== GENERALES · épicas ======================================================================================
  M('pacto_de_sangre', 'Pacto de sangre', '+20 % de daño, a cambio de −15 % de vida máxima.', 'epica', 'pacto', 2, (j) => { mul(j, 'danio', 1.2); vidaPor(j, 0.85); }),
  M('canon_de_cristal', 'Cañón de cristal', '+40 % de daño, a cambio de recibir un 25 % más de daño.', 'epica', 'cristal', 1, (j) => { mul(j, 'danio', 1.4); mul(j, 'resistencia', 1.25); }),
  M('tormenta_de_plomo', 'Tormenta de plomo', '+25 % de cadencia, a cambio de un 20 % más de dispersión.', 'epica', 'cadencia', 2, (j) => { mul(j, 'cadencia', 1.25); mul(j, 'dispersion', 1.2); }),
  M('armadura_pesada', 'Armadura pesada', 'Recibes un 20 % menos de daño, a cambio de −8 % de velocidad.', 'epica', 'escudo', 2, (j) => { mul(j, 'resistencia', 0.8); mul(j, 'velocidad', 0.92); }),
  M('vampiro', 'Vampiro', 'Recuperas un 5 % del daño infligido como vida.', 'epica', 'vampiro', 2, (j) => sum(j, 'robovida', 0.05)),
  M('bolsillos_sin_fondo', 'Bolsillos sin fondo', 'Reserva ×1,5, cargador +20 % y +2 arrojadizas máximas.', 'epica', 'municion', 1, (j) => { mul(j, 'reserva', 1.5); mul(j, 'cargador', 1.2); masGranadas(j, 2); j.darMunicion?.(0.5); }),
  M('ejecutor', 'Ejecutor', '+10 % de crítico y +60 % de daño crítico, a cambio de −15 % de cadencia.', 'epica', 'critico', 2, (j) => { sum(j, 'critico', 0.1); sum(j, 'danioCritico', 0.6); mul(j, 'cadencia', 0.85); }),
  M('maestro_artificiero', 'Maestro artificiero', 'Explosivos +35 % de daño y +20 % de radio.', 'epica', 'explosion', 2, (j) => { mul(j, 'explosivos', 1.35); mul(j, 'radioExplosion', 1.2); }),
  M('segundo_aliento', 'Segundo aliento', 'Una vez por oleada, un golpe mortal te deja con 1 de vida en lugar de caer.', 'epica', 'escudo', 1, (j) => sum(j, 'segundaOportunidad', 1)),

  // ===== GENERALES · legendarias ================================================================================
  M('voluntad_de_hierro', 'Voluntad de hierro', '+50 % de vida máxima, −15 % de daño recibido y +1 de regeneración.', 'legendaria', 'titan', 1, (j) => { vidaPor(j, 1.5); mul(j, 'resistencia', 0.85); sum(j, 'regeneracion', 1); }),
  M('cargador_bendito', 'Cargador bendito', 'Munición infinita, a cambio de −15 % de daño.', 'legendaria', 'infinito', 1, (j) => { poner(j, 'municionInfinita', true); mul(j, 'danio', 0.85); }),
  M('titan', 'Titán', '+60 de vida máxima y +15 % de daño, a cambio de −8 % de velocidad.', 'legendaria', 'titan', 1, (j) => { masVida(j, 60); mul(j, 'danio', 1.15); mul(j, 'velocidad', 0.92); }),
  M('reloj_roto', 'Reloj roto', 'La habilidad se recarga un 40 % más rápido y dura un 30 % más.', 'legendaria', 'reloj', 1, (j) => { mul(j, 'habilidadEnfriamiento', 0.6); mul(j, 'habilidadDuracion', 1.3); }),
  M('fuego_a_discrecion', 'Fuego a discreción', '+35 % de cadencia y +15 % de daño, a cambio de +30 % de dispersión.', 'legendaria', 'cadencia', 1, (j) => { mul(j, 'cadencia', 1.35); mul(j, 'danio', 1.15); mul(j, 'dispersion', 1.3); }),

  // ===== SOLDADO ================================================================================================
  M('cinta_de_municion', 'Cinta de munición', 'Cargador ×1,5, a cambio de recarga +20 % más lenta y +10 % de dispersión.', 'epica', 'cinta', 1,
    (j) => { mul(j, 'cargador', 1.5); mul(j, 'recarga', 1.2); mul(j, 'dispersion', 1.1); poner(j, 'cinta', true); j.darMunicion?.(0.25); }, ['soldado']),
  M('disciplina_de_acero', 'Disciplina de acero', 'Tu pasiva llega a +45 % de cadencia (en vez de +30 %).', 'rara', 'disciplina', 2, (j) => sum(j, 'disciplinaMax', 0.075), ['soldado']),
  M('fuego_de_saturacion', 'Fuego de saturación', 'Fuego de supresión dura +30 %, a cambio de +15 % de enfriamiento.', 'rara', 'supresion', 2, (j) => { mul(j, 'habilidadDuracion', 1.3); mul(j, 'habilidadEnfriamiento', 1.15); }, ['soldado']),
  M('granadero', 'Granadero', '+2 arrojadizas máximas y +10 % de daño explosivo.', 'comun', 'granada', 2, (j) => { masGranadas(j, 2); mul(j, 'explosivos', 1.1); }, ['soldado']),

  // ===== MÉDICA =================================================================================================
  M('dosis_doble', 'Dosis doble', 'El suero cura y quema ×1,8, a cambio de +35 % de enfriamiento.', 'epica', 'dosis', 1,
    (j) => { mul(j, 'habilidadPotencia', 1.8); mul(j, 'habilidadEnfriamiento', 1.35); poner(j, 'dosisDoble', true); }, ['medico']),
  M('sangre_universal', 'Sangre universal', 'Regeneras +1,5 de vida por segundo y reanimas un 40 % más rápido.', 'rara', 'regeneracion', 2, (j) => { sum(j, 'regeneracion', 1.5); mul(j, 'reanimacion', 1.4); }, ['medico']),
  M('triaje', 'Triaje', 'Tus curas a aliados son un 25 % más potentes.', 'comun', 'curacion', 3, (j) => mul(j, 'curacion', 1.25), ['medico']),
  M('bisturi_afilado', 'Bisturí afilado', 'Cuerpo a cuerpo +50 % y +6 % de crítico.', 'comun', 'cuerpo', 2, (j) => { mul(j, 'cuerpo', 1.5); sum(j, 'critico', 0.06); }, ['medico']),

  // ===== INGENIERO ==============================================================================================
  M('segunda_torreta', 'Segunda torreta', 'Puedes tener 2 torretas a la vez, a cambio de +30 % de enfriamiento.', 'epica', 'torreta', 1,
    (j) => { poner(j, 'torretas', 2); mul(j, 'habilidadEnfriamiento', 1.3); }, ['ingeniero']),
  M('soldador_experto', 'Soldador experto', 'Reparas un 50 % más rápido.', 'comun', 'reparar', 3, (j) => mul(j, 'reparacion', 1.5), ['ingeniero']),
  M('torreta_blindada', 'Torreta blindada', 'Torretas con +50 % de vida y +15 % de daño.', 'rara', 'torreta', 2, (j) => { mul(j, 'torretaVida', 1.5); mul(j, 'torretaDanio', 1.15); }, ['ingeniero']),
  M('barricada_reforzada', 'Barricada reforzada', 'Las barricadas aguantan un 60 % más.', 'rara', 'barricada', 2, (j) => mul(j, 'barricadaVida', 1.6), ['ingeniero']),

  // ===== CAZADORA ===============================================================================================
  M('bala_fantasma', 'Bala fantasma', 'Cada 4.º disparo lo atraviesa todo, a cambio de −10 % de cadencia.', 'epica', 'fantasma', 1,
    (j) => { poner(j, 'balaFantasma', 4); mul(j, 'cadencia', 0.9); }, ['cazador']),
  M('ojo_de_aguila', 'Ojo de águila', 'Alcance +20 %, dispersión −20 % y +5 % de crítico.', 'rara', 'alcance', 2, (j) => { mul(j, 'alcance', 1.2); mul(j, 'dispersion', 0.8); sum(j, 'critico', 0.05); }, ['cazador']),
  M('sombras_largas', 'Sombras largas', 'Acecho dura +40 %, a cambio de +10 % de enfriamiento.', 'rara', 'sombra', 2, (j) => { mul(j, 'habilidadDuracion', 1.4); mul(j, 'habilidadEnfriamiento', 1.1); }, ['cazador']),
  M('paso_felino', 'Paso felino', '+5 % de velocidad y la esquiva se recarga un 15 % antes.', 'comun', 'esquiva', 3, (j) => { mul(j, 'velocidad', 1.05); mul(j, 'esquivaEnfriamiento', 0.85); }, ['cazador']),

  // ===== DEMOLEDOR ==============================================================================================
  M('replicas', 'Réplicas', 'Cada explosión provoca 2 réplicas más pequeñas, a cambio de recarga +10 % más lenta.', 'epica', 'replicas', 2,
    (j) => { sum(j, 'replicas', 2); mul(j, 'recarga', 1.1); }, ['demoledor']),
  M('punos_de_titan', 'Puños de titán', 'Cuerpo a cuerpo +30 % de daño y +20 % de empuje.', 'rara', 'cuerpo', 3, (j) => { mul(j, 'cuerpo', 1.3); mul(j, 'empuje', 1.2); }, ['demoledor']),
  M('sismo_ampliado', 'Sismo ampliado', 'Golpe sísmico ×1,25 de alcance y daño, a cambio de +10 % de enfriamiento.', 'rara', 'sismo', 2, (j) => { mul(j, 'habilidadPotencia', 1.25); mul(j, 'habilidadEnfriamiento', 1.1); }, ['demoledor']),
  M('carga_extra', 'Carga extra', 'Explosivos +20 % de daño y +15 % de radio.', 'comun', 'explosion', 2, (j) => { mul(j, 'explosivos', 1.2); mul(j, 'radioExplosion', 1.15); }, ['demoledor']),
];

export const MEJORAS_POR_ID = Object.fromEntries(MEJORAS.map((m) => [m.id, m]));
export const esEspecifica = (m) => Array.isArray(m.roles);

/** Peso de una rareza según el día: las raras y mejores se vuelven más comunes con el avance; las legendarias no salen hasta el día 8. */
export function pesoRareza(rareza, dia = 1) {
  const b = RAREZAS[rareza]?.peso ?? 10;
  const d = Math.max(0, dia - 1);
  switch (rareza) {
    case 'comun': return Math.max(25, b - 0.9 * d);
    case 'rara': return b + 0.35 * d;
    case 'epica': return dia < 4 ? 0 : b + 0.22 * d;
    case 'legendaria': return dia < 8 ? 0 : b + 0.1 * d;
    default: return b;
  }
}

/** Copia serializable de una mejora para la interfaz (sin `aplicar`), con el nivel que ya tiene el jugador. */
export function vistaMejora(def, nivel = 0) {
  const { aplicar, ...resto } = def; // eslint-disable-line no-unused-vars
  return { ...resto, nivel, siguiente: nivel + 1, color: RAREZAS[def.rareza]?.color };
}

/**
 * Elige `n` mejoras distintas para un jugador.
 * @param {Function} rng        juego.rng
 * @param {string} rolId        rol del jugador
 * @param {Object} aplicadas    { mejoraId: veces }
 * @param {number} dia
 * @param {number} n
 * @returns {object[]} defs (con `aplicar`)
 */
export function elegirMejoras(rng, rolId, aplicadas = {}, dia = 1, n = 3) {
  const candidatas = MEJORAS.filter((m) => (aplicadas[m.id] || 0) < m.max && (!m.roles || m.roles.includes(rolId)));
  const elegidas = [];
  const peso = (m) => pesoRareza(m.rareza, dia) * (esEspecifica(m) ? 1.15 : 1);
  const sacar = (lista) => {
    const util = lista.filter((m) => !elegidas.includes(m) && peso(m) > 0);
    if (!util.length) return null;
    return rng.ponderado(util.map((m) => [m, peso(m)]));
  };
  // Al menos una específica del rol si hay alguna disponible.
  const espec = sacar(candidatas.filter(esEspecifica));
  if (espec) elegidas.push(espec);
  while (elegidas.length < n) {
    const m = sacar(candidatas);
    if (!m) break;
    elegidas.push(m);
  }
  // Mezcla el orden para que la específica no sea siempre la primera.
  for (let i = elegidas.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [elegidas[i], elegidas[k]] = [elegidas[k], elegidas[i]]; }
  return elegidas;
}
