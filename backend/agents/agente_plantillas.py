"""
Plantillas Inteligentes de Encuestas
=====================================
Plantillas prediseñadas para los 3 ejes de evaluación de procesos.
La IA puede sugerir preguntas adicionales según el contexto.
"""

PLANTILLAS = {
    "evaluacion_docente": {
        "nombre": "Evaluación de Desempeño Docente",
        "icono": "🎓",
        "descripcion": "Evalúa el desempeño de un docente en clase, período o año.",
        "filtros": ["Por clase", "Por período", "Por año académico"],
        "preguntas": [
            {"id": 1, "texto": "¿El docente explica los temas con claridad y comprensión?", "tipo": "escala"},
            {"id": 2, "texto": "¿El docente muestra dominio y actualización de los contenidos de su área?", "tipo": "escala"},
            {"id": 3, "texto": "¿El docente genera un ambiente de respeto y participación activa en el aula?", "tipo": "escala"},
            {"id": 4, "texto": "¿El docente brinda retroalimentación oportuna y constructiva sobre tu desempeño?", "tipo": "escala"},
            {"id": 5, "texto": "¿El docente utiliza estrategias y recursos variados para facilitar el aprendizaje?", "tipo": "escala"},
            {"id": 6, "texto": "¿El docente es puntual, organizado y cumple con el programa establecido?", "tipo": "escala"},
            {"id": 7, "texto": "¿Qué aspectos del docente consideras que son sus principales fortalezas?", "tipo": "abierta"},
            {"id": 8, "texto": "¿Qué sugerencias le darías al docente para mejorar su práctica pedagógica?", "tipo": "abierta"},
        ]
    },
    "proceso_institucional": {
        "nombre": "Evaluación de Proceso Institucional",
        "icono": "🏛️",
        "descripcion": "Evalúa la calidad de un área, servicio o proceso dentro de la institución.",
        "filtros": ["Área administrativa", "Área académica", "Servicios estudiantiles", "Infraestructura"],
        "preguntas": [
            {"id": 1, "texto": "¿El servicio o proceso evaluado cumple con sus objetivos de manera eficiente?", "tipo": "escala"},
            {"id": 2, "texto": "¿El personal del área demuestra amabilidad, respeto y disposición para ayudar?", "tipo": "escala"},
            {"id": 3, "texto": "¿Los tiempos de respuesta o atención del proceso son adecuados?", "tipo": "escala"},
            {"id": 4, "texto": "¿La información y comunicación del área es clara, oportuna y accesible?", "tipo": "escala"},
            {"id": 5, "texto": "¿Los recursos e instalaciones disponibles son suficientes y están en buen estado?", "tipo": "escala"},
            {"id": 6, "texto": "En términos generales, ¿qué tan satisfecho estás con este proceso o servicio?", "tipo": "escala"},
            {"id": 7, "texto": "¿Qué aspectos del proceso o área consideras que funcionan bien?", "tipo": "abierta"},
            {"id": 8, "texto": "¿Qué cambios o mejoras sugerirías para este proceso o área?", "tipo": "abierta"},
        ]
    },
    "conferencia_taller": {
        "nombre": "Evaluación de Conferencia / Taller",
        "icono": "🎤",
        "descripcion": "Evalúa la calidad de un evento, expositor, taller o jornada de capacitación.",
        "filtros": ["Conferencia", "Taller", "Jornada", "Capacitación", "Seminario"],
        "preguntas": [
            {"id": 1, "texto": "¿Los objetivos del evento fueron claros y se cumplieron satisfactoriamente?", "tipo": "escala"},
            {"id": 2, "texto": "¿El expositor/facilitador domina el tema y lo comunica con claridad?", "tipo": "escala"},
            {"id": 3, "texto": "¿El contenido presentado fue relevante, actualizado y aplicable a tu contexto?", "tipo": "escala"},
            {"id": 4, "texto": "¿La metodología y dinámica del evento fueron participativas y apropiadas?", "tipo": "escala"},
            {"id": 5, "texto": "¿El tiempo asignado al evento fue adecuado para los temas abordados?", "tipo": "escala"},
            {"id": 6, "texto": "¿Los materiales, recursos y logística del evento fueron adecuados?", "tipo": "escala"},
            {"id": 7, "texto": "En general, ¿cuál es tu nivel de satisfacción con este evento?", "tipo": "escala"},
            {"id": 8, "texto": "¿Qué fue lo más valioso o destacado del evento para ti?", "tipo": "abierta"},
            {"id": 9, "texto": "¿Qué mejorarías en la organización o contenido de futuros eventos similares?", "tipo": "abierta"},
        ]
    },
    "encuesta_rapida": {
        "nombre": "Encuesta Rápida de Percepción",
        "icono": "⚡",
        "descripcion": "Captura percepciones inmediatas al finalizar una actividad (menos de 2 minutos).",
        "filtros": ["Post-clase", "Post-reunión", "Post-evento"],
        "preguntas": [
            {"id": 1, "texto": "¿Cómo calificarías esta experiencia en general?", "tipo": "escala"},
            {"id": 2, "texto": "¿Qué fue lo que más te gustó o resultó útil?", "tipo": "abierta"},
            {"id": 3, "texto": "¿Qué mejorarías?", "tipo": "abierta"},
        ]
    },
    "personalizada": {
        "nombre": "Encuesta Personalizada",
        "icono": "✏️",
        "descripcion": "Construye tu propia encuesta desde cero o con sugerencias de IA.",
        "filtros": [],
        "preguntas": []
    }
}

def obtener_plantillas():
    """Devuelve el listado de plantillas disponibles."""
    return [
        {
            "id": key,
            "nombre": val["nombre"],
            "icono": val["icono"],
            "descripcion": val["descripcion"],
            "filtros": val["filtros"],
            "total_preguntas": len(val["preguntas"])
        }
        for key, val in PLANTILLAS.items()
    ]

def obtener_plantilla(plantilla_id: str):
    """Devuelve la plantilla completa con sus preguntas."""
    return PLANTILLAS.get(plantilla_id)
