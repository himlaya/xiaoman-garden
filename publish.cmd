@echo off
chcp 65001 >nul
cd /d "%~dp0"
python "%~dp0tools\publish.py" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" pause
if "%~1"=="" pause
exit /b %EXIT_CODE%
