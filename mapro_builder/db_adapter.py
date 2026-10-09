import sqlite3
import yaml
from typing import List, Dict, Optional

class CosteoDBAdapter:
    """Adaptador para conectar la BD de costeo con el generador MAPRO"""
    
    def __init__(self, db_path: str, config_path: str):
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)
        
        self.upss = self.config['filtros']['upss_objetivo']
        self.tipos_equip_relevantes = self.config['filtros']['tipos_equipamiento_relevantes']
    
    def obtener_procedimientos(self) -> List[Dict]:
        """CAPÍTULO IV: Inventario de procedimientos"""
        query = """
        SELECT 
            cp.id,
            cp.codigo_cpms,
            cp.nombre_procedimiento,
            cp.upss_servicio,
            cp.tiempo_total_minutos,
            cp.costo_total_estandar,
            c.denominacion AS denominacion_cpms
        FROM costeo_procedimientos cp
        JOIN cat_cpms c ON cp.codigo_cpms = c.codigo
        WHERE cp.upss_servicio = ?
          AND cp.estado = ?
        ORDER BY cp.codigo_cpms
        """
        cursor = self.conn.execute(query, (self.upss, self.config['filtros']['estado_procedimientos']))
        return [dict(row) for row in cursor.fetchall()]
    
    def obtener_fases_procedimiento(self, costeo_id: int) -> List[Dict]:
        """CAPÍTULO V: Fases de un procedimiento (para flujograma)"""
        query = """
        SELECT 
            id, nombre_fase, descripcion_actividad, orden,
            tiempo_minutos, subtotal_rrhh, subtotal_insumos, 
            subtotal_equipos, subtotal_fase
        FROM costeo_fases
        WHERE costeo_id = ?
        ORDER BY orden
        """
        cursor = self.conn.execute(query, (costeo_id,))
        return [dict(row) for row in cursor.fetchall()]
    
    def obtener_rrhh_fase(self, fase_id: int) -> List[Dict]:
        """RRHH asignado a una fase"""
        query = """
        SELECT 
            frr.codigo_costeo,
            frr.grupo_ocupacional,
            frr.tiempo_minutos,
            frr.cantidad,
            frr.costo_parcial
        FROM costeo_fase_rrhh frr
        WHERE frr.fase_id = ?
        """
        cursor = self.conn.execute(query, (fase_id,))
        return [dict(row) for row in cursor.fetchall()]
    
    def obtener_insumos_fase(self, fase_id: int) -> Dict[str, List[Dict]]:
        """Insumos clasificados por categoría (EPP, Reactivo, Material)"""
        query = """
        SELECT descripcion, tipo_insumo, unidad_medida, 
               cantidad, costo_unitario, costo_parcial
        FROM costeo_fase_insumos
        WHERE fase_id = ?
        """
        cursor = self.conn.execute(query, (fase_id,))
        insumos = [dict(row) for row in cursor.fetchall()]
        
        # Clasificar según config.yaml
        clasificados = {'EPP': [], 'REACTIVO': [], 'MATERIAL': [], 'OTRO': []}
        for ins in insumos:
            categoria = self._clasificar_insumo(ins['descripcion'])
            clasificados[categoria].append(ins)
        
        return clasificados
    
    def obtener_equipamiento_fase(self, fase_id: int) -> List[Dict]:
        """Equipamiento relevante de una fase"""
        placeholders = ','.join('?' * len(self.tipos_equip_relevantes))
        query = f"""
        SELECT descripcion, tipo_equipamiento, tiempo_minutos,
               cantidad, costo_parcial
        FROM costeo_fase_equipos
        WHERE fase_id = ?
          AND tipo_equipamiento IN ({placeholders})
        """
        cursor = self.conn.execute(query, [fase_id] + self.tipos_equip_relevantes)
        return [dict(row) for row in cursor.fetchall()]
    
    def obtener_responsables_servicio(self) -> List[Dict]:
        """CAPÍTULO II: Responsables únicos del servicio"""
        query = """
        SELECT DISTINCT
            frr.codigo_costeo,
            frr.grupo_ocupacional
        FROM costeo_procedimientos cp
        JOIN costeo_fases f ON cp.id = f.costeo_id
        JOIN costeo_fase_rrhh frr ON f.id = frr.fase_id
        WHERE cp.upss_servicio = ?
        ORDER BY frr.grupo_ocupacional
        """
        cursor = self.conn.execute(query, (self.upss,))
        return [dict(row) for row in cursor.fetchall()]
    
    def _clasificar_insumo(self, descripcion: str) -> str:
        """Clasifica un insumo según las reglas del config.yaml"""
        descripcion_upper = descripcion.upper()
        for categoria, palabras_clave in self.config['clasificacion_insumos'].items():
            for palabra in palabras_clave:
                if palabra in descripcion_upper:
                    return categoria
        return 'OTRO'
    
    def mapear_rol(self, grupo_ocupacional: str) -> str:
        """Mapea el grupo ocupacional de la BD al rol del MAPRO"""
        return self.config['roles_mapro'].get(grupo_ocupacional, grupo_ocupacional)
    
    def close(self):
        self.conn.close()