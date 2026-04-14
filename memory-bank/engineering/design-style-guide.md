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

Apartus follows PMS industry conventions (inspired by RentProg). The design is:

- **Clean white base** — pure white backgrounds, no grey/off-white tinting
- **Green primary** — single consistent CTA color across all screens
- **Saturated status colors** — bold chips and badges, not washed-out tonal variants
- **Status-driven** — color conveys meaning (reservation state, priority, finance)
- **Theme-aware** — full light + dark mode support via Vuetify theme system
- **Rounded & modern** — 8-12px border radius, elevated buttons, outlined inputs

## Color Palette

### Brand Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` | `#43A047` | `#4DB6AC` | Main brand, all CTAs, active nav |
| `primary-darken-1` | `#2E7D32` | `#00897B` | Hover states, emphasis |
| `primary-lighten-1` | `#66BB6A` | `#80CBC4` | Subtle highlights |
| `secondary` | `#FB8C00` | `#FFB74D` | Orange accent, secondary actions |
| `secondary-darken-1` | `#EF6C00` | `#F57C00` | Secondary hover |

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

- **Font family:** Inter, system fallbacks
- **Configured via:** SASS variables in `src/styles/settings.scss`
- **Scale:** Vuetify default Material Design scale (`text-h1`..`text-h6`, `text-body-1`, `text-body-2`, `text-caption`, `text-subtitle-1`)

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
```
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
```
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
```
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

```
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
