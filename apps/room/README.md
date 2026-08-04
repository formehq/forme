# Forme Room app

This is the R4 Gate A hosted Web/API surface. It is a control and relay plane,
not an AI runtime.

The app deliberately has one available adapter in Gate A:

```sh
FORME_R4_SYNTHETIC=1 npm run dev
```

Without that exact flag, all hosted operations fail closed. The synthetic
adapter is process-memory-only, contains synthetic fixtures, sends no email,
calls no model/provider, creates no database schema, and must never be used as
a production fallback.

Web mutations call `/api/v1`; route handlers and server-rendered read surfaces
share `HostedRoomApplication`. The full operation inventory is in
`src/operation-inventory.ts`. Production identity, PostgreSQL, email, secrets,
origin protection, migrations, and deployment remain later-gate adapters.
