import { X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  IZBouncerDomain,
  ZBouncerDomainBuilder,
} from "../config/config-domain.mjs";
import {
  IZBouncerSecurity,
  ZBouncerSecurityBuilder,
} from "../config/config-security.mjs";
import { ZBouncerCertGenerateSelfSigned } from "./cert-generate-self-signed";

describe("ZBouncerCertGenerateSelfSigned", () => {
  const createTestTarget = () => new ZBouncerCertGenerateSelfSigned();

  describe("Subject", () => {
    const shouldSetSubjectValue = async (
      value: (domain: IZBouncerDomain, options: IZBouncerSecurity) => string,
      field: string,
    ) => {
      // Arrange.
      const domain = new ZBouncerDomainBuilder()
        .host("zthunworks.com")
        .path("/", "localhost:8081")
        .path("/api", "localhost:3000")
        .build();
      const options = new ZBouncerSecurityBuilder().build();
      const target = createTestTarget();
      const expected = value(domain, options);

      // Act.
      const certificate = await target.create(domain, options);
      const { subject } = new X509Certificate(certificate.cert);

      // Assert.
      expect(subject).toContain(`${field}=${expected}`);
    };

    it("should set the common name", async () => {
      await shouldSetSubjectValue((d) => d.host, "CN");
    });

    it("should set the certificate organization", async () => {
      await shouldSetSubjectValue((_, o) => o.organization, "O");
    });

    it("should set the location", async () => {
      await shouldSetSubjectValue((_, o) => o.city, "L");
    });

    it("should set the state", async () => {
      await shouldSetSubjectValue((_, o) => o.state, "ST");
    });

    it("should set the country", async () => {
      await shouldSetSubjectValue((_, o) => o.country, "C");
    });
  });
});
