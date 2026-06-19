const STORAGE_KEY = 'videoEditingTracker';
const TASKS = ['import', 'rough', 'audio', 'color', 'vfx', 'titles', 'sound', 'export'];

function loadProjects() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / 86400000);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderStats() {
    const projects = loadProjects();
    const total = projects.length;
    const active = projects.filter(p => p.status !== 'Delivered').length;
    const delivered = total - active;
    const avgProgress = total ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / total) : 0;
    const overdue = projects.filter(p => p.status !== 'Delivered' && daysUntil(p.deadline) !== null && daysUntil(p.deadline) < 0).length;

    document.getElementById('statsBar').innerHTML = `
        <div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
        <div class="stat"><div class="stat-value">${active}</div><div class="stat-label">Active</div></div>
        <div class="stat"><div class="stat-value">${delivered}</div><div class="stat-label">Delivered</div></div>
        <div class="stat"><div class="stat-value">${avgProgress}%</div><div class="stat-label">Avg Progress</div></div>
        ${overdue ? `<div class="stat"><div class="stat-value" style="color:#e74c3c">${overdue}</div><div class="stat-label">Overdue</div></div>` : ''}
    `;
}

function renderProjects() {
    const projects = loadProjects();
    const statusFilter = document.getElementById('filterStatus').value;
    const priorityFilter = document.getElementById('filterPriority').value;
    const sortBy = document.getElementById('sortBy').value;

    let filtered = projects.filter(p => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
        return true;
    });

    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    filtered.sort((a, b) => {
        if (sortBy === 'deadline') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
        if (sortBy === 'progress') return b.progress - a.progress;
        return 0;
    });

    const grid = document.getElementById('projectsGrid');
    const empty = document.getElementById('emptyState');

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = filtered.map(p => {
        const days = daysUntil(p.deadline);
        let deadlineClass = '';
        let deadlineText = p.deadline ? formatDate(p.deadline) : 'No deadline';
        if (days !== null && p.status !== 'Delivered') {
            if (days < 0) { deadlineClass = 'deadline-overdue'; deadlineText += ` (${Math.abs(days)}d overdue)`; }
            else if (days <= 3) { deadlineClass = 'deadline-warning'; deadlineText += ` (${days}d left)`; }
        }

        const checklist = TASKS.map(t =>
            `<div class="check-dot ${p.checklist && p.checklist[t] ? 'done' : ''}" title="${t}"></div>`
        ).join('');

        return `
        <div class="project-card" data-id="${p.id}">
            <div class="card-header">
                <h3>${escapeHtml(p.name)}</h3>
                <span class="badge badge-priority-${p.priority}">${p.priority}</span>
            </div>
            <div class="card-meta">
                ${p.client ? `<span>Client: ${escapeHtml(p.client)}</span>` : ''}
                <span>${p.videoType}</span>
                ${p.duration ? `<span>${p.duration} min</span>` : ''}
            </div>
            <span class="badge badge-status" data-status="${p.status}">${p.status}</span>
            <div style="margin-top:12px">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill ${p.progress === 100 ? 'complete' : ''}" style="width:${p.progress}%"></div>
                </div>
                <div class="card-footer">
                    <span>${p.progress}% complete</span>
                    <span class="${deadlineClass}">${deadlineText}</span>
                </div>
            </div>
            <div class="card-checklist">${checklist}</div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.id));
    });
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function openModal(id) {
    const modal = document.getElementById('modalOverlay');
    const form = document.getElementById('projectForm');
    form.reset();

    if (id) {
        const p = loadProjects().find(p => p.id === id);
        if (!p) return;
        document.getElementById('modalTitle').textContent = 'Edit Project';
        document.getElementById('projectId').value = p.id;
        document.getElementById('projectName').value = p.name;
        document.getElementById('clientName').value = p.client || '';
        document.getElementById('videoType').value = p.videoType;
        document.getElementById('duration').value = p.duration || '';
        document.getElementById('status').value = p.status;
        document.getElementById('priority').value = p.priority;
        document.getElementById('deadline').value = p.deadline || '';
        document.getElementById('progress').value = p.progress;
        document.getElementById('progressValue').textContent = p.progress;
        document.getElementById('notes').value = p.notes || '';
        TASKS.forEach(t => {
            const cb = document.querySelector(`#checklist input[data-task="${t}"]`);
            if (cb) cb.checked = p.checklist && p.checklist[t];
        });
        document.getElementById('deleteBtn').style.display = 'block';
    } else {
        document.getElementById('modalTitle').textContent = 'New Project';
        document.getElementById('projectId').value = '';
        document.getElementById('progressValue').textContent = '0';
        document.getElementById('deleteBtn').style.display = 'none';
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

document.getElementById('addProjectBtn').addEventListener('click', () => openModal(null));
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
});

document.getElementById('progress').addEventListener('input', e => {
    document.getElementById('progressValue').textContent = e.target.value;
});

document.getElementById('projectForm').addEventListener('submit', e => {
    e.preventDefault();
    const projects = loadProjects();
    const id = document.getElementById('projectId').value;
    const checklist = {};
    TASKS.forEach(t => {
        checklist[t] = document.querySelector(`#checklist input[data-task="${t}"]`).checked;
    });

    const data = {
        name: document.getElementById('projectName').value.trim(),
        client: document.getElementById('clientName').value.trim(),
        videoType: document.getElementById('videoType').value,
        duration: parseFloat(document.getElementById('duration').value) || 0,
        status: document.getElementById('status').value,
        priority: document.getElementById('priority').value,
        deadline: document.getElementById('deadline').value,
        progress: parseInt(document.getElementById('progress').value),
        notes: document.getElementById('notes').value.trim(),
        checklist,
    };

    if (id) {
        const idx = projects.findIndex(p => p.id === id);
        if (idx !== -1) {
            projects[idx] = { ...projects[idx], ...data, updatedAt: new Date().toISOString() };
        }
    } else {
        projects.push({ id: generateId(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    saveProjects(projects);
    closeModal();
    render();
});

document.getElementById('deleteBtn').addEventListener('click', () => {
    const id = document.getElementById('projectId').value;
    if (!id || !confirm('Delete this project?')) return;
    const projects = loadProjects().filter(p => p.id !== id);
    saveProjects(projects);
    closeModal();
    render();
});

['filterStatus', 'filterPriority', 'sortBy'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderProjects);
});

function render() {
    renderStats();
    renderProjects();
}

render();
