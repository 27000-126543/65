const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
  exec: (sql) => ipcRenderer.invoke('db:exec', sql),
  transaction: (statements) => ipcRenderer.invoke('db:transaction', statements),
  showSaveDialog: (options) => ipcRenderer.invoke('app:showSaveDialog', options),
  writeFile: (filePath, data, options) => ipcRenderer.invoke('app:writeFile', filePath, data, options)
})
