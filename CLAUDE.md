# Claude Code Guide — KIC Platform Assessment

## Project Context

This repo is a technical assessment for a Platform Lead role at KIC. It uses Next.js 16 App Router with TypeScript, Prisma for database access, and Tailwind CSS for styling. The candidate is building a webhook ingestion service with a unified customer identity layer and a simple internal-tool frontend. please refer to ARCHITECTURE.md for more detailed information.

## Behaviour Rules

1. Always use TypeScript — no plain JS files
2. Use the Prisma client from `src/lib/db.ts` — never instantiate it directly elsewhere
3. Use Next.js App Router conventions — no pages directory
4. Keep API route handlers thin — business logic belongs in `src/lib/`
5. Do not modify `README.md`, `CLAUDE.md`, or `AGENTS.md` unless explicitly asked
6. When creating a migration, always use `npx prisma migrate dev --name <descriptive-name>`
7. Do not install new dependencies without confirming with the candidate first
8. Prefer explicit error handling over silent failures — return meaningful HTTP status codes
9. After every code change make sure `npm run test` and `npm run lint` succeeds

## Tech Stack

- **Framework**: Next.js 16 App Router
- **Language**: TypeScript
- **ORM**: Prisma with SQLite (dev)
- **Styling**: Tailwind CSS

## Folder Conventions

- `src/app/api/` — Next.js API route handlers; keep them thin, delegate to `src/lib/`
- `src/lib/` — Business logic, database queries, utilities, and the shared Prisma client instance
- `src/types/` — Shared TypeScript interfaces and type definitions
