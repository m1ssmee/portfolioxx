uniform float uFlame;
varying vec2 vUv;
void main() {
  vUv = uv;
  // the card stands on the burner along the object's own y (bent and stretched in its
  // matrix), and turns about that axis to face the camera
  vec3 up = normalize((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float len = length((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  vec3 toCam = normalize(cameraPosition - base);
  vec3 side = normalize(cross(up, toCam) + vec3(1e-5));
  vec3 p = base + side * position.x * 7.5 * (0.6 + 0.4 * uFlame) + up * (position.y * 24.0 * len * uFlame);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
