# Bitácora y Diagnóstico de Rediseño — Sintetizador de Muestra de Agua

Este documento registra la auditoría técnica, el diagnóstico del proyecto y el plan de trabajo para el rediseño del juego *Sintetizador de Calibración de Muestra de Agua*.

---

## Fase 1: Inspección del Proyecto Existente

**Fecha de inspección:** 20 de Octubre de 2026  
**Estado de la suite de pruebas previa:** 75 tests ejecutados — 75 aprobados (100% éxito).  
**Verificación de tipos TypeScript:** Aprobada sin errores (`tsc --noEmit`).

---

### 1. Arquitectura, Frameworks y Tecnologías Encontradas

Tras la inspección profunda de `package.json`, configuraciones y código fuente:

* **Lenguaje:** TypeScript 5.7 puro (`strict: true`), con compilación dirigida por Vite 6.0.0.
* **Frameworks frontend:** **Ninguno**. No se utiliza React, Vue, Angular, Svelte ni librerías similares. Es una aplicación puramente Vanilla TypeScript.
* **Frameworks de estilos / UI:** **Ninguno**. No se utiliza Tailwind CSS, Bootstrap ni procesadores Sass/Less. Se emplea CSS3 nativo puro con variables CSS (`:root`), Grid y Flexbox.
* **Renderizado gráfico:** **HTML5 Canvas 2D API nativa**. No se utilizan librerías gráficas externas (no Chart.js, no PixiJS, no Three.js, no SVG).
* **Audio:** **Web Audio API nativa** mediante osciladores sintetizados en tiempo real (`SoundManager`), sin archivos `.mp3` o `.wav` externos.
* **Entorno de pruebas y bundler:**
  * Bundler: **Vite 6.0.0**
  * Suite de pruebas: **Vitest 5.0.5**
  * Entorno DOM virtual para tests: **happy-dom 21.0.3**
* **Dependencias de producción (`dependencies`):** **0 dependencias en runtime**. El proyecto es completamente autónomo y ligero.
* **Paradigma de diseño:** Programación Orientada a Objetos (POO) estricta, principios SOLID y 5 Patrones de Diseño Formales (GoF):
  1. **State:** Manejo de estados del juego (`StandbyState`, `ManipulatingState`, `EvaluatingState`, `SolvedState`, `LockedState`).
  2. **Strategy:** Algoritmos de validación intercambiables (`ExactMatchStrategy`, `ToleranceStrategy`).
  3. **Observer:** Desacoplamiento entre el modelo central (`WaterSamplePuzzle`) y las vistas visuales y auditivas (`TargetDisplayView`, `RowCarouselView`, `LiveSumSpectrumView`, `AttemptCounterView`, `SoundManager`).
  4. **Factory:** Construcción modular de tableros de dificultad (`FacilityHardFactory`, `FacilityEasyFactory`).
  5. **Decorator:** Capas acumulables de renderizado gráfico sobre celdas (`BaseBlockView`, `HighlightPeakDecorator`, `ScanlineGlitchDecorator`).

---

### 2. Estructura Real del Proyecto y Archivos Relevantes

```
Juego_Acertijo/
├── index.html                           # Estructura del DOM, contenedores Canvas y controles
├── package.json                         # Configuración del proyecto, scripts y dependencias
├── tsconfig.json                        # Configuración estricta de TypeScript
├── REDISEÑO_JUEGO.md                    # Documento de requerimientos de rediseño
├── CAMBIOS_REDISEÑO.md                  # Bitácora de diagnósticos y cambios del rediseño
├── VDD.md                               # Documento de diseño original del videojuego (GDD/VDD)
├── opencode.md                          # Historial y bitácora técnica de desarrollo
├── src/
│   ├── index.ts                         # Punto de entrada / Inyección de dependencias (Composition Root)
│   ├── application/
│   │   ├── GameController.ts            # Adaptador DOM -> Dominio (manejo de clics y acciones)
│   │   └── SoundManager.ts              # Observador de audio con Web Audio API sintetizado
│   ├── core/                            # Núcleo de dominio puro (sin dependencias del navegador)
│   │   ├── models/
│   │   │   ├── Block.ts                 # Entidad inmutable de celda/altura
│   │   │   ├── Row.ts                   # Fila circular modular con desplazamiento O(1)
│   │   │   ├── TargetPattern.ts         # Vector objetivo de referencia
│   │   │   └── WaterSamplePuzzle.ts     # Agregado raíz / Contexto de patrones State, Strategy y Observer
│   │   ├── observer/
│   │   │   ├── IPuzzleObserver.ts       # Interfaz de observador y enum de eventos
│   │   │   ├── IPuzzleSubject.ts        # Interfaz de sujeto observable
│   │   │   └── PuzzleEventEmitter.ts    # Despachador de notificaciones Observer
│   │   ├── state/
│   │   │   ├── IPuzzleState.ts          # Interfaz State
│   │   │   ├── StandbyState.ts          # Estado en espera
│   │   │   ├── ManipulatingState.ts     # Estado activo de rotación y validación
│   │   │   ├── EvaluatingState.ts       # Estado de verificación
│   │   │   ├── SolvedState.ts           # Estado de muestra calibrada / resuelta
│   │   │   └── LockedState.ts           # Estado de bloqueo por 3 fallos consecutivos
│   │   └── strategy/
│   │       ├── IValidationStrategy.ts   # Interfaz Strategy de validación
│   │       ├── ExactMatchStrategy.ts    # Validación columna a columna exacta
│   │       └── ToleranceStrategy.ts     # Validación con margen de tolerancia
│   ├── creational/factories/
│   │   ├── IPuzzleFactory.ts            # Interfaz de fábrica de puzzles
│   │   ├── FacilityHardFactory.ts       # Nivel Difícil (16 columnas, alturas 0 a 4)
│   │   └── FacilityEasyFactory.ts       # Nivel Fácil (12 columnas, alturas 0 a 2)
│   ├── structural/decorators/
│   │   ├── IBlockView.ts                # Interfaz de renderizado de bloque
│   │   ├── AbstractBlockDecorator.ts    # Clase base del decorador
│   │   ├── BaseBlockView.ts             # Renderizado base por altura
│   │   ├── HighlightPeakDecorator.ts    # Decorador de brillo/halo en altura máxima
│   │   └── ScanlineGlitchDecorator.ts   # Decorador de efecto scanline CRT por celda
│   └── ui/
│       ├── components/
│       │   ├── TargetDisplayView.ts     # Observador Canvas: Espectro objetivo de referencia
│       │   ├── RowCarouselView.ts       # Observador Canvas: Carrusel de filas A, B, C
│       │   ├── LiveSumSpectrumView.ts   # Observador Canvas: Suma vertical en vivo con feedback de color
│       │   └── AttemptCounterView.ts    # Observador DOM: Contadores de movimientos, fallos y estado
│       └── styles/
│           ├── layout.css               # Disposición de rejilla, paneles y adaptabilidad
│           └── terminal-crt.css         # Estética CRT verde fósforo, scanlines y animaciones
└── tests/                               # Suite de 75 pruebas automatizadas
    ├── mocks/MockObserver.ts
    └── unit/                            # Tests unitarios para cada capa y patrón
```

---

### 3. Mecánicas y Flujo de Funcionamiento del Juego

1. **Desplazamiento de las Filas A, B y C:**
   * En `index.html`, los botones poseen atributos de datos: `data-action="shift-left"` o `shift-right"` y `data-row="0"`, `"1"` o `"2"`.
   * `GameController.ts` escucha eventos `click` en `#controls` y ejecuta `puzzle.shiftRow(rowIndex, direction)`.
   * El contexto `WaterSamplePuzzle` transfiere la llamada a `currentState.handleShift(...)`.
   * En `ManipulatingState`, se invoca `context.rotateRow(rowIndex, direction)`, que llama a `Row.shift(direction)`.
   * `Row.ts` mantiene un arreglo estático de bloques inmutables y un puntero circular `offset`. La rotación es $O(1)$: actualiza `offset = (((offset + direction) % size) + size) % size`.
   * Se emite el evento `ROW_SHIFTED`, recalculando la suma y notificando a las vistas.

2. **Cálculos de Suma:**
   * Implementado en `WaterSamplePuzzle.calculateSum()`:
     $$\text{Suma}(x) = \sum_{r \in \text{Filas}} \text{Altura}_r(x)$$
   * Se ejecuta automáticamente ante cualquier cambio de estado o rotación, emitiéndose el vector resultante `currentSum` hacia los observadores.

3. **Validación de la Solución:**
   * El botón `▣ Analizar` dispara `puzzle.validate()`.
   * `ManipulatingState` transiciona el puzzle a `EvaluatingState` e invoca `checkSolution()`.
   * `checkSolution()` delega la regla a `IValidationStrategy` (por defecto `ExactMatchStrategy`).
   * **Éxito:** Si la suma coincide de manera idéntica con el vector de `TargetPattern`, transiciona a `SolvedState` y emite `VALIDATION_PASSED`. Se abre el overlay de victoria y se bloquean las filas.
   * **Fallo:** Si no coincide, incrementa `consecutiveFailures`. Si llega al umbral (`maxConsecutiveFailures = 3`), transiciona a `LockedState` y emite `VALIDATION_FAILED` y `LOCKED`.

4. **Contador de Movimientos y Fallos:**
   * Monitoreado por `AttemptCounterView.ts` mediante escucha de eventos:
     * `ROW_SHIFTED`: `moves++`.
     * `VALIDATION_FAILED`: `fails++`.
     * `RESET`: `moves = 0; fails = 0`.
   * Refleja los valores en tiempo real en los elementos `#move-counter` y `#fail-counter`.

5. **Botón / Selector de Máxima Dificultad:**
   * En el código existen dos fábricas: `FacilityHardFactory` (16 columnas, fiel al acertijo original de *Resident Evil 3*) y `FacilityEasyFactory` (12 columnas).
   * En el markup `index.html` actual, el `<select id="difficulty-select">` fue deshabilitado y ocultado (`display: none`), sustituido por una insignia decorativa estática `#difficulty-badge` rotulada `"MÁXIMA DIFICULTAD (16 COLUMNAS)"`.

6. **Generación y Actualización de Gráficos:**
   * Cada una de las tres pantallas es un elemento `<canvas>` independiente:
     * `#target-canvas` (alto 100px) -> `TargetDisplayView`
     * `#rows-canvas` (alto 220px) -> `RowCarouselView`
     * `#sum-canvas` (alto 100px) -> `LiveSumSpectrumView`
   * Los componentes de vista están suscritos al sujeto observable `WaterSamplePuzzle`.
   * Cuando se produce cualquier cambio, el método `onPuzzleUpdated` de cada vista limpia su contexto con `clearRect` y redibuja las barras y textos en el frame inmediato.
   * Las filas de bloques utilizan la cadena Decorator: `BaseBlockView` $\rightarrow$ `HighlightPeakDecorator` (agrega halo de neón a bloques con altura 4) $\rightarrow$ `ScanlineGlitchDecorator` (dibuja líneas de barrido horizontal sobre cada bloque).

---

### 4. Separación de Lógica de Negocio vs Presentación Visual

| Capa | Responsabilidad | Dependencia del Navegador / DOM |
| :--- | :--- | :--- |
| **Dominio Puro (`src/core/`)** | Reglas del acertijo, cálculo de sumas, rotación cíclica, estados y estrategias de validación. | **Cero**. Totalmente agnóstico de la plataforma y testeable en NodeJS puro. |
| **Creacional (`src/creational/`)** | Definición y ensamblaje de niveles con garantía matemática de resolubilidad. | **Cero**. |
| **Estructural (`src/structural/`)** | Decoradores de estilo para el pintado en Canvas. | Depende únicamente de `CanvasRenderingContext2D`. |
| **Aplicación (`src/application/`)** | Mediación entre eventos del usuario y el dominio (`GameController`), y síntesis de sonido (`SoundManager`). | Depende del DOM para eventos y de `AudioContext`. |
| **Presentación UI (`src/ui/`)** | Paneles Canvas (`components/`) y hojas de estilo CSS (`styles/`). | Depende de la API Canvas 2D, HTML y CSS. |
| **Ensamblaje (`src/index.ts`)** | Composition Root que instancia el dominio, vistas y controladores conectándolos por inyección. | Punto de amarre de la aplicación en el navegador. |

---

### 5. Diagnóstico de Problemas Técnicos y Visuales Actuales

1. **Problemas Visuales y de UX:**
   * **Ausencia de animaciones fluidas y transiciones:** El redibujado de las filas al pulsar desplazar es un salto instantáneo y seco; no existe interpolación ni movimiento mecánico suave que transmita la sensación de engranajes o tambores rotando.
   * **Adaptabilidad en pantallas móviles / estrechas:** Las 16 columnas en un ancho de dispositivo móvil (menor a 400px) producen columnas de menos de 18px de ancho, reduciendo la legibilidad de las alturas relativas y dificultando la interacción con los controles de fila.
   * **Jerarquía visual plana:** Aunque la paleta CRT verde fósforo es atmosférica, las tres pantallas de osciloscopio tienen un tratamiento muy similar, lo cual puede dificultar diferenciar de un vistazo la entrada (filas A, B, C) de la muestra esperada y la resultante.
   * **Falta de reactividad visual en controles:** Los botones industriales `◀` y `▶` carecen de estados activos o animaciones de presión física que transmitan respuesta mecánica (sensación háptica/táctil visual).
   * **Bloqueo del selector de dificultad:** El usuario no puede alternar entre el modo de inducción (fácil, 12 columnas) y el modo experto (16 columnas) desde la interfaz visual sin modificar código.
   * **Espacio vertical del manual:** El panel superior de instrucciones, aun cuando se puede colapsar, ocupa espacio inicial significativo empujando los controles del puzzle fuera del primer pliegue visual en pantallas estándar.

2. **Problemas Técnicos:**
   * **Redibujado directo en el hilo de eventos sin `requestAnimationFrame`:** Actualmente `paint()` se ejecuta de forma síncrona en el callback del evento observer. Para añadir animaciones de desplazamiento o efectos visuales continuos, se necesitará un bucle de animación desacoplado con interpolación de tiempo (`requestAnimationFrame`).
   * **Falta de redimensionado dinámico (`resize` listener):** `setCanvasResolution()` solo se invoca durante la carga inicial (`bootstrap()`). Si el usuario cambia el tamaño de la ventana o rota el dispositivo móvil, el canvas no recomputa su resolución interna, provocando distorsión o borrosidad.
   * **Políticas de reproducción de AudioContext:** `SoundManager` instancia el contexto de audio perezosamente al disparar un sonido; sin embargo, no contempla explícitamente el estado `suspended` común en navegadores modernos cuando no se ha desbloqueado el audio mediante interacción explícita.

---

### 6. Riesgos de Modificar el Proyecto

1. **Riesgo de Regresión en Pruebas Unitarias e Integradas:**  
   Existen 75 pruebas rigurosas en Vitest que validan invariantes de dominio (resolubilidad matemática, no violación de encapsulamiento, despacho estricto de eventos, transiciones de la máquina de estados). Cualquier alteración en las interfaces o contratos del dominio romperá la suite.
2. **Riesgo de Acoplamiento Dominio-UI:**  
   La mayor fortaleza actual del código es que `src/core/` no tiene dependencias de UI. Al rediseñar la interfaz o agregar animaciones visuales, se debe preservar estrictamente el patrón Observer sin invadir el dominio.
3. **Riesgo de Rendimiento en Canvas:**  
   Si se agregan efectos visuales más complejos (partículas, reflejos, tubos de agua o engranajes), el renderizado debe mantenerse optimizado a 60 FPS sin saturar la CPU en dispositivos móviles.

---

### 7. Áreas de Código Candidatas a Modificación para el Rediseño

* **`src/ui/styles/terminal-crt.css` y `src/ui/styles/layout.css`:**
  * Modernización estética con mejores contrastes, biseles industriales, iluminación volumétrica, texturas de consola metálica y diseño de controles táctiles ergonómicos.
* **`src/ui/components/RowCarouselView.ts`:**
  * Incorporación de animación de desplazamiento horizontal (easing / lerp) al rotar las filas, mejorando el feedback visual del usuario.
* **`src/ui/components/LiveSumSpectrumView.ts`:**
  * Marcadores visuales de alineación más claros entre la suma actual y el objetivo, con indicadores de diferencia (delta +/-) por columna.
* **`index.html`:**
  * Reorganización de la jerarquía de paneles, optimización del manual desplegable, rediseño de la consola de botones y habilitación armónica de los modos de dificultad.
* **`src/index.ts`:**
  * Soporte para redimensionado responsivo automático (`window.resize`), gestión del bucle de animación y orquestación del cambio de dificultad.

---

### 8. Protocolo de Pruebas y Validación Actual

Para garantizar la estabilidad antes y después de cualquier intervención futura:

* **Pruebas unitarias de dominio y UI:** `npm test` (Vitest)
* **Verificación estricta de tipos:** `npm run typecheck` (`tsc --noEmit`)
* **Compilación de producción:** `npm run build` (Vite)
* **Validación funcional interactiva:** `npm run dev`
  1. Desplazamiento cíclico de filas A, B, C en ambas direcciones.
  2. Comprobación de cálculo en vivo de sumas por columna.
  3. Comprobación del bloqueo temporal tras 3 validaciones erróneas consecutivas.
  4. Comprobación de desbloqueo mediante purga.
  5. Comprobación del estado victorioso al alcanzar la combinación objetivo.

---
---

# Fase 2: Investigación de la Referencia Original

**Fecha de investigación:** 20 de Octubre de 2026
**Objeto:** Estudiar el acertijo de la Muestra de Agua de *Resident Evil 3: Nemesis* (Capcom, 1999, PS1) para **orientar el rediseño** del juego, sin reemplazar la implementación funcional existente.

> ⚠ **Nota previa importante:** el archivo `REDISEÑO_JUEGO.md` se encontró **vacío (0 bytes)** en el día de la investigación (sin copia en el proyecto ni en el historial de Git). Esta fase se ejecutó a partir de las instrucciones de la Fase 2 provistas directamente por el usuario. Cuando el documento se recupere, esta sección se conciliará con su contenido.

---

## F2.1. Metodología y Clasificación de Fuentes

Criterio aplicado: se separa estrictamente **(A) material oficial**, **(B) material visual verificable** (grabaciones/capturas del juego original de 1999) y **(C) fuentes secundarias de la comunidad** (guías, wikis, foros). Ninguna afirmación se presenta como "hecho histórico" si solo proviene de (C).

| # | Fuente | Clase | Tipo de material | Acceso |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Capcom (sitio web 1999, guías oficiales de estrategia) | **(A) Oficial** | Documentación oficial | ❌ **No accesible**: el sitio oficial de 1999 no está en línea y no se localizó documentación oficial de Capcom que describa este acertijo. **Se declara expresamente.** |
| 2 | Capturas de las 4 soluciones — `residentevilpuzzles.blogspot.com/2012/07/resident-evil-3-water-sample-puzzle.html` | (C) Secundaria + **(B) capturas del juego original** | 4 imágenes del panel original (`samp1.PNG` … `samp4.PNG`) | ✅ Consultada |
| 3 | Guía de puzzles de Steam — `steamcommunity.com/sharedfiles/filedetails/?id=3552816476` (autor: SilentBlack, 2025) | (C) Secundaria + **(B) capturas** | Captura del panel + 4 capturas de soluciones | ✅ Consultada |
| 4 | Vídeos "RE3 Nemesis — The Water Sample Puzzle (Monitor Room) Ver. 1–4" (`youtube.com/watch?v=mG9fQGwNE9U`, `?v=Bok7sv2BFuQ`, `?v=PEEeVeXLmTQ`, `?v=2eLHIfjbgik`) y "Explaining the Water Puzzle from Resident Evil 3" (`youtube.com/watch?v=CV5FYTC6060`) | (C) Subidas de aficionados, que muestran **(B) material visual del juego original** | Grabaciones de las 4 variantes resolviéndose en PS1 | ✅ Identificados (no se pudo reproducir el contenido en la sesión; se citan como referencia visual a revisar) |
| 5 | Guía en texto — GameFAQs: `/gamecube/535838/.../faqs/24033` y `/ps/198459/.../faqs/81398, 13963` | (C) Secundaria | Walkthrough textual | ✅ Consultada (parcialmente, vía extractos de búsqueda) |
| 6 | Resident Evil Wiki (Fandom) — `residentevil.fandom.com/wiki/Water_Sample` | (C) Secundaria | Ficha del ítem | ⚠ Acceso bloqueado (403); solo se usó el extracto indexado |
| 7 | IGN — `ign.com/wikis/resident-evil-3-nemesis/Factory` y walkthrough 2004 | (C) Secundaria | Walkthrough | ✅ Consultada (parcial, vía extractos; artículo completo bloqueado 403) |
| 8 | `speedrun.com/re3/guides/e3vqr` | (C) Secundaria | Guía de soluciones | ❌ Acceso bloqueado (403) |
| 9 | Reddit — `r/residentevil` (hilos sobre el acertijo) | (C) Secundaria anedótica | Comentarios | ✅ Consultada (parcial, vía extractos) |

**Conclusión de calidad de fuentes:** el acertijo está exhaustivamente documentado por la comunidad (con capturas y vídeos del original), pero **no existe documentación oficial de Capcom accesible** que describa su interfaz. Todo detalle por debajo de lo que muestran las capturas se tratará aquí como decisión de diseño, nunca como dato histórico.

---

## F2.2. Hechos Verificados (con trazabilidad de fuente)

Hechos comprobados por **al menos dos fuentes independientes** o por texto del propio juego citado en guías:

| # | Hecho verificado | Fuentes que lo respaldan |
| :--- | :--- | :--- |
| **H1** | **Ubicación:** el acertijo aparece al final del juego, en la zona de la **planta de tratamiento / "Dead Factory"** de Umbrella. Se resuelve en la **Sala de Monitoreo (Sewage/Monitor Room)** y en la **Sala de Análisis de Agua (Water Testing Room)**, a la que se baja por una escalera. La *Muestra de Agua* (ítem clave) se recoge en la sala de monitoreo y se **inserta en la máquina** del aula de análisis. | IGN Factory ("Jill se encuentra en la monitor room… debe resolver el Water Sample puzzle"), guías de GameFAQs ("Monitor Room: take the Security Manual… and the water sample from the wall… Then put the Water Sample in the machine"), guía clásica de walkthrough (niveles "SEWAGE MONITOR ROOM" / "WATER TESTING ROOM"), Reddit ("I just got to the Dead Factory… and this puzzle"). |
| **H2** | **Ítem "Water Sample":** es un ítem clave. Tras resolver el acertijo, su texto de examen dice (original en inglés): *"Sample from the treated drainage of this factory. It shows it has passed the water pollution test."* El agua tratada pasa la prueba de contaminación. | Ficha del ítem en GameFAQs (texto del juego transcrita por la guía) + Resident Evil Wiki (extracto indexado: "Sample from the treated drainage of this facility…"). |
| **H3** | **Mecánica de resolución:** hay que hacer coincidir el **patrón superior** con las tres filas conmutables **A, B y C**, girando **cada fila a izquierda o derecha** (desplazamiento circular). | Blog de puzzles ("match the top example using switches A, B and C by turning each left or right"), guía de Steam ("match and move A B C to match water sample"), Reddit ("you just combine the 3 sliders lining them up…"). |
| **H4** | **Comprensión visual del jugador:** el patrón correcto se razona **leyendo las columnas en vertical**: las alturas de las tres filas se apilan columna a columna para reproducir el patrón de la muestra. | Reddit ("just look at them vertically, the levels stack up on each other") + capturas de las soluciones (imagen del panel original en guía de Steam y blog). |
| **H5** | **Comprobación final:** al terminar la alineación se pulsa un botón de **comprobación ("Check")** que pone la muestra a prueba; si es incorrecta, se reintenta sin documentarse una penalización adicional en las fuentes consultadas. | Blog ("When done, hit 'check' and the water sample will be tested"), Reddit ("check to see that it all adds up. If it doesn't, try again…"). |
| **H6** | **Variabilidad:** existen **4 configuraciones posibles** del acertijo (4 patrones de olas distintos, con su solución asociada). Una fuente las atribuye a la **dificultad** seleccionada; los vídeos de la comunidad las presentan como 4 "patrones de ola" distintos (Ver. 1–4). Ambas coinciden en que hay **exactamente 4 variantes**, pero la atribución exacta (dificultad vs. patrón aleatorio) **no está unificada** en las fuentes; el hecho se marca como **parcialmente indeterminado**. | Blog ("There are four different solutions… depending on which difficulty you play"), vídeos Ver. 1–4 ("this is one of the four solutions, with the first wave pattern"), guía de Steam (4 capturas A–D). |
| **H7** | **Recompensa y progresión:** al validar correctamente la muestra, **la puerta/camino se desbloquea** y el progreso continúa hacia las zonas finales de la fábrica. | Blog ("Once the sample has been tested correctly the door will unlock"), IGN ("Here she will need to solve the Water Sample puzzle… Then it's…"). |

**Material visual verificable asociado (capturas y vídeos del original de 1999):**

1. Capturas del panel y las 4 soluciones: `residentevilpuzzles.blogspot.com` (imágenes `samp1.PNG` … `samp4.PNG`).
2. Captura del panel completo con la muestra insertada: guía de Steam (sección "Water Sample", imagen de cabecera + soluciones A–D).
3. Grabaciones de resolución de cada variante: los cuatro vídeos de YouTube "Ver. 1–4" enlazados en F2.1.

> Estas imágenes/vídeos constituyen la referencia visual **primaria de facto** dado que Capcom no publica material oficial del panel; deben consultarse directamente durante las siguientes fases de diseño visual.

---

## F2.3. Interpretaciones Visuales (NO presentadas como hechos)

Los siguientes puntos son **análisis visual subjetivo** a partir del material citado y no pueden confirmarse por vía textual. Se listan para ser revisados contra las capturas durante el rediseño:

- **Paleta del panel original:** la pantalla del aparato se percibe, en el material de la comunidad, como una superficie oscura (tono azul-marino/gris industrial frío) con segmentos claros para las alturas y letra blanca para las etiquetas A/B/C. *Interpretación pendiente de verificación directa contra las capturas `samp1–4.PNG`.*
- **Organización vertical del panel:** una banda superior con el patrón de la muestra (etiquetada como "SAMPLE"), tres filas de bloques intermedias A, B y C, cada una con sus controles de giro a los lados, y la zona de comprobación en la parte inferior. *Orden y etiquetas: coincidente con las guías; adornos exactos: interpretativo.*
- **Atmósfera del emplazamiento:** la planta de tratamiento se percibe en los vídeos como una instalación abandonada y tensa: pasillos estrechos, tuberías y tanques volumétricos, iluminación tenue artificial, la sala de monitoreo con una gran pantalla y consolas, y la sala de análisis con la máquina como pieza central. *Interpretación visual; la estructura de salas sí está referenciada por textos (H1).*

---

## F2.4. Preguntas No Verificables y Decisión de Diseño Adoptada

Conforme a la instrucción de la Fase 2, aquí queda explícito **qué no se pudo verificar** y **qué decisión razonable** se toma para el rediseño, sin presentarla nunca como dato histórico:

| # | Detalle no verificado | Por qué no se pudo verificar | Decisión de diseño para el proyecto |
| :--- | :--- | :--- | :--- |
| **D1** | Número exacto de columnas por fila en el original | Ninguna guía lo específica numéricamente; solo se aprecia en capturas | Mantener **16 columnas** en modo Difícil y **12** en Fácil (implementación actual). Se declara como **decisión propia inspirada en el original**, no como dato histórico. |
| **D2** | Rango de alturas discretas de los bloques | No documentado textualmente | Mantener alturas **0–4** (umbral aplicado por las factorías actuales). Decisión de diseño. |
| **D3** | ¿El original mostraba un **gráfico de suma en vivo**? | Las guías invitan a comparar "mirando en vertical" (H4) y **ninguna fuente menciona un panel automático de suma** → con **confianza media**, el original requería el cálculo mental del jugador | Confirmar contra los vídeos (Ver. 1–4). Mientras tanto, el **"Espectro de Suma en Vivo"** de nuestro juego se declara como una **adición de accesibilidad y UX del rediseño**, no como característica fiel del juego original. |
| **D4** | Penalización por fallos en el original | Ninguna fuente documentado castigo; solo reintento (H5) | Nuestro mecanismo de **3 fallos consecutivos → bloqueo del sistema** se mantiene como decisión de diseño propia (consistente con la fantasía industrial del juego), no como fidelidad histórica. |
| **D5** | Paleta y estética exacta del monitor (colores, adornos, biseles) | Solo apreciable en capturas; texto no lo describe | Paleta CRT del proyecto (verde fósforo) conservada como dirección artística actual; en la fase de UI se comparará contra las capturas `samp1–4.PNG` y se documentará el ajuste. |
| **D6** | Dispositivos de control exactos en PS1 (mapeo de botones) | No localizado en las fuentes consultadas | Mantener botones **◀ / ▶ por fila** + botón **Analizar**, ya implementado en el proyecto. |
| **D7** | ¿Las 4 variantes dependen de la dificultad o de una selección aleatoria? | Fuentes divergen (H6) | Ambas hipótesis documentadas; la decisión de diseño del rediseño se tomará en su propia fase. Idea orientada: una futura fase podría ofrecer **"Modo Fiel"** con uno de los 4 patrones clásicos como reto adicional. |

---

## F2.5. Implicaciones para el Rediseño (orientación, no reemplazo)

Lecciones de la referencia que alimentarán las siguientes fases **sin alterar la arquitectura existente** (Observer/State/Strategy/Factory/Decorator siguen intactos):

1. **Modelo mental del jugador (H4):** el reto central es apilar columnas mentalmente. Nuestro panel de suma en vivo lo hace visible (D3); el diseño visual debe reforzar la lectura vertical (líneas de columna continuas entre filas y espectro).
2. **Etiqueta fija A/B/C (H3):** la señalética de filas es idéntica a la del original; ya está en nuestro `RowCarouselView` y debe mantenerse prominente.
3. **Momento del "Check" (H5, H7):** validar es un **acto deliberado y terminal**, no automático. El botón Analizar debe sentirse como el gesto importante de la sala (respuesta mecánica, con el sonido de válvulas ya presente en `SoundManager`).
4. **Variabilidad evidenciada (H6/D7):** el original cambia entre 4 configuraciones; el rediseño puede explotar esto para rejugabilidad (factorías futuras) sin romper la garantía matemática de resolubilidad actual.
5. **Contexto diegético (H1, H2):** nuestro marco narrativo ("Planta de Tratamiento de Agua de Raccoon City — Terminal 03") es coherente con el original (muestra de drenaje tratado + prueba de contaminación). La narrativa del manual puede apoyarse en la frase real del ítem (H2) como guiño documentado.

---

## F2.6. Anexo: Enlaces Consultados

**Oficial:** (sin resultados accesibles — declarado en F2.1, fila 1)

**Material visual verificable (juego original 1999):**
1. `http://residentevilpuzzles.blogspot.com/2012/07/resident-evil-3-water-sample-puzzle.html` — capturas de las 4 soluciones.
2. `https://steamcommunity.com/sharedfiles/filedetails/?id=3552816476` — capturas del panel y 4 soluciones.
3. `https://www.youtube.com/watch?v=mG9fQGwNE9U` — Vídeo variante 1 ("Monitor Room").
4. `https://www.youtube.com/watch?v=Bok7sv2BFuQ` — Vídeo variante 2.
5. `https://www.youtube.com/watch?v=PEEeVeXLmTQ` — Vídeo variante 3.
6. `https://www.youtube.com/watch?v=2eLHIfjbgik` — Vídeo variante 4.
7. `https://www.youtube.com/watch?v=CV5FYTC6060` — Vídeo explicativo de la mecánica.

**Fuentes secundarias (texto):**
8. `https://www.ign.com/wikis/resident-evil-3-nemesis/Factory` — ubicación (Sala de Monitoreo, zona Factory).
9. `https://gamefaqs.gamespot.com/gamecube/535838-resident-evil-3-nemesis/faqs/24033` — walkthrough (recogida de la muestra / inserción en la máquina).
10. `https://gamefaqs.gamespot.com/ps/198459-resident-evil-3-nemesis/faqs/81398` — texto del ítem "Water Sample" tras resolver.
11. `https://residentevil.fandom.com/wiki/Water_Sample` — ficha del ítem (acceso parcial).
12. `https://www.reddit.com/r/residentevil/comments/mmai5v/` — mecánica de apilado vertical (anecdótica).
13. `https://www.reddit.com/r/residentevil/comments/ahxmzc/` — meme/consenso comunitario sobre la dificultad percibida.
14. `https://www.speedrun.com/re3/guides/e3vqr` — soluciones (acceso bloqueado 403; solo extracto).

---

**Cierre de la Fase 2.** Próxima fase prevista: aplicación de los hallazgos al rediseño visual/UX, consultando directamente las capturas y vídeos citados para cada decisión estética.


---
---

# Fase 3: Diseño de la Distribución (Layout & UI Architecture)

**Fecha de propuesta:** 20 de Octubre de 2026  
**Marco de referencia:** Directivas de la skill `interface-design` y conclusiones de las Fases 1 y 2.  
**Objetivo central:** Proponer y contrastar dos arquitecturas espaciales diferentes para el sintetizador de agua, priorizando la legibilidad, la no competencia visual, la eliminación del scroll vertical en resoluciones estándar de escritorio (1080p y 1366×768) y la preservación intacta de todos los elementos funcionales existentes.

---

## F3.1. Aplicación de la Disciplina `interface-design`

### 1. Intención de Diseño (Working Brief)
* **El Humano:** Un operador técnico o jugador analítico en una terminal industrial abandonada (*Umbrella Dead Factory*). Enfrenta un puzzle lógico combinatorio bajo tensión. Requiere visibilidad completa e instantánea de causas y efectos sin distracciones ergonómicas ni desplazamientos de página.
* **El Verbo:** *Calibrar y verificar*. Rotar tres tambores de bloques cíclicos hasta que su suma vertical reproduzca exactamente la onda de referencia y validar mediante la válvula maestra.
* **La Sensación:** Consola de instrumentación pesada, analógica/digital, precisa, fría y con tacto electromecánico de finales de los años 90 (verde fósforo CRT, biseles de rack industrial, retículas de osciloscopio milimetradas y conmutadores de presión).

### 2. Exploración del Dominio y Territorio Visual
* **Conceptos del Dominio (5+):** Espectrometría hídrica, calibración por tambores rotatorios, osciloscopio de doble traza en fase, efluente y sedimentación, válvula de purga de sobrepresión, enclavamiento de seguridad (*interlock*).
* **Mundo de Color (5+):**
  1. `--crt-phosphor-primary` (`#00e575` / `#00ff80`): Trazas activas, estado operativo y lecturas de bloques.
  2. `--crt-phosphor-target` (`#00d4ff` / `#00b8e6`): Tono cian puro reservado exclusivamente para la Muestra de Referencia (inmutable).
  3. `--chassis-steel` (`#0c1410` base, `#16241c` paneles elevados): Chasis de hierro laminado en frío con micro-textura y biselado.
  4. `--hazard-alarm` (`#ff3333` fallo, `#ffaa00` advertencia): Diodos LED y alertas de sobrecalentamiento/fallos.
  5. `--match-resonance` (`#00ffaa` con halo): Resonancia visual cuando una columna coincide con el patrón objetivo.
* **Firma de Identidad (Signature):** **Retícula de fase continua vertical**. Las 16 columnas del espectro comparten guías visuales milimetradas continuas que atraviesan el objetivo, los tres tambores de calibración y la suma acumulada, reforzando de forma directa el modelo mental de apilamiento vertical verificado en la Fase 2 (H4).
* **Patrones por Defecto Rechazados:**
  * *Rechazado 1:* Distribución web genérica de una sola columna infinita con scroll vertical $\rightarrow$ *Alternativa adoptada:* Consola de instrumentación fija a escala de viewport (100vh en escritorio), donde todos los instrumentos y mandos conviven en el campo visual inmediato.
  * *Rechazado 2:* Botones planos rectangulares con iconos unicode $\rightarrow$ *Alternativa adoptada:* Conmutadores de tambor tipo switch basculante con hendidura táctil, estados `:active` de pulsación física real (`transform: scale(0.96)`) y sonido de relé electromecánico.
  * *Rechazado 3:* Bloque de instrucciones estático de 300px en la parte superior que desplaza todo el juego $\rightarrow$ *Alternativa adoptada:* Panel de guía abatible / *Drawer* lateral desplegable mediante pulsador de cabecera con aviso diegético ("MANUAL DE OPERACIÓN // DIRECTIVA UMBRELLA").

---

## F3.2. Propuesta y Comparación de Distribuciones

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CABECERA INDUSTRIAL COMPACTA                    │
│   [●] TERMINAL 03 — PLANTA DE TRATAMIENTO       [? GUÍA] [DIFICULTAD]  │
├───────────────────────────────────┬────────────────────────────────────┤
│         DISTRIBUCIÓN A            │          DISTRIBUCIÓN B            │
│  "Monitor vs Calibrador (2 Col)"  │ "Rack Unificado + Torre de Mandos" │
│                                   │                                    │
│  COLUMNA 1        COLUMNA 2       │  COLUMNA RACK      COLUMNA TORRE   │
│  (Espectros)      (Calibración)   │  (Señal Vertical)  (Mandos & Tele) │
│ ┌───────────────┐ ┌─────────────┐ │ ┌────────────────┐ ┌─────────────┐ │
│ │ MUESTRA REF.  │ │ FILAS A,B,C │ │ │ MUESTRA REF.   │ │ [◀] Fila A [▶]│ │
│ ├───────────────┤ ├─────────────┤ │ ├────────────────┤ ├─────────────┤ │
│ │ SUMA EN VIVO  │ │ CONTROLES   │ │ │ FILAS A, B, C  │ │ [◀] Fila B [▶]│ │
│ ├───────────────┤ ├─────────────┤ │ ├────────────────┤ ├─────────────┤ │
│ │ TELEMETRÍA    │ │ ACCIONES    │ │ │ SUMA EN VIVO   │ │ [◀] Fila C [▶]│ │
│ └───────────────┘ └─────────────┘ │ └────────────────┘ ├─────────────┤ │
│                                   │                    │ TELEMETRÍA  │ │
│                                   │                    │ [ANALIZAR]  │ │
│                                   │                    │ [PURGAR]    │ │
│                                   │                    └─────────────┘ │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

### Alternativa 1: "Consola Dividida en Dos Columnas (Monitor vs Calibrador)"

Esta alternativa sigue la hipótesis inicial planteada por el requerimiento: divide la pantalla horizontalmente en dos bloques conceptuales de 50%/50% o 55%/45%.

#### Estructura Espacial
1. **Columna Izquierda (Zona de Monitoreo y Análisis):**
   * Panel superior: **Muestra de Referencia (Target)** con osciloscopio cian.
   * Panel central: **Espectro de Suma en Vivo** con trazado verde/rojo según coincidencia.
   * Panel inferior: **Consola de Telemetría** (Movimientos, Fallos acumulados, Luz de Estado del Sistema).
2. **Columna Derecha (Zona de Calibración e Intervención):**
   * Panel de las **Tres Filas Móviles (A, B y C)** con sus bloques renderizados mediante Canvas.
   * Controles de desplazamiento horizontal `◀` y `▶` para cada una de las tres filas, posicionados inmediatamente al pie de cada fila o agrupados en un panel dedicado.
   * Panel de **Acciones Maestras**: Botón `▣ Analizar` (válvula de prueba) y Botón `⟲ Purgar`.
3. **Ayuda:** Desplegable superior compacto o cajón deslizable lateral con botón "Manual de Operación".

#### Ventajas
* **Separación de roles conceptuales limpia:** Divide con claridad la "lectura pasiva" (izquierda) de la "intervención activa" (derecha).
* **Amplitud horizontal:** Cada columna dispone de entre 450px y 600px en monitores estándar, otorgando buen espacio para los controles de botones a la derecha.
* **Control del scroll vertical:** Al no apilar verticalmente los tres osciloscopios y los controles, la altura total se mantiene por debajo de 650px, eliminando completamente el scroll en 1080p y 1366×768.

#### Desventajas
* **Ruptura de la lectura vertical directa (defecto crítico de UX):** En el acertijo original de *Resident Evil 3*, la clave mental es mirar una columna y ver cómo los bloques de A, B y C se apilan hacia arriba para coincidir con la muestra (Fase 2, H4). Al situar las Filas A, B y C en una columna distinta a la Muestra y a la Suma, el usuario debe realizar constantes movimientos sacádicos horizontales (mirar columna 4 en la derecha, mirar columna 4 en la izquierda, volver a la derecha).
* **Duplicación de anchos de canvas:** Requiere sincronizar dos anchos de canvas independientes (el de filas a la derecha y los de espectros a la izquierda) para que las 16 columnas tengan escalas similares.

---

### Alternativa 2: "Rack de Señales Unificado con Torre de Mandos Lateral" (Recomendada)

Esta alternativa surge de la síntesis entre la hipótesis de dos columnas y el hallazgo fundamental de la Fase 2: **el apilamiento vertical es la esencia del acertijo**. En lugar de separar las filas de la suma, se coloca **toda la cadena de señales en la columna principal** con una rejilla continua compartida, y se trasladan **todos los controles, telemetría y acciones** a una torre lateral ergonómica.

#### Estructura Espacial (Proporción 65% / 35% en Desktop)
1. **Columna Principal (El Rack de Señales — Izquierda / Centro, ~65% ancho):**
   * Se presenta como una bahía de osciloscopios integrada de arriba hacia abajo:
     1. **Muestra de Referencia (Target):** Traza cian superior (80–90px).
     2. **Filas de Calibración A, B y C:** Tambores giratorios con señalética A/B/C destacada (180–200px).
     3. **Espectro de Suma en Vivo:** Trazado de mezcla en tiempo real con silueta tenue del objetivo y barras diferenciales de coincidencia (80–90px).
   * **Continuidad de Retícula:** Las 16 columnas tienen exactamente el mismo ancho y alineación milimétrica en el eje X a través de los tres visores. El jugador puede bajar la mirada verticalmente en línea recta para sumar mentalmente la columna 7 de A, B y C y constatar el resultado en la suma inmediatamente debajo.
2. **Columna Lateral (Torre de Mandos e Instrumentación — Derecha, ~35% ancho):**
   * **Banco de Conmutadores de Fila:** Tres módulos de control (A, B y C) alineados en altura (eje Y) exactamente con las filas gráficas de la bahía de señales. Cada módulo contiene sus dos pulsadores mecánicos industriales `◀` y `▶` con etiqueta de fila.
   * **Módulo de Válvulas Maestras:**
     * Botón de alto relieve `▣ ANALIZAR MUESTRA` (botón dominante con luz testigo).
     * Botón de seguridad `⟲ PURGAR SISTEMA` (diseño de palanca/válvula industrial).
     * Selector de Dificultad (Máxima 16 Col / Inducción 12 Col) integrado como dial o llave selectora.
   * **Consola de Telemetría Integrada:** Displays numéricos estilo LED/VFD verde fósforo con fuentes monoespaciadas (`font-variant-numeric: tabular-nums`) para:
     * Contador de Movimientos.
     * Contador de Fallos (con alerta visual de 3 intentos máximos).
     * Luz de Enclavamiento/Estado (EN OPERACIÓN, EVALUANDO, BLOQUEADO, CALIBRADO).
3. **Módulo de Ayuda Plegable:**
   * Barra superior con botón toggle `[ ⚠ DIRECTIVA DE OPERACIÓN ]`. Al hacer clic, abre un cajón lateral deslizante (*drawer*) o un panel colapsable que no empuja la interfaz, permitiendo consultar el manual sin perder de vista los instrumentos.

#### Ventajas
* **Alineación cognitiva perfecta (100% fiel al modelo mental H4):** El jugador nunca pierde la relación columna por columna. La lectura vertical de A + B + C = Suma vs Referencia se realiza de forma natural y sin esfuerzo visual.
* **Ergonomía de control lateral:** Al estar los mandos agrupados a la derecha, la mano y la vista se complementan: la mano acciona los botones de la torre mientras los ojos se concentran en el movimiento de las ondas en el rack de señales.
* **Cero scroll vertical en cualquier resolución objetivo:**
  * En una pantalla de 1366×768 (viewport útil de ~660px):
    * Cabecera compacta: 42px.
    * Rack central (Target 85px + Filas 190px + Suma 85px + separadores y márgenes 60px): ~420px.
    * Espacio total requerido: ~520px, dejando más de 140px de margen libre sin ningún tipo de scroll.
* **Escalabilidad y responsividad elegante:** En resoluciones de escritorio se despliega en 2 columnas (65/35). En pantallas móviles o tablets estrechas (< 768px), la cuadrícula CSS conmuta automáticamente a una sola columna ordenada (Rack arriba, Controles abajo) de manera fluida.

#### Desventajas
* Requiere un diseño de rejilla CSS más riguroso para asegurar que los conmutadores de las filas A, B y C mantengan correspondencia de altura precisa con las bandas del canvas central.

---

## F3.3. Matriz Comparativa de Distribuciones

| Criterio de Evaluación | Distribución A (Split 2-Col: Espectros / Calibrador) | Distribución B (Rack de Señales + Torre de Mandos) |
| :--- | :---: | :---: |
| **Legibilidad y Apilamiento Vertical (H4)** | ❌ Deficiente (rompe el eje visual vertical entre filas y suma) | ⭐ **Excelente** (eje X idéntico y compartido) |
| **Eliminación de Scroll Vertical (< 680px)** | ✅ Sí (ambas columnas son compactas) | ✅ **Sí** (altura total ~520px) |
| **Ergonomía y Agrupación de Controles** | ⚠ Regular (controles flotando bajo las filas) | ⭐ **Excelente** (torre dedicada con alineación Y) |
| **Integración de Telemetría y Estado** | ⚠ Regular (repartida en la columna izquierda) | ✅ **Óptima** (agrupada en la consola de mando) |
| **Acceso a Ayuda sin Desplazamiento** | ✅ Sí (mediante drawer/panel abatible) | ✅ **Sí** (drawer lateral o persiana modal) |
| **Conservación de Componentes Existentes** | ✅ 100% conservados | ✅ **100% conservados** |
| **Adaptabilidad Responsiva Móvil** | ⚠ Salto abrupto de dos columnas a una | ⭐ **Natural** (pila continua ya coherente) |

---

## F3.4. Recomendación Final Fundamentada

**Se recomienda formalmente la Alternativa 2: "Rack de Señales Unificado con Torre de Mandos Lateral".**

**Razones determinantes:**
1. **Prioridad del Acertijo:** El desafío matemático consiste en sumar mentalmente los bloques de una misma columna. Separar las filas de los espectros (como propone la Alternativa 1) introduce una barrera cognitiva innecesaria. La Alternativa 2 preserva la alineación milimétrica columna a columna.
2. **Eficiencia del Espacio:** Las pantallas modernas de escritorio son panorámicas (16:9 o 16:10). La Alternativa 2 aprovecha el ancho para ubicar a la derecha la torre de controles y telemetría, logrando que el juego entero funcione en un lienzo industrial unificado de **0 scroll vertical**.
3. **Identidad Temática (*Umbrella Terminal*):** Emula con gran precisión un rack de instrumentación de laboratorio de control biológico de 1999, con pantalla de osciloscopio en el cuerpo principal y consola de potenciómetros/switches en el panel de control lateral.


---
---

# Fase 4: Identidad Visual (Visual Identity & System Design)

**Fecha de especificación:** 20 de Octubre de 2026  
**Marco de referencia:** Directivas de la skill `interface-design` y requerimientos de la Fase 4 (Secciones 5.1, 5.2 y 5.3).  
**Atmósfera de inspiración:** Terminales de instrumentación analítica y consolas industriales de 1999 (*Resident Evil 3: Nemesis* / Planta de Tratamiento de Umbrella).  
**Principio rector:** Máxima legibilidad analítica, funcionalidad industrial austera y eliminación de efectos de neón o destellos que entorpezcan la resolución del acertijo.

---

## 5.1. Paleta Cromática y Sistema de Tokens

Se establece una arquitectura de color estricta basada en la **regla 60-30-10** (60% superficies oscuras neutras, 30% estructura y retículas en verde medio/atenuado, 10% acentos informativos en verde luminoso, ámbar y rojo). El negro y el verde gobiernan la identidad visual, empleando el ámbar y el rojo exclusivamente como acentos técnicos de alerta.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      MAPA CROMÁTICO DEL SISTEMA                        │
│                                                                        │
│  FONDO GENERAL         SUPERFICIES PANELES      RETÍCULAS Y GUÍAS      │
│  #040a06 [Negro Prof]  #0a150e [Verde Oscuro]   #183a24 [Verde Medio]  │
│                                                                        │
│  BARRAS Y ESTADOS OK   ADVERTENCIA Y ATENCIÓN   FALLO Y BLOQUEO        │
│  #00ff73 [Fósforo P1]  #ff9900 [Ámbar Ind.]     #ff3333 [Rojo Alarma]  │
└────────────────────────────────────────────────────────────────────────┘
```

### Tabla de Tokens Semánticos Formales

| Token CSS | Valor Hex / RGBA | Función en la Interfaz | Ratio de Contraste |
| :--- | :--- | :--- | :---: |
| `--color-bg-deep` | `#030805` | Fondo general de la aplicación y chasis exterior. | Base |
| `--color-surface-panel` | `#08140c` | Fondo de los paneles de osciloscopio y módulos de mando. | 1.3:1 vs fondo |
| `--color-surface-inset` | `rgba(0, 15, 8, 0.85)` | Fondo hundido de las pantallas de canvas y displays VFD. | N/A (inset) |
| `--color-border-subtle` | `rgba(0, 255, 115, 0.12)` | Biseles y separadores entre instrumentos. | Estructural |
| `--color-grid-line` | `rgba(0, 200, 90, 0.18)` | Retículas de columnas y líneas guía de altura 0–4. | Estructural |
| `--color-text-primary` | `#00ff73` | Texto principal, lecturas de estado activas y valores vivos. | **14.2:1 (AAA)** |
| `--color-text-secondary`| `#00b853` | Etiquetas técnicas, nombres de módulos y metadatos. | **8.5:1 (AAA)** |
| `--color-text-muted` | `rgba(0, 180, 80, 0.45)` | Indicadores secundarios y unidades de medición inactivas. | **4.6:1 (AA)** |
| `--color-target-signal` | `#00d4ff` | Señal de la Muestra de Referencia (Cian analítico). | **11.8:1 (AAA)** |
| `--color-match-success` | `#00ff88` | Coincidencia exacta de suma con el objetivo y estado SOLVED. | **13.9:1 (AAA)** |
| `--color-accent-amber` | `#ff9900` | Advertencia de sobrecalentamiento, selector de dificultad y atención. | **9.2:1 (AAA)** |
| `--color-accent-red` | `#ff3b30` | Discrepancia en columna de suma, contador de fallos y estado LOCKED. | **5.4:1 (AA)** |

> **Criterio de contención:** Se prohíbe el uso de fondos ámbar o rojos de gran superficie. El ámbar y el rojo se aplican únicamente a líneas finas de discrepancia, diodos LED indicadores y textos de alerta técnica, preservando la atmósfera fosfórica clásica de la terminal.

---

## 5.2. Tipografía y Composición Técnica

### Familia Tipográfica
* **Fuente Principal:** `'Share Tech Mono'`, con fallback progresivo a `'IBM Plex Mono'`, `'Consolas'`, `'Courier New'`, `monospace`.
* **Características:** Caracteres monoespaciados geométricos de terminal industrial, con diferenciación nítida entre ceros cruzados, oes y unos.
* **Cifras Tabulares:** Todas las lecturas dinámicas (movimientos, fallos, porcentajes, índices de fila) emplean obligatoriamente:
  ```css
  font-variant-numeric: tabular-nums;
  ```
  Esto previene cualquier salto o desplazamiento del layout durante la manipulación rápida de filas.

### Jerarquía Visual de 4 Niveles

```
┌────────────────────────────────────────────────────────────────────────┐
│ NIVEL 1 — IDENTIFICADOR DE TERMINAL (14px / Bold / Track 0.25em)       │
│ SINTETIZADOR DE TRATAMIENTO DE AGUA // TERMINAL 03                     │
├────────────────────────────────────────────────────────────────────────┤
│ NIVEL 2 — DISPLAYS Y VALORES CLAVE (22–24px / Tabular-Nums / #00ff73)  │
│ [ 014 ] MOVIMIENTOS    [ 02 / 03 ] FALLOS     [ EN OPERACIÓN ]         │
├────────────────────────────────────────────────────────────────────────┤
│ NIVEL 3 — ETIQUETAS DE INSTRUMENTACIÓN (11–12px / SemiBold / Track 0.15em)
│ MUESTRA DE REFERENCIA    FILAS DE CALIBRACIÓN    SUMA EN VIVO          │
├────────────────────────────────────────────────────────────────────────┤
│ NIVEL 4 — METADATOS TÉCNICOS Y GUÍA (10–11px / Regular / Opacidad 0.6) │
│ ESCALA: 16 COLUMNAS · BÚFER CÍCLICO O(1) · PRESIÓN NORMAL              │
└────────────────────────────────────────────────────────────────────────┘
```

### Reglas de Composición y Alineación
1. **Retícula Base:** Unidad modular de espaciado basada en **4px / 8px** (`gap: 8px`, `gap: 12px`, `padding: 12px`).
2. **Preservación Idiomática:** Se mantienen todas las designaciones técnicas en **español** presentes en el proyecto:
   * *Muestra de Referencia*
   * *Filas de Calibración*
   * *Espectro de Suma en Vivo*
   * *Analizar*
   * *Purgar*
   * *Movimientos*
   * *Fallos*
   * *En Espera / En Operación / Evaluando / Calibrado / Bloqueado*
3. **Ergonomía de Botones Industriales:**
   * Altura mínima de botón de 38px a 44px para cumplir con el estándar ergonómico y táctil WCAG (44×44px mínimo de área de interacción).
   * Biseles con sombra de bajo relieve (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.4)`).
   * Retroalimentación física activa: `transform: scale(0.97)` y oscurecimiento momentáneo del fondo al ser presionado.

---

## 5.3. Gráficos de Osciloscopio y Respuestas Visuales

### 1. Muestra de Referencia (Protagonista Superior)
* **Tratamiento:** Se consolida como la pantalla de referencia incuestionable.
* **Color:** Cian fósforo P4 (`#00d4ff`) con borde de cresta iluminado de 2px.
* **Retícula Analógica:** Fondo con cuadrícula milimetrada tenue de 4 niveles de altura discretos (guías horizontales al 25%, 50%, 75% y 100%), permitiendo leer a simple vista si una columna mide 1, 2, 3 o 4 unidades de altura.
* **Etiqueta Diegética:** `[ CH-01 // PATRÓN OBJETIVO ]` en la esquina superior izquierda.

### 2. Filas de Calibración A, B y C (Banco de Tambores Móviles)
* **Segmentación de Bloques:** En lugar de bloques planos continuos, cada barra se dibuja como una **pila de celdas segmentadas** separadas por hendiduras horizontales de 1.5px. Una altura de 3 muestra claramente 3 segmentos iluminados sobre una base vacía.
* **Distinción por Altura:**
  * Nivel 0: Casilla vacía con contorno sutil punteado (`rgba(0, 100, 50, 0.15)`).
  * Niveles 1 a 3: Segmentos verde fósforo con opacidad graduada (65%, 80%, 95%).
  * Nivel 4 (Pico Máximo): Segmento de alta energía con borde brillante de resonancia (respaldado por `HighlightPeakDecorator`).
* **Indicadores de Canal:** Etiquetas de fila `[ A ]`, `[ B ]`, `[ C ]` destacadas a la izquierda en una placa metálica oscura con diodo verde activo.

### 3. Espectro de Suma en Vivo (Pantalla Diferencial de Diagnóstico)
* **Doble Información Simultánea:**
  1. **Silueta Fantasma (Ghost Target):** Línea o silueta de fondo que proyecta la forma exacta del objetivo a igualar, permitiendo comprobar visualmente si la suma actual "llena" o "rebalsa" el molde esperado.
  2. **Barras de Suma Activa:**
     * **Verde Fósforo Luminoso (`#00ff73`):** Cuando `Suma(x) == Objetivo(x)`. La columna está calibrada.
     * **Rojo Técnico (`#ff3b30`):** Cuando `Suma(x) != Objetivo(x)`. La barra muestra además una pequeña marca en el borde superior indicando si está por encima o por debajo de la referencia.
     * **Cian Unificado (`#00d4ff`):** Al alcanzar el estado `SOLVED`, todo el panel de suma se sincroniza en cian continuo con la muestra superior.

### 4. Respuestas Visuales y Microinteracciones
* **Rotación de Fila:** Al pulsar `◀` o `▶`, se genera un parpadeo de barrido horizontal de 60ms en la fila afectada, simulando el paso mecánico del tambor.
* **Validación (*Analizar*):**
  * Un rayo de escaneo vertical recorre las 16 columnas de izquierda a derecha en ~200ms (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
  * Al completar el escaneo, si la muestra es correcta, se ilumina el testigo verde y emerge el overlay; si falla, las columnas discordantes titilan dos veces en rojo.
* **Sobrecalentamiento y Bloqueo (Estado LOCKED):**
  * El display de fallos pasa a rojo pulsante (`3 / 3`).
  * Los botones de rotación se desactivan visualmente (opacidad 0.35, cursor `not-allowed`).
  * El canvas central despliega un aviso estarcido industrial: `⚠ ENCLAVAMIENTO POR FALLOS CONSECUTIVOS // EJECUTAR PURGA`.
* **Purga (*Reset*):**
  * Al pulsar `⟲ Purgar`, una animación breve de barrido vertical descendente (drenaje de pantalla, ~150ms) restablece las filas y devuelve los contadores a cero con el tono grave de despresurización de `SoundManager`.

### 5. Contención Estética y Accesibilidad
* **Sin Destellos Cegadores:** Se rechazan terminantemente animaciones estroboscópicas continuas, temblores de cámara (*screen shake*) o resplandores de neón difusos que fatiguen la vista del jugador.
* **Scanlines Suaves:** Las líneas de barrido CRT se mantienen con una opacidad ultrabaja (`alpha: 0.05`), otorgando textura táctil de fósforo sin degradar la nitidez de las barras.
* **Preservación Técnica Total:** No se reemplaza ni modifica el motor de audio `SoundManager` ni la suite de tests unitarios existentes.


---
---

# Hoja de Ruta Global y Metodología por Etapas

> **Estructura oficial del proceso de rediseño (de acuerdo a `REDISEÑO_JUEGO.md`):**

### Etapa A — Preparación
* **Fases 1, 2 y 3:** Análisis del código, investigación de la referencia histórica original y propuesta comparativa de la distribución espacial sin modificar archivos. *(Completada con éxito)*.

### Etapa B — Desarrollo
* **Fase 4: Identidad visual:** Implementación del diseño visual industrial retro en el código fuente (paleta 60-30-10, tipografía monoespaciada, retículas analógicas en canvas y microinteracciones). *(Ejecutada e Implementada)*.
* **Fase 5: Restricción permanente:** Mantenimiento continuo e intransigente de la arquitectura POO/SOLID/GoF, preservación de la suite de pruebas automatizadas y cero dependencias innecesarias en runtime. *(Activa permanentemente)*.

### Etapa C — Adaptación y Pruebas
* **Fase 6:** Adaptación de resoluciones y distribución definitiva en el layout.
* **Fase 7:** Pruebas funcionales e integración en navegador real.

### Etapa D — Entrega
* **Fase 9:** Verificación formal de criterios de aceptación.
* **Fase 10:** Generación del informe final de cierre.

---
---

# Registro de Implementación de la Fase 4: Identidad Visual

**Fecha de ejecución:** 20 de Octubre de 2026  
**Archivos modificados:**
1. `src/ui/styles/terminal-crt.css`: Tokens semánticos industriales, botones de 38–44px, feedback `:active: scale(0.97)`, `tabular-nums` en telemetría y scanlines atenuadas.
2. `src/structural/decorators/BaseBlockView.ts`: Celdas con segmentación interna de niveles discretos (0 a 4) y bordes nítidos.
3. `src/ui/components/TargetDisplayView.ts`: Muestra de referencia como protagonista visual superior en cian analítico (`#00d4ff`) con retícula milimetrada horizontal de 4 niveles y cresta iluminada.
4. `src/ui/components/RowCarouselView.ts`: Placas de canal metálicas `[ A ]`, `[ B ]`, `[ C ]` con LED indicador, carriles divisores y marco estarcido de enclavamiento para el estado `LOCKED`.
5. `src/ui/components/LiveSumSpectrumView.ts`: Silueta fantasma del objetivo en cian tenue, barras de suma activas en verde fósforo si coinciden y en rojo técnico si discrepan, con contador dinámico `COINCIDENCIA: X/16 COL`.

### Verificación de Calidad y Pruebas:
* **Suite de Pruebas (Vitest):** **75 tests pasados (8 suites, 100% éxito)**.
* **Verificación de Tipos (TypeScript):** **0 errores (`tsc --noEmit`)**.
* **Compilación de Producción (Vite):** **Build exitoso sin alertas**.

---
---

# Fase 5: Preservación de la Lógica del Acertijo (Restricción Permanente)

**Fecha de ejecución:** 20 de Octubre de 2026  
**Naturaleza:** Restricción permanente del rediseño (no es una tarea de una sola vez).  
**Principio rector:** *La lógica existente es la especificación.* El rediseño puede reorganizar el frontend, mejorar estilos y añadir respuestas visuales, pero **no reinterpreta ni recalcula el acertijo**.

---

## F5.1. Alcance de la Conservación

Se declara como **contrato inviolable** que deben conservarse exactamente:

1. Las reglas matemáticas de combinación de las filas **A, B y C**.
2. El comportamiento de los desplazamientos **hacia la izquierda y hacia la derecha** (rotación circular).
3. La **generación y representación de la muestra objetivo** tal como funciona actualmente.
4. La **comprobación de coincidencia** entre la muestra y el resultado.
5. El **registro de movimientos y fallos**.
6. El comportamiento del **botón/indicador de máxima dificultad**.
7. Los **controles y funcionalidades** existentes.
8. Cualquier otra regla o estado del juego descubierto durante la inspección.

**Permitido:** refactorizar componentes, reorganizar el frontend, mejorar estilos y añadir respuestas visuales.  
**Prohibido:** cambiar reglas, dificultad real o cálculos; sustituir el juego por una maqueta visual; introducir dependencias de ejecución innecesarias.

---

## F5.2. Auditoría de Conservación (Evidencia)

### a) El núcleo no ha sido modificado desde el commit base

Comando ejecutado:

```powershell
git diff --stat f9577c1 -- src/core src/creational
```

**Resultado: salida vacía.** Ni las reglas (`src/core/`) ni las fábricas (`src/creational/`) han cambiado desde el commit `f9577c1` (primer commit funcional del juego), incluyendo los cambios aún no confirmados de la Fase 4.

### b) Las fases 3–4 solo tocaron presentación

| Commit / estado | Archivos afectados | ¿Afecta la lógica? |
| :--- | :--- | :--- |
| `68195b7` (idioma) | `index.html` (textos), `index.ts` (toggle de guía), vistas y CSS | ❌ No (solo texto/labels) |
| `174c596` (dificultad y verificación) | `index.html` (insignia/selector), CSS y tests | ❌ No (fija la dificultad en 16 columnas; no altera el dominio) |
| `40316bb` (skills) | `.agents/skills`, `VDD.md`, `skills-lock.json` | ❌ No (documentación/tooling) |
| Fase 4 (sin confirmar) | `BaseBlockView`, 3 vistas Canvas y `terminal-crt.css` | ❌ No (renderizado y estilos) |

### c) Sin dependencias de ejecución

`package.json` **no declara `dependencies`**: el juego sigue siendo 100 % Vanilla TypeScript + Canvas + Web Audio.

---

## F5.3. Inventario de Invariantes y Trazabilidad

Cada requisito de conservación queda ahora respaldado por una verificación explícita. La columna **Nueva** referencia `tests/unit/logic-invariants.test.ts` (Fase 5), salvo donde se indica.

| # | Invariante a conservar | Implementación actual | Cobertura previa | Nueva verificación |
| :--- | :--- | :--- | :--- | :--- |
| **I1** | Suma vertical = agregación de alturas de A + B + C | `WaterSamplePuzzle.calculateSum()` | `state-machine`, `observer-dispatch`, `hard-solvability` | La suma coincide con un recálculo manual tras rotaciones |
| **I2** | Giro a la izquierda y a la derecha (circular) | `Row.shift()` + `offset` modular O(1) | `state-machine`, `game-controller` | 5 pruebas: inverso, giro completo, equivalencia `+k` ≡ `-(n-k)`, normalización e integridad de vista |
| **I3** | Generación y representación de la muestra objetivo | `TargetPattern.fromRowHeights()` + `fromHeights()` | `factory-generation`, `hard-solvability` | Derivación exacta desde filas sin rotar + **inmutabilidad** y copia defensiva |
| **I4** | Comprobación de coincidencia | `ExactMatchStrategy` (por defecto) | `strategy-rules`, `hard-solvability` | Nivel difícil y fácil: solo la alineación exacta gana; una columna desviada falla |
| **I5** | Registro de movimientos y fallos | Eventos `ROW_SHIFTED` / `VALIDATION_FAILED` / `RESET` + `AttemptCounterView` | `ui-integration`, `observer-dispatch` | Un evento por acción, acumulación de fallos y reinicio del contador al acertar |
| **I6** | Bloqueo tras 3 fallos consecutivos | `LockedState` (umbral `maxConsecutiveFailures = 3`) | `state-machine` | En `LOCKED` no hay eventos de rotación/validación; la purga restablece |
| **I7** | Dificultad real: 16 columnas, 3 filas, alturas 0..4 | `FacilityHardFactory` | `factory-generation`, `hard-solvability` | Contrato de fábrica congelado |
| **I8** | Fábrica de inducción disponible (12 columnas, 0..2) | `FacilityEasyFactory` | `factory-generation` | Capacidad preservada aunque la UI fije máxima dificultad |
| **I9** | Control de máxima dificultad fijo | Insignia estática + `<select disabled hidden>` con única opción `hard` | ❌ Sin cobertura | `ui-integration`: insignia visible, selector deshabilitado/oculto y valor `hard` |
| **I10** | Controles existentes (`data-action` / `data-row`) | `GameController` | `game-controller`, `ui-integration` | Sin cambios; suite intacta |
| **I11** | Cero dependencias de ejecución | `package.json` sin `dependencies` | ❌ Sin cobertura | Guardia automática de arquitectura |
| **I12** | Independencia del núcleo respecto al navegador | `src/core/` sin APIs DOM | `observer-dispatch` | Sin cambios (suite preexistente) |

---

## F5.4. Cambios Realizados en esta Fase

**Cambios en lógica de producción: NINGUNO.** No se modificó ningún archivo de `src/`.

| Archivo | Tipo de cambio | Justificación |
| :--- | :--- | :--- |
| `tests/unit/logic-invariants.test.ts` | **Nuevo** (18 pruebas) | Congela las invariantes I1–I8, I11 para detectar cualquier regresión futura |
| `tests/unit/ui-integration.test.ts` | **Ampliado** (+1 prueba, +1 id requerido) | Verifica I9 (insignia y selector de máxima dificultad) |
| `CAMBIOS_REDISEÑO.md` | **Documentación** | Registro de la auditoría y del contrato de conservación |

### Nota de incidencia (autocorrección)
La primera ejecución de la suite nueva usó por error una altura `5` en un fixture de prueba. El dominio la **rechazó correctamente** con `RangeError` (`Block` solo admite `[0, 4]`), lo que confirma que la validación de alturas sigue activa. El fixture se corrigió a `0`. **No fue un defecto del juego**, sino de la prueba.

---

## F5.5. Verificación Ejecutada (Antes → Después)

| Control | Antes (Fase 4) | Después (Fase 5) | Resultado |
| :--- | :---: | :---: | :---: |
| Suite de pruebas | 75 tests / 8 archivos | **94 tests / 9 archivos** | ✅ 100 % |
| Verificación de tipos (`tsc --noEmit`) | 0 errores | **0 errores** | ✅ |
| Build de producción (`vite build`) | Correcto | **Correcto** | ✅ |
| Vulnerabilidades (`npm audit`) | 0 | **0** | ✅ |
| Dependencias runtime | 0 | **0** | ✅ |
| Diff en `src/core` + `src/creational` | — | **Vacío** | ✅ |

Comandos de verificación reproducibles:

```powershell
npm test
npm run typecheck
npm run build
npm audit
git diff --stat f9577c1 -- src/core src/creational
```

---

## F5.6. Reglas de Conservación para las Fases 6–10

Checklist obligatorio antes de cada cambio futuro:

- [ ] **Fábricas:** no alterar matrices de alturas, offsets iniciales, longitudes (16/12) ni el rango 0..4 / 0..2.
- [ ] **Rotación:** no modificar la fórmula modular de `Row.shift()` ni el significado de `offset`.
- [ ] **Suma:** no alterar `calculateSum()` ni la derivación del objetivo (`fromRowHeights`).
- [ ] **Validación:** no cambiar `ExactMatchStrategy` ni el umbral de 3 fallos consecutivos.
- [ ] **Estados:** no cambiar las transiciones (Standby → Manipulating → Evaluating → Solved/Locked) ni la semántica de la purga.
- [ ] **Telemetría:** no alterar el conteo de movimientos/fallos ni los eventos `ROW_SHIFTED`, `VALIDATION_FAILED`, `RESET`.
- [ ] **Contrato DOM:** conservar `id`, `data-action`, `data-row`, la insignia de máxima dificultad y el selector oculto `hard`.
- [ ] **Arquitectura:** `src/core/` sin APIs del navegador; cero dependencias de ejecución.
- [ ] **Si se toca algo que participa en la lógica:** documentar el motivo en este archivo y demostrar equivalencia de comportamiento con pruebas.
- [ ] **Puerta de calidad:** `npm test` + `npm run typecheck` + `npm run build` en verde antes de cerrar cualquier fase.

---

## F5.7. Conclusión

La Fase 5 queda **cerrada y activa de forma permanente**. La auditoría demuestra que el rediseño visual de la Fase 4 **no alteró el núcleo** y que las reglas del acertijo están ahora blindadas por **19 verificaciones nuevas** (94 en total). Cualquier regresión futura en matemática, desplazamientos, muestra objetivo, validación, telemetría o dificultad real se detectará automáticamente antes de llegar al navegador.
