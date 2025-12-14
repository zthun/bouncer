import { merge } from "lodash-es";
import type { IZBouncerCertSecurity } from "../cert/cert-security.mjs";
import { ZBouncerCertSecurityBuilder } from "../cert/cert-security.mjs";
import type { IZBouncerDomain } from "./config-domain.mjs";

export interface IZBouncerConfig {
  security: IZBouncerCertSecurity;
  domains: IZBouncerDomain[];
}

export class ZBouncerConfigBuilder {
  private _config: IZBouncerConfig;

  public constructor() {
    this._config = {
      domains: [],
      security: new ZBouncerCertSecurityBuilder().build(),
    };
  }

  public domains(domains: IZBouncerDomain[]) {
    this._config.domains = domains;

    return this;
  }

  public domain(domain: IZBouncerDomain) {
    return this.domains(this._config.domains.concat(domain));
  }

  public assign(config: Partial<IZBouncerConfig>) {
    this._config = merge(this._config, config);
    return this;
  }

  public build() {
    return structuredClone(this._config);
  }
}
