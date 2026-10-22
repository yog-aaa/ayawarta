"use server";

import { handleLogin, handleLogout, type LoginFormState } from "./action-handlers";

export type { LoginFormState };

export async function loginAction(
  _prevState: LoginFormState | undefined,
  formData: FormData
): Promise<LoginFormState> {
  const { signIn } = await import("@/auth");
  return handleLogin(formData, signIn);
}

export async function logoutAction(): Promise<void> {
  const { signOut } = await import("@/auth");
  return handleLogout(signOut);
}
