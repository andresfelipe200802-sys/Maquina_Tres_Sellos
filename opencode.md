# Contexto del proyecto — Sintetizador de Muestra de Agua

> Documento de contexto generado durante la sesión de trabajo con OpenCode.
> Resume **qué es el juego**, **cómo está construido**, **cómo se ejecuta** y
> **todo lo que se hizo en este chat**, en orden cronológico.

---

## 1. Resumen del proyecto

| Dato | Valor |
| :--- | :--- |
| **Nombre** | `water-sample-puzzle` (v0.2.0) |
| **Título visible** | Sintetizador de Calibración / Tratamiento de Muestra de Agua |
| **Inspiración** | Acertijo de la muestra de agua de *Resident Evil 3: Nemesis* (1999) |
| **Tipo** | Acertijo lógico / puzzle industrial, jugable en navegador |
| **Stack** | Vanilla TypeScript + Vite, Canvas 2D, CSS (estética CRT) |
| **Paradigma** | POO estricta + principios SOLID + patrones de diseño GoF |
| **Documento de diseño** | `VDD.md` (VDD / GDD completo) |
| **Estado** | Funcional; **71 pruebas en verde**, build correcto, 0 vulnerabilidades |

### Mecánica del juego
1. Se muestra una **Muestra de Referencia** (vector de alturas objetivo).
2. Hay **tres filas (A, B y C)** de bloques que se desplazan de forma circular
   (rotación izquierda/derecha).
3. El panel **Suma en Vivo** calcula columna a columna la suma de las tres filas:
   `Suma(x) = A(x) + B(x) + C(x)`.
4. El jugador rota las filas hasta que la suma coincide con la referencia y
   pulsa **Analizar** para validar.
5. **3 fallos consecutivos** bloquean el sistema (penalización temporal). La
   combinación se puede reiniciar con **Purgar**. Hay selector de dificultad
   (Instalación Difícil / Fácil).

---

## 2. Cómo ejecutar el proyecto

Requisitos: **Node.js 20+** (se usó Node 24).

```powershell
npm install        # Instala dependencias de desarrollo
npm run dev        # Servidor de desarrollo -> http://localhost:5173
npm test           # Ejecuta la suite completa (Vitest)
npm run typecheck  # Verificación de tipos (tsc --noEmit)
npm run build      # Genera la versión de producción en dist/
npm run preview    # Sirve dist/ -> http://localhost:4173
```

Scripts disponibles (`package.json`):

| Script | Acción |
| :--- | :--- |
| `dev` | Vite en modo desarrollo (hot reload) |
| `typecheck` | `tsc --noEmit` (tipado estricto) |
| `build` | `vite build` (producción) |
| `preview` | Sirve el build de producción |
| `test` | `vitest run` (una pasada) |
| `test:watch` | `vitest` en modo observador |
| `test:coverage` | Cobertura (**requiere** instalar `@vitest/coverage-v8`) |

> ⚠️ Abrir `index.html` con `file://` **no funciona**: el navegador no ejecuta
> TypeScript. Hay que servirlo con `npm run dev` o `npm run preview`.

---

## 3. Arquitectura y patrones aplicados

Punto clave de diseño: **no existe `if/else` ni `switch` para decidir fases ni
reglas**. Toda variación se resuelve con despacho polimórfico.

```
WaterSamplePuzzle  (Contexto / Agregado raíz)
├── IPuzzleState            -> Patrón STATE      (fases del sistema)
├── IValidationStrategy     -> Patrón STRATEGY   (regla de victoria)
├── IPuzzleObserver         -> Patrón OBSERVER   (UI desacoplada)
└── IPuzzleFactory          -> Patrón FACTORY    (creación de puzzles)
IBlockView + decoradores    -> Patrón DECORATOR (capa visual)
```

- **Factory Method** (`src/creational/`): `FacilityHardFactory` (16 col) y
  `FacilityEasyFactory` (12 col). Generan puzzles **con solución garantizada**
  (derivan el objetivo desde la orientación correcta del puzzle).
- **State** (`src/core/state/`): `StandbyState`, `ManipulatingState`,
  `EvaluatingState`, `SolvedState`, `LockedState`. Evita banderas booleanas
  (`isSolved`, `isLocked`…).
- **Strategy** (`src/core/strategy/`): `ExactMatchStrategy` (igualdad 1:1) y
  `ToleranceStrategy` (margen en columnas marginales). Se puede intercambiar la
  regla de victoria en caliente.
- **Observer** (`src/core/observer/`): `IPuzzleSubject`,
  `IPuzzleObserver` y `PuzzleEventEmitter`. El dominio **no conoce** el DOM.
- **Decorator** (`src/structural/decorators/`): `BaseBlockView`,
  `AbstractBlockDecorator`, `HighlightPeakDecorator`, `ScanlineGlitchDecorator`.
  Añaden efectos visuales sin tocar la entidad `Block`.

### Cumplimiento SOLID (resumen, detalle en `VDD.md` §4)
- **S**: cada clase, una responsabilidad (`Row`, `SoundManager`, estrategias…).
- **O**: se añaden fábricas, decoradores o estrategias sin modificar lo existente.
- **L**: cualquier `IPuzzleState`/`IValidationStrategy` es sustituible.
- **I**: interfaces pequeñas y específicas.
- **D**: se depende de abstracciones inyectadas, no de concretas.

### Regla de oro de la arquitectura
> `src/core/` **no importa nada** del navegador (`window`, `document`,
> `HTMLElement`, Canvas…). Esto está cubierto por una prueba automática que
> inspecciona el código fuente de `src/core/`.

---

## 4. Estructura real de archivos

```text
Juego_Acertijo/
├── .gitignore
├── index.html                     # Marcado semántico (todo en español)
├── package.json
├── package-lock.json
├── tsconfig.json
├── VDD.md                         # Documento de diseño (VDD / GDD)
├── opencode.md                    # Este archivo (contexto de la sesión)
├── src/
│   ├── index.ts                   # Arranque + inyección de dependencias (DI)
│   ├── vite-env.d.ts              # Tipado de Vite (CSS / import.meta.env)
│   ├── core/                      # CAPA DE DOMINIO PURA (sin navegador)
│   │   ├── models/                # Block, Row, TargetPattern, WaterSamplePuzzle
│   │   ├── state/                 # IPuzzleState + 5 estados concretos
│   │   ├── strategy/              # IValidationStrategy, ExactMatch, Tolerance
│   │   └── observer/              # IPuzzleSubject, IPuzzleObserver, emitter
│   ├── creational/factories/      # IPuzzleFactory + Hard + Easy
│   ├── structural/decorators/     # IBlockView, Base, Abstract, 2 decoradores
│   ├── ui/
│   │   ├── components/            # TargetDisplayView, RowCarouselView,
│   │   │                          #   LiveSumSpectrumView, AttemptCounterView
│   │   └── styles/                # terminal-crt.css, layout.css
│   └── application/
│       ├── GameController.ts      # Adaptador DOM -> dominio (binding idempotente)
│       └── SoundManager.ts        # Observador de audio (Web Audio API)
└── tests/
    ├── unit/
    │   ├── state-machine.test.ts
    │   ├── strategy-rules.test.ts
    │   ├── factory-generation.test.ts
    │   ├── observer-dispatch.test.ts
    │   ├── decorator.test.ts
    │   ├── game-controller.test.ts
    │   └── ui-integration.test.ts
    └── mocks/MockObserver.ts
```

> Nota: `VDD.md` §5 describe algunos archivos **planeados pero no implementados**
> (`docs/`, `.github/`, `RandomSampleFactory`, `InvertedMaskStrategy`,
> `README.md`). No forman parte del alcance actual.

---

## 5. Hitos de desarrollo

| Hito | Contenido | Estado |
| :--- | :--- | :--- |
| **0** | Infraestructura, modelos estáticos e interfaces base | ✅ |
| **1** | Motor de dominio + máquina de estados (State) | ✅ |
| **2** | Estrategias de validación (Strategy) y fábricas (Factory) | ✅ |
| **3** | Bus de eventos y desacoplamiento (Observer) | ✅ |
| **4** | Interfaz de usuario en Canvas y decoradores visuales | ✅ |
| **5** | Ensayos de coevaluación y cierre de documentación | ⬜ pendiente |

---

## 6. Pruebas automatizadas

- **Runner:** Vitest 5. **Entorno DOM:** happy-dom 21.
- **Resultado actual:** **7 archivos, 71 pruebas, todas en verde.**

| Archivo | Qué valida | Nº |
| :--- | :--- | :--- |
| `state-machine.test.ts` | Transiciones de estado sin `if/else` | 13 |
| `strategy-rules.test.ts` | Intercambio de algoritmos de victoria | 13 |
| `factory-generation.test.ts` | Resolubilidad por fuerza bruta | 11 |
| `observer-dispatch.test.ts` | Desacoplamiento + pureza de `src/core/` | 9 |
| `decorator.test.ts` | Contrato del patrón Decorator | 10 |
| `game-controller.test.ts` | Comportamiento del controlador e idempotencia | 9 |
| `ui-integration.test.ts` | Carga el `index.html` real y valida el cableado DOM | 6 |

---

## 7. Todo lo que se hizo en este chat (cronológico)

1. **Diagnóstico y corrección de un bug real de ciclo de vida.**
   - Síntoma: al cambiar de dificultad o pulsar "Nueva Muestra", los _listeners_
     se acumulaban (se registraban varias veces los mismos manejadores).
   - Solución: `GameController.bindControls()` ahora es **idempotente** (llama a
     `unbindControls()` antes de reconectar) y en `src/index.ts` los controles
     globales (selector de dificultad, botón de nueva partida) se registran **una
     sola vez** en `wireGlobalControls()`.

2. **Soporte de tipos de Vite.** Se añadió `src/vite-env.d.ts`
   (`/// <reference types="vite/client" />`) para importar CSS y usar
   `import.meta.env` sin errores de TypeScript.

3. **Pruebas nuevas.**
   - `tests/unit/game-controller.test.ts` (9 pruebas): comportamiento del
     controlador y verificación de la idempotencia del _binding_.
   - `tests/unit/ui-integration.test.ts` (6 pruebas): carga el `index.html` real
     bajo happy-dom, sustituye el contexto 2D de los canvas por un doble y ejecuta
     `src/index.ts`, validando el flujo DOM → Controller → dominio → Observer → DOM.

4. **`.gitignore`.** Creado con reglas para no versionar `node_modules/`,
   `dist/`, cachés, cobertura, variables de entorno (salvo `.env.example`) y
   ruido de IDE/SO. Sí se versionan `package-lock.json`, `VDD.md` e `index.html`.

5. **Revisión de la salida de `npm install`.**
   - Aparecían **7 vulnerabilidades** (3 moderadas, 1 alta, 3 críticas) y un aviso
     de `allow-scripts` sobre `esbuild`. Todas las vulnerabilidades estaban en
     **dependencias de desarrollo** (el juego publicado no tiene dependencias de
     ejecución).
   - Solución aplicada: se actualizaron solo dos devDependencies:
     `vitest` `^2.1.8 → ^5.0.5` y `happy-dom` `^15.11.7 → ^21.0.3`
     (sin tocar `vite ^6` ni `typescript ^5.7`).
   - Resultado: `npm audit` → **0 vulnerabilidades**, y se verificó que todo
     seguía en verde (71 tests, `tsc` limpio, build OK).
   - El aviso de `allow-scripts` es **inofensivo** (`esbuild` funciona igual); es
     un mecanismo de seguridad de npm que bloquea scripts de instalación.

6. **Control de versiones.** Se inicializó el repositorio Git y se hizo el primer
   commit con el mensaje:
   `feat: acertijo de muestra de agua (POO + patrones GoF) con UI Canvas y 71 tests`.

7. **Localización completa al español de la interfaz.** Antes estaba en inglés.
   Se tradujo todo el texto visible:
   - `index.html`: títulos, etiquetas de paneles, botones, telemetría, overlay de
     victoria y selector de dificultad (conservando `id`/`data-action` que usa el
     código).
   - **Nuevo panel de instrucciones** (manual de operación) con botón para
     mostrar/ocultar la guía (`#btn-toggle-instructions`), con su lógica en
     `src/index.ts` y sus estilos en `terminal-crt.css` / `layout.css`.
   - Etiquetas de los canvas: `MUESTRA DE REFERENCIA`, `ESPECTRO DE SUMA EN VIVO`
     y `⚠ SISTEMA BLOQUEADO`.
   - `AttemptCounterView`: mapa `STATE_LABELS_ES` para traducir el estado
     (`STANDBY → EN ESPERA`, `MANIPULATING → EN OPERACIÓN`, `EVALUATING →
     EVALUANDO`, `SOLVED → CALIBRADO`, `LOCKED → BLOQUEADO`). El atributo
     `data-state` conserva el código en inglés porque el CSS lo usa como selector.
   - Se actualizó `tests/unit/ui-integration.test.ts` para esperar el texto en
     español (`EN OPERACIÓN`).

8. **Creación de `opencode.md`** (este documento) con el contexto de la sesión.

---

## 8. Estado actual y pendientes

### Ya hecho
- ✅ Hitos 0–4 completos; arquitectura con 5 patrones GoF y SOLID.
- ✅ 71 pruebas en verde, `tsc` sin errores, `vite build` correcto.
- ✅ `npm audit`: 0 vulnerabilidades.
- ✅ `.gitignore` listo y repositorio Git inicializado (2 commits).
- ✅ Interfaz **100% en español** con panel de instrucciones.

### Pendientes / siguientes pasos
- ⬜ **Confirmar (commit) los cambios de localización**: hay archivos modificados
  sin confirmar (`index.html`, `src/index.ts`, vistas, CSS y el test de
  integración).
- ⬜ Conectar un **repositorio remoto** (GitHub/GitLab) y hacer `push`.
- ⬜ **Hito 5**: ejecutar las listas de coevaluación de Caja Negra y Caja Blanca
  (`VDD.md` §7) y cerrar la documentación.
- ⬜ Opcional: instalar `@vitest/coverage-v8` para que `npm run test:coverage`
  funcione.

### Comandos útiles de Git
```powershell
git add .
git commit -m "i18n: interfaz completa en español + panel de instrucciones"
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```
