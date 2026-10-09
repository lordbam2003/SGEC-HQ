from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from backend.app.database import get_db
from backend.app.models import Usuario, CosteoProcedimiento
from backend.app.schemas import UsuarioCreate, UsuarioUpdate, UsuarioOut
from backend.app.auth import (
    hash_password, get_admin_user, get_current_active_user
)

router = APIRouter(prefix="/api/users", tags=["Users Management"])

@router.get("", response_model=List[UsuarioOut])
def list_users(
    admin: Usuario = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Lista todos los usuarios del sistema con conteo de hojas de costeo creadas (Solo Admin)"""
    users = db.query(Usuario).order_by(Usuario.id.asc()).all()
    
    # Obtener conteo de costeos por usuario
    costeo_counts = dict(
        db.query(
            CosteoProcedimiento.usuario_id,
            func.count(CosteoProcedimiento.id)
        ).group_by(CosteoProcedimiento.usuario_id).all()
    )

    result = []
    for u in users:
        result.append(
            UsuarioOut(
                id=u.id,
                username=u.username,
                nombre_completo=u.nombre_completo,
                email=u.email,
                rol=u.rol,
                activo=u.activo,
                created_at=u.created_at,
                updated_at=u.updated_at,
                total_costeos=costeo_counts.get(u.id, 0)
            )
        )
    return result

@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UsuarioCreate,
    admin: Usuario = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Crea un nuevo usuario en el sistema (Solo Admin)"""
    username = data.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="El nombre de usuario es obligatorio")
    
    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")

    # Verificar si ya existe el username
    existing = db.query(Usuario).filter(Usuario.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"El nombre de usuario '{username}' ya está registrado")

    user = Usuario(
        username=username,
        hashed_password=hash_password(data.password),
        nombre_completo=data.nombre_completo.strip(),
        email=data.email.strip() if data.email else None,
        rol=data.rol if data.rol in ["admin", "usuario"] else "usuario",
        activo=data.activo if data.activo in [0, 1] else 1
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UsuarioOut(
        id=user.id,
        username=user.username,
        nombre_completo=user.nombre_completo,
        email=user.email,
        rol=user.rol,
        activo=user.activo,
        created_at=user.created_at,
        updated_at=user.updated_at,
        total_costeos=0
    )

@router.get("/{user_id}", response_model=UsuarioOut)
def get_user_detail(
    user_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtiene el detalle de un usuario (Admin o el propio usuario)"""
    if current_user.rol != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No tiene permisos para ver este usuario")

    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    count = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == user.id).count()
    return UsuarioOut(
        id=user.id,
        username=user.username,
        nombre_completo=user.nombre_completo,
        email=user.email,
        rol=user.rol,
        activo=user.activo,
        created_at=user.created_at,
        updated_at=user.updated_at,
        total_costeos=count
    )

@router.put("/{user_id}", response_model=UsuarioOut)
def update_user(
    user_id: int,
    data: UsuarioUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Actualiza datos de un usuario (Admin o auto-edición de nombre/email/password)"""
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    is_admin = current_user.rol == "admin"
    is_self = current_user.id == user_id

    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar este usuario")

    if data.nombre_completo is not None:
        user.nombre_completo = data.nombre_completo.strip()
    if data.email is not None:
        user.email = data.email.strip() if data.email else None
    
    # Solo admin puede cambiar roles y estado activo
    if is_admin:
        if data.rol is not None and data.rol in ["admin", "usuario"]:
            user.rol = data.rol
        if data.activo is not None:
            # Evitar desactivar al propio admin actual
            if is_self and data.activo == 0:
                raise HTTPException(status_code=400, detail="No puede desactivar su propia cuenta de administrador")
            user.activo = data.activo

    # Cambio de contraseña si se proporcionó
    if data.password:
        if len(data.password) < 4:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")
        user.hashed_password = hash_password(data.password)

    db.commit()
    db.refresh(user)

    count = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == user.id).count()
    return UsuarioOut(
        id=user.id,
        username=user.username,
        nombre_completo=user.nombre_completo,
        email=user.email,
        rol=user.rol,
        activo=user.activo,
        created_at=user.created_at,
        updated_at=user.updated_at,
        total_costeos=count
    )

@router.delete("/{user_id}")
def delete_or_toggle_user(
    user_id: int,
    admin: Usuario = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Desactiva o elimina un usuario (Solo Admin)"""
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="No puede desactivar su propia cuenta de administrador")

    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.username == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar la cuenta principal de administrador")

    # Si tiene costeos asociados, desactivar en lugar de eliminar
    has_costeos = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == user.id).first()
    if has_costeos:
        user.activo = 0 if user.activo == 1 else 1
        db.commit()
        status_text = "activado" if user.activo == 1 else "desactivado"
        return {"message": f"Usuario {user.username} {status_text} exitosamente", "activo": user.activo}
    else:
        db.delete(user)
        db.commit()
        return {"message": f"Usuario {user.username} eliminado exitosamente"}
