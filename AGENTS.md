# AGENTS.md

Read this before changing anything. It is the map of the project: what the pieces
are, which rules are load-bearing, and how to prove a change worked. If you change
the structure, the routing, the content model or the verification setup, update the
matching section here in the same change.

## What this is

A single-page portfolio plus a Markdown blog for a junior backend engineer. Static
output, no server, deployed to GitHub Pages by GitHub Actions.

- React 19 + TypeScript + Vite 7, Tailwind CSS 4
- Posts are Markdown folders in `src/content/blog/<slug>/index.md`, not React components
- Dark/light theme, minimal design, no UI framework
- Everything crawlers need is prerendered at build time, because crawlers and social
  networks do not run JavaScript

## Commands

```bash
npm run dev        # dev server (harnesses expect --port 5199)
npm run build      # tsc -b && vite build -> dist/
npm run typecheck  # tsc -b
npm run lint       # eslint
npm run format     # prettier --write .
npx prettier --check .
```

Never finish a change with a failing typecheck or lint: the deploy workflow runs
both, so a red build blocks the live site.

## Layout

```
build/markdown.ts      Vite plugin: markdown -> post modules, virtual index, images,
                       HMR, the %SITE_URL% substitution, and the static writers
build/post-pages.ts    writes dist/blog/<slug>/index.html, dist/blog/index.html,
                       dist/projects/index.html, dist/experience/index.html,
                       sitemap.xml, robots.txt, CNAME and 404.html
src/content/blog/      one folder per post: <slug>/index.md plus its images;
                       the folder name is the URL
src/content/media/     source art that is not published: the og card's SVG
src/data/              profile, projects, experience, site settings
src/lib/assets.ts      site-root URLs: files in public/ (assetUrl) and the site's
                       own pages (pageUrl)
src/lib/blog.ts        post loading, summaries, prev/next, href helpers
src/lib/seo.ts         runtime meta/canonical/OG updates, and the copy for the
                       listing pages, which the build reads from here
src/hooks/useHashRoute.ts  router: home hashes, /blog/, /blog/<slug>/,
                       /projects/, /experience/, legacy hashes
src/components/layout/PageHeader.tsx  back link + h1 + intro, shared by the
                       three pages that are not the homepage
src/components/layout/SectionHeader.tsx  heading + intro for a block inside the
                       homepage section; the mono marker is optional and unused
src/components/ui/Card.tsx  the card the homepage uses to open a page
src/pages/             Home, BlogPage, BlogPost, ProjectsPage, ExperiencePage,
                       NotFound
public/                favicon.ico + favicon.svg, og.png, profile.jpeg,
                       .nojekyll. robots.txt, sitemap.xml and CNAME are NOT
                       here: they are generated, because each one needs the
                       site URL
.github/workflows/deploy.yml  builds and publishes on every push to main
README.md              the public front page: what the site is, how to run it
                       locally, how to add content
DEPLOY.md              the runbook, for the author: commit -> Pages setting ->
                       DNS -> certificate -> verify, with a troubleshooting table
AGENTS.md              this file: the map, the load-bearing rules, the state
```

## Routing

Two systems, on purpose:

| URL                                                         | Renders                             |
| ----------------------------------------------------------- | ----------------------------------- |
| `/#/about`, `/#/contact`                                    | one homepage, scrolled to a section |
| `/blog/`                                                    | the blog archive                    |
| `/blog/<slug>/`                                             | one post                            |
| `/projects/`                                                | every project                       |
| `/experience/`                                              | the roles, grouped by company       |
| `/#/blog`, `/#/blog/<slug>`, `/#/projects`, `/#/experience` | legacy hashes, still handled        |

Each `kind: 'page'` item in `navItems` is one of those pages and one sitemap
entry, and each `kind: 'section'` item is a `sectionIds` entry in the router. A
new nav item is one line in `src/data/site.ts`; the navbar, the router and the
legacy hashes all read that list. `legacyHashes` beside it is the other half: hashes
that lost their nav item (`about`, `contact`) still resolve to the homepage, because
they are in bookmarks and in the search index, and a 404 would break the promise.

`useHashRoute` owns all of it. Keep these invariants or links break:

- The size of the whole site is one number: `font-size` on `html` in
  `src/index.css` (100% is the 16px browser default). Tailwind's rem scale follows
  it, so a change there moves every piece of text and spacing together.
- `base: './'` in `vite.config.ts` is what lets the site run from a project path.
  The only absolute URLs allowed are the ones the 404 page needs, because GitHub
  Pages serves `404.html` for any missing path.
- `postHref` and `blogHref` in `src/lib/blog.ts` exist because a post link's
  depth depends on where you are: `./` from the archive, `../` from a post. Never
  hardcode a blog link in a component.
- `pageUrl` is how a component links to another of the site's own pages. It
  resolves from the site root at runtime, so it is right from the homepage, from a
  post, from a page, and from a legacy `#/projects` that renders the projects page
  from the homepage's URL. Page links are plain links on purpose: the browser
  navigates, so the address bar ends up holding the new page's own URL, which is
  what the links on that page are relative to. Do not intercept them.
- `siteRootFrom` recognises `/blog`, `/blog/<slug>`, `/projects` and
  `/experience`, which is how it tells a URL inside the site from one already at
  the root. It only rewrites the path for `home` and `not-found`; the pages are
  left alone on purpose.
- `assetUrl` in `src/lib/assets.ts` is the only way a component may point at a
  file in `public/`. It builds the URL from the site root at runtime, because the
  homepage can render while the address bar still holds a post path (click a
  section link from a post), and a document-relative `./profile.jpeg` would 404
  from there and stay broken.

## Content model

- **Post**: `src/content/blog/<slug>/index.md`, frontmatter `title` (required),
  `date`, `description`. A post is a folder so its images sit beside the markdown
  that references them, and the post moves and deletes as one unit. The build
  fails loudly on a missing title, and also on any `.md` that is not a post
  folder's `index.md`, because a stray file is never imported and would
  otherwise be a post that silently never appears. The summary comes from
  frontmatter, not from the body.
- **Profile** (`src/data/profile.ts`): the hero is the intro _and_ the about text,
  so there is no separate About section. `about[0]` is the greeting and becomes
  the page `h1` — the only `h1` on the homepage — which is why it has to keep the
  name in it; `about.slice(1)` are the paragraphs under it, and there is **one** of
  them: four paragraphs made the hero a wall of text that had to be read before the
  cards were reachable, and the cards are the only way on to the rest of the site.
  The cut paragraphs are kept as a comment in that file rather than deleted.
  `avatar` is a file name
  in `public/` (optional: the photo disappears without it), `heroParagraph` is the
  one warm sentence, and `focusAreas` is not rendered anywhere. The section's `id` is
  `about`, not `hero`, because that is the `navItems` target and the id old links
  already use; `#/about` scrolls to the top of the page.
- **The homepage is one section**, not three: `Hero` (the about text) and `Explore`
  (the card grid) are blocks inside a single `<section id="about">` that `Home.tsx`
  owns and pads. They are one piece of writing, and the page ends where the cards
  do. From `lg` up the hero is two columns: the portrait leads on the left (a 176px
  rounded square, vertically centred and nudged a little above the true centre) and
  the prose keeps its `max-w-xl` measure to its right, so the page starts at the
  left edge and the text comes to rest toward the middle; below `lg` it is the
  single
  column it used to be, with the photo as a badge on the greeting line (the small
  badge is `lg:hidden`, the rail is `lg:block` — the photo never appears twice on
  one screen). The visual swap on desktop uses `order`, not markup order, so the
  greeting stays first in the DOM. The section is named by the `h1` in `Hero`, which
  carries
  `id="about-title"`. The hero carries no links and no calls to action: it is the
  introduction, and the cards are the only way on to the rest of the site (the
  socials stay in the navbar). There is no contact
  section: the navbar carries the socials and the email.
- **Section headings** go through `SectionHeader` (`src/components/layout/`): a
  plain heading and an optional intro, no box and no divider. Its mono `index`/`label`
  marker is optional and unused on the page as it stands; a number that counts
  nothing is worse than no number. `Card` likewise takes an optional `count`, shown
  at the right of the label in the accent, because the count is the one number on the
  card; a card has no title, only the description.
- **Project** (`src/data/projects.ts`): `title`, `description`, `technologies`,
  `githubUrl`, `liveUrl`, `status`, `featured`. Those seven fields are the whole
  model: there is no project detail page, so the `problem`, `architecture`,
  `decisions`, `challenges` and `learned` notes were removed rather than left
  behind as fields nothing reads. Do not add a field back without somewhere to
  render it. Note the sample project's `liveUrl` is a typo
  (`digitial`) and is the author's to fix.
- **Experience** (`src/data/experience.ts`): `role`, `period` and the optional
  `company`, `industry`, `responsibilities`, `technologies`. The `description`
  and `achievements` fields were removed: nothing read them, and the page has no
  room for them. Newest first, and consecutive entries at the same `company` are
  grouped into one block by `src/pages/ExperiencePage.tsx`: the company
  is named once with the full span, and each role nests under it with its own
  dates. So a promotion is a second entry above the first (intern, then junior),
  not an edit to the existing one, and it still reads as one tenure. The group
  span is computed by parsing the `period` values, so keep the `Mon YYYY` format
  — that is what makes the span correct. `role` + `period` is the React key, so
  two entries with the same pair is a key collision and the second block silently
  reuses the first's DOM. Growth instructions live in the file header. A role or a
  period with an apostrophe in it breaks the build-time fallback list, which reads
  those fields as quoted text; nothing else about the data is parsed.
- `src/data/site.ts` holds the deployed URL and the nav items. One place to change
  the domain.

`src/components/projects/ProjectCard.tsx` has a deliberate edit by the site owner
(read it before "simplifying" it). Leave it alone.

## Build-time static output

`writePostPages` in `build/post-pages.ts` produces, from `index.html`:

- `blog/<slug>/index.html` per post, `blog/index.html`, and one page per listing
  (`projects/index.html`, `experience/index.html`), each with its own title,
  description, canonical, Open Graph, Twitter card and JSON-LD
- `sitemap.xml` with `lastmod`
- `robots.txt`, whose `Sitemap:` line is the same `site.url` the sitemap is written
  with
- `CNAME`, the custom domain Pages serves the site at, taken from the host of
  `site.url`
- `404.html`, root-absolute assets, `noindex`

`robots.txt`, `sitemap.xml` and `CNAME` are written here rather than committed to
`public/`, because each embeds the site URL and that URL is only known from
`src/data/site.ts`. Keep them out of `public/`: a committed copy is a second
source of truth that silently goes stale, and it is the one kind of file a deploy
can ship wrong without any test noticing. `CNAME` is the sharpest case — a stale
copy would have Pages serving the site at one domain while every canonical, OG
tag and sitemap entry named the other, so the same page is indexed twice.

`CNAME` is written after the pages, from the same `options` object, so it always
describes the URL those pages were built with. The custom domain still has to be
set once in **Settings -> Pages** for the certificate to be issued; the file is
what makes it survive a deploy.

`index.html` holds the URL of the deployed site as the literal token
`%SITE_URL%`, not as a real URL. `patchIndexHtml` swaps in `site.url` after the
build, and `transformIndexHtml` does the same in `serve`, so the dev server and the
built site cannot disagree about the domain. A real URL typed into `index.html`
would work at build time and then be wrong in dev.

Because it starts from `index.html`, any meta tag added there is inherited by every
generated page, then overridden per post. If you add a tag that must differ per
page, add it to the strip list in `writePostPage` first, or posts will ship two
copies of it. The strip patterns use `\s+` after `<meta` because `index.html`
wraps some of those tags across lines, and a tag the pattern misses survives
beside its replacement.

The two listing pages are written from the data files, not from a post: their copy
comes from `pageDescriptions` in `src/lib/seo.ts` and their items from
`src/data/projects.ts` and `src/data/experience.ts`, which `readDataObjects` reads
as text. App code is not importable from the build, and an empty read fails the
build, so a page can never quietly ship blank.

Preview images: `public/og/<slug>.png` if it exists, otherwise `public/og.png`.
Keep the PNG. Twitter, Slack and WhatsApp ignore SVG cards.

## SEO invariants

Already handled, and worth keeping:

- one `<h1>` per page, real `<time dateTime>` on every date
- static per-post and per-listing metadata, canonical URLs, `og:image` at 1200x630
- `BlogPosting`, `Blog` and `CollectionPage` JSON-LD with `inLanguage`; `Person`
  JSON-LD on the homepage
- lazy, async images; self-hosted fonts; the 404 asks robots not to index it
- a real `/blog/` page for every post, not a hash-only site

Placeholder content still in the repo, and the author's to change: the
`kanxo-portfolio` package name, and the social handles marked `TODO` in
`src/data/profile.ts`. The domain is no longer one of them: `site.url` is the
real custom domain, and the DNS records that point it at GitHub Pages are in
DEPLOY.md.

## Dev-server behaviour

`src/content/blog/<slug>/index.md` changes reload the browser (the reader keeps the
loaded
post in React state, so an in-place module swap would leave stale text on screen).
Two details make that correct, and both are load-bearing:

- `hotUpdate` in `build/markdown.ts` invalidates the changed module _and_ the
  virtual index. Without the first, the reload is served the cached transform.
- `server.watch.awaitWriteFinish` in `vite.config.ts` waits for a file to stop
  changing. Without it, a multi-step write is transformed while half-written and
  the app fails to boot with a missing-title error.

`POSTS_DIR` is `path.resolve`d on purpose: Vite reports absolute paths, and a
relative prefix silently never matches.

## Verification

There is no test framework in `package.json`. The checks are Playwright-style CDP
scripts that live **outside the repo**, in `/tmp/opencode`, and they are not
committed. If they are missing, `npm run build` plus a manual pass is the floor.

Current state: of the eight CDP suites below, only unrelated ones
(`verify-cards`, `verify-home`, `verify-type`, `verify-tagline`,
`verify-mobile-nav`, `verify-nav-widths`) are on this machine. `verify.cjs`,
`verify-theme.cjs`, `verify-crawler.cjs`, `verify-blog.cjs`, `verify-nav.cjs`,
`verify-blog-page.cjs`, `verify-dev.cjs`, `verify-cleanup.cjs` and
`gh-pages-server.py` are **absent** — the expected counts below are from when they
last ran and are a target, not a current result. Do not report them as passing
without re-running them.

| Script                 | Covers                                                        | Expected |
| ---------------------- | ------------------------------------------------------------- | -------- |
| `verify.cjs`           | rendered homepage, section order, content from data files     | 49/49    |
| `verify-theme.cjs`     | dark/light, no flash, contrast                                | 20/20    |
| `verify-crawler.cjs`   | built HTML: metadata, JSON-LD, sitemap, assets, 404, indexing | 108/108  |
| `verify-blog.cjs`      | post reader, code blocks, copy, prev/next, 404s               | 33/33    |
| `verify-nav.cjs`       | every link and route, from every depth                        | 18/18    |
| `verify-blog-page.cjs` | the `/blog/` archive                                          | 21/21    |
| `verify-dev.cjs`       | live edits: add, edit, delete, missing title                  | 8/8      |
| `verify-cleanup.cjs`   | cleanup pass: canonicals, og:site_name, headings, theme       | 48/48    |

`verify-domain.mjs` is the one that exists and covers the custom domain: `CNAME`,
the `Sitemap:` line, every sitemap `<loc>` resolving to a real file, one
canonical per page matching its `og:url`, `og:image`/`twitter:image` on the
domain, JSON-LD `url`/`image`/`@id`, no unsubstituted `%SITE_URL%`, no
`github.io` in metadata, and the 404's `noindex` and root-absolute assets. It
needs only `npm run build` first — no browser, no server.

```bash
npm run build
node /tmp/opencode/verify-domain.mjs          # 115/115, no server needed

# the CDP suites, when they are back:
npm run build
rm -rf /tmp/opencode/ghpages/portfolio-site
mkdir -p /tmp/opencode/ghpages/portfolio-site && cp -r dist/* /tmp/opencode/ghpages/portfolio-site/
cd /tmp/opencode && python3 gh-pages-server.py &   # serves the copy on :4180
node verify.cjs && node verify-theme.cjs && node verify-crawler.cjs
node verify-blog.cjs && node verify-nav.cjs && node verify-blog-page.cjs
node verify-cleanup.cjs

# the dev suite needs a browser on the CDP port and the dev server on 5199
npm run dev -- --port 5199 --strictPort &
node verify-dev.cjs
```

`verify-dev.cjs` creates and deletes `zz-*` fixture folders in `src/content/blog/`.
Nothing in `.gitignore` matches them, so if a run is killed, delete any leftover
`zz-*` folder by hand before the next commit, or it will be published as a post.

## Deploy

The full flow, end to end:

```
edit src/data/*.ts or src/content/blog/<slug>/index.md
  -> npm run typecheck && npm run lint && npx prettier --check .
  -> git add -A && git commit && git push            (to main)
  -> Actions: install -> typecheck -> lint -> prettier --check -> build -> artifact
  -> deploy-pages uploads dist/ to GitHub Pages
  -> Pages serves it at pdlmanoj.com.np, over the cert it issued
  -> src/lib/seo.ts rewrites the meta tags in the live tab; crawlers already have them
```

The three checks before the build are the reason a change is not allowed to land
half-done: a failed typecheck, lint or format check fails the deploy, so the live
site is never a broken build. Concurrency is `cancel-in-progress`, so a newer push
supersedes an in-flight one.

One-time repo setting: **Settings -> Pages -> Build and deployment -> Source:
GitHub Actions**. Without it the run fails at _Setup Pages_ with a 404 from the
Pages API.

The domain's own setup is not in the repo: the eight `A`/`AAAA` records that send
`pdlmanoj.com.np` to GitHub Pages, and the grey-cloud decision that keeps TLS
simple, are spelled out in [DEPLOY.md](DEPLOY.md), which is the step-by-step
runbook from "commit the source" to "the domain answers over HTTPS". Nothing in a
build can fix a DNS record. The public `README.md` carries the short version of
the same thing for anyone reading the repo on GitHub.

`dist/` and `node_modules/` are gitignored on purpose. Never commit a build.

## Current state

Measured, not assumed. Re-measure before relying on any of it — the first three
items are all "not done yet" and each one is a prerequisite for the next.

- **The site source is uncommitted.** `git ls-files` holds only `package.json`,
  `index.html`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`,
  `.gitignore`, the workflow and `public/`. `src/`, `build/`, `vite.config.ts`,
  the three `tsconfig*.json`, `README.md`, `DEPLOY.md` and this file are untracked.
  Both deploys so far failed with `TS5083: Cannot read file .../tsconfig.json`,
  which is what an empty source tree looks like to `tsc -b`. Committing is the
  one thing standing between this repo and a live site.
- **Pages has never been enabled** for `pdlmanoj/portfolio-site` (the Pages API
  returns 404), and `https://pdlmanoj.github.io/portfolio-site/` 404s.
- **`pdlmanoj.com.np` is on Cloudflare and currently returns 404** — the previous
  site on that domain is gone. The zone is served by
  `mitchell`/`macy.ns.cloudflare.com` and the apex still resolves to Cloudflare's
  proxy addresses (`172.67.182.243`, `104.21.67.234`), so the eight GitHub
  records have not been entered yet. `www` resolves too and points at Cloudflare;
  Pages will not serve it, so it needs deleting or a Cloudflare redirect rule.
- **Content**: one post (`how-function-execute-in-memory`, dated 2025-05-03), two
  projects, one role. The `site.url` work is done — apex, no trailing slash, and
  `CNAME` generated from it.

## Ground rules

- Match the existing style: comments explain _why_, not _what_; no new dependencies
  without a reason the author can see
- Keep the bundle small. The blog reader is already lazy-loaded; do not undo that
- `prettier --check .`, `npm run typecheck` and `npm run lint` all pass before you
  call a change done
- Do not delete post content, images or data files to "clean up". Ask first. There
  is no git history yet, so a deletion cannot be undone
- Placeholder content still in the repo: the sample project (Digital Wallet
  API), and the `TODO` markers on the social handles, the email and the job
  title. Both are waiting on the author's decision, not on a code change. The
  earlier `new-post.md` and the unreferenced `inside-memory-visualization.png`
  are gone from the tree — do not reinstate either.
- An exported symbol that nothing imports is dead. A field nothing renders is
  dead. Remove both, and drop the file's comment about them in the same change, so
  the docs do not describe a model the code no longer has.
