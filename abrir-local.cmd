@echo off
title ARAMO local - cerra esta ventana para apagarlo
cd /d "%~dp0"
python "%~dp0abrir-local.py"
if errorlevel 1 pause
