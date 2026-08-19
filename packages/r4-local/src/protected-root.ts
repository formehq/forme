import { existsSync, lstatSync, mkdirSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, parse, relative, resolve, sep } from "node:path";

function contained(parent: string, child: string): boolean {
  const answer = relative(parent, child);
  return answer === "" || (!answer.startsWith("..") && !isAbsolute(answer));
}

/** Resolve a planned path without following any existing symlink component. */
export function canonicalNoSymlinkPath(input: string): string {
  const absolute = resolve(input);
  const parsed = parse(absolute);
  const components = absolute.slice(parsed.root.length).split(sep).filter(Boolean);
  let cursor = parsed.root;
  for (const component of components) {
    cursor = resolve(cursor, component);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) {
      throw new Error("protected root symlink component denied");
    }
  }
  let existing = absolute;
  const missing: string[] = [];
  while (!existsSync(existing)) {
    missing.unshift(basename(existing));
    const parent = dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const canonicalExisting = realpathSync(existing);
  return resolve(canonicalExisting, ...missing);
}

export function assertProtectedRootDisjoint(root: string, workspaceRoot: string): void {
  const protectedCanonical = canonicalNoSymlinkPath(root);
  const workspaceCanonical = canonicalNoSymlinkPath(workspaceRoot);
  if (contained(workspaceCanonical, protectedCanonical) || contained(protectedCanonical, workspaceCanonical)) {
    throw new Error("protected root and Workspace must be disjoint");
  }
}

export function ensureProtectedRoot(root: string, workspaceRoot: string): void {
  assertProtectedRootDisjoint(root, workspaceRoot);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  assertProtectedRootDisjoint(root, workspaceRoot);
}
