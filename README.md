# Manoj Paudel — portfolio & blog

My personal site: a portfolio, a list of projects, the roles I've had, and a blog where I write
about backend systems. It lives at **[pdlmanoj.com.np](https://pdlmanoj.com.np)**.

Static site — plain HTML, no server, no CMS, no database. React and TypeScript, built with Vite,
deployed to GitHub Pages. Crawlers and social networks get real pages with real metadata, because
none of them run JavaScript.

I am a junior backend developer working in fintech, mostly Python, FastAPI, PostgreSQL, Redis and
Docker. [LinkedIn](https://www.linkedin.com/in/pdlmanoj) · [GitHub](https://github.com/pdlmanoj)

---

## Run it locally

Node 22 or newer.

```bash
git clone https://github.com/pdlmanoj/portfolio-site.git
cd portfolio-site
npm install
npm run dev
```

That serves it at http://localhost:5173. Nothing else to configure — no env file, no keys, no backend.

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | dev server with hot reload                                    |
| `npm run build`     | type-check, then build the static site into `dist/`           |
| `npm run preview`   | serve the built `dist/` — the real output, not the dev server |
| `npm run typecheck` | TypeScript only                                               |
| `npm run lint`      | ESLint                                                        |
| `npm run format`    | Prettier, writing the fixes                                   |

If something works in `dev` but not in `build`, check it with `npm run preview` first: that is the
output that actually gets deployed.

## Adding content

Everything is content, and content is not code. You should never need to open a component to add a
post, a project or a job.

**A blog post** — create a folder `src/content/blog/<slug>/index.md`. The folder name is the URL:
`how-functions-run/` becomes `/blog/how-functions-run/`. Put images in the same folder and reference
them as `![alt](./diagram.png)`.

```md
---
title: 'What actually happens during a TCP connection?'
date: '2025-05-03' # optional
description: 'Sockets, ports and the three-way handshake, from the packets up.'
---

Markdown. Fenced code blocks, tables and images all work.
```

`title` is the only required field. Save it and the dev server reloads: the post is in the list, its
own page exists at `/blog/<slug>/`, and its title, description and social card are already in the
HTML.

**A project** — add an object to the top of the array in `src/data/projects.ts`. Only `title` and
`description` are required; the links and badges appear only when you fill them in, so there are never
dead links.

```ts
{
  title: 'Order Service',
  description: 'One or two sentences on what it does and why it exists.',
  technologies: ['Python', 'FastAPI', 'PostgreSQL'],
  status: 'live',            // 'live' | 'in-progress' | 'archived'
  featured: false,           // true -> larger card at the top
  githubUrl: 'https://github.com/pdlmanoj/order-service',
  liveUrl: '...',            // optional, only if you have a demo
}
```

**A job** — add an object to `src/data/experience.ts`, newest first. Keep `period` in the
`Mon YYYY — Present` format: consecutive entries at the same `company` are grouped into one block
with the full span, and the span is parsed from those values.

## Layout

```text
build/                 runs at build time, never shipped
  markdown.ts             markdown -> HTML, syntax highlighting, post index, static writers
  post-pages.ts           one HTML page per post and per listing, plus sitemap/robots/CNAME/404
src/
  data/                 <- all content: site.ts, profile.ts, projects.ts, experience.ts
  content/blog/<slug>/  <- one folder per post: index.md + its images
  components/           layout, sections, blog, projects, ui
  pages/                Home, BlogPage, BlogPost, ProjectsPage, ExperiencePage, NotFound
  hooks/                useHashRoute, useTheme
  lib/                  blog helpers, project ordering, asset URLs, SEO metadata
public/                 favicon, og.png, profile.jpeg, .nojekyll
index.html              the static defaults for title, canonical, Open Graph, Twitter, JSON-LD
```

## How it works

- **Every page is a real file.** The build writes `blog/<slug>/index.html`, `blog/index.html`,
  `projects/index.html`, `experience/index.html` and a `404.html`, each with its own title,
  description, canonical URL and share card baked into the markup. A post behind a hash route could
  only ever preview as the homepage, because the fragment never reaches the server.
- **Hashes only for sections of the homepage.** `#/about` is resolved by the browser before any
  request is made, so it works on a static host with no server config. Everything else is a path.
- **Assets are relative** (`base: './'` in `vite.config.ts`), so the build runs from a domain root or
  a project path without changing.
- **The domain lives in one place**, `url` in `src/data/site.ts`. `robots.txt`, `sitemap.xml` and
  `CNAME` are generated from it, and `index.html` refers to it by a `%SITE_URL%` token the build
  substitutes — so the canonical URL, the share card, the sitemap and the address the site is served
  at cannot drift apart.
- **Theme is CSS variables**, written once for light and once for dark. No component contains a
  `dark:` variant, and an inline script in `index.html` sets the theme before first paint so the page
  never flashes the wrong colours.

## Deploying

`git push` to `main` is the whole release. GitHub Actions installs, checks formatting, type-checks,
lints, builds, and publishes `dist/` to GitHub Pages. A red typecheck, lint or format check fails
the deploy on purpose.
