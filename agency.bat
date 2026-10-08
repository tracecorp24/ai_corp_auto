@echo off
setlocal
set "NODE_PATH=d:\nodejs"
if exist "%NODE_PATH%\node.exe" (
    "%NODE_PATH%\node.exe" "%~dp0cli\agency.js" %*
) else (
    node "%~dp0cli\agency.js" %*
)
endlocal
