@echo off
REM ── Memory Mesh · avvio kiosk su Windows ─────────────────────────────
REM Apre il display a schermo intero in un profilo Chrome dedicato.
REM --use-fake-ui-for-media-stream: concede la webcam senza popup (solo in questo profilo).
REM Per l'avvio automatico: Win+R -> shell:startup -> incolla un collegamento a questo file.
REM Per uscire dalla modalita' kiosk: Alt+F4.

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

start "" %CHROME% ^
  --kiosk "https://memory-mesh-eight.vercel.app/display/" ^
  --user-data-dir="%LOCALAPPDATA%\MemoryMeshKiosk" ^
  --use-fake-ui-for-media-stream ^
  --autoplay-policy=no-user-gesture-required ^
  --no-first-run ^
  --disable-session-crashed-bubble ^
  --disable-features=Translate ^
  --overscroll-history-navigation=0
