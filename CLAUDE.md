See PROJECT.md for project description.

## Stack

- **Backend:** Ruby on Rails 8, PostgreSQL, Pundit, RSpec
- **Frontend:** Vue.js 3 (чистый JS, без TypeScript), Vuetify 3, Vite, Pinia, Vue Router 4
- **Structure:** Monorepo — `/backend` (Rails API), `/frontend` (Vue SPA)

## Key commands

### Backend

- `bin/setup` — bootstrap
- `bin/rails s` — run server
- `bundle exec rspec` — run tests
- `bin/rails db:migrate` — migrate

### Frontend

- `yarn install` — install dependencies
- `yarn dev` — run dev server (Vite)
- `yarn build` — production build

## Conventions

- Standard Rails MVC, no service objects yet
- REST API at `/api/v1`
- RSpec for tests, FactoryBot for fixtures
- Pundit for authorization policies
- Money fields use `_cents` suffix (integer storage)
- Vue 3 Composition API, Pinia for state management
- No new gems/npm packages without explicit request

## Language

- Always respond in Russian
- Code comments in English
- Git commits in English

## Documentation sync

AI-specific docs live in `ai-docs/`. Keep them always up to date:

**Before implementation:**

- If a requested feature is not in `ai-docs/PLAN.md` — add it to the appropriate phase before writing code

**After implementation:**

- **ai-docs/PLAN.md** — mark completed items `[x]`, add new items if scope changed
- **PROJECT.md** — update if the change affects module descriptions, architecture, or supported features
- **ai-docs/SCHEMA.md** — update when any model, field, or association is added/changed/removed
- **ai-docs/DECISIONS.md** — add entry when a non-obvious architectural choice is made (new DEC-NNN)

This is mandatory — no task is considered done until docs are in sync.

## Reference docs (read on demand, not always)

These files are NOT part of every-message context. Read them when relevant:

- `ai-docs/SCHEMA.md` — data models, fields, associations, ER diagram. Read before creating/modifying models.
- `ai-docs/DECISIONS.md` — architectural decisions log. Read before proposing alternatives to existing choices.
- `ai-docs/PLAN.md` — implementation plan with phases and checkboxes. Read to understand current progress.

## Active homework — HW-1 (Spec-Driven Development)

Currently working on HW-1: full Brief → Spec → Plan → Implement cycle on 5 features.
**Before any work in this repo, read `homeworks/hw-1/WORKING_AGREEMENTS.md`** —
it defines how we collaborate during HW-1 (review discipline, session strategy,
coverage ratchet, commit rules, reference implementation pattern). Remove this
section from CLAUDE.md when HW-1 is submitted.

## Constraints

- Don't touch existing migrations
- Don't implement auth (Rails 8 built-in auth)
- Don't add TypeScript to frontend
- Don't change monorepo structure (`/backend`, `/frontend`)
- Use yarn, not npm
