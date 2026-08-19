import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const roomRoot = join(root, "apps", "room");
const standaloneRoomRoot = join(roomRoot, ".next", "standalone", "apps", "room");
const sourceStatic = join(roomRoot, ".next", "static");
const targetStatic = join(standaloneRoomRoot, ".next", "static");
const sourcePublic = join(roomRoot, "public");
const targetPublic = join(standaloneRoomRoot, "public");

if (!existsSync(join(standaloneRoomRoot, "server.js")) || !existsSync(sourceStatic)) {
  throw new Error("R4 standalone output is incomplete; run the Room production build first");
}

mkdirSync(join(standaloneRoomRoot, ".next"), { recursive: true, mode: 0o755 });
rmSync(targetStatic, { recursive: true, force: true });
cpSync(sourceStatic, targetStatic, { recursive: true, force: true });

rmSync(targetPublic, { recursive: true, force: true });
if (existsSync(sourcePublic)) cpSync(sourcePublic, targetPublic, { recursive: true, force: true });

process.stdout.write(`${JSON.stringify({
  schemaVersion: "r4_room_standalone_prepare.v1",
  server: "apps/room/.next/standalone/apps/room/server.js",
  staticAssetsCopied: true,
  publicAssetsCopied: existsSync(sourcePublic),
})}\n`);
