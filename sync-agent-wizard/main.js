// File Path: /sync-agent-wizard/main.js
// Status: NEW FILE
// Production Ready: Draft — untested in a real Electron runtime (no
// display or Windows available to me). The single-instance /
// second-instance handling especially needs verifying on a real Windows
// install; it's the part most likely to behave subtly differently from
// what the docs describe. Also references ./preload.js and ./wizard.html,
// which don't exist yet — this file isn't runnable standalone until the
// next batch adds them.
// Description: Main process. Registers qms-sync:// as this app's default
// protocol handler, handles both ways Windows can hand us an activation
// link (fresh launch via argv, or a 'second-instance' event if the
// wizard's already running), and shows the wizard window once a valid
// link is found. Deliberately does NOT create a system tray icon or stay
// resident after the flow completes — the wizard's job ends once it's
// registered the scheduled task (a later piece), not before.

const { app, BrowserWindow } = require('electron')
const path = require('path')
const { parseActivationUrl, findActivationUrl } = require('./lib/protocolParser')
const { writeConfig } = require('./lib/configManager')

const PROTOCOL = 'qms-sync'

let mainWindow = null
let windowReady = false
let pendingActivation = null

function registerProtocolHandler() {
  if (process.defaultApp) {
    // Running via "electron ." in dev — point the registration at the
    // actual Electron binary and this script, or Windows can't correctly
    // relaunch the app from the registry entry it creates.
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

// Parses + persists an activation link. Doesn't touch the window directly
// — callers decide separately whether to push it into an already-open
// window (handleActivationUrl below) or let the window's own
// did-finish-load handler pick up pendingActivation on first paint.
function processActivationUrl(rawUrl) {
  const result = parseActivationUrl(rawUrl)

  if (result.error) {
    console.error('Invalid activation link:', result.error)
    return null
  }

  writeConfig(app.getPath('userData'), {
    token: result.token,
    apiUrl: result.apiUrl,
    activatedAt: new Date().toISOString(),
  })

  return result
}

function handleActivationUrl(rawUrl) {
  const result = processActivationUrl(rawUrl)
  if (!result) return

  pendingActivation = result

  if (mainWindow && windowReady) {
    mainWindow.webContents.send('activation-received', result)
  }

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 320,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'wizard.html'))

  mainWindow.webContents.once('did-finish-load', () => {
    windowReady = true
    if (pendingActivation) {
      mainWindow.webContents.send('activation-received', pendingActivation)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    windowReady = false
  })
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  // Another instance is already running — it'll receive this instance's
  // argv (containing the activation link) via 'second-instance', so this
  // one just hands off and quits.
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const url = findActivationUrl(argv)
    if (url) {
      handleActivationUrl(url)
    } else if (mainWindow) {
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    registerProtocolHandler()

    const initialUrl = findActivationUrl(process.argv)
    if (initialUrl) {
      pendingActivation = processActivationUrl(initialUrl)
    }

    createWindow()
  })

  // macOS uses 'open-url' instead of argv. Not in scope per the
  // Windows-only decision — left as a safe no-op hook rather than
  // silently dropped, in case this gets revisited later.
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleActivationUrl(url)
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}
