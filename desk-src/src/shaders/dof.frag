uniform sampler2D tColor; uniform sampler2D tDepth; uniform float uFocus; uniform float uEq; uniform float uK; uniform vec2 uTexel; uniform float uMax; varying vec2 vUv;
#include <linearDepth>

      // (at the frame's own size, its circles in the frame's pixels; the samples on one golden-angle
      // spiral, the same at every pixel, so nothing crawls as the picture moves. A sample counts
      // only as a lens would let it: something nearer spreads by its own circle, so a sharp edge in
      // front stays sharp and does not smear over the blur behind it; something farther spreads no
      // more than this pixel's circle, so the blur behind never creeps over what is in front)
      float zOf(vec2 uv) { return linZ(texture2D(tDepth, uv).r); }
      float cocAt(float z) { float d = z - uFocus; return min(uK * abs(d) / max(uEq + d, 1.0), uMax); }
      void main() {
        float z0 = zOf(vUv);
        float c0 = cocAt(z0);
        vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.0;
        float reach = max(c0, uMax * 0.5);
        for (int i = 1; i < 36; i++) {
          float r = sqrt(float(i) / 36.0) * reach;
          float a = float(i) * 2.39996;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
          float zi = zOf(uv);
          float ci = cocAt(zi);
          float cover = zi < z0 ? ci : min(ci, c0);
          float w = smoothstep(r - 1.0, r + 1.0, cover);
          acc += texture2D(tColor, uv).rgb * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.0);
      }
