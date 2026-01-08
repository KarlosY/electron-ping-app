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

// Create a simple Beep using AudioContext
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep() {
    // Resume context if suspended (browser autoplay policy)
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

function addLogEntry(text, type) {
    if (!logEntriesEl) return;

    // Clear initial "waiting" message if present
    if (logEntriesEl.querySelector('.log-entry') && logEntriesEl.children[0].innerText === 'Waiting for events...') {
        logEntriesEl.innerHTML = '';
    }

    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    div.innerText = `[${time}] ${text}`;
    logEntriesEl.prepend(div);

    if (logEntriesEl.children.length > 50) {
        logEntriesEl.lastElementChild.remove();
    }
}

window.pingApp.onPingResult((result) => {
    const { id, alive, time } = result;
    const statusEl = document.getElementById(`status-${id}`);
    const latencyEl = document.getElementById(`latency-${id}`);
    const barEl = document.getElementById(`bar-${id}`);

    const target = targets.find(t => t.id === id);
    const targetName = target ? target.name : id;

    // Check for state change
    // Using strict checking against cache
    if (prevStatuses[id] !== undefined) {
        // UP -> DOWN (alive went from true to false)
        if (prevStatuses[id] === true && !alive) {
            console.log('Target DOWN detected:', targetName); // Debug
            playBeep();

            // Try Notification
            if (Notification.permission === 'granted' || Notification.permission === 'default') {
                new Notification('Connection Lost', { body: `${targetName} is DOWN` });
            }

            addLogEntry(`${targetName} is DOWN!`, 'down');
        }
        // DOWN -> UP (alive went from false to true)
        else if (prevStatuses[id] === false && alive) {
            addLogEntry(`${targetName} reconnected.`, 'up');
        }
    } else {
        // Initial state
        prevStatuses[id] = alive;
        // Optional: log initial state? No, too spammy.
    }

    // Update state cache ALWAYS
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
