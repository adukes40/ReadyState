# ReadyState Diagnostics Extension - Chrome Web Store Listing

## Extension Name

ReadyState Diagnostics Extension

## Short Description (132 characters max)

Unlocks deeper hardware diagnostics for Chromebook fleet management. Provides privileged Chrome system API data to ReadyState.

## Full Description

ReadyState Diagnostics Extension connects the ReadyState web app (readystate.dev) to privileged Chrome system APIs, surfacing device hardware data that standard browser JavaScript cannot access.

**What it does**

The extension provides hardware telemetry to the ReadyState diagnostic tool running in the browser tab. No data leaves the browser. No servers are involved.

**What it collects**

Seven hardware-only data categories, all device-level with no user identity:

- CPU: full processor model name, core count, architecture, feature flags, and thermal readings
- Memory: exact total physical RAM (not the browser-capped value)
- Storage: internal and removable drive capacity and type
- Display: native resolution, refresh rate, DPI, rotation, and touch support per display
- Network: MAC address, IPv4, and IPv6 of the default network adapter
- Device Info: hardware manufacturer and model name
- Managed Attributes: serial number, admin-assigned asset ID, hostname, location annotation, and directory device ID

Managed Attributes and Network require the extension to be force-installed via Google Admin on an enrolled device.

**What it does NOT collect**

- No user email, name, or account information
- No browsing history, cookies, or bookmarks
- No keystroke logging or screen capture
- No file access or document content
- No GPS or geolocation
- No audio or video

**Privacy**

All data stays in the browser session. Nothing is transmitted to any server. The extension has no background persistence and no remote endpoints. It is safe for FERPA, COPPA, and HIPAA environments.

**Admin features**

Built for Google Workspace administrators managing Chromebook fleets:

- Force-install via Google Admin for zero-touch deployment
- Managed policy (JSON) controls which categories are enabled by default
- Per-category lock flags prevent users from changing admin-configured settings
- Device name format templates (e.g. `{serial} -- {location}`) auto-fill the device name field in PDF diagnostic reports using live device data variables: `{serial}`, `{asset_id}`, `{location}`, `{hostname}`, `{manufacturer}`, `{model}`
- Device name format can be locked to enforce consistent naming across the fleet

**Works with**

readystate.dev - browser-based Chromebook hardware diagnostics for IT technicians and fleet administrators.
