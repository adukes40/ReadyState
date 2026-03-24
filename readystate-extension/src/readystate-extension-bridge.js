/**
 * ReadyState Extension Bridge
 * Drop this into your website to detect and communicate with the ReadyState Chrome Extension.
 *
 * Usage:
 *   import { ReadyStateExtension } from './readystate-extension-bridge.js';
 *   const ext = new ReadyStateExtension();
 *   const detected = await ext.detect();
 *   if (detected) {
 *     const info = await ext.getDeviceInfo();
 *   }
 */

export class ReadyStateExtension {
  constructor() {
    this._ready = false;
    this._version = null;
    this._pendingRequests = new Map();
    this._listeners = {};

    // Listen for responses from the content script
    window.addEventListener('readystate-ext:response', (e) => {
      const { requestId, success, data, error } = e.detail || {};
      const pending = this._pendingRequests.get(requestId);
      if (pending) {
        this._pendingRequests.delete(requestId);
        if (success) pending.resolve(data);
        else pending.reject(new Error(error || 'Extension error'));
      }
    });

    // Listen for extension announcing itself
    window.addEventListener('readystate-ext:ready', (e) => {
      this._ready = true;
      this._version = e.detail?.version;
      this._emit('ready', e.detail);
    });
  }

  /**
   * Detect if the extension is installed and active.
   * Resolves true/false within the timeout window.
   */
  detect(timeoutMs = 2000) {
    if (this._ready) return Promise.resolve(true);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        off();
        resolve(false);
      }, timeoutMs);

      const handler = () => {
        clearTimeout(timer);
        off();
        resolve(true);
      };
      window.addEventListener('readystate-ext:ready', handler);

      function off() {
        window.removeEventListener('readystate-ext:ready', handler);
      }

      // Poke the content script to re-announce
      window.dispatchEvent(new CustomEvent('readystate-ext:request', {
        detail: { requestId: '__ping__', type: 'PING' }
      }));
    });
  }

  /**
   * Request device info from the extension.
   * Returns a structured object with cpu, memory, storage, display, and chromeos fields.
   */
  getDeviceInfo(timeoutMs = 5000) {
    return this._sendRequest('GET_DEVICE_INFO', timeoutMs);
  }

  get isReady() { return this._ready; }
  get version() { return this._version; }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    }
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  _sendRequest(type, timeoutMs = 5000) {
    const requestId = `rs_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(requestId);
        reject(new Error('Extension request timed out'));
      }, timeoutMs);

      this._pendingRequests.set(requestId, {
        resolve: (data) => { clearTimeout(timer); resolve(data); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });

      window.dispatchEvent(new CustomEvent('readystate-ext:request', {
        detail: { requestId, type }
      }));
    });
  }
}

/**
 * Convenience function: detect + get info in one call.
 * Returns null if extension not found.
 */
export async function getExtendedDeviceInfo() {
  const ext = new ReadyStateExtension();
  const detected = await ext.detect();
  if (!detected) return null;
  try {
    return await ext.getDeviceInfo();
  } catch {
    return null;
  }
}

/**
 * Check if the current browser is running on ChromeOS
 * (best-effort without extension)
 */
export function isChromeOS() {
  return navigator.userAgentData
    ? navigator.userAgentData.platform === 'Chrome OS'
    : /CrOS/.test(navigator.userAgent);
}
