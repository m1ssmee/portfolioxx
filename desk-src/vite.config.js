import { defineConfig } from 'vite'

/** GLSL, minified: comments and insignificant whitespace go; preprocessor lines keep their own lines. */
function minifyGlsl(src) {
  const out = []
  for (let line of src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')) {
    line = line.replace(/\/\/.*$/, '').trim()
    if (!line) continue
    if (line.startsWith('#')) out.push('\n' + line.replace(/\s+/g, ' ') + '\n')
    else out.push(line.replace(/\s+/g, ' ').replace(/\s*([{}()\[\];,=+\-*/<>!?:&|^%])\s*/g, '$1') + ' ')
  }
  // (no trim: a part of a template literal may begin with a directive, which must start its line)
  return out.join('').replace(/\n+/g, '\n').replace(/ \n/g, '\n')
}
/** The same inside JS: every template literal tagged with a /* glsl *\/ comment, around its ${} parts. */
function minifyTagged(code) {
  return code.replace(/\/\* glsl \*\/\s*`([^`]*)`/g, (m, body) => {
    const parts = body.split(/(\$\{[^}]*\})/)
    const min = parts.map((p) => (p.startsWith('${') ? p : minifyGlsl(p).replace(/\\(?![nt$`\\])/g, '\\\\')))
    return '`' + min.join('') + '`'
  })
}

function glsl() {
  let build = false
  return {
    name: 'glsl-minify',
    enforce: 'pre',
    configResolved(c) {
      build = c.command === 'build'
    },
    transform(code, id) {
      const file = id.split('?')[0]
      if (/\.(glsl|vert|frag)$/.test(file)) return { code: `export default ${JSON.stringify(build ? minifyGlsl(code).trim() : code)}`, map: null }
      if (build && /\/src\/.*\.js$/.test(file) && code.includes('/* glsl */')) return { code: minifyTagged(code), map: null }
      return null
    },
  }
}

/**
 * The loader's list of everything to fetch before entry (index.html: window.__assets): every chunk,
 * the worker and the font, with their sizes, the scene first. The page's own entry is not in it (it
 * is the loader), nor the poster (the fallback's); the debug overlay is marked (fetched only with
 * ?debug). Every file is content-hashed: it can be cached for good.
 */
function assetManifest() {
  return {
    name: 'asset-manifest',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const list = []
        for (const [file, o] of Object.entries(ctx.bundle || {})) {
          // (not the page's entry, which is the loader; not the poster, shown only if the scene fails)
          if (file.endsWith('.html') || (o.type === 'chunk' && o.isEntry) || /poster/.test(file)) continue
          const bytes = o.type === 'chunk' ? Buffer.byteLength(o.code) : o.source.length
          list.push({ u: './' + file, b: bytes, ...(/overlay/.test(file) ? { d: 1 } : {}) })
        }
        const rank = (f) => (/scene/.test(f.u) ? 0 : /worker/.test(f.u) ? 1 : 2)
        list.sort((a, b) => rank(a) - rank(b) || b.b - a.b)
        return { html, tags: [{ tag: 'script', children: `window.__assets=${JSON.stringify(list)}`, injectTo: 'head' }] }
      },
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [glsl(), assetManifest()],
  worker: { format: 'es' },
  build: {
    target: ['es2020', 'safari15'],
    outDir: '../desk',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 900,
  },
  esbuild: { legalComments: 'none', drop: ['debugger'] },
})
