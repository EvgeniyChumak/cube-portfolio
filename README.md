# Cube portfolio

Yevhen Chumak's interactive portfolio prototype. Six cube faces, nine square sections per face, with two alternating Figma designs. Scroll through the snake route, zoom out during face transitions, and loop back after all 54 sections.

## Local development

Requires a Node.js version supported by Astro 7.

```sh
npm ci
npm run dev
```

Open http://localhost:4333. Development runs in the background. Use `npm run stop`, `npm run status`, and `npm run logs` to manage it.

Scroll or use arrow keys to navigate. Escape returns to the cube overview. Reduced-motion preferences are respected.

## Production

```sh
npm run build
```

Vercel serves the static `dist` directory. All runtime assets are included in `public`; this project has no dependency on the original portfolio directory.
