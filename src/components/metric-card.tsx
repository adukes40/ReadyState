/**
 * Single stat display — custom metric card.
 * Dense, monospace numbers, sharp corners for data.
 */

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  status?: 'good' | 'warning' | 'bad' | 'neutral'
}

const STATUS_COLORS = {
  good: 'text-status-current',
  warning: 'text-status-behind',
  bad: 'text-status-eol',
  neutral: 'text-text-primary',
}

export default function MetricCard({ label, value, unit, status = 'neutral' }: MetricCardProps) {
  return (
    <div className="bg-surface-raised border border-border p-3">
      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono text-xl font-tabular ${STATUS_COLORS[status]}`}>
        {value}
        {unit && <span className="text-xs text-text-secondary ml-1">{unit}</span>}
      </div>
    </div>
  )
}
