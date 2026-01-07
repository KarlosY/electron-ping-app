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
        // Bind click via closure or simple onclick (need to expose removeTarget globally for onclick string)
        div.querySelector('.delete-btn').onclick = () => removeTarget(target.id);
        targetListEl.appendChild(div);
    });
}

function renderDashboard() {
    // Only add new cards, don't re-render everything to avoid flickering
    // Actually, for simplicity, let's just make sure cards exist.

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

// IPC Listeners
window.pingApp.onPingResult((result) => {
    const { id, alive, time } = result;
    const statusEl = document.getElementById(`status-${id}`);
    const latencyEl = document.getElementById(`latency-${id}`);
    const barEl = document.getElementById(`bar-${id}`);

    if (statusEl && latencyEl) {
        if (alive) {
            statusEl.classList.add('status-valid');
            statusEl.classList.remove('status-invalid');
            latencyEl.innerHTML = `${Math.round(time)} <span>ms</span>`;

            // Visual flair: bar width based on latency (clamped)
            // Assuming 0-200ms scale for bar
            const percent = Math.min((time / 200) * 100, 100);
            if (barEl) barEl.style.width = `${percent}%`;
            if (barEl) barEl.style.backgroundColor = time > 100 ? '#ffb300' : 'var(--accent-color)';
        } else {
            statusEl.classList.add('status-invalid');
            statusEl.classList.remove('status-valid');
            latencyEl.innerHTML = `TIMEOUT`;
            if (barEl) barEl.style.width = '100%';
            if (barEl) barEl.style.backgroundColor = 'var(--error-color)';
        }
    }
});
