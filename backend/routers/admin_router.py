from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Docente
from routers.auth_router import obtener_docente_actual
from agents.agente_seguridad import hash_password as get_password_hash
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/admin", tags=["Administración"])

class DocenteCreate(BaseModel):
    nombre: str
    email: str
    password: str
    es_admin: bool = False

class DocenteUpdate(BaseModel):
    nombre: str | None = None
    email: str | None = None
    es_admin: bool | None = None

class DocentePasswordUpdate(BaseModel):
    new_password: str

class DocenteResponse(BaseModel):
    id: int
    nombre: str
    email: str
    es_admin: bool

def verificar_admin(docente: Docente = Depends(obtener_docente_actual)):
    if not docente.es_admin:
        # Fallback: Si el usuario es miltonmoralesdiaz@gmail.com, forzar admin por si no lo tiene
        if docente.email == "miltonmoralesdiaz@gmail.com":
            return docente
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    return docente

@router.get("/docentes")
def listar_docentes(db: Session = Depends(get_db), admin: Docente = Depends(verificar_admin)):
    docentes = db.query(Docente).all()
    return [{"id": d.id, "nombre": d.nombre, "email": d.email, "es_admin": d.es_admin} for d in docentes]

@router.post("/docentes")
def crear_docente(data: dict, db: Session = Depends(get_db), admin: Docente = Depends(verificar_admin)):
    if db.query(Docente).filter(Docente.email == data["email"]).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    nuevo_docente = Docente(
        nombre=data["nombre"],
        email=data["email"],
        password_hash=get_password_hash(data["password"]),
        es_admin=data.get("es_admin", False)
    )
    db.add(nuevo_docente)
    db.commit()
    db.refresh(nuevo_docente)
    return {"id": nuevo_docente.id, "nombre": nuevo_docente.nombre, "email": nuevo_docente.email, "es_admin": nuevo_docente.es_admin}

@router.delete("/docentes/{id}")
def borrar_docente(id: int, db: Session = Depends(get_db), admin: Docente = Depends(verificar_admin)):
    if admin.id == id:
        raise HTTPException(status_code=400, detail="No puedes borrarte a ti mismo")
    docente = db.query(Docente).filter(Docente.id == id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    db.delete(docente)
    db.commit()
    return {"status": "ok", "message": "Docente borrado"}

@router.put("/docentes/{id}/password")
def cambiar_password_docente(id: int, data: dict, db: Session = Depends(get_db), admin: Docente = Depends(verificar_admin)):
    docente = db.query(Docente).filter(Docente.id == id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    docente.password_hash = get_password_hash(data["new_password"])
    db.commit()
    return {"status": "ok", "message": "Contraseña actualizada"}
