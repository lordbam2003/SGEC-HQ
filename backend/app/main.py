import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.app.database import get_db, SessionLocal, engine, Base
from backend.app.models import (
    CPMSCatalog, InsumoCatalog, EquipamientoCatalog, RRHHCatalog,
    InfraestructuraCatalog, CosteoProcedimiento, Usuario
)
from backend.app.routes import cpms, catalogs, costing, matrix, tariff, upload, auth, users
from backend.app.auth import get_current_active_user, seed_initial_admin

app = FastAPI(
    title="SGEC-HQ - Sistema de Gestión de Estructuras de Costo (Hospital Quillabamba)",
    description="API institucional para gestión de estructuras de costos por procedimientos, análisis tarifario y matrices CPMS/MINSA.",
    version="1.0.0"
)

# Startup: Asegurar tablas y usuario admin
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_admin(db)
    finally:
        db.close()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(cpms.router)
app.include_router(catalogs.router)
app.include_router(costing.router)
app.include_router(matrix.router)
app.include_router(tariff.router)
app.include_router(upload.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "costeo_hospitalario"}

@app.get("/api/dashboard/stats")
def get_dashboard_stats(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    total_cpms = db.query(CPMSCatalog).count()
    total_insumos = db.query(InsumoCatalog).count()
    total_equipos = db.query(EquipamientoCatalog).count()
    total_rrhh = db.query(RRHHCatalog).count()

    if current_user.rol == "admin":
        total_costeos = db.query(CosteoProcedimiento).count()
        recent = db.query(CosteoProcedimiento).order_by(CosteoProcedimiento.updated_at.desc()).limit(6).all()
    else:
        total_costeos = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == current_user.id).count()
        recent = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == current_user.id).order_by(CosteoProcedimiento.updated_at.desc()).limit(6).all()

    return {
        "total_cpms": total_cpms,
        "total_insumos": total_insumos,
        "total_equipos": total_equipos,
        "total_rrhh": total_rrhh,
        "total_costeos": total_costeos,
        "user_role": current_user.rol,
        "user_name": current_user.nombre_completo,
        "recent_costings": [
            {
                "id": c.id,
                "codigo_cpms": c.codigo_cpms,
                "nombre_procedimiento": c.nombre_procedimiento,
                "upss_servicio": c.upss_servicio,
                "tiempo_total_minutos": c.tiempo_total_minutos,
                "costo_total_estandar": c.costo_total_estandar,
                "tarifa_referencial": c.tarifa_referencial,
                "estado": c.estado,
                "usuario_nombre": c.usuario.nombre_completo if c.usuario else "Administrador",
                "updated_at": c.updated_at.strftime("%Y-%m-%d %H:%M") if c.updated_at else None
            } for c in recent
        ]
    }

# Servir Frontend Estático
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
