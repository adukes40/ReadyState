import { useState, useCallback } from 'react'
import TestRunner from './pages/test-runner'
import TestGuide from './pages/test-guide'
import FAQ from './pages/faq'
import ExtensionPage from './pages/extension'
import PrivacyPage from './pages/privacy'
import type { TestResult } from './components/report-modal'
import logoImg from './logo/darkmodesidebarlogo.png'

type Page = 'test-runner' | 'test-guide' | 'faq' | 'extension' | 'privacy'

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
  {
    page: 'test-guide',
    label: 'Test Guide',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    page: 'faq' as Page,
    label: 'FAQ',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    page: 'extension' as Page,
    label: 'Try Our Extension',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
  },
  {
    page: 'privacy' as Page,
    label: 'Privacy & Data',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
]

export default function App() {
  // Render standalone privacy page at /privacy (no sidebar/chrome)
  if (window.location.pathname === '/privacy') {
    return <PrivacyPage />
  }

  const [page, setPage] = useState<Page>('test-runner')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [results, setResults] = useState<Record<string, TestResult>>({})

  const reportResult = useCallback((name: string, status: TestResult['status'], detail: string) => {
    setResults(prev => ({ ...prev, [name]: { name, status, detail } }))
  }, [])

  const sidebarContent = (
    <>
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#40E0D0]/10 blur-3xl rounded-full pointer-events-none" />

      {/* Brand */}
      <div className="relative sidebar-brand">
        <img src={logoImg} alt="ReadyState Diagnostics" className="w-full max-h-10 object-contain object-left" />
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-2 relative">
        {NAV_ITEMS.map(({ page: p, label, icon }) => {
          const active = page === p
          return (
            <button
              key={p}
              onClick={() => { setPage(p); setSidebarOpen(false) }}
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
    </>
  )

  return (
    <>
    <div className="flex min-h-screen bg-surface-base font-sans">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex md:hidden items-center gap-3 px-4 py-3 bg-[#141414]/95 backdrop-blur-sm border-b border-white/5">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-gray-300 border border-white/10 active:bg-white/10"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <img src={logoImg} alt="ReadyState" className="h-6 object-contain" />
      </div>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          {/* Drawer */}
          <nav
            className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] flex flex-col bg-[#141414] p-6 border-r border-white/5 relative overflow-y-auto animate-slide-in-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white border border-white/10 z-10"
              aria-label="Close menu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav className="hidden md:flex sidebar-width flex-shrink-0 flex-col bg-[#141414] rounded-3xl m-4 mr-0 p-4 border border-white/5 relative overflow-y-auto overflow-x-hidden sticky top-4 h-[calc(100vh-2rem)] scrollbar-hide">
        {sidebarContent}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 pt-16 pb-4 md:px-6 md:py-6">
        {page === 'test-runner' && <TestRunner reportResult={reportResult} testResults={results} onNavigate={(p) => setPage(p as Page)} />}
        {page === 'test-guide' && <TestGuide />}
        {page === 'faq' && <FAQ />}
        {page === 'extension' && <ExtensionPage />}
        {page === 'privacy' && <PrivacyPage embedded />}
      </main>

    </div>
    </>
  )
}
