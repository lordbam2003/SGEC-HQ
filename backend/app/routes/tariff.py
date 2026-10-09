from fastapi import APIRouter, Depends, Query, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import CosteoProcedimiento, EstudioMercadoReferencia, Usuario
from backend.app.schemas import CosteoProcedimientoOut, MercadoReferenciaOut, MercadoReferenciaIn
from backend.app.services.excel_generator import export_tariff_proposal_excel
from backend.app.auth import get_current_active_user

router = APIRouter(prefix="/api/tariffs", tags=["Tariff Proposals and Market Study"])

@router.get("/proposal", response_model=List[CosteoProcedimientoOut])
def get_tariff_proposals(
    upss: Optional[str] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(CosteoProcedimiento)
    if current_user.rol != "admin":
        query = query.filter(CosteoProcedimiento.usuario_id == current_user.id)

    if upss:
        query = query.filter(CosteoProcedimiento.upss_servicio.like(f"%{upss}%"))
    return query.order_by(CosteoProcedimiento.codigo_cpms.asc()).all()

@router.put("/proposal/{costeo_id}/margin", response_model=CosteoProcedimientoOut)
def update_tariff_margin(
    costeo_id: int,
    margen_pct: float = Query(..., ge=0, le=500),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    proc = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")

    if current_user.rol != "admin" and proc.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar esta tarifa")

    proc.margen_privados_pct = margen_pct
    proc.tarifa_referencial = round(proc.costo_total_estandar, 2)
    proc.tarifa_no_asegurados = round(proc.tarifa_referencial)
    proc.tarifa_sis = proc.tarifa_no_asegurados
    proc.tarifa_essalud = proc.tarifa_no_asegurados
    if margen_pct == 0.0:
        proc.tarifa_privados = proc.tarifa_referencial
    else:
        proc.tarifa_privados = round(proc.costo_total_estandar * (1.0 + (margen_pct / 100.0)), 2)

    db.commit()
    db.refresh(proc)
    return proc

@router.get("/proposal/export-excel")
def download_tariff_proposal_excel(
    upss: Optional[str] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(CosteoProcedimiento)
    if current_user.rol != "admin":
        query = query.filter(CosteoProcedimiento.usuario_id == current_user.id)

    if upss:
        query = query.filter(CosteoProcedimiento.upss_servicio.like(f"%{upss}%"))
    procedures = query.order_by(CosteoProcedimiento.codigo_cpms.asc()).all()

    excel_io = export_tariff_proposal_excel(procedures)
    return StreamingResponse(
        excel_io,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=PROPUESTA_TARIFARIA_ANEXO_I.xlsx"}
    )

@router.get("/market-study", response_model=List[CosteoProcedimientoOut])
def get_market_study_data(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(CosteoProcedimiento)
    if current_user.rol != "admin":
        query = query.filter(CosteoProcedimiento.usuario_id == current_user.id)
    return query.order_by(CosteoProcedimiento.codigo_cpms.asc()).all()

@router.post("/market-study/{costeo_id}/reference", response_model=MercadoReferenciaOut)
def add_market_reference(
    costeo_id: int,
    data: MercadoReferenciaIn,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    proc = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")

    if current_user.rol != "admin" and proc.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar este procedimiento")

    ref = EstudioMercadoReferencia(
        costeo_id=proc.id,
        institucion=data.institucion,
        precio_referencia=data.precio_referencia,
        observacion=data.observacion
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return ref

@router.delete("/market-study/reference/{ref_id}", status_code=204)
def delete_market_reference(
    ref_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    ref = db.query(EstudioMercadoReferencia).filter(EstudioMercadoReferencia.id == ref_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referencia no encontrada")

    proc = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == ref.costeo_id).first()
    if proc and current_user.rol != "admin" and proc.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar esta referencia")

    db.delete(ref)
    db.commit()


# ================= OBSERVATORIO MINSA =================
@router.get("/minsa-observatory")
def get_minsa_observatory_tariffs(
    cpt_codigo: str = Query(..., description="Código CPMS / CPT del procedimiento"),
    ipress_name: Optional[str] = Query("", description="Filtro opcional por nombre de IPRESS"),
    ups: Optional[str] = Query("0"),
    tipo_tarifa: Optional[str] = Query("0"),
    cmb_institucion: Optional[str] = Query("0"),
    cmb_departamento: Optional[str] = Query("0"),
    cmb_categoria: Optional[str] = Query("0")
):
    """
    Consulta en tiempo real al Observatorio de Costos y Tarifas del MINSA
    obteniendo sesión, cookies y CSRF dinámico.
    """
    from backend.app.services.minsa_observatory import fetch_minsa_observatory
    result = fetch_minsa_observatory(
        cpt_codigo=cpt_codigo,
        ipress_name=ipress_name,
        ups=ups,
        tipo_tarifa=tipo_tarifa,
        cmb_institucion=cmb_institucion,
        cmb_departamento=cmb_departamento,
        cmb_categoria=cmb_categoria
    )
    return result


@router.post("/market-study/{costeo_id}/import-minsa", response_model=List[MercadoReferenciaOut])
def import_minsa_market_references(
    costeo_id: int,
    items: List[MercadoReferenciaIn],
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Importa una o más referencias de mercado obtenidas del Observatorio MINSA
    directamente al procedimiento especificado.
    """
    proc = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.id == costeo_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")

    if current_user.rol != "admin" and proc.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar este procedimiento")

    created_refs = []
    for item in items:
        if item.precio_referencia > 0:
            ref = EstudioMercadoReferencia(
                costeo_id=proc.id,
                institucion=item.institucion,
                precio_referencia=item.precio_referencia,
                observacion=item.observacion or "Observatorio MINSA"
            )
            db.add(ref)
            created_refs.append(ref)

    db.commit()
    for ref in created_refs:
        db.refresh(ref)

    return created_refs


@router.get("/market-comparison")
def get_market_comparison_higher_prices(
    cpt_codigo: str = Query(..., description="Código CPMS / CPT del procedimiento"),
    precio_local: float = Query(0.0, description="Precio o costo local calculado en la hoja de costeo"),
    count: int = Query(3, description="Número de precios mayores a extraer")
):
    """
    Extrae tarifas del Observatorio MINSA, las analiza con un DataFrame de pandas
    y devuelve los 3 precios nacionales superiores al costo local calculado.
    """
    from backend.app.services.minsa_observatory import extract_higher_market_prices
    return extract_higher_market_prices(
        cpt_codigo=cpt_codigo,
        precio_local=precio_local,
        count=count
    )

