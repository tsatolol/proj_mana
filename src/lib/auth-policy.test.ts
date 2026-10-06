import { describe, expect, it } from "vitest";

import { isAllowedDomain, normalizeEmail, parseAllowedDomains } from "./auth-policy";

describe("parseAllowedDomains", () => {
  it("splits, trims and lowercases a comma separated list", () => {
    expect(parseAllowedDomains(" Example.com, @corp.example.jp ,,")).toEqual([
      "example.com",
      "corp.example.jp",
    ]);
  });

  it("returns an empty list when unset", () => {
    expect(parseAllowedDomains(undefined)).toEqual([]);
    expect(parseAllowedDomains("")).toEqual([]);
  });
});

describe("isAllowedDomain", () => {
  const domains = ["example.com"];

  it("matches the domain case-insensitively", () => {
    expect(isAllowedDomain("Alice@Example.COM", domains)).toBe(true);
  });

  it("does not match subdomains or look-alike domains", () => {
    expect(isAllowedDomain("alice@sub.example.com", domains)).toBe(false);
    expect(isAllowedDomain("alice@example.com.evil.test", domains)).toBe(false);
    expect(isAllowedDomain("alice@notexample.com", domains)).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isAllowedDomain("example.com", domains)).toBe(false);
    expect(isAllowedDomain("@example.com", domains)).toBe(false);
  });

  it("allows nothing when no domains are configured", () => {
    expect(isAllowedDomain("alice@example.com", [])).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Alice@Example.com ")).toBe("alice@example.com");
  });
});
