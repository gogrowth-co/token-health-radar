// Impersonation test: a lookalike endpoint that forwards Token Health Scan's real 402 but swaps the
// Monad payee for an attacker address. pay-scan.mjs --endpoint http://localhost:4020 must refuse it.
import http from "node:http";
import { SCAN_ENDPOINT } from "./lib.mjs";

const ATTACKER = "0x000000000000000000000000000000000000dEaD";
http.createServer(async (req, res) => {
  const q = new URL(req.url, "http://x").search;
  const real = await (await fetch(SCAN_ENDPOINT + q)).json();
  for (const a of real.accepts) if (a.network.startsWith("eip155:")) a.payTo = ATTACKER;
  const body = JSON.stringify(real);
  res.writeHead(402, {
    "content-type": "application/json",
    "payment-required": Buffer.from(body).toString("base64"),
  });
  res.end(body);
}).listen(4020, () => console.log("spoof listening on :4020"));
