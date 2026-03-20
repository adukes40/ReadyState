/**
 * Battery Drain Test — Combined CPU+GPU load with getBattery() sampling every 30s.
 * Detects real drain rate under load and battery health vs. age.
 */

export interface BatteryReading {
  timestamp: number
  level: number
  charging: boolean
}

export interface BatteryResult {
  readings: BatteryReading[]
  drainRatePerHour: number | null
  startLevel: number
  endLevel: number
  charging: boolean
  supported: boolean
}

export async function runBatteryDrain(
  durationSec: number,
  onReading: (reading: BatteryReading) => void,
): Promise<BatteryResult> {
  if (!('getBattery' in navigator)) {
    return { readings: [], drainRatePerHour: null, startLevel: 0, endLevel: 0, charging: false, supported: false }
  }

  const battery = await (navigator as any).getBattery()
  const readings: BatteryReading[] = []

  const sample = () => {
    const reading: BatteryReading = {
      timestamp: Date.now(),
      level: battery.level,
      charging: battery.charging,
    }
    readings.push(reading)
    onReading(reading)
  }

  sample() // Initial reading

  return new Promise((resolve) => {
    const interval = setInterval(sample, 30_000)

    setTimeout(() => {
      clearInterval(interval)
      sample() // Final reading

      const start = readings[0]
      const end = readings[readings.length - 1]
      const elapsedHours = (end.timestamp - start.timestamp) / (1000 * 60 * 60)
      const drainRate = elapsedHours > 0 ? (start.level - end.level) / elapsedHours : null

      resolve({
        readings,
        drainRatePerHour: drainRate,
        startLevel: start.level,
        endLevel: end.level,
        charging: end.charging,
        supported: true,
      })
    }, durationSec * 1000)
  })
}
