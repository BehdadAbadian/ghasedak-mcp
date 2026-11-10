import { randomUUID } from "node:crypto";
import * as z from "zod/v4";
import { requestGhasedak, fields } from "../client.js";
import { unknownSend } from "../errors.js";

export const phone = z.string().trim().regex(/^09\d{9}$/)
  .describe("Iranian mobile number in 09xxxxxxxxx format");
export const lineNumber = z.string().trim().regex(/^\d+$/)
  .describe("An authorized Ghasedak sender line");
export const message = z.string()
  .max(1000, "Message cannot exceed 1000 characters")
  .refine((text) => text.trim().length > 0, "Message cannot be blank");

export const readOnly = { readOnlyHint: true, openWorldHint: true };
export const billable = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
export const recipientFields = ["Receptor", "MessageId", "Cost", "SendDate"];

export async function send(method, makeBody) {
  const clientReferenceId = randomUUID();
  const data = await requestGhasedak(method, { body: makeBody(clientReferenceId), referenceId: clientReferenceId });
  return { data, clientReferenceId };
}

export function recipientReceipts(items, clientReferenceId) {
  const receipts = (Array.isArray(items) ? items : [])
    .map((item) => fields(item, recipientFields))
    .filter((receipt) => receipt.messageId);
  if (receipts.length === 0) {
    throw unknownSend(clientReferenceId);
  }
  return receipts;
}
