import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { canonicalJson, parseStrictJson } from "../packages/r4-protocol/src/index.ts";

const addFormats = createRequire(import.meta.url)("ajv-formats");
const REPOSITORY_ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));

export const HOST_BINDING_AUTHORITY = Object.freeze({
  decisionBriefSha256: "sha256:89a4f1b3d6e7507691b5719ad3edcbdf45b901bff25a3b71fdda1fce2dbca3f2",
  constructionPacketSha256: "sha256:7ad7fd34d618b03b0cafffbe1b65c9516e0bd3bdcc0e329408f1d85e38669d06",
  constructionOwnerReviewSha256: "sha256:27c64b28a19969f2d808870d64ad60fbd8b9bdf6b5343fa5d56aa719dd241ff9",
  approvedProposalHead: "a45ea061e8e92f247597787e36ecfe52740b216a",
  approvedProposalTree: "89b28903fc34e985a17e8f3fdc4bfd7d0972880e",
  constructionRunId: "79b7775defbdaf043697ef9b6d0ab45c",
});
export const POSTGRES_IMAGE = "postgres@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74";
export const CODEX_BINDINGS = Object.freeze({
  version: "0.145.0",
  launcherRelativePath: "bin/codex.js",
  launcherSha256: "sha256:134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477",
  nativeRelativePath: "vendor/aarch64-apple-darwin/codex/codex",
  nativeSha256: "sha256:1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590",
});
export const INSPECTOR_LIMITS = Object.freeze({
  dockerClient: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 512 }),
  dockerVersion: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 2_048 }),
  dockerImage: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 4_096 }),
  macos: Object.freeze({ deadlineMilliseconds: 5_000, stdoutLimitBytes: 4_096 }),
  termGraceMilliseconds: 2_000,
  killGraceMilliseconds: 2_000,
});

const SHA = /^sha256:[0-9a-f]{64}$/u;
const GIT = /^[0-9a-f]{40}$/u;
const ID = /^[0-9a-f]{32}$/u;
const INPUT_KEYS = new Set(["schemaVersion", "dockerCli", "dockerUnixSocket", "codexPackageRoot"]);
const MINIMAL_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
const SYSTEM_TOOLS = Object.freeze({
  swVers: "/usr/bin/sw_vers",
  uname: "/usr/bin/uname",
  xcodeSelect: "/usr/bin/xcode-select",
  xcrun: "/usr/bin/xcrun",
  codesign: "/usr/bin/codesign",
  security: "/usr/bin/security",
  openssl: "/usr/bin/openssl",
  sandboxExec: "/usr/bin/sandbox-exec",
  lsof: "/usr/sbin/lsof",
});

export class HostBindingError extends Error {
  constructor(code, verdict = "HOST_BINDING_INCOMPLETE_YELLOW") {
    super(code);
    this.name = "HostBindingError";
    this.code = code;
    this.verdict = verdict;
  }
}
function fail(code, verdict) { throw new HostBindingError(code, verdict); }
export function sha256(bytes) { return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`; }
function validateTrackedSchema(relativePath, value, code) {
  const schema = parseStrictJson(fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), "utf8"));
  const ajv = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, removeAdditional: false, useDefaults: false, validateFormats: true });
  addFormats(ajv, { mode: "full", keywords: false });
  if (ajv.compile(schema)(value) !== true) fail(code, "RED");
}
function exactKeys(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  if (Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n")) fail(code);
  return value;
}
function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}
function assertAbsoluteLiteral(value, code) {
  if (typeof value !== "string" || !path.isAbsolute(value) || value.includes("\0") || value.split(path.sep).includes("..") || value.includes("~")) fail(code);
  if (path.normalize(value) !== value) fail(code);
  return value;
}
function assertAncestorChainNoSymlink(value, code) {
  const parsed = path.parse(value);
  let cursor = parsed.root;
  for (const part of value.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = fs.lstatSync(cursor); } catch { fail(code); }
    if (stat.isSymbolicLink()) fail(code);
  }
}
function statIdentity(stat) {
  return Object.freeze({
    size: stat.size,
    mode: stat.mode & 0o7777,
    uid: stat.uid,
    gid: stat.gid,
    device: String(stat.dev),
    inode: String(stat.ino),
    nlink: stat.nlink,
    mtimeMilliseconds: Math.trunc(stat.mtimeMs),
  });
}
function sameIdentity(left, right) {
  return ["size", "mode", "uid", "gid", "device", "inode", "nlink", "mtimeMilliseconds"].every((key) => left[key] === right[key]);
}
function currentUid() {
  if (typeof process.getuid !== "function") fail("HOST_BINDING_UID_UNAVAILABLE");
  return process.getuid();
}
function readBoundRegularFile(logicalName, value, { expectedSha256 = null, owner = "system-or-current", maximumBytes = 536_870_912 } = {}) {
  const filePath = assertAbsoluteLiteral(value, "HOST_BOUND_PATH_INVALID");
  assertAncestorChainNoSymlink(filePath, "HOST_BOUND_PATH_SYMLINKED");
  const before = fs.lstatSync(filePath);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || (before.mode & 0o022) !== 0) fail("HOST_BOUND_FILE_UNSAFE");
  if (owner === "current" && before.uid !== currentUid()) fail("HOST_BOUND_FILE_OWNER_DRIFT");
  if (owner === "system-or-current" && before.uid !== 0 && before.uid !== currentUid()) fail("HOST_BOUND_FILE_OWNER_DRIFT");
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const fd = fs.openSync(filePath, flags);
  let bytes;
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.size > maximumBytes) fail("HOST_BOUND_FILE_SIZE_OR_TYPE");
    bytes = Buffer.allocUnsafe(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("HOST_BOUND_FILE_SHORT_READ");
      offset += count;
    }
    const afterFd = statIdentity(fs.fstatSync(fd));
    const afterPath = statIdentity(fs.lstatSync(filePath));
    if (!sameIdentity(afterFd, afterPath) || !sameIdentity(afterFd, statIdentity(before))) fail("HOST_BOUND_FILE_TOCTOU");
    const digest = sha256(bytes);
    if (expectedSha256 !== null && digest !== expectedSha256) fail("HOST_BOUND_FILE_HASH_DRIFT", "YELLOW_NO_RETRY");
    return Object.freeze({ logicalName, path: filePath, sha256: digest, ...afterFd });
  } finally {
    fs.closeSync(fd);
    bytes?.fill(0);
  }
}
export function inspectConstructionFixtureFile(filePath, expectedSha256 = null) {
  return readBoundRegularFile("construction-fixture", filePath, { owner: "current", expectedSha256, maximumBytes: 1_048_576 });
}
function validateDirectory(value, { owner = "current", deniedRoots = [] } = {}) {
  const directory = assertAbsoluteLiteral(value, "HOST_BOUND_DIRECTORY_INVALID");
  assertAncestorChainNoSymlink(directory, "HOST_BOUND_DIRECTORY_SYMLINKED");
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o022) !== 0) fail("HOST_BOUND_DIRECTORY_UNSAFE");
  if (owner === "current" && stat.uid !== currentUid()) fail("HOST_BOUND_DIRECTORY_OWNER_DRIFT");
  const real = fs.realpathSync(directory);
  if (real !== directory) fail("HOST_BOUND_DIRECTORY_CANONICAL_DRIFT");
  for (const denied of deniedRoots) if (isInside(denied, real) || isInside(real, denied)) fail("HOST_BOUND_DIRECTORY_OVERLAP");
  return real;
}
export function inspectConstructionFixtureDirectory(directory, deniedRoots = []) {
  return validateDirectory(directory, { owner: "current", deniedRoots });
}
function validateSocket(value) {
  const socket = assertAbsoluteLiteral(value, "DOCKER_SOCKET_PATH_INVALID");
  assertAncestorChainNoSymlink(socket, "DOCKER_SOCKET_PATH_SYMLINKED");
  const stat = fs.lstatSync(socket);
  if (!stat.isSocket() || stat.isSymbolicLink() || (stat.mode & 0o002) !== 0 || (stat.uid !== 0 && stat.uid !== currentUid())) fail("DOCKER_SOCKET_UNSAFE", "YELLOW_NO_RETRY");
  return Object.freeze({ path: socket, ...statIdentity(stat) });
}
export function inspectConstructionFixtureSocket(socket) { return validateSocket(socket); }

export function validateHostBindingInputBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 16_384 || bytes[bytes.length - 1] !== 0x0a) fail("HOST_BINDING_INPUT_FRAMING");
  if (bytes.subarray(0, -1).includes(0x0a) || bytes.includes(0x00)) fail("HOST_BINDING_INPUT_FRAMING");
  let value;
  try { value = parseStrictJson(bytes.subarray(0, -1).toString("utf8")); } catch { fail("HOST_BINDING_INPUT_JSON_INVALID"); }
  exactKeys(value, INPUT_KEYS, "HOST_BINDING_INPUT_SHAPE");
  if (value.schemaVersion !== "r4_gate_b_host_binding_input.v1") fail("HOST_BINDING_INPUT_VERSION");
  for (const key of ["dockerCli", "dockerUnixSocket", "codexPackageRoot"]) assertAbsoluteLiteral(value[key], "HOST_BINDING_INPUT_PATH_INVALID");
  if (`${canonicalJson(value)}\n` !== bytes.toString("utf8")) fail("HOST_BINDING_INPUT_NOT_CANONICAL");
  return Object.freeze(value);
}
export function readAndConsumeHostBindingInput(inputPath) {
  const exact = assertAbsoluteLiteral(inputPath, "HOST_BINDING_INPUT_PATH_INVALID");
  assertAncestorChainNoSymlink(exact, "HOST_BINDING_INPUT_PATH_SYMLINKED");
  const stat = fs.lstatSync(exact);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== currentUid() || (stat.mode & 0o777) !== 0o600 || stat.size > 16_384) fail("HOST_BINDING_INPUT_FILE_UNSAFE");
  const fd = fs.openSync(exact, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let bytes = Buffer.allocUnsafe(stat.size);
  const trailing = Buffer.alloc(1);
  try {
    const count = fs.readSync(fd, bytes, 0, bytes.length, 0);
    if (count !== bytes.length || fs.readSync(fd, trailing, 0, 1, bytes.length) !== 0) fail("HOST_BINDING_INPUT_SHORT_OR_TRAILING");
    const afterFd = statIdentity(fs.fstatSync(fd));
    const afterPath = statIdentity(fs.lstatSync(exact));
    if (!sameIdentity(afterFd, afterPath) || !sameIdentity(afterFd, statIdentity(stat))) fail("HOST_BINDING_INPUT_TOCTOU");
    return validateHostBindingInputBytes(bytes);
  } finally {
    fs.closeSync(fd);
    bytes.fill(0);
    trailing.fill(0);
    try { fs.unlinkSync(exact); } catch (error) { if (error?.code !== "ENOENT") fail("HOST_BINDING_INPUT_UNLINK_FAILED", "RED"); }
  }
}

function parseJsonSequence(text, expectedCount) {
  const line = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (line.includes("\n") || line.includes("\r")) fail("HOST_INSPECTOR_OUTPUT_FRAMING");
  const values = [];
  let start = 0;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = 0; index <= line.length; index += 1) {
    const char = line[index];
    if (index === line.length || (!inString && depth === 0 && char === " ")) {
      if (index > start) {
        try { values.push(JSON.parse(line.slice(start, index))); } catch { fail("HOST_INSPECTOR_OUTPUT_JSON"); }
      }
      start = index + 1;
      continue;
    }
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "[" || char === "{") depth += 1;
    else if (char === "]" || char === "}") depth -= 1;
    if (depth < 0) fail("HOST_INSPECTOR_OUTPUT_JSON");
  }
  if (inString || depth !== 0 || values.length !== expectedCount) fail("HOST_INSPECTOR_OUTPUT_SHAPE");
  return values;
}
function oneLine(output, code) {
  if (typeof output !== "string" || output.length === 0 || !output.endsWith("\n") || output.slice(0, -1).includes("\n") || output.includes("\r") || output.includes("\0")) fail(code);
  return output.slice(0, -1);
}
export function parseDockerClientVersion(output) {
  const line = oneLine(output, "DOCKER_CLIENT_VERSION_INVALID");
  const match = /^Docker version ([0-9]+(?:\.[0-9]+){1,3}), build [A-Za-z0-9._+-]+$/u.exec(line);
  if (!match) fail("DOCKER_CLIENT_VERSION_INVALID", "YELLOW_NO_RETRY");
  return match[1];
}
export function parseDockerVersionObservation(output) {
  const [clientVersion, clientApiVersion, serverVersion, serverApiVersion, serverOs, serverArch] = parseJsonSequence(output, 6);
  if (![clientVersion, clientApiVersion, serverVersion, serverApiVersion, serverOs, serverArch].every((v) => typeof v === "string" && v.length > 0)) fail("DOCKER_VERSION_OBSERVATION_INVALID");
  if (serverOs !== "linux" || serverArch !== "arm64") fail("DOCKER_PLATFORM_UNSUPPORTED", "YELLOW_NO_RETRY");
  return Object.freeze({ clientVersion, clientApiVersion, serverVersion, serverApiVersion, serverOs, serverArch });
}
export function parseDockerImageObservation(output) {
  const [repoDigests, localImageId, imageOs, imageArch, imageSizeBytes] = parseJsonSequence(output, 5);
  if (!Array.isArray(repoDigests) || repoDigests.length !== 1 || repoDigests[0] !== POSTGRES_IMAGE || !SHA.test(localImageId) || imageOs !== "linux" || imageArch !== "arm64" || !Number.isSafeInteger(imageSizeBytes) || imageSizeBytes <= 0) fail("DOCKER_IMAGE_UNSUPPORTED", "YELLOW_NO_RETRY");
  return Object.freeze({ repoDigest: repoDigests[0], localImageId, imageOs, imageArch, imageSizeBytes });
}

export function createProcessHostInspector({ root, journal = async () => {}, clock = () => Date.now() }) {
  const canonicalRoot = fs.realpathSync(root);
  const groupExists = (pid) => {
    try { process.kill(-pid, 0); return true; }
    catch (error) { if (error?.code === "ESRCH") return false; if (error?.code === "EPERM") return true; return null; }
  };
  const waitForAbsence = async (pid, milliseconds) => {
    const deadline = clock() + milliseconds;
    while (clock() <= deadline) {
      const state = groupExists(pid);
      if (state === false) return true;
      if (state === null) return false;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return groupExists(pid) === false;
  };
  return Object.freeze({
    async run(command) {
      exactKeys(command, new Set(["id", "executable", "argv", "deadlineMilliseconds", "stdoutLimitBytes", "environment"]), "HOST_INSPECTOR_COMMAND_SHAPE");
      if (!path.isAbsolute(command.executable) || !Array.isArray(command.argv) || command.argv.some((v) => typeof v !== "string")) fail("HOST_INSPECTOR_COMMAND_INVALID");
      await journal({ lane: "host-binding", event: `intent:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: null });
      const startedAt = clock();
      let child;
      try { child = spawn(command.executable, command.argv, { cwd: canonicalRoot, env: command.environment, shell: false, detached: true, stdio: ["ignore", "pipe", "pipe"] }); }
      catch { fail("HOST_INSPECTOR_SPAWN_FAILED"); }
      const stdout = [];
      const stderr = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let terminal = false;
      const stop = (signal) => { try { process.kill(-child.pid, signal); return true; } catch (error) { return error?.code === "ESRCH"; } };
      const completion = new Promise((resolve, reject) => {
        const timer = setTimeout(() => { if (!terminal) stop("SIGTERM"); }, command.deadlineMilliseconds);
        const killTimer = setTimeout(() => { if (!terminal) stop("SIGKILL"); }, command.deadlineMilliseconds + INSPECTOR_LIMITS.termGraceMilliseconds);
        child.stdout.on("data", (chunk) => { stdoutBytes += chunk.length; if (stdoutBytes > command.stdoutLimitBytes) stop("SIGTERM"); else stdout.push(Buffer.from(chunk)); });
        child.stderr.on("data", (chunk) => { stderrBytes += chunk.length; stop("SIGTERM"); });
        child.once("error", () => { terminal = true; clearTimeout(timer); clearTimeout(killTimer); reject(new HostBindingError("HOST_INSPECTOR_SPAWN_FAILED")); });
        child.once("close", async (code, signal) => {
          terminal = true; clearTimeout(timer); clearTimeout(killTimer);
          const out = Buffer.concat(stdout); const err = Buffer.concat(stderr);
          try {
            let absent = await waitForAbsence(child.pid, 0);
            if (!absent) { stop("SIGTERM"); absent = await waitForAbsence(child.pid, INSPECTOR_LIMITS.termGraceMilliseconds); }
            if (!absent) { stop("SIGKILL"); absent = await waitForAbsence(child.pid, INSPECTOR_LIMITS.killGraceMilliseconds); }
            if (code !== 0 || signal !== null || stderrBytes !== 0 || err.length !== 0 || out.length > command.stdoutLimitBytes || !absent || clock() - startedAt > command.deadlineMilliseconds + INSPECTOR_LIMITS.termGraceMilliseconds + INSPECTOR_LIMITS.killGraceMilliseconds) fail("HOST_INSPECTOR_TERMINAL_INVALID", "YELLOW_NO_RETRY");
            await journal({ lane: "host-binding", event: `observed:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: child.pid });
            resolve(out.toString("utf8"));
          } catch (error) { reject(error); }
          finally { out.fill(0); err.fill(0); for (const part of stdout) part.fill(0); for (const part of stderr) part.fill(0); }
        });
      });
      try {
        await journal({ lane: "host-binding", event: `started:${command.id}`, commandShapeSha256: sha256(Buffer.from(canonicalJson(command), "utf8")), processGroupId: child.pid });
      } catch (error) {
        stop("SIGKILL");
        await completion.catch(() => null);
        throw error;
      }
      return await completion;
    },
  });
}

function inspectorEnvironment(tempRoot) {
  return Object.freeze({ HOME: path.join(tempRoot, "home"), DOCKER_CONFIG: path.join(tempRoot, "docker-config"), TMPDIR: path.join(tempRoot, "tmp"), PATH: MINIMAL_PATH });
}
function command(id, executable, argv, limits, environment) {
  return Object.freeze({ id, executable, argv: Object.freeze(argv), deadlineMilliseconds: limits.deadlineMilliseconds, stdoutLimitBytes: limits.stdoutLimitBytes, environment });
}
function assertCheckpoint(checkpoint) {
  exactKeys(checkpoint, new Set(["schemaVersion", "constructionRunId", "approvedDecisionBriefSha256", "constructionPacketSha256", "constructionOwnerReviewSha256", "approvedProposalHead", "approvedProposalTree", "implementationHead", "implementationTree", "physicalRunnerSha256", "hostBindingModuleSha256", "physicalPortSha256", "runnerContractSha256", "codexProfileSha256", "validationAggregateSha256", "auditReceipts"]), "HOST_BINDING_CHECKPOINT_SHAPE");
  if (checkpoint.schemaVersion !== "r4_gate_b_physical_construction_checkpoint.v1" || checkpoint.constructionRunId !== HOST_BINDING_AUTHORITY.constructionRunId || checkpoint.constructionPacketSha256 !== HOST_BINDING_AUTHORITY.constructionPacketSha256 || checkpoint.constructionOwnerReviewSha256 !== HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256 || checkpoint.approvedProposalHead !== HOST_BINDING_AUTHORITY.approvedProposalHead || checkpoint.approvedProposalTree !== HOST_BINDING_AUTHORITY.approvedProposalTree || !GIT.test(checkpoint.implementationHead) || !GIT.test(checkpoint.implementationTree)) fail("HOST_BINDING_CHECKPOINT_DRIFT");
  for (const key of ["physicalRunnerSha256", "hostBindingModuleSha256", "physicalPortSha256", "runnerContractSha256", "codexProfileSha256", "validationAggregateSha256"]) if (!SHA.test(checkpoint[key])) fail("HOST_BINDING_CHECKPOINT_HASH_INVALID");
  return checkpoint;
}

export async function finalizeHostBinding({ repositoryRoot, constructionRoot, checkpoint, ownerInput, inspector, now = () => new Date(), randomBytes = crypto.randomBytes }) {
  const repo = fs.realpathSync(repositoryRoot);
  const construction = fs.realpathSync(constructionRoot);
  const frozen = assertCheckpoint(checkpoint);
  const input = exactKeys(ownerInput, INPUT_KEYS, "HOST_BINDING_INPUT_SHAPE");
  const codexRoot = validateDirectory(input.codexPackageRoot, { owner: "current", deniedRoots: [repo, construction] });
  const socket = validateSocket(input.dockerUnixSocket);
  const boundFiles = [];
  const bind = (logicalName, filePath, options) => { const observed = readBoundRegularFile(logicalName, filePath, options); boundFiles.push(observed); return observed; };
  const dockerCli = bind("docker-cli", input.dockerCli, { owner: "system-or-current" });
  const codexLauncher = bind("codex-launcher", path.join(codexRoot, CODEX_BINDINGS.launcherRelativePath), { owner: "current", expectedSha256: CODEX_BINDINGS.launcherSha256 });
  const codexNative = bind("codex-native", path.join(codexRoot, CODEX_BINDINGS.nativeRelativePath), { owner: "current", expectedSha256: CODEX_BINDINGS.nativeSha256 });
  const repoBindings = [
    ["physical-runner", "scripts/r4-gate-b-physical-runner.mjs", frozen.physicalRunnerSha256],
    ["host-binding-module", "scripts/r4-gate-b-host-binding.mjs", frozen.hostBindingModuleSha256],
    ["physical-port", "scripts/r4-gate-b-physical-port.mjs", frozen.physicalPortSha256],
    ["runner-contract", "schemas/r4/gate-b-core/physical-runner-contract.json", frozen.runnerContractSha256],
    ["codex-seatbelt-profile", "schemas/r4/gate-b-core/macos/forme-codex-zero-call.sb", frozen.codexProfileSha256],
    ["host-input-contract", "schemas/r4/gate-b-core/host-binding-input.schema.json", null],
    ["host-capsule-contract", "schemas/r4/gate-b-core/host-binding-capsule.schema.json", null],
    ["postgres-physical-contract", "schemas/r4/gate-b-core/postgres/physical-adapter-contract.json", null],
    ["macos-physical-contract", "schemas/r4/gate-b-core/macos/physical-adapter-contract.json", null],
  ];
  for (const [logical, relative, expected] of repoBindings) bind(logical, path.join(repo, relative), { owner: "current", expectedSha256: expected });
  for (const [logical, tool] of Object.entries(SYSTEM_TOOLS)) bind(logical.replace(/[A-Z]/gu, (m) => `-${m.toLowerCase()}`), tool, { owner: "system-or-current" });
  const node = bind("node", process.execPath, { owner: "system-or-current" });
  const env = inspectorEnvironment(construction);
  fs.mkdirSync(env.HOME, { mode: 0o700 }); fs.mkdirSync(env.DOCKER_CONFIG, { mode: 0o700 }); fs.mkdirSync(env.TMPDIR, { mode: 0o700 });
  const dockerClientRaw = await inspector.run(command("docker-client-version", dockerCli.path, ["--version"], INSPECTOR_LIMITS.dockerClient, env));
  const dockerClientVersion = parseDockerClientVersion(dockerClientRaw);
  const dockerVersionRaw = await inspector.run(command("docker-daemon-version", dockerCli.path, ["--host", `unix://${socket.path}`, "version", "--format", "{{json .Client.Version}} {{json .Client.APIVersion}} {{json .Server.Version}} {{json .Server.APIVersion}} {{json .Server.Os}} {{json .Server.Arch}}"], INSPECTOR_LIMITS.dockerVersion, env));
  const dockerVersion = parseDockerVersionObservation(dockerVersionRaw);
  const dockerImageRaw = await inspector.run(command("docker-image-observation", dockerCli.path, ["--host", `unix://${socket.path}`, "image", "inspect", "--format", "{{json .RepoDigests}} {{json .Id}} {{json .Os}} {{json .Architecture}} {{json .Size}}", POSTGRES_IMAGE], INSPECTOR_LIMITS.dockerImage, env));
  const dockerImage = parseDockerImageObservation(dockerImageRaw);
  const macCalls = [
    ["macos-product-version", SYSTEM_TOOLS.swVers, ["-productVersion"]], ["macos-build-version", SYSTEM_TOOLS.swVers, ["-buildVersion"]],
    ["macos-architecture", SYSTEM_TOOLS.uname, ["-m"]], ["developer-root", SYSTEM_TOOLS.xcodeSelect, ["-p"]],
    ["swiftc-path", SYSTEM_TOOLS.xcrun, ["--find", "swiftc"]], ["sdk-path", SYSTEM_TOOLS.xcrun, ["--sdk", "macosx", "--show-sdk-path"]],
    ["sdk-version", SYSTEM_TOOLS.xcrun, ["--sdk", "macosx", "--show-sdk-version"]],
  ];
  const macOutputs = {};
  for (const [id, executable, argv] of macCalls) macOutputs[id] = oneLine(await inspector.run(command(id, executable, argv, INSPECTOR_LIMITS.macos, env)), "MACOS_INSPECTOR_OUTPUT_INVALID");
  const developerRoot = assertAbsoluteLiteral(macOutputs["developer-root"], "DEVELOPER_ROOT_INVALID");
  const swiftcPath = assertAbsoluteLiteral(macOutputs["swiftc-path"], "SWIFTC_PATH_INVALID");
  const sdkPath = assertAbsoluteLiteral(macOutputs["sdk-path"], "SDK_PATH_INVALID");
  const acceptedDeveloper = (/^\/Applications\/Xcode[^/]*\.app\/Contents\/Developer(?:\/|$)/u.test(developerRoot) || /^\/Library\/Developer\/CommandLineTools(?:\/|$)/u.test(developerRoot));
  if (!acceptedDeveloper || !isInside(developerRoot, swiftcPath) || !isInside(developerRoot, sdkPath)) fail("DEVELOPER_TOOLCHAIN_UNSUPPORTED", "YELLOW_NO_RETRY");
  const swiftc = bind("swiftc", swiftcPath, { owner: "system-or-current" });
  const swiftVersion = oneLine(await inspector.run(command("swift-version", swiftc.path, ["--version"], INSPECTOR_LIMITS.macos, env)), "SWIFT_VERSION_INVALID");
  const opensslVersion = oneLine(await inspector.run(command("openssl-version", SYSTEM_TOOLS.openssl, ["version"], INSPECTOR_LIMITS.macos, env)), "OPENSSL_VERSION_INVALID");
  if (macOutputs["macos-architecture"] !== "arm64" || Number(macOutputs["macos-product-version"].split(".")[0]) < 26 || !/^\d+(?:\.\d+){1,2}$/u.test(macOutputs["macos-product-version"]) || !/^\d+(?:\.\d+){1,2}$/u.test(macOutputs["sdk-version"])) fail("MACOS_PLATFORM_UNSUPPORTED", "YELLOW_NO_RETRY");
  const created = now();
  const expires = new Date(created.getTime() + 259_200_000);
  const hostBindingId = randomBytes(16).toString("hex");
  const privateSalt = randomBytes(32).toString("hex");
  if (!ID.test(hostBindingId) || !/^[0-9a-f]{64}$/u.test(privateSalt)) fail("HOST_BINDING_RANDOM_INVALID", "RED");
  const capsule = Object.freeze({
    schemaVersion: "r4_gate_b_host_binding_capsule.v1", hostBindingId, privateSalt,
    createdAt: created.toISOString(), expiresAt: expires.toISOString(), implementationHead: frozen.implementationHead, implementationTree: frozen.implementationTree,
    authority: Object.freeze({ constructionPacketSha256: HOST_BINDING_AUTHORITY.constructionPacketSha256, constructionOwnerReviewSha256: HOST_BINDING_AUTHORITY.constructionOwnerReviewSha256, approvedProposalHead: HOST_BINDING_AUTHORITY.approvedProposalHead, approvedProposalTree: HOST_BINDING_AUTHORITY.approvedProposalTree, retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED" }),
    boundFiles: Object.freeze(boundFiles.sort((a, b) => Buffer.compare(Buffer.from(a.logicalName), Buffer.from(b.logicalName)))),
    docker: Object.freeze({ cliPath: dockerCli.path, socketPath: socket.path, socketIdentity: Object.freeze({ size: socket.size, mode: socket.mode, uid: socket.uid, gid: socket.gid, device: socket.device, inode: socket.inode, nlink: socket.nlink, mtimeMilliseconds: socket.mtimeMilliseconds }), ...dockerVersion, ...dockerImage, imageReference: POSTGRES_IMAGE, unixSocketRequests: 2 }),
    macos: Object.freeze({ platform: "darwin-arm64", productVersion: macOutputs["macos-product-version"], buildVersion: macOutputs["macos-build-version"], architecture: "arm64", developerRoot, sdkPath, sdkVersion: macOutputs["sdk-version"], swiftcPath, swiftVersion, opensslVersion, nodeVersion: process.version, readOnlyInspectionCalls: 9 }),
    invalidationRules: Object.freeze(["expired", "implementation_head_drift", "implementation_tree_drift", "runner_hash_drift", "contract_hash_drift", "profile_hash_drift", "bound_file_identity_drift", "bound_file_hash_drift", "path_mode_owner_drift", "docker_socket_drift", "docker_image_drift", "platform_drift"]),
  });
  const capsuleBytes = Buffer.from(`${canonicalJson(capsule)}\n`, "utf8");
  const capsuleSha256 = sha256(capsuleBytes);
  const publicTools = boundFiles.filter((entry) => !["docker-cli", "codex-launcher", "codex-native"].includes(entry.logicalName)).map((entry) => Object.freeze({ logicalName: entry.logicalName, version: entry.logicalName === "node" ? process.version : entry.logicalName === "swiftc" ? swiftVersion : entry.logicalName === "openssl" ? opensslVersion : "byte-bound", sha256: entry.sha256 }));
  publicTools.push(Object.freeze({ logicalName: "docker-cli", version: dockerClientVersion, sha256: dockerCli.sha256 }), Object.freeze({ logicalName: "codex-launcher", version: CODEX_BINDINGS.version, sha256: codexLauncher.sha256 }), Object.freeze({ logicalName: "codex-native", version: CODEX_BINDINGS.version, sha256: codexNative.sha256 }));
  publicTools.sort((a, b) => Buffer.compare(Buffer.from(a.logicalName), Buffer.from(b.logicalName)));
  const publicReceipt = Object.freeze({
    schemaVersion: "r4_gate_b_host_binding_public_receipt.v1", hostBindingId, hostBindingCapsuleSha256: capsuleSha256, createdAt: capsule.createdAt, expiresAt: capsule.expiresAt,
    implementationHead: frozen.implementationHead, implementationTree: frozen.implementationTree, platform: "darwin-arm64", tools: Object.freeze(publicTools),
    docker: Object.freeze({ ...dockerVersion, ...dockerImage }),
    closedBoundaries: Object.freeze({ pathsWithheld: true, accountIdentityWithheld: true, credentialsRead: 0, dockerMutationCalls: 0, realCodexCalls: 0, sandboxExecCalls: 0, macosPhysicalCalls: 0 }),
    retryExecutionGrant: "NOT_REQUESTED", firstProviderCallGrant: "NOT_REQUESTED", providerCalls: 0, providerNetworkAuthority: 0, externalRuntimeNetworkAuthority: 0, localDockerUnixSocketRequests: 2, aggregateVerdict: "YELLOW",
  });
  validateTrackedSchema("schemas/r4/gate-b-core/host-binding-capsule.schema.json", capsule, "HOST_BINDING_CAPSULE_SCHEMA_INVALID");
  validateTrackedSchema("schemas/r4/gate-b-core/host-binding-public-receipt.schema.json", publicReceipt, "HOST_BINDING_PUBLIC_RECEIPT_SCHEMA_INVALID");
  return Object.freeze({ capsule, capsuleBytes, capsuleSha256, publicReceipt, publicReceiptBytes: Buffer.from(`${canonicalJson(publicReceipt)}\n`, "utf8"), hostBindingId, expiresAt: capsule.expiresAt });
}

export function readAndRevalidateHostBindingCapsule({ capsulePath, expectedHostBindingId, now = () => new Date(), allowExpiredForCleanup = false }) {
  const exact = assertAbsoluteLiteral(capsulePath, "HOST_BINDING_CAPSULE_PATH_INVALID");
  assertAncestorChainNoSymlink(exact, "HOST_BINDING_CAPSULE_PATH_SYMLINKED");
  const before = fs.lstatSync(exact);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.uid !== currentUid() || (before.mode & 0o777) !== 0o600 || before.size < 1 || before.size > 2_097_152) fail("HOST_BINDING_CAPSULE_FILE_UNSAFE", "RED");
  const fd = fs.openSync(exact, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const bytes = Buffer.allocUnsafe(before.size);
  const trailing = Buffer.alloc(1);
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("HOST_BINDING_CAPSULE_SHORT_READ", "RED");
      offset += count;
    }
    if (fs.readSync(fd, trailing, 0, 1, bytes.length) !== 0) fail("HOST_BINDING_CAPSULE_TRAILING_READ", "RED");
    const afterFd = statIdentity(fs.fstatSync(fd));
    const afterPath = statIdentity(fs.lstatSync(exact));
    if (!sameIdentity(afterFd, afterPath) || !sameIdentity(afterFd, statIdentity(before))) fail("HOST_BINDING_CAPSULE_TOCTOU", "RED");
    if (bytes.at(-1) !== 0x0a || bytes.subarray(0, -1).includes(0x0a) || bytes.includes(0x00)) fail("HOST_BINDING_CAPSULE_FRAMING", "RED");
    let capsule;
    try { capsule = parseStrictJson(bytes.subarray(0, -1).toString("utf8")); } catch { fail("HOST_BINDING_CAPSULE_JSON_INVALID", "RED"); }
    if (`${canonicalJson(capsule)}\n` !== bytes.toString("utf8")) fail("HOST_BINDING_CAPSULE_NOT_CANONICAL", "RED");
    validateTrackedSchema("schemas/r4/gate-b-core/host-binding-capsule.schema.json", capsule, "HOST_BINDING_CAPSULE_SCHEMA_INVALID");
    if (capsule.hostBindingId !== expectedHostBindingId || !ID.test(expectedHostBindingId)) fail("HOST_BINDING_CAPSULE_ID_MISMATCH", "RED");
    const created = Date.parse(capsule.createdAt);
    const expires = Date.parse(capsule.expiresAt);
    const observedNow = now().getTime();
    if (!Number.isFinite(created) || !Number.isFinite(expires) || expires - created !== 259_200_000 || (!allowExpiredForCleanup && (observedNow >= expires || observedNow < created))) fail("HOST_BINDING_CAPSULE_EXPIRED_OR_CLOCK_INVALID", "YELLOW_NO_RETRY");
    for (const expected of capsule.boundFiles) {
      const owner = ["codex-launcher", "codex-native"].includes(expected.logicalName) || expected.path.startsWith(`${REPOSITORY_ROOT}${path.sep}`) ? "current" : "system-or-current";
      const observed = readBoundRegularFile(expected.logicalName, expected.path, { owner, expectedSha256: expected.sha256 });
      if (!sameIdentity(observed, expected) || observed.sha256 !== expected.sha256 || observed.logicalName !== expected.logicalName || observed.path !== expected.path) fail("HOST_BINDING_BOUND_FILE_DRIFT", "YELLOW_NO_RETRY");
    }
    const socket = validateSocket(capsule.docker.socketPath);
    if (!sameIdentity(socket, capsule.docker.socketIdentity)) fail("HOST_BINDING_DOCKER_SOCKET_DRIFT", "YELLOW_NO_RETRY");
    return Object.freeze({ capsule: Object.freeze(capsule), capsuleSha256: sha256(bytes), capsulePath: exact });
  } finally {
    fs.closeSync(fd);
    bytes.fill(0);
    trailing.fill(0);
  }
}

export function atomicWritePrivateFile(target, bytes, mode = 0o600) {
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  fs.chmodSync(parent, 0o700);
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), mode);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, target);
  const parentFd = fs.openSync(parent, fs.constants.O_RDONLY);
  try { fs.fsyncSync(parentFd); } finally { fs.closeSync(parentFd); }
}

const direct = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (direct) {
  process.stderr.write("HOST_BINDING_LIBRARY_DIRECT_EXECUTION_DENIED\n");
  process.exitCode = 64;
}
