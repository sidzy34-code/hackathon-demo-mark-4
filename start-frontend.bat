@echo off
title Vanguard Frontend Dev Server
echo Starting Vanguard Frontend on http://localhost:5173...
set PATH=%~dp0node;%PATH%
cd /d "%~dp0frontend"
call "%~dp0node\npm.cmd" run dev
pause
