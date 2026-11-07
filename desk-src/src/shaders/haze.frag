
#include <depthFade>

      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying vec2 vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r2 = dot(c, c) * 4.0;
        if (r2 > 1.0) discard;
        // a soft blob, its edge eaten by noise: never a circle
        // (eaten by noise all the way in: wisps, never a disc)
        float n = vnoise(c * 2.6 + vSeed * 40.0) * 0.6 + vnoise(c * 5.5 + vSeed.yx * 40.0) * 0.4;
        float a = vAlpha * (1.0 - r2) * (1.0 - r2) * smoothstep(0.3, 0.8, n);
        a *= depthFade(vViewZ);
        if (a < 0.0008) discard;
        a = min(1.0, a * 1.5);
        vec3 col = vLight * vec3(1.06, 1.08, 1.12);
        gl_FragColor = vec4(col * a, a);
      }
