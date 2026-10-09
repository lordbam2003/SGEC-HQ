from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from backend.app.database import get_db
from backend.app.models import CPMSCatalog
from backend.app.schemas import CPMSBase, CPMSOut, PagedResponse

router = APIRouter(prefix="/api/cpms", tags=["CPMS Catalog"])

@router.get("", response_model=PagedResponse)
def get_cpms_list(
    q: Optional[str] = Query(None, description="Búsqueda por código o denominación"),
    seccion: Optional[str] = Query(None, description="Filtro por sección"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(CPMSCatalog)
    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                CPMSCatalog.codigo.like(search_term),
                CPMSCatalog.denominacion.like(search_term)
            )
        )
    if seccion:
        query = query.filter(CPMSCatalog.seccion_nombre == seccion)

    total = query.count()
    items = query.order_by(CPMSCatalog.codigo.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "codigo": item.codigo,
                "denominacion": item.denominacion,
                "grupo_codigo": item.grupo_codigo,
                "grupo_nombre": item.grupo_nombre,
                "seccion_codigo": item.seccion_codigo,
                "seccion_nombre": item.seccion_nombre,
                "subseccion_codigo": item.subseccion_codigo,
                "subseccion_nombre": item.subseccion_nombre,
                "situacion": item.situacion
            } for item in items
        ]
    }

@router.get("/sections", response_model=List[str])
def get_sections(db: Session = Depends(get_db)):
    results = db.query(CPMSCatalog.seccion_nombre).filter(CPMSCatalog.seccion_nombre.isnot(None)).distinct().all()
    return sorted([r[0] for r in results if r[0]])

@router.get("/{codigo}", response_model=CPMSOut)
def get_cpms_detail(codigo: str, db: Session = Depends(get_db)):
    item = db.query(CPMSCatalog).filter(CPMSCatalog.codigo == codigo).first()
    if not item:
        raise HTTPException(status_code=404, detail="Procedimiento CPMS no encontrado")
    return item

@router.post("", response_model=CPMSOut, status_code=201)
def create_cpms(data: CPMSBase, db: Session = Depends(get_db)):
    existing = db.query(CPMSCatalog).filter(CPMSCatalog.codigo == data.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"El procedimiento con código {data.codigo} ya existe")
    item = CPMSCatalog(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{codigo}", response_model=CPMSOut)
def update_cpms(codigo: str, data: CPMSBase, db: Session = Depends(get_db)):
    item = db.query(CPMSCatalog).filter(CPMSCatalog.codigo == codigo).first()
    if not item:
        raise HTTPException(status_code=404, detail="Procedimiento CPMS no encontrado")
    for key, val in data.model_dump().items():
        setattr(item, key, val)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{codigo}", status_code=204)
def delete_cpms(codigo: str, db: Session = Depends(get_db)):
    item = db.query(CPMSCatalog).filter(CPMSCatalog.codigo == codigo).first()
    if not item:
        raise HTTPException(status_code=404, detail="Procedimiento CPMS no encontrado")
    db.delete(item)
    db.commit()

