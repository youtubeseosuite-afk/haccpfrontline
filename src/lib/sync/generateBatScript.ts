// File Path: /src/lib/sync/generateBatScript.ts
// Status: NEW FILE
// Production Ready: Draft — batch scripting is notoriously finicky;
// verify this actually runs cleanly on a real Windows machine before it
// goes near a customer, the same way the plain sync.js was verified
// earlier and this hasn't been yet.
// Description: Builds the personalized .bat file content for "Connect my
// Computer". Token and apiUrl are baked in at generation time — nothing
// for the customer to type or paste. Keeps the synced documents folder
// (%USERPROFILE%\AI QMS Sync) separate from the agent's own code folder
// (%LOCALAPPDATA%\AIQMSSyncAgent), so the agent never has a reason to look
// at its own package.json/node_modules while scanning for documents.
// Requires curl.exe (built into Windows since the 2018 update) and Node.js
// (checked explicitly, with a clear message and no silent failure if
// missing — auto-installing Node itself is a real possible upgrade, not
// attempted here).

export function generateBatScript(params: { token: string; apiUrl: string }): string {
  const { token, apiUrl } = params

  return `@echo off
setlocal

echo AI QMS Sync Agent - Setup
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required and wasn't found on this computer.
  echo Install it from https://nodejs.org, then run this file again.
  pause
  exit /b 1
)

set "DOCS_FOLDER=%USERPROFILE%\\AI QMS Sync"
set "AGENT_FOLDER=%LOCALAPPDATA%\\AIQMSSyncAgent"

if not exist "%DOCS_FOLDER%" mkdir "%DOCS_FOLDER%"
if not exist "%AGENT_FOLDER%" mkdir "%AGENT_FOLDER%"

echo Downloading sync agent...
curl -fsSL "${apiUrl}/sync-agent-files/sync.js" -o "%AGENT_FOLDER%\\sync.js"
curl -fsSL "${apiUrl}/sync-agent-files/package.json" -o "%AGENT_FOLDER%\\package.json"

if not exist "%AGENT_FOLDER%\\sync.js" (
  echo Download failed. Check your internet connection and try again.
  pause
  exit /b 1
)

echo Writing configuration...
rem The :\=\\ substitution below doubles each backslash in the folder
rem path so it's valid inside the JSON string being written.
(
  echo {
  echo   "syncToken": "${token}",
  echo   "apiUrl": "${apiUrl}",
  echo   "watchFolder": "%DOCS_FOLDER:\\=\\\\%"
  echo }
) > "%AGENT_FOLDER%\\config.json"

cd /d "%AGENT_FOLDER%"

echo Installing dependencies (this can take a minute)...
call npm install --no-fund --no-audit >nul

echo Scheduling automatic sync every 15 minutes...
schtasks /create /tn "AI QMS Sync" /tr "node \\"%AGENT_FOLDER%\\sync.js\\"" /sc minute /mo 15 /f >nul

echo Running first sync...
call npm run sync

echo.
echo Done! Put your documents in:
echo %DOCS_FOLDER%
echo.
echo They'll sync automatically every 15 minutes from now on.
pause
`
}
