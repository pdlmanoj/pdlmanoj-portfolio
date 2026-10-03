# Manoj Paudel — portfolio & blog

Live site: **[pdlmanoj.com.np](https://pdlmanoj.com.np)** — a portfolio, projects, work history and a
blog about backend systems.
Static site (React + TypeScript + Vite), no server, deployed to GitHub Pages.

## Run it locally

```bash
npm install
npm run dev
```

## Add something

- **A post** — a folder `src/content/blog/<slug>/index.md`. The folder name is the URL. Add
  `image: ./cover.png` to its frontmatter and that picture (a PNG or JPEG, beside the markdown)
  is what the post previews as when the link is shared.
- **A draft** — the same folder with `published: false` in its frontmatter, while you are still
  writing it. Nothing published changes: no page, no blog listing, no sitemap entry. Drop the line
  when the post is finished. It still previews at `/blog/<slug>/` on `npm run dev`.
- **A project** — an object in `src/data/projects.ts`.
- **A job** — an object in `src/data/experience.ts`.
- **Your name, links, intro** — `src/data/profile.ts`.

## Full documentation

- **[AGENTS.md](AGENTS.md)** — how the site is built: routing, content model, SEO, verification.

## Deploying

`git push` to `main`. GitHub Actions checks, builds and publishes.
