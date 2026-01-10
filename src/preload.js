const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pingApp', {
    getTargets: () => ipcRenderer.invoke('get-targets'),
    updateTargets: (targets) => ipcRenderer.send('update-targets', targets),
    onPingResult: (callback) => ipcRenderer.on('ping-result', (event, result) => callback(result)),
    // SMTP API
    getSmtpConfig: () => ipcRenderer.invoke('get-smtp-config'),
    saveSmtpConfig: (config) => ipcRenderer.invoke('save-smtp-config', config),
    sendTestEmail: (config) => ipcRenderer.invoke('send-test-email', config),
    sendAlertEmail: (data) => ipcRenderer.send('send-alert-email', data)
});
