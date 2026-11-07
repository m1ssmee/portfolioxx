uniform float uTime;
uniform sampler2D uHist;       // rows: 0 emitter (xyz, alive), 1 pointer (xyz, strength), 2 pointer velocity (xyz), puff
uniform float uHistHead;       // the current slot
uniform vec3 uViewDir;         // camera forward (for the pointer's swirl axis)
uniform float uCalm;           // 1, or less when motion is reduced
#include <smokeNoise>

vec4 hist(float row, float t) {
  // t: seconds ago; (the history is a ring, read with linear filtering along it)
  float slot = uHistHead - t * $HZ;
  return texture2D(uHist, vec2((mod(slot, $HISTORY) + 0.5) / $HISTORY, (row + 0.5) / 3.0));
}
// the velocity of smoke at p that left the ember at time tb and is now a seconds old
vec3 flow(vec3 p, float tb, float a, float seed) {
  float tt = tb + a;
  float ago = uTime - tt;
  // buoyant rise, slowing as it mixes with the air
  vec3 v = vec3(0.0, 24.0 * exp(-a * 0.42) + 5.0, 0.0);
  // laminar for the first few centimetres, then unstable: the plume's own eddies (shared by every
  // strand, so they rise as one stream), then each strand's finer detail (so they part)
  float turb = smoothstep(0.75, 2.3, a) * uCalm;
  v += curl(p * 0.035 + vec3(0.0, -tt * 0.09, 0.0)) * (6.5 * turb);
  v += curl(p * 0.065 + vec3(seed * 3.7, -tt * 0.15, seed * 2.3)) * (2.4 * turb * turb);
  // the room's slow drift, and now and then a slow eddy across it
  vec2 dd = vec2(cos(tt * 0.031 + 0.8), sin(tt * 0.031 + 0.8));
  float gust = pow(max(0.0, sin(tt * 0.11 + 1.3 * sin(tt * 0.037))), 8.0);
  v.xz += (dd * (1.1 + 0.7 * sin(tt * 0.07)) + vec2(-dd.y, dd.x) * gust * 5.0) * mix(0.35, 1.0, turb);
  // the pointer, where it was then: a swirl round it and a push along its motion
  vec4 ptr = hist(1.0, ago);
  vec4 pv = hist(2.0, ago);
  if (ptr.w > 0.001) {
    vec3 r = p - ptr.xyz;
    float fall = exp(-dot(r, r) / 420.0);
    v += ptr.w * fall * (pv.xyz * 0.5 + cross(uViewDir, r) * 3.0);
  }
  // a flick shakes it
  return v * (1.0 + 0.6 * pv.w * turb);
}
// where the smoke that left the ember "age" seconds ago is now (steps shorter where it is fast and
// where the instability starts)
vec3 advect(float age, float seed, out vec3 vel) {
  float tb = uTime - age;
  vec3 p = hist(0.0, age).xyz;
  vel = vec3(0.0, 1.0, 0.0);
  float a0 = 0.0;
  for (int i = 1; i <= STEPS; i++) {
    float f = float(i) / float(STEPS);
    float a1 = age * f * sqrt(f);
    vel = flow(p, tb, 0.5 * (a0 + a1), seed);
    p += vel * (a1 - a0);
    a0 = a1;
  }
  return p;
}
// the instability: a sideways wave that grows a few centimetres up and travels up the stream
vec3 sway(float tb, float age) {
  float A = 4.0 * smoothstep(0.4, 1.4, age) * (0.55 + 0.45 * sin(tb * 0.23 + 1.0)) * uCalm;
  float ph = tb * 9.4 + 1.6 * sin(tb * 0.31) + 0.9 * sin(tb * 0.83 + 2.0);
  float th = tb * 0.17 + 0.8 * sin(tb * 0.11);
  return vec3(cos(th), 0.0, sin(th)) * (A * sin(ph));
}
