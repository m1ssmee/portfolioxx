varying vec2 vUv; void main() { vUv = uv; vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); c.xy += position.xy; gl_Position = projectionMatrix * c; }
