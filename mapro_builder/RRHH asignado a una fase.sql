-- Consulta: RRHH por fase
SELECT 
    frr.codigo_costeo,
    frr.grupo_ocupacional,
    frr.tiempo_minutos,
    frr.cantidad,
    frr.costo_unitario,
    frr.costo_parcial,
    r.pago_mensual,
    r.jornada_minutos
FROM costeo_fase_rrhh frr
LEFT JOIN cat_rrhh r ON frr.rrhh_id = r.id
WHERE frr.fase_id = ?;