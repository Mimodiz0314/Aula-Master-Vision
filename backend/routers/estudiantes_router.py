from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Docente, Estudiante
from routers.auth_router import obtener_docente_actual
from agents.agente_seguridad import hash_password as get_password_hash

router = APIRouter(prefix="/api/estudiantes", tags=["Estudiantes"])

@router.get("/")
def listar_estudiantes(db: Session = Depends(get_db), docente: Docente = Depends(obtener_docente_actual)):
    estudiantes = db.query(Estudiante).filter(Estudiante.docente_id == docente.id).all()
    return [{"id": e.id, "nombre": e.nombre, "usuario": e.usuario} for e in estudiantes]

@router.post("/")
def crear_estudiante(data: dict, db: Session = Depends(get_db), docente: Docente = Depends(obtener_docente_actual)):
    if db.query(Estudiante).filter(Estudiante.usuario == data["usuario"]).first():
        raise HTTPException(status_code=400, detail="El usuario ya está en uso por otro estudiante")
    nuevo_estudiante = Estudiante(
        nombre=data["nombre"],
        usuario=data["usuario"],
        password_hash=get_password_hash(data["password"]),
        docente_id=docente.id
    )
    db.add(nuevo_estudiante)
    db.commit()
    db.refresh(nuevo_estudiante)
    return {"id": nuevo_estudiante.id, "nombre": nuevo_estudiante.nombre, "usuario": nuevo_estudiante.usuario}

@router.delete("/{id}")
def borrar_estudiante(id: int, db: Session = Depends(get_db), docente: Docente = Depends(obtener_docente_actual)):
    estudiante = db.query(Estudiante).filter(Estudiante.id == id, Estudiante.docente_id == docente.id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado o no te pertenece")
    db.delete(estudiante)
    db.commit()
    return {"status": "ok", "message": "Estudiante borrado"}

@router.put("/{id}/password")
def cambiar_password_estudiante(id: int, data: dict, db: Session = Depends(get_db), docente: Docente = Depends(obtener_docente_actual)):
    estudiante = db.query(Estudiante).filter(Estudiante.id == id, Estudiante.docente_id == docente.id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado o no te pertenece")
    estudiante.password_hash = get_password_hash(data["new_password"])
    db.commit()
    return {"status": "ok", "message": "Contraseña actualizada"}
