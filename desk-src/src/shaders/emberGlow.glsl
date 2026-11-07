#include <valueNoise>
// the coal's glow at a point: orange-red at the core, deep red at the edges, slowly breathing
vec3 emberGlow(vec3 p, float t, float k) {
  float n = en(p * 1.6 + vec3(0.0, 0.0, t * 0.35)) * 0.65 + en(p * 4.2 - vec3(t * 0.6, 0.0, 0.0)) * 0.35;
  float heat = clamp(n * 1.25 - 0.18 + k * 0.25, 0.0, 1.0);
  vec3 deep = vec3(0.55, 0.04, 0.01);
  vec3 core = vec3(1.0, 0.33, 0.07);
  vec3 white = vec3(1.0, 0.62, 0.32);
  vec3 c = mix(deep, core, smoothstep(0.25, 0.75, heat));
  c = mix(c, white, smoothstep(0.85, 1.0, heat) * 0.5);
  return c * heat * heat;
}
