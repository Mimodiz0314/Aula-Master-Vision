@echo off
title 🚀 AulaMaster - Subir Actualizaciones
color 0A
cls

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     🚀  AULAMASTER VISION - DEPLOY           ║
echo  ║         Subiendo actualizaciones...           ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ─── PASO 1: Construir el Frontend ───────────────────────────
echo  [1/3] Construyendo el Frontend...
echo  ─────────────────────────────────────────────────
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  ❌ ERROR: Fallo al construir el frontend.
    echo     Revisa los mensajes de error de arriba.
    echo.
    pause
    exit /b 1
)
echo  ✅ Frontend construido correctamente.
echo.

:: ─── PASO 2: Preparar los archivos para subir ────────────────
cd /d "%~dp0"
echo  [2/3] Preparando archivos para subir a GitHub...
echo  ─────────────────────────────────────────────────
git add -A
set FECHA=%date:~6,4%-%date:~3,2%-%date:~0,2% %time:~0,8%
git commit -m "🚀 Actualización desplegada el %FECHA%"
if %errorlevel% neq 0 (
    echo.
    echo  ℹ️  No hay cambios nuevos que subir.
    echo     Todo está actualizado.
    echo.
    pause
    exit /b 0
)
echo  ✅ Cambios listos para subir.
echo.

:: ─── PASO 3: Subir a GitHub → Render lo despliega solo ───────
echo  [3/3] Subiendo a GitHub (Render actualizara solo)...
echo  ─────────────────────────────────────────────────
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo  ❌ ERROR: No se pudo subir a GitHub.
    echo     Revisa tu conexion a internet.
    echo.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║  ✅  ¡ACTUALIZACION COMPLETADA CON EXITO!   ║
echo  ║                                              ║
echo  ║  Render detectara el cambio en segundos      ║
echo  ║  y actualizara tu plataforma en la nube.     ║
echo  ║                                              ║
echo  ║  🌐 https://aulamaster-frontend.onrender.com ║
echo  ╚══════════════════════════════════════════════╝
echo.

timeout /t 5
