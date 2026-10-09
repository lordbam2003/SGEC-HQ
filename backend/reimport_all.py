import sys
sys.path.insert(0, r'D:\working\LAB_\proyecto_lis')

from backend.app.database import SessionLocal, engine, Base
from backend.app.models import *
from backend.app.services.data_importer import import_cpms, import_data_catalogs, create_seed_costings

print("Dropping and recreating tables...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()
print("=== 1. CPMS IMPORT ===")
import_cpms("CPMS_SUSALUD.xlsx", db)

print("=== 2. CATALOGS IMPORT (WITH FORWARD-FILL UPS & UPPERCASE) ===")
import_data_catalogs("data.xlsx", db)

print("=== 3. SEED COSTINGS ===")
create_seed_costings(db)

print("\nSample Infraestructura records:")
sample_infra = db.query(InfraestructuraCatalog).limit(15).all()
for s in sample_infra:
    print(f"  [{s.codigo_costeo}] UPS=\"{s.ups}\" | Servicio=\"{s.servicio}\" | Deprec={s.depreciacion_minuto}")

db.close()
print("REIMPORT COMPLETED SUCCESSFULLY!")
