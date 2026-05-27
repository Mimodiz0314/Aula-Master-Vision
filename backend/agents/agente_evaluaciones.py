"""
Subagente de Evaluaciones
=========================
Gestiona el ciclo de vida completo de evaluaciones y encuestas:
- Crear, leer, actualizar y eliminar formularios
- Generar y validar códigos de acceso únicos
- Controlar el estado activo/inactivo de sesiones
- Integra con el Agente de IA para análisis automático
"""
import random
import string
from sqlalchemy.orm import Session
from models.db_models import Evaluacion, Respuesta, Docente
from agents.agente_analisis_ia import analizar_respuesta_individual, generar_reporte_evaluacion


def _generar_codigo(longitud: int = 8) -> str:
    """Genera un código de acceso único alfanumérico en mayúsculas."""
    chars = string.ascii_uppercase + string.digits
    return "AULA-" + "".join(random.choices(chars, k=longitud))


def crear_evaluacion(db: Session, titulo: str, descripcion: str, es_anonima: bool, preguntas: list, docente_id: int) -> Evaluacion:
    """Crea una nueva evaluación en la base de datos con código único."""
    codigo = _generar_codigo()
    # Garantizar unicidad del código
    while db.query(Evaluacion).filter(Evaluacion.codigo_acceso == codigo).first():
        codigo = _generar_codigo()

    evaluacion = Evaluacion(
        titulo=titulo,
        descripcion=descripcion,
        es_anonima=es_anonima,
        preguntas=preguntas,
        docente_id=docente_id,
        codigo_acceso=codigo,
        activa=True,
    )
    db.add(evaluacion)
    db.commit()
    db.refresh(evaluacion)
    return evaluacion


def activar_evaluacion(db: Session, evaluacion_id: int) -> Evaluacion:
    """Activa una evaluación para que los estudiantes puedan acceder."""
    ev = db.query(Evaluacion).filter(Evaluacion.id == evaluacion_id).first()
    if ev:
        ev.activa = True
        db.commit()
        db.refresh(ev)
    return ev


def desactivar_evaluacion(db: Session, evaluacion_id: int) -> Evaluacion:
    """Desactiva una evaluación, cerrando la sesión."""
    ev = db.query(Evaluacion).filter(Evaluacion.id == evaluacion_id).first()
    if ev:
        ev.activa = False
        db.commit()
        db.refresh(ev)
    return ev


def obtener_evaluacion_por_codigo(db: Session, codigo: str):
    """Busca una evaluación por su código de acceso (usado por estudiantes)."""
    return db.query(Evaluacion).filter(
        Evaluacion.codigo_acceso == codigo.upper(),
        Evaluacion.activa == True
    ).first()


def listar_evaluaciones_docente(db: Session, docente_id: int):
    """Lista todas las evaluaciones de un docente."""
    return db.query(Evaluacion).filter(Evaluacion.docente_id == docente_id).all()


def guardar_respuesta_con_analisis_ia(
    db: Session,
    evaluacion_id: int,
    datos_respuestas: dict,
    nombre_estudiante: str = None,
    grado: str = None
) -> Respuesta:
    """
    Guarda la respuesta de un estudiante y activa el análisis semántico
    con Groq para cada respuesta abierta detectada.
    """
    ev = db.query(Evaluacion).filter(Evaluacion.id == evaluacion_id).first()
    if not ev:
        return None

    # Si es anónima, descartar nombre y grado por seguridad
    if ev.es_anonima:
        nombre_estudiante = None
        grado = None

    # Análisis IA de respuestas abiertas con Groq
    analisis_parciales = []
    for pregunta in ev.preguntas:
        pregunta_texto = pregunta.get("texto", "")
        tipo = pregunta.get("tipo", "texto")
        respuesta_valor = datos_respuestas.get(str(pregunta.get("id", "")), "")
        
        if tipo == "abierta" and respuesta_valor:
            analisis = analizar_respuesta_individual(pregunta_texto, str(respuesta_valor))
            analisis_parciales.append({
                "pregunta": pregunta_texto,
                **analisis
            })

    import json
    resumen_ia = json.dumps(analisis_parciales, ensure_ascii=False) if analisis_parciales else None

    respuesta = Respuesta(
        evaluacion_id=evaluacion_id,
        nombre_estudiante=nombre_estudiante,
        grado=grado,
        datos=datos_respuestas,
        analisis_ia=resumen_ia,
    )
    db.add(respuesta)
    db.commit()
    db.refresh(respuesta)
    return respuesta


def generar_reporte_completo(db: Session, evaluacion_id: int) -> str:
    """
    Genera el reporte completo de una evaluación usando DeepSeek.
    Consolida todos los análisis individuales en un reporte ejecutivo.
    """
    ev = db.query(Evaluacion).filter(Evaluacion.id == evaluacion_id).first()
    if not ev:
        return "Evaluación no encontrada."

    respuestas = db.query(Respuesta).filter(Respuesta.evaluacion_id == evaluacion_id).all()
    if not respuestas:
        return "Sin respuestas para generar reporte."

    import json
    datos_para_ia = []
    for r in respuestas:
        analisis = {}
        if r.analisis_ia:
            try:
                analisis_lista = json.loads(r.analisis_ia)
                if analisis_lista:
                    analisis = analisis_lista[0]
            except (json.JSONDecodeError, Exception):
                pass
        datos_para_ia.append({
            "nombre": r.nombre_estudiante or "Anónimo",
            "sentimiento": analisis.get("sentimiento", "N/A"),
            "puntaje_comprension": analisis.get("puntaje_comprension", "N/A"),
            "resumen": analisis.get("resumen", "")
        })

    return generar_reporte_evaluacion(ev.titulo, datos_para_ia)
