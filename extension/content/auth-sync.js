// Auth Sync Script
// Runs only on the OrbitLink website to sync the JWT token to the extension

(function() {
  'use strict';

  let lastSyncedToken = null;

  function syncToken() {
    const token = localStorage.getItem('orbitlink_token');
    
    // Only sync if the token has actually changed in the website's localStorage
    // This prevents the sync script from fighting with the extension's own logout
    if (token !== lastSyncedToken) {
      if (token) {
        chrome.storage.local.set({ orbitlink_token: token }, () => {
          console.log('[OrbitLink Extension] Token synced successfully!');
        });
      } else {
        chrome.storage.local.remove('orbitlink_token');
      }
      lastSyncedToken = token;
    }
  }

  // Sync immediately
  syncToken();

  // Also listen for changes (e.g. login/logout) from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'orbitlink_token') {
      syncToken();
    }
  });

  // Since Next.js might not always trigger 'storage' event on the same tab, 
  // we poll occasionally. The lastSyncedToken check prevents redundant sets.
  setInterval(syncToken, 2000);
})();
