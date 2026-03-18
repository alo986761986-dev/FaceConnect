const { app, BrowserWindow, shell, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const url = require('url');

const isDev = process.env.NODE_ENV === 'development';

// Try to load electron-updater (optional - may not be available in all builds)
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  console.log('Auto-updater not available:', e.message);
}

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/icons/icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    titleBarStyle: 'default',
    backgroundColor: '#000000',
    show: false,
  });

  // Determine the URL to load
  let startUrl;
  
  if (isDev) {
    startUrl = 'http://localhost:3000';
  } else {
    // Production - load from build folder
    startUrl = url.format({
      pathname: path.join(__dirname, '../build/index.html'),
      protocol: 'file:',
      slashes: true
    });
  }
  
  console.log('Loading URL:', startUrl);
  
  // Load the app
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load URL:', err);
    // Show error dialog
    dialog.showErrorBox('Load Error', `Failed to load the application: ${err.message}`);
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Window is ready to show');
    
    // Check for updates after window shows (production only)
    if (!isDev && autoUpdater) {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (e) {
        console.log('Update check failed:', e.message);
      }
    }
  });

  // Log any load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    
    // Try to reload once
    if (errorCode !== -3) { // -3 is user abort
      setTimeout(() => {
        console.log('Attempting reload...');
        mainWindow.loadURL(startUrl);
      }, 1000);
    }
  });

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  // Log console messages from the renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Renderer console:', message);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    // Allow file:// and localhost navigation
    if (navUrl.startsWith('file://') || navUrl.startsWith('http://localhost')) {
      return;
    }
    // Block external navigation and open in browser
    if (navUrl.startsWith('http://') || navUrl.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(navUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Auto-updater events (only if available)
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
    new Notification({
      title: 'FaceConnect Update Available',
      body: `Version ${info.version} is available and will be installed automatically.`
    }).show();
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progress);
      mainWindow.setProgressBar(progress.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
      mainWindow.setProgressBar(-1);
    }
    new Notification({
      title: 'FaceConnect Update Ready',
      body: 'Update will be installed when you restart the app.'
    }).show();
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });
}

// IPC handlers
ipcMain.handle('check-for-updates', () => {
  if (!isDev && autoUpdater) {
    try {
      autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {
      console.log('Update check failed:', e.message);
    }
  }
});

ipcMain.handle('install-update', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall();
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App lifecycle
app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle certificate errors for development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Log any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Error', `An error occurred: ${error.message}`);
});
