@echo off
chcp 65001 >nul

net session >nul 2>&1
if errorlevel 1 (
  echo 需要管理员权限。
  echo 请右键这个文件，选择“以管理员身份运行”。
  pause
  exit /b 1
)

echo 正在放行小小花园局域网市场端口 TCP 8000（仅专用网络）...
netsh advfirewall firewall delete rule name="小小花园局域网市场" >nul 2>&1
netsh advfirewall firewall add rule name="小小花园局域网市场" dir=in action=allow protocol=TCP localport=8000 profile=private
if errorlevel 1 (
  echo 防火墙规则添加失败。
  pause
  exit /b 1
)

echo.
echo 已放行。手机连接同一 Wi-Fi 后访问：
echo   http://电脑局域网IP:8000
echo.
echo 如果以后不再需要，可用管理员终端删除：
echo   netsh advfirewall firewall delete rule name="小小花园局域网市场"
pause
