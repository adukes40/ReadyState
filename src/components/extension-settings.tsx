/**
 * Extension Settings Panel - lets users toggle which data categories the
 * ReadyState extension collects. Admin-locked categories show as non-interactive.
 * Inline collapsible panel for the System Readout section.
 */

import { useState } from 'react'
import type { CategoryDef } from '../platform/extension-bridge'

interface ExtensionSettingsProps {
  settings: Record<string, boolean>
  locks: Record<string, boolean>
  categories: Record<string, CategoryDef>
  onToggle: (category: string, enabled: boolean) => void
}

export default function ExtensionSettings({ settings, locks, categories, onToggle }: ExtensionSettingsProps) {
  const [expanded, setExpanded] = useState(false)
  const categoryKeys = Object.keys(categories)
  const enabledCount = categoryKeys.filter(k => settings[k]).length
  const lockedCount = categoryKeys.filter(k => locks[k]).length

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors text-left"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase flex-1">
          Extension Data Settings
        </span>
        <span className="text-[10px] text-gray-500 font-mono">
          {enabledCount}/{categoryKeys.length} on
          {lockedCount > 0 && ` \u00b7 ${lockedCount} locked`}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 bg-[#0f0f0f] border border-white/5 rounded-xl p-3 space-y-1">
          <p className="text-[10px] text-gray-500 mb-2 px-1">
            Control which device data the ReadyState extension shares with this page.
            {lockedCount > 0 && ' Some settings are managed by your administrator.'}
          </p>
          {categoryKeys.map(key => {
            const cat = categories[key]
            const enabled = settings[key] ?? false
            const locked = locks[key] ?? false

            return (
              <label
                key={key}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-200 font-medium">{cat.label}</span>
                    {locked && (
                      <span title="Locked by administrator" className="flex items-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 leading-tight">{cat.description}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={locked}
                  onClick={(e) => {
                    e.preventDefault()
                    if (!locked) onToggle(key, !enabled)
                  }}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                    enabled ? 'bg-[#40E0D0]' : 'bg-white/10'
                  } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
