-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SIMULADOR DE MUESTRA DE AGUA (SENA)
-- Motor: MySQL 8.0+ | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Política: minimización de datos (solo nombre visible del aprendiz).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `sena_acertijo_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `sena_acertijo_db`;

CREATE TABLE IF NOT EXISTS `instructores` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario` VARCHAR(40) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `nombre_completo` VARCHAR(80) NOT NULL DEFAULT 'Instructor SENA',
  `estado` ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  `ultimo_acceso` DATETIME(3) NULL DEFAULT NULL,
  `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_instructores_usuario` (`usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sesiones_instructor` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `instructor_id` INT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expira_en` DATETIME(3) NOT NULL,
  `revocada` TINYINT(1) NOT NULL DEFAULT 0,
  `creada_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sesiones_instructor_token` (`token_hash`),
  KEY `idx_sesiones_instructor_expira` (`expira_en`),
  CONSTRAINT `fk_sesiones_instructor`
    FOREIGN KEY (`instructor_id`) REFERENCES `instructores` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rondas` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo_sala` VARCHAR(8) NOT NULL,
  `instructor_id` INT UNSIGNED NOT NULL,
  `estado` ENUM('ABIERTA', 'EN_JUEGO', 'CONGELADA', 'FINALIZADA') NOT NULL DEFAULT 'ABIERTA',
  `max_aprendices` SMALLINT UNSIGNED NOT NULL DEFAULT 45,
  `duracion_segundos` INT UNSIGNED NOT NULL DEFAULT 900,
  `inicia_en` DATETIME(3) NULL DEFAULT NULL,
  `termina_en` DATETIME(3) NULL DEFAULT NULL,
  `congelada_en` DATETIME(3) NULL DEFAULT NULL,
  `creada_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finalizada_en` DATETIME(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rondas_codigo` (`codigo_sala`),
  KEY `idx_rondas_estado` (`estado`),
  KEY `idx_rondas_instructor` (`instructor_id`),
  CONSTRAINT `fk_rondas_instructor`
    FOREIGN KEY (`instructor_id`) REFERENCES `instructores` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jugadores` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ronda_id` INT UNSIGNED NOT NULL,
  `nombre` VARCHAR(40) NOT NULL,
  `nombre_clave` VARCHAR(40) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `estado` ENUM('EN_ESPERA', 'JUGANDO', 'CALIBRADO', 'BLOQUEADO', 'DESCONECTADO', 'EXPULSADO')
    NOT NULL DEFAULT 'EN_ESPERA',
  `movimientos` INT UNSIGNED NOT NULL DEFAULT 0,
  `fallos` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `coincidencias` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `tiempo_restante` INT UNSIGNED NOT NULL DEFAULT 900,
  `conectado_en` DATETIME(3) NULL DEFAULT NULL,
  `ultimo_latido` DATETIME(3) NULL DEFAULT NULL,
  `desconectado_en` DATETIME(3) NULL DEFAULT NULL,
  `expulsado_en` DATETIME(3) NULL DEFAULT NULL,
  `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_jugadores_ronda_nombre` (`ronda_id`, `nombre_clave`),
  UNIQUE KEY `uk_jugadores_token` (`token_hash`),
  KEY `idx_jugadores_ronda_estado` (`ronda_id`, `estado`),
  CONSTRAINT `fk_jugadores_ronda`
    FOREIGN KEY (`ronda_id`) REFERENCES `rondas` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eventos_juego` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ronda_id` INT UNSIGNED NOT NULL,
  `jugador_id` INT UNSIGNED NULL DEFAULT NULL,
  `tipo` ENUM(
    'RONDA_CREADA', 'RONDA_INICIADA', 'RONDA_CONGELADA', 'RONDA_REANUDADA',
    'RONDA_FINALIZADA', 'JUGADOR_INGRESO', 'JUGADOR_RECONECTO',
    'JUGADOR_DESCONECTO', 'JUGADOR_BLOQUEADO', 'JUGADOR_EXPULSADO',
    'TELEMETRIA', 'TIEMPO_AGOTADO'
  ) NOT NULL,
  `detalle_json` JSON NULL,
  `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_eventos_ronda` (`ronda_id`),
  KEY `idx_eventos_jugador` (`jugador_id`),
  KEY `idx_eventos_tipo` (`tipo`),
  CONSTRAINT `fk_eventos_ronda`
    FOREIGN KEY (`ronda_id`) REFERENCES `rondas` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_eventos_jugador`
    FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario de aplicación con mínimo privilegio (ejecutar como administrador).
-- La contraseña debe venir de un gestor de secretos, nunca del repositorio.
-- CREATE USER 'sena_app_user'@'%' IDENTIFIED BY '<SECRETO>';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON `sena_acertijo_db`.* TO 'sena_app_user'@'%';
-- FLUSH PRIVILEGES;
