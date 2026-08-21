import dgram from "node:dgram";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";
import { syncBuiltinESMExports } from "node:module";

const originalNetConnect = net.connect.bind(net);
const originalNetCreateConnection = net.createConnection.bind(net);
const originalSocketConnect = net.Socket.prototype.connect;
const originalTlsConnect = tls.connect.bind(tls);
const originalDnsLookup = dns.lookup.bind(dns);

function deny() {
  throw new Error("R4 live-loopback child attempted non-loopback network access");
}

function connectionTarget(args) {
  const first = args[0];
  if (first !== null && typeof first === "object") {
    if (typeof first.path === "string") return { kind: "ipc", host: null };
    return { kind: "tcp", host: first.host ?? "localhost" };
  }
  if (typeof first === "string" && args.length === 1) return { kind: "ipc", host: null };
  return { kind: "tcp", host: typeof args[1] === "string" ? args[1] : "localhost" };
}

function loopbackHost(host) {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

function allowConnection(original, args) {
  const target = connectionTarget(args);
  if (target.kind !== "ipc" && !loopbackHost(target.host)) return deny();
  return Reflect.apply(original, net, args);
}

net.connect = (...args) => allowConnection(originalNetConnect, args);
net.createConnection = (...args) => allowConnection(originalNetCreateConnection, args);
net.Socket.prototype.connect = function loopbackSocketConnect(...args) {
  const target = connectionTarget(args);
  if (target.kind !== "ipc" && !loopbackHost(target.host)) return deny();
  return Reflect.apply(originalSocketConnect, this, args);
};
tls.connect = (...args) => {
  const target = connectionTarget(args);
  if (target.kind !== "ipc" && !loopbackHost(target.host)) return deny();
  return Reflect.apply(originalTlsConnect, tls, args);
};
dgram.createSocket = deny;
dns.lookup = (hostname, ...args) => {
  if (!loopbackHost(hostname)) return deny();
  return Reflect.apply(originalDnsLookup, dns, [hostname, ...args]);
};
dns.resolve = deny;
dns.resolve4 = deny;
dns.resolve6 = deny;
dnsPromises.lookup = deny;
dnsPromises.resolve = deny;
dnsPromises.resolve4 = deny;
dnsPromises.resolve6 = deny;
syncBuiltinESMExports();
