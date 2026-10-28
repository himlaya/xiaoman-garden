@echo off
chcp 65001 >nul
cd /d "%~dp0"

python -c "import flask" >nul 2>nul
if errorlevel 1 (
  echo 正在安装 Flask...
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Flask 安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

set "GARDEN_HOST=0.0.0.0"
set "GARDEN_PORT=8000"

echo.
echo 正在启动小小花园局域网市场...
echo 本机：http://127.0.0.1:8000
for /f %%A in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } ^| Select-Object -First 1 -ExpandProperty IPAddress)" 2^>nul') do (
  echo 局域网：http://%%A:8000
)
echo.
echo 手机和电脑要连同一个 Wi-Fi。
echo 如果手机打不开，请右键“以管理员身份运行” allow-lan-firewall.cmd。
echo.

python -m server.app
pause
