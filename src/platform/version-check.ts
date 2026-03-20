/**
 * Version checking — compare device ChromeOS version against
 * latest stable from cros.tech data cached in Cloudflare KV.
 */

export type VersionStatus = 'up_to_date' | 'behind' | 'eol' | 'unknown'

export interface VersionInfo {
  status: VersionStatus
  currentVersion: string
  latestVersion: string | null
  versionsBehind: number
  eolDate: string | null
  recoveryUrl: string | null
}

export async function checkVersion(
  boardName: string,
  currentPlatformVersion: string,
  apiBase: string,
): Promise<VersionInfo> {
  try {
    const res = await fetch(`${apiBase}/api/version-check?board=${encodeURIComponent(boardName)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json() as {
      stable: string
      platform: string
      eol_date: string | null
      recovery_url: string | null
    }

    const eolDate = data.eol_date
    const isEol = eolDate ? new Date(eolDate) < new Date() : false

    if (isEol) {
      return {
        status: 'eol',
        currentVersion: currentPlatformVersion,
        latestVersion: data.platform,
        versionsBehind: 0,
        eolDate,
        recoveryUrl: data.recovery_url,
      }
    }

    const behind = compareVersions(currentPlatformVersion, data.platform)

    return {
      status: behind === 0 ? 'up_to_date' : 'behind',
      currentVersion: currentPlatformVersion,
      latestVersion: data.platform,
      versionsBehind: behind,
      eolDate,
      recoveryUrl: data.recovery_url,
    }
  } catch {
    return {
      status: 'unknown',
      currentVersion: currentPlatformVersion,
      latestVersion: null,
      versionsBehind: 0,
      eolDate: null,
      recoveryUrl: null,
    }
  }
}

function compareVersions(current: string, latest: string): number {
  const c = current.split('.').map(Number)
  const l = latest.split('.').map(Number)
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] ?? 0
    const lv = l[i] ?? 0
    if (cv < lv) return lv - cv
  }
  return 0
}
