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

## Constraints
- Don't touch existing migrations
- Don't implement auth (Rails 8 built-in auth)
- Don't add TypeScript to frontend
- Don't change monorepo structure (`/backend`, `/frontend`)
- Use yarn, not npm
