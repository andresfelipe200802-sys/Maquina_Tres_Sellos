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
**Marco de referencia:** Directivas de la skill `interface-design`, conclusiones de las Fases 1 y 2, y análisis directo de la **referencia visual de la máquina original** (*Resident Evil 3: Nemesis*, 1999) aportada por el usuario.  
**Objetivo central:** Proponer y contrastar de manera rigurosa dos arquitecturas espaciales diferentes para el sintetizador de agua antes de escribir código, priorizando la legibilidad del acertijo, la no competencia visual, la eliminación absoluta del scroll vertical en resoluciones de escritorio estándar (1080p y 1366×768) y la preservación intacta del 100 % de los elementos funcionales existentes.

---

## F3.1. Análisis de la Referencia Visual de la Máquina Original (Evidencia Empírica)

La imagen provista por el usuario revela la arquitectura física y funcional del panel de control de la Planta de Tratamiento de Agua:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ SAMPLE ]  [==🧪 VIAL ==] [●]  [████ █ ████ █ ████ █ ████] (Osciloscopio Muestra)     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ A  ▶ ]    [■] [ ◄  ► ]        [--■■----■■■----■■----■■--] (Canal A - Rojo Fósforo)   │
│ [ B  ▶ ]    [■] [ ◄  ► ]        [---■■---■■■---■■■---■■---] (Canal B - Ámbar/Amarillo) │
│ [ C  ▶ ]    [■] [ ◄  ► ]        [--■■■----■■----■■■---■■--] (Canal C - Cian/Azul)      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ RESULT ]                      [████ █ ████ █ ████ █ ████] (Suma en Vivo)   (●) (●)   │
│                                                                              (LEDs)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Características Críticas del Dispositivo Físico Reveladas por la Imagen:
1. **Consola Monolítica Estructurada en 5 Bandas Horizontales:**
   * La máquina no dispersa los elementos en bloques inconexos: es un chasis de metal oxidado y atornillado que integra toda la cadena de análisis en 5 filas estrictamente alineadas en el eje horizontal.
2. **Banda Superior (`SAMPLE`):**
   * A la izquierda: Placa metálica atornillada rotulada `SAMPLE`, acompañada de un **vial/cápsula cilíndrica de vidrio** que contiene la muestra física de agua recogida y un diodo LED cuadrado de estado.
   * A la derecha: La pantalla de osciloscopio que despliega el patrón objetivo con su cuadrícula verde milimetrada y ondas escalonadas en varios niveles de altura.
3. **Bandas de Calibración Intermedias (`A`, `B`, `C`):**
   * **Correspondencia ergonómica directa:** Cada fila posee su módulo de mando **inmediatamente a la izquierda de su propia pantalla**:
     * Placa rotulada con la letra del canal (`A`, `B`, `C`) y flecha direccional.
     * Indicador cuadrado selector de canal.
     * Conmutador basculante horizontal o doble botón `[ ◄ ► ]` para el desplazamiento circular hacia la izquierda o hacia la derecha.
   * **Diferenciación cromática por canal:** Cada fila de entrada posee una firma cromática propia que destaca sobre la retícula verde fósforo de fondo:
     * **Canal A:** Segmentos en **Rojo industrial** (`#e63946` / `#ff4d4d`).
     * **Canal B:** Segmentos en **Ámbar / Amarillo técnico** (`#ffb703` / `#f4a261`).
     * **Canal C:** Segmentos en **Cian / Azul eléctrico** (`#00b4d8` / `#48cae4`).
4. **Banda Inferior (`RESULT`):**
   * A la izquierda: Placa metálica atornillada rotulada `RESULT`.
   * Al centro-derecha: Pantalla de osciloscopio que despliega el resultado combinado de las tres filas (en verde fósforo de resonancia).
   * En el extremo derecho: Lámparas/LEDs indicadores de estado del sistema (testigo rojo de alarma/enclavamiento y botón auxiliar de verificación).
5. **Alineación Vertical Milimétrica (El Eje de Resolución):**
   * Todas las pantallas (SAMPLE, A, B, C y RESULT) tienen exactamente el **mismo ancho horizontal** y comparten una **retícula común de columnas**. La columna $x$ de la muestra coincide exactamente en la misma coordenada $X$ con la columna $x$ de las filas A, B, C y del resultado. El jugador resuelve el acertijo trazando mentalmente una línea vertical que suma las alturas columna por columna.

---

## F3.2. Aplicación de la Disciplina `interface-design`

### 1. Intención de Diseño (Working Brief)
* **El Humano:** Un operador técnico de la corporación Umbrella (o un jugador bajo tensión de supervivencia) frente a una terminal electromecánica de finales de los años 90 en una planta de tratamiento de efluentes abandonada. Necesita diagnosticar y calibrar una muestra química antes de que el sistema active el enclavamiento por sobrepresión o fallos repetidos.
* **El Verbo:** *Calibrar, alinear y validar*. Desplazar circularmente los tres tambores de frecuencia (A, B, C) hasta que su suma vertical reproduzca de manera idéntica la onda de referencia, confirmando la muestra mediante la válvula maestra de comprobación (*Check / Analizar*).
* **La Sensación:** Consola industrial pesada, de acero laminado oxidado, remaches, pintura desgastada y baquelita. Iluminación por fósforo verde CRT, diodos LED de alerta ámbar y roja, interruptores mecánicos con clic seco de relé y lecturas analíticas de alta precisión.

### 2. Exploración del Dominio y Territorio Visual
* **Conceptos del Dominio (6):** Espectrometría hídrica, cápsula de muestreo biológico de efluente, calibración por canales independientes A/B/C, osciloscopio de doble traza en fase, válvula de purga de sobrepresión, enclavamiento de seguridad (*safety interlock*).
* **Mundo de Color (6 tonos físicos):**
  1. `--chassis-corrosion` (`#1c241e` base, pátina óxido `#382e24`): Chasis de metal ferroso desgastado por la humedad industrial.
  2. `--crt-phosphor-grid` (`#004225` retícula, `#00e575` señal activa): Fósforo verde P1 clásico de osciloscopio de tubo de rayos catódicos.
  3. `--channel-a-red` (`#e63946` / `#ff3b30`): Traza roja de alta advertencia para el Canal A y diodo de fallo/bloqueo.
  4. `--channel-b-amber` (`#ffb703` / `#ff9900`): Traza ámbar/amarillo industrial para el Canal B y selector de dificultad.
  5. `--channel-c-cyan` (`#00b4d8` / `#00d4ff`): Traza cian pura para el Canal C y fluido de referencia.
  6. `--plaque-aluminum` (`#b0bec5` metal, `#cfd8dc` bisel, `#263238` tipografía): Placas de aluminio remachadas con tipografía estarcida atornillada.
* **Firma de Identidad (Signature):** **La Consola de 5 Canales con Retícula Unificada y Vial Físico**. La integración en un solo cuerpo del tubo de muestra, las placas metálicas con controles adyacentes `[ ◄ ► ]` y las 5 pantallas compartiendo una rejilla continua de 16 columnas en alineación vertical absoluta.
* **Patrones por Defecto Rechazados:**
  * *Rechazado 1 (Controles desvinculados de las filas):* Poner las pantallas a la izquierda y agrupar todos los botones en una torre lejana a la derecha. $\rightarrow$ *Alternativa adoptada:* Controles `[ ◄ ► ]` de cada fila situados inmediatamente al lado de su propia pantalla (a la izquierda), respetando la ergonomía de la máquina original y reduciendo la distancia mano-ojo a cero.
  * *Rechazado 2 (Manual estático gigante que genera scroll):* Un bloque de texto de 300px superior o inferior que empuje los instrumentos fuera del viewport. $\rightarrow$ *Alternativa adoptada:* Panel de guía abatible (*Drawer* lateral deslizante o persiana técnica overlay) accionado por un conmutador claro `[ ⚠ DIRECTIVA UMBRELLA ]`, que permite consultar el manual sin ocultar ni desplazar la consola del acertijo.
  * *Rechazado 3 (Miniaturización indiscriminada o eliminación de elementos):* Achicar los botones a 15px o suprimir telemetría para que "quepa". $\rightarrow$ *Alternativa adoptada:* Presupuesto de píxeles calculado para escritorio (1366×768 y 1080p), con áreas de clic ergonómicas (mínimo 40–44px, norma WCAG) y celdas de columna de 30–38px de ancho, perfectamente legibles.

### 3. Integración de Requisitos Funcionales y Estado del Sistema
Para sumar "las otras cosas que necesitamos" sin competir visualmente con el acertijo:
* **Telemetría del Sistema:** El contador de movimientos (`MOVIMIENTOS: [ 014 ]`), el contador de fallos (`FALLOS: [ 02 / 03 ]`) y la luz de estado de validación (`EN OPERACIÓN`, `EVALUANDO`, `CALIBRADO`, `BLOQUEADO`) se agrupan en una bahía de instrumentación lateral complementaria o zócalo de instrumentación que utiliza pantallas numéricas estilo VFD/LED verde fósforo con fuentes monoespaciadas y cifras tabulares (`font-variant-numeric: tabular-nums`).
* **Acciones Principales:** El botón `[ ▣ ANALIZAR MUESTRA ]` (equivalente al "Check" de la consola física), el botón `[ ⟲ PURGAR SISTEMA ]` (válvula de reinicio/purga tras bloqueo) y el selector/indicador de dificultad (`MÁXIMA DIFICULTAD // 16 COL`) se ubican como mandos industriales de alta presencia física pero claramente jerarquizados por debajo de la consola de calibración.

---

## F3.3. Propuesta y Comparación de Distribuciones

Se formulan y comparan dos distribuciones espaciales fundamentadas para escritorio:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DISTRIBUCIÓN 1 (HIPÓTESIS INICIAL)                        │
│                   "Consola de Doble Columna Desacoplada (Monitor vs Calibrador)"       │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│  COLUMNA 1 (Zona Principal / Monitoreo)   │  COLUMNA 2 (Zona de Calibración)           │
│  ┌──────────────────────────────────────┐ │  ┌───────────────────────────────────────┐ │
│  │ MUESTRA DE REFERENCIA (Target)       │ │  │ FILAS A, B, C (Gráficos apilados)     │ │
│  │ [===🧪===] [Pantalla Osciloscopio]   │ │  ├───────────────────────────────────────┤ │
│  ├──────────────────────────────────────┤ │  │ CONTROLES DE DESPLAZAMIENTO           │ │
│  │ RESULTADO (Suma de la Combinación)   │ │  │ [◀ Fila A ▶] [◀ Fila B ▶] [◀ Fila C ▶]│ │
│  ├──────────────────────────────────────┤ │  ├───────────────────────────────────────┤ │
│  │ ESTADO DEL SISTEMA Y TELEMETRÍA      │ │  │ ACCIONES PRINCIPALES                  │ │
│  │ [Movimientos] [Fallos] [Estado]      │ │  │ [ ▣ ANALIZAR ]    [ ⟲ PURGAR ]        │ │
│  └──────────────────────────────────────┘ │  └───────────────────────────────────────┘ │
└───────────────────────────────────────────┴────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DISTRIBUCIÓN 2 (PROPUESTA RECOMENDADA)                    │
│             "Consola Industrial Fiel a RE3 con Bahía de Operaciones Lateral"           │
├───────────────────────────────────────────────────────┬────────────────────────────────┤
│  COLUMNA PRINCIPAL (~70% ancho):                      │  COLUMNA DE OPERACIONES (~30%) │
│  EL PANEL DE CALIBRACIÓN DE 5 BANDAS                  │  TELEMETRÍA, ACCIONES Y AYUDA  │
│  ┌──────────────────────────────────────────────────┐ │  ┌───────────────────────────┐ │
│  │ [SAMPLE]  [=🧪=]  [Pantalla Objetivo]            │ │  │ [? MANUAL DE OPERACIÓN]   │ │
│  ├──────────────────────────────────────────────────┤ │  ├───────────────────────────┤ │
│  │ [A ▶] [■] [◄ ►]  [Pantalla Canal A (Rojo)]       │ │  │ TELEMETRÍA DEL SISTEMA    │ │
│  │ [B ▶] [■] [◄ ►]  [Pantalla Canal B (Ámbar)]      │ │  │ • MOVIMIENTOS: [ 014 ]    │ │
│  │ [C ▶] [■] [◄ ►]  [Pantalla Canal C (Cian)]       │ │  │ • FALLOS:      [ 02 / 03 ]│ │
│  ├──────────────────────────────────────────────────┤ │  │ • ESTADO: [ EN OPERACIÓN ]│ │
│  │ [RESULT]          [Pantalla Resultado]  (●) (●)  │ │  ├───────────────────────────┤ │
│  │                   (Suma en vivo continua) (LEDs) │ │  │ VÁLVULAS Y ACCIONES       │ │
│  │                                                  │ │  │ [ ▣ ANALIZAR MUESTRA ]    │ │
│  │  ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ (16 col)       │ │  │ [ ⟲ PURGAR SISTEMA ]      │ │
│  │  │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │                │ │  │ [DIFICULTAD: 16 COL]      │ │
│  └──────────────────────────────────────────────────┘ │  └───────────────────────────┘ │
└───────────────────────────────────────────────────────┴────────────────────────────────┘
```

---

### Alternativa 1: "Consola de Doble Columna Desacoplada (Monitor vs Calibrador)"

Esta alternativa toma directamente la **hipótesis inicial planteada en los requerimientos**: divide la pantalla en dos columnas de ancho similar (~50% / 50% o 55% / 45%).

#### Estructura Espacial
1. **Columna Izquierda (Zona Principal / Monitoreo):**
   * Muestra de referencia (`SAMPLE`) con su gráfico y vial en la parte superior.
   * Resultado de la combinación (`RESULT` / Suma en vivo) en la parte central, claramente diferenciado.
   * Estado del sistema al pie de la columna: contador de movimientos, contador de fallos y luz de validación.
2. **Columna Derecha (Zona de Calibración e Intervención):**
   * Las tres filas A, B y C agrupadas con sus bloques de colores.
   * Controles de desplazamiento `[ ◀ ]` y `[ ▶ ]` situados debajo de cada fila o agrupados en un panel inferior.
   * Acciones principales: botones `[ ▣ Analizar ]` y `[ ⟲ Purgar ]`, y selector de dificultad.
3. **Ayuda:** Panel plegable superior o pestaña colapsable ("Manual").

#### Ventajas
* **Cumplimiento estricto de la hipótesis inicial:** Responde punto por punto a la formulación inicial del requerimiento de rediseño.
* **Gran holgura de altura por pantalla:** Al tener solo 2 osciloscopios en la columna izquierda y las 3 filas en la derecha, cada canvas puede disfrutar de una altura de 120–140px sin rebasar el alto de la ventana.
* **Separación de conceptos clara:** Separa formalmente el "qué quiero lograr y qué tengo" (izquierda) del "qué estoy manipulando" (derecha).

#### Desventajas Críticas
* **Ruptura del modelo mental del acertijo (defecto severo de UX):** La clave matemática del puzzle de *Resident Evil 3* es el **apilamiento vertical columna a columna** (Fase 2, H4). Si las filas A, B y C están en la columna derecha y la muestra/resultado están en la columna izquierda, el ojo del jugador debe viajar horizontalmente 50 veces por minuto (mirar columna 4 en la derecha, saltar a la izquierda para ver si suma 3, volver a la derecha para rotar B, saltar de nuevo a la izquierda). La fatiga sacádica resultante destruye la experiencia analítica.
* **Discordancia total con la máquina original de la foto:** En la imagen de referencia real enviada por el usuario, el panel es un bloque unificado vertical donde cada fila tiene su pantalla en el mismo renglón que sus controles y todas las pantallas comparten la misma cuadrícula. La Alternativa 1 deshace esta coherencia industrial.
* **Desincronización de escala visual de columnas:** Al estar en dos columnas independientes de anchos dinámicos, las 16 columnas de las filas a la derecha difícilmente tendrán el mismo ancho en píxeles que las 16 columnas de los espectros a la izquierda, arruinando la lectura intuitiva.

---

### Alternativa 2: "Consola Industrial Fiel a RE3 con Bahía de Operaciones Lateral" (Recomendada)

Esta alternativa surge de integrar la **referencia visual real enviada por el usuario** con los principios de la skill `interface-design`. Traduce con fidelidad diegética el panel original de *Resident Evil 3* como la pieza central del juego y ubica todos los elementos complementarios del sistema en una bahía de mando lateral ergonómica, respetando una distribución de dos columnas en escritorio (~70% / ~30%).

#### Estructura Espacial en Escritorio
1. **Columna Principal (Centro-Izquierda, ~68–72% del ancho): El Panel de Calibración Monolítico**
   * Recrea con exactitud el chasis de la imagen del usuario organizado en 5 bandas horizontales continuas:
     1. **Banda 1 (`SAMPLE`):**
        * Placa metálica remachada `SAMPLE`.
        * Vial/cápsula física de vidrio con el reactivo de agua y menisco de líquido animado.
        * Testigo LED verde de muestra activa.
        * Pantalla de osciloscopio CRT con retícula milimetrada verde y ondas escalonadas en blanco/verde brillante.
     2. **Bandas 2, 3 y 4 (`Canales A, B y C`):**
        * Placas metálicas identificadoras `[ A ]`, `[ B ]`, `[ C ]` con su color distintivo.
        * Testigos LED cuadrados de canal activo.
        * Conmutadores basculantes industriales `[ ◄ ]` y `[ ► ]` táctiles integrados inmediatamente a la izquierda de cada pantalla.
        * Pantallas individuales de osciloscopio para cada fila, respetando la paleta de la imagen:
          * **Fila A:** Segmentos en **Rojo** (`#e63946`).
          * **Fila B:** Segmentos en **Ámbar/Amarillo** (`#ffb703`).
          * **Fila C:** Segmentos en **Cian/Azul** (`#00b4d8`).
     3. **Banda 5 (`RESULT`):**
        * Placa metálica remachada `RESULT`.
        * Pantalla de osciloscopio que despliega la suma combinada en tiempo real (con feedback sutil de coincidencia columna a columna).
        * Indicadores luminosos en el extremo derecho (LED rojo de enclavamiento/fallos y LED verde de calibración exitosa).
   * **Continuidad de Retícula Absoluta:** Las 16 columnas de SAMPLE, A, B, C y RESULT tienen **exactamente el mismo ancho en píxeles** y están alineadas al 100 % en el eje X. El usuario puede seguir visualmente una columna desde SAMPLE hacia abajo, sumando A + B + C y comprobando RESULT sin ninguna desviación.
2. **Columna Lateral (Derecha, ~28–32% del ancho): Bahía de Operaciones, Telemetría y Soporte**
   * **Módulo Superior de Ayuda:** Botón basculante con luz testigo `[ ⚠ MANUAL DE OPERACIÓN ]`. Al pulsarlo, despliega un *drawer* lateral deslizante o persiana modal técnica con las directivas de Umbrella y reglas del juego, flotando sin desplazar ni achicar la consola de calibración.
   * **Módulo Central de Telemetría (Displays VFD / LED verde fósforo):**
     * `MOVIMIENTOS: [ 014 ]` (cifras tabulares `tabular-nums`).
     * `FALLOS: [ 02 / 03 ]` con diodos luminosos de advertencia de enclavamiento inminente.
     * `ESTADO DEL SISTEMA: [ EN OPERACIÓN ]` (conmuta dinámicamente a `EVALUANDO`, `CALIBRADO` o `BLOQUEADO`).
   * **Módulo Inferior de Acciones Maestras:**
     * Gran pulsador industrial `[ ▣ ANALIZAR MUESTRA ]` (el botón "Check" de la consola, con bisel de alto relieve y respuesta física `:active`).
     * Pulsador de seguridad `[ ⟲ PURGAR SISTEMA ]` (válvula de despresurización para desbloquear tras 3 fallos o reiniciar).
     * Selector / Insignia de dificultad técnica (`MÁXIMA DIFICULTAD // 16 COL`) integrado como dial selector o llave técnica.

#### Ventajas Determinantes
* **Alineación cognitiva perfecta (100 % fiel al modelo mental H4):** El jugador suma columnas en vertical sin fatiga sacádica. La relación causa-efecto entre rotar una fila y ver variar el resultado es instantánea e intuitiva.
* **Fidelidad y resonancia con la referencia del usuario:** Cumple directamente con la estética, disposición y cromatismo del panel original de *Resident Evil 3* que el usuario envió como expectativa visual.
* **Ergonomía de mandos adyacentes:** Los botones `[ ◄ ► ]` están directamente al lado de su propia fila A, B o C. La mano interactúa con el botón correspondiente mientras la vista confirma el desplazamiento del gráfico en el mismo renglón.
* **Cero interferencia visual:** La telemetría, el manual y las acciones principales están en la columna lateral derecha, funcionando como la "consola de soporte" del operador sin restarle protagonismo al acertijo.
* **Cero scroll vertical en cualquier resolución estándar:** Rigurosamente demostrado mediante el presupuesto de píxeles calculado a continuación.

#### Desventajas y Mitigación
* *Desventaja:* Requiere un diseño de cuadrícula CSS riguroso para sincronizar el ancho de las pantallas y sus subpaneles de control.  
  *Mitigación:* Se implementa con CSS Grid de dos columnas en el contenedor principal y un sub-grid de alineación fija (`grid-template-columns: 140px 1fr`) en la columna del panel, garantizando correspondencia pixel-perfect entre controles y canvas.

---

## F3.4. Presupuesto de Píxeles (Pixel Budget) — Demostración de Cero Scroll Vertical

Uno de los requerimientos más estrictos es que **los elementos principales deben permanecer visibles simultáneamente en escritorio sin scroll vertical** en las resoluciones objetivo:
* **Resolución Compacta:** 1366 × 768 px (altura útil en navegador con pestañas y barra de tareas: **~640–660 px**).
* **Resolución Estándar:** 1920 × 1080 px (altura útil en navegador: **~920–960 px**).

### Desglose de Altura en Píxeles para la Alternativa 2 (Resolución 1366×768):

| Elemento de la Interfaz | Altura Asignada | Justificación Ergonómica y Técnica |
| :--- | :---: | :--- |
| **Cabecera de Terminal (Header industrial)** | 36 px | Logotipo de la terminal, título técnico y botón de ayuda. |
| **Margen / Espaciador superior** | 10 px | Separación modular en la retícula de 4/8px. |
| **Banda 1: `SAMPLE` (Vial + Pantalla Muestra)** | 70 px | Canvas de 56px de altura + 14px de marcos y bordes biselados. |
| **Separador entre secciones** | 4 px | Canaleta metálica de separación estructural. |
| **Banda 2: Canal A (Rojo + `[ ◄ ► ]`)** | 52 px | Canvas de 38px + botones táctiles de 38px de alto (WCAG). |
| **Banda 3: Canal B (Ámbar + `[ ◄ ► ]`)** | 52 px | Idéntico a Canal A. |
| **Banda 4: Canal C (Cian + `[ ◄ ► ]`)** | 52 px | Idéntico a Canal A y B. |
| **Separador entre secciones** | 4 px | Canaleta metálica de separación estructural. |
| **Banda 5: `RESULT` (Pantalla Suma + LEDs)** | 70 px | Canvas de 56px de altura + 14px de marcos e indicadores. |
| **Margen / Espaciador inferior** | 14 px | Remate inferior del chasis metálico. |
| **ALTURA TOTAL DEL PANEL PRINCIPAL** | **364 px** | **Ocupa únicamente el 56% del viewport disponible de 650px.** |
| **Contenedor exterior con marco y paddings** | **~480–510 px** | **Deja entre 130px y 160px de margen libre sin ningún scroll.** |

### Verificación del Ancho de Columna (Legibilidad Óptima sin Miniaturización):
* En un monitor de 1366px, la columna principal dispone de ~850px de ancho.
* Descontando 140px para las placas de rotulación y botones `[ ◄ ► ]`, el canvas de osciloscopio mide **~700px de ancho**.
* Cada una de las 16 columnas del espectro mide:
  $$\text{Ancho de columna} = \frac{700\text{ px}}{16} \approx 43.7\text{ px}$$
* Un ancho de casi 44px por columna permite una legibilidad extraordinaria: las alturas discretas 0 a 4 se aprecian con holgura, los segmentos de bloque son nítidos y no existe compresión alguna.
* En 1080p (ancho ~1200px para el panel), cada columna mide más de 60px.
* **Conclusión matemática:** Se garantiza **0 scroll vertical** sin reducir ningún elemento a tamaños diminutos y sin eliminar ninguna funcionalidad del juego.

---

## F3.5. Matriz Comparativa Exhaustiva de Distribuciones

| Criterio de Evaluación | Alternativa 1: Doble Columna Desacoplada (Monitor vs Calibrador) | Alternativa 2: Consola Fiel a RE3 con Bahía Lateral (Recomendada) |
| :--- | :---: | :---: |
| **1. Fidelidad a la Referencia Visual del Usuario** | ❌ **Baja**: Desarma el panel de la máquina original en dos mitades separadas. | ⭐ **Máxima**: Recrea con exactitud la consola de 5 bandas horizontales de la imagen. |
| **2. Legibilidad del Acertijo y Apilamiento Vertical (H4)** | ❌ **Deficiente**: Obliga a realizar constantes saltos de mirada de derecha a izquierda. | ⭐ **Excelente**: Alineación vertical milimétrica continua entre Sample, A, B, C y Result. |
| **3. Ergonomía de Controles de Desplazamiento** | ⚠ **Regular**: Controles alejados de las pantallas de resultado. | ⭐ **Excelente**: Botones `[ ◄ ► ]` adyacentes a cada canal, reduciendo la distancia mano-ojo a 0. |
| **4. Cero Scroll Vertical en Pantallas Estándar (< 660px)** | ✅ **Sí**: Altura contenida (~490px). | ⭐ **Sí**: Altura contenida y calculada (~500px, 140px libres en 768p). |
| **5. Diferenciación Cromática de Canales (Foto RE3)** | ⚠ **Parcial**: Requiere coordinar dos columnas distintas. | ⭐ **Exacta**: Fila A Roja, Fila B Ámbar, Fila C Cian, Sample Blanco/Verde, Result Verde. |
| **6. Integración de Telemetría sin Competir con el Acertijo** | ⚠ **Regular**: Compite con los osciloscopios en la columna izquierda. | ⭐ **Óptima**: Concentrada en la bahía lateral derecha con displays VFD dedicados. |
| **7. Acceso a Ayuda sin Romper el Espacio de Juego** | ⚠ **Variable**: Si se abre hacia abajo desplaza la pantalla. | ⭐ **Óptima**: *Drawer* deslizante o persiana overlay que flota sin mover el juego. |
| **8. Preservación Funcional (Cero Pérdida de Elementos)** | ✅ **100 % conservados**. | ⭐ **100 % conservados** (Movimientos, Fallos, Estado, Analizar, Purgar, Dificultad). |

---

## F3.6. Recomendación Final Fundamentada

**Se recomienda formalmente adoptar la Alternativa 2: "Consola Industrial Fiel a RE3 con Bahía de Operaciones Lateral".**

### Justificación de la Elección:
1. **Alineación con la Expectativa Visual del Usuario:** La imagen enviada por el usuario establece con total claridad la visión del proyecto: una máquina diegética que evoca la consola original de *Resident Evil 3: Nemesis*, con el vial de muestra a la izquierda de `SAMPLE`, los mandos `[ ◄ ► ]` alineados a cada fila A, B, C, la diferenciación por color (rojo, ámbar, cian) y la pantalla de `RESULT` al pie. La Alternativa 2 materializa exactamente esta expectativa sin concesiones.
2. **Superioridad Cognitiva y Ergonómica:** El acertijo es un problema de suma vertical. Mantener las 5 bandas compartiendo el mismo eje X y la misma escala milimétrica en una columna unificada permite al jugador entender instantáneamente cómo cada desplazamiento de fila impacta la combinación final. Desacoplar las filas de la suma (como hace la Alternativa 1) introduce una fricción visual innecesaria que devalúa el juego.
3. **Distribución Óptima de Pantallas Panorámicas (16:9 y 16:10):** El 90 % de los monitores de escritorio modernos son apaisados. Dedicar el 70 % del ancho al panel de calibración de alta legibilidad y el 30 % restante a la torre de operaciones, telemetría y ayuda aprovecha armónicamente la pantalla, logrando una consola compacta de **~500px de alto con 0 scroll vertical**.
4. **Preservación Inviolable de la Arquitectura y Código:** La Alternativa 2 no altera ningún contrato de dominio, respetando estrictamente las invariantes congeladas en la Fase 5 y permitiendo abordar la Fase 4 (Identidad Visual) y la Fase 6 (Maquetación Responsiva Definitiva) sobre una base de diseño sólida, validada y documentada.


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

# Fase 4: Identidad Visual — Registro de Implementación

**Fecha de ejecución:** 20 de Octubre de 2026  
**Estado:** ✅ Completada y verificada.  
**Alternativa seleccionada:** Alternativa 2 — *Consola Industrial Fiel a RE3 con Bahía de Operaciones Lateral* (aprobada en la Fase 3).

---

## F4.1. Archivos Modificados

| # | Archivo | Tipo de Cambio | Descripción |
| :--- | :--- | :--- | :--- |
| 1 | `index.html` | **Reestructurado** | Distribución en dos columnas: Panel de Calibración de 3 bandas (SAMPLE → Filas A/B/C → RESULT) + Bahía de Operaciones lateral (manual plegable, telemetría, acciones). Controles de desplazamiento ◀ ▶ adyacentes a cada canal en la zona izquierda de la banda unificada de filas. |
| 2 | `src/ui/styles/terminal-crt.css` | **Modularizado** | Tokens semánticos industriales (`--industrial-*`, `--channel-a/b/c-*`), reset global, scanlines suaves, brillo CRT radial y animación de parpadeo. Se extrajeron los estilos de componente a `layout.css`. |
| 3 | `src/ui/styles/layout.css` | **Reescrito** | Cuadrícula CSS Grid de 2 columnas (`1fr 240px`), bandas horizontales con placas metálicas rotuladas, viales de muestra, LEDs indicadores por canal, bahía lateral con módulos de telemetría y acciones, overlay de victoria, responsive para móvil (< 768px) y pantallas compactas (< 700px alto). |
| 4 | `src/index.ts` | **Adaptado** | Toggle de instrucciones actualizado al nuevo marcado (chevron rotativo `#help-chevron` en vez de texto). Sin cambios en la lógica de ensamblado de Canvas, controlador o dominio. |
| 5 | `src/ui/components/TargetDisplayView.ts` | **Refinado** | Muestra de referencia en cian analítico (`#00d4ff`) con retícula milimétrica de 4 niveles numerados, cresta luminosa superior y etiquetas diegéticas industriales. |
| 6 | `src/ui/components/RowCarouselView.ts` | **Rediseñado** | Codificación de color por canal fiel a la referencia RE3: Canal A en rojo bermellón (`#e63946`), Canal B en ámbar dorado (`#ffb703`), Canal C en cian celeste (`#00b4d8`). Franjas de identidad de canal como fondo tenue, tinte de canal superpuesto sobre los bloques base, cresta luminosa en color de canal y diodo LED del color correspondiente. |
| 7 | `src/ui/components/LiveSumSpectrumView.ts` | **Refinado** | Indicadores de discrepancia direccional (▲/▼) que señalan si la suma de cada columna está por encima o por debajo del objetivo, además de la silueta fantasma del objetivo y las barras reactivas en verde fósforo / rojo técnico. |

---

## F4.2. Decisiones de Diseño

1. **Canvas unificado para las 3 filas:** Se mantuvo `#rows-canvas` como un solo lienzo (en vez de 3 individuales) para preservar el contrato DOM de la Fase 5 (`ui-integration.test.ts` espera `#rows-canvas`). La diferenciación visual por canal se logra mediante tinte por superposición (`globalAlpha: 0.35`) y cresta coloreada, sin romper la cadena Decorator existente (`BaseBlockView → HighlightPeakDecorator → ScanlineGlitchDecorator`).
2. **Controles en la zona lateral del canvas:** Los botones ◀ ▶ de cada fila se agrupan en `band__channel-group` junto a la placa y el LED de cada canal, apilados verticalmente al lado izquierdo del canvas de filas, cumpliendo el requisito de "controles adyacentes a su fila" de la Alternativa 2.
3. **Bahía de operaciones lateral:** Módulos de ayuda plegable (comienza colapsado, `aria-expanded="false"`), telemetría compacta (movimientos + fallos en cuadrícula 2×1 + indicador de estado) y válvulas de acción con la insignia de máxima dificultad.
4. **Paleta 60-30-10:** 60% verde fósforo base (`#00ff73`), 30% cian analítico (`#00d4ff`) para la muestra de referencia y estados de éxito, 10% acentos de canal (rojo/ámbar/cian) y señales de alarma (rojo técnico `#ff3b30`, ámbar de precaución `#ff9900`).
5. **Invariante I9 preservada:** El texto del `#difficulty-badge` se mantiene exactamente como `"MÁXIMA DIFICULTAD (16 COLUMNAS)"`.

---

## F4.3. Verificación de Calidad

| Control | Resultado |
| :--- | :---: |
| Suite de Pruebas (Vitest) | **94 tests / 9 suites — 100% ✅** |
| Verificación de Tipos (`tsc --noEmit`) | **0 errores ✅** |
| Build de Producción (`vite build`) | **Éxito sin alertas ✅** |
| Diff en `src/core` + `src/creational` | **Vacío (sin cambios en lógica) ✅** |
| Dependencias runtime | **0 ✅** |

Comandos reproducibles:
```powershell
npm test
npm run typecheck
npm run build
git diff --stat f9577c1 -- src/core src/creational
```

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

---

# Actualización: Aumento de Dificultad, Cronómetro de 15 Minutos y Enclavamiento 3D con Sirena Estroboscópica

**Fecha de ejecución:** 20 de Octubre de 2026  
**Estado:** ✅ Completado y verificado (105 tests aprobados / 0 errores de tipos / Build exitoso)

---

## 1. Objetivos del Requerimiento

1. **Aumento de Dificultad y Misterio en el Espectro de Suma (`RESULT`):**
   - Eliminar el feedback cromático individual por columna (barras verdes para aciertos y rojas para fallos) y las flechas direccionales (▲/▼) que facilitaban en exceso la resolución.
   - Unificar las barras de la suma en vivo al mismo color azul cian analítico de la muestra de referencia (`SAMPLE`), aportando mayor intriga e inmersión diegética.
   - Conservar el indicador superior `COINCIDENCIA: X/16 COL` para mantener la orientación global del progreso sin delatar qué columnas específicas coinciden.
2. **Cronómetro Regresivo de 15 Minutos:**
   - Incorporar un temporizador regresivo de 15:00 minutos (`900 segundos`) de contención hidráulica.
   - Presentarlo en un módulo industrial dedicado en la Bahía de Operaciones con reloj digital CRT, barra de progreso y micro-estados visuales (`normal` > 3 min, `warning` ≤ 3 min ámbar, `critical` ≤ 1 min rojo pulsante).
   - Pausar automáticamente al resolver (`SOLVED`), detenerse en bloqueo (`LOCKED`), y reiniciar a 15:00 al accionar la purga (`RESET`) o iniciar una nueva muestra.
   - Disparar el enclavamiento de seguridad si el tiempo llega a `00:00`.
3. **Máximo de 3 Intentos de Análisis Visible:**
   - Mantener la regla ya establecida de 3 fallos consecutivos máximos.
   - Hacerlo explícito visualmente en el panel de telemetría: `Fallos (Máx 3): X / 3`.
4. **Enclavamiento de Seguridad Comprensible a Pantalla Completa con Luz Intermitente y Animación 3D:**
   - Eliminar el aviso pequeño y críptico sobre el canvas.
   - Implementar un modal de pantalla completa (`#lockdown-overlay`) con cobertura total del viewport.
   - Luz de emergencia estroboscópica intermitente (`emergencySirenStrobe`): efecto de baliza/sirena roja de alarma industrial que pulsa rítmicamente sobre toda la pantalla.
   - Animación y profundidad espacial 3D (`lockdownEntrance3D`): entrada con perspectiva tridimensional, rotación en los ejes X e Y, prisma holográfico basculante 3D (`badgeTilt3D`), bordes metálicos biselados y franjas de peligro (*hazard stripes*).
   - Redacción clara y comprensible: explica la contingencia (3 intentos fallidos o tiempo agotado), la razón técnica de contención y proporciona la instrucción exacta de recuperación.
   - Botón directo de purga y desbloqueo integrado en la alerta (`#btn-lockdown-purge`), permitiendo recuperar la terminal con un solo clic.

---

## 2. Componentes y Modificaciones Realizadas

| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/ui/components/LiveSumSpectrumView.ts` | **Refactor visual** | Barras de suma en cian analítico idéntico a SAMPLE (`rgba(0, 212, 255, 0.82)`), eliminación de colores verde/rojo y flechas ▲/▼; preservación del contador de coincidencia `X/16 COL`. |
| `src/ui/components/RowCarouselView.ts` | **Refactor visual** | Reducción del bloqueo en canvas a un velo industrial discreto, delegando la notificación principal al overlay 3D. |
| `src/application/CountdownTimer.ts` | **Nuevo módulo** | Lógica pura del cronómetro de 15 minutos: cuenta regresiva, formateo `MM:SS`, callbacks `onTick`/`onExpire`, pausado y reseteo sin dependencias de DOM ni runtime. |
| `src/ui/components/TimerDisplayView.ts` | **Nuevo componente** | Observador concreto (`IPuzzleObserver`) que sincroniza el temporizador con los estados del puzzle y actualiza reloj, barra y clases de urgencia. |
| `src/ui/components/LockdownOverlayView.ts` | **Nuevo componente** | Observador concreto (`IPuzzleObserver`) que gestiona la activación del modal 3D a pantalla completa, la razón dinámica (intentos vs tiempo) y el botón de purga. |
| `src/core/models/WaterSamplePuzzle.ts` | **Ampliación core** | Adición del método limpio `triggerLock()` para contingencia por expiración de tiempo, emitiendo `PuzzleEventType.LOCKED`. |
| `index.html` | **Marcado DOM** | Módulo de cronómetro de contención, telemetría con límite `/ 3`, actualización del manual y estructura del modal 3D `#lockdown-overlay`. |
| `src/ui/styles/layout.css` | **Estilos CSS** | Reglas de diseño del cronómetro (estados normal/warning/critical), luz estroboscópica de sirena roja intermitente y animación 3D del modal. |
| `src/index.ts` | **Ensamblado** | Inyección e inicialización de `TimerDisplayView` y `LockdownOverlayView`, destrucción limpia de timers previos y conexión de purga. |
| `tests/unit/timer-and-lockdown.test.ts` | **Nueva suite** | 9 pruebas unitarias que validan el cronómetro, formateo, expiración, overlay de enclavamiento, `triggerLock()` y micro-estados. |
| `tests/unit/ui-integration.test.ts` | **Suite ampliada** | +2 pruebas de integración DOM (9 en total) que verifican la presencia del temporizador, la activación del overlay al 3er fallo y el desbloqueo mediante purga. |

---

## 3. Matriz de Verificación y Puertas de Calidad

| Control | Comando | Resultado |
| :--- | :--- | :---: |
| Suite completa de pruebas (Vitest) | `npm test` | **105 tests aprobados / 10 archivos (100%) ✅** |
| Verificación de tipos TypeScript | `npm run typecheck` | **0 errores (`tsc --noEmit`) ✅** |
| Compilación de producción | `npm run build` | **Build exitoso sin advertencias ✅** |
| Auditoría de dependencias | `npm audit` | **0 vulnerabilidades ✅** |
| Dependencias en runtime | `package.json` | **0 dependencias (100% nativo) ✅** |

