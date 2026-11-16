// Las seis eras del juego (1800 → 2100). Cada oleada es un «día» y cada día avanza el calendario 10 años.
// Cada 5 días cambia la era: nuevo escenario, nuevas armas, nuevo vehículo, nuevos atuendos y nuevo jefe.
export const ANIO_INICIAL = 1800;
export const ANIO_FINAL = 2100;
export const ANIOS_POR_DIA = 10;
export const DIAS_POR_ERA = 5;
export const DIA_FINAL = 31; // año 2100: jefe final

/** Arquetipos de arma. Cada rol usa arquetipos; cada era define qué arma concreta ocupa cada arquetipo. */
export const ARQUETIPOS = ['fusil', 'pistola', 'precision', 'pesada', 'ligera', 'herramienta', 'arrojadiza', 'cuerpo'];

export const ERAS = [
  {
    idx: 0, id: 'polvora', nombre: 'Era de la Pólvora', anios: [1800, 1849],
    escenario: 'villa_colonial', nombreEscenario: 'Villa de Santa Ceniza',
    lema: 'Un disparo. Una eternidad para recargar.',
    descripcion: 'Una villa colonial empedrada: plaza con fuente, iglesia, mercado y cementerio. Faroles de aceite y niebla.',
    armas: { fusil: 'mosquete', pistola: 'pistola_chispa', precision: 'rifle_cazador', pesada: 'trabuco', ligera: 'pistolas_duelo', herramienta: 'carabina_zapador', arrojadiza: 'granada_mecha', cuerpo: 'sable' },
    vehiculo: 'caballo', emplazamiento: 'canon_campana', explosivo: 'barril_polvora', torreta: 'organo_relojeria', jefe: 'coracero',
    interactivos: ['campana_iglesia', 'farol_aceite', 'carreta'],
    color: '#d9a441',
  },
  {
    idx: 1, id: 'vapor', nombre: 'Era del Vapor', anios: [1850, 1899],
    escenario: 'estacion_fronteriza', nombreEscenario: 'Estación Cruz del Diablo',
    lema: 'Hierro, carbón y plomo.',
    descripcion: 'Un pueblo fronterizo con estación de tren, saloon, depósito de agua y una mina. Polvo, vapor y atardeceres rojos.',
    armas: { fusil: 'rifle_palanca', pistola: 'revolver', precision: 'rifle_bufalo', pesada: 'escopeta_doble', ligera: 'revolveres_gemelos', herramienta: 'recortada', arrojadiza: 'dinamita', cuerpo: 'machete' },
    vehiculo: 'locomovil', emplazamiento: 'gatling', explosivo: 'caja_dinamita', torreta: 'mini_gatling', jefe: 'fogonero',
    interactivos: ['palanca_tren', 'deposito_agua', 'vagoneta'],
    color: '#c8703a',
  },
  {
    idx: 2, id: 'trincheras', nombre: 'Era de las Trincheras', anios: [1900, 1949],
    escenario: 'tierra_de_nadie', nombreEscenario: 'Tierra de Nadie',
    lema: 'El barro lo devora todo.',
    descripcion: 'Un frente devastado: trincheras, alambradas, cráteres, búnkeres y un pueblo en ruinas bajo la lluvia y las bengalas.',
    armas: { fusil: 'subfusil_trinchera', pistola: 'pistola_semiauto', precision: 'fusil_cerrojo', pesada: 'lanzallamas', ligera: 'carabina_m', herramienta: 'escopeta_trinchera', arrojadiza: 'granada_mango', cuerpo: 'pala_trinchera' },
    vehiculo: 'autoblindado', emplazamiento: 'ametralladora_pesada', explosivo: 'bidon_combustible', torreta: 'torreta_maxim', jefe: 'mariscal',
    interactivos: ['alambrada', 'mina_terrestre', 'sirena_antiaerea'],
    color: '#7d8a5a',
  },
  {
    idx: 3, id: 'atomica', nombre: 'Era Atómica', anios: [1950, 1999],
    escenario: 'suburbio_neon', nombreEscenario: 'Avenida Neón',
    lema: 'Cromo, neón y gasolina.',
    descripcion: 'Una avenida de carretera: gasolinera, diner, autocine, motel y aparcamiento. Rótulos de neón sobre asfalto mojado.',
    armas: { fusil: 'fusil_asalto', pistola: 'magnum', precision: 'rifle_francotirador', pesada: 'lanzacohetes', ligera: 'subfusil_compacto', herramienta: 'escopeta_corredera', arrojadiza: 'molotov', cuerpo: 'bate' },
    vehiculo: 'muscle_car', emplazamiento: 'm60_fija', explosivo: 'surtidor_gasolina', torreta: 'torreta_centinela', jefe: 'rey_asfalto',
    interactivos: ['alarma_coche', 'surtidor_gasolina', 'transformador'],
    color: '#ff4fa3',
  },
  {
    idx: 4, id: 'digital', nombre: 'Era Digital', anios: [2000, 2049],
    escenario: 'zona_cuarentena', nombreEscenario: 'Zona de Cuarentena 7',
    lema: 'El protocolo ha fallado.',
    descripcion: 'El centro de una metrópolis sellada: puesto de control militar, hospital de campaña, rascacielos de cristal y un helipuerto.',
    armas: { fusil: 'carabina_tactica', pistola: 'pistola_tactica', precision: 'rifle_antimaterial', pesada: 'lanzagranadas', ligera: 'pdw', herramienta: 'escopeta_automatica', arrojadiza: 'granada_frag', cuerpo: 'hacha_tactica' },
    vehiculo: 'blindado_tactico', emplazamiento: 'minigun_fija', explosivo: 'bombona_gas', torreta: 'torreta_automatica', jefe: 'paciente_cero',
    interactivos: ['valla_electrica', 'generador', 'dron_suministros'],
    color: '#4fb8ff',
  },
  {
    idx: 5, id: 'sintetica', nombre: 'Era Sintética', anios: [2050, 2100],
    escenario: 'megaurbe_aurora', nombreEscenario: 'Megaurbe Aurora',
    lema: 'La carne es obsoleta. El hambre no.',
    descripcion: 'Una plaza elevada de megaciudad: hologramas, lluvia ácida de neón, raíles magnéticos, torres Tesla y un reactor.',
    armas: { fusil: 'rifle_pulsos', pistola: 'pistola_plasma', precision: 'canon_riel', pesada: 'canon_arco', ligera: 'subfusil_agujas', herramienta: 'proyector_ondas', arrojadiza: 'granada_singularidad', cuerpo: 'hoja_termica' },
    vehiculo: 'aerodeslizador', emplazamiento: 'canon_plasma_fijo', explosivo: 'celula_plasma', torreta: 'torreta_laser', jefe: 'omega',
    interactivos: ['torre_tesla', 'puerta_energia', 'celula_plasma'],
    color: '#b46bff',
  },
];

export const anioDeDia = (dia) => Math.min(ANIO_FINAL, ANIO_INICIAL + (Math.max(1, dia) - 1) * ANIOS_POR_DIA);
export const eraDeDia = (dia) => Math.min(ERAS.length - 1, Math.floor((Math.max(1, dia) - 1) / DIAS_POR_ERA));
export const primerDiaDeEra = (eraIdx) => eraIdx * DIAS_POR_ERA + 1;
/** ¿Es el último día de su era (día de jefe)? El día 31 (año 2100) es el jefe final. */
export const esDiaDeJefe = (dia) => dia === DIA_FINAL || (dia % DIAS_POR_ERA === 0 && dia < 30);
