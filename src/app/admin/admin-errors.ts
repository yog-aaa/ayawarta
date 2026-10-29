export function isAdminAuthorizationError(error: unknown): boolean {
  return error instanceof Error &&
    (error.message === "Unauthorized" || error.message === "Forbidden");
}
