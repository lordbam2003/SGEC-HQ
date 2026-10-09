import io
import re
import unicodedata
import pandas as pd
from typing import Dict, Any, Union
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models import InsumoCatalog


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = str(text).upper().strip()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    text = re.sub(r"[^A-Z0-9\s]", " ", text)
    return " ".join(text.split())


def sync_siga_catalog(file_source: Union[str, bytes, io.BytesIO], db: Session = None) -> Dict[str, Any]:
    """
    Importa y fusiona los registros de adquisiciones SIGA (siga.xlsx) con la tabla cat_insumos.
    Calcula el costo unitario ponderado por ítem y vincula los códigos SIGA con los insumos existentes.
    """
    should_close_db = False
    if db is None:
        db = SessionLocal()
        should_close_db = True

    try:
        # Cargar DataFrame
        if isinstance(file_source, (bytes, bytearray)):
            df = pd.read_excel(io.BytesIO(file_source))
        elif isinstance(file_source, io.BytesIO):
            df = pd.read_excel(file_source)
        else:
            df = pd.read_excel(file_source)

        # Normalizar nombres de columnas
        col_map = {}
        for col in df.columns:
            clean_col = normalize_text(col).lower().replace(" ", "_")
            if "codigo" in clean_col and "siga" in clean_col:
                col_map[col] = "codigo_siga"
            elif "nombre" in clean_col or "item" in clean_col or "descripcion" in clean_col:
                if "cant" not in clean_col and "precio" not in clean_col:
                    col_map[col] = "nombre_item"
            elif "cant" in clean_col:
                col_map[col] = "cant_item"
            elif "precio" in clean_col or "total" in clean_col or "monto" in clean_col:
                col_map[col] = "precio_total"

        df = df.rename(columns=col_map)
        required = ["codigo_siga", "nombre_item", "cant_item", "precio_total"]
        for req in required:
            if req not in df.columns:
                raise ValueError(f"La columna requerida '{req}' no se encuentra en el archivo SIGA.")

        # Limpiar datos
        df = df.dropna(subset=["codigo_siga", "nombre_item"])
        df["codigo_siga"] = df["codigo_siga"].astype(str).str.replace(".0", "", regex=False).str.strip()
        df["cant_item"] = pd.to_numeric(df["cant_item"], errors="coerce").fillna(1.0)
        df["precio_total"] = pd.to_numeric(df["precio_total"], errors="coerce").fillna(0.0)

        # Agrupar por código SIGA y nombre de ítem para calcular costo unitario ponderado
        grouped = df.groupby(["codigo_siga", "nombre_item"]).agg(
            total_cant=("cant_item", "sum"),
            total_monto=("precio_total", "sum"),
            transacciones=("precio_total", "count")
        ).reset_index()

        grouped["precio_unitario_ponderado"] = grouped.apply(
            lambda r: r["total_monto"] / r["total_cant"] if r["total_cant"] > 0 else 0.0, axis=1
        )

        # Cargar todos los insumos existentes en base de datos
        existing_insumos = db.query(InsumoCatalog).all()

        # Diccionarios de búsqueda rápida
        exact_desc_map = {}
        code_siga_map = {}
        token_list = []

        stop_words = {"PARA", "COLOR", "TIPO", "DESCARTABLE", "USO", "CON", "SIN", "POR", "SET", "KIT", "FRASCO", "CAJA"}

        for ins in existing_insumos:
            clean_d = normalize_text(ins.descripcion)
            if clean_d:
                exact_desc_map[clean_d] = ins
                words = [w for w in clean_d.split() if len(w) >= 3 and w not in stop_words]
                if words:
                    token_list.append((words, ins))
            if ins.codigo_siga:
                code_siga_map[str(ins.codigo_siga).strip()] = ins

        fused_count = 0
        new_count = 0
        updated_siga_only_count = 0

        for _, row in grouped.iterrows():
            c_siga = str(row["codigo_siga"]).strip()
            name_raw = str(row["nombre_item"]).strip()
            clean_siga_name = normalize_text(name_raw)
            pu_siga = round(float(row["precio_unitario_ponderado"]), 4)

            matched_insumo = None

            # 1. Búsqueda por código SIGA ya asignado
            if c_siga in code_siga_map:
                matched_insumo = code_siga_map[c_siga]

            # 2. Coincidencia exacta de texto normalizado
            if not matched_insumo and clean_siga_name in exact_desc_map:
                matched_insumo = exact_desc_map[clean_siga_name]

            # 3. Coincidencia por tokens clave
            if not matched_insumo:
                siga_words = [w for w in clean_siga_name.split() if len(w) >= 3 and w not in stop_words]
                if len(siga_words) >= 2:
                    for db_words, db_ins in token_list:
                        # Si las primeras 3 palabras o el 80% de palabras coinciden
                        overlap = set(siga_words).intersection(set(db_words))
                        if len(overlap) >= 3 or (len(siga_words) >= 2 and len(overlap) / len(siga_words) >= 0.8):
                            matched_insumo = db_ins
                            break

            if matched_insumo:
                # Fusión y enriquecimiento de ítem existente
                matched_insumo.codigo_siga = c_siga
                matched_insumo.precio_siga = pu_siga
                matched_insumo.origen = "FUSIONADO"
                # Si no tenía costo unitario previo, asignar el de SIGA
                if matched_insumo.costo_unitario == 0 or matched_insumo.costo_unitario is None:
                    matched_insumo.costo_unitario = pu_siga
                fused_count += 1
            else:
                # Verificar si ya existe como ítem registrado con ese código de costeo SIGA
                existing_siga_item = db.query(InsumoCatalog).filter(
                    InsumoCatalog.codigo_costeo == f"SIGA-{c_siga}"
                ).first()

                if existing_siga_item:
                    existing_siga_item.descripcion = name_raw
                    existing_siga_item.precio_siga = pu_siga
                    existing_siga_item.costo_unitario = pu_siga
                    existing_siga_item.codigo_siga = c_siga
                    existing_siga_item.origen = "SIGA"
                    updated_siga_only_count += 1
                else:
                    # Crear nuevo ítem SIGA
                    new_insumo = InsumoCatalog(
                        codigo_costeo=f"SIGA-{c_siga}",
                        codigo_usado=c_siga,
                        codigo_siga=c_siga,
                        descripcion=name_raw,
                        unidad_medida="UNIDAD",
                        unidad_consumo="UNIDAD",
                        unidad_adquisicion="UNIDAD",
                        cantidad_presentacion=1.0,
                        costo_unitario=pu_siga,
                        precio_siga=pu_siga,
                        precio_promedio=pu_siga,
                        costo_minuto=0.0,
                        tipo="FUNGIBLE",
                        origen="SIGA"
                    )
                    db.add(new_insumo)
                    new_count += 1

        db.commit()

        total_insumos_now = db.query(InsumoCatalog).count()
        total_fused = db.query(InsumoCatalog).filter(InsumoCatalog.origen == "FUSIONADO").count()
        total_siga_only = db.query(InsumoCatalog).filter(InsumoCatalog.origen == "SIGA").count()
        total_base_only = db.query(InsumoCatalog).filter(InsumoCatalog.origen == "BASE").count()

        return {
            "success": True,
            "message": f"Catálogo SIGA procesado con éxito: {len(grouped)} ítems únicos. {fused_count} fusionados con catálogo base, {new_count} nuevos ítems SIGA importados.",
            "total_transacciones_siga": len(df),
            "items_siga_unicos": len(grouped),
            "fusionados": fused_count,
            "nuevos_insertados": new_count,
            "actualizados_siga": updated_siga_only_count,
            "resumen_catalogo": {
                "total_insumos": total_insumos_now,
                "fusionados_base_siga": total_fused,
                "exclusivos_siga": total_siga_only,
                "exclusivos_base": total_base_only
            }
        }

    except Exception as e:
        db.rollback()
        raise e
    finally:
        if should_close_db:
            db.close()
