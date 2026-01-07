const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pingApp', {
    updateTargets: (targets) => ipcRenderer.send('update-targets', targets),
    onPingResult: (callback) => ipcRenderer.on('ping-result', (event, result) => callback(result)),
    // Optional: Get initial state if needed
    getTargets: () => ipcRenderer.invoke('get-targets')
});
