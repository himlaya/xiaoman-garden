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

echo 正在启动小小花园账号版...
echo 浏览器打开：http://127.0.0.1:8000
echo 数据库：server\data\garden.sqlite3
python -m server.app
pause
