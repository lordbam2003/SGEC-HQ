from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
from backend.app.database import get_db
from backend.app.models import (
    InsumoCatalog, EquipamientoCatalog, RRHHCatalog,
    InfraestructuraCatalog, ServiciosBasicosCatalog, CostosIndirectosCatalog,
    ServicioCatalog
)
from backend.app.schemas import (
    InsumoOut, InsumoBase,
    EquipamientoOut, EquipamientoBase,
    RRHHOut, RRHHBase,
    InfraestructuraOut, InfraestructuraBase,
    ServiciosBasicosOut, ServiciosBasicosBase,
    CostosIndirectosOut, CostosIndirectosBase,
    ServicioOut, ServicioDetailedOut, ServicioBase,
    CentroCostoInfo, ServicioCentrosCostoUpdate,
    PagedResponse
)
import json

router = APIRouter(prefix="/api/catalogs", tags=["Catalogs Management"])

# ================= INSUMOS =================
@router.get("/insumos", response_model=PagedResponse)
def get_insumos(
    q: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    origen: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(InsumoCatalog)
    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                InsumoCatalog.descripcion.like(search_term),
                InsumoCatalog.codigo_costeo.like(search_term),
                InsumoCatalog.codigo_usado.like(search_term),
                InsumoCatalog.codigo_siga.like(search_term)
            )
        )
    if tipo:
        query = query.filter(InsumoCatalog.tipo == tipo.upper())
    if origen:
        query = query.filter(InsumoCatalog.origen == origen.upper())

    total = query.count()
    items = query.order_by(InsumoCatalog.descripcion.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [InsumoOut.model_validate(i) for i in items]
    }

@router.post("/insumos", response_model=InsumoOut, status_code=status.HTTP_201_CREATED)
def create_insumo(data: InsumoBase, db: Session = Depends(get_db)):
    ins = InsumoCatalog(**data.model_dump())
    if ins.costo_unitario == 0 and ins.cantidad_presentacion > 0 and ins.precio_promedio > 0:
        ins.costo_unitario = round(ins.precio_promedio / ins.cantidad_presentacion, 6)
    db.add(ins)
    db.commit()
    db.refresh(ins)
    return InsumoOut.model_validate(ins)

@router.put("/insumos/{item_id}", response_model=InsumoOut)
def update_insumo(item_id: int, data: InsumoBase, db: Session = Depends(get_db)):
    ins = db.query(InsumoCatalog).filter(InsumoCatalog.id == item_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    for key, val in data.model_dump().items():
        setattr(ins, key, val)
    if ins.costo_unitario == 0 and ins.cantidad_presentacion > 0 and ins.precio_promedio > 0:
        ins.costo_unitario = round(ins.precio_promedio / ins.cantidad_presentacion, 6)
    db.commit()
    db.refresh(ins)
    return InsumoOut.model_validate(ins)

@router.delete("/insumos/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_insumo(item_id: int, db: Session = Depends(get_db)):
    ins = db.query(InsumoCatalog).filter(InsumoCatalog.id == item_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    db.delete(ins)
    db.commit()

# ================= EQUIPAMIENTO =================
@router.get("/equipamiento/all", response_model=List[EquipamientoOut])
def get_all_equipamiento(db: Session = Depends(get_db)):
    items = db.query(EquipamientoCatalog).order_by(EquipamientoCatalog.descripcion.asc()).all()
    return [EquipamientoOut.model_validate(i) for i in items]

@router.get("/equipamiento", response_model=PagedResponse)
def get_equipamiento(
    q: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    servicio_id: Optional[int] = Query(None),
    centro_costos: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(EquipamientoCatalog)

    # Filtrar por Servicio (usando sus centros de costos mapeados)
    if servicio_id:
        serv = db.query(ServicioCatalog).filter(ServicioCatalog.id == servicio_id).first()
        if serv and serv.centros_costo_equipamiento:
            try:
                ccs = json.loads(serv.centros_costo_equipamiento)
                if ccs and isinstance(ccs, list):
                    query = query.filter(EquipamientoCatalog.centro_costos.in_(ccs))
            except Exception:
                pass
    elif centro_costos:
        query = query.filter(EquipamientoCatalog.centro_costos.like(f"%{centro_costos}%"))

    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                EquipamientoCatalog.descripcion.like(search_term),
                EquipamientoCatalog.codigo_costeo.like(search_term),
                EquipamientoCatalog.codigo_margesi.like(search_term),
                EquipamientoCatalog.centro_costos.like(search_term)
            )
        )
    if tipo:
        query = query.filter(EquipamientoCatalog.tipo_equipamiento.like(f"%{tipo}%"))

    total = query.count()
    items = query.order_by(EquipamientoCatalog.descripcion.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [EquipamientoOut.model_validate(i) for i in items]
    }

@router.post("/equipamiento", response_model=EquipamientoOut, status_code=status.HTTP_201_CREATED)
def create_equipamiento(data: EquipamientoBase, db: Session = Depends(get_db)):
    eq = EquipamientoCatalog(**data.model_dump())
    if eq.costo_minuto == 0 and eq.vida_util_minutos > 0 and eq.valor_adquisicion > 0:
        eq.costo_minuto = round(eq.valor_adquisicion / eq.vida_util_minutos, 8)
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return EquipamientoOut.model_validate(eq)

@router.put("/equipamiento/{item_id}", response_model=EquipamientoOut)
def update_equipamiento(item_id: int, data: EquipamientoBase, db: Session = Depends(get_db)):
    eq = db.query(EquipamientoCatalog).filter(EquipamientoCatalog.id == item_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamiento no encontrado")
    for key, val in data.model_dump().items():
        setattr(eq, key, val)
    if eq.costo_minuto == 0 and eq.vida_util_minutos > 0 and eq.valor_adquisicion > 0:
        eq.costo_minuto = round(eq.valor_adquisicion / eq.vida_util_minutos, 8)
    db.commit()
    db.refresh(eq)
    return EquipamientoOut.model_validate(eq)

@router.delete("/equipamiento/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_equipamiento(item_id: int, db: Session = Depends(get_db)):
    eq = db.query(EquipamientoCatalog).filter(EquipamientoCatalog.id == item_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamiento no encontrado")
    db.delete(eq)
    db.commit()

# ================= RRHH =================
@router.get("/rrhh/all", response_model=List[RRHHOut])
def get_all_rrhh(db: Session = Depends(get_db)):
    items = db.query(RRHHCatalog).order_by(RRHHCatalog.grupo_ocupacional.asc()).all()
    return [RRHHOut.model_validate(i) for i in items]

@router.get("/rrhh", response_model=PagedResponse)
def get_rrhh(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(RRHHCatalog)
    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                RRHHCatalog.grupo_ocupacional.like(search_term),
                RRHHCatalog.codigo_costeo.like(search_term)
            )
        )
    total = query.count()
    items = query.order_by(RRHHCatalog.grupo_ocupacional.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [RRHHOut.model_validate(i) for i in items]
    }

@router.post("/rrhh", response_model=RRHHOut, status_code=status.HTTP_201_CREATED)
def create_rrhh(data: RRHHBase, db: Session = Depends(get_db)):
    r = RRHHCatalog(**data.model_dump())
    if r.costo_minuto == 0 and r.jornada_minutos > 0 and r.pago_mensual > 0:
        r.costo_minuto = round(r.pago_mensual / r.jornada_minutos, 8)
    db.add(r)
    db.commit()
    db.refresh(r)
    return RRHHOut.model_validate(r)

@router.put("/rrhh/{item_id}", response_model=RRHHOut)
def update_rrhh(item_id: int, data: RRHHBase, db: Session = Depends(get_db)):
    r = db.query(RRHHCatalog).filter(RRHHCatalog.id == item_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registro RRHH no encontrado")
    for key, val in data.model_dump().items():
        setattr(r, key, val)
    if r.costo_minuto == 0 and r.jornada_minutos > 0 and r.pago_mensual > 0:
        r.costo_minuto = round(r.pago_mensual / r.jornada_minutos, 8)
    db.commit()
    db.refresh(r)
    return RRHHOut.model_validate(r)

@router.delete("/rrhh/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rrhh(item_id: int, db: Session = Depends(get_db)):
    r = db.query(RRHHCatalog).filter(RRHHCatalog.id == item_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registro RRHH no encontrado")
    db.delete(r)
    db.commit()

# ================= INFRAESTRUCTURA =================
@router.get("/infraestructura", response_model=List[InfraestructuraOut])
def get_infraestructura(db: Session = Depends(get_db)):
    items = db.query(InfraestructuraCatalog).order_by(InfraestructuraCatalog.servicio.asc()).all()
    return [InfraestructuraOut.model_validate(i) for i in items]

@router.post("/infraestructura", response_model=InfraestructuraOut, status_code=status.HTTP_201_CREATED)
def create_infraestructura(data: InfraestructuraBase, db: Session = Depends(get_db)):
    inf = InfraestructuraCatalog(**data.model_dump())
    if inf.depreciacion_minuto == 0 and inf.vida_util_minutos > 0 and inf.valor_total_upss > 0:
        inf.depreciacion_minuto = round(inf.valor_total_upss / inf.vida_util_minutos, 8)
    db.add(inf)
    db.commit()
    db.refresh(inf)
    return InfraestructuraOut.model_validate(inf)

@router.put("/infraestructura/{item_id}", response_model=InfraestructuraOut)
def update_infraestructura(item_id: int, data: InfraestructuraBase, db: Session = Depends(get_db)):
    inf = db.query(InfraestructuraCatalog).filter(InfraestructuraCatalog.id == item_id).first()
    if not inf:
        raise HTTPException(status_code=404, detail="Infraestructura no encontrada")
    for key, val in data.model_dump().items():
        setattr(inf, key, val)
    if inf.depreciacion_minuto == 0 and inf.vida_util_minutos > 0 and inf.valor_total_upss > 0:
        inf.depreciacion_minuto = round(inf.valor_total_upss / inf.vida_util_minutos, 8)
    db.commit()
    db.refresh(inf)
    return InfraestructuraOut.model_validate(inf)

@router.delete("/infraestructura/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_infraestructura(item_id: int, db: Session = Depends(get_db)):
    inf = db.query(InfraestructuraCatalog).filter(InfraestructuraCatalog.id == item_id).first()
    if not inf:
        raise HTTPException(status_code=404, detail="Infraestructura no encontrada")
    db.delete(inf)
    db.commit()


# ================= SERVICIOS BASICOS =================
@router.get("/servicios-basicos", response_model=List[ServiciosBasicosOut])
def get_servicios_basicos(db: Session = Depends(get_db)):
    items = db.query(ServiciosBasicosCatalog).order_by(ServiciosBasicosCatalog.servicio.asc()).all()
    return [ServiciosBasicosOut.model_validate(i) for i in items]

@router.post("/servicios-basicos", response_model=ServiciosBasicosOut, status_code=status.HTTP_201_CREATED)
def create_servicios_basicos(data: ServiciosBasicosBase, db: Session = Depends(get_db)):
    sb = ServiciosBasicosCatalog(**data.model_dump())
    db.add(sb)
    db.commit()
    db.refresh(sb)
    return ServiciosBasicosOut.model_validate(sb)

@router.put("/servicios-basicos/{item_id}", response_model=ServiciosBasicosOut)
def update_servicios_basicos(item_id: int, data: ServiciosBasicosBase, db: Session = Depends(get_db)):
    sb = db.query(ServiciosBasicosCatalog).filter(ServiciosBasicosCatalog.id == item_id).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Servicio Básico no encontrado")
    for key, val in data.model_dump().items():
        setattr(sb, key, val)
    db.commit()
    db.refresh(sb)
    return ServiciosBasicosOut.model_validate(sb)

@router.delete("/servicios-basicos/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_servicios_basicos(item_id: int, db: Session = Depends(get_db)):
    sb = db.query(ServiciosBasicosCatalog).filter(ServiciosBasicosCatalog.id == item_id).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Servicio Básico no encontrado")
    db.delete(sb)
    db.commit()

# ================= COSTOS INDIRECTOS =================
@router.get("/costos-indirectos", response_model=List[CostosIndirectosOut])
def get_costos_indirectos(db: Session = Depends(get_db)):
    items = db.query(CostosIndirectosCatalog).order_by(CostosIndirectosCatalog.servicio.asc()).all()
    return [CostosIndirectosOut.model_validate(i) for i in items]

@router.post("/costos-indirectos", response_model=CostosIndirectosOut, status_code=status.HTTP_201_CREATED)
def create_costos_indirectos(data: CostosIndirectosBase, db: Session = Depends(get_db)):
    ci = CostosIndirectosCatalog(**data.model_dump())
    if ci.costo_unit_total_pms == 0 and (ci.costo_unit_admin > 0 or ci.costo_unit_generales > 0):
        ci.costo_unit_total_pms = round(ci.costo_unit_admin + ci.costo_unit_generales, 6)
    db.add(ci)
    db.commit()
    db.refresh(ci)
    return CostosIndirectosOut.model_validate(ci)

@router.put("/costos-indirectos/{item_id}", response_model=CostosIndirectosOut)
def update_costos_indirectos(item_id: int, data: CostosIndirectosBase, db: Session = Depends(get_db)):
    ci = db.query(CostosIndirectosCatalog).filter(CostosIndirectosCatalog.id == item_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Costo Indirecto no encontrado")
    for key, val in data.model_dump().items():
        setattr(ci, key, val)
    if ci.costo_unit_total_pms == 0 and (ci.costo_unit_admin > 0 or ci.costo_unit_generales > 0):
        ci.costo_unit_total_pms = round(ci.costo_unit_admin + ci.costo_unit_generales, 6)
    db.commit()
    db.refresh(ci)
    return CostosIndirectosOut.model_validate(ci)

@router.delete("/costos-indirectos/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_costos_indirectos(item_id: int, db: Session = Depends(get_db)):
    ci = db.query(CostosIndirectosCatalog).filter(CostosIndirectosCatalog.id == item_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Costo Indirecto no encontrado")
    db.delete(ci)
    db.commit()

# ================= SERVICIOS HOSPITALARIOS =================
@router.get("/servicios/all", response_model=List[ServicioDetailedOut])
def get_all_servicios(db: Session = Depends(get_db)):
    items = db.query(ServicioCatalog).order_by(ServicioCatalog.ups.asc(), ServicioCatalog.nombre_servicio.asc()).all()
    return [ServicioDetailedOut.model_validate(i) for i in items]

@router.get("/servicios", response_model=PagedResponse)
def get_servicios(
    q: Optional[str] = Query(None),
    ups: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(ServicioCatalog)
    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                ServicioCatalog.nombre_servicio.like(search_term),
                ServicioCatalog.ups.like(search_term),
                ServicioCatalog.codigo.like(search_term)
            )
        )
    if ups:
        query = query.filter(ServicioCatalog.ups.like(f"%{ups.strip()}%"))

    total = query.count()
    items = query.order_by(ServicioCatalog.ups.asc(), ServicioCatalog.nombre_servicio.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [ServicioDetailedOut.model_validate(i) for i in items]
    }

@router.get("/servicios/{item_id}", response_model=ServicioDetailedOut)
def get_servicio_by_id(item_id: int, db: Session = Depends(get_db)):
    s = db.query(ServicioCatalog).filter(ServicioCatalog.id == item_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return ServicioDetailedOut.model_validate(s)

@router.post("/servicios", response_model=ServicioDetailedOut, status_code=status.HTTP_201_CREATED)
def create_servicio(data: ServicioBase, db: Session = Depends(get_db)):
    s = ServicioCatalog(**data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return ServicioDetailedOut.model_validate(s)

@router.put("/servicios/{item_id}", response_model=ServicioDetailedOut)
def update_servicio(item_id: int, data: ServicioBase, db: Session = Depends(get_db)):
    s = db.query(ServicioCatalog).filter(ServicioCatalog.id == item_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for key, val in data.model_dump().items():
        setattr(s, key, val)
    db.commit()
    db.refresh(s)
    return ServicioDetailedOut.model_validate(s)

@router.delete("/servicios/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_servicio(item_id: int, db: Session = Depends(get_db)):
    s = db.query(ServicioCatalog).filter(ServicioCatalog.id == item_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    db.delete(s)
    db.commit()


@router.get("/centros-costos", response_model=List[CentroCostoInfo])
def get_centros_costos_equipamiento(db: Session = Depends(get_db)):
    """Retorna los 39 centros de costos de equipamiento con el total de equipos en cada uno"""
    results = (
        db.query(
            EquipamientoCatalog.centro_costos,
            func.count(EquipamientoCatalog.id).label("total")
        )
        .filter(EquipamientoCatalog.centro_costos.isnot(None), EquipamientoCatalog.centro_costos != "")
        .group_by(EquipamientoCatalog.centro_costos)
        .order_by(EquipamientoCatalog.centro_costos.asc())
        .all()
    )
    return [{"nombre": r[0].strip(), "total_equipos": r[1]} for r in results if r[0]]

@router.put("/servicios/{item_id}/centros-costos", response_model=ServicioDetailedOut)
def update_servicio_centros_costos(item_id: int, data: ServicioCentrosCostoUpdate, db: Session = Depends(get_db)):
    """Actualiza la lista de centros de costos asignados a un servicio hospitalario"""
    s = db.query(ServicioCatalog).filter(ServicioCatalog.id == item_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    clean_ccs = [c.strip() for c in data.centros_costo if c and c.strip()]
    s.centros_costo_equipamiento = json.dumps(clean_ccs, ensure_ascii=False)
    db.commit()
    db.refresh(s)
    return ServicioDetailedOut.model_validate(s)


