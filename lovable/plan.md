## Private Jet Charter CRM — Plan

A neat, minimal CRM with email/password login, four pages, and sample data preloaded.

### Pages

1. **Login / Sign up** (`/auth`) — email + password.
2. **Dashboard** (`/`) — quick stats: total clients, aircraft, quotes (by status), recent quotes table.
3. **Clients** (`/clients`) — list + add/edit/delete. Fields: name, email, phone, company, notes.
4. **Aircraft** (`/aircraft`) — list + add/edit/delete. Fields: tail number, model, capacity, hourly rate, status (available / in-use / maintenance).
5. **Quotes** (`/quotes`) — list + add/edit/delete. Fields: client, aircraft, departure, arrival, departure date, passengers, price, status (draft / sent / accepted / rejected).

All data pages: searchable table, "+ New" dialog form, row actions (edit/delete).

### Design

- **Monochrome minimal**: white background `#ffffff`, soft surfaces `#f5f5f5`, ink `#1a1a1a`, single blue accent `#3b82f6`.
- Typography: Inter-alternative pair (e.g. Space Grotesk headings / Inter body) — clean, generous spacing.
- Layout: collapsible left sidebar (Dashboard / Clients / Aircraft / Quotes / Sign out), top bar with page title, content area with cards and tables.
- Components: shadcn Card, Table, Dialog, Form, Input, Select, Badge (for statuses). No gradients, no heavy shadows.

### Backend (Lovable Cloud)

Tables (all RLS enabled, scoped to `auth.uid()` via `owner_id`):

- `clients` — id, owner_id, name, email, phone, company, notes, created_at
- `aircraft` — id, owner_id, tail_number, model, capacity, hourly_rate, status, created_at
- `quotes` — id, owner_id, client_id (fk), aircraft_id (fk), departure, arrival, departure_date, passengers, price, status, created_at

Each user only sees their own records. A migration seeds 5 sample clients, 4 aircraft, and 6 quotes — seeded per new signup via a trigger so demo data appears for whoever signs up.

### Auth

- Email/password only (no profiles, no Google).
- Public `/auth` route; everything else under `_authenticated/` using the managed gate.
- Sign out in sidebar.

### Out of scope (per your "keep it lean" choice)

- No leads/inquiries pipeline, no bookings/trips module, no invoices, no multi-staff roles, no payments, no email sending. Easy to add later.

### Technical notes

- TanStack Start + TanStack Query for data reads.
- Mutations via `createServerFn` with `requireSupabaseAuth`, or direct browser supabase calls (RLS protects either way) — will use browser client for simplicity since it's single-tenant CRUD.
- shadcn dialogs + react-hook-form + zod for forms.

Ready to build on approval.