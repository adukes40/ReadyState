/**
 * Report Modal - pre-export screen with device ID, test results summary, and notes.
 * Generates a 3-section PDF: System Summary, Test Results, Notes.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { jsPDF } from 'jspdf'
import type { PlatformInfo } from '../platform/detect'

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run'
  detail: string
}

interface ReportModalProps {
  platform: PlatformInfo
  testResults: TestResult[]
  onClose: () => void
}

function statusLabel(s: TestResult['status']): string {
  switch (s) {
    case 'pass': return 'Pass'
    case 'fail': return 'Fail'
    case 'warn': return 'Warning'
    case 'skipped': return 'Skipped'
    case 'not run': return 'Not Run'
  }
}

function statusColor(s: TestResult['status']): string {
  switch (s) {
    case 'pass': return 'text-status-good'
    case 'fail': return 'text-status-bad'
    case 'warn': return 'text-status-warn'
    case 'skipped': return 'text-gray-500'
    case 'not run': return 'text-gray-500'
  }
}

function statusDot(s: TestResult['status']): string {
  switch (s) {
    case 'pass': return 'bg-status-good'
    case 'fail': return 'bg-status-bad'
    case 'warn': return 'bg-status-warn'
    case 'skipped': return 'bg-gray-500'
    case 'not run': return 'bg-gray-600'
  }
}

function cleanBrowser(raw: string): string {
  const match = raw.match(/Chrome\s+(\d+\.\d+)/)
  if (match) return `Chrome ${match[1]}`
  return raw.length > 30 ? raw.slice(0, 30) + '...' : raw
}

function cleanGPU(raw: string): string {
  return raw
    .replace(/^ANGLE \(/, '')
    .replace(/\)$/, '')
    .replace(/[,\s]*Direct3D.*$/i, '')
    .replace(/[,\s]*OpenGL.*$/i, '')
    .replace(/\s+\(0x[\da-fA-F]+\)/g, '')
    .replace(/^(Intel|AMD|NVIDIA),\s*/i, '')
    .trim()
}

export default function ReportModal({ platform, testResults, onClose }: ReportModalProps) {
  const [deviceName, setDeviceName] = useState('')
  const [notes, setNotes] = useState('')

  const buildPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let y = 20

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ReadyState Diagnostics Report', margin, y)
    y += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y)
    y += 5

    if (deviceName.trim()) {
      doc.text(`Device: ${deviceName.trim()}`, margin, y)
      y += 5
    }

    // Divider
    y += 3
    doc.setDrawColor(200)
    doc.line(margin, y, margin + contentWidth, y)
    y += 8

    // Section 1: System Summary
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('1. System Summary', margin, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const sysInfo = [
      ['Platform', platform.os],
      ['Browser', cleanBrowser(platform.browser)],
      ['Processor', `${platform.cores} cores${platform.architecture ? ` / ${platform.architecture}` : ''}`],
      ['Memory', platform.ram ? (platform.ram >= 8 ? `${platform.ram}+ GB` : `${platform.ram} GB`) : 'N/A'],
      ['Display', `${platform.screenWidth}x${platform.screenHeight} @${platform.pixelRatio}x`],
      ['Color Depth', `${platform.colorDepth}-bit`],
      ['Touch', platform.touchSupported ? `${platform.maxTouchPoints} points` : 'None'],
      ['Graphics', platform.gpu ? cleanGPU(platform.gpu) : 'N/A'],
    ]

    sysInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${label}:`, margin + 2, y)
      doc.setFont('helvetica', 'normal')
      doc.text(value, margin + 40, y)
      y += 5.5
    })

    // Divider
    y += 3
    doc.line(margin, y, margin + contentWidth, y)
    y += 8

    // Section 2: Test Results
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('2. Test Results', margin, y)
    y += 7

    // Table header
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y - 3.5, contentWidth, 5.5, 'F')
    doc.text('Test', margin + 2, y)
    doc.text('Status', margin + 60, y)
    doc.text('Detail', margin + 85, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    testResults.forEach((t, i) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(margin, y - 3.5, contentWidth, 5.5, 'F')
      }

      doc.text(t.name, margin + 2, y)
      doc.text(statusLabel(t.status), margin + 60, y)

      // Wrap long detail text
      const detailLines = doc.splitTextToSize(t.detail, contentWidth - 87)
      doc.text(detailLines, margin + 85, y)
      y += Math.max(5.5, detailLines.length * 4)
    })

    // Divider
    y += 5
    if (y > 250) { doc.addPage(); y = 20 }
    doc.line(margin, y, margin + contentWidth, y)
    y += 8

    // Section 3: Notes
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('3. Notes', margin, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (notes.trim()) {
      const noteLines = doc.splitTextToSize(notes.trim(), contentWidth - 4)
      noteLines.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 20 }
        doc.text(line, margin + 2, y)
        y += 5
      })
    } else {
      doc.text('No notes provided.', margin + 2, y)
    }

    return doc
  }

  const handleExport = () => {
    const doc = buildPDF()
    const filename = deviceName.trim()
      ? `readystate-${deviceName.trim().replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`
      : `readystate-report-${Date.now()}.pdf`
    doc.save(filename)
  }

  const handlePrint = () => {
    const doc = buildPDF()
    const blobUrl = doc.output('bloburl')
    const printWindow = window.open(blobUrl as unknown as string)
    if (printWindow) {
      printWindow.onload = () => printWindow.print()
    }
  }

  const passCount = testResults.filter(t => t.status === 'pass').length
  const failCount = testResults.filter(t => t.status === 'fail').length
  const warnCount = testResults.filter(t => t.status === 'warn').length
  const notRunCount = testResults.filter(t => t.status === 'not run' || t.status === 'skipped').length

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '24px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="sticky top-0 bg-[#141414] border-b border-white/5 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-white tracking-wide">Export Report</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Device identifier */}
          <div>
            <label className="text-xs font-bold tracking-widest text-[#40E0D0] uppercase block mb-2">Device Name / Identifier</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. CB-2024-0142, Room 204 Cart B"
              className="w-full px-3 py-2.5 text-sm bg-white/5 text-gray-200 rounded-xl border border-white/10 outline-none focus:border-[#40E0D0]/50 transition-colors placeholder:text-gray-600 font-mono"
            />
          </div>

          {/* Test results summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold tracking-widest text-[#40E0D0] uppercase">Test Results</label>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                {passCount > 0 && <span className="text-status-good">{passCount} passed</span>}
                {failCount > 0 && <span className="text-status-bad">{failCount} failed</span>}
                {warnCount > 0 && <span className="text-status-warn">{warnCount} warning</span>}
                {notRunCount > 0 && <span className="text-gray-500">{notRunCount} not run</span>}
              </div>
            </div>
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="text-left px-3 py-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">Test</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">Status</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((t, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                      <td className="px-3 py-2 text-gray-300 font-medium whitespace-nowrap">{t.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot(t.status)}`} />
                          <span className={`text-sm ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{t.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold tracking-widest text-[#40E0D0] uppercase block mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this device (condition, issues found, actions taken...)"
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-white/5 text-gray-200 rounded-xl border border-white/10 outline-none focus:border-[#40E0D0]/50 transition-colors placeholder:text-gray-600 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 text-sm font-medium bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors border border-white/10 flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2.5 text-sm font-bold bg-[#40E0D0]/20 text-[#40E0D0] rounded-xl hover:bg-[#40E0D0]/30 transition-colors border border-[#40E0D0]/30 shadow-[0_0_10px_rgba(64,224,208,0.2)]"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
