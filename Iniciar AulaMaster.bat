@echo off
echo ===================================================
echo   Iniciando Servidores de AulaMaster Vision
echo ===================================================

:: Iniciar el Backend (FastAPI) en una nueva ventana
echo Iniciando Backend (Agente Orquestador)...
start "AulaMaster Vision - Backend" cmd /c "cd backend && .\venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Esperar un par de segundos para que el backend empiece
timeout /t 3 /nobreak >nul

:: Iniciar el Frontend (Vite/React) en otra ventana
echo Iniciando Frontend (Interfaz Premium)...
start "AulaMaster Vision - Frontend" cmd /c "cd frontend && npm run dev"

:: Esperar un par de segundos para que el frontend empiece
timeout /t 4 /nobreak >nul

:: Abrir el navegador por defecto
echo Abriendo la aplicacion en el navegador...
start http://localhost:5173

echo.
echo Los servidores estan en ejecucion en ventanas separadas.
echo Cierra esas ventanas para detener la aplicacion.
echo.
pause
