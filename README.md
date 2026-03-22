# ReadyState

Browser-based hardware diagnostics and stress testing for Chromebook fleets (can test other devices such as laptops and MacBooks). Built for K-12 IT departments that need a fast, reliable way to verify device health without installing anything.

Everything runs in the browser. No agents, no extensions, no admin console access required. Open the page, run the tests, export a PDF.

## What It Tests

### Hardware Tests

- **Speaker** - Plays a 440Hz test tone to verify audio output.
- **Microphone** - Records 3 seconds of input and checks the signal level.
- **Camera** - Detects resolution and frame rate from the device camera.
- **Display** - Cycles fullscreen solid colors for dead pixel and backlight bleed detection. Must complete all color cycles to register a pass.
- **Network Speed** - Runs 14 measurement steps against a global edge network. Reports download and upload speed, idle and loaded latency, idle and loaded jitter, and an overall connection quality score. The current test step is displayed in real time during the run. Color-coded thresholds: latency green under 50ms, speed green above 25 Mbps, jitter green under 5ms.
- **Battery Status** - Live battery level, charge state, and estimated time to full or empty. Auto-updates every 30 seconds and on system battery events. Color changes at 25% (yellow) and 10% (red). Not available on all browsers or desktop devices.

### Input Tests

- **Keyboard** - Visual keyboard map with Chromebook, MacBook, and Laptop layouts. Press each key to mark it as tested. On Chromebooks, OS-reserved top-row keys (Back, Refresh, Fullscreen, etc.) are flagged and excluded from the test score since they cannot be captured by the browser.
- **Trackpad** - Canvas-based test for 7 actions: move, left click, right click, middle click, double click, vertical scroll, and horizontal scroll. Draws a live cursor trail and ripple effects on a dark canvas with crosshairs.

### Stress Tests

- **Memory Pressure** - Allocates memory in 16 MB chunks until the browser limit is reached or you click Stop. Shows a gauge of RAM usage as a percentage of reported device memory. Detects garbage collection events and displays peak allocation after the test completes.
- **Tab Swarm** - Spawns Web Workers that simulate browser tabs at four weight levels (Search 8MB, Docs 24MB, Interactive 48MB, Video 64MB). Presets like "Classroom Mix" and "Testing Day" simulate real K-12 workloads. Tabs spawn every 1.2 seconds while real-time charts track thread latency, frame rate, and JS heap memory. Peak latency under 50ms means the device handled it well; over 150ms means it struggled.

## System Readout

On load, the app detects and displays: OS, browser, processor cores, memory, display resolution, pixel ratio, color depth, touch support, and GPU. This data is included in the PDF export.

## PDF Export

Click "Export PDF" in the System Readout section to open the report builder. The report includes:

- **Device Name** - Optional identifier for the device (asset tag, room number, cart label, etc.).
- **System Summary** - All detected platform details.
- **Test Results** - Status and detail for every test that was run.
- **Notes** - Free-text field for observations, issues found, or actions taken.
- **Performed By** - Technician name (optional, can be left blank for manual entry) and date (defaults to today, editable). Prints on one line at the bottom of the PDF.

Reports can be exported as a PDF file or sent directly to a printer.

## Info Tooltips

Every test panel has an info button that explains what the test does, how to use it, and what the results mean. Labels within each tooltip are bolded for quick scanning.

## Getting Started

### Requirements

- Node.js 18+
- npm

### Install and Run

```bash
git clone https://github.com/adukes40/ReadyState.git
cd ReadyState
npm install
```

Copy the config template and fill in your values:

```bash
cp src/config.example.ts src/config.ts
```

You can also set environment variables at build time:

```
VITE_KOFI_URL=https://ko-fi.com/your_username
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in a browser.

### Build for Production

```bash
npm run build
```

Output goes to `dist/`. This is a static site that can be deployed to any hosting provider.

## License

MIT
