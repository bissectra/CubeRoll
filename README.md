# Axis Grid Demo

This project is a minimal TypeScript + p5.js WebGL sketch that draws the XYZ axes with endpoint spheres and a lit grid on the XY plane.

## Setup

```bash
npm install
```

## Development

Start the Vite dev server so the `.ts` source is compiled on the fly and served with the right MIME type.

```bash
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

> Opening `index.html` directly (without the dev server) causes browsers to serve `.ts` files as `video/mp2t`, which prevents the module from loading.

## Production

```bash
npm run build
npm run preview
```

If you only need the static output, inspect `dist/index.html` and its asset references after running `npm run build`.
