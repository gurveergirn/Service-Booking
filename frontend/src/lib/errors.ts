export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FastApiDetail = string | { msg: string; loc?: (string | number)[] }[] | undefined;

/** Turn FastAPI's {"detail": ...} (a string, or a list of validation errors) into one readable message. */
export function messageFromDetail(detail: FastApiDetail, fallback = "Something went wrong"): string {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = first.loc?.filter((p) => p !== "body" && p !== "query").join(".");
    const msg = first.msg.replace(/^Value error, /, "");
    return field ? `${field.replace(/_/g, " ")}: ${msg}` : msg;
  }
  return fallback;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
