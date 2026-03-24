# Extension Data Frontend Integration -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the System Readout to a 4-column, category-based modular panel layout that dynamically adapts to extension data, with scoped test panel enhancements, admin-configurable device name format, and one-page PDF report.

**Architecture:** The readout grid becomes a two-tier layout: a baseline row (browser API) and an extension row (cyan-accented panels per enabled category). Extension data replaces overlapping browser fields. A new `device_name_format` policy field flows from Google Admin Console through the extension bridge to the report modal for auto-fill. No new libraries, no state management changes.

**Tech Stack:** React 19, Tailwind CSS 4.2, jsPDF, Chrome Extension MV3, Vite

**Note:** This project has no test framework (no vitest, jest, or test files). Steps reference manual browser verification instead of automated tests.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/platform/extension-bridge.ts` | Modify | Add `DeviceNameFormat` interface and `getExtensionDeviceNameFormat()` function |
| `src/platform/device-name-format.ts` | Create | Format template resolution logic (variable substitution, separator stripping) |
| `src/pages/test-runner.tsx` | Modify | Restructure readout to baseline + extension rows (4-col grid), pass ext data to enhanced tests, pass ext data + format to report modal |
| `src/components/extension-settings.tsx` | Modify | Restyle to 4-column inline toggle grid |
| `src/components/report-modal.tsx` | Modify | Add ext device info block, auto-fill dropdown, format-from-policy, one-page enforcement |
| `src/tests/memory-panel.tsx` | Modify | Accept optional `exactRamMB` prop for precise denominator |
| `src/tests/network-panel.tsx` | Modify | Accept optional `networkInfo` prop for interface footer |
| `readystate-extension/managed_schema.json` | Modify | Add `device_name_format` and `device_name_format_locked` fields |
| `readystate-extension/src/background.js` | Modify | Handle `GET_DEVICE_NAME_FORMAT` message type |
| `src/pages/extension.tsx` | Modify | Add device name format docs to deployment guide |
| `src/pages/privacy.tsx` | Modify | Mention admin-configurable naming format |
| `readystate-extension/store-listing.md` | Create | Web Store description text |

---

### Task 1: Extension Bridge -- Add Device Name Format Message

**Files:**
- Modify: `src/platform/extension-bridge.ts:8-42` (add interface and function)
- Modify: `readystate-extension/managed_schema.json` (add 2 fields)
- Modify: `readystate-extension/src/background.js:312-344` (add message handler)

- [ ] **Step 1: Add `device_name_format` and `device_name_format_locked` to managed schema**

In `readystate-extension/managed_schema.json`, add before the closing `}`:

```json
    "device_name_format": {
      "title": "Device name format template for reports (e.g. {serial} -- {location})",
      "description": "Supported variables: {serial}, {asset_id}, {location}, {hostname}, {manufacturer}, {model}. Separators around empty variables are stripped automatically.",
      "type": "string"
    },
    "device_name_format_locked": {
      "title": "Lock device name format (user cannot change)",
      "type": "boolean"
    }
```

- [ ] **Step 2: Add `GET_DEVICE_NAME_FORMAT` handler in background.js**

In `readystate-extension/src/background.js`, add a new handler in the `chrome.runtime.onMessage.addListener` block (after the `GET_CATEGORIES` handler at line 335):

```javascript
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
```

Add the same handler in the `chrome.runtime.onMessageExternal.addListener` block (after the `GET_CATEGORIES` handler at line 385).

- [ ] **Step 3: Add TypeScript interface and bridge function**

In `src/platform/extension-bridge.ts`, add after the `CategoryDef` interface (line 43):

```typescript
export interface DeviceNameFormat {
  format: string | null
  locked: boolean
}
```

Add after the `getExtensionCategories` function (line 142):

```typescript
/**
 * Get admin-configured device name format template and lock state.
 */
export function getExtensionDeviceNameFormat(): Promise<DeviceNameFormat> {
  return sendRequest('GET_DEVICE_NAME_FORMAT')
}
```

- [ ] **Step 4: Verify extension loads without errors**

Run: `cd readystate-extension && cat manifest.json` to confirm manifest is valid JSON.
Check that `managed_schema.json` is valid JSON.

- [ ] **Step 5: Commit**

```bash
git add src/platform/extension-bridge.ts readystate-extension/managed_schema.json readystate-extension/src/background.js
git commit -m "Add device name format policy field and bridge message"
```

---

### Task 2: Device Name Format Resolution Logic

**Files:**
- Create: `src/platform/device-name-format.ts`

- [ ] **Step 1: Create the format resolver module**

Create `src/platform/device-name-format.ts`:

```typescript
/**
 * Resolves a device name format template using extension data.
 * Variables: {serial}, {asset_id}, {location}, {hostname}, {manufacturer}, {model}
 * Strips separators around empty variables automatically.
 */

import type { ExtensionDeviceInfo } from './extension-bridge'

/** Preset format options for the report dropdown. */
export const DEVICE_NAME_PRESETS = [
  { label: 'Serial -- Location', format: '{serial} -- {location}', requires: ['managed_attributes'] },
  { label: 'Asset ID -- Serial', format: '{asset_id} -- {serial}', requires: ['managed_attributes'] },
  { label: 'Model -- Serial', format: '{model} -- {serial}', requires: ['device_info', 'managed_attributes'] },
  { label: 'Hostname', format: '{hostname}', requires: ['managed_attributes'] },
] as const

/**
 * Build a variable map from extension data.
 */
function buildVariableMap(extData: ExtensionDeviceInfo | null): Record<string, string> {
  if (!extData) return {}

  const vars: Record<string, string> = {}

  if (extData.managed_attributes && !extData.managed_attributes.error) {
    if (extData.managed_attributes.serial_number) vars.serial = extData.managed_attributes.serial_number
    if (extData.managed_attributes.asset_id) vars.asset_id = extData.managed_attributes.asset_id
    if (extData.managed_attributes.location) vars.location = extData.managed_attributes.location
    if (extData.managed_attributes.hostname) vars.hostname = extData.managed_attributes.hostname
  }

  if (extData.device_info && !extData.device_info.error) {
    if (extData.device_info.manufacturer) vars.manufacturer = extData.device_info.manufacturer
    if (extData.device_info.model) vars.model = extData.device_info.model
  }

  return vars
}

/**
 * Resolve a format template string using available variables.
 * Empty variables and their surrounding separators are stripped.
 * Example: "{serial} -- {location}" with empty location becomes "SN-123".
 */
export function resolveFormat(format: string, extData: ExtensionDeviceInfo | null): string {
  const vars = buildVariableMap(extData)

  // Replace each {variable} with its value or empty string
  let result = format.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '')

  // Clean up orphaned separators: " -- ", " - ", " / ", " | "
  result = result.replace(/\s*[-/|]+\s*$/g, '') // trailing separator
  result = result.replace(/^\s*[-/|]+\s*/g, '') // leading separator
  result = result.replace(/\s+[-/|]+\s+[-/|]+\s+/g, ' -- ') // doubled separators
  result = result.replace(/\s+[-/|]+\s*$/g, '') // trailing after cleanup

  return result.trim()
}

/**
 * Get available presets based on active extension categories.
 */
export function getAvailablePresets(activeCategories: Record<string, boolean>): typeof DEVICE_NAME_PRESETS[number][] {
  return DEVICE_NAME_PRESETS.filter(p =>
    p.requires.every(cat => activeCategories[cat])
  )
}
```

- [ ] **Step 2: Verify module compiles**

Run: `npx tsc --noEmit src/platform/device-name-format.ts` or check for import errors in the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/platform/device-name-format.ts
git commit -m "Add device name format template resolver"
```

---

### Task 3: Restructure System Readout -- Baseline + Extension Rows

**Files:**
- Modify: `src/pages/test-runner.tsx:86-192` (readout section)

This is the largest change. The current readout is a single grid that mixes browser API and extension data. It needs to become:

1. A **baseline row** (4 columns) showing browser API fields that aren't replaced by extension data
2. A **gradient separator** (only when extension data is present)
3. An **extension row** (4 columns, cyan-accented) with one card per enabled category

- [ ] **Step 1: Define which baseline fields get replaced**

Add a helper function after `cleanGPU` (line 314) in `test-runner.tsx`:

```typescript
/** Determine which baseline fields to show based on active extension categories. */
function getBaselineFields(platform: PlatformInfo, extData: ExtensionDeviceInfo | null) {
  const fields: Array<{ icon: React.ReactNode; label: string; value: string }> = []

  fields.push({ icon: <PlatformIcon />, label: 'Platform', value: platform.os })
  fields.push({ icon: <BrowserIcon />, label: 'Browser', value: platform.browser })

  // CPU: replaced by extension CPU category
  if (!extData?.cpu || extData.cpu.error) {
    fields.push({
      icon: <CpuIcon />,
      label: 'Processor',
      value: `${platform.cores} cores${platform.architecture ? ` \u00b7 ${platform.architecture}` : ''}`
    })
  }

  // Memory: replaced by extension Memory category
  if (!extData?.memory || extData.memory.error) {
    fields.push({
      icon: <MemoryIcon />,
      label: 'Memory',
      value: platform.ram ? (platform.ram >= 8 ? `\u2265${platform.ram} GB` : `${platform.ram} GB`) : '\u2014'
    })
  }

  // Display: replaced by extension Display category
  if (!extData?.display || (typeof extData.display === 'object' && 'error' in extData.display)) {
    fields.push({
      icon: <DisplayIcon />,
      label: 'Display',
      value: `${platform.screenWidth}\u00d7${platform.screenHeight} @${platform.pixelRatio}x`
    })
  }

  fields.push({ icon: <ColorIcon />, label: 'Color Depth', value: `${platform.colorDepth}-bit` })
  fields.push({ icon: <TouchIcon />, label: 'Touch', value: platform.touchSupported ? `${platform.maxTouchPoints} points` : 'None' })

  if (platform.gpu) {
    fields.push({ icon: <GpuIcon />, label: 'Graphics', value: cleanGPU(platform.gpu) })
  }

  return fields
}
```

- [ ] **Step 2: Build extension category cards**

Add another helper after `getBaselineFields`:

```typescript
/** Build extension data cards for enabled categories. */
function getExtensionCards(extData: ExtensionDeviceInfo): Array<{ label: string; value: string; sub: string }> {
  const cards: Array<{ label: string; value: string; sub: string }> = []

  if (extData.cpu && !extData.cpu.error) {
    const features = extData.cpu.features?.length ? extData.cpu.features.slice(0, 3).join(', ') : ''
    cards.push({
      label: 'CPU',
      value: extData.cpu.model_name || `${extData.cpu.num_of_processors} cores`,
      sub: `${extData.cpu.num_of_processors} cores${features ? ` -- ${features}` : ''}`
    })
  }

  if (extData.memory && !extData.memory.error) {
    cards.push({
      label: 'Memory',
      value: `${extData.memory.capacity_gb} GB`,
      sub: `${Math.round(extData.memory.capacity_bytes / (1024 * 1024))} MB exact`
    })
  }

  if (extData.storage && Array.isArray(extData.storage) && extData.storage.length > 0 && !('error' in extData.storage[0])) {
    const items = extData.storage as Array<{ type: string; capacity_gb: number; name: string }>
    const fixed = items.filter(s => s.type === 'fixed')
    const primary = fixed.length > 0 ? fixed[0] : items[0]
    cards.push({
      label: 'Storage',
      value: `${primary.type === 'fixed' ? 'eMMC' : primary.type} ${primary.capacity_gb} GB`,
      sub: `${items.length} drive${items.length !== 1 ? 's' : ''}`
    })
  }

  if (extData.display && Array.isArray(extData.display) && extData.display.length > 0) {
    const primary = extData.display.find(d => d.is_primary) || extData.display[0]
    const selectedMode = primary.modes?.find(m => m.is_selected)
    const refreshRate = selectedMode?.refresh_rate ? `${Math.round(selectedMode.refresh_rate)}Hz` : ''
    const dpi = (primary as any).dpi_x ? `${Math.round((primary as any).dpi_x)} DPI` : ''
    cards.push({
      label: 'Display',
      value: `${primary.bounds.width}x${primary.bounds.height}`,
      sub: [refreshRate, dpi].filter(Boolean).join(' -- ')
    })
  }

  if (extData.network && !extData.network.error) {
    cards.push({
      label: 'Network',
      value: extData.network.mac_address || '--',
      sub: extData.network.ipv4 || extData.network.ipv6 || ''
    })
  }

  if (extData.device_info && !extData.device_info.error) {
    cards.push({
      label: 'Device Info',
      value: [extData.device_info.manufacturer, extData.device_info.model].filter(Boolean).join(' ') || '--',
      sub: extData.device_info.model || ''
    })
  }

  if (extData.managed_attributes && extData.managed_attributes.managed && !extData.managed_attributes.error) {
    const attrs = extData.managed_attributes
    cards.push({
      label: 'Managed',
      value: attrs.serial_number || attrs.asset_id || attrs.hostname || '--',
      sub: [attrs.location, attrs.asset_id ? `#${attrs.asset_id}` : ''].filter(Boolean).join(' -- ')
    })
  }

  return cards
}
```

- [ ] **Step 3: Create an `ExtensionCard` component**

Add after the `ReadoutCard` component (line 267):

```typescript
function ExtensionCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0f1a1a] border border-[#1a3a3a] rounded-2xl p-4 transition-transform hover:scale-[1.02]">
      <div className="text-[10px] font-bold tracking-widest text-[#40E0D0] uppercase mb-1.5">{label}</div>
      <div className="text-sm text-gray-200 font-medium font-mono leading-tight" title={value}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 font-mono mt-0.5">{sub}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Replace the readout JSX**

Replace the readout section (lines 101-189) with the new two-tier layout:

```tsx
{/* Readout header with gear icon */}
<div className="flex items-center justify-between mb-4">
  <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">System Readout</span>
  <div className="flex items-center gap-3">
    {extSettings && extCategories && (
      <span className="text-[10px] font-mono text-[#40E0D0]">
        {Object.values(extSettings.settings).filter(Boolean).length}/{Object.keys(extCategories).length} categories
      </span>
    )}
    <button
      onClick={() => setShowReport(true)}
      className="px-4 py-1.5 text-xs font-mono bg-white/5 text-white/80 rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
    >
      Export PDF
    </button>
  </div>
</div>
<KofiButton />

{/* Baseline row - browser API fields */}
<div className="grid grid-cols-2 md:grid-cols-4 readout-grid mt-3">
  {getBaselineFields(platform, extData).map((f, i) => (
    <ReadoutCard key={i} icon={f.icon} label={f.label} value={f.value} />
  ))}
</div>

{/* Extension data row(s) */}
{extData && (() => {
  const cards = getExtensionCards(extData)
  if (cards.length === 0) return null
  return (
    <>
      {/* Gradient separator */}
      <div className="h-px my-3" style={{ background: 'linear-gradient(90deg, transparent, #1a3a3a, transparent)' }} />
      <div className="grid grid-cols-2 md:grid-cols-4 readout-grid">
        {cards.map((c, i) => (
          <ExtensionCard key={i} label={c.label} value={c.value} sub={c.sub} />
        ))}
      </div>
    </>
  )
})()}

{/* Extension settings toggles */}
{extSettings && extCategories && (
  <ExtensionSettingsPanel
    settings={extSettings.settings}
    locks={extSettings.locks}
    categories={extCategories}
    onToggle={handleExtToggle}
  />
)}
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`
Check three states:
1. Without extension: 8 baseline fields, no separator, no gear count
2. With extension + some categories: baseline shrinks, extension row appears with cyan cards
3. Toggle a category off: card disappears in real-time

- [ ] **Step 6: Commit**

```bash
git add src/pages/test-runner.tsx
git commit -m "Restructure system readout to baseline + extension row layout"
```

---

### Task 4: Restyle Extension Settings to 4-Column Inline Grid

**Files:**
- Modify: `src/components/extension-settings.tsx`

- [ ] **Step 1: Replace the expanded panel layout**

Replace the entire `{expanded && (...)}` block (lines 47-101) with a 4-column grid layout:

```tsx
{expanded && (
  <div className="mt-2 bg-[#0d0d0d] border border-[#1a3a3a] rounded-xl p-3">
    <p className="text-[10px] text-gray-500 mb-3 px-1">
      Control which device data the ReadyState extension shares with this page.
      {lockedCount > 0 && ' Some settings are managed by your administrator.'}
    </p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {categoryKeys.map(key => {
        const cat = categories[key]
        const enabled = settings[key] ?? false
        const locked = locks[key] ?? false

        return (
          <label
            key={key}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141414] transition-colors ${
              locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
            }`}
          >
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={locked}
              onClick={(e) => {
                e.preventDefault()
                if (!locked) onToggle(key, !enabled)
              }}
              className={`relative flex-shrink-0 w-7 h-4 rounded-full transition-colors ${
                enabled
                  ? locked ? 'bg-[#FBBF24]' : 'bg-[#40E0D0]'
                  : 'bg-white/10'
              } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[11px] text-gray-300 font-medium truncate">{cat.label}</span>
            {locked && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </label>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify settings panel renders correctly**

Run: `npm run dev`
Check: gear button expands to show 4-column toggle grid, amber toggles on locked categories, toggles work.

- [ ] **Step 3: Commit**

```bash
git add src/components/extension-settings.tsx
git commit -m "Restyle extension settings to 4-column inline toggle grid"
```

---

### Task 5: Enhance Memory Panel with Exact RAM

**Files:**
- Modify: `src/tests/memory-panel.tsx:12-13` (props) and lines 47-49 (RAM calculation)
- Modify: `src/pages/test-runner.tsx` (pass prop)

- [ ] **Step 1: Add optional `exactRamMB` prop to MemoryPanel**

In `src/tests/memory-panel.tsx`, change the component signature (line 13):

```typescript
export default function MemoryPanel({ onResult, exactRamMB }: {
  onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void
  exactRamMB?: number
}) {
```

- [ ] **Step 2: Use exact RAM for gauge denominator**

Replace lines 47-48:

```typescript
  const deviceRAM = (navigator as any).deviceMemory as number | undefined
  const maxMB = deviceRAM ? deviceRAM * 1024 : 4096
```

With:

```typescript
  const deviceRAM = (navigator as any).deviceMemory as number | undefined
  const maxMB = exactRamMB || (deviceRAM ? deviceRAM * 1024 : 4096)
  const ramLabel = exactRamMB ? `${Math.round(exactRamMB)} MB` : (deviceRAM ? `~${deviceRAM} GB` : '~4 GB')
```

- [ ] **Step 3: Update the RAM display label**

Replace line 78 (`{deviceRAM && <span ...>Device: {deviceRAM} GB</span>}`):

```tsx
<span className="text-gray-500">Device: {ramLabel}</span>
```

- [ ] **Step 4: Pass exact RAM from test-runner.tsx**

In `test-runner.tsx`, find the `<MemoryPanel>` usage (line 222 area) and change to:

```tsx
<MemoryPanel
  onResult={reportResult}
  exactRamMB={extData?.memory && !extData.memory.error ? Math.round(extData.memory.capacity_bytes / (1024 * 1024)) : undefined}
/>
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`
Check: Memory panel shows exact MB when extension memory is available, falls back to browser API when not.

- [ ] **Step 6: Commit**

```bash
git add src/tests/memory-panel.tsx src/pages/test-runner.tsx
git commit -m "Enhance memory panel with exact RAM from extension"
```

---

### Task 6: Enhance Network Panel with Interface Info

**Files:**
- Modify: `src/tests/network-panel.tsx:99` (props)
- Modify: `src/pages/test-runner.tsx` (pass prop)

- [ ] **Step 1: Add optional `networkInfo` prop**

In `src/tests/network-panel.tsx`, change the component signature (line 99):

```typescript
export default function NetworkPanel({ onResult, networkInfo }: {
  onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void
  networkInfo?: { mac: string; ip: string | null }
}) {
```

- [ ] **Step 2: Add interface info footer after the test results**

Find the "Test complete" message (line 318) and add after the closing `)}`:

```tsx
{networkInfo && phase === 'done' && !error && (
  <div className="text-[10px] text-gray-600 font-mono mt-1">
    Interface: {networkInfo.mac}{networkInfo.ip ? ` / ${networkInfo.ip}` : ''}
  </div>
)}
```

- [ ] **Step 3: Pass network info from test-runner.tsx**

In `test-runner.tsx`, find the `<NetworkPanel>` usage and change to:

```tsx
<NetworkPanel
  onResult={reportResult}
  networkInfo={extData?.network && !extData.network.error && extData.network.mac_address
    ? { mac: extData.network.mac_address, ip: extData.network.ipv4 || null }
    : undefined}
/>
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Check: After running network test, MAC/IP footer appears when extension network data is available.

- [ ] **Step 5: Commit**

```bash
git add src/tests/network-panel.tsx src/pages/test-runner.tsx
git commit -m "Enhance network panel with interface info from extension"
```

---

### Task 7: Report Modal -- Extension Data, Auto-Fill, and One-Page Enforcement

**Files:**
- Modify: `src/components/report-modal.tsx`
- Modify: `src/pages/test-runner.tsx` (pass new props to ReportModal)

- [ ] **Step 1: Update ReportModal props interface**

In `src/components/report-modal.tsx`, update the `ReportModalProps` interface (line 17):

```typescript
interface ReportModalProps {
  platform: PlatformInfo
  testResults: TestResult[]
  onClose: () => void
  extData?: ExtensionDeviceInfo | null
  extSettings?: Record<string, boolean> | null
  deviceNameFormat?: { format: string | null; locked: boolean } | null
}
```

Add imports at the top:

```typescript
import type { ExtensionDeviceInfo } from '../platform/extension-bridge'
import { resolveFormat, getAvailablePresets, DEVICE_NAME_PRESETS } from '../platform/device-name-format'
```

- [ ] **Step 2: Add auto-fill state and format dropdown**

In the component function, update the state initialization:

```typescript
export default function ReportModal({ platform, testResults, onClose, extData, extSettings, deviceNameFormat }: ReportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>(() => {
    // Admin format takes priority
    if (deviceNameFormat?.format) return deviceNameFormat.format
    // Check localStorage for last used
    const stored = localStorage.getItem('readystate_name_format')
    if (stored) return stored
    return ''
  })

  const [deviceName, setDeviceName] = useState(() => {
    if (deviceNameFormat?.format) {
      return resolveFormat(deviceNameFormat.format, extData || null)
    }
    return ''
  })

  const [notes, setNotes] = useState('')
  const [technician, setTechnician] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString())

  const formatLocked = deviceNameFormat?.locked ?? false
  const availablePresets = extSettings ? getAvailablePresets(extSettings) : []

  // Update device name when format changes
  const handleFormatChange = (format: string) => {
    setSelectedFormat(format)
    if (format) {
      setDeviceName(resolveFormat(format, extData || null))
      localStorage.setItem('readystate_name_format', format)
    } else {
      setDeviceName('')
    }
  }
```

- [ ] **Step 3: Add format dropdown UI above the device name input**

Replace the device name input section (lines 265-274) with:

```tsx
{/* Device identifier */}
<div>
  <label className="text-xs font-bold tracking-widest text-[#40E0D0] uppercase block mb-2">Device Name / Identifier</label>
  {/* Format dropdown - only shown when extension presets are available */}
  {(availablePresets.length > 0 || formatLocked) && (
    <div className="mb-2">
      <select
        value={selectedFormat}
        onChange={(e) => handleFormatChange(e.target.value)}
        disabled={formatLocked}
        className={`w-full px-3 py-2 text-xs bg-white/5 text-gray-300 rounded-lg border border-white/10 outline-none font-mono ${
          formatLocked ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#40E0D0]/50'
        }`}
      >
        <option value="">Custom (type below)</option>
        {availablePresets.map(p => (
          <option key={p.format} value={p.format}>{p.label}</option>
        ))}
        {formatLocked && deviceNameFormat?.format && (
          <option value={deviceNameFormat.format}>
            {deviceNameFormat.format} (admin policy)
          </option>
        )}
      </select>
      {formatLocked && (
        <p className="text-[10px] text-amber-400/70 mt-1 flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Format locked by administrator
        </p>
      )}
    </div>
  )}
  <input
    type="text"
    value={deviceName}
    onChange={(e) => setDeviceName(e.target.value)}
    disabled={formatLocked}
    placeholder="e.g. CB-2024-0142, Room 204 Cart B"
    className={`w-full px-3 py-2.5 text-sm bg-white/5 text-gray-200 rounded-xl border border-white/10 outline-none transition-colors placeholder:text-gray-600 font-mono ${
      formatLocked ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#40E0D0]/50'
    }`}
  />
</div>
```

- [ ] **Step 4: Add extension device info block to the PDF**

In the `buildPDF` function, after the header section and before "Section 1: System Summary", add a device info block that includes active extension data:

```typescript
    // Extension device info (compact 2-column layout)
    if (extData) {
      const extLines: Array<[string, string]> = []

      if (extData.cpu && !extData.cpu.error) {
        extLines.push(['CPU', `${extData.cpu.model_name} (${extData.cpu.num_of_processors} cores)`])
      }
      if (extData.memory && !extData.memory.error) {
        extLines.push(['RAM', `${extData.memory.capacity_gb} GB`])
      }
      if (extData.storage && Array.isArray(extData.storage) && extData.storage.length > 0 && !('error' in extData.storage[0])) {
        const items = extData.storage as Array<{ type: string; capacity_gb: number }>
        const fixed = items.filter(s => s.type === 'fixed')
        const primary = fixed.length > 0 ? fixed[0] : items[0]
        extLines.push(['Storage', `${primary.capacity_gb} GB ${primary.type}`])
      }
      if (extData.device_info && !extData.device_info.error) {
        extLines.push(['Device', [extData.device_info.manufacturer, extData.device_info.model].filter(Boolean).join(' ')])
      }
      if (extData.network && !extData.network.error) {
        if (extData.network.mac_address) extLines.push(['MAC', extData.network.mac_address])
        if (extData.network.ipv4) extLines.push(['IPv4', extData.network.ipv4])
      }
      if (extData.managed_attributes?.managed && !extData.managed_attributes.error) {
        if (extData.managed_attributes.serial_number) extLines.push(['Serial', extData.managed_attributes.serial_number])
        if (extData.managed_attributes.location) extLines.push(['Location', extData.managed_attributes.location])
        if (extData.managed_attributes.asset_id) extLines.push(['Asset ID', extData.managed_attributes.asset_id])
      }

      if (extLines.length > 0) {
        // Use smaller font if all 7 categories active (>6 lines)
        const fontSize = extLines.length > 6 ? 8 : 9
        doc.setFontSize(fontSize)

        // 2-column layout for extension data
        const colWidth = contentWidth / 2
        const leftLines = extLines.slice(0, Math.ceil(extLines.length / 2))
        const rightLines = extLines.slice(Math.ceil(extLines.length / 2))
        const startY = y

        leftLines.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold')
          doc.text(`${label}:`, margin + 2, y)
          doc.setFont('helvetica', 'normal')
          doc.text(value, margin + 30, y)
          y += 4.5
        })

        let rightY = startY
        rightLines.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold')
          doc.text(`${label}:`, margin + colWidth + 2, rightY)
          doc.setFont('helvetica', 'normal')
          doc.text(value, margin + colWidth + 30, rightY)
          rightY += 4.5
        })

        y = Math.max(y, rightY)
        y += 2
      }
    }
```

- [ ] **Step 5: Pass extension data from test-runner.tsx to ReportModal**

In `test-runner.tsx`, update the `<ReportModal>` usage (around line 244):

```tsx
<ReportModal
  platform={platform}
  testResults={allTests}
  onClose={() => setShowReport(false)}
  extData={extData}
  extSettings={extSettings?.settings}
  deviceNameFormat={extNameFormat}
/>
```

This requires fetching the device name format in test-runner.tsx. Add state and fetch it alongside other extension data. In the state declarations (around line 36), add:

```typescript
const [extNameFormat, setExtNameFormat] = useState<{ format: string | null; locked: boolean } | null>(null)
```

In the `useEffect` detection block (line 41-53), add to the Promise.all:

```typescript
import { getExtensionDeviceNameFormat } from '../platform/extension-bridge'

// Inside the useEffect, update the Promise.all:
const [info, settings, cats, nameFormat] = await Promise.all([
  getExtensionDeviceInfo(),
  getExtensionSettings(),
  getExtensionCategories(),
  getExtensionDeviceNameFormat().catch(() => ({ format: null, locked: false }))
])
setExtData(info)
setExtSettings(settings)
setExtCategories(cats)
setExtNameFormat(nameFormat)
```

- [ ] **Step 6: Verify report in browser**

Run: `npm run dev`
Check:
1. Open report modal -- format dropdown shows available presets
2. Select a format -- device name auto-fills
3. Export PDF -- extension data appears in compact 2-column block
4. PDF fits on one page with all 7 categories active

- [ ] **Step 7: Commit**

```bash
git add src/components/report-modal.tsx src/pages/test-runner.tsx
git commit -m "Add extension data to report with auto-fill and format dropdown"
```

---

### Task 8: Update Documentation Pages

**Files:**
- Modify: `src/pages/extension.tsx`
- Modify: `src/pages/privacy.tsx`

- [ ] **Step 1: Add device name format section to extension page**

In `src/pages/extension.tsx`, find the deployment guide section that shows the example JSON policy. Add a new subsection after the existing policy example explaining the `device_name_format` and `device_name_format_locked` fields.

Include:
- The two new fields in the example JSON
- A table of supported variables: `{serial}`, `{asset_id}`, `{location}`, `{hostname}`, `{manufacturer}`, `{model}`
- An example showing `"{serial} -- {location}"` producing `SN-2847193 -- Room 204`
- Note that the `_locked` flag prevents techs from changing the format

- [ ] **Step 2: Update privacy page**

In `src/pages/privacy.tsx`, add a mention in the extension data section that:
- Administrators can configure a device naming format via managed policy
- The format template uses device data variables (serial, location, etc.) for PDF report auto-fill
- No additional data is collected beyond what the existing categories already provide

- [ ] **Step 3: Verify pages render correctly**

Run: `npm run dev`
Check both pages display correctly with the new content.

- [ ] **Step 4: Commit**

```bash
git add src/pages/extension.tsx src/pages/privacy.tsx
git commit -m "Update extension and privacy docs with device name format"
```

---

### Task 9: Create Web Store Listing Description

**Files:**
- Create: `readystate-extension/store-listing.md`

- [ ] **Step 1: Write the store listing**

Create `readystate-extension/store-listing.md` with:
- Extension name and short description
- What it does (unlocks deeper hardware diagnostics)
- What it collects (device-only data, no user identity)
- The 7 data categories with brief descriptions
- Admin features: managed policy, force-install, category locking, device name format templates
- Privacy commitment: all data stays in the browser, no servers, no tracking
- Link to ReadyState web app

- [ ] **Step 2: Commit**

```bash
git add readystate-extension/store-listing.md
git commit -m "Add Web Store listing description"
```

---

### Task 10: Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Full flow test without extension**

Run: `npm run dev`
Verify:
- System Readout shows 8 baseline fields in 4-column grid
- No gear icon or category count
- No extension section or separator
- Memory panel uses browser API estimate
- Network panel shows no interface footer
- Report modal has no format dropdown, device name is manual entry
- PDF has no extension device info block

- [ ] **Step 2: Full flow test with extension (simulated)**

If extension is not available for testing, verify the code paths by checking:
- `getBaselineFields` returns fewer fields when `extData` has CPU/Memory/Display
- `getExtensionCards` returns correct cards for each category
- `resolveFormat` handles all variables and missing variable stripping
- ReportModal renders format dropdown with correct presets

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: No TypeScript errors, no build warnings.

- [ ] **Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "Integration verification cleanup"
```
