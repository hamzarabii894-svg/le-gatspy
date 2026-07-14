# Le Gatsby — Rooftop & Restaurant, Casablanca

Premium bilingual (FR/EN) one-page website for **Le Gatsby**, an upscale rooftop
restaurant next to the Hassan II Mosque in Casablanca.

- **Stack:** static HTML/CSS/JS (zero dependencies). Static-first for maximum
  Lighthouse scores.
- **Reservation flow:** the form opens WhatsApp with the request prefilled as a
  structured message; the restaurant confirms or declines directly in the chat.
  No server, no accounts, works from day one. The WhatsApp number lives in
  `js/main.js` (`WHATSAPP_NUMBER`).

```
├── index.html          ← the whole site (single page)
├── assets/             ← images, logo, favicon (replace placeholders here)
├── css/style.css       ← all styling (Art Deco theme variables at the top)
├── js/main.js          ← behaviour (menu tabs, gallery, form, hero video)
├── js/i18n.js          ← FR/EN language engine
├── locales/fr.json     ← ALL French text incl. menu items & hours
├── locales/en.json     ← ALL English text incl. menu items & hours
└── robots.txt / sitemap.xml
```

---

## 1. Deploy (GitHub → Vercel)

1. Push this folder to a GitHub repository:
   ```bash
   git init && git add -A && git commit -m "Le Gatsby website"
   git remote add origin https://github.com/<you>/le-gatsby.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the
   repo. No build settings needed (it's a static site) — just click **Deploy**.
3. You get a `*.vercel.app` demo URL immediately. **Every `git push` redeploys
   automatically.**
4. After handover, add the custom domain in Vercel → Project → **Settings →
   Domains** → `legatsby.ma` (point the domain's DNS to Vercel as instructed).

## 2. Replace the placeholder images

Drop real photos into `/assets/` **keeping the same filenames** — nothing else
to change:

| File | Content | Recommended size |
| --- | --- | --- |
| hero slides | edit the `.hero__slide` divs in `index.html` (Ken Burns slideshow) | 1600×900+ |
| `about-interior.jpg` | interior / ambiance | 800×1000 (portrait) |
| `terrace-mosque-view.jpg` | terrace with the mosque view | 1600×900 |
| `gallery-1.jpg` … `gallery-8.jpg` | dishes, terrace, interior, cocktails | portrait 600×750; **2 & 6 are wide** 900×600 |

Tips: export JPEGs at ~75% quality; keep the hero video short (10–20 s loop),
muted, H.264. The site already lazy-loads it and skips it on slow connections.

## 3. Edit menu items, prices, hours, texts

**Everything editable lives in two files:** `locales/fr.json` and
`locales/en.json` (same structure, one per language).

- **Menu:** edit `menu.categories` — each category has `label` and `items`
  with `name`, `desc`, `price` (MAD), and `badges` (any of `"veg"`, `"vegan"`,
  `"halal"`, `"bio"`). Add/remove items freely; the tabs render automatically.
  ⚠️ Change prices in **both** files.
- **Hours:** edit `info.hours` (list of `{ "days", "time" }` rows) and the
  one-line summary in `footer.hours_line`.
- **All other text** (headlines, form labels, error messages, meta tags):
  find the sentence in the JSON and edit it.

Phone / WhatsApp number: change `WHATSAPP_NUMBER` in `js/main.js` (reservation
chat) and search `+212700110110` in `index.html` (tel links + structured data).

## 4. Run locally

Any static server works:

```bash
npx serve .        # or: python3 -m http.server 8000
```

Everything works locally — the reservation form opens WhatsApp directly.

---

### Notes for developers

- FR is the default language and is baked into the HTML (fast first paint,
  SEO-friendly); the EN dictionary is applied client-side and the choice is
  persisted in `localStorage`. `<html lang>`, `<title>` and the meta
  description update on toggle.
- Animations are IntersectionObserver + CSS only, disabled under
  `prefers-reduced-motion`.
- JSON-LD `Restaurant` structured data is inlined in `index.html` (update the
  aggregate rating there if reviews change).
