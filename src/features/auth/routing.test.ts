import { describe, expect, it, vi } from "vitest";
import { authConfig, checkRouteAuthorization } from "@/auth.config";
import { AuthError, handleLogin, handleLogout } from "./action-handlers";
import type { AdminRole } from "./types";

describe("Route Authorization Decision Matrix (AUTH-03)", () => {
  it("allows unauthenticated access to public /admin/login", () => {
    const isAllowed = checkRouteAuthorization("/admin/login", false);
    expect(isAllowed).toBe(true);
  });

  it("allows authenticated sessions through to /admin/login at the proxy level (AUTH-02 no-loop)", () => {
    // Crucial: Proxy must never redirect at the edge from /admin/login to prevent loops for stale sessions
    const isAllowed = checkRouteAuthorization("/admin/login", true);
    expect(isAllowed).toBe(true);
  });

  it("blocks unauthenticated access to protected /admin dashboard", () => {
    const isAllowed = checkRouteAuthorization("/admin", false);
    expect(isAllowed).toBe(false);
  });

  it("allows authenticated access to /admin dashboard", () => {
    const isAllowed = checkRouteAuthorization("/admin", true);
    expect(isAllowed).toBe(true);
  });

  it("blocks unauthenticated access to protected sub-routes (/admin/*)", () => {
    expect(checkRouteAuthorization("/admin/users", false)).toBe(false);
    expect(checkRouteAuthorization("/admin/settings/security", false)).toBe(false);
  });

  it("allows authenticated access to protected sub-routes (/admin/*)", () => {
    expect(checkRouteAuthorization("/admin/users", true)).toBe(true);
    expect(checkRouteAuthorization("/admin/settings/security", true)).toBe(true);
  });

  it("allows unauthenticated access to public routes outside /admin", () => {
    expect(checkRouteAuthorization("/", false)).toBe(true);
    expect(checkRouteAuthorization("/rika-fauzi", false)).toBe(true);
    expect(checkRouteAuthorization("/api/auth/session", false)).toBe(true);
  });

  it("authConfig.callbacks.authorized accurately wraps route authorization", () => {
    const authorized = authConfig.callbacks?.authorized;
    expect(authorized).toBeDefined();

    if (authorized) {
      // Unauthenticated /admin
      const unauthAdmin = authorized({
        auth: null,
        request: { nextUrl: new URL("https://example.com/admin") } as never,
      });
      expect(unauthAdmin).toBe(false);

      // Authenticated /admin
      const authAdmin = authorized({
        auth: { user: { id: "u-1", role: "ADMIN" as AdminRole }, expires: "" },
        request: { nextUrl: new URL("https://example.com/admin") } as never,
      });
      expect(authAdmin).toBe(true);

      // Public /admin/login
      const loginAccess = authorized({
        auth: null,
        request: { nextUrl: new URL("https://example.com/admin/login") } as never,
      });
      expect(loginAccess).toBe(true);
    }
  });
});

describe("JWT and Session Callbacks & Field Minimization (AUTH-03)", () => {
  it("JWT callback extracts only id and role, excluding password hash and internal state", () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    if (jwtCallback) {
      const token = {};
      const user = {
        id: "usr-admin-123",
        name: "Admin User",
        email: "admin@ayawarta.com",
        role: "ADMIN" as AdminRole,
        passwordHash: "$2b$10$supersecretneverleakthisvalue",
        failedLoginCount: 4,
        lockedUntil: new Date(),
        secretKey: "internal-secret",
      };

      const resultToken = jwtCallback({
        token,
        user: user as never,
        account: null,
        profile: undefined,
        trigger: "signIn",
        isNewUser: false,
        session: undefined,
      });

      expect(resultToken).toEqual({
        id: "usr-admin-123",
        role: "ADMIN",
      });

      // Assert sensitive fields are strictly excluded
      expect(resultToken).not.toHaveProperty("passwordHash");
      expect(resultToken).not.toHaveProperty("failedLoginCount");
      expect(resultToken).not.toHaveProperty("lockedUntil");
      expect(resultToken).not.toHaveProperty("secretKey");
    }
  });

  it("Session callback exposes only minimal fields (id, name, email, role) to the client/session", () => {
    const sessionCallback = authConfig.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    if (sessionCallback) {
      const session = {
        user: {
          name: "Admin User",
          email: "admin@ayawarta.com",
          id: "",
          role: "ADMIN" as AdminRole,
        },
        expires: "2026-11-22T00:00:00Z",
      };

      const token = {
        id: "usr-admin-123",
        role: "ADMIN" as AdminRole,
        extraSensitiveData: "forbidden",
      };

      const resultSession = sessionCallback({
        session: session as never,
        token: token as never,
        user: {} as never,
        newSession: undefined,
        trigger: "update",
      });

      expect(resultSession.user.id).toBe("usr-admin-123");
      expect(resultSession.user.role).toBe("ADMIN");
      expect(resultSession.user.name).toBe("Admin User");
      expect(resultSession.user.email).toBe("admin@ayawarta.com");

      // Verify no sensitive internal data or secrets exist on session.user
      expect(resultSession.user).not.toHaveProperty("passwordHash");
      expect(resultSession.user).not.toHaveProperty("failedLoginCount");
      expect(resultSession.user).not.toHaveProperty("lockedUntil");
      expect(resultSession.user).not.toHaveProperty("extraSensitiveData");
    }
  });
});

describe("Server Actions: handleLogin & handleLogout (AUTH-03)", () => {
  it("rejects missing email or password with user-friendly message", async () => {
    const signInMock = vi.fn();
    const formData = new FormData();
    const result = await handleLogin(formData, signInMock);
    expect(result).toEqual({ error: "Email dan kata sandi wajib diisi" });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rejects password exceeding 72 bytes immediately without invoking signIn", async () => {
    const signInMock = vi.fn();
    const formData = new FormData();
    formData.append("email", "admin@ayawarta.com");
    formData.append("password", "a".repeat(73));

    const result = await handleLogin(formData, signInMock);
    expect(result).toEqual({ error: "Email atau kata sandi tidak valid" });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("enforces fixed internal redirect to /admin, preventing open redirect attacks", async () => {
    const signInMock = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.append("email", "admin@ayawarta.com");
    formData.append("password", "ValidPassword123!");
    formData.append("redirectTo", "https://evil-attacker.com"); // Attempted open redirect parameter

    const result = await handleLogin(formData, signInMock);
    expect(result).toEqual({});
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "admin@ayawarta.com",
      password: "ValidPassword123!",
      redirectTo: "/admin", // Hardcoded internal redirect
    });
  });

  it("maps AuthError to generic public error message without disclosing account details", async () => {
    const authError = new AuthError("CredentialsSignin");
    const signInMock = vi.fn().mockRejectedValue(authError);
    const formData = new FormData();
    formData.append("email", "admin@ayawarta.com");
    formData.append("password", "WrongPassword!");

    const result = await handleLogin(formData, signInMock);
    expect(result).toEqual({ error: "Email atau kata sandi tidak valid" });
  });

  it("rethrows Next.js NEXT_REDIRECT error so framework redirection functions properly", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    (redirectError as unknown as { digest: string }).digest = "NEXT_REDIRECT";

    const signInMock = vi.fn().mockRejectedValue(redirectError);
    const formData = new FormData();
    formData.append("email", "admin@ayawarta.com");
    formData.append("password", "ValidPassword123!");

    await expect(handleLogin(formData, signInMock)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("handleLogout invokes signOut with hardcoded internal redirect to /admin/login", async () => {
    const signOutMock = vi.fn().mockResolvedValue(undefined);
    await handleLogout(signOutMock);
    expect(signOutMock).toHaveBeenCalledWith({
      redirectTo: "/admin/login",
    });
  });
});
