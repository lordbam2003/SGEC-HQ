from typing import Dict, Any, List
from backend.app.models import (
    InfraestructuraCatalog, ServiciosBasicosCatalog, CostosIndirectosCatalog
)

def compute_procedure_costs(costeo_data: dict, db_session) -> dict:
    """
    Calcula todos los subtotales, totales y tarifas para un procedimiento y sus fases.
    """
    tiempo_total = 0.0
    total_rrhh = 0.0
    total_insumos = 0.0
    total_equipos = 0.0

    fases_calculadas = []
    for fase in costeo_data.get("fases", []):
        fase_tiempo = float(fase.get("tiempo_minutos", 0) or 0)
        subtotal_rrhh = 0.0
        subtotal_insumos = 0.0
        subtotal_equipos = 0.0

        # RRHH
        rrhh_items_calc = []
        for r_item in fase.get("rrhh_items", []):
            t = float(r_item.get("tiempo_minutos", 0) or 0)
            c = float(r_item.get("cantidad", 1) or 1)
            u = float(r_item.get("costo_unitario", 0) or 0)
            parcial = round(t * c * u, 6)
            subtotal_rrhh += parcial
            if t > 0 and fase_tiempo == 0:
                fase_tiempo = max(fase_tiempo, t)
            item_copy = dict(r_item)
            item_copy["costo_parcial"] = parcial
            rrhh_items_calc.append(item_copy)

        # Insumos
        insumos_items_calc = []
        for i_item in fase.get("insumo_items", []):
            tipo = (i_item.get("tipo_insumo") or "FUNGIBLE").upper()
            t = float(i_item.get("tiempo_minutos", 0) or 0)
            c = float(i_item.get("cantidad", 1) or 1)
            u = float(i_item.get("costo_unitario", 0) or 0)
            c_min = float(i_item.get("costo_minuto", 0) or 0)
            if (tipo == "NO_FUNGIBLE" or c_min > 0) and t > 0:
                rate = c_min if c_min > 0 else u
                parcial = round(t * c * rate, 6)
            else:
                parcial = round(c * u, 6)
            subtotal_insumos += parcial
            item_copy = dict(i_item)
            item_copy["costo_parcial"] = parcial
            insumos_items_calc.append(item_copy)

        # Equipos
        equipos_items_calc = []
        for e_item in fase.get("equipo_items", []):
            t = float(e_item.get("tiempo_minutos", 0) or 0)
            c = float(e_item.get("cantidad", 1) or 1)
            u = float(e_item.get("costo_unitario", 0) or 0)
            parcial = round(t * c * u, 6)
            subtotal_equipos += parcial
            item_copy = dict(e_item)
            item_copy["costo_parcial"] = parcial
            equipos_items_calc.append(item_copy)

        subtotal_fase = round(subtotal_rrhh + subtotal_insumos + subtotal_equipos, 6)
        tiempo_total += fase_tiempo
        total_rrhh += subtotal_rrhh
        total_insumos += subtotal_insumos
        total_equipos += subtotal_equipos

        fases_calculadas.append({
            **fase,
            "tiempo_minutos": fase_tiempo,
            "subtotal_rrhh": round(subtotal_rrhh, 6),
            "subtotal_insumos": round(subtotal_insumos, 6),
            "subtotal_equipos": round(subtotal_equipos, 6),
            "subtotal_fase": round(subtotal_fase, 6),
            "rrhh_items": rrhh_items_calc,
            "insumo_items": insumos_items_calc,
            "equipo_items": equipos_items_calc,
        })

    infra_id = costeo_data.get("infraestructura_id")
    serv_id = costeo_data.get("servicios_basicos_id")
    ind_id = costeo_data.get("costos_indirectos_id")

    # Auto-resolve IDs from ServicioCatalog if servicio_id is provided
    servicio_id = costeo_data.get("servicio_id")
    if servicio_id and db_session:
        from backend.app.models import ServicioCatalog
        serv_cat = db_session.query(ServicioCatalog).filter(ServicioCatalog.id == servicio_id).first()
        if serv_cat:
            if not infra_id and serv_cat.infraestructura_id:
                infra_id = serv_cat.infraestructura_id
            if not serv_id and serv_cat.servicios_basicos_id:
                serv_id = serv_cat.servicios_basicos_id
            if not ind_id and serv_cat.costos_indirectos_id:
                ind_id = serv_cat.costos_indirectos_id

    # Infraestructura
    costo_infraestructura = 0.0
    if infra_id:
        infra = db_session.query(InfraestructuraCatalog).filter(InfraestructuraCatalog.id == infra_id).first()
        if infra:
            deprec_min = float(infra.depreciacion_minuto or 0)
            costo_infraestructura = round(tiempo_total * deprec_min, 6)

    # Servicios Básicos
    costo_servicios = 0.0
    if serv_id:
        serv = db_session.query(ServiciosBasicosCatalog).filter(ServiciosBasicosCatalog.id == serv_id).first()
        if serv:
            costo_servicios = round(float(serv.costo_total_servicio or 0), 6)

    # Costo Directo Total
    costo_directo = round(total_rrhh + total_insumos + total_equipos + costo_infraestructura + costo_servicios, 6)

    # Costos Indirectos
    gastos_admin = 0.0
    gastos_generales = 0.0
    if ind_id:
        ind = db_session.query(CostosIndirectosCatalog).filter(CostosIndirectosCatalog.id == ind_id).first()
        if ind:
            gastos_admin = round(float(ind.costo_unit_admin or 0), 6)
            gastos_generales = round(float(ind.costo_unit_generales or 0), 6)

    costo_indirecto = round(gastos_admin + gastos_generales, 6)
    costo_total_estandar = round(costo_directo + costo_indirecto, 6)

    # Medicamentos
    costo_medicamentos = 0.0
    meds_calc = []
    for med in costeo_data.get("medicamentos", []):
        c = float(med.get("cantidad", 1) or 1)
        u = float(med.get("costo_unitario", 0) or 0)
        parcial = round(c * u, 6)
        costo_medicamentos += parcial
        m_copy = dict(med)
        m_copy["costo_parcial"] = parcial
        meds_calc.append(m_copy)

    costo_total_final = round(costo_total_estandar + costo_medicamentos, 6)

    # Tarifas
    raw_margen = costeo_data.get("margen_privados_pct")
    margen_pct = float(raw_margen) if raw_margen is not None and str(raw_margen).strip() != "" else 20.0
    tarifa_referencial = round(costo_total_estandar, 2)
    tarifa_no_asegurados = round(tarifa_referencial)
    tarifa_sis = tarifa_no_asegurados
    tarifa_essalud = tarifa_no_asegurados
    if margen_pct == 0.0:
        tarifa_privados = tarifa_referencial
    else:
        tarifa_privados = round(costo_total_estandar * (1.0 + (margen_pct / 100.0)), 2)

    return {
        "tiempo_total_minutos": round(tiempo_total, 2),
        "costo_rrhh": round(total_rrhh, 6),
        "costo_insumos": round(total_insumos, 6),
        "costo_equipos": round(total_equipos, 6),
        "costo_infraestructura": round(costo_infraestructura, 6),
        "costo_servicios": round(costo_servicios, 6),
        "costo_directo": round(costo_directo, 6),
        "gastos_admin": round(gastos_admin, 6),
        "gastos_generales": round(gastos_generales, 6),
        "costo_indirecto": round(costo_indirecto, 6),
        "costo_total_estandar": round(costo_total_estandar, 6),
        "costo_medicamentos": round(costo_medicamentos, 6),
        "costo_total_final": round(costo_total_final, 6),
        "tarifa_referencial": tarifa_referencial,
        "tarifa_no_asegurados": tarifa_no_asegurados,
        "tarifa_sis": tarifa_sis,
        "tarifa_essalud": tarifa_essalud,
        "tarifa_privados": tarifa_privados,
        "margen_privados_pct": margen_pct,
        "fases": fases_calculadas,
        "medicamentos": meds_calc,
    }
