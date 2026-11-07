uniform sampler2D tColor; uniform sampler2D tDepth; uniform float uFocus; uniform float uEq; uniform float uK; uniform vec2 uTexel; uniform float uMax; varying vec2 vUv;
#include <linearDepth>

      // (drawn at half the frame's size, its circles measured in the frame's own pixels, and
      // upsampled by the composite only where the lens blurs. The samples lie on one golden-angle
      // spiral, the same at every pixel: no per-pixel noise to crawl over the picture as it moves)
      float coc(vec2 uv) { float d = linZ(texture2D(tDepth, uv).r) - uFocus; return min(uK * abs(d) / max(uEq + d, 1.0), uMax); }
      void main() {
        float c0 = coc(vUv);
        vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.0;
        float reach = max(c0, uMax * 0.5);
        for (int i = 1; i < 48; i++) {
          float r = sqrt(float(i) / 48.0) * reach;
          float a = float(i) * 2.39996;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
          float ci = coc(uv);
          float w = smoothstep(r - 1.0, r + 1.0, max(ci, c0 * 0.6)) * step(r, max(ci, c0) + 1.0);
          acc += texture2D(tColor, uv).rgb * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.0);
      }
