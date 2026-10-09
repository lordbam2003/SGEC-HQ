@echo off
chcp 65001 >nul
title SISTEMA DE COSTEO HOSPITALARIO Y TARIFARIO
color 0A

echo ===============================================================================
echo       SISTEMA DE COSTEO DE PROCEDIMIENTOS MEDICOS Y SANITARIOS (CPMS)
echo                       HOSPITAL GENERAL / RED DE SALUD
echo ===============================================================================
echo.

:: 1. Verificar si existe el entorno virtual 'venv', si no existe, crearlo
if not exist "venv\Scripts\python.exe" (
    echo [1/3] Creando entorno virtual de Python (venv)...
    python -m venv venv
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] No se pudo crear el entorno virtual. Verifica tu instalacion de Python.
        pause
        exit /b 1
    )
    echo Instalando dependencias necesarias desde requirements.txt...
    venv\Scripts\pip install -r requirements.txt
)

echo [1/3] Entorno virtual Python (venv) detectado y listo.

:: 2. Iniciar navegador web automáticamente tras 2 segundos
echo [2/3] Preparando apertura del navegador en http://localhost:8050 ...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8050"

:: 3. Iniciar el servidor FastAPI con Uvicorn usando el entorno virtual
echo [3/3] Iniciando servidor de aplicacion en http://0.0.0.0:8050 ...
echo.
echo Presiona Ctrl+C en esta consola para detener el servidor cuando termines.
echo ===============================================================================
echo.

venv\Scripts\python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8050 --reload

pause
