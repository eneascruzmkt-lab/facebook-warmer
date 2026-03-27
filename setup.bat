@echo off
title FB Warmer - Instalacao Automatica
color 0B

echo.
echo  ========================================
echo   FB Warmer - Instalacao Automatica
echo  ========================================
echo.

:: Verificar se Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js nao encontrado.
    echo  Baixe em: https://nodejs.org
    echo  Instale e rode este script novamente.
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js encontrado:
node -v

:: Verificar se Git esta instalado
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo  [AVISO] Git nao encontrado. Pulando clone.
    echo  Se voce ja tem a pasta do projeto, tudo bem.
    echo.
) else (
    echo  [OK] Git encontrado
    echo.

    :: Clonar se a pasta nao existe
    if not exist "facebook-warmer" (
        echo  Baixando projeto do GitHub...
        git clone https://github.com/eneascruzmkt-lab/facebook-warmer.git
        echo  [OK] Projeto baixado
    ) else (
        echo  [OK] Pasta facebook-warmer ja existe
    )
)

:: Entrar na pasta
cd facebook-warmer

:: Instalar dependencias
echo.
echo  Instalando dependencias...
call npm install
echo  [OK] Dependencias instaladas

:: Criar pastas necessarias
if not exist "reports\errors" mkdir reports\errors

:: Criar profiles.json se nao existe
if not exist "profiles.json" (
    echo {} > profiles.json
    echo  [OK] profiles.json criado
)

echo.
echo  ========================================
echo   Instalacao concluida!
echo  ========================================
echo.
echo  Para iniciar o painel:
echo    cd facebook-warmer
echo    node server.js
echo.
echo  Depois abra no navegador:
echo    http://localhost:3000
echo.
echo  Lembre-se: o AdsPower precisa estar aberto.
echo.
pause
