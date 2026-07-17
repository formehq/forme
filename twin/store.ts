import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { checkTwinContract, type TwinContractName } from "../schema/validate.ts";
import { assertSafeRelativePath, resolveSourceRoot, scanWorkspaceSource } from "./connector.ts";
import {
  DEFAULT_EXCLUDED_DIRECTORIES,
  DEFAULT_NOTES_EXTENSIONS,
  DEFAULT_PROJECT_EXTENSIONS,
  type ContinuityEvent,
  type RefreshResult,
  type SourceRecord,
  type TwinClaim,
  type TwinState,
  type WorkspaceKind,
  type WorkspaceRegistry,
} from "./types.ts";
import { renderContinuityView } from "./view.ts";

const STATE_ROOT = "98_Forme" as const;

interface StoreOptions {
  now?: () => Date;
  random?: () => string;
  failurePoint?: "pending" | "manifest" | "snapshot" | "event";
}

export interface InitWorkspaceOptions extends StoreOptions {
  workspaceRoot: string;
  sourceRoot?: string;
  kind?: WorkspaceKind;
  name?: string;
  intent?: string;
  includeExtensions?: string[];
  excludeDirectories?: string[];
  maxFileBytes?: number;
}

function timestamp(options: StoreOptions): string {
  return (options.now?.() ?? new Date()).toISOString();
}

function opaque(options: StoreOptions, length = 24): string {
  return (options.random?.() ?? randomUUID().replaceAll("-", "")).replace(/[^A-Za-z0-9_-]/g, "").slice(0, length);
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function statePaths(workspaceRoot: string): {
  root: string;
  registry: string;
  manifest: string;
  twin: string;
  state: string;
  view: string;
  events: string;
  snapshots: string;
  pending: string;
} {
  const root = join(resolve(workspaceRoot), STATE_ROOT);
  const twin = join(root, "twin");
  return {
    root,
    registry: join(root, "workspace.json"),
    manifest: join(root, "evidence", "manifest.jsonl"),
    twin,
    state: join(twin, "state.json"),
    view: join(twin, "state.md"),
    events: join(twin, "events.jsonl"),
    snapshots: join(twin, "snapshots"),
    pending: join(twin, "pending-transition.json"),
  };
}

function ensureStateDirectories(paths: ReturnType<typeof statePaths>): void {
  mkdirSync(dirname(paths.manifest), { recursive: true, mode: 0o700 });
  mkdirSync(paths.snapshots, { recursive: true, mode: 0o700 });
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertContract(name: TwinContractName, value: unknown): void {
  const result = checkTwinContract(name, value);
  if (!result.valid) throw new Error(`${name} contract failed:\n${result.errors.join("\n")}`);
}

function readJsonLines<T>(path: string, contract?: TwinContractName): T[] {
  if (!existsSync(path)) return [];
  const body = readFileSync(path, "utf8");
  if (body.trim().length === 0) return [];
  return body.trimEnd().split("\n").map((line, index) => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`invalid JSON in ${path} line ${index + 1}`);
    }
    if (contract) assertContract(contract, value);
    return value as T;
  });
}

function appendJsonLines(path: string, values: unknown[], contract?: TwinContractName): void {
  if (values.length === 0) return;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  for (const value of values) {
    if (contract) assertContract(contract, value);
    appendFileSync(path, `${JSON.stringify(value)}\n`, { encoding: "utf8", mode: 0o600 });
  }
}

export function loadWorkspaceRegistry(workspaceRoot: string): WorkspaceRegistry {
  const path = statePaths(workspaceRoot).registry;
  if (!existsSync(path)) throw new Error(`workspace is not connected: ${path}`);
  const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
  assertContract("workspace", value);
  return value as WorkspaceRegistry;
}

function readState(path: string): TwinState {
  const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
  assertContract("twin-state", value);
  return value as TwinState;
}

function latestSnapshot(paths: ReturnType<typeof statePaths>): string | undefined {
  if (!existsSync(paths.snapshots)) return undefined;
  return readdirSync(paths.snapshots)
    .filter((name) => /^[0-9]+[.]json$/.test(name))
    .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10))[0];
}

export function loadTwinState(workspaceRoot: string): TwinState | null {
  const paths = statePaths(workspaceRoot);
  recoverPending(paths);
  if (existsSync(paths.state)) return readState(paths.state);
  const snapshot = latestSnapshot(paths);
  if (!snapshot) return null;
  const state = readState(join(paths.snapshots, snapshot));
  atomicWrite(paths.state, json(state));
  return state;
}

function readLastEvent(path: string): ContinuityEvent | null {
  const events = readJsonLines<ContinuityEvent>(path);
  return events.at(-1) ?? null;
}

interface PendingTransition {
  schemaVersion: "0";
  records: SourceRecord[];
  state: TwinState;
  event: ContinuityEvent;
  view: string;
}

function appendUniqueJsonLines<T>(
  path: string,
  values: T[],
  key: (value: T) => string,
  contract?: TwinContractName,
): void {
  if (values.length === 0) return;
  const existing = readJsonLines<T>(path, contract);
  const byKey = new Map(existing.map((value) => [key(value), value]));
  for (const value of values) {
    const id = key(value);
    const prior = byKey.get(id);
    if (prior) {
      if (JSON.stringify(prior) !== JSON.stringify(value)) {
        throw new Error(`append-only record ${id} already exists with different content`);
      }
      continue;
    }
    appendJsonLines(path, [value], contract);
    byKey.set(id, value);
  }
}

function readPending(path: string): PendingTransition {
  const value = JSON.parse(readFileSync(path, "utf8")) as Partial<PendingTransition>;
  if (
    value.schemaVersion !== "0" ||
    !Array.isArray(value.records) ||
    !value.state ||
    !value.event ||
    typeof value.view !== "string"
  ) {
    throw new Error("pending Twin transition is malformed");
  }
  for (const record of value.records) assertContract("source-record", record);
  assertContract("twin-state", value.state);
  if (
    value.event.type !== "continuity.updated" ||
    value.event.revision !== value.state.revision ||
    value.event.workspaceId !== value.state.workspaceId ||
    value.event.twinId !== value.state.twinId
  ) {
    throw new Error("pending Twin transition event does not match its state revision");
  }
  return value as PendingTransition;
}

function applyPending(
  paths: ReturnType<typeof statePaths>,
  pending: PendingTransition,
  failurePoint?: StoreOptions["failurePoint"],
): void {
  appendUniqueJsonLines(paths.manifest, pending.records, (record) => record.evidenceId, "source-record");
  if (failurePoint === "manifest") throw new Error("injected failure after evidence manifest");

  const body = json(pending.state);
  const snapshot = join(paths.snapshots, `${pending.state.revision}.json`);
  if (existsSync(snapshot) && readFileSync(snapshot, "utf8") !== body) {
    throw new Error(`snapshot ${pending.state.revision} is immutable and already contains different state`);
  }
  if (!existsSync(snapshot)) atomicWrite(snapshot, body);
  if (failurePoint === "snapshot") throw new Error("injected failure after Twin snapshot");

  appendUniqueJsonLines(paths.events, [pending.event], (event) => event.eventId);
  if (failurePoint === "event") throw new Error("injected failure after Twin event");

  atomicWrite(paths.state, body);
  atomicWrite(paths.view, pending.view);
  rmSync(paths.pending, { force: true });
}

function recoverPending(paths: ReturnType<typeof statePaths>): void {
  if (!existsSync(paths.pending)) return;
  applyPending(paths, readPending(paths.pending));
}

function registryEvidence(
  registry: WorkspaceRegistry,
  observedAt: string,
  cursor: string,
  previous: SourceRecord | undefined,
): SourceRecord {
  const registryBody = json(registry);
  const contentHash = `sha256:${digest(registryBody)}`;
  return {
    schemaVersion: "0",
    connectorId: "con_forme_workspace",
    workspaceId: registry.workspaceId,
    evidenceId: `evd_${digest(`${contentHash}\0${cursor}`).slice(0, 32)}`,
    sourceKind: "forme-owned",
    provenanceClass: "forme-owned",
    locator: {
      sourceId: "src_forme_workspace_registry",
      relativePath: `${registry.stateRoot}/workspace.json`,
    },
    observedAt,
    contentHash,
    sizeBytes: Buffer.byteLength(registryBody),
    sensitivity: "restricted",
    projectionEligibility: "denied",
    fidelity: { status: "exact", issues: [] },
    change: { kind: previous ? "modified" : "added", cursor },
  };
}

function claim(
  claimId: string,
  status: TwinClaim["status"],
  statement: string,
  evidenceRefs: string[],
  revision: number,
  createdRevision = revision,
  confidence?: number,
): TwinClaim {
  return {
    claimId,
    status,
    statement,
    evidenceRefs,
    ...(confidence === undefined ? {} : { confidence }),
    createdRevision,
    lastEvaluatedRevision: revision,
    correctionRefs: [],
    sensitivity: "private",
    projectionEligibility: "denied",
  };
}

function currentStateClaim(
  revision: number,
  createdRevision: number,
  activeCount: number,
  added: number,
  modified: number,
  deleted: number,
  evidenceRefs: string[],
): TwinClaim {
  return claim(
    "clm_current_sources",
    "inferred",
    `${activeCount} source file(s) are currently tracked. Revision ${revision} recorded ${added} added, ${modified} modified, and ${deleted} deleted file(s).`,
    evidenceRefs,
    revision,
    createdRevision,
    1,
  );
}

function buildState(
  registry: WorkspaceRegistry,
  previous: TwinState | null,
  observedAt: string,
  revision: number,
  activeEvidence: SourceRecord[],
  deletedEvidence: SourceRecord[],
  registryRecord: SourceRecord,
  changes: { added: string[]; modified: string[]; deleted: string[] },
): TwinState {
  const evidenceRefs = [...new Set([
    ...activeEvidence.map((record) => record.evidenceId),
    ...deletedEvidence.map((record) => record.evidenceId),
    registryRecord.evidenceId,
  ])];
  const existingCurrent = previous?.currentState.find((item) => item.claimId === "clm_current_sources");
  if (previous) {
    return {
      ...previous,
      revision,
      updatedAt: observedAt,
      currentState: [currentStateClaim(
        revision,
        existingCurrent?.createdRevision ?? revision,
        activeEvidence.length,
        changes.added.length,
        changes.modified.length,
        changes.deleted.length,
        evidenceRefs,
      )],
    };
  }

  const identity = claim(
    "clm_identity",
    "confirmed",
    `${registry.name} is a connected Forme ${registry.source.kind === "project" ? "project" : "notes-mirror"} workspace.`,
    [registryRecord.evidenceId],
    revision,
  );
  const activeIntent = registry.initialIntent
    ? [claim("clm_active_intent", "confirmed", registry.initialIntent, [registryRecord.evidenceId], revision)]
    : [];
  const openQuestions = registry.initialIntent
    ? []
    : [claim(
      "clm_active_intent_question",
      "unresolved",
      "What active intent should guide this project Twin?",
      [registryRecord.evidenceId],
      revision,
    )];
  return {
    schemaVersion: "0",
    twinId: registry.twinId,
    workspaceId: registry.workspaceId,
    revision,
    updatedAt: observedAt,
    identity: [identity],
    activeIntent,
    currentState: [currentStateClaim(
      revision,
      revision,
      activeEvidence.length,
      changes.added.length,
      changes.modified.length,
      changes.deleted.length,
      evidenceRefs,
    )],
    confirmedDecisions: [],
    openQuestions,
    unresolvedTensions: [],
    emergingPatterns: [],
    userCorrections: [],
    allowedProjectionScope: {
      scopeId: `scp_${registry.twinId.slice(4)}`,
      claimIds: [],
      updatedAt: observedAt,
    },
  };
}

function persistTransition(
  paths: ReturnType<typeof statePaths>,
  state: TwinState,
  event: ContinuityEvent,
  view: string,
  records: SourceRecord[],
  failurePoint?: StoreOptions["failurePoint"],
): void {
  assertContract("twin-state", state);
  const pending: PendingTransition = { schemaVersion: "0", records, state, event, view };
  atomicWrite(paths.pending, json(pending));
  if (failurePoint === "pending") throw new Error("injected failure after pending Twin transition");
  applyPending(paths, pending, failurePoint);
}

export function refreshWorkspace(workspaceRoot: string, options: StoreOptions = {}): RefreshResult {
  const root = resolve(workspaceRoot);
  const paths = statePaths(root);
  const registry = loadWorkspaceRegistry(root);
  ensureStateDirectories(paths);
  recoverPending(paths);
  const observedAt = timestamp(options);
  const cursor = `scan:${observedAt}`;
  const manifest = readJsonLines<SourceRecord>(paths.manifest, "source-record");
  const priorRegistry = [...manifest].reverse().find(
    (record) => record.locator.sourceId === "src_forme_workspace_registry",
  );
  const expectedRegistryHash = `sha256:${digest(json(registry))}`;
  let registryRecord = priorRegistry;
  let registryChanged = false;
  if (!priorRegistry || priorRegistry.contentHash !== expectedRegistryHash) {
    registryRecord = registryEvidence(registry, observedAt, cursor, priorRegistry);
    registryChanged = true;
  }
  if (!registryRecord) throw new Error("workspace registry evidence could not be created");

  const previousState = loadTwinState(root);
  const scan = scanWorkspaceSource(root, registry, manifest, observedAt);
  if (previousState && scan.changedRecords.length === 0 && !registryChanged) {
    const event = readLastEvent(paths.events);
    const view = renderContinuityView(registry, previousState, event);
    atomicWrite(paths.view, view);
    return { changed: false, registry, state: previousState, event, view };
  }

  const revision = previousState ? previousState.revision + 1 : 1;
  const event: ContinuityEvent = {
    schemaVersion: "0",
    eventId: `tev_${opaque(options)}`,
    type: "continuity.updated",
    at: observedAt,
    workspaceId: registry.workspaceId,
    twinId: registry.twinId,
    previousRevision: previousState?.revision ?? null,
    revision,
    cursor: scan.cursor,
    changes: scan.changes,
    warnings: scan.warnings,
  };
  const state = buildState(
    registry,
    previousState,
    observedAt,
    revision,
    scan.currentRecords,
    scan.changedRecords.filter((record) => record.change.kind === "deleted"),
    registryRecord,
    scan.changes,
  );
  const view = renderContinuityView(registry, state, event);
  persistTransition(
    paths,
    state,
    event,
    view,
    [...(registryChanged ? [registryRecord] : []), ...scan.changedRecords],
    options.failurePoint,
  );
  return { changed: true, registry, state, event, view };
}

export function initWorkspace(options: InitWorkspaceOptions): RefreshResult {
  const root = resolve(options.workspaceRoot);
  const paths = statePaths(root);
  if (existsSync(paths.registry)) throw new Error("workspace is already connected; use twin:refresh");
  if (existsSync(paths.state)) throw new Error("Twin state already exists without a workspace registry; refusing to overwrite it");
  const kind = options.kind ?? "project";
  const sourceRoot = assertSafeRelativePath(options.sourceRoot ?? ".", "source root");
  const defaultName = basename(root) || "Connected project";
  const name = (options.name ?? defaultName).trim();
  if (name.length === 0) throw new Error("workspace name cannot be empty");
  const extensions = [...new Set((options.includeExtensions ?? (
    kind === "project" ? [...DEFAULT_PROJECT_EXTENSIONS] : [...DEFAULT_NOTES_EXTENSIONS]
  )).map((value) => value.toLowerCase()))].sort();
  const registry: WorkspaceRegistry = {
    schemaVersion: "0",
    workspaceId: `wsp_${opaque(options)}`,
    twinId: `twn_${opaque(options)}`,
    name,
    createdAt: timestamp(options),
    stateRoot: STATE_ROOT,
    ...(options.intent?.trim() ? { initialIntent: options.intent.trim() } : {}),
    source: {
      connectorId: `con_${kind.replace("-", "_")}_${opaque(options, 12)}`,
      kind,
      root: sourceRoot,
      includeExtensions: extensions,
      excludeDirectories: [...new Set(options.excludeDirectories ?? [...DEFAULT_EXCLUDED_DIRECTORIES])].sort(),
      maxFileBytes: options.maxFileBytes ?? 1_048_576,
    },
  };
  assertContract("workspace", registry);
  resolveSourceRoot(root, registry);
  ensureStateDirectories(paths);
  atomicWrite(paths.registry, json(registry));
  return refreshWorkspace(root, options);
}

export function statusWorkspace(workspaceRoot: string): RefreshResult {
  const root = resolve(workspaceRoot);
  const paths = statePaths(root);
  const registry = loadWorkspaceRegistry(root);
  const state = loadTwinState(root);
  if (!state) throw new Error("workspace has no Twin snapshot; run twin:refresh");
  const event = readLastEvent(paths.events);
  const view = renderContinuityView(registry, state, event);
  atomicWrite(paths.view, view);
  return { changed: false, registry, state, event, view };
}
