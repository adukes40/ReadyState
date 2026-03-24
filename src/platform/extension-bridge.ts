/**
 * Extension Bridge - detects and communicates with the ReadyState Chrome Extension.
 * The extension provides privileged Chrome system APIs data (CPU model, exact RAM,
 * storage capacity) and on managed ChromeOS devices: serial number, asset ID, hostname.
 * No user-identity data is collected (FERPA/COPPA/HIPAA safe).
 */

export interface ExtensionDeviceInfo {
  extension_version: string
  collected_at: string
  settings_applied: Record<string, boolean>
  platform: { os: string; arch: string; nacl_arch?: string; error?: string }
  device_info: { manufacturer: string; model: string; error?: string } | null
  cpu: { num_of_processors: number; arch_name: string; model_name: string; features: string[]; temperatures: number[] | null; error?: string } | null
  memory: { capacity_bytes: number; available_bytes: number; capacity_gb: number; available_gb: number; error?: string } | null
  display: Array<{
    id: string; name: string; is_primary: boolean; is_internal: boolean
    bounds: { width: number; height: number }; has_touch_support: boolean
    modes: Array<{ width: number; height: number; refresh_rate: number | null; is_native: boolean; is_selected: boolean }>
  }> | { error: string } | null
  storage: Array<{ id: string; name: string; type: string; capacity_bytes: number; capacity_gb: number }> | Array<{ error: string }> | null
  network: { mac_address: string; ipv4: string | null; ipv6: string | null; error?: string } | null
  managed_attributes: {
    managed: boolean
    asset_id: string | null
    location: string | null
    directory_device_id: string | null
    serial_number: string | null
    hostname: string | null
    error?: string
  } | null
}

export interface ExtensionSettings {
  settings: Record<string, boolean>
  locks: Record<string, boolean>
}

export interface CategoryDef {
  label: string
  description: string
  defaultEnabled: boolean
}

let _ready = false
let _version: string | null = null
const _pendingRequests = new Map<string, { resolve: (data: any) => void; reject: (err: Error) => void }>()

// Listen for responses from the content script
if (typeof window !== 'undefined') {
  window.addEventListener('readystate-ext:response', ((e: CustomEvent) => {
    const { requestId, success, data, error } = e.detail || {}
    const pending = _pendingRequests.get(requestId)
    if (pending) {
      _pendingRequests.delete(requestId)
      if (success) pending.resolve(data)
      else pending.reject(new Error(error || 'Extension error'))
    }
  }) as EventListener)

  window.addEventListener('readystate-ext:ready', ((e: CustomEvent) => {
    _ready = true
    _version = e.detail?.version
  }) as EventListener)
}

function sendRequest(type: string, payload?: Record<string, unknown>, timeoutMs = 5000): Promise<any> {
  const requestId = `rs_${Date.now()}_${Math.random().toString(36).slice(2)}`

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pendingRequests.delete(requestId)
      reject(new Error('Extension request timed out'))
    }, timeoutMs)

    _pendingRequests.set(requestId, {
      resolve: (data) => { clearTimeout(timer); resolve(data) },
      reject: (err) => { clearTimeout(timer); reject(err) }
    })

    window.dispatchEvent(new CustomEvent('readystate-ext:request', {
      detail: { requestId, type, ...payload }
    }))
  })
}

/**
 * Detect if the ReadyState extension is installed and active.
 */
export function detectExtension(timeoutMs = 2000): Promise<boolean> {
  if (_ready) return Promise.resolve(true)

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      off()
      resolve(false)
    }, timeoutMs)

    const handler = () => {
      clearTimeout(timer)
      off()
      resolve(true)
    }
    window.addEventListener('readystate-ext:ready', handler)

    function off() {
      window.removeEventListener('readystate-ext:ready', handler)
    }

    window.dispatchEvent(new CustomEvent('readystate-ext:request', {
      detail: { requestId: '__ping__', type: 'PING' }
    }))
  })
}

/**
 * Request device info from the extension (respects category settings).
 */
export function getExtensionDeviceInfo(timeoutMs = 5000): Promise<ExtensionDeviceInfo> {
  return sendRequest('GET_DEVICE_INFO', undefined, timeoutMs)
}

/**
 * Get current effective settings and lock states.
 */
export function getExtensionSettings(): Promise<ExtensionSettings> {
  return sendRequest('GET_SETTINGS')
}

/**
 * Update a single category setting. Throws if admin-locked.
 */
export function setExtensionSetting(category: string, enabled: boolean): Promise<void> {
  return sendRequest('SET_SETTING', { category, enabled })
}

/**
 * Get category definitions (labels and descriptions).
 */
export function getExtensionCategories(): Promise<Record<string, CategoryDef>> {
  return sendRequest('GET_CATEGORIES')
}

export function getExtensionVersion(): string | null {
  return _version
}
