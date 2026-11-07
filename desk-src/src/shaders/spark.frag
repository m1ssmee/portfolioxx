uniform float uSpark; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; float k = uSpark * exp(-r * r * 9.0); gl_FragColor = vec4(vec3(1.6, 1.4, 1.0) * k, k); }
