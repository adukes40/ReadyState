/**
 * Platform detection — OS, browser, and capability detection.
 * Auto-detects available APIs on page load and hides unsupported tests.
 */

export interface PlatformInfo {
  os: string
  browser: string
  cores: number
  ram: number | null
  gpu: string | null
  architecture: string | null
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  colorDepth: number
  touchSupported: boolean
  maxTouchPoints: number
}

export interface PlatformCapabilities {
  battery: boolean
  deviceMemory: boolean
  bluetooth: boolean
  webgl: boolean
  webgl2: boolean
  webWorkers: boolean
  getUserMedia: boolean
  clientHints: boolean
}

export async function detectPlatform(): Promise<PlatformInfo> {
  const gpu = getGPURenderer()

  let architecture: string | null = null
  let os = navigator.platform
  let browser = navigator.userAgent

  // Try high-entropy UA Client Hints (Chromium only)
  if ('userAgentData' in navigator) {
    try {
      const ua = await (navigator as any).userAgentData.getHighEntropyValues([
        'platform', 'platformVersion', 'model', 'architecture', 'fullVersionList',
      ])
      os = `${ua.platform} ${ua.platformVersion}`
      architecture = ua.architecture
      const chrome = ua.fullVersionList?.find((v: any) => v.brand === 'Google Chrome' || v.brand === 'Chromium')
      if (chrome) browser = `Chrome ${chrome.version}`
    } catch {
      // Fall back to basic UA
    }
  }

  return {
    os,
    browser,
    cores: navigator.hardwareConcurrency || 1,
    ram: (navigator as any).deviceMemory ?? null,
    gpu,
    architecture,
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    touchSupported: navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints,
  }
}

export function detectCapabilities(): PlatformCapabilities {
  return {
    battery: 'getBattery' in navigator,
    deviceMemory: 'deviceMemory' in navigator,
    bluetooth: 'bluetooth' in navigator,
    webgl: !!getWebGLContext('webgl'),
    webgl2: !!getWebGLContext('webgl2'),
    webWorkers: typeof Worker !== 'undefined',
    getUserMedia: !!(navigator.mediaDevices?.getUserMedia),
    clientHints: 'userAgentData' in navigator,
  }
}

function getWebGLContext(type: 'webgl' | 'webgl2'): WebGLRenderingContext | null {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext(type) as WebGLRenderingContext | null
  } catch {
    return null
  }
}

function getGPURenderer(): string | null {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return null
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return null
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
  } catch {
    return null
  }
}
