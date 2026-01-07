const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ping = require('ping');
const fs = require('fs');

// Use specific path requested by user: C:\ProgramData
const DATA_DIR = path.join('C:', 'ProgramData', 'ElectronPingApp');
const DATA_FILE = path.join(DATA_DIR, 'config.json');

let mainWindow;
let pingIntervals = {};
let targets = [];

// Helper to ensure dir exists and save
function saveTargets() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(targets, null, 2));
    } catch (err) {
        console.error('Failed to save targets:', err);
    }
}

// Helper to load
function loadTargets() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            targets = JSON.parse(data);
        }
    } catch (err) {
        console.error('Failed to load targets:', err);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        backgroundColor: '#1a1b1e', // Dark background
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // Security: keep nodeIntegration false
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function startPinging() {
    // Clear existing
    Object.values(pingIntervals).forEach(clearInterval);
    pingIntervals = {};

    targets.forEach(target => {
        pingIntervals[target.id] = setInterval(async () => {
            try {
                const res = await ping.promise.probe(target.ip, {
                    timeout: 2,
                    extra: ["-n", "1"]
                });

                if (mainWindow) {
                    mainWindow.webContents.send('ping-result', {
                        id: target.id,
                        alive: res.alive,
                        time: res.time
                    });
                }
            } catch (err) {
                console.error(`Ping failed for ${target.ip}:`, err);
            }
        }, 2000);
    });
}

app.whenReady().then(() => {
    loadTargets();
    createWindow();
    startPinging();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('get-targets', () => targets);

ipcMain.on('update-targets', (event, newTargets) => {
    targets = newTargets;
    saveTargets();
    startPinging();
});
