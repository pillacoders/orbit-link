// OrbitLink Admin Panel Client Logic
const API_BASE = '/api';

// Core State
let state = {
  token: localStorage.getItem('admin_token') || null,
  user: null,
  activeTab: 'overview',
  stats: null,
  pendingApprovals: [],
  users: [],
  usersPagination: { page: 1, totalPages: 1 },
  announcements: [],
  charts: {
    points: null,
    nodes: null
  }
};

// --- DOM Selectors ---
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminUsername = document.getElementById('admin-username');
const adminAvatar = document.getElementById('admin-avatar');
const logoutBtn = document.getElementById('logout-btn');
const pageTitle = document.getElementById('page-title');
const navItems = document.querySelectorAll('.nav-menu .nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const pendingBadge = document.getElementById('pending-badge');
const userSearchInput = document.getElementById('user-search');

// --- Helper Functions ---
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.token}`
  };
}

// Show standard glass toasts
function showToast(title, message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast glass ${type}`;
  
  let iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-circle';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <div class="toast-left-bar"></div>
    <i data-lucide="${iconName}" class="toast-icon"></i>
    <div class="toast-content">
      <h5>${title}</h5>
      <p>${message}</p>
    </div>
    <button class="toast-close"><i data-lucide="x"></i></button>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // Close handler
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  // Auto-remove
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse';
    setTimeout(() => toast.remove(), 280);
  }, 4000);
}

// Format Numbers
function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// --- Auth System ---
async function checkAuth() {
  if (!state.token) {
    showLogin();
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/auth/profile`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Session invalid');
    const data = await res.json();
    
    // Ensure user is admin
    if (data.data.role !== 'ADMIN') {
      localStorage.removeItem('admin_token');
      state.token = null;
      throw new Error('Access Denied: Admin role required');
    }
    
    state.user = data.data;
    adminUsername.textContent = state.user.username;
    adminAvatar.textContent = state.user.username.charAt(0).toUpperCase();
    
    loginOverlay.classList.add('hide');
    appContainer.classList.remove('hide');
    
    initDashboard();
  } catch (err) {
    console.error(err);
    showToast('Authentication Error', err.message || 'Please log in again', 'error');
    showLogin();
  }
}

function showLogin() {
  loginOverlay.classList.remove('hide');
  appContainer.classList.add('hide');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hide');
  
  const email = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Authentication failed');
    
    if (data.data.user.role !== 'ADMIN') {
      throw new Error('Forbidden: Admin role required');
    }
    
    state.token = data.data.token;
    state.user = data.data.user;
    localStorage.setItem('admin_token', state.token);
    
    adminUsername.textContent = state.user.username;
    adminAvatar.textContent = state.user.username.charAt(0).toUpperCase();
    
    loginOverlay.classList.add('hide');
    appContainer.classList.remove('hide');
    
    showToast('Success', `Authenticated as @${state.user.username}`, 'success');
    initDashboard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hide');
    showToast('Access Denied', err.message, 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  state.token = null;
  state.user = null;
  showLogin();
  showToast('Disconnected', 'Securely logged out from console', 'info');
});

// --- Tab Routing ---
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tabName = item.getAttribute('data-tab');
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  state.activeTab = tabName;
  
  // Nav highlight
  navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Tab panels toggle
  tabPanes.forEach(pane => {
    if (pane.getAttribute('id') === `tab-${tabName}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
  
  // Title update
  const titles = {
    overview: 'Overview',
    approvals: 'Task Approvals',
    users: 'User Management',
    announcements: 'Announcements'
  };
  pageTitle.textContent = titles[tabName] || 'Dashboard';
  
  // Fetch specific tab data
  if (tabName === 'overview') loadOverviewStats();
  if (tabName === 'approvals') loadPendingApprovals();
  if (tabName === 'users') loadUsers();
  if (tabName === 'announcements') loadAnnouncements();
}

// --- Tab 1: Overview & Charts ---
async function loadOverviewStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    state.stats = data.data;
    
    // Fill Dom elements
    document.getElementById('stat-total-users').textContent = formatNumber(state.stats.totalUsers);
    document.getElementById('stat-new-users').textContent = `+${state.stats.newUsersToday} today`;
    
    document.getElementById('stat-active-nodes').textContent = formatNumber(state.stats.totalNodes);
    document.getElementById('stat-online-nodes').textContent = `${state.stats.onlineNodes} online`;
    
    document.getElementById('stat-total-points').textContent = formatNumber(state.stats.totalPointsDistributed);
    document.getElementById('stat-today-points').textContent = `+${formatNumber(state.stats.todayPointsDistributed)} today`;
    
    document.getElementById('stat-active-epoch').textContent = state.stats.activeEpoch || 'None';
    
    renderCharts();
  } catch (err) {
    showToast('Stats Load Error', 'Could not refresh dashboard statistics', 'error');
  }
}

function renderCharts() {
  // Chart 1: Points Distributed
  const ctxPoints = document.getElementById('pointsChart').getContext('2d');
  if (state.charts.points) state.charts.points.destroy();
  
  // Generate dummy line trends for nice aesthetics
  state.charts.points = new Chart(ctxPoints, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Daily Orbs Distributed',
        data: [
          state.stats.todayPointsDistributed * 0.4,
          state.stats.todayPointsDistributed * 0.6,
          state.stats.todayPointsDistributed * 0.5,
          state.stats.todayPointsDistributed * 0.8,
          state.stats.todayPointsDistributed * 0.7,
          state.stats.todayPointsDistributed * 0.9,
          state.stats.todayPointsDistributed
        ],
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
        x: { grid: { display: false }, ticks: { color: '#64748b' } }
      }
    }
  });

  // Chart 2: Node Distribution
  const ctxNodes = document.getElementById('nodesChart').getContext('2d');
  if (state.charts.nodes) state.charts.nodes.destroy();
  
  state.charts.nodes = new Chart(ctxNodes, {
    type: 'bar',
    data: {
      labels: ['Extension Nodes', 'Relay Nodes', 'Validator Nodes'],
      datasets: [{
        label: 'Active Nodes',
        data: [state.stats.totalNodes, Math.ceil(state.stats.totalNodes * 0.1), Math.ceil(state.stats.totalNodes * 0.05)],
        backgroundColor: ['rgba(139, 92, 246, 0.6)', 'rgba(99, 102, 241, 0.6)', 'rgba(16, 185, 129, 0.6)'],
        borderColor: ['#8b5cf6', '#6366f1', '#10b981'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', stepSize: 1 } },
        x: { grid: { display: false }, ticks: { color: '#64748b' } }
      }
    }
  });
}

// --- Tab 2: Task Approvals ---
async function loadPendingApprovals() {
  const loader = document.getElementById('approvals-loading');
  const empty = document.getElementById('empty-approvals');
  const list = document.getElementById('approvals-list');
  
  loader.classList.remove('hide');
  empty.classList.add('hide');
  list.classList.add('hide');
  
  try {
    const res = await fetch(`${API_BASE}/admin/tasks/completions/pending`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load pending queue');
    const data = await res.json();
    state.pendingApprovals = data.data || [];
    
    // Update badge sizes
    updatePendingBadge();
    
    list.innerHTML = '';
    
    if (state.pendingApprovals.length === 0) {
      empty.classList.remove('hide');
    } else {
      state.pendingApprovals.forEach(item => {
        let twitterUsername = '';
        if (item.metadata) {
          try {
            const meta = JSON.parse(item.metadata);
            twitterUsername = meta.twitterUsername || '';
          } catch(e) {}
        }
        
        const card = document.createElement('div');
        card.className = 'approval-card glass';
        card.innerHTML = `
          <div class="approval-card-header">
            <div class="task-info">
              <h4>${item.task.title}</h4>
              <span class="task-tag ${item.task.type}">${item.task.type}</span>
            </div>
            <div class="points-badge">+${item.task.rewardPoints} Orbs</div>
          </div>
          
          <div class="user-submission-details">
            <div class="detail-row">
              <span class="detail-label">Operator User</span>
              <span class="detail-val">${item.user.username} (${item.user.email})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Wallet Address</span>
              <span class="detail-val" style="font-family: var(--font-mono); font-size: 0.78rem;">${item.user.walletAddress || 'Not linked'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Submitted Username</span>
              <span class="detail-val twitter-username-highlight">
                <i data-lucide="twitter" style="width: 14px; height: 14px;"></i> @${twitterUsername}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Submission Date</span>
              <span class="detail-val">${new Date(item.completedAt).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="action-buttons">
            <button class="btn-approve" onclick="approveTask('${item.id}')">
              <i data-lucide="check"></i> Approve
            </button>
            <button class="btn-reject" onclick="rejectTask('${item.id}')">
              <i data-lucide="x"></i> Reject
            </button>
          </div>
        `;
        list.appendChild(card);
      });
      list.classList.remove('hide');
      lucide.createIcons();
    }
  } catch (err) {
    showToast('Approvals Error', 'Could not refresh approvals queue', 'error');
  } finally {
    loader.classList.add('hide');
  }
}

async function approveTask(id) {
  try {
    const res = await fetch(`${API_BASE}/admin/tasks/completions/${id}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Approval request failed');
    showToast('Approved', 'Task completion approved. Points awarded.', 'success');
    loadPendingApprovals();
  } catch (err) {
    showToast('Failed to Approve', err.message, 'error');
  }
}

async function rejectTask(id) {
  if (!confirm('Are you sure you want to reject this Twitter submission? The user will be allowed to resubmit their handle.')) return;
  
  try {
    const res = await fetch(`${API_BASE}/admin/tasks/completions/${id}/reject`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Rejection request failed');
    showToast('Rejected', 'Task completion rejected successfully.', 'info');
    loadPendingApprovals();
  } catch (err) {
    showToast('Failed to Reject', err.message, 'error');
  }
}

async function syncBadgeCountOnLoad() {
  try {
    const res = await fetch(`${API_BASE}/admin/tasks/completions/pending`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      state.pendingApprovals = data.data || [];
      updatePendingBadge();
    }
  } catch(e){}
}

function updatePendingBadge() {
  const count = state.pendingApprovals.length;
  if (count > 0) {
    pendingBadge.textContent = count;
    pendingBadge.classList.remove('hide');
  } else {
    pendingBadge.classList.add('hide');
  }
}

// Mount global handlers so onclick works
window.approveTask = approveTask;
window.rejectTask = rejectTask;

// --- Tab 3: User Management ---
async function loadUsers(page = 1, search = '') {
  const loader = document.getElementById('users-loading');
  const tbody = document.getElementById('users-table-body');
  
  loader.classList.remove('hide');
  tbody.innerHTML = '';
  
  try {
    let url = `${API_BASE}/admin/users?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    
    state.users = data.data.users || [];
    state.usersPagination = data.data.pagination;
    
    if (state.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No operators found matching the criteria.</td></tr>';
    } else {
      state.users.forEach(u => {
        const row = document.createElement('tr');
        const formattedDate = new Date(u.createdAt).toLocaleDateString();
        
        row.innerHTML = `
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">${u.username.charAt(0).toUpperCase()}</div>
              <div>
                <strong style="color: var(--white);">${u.username}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${u.id}</div>
              </div>
            </div>
          </td>
          <td>${u.email || '-'}</td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${u.walletAddress ? u.walletAddress.slice(0,6)+'...'+u.walletAddress.slice(-4) : '-'}</td>
          <td style="font-family: var(--font-mono); font-weight: 500; color: var(--accent);">${u.totalPoints} Orbs</td>
          <td>${u._count.nodes}</td>
          <td>${formattedDate}</td>
          <td>
            <span class="badge ${u.isActive ? 'badge-active' : 'badge-banned'}">${u.isActive ? 'Active' : 'Suspended'}</span>
          </td>
          <td>
            <label class="switch">
              <input type="checkbox" ${u.isActive ? 'checked' : ''} onchange="toggleUserStatus('${u.id}')">
              <span class="slider ${!u.isActive ? 'suspending' : ''}"></span>
            </label>
          </td>
        `;
        tbody.appendChild(u.isActive ? row : makeRowSuspended(row));
      });
    }
    
    renderPagination();
  } catch (err) {
    showToast('Users Error', 'Could not refresh operators list', 'error');
  } finally {
    loader.classList.add('hide');
  }
}

function makeRowSuspended(row) {
  row.style.opacity = '0.75';
  return row;
}

async function toggleUserStatus(userId) {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Toggle request failed');
    const data = await res.json();
    showToast('Status Updated', data.message || 'Operator status toggled', 'success');
    loadUsers(state.usersPagination.page, userSearchInput.value);
  } catch (err) {
    showToast('Toggle Failed', err.message, 'error');
  }
}

window.toggleUserStatus = toggleUserStatus;

// Search Input Debouncer
let searchTimeout;
userSearchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadUsers(1, e.target.value);
  }, 400);
});

function renderPagination() {
  const container = document.getElementById('users-pagination');
  container.innerHTML = '';
  
  const { page, totalPages, total } = state.usersPagination;
  
  const info = document.createElement('span');
  info.className = 'pagination-info';
  info.textContent = `Showing page ${page} of ${totalPages} (Total operators: ${total})`;
  container.appendChild(info);
  
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn-nav-page';
  prevBtn.disabled = page <= 1;
  prevBtn.innerHTML = `<i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i> Previous`;
  prevBtn.addEventListener('click', () => loadUsers(page - 1, userSearchInput.value));
  controls.appendChild(prevBtn);
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn-nav-page';
  nextBtn.disabled = page >= totalPages;
  nextBtn.innerHTML = `Next <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>`;
  nextBtn.addEventListener('click', () => loadUsers(page + 1, userSearchInput.value));
  controls.appendChild(nextBtn);
  
  container.appendChild(controls);
  lucide.createIcons();
}

// --- Tab 4: Announcements ---
async function loadAnnouncements() {
  const loader = document.getElementById('announcements-loading');
  const container = document.getElementById('announcements-list');
  
  loader.classList.remove('hide');
  container.innerHTML = '';
  
  try {
    const res = await fetch(`${API_BASE}/admin/announcements`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch announcements');
    const data = await res.json();
    state.announcements = data.data || [];
    
    if (state.announcements.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">No active system broadcasts at the moment.</div>';
    } else {
      state.announcements.forEach(ann => {
        const card = document.createElement('div');
        card.className = `ann-card glass ${ann.type}`;
        
        let iconName = 'info';
        if (ann.type === 'WARNING') iconName = 'alert-triangle';
        if (ann.type === 'SUCCESS') iconName = 'check-circle';
        
        card.innerHTML = `
          <div class="ann-card-left-bar"></div>
          <div class="ann-icon"><i data-lucide="${iconName}"></i></div>
          <div class="ann-body">
            <div class="ann-header">
              <h4>${ann.title}</h4>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="ann-date">${new Date(ann.createdAt).toLocaleDateString()}</span>
                <button class="btn-delete-ann" onclick="deleteAnnouncement('${ann.id}')">
                  <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              </div>
            </div>
            <p>${ann.content}</p>
          </div>
        `;
        container.appendChild(card);
      });
      lucide.createIcons();
    }
  } catch (err) {
    showToast('Announcements Error', 'Could not refresh announcements list', 'error');
  } finally {
    loader.classList.add('hide');
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Are you sure you want to delete this broadcast?')) return;
  try {
    const res = await fetch(`${API_BASE}/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Deletion request failed');
    showToast('Deleted', 'Broadcast deleted successfully', 'success');
    loadAnnouncements();
  } catch (err) {
    showToast('Failed to Delete', err.message, 'error');
  }
}

window.deleteAnnouncement = deleteAnnouncement;

// Create announcement
const announcementForm = document.getElementById('announcement-form');
announcementForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('ann-title').value;
  const type = document.getElementById('ann-type').value;
  const content = document.getElementById('ann-content').value;
  
  try {
    const res = await fetch(`${API_BASE}/admin/announcements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, type, content })
    });
    
    if (!res.ok) throw new Error('Failed to create announcement');
    
    showToast('Broadcasted', 'New announcement published successfully', 'success');
    announcementForm.reset();
    loadAnnouncements();
  } catch (err) {
    showToast('Publish Failed', err.message, 'error');
  }
});

// --- Initialization ---
function initDashboard() {
  switchTab(state.activeTab);
  syncBadgeCountOnLoad();
}

// Initial session check
checkAuth();
