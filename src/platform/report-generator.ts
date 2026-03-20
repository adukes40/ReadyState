/**
 * PDF report generation using jsPDF.
 * Compiles test results into a downloadable PDF report.
 */

import { jsPDF } from 'jspdf'
import type { PlatformInfo } from './detect'

export interface TestResults {
  platform: PlatformInfo
  tests: Record<string, unknown>
  timestamp: string
}

export function generateReport(results: TestResults): void {
  const doc = new jsPDF()
  const { platform } = results

  doc.setFontSize(18)
  doc.text('ReadyState Diagnostics Report', 20, 20)

  doc.setFontSize(10)
  doc.text(`Generated: ${results.timestamp}`, 20, 30)

  doc.setFontSize(12)
  doc.text('Device Information', 20, 45)

  doc.setFontSize(9)
  const info = [
    `OS: ${platform.os}`,
    `Browser: ${platform.browser}`,
    `CPU Cores: ${platform.cores}`,
    `RAM: ${platform.ram ? `${platform.ram} GB` : 'N/A'}`,
    `GPU: ${platform.gpu ?? 'N/A'}`,
    `Screen: ${platform.screenWidth}x${platform.screenHeight} @${platform.pixelRatio}x`,
    `Color Depth: ${platform.colorDepth}-bit`,
    `Touch: ${platform.touchSupported ? `Yes (${platform.maxTouchPoints} points)` : 'No'}`,
  ]

  info.forEach((line, i) => {
    doc.text(line, 20, 55 + i * 6)
  })

  doc.save(`diagnostics-${Date.now()}.pdf`)
}
