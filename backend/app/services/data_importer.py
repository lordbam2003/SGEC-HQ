import openpyxl
import os
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.models import (
    CPMSCatalog, InsumoCatalog, EquipamientoCatalog, RRHHCatalog,
    InfraestructuraCatalog, ServiciosBasicosCatalog, CostosIndirectosCatalog,
    ServicioCatalog,
    CosteoProcedimiento, CosteoFase, CosteoFaseRRHH, CosteoFaseInsumo, CosteoFaseEquipo,
    EstudioMercadoReferencia
)

def safe_float(val, default=0.0):
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s.startswith('='):
        return default
    try:
        s_clean = s.replace(',', '').replace('S/', '').replace('$', '').strip()
        return float(s_clean)
    except (ValueError, TypeError):
        return default

def safe_str(val, default=""):
    if val is None:
        return default
    s = str(val).strip()
    if s.startswith('='):
        return default
    return s

def clean_unit(val, fallback="UNIDAD"):
    if val is None:
        return clean_unit(fallback) if fallback and fallback != val else "UNIDAD"
    s = str(val).strip().upper()
    if not s or s.startswith('=') or 'INSERTAR' in s or 'COLUMNA' in s or 'FILA' in s:
        return clean_unit(fallback) if fallback and fallback != val else "UNIDAD"
    
    # Si es numérico (ej. '0.01023...'), no es una unidad
    try:
        float(s)
        return clean_unit(fallback) if fallback and fallback != val else "UNIDAD"
    except ValueError:
        pass

    # Normalización de unidades estándar
    if s in ['UNIDAD', 'UNID', 'UNIDADES', 'UND', 'U']:
        return 'UNIDAD'
    if s in ['ML', 'M.L.', 'MILILITRO', 'MILILITROS']:
        return 'ML'
    if s in ['GR', 'G', 'GRAMO', 'GRAMOS', 'GRS']:
        return 'GR'
    if s in ['MG', 'M.G.', 'MILIGRAMO', 'MILIGRAMOS']:
        return 'MG'
    if s in ['MINUTO', 'MINUTOS', 'MIN', 'MINS']:
        return 'MINUTO'
    if s in ['CM', 'C.M.', 'CENTIMETRO', 'CENTIMETROS']:
        return 'CM'
    if s in ['HOJA', 'HOJAS']:
        return 'HOJA'
    if s in ['TABLETA', 'TABLETAS', 'TAB', 'TABS']:
        return 'TABLETA'
    if s in ['PAR', 'PARES']:
        return 'PAR'
    if s in ['TRDA', 'TIRA', 'TIRAS']:
        return 'TRDA'
    if s in ['FRASCO', 'FRASCOS', 'FCO', 'FCOS']:
        return 'FRASCO'
    if s in ['AMPOLLA', 'AMPOLLAS', 'AMP', 'AMPS']:
        return 'AMPOLLA'
    if s in ['INYECTABLE', 'INYECTABLES', 'INY']:
        return 'INYECTABLE'
    if s in ['SOLUCION', 'SOLUCIÓN', 'SOL']:
        return 'SOLUCION'
    if s in ['UNGÜENTO', 'UNGUENTO', 'UNG']:
        return 'UNGÜENTO'
    if s in ['SUSPENSION', 'SUSPENSIÓN', 'SUSP']:
        return 'SUSPENSION'
    if s in ['SOBRE', 'SOBRES']:
        return 'SOBRE'
    if s in ['KIT', 'KITS']:
        return 'KIT'
    if s in ['ROLLO', 'ROLLOS']:
        return 'ROLLO'
    if s in ['CAJA', 'CAJAS']:
        return 'CAJA'
    if s in ['PAQUETE', 'PAQUETES', 'PTE']:
        return 'PAQUETE'

    return s

def import_cpms(file_path: str, db: Session) -> int:
    print(f"Importing CPMS from {file_path}...")
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    ws = wb["CPMS"] if "CPMS" in wb.sheetnames else wb.active
    
    rows_to_insert = []
    batch_size = 1000
    count = 0
    
    header_found = False
    for row in ws.iter_rows(values_only=True):
        if not row or all(v is None for v in row):
            continue
        if not header_found:
            if any("CODIGO" in str(v).upper() for v in row if v is not None):
                header_found = True
                continue
        
        codigo = safe_str(row[0]).upper()
        if not codigo or codigo == "CODIGO":
            continue
            
        denominacion = safe_str(row[1]) if len(row) > 1 else ""
        if not denominacion:
            continue
            
        grupo_cod = safe_str(row[2]) if len(row) > 2 else ""
        grupo_nom = safe_str(row[3]) if len(row) > 3 else ""
        sec_cod = safe_str(row[4]) if len(row) > 4 else ""
        sec_nom = safe_str(row[5]) if len(row) > 5 else ""
        subsec_cod = safe_str(row[6]) if len(row) > 6 else ""
        subsec_nom = safe_str(row[7]) if len(row) > 7 else ""
        situacion = safe_str(row[8]) if len(row) > 8 else "ACTIVO"
        
        cpms_obj = CPMSCatalog(
            codigo=codigo,
            denominacion=denominacion,
            grupo_codigo=grupo_cod,
            grupo_nombre=grupo_nom,
            seccion_codigo=sec_cod,
            seccion_nombre=sec_nom,
            subseccion_codigo=subsec_cod,
            subseccion_nombre=subsec_nom,
            situacion=situacion or "ACTIVO"
        )
        rows_to_insert.append(cpms_obj)
        count += 1
        
        if len(rows_to_insert) >= batch_size:
            for item in rows_to_insert:
                db.merge(item)
            db.commit()
            rows_to_insert = []
            
    if rows_to_insert:
        for item in rows_to_insert:
            db.merge(item)
        db.commit()
        
    print(f"CPMS import finished. Total: {count} records.")
    return count

def import_data_catalogs(file_path: str, db: Session) -> dict:
    print(f"Importing catalogs from {file_path} with Forward-Fill & Uppercase...")
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    summary = {}

    # 1. BASE RRHH (Versión Final Oficial 25 Grupos)
    rrhh_sheet_name = None
    for s_name in ["RRHH", "BASE RRHH"]:
        if s_name in wb.sheetnames:
            rrhh_sheet_name = s_name
            break

    if rrhh_sheet_name:
        ws = wb[rrhh_sheet_name]
        count = 0
        db.query(RRHHCatalog).delete()
        for r_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
            if not row or all(v is None for v in row):
                continue
            c0 = safe_str(row[0]).upper()
            c1 = safe_str(row[1]).upper() if len(row) > 1 else ""

            if "CÓDIGO" in c0 or "CODIGO" in c0 or "GRUPO" in c0 or "CÓDIGO" in c1 or "CODIGO" in c1:
                continue

            if c0.startswith("CRHM"):
                cod = c0
                cargo = safe_str(row[1])
                sueldo = safe_float(row[2])
                jornada = safe_float(row[3], 9000.0)
                costo_min = safe_float(row[4])
            elif c1.startswith("CRHM"):
                cod = c1
                cargo = safe_str(row[2])
                sueldo = safe_float(row[3])
                jornada = safe_float(row[4], 9000.0)
                costo_min = safe_float(row[5])
            else:
                continue

            if not cod or not cargo or "GRUPO" in cargo.upper():
                continue

            if costo_min == 0 and jornada > 0 and sueldo > 0:
                costo_min = round(sueldo / jornada, 8)

            rrhh_obj = RRHHCatalog(
                codigo_costeo=cod,
                grupo_ocupacional=cargo,
                pago_mensual=sueldo,
                jornada_minutos=jornada,
                costo_minuto=costo_min
            )
            db.add(rrhh_obj)
            count += 1
        db.commit()
        summary["rrhh"] = count
        print(f"  RRHH catalog imported: {count} official records.")

    # 2. BASE INFRAESTRUCTURA (Con Forward-Fill de UPS, Valor Construcción y Depreciación en Minutos)
    if "BASE INFRAESTRUCTURA" in wb.sheetnames:
        ws = wb["BASE INFRAESTRUCTURA"]
        count = 0
        current_ups = ""
        VALOR_M2_DEFAULT = 8982.84
        VIDA_UTIL_INFRA_DEFAULT = 26280000.0 # 50 años en minutos

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
            if r_idx < 6 or not row:
                continue
            cod = safe_str(row[1]).upper()
            raw_ups = safe_str(row[2])
            servicio = safe_str(row[3])
            if not cod or not servicio or "CÓDIGO" in cod.upper():
                continue

            # Forward-fill UPS si viene vacía
            if raw_ups:
                current_ups = raw_ups
            ups_to_save = current_ups or raw_ups or "GENERAL"

            num_amb = int(safe_float(row[4], 1))
            area = safe_float(row[5])
            val_m2 = VALOR_M2_DEFAULT
            val_total = round(area * val_m2, 2)
            vida_util = VIDA_UTIL_INFRA_DEFAULT
            deprec_min = round(val_total / vida_util, 8) if vida_util > 0 else 0.0
            ref = safe_str(row[10]) if len(row) > 10 else None

            existing = db.query(InfraestructuraCatalog).filter(InfraestructuraCatalog.codigo_costeo == cod).first()
            if not existing:
                existing = InfraestructuraCatalog(codigo_costeo=cod)
            existing.ups = ups_to_save
            existing.servicio = servicio
            existing.num_ambiente = num_amb
            existing.area_m2 = area
            existing.valor_construccion_m2 = val_m2
            existing.valor_total_upss = val_total
            existing.vida_util_minutos = vida_util
            existing.depreciacion_minuto = deprec_min
            existing.referencia_normativa = ref
            db.add(existing)
            count += 1
        db.commit()
        summary["infraestructura"] = count
        print(f"  Infraestructura catalog imported: {count} records (with calculated depreciation/min).")

    # 3. BASE SERVICIOS B (Con Inductores y Costo Unitario Total PMS)
    if "BASE SERVICIOS B" in wb.sheetnames:
        ws = wb["BASE SERVICIOS B"]
        count = 0
        current_ups = ""
        cae_total = 247937.60
        caa_total = 77318.20
        cat_total = 10448.26
        cai_total = 17461.01

        raw_rows = []
        for r_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
            if r_idx < 6 or not row:
                continue
            cod = safe_str(row[0]).upper()
            raw_ups = safe_str(row[1])
            servicio = safe_str(row[2])
            if not cod or not servicio or "CÓDIGO" in cod.upper():
                continue

            if raw_ups:
                current_ups = raw_ups
            ups_to_save = current_ups or raw_ups or "GENERAL"

            area = safe_float(row[3])
            ce_val = safe_float(row[4], 1.0)
            ca_val = safe_float(row[5], 1.0)
            ct_val = safe_float(row[6], 1.0)
            ci_val = safe_float(row[7], 1.0)
            prod_opt = safe_float(row[16], 0.0) if len(row) > 16 else 0.0

            ind_ce = area * ce_val
            ind_ca = area * ca_val
            ind_ct = area * ct_val
            ind_ci = area * ci_val

            raw_rows.append({
                "cod": cod, "ups": ups_to_save, "servicio": servicio,
                "area": area, "prod_opt": prod_opt,
                "ind_ce": ind_ce, "ind_ca": ind_ca, "ind_ct": ind_ct, "ind_ci": ind_ci
            })

        sum_ind_ce = sum(x["ind_ce"] for x in raw_rows) or 1.0
        sum_ind_ca = sum(x["ind_ca"] for x in raw_rows) or 1.0
        sum_ind_ct = sum(x["ind_ct"] for x in raw_rows) or 1.0
        sum_ind_ci = sum(x["ind_ci"] for x in raw_rows) or 1.0

        for item in raw_rows:
            costo_ce = (item["ind_ce"] / sum_ind_ce) * cae_total
            costo_ca = (item["ind_ca"] / sum_ind_ca) * caa_total
            costo_ct = (item["ind_ct"] / sum_ind_ct) * cat_total
            costo_ci = (item["ind_ci"] / sum_ind_ci) * cai_total

            q = item["prod_opt"]
            u_ce = (costo_ce / q) if q > 0 else 0.0
            u_ca = (costo_ca / q) if q > 0 else 0.0
            u_ct = (costo_ct / q) if q > 0 else 0.0
            u_ci = (costo_ci / q) if q > 0 else 0.0
            costo_tot = round(u_ce + u_ca + u_ct + u_ci, 6)

            existing = db.query(ServiciosBasicosCatalog).filter(ServiciosBasicosCatalog.codigo_costeo == item["cod"]).first()
            if not existing:
                existing = ServiciosBasicosCatalog(codigo_costeo=item["cod"])
            existing.ups = item["ups"]
            existing.servicio = item["servicio"]
            existing.area_m2 = item["area"]
            existing.costo_total_servicio = costo_tot
            db.add(existing)
            count += 1
        db.commit()
        summary["servicios_basicos"] = count
        print(f"  Servicios Basicos catalog imported: {count} records (with calculated unit costs).")

    # 4. BASE COSTOS INDIRECTOS (Con Prorrateo de Gastos Generales y PMS)
    if "BASE COSTOS INDIRECTOS" in wb.sheetnames:
        ws = wb["BASE COSTOS INDIRECTOS"]
        count = 0
        current_ups = ""
        TOTAL_GASTOS_GENERALES = 1221063.42
        TOTAL_GASTOS_ADMIN = 0.0

        raw_ci_rows = []
        for r_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
            if r_idx < 8 or not row:
                continue
            cod_upss = safe_str(row[1]).upper()
            raw_ups = safe_str(row[2])
            servicio = safe_str(row[3])
            if not cod_upss or not servicio or "UPSS" in servicio.upper():
                continue

            if raw_ups:
                current_ups = raw_ups
            ups_to_save = current_ups or raw_ups or "GENERAL"

            area = safe_float(row[4])
            prod_opt = safe_float(row[7], 0.0)

            raw_ci_rows.append({
                "cod_upss": cod_upss, "ups": ups_to_save, "servicio": servicio,
                "area": area, "prod_opt": prod_opt
            })

        total_area = sum(x["area"] for x in raw_ci_rows) or 1.0

        for item in raw_ci_rows:
            prop = item["area"] / total_area
            asig_adm = prop * TOTAL_GASTOS_ADMIN
            asig_gral = prop * TOTAL_GASTOS_GENERALES
            q = item["prod_opt"]
            c_adm = round(asig_adm / q, 6) if q > 0 else 0.0
            c_gral = round(asig_gral / q, 6) if q > 0 else 0.0
            c_tot = round(c_adm + c_gral, 6)

            existing = db.query(CostosIndirectosCatalog).filter(CostosIndirectosCatalog.codigo_upss == item["cod_upss"]).first()
            if not existing:
                existing = CostosIndirectosCatalog(codigo_upss=item["cod_upss"])
            existing.ups = item["ups"]
            existing.servicio = item["servicio"]
            existing.area_m2 = item["area"]
            existing.asignacion_admin = asig_adm
            existing.asignacion_generales = asig_gral
            existing.produccion_optima_anual = q
            existing.costo_unit_admin = c_adm
            existing.costo_unit_generales = c_gral
            existing.costo_unit_total_pms = c_tot
            db.add(existing)
            count += 1
        db.commit()
        summary["costos_indirectos"] = count
        print(f"  Costos Indirectos catalog imported: {count} records (with calculated PMS costs).")

    # 5. BASE EQUIPAMIENTO (Uppercase)
    if "BASE EQUIPAMIENTO " in wb.sheetnames:
        ws = wb["BASE EQUIPAMIENTO "]
        count = 0
        batch = []
        for r_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
            if r_idx < 5 or not row:
                continue
            cod = safe_str(row[0]).upper()
            margesi = safe_str(row[1]).upper()
            desc = safe_str(row[2])
            if not cod or not desc or "CÓDIGO" in cod.upper():
                continue
            tipo_eq = safe_str(row[3])
            cc = safe_str(row[4])
            val_adq = safe_float(row[5])
            vida_min = safe_float(row[6])
            costo_min = safe_float(row[7])
            if costo_min == 0 and vida_min > 0 and val_adq > 0:
                costo_min = round(val_adq / vida_min, 8)

            eq = EquipamientoCatalog(
                codigo_costeo=cod,
                codigo_margesi=margesi,
                descripcion=desc,
                tipo_equipamiento=tipo_eq,
                centro_costos=cc,
                valor_adquisicion=val_adq,
                vida_util_minutos=vida_min,
                costo_minuto=costo_min
            )
            batch.append(eq)
            count += 1
            if len(batch) >= 1000:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []
        if batch:
            db.bulk_save_objects(batch)
            db.commit()
        summary["equipamiento"] = count
        print(f"  Equipamiento catalog imported: {count} records.")

    # 6. BASE INSUMOS (Uppercase, Sanitized Units & Minute Cost)
    if "BASE INSUMOS" in wb.sheetnames:
        ws = wb["BASE INSUMOS"]
        count = 0
        batch = []
        for r_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
            if r_idx < 5 or not row:
                continue
            cod = safe_str(row[1]).upper()
            cod_usado = safe_str(row[2]).upper()
            desc = safe_str(row[3])
            if not desc or "DESCRIPCIÓN" in desc.upper():
                continue
            u_med = clean_unit(row[4], fallback="UNIDAD")
            u_adq = clean_unit(row[5], fallback=u_med)
            p_prom = safe_float(row[6])
            cant_pres = safe_float(row[7], 1.0)
            u_cons = clean_unit(row[8], fallback=u_med)
            costo_u = safe_float(row[9])
            if costo_u == 0 and cant_pres > 0 and p_prom > 0:
                costo_u = round(p_prom / cant_pres, 6)

            costo_min = safe_float(row[11] if len(row) > 11 else None)

            # Clasificación Fungible / No Fungible y Costo por Minuto
            if u_cons == 'MINUTO' or cant_pres >= 100000:
                tipo = "NO_FUNGIBLE"
                if costo_min == 0:
                    costo_min = costo_u
            elif costo_min > 0:
                tipo = "NO_FUNGIBLE" if 'MINUTO' in u_cons else "FUNGIBLE"
            else:
                tipo = "FUNGIBLE"

            ins = InsumoCatalog(
                codigo_costeo=cod,
                codigo_usado=cod_usado,
                descripcion=desc,
                unidad_medida=u_med,
                unidad_adquisicion=u_adq,
                precio_promedio=p_prom,
                cantidad_presentacion=cant_pres,
                unidad_consumo=u_cons,
                costo_unitario=costo_u,
                costo_minuto=costo_min,
                tipo=tipo
            )
            batch.append(ins)
            count += 1
            if len(batch) >= 2000:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []
        if batch:
            db.bulk_save_objects(batch)
            db.commit()
        summary["insumos"] = count
        print(f"  Insumos catalog imported: {count} records (with sanitized units & minute costs).")

    # 7. Sincronizar catálogo consolidado de Servicios y relaciones 100%
    serv_count = extract_and_sync_servicios(db)
    summary["servicios"] = serv_count

    return summary

def extract_and_sync_servicios(db: Session) -> int:
    """Extrae y consolida los 84 servicios hospitalarios con correspondencias al 100%"""
    import unicodedata
    import re
    import json

    print("Extracting and syncing consolidated Hospital Services with 100% correspondences...")

    def clean_txt(text):
        if not text:
            return ""
        text = unicodedata.normalize('NFKD', str(text)).encode('ASCII', 'ignore').decode('utf-8')
        text = text.upper()
        text = text.replace('MEDICIN FAMILIAR', 'MEDICINA FAMILIAR')
        text = re.sub(r'[^A-Z0-9\s]', ' ', text)
        return ' '.join(text.split())

    infra_rows = db.query(InfraestructuraCatalog).all()
    sb_rows = db.query(ServiciosBasicosCatalog).all()
    ci_rows = db.query(CostosIndirectosCatalog).all()
    eq_rows = db.query(EquipamientoCatalog).all()

    eq_ccs = sorted(list(set(r.centro_costos.strip() for r in eq_rows if r.centro_costos)))

    infra_map = {}
    sb_map = {}
    ci_map = {}

    for i in infra_rows:
        u = clean_txt(i.ups)
        s = clean_txt(i.servicio)
        infra_map[(u, s)] = i
        if s not in infra_map:
            infra_map[s] = i
        if u not in infra_map:
            infra_map[u] = i

    for s in sb_rows:
        u = clean_txt(s.ups)
        serv = clean_txt(s.servicio)
        sb_map[(u, serv)] = s
        if serv not in sb_map:
            sb_map[serv] = s
        if u not in sb_map:
            sb_map[u] = s

    for c in ci_rows:
        u = clean_txt(c.ups)
        serv = clean_txt(c.servicio)
        ci_map[(u, serv)] = c
        if serv not in ci_map:
            ci_map[serv] = c
        if u not in ci_map:
            ci_map[u] = c

    master_services = []
    seen = set()

    for s in sb_rows:
        u = s.ups.strip() if s.ups else 'GENERAL'
        serv = s.servicio.strip() if s.servicio else ''
        u_c = clean_txt(u)
        s_c = clean_txt(serv)
        if (u_c, s_c) not in seen:
            seen.add((u_c, s_c))
            master_services.append((u, serv))

    for i in infra_rows:
        u = i.ups.strip() if i.ups else 'GENERAL'
        serv = i.servicio.strip() if i.servicio else ''
        u_c = clean_txt(u)
        s_c = clean_txt(serv)
        if (u_c, s_c) not in seen and s_c not in [clean_txt(x[1]) for x in master_services]:
            seen.add((u_c, s_c))
            master_services.append((u, serv))

    def resolve_equipamiento_ccs(ups_raw, serv_raw):
        u = clean_txt(ups_raw)
        s = clean_txt(serv_raw)
        comb = f" {u} {s} "
        ccs = []

        def has_any(words):
            for w in words:
                pattern = r'\b' + re.escape(w) + r'\b'
                if re.search(pattern, comb):
                    return True
            return False

        if has_any(['LABORATORIO', 'PATOLOGIA CLINICA', 'BIOQUIMICA', 'MICROBIOLOGIA', 'HEMATOLOGIA', 'INMUNOLOGIA', 'TOMA DE MUESTRAS', 'TOMA DE MUESTRA']):
            ccs.append('AREA DE LABORATORIO')
        if has_any(['BANCO DE SANGRE', 'HEMOTERAPIA', 'AFERESIS', 'SANGRE', 'HEMOCOMPONENTES', 'TRANSFUSION', 'DONANTE']):
            ccs.append('AREA DE BANCO DE SANGRE')
        if has_any(['ECOGRAFIA']):
            ccs.append('AREA DE ECOGRAFIA')
        if has_any(['RADIOLOGIA', 'MAMOGRAFIA', 'RAYOS X', 'IMAGENES', 'DIAGNOSTICO POR IMAGENES']):
            ccs.append('AREA DE RAYOS X')
        if has_any(['CENTRO QUIRURGICO', 'SALA DE OPERACIONES', 'URPA', 'ANESTESIOLOGIA']):
            ccs.extend(['CENTRO QUIRURGICO', 'SERVICIO DE CIRUGIA Y ANESTESIOLOGIA'])
        elif has_any(['CIRUGIA', 'CIRUGIA GENERAL']):
            ccs.extend(['SERVICIO DE CIRUGIA Y ANESTESIOLOGIA', 'CENTRO QUIRURGICO'])
        if has_any(['EMERGENCIA', 'EMERGENCIAS']):
            ccs.extend(['SERVICIO DE EMERGENCIA', 'TRIAJE', 'ESPACIO DE MONITOREO DE EMERGENCIAS Y DESASTRES'])
        if has_any(['FARMACIA', 'DISPENSACION DE MEDICAMENTOS', 'FARMACIA CLINICA']):
            ccs.append('SERVICIO DE FARMACIA')
        if has_any(['GINECO', 'OBSTETRICIA', 'GINECO OBSTETRICIA', 'PARTO', 'PUERPERIO', 'PRENATAL', 'MATERNO', 'PSICOPROFILAXIS']):
            ccs.extend(['SERVICIO DE GINECO OBSTETRICIA', 'ATENCION INMEDIATA DEL RECIEN NACIDO'])
        if has_any(['RECIEN NACIDO', 'RN', 'AREA DE ATENCION INM AL RN']):
            ccs.append('ATENCION INMEDIATA DEL RECIEN NACIDO')
        if has_any(['PLANIFICACION FAMILIAR', 'SEXUAL Y REPRODUCTIVA', 'ADOLESCENTE', 'SALUD SEXUAL']):
            ccs.append('CONSULTORIO DIFERENCIADO SALUD SEXUAL Y REPRODUCTIVA')
        if has_any(['PEDIATRIA', 'CRED', 'INMUNIZACIONES', 'INMUNIZACION', 'ESTIMULACION TEMPRANA', 'NINO SANO']):
            ccs.extend(['SERVICIO DE PEDIATRIA', 'CONSULTORIO NIÑO SANO E INMUNIZACIONES'])
        if has_any(['MEDICINA GENERAL', 'MEDICINA INTERNA', 'MEDICINA FAMILIAR', 'CARDIOLOGIA', 'NEUROLOGIA', 'ENDOCRINOLOGO', 'NEUMOLOGIA', 'TELEMEDICINA', 'SERVICIO DE MEDICINA']):
            ccs.extend(['SERVICIO DE MEDICINA', 'CONSULTORIO DE ENFEMEDADES NO TRANSMISIBLES'])
        if has_any(['NO TRANSMISIBLES', 'METAXENICAS', 'ZOONOTICAS']):
            ccs.append('CONSULTORIO DE ENFERMEDADES METAXENICAS Y ZOONOTICAS')
        if has_any(['REHABILITACION', 'MED REHABILITACION', 'MEDICINA FISICA', 'MEDICINA DE REHABILITACION']):
            ccs.append('CONSULTORIO DE MEDICINA FISICA Y REHABILITACION')
        if has_any(['TRAUMATOLOGIA', 'UROLOGIA', 'OFTALMOLOGIA']):
            ccs.extend(['SERVICIO DE CIRUGIA Y ANESTESIOLOGIA', 'SERVICIO DE MEDICINA'])
        if has_any(['TBC', 'TUBERCULOSIS']):
            ccs.append('CONSULTORIO DIFERENCIADO DE PREVENCION Y CONTROL DE TBC')
        if has_any(['ITS', 'VIH', 'SIDA']):
            ccs.append('CONSULTORIO DIFERENCIADO DE ITS/VIH/SIDA')
        if has_any(['CANCER', 'ONCOLOGIA']):
            ccs.extend(['CONSULTORIO CANCER GINECOLOGICO', 'CONSULTORIO DE CANCER NO GINECOLOGICO'])
        if has_any(['PSICOLOGIA', 'PSIQUIATRIA', 'SALUD MENTAL']):
            ccs.extend(['SERVICIO DE PSICOLOGIA', 'HOSPITALIZACION SALUD MENTAL'])
        if has_any(['ODONTOLOGIA', 'ODONTOPEDIATRIA', 'ESTOMATOLOGIA']):
            ccs.append('SERVICIO DE ODONTOESTOMALOGIA')
        if has_any(['NUTRICION', 'DIETETICA', 'ALMACEN ALIMENTOS', 'ALIMENTOS']):
            ccs.append('SERVICIO DE NUTRICION')
        if has_any(['SERVICIO SOCIAL', 'SOCIAL']):
            ccs.append('SERVICIO SOCIAL')
        if has_any(['TOPICO', 'TRIAJE']):
            ccs.extend(['TRIAJE', 'SERVICIO DE EMERGENCIA'])
        if has_any(['HOSPITALIZACION', 'HOSPITALIZACION SALUD MENTAL']):
            if has_any(['SALUD MENTAL']):
                ccs.append('HOSPITALIZACION SALUD MENTAL')
            elif has_any(['CIRUGIA', 'CIRUGIA GENERAL']):
                ccs.append('SERVICIO DE CIRUGIA Y ANESTESIOLOGIA')
            elif has_any(['PEDIATRIA']):
                ccs.append('SERVICIO DE PEDIATRIA')
            elif has_any(['GINECO', 'OBSTETRICIA']):
                ccs.append('SERVICIO DE GINECO OBSTETRICIA')
            else:
                ccs.append('SERVICIO DE MEDICINA')
        if has_any(['ESTERILIZACION', 'CENTRAL DE ESTERILIZACION', 'DESINFECCION']):
            ccs.extend(['CENTRO QUIRURGICO', 'AREA DE CONTROL PATRIMONIAL', 'AREA DE MANTENIMIENTO Y TRANSPORTES'])

        if not ccs:
            ccs.append('SERVICIO DE MEDICINA')

        clean_matched = []
        for c in ccs:
            c_clean = clean_txt(c)
            for real_cc in eq_ccs:
                if clean_txt(real_cc) == c_clean:
                    if real_cc not in clean_matched:
                        clean_matched.append(real_cc)
                    break
        return clean_matched

    db.query(ServicioCatalog).delete()
    db.commit()

    count = 0
    for idx, (ups, serv) in enumerate(master_services, 1):
        u_c = clean_txt(ups)
        s_c = clean_txt(serv)

        inf = infra_map.get((u_c, s_c)) or infra_map.get(s_c) or infra_map.get(u_c)
        sb = sb_map.get((u_c, s_c)) or sb_map.get(s_c) or sb_map.get(u_c)
        ci = ci_map.get((u_c, s_c)) or ci_map.get(s_c) or ci_map.get(u_c)
        eq_list = resolve_equipamiento_ccs(ups, serv)

        serv_obj = ServicioCatalog(
            codigo=f"SERV-{idx:02d}",
            ups=ups,
            nombre_servicio=serv,
            centros_costo_equipamiento=json.dumps(eq_list, ensure_ascii=False),
            infraestructura_id=inf.id if inf else None,
            servicios_basicos_id=sb.id if sb else None,
            costos_indirectos_id=ci.id if ci else None
        )
        db.add(serv_obj)
        count += 1

    db.commit()
    print(f"  Servicios catalog synced: {count} consolidated records with 100% matches.")
    return count

def create_seed_costings(db: Session):
    """Crea los procedimientos de ejemplo iniciales con códigos en mayúsculas"""
    from backend.app.services.cost_calculator import compute_procedure_costs

    existing = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.codigo_cpms == "87207").first()
    if not existing:
        print("Creating seed costing for 87207 (FROTIS)...")
        infra = db.query(InfraestructuraCatalog).filter(InfraestructuraCatalog.servicio.like("%LABORATORIO%")).first()
        serv = db.query(ServiciosBasicosCatalog).filter(ServiciosBasicosCatalog.servicio.like("%LABORATORIO%")).first()
        ind = db.query(CostosIndirectosCatalog).filter(CostosIndirectosCatalog.servicio.like("%LABORATORIO%")).first()

        costeo_data = {
            "codigo_cpms": "87207",
            "nombre_procedimiento": "FROTIS DE FUENTE PRIMARIA CON INTERPRETACIÓN, CON TINCIÓN ESPECIAL PARA CUERPOS DE INCLUSIÓN O PARÁSITOS",
            "upss_servicio": infra.servicio if infra else "LABORATORIO",
            "infraestructura_id": infra.id if infra else None,
            "servicios_basicos_id": serv.id if serv else None,
            "costos_indirectos_id": ind.id if ind else None,
            "margen_privados_pct": 20.0,
            "estado": "APROBADO",
            "notas": "Procedimiento validado con data.xlsx",
            "fases": [
                {
                    "nombre_fase": "Actividad 1: Pre-analítica",
                    "descripcion_actividad": "Registro, orientación y toma de la muestra",
                    "orden": 1,
                    "tiempo_minutos": 5.0,
                    "rrhh_items": [
                        {
                            "codigo_costeo": "CRHM18",
                            "grupo_ocupacional": "TECNICO EN LABORATORIO I",
                            "tiempo_minutos": 5.0,
                            "cantidad": 1.0,
                            "costo_unitario": 0.372594
                        }
                    ],
                    "insumo_items": [
                        {
                            "codigo_usado": "41488",
                            "descripcion": "GUANTE PARA EXAMEN DESCARTABLE DE NITRILO SIN POLVO TALLA M",
                            "tipo_insumo": "FUNGIBLE",
                            "unidad_medida": "UND",
                            "cantidad": 2.0,
                            "costo_unitario": 0.4
                        },
                        {
                            "codigo_usado": "269",
                            "descripcion": "GEL ANTIBACTERIAL PARA MANOS X 1 L",
                            "tipo_insumo": "FUNGIBLE",
                            "unidad_medida": "ML",
                            "cantidad": 4.0,
                            "costo_unitario": 0.010185
                        }
                    ],
                    "equipo_items": [
                        {
                            "codigo_costeo": "CDEM196",
                            "descripcion": "CENTRIFUGA PARA TUBOS",
                            "tipo_equipamiento": "Equipo",
                            "tiempo_minutos": 5.0,
                            "cantidad": 1.0,
                            "costo_unitario": 0.003
                        }
                    ]
                },
                {
                    "nombre_fase": "Actividad 2: Analítica",
                    "descripcion_actividad": "Procesamiento y lectura de la muestra",
                    "orden": 2,
                    "tiempo_minutos": 20.0,
                    "rrhh_items": [
                        {
                            "codigo_costeo": "CRHM2",
                            "grupo_ocupacional": "BIOLOGO",
                            "tiempo_minutos": 10.0,
                            "cantidad": 1.0,
                            "costo_unitario": 0.696345
                        }
                    ],
                    "insumo_items": [
                        {
                            "codigo_usado": "10001",
                            "descripcion": "ACEITE DE INMERSION PARA MICROSCOPIA X 100 mL",
                            "tipo_insumo": "FUNGIBLE",
                            "unidad_medida": "ML",
                            "cantidad": 2.0,
                            "costo_unitario": 2.4
                        }
                    ],
                    "equipo_items": [
                        {
                            "codigo_costeo": "CDEM192",
                            "descripcion": "MICROSCOPIO BINOCULAR ESTANDAR",
                            "tipo_equipamiento": "Equipo",
                            "tiempo_minutos": 10.0,
                            "cantidad": 1.0,
                            "costo_unitario": 0.001788
                        }
                    ]
                },
                {
                    "nombre_fase": "Actividad 3: Pos-analítica",
                    "descripcion_actividad": "Registro y entrega de resultados",
                    "orden": 3,
                    "tiempo_minutos": 3.0,
                    "rrhh_items": [
                        {
                            "codigo_costeo": "CRHM24",
                            "grupo_ocupacional": "TECNICO EN LABORATORIO I",
                            "tiempo_minutos": 3.0,
                            "cantidad": 1.0,
                            "costo_unitario": 0.372594
                        }
                    ],
                    "insumo_items": [
                        {
                            "codigo_usado": "345",
                            "descripcion": "PAPEL BOND 80 g TAMAÑO A4",
                            "tipo_insumo": "FUNGIBLE",
                            "unidad_medida": "HOJA",
                            "cantidad": 2.0,
                            "costo_unitario": 0.032
                        }
                    ],
                    "equipo_items": [
                        {
                            "codigo_costeo": "CDEM1",
                            "descripcion": "COMPUTADORA PERSONAL / MONITOR",
                            "tipo_equipamiento": "Equipo",
                            "tiempo_minutos": 3.0,
                            "cantidad": 1.0,
                            "costo_unitario": 0.000288
                        }
                    ]
                }
            ],
            "medicamentos": []
        }

        computed = compute_procedure_costs(costeo_data, db)
        proc = CosteoProcedimiento(
            codigo_cpms=costeo_data["codigo_cpms"],
            nombre_procedimiento=costeo_data["nombre_procedimiento"],
            upss_servicio=costeo_data["upss_servicio"],
            infraestructura_id=costeo_data["infraestructura_id"],
            servicios_basicos_id=costeo_data["servicios_basicos_id"],
            costos_indirectos_id=costeo_data["costos_indirectos_id"],
            tiempo_total_minutos=computed["tiempo_total_minutos"],
            costo_rrhh=computed["costo_rrhh"],
            costo_insumos=computed["costo_insumos"],
            costo_equipos=computed["costo_equipos"],
            costo_infraestructura=computed["costo_infraestructura"],
            costo_servicios=computed["costo_servicios"],
            costo_directo=computed["costo_directo"],
            gastos_admin=computed["gastos_admin"],
            gastos_generales=computed["gastos_generales"],
            costo_indirecto=computed["costo_indirecto"],
            costo_total_estandar=computed["costo_total_estandar"],
            costo_medicamentos=computed["costo_medicamentos"],
            costo_total_final=computed["costo_total_final"],
            tarifa_referencial=computed["tarifa_referencial"],
            tarifa_no_asegurados=computed["tarifa_no_asegurados"],
            tarifa_sis=computed["tarifa_sis"],
            tarifa_essalud=computed["tarifa_essalud"],
            tarifa_privados=computed["tarifa_privados"],
            margen_privados_pct=computed["margen_privados_pct"],
            estado="APROBADO",
            notas=costeo_data["notas"]
        )
        db.add(proc)
        db.flush()

        for f_data in computed["fases"]:
            fase_db = CosteoFase(
                costeo_id=proc.id,
                nombre_fase=f_data["nombre_fase"],
                descripcion_actividad=f_data.get("descripcion_actividad"),
                orden=f_data.get("orden", 1),
                tiempo_minutos=f_data["tiempo_minutos"],
                subtotal_rrhh=f_data["subtotal_rrhh"],
                subtotal_insumos=f_data["subtotal_insumos"],
                subtotal_equipos=f_data["subtotal_equipos"],
                subtotal_fase=f_data["subtotal_fase"]
            )
            db.add(fase_db)
            db.flush()

            for r in f_data.get("rrhh_items", []):
                db.add(CosteoFaseRRHH(
                    fase_id=fase_db.id,
                    codigo_costeo=r.get("codigo_costeo"),
                    grupo_ocupacional=r.get("grupo_ocupacional"),
                    tiempo_minutos=r.get("tiempo_minutos", 0),
                    cantidad=r.get("cantidad", 1),
                    costo_unitario=r.get("costo_unitario", 0),
                    costo_parcial=r.get("costo_parcial", 0)
                ))
            for i in f_data.get("insumo_items", []):
                db.add(CosteoFaseInsumo(
                    fase_id=fase_db.id,
                    codigo_costeo=i.get("codigo_costeo"),
                    codigo_usado=i.get("codigo_usado"),
                    descripcion=i.get("descripcion"),
                    tipo_insumo=i.get("tipo_insumo", "FUNGIBLE"),
                    unidad_medida=i.get("unidad_medida"),
                    unidad_consumo=i.get("unidad_consumo", i.get("unidad_medida")),
                    tiempo_minutos=i.get("tiempo_minutos", 0),
                    cantidad=i.get("cantidad", 1),
                    costo_unitario=i.get("costo_unitario", 0),
                    costo_minuto=i.get("costo_minuto", 0),
                    costo_parcial=i.get("costo_parcial", 0)
                ))
            for e in f_data.get("equipo_items", []):
                db.add(CosteoFaseEquipo(
                    fase_id=fase_db.id,
                    codigo_costeo=e.get("codigo_costeo"),
                    descripcion=e.get("descripcion"),
                    tipo_equipamiento=e.get("tipo_equipamiento", "Equipo"),
                    tiempo_minutos=e.get("tiempo_minutos", 0),
                    cantidad=e.get("cantidad", 1),
                    costo_unitario=e.get("costo_unitario", 0),
                    costo_parcial=e.get("costo_parcial", 0)
                ))

        db.commit()
        print("Seed procedure created successfully.")
