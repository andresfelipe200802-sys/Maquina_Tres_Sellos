# Plan Maestro de Arquitectura, Control de Acceso y Diseño de Interfaz (Proyecto SENA)

**Rol:** Arquitecto de Software & Diseñador de Soluciones  
**Proyecto:** Sintetizador de Calibración de Muestra de Agua (Simulador de Acertijo Industrial)  
**Entorno de Aplicación:** Centro de Formación SENA (Capacidad de aula: hasta 45 aprendices concurrentes)  
**Fecha:** 21 de Octubre de 2026  
**Documento:** `PLAN_ARQUITECTURA_SENA.md`  

---

## Índice General

1. [Módulo 1: Control de Acceso y Supervisión en Vivo de Aprendices](#módulo-1-control-de-acceso-y-supervisión-en-vivo-de-aprendices)
   - 1.1. Diagnóstico del Entorno Educativo SENA
   - 1.2. Mecanismo de Control de Acceso (Gatekeeper)
   - 1.3. Consola de Mando del Instructor (Monitoreo en Tiempo Real)
   - 1.4. Protocolo de Expulsión Forzada en Caliente (Live Kick & Revocation)
   - 1.5. Arquitectura de Comunicación en Red (WebSockets / SSE + Heartbeats)
2. [Módulo 2: Arquitectura y Diseño de Base de Datos (MySQL)](#módulo-2-arquitectura-y-diseño-de-base-de-datos-mysql)
   - 2.1. Justificación Técnica de la Base de Datos
   - 2.2. Modelo Entidad-Relación y Código DDL SQL Completo
   - 2.3. Políticas y Medidas Rigurosas de Seguridad
   - 2.4. Protección de Datos Personales (Habeas Data - Ley 1581 de 2012)
3. [Módulo 3: Plan de Distribución de Interfaz Zero-Scroll (`/frontend-design`)](#módulo-3-plan-de-distribución-de-interfaz-zero-scroll-frontend-design)
   - 3.1. Principios de Diseño y Restricción Estricta 100vh
   - 3.2. Pantalla A: Consola del Aprendiz (Sintetizador Zero-Scroll)
   - 3.3. Pantalla B: Panel de Mando del Instructor (Matriz de 45 Aprendices)
   - 3.4. Sistema de Diseño (Tokens, Tipografía y Paleta Cromática)
4. [Hoja de Ruta de Implementación Técnica](#hoja-de-ruta-de-implementación-técnica)

---

# Módulo 1: Control de Acceso y Supervisión en Vivo de Aprendices

## 1.1. Diagnóstico del Entorno Educativo SENA

En los ambientes de aprendizaje del SENA (Servicio Nacional de Aprendizaje), las sesiones de formación técnica y tecnológica agrupan típicamente entre **30 y 45 aprendices** por Ficha de caracterización. 

Para que el juego funcione como una actividad evaluativa o de gamificación controlada, el sistema debe resolver tres desafíos operativos:
1. **Acceso no autorizado:** Evitar que personas externas a la ficha ingresen o que aprendices jueguen fuera del horario autorizado.
2. **Falta de visibilidad:** El instructor debe saber en todo momento quién está resolviendo el problema, cuántos movimientos lleva, si cayó en enclavamiento (3 fallos) o si ya logró calibrar la muestra.
3. **Control disciplinario y técnico:** Capacidad de desconectar o expulsar a un aprendiz que presente conductas indebidas o requiera reiniciar su sesión desde cero.

---

## 1.2. Mecanismo de Control de Acceso (Gatekeeper)

El acceso al simulador se estructura bajo un modelo de **Tres Barreras de Validación**:

```
[ Aprendiz ]
     │
     ▼
┌────────────────────────────────────────────────────────┐
│ BARRERA 1: Identificación del Aprendiz                 │
│ Nombre del Aprendiz (Alias visible) + Código de Ficha  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ BARRERA 2: Validación de Sala Activa                   │
│ Código de Sala (Room PIN de 6 caracteres)              │
│ Verificación: ¿La sala está ABIERTA por el Instructor? │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ BARRERA 3: Autorización Dinámica (Whitelist/Status)    │
│ ¿El aprendiz no está en lista de expulsados?           │
│ ¿No ha sido previamente expulsado de esta sesión?      │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      [ ACCESO PERMITIDO ]       [ ACCESO DENEGADO ]
     Genera Session Token       Mensaje de Bloqueo
```

### Reglas de Ingreso:
1. **Sala Abierta / Cerrada:** La partida no es accesible permanentemente; el instructor hace clic en *"Abrir Sala"* desde su panel. Mientras la sala esté cerrada, los aprendices que ingresen al enlace verán una pantalla de *"Terminal en Espera de Autorización del Instructor"*.
2. **Capacidad Máxima Acotada:** El sistema rechaza cualquier conexión que supere el límite configurado por el instructor (por defecto: 45 cupos).
3. **Sesión Única por Aprendiz:** Se previene el ingreso múltiple duplicado con el mismo Nombre en la misma sala activa. Si el aprendiz ya está jugando, no se permite abrir una segunda sesión con ese mismo nombre a menos que el instructor lo autorice o reinicie.

---

## 1.3. Consola de Mando del Instructor (Monitoreo en Tiempo Real)

El instructor cuenta con una URL administrativa protegida (`/instructor/dashboard`) con inicio de sesión seguro. Esta interfaz presenta una vista panorámica tipo **Radar de Control Industrial**, donde cada aprendiz es monitoreado a través de una celda de telemetría.

### Métricas Visualizadas por Aprendiz en Vivo:
- **Identificación:** Nombre del aprendiz (ej. 'Carlos Gómez' o 'Camila Morales'). Cero solicitud de datos personales sensibles (sin números de documento ni correos privados).
- **Estado de Partida:**
  - 🟢 **CALIBRADO (Ganó):** Completó la muestra. Muestra tiempo récord y movimientos totales.
  - 🟡 **EN OPERACIÓN:** Moviendo filas activamente. Muestra tiempo restante (cronómetro 15 min).
  - 🟠 **EVALUANDO:** Ejecutando análisis de mezcla.
  - 🔴 **BLOQUEADO (Perdió/Enclavado):** Cayó en 3 fallos consecutivos o se le agotó el tiempo.
  - ⚪ **DESCONECTADO:** Pérdida de señal o ventana cerrada.
- **Telemetría Operativa:**
  - Movimientos realizados.
  - Fallos acumulados (`0/3`, `1/3`, `2/3`, `3/3`).
  - Coincidencia actual de columnas (`X / 16 COL`).
  - Tiempo de permanencia restante del cronómetro.

---

## 1.4. Protocolo de Expulsión Forzada en Caliente (Live Kick & Revocation)

Cuando el instructor decide expulsar a un aprendiz de la sesión:

1. **Acción del Instructor:** Presiona el botón `[ ✕ EXPULSAR ]` en la tarjeta del aprendiz dentro de su dashboard.
2. **Transacción en Backend / BD:**
   - Se actualiza el campo `sesion_revocada = 1` y `estado_partida = 'EXPULSADO'` en la tabla `partidas_aprendiz`.
   - Se invalida inmediatamente el `token_sesion_hash` asociado en la memoria activa del servidor.
3. **Transmisión de Desconexión:**
   - Si se usa WebSocket: El servidor emite un evento `SESSION_KICKED` dirigido al socket del aprendiz y cierra la conexión TCP.
   - Si se usa HTTP Polling/SSE: La siguiente petición o latido (*heartbeat*) del cliente del aprendiz recibe respuesta `HTTP 403 Forbidden` con código `ERR_PLAYER_KICKED`.
4. **Respuesta en la Terminal del Aprendiz:**
   - La pantalla del aprendiz se bloquea instantáneamente.
   - Se desmontan los controles del juego y se despliega un mensaje a pantalla completa:  
     `"ACCESO REVOCADO: Su sesión ha sido finalizada por el Instructor a cargo. Comuníquese con el docente."`

---

## 1.5. Arquitectura de Comunicación en Red (WebSockets / SSE + Heartbeats)

Dado que son máximo 45 aprendices en una red de área local (LAN) o aula del SENA:
- **Protocolo Recomendado:** **WebSockets bidireccionales ligeros** (vía `ws` nativo o `Socket.io` en Node.js, o servidor de eventos en Python/FastAPI/Go).
- **Carga de Red Estimada:**  
  Cada actualización de movimiento transmite un payload JSON de aproximadamente **120 bytes**. Con 45 aprendices moviendo filas cada 2 segundos, el tráfico total es de apenas **~2.7 KB/s**, lo que garantiza latencia inferior a **50 ms** incluso en redes Wi-Fi escolares con ancho de banda limitado.
- **Heartbeat (Latido de Presencia):** Cada cliente envía un ping cada 5 segundos. Si el servidor no recibe señal en 15 segundos, marca al aprendiz como `DESCONECTADO`.

---

# Módulo 2: Arquitectura y Diseño de Base de Datos (MySQL)

## 2.1. Justificación Técnica de la Base de Datos

**¿Es necesaria una base de datos? SÍ, absolutamente.**

Aunque el acertijo lógico corre en el navegador del cliente mediante JavaScript/TypeScript, las siguientes funciones no pueden implementarse de forma confiable sin persistencia relacional centralizada:
1. **Control de Acceso y Salas:** Determinar quién tiene autorización para ingresar y gestionar salas de evaluación activas.
2. **Persistencia de Auditoría Académica SENA:** Registrar notas, tiempos de resolución, número de movimientos y horas de finalización para la evidencia formativa del instructor.
3. **Revocación de Sesiones:** Mantener la lista negra de tokens revocados para la expulsión forzada en caliente.
4. **Privacidad por Diseño (Cero Datos Personales Sensibles):** Garantiza que no se recolecte información personal sensible (sin documentos de identidad, sin correos privados), minimizando a cero cualquier riesgo legal o de filtración de datos de menores o aprendices.

---

## 2.2. Modelo Entidad-Relación y Código DDL SQL Completo

A continuación se presenta el script SQL completo y listo para ejecutarse en **MySQL 8.0+**, utilizando el motor **InnoDB**, codificación **utf8mb4** e integridad referencial estricta. **Nota de privacidad:** El esquema almacena únicamente credenciales del instructor y el **Nombre** del aprendiz en sala, prescindiendo por completo de números de documento o correos personales:

```sql
-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SIMULADOR DE MUESTRA DE AGUA (SENA)
-- Motor: MySQL 8.0+ | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Política: Cero Recolección de Datos Personales Sensibles (Sin Documentos)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `sena_acertijo_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `sena_acertijo_db`;

-- -----------------------------------------------------------------------------
-- 1. TABLA: roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL,
  `descripcion` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `nombre`, `descripcion`) VALUES
  (1, 'INSTRUCTOR', 'Docente con privilegios de apertura de salas, monitoreo y expulsión')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- -----------------------------------------------------------------------------
-- 2. TABLA: fichas_sena
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fichas_sena` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo_ficha` VARCHAR(20) NOT NULL,
  `nombre_programa` VARCHAR(120) NOT NULL,
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fichas_codigo` (`codigo_ficha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABLA: instructores (Cuentas de acceso para docentes / controladores)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `instructores` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_completo` VARCHAR(80) NOT NULL,
  `usuario_login` VARCHAR(40) NOT NULL, -- Usuario de acceso (ej. 'instructor.quimica')
  `password_hash` VARCHAR(255) NOT NULL,
  `rol_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `estado_acceso` ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  `fecha_registro` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_instructores_login` (`usuario_login`),
  KEY `idx_instructores_estado` (`estado_acceso`),
  CONSTRAINT `fk_instructores_rol`
    FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABLA: sesiones_juego (Partidas grupales creadas por el instructor)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sesiones_juego` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo_sala` VARCHAR(8) NOT NULL, -- PIN de 6 u 8 caracteres (ej. 'AGUA-99')
  `instructor_id` INT UNSIGNED NOT NULL,
  `ficha_id` INT UNSIGNED NOT NULL,
  `max_aprendices` SMALLINT UNSIGNED NOT NULL DEFAULT 45,
  `tiempo_limite_segundos` INT UNSIGNED NOT NULL DEFAULT 900, -- 15 minutos
  `max_intentos_analisis` TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `estado_sala` ENUM('CONFIGURACION', 'ABIERTA', 'EN_JUEGO', 'FINALIZADA') NOT NULL DEFAULT 'CONFIGURACION',
  `fecha_apertura` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_cierre` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sesiones_codigo_sala` (`codigo_sala`),
  KEY `idx_sesiones_instructor` (`instructor_id`),
  KEY `idx_sesiones_ficha` (`ficha_id`),
  KEY `idx_sesiones_estado` (`estado_sala`),
  CONSTRAINT `fk_sesiones_instructor`
    FOREIGN KEY (`instructor_id`) REFERENCES `instructores` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sesiones_ficha`
    FOREIGN KEY (`ficha_id`) REFERENCES `fichas_sena` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. TABLA: partidas_aprendiz (Participación de cada aprendiz en la sala)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partidas_aprendiz` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sesion_id` INT UNSIGNED NOT NULL,
  `nombre_aprendiz` VARCHAR(80) NOT NULL, -- Nombre ingresado por el aprendiz (Cero datos personales)
  `estado_partida` ENUM('EN_ESPERA', 'CALIBRANDO', 'CALIBRADO_GANO', 'ENCLAVADO_FALLO', 'EXPULSADO') NOT NULL DEFAULT 'EN_ESPERA',
  `movimientos` INT UNSIGNED NOT NULL DEFAULT 0,
  `fallos_acumulados` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `coincidencias_columnas` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `tiempo_empleado_segundos` INT UNSIGNED NOT NULL DEFAULT 0,
  `tiempo_restante_segundos` INT UNSIGNED NOT NULL DEFAULT 900,
  `token_sesion_hash` CHAR(64) NULL, -- SHA-256 del token efímero de sesión activa
  `sesion_revocada` TINYINT(1) NOT NULL DEFAULT 0, -- 1 = Expulsado por el instructor
  `motivo_expulsion` VARCHAR(150) NULL,
  `ultimo_latido` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fecha_ingreso` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_finalizacion` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_partidas_sesion_nombre` (`sesion_id`, `nombre_aprendiz`),
  KEY `idx_partidas_estado` (`estado_partida`),
  KEY `idx_partidas_revocada` (`sesion_revocada`),
  CONSTRAINT `fk_partidas_sesion`
    FOREIGN KEY (`sesion_id`) REFERENCES `sesiones_juego` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. TABLA: auditoria_eventos_juego (Trazabilidad detallada de acciones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auditoria_eventos_juego` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `partida_aprendiz_id` INT UNSIGNED NOT NULL,
  `tipo_evento` ENUM('ROTACION_FILA', 'ANALISIS_FALLO', 'ANALISIS_EXITO', 'ENCLAVAMIENTO_3_FALLOS', 'ENCLAVAMIENTO_TIMEOUT', 'PURGA_SISTEMA', 'EXPULSION_INSTRUCTOR') NOT NULL,
  `detalle_json` JSON NULL,
  `fecha_evento` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_partida` (`partida_aprendiz_id`),
  KEY `idx_auditoria_tipo` (`tipo_evento`),
  CONSTRAINT `fk_auditoria_partida`
    FOREIGN KEY (`partida_aprendiz_id`) REFERENCES `partidas_aprendiz` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2.3. Políticas y Medidas Rigurosas de Seguridad

Para garantizar que los datos estén completamente protegidos frente a accesos no autorizados, inyecciones de código o vulnerabilidades comunes (OWASP Top 10), la base de datos se rige por las siguientes directrices:

### 1. Principio de Menor Privilegio (POLP - Separation of Concerns)
Nunca debe conectarse la aplicación web con el usuario `root`. Se crea un usuario de base de datos específico para el backend con privilegios estrictos:

```sql
-- Creación de usuario dedicado con contraseña robusta
CREATE USER IF NOT EXISTS 'sena_app_user'@'localhost' 
  IDENTIFIED BY 'ClaveRobustaSena2026!#$';

-- Concesión exclusiva sobre la base de datos del simulador
GRANT SELECT, INSERT, UPDATE, DELETE ON `sena_acertijo_db`.* TO 'sena_app_user'@'localhost';

-- Se revocan explícitamente privilegios destructivos de DDL
REVOKE DROP, ALTER, CREATE, GRANT OPTION ON `sena_acertijo_db`.* FROM 'sena_app_user'@'localhost';

FLUSH PRIVILEGES;
```

### 2. Almacenamiento Seguro de Credenciales (Hashing)
- **Algoritmo:** **Argon2id** (o en su defecto `bcrypt` con costo `work_factor = 12`).
- **Sal (Salt):** Generada criptográficamente por usuario de forma automática para la cuenta del instructor.
- **Prohibición:** Bajo ninguna circunstancia se almacenan contraseñas en texto claro, reversibles (DES/AES) o con funciones rotas (MD5, SHA-1).

### 3. Mitigación Total de Inyección SQL (Prepared Statements)
- Todas las consultas ejecutadas desde el backend hacia MySQL deben utilizar **sentencias preparadas con parámetros vinculados (Prepared Statements / Parameterized Queries)**:
  ```typescript
  // Ejemplo en Node.js (mysql2/promise):
  const [rows] = await db.execute(
    'SELECT id, estado_partida FROM partidas_aprendiz WHERE sesion_id = ? AND nombre_aprendiz = ?',
    [sessionId, learnerName]
  );
  ```
- Se prohíbe terminantemente la concatenación directa de cadenas en SQL (`"SELECT ... WHERE id = " + input`).

### 4. Seguridad de Tokens de Sesión y Prevención de Suplantación
- Los tokens de sesión efímeros de juego que se envían al navegador **no se guardan en texto plano en la base de datos**.
- En la tabla `partidas_aprendiz` solo se almacena el hash criptográfico `SHA-256(token)`.
- Si la base de datos llegase a filtrarse, ningún atacante podría utilizar esos hashes para suplantar la sesión de un aprendiz o del instructor.

---

## 2.4. Privacidad por Diseño (Privacy by Design) y Omisión Total de Datos Personales Sensibles

Siguiendo el principio de **Privacidad por Defecto y Minimización de Datos**:
1. **Omisión Absoluta de Documentos de Identidad:** No se solicita cédula de ciudadanía, tarjeta de identidad, PEP ni ningún tipo de identificación gubernamental.
2. **Omisión de Datos de Contacto:** No se solicitan correos electrónicos personales, números telefónicos ni domicilios.
3. **Identificación Lúdico-Pedagógica Exclusiva por Nombre:** El aprendiz ingresa únicamente su **Nombre** (ej. *"Carlos Gómez"* o *"Aprendiz 07"*) para ser visualizado en la pantalla del instructor durante la sesión de juego.
4. **Riesgo Cero de Fuga de Datos (Habeas Data - Ley 1581 de 2012):** Al no almacenar bases de datos con información civil ni sensible de menores de edad o aprendices, el sistema queda completamente exento de riesgos de suplantación de identidad o infracciones a las normativas de protección de datos personales en Colombia.

---

# Módulo 3: Plan de Distribución de Interfaz Zero-Scroll (`/frontend-design`)

## 3.1. Principios de Diseño y Restricción Estricta 100vh

De acuerdo con las guías de la skill `/frontend-design` y la necesidad expresa del usuario:
> **Restricción Crítica:** *"Un layout donde todos los elementos queden visibles sin necesidad de hacer scroll vertical."*

### Desafío de Diseño:
Las salas de cómputo del SENA cuentan con monitores heterogéneos, que van desde pantallas panorámicas **Full HD (1920×1080)** hasta equipos de escritorio y todo-en-uno compactos **HD (1366×768 o 1280×720)**.

Para erradicar el scroll vertical al 100%:
- Se utiliza la regla estructural `height: 100vh; max-height: 100vh; overflow: hidden;`.
- Todas las dimensiones verticales se definen mediante funciones relativas calculadas: `calc()`, `vh`, `clamp()` y CSS Grid con fracciones `fr` y límites `minmax(0, ...)`.
- Se suprimen los paddings y márgenes decorativos excesivos.
- Se planean dos pantallas completamente independientes:
  1. **Pantalla del Aprendiz:** La consola industrial del acertijo.
  2. **Pantalla del Instructor:** El centro de mando de supervisión de 45 aprendices.

---

## 3.2. Pantalla A: Consola del Aprendiz (Sintetizador Zero-Scroll)

### Concepto y Jerarquía Visual:
La consola del aprendiz mantiene la atmósfera industrial de una terminal técnica de tratamiento de agua. La vista se divide en **dos columnas maestras**: la columna izquierda (zona principal de calibración) ocupa el **72% del ancho**, y la columna derecha (bahía de operaciones) ocupa el **28% del ancho**.

### Diagrama ASCII de Distribución Espacial (100vh):

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [●] SINTETIZADOR DE TRATAMIENTO DE AGUA — TERMINAL 03 | Ficha: 2824510 | Aprendiz: C. Gómez   │ 36px (Header)
├─────────────────────────────────────────────────────────────┬────────────────────────────────┤
│ ┌─ CALIBRATION PANEL (72% Ancho) ─────────────────────────┐ │ ┌─ OPS BAY (28% Ancho) ──────┐ │
│ │                                                         │ │ │ [?] GUÍA OPERATIVA (Acción)│ │ 32px
│ │ BANDA 1: SAMPLE (Muestra Patrón Objetivo)               │ │ ├────────────────────────────┤ │
│ │ [SAMPLE] Vial | Canvas Objetivo (16 cols) // SEÑAL OK   │ │ │ [⏱] CRONÓMETRO CONTENCIÓN  │ │
│ │                                             (~16% Alt)  │ │ │ 14:38 [██████████░░] 15MIN │ │ 58px
│ ├─────────────────────────────────────────────────────────┤ │ ├────────────────────────────┤ │
│ │                                                         │ │ │ TELEMETRÍA DEL SISTEMA     │ │
│ │ BANDA 2-4: FILAS DE CALIBRACIÓN (Canvas Unificado)      │ │ │ Movimientos: 18            │ │
│ │ [A] ◀ ▶ Canal Rojo   (Altura h1..h4)                    │ │ │ Fallos: [ 1 / 3 MÁX ]      │ │ 72px
│ │ [B] ◀ ▶ Canal Ámbar  (Altura h1..h4)                    │ │ │ Estado: EN OPERACIÓN ●     │ │
│ │ [C] ◀ ▶ Canal Cian   (Altura h1..h4)                    │ │ ├────────────────────────────┤ │
│ │                                             (~48% Alt)  │ │ │ VÁLVULAS Y ACCIONES        │ │
│ ├─────────────────────────────────────────────────────────┤ │ │ [▣ ANALIZAR MUESTRA]       │ │ 42px
│ │                                                         │ │ │ [⟲ PURGAR SISTEMA]         │ │ 38px
│ │ BANDA 5: RESULT (Suma en Vivo Monocromática Azul)       │ │ ├────────────────────────────┤ │
│ │ [RESULT] LEDs | Canvas Suma // COINCIDENCIA: 7/16 COL   │ │ │ [●] MÁXIMA DIFICULTAD (16C)│ │ 28px
│ │                                             (~16% Alt)  │ │ └────────────────────────────┘ │
│ └─────────────────────────────────────────────────────────┘ │                                │
└─────────────────────────────────────────────────────────────┴────────────────────────────────┘
  [Barra Inferior Opcional de Estado de Red: WebSocket Conectado ● 34ms]                          22px
```

### Tabla de Asignación de Presupuesto Vertical (Viewport Budget):

| Sección | Elemento | Altura Objetivo (1080p) | Altura Adaptada (768p) | Mecanismo de Control |
| :--- | :--- | :---: | :---: | :--- |
| **Cabecera** | Título, Ficha SENA y Aprendiz | `40px` | `32px` | Altura fija `flex-shrink: 0` |
| **Banda 1** | SAMPLE (Pantalla referencia) | `110px` | `75px` | Canvas con `height="70"` escalado |
| **Banda 2–4** | FILAS A, B, C (Calibración) | `320px` | `210px` | Canvas con `height="180"` |
| **Banda 5** | RESULT (Histograma en vivo) | `110px` | `75px` | Canvas con `height="70"` escalado |
| **Bahía Lateral** | 5 módulos apilados | `100% columna` | `100% columna` | `display: flex; gap: 4px;` sin scroll |
| **Gaps & Margins** | Espaciadores de cuadrícula | `6px` | `3px` | `gap: clamp(2px, 0.6vh, 6px);` |
| **Total Global** | **Consola Completa** | **`100vh`** | **`100vh`** | **`overflow: hidden;` CERO SCROLL** |

---

## 3.3. Pantalla B: Panel de Mando del Instructor (Matriz de 45 Aprendices)

### Concepto y Jerarquía Visual:
El instructor debe vigilar a **45 aprendices en simultáneo**. Una lista vertical tradicional obligaría a hacer scroll interminable. En su lugar, aplicamos un diseño de **"Matriz de Telemetría Scada"**: una cuadrícula de **9 columnas × 5 filas = exactamente 45 cuadrantes visibles al mismo tiempo**.

### Diagrama ASCII del Dashboard del Instructor (Zero-Scroll 100vh):

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [●] PANEL DE CONTROL DE EVALUACIÓN SENA | Ficha: 2824510 | Sala: #AGUA-99 | Conectados: 42/45 Aprendices  │ 46px
│ [► Iniciar Ronda] [⏸ Congelar Todo] [⟲ Purgar Todos] [Filtros: Todos (42) | Bloqueados (3) | Éxito (8)] │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MATRIZ DE APRENDICES EN VIVO (45 CELDAS COMPACTAS - 9 COLUMNAS × 5 FILAS - CERO SCROLL)                 │
│                                                                                                          │
│ ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐ ... ┌──────────────┐   │
│ │1. C. GÓMEZ   ││2. J. PÉREZ   ││3. M. DUARTE  ││4. L. CASTRO  ││5. S. VARGAS  │     │9. D. ROJAS   │   │
│ │● EN OPERACIÓN││● CALIBRADO 🏆││● ENCLAVADO ⚠ ││● EN OPERACIÓN││● EN OPERACIÓN│     │○ DESCONECTADO│   │
│ │Coinc: 12/16  ││T: 04:12 Récord││Fallos: 3/3   ││Coinc: 4/16   ││Coinc: 9/16   │     │Sin latido    │   │
│ │T.Rest: 11:20 ││Movs: 24      ││T.Rest: 00:00 ││T.Rest: 13:45 ││T.Rest: 08:30 │     │T.Rest: 15:00 │   │
│ │[✕ Expulsar]  ││[ Detalle ]   ││[⟲ Desbloq][✕]││[✕ Expulsar]  ││[✕ Expulsar]  │     │[ Reinvitar ] │   │
│ └──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘     └──────────────┘   │
│ ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐ ... ┌──────────────┐   │
│ │10. B. MEJÍA  ││11. K. SOTO   ││12. A. MORA   ││13. F. GIL    ││14. T. BLANCO │     │18. V. RÍOS   │   │
│ │...           ││...           ││...           ││...           ││...           │     │...           │   │
│ └──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘     └──────────────┘   │
│  [ Filas 3, 4 y 5 completando los 45 aprendices sin necesidad de barra de desplazamiento ]               │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ BARRA DE RESUMEN: Promedio Ronda: 08:45 | 🏆 Calibrados: 8 (19%) | ⚠ Enclavados: 3 (7%) | Exportar CSV ⤓ │ 36px
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Anatomía de cada Tarjeta de Aprendiz (Micro-Card 9×5):
- **Dimensiones:** Ancho `~10.5vw`, Alto `~14vh` (cabe exactamente en pantallas 768p y 1080p).
- **Semáforo Perimetral:**
  - Borde verde fosforescente (`#00ff73`): Aprendiz que ya resolvió el acertijo.
  - Borde ámbar suave (`#ff9900`): Aprendiz activo manipulando filas.
  - Borde rojo intermitente (`#ff3b30`): Aprendiz bloqueado (enclavamiento activo).
  - Borde gris atenuado (`#334155`): Aprendiz sin conexión.
- **Botón de Acción Directa:** Botón rojo miniatura `[ ✕ ]` para expulsar inmediatamente al aprendiz con confirmación rápida (toast de 1 clic).

---

## 3.4. Sistema de Diseño (Tokens, Tipografía y Paleta Cromática)

Siguiendo las instrucciones de la skill `/frontend-design`, evitamos interfaces genéricas o clichés tipo plantilla bootstrap:

### 1. Paleta de Color Curada (Industrial Terminal SENA - 60-30-10):
- **Base (60%):** `#030805` (Negro grafito profundo, fondo de pantalla de terminal fósforo).
- **Superficies y Paneles (30%):** `#08140c` y `#0d1f14` (Chasis de consola metálica militar).
- **Acentos Diegéticos (10%):**
  - Azul Cian Analítico (`#00d4ff`): Muestra de referencia (`SAMPLE`), barras misteriosas de suma (`RESULT`) y cronómetro de contención.
  - Verde Fósforo (`#00ff73`): Estado calibrado, aciertos globales y alimentación del sistema.
  - Ámbar Radiante (`#ff9900`): Advertencia de tiempo (< 3 min) y manual de operación.
  - Rojo Sirena de Emergencia (`#ff3b30`): Enclavamiento de seguridad, 3 fallos y botón de expulsión forzada.

### 2. Jerarquía Tipográfica Técnica:
- **Tipografía de Display y Cifras:** `'Share Tech Mono'`, `'JetBrains Mono'`, monospace. Utilizada para cronómetros, telemetría y códigos de sala.
- **Tipografía de Soporte / Etiquetas:** `'IBM Plex Sans'`, `'Inter'`, sans-serif. Utilizada para nombres de aprendices e instrucciones, garantizando legibilidad en tamaños reducidos (10px a 12px) sin fatiga visual.

---

# Hoja de Ruta de Implementación Técnica

Para llevar a cabo este plan de manera ordenada y sin romper la arquitectura existente, se proponen las siguientes fases de desarrollo:

| Fase | Tarea Principal | Archivos Involucrados | Entregable Clave |
| :---: | :--- | :--- | :--- |
| **Etapa 1** | **Esquema de Base de Datos** | `database/schema.sql`, `database/seed.sql` | Ejecución del DDL en MySQL y creación del usuario `sena_app_user`. |
| **Etapa 2** | **Servicio Backend de Control** | `server/src/server.ts`, `server/src/routes/auth.ts`, `server/src/ws/gateway.ts` | API REST para login/salas y Gateway WebSocket de presencia y expulsión. |
| **Etapa 3** | **Instrumentación del Juego (Cliente)** | `src/infrastructure/NetworkAdapter.ts`, `src/index.ts` | Conexión del bucle de juego del aprendiz al socket del aula. |
| **Etapa 4** | **Dashboard del Instructor (Zero-Scroll)** | `instructor/index.html`, `instructor/dashboard.ts`, `instructor/styles.css` | Matriz visual en vivo de 45 aprendices con botón de kick. |
| **Etapa 5** | **Ajuste Responsive Zero-Scroll** | `src/ui/styles/layout.css` | Calibración de reglas `vh` y `clamp()` para monitores 1366×768 y 1920×1080. |
| **Etapa 6** | **Pruebas de Carga y Seguridad** | `tests/load/simulation-45-users.test.ts` | Simulación de 45 aprendices concurrentes transmitiendo eventos sin latencia. |

---

*Fin del documento de planeación arquitectónica. Este plan proporciona la base completa para proceder a la fase de construcción de backend, base de datos y vistas.*
