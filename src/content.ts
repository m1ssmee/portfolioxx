// Everything the portfolio says lives in this file.
// Edit text here; the pod, the projector and the plain view all read from it.

export type Project = {
  slug: string
  title: string
  fullTitle: string
  year: string
  kind: string
  oneLiner: string
  stack: string[]
  highlights: string[]
  status?: string
  stats?: { label: string; value: string }[]
  /** Deployed URL. When set, the projector shows the live site. */
  live?: string
  demo?: string
  repo: string
  /** Two colours for the generated cover on the pod screen. */
  cover: [string, string]
}

/** Two-digit year shown on the boot screen and in the corner. */
export const YEAR = String(new Date().getFullYear() % 100)

export const profile = {
  name: 'Krish P.',
  short: 'krish',
  handle: 'm1ssmee',
  role: 'AI engineer · builder',
  tagline:
    'I build AI products people can actually use — from 3D medical explainers to code that argues with itself — and the occasional rover for the Moon.',
  about: [
    'I like turning hard technical ideas into things you can poke at.',
    'Lately that means AI apps on the web: a 3D body that explains your medical reports, and a tavern where your codebase’s modules argue about who caused the bug.',
    'Before that: deep learning for crop disease, and a GPS-denied lunar rover in ROS 2.',
    'I care about grounding — answers that cite their source, numbers computed rather than guessed, and evaluation that doesn’t flatter the model.',
  ],
}

export const projects: Project[] = [
  {
    slug: 'bodymap',
    title: 'BodyMap',
    fullTitle: 'BodyMap — your body, explained',
    year: '2026',
    kind: 'Health AI · Hackathon',
    oneLiner:
      'Upload any medical report and every finding is pinned to a 3D body, explained in plain language.',
    stack: ['Next.js', 'React Three Fiber', 'Gemini', 'Tailwind', 'Vercel'],
    highlights: [
      'Gemini reads prescriptions, blood reports, X-rays, MRI, CT and ultrasound into one strict schema.',
      'Findings glow on a 3D body by severity; tap a region or a record to filter.',
      'Lab severity is computed from the printed reference range, not guessed by the model.',
      'No login, no database: records stay in the browser.',
    ],
    live: 'https://bodymap-qu9s.vercel.app',
    repo: 'https://github.com/m1ssmee/bodymap',
    cover: ['#3b2bd6', '#e58bd8'],
  },
  {
    slug: 'codebase-tavern',
    title: 'Codebase Tavern',
    fullTitle: 'Codebase Tavern',
    year: '2026',
    kind: 'AI · Developer tools',
    oneLiner:
      'Paste a GitHub link and every module becomes a character that explains its code, cites exact lines and argues about who caused your bug.',
    stack: ['Next.js', 'three.js', 'Zustand', 'd3-force', 'OpenAI', 'Gemini'],
    highlights: [
      'Every claim cites [path:line]; citations are checked against the real lines.',
      'The Incident Tribunal: suspects from the import graph argue, and a Judge proposes a fix diff that must apply to the real file.',
      'Import and call graph for JS/TS, Python, Java, Go and Rust.',
      'Falls back from OpenAI to Gemini to templates, with a daily spend cap.',
    ],
    live: 'https://codebase-tavern.vercel.app',
    demo: 'https://codebase-tavern.vercel.app/tavern?demo=1',
    repo: 'https://github.com/m1ssmee/codebase-tavern',
    cover: ['#c2410c', '#fcd34d'],
  },
  {
    slug: 'lunar-rover',
    title: 'Lunar Rover',
    fullTitle: 'Lunar Habitat Safety Rover',
    year: '2026',
    kind: 'Robotics · ROS 2',
    oneLiner:
      'A GPS-denied autonomous rover that maps, navigates and monitors a lunar habitat yard, entirely in simulation.',
    stack: ['ROS 2 Humble', 'Gazebo', 'SLAM Toolbox', 'EKF', 'Nav2', 'Python'],
    highlights: [
      'SLAM Toolbox builds the map from a 2D LiDAR.',
      'An EKF fuses IMU and wheel odometry to localize without GPS.',
      'Nav2 plans around rocks and craters to clicked or scripted goals.',
      'A habitat monitor raises edge-triggered alerts when temperature or O₂ leaves its safe band.',
    ],
    status:
      'Phases 1–5 done. Monitoring, patrol and the one-command demo are code-complete and awaiting test.',
    repo: 'https://github.com/m1ssmee/ISRO_Lunar',
    cover: ['#0f172a', '#f59e0b'],
  },
  {
    slug: 'cropscan',
    title: 'CropScan',
    fullTitle: 'CropScan — crop disease detection',
    year: '2026',
    kind: 'Deep learning · Agriculture',
    oneLiner:
      'Spots 38 crop diseases from a photo of a leaf and suggests a treatment.',
    stack: ['TensorFlow', 'MobileNetV2', 'EfficientNetV2S', 'Flask', 'TFLite'],
    highlights: [
      'Transfer learning on PlantVillage: 54,305 images, 38 classes, stratified 70/15/15 split.',
      'MixUp, label smoothing and cosine LR with warmup, trained on an Apple Silicon GPU.',
      'Flask API returns the top-5 predictions plus a treatment recommendation.',
      'INT8 TFLite export for edge devices.',
    ],
    stats: [
      { label: 'Top-1 accuracy', value: '81.5%' },
      { label: 'Top-5 accuracy', value: '97.4%' },
      { label: 'ROC-AUC (macro)', value: '0.990' },
      { label: 'Inference', value: '49.6 ms' },
    ],
    repo: 'https://github.com/m1ssmee/CropScan',
    cover: ['#14532d', '#a3e635'],
  },
]

export const toolkit: { group: string; items: string[] }[] = [
  { group: 'AI / ML', items: ['Gemini & OpenAI APIs', 'TensorFlow', 'Transfer learning', 'TFLite'] },
  { group: 'Web', items: ['TypeScript', 'Next.js', 'React', 'three.js / R3F', 'Tailwind', 'Framer Motion'] },
  { group: 'Robotics', items: ['ROS 2', 'Gazebo', 'Nav2', 'SLAM Toolbox', 'EKF fusion'] },
  { group: 'Backend', items: ['Python', 'Flask', 'Vercel'] },
]

export const contact: { label: string; value: string; href: string }[] = [
  { label: 'GitHub', value: '@m1ssmee', href: 'https://github.com/m1ssmee' },
  // Add more, e.g.:
  // { label: 'Email', value: 'you@example.com', href: 'mailto:you@example.com' },
  // { label: 'LinkedIn', value: 'in/you', href: 'https://linkedin.com/in/you' },
]
