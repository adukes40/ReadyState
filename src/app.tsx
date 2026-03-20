import { useState, useCallback } from 'react'
import TestRunner from './pages/test-runner'
import BatteryWidget from './components/battery-widget'
import NetworkPanel from './tests/network-panel'
import PrivacyModal from './components/privacy-modal'
import type { TestResult } from './components/report-modal'
import logoImg from './logo/darkmodesidebarlogo.png'

type Page = 'test-runner'

const NAV_ITEMS: { page: Page; label: string; icon: React.ReactNode }[] = [
  {
    page: 'test-runner',
    label: 'Tests',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v6l-2 4v4a2 2 0 002 2h6a2 2 0 002-2v-4l-2-4V2" />
        <path d="M7 2h10" />
        <path d="M7 12h10" />
      </svg>
    ),
  },
]

export default function App() {
  const [page, setPage] = useState<Page>('test-runner')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [results, setResults] = useState<Record<string, TestResult>>({})

  const reportResult = useCallback((name: string, status: TestResult['status'], detail: string) => {
    setResults(prev => ({ ...prev, [name]: { name, status, detail } }))
  }, [])

  return (
    <>
    <div className="flex min-h-screen bg-surface-base font-sans">
      {/* Sidebar */}
      <nav className="w-64 flex-shrink-0 flex flex-col bg-[#141414] rounded-3xl m-4 mr-0 p-6 border border-white/5 relative overflow-hidden sticky top-4 h-[calc(100vh-2rem)]">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#40E0D0]/10 blur-3xl rounded-full pointer-events-none" />

        {/* Brand */}
        <div className="relative mb-8">
          <img src={logoImg} alt="ReadyState Diagnostics" className="w-full max-h-10 object-contain object-left" />
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-2 relative">
          {NAV_ITEMS.map(({ page: p, label, icon }) => {
            const active = page === p
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium w-full text-left animate-slide-in-left ${
                  active
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
                style={{ animationDelay: `${NAV_ITEMS.findIndex(n => n.page === p) * 50 + 100}ms` }}
              >
                <span className={active ? 'text-[#40E0D0]' : ''}>{icon}</span>
                {label}
              </button>
            )
          })}
        </div>

        {/* Network Speed Test */}
        <div className="mx-0 mt-4 border-t border-white/5" />
        <div className="mt-4">
          <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase text-center mb-2">Network Speed</div>
          <NetworkPanel onResult={reportResult} />
        </div>

        {/* Battery widget */}
        <div className="mx-0 mt-4 border-t border-white/5" />
        <BatteryWidget />

        {/* Privacy link at bottom */}
        <div className="mt-auto pt-4">
          <button
            onClick={() => setShowPrivacy(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#40E0D0] hover:border-[#40E0D0] transition-colors w-full justify-center border border-[#40E0D0]/30 rounded-full px-4 py-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Privacy & Data
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {page === 'test-runner' && <TestRunner reportResult={reportResult} testResults={results} />}
      </main>

    </div>
    {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </>
  )
}
