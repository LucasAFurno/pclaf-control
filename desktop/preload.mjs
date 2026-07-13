import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pclafDesktop', {
  isDesktop: true,
  initialize: (seedState) => ipcRenderer.sendSync('pclaf:initialize', seedState),
  loadSnapshot: () => ipcRenderer.sendSync('pclaf:loadSnapshot'),
  saveSnapshot: (snapshot) => ipcRenderer.sendSync('pclaf:saveSnapshot', snapshot),
  exportPdf: (payload) => ipcRenderer.invoke('pclaf:exportPdf', payload),
})
