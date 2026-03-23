/**
 * Test Guide page - explains each diagnostic test, what it measures, and how to use it.
 */

export default function TestGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#40E0D0]/10 flex items-center justify-center border border-[#40E0D0]/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Test Guide</h1>
          <p className="text-sm text-gray-500">How each diagnostic works and what to look for</p>
        </div>
      </div>

      {/* Hardware Tests */}
      <CategorySection title="Hardware Tests">
        <TestCard
          name="Speaker Test"
          icon={<SpeakerIcon />}
          what="Plays a 440 Hz tone through the device speakers and analyzes the audio output signal."
          how="Click Start and listen for a short beep. The test uses the Web Audio API to generate and measure the tone. It runs for about 1 second."
          lookFor="A clear, audible tone. If the test fails, the speakers may be damaged, muted, or disabled. Check that the device volume is turned up before testing."
        />
        <TestCard
          name="Microphone Test"
          icon={<MicIcon />}
          what="Records a 3-second audio sample and measures the input level to verify the microphone is working."
          how="Click Start and speak or make noise near the device. The browser will ask for microphone permission. The test analyzes input levels in real time."
          lookFor="The level meter should respond to sound. If it stays flat, the microphone may be blocked, damaged, or permission was denied."
        />
        <TestCard
          name="Camera Test"
          icon={<CameraIcon />}
          what="Opens the device camera to detect resolution and frame rate."
          how="Click Start and allow camera access when prompted. A live preview will appear briefly while the test reads the video track settings."
          lookFor="The test reports resolution (e.g. 1280x720) and frame rate. If the camera cannot be accessed, it may be disabled by policy or physically blocked."
        />
        <TestCard
          name="Display Test"
          icon={<DisplayIcon />}
          what="Fills the screen with 8 solid colors to help spot dead pixels, backlight bleed, and color accuracy issues."
          how="Click Start and the screen will go fullscreen. Click or press any key to cycle through: Red, Green, Blue, White, Black, Yellow, Magenta, and Cyan. Press Escape to exit early."
          lookFor="Look for dark spots (dead pixels), uneven brightness at the edges (backlight bleed), or colors that appear wrong. Inspect carefully on solid white and black screens."
        />
        <TestCard
          name="Network Speed"
          icon={<NetworkIcon />}
          what="Measures download speed, upload speed, latency, and jitter against Cloudflare's edge network."
          how="Click Start and wait for the test to complete. It sends a series of data payloads of increasing size to measure real-world throughput. No data is stored."
          lookFor={`Download and upload speeds in Mbps, plus latency and jitter. General thresholds:\n- Latency: Green < 50ms, Yellow < 150ms, Red > 150ms\n- Speed: Green > 25 Mbps, Yellow > 5 Mbps, Red < 5 Mbps\n- Jitter: Green < 5ms, Yellow < 20ms, Red > 20ms`}
        />
        <TestCard
          name="Battery Status"
          icon={<BatteryIcon />}
          what="Reads the current battery level, charging state, and estimated time to full or empty."
          how="This runs automatically when the page loads. It updates every 30 seconds and whenever battery events fire."
          lookFor="Battery percentage, whether it is charging, and time estimates. A battery that drains unusually fast or does not charge may indicate a hardware issue. Not available on all browsers."
        />
      </CategorySection>

      {/* Input Tests */}
      <CategorySection title="Input Tests">
        <TestCard
          name="Keyboard Test"
          icon={<KeyboardIcon />}
          what="Detects which physical keys respond to presses. Only key codes are tracked, not what you type."
          how="Click Start and press every key on the keyboard. Tested keys light up cyan. The layout auto-detects (Chromebook, MacBook, or Laptop) but you can switch manually."
          lookFor="Any keys that stay gray after pressing them may be stuck or unresponsive. The progress bar shows how many keys have been tested. Some top-row keys on Chromebooks are intercepted by the OS and may not register."
        />
        <TestCard
          name="Trackpad Test"
          icon={<TrackpadIcon />}
          what="Tests 7 trackpad actions: cursor movement, left click, right click, middle click, double click, vertical scroll, and horizontal scroll."
          how="Click Start, then perform each action inside the test area. A checklist tracks which actions have been detected. Move your cursor, click, double-click, right-click, middle-click, and scroll in both directions."
          lookFor="All 7 actions should check off. If a gesture is not detected, the trackpad may have limited functionality. Drawing trails appear on the canvas to confirm cursor tracking."
        />
      </CategorySection>

      {/* Stress Tests */}
      <CategorySection title="Stress Tests">
        <TestCard
          name="Memory Pressure"
          icon={<MemoryIcon />}
          what="Tests how much memory the browser can allocate by filling RAM in 16 MB chunks until the browser refuses."
          how="Click Start and let it run. The gauge shows usage as a percentage of device RAM. Click Stop at any time. All memory is released when the test ends."
          lookFor="How much memory could be allocated before the browser stopped. If the device runs out of memory quickly, it may have limited RAM or too many other tabs open. The test also detects garbage collection events."
        />
        <TestCard
          name="Tab Swarm"
          icon={<TabSwarmIcon />}
          what="Simulates multiple heavy browser tabs using Web Workers to stress-test multitasking performance."
          how={`Choose a preset that matches your use case:\n- Classroom Mix: 10 tabs (typical student workload)\n- Testing Day: 7 tabs (heavy interactive apps)\n- Research Mode: 13 tabs (lots of reading)\n- Video Heavy: 7 tabs (streaming focused)\n- Max Stress: 20 tabs (worst case scenario)\n\nEach simulated tab consumes memory and CPU. The test measures thread latency, frame rate, and heap usage in real time.`}
          lookFor={`Thread latency is the key metric:\n- Under 50ms: Device handled it with ease\n- 50-150ms: Moderate degradation, usable but sluggish\n- Over 150ms: Device struggled under load\n\nThe charts show how performance degrades as more tabs open. Compare results across devices to identify underpowered hardware.`}
        />
      </CategorySection>

      {/* Tips section */}
      <div className="bg-[#141414] rounded-2xl border border-white/5 p-6">
        <h3 className="text-sm font-bold tracking-widest text-[#40E0D0] uppercase mb-4">Tips for Best Results</h3>
        <ul className="space-y-3 text-sm text-gray-400">
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#40E0D0] flex-shrink-0 mt-1.5" />
            <span>Close other tabs and apps before running stress tests for the most accurate results.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#40E0D0] flex-shrink-0 mt-1.5" />
            <span>Make sure the device is not in power-saving mode, as it can throttle CPU and affect test results.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#40E0D0] flex-shrink-0 mt-1.5" />
            <span>Turn up the volume before running the speaker test. A muted device will cause a false failure.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#40E0D0] flex-shrink-0 mt-1.5" />
            <span>For the display test, dim the lights in the room to spot dead pixels and backlight bleed more easily.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#40E0D0] flex-shrink-0 mt-1.5" />
            <span>Run the network test on the same Wi-Fi network the device will use in production for relevant results.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

/* ---- Layout helpers ---- */

function CategorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4 px-1">{title}</h2>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function TestCard({ name, icon, what, how, lookFor }: {
  name: string
  icon: React.ReactNode
  what: string
  how: string
  lookFor: string
}) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-[#40E0D0] border border-white/10">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-white">{name}</h3>
      </div>

      <div className="space-y-3">
        <InfoBlock label="What it does" text={what} />
        <InfoBlock label="How to run it" text={how} />
        <InfoBlock label="What to look for" text={lookFor} />
      </div>
    </div>
  )
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="text-xs font-semibold text-[#40E0D0]/70 uppercase tracking-wide">{label}</span>
      <p className="text-sm text-gray-400 leading-relaxed mt-1 whitespace-pre-line">{text}</p>
    </div>
  )
}

/* ---- Icons ---- */

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function DisplayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function NetworkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="18" height="12" rx="2" />
      <line x1="23" y1="10" x2="23" y2="14" />
      <line x1="5" y1="10" x2="5" y2="14" />
      <line x1="9" y1="10" x2="9" y2="14" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
    </svg>
  )
}

function TrackpadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <line x1="12" y1="14" x2="12" y2="20" />
    </svg>
  )
}

function MemoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <line x1="2" y1="8" x2="4" y2="8" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="2" y1="16" x2="4" y2="16" />
      <line x1="20" y1="8" x2="22" y2="8" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="20" y1="16" x2="22" y2="16" />
      <line x1="8" y1="2" x2="8" y2="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="16" y1="2" x2="16" y2="4" />
      <line x1="8" y1="20" x2="8" y2="22" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="16" y1="20" x2="16" y2="22" />
    </svg>
  )
}

function TabSwarmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
