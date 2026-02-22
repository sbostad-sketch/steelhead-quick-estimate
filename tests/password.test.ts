import { describe, expect, it } from "vitest";
import { createPasswordHash, verifyPasswordHash, verifyPlainPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies a generated hash", () => {
    const hash = createPasswordHash("super-secret");
    expect(verifyPasswordHash("super-secret", hash)).toBe(true);
    expect(verifyPasswordHash("wrong", hash)).toBe(false);
  });

  it("validates plain password comparisons", () => {
    expect(verifyPlainPassword("abc123", "abc123")).toBe(true);
    expect(verifyPlainPassword("abc123", "abc124")).toBe(false);
  });
});
