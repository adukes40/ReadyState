/**
 * Keyboard layout definitions for different device types.
 * Each key has a code (KeyboardEvent.code), display label, and optional width/style.
 */

export interface KeyDef {
  code: string
  label?: string
  w?: string
  grow?: boolean  // flex-grow to fill remaining row width
  special?: 'trackpoint' | 'trackpoint-btn-left' | 'trackpoint-btn-middle' | 'trackpoint-btn-right' | 'arrow-cluster'
  osReserved?: boolean  // triggers OS/browser action that cannot be prevented by JS
}

export type RowDef = {
  keys: KeyDef[]
}

export interface NumpadKey {
  code: string
  label: string
  colSpan?: number  // default 1
  rowSpan?: number  // default 1
}

export interface KeyboardLayout {
  id: string
  name: string
  rows: RowDef[]
  numpad?: NumpadKey[]  // flat list, rendered as 4-column CSS grid
}

// Helpers
const k = (code: string, label?: string, w?: string): KeyDef => ({ code, label, w })
const os = (code: string, label?: string, w?: string): KeyDef => ({ code, label, w, osReserved: true })

const arrows = (): KeyDef => ({ code: '_arrows', special: 'arrow-cluster' })

const row = (keys: KeyDef[]): RowDef => ({ keys })

// ── Chromebook ──────────────────────────────────────────────────────
const CHROMEBOOK: KeyboardLayout = {
  id: 'chromebook',
  name: 'Chromebook',
  rows: [
    row([
      k('Escape', 'Esc'),
      os('F1', 'Back'), os('F2', 'Fwd'), os('F3', 'Refr'), os('F4', 'Full'),
      os('F5', 'Over'), os('F6', 'Dim'), os('F7', 'Brt'),
      os('F8', 'Mute'), os('F9', 'Vol-'), os('F10', 'Vol+'),
    ]),
    row([
      k('Backquote', '`'), k('Digit1', '1'), k('Digit2', '2'), k('Digit3', '3'),
      k('Digit4', '4'), k('Digit5', '5'), k('Digit6', '6'), k('Digit7', '7'),
      k('Digit8', '8'), k('Digit9', '9'), k('Digit0', '0'), k('Minus', '-'),
      k('Equal', '='), { code: 'Backspace', label: '⌫', grow: true },
    ]),
    row([
      k('Tab', 'Tab', 'w-[3.25rem]'), k('KeyQ', 'Q'), k('KeyW', 'W'), k('KeyE', 'E'),
      k('KeyR', 'R'), k('KeyT', 'T'), k('KeyY', 'Y'), k('KeyU', 'U'),
      k('KeyI', 'I'), k('KeyO', 'O'), k('KeyP', 'P'), k('BracketLeft', '['),
      k('BracketRight', ']'), { code: 'Backslash', label: '\\', grow: true },
    ]),
    row([
      k('MetaLeft', '⚲', 'w-[3.75rem]'), k('KeyA', 'A'), k('KeyS', 'S'), k('KeyD', 'D'),
      k('KeyF', 'F'), k('KeyG', 'G'), k('KeyH', 'H'), k('KeyJ', 'J'),
      k('KeyK', 'K'), k('KeyL', 'L'), k('Semicolon', ';'), k('Quote', "'"),
      { code: 'Enter', label: 'Enter', grow: true },
    ]),
    row([
      k('ShiftLeft', 'Shift', 'w-[4.75rem]'), k('KeyZ', 'Z'), k('KeyX', 'X'), k('KeyC', 'C'),
      k('KeyV', 'V'), k('KeyB', 'B'), k('KeyN', 'N'), k('KeyM', 'M'),
      k('Comma', ','), k('Period', '.'), k('Slash', '/'),
      { code: 'ShiftRight', label: 'Shift', grow: true },
    ]),
    row([
      k('ControlLeft', 'Ctrl', 'w-[3.25rem]'), k('AltLeft', 'Alt', 'w-[2.75rem]'),
      { code: 'Space', label: '', grow: true },
      k('AltRight', 'Alt', 'w-[2.75rem]'), k('ControlRight', 'Ctrl', 'w-[3.25rem]'),
      arrows(),
    ]),
  ],
}

// ── Laptop (no numpad) ──────────────────────────────────────────────
const LAPTOP: KeyboardLayout = {
  id: 'laptop',
  name: 'Laptop (compact)',
  rows: [
    row([
      k('Escape', 'Esc'),
      k('F1', 'F1'), k('F2', 'F2'), k('F3', 'F3'), k('F4', 'F4'),
      k('F5', 'F5'), k('F6', 'F6'), k('F7', 'F7'), k('F8', 'F8'),
      k('F9', 'F9'), k('F10', 'F10'), k('F11', 'F11'), k('F12', 'F12'),
    ]),
    row([
      k('Backquote', '`'), k('Digit1', '1'), k('Digit2', '2'), k('Digit3', '3'),
      k('Digit4', '4'), k('Digit5', '5'), k('Digit6', '6'), k('Digit7', '7'),
      k('Digit8', '8'), k('Digit9', '9'), k('Digit0', '0'), k('Minus', '-'),
      k('Equal', '='), { code: 'Backspace', label: '⌫', grow: true },
    ]),
    row([
      k('Tab', 'Tab', 'w-[3.25rem]'), k('KeyQ', 'Q'), k('KeyW', 'W'), k('KeyE', 'E'),
      k('KeyR', 'R'), k('KeyT', 'T'), k('KeyY', 'Y'), k('KeyU', 'U'),
      k('KeyI', 'I'), k('KeyO', 'O'), k('KeyP', 'P'), k('BracketLeft', '['),
      k('BracketRight', ']'), { code: 'Backslash', label: '\\', grow: true },
    ]),
    row([
      k('CapsLock', 'Caps', 'w-[3.75rem]'), k('KeyA', 'A'), k('KeyS', 'S'), k('KeyD', 'D'),
      k('KeyF', 'F'), k('KeyG', 'G'), k('KeyH', 'H'), k('KeyJ', 'J'),
      k('KeyK', 'K'), k('KeyL', 'L'), k('Semicolon', ';'), k('Quote', "'"),
      { code: 'Enter', label: 'Enter', grow: true },
    ]),
    row([
      k('ShiftLeft', 'Shift', 'w-[4.75rem]'), k('KeyZ', 'Z'), k('KeyX', 'X'), k('KeyC', 'C'),
      k('KeyV', 'V'), k('KeyB', 'B'), k('KeyN', 'N'), k('KeyM', 'M'),
      k('Comma', ','), k('Period', '.'), k('Slash', '/'),
      { code: 'ShiftRight', label: 'Shift', grow: true },
    ]),
    row([
      k('ControlLeft', 'Ctrl', 'w-[2.75rem]'), k('MetaLeft', 'Win', 'w-[2.25rem]'), k('AltLeft', 'Alt', 'w-[2.25rem]'),
      { code: 'Space', label: '', grow: true },
      k('AltRight', 'Alt', 'w-[2.25rem]'), k('MetaRight', 'Fn', 'w-[2.25rem]'), k('ControlRight', 'Ctrl', 'w-[2.75rem]'),
      arrows(),
    ]),
  ],
}

// ── Laptop with numpad ──────────────────────────────────────────────
const LAPTOP_NUMPAD: KeyboardLayout = {
  id: 'laptop-numpad',
  name: 'Laptop (full-size)',
  rows: [
    row([
      k('Escape', 'Esc'),

      k('F1', 'F1'), k('F2', 'F2'), k('F3', 'F3'), k('F4', 'F4'),

      k('F5', 'F5'), k('F6', 'F6'), k('F7', 'F7'), k('F8', 'F8'),

      k('F9', 'F9'), k('F10', 'F10'), k('F11', 'F11'), k('F12', 'F12'),

      k('Insert', 'Ins'), k('Delete', 'Del'),
    ]),
    row([
      k('Backquote', '`'), k('Digit1', '1'), k('Digit2', '2'), k('Digit3', '3'),
      k('Digit4', '4'), k('Digit5', '5'), k('Digit6', '6'), k('Digit7', '7'),
      k('Digit8', '8'), k('Digit9', '9'), k('Digit0', '0'), k('Minus', '-'),
      k('Equal', '='), { code: 'Backspace', label: '⌫', w: 'w-[3.75rem]', grow: true },
    ]),
    row([
      k('Tab', 'Tab', 'w-[3.25rem]'), k('KeyQ', 'Q'), k('KeyW', 'W'), k('KeyE', 'E'),
      k('KeyR', 'R'), k('KeyT', 'T'), k('KeyY', 'Y'), k('KeyU', 'U'),
      k('KeyI', 'I'), k('KeyO', 'O'), k('KeyP', 'P'), k('BracketLeft', '['),
      k('BracketRight', ']'), { code: 'Backslash', label: '\\', grow: true },
    ]),
    row([
      k('CapsLock', 'Caps', 'w-[3.75rem]'), k('KeyA', 'A'), k('KeyS', 'S'), k('KeyD', 'D'),
      k('KeyF', 'F'), k('KeyG', 'G'), k('KeyH', 'H'), k('KeyJ', 'J'),
      k('KeyK', 'K'), k('KeyL', 'L'), k('Semicolon', ';'), k('Quote', "'"),
      { code: 'Enter', label: 'Enter', w: 'w-[3.75rem]', grow: true },
    ]),
    row([
      k('ShiftLeft', 'Shift', 'w-[4.75rem]'), k('KeyZ', 'Z'), k('KeyX', 'X'), k('KeyC', 'C'),
      k('KeyV', 'V'), k('KeyB', 'B'), k('KeyN', 'N'), k('KeyM', 'M'),
      k('Comma', ','), k('Period', '.'), k('Slash', '/'),
      { code: 'ShiftRight', label: 'Shift', grow: true },
    ]),
    row([
      k('ControlLeft', 'Ctrl', 'w-[2.75rem]'), k('MetaLeft', 'Win', 'w-[2.25rem]'), k('AltLeft', 'Alt', 'w-[2.25rem]'),
      { code: 'Space', label: '', grow: true },
      k('AltRight', 'Alt', 'w-[2.25rem]'), k('ControlRight', 'Ctrl', 'w-[2.75rem]'),
      arrows(),
    ]),
  ],
  numpad: [
    // Row 1
    { code: 'NumLock', label: 'Num' },
    { code: 'NumpadDivide', label: '/' },
    { code: 'NumpadMultiply', label: '×' },
    { code: 'NumpadSubtract', label: '−' },
    // Row 2
    { code: 'Numpad7', label: '7' },
    { code: 'Numpad8', label: '8' },
    { code: 'Numpad9', label: '9' },
    { code: 'NumpadAdd', label: '+', rowSpan: 2 },
    // Row 3
    { code: 'Numpad4', label: '4' },
    { code: 'Numpad5', label: '5' },
    { code: 'Numpad6', label: '6' },
    // Row 4
    { code: 'Numpad1', label: '1' },
    { code: 'Numpad2', label: '2' },
    { code: 'Numpad3', label: '3' },
    { code: 'NumpadEnter', label: 'Ent', rowSpan: 2 },
    // Row 5
    { code: 'Numpad0', label: '0', colSpan: 2 },
    { code: 'NumpadDecimal', label: '.' },
  ],
}

// ── ThinkPad ────────────────────────────────────────────────────────
const THINKPAD: KeyboardLayout = {
  id: 'thinkpad',
  name: 'ThinkPad',
  rows: [
    row([
      k('Escape', 'Esc'),
      k('F1', 'F1'), k('F2', 'F2'), k('F3', 'F3'), k('F4', 'F4'),
      k('F5', 'F5'), k('F6', 'F6'), k('F7', 'F7'), k('F8', 'F8'),
      k('F9', 'F9'), k('F10', 'F10'), k('F11', 'F11'), k('F12', 'F12'),
      k('Home', 'Hm'), k('End', 'End'),
      k('Insert', 'Ins'), k('Delete', 'Del'),
    ]),
    row([
      k('Backquote', '`'), k('Digit1', '1'), k('Digit2', '2'), k('Digit3', '3'),
      k('Digit4', '4'), k('Digit5', '5'), k('Digit6', '6'), k('Digit7', '7'),
      k('Digit8', '8'), k('Digit9', '9'), k('Digit0', '0'), k('Minus', '-'),
      k('Equal', '='), { code: 'Backspace', label: '⌫', grow: true },
    ]),
    row([
      k('Tab', 'Tab', 'w-[3.25rem]'), k('KeyQ', 'Q'), k('KeyW', 'W'), k('KeyE', 'E'),
      k('KeyR', 'R'), k('KeyT', 'T'), k('KeyY', 'Y'), k('KeyU', 'U'),
      k('KeyI', 'I'), k('KeyO', 'O'), k('KeyP', 'P'), k('BracketLeft', '['),
      k('BracketRight', ']'), { code: 'Backslash', label: '\\', grow: true },
    ]),
    row([
      k('CapsLock', 'Caps', 'w-[3.75rem]'), k('KeyA', 'A'), k('KeyS', 'S'), k('KeyD', 'D'),
      k('KeyF', 'F'), k('KeyG', 'G'),
      { code: '_trackpoint', special: 'trackpoint', w: 'w-4' },
      k('KeyH', 'H'), k('KeyJ', 'J'),
      k('KeyK', 'K'), k('KeyL', 'L'), k('Semicolon', ';'), k('Quote', "'"),
      { code: 'Enter', label: 'Enter', grow: true },
    ]),
    row([
      k('ShiftLeft', 'Shift', 'w-[4.75rem]'), k('KeyZ', 'Z'), k('KeyX', 'X'), k('KeyC', 'C'),
      k('KeyV', 'V'), k('KeyB', 'B'), k('KeyN', 'N'), k('KeyM', 'M'),
      k('Comma', ','), k('Period', '.'), k('Slash', '/'),
      { code: 'ShiftRight', label: 'Shift', grow: true },
    ]),
    row([
      k('Fn', 'Fn', 'w-[2.25rem]'), k('ControlLeft', 'Ctrl', 'w-[2.75rem]'),
      k('MetaLeft', 'Win', 'w-[2.25rem]'), k('AltLeft', 'Alt', 'w-[2.25rem]'),
      { code: 'Space', label: '', grow: true },
      k('AltRight', 'Alt', 'w-[2.25rem]'),
      k('PrintScreen', 'Prt', 'w-[2.25rem]'), k('ControlRight', 'Ctrl', 'w-[2.75rem]'),
      arrows(),
    ]),
    // TrackPoint buttons (physical mouse buttons above trackpad)
    row([
      { code: '_tp_left', label: '', w: 'w-[10rem]', special: 'trackpoint-btn-left' },
      { code: '_tp_middle', label: '', w: 'w-[4rem]', special: 'trackpoint-btn-middle' },
      { code: '_tp_right', label: '', w: 'w-[10rem]', special: 'trackpoint-btn-right' },
    ]),
  ],
}

// ── MacBook ─────────────────────────────────────────────────────────
const MACBOOK: KeyboardLayout = {
  id: 'macbook',
  name: 'MacBook',
  rows: [
    row([
      k('Escape', 'esc', 'w-[3.25rem]'),
      k('F1', 'F1'), k('F2', 'F2'), k('F3', 'F3'), k('F4', 'F4'),
      k('F5', 'F5'), k('F6', 'F6'), k('F7', 'F7'), k('F8', 'F8'),
      k('F9', 'F9'), k('F10', 'F10'), k('F11', 'F11'), k('F12', 'F12'),
    ]),
    row([
      k('Backquote', '`'), k('Digit1', '1'), k('Digit2', '2'), k('Digit3', '3'),
      k('Digit4', '4'), k('Digit5', '5'), k('Digit6', '6'), k('Digit7', '7'),
      k('Digit8', '8'), k('Digit9', '9'), k('Digit0', '0'), k('Minus', '-'),
      k('Equal', '='), { code: 'Backspace', label: '⌫', grow: true },
    ]),
    row([
      k('Tab', 'tab', 'w-[3.25rem]'), k('KeyQ', 'Q'), k('KeyW', 'W'), k('KeyE', 'E'),
      k('KeyR', 'R'), k('KeyT', 'T'), k('KeyY', 'Y'), k('KeyU', 'U'),
      k('KeyI', 'I'), k('KeyO', 'O'), k('KeyP', 'P'), k('BracketLeft', '['),
      k('BracketRight', ']'), { code: 'Backslash', label: '\\', grow: true },
    ]),
    row([
      k('CapsLock', 'caps', 'w-[3.75rem]'), k('KeyA', 'A'), k('KeyS', 'S'), k('KeyD', 'D'),
      k('KeyF', 'F'), k('KeyG', 'G'), k('KeyH', 'H'), k('KeyJ', 'J'),
      k('KeyK', 'K'), k('KeyL', 'L'), k('Semicolon', ';'), k('Quote', "'"),
      { code: 'Enter', label: 'return', grow: true },
    ]),
    row([
      k('ShiftLeft', '⇧', 'w-[4.75rem]'), k('KeyZ', 'Z'), k('KeyX', 'X'), k('KeyC', 'C'),
      k('KeyV', 'V'), k('KeyB', 'B'), k('KeyN', 'N'), k('KeyM', 'M'),
      k('Comma', ','), k('Period', '.'), k('Slash', '/'),
      { code: 'ShiftRight', label: '⇧', grow: true },
    ]),
    row([
      k('Fn', 'fn', 'w-[2.25rem]'), k('ControlLeft', '⌃', 'w-[2.25rem]'),
      k('AltLeft', '⌥', 'w-[2.25rem]'), k('MetaLeft', '⌘', 'w-[3rem]'),
      { code: 'Space', label: '', grow: true },
      k('MetaRight', '⌘', 'w-[3rem]'), k('AltRight', '⌥', 'w-[2.25rem]'),
      arrows(),
    ]),
  ],
}

export const LAYOUTS: KeyboardLayout[] = [CHROMEBOOK, LAPTOP, LAPTOP_NUMPAD, THINKPAD, MACBOOK]

/** Get all testable key codes from a layout (excludes gaps, spacers, specials, OS-reserved keys) */
export function getTestableKeys(layout: KeyboardLayout): string[] {
  const mainKeys = layout.rows.flatMap((r) =>
    r.keys
      .filter((d) => !d.code.startsWith('_') && !d.special && !d.osReserved)
      .map((d) => d.code)
  )
  const numpadKeys = (layout.numpad ?? []).map((nk) => nk.code)
  return [...mainKeys, ...numpadKeys]
}
