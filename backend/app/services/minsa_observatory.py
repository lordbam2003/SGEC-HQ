import httpx
import re
import statistics
from typing import Dict, Any, List, Optional
import pandas as pd


def fetch_minsa_observatory(
    cpt_codigo: str,
    ipress_name: str = "",
    ups: str = "0",
    tipo_tarifa: str = "0",
    cmb_institucion: str = "0",
    cmb_departamento: str = "0",
    cmb_categoria: str = "0"
) -> Dict[str, Any]:
    """
    Realiza la consulta al Observatorio de Costos y Tarifas del MINSA (costosytarifas.minsa.gob.pe).
    1. Obtiene la sesión, cookies y token CSRF dinámico vía GET.
    2. Envía la petición POST con los filtros requeridos.
    3. Devuelve los registros estructurados con estadísticas de mercado (mínimo, promedio, mediana, máximo).
    """
    clean_cpt = str(cpt_codigo or "").strip()
    if not clean_cpt:
        return {
            "success": False,
            "message": "El código CPMS es requerido para la consulta.",
            "cpt_codigo": "",
            "total_items": 0,
            "total_con_tarifa": 0,
            "stats": {},
            "items": []
        }

    url_get = "https://costosytarifas.minsa.gob.pe/observatorio_costos/resumen/"
    url_post = "https://costosytarifas.minsa.gob.pe/observatorio_costos/resumen"

    try:
        with httpx.Client(
            verify=False,
            follow_redirects=True,
            timeout=25.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
            }
        ) as client:
            # 1. GET para sesión y CSRF Token
            res_get = client.get(url_get)
            csrf_token = None
            csrf_match = re.search(r'name=["\']csrf_token["\']\s+value=["\']([^"\']+)["\']', res_get.text)
            if csrf_match:
                csrf_token = csrf_match.group(1)
            elif "csrf_cookie_name" in client.cookies:
                csrf_token = client.cookies["csrf_cookie_name"]
            else:
                for k, v in client.cookies.items():
                    if "csrf" in k.lower():
                        csrf_token = v
                        break

            if not csrf_token:
                csrf_token = ""

            # 2. Payload POST
            payload = {
                "csrf_token": csrf_token,
                "ipress_name": ipress_name or "",
                "ups": str(ups or "0"),
                "tipo_tarifa": str(tipo_tarifa or "0"),
                "cmb_institucion": str(cmb_institucion or "0"),
                "cpt_codigo": clean_cpt,
                "cpt_name": "",
                "cmb_departamento": str(cmb_departamento or "0"),
                "cmb_categoria": str(cmb_categoria or "0")
            }

            headers_post = {
                "Referer": url_get,
                "Origin": "https://costosytarifas.minsa.gob.pe",
                "Content-Type": "application/x-www-form-urlencoded"
            }

            res_post = client.post(url_post, data=payload, headers=headers_post)
            raw_items = []
            raw_bytes = res_post.content
            try:
                try:
                    text_decoded = raw_bytes.decode("utf-8")
                    if "\ufffd" in text_decoded:
                        text_decoded = raw_bytes.decode("latin-1", errors="replace")
                except UnicodeDecodeError:
                    text_decoded = raw_bytes.decode("latin-1", errors="replace")

                raw_items = json.loads(text_decoded)
            except Exception:
                try:
                    raw_items = res_post.json()
                except Exception:
                    json_match = re.search(r'(\[\s*\{.*\}\s*\])', res_post.text, re.DOTALL)
                    if json_match:
                        raw_items = json.loads(json_match.group(1))

            if not isinstance(raw_items, list):
                raw_items = []

            # 3. Procesar y normalizar registros
            clean_items = []
            valid_prices = []
            procedimiento_nombre = ""

            for row in raw_items:
                ipress = str(row.get("ipress") or "").strip()
                codigo = str(row.get("codigo") or "").strip()
                propiedad = str(row.get("propiedad") or "").strip()
                tipo_t = str(row.get("tipo_tarifa") or "").strip()
                resolucion = str(row.get("resolucion") or "").strip()
                proc = str(row.get("procedimiento") or "").strip()
                if proc and not procedimiento_nombre:
                    procedimiento_nombre = proc

                tarifa_raw = row.get("tarifa")
                tarifa_val: Optional[float] = None
                try:
                    if tarifa_raw not in (None, "", "null", False):
                        val = float(str(tarifa_raw).replace(",", ".").strip())
                        if val > 0:
                            tarifa_val = round(val, 2)
                            valid_prices.append(tarifa_val)
                except (ValueError, TypeError):
                    tarifa_val = None

                clean_items.append({
                    "ipress": ipress if ipress else (propiedad if propiedad else "ESTABLECIMIENTO"),
                    "codigo": codigo or clean_cpt,
                    "propiedad": propiedad or "MINSA",
                    "tipo_tarifa": tipo_t or "Tarifa Oficial",
                    "resolucion": resolucion or "-",
                    "procedimiento": proc or procedimiento_nombre,
                    "tarifa": tarifa_val,
                    "tiene_tarifa": tarifa_val is not None
                })

            # Ordenar: primero aquellos con tarifa válida ascendente, luego sin tarifa
            clean_items.sort(key=lambda x: (0 if x["tiene_tarifa"] else 1, x["tarifa"] or 0))

            # 4. Cálculo estadístico
            min_t = round(min(valid_prices), 2) if valid_prices else 0.0
            max_t = round(max(valid_prices), 2) if valid_prices else 0.0
            avg_t = round(sum(valid_prices) / len(valid_prices), 2) if valid_prices else 0.0
            med_t = round(statistics.median(valid_prices), 2) if valid_prices else 0.0

            min_ipress = next((x["ipress"] for x in clean_items if x.get("tarifa") == min_t), "") if valid_prices else ""
            max_ipress = next((x["ipress"] for x in clean_items if x.get("tarifa") == max_t), "") if valid_prices else ""

            stats = {
                "min": min_t,
                "max": max_t,
                "promedio": avg_t,
                "mediana": med_t,
                "min_tarifa": min_t,
                "max_tarifa": max_t,
                "promedio_tarifa": avg_t,
                "mediana_tarifa": med_t,
                "min_ipress": min_ipress,
                "max_ipress": max_ipress,
                "total_registros": len(clean_items),
                "total_con_tarifa": len(valid_prices)
            }

            return {
                "success": True,
                "message": f"Se encontraron {len(clean_items)} registros en el Observatorio MINSA ({len(valid_prices)} con tarifa monetizada).",
                "cpt_codigo": clean_cpt,
                "procedimiento": procedimiento_nombre,
                "total_encontrados": len(clean_items),
                "total_items": len(clean_items),
                "total_con_tarifa": len(valid_prices),
                "stats": stats,
                "items": clean_items
            }

    except Exception as e:
        return {
            "success": False,
            "message": f"Error al consultar el Observatorio MINSA: {str(e)}",
            "cpt_codigo": clean_cpt,
            "total_items": 0,
            "total_con_tarifa": 0,
            "stats": {},
            "items": []
        }


def extract_higher_market_prices(
    cpt_codigo: str,
    precio_local: float = 0.0,
    count: int = 3
) -> Dict[str, Any]:
    """
    Extrae todas las tarifas para el procedimiento desde el Observatorio MINSA,
    las carga en un DataFrame de pandas y filtra exactamente 'count' (3) precios
    mayores al costo local calculado en la hoja de costeo.
    """
    clean_cpt = str(cpt_codigo or "").strip()
    precio_local_val = float(precio_local or 0.0)

    # 1. Extraer datos brutos del observatorio
    raw_res = fetch_minsa_observatory(clean_cpt)
    if not raw_res.get("success") or not raw_res.get("items"):
        return {
            "success": False,
            "message": raw_res.get("message", "No se encontraron datos en el Observatorio MINSA."),
            "cpt_codigo": clean_cpt,
            "procedimiento": raw_res.get("procedimiento", ""),
            "precio_local": round(precio_local_val, 3),
            "total_nacional": 0,
            "total_mayores": 0,
            "precios_mayores": [],
            "stats_nacional": raw_res.get("stats", {})
        }

    items = raw_res.get("items", [])
    df = pd.DataFrame(items)

    # 2. Procesar y filtrar con pandas
    if df.empty or "tarifa" not in df.columns:
        return {
            "success": True,
            "message": "No hay tarifas válidas para procesar.",
            "cpt_codigo": clean_cpt,
            "procedimiento": raw_res.get("procedimiento", ""),
            "precio_local": round(precio_local_val, 3),
            "total_nacional": 0,
            "total_mayores": 0,
            "precios_mayores": [],
            "stats_nacional": raw_res.get("stats", {})
        }

    # Asegurar tipo numérico en tarifa y filtrar registros válidos (> 0)
    df["tarifa"] = pd.to_numeric(df["tarifa"], errors="coerce")
    df_valid = df[df["tarifa"].notnull() & (df["tarifa"] > 0)].copy()

    total_valid = len(df_valid)

    # Filtrar precios estrictamente mayores al precio local calculado
    df_higher = df_valid[df_valid["tarifa"] > precio_local_val].copy()
    total_higher = len(df_higher)

    # Ordenar de menor a mayor precio (los más cercanos por encima del precio local)
    df_higher = df_higher.sort_values(by="tarifa", ascending=True)

    # Deduplicar por IPRESS para asegurar 3 establecimientos distintos
    df_unique_ipress = df_higher.drop_duplicates(subset=["ipress"])

    # Tomar los primeros 'count' registros
    selected_df = df_unique_ipress.head(count)
    selected_items = []

    for _, row in selected_df.iterrows():
        tarifa_item = round(float(row["tarifa"]), 2)
        diff_monto = round(tarifa_item - precio_local_val, 2)
        diff_pct = round((diff_monto / precio_local_val) * 100, 2) if precio_local_val > 0 else 0.0

        selected_items.append({
            "ipress": str(row.get("ipress") or "IPRESS"),
            "propiedad": str(row.get("propiedad") or "MINSA"),
            "tipo_tarifa": str(row.get("tipo_tarifa") or "TARIFARIO"),
            "resolucion": str(row.get("resolucion") or "-"),
            "procedimiento": str(row.get("procedimiento") or raw_res.get("procedimiento", "")),
            "tarifa": tarifa_item,
            "diferencia_monto": diff_monto,
            "diferencia_pct": diff_pct
        })

    return {
        "success": True,
        "message": f"Se extrajeron {len(selected_items)} precios de mercado nacionales mayores a S/. {precio_local_val:.2f}.",
        "cpt_codigo": clean_cpt,
        "procedimiento": raw_res.get("procedimiento", ""),
        "precio_local": round(precio_local_val, 3),
        "total_nacional": total_valid,
        "total_mayores": total_higher,
        "precios_mayores": selected_items,
        "stats_nacional": raw_res.get("stats", {})
    }

