#!/usr/bin/env node
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTools } from "./tools/index.js";

const { name, version } = createRequire(import.meta.url)("../package.json");

function createServer() {
  const server = new McpServer({ name, version }, {
    instructions: "For sends, show the recipient, sender line when applicable, and message or template before obtaining user approval. A message ID confirms submission only. Only delivery status 5 confirms handset delivery. On send_outcome_unknown, look up clientReferenceId and do not automatically resend."
  });
  registerTools(server);
  return server;
}

await serveStdio(createServer);
