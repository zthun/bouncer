import { describe, expect, it } from "vitest";
import { IZProxyConfigTemplate, ZProxyConfigBuilder } from "./proxy-config.mjs";

describe("ZProxyConfig", () => {
  const createTestTarget = () => new ZProxyConfigBuilder();

  describe("Assign", () => {
    it("should assign domains without blowing away security", () => {
      // Arrange.
      const domains = [
        { name: "zthunworks.com", paths: { "/": "localhost:8081" } },
      ];
      const partial: IZProxyConfigTemplate = { domains };
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
      const security = { organization, email };
      const partial: IZProxyConfigTemplate = { security };
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
