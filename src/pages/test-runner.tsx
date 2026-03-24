/**
 * Test Runner - Grouped, stitch-styled test sections.
 * Collects test results for PDF export via report modal.
 */

import { useState, useEffect } from 'react'
import { detectPlatform } from '../platform/detect'
import type { PlatformInfo } from '../platform/detect'
import { detectExtension, getExtensionDeviceInfo, getExtensionSettings, setExtensionSetting, getExtensionCategories, getExtensionDeviceNameFormat } from '../platform/extension-bridge'
import type { ExtensionDeviceInfo, ExtensionSettings, CategoryDef } from '../platform/extension-bridge'
import ExtensionSettingsPanel from '../components/extension-settings'
import InfoTip from '../components/info-tip'
import ReportModal from '../components/report-modal'
import type { TestResult } from '../components/report-modal'
import KeyboardTest from '../tests/keyboard-test'
import TrackpadTest from '../tests/trackpad-test'
import DisplayTestScreen from '../tests/display-test-screen'
import MemoryPanel from '../tests/memory-panel'
import TabSwarmPanel from '../tests/tab-swarm-panel'
import EndurancePanel from '../tests/endurance-panel'
import MediaPanel from '../tests/media-panel'
import NetworkPanel from '../tests/network-panel'
import BatteryWidget from '../components/battery-widget'
import KofiButton from '../components/kofi-button'

interface TestRunnerProps {
  reportResult: (name: string, status: TestResult['status'], detail: string) => void
  testResults: Record<string, TestResult>
}

export default function TestRunner({ reportResult, testResults }: TestRunnerProps) {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null)
  const [extData, setExtData] = useState<ExtensionDeviceInfo | null>(null)
  const [extSettings, setExtSettings] = useState<ExtensionSettings | null>(null)
  const [extCategories, setExtCategories] = useState<Record<string, CategoryDef> | null>(null)
  const [extNameFormat, setExtNameFormat] = useState<{ format: string | null; locked: boolean } | null>(null)
  const [showDisplayTest, setShowDisplayTest] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    detectPlatform().then(setPlatform)
    detectExtension(3000).then(async (found) => {
      if (!found) return
      try {
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
      } catch { /* extension available but data fetch failed */ }
    })
  }, [])

  const handleExtToggle = async (category: string, enabled: boolean) => {
    if (!extSettings) return
    // Optimistic update
    setExtSettings(prev => prev ? { ...prev, settings: { ...prev.settings, [category]: enabled } } : prev)
    try {
      await setExtensionSetting(category, enabled)
      // Re-fetch device data with new settings
      const info = await getExtensionDeviceInfo()
      setExtData(info)
    } catch {
      // Revert on failure
      setExtSettings(prev => prev ? { ...prev, settings: { ...prev.settings, [category]: !enabled } } : prev)
    }
  }

  // Build ordered test results list for report
  const allTests: TestResult[] = [
    testResults['Speaker'] ?? { name: 'Speaker', status: 'not run', detail: '' },
    testResults['Microphone'] ?? { name: 'Microphone', status: 'not run', detail: '' },
    testResults['Camera'] ?? { name: 'Camera', status: 'not run', detail: '' },
    testResults['Display'] ?? { name: 'Display', status: 'not run', detail: '' },
    testResults['Keyboard'] ?? { name: 'Keyboard', status: 'not run', detail: '' },
    testResults['Trackpad'] ?? { name: 'Trackpad', status: 'not run', detail: '' },
    testResults['Memory Pressure'] ?? { name: 'Memory Pressure', status: 'not run', detail: '' },
    testResults['Tab Swarm'] ?? { name: 'Tab Swarm', status: 'not run', detail: '' },
    testResults['Endurance'] ?? { name: 'Endurance', status: 'not run', detail: '' },
    testResults['Network Speed'] ?? { name: 'Network Speed', status: 'not run', detail: '' },
  ]

  return (
    <div className="max-w-6xl mx-auto sections-gap">
      {/* System Readout */}
      {platform && (
        <div className="animate-fade-up">
          <div className="bg-[#141414] rounded-2xl panel-compact animate-shimmer border border-white/5">
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
          </div>
        </div>
      )}

      {/* Hardware Tests */}
      <TestGroup label="Hardware Tests" index={0}>
        <Panel title="Audio & Camera" info={"Speaker: plays a 440Hz test tone to verify audio output.\nMicrophone: records 3 seconds and checks input level.\nCamera: detects resolution and frame rate.\nDisplay: click Run Display Test to cycle fullscreen colors for dead pixel and backlight bleed checks. Completing all colors reports a pass."}>
          <MediaPanel onDisplayTest={() => setShowDisplayTest(true)} onResult={reportResult} />
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Panel title="Network Speed" info={"Click the gauge to run 14 measurement steps against Cloudflare's edge.\nDownload/Upload: measures throughput in Mbps.\nLatency/Jitter: idle connection responsiveness.\nDL/UL Latency and Jitter: measured during active transfers to show real-world performance under load.\nScore: overall connection quality rating from Cloudflare.\nColor thresholds: latency green under 50ms, speed green above 25 Mbps, jitter green under 5ms."}>
            <NetworkPanel
              onResult={reportResult}
              networkInfo={extData?.network && !extData.network.error && extData.network.mac_address
                ? { mac: extData.network.mac_address, ip: extData.network.ipv4 || null }
                : undefined}
            />
          </Panel>
          <Panel title="Battery Status" info={"Reads the Battery Status API for live charge level, plug state, and estimated time to full or empty.\nAuto-updates every 30 seconds and on system battery events.\nColor changes at 25% (yellow) and 10% (red).\nNot available on all browsers or desktop devices."}>
            <BatteryWidget />
          </Panel>
        </div>
      </TestGroup>

      {/* Input Tests */}
      <TestGroup label="Input Tests" index={1}>
        <Panel title="Keyboard & Trackpad" info={"Keyboard: press each key on the physical keyboard to mark it as tested. Switch between Chromebook, MacBook, and Laptop layouts with the dropdown. On Chromebooks, top-row keys (Back, Refresh, Fullscreen, etc.) are OS-controlled and cannot be captured.\nTrackpad: move the cursor, left/right/middle click, double-click, and scroll vertically and horizontally on the canvas to verify all 7 actions.\nUse Reset to clear progress on either test."}>
          <KeyboardTest onResult={reportResult} />
          <div className="border-t border-white/5 my-4" />
          <TrackpadTest onResult={reportResult} />
        </Panel>
      </TestGroup>

      {/* Stress Tests */}
      <TestGroup label="Stress Tests" index={2}>
        <Panel title="Memory Pressure" info={"Allocates memory in 16 MB chunks until the browser refuses or you click Stop.\nThe gauge shows allocation as a percentage of reported device RAM.\nGC Detected: appears if the browser reclaims memory mid-test.\nPeak allocation is shown after the test completes.\nUse Reset to return to idle."}>
          <MemoryPanel
            onResult={reportResult}
            exactRamMB={extData?.memory && !extData.memory.error ? Math.round(extData.memory.capacity_bytes / (1024 * 1024)) : undefined}
          />
        </Panel>

        <Panel title="Tab Swarm" info={"Spawns Web Workers that simulate browser tabs at four weight levels: Search (8MB), Docs (24MB), Interactive (48MB), Video (64MB).\nPick a preset like Classroom Mix or Testing Day, then click Swarm.\nTabs spawn every 1.2 seconds while real-time charts track thread latency, frame rate, and JS heap memory.\nAfter all tabs open, the test runs 5 more seconds to measure sustained load.\nPeak latency under 50ms: device handled it well. Over 150ms: device struggled."}>
          <TabSwarmPanel onResult={reportResult} />
        </Panel>

        <Panel title="Endurance Test" info={"Opens a popup window that runs configurable stress workloads: animated DOM elements, canvas particles, synthetic video streams, CPU workers, and memory allocation.\nAdjust sliders for each category and set a duration from 1 to 10 minutes.\nThe control panel monitors your main browser thread to see how the extra load affects responsiveness.\nPeak latency under 50ms means the device handles the load fine. Over 150ms means it is struggling.\nPresets: Light for a quick check, Torture to find the breaking point."}>
          <EndurancePanel onResult={reportResult} />
        </Panel>
      </TestGroup>

      {/* Fullscreen overlay */}
      {showDisplayTest && (
        <DisplayTestScreen
          onComplete={() => { setShowDisplayTest(false); reportResult('Display', 'pass', 'All color patterns completed') }}
          onExit={() => setShowDisplayTest(false)}
        />
      )}

      {/* Report modal */}
      {showReport && platform && (
        <ReportModal
          platform={platform}
          testResults={allTests}
          onClose={() => setShowReport(false)}
          extData={extData}
          extSettings={extSettings?.settings}
          deviceNameFormat={extNameFormat}
        />
      )}
    </div>
  )
}

/* Subcomponents */

function ReadoutCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-[1.02]">
      <div className="readout-icon rounded-xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-0.5">{label}</div>
        <div className="text-sm text-gray-200 font-medium font-mono leading-tight" title={value}>{value}</div>
      </div>
    </div>
  )
}

function TestGroup({ label, index, children }: { label: string; index: number; children: React.ReactNode }) {
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${index * 100 + 100}ms` }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#40E0D0] shadow-[0_0_8px_rgba(64,224,208,0.6)]" />
        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400">{label}</h2>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function Panel({ title, info, children }: { title: string; info?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#141414] border border-white/5 rounded-2xl panel-compact glow-card transition-shadow animate-scale-in">
      <h3 className="flex items-center gap-2.5 text-sm font-semibold text-text-primary">
        <span className="w-1.5 h-4 rounded-full bg-[#40E0D0]" />
        {title}
        {info && <InfoTip text={info} />}
      </h3>
      {children}
    </section>
  )
}

function cleanGPU(raw: string): string {
  return raw
    .replace(/^ANGLE \(/, '')
    .replace(/\)$/, '')
    .replace(/[,\s]*Direct3D.*$/i, '')
    .replace(/[,\s]*OpenGL.*$/i, '')
    .replace(/\s+\(0x[\da-fA-F]+\)/g, '')
    .replace(/^(Intel|AMD|NVIDIA),\s*/i, '')
    .trim()
}

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

function ExtensionCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0f1a1a] border border-[#1a3a3a] rounded-2xl p-4 transition-transform hover:scale-[1.02]">
      <div className="text-[10px] font-bold tracking-widest text-[#40E0D0] uppercase mb-1.5">{label}</div>
      <div className="text-sm text-gray-200 font-medium font-mono leading-tight" title={value}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 font-mono mt-0.5">{sub}</div>}
    </div>
  )
}

/* Inline SVG icons */

function PlatformIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
    </svg>
  )
}

function BrowserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function CpuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  )
}

function MemoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 19v-2M10 19v-4M14 19v-6M18 19v-8" />
    </svg>
  )
}

function DisplayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" /><path d="m16 16 5 3-3-5Z" />
    </svg>
  )
}

function ColorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  )
}

function TouchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v0" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
    </svg>
  )
}

function GpuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h0M10 10h0M14 10h0M18 10h0M6 14h0M10 14h0M14 14h0M18 14h0" />
    </svg>
  )
}

