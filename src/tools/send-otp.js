import * as z from "zod/v4";
import { fields } from "../client.js";
import { withToolResult } from "../errors.js";
import { billable, phone, recipientReceipts, send } from "./shared.js";

export function registerSendOtp(server) {
  server.registerTool("send_otp", {
    description: "Submit a real, billable OTP SMS using an approved Ghasedak template and values supplied by the user. Show the recipient and template and obtain user approval before calling. data.recipients contains submission receipts.",
    inputSchema: z.object({
      mobile: phone,
      templateName: z.string().trim().min(1),
      inputs: z.array(z.object({ param: z.string().trim().min(1), value: z.string() })).min(1)
    }),
    annotations: billable
  }, withToolResult(async ({ mobile, templateName, inputs }) => {
    const { data, clientReferenceId } = await send("SendOtpSMS", (referenceId) => ({
      receptors: [{ mobile, clientReferenceId: referenceId }], templateName, inputs
    }));
    return {
      clientReferenceId,
      ...fields(data, ["LineNumber", "Cost", "TotalCost"]),
      recipients: recipientReceipts(data?.Items ?? data?.items, clientReferenceId)
    };
  }));
}
