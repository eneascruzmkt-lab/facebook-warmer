@echo off
title FB Warmer
color 0B
cd /d "%~dp0"

:: Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  Node.js nao encontrado.
    echo  Rode o setup.bat primeiro.
    echo.
    pause
    exit /b 1
)

echo.
echo  Iniciando FB Warmer...
echo  Para parar: feche esta janela ou pressione Ctrl+C
echo.

:: Abrir navegador apos 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

node server.js
pause
