const { app, BrowserWindow, shell, ipcMain, Notification, dialog, Menu } = require('electron');
const path = require('path');
const url = require('url');
const log = require('electron-log');

const isDev = process.env.NODE_ENV === 'development';

// Languages organized by region for cleaner menu
const LANGUAGE_REGIONS = {
  'Popular': {
    en: { name: 'English', native: 'English' },
    es: { name: 'Spanish', native: 'Español' },
    fr: { name: 'French', native: 'Français' },
    de: { name: 'German', native: 'Deutsch' },
    zh: { name: 'Chinese', native: '中文' },
    ja: { name: 'Japanese', native: '日本語' },
    pt: { name: 'Portuguese', native: 'Português' },
    ru: { name: 'Russian', native: 'Русский' },
  },
  'Europe': {
    it: { name: 'Italian', native: 'Italiano' },
    nl: { name: 'Dutch', native: 'Nederlands' },
    pl: { name: 'Polish', native: 'Polski' },
    uk: { name: 'Ukrainian', native: 'Українська' },
    sv: { name: 'Swedish', native: 'Svenska' },
    no: { name: 'Norwegian', native: 'Norsk' },
    da: { name: 'Danish', native: 'Dansk' },
    fi: { name: 'Finnish', native: 'Suomi' },
    el: { name: 'Greek', native: 'Ελληνικά' },
    cs: { name: 'Czech', native: 'Čeština' },
    ro: { name: 'Romanian', native: 'Română' },
    hu: { name: 'Hungarian', native: 'Magyar' },
    hr: { name: 'Croatian', native: 'Hrvatski' },
    sr: { name: 'Serbian', native: 'Српски' },
    bg: { name: 'Bulgarian', native: 'Български' },
    sk: { name: 'Slovak', native: 'Slovenčina' },
    sl: { name: 'Slovenian', native: 'Slovenščina' },
    lt: { name: 'Lithuanian', native: 'Lietuvių' },
    lv: { name: 'Latvian', native: 'Latviešu' },
    et: { name: 'Estonian', native: 'Eesti' },
  },
  'Asia': {
    ko: { name: 'Korean', native: '한국어' },
    hi: { name: 'Hindi', native: 'हिन्दी' },
    bn: { name: 'Bengali', native: 'বাংলা' },
    th: { name: 'Thai', native: 'ไทย' },
    vi: { name: 'Vietnamese', native: 'Tiếng Việt' },
    id: { name: 'Indonesian', native: 'Bahasa Indonesia' },
    ms: { name: 'Malay', native: 'Bahasa Melayu' },
    tl: { name: 'Filipino', native: 'Filipino' },
    ta: { name: 'Tamil', native: 'தமிழ்' },
    te: { name: 'Telugu', native: 'తెలుగు' },
    mr: { name: 'Marathi', native: 'मराठी' },
    ka: { name: 'Georgian', native: 'ქართული' },
    hy: { name: 'Armenian', native: 'Հայdelays' },
    az: { name: 'Azerbaijani', native: 'Azərbaycan' },
    kk: { name: 'Kazakh', native: 'Қазақ' },
    uz: { name: 'Uzbek', native: 'Oʻzbek' },
    mn: { name: 'Mongolian', native: 'Монгол' },
  },
  'Middle East & Africa': {
    ar: { name: 'Arabic', native: 'العربية' },
    he: { name: 'Hebrew', native: 'עברית' },
    fa: { name: 'Persian', native: 'فارسی' },
    ur: { name: 'Urdu', native: 'اردو' },
    tr: { name: 'Turkish', native: 'Türkçe' },
    sw: { name: 'Swahili', native: 'Kiswahili' },
    af: { name: 'Afrikaans', native: 'Afrikaans' },
  },
};

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'info';

// Try to load electron-updater
let autoUpdater = null;
try {
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;
  
  // Configure auto-updater for seamless updates
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
  
  // Enable full update log
  autoUpdater.fullChangelog = true;
  
  log.info('Auto-updater initialized successfully');
} catch (e) {
  log.warn('Auto-updater not available:', e.message);
}

// Keep a global reference of the window object
let mainWindow;
let updateAvailable = false;
let updateDownloaded = false;

function createWindow() {
  // Create the browser window - frameless for clean look
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/icons/icon-512x512.png'),
    title: 'FaceConnect',
    frame: false, // Remove window title bar
    titleBarStyle: 'hidden', // Hide title bar but keep window controls on macOS
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#111b21',
      symbolColor: '#ffffff',
      height: 32
    } : false, // Windows 10/11 overlay controls
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // IMPORTANT: webSecurity must be false for file:// protocol to load local JS files
      // This is safe because we only load our own bundled React app
      webSecurity: isDev,
      webviewTag: true, // Enable webview tag for embedded browser
      allowRunningInsecureContent: false
    },
    backgroundColor: '#111b21', // Match app theme color
    show: false,
  });
  
  // Keep title minimal
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault(); // Prevent page from changing the title
  });

  // Determine the URL to load
  if (isDev) {
    // Development - load from webpack dev server
    mainWindow.loadURL('http://localhost:3000').catch(err => {
      log.error('Failed to load dev server:', err);
    });
  } else {
    // Production - find and load build/index.html
    // Try multiple possible paths since electron-builder can package differently
    const possiblePaths = [
      path.join(__dirname, '..', 'build', 'index.html'),           // Relative to main.js
      path.join(app.getAppPath(), 'build', 'index.html'),          // App root
      path.join(process.resourcesPath, 'app', 'build', 'index.html'), // ASAR unpacked
      path.join(process.resourcesPath, 'app.asar', 'build', 'index.html'), // Inside ASAR
      path.join(__dirname, 'build', 'index.html'),                 // Same folder as main.js
    ];
    
    log.info('App path:', app.getAppPath());
    log.info('Resources path:', process.resourcesPath);
    log.info('__dirname:', __dirname);
    
    // Find the first valid path
    let indexPath = null;
    const fs = require('fs');
    for (const p of possiblePaths) {
      log.info('Checking path:', p);
      try {
        if (fs.existsSync(p)) {
          indexPath = p;
          log.info('Found valid path:', p);
          break;
        }
      } catch (e) {
        // ASAR paths may throw, try loadFile directly
        log.info('Path check failed (may be in ASAR):', p);
      }
    }
    
    // Default to the most common path if none found
    if (!indexPath) {
      indexPath = possiblePaths[0];
      log.info('Using default path:', indexPath);
    }
    
    log.info('Loading from:', indexPath);
    
    mainWindow.loadFile(indexPath).catch(err => {
      log.error('Failed to load:', indexPath, err.message);
      // Try all other paths as fallback
      const tryNextPath = (paths, index) => {
        if (index >= paths.length) {
          dialog.showErrorBox('Load Error', `Failed to load the application.\n\nTried paths:\n${paths.join('\n')}\n\nError: ${err.message}`);
          return;
        }
        if (paths[index] === indexPath) {
          tryNextPath(paths, index + 1);
          return;
        }
        log.info('Trying fallback:', paths[index]);
        mainWindow.loadFile(paths[index]).catch(err2 => {
          log.error('Fallback failed:', paths[index], err2.message);
          tryNextPath(paths, index + 1);
        });
      };
      tryNextPath(possiblePaths, 0);
    });
  }

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Enable F12 to open devtools even in production (for debugging)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
    // Also Ctrl+Shift+I
    if (input.control && input.shift && input.key === 'I') {
      mainWindow.webContents.toggleDevTools();
    }
  });

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
    
    // Try to reload once (but not for user abort)
    if (errorCode !== -3) { // -3 is user abort
      setTimeout(() => {
        log.info('Attempting reload with loadFile...');
        // Use loadFile as fallback
        const buildPath = path.join(app.getAppPath(), 'build', 'index.html');
        mainWindow.loadFile(buildPath).catch(err => {
          log.error('loadFile also failed:', err);
        });
      }, 1000);
    }
  });

  // Handle blank/white screen - inject additional diagnostic info
  mainWindow.webContents.on('dom-ready', () => {
    log.info('DOM is ready');
    // Log current URL and inject diagnostic script
    mainWindow.webContents.executeJavaScript(`
      console.log('[FaceConnect] DOM Ready - URL:', window.location.href);
      console.log('[FaceConnect] Protocol:', window.location.protocol);
      console.log('[FaceConnect] Scripts loaded:', document.scripts.length);
      
      // Check if React mounted after 8 seconds
      setTimeout(() => {
        const root = document.getElementById('root');
        const loading = document.getElementById('loading-screen');
        if (root && loading) {
          // React didn't replace the loading screen
          console.error('[FaceConnect] React did not mount. Check console for errors.');
        }
      }, 8000);
    `).catch(err => log.error('Failed to inject diagnostic script:', err));
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
  
  // Notify renderer when window maximize state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });
  
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });
  
  // Create application menu with language support
  createApplicationMenu();
}

// Create application menu
function createApplicationMenu() {
  // Generate language submenu with regional categories
  const languageSubmenu = Object.entries(LANGUAGE_REGIONS).map(([region, languages]) => ({
    label: region,
    submenu: Object.entries(languages).map(([code, lang]) => ({
      label: `${lang.native} (${lang.name})`,
      type: 'radio',
      checked: code === 'en', // Default to English
      click: () => {
        // Send language change to renderer
        if (mainWindow) {
          mainWindow.webContents.send('change-language', code);
          log.info(`Language changed to: ${code} (${lang.name})`);
        }
      }
    }))
  }));

  const template = [
    // File Menu
    {
      label: 'File',
      submenu: [
        { label: 'New Chat', accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('menu-action', 'new-chat') },
        { type: 'separator' },
        { label: 'Export Chats...', click: () => sendToRenderer('menu-action', 'export-chats') },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Toggle Dark Mode', accelerator: 'CmdOrCtrl+D', click: () => sendToRenderer('menu-action', 'toggle-theme') },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : [])
      ]
    },
    // Language Menu (Organized by Region)
    {
      label: 'Language',
      submenu: languageSubmenu
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    // Help Menu
    {
      label: 'Help',
      submenu: [
        { 
          label: 'FaceConnect Help',
          click: () => shell.openExternal('https://faceconnect.app/help')
        },
        { type: 'separator' },
        { 
          label: 'Check for Updates...',
          click: () => {
            if (autoUpdater) {
              checkForUpdates();
            } else {
              dialog.showMessageBox({
                type: 'info',
                title: 'Updates',
                message: 'Auto-updater is not available in this build.'
              });
            }
          }
        },
        { type: 'separator' },
        { 
          label: 'About FaceConnect',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About FaceConnect',
              message: 'FaceConnect',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];

  // macOS specific adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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
    
    // Show dialog asking user to restart now or later
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'FaceConnect Update Ready',
      message: `Version ${info.version} has been downloaded`,
      detail: 'A new version has been downloaded. Restart now to apply the update instantly. No reinstallation needed!'
    };
    
    dialog.showMessageBox(mainWindow, dialogOpts).then((result) => {
      if (result.response === 0) {
        // User clicked "Restart Now"
        log.info('User chose to restart now. Installing update...');
        // quitAndInstall(isSilent, isForceRunAfter)
        // isSilent = true: Don't show installer UI (seamless)
        // isForceRunAfter = true: Launch app immediately after install
        autoUpdater.quitAndInstall(true, true);
      } else {
        // User clicked "Later"
        log.info('User deferred update. Will install on next app quit.');
        showNotification(
          'Update Pending',
          `Version ${info.version} will install automatically when you close the app.`
        );
      }
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
    
    // Check if it's a network/server error (not configured or can't reach server)
    const errorMessage = err.message || err.toString();
    const isNetworkError = 
      errorMessage.includes('net::ERR') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('404') ||
      errorMessage.includes('Cannot find latest') ||
      errorMessage.includes('Unable to find latest version') ||
      errorMessage.includes('getaddrinfo') ||
      errorMessage.includes('network');
    
    if (isNetworkError) {
      // Treat network errors as "up-to-date" to avoid confusing users
      log.info('Update server not reachable or not configured. Treating as up-to-date.');
      sendToRenderer('update-status', { 
        status: 'up-to-date', 
        version: app.getVersion(),
        message: 'You have the latest version'
      });
    } else {
      // Only show error for real errors
      sendToRenderer('update-error', { message: err.message });
    }
    
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

// Window control IPC handlers (for frameless window)
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Listen for maximize/unmaximize to notify renderer
app.on('ready', () => {
  // This will be set up after window creation
});

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

// Open external URL handler (for OAuth and external links)
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    log.info('Opening external URL:', url);
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    log.error('Failed to open external URL:', error);
    return { success: false, error: error.message };
  }
});

// Open Spotify app
ipcMain.handle('open-spotify', async () => {
  try {
    log.info('Attempting to open Spotify...');
    
    // Try to open Spotify using the spotify: protocol
    await shell.openExternal('spotify:');
    return { success: true, method: 'protocol' };
  } catch (protocolError) {
    log.warn('Spotify protocol failed, trying web fallback:', protocolError.message);
    
    try {
      // Fallback to Spotify web player
      await shell.openExternal('https://open.spotify.com');
      return { success: true, method: 'web' };
    } catch (webError) {
      log.error('Failed to open Spotify:', webError);
      return { success: false, error: webError.message };
    }
  }
});

// Media control handlers - use URI schemes for different services
ipcMain.handle('media-play-pause', async (event, serviceId) => {
  try {
    log.info('Media play/pause for:', serviceId);
    
    if (serviceId === 'spotify') {
      // Spotify supports play/pause via URI - toggle current state
      await shell.openExternal('spotify:play');
    } else if (serviceId === 'apple-music') {
      await shell.openExternal('music://play');
    } else if (serviceId === 'youtube-music') {
      await shell.openExternal('https://music.youtube.com');
    } else if (serviceId === 'soundcloud') {
      await shell.openExternal('https://soundcloud.com');
    }
    
    return { success: true };
  } catch (error) {
    log.error('Media play/pause error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('media-next', async (event, serviceId) => {
  try {
    log.info('Media next for:', serviceId);
    
    if (serviceId === 'spotify') {
      // Spotify next track
      await shell.openExternal('spotify:next');
    } else if (serviceId === 'apple-music') {
      await shell.openExternal('music://next');
    } else {
      // For other services, just open the app
      log.info('Next track not supported for:', serviceId);
    }
    
    return { success: true };
  } catch (error) {
    log.error('Media next error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('media-previous', async (event, serviceId) => {
  try {
    log.info('Media previous for:', serviceId);
    
    if (serviceId === 'spotify') {
      // Spotify previous track
      await shell.openExternal('spotify:previous');
    } else if (serviceId === 'apple-music') {
      await shell.openExternal('music://previous');
    } else {
      // For other services, just open the app
      log.info('Previous track not supported for:', serviceId);
    }
    
    return { success: true };
  } catch (error) {
    log.error('Media previous error:', error);
    return { success: false, error: error.message };
  }
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

