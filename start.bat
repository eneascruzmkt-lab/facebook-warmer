@echo off
title FB Warmer
color 0B
cd /d "%~dp0"

echo.
echo  Iniciando FB Warmer...
echo  Abra no navegador: http://localhost:3000
echo  Para parar: feche esta janela ou pressione Ctrl+C
echo.

node server.js
pause
