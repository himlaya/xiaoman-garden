@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Node.js。请先安装 Node.js 20 或更高版本，再运行这个文件。
  pause
  exit /b 1
)
start "小小花园 · 调试服务器" /min cmd /c "node scripts\serve.js --port 4173"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4173"
endlocal
