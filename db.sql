-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         11.4.5-MariaDB - mariadb.org binary distribution
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.21.0.7344
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para costeador
CREATE DATABASE IF NOT EXISTS `costeador` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `costeador`;

-- 1. Catálogos base independientes

CREATE TABLE IF NOT EXISTS `cat_costos_indirectos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_upss` varchar(50) DEFAULT NULL,
  `ups` varchar(255) DEFAULT NULL,
  `servicio` varchar(255) NOT NULL,
  `area_m2` float DEFAULT NULL,
  `asignacion_admin` float DEFAULT NULL,
  `asignacion_generales` float DEFAULT NULL,
  `produccion_optima_anual` float DEFAULT NULL,
  `costo_unit_admin` float DEFAULT NULL,
  `costo_unit_generales` float DEFAULT NULL,
  `costo_unit_total_pms` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_cat_costos_indirectos_servicio` (`servicio`),
  KEY `ix_cat_costos_indirectos_codigo_upss` (`codigo_upss`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cat_cpms` (
  `codigo` varchar(50) NOT NULL,
  `denominacion` text NOT NULL,
  `grupo_codigo` varchar(50) DEFAULT NULL,
  `grupo_nombre` varchar(255) DEFAULT NULL,
  `seccion_codigo` varchar(50) DEFAULT NULL,
  `seccion_nombre` varchar(255) DEFAULT NULL,
  `subseccion_codigo` varchar(50) DEFAULT NULL,
  `subseccion_nombre` varchar(255) DEFAULT NULL,
  `situacion` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  KEY `ix_cat_cpms_seccion_nombre` (`seccion_nombre`),
  KEY `ix_cat_cpms_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cat_equipamiento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `codigo_margesi` varchar(50) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `tipo_equipamiento` varchar(255) DEFAULT NULL,
  `centro_costos` varchar(255) DEFAULT NULL,
  `valor_adquisicion` float DEFAULT NULL,
  `vida_util_minutos` float DEFAULT NULL,
  `costo_minuto` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_cat_equipamiento_codigo_costeo` (`codigo_costeo`),
  KEY `ix_cat_equipamiento_codigo_margesi` (`codigo_margesi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cat_infraestructura` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `ups` varchar(255) DEFAULT NULL,
  `servicio` varchar(255) NOT NULL,
  `num_ambiente` int(11) DEFAULT NULL,
  `area_m2` float DEFAULT NULL,
  `valor_construccion_m2` float DEFAULT NULL,
  `valor_total_upss` float DEFAULT NULL,
  `vida_util_minutos` float DEFAULT NULL,
  `depreciacion_minuto` float DEFAULT NULL,
  `referencia_normativa` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_cat_infraestructura_servicio` (`servicio`),
  KEY `ix_cat_infraestructura_codigo_costeo` (`codigo_costeo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cat_insumos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `codigo_usado` varchar(50) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `unidad_medida` varchar(100) DEFAULT NULL,
  `unidad_adquisicion` varchar(100) DEFAULT NULL,
  `precio_promedio` float DEFAULT NULL,
  `cantidad_presentacion` float DEFAULT NULL,
  `unidad_consumo` varchar(100) DEFAULT NULL,
  `costo_unitario` float DEFAULT NULL,
  `costo_minuto` float DEFAULT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `codigo_siga` varchar(50) DEFAULT NULL,
  `precio_siga` double DEFAULT 0,
  `origen` varchar(20) DEFAULT 'BASE',
  PRIMARY KEY (`id`),
  KEY `ix_cat_insumos_codigo_usado` (`codigo_usado`),
  KEY `ix_cat_insumos_codigo_costeo` (`codigo_costeo`),
  KEY `idx_codigo_siga` (`codigo_siga`),
  KEY `idx_origen` (`origen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cat_rrhh` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `grupo_ocupacional` varchar(255) NOT NULL,
  `pago_mensual` float DEFAULT NULL,
  `jornada_minutos` float DEFAULT NULL,
  `costo_minuto` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_cat_rrhh_codigo_costeo` (`codigo_costeo`),
  KEY `ix_cat_rrhh_grupo_ocupacional` (`grupo_ocupacional`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cat_servicios_basicos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `ups` varchar(255) DEFAULT NULL,
  `servicio` varchar(255) NOT NULL,
  `area_m2` float DEFAULT NULL,
  `costo_total_servicio` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_cat_servicios_basicos_codigo_costeo` (`codigo_costeo`),
  KEY `ix_cat_servicios_basicos_servicio` (`servicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Catálogos dependientes

CREATE TABLE IF NOT EXISTS `cat_servicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) DEFAULT NULL,
  `ups` varchar(255) NOT NULL,
  `nombre_servicio` varchar(255) NOT NULL,
  `centros_costo_equipamiento` text DEFAULT NULL,
  `infraestructura_id` int(11) DEFAULT NULL,
  `servicios_basicos_id` int(11) DEFAULT NULL,
  `costos_indirectos_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `infraestructura_id` (`infraestructura_id`),
  KEY `servicios_basicos_id` (`servicios_basicos_id`),
  KEY `costos_indirectos_id` (`costos_indirectos_id`),
  KEY `ix_cat_servicios_ups` (`ups`),
  KEY `ix_cat_servicios_codigo` (`codigo`),
  KEY `ix_cat_servicios_nombre_servicio` (`nombre_servicio`),
  CONSTRAINT `cat_servicios_ibfk_1` FOREIGN KEY (`infraestructura_id`) REFERENCES `cat_infraestructura` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cat_servicios_ibfk_2` FOREIGN KEY (`servicios_basicos_id`) REFERENCES `cat_servicios_basicos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cat_servicios_ibfk_3` FOREIGN KEY (`costos_indirectos_id`) REFERENCES `cat_costos_indirectos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Autenticación y Usuarios

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `hashed_password` varchar(255) NOT NULL,
  `nombre_completo` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `rol` varchar(50) NOT NULL DEFAULT 'usuario',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_usuarios_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Cabecera de Costeo de Procedimientos

CREATE TABLE IF NOT EXISTS `costeo_procedimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_cpms` varchar(50) NOT NULL,
  `nombre_procedimiento` varchar(500) NOT NULL,
  `upss_servicio` varchar(255) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `infraestructura_id` int(11) DEFAULT NULL,
  `servicios_basicos_id` int(11) DEFAULT NULL,
  `costos_indirectos_id` int(11) DEFAULT NULL,
  `tiempo_total_minutos` float DEFAULT NULL,
  `costo_rrhh` float DEFAULT NULL,
  `costo_insumos` float DEFAULT NULL,
  `costo_equipos` float DEFAULT NULL,
  `costo_infraestructura` float DEFAULT NULL,
  `costo_servicios` float DEFAULT NULL,
  `costo_directo` float DEFAULT NULL,
  `gastos_admin` float DEFAULT NULL,
  `gastos_generales` float DEFAULT NULL,
  `costo_indirecto` float DEFAULT NULL,
  `costo_total_estandar` float DEFAULT NULL,
  `costo_medicamentos` float DEFAULT NULL,
  `costo_total_final` float DEFAULT NULL,
  `tarifa_referencial` float DEFAULT NULL,
  `tarifa_no_asegurados` float DEFAULT NULL,
  `tarifa_sis` float DEFAULT NULL,
  `tarifa_essalud` float DEFAULT NULL,
  `tarifa_privados` float DEFAULT NULL,
  `margen_privados_pct` float DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `servicio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `infraestructura_id` (`infraestructura_id`),
  KEY `servicios_basicos_id` (`servicios_basicos_id`),
  KEY `costos_indirectos_id` (`costos_indirectos_id`),
  KEY `ix_costeo_procedimientos_upss_servicio` (`upss_servicio`),
  KEY `ix_costeo_procedimientos_codigo_cpms` (`codigo_cpms`),
  KEY `fk_costeo_servicio` (`servicio_id`),
  CONSTRAINT `costeo_procedimientos_ibfk_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `costeo_procedimientos_ibfk_1` FOREIGN KEY (`infraestructura_id`) REFERENCES `cat_infraestructura` (`id`) ON DELETE SET NULL,
  CONSTRAINT `costeo_procedimientos_ibfk_2` FOREIGN KEY (`servicios_basicos_id`) REFERENCES `cat_servicios_basicos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `costeo_procedimientos_ibfk_3` FOREIGN KEY (`costos_indirectos_id`) REFERENCES `cat_costos_indirectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_costeo_servicio` FOREIGN KEY (`servicio_id`) REFERENCES `cat_servicios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Fases y Detalles de Costeo

CREATE TABLE IF NOT EXISTS `costeo_fases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `costeo_id` int(11) NOT NULL,
  `nombre_fase` varchar(150) NOT NULL,
  `descripcion_actividad` varchar(500) DEFAULT NULL,
  `orden` int(11) DEFAULT NULL,
  `tiempo_minutos` float DEFAULT NULL,
  `subtotal_rrhh` float DEFAULT NULL,
  `subtotal_insumos` float DEFAULT NULL,
  `subtotal_equipos` float DEFAULT NULL,
  `subtotal_fase` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `costeo_id` (`costeo_id`),
  CONSTRAINT `costeo_fases_ibfk_1` FOREIGN KEY (`costeo_id`) REFERENCES `costeo_procedimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `costeo_fase_rrhh` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fase_id` int(11) NOT NULL,
  `rrhh_id` int(11) DEFAULT NULL,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `grupo_ocupacional` varchar(255) NOT NULL,
  `tiempo_minutos` float DEFAULT NULL,
  `cantidad` float DEFAULT NULL,
  `costo_unitario` float DEFAULT NULL,
  `costo_parcial` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fase_id` (`fase_id`),
  KEY `rrhh_id` (`rrhh_id`),
  CONSTRAINT `costeo_fase_rrhh_ibfk_1` FOREIGN KEY (`fase_id`) REFERENCES `costeo_fases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `costeo_fase_rrhh_ibfk_2` FOREIGN KEY (`rrhh_id`) REFERENCES `cat_rrhh` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `costeo_fase_insumos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fase_id` int(11) NOT NULL,
  `insumo_id` int(11) DEFAULT NULL,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `codigo_usado` varchar(50) DEFAULT NULL,
  `descripcion` varchar(500) NOT NULL,
  `tipo_insumo` varchar(50) DEFAULT NULL,
  `unidad_medida` varchar(100) DEFAULT NULL,
  `unidad_consumo` varchar(100) DEFAULT NULL,
  `tiempo_minutos` float DEFAULT NULL,
  `cantidad` float DEFAULT NULL,
  `costo_unitario` float DEFAULT NULL,
  `costo_minuto` float DEFAULT NULL,
  `costo_parcial` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fase_id` (`fase_id`),
  KEY `insumo_id` (`insumo_id`),
  CONSTRAINT `costeo_fase_insumos_ibfk_1` FOREIGN KEY (`fase_id`) REFERENCES `costeo_fases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `costeo_fase_insumos_ibfk_2` FOREIGN KEY (`insumo_id`) REFERENCES `cat_insumos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `costeo_fase_equipos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fase_id` int(11) NOT NULL,
  `equipo_id` int(11) DEFAULT NULL,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `codigo_margesi` varchar(50) DEFAULT NULL,
  `descripcion` varchar(500) NOT NULL,
  `tipo_equipamiento` varchar(100) DEFAULT NULL,
  `tiempo_minutos` float DEFAULT NULL,
  `cantidad` float DEFAULT NULL,
  `costo_unitario` float DEFAULT NULL,
  `costo_parcial` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fase_id` (`fase_id`),
  KEY `equipo_id` (`equipo_id`),
  CONSTRAINT `costeo_fase_equipos_ibfk_1` FOREIGN KEY (`fase_id`) REFERENCES `costeo_fases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `costeo_fase_equipos_ibfk_2` FOREIGN KEY (`equipo_id`) REFERENCES `cat_equipamiento` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `costeo_medicamentos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `costeo_id` int(11) NOT NULL,
  `insumo_id` int(11) DEFAULT NULL,
  `codigo_costeo` varchar(50) DEFAULT NULL,
  `descripcion` varchar(500) NOT NULL,
  `unidad_medida` varchar(100) DEFAULT NULL,
  `cantidad` float DEFAULT NULL,
  `costo_unitario` float DEFAULT NULL,
  `costo_parcial` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `costeo_id` (`costeo_id`),
  KEY `insumo_id` (`insumo_id`),
  CONSTRAINT `costeo_medicamentos_ibfk_1` FOREIGN KEY (`costeo_id`) REFERENCES `costeo_procedimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `costeo_medicamentos_ibfk_2` FOREIGN KEY (`insumo_id`) REFERENCES `cat_insumos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `estudio_mercado_referencias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `costeo_id` int(11) NOT NULL,
  `institucion` varchar(255) NOT NULL,
  `precio_referencia` float DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `costeo_id` (`costeo_id`),
  CONSTRAINT `estudio_mercado_referencias_ibfk_1` FOREIGN KEY (`costeo_id`) REFERENCES `costeo_procedimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
