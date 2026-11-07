      attribute vec4 aSeed;
      uniform float uHazeLife;
      uniform float uPx;
#include <smokeFlow>
#include <smokeLight>

      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying vec2 vSeed;
      void main() {
        // (the haze starts a little way up, where the stream has already broken up)
        float age = mod(uTime + aSeed.x * uHazeLife, uHazeLife) + 3.6;
        float tb = uTime - age;
        vec3 vel;
        vec3 p = advect(age, aSeed.y * 1.3, vel) + sway(tb, age);
        // the plume diffusing into the room: each mote drifts out from it as it rises
        float th = aSeed.z * 6.2832;
        vec3 dir = vec3(cos(th), (aSeed.w - 0.5) * 0.7, sin(th)) * sqrt(fract(aSeed.w * 7.31 + aSeed.z));
        p += dir * (4.0 + 3.4 * (age - 3.6));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vViewZ = -mv.z;
        float size = mix(18.0, 50.0, smoothstep(3.6, 15.6, age)) * (0.7 + 0.6 * fract(aSeed.z * 13.7));
        gl_PointSize = size * uPx / vViewZ;
        float life = (age - 3.6) / uHazeLife;
        vAlpha = 0.0028 * HAZE_K * smoothstep(0.0, 0.3, life) * (1.0 - smoothstep(0.45, 1.0, life)) * hist(0.0, age).w;
        vLight = smokeLight(p);
        vSeed = aSeed.zw;
      }
