// TODO: replace the contact placeholders with your real handles before deploying.
export const site = {
  name: "David Tiw Minjie",
  role: "Software engineer — React & Go",
  email: "david.tiw.minjie@gmail.com",
  github: "https://github.com/dtiw97",
  linkedin: "https://www.linkedin.com/in/davidtiw/",
};

export const stack = [
  { group: "Interface", items: ["React", "TypeScript", "D3.js", "Three.js", "WebGL", "Astro"] },
  { group: "Services", items: ["Go", "Gin", "WebSocket", "REST", "PostgreSQL", "SQLite"] },
  { group: "Industrial", items: ["OPC UA", "Real-time simulation"] },
  { group: "Web3", items: ["Solidity", "ERC-20", "EVM"] },
  { group: "Tooling", items: ["Blender", "Git", "Docker"] },
];

export type Project = {
  slug: string;
  index: string;
  title: string;
  kicker: string;
  summary: string;
  tags: string[];
};

export const projects: Project[] = [
  {
    slug: "tbm-simulator",
    index: "01",
    title: "TBM Simulator",
    kicker: "Industrial simulation",
    summary:
      "A tunnel boring machine you can train on. A Go physics core writes machine state to OPC UA and streams it to live 3D and analytics in the browser.",
    tags: ["Go / Gin", "OPC UA", "WebSocket", "PostgreSQL", "D3.js", "Three.js"],
  },
  {
    slug: "erc20-contracts",
    index: "02",
    title: "ERC-20 Contracts",
    kicker: "Web3 application",
    summary:
      "Solidity contracts with a clear split between public entry points and private logic, settling value as ERC-20 transfers.",
    tags: ["Solidity", "ERC-20", "EVM", "React"],
  },
];
