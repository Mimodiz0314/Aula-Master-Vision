# Modelos SQLAlchemy para la base de datos
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Docente(Base):
    __tablename__ = "docentes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    es_admin = Column(Boolean, default=False)
    evaluaciones = relationship("Evaluacion", back_populates="docente")
    estudiantes = relationship("Estudiante", back_populates="docente")

class Estudiante(Base):
    __tablename__ = "estudiantes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    usuario = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    docente_id = Column(Integer, ForeignKey("docentes.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    docente = relationship("Docente", back_populates="estudiantes")
    respuestas = relationship("Respuesta", back_populates="estudiante")

class Evaluacion(Base):
    __tablename__ = "evaluaciones"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    codigo_acceso = Column(String(20), unique=True, index=True, nullable=False)
    es_anonima = Column(Boolean, default=True)
    activa = Column(Boolean, default=False)
    docente_id = Column(Integer, ForeignKey("docentes.id"))
    preguntas = Column(JSON, default=[])  # Lista de preguntas en formato JSON flexible
    created_at = Column(DateTime, default=datetime.utcnow)
    docente = relationship("Docente", back_populates="evaluaciones")
    respuestas = relationship("Respuesta", back_populates="evaluacion")

class Respuesta(Base):
    __tablename__ = "respuestas"
    id = Column(Integer, primary_key=True, index=True)
    evaluacion_id = Column(Integer, ForeignKey("evaluaciones.id"))
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=True)
    nombre_estudiante = Column(String(100), nullable=True)  # Null si es anónima
    grado = Column(String(50), nullable=True)
    datos = Column(JSON, default={})  # Respuestas en formato JSON
    analisis_ia = Column(Text, nullable=True)  # Resumen semántico generado por IA
    created_at = Column(DateTime, default=datetime.utcnow)
    evaluacion = relationship("Evaluacion", back_populates="respuestas")
    estudiante = relationship("Estudiante", back_populates="respuestas")
