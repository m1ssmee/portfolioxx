// Everything Pod OS shows, in one place: edit this file, not the UI code. The same content also
// becomes the page's hidden semantic HTML and the "plain view" page (vite.config.js builds both, so
// keep this file plain data: no imports). Anything left empty ('' or []) is simply not shown.
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
  /** Image URLs: put the files in public/media/ and list them as './media/name.png' (they load before entry); empty: no pictures. */
  screenshots: string[]
  whatItIs: string
  whatIBuilt: string
  challenges: string[]
  github?: string
  live?: string
}

export interface Portfolio {
  name: string
  /** Shown at the top left, on About & contact and the plain view. */
  role: string
  /** Initials for the avatar when there is no photo. */
  initials: string
  /** A photo URL ('./media/me.jpg', the file in public/media/), or empty for the initials. */
  photo: string
  bio: string
  /** Where you are (empty: not shown). */
  basedIn: string
  projects: Project[]
  /** Empty: no email on the contact page. */
  email: string
  /** Each one empty: not shown. */
  links: { github: string; linkedin: string; x: string }
}

export const portfolio: Portfolio = {
  name: 'Krish P.',
  role: 'AI engineer · builder',
  initials: 'KP',
  photo: '',
  bio: 'I build AI products people can actually use: a 3D body that explains your medical reports, a tavern where your codebase’s modules argue about who caused the bug, deep learning for crop disease and a GPS-denied lunar rover. I care about grounding: answers that cite their source, and numbers computed rather than guessed.',
  basedIn: '',
  projects: [
    {
      id: 'bodymap',
      name: 'BodyMap',
      oneLiner: 'Upload a medical report: every finding is pinned to a 3D body and explained in plain language.',
      stack: ['Next.js', 'React Three Fiber', 'Gemini', 'Tailwind', 'Vercel'],
      year: 2026,
      screenshots: [],
      whatItIs:
        'Upload a prescription, blood report, X-ray, MRI, CT or ultrasound. Gemini reads it, every finding is pinned to a 3D body, and everything is explained in plain language for older patients. No login, no database: records stay in the browser.',
      whatIBuilt:
        'The whole app: the route that reads every kind of report into one strict schema with Gemini, the 3D body built from the MakeHuman base mesh where findings glow by severity, and filtering by body region or by record.',
      challenges: [
        'Lab severity is computed from the printed reference range, not guessed by the model.',
        'Keeping it up: Gemini keys rotate on every request, a failing key is skipped, and the next model is tried when one is overloaded.',
      ],
      github: 'https://github.com/m1ssmee/bodymap',
      live: 'https://bodymap-qu9s.vercel.app',
    },
    {
      id: 'codebase-tavern',
      name: 'Codebase Tavern',
      oneLiner: 'Paste a GitHub link: every module becomes a character that explains its code, cites the exact lines and argues about who caused your bug.',
      stack: ['Next.js', 'three.js', 'Zustand', 'd3-force', 'OpenAI', 'Gemini'],
      year: 2026,
      screenshots: [],
      whatItIs:
        'Every module of a repo becomes a character: it explains its own code, cites the exact lines and argues with the others about who caused your bug. Describe an incident and the Tribunal picks suspects from the import graph, hears them out and proposes a fix.',
      whatIBuilt:
        'Ingest and analysis (up to 300 files; an import and network-call graph for JS/TS, Python, Java, Go and Rust), casting modules as procedural 3D characters, the AI layer, and the 3D stage where the characters walk to the lines they talk about.',
      challenges: [
        'Grounding: every [path:line] citation is checked against the real lines, and the Judge’s fix diff must apply to the real file.',
        'Cost and uptime: OpenAI falls back to Gemini, then to templates written from real stats, with a daily spend cap.',
      ],
      github: 'https://github.com/m1ssmee/codebase-tavern',
      live: 'https://codebase-tavern.vercel.app',
    },
    {
      id: 'lunar-rover',
      name: 'Lunar Habitat Safety Rover',
      oneLiner: 'A GPS-denied ROS 2 rover that maps, navigates and monitors a lunar habitat yard, entirely in simulation.',
      stack: ['ROS 2 Humble', 'Gazebo', 'SLAM Toolbox', 'Nav2', 'Python'],
      year: 2026,
      screenshots: [],
      whatItIs:
        'An autonomous rover for a lunar habitat yard, in simulation and with no GPS: it maps the yard, navigates around rocks and craters, and raises an alert when temperature or O₂ leaves its safe band.',
      whatIBuilt:
        'The skid-steer rover in Gazebo Fortress (2D LiDAR, depth camera, IMU), its localization, Nav2 navigation to clicked or scripted goals, and the habitat-monitoring subsystem with its own ROS 2 messages.',
      challenges: [
        'Localizing without GPS: an EKF fuses IMU and wheel odometry, and SLAM Toolbox builds the map from the LiDAR.',
        'Edge-triggered alerts: the monitor reports NOMINAL, WARNING or CRITICAL, and alerts the moment a reading leaves its safe band.',
      ],
      github: 'https://github.com/m1ssmee/ISRO_Lunar',
    },
    {
      id: 'cropscan',
      name: 'CropScan',
      oneLiner: 'Detects 38 crop diseases from a photo of a leaf and suggests a treatment.',
      stack: ['TensorFlow', 'MobileNetV2', 'EfficientNetV2S', 'Flask', 'TFLite'],
      year: 2026,
      screenshots: [],
      whatItIs:
        'An end-to-end deep learning system that classifies 38 plant-disease categories from leaf photos (PlantVillage, 54,305 images) and serves each prediction with a treatment recommendation.',
      whatIBuilt:
        'Transfer learning on MobileNetV2 and EfficientNetV2S, trained on an Apple Silicon GPU with MixUp, label smoothing and a cosine learning rate with warmup; a Flask API returning the top five predictions and a treatment; an INT8 TFLite export for edge devices. MobileNetV2: 81.5% top-1, 97.4% top-5, 0.990 ROC-AUC, 49.6 ms an image.',
      challenges: [
        'An honest evaluation: a stratified 70/15/15 split with no test-time leakage, stricter than benchmarks that report accuracy on augmented test sets.',
        'Look-alike diseases, such as early and late blight, cause most of the errors; the 0.990 ROC-AUC shows the model still ranks them well.',
      ],
      github: 'https://github.com/m1ssmee/CropScan',
    },
  ],
  email: '',
  links: {
    github: 'https://github.com/m1ssmee',
    linkedin: '',
    x: '',
  },
}
