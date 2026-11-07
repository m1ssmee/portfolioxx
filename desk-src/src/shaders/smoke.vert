      attribute float aS;
      attribute float aSide;
      attribute float aSeed;
      uniform float uLife;
      uniform float uPx;         // pixels per mm at 1 mm distance (in the smoke target)
#include <smokeFlow>
#include <smokeLight>

      varying float vSide;
      varying float vB;
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying float vSeed;
      varying float vTwist;
      void main() {
        float age = pow(aS, 1.25) * uLife + 0.0005;
        float tb = uTime - age;
        vec3 vel;
        vec3 p = advect(age, aSeed, vel) + sway(tb, age);
        // the next vertex up the strand: the ribbon's real direction, and how far the smoke between
        // the two has been stretched (the same smoke over a longer path is thinner: where the eddies
        // stretch it, it fades; where they fold it, it gathers)
        float da = 1.25 * pow(max(aS, 0.002), 0.25) * uLife / SEGMENTS;
        vec3 vel2;
        vec3 p2 = advect(age + da, aSeed, vel2) + sway(tb - da, age + da);
        vec3 d = p2 - p;
        float len = length(d);
        float stretch = len / da;           // mm of ribbon per second of smoke
        vec3 view = normalize(uCam - p);
        vec3 T = len > 1e-4 ? d / len : normalize(vel);
        // a thread at first (always facing the eye), then a sheet that turns as it rises: seen
        // edge-on it is narrower and denser, which is what makes smoke look like smoke
        float twist = smoothstep(0.8, 2.6, age);
        vec3 face = normalize(cross(T, view) + vec3(1e-5));
        float tw = aSeed * 6.2832 + age * 0.85 + 0.8 * sin(tb * 0.37 + aSeed * 4.0);
        vec3 sheet = normalize(cross(T, vec3(cos(tw), 0.31, sin(tw))) + vec3(1e-5));
        sheet *= sign(dot(sheet, face) + 1e-4);
        vec3 across = normalize(mix(face, sheet, 0.8 * twist));
        float seen = length(across - view * dot(across, view));
        float w = mix(0.28, 4.6, smoothstep(0.25, 7.0, age)) * (0.7 + 0.6 * fract(aSeed * 7.13));
        // the stream's opacity shared between the strands; then the same smoke spread over the
        // ribbon's length and width
        float ink = (29.0 / max(stretch, 3.0)) * (0.28 / w);
        float a = (1.0 - pow(0.36, 1.0 / STRANDS)) * mix(1.0, min(ink, 0.55), smoothstep(0.3, 2.0, age)) * mix(1.0, 1.5, smoothstep(1.0, 4.0, age)) / max(seen, 0.4);
        // never under a pixel and a half wide (thinner would shimmer): the same ink, spread wider
        float vz = -(modelViewMatrix * vec4(p, 1.0)).z;
        float minW = 0.75 * max(vz, 1.0) / uPx;
        float hw = w * seen;
        a *= hw / max(hw, minW);
        p += (across * w + face * max(0.0, minW - hw)) * aSide;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vViewZ = -mv.z;
        vSide = aSide;
        vB = tb;
        vSeed = aSeed;
        vTwist = twist;
        vec4 em = hist(0.0, age);          // was the ember alive when this left it?
        float puff = hist(2.0, age).w;
        vAlpha = a * smoothstep(0.0, 0.012, aS) * (1.0 - smoothstep(0.45, 1.0, aS)) * em.w * (1.0 + 0.8 * puff);
        vLight = smokeLight(p);
      }
