import dgram from "node:dgram";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { syncBuiltinESMExports } from "node:module";

function denied() {
  throw new Error("R4 Gate A offline test attempted external network access");
}

net.connect = denied;
net.createConnection = denied;
tls.connect = denied;
http.request = denied;
http.get = denied;
https.request = denied;
https.get = denied;
dgram.createSocket = denied;
dns.lookup = denied;
dns.resolve = denied;
dns.resolve4 = denied;
dns.resolve6 = denied;
syncBuiltinESMExports();

Object.defineProperty(globalThis, "fetch", {
  configurable: false,
  enumerable: true,
  value: denied,
  writable: false,
});
