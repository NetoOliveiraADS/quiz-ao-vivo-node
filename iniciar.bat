@echo off
rem Inicia o IFhoot! com dois cliques (Windows). Precisa do Node.js 18 ou mais novo.
rem Opcoes: iniciar.bat --porta 3001
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando as dependencias pela primeira vez...
  call npm install
  if errorlevel 1 (
    echo Erro ao instalar. Confira a internet e tente de novo.
    pause
    exit /b 1
  )
)
node servidor.js %*
pause
