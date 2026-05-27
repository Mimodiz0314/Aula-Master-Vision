import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Soporte para base de datos en la nube (PostgreSQL) o local (SQLite)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./evaluaciones.db")

# SQLAlchemy 1.4+ requiere 'postgresql://' en lugar de 'postgres://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Para SQLite, se requiere check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia para obtener la DB en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
