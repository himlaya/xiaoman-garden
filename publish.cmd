@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem 这台电脑使用便携版 Git/GitHub CLI；其他电脑会回退到系统 PATH。
if exist ".tools\minigit\cmd\git.exe" set "PATH=%CD%\.tools\minigit\cmd;%PATH%"
if exist ".tools\gh\bin\gh.exe" set "PATH=%CD%\.tools\gh\bin;%PATH%"

where git >nul 2>nul || (echo 没有找到 Git，请先安装 Git 或把便携版放回 .tools 目录。 & pause & exit /b 1)
where gh >nul 2>nul || (echo 没有找到 GitHub CLI，请先登录 GitHub。 & pause & exit /b 1)
git remote get-url origin >nul 2>nul || (echo 当前目录没有配置 GitHub origin。 & pause & exit /b 1)
gh auth status >nul 2>nul || (echo GitHub 未登录，请先在终端运行 gh auth login。 & pause & exit /b 1)

set "VER=%~1"
set "BUILD=%~2"
if "%VER%"=="" set /p VER=请输入新版本号（例如 0.2.0）: 
if "%BUILD%"=="" set /p BUILD=请输入构建号（必须比上一版大，例如 2）: 
if "%VER%"=="" goto :fail
if "%BUILD%"=="" goto :fail

call npm run version:set -- %VER% %BUILD%
if errorlevel 1 goto :fail

call npm test
if errorlevel 1 goto :fail

call npm run sync:native
if errorlevel 1 goto :fail

git add -A
if errorlevel 1 goto :fail

git diff --cached --quiet
if not errorlevel 1 (
  echo 没有需要提交的改动。
  goto :done
)

git commit -m "release: v%VER% build %BUILD%"
if errorlevel 1 goto :fail

git push
if errorlevel 1 goto :fail

echo.
echo 已推送到 GitHub。GitHub Actions 会自动跑测试并部署。
echo 线上地址：https://himlaya.github.io/xiaoman-garden/
echo 正在打开 Actions 页面...
start "" "https://github.com/himlaya/xiaoman-garden/actions"
goto :done

:fail
echo.
echo 发布中止，请检查上面的错误。
pause
exit /b 1

:done
pause
exit /b 0
