uniform sampler2D uDepthZ;  // the scene's linear depth (mm) at the smoke's own resolution
uniform vec2 uRes;          // the smoke target's size
// soft against the scene: fades out as it nears whatever is behind it, gone behind it
float depthFade(float viewZ) {
  float scene = texture2D(uDepthZ, gl_FragCoord.xy / uRes).r;
  return clamp((scene - viewZ) / 4.0, 0.0, 1.0);
}
float h1(float n) { return fract(sin(n) * 43758.5453); }
float vnoise(vec2 x) {
  vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 57.0;
  return mix(mix(h1(n), h1(n + 1.0), f.x), mix(h1(n + 57.0), h1(n + 58.0), f.x), f.y);
}
