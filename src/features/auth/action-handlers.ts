import { loginSchema } from "./schema";

export type LoginFormState = {
  error?: string;
};

export type SignInFunction = (
  provider: string,
  options: Record<string, unknown>
) => Promise<unknown>;

export type SignOutFunction = (
  options: Record<string, unknown>
) => Promise<unknown>;

export class AuthError extends Error {
  type?: string;
  constructor(message = "AuthError") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Pure handler for administrator login form submissions.
 * Validates byte length bounds, enforces fixed internal redirect (/admin),
 * and catches AuthError to return a generic user-facing error message.
 */
export async function handleLogin(
  formData: FormData,
  signInFn: SignInFunction
): Promise<LoginFormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    !email ||
    !password ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return { error: "Email dan kata sandi wajib diisi" };
  }

  // Validate format and byte length bounds: rejects >72 bytes without calling Auth.js
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: "Email atau kata sandi tidak valid" };
  }

  try {
    await signInFn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/admin", // Hardcoded internal destination, preventing open redirects
    });
    return {};
  } catch (error) {
    // Next.js redirection error (NEXT_REDIRECT) must be rethrown so navigation occurs
    if (
      error instanceof Error &&
      (error.message === "NEXT_REDIRECT" ||
        (error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT"))
    ) {
      throw error;
    }

    // Generic error for all authentication failures
    return { error: "Email atau kata sandi tidak valid" };
  }
}

/**
 * Pure handler for administrator logout.
 * Hardcodes the logout destination to /admin/login, preventing open redirects.
 */
export async function handleLogout(
  signOutFn: SignOutFunction
): Promise<void> {
  await signOutFn({ redirectTo: "/admin/login" });
}
