/**
 * Dead Pixel Test — Fullscreen Canvas with solid colors.
 * User visually inspects for stuck/dead pixels on each color.
 */

const TEST_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#FFFF00', '#FF00FF', '#00FFFF']

export function runDisplayTest(
  canvas: HTMLCanvasElement,
  onColorChange: (color: string, index: number, total: number) => void,
): { next: () => boolean; getCurrentColor: () => string } {
  const ctx = canvas.getContext('2d')!
  let currentIndex = 0

  function draw() {
    const color = TEST_COLORS[currentIndex]
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onColorChange(color, currentIndex, TEST_COLORS.length)
  }

  draw()

  return {
    next: () => {
      currentIndex++
      if (currentIndex >= TEST_COLORS.length) return false
      draw()
      return true
    },
    getCurrentColor: () => TEST_COLORS[currentIndex],
  }
}
