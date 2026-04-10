# Simplify Review — FT-HW2-FE1

## Reviewed files

| File | Verdict | Notes |
|---|---|---|
| `src/stores/auth.js` | ✅ clean | +2 lines (async switchOrganization + await fetchCurrentUser). No new abstractions. |
| `src/components/AppTopbar.vue` | ✅ clean | `defineExpose` for test seam justified by CON-02 (jsdom stub can't click Vuetify menu). `extended` prop + extension slot — minimal approach for loading indicator. |
| `src/components/AppSidebar.vue` | ✅ clean | navItems expanded with 4 entries. `defineExpose` same justification. async switchOrg delegates to store. |
| `src/views/DashboardView.vue` | ✅ clean | 3 lines of template, 1 import. Minimal. |
| `src/views/PlaceholderView.vue` | ✅ clean | Path-to-title map (4 entries) simpler than route.name abstraction. |
| `src/router/index.js` | ✅ clean | 4 placeholder routes, identical pattern. No DRY violation at 4 repetitions (template says "3 similar lines better than premature abstraction"). |
| `src/layouts/DefaultLayout.vue` | ✅ no changes | Unchanged. |
| `src/__tests__/helpers/mountWithVuetify.js` | ✅ justified | 72 lines, all stubs solve concrete jsdom/Vuetify layout-inject problem (ER-03). Used by 5 test files. Not premature. |
| `vitest.config.js` | ✅ clean | server.deps.inline + ratchet bump, both with explanatory comments. |

## Reference patterns (≥4 required by REQ-07)

1. **Layout composition** — `App.vue` → `DefaultLayout` → `v-main` + `router-view` (`src/App.vue`, `src/layouts/DefaultLayout.vue`)
2. **Route meta + guard** — `meta.requiresAuth` + `router.beforeEach` (`src/router/index.js`)
3. **Pinia store shape** — `loading: ref`, `error: ref`, async actions (`src/stores/auth.js`)
4. **Vuetify density/spacing** — `v-list density="compact" nav`, topbar `elevation="1"` (`src/components/AppSidebar.vue`, `src/components/AppTopbar.vue`)

## Conclusion

No premature abstractions, no dead code, no duplication, no ad-hoc CSS. All complexity justified by CON-02 (Vuetify-only) or ER-03 (jsdom layout-inject).
