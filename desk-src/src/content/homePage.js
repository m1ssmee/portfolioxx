// The laptop's two tabs, as real pages (up close each is an iframe laid over the screen: scene.js).
// Built from portfolio.ts. Pages of their own (srcdoc), so their styles touch nothing else; they
// talk to the desk by postMessage:
//   { desk: 'site', id }  show that project's site on the monitor
//   { desk: 'key', key }  a key the desk wants (Escape: step back from the laptop)
// From across the room the screen shows laptopScreen.js's drawings of the same pages.
//   homeHtml: the portfolio, a plain page: the name, the bio, the links, the projects as a list
//             (each opens its write-up: what it is, what was built, what was hard, the stack, the
//             ways in).
//   githubHtml: the GitHub profile's repositories (the projects' own, at once; the live list from
//             GitHub's API when it answers).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Which projects are sites the monitor shows (a live site, or one run locally). */
export const isSite = (p) => !!(p.live || p.local)
/** The GitHub user from the profile link. */
export const githubUser = (C) => (C.links.github || '').replace(/\/+$/, '').split('/').pop() || ''

const fontFace = (fontUrl) => (fontUrl ? `@font-face{font-family:Inter;src:url(${JSON.stringify(fontUrl)});font-weight:100 900;font-display:block}` : '')
const ESC_SCRIPT = `document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !window.__back?.()) parent.postMessage({ desk: 'key', key: 'Escape' }, '*') })`

/** The page's serif (system faces: no download), and its numbers' figures. */
export const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif"

/** The portfolio, one HTML document: a plain page, one column, in the system's serif. */
export function homeHtml(C) {
  const P = C.projects
  const ways = (p) =>
    [isSite(p) && `<button class="a" data-site="${esc(p.id)}">see it on the monitor</button>`, p.live && `<a href="${esc(p.live)}" target="_blank" rel="noopener">the site</a>`, p.github && `<a href="${esc(p.github)}" target="_blank" rel="noopener">the code</a>`]
      .filter(Boolean)
      .join(' · ')
  const item = (p) => `
    <li><button class="a name" data-open="${esc(p.id)}">${esc(p.name)}</button> <span class="yr">${esc(p.year)}</span>
      <p>${esc(p.oneLiner)}</p></li>`
  const detail = (p, i) => `
    <article class="view" data-view="${esc(p.id)}" hidden>
      <p class="nav"><button class="a" data-back>← all projects</button></p>
      <h1>${esc(p.name)}</h1>
      <p class="sub">${esc(p.oneLiner)}</p>
      <p class="ways">${ways(p)}</p>
      ${p.whatItIs ? `<h2>What it is</h2><p>${esc(p.whatItIs)}</p>` : ''}
      ${p.whatIBuilt ? `<h2>What I built</h2><p>${esc(p.whatIBuilt)}</p>` : ''}
      ${p.challenges.length ? `<h2>What was hard</h2><ul>${p.challenges.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${p.stack.length ? `<p class="built">Built with ${esc(p.stack.slice(0, -1).join(', '))}${p.stack.length > 1 ? ' and ' : ''}${esc(p.stack[p.stack.length - 1])}. ${esc(p.year)}.</p>` : ''}
      <p class="nav pn">${i > 0 ? `<button class="a" data-open="${esc(P[i - 1].id)}">← ${esc(P[i - 1].name)}</button>` : '<span></span>'}${i < P.length - 1 ? `<button class="a" data-open="${esc(P[i + 1].id)}">${esc(P[i + 1].name)} →</button>` : ''}</p>
    </article>`
  const links = [C.email && ['email', `mailto:${C.email}`], C.links.github && ['GitHub', C.links.github], C.links.linkedin && ['LinkedIn', C.links.linkedin], C.links.x && ['X', C.links.x]].filter(Boolean)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(C.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{background:#faf8f4;color:#1f1e1c;font:400 21px/1.62 ${SERIF};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
main{max-width:720px;margin:0 auto;padding:84px 32px 96px}
h1{font-size:36px;line-height:1.2;font-weight:700;letter-spacing:-.005em}
.role{color:#6f6a62;font-style:italic;margin-top:2px}
.intro{margin-top:28px}
h2{font-size:21px;font-weight:700;margin:44px 0 10px}
a,.a{color:#1f1e1c;text-decoration:underline;text-decoration-color:#b9b2a6;text-underline-offset:3px;text-decoration-thickness:1px;font:inherit;background:none;border:0;cursor:pointer;padding:0}
a:hover,.a:hover{text-decoration-color:#1f1e1c}
.links{margin-top:18px;color:#6f6a62}
ul.work{list-style:none;margin-top:6px}
ul.work li{padding:16px 0;border-top:1px solid #e7e2d9}
ul.work li:last-child{border-bottom:1px solid #e7e2d9}
.name{font-weight:700}
.yr{color:#8d877d;font-size:17px;margin-left:6px}
ul.work p{color:#4b4740;margin-top:2px}
.nav{font-size:18px;color:#6f6a62}
.view>h1{margin-top:36px}
.sub{font-style:italic;color:#4b4740;margin-top:6px}
.ways{margin-top:14px;font-size:18px;color:#6f6a62}
article ul{padding-left:22px}
article ul li{margin-top:8px}
.built{margin-top:40px;color:#6f6a62;font-size:18px}
.pn{display:flex;justify-content:space-between;margin-top:56px;padding-top:18px;border-top:1px solid #e7e2d9}
footer{margin-top:72px;color:#8d877d;font-size:16px}
:focus-visible{outline:2px solid #1f1e1c;outline-offset:3px}
</style></head><body>
<main>
  <div class="view" data-view="home">
    <h1>${esc(C.name)}</h1>
    <p class="role">${esc(C.role.replace(/\s*·\s*builder$/i, ''))}</p>
    <p class="intro">${esc(C.bio)}</p>
    <p class="links">${links.map(([t, u]) => `<a href="${esc(u)}"${u.startsWith('mailto') ? '' : ' target="_blank" rel="noopener"'}>${esc(t)}</a>`).join(' · ')}</p>
    <h2>Projects</h2>
    <ul class="work">${P.map(item).join('')}</ul>
    <footer>${new Date().getFullYear()}. The sites run on the monitor behind this laptop.</footer>
  </div>
  ${P.map(detail).join('')}
</main>
<script>
  const views = [...document.querySelectorAll('.view')]
  const show = (name) => { for (const v of views) v.hidden = v.dataset.view !== name; window.scrollTo(0, 0) }
  window.__back = () => { const v = views.find((x) => !x.hidden); if (!v || v.dataset.view === 'home') return false; show('home'); return true }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open],[data-back],[data-site]')
    if (!t) return
    if (t.dataset.open) show(t.dataset.open)
    else if (t.hasAttribute('data-back')) show('home')
    else if (t.dataset.site) parent.postMessage({ desk: 'site', id: t.dataset.site }, '*')
  })
  ${ESC_SCRIPT}
</script>
</body></html>`
}

/**
 * The GitHub tab: the profile's repositories. At once, those the portfolio links to (its projects);
 * then, if GitHub's API answers, the profile's own list (newest first, with language and stars).
 */
export function githubHtml(C, fontUrl) {
  const user = githubUser(C)
  const known = C.projects.filter((p) => p.github).map((p) => ({ name: p.github.replace(/\/+$/, '').split('/').pop(), description: p.oneLiner, html_url: p.github, language: p.stack[0] || '', stargazers_count: null, pushed_at: null }))
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(user)}: repositories</title>
<style>
${fontFace(fontUrl)}
:root{--bg:#f6f7f9;--card:#fff;--ink:#1d2127;--sub:#59616d;--faint:#8a919c;--line:#e1e4e8;--blue:#2f6fdf}
*{box-sizing:border-box;margin:0;padding:0}
html{background:var(--bg);color:var(--ink);font:400 15px/1.55 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 56px}
.top{height:58px;border-bottom:1px solid var(--line);background:#fff}
.top .wrap{display:flex;align-items:center;justify-content:space-between;height:58px;color:var(--sub);font-size:14px}
.top b{color:var(--ink);font-weight:650}
.page{display:grid;grid-template-columns:280px 1fr;gap:48px;padding:40px 0 64px}
.av{width:220px;height:220px;border-radius:50%;background:linear-gradient(140deg,#2b3340,#11151b);display:grid;place-items:center;color:#f0b46a;font-size:76px;font-weight:700;letter-spacing:-.04em;border:1px solid var(--line)}
.who h1{font-size:26px;letter-spacing:-.02em;margin-top:20px;line-height:1.2}
.who p{color:var(--sub);font-size:18px}
.who .bio{font-size:15px;color:var(--ink);margin-top:14px;line-height:1.6}
.open{display:flex;align-items:center;justify-content:center;gap:8px;height:40px;margin-top:20px;border:1px solid #d0d5dc;border-radius:8px;background:#fff;font-weight:600;font-size:14px}
.open:hover{background:#f3f4f6}
.tabs{display:flex;gap:26px;border-bottom:1px solid var(--line);margin-bottom:18px}
.tabs span{padding:10px 2px;font-weight:600;border-bottom:2px solid var(--ink)}
.tabs i{font-style:normal;background:#e9ebef;border-radius:999px;padding:1px 8px;font-size:12px;margin-left:6px;color:var(--sub)}
.repos{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.repo{display:flex;flex-direction:column;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;min-height:132px;transition:border-color .15s,box-shadow .15s}
.repo:hover{border-color:#c4cad2;box-shadow:0 6px 18px rgba(20,30,50,.06)}
.repo b{color:var(--blue);font-size:16px;font-weight:650}
.repo span.pub{font-size:11.5px;border:1px solid var(--line);border-radius:999px;padding:0 8px;color:var(--sub);margin-left:8px;font-weight:500}
.repo p{color:var(--sub);font-size:14px;flex:1}
.meta{display:flex;gap:16px;font-size:12.5px;color:var(--faint);align-items:center}
.meta i{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:-1px}
.note{color:var(--faint);font-size:13px;margin-top:16px}
</style></head><body>
<div class="top"><div class="wrap"><span><b>${esc(user)}</b> / repositories</span><a href="${esc(C.links.github)}" target="_blank" rel="noopener">Open the profile ↗</a></div></div>
<main class="wrap page">
  <aside class="who"><div class="av">${esc(C.initials)}</div><h1>${esc(C.name)}</h1><p>${esc(user)}</p><p class="bio">${esc(C.role)}</p>
    <a class="open" href="${esc(C.links.github)}" target="_blank" rel="noopener">Follow on GitHub ↗</a></aside>
  <section><div class="tabs"><span>Repositories<i id="n">${known.length}</i></span></div><div class="repos" id="repos"></div><p class="note" id="note"></p></section>
</main>
<script>
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const COL = { JavaScript: '#e6c94a', TypeScript: '#3178c6', Python: '#3572a5', 'Jupyter Notebook': '#da5b0b', HTML: '#e34c26', CSS: '#663399', Swift: '#f05138', Rust: '#dea584', Go: '#00add8' }
  const ago = (t) => { const d = (Date.now() - new Date(t)) / 864e5; return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 31 ? Math.round(d) + ' days ago' : d < 365 ? Math.round(d / 30) + ' months ago' : Math.round(d / 365) + ' years ago' }
  const draw = (list) => {
    document.getElementById('n').textContent = list.length
    document.getElementById('repos').innerHTML = list.map((r) => '<a class="repo" href="' + esc(r.html_url) + '" target="_blank" rel="noopener"><div><b>' + esc(r.name) + '</b><span class="pub">Public</span></div><p>' + esc(r.description || '') + '</p><div class="meta">' + (r.language ? '<span><i style="background:' + (COL[r.language] || '#9aa3ae') + '"></i>' + esc(r.language) + '</span>' : '') + (r.stargazers_count ? '<span>★ ' + r.stargazers_count + '</span>' : '') + (r.pushed_at ? '<span>Updated ' + ago(r.pushed_at) + '</span>' : '') + '</div></a>').join('')
  }
  draw(${JSON.stringify(known)})
  // (the profile's own list, if GitHub answers: kept for the visit)
  const KEY = 'desk.gh.${esc(user)}'
  const got = sessionStorage.getItem(KEY)
  if (got) draw(JSON.parse(got))
  else fetch('https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=pushed&per_page=24', { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((list) => { list = list.filter((r) => !r.fork); if (!list.length) return; sessionStorage.setItem(KEY, JSON.stringify(list)); draw(list) })
    .catch(() => { document.getElementById('note').textContent = 'The projects linked from the portfolio. Open the profile for everything.' })
  ${ESC_SCRIPT}
</script>
</body></html>`
}
