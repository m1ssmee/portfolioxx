uniform sampler2D tColor; uniform sampler2D tDepth; varying vec2 vUv; void main() { gl_FragColor = texture2D(tColor, vUv); gl_FragDepth = texture2D(tDepth, vUv).r; }
