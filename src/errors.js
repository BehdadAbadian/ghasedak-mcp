export class GhasedakError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function unknownSend(clientReferenceId, details = {}) {
  return new GhasedakError(
    "send_outcome_unknown",
    "Ghasedak may have accepted the send. Check delivery using clientReferenceId before attempting another send.",
    { clientReferenceId, ...details }
  );
}

export function withToolResult(action) {
  return async (args) => {
    let result;
    try {
      result = { ok: true, data: await action(args) };
    } catch (error) {
      const failure = error instanceof GhasedakError
        ? error
        : new GhasedakError("internal_error", "The tool could not complete the request.");
      result = {
        ok: false,
        error: { code: failure.code, message: failure.message, ...failure.details }
      };
    }
    return {
      isError: !result.ok,
      structuredContent: result,
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  };
}
