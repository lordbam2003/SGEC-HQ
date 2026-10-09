-- Consulta: Listar procedimientos de una UPSS (ej: BIOQUIMICA)
SELECT 
    cp.id,
    cp.codigo_cpms,
    cp.nombre_procedimiento,
    cp.upss_servicio,
    cp.tiempo_total_minutos,
    cp.costo_total_estandar,
    cp.estado,
    c.denominacion AS denominacion_cpms,
    c.grupo_nombre,
    c.seccion_nombre,
    c.subseccion_nombre
FROM costeo_procedimientos cp
JOIN cat_cpms c ON cp.codigo_cpms = c.codigo
WHERE cp.upss_servicio = 'BIOQUIMICA'  -- Parametrizable
  AND cp.estado = 'ACTIVO'             -- Parametrizable
ORDER BY cp.codigo_cpms;