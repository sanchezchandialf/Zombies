# ERA Z — Arquitectura y contratos entre módulos

Este documento es el **contrato** entre los módulos del juego. Cada módulo tiene un dueño; nadie edita archivos
de otro módulo. Si necesitas algo que el contrato no cubre, **amplía tu propia API** y documéntalo al final de
tu informe; no cambies firmas existentes.

## 0. Reglas generales

- **Stack**: Three.js r170 (`import * as THREE from 'three'`, extras en `three/addons/...`), Vite, JavaScript ES2022 (módulos), sin TypeScript, sin más dependencias npm salvo aprobación expresa.
- **Sin recursos externos**: nada de imágenes, modelos, fuentes ni audio descargados. Todo es **procedural** (geometría por código, texturas por `<canvas>`/shaders, audio por WebAudio). El juego final debe funcionar sin red.
- **Idioma**: todo texto visible para el jugador en **español** (de España/neutro, con tildes y ñ correctas). Identificadores de dominio y comentarios en español.
- **Original**: el juego es una obra original del género «supervivencia cenital por oleadas». Prohibido imitar el nombre, personajes, arte o niveles de ningún juego existente. Nada de personajes con cabeza de caja.
- **Unidades**: 1 unidad = 1 metro. Suelo en `y = 0`. El juego ocurre en el plano **XZ**. Mapas centrados en el origen, ~90×90 m.
- **Orientación**: `rot` = giro en Y (rad). `rot = 0` mira a **+Z**; dirección = `(sin rot, cos rot)`; `objeto.rotation.y = rot`. Los modelos (personajes, armas, vehículos) se construyen mirando a **+Z**, con +Y arriba.
- **Cámara**: perspectiva cenital inclinada, mirando desde +Z/+Y hacia el jugador. En pantalla: arriba = −Z, derecha = +X.
- **Rendimiento objetivo**: 60 fps a 1080p en una GPU media con **150 zombis** en pantalla. Usa `InstancedMesh`, geometrías y materiales compartidos, fusiona geometría estática (`BufferGeometryUtils.mergeGeometries`), agrupa partículas. Nada de crear materiales/geometrías por entidad ni por cuadro. Nada de `new` en bucles calientes (reutiliza vectores temporales).
- **Sombras**: solo la luz principal (sol/luna) proyecta sombras. `castShadow`/`receiveShadow` en lo que importe.
- **Limpieza**: todo lo que crees debe poder destruirse (`limpiar()`/`liberar()`), liberando geometrías/texturas propias no compartidas.
- **Robustez**: usa encadenamiento opcional al llamar a otros sistemas (`juego.fx?.emitir?.(...)`) — pueden ser provisionales mientras se desarrolla en paralelo. Nunca lances excepciones por datos ausentes en bucles de cuadro.
- **Git**: los subagentes **no hacen commits ni tocan git**. No ejecutes `npm install` de paquetes nuevos. No mates el servidor de desarrollo.
- **Servidor de desarrollo compartido**: ya está corriendo en `http://127.0.0.1:5173/` (Vite, con recarga). No lances otro. Si no responde: `cd /home/user/zombies && (nohup npm run dev >/dev/null 2>&1 &)`.
- **Verificación visual obligatoria**: crea una página de prueba propia en `pruebas/<modulo>.html` (+ `pruebas/<modulo>.js`) que muestre tu trabajo aislado, captúrala con
  `node pruebas/captura.mjs http://127.0.0.1:5173/pruebas/<modulo>.html pruebas/capturas/<modulo>-x.png [--eval "..."] [--espera ms]`
  (la página debe poner `window.__lista = true` cuando esté lista) y **mira la imagen** con la herramienta Read. Itera hasta que el resultado sea excelente y sin errores de consola. El render por software es lento (1–5 fps): es normal; no midas rendimiento ahí.
- `pruebas/arnes.js` ofrece `crearArnes(opciones)`: monta un `Juego` con el render real, suelo y cámara orbital para páginas de prueba (ver cabecera del archivo).

## 1. Núcleo (ya implementado — `src/nucleo/`, no editar)

```js
import { Juego, PRIORIDAD } from './nucleo/juego.js';
import { CAPA, TODAS, MASCARA_BALA } from './nucleo/fisica.js';
import { limitar, mezclar, amortiguar, dist, dist2, difAngulo, girarHacia, dirDeRot, rotDeDir, crearRng, TAU } from './nucleo/util.js';
```

### `juego`
| Campo | Descripción |
|---|---|
| `juego.eventos` | Bus: `en(nombre, fn) → off`, `una(nombre, fn)`, `emitir(nombre, datos)` |
| `juego.fisica` | `MundoFisico` (ver abajo) |
| `juego.rng` | Azar determinista: `rng()`, `.rango(a,b)`, `.entero(a,b)`, `.elegir(lista)`, `.prob(p)`, `.signo()`, `.ponderado([[valor,peso],…])` |
| `juego.tiempo` | `{ ahora, dt, real, dtReal, escala, cuadro }` (s). `ahora` se detiene en pausa |
| `juego.estado` | `{ fase, pausado, dia, anio, eraIdx, zombisRestantes, zombisTotales, puntos, racha, multiplicador, bajas, dificultad, hora }` — **solo lo escribe el Director** |
| `juego.jugadores`, `juego.zombis` | Arrays de entidades vivas (los gestionan sus sistemas) |
| `juego.sistemas.X` / `juego.X` | Sistemas registrados: `render, entrada, fx, audio, personajes, combate, jugadores, zombis, vehiculos, mundo, escenarios, director, ui` |
| `juego.opciones` | Parámetros de la URL (`?rol=soldado&dia=11&auto=1&dios=1&semilla=7&calidad=alta&sinui=1`) |
| `juego.simulando` | `true` si la simulación avanza (fase jugando/intermedio/transicion y sin pausa) |
| `juego.pausar(bool)`, `juego.camaraLenta(escala, duracionReal)`, `juego.avanzar(dtReal)` | |

`estado.fase`: `'menu' | 'jugando' | 'intermedio' | 'transicion' | 'victoria' | 'derrota'`.

### Sistemas
Cada sistema es `crearX(juego) → objeto` con métodos opcionales `iniciar()`, `actualizar(dt)`, `posFisica(dt)`,
`redimensionar(w,h)` y la bandera `siempre: true` (se actualiza también en pausa/menú, con `dt = 0`).
Orden por cuadro (`PRIORIDAD`): entrada(10) → jugadores(20) → zombis(30) → vehiculos(40) → mundo(45) → combate(50) →
**física(60)** + `posFisica` de todos → escenarios(65) → director(70) → personajes(80) → fx(85) → audio(90) → ui(95) → render(100).

**Patrón de entidad**: antes de la física la lógica escribe `cuerpo.vx/vz`; en `posFisica` copia `cuerpo.x/z → ent.pos.x/z`
y coloca su visual (`ent.visual.colocar(x, z, rot)`).

### Física 2D (`juego.fisica`)
Cuerpos círculo o caja orientada en XZ. `masa: 0` = estático.

```js
const c = fisica.crearCuerpo({ forma:'circulo'|'caja', x, z, radio, hx, hz, rot, masa, capa, mascara,
  sensor, amortiguacion, rebote, rigidez, bloqueaBalas, bloqueaVision, datos: entidad, alColisionar(otro, nx, nz, solape, velRel) });
fisica.circuloEstatico(x, z, radio, extra?)      fisica.cajaEstatica(x, z, hx, hz, rot?, extra?)
fisica.eliminarCuerpo(c)                         c.impulso(ix, iz)   c.establecerMasa(m)
fisica.rayo(ox, oz, dx, dz, max, mascara=MASCARA_BALA, filtro?) → { cuerpo, x, z, nx, nz, dist } | null
fisica.rayoTodos(ox, oz, dx, dz, max, mascara, filtro?) → impactos ordenados
fisica.lineaLibre(x1, z1, x2, z2) → boolean      fisica.enCirculo(x, z, r, mascara, out=[]) → cuerpos
fisica.libre(x, z, r, mascara?) → boolean        fisica.impulsoRadial(x, z, radio, fuerza, mascara?)
fisica.limites = { minX, maxX, minZ, maxZ }      fisica.limpiar()
```
- `CAPA`: `ESTATICO, JUGADOR, ZOMBI, VEHICULO, PROP, ESTRUCTURA, SENSOR`. `cuerpo.datos` = entidad dueña.
- Masas orientativas: jugador 80, zombi 55–140, Mole 450, jefe 800–2500, barril 40, caja 30, vehículo 600–3000.
- Zombis: `rigidez: 0.6` para hordas fluidas. El dueño fija la velocidad cada cuadro; `amortiguacion` frena a los objetos sueltos.
- Los muros bajos/vallas que no detienen balas: `bloqueaBalas: false`.

### Interfaz **Dañable** (jugadores, zombis, jefes, vehículos, estructuras, props destructibles)
```js
ent.bando      // 'jugadores' | 'zombis' | 'neutral'
ent.vivo       // boolean
ent.pos        // THREE.Vector3 (y = 0)
ent.radio      // m
ent.material   // 'carne' | 'metal' | 'madera' | 'piedra' | 'energia'  (elige el FX de impacto)
ent.recibirDanio(info) → dañoRealAplicado
// info = { cantidad, tipo, atacante, arma, x, z, dirX, dirZ, empuje, critico }
//   tipo ∈ 'bala'|'perforante'|'explosivo'|'fuego'|'golpe'|'energia'|'veneno'|'acido'
```
El daño **siempre** pasa por `juego.combate.aplicarDanio(objetivo, info)` (aplica modificadores del atacante, fuego amigo, eventos y FX),
que llama a `objetivo.recibirDanio(info)` (resistencias propias, blindaje, muerte).

## 2. Datos (`src/datos/`)
- `eras.js`: `ERAS[6]` (`id, nombre, anios, escenario, armas{arquetipo→armaId}, vehiculo, emplazamiento, explosivo, torreta, jefe, interactivos, color`), `anioDeDia(dia)`, `eraDeDia(dia)`, `primerDiaDeEra(eraIdx)`, `esDiaDeJefe(dia)`, `DIA_FINAL=31`.
- `roles.js`: `ROLES{soldado, medico, ingeniero, cazador, demoledor}` con `vida, velocidad, equipo{primaria, secundaria, arrojadizas}, mods, pasiva, habilidad, virtudes, defectos, fuerteContra, debilContra, color`.
- `zombis.js`: `ZOMBIS{caminante, corredor, acorazado, escupidor, apestado, mole, aullador, detonador}` y `JEFES{coracero, fogonero, mariscal, rey_asfalto, paciente_cero, omega}`.
- `armas.js`: `ARMAS` (48 = 6 eras × 8 arquetipos). **Dueño: Combate** (puede ajustar cifras y añadir campos; no renombrar ids).
- El Director añade `mejoras.js` y `oleadas.js`.
Los ids de estos archivos son **estables**: úsalos como claves.

## 3. Eventos (`juego.eventos`)
| Evento | Emisor | Datos |
|---|---|---|
| `ui:jugar` | UI | `{ roles: [rolId,…], dia: 1, dificultad }` |
| `ui:elegirMejora` | UI | `{ indiceJugador, mejoraId }` |
| `ui:reiniciar`, `ui:menu`, `ui:saltarIntermedio` | UI | `{}` |
| `partida:inicio` | Director | `{ roles, dia }` |
| `oleada:inicio` | Director | `{ dia, anio, eraIdx, total, jefe: jefeId|null }` |
| `oleada:fin` | Director | `{ dia, anio }` |
| `intermedio:inicio` | Director | `{ dia, duracion, mejoras: [def,…] }` · `intermedio:fin` `{}` |
| `era:cambio` | Director | `{ eraIdx, era, anterior }` (tras cargar el nuevo escenario) |
| `partida:fin` | Director | `{ victoria, resumen: { dias, anio, puntos, bajas, tiempo, mejorRacha } }` |
| `escenario:cargado` | Escenarios | `{ eraIdx, mapa }` |
| `arma:disparo` | Combate | `{ portador, arma: def, origen: Vector3, rot }` |
| `arma:recarga` | Combate | `{ portador, arma: def, duracion }` · `arma:vacia` `{ portador, arma }` |
| `impacto` | Combate | `{ x, y, z, nx, nz, material, tipo, objetivo }` |
| `danio` | Combate | `{ objetivo, cantidad, tipo, critico, atacante, x, z }` |
| `explosion` | Combate | `{ x, z, radio, danio, tipo, atacante }` |
| `zombi:aparece` | Zombis | `{ zombi }` · `zombi:muerte` `{ zombi, info, atacante }` · `zombi:grito` `{ zombi }` |
| `jefe:aparece` | Zombis | `{ jefe }` · `jefe:muerte` `{ jefe }` |
| `jugador:danio` | Jugadores | `{ jugador, cantidad, tipo, dirX, dirZ }` · `jugador:muerte` · `jugador:caido` · `jugador:reanimado` `{ jugador }` |
| `jugador:habilidad` | Jugadores | `{ jugador, habilidad }` · `jugador:arma` `{ jugador, arma }` · `jugador:curado` `{ jugador, cantidad }` |
| `vehiculo:subir` / `vehiculo:bajar` | Vehículos | `{ vehiculo, jugador }` · `vehiculo:destruido` `{ vehiculo }` · `vehiculo:atropello` `{ vehiculo, objetivo, velocidad }` |
| `recogida` | Mundo | `{ jugador, tipo, cantidad }` · `estructura:creada` / `estructura:destruida` `{ estructura }` · `interactivo:usado` `{ objeto, jugador }` |
| `mensaje` | cualquiera | `{ texto, tipo: 'info'|'aviso'|'logro'|'jefe', duracion }` (la UI lo muestra) |
| `juego:pausa` | núcleo | `{ pausado }` |

## 4. Contratos por sistema

### §Render — `src/render/index.js` → `crearRender(juego)` (siempre:true)
```js
render.escena, render.camara, render.renderer
render.establecerAmbiente(eraIdx, opciones?)   // atmósfera completa de la era: cielo, niebla, luces, gradación de color, clima
render.establecerHora(h)                       // 0 amanecer · 0.25 mediodía · 0.5 atardecer · 0.75 medianoche (interpola suave)
render.seguir(objetivos)                       // [{ pos: Vector3 }, …] la cámara encuadra a todos; [] = cámara libre de menú
render.sacudir(fuerza 0..1, duracion s)        render.retroceso(dirX, dirZ, fuerza)    render.zoom(factor, duracion)
render.transicionEra(alMedio) → Promise        // efecto de salto temporal a pantalla completa; llama a alMedio() con la pantalla tapada
render.puntoEnSuelo(clientX, clientY, y=0, out?) → Vector3    // ratón → mundo
render.proyectar(pos, out?) → { x, y, visible }               // mundo → píxeles CSS
render.luzPuntual({ x, y, z, color, intensidad, distancia }) → { pos, color, intensidad, quitar() }   // luces locales agrupadas (máx. ~12, sin sombras)
render.calidad('baja'|'media'|'alta'|'ultra')
render.camaraMenu(activo)                      // vuelo cinematográfico lento sobre el escenario para el menú
render.camaraExterna = false                   // si es true (páginas de prueba), el render NO mueve la cámara
```
Subcarpeta `src/render/materiales/` (agente Materiales): `materiales.obtener(nombre, opciones?) → Material` compartido, `materiales.lista()`; catálogo documentado en `docs/MATERIALES.md`.

### §FX — `src/fx/index.js` → `crearFx(juego)`
```js
fx.emitir(nombre, pos{x,y,z}, opciones?)       // ráfaga puntual. opciones: { dirX, dirY, dirZ, escala, color, cantidad, rot }
fx.crearEmisor(nombre, pos, opciones?) → { pos, activo, escala, detener() }   // continuo (fuego, gas, vapor, humo)
fx.trazadora(desde, hasta, opciones?)          // { tipo:'bala'|'pulso'|'riel'|'aguja'|'arco'|'laser', color }
fx.calco(tipo, x, z, tam, opciones?)           // 'sangre'|'quemadura'|'acido'|'crater'|'aceite'|'huella' sobre el suelo, persistentes con límite
fx.escombros({ x, y, z, cantidad, material, fuerza, dirX, dirZ })   // trozos físicos (rebote, giro) 'madera'|'piedra'|'metal'|'carne'|'vidrio'
fx.destello(pos, color, intensidad, duracion, radio)               // fogonazo de luz
fx.limpiar()                                   // al cambiar de mapa
```
Nombres de `emitir` (mínimo): `fogonazo` (opciones.tipo: polvora|polvora_grande|moderno|moderno_grande|plasma|riel|electrico|cohete|onda),
`humo`, `sangre`, `sangre_grande`, `chispas`, `astillas`, `polvo`, `piedra`, `explosion`, `explosion_grande`, `fuego`, `gas_toxico`,
`acido`, `plasma`, `electrico`, `vapor`, `casquillo`, `curacion`, `onda`, `aparicion`, `salpicadura`, `singularidad`, `llama` (chorro de lanzallamas).
FX escucha `impacto` y `explosion` y emite por sí mismo el efecto adecuado según `material`/`tipo`.

### §Audio — `src/audio/index.js` → `crearAudio(juego)` (siempre:true)
```js
audio.desbloquear()                            // tras el primer gesto del usuario
audio.reproducir(nombre, { x, z, volumen, tono, variacion }?)   // posicional respecto a la cámara/jugador
audio.bucle(nombre, opciones?) → { detener(), ajustar({ volumen, tono, x, z }) }
audio.musica({ eraIdx, intensidad 0..1, modo: 'menu'|'combate'|'intermedio'|'jefe'|'derrota'|'victoria' })
audio.volumen(maestro, musica, efectos)
```
Audio escucha los eventos (`arma:disparo` usa `arma.sonido`, `explosion`, `zombi:*`, `jugador:*`, `oleada:*`, `era:cambio`…) y suena solo.

### §Personajes — `src/personajes/` (`index.js` ya delega)
- `jugadores.js` → `crearVisualesJugadores(juego)` = `{ crear(rolId, eraIdx) → Visual, actualizar(dt), limpiar() }`
- `zombis.js` → `crearVisualesZombis(juego)` = `{ crear(claseId, eraIdx, { semilla, elite }?) → Visual, crearJefe(jefeId) → Visual, actualizar(dt), limpiar() }`

```js
// Interfaz Visual (la usa la lógica de entidades; el visual NO contiene lógica de juego)
vis.altura                         // m (para barras/etiquetas)
vis.colocar(x, z, rot)             // cada cuadro
vis.mover(vx, vz)                  // velocidad real en mundo (m/s): elige quieto/andar/correr y el paso lateral respecto a rot
vis.accion(nombre, opciones?)      // animación puntual: 'disparar'|'recargar'|'lanzar'|'cuerpo'|'golpe'(recibe daño)|'habilidad'|'esquivar'
                                   // zombis: 'atacar'|'emerger'|'aturdir'|'gritar'|'escupir'|'cargar'|'golpe'   opciones: { duracion, dirX, dirZ }
vis.estado(nombre, activo)         // persistentes: 'caido' (jugador abatido), 'ardiendo', 'envenenado', 'ralentizado', 'invisible', 'furia', 'cargando'
vis.equipar(objeto3D|null)         // (jugadores) arma en las manos
vis.boca(out?) → Vector3           // (jugadores) posición mundo de la boca del arma
vis.vestir(eraIdx)                 // (jugadores) cambia el atuendo a la era
vis.destello(color?)               // parpadeo al recibir un impacto
vis.visible(bool)
vis.morir({ dirX, dirZ, fuerza, tipo })   // muerte física (cae, sale despedido, se desmiembra según tipo/fuerza); el cadáver persiste y se desvanece solo
vis.liberar()                      // retirar de inmediato
```

### §Arsenal — `src/armas/modelos.js`
```js
crearModeloArma(armaId) → THREE.Group        // cañón a +Z, empuñadura en el origen, +Y arriba. userData.boca: Vector3 local;
                                             // userData.manoIzq: Vector3 local opcional (agarre delantero); userData.doble: true si son dos armas
crearModeloTorreta(eraIdx) → Group           // userData.cabeza: Object3D que gira en Y para apuntar; userData.boca (local a cabeza)
crearModeloEmplazamiento(eraIdx) → Group     // arma fija tripulable; mismos userData; userData.asiento: Vector3 local donde se coloca el jugador
crearIconoArma(armaId, tam=128) → HTMLCanvasElement   // silueta para el HUD
```

### §Combate — `src/combate/index.js` → `crearCombate(juego)`
```js
// Armas
inst = combate.crearArma(armaId, portador?)   // { def, id, municion, reserva, recargando, progresoRecarga (0..1), enfriamiento, calor }
combate.actualizarArma(inst, dt, portador?)   // temporizadores de cadencia y recarga
combate.gatillo(portador, inst, origen: Vector3, rot, apretado, recienApretado) → boolean   // true si ha disparado este cuadro
combate.recargar(inst, portador?) → boolean
combate.golpear(portador, armaId, origen, rot) → boolean           // cuerpo a cuerpo (arco frontal)
combate.lanzar(portador, armaId, origen, destino{x,z})             // arrojadiza con parábola
// Daño
combate.aplicarDanio(objetivo, info) → number
combate.explotar({ x, z, radio, danio, tipo='explosivo', atacante, empuje, y? })
combate.crearZona({ x, z, radio, duracion, tipo:'fuego'|'gas'|'acido'|'curacion'|'gravedad', dps, atacante, afecta:'zombis'|'jugadores'|'todos' }) → { x, z, radio, activo, quitar() }
combate.proyectil({ x, y, z, dirX, dirZ, velocidad, alcance, danio, tipo, radio, radioExplosion, gravedad, atacante, bando, efecto, alImpactar }) → proyectil
combate.zonas   // lista de zonas activas (la IA las evita o las usa)
combate.limpiar()
```
- **Portador** (quien dispara: jugador, torreta, emplazamiento, vehículo): `{ bando, pos, mods?, visual? }`. `mods` = multiplicadores `{ danio, cadencia, recarga, dispersion, explosivos, cuerpo, critico, danioCritico, municionInfinita }`.
- Fuego amigo: las balas de jugadores no dañan a jugadores ni a sus estructuras/vehículos; sus explosiones les hacen el 35 %. Las explosiones de zombis dañan a todos.

### §Entrada — `src/nucleo/entrada.js` → `crearEntrada(juego)` (siempre:true) — dueño: agente Jugadores
```js
entrada.de(indiceJugador) → intencion   // ver intencionVacia() en el archivo; siempre devuelve un objeto válido
entrada.vibrar(indice, fuerza, duracion)
entrada.dispositivo(indice) → 'teclado' | 'mando'
```
Controles J1: **WASD** mover · **ratón** apuntar · **clic izq.** disparar · **clic der. / F** cuerpo a cuerpo · **R** recargar ·
**E** usar/montar/reparar (mantener) · **Q** habilidad · **G** arrojadiza · **1/2/rueda** cambiar arma · **Espacio** esquivar · **Esc/P** pausa.
Mando (J1 o J2): stick izq. mover, stick der. apuntar, RT disparar, RB cuerpo a cuerpo, X recargar, A esquivar, Y cambiar, B usar, LB habilidad, LT arrojadiza, Start pausa.

### §Jugadores — `src/entidades/jugadores.js` → `crearJugadores(juego)`
```js
jugadores.crear(indice, rolId, x, z) → jugador      // lo añade a juego.jugadores
jugadores.limpiar()
jugadores.alCambiarEra(eraIdx)                      // reequipa armas y atuendo de la nueva era, rellena munición
jugadores.reanimarTodos()                           // al acabar una oleada
// jugador (Dañable, bando 'jugadores', material 'carne')
jugador.indice, .rol (def), .pos, .rot, .cuerpo, .visual, .vida, .vidaMax, .vivo, .caido, .mods (copia mutable de rol.mods + mejoras)
jugador.armas [inst, inst], .armaIdx, .arma (inst actual), .arrojadizas, .arrojadizasMax
jugador.habilidad { def, restante (s de enfriamiento), activa (bool), tiempoActiva }
jugador.vehiculo (null | vehículo que conduce), .emplazamiento (null | objeto)
jugador.invisible (bool: los zombis lo ignoran), .silenciado (s restantes sin habilidad)
jugador.curar(cantidad), .darMunicion(fraccion 0..1), .darArrojadizas(n), .aplicarEstado(nombre, duracion, datos?), .tieneEstado(nombre)
jugador.aplicarMejora(def)                          // def.aplicar(jugador) lo define el Director
jugador.teletransportar(x, z)
```
En cooperativo un jugador sin vida queda `caido` (reanimable por un compañero manteniendo E) ; en solitario muere.
El jugador llama a `mundo.interactivoCercano(j)`/`usar`, `combate.gatillo/recargar/golpear/lanzar`, `mundo.desplegarTorreta(j)` (habilidad del Ingeniero).

### §Zombis — `src/entidades/zombis.js` (+ `src/ia/`) → `crearZombis(juego)`
```js
zombis.generar(claseId, x, z, { eraIdx, elite, emerger=true, vida? }?) → zombi   // lo añade a juego.zombis
zombis.generarJefe(jefeId, x, z) → jefe                                          // también en juego.zombis, con zombi.esJefe = true
zombis.atraer(x, z, radio, duracion)             // señuelo de ruido (campana, alarma): los zombis en radio van hacia allí
zombis.navegacion.reconstruir()                  // tras cargar un escenario o crear/destruir estructuras
zombis.navegacion.direccion(x, z, out) → {x,z}   // dirección de campo de flujo hacia el objetivo más cercano
zombis.limpiar()
// zombi (Dañable, bando 'zombis', material 'carne' o 'metal' si acorazado de frente)
zombi.clase (def), .pos, .rot, .cuerpo, .visual, .vida, .vidaMax, .vivo, .esJefe, .elite, .objetivo
zombi.aturdir(s), .ralentizar(factor, s), .incendiar(s, dps, atacante), .empujar(ix, iz)
```
Objetivos de los zombis: jugadores vivos no invisibles (si conducen, el vehículo), estructuras que bloquean el paso y señuelos.

### §Vehículos — `src/vehiculos/index.js` → `crearVehiculos(juego)`
```js
vehiculos.crear(vehiculoId, { x, z, rot }) → vehiculo    // ids: caballo, locomovil, autoblindado, muscle_car, blindado_tactico, aerodeslizador
vehiculos.lista, vehiculos.limpiar()
// vehiculo (Dañable, bando 'neutral' vacío / 'jugadores' con conductor, material 'metal' — el caballo 'carne')
vehiculo.def, .pos, .rot, .cuerpo, .vida, .vidaMax, .vivo, .conductor, .velocidad (m/s con signo), .combustible (0..1)
vehiculo.subir(jugador) → boolean, .bajar(), .reparar(cantidad)
```
Se registran en `mundo.registrarInteractivo` para montarse con **E**. Conducción con la intención del conductor (WASD; el arma montada apunta con el ratón).

### §Mundo — `src/mundo/index.js` → `crearMundo(juego)`
```js
mundo.crear(tipo, { x, z, rot, eraIdx, ...opciones }) → objeto
//  tipos: 'explosivo' (barril/bidón/célula de la era) · 'caja' (destructible, suelta botín) · 'empujable' · 'emplazamiento' (arma fija tripulable de la era)
//         'botiquin' · 'municion' · 'potenciador' · y los interactivos de era listados en ERAS[i].interactivos (p. ej. 'campana_iglesia', 'palanca_tren', 'valla_electrica', 'torre_tesla')
mundo.registrarInteractivo({ pos, radioUso, etiqueta, puedeUsar(jugador)?, usar(jugador), mantener?: s }) → obj
mundo.quitarInteractivo(obj)        mundo.interactivoCercano(jugador) → obj | null
mundo.soltarBotin(x, z, { suerte }?)                // posible recogida al morir un zombi
mundo.desplegarTorreta(jugador) → estructura        mundo.desplegarBarricada(jugador) → estructura
mundo.estructuras (lista de Dañables: torretas, barricadas, emplazamientos)     mundo.objetos
mundo.limpiar()
```

### §Escenarios — `src/escenarios/index.js` → `crearEscenarios(juego)` + un módulo por mapa
```js
escenarios.cargar(eraIdx) → Promise<mapa>     // destruye el anterior (grupo, física, mundo.limpiar(), vehiculos.limpiar(), fx.limpiar()), construye, ambienta y reconstruye la navegación
escenarios.actual                             // { id, eraIdx, grupo, limites, inicioJugadores[{x,z}], puntosAparicion[{x,z,tipo}], zonas? }
escenarios.puntoAparicion(lejosDe?: [{x,z}], distMin=18) → { x, z, tipo }
```
Cada mapa: `src/escenarios/<id>.js` → `export function construir(juego, kit) → { grupo, limites, inicioJugadores, puntosAparicion, actualizar?(dt), destruir?() }`.
`kit` (`src/escenarios/kit.js`) ofrece utilidades de construcción (colisionadores, fusión, instancias, dispersión).

### §Director — `src/oleadas/index.js` → `crearDirector(juego)`
```js
director.iniciarPartida({ roles: [rolId,…], dia = 1, dificultad = 'normal' })
director.terminarPartida()        director.siguienteOleada()        director.saltarA(dia)   // depuración
```
Escribe `juego.estado`, compone las oleadas (qué clases, cuántas, a qué ritmo, jefe), gestiona la puntuación y la racha,
el intermedio con mejoras, el ciclo día/noche (`render.establecerHora`), el avance del calendario y los cambios de era
(`render.transicionEra(() => escenarios.cargar(e))`, `jugadores.alCambiarEra(e)`, evento `era:cambio`). Con `?auto=1` inicia la partida sin menú.

### §UI — `src/ui/index.js` → `crearUI(juego)` (siempre:true)
HTML/CSS superpuesto al lienzo (dentro de `juego.contenedor`). Lee `juego.estado`/`juego.jugadores` y escucha eventos. `ui.mensaje(texto, opciones)`.
Con `?sinui=1` no muestra nada (capturas limpias).
