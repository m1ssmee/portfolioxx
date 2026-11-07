
#include <depthFade>

      varying float vSide;
      varying float vB;
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying float vSeed;
      varying float vTwist;
      float sq(float x) { return x * x; }
      void main() {
        // across: a smooth thread near the ember; higher up, a few fine filaments that braid
        // (they travel with the smoke: they are functions of when it left the ember)
        float s = vSide;
        float thread = exp(-s * s * 3.0);
        float b = vB;
        float fil = exp(-sq((s - 0.42 * sin(b * 1.7 + vSeed * 5.0)) * 2.4))
                  + 0.8 * exp(-sq((s + 0.5 * sin(b * 1.1 + vSeed * 3.0 + 1.0)) * 3.2))
                  + 0.6 * exp(-sq((s - 0.15 * cos(b * 2.6 + vSeed * 7.0)) * 5.0));
        fil = min(fil, 1.3) * (1.0 - s * s);
        float prof = mix(thread, fil, vTwist);
        // along: denser and thinner stretches, carried up with it
        float along = 0.55 + 0.45 * vnoise(vec2(b * 3.1 + vSeed * 9.0, s * 1.3 + vSeed * 3.0));
        float a = vAlpha * prof * mix(1.0, along, vTwist);
        a *= depthFade(vViewZ);
        if (a < 0.0015) discard;
        // bluish where thin, greyer where dense
        vec3 col = vLight * mix(vec3(0.9, 0.94, 1.0), vec3(0.97), clamp(a * 3.0, 0.0, 1.0));
        gl_FragColor = vec4(col * a, a);
      }
