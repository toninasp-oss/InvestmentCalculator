@echo off
setlocal
cd /d "%~dp0"

netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if not errorlevel 1 (
  echo Port 8080 is already in use. The existing process was not changed.
  netstat -ano | findstr ":8080"
  pause
  exit /b 1
)

echo Starting Investment Calculator at http://127.0.0.1:8080/
echo Keep this window open while using the calculator. Press Ctrl+C to stop.
python -m http.server 8080 --bind 127.0.0.1
