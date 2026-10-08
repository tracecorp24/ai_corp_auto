@echo off
chcp 65001 >nul
title AI Agency OS - GitHub Push
cls

echo ==============================================================
echo              AI AGENCY OS - GITHUB REPOYA PUSH
echo ==============================================================
echo Hedef: https://github.com/tracecorp24/ai_corp_auto
echo.

set "PATH=%PATH%;d:\mingit\cmd;d:\mingit\mingw64\bin;d:\nodejs"

echo [1/2] Git durumu kontrol ediliyor...
git status -s

echo.
echo [2/2] GitHub'a push yapiliyor (main dali)...
echo.
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==============================================================
    echo [BASARILI] Kodlar GitHub'a basariyla aktarildi!
    echo ==============================================================
) else (
    echo.
    echo [NOT] Eger yetki hatasi aldiysaniz GitHub Personal Access Token
    echo (PAT) sifresi veya tarayici uzerinden giris yapmaniz gerekebilir.
)

echo.
pause
