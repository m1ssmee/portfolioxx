uniform vec3 uRimPos;      // the cool back light (a narrow spot): where it is, where it points, its cone
uniform vec3 uRimDir;
uniform vec2 uRimCone;     // (cos of the outer angle, cos of the inner)
uniform vec3 uKeyPos;
uniform vec3 uCam;
uniform float uBright;
uniform vec3 uEmberPos;
uniform float uEmberI;
// the light the smoke here sends towards the eye: mostly the back light, scattered forwards
// (Henyey-Greenstein: smoke lit from behind glows), a little of the key, the ember's own glow
vec3 smokeLight(vec3 p) {
  vec3 v = normalize(uCam - p);
  vec3 toP = normalize(p - uRimPos);
  float cone = smoothstep(uRimCone.x, uRimCone.y, dot(toP, uRimDir));
  float hg = 0.6156 / pow(1.3844 - 1.24 * dot(toP, v), 1.5);
  float hk = 0.91 / pow(1.09 - 0.6 * dot(normalize(p - uKeyPos), v), 1.5);
  vec3 e = p - uEmberPos;
  float ember = uEmberI / (1.0 + dot(e, e) * 0.04);
  return (vec3(0.75, 0.84, 1.0) * cone * hg * 0.36 + vec3(1.0, 0.82, 0.62) * hk * 0.05 + vec3(1.0, 0.42, 0.12) * ember * 0.5 + vec3(0.008, 0.01, 0.014)) * uBright;
}
