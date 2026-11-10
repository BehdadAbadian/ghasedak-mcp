import { registerGetBalance } from "./get-balance.js";
import { registerGetDeliveryStatus } from "./get-delivery-status.js";
import { registerSendSms } from "./send-sms.js";
import { registerSendBulkSms } from "./send-bulk-sms.js";
import { registerSendOtp } from "./send-otp.js";

export function registerTools(server) {
  registerGetBalance(server);
  registerGetDeliveryStatus(server);
  registerSendSms(server);
  registerSendBulkSms(server);
  registerSendOtp(server);
}
