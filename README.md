# portf

Personal portfolio. Astro (static output, zero client framework) + Three.js.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
npm run preview
```

## Layout

- `src/styles/tokens.css` — design tokens (design system foundation, WIP)
- `src/components/Loader.astro` — 张 stroke-order loader, built from `hanzi-writer-data`; shown once per session
- `src/layouts/Project.astro` — project page shell; plays the scene intro (`INTRO_MS`, `src/lib/motion.ts`) then reveals content
- `src/scenes/` — Three.js scenes, loaded only on project pages
  - `cutterhead.ts` — procedural wireframe EPB cutterhead (TBM Simulator)
  - `hashgrid.ts` — 16×16 bit grid resolving to the ERC-20 `Transfer` topic
- `src/data/site.ts` — name, contact links, stack, project list
