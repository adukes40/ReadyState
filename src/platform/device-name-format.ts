/**
 * Resolves a device name format template using extension data.
 * Variables: {serial}, {asset_id}, {location}, {hostname}, {manufacturer}, {model}
 * Strips separators around empty variables automatically.
 */

import type { ExtensionDeviceInfo } from './extension-bridge'

/** Preset format options for the report dropdown. */
export const DEVICE_NAME_PRESETS = [
  { label: 'Serial -- Location', format: '{serial} -- {location}', requires: ['managed_attributes'] },
  { label: 'Asset ID -- Serial', format: '{asset_id} -- {serial}', requires: ['managed_attributes'] },
  { label: 'Model -- Serial', format: '{model} -- {serial}', requires: ['device_info', 'managed_attributes'] },
  { label: 'Hostname', format: '{hostname}', requires: ['managed_attributes'] },
] as const

/**
 * Build a variable map from extension data.
 */
function buildVariableMap(extData: ExtensionDeviceInfo | null): Record<string, string> {
  if (!extData) return {}

  const vars: Record<string, string> = {}

  if (extData.managed_attributes && !extData.managed_attributes.error) {
    if (extData.managed_attributes.serial_number) vars.serial = extData.managed_attributes.serial_number
    if (extData.managed_attributes.asset_id) vars.asset_id = extData.managed_attributes.asset_id
    if (extData.managed_attributes.location) vars.location = extData.managed_attributes.location
    if (extData.managed_attributes.hostname) vars.hostname = extData.managed_attributes.hostname
  }

  if (extData.device_info && !extData.device_info.error) {
    if (extData.device_info.manufacturer) vars.manufacturer = extData.device_info.manufacturer
    if (extData.device_info.model) vars.model = extData.device_info.model
  }

  return vars
}

/**
 * Resolve a format template string using available variables.
 * Empty variables and their surrounding separators are stripped.
 * Example: "{serial} -- {location}" with empty location becomes "SN-123".
 */
export function resolveFormat(format: string, extData: ExtensionDeviceInfo | null): string {
  const vars = buildVariableMap(extData)

  // Replace each {variable} with its value or empty string
  let result = format.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '')

  // Clean up orphaned separators: " -- ", " - ", " / ", " | "
  result = result.replace(/\s*[-/|]+\s*$/g, '') // trailing separator
  result = result.replace(/^\s*[-/|]+\s*/g, '') // leading separator
  result = result.replace(/\s+[-/|]+\s+[-/|]+\s+/g, ' -- ') // doubled separators
  result = result.replace(/\s+[-/|]+\s*$/g, '') // trailing after cleanup

  return result.trim()
}

/**
 * Get available presets based on active extension categories.
 */
export function getAvailablePresets(activeCategories: Record<string, boolean>): typeof DEVICE_NAME_PRESETS[number][] {
  return DEVICE_NAME_PRESETS.filter(p =>
    p.requires.every(cat => activeCategories[cat])
  )
}
