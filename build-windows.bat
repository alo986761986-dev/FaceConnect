@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo    FaceConnect Windows Installer Builder
echo ==========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check Yarn
where yarn >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing Yarn...
    npm install -g yarn
)

echo [1/4] Installing dependencies...
cd frontend
call yarn install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building React application...
set CI=false
set DISABLE_ESLINT_PLUGIN=true
call yarn build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build React app
    pause
    exit /b 1
)

echo.
echo [3/4] Building Windows installer...
call yarn electron:build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Electron app
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    Build Complete!
echo ==========================================
echo.
echo Installer location: frontend\dist\FaceConnect Setup *.exe
echo.
echo You can distribute this installer to Windows users.
echo.

:: Open dist folder
explorer dist

pause
