import fs from "node:fs";
import path from "node:path";

const CLOSED_TOKEN = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const RULE_KEYS = new Set(["path", "access"]);

export class PathFenceError extends Error {
  constructor(code) {
    super(code);
    this.name = "PathFenceError";
    this.code = code;
  }
}

function fail(code) {
  throw new PathFenceError(code);
}

function assertClosedObject(value, allowedKeys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail(code);
    }
  }
}

export function normalizePathToken(value, deniedComponents = [".codex", "codex-home"]) {
  if (typeof value !== "string" || value.length === 0) {
    fail("PATH_TOKEN_EMPTY");
  }
  if (value !== value.trim() || path.posix.isAbsolute(value) || value.includes("\\")) {
    fail("PATH_TOKEN_NOT_RELATIVE_LITERAL");
  }
  if (!CLOSED_TOKEN.test(value)) {
    fail("PATH_TOKEN_NOT_CLOSED_LITERAL");
  }

  const components = value.split("/");
  if (components.some((component) => component === "." || component === "..")) {
    fail("PATH_TOKEN_TRAVERSAL");
  }
  const denied = new Set(deniedComponents.map((component) => component.toLowerCase()));
  if (components.some((component) => denied.has(component.toLowerCase()))) {
    fail("PATH_TOKEN_DENIED_COMPONENT");
  }
  if (path.posix.normalize(value) !== value) {
    fail("PATH_TOKEN_NOT_CANONICAL");
  }
  return value;
}

function canonicalRoot(root, label) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    fail(`${label}_ROOT_NOT_ABSOLUTE`);
  }
  let stat;
  try {
    stat = fs.lstatSync(root);
  } catch {
    fail(`${label}_ROOT_UNAVAILABLE`);
  }
  if (stat.isSymbolicLink()) {
    fail(`${label}_ROOT_SYMLINKED`);
  }
  if (!stat.isDirectory()) {
    fail(`${label}_ROOT_NOT_DIRECTORY`);
  }
  const resolved = fs.realpathSync(root);
  if (resolved !== path.resolve(root)) {
    fail(`${label}_ROOT_COMPONENT_SYMLINKED`);
  }
  return resolved;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
  );
}

function compileRules(rules, deniedComponents, label) {
  if (!Array.isArray(rules) || rules.length === 0) {
    fail(`${label}_ALLOWLIST_EMPTY`);
  }
  const compiled = [];
  const seen = new Set();
  for (const rule of rules) {
    assertClosedObject(rule, RULE_KEYS, `${label}_ALLOWLIST_RULE_INVALID`);
    const token = normalizePathToken(rule.path, deniedComponents);
    if (rule.access !== "exact" && rule.access !== "tree") {
      fail(`${label}_ALLOWLIST_ACCESS_INVALID`);
    }
    const identity = `${rule.access}:${token}`;
    if (seen.has(identity)) {
      fail(`${label}_ALLOWLIST_DUPLICATE`);
    }
    seen.add(identity);
    compiled.push({ token, access: rule.access });
  }
  return compiled;
}

function isAllowed(token, rules) {
  return rules.some(
    (rule) =>
      token === rule.token ||
      (rule.access === "tree" && token.startsWith(`${rule.token}/`)),
  );
}

function inspectCandidate(root, token, options) {
  const candidate = path.join(root, ...token.split("/"));
  if (!isWithin(root, candidate)) {
    fail("PATH_OUTSIDE_ROOT");
  }

  const components = token.split("/");
  let cursor = root;
  let missing = false;
  let finalStat = null;

  for (let index = 0; index < components.length; index += 1) {
    cursor = path.join(cursor, components[index]);
    if (missing) {
      continue;
    }
    try {
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink()) {
        fail("PATH_SYMLINK_COMPONENT");
      }
      const final = index === components.length - 1;
      if (!final && !stat.isDirectory()) {
        fail("PATH_PARENT_NOT_DIRECTORY");
      }
      if (final) {
        finalStat = stat;
      }
    } catch (error) {
      if (error instanceof PathFenceError) {
        throw error;
      }
      if (error && typeof error === "object" && error.code === "ENOENT") {
        missing = true;
        continue;
      }
      fail("PATH_STAT_FAILED");
    }
  }

  if (options.mustExist && missing) {
    fail("PATH_MISSING");
  }
  if (finalStat !== null) {
    if (options.kind === "file" && !finalStat.isFile()) {
      fail("PATH_NOT_FILE");
    }
    if (options.kind === "directory" && !finalStat.isDirectory()) {
      fail("PATH_NOT_DIRECTORY");
    }
    if (
      finalStat.isFile() &&
      finalStat.nlink > 1 &&
      options.allowHardLinkedRegularFile !== true
    ) {
      fail("PATH_HARD_LINKED_REGULAR_FILE");
    }
    const resolved = fs.realpathSync(candidate);
    if (!isWithin(root, resolved) || resolved !== candidate) {
      fail("PATH_CANONICAL_ESCAPE");
    }
  }
  return candidate;
}

export function createPathFence({
  repositoryRoot,
  constructionTempRoot,
  repositoryAllowlist,
  tempAllowlist,
  deniedComponents = [".codex", "codex-home"],
}) {
  const repository = canonicalRoot(repositoryRoot, "REPOSITORY");
  const temporary = canonicalRoot(constructionTempRoot, "TEMP");
  if (isWithin(repository, temporary) || isWithin(temporary, repository)) {
    fail("ROOTS_OVERLAP");
  }
  const repositoryRules = compileRules(
    repositoryAllowlist,
    deniedComponents,
    "REPOSITORY",
  );
  const tempRules = compileRules(tempAllowlist, deniedComponents, "TEMP");

  const resolve = (root, rules, token, options = {}) => {
    const normalized = normalizePathToken(token, deniedComponents);
    if (!isAllowed(normalized, rules)) {
      fail("PATH_NOT_ALLOWLISTED");
    }
    return inspectCandidate(root, normalized, {
      mustExist: options.mustExist !== false,
      kind: options.kind ?? "any",
      allowHardLinkedRegularFile: options.allowHardLinkedRegularFile === true,
    });
  };

  return Object.freeze({
    repositoryRoot: repository,
    constructionTempRoot: temporary,
    resolveRepository(token, options) {
      return resolve(repository, repositoryRules, token, options);
    },
    resolveTemp(token, options) {
      return resolve(temporary, tempRules, token, options);
    },
  });
}
