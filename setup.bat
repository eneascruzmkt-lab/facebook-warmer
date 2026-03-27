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
    echo  Node.js nao encontrado. Instalando automaticamente...
    echo.

    :: Baixar Node.js via PowerShell
    echo  Baixando Node.js...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi' -OutFile '%TEMP%\node-install.msi'"

    if not exist "%TEMP%\node-install.msi" (
        echo  [ERRO] Falha ao baixar Node.js.
        echo  Baixe manualmente em: https://nodejs.org
        pause
        exit /b 1
    )

    echo  Instalando Node.js (pode pedir permissao de administrador)...
    msiexec /i "%TEMP%\node-install.msi" /qn

    :: Atualizar PATH na sessao atual
    set "PATH=%ProgramFiles%\nodejs;%PATH%"

    :: Verificar novamente
    where node >nul 2>nul
    if %errorlevel% neq 0 (
        echo  [ERRO] Instalacao do Node.js falhou.
        echo  Tente instalar manualmente: https://nodejs.org
        pause
        exit /b 1
    )

    echo  [OK] Node.js instalado com sucesso
    del "%TEMP%\node-install.msi" >nul 2>nul
) else (
    echo  [OK] Node.js encontrado
)
node -v

:: Verificar se Git esta instalado
echo.
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
echo  Para iniciar, de dois cliques em start.bat
echo  ou rode: node server.js
echo.
echo  O painel abre em: http://localhost:3000
echo  O AdsPower precisa estar aberto.
echo.
pause
