/**
 * Fires a burst of requests at the API and prints what came back.
 *
 *   npm run fire                                   10 requests to :3000
 *   npm run fire -- --n 20 --ports 3001,3002       split across 2 servers
 *   npm run fire -- --edge 10000 --n 5             edge burst around a window boundary
 *   npm run fire -- --path /api/token-bucket-redis-lua --ports 3001,3002
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
    options: {
        n: { type: "string", default: "10" },
        ports: { type: "string", default: "3000" },
        user: { type: "string", default: "alice" },
        path: { type: "string", default: "/api/fixed-window" },
        edge: { type: "string" },
    },
});

const n = Number(values.n);
const ports = values.ports.split(",").map(Number);
const counts = new Map<number, number>();
const countsByPort = new Map(ports.map((port) => [port, new Map<number, number>()]));

const add = (map: Map<number, number>, status: number) => map.set(status, (map.get(status) ?? 0) + 1);
const summarize = (map: Map<number, number>) =>
    [...map].sort(([a], [b]) => a - b).map(([status, count]) => `${status} × ${count}`).join("   ");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fire(i: number): Promise<void> {
    const port = ports[i % ports.length]!;
    const res = await fetch(`http://localhost:${port}${values.path}`, {
        headers: { "x-user-id": values.user },
    });
    add(counts, res.status);
    add(countsByPort.get(port)!, res.status);

    const remaining = res.headers.get("ratelimit-remaining") ?? "-";
    const retry = res.headers.get("retry-after");
    console.log(`#${String(i + 1).padStart(3)}  :${port}  ${res.status}  remaining=${remaining}${retry ? `  retry-after=${retry}s` : ""}`);
}

async function burst(from: number): Promise<void> {
    await Promise.all(Array.from({ length: n }, (_, k) => fire(from + k)));
}

if (values.edge) {
    // Fixed windows start at multiples of windowMs, so the client can find the next boundary too.
    const windowMs = Number(values.edge);
    const untilBoundary = windowMs - (Date.now() % windowMs);
    if (untilBoundary < 300) await sleep(untilBoundary + 50); // too close, aim for the next one
    await sleep(windowMs - (Date.now() % windowMs) - 200);

    console.log(`--- burst 1: just before the window ends`);
    await burst(0);
    await sleep(windowMs - (Date.now() % windowMs) + 50);
    console.log(`--- burst 2: just after the new window starts`);
    await burst(n);
} else {
    await burst(0);
}

console.log(`\ntotal   ${summarize(counts)}`);
if (ports.length > 1) {
    for (const [port, byStatus] of countsByPort) {
        console.log(`:${port}   ${summarize(byStatus)}`);
    }
}
