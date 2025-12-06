import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

// Ensure only one instance of the app runs
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

// Get the app data directory for storing JSON files
function getDataDir(): string {
  const dataDir = path.join(app.getPath("userData"), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

// Initialize default data files if they don't exist
function initializeDataFiles(): void {
  const dataDir = getDataDir();
  const defaultFiles: Record<string, unknown[]> = {
    "quotations.json": [],
    "quotation_items.json": [],
    "vendors.json": [],
    "recipients.json": [],
    "categories.json": [],
    "item_types.json": [],
    "exchange_rates.json": [],
    "settings.json": [],
    "vendor_documents.json": [],
  };

  for (const [filename, defaultData] of Object.entries(defaultFiles)) {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/favicon.ico"),
    title: "Quotation Desktop",
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // Uncomment below to open DevTools in development:
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Handle second instance - focus existing window
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  initializeDataFiles();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC Handlers for file operations

// Read data from a JSON file
ipcMain.handle("read-data", async (_event, filename: string) => {
  try {
    const filePath = path.join(getDataDir(), filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading data:", error);
    return [];
  }
});

// Write data to a JSON file
ipcMain.handle(
  "write-data",
  async (_event, filename: string, data: unknown) => {
    try {
      const filePath = path.join(getDataDir(), filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error) {
      console.error("Error writing data:", error);
      return { success: false, error: String(error) };
    }
  }
);

// Open file dialog for importing data
ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: [{ name: "JSON Files", extensions: ["json"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const data = fs.readFileSync(result.filePaths[0], "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading import file:", error);
    return null;
  }
});

// Save file dialog for exporting data
ipcMain.handle(
  "save-file-dialog",
  async (_event, data: unknown, defaultName: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName,
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false };
    }

    try {
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
      return { success: true, path: result.filePath };
    } catch (error) {
      console.error("Error saving file:", error);
      return { success: false, error: String(error) };
    }
  }
);

// Get the data directory path
ipcMain.handle("get-data-dir", async () => {
  return getDataDir();
});

// Save image file (for company logo)
ipcMain.handle(
  "save-image",
  async (_event, imageData: string, filename: string) => {
    try {
      const imagesDir = path.join(app.getPath("userData"), "images");
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const filePath = path.join(imagesDir, filename);
      fs.writeFileSync(filePath, buffer);

      return { success: true, path: filePath };
    } catch (error) {
      console.error("Error saving image:", error);
      return { success: false, error: String(error) };
    }
  }
);

// Load image file as base64
ipcMain.handle("load-image", async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mimeType =
      ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
});

// Open image file dialog
ipcMain.handle("open-image-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mimeType =
      ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
    const base64 = buffer.toString("base64");
    return {
      data: `data:${mimeType};base64,${base64}`,
      filename: path.basename(filePath),
    };
  } catch (error) {
    console.error("Error reading image file:", error);
    return null;
  }
});

// ============ Document Handling ============

// Get documents directory
function getDocumentsDir(): string {
  const docsDir = path.join(app.getPath("userData"), "documents");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  return docsDir;
}

// Open document file dialog
ipcMain.handle("open-document-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: [
      {
        name: "Documents",
        extensions: ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg"],
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      type: path.extname(filePath).toLowerCase().replace(".", ""),
    };
  } catch (error) {
    console.error("Error reading document file:", error);
    return null;
  }
});

// Save document to app storage
ipcMain.handle(
  "save-document",
  async (_event, sourcePath: string, quotationId: string, fileName: string) => {
    try {
      const docsDir = getDocumentsDir();
      const quotationDir = path.join(docsDir, quotationId);

      if (!fs.existsSync(quotationDir)) {
        fs.mkdirSync(quotationDir, { recursive: true });
      }

      // Create unique filename
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      const uniqueName = `${baseName}_${Date.now()}${ext}`;
      const destPath = path.join(quotationDir, uniqueName);

      // Copy file
      fs.copyFileSync(sourcePath, destPath);

      return { success: true, path: destPath };
    } catch (error) {
      console.error("Error saving document:", error);
      return { success: false, error: String(error) };
    }
  }
);

// Open document with default application
ipcMain.handle("open-document", async (_event, filePath: string) => {
  try {
    console.log("Opening document:", filePath);
    const result = await shell.openPath(filePath);
    if (result) {
      // shell.openPath returns empty string on success, error message on failure
      console.error("Error opening document:", result);
      return { success: false, error: result };
    }
    return { success: true };
  } catch (error) {
    console.error("Error opening document:", error);
    return { success: false, error: String(error) };
  }
});

// Delete document file
ipcMain.handle("delete-document-file", async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: String(error) };
  }
});
