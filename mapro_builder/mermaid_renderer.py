import subprocess
import os

class FlujogramaGenerator:
    """Genera flujogramas Mermaid a partir de las fases del procedimiento"""
    
    def __init__(self, output_dir: str = "./output/flujogramas"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generar_flujograma(self, procedimiento: Dict, fases: List[Dict]) -> str:
        """
        Genera código Mermaid y lo renderiza a PNG
        
        Args:
            procedimiento: Datos del procedimiento
            fases: Lista de fases del procedimiento
        
        Returns:
            Ruta al archivo PNG generado
        """
        mermaid_code = "flowchart TD\n"
        mermaid_code += f'    START(["INICIO: {procedimiento["nombre_procedimiento"]}"])\n'
        
        # Nodo inicial
        prev_node = "START"
        
        for i, fase in enumerate(fases):
            node_id = f"F{i+1}"
            fase_nombre = fase['nombre_fase'].replace('"', "'")
            descripcion = fase['descripcion_actividad'].replace('"', "'")[:80]
            
            mermaid_code += f'    {node_id}["{fase_nombre}\\n{descripcion}"]\n'
            mermaid_code += f'    {prev_node} --> {node_id}\n'
            prev_node = node_id
        
        # Nodo final
        mermaid_code += f'    END(["FIN: Resultado disponible"])\n'
        mermaid_code += f'    {prev_node} --> END\n'
        
        # Estilos
        mermaid_code += '\n    style START fill:#27ae60,stroke:#333,color:#fff\n'
        mermaid_code += '    style END fill:#c0392b,stroke:#333,color:#fff\n'
        
        # Guardar y renderizar
        nombre_archivo = f"flujograma_{procedimiento['codigo_cpms']}"
        mmd_path = os.path.join(self.output_dir, f"{nombre_archivo}.mmd")
        png_path = os.path.join(self.output_dir, f"{nombre_archivo}.png")
        
        with open(mmd_path, 'w', encoding='utf-8') as f:
            f.write(mermaid_code)
        
        # Renderizar con mermaid-cli
        try:
            subprocess.run([
                'mmdc', '-i', mmd_path, '-o', png_path,
                '-b', 'white', '-w', '1400'
            ], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"Advertencia: mermaid-cli no disponible. Usando código Mermaid en su lugar.")
            return mmd_path
        
        return png_path