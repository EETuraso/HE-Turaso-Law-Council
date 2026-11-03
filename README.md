# Henry E Turaso Law Council

## Development

Install dependencies with `npm install`, then run the Vite site with `npm run dev`.

To run the API as well, copy `.env.example` to `.env` and set unique values for
`API_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The administrator account is
created from these values the first time the API initializes its user store.
Start both the API and site with `npm run dev:full`. The API reads `.env` first,
then `.env.local`; values in `.env.local` take priority. `.env.example` is a
blank template and is never loaded. Keep credentials in the ignored local files.
Run `npm run check:env` to validate settings without displaying secrets, and
`npm test` to check authentication, confidentiality and task approvals.

For a local demonstration without Supabase, explicitly set `API_STORAGE=local`.
Vercel requires a complete Supabase configuration and refuses local file storage.
A partial Supabase setup returns HTTP 503 rather than silently storing data locally.

The API stores users, cases, consultations, and documents in `server/data/`.
This runtime data is local and intentionally excluded from version control.

## Chamber operations preview

The `feature/chamber-operations-ai` branch adds the first staff-workflow
increment to the existing admin sign-in page. The existing `ADMIN` account is
treated as the Head Lawyer for backward compatibility. Head Lawyers can add
staff accounts, grant and revoke case access, assign tasks to multiple staff,
and approve submitted work or return it with correction instructions. Staff
sign in through `admin.html` and see only their assigned tasks and explicitly
authorized case records. A staff member cannot create or reassign official
tasks.

New local task and activity data is stored in `server/data/tasks.json` and
`server/data/activity.json`. Supabase deployments must apply
`supabase/migrations/20261102_chamber_operations.sql` before deploying this
branch. The migration adds staff role values, task and activity tables while
keeping existing user, case, and client data in place. Do not run schema changes
against production until the preview deployment has been reviewed.

The public AI assistant is available on public pages when `OPENAI_API_KEY` is
configured server-side. It uses the OpenAI Responses API, receives only the
verified public chamber profile, stores no provider conversation, and has a
per-process request limit. Never expose the key through a `VITE_` variable.
Authenticated client, lawyer, and operations assistant routes enforce role and
record access, but their dashboard interfaces, document analysis, AI approval
centre, email notifications, Google Calendar sync, and retention controls are
still future work. The migration does not require an OpenAI key.

## Vercel deployment

The production API uses Supabase for persistent records, sessions, and private
case document storage. The service role key is server-only; never prefix it with
`VITE_` or expose it in browser code.

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. Copy `.env.example` to `.env`, add the Supabase project URL and service role
   secret key, then migrate the current local records with:

   ```powershell
   node --env-file=.env scripts/migrate-to-supabase.mjs
   ```

   This copies local users, cases, consultations, and any saved documents. It
   leaves the local files unchanged and can be run again safely.
3. Import `EETuraso/HE-Turaso-Law-Council` into Vercel. Use `npm run build` as
   the build command and `dist` as the output directory.
4. Add these Vercel environment variables for Production (and Preview if needed):
   `API_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SUPABASE_URL`, and
   `SUPABASE_SECRET_KEY`. A legacy service role key is also supported. Set `VITE_API_BASE` to `/api/v1` if you want to
   make the API path explicit.
5. Deploy from Vercel. The website and `/api/v1/*` endpoints are served from the
   same Vercel project; client documents are stored in the private Supabase
   `law-documents` bucket.

Uploaded documents are limited to 3 MB so they fit within Vercel's function
request size limit. Local development can continue using the existing local API
and `server/data` files when Supabase variables are not set.

## Custom domain

The production Vercel project is already attached to `heturasolawcouncil.name.ng`.
Vercel currently reports an invalid DNS configuration. At the domain's DNS
provider, point the root (`@`) to both Vercel IPv4 addresses:

- `A` — `@` — `216.198.79.1`
- `A` — `@` — `64.29.17.1`

Remove conflicting root A or AAAA records, save the DNS changes, then verify the
domain in Vercel Project Settings → Domains. DNS changes may take time to
propagate. The domain remains attached to Vercel so the site and API share the
same host once DNS is correct.
## GitHub Pages deployment

The GitHub Pages workflow builds the Vite site and publishes `dist/`. Because
GitHub Pages cannot run the API server, it is configured to call the production
Vercel API at `https://barr-henry-law-council.vercel.app/api/v1`. Keep that URL
in sync with the production Vercel domain. The Vercel deployment must also have
the production environment variables listed above and a configured Supabase
project.

## Hearing reminders

Scheduled hearings generate separate email reminders for the assigned client
and the barrister at 48 hours and 24 hours before the hearing. The GitHub Actions
dispatcher checks every 15 minutes and is disabled until explicitly enabled.
Configure these Vercel Production environment variables:

- `CRON_SECRET`: a random secret of at least 32 characters.
- `RESEND_API_KEY`: an API key for a Resend account.
- `NOTIFICATION_FROM`: a sender address verified by Resend, such as
  `Henry E Turaso Law Council <notices@example.com>`.

Then add the same value as `CRON_SECRET` to the GitHub repository Actions secret
`REMINDER_CRON_SECRET`, and set the repository Actions variable
`HEARING_REMINDERS_ENABLED` to `true`. Resend must have a verified sender domain
before reminders can be delivered. GitHub scheduled runs can be delayed during
high load; the dispatcher catches up on its next run and avoids sending the
same recipient/reminder twice.
