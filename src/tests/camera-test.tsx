/**
 * Camera Test — getUserMedia video preview.
 * Reports resolution, frame rate, and functional status.
 * Shows permission denied message matching mic test style.
 */

import { useRef, useState } from 'react'

export interface CameraResult {
  functional: boolean
  width: number
  height: number
  frameRate: number
  error: string | null
  permissionDenied: boolean
}

export default function CameraTest({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [result, setResult] = useState<CameraResult | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)

      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()
      const camWidth = settings.width ?? 0
      const camHeight = settings.height ?? 0
      const camFps = settings.frameRate ?? 0
      setResult({
        functional: true,
        width: camWidth,
        height: camHeight,
        frameRate: camFps,
        error: null,
        permissionDenied: false,
      })
      onResult?.('Camera', 'pass', `${camWidth}x${camHeight} @ ${Math.round(camFps)}fps`)
    } catch (e) {
      const errStr = String(e)
      const denied =
        errStr.includes('NotAllowedError') ||
        errStr.includes('Permission denied') ||
        errStr.includes('permission')

      setResult({
        functional: false,
        width: 0,
        height: 0,
        frameRate: 0,
        error: denied ? null : errStr,
        permissionDenied: denied,
      })
      onResult?.('Camera', 'fail', denied ? 'Permission denied' : errStr)
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={active ? stop : start}
          className={`px-4 py-1.5 text-xs font-mono rounded-md font-medium transition-colors ${
            active
              ? 'bg-status-bad text-white hover:opacity-90'
              : 'bg-accent-primary text-text-on-accent hover:bg-accent-hover'
          }`}
        >
          {active ? 'Stop Camera' : 'Start Camera'}
        </button>
        {result && !result.permissionDenied && (
          <span className={`text-xs font-mono ${result.functional ? 'text-status-good' : 'text-status-bad'}`}>
            {result.functional ? `${result.width}×${result.height} @ ${Math.round(result.frameRate)}fps` : result.error}
          </span>
        )}
      </div>
      {result?.permissionDenied && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-bad" />
          <span className="text-xs font-mono text-status-bad">
            Permission denied. Allow in browser settings.
          </span>
        </div>
      )}
      <video ref={videoRef} className={`w-full max-w-5xl rounded-md border border-white/5 bg-[#0a0a0a] ${active ? '' : 'hidden'}`} muted playsInline />
    </div>
  )
}
