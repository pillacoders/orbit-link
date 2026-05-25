// OrbitLink Content Script
// Lightweight activity detection - runs on all pages

(function() {
  'use strict';

  let lastActivityTime = Date.now();
  let isPageActive = true;

  // Track user activity
  const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
  
  function onActivity() {
    lastActivityTime = Date.now();
    if (!isPageActive) {
      isPageActive = true;
      chrome.storage.session.set({ isActive: true, lastActivity: Date.now() });
    }
  }

  activityEvents.forEach(event => {
    document.addEventListener(event, onActivity, { passive: true, capture: false });
  });

  // Check for inactivity every 30 seconds
  setInterval(() => {
    const idle = Date.now() - lastActivityTime > 60000; // 1 minute idle
    if (idle && isPageActive) {
      isPageActive = false;
      chrome.storage.session.set({ isActive: false });
    }
  }, 30000);

  // Page visibility
  document.addEventListener('visibilitychange', () => {
    const visible = !document.hidden;
    chrome.storage.session.set({ isActive: visible, lastActivity: Date.now() });
  });

  // Initial state
  chrome.storage.session.set({ isActive: true, lastActivity: Date.now() });
})();
