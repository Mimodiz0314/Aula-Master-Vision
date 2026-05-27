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
    return {"token": token, "docente_id": docente.id, "nombre": docente.nombre, "es_admin": getattr(docente, 'es_admin', False)}


@router.post("/login")
def login_docente(body: LoginSchema, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.email == body.email).first()
    if not docente or not verify_password(body.password, docente.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")
    token = create_access_token({"sub": str(docente.id), "nombre": docente.nombre})
    return {"token": token, "docente_id": docente.id, "nombre": docente.nombre, "es_admin": getattr(docente, 'es_admin', False)}


from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from agents.agente_seguridad import SECRET_KEY, ALGORITHM
from models.db_models import Estudiante

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def obtener_docente_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=401, detail="No se pudo validar credenciales")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        docente_id: str = payload.get("sub")
        if docente_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if docente is None:
        raise credentials_exception
    return docente

class LoginEstudianteSchema(BaseModel):
    usuario: str
    password: str

@router.post("/login/estudiante")
def login_estudiante(body: LoginEstudianteSchema, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.usuario == body.usuario).first()
    if not estudiante or not verify_password(body.password, estudiante.password_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")
    token = create_access_token({"sub": str(estudiante.id), "nombre": estudiante.nombre, "role": "estudiante"})
    return {"token": token, "estudiante_id": estudiante.id, "nombre": estudiante.nombre}

@router.get("/me")
def get_me_by_id(docente_id: int, db: Session = Depends(get_db)):
    """Simple verificación sin middleware completo (frontend pasa docente_id por query)."""
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado.")
    # Expose es_admin dynamically
    return {"docente_id": docente.id, "nombre": docente.nombre, "email": docente.email, "es_admin": getattr(docente, 'es_admin', False)}
