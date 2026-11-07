// the flow's turbulence: a baked, tileable curl-noise volume (8 noise units across, repeating), one
// fetch where an analytic curl took six noise evaluations
uniform sampler3D uCurl;
vec3 curl(vec3 p) { return texture(uCurl, p * 0.125).xyz; }
