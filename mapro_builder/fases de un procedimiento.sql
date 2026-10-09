-- Consulta: Fases de un procedimiento específico
SELECT 
    f.id,
    f.nombre_fase,
    f.descripcion_actividad,
    f.orden,
    f.tiempo_minutos,
    f.subtotal_rrhh,
    f.subtotal_insumos,
    f.subtotal_equipos,
    f.subtotal_fase
FROM costeo_fases f
WHERE f.costeo_id = ?  -- ID del procedimiento
ORDER BY f.orden;