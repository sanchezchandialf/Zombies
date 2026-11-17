# ERA Z · Biblioteca de materiales PBR procedurales

Módulo: `src/render/materiales/` · Muestrario: `http://127.0.0.1:5173/pruebas/materiales.html`

55 materiales PBR 100 % procedurales (sin imágenes, sin red). Cada uno genera, al pedirlo por primera vez, un juego de texturas en mosaico
perfecto (sin costuras) con **albedo** (sRGB), **normal**, **ORMH** (R = oclusión, G = rugosidad, B = metalicidad, A = altura) y, si procede, **emisivo**.
Las texturas se comparten entre todas las variantes de un mismo material; el color se aplica como tinte por `material.color`.

## Uso rápido

```js
import { materiales, uvMundo } from '../render/materiales/index.js';

// 1) Material compartido y cacheado por opciones (no lo modifiques; clónalo si necesitas variantes)
const mat = materiales.obtener('ladrillo_rojo');
const pintada = materiales.obtener('acero_pintado', { color: 0x2f6fb0, desgaste: 0.6 });
const calle = materiales.obtener('asfalto_seco', { mojado: 0.7 });
const neon = materiales.obtener('neon', { color: 0xff2fb5, emisivo: 1.4 });

// 2) UV por proyección de caja: 1 unidad de UV = un mosaico completo (en metros = info.escala)
let geo = new THREE.BoxGeometry(12, 4, 0.4);
geo = uvMundo(geo, 'ladrillo_rojo');          // ¡usa siempre el valor devuelto! (puede ser una copia sin índice)
const muro = new THREE.Mesh(geo, mat);

// 3) Suelo grande sin repetición visible
const suelo = materiales.mezclaSuelo('adoquin', 'hierba', { escalaMascara: 0.05 });

// 4) Generar durante la pantalla de carga sin congelar el hilo
await materiales.precargar(['adoquin', 'ladrillo_rojo', 'tablones']);
```

Para fusionar geometrías estáticas (`mergeGeometries`) aplica `uvMundo` **antes** de fusionar, con `opciones.matriz` si ya has colocado la pieza
(`uvMundo(geo, esc, { matriz: mesh.matrixWorld })`): así los mosaicos de piezas contiguas coinciden en espacio mundo.

## API

| Función | Descripción |
|---|---|
| `materiales.obtener(nombre, opc?)` | `Material` compartido. Opciones abajo. Un nombre desconocido avisa por consola y devuelve `hormigon`. |
| `materiales.lista()` | `[{ nombre, grupo, descripcion }]` |
| `materiales.info(nombre)` | `{ nombre, grupo, descripcion, escala (m por mosaico), tam (px) }` |
| `materiales.texturas(nombre, semilla?)` | `{ map, normalMap, orm, emissiveMap }` base (para usos propios) |
| `materiales.mezclaSuelo(a, b, opc?)` | Material que mezcla dos suelos con mezcla por altura (los guijarros asoman entre la hierba). `opc`: `mascara` (Texture, canal R; por defecto ruido procedural), `escalaMascara` (0.05), `umbral` (0.5), `contraste` (3), `repetirB` (1), `desgaste`, `mojado` |
| `materiales.precargar(nombres, opc?)` | `Promise`; genera cediendo el hilo entre materiales |
| `materiales.configurar({ anisotropia: 8, calidad: 'alta' / 'media' / 'baja' })` | Antes de generar. `media` = 512 px máx., `baja` = 256 px |
| `materiales.tiempo(t)` | Fija el reloj de los materiales animados (por defecto avanza solo con el reloj del navegador) |
| `materiales.liberar()` | Libera texturas y materiales |
| `uvMundo(geo, escala o nombre, { matriz?, desfase?, rotar? })` | Ver arriba |

### Opciones de `obtener`

| Opción | Efecto |
|---|---|
| `color` | Tinte del albedo (multiplicativo, **solo en las zonas con máscara de tinte**: la pintura del acero, la cal del ladrillo encalado, el estuco, etc.; el óxido, el metal desnudo y la madera vista no se tiñen). En `neon`, `pantalla`, `composite_futurista`, `panel_futurista` es el color de la luz emitida. |
| `repetir` | Número o `[x, y]`: repetición extra de las texturas (si usas `uvMundo` normalmente no hace falta). |
| `desgaste` | 0..1. Suciedad en las cavidades y manchas de baja frecuencia, en shader (cada material trae el suyo por defecto). |
| `mojado` | 0..1. Oscurece, baja la rugosidad y forma **charcos planos** en las zonas bajas (reflejan el entorno). |
| `emisivo` | Multiplicador de la intensidad emisiva (neón, pantallas, ventanas de `cristal_rascacielos`: ponlo a 0 de día). |
| `semilla` | Entero. Genera otra variante de las texturas (cuesta generar de nuevo). |

## Rotura de la repetición

Todos los materiales llevan, en shader (`onBeforeCompile`), una **macro-variación**: dos capas de ruido de baja frecuencia con periodos incomensurables
(≈ 9 y 27 mosaicos) modulan valor, tono y rugosidad, de modo que ningún patrón se repite de forma evidente. Con `InstancedMesh.setColorAt` el
color por instancia se multiplica además (soportado de serie). Para suelos enormes usa `mezclaSuelo`.

## Notas de integración

- Funcionan con `scene.environment` + ACES; los metales dependen del entorno (sin él se ven oscuros). `envMapIntensity` por defecto 1–1,6.
- `agua`, `cristal` y `cristal_rascacielos` son transparentes/reflectantes: `agua` y `cristal` usan `transparent: true` (sin escribir profundidad).
- `agua` (normales dobles animadas), `neon` (parpadeo) y `pantalla` (líneas y barrido) se animan solos: no requieren llamar a nada por cuadro.
- Textura ORMH compartida: un solo muestreo en shader. Mipmaps propios para normal/ORM con corrección de Toksvig (el relieve no «hierve» a distancia).
- Coste de generación (en el hilo principal, una vez por material y sesión): suelos 1024 px ≈ 0,6–1,5 s; resto 512 px ≈ 0,2–0,5 s. Usa
  `precargar()` en la pantalla de carga o `configurar({ calidad: 'media' })` (suelos a 512 px, ~4× más rápido).
- Materiales físicos: `acero_pintado` y `casco_nave` (clearcoat), `acero_cepillado` (anisotropía), `madera_lacada` (laca), `agua`, `cristal`.
- Unidades: `info(nombre).escala` es el lado del mosaico en metros (a 25 m de cámara basta con 2–3 mosaicos por unidad de pantalla).

## Catálogo

### Suelos

| Nombre | Mosaico | Tamaño | Descripción |
|---|---|---|---|
| `adoquin` | 1.6 m | 1024 | Adoquín de granito en hiladas, juntas con tierra y musgo, desgaste pulido en las caras. |
| `empedrado` | 2.2 m | 1024 | Empedrado de cantos rodados irregulares con tierra entre las piedras. |
| `tierra` | 2.5 m | 1024 | Tierra apisonada y seca con guijarros, terrones y marcas de rodadura. |
| `barro` | 3 m | 1024 | Barro oscuro con rodadas y charcos que reflejan el cielo. |
| `hierba` | 2 m | 1024 | Césped vista cenital: hojas individuales, matas secas, tréboles y tierra asomando. |
| `arena` | 3 m | 1024 | Arena y polvo con rizos de viento, granos brillantes y algún guijarro. |
| `tablones` | 2 m | 1024 | Tablones de madera clavados, con veta, nudos, juntas oscuras y desgaste de uso. |
| `gravilla_via` | 2 m | 1024 | Balasto de vía: piedra machacada angulosa de varios tamaños. |
| `asfalto_seco` | 2.4 m | 1024 | Asfalto de carretera: árido a la vista, grietas finas, juntas de parcheo y manchas de aceite. |
| `asfalto_mojado` | 2.4 m | 1024 | Asfalto empapado: oscuro y brillante, con charcos planos que reflejan neones y cielo. |
| `hormigon` | 2.4 m | 1024 | Losa de hormigón con juntas de dilatación, poros, grietas finas y manchas de humedad. |
| `losas_acera` | 2.4 m | 1024 | Losas de acera cuadradas con esquinas desportilladas, chicles, musgo en las juntas. |
| `baldosa_hospital` | 2.4 m | 1024 | Baldosa clínica brillante de gres claro, junta fina gris, marcas de fregado y roces. |
| `placa_antideslizante` | 1.6 m | 1024 | Chapa de acero estriada con rombos alternos, pintura saltada y suciedad en las ranuras. Admite color. |
| `rejilla` | 1.6 m | 1024 | Rejilla metálica industrial de pletinas cruzadas sobre un fondo profundo; admite color. |
| `composite_futurista` | 2.4 m | 1024 | Paneles de composite negro pulido con juntas luminosas. `color` = color del neón. |

### Muros

| Nombre | Mosaico | Tamaño | Descripción |
|---|---|---|---|
| `ladrillo_rojo` | 1.2 m | 512 | Muro de ladrillo cocido: tonos rojos y quemados, mortero rehundido, hollín y eflorescencias. |
| `ladrillo_encalado` | 1.2 m | 512 | Ladrillo encalado: cal blanca (admite color) saltada en las aristas, dejando ver el ladrillo. |
| `silleria` | 2.4 m | 512 | Sillería de piedra caliza en hiladas desiguales: cincelado, juntas finas, liquen y manchas de lluvia. |
| `estuco_desconchado` | 2 m | 512 | Enlucido liso (admite color) con grandes desconchones que dejan ver ladrillo, grietas y manchas de humedad. |
| `tablas_pintadas` | 2 m | 512 | Revestimiento de tablas verticales pintadas (admite color), con pintura saltada que deja ver la madera gris. |
| `tablas_viejas` | 2 m | 512 | Tablas de madera curtida por la intemperie: gris plata, grietas largas, nudos y clavos oxidados. |
| `troncos` | 1.6 m | 512 | Muro de troncos apilados: perfil cilíndrico, corteza fisurada, musgo y hendiduras entre rollizos. |
| `chapa_ondulada` | 1.6 m | 512 | Chapa ondulada galvanizada o pintada (admite color), con óxido, golpes, tornillos y churretes de suciedad. |
| `hormigon_bunker` | 2.4 m | 512 | Hormigón de encofrado en búnker: paneles marcados, orificios de atirantado, poros, óxido de armadura y manchas. |
| `panel_prefabricado` | 3 m | 512 | Fachada de paneles de hormigón prefabricado (admite color), con juntas selladas y manchas de lluvia. |
| `cristal_rascacielos` | 4 m | 512 | Muro cortina de cristal de rascacielos (admite color): paños reflectantes, montantes de aluminio y ventanas encendidas (usa `emisivo` para la noche). |
| `panel_futurista` | 2.4 m | 512 | Blindaje de paneles cerámicos blancos con placas hundidas, ventilaciones y líneas luminosas. `color` = color del neón. |

### Cubiertas

| Nombre | Mosaico | Tamaño | Descripción |
|---|---|---|---|
| `teja_arabe` | 1.6 m | 512 | Cubierta de teja árabe de barro: canales y cobijas semicilíndricas, solapes sombreados, líquenes y hollín. |
| `pizarra` | 1.4 m | 512 | Tejado de pizarra azulada en hiladas solapadas, con lajas desportilladas, rotas y manchas de musgo. |
| `paja` | 1.6 m | 512 | Tejado de paja trenzada: miles de tallos dorados y pardos, hileras atadas y manchas de humedad. |
| `tela_asfaltica` | 2 m | 512 | Lámina asfáltica negra con gránulo mineral, solapes, burbujas, parches de alquitrán y charcos de agua sucia. |

### Metales

| Nombre | Mosaico | Tamaño | Descripción |
|---|---|---|---|
| `hierro_forjado` | 1 m | 512 | Hierro forjado negro martilleado: golpes de fragua, cascarilla, brillo en los cantos y motas de óxido. |
| `hierro_oxidado` | 1.2 m | 512 | Chapa de hierro oxidada: restos de pintura verdosa, costra parda y naranja, picaduras, escamas y metal desnudo. |
| `acero_pintado` | 1.6 m | 512 | Planchas de acero pintadas (el color se elige con `color`), remachadas, con desconchones hasta el metal y óxido en los cantos. |
| `laton_bronce` | 1 m | 512 | Latón y bronce envejecidos: dorado cálido, martilleado suave, arañazos y pátina verdosa en las hendiduras. |
| `cromo` | 1 m | 512 | Cromado espejo con huellas, micro-arañazos y motas de picadura; vive del reflejo del entorno. |
| `acero_cepillado` | 1.2 m | 512 | Acero inoxidable cepillado en una dirección, con reflejo anisótropo, planchas atornilladas y marcas de uso. |
| `casco_nave` | 2.4 m | 512 | Casco de nave espacial: placas de tamaños desiguales, remaches, tuberías hundidas, quemaduras y luces de posición. `color` pinta el blindaje. |

### Otros

| Nombre | Mosaico | Tamaño | Descripción |
|---|---|---|---|
| `saco_arena` | 1.6 m | 512 | Sacos de arena de arpillera: trama gruesa, abultados, con costura, polvo y descosidos. |
| `lona` | 1.2 m | 512 | Lona de algodón encerado (admite color): trama fina, pliegues suaves, manchas y ojetes. |
| `cuero` | 0.8 m | 512 | Cuero curtido (admite color): poro granulado, arrugas, rozaduras que aclaran los bordes y brillo suave. |
| `tela` | 0.6 m | 512 | Tejido de lana o algodón en sarga (admite color), con motas, pelusa y desgaste en los pliegues. |
| `cuerda` | 0.8 m | 512 | Cuerda de cáñamo de tres cabos retorcidos, hilada en cordones horizontales, con fibras sueltas y suciedad. |
| `goma` | 1 m | 512 | Goma negra con tacos circulares antideslizantes (admite color), poro fino, desgaste y polvo. |
| `cristal` | 1 m | 512 | Vidrio transparente (admite color) con ligeras manchas, huellas y arañazos que dispersan el reflejo. |
| `agua` | 4 m | 512 | Agua en movimiento: oleaje suave con dos capas de normales animadas, reflejo especular y tinte verdoso (admite color). |
| `neon` | 1 m | 512 | Tubo de neón emisivo: núcleo blanco, halo de color (`color`), parpadeo sutil. Úsalo con bloom. |
| `pantalla` | 1 m | 512 | Pantalla/holograma: interfaz de rejilla, gráficas y bloques de texto con líneas de barrido animadas (`color` = tono). |
| `rayas_peligro` | 1 m | 512 | Franjas diagonales amarillas y negras de señalización, con pintura gastada, golpes y óxido. |
| `madera_lacada` | 1.2 m | 512 | Madera noble lacada con barniz brillante (admite color): veta fina, paneles con junta y reflejo de laca. |
| `marmol` | 1.6 m | 512 | Mármol pulido (admite color): fondo lechoso con nubes, vetas grises y doradas finas y fluidas, mucho brillo. |
| `yeso` | 2 m | 512 | Yeso o escayola (admite color): enlucido a la llana con remolinos suaves, pequeñas fisuras y roces. |
| `alfombra_roja` | 1.4 m | 512 | Alfombra de pelo corto (admite color): rojo profundo, dibujo de rombos tejido, pelo aplastado por el paso. |
| `nieve_ceniza` | 2.4 m | 512 | Nieve virgen o ceniza (con `color` gris oscuro): ondulaciones suaves, destellos de cristal y huellas leves. |


## Ejemplos por era

```js
// 1800 Villa de Santa Ceniza
materiales.obtener('empedrado'); materiales.obtener('estuco_desconchado', { color: 0xe9d8b0 }); materiales.obtener('teja_arabe');
materiales.obtener('tablones'); materiales.obtener('troncos'); materiales.obtener('paja'); materiales.obtener('hierro_forjado');
// 1850 Estación Cruz del Diablo
materiales.obtener('tierra'); materiales.obtener('tablas_viejas'); materiales.obtener('chapa_ondulada'); materiales.obtener('gravilla_via');
materiales.obtener('hierro_oxidado'); materiales.obtener('laton_bronce');
// 1900 Tierra de Nadie
materiales.obtener('barro'); materiales.obtener('saco_arena'); materiales.obtener('lona', { color: 0x6b6f4a }); materiales.obtener('hormigon_bunker');
// 1950 Avenida Neón
materiales.obtener('asfalto_mojado'); materiales.obtener('losas_acera'); materiales.obtener('cromo');
materiales.obtener('neon', { color: 0xff2fb5 }); materiales.obtener('neon', { color: 0x30f0ff }); materiales.obtener('tela_asfaltica');
// 2000 Zona de Cuarentena 7
materiales.obtener('baldosa_hospital'); materiales.obtener('panel_prefabricado'); materiales.obtener('rayas_peligro'); materiales.obtener('acero_cepillado');
// 2050 Megaurbe Aurora
materiales.obtener('composite_futurista', { color: 0x35e6ff }); materiales.obtener('panel_futurista', { color: 0xff3fd0 });
materiales.obtener('cristal_rascacielos', { emisivo: 1.5 }); materiales.obtener('casco_nave'); materiales.obtener('pantalla');
```

## Añadir un material

1. Crea un objeto en `catalogo/<grupo>.js`: `{ nombre, grupo, descripcion, tam (256/512/1024), escala (m), material: { macro:[valor,tono,rug], desgaste, tipo:'standard'|'physical', props, anim, colorEmisivo, colorBase, emisivo, transparente }, generar(c) }`.
2. En `generar(c)` rellena `c.alb` (sRGB, 3·N²), `c.tinte` (alfa de tinte), `c.h` (altura 0..1), `c.rug`, `c.met` y, si procede, `c.emision()`. Usa `c.fbm`, `c.worley`, `c.despiece`, `grietas`, `remaches`…
   de `texturas.js`: todo es periódico, así que el mosaico enlaza solo. La normal, la oclusión por cavidad y los mipmaps se calculan después.
3. Añádelo a `catalogo/index.js`.

## Página de pruebas

`pruebas/materiales.html` — todo el catálogo (esferas + losas con luz rasante). Parámetros: `?solo=nombre` (primer plano: suelo, muro y esfera),
`?grupo=suelos|muros|cubiertas|metales|otros`, `?desde=&hasta=`, `?calidad=media`, `?mojado=0.7`, `?desgaste=`, `?color=ff8800`, `?luz=azimut,elevación`,
`?cam=x,y,z,tx,ty,tz`, `?mezcla=adoquin,hierba`, `?t=segundos`, `?anim=1`.
