/**
 * SVG radial gauge for scores (0-100).
 * Stitch visual: cyan accent, dark track.
 */

interface GaugeProps {
  value: number
  max?: number
  size?: number
  label?: string
}

export default function Gauge({ value, max = 100, size = 80, label }: GaugeProps) {
  const pct = Math.min(value / max, 1)
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const color = pct > 0.7 ? '#40E0D0' : pct > 0.4 ? 'var(--color-status-warn)' : 'var(--color-status-bad)'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75 * pct} ${circumference}`}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ filter: pct > 0 ? `drop-shadow(0 0 6px ${color})` : undefined }}
        />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" className="font-mono text-sm fill-gray-200">
          {Math.round(value)}
        </text>
      </svg>
      {label && <span className="text-xs text-gray-500">{label}</span>}
    </div>
  )
}
