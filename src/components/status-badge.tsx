/**
 * Version status badge — current / behind / EOL.
 * Uses intentional status colors, not generic traffic-light.
 */

import type { VersionStatus } from '../platform/version-check'

const CONFIG: Record<VersionStatus, { bg: string; text: string; label: string }> = {
  up_to_date: { bg: 'bg-status-current/15', text: 'text-status-current', label: 'Up to date' },
  behind: { bg: 'bg-status-behind/15', text: 'text-status-behind', label: 'Behind' },
  eol: { bg: 'bg-status-eol/15', text: 'text-status-eol', label: 'End of Life' },
  unknown: { bg: 'bg-surface-raised', text: 'text-text-muted', label: 'Unknown' },
}

export default function StatusBadge({ status, detail }: { status: VersionStatus; detail?: string }) {
  const c = CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono rounded ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace('text-', 'bg-')}`} />
      {c.label}
      {detail && <span className="text-text-muted">({detail})</span>}
    </span>
  )
}
