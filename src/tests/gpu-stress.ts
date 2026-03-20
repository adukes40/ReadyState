/**
 * GPU Stress Test — WebGL heavy fragment shader (raymarching SDF).
 * Detects GPU stability, driver crashes, and sustained FPS degradation.
 * Must handle WEBGL_lose_context events gracefully.
 */

export interface GPUStressCallbacks {
  onFPS: (fps: number, elapsed: number) => void
  onDone: (avgFPS: number, minFPS: number, contextLost: boolean) => void
  onError: (error: string) => void
}

export function startGPUStress(
  canvas: HTMLCanvasElement,
  durationSec: number,
  callbacks: GPUStressCallbacks,
): () => void {
  let stopped = false
  let contextLost = false

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!gl) {
    callbacks.onError('WebGL not supported')
    return () => {}
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    contextLost = true
    stopped = true
    callbacks.onDone(0, 0, true)
  })

  // Heavy fragment shader — raymarching SDF scene
  const fragSource = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;

    float sdSphere(vec3 p, float r) { return length(p) - r; }
    float sdBox(vec3 p, vec3 b) { vec3 d = abs(p) - b; return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0)); }

    float scene(vec3 p) {
      float d = sdSphere(p - vec3(sin(u_time)*2.0, 0, 0), 1.0);
      d = min(d, sdBox(p - vec3(0, sin(u_time*0.7)*1.5, 0), vec3(0.8)));
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        d = min(d, sdSphere(p - vec3(cos(u_time+fi)*3.0, sin(u_time*0.5+fi)*2.0, sin(u_time*0.3+fi)*3.0), 0.5));
      }
      d = min(d, p.y + 2.0);
      return d;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;
      vec3 ro = vec3(0, 1, -5);
      vec3 rd = normalize(vec3(uv, 1.5));
      float t = 0.0;
      for (int i = 0; i < 80; i++) {
        float d = scene(ro + rd*t);
        if (d < 0.001 || t > 20.0) break;
        t += d;
      }
      vec3 col = vec3(0.1) + vec3(0.8)*exp(-0.1*t);
      gl_FragColor = vec4(col, 1.0);
    }
  `

  const vertSource = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0, 1); }
  `

  const prog = createProgram(gl, vertSource, fragSource)
  if (!prog) {
    callbacks.onError('Failed to compile shader')
    return () => {}
  }

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

  const aPos = gl.getAttribLocation(prog, 'a_pos')
  const uTime = gl.getUniformLocation(prog, 'u_time')
  const uRes = gl.getUniformLocation(prog, 'u_resolution')

  gl.useProgram(prog)
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const fpsHistory: number[] = []
  let frames = 0
  let lastFPSTime = performance.now()
  const startTime = performance.now()

  function render() {
    if (stopped) return

    const now = performance.now()
    const elapsed = (now - startTime) / 1000

    if (elapsed >= durationSec) {
      const avg = fpsHistory.reduce((a, b) => a + b, 0) / (fpsHistory.length || 1)
      const min = Math.min(...fpsHistory)
      callbacks.onDone(avg, min, contextLost)
      return
    }

    gl!.viewport(0, 0, canvas.width, canvas.height)
    gl!.uniform1f(uTime, elapsed)
    gl!.uniform2f(uRes, canvas.width, canvas.height)
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)

    frames++
    if (now - lastFPSTime >= 1000) {
      fpsHistory.push(frames)
      callbacks.onFPS(frames, elapsed)
      frames = 0
      lastFPSTime = now
    }

    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)

  return () => { stopped = true }
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram | null {
  const vs = gl.createShader(gl.VERTEX_SHADER)!
  gl.shaderSource(vs, vertSrc)
  gl.compileShader(vs)

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!
  gl.shaderSource(fs, fragSrc)
  gl.compileShader(fs)

  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  return prog
}
