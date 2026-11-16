// The laptop's two tabs, as real pages (up close each is an iframe laid over the screen: scene.js).
// Built from portfolio.ts. Pages of their own (srcdoc), so their styles touch nothing else; they
// talk to the desk by postMessage:
//   { desk: 'site', id }  show that project's site on the monitor
//   { desk: 'key', key }  a key the desk wants (Escape: step back from the laptop)
// From across the room the screen shows laptopScreen.js's drawings of the same pages.
//   homeHtml: the portfolio, a bento grid: who, each project a tile (its screenshot where it has
//             one), GitHub, the stack; a tile opens the project's write-up (what it is, what was
//             built, what was hard, the stack, the ways in).
//   githubHtml: the GitHub profile's repositories (the projects' own, at once; the live list from
//             GitHub's API when it answers).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Which projects are sites the monitor shows (a live site, or one run locally). */
export const isSite = (p) => !!(p.live || p.local)
/** The GitHub user from the profile link. */
export const githubUser = (C) => (C.links.github || '').replace(/\/+$/, '').split('/').pop() || ''

const fontFace = (fontUrl) => (fontUrl ? `@font-face{font-family:Inter;src:url(${JSON.stringify(fontUrl)});font-weight:100 900;font-display:block}` : '')
const ESC_SCRIPT = `document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !window.__back?.()) parent.postMessage({ desk: 'key', key: 'Escape' }, '*') })`

/** The tiles' own colours for the projects without a screenshot ([ground, ink]). */
export const TILE = { 'lunar-rover': ['#1c2640', '#eef1f8'], cropscan: ['#dfeccc', '#1d2a14'] }
/** The bento grid's measures (px, as the page lays out 1440 wide): shared with laptopScreen.js's drawing. */
export const BENTO = { max: 1240, pad: 28, gap: 16, rows: [300, 270, 270], r: 26 }
/** The stack across every project, most used first. */
export function topStack(C, n = 9) {
  const count = new Map()
  for (const p of C.projects) for (const t of p.stack) count.set(t, (count.get(t) || 0) + 1)
  return [...count.entries()].sort((x, y) => y[1] - x[1]).slice(0, n).map(([t]) => t)
}

/**
 * The portfolio, one HTML document: a bento grid. A dark tile says who; each project is a tile,
 * its screenshot filling it where it has one (shots: { id: url }), its own colour where not; two
 * small tiles for GitHub and the stack. A project's tile opens its write-up, tiles again.
 */
export function homeHtml(C, fontUrl, shots = {}) {
  const P = C.projects
  const tag = (p) => `${esc(p.year)}${p.live ? ' · <b>Live</b>' : p.local ? ' · Runs locally' : ''}`
  /** A project's tile: its picture and a label over its foot, or its colour and its words. */
  const tile = (p, span, h = 1) => {
    if (!p) return ''
    const shot = shots[p.id]
    if (shot)
      return `<button class="t shot s${span} h${h}" data-open="${esc(p.id)}"><img src="${esc(shot)}" alt="${esc(p.name)}: its front page" decoding="async"><span class="cap"><span class="nm">${esc(p.name)}</span><span class="tg">${tag(p)}</span></span></button>`
    const [bg, ink] = TILE[p.id] || ['#ffffff', '#16171a']
    return `<button class="t flat s${span} h${h}" data-open="${esc(p.id)}" style="background:${bg};color:${ink}"><span class="tg">${tag(p)}</span><span class="big">${esc(p.name)}</span><span class="one">${esc(p.oneLiner)}</span><span class="go">Read →</span></button>`
  }
  const sites = P.filter(isSite)
  const rest = P.filter((p) => !isSite(p))
  const detail = (p, i) => `
    <article class="view" data-view="${esc(p.id)}" hidden>
      <div class="grid">
        <div class="t white s5 head"><button class="back" data-back>← All work</button><span class="tg">${tag(p)}</span><h1>${esc(p.name)}</h1><p class="one">${esc(p.oneLiner)}</p>
          <div class="btns">${isSite(p) ? `<button class="btn dark" data-site="${esc(p.id)}">See it on the monitor</button>` : ''}${p.live ? `<a class="btn" href="${esc(p.live)}" target="_blank" rel="noopener">Live site ↗</a>` : ''}${p.github ? `<a class="btn${isSite(p) ? '' : ' dark'}" href="${esc(p.github)}" target="_blank" rel="noopener">Code ↗</a>` : ''}</div></div>
        ${shots[p.id] ? `<div class="t shot s7 still"><img src="${esc(shots[p.id])}" alt="${esc(p.name)}: its front page"></div>` : `<div class="t flat s7 still" style="background:${(TILE[p.id] || ['#17181b'])[0]};color:${(TILE[p.id] || [0, '#fff'])[1]}"><span class="huge">${esc(p.name)}</span></div>`}
        ${p.whatItIs ? `<div class="t white s6 txt"><h2>What it is</h2><p>${esc(p.whatItIs)}</p></div>` : ''}
        ${p.whatIBuilt ? `<div class="t white s6 txt"><h2>What I built</h2><p>${esc(p.whatIBuilt)}</p></div>` : ''}
        ${p.challenges.map((c, j) => `<div class="t white s${p.challenges.length > 2 ? 4 : 6} txt"><h2>What was hard · ${j + 1}</h2><p>${esc(c)}</p></div>`).join('')}
        <div class="t lav s8 txt"><h2>Built with</h2><div class="chips">${p.stack.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>
        <button class="t dark s4 next" data-open="${esc(P[(i + 1) % P.length].id)}"><span class="tg">Next</span><span class="big">${esc(P[(i + 1) % P.length].name)} →</span></button>
      </div>
    </article>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(C.name)}</title>
<style>
${fontFace(fontUrl)}
*{box-sizing:border-box;margin:0;padding:0}
html{background:#ecebe6;color:#16171a;font:400 16px/1.5 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:left}
a{color:inherit;text-decoration:none}
main{max-width:${BENTO.max}px;margin:0 auto;padding:${BENTO.pad}px}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:${BENTO.gap}px;grid-auto-rows:auto}
.h0{height:${BENTO.rows[0]}px}.h1{height:${BENTO.rows[1]}px}
.t{position:relative;display:flex;flex-direction:column;border-radius:${BENTO.r}px;overflow:hidden;padding:26px 28px;min-width:0}
button.t{transition:transform .2s ease,box-shadow .2s ease}
button.t:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(20,18,12,.16)}
${[3, 4, 5, 6, 7, 8, 12].map((n) => `.s${n}{grid-column:span ${n}}`).join('')}
.white{background:#fff}.dark{background:#141517;color:#f3f1ec}.lav{background:#e6e1f7}.mint{background:#d6eede}
.me h1{font-size:44px;line-height:1.05;letter-spacing:-.035em;font-weight:750;margin-top:auto}
.me .role{color:#a9a69f;font-size:17px;margin-top:6px}
.me .bio{color:#d5d2cb;font-size:15.5px;line-height:1.55;margin-top:14px}
.dotrow{display:flex;align-items:center;gap:9px;font-size:13px;color:#a9a69f}
.dotrow i{width:9px;height:9px;border-radius:50%;background:#62d28a}
.shot{padding:0;background:#ddd}
.shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
.cap{position:absolute;left:14px;bottom:14px;display:flex;align-items:baseline;gap:10px;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-radius:999px;padding:9px 16px;box-shadow:0 4px 14px rgba(0,0,0,.14);color:#16171a}
.nm{font-weight:700;font-size:16px;letter-spacing:-.01em}
.tg{font-size:13px;opacity:.7}.tg b{font-weight:650;color:#1f8a4c;opacity:1}
.flat .tg b{color:inherit}
.big{font-size:30px;font-weight:750;letter-spacing:-.03em;line-height:1.1;margin-top:auto}
.one{font-size:15px;line-height:1.5;opacity:.82;margin-top:8px}
.go{font-size:14px;font-weight:650;margin-top:14px}
.gh .big{font-size:26px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}
.chip{font-size:13px;font-weight:550;line-height:1;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.72)}
h2{font-size:13px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;opacity:.55;margin-bottom:10px}
.view[hidden]{display:none}
.head h1{font-size:46px;line-height:1.04;letter-spacing:-.035em;font-weight:750;margin-top:10px}
.head .one{font-size:17px}
.back{font-size:14px;font-weight:650;margin-bottom:auto;padding-bottom:22px;opacity:.7}
.btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.btn{display:inline-flex;align-items:center;height:42px;padding:0 18px;border-radius:999px;border:1px solid #d5d2ca;font-size:14.5px;font-weight:650;background:#fff}
.btn.dark{background:#141517;color:#fff;border-color:#141517}
.still{min-height:${BENTO.rows[0] + 60}px}
.huge{font-size:72px;font-weight:800;letter-spacing:-.05em;line-height:1;margin:auto 0 0}
.txt p{font-size:16px;line-height:1.62}
.next{min-height:150px}
footer{font-size:13px;color:#86837c;padding:22px 6px 6px}
:focus-visible{outline:3px solid #141517;outline-offset:3px}
</style></head><body>
<main>
  <div class="view" data-view="home">
    <div class="grid">
      <div class="t dark s5 me h0"><span class="dotrow"><i></i>${esc(C.role.replace(/\s*·\s*builder$/i, ''))}</span><h1>${esc(C.name)}</h1><p class="bio">${esc(C.bio)}</p></div>
      ${tile(sites[0], 7, 0)}
      ${tile(sites[1], 4)}
      ${tile(sites[2], 4)}
      ${C.links.github ? `<a class="t mint s4 gh h1" href="${esc(C.links.github)}" target="_blank" rel="noopener"><span class="tg">GitHub</span><span class="big">${esc(githubUser(C))} ↗</span><span class="one">Everything here is open: the code for each project is a click away.</span></a>` : ''}
      ${tile(sites[3], 6)}
      ${tile(rest[0], 3)}
      ${tile(rest[1], 3)}
      <div class="t lav s12 txt"><h2>What I build with</h2><div class="chips">${topStack(C, 14).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>
    </div>
    <footer>© ${new Date().getFullYear()} ${esc(C.name)} · the sites themselves run on the monitor behind this laptop</footer>
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
    if (t.dataset.site) parent.postMessage({ desk: 'site', id: t.dataset.site }, '*')
    else if (t.hasAttribute('data-back')) show('home')
    else if (t.dataset.open) show(t.dataset.open)
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
