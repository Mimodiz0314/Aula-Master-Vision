"""
Router de Evaluaciones y Análisis IA
=====================================
Endpoints REST para crear/gestionar evaluaciones y activar análisis IA.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Set
from database import get_db
from agents.agente_plantillas import obtener_plantillas, obtener_plantilla
from agents.agente_evaluaciones import (
    crear_evaluacion,
    activar_evaluacion,
    desactivar_evaluacion,
    obtener_evaluacion_por_codigo,
    listar_evaluaciones_docente,
    guardar_respuesta_con_analisis_ia,
    generar_reporte_completo,
)
from agents.agente_analisis_ia import sugerir_preguntas
from agents.agente_encuestas import (
    obtener_stats_docente, editar_evaluacion, clonar_evaluacion,
    eliminar_evaluacion, listar_respuestas_evaluacion, exportar_excel
)
from agents.agente_experiencia import calcular_promedio_escala, obtener_tasa_participacion
import asyncio, json


# ── WebSocket: Manager de conexiones en tiempo real ────────────────
class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, evaluacion_id: int):
        await ws.accept()
        if evaluacion_id not in self.active:
            self.active[evaluacion_id] = set()
        self.active[evaluacion_id].add(ws)

    def disconnect(self, ws: WebSocket, evaluacion_id: int):
        if evaluacion_id in self.active:
            self.active[evaluacion_id].discard(ws)

    async def broadcast_count(self, evaluacion_id: int):
        count = len(self.active.get(evaluacion_id, set()))
        dead = set()
        for ws in list(self.active.get(evaluacion_id, set())):
            try:
                await ws.send_json({"conectados": count})
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active[evaluacion_id].discard(ws)

manager = ConnectionManager()

router = APIRouter(prefix="/api", tags=["Evaluaciones y IA"])


# ── Schemas Pydantic ───────────────────────────────────────────
class PreguntaSchema(BaseModel):
    id: int
    texto: str
    tipo: str  # "abierta", "opcion_multiple", "escala"
    opciones: Optional[List[str]] = None

class CrearEvaluacionSchema(BaseModel):
    titulo: str
    descripcion: Optional[str] = ""
    es_anonima: bool = True
    preguntas: List[dict] = []
    docente_id: int = 1  # En producción, viene del token JWT

class RespuestaEstudianteSchema(BaseModel):
    codigo_acceso: str
    datos_respuestas: dict
    nombre_estudiante: Optional[str] = None
    grado: Optional[str] = None

class SugerirPreguntasSchema(BaseModel):
    tema: str
    nivel: str = "bachillerato"
    cantidad: int = 5


# ── Endpoints: Docente ─────────────────────────────────────────
@router.post("/evaluaciones/crear")
def endpoint_crear_evaluacion(body: CrearEvaluacionSchema, db: Session = Depends(get_db)):
    ev = crear_evaluacion(
        db=db,
        titulo=body.titulo,
        descripcion=body.descripcion,
        es_anonima=body.es_anonima,
        preguntas=body.preguntas,
        docente_id=body.docente_id,
    )
    return {
        "id": ev.id,
        "titulo": ev.titulo,
        "codigo_acceso": ev.codigo_acceso,
        "es_anonima": ev.es_anonima,
        "activa": ev.activa,
        "mensaje": f"✅ Evaluación creada. Comparte el código: {ev.codigo_acceso}"
    }

@router.put("/evaluaciones/{evaluacion_id}/activar")
def endpoint_activar(evaluacion_id: int, db: Session = Depends(get_db)):
    ev = activar_evaluacion(db, evaluacion_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return {"mensaje": "🟢 Evaluación activada. Los estudiantes ya pueden ingresar.", "codigo": ev.codigo_acceso}

@router.put("/evaluaciones/{evaluacion_id}/desactivar")
def endpoint_desactivar(evaluacion_id: int, db: Session = Depends(get_db)):
    ev = desactivar_evaluacion(db, evaluacion_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return {"mensaje": "🔴 Evaluación cerrada."}

@router.get("/evaluaciones/docente/{docente_id}")
def endpoint_listar(docente_id: int, db: Session = Depends(get_db)):
    evals = listar_evaluaciones_docente(db, docente_id)
    return [
        {"id": e.id, "titulo": e.titulo, "codigo_acceso": e.codigo_acceso,
         "activa": e.activa, "es_anonima": e.es_anonima}
        for e in evals
    ]

@router.get("/evaluaciones/{evaluacion_id}/reporte")
def endpoint_reporte(evaluacion_id: int, db: Session = Depends(get_db)):
    """Genera un reporte ejecutivo profundo con DeepSeek."""
    reporte = generar_reporte_completo(db, evaluacion_id)
    return {"reporte_markdown": reporte}


# ── Endpoints: Estudiante ──────────────────────────────────────
@router.get("/sesion/{codigo}")
def endpoint_verificar_codigo(codigo: str, db: Session = Depends(get_db)):
    """El estudiante verifica si el código es válido y la sesión está activa."""
    ev = obtener_evaluacion_por_codigo(db, codigo)
    if not ev:
        raise HTTPException(status_code=404, detail="Código inválido o sesión no activa.")
    return {
        "evaluacion_id": ev.id,
        "titulo": ev.titulo,
        "es_anonima": ev.es_anonima,
        "preguntas": ev.preguntas,
    }

@router.post("/sesion/responder")
def endpoint_responder(body: RespuestaEstudianteSchema, db: Session = Depends(get_db)):
    """El estudiante envía sus respuestas. Groq analiza automáticamente."""
    ev = obtener_evaluacion_por_codigo(db, body.codigo_acceso)
    if not ev:
        raise HTTPException(status_code=404, detail="Código inválido o sesión no activa.")
    
    respuesta = guardar_respuesta_con_analisis_ia(
        db=db,
        evaluacion_id=ev.id,
        datos_respuestas=body.datos_respuestas,
        nombre_estudiante=body.nombre_estudiante,
        grado=body.grado,
    )
    return {"mensaje": "✅ Respuestas enviadas y analizadas por IA correctamente.", "id": respuesta.id}


# ── Endpoints: Plantillas ─────────────────────────────────────
@router.get("/plantillas")
def endpoint_listar_plantillas():
    """Lista todas las plantillas disponibles con metadata."""
    return obtener_plantillas()

@router.get("/plantillas/{plantilla_id}")
def endpoint_obtener_plantilla(plantilla_id: str):
    """Devuelve la plantilla completa con sus preguntas listas para usar."""
    plantilla = obtener_plantilla(plantilla_id)
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada.")
    return plantilla


# ── Endpoints: IA Auxiliar ─────────────────────────────────────
@router.post("/ia/sugerir-preguntas")
def endpoint_sugerir_preguntas(body: SugerirPreguntasSchema):
    """Groq sugiere preguntas pedagógicas para un tema dado."""
    preguntas = sugerir_preguntas(body.tema, body.nivel, body.cantidad)
    return {"preguntas_sugeridas": preguntas}


# ── Stats del Docente ─────────────────────────────────────────
@router.get("/docente/{docente_id}/stats")
def endpoint_stats_docente(docente_id: int, db: Session = Depends(get_db)):
    return obtener_stats_docente(db, docente_id)


# ── Editar Evaluación ─────────────────────────────────────────
class EditarEvaluacionSchema(BaseModel):
    titulo: str
    descripcion: Optional[str] = ""
    es_anonima: bool = True
    preguntas: List[dict] = []

@router.put("/evaluaciones/{evaluacion_id}")
def endpoint_editar(evaluacion_id: int, body: EditarEvaluacionSchema, db: Session = Depends(get_db)):
    ev = editar_evaluacion(db, evaluacion_id, body.titulo, body.descripcion, body.es_anonima, body.preguntas)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return {"mensaje": "✅ Evaluación actualizada.", "id": ev.id}


# ── Clonar Evaluación ─────────────────────────────────────────
class ClonarSchema(BaseModel):
    docente_id: int = 1

@router.post("/evaluaciones/{evaluacion_id}/clonar")
def endpoint_clonar(evaluacion_id: int, body: ClonarSchema, db: Session = Depends(get_db)):
    nueva = clonar_evaluacion(db, evaluacion_id, body.docente_id)
    if not nueva:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return {"mensaje": "✅ Evaluación clonada.", "id": nueva.id, "codigo_acceso": nueva.codigo_acceso, "titulo": nueva.titulo}


# ── Eliminar Evaluación ───────────────────────────────────────
@router.delete("/evaluaciones/{evaluacion_id}")
def endpoint_eliminar(evaluacion_id: int, db: Session = Depends(get_db)):
    ok = eliminar_evaluacion(db, evaluacion_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return {"mensaje": "🗑️ Evaluación eliminada."}


# ── Respuestas detalladas ─────────────────────────────────────
@router.get("/evaluaciones/{evaluacion_id}/respuestas")
def endpoint_respuestas(evaluacion_id: int, db: Session = Depends(get_db)):
    return listar_respuestas_evaluacion(db, evaluacion_id)


# ── Promedios por escala ──────────────────────────────────────
@router.get("/evaluaciones/{evaluacion_id}/promedios")
def endpoint_promedios(evaluacion_id: int, db: Session = Depends(get_db)):
    return calcular_promedio_escala(db, evaluacion_id)


# ── Tasa de participación ─────────────────────────────────────
@router.get("/evaluaciones/{evaluacion_id}/participacion")
def endpoint_participacion(evaluacion_id: int, db: Session = Depends(get_db)):
    return obtener_tasa_participacion(db, evaluacion_id)


# ── Export Excel ─────────────────────────────────────────────
@router.get("/evaluaciones/{evaluacion_id}/export/excel")
def endpoint_export_excel(evaluacion_id: int, db: Session = Depends(get_db)):
    """Descarga el reporte completo en Excel (.xlsx) con 3 hojas diseñadas."""
    contenido = exportar_excel(db, evaluacion_id)
    if not contenido:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada.")
    return StreamingResponse(
        iter([contenido]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=AulaMaster_Evaluacion_{evaluacion_id}.xlsx"}
    )


# ── WebSocket: Tiempo Real ────────────────────────────────────
@router.websocket("/ws/sesion/{evaluacion_id}")
async def websocket_sesion(websocket: WebSocket, evaluacion_id: int):
    await manager.connect(websocket, evaluacion_id)
    await manager.broadcast_count(evaluacion_id)
    try:
        while True:
            await asyncio.sleep(5)
            await manager.broadcast_count(evaluacion_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, evaluacion_id)
        await manager.broadcast_count(evaluacion_id)
