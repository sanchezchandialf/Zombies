# ERA Z · Guía para autores de escenarios

Módulo: `src/escenarios/` · Gestor: `index.js` · Kit: `kit.js` (+ `lib/`) · Ejemplo de referencia: `campo_pruebas.js`
Prueba visual: `http://127.0.0.1:5173/pruebas/escenarios.html?era=N` (ver «Probar tu mapa»).

Cada era tiene un mapa en `src/escenarios/<ERAS[i].escenario>.js` (`villa_colonial`, `estacion_fronteriza`, `tierra_de_nadie`,
`suburbio_neon`, `zona_cuarentena`, `megaurbe_aurora`). Si el archivo no existe o falla, el gestor carga `campo_pruebas`.
**Copia `campo_pruebas.js` como punto de partida.**

## 1. Contrato de `construir`

```js
export async function construir(juego, kit) {          // puede ser async
  await kit.precargar(['adoquin', 'hierba', …]);        // los suelos tardan ~1 s cada uno: hazlo primero
  kit.suelo({ … }); kit.edificio({ … }); …
  return {
    grupo: kit.grupo,                                   // opcional (por defecto kit.grupo)
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x, z }, { x, z }],              // 2 puntos libres y conectados
    puntosAparicion: [{ x, z, tipo: 'borde' | 'interior', peso? }, …],
    zonas: [{ id, x, z, r }],                           // opcional
    actualizar(dt) {},                                  // opcional: animaciones del mapa
    destruir() {},                                      // opcional: solo para lo que NO creaste con el kit
  };
}
```
El gestor: destruye el mapa anterior (`fisica.limpiar()`, `mundo/vehiculos/fx/combate.limpiar()`), construye, cierra los lotes
(`kit.cerrar()`), añade el grupo a la escena, fija `fisica.limites`, crea muros invisibles fuera de los límites,
`render.establecerAmbiente(eraIdx)`, valida, reconstruye la navegación y emite `escenario:cargado`.
Todo lo creado con el kit (cuerpos, luces, materiales propios, geometrías) se libera solo. En `construir` puedes llamar a
`juego.mundo?.crear?.(…)` y `juego.vehiculos?.crear?.(…)` (encadenamiento opcional: pueden no existir aún).

Convenciones: 1 u = 1 m, suelo en y=0, plano XZ, `rot=0` mira a +Z, cámara desde +Z mirando al norte (−Z arriba en pantalla).
`kit.eraIdx` es la era; `kit.rng(semilla)` da azar determinista; `kit.juego` el juego.

## 2. Referencia del kit

### Colisión (todo estático; se registra en `kit` y se descarta solo)
| Llamada | Descripción |
|---|---|
| `kit.muro(x, z, largo, ancho, rot=0, {bloqueaBalas, nombre, material})` | Caja: `largo` a lo largo de X local, `ancho` de Z local. |
| `kit.caja(x, z, hx, hz, rot, o)` | Igual con semiejes. |
| `kit.muroEntre([x1,z1], [x2,z2], grosor, o)` | Muro entre dos puntos. |
| `kit.pilar(x, z, radio, o)` | Círculo (árbol, poste, columna). |
| `kit.vallaBaja(x, z, largo, rot, {ancho})` | Detiene a zombis y jugadores, **no** a balas ni a la vista. |
| `kit.colisionDesdeMalla(obj, {modo:'caja'\|'cajas'\|'circulo', margen})` | Colisión a partir de una malla/grupo ya colocado (orientada). También `{geometria, x, z, rot, esc}`. |
| `kit.libre(x, z, r)` | ¿Sitio libre de estáticos? |

Convención de giro de los cuerpos = `rotation.y` de Three. Las piezas del kit registran su colisión solas: edificio (caja), valla
(baja o alta), poste/farola/árbol/roca (pilar), bloque (caja).

### Geometría por lotes
```js
const l = kit.lote('mi_zona');                    // una malla fusionada por material, con sombras
l.caja(kit.mat('ladrillo_rojo'), cx, cy, cz, w, h, d, { rotY, radio: 0.04 });   // caja biselada centrada
l.cajaBase(mat, cx, y0, cz, w, h, d);              // con la cara inferior en y0
l.anadir(geometria, material, matriz?, { uv: true | 'nombre_material' | metros | false });
```
`kit.lote0` es el lote principal (lo usan edificios, vallas, farolas…). Las UV se generan **en espacio de mundo** según
`material.name` (`uvMundo`), así los mosaicos de piezas contiguas coinciden. Los lotes se construyen en `kit.cerrar()`.
Geometría: `kit.cajaRedondeada(w,h,d,radio,seg)` (cacheada: clónala), `kit.cilindro(rAbajo,rArriba,alto,seg,bisel)`,
`kit.torno([[r,y],…],seg)`, `kit.extruir([[x,z],…], alto, {bisel, huecos})`, `kit.disco(r, alto)`, `kit.matriz(x,y,z,rotY,rotX,rotZ,esc)`,
`kit.tejadoDosAguas / tejadoCuatroAguas`.

### Instancias y dispersión
```js
kit.instancias(geo, material, [{ x, y, z, rot, esc: 1 | [sx,sy,sz], color }], { sombras })   // color por instancia
const pts = kit.dispersar({ area: {x0,z0,x1,z1} | {x,z,r} | {poligono}, cantidad: 12, distMin: 6, libre: 1.2,
  evitar: [{x,z,r}, {x,z,hx,hz,rot,margen}, {rect:[x0,z0,x1,z1]}], semilla: 3, fn: (p, i, rng) => … });  // → [{x,z,rot,esc,u}]
```

### Suelo
```js
kit.suelo({ tam: 160, material: 'tierra', mezcla: 'hierba', mojado: 0.3, contraste: 1.9,
  relieve: { amp: 0.06, escala: 16, centroPlano: 55 },       // o función (x,z)→y; kit.altura(x,z) devuelve la altura
  pintura: (p) => { p.fondo(0); p.circulo(x,z,r,v,suave); p.rect(x0,z0,x1,z1,v,suave); p.poligono(pts,v,suave);
                    p.camino(pts, ancho, v, suave); p.salpicar(x0,z0,x1,z1,n,rMin,rMax,v); p.romper(escala, amp); } });
```
`tam` cubre todo (arena + periferia; 160 por defecto). La mezcla de dos suelos se pinta con una máscara en coordenadas de mundo
(0 = `material`, 1 = `mezcla`) y se rompe con ruido, así los límites son orgánicos. Para más de dos suelos o superficies elevadas:
`kit.zona({ circulo:{x,z,r} | rect:[x0,z0,x1,z1] | poligono, material, alto: 0.025, borde:{material, ancho, alto} })`.

Parches sin z-fighting (decals con altura sobre el suelo y `polygonOffset`):
`kit.parche({ tipo: 'charco'|'mancha'|'hojas', x, z, radio, rot, alargado, color, opacidad, cantidad (hojas), capa })` y
`kit.parches({ tipo, area, cantidad, radio: [min,max], evitar, color, opacidad })` (reparte con `dispersar`). Los charcos reflejan el entorno.

### Arquitectura
```js
const casa = kit.edificio({
  x, z, ancho: 14, fondo: 9, pisos: 2, alto?, rot: 0,                   // cara «sur» = +Z (la que ve la cámara)
  estilo: 'colonial'|'encalado'|'piedra'|'madera'|'ladrillo'|'industrial'|'bunker'|'prefabricado'|'cristal'|'futurista',
  muro: 'estuco_desconchado', colorMuro, zocalo: 'silleria', esquinas: 'silleria'|null, cornisa: true,
  tejado: { tipo: 'dos_aguas'|'cuatro_aguas'|'plano', material: 'teja_arabe', color, alero: 0.5, pendiente: 0.5, eje: 'x'|'z', chimenea: true|{x,z,alto}, equipos },
  ventanas: false | { ancho: 1.1, alto: 1.5, sep: 3.3, luz: 0.5 /*prob. encendidas*/, marcoColor, postigos, rejas, arco },
  puertas: [{ cara: 'sur', u: 0, ancho: 1.5, alto: 2.4, arco, escalones: 2, material, color }],
  balcon: { ancho, u, fondo }, falsaFachada: { alto }, luzPuertas: true, colorLuz: 0xffbf6b,
  caras: { norte: { ventanas: false } }, colision: true, nombre,
});
// → { puertas:[{x,z,rot,cara}], ventanas:[…], techoY, cuerpo, aMundo(lx,lz), x, z, ancho, fondo, alto }
```
Genera zócalo, esquinas, cornisas, marcos con relieve, dinteles, alféizares, postigos, cristales (encendidos = emisivos, apagados = reflectantes),
alero, fascias, cumbrera y chimenea; fusiona todo en el lote principal y crea la colisión. Usa `aMundo` y `puertas` para situar
apariciones interiores, farolas de puerta, etc. `kit.ESTILOS` lista los presets (las opciones del autor los sobrescriben).

Mobiliario urbano:
`kit.valla({ puntos:[[x,z],…], tipo:'madera'|'tablas'|'hierro'|'cadena'|'alambre'|'barrera', alto, colision:'baja'|'alta'|false, cerrada })` ·
`kit.poste({x,z,alto,tipo:'madera'|'hormigon'|'metal'})` (devuelve `puntaY`) ·
`kit.catenaria({desde:[x,y,z], hasta:[x,y,z], caida})` ·
`kit.farola({x,z,tipo:'aceite'|'gas'|'sodio'|'electrica'|'led'|'sintetica', rot, luz:true, intensidad, distancia, color})` ·
`kit.escalera({x,z,rot,ancho,peldanos,alto,barandilla})` (no bloquea) ·
`kit.bloque({x,z,ancho,fondo,alto,rot,material})` (volumen con colisión) · `kit.roca({x,z,radio})` · `kit.arbol({x,z,tipo:'roble'|'pino'|'muerto',escala})`.

### Luces y materiales propios
`kit.luz({x,y,z,color,intensidad,distancia})` → `render.luzPuntual` registrada para limpieza (candelas: farol de aceite ≈ 16, farola eléctrica ≈ 34,
foco ≈ 60–120). `kit.emisivo(color, intensidad)` (neones, bombillas, pantallas simples), `kit.vidrio(encendido, color)`,
`kit.mat(nombre, opciones)` = `materiales.obtener` (ver `docs/MATERIALES.md`).

### Depuración
`?depurar=colision` dibuja todos los colisionadores: rojo = bloquea balas, amarillo = valla baja, azul = muros invisibles.
`mapa.validacion` (y avisos `[escenarios] …` por consola) informa de: inicios libres, puntos de aparición conectados con el inicio
(inundación sobre rejilla de 1 m), accesibles con pasillos de 3,6 m (jefes), bolsas aisladas, nº de colisionadores, mallas y luces.

## 3. Presupuesto
- ≤ ~250 draw calls: el kit funde por material (un mapa típico ≈ 30–60 mallas); no crees mallas sueltas por objeto.
- ≤ ~400 colisionadores: una pared larga = una caja; no pongas un círculo por cada piedra decorativa (solo las que estorban).
- ≤ 10 luces locales (`kit.luz`; el render reparte ~12 entre todo). Muchos emisivos, pocas luces reales.
- Materiales: usa los 55 del catálogo; precarga la lista al empezar. Sin texturas ni recursos externos.

## 4. Reglas de diseño
1. **Arena ~90×90 m** (límites ±45), centro **abierto** (plaza/cruce) donde empiezan los jugadores.
2. **3–5 edificios u obstáculos grandes** que formen calles y cuellos de botella **≥ 4 m**; jefes y vehículos necesitan **≥ 3,6 m** de paso.
   **Sin callejones sin salida** ni bolsas cerradas (la validación avisa).
3. **10–16 puntos de aparición**: la mayoría en los bordes (separados), más algunos interiores temáticos (puerta de una casa, compuerta, alcantarilla).
4. **Jugabilidad**: 1–2 vehículos (`ERAS[i].vehiculo`), 1–2 emplazamientos, 6–12 explosivos, 6–10 cajas y los interactivos de la era
   (`ERAS[i].interactivos`), repartidos con `dispersar` evitando el centro y los edificios.
5. **Composición para la cámara** (55°, mirando al norte, ~26 m): las fachadas visibles miran al **sur**; los tejados importan (se ven
   mucho): dales material y color; **nada alto en el borde sur** (taparía el campo); lo alto va al norte y a los flancos. En pantalla caben
   ~29 m de ancho: los detalles de 10–30 cm definen la calidad; aprovecha parches, hojas, charcos, grietas y mobiliario.
6. **Sangre legible**: el suelo no debe ser rojizo ni muy saturado; prefiere tierras pardas, grises, verdes apagados y asfaltos oscuros,
   con contraste medio. La sangre/quemaduras (`fx.calco`) son oscuras y rojas: sobre un suelo claro-neutro destacan.
7. **Suelo vivo** (60 % de la pantalla): mezcla dos materiales con `pintura`, añade zonas elevadas, charcos, manchas, hojas; evita suelos de un solo tono.
8. **Era**: usa los materiales y la luz de `docs/ARTE.md §5` (cálidos con niebla azul en 1800, polvo naranja en 1850, verdes desaturados en 1900, neón sobre asfalto mojado en 1950, azul clínico en 2000, magenta/cian en 2050).
9. Los bordes del mapa deben parecer continuar (periferia pintada, árboles, edificios al fondo): el suelo del kit mide 160 m.

## 5. Probar tu mapa
`http://127.0.0.1:5173/pruebas/escenarios.html?era=N` con parámetros opcionales: `vista=juego|alta|cenit|oblicua`, `cx`, `cz` (centro de cámara),
`dist`, `hora=0.25`, `calidad=media`, `sinclima=1`, `depurar=colision`, `figuras=0`, `spawns=1` (figuras rojas en las apariciones). Captura:
```
node pruebas/captura.mjs "http://127.0.0.1:5173/pruebas/escenarios.html?era=0&sinui=1&calidad=media&hora=0.25&sinclima=1&cx=-24&cz=-16" pruebas/capturas/x.png --ancho 960 --alto 540 --espera 3000
```
`window.__info` / `window.mapa.validacion` dan métricas. La generación de materiales por software tarda 20–40 s: espera. Las capturas
grandes pueden agotar el tiempo con render por software: usa ≤ 960×540 y una captura a la vez.

## 6. Lista de comprobación final
- [ ] `mapa.validacion.avisos` vacío (inicios libres, apariciones conectadas, jefes ≥ 3,6 m, sin bolsas, ≤ 400 colisionadores).
- [ ] Vista de juego y `vista=alta` revisadas: centro abierto, cuellos ≥ 4 m, fachadas al sur, nada alto en el borde sur.
- [ ] `?depurar=colision`: la colisión coincide con lo visible; vallas bajas en amarillo.
- [ ] Sin z-fighting en parches/zonas; sin costuras ni texturas estiradas.
- [ ] Suelo con ≥ 2 materiales mezclados, parches y detalles; no rojizo.
- [ ] 10–16 apariciones, 1–2 vehículos, 1–2 emplazamientos, 6–12 explosivos, 6–10 cajas, interactivos de la era.
- [ ] ≤ 250 mallas, ≤ 10 luces; carga completa sin errores de consola; `npx vite build` compila.
