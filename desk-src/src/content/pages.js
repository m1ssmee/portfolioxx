// The portfolio as plain HTML, from the same content Pod OS shows (portfolio.ts): the page's hidden
// semantic copy (for search engines and screen readers) and the "plain view" page. Used at build
// time by vite.config.js; nothing here runs in the browser.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const a = (url, text) => `<a href="${esc(url)}" rel="noopener">${esc(text)}</a>`

/** The content as semantic HTML: who, the projects, how to get in touch (as Pod OS has it). */
function body(p) {
  const project = (x) =>
    `<article><h3>${esc(x.name)}</h3><p>${esc(x.oneLiner)} <span>(${esc(x.year)})</span></p>` +
    `<h4>What it is</h4><p>${esc(x.whatItIs)}</p><h4>What I built</h4><p>${esc(x.whatIBuilt)}</p>` +
    `<h4>Stack</h4><ul>${x.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` +
    `<h4>Challenges</h4><ul>${x.challenges.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` +
    `${x.github || x.live ? `<p>${[x.github && a(x.github, 'GitHub'), x.live && a(x.live, 'Live demo')].filter(Boolean).join(' · ')}</p>` : ''}</article>`
  return (
    `<header><h1>${esc(p.name)}</h1><p>${esc(p.role)} · ${esc(p.basedIn)}</p><p>${esc(p.bio)}</p></header>` +
    `<section aria-labelledby="pf-projects"><h2 id="pf-projects">Projects</h2>${p.projects.map(project).join('')}</section>` +
    `<section aria-labelledby="pf-contact"><h2 id="pf-contact">Contact</h2><ul><li>Email: <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li><li>${a(p.links.github, 'GitHub')}</li><li>${a(p.links.linkedin, 'LinkedIn')}</li><li>${a(p.links.x, 'X')}</li></ul></section>`
  )
}

/** For index.html: the whole portfolio, out of sight (the desk is what is seen), and the way to the plain view. */
export function hiddenHtml(p) {
  return `<main class="pf-hidden" aria-label="${esc(p.name)}: portfolio">${body(p)}<p><a href="./plain.html">The same, as a plain page</a></p></main>`
}

/** The plain view: the same content as a simple page (no script, nothing to load but itself). */
export function plainHtml(p) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.name)}: portfolio (plain view)</title>
<meta name="description" content="${esc(p.role)}. ${esc(p.bio)}">
<style>
:root{color-scheme:light dark;--bg:#efebe3;--text:#2b2a27;--muted:#615d56;--line:#cfc8bb;--accent:#56624f}
@media (prefers-color-scheme:dark){:root{--bg:#1d1c1a;--text:#e8e4dc;--muted:#a29d93;--line:#383632;--accent:#9aa894}}
html{background:var(--bg);color:var(--text);font:400 16px/1.6 Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
body{max-width:640px;margin:0 auto;padding:48px 22px 80px}
h1{font-size:28px;font-weight:600;line-height:1.2;margin:0 0 4px}
h2{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:44px 0 10px}
h3{font-size:18px;font-weight:600;margin:22px 0 2px}
h4{font-size:14px;font-weight:600;margin:14px 0 2px}
p,ul{margin:6px 0}
ul{padding-left:20px}
header p:first-of-type,span{color:var(--muted)}
article{padding:4px 0 18px;border-bottom:1px solid var(--line)}
a{color:var(--accent);text-underline-offset:3px}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px}
nav{font-size:14px;margin-bottom:36px}
</style>
</head>
<body>
<nav><a href="./">← back to the desk</a></nav>
<main>${body(p)}</main>
</body>
</html>
`
}
