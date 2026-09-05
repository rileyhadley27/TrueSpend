# Divvy

Divvy is a private reconciliation-first personal finance app. It preserves statement facts and calculates:

> income − reimbursement-adjusted spending = leftover

The MVP imports CSV, searchable PDF, and scanned PDF statements; reviews extracted rows; suggests duplicates, transfers, card payments, reimbursements, and refunds; and keeps true-spending separate from cash movement.

## Run locally

Requirements: Node.js 22, npm, Docker Desktop (for local Supabase), and the included Supabase CLI.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. With no environment variables, Divvy opens in a fully interactive demo mode and does not upload anything.

## Connect Supabase

1. Create a Supabase project or run `npx supabase start` locally.
2. Copy `.env.example` to `.env.local` and fill in the project URL, publishable key, and server-only secret key.
3. Apply the checked-in schema with `npx supabase db reset` locally, or link a hosted project and run `npx supabase db push`.
4. Enable email confirmation in Supabase Auth.
5. Give the initial administrator protected authorization metadata: `{ "role": "admin" }`. Set this in the user’s **app metadata** through the dashboard or Admin API—never user metadata. The admin can then open `/admin` to approve pending users.

Uploaded statements use the private `statements` bucket at `<user-id>/<import-id>/<filename>`. Its 20 MB PDF/CSV allowlist and owner-folder policies are created by the migration.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

With Docker running:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase db lint --local --level warning
```

For a linked hosted project, run the Supabase database and security advisors before promoting a migration. Real statements belong only in `.private-fixtures/`, which is gitignored. The committed `fixtures/synthetic/` files contain fake data.

## Three-month acceptance pass

For each redacted real statement set:

1. Record the trusted manual income, spending, and leftover totals outside Divvy.
2. Import statements, review every extracted row, and commit them.
3. Resolve the reconciliation inbox, including partial/grouped reimbursements and transfers.
4. Compare the monthly True Spending report to the trusted totals.
5. Treat any mismatch as a release blocker; keep the redacted source files out of Git.

## Repository status

The private remote currently remains `git@github.com:rileyhadley27/TrueSpend.git`. The repository slug can be renamed separately after checking any deployment and integration links that depend on it. Never commit `.env.local` or `.private-fixtures/`.

Divvy provides organizational information, not financial, tax, or investment advice.
