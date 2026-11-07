// Everything Pod OS shows, in one place: edit this file, not the UI code. The same content also
// becomes the page's hidden semantic HTML and the "plain view" page (vite.config.js builds both, so
// keep this file plain data: no imports). Every "TODO: your text here" is a placeholder to replace,
// and the three projects below are placeholders too: paste your projects here.
//
// Pod OS has three screens: the projects list (its home), a project's page, and About & contact.

export interface Project {
  /** Short, lowercase, no spaces (it names the project's page). */
  id: string
  name: string
  /** One line, shown on the card. */
  oneLiner: string
  stack: string[]
  year: number
  /** Image URLs: put the files in public/media/ and list them as './media/name.png' (they load before entry); empty: quiet placeholders. */
  screenshots: string[]
  whatItIs: string
  whatIBuilt: string
  challenges: string[]
  github?: string
  live?: string
}

export interface Portfolio {
  name: string
  /** Shown on About & contact and the plain view. */
  role: string
  /** Initials for the avatar when there is no photo. */
  initials: string
  /** A photo URL ('./media/me.jpg', the file in public/media/), or empty for the initials. */
  photo: string
  bio: string
  basedIn: string
  projects: Project[]
  email: string
  links: { github: string; linkedin: string; x: string }
}

export const portfolio: Portfolio = {
  name: 'TODO: your name',
  role: 'TODO: your role, e.g. creative developer',
  initials: 'YN',
  photo: '',
  bio: 'TODO: your text here. Two or three sentences about who you are and what you like to build.',
  basedIn: 'TODO: your city, country',
  projects: [
    {
      id: 'project-one',
      name: 'TODO: Project one',
      oneLiner: 'TODO: one line about what it is',
      stack: ['TypeScript', 'three.js', 'WebGL'],
      year: 2026,
      screenshots: [],
      whatItIs: 'TODO: your text here. What the project is, in two or three sentences.',
      whatIBuilt: 'TODO: your text here. What you built yourself.',
      challenges: ['TODO: an interesting technical challenge and how you solved it', 'TODO: another one'],
      github: 'https://github.com/TODO',
      live: 'https://TODO.example.com',
    },
    {
      id: 'project-two',
      name: 'TODO: Project two',
      oneLiner: 'TODO: one line about what it is',
      stack: ['Go', 'PostgreSQL'],
      year: 2025,
      screenshots: [],
      whatItIs: 'TODO: your text here.',
      whatIBuilt: 'TODO: your text here.',
      challenges: ['TODO: an interesting technical challenge'],
      github: 'https://github.com/TODO',
    },
    {
      id: 'project-three',
      name: 'TODO: Project three',
      oneLiner: 'TODO: one line about what it is',
      stack: ['React', 'Node.js'],
      year: 2024,
      screenshots: [],
      whatItIs: 'TODO: your text here.',
      whatIBuilt: 'TODO: your text here.',
      challenges: ['TODO: an interesting technical challenge'],
      live: 'https://TODO.example.com',
    },
  ],
  email: 'TODO@example.com',
  links: {
    github: 'https://github.com/TODO',
    linkedin: 'https://www.linkedin.com/in/TODO',
    x: 'https://x.com/TODO',
  },
}
