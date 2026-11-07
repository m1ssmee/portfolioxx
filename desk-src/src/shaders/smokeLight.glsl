uniform vec3 uKeyPos;
uniform vec3 uCam;
uniform float uBright;
uniform vec3 uEmberPos;
uniform float uEmberI;
// the smoke on a light ground: soft, slightly darker cool-grey wisps (what they hold back of the
// ground's light), lighter where they catch the key (scattered forwards, towards the eye), warm only
// just over the ember
vec3 smokeLight(vec3 p) {
  vec3 v = normalize(uCam - p);
  vec3 l = normalize(uKeyPos - p);
  float hk = 0.91 / pow(1.09 - 0.6 * dot(-l, v), 1.5);
  vec3 e = p - uEmberPos;
  float ember = uEmberI / (1.0 + dot(e, e) * 0.04);
  return (vec3(0.15, 0.165, 0.19) + vec3(0.2, 0.2, 0.19) * hk + vec3(1.0, 0.42, 0.12) * ember * 0.35) * uBright;
}
