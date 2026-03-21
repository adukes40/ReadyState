/**
 * Privacy & Data modal -explains exactly what data is collected and how it's used.
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function PrivacyModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      className="p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: '672px', maxHeight: '85vh', overflowY: 'auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="sticky top-0 bg-[#141414] border-b border-white/5 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#40E0D0]/10 flex items-center justify-center border border-[#40E0D0]/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-white tracking-wide">Privacy & Data</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-5">
          <Section title="Overview">
            <p>
              ReadyState is a browser-based diagnostic tool for Chromebook fleets. All tests run entirely in your
              browser -no software is installed on the device. This page explains exactly what data is detected,
              what is stored, and what is not.
            </p>
          </Section>

          <Section title="What Is Detected">
            <p>The following is read from standard browser APIs during testing:</p>
            <div className="mt-2 space-y-2">
              <DataRow label="Operating System" detail="Detected via navigator.userAgentData" />
              <DataRow label="Browser Version" detail="Via User-Agent Client Hints" />
              <DataRow label="CPU Cores" detail="navigator.hardwareConcurrency" />
              <DataRow label="Memory (RAM)" detail="navigator.deviceMemory -capped at 8 GB by the browser" />
              <DataRow label="GPU / Graphics" detail="WebGL renderer string" />
              <DataRow label="Screen Resolution" detail="screen.width and screen.height" />
              <DataRow label="Color Depth" detail="screen.colorDepth" />
              <DataRow label="Touch Support" detail="navigator.maxTouchPoints" />
              <DataRow label="Battery Status" detail="navigator.getBattery() -level, charging state, time estimates" />
            </div>
          </Section>

          <Section title="What Tests Measure">
            <div className="space-y-2">
              <DataRow label="Keyboard" detail="Which keys respond to keydown/keyup -no keystroke content is recorded, only key codes" />
              <DataRow label="Trackpad" detail="Cursor movement, click types, scroll gestures -drawing data stays in browser memory only" />
              <DataRow label="Audio" detail="Speaker output level (440Hz tone) and microphone input level -no audio is recorded or stored" />
              <DataRow label="Camera" detail="Video resolution and frame rate -video stream is never recorded or transmitted" />
              <DataRow label="Display" detail="Fullscreen color patterns for visual inspection -no data captured" />
              <DataRow label="Network Speed" detail="Latency, download, and upload speed measured against our Cloudflare endpoint" />
              <DataRow label="Memory Pressure" detail="How much memory the browser can allocate -released when test ends" />
              <DataRow label="Tab Swarm" detail="Thread latency, frame rate, and JS heap under load -workers terminated when test ends" />
            </div>
          </Section>

          <Section title="What Is Stored">
            <p>
              No test data is stored or transmitted to any server. All diagnostics run locally in your
              browser and the results stay on your device. Nothing is saved after you close the page.
            </p>
            <p>
              This site is hosted on Cloudflare Pages, which collects standard web analytics
              (page views, visitor country, browser type) as part of its hosting platform. This is
              standard Cloudflare functionality and does not include any test results or device details
              beyond what any website visit provides.
            </p>
          </Section>

          <Section title="What Is NOT Collected">
            <ul className="list-none space-y-1.5">
              <BulletItem accent text="No test results are sent to any server" />
              <BulletItem accent text="No personal information (name, email, student ID)" />
              <BulletItem accent text="No browsing history or cookies" />
              <BulletItem accent text="No keystroke content, only whether keys responded" />
              <BulletItem accent text="No audio or video recordings" />
              <BulletItem accent text="No files from the device" />
              <BulletItem accent text="No location data" />
              <BulletItem accent text="No tracking pixels or third-party scripts" />
            </ul>
          </Section>

          <Section title="Browser Permissions">
            <p>
              Some tests request browser permissions. These are always optional -denying a permission
              simply skips that test.
            </p>
            <ul className="list-none space-y-1.5 mt-2">
              <BulletItem text="Microphone -used for 3-second input level check, then released" />
              <BulletItem text="Camera -used for resolution detection, then released" />
            </ul>
            <p className="mt-2">
              The browser will always prompt you before granting access.
            </p>
          </Section>

          <Section title="Hosting">
            <p>
              This site is hosted on Cloudflare Pages. No test data leaves your browser. The only
              server-side interaction is the network speed test, which sends and receives temporary
              data payloads to measure your connection. These payloads are discarded immediately
              and are not logged or stored.
            </p>
          </Section>

          <Section title="PDF Export">
            <p>
              The "Export PDF" button generates a report locally in your browser using jsPDF.
              The PDF is created on-device and downloaded directly -it is not uploaded anywhere.
            </p>
          </Section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold tracking-widest text-[#40E0D0] uppercase mb-2">{title}</h3>
      <div className="text-sm text-gray-400 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

function DataRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-300 font-medium flex-shrink-0 sm:w-32">{label}</span>
      <span className="text-sm text-gray-500">{detail}</span>
    </div>
  )
}

function BulletItem({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${accent ? 'bg-[#40E0D0]' : 'bg-gray-600'}`} />
      <span>{text}</span>
    </li>
  )
}
