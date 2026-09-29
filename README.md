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

- **A post** — a folder `src/content/blog/<slug>/index.md`. The folder name is the URL.
- **A project** — an object in `src/data/projects.ts`.
- **A job** — an object in `src/data/experience.ts`.
- **Your name, links, intro** — `src/data/profile.ts`.

## Full documentation

- **[AGENTS.md](AGENTS.md)** — how the site is built: routing, content model, SEO, verification.

## Deploying

`git push` to `main`. GitHub Actions checks, builds and publishes.
