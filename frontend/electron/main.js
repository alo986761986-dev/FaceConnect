const { app, BrowserWindow, shell, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const url = require('url');
const log = require('electron-log');

const isDev = process.env.NODE_ENV === 'development';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'info';

// Try to load electron-updater
let autoUpdater = null;
try {
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;
  
  // Configure auto-updater
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
  
  // IMPORTANT: Disable code signature verification for unsigned builds
  // This allows updates to install without a code signing certificate
  autoUpdater.forceDevUpdateConfig = true;
  
  // Disable signature verification on Windows
  if (process.platform === 'win32') {
    autoUpdater.verifyUpdateCodeSignature = false;
  }
  
  log.info('Auto-updater initialized successfully');
} catch (e) {
  log.warn('Auto-updater not available:', e.message);
}

// Keep a global reference of the window object
let mainWindow;
let updateAvailable = false;
let updateDownloaded = false;

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
      webSecurity: true,
      webviewTag: true, // Enable webview tag for embedded browser
      allowRunningInsecureContent: false
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
  
  log.info('Loading URL:', startUrl);
  
  // Load the app
  mainWindow.loadURL(startUrl).catch(err => {
    log.error('Failed to load URL:', err);
    dialog.showErrorBox('Load Error', `Failed to load the application: ${err.message}`);
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Window is ready to show');
    
    // Check for updates after window shows (production only)
    if (!isDev && autoUpdater) {
      // Wait a bit before checking for updates
      setTimeout(() => {
        checkForUpdates();
      }, 3000);
    }
  });

  // Log any load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log.error('Failed to load:', errorCode, errorDescription, validatedURL);
    
    // Try to reload once
    if (errorCode !== -3) { // -3 is user abort
      setTimeout(() => {
        log.info('Attempting reload...');
        mainWindow.loadURL(startUrl);
      }, 1000);
    }
  });

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Page finished loading');
  });

  // Log console messages from the renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level > 0) { // Only log warnings and errors
      log.info('Renderer:', message);
    }
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
    if (navUrl.startsWith('file://') || navUrl.startsWith('http://localhost')) {
      return;
    }
    if (navUrl.startsWith('http://') || navUrl.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(navUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Check for updates function
function checkForUpdates() {
  if (!autoUpdater) {
    log.warn('Auto-updater not available');
    return;
  }
  
  try {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    log.error('Update check failed:', e.message);
  }
}

// Schedule periodic update checks (every 30 minutes)
function scheduleUpdateChecks() {
  if (!isDev && autoUpdater) {
    setInterval(() => {
      log.info('Scheduled update check...');
      checkForUpdates();
    }, 30 * 60 * 1000); // 30 minutes
  }
}

// Auto-updater events
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    sendToRenderer('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    updateAvailable = true;
    
    sendToRenderer('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
    
    // Show notification
    showNotification(
      'FaceConnect Update Available',
      `Version ${info.version} is available. Downloading now...`
    );
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available. Current version:', info.version);
    sendToRenderer('update-status', { status: 'up-to-date', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    log.info(`Download progress: ${percent}%`);
    
    sendToRenderer('download-progress', {
      percent: percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
    
    // Update taskbar progress
    if (mainWindow) {
      mainWindow.setProgressBar(progress.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    updateDownloaded = true;
    
    // Reset taskbar progress
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
    }
    
    sendToRenderer('update-downloaded', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
    
    // Show notification
    showNotification(
      'FaceConnect Update Ready',
      `Version ${info.version} will install automatically when you close the app.`
    );
    
    // AUTO-INSTALL: Automatically quit and install the update after a short delay
    // This gives users a moment to save their work if needed
    log.info('Auto-installing update in 5 seconds...');
    
    setTimeout(() => {
      log.info('Installing update now...');
      // quitAndInstall(isSilent, isForceRunAfter)
      // isSilent = true: Don't show installer UI
      // isForceRunAfter = true: Launch app after install
      autoUpdater.quitAndInstall(true, true);
    }, 5000);
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
    sendToRenderer('update-error', { message: err.message });
    
    // Reset taskbar progress on error
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
    }
  });
}

// Helper function to send messages to renderer
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// Helper function to show notifications
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// IPC handlers
ipcMain.handle('check-for-updates', async () => {
  if (!isDev && autoUpdater) {
    checkForUpdates();
    return { success: true };
  }
  return { success: false, message: 'Updates not available in dev mode' };
});

ipcMain.handle('install-update', () => {
  if (autoUpdater && updateDownloaded) {
    log.info('Installing update...');
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  }
  return { success: false, message: 'No update downloaded' };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-update-status', () => {
  return {
    updateAvailable,
    updateDownloaded,
    version: app.getVersion()
  };
});

// App lifecycle
app.whenReady().then(() => {
  log.info('App is ready, creating window...');
  log.info('App version:', app.getVersion());
  createWindow();
  
  // Start scheduled update checks
  scheduleUpdateChecks();
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

// Handle before-quit to ensure update installs
app.on('before-quit', () => {
  log.info('App is quitting...');
});

// Log any unhandled errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  dialog.showErrorBox('Error', `An error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Register custom protocol for auth callbacks (faceconnect://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('faceconnect', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('faceconnect');
}

// Handle protocol URL on Windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Handle deep link URL
      const url = commandLine.find(arg => arg.startsWith('faceconnect://'));
      if (url) {
        handleDeepLink(url);
      }
    }
  });
}

// Handle deep link URLs
function handleDeepLink(deepLinkUrl) {
  log.info('Handling deep link:', deepLinkUrl);
  
  if (mainWindow && deepLinkUrl.includes('auth/callback')) {
    // Extract the callback parameters
    const urlObj = new URL(deepLinkUrl.replace('faceconnect://', 'https://'));
    const params = urlObj.searchParams.toString();
    
    // Navigate to auth callback in the app
    if (params) {
      mainWindow.webContents.executeJavaScript(`
        window.location.href = '/auth/callback?${params}';
      `);
    }
  }
}

// Handle open-url event (macOS)
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

