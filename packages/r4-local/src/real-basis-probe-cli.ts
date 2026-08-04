#!/usr/bin/env node

import { resolve } from "node:path";
import { probeRealTwinBasis } from "./real-basis-probe.ts";

const workspaceRoot = resolve(process.argv[2] ?? process.cwd());
console.log(JSON.stringify(probeRealTwinBasis(workspaceRoot), null, 2));
