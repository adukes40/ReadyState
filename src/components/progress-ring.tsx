/**
 * Animated test progress indicator — ring that fills as test runs.
 * Stitch visual: cyan accent ring.
 */

interface ProgressRingProps {
  progress: number // 0-1
  size?: number
  label?: string
}

export default function ProgressRing({ progress, size = 48, label }: ProgressRingProps) {
  const r = (size - 6) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progress)

  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#40E0D0" strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-300"
          style={{ filter: 'drop-shadow(0 0 6px rgba(64,224,208,0.6))' }}
        />
      </svg>
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  )
}
