import { describe, expect, it } from "vitest";
import { IZBouncerConfig, ZBouncerConfigBuilder } from "./config.mjs";
import { ZBouncerDomainBuilder } from "./domain.mjs";
import { ZBouncerSecurityBuilder } from "./security.mjs";

describe("ZProxyConfig", () => {
  const createTestTarget = () => new ZBouncerConfigBuilder();

  describe("Assign", () => {
    it("should assign domains without blowing away security", () => {
      // Arrange.
      const domains = [
        new ZBouncerDomainBuilder()
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
      const security = new ZBouncerSecurityBuilder()
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
