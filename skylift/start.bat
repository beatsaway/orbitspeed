@echo off
cd /d "%~dp0"
set PORT=8082

echo.
echo  Ladder
echo  Freeing port %PORT% if in use...

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  echo  Killing PID %%P on port %PORT%
  taskkill /F /PID %%P >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo  Open: http://localhost:%PORT%
echo  Music starts on the first click.
echo  Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:%PORT%"

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  python -m http.server %PORT%
) else (
  where py >nul 2>&1
  if %ERRORLEVEL%==0 (
    py -m http.server %PORT%
  ) else (
    echo Python not found. Install Python or run any static server in this folder.
    pause
  )
)
