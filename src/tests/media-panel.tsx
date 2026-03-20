/**
 * Media Panel — Audio + Camera + Display tests combined.
 * Stitch visual: uppercase section labels, clean grid.
 */

import AudioPanel from './audio-panel'
import CameraTest from './camera-test'

export default function MediaPanel({ onDisplayTest, onResult }: { onDisplayTest: () => void; onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <h4 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">Audio</h4>
        <AudioPanel onResult={onResult} />
      </div>
      <div>
        <h4 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">Camera</h4>
        <CameraTest onResult={onResult} />
      </div>
      <div>
        <h4 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">Display</h4>
        <button
          onClick={onDisplayTest}
          className="px-4 py-2 text-[10px] font-mono bg-[#40E0D0]/20 text-[#40E0D0] rounded-xl hover:bg-[#40E0D0]/30 transition-colors font-bold uppercase tracking-wider border border-[#40E0D0]/30 shadow-[0_0_10px_rgba(64,224,208,0.2)]"
        >
          Run Display Test
        </button>
        <p className="text-[10px] text-gray-500 mt-2 font-mono">
          Cycles through solid colors and patterns to check for dead pixels, backlight bleed, and color accuracy.
        </p>
      </div>
    </div>
  )
}
