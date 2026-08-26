"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide animated backdrop.
 *
 * Layer 1 (CSS): fixed grid texture + four soft glows — the devportfolio.my /
 * webportfolios.dev signature, always present, zero JS cost.
 * Layer 2 (WebGL): a tiny fragment-shader aurora flowing over layer 1 — the
 * "shader" layer. No dependencies; caps DPR at 1.5; pauses when the tab is
 * hidden; renders nothing under prefers-reduced-motion or when WebGL context
 * creation fails (layer 1 alone still reads as the design).
 *
 * Palette stays inside the documented hue grid: cobalt 255, cyan 197,
 * amber 78, rose 350 over ink background.
 */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 q){
  vec2 i = floor(q); vec2 f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float blob(vec2 uv, vec2 center, float radius){
  float d = length((uv - center) * vec2(u_res.x / u_res.y, 1.0));
  return smoothstep(radius, 0.0, d);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.05;

  // Drifting control points (aspect-corrected space)
  vec2 a = vec2(0.15 + 0.10 * sin(t * 1.3),        0.82 + 0.06 * cos(t * 0.9));
  vec2 b = vec2(0.85 + 0.08 * cos(t * 0.7),        0.88 + 0.05 * sin(t * 1.1));
  vec2 c = vec2(0.72 + 0.09 * sin(t * 0.6 + 2.0),  0.18 + 0.07 * cos(t * 0.8));
  vec2 d = vec2(0.28 + 0.07 * cos(t * 0.8 + 4.0),  0.12 + 0.06 * sin(t * 0.7));

  float gA = blob(uv, a, 0.55);
  float gB = blob(uv, b, 0.50);
  float gC = blob(uv, c, 0.52);
  float gD = blob(uv, d, 0.46);

  // Ink base + palette washes (kept dim: backdrop, not foreground)
  vec3 col = mix(vec3(0.055, 0.055, 0.075), vec3(0.10, 0.105, 0.135), uv.y);
  vec3 cobalt = vec3(0.16, 0.30, 0.95);
  vec3 cyan   = vec3(0.12, 0.62, 0.80);
  vec3 amber  = vec3(0.85, 0.58, 0.16);
  vec3 rose   = vec3(0.80, 0.22, 0.45);

  col = mix(col, cobalt, gA * 0.34);
  col = mix(col, cyan,   gB * 0.24);
  col = mix(col, amber,  gC * 0.20);
  col = mix(col, rose,   gD * 0.18);

  // Gentle luminance breathing from noise so it never feels static-flat
  float n = noise(uv * 3.0 + t * 0.6);
  col += (n - 0.5) * 0.035;

  // Dither against 8-bit banding
  float dith = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col + dith, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function SiteBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (reduce || !canvas) return;

    const gl =
      canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" }) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return; // CSS layers carry the design

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    let raf = 0;
    let running = true;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const frame = () => {
      if (!running) return;
      resize();
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        startFrame();
      } else {
        cancelAnimationFrame(raf);
      }
    };
    const startFrame = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };

    resize();
    startFrame();
    window.addEventListener("resize", onVisibility);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      // Lose the context explicitly — backdrops are long-lived pages.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div aria-hidden className="site-backdrop">
      {/* Layer 1: grid texture + static glows (always on, incl. no-JS) */}
      <div className="site-backdrop-glow" />
      <div className="site-backdrop-grid" />
      {/* Layer 2: shader aurora (progressive enhancement) */}
      <canvas ref={canvasRef} className="site-backdrop-canvas" />
    </div>
  );
}
