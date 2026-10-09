import os
import hmac
import hashlib
import json
import base64
import time
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Usuario, CosteoProcedimiento

# Clave secreta para firma de tokens (puede sobreescribirse en .env)
SECRET_KEY = os.getenv("SECRET_KEY", "costeo_hospitalario_jwt_secret_key_2026_minsa_cpms_safe!")
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "24"))

# Portador de token Bearer en cabecera HTTP
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Genera hash seguro de contraseña usando PBKDF2-HMAC-SHA256 con salt aleatorio"""
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}${pwd_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña coincide con el hash almacenado"""
    if not hashed_password or "$" not in hashed_password:
        return False
    salt, original_hash = hashed_password.split("$", 1)
    test_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return hmac.compare_digest(original_hash, test_hash)

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _b64_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4)) if len(data) % 4 != 0 else ''
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un token firmado HMAC-SHA256 con fecha de expiración"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": int(expire.timestamp())})
    payload_json = json.dumps(to_encode, separators=(',', ':')).encode('utf-8')
    payload_b64 = _b64_encode(payload_json)

    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = _b64_encode(signature)

    return f"{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> dict:
    """Valida y decodifica un token firmado HMAC-SHA256"""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Formato de token no válido")

        payload_b64, sig_b64 = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        actual_sig = _b64_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma de token inválida")

        payload_bytes = _b64_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        # Verificar expiración
        exp = payload.get("exp")
        if not exp or int(time.time()) > int(exp):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La sesión ha expirado")

        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token no válido o corrupto")

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """Extrae y autentica el usuario actual a partir del token Bearer"""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionaron credenciales de autenticación",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin identificación de usuario")

    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")

    if not user.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario desactivado. Contacte al administrador.")

    return user

def get_current_active_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Garantiza que el usuario esté activo"""
    if not current_user.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta de usuario inactiva")
    return current_user

def get_admin_user(current_user: Usuario = Depends(get_current_active_user)) -> Usuario:
    """Garantiza que el usuario tenga privilegios de Administrador"""
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido: Se requieren privilegios de Administrador"
        )
    return current_user

def seed_initial_admin(db: Session):
    """Crea automáticamente el usuario admin inicial si no existe y asegura columnas requeridas"""
    from sqlalchemy import text
    try:
        res = db.execute(text("SHOW COLUMNS FROM costeo_procedimientos LIKE 'usuario_id'")).fetchone()
        if not res:
            db.execute(text("ALTER TABLE costeo_procedimientos ADD COLUMN usuario_id INT NULL"))
            db.commit()
            print(" [DB] Columna 'usuario_id' agregada exitosamente a 'costeo_procedimientos'.")
    except Exception as e:
        print(f" [DB] Info migración usuario_id: {e}")

    admin_user = db.query(Usuario).filter(Usuario.username == "admin").first()
    if not admin_user:
        admin_user = Usuario(
            username="admin",
            hashed_password=hash_password("$tudio92"),
            nombre_completo="Administrador del Sistema",
            email="admin@hospital.gob.pe",
            rol="admin",
            activo=1
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(" [AUTH] Usuario 'admin' inicial creado exitosamente con clave '$tudio92'.")
    else:
        # Asegurar que admin tenga rol admin, esté activo y tenga password válido
        updated = False
        if admin_user.rol != "admin" or not admin_user.activo:
            admin_user.rol = "admin"
            admin_user.activo = 1
            updated = True
        if not verify_password("$tudio92", admin_user.hashed_password) and (not admin_user.hashed_password or len(admin_user.hashed_password) < 10):
            admin_user.hashed_password = hash_password("$tudio92")
            updated = True
        if updated:
            db.commit()
            print(" [AUTH] Usuario 'admin' actualizado y verificado.")

    # Asociar procedimientos huérfanos preexistentes al admin
    try:
        orphan_costings = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == None).all()
        if orphan_costings:
            for c in orphan_costings:
                c.usuario_id = admin_user.id
            db.commit()
            print(f" [AUTH] Se vincularon {len(orphan_costings)} procedimientos preexistentes al usuario admin.")
    except Exception as e:
        print(f" [AUTH] Info asociación de huérfanos: {e}")
