// value noise, smooth, in 3D (a hash per lattice point, blended with smoothstep weights)
float eh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float en(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(eh(i), eh(i + vec3(1, 0, 0)), f.x), mix(eh(i + vec3(0, 1, 0)), eh(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(eh(i + vec3(0, 0, 1)), eh(i + vec3(1, 0, 1)), f.x), mix(eh(i + vec3(0, 1, 1)), eh(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
