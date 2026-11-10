import * as z from "zod/v4";
import { fields } from "../client.js";
import { withToolResult } from "../errors.js";
import { billable, lineNumber, message, phone, recipientReceipts, send } from "./shared.js";

const maxRecipients = 500;

export function registerSendBulkSms(server) {
  server.registerTool("send_bulk_sms", {
    description: `Submit the same real, billable SMS to at most ${maxRecipients} recipients. Show all recipients, sender line and exact message and obtain user approval before calling. data.recipients contains the receipts reported by Ghasedak. Treat missing receipts as unconfirmed and check delivery separately.`,
    inputSchema: z.object({
      receptors: z.array(phone).min(1).max(maxRecipients)
        .refine((list) => new Set(list).size === list.length, "Duplicate recipients are not allowed"),
      lineNumber,
      message
    }),
    annotations: billable
  }, withToolResult(async (args) => {
    const { data, clientReferenceId } = await send("SendBulkSMS", (referenceId) => ({
      ...args, clientReferenceId: referenceId, isVoice: false
    }));
    return {
      clientReferenceId,
      ...fields(data, ["Cost", "LineNumber", "SendDate"]),
      recipients: recipientReceipts(data?.Receptors ?? data?.receptors, clientReferenceId)
    };
  }));
}
