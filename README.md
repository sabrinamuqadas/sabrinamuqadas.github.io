# Sabrina Muqadas

Personal portfolio for **Sabrina Muqadas**, a Growth & Business Development Executive based in Islamabad, Pakistan.

The site is built to present her work clearly and professionally: Upwork bidding, LinkedIn and email outreach, cold calling, lead generation, and AI-driven growth workflows. It highlights experience across the **USA, UK, UAE, and KSA**, without inventing metrics, testimonials, or projects that are not real.

**Live site:** [sabrinamuqadas.github.io](https://sabrinamuqadas.github.io/)

---

## Stack

HTML, CSS, vanilla JS, JSON-driven content, Service Worker.  
Shipped on **GitHub Pages** — no framework, no bundler, no backend, and no install step.

| Piece | Role |
| --- | --- |
| `index.html` | Page structure and SEO-friendly fallback content |
| `assets/css/` | Design system, layout, components, motion |
| `assets/js/` | Theme, navigation, animations, contact form, rendering |
| `assets/data/portfolio.json` | All editable site content |
| `manifest.json` + `sw.js` | Installable PWA and offline support |

Dark theme is the default; visitors can switch to light mode. The choice is remembered. The site is responsive, keyboard-accessible, and respects reduced-motion preferences.

---

## What’s on the site

- Hero and positioning
- About, expertise, and a career-path chart with detailed role cards
- Growth strategy lifecycle across Upwork, LinkedIn, email, and phone
- Industries and international markets
- Skills and tech stack, plus a filterable tool directory, and value proposition
- Education, languages, and interests
- Contact form and social links

**Selected Work** is prepared in the code but kept hidden until real case studies are added. Nothing placeholder or fabricated is shown publicly.

---

## Updating content

Most day-to-day edits happen in one file:

**[`assets/data/portfolio.json`](assets/data/portfolio.json)**

| You want to… | Edit |
| --- | --- |
| Name, headline, location, contact details | `profile` |
| Navigation labels | `navigation` |
| About story and career progression | `about` |
| Expertise cards | `expertise` |
| Jobs, dates and responsibilities (feeds the career chart) | `experience` |
| Skill groups and tool directory | `skills`, `tools` |
| Outreach channels used in the workflow | `channels`, `growthStrategy` |
| Markets and industries | `markets`, `industries` |
| Show or hide a section | `sectionVisibility` |

A few related assets:

| Asset | Location |
| --- | --- |
| CV / résumé PDF | `assets/resume/Sabrina-Muqadas-CV.pdf` |
| Profile photo | Set `profile.photo` in `portfolio.json` |
| Favicons & PWA icons | `assets/image/icons/` |
| Logo and social preview image | `assets/image/logo.png`, `assets/image/og-image.jpg` |
| Colours and spacing | `assets/css/variables.css` |
| Form endpoint / feature flags | `assets/js/config.js` |

When you change hero, about, or contact copy in the JSON, update the matching text in `index.html` too. That keeps search engines and no-JS visitors in sync.

### Selected Work

1. Add real projects under `projects` in `portfolio.json`.
2. Set `sectionVisibility.projects` to `true`.

Only publish outcomes and details that are accurate and cleared to share.

### Contact form

By default the form opens the visitor’s email app (mailto).  
To send through Formspree or Web3Forms instead, set `contact.endpoint` in `assets/js/config.js`.

---

## Deploy on GitHub Pages

This project is set up as a **user site**:

1. Create a repository named `sabrinamuqadas.github.io`.
2. Push the contents of this folder to the `main` branch (at the repo root).
3. In **Settings → Pages**, publish from `main` / root.

After the first deploy, the site is available at `https://sabrinamuqadas.github.io/`.

---

## Notes

- Folder browsing is blocked (`.htaccess` on Apache; redirect `index.html` files in asset folders for GitHub Pages).
- `404.html` is used automatically by GitHub Pages for missing URLs.
- After the first visit over HTTPS, the site can be installed and used offline. CV PDFs are not cached.
- When you change files that the service worker caches, bump `VERSION` in `sw.js` so visitors pick up the update.
