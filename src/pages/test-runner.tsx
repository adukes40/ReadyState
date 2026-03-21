/**
 * Test Runner - Grouped, stitch-styled test sections.
 * Collects test results for PDF export via report modal.
 */

import { useState, useEffect } from 'react'
import { detectPlatform } from '../platform/detect'
import type { PlatformInfo } from '../platform/detect'
import InfoTip from '../components/info-tip'
import ReportModal from '../components/report-modal'
import type { TestResult } from '../components/report-modal'
import KeyboardTest from '../tests/keyboard-test'
import TrackpadTest from '../tests/trackpad-test'
import DisplayTestScreen from '../tests/display-test-screen'
import MemoryPanel from '../tests/memory-panel'
import TabSwarmPanel from '../tests/tab-swarm-panel'
import MediaPanel from '../tests/media-panel'

interface TestRunnerProps {
  reportResult: (name: string, status: TestResult['status'], detail: string) => void
  testResults: Record<string, TestResult>
}

export default function TestRunner({ reportResult, testResults }: TestRunnerProps) {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null)
  const [showDisplayTest, setShowDisplayTest] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    detectPlatform().then(setPlatform)
  }, [])

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
    testResults['Network Speed'] ?? { name: 'Network Speed', status: 'not run', detail: '' },
  ]

  return (
    <div className="max-w-6xl mx-auto sections-gap">
      {/* System Readout */}
      {platform && (
        <div className="animate-fade-up">
          <div className="bg-[#141414] rounded-2xl panel-compact animate-shimmer border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">System Readout</span>
              <button
                onClick={() => setShowReport(true)}
                className="px-4 py-1.5 text-xs font-mono bg-white/5 text-white/80 rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                Export PDF
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 readout-grid">
              <ReadoutCard icon={<PlatformIcon />} label="Platform" value={platform.os} />
              <ReadoutCard icon={<BrowserIcon />} label="Browser" value={cleanBrowser(platform.browser)} />
              <ReadoutCard icon={<CpuIcon />} label="Processor" value={`${platform.cores} cores${platform.architecture ? ` · ${platform.architecture}` : ''}`} />
              <ReadoutCard icon={<MemoryIcon />} label="Memory" value={platform.ram ? (platform.ram >= 8 ? `≥${platform.ram} GB` : `${platform.ram} GB`) : '—'} />
              <ReadoutCard icon={<DisplayIcon />} label="Display" value={`${platform.screenWidth}×${platform.screenHeight} @${platform.pixelRatio}x`} />
              <ReadoutCard icon={<ColorIcon />} label="Color Depth" value={`${platform.colorDepth}-bit`} />
              <ReadoutCard icon={<TouchIcon />} label="Touch" value={platform.touchSupported ? `${platform.maxTouchPoints} points` : 'None'} />
              {platform.gpu && <ReadoutCard icon={<GpuIcon />} label="Graphics" value={cleanGPU(platform.gpu)} />}
            </div>
          </div>
        </div>
      )}

      {/* Hardware Tests */}
      <TestGroup label="Hardware Tests" index={0}>
        <Panel title="Audio & Camera" info="Tests speaker output (440Hz tone), microphone input (3s recording level check), and camera (resolution + frame rate). Verifies all media hardware works for video calls and classroom activities.">
          <MediaPanel onDisplayTest={() => setShowDisplayTest(true)} onResult={reportResult} />
        </Panel>
      </TestGroup>

      {/* Input Tests */}
      <TestGroup label="Input Tests" index={1}>
        <Panel title="Keyboard & Trackpad" info="Tests every key on the keyboard and trackpad actions. Press each key and it lights up when registered. Draw on the trackpad area to verify cursor tracking, clicks, and scroll gestures.">
          <KeyboardTest onResult={reportResult} />
          <div className="border-t border-white/5 my-4" />
          <TrackpadTest onResult={reportResult} />
        </Panel>
      </TestGroup>

      {/* Stress Tests */}
      <TestGroup label="Stress Tests" index={2}>
        <Panel title="Memory Pressure" info="Progressively allocates memory until the browser pushes back. The gauge shows what percentage of reported RAM is allocated. GC detection means the browser is actively reclaiming memory under pressure.">
          <MemoryPanel onResult={reportResult} />
        </Panel>

        <Panel title="Tab Swarm" info="Opens real browser tabs with actual websites (Google searches, Wikipedia, Desmos, YouTube) to stress test multitasking under realistic K-12 workloads. Monitors thread latency, frame rate, and memory in real-time as tabs pile up. Choose a preset like Classroom Mix or Testing Day to match a real student session.">
          <TabSwarmPanel onResult={reportResult} />
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

function cleanBrowser(raw: string): string {
  const match = raw.match(/Chrome\s+(\d+\.\d+)/)
  if (match) return `Chrome ${match[1]}`
  return raw.length > 30 ? raw.slice(0, 30) + '...' : raw
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
