/* ═══════════════════════════════════════════════
   ORBITLINK EXTENSION — POPUP CONTROLLER v3
   ═══════════════════════════════════════════════ */

const API_URL = 'http://localhost:4000/api';
const WEB_URL = 'http://localhost:3000';

// ─── State ───
let currentView = 'login';
let isSignupMode = false;
let userProfile = null;

// ─── DOM Ready ───
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initMenu();
  initBackButtons();
  initSidebarToggle();
  initSocialLogin();
  await checkAuth();
});

function initSidebarToggle() {
  const btn = document.getElementById('sidebar-toggle');
  if (btn) {
    btn.onclick = () => {
      chrome.windows.getCurrent({ populate: false }, (win) => {
        chrome.sidePanel.open({ windowId: win.id });
        window.close();
      });
    };
  }
}

// ═══════════════════════════════════════════════
// SOCIAL / WALLET LOGIN
// ═══════════════════════════════════════════════
function initSocialLogin() {
  const googleBtn = document.getElementById('btn-google-login');
  const walletBtn = document.getElementById('btn-wallet-login');

  if (googleBtn) {
    googleBtn.onclick = () => {
      chrome.tabs.create({ url: `${WEB_URL}/login?mode=google` });
    };
  }
  if (walletBtn) {
    walletBtn.onclick = () => {
      chrome.tabs.create({ url: `${WEB_URL}/login?mode=wallet` });
    };
  }
}

// ═══════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(`view-${viewId}`);
  if (view) {
    view.classList.add('active');
    currentView = viewId;
  }

  // Update menu active state
  document.querySelectorAll('.menu-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  // Close menu
  document.getElementById('menu-overlay').classList.remove('open');

  // Load data for specific views
  if (viewId === 'home') loadHomeData();
  if (viewId === 'boost') loadTasks();
  if (viewId === 'referrals') loadReferrals();
  if (viewId === 'profile') loadProfile();
}

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
async function checkAuth() {
  const data = await chrome.storage.local.get(['orbitlink_token']);
  if (data.orbitlink_token) {
    try {
      const profile = await apiRequest('/auth/profile', 'GET', null, data.orbitlink_token);
      if (profile.success && profile.data) {
        userProfile = profile.data;
        // Re-establish connection with the service worker
        chrome.runtime.sendMessage({ type: 'CONNECT', token: data.orbitlink_token });
        showView('home');
        return;
      }
    } catch (e) {
      // Token expired or invalid — clear everything
      await chrome.storage.local.remove([
        'orbitlink_token', 'orbitlink_connected', 'orbitlink_nodeId',
        'orbitlink_points_session', 'orbitlink_connection_quality',
      ]);
    }
  }
  showView('login');
  initLoginForm();
}

function initLoginForm() {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const usernameInput = document.getElementById('login-username');
  const continueBtn = document.getElementById('btn-continue');
  const toggleBtn = document.getElementById('btn-toggle-mode');
  const errorEl = document.getElementById('login-error');

  continueBtn.onclick = async () => {
    errorEl.style.display = 'none';
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showError(errorEl, 'Please fill in all fields');
      return;
    }

    continueBtn.disabled = true;
    continueBtn.textContent = isSignupMode ? 'Creating...' : 'Signing in...';

    try {
      let res;
      if (isSignupMode) {
        const username = usernameInput.value.trim();
        if (!username || username.length < 3) {
          showError(errorEl, 'Username must be at least 3 characters');
          resetBtn();
          return;
        }
        res = await apiRequest('/auth/signup', 'POST', { email, password, username });
      } else {
        res = await apiRequest('/auth/login', 'POST', { email, password });
      }

      if (res.success || res.data) {
        const token = res.data?.token || res.token;
        const user = res.data?.user || res.data;
        await chrome.storage.local.set({ orbitlink_token: token });
        userProfile = user;

        // Notify service worker to connect
        chrome.runtime.sendMessage({ type: 'SET_TOKEN', token });

        if (isSignupMode) {
          showView('terms');
          initTermsFlow();
        } else {
          showView('home');
        }
      }
    } catch (err) {
      showError(errorEl, err.message || 'Authentication failed');
      resetBtn();
    }

    function resetBtn() {
      continueBtn.disabled = false;
      continueBtn.textContent = 'Continue';
    }
  };

  toggleBtn.onclick = () => {
    isSignupMode = !isSignupMode;
    usernameInput.style.display = isSignupMode ? 'block' : 'none';
    toggleBtn.textContent = isSignupMode
      ? 'Already have an account? Log In'
      : "Don't have an account? Sign Up";
  };
}

function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

// ═══════════════════════════════════════════════
// TERMS & REFERRAL FLOW
// ═══════════════════════════════════════════════
function initTermsFlow() {
  document.getElementById('btn-accept-terms').onclick = () => {
    showView('referral');
    initReferralEntry();
  };
  document.getElementById('btn-decline-terms').onclick = () => {
    showView('referral');
    initReferralEntry();
  };
  document.getElementById('terms-close').onclick = () => {
    showView('referral');
    initReferralEntry();
  };
}

function initReferralEntry() {
  document.getElementById('btn-apply-referral').onclick = async () => {
    const code = document.getElementById('referral-code-input').value.trim();
    if (!code) return;
    try {
      showView('home');
    } catch (e) {
      console.error('Referral apply error:', e);
    }
  };

  document.getElementById('btn-skip-referral').onclick = () => {
    showView('home');
  };
}

// ═══════════════════════════════════════════════
// HOME VIEW
// ═══════════════════════════════════════════════
async function loadHomeData() {
  // Get status from service worker
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) return; // SW might be waking
    if (response) updateRing(response);
  });

  // Load profile data
  try {
    const token = await getToken();
    if (!token) return;

    const profile = await apiRequest('/auth/profile', 'GET', null, token);
    if (profile.success && profile.data) {
      userProfile = profile.data;
      document.getElementById('total-rewards').textContent =
        Math.round(profile.data.totalPoints || 0).toLocaleString();
      document.getElementById('ref-count').textContent =
        profile.data._count?.referralsMade || '0';
    }

    // Load epoch info
    try {
      const epoch = await apiRequest('/epochs/active', 'GET', null, token);
      if (epoch.success && epoch.data) {
        document.getElementById('epoch-rewards').textContent = '0';
      }
    } catch (e) {}

    // Load referral stats for count
    try {
      const refStats = await apiRequest('/referrals/stats', 'GET', null, token);
      if (refStats.data) {
        document.getElementById('ref-count').textContent =
          refStats.data.totalReferrals || '0';
      }
    } catch (e) {}
  } catch (err) {
    console.error('Home load error:', err);
  }

  // Copy referral code button
  document.getElementById('btn-copy-referral').onclick = async () => {
    const btn = document.getElementById('btn-copy-referral');
    if (userProfile?.referralCode) {
      await navigator.clipboard.writeText(`${WEB_URL}/signup?ref=${userProfile.referralCode}`);
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy Referral Code'; }, 2000);
    }
  };

  // Update timestamp
  document.getElementById('last-updated').textContent = 'Just now';
}

function updateRing(status) {
  const progress = document.getElementById('ring-progress');
  const percent = document.getElementById('ring-percent');
  const dot = document.getElementById('ring-dot');
  const statusText = document.getElementById('ring-status-text');

  const circumference = 2 * Math.PI * 90; // r=90

  if (status.isConnected) {
    // Get quality from storage
    chrome.storage.local.get(['orbitlink_connection_quality'], (data) => {
      const quality = Math.round(data.orbitlink_connection_quality || 60);
      const offset = circumference - (quality / 100) * circumference;
      progress.style.strokeDashoffset = offset;
      percent.textContent = `${quality}%`;
    });

    dot.classList.remove('offline');
    statusText.textContent = 'Connected';
    statusText.classList.remove('offline');

    // Update session earnings
    if (status.totalPointsEarned > 0) {
      document.getElementById('epoch-rewards').textContent =
        status.totalPointsEarned.toFixed(0);
    }
  } else {
    progress.style.strokeDashoffset = circumference;
    percent.textContent = '0%';
    dot.classList.add('offline');
    statusText.textContent = 'Disconnected';
    statusText.classList.add('offline');
  }
}

// ═══════════════════════════════════════════════
// TASKS / BOOST VIEW
// ═══════════════════════════════════════════════
async function loadTasks() {
  const container = document.getElementById('tasks-list');
  try {
    const token = await getToken();
    const res = await apiRequest('/tasks', 'GET', null, token);
    const tasks = res.data || [];

    if (tasks.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim)">No tasks available</div>';
      return;
    }

    container.innerHTML = tasks.map(task => {
      const isDone = task.userStatus === 'VERIFIED';
      return `
        <div class="task-item">
          <div class="task-icon">${getTaskIcon(task.type)}</div>
          <div class="task-info">
            <h4>${task.title}</h4>
            <p>${task.description || ''}</p>
          </div>
          <div class="task-reward">
            <div class="pts">+${task.rewardPoints}</div>
            <div class="lbl">pts</div>
          </div>
          ${isDone
            ? '<button class="task-btn done">Done</button>'
            : `<button class="task-btn" onclick="completeTask('${task.id}', this)">Go</button>`}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim)">Could not load tasks</div>';
  }
}

function getTaskIcon(type) {
  const icons = {
    DISCORD: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>',
    TWITTER: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    TELEGRAM: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    CUSTOM: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  };
  return icons[type] || icons.CUSTOM;
}

// Make completeTask globally accessible
window.completeTask = async function(taskId, btn) {
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const token = await getToken();
    await apiRequest(`/tasks/${taskId}/complete`, 'POST', {}, token);
    btn.classList.add('done');
    btn.textContent = 'Done';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Go';
  }
};

// ═══════════════════════════════════════════════
// REFERRALS VIEW
// ═══════════════════════════════════════════════
async function loadReferrals() {
  try {
    const token = await getToken();
    const res = await apiRequest('/referrals/stats', 'GET', null, token);
    const stats = res.data || {};

    document.getElementById('ref-total').textContent = stats.totalReferrals || 0;
    document.getElementById('ref-active').textContent = stats.activeReferrals || 0;
    document.getElementById('ref-earned').textContent = Math.round(stats.totalEarnings || 0);

    const linkInput = document.getElementById('referral-link-display');
    linkInput.value = stats.referralLink || `${WEB_URL}/signup?ref=${userProfile?.referralCode || ''}`;

    document.getElementById('btn-copy-link').onclick = async () => {
      await navigator.clipboard.writeText(linkInput.value);
      const btn = document.getElementById('btn-copy-link');
      btn.textContent = 'Copied!';
      btn.classList.add('done');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 2000);
    };

    // Render referral list
    const list = document.getElementById('referrals-list');
    if (stats.referrals && stats.referrals.length > 0) {
      list.innerHTML = stats.referrals.map(ref => `
        <div class="sub-card" style="display:flex;align-items:center;gap:12px;padding:14px">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text);font-size:0.75rem;font-weight:600">${ref.user?.username?.charAt(0).toUpperCase() || '?'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.85rem;font-weight:500;color:var(--white)">${ref.user?.username || 'Unknown'}</div>
            <div style="font-size:0.72rem;color:var(--text-dim)">${new Date(ref.joinedAt || ref.createdAt).toLocaleDateString()}</div>
          </div>
          <span class="badge badge-green">${ref.status || 'ACTIVE'}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Referrals load error:', e);
  }
}

// ═══════════════════════════════════════════════
// PROFILE VIEW
// ═══════════════════════════════════════════════
async function loadProfile() {
  try {
    const token = await getToken();
    const [meRes, balRes, gamRes] = await Promise.all([
      apiRequest('/auth/profile', 'GET', null, token),
      apiRequest('/points/balance', 'GET', null, token),
      apiRequest('/gamification/profile', 'GET', null, token)
    ]);

    if (meRes.success && meRes.data) {
      userProfile = meRes.data;
      document.getElementById('profile-avatar').textContent = userProfile.username?.charAt(0).toUpperCase() || '?';
      document.getElementById('profile-username').textContent = userProfile.username;
      document.getElementById('profile-email').textContent = userProfile.email || 'No email';
      document.getElementById('profile-role').textContent = userProfile.role;
      document.getElementById('profile-wallet').textContent = userProfile.walletAddress || 'Not connected';
      document.getElementById('profile-joined').textContent = userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : '—';
    }
    
    if (balRes.success && balRes.data) {
      const b = balRes.data;
      document.getElementById('profile-points').textContent = Math.floor(b.totalPoints || 0).toLocaleString();
    }
    
    if (gamRes.success && gamRes.data) {
      const g = gamRes.data;
      document.getElementById('profile-level').textContent = g.level;
      document.getElementById('profile-trust').textContent = Math.floor(g.trustScore);
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

// ═══════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════
function initMenu() {
  const overlay = document.getElementById('menu-overlay');
  const toggle = document.getElementById('menu-toggle');

  toggle.onclick = () => overlay.classList.toggle('open');
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  };

  // Menu items
  document.querySelectorAll('.menu-item[data-view]').forEach(item => {
    item.onclick = () => {
      const view = item.dataset.view;
      if (view === 'dashboard') {
        chrome.tabs.create({ url: `${WEB_URL}/dashboard` });
        return;
      }
      showView(view);
    };
  });

  // Logout buttons
  document.getElementById('btn-logout').onclick = handleLogout;
  document.getElementById('btn-logout-profile').onclick = handleLogout;
}

async function handleLogout() {
  // Tell the service worker to disconnect and wipe all tokens
  chrome.runtime.sendMessage({ type: 'DISCONNECT' });
  userProfile = null;
  isSignupMode = false;
  // Close the menu overlay
  document.getElementById('menu-overlay').classList.remove('open');
  showView('login');
  initLoginForm();
}

// ═══════════════════════════════════════════════
// BACK BUTTONS
// ═══════════════════════════════════════════════
function initBackButtons() {
  document.querySelectorAll('.back-btn[data-back]').forEach(btn => {
    btn.onclick = () => showView(btn.dataset.back);
  });
}

// ═══════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════
function initTheme() {
  const lightBtn = document.getElementById('theme-light');
  const darkBtn = document.getElementById('theme-dark');

  chrome.storage.local.get(['orbitlink_theme'], (data) => {
    const theme = data.orbitlink_theme || 'dark';
    applyTheme(theme);
  });

  lightBtn.onclick = () => applyTheme('light');
  darkBtn.onclick = () => applyTheme('dark');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  chrome.storage.local.set({ orbitlink_theme: theme });

  document.getElementById('theme-light').classList.toggle('active', theme === 'light');
  document.getElementById('theme-dark').classList.toggle('active', theme === 'dark');
}

// ═══════════════════════════════════════════════
// HEARTBEAT LISTENER
// ═══════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'HEARTBEAT_UPDATE' && currentView === 'home') {
    const quality = Math.round(message.data.connectionQuality || 0);
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (quality / 100) * circumference;

    document.getElementById('ring-progress').style.strokeDashoffset = offset;
    document.getElementById('ring-percent').textContent = `${quality}%`;
    document.getElementById('epoch-rewards').textContent =
      (message.data.totalSession || 0).toFixed(0);
    document.getElementById('last-updated').textContent = 'Just now';
  }
});

// Update ring every 5 seconds
setInterval(() => {
  if (currentView === 'home') {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response) updateRing(response);
    });
  }
}, 5000);

// ═══════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════
async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const config = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (body && method !== 'GET') config.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

async function getToken() {
  const data = await chrome.storage.local.get(['orbitlink_token']);
  return data.orbitlink_token || null;
}
