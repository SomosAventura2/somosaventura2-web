@echo off
title Airport - Servidor local
echo.
echo  Abriendo servidor para Airport...
echo  Cuando arranque, abre en el navegador:
echo  http://localhost:3000/login.html
echo.
echo  Para cerrar el servidor: Ctrl+C
echo.
cd /d "%~dp0"

REM Probar primero con Node.js (npx serve)
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
  npx serve . -p 3000
  goto :fin
)

REM Si no hay Node, probar con Python (común en Windows)
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo  Usando Python. Abre: http://localhost:3000/login.html
  py -m http.server 3000
  goto :fin
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo  Usando Python. Abre: http://localhost:3000/login.html
  python -m http.server 3000
  goto :fin
)

REM Ni Node ni Python
echo  No se encontro Node.js ni Python.
echo.
echo  Opcion 1 - Instalar Node.js (recomendado):
echo    Descarga e instala desde https://nodejs.org
echo    Luego vuelve a ejecutar este archivo.
echo.
echo  Opcion 2 - Si ya tienes Python, asegurate de que este en el PATH.
echo.
pause
exit /b 1

:fin
pause
