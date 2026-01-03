import { describe, expect, it } from "vitest";
import { ZBouncerConfigDomainBuilder } from "./config-domain.mjs";
import { ZBouncerConfigSecurityBuilder } from "./config-security.mjs";
import type { IZBouncerConfig } from "./config.mjs";
import { ZBouncerConfigBuilder } from "./config.mjs";

describe("ZProxyConfig", () => {
  const createTestTarget = () => new ZBouncerConfigBuilder();

  describe("Assign", () => {
    it("should assign domains without blowing away security", () => {
      // Arrange.
      const domains = [
        new ZBouncerConfigDomainBuilder()
          .host("zthunworks.com")
          .path("/", "localhost:8081")
          .build(),
      ];
      const partial: Partial<IZBouncerConfig> = { domains };
      const expected = createTestTarget().build();
      expected.domains = partial.domains!;
      const target = createTestTarget();

      // Act.
      const actual = target.assign(partial).build();

      // Assert.
      expect(actual).toEqual(expected);
    });

    it("should assign security without removing the domains", () => {
      // Arrange.
      const organization = "Foobar";
      const email = "foo@bar.com";
      const security = new ZBouncerConfigSecurityBuilder()
        .organization(organization)
        .email(email)
        .build();
      const partial: Partial<IZBouncerConfig> = { security };
      const expected = createTestTarget().build();
      expected.security.organization = organization;
      expected.security.email = email;
      const target = createTestTarget();

      // Act.
      const actual = target.assign(partial).build();

      // Assert.
      expect(actual).toEqual(expected);
    });
  });
});
