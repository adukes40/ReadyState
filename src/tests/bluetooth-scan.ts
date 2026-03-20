/**
 * Bluetooth Scan — Web Bluetooth API device discovery.
 * Chromium browsers only.
 */

export interface BluetoothResult {
  supported: boolean
  devicesFound: number
  devices: { name: string; id: string }[]
  error: string | null
}

export async function scanBluetooth(): Promise<BluetoothResult> {
  if (!('bluetooth' in navigator)) {
    return { supported: false, devicesFound: 0, devices: [], error: 'Web Bluetooth not supported' }
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [],
    })

    return {
      supported: true,
      devicesFound: 1,
      devices: [{ name: device.name ?? 'Unknown', id: device.id }],
      error: null,
    }
  } catch (e) {
    return { supported: true, devicesFound: 0, devices: [], error: String(e) }
  }
}
