# M1 Continuity

The `twin/` module connects one bounded local project or exported-notes mirror and creates restart-safe Forme-owned state without a model call.

## Try it

```sh
npm run twin:init -- \
  --workspace /path/to/project \
  --source . \
  --kind project \
  --name "My project" \
  --intent "Ship the first real workflow"

npm run twin:refresh -- --workspace /path/to/project
npm run twin:status -- --workspace /path/to/project
```

For an exported notes directory, use `--kind notes-export --source relative/export/path`.

## Durable layout

```text
98_Forme/
  workspace.json
  evidence/
    manifest.jsonl
  twin/
    state.json
    state.md
    events.jsonl
    snapshots/
      <revision>.json
```

`state.json` and `state.md` can be reconstructed from the latest immutable snapshot. Each revision is applied through a durable pending transition, so interruption after the manifest, snapshot, or event boundary resumes idempotently on the next status or refresh.

## Privacy and source boundary

- The connector source root must be relative and resolve inside the workspace.
- Connectors never follow symbolic links.
- `98_Forme/`, `.git`, dependency/build directories, unsupported extensions, and over-limit files are excluded.
- Evidence stores relative locators, hashes, timestamps, size, fidelity, and privacy classification—not source bodies.
- All source evidence starts `private` and projection-ineligible.
- Forme writes only under `98_Forme/` in this slice.

## What this slice proves

- stable workspace/Twin identity;
- read-only project and notes-mirror connector modes;
- append-only evidence observations and continuity events;
- immutable revision snapshots;
- add/modify/delete detection and no-op suppression;
- restart reconstruction of `Now / What Changed / Next Move`;
- crash recovery at every durable transition boundary.

M1 does not yet infer semantic project direction from source bodies. The initial intent is explicit owner input; M2 adds the evidence-scoped Reflection pass and correction/invalidation behavior.
