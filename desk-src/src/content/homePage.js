// The laptop's two tabs, as real pages (up close each is an iframe laid over the screen: scene.js).
// Built from portfolio.ts. Pages of their own (srcdoc), so their styles touch nothing else; they
// talk to the desk by postMessage:
//   { desk: 'site', id }  show that project's site on the monitor
//   { desk: 'key', key }  a key the desk wants (Escape: step back from the laptop)
// From across the room the screen shows laptopScreen.js's drawings of the same pages.
//   homeHtml: the portfolio. The headline, the work as an index (each opens its write-up: what it
//             is, what was built, the stack, what was hard, the ways in), about and contact.
//   githubHtml: the GitHub profile's repositories (the projects' own, at once; the live list from
//             GitHub's API when it answers).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const two = (n) => String(n).padStart(2, '0')

/** Which projects are sites the monitor shows (a live site, or one run locally). */
export const isSite = (p) => !!(p.live || p.local)
/** The GitHub user from the profile link. */
export const githubUser = (C) => (C.links.github || '').replace(/\/+$/, '').split('/').pop() || ''

const ARROW = '<svg class="ar" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const fontFace = (fontUrl) => (fontUrl ? `@font-face{font-family:Inter;src:url(${JSON.stringify(fontUrl)});font-weight:100 900;font-display:block}` : '')
const ESC_SCRIPT = `document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !window.__back?.()) parent.postMessage({ desk: 'key', key: 'Escape' }, '*') })`

/** The portfolio, one HTML document. fontUrl: Inter's file (a page's fonts are its own). */
export function homeHtml(C, fontUrl) {
  const P = C.projects
  const row = (p, i) => `
    <button class="row" data-open="${esc(p.id)}">
      <span class="r-n">${two(i + 1)}</span>
      <span class="r-t">${esc(p.name)}</span>
      <span class="r-l">${esc(p.oneLiner)}</span>
      <span class="r-s">${p.stack.slice(0, 3).map(esc).join(' · ')}</span>
      <span class="r-y">${isSite(p) ? `<i class="dot"></i>${p.live ? 'Live' : 'Site'}` : 'Code'}</span>
      <span class="r-go" aria-hidden="true">→</span>
    </button>`
  const detail = (p, i) => `
    <article class="view detail" data-view="${esc(p.id)}" hidden>
      <button class="back" data-back>← Work</button>
      <p class="k">${two(i + 1)} / ${two(P.length)} · ${esc(p.year)}${p.live ? ' · <b>Live</b>' : ''}</p>
      <h1 class="d-t">${esc(p.name)}</h1>
      <p class="lead">${esc(p.oneLiner)}</p>
      <div class="btns">
        ${isSite(p) ? `<button class="btn solid" data-site="${esc(p.id)}">See it on the monitor</button>` : ''}
        ${p.live ? `<a class="btn" href="${esc(p.live)}" target="_blank" rel="noopener">Live site ${ARROW}</a>` : ''}
        ${p.github ? `<a class="btn${isSite(p) ? '' : ' solid'}" href="${esc(p.github)}" target="_blank" rel="noopener">Code ${ARROW}</a>` : ''}
      </div>
      <div class="cols">
        ${p.whatItIs ? `<section><h2 class="k">What it is</h2><p>${esc(p.whatItIs)}</p></section>` : ''}
        ${p.whatIBuilt ? `<section><h2 class="k">What I built</h2><p>${esc(p.whatIBuilt)}</p></section>` : ''}
      </div>
      ${p.stack.length ? `<section class="sec"><h2 class="k">Stack</h2><div class="chips">${p.stack.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></section>` : ''}
      ${p.challenges.length ? `<section class="sec"><h2 class="k">Under the hood</h2><ol class="hard">${p.challenges.map((c, j) => `<li><span class="k">${two(j + 1)}</span><p>${esc(c)}</p></li>`).join('')}</ol></section>` : ''}
      <nav class="pager">
        ${i > 0 ? `<button class="pg" data-open="${esc(P[i - 1].id)}"><span class="k">← Previous</span>${esc(P[i - 1].name)}</button>` : '<span></span>'}
        ${i < P.length - 1 ? `<button class="pg nx" data-open="${esc(P[i + 1].id)}"><span class="k">Next →</span>${esc(P[i + 1].name)}</button>` : '<span></span>'}
      </nav>
    </article>`
  const links = [C.links.github && ['GitHub', C.links.github], C.links.linkedin && ['LinkedIn', C.links.linkedin], C.links.x && ['X', C.links.x]].filter(Boolean)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(C.name)}</title>
<style>
${fontFace(fontUrl)}
:root{--bg:#0e0f11;--bg2:#15161a;--ink:#ece8e1;--sub:#a29d95;--faint:#6d6a65;--line:#25262b;--amber:#f0b46a;--green:#7fd39a}
*{box-sizing:border-box;margin:0;padding:0}
html{background:var(--bg);color:var(--ink);font:400 17px/1.6 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;scroll-behavior:smooth}
::selection{background:var(--amber);color:#111}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:left}
a{color:inherit;text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 64px}
.k{font:500 12px/1.4 ui-monospace,'SF Mono',Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.k b{color:var(--green);font-weight:500}
header{position:sticky;top:0;z-index:3;background:rgba(14,15,17,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{font-weight:650;font-size:17px;letter-spacing:-.01em;display:flex;align-items:center;gap:10px}
.brand i{width:8px;height:8px;border-radius:50%;background:var(--amber);box-shadow:0 0 12px var(--amber)}
nav.top{display:flex;gap:30px}
nav.top>*{font:500 12.5px/1 ui-monospace,'SF Mono',Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--sub);padding:8px 0;transition:color .15s}
nav.top>*:hover{color:var(--ink)}
.hero{padding:96px 0 84px;position:relative}
.hero::after{content:'';position:absolute;right:-40px;top:40px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(240,180,106,.13),transparent 65%);pointer-events:none}
.hero h1{font-size:92px;line-height:.98;letter-spacing:-.05em;font-weight:750;max-width:980px;margin-top:22px}
.hero h1 em{font-style:normal;color:var(--amber)}
.lead{font-size:22px;line-height:1.5;color:var(--sub);max-width:760px;margin-top:30px;letter-spacing:-.005em}
.sech{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:16px}
.list{margin-bottom:96px}
.row{display:grid;grid-template-columns:52px 230px 1fr 230px 64px 24px;align-items:baseline;gap:20px;width:100%;padding:24px 8px;border-bottom:1px solid var(--line);transition:background .18s,padding .18s}
.row:hover{background:var(--bg2);padding-left:16px}
.r-n{font:500 13px ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:var(--faint)}
.r-t{font-size:26px;font-weight:650;letter-spacing:-.025em;line-height:1.2}
.r-l{font-size:15.5px;line-height:1.5;color:var(--sub)}
.r-s,.r-y{font:500 12px/1.5 ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:var(--faint);letter-spacing:.03em}
.r-y{display:flex;align-items:center;gap:7px;text-transform:uppercase}
.dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}
.r-go{color:var(--faint);transition:color .18s,transform .18s}
.row:hover .r-go{color:var(--amber);transform:translateX(4px)}
.about{display:grid;grid-template-columns:240px 1fr;gap:40px;padding:56px 0 96px;border-top:1px solid var(--line)}
.about p{font-size:22px;line-height:1.6;color:var(--ink);letter-spacing:-.01em;max-width:820px}
.contact{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:34px}
.btn{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 20px;border-radius:999px;border:1px solid #393a40;font-size:15px;font-weight:550;transition:background .15s,border-color .15s}
.btn:hover{background:#1c1d21;border-color:#4a4b52}
.btn.solid{background:var(--amber);color:#16120c;border-color:var(--amber)}
.btn.solid:hover{background:#f6c487}
.detail{padding:44px 0 80px}
.back{font:500 12.5px ui-monospace,'SF Mono',Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--amber);margin-bottom:46px}
.d-t{font-size:80px;line-height:1;letter-spacing:-.05em;font-weight:750;margin-top:16px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:64px;padding-top:36px;border-top:1px solid var(--line)}
.cols h2,.sec h2{margin-bottom:14px}
.cols p{font-size:17px;line-height:1.75;color:#cfcac2}
.sec{margin-top:52px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font:500 12.5px/1 ui-monospace,'SF Mono',Menlo,Consolas,monospace;padding:9px 12px;border-radius:999px;border:1px solid var(--line);color:#cfcac2}
.hard{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:14px}
.hard li{display:grid;grid-template-columns:34px 1fr;background:var(--bg2);border:1px solid var(--line);border-radius:16px;padding:22px 24px}
.hard p{font-size:15.5px;line-height:1.65;color:#cfcac2}
.pager{display:flex;justify-content:space-between;gap:16px;margin-top:72px;padding-top:28px;border-top:1px solid var(--line)}
.pg{display:flex;flex-direction:column;gap:6px;font-size:24px;font-weight:650;letter-spacing:-.02em;transition:color .15s}
.pg:hover{color:var(--amber)}
.pg.nx{text-align:right;align-items:flex-end}
footer{padding:26px 0 44px;border-top:1px solid var(--line);display:flex;justify-content:space-between}
:focus-visible{outline:2px solid var(--amber);outline-offset:4px;border-radius:6px}
</style></head><body>
<header><div class="wrap"><span class="brand"><i></i>${esc(C.name)}</span>
<nav class="top"><button data-go="work">Work</button><button data-go="about">About</button>${C.links.github ? `<a href="${esc(C.links.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}</nav></div></header>
<main class="wrap">
  <div class="view" data-view="home">
    <section class="hero"><p class="k">${esc(C.role)}</p><h1>${esc(C.headline || C.name).replace(/(\S+\s+\S+\.?)$/, '<em>$1</em>')}</h1>${C.lead ? `<p class="lead">${esc(C.lead)}</p>` : ''}</section>
    <section class="list" id="work"><div class="sech"><span class="k">Selected work</span><span class="k">${two(P.length)}</span></div>${P.map(row).join('')}</section>
    <section class="about" id="about"><span class="k">About</span><div><p>${esc(C.bio)}</p>
      <div class="contact">${C.email ? `<a class="btn solid" href="mailto:${esc(C.email)}">${esc(C.email)}</a>` : ''}${links.map(([t, u]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ${ARROW}</a>`).join('')}</div></div></section>
  </div>
  ${P.map(detail).join('')}
  <footer><span class="k">© ${new Date().getFullYear()} ${esc(C.name)}</span><span class="k">The sites run on the monitor behind</span></footer>
</main>
<script>
  const views = [...document.querySelectorAll('.view')]
  const show = (name, anchor) => {
    for (const v of views) v.hidden = v.dataset.view !== name
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }
  // (Escape on a project: back to the work; on the list, the desk's own)
  window.__back = () => { const v = views.find((x) => !x.hidden); if (!v || v.dataset.view === 'home') return false; show('home', 'work'); return true }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open],[data-back],[data-go],[data-site]')
    if (!t) return
    if (t.dataset.open) show(t.dataset.open)
    else if (t.hasAttribute('data-back')) show('home', 'work')
    else if (t.dataset.go) show('home', t.dataset.go)
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
