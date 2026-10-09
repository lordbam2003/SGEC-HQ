-- Consulta: Insumos por fase, clasificados por tipo
SELECT 
    fi.descripcion,
    fi.tipo_insumo,
    fi.unidad_medida,
    fi.cantidad,
    fi.costo_unitario,
    fi.costo_parcial,
    CASE 
        WHEN fi.descripcion LIKE '%GUANTE%' THEN 'EPP'
        WHEN fi.descripcion LIKE '%MASCARILLA%' THEN 'EPP'
        WHEN fi.descripcion LIKE '%GORRO%' THEN 'EPP'
        WHEN fi.descripcion LIKE '%MANDILON%' THEN 'EPP'
        WHEN fi.descripcion LIKE '%REACTIVO%' THEN 'REACTIVO'
        WHEN fi.descripcion LIKE '%TIRA%' THEN 'REACTIVO'
        WHEN fi.descripcion LIKE '%TUBO%' THEN 'MATERIAL'
        WHEN fi.descripcion LIKE '%PAPEL%' THEN 'MATERIAL'
        WHEN fi.descripcion LIKE '%TINTA%' THEN 'MATERIAL'
        ELSE 'OTRO'
    END AS categoria_mapro
FROM costeo_fase_insumos fi
WHERE fi.fase_id = ?
ORDER BY categoria_mapro, fi.descripcion;