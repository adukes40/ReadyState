/**
 * FAQ page - covers browser quirks, API limitations, and common questions.
 */

export default function FAQ() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#40E0D0]/10 flex items-center justify-center border border-[#40E0D0]/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">FAQ</h1>
          <p className="text-sm text-gray-500">Browser quirks, API limitations, and common questions</p>
        </div>
      </div>

      {/* Browser & Detection */}
      <CategorySection title="Browser & Detection">
        <FaqCard
          question="Why does Memory show as N/A?"
          answer="The Device Memory API (navigator.deviceMemory) is only supported in Chromium-based browsers like Chrome, Edge, Opera, and Brave. Firefox and Safari do not implement this API, so the value cannot be detected."
          browsers={['Firefox', 'Safari']}
        />
        <FaqCard
          question="Why does Touch show a value when my device has no touchscreen?"
          answer="Some operating systems and drivers report touch support even when no touchscreen is physically present. Windows is especially prone to this, often reporting 1 touch point on non-touch devices. This is a quirk of navigator.maxTouchPoints and not something ReadyState can override."
          browsers={['All (OS-dependent)']}
        />
        <FaqCard
          question="Why does Battery Status show as unavailable?"
          answer="The Battery Status API (navigator.getBattery) is only supported in Chromium-based browsers. Firefox removed support due to privacy concerns, and Safari never implemented it. On desktops without a battery, some browsers may also report it as unavailable."
          browsers={['Firefox', 'Safari']}
        />
        <FaqCard
          question="Why does Bluetooth scan say it is not supported?"
          answer="The Web Bluetooth API is only available in Chromium-based browsers and requires a secure context (HTTPS). Firefox and Safari do not support it. Some enterprise-managed devices also disable Web Bluetooth via policy."
          browsers={['Firefox', 'Safari']}
        />
      </CategorySection>

      {/* Test Behavior */}
      <CategorySection title="Test Behavior">
        <FaqCard
          question="Why do some keyboard keys not register?"
          answer="Certain keys are intercepted by the operating system before the browser sees them. On Chromebooks, top-row keys (brightness, volume) are handled by ChromeOS. On macOS, some function keys are mapped to system shortcuts. These keys will not trigger key events in the browser."
        />
        <FaqCard
          question="Why are network speed results different from other speed tests?"
          answer="ReadyState measures speed against Cloudflare's edge network, which may be closer or farther from you than other test servers. Results can also vary based on current network congestion, Wi-Fi signal strength, and whether other devices are using the connection."
        />
        <FaqCard
          question="Why does the camera test show a lower resolution than my camera supports?"
          answer="Browsers may negotiate a lower resolution based on system load, power-saving mode, or driver defaults. The test reports what the browser actually delivers, not the camera's maximum spec. Try closing other apps that may be using the camera."
        />
      </CategorySection>

      {/* General */}
      <CategorySection title="General">
        <FaqCard
          question="Does ReadyState store any of my data?"
          answer="No. All tests run entirely in your browser. No data is sent to any server, stored remotely, or shared with third parties. Exported reports are generated locally as PDFs. See the Privacy & Data page for full details."
        />
        <FaqCard
          question="Can I run ReadyState offline?"
          answer="Most tests work offline since they only use local hardware APIs. The network speed test requires an internet connection, and the Bluetooth scan requires the Web Bluetooth API which needs a secure (HTTPS) context."
        />
        <FaqCard
          question="Why do results vary between browsers on the same device?"
          answer="Each browser implements web APIs differently and has its own performance characteristics. Chrome may report device memory while Firefox cannot. Safari may handle audio differently than Edge. Testing on the browser the device will actually be used with gives the most relevant results."
        />
      </CategorySection>
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

function FaqCard({ question, answer, browsers }: {
  question: string
  answer: string
  browsers?: string[]
}) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-white/5 p-5 space-y-3 hover:border-white/10 transition-colors">
      <h3 className="text-sm font-semibold text-white flex items-start gap-2.5">
        <span className="w-1.5 h-4 rounded-full bg-[#40E0D0] flex-shrink-0 mt-0.5" />
        {question}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed pl-4">{answer}</p>
      {browsers && (
        <div className="flex items-center gap-2 pl-4 pt-1">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Affected:</span>
          {browsers.map((b) => (
            <span key={b} className="text-[10px] font-medium text-gray-500 bg-white/5 border border-white/5 rounded-full px-2.5 py-0.5">{b}</span>
          ))}
        </div>
      )}
    </div>
  )
}
