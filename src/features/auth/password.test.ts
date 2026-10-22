import { describe, expect, it } from "vitest";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password";

describe("password utilities", () => {
  it("hashes password with bcrypt format", async () => {
    const plain = "SuperSecretPassword!2026";
    const hash = await hashPassword(plain);

    expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$/);
    expect(hash).not.toBe(plain);
  });

  it("verifies matching password correctly", async () => {
    const plain = "CorrectHorseBatteryStaple";
    const hash = await hashPassword(plain);

    const isValid = await verifyPassword(plain, hash);
    expect(isValid).toBe(true);
  });

  it("rejects non-matching password", async () => {
    const plain = "CorrectPassword";
    const hash = await hashPassword(plain);

    const isValid = await verifyPassword("WrongPassword", hash);
    expect(isValid).toBe(false);
  });

  it("verifies DUMMY_PASSWORD_HASH safely without throwing", async () => {
    // DUMMY_PASSWORD_HASH must be a valid bcrypt hash to avoid runtime errors during constant-time comparison
    const result = await verifyPassword("any-attempted-password", DUMMY_PASSWORD_HASH);
    expect(result).toBe(false);
  });
});
