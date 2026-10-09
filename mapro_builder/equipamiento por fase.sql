-- Consulta: Equipos por fase
SELECT 
    fe.descripcion,
    fe.tipo_equipamiento,
    fe.tiempo_minutos,
    fe.cantidad,
    fe.costo_unitario,
    fe.costo_parcial,
    e.codigo_margesi,
    e.valor_adquisicion
FROM costeo_fase_equipos fe
LEFT JOIN cat_equipamiento e ON fe.equipo_id = e.id
WHERE fe.fase_id = ?
  AND fe.tipo_equipamiento IN ('EQUIPO', 'EQUIPOS COMPUTACIONALES Y PERIFÉRICOS')
ORDER BY fe.descripcion;