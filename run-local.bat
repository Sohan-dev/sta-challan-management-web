@echo off
SETLOCAL
cd /d %~dp0

REM -----------------------------
REM STA-React Local Launcher
REM Usage:
REM   run-local.bat            -> start servers (assumes deps already installed)
REM   run-local.bat install    -> install deps then start servers
REM -----------------------------

REM Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found in PATH. Install Node.js and try again.
  pause
  exit /b 1
)

REM If 'install' argument provided, run npm install for frontend and backend
if /I "%1"=="install" (
  echo Running npm install for frontend...
  npm install || (
    echo Frontend npm install failed.
    pause
    exit /b 1
  )

  echo Running npm install for backend...
  pushd backend
  npm install || (
    echo Backend npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
)

REM Start backend minimized (uses backend/.env PORT)
start "STA-React Backend" /min cmd /c "cd /d %~dp0backend && npm start"

REM Give backend a moment to bind to its port
timeout /t 4 /nobreak >nul

REM Start frontend minimized
start "STA-React Frontend" /min cmd /c "cd /d %~dp0 && npm start"

REM Wait a bit for frontend to start
timeout /t 6 /nobreak >nul

REM Open default browser to frontend URL
start http://localhost:5173

ENDLOCAL
exit /b 0
