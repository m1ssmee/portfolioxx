// The laptop's first tab: the portfolio itself, as a real page (up close it is an iframe laid over
// the screen: scene.js). Built from portfolio.ts: who, the work as cards, each project's own page
// (what it is, what was built, the stack, what was hard, the ways in), about and contact. A page
// of its own (srcdoc), so its styles touch nothing else; it talks to the desk by postMessage:
//   { desk: 'tab', id }   open that project's tab in the browser (its live site, or its page)
//   { desk: 'key', key }  a key the desk wants (Escape: step back from the laptop)
// From across the room the screen shows laptopScreen.js's drawing of the same page (homePage there).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** The bio's first clause as the headline, its last sentence as the lead (else the name, the bio). */
export function heroText(C) {
  const bio = C.bio || ''
  const m = bio.match(/^([^:.]{12,90})[:.]/)
  const sentences = bio.split(/(?<=\.)\s+/)
  if (!m || sentences.length < 2) return { h1: C.name, lead: bio }
  return { h1: `${m[1].trim()}.`, lead: sentences[sentences.length - 1] }
}

const ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/** The whole page, as one HTML document. fontUrl: Inter's file (the page's own fonts are not shared). */
export function homeHtml(C, fontUrl) {
  const P = C.projects
  const { h1, lead } = heroText(C)
  const two = (n) => String(n).padStart(2, '0')
  const card = (p, i) => `
    <button class="card" data-open="${esc(p.id)}">
      <span class="card-k">${two(i + 1)} · ${esc(p.year)}${p.live ? ' · <b>Live</b>' : ''}</span>
      <span class="card-t">${esc(p.name)}</span>
      <span class="card-l">${esc(p.oneLiner)}</span>
      <span class="chips">${p.stack.slice(0, 4).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</span>
      <span class="card-more">Read more <span aria-hidden="true">→</span></span>
    </button>`
  const detail = (p, i) => `
    <article class="view detail" data-view="${esc(p.id)}" hidden>
      <button class="back" data-back>← All work</button>
      <p class="eyebrow">Project ${two(i + 1)} of ${two(P.length)} · ${esc(p.year)}</p>
      <h1 class="d-title">${esc(p.name)}</h1>
      <p class="lead">${esc(p.oneLiner)}</p>
      <div class="btns">
        <button class="btn solid" data-tab="${esc(p.id)}">${p.live ? 'Open the live site' : p.local ? 'See it running' : 'Open its page'}</button>
        ${p.live ? `<a class="btn" href="${esc(p.live)}" target="_blank" rel="noopener">New tab ${ARROW}</a>` : ''}
        ${p.github ? `<a class="btn" href="${esc(p.github)}" target="_blank" rel="noopener">GitHub ${ARROW}</a>` : ''}
      </div>
      <div class="cols">
        ${p.whatItIs ? `<section><h2>What it is</h2><p>${esc(p.whatItIs)}</p></section>` : ''}
        ${p.whatIBuilt ? `<section><h2>What I built</h2><p>${esc(p.whatIBuilt)}</p></section>` : ''}
      </div>
      ${p.stack.length ? `<section class="sec"><h2>Stack</h2><div class="chips">${p.stack.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></section>` : ''}
      ${p.challenges.length ? `<section class="sec"><h2>Under the hood</h2><ol class="hard">${p.challenges.map((c) => `<li>${esc(c)}</li>`).join('')}</ol></section>` : ''}
      <nav class="pager">
        ${i > 0 ? `<button class="pg" data-open="${esc(P[i - 1].id)}"><span>Previous</span>${esc(P[i - 1].name)}</button>` : '<span></span>'}
        ${i < P.length - 1 ? `<button class="pg next" data-open="${esc(P[i + 1].id)}"><span>Next</span>${esc(P[i + 1].name)}</button>` : '<span></span>'}
      </nav>
    </article>`
  const links = [C.links.github && ['GitHub', C.links.github], C.links.linkedin && ['LinkedIn', C.links.linkedin], C.links.x && ['X', C.links.x]].filter(Boolean)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(C.name)}</title>
<style>
${fontUrl ? `@font-face{font-family:Inter;src:url(${JSON.stringify(fontUrl)});font-weight:100 900;font-display:block}` : ''}
:root{--bg:#f4f1ec;--card:#fffdf9;--ink:#16181c;--sub:#555b66;--faint:#8b919b;--line:#e2ddd4;--accent:#2f4a66;--chip:#ebe7e0}
*{box-sizing:border-box;margin:0;padding:0}
html{background:var(--bg);color:var(--ink);font:400 17px/1.6 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;scroll-behavior:smooth}
body{min-height:100vh}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:left}
a{color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:0 72px}
header{position:sticky;top:0;z-index:2;background:rgba(244,241,236,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;height:68px}
.brand{font-weight:700;font-size:19px;letter-spacing:-.01em}
.brand i{font-style:normal;color:var(--faint);font-weight:500;margin-left:10px;font-size:15px}
nav.top{display:flex;gap:28px;font-size:15px;color:var(--sub)}
nav.top button,nav.top a{text-decoration:none;padding:6px 0}
nav.top button:hover,nav.top a:hover{color:var(--ink)}
.hero{padding:72px 0 56px}
.eyebrow{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.hero h1{font-size:62px;line-height:1.06;letter-spacing:-.035em;font-weight:800;max-width:900px;margin-top:18px}
.lead{font-size:21px;line-height:1.55;color:var(--sub);max-width:720px;margin-top:22px}
.sech{display:flex;align-items:baseline;justify-content:space-between;border-top:1px solid var(--line);padding-top:26px;margin-bottom:22px}
.sech h2,.about h2{font-size:28px;letter-spacing:-.02em;font-weight:700;color:var(--ink)}
.sech span{color:var(--faint);font-size:15px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;padding-bottom:72px}
.card{display:flex;flex-direction:column;gap:10px;padding:24px 24px 22px;background:var(--card);border:1px solid var(--line);border-radius:18px;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;min-height:270px}
.card:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(30,25,15,.08);border-color:#d3ccc0}
.card-k{font-size:12.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.card-k b{color:#2c7a4b;font-weight:700}
.card-t{font-size:25px;font-weight:700;letter-spacing:-.02em;line-height:1.2}
.card-l{font-size:15.5px;line-height:1.55;color:var(--sub);flex:1}
.card-more{font-size:14px;font-weight:600;color:var(--accent);margin-top:4px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{font-size:12.5px;line-height:1;padding:7px 10px;border-radius:999px;background:var(--chip);color:#454a52}
.about{border-top:1px solid var(--line);padding:56px 0 80px;display:grid;grid-template-columns:1fr 1.4fr;gap:56px}
.about p{color:var(--sub);font-size:18px;line-height:1.7}
.contact{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.btn{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 20px;border-radius:12px;border:1px solid #cfc8bc;font-size:15px;font-weight:600;text-decoration:none;background:var(--card);transition:background .15s}
.btn:hover{background:#fff}
.btn.solid{background:var(--ink);color:#fff;border-color:var(--ink)}
.btn.solid:hover{background:#2b2f36}
.detail{padding:40px 0 64px}
.back{font-size:15px;font-weight:600;color:var(--accent);margin-bottom:34px}
.d-title{font-size:58px;line-height:1.05;letter-spacing:-.035em;font-weight:800;margin-top:14px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:52px;padding-top:34px;border-top:1px solid var(--line)}
article h2{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
.cols p{font-size:17px;line-height:1.7;color:#2c3036}
.sec{margin-top:44px}
.hard{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:16px;counter-reset:h}
.hard li{counter-increment:h;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 22px 20px 62px;position:relative;font-size:15.5px;line-height:1.6;color:#2c3036}
.hard li::before{content:counter(h,decimal-leading-zero);position:absolute;left:22px;top:20px;font-weight:700;color:var(--faint);font-size:14px}
.pager{display:flex;justify-content:space-between;gap:16px;margin-top:60px;padding-top:26px;border-top:1px solid var(--line)}
.pg{display:flex;flex-direction:column;font-size:20px;font-weight:700;letter-spacing:-.01em}
.pg span{font-size:12.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:4px}
.pg.next{text-align:right;align-items:flex-end}
footer{color:var(--faint);font-size:14px;padding:26px 0 40px;border-top:1px solid var(--line)}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:8px}
</style></head><body>
<header><div class="wrap"><span class="brand">${esc(C.name)}<i>${esc(C.role)}</i></span>
<nav class="top"><button data-go="work">Work</button><button data-go="about">About</button>${C.links.github ? `<a href="${esc(C.links.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}</nav></div></header>
<main class="wrap">
  <div class="view" data-view="home">
    <section class="hero"><p class="eyebrow">${esc(C.role)}</p><h1>${esc(h1)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</section>
    <section id="work"><div class="sech"><h2>Selected work</h2><span>${P.length} projects</span></div><div class="grid">${P.map(card).join('')}</div></section>
    <section class="about" id="about"><div><h2>About</h2></div><div><p>${esc(C.bio)}</p>
      <div class="contact">${C.email ? `<a class="btn solid" href="mailto:${esc(C.email)}">${esc(C.email)}</a>` : ''}${links.map(([t, u]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ${ARROW}</a>`).join('')}</div></div></section>
  </div>
  ${P.map(detail).join('')}
  <footer>© ${new Date().getFullYear()} ${esc(C.name)} · the projects' own sites are in the tabs above</footer>
</main>
<script>
  const views = [...document.querySelectorAll('.view')]
  const show = (name, anchor) => {
    for (const v of views) v.hidden = v.dataset.view !== name
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open],[data-back],[data-go],[data-tab]')
    if (!t) return
    if (t.dataset.open) show(t.dataset.open)
    else if (t.hasAttribute('data-back')) show('home', 'work')
    else if (t.dataset.go) show('home', t.dataset.go)
    else if (t.dataset.tab) parent.postMessage({ desk: 'tab', id: t.dataset.tab }, '*')
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    // (a project open: back to the work; on the list: the desk steps back from the laptop)
    const open = views.find((v) => !v.hidden)
    if (open && open.dataset.view !== 'home') show('home', 'work')
    else parent.postMessage({ desk: 'key', key: 'Escape' }, '*')
  })
</script>
</body></html>`
}
