@echo off
rem Abre el sitio en tu computador para probar cambios SIN publicar en Netlify (no gasta creditos).
rem Doble clic en este archivo; luego abre http://localhost:3000 en el navegador. Para detener: Ctrl+C en esta ventana.
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Iniciando la base de datos local y el sitio... (la primera vez tarda un poco)
call npm run dev:local
pause
