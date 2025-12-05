export interface ElectronAPI {
  readData: (filename: string) => Promise<unknown[]>
  writeData: (filename: string, data: unknown) => Promise<{ success: boolean; error?: string }>
  openFileDialog: () => Promise<unknown | null>
  saveFileDialog: (data: unknown, defaultName: string) => Promise<{ success: boolean; path?: string; error?: string }>
  getDataDir: () => Promise<string>
  saveImage: (imageData: string, filename: string) => Promise<{ success: boolean; path?: string; error?: string }>
  loadImage: (filePath: string) => Promise<string | null>
  openImageDialog: () => Promise<{ data: string; filename: string } | null>
  // Document handling
  openDocumentDialog: () => Promise<{ path: string; name: string; size: number; type: string } | null>
  saveDocument: (sourcePath: string, quotationId: string, fileName: string) => Promise<{ success: boolean; path?: string; error?: string }>
  openDocument: (filePath: string) => Promise<{ success: boolean; error?: string }>
  deleteDocumentFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}


