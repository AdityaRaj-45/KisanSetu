# KisanSetu

State-aware agricultural procurement prototype for SIH.

## Requirements

- Node.js 20 or newer
- npm

## Run the frontend demo

This is the easiest way to review the prototype. It does not require MongoDB.

```bash
npm install --workspaces=false
npm run install:apps
npm run dev:web
```

Open `http://localhost:5173/`. Choose a role and use demo OTP `123456`.

## Run frontend and API

Install MongoDB, then create the API environment file in PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Set a value for `JWT_SECRET` in `apps/api/.env`, start MongoDB, seed the demo database, and run both workspaces:

```bash
npm install --workspaces=false
npm run install:apps
npm run seed --prefix apps/api
npm run dev
```

The frontend runs at `http://localhost:5173/` and the API at `http://localhost:4000/`.

The root build validates both packages:

```bash
npm run build
```

The install commands intentionally install each app separately. This avoids npm's
workspace symlink step, which can fail on Windows when a cloned or previously used
`node_modules` folder contains locked or stale directories. Run all commands from
the repository root.

The Express/Mongoose API remains in `apps/api`. To run its MongoDB-backed path, configure `apps/api/.env` from `.env.example`, seed it with `npm run seed --prefix apps/api`, and start it with `npm run dev:api`.

## Demo roles

- Farmer: Asha Kumari, Jharkhand
- Procurement Officer: Ravi Verma, Jharkhand
- Distributor: Kunal Agrawal, Jharkhand
- Government Admin: Nisha Sinha, Jharkhand

The frontend prototype uses localStorage for the demo session and shared seeded state, so the main journey is usable without MongoDB or external services. Socket.IO is initialized when the API is available.
