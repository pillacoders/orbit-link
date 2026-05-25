/* ═══════════════════════════════════════════════
   ORBITLINK — BACKGROUND SERVICE WORKER v3
   Persists state to chrome.storage.local to
   survive MV3 service worker restarts.
   ═══════════════════════════════════════════════ */

const API_URL = 'http://localhost:4000/api';

// ─── In-memory cache (rehydrated from storage) ───
let isConnected = false;
let nodeId = null;
let uptimeStart = null;
let totalPointsEarned = 0;

// ─── Rehydrate state from storage ───
async function rehydrate() {
  const data = await chrome.storage.local.get([
    'orbitlink_connected',
    'orbitlink_nodeId',
    'orbitlink_points_session',
    'orbitlink_token',
  ]);
  isConnected = !!data.orbitlink_connected;
  nodeId = data.orbitlink_nodeId || null;
  totalPointsEarned = data.orbitlink_points_session || 0;
  if (isConnected && !uptimeStart) uptimeStart = Date.now();
  return data;
}

// Rehydrate immediately on load
rehydrate();

// ─── Alarms ───
chrome.alarms.create('heartbeat', { periodInMinutes: 0.5 }); // Every 30s
chrome.alarms.create('activity-check', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await rehydrate(); // Always rehydrate before acting
  if (alarm.name === 'heartbeat' && isConnected && nodeId) {
    await sendHeartbeat();
  }
  if (alarm.name === 'activity-check') {
    await checkActivity();
  }
});

// ─── Install / Startup ───
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'http://localhost:3000/signup' });
  }
  try {
    if (chrome.sidePanel) {
      await chrome.sidePanel.setOptions({ enabled: true });
    }
  } catch (e) {}
  await initializeNode();
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeNode();
});

// ─── Initialize ───
async function initializeNode() {
  const data = await chrome.storage.local.get(['orbitlink_token']);
  if (!data.orbitlink_token) return;

  try {
    const res = await apiRequest('/nodes/register', 'POST', { type: 'EXTENSION' }, data.orbitlink_token);
    if (res.success) {
      nodeId = res.data.id;
      isConnected = true;
      uptimeStart = Date.now();
      totalPointsEarned = 0;
      await chrome.storage.local.set({
        orbitlink_nodeId: nodeId,
        orbitlink_connected: true,
        orbitlink_points_session: 0,
      });
      updateBadge(true);
    }
  } catch (err) {
    console.error('[OrbitLink] Init error:', err);
  }
}

// ─── Heartbeat ───
async function sendHeartbeat() {
  const data = await chrome.storage.local.get(['orbitlink_token']);
  if (!data.orbitlink_token || !nodeId) return;

  const start = Date.now();
  let connectionQuality = 75;

  try {
    const activityData = await chrome.storage.session.get(['lastActivity', 'isActive']);
    const isActive = activityData.isActive || false;

    const res = await apiRequest('/nodes/heartbeat', 'POST', {
      nodeId,
      connectionQuality,
      isActive,
    }, data.orbitlink_token);

    const latency = Date.now() - start;
    connectionQuality = Math.max(0, Math.min(100, 100 - (latency / 10)));

    if (res.success) {
      totalPointsEarned += res.data.pointsEarned || 0;

      await chrome.storage.local.set({
        orbitlink_points_session: totalPointsEarned,
        orbitlink_last_heartbeat: Date.now(),
        orbitlink_connection_quality: connectionQuality,
      });

      // Notify popup/sidebar if open
      chrome.runtime.sendMessage({
        type: 'HEARTBEAT_UPDATE',
        data: {
          pointsEarned: res.data.pointsEarned,
          totalSession: totalPointsEarned,
          connectionQuality,
        },
      }).catch(() => {}); // Popup might not be open
    }
  } catch (err) {
    console.error('[OrbitLink] Heartbeat error:', err);
  }
}

// ─── Activity Tracking ───
async function checkActivity() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const isActive = tabs.length > 0 && tabs[0].url && !tabs[0].url.startsWith('chrome://');
    await chrome.storage.session.set({ isActive, lastActivity: Date.now() });
  } catch (err) {
    // Tab query might fail
  }
}

// ─── Message Handler ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Always rehydrate before handling
  rehydrate().then(() => {
    switch (message.type) {
      case 'CONNECT':
        handleConnect(message.token).then(sendResponse);
        break;

      case 'DISCONNECT':
        handleDisconnect().then(sendResponse);
        break;

      case 'GET_STATUS':
        sendResponse({
          isConnected,
          nodeId,
          totalPointsEarned,
          uptimeStart,
        });
        break;

      case 'SET_TOKEN':
        chrome.storage.local.set({ orbitlink_token: message.token }).then(() => {
          initializeNode().then(() => sendResponse({ success: true }));
        });
        break;

      case 'OPEN_SIDE_PANEL':
        try {
          if (chrome.sidePanel) {
            chrome.sidePanel.open({ windowId: sender.tab?.windowId });
          }
        } catch (e) {
          console.error('Side panel error:', e);
        }
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
        break;
    }
  });
  return true; // Keep the message channel open for async response
});

// ─── Connect / Disconnect ───
async function handleConnect(token) {
  if (token) {
    await chrome.storage.local.set({ orbitlink_token: token });
  }
  await initializeNode();
  return { success: isConnected };
}

async function handleDisconnect() {
  const data = await chrome.storage.local.get(['orbitlink_token']);
  if (data.orbitlink_token && nodeId) {
    try {
      await apiRequest('/nodes/disconnect', 'POST', { nodeId }, data.orbitlink_token);
    } catch (err) {}
  }
  isConnected = false;
  nodeId = null;
  uptimeStart = null;
  totalPointsEarned = 0;
  // Clear ALL auth + connection state
  await chrome.storage.local.remove([
    'orbitlink_token',
    'orbitlink_nodeId',
    'orbitlink_connected',
    'orbitlink_points_session',
    'orbitlink_last_heartbeat',
    'orbitlink_connection_quality',
  ]);
  updateBadge(false);
  return { success: true };
}

// ─── Badge ───
function updateBadge(connected) {
  chrome.action.setBadgeText({ text: connected ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: connected ? '#34d399' : '#f87171' });
}

// ─── API Helper ───
async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const config = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (body && method !== 'GET') config.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, config);
  return res.json();
}
