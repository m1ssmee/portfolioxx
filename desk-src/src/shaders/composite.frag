      uniform sampler2D tScene; uniform sampler2D tDepth;
      uniform sampler2D tDofStat; uniform sampler2D tDofEmb; uniform sampler2D tDofLive; uniform float uDofK; uniform vec4 uBox; uniform float uI;
      uniform float uFocus; uniform float uEq; uniform float uK; uniform float uMaxC;
      uniform sampler2D tSmoke; uniform sampler2D tSmokeZ; uniform vec2 uSmokeSize;
      uniform sampler2D tBloom; uniform vec4 uBloomBox; uniform float uAspect;
      uniform sampler2D tStat; uniform sampler2D tEmb; uniform vec4 uLiveA; uniform vec4 uLiveB;
      uniform vec4 uShim; uniform float uT;
      varying vec2 vUv;
#include <linearDepth>

      #include <tonemapping_pars_fragment>
      // the smoke, upsampled: of the four texels around this pixel, those at this pixel's depth
      // (no halo of smoke from behind the cigarette over its edge, nor the other way round)
      vec4 smokeAt(vec2 uv, float z) {
        // (no smoke anywhere near this pixel: nothing to weigh. A bilinear sample of a non-negative
        // texture is zero only when all four texels are, so this is exact, and it is most pixels)
        vec4 near = texture2D(tSmoke, uv);
        if (near.a < 0.0005) return near;
        vec2 st = uv * uSmokeSize - 0.5;
        vec2 f = fract(st);
        vec2 b = (floor(st) + 0.5) / uSmokeSize;
        vec2 o = 1.0 / uSmokeSize;
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
      bool inBox(vec2 p, vec4 b) { return p.x >= b.x && p.y >= b.y && p.x <= b.z && p.y <= b.w; }
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
        // (the scene: the live frame where it is this frame's own; elsewhere in a still frame, the
        // cache's two frames mixed by the ember's glow)
        vec3 c;
        if (inBox(suv, uLiveA) || inBox(suv, uLiveB)) c = textureLod(tScene, suv, 0.0).rgb;
        else c = textureLod(tStat, suv, 0.0).rgb + uI * textureLod(tEmb, suv, 0.0).rgb;
        float z0 = linZ(texture2D(tDepth, vUv).r);
        if (uDofK > 0.0) {
          // (taken only where the lens blurs, by this pixel's own circle: in focus, the frame's own
          // pixels, exactly, and the blurred frames are not read at all)
          float dz = z0 - uFocus;
          float cc = min(uK * abs(dz) / max(uEq + dz, 1.0), uMaxC);
          float k = uDofK * smoothstep(0.6, 2.2, cc);
          if (k > 0.0) {
            vec3 d;
            if (inBox(vUv, uBox)) d = textureLod(tDofLive, vUv, 0.0).rgb;
            else d = textureLod(tDofStat, vUv, 0.0).rgb + uI * textureLod(tDofEmb, vUv, 0.0).rgb;
            c = mix(c, d, k);
          }
        }
        vec4 s = smokeAt(vUv, z0);
        c = c * (1.0 - s.a) + s.rgb;
        if (inBox(vUv, uBloomBox)) c += textureLod(tBloom, vUv, 0.0).rgb;
        // (a product shot's tone curve: colours as they are, the light parts compressed, never clipped)
        c = NeutralToneMapping(c);
        vec4 o = sRGBTransferOETF(vec4(c, 1.0));
        // (a still dither, a level either way at most: no banding in the soft ground, and nothing
        // that crawls from frame to frame)
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        o.rgb += (n - 0.5) * (1.6 / 255.0);
        gl_FragColor = o;
      }
