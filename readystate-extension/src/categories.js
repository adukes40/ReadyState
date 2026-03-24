// Data collection categories - single source of truth for both extension and web app.
// Each category is device-focused only. No user-identity data (FERPA/COPPA/HIPAA safe).

export const CATEGORIES = {
  device_info: {
    label: 'Device Info',
    description: 'Manufacturer, model, OS, architecture',
    defaultEnabled: true
  },
  cpu: {
    label: 'CPU',
    description: 'Processor model, core count, architecture, feature flags',
    defaultEnabled: true
  },
  memory: {
    label: 'Memory',
    description: 'Total RAM and available RAM',
    defaultEnabled: true
  },
  storage: {
    label: 'Storage',
    description: 'Drive type and capacity',
    defaultEnabled: true
  },
  display: {
    label: 'Display',
    description: 'Resolution, DPI, rotation, refresh rate, touch support',
    defaultEnabled: true
  },
  network: {
    label: 'Network',
    description: 'MAC address, IPv4, IPv6',
    defaultEnabled: true
  },
  managed_attributes: {
    label: 'Managed Device Attributes',
    description: 'Serial number, asset ID, hostname, location',
    defaultEnabled: true
  }
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);
