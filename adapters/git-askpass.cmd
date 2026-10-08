@echo off
echo %~1 | findstr /i "Username" >nul
if errorlevel 1 (
  echo %AI_CORP_GITHUB_TOKEN%
) else (
  echo x-access-token
)
