# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

**Package Manager**: Must use Bun (enforced via `only-allow`)

- Development: `bun dev` (with Turbopack for fast builds)
- Build: `bun run build`
- Linting: `bun run lint`

## Database Operations

**Drizzle ORM** with PostgreSQL (Neon Database):

- Generate migrations: `bun run db:generate`
- Push schema changes: `bun run db:push`
- Run migrations: `bun run db:migrate`
- Open database studio: `bun run db:studio`

## Architecture Overview

**Driving School Management System** - Multi-tenant application for driving schools to manage students, vehicles, licenses, and payments.

### Tech Stack

- **Next.js 15** with App Router and TypeScript
- **Clerk** for authentication (organization-based multi-tenancy)
- **Drizzle ORM** with PostgreSQL
- **Tailwind CSS v4** + shadcn/ui components
- **React Hook Form** + Zod for form validation
- **Jotai** for state management, **SWR** for data fetching

### Directory Structure

- `src/app/(private)/` - Protected routes (dashboard, vehicles, admission)
- `src/app/(public)/` - Public routes (auth pages)
- `src/features/` - Feature modules (admission, vehicles, onboarding)
- `src/components/ui/` - shadcn/ui components
- `src/db/` - Database schema and utilities

### Core Business Logic

**Multi-tenant Structure**: Tenants → Branches → Clients/Vehicles
**Client Admission Flow**: Multi-step process (personal info, licenses, payments, vehicle assignment)
**License Management**: Learning licenses → Driving licenses with multiple vehicle classes (LMV, MCWG, etc.)
**Payment System**: Supports full payment, installments (2-part), and pay-later options
**Vehicle Fleet**: Tracks vehicles with document expiry (PUC, insurance, registration)

### Database Entities

Key relationships: Clients belong to Branches, have Learning/Driving Licenses, are assigned to Plans with Vehicles, and have associated Payments with Transactions.

### Form Handling

Uses **@tanstack/react-form** with Zod validation. Multi-step forms managed through URL state with **nuqs**.

### State Management

**Jotai** is used for global state management to avoid prop drilling:

- **Atoms**: Define global state in `src/lib/atoms/`
- **Provider Pattern**: Hydrate atoms at layout level using `BranchConfigProvider`
- **Usage**: Access atoms with `useAtomValue()` hook in components

Example pattern:

```tsx
// Define atom
export const branchConfigAtom = atom<BranchConfig | null>(null);

// Hydrate in layout
<BranchConfigProvider branchConfig={serverFetchedConfig}>{children}</BranchConfigProvider>;

// Use in component
const branchConfig = useAtomValue(branchConfigAtom);
```

Current atoms:

- `branchConfigAtom` - Branch configuration (working hours, fees, etc.)
- `branchServiceChargeAtom` - Derived atom for license service charge

### Authentication & Authorization

Clerk organizations map to tenant branches. User access controlled by organization membership.

## Code Style

**Pre-commit hooks** with Husky enforce:

- Prettier formatting
- ESLint rules
- Import sorting (@ianvs/prettier-plugin-sort-imports)
- Always use types over interfaces

Follow existing patterns for:

- Feature-based component organization
- shadcn/ui component usage
- Drizzle schema definitions
- Multi-step form implementations
