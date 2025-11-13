@echo off
echo ========================================
echo Starting Event Registration System
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if database is initialized
if not exist "events.db" (
    echo Database not found. Initializing...
    node backend/config/init-sqlite.js
    echo.
)

echo Starting server...
echo.
npm start
