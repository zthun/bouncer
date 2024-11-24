import { generate } from "selfsigned";
import { IZBouncerDomain } from "../config/config-domain.mjs";
import { IZBouncerSecurity } from "../config/config-security.mjs";
import { IZCert } from "./cert";
import { IZCertGenerate } from "./cert-generate";

export class ZCertGenerateSelfSigned implements IZCertGenerate {
  create(domain: IZBouncerDomain, options: IZBouncerSecurity): Promise<IZCert> {
    const pem = generate(
      [
        {
          name: "commonName",
          value: domain.host,
        },
        {
          name: "organizationName",
          value: options.organization,
        },
        {
          name: "countryName",
          value: options.country,
        },
        {
          name: "localityName",
          value: options.city,
        },
        {
          name: "stateOrProvinceName",
          value: options.state,
        },
      ],
      undefined,
    );

    return Promise.resolve({
      key: pem.private,
      cert: pem.cert,
    });
  }
}
