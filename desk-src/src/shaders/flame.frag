uniform float uTime; uniform float uFlame; uniform float uSeed;
varying vec2 vUv;
float h1(float n) { return fract(sin(n) * 43758.5453); }
float vn(vec2 x) { vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f); float n = i.x + i.y * 57.0;
  return mix(mix(h1(n), h1(n + 1.0), f.x), mix(h1(n + 57.0), h1(n + 58.0), f.x), f.y); }
void main() {
  // x across (-1..1), y up (0 at the burner, 1 at the tip)
  vec2 q = vec2(vUv.x * 2.0 - 1.0, vUv.y);
  float t = uTime;
  // layered flicker: the flame's edge wobbles, more towards the tip
  float w = (vn(vec2(q.y * 3.0 - t * 7.0, uSeed * 9.0)) - 0.5) * 0.35 + (vn(vec2(q.y * 7.0 - t * 13.0, 3.1)) - 0.5) * 0.15;
  q.x += w * q.y * q.y;
  // a teardrop: round at the base, drawn to a soft point at the tip
  float r = mix(0.42, 0.04, pow(q.y, 0.85)) * smoothstep(0.0, 0.14, q.y) + 0.04;
  float d = abs(q.x) / r;
  float body = smoothstep(1.0, 0.25, d) * smoothstep(1.02, 0.86, q.y);
  // blue at the base, translucent; a clear core; soft yellow-orange towards the tip
  float base = smoothstep(0.32, 0.02, q.y) * smoothstep(1.0, 0.45, d);
  float core = smoothstep(0.55, 0.0, d) * smoothstep(0.1, 0.35, q.y) * smoothstep(0.75, 0.4, q.y);
  float tip = smoothstep(0.18, 0.7, q.y);
  vec3 col = vec3(0.25, 0.45, 1.6) * base * 0.9;
  col += vec3(1.9, 0.95, 0.32) * body * tip * (1.0 - 0.75 * core);
  col += vec3(1.2, 0.55, 0.18) * body * (1.0 - tip) * (1.0 - base) * 0.6;
  col *= uFlame;
  // its alpha: how much of what is behind it the flame hides (premultiplied over): the yellow body
  // nearly all, the blue base a little; it also adds to the bloom mask (over anything drawn it rises
  // above 1, so it blooms)
  float a = clamp(body * (0.5 + 0.45 * tip) * (1.0 - 0.35 * core) + base * 0.3, 0.0, 1.0) * uFlame;
  gl_FragColor = vec4(col, a);
}
