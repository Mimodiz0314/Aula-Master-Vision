"""
Subagente de Experiencia Estudiantil
======================================
Analiza la participación, tiempos de respuesta y genera insights de sesión.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.db_models import Evaluacion, Respuesta
from datetime import datetime, timedelta


def obtener_tasa_participacion(db: Session, evaluacion_id: int) -> dict:
    """Calcula la tasa de respuestas y distribución temporal."""
    respuestas = db.query(Respuesta).filter(Respuesta.evaluacion_id == evaluacion_id).all()
    total = len(respuestas)

    if total == 0:
        return {"total_respuestas": 0, "distribucion_por_hora": {}}

    distribucion = {}
    for r in respuestas:
        if r.created_at:
            hora = r.created_at.strftime("%H:00")
            distribucion[hora] = distribucion.get(hora, 0) + 1

    return {
        "total_respuestas": total,
        "distribucion_por_hora": distribucion,
        "primera_respuesta": respuestas[0].created_at.isoformat() if respuestas[0].created_at else None,
        "ultima_respuesta": respuestas[-1].created_at.isoformat() if respuestas[-1].created_at else None,
    }


def calcular_promedio_escala(db: Session, evaluacion_id: int) -> list:
    """Calcula el promedio de respuestas para preguntas de escala."""
    ev = db.query(Evaluacion).filter(Evaluacion.id == evaluacion_id).first()
    if not ev:
        return []

    respuestas = db.query(Respuesta).filter(Respuesta.evaluacion_id == evaluacion_id).all()
    preguntas_escala = [p for p in (ev.preguntas or []) if p.get("tipo") == "escala"]

    resultados = []
    for p in preguntas_escala:
        valores = []
        for r in respuestas:
            val = (r.datos or {}).get(str(p["id"]))
            if val:
                try:
                    valores.append(int(val))
                except ValueError:
                    pass

        if valores:
            promedio = sum(valores) / len(valores)
            resultados.append({
                "pregunta_id": p["id"],
                "texto": p["texto"],
                "promedio": round(promedio, 2),
                "total_respuestas": len(valores),
                "distribucion": {str(i): valores.count(i) for i in range(1, 11) if valores.count(i) > 0}
            })

    return resultados
