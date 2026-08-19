# Forme Room app

This is the R4 Web/API surface. It is a deterministic control and relay plane,
not an AI runtime.

The app has two explicit local development modes:

```sh
FORME_R4_SYNTHETIC=1 npm run dev

FORME_R4_PUBLIC_CORE_LOCAL_ROOT=/absolute/private/runtime/root npm run dev
```

The two modes are mutually exclusive. Without either exact setting, all
operations fail closed. The synthetic adapter is process-memory-only and
contains synthetic fixtures. The local Public Core adapter reads only one
exact permission-restricted runtime root and connects only to its hash-bound
loopback PostgreSQL URL; it is not a production fallback and does not create
or migrate the database schema.

Neither mode sends email or calls a model/provider. The local private-runtime
loader is the only hosted source file allowed to import filesystem APIs; the
Room import audit rejects model/provider, child-process and ambient filesystem
imports everywhere else.

Web mutations call `/api/v1`; route handlers and server-rendered read surfaces
share one closed operation inventory from `src/operation-inventory.ts`.
Production identity, external email, production secrets, origin protection,
migrations and deployment remain outside these local modes.
