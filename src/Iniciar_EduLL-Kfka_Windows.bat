@echo off
REM ============================================================================
REM EduLL-Kfka — Inicializador de 1 Clique para Windows (.bat)
REM Basta dar duplo clique neste arquivo no Windows Explorer!
REM ============================================================================
title EduLL-Kfka - Sistema de Acompanhamento Academico Bimestral
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale o Node.js (v22+) em https://nodejs.org
    pause
    exit /b 1
)

node iniciar-desktop.js
pause
