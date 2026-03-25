// ReadyState Extension - Popup Script

document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version;

async function renderPopup() {
  const content = document.getElementById('content');

  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_DEVICE_INFO' });
    if (!resp || !resp.success) throw new Error(resp?.error || 'Unknown error');

    const d = resp.data;
    const isCros = d.platform?.os === 'cros';
    const isManaged = d.managed_attributes?.managed;

    const rows = [
      { label: 'OS Family', value: formatOS(d.platform?.os) },
    ];

    if (d.device_info) {
      if (d.device_info.manufacturer) rows.push({ label: 'Manufacturer', value: d.device_info.manufacturer });
      if (d.device_info.model) rows.push({ label: 'Board Name', value: d.device_info.model });
    }

    if (d.cpu) {
      rows.push({ label: 'Architecture', value: d.cpu.arch_name || d.platform?.arch || '\u2014' });
      rows.push({ label: 'CPU', value: shortCPU(d.cpu.model_name) });
      rows.push({ label: 'CPU Cores', value: d.cpu.num_of_processors ? `${d.cpu.num_of_processors} cores` : '\u2014' });
    }

    if (d.memory) {
      rows.push({ label: 'RAM', value: d.memory.capacity_gb ? `${d.memory.capacity_gb} GB` : '\u2014' });
    }

    if (d.storage && Array.isArray(d.storage) && d.storage.length > 0 && !d.storage[0].error) {
      const internal = d.storage.find(s => s.type === 'fixed');
      if (internal) rows.push({ label: 'Storage', value: `${internal.capacity_gb} GB` });
    }

    if (d.network) {
      if (d.network.mac_address) rows.push({ label: 'MAC', value: d.network.mac_address });
      if (d.network.ipv4) rows.push({ label: 'IPv4', value: d.network.ipv4 });
    }

    let managedSection = '';
    if (isCros && isManaged && d.managed_attributes) {
      const ma = d.managed_attributes;
      if (ma.serial_number) rows.push({ label: 'Serial #', value: ma.serial_number });
      if (ma.asset_id) rows.push({ label: 'Asset ID', value: ma.asset_id });
      if (ma.hostname) rows.push({ label: 'Hostname', value: ma.hostname });
      if (ma.location) rows.push({ label: 'Location', value: ma.location });
      managedSection = `<div class="managed-badge">\u2713 Managed Device</div>`;
    } else if (isCros && !isManaged) {
      const ma = d.managed_attributes || {};
      const apiAvail = ma.api_available ? 'Yes' : 'No';
      const diagHint = ma._diag?.serial_number?.status === 'rejected'
        ? 'API error: ' + (ma._diag.serial_number.error || 'unknown')
        : ma._diag?.serial_number?.is_empty
          ? 'API returned empty string (affiliation or enrollment issue)'
          : ma.api_available === false
            ? 'enterprise.deviceAttributes API not found on this device'
            : 'APIs called but no data returned';
      managedSection = `<div style="background:#1a1d2e;border-radius:8px;padding:10px;margin-bottom:12px;font-size:12px;color:#94a3b8;line-height:1.5;">
        <strong style="color:#f59e0b;">\u26A0 Unmanaged Chromebook</strong><br>
        Serial number and asset ID require this extension to be force-installed via Google Admin on an enrolled device.<br>
        <span style="color:#64748b;font-size:11px;">API available: ${apiAvail} | ${diagHint}</span>
      </div>`;
    }

    // Show which categories are disabled
    const disabledCategories = Object.entries(d.settings_applied || {})
      .filter(([, v]) => !v)
      .map(([k]) => k);

    let settingsNote = '';
    if (disabledCategories.length > 0) {
      settingsNote = `<div style="background:#1a1d2e;border-radius:8px;padding:8px 10px;margin-bottom:12px;font-size:11px;color:#64748b;">
        ${disabledCategories.length} categor${disabledCategories.length === 1 ? 'y' : 'ies'} disabled. Manage settings at readystate.dev
      </div>`;
    }

    const cards = rows.map(r => `
      <div class="info-card">
        <div class="label">${r.label}</div>
        <div class="value">${r.value || '\u2014'}</div>
      </div>
    `).join('');

    const statusColor = isCros ? '' : ' inactive';
    const statusText = isCros ? 'ChromeOS detected' : `${formatOS(d.platform?.os)} detected`;

    content.innerHTML = `
      <div class="status-row">
        <div class="dot${statusColor}"></div>
        <span>${statusText}</span>
      </div>
      ${managedSection}
      ${settingsNote}
      <div class="info-grid">${cards}</div>
      <button class="cta" id="openReadyState">Open ReadyState \u2192</button>
    `;

    document.getElementById('openReadyState').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://readystate.dev' });
    });

  } catch (err) {
    content.innerHTML = `
      <div style="color:#ef4444;background:#1a1d2e;border-radius:8px;padding:12px;font-size:12px;line-height:1.6;">
        <strong>Error reading device info</strong><br>${err.message}
      </div>
    `;
  }
}

function formatOS(os) {
  const map = { cros: 'ChromeOS', win: 'Windows', mac: 'macOS', linux: 'Linux', android: 'Android', openbsd: 'OpenBSD' };
  return map[os] || os || '\u2014';
}

function shortCPU(model) {
  if (!model) return '\u2014';
  return model.replace(/ CPU.*/, '').replace(/ @ .*/, '').trim().substring(0, 28);
}

renderPopup();

// Diagnostic mode - triple-click the version number to reveal
let diagClicks = 0;
let diagTimer = null;
document.getElementById('version').addEventListener('click', () => {
  diagClicks++;
  clearTimeout(diagTimer);
  diagTimer = setTimeout(() => { diagClicks = 0; }, 600);
  if (diagClicks >= 3) {
    diagClicks = 0;
    runDiagnostics();
  }
});

async function runDiagnostics() {
  const existing = document.getElementById('diag-panel');
  if (existing) { existing.remove(); return; } // toggle off

  const panel = document.createElement('div');
  panel.id = 'diag-panel';
  panel.style.cssText = 'background:#0d1117;border-top:1px solid #2d3748;padding:12px 16px;font-size:11px;font-family:monospace;color:#94a3b8;max-height:300px;overflow-y:auto;';
  panel.innerHTML = '<div style="color:#f59e0b;font-weight:bold;margin-bottom:8px;">DIAGNOSTICS</div><div>Running API checks...</div>';
  document.body.appendChild(panel);

  const lines = [];

  // Check API availability
  lines.push(`chrome.enterprise exists: ${!!chrome.enterprise}`);
  lines.push(`deviceAttributes API: ${!!(chrome.enterprise && chrome.enterprise.deviceAttributes)}`);
  lines.push(`hardwarePlatform API: ${!!(chrome.enterprise && chrome.enterprise.hardwarePlatform)}`);
  lines.push(`networkingAttributes API: ${!!(chrome.enterprise && chrome.enterprise.networkingAttributes)}`);
  lines.push('---');

  // Test each deviceAttributes call individually
  if (chrome.enterprise && chrome.enterprise.deviceAttributes) {
    const calls = [
      ['getDeviceSerialNumber', () => chrome.enterprise.deviceAttributes.getDeviceSerialNumber()],
      ['getDirectoryDeviceId', () => chrome.enterprise.deviceAttributes.getDirectoryDeviceId()],
      ['getDeviceAnnotatedAssetId', () => chrome.enterprise.deviceAttributes.getDeviceAnnotatedAssetId()],
      ['getDeviceAnnotatedLocation', () => chrome.enterprise.deviceAttributes.getDeviceAnnotatedLocation()],
      ['getDeviceHostname', () => chrome.enterprise.deviceAttributes.getDeviceHostname()],
    ];

    for (const [name, fn] of calls) {
      try {
        const result = await fn();
        const type = typeof result;
        const display = result === '' ? '(empty string)' : result === null ? '(null)' : result === undefined ? '(undefined)' : result;
        lines.push(`${name}: ${display} [${type}]`);
      } catch (e) {
        lines.push(`${name}: ERROR - ${e.message}`);
      }
    }
  } else {
    lines.push('deviceAttributes API not available');
  }

  lines.push('---');

  // Test hardwarePlatform
  if (chrome.enterprise && chrome.enterprise.hardwarePlatform) {
    try {
      const hw = await chrome.enterprise.hardwarePlatform.getHardwarePlatformInfo();
      lines.push(`hardwarePlatform: manufacturer="${hw.manufacturer || '(empty)'}" model="${hw.model || '(empty)'}"`);
    } catch (e) {
      lines.push(`hardwarePlatform: ERROR - ${e.message}`);
    }
  }

  // Test CPU
  try {
    const cpu = await chrome.system.cpu.getInfo();
    lines.push(`cpu.modelName: "${cpu.modelName || '(empty)'}"`);
    lines.push(`cpu.archName: "${cpu.archName}"`);
    lines.push(`cpu.numOfProcessors: ${cpu.numOfProcessors}`);
  } catch (e) {
    lines.push(`cpu: ERROR - ${e.message}`);
  }

  // Test storage.managed (admin policy)
  try {
    const managed = await chrome.storage.managed.get(null);
    const keys = Object.keys(managed);
    lines.push(`storage.managed keys: ${keys.length > 0 ? keys.join(', ') : '(none - no admin policy set)'}`);
  } catch (e) {
    lines.push(`storage.managed: ${e.message}`);
  }

  panel.innerHTML = `<div style="color:#f59e0b;font-weight:bold;margin-bottom:8px;">DIAGNOSTICS</div>` +
    lines.map(l => l === '---'
      ? '<hr style="border:none;border-top:1px solid #2d3748;margin:6px 0;">'
      : `<div style="margin:3px 0;word-break:break-all;">${l}</div>`
    ).join('');
}
