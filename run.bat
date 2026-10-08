@echo off
chcp 65001 >nul
title AI Agency OS - Otonom Ajan Yonetim Sistemi
cls

echo ==============================================================================
echo                      AI AGENCY OS - YONETIM MERKEZI
echo ==============================================================================
echo.

:: Yerlesik SQLite destegi olan Node.js surumunu sec
set "NODE_CMD=node"
node -e "require('node:sqlite')" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "d:\nodejs\node.exe" (
        "d:\nodejs\node.exe" -e "require('node:sqlite')" >nul 2>&1
        if not errorlevel 1 set "NODE_CMD=d:\nodejs\node.exe"
    )
)

:: Runtime uygunlugunu test et
"%NODE_CMD%" -e "require('node:sqlite')" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] Yerlesik SQLite destegi olan Node.js bulunamadi.
    echo Lutfen Node.js 24 veya daha yeni bir surum kurun.
    pause
    exit /b 1
)

echo [1/3] Node.js runtime algilandi.
cd /d "%~dp0"
if not defined AI_CORP_AGENT_EXECUTABLE (
    where codex >nul 2>&1
    if not errorlevel 1 (
        set "AI_CORP_AGENT_EXECUTABLE=%NODE_CMD%"
        set "AI_CORP_AGENT_ARGS_JSON=[""adapters/codex.js""]"
        echo Codex CLI varsayilan ajan adaptoru olarak secildi.
    )
)
echo [2/3] Tarayici baslatiliyor (http://127.0.0.1:3000)...
start http://127.0.0.1:3000

echo [3/3] Vendorless (Bagimsiz) Sunucu baslatiliyor...
echo.
echo ==============================================================================
echo   Yerel Erisim  : http://127.0.0.1:3000
echo   Kapatmak icin bu pencereyi kapatin veya Ctrl+C tusuna basin.
echo ==============================================================================
echo.

"%NODE_CMD%" "%~dp0server.js"

pause
