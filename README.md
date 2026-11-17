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
- **Growth Lab:** seven business development tools in one shared dialog: a pipeline and revenue calculator, a growth readiness assessment, a funnel simulator, an outreach channel ROI comparison, process case studies, an outreach message library, and a strategy brief. Calculations run in the browser, and nothing is sent unless the visitor submits a brief.
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
| `assets/content/portfolio.json` | All editable site content |
| `assets/content/growth-lab.json` | Growth Lab defaults, assessment questions, case studies and outreach examples |
| `assets/js/` | Data loading and validation, rendering, theme, navigation, animation, contact form |
| `assets/js/growth-lab/` | Growth Lab: pure maths (`calc.js`, `format.js`), shared dialog, and one module per tool in `tools/` |
| `assets/css/` | Design tokens, layout, components, motion, responsive rules |
| `manifest.json` + `sw.js` | Installable PWA and offline support |
| `404.html` | Branded not-found page (served automatically by GitHub Pages) |

---

## Updating content

Almost every edit happens in one file:

**[`assets/content/portfolio.json`](assets/content/portfolio.json)**

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
| Growth Lab cards | `growthLab` (tool content is in `growth-lab.json`, see below) |
| Footer-only links | add `"footerOnly": true` to a `navigation` item |

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
| Hero / about photos | `assets/image/covers/hero.png`, `assets/image/covers/about.png` (paths in `profile.photo` and `about.visual`) |
| Favicon and PWA icon PNGs | `assets/image/icons/` |
| Logo and favicon | `assets/image/logo.svg`, `assets/image/favicon.svg` (PNG/ICO icons in `assets/image/icons/` are generated from the favicon) |
| Brand wordmark | Inline SVG in the header and footer of `index.html` and `404.html`, set in the heading font (Manrope) |
| Social preview image | `assets/image/covers/og-image.jpg` |
| Colours, spacing, type scale | `assets/css/variables.css` |
| Form endpoint and feature flags | `assets/js/config.js` |

Until the CV PDF exists, the CV buttons show "Request CV" and open an email instead.

### Selected Work

1. Add real projects under `projects` in `portfolio.json`.
2. Set `sectionVisibility.projects` to `true`.

Only publish outcomes and details that are accurate and cleared to share.

### Contact form and strategy brief (form delivery)

The contact form and the Growth Lab strategy brief share the same delivery code (`deliverMessage` in `assets/js/contact.js`).

By default both open the visitor's email app (mailto) with the message prefilled. Nothing is sent until the visitor presses send in their email app, and the site never claims a message was delivered.

To deliver messages directly instead, set `contact.endpoint` in `assets/js/config.js`. Messages are sent as a JSON `POST`, and success is only shown when the service responds with a 2xx status.

- **Formspree:** create a form at formspree.io and set `endpoint: 'https://formspree.io/f/<form-id>'`. No other change is needed.
- **Web3Forms:** set `endpoint: 'https://api.web3forms.com/submit'` and `extraFields: Object.freeze({ access_key: '<your access key>' })`. Web3Forms access keys are designed to be public. Never put private API keys or passwords in this file, because everything in `assets/` is downloaded by visitors.

Both services are already allowed by the Content Security Policy in `index.html` (`connect-src` and `form-action`). Using a different service means adding its origin there too.

### Growth Lab

The section and its cards come from `growthLab.tools` in `portfolio.json` (title, description, button label, icon and preview style). Hide the whole section with `sectionVisibility.growthLab`, and remove the "Growth Lab" entry from `navigation` at the same time.

Everything inside the tools lives in [`assets/content/growth-lab.json`](assets/content/growth-lab.json):

| You want to… | Edit |
| --- | --- |
| Change calculator example values | `pipeline.defaults`, `funnel.defaults`, `channels.demo` (they are labelled as hypothetical in the UI) |
| Change scenario multipliers or "what if" presets | `pipeline.scenarios`, `funnel.whatIfs` |
| Edit assessment questions, scores or recommendations | `readiness.questions` (each option scores 0–3; options below 3 need a `recommendation`) |
| Add or edit a case study | `caseStudies.items`. Only use real roles and work, and keep `results.metricsStatus` as "Metrics not published" until figures are approved. |
| Add outreach examples or comparisons | `outreach.examples`, `outreach.comparisons` (use `[brackets]` for placeholders; they are highlighted) |
| Brief form options | `brief.inquiryTypes`, `brief.challenges`, `brief.timelines`, `brief.budgets` |

Tools can be linked directly with `?tool=<id>`, for example `https://sabrinamuqadas.github.io/?tool=pipeline#growth-lab`. The ids are `pipeline`, `readiness`, `funnel`, `channels`, `cases`, `outreach` and `brief`. Any element with `data-open-tool="<id>"` also opens a tool.

Inputs are saved in `sessionStorage` only, so they clear when the tab closes. Results from a calculator are attached to a strategy brief only when the visitor ticks the opt-in box.

### Welcome popup (development)

The floating welcome card appears once per browser profile, about three seconds after first load. To see it again while developing, run this in the browser console (it does not clear theme or other site data):

```js
localStorage.removeItem('sm-welcome-v1')
```

Then refresh the page.

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
- **Asset versioning:** set `SM_ASSET_VERSION` once in [`assets/js/version.js`](assets/js/version.js) (currently `1.0.47`). That value drives JSON/sprite/map URLs in JS and the service worker cache name (`sm-1.0.47`). Mirror the same number in HTML/CSS `?v=` query strings and ES module import URLs (search the repo for the previous version and replace). Add any new offline files to `SHELL` in `sw.js`.

## Still to add

- [ ] CV PDF at `assets/resume/Sabrina-Muqadas-CV.pdf`
- [x] Profile photos (`assets/image/covers/`)
- [ ] Real case studies, if and when they can be shared