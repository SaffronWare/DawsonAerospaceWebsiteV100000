/* =========================================================
   DAC — Dawson Aerospace Club — seed project data
   These are the club's real, current programs. Add more from
   the admin page — anything added there merges in at runtime
   from localStorage alongside this list.
   Schema:
   {
     id, title, slug, description, longDescription,
     imageUrl, gallery[], status, tags[],
     category: "current" | "future",
     division: "Avionics" | "Formula FRC" | "Rocketry" | "General",
     createdAt, updatedAt
   }
   ========================================================= */

const DAC_SEED_PROJECTS = [
  {
    id: "seed-janice-rc-plane",
    title: "Janice — RC Plane Restoration",
    slug: "janice-rc-plane-restoration",
    description: "Our first official project: fully electrifying a gas-powered RC plane named Janice, including a flight controller built from scratch.",
    longDescription: "Janice is a gas-powered, single-cylinder RC plane and the Dawson Aerospace Club's first official project. Rather than restore her gas engine, we're fully electrifying her — redesigning the nose for the new motor, gutting the interior for new hardware, and building an onboard flight controller from scratch. The project is funded by a SEEDS grant from the Dawson Foundation.",
    imageUrl: "",
    gallery: [],
    status: "Active",
    tags: ["Electrification", "Flight Controller", "CAD", "Embedded Systems"],
    category: "current",
    division: "Avionics",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "seed-amateur-rocketry",
    title: "Amateur Rocketry Program",
    slug: "amateur-rocketry-program",
    description: "The club's home base for amateur rocketry at Dawson — CAR/ACF certification, custom motor building, and hands-on launch experience.",
    longDescription: "DAC is the primary hub for amateur rocketry at Dawson College. Members work toward CAR/ACF certification, build custom rocket motors, and gain hands-on experience across the field, preparing for Launch Canada Junior next year as Canada's space industry continues to grow.",
    imageUrl: "",
    gallery: [],
    status: "Active",
    tags: ["Certification", "Motor Building", "Launch Ops"],
    category: "current",
    division: "Rocketry",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "seed-frc",
    title: "FRC — FIRST Robotics Competition",
    slug: "frc-first-robotics-competition",
    description: "Our FIRST Robotics Competition branch, giving new members hands-on engineering experience under the guidance of our own FRC veterans.",
    longDescription: "FIRST Robotics Competition is one of the largest STEM competitions in the world, and a strong entry point for new members to gain real engineering experience. We intend for the FRC branch to be run entirely by first-year members, with supervision from our own FRC veterans.",
    imageUrl: "",
    gallery: [],
    status: "Active",
    tags: ["Robotics", "Mechanical Design", "Controls"],
    category: "current",
    division: "Formula FRC",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "seed-launch-canada",
    title: "Launch Canada",
    slug: "launch-canada",
    description: "Canada's largest student rocketry competition — we're building the team to become the first CEGEP students to compete.",
    longDescription: "Launch Canada is the largest student rocketry competition in the country, and we intend to be the first CEGEP students to compete in it. We're building an experienced team for Launch Canada Junior, the high-school-level competition, as a stepping stone toward a university-level rocketry program.",
    imageUrl: "",
    gallery: [],
    status: "Planned",
    tags: ["Competition", "Team Building", "Rocketry"],
    category: "future",
    division: "Rocketry",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "seed-fsae",
    title: "FSAE",
    slug: "fsae",
    description: "Planned entry into the FSAE competition, putting our mechanical engineering members' skills toward electrified vehicle design.",
    longDescription: "As the automotive industry electrifies fast, the Dawson Aerospace Club intends to enter the FSAE competition next year. Many of our members are motivated mechanical engineering technology students who've found a practical way to apply what they've learned.",
    imageUrl: "",
    gallery: [],
    status: "Planned",
    tags: ["Vehicle Design", "Mechanical Engineering", "Electrification"],
    category: "future",
    division: "Formula FRC",
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z"
  }
];
