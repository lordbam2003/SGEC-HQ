import yaml
from db_adapter import CosteoDBAdapter
from word_generator import MAPROWordGenerator

class MAPROBuilder:
    """Constructor principal del MAPRO"""
    
    def __init__(self, config_path: str, db_path: str):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)
        
        self.db = CosteoDBAdapter(db_path, config_path)
        self.generator = MAPROWordGenerator(self.config, self.db)
    
    def construir(self, ruta_salida: str) -> str:
        """Construye el MAPRO completo"""
        print("Iniciando generación del MAPRO...")
        
        # Portada
        print("  → Generando portada...")
        self.generator.generar_portada()
        
        # CAPÍTULO IV: Inventario
        print("  → Generando Capítulo IV (Inventario)...")
        self.generator.generar_capitulo_iv()
        
        # CAPÍTULO V: Fichas técnicas
        print("  → Generando Capítulo V (Fichas técnicas)...")
        self.generator.generar_capitulo_v()
        
        # Guardar
        print(f"  → Guardando documento en {ruta_salida}...")
        ruta = self.generator.guardar(ruta_salida)
        
        self.db.close()
        print("✓ MAPRO generado exitosamente.")
        return ruta

# Uso
if __name__ == "__main__":
    builder = MAPROBuilder('./config.yaml', './datos/costeo_hospitalario.db')
    builder.construir('./output/MAPRO_BIOQUIMICA_Generado.docx')