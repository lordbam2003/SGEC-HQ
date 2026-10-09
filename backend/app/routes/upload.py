import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.data_importer import import_cpms, import_data_catalogs

router = APIRouter(prefix="/api/upload", tags=["Periodic Catalog Upload"])

@router.post("/cpms")
async def upload_cpms_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Debe ser .xlsx o .xls")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        count = import_cpms(tmp_path, db)
        return {
            "success": True,
            "message": f"Catálogo CPMS actualizado exitosamente. Se procesaron {count} registros.",
            "total_records": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo CPMS: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/catalogs")
async def upload_catalogs_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Debe ser .xlsx o .xls")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        summary = import_data_catalogs(tmp_path, db)
        return {
            "success": True,
            "message": "Catálogos maestros actualizados exitosamente.",
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo de catálogos: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/siga")
async def upload_siga_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Debe ser .xlsx o .xls")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        from backend.app.services.siga_importer import sync_siga_catalog
        res = sync_siga_catalog(tmp_path, db)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo SIGA: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

