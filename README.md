# Sabrina Muqadas — Portfolio

A static, no-build personal portfolio for **Sabrina Muqadas**, Business Development & Growth professional (Islamabad, Pakistan).
Built with semantic HTML5, modern CSS (custom properties), vanilla ES modules and JSON content. It is designed to be hosted on **GitHub Pages** at `https://sabrinamuqadas.github.io/`.

- No framework, no bundler, no backend, no runtime dependencies.
- Dark theme by default, light theme available, choice remembered in `localStorage`.
- Accessible (WCAG 2.2 AA target), responsive from 320px to 1920px+, respects `prefers-reduced-motion`.
- Content lives in one file: [`assets/data/portfolio.json`](assets/data/portfolio.json).

---

## Project structure

```
index.html                  Static-first page shell (works as readable HTML even before JS runs)
404.html                    Not-found page
manifest.json  sw.js        PWA install + offline support
.htaccess                   Apache: disable directory browsing (Laragon / shared hosting)
robots.txt  sitemap.xml     SEO
.nojekyll                   Tells GitHub Pages to serve files as-is
assets/
  css/                      variables, base, layout, components, animations, responsive (imported by main.css)
  js/                       main, config, data, components, navigation, theme, animations, contact, utils, early
  data/portfolio.json       All site content
  fonts/                    Self-hosted variable fonts (Manrope, Inter, JetBrains Mono)
  image/                    logo, favicon, og-image, icons.svg sprite, PWA icons/, tools/, illustrations/
  resume/                   Put Sabrina-Muqadas-CV.pdf here (see below)
```

Each asset folder also contains a small `index.html` that returns a 403-style page. That blocks directory listing on GitHub Pages (which ignores `.htaccess`). Direct links to real files still work.

How it fits together:

1. `index.html` ships real text for the hero, about, contact and footer, so crawlers and no-JS visitors still get content.
2. `assets/js/main.js` loads `portfolio.json`, validates its shape and renders each `data-render="…"` container with safe DOM APIs (`createElement` / `textContent`, never `innerHTML`).
3. If the JSON fails to load, the static HTML stays in place and a small notice is shown.

---

## Run locally

The site fetches `portfolio.json`, so it **cannot be opened via `file://`** (browsers block `fetch` there). Serve the folder over HTTP:

```bash
# Python 3
python -m http.server 8080
# then open http://127.0.0.1:8080/

# or Node
npx serve .
```

With Laragon, the project already works at `http://sabrinamuqadas.test/` (or whatever virtual host Laragon creates for the folder).

No install or build step is needed.

---

## Deploy to GitHub Pages

### Option A — user site (recommended): `https://sabrinamuqadas.github.io/`

1. Create a repository named exactly `sabrinamuqadas.github.io`.
2. Push the contents of this folder to the `main` branch (the files must be at the repo root).
3. In **Settings → Pages**, set *Source* to **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Wait for the first build, then open the URL.

This is what the project is configured for out of the box (`<base href="/">` in `404.html`, absolute URLs in canonical, sitemap and Open Graph tags).

### Option B — project site: `https://<user>.github.io/<repo>/`

Everything on the main page uses relative paths and keeps working. You must update:

- `404.html`: change `<base href="/">` to `<base href="/<repo>/">`.
- `index.html`: `canonical`, `og:url`, `og:image`, `twitter:image` and the JSON-LD URLs.
- `sitemap.xml` and `robots.txt` (sitemap URL).
- `assets/js/config.js` → `siteUrl`.

### Custom domain

Add a `CNAME` file containing the domain, then update the same URLs listed in Option B.

---

## Editing content

Almost everything is data-driven. Edit `assets/data/portfolio.json` and reload.

| Group | What it controls |
| --- | --- |
| `profile` | Name, headline, location (city level), contact details, `mapPosition`, `photo`, `cv` |
| `branding` | Tagline and positioning copy |
| `navigation` | Header links (`id` must match a section id) |
| `highlights` | Snapshot cards and counters |
| `about` | About story, pillars, career progression |
| `expertise` | Bento cards (title, summary, items, details) |
| `experience` | Employers and roles, responsibilities, skills, tools |
| `growthStrategy` | The 8 lifecycle stages |
| `industries`, `industryGroups`, `markets` | Industry chips and the map markets (`map` coordinates) |
| `tools` | Tool cards. `icon` is a file in `assets/image/tools/` or `null` for a monogram tile |
| `valueProposition` | “What I bring” list |
| `projects` | Selected work (see below) |
| `education`, `languages`, `interests` | Education and personal sections |
| `contact`, `socialLinks` | Contact list and social buttons (`enabled: false` hides one) |
| `sectionVisibility` | Per-section on/off switch |

### Keep static HTML and JSON in sync

For SEO and no-JS fallback, some copy is **duplicated** in `index.html` (hero, about, contact, footer, meta tags, JSON-LD). When you change those in `portfolio.json`, update the matching text in `index.html` too. The renderer will overwrite the text at runtime, so a mismatch is visible only to crawlers and no-JS visitors.

### Add real projects (Selected Work)

The **Selected Work** section is hidden because no verified projects exist yet. Nothing is invented: it only appears once you add real ones.

1. Add entries to `projects` in `portfolio.json`:

```json
{
  "id": "outbound-saas-pipeline",
  "title": "Project title",
  "category": "Lead Generation",
  "image": { "src": "./assets/image/projects/example.webp", "alt": "Describe the image" },
  "challenge": "What problem the client had.",
  "approach": "What you did.",
  "tools": ["Apollo", "Google Sheets"],
  "deliverables": ["Prospect list", "Outreach sequence"],
  "outcomes": ["Only real, verifiable results"],
  "caseStudy": ["Optional extra paragraphs"],
  "link": { "label": "Visit project", "url": "https://example.com" },
  "download": { "label": "Download PDF", "url": "./assets/resume/case-study.pdf" }
}
```

2. Set `"sectionVisibility": { "projects": true }`.

`image`, `caseStudy`, `link`, `download` and `tools` are optional. A category filter appears automatically when there is more than one category. Only publish outcomes and metrics that are real and that the client has agreed to share.

### Profile photo

By default a monogram “SM” is shown. To use a photo, add it (ideally a square-ish portrait, WebP or JPG, under ~150 KB) and set:

```json
"profile": { "photo": { "src": "./assets/image/sabrina.webp", "alt": "Portrait of Sabrina Muqadas" } }
```

### CV / résumé

Place the PDF at `assets/resume/Sabrina-Muqadas-CV.pdf`. The site checks for it with a quick `HEAD` request:

- File exists → the “Request CV” buttons become **Download CV**.
- File missing → they become a “Request CV” email link (so there is never a dead link). A single, harmless 404 may appear in the console until the PDF exists.

Set `features.verifyCvFile` to `false` in `config.js` to skip the check and always show the download link.

---

## Contact form

The form validates on the client (labels, `aria-invalid`, inline errors, live status) and has spam protection (hidden honeypot field, minimum fill time, 30 s cooldown).

**Default: mailto.** With `contact.endpoint` empty in `assets/js/config.js`, submitting opens the visitor's email app with a prefilled message to `sabrinamuqadas@gmail.com`. No third party is involved.

**Switch to a form service (Formspree, Web3Forms, …):**

1. Create a form with the provider and copy its endpoint URL.
2. In `assets/js/config.js` set `contact.endpoint`, e.g. `https://formspree.io/f/xxxxxxx`.
3. Check the `Content-Security-Policy` meta tag in `index.html`: `connect-src` and `form-action` already allow `formspree.io` and `api.web3forms.com`. Add your provider's origin there if you use another one.

The request is a JSON `POST`. Do not put secret API keys in the repository; public form endpoints and access keys are designed to be public.

---

## Theme and design tokens

All design tokens are CSS custom properties in `assets/css/variables.css`:

- Colors: `--bg`, `--bg-alt`, `--surface`, `--accent` (#2DD4BF), `--accent-2` (#818CF8), `--gold` (#D4B483), `--text`, `--text-muted`.
- The dark theme is the default (`:root`). Light overrides live under `[data-theme="light"]`.
- Type scale (`--fs-*`), spacing (`--space-*`), radii, shadows and motion (`--dur-*`, `--ease-*`).

Theme logic: `assets/js/early.js` runs before first paint (saved choice → system preference → dark) to avoid a flash. `assets/js/theme.js` handles the toggle and persistence (`localStorage` key `sm-theme`).

The logo (`assets/image/logo.png`) is kept untouched; a per-theme CSS filter adapts it to the dark theme.

### Motion

Animations are CSS-first and triggered by `IntersectionObserver`. They pause off-screen and in background tabs, and are removed entirely under `prefers-reduced-motion: reduce`. Individual effects (magnetic buttons, card tilt, parallax, role rotator) can be switched off in `config.js → features`.

---

## SEO checklist

- Title, description, canonical, Open Graph and Twitter tags are in `index.html`.
- Structured data (`WebSite` + `Person`) is in the JSON-LD block in `index.html`.
- `og-image.jpg` is 710×638. For best social previews replace it with a 1200×630 image (same filename, or update the meta tags).
- Drop these favicon files into `assets/image/icons/` (paths already wired in `index.html`):
  - `favicon.ico`
  - `favicon-32x32.png`
  - `favicon-96x96.png`
  - `favicon.svg`
  - `favicon.png` (180×180 Apple touch icon)
  - Plus the existing PWA icons: `icon-192.png`, `icon-512.png`
- Update `lastmod` in `sitemap.xml` when you publish significant changes.
- Only city-level location (Islamabad) is published; keep the street address off the site.

---

## Offline use and install (PWA)

The site is installable on desktop and mobile:

- `manifest.json` defines the app name, colours (`#0B1220`) and icons.
- `sw.js` precaches the app shell (HTML, CSS, JS, fonts, core images, `portfolio.json`) and uses network-first for navigations / stale-while-revalidate for static assets.
- After the first successful visit over HTTPS (or localhost), reload once, then the site works offline. Large CV PDFs under `assets/resume/` are intentionally not cached.
- Browsers show an install prompt (Chrome/Edge: install icon in the address bar; mobile: “Add to Home Screen”).
- When you change cached assets, bump `VERSION` at the top of `sw.js` (for example `sm-shell-v2`) so clients drop the old cache.

## Optional analytics

Off by default (no tracking, no cookies). To enable privacy-friendly [Plausible](https://plausible.io/) analytics set in `config.js`:

```js
analytics: { provider: 'plausible', domain: 'sabrinamuqadas.github.io', scriptUrl: 'https://plausible.io/js/script.js' }
```

Then allow `https://plausible.io` in the `script-src` and `connect-src` directives of the CSP meta tag in `index.html`.

---

## Assets and licensing notes

- **Fonts**: Manrope, Inter and JetBrains Mono (SIL Open Font License), self-hosted as variable WOFF2.
- **Tool brand marks** in `assets/image/tools/` come from [Simple Icons](https://simpleicons.org/) (CC0). The marks remain trademarks of their respective owners and are used only to identify the tools Sabrina works with. Tools without an available mark use a neutral monogram tile.
- **World map** (`illustrations/world-dots.svg`) is a dot-matrix rendering generated from Natural Earth data (public domain).
- Unused stock photos remain in `assets/image/` from the previous version of the site; they can be deleted if not needed. `assets/image/index.html` is a directory-listing guard and is left untouched.

---

## Accessibility and security notes

- Skip link, semantic landmarks, visible focus styles, keyboard-operable tabs/disclosures/dialog, `aria-live` form status, 44px touch targets on controls.
- A strict Content-Security-Policy is set via `<meta>` (`default-src 'self'`); there is no inline JavaScript or CSS, and no inline event handlers.
- External links use `rel="noopener noreferrer"`. Content from JSON is always inserted as text, and URLs are validated before use.
- No secrets, tokens or private data are stored in the repository.

---

## Quick troubleshooting

| Symptom | Fix |
| --- | --- |
| Blank sections / “content could not be loaded” notice | You opened the file via `file://`; serve it over HTTP (see *Run locally*). Also check `portfolio.json` is valid JSON. |
| Change in CSS/JS not visible | Hard refresh (Ctrl+F5); GitHub Pages caches assets for a few minutes. |
| Form opens the email app instead of sending | Expected until `contact.endpoint` is set in `config.js`. |
| Icons missing | Make sure `assets/image/icons.svg` is deployed and served from the same origin. |
