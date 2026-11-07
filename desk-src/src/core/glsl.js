// The shaders are files (src/shaders). Some take parts: a shared chunk where an `#include <name>`
// line stands (three.js's own includes are left alone), and a number from the code where `$NAME`
// stands.
export function glsl(src, parts) {
  return src.replace(/^[ \t]*#include <(\w+)>[ \t]*$/gm, (m, k) => (k in parts ? parts[k] : m)).replace(/\$([A-Z]\w*)/g, (m, k) => (k in parts ? String(parts[k]) : m))
}
