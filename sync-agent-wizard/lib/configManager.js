// File Path: /sync-agent-wizard/lib/configManager.js
// Status: NEW FILE
// Production Ready: Draft — file I/O is simple and defensively written,
// but untested in a real Electron runtime. Verify app.getPath('userData')
// resolves where you expect on a real Windows install before relying on it.
// Description: Local Config Manager for the wizard's OWN state (has it
// been activated, with what token/apiUrl) — separate from
// sync-agent/config.json, which the plain sync script reads. Writes to
// Electron's standard per-user app-data folder, so there's no .env file
// and nothing for the user to hand-edit. Writing the actual
// sync-agent/config.json and registering the Task Scheduler entry are the
// next piece, once the folder-picker step is built.

const fs = require('fs')
const path = require('path')

function getConfigPath(userDataPath) {
  return path.join(userDataPath, 'wizard-state.json')
}

function readConfig(userDataPath) {
  const configPath = getConfigPath(userDataPath)
  if (!fs.existsSync(configPath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return null
  }
}

function writeConfig(userDataPath, config) {
  const configPath = getConfigPath(userDataPath)
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

function isActivated(userDataPath) {
  const config = readConfig(userDataPath)
  return !!(config && config.token && config.apiUrl)
}

module.exports = { getConfigPath, readConfig, writeConfig, isActivated }
