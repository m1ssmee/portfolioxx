uniform sampler2D tDepth; varying vec2 vUv;
#include <linearDepth>
void main() { gl_FragColor = vec4(linZ(texture2D(tDepth, vUv).r), 0.0, 0.0, 1.0); }
