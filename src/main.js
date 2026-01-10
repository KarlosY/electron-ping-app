const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ping = require('ping');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// Data Persistence
const DATA_DIR = 'C:\\ProgramData\\ElectronPingApp';
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SMTP_CONFIG_FILE = path.join(DATA_DIR, 'smtp-config.json');

// Ensure Data Dir Exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error("Failed to create Data config dir:", err);
        // Fallback to AppData if ProgramData fails (permission issues)
        // For simplicity in this step, we keep attempting, user might need Admin rights as noted before.
    }
}

// Load Targets
function loadTargets() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error reading config:", e);
            return [];
        }
    }
    return [];
}

function saveTargets(targets) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(targets, null, 2));
    } catch (e) {
        console.error("Error saving config:", e);
    }
}

// Load SMTP Config
function loadSmtpConfig() {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
        try {
            const data = fs.readFileSync(SMTP_CONFIG_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error reading SMTP config:", e);
            return null;
        }
    }
    return null;
}

function saveSmtpConfig(config) {
    try {
        fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(config, null, 2));
        return { success: true };
    } catch (e) {
        console.error("Error saving SMTP config:", e);
        return { success: false, error: e.message };
    }
}

// Email Helper
async function sendEmail(config, subject, text) {
    if (!config) return { success: false, error: "No configuration" };

    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: parseInt(config.port),
            secure: config.secure, // true for 465, false for other ports
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        const info = await transporter.sendMail({
            from: config.from,
            to: config.to,
            subject: subject,
            text: text,
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message };
    }
}

let mainWindow;
let targets = loadTargets();

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#121212',
        autoHideMenuBar: true,
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    // mainWindow.webContents.openDevTools(); // Optional for debugging
};

app.on('ready', () => {
    createWindow();
    startPinging();
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

// IPC Handlers
ipcMain.handle('get-targets', () => {
    return targets;
});

ipcMain.on('update-targets', (event, newTargets) => {
    targets = newTargets;
    saveTargets(targets);
});

// SMTP IPC Handlers
ipcMain.handle('get-smtp-config', () => {
    return loadSmtpConfig();
});

ipcMain.handle('save-smtp-config', (event, config) => {
    return saveSmtpConfig(config);
});

ipcMain.handle('send-test-email', async (event, config) => {
    return await sendEmail(config, "ProPing Monitor - Test Email", "This is a test email to verify your SMTP configuration.");
});

ipcMain.on('send-alert-email', async (event, data) => {
    const config = loadSmtpConfig();
    if (config) {
        const subject = `ALERT: ${data.targetName} (${data.ip}) is DOWN`;
        const text = `Target Down Alert!\n\nTarget: ${data.targetName}\nIP: ${data.ip}\nTime: ${new Date().toLocaleString()}\n\nPlease check the system.`;
        await sendEmail(config, subject, text);
    }
});

// Pinging Login
let pingInterval;

function startPinging() {
    if (pingInterval) clearInterval(pingInterval);


    pingInterval = setInterval(() => {

        if (targets.length === 0) return;

        targets.forEach(async (target) => {

            try {
                const res = await ping.promise.probe(target.ip, {
                    timeout: 2, // seconds
                    extra: ["-n", "1"]
                });



                if (mainWindow) {
                    mainWindow.webContents.send('ping-result', {
                        id: target.id,
                        alive: res.alive,
                        time: res.time,
                        output: res.output
                    });

                } else {

                }
            } catch (err) {
                console.error(`Ping failed for ${target.ip}:`, err);
            }
        });
    }, 2000); // Ping every 2 seconds
}

