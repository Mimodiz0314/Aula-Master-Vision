"""
Subagente de Análisis IA
========================
Motor de inferencia principal de AulaMaster Vision.
Usa Groq (velocidad máxima) para análisis semántico en tiempo real
y DeepSeek (razonamiento profundo) para reportes y planes de acción.
"""
import os
from groq import Groq
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ── Clientes de IA ──────────────────────────────────────────────
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# ── Utilidades ──────────────────────────────────────────────────
def _chat_groq(system: str, user: str, model: str = "llama-3.3-70b-versatile") -> str:
    """Llama a Groq con un sistema y mensaje de usuario. Ultra rápido."""
    response = groq_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.4,
        max_tokens=1024,
    )
    return response.choices[0].message.content

def _chat_deepseek(system: str, user: str) -> str:
    """Llama a DeepSeek para razonamiento profundo y reportes extensos."""
    response = deepseek_client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.5,
        max_tokens=2048,
    )
    return response.choices[0].message.content


# ── Función 1: Análisis Semántico de Respuesta Individual (Groq) ─
def analizar_respuesta_individual(pregunta: str, respuesta: str) -> dict:
    """
    Analiza una respuesta abierta de un estudiante con Groq (tiempo real).
    Retorna: sentimiento, palabras clave y un resumen breve.
    """
    system = """Eres un asistente pedagógico experto en análisis educativo.
Analiza la respuesta de un estudiante a una pregunta de evaluación.
Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "sentimiento": "positivo" | "neutro" | "negativo",
  "puntaje_comprension": 0-10,
  "palabras_clave": ["palabra1", "palabra2"],
  "resumen": "Texto breve de máximo 2 oraciones."
}"""
    user = f"PREGUNTA: {pregunta}\n\nRESPUESTA DEL ESTUDIANTE: {respuesta}"
    
    import json
    try:
        raw = _chat_groq(system, user)
        # Limpiar posibles bloques de código markdown
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(raw)
    except Exception:
        return {
            "sentimiento": "neutro",
            "puntaje_comprension": 5,
            "palabras_clave": [],
            "resumen": "No se pudo analizar la respuesta."
        }


# ── Función 2: Reporte Global de una Evaluación (DeepSeek) ──────
def generar_reporte_evaluacion(titulo: str, respuestas: list[dict]) -> str:
    """
    Genera un reporte completo con DeepSeek basado en todas las respuestas
    de una evaluación. Incluye patrones, insights y plan de acción docente.
    """
    system = """Eres un especialista en análisis educativo avanzado.
Recibirás un conjunto de respuestas de estudiantes a una evaluación.
Tu tarea es generar un reporte ejecutivo estructurado en Markdown con:
1. Resumen general de la evaluación
2. Análisis de fortalezas detectadas
3. Áreas de mejora identificadas
4. Patrones semánticos más frecuentes
5. Plan de acción concreto para el docente (3 a 5 acciones específicas)
Usa un tono profesional, claro y constructivo."""

    resumen_datos = "\n".join([
        f"- Estudiante: {r.get('nombre', 'Anónimo')} | Sentimiento: {r.get('sentimiento', 'N/A')} | Comprensión: {r.get('puntaje_comprension', 'N/A')}/10 | Resumen: {r.get('resumen', '')}"
        for r in respuestas
    ])
    user = f"EVALUACIÓN: {titulo}\n\nDATOS DE RESPUESTAS:\n{resumen_datos}"
    
    return _chat_deepseek(system, user)


# ── Función 3: Resumen Rápido del Estado de Sesión (Groq) ───────
def resumen_sesion_activa(evaluacion_titulo: str, n_conectados: int, respuestas_recibidas: int) -> str:
    """
    Genera un mensaje de estado breve para el panel del docente en tiempo real.
    """
    system = "Eres un asistente de sala de clases. Genera mensajes cortos, motivadores y profesionales."
    user = (f"La evaluación '{evaluacion_titulo}' está activa. "
            f"Hay {n_conectados} estudiantes conectados y {respuestas_recibidas} respuestas recibidas. "
            f"Genera un mensaje de estado breve (máximo 2 oraciones) para el docente.")
    return _chat_groq(system, user, model="llama-3.1-8b-instant")


# ── Función 4: Sugerencia de Preguntas para una Evaluación (Groq) 
def sugerir_preguntas(tema: str, nivel: str = "bachillerato", cantidad: int = 5) -> list[str]:
    """
    Sugiere preguntas abiertas para una evaluación usando Groq.
    Soporta hasta 20 preguntas ajustando max_tokens automáticamente.
    """
    import json
    # ~120 tokens por pregunta + overhead; sin límite máximo artificial
    tokens_necesarios = cantidad * 120 + 512

    system = """Eres un experto en diseño pedagógico y evaluaciones educativas.
Genera preguntas abiertas, reflexivas y apropiadas para evaluar comprensión.
Responde ÚNICAMENTE con un array JSON válido de strings, sin texto adicional, sin markdown:
["Pregunta 1", "Pregunta 2", ...]
Genera EXACTAMENTE la cantidad de preguntas solicitada."""
    user = f"Tema: {tema}\nNivel educativo: {nivel}\nCantidad de preguntas a generar: {cantidad}"

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.5,
            max_tokens=tokens_necesarios,
        )
        raw = response.choices[0].message.content
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        resultado = json.loads(raw)
        # Garantizar que sea una lista de strings
        if isinstance(resultado, list):
            return [str(p) for p in resultado]
        return resultado
    except Exception:
        return ["¿Qué aprendiste sobre este tema?", "¿Qué aspecto te resultó más difícil?"]
