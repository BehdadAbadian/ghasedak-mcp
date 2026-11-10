import { GhasedakError, unknownSend } from "./errors.js";

const gateway = "https://gateway.ghasedak.me/rest/api/v1/WebService/";
const apiErrors = {
  400: ["invalid_request", "Check the inputs and the required opt-out text for your sender line."],
  401: ["auth_error", "Check the Ghasedak API key and whether the account is active."],
  406: ["line_unverified", "Check whether sender-line ownership is verified in the Ghasedak panel."],
  412: ["precondition_failed", "Check the sender line, account plan, service access, or message IDs as applicable."],
  413: ["request_too_large", "Check the length of the message and the number of recipients."],
  416: ["ip_restricted", "Check the allowed source IP in the Ghasedak panel."],
  418: ["insufficient_credit", "Check the account credit before sending again."],
  419: ["invalid_tariff", "Check the applicable sending tariff in the Ghasedak panel."],
  420: ["invalid_message_link", "Remove or correct the link in the message text."],
  422: ["invalid_message_characters", "Check the message for unsupported characters."],
  426: ["plan_required", "Check whether your account plan includes this API operation."],
  428: ["invalid_template", "Check the template name and whether the template is active."],
  429: ["template_parameter_not_found", "Check the parameter names configured for the OTP template."],
  451: ["duplicate_request", "Ghasedak reported a duplicate. Check the earlier send before trying again."]
};

function rejection(details) {
  const { httpStatus, apiCode } = details;
  if (apiCode != null && apiErrors[apiCode]) {
    const [code, message] = apiErrors[apiCode];
    return new GhasedakError(code, message, details);
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return new GhasedakError("auth_error", "Check the API key and account access.", details);
  }
  if (httpStatus === 429) {
    return new GhasedakError("rate_limited", "Ghasedak limited the request rate. Wait before making another request.", details);
  }
  return new GhasedakError("api_error", "Ghasedak rejected the request. Check the provider code in the API documentation.", details);
}

export async function requestGhasedak(method, { body, query, referenceId } = {}) {
  const apiKey = process.env.GHASEDAK_API_KEY?.trim();
  if (!apiKey) {
    throw new GhasedakError("config_error", "Configure GHASEDAK_API_KEY in the local MCP settings.");
  }

  const url = new URL(method, gateway);
  if (query) {
    url.search = new URLSearchParams(query).toString();
  }

  const headers = { ApiKey: apiKey, Accept: "application/json" };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw referenceId
      ? unknownSend(referenceId)
      : new GhasedakError("connection_error", "Could not reach Ghasedak. Check the network connection and try again.");
  }

  const result = await response.json().catch(() => null);
  const isSuccess = result?.IsSuccess ?? result?.isSuccess;
  const data = result?.Data ?? result?.data;
  const rawCode = result?.StatusCode ?? result?.statusCode;
  const apiCode = Number.isSafeInteger(rawCode) ? rawCode : undefined;
  const httpStatus = response.status;
  const details = { httpStatus, ...(apiCode == null ? {} : { apiCode }) };
  const temporaryFailure = httpStatus >= 500 || httpStatus === 408 || apiCode >= 500;

  if (referenceId && (temporaryFailure || (response.ok && isSuccess !== false && (isSuccess !== true || data == null)))) {
    throw unknownSend(referenceId, details);
  }
  if (temporaryFailure) {
    throw new GhasedakError("service_unavailable", "Ghasedak could not complete the request. Try the lookup again later.", details);
  }
  if (!response.ok || isSuccess === false) {
    throw rejection(details);
  }
  if (isSuccess !== true || data == null) {
    throw new GhasedakError("unexpected_response", "Ghasedak returned a response the tool could not interpret.", details);
  }
  return data;
}

export function fields(record, names) {
  return Object.fromEntries(names.flatMap((name) => {
    const lowerCamel = name[0].toLowerCase() + name.slice(1);
    const value = record?.[name] ?? record?.[lowerCamel];
    return value == null ? [] : [[lowerCamel, value]];
  }));
}
