import * as z from "zod/v4";
import { fields } from "../client.js";
import { unknownSend, withToolResult } from "../errors.js";
import { billable, lineNumber, message, phone, recipientFields, send } from "./shared.js";

export function registerSendSms(server) {
  server.registerTool("send_sms", {
    description: "Submit one real, billable SMS. Show the recipient, sender line and exact message and obtain user approval before calling. data.messageId is a submission receipt; use get_delivery_status to check handset delivery.",
    inputSchema: z.object({ receptor: phone, lineNumber, message }),
    annotations: billable
  }, withToolResult(async (args) => {
    const { data, clientReferenceId } = await send("SendSingleSMS", (referenceId) => ({
      ...args, clientReferenceId: referenceId
    }));
    const receipt = fields(data, [...recipientFields, "LineNumber"]);
    if (!receipt.messageId) {
      throw unknownSend(clientReferenceId);
    }
    return { clientReferenceId, ...receipt };
  }));
}
