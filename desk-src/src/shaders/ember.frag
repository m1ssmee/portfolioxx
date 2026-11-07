#include <emberGlow>

      uniform float uTime; uniform float uEmber; uniform float uLit; uniform float uFade; uniform float uLightProg;
      varying vec3 vP; varying vec3 vN;
      void main() {
        // (being lit: glowing specks round the rim, spreading inwards until they join; until then
        // only the specks are drawn, over the cut tobacco)
        float sp = en(vec3(atan(vP.z, -vP.y) * 3.0, length(vP.yz) * 1.5, 7.0)) + 0.25 * smoothstep(3.9, 0.5, length(vP.yz));
        float lm = smoothstep(sp - 0.08, sp + 0.08, uLightProg * 1.4 - 0.1);
        if (lm < 0.02) discard;
        vec3 c = emberGlow(vP, uTime, uEmber - 1.0) * (4.0 + 12.0 * uEmber) * max(uLit, 0.55 * uLightProg) * lm;
        // where the glow dies the coal is charcoal-dark
        vec3 dark = vec3(0.025, 0.018, 0.016);
        gl_FragColor = vec4((dark + c) * uFade, 2.0); // (alpha above 1: blooms)
      }
