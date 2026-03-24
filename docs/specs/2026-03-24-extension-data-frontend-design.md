# Extension Data Frontend Integration Design

**Date:** 2026-03-24
**Status:** Draft
**Scope:** Frontend layout redesign to handle dynamic Chrome extension data alongside browser API data

---

## Problem

The ReadyState Chrome extension provides up to 7 categories of device data (CPU, Memory, Storage, Display, Network, Device Info, Managed Attributes), each independently togglable by the user or lockable by an admin via Google Admin Console policy. The frontend needs to present any combination of these categories alongside the existing browser API baseline without layout breakage, visual awkwardness, or duplicate data.

## Decisions

### Layout: Category-Based Modular Panels (4-Column Grid)

Reorganize the System Readout by **topic** rather than data source. Each panel shows the best available data -- extension data replaces browser API fields where they overlap, extension-only categories appear when enabled, and disabled categories simply don't render.

**4-column grid** confirmed on Chromebook hardware (1366x768 with 13rem sidebar).

**Three states:**

1. **No extension** -- 8 browser API fields in 2-row, 4-column grid. No gear icon, no extension section.
2. **Extension with N categories** -- Baseline row (shrinks as extension replaces overlapping fields) + gradient separator + extension row(s) with cyan-accented cards.
3. **All 7 categories** -- 4 baseline + 7 extension = 11 cards across ~4 rows.

### Data Replacement Logic

Extension data **replaces** overlapping browser API fields, never duplicates them.

**Replaced fields (extension wins):**

| Browser API field | Replaced by | What changes |
|---|---|---|
| CPU Cores: `4` | CPU panel: `Intel N4020 / 4 cores -- SSE4.2` | Richer detail, moves to extension row |
| Memory: `~4 GB` | Memory panel: `4096 MB` | Exact value instead of capped estimate |
| Screen: `1366 x 768` | Display panel: `1366x768 / 60Hz -- 135 DPI` | Adds refresh rate, DPI |

**Never replaced (no extension equivalent):** Platform (OS), Browser version, GPU renderer.

**Extension-only:** Storage, Network, Device Info, Managed Attributes -- only appear when their category is enabled.

### Visual Differentiation

- Baseline cards: `#1a1a1a` background, `#2a2a2a` border, `#666` labels
- Extension cards: `#0f1a1a` background, `#1a3a3a` border, `#40E0D0` (cyan) labels
- Gradient separator line between baseline and extension rows

### Settings Toggle: Inline Gear Icon

- Gear icon in System Readout header, only visible when extension is detected
- Shows "X/7 categories" count
- Expands a 4-column toggle row between header and data
- Admin-locked categories: amber toggle + lock icon (non-interactive)
- User-unlocked categories: cyan toggle
- Collapses back to gear icon when done

Settings are manageable from three places (different scopes):
- **Google Admin Console JSON** -- fleet/OU-wide policy (admin)
- **Extension options page** -- per-device persistent preference (tech)
- **In-app toggle panel** -- per-session quick adjustment (tech)

### Test Panel Enhancement (Scoped)

Tests remain independent -- extension data only enhances display labels, never changes test logic.

**Enhanced:**

| Test | Enhancement |
|---|---|
| Memory Pressure | Uses exact RAM from extension as denominator: "2048 MB of 4096 MB (50%)" instead of "~4 GB" |
| Network Speed | Shows interface info as footer line: "Interface: AA:BB:CC:DD:EE:FF / 192.168.1.45" |

**Unchanged:** Audio & Camera, Battery, Keyboard & Trackpad, Tab Swarm, Endurance, Display Color Test.

**Rule:** Each test panel checks if relevant extension data exists in props. If present, use it. If not, fall back to browser API or omit. No "install extension" prompts.

### PDF Report -- One Page, Auto-Fill

**Hard constraint: report must fit on a single printed page.**

**Auto-fill device name:**

Pre-populates from extension data using a format pattern. Preset options:
- `Serial -- Location` (e.g., SN-2847193 -- Room 204)
- `Asset ID -- Serial` (e.g., #1847 -- SN-2847193)
- `Model -- Serial` (e.g., Acer CB 311 -- SN-2847193)
- `Custom` (manual entry, same as today)

Only presets with active extension data appear. Last selection stored in localStorage.

**Admin-configurable device name format via JSON policy:**

```json
{
  "device_name_format": { "Value": "{serial} -- {location}" },
  "device_name_format_locked": { "Value": true }
}
```

Supported variables:

| Variable | Source category | Example |
|---|---|---|
| `{serial}` | Managed Attributes | SN-2847193 |
| `{asset_id}` | Managed Attributes | 1847 |
| `{location}` | Managed Attributes | Room 204 |
| `{hostname}` | Managed Attributes | CB-LAB204-03 |
| `{manufacturer}` | Device Info | Acer |
| `{model}` | Device Info | Chromebook 311 |

When `device_name_format_locked` is true, the tech cannot change the format or edit the field.

**Missing variable handling:** If a variable resolves to empty (category disabled or attribute unavailable), the variable and its surrounding separator are stripped. `"{serial} -- {location}"` with empty location becomes `SN-2847193`.

**One-page enforcement:**
- Device info block: compact 2-column key-value layout (max 7 short lines in ~4 vertical lines)
- Test results block: unchanged
- Fallback: font size drops from 10pt to 9pt if all 7 categories active

**Report mirrors screen state** -- includes whatever data is currently active. No separate report configuration.

### Device Name Format Data Flow

```
Admin Console JSON --> Extension managed storage -->
  GET_DEVICE_NAME_FORMAT message --> extension-bridge.ts -->
    test-runner.tsx state --> report-modal.tsx auto-fill
```

## Files Changed

| File | Change |
|---|---|
| `src/pages/test-runner.tsx` | Refactor readout from flat grid to baseline + extension row pattern. Pass extension data to enhanced test panels. |
| `src/components/extension-settings.tsx` | Restyle to 4-column inline toggle row. Add lock icon styling. |
| `src/components/report-modal.tsx` | Add device info block, auto-fill logic, format dropdown, format-from-policy support. One-page enforcement. |
| `src/platform/extension-bridge.ts` | Add `GET_DEVICE_NAME_FORMAT` message type. |
| `readystate-extension/managed_schema.json` | Add `device_name_format` and `device_name_format_locked` fields. |
| `readystate-extension/src/background.js` | Handle new message type, read format from managed storage. |
| `src/pages/extension.tsx` | Update deployment guide with new policy fields, variable table, examples. |
| `src/pages/privacy.tsx` | Mention admin-configurable naming format. |
| `readystate-extension/store-listing.md` | New file -- Web Store description text. |

## Files Unchanged

- No new dependencies or libraries
- No state management changes (React hooks, component-level state)
- No new pages or routes
- Unenhanced test panels untouched
- Extension detection/bridge pattern unchanged (DOM events)
- Sidebar, navigation, app shell untouched

## Edge Cases

- **Extension detected but all categories disabled:** Baseline renders all 8 browser API fields. Gear icon shows "0/7 categories". No extension row.
- **Admin locks all categories off:** Same as above, but gear icon toggles are all disabled with lock icons.
- **Admin sets device_name_format but disables required categories:** Format can't resolve. Falls back to empty field (manual entry). Extension should log a config mismatch warning.
- **Device has no managed attributes (not enrolled):** Managed Attributes category returns empty. Panel doesn't render. Format variables for those fields resolve to empty.
