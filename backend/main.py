"""
AulaMaster Vision - Agente Orquestador Principal
================================================
Punto de entrada del backend. Coordina todos los subagentes,
inicializa la base de datos y expone la API REST.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import db_models  # Registrar todos los modelos
from routers.evaluaciones_router import router as evaluaciones_router
from routers.auth_router import router as auth_router

from sqlalchemy import text
from routers.admin_router import router as admin_router
from routers.estudiantes_router import router as estudiantes_router

# ── Inicializar tablas en SQLite / PostgreSQL ────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Migraciones automáticas sin Alembic (Añadir columnas faltantes) ──────────
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE docentes ADD COLUMN es_admin BOOLEAN DEFAULT FALSE;"))
        conn.commit()
except Exception:
    pass # Ya existe o no soportado

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE respuestas ADD COLUMN estudiante_id INTEGER REFERENCES estudiantes(id);"))
        conn.commit()
except Exception:
    pass

# Dar permisos de SuperAdmin a miltonmoralesdiaz@gmail.com
try:
    with engine.connect() as conn:
        conn.execute(text("UPDATE docentes SET es_admin = TRUE WHERE email = 'miltonmoralesdiaz@gmail.com';"))
        conn.commit()
except Exception:
    pass

# ── Aplicación FastAPI (Orquestador) ───────────────────────────
app = FastAPI(
    title="AulaMaster Vision - Orquestador",
    description="""
    ## Plataforma de Evaluación Educativa con IA
    
    **Subagentes activos:**
    - 🧠 Agente de Análisis IA (Groq + DeepSeek)
    - 📋 Agente de Evaluaciones (CRUD + Códigos de acceso)
    - 🔐 Agente de Seguridad (Anonimato garantizado)
    
    **APIs de IA integradas:**
    - **Groq** → Análisis semántico en tiempo real (llama-3.3-70b)
    - **DeepSeek** → Reportes profundos y planes de acción pedagógicos
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS: Permitir conexión desde el frontend ──────────────────
# Permitir localhost y la URL del frontend desplegado
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://aulamaster-frontend.onrender.com",
    "https://adorable-liger-d3746a.netlify.app",
    frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Registrar routers (Subagentes HTTP) ────────────────────────
app.include_router(evaluaciones_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(estudiantes_router)

# ── Endpoints raíz ─────────────────────────────────────────────
@app.get("/", tags=["Estado"])
def root():
    return {
        "plataforma": "AulaMaster Vision",
        "version": "1.0.0",
        "estado": "🟢 Orquestador activo",
        "subagentes": {
            "analisis_ia": "activo (Groq + DeepSeek)",
            "evaluaciones": "activo",
            "seguridad": "activo (anonimato garantizado)",
        },
        "docs": "Visita /docs para la interfaz interactiva de la API"
    }

@app.get("/health", tags=["Estado"])
def health():
    db_type = "PostgreSQL" if "postgres" in str(engine.url) else "SQLite"
    return {"status": "ok", "base_de_datos": f"{db_type} conectada"}
