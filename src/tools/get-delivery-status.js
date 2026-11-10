import * as z from "zod/v4";
import { fields, requestGhasedak } from "../client.js";
import { GhasedakError, withToolResult } from "../errors.js";
import { readOnly } from "./shared.js";

const statusLabels = [
  "no_status", "canceled", "blacklisted", "accepted_by_carrier", "not_delivered_to_handset",
  "delivered_to_handset", "send_failed", "debug", "unknown"
];

export function registerGetDeliveryStatus(server) {
  server.registerTool("get_delivery_status", {
    description: "Check up to 100 message or client reference IDs. Only status 5 confirms handset delivery. Status 0 means no status was reported. statusLabel not_found means Ghasedak could not find a report for that ID.",
    inputSchema: z.object({
      ids: z.array(z.string().trim().min(1).regex(/^[^,]+$/)).min(1).max(100),
      idType: z.enum(["messageId", "clientReferenceId"]).default("messageId")
    }),
    annotations: readOnly
  }, withToolResult(async ({ ids, idType }) => {
    const data = await requestGhasedak("CheckSmsStatus", {
      query: { Ids: ids.join(","), Type: idType === "messageId" ? "1" : "2" }
    });
    if (!Array.isArray(data)) {
      throw new GhasedakError("unexpected_response", "Ghasedak returned an unexpected delivery report.");
    }
    return data.map((item) => {
      const { statusDescription, ...report } = fields(
        item, ["MessageId", "ClientReferenceId", "Status", "StatusDescription", "Price", "SendDate"]
      );
      const status = report.status ?? null;
      const notFound = status === null && statusDescription === "یافت نشد";
      const statusLabel = Number.isInteger(status) ? statusLabels[status] : undefined;
      return { ...report, status, statusLabel: notFound ? "not_found" : (statusLabel ?? "unknown") };
    });
  }));
}
