# Wanted Design System

A faithful recreation of the **Wanted** design system — the design language behind
Wanted (원티드), Korea's leading AI-powered recruitment & career platform. Wanted connects
job-seekers with companies through job listings, a referral-reward model (채용보상금),
AI interview coaching, résumé tools, and a professional social feed.

This project packages Wanted's foundations (color, type, spacing, elevation), its reusable
React UI primitives, its icon + logo assets, and a click-through recreation of the desktop
web product, so any agent can design on-brand Wanted interfaces and assets.

> **Source of truth:** the attached Figma file *"Wanted Design System (Community)"* — a large
> library (771 component sets, 494 design-variable tokens across 6 collections, full
> light/dark theming). Token values, the 19-step type scale, the icon set and the logo
> artwork were all extracted directly from that file. A separate `uploads/logo.gif`
> ("MTL Shipping Agency") was attached but is **unrelated** to Wanted and was not used.

---

## Brand in one paragraph

Wanted is **confident, clean, and trustworthy** — a white-forward product UI carried by a
single decisive blue (#0066FF / interactive #3366FF), near-black text, and generous
breathing room. It avoids decoration: no gradients-as-crutch, no heavy borders, no playful
illustration. Emphasis comes from **weight and a little color**, not ornament. The voice is
Korean-first, polite, and to-the-point.

---

## Content fundamentals

How Wanted writes (mirror this in any copy you generate):

- **Language:** Korean-first. UI labels, buttons and headings are in Korean (English appears
  only in proper nouns, role titles, and the logotype). e.g. `지원하기`, `북마크`,
  `채용보상금 1,000만원`, `커리어의 모든 것`.
- **Person & tone:** addresses the user politely with the **-요 / 해요체** register
  (`저장했어요`, `다시 시도해 주세요`) — warm but professional, never stiff 합니다체 in product UI,
  never slangy.
- **Casing:** Korean has no case; Latin runs use Title Case for nav/labels and the logotype
  is always lowercase **wanted**.
- **Numbers:** comma-grouped, with Korean units — `1,204`, `1,000만원`, `D-7`, `2시간 전`.
- **Brevity:** labels are 2–6 characters where possible (`전체`, `정규직`, `더보기`). Headlines
  are short value statements (`지금 주목받는 포지션`, `나에게 맞는 회사`).
- **No emoji** in product UI. Status is shown with badges and color, not emoji.
- **Vibe:** aspirational career growth — "find the company that fits you," reward-driven,
  momentum ("지금 뜨는", "주목받는").

---

## Visual foundations

- **Color.** One brand blue does the heavy lifting: **#0066FF** (iconic / `--brand-blue`) and
  **#3366FF** (`--color-primary`, interactive). A cool-neutral gray ramp (note the slight blue
  cast: `#171719`, `#70737C`, `#F7F7F8`) builds surfaces and text. Text is set in **opacity
  steps** of near-black (`label-normal #171717`, `neutral 88%`, `alternative 61%`, `assistive
  28%`) rather than distinct grays. Status: green `#00BF40`, red `#FF4242`, orange `#FF9200`.
  A violet `#6541F2` flags AI/premium. Accent hues (cyan, lime, pink, purple, red-orange)
  exist for data and decorative badges but are used sparingly. Full light **and** dark themes
  ship (`:root[data-theme="dark"]`).
- **Type.** **Pretendard** for ~95% of UI text; **Wanted Sans** for brand/display headlines;
  SF Mono for numerics/code. A 19-step scale (Display 1 → Caption 2) with tight negative
  tracking on large sizes and slightly positive tracking on small sizes. Weights: Regular
  400, Medium 500 (default body), SemiBold 600 (labels/headings), Bold 700 (display/titles).
- **Spacing.** 4px base grid (`--space-*`). Components breathe — 16–24px card padding, 20–28px
  page gutters.
- **Radius.** Soft but not pill-everywhere: 8–12px on buttons/inputs, 16–20px on cards,
  `999px` only for chips, avatars (circle) and switches. Company avatars are **rounded
  squares** (~28% radius); person avatars are circles.
- **Backgrounds.** Predominantly flat white (`--bg`) and a faint cool-gray grouped background
  (`#F7F7F8`). No gradient washes. Job-card thumbnails are **solid brand-color blocks** with
  the company name — color is the texture. Headers use a translucent white + `backdrop-blur`.
- **Elevation.** Cool, low-spread shadows (`--shadow-1…5`) — barely-there on resting cards
  (most cards are *outlined*, not shadowed), lifting to a soft shadow on hover and a deeper
  one for popovers/modals. Never harsh or colored.
- **Borders.** Hairline, translucent neutral (`--line`, `rgba(112,115,124,0.16)`). Cards
  default to a 1px outline rather than a shadow.
- **Motion.** Quick and gentle: 120–320ms, `ease-standard` / `ease-out`. Hover lifts cards
  −2/3px, presses dim ~6% brightness (no aggressive scale). Slide-overs ease in from the
  right. No bounces, no infinite loops.
- **States.** Hover = subtle neutral fill or card lift; press = slight brightness dim; focus =
  a 3px blue ring at 22% (`--focus-ring`); disabled = 40% opacity. Selection is shown with a
  blue tint + blue text + (where relevant) a check.
- **Transparency & blur** are reserved for the sticky GNB (frosted white) and dimmers
  (`--material-dimmer`, ~52% near-black behind modals/slide-overs).

---

## Iconography

- **Custom Wanted icon set**, extracted from the Figma library into `assets/icons/` as 50
  clean SVGs on a **24×24 grid**, each with an **outline** default and many with a solid
  **`-fill`** counterpart (e.g. `bookmark` / `bookmark-fill`, `home` / `home-fill`).
- **Style:** rounded joins, ~1.5–2px optical stroke, friendly geometric shapes. Monochrome,
  inherits `currentColor`.
- **Delivery:** the `Icon` component renders them **inline as SVG** (not CSS `mask`) so they
  recolor via `color`/`currentColor` *and* survive html-to-image / PPTX export. Raw files in
  `assets/icons/` are filled black for use in `<img>` / specimens.
- **No emoji, no unicode glyphs** as icons. Brand/partner logos (Google, Apple, Kakao, etc.)
  exist in the Figma file but were not bulk-imported; add on demand.
- **Logos** live in `assets/logos/` (`wanted-wordmark.svg`, `wanted-symbol-mask.svg`,
  `wanted-oneid.svg`). The `Logo` component composes the W-symbol + lowercase **wanted**
  wordmark and recolors cleanly (default `--brand-blue`; supports reversed/white).

---

## What's in here (manifest)

**Foundations**
- `styles.css` — the single entry point consumers link. Pure `@import` list.
- `tokens/fig-tokens.css` — 494 Figma variables (light/dark + size/mode scopes).
- `tokens/fonts.css` · `typography.css` · `primitives.css` · `semantic.css` · `base.css`.

**Components** (`components/`, React primitives — import via `window.WantedDesignSystem_912c4c`)
- core: `Icon`, `Button`, `IconButton`, `Chip`, `Badge`, `Avatar`
- forms: `TextField`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
- layout: `Card`, `Divider`, `Tabs`, `SegmentedControl`
- feedback: `Tooltip`, `Toast`, `Alert`
- brand: `Logo`

**Guidelines** (`guidelines/`) — foundation specimen cards (Colors, Type, Spacing, Brand)
shown in the Design System tab.

**UI kits** (`ui_kits/`)
- `wanted-web/` — interactive desktop **job feed**: frosted GNB, category chips, sort control,
  job-card grid, a job-detail slide-over, login modal and save-toast flow.

**Assets** (`assets/`) — `icons/` (50 SVGs), `logos/` (3 SVGs).

**`SKILL.md`** — makes this folder usable as a downloadable Agent Skill.

---

## Using it

Link `styles.css`, load React + the generated `_ds_bundle.js`, then:

```js
const { Button, Card, Badge, Icon, Logo } = window.WantedDesignSystem_912c4c;
```

Prefer the **semantic aliases** (`--color-primary`, `--text-normal`, `--surface`, `--line`)
over raw Figma tokens — they resolve correctly in light and dark.

---

## Caveats

- **Fonts are substituted from canonical open-source CDNs.** "Pretendard JP" (Figma's primary)
  is served as standard **Pretendard** (identical Latin/Hangul metrics); **Wanted Sans** loads
  from its official repo. If you have the exact licensed `Pretendard JP` files, drop them in
  and update `tokens/fonts.css`.
- Only the most-used ~50 icons were imported (the Figma set has 300+). Ask to pull more.
- Brand/partner logos and company imagery are represented with solid color blocks /
  placeholders — supply real assets for production.
