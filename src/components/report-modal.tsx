/**
 * Report Modal - pre-export screen with device ID, test results summary, and notes.
 * Generates a 3-section PDF: System Summary, Test Results, Notes.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { jsPDF } from 'jspdf'
import type { PlatformInfo } from '../platform/detect'
import type { ExtensionDeviceInfo } from '../platform/extension-bridge'
import { resolveFormat, getAvailablePresets } from '../platform/device-name-format'

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run'
  detail: string
}

interface ReportModalProps {
  platform: PlatformInfo
  testResults: TestResult[]
  onClose: () => void
  extData?: ExtensionDeviceInfo | null
  extSettings?: Record<string, boolean> | null
  deviceNameFormat?: { format: string | null; locked: boolean } | null
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

export default function ReportModal({ platform, testResults, onClose, extData, extSettings, deviceNameFormat }: ReportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>(() => {
    if (deviceNameFormat?.format) return deviceNameFormat.format
    const stored = localStorage.getItem('readystate_name_format')
    if (stored) return stored
    return ''
  })

  const [deviceName, setDeviceName] = useState(() => {
    if (deviceNameFormat?.format) {
      return resolveFormat(deviceNameFormat.format, extData || null)
    }
    const stored = localStorage.getItem('readystate_name_format')
    if (stored) {
      return resolveFormat(stored, extData || null)
    }
    return ''
  })

  const [notes, setNotes] = useState('')
  const [technician, setTechnician] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString())

  const formatLocked = deviceNameFormat?.locked ?? false
  const availablePresets = extSettings ? getAvailablePresets(extSettings) : []

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format)
    if (format) {
      setDeviceName(resolveFormat(format, extData || null))
      localStorage.setItem('readystate_name_format', format)
    } else {
      setDeviceName('')
    }
  }

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

    // Extension device info (compact 2-column layout)
    if (extData) {
      const extLines: Array<[string, string]> = []

      if (extData.cpu && !extData.cpu.error) {
        extLines.push(['CPU', `${extData.cpu.model_name} (${extData.cpu.num_of_processors} cores)`])
      }
      if (extData.memory && !extData.memory.error) {
        extLines.push(['RAM', `${extData.memory.capacity_gb} GB`])
      }
      if (extData.storage && Array.isArray(extData.storage) && extData.storage.length > 0 && !('error' in extData.storage[0])) {
        const items = extData.storage as Array<{ type: string; capacity_gb: number }>
        const fixed = items.filter(s => s.type === 'fixed')
        const primary = fixed.length > 0 ? fixed[0] : items[0]
        extLines.push(['Storage', `${primary.capacity_gb} GB ${primary.type}`])
      }
      if (extData.display && Array.isArray(extData.display) && extData.display.length > 0) {
        const primary = extData.display.find(d => d.is_primary) || extData.display[0]
        const selectedMode = primary.modes?.find(m => m.is_selected)
        const refreshRate = selectedMode?.refresh_rate ? `${Math.round(selectedMode.refresh_rate)}Hz` : ''
        const dpi = (primary as any).dpi_x ? `${Math.round((primary as any).dpi_x)} DPI` : ''
        const displayParts = [`${primary.bounds.width}x${primary.bounds.height}`, refreshRate, dpi].filter(Boolean)
        extLines.push(['Display', displayParts.join(' ')])
      }
      if (extData.device_info && !extData.device_info.error) {
        extLines.push(['Device', [extData.device_info.manufacturer, extData.device_info.model].filter(Boolean).join(' ')])
      }
      if (extData.network && !extData.network.error) {
        if (extData.network.mac_address) extLines.push(['MAC', extData.network.mac_address])
        if (extData.network.ipv4) extLines.push(['IPv4', extData.network.ipv4])
      }
      if (extData.managed_attributes?.managed && !extData.managed_attributes.error) {
        if (extData.managed_attributes.serial_number) extLines.push(['Serial', extData.managed_attributes.serial_number])
        if (extData.managed_attributes.location) extLines.push(['Location', extData.managed_attributes.location])
        if (extData.managed_attributes.asset_id) extLines.push(['Asset ID', extData.managed_attributes.asset_id])
      }

      if (extLines.length > 0) {
        const fontSize = extLines.length > 6 ? 8 : 9
        doc.setFontSize(fontSize)

        const colWidth = contentWidth / 2
        const leftLines = extLines.slice(0, Math.ceil(extLines.length / 2))
        const rightLines = extLines.slice(Math.ceil(extLines.length / 2))
        const startY = y

        leftLines.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold')
          doc.text(`${label}:`, margin + 2, y)
          doc.setFont('helvetica', 'normal')
          doc.text(value, margin + 30, y)
          y += 4.5
        })

        let rightY = startY
        rightLines.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold')
          doc.text(`${label}:`, margin + colWidth + 2, rightY)
          doc.setFont('helvetica', 'normal')
          doc.text(value, margin + colWidth + 30, rightY)
          rightY += 4.5
        })

        y = Math.max(y, rightY)
        y += 2
      }
    }

    // Section 1: System Summary
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('1. System Summary', margin, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const sysInfo = [
      ['Platform', platform.os],
      ['Browser', platform.browser],
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

    // Performed by line
    y += 10
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Performed by:', margin + 2, y)
    doc.setFont('helvetica', 'normal')
    if (technician.trim()) {
      doc.text(technician.trim(), margin + 40, y)
    } else {
      doc.line(margin + 40, y + 1, margin + 120, y + 1)
    }
    doc.setFont('helvetica', 'bold')
    doc.text('Date:', margin + 122, y)
    doc.setFont('helvetica', 'normal')
    doc.text(reportDate, margin + 135, y)
    y += 8

    doc.setFont('helvetica', 'bold')
    doc.text('Signature:', margin + 2, y)
    doc.line(margin + 40, y + 1, margin + 120, y + 1)

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
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      className="p-3 sm:p-6"
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
            {(availablePresets.length > 0 || formatLocked) && (
              <div className="mb-2">
                <select
                  value={selectedFormat}
                  onChange={(e) => handleFormatChange(e.target.value)}
                  disabled={formatLocked}
                  className={`w-full px-3 py-2 text-xs bg-white/5 text-gray-300 rounded-lg border border-white/10 outline-none font-mono ${
                    formatLocked ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#40E0D0]/50'
                  }`}
                >
                  <option value="">Custom (type below)</option>
                  {availablePresets.map(p => (
                    <option key={p.format} value={p.format}>{p.label}</option>
                  ))}
                  {formatLocked && deviceNameFormat?.format && (
                    <option value={deviceNameFormat.format}>
                      {deviceNameFormat.format} (admin policy)
                    </option>
                  )}
                </select>
                {formatLocked && (
                  <p className="text-[10px] text-amber-400/70 mt-1 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Format locked by administrator
                  </p>
                )}
              </div>
            )}
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={formatLocked}
              placeholder="e.g. CB-2024-0142, Room 204 Cart B"
              className={`w-full px-3 py-2.5 text-sm bg-white/5 text-gray-200 rounded-xl border border-white/10 outline-none transition-colors placeholder:text-gray-600 font-mono ${
                formatLocked ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#40E0D0]/50'
              }`}
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
            <div className="border border-white/5 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
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

          {/* Performed by */}
          <div>
            <label className="text-xs font-bold tracking-widest text-[#40E0D0] uppercase block mb-2">Performed By</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Technician name (or leave blank)"
                className="flex-1 px-3 py-2.5 text-sm bg-white/5 text-gray-200 rounded-xl border border-white/10 outline-none focus:border-[#40E0D0]/50 transition-colors placeholder:text-gray-600 font-mono"
              />
              <input
                type="text"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-36 px-3 py-2.5 text-sm bg-white/5 text-gray-200 rounded-xl border border-white/10 outline-none focus:border-[#40E0D0]/50 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
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
