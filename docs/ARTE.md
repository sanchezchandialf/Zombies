# ERA Z — Biblia de arte

**Dirección: «diorama cinematográfico».** Mundo estilizado-realista: formas claras y algo exageradas, biseles y siluetas limpias,
materiales PBR ricos, y sobre todo **luz**: cada captura debe parecer un fotograma de cine iluminado a propósito.
No buscamos fotorrealismo sino el acabado de una producción cuidada: nada plano, nada gris por defecto, nada sin detalle.

## Reglas visuales
1. **Legibilidad primero**: jugadores, zombis, proyectiles y peligros se distinguen a 30 m de cámara. Silueta > detalle. Los jugadores llevan un acento de color de rol (ROLES[x].color) en alguna prenda/luz.
2. **Nada de primitivas desnudas**: toda forma lleva bisel/redondeo (RoundedBox, lathe, extrusiones con bisel), grosor, juntas, remaches, costuras. Una caja nunca es solo una `BoxGeometry` con un color.
3. **Materiales**: `MeshStandardMaterial`/`MeshPhysicalMaterial` con mapas procedurales (color con variación, rugosidad, normal). Metal que brilla, madera con veta, tela mate, piel con ligera subsuperficie simulada (rim). Suciedad y desgaste en los bordes y cerca del suelo.
4. **Variación**: color y escala con ruido por instancia; ningún patrón repetido evidente.
5. **Luz y color por era** (la gradación la aplica el Render):
   - 1800 Pólvora: velas y faroles cálidos contra niebla azul fría; sepia dorado.
   - 1850 Vapor: polvo naranja, atardecer rojo, vapor blanco, hierro negro.
   - 1900 Trincheras: verdes y marrones desaturados, lluvia, bengalas blancas, gas amarillento.
   - 1950 Atómica: neón rosa y turquesa sobre asfalto mojado, cromo, noche azul.
   - 2000 Digital: azul clínico frío, rojo de emergencia, focos blancos, cristal.
   - 2050 Sintética: magenta y cian, hologramas, lluvia luminosa, negro brillante.
6. **Emisivos + bloom** para faroles, neones, pantallas, ojos de élite, plasma. Pocas luces reales, muchos emisivos.
7. **Suelo vivo**: charcos con reflejo, grietas, hojas, huellas, calcos de sangre y quemaduras. El suelo ocupa el 60 % de la pantalla: es lo más importante del escenario.
8. **Escala**: humanos 1,8 m con proporción ligeramente heroica (cabeza ×1,12, manos y pies ×1,15, hombros anchos). Puertas 2,2 m. La cámara está a ~25 m: los detalles de menos de 3 cm no se ven; los de 10–30 cm definen la calidad.

## Personajes
- Construidos con piezas rígidas articuladas (torso, pelvis, cabeza, brazos y piernas de 2 segmentos, manos, pies) con geometría redondeada, más **prendas y equipo** de la era (sombreros, cascos, abrigos con faldón, mochilas, cartucheras, hombreras, visores).
- Animación procedural fluida: ciclos de andar/correr con balanceo de cadera y contrapeso de brazos, apuntado del torso hacia la mira, retroceso al disparar, recarga, esquiva, golpes. Nada de deslizarse: los pies siguen la velocidad real.
- **Zombis**: silueta rota y asimétrica (hombro caído, brazo colgando o extendido, cabeza ladeada), piel verdosa/grisácea con variación, ropa de la era rasgada, heridas y sangre oscura. Cada clase se reconoce **solo por la silueta**: el Corredor encorvado y flaco, el Acorazado ancho con coraza, el Escupidor con buche hinchado y cuello largo, el Apestado obeso con pústulas luminosas, la Mole gigantesca con brazo descomunal, el Aullador delgado de boca desencajada, el Detonador abrazado a su explosivo.
- **Muertes físicas**: derribo con inercia según la dirección del disparo, desmembramiento con explosivos, cuerpos que salen despedidos, charcos de sangre.

## Lo que NO queremos
Cubos de colores planos, luz ambiente uniforme, sombras duras pixeladas, texturas estiradas, z-fighting, suelos de un solo color,
personajes con cabeza de caja o estética de bloques, interfaces genéricas de plantilla, tipografías por defecto.
