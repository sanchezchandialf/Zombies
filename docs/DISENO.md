# ERA Z — Documento de diseño

**ERA Z** es un juego original de supervivencia por oleadas con cámara cenital inclinada, hecho en Three.js y en español.
Una escuadra resiste a una plaga de muertos vivientes que dura tres siglos: **de 1800 a 2100**.

## Pilares
1. **Tres siglos en una partida.** Cada oleada es un **día**; al sobrevivir, el calendario salta **10 años**. Cada 5 días cambia la **era**: escenario, armas, equipo, vehículo, atuendos, zombis y música se adaptan a la época.
2. **Roles con virtudes y defectos.** Cinco roles asimétricos. Cada rol domina a unas clases de zombi y es contrarrestado por otras.
3. **El escenario es un arma.** Vehículos, emplazamientos, explosivos, trampas y señuelos propios de cada época.
4. **Espectáculo.** Iluminación cinematográfica, física exagerada pero legible, impactos contundentes, hordas enormes.

## Estructura de una partida
- Menú → selección de rol (1–2 jugadores locales) → **Día 1, año 1800**.
- **Oleada (día)**: empieza al atardecer, cae la noche a mitad de oleada. Hay que eliminar a todos los zombis.
- **Intermedio (amanecer, ~20 s)**: se reanima a los caídos, se elige **1 de 3 mejoras**, se repone parte de la munición. El calendario avanza 10 años («Día 4 · Año 1830»).
- **Día de jefe**: el último día de cada era (días 5, 10, 15, 20, 25) y el día 31 (año 2100, jefe final **OMEGA**).
- **Salto de era**: tras el jefe, transición «SALTO TEMPORAL», nuevo escenario y nuevo equipo.
- **Fin**: victoria al derrotar a OMEGA en 2100; derrota si cae toda la escuadra. Puntuación = bajas × multiplicador de **racha** (la racha sube matando seguido y decae con el tiempo o al recibir daño).
- **Modo práctica**: desde el menú se puede empezar en cualquier era (para probar contenido).

| Días | Años | Era | Escenario | Vehículo | Emplazamiento | Jefe |
|---|---|---|---|---|---|---|
| 1–5 | 1800–1840 | Era de la Pólvora | Villa de Santa Ceniza (villa colonial) | Caballo de guerra | Cañón de campaña | El Coracero |
| 6–10 | 1850–1890 | Era del Vapor | Estación Cruz del Diablo (frontera) | Locomóvil (tractor de vapor) | Ametralladora Gatling | El Fogonero |
| 11–15 | 1900–1940 | Era de las Trincheras | Tierra de Nadie | Autoblindado | Ametralladora pesada | El Mariscal |
| 16–20 | 1950–1990 | Era Atómica | Avenida Neón | Muscle car | M60 fija | El Rey del Asfalto |
| 21–25 | 2000–2040 | Era Digital | Zona de Cuarentena 7 | Blindado táctico | Minigun fija | Paciente Cero |
| 26–31 | 2050–2100 | Era Sintética | Megaurbe Aurora | Aerodeslizador | Cañón de plasma | OMEGA |

## Roles (ver `src/datos/roles.js`)
| Rol | Virtudes | Defectos | Fuerte contra | Débil contra |
|---|---|---|---|---|
| **Soldado** | Cadencia, recarga, muchas granadas. Habilidad: Fuego de supresión | Sin resistencias; balas normales | Corredor, Aullador, Detonador | Acorazado, Apestado |
| **Médica** | Inmune al veneno, regeneración, cura en área | Daño −20 %, armas ligeras, poca munición | Apestado, Escupidor | Acorazado, Mole, Aullador |
| **Ingeniero** | Torreta de la era, barricadas, repara, explosivos +35 %, vehículos | Daño modesto, débil cuerpo a cuerpo | Caminante, Corredor, Acorazado | Escupidor, Mole, Detonador |
| **Cazadora** | Precisión perforante, velocidad, críticos, invisibilidad | Vida baja, cadencia lenta | Acorazado, Escupidor, Mole, Aullador | Corredor, Detonador |
| **Demoledor** | Vida enorme, armas pesadas, cuerpo a cuerpo ×2, inamovible | Lento, recarga lenta | Acorazado, Mole, Caminante | Corredor, Escupidor, Apestado |

Cada rol lleva: **primaria** + **secundaria** (según arquetipos), **arrojadizas**, **cuerpo a cuerpo**, una **pasiva** y una **habilidad** con enfriamiento.
Las armas concretas dependen de la era: el fusil del Soldado es un mosquete en 1800, un subfusil en 1900 y un rifle de pulsos en 2050.

## Zombis (ver `src/datos/zombis.js`)
| Clase | Rasgo | Counter de | Débil ante | Desde el día |
|---|---|---|---|---|
| Caminante | básico, en masa | — | Ingeniero, Demoledor | 1 |
| Corredor | muy rápido, frágil, zigzag | Cazadora, Demoledor | Soldado, Ingeniero | 2 |
| Acorazado | blindaje frontal de la época (balas ×0,3) | Soldado, Médica | Cazadora, Demoledor, Ingeniero | 3 |
| Escupidor | ácido a distancia, ×3 a estructuras/vehículos | Ingeniero, Demoledor | Cazadora, Médica, Soldado | 4 |
| Apestado | aura tóxica, nube al morir (inflamable) | Demoledor, Soldado | Médica, Cazadora | 6 |
| Detonador | suicida con el explosivo de la época | Ingeniero, Cazadora | Soldado, Médica | 7 |
| Mole | carga devastadora, ×4 a estructuras, punto débil en la espalda | Ingeniero, Médica | Cazadora, Demoledor | 8 |
| Aullador | grito: horda +40 % velocidad, silencia habilidades | Médica, Ingeniero | Soldado, Cazadora | 9 |

Los zombis visten según la era (tricornios y casacas → sombreros y chalecos → cascos y máscaras antigás → cuero y tupés → capuchas y trajes NBQ → implantes y neón) y su vida/daño escalan con el día.
Variantes **élite** (más grandes, brillo en los ojos) a partir del día 12.

## Armas (ver `src/datos/armas.js`)
8 arquetipos × 6 eras = 48 armas. La progresión se **siente**: de un disparo y tres segundos de recarga con nubes de humo negro,
a ráfagas automáticas, cohetes, y finalmente plasma, raíles y arcos eléctricos.
Tipos de daño: bala, perforante, explosivo, fuego, golpe, energía (+ veneno y ácido de los zombis).

## El escenario como arma
- **Vehículos** (uno o dos por mapa): atropellan, tienen vida y pueden explotar. El Ingeniero los repara y refuerza.
- **Emplazamientos**: arma fija tripulable de la era, munición infinita con sobrecalentamiento, arco de tiro limitado.
- **Explosivos**: barriles de pólvora, cajas de dinamita, bidones, surtidores, bombonas, células de plasma. Reacción en cadena.
- **Interactivos de era**: campana de iglesia (señuelo), faroles de aceite (fuego), carreta (empujable); palanca de tren (una locomotora arrolla la vía), depósito de agua (derribable), vagoneta; alambradas, minas, sirena; alarma de coche (señuelo), transformador (electrocuta charcos); valla eléctrica, generador, dron de suministros; torres Tesla, puertas de energía.
- **Destructibles y empujables**: cajas, vallas, mobiliario; el botín sale de cajas y de zombis.
- **Construcciones del Ingeniero**: torreta de la era y barricadas.

## Tono y presentación
Serio pero pulp: aventura de terror de sesión doble. Rótulos de era como carteles de época, calendario que pasa hojas,
bestiario con los counters, narración mínima por mensajes en pantalla.
