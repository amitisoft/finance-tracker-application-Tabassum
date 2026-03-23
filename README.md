# finance-tracker-application-Tabassum

# Finance Tracker Application

This monorepo is the foundation for the full-stack Personal Finance Tracker. Each service and feature area lives in its own slice so the project can scale.

## Structure at a glance
- `backend/`: Java Spring Boot service handling business rules, security, data, migrations, and REST APIs.
- `frontend/`: React + TypeScript + Vite SPA with feature folders, shared UI pieces, and routing.
- `infra/`: Podman compose orchestration plus PostgreSQL init scripts.
- `docs/`: API surface notes, architecture sketches, and setup guides.

## Feature map (planned locations)
- **Authentication** ? `backend/src/main/java/com/finance/tracker/security` + `controller`; `frontend/src/features/auth`
- **Dashboard** ? `backend/src/main/java/com/finance/tracker/service` + `controller`; `frontend/src/features/dashboard`
- **Transactions CRUD** ? `backend/src/main/java/com/finance/tracker/entity` + `repository` + `service`; `frontend/src/features/transactions`
- **Categories CRUD** ? `backend/src/main/java/com/finance/tracker/entity` + `controller`; `frontend/src/features/categories`
- **Accounts/Wallets** ? `backend/src/main/java/com/finance/tracker/entity` + `mapper`; `frontend/src/features/accounts`
- **Monthly Budgets** ? `backend/src/main/java/com/finance/tracker/dto` + `service`; `frontend/src/features/budgets`
- **Savings Goals** ? `backend/src/main/java/com/finance/tracker/scheduler` + `service`; `frontend/src/features/goals`
- **Recurring Transactions** ? `backend/src/main/java/com/finance/tracker/scheduler` + `service`; `frontend/src/features/recurring`
- **Reporting and Charts** ? `backend/src/main/java/com/finance/tracker/dto`; `frontend/src/components/charts` + `frontend/src/features/reports`
- **Search and Filters** ? `backend/src/main/java/com/finance/tracker/util`; `frontend/src/hooks` + `frontend/src/components/forms`
- **Responsive UI** ? `frontend/src/components/layout` + `frontend/src/assets`

This README will grow as we deliver docs, infra notes, and deployment guidance.

## Additional references
- Seed data guidance: `docs/setup/seed-data.md`.
- Manual QA checklist: `docs/setup/QA_CHECKLIST.md`.

## Running the full stack with Podman
1. Copy `infra/podman/.env.example` to `infra/podman/.env` and update secrets (especially `APP_JWT_SECRET`) before starting. The JWT secret must be at least 32 bytes long.
2. From the repo root run `podman compose -f infra/podman/compose.yaml up --build` to build the backend/frontend and bring up the Postgres database.
3. Access the backend at `http://localhost:8080` and frontend at `http://localhost:5173`, then stop the stack with `podman compose -f infra/podman/compose.yaml down`.
4. If you change `APP_JWT_SECRET`, restart the stack to ensure tokens/signatures are regenerated.
