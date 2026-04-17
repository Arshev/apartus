---
title: Apartus Design Style Guide
doc_kind: engineering
doc_function: canonical
purpose: Visual design system — palette, typography, spacing, components, status colors, dark mode.
derived_from:
  - architecture.md
  - frontend.md
status: active
audience: humans_and_agents
last_verified: 2026-04-13
canonical_for:
  - design_system
  - color_palette
  - typography_rules
  - component_defaults
---

# Design Style Guide

## Design Philosophy

Apartus strives for **operational, trustworthy, quietly modern** — canonical design context in [`/.impeccable.md`](../../.impeccable.md). Not «bookkeeping software 2008»; not «AI SaaS slop». Editorial-operational aesthetic that respects an 8-hour session.

- **Typography does the work** — hierarchy via size/weight/case, not boxes. Geologica (display) + Geist (body), both OFL 1.1, both Cyrillic-ready, self-hosted.
- **Tinted neutrals** — OKLCH-derived palette with 1–2% chroma toward brand hue. No pure `#FFF` / `#000`.
- **Green primary used sparingly** — only for CTAs and true active states. 60/30/10 visual weight.
- **Saturated status colors = function** — reservation state, priority, finance. Not decoration. Preserved from PMS industry standard.
- **Theme-aware** — light (daytime operational work) + dark (cool blue-green, not Material black). Both first-class.
- **Rounded & modern** — 8-12px border radius, soft elevation, outlined inputs.

## Color Palette

### Brand Colors (OKLCH-derived since FT-026)

| Token | Light | Dark | OKLCH Source | Usage |
|---|---|---|---|---|
| `primary` | `#3b9555` | `#51bb9a` | L=60/72 C=0.13/0.11 H=150/170 | Main brand, all CTAs, active nav |
| `primary-darken-1` | `#007329` | `#00906f` | L=48/58 H=150/170 | Hover states, emphasis |
| `primary-lighten-1` | `#53be70` | `#98dfc6` | L=72/85 H=150/170 | Subtle highlights |
| `secondary` | `#e57600` | `#ff9b50` | L=68/78 C=0.17/0.15 H=55 | Orange accent, secondary actions |
| `secondary-darken-1` | `#cc4c00` | `#e77412` | L=58/68 H=52 | Secondary hover |

### Surface Colors (tinted neutrals, OKLCH)

| Token | Light | Dark | OKLCH Source | Usage |
|---|---|---|---|---|
| `background` | `#fafdfa` | `#091111` | L=99/17 C=0.004/0.012 H=150/200 | Page background |
| `surface` | `#fcfefc` | `#111a1b` | L=99.5/21 H=150/200 | Cards, sheets |
| `surface-light` | `#f2f6f3` | `#1d2929` | L=97/27 H=150/200 | Subtle fills |
| `surface-variant` | `#e8ede8` | `#323d3e` | L=94/35 H=150/200 | Dividers, muted bg |
| `on-surface` | `#171c19` | `#e1e6e2` | L=22/92 H=155 | Primary text |
| `on-surface-variant` | `#5f6561` | `#b9c0bb` | L=50/80 H=155 | Secondary text |

### Semantic Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `error` | `#E53935` | `#EF5350` | Validation errors, destructive actions |
| `warning` | `#FB8C00` | `#FFD54F` | Attention, overdue items |
| `info` | `#1E88E5` | `#42A5F5` | Informational alerts |
| `success` | `#43A047` | `#66BB6A` | Success confirmations (= primary in light) |

### Reservation Status Colors (Industry Standard)

| Token | Light | Dark | Status |
|---|---|---|---|
| `status-confirmed` | `#1E88E5` | `#42A5F5` | Blue — Confirmed/upcoming |
| `status-checked-in` | `#43A047` | `#66BB6A` | Green — Currently in-house |
| `status-checked-out` | `#9E9E9E` | `#9E9E9E` | Grey — Departed |
| `status-cancelled` | `#E53935` | `#EF5350` | Red — Cancelled |
| `status-pending` | `#FB8C00` | `#FFA726` | Orange — Awaiting confirmation |
| `status-blocked` | `#78909C` | `#90A4AE` | Blue-grey — Room blocked |

### Task Priority Colors

| Token | Light | Dark | Priority |
|---|---|---|---|
| `priority-low` | `#78909C` | `#90A4AE` | Blue-grey — Low |
| `priority-medium` | `#1E88E5` | `#42A5F5` | Blue — Medium |
| `priority-high` | `#FB8C00` | `#FFA726` | Orange — High |
| `priority-urgent` | `#E53935` | `#EF5350` | Red — Urgent |

### Finance Colors

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `finance-revenue` | `#43A047` | `#66BB6A` | Revenue / income (green) |
| `finance-expense` | `#E53935` | `#EF5350` | Expenses / losses (red) |

### Surfaces

| Token | Light | Dark |
|---|---|---|
| `background` | `#FFFFFF` | `#121418` |
| `surface` | `#FFFFFF` | `#1E2128` |
| `surface-bright` | `#FFFFFF` | `#2A2E36` |
| `surface-light` | `#F5F5F5` | `#2A2E36` |
| `surface-variant` | `#EEEEEE` | `#3A3F47` |

## Typography

Since FT-026: **Geologica (display) + Geist (body)**, both OFL 1.1, self-hosted в `frontend/public/fonts/`, Cyrillic-ready. NO Inter / Roboto / system defaults.

- **`--font-display`:** Geologica — для headings (variable font, weights 400–700)
- **`--font-body`:** Geist — для body text, tables, inputs (weights 400, 500)
- **`--font-mono`:** system `ui-monospace` stack — для IDs, timestamps
- **Configured via:** CSS vars на `:root` (`src/styles/global.css`) + SASS vars в `settings.scss`
- **Scale:** Vuetify default Material scale (rem-fixed app UI, not fluid)
- **Tabular numerics:** `.text-tabular` utility class для date columns, money, counts — auto-applied в `global.css` к `.gantt-timeline-header__day-number`, `.money-cell` etc.
- **Preloaded weights:** Geologica 500 (cyrillic + latin), Geist 400 — в `index.html`.

### Usage

| Context | Class | Example |
|---|---|---|
| Page title | `text-h4` | "Бронирования", "Календарь" |
| Section title | `text-h5` | KPI numbers |
| Card title | `text-subtitle-1` | Column headers |
| Body | `text-body-1` / `text-body-2` | List items, descriptions |
| Labels | `text-caption` | Status labels, dates |
| Muted text | `text-medium-emphasis` | Secondary info |

## Spacing

Vuetify utility classes on an 4px grid:

| Class | Value | Usage |
|---|---|---|
| `mb-2` | 8px | Between inline elements |
| `mb-4` | 16px | Between sections |
| `mb-6` | 24px | After page header |
| `pa-4` | 16px | Card padding |
| `py-3` | 12px | List item vertical padding |

## Border Radius

| Element | Radius | SASS variable |
|---|---|---|
| Global root | 8px | `$border-radius-root` |
| Buttons | 8px | `$button-border-radius` |
| Cards | 12px | `$card-border-radius` |
| Text fields | 8px | `$text-field-border-radius` |
| Chips | 8px | `$chip-border-radius` |
| Calendar bars | 6px | Scoped CSS |

## Component Defaults

Configured in `src/plugins/vuetify.js` `defaults` section:

### Buttons (`VBtn`)

- `variant: 'elevated'` — primary actions
- `rounded: 'lg'`
- No text-transform, no letter-spacing
- **Primary action:** `color="primary"` (teal)
- **Secondary action:** `variant="outlined"` or `variant="text"`
- **Destructive:** `color="error"`

### Cards (`VCard`)

- `rounded: 'lg'`, `elevation: 1`
- Use `variant="tonal"` + semantic color for status cards
- Use `variant="outlined"` for kanban column containers

### Inputs (`VTextField`, `VSelect`, `VTextarea`, `VAutocomplete`)

- `variant: 'outlined'`
- `density: 'comfortable'`
- `rounded: 'lg'`

### Data Tables (`VDataTable`)

- `density: 'comfortable'`
- `hover: true`
- Status column uses `v-chip` with semantic color

### Navigation

- `VAppBar`: flat, border bottom (`border="b"`)
- `VNavigationDrawer`: no elevation, border right (`border="e"`)
- Active sidebar item highlighted by Vuetify router integration

### Alerts (`VAlert`)

- `variant: 'tonal'`, `rounded: 'lg'`

## Dark Mode

- Toggle via moon/sun icon in AppTopbar
- Preference saved to `localStorage('apartus-theme')`
- Theme names: `apartusLight`, `apartusDark`
- Switch using `useTheme()` composable from Vuetify
- All custom CSS must use CSS variables (`--v-theme-*`, `--v-border-*`) instead of hardcoded hex

### CSS Variable Usage in Scoped Styles

```css
/* Borders */
border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

/* Theme-aware backgrounds */
background: rgb(var(--v-theme-surface));
background: rgb(var(--v-theme-surface-light));

/* Status colors */
background: rgb(var(--v-theme-status-confirmed));

/* Primary with opacity (hover states) */
background: rgba(var(--v-theme-primary), 0.08);
```

## Layout Patterns

### Page Structure

```vue
<v-container>
  <div class="d-flex align-center mb-4">
    <h1 class="text-h4">Page Title</h1>
    <v-spacer />
    <v-btn color="primary" prepend-icon="mdi-plus">Action</v-btn>
  </div>
  <!-- content -->
</v-container>
```

### Dashboard KPI Cards

```vue
<v-row class="mb-4">
  <v-col cols="12" sm="4">
    <v-card>
      <v-card-text class="text-center">
        <div class="text-h3">{{ value }}</div>
        <div class="text-subtitle-1 text-medium-emphasis">Label</div>
      </v-card-text>
    </v-card>
  </v-col>
</v-row>
```

### Status Chips

```vue
<v-chip :color="statusColor(item.status)" size="small" variant="elevated">
  {{ statusLabel(item.status) }}
</v-chip>
```

## Icon Set

- **MDI** (Material Design Icons) via `@mdi/font`
- Prefix: `mdi-`
- Common icons:
  - Navigation: `mdi-view-dashboard`, `mdi-calendar-check`, `mdi-account-group`, `mdi-domain`
  - Actions: `mdi-plus`, `mdi-pencil`, `mdi-delete`, `mdi-login`, `mdi-logout`
  - Theme: `mdi-weather-sunny` (light), `mdi-weather-night` (dark)

## File Structure

```text
src/
  plugins/vuetify.js     — Theme config, colors, component defaults
  styles/settings.scss   — SASS variable overrides (typography, radius)
```

## Rules

1. **Never hardcode hex colors** in scoped styles — use `rgb(var(--v-theme-*))` or Vuetify color props
2. **Use semantic color tokens** (`status-confirmed`, `finance-revenue`) instead of raw colors (`blue`, `green`)
3. **Prefer Vuetify utility classes** over custom CSS
4. **New components** inherit defaults from `vuetify.js` — only override when semantically different
5. **Dark mode** is not optional — every new view must work in both themes
6. **Test both themes** visually before merging any UI change
