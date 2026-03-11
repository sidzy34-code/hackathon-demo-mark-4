@echo off
title Vanguard Backend Server
echo Starting Vanguard API Backend on port 3333...
"%~dp0node\node.exe" "%~dp0backend\server.js"
pause
