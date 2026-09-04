// File Path: /sync-agent-wizard/preload.js
// Status: NEW FILE
// Production Ready: Draft — standard contextBridge pattern, but untested
// in a real Electron runtime.
// Description: Exposes a minimal, safe bridge from the main process to
// the wizard's renderer (wizard.html) with contextIsolation on — the
// renderer never gets direct Node/IPC access, only this one function.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('wizardBridge', {
  onActivationReceived: (callback) => {
    ipcRenderer.on('activation-received', (_event, data) => callback(data))
  },
})
