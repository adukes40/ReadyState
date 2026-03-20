/**
 * Inline SVG sparkline chart for trend data.
 */

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export default function Sparkline({ data, width = 100, height = 24, color = 'var(--color-accent-primary)' }: SparklineProps) {
  if (data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
    </svg>
  )
}
