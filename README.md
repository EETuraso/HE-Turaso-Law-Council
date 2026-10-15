# Henry E Turaso Law Council

## Development

Install dependencies with `npm install`, then run the Vite site with `npm run dev`.

To run the API as well, copy `.env.example` to `.env` and set unique values for
`API_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The administrator account is
created from these values the first time the API initializes its user store.
Start both the API and site with `npm run dev:full`.

The API stores users, cases, consultations, and documents in `server/data/`.
This runtime data is local and intentionally excluded from version control.

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
