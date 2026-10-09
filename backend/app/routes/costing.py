from fastapi import APIRouter, Depends, HTTPException, status, Response, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import (
    CosteoProcedimiento, CosteoFase, CosteoFaseRRHH, CosteoFaseInsumo, CosteoFaseEquipo,
    CosteoMedicamento, EstudioMercadoReferencia,
    ServicioCatalog, InfraestructuraCatalog, ServiciosBasicosCatalog, CostosIndirectosCatalog,
    InsumoCatalog, EquipamientoCatalog, RRHHCatalog, Usuario
)
from backend.app.schemas import CosteoProcedimientoIn, CosteoProcedimientoOut
from backend.app.services.cost_calculator import compute_procedure_costs
from backend.app.services.excel_generator import export_costing_sheet_excel
from backend.app.auth import get_current_active_user

router = APIRouter(prefix="/api/costing", tags=["Procedure Costing"])

@router.post("/calculate", response_model=dict)
def calculate_costing_live(data: CosteoProcedimientoIn, db: Session = Depends(get_db)):
    """Calcula y devuelve todos los subtotales, totales y tarifas en tiempo real sin guardar"""
    raw_dict = data.model_dump()
    computed = compute_procedure_costs(raw_dict, db)
    return computed

@router.get("", response_model=List[CosteoProcedimientoOut])
def list_costings(
    q: Optional[str] = None,
    upss: Optional[str] = None,
    estado: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(CosteoProcedimiento)

    # Aislamiento por usuario: Operadores solo ven sus propias hojas, Admin ve todo (con filtro opcional)
    if current_user.rol != "admin":
        query = query.filter(CosteoProcedimiento.usuario_id == current_user.id)
    elif user_id:
        query = query.filter(CosteoProcedimiento.usuario_id == user_id)

    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                CosteoProcedimiento.codigo_cpms.like(search_term),
                CosteoProcedimiento.nombre_procedimiento.like(search_term),
                CosteoProcedimiento.upss_servicio.like(search_term)
            )
        )
    if upss:
        query = query.filter(CosteoProcedimiento.upss_servicio.like(f"%{upss}%"))
    if estado:
        query = query.filter(CosteoProcedimiento.estado == estado)
    return query.order_by(CosteoProcedimiento.updated_at.desc()).all()

@router.patch("/{costeo_id}/status", response_model=CosteoProcedimientoOut)
def update_costing_status(
    costeo_id: int,
    estado: str = Body(..., embed=True),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    costeo = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not costeo:
        raise HTTPException(status_code=404, detail="Hoja de costeo no encontrada")
    
    if current_user.rol != "admin" and costeo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar esta hoja de costeo")

    costeo.estado = estado.upper()
    db.commit()
    db.refresh(costeo)
    return costeo

@router.get("/{costeo_id}", response_model=CosteoProcedimientoOut)
def get_costing_detail(
    costeo_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    costeo = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not costeo:
        raise HTTPException(status_code=404, detail="Hoja de costeo no encontrada")
    
    if current_user.rol != "admin" and costeo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para ver esta hoja de costeo")

    return costeo

@router.post("", response_model=CosteoProcedimientoOut, status_code=status.HTTP_201_CREATED)
def create_costing(
    data: CosteoProcedimientoIn,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    raw_dict = data.model_dump()
    computed = compute_procedure_costs(raw_dict, db)

    # Validar IDs de catálogos para evitar errores de Foreign Key
    valid_serv_id = raw_dict.get("servicio_id")
    if valid_serv_id and not db.query(ServicioCatalog.id).filter(ServicioCatalog.id == valid_serv_id).first():
        valid_serv_id = None

    valid_infra_id = raw_dict.get("infraestructura_id")
    if valid_infra_id and not db.query(InfraestructuraCatalog.id).filter(InfraestructuraCatalog.id == valid_infra_id).first():
        valid_infra_id = None

    valid_sb_id = raw_dict.get("servicios_basicos_id")
    if valid_sb_id and not db.query(ServiciosBasicosCatalog.id).filter(ServiciosBasicosCatalog.id == valid_sb_id).first():
        valid_sb_id = None

    valid_ci_id = raw_dict.get("costos_indirectos_id")
    if valid_ci_id and not db.query(CostosIndirectosCatalog.id).filter(CostosIndirectosCatalog.id == valid_ci_id).first():
        valid_ci_id = None

    proc = CosteoProcedimiento(
        codigo_cpms=raw_dict["codigo_cpms"],
        nombre_procedimiento=raw_dict["nombre_procedimiento"],
        upss_servicio=raw_dict.get("upss_servicio"),
        servicio_id=valid_serv_id,
        usuario_id=current_user.id,
        infraestructura_id=valid_infra_id,
        servicios_basicos_id=valid_sb_id,
        costos_indirectos_id=valid_ci_id,
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
        notas=raw_dict.get("notas"),
        estado=raw_dict.get("estado", "BORRADOR")
    )
    db.add(proc)
    db.flush()

    for f_idx, f_data in enumerate(computed["fases"], 1):
        fase = CosteoFase(
            costeo_id=proc.id,
            nombre_fase=f_data["nombre_fase"],
            descripcion_actividad=f_data.get("descripcion_actividad"),
            orden=f_data.get("orden", f_idx),
            tiempo_minutos=f_data["tiempo_minutos"],
            subtotal_rrhh=f_data["subtotal_rrhh"],
            subtotal_insumos=f_data["subtotal_insumos"],
            subtotal_equipos=f_data["subtotal_equipos"],
            subtotal_fase=f_data["subtotal_fase"]
        )
        db.add(fase)
        db.flush()

        for r in f_data.get("rrhh_items", []):
            rid = r.get("rrhh_id")
            if rid and not db.query(RRHHCatalog.id).filter(RRHHCatalog.id == rid).first():
                rid = None
            db.add(CosteoFaseRRHH(
                fase_id=fase.id,
                rrhh_id=rid,
                codigo_costeo=r.get("codigo_costeo"),
                grupo_ocupacional=r.get("grupo_ocupacional"),
                tiempo_minutos=r.get("tiempo_minutos", 0),
                cantidad=r.get("cantidad", 1),
                costo_unitario=r.get("costo_unitario", 0),
                costo_parcial=r.get("costo_parcial", 0)
            ))
        for i in f_data.get("insumo_items", []):
            iid = i.get("insumo_id")
            if iid and not db.query(InsumoCatalog.id).filter(InsumoCatalog.id == iid).first():
                iid = None
            db.add(CosteoFaseInsumo(
                fase_id=fase.id,
                insumo_id=iid,
                codigo_costeo=i.get("codigo_costeo"),
                codigo_usado=i.get("codigo_usado"),
                descripcion=i.get("descripcion"),
                tipo_insumo=i.get("tipo_insumo", "FUNGIBLE"),
                unidad_medida=i.get("unidad_medida"),
                unidad_consumo=i.get("unidad_consumo"),
                tiempo_minutos=i.get("tiempo_minutos", 0),
                cantidad=i.get("cantidad", 1),
                costo_unitario=i.get("costo_unitario", 0),
                costo_minuto=i.get("costo_minuto", 0),
                costo_parcial=i.get("costo_parcial", 0)
            ))
        for e in f_data.get("equipo_items", []):
            eid = e.get("equipo_id")
            if eid and not db.query(EquipamientoCatalog.id).filter(EquipamientoCatalog.id == eid).first():
                eid = None
            db.add(CosteoFaseEquipo(
                fase_id=fase.id,
                equipo_id=eid,
                codigo_costeo=e.get("codigo_costeo"),
                codigo_margesi=e.get("codigo_margesi"),
                descripcion=e.get("descripcion"),
                tipo_equipamiento=e.get("tipo_equipamiento", "Equipo"),
                tiempo_minutos=e.get("tiempo_minutos", 0),
                cantidad=e.get("cantidad", 1),
                costo_unitario=e.get("costo_unitario", 0),
                costo_parcial=e.get("costo_parcial", 0)
            ))

    for m in computed.get("medicamentos", []):
        db.add(CosteoMedicamento(
            costeo_id=proc.id,
            insumo_id=m.get("insumo_id"),
            codigo_costeo=m.get("codigo_costeo"),
            descripcion=m.get("descripcion"),
            unidad_medida=m.get("unidad_medida"),
            cantidad=m.get("cantidad", 1),
            costo_unitario=m.get("costo_unitario", 0),
            costo_parcial=m.get("costo_parcial", 0)
        ))

    for ref in raw_dict.get("mercado_referencias", []):
        db.add(EstudioMercadoReferencia(
            costeo_id=proc.id,
            institucion=ref["institucion"],
            precio_referencia=ref.get("precio_referencia", 0),
            observacion=ref.get("observacion")
        ))

    db.commit()
    db.refresh(proc)
    return proc

@router.put("/{costeo_id}", response_model=CosteoProcedimientoOut)
def update_costing(
    costeo_id: int,
    data: CosteoProcedimientoIn,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    proc = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Hoja de costeo no encontrada")

    if current_user.rol != "admin" and proc.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar esta hoja de costeo")

    raw_dict = data.model_dump()
    computed = compute_procedure_costs(raw_dict, db)

    # Actualizar campos base
    proc.codigo_cpms = raw_dict["codigo_cpms"]
    proc.nombre_procedimiento = raw_dict["nombre_procedimiento"]
    proc.upss_servicio = raw_dict.get("upss_servicio")
    proc.infraestructura_id = raw_dict.get("infraestructura_id")
    proc.servicios_basicos_id = raw_dict.get("servicios_basicos_id")
    proc.costos_indirectos_id = raw_dict.get("costos_indirectos_id")
    proc.tiempo_total_minutos = computed["tiempo_total_minutos"]
    proc.costo_rrhh = computed["costo_rrhh"]
    proc.costo_insumos = computed["costo_insumos"]
    proc.costo_equipos = computed["costo_equipos"]
    proc.costo_infraestructura = computed["costo_infraestructura"]
    proc.costo_servicios = computed["costo_servicios"]
    proc.costo_directo = computed["costo_directo"]
    proc.gastos_admin = computed["gastos_admin"]
    proc.gastos_generales = computed["gastos_generales"]
    proc.costo_indirecto = computed["costo_indirecto"]
    proc.costo_total_estandar = computed["costo_total_estandar"]
    proc.costo_medicamentos = computed["costo_medicamentos"]
    proc.costo_total_final = computed["costo_total_final"]
    proc.tarifa_referencial = computed["tarifa_referencial"]
    proc.tarifa_no_asegurados = computed["tarifa_no_asegurados"]
    proc.tarifa_sis = computed["tarifa_sis"]
    proc.tarifa_essalud = computed["tarifa_essalud"]
    proc.tarifa_privados = computed["tarifa_privados"]
    proc.margen_privados_pct = computed["margen_privados_pct"]
    proc.notas = raw_dict.get("notas")
    proc.estado = raw_dict.get("estado", proc.estado)

    # Reemplazar fases y dependientes
    db.query(CosteoFase).filter(CosteoFase.costeo_id == proc.id).delete()
    db.query(CosteoMedicamento).filter(CosteoMedicamento.costeo_id == proc.id).delete()
    db.query(EstudioMercadoReferencia).filter(EstudioMercadoReferencia.costeo_id == proc.id).delete()
    db.flush()

    for f_idx, f_data in enumerate(computed["fases"], 1):
        fase = CosteoFase(
            costeo_id=proc.id,
            nombre_fase=f_data["nombre_fase"],
            descripcion_actividad=f_data.get("descripcion_actividad"),
            orden=f_data.get("orden", f_idx),
            tiempo_minutos=f_data["tiempo_minutos"],
            subtotal_rrhh=f_data["subtotal_rrhh"],
            subtotal_insumos=f_data["subtotal_insumos"],
            subtotal_equipos=f_data["subtotal_equipos"],
            subtotal_fase=f_data["subtotal_fase"]
        )
        db.add(fase)
        db.flush()

        for r in f_data.get("rrhh_items", []):
            db.add(CosteoFaseRRHH(
                fase_id=fase.id,
                rrhh_id=r.get("rrhh_id"),
                codigo_costeo=r.get("codigo_costeo"),
                grupo_ocupacional=r.get("grupo_ocupacional"),
                tiempo_minutos=r.get("tiempo_minutos", 0),
                cantidad=r.get("cantidad", 1),
                costo_unitario=r.get("costo_unitario", 0),
                costo_parcial=r.get("costo_parcial", 0)
            ))
        for i in f_data.get("insumo_items", []):
            db.add(CosteoFaseInsumo(
                fase_id=fase.id,
                insumo_id=i.get("insumo_id"),
                codigo_costeo=i.get("codigo_costeo"),
                codigo_usado=i.get("codigo_usado"),
                descripcion=i.get("descripcion"),
                tipo_insumo=i.get("tipo_insumo", "FUNGIBLE"),
                unidad_medida=i.get("unidad_medida"),
                unidad_consumo=i.get("unidad_consumo"),
                tiempo_minutos=i.get("tiempo_minutos", 0),
                cantidad=i.get("cantidad", 1),
                costo_unitario=i.get("costo_unitario", 0),
                costo_minuto=i.get("costo_minuto", 0),
                costo_parcial=i.get("costo_parcial", 0)
            ))
        for e in f_data.get("equipo_items", []):
            db.add(CosteoFaseEquipo(
                fase_id=fase.id,
                equipo_id=e.get("equipo_id"),
                codigo_costeo=e.get("codigo_costeo"),
                codigo_margesi=e.get("codigo_margesi"),
                descripcion=e.get("descripcion"),
                tipo_equipamiento=e.get("tipo_equipamiento", "Equipo"),
                tiempo_minutos=e.get("tiempo_minutos", 0),
                cantidad=e.get("cantidad", 1),
                costo_unitario=e.get("costo_unitario", 0),
                costo_parcial=e.get("costo_parcial", 0)
            ))

    for m in computed.get("medicamentos", []):
        db.add(CosteoMedicamento(
            costeo_id=proc.id,
            insumo_id=m.get("insumo_id"),
            codigo_costeo=m.get("codigo_costeo"),
            descripcion=m.get("descripcion"),
            unidad_medida=m.get("unidad_medida"),
            cantidad=m.get("cantidad", 1),
            costo_unitario=m.get("costo_unitario", 0),
            costo_parcial=m.get("costo_parcial", 0)
        ))

    for ref in raw_dict.get("mercado_referencias", []):
        db.add(EstudioMercadoReferencia(
            costeo_id=proc.id,
            institucion=ref["institucion"],
            precio_referencia=ref.get("precio_referencia", 0),
            observacion=ref.get("observacion")
        ))

    db.commit()
    db.refresh(proc)
    return proc

@router.post("/{costeo_id}/clone", response_model=CosteoProcedimientoOut)
def clone_costing(
    costeo_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Clona un procedimiento existente para acelerar la creación de una nueva hoja"""
    orig = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Hoja de costeo original no encontrada")

    if current_user.rol != "admin" and orig.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para clonar esta hoja de costeo")

    new_proc = CosteoProcedimiento(
        codigo_cpms=f"{orig.codigo_cpms}_COPIA",
        nombre_procedimiento=f"{orig.nombre_procedimiento} (Copia)",
        upss_servicio=orig.upss_servicio,
        usuario_id=current_user.id,
        infraestructura_id=orig.infraestructura_id,
        servicios_basicos_id=orig.servicios_basicos_id,
        costos_indirectos_id=orig.costos_indirectos_id,
        tiempo_total_minutos=orig.tiempo_total_minutos,
        costo_rrhh=orig.costo_rrhh,
        costo_insumos=orig.costo_insumos,
        costo_equipos=orig.costo_equipos,
        costo_infraestructura=orig.costo_infraestructura,
        costo_servicios=orig.costo_servicios,
        costo_directo=orig.costo_directo,
        gastos_admin=orig.gastos_admin,
        gastos_generales=orig.gastos_generales,
        costo_indirecto=orig.costo_indirecto,
        costo_total_estandar=orig.costo_total_estandar,
        costo_medicamentos=orig.costo_medicamentos,
        costo_total_final=orig.costo_total_final,
        tarifa_referencial=orig.tarifa_referencial,
        tarifa_no_asegurados=orig.tarifa_no_asegurados,
        tarifa_sis=orig.tarifa_sis,
        tarifa_essalud=orig.tarifa_essalud,
        tarifa_privados=orig.tarifa_privados,
        margen_privados_pct=orig.margen_privados_pct,
        notas=f"Copia generada a partir de ID #{orig.id}",
        estado="BORRADOR"
    )
    db.add(new_proc)
    db.flush()

    for fase in orig.fases:
        new_fase = CosteoFase(
            costeo_id=new_proc.id,
            nombre_fase=fase.nombre_fase,
            descripcion_actividad=fase.descripcion_actividad,
            orden=fase.orden,
            tiempo_minutos=fase.tiempo_minutos,
            subtotal_rrhh=fase.subtotal_rrhh,
            subtotal_insumos=fase.subtotal_insumos,
            subtotal_equipos=fase.subtotal_equipos,
            subtotal_fase=fase.subtotal_fase
        )
        db.add(new_fase)
        db.flush()

        for r in fase.rrhh_items:
            db.add(CosteoFaseRRHH(
                fase_id=new_fase.id,
                rrhh_id=r.rrhh_id,
                codigo_costeo=r.codigo_costeo,
                grupo_ocupacional=r.grupo_ocupacional,
                tiempo_minutos=r.tiempo_minutos,
                cantidad=r.cantidad,
                costo_unitario=r.costo_unitario,
                costo_parcial=r.costo_parcial
            ))
        for i in fase.insumo_items:
            db.add(CosteoFaseInsumo(
                fase_id=new_fase.id,
                insumo_id=i.insumo_id,
                codigo_costeo=i.codigo_costeo,
                codigo_usado=i.codigo_usado,
                descripcion=i.descripcion,
                tipo_insumo=i.tipo_insumo,
                unidad_medida=i.unidad_medida,
                unidad_consumo=i.unidad_consumo,
                tiempo_minutos=i.tiempo_minutos,
                cantidad=i.cantidad,
                costo_unitario=i.costo_unitario,
                costo_minuto=i.costo_minuto,
                costo_parcial=i.costo_parcial
            ))
        for e in fase.equipo_items:
            db.add(CosteoFaseEquipo(
                fase_id=new_fase.id,
                equipo_id=e.equipo_id,
                codigo_costeo=e.codigo_costeo,
                codigo_margesi=e.codigo_margesi,
                descripcion=e.descripcion,
                tipo_equipamiento=e.tipo_equipamiento,
                tiempo_minutos=e.tiempo_minutos,
                cantidad=e.cantidad,
                costo_unitario=e.costo_unitario,
                costo_parcial=e.costo_parcial
            ))

    for m in orig.medicamentos:
        db.add(CosteoMedicamento(
            costeo_id=new_proc.id,
            insumo_id=m.insumo_id,
            codigo_costeo=m.codigo_costeo,
            descripcion=m.descripcion,
            unidad_medida=m.unidad_medida,
            cantidad=m.cantidad,
            costo_unitario=m.costo_unitario,
            costo_parcial=m.costo_parcial
        ))

    db.commit()
    db.refresh(new_proc)
    return new_proc

@router.delete("/{costeo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_costing(
    costeo_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    proc = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Hoja de costeo no encontrada")

    if current_user.rol != "admin" and proc.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar esta hoja de costeo")

    db.delete(proc)
    db.commit()

@router.get("/{costeo_id}/export-excel")
def download_costing_excel(
    costeo_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    proc = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Hoja de costeo no encontrada")

    if current_user.rol != "admin" and proc.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para descargar este costeo")

    excel_io = export_costing_sheet_excel(proc)
    filename = f"HOJA_COSTEO_{proc.codigo_cpms}.xlsx"
    return StreamingResponse(
        excel_io,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
