# ReadyState

Browser-based hardware diagnostics and stress testing for Chromebook fleets (Can test other devices such as laptops and MacBooks). Built for K-12 IT departments that need a fast, reliable way to verify device health without installing anything.

Everything runs in the browser. No agents, no extensions, no admin console access required. Open the page, run the tests, export a PDF.

## What It Tests

### Hardware Tests

- **Speaker** - Plays a 440Hz test tone to verify audio output.
- **Microphone** - Records 3 seconds of input and checks the signal level.
- **Camera** - Detects resolution and frame rate from the device camera.
- **Display** - Cycles fullscreen solid colors for dead pixel and backlight bleed detection.
- **Network Speed** - Runs 14 measurement steps against a global edge network. Reports download/upload speed, idle and loaded latency, jitter, and an overall connection quality score.
- **Battery Status** - Live charge level, plug state, and estimated time to full or empty.

### Input Tests

- **Keyboard** - Visual keyboard map with Chromebook, MacBook, and Laptop layouts. Press each key to mark it as tested. On Chromebooks, OS-reserved top-row keys are flagged and excluded from the test score.
- **Trackpad** - Canvas-based test for 7 actions: move, left click, right click, middle click, double click, vertical scroll, and horizontal scroll. Draws a live cursor trail and ripple effects.

### Stress Tests

- **Memory Pressure** - Allocates memory in 16 MB chunks until the browser limit is reached. Shows a gauge of RAM usage with garbage collection detection.
- **Tab Swarm** - Spawns Web Workers that simulate browser tabs at four weight levels (Search, Docs, Interactive, Video). Presets like "Classroom Mix" and "Testing Day" simulate real K-12 workloads. Monitors thread latency, frame rate, and heap memory in real-time charts.

## System Readout

On load, the app detects and displays platform details: OS, browser, processor cores, memory, display resolution, color depth, touch support, and GPU. This data is included in the PDF export.

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
