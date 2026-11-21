# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Use React 19 components and React Router with the shared API client; keep fetching in components and API URL construction in `src/api/client.ts`, and render loading, empty, success, and accessible error states.
- Logic tier decision: Implement explicit Express routes and service functions under `/api/*`, validate request data and references, and return deliberate 4xx responses for invalid input.
- Data tier decision: Model users, teams, activities, and workouts with Mongoose schemas that enforce required fields and relationships; seed stable fixtures with upserts and preserve unrelated records.
- Activity tracking approach: Validate well-formed `userId` and `teamId` values against existing records, reject missing references with 4xx responses, and compute positive `points` with a stored `occurredAt` timestamp.
- Team management approach: Require a team name and mascot, default members to an empty array, and expose the submitted name, mascot, and member IDs through create and list responses.
- Leaderboard approach: Aggregate activity points by team, sort totals from highest to lowest, and assign 1-based ranks to the `teamName`, `totalPoints`, and `rank` entries.
- Workout suggestions approach: Match a seeded user's email, prefer workouts that match the user's fitness goal or recent activity focus, and include a reason with the returned suggestions; return 4xx for an unknown email.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Use this to verify Mongoose validation and idempotent seeding. Failures indicate missing schema requirements or incorrect fixture relationships, before API work begins.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Use this to verify HTTP routes, status codes, request validation, aggregation, and workout matching. Failures identify incomplete logic-tier behavior.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Use this to verify route rendering and loading, empty, success, and accessible error states. Failures identify presentation or shared-client issues.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Use this after API implementation to catch TypeScript and Express type errors.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Use this after frontend implementation to verify React, Router, and Vite compilation.
