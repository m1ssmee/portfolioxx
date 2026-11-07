// The portfolio as plain HTML, from the same content Pod OS shows (portfolio.ts): the page's hidden
// semantic copy, for search engines and screen readers. Used at build time by vite.config.js;
// nothing here runs in the browser.
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
    `<header><h1>${esc(p.name)}</h1><p>${esc([p.role, p.basedIn].filter(Boolean).join(' · '))}</p><p>${esc(p.bio)}</p></header>` +
    `<section aria-labelledby="pf-projects"><h2 id="pf-projects">Projects</h2>${p.projects.map(project).join('')}</section>` +
    `<section aria-labelledby="pf-contact"><h2 id="pf-contact">Contact</h2><ul>${[
      p.email && `<li>Email: <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>`,
      p.links.github && `<li>${a(p.links.github, 'GitHub')}</li>`,
      p.links.linkedin && `<li>${a(p.links.linkedin, 'LinkedIn')}</li>`,
      p.links.x && `<li>${a(p.links.x, 'X')}</li>`,
    ]
      .filter(Boolean)
      .join('')}</ul></section>`
  )
}

/** For index.html: the whole portfolio, out of sight (the scene is what is seen). */
export function hiddenHtml(p) {
  return `<main class="pf-hidden" aria-label="${esc(p.name)}: portfolio">${body(p)}</main>`
}
