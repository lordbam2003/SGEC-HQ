from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import CosteoProcedimiento, Usuario
from backend.app.schemas import CosteoProcedimientoOut
from backend.app.services.excel_generator import export_summary_matrix_excel
from backend.app.auth import get_current_active_user

router = APIRouter(prefix="/api/matrix", tags=["Summary Matrix"])

@router.get("", response_model=List[CosteoProcedimientoOut])
def get_matrix_data(
    upss: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(CosteoProcedimiento)
    if current_user.rol != "admin":
        query = query.filter(CosteoProcedimiento.usuario_id == current_user.id)

    if upss:
        query = query.filter(CosteoProcedimiento.upss_servicio.like(f"%{upss}%"))
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            (CosteoProcedimiento.codigo_cpms.like(search)) |
            (CosteoProcedimiento.nombre_procedimiento.like(search))
        )
    return query.order_by(CosteoProcedimiento.codigo_cpms.asc()).all()

@router.get("/export-excel")
def download_matrix_excel(
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

    excel_io = export_summary_matrix_excel(procedures)
    return StreamingResponse(
        excel_io,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=MATRIZ_RESUMEN_COSTOS.xlsx"}
    )
