# OpenTexila UI agreement · v1

This is the shared styling reference for every frontend member. It follows the approved INTI red and navy layout with a collapsible side navigation ("design C"). It covers presentation; it does not implement authentication, geolocation, schedules or attendance rules.

## Start here

1. Pull the latest frontend branch and run `npm ci` if dependencies changed.
2. Run `npm run dev` and visit **`/style-guide`** on the URL printed by Vite.
3. Copy a pattern from `src/shared/pages/StyleGuidePage.vue` into your feature.
4. Reuse the classes below. Add only feature-specific layout to `<style scoped>`.

The style guide uses the app’s real CSS, rather than a separate copied stylesheet. It is available during development and omitted from production routing. The standalone HTML preview and Figma are visual references; **the frontend CSS is the implementation source of truth**.

## Shared files and boundaries

| File                                    | Responsibility                                                     |
| --------------------------------------- | ------------------------------------------------------------------ |
| `src/assets/styles/tokens.css`          | Colors, font stack, type sizes, spacing, radii and control height  |
| `src/assets/styles/bootstrap-theme.css` | Brand styling for Bootstrap buttons, fields, tables and pagination |
| `src/assets/styles/components.css`      | Reusable `ot-*` presentation classes for pages                     |
| `src/assets/styles/shell.css`           | Sidebar, top bar and nav. Used by `AppLayout` only                 |
| `src/assets/styles/main.css`            | Imports the theme; minimal body, focus and skip-link styles        |
| `src/shared/pages/StyleGuidePage.vue`   | Visual reference for shared patterns and states                    |
| `src/layouts/AppLayout.vue`             | Signed-in shell: collapsible sidebar, top bar, content area        |
| `src/layouts/navigation.js`             | Sidebar menu items (shared; change in one PR)                      |
| `src/shared/components/AppSidebar.vue`  | Sidebar component. `AppIcon.vue` is the single shared icon set     |
| `src/shared/components/`                | Reusable Vue components when shared behavior is needed             |
| `src/features/<feature>/`               | Feature pages, state, behavior and scoped feature styles           |

`main.js` loads Bootstrap CSS **once**, then `main.css`. Do not import Bootstrap again inside a component, add a CDN copy, or introduce another UI library. Use JavaScript `<script setup>`, not TypeScript.

## Theme

| Purpose                   | Token                              | Value                 |
| ------------------------- | ---------------------------------- | --------------------- |
| Brand / primary action    | `--ot-brand`                       | `#d7141a`             |
| Hover / pressed primary   | `--ot-brand-hover`                 | `#b01016`             |
| Brand tint (hover fills)  | `--ot-brand-tint`                  | `#fdecec`             |
| Sidebar background        | `--ot-navy` / `--ot-sidebar-bg`    | `#0b1f3a`             |
| Text links                | `--ot-link` / `--ot-link-hover`    | `#1d5fd1` / `#1749a3` |
| Main text                 | `--ot-ink`                         | `#1e293b`             |
| Supporting text           | `--ot-muted`                       | `#5c6b7d`             |
| Page canvas               | `--ot-canvas`                      | `#f5f7fa`             |
| Card / input background   | `--ot-surface`                     | `#ffffff`             |
| Border                    | `--ot-border`                      | `#d8e0e7`             |
| Informational tint / text | `--ot-tint` / `--ot-info`          | `#eaf1fb` / `#17489e` |
| Success text / background | `--ot-success` / `--ot-success-bg` | `#176541` / `#e8f5ec` |
| Warning text / background | `--ot-warning` / `--ot-warning-bg` | `#805400` / `#fff4d7` |
| Error text / background   | `--ot-danger` / `--ot-danger-bg`   | `#a32936` / `#fff0f1` |
| Keyboard focus            | `--ot-focus`                       | `#0d6efd`             |

Each `--ot-*-rgb` token is the same colour as its hex token written as a triplet (used for `rgba()` and Bootstrap). Change both together. Use `var(--ot-...)` in custom CSS. Do not introduce slightly different red, navy, grey or status colors in each feature. Red is the brand and primary action color; blue is for text links and keyboard focus only. Red also means error, so always pair error states with the text label and the `ot-notice--error` / `ot-status--absent` styles.

Use the shared **system font stack** from `--ot-font-family` on every page. The first Figma draft used Inter; the browser preview and implementation use a system fallback without downloading a font. Do not individually add Google Fonts or change fonts by feature. A future font change belongs in one shared theme PR.

## Type, spacing and shape

- Body: 16px, line height 1.5. Supporting text: 14px. Labels/eyebrows: 12–14px.
- Page title: `.ot-page-title`, responsive 28–34px. Section title: `.ot-section-title`, 24px.
- Control radius: 8px. Notice radius: 12px. Card radius: 16px. Badges: pill.
- Buttons, text inputs and selects have a 48px minimum height. Avoid shrinking primary mobile controls.
- Use borders and white surfaces for cards; no default drop shadows or decorative gradients.

| CSS spacing token | Pixels | Equivalent Bootstrap utility size |
| ----------------- | ------ | --------------------------------- |
| `--ot-space-1`    | 4      | `1`                               |
| `--ot-space-2`    | 8      | `2`                               |
| `--ot-space-3`    | 12     | No default equivalent             |
| `--ot-space-4`    | 16     | `3`                               |
| `--ot-space-5`    | 24     | `4`                               |
| `--ot-space-6`    | 32     | No default equivalent             |
| `--ot-space-7`    | 48     | `5`                               |
| `--ot-space-8`    | 64     | No default equivalent             |

**Token numbers are not Bootstrap utility numbers.** For example, Bootstrap `gap-4` means 24px. Prefer Bootstrap spacing utilities for ordinary layout and tokens in scoped CSS for the remaining sizes.

## Reusable patterns

| Element                  | Use                                                                     |
| ------------------------ | ----------------------------------------------------------------------- |
| Page wrapper             | `.ot-page` (max width 1280px; 24px side padding, 48px at desktop)       |
| Brand link               | `.ot-brand.text-decoration-none`                                        |
| Heading / introduction   | `.ot-eyebrow`, `.ot-page-title`, `.ot-subtitle`                         |
| Card                     | `.ot-card`; add `.ot-card--live` for the active class                   |
| Primary action           | `.btn.btn-primary`                                                      |
| Secondary action         | `.btn.btn-outline-primary`                                              |
| Full-width mobile action | Add `.w-100`                                                            |
| Input / select           | `.form-label`, `.form-control`, `.form-select`, `.form-text`            |
| Validation               | `.is-invalid`, `.invalid-feedback`, `aria-invalid`, `aria-describedby`  |
| Status                   | `.ot-status` plus one modifier from the table below                     |
| Feedback                 | `.ot-notice` plus `--success`, `--warning` or `--error` modifier        |
| Empty state              | `.ot-card.ot-empty` with a short heading and explanation                |
| Table                    | `.table.ot-table.align-middle` inside `.table-responsive`               |
| Page title row           | `.ot-page-header` with `.ot-page-header__actions` for buttons           |
| Card heading row         | `.ot-card__header` > `.ot-card__title` (icon + text) + `.ot-card__link` |
| Label / value list       | `dl.ot-dl` > `div` > `dt` + `dd`                                        |
| Greeting banner          | `.ot-hero` with `__greeting`, `__name`, `__meta`                        |
| Collapsible notice       | `details.ot-disclosure` (+ `--success`/`--warning`/`--error`)           |

Use modifiers as complete classes: `ot-notice ot-notice--error`, not `ot-notice --error`.

The `ot-disclosure` is a native `<details>`/`<summary>` pair, so it opens and closes without JavaScript. For a hero photo, set `style="--ot-hero-image: url(...)"` on the banner. Copy working markup for every pattern from `/style-guide`.

| Status label      | Modifier              |
| ----------------- | --------------------- |
| Class in progress | `ot-status--live`     |
| Present           | `ot-status--present`  |
| Late              | `ot-status--late`     |
| Pending           | `ot-status--pending`  |
| Absent            | `ot-status--absent`   |
| Upcoming          | `ot-status--upcoming` |
| Closed            | `ot-status--closed`   |

Do not replace these with `bg-success`/`bg-warning` badges. A status is not a button. Always include the text label so color is not the only cue. Do not derive attendance status in CSS; render the actual application state.

## Feature example

```vue
<template>
  <div class="row g-4">
    <section class="col-12 col-lg-7" aria-labelledby="class-title">
      <div class="ot-card h-100">
        <p class="ot-eyebrow">COS30043 · Group G1</p>
        <h2 id="class-title" class="ot-section-title">Interface Design</h2>
        <span class="ot-status ot-status--live">Class in progress</span>
      </div>
    </section>
    <section class="col-12 col-lg-5" aria-labelledby="check-in-title">
      <div class="ot-card">
        <h2 id="check-in-title" class="ot-section-title">Check in</h2>
        <p class="ot-subtitle mb-4">
          Allow location access from your classroom.
        </p>
        <button type="button" class="btn btn-primary w-100">Check in</button>
      </div>
    </section>
  </div>
</template>
```

Place this inside the layout’s existing page wrapper; do not nest two `.ot-page` wrappers. Add feature-specific geometry with a descriptive local selector, for example `.attendance-summary`, inside `<style scoped>`. Repeated behavior can move into a shared Vue component; do not copy its CSS into every page.

## Responsive and accessible behavior

- Use Bootstrap’s grid: `row g-4`, `col-12`, then `col-md-*` / `col-lg-*` as needed. Standard breakpoints stay unchanged: 576 / 768 / 992 / 1200 / 1400px.
- Use one column on phones. The common details + action layout becomes 7/5 columns at `lg` (992px).
- Check at **390px, 768px and 1280px**, plus 200% zoom. These are review widths, not custom Bootstrap breakpoints.
- Let headings wrap. Do not give content cards fixed heights. Use `.table-responsive` for tables rather than squeezing text or causing the whole page to scroll sideways.
- Use real buttons for actions and RouterLink/anchors for navigation. Specify button `type`.
- Associate labels and help/errors with unique input IDs. Keep visible focus outlines and logical Tab order.
- During requests, disable duplicate actions, keep a meaningful label such as “Checking location…”, and announce changing results with `role="status"` / `aria-live="polite"`. Use `role="alert"` for an urgent newly shown error when appropriate, not every static notice.
- Provide loading, empty, error and success states. Keep a retry action when recovery is possible.
- Use Bootstrap’s existing utilities for visually hidden text. Any future icons must also come from one team-agreed icon set; avoid mixing emoji and multiple icon libraries.

## App shell

Signed-in pages render inside `AppLayout`. Do not add your own header or sidebar; your page fills the content area, which already provides the `.ot-page` wrapper.

- **Sidebar:** navy, with an icon and label per item. The active item is a red pill, and groups such as Attendance expand to show sub-pages. From 992px the menu button collapses it to icons (remembered in the browser). Below 992px it opens as a drawer; Escape or the backdrop closes it.
- **Top bar:** white with a menu button and a user placeholder that authentication will fill in. `.ot-search` (page search) and `.ot-icon-btn__dot` (unread dot for a bell) are available for the shell; feature pages do not use them.
- **Add a page:** add a child route to the `AppLayout` route in `src/router/index.js`, and an item in `src/layouts/navigation.js` if it needs a menu entry. Menu changes are shared-file changes, so follow the process below.
- **Icons:** only the inline set in `AppIcon.vue`. Add icons there, not from another library.
- **Not built yet:** role-based menu filtering and the route guard. These arrive with authentication.

## Working together without styling conflicts

1. **Each member owns their feature files.** Do not add feature selectors to shared CSS or edit another feature merely to fix your own layout.
2. **Coordinate changes to shared files.** Before editing tokens, global CSS, layouts or shared components, comment on the relevant GitHub issue. One person handles that shared change at a time; this is a team workflow, not an automatic lock.
3. **Use one small shared-style PR.** Aung Moe Thu coordinates review with the other members. Merge the shared change first, then rebase dependent feature branches. Others consume the agreed classes.
4. **Keep component CSS scoped.** Do not put `body`, `:root`, generic `.card`, `.btn` or unscoped element rules in a feature. Do not override `--ot-*` on a feature subtree. Avoid `!important` and `:deep()` overrides as quick fixes; request a shared modifier instead.
5. **Update the reference with the change.** When introducing a shared class or changing a token, update this document and the style-guide example in the same PR. Do not keep competing theme files or paste CSS from the standalone prototype.
6. **Review visually.** Include desktop and mobile screenshots in UI PRs and mention any shared files changed. Check another affected feature when changing a shared rule.

This reduces both CSS leakage and Git conflicts, but members still need to pull/rebase and coordinate shared edits.

### UI PR checklist

- [ ] Uses shared classes/tokens; no duplicate global stylesheet or UI library.
- [ ] Feature CSS is scoped and does not redefine the theme.
- [ ] Checked mobile/tablet/desktop, keyboard focus and relevant UI states.
- [ ] Shared changes have a reviewer and updated style-guide examples.
- [ ] `npm run build` and formatting checks pass.

## Current attendance design

The accepted flow is **scheduled class appears → Enter class → location check-in → confirmation**. The classroom schedule opens/closes attendance automatically; there is no session-code field or lecturer “Open attendance” action. The lecturer view monitors the roster. This document records UI direction, not a claim that those features are implemented.
