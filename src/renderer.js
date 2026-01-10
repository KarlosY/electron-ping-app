// State
let targets = [];

// DOM Elements
const nameInput = document.getElementById('targetName');
const ipInput = document.getElementById('targetIp');
const addBtn = document.getElementById('addBtn');
const targetListEl = document.getElementById('targetList');
const dashboardEl = document.getElementById('dashboard');
const toggleBtn = document.getElementById('toggleBtn');
const sidebar = document.getElementById('sidebar');
const logEntriesEl = document.getElementById('logEntries');
const activityLogEl = document.getElementById('activityLog'); // Main container

// Sidebar Toggle
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// Init
async function init() {
    targets = await window.pingApp.getTargets();
    renderTargetList();
    renderDashboard();
}
init();

// Handlers
addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const ip = ipInput.value.trim();

    if (name && ip) {
        const id = Date.now().toString();
        const newTarget = { id, name, ip };
        targets.push(newTarget);

        // Update UI
        renderTargetList();
        renderDashboard();

        // Notify Main Process
        window.pingApp.updateTargets(targets);

        // Clear inputs
        nameInput.value = '';
        ipInput.value = '';
    }
});

function removeTarget(id) {
    targets = targets.filter(t => t.id !== id);
    renderTargetList();
    renderDashboard(); // Remove card
    window.pingApp.updateTargets(targets);
}

function renderTargetList() {
    targetListEl.innerHTML = '';
    targets.forEach(target => {
        const div = document.createElement('div');
        div.className = 'target-item';
        div.innerHTML = `
            <span>${target.name} <br><small style="color:#777">${target.ip}</small></span>
            <button class="delete-btn" onclick="removeTarget('${target.id}')">×</button>
        `;
        // Bind click via closure
        div.querySelector('.delete-btn').onclick = () => removeTarget(target.id);
        targetListEl.appendChild(div);
    });
}

function renderDashboard() {
    targets.forEach(target => {
        let card = document.getElementById(`card-${target.id}`);
        if (!card) {
            card = document.createElement('div');
            card.id = `card-${target.id}`;
            card.className = 'ping-card';
            // Attach click listener for selection
            card.onclick = () => selectTarget(target.id);

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${target.name}</span>
                    <div class="status-indicator" id="status-${target.id}"></div>
                </div>
                <div class="card-ip">${target.ip}</div>
                <div class="ping-details">
                    <div class="latency" id="latency-${target.id}">-- <span>ms</span></div>
                </div>
                <div class="history-graph">
                    <div class="history-bar" id="bar-${target.id}"></div>
                </div>
            `;
            dashboardEl.appendChild(card);
        }
    });

    // Remove old cards
    const currentIds = targets.map(t => `card-${t.id}`);
    Array.from(dashboardEl.children).forEach(child => {
        if (!currentIds.includes(child.id)) {
            child.remove();
        }
    });
}

// IPC Listeners & Logic
const prevStatuses = {}; // Track previous state
let selectedTargetId = null; // Track selected target for filtering

// Create a simple Beep using AudioContext
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
}

function selectTarget(id) {
    // Toggle selection
    if (selectedTargetId === id) {
        selectedTargetId = null; // Deselect
    } else {
        selectedTargetId = id;
    }

    // Update Visuals for Cards
    document.querySelectorAll('.ping-card').forEach(card => {
        if (card.id === `card-${selectedTargetId}`) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Toggle Log Visibility and Title
    if (selectedTargetId) {
        activityLogEl.classList.add('visible');
        const target = targets.find(t => t.id === selectedTargetId);
        const title = activityLogEl.querySelector('h3');
        if (title && target) title.innerText = `Log de Actividad: ${target.name}`;
    } else {
        activityLogEl.classList.remove('visible');
    }

    filterLogs();
}

function filterLogs() {
    if (!logEntriesEl) return;
    const entries = logEntriesEl.children;
    for (let entry of entries) {
        if (!selectedTargetId) {
            // Technically hidden container, but if we were showing all...
            // In this specific requirement, we only show WHEN selected.
            // But if we ever show all, this ensures they are block.
            entry.style.display = 'block';
        } else {
            const entryTargetId = entry.getAttribute('data-target-id');
            if (entryTargetId === selectedTargetId) {
                entry.style.display = 'block';
            } else {
                entry.style.display = 'none';
            }
        }
    }
}

function addLogEntry(text, type, targetId = null) {
    if (!logEntriesEl) return;

    // Clear initial waiting message
    if (logEntriesEl.querySelector('.log-entry') && logEntriesEl.children[0].innerText === 'Waiting for events...') {
        logEntriesEl.innerHTML = '';
    }

    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    if (targetId) div.setAttribute('data-target-id', targetId);

    const time = new Date().toLocaleTimeString();
    div.innerText = `[${time}] ${text}`;
    logEntriesEl.prepend(div);

    // Apply visibility immediately based on selection
    if (selectedTargetId && targetId && targetId !== selectedTargetId) {
        div.style.display = 'none';
    } else {
        div.style.display = 'block';
    }

    if (logEntriesEl.children.length > 50) {
        logEntriesEl.lastElementChild.remove();
    }
}

// Make selectTarget available globally if needed for onclick attributes (though we attach via JS now)
window.selectTarget = selectTarget;

// SMTP Modal Logic
const smtpModal = document.getElementById('smtpModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeModal = document.getElementById('closeModal');
const saveSmtpBtn = document.getElementById('saveSmtpBtn');
const testSmtpBtn = document.getElementById('testSmtpBtn');
const smtpStatus = document.getElementById('smtpStatus');

// Inputs
const smtpHost = document.getElementById('smtpHost');
const smtpPort = document.getElementById('smtpPort');
const smtpSecure = document.getElementById('smtpSecure');
const smtpUser = document.getElementById('smtpUser');
const smtpPass = document.getElementById('smtpPass');
const smtpFrom = document.getElementById('smtpFrom');
const smtpTo = document.getElementById('smtpTo');

settingsBtn.addEventListener('click', async () => {
    smtpModal.classList.add('visible');
    // Load existing config
    const config = await window.pingApp.getSmtpConfig();
    if (config) {
        smtpHost.value = config.host || '';
        smtpPort.value = config.port || '';
        smtpSecure.checked = config.secure || false;
        smtpUser.value = config.user || '';
        smtpPass.value = config.pass || '';
        smtpFrom.value = config.from || '';
        smtpTo.value = config.to || '';
    }
});

closeModal.addEventListener('click', () => {
    smtpModal.classList.remove('visible');
    smtpStatus.innerText = '';
});

// Close on outside click
window.onclick = (event) => {
    if (event.target == smtpModal) {
        smtpModal.classList.remove('visible');
        smtpStatus.innerText = '';
    }
}

function getSmtpForm() {
    return {
        host: smtpHost.value.trim(),
        port: parseInt(smtpPort.value.trim()),
        secure: smtpSecure.checked,
        user: smtpUser.value.trim(),
        pass: smtpPass.value.trim(),
        from: smtpFrom.value.trim(),
        to: smtpTo.value.trim()
    };
}

saveSmtpBtn.addEventListener('click', async () => {
    const config = getSmtpForm();
    if (!config.host || !config.user || !config.pass) {
        smtpStatus.innerText = 'Please fill required fields (Host, User, Pass)';
        smtpStatus.style.color = 'var(--error-color)';
        return;
    }

    const res = await window.pingApp.saveSmtpConfig(config);
    if (res.success) {
        smtpStatus.innerText = 'Configuration Saved!';
        smtpStatus.style.color = 'var(--success-color)';
        setTimeout(() => smtpModal.classList.remove('visible'), 1500);
    } else {
        smtpStatus.innerText = 'Error saving: ' + res.error;
        smtpStatus.style.color = 'var(--error-color)';
    }
});

testSmtpBtn.addEventListener('click', async () => {
    const config = getSmtpForm();
    smtpStatus.innerText = 'Sending test email...';
    smtpStatus.style.color = '#fff';

    const res = await window.pingApp.sendTestEmail(config);
    if (res.success) {
        smtpStatus.innerText = 'Test Email Sent successfully!';
        smtpStatus.style.color = 'var(--success-color)';
    } else {
        smtpStatus.innerText = 'Error sending: ' + res.error;
        smtpStatus.style.color = 'var(--error-color)';
    }
});

// Log entries helper (Modified to existing code, no changes needed here but preserving logic flow)

window.pingApp.onPingResult((result) => {
    const { id, alive, time } = result;
    const statusEl = document.getElementById(`status-${id}`);
    const latencyEl = document.getElementById(`latency-${id}`);
    const barEl = document.getElementById(`bar-${id}`);
    const cardEl = document.getElementById(`card-${id}`);

    // Ensure click handler is attached (safeguard)
    if (cardEl && !cardEl.onclick) {
        cardEl.onclick = () => selectTarget(id);
    }

    const target = targets.find(t => t.id === id);
    const targetName = target ? target.name : id;

    // Check for state change
    if (prevStatuses[id] !== undefined) {
        if (prevStatuses[id] === true && !alive) {
            playBeep();
            if (Notification.permission === 'granted' || Notification.permission === 'default') {
                new Notification('Connection Lost', { body: `${targetName} is DOWN` });
            }
            addLogEntry(`${targetName} is DOWN!`, 'down', id);

            // TRIGGER EMAIL ALERT
            window.pingApp.sendAlertEmail({
                targetName: targetName,
                ip: target.ip,
                time: new Date().toISOString()
            });
        }
        else if (prevStatuses[id] === false && alive) {
            addLogEntry(`${targetName} reconnected.`, 'up', id);
        }
    } else {
        prevStatuses[id] = alive;
    }

    prevStatuses[id] = alive;

    if (statusEl && latencyEl) {
        if (alive) {
            statusEl.classList.add('status-valid');
            statusEl.classList.remove('status-invalid');
            latencyEl.innerHTML = `${Math.round(time)} <span>ms</span>`;

            const percent = Math.min((time / 200) * 100, 100);
            if (barEl) {
                barEl.style.width = `${percent}%`;
                barEl.style.backgroundColor = time > 100 ? '#ffb300' : 'var(--accent-color)';
            }
        } else {
            statusEl.classList.add('status-invalid');
            statusEl.classList.remove('status-valid');
            latencyEl.innerHTML = `TIMEOUT`;
            if (barEl) {
                barEl.style.width = '100%';
                barEl.style.backgroundColor = 'var(--error-color)';
            }
        }
    }
});
