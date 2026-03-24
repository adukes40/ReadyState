/**
 * Extension page - explains the ReadyState Chrome Extension, what it collects,
 * why admin force-install is recommended, and how to deploy it.
 */

export default function ExtensionPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#40E0D0]/10 flex items-center justify-center border border-[#40E0D0]/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
            <path d="m9 15 2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Chrome Extension</h1>
          <p className="text-sm text-gray-500">Unlock deeper device diagnostics with the ReadyState extension</p>
        </div>
      </div>

      {/* Why the extension */}
      <Section title="Why Use the Extension?">
        <p>
          ReadyState works in any browser without installing anything. However, browsers intentionally
          limit the hardware data a website can access. The ReadyState Chrome Extension bridges this gap
          by using privileged Chrome system APIs to surface data the browser alone cannot provide.
        </p>
        <p>
          When force-installed through Google Admin, the extension unlocks managed device attributes
          that are not available through any other method, including serial numbers, asset IDs, and
          hardware manufacturer details.
        </p>
      </Section>

      {/* What it collects */}
      <Section title="What the Extension Collects">
        <p>
          The extension only collects device-level hardware data. No user identity, browsing history,
          or personal information is gathered. All data stays in the browser and is never sent to any server.
        </p>

        <div className="mt-4 space-y-3">
          <CategoryBlock
            title="Available on All Devices"
            description="These work on any Chromebook, even without admin enrollment."
            items={[
              { label: 'CPU Details', detail: 'Full processor model name, core count, architecture, and feature flags (SSE, AVX, etc.)' },
              { label: 'Exact RAM', detail: 'Total physical memory in bytes, not the capped value browsers report via navigator.deviceMemory' },
              { label: 'Storage', detail: 'Internal and removable drive capacity and type' },
              { label: 'Display', detail: 'Native resolution, refresh rate, DPI, rotation, and touch support for all connected displays' },
              { label: 'CPU Temperatures', detail: 'Thermal zone readings from ChromeOS (not available on other operating systems)' },
            ]}
          />

          <CategoryBlock
            title="Requires Admin Force-Install"
            description="These are only available when the extension is deployed via Google Admin on an enrolled device."
            highlight
            items={[
              { label: 'Serial Number', detail: 'Hardware serial number from chrome.enterprise.deviceAttributes' },
              { label: 'Asset ID', detail: 'Admin-assigned asset identifier set in the Google Admin console' },
              { label: 'Hostname', detail: 'Device hostname configured via the DeviceHostnameTemplate policy' },
              { label: 'Location', detail: 'Admin-assigned location annotation (e.g. "Room 204", "Building C")' },
              { label: 'Directory Device ID', detail: 'Server-generated identifier from the Google Admin Directory API' },
              { label: 'Manufacturer & Model', detail: 'Hardware manufacturer and model name via chrome.enterprise.hardwarePlatform' },
              { label: 'Network Identity', detail: 'MAC address, IPv4, and IPv6 of the default network adapter' },
            ]}
          />
        </div>
      </Section>

      {/* What it does NOT collect */}
      <Section title="What It Does NOT Collect">
        <p>
          The extension is designed for compliance with FERPA, COPPA, and HIPAA.
          The following are explicitly excluded:
        </p>
        <ul className="list-none space-y-1.5 mt-3">
          <BulletItem text="No user email, name, or account information" />
          <BulletItem text="No browsing history, cookies, or bookmarks" />
          <BulletItem text="No keystroke logging or screen capture" />
          <BulletItem text="No file access or document content" />
          <BulletItem text="No GPS or geolocation data" />
          <BulletItem text="No audio, video, or camera access" />
          <BulletItem text="No data is transmitted to any server" />
        </ul>
      </Section>

      {/* Manual vs force install */}
      <div className="bg-[#0a1628] border border-blue-500/30 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-1">Manual Install Is Limited</h3>
            <p className="text-sm text-blue-200/70 leading-relaxed">
              Manually installing the extension from the Chrome Web Store gives you the basic hardware
              data (CPU, RAM, storage, display) but does not unlock managed device attributes like
              serial number, asset ID, or network identity. Chrome requires the extension to be
              force-installed via enterprise policy for those APIs to function. If you are an
              individual user or want to preview the extension, manual install will work for the basics.
            </p>
          </div>
        </div>
      </div>

      {/* User controls */}
      <Section title="User Privacy Controls">
        <p>
          Each data category can be individually toggled on or off by the user in the Extension Data
          Settings panel on the Tests page. When a category is turned off, the extension will not
          collect that data and ReadyState will fall back to browser-only detection.
        </p>
        <p>
          Administrators can also configure default settings and lock specific categories via
          Google Admin managed policy. Locked categories cannot be changed by the user and display
          a lock indicator in the settings panel.
        </p>
      </Section>

      {/* Chrome Web Store link */}
      <Section title="View in Chrome Web Store">
        <p>
          The extension is published on the Chrome Web Store for review. While you can install it
          manually from the store, the recommended path for organizations is force-install
          through Google Admin (see deployment guide below).
        </p>
        <a
          href="https://chromewebstore.google.com/detail/readystate-device-info/igajedmfcffiplhejghgfdencfgjlcad"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-white/5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View on Chrome Web Store
        </a>
      </Section>

      {/* Deployment guide */}
      <Section title="Admin Deployment Guide">
        <p>
          Follow these steps to force-install the ReadyState extension across your managed
          Chromebook fleet via the Google Admin console.
        </p>

        <div className="mt-4 space-y-4">
          <Step number={1} title="Open Google Admin Console">
            <p>
              Navigate to{' '}
              <span className="text-gray-300 font-mono text-sm">admin.google.com</span>{' '}
              and sign in with your administrator account.
            </p>
          </Step>

          <Step number={2} title="Navigate to Chrome App Management">
            <p>
              Go to <span className="text-gray-300">Devices</span> {'>'}{' '}
              <span className="text-gray-300">Chrome</span> {'>'}{' '}
              <span className="text-gray-300">Apps & extensions</span> {'>'}{' '}
              <span className="text-gray-300">Users & browsers</span> (or{' '}
              <span className="text-gray-300">Managed guest sessions</span> if applicable).
            </p>
          </Step>

          <Step number={3} title="Add the Extension">
            <p>
              Click the <span className="text-gray-300">+</span> button and select{' '}
              <span className="text-gray-300">Add from Chrome Web Store</span>. You can search for{' '}
              <span className="text-gray-300 font-mono text-sm">ReadyState Device Info</span>,
              or use the extension ID directly:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 font-mono select-all">
                igajedmfcffiplhejghgfdencfgjlcad
              </code>
              <span className="text-xs text-gray-500">Extension ID</span>
            </div>
            <p className="mt-2">
              Paste the ID into the search field and select the extension from the results.
            </p>
          </Step>

          <Step number={4} title="Set Installation Policy">
            <p>
              Under <span className="text-gray-300">Installation policy</span>, select{' '}
              <span className="text-gray-300 font-semibold">Force install</span>. This ensures
              the extension is automatically installed on all devices in the selected organizational
              unit and cannot be removed by users. This is required for managed device attributes
              (serial number, asset ID, etc.) to be accessible.
            </p>
          </Step>

          <Step number={5} title="Configure Data Collection Defaults (Optional)">
            <p>
              Under <span className="text-gray-300">Policy for extensions</span>, you can push a
              JSON configuration to control which data categories are enabled by default and which
              are locked. Paste your JSON into the policy field:
            </p>
            <div className="mt-3 bg-[#0a0a0a] border border-white/10 rounded-xl p-4 font-mono text-xs text-gray-400 overflow-x-auto">
              <pre className="whitespace-pre">{`{
  "cpu_enabled": { "Value": true },
  "cpu_locked": { "Value": false },
  "memory_enabled": { "Value": true },
  "memory_locked": { "Value": false },
  "storage_enabled": { "Value": true },
  "storage_locked": { "Value": false },
  "display_enabled": { "Value": true },
  "display_locked": { "Value": false },
  "device_info_enabled": { "Value": true },
  "device_info_locked": { "Value": true },
  "network_enabled": { "Value": true },
  "network_locked": { "Value": true },
  "managed_attributes_enabled": { "Value": true },
  "managed_attributes_locked": { "Value": true }
}`}</pre>
            </div>
            <div className="mt-3 space-y-1.5">
              <p className="text-sm text-gray-500">
                <span className="text-gray-300 font-medium">_enabled</span> - whether the category is
                on (<span className="text-gray-300">true</span>) or off (<span className="text-gray-300">false</span>) by default.
              </p>
              <p className="text-sm text-gray-500">
                <span className="text-gray-300 font-medium">_locked</span> - if{' '}
                <span className="text-gray-300">true</span>, the user cannot change this setting.
                The toggle will appear grayed out with a lock icon.
              </p>
              <p className="text-sm text-gray-500">
                Any category not included in the policy defaults to enabled and unlocked.
              </p>
            </div>
          </Step>

          <Step number={6} title="Select Organizational Unit">
            <p>
              Choose the organizational unit (OU) that contains the devices you want to deploy to.
              You can target specific OUs (e.g. "Student Chromebooks") or apply to the entire domain.
              Click <span className="text-gray-300">Save</span>.
            </p>
          </Step>

          <Step number={7} title="Verify Deployment">
            <p>
              On a managed Chromebook in the target OU, sign in and open Chrome. The ReadyState
              extension icon should appear in the toolbar. Click it to verify it shows "Managed
              Device" with serial number and asset details. Then visit{' '}
              <span className="text-gray-300 font-mono text-sm">readystate.dev</span> to see the
              enriched System Readout.
            </p>
          </Step>
        </div>
      </Section>

      {/* Enable hardwarePlatform policy note */}
      <div className="bg-[#0a1628] border border-blue-500/30 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-1">Optional: Enable Hardware Platform API</h3>
            <p className="text-sm text-blue-200/70 leading-relaxed">
              To surface the device manufacturer and model, the{' '}
              <span className="text-blue-300 font-mono text-xs">EnterpriseHardwarePlatformAPIEnabled</span>{' '}
              policy must be set to <span className="text-blue-300">true</span>. In Google Admin, go to{' '}
              <span className="text-blue-300">Devices {'>'} Chrome {'>'} Settings {'>'} Users & browsers</span>,
              search for "Hardware Platform API", and enable it for the relevant OU.
            </p>
          </div>
        </div>
      </div>

      {/* Data categories reference */}
      <Section title="Data Categories Reference">
        <p>These are the toggleable categories in the Extension Data Settings panel:</p>
        <div className="mt-3 space-y-2">
          <DataRow label="Device Info" detail="Manufacturer and model name (requires force-install + EnterpriseHardwarePlatformAPIEnabled policy)" />
          <DataRow label="CPU" detail="Processor model, core count, architecture, feature flags, thermal readings" />
          <DataRow label="Memory" detail="Total physical RAM and currently available RAM in bytes" />
          <DataRow label="Storage" detail="All storage devices with type (fixed/removable) and capacity" />
          <DataRow label="Display" detail="Resolution, DPI, rotation, refresh rate, touch and accelerometer support for each display" />
          <DataRow label="Network" detail="MAC address, IPv4, IPv6 of the default adapter (requires force-install)" />
          <DataRow label="Managed Attributes" detail="Serial number, asset ID, hostname, location, directory device ID (requires force-install on enrolled device)" />
        </div>
      </Section>
    </div>
  )
}

/* ---- Layout helpers ---- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-white/5 p-5 space-y-3 hover:border-white/10 transition-colors">
      <h3 className="text-sm font-bold tracking-widest text-[#40E0D0] uppercase">{title}</h3>
      <div className="text-sm text-gray-400 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#40E0D0]/10 border border-[#40E0D0]/20 flex items-center justify-center text-xs font-bold text-[#40E0D0]">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
        <div className="text-sm text-gray-400 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  )
}

function CategoryBlock({ title, description, items, highlight }: {
  title: string
  description: string
  items: { label: string; detail: string }[]
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'bg-[#0a1628] border-blue-500/20' : 'bg-[#0f0f0f] border-white/5'}`}>
      <h4 className={`text-xs font-bold tracking-widest uppercase mb-1 ${highlight ? 'text-blue-400' : 'text-gray-500'}`}>{title}</h4>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <DataRow key={item.label} label={item.label} detail={item.detail} />
        ))}
      </div>
    </div>
  )
}

function DataRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-300 font-medium flex-shrink-0 sm:w-44">{label}</span>
      <span className="text-sm text-gray-500">{detail}</span>
    </div>
  )
}

function BulletItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[#40E0D0] flex-shrink-0 mt-1.5" />
      <span>{text}</span>
    </li>
  )
}
