# Sabrina Muqadas

Personal portfolio for **Sabrina Muqadas**, a Growth & Business Development Executive based in Islamabad, Pakistan.

She builds pipeline for technology companies across four channels: **Upwork bidding, LinkedIn social selling, email outreach, and cold calling**. This site presents that work clearly for recruiters and hiring managers, with experience across the **USA, UK, UAE, and KSA**. It never invents metrics, testimonials, or projects.

**Live site:** [sabrinamuqadas.github.io](https://sabrinamuqadas.github.io/)

---

## Highlights

- **Career-path chart:** a timeline of all five roles (2023 to present). Overlapping roles sit on separate rows, and each bar jumps to its detailed role card.
- **Role cards:** each lists responsibilities, skills and tools. The current role opens by default.
- **Skills and tech stack:** four skill groups, each paired with its tools, plus a filterable tool directory.
- **Growth workflow:** eight stages from research to optimization, tagged with the channels used in each.
- **International markets:** an interactive map of the USA, UK, UAE, and KSA.
- **Light and dark themes:** dark by default, and the visitor's choice is remembered.
- **Installable and offline:** it works as a PWA once visited over HTTPS.
- **Accessible and responsive:** keyboard-friendly, reduced-motion aware, and tested from 320px to 1920px wide.

**Selected Work** is built but hidden until real case studies exist. Nothing placeholder is shown publicly.

---

## Stack

HTML, CSS, vanilla JS (ES modules), JSON-driven content, Service Worker.
Shipped on **GitHub Pages**. No framework, no bundler, no backend, and no install step.

| Piece | Role |
| --- | --- |
| `index.html` | Page structure plus real fallback text for search engines and no-JS visitors |
| `assets/data/portfolio.json` | All editable site content |
| `assets/js/` | Data loading and validation, rendering, theme, navigation, animation, contact form |
| `assets/css/` | Design tokens, layout, components, motion, responsive rules |
| `manifest.json` + `sw.js` | Installable PWA and offline support |
| `404.html` | Branded not-found page (served automatically by GitHub Pages) |

---

## Updating content

Almost every edit happens in one file:

**[`assets/data/portfolio.json`](assets/data/portfolio.json)**

| You want to… | Edit |
| --- | --- |
| Name, titles, headline, "Now" label, location | `profile` |
| Navigation labels | `navigation` |
| At-a-glance stats | `highlights` |
| About story, quick facts, career steps | `about` |
| Expertise cards | `expertise` |
| Jobs, dates and responsibilities (also feed the career chart) | `experience` |
| Skill groups | `skills` |
| Tool directory | `tools` |
| Outreach channels and workflow stages | `channels`, `growthStrategy` |
| Markets, industries and solutions pitched | `markets`, `industries`, `industryGroups` |
| Value proposition, education, languages, interests | `valueProposition`, `education`, `languages`, `interests` |
| Email, phone, social links | `contact`, `socialLinks` |
| Show or hide a section | `sectionVisibility` |

Things to know when editing:

- **Dates:** each role has `start` and `end` as `YYYY-MM`. Use `end: null` for the current role. The chart and timeline order themselves from these.
- **Skill groups and tools:** a tool appears under a skill group when its `category` matches the group's `title` exactly.
- **Bold lead-ins:** write responsibilities as `Label: text` to bold the label.
- **Tool icons:** put a simple SVG in `assets/image/tools/` and reference it from the tool entry. Tools without one get a monogram.
- **Keep the HTML in sync:** when you change hero, about, experience, or contact copy, update the matching fallback text in `index.html` as well.

### Related assets

| Asset | Location |
| --- | --- |
| CV / résumé PDF | `assets/resume/Sabrina-Muqadas-CV.pdf` |
| Profile photo | Set `profile.photo` in `portfolio.json` |
| Favicons and PWA icons | `assets/image/icons/` |
| Logo and social preview image | `assets/image/logo.png`, `assets/image/og-image.jpg` |
| Colours, spacing, type scale | `assets/css/variables.css` |
| Form endpoint and feature flags | `assets/js/config.js` |

Until the CV PDF exists, the CV buttons show "Request CV" and open an email instead.

### Selected Work

1. Add real projects under `projects` in `portfolio.json`.
2. Set `sectionVisibility.projects` to `true`.

Only publish outcomes and details that are accurate and cleared to share.

### Contact form

By default the form opens the visitor's email app (mailto).
To send through Formspree or Web3Forms instead, set `contact.endpoint` in `assets/js/config.js`.

---

## Run locally

The site is plain static files, but it must be served over HTTP, because opening `index.html` directly blocks the JSON fetch. Use any static server, such as Laragon, and open the project folder in the browser.

---

## Deploy on GitHub Pages

This project is set up as a **user site**:

1. Create a repository named `sabrinamuqadas.github.io`.
2. Push the contents of this folder to the `main` branch (at the repo root).
3. In **Settings → Pages**, publish from `main` / root.

After the first deploy, the site is available at `https://sabrinamuqadas.github.io/`.

---

## Notes

- **Privacy:** only the city (Islamabad) is published. Keep street or sector details out of the JSON, the HTML, and the structured data.
- **Folder browsing** is blocked: `.htaccess` on Apache, and redirect `index.html` files in asset folders on GitHub Pages.
- **Offline:** after the first HTTPS visit the site is installable and works offline. CV PDFs are never cached.
- **Service worker updates:** when you change a file listed in `SHELL` in `sw.js`, bump `VERSION` (currently `sm-shell-v3`) so visitors pick up the change. Add any new files that should work offline to that list.

## Still to add

- [ ] CV PDF at `assets/resume/Sabrina-Muqadas-CV.pdf`
- [ ] Profile photo, then set `profile.photo`
- [ ] Favicon and PWA icons in `assets/image/icons/`
- [ ] Real case studies, if and when they can be shared