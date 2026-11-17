// Arsenal de ERA Z: 48 armas = 6 eras × 8 arquetipos. Datos base; el sistema de combate (src/combate) los interpreta.
// Dueño: Combate. Los ids son estables (no renombrar).
//
// CAMPOS
//   comportamiento  hitscan | perdigones | proyectil | llama | arco | cuerpo | arrojadiza
//   danio           por impacto (perdigones: por perdigón; llama y arco: daño por SEGUNDO al objetivo principal)
//   tipo            bala | perforante | explosivo | fuego | golpe | energia
//   cadencia        disparos/s (llama y arco: pulsos de daño/s, cada pulso gasta 1 de munición)
//   cargador        disparos por cargador · recarga: s · reserva: cargadores de reserva al equipar (−1 = infinita)
//   recargaTipo     'cargador' (por defecto) | 'cartucho' (uno a uno e interrumpible; `recarga` = tiempo del cargador completo)
//                   Las armas de un solo tiro (cargador 1) recargan solas tras cada disparo: en la era 0 esa lentitud es diseño.
//   dispersion      cono total en grados (perdigones: abanico) · calentamiento: s de fuego sostenido hasta la dispersión máxima
//   alcance         m · caida: [fracción del alcance donde empieza a perder daño, factor mínimo al final]
//   perforacion     objetivos extra que atraviesa · perdida: fracción de daño que pierde por objetivo atravesado
//   critico         probabilidad base (se suma a mods.critico del portador) · multCritico: multiplicador del crítico (2 por defecto)
//   empuje          impulso al impactar (m/s sobre 70 kg; perdigones: total del disparo) · aturdimiento: s de tambaleo
//   auto            true = automática (mantener) · false = semiautomática (un disparo por pulsación)
//   radio           radio de explosión (proyectil y arrojadiza) · velocidad: m/s del proyectil · gravedad: parábola
//   fogonazo, trazadora, casquillo, sonido, retroceso, visual → sensación (FX, audio, cámara)
//   descripcion     una frase para la interfaz
//
// IDENTIDAD DE LOS ARQUETIPOS
//   fusil        el equilibrio: daño fiable a media distancia.
//   pistola      secundaria de munición infinita; nunca te deja vendido.
//   precision    SIEMPRE perfora y hace crítico; sin caída de daño; cadencia lenta.
//   pesada       zona y derribo: abanicos, llamas, explosiones, arcos. Se mide en DPS de zona.
//   ligera       volumen de fuego: la cadencia más alta de su era, poco daño por bala.
//   herramienta  escopeta de zapador: corta distancia, mucho empuje.
//
/*DPS*/
export const ARMAS = {
  // ───────────────────────────── Era 0 · Pólvora (1800–1849) ─────────────────────────────
  mosquete: { id: 'mosquete', nombre: 'Mosquete de chispa', era: 0, arquetipo: 'fusil', comportamiento: 'hitscan', danio: 95, tipo: 'bala', cadencia: 1, cargador: 1, recarga: 2.6, reserva: 40, dispersion: 2.5, alcance: 38, caida: [0.6, 0.6], perforacion: 1, perdida: 0.35, empuje: 6, auto: false, fogonazo: 'polvora', trazadora: 'bala', sonido: 'mosquete', retroceso: 1.0,
    descripcion: 'Una bala de plomo capaz de tumbar a dos muertos en fila… y una eternidad de baqueta para la siguiente.' },
  pistola_chispa: { id: 'pistola_chispa', nombre: 'Pistola de pedernal', era: 0, arquetipo: 'pistola', comportamiento: 'hitscan', danio: 55, tipo: 'bala', cadencia: 1, cargador: 1, recarga: 1.7, reserva: -1, dispersion: 4, alcance: 22, caida: [0.5, 0.5], perforacion: 0, empuje: 4, auto: false, fogonazo: 'polvora', trazadora: 'bala', sonido: 'pistola_chispa', retroceso: 0.7,
    descripcion: 'Un único disparo de reserva que siempre está cebado cuando el arma principal no lo está.' },
  rifle_cazador: { id: 'rifle_cazador', nombre: 'Rifle de cazador', era: 0, arquetipo: 'precision', comportamiento: 'hitscan', danio: 190, tipo: 'perforante', cadencia: 1, cargador: 1, recarga: 3.1, reserva: 30, dispersion: 0.3, alcance: 60, caida: null, perforacion: 3, perdida: 0.15, critico: 0.25, multCritico: 2.25, empuje: 8, auto: false, fogonazo: 'polvora', trazadora: 'bala', sonido: 'rifle_antiguo', retroceso: 1.2,
    descripcion: 'Ánima rayada y pulso firme: atraviesa una fila entera a sesenta metros.' },
  trabuco: { id: 'trabuco', nombre: 'Trabuco', era: 0, arquetipo: 'pesada', comportamiento: 'perdigones', danio: 22, tipo: 'bala', perdigones: 14, cadencia: 1, cargador: 1, recarga: 3.0, reserva: 28, dispersion: 22, alcance: 13, caida: [0.35, 0.35], perforacion: 0, empuje: 14, aturdimiento: 0.5, objetivosTipicos: 1, auto: false, fogonazo: 'polvora_grande', trazadora: 'bala', sonido: 'trabuco', retroceso: 1.8,
    descripcion: 'Una boca de campana cargada de metralla: barre la calle entera y derriba lo que queda en pie.' },
  pistolas_duelo: { id: 'pistolas_duelo', nombre: 'Pistolas de duelo', era: 0, arquetipo: 'ligera', comportamiento: 'hitscan', danio: 50, tipo: 'bala', cadencia: 2.5, cargador: 2, recarga: 2.4, reserva: 40, dispersion: 3, alcance: 24, caida: [0.5, 0.5], perforacion: 0, empuje: 4, auto: false, fogonazo: 'polvora', trazadora: 'bala', sonido: 'pistola_chispa', retroceso: 0.6, doble: true,
    descripcion: 'Dos disparos casi seguidos, uno por mano, antes de volver a cebar ambas cazoletas.' },
  carabina_zapador: { id: 'carabina_zapador', nombre: 'Carabina de zapador', era: 0, arquetipo: 'herramienta', comportamiento: 'perdigones', danio: 20, tipo: 'bala', perdigones: 7, cadencia: 1, cargador: 1, recarga: 2.2, reserva: 36, dispersion: 12, alcance: 16, caida: [0.4, 0.4], perforacion: 0, empuje: 9, auto: false, fogonazo: 'polvora', trazadora: 'bala', sonido: 'carabina', retroceso: 1.1,
    descripcion: 'Corta, recia y cargada con postas: la herramienta del zapador para despejar una brecha.' },
  granada_mecha: { id: 'granada_mecha', nombre: 'Granada de mecha', era: 0, arquetipo: 'arrojadiza', comportamiento: 'arrojadiza', danio: 160, tipo: 'explosivo', radio: 4.5, mecha: 1.6, alcance: 16, empuje: 16, aturdimiento: 0.6, sonido: 'explosion_polvora', efecto: 'explosion', visual: 'granada_mecha',
    descripcion: 'Una bola de hierro rellena de pólvora negra; la mecha chisporrotea lo justo para arrepentirse.' },
  sable: { id: 'sable', nombre: 'Sable de caballería', era: 0, arquetipo: 'cuerpo', comportamiento: 'cuerpo', danio: 70, tipo: 'golpe', cadencia: 1.6, alcance: 2.2, arco: 110, objetivos: 4, empuje: 7, sonido: 'tajo',
    descripcion: 'Un tajo amplio que abre hueco cuando la pólvora se ha acabado.' },

  // ───────────────────────────── Era 1 · Vapor (1850–1899) ─────────────────────────────
  rifle_palanca: { id: 'rifle_palanca', nombre: 'Rifle de repetición', era: 1, arquetipo: 'fusil', comportamiento: 'hitscan', danio: 62, tipo: 'bala', cadencia: 2.6, cargador: 12, recarga: 2.4, recargaTipo: 'cartucho', reserva: 8, dispersion: 2, alcance: 40, caida: [0.6, 0.6], perforacion: 1, perdida: 0.35, empuje: 5, auto: false, fogonazo: 'polvora', trazadora: 'bala', sonido: 'rifle_palanca', retroceso: 0.7,
    descripcion: 'Doce tiros a golpe de palanca; se recarga cartucho a cartucho y puedes disparar a media recarga.' },
  revolver: { id: 'revolver', nombre: 'Revólver de seis tiros', era: 1, arquetipo: 'pistola', comportamiento: 'hitscan', danio: 48, tipo: 'bala', cadencia: 3.2, cargador: 6, recarga: 1.9, reserva: -1, dispersion: 3.5, alcance: 24, caida: [0.5, 0.5], perforacion: 0, empuje: 4, auto: false, fogonazo: 'polvora', trazadora: 'bala', sonido: 'revolver', retroceso: 0.6,
    descripcion: 'Seis razones de plomo para mantener a raya a la horda mientras recargas el rifle.' },
  rifle_bufalo: { id: 'rifle_bufalo', nombre: 'Rifle de búfalo', era: 1, arquetipo: 'precision', comportamiento: 'hitscan', danio: 240, tipo: 'perforante', cadencia: 0.8, cargador: 1, recarga: 1.9, reserva: 36, dispersion: 0.2, alcance: 70, caida: null, perforacion: 4, perdida: 0.14, critico: 0.28, multCritico: 2.3, empuje: 10, auto: false, fogonazo: 'polvora_grande', trazadora: 'bala', sonido: 'rifle_pesado', retroceso: 1.4,
    descripcion: 'Calibre de bisonte y retrocarga: un solo cartucho enorme que no se detiene en el primer cráneo.' },
  escopeta_doble: { id: 'escopeta_doble', nombre: 'Escopeta de dos cañones', era: 1, arquetipo: 'pesada', comportamiento: 'perdigones', danio: 24, tipo: 'bala', perdigones: 12, cadencia: 2.2, cargador: 2, recarga: 2.3, reserva: 24, dispersion: 16, alcance: 14, caida: [0.35, 0.35], perforacion: 0, empuje: 14, aturdimiento: 0.4, objetivosTipicos: 1, auto: false, fogonazo: 'polvora_grande', trazadora: 'bala', sonido: 'escopeta_doble', retroceso: 1.6,
    descripcion: 'Dos cañones, dos truenos: a quemarropa parte en dos a cualquier cosa que camine.' },
  revolveres_gemelos: { id: 'revolveres_gemelos', nombre: 'Revólveres gemelos', era: 1, arquetipo: 'ligera', comportamiento: 'hitscan', danio: 40, tipo: 'bala', cadencia: 5.5, cargador: 12, recarga: 2.6, reserva: 8, dispersion: 4.5, calentamiento: 1.6, alcance: 22, caida: [0.5, 0.5], perforacion: 0, empuje: 3, auto: true, fogonazo: 'polvora', trazadora: 'bala', sonido: 'revolver', retroceso: 0.5, doble: true,
    descripcion: 'Doce balas abanicando los martillos a dos manos: mucho ruido, mucho plomo, poca puntería.' },
  recortada: { id: 'recortada', nombre: 'Recortada', era: 1, arquetipo: 'herramienta', comportamiento: 'perdigones', danio: 19, tipo: 'bala', perdigones: 10, cadencia: 2, cargador: 2, recarga: 1.9, reserva: 26, dispersion: 24, alcance: 10, caida: [0.3, 0.3], perforacion: 0, empuje: 13, auto: false, fogonazo: 'polvora_grande', trazadora: 'bala', sonido: 'recortada', retroceso: 1.5,
    descripcion: 'Cañones serrados: no sirve a más de diez pasos, pero a menos no queda nadie en pie.' },
  dinamita: { id: 'dinamita', nombre: 'Cartucho de dinamita', era: 1, arquetipo: 'arrojadiza', comportamiento: 'arrojadiza', danio: 220, tipo: 'explosivo', radio: 5.2, mecha: 1.8, alcance: 17, empuje: 20, aturdimiento: 0.7, sonido: 'explosion_dinamita', efecto: 'explosion', visual: 'dinamita',
    descripcion: 'El invento del siglo para abrir minas, túneles y hordas.' },
  machete: { id: 'machete', nombre: 'Machete', era: 1, arquetipo: 'cuerpo', comportamiento: 'cuerpo', danio: 78, tipo: 'golpe', cadencia: 1.8, alcance: 2.0, arco: 100, objetivos: 3, empuje: 6, sonido: 'tajo',
    descripcion: 'Hoja ancha de desbrozar: rápida, sucia y siempre a mano.' },

  // ───────────────────────────── Era 2 · Trincheras (1900–1949) ─────────────────────────────
  subfusil_trinchera: { id: 'subfusil_trinchera', nombre: 'Subfusil de trinchera', era: 2, arquetipo: 'fusil', comportamiento: 'hitscan', danio: 36, tipo: 'bala', cadencia: 8.5, cargador: 32, recarga: 2.2, reserva: 7, dispersion: 4, calentamiento: 2.2, alcance: 30, caida: [0.55, 0.55], perforacion: 0, empuje: 2.5, auto: true, fogonazo: 'moderno', trazadora: 'bala', sonido: 'subfusil', retroceso: 0.35, casquillo: true,
    descripcion: 'La escoba de las trincheras: por fin, fuego automático para barrer un pasillo entero.' },
  pistola_semiauto: { id: 'pistola_semiauto', nombre: 'Pistola semiautomática', era: 2, arquetipo: 'pistola', comportamiento: 'hitscan', danio: 42, tipo: 'bala', cadencia: 4.5, cargador: 8, recarga: 1.4, reserva: -1, dispersion: 3, alcance: 26, caida: [0.5, 0.5], perforacion: 0, empuje: 3, auto: false, fogonazo: 'moderno', trazadora: 'bala', sonido: 'pistola', retroceso: 0.45, casquillo: true,
    descripcion: 'Ocho disparos tan rápidos como tu dedo y un cargador que entra de un golpe.' },
  fusil_cerrojo: { id: 'fusil_cerrojo', nombre: 'Fusil de cerrojo con mira', era: 2, arquetipo: 'precision', comportamiento: 'hitscan', danio: 290, tipo: 'perforante', cadencia: 1.1, cargador: 5, recarga: 2.6, reserva: 9, dispersion: 0.15, alcance: 80, caida: null, perforacion: 4, perdida: 0.13, critico: 0.3, multCritico: 2.4, empuje: 10, auto: false, fogonazo: 'moderno', trazadora: 'bala', sonido: 'fusil_cerrojo', retroceso: 1.3, casquillo: true,
    descripcion: 'Cinco balas, un cerrojo y una mira telescópica: cada tiro cruza la tierra de nadie de lado a lado.' },
  lanzallamas: { id: 'lanzallamas', nombre: 'Lanzallamas', era: 2, arquetipo: 'pesada', comportamiento: 'llama', danio: 170, tipo: 'fuego', cadencia: 20, cargador: 120, recarga: 3.0, reserva: 4, dispersion: 10, cono: 24, alcance: 11, caida: [0.6, 0.5], empuje: 0.5, quemadura: { duracion: 3, dps: 40 }, residuo: { radio: 1.5, duracion: 2.8, dps: 45, cada: 0.45 }, objetivosTipicos: 3, auto: true, fogonazo: 'ninguno', sonido: 'lanzallamas', retroceso: 0.05,
    descripcion: 'Un chorro de fuego líquido que prende a la horda y deja el suelo ardiendo tras de sí.' },
  carabina_m: { id: 'carabina_m', nombre: 'Carabina ligera', era: 2, arquetipo: 'ligera', comportamiento: 'hitscan', danio: 24, tipo: 'bala', cadencia: 12, cargador: 30, recarga: 1.9, reserva: 7, dispersion: 3, calentamiento: 1.8, alcance: 32, caida: [0.5, 0.5], perforacion: 0, empuje: 2, auto: true, fogonazo: 'moderno', trazadora: 'bala', sonido: 'carabina_m', retroceso: 0.3, casquillo: true,
    descripcion: 'Ligera, de fuego selectivo y hambrienta de munición: vacía el cargador antes de que la horda pestañee.' },
  escopeta_trinchera: { id: 'escopeta_trinchera', nombre: 'Escopeta de trinchera', era: 2, arquetipo: 'herramienta', comportamiento: 'perdigones', danio: 21, tipo: 'bala', perdigones: 9, cadencia: 1.5, cargador: 6, recarga: 3.0, recargaTipo: 'cartucho', reserva: 6, dispersion: 13, alcance: 15, caida: [0.4, 0.4], perforacion: 0, empuje: 12, auto: false, fogonazo: 'moderno', trazadora: 'bala', sonido: 'escopeta', retroceso: 1.3, casquillo: true,
    descripcion: 'Corredera, seis cartuchos y bayoneta: se recarga uno a uno y dispara en cuanto hay algo dentro.' },
  granada_mango: { id: 'granada_mango', nombre: 'Granada de mango', era: 2, arquetipo: 'arrojadiza', comportamiento: 'arrojadiza', danio: 260, tipo: 'explosivo', radio: 5.5, mecha: 1.5, alcance: 19, empuje: 22, aturdimiento: 0.7, sonido: 'explosion', efecto: 'explosion', visual: 'granada_mango',
    descripcion: 'El mango de madera la lleva más lejos; la carga hace el resto.' },
  pala_trinchera: { id: 'pala_trinchera', nombre: 'Pala de trinchera', era: 2, arquetipo: 'cuerpo', comportamiento: 'cuerpo', danio: 100, tipo: 'golpe', cadencia: 1.5, alcance: 2.0, arco: 100, objetivos: 3, empuje: 9, sonido: 'golpe_metal',
    descripcion: 'Cava trincheras y, afilada, también las defiende.' },

  // ───────────────────────────── Era 3 · Atómica (1950–1999) ─────────────────────────────
  fusil_asalto: { id: 'fusil_asalto', nombre: 'Fusil de asalto', era: 3, arquetipo: 'fusil', comportamiento: 'hitscan', danio: 44, tipo: 'bala', cadencia: 10, cargador: 30, recarga: 2.0, reserva: 8, dispersion: 2.6, calentamiento: 2.5, alcance: 42, caida: [0.6, 0.6], perforacion: 1, perdida: 0.4, empuje: 3, auto: true, fogonazo: 'moderno', trazadora: 'bala', sonido: 'fusil_asalto', retroceso: 0.4, casquillo: true,
    descripcion: 'Treinta balas de calibre intermedio en automático: el nuevo patrón de la infantería.' },
  magnum: { id: 'magnum', nombre: 'Magnum .44', era: 3, arquetipo: 'pistola', comportamiento: 'hitscan', danio: 120, tipo: 'perforante', cadencia: 1.8, cargador: 6, recarga: 2.0, reserva: -1, dispersion: 1.5, alcance: 32, caida: [0.6, 0.6], perforacion: 1, perdida: 0.3, critico: 0.1, multCritico: 2.2, empuje: 8, auto: false, fogonazo: 'moderno_grande', trazadora: 'bala', sonido: 'magnum', retroceso: 1.0,
    descripcion: 'El revólver más potente del mundo: lento, atronador y capaz de agujerear una coraza.' },
  rifle_francotirador: { id: 'rifle_francotirador', nombre: 'Rifle de francotirador', era: 3, arquetipo: 'precision', comportamiento: 'hitscan', danio: 420, tipo: 'perforante', cadencia: 1.3, cargador: 10, recarga: 2.6, reserva: 7, dispersion: 0.1, alcance: 90, caida: null, perforacion: 5, perdida: 0.12, critico: 0.33, multCritico: 2.5, empuje: 12, auto: false, fogonazo: 'moderno_grande', trazadora: 'bala', sonido: 'francotirador', retroceso: 1.4, casquillo: true,
    descripcion: 'Semiautomático y de cañón pesado: diez disparos que enhebran a la horda como cuentas.' },
  lanzacohetes: { id: 'lanzacohetes', nombre: 'Lanzacohetes', era: 3, arquetipo: 'pesada', comportamiento: 'proyectil', danio: 520, tipo: 'explosivo', radio: 6.5, velocidad: 34, cadencia: 0.8, cargador: 1, recarga: 2.6, reserva: 14, dispersion: 1, alcance: 60, empuje: 28, aturdimiento: 1.0, objetivosTipicos: 4, auto: false, fogonazo: 'cohete', sonido: 'lanzacohetes', retroceso: 1.6, efecto: 'explosion_grande', visual: 'cohete',
    descripcion: 'Un cohete que cruza la avenida y convierte un grupo de muertos en un cráter. No lo dispares cerca.' },
  subfusil_compacto: { id: 'subfusil_compacto', nombre: 'Subfusil compacto', era: 3, arquetipo: 'ligera', comportamiento: 'hitscan', danio: 27, tipo: 'bala', cadencia: 15, cargador: 32, recarga: 1.6, reserva: 7, dispersion: 5, calentamiento: 1.6, alcance: 26, caida: [0.5, 0.5], perforacion: 0, empuje: 2, auto: true, fogonazo: 'moderno', trazadora: 'bala', sonido: 'subfusil_rapido', retroceso: 0.3, casquillo: true,
    descripcion: 'Cabe bajo una chaqueta y escupe quince balas por segundo; apunta al bulto.' },
  escopeta_corredera: { id: 'escopeta_corredera', nombre: 'Escopeta de corredera', era: 3, arquetipo: 'herramienta', comportamiento: 'perdigones', danio: 26, tipo: 'bala', perdigones: 10, cadencia: 1.4, cargador: 8, recarga: 3.2, recargaTipo: 'cartucho', reserva: 6, dispersion: 12, alcance: 16, caida: [0.4, 0.4], perforacion: 0, empuje: 14, auto: false, fogonazo: 'moderno_grande', trazadora: 'bala', sonido: 'escopeta', retroceso: 1.4, casquillo: true,
    descripcion: 'El «chac-chac» más temido de la avenida: ocho cartuchos que se reponen uno a uno.' },
  molotov: { id: 'molotov', nombre: 'Cóctel molotov', era: 3, arquetipo: 'arrojadiza', comportamiento: 'arrojadiza', danio: 60, tipo: 'fuego', radio: 4.5, mecha: 0, alcance: 17, empuje: 2, sonido: 'molotov', efecto: 'fuego', visual: 'molotov', zona: { tipo: 'fuego', duracion: 7, dps: 55 },
    descripcion: 'Gasolina, una botella y un trapo: estalla al caer y deja un charco de fuego que corta el paso.' },
  bate: { id: 'bate', nombre: 'Bate con clavos', era: 3, arquetipo: 'cuerpo', comportamiento: 'cuerpo', danio: 115, tipo: 'golpe', cadencia: 1.5, alcance: 2.1, arco: 110, objetivos: 3, empuje: 12, sonido: 'golpe_madera',
    descripcion: 'Fresno, clavos de carpintero y un buen swing: manda a los muertos a la grada.' },

  // ───────────────────────────── Era 4 · Digital (2000–2049) ─────────────────────────────
  carabina_tactica: { id: 'carabina_tactica', nombre: 'Carabina táctica', era: 4, arquetipo: 'fusil', comportamiento: 'hitscan', danio: 56, tipo: 'bala', cadencia: 12, cargador: 30, recarga: 1.8, reserva: 9, dispersion: 1.8, calentamiento: 2.8, alcance: 46, caida: [0.6, 0.6], perforacion: 1, perdida: 0.4, empuje: 3, auto: true, fogonazo: 'moderno', trazadora: 'bala', sonido: 'carabina_tactica', retroceso: 0.35, casquillo: true,
    descripcion: 'Modular, precisa y fiable: mantiene la ráfaga agrupada donde otras se desbocan.' },
  pistola_tactica: { id: 'pistola_tactica', nombre: 'Pistola táctica 9 mm', era: 4, arquetipo: 'pistola', comportamiento: 'hitscan', danio: 58, tipo: 'bala', cadencia: 6, cargador: 17, recarga: 1.2, reserva: -1, dispersion: 2.2, alcance: 30, caida: [0.5, 0.5], perforacion: 0, empuje: 3, auto: false, fogonazo: 'moderno', trazadora: 'bala', sonido: 'pistola_tactica', retroceso: 0.35, casquillo: true,
    descripcion: 'Polímero, diecisiete balas y recarga en un suspiro: la secundaria que casi es principal.' },
  rifle_antimaterial: { id: 'rifle_antimaterial', nombre: 'Rifle antimaterial', era: 4, arquetipo: 'precision', comportamiento: 'hitscan', danio: 780, tipo: 'perforante', cadencia: 0.9, cargador: 5, recarga: 3.0, reserva: 7, dispersion: 0.05, alcance: 110, caida: null, perforacion: 8, perdida: 0.1, critico: 0.36, multCritico: 2.6, empuje: 20, aturdimiento: 0.3, auto: false, fogonazo: 'moderno_grande', trazadora: 'bala', sonido: 'antimaterial', retroceso: 2.0, casquillo: true,
    descripcion: 'Diseñado para parar vehículos: una Mole es solo un vehículo que grita.' },
  lanzagranadas: { id: 'lanzagranadas', nombre: 'Lanzagranadas rotativo', era: 4, arquetipo: 'pesada', comportamiento: 'proyectil', danio: 380, tipo: 'explosivo', radio: 5.5, velocidad: 26, gravedad: true, cadencia: 2.2, cargador: 6, recarga: 3.4, reserva: 5, dispersion: 2, alcance: 40, empuje: 24, aturdimiento: 0.8, objetivosTipicos: 4, auto: false, fogonazo: 'moderno_grande', sonido: 'lanzagranadas', retroceso: 1.0, efecto: 'explosion', visual: 'granada40',
    descripcion: 'Seis granadas de 40 mm en tambor: lluvia de metralla en parábola sobre la cabeza de la horda.' },
  pdw: { id: 'pdw', nombre: 'Subfusil PDW', era: 4, arquetipo: 'ligera', comportamiento: 'hitscan', danio: 34, tipo: 'perforante', cadencia: 16, cargador: 40, recarga: 1.5, reserva: 7, dispersion: 3.5, calentamiento: 2.0, alcance: 30, caida: [0.5, 0.5], perforacion: 1, perdida: 0.4, empuje: 2, auto: true, fogonazo: 'moderno', trazadora: 'bala', sonido: 'pdw', retroceso: 0.25, casquillo: true,
    descripcion: 'Munición pequeña y rapidísima que atraviesa blindajes ligeros a dieciséis disparos por segundo.' },
  escopeta_automatica: { id: 'escopeta_automatica', nombre: 'Escopeta automática', era: 4, arquetipo: 'herramienta', comportamiento: 'perdigones', danio: 22, tipo: 'bala', perdigones: 9, cadencia: 4, cargador: 12, recarga: 2.6, reserva: 6, dispersion: 11, calentamiento: 2.0, alcance: 17, caida: [0.4, 0.4], perforacion: 0, empuje: 11, auto: true, fogonazo: 'moderno_grande', trazadora: 'bala', sonido: 'escopeta_auto', retroceso: 0.9, casquillo: true,
    descripcion: 'Un cargador de petaca y el gatillo a fondo: una pared de postas que avanza contigo.' },
  granada_frag: { id: 'granada_frag', nombre: 'Granada de fragmentación', era: 4, arquetipo: 'arrojadiza', comportamiento: 'arrojadiza', danio: 420, tipo: 'explosivo', radio: 6, mecha: 1.3, alcance: 20, empuje: 24, aturdimiento: 0.8, sonido: 'explosion', efecto: 'explosion', visual: 'granada_frag',
    descripcion: 'Anilla, palanca y seis metros de metralla en todas direcciones.' },
  hacha_tactica: { id: 'hacha_tactica', nombre: 'Hacha táctica', era: 4, arquetipo: 'cuerpo', comportamiento: 'cuerpo', danio: 135, tipo: 'golpe', cadencia: 1.8, alcance: 2.0, arco: 100, objetivos: 3, empuje: 10, sonido: 'tajo',
    descripcion: 'Acero de una pieza pensado para abrir puertas; los cráneos ceden antes.' },

  // ───────────────────────────── Era 5 · Sintética (2050–2100) ─────────────────────────────
  rifle_pulsos: { id: 'rifle_pulsos', nombre: 'Rifle de pulsos', era: 5, arquetipo: 'fusil', comportamiento: 'hitscan', danio: 74, tipo: 'energia', cadencia: 11, cargador: 45, recarga: 1.6, reserva: 9, dispersion: 1.5, calentamiento: 3.0, alcance: 50, caida: [0.65, 0.65], perforacion: 2, perdida: 0.3, empuje: 3, auto: true, fogonazo: 'plasma', sonido: 'rifle_pulsos', retroceso: 0.25, trazadora: 'pulso',
    descripcion: 'Dardos de energía coherente que atraviesan a tres objetivos sin perder el paso.' },
  pistola_plasma: { id: 'pistola_plasma', nombre: 'Pistola de plasma', era: 5, arquetipo: 'pistola', comportamiento: 'proyectil', danio: 110, tipo: 'energia', radio: 1.6, velocidad: 48, cadencia: 4, cargador: 12, recarga: 1.2, reserva: -1, dispersion: 1.5, alcance: 34, empuje: 5, auto: false, fogonazo: 'plasma', sonido: 'pistola_plasma', retroceso: 0.4, efecto: 'plasma', visual: 'plasma',
    descripcion: 'Dispara esferas de plasma que estallan al contacto y salpican a los que van detrás.' },
  canon_riel: { id: 'canon_riel', nombre: 'Cañón de riel', era: 5, arquetipo: 'precision', comportamiento: 'hitscan', danio: 1300, tipo: 'perforante', cadencia: 0.8, cargador: 4, recarga: 2.8, reserva: 8, dispersion: 0, alcance: 140, caida: null, perforacion: 99, perdida: 0.06, critico: 0.4, multCritico: 2.8, empuje: 26, aturdimiento: 0.4, auto: false, fogonazo: 'riel', sonido: 'canon_riel', retroceso: 2.2, trazadora: 'riel', atraviesaMuros: false,
    descripcion: 'Un clavo de tungsteno a siete veces la velocidad del sonido: atraviesa todo lo que no sea un muro.' },
  canon_arco: { id: 'canon_arco', nombre: 'Cañón de arco', era: 5, arquetipo: 'pesada', comportamiento: 'arco', danio: 420, tipo: 'energia', cadencia: 5, cargador: 60, recarga: 2.8, reserva: 5, dispersion: 0, cono: 28, alcance: 16, saltos: 6, radioSalto: 6, perdidaSalto: 0.15, ralentiza: [0.55, 0.5], empuje: 1, objetivosTipicos: 4.5, auto: true, fogonazo: 'electrico', trazadora: 'arco', sonido: 'canon_arco', retroceso: 0.1,
    descripcion: 'Un rayo encadenado que salta de cadáver en cadáver y los deja clavados en el sitio.' },
  subfusil_agujas: { id: 'subfusil_agujas', nombre: 'Subfusil de agujas', era: 5, arquetipo: 'ligera', comportamiento: 'hitscan', danio: 40, tipo: 'perforante', cadencia: 20, cargador: 60, recarga: 1.4, reserva: 7, dispersion: 3, calentamiento: 2.2, alcance: 34, caida: [0.5, 0.5], perforacion: 2, perdida: 0.3, empuje: 1.5, auto: true, fogonazo: 'plasma', sonido: 'agujas', retroceso: 0.2, trazadora: 'aguja',
    descripcion: 'Veinte agujas magnéticas por segundo: un zumbido y la primera fila ya no está.' },
  proyector_ondas: { id: 'proyector_ondas', nombre: 'Proyector de ondas', era: 5, arquetipo: 'herramienta', comportamiento: 'perdigones', danio: 34, tipo: 'energia', perdigones: 12, cadencia: 1.8, cargador: 8, recarga: 2.2, reserva: 6, dispersion: 18, alcance: 14, caida: [0.45, 0.45], perforacion: 2, perdida: 0.25, empuje: 26, aturdimiento: 0.35, auto: false, fogonazo: 'onda', trazadora: 'pulso', sonido: 'proyector_ondas', retroceso: 1.2,
    descripcion: 'Una onda de choque en abanico que atraviesa la primera fila y lanza por los aires al resto.' },
  granada_singularidad: { id: 'granada_singularidad', nombre: 'Granada de singularidad', era: 5, arquetipo: 'arrojadiza', comportamiento: 'arrojadiza', danio: 650, tipo: 'energia', radio: 7, mecha: 1.0, alcance: 20, empuje: -30, sonido: 'singularidad', efecto: 'singularidad', visual: 'granada_singularidad', zona: { tipo: 'gravedad', duracion: 2.5, dps: 0 },
    descripcion: 'Abre un pozo de gravedad que se traga a la horda y la aplasta al cerrarse.' },
  hoja_termica: { id: 'hoja_termica', nombre: 'Hoja térmica', era: 5, arquetipo: 'cuerpo', comportamiento: 'cuerpo', danio: 190, tipo: 'fuego', cadencia: 2.2, alcance: 2.3, arco: 120, objetivos: 5, empuje: 8, quemadura: { duracion: 2, dps: 30 }, sonido: 'hoja_termica',
    descripcion: 'Un filo al rojo blanco que corta y cauteriza de un solo gesto.' },
};
export const LISTA_ARMAS = Object.values(ARMAS);
