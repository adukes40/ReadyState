// ReadyState Extension - Content Script
// Injected into readystate.dev pages. Acts as a bridge between the page
// and the background service worker (which has access to Chrome system APIs).

(function () {
  'use strict';

  const EXTENSION_ID = chrome.runtime.id;

  // Announce extension presence to the page
  function announcePresence() {
    window.dispatchEvent(new CustomEvent('readystate-ext:ready', {
      detail: {
        extension_id: EXTENSION_ID,
        version: chrome.runtime.getManifest().version
      }
    }));
  }

  // Handle requests from the page
  window.addEventListener('readystate-ext:request', async (event) => {
    const { requestId, type, ...payload } = event.detail || {};
    if (!requestId || !type) return;

    try {
      const response = await chrome.runtime.sendMessage({ type, ...payload });
      window.dispatchEvent(new CustomEvent('readystate-ext:response', {
        detail: { requestId, ...response }
      }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('readystate-ext:response', {
        detail: { requestId, success: false, error: err.message }
      }));
    }
  });

  // Announce on load + after a short delay (in case page JS isn't ready yet)
  announcePresence();
  setTimeout(announcePresence, 500);
  setTimeout(announcePresence, 1500);

})();
