import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { describe, expect, it } from "vitest";
import type { IZBouncerSecurity } from "../config/config-security.mjs";
import { ZBouncerSecurityBuilder } from "../config/config-security.mjs";
import { ZBouncerCertGeneratorSelfSigned } from "./cert-generator-self-signed.mjs";

describe("Cert Generator", () => {
  describe("Self Signed", () => {
    const createTestTarget = (security: IZBouncerSecurity) =>
      new ZBouncerCertGeneratorSelfSigned(security, new ZLoggerSilent());

    it("should generate a cert if all config is valid", async () => {
      // Arrange.
      const security = new ZBouncerSecurityBuilder().build();
      const target = createTestTarget(security);

      // Act.
      const { key, cert } = await target.generate();

      // Assert.
      expect(key).toBeTruthy();
      expect(cert).toBeTruthy();
    });

    it("should throw an error if the config contains invalid entries", async () => {
      // Arrange.
      const security = new ZBouncerSecurityBuilder().country("TooLong").build();
      const target = createTestTarget(security);

      // Act.
      const actual = target.generate();

      // Assert.
      await expect(actual).rejects.toBeInstanceOf(Error);
    });
  });
});
