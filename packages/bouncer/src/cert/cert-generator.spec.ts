import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { describe, expect, it } from "vitest";
import { ZBouncerCertGeneratorSelfSigned } from "./cert-generator-self-signed.mjs";
import { ZBouncerCertSecurityBuilder } from "./cert-security.mjs";

describe("Cert Generator", () => {
  describe("Self Signed", () => {
    const createTestTarget = () =>
      new ZBouncerCertGeneratorSelfSigned(new ZLoggerSilent());

    it("should generate a cert if all config is valid", async () => {
      // Arrange.
      const security = new ZBouncerCertSecurityBuilder().build();
      const target = createTestTarget();

      // Act.
      const { key, cert } = await target.generate(security);

      // Assert.
      expect(key).toBeTruthy();
      expect(cert).toBeTruthy();
    });

    it("should throw an error if the config contains invalid entries", async () => {
      // Arrange.
      const security = new ZBouncerCertSecurityBuilder()
        .country("TooLong")
        .build();
      const target = createTestTarget();

      // Act.
      const actual = target.generate(security);

      // Assert.
      await expect(actual).rejects.toBeInstanceOf(Error);
    });
  });
});
