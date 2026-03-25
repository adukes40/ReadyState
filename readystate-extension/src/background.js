// ReadyState Extension - Background Service Worker
// Collects device-only data using privileged Chrome APIs.
// No user-identity data is collected (FERPA/COPPA/HIPAA safe).

import { CATEGORIES, CATEGORY_KEYS } from './categories.js';

const ALLOWED_ORIGINS = [
  'https://readystate.dev',
];

// -------------------------------------------------------
// Settings: admin-managed defaults + user overrides
// -------------------------------------------------------

/**
 * Read admin-configured policy from chrome.storage.managed.
 * Returns per-category { enabled, locked } values.
 * Falls back to defaults if not on a managed device.
 */
async function getAdminPolicy() {
  const policy = {};
  try {
    const managed = await chrome.storage.managed.get(null);
    for (const key of CATEGORY_KEYS) {
      policy[key] = {
        enabled: managed[`${key}_enabled`] ?? CATEGORIES[key].defaultEnabled,
        locked: managed[`${key}_locked`] ?? false
      };
    }
  } catch {
    // Not a managed install or no policy set -- use defaults
    for (const key of CATEGORY_KEYS) {
      policy[key] = {
        enabled: CATEGORIES[key].defaultEnabled,
        locked: false
      };
    }
  }
  return policy;
}

/**
 * Read user overrides from chrome.storage.local.
 */
async function getUserOverrides() {
  try {
    const result = await chrome.storage.local.get('readystate_settings');
    return result.readystate_settings || {};
  } catch {
    return {};
  }
}

/**
 * Merge admin policy with user overrides. Admin locks always win.
 * Returns { settings: Record<string, boolean>, locks: Record<string, boolean> }
 */
async function getEffectiveSettings() {
  const policy = await getAdminPolicy();
  const overrides = await getUserOverrides();

  const settings = {};
  const locks = {};

  for (const key of CATEGORY_KEYS) {
    locks[key] = policy[key].locked;
    if (policy[key].locked) {
      // Admin lock: user cannot override
      settings[key] = policy[key].enabled;
    } else if (key in overrides) {
      settings[key] = overrides[key];
    } else {
      settings[key] = policy[key].enabled;
    }
  }

  return { settings, locks };
}

/**
 * Save a user override for a single category.
 * Rejects if the category is admin-locked.
 */
async function setUserSetting(category, enabled) {
  const policy = await getAdminPolicy();
  if (policy[category]?.locked) {
    throw new Error(`Category "${category}" is locked by administrator`);
  }

  const overrides = await getUserOverrides();
  overrides[category] = enabled;
  await chrome.storage.local.set({ readystate_settings: overrides });
}

// -------------------------------------------------------
// Per-category data collection
// -------------------------------------------------------

async function collectPlatformInfo() {
  try {
    const platformInfo = await chrome.runtime.getPlatformInfo();
    return {
      os: platformInfo.os,
      arch: platformInfo.arch,
      nacl_arch: platformInfo.nacl_arch
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function collectDeviceHardware() {
  // enterprise.hardwarePlatform: manufacturer + model
  if (chrome.enterprise && chrome.enterprise.hardwarePlatform) {
    try {
      const hw = await chrome.enterprise.hardwarePlatform.getHardwarePlatformInfo();
      return { manufacturer: hw.manufacturer, model: hw.model };
    } catch (e) {
      return { error: e.message };
    }
  }
  return null;
}

async function collectCPU() {
  try {
    const cpuInfo = await chrome.system.cpu.getInfo();
    return {
      num_of_processors: cpuInfo.numOfProcessors,
      arch_name: cpuInfo.archName,
      model_name: cpuInfo.modelName,
      features: cpuInfo.features,
      temperatures: cpuInfo.temperatures || null
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function collectMemory() {
  try {
    const memInfo = await chrome.system.memory.getInfo();
    return {
      capacity_bytes: memInfo.capacity,
      available_bytes: memInfo.availableCapacity,
      capacity_gb: Math.round(memInfo.capacity / (1024 ** 3) * 10) / 10,
      available_gb: Math.round(memInfo.availableCapacity / (1024 ** 3) * 10) / 10
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function collectStorage() {
  try {
    const storageInfo = await chrome.system.storage.getInfo();
    return storageInfo.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      capacity_bytes: s.capacity,
      capacity_gb: Math.round(s.capacity / (1024 ** 3) * 10) / 10
    }));
  } catch (e) {
    return [{ error: e.message }];
  }
}

async function collectDisplay() {
  try {
    const displays = await chrome.system.display.getInfo();
    return displays.map(d => ({
      id: d.id,
      name: d.name,
      is_primary: d.isPrimary,
      is_internal: d.isInternal,
      is_enabled: d.isEnabled,
      bounds: d.bounds,
      work_area: d.workArea,
      rotation: d.rotation,
      dpi_x: d.dpiX,
      dpi_y: d.dpiY,
      has_touch_support: d.hasTouchSupport || false,
      display_zoom_factor: d.displayZoomFactor || null,
      modes: (d.modes || []).map(m => ({
        width: m.width,
        height: m.height,
        refresh_rate: m.refreshRate || null,
        is_native: m.isNative,
        is_selected: m.isSelected,
        device_scale_factor: m.deviceScaleFactor
      }))
    }));
  } catch (e) {
    return { error: e.message };
  }
}

async function collectNetwork() {
  // enterprise.networkingAttributes: MAC, IPv4, IPv6
  if (chrome.enterprise && chrome.enterprise.networkingAttributes) {
    try {
      const net = await chrome.enterprise.networkingAttributes.getNetworkDetails();
      return {
        mac_address: net.macAddress,
        ipv4: net.ipv4 || null,
        ipv6: net.ipv6 || null
      };
    } catch (e) {
      return { error: e.message };
    }
  }
  return null;
}

async function collectManagedAttributes() {
  const result = {
    managed: false,
    api_available: false,
    serial_number: null,
    directory_device_id: null,
    asset_id: null,
    location: null,
    hostname: null,
    _diag: {}
  };

  if (!chrome.enterprise || !chrome.enterprise.deviceAttributes) {
    result._diag.api_check = 'chrome.enterprise.deviceAttributes not found';
    return result;
  }

  result.api_available = true;

  // Call each API individually for detailed diagnostics
  const calls = {
    serial_number: () => chrome.enterprise.deviceAttributes.getDeviceSerialNumber(),
    directory_device_id: () => chrome.enterprise.deviceAttributes.getDirectoryDeviceId(),
    asset_id: () => chrome.enterprise.deviceAttributes.getDeviceAnnotatedAssetId(),
    location: () => chrome.enterprise.deviceAttributes.getDeviceAnnotatedLocation(),
    hostname: () => chrome.enterprise.deviceAttributes.getDeviceHostname()
  };

  for (const [key, fn] of Object.entries(calls)) {
    try {
      const value = await fn();
      result._diag[key] = {
        status: 'fulfilled',
        raw_type: typeof value,
        raw_length: typeof value === 'string' ? value.length : null,
        is_empty: value === '',
        is_null: value === null,
        is_undefined: value === undefined
      };
      result[key] = (value && value !== '') ? value : null;
    } catch (e) {
      result._diag[key] = {
        status: 'rejected',
        error: e.message
      };
    }
  }

  result.managed = !!(result.serial_number || result.asset_id || result.directory_device_id || result.hostname);

  // Secondary signal: check if admin policy exists via chrome.storage.managed
  try {
    const stored = await chrome.storage.managed.get(null);
    const keys = Object.keys(stored);
    result._diag.storage_managed = { keys_found: keys.length, keys };
    if (keys.length > 0) {
      result._diag.policy_managed = true;
    }
  } catch (e) {
    result._diag.storage_managed = { error: e.message };
  }

  return result;
}

// -------------------------------------------------------
// Main collection - respects settings
// -------------------------------------------------------

async function collectDeviceInfo() {
  const { settings } = await getEffectiveSettings();

  const info = {
    extension_version: chrome.runtime.getManifest().version,
    collected_at: new Date().toISOString(),
    settings_applied: { ...settings },
    platform: {},
    device_info: null,
    cpu: null,
    memory: null,
    storage: null,
    display: null,
    network: null,
    managed_attributes: null
  };

  // Platform is always collected (OS detection, no privacy concern)
  info.platform = await collectPlatformInfo();

  if (settings.device_info) {
    info.device_info = await collectDeviceHardware();
  }

  if (settings.cpu) {
    info.cpu = await collectCPU();
  }

  if (settings.memory) {
    info.memory = await collectMemory();
  }

  if (settings.storage) {
    info.storage = await collectStorage();
  }

  if (settings.display) {
    info.display = await collectDisplay();
  }

  if (settings.network) {
    info.network = await collectNetwork();
  }

  if (settings.managed_attributes && info.platform.os === 'cros') {
    info.managed_attributes = await collectManagedAttributes();
  }

  return info;
}

// -------------------------------------------------------
// Message Handling
// -------------------------------------------------------

// Handle messages from content scripts (same extension)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DEVICE_INFO') {
    collectDeviceInfo()
      .then(info => sendResponse({ success: true, data: info }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    getEffectiveSettings()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'SET_SETTING') {
    const { category, enabled } = message;
    setUserSetting(category, enabled)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_CATEGORIES') {
    sendResponse({ success: true, data: CATEGORIES });
    return false;
  }

  if (message.type === 'GET_DEVICE_NAME_FORMAT') {
    (async () => {
      try {
        const managed = await chrome.storage.managed.get([
          'device_name_format',
          'device_name_format_locked'
        ]);
        sendResponse({
          success: true,
          data: {
            format: managed.device_name_format || null,
            locked: managed.device_name_format_locked || false
          }
        });
      } catch {
        sendResponse({
          success: true,
          data: { format: null, locked: false }
        });
      }
    })();
    return true;
  }

  if (message.type === 'PING') {
    sendResponse({ success: true, version: chrome.runtime.getManifest().version });
    return false;
  }
});

// Handle messages from external web pages (readystate.dev)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const senderOrigin = sender.origin || (sender.url ? new URL(sender.url).origin : null);
  if (!senderOrigin || !ALLOWED_ORIGINS.includes(senderOrigin)) {
    sendResponse({ success: false, error: 'Unauthorized origin: ' + senderOrigin });
    return false;
  }

  if (message.type === 'PING') {
    sendResponse({
      success: true,
      version: chrome.runtime.getManifest().version,
      extension_id: chrome.runtime.id
    });
    return false;
  }

  if (message.type === 'GET_DEVICE_INFO') {
    collectDeviceInfo()
      .then(info => sendResponse({ success: true, data: info }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    getEffectiveSettings()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'SET_SETTING') {
    const { category, enabled } = message;
    setUserSetting(category, enabled)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_CATEGORIES') {
    sendResponse({ success: true, data: CATEGORIES });
    return false;
  }

  if (message.type === 'GET_DEVICE_NAME_FORMAT') {
    (async () => {
      try {
        const managed = await chrome.storage.managed.get([
          'device_name_format',
          'device_name_format_locked'
        ]);
        sendResponse({
          success: true,
          data: {
            format: managed.device_name_format || null,
            locked: managed.device_name_format_locked || false
          }
        });
      } catch {
        sendResponse({
          success: true,
          data: { format: null, locked: false }
        });
      }
    })();
    return true;
  }
});

console.log('[ReadyState Extension] Background worker initialized v' + chrome.runtime.getManifest().version);
