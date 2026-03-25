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

      {/* Chrome Extension */}
      <CategorySection title="Chrome Extension">
        <FaqCard
          question="What does the Chrome Extension add?"
          answer="The extension uses privileged Chrome system APIs to provide data the browser alone cannot access: full CPU model name, exact RAM (not capped at 8 GB), storage capacity, display modes and refresh rates, and CPU temperatures on ChromeOS. When force-installed via Google Admin on an enrolled device, it also unlocks serial number, asset ID, hostname, location, manufacturer, model, and network identity (MAC, IP)."
        />
        <FaqCard
          question="Why does the extension still show 'Unmanaged Chromebook'?"
          answer="The managed device APIs (serial number, asset ID, etc.) require two things: the device must be enrolled in your Google Workspace domain, and the extension must be force-installed via Google Admin policy. Manually installing the extension from the Chrome Web Store does not grant access to these APIs. Important: if the extension is force-installed via a Google Group rather than a device-level Organizational Unit (OU), the enterprise device attributes APIs may not respond. The extension install policy is user-scoped via Groups, but serial number, asset ID, and other device attributes are device-scoped and require the policy to be applied at the OU where the device is enrolled. Move the force-install policy to the device's OU, or apply it at both the Group and OU level."
        />
        <FaqCard
          question="Why does the CPU field show only core count and no model name?"
          answer="Some ARM-based Chromebooks (common in budget and education models) do not expose the CPU model name through Chrome's system.cpu API. On these devices, the extension can only report core count and architecture (e.g., arm). This is a ChromeOS platform limitation, not an extension or ReadyState issue. Intel and AMD-based Chromebooks typically report the full CPU model."
        />
        <FaqCard
          question="Can users turn off data collection from the extension?"
          answer="Yes. Each data category (CPU, Memory, Storage, Display, Network, etc.) can be individually toggled on or off in the Extension Data Settings panel on the Tests page. Administrators can also lock specific categories via Google Admin managed policy so they cannot be changed by users."
        />
        <FaqCard
          question="Does the extension collect any personal or student information?"
          answer="No. The extension is designed for FERPA, COPPA, and HIPAA compliance. It collects device hardware data only. It does not access user email, account information, browsing history, files, location data, or any personal identifiers. No data is transmitted to any server."
        />
        <FaqCard
          question="I force-installed the extension but Manufacturer and Model are empty."
          answer="The manufacturer and model fields require the EnterpriseHardwarePlatformAPIEnabled Chrome policy to be set to true. In Google Admin, go to Devices > Chrome > Settings > Users & browsers, search for 'Hardware Platform API', and enable it for the relevant organizational unit."
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
