import * as z from "zod/v4";
import { fields, requestGhasedak } from "../client.js";
import { GhasedakError, withToolResult } from "../errors.js";
import { readOnly } from "./shared.js";

export function registerGetBalance(server) {
  server.registerTool("get_balance", {
    description: "Read remaining Ghasedak credit. data.credit is the value reported by the API; do not infer a currency or unit.",
    inputSchema: z.object({}),
    annotations: readOnly
  }, withToolResult(async () => {
    const balance = fields(await requestGhasedak("GetAccountInformation"), ["Credit"]);
    if (balance.credit == null) {
      throw new GhasedakError("unexpected_response", "Ghasedak returned an account response without a credit balance.");
    }
    return balance;
  }));
}
