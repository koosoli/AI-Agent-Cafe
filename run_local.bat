@echo off
cd /d "%~dp0"

echo ====================================
echo   AI Agent Cafe - Local Editor
echo ====================================
echo.

:: Aggressive Cleanup (still good practice)
echo [INFO] Killing old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq AI Agent Cafe Server" >nul 2>&1
timeout /t 1 /nobreak >nul

if not exist "node_modules\" call npm install

echo.
echo [INFO] Starting Server on Port 3000...
echo [INFO] Browser will open automatically once connected...
echo.

:: Smart Launcher: Target strict 3000 as configured in vite.config.ts
start "" /B powershell -NoProfile -Command "$port=3000; $tcp = New-Object System.Net.Sockets.TcpClient; $start = Get-Date; while (-not $tcp.Connected) { try { $tcp.Connect('localhost', $port) } catch { Start-Sleep -Milliseconds 250 } if (((Get-Date) - $start).TotalSeconds -gt 30) { exit } }; $tcp.Close(); Start-Process 'http://localhost:3000/'"

call npm run dev
