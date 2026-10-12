# Henry E Turaso Law Council

## Development

Install dependencies with `npm install`, then run the Vite site with `npm run dev`.

To run the API as well, copy `.env.example` to `.env` and set unique values for
`API_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The administrator account is
created from these values the first time the API initializes its user store.
Start both the API and site with `npm run dev:full`.

The API stores users, cases, consultations, and documents in `server/data/`.
This runtime data is local and intentionally excluded from version control.
