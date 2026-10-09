-- Consulta: RRHH único del servicio (para tabla de responsables)
SELECT DISTINCT
    frr.codigo_costeo,
    frr.grupo_ocupacional,
    r.pago_mensual,
    r.jornada_minutos
FROM costeo_procedimientos cp
JOIN costeo_fases f ON cp.id = f.costeo_id
JOIN costeo_fase_rrhh frr ON f.id = frr.fase_id
LEFT JOIN cat_rrhh r ON frr.rrhh_id = r.id
WHERE cp.upss_servicio = 'BIOQUIMICA'
ORDER BY frr.grupo_ocupacional;