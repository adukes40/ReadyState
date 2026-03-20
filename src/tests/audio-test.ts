/**
 * Audio Test — Web Audio API oscillator for output, getUserMedia + AnalyserNode for input.
 */

export interface AudioOutputResult {
  functional: boolean
  error: string | null
}

export interface AudioInputResult {
  functional: boolean
  avgLevel: number
  noiseFloor: number
  error: string | null
}

export async function testAudioOutput(): Promise<AudioOutputResult> {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.3
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 440
    osc.start()
    await new Promise((r) => setTimeout(r, 1000))
    osc.stop()
    ctx.close()
    return { functional: true, error: null }
  } catch (e) {
    return { functional: false, error: String(e) }
  }
}

export async function testAudioInput(durationMs = 3000): Promise<AudioInputResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const data = new Uint8Array(analyser.frequencyBinCount)
    const levels: number[] = []

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        levels.push(avg)
      }, 100)

      setTimeout(() => {
        clearInterval(interval)
        resolve()
      }, durationMs)
    })

    stream.getTracks().forEach((t) => t.stop())
    ctx.close()

    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length
    const noiseFloor = Math.min(...levels)

    return { functional: true, avgLevel, noiseFloor, error: null }
  } catch (e) {
    return { functional: false, avgLevel: 0, noiseFloor: 0, error: String(e) }
  }
}
