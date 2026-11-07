      uniform sampler2D tScene; uniform sampler2D tDepth;
      uniform sampler2D tDofStat; uniform sampler2D tDofEmb; uniform sampler2D tDofLive; uniform float uDofK; uniform vec4 uBox; uniform float uI;
      uniform sampler2D tSmoke; uniform sampler2D tSmokeZ; uniform vec2 uSmokeSize;
      uniform sampler2D tBloom; uniform float uAspect;
      uniform vec4 uShim; uniform float uT;
      uniform float seed;
      varying vec2 vUv;
#include <linearDepth>

      #include <tonemapping_pars_fragment>
      // the smoke, upsampled: of the four texels around this pixel, those at this pixel's depth
      // (no halo of smoke from behind the cigarette over its edge, nor the other way round)
      vec4 smokeAt(vec2 uv) {
        vec2 st = uv * uSmokeSize - 0.5;
        vec2 f = fract(st);
        vec2 b = (floor(st) + 0.5) / uSmokeSize;
        vec2 o = 1.0 / uSmokeSize;
        float z = linZ(texture2D(tDepth, uv).r);
        vec4 acc = vec4(0.0); float wsum = 0.0;
        float best = 1e9; vec4 nearest = vec4(0.0);
        for (int k = 0; k < 4; k++) {
          vec2 q = vec2(float(k - (k / 2) * 2), float(k / 2));
          vec2 tuv = b + q * o;
          float zi = texture2D(tSmokeZ, tuv).r;
          vec4 si = texture2D(tSmoke, tuv);
          float wb = mix(1.0 - f.x, f.x, q.x) * mix(1.0 - f.y, f.y, q.y);
          float dz = abs(zi - z);
          float w = wb / (1.0 + dz * dz / max(0.0004 * z * z, 1e-4));
          acc += si * w; wsum += w;
          if (dz < best) { best = dz; nearest = si; }
        }
        // (all four agree: plain bilinear; across an edge: the nearest in depth)
        return best < 0.02 * z ? acc / max(wsum, 1e-5) : nearest;
      }
      void main() {
        vec2 suv = vUv;
        if (uShim.z > 0.0) {
          // heat shimmer over the flame (high tier): the picture above it refracted by rising air,
          // a column that wavers, strongest just above the tip, gone a few centimetres higher
          vec2 q = (vUv - uShim.xy) * vec2(uAspect, 1.0) / uShim.w;
          float m = exp(-q.x * q.x * 3.0) * smoothstep(-0.25, 0.25, q.y) * exp(-max(q.y, 0.0) * 1.1);
          vec2 w = vec2(sin(q.y * 11.0 - uT * 13.0 + sin(q.x * 7.0 + uT * 3.0) * 1.5), cos(q.y * 8.0 - uT * 10.0 + q.x * 4.0));
          suv += w * m * uShim.z * uShim.w * 0.045 * vec2(1.0 / uAspect, 1.0);
        }
        vec3 c = texture2D(tScene, suv).rgb;
        if (uDofK > 0.0) {
          bool inBox = vUv.x >= uBox.x && vUv.y >= uBox.y && vUv.x <= uBox.z && vUv.y <= uBox.w;
          vec3 d = inBox ? texture2D(tDofLive, vUv).rgb : texture2D(tDofStat, vUv).rgb + uI * texture2D(tDofEmb, vUv).rgb;
          c = mix(c, d, uDofK);
        }
        vec4 s = smokeAt(vUv);
        c = c * (1.0 - s.a) + s.rgb;
        c += texture2D(tBloom, vUv).rgb;
        // (a product shot's tone curve: colours as they are, the light parts compressed, never clipped)
        c = NeutralToneMapping(c);
        vec4 o = sRGBTransferOETF(vec4(c, 1.0));
        // (a still dither, a level either way at most: no banding in the soft ground, and nothing
        // that crawls from frame to frame)
        float n = fract(sin(dot(gl_FragCoord.xy + seed * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
        o.rgb += (n - 0.5) * (1.6 / 255.0);
        gl_FragColor = o;
      }
