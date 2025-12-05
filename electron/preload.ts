import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Read data from a JSON file
  readData: (filename: string) => ipcRenderer.invoke('read-data', filename),
  
  // Write data to a JSON file
  writeData: (filename: string, data: unknown) => ipcRenderer.invoke('write-data', filename, data),
  
  // Open file dialog for importing data
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // Save file dialog for exporting data
  saveFileDialog: (data: unknown, defaultName: string) => 
    ipcRenderer.invoke('save-file-dialog', data, defaultName),
  
  // Get the data directory path
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),

  // Image handling
  saveImage: (imageData: string, filename: string) =>
    ipcRenderer.invoke('save-image', imageData, filename),
  
  loadImage: (filePath: string) =>
    ipcRenderer.invoke('load-image', filePath),
  
  openImageDialog: () =>
    ipcRenderer.invoke('open-image-dialog'),

  // Document handling
  openDocumentDialog: () =>
    ipcRenderer.invoke('open-document-dialog'),
  
  saveDocument: (sourcePath: string, quotationId: string, fileName: string) =>
    ipcRenderer.invoke('save-document', sourcePath, quotationId, fileName),
  
  openDocument: (filePath: string) =>
    ipcRenderer.invoke('open-document', filePath),
  
  deleteDocumentFile: (filePath: string) =>
    ipcRenderer.invoke('delete-document-file', filePath)
})


