import { contact, profile, projects, toolkit } from '../content'

type Props = { notice?: string; detail?: string; retry?: boolean }

export function PlainView({ notice, detail, retry }: Props) {
  return (
    <main className="plain">
      {notice ? (
        <p className="plain-notice">
          {notice}
          {detail && <small className="plain-why">Reason: {detail}</small>}
          {retry && (
            <a className="plain-retry" href="?gpu=low">
              Try the 3D version again
            </a>
          )}
        </p>
      ) : (
        <a className="plain-back" href="#">
          ← Back to the pod
        </a>
      )}
      <header>
        <h1>{profile.name}</h1>
        <p className="plain-role">{profile.role}</p>
        <p className="plain-tag">{profile.tagline}</p>
      </header>

      <section>
        <h2>About</h2>
        {profile.about.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </section>

      <section>
        <h2>Projects</h2>
        {projects.map((p, i) => (
          <article key={p.slug} className="plain-project">
            <div className="plain-num">{String(i + 1).padStart(2, '0')}</div>
            <div>
              <h3>{p.fullTitle}</h3>
              <p className="plain-kind">
                {p.kind} · {p.year}
              </p>
              <p>{p.oneLiner}</p>
              <ul>
                {p.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              {p.stats && (
                <p className="plain-stats">{p.stats.map((s) => `${s.label}: ${s.value}`).join(' · ')}</p>
              )}
              <p className="plain-stack">{p.stack.join(' · ')}</p>
              <p className="plain-links">
                {p.live && (
                  <a href={p.live} target="_blank" rel="noopener">
                    Live ↗
                  </a>
                )}
                {p.demo && (
                  <a href={p.demo} target="_blank" rel="noopener">
                    Demo ↗
                  </a>
                )}
                <a href={p.repo} target="_blank" rel="noopener">
                  GitHub ↗
                </a>
              </p>
            </div>
          </article>
        ))}
      </section>

      <section>
        <h2>Toolkit</h2>
        <dl className="plain-tk">
          {toolkit.map((g) => (
            <div key={g.group}>
              <dt>{g.group}</dt>
              <dd>{g.items.join(' · ')}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>Contact</h2>
        <p className="plain-links">
          {contact.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noopener">
              {c.label}: {c.value} ↗
            </a>
          ))}
        </p>
      </section>
    </main>
  )
}
