/**
 * Audio Test panel — speaker output test + microphone input test.
 * Stitch visual: waveform bars, cyan accent buttons and indicators.
 */

import { useState, useRef, useEffect, useCallback } from 'react'

interface TestState {
  status: 'idle' | 'testing' | 'done'
  level: number
  functional: boolean | null
  error: string | null
  muted: boolean
  permissionDenied: boolean
}

const initialState: TestState = {
  status: 'idle',
  level: 0,
  functional: null,
  error: null,
  muted: false,
  permissionDenied: false,
}

function WaveformBars({ level, active }: { level: number; active: boolean }) {
  const barCount = 28
  const normalizedLevel = level / 255

  return (
    <div className="h-16 flex items-center justify-center gap-1.5 mb-2">
      {Array.from({ length: barCount }, (_, i) => {
        const centerDist = Math.abs(i - barCount / 2) / (barCount / 2)
        const baseHeight = active ? (1 - centerDist * 0.6) * normalizedLevel : 0.15
        const height = Math.max(baseHeight, 0.08)

        return (
          <div
            key={i}
            className="w-1 rounded-full transition-all duration-75"
            style={{
              height: `${height * 100}%`,
              backgroundColor: active ? '#40E0D0' : 'rgba(255,255,255,0.08)',
              boxShadow: active && height > 0.3 ? '0 0 8px rgba(64,224,208,0.6)' : 'none',
              opacity: active ? Math.random() * 0.5 + 0.5 : 0.3,
            }}
          />
        )
      })}
    </div>
  )
}

function StatusIndicator({ state }: { state: TestState }) {
  if (state.permissionDenied) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-status-bad" />
        <span className="text-xs font-mono text-status-bad">
          Permission denied. Allow in browser settings.
        </span>
      </div>
    )
  }

  if (state.muted) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-status-warn animate-pulse-dot" />
        <span className="text-xs font-mono text-status-warn">Muted</span>
        <span className="text-xs font-mono text-text-muted">- Check system volume or unmute in OS settings</span>
      </div>
    )
  }

  if (state.status === 'done' && state.functional !== null) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${state.functional ? 'bg-status-good' : 'bg-status-bad'}`} />
        <span className={`text-xs font-mono ${state.functional ? 'text-status-good' : 'text-status-bad'}`}>
          {state.functional ? 'Working' : state.error}
        </span>
      </div>
    )
  }

  if (state.status === 'testing') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#40E0D0] animate-pulse-dot" />
        <span className="text-xs font-mono text-gray-400">Testing...</span>
      </div>
    )
  }

  return null
}

export default function AudioPanel({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [speaker, setSpeaker] = useState<TestState>(initialState)
  const [mic, setMic] = useState<TestState>(initialState)
  const speakerRaf = useRef<number>(0)
  const micRaf = useRef<number>(0)
  const micStream = useRef<MediaStream | null>(null)
  const micCtx = useRef<AudioContext | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(speakerRaf.current)
      cancelAnimationFrame(micRaf.current)
      micStream.current?.getTracks().forEach((t) => t.stop())
      micCtx.current?.close()
    }
  }, [])

  // Report speaker result
  useEffect(() => {
    if (speaker.status === 'done') {
      onResult?.('Speaker', speaker.functional ? 'pass' : 'fail', speaker.functional ? 'Working' : (speaker.error ?? 'Failed'))
    }
  }, [speaker.status, speaker.functional, speaker.error, onResult])

  // Report mic result
  useEffect(() => {
    if (mic.status === 'done') {
      onResult?.('Microphone', mic.functional ? 'pass' : 'fail', mic.functional ? 'Working' : (mic.error ?? 'Failed'))
    }
  }, [mic.status, mic.functional, mic.error, onResult])

  const runSpeaker = useCallback(async () => {
    setSpeaker({ ...initialState, status: 'testing' })

    try {
      const ctx = new AudioContext()
      if (ctx.state === 'suspended') await ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256

      gain.gain.value = 0.3
      osc.frequency.value = 440
      osc.connect(gain)
      gain.connect(analyser)
      analyser.connect(ctx.destination)
      osc.start()

      const data = new Uint8Array(analyser.frequencyBinCount)

      const pump = () => {
        analyser.getByteFrequencyData(data)
        const peak = Math.max(...data)
        setSpeaker((prev) => ({ ...prev, level: peak }))
        speakerRaf.current = requestAnimationFrame(pump)
      }
      pump()

      // Check if output is effectively muted
      // Wait longer on first check to let AudioContext warm up
      await new Promise((r) => setTimeout(r, 600))
      let sawSignal = false
      for (let check = 0; check < 3; check++) {
        analyser.getByteFrequencyData(data)
        if (Math.max(...data) > 0) { sawSignal = true; break }
        await new Promise((r) => setTimeout(r, 200))
      }
      if (!sawSignal) {
        setSpeaker((prev) => ({ ...prev, muted: true }))
      }

      await new Promise((r) => setTimeout(r, 1000))
      cancelAnimationFrame(speakerRaf.current)

      osc.stop()
      ctx.close()

      setSpeaker((prev) => ({
        ...prev,
        status: 'done',
        level: 0,
        functional: true,
      }))
    } catch (e) {
      cancelAnimationFrame(speakerRaf.current)
      setSpeaker({
        status: 'done',
        level: 0,
        functional: false,
        error: String(e),
        muted: false,
        permissionDenied: false,
      })
    }
  }, [])

  const runMic = useCallback(async () => {
    setMic({ ...initialState, status: 'testing' })

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStream.current = stream

      const ctx = new AudioContext()
      micCtx.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)
      let maxSeen = 0

      // Check if track is muted
      const track = stream.getAudioTracks()[0]
      if (track.muted || !track.enabled) {
        setMic((prev) => ({ ...prev, muted: true }))
      }

      // Listen for mute/unmute events
      track.onmute = () => setMic((prev) => ({ ...prev, muted: true }))
      track.onunmute = () => setMic((prev) => ({ ...prev, muted: false }))

      const pump = () => {
        analyser.getByteFrequencyData(data)
        const peak = Math.max(...data)
        if (peak > maxSeen) maxSeen = peak
        setMic((prev) => ({ ...prev, level: peak }))
        micRaf.current = requestAnimationFrame(pump)
      }
      pump()

      await new Promise((r) => setTimeout(r, 3000))
      cancelAnimationFrame(micRaf.current)

      stream.getTracks().forEach((t) => t.stop())
      ctx.close()
      micStream.current = null
      micCtx.current = null

      setMic((prev) => ({
        ...prev,
        status: 'done',
        level: 0,
        functional: maxSeen > 2,
        error: maxSeen <= 2 ? 'No audio detected' : null,
      }))
    } catch (e) {
      cancelAnimationFrame(micRaf.current)
      const errStr = String(e)
      const denied =
        errStr.includes('NotAllowedError') ||
        errStr.includes('Permission denied') ||
        errStr.includes('permission')

      setMic({
        status: 'done',
        level: 0,
        functional: false,
        error: denied ? null : errStr,
        muted: false,
        permissionDenied: denied,
      })
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Waveform visualization */}
      <WaveformBars level={Math.max(speaker.level, mic.level)} active={speaker.status === 'testing' || mic.status === 'testing'} />

      {/* Speaker test */}
      <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
        <span className="text-sm text-gray-200 font-medium">Test Speaker</span>
        <button
          onClick={runSpeaker}
          disabled={speaker.status === 'testing'}
          className="text-[10px] bg-[#40E0D0]/20 text-[#40E0D0] px-2.5 py-1 rounded uppercase font-bold tracking-wider border border-[#40E0D0]/30 shadow-[0_0_10px_rgba(64,224,208,0.2)] hover:bg-[#40E0D0]/30 transition-colors disabled:opacity-50"
        >
          {speaker.status === 'testing' ? 'Playing...' : speaker.status === 'done' ? 'Retest' : 'Test'}
        </button>
      </div>
      <StatusIndicator state={speaker} />

      {/* Microphone test */}
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
          <span className="text-sm text-gray-200 font-medium">Test Microphone</span>
          <button
            onClick={runMic}
            disabled={mic.status === 'testing'}
            className="text-[10px] bg-[#40E0D0]/20 text-[#40E0D0] px-2.5 py-1 rounded uppercase font-bold tracking-wider border border-[#40E0D0]/30 shadow-[0_0_10px_rgba(64,224,208,0.2)] hover:bg-[#40E0D0]/30 transition-colors disabled:opacity-50"
          >
            {mic.status === 'testing' ? 'Recording...' : mic.status === 'done' ? 'Retest' : 'Test'}
          </button>
        </div>

        {/* Mic level bar */}
        {mic.status === 'testing' && (
          <div className="flex items-center gap-3 px-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden flex gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const filled = i < Math.round((mic.level / 255) * 12)
                return (
                  <div
                    key={i}
                    className="h-full flex-1 rounded-sm transition-colors duration-75"
                    style={{
                      backgroundColor: filled ? '#40E0D0' : 'transparent',
                      boxShadow: filled ? '0 0 5px rgba(64,224,208,0.8)' : 'none',
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
      <StatusIndicator state={mic} />
    </div>
  )
}
