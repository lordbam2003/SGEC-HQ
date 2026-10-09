from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import timedelta

from backend.app.database import get_db
from backend.app.models import Usuario, CosteoProcedimiento
from backend.app.schemas import LoginRequest, LoginResponse, UsuarioOut
from backend.app.auth import (
    verify_password, hash_password, create_access_token,
    get_current_active_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    """Inicia sesión con nombre de usuario y contraseña"""
    username = creds.username.strip()
    user = db.query(Usuario).filter(Usuario.username == username).first()

    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos"
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta ha sido desactivada. Contacte al Administrador."
        )

    # Crear token de acceso
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "username": user.username,
            "rol": user.rol,
            "nombre_completo": user.nombre_completo
        }
    )

    total_costeos = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == user.id).count()

    user_out = UsuarioOut(
        id=user.id,
        username=user.username,
        nombre_completo=user.nombre_completo,
        email=user.email,
        rol=user.rol,
        activo=user.activo,
        created_at=user.created_at,
        updated_at=user.updated_at,
        total_costeos=total_costeos
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_out
    )

@router.get("/me", response_model=UsuarioOut)
def get_current_user_profile(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtiene los datos del perfil del usuario actualmente autenticado"""
    total_costeos = db.query(CosteoProcedimiento).filter(CosteoProcedimiento.usuario_id == current_user.id).count()
    return UsuarioOut(
        id=current_user.id,
        username=current_user.username,
        nombre_completo=current_user.nombre_completo,
        email=current_user.email,
        rol=current_user.rol,
        activo=current_user.activo,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        total_costeos=total_costeos
    )

@router.post("/change-password")
def change_password(
    current_password: str = Body(..., embed=True),
    new_password: str = Body(..., embed=True),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Permite al usuario cambiar su propia contraseña"""
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada es incorrecta"
        )

    if len(new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 4 caracteres"
        )

    current_user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}

@router.post("/logout")
def logout():
    """Cierre de sesión (el cliente descarta el token almacenado)"""
    return {"message": "Sesión cerrada exitosamente"}
