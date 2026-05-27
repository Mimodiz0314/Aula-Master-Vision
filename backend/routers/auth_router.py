"""
Router de Autenticación
=========================
Registro e inicio de sesión de docentes con JWT.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.db_models import Docente
from agents.agente_seguridad import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


class RegistroSchema(BaseModel):
    nombre: str
    email: str
    password: str


class LoginSchema(BaseModel):
    email: str
    password: str


@router.post("/registro")
def registrar_docente(body: RegistroSchema, db: Session = Depends(get_db)):
    if db.query(Docente).filter(Docente.email == body.email).first():
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese email.")
    docente = Docente(
        nombre=body.nombre,
        email=body.email,
        password_hash=hash_password(body.password)
    )
    db.add(docente)
    db.commit()
    db.refresh(docente)
    token = create_access_token({"sub": str(docente.id), "nombre": docente.nombre})
    return {"token": token, "docente_id": docente.id, "nombre": docente.nombre}


@router.post("/login")
def login_docente(body: LoginSchema, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.email == body.email).first()
    if not docente or not verify_password(body.password, docente.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")
    token = create_access_token({"sub": str(docente.id), "nombre": docente.nombre})
    return {"token": token, "docente_id": docente.id, "nombre": docente.nombre}


@router.get("/me")
def get_me_by_id(docente_id: int, db: Session = Depends(get_db)):
    """Simple verificación sin middleware completo (frontend pasa docente_id por query)."""
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado.")
    return {"docente_id": docente.id, "nombre": docente.nombre, "email": docente.email}
