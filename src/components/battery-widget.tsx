/**
 * Battery Widget — Sidebar card showing live battery status.
 * Stitch visual: cyan fill glow, clean stat readout.
 * Updates every 30s and on battery events.
 */

import { useState, useEffect } from 'react'

interface BatteryState {
  supported: boolean
  level: number
  charging: boolean
  chargingTime: number
  dischargingTime: number
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function getStatusLabel(b: BatteryState): string {
  if (b.charging) return 'Plugged In'
  return 'Discharging'
}

function getStatusColor(b: BatteryState): string {
  if (b.charging) return 'text-[#40E0D0]'
  if (b.level <= 0.1) return 'text-status-bad'
  if (b.level <= 0.25) return 'text-status-warn'
  return 'text-gray-200'
}

function getFillColor(b: BatteryState): string {
  if (b.charging && b.level < 1) return '#40E0D0'
  if (b.level <= 0.1) return '#EF4444'
  if (b.level <= 0.25) return '#FBBF24'
  return '#40E0D0'
}

export default function BatteryWidget() {
  const [battery, setBattery] = useState<BatteryState | null>(null)

  useEffect(() => {
    if (!('getBattery' in navigator)) {
      setBattery({ supported: false, level: 0, charging: false, chargingTime: 0, dischargingTime: 0 })
      return
    }

    let interval: ReturnType<typeof setInterval>

    ;(navigator as any).getBattery().then((bm: any) => {
      const update = () => {
        setBattery({
          supported: true,
          level: bm.level,
          charging: bm.charging,
          chargingTime: bm.chargingTime,
          dischargingTime: bm.dischargingTime,
        })
      }

      update()
      interval = setInterval(update, 30000)

      bm.addEventListener('chargingchange', update)
      bm.addEventListener('levelchange', update)
      bm.addEventListener('chargingtimechange', update)
      bm.addEventListener('dischargingtimechange', update)
    })

    return () => clearInterval(interval)
  }, [])

  if (!battery) return null

  if (!battery.supported) {
    return (
      <div className="px-3 py-3 bg-white/5 rounded-xl border border-white/5">
        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Battery</div>
        <div className="text-xs text-gray-500">Not available</div>
      </div>
    )
  }

  const pct = Math.round(battery.level * 100)
  const fillColor = getFillColor(battery)

  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      {/* Battery graphic — stitch style */}
      <div className="relative w-20 h-32 border-[3px] border-white/20 rounded-2xl p-1 flex flex-col justify-end">
        {/* Battery top cap */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-2 bg-white/20 rounded-t-sm" />

        {/* Battery fill */}
        <div
          className="w-full rounded-xl relative flex items-center justify-center transition-all duration-500"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(to top, ${fillColor}cc, ${fillColor}66)`,
            boxShadow: `0 0 20px ${fillColor}80`,
          }}
        >
          <span className="text-white font-bold text-lg drop-shadow-md font-tabular">{pct}%</span>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <div className={`flex items-center justify-center gap-2 mb-1 ${getStatusColor(battery)}`}>
          {battery.charging ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          )}
          <span className="font-medium text-sm">{getStatusLabel(battery)}</span>
        </div>

        {battery.charging && battery.level >= 1 && (
          <div className="text-xs text-gray-400 font-medium">Fully Charged</div>
        )}

        {battery.charging && battery.level < 1 && (
          <>
            <div className="text-[10px] text-gray-500">Time to Full:</div>
            <div className="text-xs text-gray-300 font-medium font-tabular">{formatTime(battery.chargingTime)}</div>
          </>
        )}

        {!battery.charging && (
          <>
            <div className="text-[10px] text-gray-500">Est. Time to Empty:</div>
            <div className="text-xs text-gray-300 font-medium font-tabular">{formatTime(battery.dischargingTime)}</div>
          </>
        )}
      </div>
    </div>
  )
}
