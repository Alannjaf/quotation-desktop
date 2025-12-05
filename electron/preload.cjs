const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Read data from a JSON file
  readData: (filename) => ipcRenderer.invoke('read-data', filename),
  
  // Write data to a JSON file
  writeData: (filename, data) => ipcRenderer.invoke('write-data', filename, data),
  
  // Open file dialog for importing data
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // Save file dialog for exporting data
  saveFileDialog: (data, defaultName) => 
    ipcRenderer.invoke('save-file-dialog', data, defaultName),
  
  // Get the data directory path
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),

  // Image handling
  saveImage: (imageData, filename) =>
    ipcRenderer.invoke('save-image', imageData, filename),
  
  loadImage: (filePath) =>
    ipcRenderer.invoke('load-image', filePath),
  
  openImageDialog: () =>
    ipcRenderer.invoke('open-image-dialog'),

  // Document handling
  openDocumentDialog: () =>
    ipcRenderer.invoke('open-document-dialog'),
  
  saveDocument: (sourcePath, quotationId, fileName) =>
    ipcRenderer.invoke('save-document', sourcePath, quotationId, fileName),
  
  openDocument: (filePath) =>
    ipcRenderer.invoke('open-document', filePath),
  
  deleteDocumentFile: (filePath) =>
    ipcRenderer.invoke('delete-document-file', filePath)
})

